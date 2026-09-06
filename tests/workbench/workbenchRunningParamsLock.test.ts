const parameterActionSource = readFileSync(new URL('../../src/features/workbench/workbenchParameterActions.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchHeatCapacityBasicParametersSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityBasicParameters.tsx', import.meta.url), 'utf8');
const workbenchHeatCapacityParametersSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityParameters.tsx', import.meta.url), 'utf8');
const workbenchSimulationParameterRowSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchSimulationParameterRow.tsx', import.meta.url), 'utf8');
const workbenchCurrentParametersSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchCurrentParameters.tsx', import.meta.url), 'utf8');
const workbenchIdealControlsSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchIdealControls.tsx', import.meta.url), 'utf8');
﻿import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const workbenchStudioCopySource = readFileSync(new URL('../../src/features/workbench/workbenchStudioCopy.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const pistonParameterPanelSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationParameterPanel.tsx', import.meta.url),
  'utf8',
);

assert.match(
  source,
  /const parameterControlsLocked = activeFile\.runState === 'running' \|\| activeFile\.runState === 'paused';/,
  'started-but-unfinished simulations should lock the right parameter sidebar while running or paused',
);
assert.match(
  source,
  /const currentParameterControlsLocked = activeFile\.kind === 'heatCapacityPistonOscillation'[\s\S]*\? false[\s\S]*: activeFile\.kind === 'heatCapacity' && activeFile\.heatCapacityMode === 'free'[\s\S]*\? false[\s\S]*: parameterControlsLocked;/,
  'experiment-specific Free parameter panels should own their profile lock instead of inheriting the generic run lock',
);
assert.match(
  pistonParameterPanelSource,
  /const conditionLocked = !freeMode[\s\S]*isPistonOscillationFreeExperimentLocked\(session\);[\s\S]*const idealReadonly = freeMode && session\.experimentGroup\.scheme === 'ideal';[\s\S]*const physicsLocked = conditionLocked \|\| idealReadonly;/,
  'Piston Oscillation should lock its profile from the first irreversible experiment event',
);
assert.match(
  workbenchHeatCapacityBasicParametersSource,
  /definition\.id === 'hardSphereViewEnabled'[\s\S]*\? false[\s\S]*: activeHeatCapacityFreeParameterLocked/,
  'Free Mode should keep the visualization checkbox independent from experiment-data locks and performance tiers',
);
assert.doesNotMatch(
  source,
  /definition\.id === 'hardSphereViewEnabled'[\s\S]*settingsPerformanceMode === 'ultra'/,
  'Ultra GLB mode should not disable the Free Mode molecule visualization checkbox after the cylinder visualization is connected',
);
assert.match(
  workbenchHeatCapacityParametersSource,
  /target\?\.closest\('\[data-heat-capacity-free-param-id="hardSphereViewEnabled"\]'\)\) return;/,
  'Free Mode locked-panel interception should allow the visualization row to receive clicks',
);
assert.match(
  source,
  /hardSphereViewLocked=\{heatCapacityModeTransitionLocked\}/,
  'the 3D hard-sphere visualization toggle should stay editable during normal runs and lock only while a mode transition restores the scene',
);
assert.match(
  parameterActionSource,
  /const commitWorkbenchParameterInput = \([\s\S]*?if \(parameterControlsLocked\)/,
  'direct parameter input commits should be blocked after the active simulation has started',
);
assert.match(
  workbenchSimulationParameterRowSource,
  /disabled=\{isParamLocked \|\| !param\.editable\}/,
  'direct parameter inputs should be disabled by the current lock policy',
);
assert.match(
  workbenchCurrentParametersSource,
  /className=\{`studio-current-params \$\{currentParameterControlsLocked \? 'studio-current-params-locked' : ''\}[\s\S]*?`\}/,
  'right parameter sidebar should receive a locked class from the current file lock policy',
);
assert.match(
  workbenchStudioCopySource,
  /locked until stopped or finished/,
  'right parameter sidebar should explain that pause does not unlock parameters',
);
assert.match(
  workbenchCurrentParametersSource,
  /aria-disabled=\{currentParameterControlsLocked\}/,
  'right parameter sidebar should expose the current file lock policy to assistive technology',
);
assert.match(
  workbenchIdealControlsSource,
  /disabled=\{parameterControlsLocked\}/,
  'right parameter sidebar controls should use the shared lock flag for disabled state',
);
assert.match(
  workbenchIdealControlsSource,
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

assert.match(workbenchViewShellSource, /import \{ WorkbenchHeatCapacityBasicParameters \} from '\.\/WorkbenchHeatCapacityBasicParameters\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchHeatCapacityParameters \} from '\.\/WorkbenchHeatCapacityParameters\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchSimulationParameterRow \} from '\.\/WorkbenchSimulationParameterRow\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchCurrentParameters \} from '\.\/WorkbenchCurrentParameters\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchIdealControls \} from '\.\/WorkbenchIdealControls\.tsx';/);
