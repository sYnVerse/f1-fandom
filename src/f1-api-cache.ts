/**
 * Within-run Jolpica API cache with in-flight deduplication and 429 backoff.
 * Create one context per cron invocation (or per HTTP request) and pass it through.
 */

const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 2000;

export interface F1ApiContext {
  readonly cache: Map<string, unknown>;
  readonly inFlight: Map<string, Promise<unknown>>;
  apiCallCount: number;
}

export function createF1ApiContext(): F1ApiContext {
  return {
    cache: new Map(),
    inFlight: new Map(),
    apiCallCount: 0,
  };
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

async function fetchJolpicaUncached(url: string, ctx?: F1ApiContext): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (ctx) ctx.apiCallCount++;

    const res = await fetch(url);

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      lastError = new Error(`Ergast API error: Too Many Requests`);
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
      throw new Error(`Ergast API error: ${res.statusText}`);
    }

    return res;
  }

  throw lastError ?? new Error('Ergast API error: Too Many Requests');
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

  const promise = (async () => {
    const res = await fetchJolpica(url, ctx);
    const data = await res.json();
    const parsed = parse(data);
    if (ctx) {
      ctx.cache.set(url, parsed);
    }
    return parsed;
  })();

  if (ctx) {
    ctx.inFlight.set(url, promise);
    try {
      return await promise;
    } finally {
      ctx.inFlight.delete(url);
    }
  }

  return promise;
}
