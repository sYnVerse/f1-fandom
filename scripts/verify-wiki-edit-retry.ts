/**
 * Verifies editPageWithRetry: one delayed retry, then KV deferral of the full edit.
 * Run: npx tsx scripts/verify-wiki-edit-retry.ts
 */
import {
  beginKvInvocation,
  clearEditFailures,
  endKvInvocation,
  getEditFailureCount,
  listPendingWikiEditTitles,
  loadPendingWikiEdit,
  recordEditFailure,
} from '../src/kv-ops';
import { editPageWithRetry, WIKI_EDIT_RETRY_DELAY_MS } from '../src/wiki';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function createMockKv() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

type FetchCall = { url: string; init?: RequestInit };

async function withMockFetch<T>(
  handler: (call: FetchCall, callIndex: number) => Promise<Response> | Response,
  fn: () => Promise<T>
): Promise<{ result: T; calls: FetchCall[] }> {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  let callIndex = 0;
  (globalThis as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const call = { url, init };
    calls.push(call);
    const response = await handler(call, callIndex++);
    return response;
  };
  try {
    const result = await fn();
    return { result, calls };
  } finally {
    globalThis.fetch = original;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function testRetryThenDefer(): Promise<void> {
  const kv = createMockKv();
  beginKvInvocation();
  const title = '2026 Hungarian Grand Prix';
  const text = '=== Q1 ===\nGenerated report text that must be preserved.\n';
  const summary = 'Automated update of GP page sections: Q1 Report, Q2 Report, Q3 Report';

  const started = Date.now();
  const { result, calls } = await withMockFetch(async () => {
    return new Response('<html>503 Backend fetch failed</html>', { status: 503 });
  }, async () =>
    editPageWithRetry(
      'f1.fandom.com',
      { cookies: 'a=b', csrfToken: 'TOKEN', kvState: kv },
      title,
      text,
      summary,
      undefined,
      {
        persistOnFailure: true,
        retryDelayMs: 20,
        meta: { gpRound: 11, gpSections: ['q1_report', 'q2_report', 'q3_report'] },
      }
    )
  );
  const elapsed = Date.now() - started;

  assert(result === 'deferred', 'Should defer after two failures');
  assert(calls.length === 2, `Should attempt edit twice, got ${calls.length}`);
  assert(elapsed >= 15, 'Should wait before the second attempt');
  assert(WIKI_EDIT_RETRY_DELAY_MS === 10_000, 'Default retry delay should be 10 seconds');

  const pending = await loadPendingWikiEdit(kv, title);
  assert(!!pending, 'Pending edit should be saved');
  assert(pending!.text === text, 'Pending edit must keep full wikitext');
  assert(pending!.summary === summary, 'Pending edit must keep summary');
  assert(pending!.gpRound === 11, 'Pending edit must keep gpRound');
  assert(
    (await listPendingWikiEditTitles(kv)).includes(title),
    'Pending index should include title'
  );
  assert((await getEditFailureCount(kv, title)) === 0, 'Failure counter should clear after deferral');

  await endKvInvocation(kv);
}

async function testRetryThenSuccess(): Promise<void> {
  const kv = createMockKv();
  beginKvInvocation();
  await recordEditFailure(kv, 'Temp Page');

  let attempt = 0;
  const { result, calls } = await withMockFetch(async () => {
    attempt++;
    if (attempt === 1) {
      return new Response('fail', { status: 503 });
    }
    return jsonResponse({ edit: { result: 'Success' } });
  }, async () =>
    editPageWithRetry(
      'f1.fandom.com',
      { cookies: 'a=b', csrfToken: 'TOKEN', kvState: kv },
      '2026 Dutch Grand Prix',
      'page text',
      'summary',
      undefined,
      { persistOnFailure: true, retryDelayMs: 5 }
    )
  );

  assert(result === 'published', 'Second attempt should publish');
  assert(calls.length === 2, 'Should call edit twice');
  assert(!(await loadPendingWikiEdit(kv, '2026 Dutch Grand Prix')), 'Should not leave a pending edit');
  await clearEditFailures(kv, 'Temp Page');
  await endKvInvocation(kv);
}

async function main(): Promise<void> {
  await testRetryThenDefer();
  console.log('PASS: retry then defer to KV');
  await testRetryThenSuccess();
  console.log('PASS: retry then success');
  console.log('verify-wiki-edit-retry: all assertions passed');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
