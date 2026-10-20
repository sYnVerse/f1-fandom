/**
 * Sanitize untrusted API strings before interpolating into wikitext.
 * Strips markup-significant characters while preserving normal names/times.
 */

const DEFAULT_MAX = 120;

/** Remove HTML tags and wikitext-significant punctuation from plain fields. */
export function sanitizeWikiPlain(value: unknown, maxLen = DEFAULT_MAX): string {
  let s = String(value ?? '');
  // Strip tags iteratively to avoid broken markup leftovers
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
  }
  // Drop any remaining angle brackets (CodeQL: incomplete multi-char sanitization).
  s = s.replace(/</g, '').replace(/>/g, '');
  s = s
    .replace(/[\[\]{}|]/g, '')
    .replace(/[']{2,}/g, "'")
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trim();
  return s;
}

/** Safe display/link text for driver or constructor names used inside [[...]]. */
export function sanitizeWikiLinkText(value: unknown): string {
  return sanitizeWikiPlain(value, 80);
}

/**
 * Constructor name fragment for unknown-ID fallback `{{Name-CON}}`.
 * Allows letters/numbers/spaces/hyphens only.
 */
export function sanitizeConstructorTemplateName(value: unknown): string {
  const plain = sanitizeWikiPlain(value, 60);
  const cleaned = plain.replace(/[^\w\s\-]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Lap times / status fragments shown in tables.
 * Strict allowlist only — no tag-stripping regex (avoids incomplete sanitization).
 * Keeps letters, digits, space, and : . + - ( ) %.
 */
export function sanitizeWikiTimeOrStatus(value: unknown): string {
  const s = String(value ?? '')
    .replace(/[^A-Za-z0-9 :.+\-()%]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.slice(0, 40);
}

/** Car numbers and similar short numeric codes. */
export function sanitizeWikiNumber(value: unknown): string {
  const s = String(value ?? '').replace(/[^\dA-Za-z\-]/g, '').slice(0, 8);
  return s;
}
