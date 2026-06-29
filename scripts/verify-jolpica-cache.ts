/**
 * Verifies Jolpica API cache: dedup, 429 backoff, KV persistence, TTL, rate limiting, API key.
 * Run: npx tsx scripts/verify-jolpica-cache.ts
 */
import {
  classifyJolpicaUrl,
  createF1ApiContext,
  getCacheTtl,
  isResponseEmpty,
} from '../src/f1-api-cache';
import { getSchedule, getRaceResult } from '../src/f1-api';

const BASE = 'https://api.jolpi.ca/ergast/f1';
const SCHEDULE_URL = `${BASE}/2026.json?limit=1000`;
const STANDINGS_URL = `${BASE}/2026/driverStandings.json?limit=1000`;

let fetchCount = 0;
let fetchTimestamps: number[] = [];
let lastFetchInit: RequestInit | undefined;
const originalFetch = globalThis.fetch;

function scheduleResponse() {
  return new Response(JSON.stringify({
    MRData: {
      RaceTable: {
        Races: [{
          season: '2026',
          round: '1',
          raceName: 'Test GP',
          Circuit: { circuitId: 'test', circuitName: 'Test', Location: { locality: 'X', country: 'Y' } },
          date: '2020-01-01',
          time: '12:00:00Z',
        }],
      },
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function resultsResponse() {
  return new Response(JSON.stringify({
    MRData: { RaceTable: { Races: [{ Results: [{ position: '1', grid: '1' }] }] } },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function standingsResponse(round: string) {
  return new Response(JSON.stringify({
    MRData: {
      StandingsTable: {
        StandingsLists: [{ round, DriverStandings: [{ position: '1' }] }],
      },
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  fetchCount++;
  fetchTimestamps.push(Date.now());
  lastFetchInit = init;
  const url = String(input);

  if (url.includes('429-test')) {
    return new Response('throttled', { status: 429, headers: { 'Retry-After': '1' } });
  }

  if (url.includes('/2026.json')) {
    return scheduleResponse();
  }

  if (url.includes('/results.json')) {
    return resultsResponse();
  }

  if (url.includes('/constructorStandings.json')) {
    return standingsResponse('5');
  }

  if (url.includes('/driverStandings.json') && url.includes('stale=1')) {
    return standingsResponse('3');
  }

  if (url.includes('/driverStandings.json')) {
    return standingsResponse('5');
  }

  return originalFetch(input, init);
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function testScheduleDedup() {
  fetchCount = 0;
  const ctx = createF1ApiContext();
  await getSchedule(2026, ctx);
  await getSchedule(2026, ctx);
  await getSchedule(2026, ctx);
  assert(fetchCount === 1, `Expected 1 fetch for 3 getSchedule calls, got ${fetchCount}`);
  console.log('PASS: schedule dedup (3 calls -> 1 fetch)');
}

async function testRaceResultDedup() {
  fetchCount = 0;
  const ctx = createF1ApiContext();
  await Promise.all([
    getRaceResult(2026, 1, false, ctx),
    getRaceResult(2026, 1, false, ctx),
  ]);
  assert(fetchCount === 1, `Expected 1 fetch for 2 concurrent getRaceResult calls, got ${fetchCount}`);
  console.log('PASS: race result in-flight dedup');
}

async function test429Backoff() {
  fetchCount = 0;
  const ctx = createF1ApiContext();
  const start = Date.now();
  const prev = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls <= 2) {
      return new Response('throttled', { status: 429, headers: { 'Retry-After': '1' } });
    }
    return scheduleResponse();
  };

  try {
    await getSchedule(2026, ctx);
    const elapsed = Date.now() - start;
    assert(calls >= 3, `Expected at least 3 attempts on 429, got ${calls}`);
    assert(elapsed >= 1000, `Expected backoff delay >= 1s, got ${elapsed}ms`);
    console.log(`PASS: 429 backoff (${calls} attempts, ${elapsed}ms elapsed)`);
  } finally {
    globalThis.fetch = prev;
  }
}

function testClassifyJolpicaUrl() {
  assert(classifyJolpicaUrl(SCHEDULE_URL) === 'schedule', 'schedule URL class');
  assert(classifyJolpicaUrl(STANDINGS_URL) === 'seasonStandings', 'season standings URL class');
  assert(
    classifyJolpicaUrl(`${BASE}/2026/3/results.json?limit=1000`) === 'roundData',
    'round data URL class'
  );
  console.log('PASS: classifyJolpicaUrl');
}

function testIsResponseEmpty() {
  const emptySchedule = { MRData: { RaceTable: { Races: [] } } };
  const fullSchedule = { MRData: { RaceTable: { Races: [{ season: '2026' }] } } };
  assert(isResponseEmpty(SCHEDULE_URL, emptySchedule), 'empty schedule');
  assert(!isResponseEmpty(SCHEDULE_URL, fullSchedule), 'non-empty schedule');
  console.log('PASS: isResponseEmpty');
}

function testGetCacheTtl() {
  const scheduleData = { MRData: { RaceTable: { Races: [{ season: '2026' }] } } };
  assert(getCacheTtl(SCHEDULE_URL, scheduleData) === 604_800, 'schedule TTL 7 days');

  const staleStandings = {
    MRData: { StandingsTable: { StandingsLists: [{ round: '3', DriverStandings: [{}] }] } },
  };
  const freshStandings = {
    MRData: { StandingsTable: { StandingsLists: [{ round: '5', DriverStandings: [{}] }] } },
  };
  const ctx = createF1ApiContext();
  ctx.latestConcludedRound = 5;

  assert(getCacheTtl(STANDINGS_URL, staleStandings, ctx) === 1_200, 'stale standings TTL 20m');
  assert(getCacheTtl(STANDINGS_URL, freshStandings, ctx) === 86_400, 'fresh standings TTL 24h');

  const constructorUrl = `${BASE}/2026/constructorStandings.json?limit=1000`;
  assert(getCacheTtl(constructorUrl, freshStandings, ctx) === 86_400, 'constructor standings TTL');

  console.log('PASS: getCacheTtl (schedule, stale/fresh standings)');
}

function createMockKv(store = new Map<string, string>()) {
  const putOptions = new Map<string, { expirationTtl?: number } | undefined>();
  return {
    store,
    putOptions,
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      store.set(key, value);
      putOptions.set(key, options);
    },
  };
}

async function testKvHit() {
  fetchCount = 0;
  const kv = createMockKv();
  const cacheKey = `f1_api_cache:${SCHEDULE_URL}`;
  kv.store.set(cacheKey, JSON.stringify({
    MRData: {
      RaceTable: {
        Races: [{
          season: '2026',
          round: '1',
          raceName: 'Cached GP',
          Circuit: { circuitId: 'test', circuitName: 'Test', Location: { locality: 'X', country: 'Y' } },
          date: '2020-01-01',
          time: '12:00:00Z',
        }],
      },
    },
  }));

  const ctx = createF1ApiContext(kv);
  const schedule = await getSchedule(2026, ctx);
  assert(fetchCount === 0, `KV hit should skip fetch, got ${fetchCount}`);
  assert(schedule[0].raceName === 'Cached GP', 'Should use cached schedule data');
  console.log('PASS: KV cache hit (0 fetches)');
}

async function testKvMissWrite() {
  fetchCount = 0;
  const kv = createMockKv();
  const ctx = createF1ApiContext(kv);
  await getSchedule(2026, ctx);

  const cacheKey = `f1_api_cache:${SCHEDULE_URL}`;
  assert(kv.store.has(cacheKey), 'Should write schedule to KV on miss');
  assert(kv.putOptions.get(cacheKey)?.expirationTtl === 604_800, 'Schedule KV TTL should be 7 days');
  console.log('PASS: KV cache miss write with TTL');
}

async function testRateLimitSpacing() {
  fetchCount = 0;
  fetchTimestamps = [];
  const ctx = createF1ApiContext();
  const urls = [
    `${BASE}/2026/1/results.json?limit=1000`,
    `${BASE}/2026/2/results.json?limit=1000`,
    `${BASE}/2026/3/results.json?limit=1000`,
  ];

  await Promise.all(urls.map(url =>
    import('../src/f1-api-cache').then(({ cachedJolpicaJson }) =>
      cachedJolpicaJson(url, ctx, (data: any) => data)
    )
  ));

  assert(fetchCount === 3, `Expected 3 fetches, got ${fetchCount}`);
  for (let i = 1; i < fetchTimestamps.length; i++) {
    const gap = fetchTimestamps[i] - fetchTimestamps[i - 1];
    assert(gap >= 280, `Fetch ${i} should be >= 300ms after previous, gap=${gap}ms`);
  }
  console.log('PASS: rate limit spacing (>= 300ms between fetches)');
}

async function testApiKeyHeader() {
  fetchCount = 0;
  lastFetchInit = undefined;
  const ctx = createF1ApiContext(undefined, 'test-api-key-secret');
  await getSchedule(2026, ctx);

  const auth = new Headers(lastFetchInit?.headers).get('Authorization');
  assert(auth === 'Bearer test-api-key-secret', `Expected Bearer API key header, got ${auth}`);
  console.log('PASS: API key Authorization header');
}

async function testStandingsTtlOnFetch() {
  fetchCount = 0;
  const kv = createMockKv();
  const ctx = createF1ApiContext(kv);
  ctx.latestConcludedRound = 5;

  const staleUrl = `${BASE}/2026/driverStandings.json?limit=1000&stale=1`;
  const freshUrl = `${BASE}/2026/constructorStandings.json?limit=1000`;

  const { cachedJolpicaJson } = await import('../src/f1-api-cache');
  await cachedJolpicaJson(staleUrl, ctx, (data: any) => data);
  await cachedJolpicaJson(freshUrl, ctx, (data: any) => data);

  assert(
    kv.putOptions.get(`f1_api_cache:${staleUrl}`)?.expirationTtl === 1_200,
    'Stale standings should get 20m KV TTL'
  );
  assert(
    kv.putOptions.get(`f1_api_cache:${freshUrl}`)?.expirationTtl === 86_400,
    'Fresh standings should get 24h KV TTL'
  );
  console.log('PASS: standings TTL on KV write (stale 20m, fresh 24h)');
}

async function main() {
  testClassifyJolpicaUrl();
  testIsResponseEmpty();
  testGetCacheTtl();
  await testScheduleDedup();
  await testRaceResultDedup();
  await test429Backoff();
  await testKvHit();
  await testKvMissWrite();
  await testRateLimitSpacing();
  await testApiKeyHeader();
  await testStandingsTtlOnFetch();
  console.log('All Jolpica cache verification tests passed.');
}

main().catch(err => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
