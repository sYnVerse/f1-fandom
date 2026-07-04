import { formatOpenF1Time, getOpenF1SprintQualifyingResult } from '../src/f1-api';
import { generateSprintQualifyingWikitext } from '../src/wikitext-generator';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// 1. Test formatOpenF1Time
console.log("Testing formatOpenF1Time...");
assert(formatOpenF1Time(89.273) === '1:29.273', 'Hamilton pole time format');
assert(formatOpenF1Time(9.005) === '09.005', 'Single digit seconds format');
assert(formatOpenF1Time(0) === '00.000', 'Zero seconds format');
assert(formatOpenF1Time(null) === '', 'Null format');
assert(formatOpenF1Time(undefined) === '', 'Undefined format');

// 2. Test generateSprintQualifyingWikitext
console.log("Testing generateSprintQualifyingWikitext...");
const mockDrivers = [
  {
    driverId: 'hamilton',
    givenName: 'Lewis',
    familyName: 'Hamilton',
    permanentNumber: '44',
    nationality: 'British',
    code: 'HAM',
    dateOfBirth: '',
    url: ''
  },
  {
    driverId: 'russell',
    givenName: 'George',
    familyName: 'Russell',
    permanentNumber: '63',
    nationality: 'British',
    code: 'RUS',
    dateOfBirth: '',
    url: ''
  }
];

const mockResults = [
  {
    number: '44',
    position: '1',
    driver: mockDrivers[0],
    constructor: { constructorId: 'mercedes', name: 'Mercedes', nationality: 'German', url: '' },
    Q1: '1:29.273',
    Q2: '1:28.747',
    Q3: '1:28.376'
  },
  {
    number: '63',
    position: '2',
    driver: mockDrivers[1],
    constructor: { constructorId: 'mercedes', name: 'Mercedes', nationality: 'German', url: '' },
    Q1: '1:29.458',
    Q2: '1:29.012',
    Q3: '1:28.452'
  }
];

const wikitext = generateSprintQualifyingWikitext(mockResults);
assert(wikitext.includes('====Sprint Qualifying Results===='), 'Wikitext includes correct heading');
assert(wikitext.includes('SQ1'), 'Wikitext includes SQ1 header');
assert(wikitext.includes('SQ2'), 'Wikitext includes SQ2 header');
assert(wikitext.includes('SQ3'), 'Wikitext includes SQ3 header');
assert(wikitext.includes('Source:<ref name=SQR>'), 'Wikitext includes correct reference name SQR');
assert(wikitext.includes('final_sprint_qualifying_classification.pdf'), 'Wikitext includes correct FIA file reference');
assert(wikitext.includes("[[Lewis Hamilton]]"), 'Wikitext contains driver link');
assert(wikitext.includes("{{Mercedes-CON}}"), 'Wikitext contains team template');

console.log("verify-openf1-sync: all assertions passed");
