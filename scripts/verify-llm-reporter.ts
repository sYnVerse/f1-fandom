/**
 * Verifies LLM reporter HTML sanitization and prompt context helpers.
 * Run: npx tsx scripts/verify-llm-reporter.ts
 */
import { generatePromptContext, stripHtmlTags } from '../src/llm-reporter';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// --- CodeQL-safe HTML tag stripping ---
const nestedTagPayload = '<scri<x>pt>alert(1)</scri<x>pt>';
const stripped = stripHtmlTags(nestedTagPayload);
assert(!stripped.includes('<'), 'No angle brackets should remain');
assert(!stripped.includes('script'), 'Script tag content should be removed or neutralized');

const normalHtml = '<strong>Fastest lap</strong> set by <a href="#">driver</a>';
assert(stripHtmlTags(normalHtml) === 'Fastest lap set by driver', 'Normal HTML stripped to plain text');

const multiPass = '<span><em>nested</em></span>';
assert(stripHtmlTags(multiPass) === 'nested', 'Nested tags fully removed');

// --- Practice results in prompt context ---
const race = {
  season: '2026',
  round: '8',
  raceName: 'Austrian Grand Prix',
  Circuit: {
    circuitName: 'Red Bull Ring',
    Location: { locality: 'Spielberg', country: 'Austria' },
  },
};

const context = generatePromptContext(
  race,
  [],
  {},
  [],
  [],
  [],
  {
    fp1: {
      'Lando Norris': {
        position: '1',
        number: '4',
        driverName: 'Lando Norris',
        teamName: 'McLaren',
        time: '1:23.456',
      },
    },
  }
);

assert(context.includes('### FP1 Results:'), 'Prompt context includes FP1 section');
assert(context.includes('Lando Norris'), 'Prompt context includes driver from practice results');
assert(context.includes('Austrian Grand Prix'), 'Prompt context includes race name');

console.log('verify-llm-reporter: all assertions passed');
