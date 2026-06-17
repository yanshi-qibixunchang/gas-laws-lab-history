import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname.slice(1));
const generator = readFileSync(join(root, 'tools', 'exporter', 'generateSamplePayloads.mjs'), 'utf8');

assert.match(
  generator,
  /from '\.\.\/\.\.\/src\/features\/workbench\/workbenchState\.ts'/,
  'sample payload generator should import workbench state from the current src tree',
);

assert.match(
  generator,
  /from '\.\.\/\.\.\/src\/features\/workbench\/workbenchResults\.ts'/,
  'sample payload generator should import workbench results from the current src tree',
);

assert.match(
  generator,
  /energyLog:\s*energyBins[\s\S]*energy:\s*\(bin\.binStart \+ bin\.binEnd\) \/ 2[\s\S]*logProb:\s*Math\.log\([\s\S]*theoreticalLog:\s*Math\.log\(/,
  'standard sample payloads should match runtime energyLog fields and natural-log scale',
);

assert.doesNotMatch(
  generator,
  /energyLog:\s*energyBins[\s\S]*probability:\s*Math\.log10[\s\S]*theoretical:\s*Math\.log10/,
  'standard sample payloads should not use the old histogram-shaped log10 energyLog rows',
);

console.log('standardSamplePayloadShape tests passed');
