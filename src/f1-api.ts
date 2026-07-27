import {
  cachedJolpicaJson,
  createF1ApiContext,
  createF1ApiContextFromEnv,
  F1ApiContext,
  isJolpicaUrlCached,
  invalidateSeasonStandingsCache,
  CachedScheduleRace,
  ACTIVE_F1_SEASON,
} from './f1-api-cache';
import { trackedKvPut } from './kv-ops';
import { extractPdfText } from './fia-pdf-parser';
import { DRIVER_TO_CONSTRUCTOR_2026 } from './season-roster-2026';

export {
  createF1ApiContext,
  createF1ApiContextFromEnv,
  F1ApiContext,
  ACTIVE_F1_SEASON,
  invalidateSeasonStandingsCache,
};

export interface Driver {
  driverId: string;
  permanentNumber: string;
  code: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

export interface Constructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface RaceResult {
  number: string;
  position: string;
  positionText: string;
  grid: string;
  points: string;
  driver: Driver;
  constructor: Constructor;
  laps: string;
  status: string;
  Time?: {
    millis: string;
    time: string;
  };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: {
      time: string;
    };
    AverageSpeed: {
      units: string;
      speed: string;
    };
  };
}

export interface QualifyingResult {
  number: string;
  position: string;
  driver: Driver;
  constructor: Constructor;
  Q1: string;
  Q2?: string;
  Q3?: string;
}

/** True when at least one driver has a real Q1/Q2/Q3 time (not blank/nan). */
export function hasQualifyingSessionTimes(
  results: Array<{ Q1?: string; Q2?: string; Q3?: string }>
): boolean {
  return results.some(q =>
    [q.Q1, q.Q2, q.Q3].some(t => typeof t === 'string' && t.trim() !== '' && t !== 'nan')
  );
}

export interface DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface ConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}

export interface ScheduleRace {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: {
      lat: string;
      long: string;
      locality: string;
      country: string;
    };
  };
  date: string;
  time?: string;
  FirstPractice?: {
    date: string;
    time?: string;
  };
  SecondPractice?: {
    date: string;
    time?: string;
  };
  ThirdPractice?: {
    date: string;
    time?: string;
  };
  Qualifying?: {
    date: string;
    time?: string;
  };
  Sprint?: {
    date: string;
    time?: string;
  };
  SprintQualifying?: {
    date: string;
    time?: string;
  };
}

export interface PracticeSessionData {
  position: string;
  number: string;
  driverName: string;
  teamName: string;
  time: string;
}

export interface PracticeResults {
  FP1: Record<string, PracticeSessionData>;
  FP2: Record<string, PracticeSessionData>;
  FP3: Record<string, PracticeSessionData>;
}

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

function normalizeScheduleRaces(races: ScheduleRace[], year: number): ScheduleRace[] {
  return races.map(race => {
    if (race.raceName === 'Brazilian Grand Prix' && year >= 2021) {
      return { ...race, raceName: 'São Paulo Grand Prix' };
    }
    if (race.raceName === 'Barcelona Grand Prix' && year === 2026) {
      return { ...race, raceName: 'Barcelona-Catalunya Grand Prix' };
    }
    return race;
  });
}

function scheduleCacheKey(year: number): string {
  return `${BASE_URL}/${year}.json?limit=1000`;
}

/** Highest round whose race has ended (start + 2 hours). */
export function getLatestConcludedRound(schedule: ScheduleRace[], now = new Date()): number {
  let latest = 0;
  for (const race of schedule) {
    const start = new Date(`${race.date}T${race.time || '12:00:00Z'}`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    if (now >= end) {
      latest = Math.max(latest, parseInt(race.round, 10));
    }
  }
  return latest;
}

// Fetch season schedule
export async function getSchedule(year: number, ctx?: F1ApiContext): Promise<ScheduleRace[]> {
  const url = scheduleCacheKey(year);
  const fromCache = ctx ? await isJolpicaUrlCached(url, ctx) : false;
  if (!fromCache) {
    console.log(`Fetching ${year} schedule from Jolpi...`);
  }
  const races = await cachedJolpicaJson(url, ctx, (data: any) => {
    const list = data.MRData.RaceTable.Races as ScheduleRace[];
    if (!list || list.length === 0) {
      throw new Error(`Jolpica API returned no races for ${year}`);
    }
    return normalizeScheduleRaces(list, year);
  });
  if (ctx) {
    const activeYear = ctx.activeSeasonYear ?? ACTIVE_F1_SEASON;
    if (year === activeYear) {
      ctx.latestConcludedRound = getLatestConcludedRound(races);
      ctx.schedule = races;
    }
  }
  return races;
}

/** Restore the active-season schedule on ctx after auxiliary schedule fetches. */
export function setActiveSeasonSchedule(ctx: F1ApiContext, races: ScheduleRace[]): void {
  ctx.schedule = races;
  ctx.latestConcludedRound = getLatestConcludedRound(races);
}

export async function getScheduleWithRetry(
  year: number,
  attempts = 3,
  delayMs = 1000,
  ctx?: F1ApiContext
): Promise<ScheduleRace[]> {
  if (ctx) {
    return getSchedule(year, ctx);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await getSchedule(year);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const backoff = delayMs * attempt;
        console.warn(`getSchedule(${year}) attempt ${attempt} failed, retrying in ${backoff}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }
  throw lastError;
}

function mapRaceResults(rawResults: any[]): RaceResult[] {
  return rawResults.map((r: any) => ({
    ...r,
    driver: r.Driver,
    constructor: r.Constructor
  }));
}

// Fetch race results
export async function getRaceResult(
  year: number,
  round: number,
  isSprint = false,
  ctx?: F1ApiContext
): Promise<RaceResult[]> {
  const endpoint = isSprint ? 'sprint' : 'results';
  const url = `${BASE_URL}/${year}/${round}/${endpoint}.json?limit=1000`;

  const results = await cachedJolpicaJson(url, ctx, (data: any) => {
    const races = data.MRData.RaceTable.Races;
    if (!races || races.length === 0) return [];
    const resultsKey = isSprint ? 'SprintResults' : 'Results';
    return mapRaceResults(races[0][resultsKey] || []);
  });

  const hasNullGrid = results.some((r: any) => r.grid === null || r.grid === undefined);
  if (hasNullGrid) {
    try {
      const qualiResults = await getQualifyingResult(year, round, ctx);
      if (qualiResults && qualiResults.length > 0) {
        const qualiMap = new Map<string, string>();
        qualiResults.forEach((q: any) => {
          if (q.driver && q.driver.driverId) {
            qualiMap.set(q.driver.driverId, q.position);
          }
        });
        for (const r of results) {
          if ((r.grid === null || r.grid === undefined) && r.driver && r.driver.driverId) {
            const qualiPos = qualiMap.get(r.driver.driverId);
            if (qualiPos) {
              r.grid = qualiPos;
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch qualifying fallback for grid:", e);
    }
  }

  return results;
}

// Fetch qualifying results
export async function getQualifyingResult(
  year: number,
  round: number,
  ctx?: F1ApiContext
): Promise<QualifyingResult[]> {
  const url = `${BASE_URL}/${year}/${round}/qualifying.json?limit=1000`;
  return cachedJolpicaJson(url, ctx, (data: any) => {
    const races = data.MRData.RaceTable.Races;
    if (!races || races.length === 0) return [];
    const rawResults = races[0].QualifyingResults || [];
    return rawResults.map((q: any) => ({
      ...q,
      driver: q.Driver,
      constructor: q.Constructor
    }));
  });
}

// Fetch driver standings
export async function getDriverStandings(
  year: number,
  round?: number,
  ctx?: F1ApiContext
): Promise<DriverStanding[]> {
  const suffix = round ? `/${round}` : '';
  const url = `${BASE_URL}/${year}${suffix}/driverStandings.json?limit=1000`;
  return cachedJolpicaJson(url, ctx, (data: any) => {
    const lists = data.MRData.StandingsTable.StandingsLists;
    if (!lists || lists.length === 0) return [];
    // Reject payloads whose reported round does not match the requested round
    // (avoids publishing prior-round points onto a GP page after race end).
    if (round !== undefined) {
      const reported = lists[0].round ? parseInt(lists[0].round, 10) : 0;
      if (reported !== round) return [];
    }
    return lists[0].DriverStandings || [];
  });
}

// Fetch constructor standings
export async function getConstructorStandings(
  year: number,
  round?: number,
  ctx?: F1ApiContext
): Promise<ConstructorStanding[]> {
  const suffix = round ? `/${round}` : '';
  const url = `${BASE_URL}/${year}${suffix}/constructorStandings.json?limit=1000`;
  return cachedJolpicaJson(url, ctx, (data: any) => {
    const lists = data.MRData.StandingsTable.StandingsLists;
    if (!lists || lists.length === 0) return [];
    if (round !== undefined) {
      const reported = lists[0].round ? parseInt(lists[0].round, 10) : 0;
      if (reported !== round) return [];
    }
    return lists[0].ConstructorStandings || [];
  });
}

// Fetch list of drivers for a race (to initialize practice entries)
export async function getDriversForRace(
  year: number,
  round: number,
  ctx?: F1ApiContext
): Promise<Driver[]> {
  const url = `${BASE_URL}/${year}/${round}/drivers.json?limit=1000`;
  return cachedJolpicaJson(url, ctx, (data: any) => data.MRData.DriverTable.Drivers || []);
}

/** Season-wide driver list in one Jolpica call (no per-round walk). */
export async function getSeasonDrivers(
  year: number,
  ctx?: F1ApiContext
): Promise<Driver[]> {
  const url = `${BASE_URL}/${year}/drivers.json?limit=1000`;
  return cachedJolpicaJson(url, ctx, (data: any) => data.MRData.DriverTable.Drivers || []);
}

/**
 * Resolve drivers for a round with bulk endpoints only.
 * Prefer the round list; on true empty/error use season drivers (1 call), then at most
 * one prior round. Never walks R-1…R-N (that amplified Jolpica 429s).
 */
export async function getDriversForRaceWithFallback(
  year: number,
  round: number,
  ctx?: F1ApiContext
): Promise<Driver[]> {
  try {
    const drivers = await getDriversForRace(year, round, ctx);
    if (drivers.length > 0) return drivers;
  } catch (e: any) {
    console.warn(
      `getDriversForRace(${year}, ${round}) failed; trying season drivers instead of prior-round walk:`,
      e?.message || e
    );
  }

  try {
    const seasonDrivers = await getSeasonDrivers(year, ctx);
    if (seasonDrivers.length > 0) return seasonDrivers;
  } catch (e: any) {
    console.warn(`getSeasonDrivers(${year}) failed:`, e?.message || e);
  }

  if (round > 1) {
    try {
      const prev = await getDriversForRace(year, round - 1, ctx);
      if (prev.length > 0) return prev;
    } catch (e: any) {
      console.warn(
        `getDriversForRace(${year}, ${round - 1}) prior-round fallback failed:`,
        e?.message || e
      );
    }
  }

  return [];
}

/** Collect unique Driver objects from standings / race / quali payloads (0 extra Jolpica calls). */
export function driversFromBulkPayloads(sources: {
  standings?: DriverStanding[] | null;
  results?: Array<{ driver?: Driver }> | null;
  quali?: Array<{ driver?: Driver }> | null;
}): Driver[] {
  const byId = new Map<string, Driver>();
  const add = (driver?: Driver) => {
    if (driver?.driverId && !byId.has(driver.driverId)) {
      byId.set(driver.driverId, driver);
    }
  };
  for (const s of sources.standings ?? []) add(s.Driver);
  for (const r of sources.results ?? []) add(r.driver);
  for (const q of sources.quali ?? []) add(q.driver);
  return [...byId.values()];
}

/** Fetch lap chart data for a round (used by stats). */
export async function getLapChart(
  year: number,
  round: number,
  ctx?: F1ApiContext
): Promise<Array<{ Timings: Array<{ driverId: string }> }>> {
  const url = `${BASE_URL}/${year}/${round}/laps.json?limit=2000`;
  return cachedJolpicaJson(url, ctx, (data: any) => {
    const races = data?.MRData?.RaceTable?.Races || data?.MRData?.LapsTable?.Races || [];
    return races[0]?.Laps || [];
  });
}

// Parse HTML string from F1.com practice session results
export function parsePracticeHTML(html: string): Record<string, PracticeSessionData> {
  const results: Record<string, PracticeSessionData> = {};

  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const cells: string[] = [];
    let tdMatch;

    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      const cleanCell = tdMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cleanCell);
    }

    if (cells.length >= 5) {
      const position = cells[0];
      const number = cells[1];
      const rawDriverName = cells[2];
      const teamName = cells[3];
      const time = cells[4];

      if (/^\d+$/.test(position)) {
        results[rawDriverName] = {
          position,
          number,
          driverName: rawDriverName,
          teamName,
          time
        };
      }
    }
  }

  return results;
}

// Map practice results using fetched drivers to resolve name formats
export function mapDriverNames(
  scrapedData: Record<string, PracticeSessionData>,
  drivers: Driver[]
): Record<string, PracticeSessionData> {
  const mappedResults: Record<string, PracticeSessionData> = {};

  const mapping: Record<string, Driver> = {};
  for (const driver of drivers) {
    const key1 = `${driver.givenName}${driver.familyName}${driver.code}`.replace(/[\s'-]/g, '');
    const key2 = `${driver.givenName}${driver.familyName}`.replace(/[\s'-]/g, '');
    mapping[key1.toLowerCase()] = driver;
    mapping[key2.toLowerCase()] = driver;
    mapping[driver.driverId.toLowerCase()] = driver;
    mapping[`${driver.givenName} ${driver.familyName}`.toLowerCase()] = driver;
  }

  const customMapping: Record<string, string> = {
    'nico hulkenberg': 'Nico Hülkenberg',
    'nicohulkenberghul': 'Nico Hülkenberg',
    'nico hülkenberghul': 'Nico Hülkenberg',
    'nico hülkenberg': 'Nico Hülkenberg',
    'ryo hirakawa': 'Ryō Hirakawa',
    'ryō hirakawa': 'Ryō Hirakawa',
    'ryohirakawa': 'Ryō Hirakawa',
    'franco colapintocol': 'Franco Colapinto',
    'gabriel bortoletobor': 'Gabriel Bortoleto',
    'kimi antonelliant': 'Andrea Kimi Antonelli',
    'andrea kimi antonelliant': 'Andrea Kimi Antonelli'
  };

  for (const [rawName, data] of Object.entries(scrapedData)) {
    const cleanKey = rawName.replace(/[\s'-]/g, '').toLowerCase();

    let matchedDriver: Driver | null = null;
    if (mapping[cleanKey]) {
      matchedDriver = mapping[cleanKey];
    } else {
      for (const [key, driver] of Object.entries(mapping)) {
        if (cleanKey.includes(key) || key.includes(cleanKey)) {
          matchedDriver = driver;
          break;
        }
      }
    }

    let resolvedName = rawName;
    if (matchedDriver) {
      resolvedName = `${matchedDriver.givenName} ${matchedDriver.familyName}`;
    } else {
      const keyLower = rawName.toLowerCase();
      for (const [k, v] of Object.entries(customMapping)) {
        if (keyLower.includes(k) || k.includes(keyLower)) {
          resolvedName = v;
          break;
        }
      }
    }

    mappedResults[resolvedName] = {
      ...data,
      driverName: resolvedName
    };
  }

  return mappedResults;
}

// Main scrape runner for practice sessions
export async function scrapePracticeSession(url: string, drivers: Driver[]): Promise<Record<string, PracticeSessionData>> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch F1.com practice page: Status ${res.status}`);
  const html = await res.text();

  const parsed = parsePracticeHTML(html);
  return mapDriverNames(parsed, drivers);
}

const RACING_KEY_MAPPING: Record<string, string> = {
  "australian": "australia",
  "bahrain": "bahrain",
  "saudi arabian": "saudi-arabia",
  "chinese": "china",
  "miami": "miami",
  "emilia romagna": "emilia-romagna",
  "monaco": "monaco",
  "canadian": "canada",
  "spanish": "spain",
  "austrian": "austria",
  "british": "great-britain",
  "hungarian": "hungary",
  "belgian": "belgium",
  "dutch": "netherlands",
  "italian": "italy",
  "azerbaijan": "azerbaijan",
  "singapore": "singapore",
  "united states": "united-states",
  "mexican": "mexico",
  "mexico city": "mexico",
  "brazilian": "brazil",
  "são paulo": "brazil",
  "las vegas": "las-vegas",
  "qatar": "qatar",
  "abu dhabi": "abu-dhabi"
};

export function getF1RacingKey(raceName: string): string {
  const nameLower = raceName.toLowerCase();
  for (const [key, val] of Object.entries(RACING_KEY_MAPPING)) {
    if (nameLower.includes(key)) {
      return val;
    }
  }
  return nameLower.replace(" grand prix", "").trim().replace(/\s+/g, "-");
}



/** Dynamic F1.com race ID for 2026 season (2-ID gap after Round 3). */
export function getF1comRaceId(year: number, round: number): string {
  if (year === 2026) {
    return round <= 3 ? String(1278 + round) : String(1280 + round);
  }
  return String(1278 + round);
}

export function buildPracticeSessionUrl(
  year: number,
  round: number,
  raceName: string,
  session: 1 | 2 | 3
): string {
  const raceId = getF1comRaceId(year, round);
  const raceSlug = getF1RacingKey(raceName);
  return `https://www.formula1.com/en/results/${year}/races/${raceId}/${raceSlug}/practice/${session}`;
}

function cleanOfficialName(name: string): string {
  let titleCase = name.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
  titleCase = titleCase.replace(/\bDe\b/g, "de");
  titleCase = titleCase.replace(/\bF1\b/gi, "Formula 1");
  return titleCase;
}

export async function fetchOfficialRaceName(year: number, racingKey: string): Promise<string | null> {
  const url = `https://www.formula1.com/en/racing/${year}/${racingKey}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();

    const nameMatch = html.match(/"@type"\s*:\s*"SportsEvent"[^}]+?"name"\s*:\s*"([^"]+)"/);
    if (nameMatch && nameMatch[1]) {
      return cleanOfficialName(nameMatch[1]);
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return cleanOfficialName(titleMatch[1].replace(" - F1 Race", "").trim());
    }

    return null;
  } catch (e) {
    console.error("Error fetching official race name:", e);
    return null;
  }
}

/**
 * Batch-fetch Jolpica data for a race round in one pass (deduplicated via ctx).
 */
export async function fetchRoundJolpicaData(
  year: number,
  round: number,
  options: {
    needQuali: boolean;
    needGpResults: boolean;
    needSprintResults: boolean;
    needStandings: boolean;
    needDrivers: boolean;
    hasSprint: boolean;
    needSprintQuali: boolean;
    race?: CachedScheduleRace;
  },
  ctx?: F1ApiContext
): Promise<{
  qualiResults: QualifyingResult[];
  gpResults: RaceResult[];
  sprintResults: RaceResult[];
  sprintQualiResults: QualifyingResult[];
  drivers: Driver[];
  currentDrivers: DriverStanding[];
  prevDrivers: DriverStanding[] | null;
  currentConstructors: ConstructorStanding[];
  prevConstructors: ConstructorStanding[] | null;
}> {
  const {
    needQuali,
    needGpResults,
    needSprintResults,
    needStandings,
    needDrivers,
    hasSprint,
    needSprintQuali,
    race: raceForRound,
  } = options;

  // Fetch bulk round payloads in parallel. Drivers are derived from these when possible
  // so we avoid a separate /drivers.json call (and never fan out per-driver constructor URLs).
  const [
    jolpicaQualiResults,
    gpResults,
    sprintResults,
    currentDrivers,
    prevDrivers,
    currentConstructors,
    prevConstructors,
  ] = await Promise.all([
    needQuali ? getQualifyingResult(year, round, ctx).catch(() => []) : Promise.resolve([]),
    needGpResults ? getRaceResult(year, round, false, ctx).catch(() => []) : Promise.resolve([]),
    needSprintResults && hasSprint ? getRaceResult(year, round, true, ctx).catch(() => []) : Promise.resolve([]),
    needStandings ? getDriverStandings(year, round, ctx).catch(() => []) : Promise.resolve([]),
    needStandings && round > 1 ? getDriverStandings(year, round - 1, ctx).catch(() => null) : Promise.resolve(null),
    needStandings ? getConstructorStandings(year, round, ctx).catch(() => []) : Promise.resolve([]),
    needStandings && round > 1 ? getConstructorStandings(year, round - 1, ctx).catch(() => null) : Promise.resolve(null),
  ]);

  let drivers: Driver[] = [];
  if (needDrivers || needSprintQuali || needQuali) {
    drivers = driversFromBulkPayloads({
      standings: currentDrivers.length > 0 ? currentDrivers : prevDrivers,
      results: [...gpResults, ...sprintResults],
      quali: jolpicaQualiResults,
    });
    if (drivers.length === 0) {
      drivers = await getDriversForRaceWithFallback(year, round, ctx).catch(() => []);
    }
  }

  let qualiResults = jolpicaQualiResults;
  if (needQuali && !hasQualifyingSessionTimes(qualiResults)) {
    const race = raceForRound ?? ctx?.schedule?.find(r => parseInt(r.round, 10) === round);
    if (race) {
      const openF1Quali = await getOpenF1QualifyingResult(
        year,
        round,
        race,
        ctx,
        currentDrivers,
        prevDrivers,
        drivers
      ).catch(e => {
        console.error("Failed to fetch OpenF1 Qualifying results:", e);
        return [] as QualifyingResult[];
      });
      if (hasQualifyingSessionTimes(openF1Quali)) {
        console.log(
          qualiResults.length > 0
            ? `Jolpica qualifying for round ${round} lacked times; using OpenF1 fallback (${openF1Quali.length} drivers).`
            : `Jolpica qualifying empty for round ${round}; using OpenF1 fallback (${openF1Quali.length} drivers).`
        );
        qualiResults = openF1Quali;
      } else if (qualiResults.length > 0) {
        console.log(
          `Qualifying results for round ${round} have driver order but no session times yet; will retry later.`
        );
      }
    }
  }

  let sprintQualiResults: QualifyingResult[] = [];
  if (needSprintQuali && hasSprint) {
    const race = raceForRound ?? ctx?.schedule?.find(r => parseInt(r.round, 10) === round);
    if (race) {
      sprintQualiResults = await getOpenF1SprintQualifyingResult(
        year,
        round,
        race,
        ctx,
        currentDrivers,
        prevDrivers,
        drivers
      ).catch(e => {
        console.error("Failed to fetch OpenF1 Sprint Qualifying results:", e);
        return [];
      });
    } else {
      console.warn(`Could not find race for round ${round} in schedule cache for Sprint Qualifying fetch.`);
    }
  }

  return {
    qualiResults,
    gpResults,
    sprintResults,
    sprintQualiResults,
    drivers,
    currentDrivers,
    prevDrivers,
    currentConstructors,
    prevConstructors,
  };
}

export async function parsePDF(pdfBuffer: Uint8Array): Promise<string> {
  return extractPdfText(pdfBuffer);
}

export function getFiaRaceNameSlug(raceName: string): string {
  return raceName.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export function buildFiaEntryListUrl(year: number, raceName: string): string {
  const raceNameSlug = getFiaRaceNameSlug(raceName);
  return `https://www.fia.com/system/files/decision-document/${year}_${raceNameSlug}_-_entry_list.pdf`;
}

export async function fetchFiaEntryListText(year: number, raceName: string): Promise<string | null> {
  const url = buildFiaEntryListUrl(year, raceName);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      console.warn(`FIA Entry List PDF not found (HTTP ${res.status}): ${url}`);
      return null;
    }
    const pdfBuf = new Uint8Array(await res.arrayBuffer());
    return await parsePDF(pdfBuf);
  } catch (e: any) {
    console.warn(`Failed to fetch or parse FIA Entry List PDF from ${url}:`, e.message);
    return null;
  }
}

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  date_start: string;
  circuit_short_name?: string;
  circuit_key?: number;
  meeting_key?: number;
}

export interface OpenF1SessionResult {
  position: number;
  driver_number: number;
  duration: (number | null)[];
  gap_to_leader: (number | null)[];
  dns: boolean;
  dnf: boolean;
  dsq: boolean;
}

const OPENF1_SESSION_MATCH_WINDOW_DAYS = 4;

function normalizeCircuitToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function circuitsMatch(scheduleCircuitId: string, openF1ShortName: string): boolean {
  const scheduleToken = normalizeCircuitToken(scheduleCircuitId);
  const openF1Token = normalizeCircuitToken(openF1ShortName);
  if (!scheduleToken || !openF1Token) return false;
  if (scheduleToken === openF1Token || scheduleToken.includes(openF1Token) || openF1Token.includes(scheduleToken)) {
    return true;
  }

  const aliasGroups = [
    ['americas', 'austin'],
    ['spa', 'spafrancorchamps'],
    ['ricard', 'lecastellet'],
    ['redbullring', 'spielberg'],
    ['hungaroring', 'hungaroring'],
    ['marinabay', 'marinabay', 'singapore'],
  ];
  return aliasGroups.some(group =>
    group.some(token => scheduleToken.includes(token) || token.includes(scheduleToken)) &&
    group.some(token => openF1Token.includes(token) || token.includes(openF1Token))
  );
}

function matchOpenF1SessionNearDate(
  sessions: OpenF1Session[],
  race: CachedScheduleRace,
  targetDateStr: string
): OpenF1Session | undefined {
  const targetDate = new Date(`${targetDateStr}T12:00:00Z`);
  const circuitId = race.Circuit?.circuitId;

  let candidates = sessions;
  if (circuitId) {
    const byCircuit = sessions.filter(session =>
      session.circuit_short_name && circuitsMatch(circuitId, session.circuit_short_name)
    );
    if (byCircuit.length > 0) {
      candidates = byCircuit;
    }
  }

  let best: OpenF1Session | undefined;
  let bestDiffMs = Infinity;
  for (const session of candidates) {
    const sessionDate = new Date(session.date_start);
    const diffMs = Math.abs(sessionDate.getTime() - targetDate.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= OPENF1_SESSION_MATCH_WINDOW_DAYS && diffMs < bestDiffMs) {
      best = session;
      bestDiffMs = diffMs;
    }
  }
  return best;
}

/** Pick the closest Sprint Qualifying session for a race weekend (exported for tests). */
export function matchOpenF1SprintQualifyingSession(
  sessions: OpenF1Session[],
  race: CachedScheduleRace,
  round: number
): OpenF1Session | undefined {
  const targetDateStr = race.SprintQualifying?.date ?? race.date;
  const best = matchOpenF1SessionNearDate(sessions, race, targetDateStr);
  if (!best) {
    const raceName = race.raceName || 'Unknown';
    console.warn(`No matching OpenF1 Sprint Qualifying session found for round ${round} (${raceName})`);
  }
  return best;
}

/** Pick the closest Qualifying session for a race weekend (exported for tests). */
export function matchOpenF1QualifyingSession(
  sessions: OpenF1Session[],
  race: CachedScheduleRace,
  round: number
): OpenF1Session | undefined {
  const targetDateStr = race.Qualifying?.date ?? race.date;
  const best = matchOpenF1SessionNearDate(sessions, race, targetDateStr);
  if (!best) {
    const raceName = race.raceName || 'Unknown';
    console.warn(`No matching OpenF1 Qualifying session found for round ${round} (${raceName})`);
  }
  return best;
}

export async function fetchOpenF1Json<T>(
  url: string,
  ctx?: F1ApiContext,
  expirationTtl?: number
): Promise<T> {
  const cacheKey = `openf1:${url}`;
  if (ctx?.cache.has(cacheKey)) {
    return ctx.cache.get(cacheKey) as T;
  }

  if (ctx) {
    const existing = ctx.inFlight.get(cacheKey);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  if (ctx?.kv) {
    const raw = await ctx.kv.get(`f1_api_cache:${cacheKey}`);
    if (raw) {
      const data = JSON.parse(raw);
      ctx.cache.set(cacheKey, data);
      return data;
    }
  }

  const promise = (async (): Promise<T> => {
    console.log(`Fetching from OpenF1: ${url}`);
    if (ctx) ctx.apiCallCount++;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OpenF1 API error: ${res.statusText}`);
    }
    const rawText = await res.text();
    const data = JSON.parse(rawText);

    if (ctx) {
      ctx.cache.set(cacheKey, data);
      if (ctx.kv) {
        if (expirationTtl !== undefined) {
          await trackedKvPut(ctx.kv, `f1_api_cache:${cacheKey}`, rawText, { expirationTtl });
        } else {
          await trackedKvPut(ctx.kv, `f1_api_cache:${cacheKey}`, rawText);
        }
      }
    }
    return data;
  })();

  if (ctx) {
    ctx.inFlight.set(cacheKey, promise);
  }

  try {
    return await promise;
  } finally {
    if (ctx) {
      ctx.inFlight.delete(cacheKey);
    }
  }
}

export function formatOpenF1Time(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(3);
  const parts = remainingSeconds.split('.');
  const secInt = parts[0].padStart(2, '0');
  const secDec = parts[1] || '000';
  
  if (minutes > 0) {
    return `${minutes}:${secInt}.${secDec}`;
  }
  return `${secInt}.${secDec}`;
}

/** Format a single SQ segment, handling DNS/DSQ and missing times (exported for tests). */
export function formatOpenF1SessionSegmentTime(
  seconds: number | null | undefined,
  result: Pick<OpenF1SessionResult, 'dns' | 'dsq' | 'dnf'>,
  segmentIndex: number
): string {
  if (result.dns) return segmentIndex === 0 ? 'DNS' : '';
  if (result.dsq) return segmentIndex === 0 ? 'DSQ' : '';
  if (seconds === null || seconds === undefined) return '';
  return formatOpenF1Time(seconds);
}

function buildConstructorLookup(
  currentDrivers?: DriverStanding[],
  prevDrivers?: DriverStanding[] | null,
  resultsWithConstructors?: Array<{ driver?: Driver; constructor?: Constructor }> | null
): Map<string, Constructor> {
  const lookup = new Map<string, Constructor>();
  for (const standing of currentDrivers ?? []) {
    if (standing.Constructors?.[0]) {
      lookup.set(standing.Driver.driverId, standing.Constructors[0]);
    }
  }
  for (const standing of prevDrivers ?? []) {
    if (!lookup.has(standing.Driver.driverId) && standing.Constructors?.[0]) {
      lookup.set(standing.Driver.driverId, standing.Constructors[0]);
    }
  }
  for (const row of resultsWithConstructors ?? []) {
    const id = row.driver?.driverId;
    if (id && row.constructor && !lookup.has(id)) {
      lookup.set(id, row.constructor);
    }
  }
  return lookup;
}

function constructorFromSeasonRoster(driverId: string): Constructor | null {
  const constructorId = DRIVER_TO_CONSTRUCTOR_2026[driverId];
  if (!constructorId) return null;
  return { constructorId, url: '', name: constructorId, nationality: '' };
}

/**
 * Resolve constructors without per-driver Jolpica calls.
 * Order: standings / bulk results → 2026 season roster. Never N× /drivers/{id}/constructors.json.
 */
function resolveConstructorsForDrivers(
  driverIds: string[],
  currentDrivers?: DriverStanding[],
  prevDrivers?: DriverStanding[] | null,
  resultsWithConstructors?: Array<{ driver?: Driver; constructor?: Constructor }> | null
): Map<string, Constructor> {
  const lookup = buildConstructorLookup(currentDrivers, prevDrivers, resultsWithConstructors);
  for (const driverId of new Set(driverIds)) {
    if (lookup.has(driverId)) continue;
    const roster = constructorFromSeasonRoster(driverId);
    if (roster) lookup.set(driverId, roster);
  }
  return lookup;
}

/** @deprecated Prefer standings/results/roster — per-driver Jolpica constructor URLs are not used. */
export async function getDriverConstructorForSeason(
  _year: number,
  driverId: string,
  _ctx?: F1ApiContext
): Promise<Constructor | null> {
  return constructorFromSeasonRoster(driverId);
}

export async function getDriverConstructor(
  _year: number,
  driverId: string,
  _ctx?: F1ApiContext,
  currentDrivers?: DriverStanding[],
  prevDrivers?: DriverStanding[] | null
): Promise<Constructor | null> {
  if (currentDrivers) {
    const s = currentDrivers.find(x => x.Driver.driverId === driverId);
    if (s && s.Constructors && s.Constructors.length > 0) return s.Constructors[0];
  }
  if (prevDrivers) {
    const s = prevDrivers.find(x => x.Driver.driverId === driverId);
    if (s && s.Constructors && s.Constructors.length > 0) return s.Constructors[0];
  }
  return constructorFromSeasonRoster(driverId);
}

async function mapOpenF1SessionResultsToQualifying(
  year: number,
  round: number,
  results: OpenF1SessionResult[],
  ctx: F1ApiContext | undefined,
  currentDrivers?: DriverStanding[],
  prevDrivers?: DriverStanding[] | null,
  driversForRound?: Driver[]
): Promise<QualifyingResult[]> {
  results.sort((a, b) => a.position - b.position);
  const drivers = driversForRound ?? await getDriversForRaceWithFallback(year, round, ctx).catch(() => []);

  const resolvedDrivers: Driver[] = [];
  for (const r of results) {
    const driverNumStr = r.driver_number.toString();
    let driver = drivers.find(d => d.permanentNumber === driverNumStr);
    if (!driver && currentDrivers) {
      const standing = currentDrivers.find(s => s.Driver.permanentNumber === driverNumStr);
      if (standing) driver = standing.Driver;
    }
    if (!driver && prevDrivers) {
      const standing = prevDrivers.find(s => s.Driver.permanentNumber === driverNumStr);
      if (standing) driver = standing.Driver;
    }
    if (!driver) {
      driver = {
        driverId: `driver_${driverNumStr}`,
        permanentNumber: driverNumStr,
        code: `DRV`,
        url: ``,
        givenName: `Driver`,
        familyName: `#${driverNumStr}`,
        dateOfBirth: ``,
        nationality: ``,
      };
    }
    resolvedDrivers.push(driver);
  }

  const constructorLookup = resolveConstructorsForDrivers(
    resolvedDrivers.map(driver => driver.driverId),
    currentDrivers,
    prevDrivers
  );

  // Season roster is already applied inside resolveConstructorsForDrivers.
  const unknownConstructor: Constructor = {
    constructorId: 'unknown',
    url: '',
    name: 'Unknown',
    nationality: '',
  };

  return results.map((r, index) => {
    const driverNumStr = r.driver_number.toString();
    const driver = resolvedDrivers[index];
    const constructor = constructorLookup.get(driver.driverId) ?? unknownConstructor;

    return {
      number: driverNumStr,
      position: r.position.toString(),
      driver,
      constructor,
      Q1: formatOpenF1SessionSegmentTime(r.duration?.[0], r, 0),
      Q2: formatOpenF1SessionSegmentTime(r.duration?.[1], r, 1),
      Q3: formatOpenF1SessionSegmentTime(r.duration?.[2], r, 2),
    };
  });
}

export async function getOpenF1SprintQualifyingResult(
  year: number,
  round: number,
  race: CachedScheduleRace,
  ctx?: F1ApiContext,
  currentDrivers?: DriverStanding[],
  prevDrivers?: DriverStanding[] | null,
  driversForRound?: Driver[]
): Promise<QualifyingResult[]> {
  const sessionsUrl = `https://api.openf1.org/v1/sessions?session_name=Sprint%20Qualifying&year=${year}`;
  let sessions = await fetchOpenF1Json<OpenF1Session[]>(sessionsUrl, ctx, 86400 * 7);
  
  if ((!sessions || sessions.length === 0) && sessionsUrl.includes('session_name=Sprint%20Qualifying')) {
    const fallbackUrl = sessionsUrl.replace('session_name=Sprint%20Qualifying', 'session_name=Sprint%20Shootout');
    sessions = await fetchOpenF1Json<OpenF1Session[]>(fallbackUrl, ctx, 86400 * 7);
  }

  if (!sessions || sessions.length === 0) {
    console.warn(`No OpenF1 Sprint Qualifying sessions found for year ${year}`);
    return [];
  }

  const matchedSession = matchOpenF1SprintQualifyingSession(sessions, race, round);
  const raceName = race.raceName || 'Unknown';

  if (!matchedSession) {
    return [];
  }

  console.log(`Matched OpenF1 session_key ${matchedSession.session_key} for ${raceName}`);

  const resultsUrl = `https://api.openf1.org/v1/session_result?session_key=${matchedSession.session_key}`;
  const results = await fetchOpenF1Json<OpenF1SessionResult[]>(resultsUrl, ctx, 86400);

  if (!results || results.length === 0) {
    console.warn(`No OpenF1 session results found for session_key ${matchedSession.session_key}`);
    return [];
  }

  return mapOpenF1SessionResultsToQualifying(
    year,
    round,
    results,
    ctx,
    currentDrivers,
    prevDrivers,
    driversForRound
  );
}

export async function getOpenF1QualifyingResult(
  year: number,
  round: number,
  race: CachedScheduleRace,
  ctx?: F1ApiContext,
  currentDrivers?: DriverStanding[],
  prevDrivers?: DriverStanding[] | null,
  driversForRound?: Driver[]
): Promise<QualifyingResult[]> {
  const sessionsUrl = `https://api.openf1.org/v1/sessions?session_name=Qualifying&year=${year}`;
  const sessions = await fetchOpenF1Json<OpenF1Session[]>(sessionsUrl, ctx, 86400 * 7);

  if (!sessions || sessions.length === 0) {
    console.warn(`No OpenF1 Qualifying sessions found for year ${year}`);
    return [];
  }

  const matchedSession = matchOpenF1QualifyingSession(sessions, race, round);
  const raceName = race.raceName || 'Unknown';

  if (!matchedSession) {
    return [];
  }

  console.log(`Matched OpenF1 Qualifying session_key ${matchedSession.session_key} for ${raceName}`);

  const resultsUrl = `https://api.openf1.org/v1/session_result?session_key=${matchedSession.session_key}`;
  const results = await fetchOpenF1Json<OpenF1SessionResult[]>(resultsUrl, ctx, 86400);

  if (!results || results.length === 0) {
    console.warn(`No OpenF1 Qualifying results found for session_key ${matchedSession.session_key}`);
    return [];
  }

  return mapOpenF1SessionResultsToQualifying(
    year,
    round,
    results,
    ctx,
    currentDrivers,
    prevDrivers,
    driversForRound
  );
}

export interface OpenF1PracticeSessionResult {
  position: number;
  driver_number: number;
  duration?: number | null;
  gap_to_leader?: number | null;
  dns: boolean;
  dnf: boolean;
  dsq: boolean;
}

export interface OpenF1SessionDriver {
  driver_number: number;
  full_name: string;
  first_name: string;
  last_name: string;
  team_name: string;
  name_acronym: string;
}

function getPracticeSessionTargetDate(
  race: CachedScheduleRace,
  sessionNumber: 1 | 2 | 3
): string {
  if (sessionNumber === 1 && race.FirstPractice?.date) return race.FirstPractice.date;
  if (sessionNumber === 2 && race.SecondPractice?.date) return race.SecondPractice.date;
  if (sessionNumber === 3 && race.ThirdPractice?.date) return race.ThirdPractice.date;
  return race.date;
}

/** Pick the closest OpenF1 Practice session for a race weekend (exported for tests). */
export function matchOpenF1PracticeSession(
  sessions: OpenF1Session[],
  race: CachedScheduleRace,
  round: number,
  sessionNumber: 1 | 2 | 3
): OpenF1Session | undefined {
  const sessionName = `Practice ${sessionNumber}`;
  const namedSessions = sessions.filter(s => s.session_name === sessionName);
  if (namedSessions.length === 0) return undefined;

  const targetDateStr = getPracticeSessionTargetDate(race, sessionNumber);
  const targetDate = new Date(`${targetDateStr}T12:00:00Z`);
  const circuitId = race.Circuit?.circuitId;

  let candidates = namedSessions;
  if (circuitId) {
    const byCircuit = namedSessions.filter(session =>
      session.circuit_short_name && circuitsMatch(circuitId, session.circuit_short_name)
    );
    if (byCircuit.length > 0) {
      candidates = byCircuit;
    }
  }

  let best: OpenF1Session | undefined;
  let bestDiffMs = Infinity;
  for (const session of candidates) {
    const sessionDate = new Date(session.date_start);
    const diffMs = Math.abs(sessionDate.getTime() - targetDate.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= OPENF1_SESSION_MATCH_WINDOW_DAYS && diffMs < bestDiffMs) {
      best = session;
      bestDiffMs = diffMs;
    }
  }

  if (!best) {
    const raceName = race.raceName || 'Unknown';
    console.warn(`No matching OpenF1 ${sessionName} session found for round ${round} (${raceName})`);
  }
  return best;
}

export function formatOpenF1PracticeTime(result: Pick<OpenF1PracticeSessionResult, 'duration' | 'dns' | 'dsq'>): string {
  if (result.dns) return 'DNS';
  if (result.dsq) return 'DSQ';
  if (result.duration === null || result.duration === undefined) return '';
  return formatOpenF1Time(result.duration);
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function resolveOpenF1DriverName(
  driverNumber: number,
  sessionDriver: OpenF1SessionDriver | undefined,
  drivers: Driver[]
): string {
  const numStr = driverNumber.toString();
  const jolpicaDriver = drivers.find(d => d.permanentNumber === numStr);
  if (jolpicaDriver) {
    return `${jolpicaDriver.givenName} ${jolpicaDriver.familyName}`;
  }
  if (sessionDriver) {
    return `${titleCaseWord(sessionDriver.first_name)} ${titleCaseWord(sessionDriver.last_name)}`;
  }
  return `Driver #${numStr}`;
}

export function convertOpenF1PracticeResults(
  results: OpenF1PracticeSessionResult[],
  sessionDrivers: OpenF1SessionDriver[],
  drivers: Driver[]
): Record<string, PracticeSessionData> {
  const driverByNumber = new Map(sessionDrivers.map(d => [d.driver_number, d]));
  const parsed: Record<string, PracticeSessionData> = {};

  for (const result of results) {
    const sessionDriver = driverByNumber.get(result.driver_number);
    const driverName = resolveOpenF1DriverName(result.driver_number, sessionDriver, drivers);
    parsed[driverName] = {
      position: result.position.toString(),
      number: result.driver_number.toString(),
      driverName,
      teamName: sessionDriver?.team_name || '',
      time: formatOpenF1PracticeTime(result),
    };
  }

  return mapDriverNames(parsed, drivers);
}

export async function getOpenF1PracticeSessionResult(
  year: number,
  round: number,
  race: CachedScheduleRace,
  sessionNumber: 1 | 2 | 3,
  drivers: Driver[],
  ctx?: F1ApiContext
): Promise<Record<string, PracticeSessionData> | null> {
  const sessionName = encodeURIComponent(`Practice ${sessionNumber}`);
  const sessionsUrl = `https://api.openf1.org/v1/sessions?session_name=${sessionName}&year=${year}`;
  const sessions = await fetchOpenF1Json<OpenF1Session[]>(sessionsUrl, ctx, 86400 * 7);

  if (!sessions || sessions.length === 0) {
    console.warn(`No OpenF1 ${sessionName} sessions found for year ${year}`);
    return null;
  }

  const matchedSession = matchOpenF1PracticeSession(sessions, race, round, sessionNumber);
  if (!matchedSession) return null;

  const raceName = race.raceName || 'Unknown';
  console.log(`Matched OpenF1 ${sessionName} session_key ${matchedSession.session_key} for ${raceName}`);

  const [results, sessionDrivers] = await Promise.all([
    fetchOpenF1Json<OpenF1PracticeSessionResult[]>(
      `https://api.openf1.org/v1/session_result?session_key=${matchedSession.session_key}`,
      ctx,
      86400
    ),
    fetchOpenF1Json<OpenF1SessionDriver[]>(
      `https://api.openf1.org/v1/drivers?session_key=${matchedSession.session_key}`,
      ctx,
      86400
    ),
  ]);

  if (!results || results.length === 0) {
    console.warn(`No OpenF1 practice results found for session_key ${matchedSession.session_key}`);
    return null;
  }

  results.sort((a, b) => a.position - b.position);
  return convertOpenF1PracticeResults(results, sessionDrivers ?? [], drivers);
}

/** Fetch practice results from OpenF1, falling back to F1.com scraping when unavailable. */
export async function getPracticeSessionWithFallback(
  year: number,
  round: number,
  raceName: string,
  race: CachedScheduleRace,
  sessionNumber: 1 | 2 | 3,
  drivers: Driver[],
  ctx?: F1ApiContext
): Promise<Record<string, PracticeSessionData> | null> {
  try {
    const openF1Results = await getOpenF1PracticeSessionResult(year, round, race, sessionNumber, drivers, ctx);
    if (openF1Results && Object.keys(openF1Results).length > 0) {
      return openF1Results;
    }
  } catch (e: any) {
    console.warn(`OpenF1 Practice ${sessionNumber} fetch failed for round ${round}: ${e.message}`);
  }

  const url = buildPracticeSessionUrl(year, round, raceName, sessionNumber);
  console.log(`Falling back to F1.com scrape for Practice ${sessionNumber}: ${url}`);
  try {
    return await scrapePracticeSession(url, drivers);
  } catch (e: any) {
    console.warn(`F1.com Practice ${sessionNumber} scrape failed for round ${round}: ${e.message}`);
    return null;
  }
}

