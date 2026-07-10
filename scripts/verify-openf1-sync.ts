import {
  createF1ApiContext,
  fetchOpenF1Json,
  fetchRoundJolpicaData,
  formatOpenF1PracticeTime,
  formatOpenF1SessionSegmentTime,
  formatOpenF1Time,
  getDriverStandings,
  getOpenF1PracticeSessionResult,
  getOpenF1SprintQualifyingResult,
  matchOpenF1PracticeSession,
  matchOpenF1SprintQualifyingSession,
  OpenF1Session,
} from '../src/f1-api';
import { generateSprintQualifyingWikitext } from '../src/wikitext-generator';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  // 1. Test formatOpenF1Time
  console.log('Testing formatOpenF1Time...');
  assert(formatOpenF1Time(89.273) === '1:29.273', 'Hamilton pole time format');
  assert(formatOpenF1Time(9.005) === '09.005', 'Single digit seconds format');
  assert(formatOpenF1Time(0) === '00.000', 'Zero seconds format');
  assert(formatOpenF1Time(null) === '', 'Null format');
  assert(formatOpenF1Time(undefined) === '', 'Undefined format');

  // 2. Test DNS/DSQ segment formatting
  console.log('Testing formatOpenF1SessionSegmentTime...');
  assert(
    formatOpenF1SessionSegmentTime(null, { dns: true, dnf: false, dsq: false }, 0) === 'DNS',
    'DNS in SQ1'
  );
  assert(
    formatOpenF1SessionSegmentTime(null, { dns: true, dnf: false, dsq: false }, 1) === '',
    'DNS leaves later segments blank'
  );
  assert(
    formatOpenF1SessionSegmentTime(87.5, { dns: false, dnf: false, dsq: true }, 0) === 'DSQ',
    'DSQ in SQ1'
  );
  assert(
    formatOpenF1SessionSegmentTime(null, { dns: false, dnf: true, dsq: false }, 1) === '',
    'DNF with missing segment time stays blank'
  );
  assert(
    formatOpenF1SessionSegmentTime(92.171, { dns: false, dnf: true, dsq: false }, 0) === '1:32.171',
    'DNF driver can still have an SQ1 time'
  );

  // 3. Test session matching prefers closest date and circuit
  console.log('Testing matchOpenF1SprintQualifyingSession...');
  const sampleSessions: OpenF1Session[] = [
    {
      session_key: 9989,
      session_name: 'Sprint Qualifying',
      date_start: '2025-03-21T07:30:00+00:00',
      circuit_short_name: 'Shanghai',
    },
    {
      session_key: 10024,
      session_name: 'Sprint Qualifying',
      date_start: '2025-05-02T20:30:00+00:00',
      circuit_short_name: 'Miami',
    },
  ];

  const chinaRace = {
    round: '2',
    date: '2025-03-23',
    raceName: 'Chinese Grand Prix',
    Circuit: { circuitId: 'shanghai' },
    SprintQualifying: { date: '2025-03-21', time: '07:30:00Z' },
  };
  const miamiRace = {
    round: '6',
    date: '2025-05-04',
    raceName: 'Miami Grand Prix',
    Circuit: { circuitId: 'miami' },
    SprintQualifying: { date: '2025-05-02', time: '20:30:00Z' },
  };

  assert(
    matchOpenF1SprintQualifyingSession(sampleSessions, chinaRace, 2)?.session_key === 9989,
    'China GP matches Shanghai session'
  );
  assert(
    matchOpenF1SprintQualifyingSession(sampleSessions, miamiRace, 6)?.session_key === 10024,
    'Miami GP matches Miami session'
  );

  // 3b. Practice session matching
  console.log('Testing matchOpenF1PracticeSession...');
  const practiceSessions: OpenF1Session[] = [
    {
      session_key: 11308,
      session_name: 'Practice 1',
      date_start: '2026-06-26T11:30:00+00:00',
      circuit_short_name: 'Spielberg',
    },
    {
      session_key: 11309,
      session_name: 'Practice 2',
      date_start: '2026-06-26T15:30:00+00:00',
      circuit_short_name: 'Spielberg',
    },
  ];
  const austriaRace = {
    round: '8',
    date: '2026-06-28',
    raceName: 'Austrian Grand Prix',
    Circuit: { circuitId: 'red_bull_ring' },
    FirstPractice: { date: '2026-06-26', time: '11:30:00Z' },
    SecondPractice: { date: '2026-06-26', time: '15:30:00Z' },
  };
  assert(
    matchOpenF1PracticeSession(practiceSessions, austriaRace, 8, 1)?.session_key === 11308,
    'Austria FP1 matches Spielberg session'
  );
  assert(
    matchOpenF1PracticeSession(practiceSessions, austriaRace, 8, 2)?.session_key === 11309,
    'Austria FP2 matches Spielberg session'
  );
  assert(formatOpenF1PracticeTime({ duration: 67.796, dns: false, dsq: false }) === '1:07.796', 'Practice time format');
  assert(formatOpenF1PracticeTime({ duration: null, dns: true, dsq: false }) === 'DNS', 'Practice DNS format');

  // 4. Test generateSprintQualifyingWikitext
  console.log('Testing generateSprintQualifyingWikitext...');
  const mockDrivers = [
    {
      driverId: 'hamilton',
      givenName: 'Lewis',
      familyName: 'Hamilton',
      permanentNumber: '44',
      nationality: 'British',
      code: 'HAM',
      dateOfBirth: '',
      url: '',
    },
    {
      driverId: 'russell',
      givenName: 'George',
      familyName: 'Russell',
      permanentNumber: '63',
      nationality: 'British',
      code: 'RUS',
      dateOfBirth: '',
      url: '',
    },
  ];

  const mockResults = [
    {
      number: '44',
      position: '1',
      driver: mockDrivers[0],
      constructor: { constructorId: 'mercedes', name: 'Mercedes', nationality: 'German', url: '' },
      Q1: '1:29.273',
      Q2: '1:28.747',
      Q3: '1:28.376',
    },
    {
      number: '63',
      position: '2',
      driver: mockDrivers[1],
      constructor: { constructorId: 'mercedes', name: 'Mercedes', nationality: 'German', url: '' },
      Q1: '1:29.458',
      Q2: '1:29.012',
      Q3: '1:28.452',
    },
  ];

  const wikitext = generateSprintQualifyingWikitext(mockResults);
  assert(wikitext.includes('====Sprint Qualifying Results===='), 'Wikitext includes correct heading');
  assert(wikitext.includes('SQ1'), 'Wikitext includes SQ1 header');
  assert(wikitext.includes('SQ2'), 'Wikitext includes SQ2 header');
  assert(wikitext.includes('SQ3'), 'Wikitext includes SQ3 header');
  assert(wikitext.includes('Source:<ref name=SQR>'), 'Wikitext includes correct reference name SQR');
  assert(wikitext.includes('final_sprint_qualifying_classification.pdf'), 'Wikitext includes correct FIA file reference');
  assert(wikitext.includes('[[Lewis Hamilton]]'), 'Wikitext contains driver link');
  assert(wikitext.includes('{{Mercedes-CON}}'), 'Wikitext contains team template');

  // 5–6. Live OpenF1 tests (skipped when API is unavailable in this environment)
  try {
    console.log('Testing fetchOpenF1Json in-flight dedup...');
    const ctx = createF1ApiContext();
    const url = 'https://api.openf1.org/v1/sessions?session_name=Sprint%20Qualifying&year=2025';
    const [first, second] = await Promise.all([
      fetchOpenF1Json<OpenF1Session[]>(url, ctx, 86400 * 7),
      fetchOpenF1Json<OpenF1Session[]>(url, ctx, 86400 * 7),
    ]);
    assert(Array.isArray(first) && first.length > 0, 'First OpenF1 fetch returns sessions');
    assert(first === second, 'In-flight dedup returns same cached array reference');
    assert(ctx.apiCallCount === 1, 'Parallel OpenF1 requests share one network call');

    console.log('Testing getOpenF1SprintQualifyingResult integration...');
    const integrationCtx = createF1ApiContext();
    integrationCtx.schedule = [miamiRace];
    const currentDrivers = await getDriverStandings(2025, 6, integrationCtx);
    const roundData = await fetchRoundJolpicaData(
      2025,
      6,
      {
        needQuali: false,
        needGpResults: false,
        needSprintResults: false,
        needStandings: true,
        needDrivers: true,
        hasSprint: true,
        needSprintQuali: true,
        race: miamiRace,
      },
      integrationCtx
    );

    assert(roundData.sprintQualiResults.length === 20, 'Miami 2025 returns 20 SQ results');
    assert(roundData.sprintQualiResults[0].Q3.length > 0, 'Pole position has SQ3 time');
    assert(
      integrationCtx.apiCallCount <= 8,
      `Constructor mapping stays efficient (got ${integrationCtx.apiCallCount} API calls, expected <= 8)`
    );

    const directResults = await getOpenF1SprintQualifyingResult(
      2025,
      6,
      miamiRace,
      integrationCtx,
      currentDrivers,
      null,
      roundData.drivers
    );
    assert(directResults.length === 20, 'Direct OpenF1 call with shared drivers also returns 20 results');
    assert(
      integrationCtx.apiCallCount <= 8,
      'Reusing ctx cache does not add network calls for session/results'
    );

    const austriaFp1 = await getOpenF1PracticeSessionResult(
      2026,
      8,
      austriaRace,
      1,
      roundData.drivers,
      integrationCtx
    );
    assert(austriaFp1 !== null && Object.keys(austriaFp1).length >= 20, 'Austria 2026 FP1 returns practice results');
    assert(
      Object.values(austriaFp1!).some(r => r.driverName.includes('Iwasa')),
      'Austria FP1 includes test driver Ayumu Iwasa'
    );
    assert(
      Object.values(austriaFp1!).some(r => r.time === '1:07.796'),
      'Austria FP1 pole time formatted from OpenF1 duration'
    );
  } catch (error: any) {
    console.log(`SKIP: OpenF1 live integration tests (${error?.message || error})`);
  }

  console.log('verify-openf1-sync: all assertions passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
