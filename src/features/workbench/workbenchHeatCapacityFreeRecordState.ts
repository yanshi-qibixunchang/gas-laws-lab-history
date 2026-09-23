import {
  createHeatCapacityFreeBatchTrial,
  createHeatCapacityFreeTrial,
  getHeatCapacityFreePublicZero,
  type HeatCapacityFreeRecordRejectReason,
  type HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { allocateHeatCapacityFreeTrialIdentity } from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  evaluateFreeU0Record,
  evaluateFreeU1Record,
  evaluateFreeU2Record,
  recordFreeU0,
  recordFreeU1,
  recordFreeU2,
  type HeatCapacityFreeRecordEvaluation,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import { getFreeTraceTrialBranchCount } from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
  isHeatCapacityReleaseFlowOpen,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  selectHeatCapacityFreeActiveRunConfigSnapshot,
  transactHeatCapacityFreeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  getHeatCapacityFreeAttemptPreheatOutcome,
  hasHeatCapacityFreeReleaseStarted,
  startHeatCapacityFreeWorkbenchAttempt,
  transitionHeatCapacityFreeWorkbenchAttempt,
} from './workbenchHeatCapacityFreeAttemptState.ts';
import { selectActiveHeatCapacityWorkbenchDisplay } from './workbenchHeatCapacityDisplayState.ts';
import { freezeHeatCapacityFreeParametersForCurrentGroup } from './workbenchHeatCapacityFreeParameterState.ts';
import { captureHeatCapacityFreeRollbackSnapshot } from './workbenchHeatCapacityFreeRollbackState.ts';
import {
  getActiveHeatCapacityFreeTrial,
  getActiveHeatCapacityFreeTrialIndex,
} from './workbenchHeatCapacityFreeTrialState.ts';
import {
  recordHeatCapacityFreeTraceEvent,
  recordHeatCapacityFreeTraceEventWithReference,
} from './workbenchHeatCapacityFreeTraceState.ts';
import { getHeatCapacityStopcockState } from './workbenchHeatCapacityInstrumentState.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';

export type HeatCapacityFreeWorkbenchRecordKind = 'u0' | 'u1' | 'u2';

export interface HeatCapacityFreeRecordButtonState {
  visible: boolean;
  mode: 'record' | 'rerecord';
  disabledReason: HeatCapacityFreeRecordRejectReason | null;
}

export type HeatCapacityFreeWorkbenchRecordAttempt =
  | {
      accepted: true;
      reason: 'accepted';
      kind: HeatCapacityFreeWorkbenchRecordKind;
      trialIndex: number;
      file: WorkbenchHeatCapacityState;
    }
  | {
      accepted: false;
      reason: HeatCapacityFreeRecordRejectReason;
      kind: HeatCapacityFreeWorkbenchRecordKind;
      trialIndex: number;
      file: WorkbenchHeatCapacityState;
    };

export interface HeatCapacityFreeWorkbenchRecordOptions {
  enforceRecordReadiness?: boolean;
}

export const getHeatCapacityFreeRecordedTrialIssue = (
  file: WorkbenchHeatCapacityState,
): 'missing-zero' | 'invalid-data' | null => {
  const trial = file.heatCapacityFreeRunWorkspace.trials.at(-1);
  if (!trial?.u2) return null;
  if (!getHeatCapacityFreePublicZero(trial)) return 'missing-zero';
  return trial.correctedSignals === null ? 'invalid-data' : null;
};

export const getHeatCapacityFreeRecordBlockReason = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
): HeatCapacityFreeRecordRejectReason | null => {
  const activeTrial = getActiveHeatCapacityFreeTrial(file);
  const releaseHasStarted = hasHeatCapacityFreeReleaseStarted(file);
  const attempt = file.heatCapacityFreeRunWorkspace.activeAttempt;
  if (!file.powerOn || attempt?.status === 'invalid') return 'invalid-sequence';

  if (kind === 'u0') {
    if (attempt !== null && attempt.effectivePumpCount > 0) return 'invalid-sequence';
    if (
      getHeatCapacityStopcockState(file.stopcockAngleDeg) !== 'open' ||
      !isHeatCapacityReleaseFlowOpen(file.heatCapacityReleaseState) ||
      file.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA
    ) return 'zero-not-ready';
    return null;
  }

  if (kind === 'u1') {
    if (!attempt || (attempt.stage !== 'waiting-u1' && attempt.stage !== 'u1-recorded')) {
      return 'invalid-sequence';
    }
    if (
      file.heatCapacityReleaseState.purpose === 'release' &&
      (file.heatCapacityReleaseState.phase === 'opening' || file.heatCapacityReleaseState.phase === 'closing')
    ) return 'invalid-sequence';
    if (file.pumpValveOpen || releaseHasStarted) return 'invalid-sequence';
    return null;
  }

  if (!activeTrial?.u1) return 'invalid-sequence';
  if (!releaseHasStarted) return 'release-not-started';
  if (!attempt || (attempt.stage !== 'waiting-u2' && attempt.stage !== 'u2-recorded')) {
    return 'invalid-sequence';
  }
  return null;
};

export const getHeatCapacityFreeRecordButtonState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
): HeatCapacityFreeRecordButtonState => {
  const activeTrial = getActiveHeatCapacityFreeTrial(file);
  const disabledReason = getHeatCapacityFreeRecordBlockReason(file, kind);
  const currentRecord = kind === 'u0'
    ? activeTrial?.u0
    : kind === 'u1'
      ? activeTrial?.u1
      : activeTrial?.u2;
  return {
    visible: disabledReason === null,
    mode: currentRecord ? 'rerecord' : 'record',
    disabledReason,
  };
};

const applyHeatCapacityFreeRecordWorkbenchStateCore = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
  now = Date.now(),
  options: HeatCapacityFreeWorkbenchRecordOptions = {},
): HeatCapacityFreeWorkbenchRecordAttempt => {
  const preflightBlockReason = getHeatCapacityFreeRecordBlockReason(file, kind);
  const sourceFile = preflightBlockReason === null && kind === 'u0'
    ? freezeHeatCapacityFreeParametersForCurrentGroup(file)
    : file;
  const config = sourceFile.heatCapacityFreeInstrumentConfig.record;
  const activeDisplay = selectActiveHeatCapacityWorkbenchDisplay(sourceFile);
  const display = {
    displayPressureMv: activeDisplay.pressureMv,
    displayTemperatureMv: activeDisplay.temperatureMv,
    pressureSlopeMvPerS: sourceFile.heatCapacityFreeInstrumentState.sensor.pressureSlopeMvPerS,
    temperatureSlopeMvPerS: sourceFile.heatCapacityFreeInstrumentState.sensor.temperatureSlopeMvPerS,
  };
  const activeTrialIndex = getActiveHeatCapacityFreeTrialIndex(sourceFile);
  const activeTrial = activeTrialIndex >= 0
    ? sourceFile.heatCapacityFreeRunWorkspace.trials[activeTrialIndex] ?? null
    : null;
  const releaseHasStarted = hasHeatCapacityFreeReleaseStarted(sourceFile);
  const recordBlockReason = preflightBlockReason ?? getHeatCapacityFreeRecordBlockReason(sourceFile, kind);
  const useLastTrial = recordBlockReason === null &&
    activeTrial !== null &&
    (
      (kind === 'u0' && (sourceFile.heatCapacityFreeRunWorkspace.activeAttempt?.effectivePumpCount ?? 0) === 0) ||
      (kind === 'u1' && !releaseHasStarted) ||
      (kind === 'u2' && activeTrial.u1 !== null && releaseHasStarted)
    );
  const trialIndex = useLastTrial
    ? activeTrialIndex
    : sourceFile.heatCapacityFreeRunWorkspace.trials.length;
  const trialIdentityAllocation = useLastTrial
    ? null
    : allocateHeatCapacityFreeTrialIdentity(sourceFile.heatCapacityFreeRunWorkspace.batch);
  const trialBase = useLastTrial
    ? activeTrial
    : trialIdentityAllocation
      ? createHeatCapacityFreeBatchTrial(
          trialIdentityAllocation.identity,
          sourceFile.heatCapacityFreeInstrumentState.calibration.automaticU0,
          sourceFile.heatCapacityFreeParameterScheme,
        )
      : createHeatCapacityFreeTrial(
          `unallocated-free-trial-${sourceFile.heatCapacityFreeRunWorkspace.trials.length + 1}`,
          sourceFile.heatCapacityFreeInstrumentState.calibration.automaticU0,
          sourceFile.heatCapacityFreeParameterScheme,
        );
  const trial: HeatCapacityFreeTrial = {
    ...trialBase,
    automaticU0: !trialBase.u0 && sourceFile.heatCapacityFreeInstrumentState.calibration.automaticU0
      ? sourceFile.heatCapacityFreeInstrumentState.calibration.automaticU0
      : trialBase.automaticU0,
    preheatOutcome: sourceFile.heatCapacityFreeRunWorkspace.activeAttempt?.preheatOutcome ??
      getHeatCapacityFreeAttemptPreheatOutcome(sourceFile),
  };
  const looseFreeU0BlockedReason: HeatCapacityFreeRecordRejectReason | null = (
    options.enforceRecordReadiness !== true &&
    kind === 'u0' &&
    (
      !sourceFile.powerOn ||
      getHeatCapacityStopcockState(sourceFile.stopcockAngleDeg) !== 'open' ||
      !isHeatCapacityReleaseFlowOpen(sourceFile.heatCapacityReleaseState)
    )
  ) ? 'zero-not-ready' : null;
  const evaluation: HeatCapacityFreeRecordEvaluation = recordBlockReason === null &&
    options.enforceRecordReadiness === true
    ? kind === 'u0'
      ? sourceFile.pressureZeroed
        ? evaluateFreeU0Record(
            trial,
            sourceFile.heatCapacityFreeInstrumentState.calibration,
            display,
            sourceFile.heatCapacityFreeInstrumentState.physics,
            config,
          )
        : { ready: false, reason: 'zero-not-ready' as const }
      : kind === 'u1'
        ? evaluateFreeU1Record(
            trial,
            sourceFile.heatCapacityFreeInstrumentState.calibration,
            display,
            sourceFile.heatCapacityFreeInstrumentState.physics,
            config,
          )
        : evaluateFreeU2Record(
            trial,
            sourceFile.heatCapacityFreeInstrumentState.calibration,
            display,
            sourceFile.heatCapacityFreeInstrumentState.physics,
            config,
          )
    : { ready: true, reason: 'ready' as const };
  const resolvedEvaluation: HeatCapacityFreeRecordEvaluation = recordBlockReason !== null
    ? { ready: false, reason: recordBlockReason }
    : !useLastTrial && trialIdentityAllocation === null
      ? { ready: false, reason: 'invalid-sequence' }
      : looseFreeU0BlockedReason === null
        ? evaluation
        : { ready: false, reason: looseFreeU0BlockedReason };

  if (resolvedEvaluation.ready === false) {
    const reason = resolvedEvaluation.reason;
    const blockedFile = recordHeatCapacityFreeTraceEvent(sourceFile, 'record-blocked', now, {
      kind,
      reason,
      trialIndex: trialIndex + 1,
    });
    return {
      accepted: false,
      reason,
      kind,
      trialIndex,
      file: {
        ...blockedFile,
        heatCapacityFreeRunWorkspace: {
          ...blockedFile.heatCapacityFreeRunWorkspace,
          trials: useLastTrial
            ? blockedFile.heatCapacityFreeRunWorkspace.trials.map((candidate, index) => (
                index === trialIndex ? { ...trial, blockedReason: reason } : candidate
              ))
            : blockedFile.heatCapacityFreeRunWorkspace.trials,
        },
        updatedAt: now,
      },
    };
  }

  const acceptedSourceFile = kind === 'u0'
    ? startHeatCapacityFreeWorkbenchAttempt(sourceFile, 'u0-recorded', now)
    : sourceFile;
  const latestZeroEventId = acceptedSourceFile.heatCapacityFreeInstrumentState.calibration.zeroEvents[
    acceptedSourceFile.heatCapacityFreeInstrumentState.calibration.zeroEvents.length - 1
  ]?.id ?? (
    options.enforceRecordReadiness === true
      ? ''
      : `free-unzeroed-${acceptedSourceFile.heatCapacityFreeInstrumentState.calibration.calibrationVersion}`
  );
  const recordReference = kind === 'u2' ? trial.u1 : kind === 'u1' ? trial.u0 : null;
  const input = {
    atS: acceptedSourceFile.heatCapacityFreeInstrumentState.physics.simulationTimeS,
    displayPressureMv: display.displayPressureMv,
    displayTemperatureMv: display.displayTemperatureMv,
    calibrationVersion: recordReference?.calibrationVersion ??
      acceptedSourceFile.heatCapacityFreeInstrumentState.calibration.calibrationVersion,
    zeroEventId: recordReference?.zeroEventId ?? latestZeroEventId,
  };
  const recordResult = kind === 'u0'
    ? recordFreeU0(trial, input)
    : kind === 'u1'
      ? recordFreeU1(trial, input)
      : recordFreeU2(trial, input, {
          atmosphericPressureKPa: acceptedSourceFile.heatCapacityFreeInstrumentConfig.environment.ambientPressureKPa,
          pressureSensitivityMvPerKPa: acceptedSourceFile.heatCapacityFreeInstrumentConfig.sensor.pressureMvPerKPa,
          theoreticalGamma: acceptedSourceFile.theoreticalGamma,
          preheatOutcome: trial.preheatOutcome ?? 'completed',
          preheatBiasSeed: `${acceptedSourceFile.id}:${trial.id}`,
        });

  if (!recordResult.accepted) {
    const reason = recordResult.reason === 'accepted' ? 'invalid-sequence' : recordResult.reason;
    return {
      accepted: false,
      reason,
      kind,
      trialIndex,
      file: recordHeatCapacityFreeTraceEvent(acceptedSourceFile, 'record-blocked', now, {
        kind,
        reason,
        trialIndex: trialIndex + 1,
      }),
    };
  }

  const recordTrace = recordHeatCapacityFreeTraceEventWithReference(
    acceptedSourceFile,
    kind === 'u0' ? 'record-u0' : kind === 'u1' ? 'record-u1' : 'record-u2',
    now,
    { kind, trialIndex: trialIndex + 1 },
    { calibrationVersion: input.calibrationVersion, zeroEventId: input.zeroEventId },
  );
  const traceTrial = recordTrace.file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((candidate) => (
    candidate.id === recordTrace.reference.traceTrialId
  ));
  const recordTrial = {
    ...recordResult.trial,
    configSnapshot: kind === 'u2'
      ? selectHeatCapacityFreeActiveRunConfigSnapshot(acceptedSourceFile)
      : recordResult.trial.configSnapshot,
    traceTrialId: recordTrace.reference.traceTrialId,
    branchCount: traceTrial ? getFreeTraceTrialBranchCount(traceTrial) : recordResult.trial.branchCount,
    u0: kind === 'u0' && recordResult.trial.u0
      ? { ...recordResult.trial.u0, ...recordTrace.reference }
      : recordResult.trial.u0,
    u1: kind === 'u1' && recordResult.trial.u1
      ? { ...recordResult.trial.u1, ...recordTrace.reference }
      : recordResult.trial.u1,
    u2: kind === 'u2' && recordResult.trial.u2
      ? { ...recordResult.trial.u2, ...recordTrace.reference }
      : recordResult.trial.u2,
  };
  const heatCapacityFreeTrials = useLastTrial
    ? recordTrace.file.heatCapacityFreeRunWorkspace.trials.map((candidate, index) => (
        index === trialIndex ? recordTrial : candidate
      ))
    : [...recordTrace.file.heatCapacityFreeRunWorkspace.trials, recordTrial];
  const acceptedFileBase: WorkbenchHeatCapacityState = {
    ...recordTrace.file,
    heatCapacityFreeRunWorkspace: {
      ...recordTrace.file.heatCapacityFreeRunWorkspace,
      batch: trialIdentityAllocation?.batch ?? recordTrace.file.heatCapacityFreeRunWorkspace.batch,
      trials: heatCapacityFreeTrials,
      currentExperimentStatus: kind === 'u2'
        ? recordTrial.correctedSignals !== null ? 'completed' : 'running'
        : recordTrace.file.heatCapacityFreeRunWorkspace.currentExperimentStatus,
    },
    updatedAt: now,
  };
  const acceptedFile = kind === 'u1'
    ? transitionHeatCapacityFreeWorkbenchAttempt(acceptedFileBase, 'u1-recorded', now)
    : kind === 'u2'
      ? transitionHeatCapacityFreeWorkbenchAttempt(acceptedFileBase, 'u2-recorded', now)
      : acceptedFileBase;
  const fileWithRollbackSnapshot = kind === 'u1'
    ? {
        ...acceptedFile,
        heatCapacityFreeRollbackSnapshots: {
          ...acceptedFile.heatCapacityFreeRollbackSnapshots,
          beforeRelease: captureHeatCapacityFreeRollbackSnapshot(acceptedFile),
        },
      }
    : acceptedFile;

  return {
    accepted: true,
    reason: 'accepted',
    kind,
    trialIndex,
    file: fileWithRollbackSnapshot,
  };
};

export const applyHeatCapacityFreeRecordWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
  now = Date.now(),
  options: HeatCapacityFreeWorkbenchRecordOptions = {},
): HeatCapacityFreeWorkbenchRecordAttempt => {
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = file.heatCapacityMode === 'free'
    ? transactHeatCapacityFreeAuthority(
        file,
        (authority) => authority,
        { commitRuntimeScheme: scheme },
      )
    : file;
  const attempt = applyHeatCapacityFreeRecordWorkbenchStateCore(hydratedFile, kind, now, options);
  return {
    ...attempt,
    file: attempt.file.heatCapacityMode === 'free'
      ? commitHeatCapacityFreeRuntimeAuthorityTransaction(attempt.file, scheme)
      : attempt.file,
  };
};
