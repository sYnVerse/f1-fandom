/**
 * Stint-aware Career Results GP templates and Points/2026 splits.
 */

import { RaceResult, DriverStanding } from './f1-api';
import { driverIdToWikiName, normalizeName } from './stats';
import { DRIVER_TO_CONSTRUCTOR_2026 } from './season-roster-2026';
import {
  TeamDriversRegistry,
  getStintWikiName,
  driverHasNumberedStints,
} from './team-drivers-registry';

export const CAREER_RESULTS_MANUAL_MARKER = '<!-- manual -->';

const WIKI_DRIVER_LIST = [
  'Max Verstappen',
  'Isack Hadjar',
  'Charles Leclerc',
  'Lewis Hamilton',
  'George Russell',
  'Andrea Kimi Antonelli',
  'Pierre Gasly',
  'Franco Colapinto',
  'Lando Norris',
  'Oscar Piastri',
  'Carlos Sainz, Jr.',
  'Alexander Albon',
  'Liam Lawson',
  'Arvid Lindblad',
  'Lance Stroll',
  'Fernando Alonso',
  'Nico Hülkenberg',
  'Gabriel Bortoleto',
  'Esteban Ocon',
  'Oliver Bearman',
  'Valtteri Bottas',
  'Sergio Pérez',
];

const PAD_WIDTH = 22;

export interface CareerResultsRow {
  switchKey: string;
  value: string;
  isManual: boolean;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatRaceResultValue(r: RaceResult): string {
  const posText = r.positionText || r.position;
  let formatted = '';

  if (posText === 'R') {
    formatted = '{{Ret}}';
  } else if (posText === 'D') {
    formatted = '{{DSQ}}';
  } else if (posText === 'W') {
    formatted = '{{DNS}}';
  } else {
    const posVal = parseInt(r.position, 10);
    const ord = getOrdinal(posVal);
    const isFL = r.FastestLap && r.FastestLap.rank === '1';

    if (posVal <= 10) {
      formatted = isFL ? `{{${ord}|fl}}` : `{{${ord}}}`;
    } else {
      formatted = isFL ? `${ord}|fl` : `${ord}`;
    }
  }

  if (r.grid === '1') {
    formatted += '{{Pole}}';
  }

  return formatted;
}

function wikiNameToDriverId(wikiName: string): string | null {
  const trimmed = wikiName.trim();
  for (const [id, name] of Object.entries(driverIdToWikiName)) {
    if (name === trimmed || normalizeName(name) === normalizeName(trimmed)) {
      return id;
    }
  }
  return null;
}

function getRaceDriverId(r: RaceResult): string | null {
  const d = r.driver ?? (r as any).Driver;
  return d?.driverId ?? null;
}

function getRaceConstructorId(r: RaceResult): string | null {
  const c = r.constructor ?? (r as any).Constructor;
  return c?.constructorId ?? null;
}

/** Build `#switch` key: plain name or `|Canonical|Stint` pipe alias. */
export function buildStintSwitchKey(
  registry: TeamDriversRegistry | null,
  driverId: string,
  racedConstructorId: string
): string {
  const canonical = driverIdToWikiName[driverId];
  if (!canonical) return '';

  if (!registry) return canonical;

  const stintName = getStintWikiName(registry, driverId, racedConstructorId);
  if (!stintName) {
    return canonical;
  }
  if (stintName === canonical) {
    return canonical;
  }
  if (driverHasNumberedStints(registry, driverId)) {
    return `${canonical}|${stintName}`;
  }
  return canonical;
}

function parseSwitchKeyNames(switchKey: string): string[] {
  return switchKey.split('|').map(s => s.trim()).filter(Boolean);
}

function switchKeysOverlap(a: string, b: string): boolean {
  const setA = new Set(parseSwitchKeyNames(a).map(n => normalizeName(n)));
  for (const name of parseSwitchKeyNames(b)) {
    if (setA.has(normalizeName(name))) return true;
  }
  return false;
}

function stripManualMarker(value: string): { value: string; isManual: boolean } {
  const isManual = value.includes(CAREER_RESULTS_MANUAL_MARKER);
  const cleaned = value.replace(CAREER_RESULTS_MANUAL_MARKER, '').trim();
  return { value: cleaned, isManual };
}

/** Parse driver rows from a Career Results `#switch` template. */
export function parseCareerResultsSwitchRows(wikitext: string): Map<string, CareerResultsRow> {
  const rows = new Map<string, CareerResultsRow>();
  if (!wikitext) return rows;

  for (const line of wikitext.split('\n')) {
    const match = line.match(/^\|([^=]+)=\s*(.*)$/);
    if (!match) continue;
    const switchKey = match[1].trim();
    if (switchKey === '#default') continue;

    const rawValue = match[2];
    const { value, isManual } = stripManualMarker(rawValue);
    rows.set(switchKey, { switchKey, value, isManual });
  }
  return rows;
}

function serializeCareerResultsRows(
  rows: Map<string, CareerResultsRow>,
  categoryLine: string
): string {
  const keys = Array.from(rows.keys());
  const maxKeyLen = Math.max(...keys.map(k => k.length), PAD_WIDTH);

  let wikitext = '{{#switch:{{{1}}}\n';
  for (const key of keys) {
    const row = rows.get(key)!;
    const paddedKey = key.padEnd(maxKeyLen, ' ');
    const suffix = row.isManual ? ` ${CAREER_RESULTS_MANUAL_MARKER}` : '';
    wikitext += `|${paddedKey} = ${row.value}${suffix}\n`;
  }
  wikitext += '|#default = \n';
  wikitext += categoryLine;
  return wikitext;
}

function extractCategorySuffix(wikitext: string): string {
  const idx = wikitext.indexOf('}}<noinclude>');
  if (idx === -1) {
    return '}}<noinclude>[[Category:2026 Results Templates]]</noinclude>';
  }
  return wikitext.slice(idx);
}

/**
 * Merge generated GP career results with existing wiki content.
 * Preserves rows marked `<!-- manual -->` and non-empty values when API is blank.
 */
export function mergeCareerResultsGpTemplate(
  existingWikitext: string,
  generatedWikitext: string
): { wikitext: string; changed: boolean } {
  const existing = parseCareerResultsSwitchRows(existingWikitext);
  const generated = parseCareerResultsSwitchRows(generatedWikitext);
  const categoryLine = extractCategorySuffix(generatedWikitext || existingWikitext);

  const merged = new Map<string, CareerResultsRow>();

  for (const [key, genRow] of generated) {
    let existingRow: CareerResultsRow | undefined = existing.get(key);
    if (!existingRow) {
      for (const [exKey, exRow] of existing) {
        if (switchKeysOverlap(exKey, key)) {
          existingRow = exRow;
          break;
        }
      }
    }

    if (existingRow?.isManual) {
      merged.set(key, { ...existingRow, switchKey: key });
      continue;
    }

    const genBlank = !genRow.value.trim();
    const exHasValue = !!existingRow?.value.trim();

    if (genBlank && exHasValue) {
      merged.set(key, {
        switchKey: key,
        value: existingRow!.value,
        isManual: existingRow!.isManual,
      });
      continue;
    }

    merged.set(key, { ...genRow });
  }

  for (const [exKey, exRow] of existing) {
    if (exRow.isManual) {
      const already = Array.from(merged.keys()).some(k => switchKeysOverlap(k, exKey));
      if (!already) {
        merged.set(exKey, exRow);
      }
    }
  }

  const result = serializeCareerResultsRows(merged, categoryLine);
  const changed = result.trim() !== (existingWikitext || '').trim();
  return { wikitext: result, changed };
}

export function generateStintAwareWikiResultsText(
  results: RaceResult[],
  registry: TeamDriversRegistry | null,
  testDriverNames: string[] = [],
  isSprint = false
): string {
  const rowMap = new Map<string, CareerResultsRow>();
  const driversWithStintRows = new Set<string>();

  for (const r of results) {
    const driverId = getRaceDriverId(r);
    const constructorId = getRaceConstructorId(r);
    if (!driverId || !constructorId) continue;

    const switchKey = buildStintSwitchKey(registry, driverId, constructorId);
    if (!switchKey) continue;

    rowMap.set(switchKey, {
      switchKey,
      value: formatRaceResultValue(r),
      isManual: false,
    });
    driversWithStintRows.add(driverId);
  }

  const raceDriverNames = new Set(WIKI_DRIVER_LIST.map(n => normalizeName(n)));

  for (const wikiName of WIKI_DRIVER_LIST) {
    const driverId = wikiNameToDriverId(wikiName);
    if (driverId && driversWithStintRows.has(driverId)) {
      continue;
    }

    const rosterConstructor = DRIVER_TO_CONSTRUCTOR_2026[driverId ?? ''];
    let switchKey = wikiName;
    if (driverId && registry && rosterConstructor) {
      const stintKey = buildStintSwitchKey(registry, driverId, rosterConstructor);
      if (stintKey && stintKey !== wikiName) {
        switchKey = stintKey;
      }
    }

    if (!rowMap.has(switchKey)) {
      rowMap.set(switchKey, { switchKey, value: '', isManual: false });
    }
  }

  // Fill-in drivers in results but not on the main wiki driver list (e.g. Tsunoda).
  for (const r of results) {
    const driverId = getRaceDriverId(r);
    const constructorId = getRaceConstructorId(r);
    if (!driverId || !constructorId) continue;

    const canonical = driverIdToWikiName[driverId];
    if (!canonical) continue;
    if (raceDriverNames.has(normalizeName(canonical))) continue;

    const switchKey = buildStintSwitchKey(registry, driverId, constructorId) || canonical;
    if (!rowMap.has(switchKey)) {
      rowMap.set(switchKey, {
        switchKey,
        value: formatRaceResultValue(r),
        isManual: false,
      });
    }
  }

  const uniqueTestDrivers: string[] = [];
  const seenTest = new Set<string>();
  for (const name of testDriverNames) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || raceDriverNames.has(normalizeName(trimmed)) || seenTest.has(key)) continue;
    seenTest.add(key);
    uniqueTestDrivers.push(trimmed);
  }

  for (const wikiName of uniqueTestDrivers) {
    rowMap.set(wikiName, { switchKey: wikiName, value: '{{TD}}', isManual: false });
  }

  const orderedKeys: string[] = [];
  const seenKeys = new Set<string>();

  const addKey = (key: string) => {
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      orderedKeys.push(key);
    }
  };

  for (const wikiName of WIKI_DRIVER_LIST) {
    const driverId = wikiNameToDriverId(wikiName);
    if (driverId && driversWithStintRows.has(driverId)) {
      for (const [key] of rowMap) {
        if (key.includes('|') && key.split('|').some(p => normalizeName(p) === normalizeName(wikiName))) {
          addKey(key);
        }
      }
      continue;
    }
    const rosterConstructor = DRIVER_TO_CONSTRUCTOR_2026[driverId ?? ''];
    let switchKey = wikiName;
    if (driverId && registry && rosterConstructor) {
      const built = buildStintSwitchKey(registry, driverId, rosterConstructor);
      if (built) switchKey = built;
    }
    if (rowMap.has(switchKey)) addKey(switchKey);
    else if (rowMap.has(wikiName)) addKey(wikiName);
  }

  for (const key of rowMap.keys()) {
    addKey(key);
  }

  const orderedRows = new Map<string, CareerResultsRow>();
  for (const key of orderedKeys) {
    const row = rowMap.get(key);
    if (row) orderedRows.set(key, row);
  }

  const category = isSprint
    ? '}}<noinclude>[[Category:2026 Results Templates]]</noinclude>'
    : '}}<noinclude>[[Category:2026 Results Templates]]</noinclude>';

  return serializeCareerResultsRows(orderedRows, category);
}

/** Sum race points per (driverId, constructorId) across completed rounds. */
export function computeStintPointsFromRaces(
  raceResults: RaceResult[],
  registry: TeamDriversRegistry
): Map<string, number> {
  const sums = new Map<string, number>();

  for (const r of raceResults) {
    const driverId = getRaceDriverId(r);
    const constructorId = getRaceConstructorId(r);
    if (!driverId || !constructorId) continue;

    const stintName = getStintWikiName(registry, driverId, constructorId);
    if (!stintName) continue;

    const pts = parseFloat(r.points) || 0;
    sums.set(stintName, (sums.get(stintName) ?? 0) + pts);
  }

  return sums;
}

export interface StintPointsExtras {
  /** stint wiki name → points string */
  stintRows: Record<string, string>;
}

/** Build extra Points/2026 rows for numbered stint keys from Team Drivers. */
export function buildStintPointsExtras(
  standings: DriverStanding[],
  registry: TeamDriversRegistry,
  raceResults: RaceResult[]
): StintPointsExtras {
  const stintSums = computeStintPointsFromRaces(raceResults, registry);
  const stintRows: Record<string, string> = {};

  const driversWithStints = new Set(
    registry.stints
      .filter(s => s.driverId && s.stintWikiName !== s.canonicalWikiName)
      .map(s => s.driverId as string)
  );

  const standingPoints = new Map<string, number>();
  for (const s of standings) {
    standingPoints.set(s.Driver.driverId, parseFloat(s.points) || 0);
  }

  for (const driverId of driversWithStints) {
    const entries = registry.stintsByDriverId.get(driverId) ?? [];
    const numbered = entries.filter(e => e.stintWikiName !== e.canonicalWikiName);
    if (numbered.length === 0) continue;

    const rosterConstructor = DRIVER_TO_CONSTRUCTOR_2026[driverId];
    const canonicalTotal = standingPoints.get(driverId) ?? 0;
    let crossTeamTotal = 0;

    for (const entry of numbered) {
      if (rosterConstructor && entry.constructorId === rosterConstructor) {
        continue;
      }
      const pts = stintSums.get(entry.stintWikiName) ?? 0;
      stintRows[entry.stintWikiName] = formatPointsValue(pts);
      crossTeamTotal += pts;
    }

    for (const entry of numbered) {
      if (!rosterConstructor || entry.constructorId !== rosterConstructor) continue;
      const homePts = Math.max(0, canonicalTotal - crossTeamTotal);
      stintRows[entry.stintWikiName] = formatPointsValue(homePts);
    }
  }

  // Include zero-point stint slots referenced in Team Drivers (e.g. Tsunoda).
  for (const entry of registry.stints) {
    if (entry.stintWikiName === entry.canonicalWikiName) continue;
    if (!(entry.stintWikiName in stintRows)) {
      stintRows[entry.stintWikiName] = '0';
    }
  }

  return { stintRows };
}

function formatPointsValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

function getDriverWikiName(driver: { driverId: string; givenName: string; familyName: string }): string {
  const customMap: Record<string, string> = {
    sainz: 'Carlos Sainz, Jr.',
    bottas: 'Valtteri Bottas',
  };
  if (customMap[driver.driverId]) {
    return customMap[driver.driverId];
  }
  return `${driver.givenName} ${driver.familyName}`;
}

/** Merge generated Points wikitext with existing, preserving manual rows and extras. */
export function mergeCareerPointsWikitext(
  existingWikitext: string,
  generatedRows: Map<string, string>,
  standingsOrder: string[] = []
): { wikitext: string; changed: boolean } {
  const existing = parseCareerResultsSwitchRows(existingWikitext);
  const merged = new Map<string, CareerResultsRow>();

  for (const [key, value] of generatedRows) {
    const ex = existing.get(key);
    if (ex?.isManual) {
      merged.set(key, ex);
    } else {
      merged.set(key, { switchKey: key, value, isManual: false });
    }
  }

  for (const [key, row] of existing) {
    if (row.isManual) {
      merged.set(key, row);
      continue;
    }
    if (!merged.has(key) && isExtraPointsKey(key)) {
      merged.set(key, row);
    }
  }

  const orderIndex = new Map<string, number>();
  standingsOrder.forEach((name, idx) => orderIndex.set(name, idx));

  const keys = Array.from(merged.keys()).sort((a, b) => {
    const aIdx = orderIndex.has(a) ? orderIndex.get(a)! : 1000;
    const bIdx = orderIndex.has(b) ? orderIndex.get(b)! : 1000;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b);
  });

  const categoryLine =
    existingWikitext.includes('Career Results Templates')
      ? existingWikitext.slice(existingWikitext.indexOf('}}<noinclude>'))
      : '}}<noinclude>[[Category:Career Results Templates]][[Category:2026 Results Templates]]</noinclude>';

  const maxLen = Math.max(...keys.map(k => k.length), 1);

  let wikitext = '{{#switch:{{{1}}}\n';
  for (const key of keys) {
    const row = merged.get(key)!;
    const padded = key.padEnd(maxLen, ' ');
    const suffix = row.isManual ? ` ${CAREER_RESULTS_MANUAL_MARKER}` : '';
    wikitext += `|${padded} = ${row.value}${suffix}\n`;
  }
  wikitext += '|#default = 0\n';
  wikitext += categoryLine;

  const changed = wikitext.trim() !== (existingWikitext || '').trim();
  return { wikitext, changed };
}

function isExtraPointsKey(key: string): boolean {
  return /\boffset\s*$/i.test(key) || /\bdeduction\s*$/i.test(key);
}

/** Build canonical driver points rows plus stint split rows. */
export function buildCareerPointsRows(
  standings: DriverStanding[],
  registry: TeamDriversRegistry | null,
  raceResults: RaceResult[]
): Map<string, string> {
  const rows = new Map<string, string>();

  for (const s of standings) {
    const wikiName = getDriverWikiName(s.Driver);
    rows.set(wikiName, s.points);
  }

  if (registry) {
    const extras = buildStintPointsExtras(standings, registry, raceResults);
    for (const [stintName, pts] of Object.entries(extras.stintRows)) {
      rows.set(stintName, pts);
    }
  }

  return rows;
}
