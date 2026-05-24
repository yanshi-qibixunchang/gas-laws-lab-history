import assert from 'node:assert/strict';
import {
  calculateFreeHeatCapacityMeanResult,
  calculateFreeHeatCapacityTrialResult,
  calculateFreeHeatCapacityTrialSignals,
  createHeatCapacityFreeTrial,
  removeHeatCapacityFreeTrialRecord,
  type HeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createDefaultFreeConfigSnapshot,
  type HeatCapacityFreeConfigSnapshot,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';

const createCompleteTrial = (
  id: string,
  configSnapshot: HeatCapacityFreeConfigSnapshot | null,
): HeatCapacityFreeTrial => ({
  ...createHeatCapacityFreeTrial(id),
  u0: {
    atS: 1,
    displayPressureMv: 0,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    source: 'user',
    phaseAtRecord: null,
    traceTrialId: null,
    traceBranchId: null,
    traceSampleId: null,
    eventId: null,
  },
  u1: {
    atS: 2,
    displayPressureMv: 112,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    source: 'user',
    phaseAtRecord: null,
    traceTrialId: null,
    traceBranchId: null,
    traceSampleId: null,
    eventId: null,
  },
  u2: {
    atS: 3,
    displayPressureMv: 31.387452,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    source: 'user',
    phaseAtRecord: null,
    traceTrialId: null,
    traceBranchId: null,
    traceSampleId: null,
    eventId: null,
  },
  configSnapshot,
});

const snapshotA = createDefaultFreeConfigSnapshot();
const snapshotB: HeatCapacityFreeConfigSnapshot = {
  ...createDefaultFreeConfigSnapshot(),
  environment: {
    ambientPressureKPa: 88,
    ambientTemperatureK: 298.15,
  },
  sensor: {
    ...createDefaultFreeConfigSnapshot().sensor,
    pressureMvPerKPa: 11,
  },
};

const trialAWithSignals = {
  ...createCompleteTrial('trial-a', snapshotA),
  correctedSignals: calculateFreeHeatCapacityTrialSignals(createCompleteTrial('trial-a-base', snapshotA), {
    atmosphericPressureKPa: snapshotA.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: snapshotA.sensor.pressureMvPerKPa,
  }),
};
const trialBWithSnapshot = createCompleteTrial('trial-b', snapshotB);

const changedCurrentOptions = {
  atmosphericPressureKPa: 130,
  pressureSensitivityMvPerKPa: 30,
  theoreticalGamma: 1.4,
};

const trialAResultBefore = calculateFreeHeatCapacityTrialResult(
  trialAWithSignals,
  1,
  changedCurrentOptions,
);
const trialAResultAfterOptionsChange = calculateFreeHeatCapacityTrialResult(
  trialAWithSignals,
  1,
  {
    atmosphericPressureKPa: 65,
    pressureSensitivityMvPerKPa: 8,
  },
);
assert.equal(trialAResultBefore.gamma, trialAResultAfterOptionsChange.gamma);
assert.equal(trialAResultBefore.gamma, trialAWithSignals.correctedSignals?.gamma);
assert.equal(
  trialAResultBefore.pressureSensitivityMvPerKPa,
  snapshotA.sensor.pressureMvPerKPa,
  'trial correctedSignals should win over later current options',
);

const trialBResult = calculateFreeHeatCapacityTrialResult(
  trialBWithSnapshot,
  2,
  changedCurrentOptions,
);
const trialBExpected = calculateFreeHeatCapacityTrialSignals(trialBWithSnapshot, {
  atmosphericPressureKPa: snapshotB.environment.ambientPressureKPa,
  pressureSensitivityMvPerKPa: snapshotB.sensor.pressureMvPerKPa,
});
assert.equal(trialBResult.gamma, trialBExpected?.gamma);
assert.equal(
  trialBResult.pressureSensitivityMvPerKPa,
  snapshotB.sensor.pressureMvPerKPa,
  'trial configSnapshot should be used when correctedSignals are absent',
);

const legacyTrial = createCompleteTrial('legacy', null);
const legacyResult = calculateFreeHeatCapacityTrialResult(legacyTrial, 3, changedCurrentOptions);
const legacyExpected = calculateFreeHeatCapacityTrialSignals(legacyTrial, changedCurrentOptions);
assert.equal(legacyResult.gamma, legacyExpected?.gamma);
assert.equal(
  legacyResult.pressureSensitivityMvPerKPa,
  changedCurrentOptions.pressureSensitivityMvPerKPa,
  'legacy trial without correctedSignals or configSnapshot should still use current options',
);

const mean = calculateFreeHeatCapacityMeanResult([
  trialAWithSignals,
  trialBWithSnapshot,
  legacyTrial,
], changedCurrentOptions);
assert.equal(mean.status, 'ready');
assert.equal(mean.trialResults[0].gamma, trialAResultBefore.gamma);
assert.equal(mean.trialResults[1].gamma, trialBExpected?.gamma);
assert.equal(mean.trialResults[2].gamma, legacyExpected?.gamma);

for (const kind of ['u0', 'u1', 'u2'] as const) {
  const removed = removeHeatCapacityFreeTrialRecord([trialAWithSignals], 0, kind).trials[0];
  assert.equal(removed.correctedSignals, null);
  assert.equal(
    removed.configSnapshot,
    null,
    `removing ${kind} should clear the stored config snapshot with dependent calculated data`,
  );
}

console.log('heatCapacityFreeTrialModel tests passed');
