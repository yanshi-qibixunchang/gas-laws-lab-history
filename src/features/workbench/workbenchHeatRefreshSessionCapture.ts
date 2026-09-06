import { HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS } from './workbenchTeachingUiTiming.ts';
import type { WorkbenchRefreshPresentation } from './workbenchRefreshPresentationCapture.ts';

import React from 'react';





import { createHeatCapacityModeTransitionCheckpoint } from '../heatCapacity/heatCapacityModeTransitionModel.ts';
import { HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS, type HeatCapacityToastMessage } from '../heatCapacity/heatCapacityToastController.ts';
import { createWorkbenchHeatCapacityRefreshSession, resolveWorkbenchHeatCapacityPressureAlertRefreshProjection, type WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { asWorkbenchHeatCapacityRefreshJsonObject, type HeatCapacityLessonCloseTimerPlan, type HeatCapacityRecordSuccessTimerPlan } from './workbenchHeatCapacityUiCheckpoint.ts';
import { getHeatCapacityModeDeferredTimerRemainingMs, type HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';

export interface createWorkbenchHeatRefreshSessionCapturePorts {
  workspace: {
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    activeFileIdRef: React.MutableRefObject<string>;
  };
  scene: {
    heatCapacityRefreshActiveFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityRefreshModeRef: React.MutableRefObject<import("./../../domain/heatCapacity/heatCapacityModeTypes.ts").HeatCapacityMode | null>;
    heatCapacityRefreshCheckpointIdRef: React.MutableRefObject<string>;
    heatCapacityCameraPoseRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityInstrumentScene.ts").HeatCapacityCameraPose | null>;
    heatCapacityCameraTransitionRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityInstrumentScene.ts").HeatCapacityCameraTransitionState | null>;
    heatCapacityUltraVisualStateRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityUltraInstrumentModel.ts").HeatCapacityUltraVisualState | null>;
    heatCapacityHardSphereVisualCheckpointRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityHardSphereLayer.ts").HeatCapacityHardSphereVisualCheckpoint | null>;
    heatCapacityModeTransitionStateRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState>;
    heatCapacityModeTransitionPausedVisualClockRef: React.MutableRefObject<{ requestId: number; remainingMs: number; } | null>;
  };
  checkpoint: {
    resolveDeferredHeatCapacityGuideUiCheckpoint: (file: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint | null;
    captureHeatCapacityDemoUiCheckpoint: (currentFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => { demo: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeDemoCheckpoint; modeTransitionDemoClock: import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null; };
    captureHeatCapacityGuideUiCheckpoint: (currentFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState, override?: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint | null) => import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint;
    captureHeatCapacityPumpAnimationCheckpoint: (currentFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => { fileId: string | null; releaseRemainingMs: number | null; idleRemainingMs: number | null; checkpoint: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModePumpAnimationCheckpoint | null; };
    captureHeatCapacitySceneCheckpoint: (currentFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState, capturedAtMs: number) => { cameraPose: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeCameraPoseCheckpoint | null; scene: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeSceneCheckpoint; };
    getHeatCapacityRefreshRemainingMs: (deadlineAtMs: number | null) => number | null;
  };
  demoState: {
    heatCapacityModeTransitionDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
  };
  feedback: {
    heatCapacityToastPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityToastDeadlineAtMsRef: React.MutableRefObject<number | null>;
    desktopExitPausedPressureAlarmRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityPressureAlarmFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityPressureAlarmDeadlineAtMsRef: React.MutableRefObject<number | null>;
    desktopExitPausedClosePumpValveReminderRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityClosePumpValveReminderFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityClosePumpValveReminderDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityPressureAlarmVisibleRef: React.MutableRefObject<boolean>;
    heatCapacityRecordSuccessPausedRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityRecordSuccessTimerPlan | null>;
    heatCapacityRecordSuccessReleaseDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityRecordSuccessFollowUpMessageRef: React.MutableRefObject<string | null>;
    heatCapacityRecordSuccessFollowUpDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityToastCurrentRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastMessage | null>;
    heatCapacityToastPendingRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastMessage | null>;
  };

  lessonState: {
    heatCapacityGuideLessonClosePausedRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityLessonCloseTimerPlan | null>;
    heatCapacityGuideLessonCloseDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityGuideLessonDialog: import("./workbenchHeatCapacityGuidePresentation.ts").HeatCapacityGuideLessonDialogState | null;
    heatCapacityGuideLessonCloseShouldResumeDemoRef: React.MutableRefObject<boolean>;
    heatCapacityLessonAutoResumeDemoRef: React.MutableRefObject<boolean>;
  };
  free: {
    heatCapacityReviewSelectionByFileId: Record<string, { selectedTrialId: string | null; userSelected: boolean; }>;
  };
  lifecycle: {
    captureWorkbenchRefreshPresentation: () => WorkbenchRefreshPresentation;
  };
  parameterState: {
    heatCapacityAdvancedOpen: boolean;
    pinnedHeatCapacityParamHelpId: string | null;
    heatCapacityBasicInputDrafts: Record<string, string>;
    heatCapacityBasicInputErrors: Record<string, string>;
    heatCapacityAdvancedDraft: import("./../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts").HeatCapacityFreeParameterDraft | null;
    heatCapacityAdvancedInputDrafts: Record<string, string>;
    heatCapacityAdvancedInputErrors: Record<string, string>;
  };
}

export const createWorkbenchHeatRefreshSessionCapture = (ports: createWorkbenchHeatRefreshSessionCapturePorts) => {
  const { filesRef, activeFileIdRef } = ports.workspace;
  const { heatCapacityRefreshActiveFileIdRef, heatCapacityRefreshModeRef, heatCapacityRefreshCheckpointIdRef, heatCapacityCameraPoseRef, heatCapacityCameraTransitionRef, heatCapacityUltraVisualStateRef, heatCapacityHardSphereVisualCheckpointRef, heatCapacityModeTransitionStateRef, heatCapacityModeTransitionPausedVisualClockRef } = ports.scene;
  const { resolveDeferredHeatCapacityGuideUiCheckpoint, captureHeatCapacityDemoUiCheckpoint, captureHeatCapacityGuideUiCheckpoint, captureHeatCapacityPumpAnimationCheckpoint, captureHeatCapacitySceneCheckpoint, getHeatCapacityRefreshRemainingMs } = ports.checkpoint;
  const { heatCapacityModeTransitionDemoClockRef } = ports.demoState;
  const { heatCapacityToastPausedRef, heatCapacityToastDeadlineAtMsRef, desktopExitPausedPressureAlarmRef, heatCapacityPressureAlarmFileIdRef, heatCapacityPressureAlarmDeadlineAtMsRef, desktopExitPausedClosePumpValveReminderRef, heatCapacityClosePumpValveReminderFileIdRef, heatCapacityClosePumpValveReminderDeadlineAtMsRef, heatCapacityPressureAlarmVisibleRef, heatCapacityRecordSuccessPausedRef, heatCapacityRecordSuccessReleaseDeadlineAtMsRef, heatCapacityRecordSuccessFollowUpMessageRef, heatCapacityRecordSuccessFollowUpDeadlineAtMsRef, heatCapacityToastCurrentRef, heatCapacityToastPendingRef } = ports.feedback;
  const { heatCapacityGuideLessonClosePausedRef, heatCapacityGuideLessonCloseDeadlineAtMsRef, heatCapacityGuideLessonDialog, heatCapacityGuideLessonCloseShouldResumeDemoRef, heatCapacityLessonAutoResumeDemoRef } = ports.lessonState;
  const { heatCapacityReviewSelectionByFileId } = ports.free;
  const { captureWorkbenchRefreshPresentation } = ports.lifecycle;
  const { heatCapacityAdvancedOpen, pinnedHeatCapacityParamHelpId, heatCapacityBasicInputDrafts, heatCapacityBasicInputErrors, heatCapacityAdvancedDraft, heatCapacityAdvancedInputDrafts, heatCapacityAdvancedInputErrors } = ports.parameterState;
  const buildCurrentHeatCapacityRefreshSession = (
    activeModeCheckpointOverride: HeatCapacityModeUiCheckpoint | null = null,
    capturedAtMs = Date.now(),
  ): WorkbenchHeatCapacityRefreshSession | null => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (
      !currentFile ||
      currentFile.kind !== 'heatCapacity' ||
      currentFile.heatCapacityMode === null
    ) return null;
    const checkpointOverride = activeModeCheckpointOverride?.fileId === currentFile.id &&
      activeModeCheckpointOverride.mode === currentFile.heatCapacityMode
      ? activeModeCheckpointOverride
      : null;

    if (
      heatCapacityRefreshActiveFileIdRef.current !== currentFile.id ||
      heatCapacityRefreshModeRef.current !== currentFile.heatCapacityMode
    ) {
      heatCapacityRefreshActiveFileIdRef.current = currentFile.id;
      heatCapacityRefreshModeRef.current = currentFile.heatCapacityMode;
      heatCapacityRefreshCheckpointIdRef.current = `${currentFile.id}:${capturedAtMs}`;
      heatCapacityCameraPoseRef.current = null;
      heatCapacityCameraTransitionRef.current = null;
      heatCapacityUltraVisualStateRef.current = null;
      heatCapacityHardSphereVisualCheckpointRef.current = null;
    }

    const session = createWorkbenchHeatCapacityRefreshSession(
      currentFile.id,
      currentFile.heatCapacityMode,
      capturedAtMs,
    );
    session.checkpointId = heatCapacityRefreshCheckpointIdRef.current;
    const modeTransitionCheckpoint = createHeatCapacityModeTransitionCheckpoint(
      heatCapacityModeTransitionStateRef.current,
      capturedAtMs,
    );
    const pausedVisualClock = heatCapacityModeTransitionPausedVisualClockRef.current;
    if (
      pausedVisualClock?.requestId === modeTransitionCheckpoint.requestId &&
      modeTransitionCheckpoint.phase === 'animating'
    ) {
      modeTransitionCheckpoint.visualRemainingMs = pausedVisualClock.remainingMs;
    }
    session.modeTransition = modeTransitionCheckpoint;
    session.modeTransitionGuideUi = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
    const demoCapture = checkpointOverride?.mode === 'demo'
      ? {
          demo: checkpointOverride.payload.demo,
          modeTransitionDemoClock: heatCapacityModeTransitionDemoClockRef.current?.fileId === currentFile.id
            ? heatCapacityModeTransitionDemoClockRef.current
            : null,
        }
      : captureHeatCapacityDemoUiCheckpoint(currentFile);
    const guideCapture = checkpointOverride?.mode === 'guide'
      ? checkpointOverride.payload.guide
      : captureHeatCapacityGuideUiCheckpoint(currentFile);
    const pumpCapture = checkpointOverride
      ? {
          fileId: checkpointOverride.pumpAnimation ? currentFile.id : null,
          releaseRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
            checkpointOverride.pumpAnimation?.release,
          ),
          idleRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
            checkpointOverride.pumpAnimation?.idle,
          ),
          checkpoint: checkpointOverride.pumpAnimation,
        }
      : captureHeatCapacityPumpAnimationCheckpoint(currentFile);
    const sceneCapture = checkpointOverride
      ? {
          cameraPose: checkpointOverride.scene.cameraPose,
          scene: checkpointOverride.scene,
        }
      : captureHeatCapacitySceneCheckpoint(currentFile, capturedAtMs);
    session.demo = demoCapture.demo;
    session.modeTransitionDemoClock = demoCapture.modeTransitionDemoClock;

    const toastRemainingMs = heatCapacityToastPausedRef.current?.fileId === currentFile.id
      ? heatCapacityToastPausedRef.current.remainingMs
      : getHeatCapacityRefreshRemainingMs(heatCapacityToastDeadlineAtMsRef.current);
    const pausedPressureAlarm = desktopExitPausedPressureAlarmRef.current?.fileId === currentFile.id
      ? desktopExitPausedPressureAlarmRef.current
      : null;
    const pressureAlarmRemainingMs = pausedPressureAlarm?.remainingMs ?? (
      heatCapacityPressureAlarmFileIdRef.current === currentFile.id
        ? getHeatCapacityRefreshRemainingMs(heatCapacityPressureAlarmDeadlineAtMsRef.current)
        : null
    );
    const pausedClosePumpValveReminder =
      desktopExitPausedClosePumpValveReminderRef.current?.fileId === currentFile.id
        ? desktopExitPausedClosePumpValveReminderRef.current
        : null;
    const closePumpValveReminderRemainingMs = pausedClosePumpValveReminder?.remainingMs ?? (
      heatCapacityClosePumpValveReminderFileIdRef.current === currentFile.id
        ? getHeatCapacityRefreshRemainingMs(heatCapacityClosePumpValveReminderDeadlineAtMsRef.current)
        : null
    );
    const pressureAlertRefreshProjection = resolveWorkbenchHeatCapacityPressureAlertRefreshProjection({
      activeFileId: currentFile.id,
      pressureAlarmVisible: heatCapacityPressureAlarmFileIdRef.current === currentFile.id &&
        heatCapacityPressureAlarmVisibleRef.current,
      pressureAlarmRemainingMs,
      closePumpValveReminderRemainingMs,
      closePumpValveReminderAfterAlarmMs: HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS,
    });
    const pausedRecordSuccess = heatCapacityRecordSuccessPausedRef.current?.fileId === currentFile.id
      ? heatCapacityRecordSuccessPausedRef.current
      : null;
    const recordSuccessReleaseRemainingMs = pausedRecordSuccess?.releaseRemainingMs ??
      getHeatCapacityRefreshRemainingMs(heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current);
    const recordSuccessSequence: HeatCapacityRecordSuccessTimerPlan | null =
      currentFile.heatCapacityMode === 'guide' && recordSuccessReleaseRemainingMs !== null
        ? {
            fileId: currentFile.id,
            followUpMessage: pausedRecordSuccess?.followUpMessage ??
              heatCapacityRecordSuccessFollowUpMessageRef.current,
            followUpRemainingMs: pausedRecordSuccess?.followUpRemainingMs ??
              getHeatCapacityRefreshRemainingMs(
                heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current,
              ),
            releaseRemainingMs: recordSuccessReleaseRemainingMs,
          }
        : null;
    const pausedLessonClose = heatCapacityGuideLessonClosePausedRef.current?.fileId === currentFile.id
      ? heatCapacityGuideLessonClosePausedRef.current
      : null;
    const lessonCloseRemainingMs = pausedLessonClose?.remainingMs ??
      getHeatCapacityRefreshRemainingMs(heatCapacityGuideLessonCloseDeadlineAtMsRef.current);
    const lessonCloseSequence: HeatCapacityLessonCloseTimerPlan | null =
      lessonCloseRemainingMs !== null && heatCapacityGuideLessonDialog !== null
        ? {
            fileId: currentFile.id,
            remainingMs: lessonCloseRemainingMs,
            shouldResumeAutoDemo: pausedLessonClose?.shouldResumeAutoDemo ??
              heatCapacityGuideLessonCloseShouldResumeDemoRef.current,
          }
        : null;
    const createToastCheckpoint = (
      message: HeatCapacityToastMessage | null,
      remainingMs: number | null,
    ) => message && remainingMs !== 0 ? {
      id: message.id,
      text: message.text,
      level: message.level,
      priority: message.priority,
      source: message.source,
      createdAtMs: message.createdAt,
      remainingMs: remainingMs ?? HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
    } : null;
    session.guide = {
      focusControlId: guideCapture.normalReminder?.controlId ?? null,
      focusPulseActive: guideCapture.normalReminder !== null,
      missCount: guideCapture.missCount,
      pauseReasons: guideCapture.lessonDialog ? ['lesson-dialog'] : [],
      normalReminder: {
        active: guideCapture.normalReminder !== null,
        controlId: guideCapture.normalReminder?.controlId ?? null,
        message: heatCapacityToastCurrentRef.current?.text ?? null,
        remainingMs: getHeatCapacityModeDeferredTimerRemainingMs(guideCapture.normalReminder?.timer),
      },
      strongReminder: {
        active: guideCapture.strongReminder.active && guideCapture.strongReminder.controlId !== null,
        controlId: guideCapture.strongReminder.controlId,
        message: null,
        remainingMs: null,
      },
      lessonDialog: guideCapture.lessonDialog,
      shownLessonIds: guideCapture.shownLessonIds,
      toastQueue: {
        current: createToastCheckpoint(heatCapacityToastCurrentRef.current, toastRemainingMs),
        pending: heatCapacityToastPendingRef.current
          ? [createToastCheckpoint(
              heatCapacityToastPendingRef.current,
              HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
            )].filter((message): message is NonNullable<typeof message> => message !== null)
          : [],
      },
      pressureAlarmVisible: pressureAlertRefreshProjection.pressureAlarmVisible,
      pressureAlarmRemainingMs: pressureAlertRefreshProjection.pressureAlarmRemainingMs,
    };

    const workbenchPresentation = captureWorkbenchRefreshPresentation();
    session.ui = {
      windows: asWorkbenchHeatCapacityRefreshJsonObject({
        openTopMenu: workbenchPresentation.windows.openTopMenu,
        topMenuLeft: workbenchPresentation.windows.topMenuLeft,
        settingsGeneralOpen: workbenchPresentation.windows.settingsGeneralOpen,
        aboutWindowOpen: workbenchPresentation.windows.aboutWindowOpen,
        buildNoticeWindowOpen: workbenchPresentation.windows.buildNoticeWindowOpen,
        buildNoticeNavOpen: workbenchPresentation.windows.buildNoticeNavOpen,
        activeBuildNoticeMaterialId: workbenchPresentation.windows.activeBuildNoticeMaterialId,
        buildNoticeFilePreview: workbenchPresentation.windows.buildNoticeFilePreview,
        buildNoticeOpenError: workbenchPresentation.windows.buildNoticeOpenError,
        aboutResultNotice: workbenchPresentation.windows.aboutResultNotice,
        updateDialogOpen: workbenchPresentation.windows.updateDialogOpen,
        settingsLanguageMenuOpen: workbenchPresentation.windows.settingsLanguageMenuOpen,
        openFileMenuId: workbenchPresentation.windows.openFileMenuId,
        renamingFileId: workbenchPresentation.windows.renamingFileId,
        samplingPresetMenuOpen: workbenchPresentation.windows.samplingPresetMenuOpen,
        idealAdvancedSettingsOpen: workbenchPresentation.windows.idealAdvancedSettingsOpen,
        idealAdvancedSettingsBodyVisible: workbenchPresentation.windows.idealAdvancedSettingsBodyVisible,
        heatCapacityAdvancedOpen,
        pinnedHeatCapacityParamHelpId,
        lessonAutoResumeDemo: heatCapacityLessonAutoResumeDemoRef.current,
      }),
      drafts: asWorkbenchHeatCapacityRefreshJsonObject({
        renameDraft: workbenchPresentation.drafts.renameDraft,
        parameterInputDrafts: workbenchPresentation.drafts.parameterInputDrafts,
        parameterErrors: workbenchPresentation.drafts.parameterErrors,
        heatCapacityBasicInputDrafts,
        heatCapacityBasicInputErrors,
        heatCapacityAdvancedDraft,
        heatCapacityAdvancedInputDrafts,
        heatCapacityAdvancedInputErrors,
        scanInputDraft: workbenchPresentation.drafts.scanInputDraft,
        scanInputError: workbenchPresentation.drafts.scanInputError,
        scanInputToast: workbenchPresentation.drafts.scanInputToast,
      }),
      layout: asWorkbenchHeatCapacityRefreshJsonObject({
        runState: currentFile.runState,
        selectedFileId: workbenchPresentation.layout.selectedFileId,
        selectedPanel: workbenchPresentation.layout.selectedPanel,
        logs: workbenchPresentation.layout.logs,
        consoleTab: workbenchPresentation.layout.consoleTab,
        consoleCollapsed: workbenchPresentation.layout.consoleCollapsed,
        consoleHeightPx: workbenchPresentation.layout.consoleHeightPx,
        consoleScrollTop: workbenchPresentation.layout.consoleScrollTop,
        currentParametersScrollTop: workbenchPresentation.layout.currentParametersScrollTop,
        leftCollapsed: workbenchPresentation.layout.leftCollapsed,
        parametersCollapsed: workbenchPresentation.layout.parametersCollapsed,
        leftSidebarWidth: workbenchPresentation.layout.leftSidebarWidth,
        parameterSidebarWidth: workbenchPresentation.layout.parameterSidebarWidth,
        filesSectionCollapsed: workbenchPresentation.layout.filesSectionCollapsed,
        panelsSectionCollapsed: workbenchPresentation.layout.panelsSectionCollapsed,
        resultsChildrenCollapsed: workbenchPresentation.layout.resultsChildrenCollapsed,
        guideChecklistViewedIndex: guideCapture.checklistViewedIndex,
        reviewSelectionByFileId: heatCapacityReviewSelectionByFileId,
        renameSelectionStart: workbenchPresentation.layout.renameSelectionStart,
        renameSelectionEnd: workbenchPresentation.layout.renameSelectionEnd,
        closePumpValveReminderFileId: pressureAlertRefreshProjection.closePumpValveReminderFileId,
        closePumpValveReminderRemainingMs:
          pressureAlertRefreshProjection.closePumpValveReminderRemainingMs,
        pendingStrongReminderControlId: guideCapture.pendingStrongReminder?.controlId ?? null,
        pendingStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
          guideCapture.pendingStrongReminder?.timer,
        ),
        baseStrongReminderFileId: guideCapture.baseStrongReminder ? currentFile.id : null,
        baseStrongReminderControlId: guideCapture.baseStrongReminder?.controlId ?? null,
        baseStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
          guideCapture.baseStrongReminder?.timer,
        ),
        pumpAnimationFileId: pumpCapture.fileId,
        pumpAnimationReleaseRemainingMs: pumpCapture.releaseRemainingMs,
        pumpAnimationIdleRemainingMs: pumpCapture.idleRemainingMs,
        cameraTransition: sceneCapture.scene.cameraTransition,
        ultraVisualState: sceneCapture.scene.ultraVisualState,
        hardSphereVisualCheckpoint: sceneCapture.scene.hardSphereVisualCheckpoint,
        heatCapacityFocusSession: sceneCapture.scene.focusSession,
        recordSuccessSequence,
        lessonCloseSequence,
      }),
    };

    session.focusMode = sceneCapture.scene.focusMode;
    session.cameraPose = sceneCapture.cameraPose;
    // Legacy pixel snapshots remain readable for one-time restore, but canonical saves are semantic-only.
    session.sceneSnapshot = null;
    return session;
  };
  return { buildCurrentHeatCapacityRefreshSession };
};
