import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studioSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const resultsSource = readFileSync(new URL('../components/workbenchResults.ts', import.meta.url), 'utf8');

assert.match(
  studioSource,
  /const runActiveFile = \(\) => \{[\s\S]*?if \(activeFile\.kind === 'heatCapacity'\) \{[\s\S]*?pushLog\(`\$\{activeFile\.name\}: use the guided controls inside the heat capacity experiment panel\.`[\s\S]*?return;[\s\S]*?\}/,
  'Start should give heat-capacity users a guided-controls hint without mutating heatCapacityState',
);
assert.match(
  studioSource,
  /const stopActiveFile = \(\) => \{[\s\S]*?if \(activeFile\.kind === 'heatCapacity'\) \{[\s\S]*?resetActiveFile\(\);[\s\S]*?return;/,
  'Stop should route heat-capacity files through the heat-capacity reset path before runtime code',
);
assert.match(
  studioSource,
  /if \(activeFile\.kind === 'heatCapacity'\) \{[\s\S]*?heatCapacityState: applyHeatCapacityAction\(file\.heatCapacityState, \{ type: 'reset' \}\)/,
  'Reset should use the heat-capacity reducer for heat-capacity files',
);
assert.match(
  studioSource,
  /activeFile\.kind === 'heatCapacity' \? renderHeatCapacityRealtimePanel\(activeFile\)/,
  'Realtime panel should use a dedicated heat-capacity summary renderer',
);
for (const label of ['p0', 'p1', 'p2', 'gamma', 'theory', 'error']) {
  assert.match(studioSource, new RegExp(`<span>${label}</span>`), `heat-capacity realtime summary should show ${label}`);
}
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
