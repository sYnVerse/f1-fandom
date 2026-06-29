/**
 * Jolpica API cache: in-memory + KV persistence, in-flight deduplication,
 * rate limiting, and 429 backoff. Create one context per cron invocation or HTTP request.
 */

import { trackedKvPut } from './kv-ops';

const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 2000;
const MIN_FETCH_INTERVAL_MS = 300;
const KV_CACHE_PREFIX = 'f1_api_cache:';

const TTL_SCHEDULE = 604_800;
const TTL_STANDINGS_FRESH = 86_400;
const TTL_STANDINGS_STALE = 1_200;
const TTL_ROUND_DATA = 86_400;
const TTL_DEFAULT = 1_200;

export interface F1ApiContext {
  readonly cache: Map<string, unknown>;
  readonly inFlight: Map<string, Promise<unknown>>;
  apiCallCount: number;
  kv?: any;
  /** Optional secret: wrangler secret put JOLPICA_API_KEY */
  apiKey?: string;
  latestConcludedRound?: number;
  lastFetchTime?: number;
  fetchQueuePromise?: Promise<void>;
}

export function createF1ApiContext(kv?: any, apiKey?: string): F1ApiContext {
  return {
    cache: new Map(),
    inFlight: new Map(),
    apiCallCount: 0,
    kv,
    apiKey,
  };
}

export function createF1ApiContextFromEnv(env: {
  F1_WIKI_STATE?: any;
  JOLPICA_API_KEY?: string;
}): F1ApiContext {
  return createF1ApiContext(env.F1_WIKI_STATE, env.JOLPICA_API_KEY);
}

export type JolpicaUrlClass = 'schedule' | 'seasonStandings' | 'roundData' | 'other';

export function classifyJolpicaUrl(url: string): JolpicaUrlClass {
  const path = new URL(url).pathname;
  if (/\/\d{4}\.json$/.test(path)) return 'schedule';
  if (/\/\d{4}\/(driver|constructor)Standings\.json$/.test(path)) return 'seasonStandings';
  if (/\/\d{4}\/\d+\//.test(path)) return 'roundData';
  return 'other';
}

export function isResponseEmpty(url: string, data: unknown): boolean {
  const mr = (data as { MRData?: Record<string, unknown> })?.MRData;
  if (!mr) return true;

  const urlClass = classifyJolpicaUrl(url);
  if (urlClass === 'schedule') {
    const races = (mr.RaceTable as { Races?: unknown[] } | undefined)?.Races;
    return !races || races.length === 0;
  }
  if (urlClass === 'seasonStandings') {
    const lists = (mr.StandingsTable as { StandingsLists?: unknown[] } | undefined)?.StandingsLists;
    return !lists || lists.length === 0;
  }
  if (urlClass === 'roundData') {
    const races = (mr.RaceTable as { Races?: Array<Record<string, unknown>> } | undefined)?.Races;
    if (!races || races.length === 0) return true;
    const race = races[0];
    if ((race.Results as unknown[] | undefined)?.length) return false;
    if ((race.SprintResults as unknown[] | undefined)?.length) return false;
    if ((race.QualifyingResults as unknown[] | undefined)?.length) return false;
    if ((race.Laps as unknown[] | undefined)?.length) return false;
    const drivers = (mr.DriverTable as { Drivers?: unknown[] } | undefined)?.Drivers;
    if (drivers?.length) return false;
    return true;
  }

  const lapsRaces = (mr.LapsTable as { Races?: Array<{ Laps?: unknown[] }> } | undefined)?.Races;
  if (lapsRaces?.length && lapsRaces[0]?.Laps?.length) return false;

  return false;
}

export function getCacheTtl(url: string, data: unknown, ctx?: F1ApiContext): number {
  if (isResponseEmpty(url, data)) {
    return TTL_DEFAULT;
  }

  const urlClass = classifyJolpicaUrl(url);
  if (urlClass === 'schedule') return TTL_SCHEDULE;
  if (urlClass === 'roundData') return TTL_ROUND_DATA;
  if (urlClass === 'seasonStandings') {
    const lists = (data as { MRData?: { StandingsTable?: { StandingsLists?: Array<{ round?: string }> } } })
      ?.MRData?.StandingsTable?.StandingsLists;
    const standingsRound = lists?.[0]?.round ? parseInt(lists[0].round, 10) : 0;
    const latestConcluded = ctx?.latestConcludedRound ?? 0;
    if (latestConcluded > 0 && standingsRound >= latestConcluded) {
      return TTL_STANDINGS_FRESH;
    }
    return TTL_STANDINGS_STALE;
  }
  return TTL_DEFAULT;
}

function kvCacheKey(url: string): string {
  return `${KV_CACHE_PREFIX}${url}`;
}

function parseRetryAfterMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null;
  const asSeconds = Number(retryAfter);
  if (!Number.isNaN(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }
  const asDate = Date.parse(retryAfter);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return null;
}

function backoffDelayMs(attempt: number, retryAfter: string | null): number {
  const fromHeader = parseRetryAfterMs(retryAfter);
  if (fromHeader !== null) {
    return Math.min(fromHeader, 60_000);
  }
  return Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), 30_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForRateLimit(ctx: F1ApiContext): Promise<void> {
  const prev = ctx.fetchQueuePromise ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });

  ctx.fetchQueuePromise = prev.then(async () => {
    const now = Date.now();
    const last = ctx.lastFetchTime ?? 0;
    const wait = Math.max(0, MIN_FETCH_INTERVAL_MS - (now - last));
    if (wait > 0) await sleep(wait);
    ctx.lastFetchTime = Date.now();
    release();
  });

  await gate;
}

function buildFetchInit(ctx?: F1ApiContext, extra?: RequestInit): RequestInit | undefined {
  if (!ctx?.apiKey && !extra) return extra;
  const headers = new Headers(extra?.headers);
  if (ctx?.apiKey) {
    headers.set('Authorization', `Bearer ${ctx.apiKey}`);
  }
  return { ...extra, headers };
}

async function throttledFetch(url: string, ctx: F1ApiContext, init?: RequestInit): Promise<Response> {
  await waitForRateLimit(ctx);
  return fetch(url, init);
}

/** Fetch from Jolpica with per-run caching, dedup, and 429 backoff. */
export async function fetchJolpica(url: string, ctx?: F1ApiContext): Promise<Response> {
  if (!ctx) {
    return fetchJolpicaUncached(url);
  }

  const cached = ctx.cache.get(url);
  if (cached instanceof Response) {
    return cached.clone();
  }

  const existing = ctx.inFlight.get(url);
  if (existing) {
    const res = await existing as Response;
    return res.clone();
  }

  const promise = fetchJolpicaUncached(url, ctx);
  ctx.inFlight.set(url, promise);

  try {
    const res = await promise;
    if (res.ok) {
      ctx.cache.set(url, res.clone());
    }
    return res;
  } finally {
    ctx.inFlight.delete(url);
  }
}

async function fetchJolpicaUncached(
  url: string,
  ctx?: F1ApiContext,
  init?: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;
  const fetchInit = buildFetchInit(ctx, init);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (ctx) ctx.apiCallCount++;

    const res = ctx
      ? await throttledFetch(url, ctx, fetchInit)
      : await fetch(url, fetchInit);

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      lastError = new Error('Jolpica API error: Too Many Requests');
      if (attempt < MAX_RETRIES) {
        const delay = backoffDelayMs(attempt, retryAfter);
        console.warn(
          `Jolpica 429 on ${url} (attempt ${attempt}/${MAX_RETRIES}), backing off ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }
      throw lastError;
    }

    if (!res.ok) {
      throw new Error(`Jolpica API error: ${res.statusText}`);
    }

    return res;
  }

  throw lastError ?? new Error('Jolpica API error: Too Many Requests');
}

/** Run a cached JSON fetch; deduplicates concurrent requests for the same URL. */
export async function cachedJolpicaJson<T>(
  url: string,
  ctx: F1ApiContext | undefined,
  parse: (data: unknown) => T
): Promise<T> {
  if (ctx) {
    const cached = ctx.cache.get(url);
    if (cached !== undefined && !(cached instanceof Response)) {
      return cached as T;
    }

    const existing = ctx.inFlight.get(url);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  if (ctx) {
    ctx.inFlight.set(url, promise);
  }

  (async () => {
    try {
      if (ctx?.kv) {
        const raw = await ctx.kv.get(kvCacheKey(url));
        if (raw) {
          const data = JSON.parse(raw);
          const parsed = parse(data);
          if (ctx) ctx.cache.set(url, parsed);
          resolve(parsed);
          return;
        }
      }

      const res = await fetchJolpicaUncached(url, ctx);
      const rawText = await res.text();
      const data = JSON.parse(rawText);
      const parsed = parse(data);

      if (ctx) {
        ctx.cache.set(url, parsed);
        if (ctx.kv && !isResponseEmpty(url, data)) {
          const ttl = getCacheTtl(url, data, ctx);
          await trackedKvPut(ctx.kv, kvCacheKey(url), rawText, { expirationTtl: ttl });
        }
      }
      resolve(parsed);
    } catch (e) {
      reject(e);
    } finally {
      if (ctx) ctx.inFlight.delete(url);
    }
  })();

  return promise;
}
