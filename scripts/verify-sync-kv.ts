/**
 * Smoke test for per-target KV sync key helpers.
 * Run: npx tsx scripts/verify-sync-kv.ts
 */
import {
  gpCareerTemplateKey,
  sprintCareerTemplateKey,
  statsTemplateKey,
  gpPageSectionKey,
  legacyGpUpdatedKey,
  gpPageSectionRequired,
  allRequiredGpPageSectionsSynced,
  allStatsTemplatesSynced,
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
  gpPageSectionKey(7, 'race_results') === '2026_round_7_gp_page_race_results_synced',
  'GP page section key'
);

const timing = {
  hasSprint: true,
  isQualiConcluded: true,
  isSprintConcluded: true,
  isRaceConcluded: true,
};

assert(gpPageSectionRequired('sprint_results', timing), 'Sprint results required on sprint weekend');
assert(!gpPageSectionRequired('sprint_results', { ...timing, hasSprint: false }), 'No sprint results without sprint');

const allSynced = allRequiredGpPageSectionsSynced(
  {
    qualifying: true,
    grid: true,
    sprint_results: true,
    race_results: true,
    standings: true,
    infobox: true,
    background_report: true,
    q1_report: true,
    q2_report: true,
    q3_report: true,
    sprint_report: true,
    race_report: true,
  },
  timing
);
assert(allSynced, 'All GP page sections synced when every flag is true');

const baseStats = requiredStatsTemplateNames({ isSprintWeekend: false, isFinalRound: false });
assert(baseStats.length === 13, 'Base stats template count');

console.log('verify-sync-kv: all assertions passed');
