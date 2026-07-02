import assert from 'node:assert/strict';
import {
  createHeatCapacityFreeStandardProcess,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardProcessModel.ts';
import {
  createCompleteProcessReviewFixtureParts,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const fixture = createCompleteProcessReviewFixtureParts();
const first = createHeatCapacityFreeStandardProcess({
  traceTrial: fixture.traceTrial,
  branch: fixture.branch,
  trial: fixture.trial,
  theoreticalGamma: 1.4,
});
const second = createHeatCapacityFreeStandardProcess({
  traceTrial: fixture.traceTrial,
  branch: fixture.branch,
  trial: fixture.trial,
  theoreticalGamma: 1.4,
});

assert.equal(first.seed, second.seed);
assert.deepEqual(first.recordWindows.map((window) => window.recordId), ['u0', 'u1', 'u2']);
assert.equal(first.trace.some((point) => point.stageId === 'pump'), true);
assert.equal(first.trace.some((point) => point.stageId === 'release'), true);
assert.equal(first.assumptions.disturbancesPreserved, true);
assert.equal(first.assumptions.operationMode, 'standard-operation');
assert.equal(first.assumptions.stageAligned, true);
assert.equal(first.standard.gamma, first.gamma);
assert.equal(first.upperBound.gamma, Math.max(
  first.standard.gamma ?? Number.NEGATIVE_INFINITY,
  fixture.trial.correctedSignals?.gamma ?? Number.NEGATIVE_INFINITY,
));
assert.equal(first.upperBound.windows, first.recordWindows);

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
const disturbed = createHeatCapacityFreeStandardProcess({
  traceTrial: disturbedTraceTrial,
  branch: fixture.branch,
  trial: {
    ...fixture.trial,
    configSnapshot: disturbedConfig,
  },
  theoreticalGamma: 1.4,
});

assert.equal(disturbed.assumptions.disturbancesPreserved, true);
assert.equal(disturbed.configSnapshot.physics.leakage.enabled, true);
assert.equal(disturbed.configSnapshot.physics.environmentDisturbance?.enabled, true);
assert.equal(disturbed.configSnapshot.sensor.noiseMv, 0.08);
