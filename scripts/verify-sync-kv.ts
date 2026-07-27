/**
 * Smoke test for per-target KV sync key helpers.
 * Run: npx tsx scripts/verify-sync-kv.ts
 */
import {
  gpCareerTemplateKey,
  sprintCareerTemplateKey,
  statsTemplateKey,
  gpPageSectionKey,
  latestDataKey,
  careerStandingsKey,
  careerStandingsRoundKey,
  clearCareerStandingsSynced,
  legacyGpUpdatedKey,
  testDriversCacheKey,
  gpPageSectionRequired,
  allRequiredGpPageSectionsSynced,
  allStatsTemplatesSynced,
  isStatsSyncEnabled,
  requiredStatsTemplateNames,
} from '../src/sync-kv';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  gpCareerTemplateKey(7) === '2026_round_7_gp_career_template_synced',
  'GP career template key'
);
assert(
  gpCareerTemplateKey(7) !== legacyGpUpdatedKey(7),
  'GP career template key must differ from legacy gp_updated key'
);
assert(
  sprintCareerTemplateKey(7) === '2026_round_7_sprint_career_template_synced',
  'Sprint career template key'
);
assert(
  statsTemplateKey(7, 'Grand Chelems') === '2026_round_7_stats_grand_chelems_synced',
  'Stats template key slug'
);
assert(
  testDriversCacheKey(11) === '2026_round_11_test_drivers_cache',
  'Test drivers cache key'
);
assert(
  careerStandingsKey('points') === '2026_career_standings_points_synced',
  'Career points standings key'
);
assert(
  careerStandingsRoundKey() === '2026_career_standings_source_round',
  'Career standings source round key'
);
assert(
  gpPageSectionKey(7, 'race_results') === '2026_round_7_gp_page_race_results_synced',
  'GP page section key'
);
assert(
  gpPageSectionKey(7, 'practice_results_fp1') === '2026_round_7_gp_page_practice_results_fp1_synced',
  'Practice FP1 section key'
);
assert(
  gpPageSectionKey(7, 'fp3_report') === '2026_round_7_gp_page_fp3_report_synced',
  'FP3 report section key'
);
assert(
  latestDataKey(10) === '2026_round_10_latest_data_synced',
  'Latest_Data per-round key'
);

const fpOnlyTiming = {
  hasSprint: false,
  isQualiConcluded: false,
  isSprintConcluded: false,
  isRaceConcluded: false,
  isFp1Concluded: true,
  isFp2Concluded: false,
  isFp3Concluded: false,
};
assert(gpPageSectionRequired('practice_results_fp1', fpOnlyTiming), 'FP1 practice required when concluded');
assert(!gpPageSectionRequired('practice_results_fp2', fpOnlyTiming), 'FP2 not required before conclusion');
assert(
  !gpPageSectionRequired('fp2_report', { ...fpOnlyTiming, hasSprint: true, isFp2Concluded: true }),
  'FP2 report not required on sprint weekend'
);

const timing = {
  hasSprint: true,
  isQualiConcluded: true,
  isSprintConcluded: true,
  isRaceConcluded: true,
  isFp1Concluded: true,
  isFp2Concluded: true,
  isFp3Concluded: true,
  isSprintQualiConcluded: true,
};

assert(gpPageSectionRequired('sprint_results', timing), 'Sprint results required on sprint weekend');
assert(!gpPageSectionRequired('sprint_results', { ...timing, hasSprint: false }), 'No sprint results without sprint');
assert(gpPageSectionRequired('sprint_qualifying', timing), 'Sprint qualifying results required on sprint weekend when concluded');
assert(gpPageSectionRequired('sprint_qualifying_report', timing), 'Sprint qualifying report required on sprint weekend when concluded');
assert(!gpPageSectionRequired('sprint_qualifying', { ...timing, isSprintQualiConcluded: false }), 'Sprint qualifying results not required before conclusion');
assert(!gpPageSectionRequired('sprint_qualifying_report', { ...timing, isSprintQualiConcluded: false }), 'Sprint qualifying report not required before conclusion');

const allSynced = allRequiredGpPageSectionsSynced(
  {
    qualifying: true,
    grid: true,
    sprint_results: true,
    sprint_qualifying: true,
    sprint_qualifying_report: true,
    race_results: true,
    standings: true,
    infobox: true,
    background_report: true,
    q1_report: true,
    q2_report: true,
    q3_report: true,
    sprint_report: true,
    race_report: true,
    practice_results_fp1: true,
    practice_results_fp2: true,
    practice_results_fp3: true,
    fp1_report: true,
    fp2_report: true,
    fp3_report: true,
    entry_list: true,
  },
  timing
);
assert(allSynced, 'All GP page sections synced when every flag is true');

const baseStats = requiredStatsTemplateNames({ isSprintWeekend: false, isFinalRound: false });
assert(baseStats.length === 13, 'Base stats template count');

assert(isStatsSyncEnabled({ STATS_SYNC: 'TRUE' }), 'STATS_SYNC=TRUE enables stats sync');
assert(!isStatsSyncEnabled({}), 'Missing STATS_SYNC disables stats sync');
assert(!isStatsSyncEnabled({ STATS_SYNC: 'true' }), 'Lowercase true does not enable stats sync');
assert(!isStatsSyncEnabled({ STATS_SYNC: 'FALSE' }), 'STATS_SYNC=FALSE disables stats sync');

async function testClearCareerStandingsSynced() {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
  store.set(careerStandingsKey('points'), 'true');
  store.set(careerStandingsKey('position'), 'true');
  store.set(careerStandingsKey('team_position'), 'true');
  await clearCareerStandingsSynced(kv);
  assert(store.get(careerStandingsKey('points')) === undefined, 'points flag cleared');
  assert(store.get(careerStandingsKey('position')) === undefined, 'position flag cleared');
  assert(store.get(careerStandingsKey('team_position')) === undefined, 'team_position flag cleared');
  console.log('PASS: clearCareerStandingsSynced');
}

testClearCareerStandingsSynced()
  .then(() => console.log('verify-sync-kv: all assertions passed'))
  .catch(err => {
    console.error('FAIL:', err.message);
    process.exit(1);
  });
