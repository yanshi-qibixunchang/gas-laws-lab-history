const snapshotHistoryOwnerSource = readFileSync(new URL('../../src/features/workbench/workbenchEditHistoryActions.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  selectHeatCapacityFreeAppliedParameterDraft,
  type WorkbenchHeatCapacityPistonOscillationState,
} from '../../src/features/workbench/workbenchState.ts';
import { cloneWorkbenchFiles } from '../../src/features/workbench/workbenchFileSnapshot.ts';

const heatCapacity = createDefaultHeatCapacityFile(1);
const ideal = createDefaultIdealFile(1);
const standard = createDefaultStandardFile(1);
const pistonOscillation: WorkbenchHeatCapacityPistonOscillationState = {
  ...createDefaultHeatCapacityPistonOscillationFile(1),
  name: 'Heat Capacity Ratio - 009',
  previewCameraPreset: 'side',
};
const cloned = cloneWorkbenchFiles([heatCapacity, ideal, standard, pistonOscillation]);

assert.notEqual(cloned[0], heatCapacity);
assert.notEqual(cloned[1], ideal);
assert.notEqual(cloned[2], standard);
assert.notEqual(cloned[3], pistonOscillation);

if (cloned[0].kind !== 'heatCapacity') throw new Error('expected cloned Heat Capacity file');
heatCapacity.heatCapacityFreeInstrumentConfig.physics.environment.ambientPressureKPa = 88;
heatCapacity.heatCapacityFreeRealDomain.physicsConfig.environment.ambientPressureKPa = 77;
heatCapacity.heatCapacityFreeFileAcknowledgements.advancedParametersRisk = true;
assert.notEqual(selectHeatCapacityFreeAppliedParameterDraft(cloned[0]).ambientPressureKPa, 88);
assert.notEqual(cloned[0].heatCapacityFreeRealDomain.physicsConfig.environment.ambientPressureKPa, 77);
assert.equal(cloned[0].heatCapacityFreeFileAcknowledgements.advancedParametersRisk, false);

if (cloned[1].kind !== 'ideal') throw new Error('expected cloned ideal-gas file');
ideal.pointsByRelation.pt.push({
  id: 'late-point',
  relation: 'pt',
  targetTemperature: 1,
  meanTemperature: 1,
  meanPressure: 1,
  idealPressure: 1,
  relativeGap: 0,
  timestamp: 1,
  boxLength: 1,
  volume: 1,
  inverseVolume: 1,
});
assert.equal(cloned[1].pointsByRelation.pt.length, 0);

if (cloned[3].kind !== 'heatCapacityPistonOscillation') {
  throw new Error('expected cloned piston-oscillation file');
}
pistonOscillation.previewCameraPreset = 'top';
assert.equal(cloned[3].previewCameraPreset, 'side');
assert.equal(
  cloned[3].name,
  'Heat Capacity Ratio - 009',
  'piston-oscillation custom names must not be migrated as old adiabatic-expansion names',
);

const workbenchSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'),
  'utf8',
);
assert.match(snapshotHistoryOwnerSource, /from '\.\/workbenchFileSnapshot\.ts'/);
assert.doesNotMatch(workbenchSource, /const cloneWorkbenchFiles\s*=/);

console.log('workbenchFileSnapshot tests passed');

assert.match(workbenchSource, /createWorkbenchEditHistoryActions\(\{/);
