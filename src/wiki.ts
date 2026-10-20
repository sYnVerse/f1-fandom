import {
  findSectionRanges,
  splitLines,
  stripLeadingHeadingFromContent,
  stripWikiComments,
  stripWikiTemplates,
} from './wikitext-parse';
import {
  bufferApiLog,
  clearEditFailures,
  EditBlockedError,
  isEditBlocked,
  MAX_EDIT_FAILURES,
  PendingWikiEdit,
  recordEditFailure,
  savePendingWikiEdit,
} from './kv-ops';

export const WIKI_EDIT_RETRY_DELAY_MS = 10_000;

export type WikiEditResult = 'published' | 'deferred';

export interface EditPageRetryOptions {
  /** When true (default if session has KV), persist the edit after a second failure. */
  persistOnFailure?: boolean;
  /** Metadata stored with a deferred edit for post-replay sync bookkeeping. */
  meta?: Pick<PendingWikiEdit, 'gpRound' | 'gpSections' | 'syncKeys'>;
  /** Override retry delay (used by tests). */
  retryDelayMs?: number;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface WikiConfig {
  domain: string; // e.g. f1.fandom.com
  username: string;
  botPassword?: string; // BotPassword generated on Special:BotPasswords
  apiEndpoint?: string; // Optional proxy endpoint url
  proxySecret?: string; // Optional secret token for proxy
  kvState?: any; // Cloudflare KV state binding for logging
}

export interface WikiSession {
  cookies: string;
  csrfToken: string;
  proxySecret?: string;
  kvState?: any;
}

/** Default F1 Fandom hosts the public wiki read APIs may contact. */
export const DEFAULT_ALLOWED_WIKI_HOSTS: readonly string[] = ['f1.fandom.com'];

export class WikiDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikiDomainError';
  }
}

export interface WikiHostAllowlistEnv {
  DEFAULT_WIKI_DOMAIN?: string;
  ALLOWED_WIKI_HOSTS?: string;
}

/**
 * Build the allowlist from the built-in F1 Fandom host, optional DEFAULT_WIKI_DOMAIN,
 * and optional comma-separated ALLOWED_WIKI_HOSTS (Cloudflare vars/secrets).
 */
export function resolveAllowedWikiHosts(env?: WikiHostAllowlistEnv): Set<string> {
  const hosts = new Set<string>(DEFAULT_ALLOWED_WIKI_HOSTS.map((h) => h.toLowerCase()));

  const addConfiguredHost = (raw: string | undefined) => {
    if (!raw) return;
    const trimmed = raw.trim().toLowerCase().replace(/\.$/, '');
    if (!trimmed) return;
    // Config must be bare hostnames — ignore URL-shaped values.
    if (trimmed.includes('://') || trimmed.includes('/') || trimmed.includes('@') || trimmed.includes(':')) {
      return;
    }
    hosts.add(trimmed);
  };

  addConfiguredHost(env?.DEFAULT_WIKI_DOMAIN);
  if (env?.ALLOWED_WIKI_HOSTS) {
    for (const part of env.ALLOWED_WIKI_HOSTS.split(',')) {
      addConfiguredHost(part);
    }
  }

  return hosts;
}

function isIpLiteralHostname(hostname: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(':')) return true;
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true;
  return false;
}

/** True when the authority includes an explicit port (including default :443). */
function authorityHasExplicitPort(raw: string): boolean {
  const withoutScheme = raw.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const authority = withoutScheme.split('/')[0].split('?')[0].split('#')[0];
  if (authority.startsWith('[')) {
    const end = authority.indexOf(']');
    if (end === -1) return false;
    return /^:\d+$/.test(authority.slice(end + 1));
  }
  const colon = authority.lastIndexOf(':');
  if (colon === -1) return false;
  return /^\d+$/.test(authority.slice(colon + 1));
}

/**
 * Strictly parse a client-supplied wiki domain to an allowlisted hostname.
 * https only, exact host match, no userinfo/ports/IPs/paths/suffix lookalikes.
 */
export function assertAllowedWikiDomain(
  rawDomain: unknown,
  allowedHosts: ReadonlySet<string>
): string {
  if (typeof rawDomain !== 'string' || !rawDomain.trim()) {
    throw new WikiDomainError('Wiki domain is required');
  }

  const trimmed = rawDomain.trim();
  if (trimmed.includes('@')) {
    throw new WikiDomainError('Wiki domain must not include userinfo');
  }

  let url: URL;
  try {
    // Only treat https:// as an absolute URL. Require :// so bare "host:port"
    // is not parsed as a custom scheme (e.g. f1.fandom.com:8443).
    if (/^https:\/\//i.test(trimmed)) {
      url = new URL(trimmed);
    } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      throw new WikiDomainError('Wiki domain must use https');
    } else {
      url = new URL(`https://${trimmed}`);
    }
  } catch (e: any) {
    if (e instanceof WikiDomainError || e?.name === 'WikiDomainError') throw e;
    throw new WikiDomainError('Invalid wiki domain');
  }

  if (url.protocol !== 'https:') {
    throw new WikiDomainError('Wiki domain must use https');
  }
  if (url.username || url.password) {
    throw new WikiDomainError('Wiki domain must not include userinfo');
  }
  // URL may normalize https://host:443 to an empty port — still reject explicit ports.
  if (url.port !== '' || authorityHasExplicitPort(trimmed)) {
    throw new WikiDomainError('Wiki domain must not include a port');
  }
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new WikiDomainError('Wiki domain must be a hostname only');
  }

  let host = url.hostname.toLowerCase();
  if (host.endsWith('.')) {
    host = host.slice(0, -1);
  }

  if (!host || isIpLiteralHostname(host)) {
    throw new WikiDomainError('Wiki domain must not be an IP address');
  }

  // Exact match only — blocks f1.fandom.com.evil.com and evil-f1.fandom.com.
  if (!allowedHosts.has(host)) {
    throw new WikiDomainError('Wiki domain is not allowlisted');
  }

  return host;
}

/** Fetch while allowing only same-host redirects (blocks redirect-based SSRF). */
async function fetchWithSameHostRedirects(
  url: string,
  init: RequestInit = {},
  maxRedirects = 3
): Promise<Response> {
  let current = url;

  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(current, { ...init, redirect: 'manual' });
    if (res.status < 300 || res.status >= 400) {
      return res;
    }

    const location = res.headers.get('Location');
    if (!location) {
      throw new Error(`Redirect without Location (HTTP ${res.status})`);
    }

    const next = new URL(location, current);
    const cur = new URL(current);
    const nextHost = next.hostname.toLowerCase();
    const curHost = cur.hostname.toLowerCase();

    if (
      next.protocol !== cur.protocol ||
      nextHost !== curHost ||
      next.username !== '' ||
      next.password !== '' ||
      next.port !== cur.port
    ) {
      throw new Error('Redirect to non-allowlisted host rejected');
    }

    current = next.href;
  }

  throw new Error('Too many redirects');
}

// Get the MediaWiki API URL
function getApiUrl(domain: string, apiEndpoint?: string): string {
  if (apiEndpoint) {
    return apiEndpoint;
  }
  // Ensure protocol is present
  const cleanDomain = domain.replace(/^(https?:\/\/)?/, 'https://');
  return `${cleanDomain}/api.php`;
}

// Helper to log wiki API calls into Cloudflare KV (buffered per worker invocation)
async function logApiCall(
  kv: any,
  action: string,
  method: string,
  url: string,
  success: boolean,
  errorReason?: string
): Promise<void> {
  if (!kv) return;

  try {
    bufferApiLog({
      action,
      method,
      url,
      success,
      errorReason: errorReason || null,
    });
  } catch (e: any) {
    console.error("Failed to buffer wiki API call log:", e.message);
  }
}

// Log in and return session cookies and CSRF token
export async function loginToWiki(config: WikiConfig): Promise<WikiSession> {
  const apiUrl = getApiUrl(config.domain, config.apiEndpoint);
  const username = config.username;
  const password = config.botPassword || '';

  if (!username || !password) {
    throw new Error('Bot username or password not provided.');
  }

  // Step 1: Get Login Token
  const tokenUrl = `${apiUrl}?action=query&meta=tokens&type=login&format=json`;
  const tokenHeaders: Record<string, string> = {};
  if (config.proxySecret) {
    tokenHeaders['X-Proxy-Secret'] = config.proxySecret;
  }

  let tokenSuccess = false;
  let tokenErrorReason = '';
  let tokenRes;

  try {
    tokenRes = await fetch(tokenUrl, { headers: tokenHeaders });
    tokenSuccess = tokenRes.ok;
    if (!tokenRes.ok) {
      tokenErrorReason = `HTTP ${tokenRes.status}`;
    }
  } catch (e: any) {
    tokenErrorReason = e.message;
    throw e;
  } finally {
    if (config.kvState) {
      await logApiCall(config.kvState, 'Get Login Token', 'GET', tokenUrl, tokenSuccess, tokenErrorReason);
    }
  }

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text().catch(() => '');
    throw new Error(`Get login token request failed (HTTP ${tokenRes.status}): ${errorText}`);
  }

  const tokenData = await tokenRes.json() as any;
  const loginToken = tokenData?.query?.tokens?.logintoken;
  if (!loginToken) {
    throw new Error(`Login token not found in MediaWiki response. Response: ${JSON.stringify(tokenData)}`);
  }

  // Get cookies from token response if any (some wikis set cookies on token request)
  let cookies = '';
  if (typeof (tokenRes.headers as any).getSetCookie === 'function') {
    cookies = (tokenRes.headers as any).getSetCookie()
      .map((c: string) => c.split(';')[0])
      .join('; ');
  } else {
    const setCookie = tokenRes.headers.get('set-cookie');
    if (setCookie) cookies = setCookie.split(';')[0];
  }

  // Step 2: Submit Credentials
  const loginParams = new URLSearchParams();
  loginParams.append('action', 'login');
  loginParams.append('lgname', username);
  loginParams.append('lgpassword', password);
  loginParams.append('lgtoken', loginToken);
  loginParams.append('format', 'json');

  const loginHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookies,
  };
  if (config.proxySecret) {
    loginHeaders['X-Proxy-Secret'] = config.proxySecret;
  }

  let loginSuccess = false;
  let loginErrorReason = '';
  let loginRes;

  try {
    loginRes = await fetch(apiUrl, {
      method: 'POST',
      headers: loginHeaders,
      body: loginParams.toString(),
    });
    loginSuccess = loginRes.ok;
    if (!loginRes.ok) {
      loginErrorReason = `HTTP ${loginRes.status}`;
    } else {
      const data = await loginRes.clone().json() as any;
      if (data?.login?.result !== 'Success') {
        loginSuccess = false;
        loginErrorReason = data?.login?.reason || data?.login?.result;
      }
    }
  } catch (e: any) {
    loginErrorReason = e.message;
    throw e;
  } finally {
    if (config.kvState) {
      await logApiCall(config.kvState, 'Submit Bot Credentials', 'POST', apiUrl, loginSuccess, loginErrorReason);
    }
  }

  if (!loginRes.ok) {
    const errorText = await loginRes.text().catch(() => '');
    throw new Error(`Bot credentials submission failed (HTTP ${loginRes.status}): ${errorText}`);
  }

  const loginData = await loginRes.json() as any;
  if (loginData?.login?.result !== 'Success') {
    throw new Error(`Wiki login failed: ${loginData?.login?.reason || loginData?.login?.result || JSON.stringify(loginData)}`);
  }

  // Append new cookies from login response
  let loginCookies = '';
  if (typeof (loginRes.headers as any).getSetCookie === 'function') {
    loginCookies = (loginRes.headers as any).getSetCookie()
      .map((c: string) => c.split(';')[0])
      .join('; ');
  } else {
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) loginCookies = setCookie.split(';')[0];
  }
  cookies = [cookies, loginCookies].filter(Boolean).join('; ');

  // Step 3: Get CSRF Token
  const csrfUrl = `${apiUrl}?action=query&meta=tokens&type=csrf&format=json`;
  const csrfHeaders: Record<string, string> = {
    'Cookie': cookies,
  };
  if (config.proxySecret) {
    csrfHeaders['X-Proxy-Secret'] = config.proxySecret;
  }

  let csrfSuccess = false;
  let csrfErrorReason = '';
  let csrfRes;

  try {
    csrfRes = await fetch(csrfUrl, {
      headers: csrfHeaders
    });
    csrfSuccess = csrfRes.ok;
    if (!csrfRes.ok) {
      csrfErrorReason = `HTTP ${csrfRes.status}`;
    }
  } catch (e: any) {
    csrfErrorReason = e.message;
    throw e;
  } finally {
    if (config.kvState) {
      await logApiCall(config.kvState, 'Get CSRF Token', 'GET', csrfUrl, csrfSuccess, csrfErrorReason);
    }
  }

  if (!csrfRes.ok) {
    const errorText = await csrfRes.text().catch(() => '');
    throw new Error(`Get CSRF token request failed (HTTP ${csrfRes.status}): ${errorText}`);
  }

  const csrfData = await csrfRes.json() as any;
  const csrfToken = csrfData?.query?.tokens?.csrftoken;
  if (!csrfToken) {
    throw new Error(`CSRF token not found in MediaWiki response. Response: ${JSON.stringify(csrfData)}`);
  }

  return { 
    cookies, 
    csrfToken, 
    proxySecret: config.proxySecret, 
    kvState: config.kvState 
  };
}

export interface WikiPageContent {
  exists: boolean;
  content: string;
  pageId: number;
}

// Fetch the page content
export async function getPageContent(
  domain: string,
  title: string,
  cookies?: string,
  apiEndpoint?: string,
  proxySecret?: string,
  _kvState?: any
): Promise<WikiPageContent> {
  const apiUrl = getApiUrl(domain, apiEndpoint);
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    titles: title,
    rvprop: 'content',
    format: 'json',
  });

  const headers: Record<string, string> = {};
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  if (proxySecret) {
    headers['X-Proxy-Secret'] = proxySecret;
  }

  const res = await fetchWithSameHostRedirects(`${apiUrl}?${params.toString()}`, { headers });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Get page content request failed (HTTP ${res.status}): ${errorText}`);
  }

  const data = await res.json() as any;
  const pages = data?.query?.pages;
  if (!pages) {
    return { exists: false, content: '', pageId: -1 };
  }

  const pageId = Object.keys(pages)[0];
  if (pageId === '-1') {
    return { exists: false, content: '', pageId: -1 };
  }

  const page = pages[pageId];
  const content = page?.revisions?.[0]?.['*'] || '';

  return { exists: true, content, pageId: parseInt(pageId, 10) };
}

// Edit a wiki page (whole page or section replacement)
export async function editPage(
  domain: string,
  session: WikiSession,
  title: string,
  text: string,
  summary: string,
  apiEndpoint?: string
): Promise<void> {
  if (session.kvState && await isEditBlocked(session.kvState, title)) {
    throw new EditBlockedError(title, MAX_EDIT_FAILURES);
  }

  const apiUrl = getApiUrl(domain, apiEndpoint);
  const editParams = new URLSearchParams();
  editParams.append('action', 'edit');
  editParams.append('title', title);
  editParams.append('text', text);
  const plug = '(https://christran.io/f1)';
  const fullSummary = summary.includes('https://christran.io/f1') ? summary : `${summary} ${plug}`;
  editParams.append('summary', fullSummary);
  editParams.append('token', session.csrfToken);
  editParams.append('format', 'json');
  editParams.append('bot', '1'); // mark as bot edit

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': session.cookies,
  };
  if (session.proxySecret) {
    headers['X-Proxy-Secret'] = session.proxySecret;
  }

  let success = false;
  let errorReason = '';
  let res;

  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: editParams.toString(),
    });
    success = res.ok;
    if (!res.ok) {
      errorReason = `HTTP ${res.status}`;
    } else {
      const editData = await res.clone().json() as any;
      if (editData?.edit?.result !== 'Success') {
        success = false;
        errorReason = editData?.edit?.reason || JSON.stringify(editData?.error || editData?.edit);
      }
    }
  } catch (e: any) {
    errorReason = e.message;
    throw e;
  } finally {
    if (session.kvState) {
      await logApiCall(session.kvState, `Edit Page: ${title}`, 'POST', apiUrl, success, errorReason);
      if (success) {
        await clearEditFailures(session.kvState, title);
      } else {
        await recordEditFailure(session.kvState, title);
      }
    }
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Edit page request failed (HTTP ${res.status}): ${errorText}`);
  }

  const editData = await res.json() as any;
  if (editData?.edit?.result !== 'Success') {
    throw new Error(`Wiki edit failed: ${editData?.edit?.reason || JSON.stringify(editData?.error || editData?.edit)}`);
  }
}

/**
 * Attempt a wiki edit, retry once after 10s on failure, then optionally persist
 * the full edit payload to KV for an immediate replay on the next cron run.
 */
export async function editPageWithRetry(
  domain: string,
  session: WikiSession,
  title: string,
  text: string,
  summary: string,
  apiEndpoint?: string,
  options?: EditPageRetryOptions
): Promise<WikiEditResult> {
  const persistOnFailure = options?.persistOnFailure ?? !!session.kvState;

  try {
    await editPage(domain, session, title, text, summary, apiEndpoint);
    return 'published';
  } catch (firstError: any) {
    if (firstError instanceof EditBlockedError) {
      throw firstError;
    }

    console.warn(
      `Edit failed for "${title}" (${firstError?.message || firstError}). Retrying in ${(options?.retryDelayMs ?? WIKI_EDIT_RETRY_DELAY_MS) / 1000}s...`
    );
    await sleep(options?.retryDelayMs ?? WIKI_EDIT_RETRY_DELAY_MS);

    try {
      await editPage(domain, session, title, text, summary, apiEndpoint);
      return 'published';
    } catch (secondError: any) {
      if (secondError instanceof EditBlockedError) {
        throw secondError;
      }

      console.error(
        `Edit failed again for "${title}" (${secondError?.message || secondError}).`
      );

      if (persistOnFailure && session.kvState) {
        await savePendingWikiEdit(session.kvState, {
          title,
          text,
          summary,
          domain,
          apiEndpoint: apiEndpoint ?? null,
          gpRound: options?.meta?.gpRound,
          gpSections: options?.meta?.gpSections,
          syncKeys: options?.meta?.syncKeys,
          savedAt: new Date().toISOString(),
        });
        // Pending KV replay is the durable retry path — don't let the short
        // consecutive-failure circuit breaker block future cron replays.
        await clearEditFailures(session.kvState, title);
        return 'deferred';
      }

      throw secondError;
    }
  }
}

export function replaceSectionWikitext(fullText: string, header: string, newContent: string): string {
  const cleanHeader = header.trim();
  const strippedContent = stripLeadingHeadingFromContent(newContent);
  const lines = splitLines(fullText);
  const ranges = findSectionRanges(fullText, cleanHeader);

  if (ranges.length === 0) {
    return `${fullText.trim()}\n\n${cleanHeader}\n${strippedContent}\n`;
  }

  let result: string[] = [];
  let cursor = 0;

  for (let i = 0; i < ranges.length; i++) {
    const { startLine, endLine, headingLine } = ranges[i];
    result.push(...lines.slice(cursor, startLine));

    if (i === 0) {
      result.push(headingLine, strippedContent, '');
    } else {
      console.log(`Removing duplicate section heading: "${headingLine.trim()}"`);
    }

    cursor = endLine;
  }

  result.push(...lines.slice(cursor));
  return result.join('\n');
}

export function getSectionContent(fullText: string, header: string): string {
  const ranges = findSectionRanges(fullText, header.trim());
  if (ranges.length === 0) return '';

  const lines = splitLines(fullText);
  const { startLine, endLine } = ranges[0];
  return lines.slice(startLine + 1, endLine).join('\n');
}

export function isSectionEmptyOrPlaceholder(sectionContent: string): boolean {
  let text = stripWikiComments(sectionContent);
  text = stripWikiTemplates(text);
  text = text.replace(/Images and Videos:\s*/gi, '');
  text = text.replace(/References:\s*/gi, '');
  text = text.replace(/<references\s*\/>/gi, '');
  text = text.trim();

  if (text === '' || text.toLowerCase() === 'tba' || text.toLowerCase() === 'tbd') {
    return true;
  }

  return false;
}

