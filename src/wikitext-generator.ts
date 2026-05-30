import { 
  Driver, 
  RaceResult, 
  QualifyingResult, 
  DriverStanding, 
  ConstructorStanding, 
  PracticeSessionData
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

const CONSTRUCTORS: Record<string, string> = {
  "mercedes": "{{GER}} {{Mercedes-CON}}",
  "red_bull": "{{AUT}} {{Red Bull-Honda RBPT}}",
  "aston_martin": "{{GBR}} {{Aston Martin-Mercedes}}",
  "ferrari": "{{ITA}} {{Ferrari-CON}}",
  "haas": "{{USA}} {{Haas-Ferrari}}",
  "williams": "{{GBR}} {{Williams-Mercedes}}",
  "alphatauri": "{{ITA}} {{AlphaTauri-Red Bull}}",
  "alpine": "{{FRA}} {{Alpine-Renault}}",
  "mclaren": "{{GBR}} {{McLaren-Mercedes}}",
  "alfa": "{{SUI}} {{Alfa Romeo-Ferrari}}",
  "racing_point": "{{GBR}} {{Racing Point-BWT Mercedes}}",
  "renault": "{{FRA}} {{Renault-CON}}",
  "sauber": "{{SUI}} {{Sauber-Ferrari}}",
  "rb": "{{ITA}} {{RB-Honda RBPT}}"
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
| rowspan=26 width=1px |
! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 1">Q1</span>
| rowspan=26 width=1px |
! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 2">Q2</span>
| rowspan=26 width=1px |
! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 3">Q3</span>
! rowspan=2 width=5% | Grid
|-
! width=4% | <span style="cursor:help" title="Position">Pos.</span>
! width=9% | Time
! width=4% | <span style="cursor:help" title="Position">Pos.</span>
! width=9% | Time
! width=4% | <span style="cursor:help" title="Position">Pos.</span>
! width=9% | Time`;

  for (let row = 0; row < qualifyingResults.length; row++) {
    const q = qualifyingResults[row];
    const team = getTeamTemplate(q.constructor.constructorId, q.constructor.name);
    const driver = `${getFlag(q.driver.nationality)} [[${q.driver.givenName} ${q.driver.familyName}]]`;
    const number = q.number;
    const pos = q.position;

    // Print drop indicators
    if (row === 10 || row === 15) {
      output += '\n|-\n|colspan=14 style="border-bottom:hidden"|\n|-\n|colspan=14|\n|-';
    } else {
      output += '\n|-';
    }

    output += `\n! ${pos}`;
    output += `\n| align=center | ${number}`;
    output += `\n| ${driver}`;
    output += `\n| ${team}`;

    // Q1
    if (row >= 15) {
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
    if (q.Q2 && q.Q2 !== 'nan') {
      if (row >= 10 && row <= 14) {
        output += `\n! ${pos}`;
      } else {
        const q2Pos = sortQ2.findIndex(x => x.number === number) + 1;
        output += `\n! ${q2Pos}`;
      }

      if (fastestQ2Number === number) {
        output += `\n| '''${q.Q2}'''`;
      } else {
        output += `\n| ${q.Q2}`;
      }
    } else if (row === 15) {
      output += `\n! rowspan="5" |`;
      output += `\n| rowspan="5" |`;
      output += `\n| rowspan="5" |`;
      output += `\n| rowspan="5" |`;
    }

    // Q3
    if (q.Q3 && q.Q3 !== 'nan') {
      output += `\n! ${pos}`;
      if (row === 0) {
        output += `\n| '''${q.Q3}'''`;
      } else {
        output += `\n| ${q.Q3}`;
      }
    } else if (row === 10) {
      output += `\n! rowspan="5" |`;
      output += `\n| rowspan="5" |`;
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
    if (!isSprint) {
      if (points !== '0') {
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
      if (points !== '0') {
        output += `\n! ${points}`;
      } else {
        output += `\n! ${points}`;
      }
    }

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
  fp3: Record<string, PracticeSessionData> | null
): string {
  // Sort drivers by permanent number
  const sortedDrivers = [...drivers].sort((a, b) => {
    const numA = parseInt(a.permanentNumber || '0', 10);
    const numB = parseInt(b.permanentNumber || '0', 10);
    return numA - numB;
  });

  // Helper to map driver ID to constructor template
  const driverToConstructorTemplate: Record<string, string> = {};
  if (qualiResults) {
    qualiResults.forEach(q => {
      driverToConstructorTemplate[q.driver.driverId] = getTeamTemplate(q.constructor.constructorId, q.constructor.name);
    });
  }

  // Find fastest absolute times for each session to convert differentials
  const findFastestTime = (sessionData: Record<string, PracticeSessionData> | null): string | null => {
    if (!sessionData) return null;
    let fastestTime: string | null = null;

    // Look for P1 position first
    for (const data of Object.values(sessionData)) {
      if (data.position === '1') {
        fastestTime = data.time;
        break;
      }
    }

    // Fallback search
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

  let output = `===Practice Results===
The full practice results for the '''{{PAGENAME}}''' are outlined below:

{| class="hidden wikitable sortable" style="width:100%"
! rowspan="2" |<span style="cursor:help;" title="Car number">No.</span>!! rowspan="2" class="unsortable" |Driver!! rowspan="2" class="unsortable" |Team!! colspan="2" class="unsortable" |FP1 !! colspan="2" class="unsortable" |FP2 !! colspan="2" class="unsortable" |FP3
|-
!Time!!Pos!!Time!!Pos!!Time!!Pos`;

  for (const driver of sortedDrivers) {
    const num = driver.permanentNumber || '0';
    const name = `${driver.givenName} ${driver.familyName}`;
    const flag = getFlag(driver.nationality);
    const team = driverToConstructorTemplate[driver.driverId] || '{{Team-Placeholder}}';

    output += '\n|-';
    output += `\n! ${num}`;
    output += `\n| ${flag} [[${name}]]`;
    output += `\n| ${team}`;

    // Render session cells helper
    const renderSessionCells = (
      sessionData: Record<string, PracticeSessionData> | null,
      fastestTime: string | null
    ): string => {
      if (!sessionData) {
        return '\n| colspan="2" align=center | {{abbr|DNP|Did Not Participate}}';
      }

      // Try different matching styles (name, driver ID, lowercase, stripped)
      let matchedData: PracticeSessionData | null = null;
      
      const checkKeys = [
        name,
        `${driver.givenName}${driver.familyName}`,
        driver.driverId,
        `${driver.givenName} ${driver.familyName}`
      ].map(k => k.toLowerCase().replace(/[\s'-]/g, ''));

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

    output += renderSessionCells(fp1, fp1Fastest);
    output += renderSessionCells(fp2, fp2Fastest);
    output += renderSessionCells(fp3, fp3Fastest);
  }

  output += `\n|-
! colspan="14" style="text-align:center" |'''Source:''' <ref name="P1">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_p1_classification.pdf {{PAGENAME}} - FP1 Classification] (PDF). Fédération Internationale de l'Automobile.</ref><ref name="P2">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_p2_classification.pdf {{PAGENAME}} - FP2 Classification] (PDF). Fédération Internationale de l'Automobile.</ref><ref name="P3">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_p3_classification.pdf {{PAGENAME}} - FP3 Classification] (PDF). Fédération Internationale de l'Automobile.</ref>
|}`;

  return output;
}
