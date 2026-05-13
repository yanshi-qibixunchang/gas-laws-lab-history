import assert from 'node:assert/strict';
import {
  calculateHeatCapacityMeanResult,
  createDefaultHeatCapacityProcessingResult,
  createHeatCapacityTrials,
  recordHeatCapacityU1,
  recordHeatCapacityU2,
} from '../components/heatCapacity/heatCapacityTrialModel.ts';

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
  pressureSignalMv: 32,
  temperatureSignalMv: 1522.3,
  pressureSafetyStatus: 'normal',
  pressureOverLimit: false,
  now: 3000,
});

assert.equal(recordedU2.ok, true);
assert.equal(recordedU2.trials[0].U2Mv, 32);
assert.equal(recordedU2.trials[0].UT2Mv, 1522.3);
assert.equal(recordedU2.trials[0].status, 'complete');

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
assert.equal(result.trialResults[0].deltaP2KPa, 1.6);
assert.equal(result.trialResults[0].P1KPa, 107.3);
assert.equal(result.trialResults[0].P2KPa, 102.9);
assert.ok(result.trialResults[0].gamma !== null && result.trialResults[0].gamma > 1.35 && result.trialResults[0].gamma < 1.41);
assert.equal(result.meanGamma, result.trialResults[0].gamma);
assert.ok(result.relativeErrorPercent !== null && result.relativeErrorPercent > 0);

const noValid = calculateHeatCapacityMeanResult(trials, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
  theoreticalGamma: 1.4,
});
assert.equal(noValid.status, 'no-valid-trials');
assert.equal(noValid.meanGamma, null);

console.log('heatCapacityTrialModel tests passed');
