import assert from 'node:assert/strict';
import {
  createDefaultFreeConfigSnapshot,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  alignStandardReferenceToStages,
  createHeatCapacityStandardReference,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';

const config = createDefaultFreeConfigSnapshot();
const reference = createHeatCapacityStandardReference(config);

assert.equal(reference.noiseMv, 0);
assert.equal(reference.trace.length > 20, true);
assert.equal(reference.stages.map((stage) => stage.id).join(','), 'zero,pump,stabilize,release,recover');
assert.equal(reference.records.u0 !== null, true);
assert.equal(reference.records.u1 !== null, true);
assert.equal(reference.records.u2 !== null, true);
assert.equal(reference.trace.some((point) => point.stageId === 'pump'), true);
assert.equal(reference.trace.some((point) => point.stageId === 'release'), true);

const maxReferencePressureMv = Math.max(
  ...reference.trace.map((point) => point.pressureDeltaKPa * config.sensor.pressureMvPerKPa),
);
assert.equal(maxReferencePressureMv > config.record.minimumUsefulU1CorrectedMv, true);

const aligned = alignStandardReferenceToStages(reference, [
  { id: 'zero', label: 'zero', startS: 0, endS: 6 },
  { id: 'pump', label: 'pump', startS: 6, endS: 30 },
  { id: 'stabilize', label: 'stabilize', startS: 30, endS: 60 },
  { id: 'release', label: 'release', startS: 60, endS: 61 },
  { id: 'recover', label: 'recover', startS: 61, endS: 90 },
]);

assert.equal(aligned.every((point) => point.timeS >= 0 && point.timeS <= 90), true);
assert.equal(aligned.some((point) => point.stageId === 'stabilize' && point.timeS >= 30 && point.timeS <= 60), true);
assert.equal(aligned.some((point) => point.stageId === 'release' && point.timeS >= 60 && point.timeS <= 61), true);

console.log('heatCapacityFreeStandardReferenceModel tests passed');
