import assert from 'node:assert/strict';
import {
  createDefaultPistonOscillationFreeSession,
  createPistonOscillationFreeExperimentPlan,
  getPistonOscillationFreeCurrentTargetHeightMm,
  isValidPistonOscillationFreeCustomHeightMm,
  isPistonOscillationFreePlanComplete,
  isValidPistonOscillationFreeExperimentPlan,
  normalizePistonOscillationFreeSession,
  transitionPistonOscillationFreeSession,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  createPistonOscillationRawMeasurementRecord,
  type PistonOscillationRawMeasurementRecord,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationAdiabaticStateFromReference,
  createPistonOscillationAtmosphericLockedState,
  getPistonOscillationSettlingStateAtProgress,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from './helpers/pistonOscillationCurrentRecordTestFactory.ts';

const createMeasurement = (
  measurementIndex: number,
  targetHeightMm: number,
  capturedAtMs: number,
): PistonOscillationRawMeasurementRecord => {
  const sampleRateHz = 1000;
  const recordedDurationS = 0.5;
  const samples = Array.from(
    { length: recordedDurationS * sampleRateHz + 1 },
    (_, sampleIndex) => ({
      sampleIndex,
      timeS: sampleIndex / sampleRateHz,
      absolutePressureKpa: Math.trunc((
        101.32
          + 4 * Math.exp(-2.4 * sampleIndex / sampleRateHz)
            * Math.cos(2 * Math.PI * sampleIndex / sampleRateHz / 0.04)
      ) * 100) / 100,
    }),
  );
  const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
    lockedHeightMm: targetHeightMm,
    sampleRateHz,
    samples,
  });
  return createPistonOscillationRawMeasurementRecord({
    recordId: `free-${measurementIndex}-${capturedAtMs}`,
    capturedAtMs,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm: artifacts.confirmedHeightMm,
    sampleRateHz,
    triggerThresholdKpa: 120,
    recordedDurationS,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
    samples,
    pressOperationEvidence: artifacts.pressOperationEvidence,
    sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
    physicsSnapshot: artifacts.physicsSnapshot,
  });
};

const baseline = createDefaultPistonOscillationFreeSession();
assert.equal(baseline.status, 'idle');
assert.equal(baseline.experimentPlan, null);
assert.equal(baseline.sampleRateHz, null);
assert.equal(baseline.triggerThresholdKpa, null);
assert.equal(getPistonOscillationFreeCurrentTargetHeightMm(baseline), null);
assert.equal(isPistonOscillationFreePlanComplete(baseline), false);

assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 70, 60]), true);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 60, 30]), true);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 70]), false);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 70, 60, 50, 40, 30, 20]), false);
assert.equal(isValidPistonOscillationFreeExperimentPlan([60, 70, 80]), true);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 70, 70]), false);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 65, 29]), true);
assert.equal(isValidPistonOscillationFreeCustomHeightMm(0), false);
assert.equal(isValidPistonOscillationFreeCustomHeightMm(9), false);
assert.equal(isValidPistonOscillationFreeCustomHeightMm(10), true);
assert.equal(isValidPistonOscillationFreeCustomHeightMm(80), true);
assert.equal(isValidPistonOscillationFreeCustomHeightMm(80.5), false);
assert.equal(isValidPistonOscillationFreeCustomHeightMm(-1), false);
assert.throws(() => createPistonOscillationFreeExperimentPlan([80, 70]));

const customPlan = createPistonOscillationFreeExperimentPlan([29, 80, 65], {
  planId: 'custom-plan',
  customHeightCandidatesMm: [65, 29, 12],
});
assert.deepEqual(customPlan.targetHeightsMm, [80, 65, 29]);
assert.deepEqual(customPlan.customHeightCandidatesMm, [65, 29, 12]);
assert.deepEqual(
  customPlan.targets.map(({ heightMm, source }) => ({ heightMm, source })),
  [
    { heightMm: 80, source: 'system' },
    { heightMm: 65, source: 'custom' },
    { heightMm: 29, source: 'custom' },
  ],
);

const active = transitionPistonOscillationFreeSession(baseline, {
  type: 'start',
  nowMs: 100,
});
assert.equal(active.status, 'active');
assert.equal(active.startedAtMs, 100);
assert.equal(active.audit.length, 1);
assert.equal(active.audit[0]?.type, 'session-started');

const configured = transitionPistonOscillationFreeSession(active, {
  type: 'setPlan',
  targetHeightsMm: [80, 60, 30],
  nowMs: 110,
});
assert.deepEqual(configured.experimentPlan.targetHeightsMm, [80, 60, 30]);
assert.equal(configured.audit.at(-1)?.type, 'plan-updated');

const withSampleRate = transitionPistonOscillationFreeSession(configured, {
  type: 'setAcquisitionSetting',
  field: 'sampleRateHz',
  value: 1000,
  nowMs: 115,
});
const withAcquisitionSettings = transitionPistonOscillationFreeSession(withSampleRate, {
  type: 'setAcquisitionSetting',
  field: 'triggerThresholdKpa',
  value: 120.1,
  nowMs: 116,
});
assert.equal(withAcquisitionSettings.sampleRateHz, 1000);
assert.equal(withAcquisitionSettings.triggerThresholdKpa, 120.1);
assert.equal(
  transitionPistonOscillationFreeSession(withAcquisitionSettings, {
    type: 'setAcquisitionSetting',
    field: 'triggerThresholdKpa',
    value: 120.25,
    nowMs: 117,
  }),
  withAcquisitionSettings,
  'the persisted model should reject trigger values that do not follow the 0.1 kPa step',
);

const withPower = transitionPistonOscillationFreeSession(withAcquisitionSettings, {
  type: 'setPower',
  powerOn: true,
  nowMs: 120,
});
assert.equal(withPower.powerOn, true);
assert.deepEqual(withPower.audit.at(-1)?.payload, { powerOn: true });

const withOperation = transitionPistonOscillationFreeSession(withPower, {
  type: 'observeOperation',
  operation: 'releasePiston',
  nowMs: 130,
  payload: {
    releaseGapMs: 18,
    firstReleasedHand: 'left',
  },
});
assert.equal(withOperation.audit.at(-1)?.operation, 'releasePiston');
assert.deepEqual(withOperation.audit.at(-1)?.payload, {
  releaseGapMs: 18,
  firstReleasedHand: 'left',
});

const withInstrumentState = transitionPistonOscillationFreeSession(withOperation, {
  type: 'setInstrumentState',
  nowMs: 135,
  instrumentState: {
    focusMode: 'pistonFocus',
    hoseState: 'connected',
    equilibriumHeightMm: 60,
    pistonOffsetMm: -8,
    lockingScrewProgress: 0.75,
    heightAdjustmentStage: 'lockingHeight',
    pistonPhase: 'holding',
  },
});
assert.equal(withInstrumentState.instrumentState.focusMode, 'pistonFocus');
assert.equal(withInstrumentState.instrumentState.equilibriumHeightMm, 60);
assert.equal(withInstrumentState.instrumentState.pistonOffsetMm, -8);
assert.equal(withInstrumentState.instrumentState.nominalHeightMm, 52);
assert.equal(
  withInstrumentState.instrumentState.thermodynamicState.phase,
  'sealed-locked-atmospheric',
);

const settledState80 = getPistonOscillationSettlingStateAtProgress(80, 1);
const withSettledPhysicalState = transitionPistonOscillationFreeSession(withOperation, {
  type: 'setInstrumentState',
  nowMs: 136,
  instrumentState: {
    focusMode: 'pistonFocus',
    hoseState: 'connected',
    nominalHeightMm: 80,
    equilibriumHeightMm: settledState80.pistonHeightM * 1_000,
    pistonOffsetMm: 0,
    lockingScrewProgress: 0,
    heightAdjustmentStage: 'lockingHeight',
    pistonPhase: 'idle',
    thermodynamicState: settledState80,
  },
});
const restoredSettledPhysicalState = normalizePistonOscillationFreeSession(
  JSON.parse(JSON.stringify(withSettledPhysicalState)),
);
assert.equal(restoredSettledPhysicalState.instrumentState.nominalHeightMm, 80);
assert.equal(
  restoredSettledPhysicalState.instrumentState.thermodynamicState.phase,
  'sealed-loaded',
);
assert.ok(Math.abs(
  restoredSettledPhysicalState.instrumentState.equilibriumHeightMm
    - settledState80.pistonHeightM * 1_000,
) < 1e-10);

const paused = transitionPistonOscillationFreeSession(withInstrumentState, {
  type: 'pause',
  nowMs: 140,
});
assert.equal(paused.status, 'paused');
assert.equal(paused.powerOn, false);
assert.equal(paused.instrumentState.focusMode, 'pistonFocus');
assert.equal(paused.instrumentState.pistonPhase, 'idle');
assert.equal(paused.audit.at(-1)?.type, 'session-paused');

const resumed = transitionPistonOscillationFreeSession(paused, {
  type: 'start',
  nowMs: 150,
});
assert.equal(resumed.status, 'active');
assert.equal(resumed.startedAtMs, 100);
assert.equal(resumed.audit.at(-1)?.type, 'session-resumed');

const repaired = normalizePistonOscillationFreeSession({
  ...resumed,
  status: 'active',
  experimentPlan: { targetHeightsMm: [30, 40, 50] },
  sampleRateHz: 0,
  triggerThresholdKpa: Number.NaN,
  audit: [
    ...resumed.audit,
    {
      sequence: 999,
      eventId: 'invalid-event',
      occurredAtMs: 160,
      type: 'unknown',
      measurementIndex: null,
      targetHeightMm: null,
      operation: null,
      payload: {},
    },
  ],
});
assert.deepEqual(
  repaired.experimentPlan?.targetHeightsMm,
  [50, 40, 30],
);
assert.equal(repaired.sampleRateHz, null);
assert.equal(repaired.triggerThresholdKpa, null);
assert.equal(repaired.audit.some((event) => event.eventId === 'invalid-event'), false);

const reset = transitionPistonOscillationFreeSession(resumed, {
  type: 'reset',
  nowMs: 200,
});
assert.equal(reset.status, 'active');
assert.equal(reset.startedAtMs, 200);
assert.equal(reset.experimentPlan, null);
assert.equal(reset.sampleRateHz, null);
assert.equal(reset.triggerThresholdKpa, null);
assert.equal(reset.audit.length, 1);
assert.equal(reset.audit[0]?.type, 'session-reset');

let collection = transitionPistonOscillationFreeSession(baseline, {
  type: 'start',
  nowMs: 300,
});
collection = transitionPistonOscillationFreeSession(collection, {
  type: 'setPlan',
  targetHeightsMm: [80, 70, 60],
  nowMs: 301,
});
const firstCandidate = createMeasurement(0, 80, 310);
collection = transitionPistonOscillationFreeSession(collection, {
  type: 'freezeAcquisition',
  measurement: firstCandidate,
  nowMs: 310,
});
assert.equal(collection.acquisitionCandidate?.recordId, firstCandidate.recordId);
collection = transitionPistonOscillationFreeSession(collection, {
  type: 'pause',
  nowMs: 320,
});
assert.equal(collection.acquisitionCandidate?.recordId, firstCandidate.recordId);
collection = transitionPistonOscillationFreeSession(collection, {
  type: 'start',
  nowMs: 330,
});
collection = transitionPistonOscillationFreeSession(collection, {
  type: 'clearAcquisition',
  nowMs: 331,
});
assert.equal(collection.acquisitionCandidate, null);
assert.equal(collection.excludedAttempts.length, 1);
assert.equal(collection.excludedAttempts[0]?.reason, 'redo');
const firstRetry = createMeasurement(0, 80, 335);
collection = transitionPistonOscillationFreeSession(collection, {
  type: 'freezeAcquisition',
  measurement: firstRetry,
  nowMs: 335,
});
collection = transitionPistonOscillationFreeSession(collection, {
  type: 'saveMeasurement',
  measurement: firstRetry,
  nowMs: 340,
});
assert.equal(collection.measurementIndex, 1);
assert.equal(collection.acquisitionCandidate, null);
assert.equal(collection.dataProcessing, null);

for (const [measurementIndex, targetHeightMm] of [[1, 70], [2, 60]] as const) {
  collection = transitionPistonOscillationFreeSession(collection, {
    type: 'saveMeasurement',
    measurement: createMeasurement(measurementIndex, targetHeightMm, 350 + measurementIndex),
    nowMs: 350 + measurementIndex,
  });
}
assert.equal(collection.measurementIndex, 3);
assert.equal(collection.savedMeasurements.length, 3);
assert.equal(collection.dataProcessing?.status, 'period-processing');
assert.equal(collection.dataProcessing?.runs.length, 3);

collection = transitionPistonOscillationFreeSession(collection, {
  type: 'deleteMeasurement',
  measurementIndex: 1,
  nowMs: 360,
});
assert.equal(collection.measurementIndex, 1);
assert.equal(collection.savedMeasurements.length, 2);
assert.equal(collection.dataProcessing, null);
assert.equal(collection.excludedAttempts.at(-1)?.reason, 'deleted');
assert.equal(collection.audit.at(-1)?.type, 'measurement-deleted');

collection = transitionPistonOscillationFreeSession(collection, {
  type: 'saveMeasurement',
  measurement: createMeasurement(1, 70, 370),
  nowMs: 370,
});
assert.equal(collection.measurementIndex, 3);
assert.equal(collection.savedMeasurements.length, 3);
assert.equal(collection.dataProcessing?.status, 'period-processing');

const restoredCollection = normalizePistonOscillationFreeSession(collection);
assert.equal(restoredCollection.measurementIndex, 3);
assert.equal(restoredCollection.dataProcessing?.runs.length, 3);

const resolveFreePeriodRunByReveal = (
  source: typeof collection,
  runIndex: number,
  nowMs: number,
) => {
  let next = transitionPistonOscillationFreeSession(source, {
    type: 'selectPeriodRange',
    runIndex,
    rangeStartTimeS: 0.015,
    rangeEndTimeS: 0.185,
    nowMs,
  });
  assert.equal(next.dataProcessing?.runs[runIndex].selection?.issue, null);
  next = transitionPistonOscillationFreeSession(next, {
    type: 'submitPeriodEndpoints',
    runIndex,
    nowMs: nowMs + 1,
  });
  next = transitionPistonOscillationFreeSession(next, {
    type: 'revealPeriodAnswer',
    runIndex,
    field: 't1',
    nowMs: nowMs + 2,
  });
  next = transitionPistonOscillationFreeSession(next, {
    type: 'revealPeriodAnswer',
    runIndex,
    field: 't2',
    nowMs: nowMs + 3,
  });
  next = transitionPistonOscillationFreeSession(next, {
    type: 'submitPeriod',
    runIndex,
    nowMs: nowMs + 4,
  });
  next = transitionPistonOscillationFreeSession(next, {
    type: 'revealPeriodAnswer',
    runIndex,
    field: 'period',
    nowMs: nowMs + 5,
  });
  assert.ok(next.dataProcessing?.runs[runIndex].result);
  return next;
};

let automaticCalculation = collection;
automaticCalculation = resolveFreePeriodRunByReveal(automaticCalculation, 0, 400);
assert.equal(automaticCalculation.dataProcessing?.status, 'period-processing');
automaticCalculation = transitionPistonOscillationFreeSession(automaticCalculation, {
  type: 'advancePeriodRun',
  nowMs: 410,
});
automaticCalculation = resolveFreePeriodRunByReveal(automaticCalculation, 1, 420);
automaticCalculation = transitionPistonOscillationFreeSession(automaticCalculation, {
  type: 'advancePeriodRun',
  nowMs: 430,
});
automaticCalculation = resolveFreePeriodRunByReveal(automaticCalculation, 2, 440);
assert.equal(
  automaticCalculation.dataProcessing?.status,
  'calculation-ready',
  'resolving the final saved run should enter calculation without another Next action',
);

const stableLoadedState = getPistonOscillationSettlingStateAtProgress(80, 1);
const transientLoadedState = createPistonOscillationAdiabaticStateFromReference(
  stableLoadedState,
  stableLoadedState.pistonHeightM * 1_000 - 12,
  2_380,
);
for (const pistonPhase of [
  'ready',
  'pressing',
  'adjustingHeight',
  'holding',
  'falling',
  'rebounding',
] as const) {
  const restoredAfterTransientMotion = normalizePistonOscillationFreeSession({
    ...automaticCalculation,
    instrumentState: {
      ...automaticCalculation.instrumentState,
      hoseState: 'connected',
      nominalHeightMm: 80,
      equilibriumHeightMm: stableLoadedState.pistonHeightM * 1_000,
      pistonOffsetMm: -12,
      lockingScrewProgress: 0,
      pistonPhase,
      thermodynamicState: transientLoadedState,
    },
  });
  assert.equal(restoredAfterTransientMotion.instrumentState.pistonPhase, 'idle');
  assert.equal(restoredAfterTransientMotion.instrumentState.pistonOffsetMm, 0);
  assert.equal(restoredAfterTransientMotion.instrumentState.thermodynamicState.velocityMPerS, 0);
  assert.ok(Math.abs(
    restoredAfterTransientMotion.instrumentState.equilibriumHeightMm
      - stableLoadedState.pistonHeightM * 1_000,
  ) < 1e-9);
  assert.deepEqual(
    restoredAfterTransientMotion.experimentPlan,
    automaticCalculation.experimentPlan,
  );
  assert.deepEqual(
    restoredAfterTransientMotion.savedMeasurements,
    automaticCalculation.savedMeasurements,
  );
  assert.deepEqual(
    restoredAfterTransientMotion.dataProcessing,
    automaticCalculation.dataProcessing,
  );
  assert.deepEqual(restoredAfterTransientMotion.audit, automaticCalculation.audit);
}

const restorePhysicalCondition = (
  hoseState: 'connected' | 'disconnected',
  lockingScrewProgress: number,
) => normalizePistonOscillationFreeSession({
  ...automaticCalculation,
  instrumentState: {
    ...automaticCalculation.instrumentState,
    hoseState,
    nominalHeightMm: 55,
    equilibriumHeightMm: 55,
    pistonOffsetMm: -8,
    lockingScrewProgress,
    pistonPhase: 'holding',
    thermodynamicState: createPistonOscillationAtmosphericLockedState(
      47,
      {},
      hoseState === 'connected' ? 'sealed-locked-atmospheric' : 'vented',
    ),
  },
}).instrumentState;

const disconnectedLooseRestore = restorePhysicalCondition('disconnected', 0);
assert.equal(disconnectedLooseRestore.equilibriumHeightMm, 0);
assert.equal(disconnectedLooseRestore.thermodynamicState.phase, 'vented');
const disconnectedLockedRestore = restorePhysicalCondition('disconnected', 0.75);
assert.equal(disconnectedLockedRestore.equilibriumHeightMm, 47);
assert.equal(disconnectedLockedRestore.thermodynamicState.phase, 'vented');
const connectedLockedRestore = restorePhysicalCondition('connected', 0.75);
assert.equal(connectedLockedRestore.equilibriumHeightMm, 47);
assert.equal(connectedLockedRestore.thermodynamicState.velocityMPerS, 0);
const connectedLooseRestore = restorePhysicalCondition('connected', 0);
assert.ok(connectedLooseRestore.equilibriumHeightMm < 47);
assert.equal(connectedLooseRestore.thermodynamicState.phase, 'sealed-loaded');
assert.equal(connectedLooseRestore.thermodynamicState.velocityMPerS, 0);

console.log('pistonOscillationFreeWorkflowModel tests passed');
