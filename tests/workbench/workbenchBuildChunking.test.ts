import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const viteConfigSource = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');

assert.match(
  viteConfigSource,
  /const normalizedId = id\.replace\(\/\\\\\/g, '\/'\)/,
  'manual chunk matching should normalize Windows paths before applying package rules',
);
assert.match(
  viteConfigSource,
  /normalizedId\.includes\('\/node_modules\/@react-three\/'\)[\s\S]*return 'react-three'/,
  'React Three dependencies should be cached separately from frequently changing application code',
);
assert.match(
  viteConfigSource,
  /normalizedId\.includes\('\/node_modules\/three\/'\)[\s\S]*return 'three-core'/,
  'Three core should have an explicit vendor boundary',
);
assert.match(
  viteConfigSource,
  /chunkSizeWarningLimit:\s*1000/,
  'the warning threshold should remain below one megabyte per minified chunk',
);
assert.doesNotMatch(
  viteConfigSource,
  /chunkSizeWarningLimit:\s*(?:[2-9]\d{3,}|\d{5,})/,
  'the build should not silence genuinely oversized chunks with an unbounded warning threshold',
);

console.log('workbenchBuildChunking tests passed');
