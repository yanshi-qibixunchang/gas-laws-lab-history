import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
  advancePistonOscillationPeriodRun,
  analyzePistonOscillationPrimaryCycleEligibility,
  calculatePistonOscillationLinearFit,
  createPistonOscillationDataProcessingSession,
  createPistonOscillationFreePeriodSelection,
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  createPistonOscillationSensorObservationSnapshot,
  formatPistonOscillationEndpointTime,
  formatPistonOscillationPeriod,
  revealPistonOscillationFreePeriodEntry,
  selectPistonOscillationFreePeriodRange,
  submitPistonOscillationFreePeriodBatch,
  submitPistonOscillationLinearFit,
  togglePistonOscillationFitRun,
  type PistonOscillationLinearFitPointSnapshot,
  type PistonOscillationRawMeasurementRecord,
  updatePistonOscillationPeriodAnswerDraft,
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
  quantizePistonOscillationObservedPressureKpa,
  createPistonOscillationDynamicSensorObservationSeries,
  createPistonOscillationRecordedObservationSamples,
  findPistonOscillationObservedFallingTriggerSample,
  type PistonOscillationSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  PISTON_ACQUISITION_BASELINE_PRESSURE_KPA,
} from '../../src/features/pistonOscillation/pistonOscillationAcquisitionConfig.ts';

const PRESS_DURATION_S = 0.08;
const PRESS_DISPLACEMENT_MM = -12;
const RECORDING_DURATION_S = 0.5;
const NORMAL_TRIGGER_THRESHOLD_KPA = 120;

interface PressHistory {
  finalState: PistonOscillationThermodynamicState;
  sensorSeries: PistonOscillationSensorObservationSeries;
}

interface PhysicalCapture {
  record: PistonOscillationRawMeasurementRecord;
  releaseObservationSeries: PistonOscillationSensorObservationSeries;
}

const createPressHistory = (
  lockedHeightMm: number,
  sampleRateHz: number,
): PressHistory => {
  let state = getPistonOscillationSettlingStateAtProgress(
    lockedHeightMm,
    1,
    { sensorSampleRateHz: sampleRateHz },
  );
  const equilibriumHeightMm = state.pistonHeightM * 1_000;
  const intervalCount = Math.max(1, Math.round(PRESS_DURATION_S * sampleRateHz));
  const intervalS = PRESS_DURATION_S / intervalCount;
  const physicalSamples = [{ pressurePa: state.pressurePa }];
  for (let intervalIndex = 1; intervalIndex <= intervalCount; intervalIndex += 1) {
    const displacementMm = PRESS_DISPLACEMENT_MM * intervalIndex / intervalCount;
    state = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: state,
      pistonHeightMm: equilibriumHeightMm + displacementMm,
      elapsedS: intervalS,
      velocityMmPerS: PRESS_DISPLACEMENT_MM / PRESS_DURATION_S,
      physicsConfig: { sensorSampleRateHz: sampleRateHz },
    });
    physicalSamples.push({ pressurePa: state.pressurePa });
  }
  return {
    finalState: state,
    sensorSeries: createPistonOscillationDynamicSensorObservationSeries(
      physicalSamples,
      sampleRateHz,
    ),
  };
};

const createPhysicalCapture = (options: {
  recordId: string;
  measurementIndex: number;
  targetHeightMm: number;
  actualLockedHeightMm: number;
  sampleRateHz?: number;
  triggerThresholdKpa?: number;
  recordingDurationS?: number;
}): PhysicalCapture => {
  const sampleRateHz = options.sampleRateHz ?? 1_000;
  const triggerThresholdKpa = options.triggerThresholdKpa
    ?? NORMAL_TRIGGER_THRESHOLD_KPA;
  const requestedDurationS = options.recordingDurationS ?? RECORDING_DURATION_S;
  const pressHistory = createPressHistory(options.actualLockedHeightMm, sampleRateHz);
  const trajectory = simulatePistonOscillationThermalRelease({
    lockedHeightMm: options.actualLockedHeightMm,
    initialDisplacementMm: PRESS_DISPLACEMENT_MM,
    initialVelocityMmPerS: PRESS_DISPLACEMENT_MM / PRESS_DURATION_S,
    referenceThermodynamicState: pressHistory.finalState,
  }, { sensorSampleRateHz: sampleRateHz });
  const previousSensorSample = pressHistory.sensorSeries.samples.at(-1)!;
  const releaseObservationSeries = createPistonOscillationDynamicSensorObservationSeries(
    trajectory.samples,
    sampleRateHz,
    {
      initialState: pressHistory.sensorSeries.finalDynamicState,
      initialObservedPressureKpa: previousSensorSample.absolutePressureKpa,
      config: pressHistory.sensorSeries.dynamicConfig ?? undefined,
    },
  );
  const trigger = findPistonOscillationObservedFallingTriggerSample(
    releaseObservationSeries,
    triggerThresholdKpa,
  );
  assert.ok(trigger, `${options.recordId} should cross ${triggerThresholdKpa} kPa`);
  const maximumIntervalCount = Math.max(
    0,
    releaseObservationSeries.samples.length - trigger.sampleIndex - 1,
  );
  const requestedIntervalCount = Math.max(
    1,
    Math.round(requestedDurationS * sampleRateHz),
  );
  const intervalCount = Math.min(maximumIntervalCount, requestedIntervalCount);
  const recordedDurationS = intervalCount / sampleRateHz;
  const samples = createPistonOscillationRecordedObservationSamples(
    releaseObservationSeries,
    trigger.sampleIndex,
    recordedDurationS,
  );
  const pressOperationEvidence = createPistonOscillationPressOperationEvidence({
    trace: [],
    releasedAtMs: 0,
    spaceReleasedAtMs: 0,
    mouseReleasedAtMs: 0,
    equilibriumHeightMm: trajectory.equilibrium.equilibriumHeightM * 1_000,
    releaseThermodynamicState: pressHistory.finalState,
    releaseVelocityMPerS: pressHistory.finalState.velocityMPerS,
  });
  return {
    record: createPistonOscillationRawMeasurementRecord({
      recordId: options.recordId,
      capturedAtMs: 10_000 + options.measurementIndex,
      measurementIndex: options.measurementIndex,
      targetHeightMm: options.targetHeightMm,
      confirmedHeightMm: trajectory.equilibrium.equilibriumHeightM * 1_000,
      sampleRateHz,
      triggerThresholdKpa,
      recordedDurationS,
      recordingPath: 'falling-trigger',
      releaseOffsetS: null,
      samples,
      pressOperationEvidence,
      sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
        sampleRateHz,
        triggerSourceSampleIndex: trigger.sampleIndex,
        observationSeries: releaseObservationSeries,
      }),
      physicsSnapshot: createPistonOscillationPhysicsSnapshot(
        trajectory,
        trajectory.samples[trigger.sampleIndex]!.timeS,
      ),
    }),
    releaseObservationSeries,
  };
};

const getMeasuredPeriodS = (record: PistonOscillationRawMeasurementRecord) => {
  const report = analyzePistonOscillationPrimaryCycleEligibility(record);
  assert.equal(report.status, 'usable', `${record.recordId} should contain a primary period`);
  const left = report.primaryExtrema[0];
  const right = report.primaryExtrema.at(-1);
  assert.ok(left && right && right.ordinal > left.ordinal);
  return (right.timeS - left.timeS) / ((right.ordinal - left.ordinal) / 2);
};

const getFit = (
  records: readonly PistonOscillationRawMeasurementRecord[],
  heightSource: 'planned' | 'actual',
) => {
  const points: PistonOscillationLinearFitPointSnapshot[] = records.map((record) => {
    const heightM = heightSource === 'planned'
      ? record.targetHeightMm / 1_000
      : record.physicsSnapshot.equilibrium.lockedHeightM;
    const periodS = getMeasuredPeriodS(record);
    return {
      runIndex: record.measurementIndex,
      measurementIndex: record.measurementIndex,
      rawMeasurementRecordId: record.recordId,
      periodSquaredS2: periodS ** 2,
      heightMm: heightM * 1_000,
      heightM,
    };
  });
  const fit = calculatePistonOscillationLinearFit(points, 20_000);
  assert.ok(fit);
  const reference = records[0]!;
  const gamma = 4 * Math.PI ** 2
    * reference.physicsSnapshot.config.movingMassKg
    * fit.slopeMPerS2
    / (
      reference.physicsSnapshot.equilibrium.cylinderAreaM2
      * PISTON_OSCILLATION_REFERENCE_PRESSURE_PA
    );
  return { fit, gamma };
};

const captureCache = new Map<number, PhysicalCapture>();
const getCapture = (actualLockedHeightMm: number) => {
  const cached = captureCache.get(actualLockedHeightMm);
  if (cached) return cached;
  const capture = createPhysicalCapture({
    recordId: `physical-${actualLockedHeightMm}`,
    measurementIndex: 0,
    targetHeightMm: actualLockedHeightMm,
    actualLockedHeightMm,
  });
  captureCache.set(actualLockedHeightMm, capture);
  return capture;
};

const createScenarioRecords = (
  scenarioId: string,
  actualHeightsMm: readonly number[],
) => [80, 70, 60].map((targetHeightMm, measurementIndex) => {
  const actualLockedHeightMm = actualHeightsMm[measurementIndex]!;
  const template = getCapture(actualLockedHeightMm).record;
  return createPistonOscillationRawMeasurementRecord({
    recordId: `${scenarioId}-${measurementIndex}`,
    capturedAtMs: 30_000 + measurementIndex,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm: template.confirmedHeightMm,
    sampleRateHz: template.acquisitionSettings.sampleRateHz,
    triggerThresholdKpa: template.acquisitionSettings.triggerThresholdKpa,
    recordedDurationS: template.acquisitionSettings.recordedDurationS,
    recordingPath: template.acquisitionSettings.recordingPath,
    releaseOffsetS: template.acquisitionSettings.releaseOffsetS,
    samples: template.samples,
    pressOperationEvidence: template.pressOperationEvidence,
    sensorObservationSnapshot: template.sensorObservationSnapshot,
    physicsSnapshot: template.physicsSnapshot,
  });
});

const processFreeRecordsThroughFit = (
  records: readonly PistonOscillationRawMeasurementRecord[],
) => {
  let nowMs = 60_000;
  let session = createPistonOscillationDataProcessingSession(
    records,
    nowMs,
    { answerValidationMode: 'batch' },
  );
  for (let runIndex = 0; runIndex < records.length; runIndex += 1) {
    const record = records[runIndex]!;
    nowMs += 1;
    session = selectPistonOscillationFreePeriodRange(
      session,
      records,
      runIndex,
      0,
      record.acquisitionSettings.recordedDurationS,
      nowMs,
    );
    let run = session.runs[runIndex]!;
    assert.equal(run.selection?.issue, null);
    assert.ok(run.answers.t1.expectedValue !== null);
    assert.ok(run.answers.t2.expectedValue !== null);
    nowMs += 1;
    session = updatePistonOscillationPeriodAnswerDraft(
      session,
      runIndex,
      't1',
      formatPistonOscillationEndpointTime(run.answers.t1.expectedValue),
      nowMs,
    );
    nowMs += 1;
    session = updatePistonOscillationPeriodAnswerDraft(
      session,
      runIndex,
      't2',
      formatPistonOscillationEndpointTime(run.answers.t2.expectedValue),
      nowMs,
    );
    nowMs += 1;
    session = revealPistonOscillationFreePeriodEntry(session, runIndex, nowMs);
    run = session.runs[runIndex]!;
    assert.ok(run.answers.period.expectedValue !== null);
    nowMs += 1;
    session = updatePistonOscillationPeriodAnswerDraft(
      session,
      runIndex,
      'period',
      formatPistonOscillationPeriod(run.answers.period.expectedValue),
      nowMs,
    );
    nowMs += 1;
    session = submitPistonOscillationFreePeriodBatch(session, runIndex, nowMs);
    assert.ok(session.runs[runIndex]?.result);
    nowMs += 1;
    session = advancePistonOscillationPeriodRun(session, nowMs, records);
  }
  assert.equal(session.status, 'calculation-ready');
  for (let runIndex = 0; runIndex < records.length; runIndex += 1) {
    nowMs += 1;
    session = togglePistonOscillationFitRun(session, runIndex, nowMs);
  }
  nowMs += 1;
  session = submitPistonOscillationLinearFit(session, nowMs, { requireAllRuns: true });
  assert.ok(session.linearFitResult);
  return session.linearFitResult;
};

const heightScenarios = [
  { id: 'baseline', actualHeightsMm: [80, 70, 60] },
  { id: 'one-high', actualHeightsMm: [75, 70, 60] },
  { id: 'one-middle', actualHeightsMm: [80, 65, 60] },
  { id: 'one-low', actualHeightsMm: [80, 70, 55] },
  { id: 'two-adjacent', actualHeightsMm: [75, 65, 60] },
  { id: 'two-endpoints', actualHeightsMm: [75, 70, 55] },
  { id: 'three-same-direction', actualHeightsMm: [75, 65, 55] },
] as const;

const heightResults = heightScenarios.map((scenario) => {
  const records = createScenarioRecords(scenario.id, scenario.actualHeightsMm);
  const planned = getFit(records, 'planned');
  const actual = getFit(records, 'actual');
  return {
    scenario: scenario.id,
    actualHeightsMm: [...scenario.actualHeightsMm],
    plannedGamma: planned.gamma,
    plannedSlopeMPerS2: planned.fit.slopeMPerS2,
    plannedInterceptM: planned.fit.interceptM,
    plannedRSquared: planned.fit.rSquared,
    actualGamma: actual.gamma,
    actualSlopeMPerS2: actual.fit.slopeMPerS2,
    actualInterceptM: actual.fit.interceptM,
    actualRSquared: actual.fit.rSquared,
  };
});

const baselineHeightResult = heightResults[0]!;
assert.ok(baselineHeightResult.plannedGamma >= 1.34);
assert.ok(baselineHeightResult.plannedGamma <= 1.43);
for (const result of heightResults.slice(1)) {
  assert.ok(
    Math.abs(result.plannedGamma - result.actualGamma) > 0.005
      || Math.abs(result.plannedRSquared - result.actualRSquared) > 0.005
      || Math.abs(result.plannedInterceptM - result.actualInterceptM) > 0.0005,
    `${result.scenario} must preserve the planned/actual height mismatch in fit evidence`,
  );
}
const uniformHeightOffsetResult = heightResults.find((result) => (
  result.scenario === 'three-same-direction'
))!;
assert.ok(
  Math.abs(uniformHeightOffsetResult.plannedGamma
    - uniformHeightOffsetResult.actualGamma) < 1e-10,
  'an equal offset at every height should not be given an artificial gamma penalty',
);
assert.ok(
  Math.abs(
    uniformHeightOffsetResult.plannedInterceptM
      - uniformHeightOffsetResult.actualInterceptM,
  ) > 0.0049,
  'an equal height offset must remain visible in the fitted intercept',
);
const mismatchedRecord = createScenarioRecords('height-evidence', [80, 65, 60])[1]!;
assert.equal(mismatchedRecord.targetHeightMm, 70);
assert.equal(mismatchedRecord.physicsSnapshot.equilibrium.lockedHeightM * 1_000, 65);
assert.notEqual(mismatchedRecord.confirmedHeightMm, mismatchedRecord.targetHeightMm);
const mismatchFit = processFreeRecordsThroughFit(
  createScenarioRecords('height-processing-evidence', [80, 65, 60]),
);
assert.deepEqual(
  mismatchFit.points.map((point) => point.heightMm),
  [80, 70, 60],
  'Free processing must fit planned heights while preserving actual heights in raw physics',
);
const idealMismatchRecords = createScenarioRecords(
  'ideal-height-processing-evidence',
  [80, 65, 60],
).map((record) => ({
  ...record,
  experimentContext: {
    schemaVersion: 1 as const,
    groupId: 'ideal-height-processing-evidence',
    scheme: 'ideal' as const,
    parameterProfileVersion: 'piston-oscillation-ideal-air-v1',
    provenance: 'captured' as const,
  },
}));
const idealMismatchFit = processFreeRecordsThroughFit(idealMismatchRecords);
assert.deepEqual(
  idealMismatchFit.points.map((point) => point.heightMm),
  idealMismatchRecords.map((record) => record.confirmedHeightMm),
  'Ideal processing must fit the exact captured equilibrium heights',
);

const normalCapture = getCapture(80);
const observedReleaseStartKpa = normalCapture.releaseObservationSeries.samples[0]!
  .absolutePressureKpa;
const atmosphericBaselineKpa = quantizePistonOscillationObservedPressureKpa(
  PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
);
const thresholdResults = [96, 100, 110, 120, 130].map((thresholdKpa) => {
  const trigger = findPistonOscillationObservedFallingTriggerSample(
    normalCapture.releaseObservationSeries,
    thresholdKpa,
  );
  return {
    thresholdKpa,
    startsImmediatelyAtAtmosphericBaseline: atmosphericBaselineKpa > thresholdKpa,
    fallingTriggerTimeS: trigger?.timeS ?? null,
  };
});
assert.ok(observedReleaseStartKpa > NORMAL_TRIGGER_THRESHOLD_KPA);
assert.equal(thresholdResults.find((result) => result.thresholdKpa === 96)
  ?.startsImmediatelyAtAtmosphericBaseline, true);
assert.ok(thresholdResults.find((result) => result.thresholdKpa === 120)
  ?.fallingTriggerTimeS !== null);
assert.equal(thresholdResults.find((result) => result.thresholdKpa === 130)
  ?.fallingTriggerTimeS, null);

const fullRecord = normalCapture.record;
const earlyPauseResults: Array<{
  durationS: number;
  status: string;
  reason: string;
  primaryPeriodCount: number;
  primaryExtremaTimesS: number[];
}> = [];
for (let intervalCount = 1; intervalCount < fullRecord.samples.length; intervalCount += 1) {
  const samples = fullRecord.samples.slice(0, intervalCount + 1);
  const durationS = intervalCount / fullRecord.acquisitionSettings.sampleRateHz;
  const record = createPistonOscillationRawMeasurementRecord({
    recordId: `early-pause-${intervalCount}`,
    capturedAtMs: 40_000 + intervalCount,
    measurementIndex: 0,
    targetHeightMm: fullRecord.targetHeightMm,
    confirmedHeightMm: fullRecord.confirmedHeightMm,
    sampleRateHz: fullRecord.acquisitionSettings.sampleRateHz,
    triggerThresholdKpa: fullRecord.acquisitionSettings.triggerThresholdKpa,
    recordedDurationS: durationS,
    recordingPath: fullRecord.acquisitionSettings.recordingPath,
    releaseOffsetS: fullRecord.acquisitionSettings.releaseOffsetS,
    samples,
    pressOperationEvidence: fullRecord.pressOperationEvidence,
    sensorObservationSnapshot: fullRecord.sensorObservationSnapshot,
    physicsSnapshot: fullRecord.physicsSnapshot,
  });
  const report = analyzePistonOscillationPrimaryCycleEligibility(record);
  earlyPauseResults.push({
    durationS,
    status: report.status,
    reason: report.reason,
    primaryPeriodCount: report.primaryPeriodCount,
    primaryExtremaTimesS: report.primaryExtrema.map((extremum) => extremum.timeS),
  });
  if (report.status === 'usable') break;
}
const firstUsablePause = earlyPauseResults.at(-1)!;
assert.equal(firstUsablePause.status, 'usable');
assert.ok(firstUsablePause.primaryPeriodCount >= 0.5);
assert.ok(earlyPauseResults.slice(0, -1).every((result) => result.status !== 'usable'));
const fullEligibility = analyzePistonOscillationPrimaryCycleEligibility(fullRecord);
const firstUsableExtremaSpanSamples = (
  (firstUsablePause.primaryExtremaTimesS.at(-1) ?? 0)
    - (firstUsablePause.primaryExtremaTimesS[0] ?? 0)
) * fullRecord.acquisitionSettings.sampleRateHz;
assert.ok(
  firstUsableExtremaSpanSamples >= fullEligibility.expectedHalfPeriodSamples * 0.8,
  'a steep trigger endpoint must not be mistaken for a primary extremum',
);

const narrowSelection = createPistonOscillationFreePeriodSelection(
  fullRecord,
  0,
  0.001,
  50_000,
);
assert.equal(fullEligibility.status, 'usable');
assert.equal(narrowSelection.issue, 'insufficient-extrema');

const samplingResults = [100, 200, 1_000].map((sampleRateHz, measurementIndex) => {
  const capture = createPhysicalCapture({
    recordId: `sample-rate-${sampleRateHz}`,
    measurementIndex,
    targetHeightMm: 80,
    actualLockedHeightMm: 80,
    sampleRateHz,
  });
  const eligibility = analyzePistonOscillationPrimaryCycleEligibility(capture.record);
  return {
    sampleRateHz,
    sampleCount: capture.record.samples.length,
    recordedSampleRateHz: capture.record.acquisitionSettings.sampleRateHz,
    eligibilityStatus: eligibility.status,
    measuredPeriodS: eligibility.status === 'usable'
      ? getMeasuredPeriodS(capture.record)
      : null,
  };
});
for (const result of samplingResults) {
  assert.equal(result.recordedSampleRateHz, result.sampleRateHz);
  assert.equal(result.sampleCount, result.sampleRateHz * RECORDING_DURATION_S + 1);
}

console.log('pistonOscillationExistingModelErrorConsequences tests passed');
