/**
 * Strict https host/URL allowlisting (duplicated pattern for use before the
 * separate wiki-domain SSRF PR merges — keep both implementations compatible).
 */

export class UrlAllowlistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlAllowlistError';
  }
}

function isIpLiteralHostname(hostname: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(':')) return true;
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true;
  return false;
}

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

function parseHttpsUrl(raw: unknown, hostnameOnly: boolean): URL {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new UrlAllowlistError('URL is required');
  }
  const trimmed = raw.trim();
  if (trimmed.includes('@')) {
    throw new UrlAllowlistError('URL must not include userinfo');
  }

  let url: URL;
  try {
    if (/^https:\/\//i.test(trimmed)) {
      url = new URL(trimmed);
    } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      throw new UrlAllowlistError('URL must use https');
    } else if (hostnameOnly) {
      url = new URL(`https://${trimmed}`);
    } else {
      throw new UrlAllowlistError('URL must be an absolute https URL');
    }
  } catch (e: any) {
    if (e instanceof UrlAllowlistError || e?.name === 'UrlAllowlistError') throw e;
    throw new UrlAllowlistError('Invalid URL');
  }

  if (url.protocol !== 'https:') {
    throw new UrlAllowlistError('URL must use https');
  }
  if (url.username || url.password) {
    throw new UrlAllowlistError('URL must not include userinfo');
  }
  if (url.port !== '' || authorityHasExplicitPort(trimmed)) {
    throw new UrlAllowlistError('URL must not include a port');
  }

  let host = url.hostname.toLowerCase();
  if (host.endsWith('.')) host = host.slice(0, -1);

  if (!host || isIpLiteralHostname(host)) {
    throw new UrlAllowlistError('URL must not use an IP address');
  }

  return url;
}

/** Exact-match allowlisted hostname (https only). Returns canonical hostname. */
export function assertAllowlistedHostname(
  raw: unknown,
  allowedHosts: ReadonlySet<string>
): string {
  const url = parseHttpsUrl(raw, true);
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new UrlAllowlistError('Value must be a hostname only');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!allowedHosts.has(host)) {
    throw new UrlAllowlistError('Host is not allowlisted');
  }
  return host;
}

/**
 * Exact-match allowlisted https URL. Returns normalized href.
 * Optional pathPredicate further restricts pathname.
 */
export function assertAllowlistedHttpsUrl(
  raw: unknown,
  allowedHosts: ReadonlySet<string>,
  pathPredicate?: (pathname: string) => boolean
): string {
  const url = parseHttpsUrl(raw, false);
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!allowedHosts.has(host)) {
    throw new UrlAllowlistError('Host is not allowlisted');
  }
  if (url.href.includes('/../') || /\/(?:%2e%2e)(?:\/|$)/i.test(url.href)) {
    throw new UrlAllowlistError('Invalid path');
  }
  if (pathPredicate && !pathPredicate(url.pathname)) {
    throw new UrlAllowlistError('URL path is not allowed');
  }
  return url.href;
}

/** Default F1 Fandom wiki hosts (same source of truth as DEFAULT_WIKI_DOMAIN). */
export const DEFAULT_ALLOWED_WIKI_HOSTS: readonly string[] = ['f1.fandom.com'];

export function resolveAllowedWikiHosts(env?: {
  DEFAULT_WIKI_DOMAIN?: string;
  ALLOWED_WIKI_HOSTS?: string;
}): Set<string> {
  const hosts = new Set<string>(DEFAULT_ALLOWED_WIKI_HOSTS.map((h) => h.toLowerCase()));
  const add = (raw?: string) => {
    if (!raw) return;
    const t = raw.trim().toLowerCase().replace(/\.$/, '');
    if (!t || t.includes('://') || t.includes('/') || t.includes('@') || t.includes(':')) return;
    hosts.add(t);
  };
  add(env?.DEFAULT_WIKI_DOMAIN);
  if (env?.ALLOWED_WIKI_HOSTS) {
    for (const part of env.ALLOWED_WIKI_HOSTS.split(',')) add(part);
  }
  return hosts;
}

/** Official F1.com practice results hosts. */
export const DEFAULT_ALLOWED_PRACTICE_HOSTS: readonly string[] = ['www.formula1.com'];

export function isAllowedPracticePath(pathname: string): boolean {
  // Built by buildPracticeSessionUrl: /en/results/{year}/races/.../practice/{n}
  return (
    pathname.startsWith('/en/results/') &&
    pathname.includes('/practice/') &&
    !pathname.includes('/../')
  );
}

export function assertAllowedPracticeSessionUrl(raw: unknown): string {
  return assertAllowlistedHttpsUrl(
    raw,
    new Set(DEFAULT_ALLOWED_PRACTICE_HOSTS),
    isAllowedPracticePath
  );
}
