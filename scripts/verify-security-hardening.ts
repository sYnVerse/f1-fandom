/**
 * Dry-run verification for publish guards, practice URL allowlist, and wikitext sanitize.
 * Run: npx tsx scripts/verify-security-hardening.ts
 */
import {
  assertAllowedPracticeSessionUrl,
  assertAllowlistedHostname,
  resolveAllowedWikiHosts,
} from '../src/url-allowlist';
import {
  assertAllowedPublishTitle,
  assertAllowedStatsTemplateNames,
  assertPublishTextSize,
  isAllowedPublishTitle,
  MAX_PUBLISH_WIKITEXT_CHARS,
  resolvePublishCredentials,
} from '../src/publish-guard';
import { sanitizeWikiLinkText } from '../src/wikitext-sanitize';
import { formatDriverWikiLink, getTeamTemplate } from '../src/wikitext-generator';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function expectThrow(fn: () => void, name: string): void {
  try {
    fn();
    throw new Error(`Expected throw for ${name}`);
  } catch (e: any) {
    if (e.message?.startsWith('Expected throw')) throw e;
    console.log(`PASS reject: ${name}`);
  }
}

// --- Practice URL allowlist ---
const goodPractice =
  'https://www.formula1.com/en/results/2026/races/1279/australia/practice/1';
assert(
  assertAllowedPracticeSessionUrl(goodPractice) === goodPractice,
  'good practice URL'
);
console.log('PASS allow practice URL');

expectThrow(() => assertAllowedPracticeSessionUrl('https://example.com/en/results/2026/races/1/x/practice/1'), 'example.com practice');
expectThrow(() => assertAllowedPracticeSessionUrl('https://www.formula1.com.evil.com/en/results/2026/races/1/x/practice/1'), 'suffix lookalike');
expectThrow(() => assertAllowedPracticeSessionUrl('http://www.formula1.com/en/results/2026/races/1/x/practice/1'), 'http practice');
expectThrow(() => assertAllowedPracticeSessionUrl('https://www.formula1.com/en/latest/article/foo'), 'non-practice path');
expectThrow(() => assertAllowedPracticeSessionUrl('https://127.0.0.1/en/results/2026/races/1/x/practice/1'), 'IP practice');

// --- Wiki host (publish domain) ---
const hosts = resolveAllowedWikiHosts({ DEFAULT_WIKI_DOMAIN: 'f1.fandom.com' });
assert(assertAllowlistedHostname('f1.fandom.com', hosts) === 'f1.fandom.com', 'wiki host');
expectThrow(() => assertAllowlistedHostname('example.com', hosts), 'wiki example.com');

// --- Publish titles ---
assert(isAllowedPublishTitle('2026 Australian Grand Prix'), 'GP title');
assert(isAllowedPublishTitle('Template:Stats/Wins'), 'stats title');
assert(isAllowedPublishTitle('User:TestBot/Sandbox'), 'sandbox');
assert(assertAllowedPublishTitle('Template:Latest_Data') === 'Template:Latest_Data', 'latest data');
expectThrow(() => assertAllowedPublishTitle('Main Page'), 'main page');
expectThrow(() => assertAllowedPublishTitle('MediaWiki:Common.js'), 'common.js');
expectThrow(() => assertAllowedPublishTitle('Template:Stats/../../Main Page'), 'path trick');

assertAllowedStatsTemplateNames(['Wins', 'Poles']);
expectThrow(() => assertAllowedStatsTemplateNames(['NotARealTemplate']), 'bad stats name');

assertPublishTextSize('hello');
expectThrow(() => assertPublishTextSize('x'.repeat(MAX_PUBLISH_WIKITEXT_CHARS + 1)), 'oversized text');

// Credentials: must match configured bot when secrets set
const matched = resolvePublishCredentials(
  { WIKI_BOT_USERNAME: 'Bot', WIKI_BOT_PASSWORD: 'secret', DEFAULT_WIKI_DOMAIN: 'f1.fandom.com' },
  { domain: 'f1.fandom.com', username: 'Bot', password: 'secret' }
);
assert(matched.username === 'Bot', 'matched bot user');
expectThrow(
  () =>
    resolvePublishCredentials(
      { WIKI_BOT_USERNAME: 'Bot', WIKI_BOT_PASSWORD: 'secret', DEFAULT_WIKI_DOMAIN: 'f1.fandom.com' },
      { domain: 'f1.fandom.com', username: 'Other', password: 'secret' }
    ),
  'mismatched bot user'
);
expectThrow(
  () =>
    resolvePublishCredentials(
      {
        WIKI_BOT_USERNAME: 'Bot',
        WIKI_BOT_PASSWORD: 'secret',
        DASHBOARD_OWNER_TOKEN: 'owner-secret',
        DEFAULT_WIKI_DOMAIN: 'f1.fandom.com',
      },
      { domain: 'f1.fandom.com', username: 'Bot', password: 'secret' }
    ),
  'missing owner token'
);

// --- Wikitext sanitize ---
assert(!sanitizeWikiLinkText('A[[B]]C').includes('['), 'link strip brackets');
const poisoned = getTeamTemplate('unknown_team', 'Foo}}{{Script');
assert(poisoned === '{{FooScript-CON}}', `team template sanitized: ${poisoned}`);
const link = formatDriverWikiLink('Max]]', '{{Verstappen}}', 'Dutch');
assert(link === '{{NED}} [[Max Verstappen]]', `driver link sanitized: ${link}`);
console.log('PASS wikitext sanitize');

console.log('verify-security-hardening: all assertions passed');
