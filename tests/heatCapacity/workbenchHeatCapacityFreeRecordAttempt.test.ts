import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeRecordWorkbenchState,
  captureHeatCapacityFreeRollbackSnapshot,
  createDefaultHeatCapacityFile,
  deriveHeatCapacityFreeWorkflowStage,
  getHeatCapacityFreeDisplayPhase,
  getHeatCapacityFreeRecordBlockReason,
  getHeatCapacityFreeRecordButtonState,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  removeHeatCapacityFreeTrialRecordWorkbenchState,
  resetHeatCapacityFreeRunWorkbenchState,
  selectActiveHeatCapacityFreeDomain,
  selectHeatCapacityFreeDomain,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createHeatCapacityFreeAttempt,
  transitionHeatCapacityFreeAttempt,
  type HeatCapacityFreeAttemptEvent,
} from '../../src/domain/heatCapacity/heatCapacityFreeAttemptModel.ts';

const attemptEvent = (
  type: HeatCapacityFreeAttemptEvent['type'],
  atS: number,
): HeatCapacityFreeAttemptEvent => ({ type, atS, wallClockMs: atS * 1000 });

const createWaitingU1Attempt = () => transitionHeatCapacityFreeAttempt(
  createHeatCapacityFreeAttempt({
    startReason: 'effective-pump',
    preheatOutcome: 'completed',
    atS: 10,
    wallClockMs: 10_000,
    powerOn: true,
  }),
  attemptEvent('pump-valve-closed', 12),
);

const createStableFreeU1File = (): WorkbenchHeatCapacityState => {
  const base = createDefaultHeatCapacityFile(1);
  const u0 = normalizeHeatCapacityFreeRecordInput({
    atS: 8,
    displayPressureMv: 0.02,
    displayTemperatureMv: 1499.02,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  });
  return {
    ...base,
    heatCapacityMode: 'free',
    powerOn: true,
    heatCapacityPhase: 'sealedStabilizing',
    pressureZeroed: true,
    pressureZeroAdjusted: true,
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    glassPistonState: 'closed',
    pumpStrokeCount: 9,
    pressureSafetyStatus: 'normal',
    heatCapacityFreeRunWorkspace: {
      ...base.heatCapacityFreeRunWorkspace,
      currentExperimentStatus: 'running',
      activeAttempt: createWaitingU1Attempt(),
      trials: [{
        ...createHeatCapacityFreeTrial('free-trial-1'),
        u0,
      }],
    },
    heatCapacityFreeInstrumentState: {
      physics: {
        ...base.heatCapacityFreeInstrumentState.physics,
        simulationTimeS: 60,
        pumpStrokeCount: 9,
        lastStopcockOpenedAtS: 2,
        lastStopcockClosedAtS: 12,
        releaseStarted: false,
        releaseReference: null,
      },
      sensor: {
        ...base.heatCapacityFreeInstrumentState.sensor,
        displayPressureMv: 91.17,
        displayTemperatureMv: 1499.02,
        pressureSlopeMvPerS: 0.01,
        temperatureSlopeMvPerS: 0.01,
      },
      calibration: {
        ...base.heatCapacityFreeInstrumentState.calibration,
        calibrationVersion: 1,
        zeroOffsetMv: 0,
        zeroEvents: [{
          id: 'zero-1',
          atS: 7.5,
          displayPressureMv: 0.02,
          displayTemperatureMv: 1499.02,
          zeroOffsetMv: 0,
          source: 'user',
        }],
        automaticU0: null,
      },
    },
  };
};

const createStableOverAlarmFreeU1File = (): WorkbenchHeatCapacityState => {
  const base = createStableFreeU1File();
  return {
    ...base,
    pressureSignalMv: 151.95,
    pressureSignalMvDisplayed: 151.95,
    pressureSignalTargetMv: 151.95,
    pressureSafetyStatus: 'danger',
    pressureBlockedPumping: true,
    pressureOverLimit: true,
    heatCapacityFreeInstrumentState: {
      ...base.heatCapacityFreeInstrumentState,
      sensor: {
        ...base.heatCapacityFreeInstrumentState.sensor,
        displayPressureMv: 151.95,
        pressureSlopeMvPerS: 0.01,
        temperatureSlopeMvPerS: 0.01,
      },
    },
  };
};

const createNoisyFreeU0File = (): WorkbenchHeatCapacityState => {
  const base = createDefaultHeatCapacityFile(1);
  return {
    ...base,
    heatCapacityMode: 'free',
    powerOn: true,
    heatCapacityPhase: 'readyToZero',
    pressureZeroed: false,
    pressureZeroAdjusted: true,
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
    glassPistonState: 'open',
    pressureSignalMv: 0.19,
    temperatureSignalMv: 1499.09,
    heatCapacityReleaseState: {
      ...base.heatCapacityReleaseState,
      phase: 'open',
      purpose: 'zeroing',
      openingStartedAtS: 10,
      openingCompletedAtS: 10,
    },
    heatCapacityFreeInstrumentState: {
      physics: {
        ...base.heatCapacityFreeInstrumentState.physics,
        simulationTimeS: 12,
        lastStopcockOpenedAtS: 10,
        lastStopcockClosedAtS: null,
      },
      sensor: {
        ...base.heatCapacityFreeInstrumentState.sensor,
        displayPressureMv: 0.19,
        displayTemperatureMv: 1499.09,
        pressureSlopeMvPerS: 0.8,
        temperatureSlopeMvPerS: 0.6,
      },
      calibration: {
        ...base.heatCapacityFreeInstrumentState.calibration,
        calibrationVersion: 1,
        zeroOffsetMv: 0,
        zeroEvents: [{
          id: 'zero-1',
          atS: 11,
          displayPressureMv: 0.19,
          displayTemperatureMv: 1499.09,
          zeroOffsetMv: 0,
          source: 'user',
        }],
        automaticU0: null,
      },
    },
    pressureZeroDisplayedSamples: [
      { atMs: 18_100, valueMv: 0.2 },
      { atMs: 18_200, valueMv: -0.2 },
      { atMs: 18_300, valueMv: 0.1 },
    ],
    heatCapacityFreeRunWorkspace: {
      ...base.heatCapacityFreeRunWorkspace,
      trials: [createHeatCapacityFreeTrial('free-trial-1')],
    },
  };
};

const createUnzeroedFreeU0File = (): WorkbenchHeatCapacityState => {
  const base = createNoisyFreeU0File();
  return {
    ...base,
    pressureZeroAdjusted: false,
    heatCapacityFreeInstrumentState: {
      ...base.heatCapacityFreeInstrumentState,
      calibration: {
        ...base.heatCapacityFreeInstrumentState.calibration,
        calibrationVersion: 0,
        zeroOffsetMv: 0,
        zeroEvents: [],
      },
    },
  };
};

const createPowerOffFreeU0File = (): WorkbenchHeatCapacityState => ({
  ...createNoisyFreeU0File(),
  powerOn: false,
  heatCapacityPhase: 'powerOff',
  pressureSignalMv: null,
  temperatureSignalMv: null,
});

const createClosedStopcockFreeU0File = (): WorkbenchHeatCapacityState => {
  const base = createNoisyFreeU0File();
  return {
    ...base,
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    glassPistonState: 'closed',
    heatCapacityReleaseState: { ...base.heatCapacityReleaseState },
    heatCapacityFreeInstrumentState: {
      ...base.heatCapacityFreeInstrumentState,
      physics: {
        ...base.heatCapacityFreeInstrumentState.physics,
        lastStopcockClosedAtS: 12,
      },
    },
  };
};

const createReleasedAfterU1File = (): WorkbenchHeatCapacityState => {
  const u1File = applyHeatCapacityFreeRecordWorkbenchState(
    createStableFreeU1File(),
    'u1',
    20_000,
  ).file;
  const releasingAttempt = transitionHeatCapacityFreeAttempt(
    u1File.heatCapacityFreeRunWorkspace.activeAttempt!,
    attemptEvent('release-started', 65),
  );
  const waitingU2Attempt = transitionHeatCapacityFreeAttempt(
    releasingAttempt,
    attemptEvent('release-closed', 65.4),
  );
  return {
    ...u1File,
    heatCapacityFreeRunWorkspace: {
      ...u1File.heatCapacityFreeRunWorkspace,
      activeAttempt: waitingU2Attempt,
    },
    heatCapacityPhase: 'recovering',
    heatCapacityFreeInstrumentState: {
      ...u1File.heatCapacityFreeInstrumentState,
      physics: {
        ...u1File.heatCapacityFreeInstrumentState.physics,
        releaseStarted: true,
        releaseReference: {
          pressureBeforeKPa: 106,
          temperatureBeforeK: 298.8,
          amountBeforeRatio: 1.04,
          openedAtS: 65,
          reachedAmbientAtS: 65.3,
        },
        lastStopcockOpenedAtS: 65,
        lastStopcockClosedAtS: 65.4,
      },
      sensor: {
        ...u1File.heatCapacityFreeInstrumentState.sensor,
        displayPressureMv: 25.44,
        displayTemperatureMv: 1499.04,
        pressureSlopeMvPerS: 0.01,
        temperatureSlopeMvPerS: 0.01,
      },
    },
  };
};

const u1Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createStableFreeU1File(),
  'u1',
  20_000,
);

assert.equal(u1Attempt.accepted, true);
assert.equal(u1Attempt.reason, 'accepted');
assert.equal(u1Attempt.trialIndex, 0);
assert.equal(u1Attempt.file.heatCapacityFreeRunWorkspace.trials.length, 1);
assert.equal(u1Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u0?.zeroEventId, 'zero-1');
assert.equal(u1Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u1?.displayPressureMv, 91.1);
assert.equal(u1Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u1?.zeroEventId, 'zero-1');
assert.equal(
  u1Attempt.file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.length,
  1,
  'accepted U1 should attach a trace event without requiring React updater side effects',
);

const openPumpValveBeforeU1File: WorkbenchHeatCapacityState = {
  ...createStableFreeU1File(),
  pumpValveOpen: true,
  pumpValveState: 'open',
};
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(openPumpValveBeforeU1File, 'u1'),
  { visible: false, mode: 'record', disabledReason: 'invalid-sequence' },
  'Free U1 record button should stay hidden until the pump valve has been closed',
);
const openPumpValveU1Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  openPumpValveBeforeU1File,
  'u1',
  20_050,
);
assert.equal(
  openPumpValveU1Attempt.accepted,
  false,
  'Free U1 recording should be rejected while the pump valve is still open even when pressure is in range',
);
assert.equal(openPumpValveU1Attempt.reason, 'invalid-sequence');

const repeatedU0AfterEnteringU1Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createStableFreeU1File(),
  'u0',
  20_100,
);
assert.equal(
  repeatedU0AfterEnteringU1Attempt.accepted,
  false,
  'after U0 has advanced the workflow to U1, U0 should not be recordable again',
);
assert.equal(repeatedU0AfterEnteringU1Attempt.reason, 'invalid-sequence');
assert.equal(
  repeatedU0AfterEnteringU1Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u0?.displayPressureMv,
  0,
  'blocked repeated U0 should keep the original U0 value',
);

const repeatedU1BeforeReleaseAttempt = applyHeatCapacityFreeRecordWorkbenchState(
  {
    ...u1Attempt.file,
    heatCapacityFreeInstrumentState: {
      ...u1Attempt.file.heatCapacityFreeInstrumentState,
      sensor: {
        ...u1Attempt.file.heatCapacityFreeInstrumentState.sensor,
        displayPressureMv: 92.34,
        displayTemperatureMv: 1499.08,
      },
    },
  },
  'u1',
  20_200,
);
assert.equal(
  repeatedU1BeforeReleaseAttempt.accepted,
  true,
  'U1 should be overwritable while the experiment is still before release',
);
assert.equal(repeatedU1BeforeReleaseAttempt.file.heatCapacityFreeRunWorkspace.trials[0].u1?.displayPressureMv, 92.3);
assert.equal(repeatedU1BeforeReleaseAttempt.file.heatCapacityFreeRunWorkspace.trials[0].u2, null);

const u2BeforeReleaseAttempt = applyHeatCapacityFreeRecordWorkbenchState(
  repeatedU1BeforeReleaseAttempt.file,
  'u2',
  20_300,
);
assert.equal(
  u2BeforeReleaseAttempt.accepted,
  false,
  'U2 should not be recordable before a real release has started',
);
assert.equal(u2BeforeReleaseAttempt.reason, 'release-not-started');

const staleU1DuringFreshZeroingFile: WorkbenchHeatCapacityState = {
  ...repeatedU1BeforeReleaseAttempt.file,
  heatCapacityFreeRunWorkspace: {
    ...repeatedU1BeforeReleaseAttempt.file.heatCapacityFreeRunWorkspace,
    activeAttempt: transitionHeatCapacityFreeAttempt(
      repeatedU1BeforeReleaseAttempt.file.heatCapacityFreeRunWorkspace.activeAttempt!,
      attemptEvent('zero-adjusted', 61),
    ),
  },
  heatCapacityPhase: 'readyToZero',
  pressureZeroed: false,
  pressureZeroAdjusted: true,
  glassPistonState: 'open',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  heatCapacityReleaseState: {
    ...repeatedU1BeforeReleaseAttempt.file.heatCapacityReleaseState,
    phase: 'open',
    purpose: 'zeroing',
    openingStartedAtS: 60,
    openingCompletedAtS: 60,
  },
  heatCapacityFreeInstrumentState: {
    ...repeatedU1BeforeReleaseAttempt.file.heatCapacityFreeInstrumentState,
    physics: {
      ...repeatedU1BeforeReleaseAttempt.file.heatCapacityFreeInstrumentState.physics,
      releaseStarted: false,
      releaseReference: null,
    },
  },
};
assert.equal(
  deriveHeatCapacityFreeWorkflowStage(staleU1DuringFreshZeroingFile),
  'beforeRelease',
  'attempt stage remains authoritative after a post-pump zero adjustment invalidates the run',
);
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(staleU1DuringFreshZeroingFile, 'u0'),
  { visible: false, mode: 'rerecord', disabledReason: 'invalid-sequence' },
  'post-pump zero adjustment must hide all formal record actions',
);
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(staleU1DuringFreshZeroingFile, 'u1'),
  { visible: false, mode: 'rerecord', disabledReason: 'invalid-sequence' },
  'fresh zeroing must hide stale U1 re-record buttons',
);

const visualReleaseOpeningAfterU1File: WorkbenchHeatCapacityState = {
  ...repeatedU1BeforeReleaseAttempt.file,
  heatCapacityPhase: 'readyToZero',
  glassPistonState: 'open',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  heatCapacityReleaseState: {
    ...repeatedU1BeforeReleaseAttempt.file.heatCapacityReleaseState,
    phase: 'opening',
    purpose: 'release',
    attemptId: 1,
    phaseStartedAtS: 60,
    openingStartedAtS: 60,
  },
};
assert.equal(
  deriveHeatCapacityFreeWorkflowStage(visualReleaseOpeningAfterU1File),
  'beforeRelease',
  'opening animation should remain in the preceding equilibrium stage until real release starts',
);
assert.equal(
  getHeatCapacityFreeDisplayPhase(visualReleaseOpeningAfterU1File),
  'sealedStabilizing',
  'the instrument panel should show the preceding equilibrium phase during release opening',
);
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(visualReleaseOpeningAfterU1File, 'u1'),
  { visible: false, mode: 'rerecord', disabledReason: 'invalid-sequence' },
  'U1 re-record button should disappear as soon as the user starts opening the release stopcock',
);
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(visualReleaseOpeningAfterU1File, 'u2'),
  { visible: false, mode: 'record', disabledReason: 'release-not-started' },
  'U2 should not appear during the release-opening animation',
);

const releaseFlowStillOpenFile: WorkbenchHeatCapacityState = {
  ...visualReleaseOpeningAfterU1File,
  heatCapacityFreeRunWorkspace: {
    ...visualReleaseOpeningAfterU1File.heatCapacityFreeRunWorkspace,
    activeAttempt: transitionHeatCapacityFreeAttempt(
      visualReleaseOpeningAfterU1File.heatCapacityFreeRunWorkspace.activeAttempt!,
      attemptEvent('release-started', 60.42),
    ),
  },
  heatCapacityPhase: 'releasing',
  heatCapacityReleaseState: {
    ...visualReleaseOpeningAfterU1File.heatCapacityReleaseState,
    phase: 'releasing',
    openingCompletedAtS: 60.42,
    formedRelease: true,
    releaseDurationS: 0.1,
  },
  heatCapacityFreeInstrumentState: {
    ...visualReleaseOpeningAfterU1File.heatCapacityFreeInstrumentState,
    physics: {
      ...visualReleaseOpeningAfterU1File.heatCapacityFreeInstrumentState.physics,
      releaseStarted: true,
      releaseReference: {
        pressureBeforeKPa: 106,
        temperatureBeforeK: 298.8,
        amountBeforeRatio: 1.04,
        openedAtS: 65,
        reachedAmbientAtS: null,
      },
      lastStopcockOpenedAtS: 65,
      lastStopcockClosedAtS: null,
    },
  },
};
assert.equal(
  deriveHeatCapacityFreeWorkflowStage(releaseFlowStillOpenFile),
  'releasing',
  'Free workflow should stay in releasing until the release stopcock is closed',
);
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(releaseFlowStillOpenFile, 'u2'),
  { visible: false, mode: 'record', disabledReason: 'invalid-sequence' },
  'U2 record button should stay hidden while the stopcock is still open',
);

const releasedAfterU1File = createReleasedAfterU1File();
const repeatedU1AfterReleaseAttempt = applyHeatCapacityFreeRecordWorkbenchState(
  releasedAfterU1File,
  'u1',
  20_400,
);
assert.equal(
  repeatedU1AfterReleaseAttempt.accepted,
  false,
  'after release has started, U1 should be locked and cannot be overwritten',
);
assert.equal(repeatedU1AfterReleaseAttempt.reason, 'invalid-sequence');

const u2AfterReleaseAttempt = applyHeatCapacityFreeRecordWorkbenchState(
  releasedAfterU1File,
  'u2',
  20_500,
);
assert.equal(u2AfterReleaseAttempt.accepted, true);
assert.equal(u2AfterReleaseAttempt.file.heatCapacityFreeRunWorkspace.trials[0].u2?.displayPressureMv, 25.4);

const repeatedU2AfterReleaseAttempt = applyHeatCapacityFreeRecordWorkbenchState(
  {
    ...u2AfterReleaseAttempt.file,
    heatCapacityFreeInstrumentState: {
      ...u2AfterReleaseAttempt.file.heatCapacityFreeInstrumentState,
      sensor: {
        ...u2AfterReleaseAttempt.file.heatCapacityFreeInstrumentState.sensor,
        displayPressureMv: 27.88,
        displayTemperatureMv: 1499.05,
      },
    },
  },
  'u2',
  20_600,
);
assert.equal(
  repeatedU2AfterReleaseAttempt.accepted,
  true,
  'U2 should stay overwritable after release while the U2 record condition is satisfied',
);
assert.equal(repeatedU2AfterReleaseAttempt.file.heatCapacityFreeRunWorkspace.trials[0].u2?.displayPressureMv, 27.8);

const overAlarmU1Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createStableOverAlarmFreeU1File(),
  'u1',
  21_000,
);
assert.equal(
  overAlarmU1Attempt.accepted,
  true,
  'a stable over-alarm Free U1 should be recordable because the alarm only blocks further pumping',
);
assert.equal(overAlarmU1Attempt.reason, 'accepted');
assert.equal(overAlarmU1Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u1?.displayPressureMv, 151.9);

const noisyU0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createNoisyFreeU0File(),
  'u0',
  18_500,
);
assert.equal(
  noisyU0Attempt.accepted,
  true,
  'Free Mode U0 should keep only the U0/U1/U2 order gate and should not require the strict zeroed sample window',
);
assert.equal(noisyU0Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u0?.displayPressureMv, 0.1);
assert.equal(noisyU0Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u0?.displayTemperatureMv, 1499);
assert.equal(
  deriveHeatCapacityFreeWorkflowStage(noisyU0Attempt.file),
  'zeroing',
  'recording U0 should not advance Free Mode until the glass stopcock is closed',
);
assert.equal(getHeatCapacityFreeRecordBlockReason(noisyU0Attempt.file, 'u0'), null);
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(noisyU0Attempt.file, 'u0'),
  { visible: true, mode: 'rerecord', disabledReason: null },
  'U0 should switch to a visible re-record button while the zeroing stopcock is still open',
);
const repeatedU0WhileZeroingAttempt = applyHeatCapacityFreeRecordWorkbenchState(
  {
    ...noisyU0Attempt.file,
    pressureSignalMv: 0.34,
    temperatureSignalMv: 1499.14,
    heatCapacityFreeInstrumentState: {
      ...noisyU0Attempt.file.heatCapacityFreeInstrumentState,
      sensor: {
        ...noisyU0Attempt.file.heatCapacityFreeInstrumentState.sensor,
        displayPressureMv: 0.34,
        displayTemperatureMv: 1499.14,
      },
    },
  },
  'u0',
  18_550,
);
assert.equal(
  repeatedU0WhileZeroingAttempt.accepted,
  true,
  'U0 should be overwritable before the user closes the glass stopcock',
);
assert.equal(repeatedU0WhileZeroingAttempt.file.heatCapacityFreeRunWorkspace.trials[0].u0?.displayPressureMv, 0.3);
const closedAfterU0File = {
  ...repeatedU0WhileZeroingAttempt.file,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  glassPistonState: 'closed' as const,
  heatCapacityReleaseState: {
    ...repeatedU0WhileZeroingAttempt.file.heatCapacityReleaseState,
    phase: 'closed' as const,
    purpose: 'none' as const,
  },
};
assert.equal(deriveHeatCapacityFreeWorkflowStage(closedAfterU0File), 'beforePump');
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(closedAfterU0File, 'u0'),
  { visible: false, mode: 'rerecord', disabledReason: 'zero-not-ready' },
  'closing the glass stopcock should lock U0 and hide its re-record button',
);

const u1BeforePumpAttempt = applyHeatCapacityFreeRecordWorkbenchState(
  closedAfterU0File,
  'u1',
  18_560,
);
assert.equal(
  u1BeforePumpAttempt.accepted,
  false,
  'U1 should not be recordable before the first effective pump stroke',
);
assert.equal(u1BeforePumpAttempt.reason, 'invalid-sequence');

const strictNoisyU0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createNoisyFreeU0File(),
  'u0',
  18_600,
  { enforceRecordReadiness: true },
);
assert.equal(
  strictNoisyU0Attempt.accepted,
  false,
  'the strict record-readiness channel should remain available for guided modes',
);

const unzeroedU0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createUnzeroedFreeU0File(),
  'u0',
  18_700,
);
assert.equal(
  unzeroedU0Attempt.accepted,
  true,
  'Free Mode U0 should not require a zero-calibration event when strict readiness is disabled',
);
assert.equal(unzeroedU0Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u0?.zeroEventId, 'free-unzeroed-0');
const unzeroedU0Record = unzeroedU0Attempt.file.heatCapacityFreeRunWorkspace.trials[0].u0;
const unzeroedTraceTrial = unzeroedU0Attempt.file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find(
  (trial) => trial.id === unzeroedU0Record?.traceTrialId,
);
const unzeroedTraceBranch = unzeroedTraceTrial?.branches.find(
  (branch) => branch.id === unzeroedU0Record?.traceBranchId,
);
const unzeroedTraceSample = unzeroedTraceBranch?.samples.find(
  (sample) => sample.id === unzeroedU0Record?.traceSampleId,
);
assert.equal(
  unzeroedTraceSample?.calibration.zeroEventId,
  unzeroedU0Record?.zeroEventId,
  'an accepted record and its trace sample must share one calibration reference',
);
assert.equal(
  unzeroedTraceSample?.calibration.calibrationVersion,
  unzeroedU0Record?.calibrationVersion,
);

const powerOffU0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createPowerOffFreeU0File(),
  'u0',
  18_750,
);
assert.equal(
  powerOffU0Attempt.accepted,
  false,
  'Free Mode U0 should require instrument power even when strict readiness is disabled',
);
assert.equal(powerOffU0Attempt.reason, 'invalid-sequence');

const closedStopcockU0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createClosedStopcockFreeU0File(),
  'u0',
  18_760,
);
assert.equal(
  closedStopcockU0Attempt.accepted,
  false,
  'Free Mode U0 should require an open glass stopcock even when strict readiness is disabled',
);
assert.equal(closedStopcockU0Attempt.reason, 'zero-not-ready');

const strictUnzeroedU0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createUnzeroedFreeU0File(),
  'u0',
  18_800,
  { enforceRecordReadiness: true },
);
assert.equal(
  strictUnzeroedU0Attempt.accepted,
  false,
  'strict readiness should still require a real zero-calibration event',
);

const beforePowerSnapshot = captureHeatCapacityFreeRollbackSnapshot({
  ...noisyU0Attempt.file,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
});
const beforePumpSnapshot = captureHeatCapacityFreeRollbackSnapshot({
  ...closedAfterU0File,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pumpStrokeCount: 0,
  pumpStrokeTimestamps: [],
  heatCapacityFreeInstrumentState: {
    ...closedAfterU0File.heatCapacityFreeInstrumentState,
    physics: {
      ...closedAfterU0File.heatCapacityFreeInstrumentState.physics,
      pumpStrokeCount: 0,
      lastPumpStrokeAtS: null,
      lastPumpValveOpenedAtS: closedAfterU0File.heatCapacityFreeInstrumentState.physics.simulationTimeS,
      lastPumpValveClosedAtS: null,
    },
  },
});
const beforeReleaseSnapshot = captureHeatCapacityFreeRollbackSnapshot(repeatedU1BeforeReleaseAttempt.file);
const completedWithRollbackSnapshots: WorkbenchHeatCapacityState = {
  ...repeatedU2AfterReleaseAttempt.file,
  heatCapacityFreeRollbackSnapshots: {
    afterPowerOn: beforePowerSnapshot,
    beforePump: beforePumpSnapshot,
    beforeRelease: beforeReleaseSnapshot,
  },
};
const removeU2Rollback = removeHeatCapacityFreeTrialRecordWorkbenchState(
  completedWithRollbackSnapshots,
  0,
  'u2',
  22_000,
);
assert.equal(removeU2Rollback.heatCapacityFreeRunWorkspace.trials[0].u0 !== null, true);
assert.equal(removeU2Rollback.heatCapacityFreeRunWorkspace.trials[0].u1 !== null, true);
assert.equal(removeU2Rollback.heatCapacityFreeRunWorkspace.trials[0].u2, null);
assert.equal(deriveHeatCapacityFreeWorkflowStage(removeU2Rollback), 'beforeRelease');
assert.equal(
  removeU2Rollback.heatCapacityFreeInstrumentState.physics.releaseStarted,
  false,
  'deleting U2 should restore the pre-release physics snapshot',
);

const removeU1Rollback = removeHeatCapacityFreeTrialRecordWorkbenchState(
  completedWithRollbackSnapshots,
  0,
  'u1',
  22_100,
);
assert.equal(removeU1Rollback.heatCapacityFreeRunWorkspace.trials[0].u0 !== null, true);
assert.equal(removeU1Rollback.heatCapacityFreeRunWorkspace.trials[0].u1, null);
assert.equal(removeU1Rollback.heatCapacityFreeRunWorkspace.trials[0].u2, null);
assert.equal(deriveHeatCapacityFreeWorkflowStage(removeU1Rollback), 'beforePump');
assert.equal(removeU1Rollback.pumpValveOpen, true);
assert.equal(removeU1Rollback.heatCapacityFreeInstrumentState.physics.pumpStrokeCount, 0);

const removeU0Rollback = removeHeatCapacityFreeTrialRecordWorkbenchState(
  completedWithRollbackSnapshots,
  0,
  'u0',
  22_200,
);
assert.equal(removeU0Rollback.heatCapacityFreeRunWorkspace.trials[0].u0, null);
assert.notEqual(removeU0Rollback.heatCapacityFreeRunWorkspace.trials[0].u1, null);
assert.notEqual(removeU0Rollback.heatCapacityFreeRunWorkspace.trials[0].u2, null);
assert.equal(deriveHeatCapacityFreeWorkflowStage(removeU0Rollback), 'beforePowerOff');
assert.equal(removeU0Rollback.powerOn, true);
assert.equal(getHeatCapacityFreeRecordBlockReason(removeU0Rollback, 'u0'), 'invalid-sequence');
assert.equal(removeU0Rollback.pressureZeroAdjusted, completedWithRollbackSnapshots.pressureZeroAdjusted);

const realAverageTrial = createHeatCapacityFreeTrial('real-domain-trial', null, 'real');
const idealAverageTrial = createHeatCapacityFreeTrial('ideal-domain-trial', null, 'ideal');
const mixedDomainFile: WorkbenchHeatCapacityState = {
  ...createDefaultHeatCapacityFile(5),
  heatCapacityFreeRunWorkspace: {
    ...createDefaultHeatCapacityFile(5).heatCapacityFreeRunWorkspace,
    trials: [realAverageTrial],
  },
  heatCapacityFreeRealDomain: {
    ...createDefaultHeatCapacityFile(5).heatCapacityFreeRealDomain,
    trials: [realAverageTrial],
  },
  heatCapacityFreeIdealDomain: {
    ...createDefaultHeatCapacityFile(5).heatCapacityFreeIdealDomain,
    trials: [idealAverageTrial],
  },
};
assert.deepEqual(
  selectHeatCapacityFreeDomain(mixedDomainFile, 'real').trials.map((trial) => trial.id),
  ['real-domain-trial'],
  'Free Mode real-domain trials should stay isolated from ideal-domain trials',
);

const idealSelectedFile = setHeatCapacityFreeParameterSchemeWorkbenchState(
  createDefaultHeatCapacityFile(6),
  'ideal',
  31_000,
);
assert.equal(selectActiveHeatCapacityFreeDomain(idealSelectedFile).scheme, 'ideal');
const idealFileWithUnmarkedTrial: WorkbenchHeatCapacityState = {
  ...idealSelectedFile,
  heatCapacityFreeRunWorkspace: {
    ...idealSelectedFile.heatCapacityFreeRunWorkspace,
    trials: [createHeatCapacityFreeTrial('ideal-runtime-unmarked')],
  },
};
const idealResetFile = resetHeatCapacityFreeRunWorkbenchState(idealFileWithUnmarkedTrial, 31_500);
assert.equal(
  idealResetFile.heatCapacityFreeParameterScheme,
  'ideal',
  'resetting an ideal Free run should keep the active ideal parameter state',
);
assert.equal(
  idealResetFile.heatCapacityFreeDisplayScheme,
  'ideal',
  'resetting an ideal Free run should keep the display on the ideal domain',
);
assert.equal(
  idealResetFile.heatCapacityFreeRunWorkspace.trials.every((trial) => trial.parameterScheme === 'ideal'),
  true,
  'runtime trials should be stamped with the active ideal domain when stored',
);

const completedTrialTemplate = completedWithRollbackSnapshots.heatCapacityFreeRunWorkspace.trials[0];
assert.notEqual(completedTrialTemplate, undefined);
const idealTrialA = {
  ...completedTrialTemplate!,
  id: 'ideal-delete-a',
  parameterScheme: 'ideal' as const,
  traceTrialId: null,
  completedAtMs: 31_900,
};
const idealTrialB = {
  ...completedTrialTemplate!,
  id: 'ideal-delete-b',
  parameterScheme: 'ideal' as const,
  traceTrialId: null,
  completedAtMs: 31_950,
};
const idealFileWithTwoTrials: WorkbenchHeatCapacityState = {
  ...idealSelectedFile,
  heatCapacityFreeRunWorkspace: {
    ...idealSelectedFile.heatCapacityFreeRunWorkspace,
    trials: [idealTrialA, idealTrialB],
  },
  heatCapacityFreeIdealDomain: {
    ...idealSelectedFile.heatCapacityFreeIdealDomain,
    trials: [idealTrialA, idealTrialB],
  },
};
const idealAfterDeleteTrial = removeHeatCapacityFreeTrialRecordWorkbenchState(
  idealFileWithTwoTrials,
  0,
  'trial',
  32_000,
);
assert.deepEqual(
  idealAfterDeleteTrial.heatCapacityFreeIdealDomain.trials.map((trial) => trial.id),
  ['ideal-delete-b'],
  'deleting an ideal Free group should remove it from the active ideal domain, not only the transient runtime list',
);
assert.deepEqual(
  idealAfterDeleteTrial.heatCapacityFreeRunWorkspace.trials.map((trial) => trial.id),
  ['ideal-delete-b'],
  'deleting an ideal Free group should keep the top-level runtime list synchronized with the active domain',
);

const realTrialForDisplayedDelete = createHeatCapacityFreeTrial('real-delete-control', null, 'real');
const displayedIdealDeleteFile: WorkbenchHeatCapacityState = {
  ...createDefaultHeatCapacityFile(7),
  heatCapacityFreeParameterScheme: 'real',
  heatCapacityFreeDisplayScheme: 'ideal',
  heatCapacityFreeRunWorkspace: {
    ...createDefaultHeatCapacityFile(7).heatCapacityFreeRunWorkspace,
    trials: [realTrialForDisplayedDelete],
  },
  heatCapacityFreeRealDomain: {
    ...createDefaultHeatCapacityFile(7).heatCapacityFreeRealDomain,
    trials: [realTrialForDisplayedDelete],
  },
  heatCapacityFreeIdealDomain: {
    ...createDefaultHeatCapacityFile(7).heatCapacityFreeIdealDomain,
    trials: [idealTrialA, idealTrialB],
  },
};
const displayedIdealAfterDeleteTrial = removeHeatCapacityFreeTrialRecordWorkbenchState(
  displayedIdealDeleteFile,
  0,
  'trial',
  33_000,
  'ideal',
);
assert.deepEqual(
  displayedIdealAfterDeleteTrial.heatCapacityFreeIdealDomain.trials.map((trial) => trial.id),
  ['ideal-delete-b'],
  'deleting a displayed ideal group should update the ideal domain even when the active runtime domain is real',
);
assert.deepEqual(
  displayedIdealAfterDeleteTrial.heatCapacityFreeRealDomain.trials.map((trial) => trial.id),
  ['real-delete-control'],
  'deleting a displayed ideal group should not remove records from the active real domain',
);
assert.deepEqual(
  displayedIdealAfterDeleteTrial.heatCapacityFreeRunWorkspace.trials.map((trial) => trial.id),
  ['real-delete-control'],
  'deleting a displayed ideal group should leave the top-level runtime fields on the active real domain',
);

console.log('workbenchHeatCapacityFreeRecordAttempt tests passed');
