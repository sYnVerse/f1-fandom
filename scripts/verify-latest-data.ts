/**
 * Verifies Template:Latest_Data parse/generate and gpnumber increment logic.
 * Run: npx tsx scripts/verify-latest-data.ts
 */
import {
  parseLatestDataTemplate,
  generateLatestDataWikitext,
  computeNextLatestDataValues,
} from '../src/index';
import { latestDataKey } from '../src/sync-kv';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  latestDataKey(10) === '2026_round_10_latest_data_synced',
  'Latest_Data KV key'
);

const sample =
  '{{#switch:{{{1}}}|number = 10|gp = [[2026 Belgian Grand Prix]]|gpnumber = 1159}}<noinclude>{{Documentation}}</noinclude>';

const parsed = parseLatestDataTemplate(sample);
assert(!!parsed, 'Should parse Latest_Data template');
assert(parsed!.number === 10, `Expected number 10, got ${parsed!.number}`);
assert(parsed!.gp === '[[2026 Belgian Grand Prix]]', `Unexpected gp: ${parsed!.gp}`);
assert(parsed!.gpnumber === 1159, `Expected gpnumber 1159, got ${parsed!.gpnumber}`);

const regenerated = generateLatestDataWikitext(parsed!);
assert(
  regenerated === sample,
  `Round-trip wikitext mismatch:\n${regenerated}\nvs\n${sample}`
);

// Already up to date for the same GP
const same = computeNextLatestDataValues(parsed, 2026, 10, 'Belgian Grand Prix');
assert(same.number === 10, 'Same round keeps number');
assert(same.gp === '[[2026 Belgian Grand Prix]]', 'Same round keeps gp link');
assert(same.gpnumber === 1159, 'Same round must not increment gpnumber');

// Next GP in the same season
const next = computeNextLatestDataValues(parsed, 2026, 11, 'Hungarian Grand Prix');
assert(next.number === 11, 'Next round updates number');
assert(next.gp === '[[2026 Hungarian Grand Prix]]', 'Next round updates gp link');
assert(next.gpnumber === 1160, 'gpnumber increments by 1 after one GP');

// Catch-up after missed rounds
const catchUp = computeNextLatestDataValues(parsed, 2026, 12, 'Dutch Grand Prix');
assert(catchUp.number === 12, 'Catch-up updates number');
assert(catchUp.gpnumber === 1161, 'gpnumber increments by round delta (2)');

// Do not rewind when asked for an older round
const older = computeNextLatestDataValues(parsed, 2026, 9, 'British Grand Prix');
assert(older.number === 10, 'Older round must not rewind number');
assert(older.gpnumber === 1159, 'Older round must not change gpnumber');

// Cross-season: increment by 1 when advancing from prior season template
const seasonStart = computeNextLatestDataValues(
  { number: 22, gp: '[[2026 Abu Dhabi Grand Prix]]', gpnumber: 1171 },
  2027,
  1,
  'Australian Grand Prix'
);
assert(seasonStart.number === 1, 'New season resets number to round 1');
assert(seasonStart.gp === '[[2027 Australian Grand Prix]]', 'New season updates gp year');
assert(seasonStart.gpnumber === 1172, 'New season increments historical gpnumber by 1');

assert(parseLatestDataTemplate('not a template') === null, 'Invalid wikitext returns null');

console.log('verify-latest-data: all assertions passed');
