import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /const parameterControlsLocked = activeFile\.runState === 'running' \|\| activeFile\.runState === 'paused';/,
  'started-but-unfinished simulations should lock the right parameter sidebar while running or paused',
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
  /className=\{`studio-current-params \$\{parameterControlsLocked \? 'studio-current-params-locked' : ''\}`\}/,
  'right parameter sidebar should receive a locked class while a simulation round is in progress',
);
assert.match(
  source,
  /locked until reset or finished/,
  'right parameter sidebar should explain that pause does not unlock parameters',
);
assert.match(
  source,
  /aria-disabled=\{parameterControlsLocked\}/,
  'right parameter sidebar should expose disabled state to assistive technology',
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
