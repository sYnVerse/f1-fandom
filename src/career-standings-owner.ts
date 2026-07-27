/**
 * Career Points/Position/Team_Position templates reflect season standings after the
 * latest concluded GP. Older rounds in the cron loop must not rewrite them.
 */

/** True when this round owns Career standings sync (latest concluded only). */
export function isCareerStandingsOwnerRound(
  round: number,
  latestConcludedRound: number
): boolean {
  return latestConcludedRound > 0 && round === latestConcludedRound;
}

/**
 * Career standings are behind when the latest concluded round's templates still
 * reflect an older (or unknown) source round. Never true for non-owner rounds.
 */
export function isCareerStandingsBehind(options: {
  isRaceConcluded: boolean;
  round: number;
  latestConcludedRound: number;
  standingsSourceRound: string | null;
}): boolean {
  if (!options.isRaceConcluded) return false;
  if (!isCareerStandingsOwnerRound(options.round, options.latestConcludedRound)) {
    return false;
  }
  return options.standingsSourceRound !== String(options.round);
}

/** Whether this round should update Career Points/Position/Team_Position. */
export function shouldSyncCareerStandingsForRound(options: {
  round: number;
  latestConcludedRound: number;
  gpTemplateUpdated: boolean;
  careerStandingsBehind: boolean;
  allowContentRepair: boolean;
}): boolean {
  if (!isCareerStandingsOwnerRound(options.round, options.latestConcludedRound)) {
    return false;
  }
  return (
    options.gpTemplateUpdated ||
    options.careerStandingsBehind ||
    options.allowContentRepair
  );
}
