import assert from 'node:assert/strict';
import {
  createDefaultFreeConfigSnapshot,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  alignStandardReferenceToStages,
  createHeatCapacityStandardReference,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  createHeatCapacityOperableBestReference,
} from '../../src/domain/heatCapacity/heatCapacityFreeOperableBestModel.ts';

const config = createDefaultFreeConfigSnapshot();
const reference = createHeatCapacityStandardReference(config);

const countVisiblePumpLevels = (
  points: Array<{ stageId: string; pressureDeltaKPa: number }>,
) => new Set(
  points
    .filter((point) => point.stageId === 'pump')
    .map((point) => Math.round(point.pressureDeltaKPa * config.sensor.pressureMvPerKPa / 5) * 5),
).size;

assert.equal(reference.noiseMv, 0);
assert.equal(reference.trace.length > 20, true);
assert.equal(reference.stages.map((stage) => stage.id).join(','), 'zero,pump,stabilize,release,recover');
const referencePumpStage = reference.stages.find((stage) => stage.id === 'pump');
assert.equal(referencePumpStage?.countText, 'x4');
assert.equal(
  referencePumpStage !== undefined &&
    Math.abs((referencePumpStage.endS - referencePumpStage.startS) - 0.4) < 1e-9,
  true,
  'standard reference pumping should use a 0.1 s interval between adjacent pump strokes',
);
assert.equal(
  countVisiblePumpLevels(reference.trace) >= 4,
  true,
  'standard reference should expose one visible pressure level per pump stroke instead of collapsing four strokes into two plateaus',
);
assert.equal(reference.records.u0 !== null, true);
assert.equal(reference.records.u1 !== null, true);
assert.equal(reference.records.u2 !== null, true);
const u1Mv = (reference.records.u1?.pressureDeltaKPa ?? 0) * config.sensor.pressureMvPerKPa;
assert.ok(u1Mv >= 115);
assert.ok(u1Mv <= 125);
assert.equal(reference.trace.some((point) => point.stageId === 'pump'), true);
assert.equal(reference.trace.some((point) => point.stageId === 'release'), true);

const maxReferencePressureMv = Math.max(
  ...reference.trace.map((point) => point.pressureDeltaKPa * config.sensor.pressureMvPerKPa),
);
assert.equal(maxReferencePressureMv > config.record.minimumUsefulU1CorrectedMv, true);

const operableBest = createHeatCapacityOperableBestReference(config, 1.4);
const operableBestPumpStage = operableBest.stages.find((stage) => stage.id === 'pump');
assert.equal(
  operableBest.pumpStrokeCount >= 3 && operableBest.pumpStrokeCount <= 4,
  true,
  'operable-best reference may choose the best 3-4 stroke candidate, but should stay in the UI-reachable pump range',
);
assert.equal(
  operableBestPumpStage !== undefined &&
    Math.abs(
      (operableBestPumpStage.endS - operableBestPumpStage.startS) -
        operableBest.pumpStrokeCount * 0.1,
    ) < 1e-9,
  true,
  'operable-best reference should use a 0.1 s interval between adjacent pump strokes',
);
assert.equal(
  countVisiblePumpLevels(operableBest.trace) >= operableBest.pumpStrokeCount,
  true,
  'operable-best reference should expose each rapid pump stroke as a visible pressure level',
);

const findLastPointByStage = (
  points: typeof reference.trace,
  stageId: string,
) => {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].stageId === stageId) return points[index];
  }
  return null;
};

const slowThermalConfig = createDefaultFreeConfigSnapshot();
slowThermalConfig.physics.thermal.gasWallConductanceWPerK = 0.08;
const fastThermalConfig = createDefaultFreeConfigSnapshot();
fastThermalConfig.physics.thermal.gasWallConductanceWPerK = 0.6;
const slowReference = createHeatCapacityStandardReference(slowThermalConfig);
const fastReference = createHeatCapacityStandardReference(fastThermalConfig);
const slowPumpEnd = findLastPointByStage(slowReference.trace, 'pump');
const fastPumpEnd = findLastPointByStage(fastReference.trace, 'pump');
assert.ok((slowPumpEnd?.temperatureDeltaK ?? 0) > (fastPumpEnd?.temperatureDeltaK ?? 0));

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
