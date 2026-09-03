import {
  createEmptyHeatCapacityFreeBatchState,
  deriveHeatCapacityFreeBatchProgress,
  isHeatCapacityFreeBatchLocked,
  type HeatCapacityFreeBatchGroupCount,
} from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  abandonCurrentHeatCapacityFreeExperimentGroupDraft,
  createHeatCapacityFreeExperimentGroupDraft,
  selectCurrentHeatCapacityFreeExperimentGroup,
  selectHeatCapacityFreeViewedExperimentGroup,
  selectHeatCapacityFreeViewedTrial,
  selectViewedHeatCapacityFreeExperimentGroup,
  setHeatCapacityFreeExperimentGroupDraftScheme,
  setHeatCapacityFreeExperimentGroupDraftTargetCount,
  setHeatCapacityFreePendingNextGroupScheme,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  getHeatCapacityFreeGasTypeGamma,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  createDefaultFreeTraceStore,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  projectHeatCapacityFreeExperimentGroupToDomain,
  selectActiveHeatCapacityFreeDomain,
  selectHeatCapacityFreeDomain,
  transactHeatCapacityFreeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  getActiveHeatCapacityFreeTrialIndex,
  hasHeatCapacityFreeTrialProgress,
} from './workbenchHeatCapacityFreeTrialState.ts';
import type {
  HeatCapacityFreeDisplayScheme,
  HeatCapacityFreeExperimentDomainState,
  HeatCapacityFreeParameterScheme,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

export const selectDisplayedHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeExperimentDomainState => {
  const selectedDomain = selectHeatCapacityFreeDomain(
    file,
    file.heatCapacityFreeDisplayScheme,
  );
  const viewedGroup = selectViewedHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  const domain = viewedGroup?.scheme === file.heatCapacityFreeDisplayScheme
    ? {
        ...projectHeatCapacityFreeExperimentGroupToDomain(
          selectedDomain,
          viewedGroup,
        ),
        activeAttempt: null,
      }
    : selectedDomain;
  if (domain.activeAttempt?.status !== 'invalid') return domain;
  return {
    ...domain,
    // Invalid scratch attempts never become official result/scoring history.
    trials: domain.trials.filter((trial) => trial.completedAtMs !== null),
  };
};

export const getHeatCapacityFreeDisplayTheoreticalGamma = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeDisplayScheme = file.heatCapacityFreeDisplayScheme,
) => {
  const viewedGroup = selectViewedHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  const gasType = viewedGroup?.scheme === scheme
    ? viewedGroup.gasType
    : selectHeatCapacityFreeDomain(file, scheme).gasType;
  return getHeatCapacityFreeGasTypeGamma(gasType);
};

export const setHeatCapacityFreeDisplaySchemeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeDisplayScheme,
  now = Date.now(),
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeDisplayScheme: scheme,
  updatedAt: now,
});

export const isHeatCapacityFreeExperimentStarted = (
  file: WorkbenchHeatCapacityState,
): boolean => {
  const domain = selectActiveHeatCapacityFreeDomain(file);
  if (isHeatCapacityFreeBatchLocked(domain.batch)) return true;
  if (domain.experimentGroupStatus === 'completed' && !file.powerOn) return false;
  const activeTrialIndex = getActiveHeatCapacityFreeTrialIndex({
    heatCapacityFreeRunWorkspace: {
      batch: domain.batch,
      traceStore: domain.traceStore,
      trials: domain.trials,
      activeAttempt: domain.activeAttempt,
      currentExperimentStatus: domain.experimentGroupStatus,
    },
    powerOn: file.powerOn,
  });
  const activeTrial = activeTrialIndex >= 0
    ? domain.trials[activeTrialIndex] ?? null
    : null;
  return file.powerOn ||
    file.pumpValveOpen ||
    file.glassPistonState === 'open' ||
    file.pressureZeroed ||
    file.pumpBulbState !== 'idle' ||
    domain.experimentGroupStatus === 'running' ||
    domain.traceStore.activeTraceTrialId !== null ||
    (activeTrial !== null && hasHeatCapacityFreeTrialProgress(activeTrial)) ||
    domain.physicsState.pumpStrokeCount > 0;
};

export const setHeatCapacityFreeParameterSchemeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  if (
    currentGroup?.status === 'completed' ||
    currentGroup?.status === 'legacy-incomplete-readonly'
  ) {
    const transactedFile = transactHeatCapacityFreeAuthority(
      file,
      (authority) => ({
        ...authority,
        heatCapacityFreeExperimentGroups: setHeatCapacityFreePendingNextGroupScheme(
          authority.heatCapacityFreeExperimentGroups,
          scheme,
        ),
        heatCapacityFreeParameterScheme: scheme,
      }),
      { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
    );
    return { ...transactedFile, updatedAt: now };
  }
  if (isHeatCapacityFreeExperimentStarted(file)) return file;
  const transactedFile = transactHeatCapacityFreeAuthority(
    file,
    (authority) => {
      const authorityFile = { ...file, ...authority };
      const nextDomain = selectHeatCapacityFreeDomain(authorityFile, scheme);
      return {
        ...authority,
        heatCapacityFreeExperimentGroups: currentGroup?.status === 'draft'
          ? setHeatCapacityFreeExperimentGroupDraftScheme(
              authority.heatCapacityFreeExperimentGroups,
              scheme,
              nextDomain.gasType,
            )
          : authority.heatCapacityFreeExperimentGroups,
        heatCapacityFreeParameterScheme: scheme,
        heatCapacityFreeDisplayScheme: scheme,
      };
    },
    { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
  );
  return { ...transactedFile, updatedAt: now };
};

export const getHeatCapacityFreeBatchProgress = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme = file.heatCapacityFreeParameterScheme,
) => {
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  if (
    scheme === file.heatCapacityFreeParameterScheme &&
    currentGroup?.scheme === scheme
  ) {
    return deriveHeatCapacityFreeBatchProgress(
      currentGroup.runSeries.batch,
      currentGroup.runSeries.trials,
    );
  }
  const domain = selectHeatCapacityFreeDomain(file, scheme);
  return deriveHeatCapacityFreeBatchProgress(domain.batch, domain.trials);
};

export const configureHeatCapacityFreeBatchWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  targetGroupCount: HeatCapacityFreeBatchGroupCount,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const existingCurrent = selectCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  if (
    existingCurrent &&
    existingCurrent.status !== 'draft' &&
    existingCurrent.status !== 'completed' &&
    existingCurrent.status !== 'legacy-incomplete-readonly'
  ) {
    return file;
  }
  const scheme = existingCurrent?.status === 'completed' ||
    existingCurrent?.status === 'legacy-incomplete-readonly'
    ? file.heatCapacityFreeExperimentGroups.pendingNextScheme
    : file.heatCapacityFreeParameterScheme;
  const transactedFile = transactHeatCapacityFreeAuthority(
    file,
    (authority) => {
      const authorityFile = { ...file, ...authority };
      const selectedDomain = selectHeatCapacityFreeDomain(authorityFile, scheme);
      let groups = authority.heatCapacityFreeExperimentGroups;
      const current = selectCurrentHeatCapacityFreeExperimentGroup(groups);
      if (current?.status === 'draft') {
        groups = setHeatCapacityFreeExperimentGroupDraftTargetCount(
          groups,
          targetGroupCount,
          now,
        );
      } else {
        const groupId = `${file.id}:${scheme}:group:${
          typeof globalThis.crypto?.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `${now}:${Math.random().toString(36).slice(2)}`
        }`;
        groups = createHeatCapacityFreeExperimentGroupDraft(groups, {
          id: groupId,
          scheme,
          gasType: selectedDomain.gasType,
          targetExperimentCount: targetGroupCount,
          now,
        });
      }
      return {
        ...authority,
        heatCapacityFreeExperimentGroups: groups,
        heatCapacityFreeParameterScheme: scheme,
        heatCapacityFreeDisplayScheme: scheme,
      };
    },
    { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
  );
  return commitHeatCapacityFreeRuntimeAuthorityTransaction({
    ...transactedFile,
    heatCapacityFreeRunWorkspace: {
      ...transactedFile.heatCapacityFreeRunWorkspace,
      activeAttempt: null,
      currentExperimentStatus: 'draft',
    },
    updatedAt: now,
  }, scheme);
};

export const selectHeatCapacityFreeViewedExperimentGroupWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  groupId: string,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const groups = selectHeatCapacityFreeViewedExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
    groupId,
  );
  if (groups === file.heatCapacityFreeExperimentGroups) return file;
  const viewedGroup = groups.groups.find((group) => group.id === groupId);
  return {
    ...file,
    heatCapacityFreeExperimentGroups: groups,
    heatCapacityFreeDisplayScheme:
      viewedGroup?.scheme ?? file.heatCapacityFreeDisplayScheme,
    updatedAt: now,
  };
};

export const selectHeatCapacityFreeViewedTrialWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  groupId: string,
  trialId: string | null,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const groups = selectHeatCapacityFreeViewedTrial(
    file.heatCapacityFreeExperimentGroups,
    groupId,
    trialId,
  );
  return groups === file.heatCapacityFreeExperimentGroups
    ? file
    : {
        ...file,
        heatCapacityFreeExperimentGroups: groups,
        updatedAt: now,
      };
};

export const abandonHeatCapacityFreeExperimentGroupDraftWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const groups = abandonCurrentHeatCapacityFreeExperimentGroupDraft(
    file.heatCapacityFreeExperimentGroups,
  );
  if (groups === file.heatCapacityFreeExperimentGroups) return file;
  const fallback = selectCurrentHeatCapacityFreeExperimentGroup(groups);
  if (fallback) {
    const transactedFile = transactHeatCapacityFreeAuthority(
      file,
      (authority) => ({
        ...authority,
        heatCapacityFreeExperimentGroups: groups,
        heatCapacityFreeParameterScheme: fallback.scheme,
        heatCapacityFreeDisplayScheme: fallback.scheme,
      }),
      { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
    );
    return { ...transactedFile, updatedAt: now };
  }
  const scheme = groups.pendingNextScheme;
  const transactedFile = transactHeatCapacityFreeAuthority(
    file,
    (authority) => ({
      ...authority,
      heatCapacityFreeExperimentGroups: groups,
      heatCapacityFreeParameterScheme: scheme,
      heatCapacityFreeDisplayScheme: scheme,
    }),
    { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
  );
  return commitHeatCapacityFreeRuntimeAuthorityTransaction({
    ...transactedFile,
    heatCapacityFreeExperimentGroups: groups,
    heatCapacityFreeParameterScheme: scheme,
    heatCapacityFreeDisplayScheme: scheme,
    heatCapacityFreeRunWorkspace: {
      batch: createEmptyHeatCapacityFreeBatchState(),
      traceStore: createDefaultFreeTraceStore(),
      trials: [],
      activeAttempt: null,
      currentExperimentStatus: 'draft',
    },
    updatedAt: now,
  }, scheme);
};
