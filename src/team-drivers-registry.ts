/**
 * Parses Template:Team Drivers/{year} to resolve numbered stint wiki keys
 * (e.g. Liam Lawson2 → Racing Bulls, Liam Lawson3 → Red Bull).
 */

import { driverIdToWikiName, normalizeName } from './stats';

export interface DriverStintEntry {
  stintWikiName: string;
  canonicalWikiName: string;
  constructorId: string;
  teamLabel: string;
  driverId: string | null;
}

export interface TeamDriversRegistry {
  year: number;
  stints: DriverStintEntry[];
  /** `${driverId}:${constructorId}` → stint wiki name */
  stintByDriverConstructor: Map<string, string>;
  /** driverId → all stint entries for that driver */
  stintsByDriverId: Map<string, DriverStintEntry[]>;
  /** All stint wiki names (numbered aliases) */
  numberedStintNames: Set<string>;
}

const TEAM_LABEL_TO_CONSTRUCTOR: Record<string, string> = {
  'red bull': 'red_bull',
  'racing bulls': 'rb',
  ferrari: 'ferrari',
  mercedes: 'mercedes',
  alpine: 'alpine',
  mclaren: 'mclaren',
  williams: 'williams',
  'aston martin': 'aston_martin',
  audi: 'sauber',
  haas: 'haas',
  cadillac: 'cadillac',
};

function teamLabelToConstructorId(teamLabel: string): string | null {
  const key = teamLabel.trim().toLowerCase();
  return TEAM_LABEL_TO_CONSTRUCTOR[key] ?? null;
}

function wikiNameToDriverId(wikiName: string): string | null {
  const trimmed = wikiName.trim();
  for (const [id, name] of Object.entries(driverIdToWikiName)) {
    if (name === trimmed || normalizeName(name) === normalizeName(trimmed)) {
      return id;
    }
  }
  const base = trimmed.replace(/\d+$/, '').trim();
  if (base && base !== trimmed) {
    return wikiNameToDriverId(base);
  }
  return null;
}

function canonicalWikiNameFromStint(stintWikiName: string): string {
  const trimmed = stintWikiName.trim();
  for (const name of Object.values(driverIdToWikiName)) {
    if (trimmed === name || normalizeName(trimmed) === normalizeName(name)) {
      return name;
    }
  }
  const base = trimmed.replace(/\d+$/, '').trim();
  for (const name of Object.values(driverIdToWikiName)) {
    if (base === name || normalizeName(base) === normalizeName(name)) {
      return name;
    }
  }
  return trimmed;
}

function isNumberedStintName(stintWikiName: string, canonical: string): boolean {
  return stintWikiName.trim() !== canonical;
}

/** Parse `Template:Team Drivers/{year}` wikitext into a stint registry. */
export function parseTeamDriversRegistry(year: number, wikitext: string): TeamDriversRegistry {
  const stints: DriverStintEntry[] = [];

  for (const line of wikitext.split('\n')) {
    const match = line.match(/^\|(.+?)\s+driver(\d+)\s*=\s*(.+)$/);
    if (!match) continue;

    const teamLabel = match[1].trim();
    const stintWikiName = match[3].trim();
    if (!stintWikiName) continue;

    const constructorId = teamLabelToConstructorId(teamLabel);
    if (!constructorId) continue;

    const canonicalWikiName = canonicalWikiNameFromStint(stintWikiName);
    const driverId = wikiNameToDriverId(stintWikiName);

    stints.push({
      stintWikiName,
      canonicalWikiName,
      constructorId,
      teamLabel,
      driverId,
    });
  }

  const stintByDriverConstructor = new Map<string, string>();
  const stintsByDriverId = new Map<string, DriverStintEntry[]>();
  const numberedStintNames = new Set<string>();

  for (const entry of stints) {
    if (entry.driverId) {
      stintByDriverConstructor.set(`${entry.driverId}:${entry.constructorId}`, entry.stintWikiName);
      const list = stintsByDriverId.get(entry.driverId) ?? [];
      list.push(entry);
      stintsByDriverId.set(entry.driverId, list);
    }
    if (isNumberedStintName(entry.stintWikiName, entry.canonicalWikiName)) {
      numberedStintNames.add(entry.stintWikiName);
    }
  }

  return {
    year,
    stints,
    stintByDriverConstructor,
    stintsByDriverId,
    numberedStintNames,
  };
}

export function getStintWikiName(
  registry: TeamDriversRegistry,
  driverId: string,
  constructorId: string
): string | null {
  return registry.stintByDriverConstructor.get(`${driverId}:${constructorId}`) ?? null;
}

export function driverHasNumberedStints(registry: TeamDriversRegistry, driverId: string): boolean {
  const entries = registry.stintsByDriverId.get(driverId) ?? [];
  return entries.some(e => isNumberedStintName(e.stintWikiName, e.canonicalWikiName));
}
