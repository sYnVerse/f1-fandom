/**
 * Verifies career results template placeholder detection.
 * Run: npx tsx scripts/verify-career-placeholder.ts
 */
import { isPlaceholder } from '../src/index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const emptyTemplate = `{{#switch:{{{1}}}
|Max Verstappen         = 
|George Russell         = 
|#default = 
}}<noinclude>[[Category:2026 Results Templates]]</noinclude>`;

const austrianTemplate = `{{#switch:{{{1}}}
|Max Verstappen         = 
|George Russell         = 
|Jak Crawford           = {{TD}}
|Ayumu Iwasa            = {{TD}}
|#default = 
}}<noinclude>[[Category:2026 Results Templates]]</noinclude>`;

const canadianTemplate = `{{#switch:{{{1}}}
|George Russell         = {{Ret}}{{Pole}}
|Andrea Kimi Antonelli  = {{1st|fl}}
|#default = 
}}<noinclude>[[Category:2026 Results Templates]]</noinclude>`;

assert(isPlaceholder(emptyTemplate), 'Empty template should be placeholder');
assert(isPlaceholder(austrianTemplate), 'TD-only template should still be placeholder');
assert(!isPlaceholder(canadianTemplate), 'Template with race results should not be placeholder');

console.log('verify-career-placeholder: all assertions passed');
