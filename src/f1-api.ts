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

// Fetch season schedule
export async function getSchedule(year: number): Promise<ScheduleRace[]> {
  const url = `${BASE_URL}/${year}.json?limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ergast API error: ${res.statusText}`);
  const data = await res.json() as any;
  return data.MRData.RaceTable.Races;
}

// Fetch race results
export async function getRaceResult(year: number, round: number, isSprint = false): Promise<RaceResult[]> {
  const endpoint = isSprint ? 'sprint' : 'results';
  const url = `${BASE_URL}/${year}/${round}/${endpoint}.json?limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ergast API error: ${res.statusText}`);
  const data = await res.json() as any;
  
  const races = data.MRData.RaceTable.Races;
  if (!races || races.length === 0) return [];
  
  const resultsKey = isSprint ? 'SprintResults' : 'Results';
  return races[0][resultsKey] || [];
}

// Fetch qualifying results
export async function getQualifyingResult(year: number, round: number): Promise<QualifyingResult[]> {
  const url = `${BASE_URL}/${year}/${round}/qualifying.json?limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ergast API error: ${res.statusText}`);
  const data = await res.json() as any;
  
  const races = data.MRData.RaceTable.Races;
  if (!races || races.length === 0) return [];
  return races[0].QualifyingResults || [];
}

// Fetch driver standings
export async function getDriverStandings(year: number, round?: number): Promise<DriverStanding[]> {
  const suffix = round ? `/${round}` : '';
  const url = `${BASE_URL}/${year}${suffix}/driverStandings.json?limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ergast API error: ${res.statusText}`);
  const data = await res.json() as any;
  
  const lists = data.MRData.StandingsTable.StandingsLists;
  if (!lists || lists.length === 0) return [];
  return lists[0].DriverStandings || [];
}

// Fetch constructor standings
export async function getConstructorStandings(year: number, round?: number): Promise<ConstructorStanding[]> {
  const suffix = round ? `/${round}` : '';
  const url = `${BASE_URL}/${year}${suffix}/constructorStandings.json?limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ergast API error: ${res.statusText}`);
  const data = await res.json() as any;
  
  const lists = data.MRData.StandingsTable.StandingsLists;
  if (!lists || lists.length === 0) return [];
  return lists[0].ConstructorStandings || [];
}

// Fetch list of drivers for a race (to initialize practice entries)
export async function getDriversForRace(year: number, round: number): Promise<Driver[]> {
  const url = `${BASE_URL}/${year}/${round}/drivers.json?limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ergast API error: ${res.statusText}`);
  const data = await res.json() as any;
  return data.MRData.DriverTable.Drivers || [];
}

// Fetch list of drivers for a race, with recursive fallback to preceding races/seasons if empty
export async function getDriversForRaceWithFallback(year: number, round: number): Promise<Driver[]> {
  let drivers = await getDriversForRace(year, round).catch(() => []);
  let currentYear = year;
  let prevRound = round - 1;
  
  while (drivers.length === 0) {
    if (prevRound >= 1) {
      drivers = await getDriversForRace(currentYear, prevRound).catch(() => []);
      prevRound--;
    } else {
      currentYear--;
      try {
        const prevSchedule = await getSchedule(currentYear);
        if (prevSchedule && prevSchedule.length > 0) {
          prevRound = prevSchedule.length;
        } else {
          break; // Avoid infinite loop if no more schedules
        }
      } catch (e) {
        break;
      }
    }
  }
  return drivers;
}

// Parse HTML string from F1.com practice session results
export function parsePracticeHTML(html: string): Record<string, PracticeSessionData> {
  const results: Record<string, PracticeSessionData> = {};
  
  // Find table rows
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const cells: string[] = [];
    let tdMatch;
    
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      // Strip tags and clean whitespace
      const cleanCell = tdMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cleanCell);
    }
    
    // Check if the row has enough columns (typically 5-7 columns)
    // Pos, No, Driver, Car/Team, Time, Gap, Laps
    if (cells.length >= 5) {
      const position = cells[0];
      const number = cells[1];
      const rawDriverName = cells[2];
      const teamName = cells[3];
      const time = cells[4];
      
      // If position is not a number, skip header/footer rows
      if (/^\d+$/.test(position)) {
        results[rawDriverName] = {
          position,
          number,
          driverName: rawDriverName, // will be mapped later
          teamName,
          time
        };
      }
    }
  }
  
  return results;
}

// Map practice results using fetched drivers to resolve name formats (e.g. LandoNorrisNOR -> Lando Norris)
export function mapDriverNames(
  scrapedData: Record<string, PracticeSessionData>,
  drivers: Driver[]
): Record<string, PracticeSessionData> {
  const mappedResults: Record<string, PracticeSessionData> = {};
  
  // Create mapping keys from official drivers
  // E.g. Lando Norris (code: NOR) -> LandoNorrisNOR
  const mapping: Record<string, Driver> = {};
  for (const driver of drivers) {
    const key1 = `${driver.givenName}${driver.familyName}${driver.code}`.replace(/[\s'-]/g, '');
    const key2 = `${driver.givenName}${driver.familyName}`.replace(/[\s'-]/g, '');
    mapping[key1.toLowerCase()] = driver;
    mapping[key2.toLowerCase()] = driver;
    mapping[driver.driverId.toLowerCase()] = driver;
    mapping[`${driver.givenName} ${driver.familyName}`.toLowerCase()] = driver;
  }
  
  // Fallback map for common outliers
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
      // Try to find if any key contains the driver name
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
      // Check custom mapping
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
    
    // Extract schema SportsEvent name, e.g., "name":"FORMULA 1 LOUIS VUITTON GRAND PRIX DE MONACO 2026"
    const nameMatch = html.match(/"@type"\s*:\s*"SportsEvent"[^}]+?"name"\s*:\s*"([^"]+)"/);
    if (nameMatch && nameMatch[1]) {
      return cleanOfficialName(nameMatch[1]);
    }
    
    // Fallback: title tag
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
