import { getRaceResult, getQualifyingResult, getSchedule, RaceResult } from './f1-api';

export const CIRCUIT_LENGTHS: Record<string, number> = {
  "albert_park": 5.278,
  "shanghai": 5.451,
  "suzuka": 5.807,
  "bahrain": 5.412,
  "jeddah": 6.174,
  "miami": 5.412,
  "emilia_romagna": 4.909,
  "monaco": 3.337,
  "catalunya": 4.657,
  "villeneuve": 4.361,
  "red_bull_ring": 4.318,
  "silverstone": 5.891,
  "hungaroring": 4.381,
  "spa": 7.004,
  "zandvoort": 4.259,
  "monza": 5.793,
  "baku": 6.003,
  "marina_bay": 4.94,
  "cota": 5.513,
  "rodriguez": 4.304,
  "interlagos": 4.309,
  "vegas": 6.201,
  "losail": 5.419,
  "yas_marina": 5.281
};

export const BASE_STATS_2025: Record<string, Record<string, string>> = {
  "Championships": {
    "Lewis Hamilton": "7",
    "Max Verstappen": "4",
    "Fernando Alonso": "2",
    "Lando Norris": "1"
  },
  "Distance": {
    "Fernando Alonso": "113668",
    "Lewis Hamilton": "107064",
    "Nico Hülkenberg": "65279",
    "Max Verstappen": "61842",
    "Carlos Sainz, Jr.": "59959",
    "Lance Stroll": "50331",
    "Esteban Ocon": "46862",
    "Pierre Gasly": "46235",
    "Charles Leclerc": "45434",
    "Lando Norris": "41945",
    "George Russell": "40973",
    "Alexander Albon": "33031",
    "Oscar Piastri": "18042",
    "Liam Lawson": "1514",
    "Oliver Bearman": "309",
    "Franco Colapinto": "5087",
    "Andrea Kimi Antonelli": "4521",
    "Gabriel Bortoleto": "4638",
    "Isack Hadjar": "4633",
    "Sergio Pérez": "78600",
    "Valtteri Bottas": "69983"
  },
  "DistanceLed": {
    "Lewis Hamilton": "27975",
    "Max Verstappen": "18187",
    "Fernando Alonso": "8673",
    "Charles Leclerc": "4493",
    "Lando Norris": "2804",
    "Oscar Piastri": "2723",
    "George Russell": "1611",
    "Carlos Sainz, Jr.": "1533",
    "Esteban Ocon": "351",
    "Nico Hülkenberg": "194",
    "Lance Stroll": "171",
    "Pierre Gasly": "151",
    "Andrea Kimi Antonelli": "62",
    "Alexander Albon": "11",
    "Valtteri Bottas": "3826",
    "Sergio Pérez": "2023"
  },
  "Doubles": {
    "Lewis Hamilton": "61",
    "Max Verstappen": "32",
    "Fernando Alonso": "14",
    "Valtteri Bottas": "6",
    "Charles Leclerc": "5",
    "Carlos Sainz, Jr.": "3",
    "Lando Norris": "2",
    "Sergio Pérez": "1",
    "Pierre Gasly": "0",
    "Esteban Ocon": "0",
    "Lance Stroll": "0",
    "Oscar Piastri": "0",
    "George Russell": "1",
    "Alexander Albon": "0",
    "Nico Hülkenberg": "0"
  },
  "Entries": {
    "Fernando Alonso": "428",
    "Lewis Hamilton": "380",
    "Nico Hülkenberg": "254",
    "Max Verstappen": "233",
    "Carlos Sainz, Jr.": "233",
    "Lance Stroll": "193",
    "Pierre Gasly": "178",
    "Esteban Ocon": "180",
    "Charles Leclerc": "173",
    "Lando Norris": "152",
    "George Russell": "152",
    "Alexander Albon": "129",
    "Oscar Piastri": "70",
    "Liam Lawson": "35",
    "Oliver Bearman": "27",
    "Andrea Kimi Antonelli": "24",
    "Isack Hadjar": "24",
    "Gabriel Bortoleto": "24",
    "Sergio Pérez": "282",
    "Valtteri Bottas": "246",
    "Franco Colapinto": "9"
  },
  "FastestLaps": {
    "Lewis Hamilton": "68",
    "Max Verstappen": "36",
    "Fernando Alonso": "26",
    "Lando Norris": "18",
    "George Russell": "11",
    "Charles Leclerc": "11",
    "Oscar Piastri": "9",
    "Carlos Sainz, Jr.": "4",
    "Pierre Gasly": "3",
    "Andrea Kimi Antonelli": "3",
    "Nico Hülkenberg": "2",
    "Esteban Ocon": "1",
    "Alexander Albon": "1",
    "Valtteri Bottas": "19",
    "Sergio Pérez": "12"
  },
  "FrontRows": {
    "Lewis Hamilton": "176",
    "Max Verstappen": "85",
    "Charles Leclerc": "43",
    "Fernando Alonso": "42",
    "Lando Norris": "30",
    "George Russell": "17",
    "Oscar Piastri": "17",
    "Carlos Sainz, Jr.": "15",
    "Nico Hülkenberg": "2",
    "Lance Stroll": "2",
    "Pierre Gasly": "1",
    "Andrea Kimi Antonelli": "1",
    "Valtteri Bottas": "46",
    "Sergio Pérez": "13"
  },
  "Grand Chelems": {
    "Valtteri Bottas": "0",
    "Pierre Gasly": "0",
    "Fernando Alonso": "1",
    "Esteban Ocon": "0",
    "Oscar Piastri": "1",
    "Lance Stroll": "0",
    "Charles Leclerc": "1",
    "Carlos Sainz, Jr.": "0",
    "Lando Norris": "0",
    "Lewis Hamilton": "6",
    "George Russell": "0",
    "Max Verstappen": "6",
    "Sergio Pérez": "0",
    "Alexander Albon": "0",
    "Nico Hülkenberg": "0"
  },
  "HatTricks": {
    "Lewis Hamilton": "19",
    "Max Verstappen": "14",
    "Fernando Alonso": "5",
    "Lando Norris": "3",
    "Oscar Piastri": "3",
    "Charles Leclerc": "2",
    "George Russell": "1",
    "Valtteri Bottas": "2"
  },
  "Laps": {
    "Fernando Alonso": "22696",
    "Lewis Hamilton": "21263",
    "Nico Hülkenberg": "12836",
    "Max Verstappen": "12267",
    "Carlos Sainz, Jr.": "11995",
    "Lance Stroll": "9980",
    "Esteban Ocon": "9259",
    "Pierre Gasly": "9197",
    "Charles Leclerc": "8929",
    "Lando Norris": "8310",
    "George Russell": "8165",
    "Alexander Albon": "6525",
    "Oscar Piastri": "3597",
    "Liam Lawson": "293",
    "Oliver Bearman": "50",
    "Franco Colapinto": "1027",
    "Gabriel Bortoleto": "925",
    "Isack Hadjar": "922",
    "Andrea Kimi Antonelli": "884",
    "Sergio Pérez": "15489",
    "Valtteri Bottas": "13859"
  },
  "LapsLed": {
    "Lewis Hamilton": "5488",
    "Max Verstappen": "3699",
    "Fernando Alonso": "1773",
    "Charles Leclerc": "878",
    "Lando Norris": "573",
    "Oscar Piastri": "516",
    "George Russell": "345",
    "Carlos Sainz, Jr.": "300",
    "Esteban Ocon": "80",
    "Nico Hülkenberg": "43",
    "Lance Stroll": "32",
    "Pierre Gasly": "26",
    "Andrea Kimi Antonelli": "11",
    "Alexander Albon": "2",
    "Valtteri Bottas": "728",
    "Sergio Pérez": "389"
  },
  "Podiums": {
    "Lewis Hamilton": "202",
    "Max Verstappen": "127",
    "Fernando Alonso": "106",
    "Charles Leclerc": "50",
    "Lando Norris": "44",
    "Carlos Sainz, Jr.": "29",
    "Oscar Piastri": "26",
    "George Russell": "24",
    "Pierre Gasly": "5",
    "Esteban Ocon": "4",
    "Lance Stroll": "3",
    "Andrea Kimi Antonelli": "3",
    "Alexander Albon": "2",
    "Nico Hülkenberg": "1",
    "Isack Hadjar": "1",
    "Valtteri Bottas": "67",
    "Sergio Pérez": "39"
  },
  "Points": {
    "Pierre Gasly": "{{#expr: 394 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Fernando Alonso": "{{#expr: 2267 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Esteban Ocon": "{{#expr: 422 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Lance Stroll": "{{#expr: 268 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Charles Leclerc": "{{#expr: 1074 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Carlos Sainz, Jr.": "{{#expr: 982.5 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Lando Norris": "{{#expr: 633 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Lewis Hamilton": "{{#expr: 4639.5 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "George Russell": "{{#expr: 469 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Max Verstappen": "{{#expr: 2586.5 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Alexander Albon": "{{#expr: 228 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Nico Hülkenberg": "{{#expr: 530 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Oscar Piastri": "{{#expr: 97 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Oliver Bearman": "{{#expr:{{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Liam Lawson": "{{#expr: 2 + {{Career Results/Points/2024|{{{1}}}}} + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Franco Colapinto": "{{#expr: 5 + {{Career Results/Points/2025|{{{1}}}}}}}",
    "Andrea Kimi Antonelli": "{{Career Results/Points/2025|{{{1}}}}}",
    "Isack Hadjar": "{{Career Results/Points/2025|{{{1}}}}}",
    "Gabriel Bortoleto": "{{Career Results/Points/2025|{{{1}}}}}",
    "Valtteri Bottas": "1797",
    "Sergio Pérez": "1638"
  },
  "Poles": {
    "Lewis Hamilton": "104",
    "Max Verstappen": "48",
    "Charles Leclerc": "27",
    "Fernando Alonso": "22",
    "Lando Norris": "16",
    "George Russell": "7",
    "Carlos Sainz, Jr.": "6",
    "Oscar Piastri": "6",
    "Lance Stroll": "1",
    "Valtteri Bottas": "20",
    "Sergio Pérez": "3",
    "Nico Hülkenberg": "1"
  },
  "RacesLed": {
    "Lewis Hamilton": "192",
    "Max Verstappen": "103",
    "Fernando Alonso": "87",
    "Charles Leclerc": "44",
    "Lando Norris": "28",
    "Carlos Sainz, Jr.": "21",
    "Oscar Piastri": "21",
    "George Russell": "15",
    "Nico Hülkenberg": "3",
    "Esteban Ocon": "3",
    "Alexander Albon": "2",
    "Andrea Kimi Antonelli": "2",
    "Pierre Gasly": "1",
    "Lance Stroll": "1",
    "Valtteri Bottas": "38",
    "Sergio Pérez": "28"
  },
  "SprintFastestLaps": {
    "Max Verstappen": "9",
    "Sergio Pérez": "3",
    "Lewis Hamilton": "3",
    "Lando Norris": "3",
    "George Russell": "2",
    "Charles Leclerc": "2",
    "Nico Hülkenberg": "1",
    "Pierre Gasly": "1"
  },
  "SprintPodiums": {
    "Max Verstappen": "18",
    "Lando Norris": "8",
    "Oscar Piastri": "8",
    "Sergio Pérez": "6",
    "Charles Leclerc": "6",
    "Lewis Hamilton": "6",
    "Carlos Sainz, Jr.": "6",
    "Valtteri Bottas": "3",
    "George Russell": "3",
    "Pierre Gasly": "1"
  },
  "SprintPoles": {
    "Max Verstappen": "10",
    "Lando Norris": "3",
    "Oscar Piastri": "3",
    "Lewis Hamilton": "2",
    "Valtteri Bottas": "1",
    "Charles Leclerc": "1",
    "Andrea Kimi Antonelli": "1"
  },
  "SprintWins": {
    "Max Verstappen": "13",
    "Valtteri Bottas": "2",
    "Oscar Piastri": "2",
    "Lando Norris": "2",
    "George Russell": "1",
    "Sergio Pérez": "1",
    "Lewis Hamilton": "1"
  },
  "Starts": {
    "Fernando Alonso": "425",
    "Lewis Hamilton": "380",
    "Nico Hülkenberg": "250",
    "Max Verstappen": "233",
    "Carlos Sainz, Jr.": "229",
    "Lance Stroll": "189",
    "Esteban Ocon": "180",
    "Pierre Gasly": "177",
    "Charles Leclerc": "171",
    "Lando Norris": "152",
    "George Russell": "152",
    "Alexander Albon": "128",
    "Oscar Piastri": "70",
    "Liam Lawson": "35",
    "Oliver Bearman": "27",
    "Franco Colapinto": "26",
    "Gabriel Bortoleto": "24",
    "Andrea Kimi Antonelli": "24",
    "Isack Hadjar": "23",
    "Sergio Pérez": "281",
    "Valtteri Bottas": "246"
  },
  "Wins": {
    "Lewis Hamilton": "105",
    "Max Verstappen": "71",
    "Fernando Alonso": "32",
    "Lando Norris": "11",
    "Oscar Piastri": "9",
    "Charles Leclerc": "8",
    "George Russell": "5",
    "Carlos Sainz, Jr.": "4",
    "Pierre Gasly": "1",
    "Esteban Ocon": "1",
    "Valtteri Bottas": "10",
    "Sergio Pérez": "6"
  }
};

export interface DriverStats {
  Championships: number;
  Distance: number;
  DistanceLed: number;
  Doubles: number;
  Entries: number;
  FastestLaps: number;
  FrontRows: number;
  "Grand Chelems": number;
  HatTricks: number;
  Laps: number;
  LapsLed: number;
  Podiums: number;
  Points: number;
  Poles: number;
  RacesLed: number;
  SprintFastestLaps: number;
  SprintPodiums: number;
  SprintPoles: number;
  SprintWins: number;
  Starts: number;
  Wins: number;
}

export const driverIdToWikiName: Record<string, string> = {
  'max_verstappen': 'Max Verstappen',
  'hadjar': 'Isack Hadjar',
  'leclerc': 'Charles Leclerc',
  'hamilton': 'Lewis Hamilton',
  'russell': 'George Russell',
  'antonelli': 'Andrea Kimi Antonelli',
  'gasly': 'Pierre Gasly',
  'colapinto': 'Franco Colapinto',
  'norris': 'Lando Norris',
  'piastri': 'Oscar Piastri',
  'sainz': 'Carlos Sainz, Jr.',
  'albon': 'Alexander Albon',
  'lawson': 'Liam Lawson',
  'arvid_lindblad': 'Arvid Lindblad',
  'stroll': 'Lance Stroll',
  'alonso': 'Fernando Alonso',
  'hulkenberg': 'Nico Hülkenberg',
  'bortoleto': 'Gabriel Bortoleto',
  'ocon': 'Esteban Ocon',
  'bearman': 'Oliver Bearman',
  'bottas': 'Valtteri Bottas',
  'perez': 'Sergio Pérez'
};


// Helper to normalize strings for matching
export function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Fetch and calculate stats for a single round of 2026
export async function calculateRoundStats(
  year: number,
  round: number,
  trackLengthParam?: number
): Promise<Record<string, Partial<DriverStats>>> {
  console.log(`Calculating stats for ${year} Round ${round}...`);

  let trackLength = trackLengthParam;
  const raceResultsPromise = getRaceResult(year, round, false).catch(() => []);
  const qualiResultsPromise = getQualifyingResult(year, round).catch(() => []);

  let schedulePromise: Promise<any[]> = Promise.resolve([]);
  if (trackLength === undefined) {
    schedulePromise = getSchedule(year).catch(() => []);
  }

  const [raceResults, qualiResults, schedule] = await Promise.all([
    raceResultsPromise,
    qualiResultsPromise,
    schedulePromise
  ]);

  if (trackLength === undefined) {
    const raceInfo = schedule.find(r => parseInt(r.round, 10) === round);
    const circuitId = raceInfo?.Circuit?.circuitId;
    trackLength = circuitId ? (CIRCUIT_LENGTHS[circuitId] || 0) : 0;
  }

  let sprintResults: RaceResult[] = [];
  try {
    sprintResults = await getRaceResult(year, round, true);
  } catch (e) {
    // No sprint
  }

  // Fetch lap charts for laps led / races led / distance led
  let lapsLedMap: Record<string, number> = {};
  if (raceResults.length > 0) {
    try {
      const lapsUrl = `https://api.jolpi.ca/ergast/f1/${year}/${round}/laps.json?limit=2000`;
      const lapsRes = await fetch(lapsUrl);
      if (lapsRes.ok) {
        const lapsData = await lapsRes.json() as any;
        const races = lapsData?.MRData?.RaceTable?.Races || lapsData?.MRData?.LapsTable?.Races || [];
        const laps = races[0]?.Laps || [];
        for (const lap of laps) {
          const leader = lap.Timings[0]?.driverId;
          if (leader) {
            lapsLedMap[leader] = (lapsLedMap[leader] || 0) + 1;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to fetch lap chart for Round ${round}: ${e}`);
    }
  }

  const roundStats: Record<string, Partial<DriverStats>> = {};

  const initDriver = (id: string) => {
    if (!roundStats[id]) {
      roundStats[id] = {
        Wins: 0, Poles: 0, Podiums: 0, Entries: 0, Starts: 0,
        FastestLaps: 0, FrontRows: 0, "Grand Chelems": 0, HatTricks: 0,
        Laps: 0, LapsLed: 0, Distance: 0, DistanceLed: 0, RacesLed: 0, Doubles: 0,
        SprintWins: 0, SprintPodiums: 0, SprintPoles: 0, SprintFastestLaps: 0, Points: 0
      };
    }
  };

  // 1. Process Qualifying
  qualiResults.forEach((q) => {
    const driverId = q.driver.driverId;
    initDriver(driverId);
    
    const pos = parseInt(q.position, 10);
    if (pos === 1) roundStats[driverId].Poles = 1;
    if (pos <= 2) roundStats[driverId].FrontRows = 1;
  });

  // 2. Process Sprint
  if (sprintResults.length > 0) {
    sprintResults.forEach((s) => {
      const driverId = s.driver.driverId;
      initDriver(driverId);

      const pos = parseInt(s.position, 10);
      const grid = parseInt(s.grid, 10);
      const pts = parseFloat(s.points) || 0;
      
      if (pos === 1) roundStats[driverId].SprintWins = 1;
      if (pos <= 3) roundStats[driverId].SprintPodiums = 1;
      if (grid === 1) roundStats[driverId].SprintPoles = 1;
      roundStats[driverId].Points = (roundStats[driverId].Points || 0) + pts;
    });

    // Sprint fastest lap rank=1
    const validFastest = sprintResults.filter(s => s.FastestLap?.rank === '1');
    if (validFastest.length > 0) {
      roundStats[validFastest[0].driver.driverId].SprintFastestLaps = 1;
    } else {
      // Fallback: compare times
      let bestTime: string | null = null;
      let bestDriverId: string | null = null;
      sprintResults.forEach(s => {
        const t = s.FastestLap?.Time?.time;
        if (t) {
          if (!bestTime || t < bestTime) {
            bestTime = t;
            bestDriverId = s.driver.driverId;
          }
        }
      });
      if (bestDriverId) {
        roundStats[bestDriverId].SprintFastestLaps = 1;
      }
    }
  }

  // 3. Process Race
  raceResults.forEach((r) => {
    const driverId = r.driver.driverId;
    initDriver(driverId);

    const pos = parseInt(r.position, 10);
    const posText = r.positionText;
    const grid = parseInt(r.grid, 10);
    const laps = parseInt(r.laps, 10) || 0;
    const pts = parseFloat(r.points) || 0;

    roundStats[driverId].Entries = 1;
    if (posText !== 'W') { // DNS is 'W' in Ergast
      roundStats[driverId].Starts = 1;
    }

    if (pos === 1) roundStats[driverId].Wins = 1;
    if (pos <= 3) roundStats[driverId].Podiums = 1;
    
    roundStats[driverId].Laps = laps;
    roundStats[driverId].Distance = laps * trackLength;
    roundStats[driverId].Points = (roundStats[driverId].Points || 0) + pts;

    if (r.FastestLap?.rank === '1') {
      roundStats[driverId].FastestLaps = 1;
    }

    // Double (Pole + Win)
    if (grid === 1 && pos === 1) {
      roundStats[driverId].Doubles = 1;
    }

    // Hat Trick (Pole + Win + Fastest Lap)
    if (grid === 1 && pos === 1 && r.FastestLap?.rank === '1') {
      roundStats[driverId].HatTricks = 1;
    }
  });

  // 4. Process Laps Led & Races Led & Grand Chelems
  const totalLaps = raceResults.length > 0 ? Math.max(...raceResults.map(r => parseInt(r.laps, 10) || 0)) : 0;
  Object.entries(lapsLedMap).forEach(([driverId, count]) => {
    initDriver(driverId);
    roundStats[driverId].LapsLed = count;
    roundStats[driverId].DistanceLed = count * trackLength;
    if (count > 0) {
      roundStats[driverId].RacesLed = 1;
    }

    // Grand Chelem (Pole, Win, Fastest Lap, led every lap)
    const stats = roundStats[driverId];
    if (stats.Wins === 1 && stats.FastestLaps === 1 && stats.Doubles === 1 && count === totalLaps && totalLaps > 0) {
      roundStats[driverId]["Grand Chelems"] = 1;
    }
  });

  return roundStats;
}

// Get or calculate round stats with Cloudflare KV caching
export async function getRoundStatsCached(
  env: any,
  year: number,
  round: number,
  trackLength?: number
): Promise<Record<string, Partial<DriverStats>>> {
  const kvKey = `2026_stats_round_${round}`;
  if (env && env.F1_WIKI_STATE) {
    const cached = await env.F1_WIKI_STATE.get(kvKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(`Failed to parse cached round stats: ${e}`);
      }
    }
  }

  const computed = await calculateRoundStats(year, round, trackLength);
  if (env && env.F1_WIKI_STATE && Object.keys(computed).length > 0) {
    await env.F1_WIKI_STATE.put(kvKey, JSON.stringify(computed));
    console.log(`Cached stats for Round ${round} in KV.`);
  }
  return computed;
}

// Get cumulative 2026 stats up to a specific round
export async function get2026CumulativeStats(env: any, upToRound: number): Promise<Record<string, DriverStats>> {
  if (upToRound <= 0) return {};

  const targetKey = `2026_cumulative_stats_up_to_${upToRound}`;

  // 1. Try to get cumulative stats for target round directly
  if (env && env.F1_WIKI_STATE) {
    const cached = await env.F1_WIKI_STATE.get(targetKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(`Failed to parse cached cumulative stats: ${e}`);
      }
    }
  }

  // 2. Try to get cumulative stats for upToRound - 1
  let cumulative: Record<string, DriverStats> = {};
  let startRound = 1;

  if (upToRound > 1) {
    const prevKey = `2026_cumulative_stats_up_to_${upToRound - 1}`;
    if (env && env.F1_WIKI_STATE) {
      const cachedPrev = await env.F1_WIKI_STATE.get(prevKey);
      if (cachedPrev) {
        try {
          cumulative = JSON.parse(cachedPrev);
          startRound = upToRound; // We only need to calculate the target round!
          console.log(`Found cumulative stats up to Round ${upToRound - 1} in KV. Incremental build starting from Round ${startRound}.`);
        } catch (e) {
          console.error(`Failed to parse prev cumulative stats: ${e}`);
        }
      }
    }
  }

  const initDriver = (id: string) => {
    if (!cumulative[id]) {
      cumulative[id] = {
        Championships: 0, Distance: 0, DistanceLed: 0, Doubles: 0, Entries: 0,
        FastestLaps: 0, FrontRows: 0, "Grand Chelems": 0, HatTricks: 0, Laps: 0,
        LapsLed: 0, Podiums: 0, Points: 0, Poles: 0, RacesLed: 0,
        SprintFastestLaps: 0, SprintPodiums: 0, SprintPoles: 0, SprintWins: 0, Starts: 0, Wins: 0
      };
    }
  };

  // Fetch schedule once if we have rounds to calculate
  let schedule: any[] = [];
  if (startRound <= upToRound) {
    schedule = await getSchedule(2026).catch(() => []);
  }

  // Calculate remaining rounds
  for (let r = startRound; r <= upToRound; r++) {
    const raceInfo = schedule.find(x => parseInt(x.round, 10) === r);
    const circuitId = raceInfo?.Circuit?.circuitId;
    const trackLength = circuitId ? (CIRCUIT_LENGTHS[circuitId] || 0) : 0;

    const roundData = await getRoundStatsCached(env, 2026, r, trackLength).catch(() => ({}));
    Object.entries(roundData).forEach(([driverId, stats]) => {
      initDriver(driverId);
      Object.entries(stats).forEach(([statKey, value]) => {
        const k = statKey as keyof DriverStats;
        cumulative[driverId][k] += (value as number);
      });
    });

    // Save intermediate cumulative stats to avoid doing it again
    if (env && env.F1_WIKI_STATE && r < upToRound) {
      const intermediateKey = `2026_cumulative_stats_up_to_${r}`;
      await env.F1_WIKI_STATE.put(intermediateKey, JSON.stringify(cumulative));
    }
  }

  // Save final cumulative stats to KV
  if (env && env.F1_WIKI_STATE && Object.keys(cumulative).length > 0) {
    await env.F1_WIKI_STATE.put(targetKey, JSON.stringify(cumulative));
    console.log(`Saved cumulative stats up to Round ${upToRound} in KV.`);
  }

  return cumulative;
}

// Helper to format float values or expressions properly
function formatStatValue(templateName: string, value: number): string {
  if (templateName === 'Distance' || templateName === 'DistanceLed') {
    return Math.round(value).toString();
  }
  return value.toString();
}

// Helper to format a driver line
function formatDriverLine(wikiName: string, valueStr: string): string {
  const paddedName = wikiName.padEnd(34, ' ');
  return `| ${paddedName} = ${valueStr}`;
}

// Helper to get a numerical sort value from a wikitext value string
function getSortValue(valStr: string): number {
  const exprMatch = valStr.match(/\{\{#expr:\s*([\d.]+)/);
  if (exprMatch) {
    return parseFloat(exprMatch[1]);
  }
  if (valStr.includes('{{') || valStr.includes('{{{')) {
    const leadingNumMatch = valStr.match(/^\s*([\d.]+)/);
    if (leadingNumMatch) {
      return parseFloat(leadingNumMatch[1]);
    }
    return 0;
  }
  const clean = valStr.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

// Parse and update a single template's wikitext content
export function updateTemplateContent(
  templateName: string,
  currentWikitext: string,
  cumulative2026Stats: Record<string, DriverStats>
): { wikitext: string; changed: boolean; updates: { driver: string; oldValue: string; newValue: string }[] } {
  const lines = currentWikitext.split('\n');
  const updates: { driver: string; oldValue: string; newValue: string }[] = [];

  // 1. Locate current and other driver sections
  let currentDriversLineIdx = -1;
  let otherDriversLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/<!--\s*CURRENT DRIVERS\s*-->/i.test(line)) {
      currentDriversLineIdx = i;
    } else if (/<!--\s*OTHER DRIVERS\s*-->/i.test(line)) {
      otherDriversLineIdx = i;
    }
  }

  // Fallback to the existing line-by-line replacement if we can't locate both sections
  if (currentDriversLineIdx === -1 || otherDriversLineIdx === -1) {
    console.warn(`Could not find CURRENT DRIVERS or OTHER DRIVERS markers in ${templateName}. Falling back.`);
    let changed = false;
    const processedDrivers = new Set<string>();

    const newLines = lines.map(line => {
      const match = line.match(/^(\s*\|\s*)([^=]+?)(\s*=\s*)(.+?)(\s*)$/);
      if (!match) return line;

      const prefix = match[1];
      const name = match[2].trim();
      const separator = match[3];
      const currentValue = match[4].trim();
      const suffix = match[5];

      const matchedDriverId = Object.keys(driverIdToWikiName).find(
        id => normalizeName(driverIdToWikiName[id]) === normalizeName(name)
      );

      if (!matchedDriverId) return line;

      processedDrivers.add(driverIdToWikiName[matchedDriverId]);

      const baseValStr = (BASE_STATS_2025[templateName] && BASE_STATS_2025[templateName][driverIdToWikiName[matchedDriverId]]) || '0';
      const addedVal = (cumulative2026Stats[matchedDriverId] && cumulative2026Stats[matchedDriverId][templateName as keyof DriverStats]) || 0;

      let newValueStr = '';

      if (templateName === 'Points') {
        const trimmedVal = currentValue.trim();
        if (trimmedVal.startsWith('{{#expr:') && trimmedVal.endsWith('}}')) {
          if (trimmedVal.includes('Career Results/Points/2026')) {
            processedDrivers.add(driverIdToWikiName[matchedDriverId]);
            return line;
          }
          const inner = trimmedVal.slice(8, -2).trim();
          newValueStr = `{{#expr: ${inner} + {{Career Results/Points/2026|{{{1}}}}} }}`;
        } else {
          const basePoints = parseFloat(trimmedVal) || 0;
          newValueStr = `{{#expr: ${basePoints} + {{Career Results/Points/2026|{{{1}}}}} }}`;
        }
      } else {
        const baseVal = parseFloat(baseValStr) || 0;
        const totalVal = baseVal + addedVal;
        newValueStr = formatStatValue(templateName, totalVal);
      }

      if (currentValue !== newValueStr) {
        changed = true;
        updates.push({ driver: driverIdToWikiName[matchedDriverId], oldValue: currentValue, newValue: newValueStr });
        const paddedName = name.padEnd(34, ' ');
        return `${prefix}${paddedName}${separator}${newValueStr}${suffix}`;
      }

      return line;
    });

    let finalWikitext = newLines.join('\n');
    let newEntriesAdded = false;
    let currentDriversIndex = finalWikitext.indexOf('<!-- CURRENT DRIVERS -->');
    if (currentDriversIndex !== -1) {
      const insertPos = finalWikitext.indexOf('\n', currentDriversIndex + '<!-- CURRENT DRIVERS -->'.length);
      let entriesToInsert = '';
      Object.keys(driverIdToWikiName).forEach(driverId => {
        const wikiName = driverIdToWikiName[driverId];
        if (!processedDrivers.has(wikiName)) {
          const baseValStr = (BASE_STATS_2025[templateName] && BASE_STATS_2025[templateName][wikiName]) || '0';
          const addedVal = (cumulative2026Stats[driverId] && cumulative2026Stats[driverId][templateName as keyof DriverStats]) || 0;
          const baseVal = parseFloat(baseValStr) || 0;
          const totalVal = baseVal + addedVal;
          const hasBase = baseValStr !== '0' && baseValStr !== '';
          if (totalVal > 0 || hasBase) {
            let valueStr = '';
            if (templateName === 'Points') {
              const trimmedBase = baseValStr.trim();
              if (trimmedBase.startsWith('{{#expr:') && trimmedBase.endsWith('}}')) {
                const inner = trimmedBase.slice(8, -2).trim();
                valueStr = `{{#expr: ${inner} + {{Career Results/Points/2026|{{{1}}}}} }}`;
              } else {
                valueStr = `{{#expr: ${trimmedBase} + {{Career Results/Points/2026|{{{1}}}}} }}`;
              }
            } else {
              valueStr = formatStatValue(templateName, totalVal);
            }
            const paddedName = wikiName.padEnd(34, ' ');
            entriesToInsert += `\n| ${paddedName} = ${valueStr}`;
            processedDrivers.add(wikiName);
            updates.push({ driver: wikiName, oldValue: '(none)', newValue: valueStr });
            newEntriesAdded = true;
          }
        }
      });
      if (newEntriesAdded) {
        finalWikitext = finalWikitext.slice(0, insertPos) + entriesToInsert + finalWikitext.slice(insertPos);
        changed = true;
      }
    }
    return { wikitext: finalWikitext, changed, updates };
  }

  // 2. Locate the end of the OTHER DRIVERS section (where #default or }}</includeonly> begins)
  let otherDriversEndLineIdx = -1;
  for (let i = otherDriversLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('#default') || line.includes('}}</includeonly>')) {
      otherDriversEndLineIdx = i;
      break;
    }
  }
  if (otherDriversEndLineIdx === -1) {
    otherDriversEndLineIdx = lines.length;
  }

  // 3. Extract and parse all existing driver lines from the template
  const currentDriverNames = new Set(Object.values(driverIdToWikiName).map(name => normalizeName(name)));
  const existingTemplateDrivers = new Map<string, { originalName: string; originalValue: string }>();

  for (let i = currentDriversLineIdx + 1; i < otherDriversEndLineIdx; i++) {
    if (i === otherDriversLineIdx) continue; // Skip the "<!-- OTHER DRIVERS -->" divider line
    const line = lines[i];
    const match = line.match(/^(\s*\|\s*)([^=]+?)(\s*=\s*)(.+?)(\s*)$/);
    if (match) {
      const name = match[2].trim();
      const value = match[4].trim();
      existingTemplateDrivers.set(normalizeName(name), {
        originalName: name,
        originalValue: value
      });
    }
  }

  // 4. Construct current drivers list (active in 2026)
  const currentDriversList: { wikiName: string; valueStr: string; sortValue: number }[] = [];
  
  Object.keys(driverIdToWikiName).forEach(driverId => {
    const wikiName = driverIdToWikiName[driverId];
    const normalized = normalizeName(wikiName);

    const baseValStr = (BASE_STATS_2025[templateName] && BASE_STATS_2025[templateName][wikiName]) || '0';
    const addedVal = (cumulative2026Stats[driverId] && cumulative2026Stats[driverId][templateName as keyof DriverStats]) || 0;

    const existing = existingTemplateDrivers.get(normalized);
    const currentValue = existing ? existing.originalValue : '';

    let newValueStr = '';
    if (templateName === 'Points') {
      if (currentValue && currentValue.includes('Career Results/Points/2026')) {
        newValueStr = currentValue;
      } else if (currentValue && currentValue.startsWith('{{#expr:') && currentValue.endsWith('}}')) {
        const inner = currentValue.slice(8, -2).trim();
        newValueStr = `{{#expr: ${inner} + {{Career Results/Points/2026|{{{1}}}}} }}`;
      } else {
        const trimmedBase = baseValStr.trim();
        if (trimmedBase.startsWith('{{#expr:') && trimmedBase.endsWith('}}')) {
          const inner = trimmedBase.slice(8, -2).trim();
          newValueStr = `{{#expr: ${inner} + {{Career Results/Points/2026|{{{1}}}}} }}`;
        } else {
          newValueStr = `{{#expr: ${trimmedBase} + {{Career Results/Points/2026|{{{1}}}}} }}`;
        }
      }
    } else {
      const baseVal = parseFloat(baseValStr) || 0;
      const totalVal = baseVal + addedVal;
      newValueStr = formatStatValue(templateName, totalVal);
    }

    const baseSortVal = getSortValue(baseValStr);
    const sortValue = baseSortVal + addedVal;

    currentDriversList.push({
      wikiName,
      valueStr: newValueStr,
      sortValue
    });

    if (currentValue !== newValueStr) {
      updates.push({
        driver: wikiName,
        oldValue: currentValue || '(none)',
        newValue: newValueStr
      });
    }
  });

  // 5. Construct other drivers list (not active in 2026)
  const otherDriversList: { wikiName: string; valueStr: string; sortValue: number }[] = [];
  
  existingTemplateDrivers.forEach((info, normalized) => {
    if (!currentDriverNames.has(normalized)) {
      const sortValue = getSortValue(info.originalValue);
      otherDriversList.push({
        wikiName: info.originalName,
        valueStr: info.originalValue,
        sortValue
      });
    }
  });

  // 6. Sort both sections descending by sortValue, and alphabetically by wikiName as a tie-breaker
  currentDriversList.sort((a, b) => b.sortValue - a.sortValue || a.wikiName.localeCompare(b.wikiName));
  otherDriversList.sort((a, b) => b.sortValue - a.sortValue || a.wikiName.localeCompare(b.wikiName));

  // 7. Re-assemble final wikitext
  const headerLines = lines.slice(0, currentDriversLineIdx + 1);
  const footerLines = lines.slice(otherDriversEndLineIdx);

  const currentDriversLines = currentDriversList.map(d => formatDriverLine(d.wikiName, d.valueStr));
  const otherDriversLines = otherDriversList.map(d => formatDriverLine(d.wikiName, d.valueStr));

  const finalLines = [
    ...headerLines,
    ...currentDriversLines,
    lines[otherDriversLineIdx], // The "<!-- OTHER DRIVERS -->" divider line
    ...otherDriversLines,
    ...footerLines
  ];

  const finalWikitext = finalLines.join('\n');
  const changed = finalWikitext !== currentWikitext;

  return { wikitext: finalWikitext, changed, updates };
}

// Helper to update the correction text in noinclude
export function updateCorrectionText(
  wikitext: string,
  year: number,
  raceName: string,
  winnerCode: string
): string {
  // Matches ''Correct as of {{F1 GP|YEAR|GP_NAME}} (WINNER_CODE)'' or similar
  const regex = /Correct as of \{\{F1 GP\|[^}]+\}\}(?:\s+\([A-Z]{3}\))?/gi;
  const newText = `Correct as of {{F1 GP|${year}|${raceName.replace(" Grand Prix", "")}}} (${winnerCode})`;
  if (regex.test(wikitext)) {
    return wikitext.replace(regex, newText);
  }
  return wikitext;
}
