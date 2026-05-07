import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createDefaultHeatCapacityFile,
  HEAT_CAPACITY_LIVE_SPLIT_DEFAULT_RATIO,
  getWorkbenchParameterRows,
  migrateHeatCapacityDefaultName,
} from '../components/workbenchState.ts';
import {
  HARD_SPHERE_GAMMA,
} from '../utils/heatCapacityExperiment.ts';

const file = createDefaultHeatCapacityFile(2);

assert.equal(file.kind, 'heatCapacity');
assert.equal(file.id, 'heatCapacity-002');
assert.equal(file.name, 'Heat Capacity Ratio - 002');
assert.equal(file.heatCapacityState.mode, 'guided');
assert.equal(file.heatCapacityState.phase, 'equalizing');
assert.equal(file.heatCapacityState.result, null);
assert.equal(file.heatCapacityState.instrument.highlightedPart, 'Valve_C2');
assert.equal(file.theoreticalGamma, HARD_SPHERE_GAMMA);
assert.deepEqual(file.visiblePanels, ['preview', 'realtime']);
assert.equal(file.liveWorkspaceSplitRatio, HEAT_CAPACITY_LIVE_SPLIT_DEFAULT_RATIO);
assert.ok(file.liveWorkspaceSplitRatio > 0.5);

assert.equal(
  migrateHeatCapacityDefaultName('Hard-Sphere Heat Capacity Ratio - 001'),
  'Heat Capacity Ratio - 001',
);
assert.equal(
  migrateHeatCapacityDefaultName('Custom Heat Capacity Study'),
  'Custom Heat Capacity Study',
);

const rows = getWorkbenchParameterRows(file);
assert.ok(rows.some((row) => row.key === 'heatGamma' && row.value === '1.667'));
assert.ok(rows.some((row) => row.key === 'heatPhase' && row.value === 'equalizing'));
assert.ok(rows.some((row) => row.key === 'heatP0' && row.value === '--'));

const studioSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
assert.match(
  studioSource,
  /setParametersCollapsed\(file\.kind === 'heatCapacity'\)/,
  'creating or selecting heat-capacity files should collapse Current Parameters by default',
);
assert.match(
  studioSource,
  /file\.kind === 'heatCapacity'[\s\S]*?liveWorkspaceSplitRatio: workbenchLayoutDefaults\.heatCapacity\.liveWorkspaceSplitRatio/,
  'reset layout should restore the heat-capacity split without using standard-only layout state',
);

console.log('workbenchHeatCapacityFile tests passed');
