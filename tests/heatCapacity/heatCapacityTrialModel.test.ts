import assert from 'node:assert/strict';
import {
  calculateHeatCapacityMeanResult,
  createDefaultHeatCapacityProcessingResult,
  createHeatCapacityTrialFromAutoDemoSamples,
  createHeatCapacityTrials,
  recordHeatCapacityU1,
  recordHeatCapacityU2,
} from '../../src/domain/heatCapacity/heatCapacityTrialModel.ts';

const trials = createHeatCapacityTrials(3);

assert.equal(trials.length, 3);
assert.equal(trials[0].trialIndex, 1);
assert.equal(trials[0].status, 'waiting');
assert.equal('U0Mv' in trials[0], false, 'trial rows must not store U0');
assert.equal('note' in trials[0], false, 'trial rows must not expose a note field');

const recordedU1 = recordHeatCapacityU1(trials, {
  activeTrialIndex: 0,
  phase: 'sealedStabilizing',
  powerOn: true,
  pressureSignalMv: 120,
  temperatureSignalMv: 1526.1,
  pressureSafetyStatus: 'normal',
  pressureOverLimit: false,
  now: 1000,
});

assert.equal(recordedU1.ok, true);
assert.equal(recordedU1.trials[0].U1Mv, 120);
assert.equal(recordedU1.trials[0].UT1Mv, 1526.1);
assert.equal(recordedU1.trials[0].status, 'partial');

const recordedDangerU1 = recordHeatCapacityU1(createHeatCapacityTrials(1), {
  activeTrialIndex: 0,
  phase: 'sealedStabilizing',
  powerOn: true,
  pressureSignalMv: 124.19,
  temperatureSignalMv: 1526.49,
  pressureSafetyStatus: 'danger',
  pressureOverLimit: true,
  now: 1500,
});

assert.equal(recordedDangerU1.ok, true, 'alarm-region U1 should remain recordable after the user closes the valve and waits for stability');
assert.equal(recordedDangerU1.trials[0].U1Mv, 124.1);
assert.equal(recordedDangerU1.trials[0].UT1Mv, 1526.4);
assert.equal(recordedDangerU1.trials[0].status, 'partial');

const rejectedU2 = recordHeatCapacityU2(recordedU1.trials, {
  activeTrialIndex: 0,
  phase: 'recovering',
  powerOn: true,
  pressureSignalMv: 125,
  temperatureSignalMv: 1523.2,
  pressureSafetyStatus: 'normal',
  pressureOverLimit: false,
  now: 2000,
});

assert.equal(rejectedU2.ok, false);
assert.equal(rejectedU2.trials[0].U2Mv, null, 'invalid U2 must not be written into the table');
assert.equal(rejectedU2.trials[0].status, 'partial');

const recordedU2 = recordHeatCapacityU2(recordedU1.trials, {
  activeTrialIndex: 0,
  phase: 'recovering',
  powerOn: true,
  pressureSignalMv: 34.3,
  temperatureSignalMv: 1522.3,
  pressureSafetyStatus: 'normal',
  pressureOverLimit: false,
  now: 3000,
});

assert.equal(recordedU2.ok, true);
assert.equal(recordedU2.trials[0].U2Mv, 34.3);
assert.equal(recordedU2.trials[0].UT2Mv, 1522.3);
assert.equal(recordedU2.trials[0].status, 'complete');
assert.equal(recordedU2.nextActiveTrialIndex, 0, 'manual workflow should stay on the completed current trial until the user starts the next trial');

const blockedFullTableRecord = recordHeatCapacityU1([recordedU2.trials[0]], {
  activeTrialIndex: 0,
  phase: 'sealedStabilizing',
  powerOn: true,
  pressureSignalMv: 118,
  temperatureSignalMv: 1525,
  pressureSafetyStatus: 'normal',
  pressureOverLimit: false,
  now: 4000,
});
assert.equal(blockedFullTableRecord.ok, false);
assert.equal(blockedFullTableRecord.trials[0].U1Mv, 120, 'recording must not overwrite a complete trial when the expected table is full');

const defaultResult = createDefaultHeatCapacityProcessingResult();
assert.equal(defaultResult.calculated, false);
assert.equal(defaultResult.meanGamma, null);

const result = calculateHeatCapacityMeanResult(recordedU2.trials, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
  theoreticalGamma: 1.4,
});

assert.equal(result.calculated, true);
assert.equal(result.status, 'ready');
assert.equal(result.validTrialCount, 1);
assert.equal(result.trialResults[0].deltaP1KPa, 6);
assert.equal(result.trialResults[0].deltaP2KPa, 1.715);
assert.equal(result.trialResults[0].P1KPa, 107.3);
assert.equal(result.trialResults[0].P2KPa, 103.015);
assert.ok(result.trialResults[0].gamma !== null && result.trialResults[0].gamma > 1.39 && result.trialResults[0].gamma < 1.41);
assert.equal(result.meanGamma, result.trialResults[0].gamma);
assert.ok(result.relativeErrorPercent !== null && result.relativeErrorPercent > 0);

const threeCompleteTrials = [
  { ...recordedU2.trials[0], id: 'heat-trial-1', trialIndex: 1 },
  {
    ...recordedU2.trials[0],
    id: 'heat-trial-2',
    trialIndex: 2,
    U1Mv: 126,
    U2Mv: 35.6,
    UT1Mv: 1525.8,
    UT2Mv: 1521.9,
  },
  {
    ...recordedU2.trials[0],
    id: 'heat-trial-3',
    trialIndex: 3,
    U1Mv: 118.8,
    U2Mv: 33.1,
    UT1Mv: 1526.4,
    UT2Mv: 1522.5,
  },
];
const threeTrialResult = calculateHeatCapacityMeanResult(threeCompleteTrials, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
  theoreticalGamma: 1.4,
});
const threeTrialGammas = threeTrialResult.trialResults
  .map((trial) => trial.gamma)
  .filter((gamma): gamma is number => gamma !== null);
const expectedThreeTrialMean = Math.round(
  threeTrialGammas.reduce((sum, gamma) => sum + gamma, 0) / threeTrialGammas.length * 1000000,
) / 1000000;
assert.equal(threeTrialResult.trialResults.length, 3);
assert.equal(threeTrialResult.validTrialCount, 3);
assert.equal(threeTrialGammas.length, 3);
assert.equal(threeTrialResult.meanGamma, expectedThreeTrialMean);
assert.notEqual(threeTrialResult.meanGamma, threeTrialResult.trialResults[0].gamma, 'mean gamma should come from all three trial gammas');

const noValid = calculateHeatCapacityMeanResult(trials, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
  theoreticalGamma: 1.4,
});
assert.equal(noValid.status, 'no-valid-trials');
assert.equal(noValid.meanGamma, null);

const autoDemoTrial = createHeatCapacityTrialFromAutoDemoSamples({
  stableBeforeReleaseSample: {
    timeS: 86.9,
    phase: 'sealedStabilizing',
    pressureSignalMv: 108.8,
    temperatureSignalMv: 1504.2,
    gasTemperatureK: 293.4,
    gasPressureKPaAbs: 106.74,
    pressureDeltaKPa: 5.44,
    pumpFrequency: 0,
    pumpValveOpen: false,
    stopcockOpen: false,
  },
  recoverySample: {
    timeS: 114.3,
    phase: 'recovering',
    pressureSignalMv: 31.77,
    temperatureSignalMv: 1501.8,
    gasTemperatureK: 292.9,
    gasPressureKPaAbs: 102.89,
    pressureDeltaKPa: 1.59,
    pumpFrequency: 0,
    pumpValveOpen: false,
    stopcockOpen: false,
  },
}, 5000);
assert.equal(autoDemoTrial.trialIndex, 1);
assert.equal(autoDemoTrial.status, 'complete');
assert.equal(autoDemoTrial.U1Mv, 108.8);
assert.equal(autoDemoTrial.U2Mv, 31.7);
assert.equal(autoDemoTrial.UT1Mv, 1504.2);
assert.equal(autoDemoTrial.UT2Mv, 1501.8);

const invalidAutoDemoTrial = createHeatCapacityTrialFromAutoDemoSamples({}, 5000);
assert.equal(invalidAutoDemoTrial.status, 'invalid');
assert.equal(invalidAutoDemoTrial.U1Mv, null);

console.log('heatCapacityTrialModel tests passed');

