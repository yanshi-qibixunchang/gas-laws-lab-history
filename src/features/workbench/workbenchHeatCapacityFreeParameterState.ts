import {
  isHeatCapacityFreeBatchLocked,
  startHeatCapacityFreeBatch,
} from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  selectCurrentHeatCapacityFreeExperimentGroup,
  startHeatCapacityFreeExperimentGroup,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  applyHeatCapacityFreeGasTypeModelDefaultsToDraft,
  applyHeatCapacityFreeParameterDraftToConfigs,
  createHeatCapacityFreeParameterDraftFromConfigs,
  getHeatCapacityFreeIdealTheoreticalGamma,
  normalizeHeatCapacityFreeGasType,
  normalizeHeatCapacityFreeParameterDraft,
  type HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeParameterLockReasonId,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  selectActiveHeatCapacityFreeDomain,
  selectHeatCapacityFreeAppliedParameterDraft,
  selectHeatCapacityFreeGasType,
  setHeatCapacityFreeActiveGasTypeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  createHeatCapacityFreeRuntimeConfigSnapshotFromFile,
} from './workbenchHeatCapacityFreeConfigSnapshot.ts';
import {
  createDefaultHeatCapacityFreeParameterState,
  createHeatCapacityFreeIdealParameterState,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
import {
  resetHeatCapacityFreeRunWorkbenchState,
} from './workbenchHeatCapacityFreeRunReset.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

type WorkbenchFileCandidate = (
  { kind: string } & Partial<Omit<WorkbenchHeatCapacityState, 'kind'>>
) | null;

const HEAT_CAPACITY_FREE_DEFAULT_HARD_SPHERE_VIEW_ENABLED = false;

const asHeatCapacityFile = (
  file: WorkbenchFileCandidate,
): WorkbenchHeatCapacityState | null => (
  file?.kind === 'heatCapacity'
    ? file as WorkbenchHeatCapacityState
    : null
);

export {
  createDefaultHeatCapacityFreeParameterState,
  createHeatCapacityFreeIdealParameterState,
} from './workbenchHeatCapacityRuntimeDefaults.ts';

export const hasCompletedHeatCapacityFreeRecordSet = (
  file: WorkbenchFileCandidate,
): boolean => {
  const heatCapacityFile = asHeatCapacityFile(file);
  if (heatCapacityFile?.heatCapacityMode !== 'free') return false;
  const trials = heatCapacityFile.heatCapacityFreeRunWorkspace.trials;
  const latestTrial = trials[trials.length - 1] ?? null;
  return Boolean(latestTrial?.u1 && latestTrial.u2 && latestTrial.correctedSignals);
};

export const isHeatCapacityFreeExperimentGroupComplete = (
  file: WorkbenchFileCandidate,
): boolean => {
  const heatCapacityFile = asHeatCapacityFile(file);
  return Boolean(
    heatCapacityFile?.heatCapacityMode === 'free' &&
    heatCapacityFile.heatCapacityFreeRunWorkspace.currentExperimentStatus === 'completed' &&
    heatCapacityFile.heatCapacityFreeRunWorkspace.activeAttempt?.status !== 'invalid' &&
    hasCompletedHeatCapacityFreeRecordSet(heatCapacityFile) &&
    !heatCapacityFile.powerOn
  );
};

export const shouldPromptHeatCapacityFreePowerOffBeforeNextGroup = (
  file: WorkbenchFileCandidate,
): boolean => {
  const heatCapacityFile = asHeatCapacityFile(file);
  return Boolean(
    heatCapacityFile?.heatCapacityMode === 'free' &&
    heatCapacityFile.heatCapacityFreeRunWorkspace.currentExperimentStatus === 'completed' &&
    heatCapacityFile.heatCapacityFreeRunWorkspace.activeAttempt?.status !== 'invalid' &&
    hasCompletedHeatCapacityFreeRecordSet(heatCapacityFile) &&
    heatCapacityFile.powerOn
  );
};

export const isHeatCapacityFreeParameterEditingAvailable = (
  file: WorkbenchFileCandidate,
): file is WorkbenchHeatCapacityState => {
  const heatCapacityFile = asHeatCapacityFile(file);
  return Boolean(
    heatCapacityFile?.heatCapacityMode === 'free' &&
    !isHeatCapacityFreeBatchLocked(selectActiveHeatCapacityFreeDomain(heatCapacityFile).batch) &&
    (
      heatCapacityFile.heatCapacityFreeRunWorkspace.currentExperimentStatus === 'draft' ||
      isHeatCapacityFreeExperimentGroupComplete(heatCapacityFile)
    ) &&
    heatCapacityFile.runState !== 'running' &&
    heatCapacityFile.runState !== 'paused'
  );
};

export const isHeatCapacityFreeGasTypeEditingAvailable = (
  file: WorkbenchFileCandidate,
): boolean => {
  const heatCapacityFile = asHeatCapacityFile(file);
  return Boolean(
    heatCapacityFile &&
    isHeatCapacityFreeParameterEditingAvailable(heatCapacityFile) &&
    heatCapacityFile.heatCapacityFreeRunWorkspace.trials.length === 0
  );
};

export const getHeatCapacityFreeParameterLockReason = (
  file: WorkbenchFileCandidate,
): HeatCapacityFreeParameterLockReasonId | null => {
  const heatCapacityFile = asHeatCapacityFile(file);
  if (!heatCapacityFile) return null;
  if (heatCapacityFile.heatCapacityMode !== 'free') return 'freeModeOnly';
  if (heatCapacityFile.runState === 'running' || heatCapacityFile.runState === 'paused') {
    return 'runningOrPaused';
  }
  if (shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(heatCapacityFile)) {
    return 'powerOffBeforeNextGroup';
  }
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    heatCapacityFile.heatCapacityFreeExperimentGroups,
  );
  if (
    currentGroup?.status === 'collecting' &&
    currentGroup.runSeries.trials.length === 0
  ) {
    return 'groupStarted';
  }
  if (isHeatCapacityFreeBatchLocked(selectActiveHeatCapacityFreeDomain(heatCapacityFile).batch)) {
    return 'batchStarted';
  }
  if (isHeatCapacityFreeExperimentGroupComplete(heatCapacityFile)) {
    return null;
  }
  if (heatCapacityFile.heatCapacityFreeRunWorkspace.currentExperimentStatus !== 'draft') {
    return 'groupStarted';
  }
  return null;
};

export const canOpenHeatCapacityParameterSidebar = (
  file: WorkbenchFileCandidate,
) => file?.kind !== 'heatCapacity' || asHeatCapacityFile(file)?.heatCapacityMode === 'free';

export const getHeatCapacityParameterSidebarBlockReason = (
  file: WorkbenchFileCandidate,
): HeatCapacityFreeParameterLockReasonId | null => {
  const heatCapacityFile = asHeatCapacityFile(file);
  return heatCapacityFile && heatCapacityFile.heatCapacityMode !== 'free'
    ? 'freeModeOnly'
    : null;
};

export const applyHeatCapacityFreeParameterDraftConfigWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  draft: HeatCapacityFreeParameterDraft,
): WorkbenchHeatCapacityState => {
  if (!isHeatCapacityFreeParameterEditingAvailable(file)) return file;
  const gasTypeEditingAvailable = isHeatCapacityFreeGasTypeEditingAvailable(file);
  const appliedDraft = selectHeatCapacityFreeAppliedParameterDraft(file);
  const lockedGasType = selectHeatCapacityFreeGasType(file);
  const requestedGasType = normalizeHeatCapacityFreeGasType(draft.gasType, lockedGasType);
  if (file.heatCapacityFreeParameterScheme === 'ideal') {
    const gasType = gasTypeEditingAvailable ? requestedGasType : lockedGasType;
    const parameterState = createHeatCapacityFreeIdealParameterState(gasType);
    return setHeatCapacityFreeActiveGasTypeAuthority({
      ...file,
      heatCapacityFreeInstrumentConfig: {
        environment: parameterState.environmentConfig,
        physics: parameterState.physicsConfig,
        sensor: parameterState.sensorConfig,
        record: parameterState.recordConfig,
        pressureWarningMv: parameterState.pressureWarningMv,
        instrumentNoiseEnabled: parameterState.instrumentNoiseEnabled,
      },
      theoreticalGamma: getHeatCapacityFreeIdealTheoreticalGamma(gasType),
    }, gasType);
  }
  const gasTypeChanged = gasTypeEditingAvailable && requestedGasType !== lockedGasType;
  const shouldApplyGasTypeModelDefaults = gasTypeChanged &&
    draft.gasWallConductanceWPerK === appliedDraft.gasWallConductanceWPerK &&
    draft.leakageRatePerS === appliedDraft.leakageRatePerS;
  const requestedDraft = shouldApplyGasTypeModelDefaults
    ? applyHeatCapacityFreeGasTypeModelDefaultsToDraft(draft, requestedGasType)
    : draft;
  const normalizedDraft = normalizeHeatCapacityFreeParameterDraft(
    gasTypeEditingAvailable
      ? requestedDraft
      : {
          ...requestedDraft,
          gasType: lockedGasType,
        },
    appliedDraft,
  );
  const parameterState = applyHeatCapacityFreeParameterDraftToConfigs(normalizedDraft);
  const theoreticalGamma = gasTypeEditingAvailable
    ? parameterState.physicsConfig.gamma
    : file.theoreticalGamma;
  return setHeatCapacityFreeActiveGasTypeAuthority({
    ...file,
    heatCapacityFreeInstrumentConfig: {
      environment: parameterState.environmentConfig,
      physics: parameterState.physicsConfig,
      sensor: parameterState.sensorConfig,
      record: parameterState.recordConfig,
      pressureWarningMv: parameterState.pressureWarningMv,
      instrumentNoiseEnabled: parameterState.instrumentNoiseEnabled,
    },
    theoreticalGamma,
  }, parameterState.gasType);
};

export const applyHeatCapacityFreeParameterDraftWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  draft: HeatCapacityFreeParameterDraft,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const appliedFile = applyHeatCapacityFreeParameterDraftConfigWorkbenchState(file, draft);
  return appliedFile === file
    ? file
    : resetHeatCapacityFreeRunWorkbenchState(appliedFile, now);
};

export const resetHeatCapacityFreeParametersToDefaultWorkbenchState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (!isHeatCapacityFreeParameterEditingAvailable(file)) return file;
  const defaultParameterState = createDefaultHeatCapacityFreeParameterState();
  const defaultDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    defaultParameterState.physicsConfig,
    defaultParameterState.sensorConfig,
    defaultParameterState.recordConfig,
    defaultParameterState.pressureWarningMv,
    defaultParameterState.instrumentNoiseEnabled,
  );
  const resetFile = applyHeatCapacityFreeParameterDraftWorkbenchState(file, defaultDraft);
  return {
    ...resetFile,
    hardSphereViewEnabled: HEAT_CAPACITY_FREE_DEFAULT_HARD_SPHERE_VIEW_ENABLED,
  };
};

export const freezeHeatCapacityFreeParametersForCurrentGroup = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  if (file.heatCapacityFreeRunWorkspace.currentExperimentStatus !== 'draft') return file;
  if (file.heatCapacityFreeRunWorkspace.batch.targetGroupCount === null) return file;
  const configuredBatch = file.heatCapacityFreeRunWorkspace.batch;
  if (isHeatCapacityFreeBatchLocked(configuredBatch)) {
    return commitHeatCapacityFreeRuntimeAuthorityTransaction({
      ...file,
      heatCapacityFreeRunWorkspace: {
        ...file.heatCapacityFreeRunWorkspace,
        batch: configuredBatch,
        currentExperimentStatus: 'running',
      },
    }, file.heatCapacityFreeParameterScheme);
  }
  const appliedFile = applyHeatCapacityFreeParameterDraftConfigWorkbenchState(
    file,
    selectHeatCapacityFreeAppliedParameterDraft(file),
  );
  const snapshot = createHeatCapacityFreeRuntimeConfigSnapshotFromFile(appliedFile);
  const groups = startHeatCapacityFreeExperimentGroup(
    appliedFile.heatCapacityFreeExperimentGroups,
    snapshot,
    now,
  );
  const startedGroup = selectCurrentHeatCapacityFreeExperimentGroup(groups);
  const startedBatch = startedGroup?.status === 'collecting'
    ? startedGroup.runSeries.batch
    : startHeatCapacityFreeBatch(configuredBatch, snapshot, now);
  return commitHeatCapacityFreeRuntimeAuthorityTransaction({
    ...appliedFile,
    heatCapacityFreeExperimentGroups: groups,
    heatCapacityFreeRunWorkspace: {
      ...appliedFile.heatCapacityFreeRunWorkspace,
      batch: startedBatch,
      currentExperimentStatus: 'running',
    },
  }, appliedFile.heatCapacityFreeParameterScheme);
};
