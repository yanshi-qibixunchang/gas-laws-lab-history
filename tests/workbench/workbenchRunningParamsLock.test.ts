import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /const parameterControlsLocked = activeFile\.runState === 'running' \|\| activeFile\.runState === 'paused';/,
  'started-but-unfinished simulations should lock the right parameter sidebar while running or paused',
);
assert.match(
  source,
  /const currentParameterControlsLocked = activeFile\.kind === 'heatCapacity' && activeFile\.heatCapacityMode === 'free'[\s\S]*\? activeHeatCapacityFreeParameterLocked[\s\S]*: parameterControlsLocked;/,
  'the right parameter sidebar should use Free Mode group locks for Heat Capacity and the original run-state lock elsewhere',
);
assert.match(
  source,
  /const startParameterEdit = \(\) => \{[\s\S]*?if \(parameterControlsLocked\)/,
  'parameter edit mode should not open after the active simulation has started',
);
assert.match(
  source,
  /const saveParameterDraft = \(\) => \{[\s\S]*?if \(parameterControlsLocked\)/,
  'parameter drafts should not save after the active simulation has started',
);
assert.match(
  source,
  /className=\{`studio-current-params \$\{currentParameterControlsLocked \? 'studio-current-params-locked' : ''\}[\s\S]*?`\}/,
  'right parameter sidebar should receive a locked class from the current file lock policy',
);
assert.match(
  source,
  /locked until stopped or finished/,
  'right parameter sidebar should explain that pause does not unlock parameters',
);
assert.match(
  source,
  /aria-disabled=\{currentParameterControlsLocked\}/,
  'right parameter sidebar should expose the current file lock policy to assistive technology',
);
assert.match(
  source,
  /disabled=\{parameterControlsLocked\}/,
  'right parameter sidebar controls should use the shared lock flag for disabled state',
);
assert.match(
  source,
  /tabIndex=\{parameterControlsLocked \|\| !samplingPresetMenuOpen \? -1 : 0\}/,
  'sampling preset options should leave tab order while running or when closed',
);
assert.match(
  cssSource,
  /\.studio-current-params-locked[\s\S]*?filter:\s*grayscale/,
  'locked right parameter sidebar should visibly gray out',
);
assert.match(
  cssSource,
  /\.studio-current-params-locked[\s\S]*?cursor:\s*not-allowed/,
  'locked right parameter sidebar should communicate disabled controls',
);

console.log('workbenchRunningParamsLock tests passed');


