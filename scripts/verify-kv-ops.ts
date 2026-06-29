/**
 * Verifies KV batching, edit failure limits, and daily put counting.
 * Run: npx tsx scripts/verify-kv-ops.ts
 */
import {
  beginKvInvocation,
  bufferApiLog,
  bufferKvWarning,
  clearEditFailures,
  editFailureKey,
  endKvInvocation,
  getDailyKvPutCount,
  getEditFailureCount,
  isEditBlocked,
  MAX_EDIT_FAILURES,
  PROXY_LOGS_KEY,
  recordEditFailure,
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
  console.log('verify-kv-ops: all assertions passed');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
