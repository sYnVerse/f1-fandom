/**
 * Tests for stint-aware Career Results GP templates and Points splits.
 * Run: npx tsx scripts/verify-career-stint.ts
 */
import { parseTeamDriversRegistry } from '../src/team-drivers-registry';
import {
  buildStintSwitchKey,
  buildCareerPointsRows,
  mergeCareerResultsGpTemplate,
  mergeCareerPointsWikitext,
  generateStintAwareWikiResultsText,
  CAREER_RESULTS_MANUAL_MARKER,
  parseCareerResultsSwitchRows,
} from '../src/career-results-stint';
import { RaceResult } from '../src/f1-api';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const TEAM_DRIVERS_2026 = `{{#switch:{{{1}}}
|Red Bull driver1=Max Verstappen
|Red Bull driver2=Isack Hadjar
|Red Bull driver3=Liam Lawson3
|Racing Bulls driver1=Liam Lawson2
|Racing Bulls driver2=Arvid Lindblad
|Racing Bulls driver3=Yuki Tsunoda
|Ferrari driver1=Charles Leclerc
|Ferrari driver2=Lewis Hamilton
}}`;

const registry = parseTeamDriversRegistry(2026, TEAM_DRIVERS_2026);

assert(registry.stints.length === 8, 'Should parse 8 driver slots');
assert(
  buildStintSwitchKey(registry, 'lawson', 'rb') === 'Liam Lawson|Liam Lawson2',
  'Lawson at RB should use pipe alias with Lawson2'
);
assert(
  buildStintSwitchKey(registry, 'lawson', 'red_bull') === 'Liam Lawson|Liam Lawson3',
  'Lawson at Red Bull should use pipe alias with Lawson3'
);
assert(
  buildStintSwitchKey(registry, 'max_verstappen', 'red_bull') === 'Max Verstappen',
  'Verstappen should use plain canonical name'
);

function makeResult(
  driverId: string,
  givenName: string,
  familyName: string,
  constructorId: string,
  position: string,
  points: string
): RaceResult {
  return {
    number: '1',
    position,
    positionText: position,
    grid: '5',
    points,
    laps: '72',
    status: 'Finished',
    driver: { driverId, givenName, familyName, permanentNumber: '1', code: 'X', url: '', dateOfBirth: '', nationality: '' },
    constructor: { constructorId, url: '', name: constructorId, nationality: '' },
  };
}

const dutchResults: RaceResult[] = [
  makeResult('lawson', 'Liam', 'Lawson', 'red_bull', '7', '6'),
  makeResult('tsunoda', 'Yuki', 'Tsunoda', 'rb', '11', '0'),
  makeResult('norris', 'Lando', 'Norris', 'mclaren', '1', '25'),
];

const dutchGenerated = generateStintAwareWikiResultsText(dutchResults, registry);
assert(
  dutchGenerated.includes('|Liam Lawson|Liam Lawson3'),
  'Dutch GP should include Lawson3 pipe alias row'
);
assert(dutchGenerated.includes('{{7th}}'), 'Dutch GP should include Lawson P7 result');
assert(dutchGenerated.includes('Yuki Tsunoda'), 'Dutch GP should include Tsunoda');
assert(
  !dutchGenerated.match(/^\|Liam Lawson\s+=/m),
  'Dutch GP should not include standalone Liam Lawson row'
);

const belgianResults: RaceResult[] = [
  makeResult('lawson', 'Liam', 'Lawson', 'rb', '5', '10'),
];
const belgianGenerated = generateStintAwareWikiResultsText(belgianResults, registry);
assert(
  belgianGenerated.includes('|Liam Lawson|Liam Lawson2'),
  'RB race should use Lawson2 pipe alias'
);

const existingWithManual = `{{#switch:{{{1}}}
|Isack Hadjar           = {{Inj}} ${CAREER_RESULTS_MANUAL_MARKER}
|Liam Lawson2           = {{7th}}
|#default = 
}}<noinclude>[[Category:2026 Results Templates]]</noinclude>`;

const merged = mergeCareerResultsGpTemplate(existingWithManual, dutchGenerated);
assert(merged.changed, 'Merge should update stint alias rows');
assert(
  merged.wikitext.includes('{{Inj}}') && merged.wikitext.includes(CAREER_RESULTS_MANUAL_MARKER),
  'Manual Hadjar {{Inj}} row must be preserved'
);
assert(
  merged.wikitext.includes('|Liam Lawson|Liam Lawson3'),
  'Merged output should upgrade to Lawson3 pipe alias'
);

const parsedManual = parseCareerResultsSwitchRows(merged.wikitext);
assert(parsedManual.get('Isack Hadjar')?.isManual === true, 'Hadjar row should stay manual');

const seasonResults: RaceResult[] = [
  makeResult('lawson', 'Liam', 'Lawson', 'rb', '5', '10'),
  makeResult('lawson', 'Liam', 'Lawson', 'rb', '8', '4'),
  ...dutchResults.filter(r => r.driver.driverId === 'lawson'),
];

const standings = [
  {
    position: '9',
    positionText: '9',
    points: '49',
    wins: '0',
    Driver: { driverId: 'lawson', givenName: 'Liam', familyName: 'Lawson', permanentNumber: '30', code: 'LAW', url: '', dateOfBirth: '', nationality: '' },
    Constructors: [{ constructorId: 'rb', url: '', name: 'RB', nationality: '' }],
  },
  {
    position: '20',
    positionText: '20',
    points: '0',
    wins: '0',
    Driver: { driverId: 'tsunoda', givenName: 'Yuki', familyName: 'Tsunoda', permanentNumber: '22', code: 'TSU', url: '', dateOfBirth: '', nationality: '' },
    Constructors: [{ constructorId: 'rb', url: '', name: 'RB', nationality: '' }],
  },
];

const pointsRows = buildCareerPointsRows(standings as any, registry, seasonResults);
assert(pointsRows.get('Liam Lawson') === '49', 'Canonical Lawson points = 49');
assert(pointsRows.get('Liam Lawson3') === '6', 'Lawson3 stint points = 6');
assert(pointsRows.get('Liam Lawson2') === '43', 'Lawson2 stint points = 43');
assert(pointsRows.get('Yuki Tsunoda') === '0', 'Tsunoda points from standings');

const existingPoints = `{{#switch:{{{1}}}
|Liam Lawson = 49
|Red Bull offset = 6
|#default = 0
}}<noinclude>[[Category:Career Results Templates]]</noinclude>`;

const pointsMerged = mergeCareerPointsWikitext(existingPoints, pointsRows, ['Liam Lawson', 'Yuki Tsunoda']);
assert(pointsMerged.wikitext.includes('Liam Lawson2'), 'Points merge should add Lawson2');
assert(pointsMerged.wikitext.includes('Liam Lawson3'), 'Points merge should add Lawson3');
assert(
  pointsMerged.wikitext.includes('Red Bull offset'),
  'Legacy offset rows should be preserved when not in generated set'
);

console.log('verify-career-stint: all assertions passed');
