import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_CALCULATION_MODEL_VERSION,
  PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
  calculatePistonOscillationLinearFit,
  createPistonOscillationPeriodSelection,
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  createPistonOscillationSensorObservationSnapshot,
  findPistonOscillationExtrema,
  type PistonOscillationLinearFitPointSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_PHYSICS_MODEL_VERSION,
  simulatePistonOscillationRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  createPistonOscillationRecordedObservationSamples,
  createPistonOscillationSensorObservationSeries,
  findPistonOscillationObservedFallingTriggerSample,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
  PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION,
} from '../../src/domain/pistonOscillation/pistonOscillationAirMaterialModel.ts';
import {
  PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION,
} from '../../src/domain/pistonOscillation/pistonOscillationEquivalentLossModel.ts';
import {
  PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA,
} from '../../src/domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  roundRatioSignificantFiguresHalfEven,
} from '../../src/domain/calculation/decimalHalfEven.ts';

/**
 * Current-model numerical regression baseline only.
 *
 * These assertions describe the deterministic software model and sensor pipeline
 * named below. They are not measurements of the physical instrument, are not a
 * real-world scientific truth baseline, and must not be used to force the
 * observed regression result to equal the saved 1.40 air property. A deliberate
 * physics or observation-model change must update the bound versions and
 * reviewed numerical expectations together.
 */

const CURRENT_MODEL_HEIGHTS_MM = [80, 70, 60] as const;
const CURRENT_MODEL_SAMPLE_RATE_HZ = 1_000;
const CURRENT_MODEL_TRIGGER_THRESHOLD_KPA =
  PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA;
const CURRENT_MODEL_PRESS_DISPLACEMENTS_MM = [10.5, 9.8, 9] as const;
const CURRENT_MODEL_RECORDING_DURATION_S = 0.5;
const CURRENT_MODEL_MINIMUM_PERIOD_COUNT = 3;

assert.equal(
  PISTON_OSCILLATION_PHYSICS_MODEL_VERSION,
  'piston-oscillation-rk4-pasco-td8572a-v3',
);
assert.equal(
  PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  'piston-oscillation-sensor-observation-v1',
);
assert.equal(PISTON_OSCILLATION_CALCULATION_MODEL_VERSION, 'piston-slope-calculation-v1');
assert.equal(DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.movingMassKg, 0.0485);
assert.equal(DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.sensorSampleRateHz, 1_000);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.gamma,
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
);

const regressionRuns = CURRENT_MODEL_HEIGHTS_MM.map((heightMm, measurementIndex) => {
  const trajectory = simulatePistonOscillationRelease({
    equilibriumHeightMm: heightMm,
    initialDisplacementMm: -CURRENT_MODEL_PRESS_DISPLACEMENTS_MM[measurementIndex],
  });
  assert.equal(trajectory.sampleRateHz, CURRENT_MODEL_SAMPLE_RATE_HZ);
  const observations = createPistonOscillationSensorObservationSeries(
    trajectory.samples,
    trajectory.sampleRateHz,
  );
  assert.equal(
    observations.modelVersion,
    PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  );
  assert.equal(
    observations.pressureResolutionKpa,
    PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  );
  const trigger = findPistonOscillationObservedFallingTriggerSample(
    observations,
    CURRENT_MODEL_TRIGGER_THRESHOLD_KPA,
  );
  assert.ok(trigger, `${heightMm} mm must cross the falling trigger on an observed sample`);
  assert.equal(trigger.timeS, trigger.sampleIndex / CURRENT_MODEL_SAMPLE_RATE_HZ);
  assert.ok(trigger.absolutePressureKpa < CURRENT_MODEL_TRIGGER_THRESHOLD_KPA);
  assert.ok(
    observations.samples[trigger.sampleIndex - 1]!.absolutePressureKpa
      >= CURRENT_MODEL_TRIGGER_THRESHOLD_KPA,
  );

  const samples = createPistonOscillationRecordedObservationSamples(
    observations,
    trigger.sampleIndex,
    CURRENT_MODEL_RECORDING_DURATION_S,
  );
  assert.equal(samples.length, 501);
  assert.equal(samples[0]?.sampleIndex, 0);
  assert.equal(samples[0]?.timeS, 0);
  assert.equal(samples.at(-1)?.sampleIndex, 500);
  assert.equal(samples.at(-1)?.timeS, 0.5);
  for (const [sampleIndex, sample] of samples.entries()) {
    assert.equal(sample.sampleIndex, sampleIndex);
    assert.equal(sample.timeS, sampleIndex / CURRENT_MODEL_SAMPLE_RATE_HZ);
    const pressureGridValue = sample.absolutePressureKpa
      / PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA;
    assert.ok(
      Math.abs(pressureGridValue - Math.round(pressureGridValue)) <= 1e-9,
      `${heightMm} mm sample ${sampleIndex} must remain on the 0.01 kPa sensor grid`,
    );
  }

  const sensorObservationSnapshot = createPistonOscillationSensorObservationSnapshot({
    sampleRateHz: observations.sampleRateHz,
    triggerSourceSampleIndex: trigger.sampleIndex,
  });
  const record = createPistonOscillationRawMeasurementRecord({
    recordId: `current-model-regression-${heightMm}`,
    capturedAtMs: 0,
    measurementIndex,
    targetHeightMm: heightMm,
    confirmedHeightMm: heightMm,
    sampleRateHz: observations.sampleRateHz,
    triggerThresholdKpa: CURRENT_MODEL_TRIGGER_THRESHOLD_KPA,
    recordedDurationS: CURRENT_MODEL_RECORDING_DURATION_S,
    samples,
    sensorObservationSnapshot,
    physicsSnapshot: createPistonOscillationPhysicsSnapshot(trajectory, trigger.timeS),
  });
  assert.equal(record.physicsSnapshot.modelVersion, PISTON_OSCILLATION_PHYSICS_MODEL_VERSION);
  assert.equal(
    record.physicsSnapshot.airMaterial.modelVersion,
    PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION,
  );
  assert.equal(
    record.physicsSnapshot.airMaterial.adiabaticIndex,
    PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
  );
  assert.equal(
    record.physicsSnapshot.equivalentLoss.modelVersion,
    PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION,
  );
  assert.equal(
    record.sensorObservationSnapshot.modelVersion,
    PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  );

  const extrema = findPistonOscillationExtrema(record.samples);
  assert.ok(extrema.length >= 7, `${heightMm} mm must expose at least three early periods`);
  const earlyExtrema = extrema.slice(0, 7);
  for (let index = 1; index < earlyExtrema.length; index += 1) {
    assert.notEqual(
      earlyExtrema[index]?.type,
      earlyExtrema[index - 1]?.type,
      `${heightMm} mm early extrema must alternate peak and trough`,
    );
  }
  const firstSelection = createPistonOscillationPeriodSelection(
    record,
    earlyExtrema[0]!.timeS,
    earlyExtrema[6]!.timeS,
    CURRENT_MODEL_MINIMUM_PERIOD_COUNT,
    0,
  );
  assert.equal(firstSelection.issue, null);
  assert.equal(firstSelection.periodCount, 3);
  assert.equal(firstSelection.leftEndpoint?.sampleIndex, earlyExtrema[0]!.sampleIndex);
  assert.equal(firstSelection.rightEndpoint?.sampleIndex, earlyExtrema[6]!.sampleIndex);
  const endpointSampleSpan = firstSelection.rightEndpoint!.sampleIndex
    - firstSelection.leftEndpoint!.sampleIndex;
  const periodS = roundRatioSignificantFiguresHalfEven(
    BigInt(endpointSampleSpan),
    BigInt(CURRENT_MODEL_SAMPLE_RATE_HZ * CURRENT_MODEL_MINIMUM_PERIOD_COUNT),
    4,
  );
  return {
    heightMm,
    measurementIndex,
    trigger,
    firstSelection,
    periodS,
    extrema,
  };
});

assert.ok(
  regressionRuns[0]!.periodS > regressionRuns[1]!.periodS
    && regressionRuns[1]!.periodS > regressionRuns[2]!.periodS,
  'the current model must retain the reviewed trend: period increases with gas-column height',
);
assert.ok(
  regressionRuns.every((run) => run.firstSelection.rightEndpoint!.timeS < 0.25),
  'the first legal three-period selection must remain in the early visible oscillation',
);
assert.deepEqual(
  regressionRuns.map((run) => ({
    heightMm: run.heightMm,
    triggerSampleIndex: run.trigger.sampleIndex,
    firstLeftSampleIndex: run.firstSelection.leftEndpoint?.sampleIndex,
    firstRightSampleIndex: run.firstSelection.rightEndpoint?.sampleIndex,
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
  'version-bound trigger and early-period values must change only through an explicit baseline review',
);

const fitPoints: PistonOscillationLinearFitPointSnapshot[] = regressionRuns.map((run) => ({
  runIndex: run.measurementIndex,
  measurementIndex: run.measurementIndex,
  rawMeasurementRecordId: `current-model-regression-${run.heightMm}`,
  periodSquaredS2: run.periodS ** 2,
  heightMm: run.heightMm,
  heightM: run.heightMm / 1_000,
}));
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
assert.ok(
  regressionGamma > 1.37 && regressionGamma < 1.39,
  'gamma near 1.379 is only the version-bound observed-sample regression value',
);
assert.notEqual(
  regressionGamma,
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
  'the formal observation chain may retain sampling and endpoint-selection bias',
);

console.log('pistonOscillationNumericalRegression tests passed');
