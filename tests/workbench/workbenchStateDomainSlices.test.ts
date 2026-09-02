import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createDefaultIdealFile as createDefaultIdealFileFromFacade,
  createDefaultHeatCapacityPistonOscillationFile as createDefaultPistonFileFromFacade,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createDefaultIdealFile,
} from '../../src/features/workbench/workbenchFileState.ts';
import {
  createDefaultHeatCapacityPistonOscillationFile,
} from '../../src/features/workbench/workbenchPistonOscillationState.ts';

const facadeSource = readFileSync(
  new URL('../../src/features/workbench/workbenchState.ts', import.meta.url),
  'utf8',
);
const fileStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchFileState.ts', import.meta.url),
  'utf8',
);
const pistonStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchPistonOscillationState.ts', import.meta.url),
  'utf8',
);
const studioSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

assert.equal(
  createDefaultIdealFileFromFacade,
  createDefaultIdealFile,
  'the legacy workbenchState entry should re-export the extracted standard/ideal file state API',
);
assert.equal(
  createDefaultPistonFileFromFacade,
  createDefaultHeatCapacityPistonOscillationFile,
  'the legacy workbenchState entry should re-export the extracted piston-oscillation state API',
);
assert.match(
  facadeSource,
  /from '\.\/workbenchFileState\.ts'/,
  'the compatibility facade should explicitly forward the common file-state domain',
);
assert.match(
  facadeSource,
  /from '\.\/workbenchPistonOscillationState\.ts'/,
  'the compatibility facade should explicitly forward the piston-oscillation state domain',
);
assert.doesNotMatch(
  fileStateSource,
  /from '\.\/workbenchState(?:\.ts)?'/,
  'the extracted common file-state domain must not depend back on the compatibility facade',
);
assert.doesNotMatch(
  pistonStateSource,
  /from '\.\/workbenchState(?:\.ts)?'/,
  'the extracted piston-oscillation state domain must depend on common file state rather than the facade',
);
assert.match(
  studioSource,
  /from '\.\/workbenchFileState\.ts'/,
  'the main workbench should consume extracted common file-state APIs directly',
);
assert.match(
  studioSource,
  /from '\.\/workbenchPistonOscillationState\.ts'/,
  'the main workbench should consume extracted piston-oscillation state APIs directly',
);

console.log('workbenchStateDomainSlices tests passed');
