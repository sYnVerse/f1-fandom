import { driverIdToWikiName, normalizeName } from './stats';

// 2026 Calendar round-to-slug mapping on StatsF1
const ROUND_TO_STATS_F1_SLUG: Record<number, string> = {
  1: 'australie',
  2: 'chine',
  3: 'japon',
  4: 'miami',
  5: 'canada',
  6: 'monaco',
  7: 'barcelone-catalogne',
  8: 'autriche',
  9: 'grande-bretagne',
  10: 'belgique',
  11: 'hongrie',
  12: 'pays-bas',
  13: 'italie',
  14: 'espagne',
  15: 'azerbaidjan',
  16: 'singapour',
  17: 'etats-unis',
  18: 'mexico-city',
  19: 'sao-paulo',
  20: 'las-vegas',
  21: 'qatar',
  22: 'abou-dhabi'
};

export interface StatsF1DriverResult {
  position: string; // e.g., "1", "2", "ab", "np", "dsq", "nc"
  driverNumber: string;
  driverName: string;
  driverId: string | null;
  team: string;
  laps: number;
  points: number;
  status: string; // e.g., "Finished", "Retired", "Liquid leak", etc.
}

export interface StatsF1VerificationReport {
  round: number;
  slug: string;
  success: boolean;
  message: string;
  results: StatsF1DriverResult[];
  mismatches: string[];
}

// Clean HTML tags and whitespace
function cleanText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#176;/g, '°')
    .replace(/\s+/g, ' ')
    .trim();
}

// Map StatsF1 driver name to our driver ID
export function findDriverId(statsF1Name: string): string | null {
  const normStats = normalizeName(statsF1Name);
  
  // Try exact match with normalized wiki names or driverIds
  for (const [id, wikiName] of Object.entries(driverIdToWikiName)) {
    const normWiki = normalizeName(wikiName);
    if (normStats === normWiki || normStats === id) {
      return id;
    }
  }

  // Try partial match (e.g. "kimi antonelli" matches "andrea kimi antonelli", "carlos sainz" matches "carlos sainz, jr.")
  for (const [id, wikiName] of Object.entries(driverIdToWikiName)) {
    const normWiki = normalizeName(wikiName);
    if (normWiki.includes(normStats) || normStats.includes(normWiki)) {
      return id;
    }
  }

  // Try matching last names
  const statsTokens = normStats.split(/\s+/);
  for (const [id, wikiName] of Object.entries(driverIdToWikiName)) {
    const normWiki = normalizeName(wikiName);
    const wikiTokens = normWiki.split(/\s+/);
    const lastStatsToken = statsTokens[statsTokens.length - 1];
    const lastWikiToken = wikiTokens[wikiTokens.length - 1];
    
    if (lastStatsToken === lastWikiToken || (wikiName === 'Carlos Sainz, Jr.' && lastStatsToken === 'sainz') || (wikiName === 'Carlos Sainz, Jr.' && normStats.includes('sainz'))) {
      return id;
    }
  }

  return null;
}

// Fetch and parse classification page from StatsF1
export async function getStatsF1Results(round: number): Promise<StatsF1DriverResult[]> {
  const slug = ROUND_TO_STATS_F1_SLUG[round];
  if (!slug) {
    throw new Error(`Round ${round} is out of bounds for the 2026 season.`);
  }

  const url = `https://www.statsf1.com/en/2026/${slug}/classement.aspx`;
  console.log(`Fetching StatsF1 results from: ${url}`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`StatsF1 returned HTTP ${res.status}: ${res.statusText}`);
  }

  const html = await res.text();

  // Find the GV_Stats table
  const tableRegex = /<table[^>]*id="[^"]*GV_Stats"[^>]*>([\s\S]*?)<\/table>/i;
  const tableMatch = html.match(tableRegex);

  if (!tableMatch) {
    throw new Error(`Could not find classification table in StatsF1 page.`);
  }

  const tableContent = tableMatch[1];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  const results: StatsF1DriverResult[] = [];

  while ((trMatch = trRegex.exec(tableContent)) !== null) {
    const rowContent = trMatch[1];
    if (rowContent.includes('<thead>') || rowContent.includes('Pos ') || rowContent.includes('Driver ')) {
      continue; // Skip header row
    }

    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    const cells: string[] = [];

    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      cells.push(tdMatch[1]);
    }

    if (cells.length >= 8) {
      const pos = cleanText(cells[0]);
      const driverNumber = cleanText(cells[1]);
      const driverNameRaw = cleanText(cells[2]);
      const team = cleanText(cells[3]);
      const laps = parseInt(cleanText(cells[5]), 10) || 0;
      const statusRaw = cleanText(cells[6]);
      const points = parseFloat(cleanText(cells[7]).replace(/\s/g, '')) || 0;

      // Handle empty row padding if any
      if (!driverNameRaw) continue;

      const driverId = findDriverId(driverNameRaw);
      
      // Clean status text
      let status = "Finished";
      if (pos === "ab") {
        status = statusRaw || "Retired";
      } else if (pos === "np") {
        status = "Did Not Start";
      } else if (pos === "nq") {
        status = "Did Not Qualify";
      } else if (pos === "dsq") {
        status = "Disqualified";
      } else if (pos === "nc") {
        status = "Not Classified";
      }

      results.push({
        position: pos,
        driverNumber,
        driverName: driverNameRaw,
        driverId,
        team,
        laps,
        points,
        status
      });
    }
  }

  return results;
}

// Compare Jolpi API results against StatsF1 results
export function verifyResults(
  jolpiResults: any[],
  statsF1Results: StatsF1DriverResult[]
): { success: boolean; mismatches: string[] } {
  const mismatches: string[] = [];

  // 1. Check if both have results
  if (jolpiResults.length === 0 && statsF1Results.length === 0) {
    return { success: true, mismatches: [] };
  }

  if (jolpiResults.length === 0 || statsF1Results.length === 0) {
    mismatches.push(`Result counts mismatch: Jolpi=${jolpiResults.length}, StatsF1=${statsF1Results.length}`);
    return { success: false, mismatches };
  }

  // 2. Map and match positions
  // Create a map of driverId -> StatsF1 result
  const statsF1Map = new Map<string, StatsF1DriverResult>();
  statsF1Results.forEach(r => {
    if (r.driverId) {
      statsF1Map.set(r.driverId, r);
    }
  });

  // Check each Jolpi result
  jolpiResults.forEach(j => {
    const driverId = j.driver.driverId;
    const wikiName = driverIdToWikiName[driverId] || driverId;
    const jPos = j.positionText || j.position; // e.g. "1", "R", "D", "W"
    const jPts = parseFloat(j.points) || 0;

    const sResult = statsF1Map.get(driverId);
    if (!sResult) {
      mismatches.push(`Driver ${wikiName} (${driverId}) is present in Jolpi results but missing in StatsF1.`);
      return;
    }

    // Compare positions
    // Map position codes:
    // Jolpi: "R" -> Retired/Retired/Accident, "D" -> Disqualified, "W" -> DNS/Did not start
    // StatsF1: "ab" -> Retired, "dsq" -> Disqualified, "np" -> DNS, "nc" -> Not classified
    let isMatch = false;
    const sPos = sResult.position.toLowerCase();

    if (jPos === "R" && (sPos === "ab" || sPos === "nc")) {
      isMatch = true;
    } else if (jPos === "D" && sPos === "dsq") {
      isMatch = true;
    } else if (jPos === "W" && sPos === "np") {
      isMatch = true;
    } else if (jPos === sPos) {
      isMatch = true;
    }

    if (!isMatch) {
      mismatches.push(`${wikiName} position mismatch: Jolpi="${jPos}", StatsF1="${sResult.position}"`);
    }

    // Compare points
    if (jPts !== sResult.points) {
      mismatches.push(`${wikiName} points mismatch: Jolpi=${jPts}, StatsF1=${sResult.points}`);
    }
  });

  // Check for drivers present in StatsF1 but missing in Jolpi
  const jolpiDriverIds = new Set(jolpiResults.map(j => j.driver.driverId));
  statsF1Results.forEach(s => {
    if (s.driverId && !jolpiDriverIds.has(s.driverId)) {
      const wikiName = driverIdToWikiName[s.driverId] || s.driverName;
      mismatches.push(`Driver ${wikiName} (${s.driverId}) is present in StatsF1 results but missing in Jolpi.`);
    }
  });

  return {
    success: mismatches.length === 0,
    mismatches
  };
}
