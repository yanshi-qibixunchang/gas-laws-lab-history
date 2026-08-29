import assert from 'node:assert/strict';
import {
  createDefaultPistonOscillationGuideSession,
  getPistonOscillationGuideActionGuard,
  getPistonOscillationGuideEventGuard,
  getPistonOscillationGuideHeightAdjustmentStep,
  normalizePistonOscillationGuideSession,
  PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S,
  PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM,
  PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS,
  transitionPistonOscillationGuideSession,
  type PistonOscillationGuideEvent,
  type PistonOscillationGuideSession,
} from '../../src/domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  createPistonOscillationRawMeasurementRecord,
  findPistonOscillationExtrema,
  formatPistonOscillationEndpointTime,
  formatPistonOscillationPeriod,
  type PistonOscillationRawMeasurementRecord,
  type PistonOscillationRawSample,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationLoadedEquilibriumState,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from './helpers/pistonOscillationCurrentRecordTestFactory.ts';
import {
  transitionPistonOscillationGuideAcquisitionSession,
  type PistonOscillationGuideWorkflowAcquisitionEvent,
} from '../../src/features/pistonOscillation/pistonOscillationGuideAcquisitionBridge.ts';
import {
  getPistonOscillationGuidePrimaryControlState,
} from '../../src/features/pistonOscillation/pistonOscillationGuidePrimaryControl.ts';

const transition = (
  session: PistonOscillationGuideSession,
  event: PistonOscillationGuideEvent,
) => transitionPistonOscillationGuideSession(session, event);

const acceptAcquisitionTransition = (
  session: PistonOscillationGuideSession,
  event: PistonOscillationGuideWorkflowAcquisitionEvent,
  nowMs: number,
) => {
  const nextSession = transitionPistonOscillationGuideAcquisitionSession(
    session,
    event,
    nowMs,
  );
  assert.notEqual(nextSession, null, `${event.type} should be accepted at ${session.step}`);
  return nextSession!;
};

const createCandidate = (
  measurementIndex: 0 | 1 | 2,
  recordedDurationS: number,
  samples: PistonOscillationRawSample[],
  capturedAtMs: number,
  lockedHeightMm: number = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[measurementIndex],
): PistonOscillationRawMeasurementRecord => {
  const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[measurementIndex];
  const sampleRateHz = 1000;
  const intervalCount = Math.round(recordedDurationS * sampleRateHz);
  const baselinePressureKpa = samples.at(-1)?.absolutePressureKpa ?? 101.32;
  const initialPressureKpa = samples[0]?.absolutePressureKpa ?? baselinePressureKpa + 4;
  const amplitudeKpa = Math.max(3, Math.abs(initialPressureKpa - baselinePressureKpa));
  const periodS = [0.04, 0.038, 0.036][measurementIndex]!;
  const formalSamples: PistonOscillationRawSample[] = Array.from(
    { length: intervalCount + 1 },
    (_, sampleIndex) => {
      const timeS = sampleIndex / sampleRateHz;
      return {
        sampleIndex,
        timeS,
        absolutePressureKpa: Math.trunc((
          baselinePressureKpa
            + amplitudeKpa * Math.exp(-2.4 * timeS)
              * Math.cos(2 * Math.PI * timeS / periodS)
        ) * 100) / 100,
      };
    },
  );
  const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
    lockedHeightMm,
    sampleRateHz,
    samples: formalSamples,
  });
  return createPistonOscillationRawMeasurementRecord({
    recordId: `guide-${measurementIndex}-${capturedAtMs}`,
    capturedAtMs,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm: artifacts.confirmedHeightMm,
    sampleRateHz,
    triggerThresholdKpa: 120,
    recordedDurationS,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
    samples: formalSamples,
    pressOperationEvidence: artifacts.pressOperationEvidence,
    sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
    physicsSnapshot: artifacts.physicsSnapshot,
  });
};

assert.deepEqual(PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM, [80, 70, 60]);
assert.equal(PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS, 3);

const idle = createDefaultPistonOscillationGuideSession();
assert.equal(idle.status, 'idle');
assert.equal(idle.step, 'powerOn');
assert.equal(idle.powerOn, false);
assert.deepEqual(idle.parameterDrafts, {
  sampleRateHz: '',
  triggerThresholdKpa: '',
});

let session = transition(idle, { type: 'start', nowMs: 100 });
assert.equal(session.status, 'active');
assert.equal(session.startedAtMs, 100);
assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'togglePower'),
  { allowed: true, reason: 'allowed' },
);
assert.deepEqual(
  getPistonOscillationGuideEventGuard(session, {
    type: 'setPower',
    powerOn: false,
    nowMs: 100,
  }),
  { allowed: false, reason: 'wrongStep' },
  'the initial power step must only allow switching the instrument on',
);
assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'editParameters'),
  { allowed: false, reason: 'powerRequired' },
);
assert.deepEqual(
  getPistonOscillationGuideEventGuard(session, {
    type: 'editParameter',
    field: 'sampleRateHz',
    value: '1000',
    nowMs: 101,
  }),
  { allowed: false, reason: 'wrongStep' },
);
session = transition(session, { type: 'setPower', powerOn: true, nowMs: 105 });
assert.equal(session.powerOn, true);
assert.equal(session.step, 'parameterSetup');
assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'togglePower'),
  { allowed: false, reason: 'wrongStep' },
  'power must not be reversible outside the two dedicated Guide steps',
);
const prematurePowerOffEvent = { type: 'setPower', powerOn: false, nowMs: 106 } as const;
assert.deepEqual(
  getPistonOscillationGuideEventGuard(session, prematurePowerOffEvent),
  { allowed: false, reason: 'wrongStep' },
);
assert.equal(
  transition(session, prematurePowerOffEvent),
  session,
  'a rejected power press must preserve the complete Guide session by identity',
);

const wrongRateDraft = transition(session, {
  type: 'editParameter',
  field: 'sampleRateHz',
  value: '900',
  nowMs: 110,
});
const wrongRate = transition(wrongRateDraft, {
  type: 'commitParameter',
  field: 'sampleRateHz',
  nowMs: 120,
});
assert.equal(wrongRate.parameterStatus.sampleRateHz, 'invalid');
assert.equal(wrongRate.feedbackCode, 'sampleRateInvalid');
assert.equal(wrongRate.step, 'parameterSetup');

session = transition(
  transition(wrongRate, {
    type: 'editParameter',
    field: 'sampleRateHz',
    value: '1000',
    nowMs: 130,
  }),
  { type: 'commitParameter', field: 'sampleRateHz', nowMs: 140 },
);
assert.equal(session.parameterStatus.sampleRateHz, 'valid');
assert.equal(session.step, 'parameterSetup');

session = transition(
  transition(session, {
    type: 'editParameter',
    field: 'triggerThresholdKpa',
    value: '120',
    nowMs: 150,
  }),
  { type: 'commitParameter', field: 'triggerThresholdKpa', nowMs: 160 },
);
assert.equal(session.parametersLocked, true);
assert.equal(session.step, 'firstHeightAdjustment');

const lockedEdit = transition(session, {
  type: 'editParameter',
  field: 'sampleRateHz',
  value: '999',
  nowMs: 170,
});
assert.equal(lockedEdit, session);
assert.deepEqual(
  getPistonOscillationGuideEventGuard(session, {
    type: 'editParameter',
    field: 'sampleRateHz',
    value: '999',
    nowMs: 170,
  }),
  { allowed: false, reason: 'wrongStep' },
);

const wrongHeightEvent = {
  type: 'confirmHeight',
  heightMm: 70,
  leftHandSupporting: true,
  rightHandReleased: true,
  nowMs: 190,
} as const;
assert.deepEqual(getPistonOscillationGuideEventGuard(session, wrongHeightEvent), {
  allowed: false,
  reason: 'wrongTargetHeight',
});
assert.equal(transition(session, wrongHeightEvent), session);

assert.deepEqual(
  getPistonOscillationGuideEventGuard(session, {
    type: 'confirmHeight',
    heightMm: 79.8,
    leftHandSupporting: true,
    rightHandReleased: true,
    nowMs: 191,
  }),
  { allowed: true, reason: 'allowed' },
  'the measured physical height may differ slightly from the nominal 80 mm calculation height',
);

assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'confirmHeight', {
    heightMm: 80,
    leftHandSupporting: false,
    rightHandSupporting: false,
  }),
  { allowed: false, reason: 'leftHandRequired' },
);
assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'confirmHeight', {
    heightMm: 80,
    leftHandSupporting: true,
    rightHandSupporting: true,
  }),
  { allowed: false, reason: 'rightHandMustBeReleased' },
);

for (const [measurementIndex, targetHeightMm] of PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.entries()) {
  const heightStep = getPistonOscillationGuideHeightAdjustmentStep(measurementIndex as 0 | 1 | 2);
  const heightSession: PistonOscillationGuideSession = {
    ...session,
    measurementIndex: measurementIndex as 0 | 1 | 2,
    step: heightStep,
    heightReset: null,
  };
  const confirmedHeight = transition(heightSession, {
    type: 'confirmHeight',
    heightMm: targetHeightMm,
    leftHandSupporting: true,
    rightHandReleased: true,
    nowMs: 180 + measurementIndex * 10,
  });
  assert.equal(confirmedHeight.step, 'screwLock');
  const lostAfterConfirmation = transition(confirmedHeight, {
    type: 'beginHeightReset',
    reason: 'supportLost',
    heightMm: targetHeightMm,
    nowMs: 181 + measurementIndex * 10,
  });
  assert.equal(lostAfterConfirmation.step, heightStep);
  assert.equal(lostAfterConfirmation.heightReset?.reason, 'supportLost');
  assert.equal(lostAfterConfirmation.heightReset?.phase, 'resetting');
  assert.equal(lostAfterConfirmation.heightReset?.targetHeightMm, targetHeightMm);
  const resetComplete = transition(lostAfterConfirmation, {
    type: 'heightResetComplete',
    nowMs: 182 + measurementIndex * 10,
  });
  assert.equal(resetComplete.step, heightStep);
  assert.equal(resetComplete.heightReset?.phase, 'explaining');
}

session = transition(session, {
  type: 'beginHeightReset',
  reason: 'wrongHeightConfirmation',
  heightMm: 76,
  nowMs: 195,
});
assert.equal(session.step, 'firstHeightAdjustment');
assert.equal(session.heightReset?.reason, 'wrongHeightConfirmation');
assert.equal(session.heightReset?.phase, 'resetting');
assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'platformGrab'),
  { allowed: false, reason: 'heightResetInProgress' },
);
assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'tightenScrew'),
  { allowed: false, reason: 'heightResetInProgress' },
);
session = transition(session, { type: 'heightResetComplete', nowMs: 196 });
assert.equal(session.heightReset?.phase, 'explaining');
session = transition(session, { type: 'dismissHeightReset', nowMs: 197 });
assert.equal(session.heightReset, null);

session = transition(session, {
  type: 'confirmHeight',
  heightMm: 80,
  leftHandSupporting: true,
  rightHandReleased: true,
  nowMs: 200,
});
assert.equal(session.step, 'screwLock');
assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'platformGrab'),
  { allowed: false, reason: 'wrongStep' },
  'after height confirmation the right hand must go to the screw instead of reclaiming the platform',
);
assert.deepEqual(
  getPistonOscillationGuideActionGuard(session, 'tightenScrew', {
    leftHandSupporting: true,
    rightHandSupporting: false,
  }),
  { allowed: true, reason: 'allowed' },
);

session = transition(session, {
  type: 'beginHeightReset',
  reason: 'supportLost',
  heightMm: 80,
  nowMs: 205,
});
assert.equal(session.step, 'firstHeightAdjustment');
assert.equal(session.heightReset?.reason, 'supportLost');
session = transition(session, { type: 'heightResetComplete', nowMs: 206 });
assert.equal(session.heightReset?.phase, 'explaining');
session = transition(session, { type: 'dismissHeightReset', nowMs: 207 });
session = transition(session, {
  type: 'confirmHeight',
  heightMm: 80,
  leftHandSupporting: true,
  rightHandReleased: true,
  nowMs: 208,
});
assert.equal(session.step, 'screwLock');

const legacyPausedSession = normalizePistonOscillationGuideSession({
  ...structuredClone(session),
  status: 'paused',
});
assert.equal(legacyPausedSession.status, 'active');
assert.equal(legacyPausedSession.step, 'screwLock');
assert.deepEqual(legacyPausedSession.parameterDrafts, session.parameterDrafts);
assert.deepEqual(legacyPausedSession.savedMeasurements, session.savedMeasurements);

const legacyBaselineSession = normalizePistonOscillationGuideSession({
  ...structuredClone(session),
  step: 'baselineStabilizing',
});
assert.equal(
  legacyBaselineSession.step,
  'acquisitionReady',
  'a persisted legacy baseline checkpoint must resume at the visible Start step',
);
assert.equal(legacyBaselineSession.measurementIndex, session.measurementIndex);
assert.deepEqual(legacyBaselineSession.parameterDrafts, session.parameterDrafts);
assert.deepEqual(legacyBaselineSession.savedMeasurements, session.savedMeasurements);

session = transition(session, { type: 'lockScrew', nowMs: 250 });
assert.equal(session.step, 'hoseReconnect');
session = transition(session, { type: 'reconnectHose', nowMs: 260 });
assert.equal(session.step, 'screwLoosen');
session = transition(session, { type: 'loosenScrew', nowMs: 270 });
assert.equal(session.step, 'acquisitionReady');
session = acceptAcquisitionTransition(session, { type: 'startAcquisition' }, 290);
assert.equal(session.step, 'waitingTrigger');

const oneHandRelease = { type: 'releasePiston', bothHandsReleased: false, nowMs: 300 } as const;
assert.deepEqual(getPistonOscillationGuideEventGuard(session, oneHandRelease), {
  allowed: false,
  reason: 'bothHandsRequired',
});
assert.equal(transition(session, oneHandRelease), session);

session = acceptAcquisitionTransition(session, { type: 'triggered' }, 310);
assert.equal(session.step, 'recording');
assert.equal(session.acquisitionCandidate, null);

for (const [measurementIndex, targetHeightMm] of PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.entries()) {
  const runIndex = measurementIndex as 0 | 1 | 2;
  const modeledEquilibriumHeightMm = createPistonOscillationLoadedEquilibriumState(
    targetHeightMm,
  ).equilibriumHeightM * 1_000;
  const recordingSession: PistonOscillationGuideSession = {
    ...session,
    measurementIndex: runIndex,
  };
  const relaxedHeightCandidate = createCandidate(
    runIndex,
    PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S,
    [],
    311 + measurementIndex * 10,
    modeledEquilibriumHeightMm,
  );
  assert.deepEqual(
    getPistonOscillationGuideEventGuard(recordingSession, {
      type: 'updateRecording',
      recordedDurationS: relaxedHeightCandidate.acquisitionSettings.recordedDurationS,
      samples: relaxedHeightCandidate.samples,
      candidate: relaxedHeightCandidate,
      nowMs: 311 + measurementIndex * 10,
    }),
    { allowed: true, reason: 'allowed' },
    `${targetHeightMm} mm must accept its own modeled loaded-equilibrium height`,
  );
  const relaxedHeightCheckpoint = acceptAcquisitionTransition(
    recordingSession,
    { type: 'recordingReady', candidate: relaxedHeightCandidate },
    312 + measurementIndex * 10,
  );
  assert.equal(relaxedHeightCheckpoint.step, 'pauseAvailable');

  const excessiveHeightDriftCandidate = createCandidate(
    runIndex,
    PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S,
    [],
    313 + measurementIndex * 10,
    modeledEquilibriumHeightMm - 0.011,
  );
  assert.deepEqual(
    getPistonOscillationGuideEventGuard(recordingSession, {
      type: 'updateRecording',
      recordedDurationS: excessiveHeightDriftCandidate.acquisitionSettings.recordedDurationS,
      samples: excessiveHeightDriftCandidate.samples,
      candidate: excessiveHeightDriftCandidate,
      nowMs: 313 + measurementIndex * 10,
    }),
    { allowed: false, reason: 'candidateMismatch' },
    `${targetHeightMm} mm must still reject drift below its modeled relaxation interval`,
  );
}

const discardedOverpressureAttempt = acceptAcquisitionTransition(
  session,
  { type: 'redoOverpressureAttempt' },
  315,
);
assert.equal(discardedOverpressureAttempt.step, 'waitingTrigger');
assert.equal(discardedOverpressureAttempt.acquisitionCandidate, null);
assert.equal(discardedOverpressureAttempt.savedMeasurements.length, 0);

const shortSamples: PistonOscillationRawSample[] = [
  { sampleIndex: 0, timeS: 0, absolutePressureKpa: 104.8 },
  { sampleIndex: 1, timeS: 0.4, absolutePressureKpa: 101.4 },
];
const shortCandidate = createCandidate(0, 0.4, shortSamples, 320);

session = transition(session, {
  type: 'updateRecording',
  recordedDurationS: 0.4,
  samples: shortCandidate.samples,
  candidate: shortCandidate,
  nowMs: 320,
});
assert.equal(session.step, 'recording');
assert.deepEqual(
  getPistonOscillationGuideEventGuard(session, { type: 'pauseRecording', nowMs: 330 }),
  { allowed: false, reason: 'recordingTooShort' },
);
assert.equal(
  transition(session, { type: 'pauseRecording', nowMs: 330 }),
  session,
);

const recordedSamples: PistonOscillationRawSample[] = [
  { sampleIndex: 0, timeS: 0, absolutePressureKpa: 104.8 },
  { sampleIndex: 1, timeS: 0.1, absolutePressureKpa: 96.2 },
  { sampleIndex: 2, timeS: 0.3, absolutePressureKpa: 106.1 },
  { sampleIndex: 3, timeS: 0.6, absolutePressureKpa: 101.325 },
];
const recordedCandidate = createCandidate(0, 0.6, recordedSamples, 340);
session = transition(session, {
  type: 'updateRecording',
  recordedDurationS: PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S + 0.1,
  samples: recordedCandidate.samples,
  candidate: recordedCandidate,
  nowMs: 340,
});
assert.equal(session.step, 'pauseAvailable');
assert.equal(session.acquisitionCandidate?.acquisitionSettings.recordedDurationS, 0.6);

const candidateCheckpoint = normalizePistonOscillationGuideSession(structuredClone(session));
assert.equal(candidateCheckpoint.step, 'pauseAvailable');
assert.deepEqual(candidateCheckpoint.acquisitionCandidate, session.acquisitionCandidate);
assert.deepEqual(
  getPistonOscillationGuidePrimaryControlState({
    status: candidateCheckpoint.status,
    step: candidateCheckpoint.step,
    pauseReady: true,
    candidateAvailable: candidateCheckpoint.acquisitionCandidate !== null,
  }),
  { action: 'pauseAcquisition', showsPause: true, allowed: true },
  'the canonical third-slot action must become an enabled Pause only with a stable valid candidate',
);
const atomicallyPausedCheckpoint = acceptAcquisitionTransition(
  candidateCheckpoint,
  { type: 'curvePaused', candidate: candidateCheckpoint.acquisitionCandidate! },
  349,
);
assert.equal(atomicallyPausedCheckpoint.step, 'awaitingSaveOrRedo');
assert.equal(
  transitionPistonOscillationGuideAcquisitionSession(
    atomicallyPausedCheckpoint,
    { type: 'curvePaused', candidate: candidateCheckpoint.acquisitionCandidate! },
    350,
  ),
  null,
  'a duplicate Pause cannot partially replay after the atomic transition has completed',
);

const candidateRequiredStepRestoreExpectations = [
  ['pauseAvailable', 'pauseAvailable'],
  ['curveFrozen', 'awaitingSaveOrRedo'],
  ['awaitingSaveOrRedo', 'awaitingSaveOrRedo'],
] as const;
for (const [step, restoredStep] of candidateRequiredStepRestoreExpectations) {
  const restoredWithCandidate = normalizePistonOscillationGuideSession({
    ...structuredClone(candidateCheckpoint),
    step,
  });
  assert.equal(restoredWithCandidate.step, restoredStep);
  assert.deepEqual(
    restoredWithCandidate.acquisitionCandidate,
    candidateCheckpoint.acquisitionCandidate,
  );

  const restoredWithoutCandidate = normalizePistonOscillationGuideSession({
    ...structuredClone(candidateCheckpoint),
    step,
    acquisitionCandidate: null,
  });
  assert.equal(
    restoredWithoutCandidate.step,
    'waitingTrigger',
    `${step} must restart the interrupted attempt when its candidate is missing`,
  );
  assert.equal(restoredWithoutCandidate.acquisitionCandidate, null);
  assert.deepEqual(
    getPistonOscillationGuideEventGuard(restoredWithoutCandidate, {
      type: 'releasePiston',
      bothHandsReleased: true,
      nowMs: 345,
    }),
    { allowed: true, reason: 'allowed' },
    'the normalized checkpoint must remain immediately resumable',
  );
}

for (const step of ['acquisitionReady', 'waitingTrigger', 'recording', 'crossRunDisconnect'] as const) {
  const restoredWithoutStaleCandidate = normalizePistonOscillationGuideSession({
    ...structuredClone(candidateCheckpoint),
    step,
  });
  assert.equal(restoredWithoutStaleCandidate.step, step);
  assert.equal(
    restoredWithoutStaleCandidate.acquisitionCandidate,
    null,
    `${step} must not retain a stale acquisition candidate`,
  );
}
const restoredInterruptedRecording = normalizePistonOscillationGuideSession({
  ...structuredClone(candidateCheckpoint),
  step: 'recording',
});
const restartedInterruptedRecording = acceptAcquisitionTransition(
  restoredInterruptedRecording,
  { type: 'restoreInterruptedAcquisition' },
  346,
);
assert.equal(restartedInterruptedRecording.step, 'waitingTrigger');
assert.equal(restartedInterruptedRecording.acquisitionCandidate, null);

const wrongRunCandidate = createCandidate(1, 0.6, recordedSamples, 341);
const wrongSettingsCandidate = structuredClone(recordedCandidate);
wrongSettingsCandidate.acquisitionSettings.triggerThresholdKpa = 121;
const invalidCandidateCheckpoints = [
  ['pauseAvailable', shortCandidate, 'too-short candidate'],
  ['curveFrozen', wrongRunCandidate, 'candidate from another measurement'],
  ['awaitingSaveOrRedo', wrongSettingsCandidate, 'candidate with non-guide settings'],
] as const;
for (const [step, acquisitionCandidate, description] of invalidCandidateCheckpoints) {
  const restoredInvalidCandidate = normalizePistonOscillationGuideSession({
    ...structuredClone(candidateCheckpoint),
    step,
    acquisitionCandidate,
  });
  assert.equal(
    restoredInvalidCandidate.step,
    'waitingTrigger',
    `${description} must not keep ${step} blocked after restore`,
  );
  assert.equal(restoredInvalidCandidate.acquisitionCandidate, null);
}

session = transition(session, { type: 'pauseRecording', nowMs: 350 });
assert.equal(session.step, 'curveFrozen');
session = transition(session, { type: 'curveFreezeComplete', nowMs: 360 });
assert.equal(session.step, 'awaitingSaveOrRedo');

const mismatchedCandidateSession: PistonOscillationGuideSession = {
  ...session,
  acquisitionCandidate: {
    ...session.acquisitionCandidate!,
    measurementIndex: 1,
    targetHeightMm: 70,
  },
};
assert.deepEqual(
  getPistonOscillationGuideEventGuard(mismatchedCandidateSession, {
    type: 'saveMeasurement',
    nowMs: 365,
  }),
  { allowed: false, reason: 'candidateMismatch' },
);
assert.equal(
  transition(mismatchedCandidateSession, { type: 'saveMeasurement', nowMs: 365 }),
  mismatchedCandidateSession,
);

session = acceptAcquisitionTransition(session, { type: 'saveMeasurement' }, 370);
assert.equal(session.status, 'active');
assert.equal(session.step, 'crossRunDisconnect');
assert.equal(session.measurementIndex, 1);
assert.equal(session.acquisitionCandidate, null);
assert.equal(session.savedMeasurements.length, 1);
assert.deepEqual(session.savedMeasurements[0], {
  ...recordedCandidate,
  capturedAtMs: 370,
});

const restored = normalizePistonOscillationGuideSession(structuredClone(session));
assert.equal(restored.status, 'active');
assert.equal(restored.step, 'crossRunDisconnect');
assert.deepEqual(restored.parameterDrafts, session.parameterDrafts);
assert.deepEqual(restored.savedMeasurements, session.savedMeasurements);

const legacyCrossRunSession = normalizePistonOscillationGuideSession({
  ...structuredClone(session),
  step: 'crossRunStabilizing',
});
assert.equal(
  legacyCrossRunSession.step,
  'crossRunDisconnect',
  'a persisted legacy cross-Run stabilization checkpoint must resume at hose disconnect',
);
assert.equal(legacyCrossRunSession.measurementIndex, session.measurementIndex);
assert.deepEqual(legacyCrossRunSession.parameterDrafts, session.parameterDrafts);
assert.deepEqual(legacyCrossRunSession.savedMeasurements, session.savedMeasurements);

const completeCrossRunPreparation = (
  source: PistonOscillationGuideSession,
  targetHeightMm: number,
  nowMs: number,
) => {
  let next = source;
  assert.equal(next.step, 'crossRunDisconnect');

  const redundantLockEvent = { type: 'lockScrew', nowMs: nowMs + 2 } as const;
  assert.deepEqual(getPistonOscillationGuideEventGuard(next, redundantLockEvent), {
    allowed: false,
    reason: 'wrongStep',
  });
  assert.equal(transition(next, redundantLockEvent), next);

  const disconnectCheckpoint = normalizePistonOscillationGuideSession(structuredClone(next));
  assert.equal(disconnectCheckpoint.step, 'crossRunDisconnect');
  assert.equal(disconnectCheckpoint.measurementIndex, next.measurementIndex);
  assert.deepEqual(disconnectCheckpoint.savedMeasurements, next.savedMeasurements);

  const supportLostAtDisconnect = transition(next, {
    type: 'beginHeightReset',
    reason: 'supportLost',
    heightMm: targetHeightMm + 10,
    nowMs: nowMs + 3,
  });
  assert.equal(supportLostAtDisconnect.step, 'nextHeightAdjustment');
  assert.equal(supportLostAtDisconnect.heightReset?.reason, 'supportLost');
  assert.equal(supportLostAtDisconnect.heightReset?.targetHeightMm, targetHeightMm);

  next = transition(next, { type: 'disconnectHose', nowMs: nowMs + 4 });
  assert.equal(next.step, 'nextHeightAdjustment');

  const redundantLoosenEvent = { type: 'loosenScrew', nowMs: nowMs + 5 } as const;
  assert.deepEqual(getPistonOscillationGuideEventGuard(next, redundantLoosenEvent), {
    allowed: false,
    reason: 'wrongStep',
  });
  assert.equal(transition(next, redundantLoosenEvent), next);

  const heightCheckpoint = normalizePistonOscillationGuideSession(structuredClone(next));
  assert.equal(heightCheckpoint.step, 'nextHeightAdjustment');
  assert.equal(heightCheckpoint.measurementIndex, next.measurementIndex);
  assert.deepEqual(heightCheckpoint.savedMeasurements, next.savedMeasurements);

  const wrongHeight = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.find(
    (heightMm) => heightMm !== targetHeightMm,
  )!;
  assert.deepEqual(
    getPistonOscillationGuideEventGuard(next, {
      type: 'confirmHeight',
      heightMm: wrongHeight,
      leftHandSupporting: true,
      rightHandReleased: true,
      nowMs: nowMs + 6,
    }),
    { allowed: false, reason: 'wrongTargetHeight' },
  );
  next = transition(next, {
    type: 'confirmHeight',
    heightMm: targetHeightMm,
    leftHandSupporting: true,
    rightHandReleased: true,
    nowMs: nowMs + 7,
  });
  assert.equal(next.step, 'screwLock');
  next = transition(next, { type: 'lockScrew', nowMs: nowMs + 8 });
  assert.equal(next.step, 'hoseReconnect');
  next = transition(next, { type: 'reconnectHose', nowMs: nowMs + 9 });
  assert.equal(next.step, 'screwLoosen');
  next = transition(next, { type: 'loosenScrew', nowMs: nowMs + 10 });
  assert.equal(next.step, 'acquisitionReady');
  return next;
};

const completeAcquisition = (
  source: PistonOscillationGuideSession,
  nowMs: number,
) => {
  assert.equal(
    transitionPistonOscillationGuideAcquisitionSession(source, { type: 'triggered' }, nowMs),
    null,
    'a stale trigger cannot advance before the accepted Start transition',
  );
  let next = acceptAcquisitionTransition(source, { type: 'startAcquisition' }, nowMs);
  assert.equal(next.step, 'waitingTrigger');
  assert.equal(
    transitionPistonOscillationGuideAcquisitionSession(
      next,
      { type: 'startAcquisition' },
      nowMs + 0.5,
    ),
    null,
    'a duplicate Start cannot desynchronize the armed panel from the canonical step',
  );
  next = acceptAcquisitionTransition(next, { type: 'triggered' }, nowMs + 1);
  assert.equal(next.step, 'recording');
  const measurementIndex = next.measurementIndex;
  const samples: PistonOscillationRawSample[] = [
    { sampleIndex: 0, timeS: 0, absolutePressureKpa: 104.5 - measurementIndex * 0.1 },
    { sampleIndex: 1, timeS: 0.25, absolutePressureKpa: 97.5 + measurementIndex * 0.1 },
    { sampleIndex: 2, timeS: 0.5, absolutePressureKpa: 101.325 },
  ];
  const candidate = createCandidate(
    measurementIndex,
    PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S,
    samples,
    nowMs + 2,
  );
  assert.deepEqual(
    getPistonOscillationGuidePrimaryControlState({
      status: next.status,
      step: next.step,
      pauseReady: false,
      candidateAvailable: false,
    }),
    { action: null, showsPause: true, allowed: false },
    'recording may show the Pause-shaped control but must not dispatch it before readiness',
  );
  for (const attemptOffset of [1.2, 1.4]) {
    assert.equal(
      transitionPistonOscillationGuideAcquisitionSession(
        next,
        { type: 'curvePaused', candidate },
        nowMs + attemptOffset,
      ),
      null,
      'early Pause attempts must leave the recording step retryable',
    );
  }
  next = acceptAcquisitionTransition(next, { type: 'recordingReady', candidate }, nowMs + 2);
  assert.equal(next.step, 'pauseAvailable');
  assert.equal(next.acquisitionCandidate?.measurementIndex, measurementIndex);
  assert.equal(
    next.acquisitionCandidate?.targetHeightMm,
    PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[measurementIndex],
  );
  assert.deepEqual(
    getPistonOscillationGuidePrimaryControlState({
      status: next.status,
      step: next.step,
      pauseReady: true,
      candidateAvailable: next.acquisitionCandidate !== null,
    }),
    { action: 'pauseAcquisition', showsPause: true, allowed: true },
    'once the checklist points to Pause, the same canonical state must make it clickable',
  );
  next = acceptAcquisitionTransition(next, { type: 'curvePaused', candidate }, nowMs + 3);
  assert.equal(next.step, 'awaitingSaveOrRedo');
  return acceptAcquisitionTransition(next, { type: 'saveMeasurement' }, nowMs + 5);
};

session = completeCrossRunPreparation(session, 70, 500);
session = completeAcquisition(session, 600);
assert.equal(session.status, 'active');
assert.equal(session.step, 'crossRunDisconnect');
assert.equal(session.measurementIndex, 2);
assert.equal(session.savedMeasurements.length, 2);
assert.deepEqual(
  session.savedMeasurements.map((measurement) => measurement.targetHeightMm),
  [80, 70],
);
assert.deepEqual(session.parameterDrafts, {
  sampleRateHz: '1000',
  triggerThresholdKpa: '120',
});
assert.equal(session.parametersLocked, true);

const secondRunCheckpoint = normalizePistonOscillationGuideSession(structuredClone(session));
assert.equal(secondRunCheckpoint.measurementIndex, 2);
assert.equal(secondRunCheckpoint.step, 'crossRunDisconnect');
assert.deepEqual(secondRunCheckpoint.savedMeasurements, session.savedMeasurements);

session = completeCrossRunPreparation(session, 60, 700);
session = completeAcquisition(session, 800);
assert.equal(session.status, 'active');
assert.equal(session.step, 'periodProcessing');
assert.equal(session.measurementIndex, 2);
assert.equal(session.acquisitionCandidate, null);
assert.equal(session.dataProcessing?.status, 'period-processing');
assert.equal(session.dataProcessing?.runs.length, 3);
assert.deepEqual(
  session.savedMeasurements.map((measurement) => measurement.targetHeightMm),
  [80, 70, 60],
);

const completedCheckpoint = normalizePistonOscillationGuideSession(structuredClone(session));
assert.equal(completedCheckpoint.status, 'active');
assert.equal(completedCheckpoint.step, 'periodProcessing');
assert.deepEqual(completedCheckpoint.savedMeasurements, session.savedMeasurements);

const blockedDuringProcessing = transition(session, { type: 'startAcquisition', nowMs: 900 });
assert.equal(blockedDuringProcessing, session);

const completeGuidePeriodRun = (
  source: PistonOscillationGuideSession,
  runIndex: number,
  nowMs: number,
) => {
  const record = source.savedMeasurements[runIndex]!;
  const extrema = findPistonOscillationExtrema(record.samples);
  const leftEndpoint = extrema[0]!;
  const rightEndpoint = extrema[6]!;
  let next = transition(source, {
    type: 'selectPeriodRange',
    runIndex,
    rangeStartTimeS: leftEndpoint.timeS,
    rangeEndTimeS: rightEndpoint.timeS,
    nowMs,
  });
  assert.equal(next.dataProcessing?.runs[runIndex].selection?.periodCount, 3);
  next = transition(next, {
    type: 'editPeriodAnswer',
    runIndex,
    field: 't1',
    value: formatPistonOscillationEndpointTime(leftEndpoint.timeS),
    nowMs: nowMs + 1,
  });
  next = transition(next, {
    type: 'editPeriodAnswer',
    runIndex,
    field: 't2',
    value: formatPistonOscillationEndpointTime(rightEndpoint.timeS),
    nowMs: nowMs + 2,
  });
  next = transition(next, {
    type: 'submitPeriodEndpoints',
    runIndex,
    nowMs: nowMs + 3,
  });
  const periodExpected = next.dataProcessing?.runs[runIndex].answers.period.expectedValue;
  assert.ok(periodExpected !== null && periodExpected !== undefined);
  next = transition(next, {
    type: 'editPeriodAnswer',
    runIndex,
    field: 'period',
    value: formatPistonOscillationPeriod(periodExpected!),
    nowMs: nowMs + 4,
  });
  next = transition(next, {
    type: 'submitPeriod',
    runIndex,
    nowMs: nowMs + 5,
  });
  assert.ok(next.dataProcessing?.runs[runIndex].result);
  return transition(next, { type: 'advancePeriodRun', nowMs: nowMs + 6 });
};

let calculationGuide = session;
for (let runIndex = 0; runIndex < 3; runIndex += 1) {
  calculationGuide = completeGuidePeriodRun(calculationGuide, runIndex, 905 + runIndex * 10);
}
assert.equal(calculationGuide.step, 'powerOff');
assert.equal(calculationGuide.powerOn, true);
assert.deepEqual(
  getPistonOscillationGuideActionGuard(calculationGuide, 'togglePower'),
  { allowed: true, reason: 'allowed' },
);
assert.deepEqual(
  getPistonOscillationGuideEventGuard(calculationGuide, {
    type: 'setPower',
    powerOn: true,
    nowMs: 943,
  }),
  { allowed: false, reason: 'wrongStep' },
  'the final power step must only allow switching the instrument off',
);
const fitBeforeShutdown = transition(calculationGuide, {
  type: 'toggleFitRun',
  runIndex: 0,
  nowMs: 944,
});
assert.equal(fitBeforeShutdown, calculationGuide);
calculationGuide = transition(calculationGuide, {
  type: 'setPower',
  powerOn: false,
  nowMs: 945,
});
assert.equal(calculationGuide.step, 'calculationReady');
assert.equal(calculationGuide.powerOn, false);
for (let runIndex = 0; runIndex < 3; runIndex += 1) {
  calculationGuide = transition(calculationGuide, {
    type: 'toggleFitRun',
    runIndex,
    nowMs: 950 + runIndex,
  });
}
calculationGuide = transition(calculationGuide, { type: 'submitLinearFit', nowMs: 960 });
assert.ok(calculationGuide.dataProcessing?.linearFitResult);
assert.equal(calculationGuide.dataProcessing?.calculationSession?.activeFieldId, 'area');
for (const [offset, field] of (['area', 'gamma', 'relativeError'] as const).entries()) {
  calculationGuide = transition(calculationGuide, {
    type: 'submitCalculationField',
    field,
    nowMs: 970 + offset * 3,
  });
  assert.equal(
    calculationGuide.dataProcessing?.calculationSession?.answers[field].feedback?.outcome,
    'empty',
  );
  calculationGuide = transition(calculationGuide, {
    type: 'revealCalculationAnswer',
    field,
    nowMs: 971 + offset * 3,
  });
}
assert.equal(calculationGuide.dataProcessing?.calculationSession?.status, 'ready-to-exit');
calculationGuide = transition(calculationGuide, { type: 'completeCalculation', nowMs: 990 });
assert.equal(calculationGuide.status, 'active');
assert.equal(calculationGuide.step, 'completionReview');
assert.equal(calculationGuide.dataProcessing?.status, 'completed');
const restoredCompletionReview = normalizePistonOscillationGuideSession(structuredClone(calculationGuide));
assert.equal(restoredCompletionReview.status, 'active');
assert.equal(restoredCompletionReview.step, 'completionReview');
calculationGuide = transition(calculationGuide, { type: 'acknowledgeCompletion', nowMs: 991 });
assert.equal(calculationGuide.status, 'completed');
assert.equal(calculationGuide.step, 'completed');
const restoredCompletedGuide = normalizePistonOscillationGuideSession(structuredClone(calculationGuide));
assert.equal(restoredCompletedGuide.status, 'completed');
assert.equal(restoredCompletedGuide.step, 'completed');
assert.equal(restoredCompletedGuide.completionExited, false);

const completedExit = transition(calculationGuide, { type: 'exitSession', nowMs: 992 });
assert.equal(completedExit.status, 'completed');
assert.equal(completedExit.step, 'completed');
assert.equal(completedExit.completionExited, true);
assert.deepEqual(completedExit.savedMeasurements, calculationGuide.savedMeasurements);
assert.deepEqual(completedExit.dataProcessing, calculationGuide.dataProcessing);
const restoredCompletedExit = normalizePistonOscillationGuideSession(
  structuredClone(completedExit),
);
assert.equal(restoredCompletedExit.status, 'completed');
assert.equal(restoredCompletedExit.completionExited, true);
const reopenedCompleted = transition(restoredCompletedExit, {
  type: 'reopenCompletedSession',
  nowMs: 993,
});
assert.equal(reopenedCompleted.status, 'completed');
assert.equal(reopenedCompleted.completionExited, false);
assert.deepEqual(reopenedCompleted.savedMeasurements, calculationGuide.savedMeasurements);
assert.deepEqual(reopenedCompleted.dataProcessing, calculationGuide.dataProcessing);
const resetCompleted = transition(completedExit, { type: 'resetSession', nowMs: 994 });
assert.equal(resetCompleted.status, 'active');
assert.equal(resetCompleted.completionExited, false);
assert.deepEqual(resetCompleted.savedMeasurements, []);
assert.equal(resetCompleted.dataProcessing, null);

const reset = transition(session, { type: 'resetSession', nowMs: 1_000 });
assert.equal(reset.status, 'active');
assert.equal(reset.step, 'powerOn');
assert.equal(reset.powerOn, false);
assert.equal(reset.startedAtMs, 1_000);
assert.deepEqual(reset.parameterDrafts, { sampleRateHz: '', triggerThresholdKpa: '' });
assert.equal(reset.acquisitionCandidate, null);
assert.deepEqual(reset.savedMeasurements, []);

const exited = transition(session, { type: 'exitSession', nowMs: 1_010 });
assert.deepEqual(exited, createDefaultPistonOscillationGuideSession());

console.log('pistonOscillationGuideWorkflowModel tests passed');
