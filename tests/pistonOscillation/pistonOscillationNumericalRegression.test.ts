import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_CALCULATION_MODEL_VERSION,
  PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
  calculatePistonOscillationLinearFit,
  findPistonOscillationExtrema,
  type PistonOscillationLinearFitPointSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION,
  simulatePistonOscillationIdealAdiabaticRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  createPistonOscillationIdealSensorReferenceSeries,
  createPistonOscillationRecordedObservationSamples,
  findPistonOscillationObservedFallingTriggerSample,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
} from '../../src/domain/pistonOscillation/pistonOscillationAirMaterialModel.ts';
import {
  PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA,
} from '../../src/domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  roundRatioSignificantFiguresHalfEven,
} from '../../src/domain/calculation/decimalHalfEven.ts';

/**
 * Isolated ideal-reference numerical regression.
 *
 * This zero-heat-transfer, zero-lag chain is retained for equation comparison
 * and historical regression only. It is not a current acquisition path, a
 * measurement of the instrument, or a real-world truth baseline.
 */

const REFERENCE_HEIGHTS_MM = [80, 70, 60] as const;
const REFERENCE_SAMPLE_RATE_HZ = 1_000;
const REFERENCE_PRESS_DISPLACEMENTS_MM = [10.5, 9.8, 9] as const;
const REFERENCE_RECORDING_DURATION_S = 0.5;
const REFERENCE_MINIMUM_PERIOD_COUNT = 3;

assert.equal(
  PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION,
  'piston-oscillation-rk4-pasco-td8572a-v3',
);
assert.equal(
  PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
  'piston-oscillation-sensor-observation-v1',
);
assert.equal(
  PISTON_OSCILLATION_CALCULATION_MODEL_VERSION,
  'piston-slope-calculation-v1',
);
assert.equal(DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.movingMassKg, 0.0485);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.gamma,
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
);

const regressionRuns = REFERENCE_HEIGHTS_MM.map((heightMm, measurementIndex) => {
  const trajectory = simulatePistonOscillationIdealAdiabaticRelease({
    equilibriumHeightMm: heightMm,
    initialDisplacementMm: -REFERENCE_PRESS_DISPLACEMENTS_MM[measurementIndex],
  });
  const observations = createPistonOscillationIdealSensorReferenceSeries(
    trajectory.samples,
    trajectory.sampleRateHz,
  );
  const trigger = findPistonOscillationObservedFallingTriggerSample(
    observations,
    PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA,
  );
  assert.ok(trigger, `${heightMm} mm reference run must cross the trigger`);
  const samples = createPistonOscillationRecordedObservationSamples(
    observations,
    trigger.sampleIndex,
    REFERENCE_RECORDING_DURATION_S,
  );
  assert.equal(samples.length, 501);
  for (const [sampleIndex, sample] of samples.entries()) {
    assert.equal(sample.sampleIndex, sampleIndex);
    assert.equal(sample.timeS, sampleIndex / REFERENCE_SAMPLE_RATE_HZ);
    const gridValue = sample.absolutePressureKpa
      / PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA;
    assert.ok(Math.abs(gridValue - Math.round(gridValue)) <= 1e-9);
  }
  const extrema = findPistonOscillationExtrema(samples);
  assert.ok(extrema.length >= 7);
  const left = extrema[0]!;
  const right = extrema[6]!;
  assert.equal(left.type, right.type);
  const periodS = roundRatioSignificantFiguresHalfEven(
    BigInt(right.sampleIndex - left.sampleIndex),
    BigInt(REFERENCE_SAMPLE_RATE_HZ * REFERENCE_MINIMUM_PERIOD_COUNT),
    4,
  );
  return {
    heightMm,
    measurementIndex,
    triggerSampleIndex: trigger.sampleIndex,
    firstLeftSampleIndex: left.sampleIndex,
    firstRightSampleIndex: right.sampleIndex,
    firstRightTimeS: right.timeS,
    periodS,
  };
});

assert.ok(
  regressionRuns[0]!.periodS > regressionRuns[1]!.periodS
    && regressionRuns[1]!.periodS > regressionRuns[2]!.periodS,
);
assert.ok(regressionRuns.every((run) => run.firstRightTimeS < 0.25));
assert.deepEqual(
  regressionRuns.map((run) => ({
    heightMm: run.heightMm,
    triggerSampleIndex: run.triggerSampleIndex,
    firstLeftSampleIndex: run.firstLeftSampleIndex,
    firstRightSampleIndex: run.firstRightSampleIndex,
    periodS: run.periodS,
  })),
  [
    {
      heightMm: 80,
      triggerSampleIndex: 3,
      firstLeftSampleIndex: 16,
      firstRightSampleIndex: 129,
      periodS: 0.03767,
    },
    {
      heightMm: 70,
      triggerSampleIndex: 3,
      firstLeftSampleIndex: 15,
      firstRightSampleIndex: 122,
      periodS: 0.03567,
    },
    {
      heightMm: 60,
      triggerSampleIndex: 3,
      firstLeftSampleIndex: 14,
      firstRightSampleIndex: 113,
      periodS: 0.033,
    },
  ],
);

const fitPoints: PistonOscillationLinearFitPointSnapshot[] = regressionRuns.map(
  (run) => ({
    runIndex: run.measurementIndex,
    measurementIndex: run.measurementIndex,
    rawMeasurementRecordId: `ideal-reference-regression-${run.heightMm}`,
    periodSquaredS2: run.periodS ** 2,
    heightMm: run.heightMm,
    heightM: run.heightMm / 1_000,
  }),
);
const fit = calculatePistonOscillationLinearFit(fitPoints, 0);
assert.ok(fit);
const areaM2 = Math.PI * PISTON_OSCILLATION_CYLINDER_DIAMETER_M ** 2 / 4;
const regressionGamma = 4 * Math.PI ** 2
  * DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.movingMassKg
  * fit.slopeMPerS2
  / (areaM2 * PISTON_OSCILLATION_REFERENCE_PRESSURE_PA);
assert.ok(fit.slopeMPerS2 > 60.3 && fit.slopeMPerS2 < 60.4);
assert.ok(fit.interceptM > -0.0061 && fit.interceptM < -0.0060);
assert.ok(fit.rSquared > 0.9958 && fit.rSquared < 0.9960);
assert.ok(regressionGamma > 1.37 && regressionGamma < 1.39);
assert.notEqual(regressionGamma, PISTON_OSCILLATION_AIR_ADIABATIC_INDEX);

console.log('pistonOscillationNumericalRegression tests passed');
