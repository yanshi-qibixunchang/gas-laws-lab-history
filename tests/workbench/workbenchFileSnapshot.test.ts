import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
} from '../../src/features/workbench/workbenchState.ts';
import { cloneWorkbenchFiles } from '../../src/features/workbench/workbenchFileSnapshot.ts';

const heatCapacity = createDefaultHeatCapacityFile(1);
const ideal = createDefaultIdealFile(1);
const standard = createDefaultStandardFile(1);
const cloned = cloneWorkbenchFiles([heatCapacity, ideal, standard]);

assert.notEqual(cloned[0], heatCapacity);
assert.notEqual(cloned[1], ideal);
assert.notEqual(cloned[2], standard);

if (cloned[0].kind !== 'heatCapacity') throw new Error('expected cloned Heat Capacity file');
heatCapacity.heatCapacityFreeParameterDraft.ambientPressureKPa = 88;
heatCapacity.heatCapacityFreeRealDomain.physicsConfig.environment.ambientPressureKPa = 77;
heatCapacity.heatCapacityFreeFileAcknowledgements.advancedParametersRisk = true;
assert.notEqual(cloned[0].heatCapacityFreeParameterDraft.ambientPressureKPa, 88);
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

const workbenchSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'),
  'utf8',
);
assert.match(workbenchSource, /from '\.\/workbenchFileSnapshot\.ts'/);
assert.doesNotMatch(workbenchSource, /const cloneWorkbenchFiles\s*=/);

console.log('workbenchFileSnapshot tests passed');
