import {
  restartCurrentHeatCapacityFreeExperimentGroup,
  selectCurrentHeatCapacityFreeExperimentGroup,
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  transactHeatCapacityFreeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  isHeatCapacityFreeExperimentGroupComplete,
} from './workbenchHeatCapacityFreeParameterState.ts';
import {
  removeHeatCapacityFreeTraceTrialFromStore,
} from './workbenchHeatCapacityFreeTraceState.ts';
import {
  resetHeatCapacityFreeRunWorkbenchStateCore,
} from './workbenchHeatCapacityFreeRunReset.ts';
import {
  getHeatCapacityFreeBatchProgress,
} from './workbenchHeatCapacityFreeExperimentGroupState.ts';
import type {
  HeatCapacityFreeParameterScheme,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const loadActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  return transactHeatCapacityFreeAuthority(
    file,
    (authority) => authority,
    { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
  );
};

const storeActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): WorkbenchHeatCapacityState => (
  file.heatCapacityMode === 'free'
    ? commitHeatCapacityFreeRuntimeAuthorityTransaction(file, scheme)
    : file
);

const discardCurrentHeatCapacityFreeExperimentRuntime = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  const lastTrial = file.heatCapacityFreeRunWorkspace.trials[file.heatCapacityFreeRunWorkspace.trials.length - 1] ?? null;
  const shouldDiscardLastTrial = lastTrial?.completedAtMs === null;
  const traceTrialIds = new Set(
    [
      shouldDiscardLastTrial ? lastTrial?.traceTrialId ?? null : null,
      file.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId,
    ].filter((id): id is string => typeof id === 'string'
      && !file.heatCapacityFreeRunWorkspace.trials.some(trial => trial.completedAtMs != null && trial.traceTrialId === id)),
  );
  let traceStore = file.heatCapacityFreeRunWorkspace.traceStore;
  for (const traceTrialId of traceTrialIds) {
    traceStore = removeHeatCapacityFreeTraceTrialFromStore(traceStore, traceTrialId);
  }
  return {
    ...file,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      trials: shouldDiscardLastTrial
        ? file.heatCapacityFreeRunWorkspace.trials.slice(0, -1)
        : file.heatCapacityFreeRunWorkspace.trials,
      traceStore,
      activeAttempt: null,
    },
  };
};

const resetHeatCapacityFreeExperimentWithinCurrentGroup = (
  file: WorkbenchHeatCapacityState,
  now: number,
  discardCurrentExperiment: boolean,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    hydratedFile.heatCapacityFreeExperimentGroups,
  );
  if (currentGroup?.status !== 'collecting') return file;

  const scheme = hydratedFile.heatCapacityFreeParameterScheme;
  const batch = hydratedFile.heatCapacityFreeRunWorkspace.batch;
  const resetSourceFile = discardCurrentExperiment
    ? discardCurrentHeatCapacityFreeExperimentRuntime(hydratedFile)
    : hydratedFile;
  const resetFile = resetHeatCapacityFreeRunWorkbenchStateCore(resetSourceFile, now);
  const groups = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
    hydratedFile.heatCapacityFreeExperimentGroups,
    {
      batch,
      trials: resetFile.heatCapacityFreeRunWorkspace.trials,
      traceStore: resetFile.heatCapacityFreeRunWorkspace.traceStore,
    },
  );
  return storeActiveHeatCapacityFreeDomainRuntimeFields(
    {
      ...resetFile,
      heatCapacityFreeExperimentGroups: groups,
      heatCapacityFreeRunWorkspace: {
        ...resetFile.heatCapacityFreeRunWorkspace,
        batch,
        activeAttempt: null,
        currentExperimentStatus: 'draft',
      },
      heatCapacityFreeParameterScheme: scheme,
      heatCapacityFreeDisplayScheme: scheme,
      updatedAt: now,
    },
    scheme,
  );
};

export const restartHeatCapacityFreeBatchWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const groups = restartCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  if (groups === file.heatCapacityFreeExperimentGroups) return file;
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = transactHeatCapacityFreeAuthority(
    file,
    (authority) => ({
      ...authority,
      heatCapacityFreeExperimentGroups: groups,
    }),
    { commitRuntimeScheme: scheme },
  );
  const openHeatCapacityTabs = hydratedFile.openHeatCapacityTabs.filter(
    (tabId) => tabId !== 'review',
  );
  const activeHeatCapacityTabId = hydratedFile.activeHeatCapacityTabId === 'review'
    ? openHeatCapacityTabs[0] ?? null
    : hydratedFile.activeHeatCapacityTabId;
  const clearedFile: WorkbenchHeatCapacityState = {
    ...hydratedFile,
    visiblePanels: hydratedFile.visiblePanels.filter(
      (panelKey) => panelKey !== 'heatCapacityReview',
    ),
    openHeatCapacityTabs,
    activeHeatCapacityTabId,
    heatCapacityFreeRunWorkspace: {
      ...hydratedFile.heatCapacityFreeRunWorkspace,
      activeAttempt: null,
    },
  };
  const resetFile = resetHeatCapacityFreeRunWorkbenchStateCore(clearedFile, now);
  return storeActiveHeatCapacityFreeDomainRuntimeFields({
    ...resetFile,
    heatCapacityFreeExperimentGroups: groups,
    heatCapacityFreeRunWorkspace: {
      batch: hydratedFile.heatCapacityFreeRunWorkspace.batch,
      traceStore: hydratedFile.heatCapacityFreeRunWorkspace.traceStore,
      trials: hydratedFile.heatCapacityFreeRunWorkspace.trials,
      activeAttempt: null,
      currentExperimentStatus: 'running',
    },
    updatedAt: now,
  }, scheme);
};

export const restartCurrentHeatCapacityFreeExperimentWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => resetHeatCapacityFreeExperimentWithinCurrentGroup(
  file,
  now,
  true,
);

export const prepareNextHeatCapacityFreeExperimentWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (!isHeatCapacityFreeExperimentGroupComplete(file)) return file;
  const progress = getHeatCapacityFreeBatchProgress(file);
  if (
    progress.targetGroupCount !== null &&
    progress.completedGroupCount >= progress.targetGroupCount
  ) {
    return file;
  }
  return resetHeatCapacityFreeExperimentWithinCurrentGroup(
    file,
    now,
    false,
  );
};
