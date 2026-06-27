/**
 * Verifies within-run Jolpica cache deduplication and 429 backoff.
 * Run: npx tsx scripts/verify-jolpica-cache.ts
 */
import { createF1ApiContext } from '../src/f1-api-cache';
import { getSchedule, getRaceResult } from '../src/f1-api';

let fetchCount = 0;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  fetchCount++;
  const url = String(input);

  if (url.includes('429-test')) {
    return new Response('throttled', { status: 429, headers: { 'Retry-After': '1' } });
  }

  if (url.includes('/2026.json')) {
    return new Response(JSON.stringify({
      MRData: {
        RaceTable: {
          Races: [{ season: '2026', round: '1', raceName: 'Test GP', Circuit: { circuitId: 'test', circuitName: 'Test', Location: { locality: 'X', country: 'Y' } }, date: '2026-01-01' }]
        }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (url.includes('/results.json')) {
    return new Response(JSON.stringify({
      MRData: { RaceTable: { Races: [{ Results: [] }] } }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return originalFetch(input, init);
};

async function testScheduleDedup() {
  fetchCount = 0;
  const ctx = createF1ApiContext();
  await getSchedule(2026, ctx);
  await getSchedule(2026, ctx);
  await getSchedule(2026, ctx);
  if (fetchCount !== 1) {
    throw new Error(`Expected 1 fetch for 3 getSchedule calls, got ${fetchCount}`);
  }
  console.log('PASS: schedule dedup (3 calls -> 1 fetch)');
}

async function testRaceResultDedup() {
  fetchCount = 0;
  const ctx = createF1ApiContext();
  await Promise.all([
    getRaceResult(2026, 1, false, ctx),
    getRaceResult(2026, 1, false, ctx),
  ]);
  if (fetchCount !== 1) {
    throw new Error(`Expected 1 fetch for 2 concurrent getRaceResult calls, got ${fetchCount}`);
  }
  console.log('PASS: race result in-flight dedup');
}

async function test429Backoff() {
  fetchCount = 0;
  const ctx = createF1ApiContext();
  const start = Date.now();
  // Temporarily override fetch for 429 scenario
  const prev = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls <= 2) {
      return new Response('throttled', { status: 429, headers: { 'Retry-After': '1' } });
    }
    return new Response(JSON.stringify({
      MRData: { RaceTable: { Races: [{ season: '2026', round: '1', raceName: 'Test GP', date: '2026-01-01' }] } }
    }), { status: 200 });
  };

  try {
    await getSchedule(2026, ctx);
    const elapsed = Date.now() - start;
    if (calls < 3) throw new Error(`Expected at least 3 attempts on 429, got ${calls}`);
    if (elapsed < 1000) throw new Error(`Expected backoff delay >= 1s, got ${elapsed}ms`);
    console.log(`PASS: 429 backoff (${calls} attempts, ${elapsed}ms elapsed)`);
  } finally {
    globalThis.fetch = prev;
  }
}

async function main() {
  await testScheduleDedup();
  await testRaceResultDedup();
  await test429Backoff();
  console.log('All Jolpica cache verification tests passed.');
}

main().catch(err => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
