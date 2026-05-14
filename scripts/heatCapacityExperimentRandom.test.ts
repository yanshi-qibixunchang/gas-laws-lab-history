import assert from 'node:assert/strict';
import {
  calculateAirHeatCapacityTargets,
  createHeatCapacityExperimentProfile,
} from '../components/heatCapacity/heatCapacityExperimentRandom.ts';
import {
  calculateHeatCapacityGamma,
} from '../components/heatCapacity/heatCapacityResultModel.ts';
import {
  calculateHeatCapacityMeanResult,
  createHeatCapacityTrialFromAutoDemoSamples,
} from '../components/heatCapacity/heatCapacityTrialModel.ts';

const seed = 3757384;
const first = createHeatCapacityExperimentProfile(seed);
const second = createHeatCapacityExperimentProfile(seed);
const third = createHeatCapacityExperimentProfile(seed + 1);

assert.deepEqual(first, second, 'same seed must reproduce the same experiment profile');
assert.notDeepEqual(first, third, 'new seed should create a different experiment profile');
assert.equal(first.theoreticalGamma, 1.4);
assert.equal(first.seed, seed);
assert.equal(first.u1MeasuredMv > 105 && first.u1MeasuredMv < 131, true);
assert.equal(first.u2MeasuredMv > 25 && first.u2MeasuredMv < first.u1MeasuredMv, true);
assert.equal(first.u0MeasuredMv >= -0.03 && first.u0MeasuredMv <= 0.03, true);
assert.equal(first.gammaTarget >= 1.36 && first.gammaTarget <= 1.44, true);
assert.equal(first.initialTemperatureMv >= 1498.8 && first.initialTemperatureMv <= 1499.3, true, 'initial U_T should match the FD-NCD-C room-temperature reference range');
assert.equal(first.stableTemperatureMv >= 1525 && first.stableTemperatureMv <= 1527, true, 'stable-before-release U_T should match the experiment reference range');
assert.equal(first.releaseTemperatureLowMv >= 1499 && first.releaseTemperatureLowMv <= 1502, true, 'release-low U_T should match the experiment reference range');
assert.equal(first.recoveryTemperatureMv >= 1520 && first.recoveryTemperatureMv <= 1524, true, 'recovery U_T should match the experiment reference range');
assert.equal(first.u2MeasuredMv / first.u1MeasuredMv > 0.24 && first.u2MeasuredMv / first.u1MeasuredMv < 0.32, true, 'air gamma data should keep U2 near 0.286 * U1 instead of hard-sphere 0.4 * U1');

const targets = calculateAirHeatCapacityTargets(first);
assert.equal(targets.gamma >= 1.36 && targets.gamma <= 1.44, true);
assert.equal(Math.abs(targets.gamma - (first.u1MeasuredMv / (first.u1MeasuredMv - first.u2MeasuredMv))) < 1e-9, true);

const sampleResult = calculateHeatCapacityGamma([
  {
    key: 'zeroed',
    label: 'U0',
    timeS: 0,
    phase: 'zeroed',
    pressureSignalMv: first.u0MeasuredMv,
    note: 'zeroed',
  },
  {
    key: 'beforeRelease',
    label: 'U1',
    timeS: 1,
    phase: 'sealedStabilizing',
    pressureSignalMv: first.u1MeasuredMv,
    note: 'before release',
  },
  {
    key: 'afterRecovery',
    label: 'U2',
    timeS: 2,
    phase: 'recovering',
    pressureSignalMv: first.u2MeasuredMv,
    note: 'after recovery',
  },
]);
assert.equal(sampleResult.status, 'ready');
assert.equal(sampleResult.gamma, targets.gamma);

const autoDemoTrial = createHeatCapacityTrialFromAutoDemoSamples({
  stableBeforeReleaseSample: {
    timeS: 86.9,
    phase: 'sealedStabilizing',
    pressureSignalMv: first.u1MeasuredMv,
    temperatureSignalMv: first.stableTemperatureMv,
    gasTemperatureK: 298.15,
    gasPressureKPaAbs: 101.3,
    pressureDeltaKPa: 0,
    pumpFrequency: 0,
    pumpValveOpen: false,
    stopcockOpen: false,
  },
  recoverySample: {
    timeS: 114.3,
    phase: 'recovering',
    pressureSignalMv: first.u2MeasuredMv,
    temperatureSignalMv: first.recoveryTemperatureMv,
    gasTemperatureK: 298.15,
    gasPressureKPaAbs: 101.3,
    pressureDeltaKPa: 0,
    pumpFrequency: 0,
    pumpValveOpen: false,
    stopcockOpen: false,
  },
}, 5000);
const processingResult = calculateHeatCapacityMeanResult([autoDemoTrial], {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
  theoreticalGamma: 1.4,
});
assert.equal(processingResult.status, 'ready');
assert.equal(Math.abs((processingResult.meanGamma ?? 0) - targets.gamma) < 0.000001, true);
assert.equal(processingResult.relativeErrorPercent !== null && processingResult.relativeErrorPercent < 3, true);

console.log('heatCapacityExperimentRandom tests passed');
