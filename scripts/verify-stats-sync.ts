/**
 * Verifies stats template sync detects correction-line-only changes.
 * Run: npx tsx scripts/verify-stats-sync.ts
 */
import { prepareStatsTemplateUpdate } from '../src/stats';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const monacoHatTricks = `<noinclude>''Correct as of {{F1 GP|2026|Monaco}} (ANT)''</noinclude>
<includeonly>{{#switch: {{{1}}}
<!-- CURRENT DRIVERS -->
| George Russell                   = 1
| Max Verstappen                   = 14
|#default =
}}</includeonly>`;

const cumulativeStats = {
  russell: { HatTricks: 0 },
  max_verstappen: { HatTricks: 0 },
} as any;

const prepared = prepareStatsTemplateUpdate(
  'HatTricks',
  monacoHatTricks,
  cumulativeStats,
  { year: 2026, raceName: 'Austrian Grand Prix', winnerCode: 'RUS' }
);

assert(prepared.changed, 'Correction line update should count as a required change');
assert(
  prepared.wikitext.includes('{{F1 GP|2026|Austrian}}'),
  'Expected Austrian GP correction text'
);
assert(
  prepared.wikitext.includes('(RUS)'),
  'Expected winner code in correction text'
);

console.log('verify-stats-sync: all assertions passed');
