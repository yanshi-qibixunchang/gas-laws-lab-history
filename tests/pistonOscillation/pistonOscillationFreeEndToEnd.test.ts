import assert from 'node:assert/strict';
import {
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  createPistonOscillationSensorObservationSnapshot,
  findPistonOscillationExtrema,
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
  getPistonOscillationSettlingStateAtProgress,
  simulatePistonOscillationRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationSensorObservationSeries,
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
  const trajectory = simulatePistonOscillationRelease({
    lockedHeightMm: targetHeightMm,
    initialDisplacementMm: -12,
  }, {
    sensorSampleRateHz: 1_000,
    trajectoryDurationS: 0.5,
  });
  const observations = createPistonOscillationSensorObservationSeries(
    trajectory.samples,
    trajectory.sampleRateHz,
  );
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
    sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
      sampleRateHz: observations.sampleRateHz,
      triggerSourceSampleIndex: 0,
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
  const extrema = findPistonOscillationExtrema(records[runIndex]!.samples);
  assert.ok(extrema.length >= 9);
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
  next = send(next, { type: 'submitPeriodEndpoints', runIndex });
  assert.equal(next.dataProcessing?.runs[runIndex].answers.t1.attempts.at(-1)?.draftRaw, '9.999');
  next = send(next, { type: 'continuePeriodAnswer', runIndex, field: 't1' });
  next = send(next, { type: 'continuePeriodAnswer', runIndex, field: 't2' });
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
  next = send(next, { type: 'submitPeriodEndpoints', runIndex });
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 'period', value: '9.999' });
  next = send(next, { type: 'submitPeriod', runIndex });
  assert.equal(next.dataProcessing?.runs[runIndex].answers.period.attempts.at(-1)?.draftRaw, '9.999');
  next = send(next, { type: 'continuePeriodAnswer', runIndex, field: 'period' });
  const period = next.dataProcessing!.runs[runIndex].answers.period.expectedValue!;
  next = send(next, {
    type: 'editPeriodAnswer',
    runIndex,
    field: 'period',
    value: formatPistonOscillationPeriod(period),
  });
  next = send(next, { type: 'submitPeriod', runIndex });
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
  next = send(next, { type: 'submitPeriodEndpoints', runIndex });
  next = send(next, { type: 'revealPeriodAnswer', runIndex, field: 't1' });
  next = send(next, { type: 'revealPeriodAnswer', runIndex, field: 't2' });
  next = send(next, { type: 'editPeriodAnswer', runIndex, field: 'period', value: '-1' });
  next = send(next, { type: 'submitPeriod', runIndex });
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
  next = send(next, { type: 'submitCalculationField', field: 'area' });
  next = send(next, { type: 'continueCalculationAnswer', field: 'area' });
  next = send(next, {
    type: 'editCalculationAnswer',
    field: 'area',
    value: formatPistonOscillationCalculationAnswer('area', areaExpected),
  });
  next = send(next, { type: 'submitCalculationField', field: 'area' });
  for (const field of ['gamma', 'relativeError'] as const) {
    next = send(next, { type: 'editCalculationAnswer', field, value: '999' });
    next = send(next, { type: 'submitCalculationField', field });
    next = send(next, { type: 'revealCalculationAnswer', field });
  }
  assert.equal(next.dataProcessing?.calculationSession?.status, 'ready-to-exit');
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
  'a 12 mm third-run press must keep its physical rebound peak above 2 m/s',
);
assert.ok(detailed.records.every((record) => record.samples.length === 501));

let detailedSession = detailed.session;
const firstExtrema = findPistonOscillationExtrema(detailed.records[0]!.samples);
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
  rangeStartTimeS: firstExtrema[2]!.timeS - 0.0004,
  rangeEndTimeS: firstExtrema[8]!.timeS + 0.0004,
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
