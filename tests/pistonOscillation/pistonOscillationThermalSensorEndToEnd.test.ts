import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
  analyzePistonOscillationGuidedPeriod,
  calculatePistonOscillationLinearFit,
  createPistonOscillationPeriodSelection,
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  createPistonOscillationSensorObservationSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  getPistonOscillationSettlingStateAtProgress,
  type PistonOscillationThermodynamicState,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  createPistonOscillationPressOperationEvidence,
} from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  createPistonOscillationDynamicSensorObservationSeries,
  createPistonOscillationRecordedObservationSamples,
  findPistonOscillationObservedFallingTriggerSample,
  type PistonOscillationSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';

const SAMPLE_RATE_HZ = 1_000;
const SAMPLE_INTERVAL_S = 1 / SAMPLE_RATE_HZ;
const PRESS_DURATION_S = 0.08;
const PRESS_INTERVAL_COUNT = PRESS_DURATION_S * SAMPLE_RATE_HZ;
const PRESS_DISPLACEMENT_MM = -12;
const TRIGGER_THRESHOLD_KPA = 120;
const RECORDED_DURATION_S = 0.5;

interface PressHistory {
  finalThermodynamicState: PistonOscillationThermodynamicState;
  sensorSeries: PistonOscillationSensorObservationSeries;
}

const createPressHistory = (lockedHeightMm: number): PressHistory => {
  let state = getPistonOscillationSettlingStateAtProgress(lockedHeightMm, 1);
  const equilibriumHeightMm = state.pistonHeightM * 1_000;
  const physicalSamples = [{ pressurePa: state.pressurePa }];
  for (let intervalIndex = 1; intervalIndex <= PRESS_INTERVAL_COUNT; intervalIndex += 1) {
    const displacementMm = PRESS_DISPLACEMENT_MM
      * intervalIndex / PRESS_INTERVAL_COUNT;
    state = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: state,
      pistonHeightMm: equilibriumHeightMm + displacementMm,
      elapsedS: SAMPLE_INTERVAL_S,
      velocityMmPerS: PRESS_DISPLACEMENT_MM / PRESS_DURATION_S,
    });
    physicalSamples.push({ pressurePa: state.pressurePa });
  }
  return {
    finalThermodynamicState: state,
    sensorSeries: createPistonOscillationDynamicSensorObservationSeries(
      physicalSamples,
      SAMPLE_RATE_HZ,
    ),
  };
};

const createReleaseObservation = (
  lockedHeightMm: number,
  pressHistory: PressHistory,
) => {
  const trajectory = simulatePistonOscillationThermalRelease({
    lockedHeightMm,
    initialDisplacementMm: PRESS_DISPLACEMENT_MM,
    initialVelocityMmPerS: PRESS_DISPLACEMENT_MM / PRESS_DURATION_S,
    referenceThermodynamicState: pressHistory.finalThermodynamicState,
  }, { sensorSampleRateHz: SAMPLE_RATE_HZ });
  const previousSensorSample = pressHistory.sensorSeries.samples.at(-1)!;
  const observationSeries = createPistonOscillationDynamicSensorObservationSeries(
    trajectory.samples,
    SAMPLE_RATE_HZ,
    {
      initialState: pressHistory.sensorSeries.finalDynamicState,
      initialObservedPressureKpa: previousSensorSample.absolutePressureKpa,
      config: pressHistory.sensorSeries.dynamicConfig ?? undefined,
    },
  );
  return { trajectory, observationSeries };
};

const fitPoints = [80, 70, 60].map((lockedHeightMm, runIndex) => {
  const pressHistory = createPressHistory(lockedHeightMm);
  const { trajectory, observationSeries } = createReleaseObservation(
    lockedHeightMm,
    pressHistory,
  );
  const trigger = findPistonOscillationObservedFallingTriggerSample(
    observationSeries,
    TRIGGER_THRESHOLD_KPA,
  );
  assert.ok(trigger, `${lockedHeightMm} mm should cross the observed trigger threshold`);

  const physicalTriggerSampleIndex = trajectory.samples.findIndex((sample, sampleIndex) => (
    sampleIndex > 0
    && trajectory.samples[sampleIndex - 1]!.pressurePa
      >= TRIGGER_THRESHOLD_KPA * 1_000
    && sample.pressurePa < TRIGGER_THRESHOLD_KPA * 1_000
  ));
  assert.ok(physicalTriggerSampleIndex > 0);
  assert.ok(
    trigger.sampleIndex > physicalTriggerSampleIndex,
    'the displayed/captured trigger must follow the physical crossing because of sensor lag',
  );

  const recordedSamples = createPistonOscillationRecordedObservationSamples(
    observationSeries,
    trigger.sampleIndex,
    RECORDED_DURATION_S,
  );
  const physicsSnapshot = createPistonOscillationPhysicsSnapshot(
    trajectory,
    trajectory.samples[trigger.sampleIndex]!.timeS,
  );
  const pressOperationEvidence = createPistonOscillationPressOperationEvidence({
    trace: [],
    releasedAtMs: 0,
    spaceReleasedAtMs: 0,
    mouseReleasedAtMs: 0,
    equilibriumHeightMm: trajectory.equilibrium.equilibriumHeightM * 1_000,
    releaseThermodynamicState: pressHistory.finalThermodynamicState,
    releaseVelocityMPerS: pressHistory.finalThermodynamicState.velocityMPerS,
  });
  const record = createPistonOscillationRawMeasurementRecord({
    recordId: `thermal-sensor-${lockedHeightMm}`,
    capturedAtMs: 10_000 + runIndex,
    measurementIndex: runIndex,
    targetHeightMm: lockedHeightMm,
    confirmedHeightMm: trajectory.equilibrium.equilibriumHeightM * 1_000,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: TRIGGER_THRESHOLD_KPA,
    recordedDurationS: RECORDED_DURATION_S,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
    samples: recordedSamples,
    pressOperationEvidence,
    sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
      sampleRateHz: SAMPLE_RATE_HZ,
      triggerSourceSampleIndex: trigger.sampleIndex,
      observationSeries,
    }),
    physicsSnapshot,
  });
  assert.deepEqual(
    record.samples,
    recordedSamples,
    'the curve shown to the user must be the same observed samples that are saved',
  );
  assert.equal(
    record.sensorObservationSnapshot.modelVersion,
    PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  );

  const periodAnalysis = analyzePistonOscillationGuidedPeriod(record);
  assert.equal(periodAnalysis.status, 'usable');
  const selection = createPistonOscillationPeriodSelection(
    record,
    0,
    RECORDED_DURATION_S,
    2,
    20_000 + runIndex,
  );
  assert.equal(selection.issue, null);
  assert.ok(selection.periodCount >= 2);
  assert.equal(selection.leftEndpoint?.type, selection.rightEndpoint?.type);
  const periodS = (
    selection.rightEndpoint!.sampleIndex - selection.leftEndpoint!.sampleIndex
  ) / SAMPLE_RATE_HZ / selection.periodCount;
  return {
    runIndex,
    measurementIndex: runIndex,
    rawMeasurementRecordId: record.recordId,
    periodSquaredS2: periodS ** 2,
    heightMm: lockedHeightMm,
    heightM: lockedHeightMm / 1_000,
  };
});

const fit = calculatePistonOscillationLinearFit(fitPoints, 20_000);
assert.ok(fit);
const referenceTrajectory = createReleaseObservation(80, createPressHistory(80)).trajectory;
const gamma = 4 * Math.PI ** 2 * referenceTrajectory.config.movingMassKg
  * fit.slopeMPerS2
  / (
    referenceTrajectory.equilibrium.cylinderAreaM2
    * PISTON_OSCILLATION_REFERENCE_PRESSURE_PA
  );
assert.ok(
  gamma >= 1.34 && gamma <= 1.44,
  `the normal three-height workflow should retain a credible air gamma, received ${gamma} from periods ${JSON.stringify(
    fitPoints.map((point) => Math.sqrt(point.periodSquaredS2)),
  )}`,
);

const heldPressHistory = createPressHistory(80);
let heldState = heldPressHistory.finalThermodynamicState;
const heldPhysicalSamples = [{ pressurePa: heldState.pressurePa }];
for (let intervalIndex = 0; intervalIndex < 400; intervalIndex += 1) {
  heldState = advancePistonOscillationPrescribedThermodynamicState({
    referenceState: heldState,
    pistonHeightMm: heldState.pistonHeightM * 1_000,
    elapsedS: SAMPLE_INTERVAL_S,
    velocityMmPerS: 0,
  });
  heldPhysicalSamples.push({ pressurePa: heldState.pressurePa });
}
const heldHistory: PressHistory = {
  finalThermodynamicState: heldState,
  sensorSeries: createPistonOscillationDynamicSensorObservationSeries(
    heldPhysicalSamples,
    SAMPLE_RATE_HZ,
    {
      initialState: heldPressHistory.sensorSeries.finalDynamicState,
      initialObservedPressureKpa:
        heldPressHistory.sensorSeries.samples.at(-1)!.absolutePressureKpa,
      config: heldPressHistory.sensorSeries.dynamicConfig ?? undefined,
    },
  ),
};
const heldRelease = createReleaseObservation(80, heldHistory);
assert.ok(
  heldRelease.trajectory.samples[0]!.pressurePa < TRIGGER_THRESHOLD_KPA * 1_000,
  'a deliberate hold must cool the compressed gas enough to create a low-pressure release',
);
assert.equal(
  findPistonOscillationObservedFallingTriggerSample(
    heldRelease.observationSeries,
    TRIGGER_THRESHOLD_KPA,
  ),
  null,
  'the wrong hold operation must be allowed to produce a failed trigger instead of corrected data',
);

const noReleaseVelocityTrajectory = simulatePistonOscillationThermalRelease({
  lockedHeightMm: 80,
  initialDisplacementMm: PRESS_DISPLACEMENT_MM,
  initialVelocityMmPerS: 0,
  referenceThermodynamicState: createPressHistory(80).finalThermodynamicState,
}, { sensorSampleRateHz: SAMPLE_RATE_HZ });
assert.notEqual(
  noReleaseVelocityTrajectory.samples[10]!.displacementM,
  referenceTrajectory.samples[10]!.displacementM,
  'the measured nonzero release velocity must affect the generated trajectory',
);

console.log('pistonOscillationThermalSensorEndToEnd tests passed');
