/**
 * Regression: older rounds in the last-2 cron loop must not rewrite Career
 * Points/Position/Team_Position when the source round is already the latest.
 * Run: npx tsx scripts/verify-career-standings-owner.ts
 */
import {
  isCareerStandingsOwnerRound,
  isCareerStandingsBehind,
  shouldSyncCareerStandingsForRound,
} from '../src/career-standings-owner';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const latest = 12;

assert(isCareerStandingsOwnerRound(12, latest), 'latest concluded round owns Career standings');
assert(!isCareerStandingsOwnerRound(11, latest), 'prior concluded round does not own Career standings');
assert(!isCareerStandingsOwnerRound(12, 0), 'no owner when latest concluded is unknown');

assert(
  !isCareerStandingsBehind({
    isRaceConcluded: true,
    round: 11,
    latestConcludedRound: latest,
    standingsSourceRound: '12',
  }),
  'prior round must not treat latest standings as behind (flip-flop root cause)'
);

assert(
  isCareerStandingsBehind({
    isRaceConcluded: true,
    round: 12,
    latestConcludedRound: latest,
    standingsSourceRound: '11',
  }),
  'latest round is behind when source is prior round'
);

assert(
  isCareerStandingsBehind({
    isRaceConcluded: true,
    round: 12,
    latestConcludedRound: latest,
    standingsSourceRound: null,
  }),
  'latest round is behind when source round is unknown'
);

assert(
  !isCareerStandingsBehind({
    isRaceConcluded: true,
    round: 12,
    latestConcludedRound: latest,
    standingsSourceRound: '12',
  }),
  'latest round is current when source matches'
);

assert(
  !isCareerStandingsBehind({
    isRaceConcluded: false,
    round: 12,
    latestConcludedRound: latest,
    standingsSourceRound: '11',
  }),
  'non-concluded race is never behind'
);

assert(
  !shouldSyncCareerStandingsForRound({
    round: 11,
    latestConcludedRound: latest,
    gpTemplateUpdated: true,
    careerStandingsBehind: false,
    allowContentRepair: false,
  }),
  'prior round GP template update must not sync Career Points/Position/Team_Position'
);

assert(
  shouldSyncCareerStandingsForRound({
    round: 12,
    latestConcludedRound: latest,
    gpTemplateUpdated: false,
    careerStandingsBehind: true,
    allowContentRepair: false,
  }),
  'latest round syncs when Career standings are behind'
);

assert(
  shouldSyncCareerStandingsForRound({
    round: 12,
    latestConcludedRound: latest,
    gpTemplateUpdated: true,
    careerStandingsBehind: false,
    allowContentRepair: false,
  }),
  'latest round syncs after GP template update'
);

assert(
  shouldSyncCareerStandingsForRound({
    round: 12,
    latestConcludedRound: latest,
    gpTemplateUpdated: false,
    careerStandingsBehind: false,
    allowContentRepair: true,
  }),
  'latest round syncs during content repair window'
);

console.log('PASS: career standings owner / multi-round flip-flop guards');
console.log('verify-career-standings-owner: all assertions passed');
