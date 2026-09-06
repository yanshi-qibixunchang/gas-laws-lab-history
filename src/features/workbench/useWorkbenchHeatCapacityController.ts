
import { useWorkbenchHeatRuntimeLifecycle } from './useWorkbenchHeatRuntimeLifecycle.ts';
import { useWorkbenchHeatRealtimeClock } from './useWorkbenchHeatRealtimeClock.ts';
import { useWorkbenchHeatRuntimeRecovery } from './useWorkbenchHeatRuntimeRecovery.ts';
import { useWorkbenchHeatSceneRestore } from './useWorkbenchHeatSceneRestore.ts';
import { createWorkbenchHeatRefreshSessionCapture } from './workbenchHeatRefreshSessionCapture.ts';
import { createWorkbenchHeatRuntimeCheckpoint } from './workbenchHeatRuntimeCheckpoint.ts';
import { useWorkbenchHeatModeRuntime } from './useWorkbenchHeatModeRuntime.ts';
import { createWorkbenchHeatDemoRuntimeActions } from './workbenchHeatDemoRuntimeActions.ts';
import { useWorkbenchHeatFreeWorkspace } from './useWorkbenchHeatFreeWorkspace.ts';
import { useWorkbenchHeatInstrument } from './useWorkbenchHeatInstrument.ts';
import { useWorkbenchHeatParameterProjection } from './useWorkbenchHeatParameterProjection.ts';
import { createWorkbenchHeatDemoUiActions } from './workbenchHeatDemoUiActions.ts';
import { createWorkbenchHeatFocusActions } from './workbenchHeatFocusActions.ts';
import { useWorkbenchHeatLessons } from './useWorkbenchHeatLessons.ts';
import { useWorkbenchHeatGuideRuntime } from './useWorkbenchHeatGuideRuntime.ts';
import { useWorkbenchHeatChecklistStepSync } from './useWorkbenchHeatChecklistStepSync.ts';
import { useWorkbenchHeatChecklist } from './useWorkbenchHeatChecklist.ts';
import { useWorkbenchHeatSceneState } from './useWorkbenchHeatSceneState.ts';
import { useWorkbenchHeatGuideState } from './useWorkbenchHeatGuideState.ts';
import { useWorkbenchHeatParameterHelp } from './useWorkbenchHeatParameterHelp.ts';
import { createWorkbenchHeatParameterActions } from './workbenchHeatParameterActions.ts';
import { createWorkbenchHeatParameterSchemeActions } from './workbenchHeatParameterSchemeActions.ts';
import { useWorkbenchHeatDemoState } from './useWorkbenchHeatDemoState.ts';
import { createWorkbenchHeatParameterValidation } from './workbenchHeatParameterValidation.ts';
import { useWorkbenchHeatParameterState } from './useWorkbenchHeatParameterState.ts';
import { useWorkbenchHeatLessonState } from './useWorkbenchHeatLessonState.ts';
import { useWorkbenchHeatPumpAnimation } from './useWorkbenchHeatPumpAnimation.ts';
import { useWorkbenchHeatFeedback } from './useWorkbenchHeatFeedback.ts';

import { getHeatCapacityFreeParameterLockMessage } from './workbenchParameterPresentation.ts';
import React from 'react';


import { getHeatCapacityFreeParameterLockReason } from './workbenchHeatCapacityFreeParameterState.ts';
import { isHeatCapacityFreeExperimentStarted } from './workbenchHeatCapacityFreeExperimentGroupState.ts';









export interface WorkbenchHeatCapacityControllerPorts {
  initial: {
    initialHeatCapacityRefreshDrafts: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
    initialHeatCapacityRefreshWindows: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
    initialHeatCapacityRefreshLayout: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
    initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
    initialSession: import("./workbenchInitialSession.ts").WorkbenchInitialSession;
  };
  workspace: {
    activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
    activeFileId: string;
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    activeFileIdRef: React.MutableRefObject<string>;
    setFiles: React.Dispatch<React.SetStateAction<import("./workbenchFileUnion.ts").WorkbenchFileState[]>>;
    updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
    updateActiveFile: (updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  };
  preferences: {
    settingsPerformanceMode: import("./../heatCapacity/heatCapacityQualityProfiles.ts").HeatCapacityQualityMode;
    settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
    workbenchPromptCopy: typeof import("./workbenchPromptCopies.ts").workbenchPromptCopies[keyof typeof import("./workbenchPromptCopies.ts").workbenchPromptCopies];
  };
  lifecycle: {
    desktopExitQuiesced: boolean;
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
    flushWorkspacePersistenceRef: React.MutableRefObject<(activeModeCheckpointOverride?: import("./workbenchIndexedDbPersistence.ts").WorkbenchActiveModeCheckpointOverride | undefined) => Promise<boolean>>;
    flushWorkspaceAfterRunStateCommit: () => void;
    desktopExitAutoDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
    captureWorkbenchRefreshPresentation: () => import("./workbenchRefreshPresentationCapture.ts").WorkbenchRefreshPresentation;
    heatCapacityRefreshPersistRef: React.MutableRefObject<() => void>;
    skipInitialConsoleScrollRef: React.MutableRefObject<boolean>;
    scheduleHeatCapacitySemanticSceneCheckpointRef: React.MutableRefObject<() => void>;
    heatCapacityLifecycleFlushInProgressRef: React.MutableRefObject<boolean>;
    scheduleWorkspacePersistenceRef: React.MutableRefObject<(reason?: import("./workbenchPersistenceScheduler.ts").WorkbenchPersistenceReason | undefined) => boolean>;
  };
  ui: {
    HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX: 48;
    HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX: 42;
    setParametersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    parametersCollapsed: boolean;
    selectedPanel: import("./workbenchFileState.ts").WorkbenchPanelKey;
    setSelectedPanel: React.Dispatch<React.SetStateAction<import("./workbenchFileState.ts").WorkbenchPanelKey>>;
    setParameterInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setScanInputToast: React.Dispatch<React.SetStateAction<string | null>>;
    isHeatCapacityModalLocked: () => boolean;
    setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    pushLog: (message: import("./workbenchConsoleLocalization.ts").WorkbenchConsoleMessageInput, kind?: import("./workbenchConsolePresentation.ts").LogKind) => void;
    requestPromptConfirmation: (request: import("./../../components/prompts/PromptConfirmDialog.ts").PromptConfirmationRequest) => boolean;
  };
  history: {
    captureUndoSnapshot: (label: string, scope?: "workspace" | "file" | "presentation", fileId?: string) => void;
  };
  tutorial: {
    tutorialNoticeKindRef: React.MutableRefObject<import("./workbenchExperimentTutorialPresentation.ts").ExperimentTutorialNoticeKind | null>;
    tutorialActiveRef: React.MutableRefObject<boolean>;
    experienceProfileRef: React.MutableRefObject<import("./../learning/experimentLearningModel.ts").AppExperienceProfile>;
    completeExperimentLearningTutorial: (experiment: import("./../learning/experimentLearningModel.ts").ExperimentLearningId) => Promise<boolean>;
    guardWorkbenchTutorialAction: (action: import("./../learning/workbenchTutorialAccessPolicy.ts").WorkbenchTutorialAccessAction) => boolean;
    experienceProfile: import("./../learning/experimentLearningModel.ts").AppExperienceProfile;
    tutorialActive: boolean;
    activeTutorialExperiment: import("./../learning/experimentLearningModel.ts").ExperimentLearningId | null;
    setTutorialBlockedNoticeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  };
}

export const useWorkbenchHeatCapacityController = (ports: WorkbenchHeatCapacityControllerPorts) => {
  const { initialHeatCapacityRefreshDrafts, initialHeatCapacityRefreshWindows, initialHeatCapacityRefreshLayout, initialHeatCapacityRefreshSession, initialSession } = ports.initial;
  const { activeFile, activeFileId, filesRef, activeFileIdRef, setFiles, updateFileById, updateActiveFile } = ports.workspace;
  const { settingsPerformanceMode, settingsLanguagePreference, workbenchPromptCopy } = ports.preferences;
  const { desktopExitQuiesced, desktopExitQuiescedRef, flushWorkspacePersistenceRef, flushWorkspaceAfterRunStateCommit, desktopExitAutoDemoClockRef, captureWorkbenchRefreshPresentation, heatCapacityRefreshPersistRef, skipInitialConsoleScrollRef, scheduleHeatCapacitySemanticSceneCheckpointRef, heatCapacityLifecycleFlushInProgressRef, scheduleWorkspacePersistenceRef } = ports.lifecycle;
  const { HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX, HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX, setParametersCollapsed, parametersCollapsed, selectedPanel, setSelectedPanel, setParameterInputDrafts, setScanInputToast, isHeatCapacityModalLocked, setLeftCollapsed, pushLog, requestPromptConfirmation } = ports.ui;
  const { captureUndoSnapshot } = ports.history;
  const { tutorialNoticeKindRef, tutorialActiveRef, experienceProfileRef, completeExperimentLearningTutorial, guardWorkbenchTutorialAction, experienceProfile, tutorialActive, activeTutorialExperiment, setTutorialBlockedNoticeOpen } = ports.tutorial;
  const parameterState: ReturnType<typeof useWorkbenchHeatParameterState> = useWorkbenchHeatParameterState({ initialHeatCapacityRefreshDrafts, initialHeatCapacityRefreshWindows });

  const checklist: ReturnType<typeof useWorkbenchHeatChecklist> = useWorkbenchHeatChecklist({ initialHeatCapacityRefreshLayout, HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX, HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX });

  const scene: ReturnType<typeof useWorkbenchHeatSceneState> = useWorkbenchHeatSceneState({ initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, settingsPerformanceMode, desktopExitQuiesced, initialSession });

  const lessonState: ReturnType<typeof useWorkbenchHeatLessonState> = useWorkbenchHeatLessonState({ initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, initialHeatCapacityRefreshWindows });

  const demoState: ReturnType<typeof useWorkbenchHeatDemoState> = useWorkbenchHeatDemoState({ initialHeatCapacityRefreshSession, heatCapacityModeTransitionLocked: scene.heatCapacityModeTransitionLocked, heatCapacityRefreshRestoring: scene.heatCapacityRefreshRestoring, desktopExitQuiesced, heatCapacityRuntimeFailureFileId: scene.heatCapacityRuntimeFailureFileId });

  const feedback: ReturnType<typeof useWorkbenchHeatFeedback> = useWorkbenchHeatFeedback({ initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, activeFile, settingsLanguagePreference, activeFileIdRef, desktopExitQuiescedRef, heatCapacityRuntimeFailureFileIdRef: scene.heatCapacityRuntimeFailureFileIdRef, filesRef, exitHeatCapacityFocusMode: (...args) => focus.exitHeatCapacityFocusMode(...args), pushLog: (...args) => pushLog(...args), getHeatCapacityRefreshRemainingMs: (...args) => checkpoint.getHeatCapacityRefreshRemainingMs(...args) });

  const pump: ReturnType<typeof useWorkbenchHeatPumpAnimation> = useWorkbenchHeatPumpAnimation({ desktopExitQuiescedRef, heatCapacityRefreshRestorePendingRef: scene.heatCapacityRefreshRestorePendingRef, heatCapacityRuntimeFailureFileIdRef: scene.heatCapacityRuntimeFailureFileIdRef, activeFileIdRef, updateFileById: (...args) => updateFileById(...args), activeFile, heatCapacityRefreshRestoring: scene.heatCapacityRefreshRestoring, heatCapacityLessonDialogActive: lessonState.heatCapacityLessonDialogActive, autoDemoPaused: demoState.autoDemoPaused });

  const guideState: ReturnType<typeof useWorkbenchHeatGuideState> = useWorkbenchHeatGuideState({ initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, heatCapacityModeTransitionLocked: scene.heatCapacityModeTransitionLocked, autoDemoInteractionLocked: demoState.autoDemoInteractionLocked, activeFile, autoDemoStepIndex: demoState.autoDemoStepIndex });

  const guide: ReturnType<typeof useWorkbenchHeatGuideRuntime> = useWorkbenchHeatGuideRuntime({
    preferences: {
      settingsLanguagePreference,
    },
    feedback: {
      heatCapacityRealtimeCopy: feedback.heatCapacityRealtimeCopy,
      isHeatCapacityPressureAlertActive: (...args) => feedback.isHeatCapacityPressureAlertActive(...args),
      showHeatCapacityPolicyToast: (...args) => feedback.showHeatCapacityPolicyToast(...args),
      clearHeatCapacityToastBySource: (...args) => feedback.clearHeatCapacityToastBySource(...args),
      heatCapacityRecordToastSequenceActive: feedback.heatCapacityRecordToastSequenceActive,
    },
    guideState: {
      heatCapacityGuideStartTimerRef: guideState.heatCapacityGuideStartTimerRef,
      guideHeatCapacityPausedPulseRef: guideState.guideHeatCapacityPausedPulseRef,
      guideHeatCapacityPulseTimerRef: guideState.guideHeatCapacityPulseTimerRef,
      guideHeatCapacityPulseDeadlineAtMsRef: guideState.guideHeatCapacityPulseDeadlineAtMsRef,
      guideHeatCapacityPulseActive: guideState.guideHeatCapacityPulseActive,
      guideHeatCapacityFocusControlId: guideState.guideHeatCapacityFocusControlId,
      setGuideHeatCapacityPulseActive: guideState.setGuideHeatCapacityPulseActive,
      setGuideHeatCapacityFocusControlId: guideState.setGuideHeatCapacityFocusControlId,
      guideHeatCapacityGuidancePulseTimerRef: guideState.guideHeatCapacityGuidancePulseTimerRef,
      guideHeatCapacityPendingStrongReminderTimerRef: guideState.guideHeatCapacityPendingStrongReminderTimerRef,
      guideHeatCapacityPendingStrongReminderDeadlineAtMsRef: guideState.guideHeatCapacityPendingStrongReminderDeadlineAtMsRef,
      guideHeatCapacityPendingStrongReminderControlIdRef: guideState.guideHeatCapacityPendingStrongReminderControlIdRef,
      guideHeatCapacityPausedPendingStrongReminderRef: guideState.guideHeatCapacityPausedPendingStrongReminderRef,
      guideHeatCapacityStrongReminderTimerContextRef: guideState.guideHeatCapacityStrongReminderTimerContextRef,
      guideHeatCapacityStrongReminderDeadlineAtMsRef: guideState.guideHeatCapacityStrongReminderDeadlineAtMsRef,
      guideHeatCapacityStrongReminderTimerRef: guideState.guideHeatCapacityStrongReminderTimerRef,
      guideHeatCapacityRestoredStrongReminderTimerRef: guideState.guideHeatCapacityRestoredStrongReminderTimerRef,
      setGuideHeatCapacityStrongReminderControlId: guideState.setGuideHeatCapacityStrongReminderControlId,
      setGuideHeatCapacityStrongReminderFocusKey: guideState.setGuideHeatCapacityStrongReminderFocusKey,
      setGuideHeatCapacityStrongReminderActive: guideState.setGuideHeatCapacityStrongReminderActive,
      guideHeatCapacityMissCountRef: guideState.guideHeatCapacityMissCountRef,
      guideHeatCapacityRejectedInteractionRef: guideState.guideHeatCapacityRejectedInteractionRef,
      getHeatCapacityGuideStep: (...args) => guideState.getHeatCapacityGuideStep(...args),
      setGuideHeatCapacityRollback: guideState.setGuideHeatCapacityRollback,
      guideHeatCapacityActiveFileId: guideState.guideHeatCapacityActiveFileId,
      guideHeatCapacityStrongReminderActive: guideState.guideHeatCapacityStrongReminderActive,
      guideHeatCapacityStrongReminderControlId: guideState.guideHeatCapacityStrongReminderControlId,
      activeHeatCapacityGuideFileId: guideState.activeHeatCapacityGuideFileId,
      activeHeatCapacityGuideStep: guideState.activeHeatCapacityGuideStep,
      guidePassivePumpTargetNoticeKeyRef: guideState.guidePassivePumpTargetNoticeKeyRef,
      guideHeatCapacityActiveFileIdRef: guideState.guideHeatCapacityActiveFileIdRef,
    },
    workspace: {
      activeFileIdRef,
      filesRef,
      activeFile,
    },
    lifecycle: {
      desktopExitQuiescedRef,
      desktopExitQuiesced,
    },
    tutorial: {
      tutorialNoticeKindRef,
    },
    scene,
    checkpoint: {
      getHeatCapacityRefreshRemainingMs: (...args) => checkpoint.getHeatCapacityRefreshRemainingMs(...args),
    },
    lessonState: {
      heatCapacityLessonDialogActiveRef: lessonState.heatCapacityLessonDialogActiveRef,
      heatCapacityLessonDialogActive: lessonState.heatCapacityLessonDialogActive,
    },
    focus: {
      exitHeatCapacityFocusMode: (...args) => focus.exitHeatCapacityFocusMode(...args),
    },
    demoState: {
      autoDemoInteractionLocked: demoState.autoDemoInteractionLocked,
    },
  });

  const lessons: ReturnType<typeof useWorkbenchHeatLessons> = useWorkbenchHeatLessons({
    lessonState,
    workspace: {
      updateFileById: (...args) => updateFileById(...args),
      activeFileIdRef,
      filesRef,
      activeFile,
    },
    lifecycle: {
      desktopExitQuiescedRef,
    },
    scene: {
      heatCapacityRefreshRestorePendingRef: scene.heatCapacityRefreshRestorePendingRef,
      heatCapacityRuntimeFailureFileIdRef: scene.heatCapacityRuntimeFailureFileIdRef,
    },
    demoRuntime: {
      runHeatCapacityAutoDemo: (...args) => demoRuntime.runHeatCapacityAutoDemo(...args),
      pauseHeatCapacityAutoDemo: (...args) => demoRuntime.pauseHeatCapacityAutoDemo(...args),
    },
    demoState: {
      autoDemoRunning: demoState.autoDemoRunning,
    },
    guide: {
      clearGuideHeatCapacityStrongReminder: (...args) => guide.clearGuideHeatCapacityStrongReminder(...args),
    },
    feedback: {
      heatCapacityRealtimeCopy: feedback.heatCapacityRealtimeCopy,
    },
    guideState,
  });

  const focus: ReturnType<typeof createWorkbenchHeatFocusActions> = createWorkbenchHeatFocusActions({ filesRef, heatCapacityFocusSessionRef: scene.heatCapacityFocusSessionRef, heatCapacitySceneFocusModeRef: scene.heatCapacitySceneFocusModeRef, updateFileById: (...args) => updateFileById(...args), setParametersCollapsed, setHeatCapacityFocusResetKey: scene.setHeatCapacityFocusResetKey, activeFileIdRef, parametersCollapsed, setHeatCapacityAdvancedOpen: parameterState.setHeatCapacityAdvancedOpen, setPinnedHeatCapacityParamHelpId: parameterState.setPinnedHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId: parameterState.setHoveredHeatCapacityParamHelpId, setHeatCapacityParamHelpPopoverStyle: parameterState.setHeatCapacityParamHelpPopoverStyle, guideHeatCapacityActiveFileIdRef: guideState.guideHeatCapacityActiveFileIdRef, getGuideStepGuidance: (...args) => guide.getGuideStepGuidance(...args), showGuideHeatCapacityGuidance: (...args) => guide.showGuideHeatCapacityGuidance(...args) });

  const free: ReturnType<typeof useWorkbenchHeatFreeWorkspace> = useWorkbenchHeatFreeWorkspace({
    initial: {
      initialHeatCapacityRefreshLayout,
    },
    workspace: {
      activeFile,
      updateActiveFile: (...args) => updateActiveFile(...args),
    },
    scene: {
      heatCapacityModeTransitionState: scene.heatCapacityModeTransitionState,
      heatCapacityModeTransitionStateRef: scene.heatCapacityModeTransitionStateRef,
    },
    ui: {
      pushLog: (...args) => pushLog(...args),
      requestPromptConfirmation: (...args) => requestPromptConfirmation(...args),
      selectedPanel,
      setSelectedPanel,
    },
    history: {
      captureUndoSnapshot: (...args) => captureUndoSnapshot(...args),
    },
    mode: {
      activateHeatCapacityModeFromExplore: (...args) => mode.activateHeatCapacityModeFromExplore(...args),
      exitHeatCapacityFormalModeToExplore: (...args) => mode.exitHeatCapacityFormalModeToExplore(...args),
    },
    runtimeLifecycle: {
      resetHeatCapacityGroupUiRuntime: (...args) => runtimeLifecycle.resetHeatCapacityGroupUiRuntime(...args),
    },
    preferences: {
      settingsLanguagePreference,
    },
    tutorial: {
      tutorialActiveRef,
      experienceProfileRef,
      completeExperimentLearningTutorial: (...args) => completeExperimentLearningTutorial(...args),
    },
    lifecycle: {
      flushWorkspacePersistenceRef,
    },
  });

  const activeHeatCapacityFreeParameterLockReason = getHeatCapacityFreeParameterLockReason(activeFile);

  const activeHeatCapacityFreeParameterLockMessage = getHeatCapacityFreeParameterLockMessage(
    activeHeatCapacityFreeParameterLockReason,
    settingsLanguagePreference,
  );

  const activeHeatCapacityFreeParameterLocked = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    activeHeatCapacityFreeParameterLockReason !== null;

  const activeHeatCapacityFreeIdealReadonly = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    free.activeHeatCapacityNextScheme === 'ideal';

  const activeHeatCapacityFreeSchemeLocked = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    !free.activeHeatCapacityCurrentGroupTerminal &&
    isHeatCapacityFreeExperimentStarted(activeFile);

  const activeHeatCapacityFreeParameterInputDisabled =
    activeHeatCapacityFreeParameterLocked || activeHeatCapacityFreeIdealReadonly;

  const visibleHeatCapacityParamHelpId =
    parameterState.pinnedHeatCapacityParamHelpId ?? parameterState.hoveredHeatCapacityParamHelpId;

  const parameterProjection = useWorkbenchHeatParameterProjection({ heatCapacityRefreshRestorePendingRef: scene.heatCapacityRefreshRestorePendingRef, heatCapacityModeTransitionStateRef: scene.heatCapacityModeTransitionStateRef, setHeatCapacityBasicInputDrafts: parameterState.setHeatCapacityBasicInputDrafts, setHeatCapacityBasicInputErrors: parameterState.setHeatCapacityBasicInputErrors, setHeatCapacityAdvancedOpen: parameterState.setHeatCapacityAdvancedOpen, setHeatCapacityAdvancedDraft: parameterState.setHeatCapacityAdvancedDraft, setHeatCapacityAdvancedInputDrafts: parameterState.setHeatCapacityAdvancedInputDrafts, setHeatCapacityAdvancedInputErrors: parameterState.setHeatCapacityAdvancedInputErrors, setHeatCapacityRestoreDefaultConfirmOpen: parameterState.setHeatCapacityRestoreDefaultConfirmOpen, setHeatCapacityIdealIntroOpen: parameterState.setHeatCapacityIdealIntroOpen, setParameterInputDrafts, setHoveredHeatCapacityParamHelpId: parameterState.setHoveredHeatCapacityParamHelpId, setPinnedHeatCapacityParamHelpId: parameterState.setPinnedHeatCapacityParamHelpId, setHeatCapacityParamHelpPopoverStyle: parameterState.setHeatCapacityParamHelpPopoverStyle, activeFile });

  const parameterHelp: ReturnType<typeof useWorkbenchHeatParameterHelp> = useWorkbenchHeatParameterHelp({ pinnedHeatCapacityParamHelpId: parameterState.pinnedHeatCapacityParamHelpId, heatCapacityParamHelpSuppressClickRef: parameterState.heatCapacityParamHelpSuppressClickRef, setPinnedHeatCapacityParamHelpId: parameterState.setPinnedHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId: parameterState.setHoveredHeatCapacityParamHelpId, setHeatCapacityParamHelpPopoverStyle: parameterState.setHeatCapacityParamHelpPopoverStyle });

  const realtimeClock = useWorkbenchHeatRealtimeClock({ desktopExitQuiesced, heatCapacityRefreshRestoring: scene.heatCapacityRefreshRestoring, heatCapacityRefreshRestorePendingRef: scene.heatCapacityRefreshRestorePendingRef, heatCapacityRuntimeFailureFileId: scene.heatCapacityRuntimeFailureFileId, desktopExitQuiescedRef, setFiles, activeFileIdRef, heatCapacityRefreshActiveFileIdRef: scene.heatCapacityRefreshActiveFileIdRef, heatCapacityRuntimeFailureFileIdRef: scene.heatCapacityRuntimeFailureFileIdRef, heatCapacityLessonPausedFileIdRef: lessonState.heatCapacityLessonPausedFileIdRef, heatCapacityLessonDialogActiveRef: lessonState.heatCapacityLessonDialogActiveRef, filesRef, heatCapacityQualityProfile: scene.heatCapacityQualityProfile });

  const parameterActions: ReturnType<typeof createWorkbenchHeatParameterActions> = createWorkbenchHeatParameterActions({ filesRef, activeFileIdRef, setParametersCollapsed, setHeatCapacityAdvancedOpen: parameterState.setHeatCapacityAdvancedOpen, setPinnedHeatCapacityParamHelpId: parameterState.setPinnedHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId: parameterState.setHoveredHeatCapacityParamHelpId, setHeatCapacityParamHelpPopoverStyle: parameterState.setHeatCapacityParamHelpPopoverStyle, activeFile, settingsLanguagePreference, setScanInputToast, pushLog: (...args) => pushLog(...args), activeHeatCapacityFreeIdealReadonly, activeHeatCapacityFreeParameterLocked, validateHeatCapacityFreeNumberValue: (...args) => parameterValidation.validateHeatCapacityFreeNumberValue(...args), setHeatCapacityBasicInputErrors: parameterState.setHeatCapacityBasicInputErrors, updateActiveFile: (...args) => updateActiveFile(...args), setHeatCapacityBasicInputDrafts: parameterState.setHeatCapacityBasicInputDrafts, setHeatCapacityHardSphereViewEnabled: (...args) => instrument.setHeatCapacityHardSphereViewEnabled(...args), setHeatCapacityRestoreDefaultConfirmOpen: parameterState.setHeatCapacityRestoreDefaultConfirmOpen, setHeatCapacityAdvancedDraft: parameterState.setHeatCapacityAdvancedDraft, setHeatCapacityAdvancedInputDrafts: parameterState.setHeatCapacityAdvancedInputDrafts, setHeatCapacityAdvancedInputErrors: parameterState.setHeatCapacityAdvancedInputErrors, guardWorkbenchTutorialAction: (...args) => guardWorkbenchTutorialAction(...args), heatCapacityAdvancedInputDrafts: parameterState.heatCapacityAdvancedInputDrafts, getHeatCapacityFreeParameterMaximum: (...args) => parameterValidation.getHeatCapacityFreeParameterMaximum(...args), getHeatCapacityFreeValueTooLargeMessage: (...args) => parameterValidation.getHeatCapacityFreeValueTooLargeMessage(...args) });

  const parameterScheme: ReturnType<typeof createWorkbenchHeatParameterSchemeActions> = createWorkbenchHeatParameterSchemeActions({ settingsLanguagePreference, setScanInputToast, pushLog: (...args) => pushLog(...args), activeFile, filesRef, activeFileIdRef, updateActiveFile: (...args) => updateActiveFile(...args), setHeatCapacityIdealIntroOpen: parameterState.setHeatCapacityIdealIntroOpen });

  const parameterValidation: ReturnType<typeof createWorkbenchHeatParameterValidation> = createWorkbenchHeatParameterValidation({ settingsLanguagePreference });

  const demoUi: ReturnType<typeof createWorkbenchHeatDemoUiActions> = createWorkbenchHeatDemoUiActions({
    scene,
    demoState,
    feedback: {
      heatCapacityRealtimeCopy: feedback.heatCapacityRealtimeCopy,
      showHeatCapacityToast: (...args) => feedback.showHeatCapacityToast(...args),
    },
    ui: {
      isHeatCapacityModalLocked,
    },
    workspace: {
      activeFile,
    },
    guideState: {
      setGuideHeatCapacityRollback: guideState.setGuideHeatCapacityRollback,
    },
  });

  const checklistStepSync = useWorkbenchHeatChecklistStepSync({ heatCapacityRefreshRestorePendingRef: scene.heatCapacityRefreshRestorePendingRef, activeFile, activeHeatCapacityGuideStep: guideState.activeHeatCapacityGuideStep, heatCapacityGuideChecklistCurrentIndexRef: checklist.heatCapacityGuideChecklistCurrentIndexRef, heatCapacityGuideChecklistPendingWheelDeltaRef: checklist.heatCapacityGuideChecklistPendingWheelDeltaRef, heatCapacityGuideChecklistSnapTimerRef: checklist.heatCapacityGuideChecklistSnapTimerRef, heatCapacityGuideChecklistReturnTimerRef: checklist.heatCapacityGuideChecklistReturnTimerRef, applyHeatCapacityGuideChecklistView: (...args) => checklist.applyHeatCapacityGuideChecklistView(...args) });

  const instrument: ReturnType<typeof useWorkbenchHeatInstrument> = useWorkbenchHeatInstrument({
    scene,
    workspace: {
      updateActiveFile: (...args) => updateActiveFile(...args),
      activeFile,
      updateFileById: (...args) => updateFileById(...args),
      filesRef,
      activeFileIdRef,
    },
    guideState: {
      activeHeatCapacityPreheatMode: guideState.activeHeatCapacityPreheatMode,
      guideHeatCapacityActiveFileIdRef: guideState.guideHeatCapacityActiveFileIdRef,
    },
    ui: {
      isHeatCapacityModalLocked,
      pushLog: (...args) => pushLog(...args),
    },
    guide: {
      guardGuideHeatCapacityAction: (...args) => guide.guardGuideHeatCapacityAction(...args),
      showGuideHeatCapacityGuidance: (...args) => guide.showGuideHeatCapacityGuidance(...args),
      clearGuideHeatCapacityGuidance: (...args) => guide.clearGuideHeatCapacityGuidance(...args),
      getGuideStepGuidance: (...args) => guide.getGuideStepGuidance(...args),
    },
    feedback: {
      getHeatCapacityRecordSuccessToast: (...args) => feedback.getHeatCapacityRecordSuccessToast(...args),
      showHeatCapacityRecordSuccessSequence: (...args) => feedback.showHeatCapacityRecordSuccessSequence(...args),
      heatCapacityRealtimeCopy: feedback.heatCapacityRealtimeCopy,
      showHeatCapacityGuidePowerOffCompletionToast: (...args) => feedback.showHeatCapacityGuidePowerOffCompletionToast(...args),
      showHeatCapacityFreeGroupCompletionToast: (...args) => feedback.showHeatCapacityFreeGroupCompletionToast(...args),
      heatCapacityClosePumpValveReminderFileIdRef: feedback.heatCapacityClosePumpValveReminderFileIdRef,
      clearHeatCapacityClosePumpValveReminder: (...args) => feedback.clearHeatCapacityClosePumpValveReminder(...args),
      clearHeatCapacityToastBySource: (...args) => feedback.clearHeatCapacityToastBySource(...args),
      showHeatCapacityPolicyToast: (...args) => feedback.showHeatCapacityPolicyToast(...args),
      showHeatCapacityToast: (...args) => feedback.showHeatCapacityToast(...args),
      showHeatCapacityPressureAlarm: (...args) => feedback.showHeatCapacityPressureAlarm(...args),
      showHeatCapacityPressureThresholdToast: (...args) => feedback.showHeatCapacityPressureThresholdToast(...args),
    },
    parameterActions: {
      collapseHeatCapacityFreeParameterSidebarForExperimentAction: (...args) => parameterActions.collapseHeatCapacityFreeParameterSidebarForExperimentAction(...args),
    },
    focus: {
      markHeatCapacityFocusSessionNonReversible: (...args) => focus.markHeatCapacityFocusSessionNonReversible(...args),
      exitHeatCapacityFocusMode: (...args) => focus.exitHeatCapacityFocusMode(...args),
    },
    runtimeLifecycle: {
      resetHeatCapacityGroupUiRuntime: (...args) => runtimeLifecycle.resetHeatCapacityGroupUiRuntime(...args),
      resetHeatCapacitySceneUiState: (...args) => runtimeLifecycle.resetHeatCapacitySceneUiState(...args),
    },
    preferences: {
      settingsLanguagePreference,
    },
    sceneRestore: {
      commitHeatCapacityFileProjection: (...args) => sceneRestore.commitHeatCapacityFileProjection(...args),
      applyHeatCapacityModeUiProjection: (...args) => sceneRestore.applyHeatCapacityModeUiProjection(...args),
    },
    demoUi: {
      showHeatCapacityAutoDemoCompletionToast: (...args) => demoUi.showHeatCapacityAutoDemoCompletionToast(...args),
      showHeatCapacityAutoDemoLockedToast: (...args) => demoUi.showHeatCapacityAutoDemoLockedToast(...args),
    },
    mode: {
      exitHeatCapacityTeachingModeToExplore: (...args) => mode.exitHeatCapacityTeachingModeToExplore(...args),
    },
    demoState: {
      autoDemoInteractionLocked: demoState.autoDemoInteractionLocked,
    },
    pump: {
      setHeatCapacityPumpPulseId: pump.setHeatCapacityPumpPulseId,
      clearHeatCapacityPumpAnimationTimers: (...args) => pump.clearHeatCapacityPumpAnimationTimers(...args),
      scheduleHeatCapacityPumpAnimation: (...args) => pump.scheduleHeatCapacityPumpAnimation(...args),
    },
  });

  const runtimeLifecycle: ReturnType<typeof useWorkbenchHeatRuntimeLifecycle> = useWorkbenchHeatRuntimeLifecycle({
    demoRuntime: {
      clearHeatCapacityAutoDemoTimers: (...args) => demoRuntime.clearHeatCapacityAutoDemoTimers(...args),
    },
    pump: {
      clearHeatCapacityPumpAnimationTimers: (...args) => pump.clearHeatCapacityPumpAnimationTimers(...args),
    },
    feedback: {
      heatCapacityToastTimerRef: feedback.heatCapacityToastTimerRef,
      heatCapacityPressureAlarmTimerRef: feedback.heatCapacityPressureAlarmTimerRef,
      heatCapacityPressureAlarmTimerGenerationRef: feedback.heatCapacityPressureAlarmTimerGenerationRef,
      heatCapacityPressureAlarmDeadlineAtMsRef: feedback.heatCapacityPressureAlarmDeadlineAtMsRef,
      heatCapacityPressureAlarmFileIdRef: feedback.heatCapacityPressureAlarmFileIdRef,
      heatCapacityClosePumpValveReminderTimerRef: feedback.heatCapacityClosePumpValveReminderTimerRef,
      heatCapacityClosePumpValveReminderTimerGenerationRef: feedback.heatCapacityClosePumpValveReminderTimerGenerationRef,
      heatCapacityClosePumpValveReminderDeadlineAtMsRef: feedback.heatCapacityClosePumpValveReminderDeadlineAtMsRef,
      heatCapacityClosePumpValveReminderFileIdRef: feedback.heatCapacityClosePumpValveReminderFileIdRef,
      heatCapacityRecordSuccessToastTimersRef: feedback.heatCapacityRecordSuccessToastTimersRef,
      clearHeatCapacityRecordSuccessToastTimers: (...args) => feedback.clearHeatCapacityRecordSuccessToastTimers(...args),
      clearHeatCapacityToastQueue: (...args) => feedback.clearHeatCapacityToastQueue(...args),
      clearHeatCapacityPressureAlertUiState: (...args) => feedback.clearHeatCapacityPressureAlertUiState(...args),
      heatCapacityToastDeadlineAtMsRef: feedback.heatCapacityToastDeadlineAtMsRef,
      heatCapacityToastCurrentRef: feedback.heatCapacityToastCurrentRef,
      heatCapacityToastPausedRef: feedback.heatCapacityToastPausedRef,
      heatCapacityToastTimerGenerationRef: feedback.heatCapacityToastTimerGenerationRef,
      heatCapacityRecordSuccessReleaseDeadlineAtMsRef: feedback.heatCapacityRecordSuccessReleaseDeadlineAtMsRef,
      heatCapacityRecordSuccessPausedRef: feedback.heatCapacityRecordSuccessPausedRef,
      heatCapacityRecordSuccessFollowUpMessageRef: feedback.heatCapacityRecordSuccessFollowUpMessageRef,
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef: feedback.heatCapacityRecordSuccessFollowUpDeadlineAtMsRef,
      heatCapacityRecordSuccessTimerGenerationRef: feedback.heatCapacityRecordSuccessTimerGenerationRef,
      scheduleHeatCapacityToastAdvance: (...args) => feedback.scheduleHeatCapacityToastAdvance(...args),
      scheduleHeatCapacityRecordSuccessToastTimers: (...args) => feedback.scheduleHeatCapacityRecordSuccessToastTimers(...args),
    },
    demoState,
    guideState,
    guide: {
      clearGuideHeatCapacityGuidance: (...args) => guide.clearGuideHeatCapacityGuidance(...args),
      clearGuideHeatCapacityStrongReminder: (...args) => guide.clearGuideHeatCapacityStrongReminder(...args),
      clearGuideHeatCapacityGuidancePulseTimer: (...args) => guide.clearGuideHeatCapacityGuidancePulseTimer(...args),
      clearHeatCapacityGuideStartTimer: (...args) => guide.clearHeatCapacityGuideStartTimer(...args),
    },
    lessons: {
      clearHeatCapacityGuideLessonState: (...args) => lessons.clearHeatCapacityGuideLessonState(...args),
      clearHeatCapacityGuideLessonTimers: (...args) => lessons.clearHeatCapacityGuideLessonTimers(...args),
      scheduleHeatCapacityGuideLessonClose: (...args) => lessons.scheduleHeatCapacityGuideLessonClose(...args),
      clearHeatCapacityGuideLessonRuntimeForFileExit: (...args) => lessons.clearHeatCapacityGuideLessonRuntimeForFileExit(...args),
    },
    scene,
    demoUi: {
      clearHeatCapacityAutoDemoUiState: (...args) => demoUi.clearHeatCapacityAutoDemoUiState(...args),
      scheduleHeatCapacityAutoDemoCompletionToastExpiry: (...args) => demoUi.scheduleHeatCapacityAutoDemoCompletionToastExpiry(...args),
      scheduleHeatCapacityAutoDemoStepPanelHide: (...args) => demoUi.scheduleHeatCapacityAutoDemoStepPanelHide(...args),
    },
    free: {
      setPendingRemoveHeatCapacityTrialRecord: free.setPendingRemoveHeatCapacityTrialRecord,
    },
    instrument,
    checkpoint: {
      getHeatCapacityRefreshRemainingMs: (...args) => checkpoint.getHeatCapacityRefreshRemainingMs(...args),
    },
    lessonState,
    lifecycle: {
      desktopExitQuiescedRef,
    },
    workspace: {
      activeFileIdRef,
    },
  });

  const demoRuntime: ReturnType<typeof createWorkbenchHeatDemoRuntimeActions> = createWorkbenchHeatDemoRuntimeActions({
    demoState,
    demoUi: {
      cancelHeatCapacityAutoDemoLockedPointerToast: (...args) => demoUi.cancelHeatCapacityAutoDemoLockedPointerToast(...args),
      showHeatCapacityAutoDemoStepPanel: (...args) => demoUi.showHeatCapacityAutoDemoStepPanel(...args),
      setHeatCapacityAutoDemoCameraFocus: (...args) => demoUi.setHeatCapacityAutoDemoCameraFocus(...args),
      hideHeatCapacityAutoDemoStepPanel: (...args) => demoUi.hideHeatCapacityAutoDemoStepPanel(...args),
      showHeatCapacityAutoDemoCompletionToast: (...args) => demoUi.showHeatCapacityAutoDemoCompletionToast(...args),
    },
    workspace: {
      updateFileById: (...args) => updateFileById(...args),
      filesRef,
      activeFileIdRef,
      activeFile,
      updateActiveFile: (...args) => updateActiveFile(...args),
    },
    feedback: {
      heatCapacityRealtimeCopy: feedback.heatCapacityRealtimeCopy,
      clearHeatCapacityPressureAlertUiState: (...args) => feedback.clearHeatCapacityPressureAlertUiState(...args),
      clearHeatCapacityToastQueue: (...args) => feedback.clearHeatCapacityToastQueue(...args),
      clearHeatCapacityRecordSuccessToastTimers: (...args) => feedback.clearHeatCapacityRecordSuccessToastTimers(...args),
    },
    instrument: {
      pressHeatCapacityPumpBulb: (...args) => instrument.pressHeatCapacityPumpBulb(...args),
      setHeatCapacityStopcockOpenByFileId: (...args) => instrument.setHeatCapacityStopcockOpenByFileId(...args),
    },
    ui: {
      pushLog: (...args) => pushLog(...args),
      setSelectedPanel,
    },
    lifecycle: {
      desktopExitQuiescedRef,
      flushWorkspaceAfterRunStateCommit: (...args) => flushWorkspaceAfterRunStateCommit(...args),
      desktopExitAutoDemoClockRef,
    },
    scene,
    guide: {
      clearGuideHeatCapacityGuidance: (...args) => guide.clearGuideHeatCapacityGuidance(...args),
      clearHeatCapacityGuideStartTimer: (...args) => guide.clearHeatCapacityGuideStartTimer(...args),
    },
    guideState: {
      setGuideHeatCapacityActiveFileId: guideState.setGuideHeatCapacityActiveFileId,
    },
    mode: {
      activateHeatCapacityModeFromExplore: (...args) => mode.activateHeatCapacityModeFromExplore(...args),
      switchHeatCapacityMode: (...args) => mode.switchHeatCapacityMode(...args),
      exitHeatCapacityTeachingModeToExplore: (...args) => mode.exitHeatCapacityTeachingModeToExplore(...args),
    },
  });

  const checkpoint: ReturnType<typeof createWorkbenchHeatRuntimeCheckpoint> = createWorkbenchHeatRuntimeCheckpoint({
    scene,
    demoState,
    lifecycle: {
      desktopExitQuiescedRef,
      desktopExitAutoDemoClockRef,
    },
    initial: {
      initialHeatCapacityRefreshSession,
    },
    lessonState,
    guideState,
    checklist: {
      heatCapacityGuideChecklistViewedIndexRef: checklist.heatCapacityGuideChecklistViewedIndexRef,
    },
    pump: {
      heatCapacityPumpAnimationRef: pump.heatCapacityPumpAnimationRef,
    },
  });

  const refreshCapture: ReturnType<typeof createWorkbenchHeatRefreshSessionCapture> = createWorkbenchHeatRefreshSessionCapture({
    workspace: {
      filesRef,
      activeFileIdRef,
    },
    scene,
    checkpoint: {
      resolveDeferredHeatCapacityGuideUiCheckpoint: (...args) => checkpoint.resolveDeferredHeatCapacityGuideUiCheckpoint(...args),
      captureHeatCapacityDemoUiCheckpoint: (...args) => checkpoint.captureHeatCapacityDemoUiCheckpoint(...args),
      captureHeatCapacityGuideUiCheckpoint: (...args) => checkpoint.captureHeatCapacityGuideUiCheckpoint(...args),
      captureHeatCapacityPumpAnimationCheckpoint: (...args) => checkpoint.captureHeatCapacityPumpAnimationCheckpoint(...args),
      captureHeatCapacitySceneCheckpoint: (...args) => checkpoint.captureHeatCapacitySceneCheckpoint(...args),
      getHeatCapacityRefreshRemainingMs: (...args) => checkpoint.getHeatCapacityRefreshRemainingMs(...args),
    },
    demoState: {
      heatCapacityModeTransitionDemoClockRef: demoState.heatCapacityModeTransitionDemoClockRef,
    },
    feedback,

    lessonState,
    free: {
      heatCapacityReviewSelectionByFileId: free.heatCapacityReviewSelectionByFileId,
    },
    lifecycle: {
      captureWorkbenchRefreshPresentation,
    },
    parameterState,
  });

  const mode: ReturnType<typeof useWorkbenchHeatModeRuntime> = useWorkbenchHeatModeRuntime({
    workspace: {
      filesRef,
      activeFileIdRef,
      updateFileById: (...args) => updateFileById(...args),
      activeFile,
    },
    sceneRestore: {
      commitHeatCapacityFileProjection: (...args) => sceneRestore.commitHeatCapacityFileProjection(...args),
      applyHeatCapacityModeUiProjection: (...args) => sceneRestore.applyHeatCapacityModeUiProjection(...args),
      restoreHeatCapacityGuideUiCheckpoint: (...args) => sceneRestore.restoreHeatCapacityGuideUiCheckpoint(...args),
      activeFileOwnsPendingHeatCapacityRefresh: (...args) => sceneRestore.activeFileOwnsPendingHeatCapacityRefresh(...args),
      cancelPendingHeatCapacityRefreshRestore: (...args) => sceneRestore.cancelPendingHeatCapacityRefreshRestore(...args),
    },
    scene: {
      heatCapacityRuntimeFailureFileIdRef: scene.heatCapacityRuntimeFailureFileIdRef,
      heatCapacityModeTransitionStateRef: scene.heatCapacityModeTransitionStateRef,
      dispatchHeatCapacityModeTransition: (...args) => scene.dispatchHeatCapacityModeTransition(...args),
      requestHeatCapacityModeTransition: (...args) => scene.requestHeatCapacityModeTransition(...args),
      heatCapacitySceneDiscreteMotionRef: scene.heatCapacitySceneDiscreteMotionRef,
      heatCapacityRefreshRestorePendingRef: scene.heatCapacityRefreshRestorePendingRef,
      heatCapacityModeTransitionPausedVisualClockRef: scene.heatCapacityModeTransitionPausedVisualClockRef,
      heatCapacitySceneModeTransitionControllerRef: scene.heatCapacitySceneModeTransitionControllerRef,
      setHeatCapacityModeSceneRestoreRequest: scene.setHeatCapacityModeSceneRestoreRequest,
      pendingHeatCapacityGuideUiRestoreRef: scene.pendingHeatCapacityGuideUiRestoreRef,
      scheduleHeatCapacityModeTargetPreparationRef: scene.scheduleHeatCapacityModeTargetPreparationRef,
      heatCapacityModeTransitionPrepareFrameRef: scene.heatCapacityModeTransitionPrepareFrameRef,
      heatCapacityModeTransitionVisualTimerRef: scene.heatCapacityModeTransitionVisualTimerRef,
      heatCapacitySceneCheckpointProviderRef: scene.heatCapacitySceneCheckpointProviderRef,
      heatCapacitySceneCheckpointSuppressPersistenceRef: scene.heatCapacitySceneCheckpointSuppressPersistenceRef,
      heatCapacityModeTransitionWatchdogHandlerRef: scene.heatCapacityModeTransitionWatchdogHandlerRef,
      heatCapacityModeTransitionState: scene.heatCapacityModeTransitionState,
      heatCapacityRefreshRestoring: scene.heatCapacityRefreshRestoring,
      heatCapacityModeTransitionRefreshResumedRef: scene.heatCapacityModeTransitionRefreshResumedRef,
      heatCapacitySceneReadyFileId: scene.heatCapacitySceneReadyFileId,
    },
    lifecycle: {
      desktopExitQuiescedRef,
      heatCapacityRefreshPersistRef,
      flushWorkspacePersistenceRef,
      desktopExitQuiesced,
    },
    ui: {
      setLeftCollapsed,
      setParametersCollapsed,
      requestPromptConfirmation: (...args) => requestPromptConfirmation(...args),
    },
    runtimeLifecycle: {
      resetHeatCapacitySceneUiState: (...args) => runtimeLifecycle.resetHeatCapacitySceneUiState(...args),
      releaseHeatCapacityRuntimeForFileExit: (...args) => runtimeLifecycle.releaseHeatCapacityRuntimeForFileExit(...args),
    },
    demoRuntime: {
      startHeatCapacityAutoDemoUi: (...args) => demoRuntime.startHeatCapacityAutoDemoUi(...args),
      quiesceHeatCapacityAutoDemoForModeTransition: (...args) => demoRuntime.quiesceHeatCapacityAutoDemoForModeTransition(...args),
      resumeQuiescedHeatCapacityAutoDemo: (...args) => demoRuntime.resumeQuiescedHeatCapacityAutoDemo(...args),
    },
    demoUi: {
      showHeatCapacityAutoDemoCompletionToast: (...args) => demoUi.showHeatCapacityAutoDemoCompletionToast(...args),
      showHeatCapacityTeachingCompletedLockedInteraction: (...args) => demoUi.showHeatCapacityTeachingCompletedLockedInteraction(...args),
    },
    feedback: {
      heatCapacityRealtimeCopy: feedback.heatCapacityRealtimeCopy,
    },
    demoState,
    checkpoint: {
      resolveDeferredHeatCapacityGuideUiCheckpoint: (...args) => checkpoint.resolveDeferredHeatCapacityGuideUiCheckpoint(...args),
      buildHeatCapacityModeUiCheckpoint: (...args) => checkpoint.buildHeatCapacityModeUiCheckpoint(...args),
    },
    pump: {
      clearHeatCapacityPumpAnimationTimers: (...args) => pump.clearHeatCapacityPumpAnimationTimers(...args),
    },
    preferences: {
      workbenchPromptCopy,
    },
    initial: {
      initialHeatCapacityRefreshSession,
    },
    tutorial: {
      experienceProfile,
      tutorialActive,
      activeTutorialExperiment,
      setTutorialBlockedNoticeOpen,
    },
    free,
  });

  const sceneRestore: ReturnType<typeof useWorkbenchHeatSceneRestore> = useWorkbenchHeatSceneRestore({
    scene,
    guide: {
      restoreGuideHeatCapacityPulse: (...args) => guide.restoreGuideHeatCapacityPulse(...args),
    },
    guideState: {
      setGuideHeatCapacityStrongReminderActive: guideState.setGuideHeatCapacityStrongReminderActive,
      setGuideHeatCapacityStrongReminderControlId: guideState.setGuideHeatCapacityStrongReminderControlId,
      guideHeatCapacityMissCountRef: guideState.guideHeatCapacityMissCountRef,
      guideHeatCapacityRestoredStrongReminderTimerRef: guideState.guideHeatCapacityRestoredStrongReminderTimerRef,
      guideHeatCapacityPausedPendingStrongReminderRef: guideState.guideHeatCapacityPausedPendingStrongReminderRef,
      guideHeatCapacityActiveFileIdRef: guideState.guideHeatCapacityActiveFileIdRef,
      setGuideHeatCapacityActiveFileId: guideState.setGuideHeatCapacityActiveFileId,
      getHeatCapacityGuideStep: (...args) => guideState.getHeatCapacityGuideStep(...args),
    },
    lessonState,
    checklist: {
      heatCapacityGuideChecklistViewedIndexRef: checklist.heatCapacityGuideChecklistViewedIndexRef,
      setHeatCapacityGuideChecklistViewedIndex: checklist.setHeatCapacityGuideChecklistViewedIndex,
    },
    runtimeLifecycle: {
      clearHeatCapacityModeTransientUiRuntime: (...args) => runtimeLifecycle.clearHeatCapacityModeTransientUiRuntime(...args),
    },
    pump: {
      restorePausedHeatCapacityPumpAnimation: (...args) => pump.restorePausedHeatCapacityPumpAnimation(...args),
      scheduleHeatCapacityPumpAnimation: (...args) => pump.scheduleHeatCapacityPumpAnimation(...args),
    },
    demoState,
    demoUi: {
      showHeatCapacityAutoDemoCompletionToast: (...args) => demoUi.showHeatCapacityAutoDemoCompletionToast(...args),
      scheduleHeatCapacityAutoDemoCompletionToastExpiry: (...args) => demoUi.scheduleHeatCapacityAutoDemoCompletionToastExpiry(...args),
    },
    lifecycle: {
      desktopExitQuiescedRef,
      skipInitialConsoleScrollRef,
      scheduleHeatCapacitySemanticSceneCheckpointRef,
      heatCapacityLifecycleFlushInProgressRef,
      heatCapacityRefreshPersistRef,
      scheduleWorkspacePersistenceRef,
      desktopExitQuiesced,
    },
    workspace: {
      filesRef,
      setFiles,
      activeFileIdRef,
      activeFileId,
    },
    initial: {
      initialHeatCapacityRefreshSession,
    },
    feedback: {
      heatCapacityPressureAlarmFileIdRef: feedback.heatCapacityPressureAlarmFileIdRef,
      heatCapacityPressureAlarmTimerGenerationRef: feedback.heatCapacityPressureAlarmTimerGenerationRef,
      heatCapacityPressureAlarmTimerRef: feedback.heatCapacityPressureAlarmTimerRef,
      heatCapacityPressureAlarmDeadlineAtMsRef: feedback.heatCapacityPressureAlarmDeadlineAtMsRef,
      desktopExitPausedPressureAlarmRef: feedback.desktopExitPausedPressureAlarmRef,
      heatCapacityPressureAlarmVisibleRef: feedback.heatCapacityPressureAlarmVisibleRef,
      setHeatCapacityPressureAlarmVisible: feedback.setHeatCapacityPressureAlarmVisible,
      heatCapacityClosePumpValveReminderFileIdRef: feedback.heatCapacityClosePumpValveReminderFileIdRef,
      clearHeatCapacityClosePumpValveReminder: (...args) => feedback.clearHeatCapacityClosePumpValveReminder(...args),
      clearHeatCapacityToastQueue: (...args) => feedback.clearHeatCapacityToastQueue(...args),
      heatCapacityToastCurrentRef: feedback.heatCapacityToastCurrentRef,
      heatCapacityToastTimerGenerationRef: feedback.heatCapacityToastTimerGenerationRef,
      heatCapacityToastDeadlineAtMsRef: feedback.heatCapacityToastDeadlineAtMsRef,
      heatCapacityToastPausedRef: feedback.heatCapacityToastPausedRef,
      scheduleHeatCapacityToastAdvance: (...args) => feedback.scheduleHeatCapacityToastAdvance(...args),
      heatCapacityRecordSuccessPausedRef: feedback.heatCapacityRecordSuccessPausedRef,
      scheduleHeatCapacityRecordSuccessToastTimers: (...args) => feedback.scheduleHeatCapacityRecordSuccessToastTimers(...args),
      scheduleHeatCapacityPressureAlarmExpiry: (...args) => feedback.scheduleHeatCapacityPressureAlarmExpiry(...args),
      desktopExitPausedClosePumpValveReminderRef: feedback.desktopExitPausedClosePumpValveReminderRef,
      scheduleHeatCapacityClosePumpValveReminder: (...args) => feedback.scheduleHeatCapacityClosePumpValveReminder(...args),
    },
    demoRuntime: {
      clearHeatCapacityAutoDemoTimers: (...args) => demoRuntime.clearHeatCapacityAutoDemoTimers(...args),
      scheduleHeatCapacityAutoDemoTimeline: (...args) => demoRuntime.scheduleHeatCapacityAutoDemoTimeline(...args),
    },
    lessons: {
      scheduleHeatCapacityGuideLessonClose: (...args) => lessons.scheduleHeatCapacityGuideLessonClose(...args),
    },
  });

  const recovery: ReturnType<typeof useWorkbenchHeatRuntimeRecovery> = useWorkbenchHeatRuntimeRecovery({
    scene,
    workspace: {
      filesRef,
      setFiles,
      activeFileIdRef,
    },
    lifecycle: {
      desktopExitQuiescedRef,
      desktopExitQuiesced,
    },
    mode: {
      pauseHeatCapacityModeTransitionRuntime: (...args) => mode.pauseHeatCapacityModeTransitionRuntime(...args),
      resumeHeatCapacityModeTransitionRuntime: (...args) => mode.resumeHeatCapacityModeTransitionRuntime(...args),
    },
    feedback: {
      pauseHeatCapacityPressureAlertTimers: (...args) => feedback.pauseHeatCapacityPressureAlertTimers(...args),
      desktopExitPausedPressureAlarmRef: feedback.desktopExitPausedPressureAlarmRef,
      desktopExitPausedClosePumpValveReminderRef: feedback.desktopExitPausedClosePumpValveReminderRef,
      heatCapacityPressureAlarmVisibleRef: feedback.heatCapacityPressureAlarmVisibleRef,
      scheduleHeatCapacityPressureAlarmExpiry: (...args) => feedback.scheduleHeatCapacityPressureAlarmExpiry(...args),
      scheduleHeatCapacityClosePumpValveReminder: (...args) => feedback.scheduleHeatCapacityClosePumpValveReminder(...args),
    },
    runtimeLifecycle: {
      pauseHeatCapacityTransientUiTimers: (...args) => runtimeLifecycle.pauseHeatCapacityTransientUiTimers(...args),
      resumeHeatCapacityTransientUiTimers: (...args) => runtimeLifecycle.resumeHeatCapacityTransientUiTimers(...args),
    },
    guide: {
      clearHeatCapacityGuideStartTimer: (...args) => guide.clearHeatCapacityGuideStartTimer(...args),
      pauseGuideHeatCapacityReminderTimers: (...args) => guide.pauseGuideHeatCapacityReminderTimers(...args),
      clearGuideHeatCapacityGuidancePulseTimer: (...args) => guide.clearGuideHeatCapacityGuidancePulseTimer(...args),
    },
    pump: {
      pauseHeatCapacityPumpAnimation: (...args) => pump.pauseHeatCapacityPumpAnimation(...args),
      clearHeatCapacityPumpAnimationTimers: (...args) => pump.clearHeatCapacityPumpAnimationTimers(...args),
    },
    demoRuntime: {
      freezeHeatCapacityAutoDemoForRuntimeFailure: (...args) => demoRuntime.freezeHeatCapacityAutoDemoForRuntimeFailure(...args),
      clearHeatCapacityAutoDemoTimers: (...args) => demoRuntime.clearHeatCapacityAutoDemoTimers(...args),
    },
    ui: {
      pushLog: (...args) => pushLog(...args),
    },
    demoState,
  });
  return {
    effects: {
      initialDemo: { demoClock: demoState.effects.demoClock },
      presentation: { pressureAlarmProjection: feedback.effects.pressureAlarmProjection, guideFileProjection: guideState.effects.guideFileProjection, lessonDialogProjection: lessonState.effects.lessonDialogProjection, lessonDialogFocus: lessonState.effects.lessonDialogFocus, guideMaskObservation: guideState.effects.guideMaskObservation, resetFeedbackCleanup: instrument.effects.resetFeedbackCleanup },
      freeWorkspace: { batchSetupProjection: free.effects.batchSetupProjection, calculationReviewProjection: free.effects.calculationReviewProjection },
      parameterProjection: { parameterProjection: parameterProjection.effects.parameterProjection },
      parameterHelp: { parameterHelpPointer: parameterHelp.effects.parameterHelpPointer, parameterHelpClick: parameterHelp.effects.parameterHelpClick },
      realtime: { realtimeClock: realtimeClock.effects.realtimeClock },
      teaching: { teachingTimerCleanup: runtimeLifecycle.effects.teachingTimerCleanup, lessonIntro: lessons.effects.lessonIntro, checklistStepProjection: checklistStepSync.effects.checklistStepProjection, lessonStepProjection: lessons.effects.lessonStepProjection, checklistCleanup: checklist.effects.checklistCleanup, pumpTargetReset: guide.effects.pumpTargetReset, guideExitReset: guide.effects.guideExitReset, guideFileEntry: guide.effects.guideFileEntry, guideFocusProjection: guide.effects.guideFocusProjection, guidePulse: guide.effects.guidePulse, strongReminderProjection: guide.effects.strongReminderProjection, strongReminderTimer: guide.effects.strongReminderTimer, guideGuardFeedback: guide.effects.guideGuardFeedback, pumpAnimationProjection: pump.effects.pumpAnimationProjection, modeTransitionCleanup: mode.effects.modeTransitionCleanup, modeSessionProjection: mode.effects.modeSessionProjection },
      restore: { initialSceneRestore: sceneRestore.effects.initialSceneRestore, sceneRestoreAcknowledgement: sceneRestore.effects.sceneRestoreAcknowledgement, modeRuntimeResume: mode.effects.modeRuntimeResume },
      recovery: { runtimeRecovery: recovery.effects.runtimeRecovery },
    },
    view: {
      parameters: {
        heatCapacityBasicInputDrafts: parameterState.heatCapacityBasicInputDrafts,
        heatCapacityBasicInputErrors: parameterState.heatCapacityBasicInputErrors,
        heatCapacityAdvancedOpen: parameterState.heatCapacityAdvancedOpen,
        heatCapacityAdvancedDraft: parameterState.heatCapacityAdvancedDraft,
        heatCapacityAdvancedInputDrafts: parameterState.heatCapacityAdvancedInputDrafts,
        heatCapacityAdvancedInputErrors: parameterState.heatCapacityAdvancedInputErrors,
        heatCapacityRestoreDefaultConfirmOpen: parameterState.heatCapacityRestoreDefaultConfirmOpen,
        heatCapacityIdealIntroOpen: parameterState.heatCapacityIdealIntroOpen,
        heatCapacityParamHelpPopoverStyle: parameterState.heatCapacityParamHelpPopoverStyle,
        activeHeatCapacityFreeParameterLockMessage,
        activeHeatCapacityFreeParameterLocked,
        activeHeatCapacityFreeIdealReadonly,
        activeHeatCapacityFreeSchemeLocked,
        activeHeatCapacityFreeParameterInputDisabled,
        visibleHeatCapacityParamHelpId,
      },
      guide: {
        heatCapacityGuideChecklistViewedIndex: checklist.heatCapacityGuideChecklistViewedIndex,
        heatCapacityGuideLessonDialog: lessonState.heatCapacityGuideLessonDialog,
        heatCapacityGuideLessonOutgoingView: lessonState.heatCapacityGuideLessonOutgoingView,
        heatCapacityGuideLessonClosing: lessonState.heatCapacityGuideLessonClosing,
        heatCapacityLessonDialogActive: lessonState.heatCapacityLessonDialogActive,
        guideHeatCapacityActiveFileId: guideState.guideHeatCapacityActiveFileId,
        guideHeatCapacityFocusControlId: guideState.guideHeatCapacityFocusControlId,
        guideHeatCapacityPulseActive: guideState.guideHeatCapacityPulseActive,
        guideHeatCapacityStrongReminderActive: guideState.guideHeatCapacityStrongReminderActive,
        guideHeatCapacityStrongReminderControlId: guideState.guideHeatCapacityStrongReminderControlId,
        guideHeatCapacityStrongReminderFocusKey: guideState.guideHeatCapacityStrongReminderFocusKey,
        heatCapacityGuideMaskBounds: guideState.heatCapacityGuideMaskBounds,
        heatCapacityGuideProjectedHoles: guideState.heatCapacityGuideProjectedHoles,
        guideHeatCapacityRollback: guideState.guideHeatCapacityRollback,
        getHeatCapacityGuideStep: guideState.getHeatCapacityGuideStep,
        activeHeatCapacityGuideStep: guideState.activeHeatCapacityGuideStep,
        activeHeatCapacityPreheatMode: guideState.activeHeatCapacityPreheatMode,
        activeHeatCapacityPreheatLocked: guideState.activeHeatCapacityPreheatLocked,
        getGuideStepGuidance: guide.getGuideStepGuidance,
        getHeatCapacityGuideLessonView: lessons.getHeatCapacityGuideLessonView,
      },
      scene: {
        heatCapacityModeTransitionState: scene.heatCapacityModeTransitionState,
        heatCapacityModeTransitionLocked: scene.heatCapacityModeTransitionLocked,
        initialHeatCapacityCameraPose: scene.initialHeatCapacityCameraPose,
        initialHeatCapacityFocusMode: scene.initialHeatCapacityFocusMode,
        heatCapacityQualityProfile: scene.heatCapacityQualityProfile,
        initialHeatCapacityCameraTransition: scene.initialHeatCapacityCameraTransition,
        initialHeatCapacityUltraVisualState: scene.initialHeatCapacityUltraVisualState,
        initialHeatCapacityHardSphereVisualCheckpoint: scene.initialHeatCapacityHardSphereVisualCheckpoint,
        heatCapacitySceneRestoreAcknowledged: scene.heatCapacitySceneRestoreAcknowledged,
        heatCapacityInitialSceneRestoreEnabled: scene.heatCapacityInitialSceneRestoreEnabled,
        heatCapacityModeSceneRestoreSession: scene.heatCapacityModeSceneRestoreSession,
        heatCapacityModeSceneRestoreRequest: scene.heatCapacityModeSceneRestoreRequest,
        heatCapacityRefreshRestoring: scene.heatCapacityRefreshRestoring,
        heatCapacityRuntimeFailureFileId: scene.heatCapacityRuntimeFailureFileId,
        heatCapacityFocusResetKey: scene.heatCapacityFocusResetKey,
        heatCapacityHardSphereVisualResetKey: scene.heatCapacityHardSphereVisualResetKey,
      },
      demo: {
        autoDemoPhase: demoState.autoDemoPhase,
        autoDemoRunning: demoState.autoDemoRunning,
        autoDemoPaused: demoState.autoDemoPaused,
        autoDemoInteractionLocked: demoState.autoDemoInteractionLocked,
        autoDemoTimelineClockMs: demoState.autoDemoTimelineClockMs,
        autoDemoCompletionMessage: demoState.autoDemoCompletionMessage,
        demoFocusControlId: demoState.demoFocusControlId,
        demoFocusPulseActive: demoState.demoFocusPulseActive,
        demoCameraFocusMode: demoState.demoCameraFocusMode,
        demoCameraFocusKey: demoState.demoCameraFocusKey,
        autoDemoStepIndex: demoState.autoDemoStepIndex,
        autoDemoStepCount: demoState.autoDemoStepCount,
        autoDemoStepTitle: demoState.autoDemoStepTitle,
        autoDemoStepDescription: demoState.autoDemoStepDescription,
        autoDemoStepTarget: demoState.autoDemoStepTarget,
        autoDemoStepProgressCriterion: demoState.autoDemoStepProgressCriterion,
        autoDemoStepNote: demoState.autoDemoStepNote,
        autoDemoStepPanelMode: demoState.autoDemoStepPanelMode,
      },
      feedback: {
        heatCapacityToastCurrent: feedback.heatCapacityToastCurrent,
        activeHeatCapacityPressureAlarmVisible: feedback.activeHeatCapacityPressureAlarmVisible,
        heatCapacityRealtimeCopy: feedback.heatCapacityRealtimeCopy,
      },
      instrument: {
        heatCapacityPumpPulseId: pump.heatCapacityPumpPulseId,
        heatCapacityRecordPulseId: instrument.heatCapacityRecordPulseId,
        heatCapacityRecordControlsClosing: instrument.heatCapacityRecordControlsClosing,
        heatCapacityResetFeedbackActionId: instrument.heatCapacityResetFeedbackActionId,
      },
      free: {
        pendingRemoveHeatCapacityTrialRecord: free.pendingRemoveHeatCapacityTrialRecord,
        heatCapacityBatchSetupSelection: free.heatCapacityBatchSetupSelection,
        activeHeatCapacityFreeBatchProgress: free.activeHeatCapacityFreeBatchProgress,
        activeHeatCapacityCurrentGroup: free.activeHeatCapacityCurrentGroup,
        activeHeatCapacityNextScheme: free.activeHeatCapacityNextScheme,
        activeHeatCapacityGroupProgressStatus: free.activeHeatCapacityGroupProgressStatus,
        heatCapacityBatchSetupPurpose: free.heatCapacityBatchSetupPurpose,
        activeHeatCapacityCalculationSession: free.activeHeatCapacityCalculationSession,
        heatCapacityBatchSetupOpen: free.heatCapacityBatchSetupOpen,
        heatCapacityCalculationWindowOpen: free.heatCapacityCalculationWindowOpen,
        activeHeatCapacityInvalidAttemptPrompt: free.activeHeatCapacityInvalidAttemptPrompt,
      },
    },
    bindings: {
      guide: {
        heatCapacityGuideChecklistTrackRef: checklist.heatCapacityGuideChecklistTrackRef,
        heatCapacityGuideChecklistVisualOffsetRef: checklist.heatCapacityGuideChecklistVisualOffsetRef,
        heatCapacityGuideLessonDialogRef: lessonState.heatCapacityGuideLessonDialogRef,
        heatCapacityGuideMaskRef: guideState.heatCapacityGuideMaskRef,
      },
      demo: {
        heatCapacityAutoDemoTimelineRef: demoState.heatCapacityAutoDemoTimelineRef,
        heatCapacityAutoDemoStartedAtMsRef: demoState.heatCapacityAutoDemoStartedAtMsRef,
        heatCapacityAutoDemoPausedElapsedMsRef: demoState.heatCapacityAutoDemoPausedElapsedMsRef,
      },
    },
    commands: {
      parameters: {
        pinnedHeatCapacityParamHelpId: parameterState.pinnedHeatCapacityParamHelpId,
        hoverHeatCapacityParameterHelp: parameterHelp.hoverHeatCapacityParameterHelp,
        pinHeatCapacityParameterHelp: parameterHelp.pinHeatCapacityParameterHelp,
        hideHeatCapacityHoverTooltip: parameterHelp.hideHeatCapacityHoverTooltip,
        changeHeatCapacityParameterInputDraft: parameterActions.changeHeatCapacityParameterInputDraft,
        showHeatCapacityFreeParameterLockHint: parameterActions.showHeatCapacityFreeParameterLockHint,
        commitHeatCapacityBasicParameterInput: parameterActions.commitHeatCapacityBasicParameterInput,
        setHeatCapacityBasicCheckbox: parameterActions.setHeatCapacityBasicCheckbox,
        setHeatCapacityFreeGasType: parameterActions.setHeatCapacityFreeGasType,
        openHeatCapacityRestoreDefaultConfirm: parameterActions.openHeatCapacityRestoreDefaultConfirm,
        cancelHeatCapacityRestoreDefault: parameterActions.cancelHeatCapacityRestoreDefault,
        confirmHeatCapacityRestoreDefault: parameterActions.confirmHeatCapacityRestoreDefault,
        openHeatCapacityAdvancedSettings: parameterActions.openHeatCapacityAdvancedSettings,
        cancelHeatCapacityAdvancedParameterDraft: parameterActions.cancelHeatCapacityAdvancedParameterDraft,
        saveHeatCapacityAdvancedParameterDraft: parameterActions.saveHeatCapacityAdvancedParameterDraft,
        acknowledgeHeatCapacityFreeAdvancedRisk: parameterActions.acknowledgeHeatCapacityFreeAdvancedRisk,
        showHeatCapacityGasTypeLockHint: parameterActions.showHeatCapacityGasTypeLockHint,
        requestToggleHeatCapacityFreeParameterScheme: parameterScheme.requestToggleHeatCapacityFreeParameterScheme,
        cancelHeatCapacityIdealProfileIntro: parameterScheme.cancelHeatCapacityIdealProfileIntro,
        confirmHeatCapacityIdealProfileIntro: parameterScheme.confirmHeatCapacityIdealProfileIntro,
      },
      guide: {
        handleHeatCapacityGuideChecklistWheel: checklist.handleHeatCapacityGuideChecklistWheel,
        handleHeatCapacityGuideTargetHolesChange: guideState.setHeatCapacityGuideProjectedHoles,
        openHeatCapacityLessonIntro: lessons.openHeatCapacityLessonIntro,
        handleHeatCapacityGuideLessonDialogAdvance: lessons.handleHeatCapacityGuideLessonDialogAdvance,
        handleHeatCapacityGuideLessonDialogKeyDown: lessons.handleHeatCapacityGuideLessonDialogKeyDown,
        handleHeatCapacityGuideLessonCloseButtonMouseDown: lessons.handleHeatCapacityGuideLessonCloseButtonMouseDown,
        handleHeatCapacityGuideLessonCloseButtonClick: lessons.handleHeatCapacityGuideLessonCloseButtonClick,
      },
      instrument: {
        updateHeatCapacityFocusMode: focus.updateHeatCapacityFocusMode,
        handleHeatCapacityFocusExitRequest: focus.handleHeatCapacityFocusExitRequest,
        updateHeatCapacityFreeEquilibriumSpeedMultiplier: instrument.updateHeatCapacityFreeEquilibriumSpeedMultiplier,
        toggleHeatCapacityHardSphereView: instrument.toggleHeatCapacityHardSphereView,
        completeActiveHeatCapacityPreheat: instrument.completeActiveHeatCapacityPreheat,
        recordHeatCapacityGuideSample: instrument.recordHeatCapacityGuideSample,
        recordFreeHeatCapacitySample: instrument.recordFreeHeatCapacitySample,
        updateHeatCapacityPower: instrument.updateHeatCapacityPower,
        resetHeatCapacityGuideExperiment: instrument.resetHeatCapacityGuideExperiment,
        exitHeatCapacityGuideMode: instrument.exitHeatCapacityGuideMode,
        exitCompletedHeatCapacityTeachingMode: instrument.exitCompletedHeatCapacityTeachingMode,
        updateHeatCapacityStopcockOpen: instrument.updateHeatCapacityStopcockOpen,
        adjustHeatCapacityPressureZeroFineFromScene: instrument.adjustHeatCapacityPressureZeroFineFromScene,
        adjustHeatCapacityPressureZeroCoarseFromScene: instrument.adjustHeatCapacityPressureZeroCoarseFromScene,
        updateHeatCapacityPumpValve: instrument.updateHeatCapacityPumpValve,
        pressHeatCapacityPumpBulb: instrument.pressHeatCapacityPumpBulb,
      },
      free: {
        setPendingRemoveHeatCapacityTrialRecord: free.setPendingRemoveHeatCapacityTrialRecord,
        selectHeatCapacityBatchGroupCount: free.setHeatCapacityBatchSetupSelection,
        setHeatCapacityBatchSetupRequestedFileId: free.setHeatCapacityBatchSetupRequestedFileId,
        setHeatCapacityCalculationReviewOpen: free.setHeatCapacityCalculationReviewOpen,
        requestRemoveHeatCapacityTrialRecord: free.requestRemoveHeatCapacityTrialRecord,
        confirmHeatCapacityFreeBatchSetup: free.confirmHeatCapacityFreeBatchSetup,
        cancelHeatCapacityFreeBatchSetup: free.cancelHeatCapacityFreeBatchSetup,
        restartHeatCapacityFreeExperiment: free.restartHeatCapacityFreeExperiment,
        requestRestartHeatCapacityFreeExperiment: free.requestRestartHeatCapacityFreeExperiment,
        requestRestartHeatCapacityFreeGroup: free.requestRestartHeatCapacityFreeGroup,
        requestAbandonHeatCapacityFreeGroupDraft: free.requestAbandonHeatCapacityFreeGroupDraft,
        openNextHeatCapacityFreeExperimentGroupSetup: free.openNextHeatCapacityFreeExperimentGroupSetup,
        openFirstHeatCapacityFreeExperimentGroupSetup: free.openFirstHeatCapacityFreeExperimentGroupSetup,
        updateHeatCapacityCalculationDraft: free.updateHeatCapacityCalculationDraft,
        submitHeatCapacityCalculationStep: free.submitHeatCapacityCalculationStep,
        continueHeatCapacityCalculationAnswer: free.continueHeatCapacityCalculationAnswer,
        revealHeatCapacityCalculationAnswer: free.revealHeatCapacityCalculationAnswer,
        selectHeatCapacityCalculationGroup: free.selectHeatCapacityCalculationGroup,
        selectHeatCapacityCalculationAggregate: free.selectHeatCapacityCalculationAggregate,
        completeAndExitHeatCapacityCalculation: free.completeAndExitHeatCapacityCalculation,
        closeHeatCapacityCalculationReview: free.closeHeatCapacityCalculationReview,
        continueHeatCapacityInvalidAttempt: free.continueHeatCapacityInvalidAttempt,
        selectHeatCapacityViewedGroup: free.selectHeatCapacityViewedGroup,
        selectHeatCapacityViewedTrial: free.selectHeatCapacityViewedTrial,
      },
      demo: {
        handleHeatCapacitySceneLockedInteraction: demoUi.handleHeatCapacitySceneLockedInteraction,
        scheduleHeatCapacityAutoDemoLockedPointerToast: demoUi.scheduleHeatCapacityAutoDemoLockedPointerToast,
        runHeatCapacityAutoDemo: demoRuntime.runHeatCapacityAutoDemo,
        pauseHeatCapacityAutoDemo: demoRuntime.pauseHeatCapacityAutoDemo,
        terminateHeatCapacityAutoDemo: demoRuntime.terminateHeatCapacityAutoDemo,
      },
      mode: {
        applyHeatCapacityModeTransitionEvent: mode.applyHeatCapacityModeTransitionEvent,
        activateHeatCapacityModeFromExplore: mode.activateHeatCapacityModeFromExplore,
        exitHeatCapacityFormalModeToExplore: mode.exitHeatCapacityFormalModeToExplore,
        switchHeatCapacityMode: mode.switchHeatCapacityMode,
        handleHeatCapacitySceneDiscreteMotionChange: mode.handleHeatCapacitySceneDiscreteMotionChange,
        handleHeatCapacitySceneModeTransitionControllerChange: mode.handleHeatCapacitySceneModeTransitionControllerChange,
        handleHeatCapacityModeSegmentClick: mode.handleHeatCapacityModeSegmentClick,
      },
      scene: {
        handleHeatCapacityCameraPoseChange: sceneRestore.handleHeatCapacityCameraPoseChange,
        handleHeatCapacitySceneCheckpointProviderChange: sceneRestore.handleHeatCapacitySceneCheckpointProviderChange,
        handleHeatCapacitySceneRestoreRevealComplete: sceneRestore.handleHeatCapacitySceneRestoreRevealComplete,
        handleHeatCapacitySceneCheckpoint: sceneRestore.handleHeatCapacitySceneCheckpoint,
        handleHeatCapacitySceneRuntimeFailure: recovery.handleHeatCapacitySceneRuntimeFailure,
        handleHeatCapacitySceneReady: recovery.handleHeatCapacitySceneReady,
      },
    },
    lifecycle: {
      closeHeatCapacityParameterWindows: parameterState.closeHeatCapacityParameterWindows,
      heatCapacityModeTransitionStateRef: scene.heatCapacityModeTransitionStateRef,
      disableHeatCapacityInitialSceneRestore: () => scene.setHeatCapacityInitialSceneRestoreEnabled(false),
      heatCapacityRuntimeFailureFileIdRef: scene.heatCapacityRuntimeFailureFileIdRef,
      heatCapacityRefreshRestorePendingRef: scene.heatCapacityRefreshRestorePendingRef,
      heatCapacitySceneCheckpointProviderRef: scene.heatCapacitySceneCheckpointProviderRef,
      heatCapacitySceneReadyFileIdRef: scene.heatCapacitySceneReadyFileIdRef,
      recoverHeatCapacityRuntimeIfReadyRef: scene.recoverHeatCapacityRuntimeIfReadyRef,
      heatCapacityModeTransitionDemoClockRef: demoState.heatCapacityModeTransitionDemoClockRef,
      autoDemoPhaseRef: demoState.autoDemoPhaseRef,
      desktopExitPausedPressureAlarmRef: feedback.desktopExitPausedPressureAlarmRef,
      desktopExitPausedClosePumpValveReminderRef: feedback.desktopExitPausedClosePumpValveReminderRef,
      heatCapacityPressureAlarmVisibleRef: feedback.heatCapacityPressureAlarmVisibleRef,
      scheduleHeatCapacityClosePumpValveReminder: feedback.scheduleHeatCapacityClosePumpValveReminder,
      scheduleHeatCapacityPressureAlarmExpiry: feedback.scheduleHeatCapacityPressureAlarmExpiry,
      pauseHeatCapacityPressureAlertTimers: feedback.pauseHeatCapacityPressureAlertTimers,
      pauseHeatCapacityPumpAnimation: pump.pauseHeatCapacityPumpAnimation,
      resumeHeatCapacityPumpAnimation: pump.resumeHeatCapacityPumpAnimation,
      pauseGuideHeatCapacityReminderTimers: guide.pauseGuideHeatCapacityReminderTimers,
      disposeHeatCapacityRuntimeResources: runtimeLifecycle.disposeHeatCapacityRuntimeResources,
      resetHeatCapacitySceneUiState: runtimeLifecycle.resetHeatCapacitySceneUiState,
      pauseHeatCapacityTransientUiTimers: runtimeLifecycle.pauseHeatCapacityTransientUiTimers,
      resumeHeatCapacityTransientUiTimers: runtimeLifecycle.resumeHeatCapacityTransientUiTimers,
      releaseHeatCapacityRuntimeForFileExit: runtimeLifecycle.releaseHeatCapacityRuntimeForFileExit,
      clearHeatCapacityAutoDemoTimers: demoRuntime.clearHeatCapacityAutoDemoTimers,
      scheduleHeatCapacityAutoDemoTimeline: demoRuntime.scheduleHeatCapacityAutoDemoTimeline,
      resolveDeferredHeatCapacityGuideUiCheckpoint: checkpoint.resolveDeferredHeatCapacityGuideUiCheckpoint,
      buildHeatCapacityModeUiCheckpoint: checkpoint.buildHeatCapacityModeUiCheckpoint,
      buildCurrentHeatCapacityRefreshSession: refreshCapture.buildCurrentHeatCapacityRefreshSession,
      captureHeatCapacityModeSceneMetadata: mode.captureHeatCapacityModeSceneMetadata,
      pauseHeatCapacityModeTransitionRuntime: mode.pauseHeatCapacityModeTransitionRuntime,
      resumeHeatCapacityModeTransitionRuntime: mode.resumeHeatCapacityModeTransitionRuntime,
      suspendActiveHeatCapacityModeForNavigation: mode.suspendActiveHeatCapacityModeForNavigation,
      activateHeatCapacityFileModeSession: mode.activateHeatCapacityFileModeSession,
      activeFileOwnsPendingHeatCapacityRefresh: sceneRestore.activeFileOwnsPendingHeatCapacityRefresh,
      rebaseHeatCapacityFileForAutomaticSuspension: sceneRestore.rebaseHeatCapacityFileForAutomaticSuspension,
    },
  };
};
