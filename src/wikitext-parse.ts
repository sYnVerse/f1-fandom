/** Line-based wikitext parsing helpers (avoids polynomial regex on wiki content). */

export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export function parseWikiHeading(line: string): { level: number; name: string } | null {
  const trimmed = line.trim();
  let level = 0;
  while (level < trimmed.length && trimmed[level] === '=') {
    level++;
  }
  if (level < 2) return null;
  const suffix = '='.repeat(level);
  if (!trimmed.endsWith(suffix)) return null;
  const name = trimmed.slice(level, trimmed.length - level).trim();
  if (!name) return null;
  return { level, name };
}

export function isWikiHeadingLine(line: string): boolean {
  return parseWikiHeading(line) !== null;
}

export function sectionHeadingMatches(line: string, header: string): boolean {
  const parsedHeader = parseWikiHeading(header.trim());
  if (parsedHeader) {
    const parsed = parseWikiHeading(line);
    if (!parsed) return false;
    return (
      parsed.level === parsedHeader.level &&
      parsed.name.toLowerCase() === parsedHeader.name.toLowerCase()
    );
  }
  return line.trim() === header.trim();
}

export interface SectionRange {
  startLine: number;
  endLine: number;
  headingLine: string;
}

export function findSectionRanges(fullText: string, header: string): SectionRange[] {
  const lines = splitLines(fullText);
  const ranges: SectionRange[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!sectionHeadingMatches(lines[i], header)) continue;

    let endLine = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (isWikiHeadingLine(lines[j])) {
        endLine = j;
        break;
      }
    }

    ranges.push({ startLine: i, endLine, headingLine: lines[i] });
  }

  return ranges;
}

export function pageContainsHeader(fullText: string, header: string): boolean {
  return splitLines(fullText).some(line => sectionHeadingMatches(line, header));
}

export function stripLeadingHeadingFromContent(content: string): string {
  const lines = splitLines(content);
  if (lines.length > 0 && parseWikiHeading(lines[0])) {
    return lines.slice(1).join('\n').trim();
  }
  return content.trim();
}

export function stripWikiComments(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('<!--', i);
    if (start === -1) {
      result += text.slice(i);
      break;
    }
    result += text.slice(i, start);
    const end = text.indexOf('-->', start + 4);
    if (end === -1) break;
    i = end + 3;
  }
  return result;
}

export function stripWikiTemplates(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('{{', i);
    if (start === -1) {
      result += text.slice(i);
      break;
    }
    result += text.slice(i, start);
    let depth = 0;
    let j = start;
    while (j < text.length - 1) {
      if (text[j] === '{' && text[j + 1] === '{') {
        depth++;
        j += 2;
      } else if (text[j] === '}' && text[j + 1] === '}') {
        depth--;
        j += 2;
        if (depth === 0) break;
      } else {
        j++;
      }
    }
    i = j < text.length ? j : text.length;
  }
  return result;
}

/** Parse a `| name = value` template/stat line, preserving spacing for rebuild. */
export function parsePipeParamLine(line: string): {
  prefix: string;
  name: string;
  separator: string;
  value: string;
  suffix: string;
} | null {
  let start = 0;
  while (start < line.length && (line[start] === ' ' || line[start] === '\t')) start++;
  if (line[start] !== '|') return null;
  let prefixEnd = start + 1;
  while (prefixEnd < line.length && (line[prefixEnd] === ' ' || line[prefixEnd] === '\t')) prefixEnd++;
  const prefix = line.slice(start, prefixEnd);

  const eqIndex = line.indexOf('=', prefixEnd);
  if (eqIndex === -1) return null;

  const name = line.slice(prefixEnd, eqIndex).trim();
  const nameStart = line.indexOf(name, prefixEnd);
  if (nameStart === -1) return null;

  const separator = line.slice(nameStart + name.length, eqIndex + 1);
  const afterEq = line.slice(eqIndex + 1);
  const valueEnd = afterEq.trimEnd();
  const value = valueEnd.trim();
  const suffix = afterEq.slice(valueEnd.length);

  return { prefix, name, separator, value, suffix };
}
