import {
  cachedJolpicaJson,
  createF1ApiContext,
  createF1ApiContextFromEnv,
  F1ApiContext,
  isJolpicaUrlCached,
  CachedScheduleRace,
} from './f1-api-cache';
import { trackedKvPut } from './kv-ops';

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
    ctx.latestConcludedRound = getLatestConcludedRound(races);
    ctx.schedule = races;
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
    needDrivers || needSprintQuali ? getDriversForRaceWithFallback(year, round, ctx).catch(() => []) : Promise.resolve([]),
  ]);

  let sprintQualiResults: QualifyingResult[] = [];
  if (needSprintQuali && hasSprint) {
    const race = ctx?.schedule?.find(r => parseInt(r.round, 10) === round);
    if (race) {
      sprintQualiResults = await getOpenF1SprintQualifyingResult(
        year,
        round,
        race,
        ctx,
        currentDrivers,
        prevDrivers
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

function uint8ArrayToBinaryString(arr: Uint8Array): string {
  let str = '';
  const chunkSize = 16384;
  for (let i = 0; i < arr.length; i += chunkSize) {
    const sub = arr.subarray(i, i + chunkSize);
    str += String.fromCharCode.apply(null, sub as any);
  }
  return str;
}

function binaryStringtoUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
}

async function decompressZlib(data: Uint8Array): Promise<Uint8Array | null> {
  try {
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } catch (e) {
    return null;
  }
}

export async function parsePDF(pdfBuffer: Uint8Array): Promise<string> {
  const pdf = uint8ArrayToBinaryString(pdfBuffer);
  const objects: Record<number, { id: number; dict: string; stream: string | null }> = {};
  let pos = 0;
  
  while (true) {
    const objStart = pdf.indexOf(' 0 obj', pos);
    if (objStart === -1) break;
    
    let numStart = objStart - 1;
    while (numStart >= 0 && pdf.charCodeAt(numStart) >= 48 && pdf.charCodeAt(numStart) <= 57) {
      numStart--;
    }
    numStart++;
    
    const objId = parseInt(pdf.slice(numStart, objStart), 10);
    if (isNaN(objId)) {
      pos = objStart + 6;
      continue;
    }
    
    const endobjIndex = pdf.indexOf('endobj', objStart);
    if (endobjIndex === -1) break;
    
    const objData = pdf.slice(numStart, endobjIndex + 6);
    
    const dictStart = objData.indexOf('<<');
    const dictEnd = objData.indexOf('>>');
    let dict = '';
    if (dictStart !== -1 && dictEnd !== -1 && dictStart < dictEnd) {
      dict = objData.slice(dictStart, dictEnd + 2);
    }
    
    let streamContent: string | null = null;
    const streamStart = objData.indexOf('stream');
    if (streamStart !== -1) {
      const streamEnd = objData.indexOf('endstream');
      if (streamEnd !== -1) {
        let dataStart = streamStart + 6;
        if (objData.charCodeAt(dataStart) === 13) dataStart++;
        if (objData.charCodeAt(dataStart) === 10) dataStart++;
        
        const rawDataStr = objData.slice(dataStart, streamEnd);
        const isFlate = dict.includes('/FlateDecode');
        if (isFlate) {
          let rawData = binaryStringtoUint8Array(rawDataStr);
          let end = rawData.length;
          while (end > 0 && (rawData[end - 1] === 13 || rawData[end - 1] === 10 || rawData[end - 1] === 32 || rawData[end - 1] === 9 || rawData[end - 1] === 0)) {
            end--;
          }
          rawData = rawData.subarray(0, end);
          
          const decompressed = await decompressZlib(rawData);
          if (decompressed) {
            streamContent = uint8ArrayToBinaryString(decompressed);
          }
        } else {
          streamContent = rawDataStr;
        }
      }
    }
    
    objects[objId] = {
      id: objId,
      dict,
      stream: streamContent
    };
    
    pos = endobjIndex + 6;
  }

  const cmapMaps: Record<number, Record<string, string>> = {};
  for (const key in objects) {
    const objId = parseInt(key, 10);
    const obj = objects[objId];
    if (obj.stream && (obj.stream.includes('begincmap') || obj.dict.includes('/ToUnicode'))) {
      const content = obj.stream;
      const glyphMap: Record<string, string> = {};
      
      let bfcharPos = 0;
      while (true) {
        const startIdx = content.indexOf('beginbfchar', bfcharPos);
        if (startIdx === -1) break;
        const endIdx = content.indexOf('endbfchar', startIdx);
        if (endIdx === -1) break;
        
        const block = content.slice(startIdx + 11, endIdx);
        const bfcharRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
        let match;
        while ((match = bfcharRegex.exec(block)) !== null) {
          const glyph = match[1].toLowerCase();
          const unicodeHex = match[2];
          const charCode = parseInt(unicodeHex, 16);
          glyphMap[glyph] = String.fromCharCode(charCode);
        }
        bfcharPos = endIdx + 9;
      }
      
      let bfrangePos = 0;
      while (true) {
        const startIdx = content.indexOf('beginbfrange', bfrangePos);
        if (startIdx === -1) break;
        const endIdx = content.indexOf('endbfrange', startIdx);
        if (endIdx === -1) break;
        
        const block = content.slice(startIdx + 12, endIdx);
        const bfrangeRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
        let rangeMatch;
        while ((rangeMatch = bfrangeRegex.exec(block)) !== null) {
          const startGlyph = parseInt(rangeMatch[1], 16);
          const endGlyph = parseInt(rangeMatch[2], 16);
          const startUnicode = parseInt(rangeMatch[3], 16);
          for (let g = startGlyph; g <= endGlyph; g++) {
            const glyphHex = g.toString(16).padStart(4, '0').toLowerCase();
            const unicodeVal = startUnicode + (g - startGlyph);
            glyphMap[glyphHex] = String.fromCharCode(unicodeVal);
          }
        }
        
        const bfrangeArrayRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g;
        let arrayMatch;
        while ((arrayMatch = bfrangeArrayRegex.exec(block)) !== null) {
          const startGlyph = parseInt(arrayMatch[1], 16);
          const endGlyph = parseInt(arrayMatch[2], 16);
          const arrayContent = arrayMatch[3];
          const hexRegex = /<([0-9a-fA-F]+)>/g;
          let hexMatch;
          let idx = 0;
          while ((hexMatch = hexRegex.exec(arrayContent)) !== null && (startGlyph + idx <= endGlyph)) {
            const glyphHex = (startGlyph + idx).toString(16).padStart(4, '0').toLowerCase();
            const unicodeVal = parseInt(hexMatch[1], 16);
            glyphMap[glyphHex] = String.fromCharCode(unicodeVal);
            idx++;
          }
        }
        
        bfrangePos = endIdx + 10;
      }
      
      cmapMaps[objId] = glyphMap;
    }
  }

  const fontToUnicode: Record<number, number> = {};
  for (const key in objects) {
    const objId = parseInt(key, 10);
    const obj = objects[objId];
    if (obj.dict.includes('/Type /Font') || obj.dict.includes('/Type/Font')) {
      const toUnicodeMatch = obj.dict.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
      if (toUnicodeMatch) {
        fontToUnicode[objId] = parseInt(toUnicodeMatch[1], 10);
      }
    }
  }

  const contentPages: Array<{ pageId: number; fonts: Record<string, number>; contentStreamIds: number[] }> = [];
  for (const key in objects) {
    const objId = parseInt(key, 10);
    const obj = objects[objId];
    if (obj.dict.includes('/Type /Page') || obj.dict.includes('/Type/Page')) {
      const fontDictMatch = obj.dict.match(/\/Font\s*<<\s*([\s\S]*?)\s*>>/);
      const fonts: Record<string, number> = {};
      if (fontDictMatch) {
        const fontList = fontDictMatch[1];
        const entryRegex = /\/([a-zA-Z0-9_\+\-]+)\s+(\d+)\s+0\s+R/g;
        let entry;
        while ((entry = entryRegex.exec(fontList)) !== null) {
          fonts[entry[1]] = parseInt(entry[2], 10);
        }
      }
      
      const contentsMatch = obj.dict.match(/\/Contents\s*\[?([\d\sR]+)\]?/);
      const contentStreamIds: number[] = [];
      if (contentsMatch) {
        const idsStr = contentsMatch[1];
        const idRegex = /(\d+)\s+0\s+R/g;
        let idMatch;
        while ((idMatch = idRegex.exec(idsStr)) !== null) {
          contentStreamIds.push(parseInt(idMatch[1], 10));
        }
      }
      
      contentPages.push({
        pageId: objId,
        fonts,
        contentStreamIds
      });
    }
  }

  let fullDecodedText = '';
  
  function glyphMapFallback(glyph: string): string | null {
    for (const mapId in cmapMaps) {
      if (cmapMaps[mapId][glyph]) {
        return cmapMaps[mapId][glyph];
      }
    }
    return null;
  }

  for (const page of contentPages) {
    for (const streamId of page.contentStreamIds) {
      const streamObj = objects[streamId];
      if (!streamObj || !streamObj.stream) continue;
      
      const content = streamObj.stream;
      let currentFontAlias = null;
      let currentGlyphMap: Record<string, string> = {};
      
      const lines = content.split(/[\r\n]+/);
      for (const line of lines) {
        const fontSelectMatch = line.match(/\/([a-zA-Z0-9_\+\-]+)\s+\d+(?:\.\d+)?\s+Tf/);
        if (fontSelectMatch) {
          currentFontAlias = fontSelectMatch[1];
          const fontObjId = page.fonts[currentFontAlias];
          const unicodeObjId = fontToUnicode[fontObjId];
          currentGlyphMap = cmapMaps[unicodeObjId] || {};
        }
        
        if (line.endsWith('TJ') || line.includes('TJ')) {
          const arrayMatch = line.match(/\[([\s\S]*?)\]\s*TJ/);
          if (arrayMatch) {
            const arrayContent = arrayMatch[1];
            const itemsRegex = /<([0-9a-fA-F]+)>|\((.*?)\)/g;
            let item;
            while ((item = itemsRegex.exec(arrayContent)) !== null) {
              if (item[1]) {
                const hex = item[1];
                for (let i = 0; i < hex.length; i += 4) {
                  const glyph = hex.slice(i, i + 4).toLowerCase();
                  fullDecodedText += currentGlyphMap[glyph] || glyphMapFallback(glyph) || '';
                }
              } else if (item[2]) {
                fullDecodedText += item[2];
              }
            }
          }
        } else if (line.endsWith('Tj') || line.includes('Tj')) {
          const textMatch = line.match(/<([0-9a-fA-F]+)>\s*Tj|\((.*?)\)\s*Tj/);
          if (textMatch) {
            if (textMatch[1]) {
              const hex = textMatch[1];
              for (let i = 0; i < hex.length; i += 4) {
                const glyph = hex.slice(i, i + 4).toLowerCase();
                fullDecodedText += currentGlyphMap[glyph] || glyphMapFallback(glyph) || '';
              }
            } else if (textMatch[2]) {
              fullDecodedText += textMatch[2];
            }
          }
        } else if (line === 'ET') {
          fullDecodedText += '\n';
        }
      }
    }
  }

  return fullDecodedText;
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

export async function fetchOpenF1Json<T>(
  url: string,
  ctx?: F1ApiContext,
  expirationTtl?: number
): Promise<T> {
  const cacheKey = `openf1:${url}`;
  if (ctx) {
    if (ctx.cache.has(cacheKey)) {
      return ctx.cache.get(cacheKey) as T;
    }
  }

  if (ctx?.kv) {
    const raw = await ctx.kv.get(`f1_api_cache:${cacheKey}`);
    if (raw) {
      const data = JSON.parse(raw);
      if (ctx) ctx.cache.set(cacheKey, data);
      return data;
    }
  }

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

export async function getDriverConstructorForSeason(
  year: number,
  driverId: string,
  ctx?: F1ApiContext
): Promise<Constructor | null> {
  const url = `${BASE_URL}/${year}/drivers/${driverId}/constructors.json`;
  try {
    return await cachedJolpicaJson(url, ctx, (data: any) => {
      const list = data?.MRData?.ConstructorTable?.Constructors;
      return list && list.length > 0 ? list[0] : null;
    });
  } catch (e) {
    console.error(`Failed to fetch constructor for driver ${driverId} in season ${year}:`, e);
    return null;
  }
}

export async function getDriverConstructor(
  year: number,
  driverId: string,
  ctx?: F1ApiContext,
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
  return getDriverConstructorForSeason(year, driverId, ctx);
}

export async function getOpenF1SprintQualifyingResult(
  year: number,
  round: number,
  race: CachedScheduleRace,
  ctx?: F1ApiContext,
  currentDrivers?: DriverStanding[],
  prevDrivers?: DriverStanding[] | null
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

  const raceDate = new Date(`${race.date}T12:00:00Z`);
  const matchedSession = sessions.find(session => {
    const sessionDate = new Date(session.date_start);
    const diffMs = Math.abs(sessionDate.getTime() - raceDate.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 4;
  });

  const raceName = (race as any).raceName || 'Unknown';

  if (!matchedSession) {
    console.warn(`No matching OpenF1 Sprint Qualifying session found for round ${round} (${raceName})`);
    return [];
  }

  console.log(`Matched OpenF1 session_key ${matchedSession.session_key} for ${raceName}`);

  const resultsUrl = `https://api.openf1.org/v1/session_result?session_key=${matchedSession.session_key}`;
  const results = await fetchOpenF1Json<OpenF1SessionResult[]>(resultsUrl, ctx, 86400);

  if (!results || results.length === 0) {
    console.warn(`No OpenF1 session results found for session_key ${matchedSession.session_key}`);
    return [];
  }

  results.sort((a, b) => a.position - b.position);
  const drivers = await getDriversForRaceWithFallback(year, round, ctx).catch(() => []);

  const mappedResults: QualifyingResult[] = [];
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

    const constructor = await getDriverConstructor(year, driver.driverId, ctx, currentDrivers, prevDrivers) || {
      constructorId: 'unknown',
      url: '',
      name: 'Unknown',
      nationality: ''
    };

    const formatSQTime = (sec: number | null | undefined): string => {
      if (sec === null || sec === undefined) return '';
      return formatOpenF1Time(sec);
    };

    mappedResults.push({
      number: driverNumStr,
      position: r.position.toString(),
      driver,
      constructor,
      Q1: formatSQTime(r.duration?.[0]),
      Q2: formatSQTime(r.duration?.[1]),
      Q3: formatSQTime(r.duration?.[2]),
    });
  }

  return mappedResults;
}

