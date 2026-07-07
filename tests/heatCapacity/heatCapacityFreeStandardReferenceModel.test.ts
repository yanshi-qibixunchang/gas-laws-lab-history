import assert from 'node:assert/strict';
import {
  createHeatCapacityFreeStandardReference,
  HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  createCompleteProcessReviewFixtureParts,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const fixture = createCompleteProcessReviewFixtureParts();
const first = createHeatCapacityFreeStandardReference({
  traceTrial: fixture.traceTrial,
  trial: fixture.trial,
  theoreticalGamma: 1.4,
});
const second = createHeatCapacityFreeStandardReference({
  traceTrial: fixture.traceTrial,
  trial: fixture.trial,
  theoreticalGamma: 1.4,
});

assert.equal(first.generatorVersion, HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION);
assert.equal(first.seed, second.seed);
assert.deepEqual(first.operationPreset, HEAT_CAPACITY_STANDARD_OPERATION);
assert.deepEqual(first.recordWindows.map((window) => window.recordId), ['u0', 'u1', 'u2']);
assert.equal(first.trace.some((point) => point.stageId === 'pump'), true);
assert.equal(first.trace.some((point) => point.stageId === 'release'), true);
const stageById = new Map(first.stages.map((stage) => [stage.id, stage]));
assert.equal(stageById.get('pump')?.countText, 'x18');
assert.equal(
  Number(((stageById.get('pump')!.endS - stageById.get('pump')!.startS)).toFixed(2)),
  12,
  'standard reference should use the fixed 18-stroke / 12 s pump procedure',
);
assert.equal(
  Number(((stageById.get('stabilize')!.endS - stageById.get('stabilize')!.startS)).toFixed(2)),
  300,
  'standard reference should wait 300 s before recording U1',
);
assert.equal(
  Number(((stageById.get('release')!.endS - stageById.get('release')!.startS)).toFixed(2)),
  0.35,
  'standard reference should release for the tuned 0.35 s window, not a synthesized duration',
);
assert.equal(
  Number(((stageById.get('recover')!.endS - stageById.get('recover')!.startS)).toFixed(2)),
  300,
  'standard reference should wait 300 s before recording U2',
);
assert.equal(first.summary.assumptions.disturbancesPreserved, true);
assert.equal(first.summary.assumptions.operationMode, 'standard-operation');
assert.equal(first.summary.assumptions.stageAligned, true);
assert.equal(first.summary.gamma, first.gamma);
assert.equal(first.operationUpperBound.gamma, Math.max(
  first.summary.gamma ?? Number.NEGATIVE_INFINITY,
  fixture.trial.correctedSignals?.gamma ?? Number.NEGATIVE_INFINITY,
));
assert.deepEqual(
  first.operationUpperBound.windows.map((window) => window.recordId),
  first.recordWindows.map((window) => window.recordId),
);
assert.equal('standard' in first, false, 'standard reference should not keep the old nested standard summary');
assert.equal('upperBound' in first, false, 'standard reference should expose operationUpperBound instead of upperBound');

const disturbedConfig = {
  ...fixture.traceTrial.configSnapshot,
  physics: {
    ...fixture.traceTrial.configSnapshot.physics,
    leakage: {
      ...fixture.traceTrial.configSnapshot.physics.leakage,
      enabled: true,
      ratePerS: 0.00007,
    },
    environmentDisturbance: {
      ...(fixture.traceTrial.configSnapshot.physics.environmentDisturbance ?? {
        pressureAmplitudeKPa: 0.002,
        temperatureAmplitudeK: 0.015,
        timeScaleS: 180,
      }),
      enabled: true,
    },
  },
  sensor: {
    ...fixture.traceTrial.configSnapshot.sensor,
    noiseMv: 0.08,
  },
};
const disturbedTraceTrial = {
  ...fixture.traceTrial,
  configSnapshot: disturbedConfig,
};
const disturbed = createHeatCapacityFreeStandardReference({
  traceTrial: disturbedTraceTrial,
  trial: {
    ...fixture.trial,
    configSnapshot: disturbedConfig,
  },
  theoreticalGamma: 1.4,
});

assert.equal(disturbed.summary.assumptions.disturbancesPreserved, true);
assert.equal(disturbed.configSnapshot.physics.leakage.enabled, true);
assert.equal(disturbed.configSnapshot.physics.environmentDisturbance?.enabled, true);
assert.equal(disturbed.configSnapshot.sensor.noiseMv, 0.08);
