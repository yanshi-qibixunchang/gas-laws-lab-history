import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /samplingPresetMenuOpen\s*\?\s*<ChevronUp/,
  'sampling preset trigger should not swap separate up/down chevron icons',
);
assert.match(
  source,
  /<ChevronDown\s+size=\{15\}\s+className=\{`studio-ideal-preset-chevron \$\{samplingPresetMenuOpen \? 'studio-ideal-preset-chevron-open' : ''\}`\}/,
  'sampling preset trigger should rotate a single chevron based on open state',
);
assert.match(
  cssSource,
  /\.studio-ideal-preset-chevron\s*\{[\s\S]*?transition:\s*transform 180ms ease/,
  'sampling preset chevron should animate transform changes',
);
assert.match(
  cssSource,
  /\.studio-ideal-preset-chevron-open\s*\{[\s\S]*?transform:\s*rotate\(180deg\)/,
  'sampling preset chevron should rotate when the menu is open',
);

console.log('workbenchPresetChevronAnimation tests passed');
