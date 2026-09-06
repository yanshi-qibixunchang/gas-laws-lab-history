import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import { HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS, HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS } from './workbenchTeachingUiTiming.ts';

import React, { useMemo, useRef, useState } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { getHeatCapacityPressureThresholdsMv } from './workbenchHeatCapacityInstrumentState.ts';
import { createHeatCapacityToastMessage, HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS, isHeatCapacityPressureToast, resolveHeatCapacityToastAdvance, resolveHeatCapacityToastClear, resolveHeatCapacityToastShow, type HeatCapacityToastLevel, type HeatCapacityToastMessage, type HeatCapacityToastSource } from '../heatCapacity/heatCapacityToastController.ts';
import { getHeatCapacityToastPolicySpec, type HeatCapacityToastPolicy } from '../heatCapacity/heatCapacityToastPolicy.ts';
import type { HeatCapacityGuideRecordKind } from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';

import { getHeatCapacityRealtimeCopy } from './workbenchHeatCapacityRealtimeCopy.ts';

import { getHeatCapacityRefreshOptionalNumber, getHeatCapacityRefreshString, normalizeHeatCapacityRecordSuccessTimerPlan, type HeatCapacityRecordSuccessTimerPlan } from './workbenchHeatCapacityUiCheckpoint.ts';


export interface useWorkbenchHeatFeedbackPorts {
  initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
  initialHeatCapacityRefreshLayout: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  activeFileIdRef: React.MutableRefObject<string>;
  desktopExitQuiescedRef: React.MutableRefObject<boolean>;
  heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
  filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;

  exitHeatCapacityFocusMode: () => void;
  pushLog: (message: import("./workbenchConsoleLocalization.ts").WorkbenchConsoleMessageInput, kind?: import("./workbenchConsolePresentation.ts").LogKind) => void;

  getHeatCapacityRefreshRemainingMs: (deadlineAtMs: number | null) => number | null;
}

export const useWorkbenchHeatFeedback = (ports: useWorkbenchHeatFeedbackPorts) => {
  const { initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, activeFile, settingsLanguagePreference, activeFileIdRef, desktopExitQuiescedRef, heatCapacityRuntimeFailureFileIdRef, filesRef, exitHeatCapacityFocusMode, pushLog, getHeatCapacityRefreshRemainingMs } = ports;
  const initialHeatCapacityRecordSuccessTimerPlan = initialHeatCapacityRefreshSession
    ? normalizeHeatCapacityRecordSuccessTimerPlan(
        initialHeatCapacityRefreshLayout,
        initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
        initialHeatCapacityRefreshSession.mode,
      )
    : null;

  const initialHeatCapacityPressureAlarmPlan =
    initialHeatCapacityRefreshSession?.guide.pressureAlarmVisible &&
    initialHeatCapacityRefreshSession.guide.pressureAlarmRemainingMs !== null
      ? {
          fileId: initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
          remainingMs: initialHeatCapacityRefreshSession.guide.pressureAlarmRemainingMs,
        }
      : null;

  const initialHeatCapacityClosePumpValveReminderPlan = (() => {
    if (!initialHeatCapacityRefreshSession || initialHeatCapacityPressureAlarmPlan) return null;
    const fileId = getHeatCapacityRefreshString(
      initialHeatCapacityRefreshLayout,
      'closePumpValveReminderFileId',
    );
    const remainingMs = getHeatCapacityRefreshOptionalNumber(
      initialHeatCapacityRefreshLayout,
      'closePumpValveReminderRemainingMs',
    );
    return fileId === initialHeatCapacityRefreshSession.activeHeatCapacityFileId && remainingMs !== null
      ? { fileId, remainingMs }
      : null;
  })();

  const initialHeatCapacityRefreshToast = initialHeatCapacityRefreshSession?.guide.toastQueue.current
    ? {
        id: initialHeatCapacityRefreshSession.guide.toastQueue.current.id,
        text: initialHeatCapacityRefreshSession.guide.toastQueue.current.text,
        level: initialHeatCapacityRefreshSession.guide.toastQueue.current.level,
        kind: initialHeatCapacityRefreshSession.guide.toastQueue.current.level,
        priority: initialHeatCapacityRefreshSession.guide.toastQueue.current.priority,
        source: initialHeatCapacityRefreshSession.guide.toastQueue.current.source,
        createdAt: initialHeatCapacityRefreshSession.guide.toastQueue.current.createdAtMs,
        durationMs: HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
      } satisfies HeatCapacityToastMessage
    : null;

  const initialHeatCapacityRefreshPendingToast = initialHeatCapacityRefreshSession?.guide.toastQueue.pending[0]
    ? {
        id: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].id,
        text: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].text,
        level: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].level,
        kind: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].level,
        priority: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].priority,
        source: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].source,
        createdAt: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].createdAtMs,
        durationMs: HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
      } satisfies HeatCapacityToastMessage
    : null;

  const heatCapacityRecordSuccessToastTimersRef = useRef<number[]>([]);

  const heatCapacityRecordSuccessFollowUpDeadlineAtMsRef = useRef<number | null>(null);

  const heatCapacityRecordSuccessReleaseDeadlineAtMsRef = useRef<number | null>(null);

  const heatCapacityRecordSuccessFollowUpMessageRef = useRef<string | null>(null);

  const heatCapacityRecordSuccessTimerGenerationRef = useRef(0);

  const heatCapacityRecordSuccessPausedRef = useRef<HeatCapacityRecordSuccessTimerPlan | null>(
    initialHeatCapacityRecordSuccessTimerPlan,
  );

  const heatCapacityPressureAlarmTimerRef = useRef<number | null>(null);

  const heatCapacityPressureAlarmTimerGenerationRef = useRef(0);

  const desktopExitPausedPressureAlarmRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(initialHeatCapacityPressureAlarmPlan);

  const heatCapacityPressureAlarmDeadlineAtMsRef = useRef<number | null>(null);

  const heatCapacityPressureAlarmFileIdRef = useRef<string | null>(
    initialHeatCapacityPressureAlarmPlan?.fileId ?? null,
  );

  const heatCapacityClosePumpValveReminderTimerRef = useRef<number | null>(null);

  const heatCapacityClosePumpValveReminderTimerGenerationRef = useRef(0);

  const desktopExitPausedClosePumpValveReminderRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(initialHeatCapacityClosePumpValveReminderPlan);

  const heatCapacityClosePumpValveReminderDeadlineAtMsRef = useRef<number | null>(null);

  const heatCapacityClosePumpValveReminderFileIdRef = useRef<string | null>(
    initialHeatCapacityClosePumpValveReminderPlan?.fileId ?? null,
  );

  const heatCapacityPressureAlarmVisibleRef = useRef(
    initialHeatCapacityPressureAlarmPlan !== null,
  );

  const heatCapacityToastTimerRef = useRef<number | null>(null);

  const heatCapacityToastTimerGenerationRef = useRef(0);

  const heatCapacityToastPausedRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(
    initialHeatCapacityRefreshSession?.guide.toastQueue.current
      ? {
          fileId: initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
          remainingMs: initialHeatCapacityRefreshSession.guide.toastQueue.current.remainingMs,
        }
      : null,
  );

  const heatCapacityToastDeadlineAtMsRef = useRef<number | null>(null);

  const heatCapacityToastCurrentRef = useRef<HeatCapacityToastMessage | null>(initialHeatCapacityRefreshToast);

  const heatCapacityToastPendingRef = useRef<HeatCapacityToastMessage | null>(initialHeatCapacityRefreshPendingToast);

  const [heatCapacityToastCurrent, setHeatCapacityToastCurrent] = useState<HeatCapacityToastMessage | null>(
    initialHeatCapacityRefreshToast,
  );

  const [heatCapacityPressureAlarmVisible, setHeatCapacityPressureAlarmVisible] = useState(
    initialHeatCapacityPressureAlarmPlan !== null,
  );

  const [heatCapacityRecordToastSequenceActive, setHeatCapacityRecordToastSequenceActive] = useState(
    initialHeatCapacityRecordSuccessTimerPlan !== null,
  );

  const pressureAlarmProjectionEffect = { run: () => {
    heatCapacityPressureAlarmVisibleRef.current = heatCapacityPressureAlarmVisible;
  }, dependencies: [heatCapacityPressureAlarmVisible] } satisfies WorkbenchHeatEffect;

  const activeHeatCapacityPressureAlarmVisible = heatCapacityPressureAlarmVisible &&
    activeFile.kind === 'heatCapacity' &&
    heatCapacityPressureAlarmFileIdRef.current === activeFile.id;

  const heatCapacityRealtimeCopy = useMemo(
    () => getHeatCapacityRealtimeCopy(settingsLanguagePreference),
    [settingsLanguagePreference],
  );

  const showHeatCapacityPressureThresholdToast = (
    pressureMv: number,
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
    if (pressureMv >= pressureThresholdsMv.pressureDangerThresholdMv) {
      showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.pressureAlarmMessage, 'pressureAlarm');
      return;
    }
    if (pressureMv >= pressureThresholdsMv.pressureWarningThresholdMv) {
      showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.pressureWarningMessage, 'pressureWarning');
    }
  };

  const setHeatCapacityToastCurrentState = (message: HeatCapacityToastMessage | null) => {
    heatCapacityToastCurrentRef.current = message;
    setHeatCapacityToastCurrent(message);
  };

  const setPendingHeatCapacityToast = (message: HeatCapacityToastMessage | null) => {
    heatCapacityToastPendingRef.current = message;
  };

  const scheduleHeatCapacityToastAdvance = (delayMs = HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS) => {
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    const timerGeneration = ++heatCapacityToastTimerGenerationRef.current;
    heatCapacityToastPausedRef.current = null;
    heatCapacityToastDeadlineAtMsRef.current = Date.now() + Math.max(0, delayMs);
    heatCapacityToastTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityToastTimerGenerationRef.current) return;
      heatCapacityToastTimerRef.current = null;
      heatCapacityToastDeadlineAtMsRef.current = null;
      const nextState = resolveHeatCapacityToastAdvance({
        current: heatCapacityToastCurrentRef.current,
        pending: heatCapacityToastPendingRef.current,
      }, Date.now());
      setPendingHeatCapacityToast(nextState.pending);
      setHeatCapacityToastCurrentState(nextState.current);
      if (nextState.shouldContinueTimer) {
        scheduleHeatCapacityToastAdvance();
      }
    }, Math.max(0, delayMs));
  };

  const isHeatCapacityPressureAlertActive = () => (
    (
      heatCapacityPressureAlarmFileIdRef.current === activeFileIdRef.current &&
      (
        heatCapacityPressureAlarmVisibleRef.current ||
        heatCapacityPressureAlarmTimerRef.current !== null
      )
    ) ||
    (
      heatCapacityClosePumpValveReminderTimerRef.current !== null &&
      heatCapacityClosePumpValveReminderFileIdRef.current === activeFileIdRef.current
    ) ||
    isHeatCapacityPressureToast(heatCapacityToastCurrentRef.current) ||
    isHeatCapacityPressureToast(heatCapacityToastPendingRef.current)
  );

  const showHeatCapacityToast = (
    text: string,
    level: HeatCapacityToastLevel = 'info',
    options: { interrupt?: boolean; priority?: number; source?: HeatCapacityToastSource } = {},
  ) => {
    const nextMessage = createHeatCapacityToastMessage(text, level, {
      priority: options.priority,
      source: options.source ?? 'guide',
    });
    const nextState = resolveHeatCapacityToastShow({
      current: heatCapacityToastCurrentRef.current,
      pending: heatCapacityToastPendingRef.current,
      pressureAlertActive: isHeatCapacityPressureAlertActive(),
    }, nextMessage, { interrupt: options.interrupt });
    if (!nextState.changed) return;
    if (nextState.shouldRestartTimer && heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    setHeatCapacityToastCurrentState(nextState.current);
    setPendingHeatCapacityToast(nextState.pending);
    if (nextState.shouldRestartTimer) scheduleHeatCapacityToastAdvance();
  };

  const showHeatCapacityPolicyToast = (
    text: string,
    policy: HeatCapacityToastPolicy,
    levelOverride?: HeatCapacityToastLevel,
  ) => {
    const spec = getHeatCapacityToastPolicySpec(policy);
    showHeatCapacityToast(text, levelOverride ?? spec.level, spec.options);
  };

  const clearHeatCapacityClosePumpValveReminder = () => {
    heatCapacityClosePumpValveReminderTimerGenerationRef.current += 1;
    if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
      window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
      heatCapacityClosePumpValveReminderTimerRef.current = null;
    }
    heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = null;
    heatCapacityClosePumpValveReminderFileIdRef.current = null;
    desktopExitPausedClosePumpValveReminderRef.current = null;
  };

  const scheduleHeatCapacityClosePumpValveReminder = (fileId: string, delayMs: number) => {
    clearHeatCapacityClosePumpValveReminder();
    const normalizedDelayMs = Math.max(0, delayMs);
    const timerGeneration = ++heatCapacityClosePumpValveReminderTimerGenerationRef.current;
    heatCapacityClosePumpValveReminderFileIdRef.current = fileId;
    heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityClosePumpValveReminderTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityClosePumpValveReminderTimerGenerationRef.current) return;
      heatCapacityClosePumpValveReminderTimerRef.current = null;
      heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = null;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current === fileId
      ) {
        desktopExitPausedClosePumpValveReminderRef.current = {
          fileId,
          remainingMs: 0,
        };
        return;
      }
      heatCapacityClosePumpValveReminderFileIdRef.current = null;
      if (activeFileIdRef.current !== fileId) return;
      const currentFile = filesRef.current.find((file) => file.id === fileId);
      if (currentFile?.kind !== 'heatCapacity' || !currentFile.pumpValveOpen) return;
      if (!currentFile.powerOn) return;
      if (currentFile.heatCapacityMode === 'free' && !currentFile.heatCapacityFreePreheatCompleted) return;
      if (currentFile.pressureSafetyStatus !== 'danger' && !currentFile.pressureOverLimit) return;
      showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.closePumpValveReminder, 'pressureCloseValve');
    }, normalizedDelayMs);
  };

  const clearHeatCapacityToastBySource = (
    predicate: (message: HeatCapacityToastMessage | null) => boolean,
  ) => {
    const nextState = resolveHeatCapacityToastClear({
      current: heatCapacityToastCurrentRef.current,
      pending: heatCapacityToastPendingRef.current,
    }, predicate, Date.now());
    if (!nextState.changed) return;
    if (heatCapacityToastTimerRef.current !== null) {
      heatCapacityToastTimerGenerationRef.current += 1;
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    heatCapacityToastDeadlineAtMsRef.current = null;
    heatCapacityToastPausedRef.current = null;
    setHeatCapacityToastCurrentState(nextState.current);
    setPendingHeatCapacityToast(nextState.pending);
    if (nextState.shouldRestartTimer) scheduleHeatCapacityToastAdvance();
  };

  const clearHeatCapacityToastQueue = () => {
    heatCapacityToastTimerGenerationRef.current += 1;
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    heatCapacityToastDeadlineAtMsRef.current = null;
    heatCapacityToastPausedRef.current = null;
    setHeatCapacityToastCurrentState(null);
    setPendingHeatCapacityToast(null);
  };

  const clearHeatCapacityPressureAlertUiState = () => {
    if (
      heatCapacityPressureAlarmFileIdRef.current === null ||
      heatCapacityPressureAlarmFileIdRef.current === activeFileIdRef.current
    ) {
      heatCapacityPressureAlarmTimerGenerationRef.current += 1;
      if (heatCapacityPressureAlarmTimerRef.current !== null) {
        window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
        heatCapacityPressureAlarmTimerRef.current = null;
      }
      heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
      heatCapacityPressureAlarmFileIdRef.current = null;
      desktopExitPausedPressureAlarmRef.current = null;
      heatCapacityPressureAlarmVisibleRef.current = false;
      setHeatCapacityPressureAlarmVisible(false);
    }
    if (
      heatCapacityClosePumpValveReminderFileIdRef.current === null ||
      heatCapacityClosePumpValveReminderFileIdRef.current === activeFileIdRef.current
    ) {
      clearHeatCapacityClosePumpValveReminder();
    }
    clearHeatCapacityToastBySource(isHeatCapacityPressureToast);
  };

  const clearHeatCapacityRecordSuccessToastTimers = () => {
    heatCapacityRecordSuccessTimerGenerationRef.current += 1;
    heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityRecordSuccessToastTimersRef.current = [];
    heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
    heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current = null;
    heatCapacityRecordSuccessFollowUpMessageRef.current = null;
    heatCapacityRecordSuccessPausedRef.current = null;
    setHeatCapacityRecordToastSequenceActive(false);
  };

  const scheduleHeatCapacityRecordSuccessToastTimers = (
    followUpMessage: string | null,
    followUpDelayMs: number | null,
    releaseDelayMs: number,
  ) => {
    const timerGeneration = ++heatCapacityRecordSuccessTimerGenerationRef.current;
    heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityRecordSuccessToastTimersRef.current = [];
    heatCapacityRecordSuccessPausedRef.current = null;
    heatCapacityRecordSuccessFollowUpMessageRef.current = followUpMessage;
    if (followUpMessage && followUpDelayMs !== null) {
      const normalizedFollowUpDelayMs = Math.max(0, followUpDelayMs);
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = Date.now() + normalizedFollowUpDelayMs;
      const followUpTimerId = window.setTimeout(() => {
        if (timerGeneration !== heatCapacityRecordSuccessTimerGenerationRef.current) return;
        heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
        heatCapacityRecordSuccessFollowUpMessageRef.current = null;
        showHeatCapacityPolicyToast(followUpMessage, 'success');
      }, normalizedFollowUpDelayMs);
      heatCapacityRecordSuccessToastTimersRef.current.push(followUpTimerId);
    } else {
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
    }

    const normalizedReleaseDelayMs = Math.max(0, releaseDelayMs);
    heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current = Date.now() + normalizedReleaseDelayMs;
    const releaseTimerId = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityRecordSuccessTimerGenerationRef.current) return;
      heatCapacityRecordSuccessToastTimersRef.current = [];
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
      heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current = null;
      heatCapacityRecordSuccessFollowUpMessageRef.current = null;
      setHeatCapacityRecordToastSequenceActive(false);
    }, normalizedReleaseDelayMs);
    heatCapacityRecordSuccessToastTimersRef.current.push(releaseTimerId);
  };

  const getHeatCapacityRecordSuccessToast = (kind: HeatCapacityGuideRecordKind) => (
    kind === 'u0'
      ? heatCapacityRealtimeCopy.recordU0SuccessToast
      : kind === 'u1'
        ? heatCapacityRealtimeCopy.recordU1SuccessToast
        : heatCapacityRealtimeCopy.recordU2SuccessToast
  );

  const showHeatCapacitySuccessToastSequence = ({
    primaryMessage,
    followUpMessage,
  }: {
    primaryMessage: string;
    followUpMessage: string | null;
  }) => {
    clearHeatCapacityRecordSuccessToastTimers();
    setHeatCapacityRecordToastSequenceActive(true);
    showHeatCapacityPolicyToast(primaryMessage, 'success');
    const releaseDelay = followUpMessage
      ? HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS * 2
      : HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS;
    scheduleHeatCapacityRecordSuccessToastTimers(
      followUpMessage,
      followUpMessage ? HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS : null,
      releaseDelay,
    );
  };

  const showHeatCapacityRecordSuccessSequence = ({
    recordMessage,
    trialCompleteMessage,
  }: {
    recordMessage: string;
    trialCompleteMessage: string | null;
  }) => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: recordMessage,
      followUpMessage: trialCompleteMessage,
    });
  };

  const showHeatCapacityGuidePowerOffCompletionToast = () => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: heatCapacityRealtimeCopy.finalTrialCompleteToast,
      followUpMessage: null,
    });
  };

  const showHeatCapacityFreeGroupCompletionToast = (message: string = heatCapacityRealtimeCopy.freeGroupCompleteToast) => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: message,
      followUpMessage: null,
    });
  };

  const scheduleHeatCapacityPressureAlarmExpiry = (fileId: string, delayMs: number) => {
    if (heatCapacityPressureAlarmTimerRef.current !== null) {
      window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
    }
    const timerGeneration = ++heatCapacityPressureAlarmTimerGenerationRef.current;
    desktopExitPausedPressureAlarmRef.current = null;
    const normalizedDelayMs = Math.max(0, delayMs);
    heatCapacityPressureAlarmDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityPressureAlarmTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityPressureAlarmTimerGenerationRef.current) return;
      heatCapacityPressureAlarmTimerRef.current = null;
      heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current === fileId
      ) {
        heatCapacityPressureAlarmTimerGenerationRef.current += 1;
        heatCapacityPressureAlarmFileIdRef.current = null;
        heatCapacityPressureAlarmVisibleRef.current = false;
        setHeatCapacityPressureAlarmVisible(false);
        desktopExitPausedPressureAlarmRef.current = null;
        clearHeatCapacityClosePumpValveReminder();
        heatCapacityClosePumpValveReminderFileIdRef.current = fileId;
        desktopExitPausedClosePumpValveReminderRef.current = {
          fileId,
          remainingMs: HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS,
        };
        return;
      }
      heatCapacityPressureAlarmFileIdRef.current = null;
      heatCapacityPressureAlarmVisibleRef.current = false;
      setHeatCapacityPressureAlarmVisible(false);
      scheduleHeatCapacityClosePumpValveReminder(
        fileId,
        HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS,
      );
    }, normalizedDelayMs);
  };

  const showHeatCapacityPressureAlarm = (fileId: string, fileName: string) => {
    clearHeatCapacityToastQueue();
    heatCapacityPressureAlarmFileIdRef.current = fileId;
    heatCapacityPressureAlarmVisibleRef.current = true;
    setHeatCapacityPressureAlarmVisible(true);
    exitHeatCapacityFocusMode();
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).pressureAlarmLog(fileName),
      'warning',
    );
    clearHeatCapacityClosePumpValveReminder();
    scheduleHeatCapacityPressureAlarmExpiry(fileId, HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS);
  };

  const pauseHeatCapacityPressureAlertTimers = (fileId: string) => {
    if (
      heatCapacityPressureAlarmFileIdRef.current === fileId &&
      heatCapacityPressureAlarmVisibleRef.current
    ) {
      const pausedPressureAlarm = desktopExitPausedPressureAlarmRef.current?.fileId === fileId
        ? desktopExitPausedPressureAlarmRef.current
        : null;
      const remainingMs = getHeatCapacityRefreshRemainingMs(
        heatCapacityPressureAlarmDeadlineAtMsRef.current,
      ) ?? pausedPressureAlarm?.remainingMs ?? null;
      heatCapacityPressureAlarmTimerGenerationRef.current += 1;
      if (remainingMs !== null && remainingMs <= 0) {
        heatCapacityPressureAlarmFileIdRef.current = null;
        heatCapacityPressureAlarmVisibleRef.current = false;
        setHeatCapacityPressureAlarmVisible(false);
        desktopExitPausedPressureAlarmRef.current = null;
        clearHeatCapacityClosePumpValveReminder();
        heatCapacityClosePumpValveReminderFileIdRef.current = fileId;
        desktopExitPausedClosePumpValveReminderRef.current = {
          fileId,
          remainingMs: HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS,
        };
      } else if (remainingMs !== null) {
        desktopExitPausedPressureAlarmRef.current = { fileId, remainingMs };
      }
      if (heatCapacityPressureAlarmTimerRef.current !== null) {
        window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
        heatCapacityPressureAlarmTimerRef.current = null;
      }
      heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
    }

    if (heatCapacityClosePumpValveReminderFileIdRef.current === fileId) {
      const pausedClosePumpValveReminder =
        desktopExitPausedClosePumpValveReminderRef.current?.fileId === fileId
          ? desktopExitPausedClosePumpValveReminderRef.current
          : null;
      const remainingMs = getHeatCapacityRefreshRemainingMs(
        heatCapacityClosePumpValveReminderDeadlineAtMsRef.current,
      ) ?? pausedClosePumpValveReminder?.remainingMs ?? null;
      if (remainingMs !== null) {
        desktopExitPausedClosePumpValveReminderRef.current = { fileId, remainingMs };
      }
      heatCapacityClosePumpValveReminderTimerGenerationRef.current += 1;
      if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
        window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
        heatCapacityClosePumpValveReminderTimerRef.current = null;
      }
      heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = null;
    }
  };
  return {
    effects: { pressureAlarmProjection: pressureAlarmProjectionEffect }, heatCapacityRecordSuccessToastTimersRef, heatCapacityRecordSuccessFollowUpDeadlineAtMsRef, heatCapacityRecordSuccessReleaseDeadlineAtMsRef, heatCapacityRecordSuccessFollowUpMessageRef, heatCapacityRecordSuccessTimerGenerationRef, heatCapacityRecordSuccessPausedRef, heatCapacityPressureAlarmTimerRef, heatCapacityPressureAlarmTimerGenerationRef, desktopExitPausedPressureAlarmRef, heatCapacityPressureAlarmDeadlineAtMsRef, heatCapacityPressureAlarmFileIdRef, heatCapacityClosePumpValveReminderTimerRef, heatCapacityClosePumpValveReminderTimerGenerationRef, desktopExitPausedClosePumpValveReminderRef, heatCapacityClosePumpValveReminderDeadlineAtMsRef, heatCapacityClosePumpValveReminderFileIdRef, heatCapacityPressureAlarmVisibleRef, heatCapacityToastTimerRef, heatCapacityToastTimerGenerationRef, heatCapacityToastPausedRef, heatCapacityToastDeadlineAtMsRef, heatCapacityToastCurrentRef, heatCapacityToastPendingRef, heatCapacityToastCurrent, setHeatCapacityPressureAlarmVisible, heatCapacityRecordToastSequenceActive, activeHeatCapacityPressureAlarmVisible, heatCapacityRealtimeCopy, showHeatCapacityPressureThresholdToast, scheduleHeatCapacityToastAdvance, isHeatCapacityPressureAlertActive, showHeatCapacityToast, showHeatCapacityPolicyToast, clearHeatCapacityClosePumpValveReminder, scheduleHeatCapacityClosePumpValveReminder, clearHeatCapacityToastBySource, clearHeatCapacityToastQueue, clearHeatCapacityPressureAlertUiState, clearHeatCapacityRecordSuccessToastTimers, scheduleHeatCapacityRecordSuccessToastTimers, getHeatCapacityRecordSuccessToast, showHeatCapacityRecordSuccessSequence, showHeatCapacityGuidePowerOffCompletionToast, showHeatCapacityFreeGroupCompletionToast, scheduleHeatCapacityPressureAlarmExpiry, showHeatCapacityPressureAlarm, pauseHeatCapacityPressureAlertTimers };
};
