import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import { HEAT_CAPACITY_RESET_FEEDBACK_MS, HEAT_CAPACITY_GUIDE_START_NOTICE_MS } from './workbenchTeachingUiTiming.ts';

import React, { useRef, useState } from 'react';
import { adjustHeatCapacityPressureZeroCoarse, adjustHeatCapacityPressureZeroFine } from './workbenchHeatCapacityCalibrationCoordinator.ts';
import { prepareNextHeatCapacityFreeExperimentWorkbenchState } from './workbenchHeatCapacityFreeGroupLifecycle.ts';

import { applyHeatCapacityGuideRecordWorkbenchState, setHeatCapacityGuideEquilibriumSpeedMultiplier, setHeatCapacityGuidePumpValveOpen, setHeatCapacityGuideStopcockOpen } from './workbenchHeatCapacityGuideControlState.ts';
import { completeHeatCapacityFreePreheatWorkbenchState, completeHeatCapacityGuidePreheatWorkbenchState, startHeatCapacityGuideWorkbenchState } from './workbenchHeatCapacityTeachingLifecycleState.ts';
import { powerHeatCapacityWorkbenchFile, registerHeatCapacityPumpStroke, setHeatCapacityScriptedStopcockOpen, stepHeatCapacityWorkbenchFile } from './workbenchHeatCapacityRuntimeCoordinator.ts';
import { applyHeatCapacityFreeRecordWorkbenchState } from './workbenchHeatCapacityFreeRecordState.ts';
import { setHeatCapacityFreeEquilibriumSpeedMultiplier, setHeatCapacityFreePumpValveOpen, setHeatCapacityFreeStopcockOpen } from './workbenchHeatCapacityFreeRuntimeCoordinator.ts';
import { shouldPromptHeatCapacityFreePowerOffBeforeNextGroup } from './workbenchHeatCapacityFreeParameterState.ts';
import { getHeatCapacityFreeBatchProgress } from './workbenchHeatCapacityFreeExperimentGroupState.ts';
import { HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, getHeatCapacityPressureThresholdsMv, getHeatCapacityPumpFrequencyState, getHeatCapacityStopcockState, getHeatCapacityStopcockTargetAngle } from './workbenchHeatCapacityInstrumentState.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import { getGuideHeatCapacityDisplayedPressureMv, getGuideHeatCapacityThresholdPressureMv, getHeatCapacityPressureSafetyStatusFromMv } from './workbenchHeatCapacityGuideDecisions.ts';
import { isHeatCapacityPressureToast } from '../heatCapacity/heatCapacityToastController.ts';


import { type HeatCapacityControlInteractionId } from '../heatCapacity/heatCapacityControlInteraction.ts';
import type { HeatCapacityFreeRecordRejectReason } from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type { HeatCapacityGuideRecordKind } from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import { createHeatCapacityAutoDemoProfile } from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';

import { getHeatCapacityFreeRecordRejectMessage, getHeatCapacityRealtimeCopy, getLocalizedHeatCapacityGuideRecordFailure } from './workbenchHeatCapacityRealtimeCopy.ts';

import { clearHeatCapacityModeSession } from './workbenchHeatCapacityModeSession.ts';


export interface useWorkbenchHeatInstrumentPorts {
  scene: {
    heatCapacityModeTransitionStateRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState>;
    setHeatCapacityFocusResetKey: React.Dispatch<React.SetStateAction<number>>;
    heatCapacityFocusSessionRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusSession | null>;
    heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
    heatCapacitySceneFocusModeRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusMode>;
  };
  workspace: {
    updateActiveFile: (updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
    activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
    updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    activeFileIdRef: React.MutableRefObject<string>;
  };
  guideState: {
    activeHeatCapacityPreheatMode: "demo" | "guide" | "free" | null;
    guideHeatCapacityActiveFileIdRef: React.MutableRefObject<string | null>;
  };
  ui: {
    isHeatCapacityModalLocked: () => boolean;
    pushLog: (message: import("./workbenchConsoleLocalization.ts").WorkbenchConsoleMessageInput, kind?: import("./workbenchConsolePresentation.ts").LogKind) => void;
  };
  guide: {
    guardGuideHeatCapacityAction: (action: import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityAction, source?: "user" | "autoDemo", interactionId?: string | undefined) => boolean;
    showGuideHeatCapacityGuidance: (message: string, controlId?: string | null | undefined, level?: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastLevel, source?: "guide" | "guide-blocked") => void;
    clearGuideHeatCapacityGuidance: () => void;
    getGuideStepGuidance: (step: import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep, file?: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState | undefined) => { message: string; controlId: string | null; };
  };
  feedback: {
    getHeatCapacityRecordSuccessToast: (kind: import("./../../domain/heatCapacity/heatCapacityGuideTrialModel.ts").HeatCapacityGuideRecordKind) => "U₀ 记录成功。" | "U₁ 和 Uₜ 记录成功。" | "U₂ 和 Uₜ 记录成功。" | "U₀ 記錄成功。" | "U₁ 和 Uₜ 記錄成功。" | "U₂ 和 Uₜ 記錄成功。" | "U₀ recorded successfully." | "U₁ and Uₜ recorded successfully." | "U₂ and Uₜ recorded successfully.";
    showHeatCapacityRecordSuccessSequence: ({ recordMessage, trialCompleteMessage, }: { recordMessage: string; trialCompleteMessage: string | null; }) => void;
    heatCapacityRealtimeCopy: import("./workbenchHeatCapacityRealtimeCopy.ts").HeatCapacityRealtimeCopy;
    showHeatCapacityGuidePowerOffCompletionToast: () => void;
    showHeatCapacityFreeGroupCompletionToast: (message?: string) => void;
    heatCapacityClosePumpValveReminderFileIdRef: React.MutableRefObject<string | null>;
    clearHeatCapacityClosePumpValveReminder: () => void;
    clearHeatCapacityToastBySource: (predicate: (message: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastMessage | null) => boolean) => void;
    showHeatCapacityPolicyToast: (text: string, policy: import("./../heatCapacity/heatCapacityToastPolicy.ts").HeatCapacityToastPolicy, levelOverride?: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastLevel | undefined) => void;
    showHeatCapacityToast: (text: string, level?: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastLevel, options?: { interrupt?: boolean | undefined; priority?: number | undefined; source?: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastSource | undefined; }) => void;
    showHeatCapacityPressureAlarm: (fileId: string, fileName: string) => void;
    showHeatCapacityPressureThresholdToast: (pressureMv: number, file: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => void;
  };
  parameterActions: {
    collapseHeatCapacityFreeParameterSidebarForExperimentAction: () => void;
  };
  focus: {
    markHeatCapacityFocusSessionNonReversible: () => void;
    exitHeatCapacityFocusMode: () => void;
  };
  runtimeLifecycle: {
    resetHeatCapacityGroupUiRuntime: () => void;
    resetHeatCapacitySceneUiState: () => void;
  };
  preferences: {
    settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  };
  sceneRestore: {
    commitHeatCapacityFileProjection: (nextFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => void;
    applyHeatCapacityModeUiProjection: (file: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState, checkpoint: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeUiCheckpoint | null, modeTransitionRequestId?: number | null) => void;
  };
  demoUi: {
    showHeatCapacityAutoDemoCompletionToast: (message?: string, durationMs?: number) => void;
    showHeatCapacityAutoDemoLockedToast: (message?: string) => void;
  };
  mode: {
    exitHeatCapacityTeachingModeToExplore: (sourceMode: "demo" | "guide") => void;
  };
  demoState: {
    autoDemoInteractionLocked: boolean;
  };
  pump: {
    setHeatCapacityPumpPulseId: React.Dispatch<React.SetStateAction<number>>;
    clearHeatCapacityPumpAnimationTimers: () => void;
    scheduleHeatCapacityPumpAnimation: (fileId: string, releaseDelayMs: number | null, idleDelayMs: number | null) => void;
  };
}

export const useWorkbenchHeatInstrument = (ports: useWorkbenchHeatInstrumentPorts) => {
  const { heatCapacityModeTransitionStateRef, setHeatCapacityFocusResetKey, heatCapacityFocusSessionRef, heatCapacityRuntimeFailureFileIdRef, heatCapacitySceneFocusModeRef } = ports.scene;
  const { updateActiveFile, activeFile, updateFileById, filesRef, activeFileIdRef } = ports.workspace;
  const { activeHeatCapacityPreheatMode, guideHeatCapacityActiveFileIdRef } = ports.guideState;
  const { isHeatCapacityModalLocked, pushLog } = ports.ui;
  const { guardGuideHeatCapacityAction, showGuideHeatCapacityGuidance, clearGuideHeatCapacityGuidance, getGuideStepGuidance } = ports.guide;
  const { getHeatCapacityRecordSuccessToast, showHeatCapacityRecordSuccessSequence, heatCapacityRealtimeCopy, showHeatCapacityGuidePowerOffCompletionToast, showHeatCapacityFreeGroupCompletionToast, heatCapacityClosePumpValveReminderFileIdRef, clearHeatCapacityClosePumpValveReminder, clearHeatCapacityToastBySource, showHeatCapacityPolicyToast, showHeatCapacityToast, showHeatCapacityPressureAlarm, showHeatCapacityPressureThresholdToast } = ports.feedback;
  const { collapseHeatCapacityFreeParameterSidebarForExperimentAction } = ports.parameterActions;
  const { markHeatCapacityFocusSessionNonReversible, exitHeatCapacityFocusMode } = ports.focus;
  const { resetHeatCapacityGroupUiRuntime, resetHeatCapacitySceneUiState } = ports.runtimeLifecycle;
  const { settingsLanguagePreference } = ports.preferences;
  const { commitHeatCapacityFileProjection, applyHeatCapacityModeUiProjection } = ports.sceneRestore;
  const { showHeatCapacityAutoDemoCompletionToast, showHeatCapacityAutoDemoLockedToast } = ports.demoUi;
  const { exitHeatCapacityTeachingModeToExplore } = ports.mode;
  const { autoDemoInteractionLocked } = ports.demoState;
  const { setHeatCapacityPumpPulseId, clearHeatCapacityPumpAnimationTimers, scheduleHeatCapacityPumpAnimation } = ports.pump;
  const heatCapacityRecordControlsClosingTimerRef = useRef<number | null>(null);

  const heatCapacityResetFeedbackTimerRef = useRef<number | null>(null);

  const [heatCapacityRecordPulseId, setHeatCapacityRecordPulseId] = useState(0);

  const [heatCapacityRecordControlsClosing, setHeatCapacityRecordControlsClosing] = useState<HeatCapacityGuideRecordKind | null>(null);

  const [heatCapacityResetFeedbackActionId, setHeatCapacityResetFeedbackActionId] = useState<
    'reset-guide' | null
  >(null);

  const resetFeedbackCleanupEffect = { run: () => () => {
    if (heatCapacityResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityResetFeedbackTimerRef.current);
    }
  }, dependencies: [] } satisfies WorkbenchHeatEffect;

  const updateHeatCapacityFreeEquilibriumSpeedMultiplier = (multiplier: number) => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    const now = Date.now();
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? file.heatCapacityMode === 'guide'
        ? setHeatCapacityGuideEquilibriumSpeedMultiplier(file, multiplier, now)
        : file.heatCapacityMode === 'free'
          ? setHeatCapacityFreeEquilibriumSpeedMultiplier(file, multiplier, now)
          : file
      : file);
  };

  const toggleHeatCapacityHardSphereView = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (activeFile.kind !== 'heatCapacity') return;
    setHeatCapacityHardSphereViewEnabled(!activeFile.hardSphereViewEnabled);
  };

  const setHeatCapacityHardSphereViewEnabled = (checked: boolean) => {
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? {
          ...file,
          hardSphereViewEnabled: checked,
          updatedAt: Date.now(),
        }
        : file);
  };

  const completeActiveHeatCapacityPreheat = () => {
    if (activeFile.kind !== 'heatCapacity' || activeHeatCapacityPreheatMode === 'demo') return;
    const fileId = activeFile.id;
    const mode = activeHeatCapacityPreheatMode;
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return mode === 'guide'
        ? completeHeatCapacityGuidePreheatWorkbenchState(file, Date.now())
        : completeHeatCapacityFreePreheatWorkbenchState(file, Date.now());
    });
  };

  const showHeatCapacityRecordButtonExit = (kind: HeatCapacityGuideRecordKind) => {
    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
    }
    setHeatCapacityRecordControlsClosing(kind);
    heatCapacityRecordControlsClosingTimerRef.current = window.setTimeout(() => {
      heatCapacityRecordControlsClosingTimerRef.current = null;
      setHeatCapacityRecordControlsClosing(null);
    }, 220);
  };

  const recordHeatCapacityGuideSample = (kind: HeatCapacityGuideRecordKind) => {
    if (isHeatCapacityModalLocked() || heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (!activeFile || activeFile.kind !== 'heatCapacity') return;
    const action = kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2';
    if (!guardGuideHeatCapacityAction(action)) return;
    setHeatCapacityRecordPulseId((pulseId) => pulseId + 1);
    const now = Date.now();
    const currentFile = filesRef.current.find((file) => file.id === activeFile.id);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    if (currentFile.heatCapacityMode === 'guide') {
      const attempt = applyHeatCapacityGuideRecordWorkbenchState(currentFile, kind, now);
      const message = attempt.accepted
        ? getHeatCapacityRecordSuccessToast(kind)
        : attempt.reason;
      updateFileById(currentFile.id, (file) => (
        file.kind === 'heatCapacity' && file.id === currentFile.id
          ? {
              ...attempt.file,
              pumpHint: attempt.accepted ? attempt.file.pumpHint : message,
              updatedAt: now,
            }
          : file
      ));
      if (attempt.accepted) {
        showHeatCapacityRecordButtonExit(kind);
        setHeatCapacityFocusResetKey((key) => key + 1);
        heatCapacityFocusSessionRef.current = null;
        showHeatCapacityRecordSuccessSequence({
          recordMessage: message,
          trialCompleteMessage: null,
        });
        pushLog(
          (language) => {
            const copy = getHeatCapacityRealtimeCopy(language);
            return kind === 'u0'
              ? copy.recordU0SuccessToast
              : kind === 'u1'
                ? copy.recordU1SuccessToast
                : copy.recordU2SuccessToast;
          },
          'success',
        );
        return;
      }
      showGuideHeatCapacityGuidance(
        message,
        kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2',
        'warning',
        'guide-blocked',
      );
      pushLog(
        (language) => getLocalizedHeatCapacityGuideRecordFailure(currentFile, kind, language, message),
        'warning',
      );
      return;
    }
  };

  const recordFreeHeatCapacitySample = (kind: HeatCapacityGuideRecordKind) => {
    if (isHeatCapacityModalLocked() || heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    setHeatCapacityRecordPulseId((pulseId) => pulseId + 1);
    const now = Date.now();
    const currentFile = filesRef.current.find((file) => file.id === activeFile.id);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    const attempt = applyHeatCapacityFreeRecordWorkbenchState(
      currentFile,
      kind,
      now,
    );
    const message = attempt.accepted
      ? heatCapacityRealtimeCopy.freeRecordSuccessLog[kind]
      : getHeatCapacityFreeRecordRejectMessage(attempt.reason as HeatCapacityFreeRecordRejectReason, heatCapacityRealtimeCopy);
    collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateFileById(currentFile.id, (file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? {
            ...attempt.file,
            pumpHint: attempt.accepted ? attempt.file.pumpHint : message,
            updatedAt: now,
          }
        : file
    ));
    if (attempt.accepted) {
      markHeatCapacityFocusSessionNonReversible();
      clearGuideHeatCapacityGuidance();
      showGuideHeatCapacityGuidance(message, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'success');
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).freeRecordSuccessLog[kind],
        'success',
      );
      return;
    }
    clearGuideHeatCapacityGuidance();
    showGuideHeatCapacityGuidance(message, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'warning', 'guide-blocked');
    pushLog(
      (language) => getHeatCapacityFreeRecordRejectMessage(
        attempt.reason as HeatCapacityFreeRecordRejectReason,
        getHeatCapacityRealtimeCopy(language),
      ),
      'warning',
    );
  };

  const updateHeatCapacityPower = (nextPowerOn?: boolean, source: 'user' | 'autoDemo' = 'user') => {
    if (rejectHeatCapacityUserInteraction(source)) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const guardedPowerOn = nextPowerOn ?? (currentFile?.kind === 'heatCapacity' ? !currentFile.powerOn : true);
    if (!guardGuideHeatCapacityAction(guardedPowerOn ? 'turnPowerOn' : 'turnPowerOff', source)) return;
    const shouldShowGuidePowerOffCompletionToast = source === 'user' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'guide' &&
      currentFile.heatCapacityGuideWorkflow.step === 'closePowerRequired' &&
      currentFile.powerOn &&
      guardedPowerOn === false &&
      guideHeatCapacityActiveFileIdRef.current === currentFile.id;
    const shouldShowFreePowerOffCompletionToast = source === 'user' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'free' &&
      shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(currentFile) &&
      currentFile.powerOn &&
      guardedPowerOn === false;
    const freeProgressBeforePowerOff = shouldShowFreePowerOffCompletionToast &&
      currentFile?.kind === 'heatCapacity'
      ? getHeatCapacityFreeBatchProgress(currentFile)
      : null;
    const completedGroupAfterPowerOff = freeProgressBeforePowerOff
      ? freeProgressBeforePowerOff.completedGroupCount + 1
      : null;
    const advancedFreeGroup =
      completedGroupAfterPowerOff !== null &&
      freeProgressBeforePowerOff?.targetGroupCount !== null &&
      completedGroupAfterPowerOff < freeProgressBeforePowerOff.targetGroupCount
        ? { completed: completedGroupAfterPowerOff, next: completedGroupAfterPowerOff + 1 }
        : null;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const resolvedPowerOn = nextPowerOn ?? !file.powerOn;
      let nextFile: WorkbenchHeatCapacityState;
      if (resolvedPowerOn && file.heatCapacityMode === 'demo' && !file.heatCapacityExperimentProfile) {
        const experimentProfile = createHeatCapacityAutoDemoProfile();
        nextFile = powerHeatCapacityWorkbenchFile({
          ...file,
          heatCapacityExperimentSeed: experimentProfile.seed,
          heatCapacityExperimentProfile: experimentProfile,
        }, resolvedPowerOn, now);
      } else {
        nextFile = powerHeatCapacityWorkbenchFile(file, resolvedPowerOn, now);
      }
      if (
        source === 'user' &&
        file.heatCapacityMode === 'free' &&
        shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(file) &&
        file.powerOn &&
        !resolvedPowerOn
      ) {
        const progress = getHeatCapacityFreeBatchProgress(nextFile);
        if (!progress.allGroupsRecorded) {
          nextFile = prepareNextHeatCapacityFreeExperimentWorkbenchState(nextFile, now);
        }
      }
      return nextFile;
    });
    if (advancedFreeGroup) resetHeatCapacityGroupUiRuntime();
    if (shouldShowGuidePowerOffCompletionToast) {
      showHeatCapacityGuidePowerOffCompletionToast();
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).finalTrialCompleteToast,
        'success',
      );
    }
    if (shouldShowFreePowerOffCompletionToast) {
      const completionMessage = advancedFreeGroup
        ? settingsLanguagePreference === 'en'
          ? `Experiment ${advancedFreeGroup.completed} complete. Experiment ${advancedFreeGroup.next} is ready.`
          : settingsLanguagePreference === 'zh-TW'
            ? `第 ${advancedFreeGroup.completed} 次實驗已完成，已進入第 ${advancedFreeGroup.next} 次實驗。`
            : `第 ${advancedFreeGroup.completed} 次实验已完成，已进入第 ${advancedFreeGroup.next} 次实验。`
        : settingsLanguagePreference === 'en'
          ? 'All experiments in this group are complete. Opening data processing.'
          : settingsLanguagePreference === 'zh-TW'
            ? '本組全部實驗已完成，正在進入資料處理。'
            : '本组全部实验已完成，正在进入数据处理。';
      showHeatCapacityFreeGroupCompletionToast(completionMessage);
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).freeGroupCompleteToast,
        'success',
      );
    }
  };

  const showHeatCapacityResetFeedback = (actionId: 'reset-guide') => {
    if (heatCapacityResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityResetFeedbackTimerRef.current);
    }
    setHeatCapacityResetFeedbackActionId(actionId);
    heatCapacityResetFeedbackTimerRef.current = window.setTimeout(() => {
      heatCapacityResetFeedbackTimerRef.current = null;
      setHeatCapacityResetFeedbackActionId(null);
    }, HEAT_CAPACITY_RESET_FEEDBACK_MS);
  };

  const resetHeatCapacityGuideExperiment = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'guide') return;
    showHeatCapacityResetFeedback('reset-guide');
    const now = Date.now();
    const resetFile = startHeatCapacityGuideWorkbenchState(
      clearHeatCapacityModeSession(activeFile, 'guide'),
      now,
    );
    resetHeatCapacitySceneUiState();
    commitHeatCapacityFileProjection(resetFile);
    applyHeatCapacityModeUiProjection(resetFile, null);
    showHeatCapacityAutoDemoCompletionToast(
      heatCapacityRealtimeCopy.guideModeStartingToast,
      HEAT_CAPACITY_GUIDE_START_NOTICE_MS,
    );
  };

  const exitHeatCapacityGuideMode = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    const guideCompleted = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityTeachingStatus === 'completed';
    exitHeatCapacityTeachingModeToExplore('guide');
    showHeatCapacityAutoDemoCompletionToast(guideCompleted
      ? heatCapacityRealtimeCopy.teachingModeExitedToast
      : heatCapacityRealtimeCopy.guideModeExitedToast);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).guideModeExitedLog(activeFile.name),
      'warning',
    );
  };

  const exitCompletedHeatCapacityTeachingMode = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.heatCapacityMode === 'demo' || activeFile.heatCapacityMode === 'guide') {
      exitHeatCapacityTeachingModeToExplore(activeFile.heatCapacityMode);
    }
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.teachingModeExitedToast);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).freeModeActiveLog(activeFile.name),
      'info',
    );
  };

  const updateHeatCapacityStopcockOpen = (nextOpen?: boolean, source: 'user' | 'autoDemo' = 'user') => {
    if (rejectHeatCapacityUserInteraction(source)) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const guardedOpen = nextOpen ?? (
      currentFile?.kind === 'heatCapacity'
        ? getHeatCapacityStopcockState(currentFile.stopcockAngleDeg) !== 'open'
        : true
    );
    const stopcockAction = guardedOpen ? 'openStopcock' : 'closeStopcock';
    if (!guardGuideHeatCapacityAction(stopcockAction, source)) return;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const resolvedOpen = nextOpen ?? getHeatCapacityStopcockState(file.stopcockAngleDeg) !== 'open';
      if (file.heatCapacityMode === 'guide') {
        return setHeatCapacityGuideStopcockOpen(file, resolvedOpen, now);
      }
      if (file.heatCapacityMode === 'free') {
        return setHeatCapacityFreeStopcockOpen(file, resolvedOpen, now);
      }
      if (file.heatCapacityMode === 'demo' || file.heatCapacityMode === null) {
        return setHeatCapacityScriptedStopcockOpen(file, resolvedOpen, now);
      }
      return file;
    });
  };

  const adjustHeatCapacityPressureZeroFineFromScene = (
    direction: number,
    interactionId?: HeatCapacityControlInteractionId,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (rejectHeatCapacityUserInteraction(source)) return false;
    if (!guardGuideHeatCapacityAction('adjustPressureZero', source, interactionId)) return false;
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      return adjustHeatCapacityPressureZeroFine(file, direction, now);
    });
    return true;
  };

  const adjustHeatCapacityPressureZeroCoarseFromScene = (
    angleDeltaDeg: number,
    interactionId?: HeatCapacityControlInteractionId,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (rejectHeatCapacityUserInteraction(source)) return false;
    if (!guardGuideHeatCapacityAction('adjustPressureZero', source, interactionId)) return false;
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      return adjustHeatCapacityPressureZeroCoarse(file, angleDeltaDeg, now);
    });
    return true;
  };

  const updateHeatCapacityPumpValve = (source: 'user' | 'autoDemo' = 'user') => {
    if (rejectHeatCapacityUserInteraction(source)) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const nextAction = currentFile?.kind === 'heatCapacity' && currentFile.pumpValveOpen ? 'closePumpValve' : 'openPumpValve';
    if (!guardGuideHeatCapacityAction(nextAction, source)) return;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const pumpValveOpen = !file.pumpValveOpen;
      if (file.heatCapacityMode === 'guide') {
        return setHeatCapacityGuidePumpValveOpen(file, pumpValveOpen, now);
      }
      if (file.heatCapacityMode === 'free') {
        return setHeatCapacityFreePumpValveOpen(file, pumpValveOpen, now);
      }
      const nextFileBase: WorkbenchHeatCapacityState = {
        ...file,
        pumpValveOpen,
        pumpValveState: pumpValveOpen ? 'open' : 'closed',
        pumpHint: pumpValveOpen
          ? heatCapacityRealtimeCopy.pumpHints.pumpValveOpen
          : heatCapacityRealtimeCopy.pumpHints.pumpValveClosed,
        updatedAt: now,
      };
      return nextFileBase;
    });
    if (nextAction === 'closePumpValve') {
      if (heatCapacityClosePumpValveReminderFileIdRef.current === currentFile?.id) {
        clearHeatCapacityClosePumpValveReminder();
      }
      clearHeatCapacityToastBySource(isHeatCapacityPressureToast);
    }
  };

  const isHeatCapacityUserInteractionLocked = (source: 'user' | 'autoDemo' = 'user') => (
    source !== 'autoDemo' && (
      autoDemoInteractionLocked ||
      isHeatCapacityModalLocked() ||
      heatCapacityRuntimeFailureFileIdRef.current === activeFileIdRef.current ||
      heatCapacityModeTransitionStateRef.current.phase !== 'idle'
    )
  );

  const rejectHeatCapacityUserInteraction = (source: 'user' | 'autoDemo' = 'user') => {
    if (!isHeatCapacityUserInteractionLocked(source)) return false;
    if (heatCapacityModeTransitionStateRef.current.phase === 'idle') {
      showHeatCapacityAutoDemoLockedToast();
    }
    return true;
  };

  const pressHeatCapacityPumpBulb = (
    fileId = activeFileIdRef.current,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (rejectHeatCapacityUserInteraction(source)) return;
    if (source !== 'autoDemo' && heatCapacitySceneFocusModeRef.current !== 'pump') return;
    const fileBeforePump = filesRef.current.find((file) => file.id === fileId);
    if (source !== 'autoDemo' && fileId === activeFileIdRef.current && !guardGuideHeatCapacityAction('pumpBulb', source)) return;
    const now = Date.now();
    let nextHeatCapacityFile = fileBeforePump?.kind === 'heatCapacity'
      ? registerHeatCapacityPumpStroke(fileBeforePump, now)
      : null;
    const guidePumpTargetReached = Boolean(
      source !== 'autoDemo' &&
      nextHeatCapacityFile?.kind === 'heatCapacity' &&
      nextHeatCapacityFile.heatCapacityMode === 'guide' &&
      nextHeatCapacityFile.heatCapacityGuideWorkflow.step === 'closePumpValveRequired' &&
      getGuideHeatCapacityDisplayedPressureMv(nextHeatCapacityFile) >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
    );
    if (source === 'user' && nextHeatCapacityFile) {
      collapseHeatCapacityFreeParameterSidebarForExperimentAction();
      markHeatCapacityFocusSessionNonReversible();
    }
    const pressureStatusBeforePump = fileBeforePump?.kind === 'heatCapacity'
      ? getHeatCapacityPressureSafetyStatusFromMv(getGuideHeatCapacityThresholdPressureMv(fileBeforePump), fileBeforePump)
      : 'normal';
    if (
      source === 'autoDemo' &&
      nextHeatCapacityFile &&
      getGuideHeatCapacityThresholdPressureMv(nextHeatCapacityFile) >= (
        getHeatCapacityPressureThresholdsMv(nextHeatCapacityFile).pressureDangerThresholdMv
      )
    ) {
      return;
    }
    const electronicPressureFeedbackReady = fileBeforePump?.kind === 'heatCapacity' &&
      fileBeforePump.powerOn &&
      (fileBeforePump.heatCapacityMode !== 'free' || fileBeforePump.heatCapacityFreePreheatCompleted);
    if (source !== 'autoDemo' && fileBeforePump?.kind === 'heatCapacity' && electronicPressureFeedbackReady) {
      const pressureBeforePumpMv = getGuideHeatCapacityThresholdPressureMv(fileBeforePump);
      if (
        pressureBeforePumpMv >= getHeatCapacityPressureThresholdsMv(fileBeforePump).pressureDangerThresholdMv
      ) {
        showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.pressureAlarmMessage, 'pressureAlarm');
      }
      const nextFrequencyState = getHeatCapacityPumpFrequencyState(
        [...fileBeforePump.pumpStrokeTimestamps, now],
        now,
      );
      if (
        fileBeforePump.heatCapacityPhase === 'pumping' &&
        nextFrequencyState.timestamps.length >= 2 &&
        nextFrequencyState.pumpFrequencyStatus === 'tooSlow'
      ) {
        showHeatCapacityToast(heatCapacityRealtimeCopy.pumpFrequencySlowToast, 'warning');
      }
    }
    setHeatCapacityPumpPulseId((pulseId) => pulseId + 1);
    clearHeatCapacityPumpAnimationTimers();
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return nextHeatCapacityFile;
    });
    if (
      source !== 'autoDemo' &&
      nextHeatCapacityFile &&
      !guidePumpTargetReached &&
      nextHeatCapacityFile.powerOn &&
      (nextHeatCapacityFile.heatCapacityMode !== 'free' || nextHeatCapacityFile.heatCapacityFreePreheatCompleted)
    ) {
      const pressureAfterPumpMv = getGuideHeatCapacityThresholdPressureMv(nextHeatCapacityFile);
      const pressureStatusAfterPump = getHeatCapacityPressureSafetyStatusFromMv(pressureAfterPumpMv, nextHeatCapacityFile);
      if (pressureStatusAfterPump === 'danger' && pressureStatusBeforePump !== 'danger') {
        showHeatCapacityPressureAlarm(nextHeatCapacityFile.id, nextHeatCapacityFile.name);
      } else if (pressureStatusAfterPump === 'warning') {
        showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.pressureWarningMessage, 'pressureWarning');
      } else if (pressureStatusAfterPump === 'danger') {
        showHeatCapacityPressureThresholdToast(pressureAfterPumpMv, nextHeatCapacityFile);
      }
    }
    if (guidePumpTargetReached && nextHeatCapacityFile) {
      exitHeatCapacityFocusMode();
      const guidance = getGuideStepGuidance('closePumpValveRequired', nextHeatCapacityFile);
      showGuideHeatCapacityGuidance(guidance.message, 'pumpValve', 'info', 'guide');
    }
    scheduleHeatCapacityPumpAnimation(fileId, 120, 360);
  };

  const setHeatCapacityStopcockOpenByFileId = (
    fileId: string,
    nextOpen: boolean,
  ) => {
    const now = Date.now();
    const stopcockAngleDeg = getHeatCapacityStopcockTargetAngle(nextOpen);
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      if (file.heatCapacityMode === 'guide') {
        return setHeatCapacityGuideStopcockOpen(file, nextOpen, now);
      }
      if (file.heatCapacityMode === 'free') {
        return setHeatCapacityFreeStopcockOpen(file, nextOpen, now);
      }
      if (file.heatCapacityMode === 'demo') {
        return setHeatCapacityScriptedStopcockOpen(file, nextOpen, now);
      }
      return stepHeatCapacityWorkbenchFile({
        ...file,
        stopcockAngleDeg,
        glassPistonState: nextOpen ? 'open' : 'closed',
        updatedAt: now,
      }, now);
    });
  };
  return {
    effects: { resetFeedbackCleanup: resetFeedbackCleanupEffect }, heatCapacityRecordControlsClosingTimerRef, heatCapacityResetFeedbackTimerRef, heatCapacityRecordPulseId, heatCapacityRecordControlsClosing, setHeatCapacityRecordControlsClosing, heatCapacityResetFeedbackActionId, setHeatCapacityResetFeedbackActionId, updateHeatCapacityFreeEquilibriumSpeedMultiplier, toggleHeatCapacityHardSphereView, setHeatCapacityHardSphereViewEnabled, completeActiveHeatCapacityPreheat, recordHeatCapacityGuideSample, recordFreeHeatCapacitySample, updateHeatCapacityPower, resetHeatCapacityGuideExperiment, exitHeatCapacityGuideMode, exitCompletedHeatCapacityTeachingMode, updateHeatCapacityStopcockOpen, adjustHeatCapacityPressureZeroFineFromScene, adjustHeatCapacityPressureZeroCoarseFromScene, updateHeatCapacityPumpValve, pressHeatCapacityPumpBulb, setHeatCapacityStopcockOpenByFileId };
};
