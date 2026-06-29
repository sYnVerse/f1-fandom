import {
  cachedJolpicaJson,
  createF1ApiContext,
  createF1ApiContextFromEnv,
  F1ApiContext,
} from './f1-api-cache';

export { createF1ApiContext, createF1ApiContextFromEnv, F1ApiContext };

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
  const races = await cachedJolpicaJson(url, ctx, (data: any) => {
    const list = data.MRData.RaceTable.Races as ScheduleRace[];
    if (!list || list.length === 0) {
      throw new Error(`Jolpica API returned no races for ${year}`);
    }
    return normalizeScheduleRaces(list, year);
  });
  if (ctx) {
    ctx.latestConcludedRound = getLatestConcludedRound(races);
  }
  return races;
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

// Fetch list of drivers for a race, with recursive fallback to preceding races/seasons if empty
export async function getDriversForRaceWithFallback(
  year: number,
  round: number,
  ctx?: F1ApiContext
): Promise<Driver[]> {
  let drivers = await getDriversForRace(year, round, ctx).catch(() => []);
  let currentYear = year;
  let prevRound = round - 1;

  while (drivers.length === 0) {
    if (prevRound >= 1) {
      drivers = await getDriversForRace(currentYear, prevRound, ctx).catch(() => []);
      prevRound--;
    } else {
      currentYear--;
      try {
        const prevSchedule = await getSchedule(currentYear, ctx);
        if (prevSchedule && prevSchedule.length > 0) {
          prevRound = prevSchedule.length;
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
  }
  return drivers;
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

/** Slug used in F1.com results URLs (e.g. austrian-grand-prix). */
export function getF1RaceNameSlug(raceName: string): string {
  return raceName.toLowerCase().replace(/\s+/g, '-');
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
  const raceSlug = getF1RaceNameSlug(raceName);
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
  },
  ctx?: F1ApiContext
): Promise<{
  qualiResults: QualifyingResult[];
  gpResults: RaceResult[];
  sprintResults: RaceResult[];
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
  } = options;

  const [
    qualiResults,
    gpResults,
    sprintResults,
    currentDrivers,
    prevDrivers,
    currentConstructors,
    prevConstructors,
    drivers,
  ] = await Promise.all([
    needQuali ? getQualifyingResult(year, round, ctx).catch(() => []) : Promise.resolve([]),
    needGpResults ? getRaceResult(year, round, false, ctx).catch(() => []) : Promise.resolve([]),
    needSprintResults && hasSprint ? getRaceResult(year, round, true, ctx).catch(() => []) : Promise.resolve([]),
    needStandings ? getDriverStandings(year, round, ctx).catch(() => []) : Promise.resolve([]),
    needStandings && round > 1 ? getDriverStandings(year, round - 1, ctx).catch(() => null) : Promise.resolve(null),
    needStandings ? getConstructorStandings(year, round, ctx).catch(() => []) : Promise.resolve([]),
    needStandings && round > 1 ? getConstructorStandings(year, round - 1, ctx).catch(() => null) : Promise.resolve(null),
    needDrivers ? getDriversForRaceWithFallback(year, round, ctx).catch(() => []) : Promise.resolve([]),
  ]);

  return {
    qualiResults,
    gpResults,
    sprintResults,
    drivers,
    currentDrivers,
    prevDrivers,
    currentConstructors,
    prevConstructors,
  };
}
