import type { HeatCapacityFreePhysicsState } from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import type { HeatCapacityFreeSensorState } from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import type { HeatCapacityFreeCalibrationState } from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import { createHeatCapacityFreeAttempt } from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import {
  removeHeatCapacityFreeTrialRecord,
  type HeatCapacityFreeTrialRecordRemovalKind,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { archiveCurrentFreeTraceBranchForRecordInvalidation } from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import { createClosedHeatCapacityReleaseState } from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  hydrateHeatCapacityFreeAuthorityProjection,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import { getHeatCapacityFreeAttemptPreheatOutcome } from './workbenchHeatCapacityFreeAttemptState.ts';
import { HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG } from './workbenchHeatCapacityInstrumentState.ts';
import { mergeHeatCapacityFreeRuntimeState } from './workbenchHeatCapacityFreeRuntimeState.ts';
import {
  getActiveHeatCapacityFreeTrial,
  isHeatCapacityFreeTrialComplete,
} from './workbenchHeatCapacityFreeTrialState.ts';
import {
  recordHeatCapacityFreeTraceEvent,
  removeHeatCapacityFreeTraceTrialFromStore,
  syncFreeTrialBranchReference,
} from './workbenchHeatCapacityFreeTraceState.ts';
import type {
  HeatCapacityFreeParameterScheme,
  HeatCapacityFreeRollbackSnapshot,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const cloneHeatCapacityFreePhysicsState = (
  state: HeatCapacityFreePhysicsState,
): HeatCapacityFreePhysicsState => ({
  ...state,
  pumpProcesses: state.pumpProcesses.map((process) => ({ ...process })),
  releaseReference: state.releaseReference ? { ...state.releaseReference } : null,
});

const cloneHeatCapacityFreeSensorState = (
  state: HeatCapacityFreeSensorState,
): HeatCapacityFreeSensorState => ({
  ...state,
  pressureHistory: state.pressureHistory.map((sample) => ({ ...sample })),
  temperatureHistory: state.temperatureHistory.map((sample) => ({ ...sample })),
});

const cloneHeatCapacityFreeCalibrationState = (
  state: HeatCapacityFreeCalibrationState,
): HeatCapacityFreeCalibrationState => ({
  ...state,
  zeroEvents: state.zeroEvents.map((event) => ({ ...event })),
  automaticU0: state.automaticU0 ? { ...state.automaticU0 } : null,
});

const cloneHeatCapacityFreeRollbackSnapshot = (
  snapshot: HeatCapacityFreeRollbackSnapshot,
): HeatCapacityFreeRollbackSnapshot => ({
  ...snapshot,
  pressureZeroDisplayedSamples: snapshot.pressureZeroDisplayedSamples.map((sample) => ({ ...sample })),
  pumpStrokeTimestamps: [...snapshot.pumpStrokeTimestamps],
  heatCapacityFreePhysicsState: cloneHeatCapacityFreePhysicsState(snapshot.heatCapacityFreePhysicsState),
  heatCapacityFreeSensorState: cloneHeatCapacityFreeSensorState(snapshot.heatCapacityFreeSensorState),
  heatCapacityFreeCalibrationState: cloneHeatCapacityFreeCalibrationState(snapshot.heatCapacityFreeCalibrationState),
  heatCapacityReleaseState: { ...snapshot.heatCapacityReleaseState },
});

export const captureHeatCapacityFreeRollbackSnapshot = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeRollbackSnapshot => ({
  powerOn: file.powerOn,
  runState: file.runState,
  heatCapacityPhase: file.heatCapacityPhase,
  glassPistonState: file.glassPistonState,
  stopcockAngleDeg: file.stopcockAngleDeg,
  pressureSignalMv: file.pressureSignalMv,
  temperatureSignalMv: file.temperatureSignalMv,
  pressureSignalTargetMv: file.pressureSignalTargetMv,
  temperatureSignalTargetMv: file.temperatureSignalTargetMv,
  pressureInitialBiasMv: file.pressureInitialBiasMv,
  pressureZeroed: file.pressureZeroed,
  pressureZeroAdjusted: file.pressureZeroAdjusted,
  pressureZeroKnobAngle: file.pressureZeroKnobAngle,
  pressureZeroOffset: file.pressureZeroOffset,
  pressureZeroDisplayText: file.pressureZeroDisplayText,
  pressureZeroAdjustMode: file.pressureZeroAdjustMode,
  pressureZeroDisplayedSamples: file.pressureZeroDisplayedSamples.map((sample) => ({ ...sample })),
  pumpValveOpen: file.pumpValveOpen,
  pumpValveState: file.pumpValveState,
  pumpBulbState: file.pumpBulbState,
  pumpStrokeTimestamps: [...file.pumpStrokeTimestamps],
  pumpFrequency: file.pumpFrequency,
  pumpFrequencyStatus: file.pumpFrequencyStatus,
  lastPumpTime: file.lastPumpTime,
  pumpStrokeCount: file.pumpStrokeCount,
  pumpHint: file.pumpHint,
  heatCapacityFreePhysicsState: cloneHeatCapacityFreePhysicsState(file.heatCapacityFreeInstrumentState.physics),
  heatCapacityFreeSensorState: cloneHeatCapacityFreeSensorState(file.heatCapacityFreeInstrumentState.sensor),
  heatCapacityFreeCalibrationState: cloneHeatCapacityFreeCalibrationState(file.heatCapacityFreeInstrumentState.calibration),
  heatCapacityReleaseState: { ...file.heatCapacityReleaseState },
});

const restoreHeatCapacityFreeRollbackSnapshot = (
  file: WorkbenchHeatCapacityState,
  snapshot: HeatCapacityFreeRollbackSnapshot,
  now: number,
): WorkbenchHeatCapacityState => {
  const clonedSnapshot = cloneHeatCapacityFreeRollbackSnapshot(snapshot);
  const restoredFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...file,
      powerOn: clonedSnapshot.powerOn,
      runState: clonedSnapshot.runState,
      heatCapacityPhase: clonedSnapshot.heatCapacityPhase,
      glassPistonState: clonedSnapshot.glassPistonState,
      stopcockAngleDeg: clonedSnapshot.stopcockAngleDeg,
      pressureSignalMv: clonedSnapshot.pressureSignalMv,
      temperatureSignalMv: clonedSnapshot.temperatureSignalMv,
      pressureSignalTargetMv: clonedSnapshot.pressureSignalTargetMv,
      temperatureSignalTargetMv: clonedSnapshot.temperatureSignalTargetMv,
      pressureInitialBiasMv: clonedSnapshot.pressureInitialBiasMv,
      pressureZeroed: clonedSnapshot.pressureZeroed,
      pressureZeroAdjusted: clonedSnapshot.pressureZeroAdjusted,
      pressureZeroKnobAngle: clonedSnapshot.pressureZeroKnobAngle,
      pressureZeroOffset: clonedSnapshot.pressureZeroOffset,
      pressureZeroDisplayText: clonedSnapshot.pressureZeroDisplayText,
      pressureZeroAdjustMode: clonedSnapshot.pressureZeroAdjustMode,
      pressureZeroDisplayedSamples: clonedSnapshot.pressureZeroDisplayedSamples,
      pumpValveOpen: clonedSnapshot.pumpValveOpen,
      pumpValveState: clonedSnapshot.pumpValveState,
      pumpBulbState: clonedSnapshot.pumpBulbState,
      pumpStrokeTimestamps: clonedSnapshot.pumpStrokeTimestamps,
      pumpFrequency: clonedSnapshot.pumpFrequency,
      pumpFrequencyStatus: clonedSnapshot.pumpFrequencyStatus,
      lastPumpTime: clonedSnapshot.lastPumpTime,
      pumpStrokeCount: clonedSnapshot.pumpStrokeCount,
      pumpHint: clonedSnapshot.pumpHint,
      heatCapacityReleaseState: { ...clonedSnapshot.heatCapacityReleaseState },
      updatedAt: now,
    },
    clonedSnapshot.heatCapacityFreePhysicsState,
    clonedSnapshot.heatCapacityFreeSensorState,
    clonedSnapshot.heatCapacityFreeCalibrationState,
    now,
  );
  return {
    ...restoredFile,
    pressureZeroAdjusted: clonedSnapshot.pressureZeroAdjusted,
    pressureZeroKnobAngle: clonedSnapshot.pressureZeroKnobAngle,
    pressureZeroDisplayText: clonedSnapshot.pressureZeroDisplayText,
    pressureZeroAdjustMode: clonedSnapshot.pressureZeroAdjustMode,
    pumpValveOpen: clonedSnapshot.pumpValveOpen,
    pumpValveState: clonedSnapshot.pumpValveState,
    pumpBulbState: clonedSnapshot.pumpBulbState,
    pumpStrokeTimestamps: clonedSnapshot.pumpStrokeTimestamps,
    pumpFrequency: clonedSnapshot.pumpFrequency,
    pumpFrequencyStatus: clonedSnapshot.pumpFrequencyStatus,
    lastPumpTime: clonedSnapshot.lastPumpTime,
    pumpStrokeCount: clonedSnapshot.pumpStrokeCount,
    pumpHint: clonedSnapshot.pumpHint,
    heatCapacityReleaseState: { ...clonedSnapshot.heatCapacityReleaseState },
    updatedAt: now,
  };
};

const restoreActiveAttemptToU1Recorded = (file: WorkbenchHeatCapacityState) => {
  const attempt = file.heatCapacityFreeRunWorkspace.activeAttempt;
  return attempt
    ? {
        ...attempt,
        status: 'active' as const,
        stage: 'u1-recorded' as const,
        releaseStartedAtS: null,
        releaseClosedAtS: null,
        u2WaitStartedAtS: null,
        u2RecordedAtS: null,
        invalidReason: null,
        invalidatedAtS: null,
        invalidatedAtWallClockMs: null,
        invalidPromptDismissed: false,
      }
    : attempt;
};

const applyHeatCapacityFreeRemovalRollback = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeTrialRecordRemovalKind,
  now: number,
): WorkbenchHeatCapacityState => {
  if (kind === 'u0') {
    const currentTrial = getActiveHeatCapacityFreeTrial(file);
    const attemptHasPhysicalProgress = (file.heatCapacityFreeRunWorkspace.activeAttempt?.effectivePumpCount ?? 0) > 0 ||
      currentTrial?.u1 != null || currentTrial?.u2 != null;
    return {
      ...file,
      heatCapacityFreeRunWorkspace: {
        ...file.heatCapacityFreeRunWorkspace,
        activeAttempt: attemptHasPhysicalProgress ? file.heatCapacityFreeRunWorkspace.activeAttempt : null,
        currentExperimentStatus: attemptHasPhysicalProgress
          ? file.heatCapacityFreeRunWorkspace.currentExperimentStatus
          : 'draft',
      },
      updatedAt: now,
    };
  }
  if (kind === 'u1') {
    const snapshot = file.heatCapacityFreeRollbackSnapshots.beforePump;
    if (snapshot) {
      const restored = restoreHeatCapacityFreeRollbackSnapshot(file, snapshot, now);
      const currentTrial = getActiveHeatCapacityFreeTrial(restored);
      return {
        ...restored,
        heatCapacityFreeRunWorkspace: {
          ...restored.heatCapacityFreeRunWorkspace,
          activeAttempt: currentTrial?.u0
            ? createHeatCapacityFreeAttempt({
                startReason: 'u0-recorded',
                preheatOutcome: currentTrial.preheatOutcome ?? getHeatCapacityFreeAttemptPreheatOutcome(restored),
                atS: currentTrial.u0.atS,
                wallClockMs: now,
                powerOn: restored.powerOn,
              })
            : null,
        },
      };
    }
    const fallbackFile: WorkbenchHeatCapacityState = {
      ...file,
      pumpValveOpen: true,
      pumpValveState: 'open',
      pumpStrokeTimestamps: [],
      pumpFrequency: 0,
      pumpFrequencyStatus: 'idle',
      lastPumpTime: null,
      pumpStrokeCount: 0,
      pumpHint: '打气阀门已打开',
      heatCapacityFreeInstrumentState: {
        ...file.heatCapacityFreeInstrumentState,
        physics: {
          ...file.heatCapacityFreeInstrumentState.physics,
          pumpStrokeCount: 0,
          pumpProcesses: [],
          lastPumpStrokeAtS: null,
          releaseStarted: false,
          releaseReference: null,
        },
      },
      heatCapacityFreeRollbackSnapshots: {
        ...file.heatCapacityFreeRollbackSnapshots,
        beforeRelease: null,
      },
      heatCapacityFreeRunWorkspace: {
        ...file.heatCapacityFreeRunWorkspace,
        currentExperimentStatus: 'running',
      },
      updatedAt: now,
    };
    const currentTrial = getActiveHeatCapacityFreeTrial(fallbackFile);
    return {
      ...fallbackFile,
      heatCapacityFreeRunWorkspace: {
        ...fallbackFile.heatCapacityFreeRunWorkspace,
        activeAttempt: currentTrial?.u0
          ? createHeatCapacityFreeAttempt({
              startReason: 'u0-recorded',
              preheatOutcome: currentTrial.preheatOutcome ?? getHeatCapacityFreeAttemptPreheatOutcome(fallbackFile),
              atS: currentTrial.u0.atS,
              wallClockMs: now,
              powerOn: fallbackFile.powerOn,
            })
          : null,
      },
    };
  }
  if (kind === 'u2') {
    const snapshot = file.heatCapacityFreeRollbackSnapshots.beforeRelease;
    if (snapshot) {
      const restored = restoreHeatCapacityFreeRollbackSnapshot(file, snapshot, now);
      return {
        ...restored,
        heatCapacityFreeRunWorkspace: {
          ...restored.heatCapacityFreeRunWorkspace,
          activeAttempt: restoreActiveAttemptToU1Recorded(file),
        },
      };
    }
    const fallbackFile: WorkbenchHeatCapacityState = {
      ...file,
      glassPistonState: 'closed',
      stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
      heatCapacityReleaseState: createClosedHeatCapacityReleaseState(
        file.heatCapacityFreeInstrumentState.physics.simulationTimeS,
      ),
      heatCapacityFreeInstrumentState: {
        ...file.heatCapacityFreeInstrumentState,
        physics: {
          ...file.heatCapacityFreeInstrumentState.physics,
          releaseStarted: false,
          releaseReference: null,
          lastStopcockClosedAtS: file.heatCapacityFreeInstrumentState.physics.simulationTimeS,
        },
      },
      heatCapacityFreeRunWorkspace: {
        ...file.heatCapacityFreeRunWorkspace,
        currentExperimentStatus: 'running',
      },
      updatedAt: now,
    };
    return {
      ...fallbackFile,
      heatCapacityFreeRunWorkspace: {
        ...fallbackFile.heatCapacityFreeRunWorkspace,
        activeAttempt: restoreActiveAttemptToU1Recorded(fallbackFile),
      },
    };
  }
  return file;
};

const removeHeatCapacityFreeTrialRecordWorkbenchStateCore = (
  file: WorkbenchHeatCapacityState,
  trialIndex: number,
  kind: HeatCapacityFreeTrialRecordRemovalKind,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityFreeRunWorkspace.trials.length === 0) return file;
  if (file.heatCapacityFreeRunWorkspace.batch.experimentCompletedAtMs !== null) return file;
  const boundedIndex = Math.min(file.heatCapacityFreeRunWorkspace.trials.length - 1, Math.max(0, trialIndex));
  const removedTrial = file.heatCapacityFreeRunWorkspace.trials[boundedIndex];
  const removedTrialComplete = isHeatCapacityFreeTrialComplete(removedTrial) && removedTrial.completedAtMs !== null;
  if (kind === 'trial' ? !removedTrialComplete : removedTrialComplete) return file;
  const removal = removeHeatCapacityFreeTrialRecord(file.heatCapacityFreeRunWorkspace.trials, boundedIndex, kind);

  if (kind === 'trial') {
    return {
      ...file,
      heatCapacityFreeRunWorkspace: {
        ...file.heatCapacityFreeRunWorkspace,
        trials: removal.trials,
        traceStore: removeHeatCapacityFreeTraceTrialFromStore(
          file.heatCapacityFreeRunWorkspace.traceStore,
          removedTrial.traceTrialId,
        ),
      },
      updatedAt: now,
    };
  }

  const traceTrialId = removedTrial.traceTrialId ?? file.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId;
  const fileWithRemovedRecord: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      trials: removal.trials,
      currentExperimentStatus: kind === 'u2' || kind === 'u1'
        ? 'running'
        : file.heatCapacityFreeRunWorkspace.currentExperimentStatus,
    },
    updatedAt: now,
  };
  if (!traceTrialId) return applyHeatCapacityFreeRemovalRollback(fileWithRemovedRecord, kind, now);
  const hasTraceTrial = file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.some(
    (traceTrial) => traceTrial.id === traceTrialId,
  );
  if (!hasTraceTrial) return applyHeatCapacityFreeRemovalRollback(fileWithRemovedRecord, kind, now);

  let nextFile: WorkbenchHeatCapacityState = {
    ...fileWithRemovedRecord,
    heatCapacityFreeRunWorkspace: {
      ...fileWithRemovedRecord.heatCapacityFreeRunWorkspace,
      traceStore: {
        ...file.heatCapacityFreeRunWorkspace.traceStore,
        activeTraceTrialId: traceTrialId,
      },
    },
  };
  nextFile = recordHeatCapacityFreeTraceEvent(nextFile, 'record-invalidated', now, {
    kind,
    trialIndex: boundedIndex + 1,
  });
  const archive = archiveCurrentFreeTraceBranchForRecordInvalidation(
    nextFile.heatCapacityFreeRunWorkspace.traceStore,
    traceTrialId,
  );
  nextFile = {
    ...nextFile,
    heatCapacityFreeRunWorkspace: {
      ...nextFile.heatCapacityFreeRunWorkspace,
      traceStore: archive.store,
      trials: archive.branchCount > 0
        ? syncFreeTrialBranchReference(
            nextFile.heatCapacityFreeRunWorkspace.trials,
            boundedIndex,
            traceTrialId,
            archive.branchCount,
          )
        : nextFile.heatCapacityFreeRunWorkspace.trials,
    },
  };
  if (archive.archivedBranchId && archive.newBranchId) {
    nextFile = recordHeatCapacityFreeTraceEvent(nextFile, 'branch-created', now, {
      kind,
      trialIndex: boundedIndex + 1,
      archivedBranchId: archive.archivedBranchId,
      branchId: archive.newBranchId,
    });
  }
  return applyHeatCapacityFreeRemovalRollback(nextFile, kind, now);
};

export const removeHeatCapacityFreeTrialRecordWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  trialIndex: number,
  kind: HeatCapacityFreeTrialRecordRemovalKind,
  now = Date.now(),
  scheme: HeatCapacityFreeParameterScheme = file.heatCapacityMode === 'free'
    ? file.heatCapacityFreeParameterScheme
    : 'real',
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    return removeHeatCapacityFreeTrialRecordWorkbenchStateCore(file, trialIndex, kind, now);
  }
  const storedActiveFile = commitHeatCapacityFreeRuntimeAuthorityTransaction(
    file,
    file.heatCapacityFreeParameterScheme,
  );
  const hydratedFile = hydrateHeatCapacityFreeAuthorityProjection(storedActiveFile, scheme);
  const nextFile = removeHeatCapacityFreeTrialRecordWorkbenchStateCore(
    hydratedFile,
    trialIndex,
    kind,
    now,
  );
  const nextStoredFile = commitHeatCapacityFreeRuntimeAuthorityTransaction(nextFile, scheme);
  return hydrateHeatCapacityFreeAuthorityProjection(
    nextStoredFile,
    nextStoredFile.heatCapacityFreeParameterScheme,
  );
};
