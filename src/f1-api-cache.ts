/**
 * Jolpica API cache: in-memory + KV persistence, in-flight deduplication,
 * rate limiting, and 429 backoff. Create one context per cron invocation or HTTP request.
 */

import { trackedKvPut } from './kv-ops';

const MAX_ATTEMPTS = 2;
const RATE_LIMIT_BACKOFF_MS = 15_000;
const MIN_FETCH_INTERVAL_MS = 300;
const KV_CACHE_PREFIX = 'f1_api_cache:';

const TTL_SCHEDULE_CURRENT = 604_800;
const TTL_STANDINGS_FRESH = 86_400;
const TTL_ROUND_DATA = 86_400;
const TTL_DEFAULT = 1_200;

/** Season the cron worker treats as the active championship year. */
export const ACTIVE_F1_SEASON = 2026;

/** `undefined` means no expiration (permanent KV entry). */
export type CacheTtl = number | undefined;

export interface CachedScheduleRace {
  round: string;
  date: string;
  time?: string;
  raceName?: string;
  Circuit?: { circuitId?: string };
  Qualifying?: { date: string; time?: string };
  Sprint?: { date: string; time?: string };
  FirstPractice?: { date: string; time?: string };
  SprintQualifying?: { date: string; time?: string };
}

export interface F1ApiContext {
  readonly cache: Map<string, unknown>;
  readonly inFlight: Map<string, Promise<unknown>>;
  apiCallCount: number;
  kv?: any;
  /** Optional secret: wrangler secret put JOLPICA_API_KEY */
  apiKey?: string;
  latestConcludedRound?: number;
  /** Active season schedule; only updated by getSchedule(ACTIVE_F1_SEASON). */
  schedule?: CachedScheduleRace[];
  /** Championship year used for ctx.schedule updates (default ACTIVE_F1_SEASON). */
  activeSeasonYear?: number;
  lastFetchTime?: number;
  fetchQueuePromise?: Promise<void>;
  /** Test override for 429 backoff delay (ms). */
  testBackoffMs?: number;
}

export function createF1ApiContext(kv?: any, apiKey?: string, activeSeasonYear = ACTIVE_F1_SEASON): F1ApiContext {
  return {
    cache: new Map(),
    inFlight: new Map(),
    apiCallCount: 0,
    kv,
    apiKey,
    activeSeasonYear,
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
    const lists = (mr.StandingsTable as { StandingsLists?: unknown[] } | undefined)?.StandingsLists;
    if (lists?.length) return false;
    return true;
  }

  const lapsRaces = (mr.LapsTable as { Races?: Array<{ Laps?: unknown[] }> } | undefined)?.Races;
  if (lapsRaces?.length && lapsRaces[0]?.Laps?.length) return false;

  return false;
}

export function parseYearFromJolpicaUrl(url: string): number | null {
  const match = new URL(url).pathname.match(/\/(\d{4})(?:\/|\.json)/);
  return match ? parseInt(match[1], 10) : null;
}

export function parseRoundFromJolpicaUrl(url: string): number | null {
  const match = new URL(url).pathname.match(/\/(\d{4})\/(\d+)\//);
  return match ? parseInt(match[2], 10) : null;
}

type RoundEndpoint =
  | 'results'
  | 'sprint'
  | 'qualifying'
  | 'laps'
  | 'drivers'
  | 'driverStandings'
  | 'constructorStandings'
  | 'other';

function parseRoundEndpoint(url: string): RoundEndpoint {
  const match = new URL(url).pathname.match(/\/\d{4}\/\d+\/([^/.]+)\.json/);
  if (!match) return 'other';
  const endpoint = match[1];
  if (
    endpoint === 'results' ||
    endpoint === 'sprint' ||
    endpoint === 'qualifying' ||
    endpoint === 'laps' ||
    endpoint === 'drivers' ||
    endpoint === 'driverStandings' ||
    endpoint === 'constructorStandings'
  ) {
    return endpoint;
  }
  return 'other';
}

function getRaceStartDate(race: CachedScheduleRace): string {
  if (race.FirstPractice?.date) {
    return race.FirstPractice.date;
  }
  const raceDate = new Date(race.date);
  raceDate.setUTCDate(raceDate.getUTCDate() - 2);
  const y = raceDate.getUTCFullYear();
  const m = String(raceDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(raceDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getQualifyingEndTime(race: CachedScheduleRace): Date {
  if (race.Qualifying?.date) {
    const start = new Date(`${race.Qualifying.date}T${race.Qualifying.time || '00:00:00Z'}`);
    return new Date(start.getTime() + 60 * 60 * 1000);
  }
  const fallback = new Date(`${race.date}T00:00:00Z`);
  fallback.setUTCDate(fallback.getUTCDate() - 1);
  return new Date(fallback.getTime() + 18 * 60 * 60 * 1000);
}

function getRaceEndTime(race: CachedScheduleRace): Date {
  const start = new Date(`${race.date}T${race.time || '12:00:00Z'}`);
  return new Date(start.getTime() + 2 * 60 * 60 * 1000);
}

function getSprintEndTime(race: CachedScheduleRace): Date | null {
  if (!race.Sprint?.date) return null;
  const start = new Date(`${race.Sprint.date}T${race.Sprint.time || '00:00:00Z'}`);
  return new Date(start.getTime() + 45 * 60 * 1000);
}

function getFirstPracticeEndTime(race: CachedScheduleRace): Date | null {
  if (!race.FirstPractice?.date) return null;
  const start = new Date(`${getRaceStartDate(race)}T${race.FirstPractice.time || '00:00:00Z'}`);
  return new Date(start.getTime() + 60 * 60 * 1000);
}

function getSessionEndTimeForEndpoint(
  endpoint: RoundEndpoint,
  race: CachedScheduleRace
): Date | null {
  switch (endpoint) {
    case 'qualifying':
      return getQualifyingEndTime(race);
    case 'sprint':
      return getSprintEndTime(race);
    case 'results':
    case 'laps':
    case 'driverStandings':
    case 'constructorStandings':
      return getRaceEndTime(race);
    case 'drivers': {
      const fp1End = getFirstPracticeEndTime(race);
      return fp1End ?? getQualifyingEndTime(race);
    }
    default:
      return null;
  }
}

export function isRoundDataSessionComplete(
  url: string,
  round: number,
  schedule?: CachedScheduleRace[],
  now = new Date()
): boolean {
  const race = schedule?.find(r => parseInt(r.round, 10) === round);
  if (!race) return false;
  const sessionEnd = getSessionEndTimeForEndpoint(parseRoundEndpoint(url), race);
  if (!sessionEnd) return false;
  return now >= sessionEnd;
}

export function getCacheTtl(
  url: string,
  data: unknown,
  ctx?: F1ApiContext,
  now = new Date()
): CacheTtl {
  if (isResponseEmpty(url, data)) {
    return TTL_DEFAULT;
  }

  const year = parseYearFromJolpicaUrl(url);
  const round = parseRoundFromJolpicaUrl(url);
  const currentYear = now.getUTCFullYear();
  const latestConcluded = ctx?.latestConcludedRound ?? 0;

  if (year !== null && year < currentYear) {
    return undefined;
  }

  const urlClass = classifyJolpicaUrl(url);

  if (urlClass === 'schedule') {
    return TTL_SCHEDULE_CURRENT;
  }

  if (urlClass === 'seasonStandings') {
    const lists = (data as { MRData?: { StandingsTable?: { StandingsLists?: Array<{ round?: string }> } } })
      ?.MRData?.StandingsTable?.StandingsLists;
    const standingsRound = lists?.[0]?.round ? parseInt(lists[0].round, 10) : 0;
    if (latestConcluded > 0 && standingsRound >= latestConcluded) {
      return TTL_STANDINGS_FRESH;
    }
    return undefined;
  }

  if (urlClass === 'roundData' && round !== null) {
    if (latestConcluded > 0 && round < latestConcluded) {
      return undefined;
    }
    if (isRoundDataSessionComplete(url, round, ctx?.schedule, now)) {
      return undefined;
    }
    return TTL_ROUND_DATA;
  }

  return TTL_DEFAULT;
}

function kvCacheKey(url: string): string {
  return `${KV_CACHE_PREFIX}${url}`;
}

/** True when URL is already in the per-run memory cache or KV store. */
export async function isJolpicaUrlCached(url: string, ctx: F1ApiContext): Promise<boolean> {
  if (ctx.cache.has(url)) return true;
  if (!ctx.kv) return false;
  const raw = await ctx.kv.get(kvCacheKey(url));
  return raw !== null;
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

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (ctx) ctx.apiCallCount++;

    const res = ctx
      ? await throttledFetch(url, ctx, fetchInit)
      : await fetch(url, fetchInit);

    if (res.status === 429) {
      lastError = new Error('Jolpica API error: Too Many Requests');
      if (attempt < MAX_ATTEMPTS) {
        const delay = ctx?.testBackoffMs ?? RATE_LIMIT_BACKOFF_MS;
        console.warn(`Jolpica 429 on ${url}, backing off ${delay}ms before one retry...`);
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
          if (ttl === undefined) {
            await trackedKvPut(ctx.kv, kvCacheKey(url), rawText);
          } else {
            await trackedKvPut(ctx.kv, kvCacheKey(url), rawText, { expirationTtl: ttl });
          }
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
