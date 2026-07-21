/**
 * Verifies entry list syncing and PDF test driver detection.
 * Run: npx tsx scripts/verify-entry-list-sync.ts
 */
import {
  detectTestDriversFromPdf,
  detectTestDriversFromJolpica,
  resolveTestDriversForRace,
  updateEntryListTableIfNeeded,
  extractEntryListTable,
  isWeakTestDriverList,
  testDriverEntryCompleteness,
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
No. TLA Driver Nat Team Constructor
4 NOR Lando Norris GBR McLaren Mastercard F1 Team McLaren Mercedes
81 PIA Oscar Piastri AUS McLaren Mastercard F1 Team McLaren Mercedes
In addition to the list of cars and drivers eligible to take part in the event the following drivers may also take part in FP1
134 DRU Felipe Drugovich BRA Aston Martin Aramco F1 Team Aston Martin Aramco Honda
`;

const pdfTestDrivers = detectTestDriversFromPdf(mockPdfText, mainDrivers);
assert(pdfTestDrivers.length === 1, `Expected 1 test driver, got ${pdfTestDrivers.length}`);
assert(pdfTestDrivers[0].name === 'Felipe Drugovich', `Expected Felipe Drugovich, got ${pdfTestDrivers[0].name}`);
assert(pdfTestDrivers[0].number === '34', `Expected number 34, got ${pdfTestDrivers[0].number}`);
assert(pdfTestDrivers[0].constructorId === 'aston_martin', `Expected constructorId aston_martin, got ${pdfTestDrivers[0].constructorId}`);
assert(pdfTestDrivers[0].flag === '{{BRA}}', `Expected flag {{BRA}}, got ${pdfTestDrivers[0].flag}`);

// --- 2. Test PDF Detection rejects name-only mentions without entry row ---
const mockPdfTextWithOnlyName = `
Some random text containing Felipe Drugovich but no TLA row.
`;
const pdfTestDriversFallback = detectTestDriversFromPdf(mockPdfTextWithOnlyName, mainDrivers);
assert(pdfTestDriversFallback.length === 0, `Expected 0 test drivers without entry row, got ${pdfTestDriversFallback.length}`);

// O'Ward mentioned in PDF notes but not as an FP1 entry row should not be detected
const mockPdfTextOwardMentionOnly = `
4 NOR Lando Norris GBR McLaren Mastercard F1 Team McLaren Mercedes
81 PIA Oscar Piastri AUS McLaren Mastercard F1 Team McLaren Mercedes
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
assert(updateResult.updatedWikitext.includes('!colspan="8" | [[Test Driver]]s for [[#FP1|Practice 1]]'), 'Should have inserted test driver section header with ! prefix');
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
!colspan="8" | [[Test Driver]]s for [[#FP1|Practice 1]]
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
assert(!updateWithBoth.updatedWikitext.includes('Patricio O\'Ward'), 'Should remove wiki-only test drivers when authoritative list is provided');
assert(updateWithBoth.updatedWikitext.includes('Felipe Drugovich'), 'Should have added Felipe Drugovich');

// --- 5. Test driver resolution: PDF/FP1 beat Jolpica membership ---
const jolpicaDrivers: Driver[] = [
  ...mainDrivers,
  {
    driverId: 'drugovich',
    givenName: 'Felipe',
    familyName: 'Drugovich',
  } as Driver,
  {
    driverId: 'iwasa',
    givenName: 'Ayumu',
    familyName: 'Iwasa',
  } as Driver,
];

const jolpicaTestDrivers = detectTestDriversFromJolpica(jolpicaDrivers);
assert(jolpicaTestDrivers.length === 2, `Expected 2 Jolpica test drivers, got ${jolpicaTestDrivers.length}`);
assert(jolpicaTestDrivers.some(td => td.name === 'Felipe Drugovich'), 'Should detect Drugovich from Jolpica');
assert(jolpicaTestDrivers.some(td => td.name === 'Ayumu Iwasa'), 'Should detect Iwasa from Jolpica');

// PDF is authoritative for membership when present (ignores Jolpica-only Iwasa).
const resolvedFromPdf = resolveTestDriversForRace(jolpicaDrivers, { pdfText: mockPdfText });
assert(resolvedFromPdf.length === 1, `PDF membership should win over Jolpica extras, got ${resolvedFromPdf.length}`);
assert(resolvedFromPdf[0].name === 'Felipe Drugovich', 'PDF should return Drugovich');
assert(resolvedFromPdf[0].number === '34', 'PDF should provide test driver number');
assert(resolvedFromPdf[0].constructorId === 'aston_martin', 'PDF should provide test driver team');

const resolvedPdfFallback = resolveTestDriversForRace(mainDrivers, { pdfText: mockPdfText });
assert(resolvedPdfFallback.length === 1, 'Should use PDF when Jolpica has no extra drivers');
assert(resolvedPdfFallback[0].name === 'Felipe Drugovich', 'PDF fallback should return Drugovich');

// Jolpica-only (no PDF/FP1) remains available before documents are published.
const resolvedJolpicaOnly = resolveTestDriversForRace(jolpicaDrivers, {});
assert(resolvedJolpicaOnly.length === 2, 'Jolpica-only fallback should keep both extras');

// --- 6. Belgian-style flip-flop: previous-round Jolpica juniors must not wipe Crawford ---
const previousRoundJuniors: Driver[] = [
  ...mainDrivers,
  { driverId: 'paul_aron', givenName: 'Paul', familyName: 'Aron' } as Driver,
  { driverId: 'dino_beganovic', givenName: 'Dino', familyName: 'Beganovic' } as Driver,
  { driverId: 'luke_browning', givenName: 'Luke', familyName: 'Browning' } as Driver,
];
const polluted = detectTestDriversFromJolpica(previousRoundJuniors);
assert(isWeakTestDriverList(polluted), 'Previous-round juniors without metadata should be weak');

const belgianPdf = `
In addition to the list of cars and drivers eligible to take part in the event the following drivers may also take part in FP1
134 CRA Jak Crawford USA Aston Martin Aramco F1 Team Aston Martin Aramco Honda
`;
const crawfordResolved = resolveTestDriversForRace(previousRoundJuniors, { pdfText: belgianPdf });
assert(crawfordResolved.length === 1, 'Belgian PDF should yield only Crawford, not Barcelona juniors');
assert(crawfordResolved[0].name === 'Jak Crawford', 'Should resolve Jak Crawford from PDF');
assert(crawfordResolved[0].number === '34', 'Crawford number from PDF');
assert(crawfordResolved[0].constructorId === 'aston_martin', 'Crawford team from PDF');
assert(testDriverEntryCompleteness(crawfordResolved[0]) >= 4, 'Crawford entry should be complete');

const wikiWithCrawford = `
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
!colspan="8" | [[Test Driver]]s for [[#FP1|Practice 1]]
|-
!34
|{{USA}} [[Jak Crawford]]
|{{GBR}} [[Aston Martin|Aston Martin Aramco F1 Team]]
|{{Aston Martin-CON}}
|[[Aston Martin AMR26|AMR26]]
|{{Honda-ENG}}
|[[Honda RA626H|RA626H]] 1.6 [[V6]][[Turbocharger|t]]
|{{Pirelli}}
|-
! colspan="8" align="center" |Source: [https://fia.com source.pdf]
|}
`;

const pollutedUpdate = updateEntryListTableIfNeeded(wikiWithCrawford, mainDrivers, polluted);
assert(pollutedUpdate.changed === false, 'Weak Jolpica list must not overwrite complete Crawford entry');
assert(pollutedUpdate.updatedWikitext.includes('[[Jak Crawford]]'), 'Crawford must remain on wiki');
assert(!pollutedUpdate.updatedWikitext.includes('[[Paul Aron]]'), 'Must not inject Paul Aron');

const goodUpdate = updateEntryListTableIfNeeded(wikiWithCrawford, mainDrivers, crawfordResolved);
assert(goodUpdate.changed === false, 'Identical complete Crawford entry should be a no-op');

// --- 7. FP1 participants kept when PDF resolves Crawford (practice filter allowlist) ---
const fp1WithCrawford = {
  'Lando Norris': {
    position: '1',
    number: '4',
    driverName: 'Lando Norris',
    teamName: 'McLaren',
    time: '1:23.456',
  },
  'Jak Crawford': {
    position: '22',
    number: '34',
    driverName: 'Jak Crawford',
    teamName: 'Aston Martin',
    time: '1:53.199',
  },
};
const resolvedWithFp1 = resolveTestDriversForRace(previousRoundJuniors, {
  pdfText: belgianPdf,
  fp1: fp1WithCrawford,
});
assert(resolvedWithFp1.some(td => td.name === 'Jak Crawford'), 'FP1+PDF must keep Crawford');
assert(!resolvedWithFp1.some(td => td.name === 'Paul Aron'), 'FP1+PDF must not keep Barcelona juniors');

console.log('PASS: Entry list verification and PDF test driver detection tests.');
