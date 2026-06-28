/**
 * Verifies practice session scraping helpers, wikitext generation, and test driver entry list logic.
 * Run: npx tsx scripts/verify-practice-sessions.ts
 */
import { buildPracticeSessionUrl, getF1comRaceId } from '../src/f1-api';
import {
  addTestDriversToEntryList,
  detectTestDriversFromFp1,
  findEntryListHeadingIndex,
  generatePracticeWikitext,
  resolveDriverTeamTemplate,
} from '../src/wikitext-generator';
import { gpPageSectionRequired } from '../src/sync-kv';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// --- 2026 F1.com race ID resolution ---
assert(getF1comRaceId(2026, 1) === '1279', 'Round 1 Australia = 1279');
assert(getF1comRaceId(2026, 3) === '1281', 'Round 3 Japan = 1281');
assert(getF1comRaceId(2026, 4) === '1284', 'Round 4 Miami = 1284');
assert(getF1comRaceId(2026, 8) === '1288', 'Round 8 Austria = 1288');

const fp1Url = buildPracticeSessionUrl(2026, 8, 'Austrian Grand Prix', 1);
assert(
  fp1Url === 'https://www.formula1.com/en/results/2026/races/1288/austrian-grand-prix/practice/1',
  `Unexpected practice URL: ${fp1Url}`
);

// --- GP page section required states for practice ---
const sprintTiming = {
  hasSprint: true,
  isQualiConcluded: false,
  isSprintConcluded: false,
  isRaceConcluded: false,
  isFp1Concluded: true,
  isFp2Concluded: true,
  isFp3Concluded: true,
};

assert(gpPageSectionRequired('practice_results_fp1', sprintTiming), 'FP1 required on sprint weekend');
assert(gpPageSectionRequired('fp1_report', sprintTiming), 'FP1 report required on sprint weekend');
assert(!gpPageSectionRequired('practice_results_fp2', sprintTiming), 'FP2 not required on sprint weekend');
assert(!gpPageSectionRequired('practice_results_fp3', sprintTiming), 'FP3 not required on sprint weekend');

const normalTiming = { ...sprintTiming, hasSprint: false };
assert(gpPageSectionRequired('practice_results_fp2', normalTiming), 'FP2 required on normal weekend');
assert(gpPageSectionRequired('practice_results_fp3', normalTiming), 'FP3 required on normal weekend');

// --- Test driver detection ---
const mainDrivers = [
  {
    driverId: 'norris',
    givenName: 'Lando',
    familyName: 'Norris',
    permanentNumber: '4',
    nationality: 'British',
    code: 'NOR',
  },
];

const fp1WithTestDriver = {
  'Lando Norris': {
    position: '1',
    number: '4',
    driverName: 'Lando Norris',
    teamName: 'McLaren',
    time: '1:23.456',
  },
  'Patricio O Ward': {
    position: '12',
    number: '98',
    driverName: 'Patricio O Ward',
    teamName: 'McLaren',
    time: '1:25.123',
  },
};

const testDrivers = detectTestDriversFromFp1(mainDrivers as any, fp1WithTestDriver);
assert(testDrivers.length === 1, 'Should detect one test driver');
assert(testDrivers[0].name === 'Patricio O Ward', 'Test driver name');
assert(testDrivers[0].constructorId === 'mclaren', 'Test driver team mapping');
assert(testDrivers[0].flag === '{{MEX}}', 'Test driver nationality flag');

// --- Entry list heading lookup (ReDoS-safe indexOf) ---
const entryListPage = `===Entry List===
{| class="wikitable"
!No.
|-
! colspan="8" align="center" |'''Source''': ref
|}`;

assert(findEntryListHeadingIndex(entryListPage) === 0, 'Should find ==Entry List==');
assert(findEntryListHeadingIndex('== Entry List ==\ncontent') === 0, 'Should find spaced variant');

const withTestDriverRows = addTestDriversToEntryList(entryListPage, testDrivers);
assert(withTestDriverRows.includes('[[Test Driver]]s for [[#FP1|Practice 1]]'), 'Test driver header row');
assert(withTestDriverRows.includes('[[Patricio O Ward]]'), 'Test driver name in entry list');
assert(withTestDriverRows.indexOf('[[Test Driver]]') < withTestDriverRows.indexOf("'''Source'''"), 'Inserted before source row');

const unchanged = addTestDriversToEntryList(withTestDriverRows, testDrivers);
assert(unchanged === withTestDriverRows, 'Should not duplicate existing test drivers');

// --- Practice wikitext sprint vs normal weekend ---
const practiceWikitextSprint = generatePracticeWikitext(
  mainDrivers as any,
  null,
  fp1WithTestDriver,
  null,
  null,
  { hasSprint: true }
);
assert(practiceWikitextSprint.includes('|FP1'), 'Sprint weekend includes FP1 column');
assert(!practiceWikitextSprint.includes('|FP2'), 'Sprint weekend excludes FP2 column');
assert(practiceWikitextSprint.includes('[[Patricio O Ward]]'), 'Sprint practice table includes test driver');

const practiceWikitextNormal = generatePracticeWikitext(
  mainDrivers as any,
  null,
  fp1WithTestDriver,
  fp1WithTestDriver,
  null,
  { hasSprint: false }
);
assert(practiceWikitextNormal.includes('|FP2'), 'Normal weekend includes FP2 column');
assert(practiceWikitextNormal.includes('|FP3'), 'Normal weekend includes FP3 column');

// --- Team name fallback without quali results ---
const norrisTeam = resolveDriverTeamTemplate('norris', {});
assert(norrisTeam.includes('McLaren'), `Norris team should use roster fallback, got: ${norrisTeam}`);
assert(!norrisTeam.includes('Team-Placeholder'), 'Roster fallback should not use placeholder');

const qualiMap = { norris: '{{GBR}} {{McLaren-Mercedes}}' };
assert(
  resolveDriverTeamTemplate('norris', qualiMap) === qualiMap.norris,
  'Quali map takes precedence over roster fallback'
);

const practiceWithoutQuali = generatePracticeWikitext(
  mainDrivers as any,
  null,
  fp1WithTestDriver,
  null,
  null,
  { hasSprint: true }
);
assert(
  !practiceWithoutQuali.includes('{{Team-Placeholder}}'),
  'Practice wikitext without quali should use roster team mapping'
);
assert(practiceWithoutQuali.includes('McLaren'), 'Practice table should show McLaren for Norris');

console.log('verify-practice-sessions: all assertions passed');
