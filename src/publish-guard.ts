/**
 * Guards for dashboard wiki publish endpoints: domain/title allowlists,
 * credential binding to configured bot, size limits, and KV rate limiting.
 */
import {
  assertAllowlistedHostname,
  resolveAllowedWikiHosts,
  UrlAllowlistError,
} from './url-allowlist';

export class PublishGuardError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PublishGuardError';
    this.status = status;
  }
}

/** Max wikitext bytes accepted from the dashboard publish APIs. */
export const MAX_PUBLISH_WIKITEXT_CHARS = 500_000;

/** Max dashboard publishes per client IP per rolling hour. */
export const PUBLISH_RATE_LIMIT_PER_HOUR = 40;

const ALLOWED_STATS_TEMPLATES = new Set([
  'Championships',
  'Distance',
  'DistanceLed',
  'Doubles',
  'Entries',
  'FastestLaps',
  'FrontRows',
  'Grand Chelems',
  'HatTricks',
  'Laps',
  'LapsLed',
  'Podiums',
  'Points',
  'Poles',
  'RacesLed',
  'SprintFastestLaps',
  'SprintPodiums',
  'SprintPoles',
  'SprintWins',
  'Starts',
  'Wins',
]);

/**
 * Titles the dashboard bot may edit. Matches cron/dashboard targets:
 * GP pages, Career/Stats/Latest templates, and User:.../Sandbox drafts.
 */
export function isAllowedPublishTitle(title: string): boolean {
  const t = title.trim();
  if (!t || t.length > 300) return false;
  if (/[\n\r\0#<>{}[\]]/.test(t)) return false;

  if (/^\d{4} .+ Grand Prix$/.test(t)) return true;
  if (/^\d{4} .+ Sprint$/.test(t)) return true;

  if (/^Template:Stats\/[A-Za-z0-9 _\-]+$/.test(t)) {
    const name = t.slice('Template:Stats/'.length);
    return ALLOWED_STATS_TEMPLATES.has(name);
  }
  if (/^Template:Career Results\/.+$/.test(t)) return true;
  if (/^Template:Career_Results\/.+$/.test(t)) return true;
  if (t === 'Template:Latest_Data') return true;
  if (/^Template:Latest_F1_News(\/.+)?$/.test(t)) return true;
  if (/^Template:Team Drivers\/\d{4}$/.test(t)) return true;

  // Sandbox drafts only (placeholder: User:Username/Sandbox)
  if (/^User:[^\/\n]+\/Sandbox$/i.test(t)) return true;

  return false;
}

export function assertAllowedPublishTitle(title: unknown): string {
  if (typeof title !== 'string' || !title.trim()) {
    throw new PublishGuardError('Page title is required');
  }
  const t = title.trim();
  if (!isAllowedPublishTitle(t)) {
    throw new PublishGuardError(
      'Page title is not in the allowlist of pages this bot may edit'
    );
  }
  return t;
}

export function assertPublishTextSize(text: unknown): string {
  if (typeof text !== 'string') {
    throw new PublishGuardError('Page text is required');
  }
  if (text.length === 0) {
    throw new PublishGuardError('Page text is required');
  }
  if (text.length > MAX_PUBLISH_WIKITEXT_CHARS) {
    throw new PublishGuardError(
      `Page text exceeds maximum length of ${MAX_PUBLISH_WIKITEXT_CHARS} characters`
    );
  }
  return text;
}

export function assertAllowedStatsTemplateNames(names: unknown): string[] {
  if (!Array.isArray(names) || names.length === 0) {
    throw new PublishGuardError('templatesToUpdate must be a non-empty array');
  }
  if (names.length > ALLOWED_STATS_TEMPLATES.size) {
    throw new PublishGuardError('Too many templates in one request');
  }
  const out: string[] = [];
  for (const n of names) {
    if (typeof n !== 'string' || !ALLOWED_STATS_TEMPLATES.has(n)) {
      throw new PublishGuardError(`Stats template not allowlisted: ${String(n)}`);
    }
    out.push(n);
  }
  return out;
}

export interface PublishCredentialInput {
  domain?: unknown;
  username?: unknown;
  password?: unknown;
  ownerToken?: unknown;
}

export interface ResolvedPublishCredentials {
  domain: string;
  username: string;
  password: string;
}

/**
 * Bind dashboard publishes to the configured bot when secrets exist.
 * - Domain must be allowlisted.
 * - If WIKI_BOT_USERNAME / WIKI_BOT_PASSWORD are set, client credentials must match
 *   (prevents using this Worker as a proxy for arbitrary MediaWiki accounts).
 * - If DASHBOARD_OWNER_TOKEN is set, require a matching ownerToken (optional extra gate).
 * - When bot secrets are unset (local dev), client username/password are still required
 *   but title/domain/size limits still apply.
 */
export function resolvePublishCredentials(
  env: {
    DEFAULT_WIKI_DOMAIN?: string;
    ALLOWED_WIKI_HOSTS?: string;
    WIKI_BOT_USERNAME?: string;
    WIKI_BOT_PASSWORD?: string;
    DASHBOARD_OWNER_TOKEN?: string;
  },
  input: PublishCredentialInput
): ResolvedPublishCredentials {
  if (env.DASHBOARD_OWNER_TOKEN) {
    if (typeof input.ownerToken !== 'string' || input.ownerToken !== env.DASHBOARD_OWNER_TOKEN) {
      throw new PublishGuardError('Owner token required or invalid', 403);
    }
  }

  let domain: string;
  try {
    domain = assertAllowlistedHostname(input.domain, resolveAllowedWikiHosts(env));
  } catch (e: any) {
    if (e instanceof UrlAllowlistError || e?.name === 'UrlAllowlistError') {
      throw new PublishGuardError(e.message, 400);
    }
    throw e;
  }

  const clientUser = typeof input.username === 'string' ? input.username.trim() : '';
  const clientPass = typeof input.password === 'string' ? input.password : '';

  if (env.WIKI_BOT_USERNAME && env.WIKI_BOT_PASSWORD) {
    if (!clientUser || !clientPass) {
      throw new PublishGuardError('Bot username and password required', 401);
    }
    if (clientUser !== env.WIKI_BOT_USERNAME || clientPass !== env.WIKI_BOT_PASSWORD) {
      throw new PublishGuardError(
        'Credentials must match the configured wiki bot account',
        401
      );
    }
    return {
      domain,
      username: env.WIKI_BOT_USERNAME,
      password: env.WIKI_BOT_PASSWORD,
    };
  }

  if (!clientUser || !clientPass) {
    throw new PublishGuardError('Bot username and password required', 401);
  }

  return { domain, username: clientUser, password: clientPass };
}

function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** Simple per-IP hourly publish budget stored in KV (no-op if KV missing). */
export async function enforcePublishRateLimit(
  kv: any,
  request: Request,
  limit = PUBLISH_RATE_LIMIT_PER_HOUR
): Promise<void> {
  if (!kv) return;

  const ip = clientIp(request);
  const hour = new Date().toISOString().slice(0, 13);
  const key = `publish_rate:${hour}:${ip}`;

  let count = 0;
  try {
    const raw = await kv.get(key);
    count = raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return;
  }

  if (count >= limit) {
    throw new PublishGuardError('Publish rate limit exceeded; try again later', 429);
  }

  try {
    await kv.put(key, String(count + 1), { expirationTtl: 3700 });
  } catch {
    // Ignore KV put failures — do not block publishes on accounting errors.
  }
}

export function guardErrorResponse(
  e: any
): { error: string; status: number } | null {
  if (e instanceof PublishGuardError || e?.name === 'PublishGuardError') {
    return { error: e.message, status: e.status || 400 };
  }
  if (e instanceof UrlAllowlistError || e?.name === 'UrlAllowlistError') {
    return { error: e.message, status: 400 };
  }
  return null;
}
