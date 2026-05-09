import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createDefaultHeatCapacityFile,
} from '../components/workbenchState.ts';

const studioSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const resultsSource = readFileSync(new URL('../components/workbenchResults.ts', import.meta.url), 'utf8');

const heatFile = createDefaultHeatCapacityFile(1);
assert.equal(heatFile.demoStatus, 'prompt');
assert.equal(heatFile.demoStepIndex, 0);
assert.equal(heatFile.demoCompletedOnce, false);
assert.ok(heatFile.demoMessage.includes('演示'));

assert.match(
  studioSource,
  /const startHeatCapacityDemo = \(\) => \{[\s\S]*?demoStatus: 'running'[\s\S]*?runState: 'running'/,
  'Start should run the heat-capacity teaching demo instead of only logging a hint',
);
assert.match(
  studioSource,
  /const advanceHeatCapacityDemoForFile = \(fileId: string\) => \{[\s\S]*?advanceHeatCapacityDemoStep\([\s\S]*?heatCapacityState[\s\S]*?demoStepIndex/,
  'Workbench should advance the heat-capacity demo through the shared demo plan',
);
assert.match(
  studioSource,
  /const pauseHeatCapacityDemo = \(\) => \{[\s\S]*?demoStatus: file\.demoStatus === 'running' \? 'paused' : file\.demoStatus[\s\S]*?runState: file\.runState === 'running' \? 'paused' : file\.runState/,
  'Pause should pause the heat-capacity teaching demo without resetting experiment data',
);
assert.match(
  studioSource,
  /const stopHeatCapacityDemo = \(\) => \{[\s\S]*?demoStatus: 'completed'[\s\S]*?demoCompletedOnce: true[\s\S]*?runState: 'finished'/,
  'Stop should end the heat-capacity demo without routing through the reset path',
);
assert.match(
  studioSource,
  /activeFile\.kind === 'heatCapacity' && activeFile\.demoCompletedOnce/,
  'Completed heat-capacity demos should hide or disable the preview run button',
);
assert.match(
  studioSource,
  /if \(activeFile\.kind === 'heatCapacity'\) \{[\s\S]*?heatCapacityState: applyHeatCapacityAction\(file\.heatCapacityState, \{ type: 'reset' \}\)/,
  'Reset should use the heat-capacity reducer for heat-capacity files',
);
assert.match(
  studioSource,
  /demoStatus: 'prompt'[\s\S]*?demoStepIndex: 0[\s\S]*?demoCompletedOnce: false/,
  'Reset should restore the heat-capacity demo prompt state for a fresh file',
);
assert.match(
  studioSource,
  /activeFile\.kind === 'heatCapacity' \? renderHeatCapacityRealtimePanel\(activeFile\)/,
  'Realtime panel should use a dedicated heat-capacity summary renderer',
);
for (const label of ['p0', 'p1', 'p2', 'gamma']) {
  assert.match(studioSource, new RegExp(`<span>${label}</span>`), `heat-capacity realtime summary should show ${label}`);
}
for (const label of ['阶段', '电源', '压强', '温度', '当前步骤']) {
  assert.match(studioSource, new RegExp(label), `heat-capacity realtime panel should show ${label}`);
}
assert.match(
  studioSource,
  /getHeatCapacityInteractionDescriptor\(experiment\)/,
  'Heat-capacity realtime panel should show the same current-step prompt as the model interaction state',
);
assert.match(
  studioSource,
  /disabled=\{parameterControlsLocked \|\| activeFile\.kind === 'heatCapacity'\}/,
  'Current Parameters editing should stay disabled for heat-capacity files',
);
assert.match(
  resultsSource,
  /const heatCapacityReady = file\.kind === 'heatCapacity' \? Boolean\(file\.heatCapacityState\.result\) : false;/,
  'Results summary should be ready only after a heat-capacity result exists',
);
assert.match(
  resultsSource,
  /temperature: file\.kind === 'heatCapacity' \? file\.heatCapacityState\.temperature : file\.stats\.temperature/,
  'Results summary should read heat-capacity temperature from heatCapacityState',
);
assert.match(
  resultsSource,
  /pressure: file\.kind === 'heatCapacity' \? file\.heatCapacityState\.pressure : file\.stats\.pressure/,
  'Results summary should read heat-capacity pressure from heatCapacityState',
);

console.log('workbenchHeatCapacityControls tests passed');
