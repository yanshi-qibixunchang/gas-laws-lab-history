import assert from 'node:assert/strict';
import {
  BOX_LENGTH_PRESET_SEQUENCE,
  diagnoseExperimentFailure,
  getExperimentVerdictState,
  PARTICLE_COUNT_PRESET_SEQUENCE,
  TEMPERATURE_PRESET_SEQUENCE,
} from '../utils/experimentFailureDiagnostics.ts';

const makePtPoint = (targetTemperature: number) => ({
  id: `pt-${targetTemperature}`,
  relation: 'pt' as const,
  targetTemperature,
  meanTemperature: targetTemperature,
  meanPressure: 0.05 + targetTemperature * 0.01,
  idealPressure: 0.05 + targetTemperature * 0.01,
  relativeGap: 0,
  timestamp: Date.now(),
  boxLength: 15,
  volume: 15 ** 3,
  inverseVolume: 1 / 15 ** 3,
});

const regression = {
  slope: 0.1,
  intercept: 0,
  rSquared: 0.82,
  slopeError: 28,
};

assert.equal(
  getExperimentVerdictState(TEMPERATURE_PRESET_SEQUENCE.map(makePtPoint), regression),
  'notYet',
  'A full preset round with poor regression should still be notYet, not verified.',
);

const ptDiagnosis = diagnoseExperimentFailure(TEMPERATURE_PRESET_SEQUENCE.map(makePtPoint), 'pt', regression);
assert.equal(ptDiagnosis.hasCompletedPresetRound, true, 'PT preset round should be recognized as complete.');
assert.equal(ptDiagnosis.failureReason, 'weak_fit', 'Poor R² should be diagnosed as weak fit after a full round.');

const insufficientDiagnosis = diagnoseExperimentFailure(
  TEMPERATURE_PRESET_SEQUENCE.slice(0, 3).map(makePtPoint),
  'pt',
  regression,
);
assert.equal(insufficientDiagnosis.failureReason, 'insufficient_points');

const pvPoints = BOX_LENGTH_PRESET_SEQUENCE.map((boxLength) => ({
  id: `pv-${boxLength}`,
  relation: 'pv' as const,
  targetTemperature: 1,
  meanTemperature: 1,
  meanPressure: 0.07,
  idealPressure: 0.07,
  relativeGap: 0,
  timestamp: Date.now(),
  boxLength,
  volume: boxLength ** 3,
  inverseVolume: 1 / boxLength ** 3,
}));

const pvDiagnosis = diagnoseExperimentFailure(pvPoints, 'pv', {
  slope: 200,
  intercept: 0,
  rSquared: 0.97,
  slopeError: 26,
});
assert.equal(pvDiagnosis.hasCompletedPresetRound, true, 'PV preset round should be recognized as complete.');
assert.equal(pvDiagnosis.failureReason, 'slope_mismatch', 'Good linearity but bad slope should be diagnosed as slope mismatch.');

const pnPoints = PARTICLE_COUNT_PRESET_SEQUENCE.map((particleCount) => ({
  id: `pn-${particleCount}`,
  relation: 'pn' as const,
  targetTemperature: 1,
  meanTemperature: 1,
  meanPressure: 0.02 + particleCount * 0.0002,
  idealPressure: 0.02 + particleCount * 0.0002,
  relativeGap: 0,
  timestamp: Date.now(),
  particleCount,
}));

const pnDiagnosis = diagnoseExperimentFailure(pnPoints, 'pn', {
  slope: 0.0004,
  intercept: 0,
  rSquared: 0.81,
  slopeError: 9,
});
assert.equal(pnDiagnosis.hasCompletedPresetRound, true, 'PN preset round should be recognized as complete.');
assert.equal(pnDiagnosis.failureReason, 'weak_fit', 'Poor PN linearity should be diagnosed as weak fit.');

console.log('experimentFailureDiagnostics tests passed');
