import { 
  Driver, 
  RaceResult, 
  QualifyingResult, 
  DriverStanding, 
  ConstructorStanding, 
  PracticeSessionData,
  ScheduleRace
} from './f1-api';

const FLAGS: Record<string, string> = {
  "British": "{{GBR}}",
  "Dutch": "{{NED}}",
  "Finnish": "{{FIN}}",
  "French": "{{FRA}}",
  "Spanish": "{{ESP}}",
  "Japanese": "{{JPN}}",
  "German": "{{GER}}",
  "Mexican": "{{MEX}}",
  "Canadian": "{{CAN}}",
  "Monegasque": "{{MCO}}",
  "Australian": "{{AUS}}",
  "Italian": "{{ITA}}",
  "Russian": "{{RAF}}",
  "Chinese": "{{CHN}}",
  "Thai": "{{THA}}",
  "Brazilian": "{{BRA}}",
  "Belgian": "{{BEL}}",
  "Danish": "{{DEN}}",
  "Indonesian": "{{INA}}",
  "Swedish": "{{SWE}}",
  "Polish": "{{POL}}",
  "American": "{{USA}}",
  "New Zealander": "{{NZL}}",
  "Argentine": "{{ARG}}"
};

export function getFlag(nationality: string): string {
  return FLAGS[nationality] || "{{NoFlag}}";
}

export function getNationalityCode(nationality: string): string {
  const flagTemplate = FLAGS[nationality] || "";
  const match = flagTemplate.match(/\{\{([A-Z]{3})\}\}/);
  return match ? match[1] : "";
}

const CONSTRUCTORS: Record<string, string> = {
  "mercedes": "{{GER}} {{Mercedes-CON}}",
  "red_bull": "{{AUT}} {{Red Bull-CON}}",
  "aston_martin": "{{GBR}} {{Aston Martin-Honda}}",
  "ferrari": "{{ITA}} {{Ferrari-CON}}",
  "haas": "{{USA}} {{Haas-Ferrari}}",
  "williams": "{{GBR}} {{Williams-Mercedes}}",
  "alphatauri": "{{ITA}} {{AlphaTauri-Red Bull}}",
  "alpine": "{{FRA}} {{Alpine-Mercedes}}",
  "mclaren": "{{GBR}} {{McLaren-Mercedes}}",
  "alfa": "{{SUI}} {{Alfa Romeo-Ferrari}}",
  "racing_point": "{{GBR}} {{Racing Point-BWT Mercedes}}",
  "renault": "{{FRA}} {{Renault-CON}}",
  "sauber": "{{SUI}} {{Sauber-Ferrari}}",
  "rb": "{{ITA}} {{Racing Bulls-CON}}",
  "cadillac": "{{USA}} {{Cadillac-Ferrari}}",
  "audi": "{{SUI}} {{Audi-CON}}"
};

const STATUSES: Record<string, string> = {
  "R": "{{abbr|Ret|Retired}}",
  "D": "{{abbr|DSQ|Disqualified}}",
  "W": "{{abbr|DNS|Did not start}}"
};

export function getTeamTemplate(constructorId: string, constructorName: string): string {
  if (CONSTRUCTORS[constructorId]) {
    return CONSTRUCTORS[constructorId];
  }
  return `{{${constructorName}-CON}}`;
}

// Convert time differential (e.g. +0.087s) to absolute based on a base time
export function convertTimeDifferentialToAbsolute(baseTime: string, differential: string): string {
  if (!differential || !baseTime) return differential;
  try {
    const diffStr = differential.replace('+', '').replace('s', '').trim();
    const diffSeconds = parseFloat(diffStr);
    if (isNaN(diffSeconds)) return differential;

    let baseTotalSeconds = 0;
    if (baseTime.includes(':')) {
      const parts = baseTime.split(':');
      const baseMinutes = parseInt(parts[0], 10);
      const baseSeconds = parseFloat(parts[1]);
      baseTotalSeconds = baseMinutes * 60 + baseSeconds;
    } else {
      baseTotalSeconds = parseFloat(baseTime);
    }

    if (isNaN(baseTotalSeconds)) return differential;

    const absoluteTotalSeconds = baseTotalSeconds + diffSeconds;
    const absoluteMinutes = Math.floor(absoluteTotalSeconds / 60);
    const absoluteSeconds = absoluteTotalSeconds % 60;

    if (absoluteMinutes > 0) {
      const formattedSecs = absoluteSeconds.toLocaleString('en-US', {
        minimumIntegerDigits: 2,
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      });
      return `${absoluteMinutes}:${formattedSecs}`;
    } else {
      return absoluteSeconds.toFixed(3);
    }
  } catch (e) {
    return differential;
  }
}

// Calculate 107% time
export function calculate107Time(time: string): string {
  if (!time || !time.includes(':')) return time;
  try {
    const parts = time.split(':');
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    const totalSeconds = (minutes * 60 + seconds) * 1.07;

    const outMinutes = Math.floor(totalSeconds / 60);
    const outSeconds = totalSeconds % 60;
    return `${outMinutes}:${outSeconds.toFixed(3)}`;
  } catch (e) {
    return time;
  }
}

// Helper to parse time to comparison seconds
function timeToSeconds(t: string): number {
  if (!t || t === 'nan') return Infinity;
  const parts = t.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(t);
}

// Generate GRID results wikitext
export function generateGridWikitext(qualifyingResults: QualifyingResult[]): string {
  let output = '===Grid===\n';
  output += '<div class="mw-customtoggle-Grid wds-button wds-is-secondary">Show Grid</div>\n';
  output += '<div class="mw-collapsible mw-collapsed" id="mw-customcollapsible-Grid">\n';
  output += '{{Grid/2-2/34r\n';

  for (const q of qualifyingResults) {
    const name = `${q.driver.givenName} ${q.driver.familyName}`;
    const lastName = q.driver.familyName;
    const number = q.number;
    const flag = getFlag(q.driver.nationality);

    output += `| ${flag} ${number}. [[${name}|${lastName}]]\n`;
  }

  output += '}}</div>';
  return output;
}

// Generate QUALIFYING results wikitext
export function generateQualifyingWikitext(qualifyingResults: QualifyingResult[]): string {
  if (qualifyingResults.length === 0) return 'No qualifying data available.';

  const totalDrivers = qualifyingResults.length;
  const q3Count = Math.min(10, totalDrivers);
  const q2ElimCount = Math.max(0, Math.floor((totalDrivers - q3Count) / 2));
  const q1ElimCount = Math.max(0, totalDrivers - q3Count - q2ElimCount);

  // Sort lists for position calculation
  const sortQ1 = [...qualifyingResults].sort((a, b) => timeToSeconds(a.Q1) - timeToSeconds(b.Q1));
  const sortQ2 = [...qualifyingResults].sort((a, b) => timeToSeconds(a.Q2 || '') - timeToSeconds(b.Q2 || ''));

  // Find driver number with fastest time in Q1 & Q2
  let fastestQ1Number = '';
  for (const q of sortQ1) {
    if (q.Q1 && q.Q1 !== 'nan') {
      fastestQ1Number = q.number;
      break;
    }
  }

  let fastestQ2Number = '';
  for (const q of sortQ2) {
    if (q.Q2 && q.Q2 !== 'nan') {
      fastestQ2Number = q.number;
      break;
    }
  }

  let oneZeroSevenBase = '';
  for (const q of qualifyingResults) {
    if (q.number === fastestQ1Number) {
      oneZeroSevenBase = q.Q1;
      break;
    }
  }

  let output = `===Qualifying Results===
The full qualifying results for the '''{{PAGENAME}}''' are outlined below:

{|class="wikitable" width=100% style="font-size:77%"
! rowspan=2 width=4% | <span style="cursor:help" title="Position">Pos.</span>
! rowspan=2 width=5% | <span style="cursor:help" title="Car Number">No.</span>
! rowspan=2 width=23% | Driver
! rowspan=2 width=23% | Team
| rowspan=${totalDrivers + 6} width=1px |
! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 1">Q1</span>
| rowspan=${totalDrivers + 6} width=1px |
! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 2">Q2</span>
| rowspan=${totalDrivers + 6} width=1px |
! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 3">Q3</span>
! rowspan=2 width=5% | Grid
|-
! width=4% | <span style="cursor:help" title="Position">Pos.</span>
! width=9% | Time
! width=4% | <span style="cursor:help" title="Position">Pos.</span>
! width=9% | Time
! width=4% | <span style="cursor:help" title="Position">Pos.</span>
! width=9% | Time`;

  for (let row = 0; row < totalDrivers; row++) {
    const q = qualifyingResults[row];
    const team = getTeamTemplate(q.constructor.constructorId, q.constructor.name);
    const driver = `${getFlag(q.driver.nationality)} [[${q.driver.givenName} ${q.driver.familyName}]]`;
    const number = q.number;
    const pos = q.position;

    // Print drop indicators
    if (row === q3Count || row === q3Count + q2ElimCount) {
      output += '\n|-\n|colspan=14 style="border-bottom:hidden"|\n|-\n|colspan=14|\n|-';
    } else {
      output += '\n|-';
    }

    output += `\n! ${pos}`;
    output += `\n| align=center | ${number}`;
    output += `\n| ${driver}`;
    output += `\n| ${team}`;

    // Q1
    if (row >= q3Count + q2ElimCount) {
      output += `\n! ${pos}`;
    } else {
      const q1Pos = sortQ1.findIndex(x => x.number === number) + 1;
      output += `\n! ${q1Pos}`;
    }

    if (fastestQ1Number === number) {
      output += `\n| '''${q.Q1}'''`;
    } else {
      output += `\n| ${q.Q1 || ''}`;
    }

    // Q2
    if (row < q3Count + q2ElimCount) {
      if (row >= q3Count) {
        output += `\n! ${pos}`;
      } else {
        const q2Pos = sortQ2.findIndex(x => x.number === number) + 1;
        output += `\n! ${q2Pos}`;
      }

      if (q.Q2 && q.Q2 !== 'nan') {
        if (fastestQ2Number === number) {
          output += `\n| '''${q.Q2}'''`;
        } else {
          output += `\n| ${q.Q2}`;
        }
      } else {
        output += `\n| `;
      }
    } else if (row === q3Count + q2ElimCount) {
      output += `\n! rowspan="${q1ElimCount}" |`;
      output += `\n| rowspan="${q1ElimCount}" |`;
      output += `\n! rowspan="${q1ElimCount}" |`;
      output += `\n| rowspan="${q1ElimCount}" |`;
    }

    // Q3
    if (row < q3Count) {
      output += `\n! ${pos}`;
      if (q.Q3 && q.Q3 !== 'nan') {
        if (row === 0) {
          output += `\n| '''${q.Q3}'''`;
        } else {
          output += `\n| ${q.Q3}`;
        }
      } else {
        output += `\n| `;
      }
    } else if (row === q3Count) {
      output += `\n! rowspan="${q2ElimCount}" |`;
      output += `\n| rowspan="${q2ElimCount}" |`;
    }

    // Grid
    output += `\n! ${pos}`;
  }

  const oneZeroSevenTime = calculate107Time(oneZeroSevenBase);
  output += `\n|-
! colspan=14 | [[107% Time]]: ${oneZeroSevenTime}
|-
! colspan=14 | Source:<ref name=QR>[https://www.fia.com/system/files/decision-document/{{lc:{{PAGENAMEE}}}}_-_final_qualifying_classification.pdf {{PAGENAME}} - Final Qualifying Classification] (PDF). Fédération Internationale de l'Automobile.</ref>
|}`;
  output += "\n*'''Bold''' indicates the fastest driver's time in each session.";

  return output;
}

// Generate RACE or SPRINT results wikitext
export function generateRaceWikitext(results: RaceResult[], isSprint = false): string {
  if (results.length === 0) return `No ${isSprint ? 'sprint' : 'race'} data available.`;

  let output = '';
  if (isSprint) {
    output += `===Sprint Results===
The full Sprint results for the '''{{PAGENAME}}''' are outlined below:
{| class="wikitable"
! <span style="cursor:help;" title=" Position">Pos.</span>
! <span style="cursor:help;" title=" Car number">No.</span>
! Driver
! Constructor
! <span style="cursor:help;" title=" Laps completed">Laps</span>
! <span style="cursor:help;" title=" Time for winner, time or number laps behind leader or reason for retirement">Time/Retired</span>
! <span style="cursor:help;" title=" Grid position">Grid</span>
! <span style="cursor:help;" title=" Points gained from race">Points</span>`;
  } else {
    output += `===Results===
The full race results for the '''{{PAGENAME}}''' are outlined below:
{| class="wikitable"
! <span style="cursor:help;" title=" Position">Pos.</span>
! <span style="cursor:help;" title=" Car number">No.</span>
! Driver
! Constructor
! <span style="cursor:help;" title=" Laps completed">Laps</span>
! <span style="cursor:help;" title=" Time for winner, time or number laps behind leader or reason for retirement">Time/Retired</span>
! <span style="cursor:help;" title=" Grid position">Grid</span>
! <span style="cursor:help;" title=" Points gained from race">Points</span>`;
  }

  for (let x = 0; x < results.length; x++) {
    const y = results[x];
    const team = getTeamTemplate(y.constructor.constructorId, y.constructor.name);
    const driver = `${getFlag(y.driver.nationality)} [[${y.driver.givenName} ${y.driver.familyName}]]`;
    const number = y.number;
    const pos = y.position;
    
    let gridVal = y.grid;
    if (gridVal === "0") {
      gridVal = "{{abbr|PL|Pit Lane}}";
    }

    const points = y.points;
    const laps = y.laps;
    const status = y.status;
    const timeVal = y.Time ? y.Time.time : status;

    output += '\n|-';

    const posStr = STATUSES[pos] || pos;
    output += `\n! ${posStr}`;
    output += `\n| align=center | ${number}`;
    output += `\n| ${driver}`;
    output += `\n| ${team}`;
    output += `\n| ${laps}`;
    output += `\n| ${timeVal}`;
    output += `\n| ${gridVal}`;

    // points column with FL indicator
    if (points !== '0') {
      if (!isSprint) {
        const standardPts = ['26', '19', '16', '13', '11', '9', '7', '5', '3'];
        const isFL = standardPts.includes(points) || (points === '2' && pos === '10');
        if (isFL) {
          output += `\n! ${points}<sup>{{abbr|[[Fastest Lap|FL]]|+1 point for achieving the fastest lap}}</sup>`;
        } else {
          output += `\n! ${points}`;
        }
      } else {
        output += `\n! ${points}`;
      }
    } else {
      // add blanks in points column
      if (isSprint) {
        if (x === 8) {
          output += `\n! rowspan=${results.length - 8} |`;
        }
      } else {
        if (x === 10) {
          output += `\n! rowspan=${results.length - 10} |`;
        }
      }
    }
  }

  output += '\n|-';
  if (isSprint) {
    output += `\n! colspan="8" | Source:<ref name="SR">[https://www.fia.com/system/files/decision-document/{{lc:{{PAGENAMEE}}}}_-_final_sprint_classification.pdf {{PAGENAME}} - Final Sprint Classification] (PDF). Fédération Internationale de l'Automobile.</ref>`;
  } else {
    output += `\n! colspan="8" | Source:<ref name="RR">[https://www.fia.com/system/files/decision-document/{{lc:{{PAGENAMEE}}}}_-_final_race_classification.pdf {{PAGENAME}} - Final Race Classification] (PDF). Fédération Internationale de l'Automobile.</ref>`;
  }
  output += '\n|}';

  return output;
}

// Generate STANDINGS results wikitext
export function generateStandingsWikitext(
  currentDrivers: DriverStanding[],
  prevDrivers: DriverStanding[] | null,
  currentConstructors: ConstructorStanding[],
  prevConstructors: ConstructorStanding[] | null
): string {
  let output = '==Standings==\n\n';
  output += '{{Col-begin}}\n';
  output += '{{Col-2}}\n';
  output += '{|class="wikitable" style="width:88%"\n';
  output += "! colspan=4|Drivers' World Championship\n";
  output += '|-\n';
  output += '! <span style="cursor:help" title="Position">Pos.</span>\n';
  output += '! Driver\n';
  output += '! <span style="cursor:help" title="Points">Pts.</span>\n';
  output += '! +/-\n';

  // Driver standings
  const prevDriverPositions: Record<string, number> = {};
  if (prevDrivers) {
    prevDrivers.forEach(d => {
      prevDriverPositions[d.Driver.driverId] = parseInt(d.position, 10);
    });
  }

  for (let x = 0; x < currentDrivers.length; x++) {
    const ds = currentDrivers[x];
    const pos = ds.position;
    const pts = ds.points;
    const driverId = ds.Driver.driverId;
    const driver = `${getFlag(ds.Driver.nationality)} [[${ds.Driver.givenName} ${ds.Driver.familyName}]]`;

    // Position change
    let posChange = '{{X}}';
    if (prevDrivers) {
      const currentPosVal = parseInt(pos, 10);
      const prevPosVal = prevDriverPositions[driverId];
      if (prevPosVal !== undefined) {
        if (currentPosVal < prevPosVal) {
          posChange = `{{+}}${prevPosVal - currentPosVal}`;
        } else if (currentPosVal > prevPosVal) {
          posChange = `{{-}}${currentPosVal - prevPosVal}`;
        }
      }
    }

    output += '|-\n';

    let posLabel = `${pos}th`;
    if (pos === '1') {
      output += '| {{1st}}\n';
      output += `| '''${driver}'''\n`;
      output += `| '''${pts}'''\n`;
    } else if (pos === '2') {
      output += '| {{2nd}}\n';
      output += `| ${driver}\n`;
      output += `| ${pts}\n`;
    } else if (pos === '3') {
      output += '| {{3rd}}\n';
      output += `| ${driver}\n`;
      output += `| ${pts}\n`;
    } else {
      if (pos === '21') posLabel = '21st';
      else if (pos === '22') posLabel = '22nd';
      else if (pos === '23') posLabel = '23rd';
      output += `| ${posLabel}\n`;
      output += `| ${driver}\n`;
      output += `| ${pts}\n`;
    }

    output += `| ${posChange}\n`;
  }

  output += '|}\n';

  // Constructor standings
  output += '{{Col-2}}\n';
  output += '{|class="wikitable" style="width:85%"\n';
  output += "! colspan=4|Constructors' World Championship\n";
  output += '|-\n';
  output += '! <span style="cursor:help" title="Position">Pos.</span>\n';
  output += '! Team\n';
  output += '! <span style="cursor:help" title="Points">Pts.</span>\n';
  output += '! +/-\n';

  const prevConstPositions: Record<string, number> = {};
  if (prevConstructors) {
    prevConstructors.forEach(c => {
      prevConstPositions[c.Constructor.constructorId] = parseInt(c.position, 10);
    });
  }

  for (let x = 0; x < currentConstructors.length; x++) {
    const cs = currentConstructors[x];
    const pos = cs.position;
    const pts = cs.points;
    const constId = cs.Constructor.constructorId;
    const team = getTeamTemplate(constId, cs.Constructor.name);

    let posChange = '{{X}}';
    if (prevConstructors) {
      const currentPosVal = parseInt(pos, 10);
      const prevPosVal = prevConstPositions[constId];
      if (prevPosVal !== undefined) {
        if (currentPosVal < prevPosVal) {
          posChange = `{{+}}${prevPosVal - currentPosVal}`;
        } else if (currentPosVal > prevPosVal) {
          posChange = `{{-}}${currentPosVal - prevPosVal}`;
        }
      }
    }

    output += '|-\n';

    if (pos === '1') {
      output += '| {{1st}}\n';
      output += `| '''${team}'''\n`;
      output += `| '''${pts}'''\n`;
    } else if (pos === '2') {
      output += '| {{2nd}}\n';
      output += `| ${team}\n`;
      output += `| ${pts}\n`;
    } else if (pos === '3') {
      output += '| {{3rd}}\n';
      output += `| ${team}\n`;
      output += `| ${pts}\n`;
    } else {
      output += `| ${pos}th\n`;
      output += `| ${team}\n`;
      output += `| ${pts}\n`;
    }

    output += `| ${posChange}\n`;
  }

  output += '|}\n';
  output += '{{Col-end}}';

  return output;
}

// Generate PRACTICE results wikitext
export function generatePracticeWikitext(
  drivers: Driver[],
  qualiResults: QualifyingResult[] | null,
  fp1: Record<string, PracticeSessionData> | null,
  fp2: Record<string, PracticeSessionData> | null,
  fp3: Record<string, PracticeSessionData> | null,
  options?: { hasSprint?: boolean }
): string {
  const hasSprint = options?.hasSprint ?? false;

  const mainDriverKeys = new Set<string>();
  for (const driver of drivers) {
    mainDriverKeys.add(driver.driverId.toLowerCase());
    mainDriverKeys.add(`${driver.givenName} ${driver.familyName}`.toLowerCase());
    mainDriverKeys.add(`${driver.givenName}${driver.familyName}`.toLowerCase().replace(/[\s'-]/g, ''));
  }

  const isMainDriver = (name: string): boolean => {
    const lower = name.toLowerCase();
    const clean = lower.replace(/[\s'-]/g, '');
    return mainDriverKeys.has(lower) || mainDriverKeys.has(clean);
  };

  const collectTestDrivers = (
    sessionData: Record<string, PracticeSessionData> | null
  ): PracticeSessionData[] => {
    if (!sessionData) return [];
    const seen = new Set<string>();
    const testDrivers: PracticeSessionData[] = [];
    for (const data of Object.values(sessionData)) {
      if (isMainDriver(data.driverName)) continue;
      const key = data.driverName.toLowerCase().replace(/[\s'-]/g, '');
      if (seen.has(key)) continue;
      seen.add(key);
      testDrivers.push(data);
    }
    return testDrivers.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  };

  const testDriverRows = [
    ...collectTestDrivers(fp1),
    ...collectTestDrivers(hasSprint ? null : fp2),
    ...collectTestDrivers(hasSprint ? null : fp3),
  ].filter((td, idx, arr) => {
    const key = td.driverName.toLowerCase().replace(/[\s'-]/g, '');
    return arr.findIndex(x => x.driverName.toLowerCase().replace(/[\s'-]/g, '') === key) === idx;
  });

  const tableDrivers: Array<Driver | PracticeSessionData> = [...drivers];
  for (const td of testDriverRows) {
    tableDrivers.push(td);
  }

  const sortedDrivers = [...tableDrivers].sort((a, b) => {
    const numA = parseInt(('permanentNumber' in a ? a.permanentNumber : a.number) || '0', 10);
    const numB = parseInt(('permanentNumber' in b ? b.permanentNumber : b.number) || '0', 10);
    return numA - numB;
  });

  const driverToConstructorTemplate: Record<string, string> = {};
  if (qualiResults) {
    qualiResults.forEach(q => {
      driverToConstructorTemplate[q.driver.driverId] = getTeamTemplate(q.constructor.constructorId, q.constructor.name);
    });
  }

  const findFastestTime = (sessionData: Record<string, PracticeSessionData> | null): string | null => {
    if (!sessionData) return null;
    let fastestTime: string | null = null;

    for (const data of Object.values(sessionData)) {
      if (data.position === '1') {
        fastestTime = data.time;
        break;
      }
    }

    if (!fastestTime) {
      for (const data of Object.values(sessionData)) {
        const t = data.time;
        if (t && t.includes(':') && !t.startsWith('+')) {
          if (!fastestTime || timeToSeconds(t) < timeToSeconds(fastestTime)) {
            fastestTime = t;
          }
        }
      }
    }

    return fastestTime;
  };

  const fp1Fastest = findFastestTime(fp1);
  const fp2Fastest = findFastestTime(fp2);
  const fp3Fastest = findFastestTime(fp3);

  const colspan = hasSprint ? 8 : 14;

  let output = `===Practice Results===
The full practice results for the '''{{PAGENAME}}''' are outlined below:

{| class="hidden wikitable sortable" style="width:100%"
! rowspan="2" |<span style="cursor:help;" title="Car number">No.</span>!! rowspan="2" class="unsortable" |Driver!! rowspan="2" class="unsortable" |Team!! colspan="2" class="unsortable" |FP1`;

  if (!hasSprint) {
    output += ' !! colspan="2" class="unsortable" |FP2 !! colspan="2" class="unsortable" |FP3';
  }

  output += `
|-
!Time!!Pos`;

  if (!hasSprint) {
    output += '!!Time!!Pos!!Time!!Pos';
  }

  for (const entry of sortedDrivers) {
    const isTestDriver = 'driverName' in entry;
    const num = isTestDriver ? entry.number : (entry.permanentNumber || '0');
    const name = isTestDriver ? entry.driverName : `${entry.givenName} ${entry.familyName}`;
    const flag = isTestDriver
      ? (lookupTestDriverNationality(name) ? getFlag(lookupTestDriverNationality(name)!) : '{{FIA}}')
      : getFlag(entry.nationality);

    let team: string;
    if (isTestDriver) {
      const constructorId = teamNameToConstructorId(entry.teamName);
      team = constructorId
        ? (getTeamEntryDetails(constructorId)?.constructor || getTeamTemplate(constructorId, entry.teamName))
        : `{{${entry.teamName}-CON}}`;
    } else {
      team = driverToConstructorTemplate[entry.driverId] || '{{Team-Placeholder}}';
    }

    output += '\n|-';
    output += `\n! ${num}`;
    output += `\n| ${flag} [[${name}]]`;
    output += `\n| ${team}`;

    const renderSessionCells = (
      sessionData: Record<string, PracticeSessionData> | null,
      fastestTime: string | null,
      driverName: string
    ): string => {
      if (!sessionData) {
        return '\n| colspan="2" align=center | {{abbr|DNP|Did Not Participate}}';
      }

      let matchedData: PracticeSessionData | null = null;
      const checkKeys = [
        driverName,
        driverName.replace(/[\s'-]/g, ''),
      ].map(k => k.toLowerCase());

      for (const [k, d] of Object.entries(sessionData)) {
        const cleanK = k.toLowerCase().replace(/[\s'-]/g, '');
        if (checkKeys.includes(cleanK) || cleanK.includes(checkKeys[0]) || checkKeys[0].includes(cleanK)) {
          matchedData = d;
          break;
        }
      }

      if (matchedData) {
        let time = matchedData.time;
        const pos = matchedData.position;

        if (time && time !== 'No Time' && fastestTime) {
          if (time.startsWith('+') || (time.endsWith('s') && !time.includes(':'))) {
            time = convertTimeDifferentialToAbsolute(fastestTime, time);
          }
        }

        return `\n| ${time}\n| align=center | ${pos}`;
      }

      return '\n| colspan="2" align=center | {{abbr|DNP|Did Not Participate}}';
    };

    output += renderSessionCells(fp1, fp1Fastest, name);
    if (!hasSprint) {
      output += renderSessionCells(fp2, fp2Fastest, name);
      output += renderSessionCells(fp3, fp3Fastest, name);
    }
  }

  if (hasSprint) {
    output += `\n|-
! colspan="${colspan}" style="text-align:center" |'''Source:''' <ref name="P1">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_free_practice_1_classification.pdf {{PAGENAME}} - FP1 Classification] (PDF). Fédération Internationale de l'Automobile.</ref>
|}`;
  } else {
    output += `\n|-
! colspan="${colspan}" style="text-align:center" |'''Source:''' <ref name="P1">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_free_practice_1_classification.pdf {{PAGENAME}} - FP1 Classification] (PDF). Fédération Internationale de l'Automobile.</ref><ref name="P2">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_free_practice_2_classification.pdf {{PAGENAME}} - FP2 Classification] (PDF). Fédération Internationale de l'Automobile.</ref><ref name="P3">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_free_practice_3_classification.pdf {{PAGENAME}} - FP3 Classification] (PDF). Fédération Internationale de l'Automobile.</ref>
|}`;
  }

  return output;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "Australia": "AUS",
  "Bahrain": "BHR",
  "Saudi Arabia": "SAU",
  "Japan": "JPN",
  "China": "CHN",
  "United States": "USA",
  "USA": "USA",
  "Miami": "USA",
  "Italy": "ITA",
  "Monaco": "MCO",
  "Canada": "CAN",
  "Spain": "ESP",
  "Austria": "AUT",
  "United Kingdom": "GBR",
  "UK": "GBR",
  "Great Britain": "GBR",
  "Hungary": "HUN",
  "Belgium": "BEL",
  "Netherlands": "NED",
  "Azerbaijan": "AZE",
  "Singapore": "SGP",
  "Mexico": "MEX",
  "Brazil": "BRA",
  "Las Vegas": "USA",
  "Qatar": "QAT",
  "Abu Dhabi": "ARE",
  "UAE": "ARE"
};

const DRIVER_TO_CONSTRUCTOR_2026: Record<string, string> = {
  "max_verstappen": "red_bull",
  "hadjar": "red_bull",
  "leclerc": "ferrari",
  "hamilton": "ferrari",
  "russell": "mercedes",
  "antonelli": "mercedes",
  "gasly": "alpine",
  "colapinto": "alpine",
  "norris": "mclaren",
  "piastri": "mclaren",
  "sainz": "williams",
  "albon": "williams",
  "lawson": "rb",
  "arvid_lindblad": "rb",
  "stroll": "aston_martin",
  "alonso": "aston_martin",
  "hulkenberg": "sauber",
  "bortoleto": "sauber",
  "ocon": "haas",
  "bearman": "haas",
  "bottas": "cadillac",
  "perez": "cadillac"
};

export interface TeamEntryDetails {
  entrant: string;
  constructor: string;
  chassis: string;
  engine: string;
  model: string;
  tyre: string;
}

const TEAM_DETAILS_2026: Record<string, TeamEntryDetails> = {
  "mclaren": {
    entrant: "{{GBR}} [[McLaren|McLaren Mastercard F1 Team]]",
    constructor: "{{McLaren-CON}}",
    chassis: "[[McLaren MCL40|MCL40]]",
    engine: "{{Mercedes-ENG}}",
    model: "[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "sauber": {
    entrant: "{{SUI}} [[Sauber|Revolut Audi F1 Team]]",
    constructor: "[[Audi]]",
    chassis: "[[Sauber R26|R26]]",
    engine: "{{Audi-ENG}}",
    model: "TBA 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "audi": {
    entrant: "{{SUI}} [[Audi|Revolut Audi F1 Team]]",
    constructor: "[[Audi]]",
    chassis: "[[Audi R26|R26]]",
    engine: "{{Audi-ENG}}",
    model: "TBA 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "red_bull": {
    entrant: "{{AUT}} [[Red Bull Racing|Oracle Red Bull Racing]]",
    constructor: "{{Red Bull-CON}}",
    chassis: "[[Red Bull RB22|RB22]]",
    engine: "{{RBPT-ENG}}",
    model: "[[Red Bull Powertrains]]-[[Ford]] TBA 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "alpine": {
    entrant: "{{FRA}} [[Alpine|BWT Alpine F1 Team]]",
    constructor: "{{Alpine-CON}}",
    chassis: "[[Alpine A526|A526]]",
    engine: "{{Mercedes-ENG}}",
    model: "[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "cadillac": {
    entrant: "{{USA}} [[Cadillac|Cadillac Formula 1 Team]]",
    constructor: "{{Cadillac-CON}}",
    chassis: "TBA",
    engine: "{{Ferrari-ENG}}",
    model: "[[Ferrari 067|067]] 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "mercedes": {
    entrant: "{{GER}} [[Mercedes Grand Prix|Mercedes-AMG Petronas F1 Team]]",
    constructor: "{{Mercedes-CON}}",
    chassis: "[[Mercedes W17|F1 W17]]",
    engine: "{{Mercedes-ENG}}",
    model: "[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "aston_martin": {
    entrant: "{{GBR}} [[Aston Martin|Aston Martin Aramco F1 Team]]",
    constructor: "{{Aston Martin-CON}}",
    chassis: "[[Aston Martin AMR26|AMR26]]",
    engine: "{{Honda-ENG}}",
    model: "TBA 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "ferrari": {
    entrant: "{{ITA}} [[Scuderia Ferrari|Scuderia Ferrari HP]]",
    constructor: "{{Ferrari-CON}}",
    chassis: "[[Ferrari SF-26|SF-26]]",
    engine: "{{Ferrari-ENG}}",
    model: "[[Ferrari 067|067]] 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "williams": {
    entrant: "{{GBR}} [[Williams|Atlassian Williams Racing]]",
    constructor: "{{Williams-CON}}",
    chassis: "[[Williams FW48|FW48]]",
    engine: "{{Mercedes-ENG}}",
    model: "[[Mercedes-AMG F1 M17|F1 M17]] 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "rb": {
    entrant: "{{ITA}} [[Racing Bulls|Visa Cash App Racing Bulls F1 Team]]",
    constructor: "{{Racing Bulls-CON}}",
    chassis: "[[Racing Bulls VCARB 03|VCARB 03]]",
    engine: "{{RBPT-ENG}}",
    model: "[[Red Bull Powertrains]]-[[Ford]] TBA 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  },
  "haas": {
    entrant: "{{USA}} [[Haas|Toyota Gazoo Racing Haas F1 Team]]",
    constructor: "{{Haas-CON}}",
    chassis: "[[Haas VF-26|VF-26]]",
    engine: "{{Ferrari-ENG}}",
    model: "[[Ferrari 067|067]] 1.6 [[V6]][[Turbocharger|t]]",
    tyre: "{{Pirelli}}"
  }
};

export function getTeamEntryDetails(constructorId: string): TeamEntryDetails | null {
  return TEAM_DETAILS_2026[constructorId] || null;
}

const TEAM_NAME_TO_CONSTRUCTOR: Record<string, string> = {
  'mclaren': 'mclaren',
  'ferrari': 'ferrari',
  'mercedes': 'mercedes',
  'red bull': 'red_bull',
  'red bull racing': 'red_bull',
  'alpine': 'alpine',
  'williams': 'williams',
  'haas': 'haas',
  'haas f1 team': 'haas',
  'aston martin': 'aston_martin',
  'sauber': 'sauber',
  'audi': 'audi',
  'racing bulls': 'rb',
  'visa cash app racing bulls': 'rb',
  'cadillac': 'cadillac',
};

export function teamNameToConstructorId(teamName: string): string | null {
  const key = teamName.toLowerCase().trim();
  if (TEAM_NAME_TO_CONSTRUCTOR[key]) {
    return TEAM_NAME_TO_CONSTRUCTOR[key];
  }
  for (const [name, id] of Object.entries(TEAM_NAME_TO_CONSTRUCTOR)) {
    if (key.includes(name) || name.includes(key)) {
      return id;
    }
  }
  return null;
}

const TEST_DRIVER_NATIONALITIES: Record<string, string> = {
  'patricio o\'ward': 'Mexican',
  'patricio oward': 'Mexican',
  'felipe drugovich': 'Brazilian',
  'isack hadjar': 'French',
  'arvid lindblad': 'British',
  'gabriel bortoleto': 'Brazilian',
  'franco colapinto': 'Argentine',
  'andrea kimi antonelli': 'Italian',
  'liam lawson': 'New Zealander',
};

export function lookupTestDriverNationality(driverName: string): string | null {
  const key = driverName.toLowerCase().replace(/[\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (TEST_DRIVER_NATIONALITIES[key]) {
    return TEST_DRIVER_NATIONALITIES[key];
  }
  for (const [name, nationality] of Object.entries(TEST_DRIVER_NATIONALITIES)) {
    const normalized = name.replace(/[\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (key.includes(normalized) || normalized.includes(key)) {
      return nationality;
    }
  }
  return null;
}

export interface TestDriverEntry {
  number: string;
  name: string;
  flag: string;
  constructorId: string;
}

export function detectTestDriversFromFp1(
  mainDrivers: Driver[],
  fp1: Record<string, PracticeSessionData> | null
): TestDriverEntry[] {
  if (!fp1 || Object.keys(fp1).length === 0) return [];

  const mainDriverKeys = new Set<string>();
  for (const driver of mainDrivers) {
    mainDriverKeys.add(driver.driverId.toLowerCase());
    mainDriverKeys.add(`${driver.givenName} ${driver.familyName}`.toLowerCase());
    mainDriverKeys.add(`${driver.givenName}${driver.familyName}`.toLowerCase().replace(/[\s'-]/g, ''));
  }

  const testDrivers: TestDriverEntry[] = [];
  const seen = new Set<string>();

  for (const data of Object.values(fp1)) {
    const name = data.driverName;
    const cleanName = name.toLowerCase().replace(/[\s'-]/g, '');
    if (mainDriverKeys.has(name.toLowerCase()) || mainDriverKeys.has(cleanName)) {
      continue;
    }
    if (seen.has(cleanName)) continue;
    seen.add(cleanName);

    const constructorId = teamNameToConstructorId(data.teamName) || '';
    const nationality = lookupTestDriverNationality(name);
    const flag = nationality ? getFlag(nationality) : '{{FIA}}';

    testDrivers.push({
      number: data.number,
      name,
      flag,
      constructorId,
    });
  }

  return testDrivers.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
}

const ENTRY_LIST_HEADING_VARIANTS = [
  '==Entry List==',
  '== Entry List ==',
  '===Entry List===',
  '=== Entry List ===',
];

export function findEntryListHeadingIndex(wikitext: string): number {
  let bestIndex = -1;
  for (const variant of ENTRY_LIST_HEADING_VARIANTS) {
    const idx = wikitext.indexOf(variant);
    if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
      bestIndex = idx;
    }
  }
  return bestIndex;
}

export function addTestDriversToEntryList(wikitext: string, testDrivers: TestDriverEntry[]): string {
  if (testDrivers.length === 0) return wikitext;

  const headingIndex = findEntryListHeadingIndex(wikitext);
  if (headingIndex === -1) return wikitext;

  const afterHeading = wikitext.slice(headingIndex);
  const newDrivers = testDrivers.filter(td => {
    const nameLower = td.name.toLowerCase();
    return !afterHeading.toLowerCase().includes(`[[${nameLower}]]`) &&
      !afterHeading.toLowerCase().includes(td.name.toLowerCase());
  });

  if (newDrivers.length === 0) return wikitext;

  const sourceMarkers = [
    '! colspan="8" align="center" |\'\'\'Source\'\'\'',
    '! colspan="8" | Source:',
    '! colspan="8" align="center" |Source',
  ];

  let insertIndex = -1;
  for (const marker of sourceMarkers) {
    const idx = afterHeading.indexOf(marker);
    if (idx !== -1) {
      insertIndex = headingIndex + idx;
      break;
    }
  }

  if (insertIndex === -1) {
    const closeIdx = afterHeading.indexOf('|}');
    if (closeIdx === -1) return wikitext;
    insertIndex = headingIndex + closeIdx;
  }

  let rows = '\n|-\n|colspan="8" | [[Test Driver]]s for [[#FP1|Practice 1]]';
  for (const td of newDrivers) {
    const team = td.constructorId ? getTeamEntryDetails(td.constructorId) : null;
    const entrant = team ? team.entrant : '';
    const constructor = team ? team.constructor : '';
    const chassis = team ? team.chassis : '';
    const engine = team ? team.engine : '';
    const model = team ? team.model : '';
    const tyre = team ? team.tyre : '{{Pirelli}}';

    rows += `\n|-\n!${td.number}\n|${td.flag} [[${td.name}]]\n|${entrant}\n|${constructor}\n|${chassis}\n|${engine}\n|${model}\n|${tyre}`;
  }

  return wikitext.slice(0, insertIndex) + rows + '\n' + wikitext.slice(insertIndex);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatDateRange(sundayDateStr: string): string {
  const sunday = new Date(sundayDateStr);
  if (isNaN(sunday.getTime())) {
    return sundayDateStr;
  }
  const friday = new Date(sunday);
  friday.setUTCDate(friday.getUTCDate() - 2);
  
  const fDay = friday.getUTCDate();
  const fMonthStr = MONTH_NAMES[friday.getUTCMonth()];
  
  const sDay = sunday.getUTCDate();
  const sMonthStr = MONTH_NAMES[sunday.getUTCMonth()];
  const sYear = sunday.getUTCFullYear();
  
  if (fMonthStr === sMonthStr) {
    return `[[${fMonthStr} ${fDay}|${fDay}]] to [[${fMonthStr} ${sDay}|${sDay} ${sMonthStr}]] ${sYear}`;
  } else {
    return `[[${fMonthStr} ${fDay}|${fDay} ${fMonthStr}]] to [[${sMonthStr} ${sDay}|${sDay} ${sMonthStr}]] ${sYear}`;
  }
}

function formatDateString(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const month = MONTH_NAMES[d.getUTCMonth()];
  const day = d.getUTCDate();
  return `${month} ${day}`;
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function generateBlankGPWikitext(race: ScheduleRace, drivers: Driver[], officialName?: string | null): string {
  const year = race.season;
  const round = parseInt(race.round, 10);
  const raceName = race.raceName;
  const circuitName = race.Circuit.circuitName;
  const locality = race.Circuit.Location.locality;
  const country = race.Circuit.Location.country;
  
  const flagCode = COUNTRY_FLAGS[country] || "";
  const dateFormatted = formatDateString(race.date);
  const dateRange = formatDateRange(race.date);
  
  const ordinal = getOrdinalSuffix(round);
  const roundText = round === 1 ? "opening" : `${ordinal}`;
  
  const sponsorName = officialName || `Formula 1 [Sponsor] ${raceName} ${year}`;

  let entryListRows = "";
  const sortedDrivers = [...drivers].sort((a, b) => {
    const numA = parseInt(a.permanentNumber || '0', 10);
    const numB = parseInt(b.permanentNumber || '0', 10);
    return numA - numB;
  });

  for (const driver of sortedDrivers) {
    const num = driver.permanentNumber || '';
    const flag = getFlag(driver.nationality);
    const name = `${driver.givenName} ${driver.familyName}`;
    
    const constId = DRIVER_TO_CONSTRUCTOR_2026[driver.driverId] || '';
    const team = TEAM_DETAILS_2026[constId];
    
    const entrant = team ? team.entrant : '';
    const constructor = team ? team.constructor : '';
    const chassis = team ? team.chassis : '';
    const engine = team ? team.engine : '';
    const model = team ? team.model : '';
    const tyre = team ? team.tyre : '{{Pirelli}}';

    entryListRows += `\n|-\n!${num}\n|${flag} [[${name}]]\n|${entrant}\n|${constructor}\n|${chassis}\n|${engine}\n|${model}\n|${tyre}`;
  }

  const isSprint = !!race.Sprint;

  const infobox = isSprint ? `{{Infobox Sprint Race
| flag = ${flagCode}
| number = 
| race = ${round}
| season = ${year}
| date = ${dateFormatted}
| officialname = ${sponsorName}
| circuit = ${circuitName}
| circuittype = 
| location = ${locality}, ${country}
| lapdistance = 
| laps = 
| image = 
| sprintpole = 
| sprintpoleteam = 
| sprintpoletime = 
| sprintwinner = 
| sprintsecond = 
| sprintthird = 
| pole = 
| polenation = 
| poleteam = 
| fastestlap = 
| fastestlapnumber = 
| fastestlapdriver = 
| fastestlapnation = 
| fastestlapteam = 
| winner = 
| winnernation = 
| second = 
| secondnation = 
| third = 
| thirdnation = 
}}` : `{{Infobox_Race
| flag = ${flagCode}
| number = 
| race = ${round}
| season = ${year}
| date = ${dateFormatted}
| officialname = ${sponsorName}
| circuit = ${circuitName}
| circuittype = 
| location = ${locality}, ${country}
| lapdistance = 
| laps = 
| image = 
| pole = 
| polenation = 
| poleteam = 
| fastestlap = 
| fastestlapnumber = 
| fastestlapdriver = 
| fastestlapnation = 
| fastestlapteam = 
| winner = 
| winnernation = 
| second = 
| secondnation = 
| third = 
| thirdnation = 
}}`;

  const weatherTemplate = isSprint ? `{{WeatherSprint/2023
| fp1 = 
| quali = 
| Sprint_shootout = 
| sprint = 
| race = 
}}` : `{{Weather|fp1=|fp2=|fp3=|qualification=|race=}}`;

  const practiceSection = isSprint ? `== Practice ==
=== FP1 ===

=== Practice Results ===

== Sprint ==
=== Sprint Qualifying ===
==== Sprint Qualifying Results ====

==== Sprint Grid ====

=== Sprint Report ===

=== Sprint Results ===` : `== Practice Overview ==
=== FP1 ===

=== FP2 ===

=== FP3 ===

=== Practice Results ===`;

  return `${infobox}The '''${year} ${raceName}''', officially known as the '''${sponsorName}''', is scheduled to be the ${roundText} race of the [[${year} Formula One Season|${year} FIA Formula One World Championship]]. The event will take place from ${dateRange} at the [[${circuitName}]] in ${locality}, ${country}.
__TOC__
{{Clear}}

==Background==
${weatherTemplate}{{AvailableTyres/2023|H=|M=|S=}}
{{Clear}}
===Entry List===
The full entry for the '''{{PAGENAME}}''' is outlined below:
{| class="wikitable"
!<span title="Car number">No.</span>
!Driver
!Entrant
!Constructor
!Chassis
!Engine
!Model
!Tyre${entryListRows}
|-
! colspan="8" align="center" |'''Source''': <ref name="EL">[https://www.fia.com/system/files/decision-document/{{lc:{{PAGENAMEE}}}}_-_entry_list.pdf {{PAGENAME}} - Entry List] (PDF). Fédération Internationale de l'Automobile.</ref>
|}

${practiceSection}

== Qualifying ==
=== Q1 ===

=== Q2 ===

=== Q3 ===

=== Qualifying Results ===

==== Starting Grid ====

== Race ==

=== Race Results ===

== Standings ==

== Milestones ==

== References ==
Images and Videos:
References:
<references />

{{${raceName}}}

[[Category:${raceName}]]
[[Category:${year} Grands Prix]]`;
}

export interface EventInfo {
  year: string;
  name: string;
  fullName: string;
  dateRangeDesktop: string;
  dateRangeMobile: string;
  startTime: Date;
  endTime: Date;
}

function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function formatDesktopDate(startDateStr: string, endDateStr: string): string {
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);
  
  if (startDateStr === endDateStr) {
    return `${MONTHS_FULL[start.month]} ${start.day}`;
  }
  
  return `${MONTHS_FULL[start.month]} ${start.day} - ${MONTHS_FULL[end.month]} ${end.day}`;
}

export function formatMobileDate(startDateStr: string, endDateStr: string): string {
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);
  
  if (startDateStr === endDateStr) {
    return `${MONTHS_SHORT[start.month]} ${start.day}`;
  }
  
  return `${MONTHS_SHORT[start.month]} ${start.day} - ${MONTHS_SHORT[end.month]} ${end.day}`;
}

export function generateLatestEventsWikitext(
  prev: EventInfo | null,
  latest: EventInfo | null,
  next: EventInfo | null,
  isOngoing?: boolean
): string {
  let wikitext = '';
  const latestLabel = isOngoing ? 'Current event' : 'Latest event';
  
  // Desktop section
  wikitext += `<!-- Desktop -->\n`;
  wikitext += `<div class="news-events hidden">\n`;
  if (prev) {
    wikitext += `:'''Previous event:''' {{F1 GP|${prev.year}|${prev.name}}} (${prev.dateRangeDesktop})\n`;
  }
  if (latest) {
    wikitext += `:'''${latestLabel}: {{F1 GP|${latest.year}|${latest.name}}} (${latest.dateRangeDesktop})'''\n`;
  }
  if (next) {
    wikitext += `:'''Next event: ''' {{F1 GP|${next.year}|${next.name}}} (${next.dateRangeDesktop})\n`;
  }
  wikitext += `</div>\n\n`;
  
  // Mobile section
  wikitext += `<!-- Mobile -->\n`;
  wikitext += `<div class="news-events" style="display: none;">\n`;
  if (prev) {
    wikitext += `:'''Previous event:''' [[${prev.year} ${prev.fullName}|${prev.name} GP]] <small>(${prev.dateRangeMobile})</small>\n`;
  }
  if (latest) {
    wikitext += `:'''${latestLabel}: [[${latest.year} ${latest.fullName}|${latest.name} GP]] <small>(${latest.dateRangeMobile})</small>'''\n`;
  }
  if (next) {
    wikitext += `:'''Next event: ''' [[${next.year} ${next.fullName}|${next.name} GP]] <small>(${next.dateRangeMobile})</small>\n`;
  }
  wikitext += `</div>`;
  
  return wikitext;
}

function getDriverWikiName(driver: any): string {
  const customMap: Record<string, string> = {
    'sainz': 'Carlos Sainz, Jr.',
    'bottas': 'Valtteri Bottas'
  };
  if (customMap[driver.driverId]) {
    return customMap[driver.driverId];
  }
  return `${driver.givenName} ${driver.familyName}`;
}

function getTeamWikiName(constructor: any): string {
  const customMap: Record<string, string> = {
    'alpine': 'Alpine',
    'rb': 'Racing Bulls',
    'haas': 'Haas',
    'cadillac': 'Cadillac'
  };
  if (customMap[constructor.constructorId]) {
    return customMap[constructor.constructorId];
  }
  return constructor.name;
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function generateCareerPointsWikitext(standings: DriverStanding[]): string {
  let wikitext = "{{#switch:{{{1}}}\n";
  const maxLen = Math.max(...standings.map(s => getDriverWikiName(s.Driver).length));
  
  standings.forEach(s => {
    const wikiName = getDriverWikiName(s.Driver);
    const paddedName = wikiName.padEnd(maxLen, ' ');
    wikitext += `|${paddedName} = ${s.points}\n`;
  });
  
  wikitext += "|#default = 0\n";
  wikitext += "}}<noinclude>[[Category:Career Results Templates]][[Category:2026 Results Templates]]</noinclude>";
  return wikitext;
}

export function generateCareerPositionWikitext(standings: DriverStanding[]): string {
  let wikitext = "{{#switch:{{{1}}}\n";
  
  standings.forEach((s, idx) => {
    const pos = idx + 1;
    const key = getOrdinal(pos).padEnd(6, ' ');
    const wikiName = getDriverWikiName(s.Driver);
    wikitext += `|${key} = ${wikiName}\n`;
  });
  
  wikitext += "|#default = \n";
  wikitext += "}}<noinclude>[[Category:Career Results Templates]][[Category:2026 Results Templates]]</noinclude>";
  return wikitext;
}

export function generateCareerTeamPositionWikitext(standings: ConstructorStanding[]): string {
  let wikitext = "{{#switch:{{{1}}}\n";
  
  standings.forEach((s, idx) => {
    const pos = idx + 1;
    const key = getOrdinal(pos).padEnd(6, ' ');
    const wikiName = getTeamWikiName(s.Constructor);
    wikitext += `|${key} = ${wikiName}\n`;
  });
  
  wikitext += "}}<noinclude>[[Category:2026 Results Templates]]</noinclude>";
  return wikitext;
}

