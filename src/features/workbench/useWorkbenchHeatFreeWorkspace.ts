import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import React, { useState } from 'react';

import { restartHeatCapacityFreeBatchWorkbenchState, restartCurrentHeatCapacityFreeExperimentWorkbenchState } from './workbenchHeatCapacityFreeGroupLifecycle.ts';

import { dismissHeatCapacityFreeInvalidAttemptPromptWorkbenchState } from './workbenchHeatCapacityFreeAttemptState.ts';
import { removeHeatCapacityFreeTrialRecordWorkbenchState } from './workbenchHeatCapacityFreeRollbackState.ts';
import { completeHeatCapacityCalculationWorkflowWorkbenchState, continueHeatCapacityCalculationAnswerWorkbenchState, getHeatCapacityCalculationSession, revealHeatCapacityCalculationAnswerWorkbenchState, selectHeatCapacityCalculationAggregateWorkbenchState, selectHeatCapacityCalculationGroupWorkbenchState, submitHeatCapacityCalculationStepWorkbenchState, updateHeatCapacityCalculationDraftWorkbenchState } from './workbenchHeatCapacityCalculationCoordinator.ts';
import { abandonHeatCapacityFreeExperimentGroupDraftWorkbenchState, configureHeatCapacityFreeBatchWorkbenchState, getHeatCapacityFreeBatchProgress, selectHeatCapacityFreeViewedExperimentGroupWorkbenchState, selectHeatCapacityFreeViewedTrialWorkbenchState } from './workbenchHeatCapacityFreeExperimentGroupState.ts';
import type { HeatCapacityFreeDisplayScheme } from './workbenchHeatCapacityStateTypes.ts';

import { type HeatCapacityBatchGroupCount } from '../heatCapacity/HeatCapacityBatchSetupDialog.tsx';
import type { HeatCapacityFreeTrialRecordRemovalKind } from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { selectCurrentHeatCapacityFreeExperimentGroup } from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';

import { heatCapacityTabIdToPanelKey } from './workbenchHeatCapacityTabRegistry.ts';
import { getHeatCapacityRefreshObject } from './workbenchHeatCapacityUiCheckpoint.ts';

import { isExperimentTutorialFileId } from '../learning/workbenchTutorialCoordinator.ts';


export interface useWorkbenchHeatFreeWorkspacePorts {
  initial: {
    initialHeatCapacityRefreshLayout: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
  };
  workspace: {
    activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
    updateActiveFile: (updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  };
  scene: {
    heatCapacityModeTransitionState: import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState;
    heatCapacityModeTransitionStateRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState>;
  };
  ui: {
    pushLog: (message: import("./workbenchConsoleLocalization.ts").WorkbenchConsoleMessageInput, kind?: import("./workbenchConsolePresentation.ts").LogKind) => void;
    requestPromptConfirmation: (request: import("./../../components/prompts/PromptConfirmDialog.tsx").PromptConfirmationRequest) => boolean;
    selectedPanel: import("./workbenchFileState.ts").WorkbenchPanelKey;
    setSelectedPanel: React.Dispatch<React.SetStateAction<import("./workbenchFileState.ts").WorkbenchPanelKey>>;
  };
  history: {
    captureUndoSnapshot: (label: string, scope?: "workspace" | "file" | "presentation", fileId?: string) => void;
  };
  mode: {
    activateHeatCapacityModeFromExplore: (targetMode: import("./../../domain/heatCapacity/heatCapacityModeTypes.ts").HeatCapacityMode, freeBatchGroupCount?: 5 | 3 | 4 | 6 | 7 | null) => boolean;
    exitHeatCapacityFormalModeToExplore: (sourceMode: import("./../../domain/heatCapacity/heatCapacityModeTypes.ts").HeatCapacityMode) => boolean;
  };
  runtimeLifecycle: {
    resetHeatCapacityGroupUiRuntime: () => void;
  };
  preferences: {
    settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  };
  tutorial: {
    tutorialActiveRef: React.MutableRefObject<boolean>;
    experienceProfileRef: React.MutableRefObject<import("./../learning/experimentLearningModel.ts").AppExperienceProfile>;
    completeExperimentLearningTutorial: (experiment: import("./../learning/experimentLearningModel.ts").ExperimentLearningId) => Promise<boolean>;
  };
  lifecycle: {
    flushWorkspacePersistenceRef: React.MutableRefObject<(activeModeCheckpointOverride?: import("./workbenchIndexedDbPersistence.ts").WorkbenchActiveModeCheckpointOverride | undefined) => Promise<boolean>>;
  };
}

export const useWorkbenchHeatFreeWorkspace = (ports: useWorkbenchHeatFreeWorkspacePorts) => {
  const { initialHeatCapacityRefreshLayout } = ports.initial;
  const { activeFile, updateActiveFile } = ports.workspace;
  const { heatCapacityModeTransitionState, heatCapacityModeTransitionStateRef } = ports.scene;
  const { pushLog, requestPromptConfirmation, selectedPanel, setSelectedPanel } = ports.ui;
  const { captureUndoSnapshot } = ports.history;
  const { activateHeatCapacityModeFromExplore, exitHeatCapacityFormalModeToExplore } = ports.mode;
  const { resetHeatCapacityGroupUiRuntime } = ports.runtimeLifecycle;
  const { settingsLanguagePreference } = ports.preferences;
  const { tutorialActiveRef, experienceProfileRef, completeExperimentLearningTutorial } = ports.tutorial;
  const { flushWorkspacePersistenceRef } = ports.lifecycle;
  const [pendingRemoveHeatCapacityTrialRecord, setPendingRemoveHeatCapacityTrialRecord] = useState<{
    trialIndex: number;
    kind: HeatCapacityFreeTrialRecordRemovalKind;
    scheme: HeatCapacityFreeDisplayScheme;
  } | null>(null);

  const [heatCapacityBatchSetupSelection, setHeatCapacityBatchSetupSelection] =
    useState<HeatCapacityBatchGroupCount | null>(null);

  const [heatCapacityBatchSetupRequestedFileId, setHeatCapacityBatchSetupRequestedFileId] =
    useState<string | null>(null);

  const [heatCapacityCalculationReviewOpen, setHeatCapacityCalculationReviewOpen] =
    useState(false);

  const [heatCapacityReviewSelectionByFileId] = useState<Record<string, {
    selectedTrialId: string | null;
    userSelected: boolean;
  }>>(() => {
    const restored = getHeatCapacityRefreshObject(initialHeatCapacityRefreshLayout, 'reviewSelectionByFileId');
    return restored as Record<string, { selectedTrialId: string | null; userSelected: boolean }> | null ?? {};
  });

  const activeHeatCapacityFreeBatchProgress = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityFreeBatchProgress(activeFile)
    : null;

  const activeHeatCapacityFreeGroupCollection = activeFile.kind === 'heatCapacity'
    ? activeFile.heatCapacityFreeExperimentGroups
    : null;

  const activeHeatCapacityCurrentGroup = activeHeatCapacityFreeGroupCollection
    ? selectCurrentHeatCapacityFreeExperimentGroup(activeHeatCapacityFreeGroupCollection)
    : null;

  const activeHeatCapacityCurrentGroupTerminal =
    activeHeatCapacityCurrentGroup?.status === 'completed' ||
    activeHeatCapacityCurrentGroup?.status === 'legacy-incomplete-readonly';

  const activeHeatCapacityRuntimeScheme = activeFile.kind === 'heatCapacity'
    ? activeFile.heatCapacityFreeParameterScheme
    : 'real';

  const activeHeatCapacityNextScheme = activeHeatCapacityCurrentGroup?.status === 'completed' ||
    activeHeatCapacityCurrentGroup?.status === 'legacy-incomplete-readonly'
    ? activeHeatCapacityFreeGroupCollection?.pendingNextScheme ?? activeHeatCapacityRuntimeScheme
    : activeHeatCapacityRuntimeScheme;

  const activeHeatCapacityGroupProgressStatus = activeHeatCapacityCurrentGroup?.status === 'draft'
    ? 'draft' as const
    : activeHeatCapacityCurrentGroup?.status === 'collecting'
      ? 'collecting' as const
      : activeHeatCapacityCurrentGroup?.status === 'completed' ||
          activeHeatCapacityCurrentGroup?.status === 'legacy-incomplete-readonly'
        ? 'completed' as const
        : 'awaiting-calculation' as const;

  const heatCapacityBatchSetupPurpose = activeHeatCapacityCurrentGroup?.status === 'completed' ||
    activeHeatCapacityCurrentGroup?.status === 'legacy-incomplete-readonly'
    ? 'next' as const
    : 'first' as const;

  const activeHeatCapacityCalculationSession = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityCalculationSession(activeFile)
    : null;

  const heatCapacityBatchSetupOpen = activeFile.kind === 'heatCapacity' &&
    heatCapacityBatchSetupRequestedFileId === activeFile.id &&
    (
      activeFile.heatCapacityMode === null ||
      (
        activeFile.heatCapacityMode === 'free' &&
        (
          activeHeatCapacityCurrentGroup === null ||
          activeHeatCapacityCurrentGroup.status === 'draft' ||
          activeHeatCapacityCurrentGroup.status === 'completed' ||
          activeHeatCapacityCurrentGroup.status === 'legacy-incomplete-readonly'
        )
      )
    ) &&
    heatCapacityModeTransitionState.phase === 'idle';

  const heatCapacityCalculationAutoOpen =
    activeHeatCapacityCalculationSession?.presentation === 'interactive' &&
    (
      activeHeatCapacityCalculationSession.status === 'in-progress' ||
      activeHeatCapacityCalculationSession.status === 'ready-to-exit'
    );

  const heatCapacityCalculationWindowOpen =
    heatCapacityCalculationAutoOpen || heatCapacityCalculationReviewOpen;

  const batchSetupProjectionEffect = { run: () => {
    setHeatCapacityBatchSetupSelection(null);
    setHeatCapacityBatchSetupRequestedFileId(null);
  }, dependencies: [
    activeFile.id,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
  ] } satisfies WorkbenchHeatEffect;

  const calculationReviewProjectionEffect = { run: () => {
    setHeatCapacityCalculationReviewOpen(false);
  }, dependencies: [
    activeFile.id,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
  ] } satisfies WorkbenchHeatEffect;

  const activeHeatCapacityInvalidAttemptPrompt = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    activeFile.heatCapacityFreeRunWorkspace.activeAttempt?.status === 'invalid' &&
    !activeFile.heatCapacityFreeRunWorkspace.activeAttempt.invalidPromptDismissed;

  const requestRemoveHeatCapacityTrialRecord = (
    trialIndex: number,
    kind: HeatCapacityFreeTrialRecordRemovalKind,
    scheme: HeatCapacityFreeDisplayScheme,
  ) => {
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
      activeFile.heatCapacityFreeExperimentGroups,
    );
    if (
      currentGroup?.status !== 'collecting' ||
      currentGroup.scheme !== scheme ||
      activeFile.heatCapacityFreeExperimentGroups.viewedGroupId !== currentGroup.id
    ) return;
    const pendingMatches = pendingRemoveHeatCapacityTrialRecord?.trialIndex === trialIndex &&
      pendingRemoveHeatCapacityTrialRecord.kind === kind &&
      pendingRemoveHeatCapacityTrialRecord.scheme === scheme;
    const recordLabel = kind === 'u0' ? 'U₀' : kind === 'u1' ? 'U₁' : kind === 'u2' ? 'U₂' : '本组';
    const displayTrialIndex = trialIndex + 1;
    if (!pendingMatches) {
      setPendingRemoveHeatCapacityTrialRecord({ trialIndex, kind, scheme });
      pushLog((language) => {
        const recordSuffix = kind === 'trial' ? '' : ` ${recordLabel}`;
        if (language === 'zh-CN') {
          return `${activeFile.name}: 再次点击确认删除第 ${displayTrialIndex} 次实验的${recordSuffix}记录。`;
        }
        if (language === 'zh-TW') {
          return `${activeFile.name}: 再次點擊確認刪除第 ${displayTrialIndex} 次實驗的${recordSuffix}記錄。`;
        }
        return `${activeFile.name}: Click Confirm Delete again to delete the${recordSuffix} record from trial ${displayTrialIndex}.`;
      }, 'warning');
      return;
    }

    captureUndoSnapshot(`removed heat-capacity ${kind} record`);
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      if (file.heatCapacityMode === 'free') {
        return removeHeatCapacityFreeTrialRecordWorkbenchState(file, trialIndex, kind, Date.now(), scheme);
      }
      return file;
    });
    setPendingRemoveHeatCapacityTrialRecord(null);
    pushLog((language) => {
      const recordSuffix = kind === 'trial' ? '' : ` ${recordLabel}`;
      if (language === 'zh-CN') return `${activeFile.name}: 已删除第 ${displayTrialIndex} 次实验的${recordSuffix}记录。`;
      if (language === 'zh-TW') return `${activeFile.name}: 已刪除第 ${displayTrialIndex} 次實驗的${recordSuffix}記錄。`;
      return `${activeFile.name}: Deleted the${recordSuffix} record from trial ${displayTrialIndex}.`;
    });
  };

  const confirmHeatCapacityFreeBatchSetup = () => {
    if (
      heatCapacityBatchSetupSelection === null ||
      activeFile.kind !== 'heatCapacity'
    ) {
      return;
    }
    if (activeFile.heatCapacityMode === null) {
      if (activateHeatCapacityModeFromExplore('free', heatCapacityBatchSetupSelection)) {
        setHeatCapacityBatchSetupRequestedFileId(null);
      }
      return;
    }
    if (activeFile.heatCapacityMode !== 'free') return;
    const now = Date.now();
    captureUndoSnapshot('configure heat-capacity free batch');
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? configureHeatCapacityFreeBatchWorkbenchState(
            file,
            heatCapacityBatchSetupSelection,
            now,
          )
        : file
    ));
    setHeatCapacityBatchSetupRequestedFileId(null);
  };

  const cancelHeatCapacityFreeBatchSetup = () => {
    setHeatCapacityBatchSetupRequestedFileId(null);
    setHeatCapacityBatchSetupSelection(null);
    if (heatCapacityBatchSetupPurpose === 'next') return;
    if (activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free') {
      exitHeatCapacityFormalModeToExplore('free');
    }
  };

  const restartHeatCapacityFreeExperiment = () => {
    if (
      heatCapacityModeTransitionStateRef.current.phase !== 'idle' ||
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup?.status !== 'collecting' ||
      heatCapacityCalculationWindowOpen
    ) return;
    const currentExperiment = getHeatCapacityFreeBatchProgress(activeFile).currentGroupNumber;
    if (currentExperiment === null) return;
    const now = Date.now();
    resetHeatCapacityGroupUiRuntime();
    captureUndoSnapshot('restart current heat-capacity experiment');
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? restartCurrentHeatCapacityFreeExperimentWorkbenchState(file, now)
        : file
    ));
    pushLog((language) => {
      if (language === 'zh-CN') return `${activeFile.name}：已重新开始第 ${currentExperiment} 次实验。`;
      if (language === 'zh-TW') return `${activeFile.name}：已重新開始第 ${currentExperiment} 次實驗。`;
      return `${activeFile.name}: Restarted experiment ${currentExperiment}.`;
    }, 'warning');
  };

  const requestRestartHeatCapacityFreeExperiment = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup?.status !== 'collecting' ||
      heatCapacityCalculationWindowOpen
    ) return;
    const currentExperiment = getHeatCapacityFreeBatchProgress(activeFile).currentGroupNumber;
    if (currentExperiment === null) return;
    const copy = settingsLanguagePreference === 'en'
      ? {
          eyebrow: 'Free mode',
          title: `Restart experiment ${currentExperiment}?`,
          body: `Records, traces, and instrument state from experiment ${currentExperiment} will be cleared.`,
          consequence: 'Earlier completed experiments, group parameters, and the target experiment count are preserved. This action can be undone from the Edit menu.',
          cancel: 'Cancel',
          confirm: `Restart experiment ${currentExperiment}`,
          close: 'Close',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            eyebrow: '自由模式',
            title: `重新開始第 ${currentExperiment} 次實驗？`,
            body: `第 ${currentExperiment} 次實驗的記錄、曲線與儀器狀態都會清空。`,
            consequence: '此前已完成的實驗、本組參數與實驗總次數都會保留；可透過「編輯」選單撤銷。',
            cancel: '取消',
            confirm: `重新開始第 ${currentExperiment} 次實驗`,
            close: '關閉',
          }
        : {
            eyebrow: '自由模式',
            title: `重新开始第 ${currentExperiment} 次实验？`,
            body: `第 ${currentExperiment} 次实验的记录、曲线和仪器状态都会被清空。`,
            consequence: '此前已完成的实验、本组参数与实验总次数都会保留；可通过“编辑”菜单撤销。',
            cancel: '取消',
            confirm: `重新开始第 ${currentExperiment} 次实验`,
            close: '关闭',
          };
    requestPromptConfirmation({
      id: 'restart-heat-capacity-experiment',
      tone: 'warning',
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: copy.body,
      consequence: copy.consequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirm,
      closeLabel: copy.close,
      onConfirm: restartHeatCapacityFreeExperiment,
    });
  };

  const restartHeatCapacityFreeBatch = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      heatCapacityCalculationWindowOpen ||
      getHeatCapacityFreeBatchProgress(activeFile).allGroupsRecorded
    ) {
      return;
    }
    const now = Date.now();
    resetHeatCapacityGroupUiRuntime();
    if (selectedPanel === 'heatCapacityReview') {
      const nextOpenTab = activeFile.openHeatCapacityTabs.find((tabId) => tabId !== 'review');
      setSelectedPanel(nextOpenTab ? heatCapacityTabIdToPanelKey(nextOpenTab) : 'preview');
    }
    captureUndoSnapshot('restart heat-capacity free batch');
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? restartHeatCapacityFreeBatchWorkbenchState(file, now)
        : file
    ));
    setHeatCapacityBatchSetupSelection(null);
  };

  const requestRestartHeatCapacityFreeGroup = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup?.status !== 'collecting'
    ) return;
    const copy = settingsLanguagePreference === 'en'
      ? {
          eyebrow: 'Free mode',
          title: 'Restart this experiment group?',
          body: 'All recorded experiments and traces in the current group will be cleared.',
          consequence: 'Completed historical groups are preserved. This action can be undone from the Edit menu.',
          cancel: 'Cancel',
          confirm: 'Restart group',
          close: 'Close',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            eyebrow: '自由模式',
            title: '重新開始本組實驗？',
            body: '目前組內已記錄的全部實驗與曲線都會清空。',
            consequence: '已完成的歷史實驗組不受影響；可透過「編輯」選單撤銷。',
            cancel: '取消',
            confirm: '重新開始本組',
            close: '關閉',
          }
        : {
            eyebrow: '自由模式',
            title: '重新开始本组实验？',
            body: '当前组内已记录的全部实验与曲线都会被清空。',
            consequence: '已经完成的历史实验组不受影响；可通过“编辑”菜单撤销。',
            cancel: '取消',
            confirm: '重新开始本组',
            close: '关闭',
          };
    requestPromptConfirmation({
      id: 'restart-heat-capacity-experiment-group',
      tone: 'warning',
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: copy.body,
      consequence: copy.consequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirm,
      closeLabel: copy.close,
      onConfirm: restartHeatCapacityFreeBatch,
    });
  };

  const requestAbandonHeatCapacityFreeGroupDraft = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup?.status !== 'draft'
    ) return;
    const copy = settingsLanguagePreference === 'en'
      ? {
          eyebrow: 'Free mode',
          title: 'Abandon this group draft?',
          body: 'The unstarted group draft will be removed.',
          consequence: 'No completed historical group or experiment data will be deleted.',
          cancel: 'Cancel',
          confirm: 'Abandon draft',
          close: 'Close',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            eyebrow: '自由模式',
            title: '放棄本組草稿？',
            body: '這個尚未開始的實驗組草稿將被移除。',
            consequence: '已完成的歷史實驗組與實驗資料都不會被刪除。',
            cancel: '取消',
            confirm: '放棄草稿',
            close: '關閉',
          }
        : {
            eyebrow: '自由模式',
            title: '放弃本组草稿？',
            body: '这个尚未开始的实验组草稿将被移除。',
            consequence: '已完成的历史实验组和实验数据都不会被删除。',
            cancel: '取消',
            confirm: '放弃草稿',
            close: '关闭',
          };
    requestPromptConfirmation({
      id: 'abandon-heat-capacity-experiment-group-draft',
      tone: 'warning',
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: copy.body,
      consequence: copy.consequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirm,
      closeLabel: copy.close,
      onConfirm: () => {
        const now = Date.now();
        resetHeatCapacityGroupUiRuntime();
        captureUndoSnapshot('abandon heat-capacity experiment group draft');
        updateActiveFile((file) => (
          file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
            ? abandonHeatCapacityFreeExperimentGroupDraftWorkbenchState(file, now)
            : file
        ));
        setHeatCapacityBatchSetupSelection(null);
      },
    });
  };

  const openNextHeatCapacityFreeExperimentGroupSetup = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      heatCapacityCalculationWindowOpen ||
      (
        activeHeatCapacityCurrentGroup?.status !== 'completed' &&
        activeHeatCapacityCurrentGroup?.status !== 'legacy-incomplete-readonly'
      )
    ) return;
    setHeatCapacityBatchSetupSelection(null);
    setHeatCapacityBatchSetupRequestedFileId(activeFile.id);
  };

  const openFirstHeatCapacityFreeExperimentGroupSetup = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup !== null ||
      heatCapacityCalculationWindowOpen
    ) return;
    setHeatCapacityBatchSetupSelection(null);
    setHeatCapacityBatchSetupRequestedFileId(activeFile.id);
  };

  const updateHeatCapacityCalculationDraft = (
    fieldId: string,
    draftRaw: string,
  ) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? updateHeatCapacityCalculationDraftWorkbenchState(
            file,
            fieldId,
            draftRaw,
            Date.now(),
          )
        : file
    ));
  };

  const submitHeatCapacityCalculationStep = (stepId: string) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? submitHeatCapacityCalculationStepWorkbenchState(file, stepId, Date.now())
        : file
    ));
  };

  const continueHeatCapacityCalculationAnswer = (fieldId: string) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? continueHeatCapacityCalculationAnswerWorkbenchState(
            file,
            fieldId,
            Date.now(),
          )
        : file
    ));
  };

  const revealHeatCapacityCalculationAnswer = (fieldId: string) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? revealHeatCapacityCalculationAnswerWorkbenchState(
            file,
            fieldId,
            Date.now(),
          )
        : file
    ));
  };

  const selectHeatCapacityCalculationGroup = (groupIndex: number) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? selectHeatCapacityCalculationGroupWorkbenchState(
            file,
            groupIndex,
            Date.now(),
          )
        : file
    ));
  };

  const selectHeatCapacityCalculationAggregate = () => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? selectHeatCapacityCalculationAggregateWorkbenchState(file, Date.now())
        : file
    ));
  };

  const completeAndExitHeatCapacityCalculation = () => {
    const activeCalculationSession = activeFile.kind === 'heatCapacity'
      ? getHeatCapacityCalculationSession(activeFile)
      : null;
    const completesTutorialGuide = Boolean(
      tutorialActiveRef.current &&
      experienceProfileRef.current.activeTutorialExperiment === 'heatCapacity' &&
      isExperimentTutorialFileId(activeFile.id, 'heatCapacity') &&
      activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      activeCalculationSession?.mode === 'guide' &&
      activeCalculationSession.status === 'ready-to-exit',
    );
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? completeHeatCapacityCalculationWorkflowWorkbenchState(file, Date.now())
        : file
    ));
    setHeatCapacityCalculationReviewOpen(false);
    window.setTimeout(() => {
      if (completesTutorialGuide) {
        void completeExperimentLearningTutorial('heatCapacity');
      } else {
        void flushWorkspacePersistenceRef.current();
      }
    }, 0);
  };

  const closeHeatCapacityCalculationReview = () => {
    const session = activeFile.kind === 'heatCapacity'
      ? getHeatCapacityCalculationSession(activeFile)
      : null;
    if (
      session?.status === 'in-progress' &&
      session.presentation === 'interactive'
    ) {
      return;
    }
    setHeatCapacityCalculationReviewOpen(false);
  };

  const continueHeatCapacityInvalidAttempt = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    const now = Date.now();
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? dismissHeatCapacityFreeInvalidAttemptPromptWorkbenchState(file, now)
      : file);
  };

  const selectHeatCapacityViewedGroup = (groupId: string) => {
            setPendingRemoveHeatCapacityTrialRecord(null);
            updateActiveFile((file) => (
              file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
                ? selectHeatCapacityFreeViewedExperimentGroupWorkbenchState(file, groupId, Date.now())
                : file
            ));
          };

  const selectHeatCapacityViewedTrial = (groupId: string, trialId: string) => {
            updateActiveFile((file) => (
              file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
                ? selectHeatCapacityFreeViewedTrialWorkbenchState(file, groupId, trialId, Date.now())
                : file
            ));
          };
  return {
    effects: { batchSetupProjection: batchSetupProjectionEffect, calculationReviewProjection: calculationReviewProjectionEffect }, pendingRemoveHeatCapacityTrialRecord, setPendingRemoveHeatCapacityTrialRecord, heatCapacityBatchSetupSelection, setHeatCapacityBatchSetupSelection, setHeatCapacityBatchSetupRequestedFileId, setHeatCapacityCalculationReviewOpen, heatCapacityReviewSelectionByFileId, activeHeatCapacityFreeBatchProgress, activeHeatCapacityCurrentGroup, activeHeatCapacityCurrentGroupTerminal, activeHeatCapacityNextScheme, activeHeatCapacityGroupProgressStatus, heatCapacityBatchSetupPurpose, activeHeatCapacityCalculationSession, heatCapacityBatchSetupOpen, heatCapacityCalculationWindowOpen, activeHeatCapacityInvalidAttemptPrompt, requestRemoveHeatCapacityTrialRecord, confirmHeatCapacityFreeBatchSetup, cancelHeatCapacityFreeBatchSetup, restartHeatCapacityFreeExperiment, requestRestartHeatCapacityFreeExperiment, requestRestartHeatCapacityFreeGroup, requestAbandonHeatCapacityFreeGroupDraft, openNextHeatCapacityFreeExperimentGroupSetup, openFirstHeatCapacityFreeExperimentGroupSetup, updateHeatCapacityCalculationDraft, submitHeatCapacityCalculationStep, continueHeatCapacityCalculationAnswer, revealHeatCapacityCalculationAnswer, selectHeatCapacityCalculationGroup, selectHeatCapacityCalculationAggregate, completeAndExitHeatCapacityCalculation, closeHeatCapacityCalculationReview, continueHeatCapacityInvalidAttempt, selectHeatCapacityViewedGroup, selectHeatCapacityViewedTrial };
};
