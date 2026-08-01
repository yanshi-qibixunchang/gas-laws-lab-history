import assert from 'node:assert/strict';
import {
  WORKBENCH_FILE_KINDS,
  WORKBENCH_FILE_NAME_PREFIX_BY_KIND,
  getWorkbenchRuntimeFamily,
  isWorkbenchFileKind,
} from '../../src/features/workbench/workbenchFileKind.ts';
import {
  WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
  createDefaultHeatCapacityPistonOscillationFile,
} from '../../src/features/workbench/workbenchState.ts';

assert.deepEqual(WORKBENCH_FILE_KINDS, [
  'standard',
  'ideal',
  'heatCapacity',
  'heatCapacityPistonOscillation',
]);
WORKBENCH_FILE_KINDS.forEach((kind) => assert.equal(isWorkbenchFileKind(kind), true));
assert.equal(isWorkbenchFileKind('heatCapacityAbsolute'), false);
assert.equal(isWorkbenchFileKind('pistonOscillation'), false);

assert.equal(WORKBENCH_FILE_NAME_PREFIX_BY_KIND.heatCapacity, 'Adiabatic Expansion');
assert.equal(
  WORKBENCH_FILE_NAME_PREFIX_BY_KIND.heatCapacityPistonOscillation,
  'Piston Oscillation',
);

assert.equal(getWorkbenchRuntimeFamily('standard'), 'standard');
assert.equal(getWorkbenchRuntimeFamily('ideal'), 'ideal');
assert.equal(getWorkbenchRuntimeFamily('heatCapacity'), 'heatCapacity');
assert.equal(getWorkbenchRuntimeFamily('heatCapacityPistonOscillation'), 'none');

const file = createDefaultHeatCapacityPistonOscillationFile(7);
assert.equal(file.kind, 'heatCapacityPistonOscillation');
assert.equal(file.id, 'heatCapacityPistonOscillation-007');
assert.equal(file.name, 'Piston Oscillation - 007');
assert.equal(file.pistonOscillationSchemaVersion, WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION);
assert.equal(file.previewCameraPreset, 'overview');
assert.equal(file.runState, 'idle');
assert.deepEqual(file.visiblePanels, ['preview', 'realtime']);
assert.equal('particles' in file, false);
assert.equal('hardSphereEngineSnapshot' in file, false);
assert.equal('heatCapacityModeSessions' in file, false);

console.log('workbenchFileKind tests passed');
