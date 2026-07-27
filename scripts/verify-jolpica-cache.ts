/**
 * Verifies Jolpica API cache: dedup, 429 backoff, KV persistence, TTL, rate limiting, API key.
 * Run: npx tsx scripts/verify-jolpica-cache.ts
 */
import {
  classifyJolpicaUrl,
  createF1ApiContext,
  getCacheTtl,
  isResponseEmpty,
  isRoundDataSessionComplete,
  invalidateSeasonStandingsCache,
  shouldRevalidateIncompleteQualifying,
  shouldRevalidateMismatchedRoundStandings,
  kvCacheKey,
} from '../src/f1-api-cache';
import { getSchedule, getRaceResult, hasQualifyingSessionTimes, getDriversForRaceWithFallback, getDriverConstructor, driversFromBulkPayloads, fetchRoundJolpicaData } from '../src/f1-api';

const BASE = 'https://api.jolpi.ca/ergast/f1';
const SCHEDULE_URL = `${BASE}/2026.json?limit=1000`;
const PAST_SCHEDULE_URL = `${BASE}/2025.json?limit=1000`;
const STANDINGS_URL = `${BASE}/2026/driverStandings.json?limit=1000`;

let fetchCount = 0;
let fetchTimestamps: number[] = [];
let lastFetchInit: RequestInit | undefined;
const originalFetch = globalThis.fetch;

function scheduleResponse2026() {
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
        }, {
          season: '2026',
          round: '9',
          raceName: 'British Grand Prix',
          Circuit: { circuitId: 'silverstone', circuitName: 'Silverstone', Location: { locality: 'X', country: 'Y' } },
          date: '2026-07-05',
          time: '15:00:00Z',
          Sprint: { date: '2026-07-04', time: '11:00:00Z' },
          SprintQualifying: { date: '2026-07-03', time: '15:30:00Z' },
        }],
      },
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function scheduleResponse2025() {
  return new Response(JSON.stringify({
    MRData: {
      RaceTable: {
        Races: [{
          season: '2025',
          round: '9',
          raceName: 'Spanish Grand Prix',
          Circuit: { circuitId: 'catalunya', circuitName: 'Catalunya', Location: { locality: 'X', country: 'Y' } },
          date: '2025-06-01',
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
    return scheduleResponse2026();
  }

  if (url.includes('/2025.json')) {
    return scheduleResponse2025();
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

function assertPermanent(ttl: number | undefined, label: string): void {
  assert(ttl === undefined, `${label} should be permanent (no TTL)`);
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
  const ctx = createF1ApiContext(undefined, undefined);
  ctx.testBackoffMs = 10;
  const prev = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) {
      return new Response('throttled', { status: 429, headers: { 'Retry-After': '1' } });
    }
    return scheduleResponse2026();
  };

  try {
    await getSchedule(2026, ctx);
    assert(calls === 2, `Expected 2 attempts on 429 (1 retry), got ${calls}`);
    console.log(`PASS: 429 backoff (${calls} attempts with single retry)`);
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

  const qualiUrl = `${BASE}/2026/10/qualifying.json?limit=1000`;
  const orderOnlyQuali = {
    MRData: { RaceTable: { Races: [{ QualifyingResults: [{ position: '1', number: '1' }] }] } },
  };
  const timedQuali = {
    MRData: {
      RaceTable: {
        Races: [{ QualifyingResults: [{ position: '1', number: '1', Q1: '1:44.361' }] }],
      },
    },
  };
  assert(isResponseEmpty(qualiUrl, orderOnlyQuali), 'order-only qualifying is incomplete/empty');
  assert(!isResponseEmpty(qualiUrl, timedQuali), 'timed qualifying is not empty');
  assert(
    shouldRevalidateIncompleteQualifying(qualiUrl, orderOnlyQuali),
    'order-only qualifying should be revalidated'
  );
  assert(
    !shouldRevalidateIncompleteQualifying(qualiUrl, timedQuali),
    'timed qualifying should not be revalidated as incomplete'
  );
  assert(!hasQualifyingSessionTimes([{ position: '1' } as any]), 'hasQualifyingSessionTimes false without times');
  assert(
    hasQualifyingSessionTimes([{ Q1: '1:44.361' }]),
    'hasQualifyingSessionTimes true with Q1'
  );

  const roundStandingsUrl = `${BASE}/2026/10/driverStandings.json?limit=1000`;
  const mismatchedStandings = {
    MRData: { StandingsTable: { StandingsLists: [{ round: '9', DriverStandings: [{ position: '1' }] }] } },
  };
  const matchingStandings = {
    MRData: { StandingsTable: { StandingsLists: [{ round: '10', DriverStandings: [{ position: '1' }] }] } },
  };
  assert(
    isResponseEmpty(roundStandingsUrl, mismatchedStandings),
    'prior-round standings under round 10 URL should be treated as empty'
  );
  assert(
    !isResponseEmpty(roundStandingsUrl, matchingStandings),
    'matching round standings should not be empty'
  );
  assert(
    shouldRevalidateMismatchedRoundStandings(roundStandingsUrl, mismatchedStandings),
    'mismatched round standings should be revalidated'
  );
  assert(
    !shouldRevalidateMismatchedRoundStandings(roundStandingsUrl, matchingStandings),
    'matching round standings should not be revalidated as mismatched'
  );

  console.log('PASS: isResponseEmpty');
}

function testGetCacheTtl() {
  const scheduleData = { MRData: { RaceTable: { Races: [{ season: '2026' }] } } };
  assert(getCacheTtl(SCHEDULE_URL, scheduleData) === 604_800, 'current-season schedule TTL 7 days');
  assertPermanent(
    getCacheTtl(PAST_SCHEDULE_URL, scheduleData, undefined, new Date('2026-06-01T00:00:00Z')),
    'past-season schedule'
  );

  const staleStandings = {
    MRData: { StandingsTable: { StandingsLists: [{ round: '3', DriverStandings: [{}] }] } },
  };
  const freshStandings = {
    MRData: { StandingsTable: { StandingsLists: [{ round: '5', DriverStandings: [{}] }] } },
  };
  const ctx = createF1ApiContext();
  ctx.latestConcludedRound = 5;

  assert(
    getCacheTtl(STANDINGS_URL, staleStandings, ctx) === 1_200,
    'stale season standings should use short TTL (not permanent)'
  );
  assert(getCacheTtl(STANDINGS_URL, freshStandings, ctx) === 86_400, 'fresh standings TTL 24h');

  // Without latestConcluded context, still avoid permanent cache for current-season standings.
  assert(
    getCacheTtl(STANDINGS_URL, freshStandings, createF1ApiContext()) === 1_200,
    'current-season standings without latestConcluded should use short TTL'
  );

  const constructorUrl = `${BASE}/2026/constructorStandings.json?limit=1000`;
  assert(getCacheTtl(constructorUrl, freshStandings, ctx) === 86_400, 'fresh constructor standings TTL');

  const pastRoundUrl = `${BASE}/2026/3/results.json?limit=1000`;
  const roundResults = {
    MRData: { RaceTable: { Races: [{ Results: [{ position: '1' }] }] } },
  };
  ctx.schedule = [{ round: '3', date: '2026-06-01', time: '12:00:00Z' }];
  assertPermanent(getCacheTtl(pastRoundUrl, roundResults, ctx), 'past concluded round data');

  const qualiUrl = `${BASE}/2026/5/qualifying.json?limit=1000`;
  const orderOnlyQuali = {
    MRData: { RaceTable: { Races: [{ QualifyingResults: [{ position: '1' }] }] } },
  };
  const timedQuali = {
    MRData: {
      RaceTable: {
        Races: [{ QualifyingResults: [{ position: '1', Q1: '1:20.000', Q2: '1:19.500', Q3: '1:19.000' }] }],
      },
    },
  };
  ctx.schedule = [{
    round: '5',
    date: '2026-07-10',
    time: '12:00:00Z',
    Qualifying: { date: '2026-07-09', time: '14:00:00Z' },
  }];
  assert(
    isRoundDataSessionComplete(
      qualiUrl,
      5,
      ctx.schedule,
      new Date('2026-07-09T16:00:00Z')
    ),
    'qualifying session should be complete after quali end'
  );
  assert(
    getCacheTtl(qualiUrl, orderOnlyQuali, ctx, new Date('2026-07-09T16:00:00Z')) === 1_200,
    'order-only qualifying must not be permanently cached'
  );
  assertPermanent(
    getCacheTtl(qualiUrl, timedQuali, ctx, new Date('2026-07-09T16:00:00Z')),
    'session-complete qualifying with times'
  );

  console.log('PASS: getCacheTtl (schedule, standings, session-complete, past round)');
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
  assert(kv.putOptions.get(cacheKey)?.expirationTtl === 604_800, 'Current-season schedule KV TTL should be 7 days');
  console.log('PASS: KV cache miss write with TTL');
}

async function testPastSeasonSchedulePermanent() {
  fetchCount = 0;
  const kv = createMockKv();
  const ctx = createF1ApiContext(kv);
  const { cachedJolpicaJson } = await import('../src/f1-api-cache');
  const url = PAST_SCHEDULE_URL;
  await cachedJolpicaJson(url, ctx, (data: any) => data);

  const cacheKey = `f1_api_cache:${url}`;
  assert(kv.store.has(cacheKey), 'Should write past-season schedule to KV');
  assert(kv.putOptions.get(cacheKey) === undefined, 'Past-season schedule should be permanent KV');
  console.log('PASS: past-season schedule permanent KV');
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
    'Stale standings should get short KV TTL (not permanent)'
  );
  assert(
    kv.putOptions.get(`f1_api_cache:${freshUrl}`)?.expirationTtl === 86_400,
    'Fresh standings should get 24h KV TTL'
  );
  console.log('PASS: standings TTL on KV write (stale 20m, fresh 24h)');
}

async function testStaleStandingsKvRevalidation() {
  fetchCount = 0;
  const kv = createMockKv();
  const stalePayload = {
    MRData: {
      StandingsTable: {
        StandingsLists: [{ round: '3', DriverStandings: [{ position: '1', points: '10' }] }],
      },
    },
  };
  const cacheKey = `f1_api_cache:${STANDINGS_URL}`;
  kv.store.set(cacheKey, JSON.stringify(stalePayload));

  const ctx = createF1ApiContext(kv);
  // Cached standings are from round 3; latest concluded is 5 → must refetch.
  ctx.latestConcludedRound = 5;

  const { cachedJolpicaJson } = await import('../src/f1-api-cache');
  const data: any = await cachedJolpicaJson(STANDINGS_URL, ctx, (d: any) => d);

  assert(fetchCount === 1, `Expected refetch of stale standings, got ${fetchCount}`);
  assert(
    data?.MRData?.StandingsTable?.StandingsLists?.[0]?.round === '5',
    'Should use freshly fetched standings after revalidation'
  );
  assert(
    kv.putOptions.get(cacheKey)?.expirationTtl === 86_400,
    'Revalidated fresh standings should be written with 24h TTL'
  );
  console.log('PASS: stale season standings KV revalidation');
}

async function testActiveScheduleNotOverwrittenByOtherYears() {
  fetchCount = 0;
  const ctx = createF1ApiContext();
  const schedule2026 = await getSchedule(2026, ctx);
  const british = schedule2026.find(r => r.round === '9');
  assert(british?.raceName === 'British Grand Prix', '2026 round 9 should be British GP');

  await getSchedule(2025, ctx);
  const activeRound9 = ctx.schedule?.find(r => r.round === '9');
  assert(activeRound9?.raceName === 'British Grand Prix', 'ctx.schedule round 9 should stay British after 2025 fetch');
  console.log('PASS: active season schedule not overwritten by other-year fetch');
}

async function testDriversFallbackUsesSeasonNotRoundWalk() {
  const prev = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    if (url.includes('/2026/10/drivers.json')) {
      return new Response('throttled', { status: 429 });
    }
    if (url.includes('/2026/drivers.json') && !url.match(/\/2026\/\d+\//)) {
      return new Response(JSON.stringify({
        MRData: {
          DriverTable: {
            Drivers: [{
              driverId: 'norris',
              permanentNumber: '4',
              code: 'NOR',
              url: '',
              givenName: 'Lando',
              familyName: 'Norris',
              dateOfBirth: '',
              nationality: 'British',
            }],
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Any prior-round walk would hit these — fail the test if we see them.
    if (url.match(/\/2026\/[1-9]\/drivers\.json/)) {
      throw new Error(`Unexpected prior-round drivers walk: ${url}`);
    }
    return new Response('throttled', { status: 429 });
  };

  try {
    const ctx = createF1ApiContext();
    ctx.testBackoffMs = 1;
    const drivers = await getDriversForRaceWithFallback(2026, 10, ctx);
    assert(drivers.length === 1 && drivers[0].driverId === 'norris', 'Should recover via season drivers');
    assert(
      !urls.some(u => /\/2026\/(?:9|8|7|6)\/drivers\.json/.test(u)),
      'Must not walk prior rounds on 429'
    );
    assert(
      urls.some(u => u.includes('/2026/drivers.json') && !u.match(/\/2026\/\d+\//)),
      'Should use season /drivers.json bulk endpoint'
    );
    console.log('PASS: drivers fallback uses season bulk endpoint (no round walk)');
  } finally {
    globalThis.fetch = prev;
  }
}

async function testConstructorResolutionNeverFansOut() {
  const prev = globalThis.fetch;
  let constructorFanOut = 0;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/constructors.json')) {
      constructorFanOut++;
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const ids = [
      'norris', 'piastri', 'leclerc', 'hamilton', 'russell', 'antonelli',
      'max_verstappen', 'hadjar', 'gasly', 'colapinto', 'sainz', 'albon',
      'lawson', 'arvid_lindblad', 'stroll', 'alonso', 'hulkenberg', 'bortoleto',
      'ocon', 'bearman', 'bottas', 'perez',
    ];
    await Promise.all(ids.map(id => getDriverConstructor(2026, id)));
    assert(constructorFanOut === 0, `Expected 0 per-driver constructors.json calls, got ${constructorFanOut}`);

    const norris = await getDriverConstructor(2026, 'norris');
    assert(norris?.constructorId === 'mclaren', `Roster should map norris→mclaren, got ${norris?.constructorId}`);
    console.log('PASS: constructor resolution uses roster (0 per-driver Jolpica calls)');
  } finally {
    globalThis.fetch = prev;
  }
}

async function testFetchRoundDerivesDriversFromStandings() {
  const prev = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    if (url.includes('/driverStandings.json')) {
      return new Response(JSON.stringify({
        MRData: {
          StandingsTable: {
            StandingsLists: [{
              round: '10',
              DriverStandings: [{
                position: '1',
                positionText: '1',
                points: '200',
                wins: '3',
                Driver: {
                  driverId: 'norris',
                  permanentNumber: '4',
                  code: 'NOR',
                  url: '',
                  givenName: 'Lando',
                  familyName: 'Norris',
                  dateOfBirth: '',
                  nationality: 'British',
                },
                Constructors: [{ constructorId: 'mclaren', url: '', name: 'McLaren', nationality: 'British' }],
              }],
            }],
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/constructorStandings.json')) {
      return new Response(JSON.stringify({
        MRData: {
          StandingsTable: {
            StandingsLists: [{
              round: '10',
              ConstructorStandings: [{
                position: '1',
                positionText: '1',
                points: '400',
                wins: '5',
                Constructor: { constructorId: 'mclaren', url: '', name: 'McLaren', nationality: 'British' },
              }],
            }],
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/results.json') || url.includes('/qualifying.json') || url.includes('/sprint.json')) {
      return new Response(JSON.stringify({
        MRData: { RaceTable: { Races: [] } },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/drivers.json')) {
      throw new Error(`Unexpected drivers.json fetch when standings available: ${url}`);
    }
    return new Response('{}', { status: 200 });
  };

  try {
    const fromBulk = driversFromBulkPayloads({
      standings: [{
        position: '1',
        positionText: '1',
        points: '1',
        wins: '0',
        Driver: {
          driverId: 'norris',
          permanentNumber: '4',
          code: 'NOR',
          url: '',
          givenName: 'Lando',
          familyName: 'Norris',
          dateOfBirth: '',
          nationality: 'British',
        },
        Constructors: [],
      }],
    });
    assert(fromBulk.length === 1 && fromBulk[0].driverId === 'norris', 'driversFromBulkPayloads should extract standings drivers');

    const ctx = createF1ApiContext();
    const roundData = await fetchRoundJolpicaData(
      2026,
      10,
      {
        needQuali: false,
        needGpResults: false,
        needSprintResults: false,
        needStandings: true,
        needDrivers: true,
        hasSprint: false,
        needSprintQuali: false,
      },
      ctx
    );
    assert(roundData.drivers.length === 1, 'fetchRound should derive drivers from standings');
    assert(
      !urls.some(u => u.includes('/drivers.json')),
      'fetchRound must not call drivers.json when standings already provide drivers'
    );
    console.log('PASS: fetchRound derives drivers from standings (skips drivers.json)');
  } finally {
    globalThis.fetch = prev;
  }
}

async function testInvalidateSeasonStandingsCache() {
  const deleted: string[] = [];
  const kv = {
    async get() {
      return null;
    },
    async put() {},
    async delete(key: string) {
      deleted.push(key);
    },
  };
  const ctx = createF1ApiContext(kv);
  const driverUrl = `${BASE}/2026/driverStandings.json?limit=1000`;
  const constructorUrl = `${BASE}/2026/constructorStandings.json?limit=1000`;
  ctx.cache.set(driverUrl, [{ position: '1' }]);
  ctx.cache.set(constructorUrl, [{ position: '1' }]);
  await invalidateSeasonStandingsCache(2026, ctx);
  assert(!ctx.cache.has(driverUrl), 'driver season standings memory cache cleared');
  assert(!ctx.cache.has(constructorUrl), 'constructor season standings memory cache cleared');
  assert(deleted.includes(kvCacheKey(driverUrl)), 'driver season standings KV deleted');
  assert(deleted.includes(kvCacheKey(constructorUrl)), 'constructor season standings KV deleted');
  console.log('PASS: invalidateSeasonStandingsCache');
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
  await testPastSeasonSchedulePermanent();
  await testRateLimitSpacing();
  await testApiKeyHeader();
  await testStandingsTtlOnFetch();
  await testStaleStandingsKvRevalidation();
  await testActiveScheduleNotOverwrittenByOtherYears();
  await testDriversFallbackUsesSeasonNotRoundWalk();
  await testConstructorResolutionNeverFansOut();
  await testFetchRoundDerivesDriversFromStandings();
  await testInvalidateSeasonStandingsCache();
  console.log('All Jolpica cache verification tests passed.');
}

main().catch(err => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
