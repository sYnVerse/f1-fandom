import { extractText, getDocumentProxy } from 'unpdf';
import { Driver } from './f1-api';

export interface FiaDriverRow {
  number: string;
  tla: string;
  name: string;
  natCode: string;
  team: string;
  constructor: string;
  isFp1TestDriver: boolean;
}

const CONSTRUCTOR_SUFFIXES = [
  'McLaren Mercedes',
  'Red Bull Racing Red Bull Ford',
  'Atlassian Williams Mercedes',
  'Racing Bulls Red Bull Ford',
  'Aston Martin Aramco Honda',
  'Alpine Mercedes',
  'Cadillac Ferrari',
  'Haas Ferrari',
  'Mercedes',
  'Ferrari',
  'Audi',
] as const;

function splitTeamAndConstructor(rest: string): { team: string; constructor: string } {
  const trimmed = rest.trim();
  for (const suffix of CONSTRUCTOR_SUFFIXES) {
    if (trimmed.endsWith(suffix)) {
      return {
        team: trimmed.slice(0, -suffix.length).trim(),
        constructor: suffix,
      };
    }
  }
  return { team: trimmed, constructor: '' };
}

const ROW_START_REGEX = /(\d{1,3})\s+([A-Z]{3})\s+/g;

const FP1_SECTION_MARKERS = [
  'may also take part in fp1',
  'may also take part in free practice 1',
  'following drivers may also take part in fp1',
];

const FIA_NAT_TO_FLAG: Record<string, string> = {
  GBR: '{{GBR}}',
  AUS: '{{AUS}}',
  NED: '{{NED}}',
  ITA: '{{ITA}}',
  FRA: '{{FRA}}',
  MON: '{{MCO}}',
  MCO: '{{MCO}}',
  THA: '{{THA}}',
  ESP: '{{ESP}}',
  NZL: '{{NZL}}',
  CAN: '{{CAN}}',
  JPN: '{{JPN}}',
  GER: '{{GER}}',
  BRA: '{{BRA}}',
  ARG: '{{ARG}}',
  MEX: '{{MEX}}',
  FIN: '{{FIN}}',
  USA: '{{USA}}',
  SWE: '{{SWE}}',
  EST: '{{EST}}',
  BEL: '{{BEL}}',
  DEN: '{{DEN}}',
  CHN: '{{CHN}}',
  POL: '{{POL}}',
  RUS: '{{RAF}}',
  RAF: '{{RAF}}',
};

export function getFlagFromNatCode(natCode: string | undefined | null): string {
  if (!natCode) return '{{FIA}}';
  return FIA_NAT_TO_FLAG[natCode.toUpperCase()] || '{{FIA}}';
}

export async function extractPdfText(pdfBuffer: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(pdfBuffer);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeWhitespace(pdfText: string): string {
  return pdfText.replace(/\s+/g, ' ').trim();
}

function findFp1SectionStart(normalized: string): number {
  const lower = normalized.toLowerCase();
  let best = -1;
  for (const marker of FP1_SECTION_MARKERS) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && (best === -1 || idx < best)) {
      best = idx;
    }
  }
  return best;
}

function normalizeCarNumber(
  rawNumber: string,
  tla: string,
  mainDrivers: Driver[],
  isFp1Section: boolean
): string {
  const byTla = mainDrivers.find(
    d => d.code && d.code.toUpperCase() === tla.toUpperCase()
  );
  if (byTla?.permanentNumber) {
    return byTla.permanentNumber;
  }

  const digits = rawNumber.trim();
  if (!digits) return digits;

  if (isFp1Section && /^[1-6]\d{2}$/.test(digits)) {
    return digits.slice(1);
  }

  if (/^\d{3}$/.test(digits)) {
    const firstTwo = digits.slice(0, 2);
    const lastTwo = digits.slice(1);
    const firstTwoNum = parseInt(firstTwo, 10);
    const lastTwoNum = parseInt(lastTwo, 10);
    if (firstTwoNum >= 1 && firstTwoNum <= 99) {
      return firstTwo;
    }
    if (lastTwoNum >= 1 && lastTwoNum <= 99) {
      return lastTwo;
    }
  }

  return digits;
}

function titleCaseName(name: string): string {
  return name
    .split(/\s+/)
    .map(part => {
      if (!part) return part;
      if (part.length <= 3 && part === part.toUpperCase()) {
        return part.charAt(0) + part.slice(1).toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function parseRowsFromText(
  text: string,
  mainDrivers: Driver[],
  isFp1Section: boolean
): FiaDriverRow[] {
  const rows: FiaDriverRow[] = [];
  const seen = new Set<string>();
  const starts: Array<{ index: number; rawNumber: string; tla: string }> = [];

  ROW_START_REGEX.lastIndex = 0;
  let startMatch: RegExpExecArray | null;
  while ((startMatch = ROW_START_REGEX.exec(text)) !== null) {
    starts.push({
      index: startMatch.index,
      rawNumber: startMatch[1],
      tla: startMatch[2],
    });
  }

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const sliceStart = start.index + start.rawNumber.length + 1 + start.tla.length + 1;
    const sliceEnd = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const rowBody = text.slice(sliceStart, sliceEnd).trim();
    if (!rowBody) continue;

    const natMatch = rowBody.match(/^(.+?)\s+([A-Z]{3})\s+(.+)$/);
    if (!natMatch) continue;

    const [, rawName, natCode, teamAndConstructor] = natMatch;
    if (!natCode) continue;
    const { team, constructor } = splitTeamAndConstructor(teamAndConstructor);
    if (!constructor) continue;

    const number = normalizeCarNumber(start.rawNumber, start.tla, mainDrivers, isFp1Section);
    const name = titleCaseName(rawName.trim());
    const key = `${start.tla}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      number,
      tla: start.tla,
      name,
      natCode: natCode.toUpperCase(),
      team: team.trim(),
      constructor: constructor.trim(),
      isFp1TestDriver: isFp1Section,
    });
  }

  return rows;
}

export function parseFiaEntryListPdf(pdfText: string, mainDrivers: Driver[] = []): {
  entrants: FiaDriverRow[];
  fp1TestDrivers: FiaDriverRow[];
} {
  const normalized = normalizeWhitespace(pdfText);
  const fp1Start = findFp1SectionStart(normalized);

  const mainText = fp1Start === -1 ? normalized : normalized.slice(0, fp1Start);
  const fp1Text = fp1Start === -1 ? '' : normalized.slice(fp1Start);

  const entrants = parseRowsFromText(mainText, mainDrivers, false);
  const fp1TestDrivers = fp1Text ? parseRowsFromText(fp1Text, mainDrivers, true) : [];

  const mainTlas = new Set(entrants.map(r => r.tla));
  const filteredFp1 = fp1TestDrivers.filter(row => !mainTlas.has(row.tla));

  return { entrants, fp1TestDrivers: filteredFp1 };
}

export function buildDriverNameLookup(rows: FiaDriverRow[]): Map<string, FiaDriverRow> {
  const lookup = new Map<string, FiaDriverRow>();
  for (const row of rows) {
    const keys = [
      row.name.toLowerCase(),
      row.name.toLowerCase().replace(/[\s'-]/g, ''),
      row.tla.toLowerCase(),
    ];
    for (const key of keys) {
      lookup.set(key, row);
    }
  }
  return lookup;
}

export function isDriverListedInFiaPdf(driverName: string, pdfText: string, mainDrivers: Driver[] = []): boolean {
  const { entrants, fp1TestDrivers } = parseFiaEntryListPdf(pdfText, mainDrivers);
  const allRows = [...entrants, ...fp1TestDrivers];
  const lookup = buildDriverNameLookup(allRows);
  const cleanName = driverName.toLowerCase().replace(/[\s'-]/g, ' ').trim();
  const cleanKey = cleanName.replace(/\s+/g, '');

  if (lookup.has(cleanName) || lookup.has(cleanKey)) {
    return true;
  }

  const parts = cleanName.split(/\s+/);
  const lastName = parts[parts.length - 1];
  for (const row of allRows) {
    const rowLower = row.name.toLowerCase();
    if (rowLower === cleanName || rowLower.includes(lastName) && lastName.length > 2) {
      if (cleanName.includes(rowLower) || rowLower.includes(cleanName)) {
        return true;
      }
    }
  }

  return false;
}
