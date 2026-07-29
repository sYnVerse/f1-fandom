/**
 * Verifies KV batching, edit failure limits, pending wiki edits, and daily put counting.
 * Run: npx tsx scripts/verify-kv-ops.ts
 */
import {
  beginKvInvocation,
  bufferApiLog,
  bufferKvWarning,
  clearEditFailures,
  clearPendingWikiEdit,
  editFailureKey,
  endKvInvocation,
  acquireCronSyncLock,
  releaseCronSyncLock,
  getDailyKvPutCount,
  getEditFailureCount,
  isEditBlocked,
  listPendingWikiEditTitles,
  loadPendingWikiEdit,
  MAX_EDIT_FAILURES,
  PENDING_WIKI_EDIT_INDEX_KEY,
  pendingWikiEditKey,
  PROXY_LOGS_KEY,
  recordEditFailure,
  savePendingWikiEdit,
  trackedKvPut,
} from '../src/kv-ops';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function createMockKv(): {
  store: Map<string, string>;
  putOptions: Map<string, { expirationTtl?: number } | undefined>;
  get: (k: string) => Promise<string | null>;
  put: (k: string, v: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (k: string) => Promise<void>;
} {
  const store = new Map<string, string>();
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
    async delete(key: string) {
      store.delete(key);
    },
  };
}

async function testBufferedApiLogs(): Promise<void> {
  const kv = createMockKv();
  beginKvInvocation();
  bufferApiLog({ action: 'Test', method: 'GET', url: 'http://test', success: true, errorReason: null });
  bufferApiLog({ action: 'Test 2', method: 'POST', url: 'http://test', success: false, errorReason: 'fail' });
  await endKvInvocation(kv);

  const logs = JSON.parse(kv.store.get(PROXY_LOGS_KEY) || '[]');
  assert(logs.length === 2, 'Should batch two API logs into one KV put');
  assert(kv.store.size >= 1, 'Should have written proxy logs key');
}

async function testDailyPutCounter(): Promise<void> {
  const kv = createMockKv();
  beginKvInvocation();
  await trackedKvPut(kv, 'sync_flag_a', 'true');
  await trackedKvPut(kv, 'sync_flag_b', 'true');
  await endKvInvocation(kv);

  const count = await getDailyKvPutCount(kv);
  assert(count >= 2, `Daily KV put counter should include invocation puts, got ${count}`);
}

async function testEditFailureLimit(): Promise<void> {
  const kv = createMockKv();
  const title = '2026 Austrian Grand Prix';

  for (let i = 0; i < MAX_EDIT_FAILURES; i++) {
    assert(!await isEditBlocked(kv, title), `Should not block before ${MAX_EDIT_FAILURES} failures`);
    await recordEditFailure(kv, title);
  }

  assert(await isEditBlocked(kv, title), 'Should block after max failures');
  assert(
    (await getEditFailureCount(kv, title)) === MAX_EDIT_FAILURES,
    'Failure count should equal max'
  );

  await clearEditFailures(kv, title);
  assert(!await isEditBlocked(kv, title), 'Should unblock after clear');
  assert(!kv.store.has(editFailureKey(title)), 'Failure key should be deleted');
}

async function testBufferedWarnings(): Promise<void> {
  const kv = createMockKv();
  beginKvInvocation();
  bufferKvWarning('missing_test_driver_flags', 'Unknown flag for Driver X');
  bufferKvWarning('f1_crawler_failures', 'Crawler failed for FP1');
  await endKvInvocation(kv);

  const flags = JSON.parse(kv.store.get('missing_test_driver_flags') || '[]');
  const crawlers = JSON.parse(kv.store.get('f1_crawler_failures') || '[]');
  assert(flags.length === 1, 'Should batch test driver flag warnings');
  assert(crawlers.length === 1, 'Should batch crawler warnings');
}

async function testExpirationTtlPassthrough(): Promise<void> {
  const kv = createMockKv();
  await trackedKvPut(kv, 'ttl_key', 'val', { expirationTtl: 3600 });
  assert(kv.putOptions.get('ttl_key')?.expirationTtl === 3600, 'Should pass expirationTtl to kv.put');
}

async function testCronSyncLock(): Promise<void> {
  const kv = createMockKv();
  const ownerA = 'worker-a';
  const ownerB = 'worker-b';

  assert(await acquireCronSyncLock(kv, ownerA), 'First worker should acquire lock');
  assert(!await acquireCronSyncLock(kv, ownerB), 'Second worker should be blocked');
  await releaseCronSyncLock(kv, ownerA);
  assert(await acquireCronSyncLock(kv, ownerB), 'Lock should be available after release');
  await releaseCronSyncLock(kv, ownerB);
}

async function testPendingWikiEditRoundTrip(): Promise<void> {
  const kv = createMockKv();
  beginKvInvocation();
  const title = '2026 Hungarian Grand Prix';

  await savePendingWikiEdit(kv, {
    title,
    text: '=== Q1 ===\nNorris took pole.\n',
    summary: 'Automated update of GP page sections: Q1 Report, Q2 Report, Q3 Report',
    domain: 'f1.fandom.com',
    apiEndpoint: null,
    gpRound: 11,
    gpSections: ['q1_report', 'q2_report', 'q3_report'],
    savedAt: '2026-07-25T15:42:00.000Z',
  });

  const titles = await listPendingWikiEditTitles(kv);
  assert(titles.includes(title), 'Index should list pending title');
  assert(kv.store.has(pendingWikiEditKey(title)), 'Pending edit payload should be stored');
  assert(kv.store.has(PENDING_WIKI_EDIT_INDEX_KEY), 'Pending edit index should be stored');

  const loaded = await loadPendingWikiEdit(kv, title);
  assert(!!loaded, 'Should load pending edit');
  assert(loaded!.text.includes('Norris took pole'), 'Should preserve edit text');
  assert(loaded!.gpRound === 11, 'Should preserve gpRound');
  assert(loaded!.gpSections?.join(',') === 'q1_report,q2_report,q3_report', 'Should preserve sections');

  await clearPendingWikiEdit(kv, title);
  assert(!(await loadPendingWikiEdit(kv, title)), 'Pending edit should be cleared');
  assert(!(await listPendingWikiEditTitles(kv)).includes(title), 'Index should drop cleared title');
  await endKvInvocation(kv);
}

async function main(): Promise<void> {
  await testBufferedApiLogs();
  console.log('PASS: buffered API logs');
  await testDailyPutCounter();
  console.log('PASS: daily KV put counter');
  await testEditFailureLimit();
  console.log('PASS: edit failure limit');
  await testBufferedWarnings();
  console.log('PASS: buffered KV warnings');
  await testExpirationTtlPassthrough();
  console.log('PASS: expirationTtl passthrough');
  await testCronSyncLock();
  console.log('PASS: cron sync lock');
  await testPendingWikiEditRoundTrip();
  console.log('PASS: pending wiki edit round trip');
  console.log('verify-kv-ops: all assertions passed');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
