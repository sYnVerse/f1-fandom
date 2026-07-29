/**
 * End-to-end verification against the 2026 Austrian GP FIA entry list PDF.
 * Run: npx tsx scripts/verify-fia-pdf-parser.ts
 */
import { readFileSync, existsSync } from 'fs';
import { extractPdfText, parseFiaEntryListPdf } from '../src/fia-pdf-parser';
import { detectTestDriversFromPdf, detectTestDriversFromFp1, generatePracticeWikitext } from '../src/wikitext-generator';
import { Driver } from '../src/f1-api';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const austrianDrivers: Driver[] = [
  { driverId: 'norris', givenName: 'Lando', familyName: 'Norris', permanentNumber: '4', nationality: 'British', code: 'NOR', url: '', dateOfBirth: '' },
  { driverId: 'piastri', givenName: 'Oscar', familyName: 'Piastri', permanentNumber: '81', nationality: 'Australian', code: 'PIA', url: '', dateOfBirth: '' },
  { driverId: 'hadjar', givenName: 'Isack', familyName: 'Hadjar', permanentNumber: '6', nationality: 'French', code: 'HAD', url: '', dateOfBirth: '' },
];

async function main() {
  const pdfPath = '/tmp/austria_entry_list.pdf';
  if (!existsSync(pdfPath)) {
    console.log(`SKIP: ${pdfPath} not found`);
    return;
  }
  const buf = readFileSync(pdfPath);
  const pdfText = await extractPdfText(new Uint8Array(buf));
  const parsed = parseFiaEntryListPdf(pdfText, austrianDrivers);

  assert(parsed.fp1TestDrivers.length === 6, `Expected 6 FP1 test drivers, got ${parsed.fp1TestDrivers.length}`);

  const expected = [
    { name: 'Ayumu Iwasa', number: '90', natCode: 'JPN' },
    { name: 'Dino Beganovic', number: '38', natCode: 'SWE' },
    { name: 'Paul Aron', number: '97', natCode: 'EST' },
    { name: 'Luke Browning', number: '46', natCode: 'GBR' },
    { name: 'Jak Crawford', number: '34', natCode: 'USA' },
    { name: 'Ryo Hirakawa', number: '50', natCode: 'JPN' },
  ];

  for (const exp of expected) {
    const row = parsed.fp1TestDrivers.find(d => d.name === exp.name);
    assert(!!row, `Missing test driver ${exp.name}`);
    assert(row!.number === exp.number, `${exp.name} number: expected ${exp.number}, got ${row!.number}`);
    assert(row!.natCode === exp.natCode, `${exp.name} nat: expected ${exp.natCode}, got ${row!.natCode}`);
  }

  const fromPdf = detectTestDriversFromPdf(pdfText, austrianDrivers);
  assert(fromPdf.length === 6, `detectTestDriversFromPdf expected 6, got ${fromPdf.length}`);
  assert(fromPdf.every(td => td.flag !== '{{NoFlag}}' && td.flag !== '{{FIA}}'), 'All test drivers should have nationality flags from PDF');

  const fp1Results = {
    'Ayumu Iwasa': { position: '15', number: '0', driverName: 'Ayumu Iwasa', teamName: 'Racing Bulls', time: '1:09.637' },
    'Paul Aron': { position: '17', number: '0', driverName: 'Paul Aron', teamName: 'Audi', time: '1:09.646' },
    'Lando Norris': { position: '7', number: '4', driverName: 'Lando Norris', teamName: 'McLaren', time: '1:08.873' },
  };

  const fromFp1 = detectTestDriversFromFp1(austrianDrivers, fp1Results, pdfText);
  assert(fromFp1.length === 2, `Expected 2 FP1-only test drivers, got ${fromFp1.length}`);
  const iwasa = fromFp1.find(td => td.name === 'Ayumu Iwasa');
  assert(iwasa?.number === '90', `Iwasa number from PDF: ${iwasa?.number}`);
  assert(iwasa?.flag === '{{JPN}}', `Iwasa flag: ${iwasa?.flag}`);

  const practiceWiki = generatePracticeWikitext(austrianDrivers, null, fp1Results, null, null, { pdfText });
  assert(practiceWiki.includes('! 90'), 'Practice table should use PDF car number 90 for Iwasa');
  assert(practiceWiki.includes('{{JPN}} [[Ayumu Iwasa]]'), 'Practice table should use JPN flag for Iwasa');
  assert(!practiceWiki.includes('{{NoFlag}}'), 'Practice table should not contain NoFlag');
  assert(!practiceWiki.includes('Isack Hadjar') || practiceWiki.includes('! 6'), 'Main drivers should not be misclassified as test drivers');

  const driversMissingCode = [
    { driverId: 'norris', givenName: 'Lando', familyName: 'Norris', permanentNumber: '4', nationality: 'British', code: undefined },
    { driverId: 'piastri', givenName: 'Oscar', familyName: 'Piastri', permanentNumber: '81', nationality: 'Australian', code: undefined },
  ] as any[];
  assert(
    detectTestDriversFromPdf(pdfText, driversMissingCode).length === 6,
    'PDF parsing should not throw when driver code is missing'
  );

  console.log('PASS: Austrian GP FIA PDF parser verification');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
