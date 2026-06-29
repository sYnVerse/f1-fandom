export const MAX_EDIT_FAILURES = 3;
export const KV_DAILY_PUTS_PREFIX = 'kv_daily_puts:';
export const PROXY_LOGS_KEY = 'proxy_daily_logs';

export interface ApiLogEntry {
  action: string;
  method: string;
  url: string;
  success: boolean;
  errorReason: string | null;
  timestamp: string;
}

let apiLogBuffer: ApiLogEntry[] = [];
const warningBuffers = new Map<string, string[]>();
let invocationPutCount = 0;
let invocationActive = false;

export class EditBlockedError extends Error {
  constructor(pageTitle: string, failures: number) {
    super(`Edit blocked for "${pageTitle}" after ${failures} consecutive failures`);
    this.name = 'EditBlockedError';
  }
}

export function beginKvInvocation(): void {
  apiLogBuffer = [];
  warningBuffers.clear();
  invocationPutCount = 0;
  invocationActive = true;
}

export function getInvocationPutCount(): number {
  return invocationPutCount;
}

export function isKvInvocationActive(): boolean {
  return invocationActive;
}

export async function trackedKvPut(
  kv: any,
  key: string,
  value: string,
  options?: { expirationTtl?: number }
): Promise<void> {
  if (!kv) return;
  await kv.put(key, value, options);
  invocationPutCount++;
}

async function rawKvPut(kv: any, key: string, value: string): Promise<void> {
  if (!kv) return;
  await kv.put(key, value);
  invocationPutCount++;
}

export function bufferApiLog(
  entry: Omit<ApiLogEntry, 'timestamp'> & { timestamp?: string }
): void {
  if (!invocationActive) return;
  apiLogBuffer.push({
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  });
}

export function bufferKvWarning(key: string, message: string): void {
  if (!invocationActive) return;
  const existing = warningBuffers.get(key) || [];
  existing.push(message);
  warningBuffers.set(key, existing);
}

export function getPacificDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export async function endKvInvocation(kv: any): Promise<void> {
  if (!kv || !invocationActive) {
    invocationActive = false;
    return;
  }

  try {
    if (apiLogBuffer.length > 0) {
      const raw = await kv.get(PROXY_LOGS_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      await rawKvPut(kv, PROXY_LOGS_KEY, JSON.stringify([...existing, ...apiLogBuffer]));
    }

    for (const [warnKey, messages] of warningBuffers.entries()) {
      if (messages.length === 0) continue;
      const raw = await kv.get(warnKey);
      const existing: string[] = raw ? JSON.parse(raw) : [];
      await rawKvPut(kv, warnKey, JSON.stringify([...existing, ...messages]));
    }

    if (invocationPutCount > 0) {
      const dateStr = getPacificDateString();
      const countKey = `${KV_DAILY_PUTS_PREFIX}${dateStr}`;
      const raw = await kv.get(countKey);
      const current = raw ? parseInt(raw, 10) : 0;
      await rawKvPut(kv, countKey, String(current + invocationPutCount));
    }
  } finally {
    apiLogBuffer = [];
    warningBuffers.clear();
    invocationPutCount = 0;
    invocationActive = false;
  }
}

export function editFailureKey(pageTitle: string): string {
  return `edit_fail_count:${pageTitle.slice(0, 150)}`;
}

export async function getEditFailureCount(kv: any, pageTitle: string): Promise<number> {
  if (!kv) return 0;
  const raw = await kv.get(editFailureKey(pageTitle));
  const count = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(count) ? count : 0;
}

export async function isEditBlocked(kv: any, pageTitle: string): Promise<boolean> {
  return (await getEditFailureCount(kv, pageTitle)) >= MAX_EDIT_FAILURES;
}

export async function recordEditFailure(kv: any, pageTitle: string): Promise<number> {
  if (!kv) return 0;
  const count = (await getEditFailureCount(kv, pageTitle)) + 1;
  await trackedKvPut(kv, editFailureKey(pageTitle), String(count));
  if (count >= MAX_EDIT_FAILURES) {
    console.warn(`Edit blocked for "${pageTitle}" after ${count} consecutive failures`);
  }
  return count;
}

export async function clearEditFailures(kv: any, pageTitle: string): Promise<void> {
  if (!kv) return;
  await kv.delete(editFailureKey(pageTitle));
}

export async function getDailyKvPutCount(kv: any, dateStr?: string): Promise<number> {
  if (!kv) return 0;
  const key = `${KV_DAILY_PUTS_PREFIX}${dateStr || getPacificDateString()}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(count) ? count : 0;
}

/** Cloudflare Workers KV free-tier daily write limit (for email reporting). */
export const KV_FREE_TIER_DAILY_WRITE_LIMIT = 1000;
