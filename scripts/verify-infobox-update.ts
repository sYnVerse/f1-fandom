/**
 * Verifies infobox parameter parsing does not break on }} inside template values.
 * Run: npx tsx scripts/verify-infobox-update.ts
 */
import {
  updateParameterInInfobox,
  getInfoboxParameterValue,
  isInfoboxParameterEmpty,
  isInfoboxSyncComplete,
} from '../src/index';

const sampleInfobox = `{{Infobox_Race
| pole = George Russell
| polenation = GBR
| poleteam = {{GER}} {{Mercedes-CON}}
| poletime = 1:06.113
| fastestlap =
}}`;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// 1. Reading existing value with nested templates
const poleteam = getInfoboxParameterValue(sampleInfobox, 'poleteam');
assert(poleteam === '{{GER}} {{Mercedes-CON}}', `Expected full poleteam, got: ${poleteam}`);
assert(!isInfoboxParameterEmpty(poleteam), 'poleteam should not be empty');

// 2. Updating empty field works
const withWinner = updateParameterInInfobox(sampleInfobox, 'winner', 'Max Verstappen');
assert(
  getInfoboxParameterValue(withWinner, 'winner') === 'Max Verstappen',
  'Should add winner to empty field'
);

// 3. Updating populated field with same regex path must not corrupt poleteam
const corruptedAttempt = updateParameterInInfobox(sampleInfobox, 'poleteam', '{{Mercedes-CON}}');
assert(
  getInfoboxParameterValue(corruptedAttempt, 'poleteam') === '{{Mercedes-CON}}',
  `poleteam replace should be clean, got: ${getInfoboxParameterValue(corruptedAttempt, 'poleteam')}`
);
assert(
  !corruptedAttempt.includes('}}}}'),
  `Should not contain quadruple braces: ${corruptedAttempt}`
);

// 4. Reproduce exact bug from screenshot: old regex would produce }}}}/duplicate
const afterBadReplace = updateParameterInInfobox(sampleInfobox, 'poleteam', '{{Mercedes-CON}}');
assert(
  afterBadReplace.includes('| poleteam = {{Mercedes-CON}}'),
  'Single clean replacement expected'
);
assert(
  !afterBadReplace.includes('{{Mercedes-CON}}}}'),
  'Must not leave orphan braces from partial match'
);

// 5. Sync flag should not be set when race winner is still empty
const poleOnlyInfobox = `{{Infobox_Race
| pole = George Russell
| polenation = GBR
| poleteam = {{GER}} {{Mercedes-CON}}
| winner =
| second =
| third =
}}`;
assert(
  !isInfoboxSyncComplete(poleOnlyInfobox, { hasQualiData: true, hasSprintData: false, hasRaceData: true }),
  'Infobox with pole but no winner must not be considered sync-complete when race data exists'
);
assert(
  !isInfoboxSyncComplete(poleOnlyInfobox, { hasQualiData: true, hasSprintData: false, hasRaceData: false }),
  'Infobox must not be sync-complete when race results are not yet available'
);

const completeInfobox = updateParameterInInfobox(poleOnlyInfobox, 'winner', 'Max Verstappen');
assert(
  isInfoboxSyncComplete(completeInfobox, { hasQualiData: true, hasSprintData: false, hasRaceData: true }),
  'Infobox with pole and winner should be sync-complete when race data exists'
);

console.log('PASS: infobox parameter read/update with template values');
console.log('All infobox verification tests passed.');
