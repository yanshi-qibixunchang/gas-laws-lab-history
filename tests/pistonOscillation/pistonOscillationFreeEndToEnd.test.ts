import assert from 'node:assert/strict';
import { completeUncertaintyExercises } from './helpers/pistonUncertaintyCourseTestHelpers.ts';
import { calculatePistonUncertainty } from '../../src/domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';
import { InMemoryWorkbenchPersistenceV3GenerationStore } from '../../src/features/workbench/persistenceV3/generationStore.ts';
import { commitWorkbenchPersistenceV3ProductionSnapshot, restoreWorkbenchPersistenceV3ProductionWorkspace } from '../../src/features/workbench/persistenceV3/productionFacade.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchState.ts';
import {
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  createPistonOscillationSensorObservationSnapshot,
  findPistonOscillationPrimaryExtrema,
  formatPistonOscillationCalculationAnswer,
  formatPistonOscillationEndpointTime,
  formatPistonOscillationPeriod,
  type PistonOscillationRawMeasurementRecord,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createDefaultPistonOscillationFreeSession,
  normalizePistonOscillationFreeSession,
  transitionPistonOscillationFreeSession,
  type PistonOscillationFreeEvent,
  type PistonOscillationFreeSession,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  createPistonOscillationLoadedEquilibriumState,
  getPistonOscillationSettlingStateAtProgress,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  createPistonOscillationPressOperationEvidence,
} from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  createPistonOscillationDynamicSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';

type UntimedFreeEvent = PistonOscillationFreeEvent extends infer Event
  ? Event extends { nowMs: number }
    ? Omit<Event, 'nowMs'>
    : never
  : never;

let clockMs = 100_000;
const send = (
  session: PistonOscillationFreeSession,
  event: UntimedFreeEvent,
) => transitionPistonOscillationFreeSession(session, {
  ...event,
  nowMs: clockMs += 1,
} as PistonOscillationFreeEvent);

const createCapturedMeasurement = (
  measurementIndex: number,
  targetHeightMm: number,
) => {
  const sampleRateHz = 1_000;
  const pressDisplacementMm = measurementIndex === 2 ? 14 : 12;
  const pressVelocityMmPerS = -pressDisplacementMm / 0.08;
  const equilibrium = createPistonOscillationLoadedEquilibriumState(
    targetHeightMm,
    { sensorSampleRateHz: sampleRateHz },
  );
  let releaseState = getPistonOscillationSettlingStateAtProgress(
    targetHeightMm,
    1,
    { sensorSampleRateHz: sampleRateHz },
  );
  const pressPhysicalSamples = [{ pressurePa: releaseState.pressurePa }];
  for (let sampleIndex = 1; sampleIndex <= 80; sampleIndex += 1) {
    releaseState = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: releaseState,
      pistonHeightMm: equilibrium.equilibriumHeightM * 1_000
        - pressDisplacementMm * sampleIndex / 80,
      elapsedS: 1 / sampleRateHz,
      velocityMmPerS: pressVelocityMmPerS,
      physicsConfig: { sensorSampleRateHz: sampleRateHz },
    });
    pressPhysicalSamples.push({ pressurePa: releaseState.pressurePa });
  }
  const pressObservations = createPistonOscillationDynamicSensorObservationSeries(
    pressPhysicalSamples,
    sampleRateHz,
  );
  const trajectory = simulatePistonOscillationThermalRelease({
    lockedHeightMm: targetHeightMm,
    initialDisplacementMm: -pressDisplacementMm,
    initialVelocityMmPerS: pressVelocityMmPerS,
    referenceThermodynamicState: releaseState,
  }, {
    sensorSampleRateHz: sampleRateHz,
    trajectoryDurationS: 0.5,
  });
  const observations = createPistonOscillationDynamicSensorObservationSeries(
    trajectory.samples,
    trajectory.sampleRateHz,
    {
      initialState: pressObservations.finalDynamicState,
      initialObservedPressureKpa:
        pressObservations.samples.at(-1)!.absolutePressureKpa,
    },
  );
  const pressOperationEvidence = createPistonOscillationPressOperationEvidence({
    trace: [],
    releasedAtMs: clockMs,
    spaceReleasedAtMs: clockMs,
    mouseReleasedAtMs: clockMs,
    equilibriumHeightMm: equilibrium.equilibriumHeightM * 1_000,
    releaseThermodynamicState: releaseState,
    releaseVelocityMPerS: releaseState.velocityMPerS,
  });
  const measurement = createPistonOscillationRawMeasurementRecord({
    recordId: `end-to-end-${targetHeightMm}-${measurementIndex}-${clockMs}`,
    capturedAtMs: clockMs,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm: trajectory.equilibrium.equilibriumHeightM * 1_000,
    sampleRateHz: observations.sampleRateHz,
    triggerThresholdKpa: 120,
    recordedDurationS: observations.samples.at(-1)!.timeS,
    recordingPath: 'immediate',
    releaseOffsetS: 0,
    samples: observations.samples,
    pressOperationEvidence,
    sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
      sampleRateHz: observations.sampleRateHz,
      triggerSourceSampleIndex: 0,
      observationSeries: observations,
    }),
    physicsSnapshot: createPistonOscillationPhysicsSnapshot(trajectory, null),
  });
  return { measurement, trajectory };
};

const selectStableRange = (
  session: PistonOscillationFreeSession,
  records: readonly PistonOscillationRawMeasurementRecord[],
  runIndex: number,
) => {
  const extrema = findPistonOscillationPrimaryExtrema(records[runIndex]!);
  assert.ok(extrema.length >= 7);
  const left = extrema[0]!;
  const right = extrema[6]!;
  return send(session, {
    type: 'selectPeriodRange',
    runIndex,
    rangeStartTimeS: Math.max(0, left.timeS - 0.0004),
    rangeEndTimeS: right.timeS + 0.0004,
  });
};

const resolveRunWithRecordedRetries = (
  session: PistonOscillationFreeSession,
  records: readonly PistonOscillationRawMeasurementRecord[],
  runIndex: number,
) => {
  let next = selectStableRange(session, records, runIndex);
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 't1', value: '9.999' });
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 't2', value: '9.999' });
  next = send(next, { type: 'revealPeriodEntry', runIndex });
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 'period', value: 'abc' });
  next = send(next, { type: 'submitPeriodBatch', runIndex });
  assert.equal(next.dataProcessing?.runs[runIndex].batchAttempts.length, 0);
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 'period', value: '9.999' });
  next = send(next, { type: 'submitPeriodBatch', runIndex });
  assert.equal(next.dataProcessing?.runs[runIndex].batchAttempts.at(-1)?.fields.t1.draftRaw, '9.999');
  assert.equal(next.dataProcessing?.runs[runIndex].batchAttempts.length, 1);
  next = send(next, { type: 'continuePeriodBatch', runIndex });
  const t1 = next.dataProcessing!.runs[runIndex].answers.t1.expectedValue!;
  const t2 = next.dataProcessing!.runs[runIndex].answers.t2.expectedValue!;
  next = send(next, {
    type: 'editPeriodAnswer',
    runIndex,
    field: 't1',
    value: formatPistonOscillationEndpointTime(t1),
  });
  next = send(next, {
    type: 'editPeriodAnswer',
    runIndex,
    field: 't2',
    value: formatPistonOscillationEndpointTime(t2),
  });
  const period = next.dataProcessing!.runs[runIndex].answers.period.expectedValue!;
  next = send(next, {
    type: 'editPeriodAnswer',
    runIndex,
    field: 'period',
    value: formatPistonOscillationPeriod(period, next.dataProcessing!.runs[runIndex]),
  });
  next = send(next, { type: 'submitPeriodBatch', runIndex });
  assert.ok(next.dataProcessing?.runs[runIndex].result);
  return next;
};

const resolveRunByReveal = (
  session: PistonOscillationFreeSession,
  records: readonly PistonOscillationRawMeasurementRecord[],
  runIndex: number,
) => {
  let next = selectStableRange(session, records, runIndex);
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 't1', value: '-1' });
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 't2', value: '-1' });
  next = send(next, { type: 'revealPeriodEntry', runIndex });
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 'period', value: '-1' });
  next = send(next, { type: 'submitPeriodBatch', runIndex });
  next = send(next, { type: 'revealPeriodAnswer', runIndex, field: 't1' });
  next = send(next, { type: 'revealPeriodAnswer', runIndex, field: 't2' });
  next = send(next, { type: 'revealPeriodAnswer', runIndex, field: 'period' });
  assert.ok(next.dataProcessing?.runs[runIndex].result);
  return next;
};

const completeFitAndCalculation = (session: PistonOscillationFreeSession) => {
  let next = session;
  for (let runIndex = 0; runIndex < next.dataProcessing!.runs.length; runIndex += 1) {
    next = send(next, { type: 'toggleFitRun', runIndex });
  }
  next = send(next, { type: 'submitLinearFit' });
  assert.equal(
    next.dataProcessing?.linearFitResult?.selectedRunIndices.length,
    next.dataProcessing?.runs.length,
  );

  const areaExpected = next.dataProcessing!.calculationSession!.answers.area.expectedValue!;
  next = send(next, { type: 'editCalculationAnswer', field: 'area', value: '0' });
  next = send(next, { type: 'revealNextCalculationField', field: 'area' });
  next = send(next, { type: 'editCalculationAnswer', field: 'gamma', value: '999' });
  next = send(next, { type: 'revealNextCalculationField', field: 'gamma' });
  next = send(next, { type: 'editCalculationAnswer', field: 'relativeError', value: 'abc' });
  next = send(next, { type: 'submitCalculationBatch' });
  assert.equal(next.dataProcessing?.calculationSession?.batchAttempts.length, 0);
  next = send(next, { type: 'editCalculationAnswer', field: 'relativeError', value: '999' });
  next = send(next, { type: 'submitCalculationBatch' });
  next = send(next, { type: 'continueCalculationBatch' });
  next = send(next, {
    type: 'editCalculationAnswer',
    field: 'area',
    value: formatPistonOscillationCalculationAnswer('area', areaExpected, next.dataProcessing!.calculationSession!.answers.area),
  });
  next = send(next, { type: 'submitCalculationBatch' });
  next = send(next, { type: 'revealCalculationAnswer', field: 'gamma' });
  next = send(next, { type: 'revealCalculationAnswer', field: 'relativeError' });
  assert.equal(next.dataProcessing?.calculationSession?.status, 'ready-to-exit');
  const blocked = send(next, { type: 'completeCalculation' });
  if (next.dataProcessing?.calculationSession?.uncertainty) {
    assert.equal(blocked.dataProcessing?.status, 'calculation-ready', 'new courses require uncertainty before completion');
    next = { ...next, dataProcessing: completeUncertaintyExercises(next.dataProcessing!) };
  }
  next = send(next, { type: 'completeCalculation' });
  assert.equal(next.dataProcessing?.status, 'completed');
  return next;
};

const createCollectedSession = (
  targetHeightsMm: readonly number[],
  customHeightCandidatesMm: readonly number[],
) => {
  let session = send(createDefaultPistonOscillationFreeSession(), { type: 'start' });
  session = send(session, {
    type: 'setPlan',
    targetHeightsMm,
    customHeightCandidatesMm,
  });
  session = send(session, {
    type: 'setAcquisitionSetting',
    field: 'sampleRateHz',
    value: 1_000,
  });
  session = send(session, {
    type: 'setAcquisitionSetting',
    field: 'triggerThresholdKpa',
    value: 120,
  });
  session = send(session, { type: 'setPower', powerOn: true });
  const records: PistonOscillationRawMeasurementRecord[] = [];
  const maximumSpeedsMPerS: number[] = [];
  for (const [measurementIndex, targetHeightMm] of session.experimentPlan!
    .targetHeightsMm.entries()) {
    const { measurement, trajectory } = createCapturedMeasurement(
      measurementIndex,
      targetHeightMm,
    );
    records.push(measurement);
    maximumSpeedsMPerS.push(Math.max(
      ...trajectory.samples.map((sample) => Math.abs(sample.velocityMPerS)),
    ));
    if (measurementIndex === 0) {
      session = send(session, { type: 'freezeAcquisition', measurement });
      session = send(session, { type: 'pause' });
      assert.equal(session.acquisitionCandidate?.recordId, measurement.recordId);
      session = send(session, { type: 'start' });
    }
    session = send(session, { type: 'saveMeasurement', measurement });
  }
  assert.equal(session.savedMeasurements.length, targetHeightsMm.length);
  assert.equal(session.dataProcessing?.runs.length, targetHeightsMm.length);
  return { session, records, maximumSpeedsMPerS };
};

const detailed = createCollectedSession([80, 70, 60], []);
assert.ok(
  detailed.maximumSpeedsMPerS[2]! > 2,
  'a reachable 14 mm third-run press must keep its physical rebound peak above 2 m/s',
);
assert.ok(detailed.records.every((record) => record.samples.length === 501));

let detailedSession = detailed.session;
const firstExtrema = findPistonOscillationPrimaryExtrema(detailed.records[0]!);
assert.ok(firstExtrema.length >= 8);
detailedSession = send(detailedSession, {
  type: 'selectPeriodRange',
  runIndex: 0,
  rangeStartTimeS: firstExtrema[0]!.timeS - 0.0004,
  rangeEndTimeS: firstExtrema[6]!.timeS + 0.0004,
});
const firstSelection = structuredClone(detailedSession.dataProcessing!.runs[0].selection!);
detailedSession = send(detailedSession, { type: 'clearPeriodSelection', runIndex: 0 });
detailedSession = send(detailedSession, {
  type: 'selectPeriodRange',
  runIndex: 0,
  rangeStartTimeS: firstExtrema[1]!.timeS - 0.0004,
  rangeEndTimeS: firstExtrema[7]!.timeS + 0.0004,
});
assert.notEqual(
  detailedSession.dataProcessing?.runs[0].selection?.leftEndpoint?.sampleIndex,
  firstSelection.leftEndpoint?.sampleIndex,
  'reselection must replace the first saved range without changing the selection rule',
);
detailedSession = send(detailedSession, {
  type: 'selectPeriodRange',
  runIndex: 0,
  rangeStartTimeS: firstExtrema[0]!.timeS - 0.0004,
  rangeEndTimeS: firstExtrema[1]!.timeS + 0.0004,
});
assert.equal(detailedSession.dataProcessing?.runs[0].selection?.periodCount, 0.5);
assert.equal(detailedSession.dataProcessing?.runs[0].selection?.issue, null);
const restoredHalfCycleSelection = normalizePistonOscillationFreeSession(
  JSON.parse(JSON.stringify(detailedSession)),
);
assert.equal(restoredHalfCycleSelection.dataProcessing?.processingPolicy.answerValidationMode, 'batch');
assert.equal(restoredHalfCycleSelection.dataProcessing?.runs[0].selection?.periodCount, 0.5);
assert.equal(
  restoredHalfCycleSelection.dataProcessing?.runs[0].selection?.issue,
  null,
  'a persisted Free half-cycle selection must not acquire the Guide three-period minimum',
);
detailedSession = restoredHalfCycleSelection;

detailedSession = resolveRunWithRecordedRetries(
  detailedSession,
  detailed.records,
  0,
);
detailedSession = send(detailedSession, { type: 'advancePeriodRun' });
detailedSession = resolveRunByReveal(detailedSession, detailed.records, 1);
detailedSession = send(detailedSession, { type: 'advancePeriodRun' });
assert.equal(detailedSession.dataProcessing?.activeRunIndex, 2);
detailedSession = send(detailedSession, { type: 'reopenPreviousPeriodRun' });
assert.equal(detailedSession.dataProcessing?.activeRunIndex, 1);
assert.equal(detailedSession.dataProcessing?.audit.at(-1)?.type, 'run-reopened');
detailedSession = resolveRunWithRecordedRetries(
  detailedSession,
  detailed.records,
  1,
);
detailedSession = send(detailedSession, { type: 'advancePeriodRun' });
detailedSession = resolveRunWithRecordedRetries(
  detailedSession,
  detailed.records,
  2,
);
assert.equal(
  detailedSession.dataProcessing?.status,
  'calculation-ready',
  'the final run must enter calculation automatically without another action',
);
detailedSession = completeFitAndCalculation(detailedSession);
const completedBeforeRestart = structuredClone(detailedSession.dataProcessing);
const completedAnalysis = calculatePistonUncertainty(completedBeforeRestart!.calculationSession!.knowns,
  completedBeforeRestart!.linearFitResult!, completedBeforeRestart!.runs, completedBeforeRestart!.calculationSession!.uncertainty!.profile);
assert.equal(completedAnalysis.gamma, completedBeforeRestart!.calculationSession!.answers.gamma.expectedValue,
  'the uncertainty course must use the exact same gamma that was accepted earlier');
for (const run of completedBeforeRestart!.runs) assert.equal(Number(run.answers.period.draftRaw), run.result!.periodS,
  'the fitted period must be the submitted/revealed period, not a hidden longer value');
const obsoletePrecision = structuredClone(detailedSession);
delete obsoletePrecision.dataProcessing!.precisionVersion;
const migratedPrecision = normalizePistonOscillationFreeSession(obsoletePrecision);
assert.equal(migratedPrecision.dataProcessing!.precisionNotice, 'upgraded');
assert.equal(migratedPrecision.dataProcessing!.status, 'period-processing');
assert.ok(migratedPrecision.dataProcessing!.runs.every(run => run.result === null && run.answers.period.status === 'unresolved'));
assert.deepEqual(migratedPrecision.savedMeasurements, detailedSession.savedMeasurements, 'precision migration preserves measurements');
assert.equal(migratedPrecision.dataProcessing!.calculationSession, null, 'obsolete final checks must not survive migration');
const awaitingGuards = structuredClone(detailedSession);
Object.assign(awaitingGuards.dataProcessing!, { precisionNotice: 'more-digits', activeRunIndex: 0,
  status: 'period-processing', linearFitResult: null, calculationSession: null });
for (const run of awaitingGuards.dataProcessing!.runs) {
  run.calculationPrecision = { period: 7, squared: 8 };
  run.result = null; run.batchAttempts = [];
  Object.assign(run.answers.period, { draftRaw: '', status: 'unresolved', feedback: null,
    attempts: [], attemptCount: 0, resolution: null });
}
const restoredGuards = normalizePistonOscillationFreeSession(awaitingGuards).dataProcessing!;
assert.equal(restoredGuards.precisionNotice, 'more-digits');
assert.equal(restoredGuards.calculationSession, null);
for (const [index, run] of restoredGuards.runs.entries()) {
  assert.deepEqual(run.calculationPrecision, { period: 7, squared: 8 });
  assert.deepEqual(run.selection, awaitingGuards.dataProcessing!.runs[index].selection);
  assert.equal(run.answers.period.status, 'unresolved');
  assert.equal(run.result, null);
  assert.equal(run.answers.t1.status, awaitingGuards.dataProcessing!.runs[index].answers.t1.status);
}
const uncertaintyStore = new InMemoryWorkbenchPersistenceV3GenerationStore();
const uncertaintyFile = { ...createDefaultHeatCapacityPistonOscillationFile(1), pistonOscillationFreeSession: detailedSession };
await commitWorkbenchPersistenceV3ProductionSnapshot({
  store: uncertaintyStore, namespace: 'piston-uncertainty-course', generationId: 'uncertainty-generation', capturedAtMs: 5000,
  snapshot: { files: [uncertaintyFile], closedFiles: [], activeFileId: uncertaintyFile.id, selectedPanel: 'preview' },
});
const uncertaintyWorkspace = await restoreWorkbenchPersistenceV3ProductionWorkspace(uncertaintyStore, 'piston-uncertainty-course');
const restoredUncertaintyFile = uncertaintyWorkspace?.files[0];
assert.equal(restoredUncertaintyFile?.kind, 'heatCapacityPistonOscillation');
if (restoredUncertaintyFile?.kind === 'heatCapacityPistonOscillation') {
  assert.deepEqual(restoredUncertaintyFile.pistonOscillationFreeSession.dataProcessing?.calculationSession?.uncertainty,
    detailedSession.dataProcessing?.calculationSession?.uncertainty, 'production persistence must retain the complete uncertainty course');
}

detailedSession = send(detailedSession, { type: 'pause' });
detailedSession = send(detailedSession, { type: 'start' });
assert.deepEqual(detailedSession.dataProcessing, completedBeforeRestart);

const settledReference = getPistonOscillationSettlingStateAtProgress(60, 1);
const restarted = normalizePistonOscillationFreeSession({
  ...detailedSession,
  instrumentState: {
    ...detailedSession.instrumentState,
    hoseState: 'connected',
    nominalHeightMm: 60,
    equilibriumHeightMm: settledReference.pistonHeightM * 1_000,
    pistonOffsetMm: -12,
    lockingScrewProgress: 0,
    pistonPhase: 'rebounding',
    thermodynamicState: {
      ...settledReference,
      velocityMPerS: 2.38,
    },
  },
});
assert.equal(restarted.instrumentState.pistonPhase, 'idle');
assert.equal(restarted.instrumentState.pistonOffsetMm, 0);
assert.equal(restarted.instrumentState.thermodynamicState.velocityMPerS, 0);
assert.deepEqual(restarted.experimentPlan, detailedSession.experimentPlan);
assert.deepEqual(restarted.savedMeasurements, detailedSession.savedMeasurements);
assert.deepEqual(restarted.dataProcessing, detailedSession.dataProcessing);

const reset = send(restarted, { type: 'reset' });
assert.equal(reset.status, 'active');
assert.equal(reset.experimentPlan, null);
assert.equal(reset.savedMeasurements.length, 0);
assert.equal(reset.dataProcessing, null);

for (const scenario of [
  { heights: [80, 65, 50, 30], custom: [65] },
  { heights: [80, 70, 55, 40, 30], custom: [55] },
  { heights: [80, 70, 65, 50, 40, 30], custom: [65] },
] as const) {
  const collected = createCollectedSession(scenario.heights, scenario.custom);
  let session = collected.session;
  for (let runIndex = 0; runIndex < scenario.heights.length; runIndex += 1) {
    session = resolveRunByReveal(session, collected.records, runIndex);
    if (runIndex < scenario.heights.length - 1) {
      session = send(session, { type: 'advancePeriodRun' });
    }
  }
  assert.equal(session.dataProcessing?.status, 'calculation-ready');
  session = completeFitAndCalculation(session);
  assert.equal(session.dataProcessing?.runs.length, scenario.heights.length);
  assert.equal(session.dataProcessing?.status, 'completed');
  assert.deepEqual(
    session.experimentPlan?.targets
      .filter((target) => target.source === 'custom')
      .map((target) => target.heightMm),
    scenario.custom,
  );
}

console.log('pistonOscillationFreeEndToEnd tests passed');

// Recognised 19-question progress is explicitly invalidated; measurements survive.
const legacyTeaching = structuredClone(detailedSession) as any;
legacyTeaching.dataProcessing.uncertaintyCourseVersion = 'piston-free-uncertainty-v1';
const legacyCourse = legacyTeaching.dataProcessing.calculationSession.uncertainty;
legacyCourse.version = legacyCourse.profile.version = 'piston-free-uncertainty-v1';
delete legacyCourse.profile.pressureStandardPa;
Object.assign(legacyCourse.profile, { pressureExpandedPa: 200, pressureCoverage: 2, pressureStepPa: 10 });
for (const field of ['pressureCalibration', 'pressureReadout', 'pressure', 'heightScale', 'timeScale', 'heightReadout', 'slopeReadout', 'slopeSupplement', 'slopeB']) {
  legacyCourse.answers[field] = { draft: '', status: 'unresolved', feedback: null, attempts: [] };
}
const restoredTeaching = normalizePistonOscillationFreeSession(legacyTeaching);
assert.equal(restoredTeaching.dataProcessing!.precisionNotice, 'teaching-updated');
assert.equal(restoredTeaching.dataProcessing!.calculationSession, null);
assert.deepEqual(restoredTeaching.savedMeasurements, legacyTeaching.savedMeasurements);
const { projectWorkbenchPersistenceV3File } = await import('../../src/features/workbench/persistenceV3/projection.ts');
const { encodeWorkbenchPersistenceV3FileProjection, decodeWorkbenchPersistenceV3FileRecord } = await import('../../src/features/workbench/persistenceV3/codecRegistry.ts');
const projected = projectWorkbenchPersistenceV3File(uncertaintyFile);
assert.ok(projected.ok);
if (!projected.ok) throw new Error('projection failed');
const encoded = encodeWorkbenchPersistenceV3FileProjection(projected.value);
assert.ok(encoded.ok);
if (!encoded.ok) throw new Error('encoding failed');
const legacyRecord = structuredClone(encoded.value);
(legacyRecord.projection.fields.authoritative as any).freeSession = legacyTeaching;
const migratedTeaching = decodeWorkbenchPersistenceV3FileRecord(legacyRecord);
assert.ok(migratedTeaching.ok, JSON.stringify(migratedTeaching));

// The ten-question course's redundant metadata can be removed without losing answers.
const redundantRecord = structuredClone(encoded.value);
const redundantSession = (redundantRecord.projection.fields.authoritative as any).freeSession;
const redundantProcessing = redundantSession.dataProcessing;
const redundantCourse = redundantProcessing.calculationSession.uncertainty;
const obsoleteProfile = { pressureExpandedPa: 200, pressureCoverage: 2, pressureStepPa: 10 };
const obsoleteDigits = { pressureCalibration: 3, pressureReadout: 3 };
Object.assign(redundantCourse.profile, obsoleteProfile);
Object.assign(redundantProcessing.linearFitResult.precisionPlan.digits, obsoleteDigits);
const fingerprint = JSON.parse(redundantCourse.fingerprint);
Object.assign(fingerprint.profile, obsoleteProfile);
Object.assign(fingerprint.precision.digits, obsoleteDigits);
redundantCourse.fingerprint = JSON.stringify(fingerprint);
const answersBeforeCleanup = structuredClone(redundantCourse.answers);
const cleanedTeaching = normalizePistonOscillationFreeSession(redundantSession);
assert.deepEqual(cleanedTeaching.dataProcessing!.calculationSession!.uncertainty!.answers, answersBeforeCleanup);
assert.deepEqual(cleanedTeaching.savedMeasurements, redundantSession.savedMeasurements);
assert.ok(!('pressureExpandedPa' in cleanedTeaching.dataProcessing!.calculationSession!.uncertainty!.profile));
assert.ok(!('pressureCalibration' in cleanedTeaching.dataProcessing!.linearFitResult!.precisionPlan!.digits));
assert.ok(decodeWorkbenchPersistenceV3FileRecord(redundantRecord).ok, 'recognised metadata cleanup survives production restore');
for (const mutate of [
  (v: any) => { v.dataProcessing.calculationSession.uncertainty.profile.pressureExpandedPa = 999; },
  (v: any) => { v.dataProcessing.unknownAuthority = true; },
  (v: any) => { v.dataProcessing.calculationSession.uncertainty.profile.unknownSource = 42; },
  (v: any) => { v.dataProcessing.calculationSession.uncertainty.answers.mass.draft = '999'; },
]) {
  const broken = structuredClone(redundantRecord);
  mutate((broken.projection.fields.authoritative as any).freeSession);
  assert.equal(decodeWorkbenchPersistenceV3FileRecord(broken).ok, false, 'cleanup must not hide changed authority or invalid answers');
}
for (const mutate of [
  (v: any) => { v.dataProcessing.unknownAuthority = true; },
  (v: any) => { v.dataProcessing.calculationSession.uncertainty.profile.pressureExpandedPa = 999; },
  (v: any) => { v.dataProcessing.uncertaintyCourseVersion = 'piston-free-uncertainty-v999'; },
]) {
  const broken = structuredClone(legacyRecord);
  mutate((broken.projection.fields.authoritative as any).freeSession);
  assert.equal(decodeWorkbenchPersistenceV3FileRecord(broken).ok, false);
}
