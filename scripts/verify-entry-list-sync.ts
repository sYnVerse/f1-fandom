/**
 * Verifies entry list syncing and PDF test driver detection.
 * Run: npx tsx scripts/verify-entry-list-sync.ts
 */
import {
  detectTestDriversFromPdf,
  updateEntryListTableIfNeeded,
  extractEntryListTable
} from '../src/wikitext-generator';
import { Driver } from '../src/f1-api';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const mainDrivers: Driver[] = [
  {
    driverId: 'norris',
    givenName: 'Lando',
    familyName: 'Norris',
    permanentNumber: '4',
    nationality: 'British',
    code: 'NOR',
  },
  {
    driverId: 'piastri',
    givenName: 'Oscar',
    familyName: 'Piastri',
    permanentNumber: '81',
    nationality: 'Australian',
    code: 'PIA',
  }
];

// --- 1. Test PDF Detection ---
const mockPdfText = `
FIA FORMULA ONE WORLD CHAMPIONSHIP
2026 Spanish Grand Prix - Entry List
No. Driver Team
4 Lando Norris McLaren Mastercard F1 Team
81 Oscar Piastri McLaren Mastercard F1 Team
34 Felipe Drugovich Aston Martin Aramco F1 Team
`;

const pdfTestDrivers = detectTestDriversFromPdf(mockPdfText, mainDrivers);
assert(pdfTestDrivers.length === 1, `Expected 1 test driver, got ${pdfTestDrivers.length}`);
assert(pdfTestDrivers[0].name === 'Felipe Drugovich', `Expected Felipe Drugovich, got ${pdfTestDrivers[0].name}`);
assert(pdfTestDrivers[0].number === '34', `Expected number 34, got ${pdfTestDrivers[0].number}`);
assert(pdfTestDrivers[0].constructorId === 'aston_martin', `Expected constructorId aston_martin, got ${pdfTestDrivers[0].constructorId}`);
assert(pdfTestDrivers[0].flag === '{{BRA}}', `Expected flag {{BRA}}, got ${pdfTestDrivers[0].flag}`);

// --- 2. Test PDF Detection rejects name-only mentions without entry row ---
const mockPdfTextWithOnlyName = `
Some random text containing Felipe Drugovich but no number or team.
`;
const pdfTestDriversFallback = detectTestDriversFromPdf(mockPdfTextWithOnlyName, mainDrivers);
assert(pdfTestDriversFallback.length === 0, `Expected 0 test drivers without entry row, got ${pdfTestDriversFallback.length}`);

// O'Ward mentioned in PDF notes but not as an entry row should not be detected
const mockPdfTextOwardMentionOnly = `
4 Lando Norris McLaren Mastercard F1 Team
81 Oscar Piastri McLaren Mastercard F1 Team
Reserve driver: Pato O'Ward (McLaren)
`;
const pdfTestDriversOward = detectTestDriversFromPdf(mockPdfTextOwardMentionOnly, mainDrivers);
assert(pdfTestDriversOward.length === 0, `Expected 0 test drivers for O'Ward mention without entry row, got ${pdfTestDriversOward.length}`);

// --- 3. Test Entry List Update (New or Modified details) ---
const existingWikiPage = `
==Background==
===Entry List===
The full entry list:
{| class="wikitable"
!<span title="Car number">No.</span>
!Driver
!Entrant
!Constructor
!Chassis
!Engine
!Model
!Tyre
|-
!4
|{{GBR}} [[Lando Norris]]
|{{GBR}} [[McLaren|Old Team Name]]
|{{McLaren-CON}}
|[[McLaren MCL40|MCL40]]
|{{Mercedes-ENG}}
|[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]
|{{Pirelli}}
|-
!81
|{{AUS}} [[Oscar Piastri]]
|{{GBR}} [[McLaren|McLaren Mastercard F1 Team]]
|{{McLaren-CON}}
|[[McLaren MCL40|MCL40]]
|{{Mercedes-ENG}}
|[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]
|{{Pirelli}}
|-
! colspan="8" align="center" |Source: [https://fia.com source.pdf]
|}
==Practice Overview==
`;

const updateResult = updateEntryListTableIfNeeded(existingWikiPage, mainDrivers, pdfTestDrivers);
assert(updateResult.changed === true, 'Entry list table should have been updated because Norris team name differed');
assert(updateResult.updatedWikitext.includes('McLaren Mastercard F1 Team'), 'Should have corrected Lando Norris entrant');
assert(updateResult.updatedWikitext.includes('[[Felipe Drugovich]]'), 'Should have added Felipe Drugovich');
assert(updateResult.updatedWikitext.includes('!|colspan="8" | [[Test Driver]]s for [[#FP1|Practice 1]]'), 'Should have inserted test driver section header with ! prefix');
assert(updateResult.updatedWikitext.includes('Source: [https://fia.com source.pdf]'), 'Should have preserved original source row');

// Verify we don't change it if we run it again
const runAgain = updateEntryListTableIfNeeded(updateResult.updatedWikitext, mainDrivers, pdfTestDrivers);
assert(runAgain.changed === false, 'Running it again should detect no changes');

// --- 4. Test Preserving Existing Test Drivers ---
const wikiPageWithTestDrivers = `
==Background==
===Entry List===
{| class="wikitable"
!<span title="Car number">No.</span>
!Driver
!Entrant
!Constructor
!Chassis
!Engine
!Model
!Tyre
|-
!4
|{{GBR}} [[Lando Norris]]
|{{GBR}} [[McLaren|McLaren Mastercard F1 Team]]
|{{McLaren-CON}}
|[[McLaren MCL40|MCL40]]
|{{Mercedes-ENG}}
|[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]
|{{Pirelli}}
|-
!81
|{{AUS}} [[Oscar Piastri]]
|{{GBR}} [[McLaren|McLaren Mastercard F1 Team]]
|{{McLaren-CON}}
|[[McLaren MCL40|MCL40]]
|{{Mercedes-ENG}}
|[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]
|{{Pirelli}}
|-
!|colspan="8" | [[Test Driver]]s for [[#FP1|Practice 1]]
|-
!98
|{{MEX}} [[Patricio O'Ward]]
|{{GBR}} [[McLaren|McLaren Mastercard F1 Team]]
|{{McLaren-CON}}
|[[McLaren MCL40|MCL40]]
|{{Mercedes-ENG}}
|[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]
|{{Pirelli}}
|-
! colspan="8" align="center" |Source: [https://fia.com source.pdf]
|}
`;

const testDrivers2 = [{
  number: '34',
  name: 'Felipe Drugovich',
  flag: '{{BRA}}',
  constructorId: 'aston_martin'
}];

const updateWithBoth = updateEntryListTableIfNeeded(wikiPageWithTestDrivers, mainDrivers, testDrivers2);
assert(updateWithBoth.changed === true, 'Should update to add Felipe Drugovich');
assert(updateWithBoth.updatedWikitext.includes('Patricio O\'Ward'), 'Should have preserved Patricio O\'Ward');
assert(updateWithBoth.updatedWikitext.includes('Felipe Drugovich'), 'Should have added Felipe Drugovich');

console.log('PASS: Entry list verification and PDF test driver detection tests.');
