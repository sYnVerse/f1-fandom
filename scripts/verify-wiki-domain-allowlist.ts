/**
 * Verifies assertAllowedWikiDomain / resolveAllowedWikiHosts SSRF guards.
 * Run: npx tsx scripts/verify-wiki-domain-allowlist.ts
 */
import {
  assertAllowedWikiDomain,
  resolveAllowedWikiHosts,
  WikiDomainError,
  DEFAULT_ALLOWED_WIKI_HOSTS,
} from '../src/wiki';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function expectReject(raw: unknown, allowed: ReadonlySet<string>, label: string): void {
  try {
    assertAllowedWikiDomain(raw, allowed);
    throw new Error(`Expected rejection for ${label}, but got allow`);
  } catch (e: any) {
    if (e instanceof WikiDomainError || e?.name === 'WikiDomainError') {
      console.log(`PASS reject: ${label}`);
      return;
    }
    throw e;
  }
}

const allowed = resolveAllowedWikiHosts({
  DEFAULT_WIKI_DOMAIN: 'f1.fandom.com',
});

assert(allowed.has('f1.fandom.com'), 'default host missing');
assert(
  DEFAULT_ALLOWED_WIKI_HOSTS.includes('f1.fandom.com'),
  'DEFAULT_ALLOWED_WIKI_HOSTS should include f1.fandom.com'
);

assert(assertAllowedWikiDomain('f1.fandom.com', allowed) === 'f1.fandom.com', 'bare host');
assert(assertAllowedWikiDomain('https://f1.fandom.com', allowed) === 'f1.fandom.com', 'https URL');
assert(assertAllowedWikiDomain('F1.Fandom.COM', allowed) === 'f1.fandom.com', 'case fold');
console.log('PASS allow: f1.fandom.com variants');

expectReject('example.com', allowed, 'example.com');
expectReject('httpbin.org', allowed, 'httpbin.org');
expectReject('127.0.0.1', allowed, '127.0.0.1');
expectReject('http://127.0.0.1', allowed, 'http://127.0.0.1');
expectReject('https://127.0.0.1', allowed, 'https://127.0.0.1');
expectReject('::1', allowed, '::1');
expectReject('[::1]', allowed, '[::1]');
expectReject('f1.fandom.com.evil.com', allowed, 'suffix lookalike');
expectReject('evil-f1.fandom.com', allowed, 'prefix lookalike');
expectReject('notf1.fandom.com', allowed, 'sibling lookalike');
expectReject('https://user:pass@f1.fandom.com', allowed, 'userinfo');
expectReject('user:pass@f1.fandom.com', allowed, 'userinfo bare');
expectReject('https://f1.fandom.com:443', allowed, 'explicit port');
expectReject('f1.fandom.com:8443', allowed, 'nondefault port');
expectReject('http://f1.fandom.com', allowed, 'http scheme');
expectReject('https://f1.fandom.com/wiki/Main_Page', allowed, 'path');
expectReject('f1.fandom.com/wiki', allowed, 'path bare');
expectReject('https://f1.fandom.com?x=1', allowed, 'query');
expectReject('169.254.169.254', allowed, 'link-local IP');

const withExtra = resolveAllowedWikiHosts({
  ALLOWED_WIKI_HOSTS: 'f1.fandom.com, other.example',
});
assert(withExtra.has('other.example'), 'ALLOWED_WIKI_HOSTS should add hosts');
assert(assertAllowedWikiDomain('other.example', withExtra) === 'other.example', 'env extra host');
console.log('PASS: ALLOWED_WIKI_HOSTS env extension');

console.log('verify-wiki-domain-allowlist: all assertions passed');
