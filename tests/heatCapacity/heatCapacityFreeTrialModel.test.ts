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
import {
  applyHeatCapacityFreePreheatBias,
  deriveHeatCapacityFreePreheatBiasGamma,
} from '../../src/domain/heatCapacity/heatCapacityFreeResultBiasModel.ts';

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

assert.equal(
  createHeatCapacityFreeTrial('default-scheme').parameterScheme,
  'real',
  'new Free Mode trials should default to the real simulation domain',
);
assert.equal(
  createHeatCapacityFreeTrial('ideal-scheme', null, 'ideal').parameterScheme,
  'ideal',
  'Free Mode trial creation should support the isolated ideal domain',
);

const trialAWithSignals = {
  ...createCompleteTrial('trial-a', snapshotA),
  correctedSignals: calculateFreeHeatCapacityTrialSignals(createCompleteTrial('trial-a-base', snapshotA), {
    atmosphericPressureKPa: snapshotA.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: snapshotA.sensor.pressureMvPerKPa,
  }),
};
const trialBWithSnapshot = createCompleteTrial('trial-b', snapshotB);

const trialAResultBefore = calculateFreeHeatCapacityTrialResult(
  trialAWithSignals,
  1,
);
assert.equal(trialAResultBefore.gamma, trialAWithSignals.correctedSignals?.gamma);
assert.equal(
  trialAResultBefore.pressureSensitivityMvPerKPa,
  snapshotA.sensor.pressureMvPerKPa,
  'trial correctedSignals should remain frozen once recorded',
);

const trialBResult = calculateFreeHeatCapacityTrialResult(
  trialBWithSnapshot,
  2,
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

const missingSnapshotTrial = createCompleteTrial('missing-snapshot', null);
const missingSnapshotResult = calculateFreeHeatCapacityTrialResult(missingSnapshotTrial, 3);
assert.equal(missingSnapshotResult.status, 'invalid');
assert.equal(missingSnapshotResult.gamma, null);
assert.equal(
  missingSnapshotResult.message,
  'Free trial is missing its parameter snapshot.',
  'complete Free trial records must not fall back to current parameters when their frozen snapshot is missing',
);

const mean = calculateFreeHeatCapacityMeanResult([
  trialAWithSignals,
  trialBWithSnapshot,
  missingSnapshotTrial,
], { theoreticalGamma: 1.4 });
assert.equal(mean.status, 'ready');
assert.equal(mean.trialResults[0].gamma, trialAResultBefore.gamma);
assert.equal(mean.trialResults[1].gamma, trialBExpected?.gamma);
assert.equal(mean.trialResults[2].status, 'invalid');
assert.equal(mean.validTrialCount, 2);

const missingU0Trial: HeatCapacityFreeTrial = {
  ...createCompleteTrial('trial-with-assumed-zero', snapshotA),
  u0: null,
};
const missingU0Signals = calculateFreeHeatCapacityTrialSignals(missingU0Trial, {
  atmosphericPressureKPa: snapshotA.environment.ambientPressureKPa,
  pressureSensitivityMvPerKPa: snapshotA.sensor.pressureMvPerKPa,
  theoreticalGamma: snapshotA.physics.gamma,
});
assert.notEqual(missingU0Signals, null);
assert.equal(missingU0Signals?.u0Source, 'assumed-zero');
assert.equal(missingU0Signals?.U0DisplayMv, 0);

const omittedPreheatTrial: HeatCapacityFreeTrial = {
  ...missingU0Trial,
  id: 'trial-with-omitted-preheat',
  preheatOutcome: 'omitted',
};
const omittedPreheatSignals = calculateFreeHeatCapacityTrialSignals(omittedPreheatTrial, {
  atmosphericPressureKPa: snapshotA.environment.ambientPressureKPa,
  pressureSensitivityMvPerKPa: snapshotA.sensor.pressureMvPerKPa,
  theoreticalGamma: snapshotA.physics.gamma,
});
assert.notEqual(omittedPreheatSignals, null);
assert.equal(
  omittedPreheatSignals?.preheatBiasGamma,
  applyHeatCapacityFreePreheatBias({
    formulaGamma: omittedPreheatSignals!.formulaGamma,
    theoreticalGamma: snapshotA.physics.gamma,
    preheatOutcome: 'omitted',
    seed: omittedPreheatTrial.id,
  }).preheatBiasGamma,
);
assert.equal(
  Math.abs(omittedPreheatSignals?.preheatBiasGamma ?? 1) <= 0.01,
  true,
  'omitted-preheat bias must stay in the confirmed 0.000 to 0.010 range',
);
assert.equal(
  Number.isInteger((omittedPreheatSignals?.preheatBiasGamma ?? 0) * 1000),
  true,
  'omitted-preheat bias must use 0.001 increments',
);
assert.equal(
  Math.abs(omittedPreheatSignals!.gamma - snapshotA.physics.gamma) >=
    Math.abs(omittedPreheatSignals!.formulaGamma - snapshotA.physics.gamma),
  true,
  'omitted-preheat bias must move the reported result away from theoretical gamma',
);
assert.equal(
  deriveHeatCapacityFreePreheatBiasGamma(omittedPreheatTrial.id),
  deriveHeatCapacityFreePreheatBiasGamma(omittedPreheatTrial.id),
  'preheat bias must be deterministic for the same trial',
);

for (const kind of ['u1', 'u2'] as const) {
  const removed = removeHeatCapacityFreeTrialRecord([trialAWithSignals], 0, kind).trials[0];
  assert.equal(removed.correctedSignals, null);
  assert.equal(
    removed.configSnapshot,
    null,
    `removing ${kind} should clear the stored config snapshot with dependent calculated data`,
  );
}

const removedU0 = removeHeatCapacityFreeTrialRecord([{
  ...missingU0Trial,
  u0: createCompleteTrial('u0-record', snapshotA).u0,
  correctedSignals: calculateFreeHeatCapacityTrialSignals(createCompleteTrial('u0-record', snapshotA)),
}], 0, 'u0').trials[0];
assert.equal(removedU0.u0, null);
assert.notEqual(removedU0.u1, null, 'removing U0 should preserve U1');
assert.notEqual(removedU0.u2, null, 'removing U0 should preserve U2');
assert.equal(removedU0.correctedSignals?.u0Source, 'assumed-zero');

console.log('heatCapacityFreeTrialModel tests passed');
