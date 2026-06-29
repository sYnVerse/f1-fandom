/**
 * KV flag keys for scheduled wiki sync targets.
 * Each page/section gets its own flag so one successful sync cannot block retries for another.
 */

import { trackedKvPut } from './kv-ops';

export type GpPageSection =
  | 'qualifying'
  | 'grid'
  | 'sprint_results'
  | 'race_results'
  | 'standings'
  | 'infobox'
  | 'background_report'
  | 'q1_report'
  | 'q2_report'
  | 'q3_report'
  | 'sprint_report'
  | 'race_report'
  | 'practice_results_fp1'
  | 'practice_results_fp2'
  | 'practice_results_fp3'
  | 'fp1_report'
  | 'fp2_report'
  | 'fp3_report';

export type CareerStandingsPage = 'points' | 'position' | 'team_position';

const ACTIVE_SEASON = 2026;

/** @deprecated Legacy key covered both GP page and career template; never use for career template checks. */
export function legacyGpUpdatedKey(round: number): string {
  return `${ACTIVE_SEASON}_round_${round}_gp_updated`;
}

/** @deprecated Renamed to sprint career template key. */
export function legacySprintUpdatedKey(round: number): string {
  return `${ACTIVE_SEASON}_round_${round}_sprint_updated`;
}

export function gpCareerTemplateKey(round: number): string {
  return `${ACTIVE_SEASON}_round_${round}_gp_career_template_synced`;
}

export function sprintCareerTemplateKey(round: number): string {
  return `${ACTIVE_SEASON}_round_${round}_sprint_career_template_synced`;
}

export function statsTemplateKey(round: number, templateName: string): string {
  const slug = templateName.toLowerCase().replace(/\s+/g, '_');
  return `${ACTIVE_SEASON}_round_${round}_stats_${slug}_synced`;
}

export function gpPageSectionKey(round: number, section: GpPageSection): string {
  return `${ACTIVE_SEASON}_round_${round}_gp_page_${section}_synced`;
}

export function latestNewsEventsKey(): string {
  return `${ACTIVE_SEASON}_latest_f1_news_events_synced`;
}

export function careerStandingsKey(page: CareerStandingsPage): string {
  return `${ACTIVE_SEASON}_career_standings_${page}_synced`;
}

export const BASE_STATS_TEMPLATES = [
  'Distance', 'DistanceLed', 'Entries', 'FastestLaps', 'FrontRows',
  'Laps', 'LapsLed', 'Podiums', 'Points', 'Poles', 'RacesLed', 'Starts', 'Wins',
] as const;

export const SPRINT_STATS_TEMPLATES = [
  'SprintFastestLaps', 'SprintPodiums', 'SprintPoles', 'SprintWins',
] as const;

export const GP_PAGE_SECTIONS: GpPageSection[] = [
  'qualifying',
  'grid',
  'sprint_results',
  'race_results',
  'standings',
  'infobox',
  'background_report',
  'q1_report',
  'q2_report',
  'q3_report',
  'sprint_report',
  'race_report',
  'practice_results_fp1',
  'practice_results_fp2',
  'practice_results_fp3',
  'fp1_report',
  'fp2_report',
  'fp3_report',
];

export async function isKvSynced(kv: any, key: string, legacyKeys: string[] = []): Promise<boolean> {
  if (!kv) return false;
  if ((await kv.get(key)) === 'true') return true;
  for (const legacyKey of legacyKeys) {
    if ((await kv.get(legacyKey)) === 'true') return true;
  }
  return false;
}

export async function markKvSynced(kv: any, key: string): Promise<void> {
  if (!kv) return;
  if ((await kv.get(key)) === 'true') return;
  await trackedKvPut(kv, key, 'true');
}

export async function getGpPageSectionSyncState(
  kv: any,
  round: number
): Promise<Record<GpPageSection, boolean>> {
  const entries = await Promise.all(
    GP_PAGE_SECTIONS.map(async (section) => [
      section,
      await isKvSynced(kv, gpPageSectionKey(round, section)),
    ] as const)
  );
  return Object.fromEntries(entries) as Record<GpPageSection, boolean>;
}

export function gpPageSectionRequired(
  section: GpPageSection,
  options: {
    hasSprint: boolean;
    isQualiConcluded: boolean;
    isSprintConcluded: boolean;
    isRaceConcluded: boolean;
    isFp1Concluded: boolean;
    isFp2Concluded: boolean;
    isFp3Concluded: boolean;
  }
): boolean {
  const {
    hasSprint,
    isQualiConcluded,
    isSprintConcluded,
    isRaceConcluded,
    isFp1Concluded,
    isFp2Concluded,
    isFp3Concluded,
  } = options;
  switch (section) {
    case 'qualifying':
    case 'grid':
    case 'q1_report':
    case 'q2_report':
    case 'q3_report':
      return isQualiConcluded;
    case 'sprint_results':
    case 'sprint_report':
      return hasSprint && isSprintConcluded;
    case 'race_results':
    case 'standings':
    case 'infobox':
    case 'background_report':
    case 'race_report':
      return isRaceConcluded;
    case 'practice_results_fp1':
    case 'fp1_report':
      return isFp1Concluded;
    case 'practice_results_fp2':
    case 'fp2_report':
      return !hasSprint && isFp2Concluded;
    case 'practice_results_fp3':
    case 'fp3_report':
      return !hasSprint && isFp3Concluded;
    default:
      return false;
  }
}

export function allRequiredGpPageSectionsSynced(
  sectionState: Record<GpPageSection, boolean>,
  options: {
    hasSprint: boolean;
    isQualiConcluded: boolean;
    isSprintConcluded: boolean;
    isRaceConcluded: boolean;
    isFp1Concluded: boolean;
    isFp2Concluded: boolean;
    isFp3Concluded: boolean;
  }
): boolean {
  return GP_PAGE_SECTIONS.every(
    (section) => !gpPageSectionRequired(section, options) || sectionState[section]
  );
}

export const CONDITIONAL_STATS_TEMPLATES = ['Doubles', 'HatTricks', 'Grand Chelems'] as const;

export function requiredStatsTemplateNames(
  options: { isSprintWeekend: boolean; isFinalRound: boolean }
): string[] {
  const names: string[] = [...BASE_STATS_TEMPLATES];
  if (options.isSprintWeekend) {
    names.push(...SPRINT_STATS_TEMPLATES);
  }
  if (options.isFinalRound) {
    names.push('Championships');
  }
  return names;
}

export async function allRequiredStatsTemplatesSynced(
  kv: any,
  round: number,
  options: { isSprintWeekend: boolean; isFinalRound: boolean }
): Promise<boolean> {
  if (!kv) return false;
  const names = requiredStatsTemplateNames(options);
  const results = await Promise.all(
    names.map((name) => isKvSynced(kv, statsTemplateKey(round, name)))
  );
  return results.every(Boolean);
}

export async function allConditionalStatsTemplatesSynced(kv: any, round: number): Promise<boolean> {
  if (!kv) return false;
  const results = await Promise.all(
    CONDITIONAL_STATS_TEMPLATES.map((name) => isKvSynced(kv, statsTemplateKey(round, name)))
  );
  return results.every(Boolean);
}

export async function allStatsTemplatesSynced(
  kv: any,
  round: number,
  options: { isSprintWeekend: boolean; isFinalRound: boolean }
): Promise<boolean> {
  return (
    (await allRequiredStatsTemplatesSynced(kv, round, options)) &&
    (await allConditionalStatsTemplatesSynced(kv, round))
  );
}
