/**
 * Verifies line-based wikitext parsing (CodeQL-safe replacements).
 * Run: npx tsx scripts/verify-wikitext-parse.ts
 */
import { findBestHeader } from '../src/index';
import {
  getSectionContent,
  isSectionEmptyOrPlaceholder,
  replaceSectionWikitext,
} from '../src/wiki';
import { parsePipeParamLine } from '../src/wikitext-parse';
import { normalizeName } from '../src/stats';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const samplePage = `Intro text

=== Qualifying Results ===
{{GER}} {{Mercedes-CON}} pole info
More quali content

== Standings ==
Points table

=== Qualifying Results ===
duplicate section
`;

// 1. replaceSectionWikitext preserves templates with }}
const replaced = replaceSectionWikitext(
  samplePage,
  '=== Qualifying Results ===',
  '=== Qualifying Results ===\nNew quali table\n'
);
assert(replaced.includes('{{GER}} {{Mercedes-CON}}') === false, 'Old content should be replaced');
assert(replaced.includes('New quali table'), 'New content should be present');
assert(!replaced.includes('duplicate section'), 'Duplicate section should be removed');
assert(replaced.includes('== Standings =='), 'Next section should remain');

// 2. getSectionContent reads full section including templates
const section = getSectionContent(samplePage, '=== Qualifying Results ===');
assert(section.includes('{{GER}} {{Mercedes-CON}}'), `Section should include templates, got: ${section}`);

// 3. findBestHeader without dynamic regex on full page
const header = findBestHeader(
  samplePage,
  ['==== Starting Grid ====', '=== Qualifying Results ===', '=== Qualifying ==='],
  '=== Qualifying Results ==='
);
assert(header === '=== Qualifying Results ===', `Expected quali header, got ${header}`);

// 4. isSectionEmptyOrPlaceholder strips nested templates safely
assert(isSectionEmptyOrPlaceholder('{{Weather|{{GER}} temp}}'), 'Template-only section is empty');
assert(!isSectionEmptyOrPlaceholder('Actual race report text here'), 'Text section is not empty');

// 5. parsePipeParamLine handles template values with }}
const line = '| Lewis Hamilton                  = {{#expr: 100 + {{Career Results/Points/2026|{{{1}}}}} }}';
const parsed = parsePipeParamLine(line);
assert(parsed !== null, 'Should parse stats line');
assert(
  parsed!.value.includes('Career Results/Points/2026'),
  `Value should be complete template expression, got: ${parsed!.value}`
);
assert(normalizeName(parsed!.name) === normalizeName('Lewis Hamilton'), 'Name should parse');

console.log('PASS: wikitext line-based parsing verification');
console.log('All wikitext parse verification tests passed.');
