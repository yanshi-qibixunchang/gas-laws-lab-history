import { resolvePistonOscillationFreeEffectiveConfig } from '../../domain/pistonOscillation/pistonOscillationFreeEffectiveConfig.ts';
import { type PistonOscillationGuidePressureIssue, getPistonOscillationGuideReminderText, getPistonOscillationGuideGuardFeedbackText } from './workbenchPistonGuidePresentation.ts';
import type { PistonOscillationGuideStrongMaskLayout } from './workbenchPistonGuideMaskGeometry.ts';
import { getPistonOscillationGuideStrongMaskLayout } from './workbenchPistonGuideMaskDom.ts';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { transitionPistonOscillationFreeWorkbenchState, transitionPistonOscillationGuideWorkbenchState } from './workbenchPistonOscillationState.ts';
import { getPistonOscillationGuideHeightResetPresentation, getPistonOscillationGuideInstrumentRestoreState, getPistonOscillationGuideRequestedFocusMode, getPistonOscillationGuideStrongTargetId } from "../pistonOscillation/pistonOscillationGuidePresentation.ts";
import { getPistonOscillationGuideScrewInteractionMode } from "../pistonOscillation/pistonOscillationGuideScrewInteraction.ts";
import { getPistonOscillationShellCopy } from "../pistonOscillation/pistonOscillationCopy.ts";
import type { PistonOscillationGuideAcquisitionCue } from "../pistonOscillation/PistonOscillationAcquisitionPanel.tsx";
import type { PistonOscillationGuideInstrumentSnapshot, PistonOscillationGuideScrewDirectionFeedback, PistonOscillationGuideSupportLossEvent, PistonOscillationGuideVisualCue } from "../pistonOscillation/PistonOscillationInteractionWorkspace.tsx";
import type { PistonOscillationGuideAction, PistonOscillationGuideActionContext, PistonOscillationGuideEvent, PistonOscillationGuideGuardResult } from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import { getPistonOscillationGuideActionGuard, PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM } from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';

import { GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS, PISTON_OSCILLATION_GUIDE_HEIGHT_CONFIRM_PULSE_DELAY_MS, PISTON_OSCILLATION_GUIDE_STRONG_REMINDER_DELAY_MS, PISTON_OSCILLATION_GUIDE_CLOCK_INTERVAL_MS, PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS } from './workbenchTeachingUiTiming.ts';

export interface useWorkbenchPistonGuideRuntimePorts {
  clearPistonOscillationGuideFeedbackRef: React.MutableRefObject<() => void>;
  activePistonOscillationGuideSession: import("../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts").PistonOscillationGuideSession | null;
  activePistonOscillationFreeSelected: boolean;
  activePistonOscillationEffectiveConfig: ReturnType<typeof resolvePistonOscillationFreeEffectiveConfig> | null;
  activePistonOscillationFreeSession: import("../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts").PistonOscillationFreeSession | null;
  clearPistonOscillationGuideFeedback: () => void;
  setPistonOscillationCalculationSuppressedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  showPistonOscillationGuideFeedback: (text: string, kind: import("../../components/prompts/promptFeedbackPolicy.ts").PromptFeedbackKind, source: "guide", options?: { durationMs?: number | undefined; priority?: number | undefined; }) => void;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  pistonOscillationGuideLessonDialog: import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuideLessonDialogState | null;
  liveWorkspaceRef: React.RefObject<HTMLDivElement>;
  activeFileIdRef: React.MutableRefObject<string>;
  filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
  pistonOscillationDemoPlayback: { fileId: string | null; phase: "idle" | "running" | "paused" | "terminated" | "completed"; elapsedMs: number; };
  updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  setPistonOscillationPowerOnByFileId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  updateActiveFile: (updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  openPistonOscillationGuideOneTimeLesson: (kind: "pressureRange" | "lockingScrew" | "multiPeriod") => void;
}

export const useWorkbenchPistonGuideRuntime = (ports: useWorkbenchPistonGuideRuntimePorts) => {
  const { clearPistonOscillationGuideFeedbackRef, activePistonOscillationGuideSession, activePistonOscillationFreeSelected, activePistonOscillationEffectiveConfig, activePistonOscillationFreeSession, clearPistonOscillationGuideFeedback, setPistonOscillationCalculationSuppressedFileId, activeFile, showPistonOscillationGuideFeedback, settingsLanguagePreference, pistonOscillationGuideLessonDialog, liveWorkspaceRef, activeFileIdRef, filesRef, pistonOscillationDemoPlayback, updateFileById, setPistonOscillationPowerOnByFileId, updateActiveFile, openPistonOscillationGuideOneTimeLesson } = ports;
  const [pistonOscillationGuidePulseElapsedMs, setPistonOscillationGuidePulseElapsedMs] =
    useState(0);

  const [pistonOscillationPeriodSelectionToolActive, setPistonOscillationPeriodSelectionToolActive] =
    useState(false);

  const [pistonOscillationGuideStrongReminderActiveContext, setPistonOscillationGuideStrongReminderActiveContext] =
    useState<string | null>(null);

  const [pistonOscillationGuideStrongReminderClockContext, setPistonOscillationGuideStrongReminderClockContext] =
    useState<string | null>(null);

  const [pistonOscillationGuidePressureIssue, setPistonOscillationGuidePressureIssueState] =
    useState<PistonOscillationGuidePressureIssue | null>(null);

  const [pistonOscillationGuideStrongMaskLayout, setPistonOscillationGuideStrongMaskLayout] =
    useState<PistonOscillationGuideStrongMaskLayout | null>(null);

  const [pistonOscillationGuideHeightAdjustmentStage, setPistonOscillationGuideHeightAdjustmentStage] =
    useState<PistonOscillationGuideInstrumentSnapshot['heightAdjustmentStage']>('readingHeight');

  const [pistonOscillationGuideTargetHeightReady, setPistonOscillationGuideTargetHeightReady] =
    useState(false);

  const [pistonOscillationGuideHeightHandoffComplete, setPistonOscillationGuideHeightHandoffComplete] =
    useState(false);

  const [pistonOscillationGuideHoseDragging, setPistonOscillationGuideHoseDragging] =
    useState(false);

  const [pistonOscillationGuideHoseState, setPistonOscillationGuideHoseState] =
    useState<PistonOscillationGuideInstrumentSnapshot['hoseState'] | null>(null);

  const [pistonOscillationGuidePistonStable, setPistonOscillationGuidePistonStable] =
    useState(false);

  const [pistonOscillationGuideResetFeedback, setPistonOscillationGuideResetFeedback] =
    useState(false);

  const pistonOscillationGuideResetFeedbackTimerRef = useRef<number | null>(null);

  const pistonOscillationGuideShutdownCompletedFileIdRef = useRef<string | null>(null);

  const pistonOscillationGuideStrongReminderTimerRef = useRef<number | null>(null);

  const pistonOscillationGuidePressureRangeLessonTimerRef = useRef<number | null>(null);

  const pistonOscillationGuidePressureIssueRef =
    useRef<PistonOscillationGuidePressureIssue | null>(null);

  const pistonOscillationGuidePreviousPressureIssueRef =
    useRef<PistonOscillationGuidePressureIssue | null>(null);

  const pistonOscillationGuidePressureMissCountRef = useRef<
    Record<PistonOscillationGuidePressureIssue, number>
  >({ underpressure: 0, overpressure: 0 });

  const pistonOscillationGuideMissCountRef = useRef(0);

  const pistonOscillationGuideInstrumentSnapshotRef =
    useRef<PistonOscillationGuideInstrumentSnapshot | null>(null);

  const pistonOscillationGuideTargetHeightReadyRef = useRef(false);

  const pistonOscillationGuideHeightHandoffCompleteRef = useRef(false);

  const pistonOscillationGuideStrongTargetContextRef = useRef<string | null>(null);

  const pistonOscillationGuideResumeStrongReminderAfterLessonRef = useRef(false);

  const pistonOscillationGuideStrongReminderActiveContextRef = useRef<string | null>(null);

  const setPistonOscillationGuidePressureIssue = (
    issue: PistonOscillationGuidePressureIssue | null,
  ) => {
    pistonOscillationGuidePressureIssueRef.current = issue;
    setPistonOscillationGuidePressureIssueState(issue);
  };

  const setPistonOscillationGuideStrongReminderActive = (
    active: boolean,
    expectedContext?: string | null,
  ) => {
    if (active) {
      if (
        !expectedContext
        || expectedContext !== pistonOscillationGuideStrongTargetContextRef.current
      ) return;
      clearPistonOscillationGuideFeedbackRef.current();
      pistonOscillationGuideStrongReminderActiveContextRef.current = expectedContext;
      setPistonOscillationGuideStrongReminderActiveContext(expectedContext);
      return;
    }
    pistonOscillationGuideStrongReminderActiveContextRef.current = null;
    setPistonOscillationGuideStrongReminderActiveContext(null);
  };

  const isPistonOscillationGuideStrongReminderActive = () => (
    pistonOscillationGuideStrongReminderActiveContextRef.current !== null
    && pistonOscillationGuideStrongReminderActiveContextRef.current
      === pistonOscillationGuideStrongTargetContextRef.current
  );

  const activePistonOscillationGuideTimeFrozen =
    activePistonOscillationGuideSession?.heightReset !== null;

  const activePistonOscillationGuideInstrumentRestoreState =
    activePistonOscillationGuideSession
      ? getPistonOscillationGuideInstrumentRestoreState(
        activePistonOscillationGuideSession,
      )
      : null;

  const activePistonOscillationGuideSnapTargetHeightMm =
    activePistonOscillationGuideSession?.status === 'active'
    && (
      activePistonOscillationGuideSession.step === 'firstHeightAdjustment'
      || activePistonOscillationGuideSession.step === 'nextHeightAdjustment'
    )
      ? PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[
        activePistonOscillationGuideSession.measurementIndex
      ]
      : activePistonOscillationFreeSelected
        && activePistonOscillationEffectiveConfig?.heightSnapEnabled
        ? activePistonOscillationFreeSession?.experimentPlan
            ?.targets[activePistonOscillationFreeSession.measurementIndex]
            ?.heightMm ?? null
        : null;

  useEffect(() => {
    setPistonOscillationGuidePulseElapsedMs(0);
    clearPistonOscillationGuideFeedback();
    setPistonOscillationGuideStrongReminderActive(false);
    setPistonOscillationGuidePressureIssue(null);
    pistonOscillationGuidePressureMissCountRef.current = {
      underpressure: 0,
      overpressure: 0,
    };
    pistonOscillationGuideMissCountRef.current = 0;
    if (pistonOscillationGuideStrongReminderTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideStrongReminderTimerRef.current);
      pistonOscillationGuideStrongReminderTimerRef.current = null;
    }
    if (pistonOscillationGuidePressureRangeLessonTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuidePressureRangeLessonTimerRef.current);
      pistonOscillationGuidePressureRangeLessonTimerRef.current = null;
    }
    if (
      activePistonOscillationGuideSession?.status === 'active'
      && activePistonOscillationGuideSession.step === 'calculationReady'
    ) {
      setPistonOscillationCalculationSuppressedFileId(null);
      if (pistonOscillationGuideShutdownCompletedFileIdRef.current === activeFile.id) {
        pistonOscillationGuideShutdownCompletedFileIdRef.current = null;
        showPistonOscillationGuideFeedback(
          getPistonOscillationShellCopy(settingsLanguagePreference).guide.powerOffSuccess,
          'success',
          'guide',
        );
      }
    }
  }, [
    activeFile.id,
    activePistonOscillationGuideSession?.startedAtMs,
    activePistonOscillationGuideSession?.measurementIndex,
    activePistonOscillationGuideSession?.step,
  ]);

  useEffect(() => {
    if (
      activePistonOscillationGuideSession?.status === 'idle'
      || activePistonOscillationGuideSession?.step === 'firstHeightAdjustment'
      || activePistonOscillationGuideSession?.step === 'nextHeightAdjustment'
    ) {
      setPistonOscillationGuideHeightAdjustmentStage('readingHeight');
    } else if (activePistonOscillationGuideSession?.step === 'screwLock') {
      setPistonOscillationGuideHeightAdjustmentStage('lockingHeight');
    }
    pistonOscillationGuideTargetHeightReadyRef.current = false;
    setPistonOscillationGuideTargetHeightReady(false);
    pistonOscillationGuideHeightHandoffCompleteRef.current = false;
    setPistonOscillationGuideHeightHandoffComplete(false);
    setPistonOscillationGuideHoseDragging(false);
  }, [
    activeFile.id,
    activePistonOscillationGuideSession?.measurementIndex,
    activePistonOscillationGuideSession?.startedAtMs,
    activePistonOscillationGuideSession?.status,
    activePistonOscillationGuideSession?.step,
  ]);

  useEffect(() => {
    if (
      activePistonOscillationGuideSession?.status !== 'active'
      || activePistonOscillationGuideTimeFrozen
      || pistonOscillationGuideLessonDialog !== null
    ) return undefined;
    let previousAtMs = performance.now();
    const timer = window.setInterval(() => {
      const nowMs = performance.now();
      const deltaMs = nowMs - previousAtMs;
      previousAtMs = nowMs;
      setPistonOscillationGuidePulseElapsedMs((elapsedMs) => elapsedMs + deltaMs);
    }, PISTON_OSCILLATION_GUIDE_CLOCK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [
    activeFile.id,
    activePistonOscillationGuideSession?.status,
    activePistonOscillationGuideTimeFrozen,
    pistonOscillationGuideLessonDialog,
  ]);

  const pistonOscillationCopy = getPistonOscillationShellCopy(settingsLanguagePreference);

  const pistonGuideStep = activePistonOscillationGuideSession?.step ?? null;

  const pistonGuideHeightConfirmationReady = Boolean(
    pistonOscillationGuideTargetHeightReady
    && (
      pistonGuideStep === 'firstHeightAdjustment'
      || pistonGuideStep === 'nextHeightAdjustment'
    )
  );

  const pistonGuideHeightHandoffComplete = Boolean(
    pistonGuideHeightConfirmationReady
    && pistonOscillationGuideHeightHandoffComplete
  );

  const pistonGuidePulseDelayMs = pistonGuideHeightConfirmationReady
    ? PISTON_OSCILLATION_GUIDE_HEIGHT_CONFIRM_PULSE_DELAY_MS
    : GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS;

  const pistonGuidePulseCycleElapsedMs = Math.max(
    0,
    pistonOscillationGuidePulseElapsedMs - pistonGuidePulseDelayMs,
  );

  const pistonGuidePulseWithinCycleMs = pistonGuidePulseCycleElapsedMs % 4_000;

  const pistonGuidePulseActive = Boolean(
    activePistonOscillationGuideSession?.status === 'active'
    && (
      pistonOscillationGuideStrongReminderActiveContext !== null
      || (
        pistonOscillationGuidePulseElapsedMs >= pistonGuidePulseDelayMs
        && pistonGuidePulseWithinCycleMs < 2_200
      )
    ),
  );

  const pistonGuidePowerTargetActive = Boolean(
    activePistonOscillationGuideSession?.status === 'active'
    && (
      pistonGuideStep === 'powerOn'
      || pistonGuideStep === 'powerOff'
    )
  );

  const pistonGuideVisualCue: PistonOscillationGuideVisualCue = !pistonGuidePulseActive
    ? null
    : pistonGuidePowerTargetActive
      ? 'power'
    : pistonGuideStep === 'firstHeightAdjustment'
      || pistonGuideStep === 'nextHeightAdjustment'
        ? pistonGuideHeightConfirmationReady ? 'heightStageAction' : 'platform'
        : pistonGuideStep === 'waitingTrigger'
          ? pistonOscillationGuidePressureIssue === 'overpressure' ? null : 'platform'
        : pistonGuideStep === 'screwLock'
          ? 'screw'
          : pistonGuideStep === 'screwLoosen'
            ? 'screw'
          : pistonGuideStep === 'hoseReconnect'
            ? 'hoseReconnect'
            : pistonGuideStep === 'crossRunDisconnect'
              ? 'hoseDisconnect'
            : null;

  const pistonGuideScrewInteractionMode =
    activePistonOscillationGuideSession?.status === 'active'
      ? getPistonOscillationGuideScrewInteractionMode(
          activePistonOscillationGuideSession.step,
        )
      : null;

  const pistonGuideAcquisitionCue: PistonOscillationGuideAcquisitionCue =
    !pistonGuidePulseActive
      ? null
      : pistonGuideStep === 'parameterSetup'
        ? 'settings'
        : pistonOscillationGuidePressureIssue === 'overpressure'
          ? 'redo'
        : pistonGuideStep === 'acquisitionReady'
          ? 'start'
          : pistonGuideStep === 'pauseAvailable'
            ? 'pause'
            : pistonGuideStep === 'awaitingSaveOrRedo'
              ? 'save'
              : null;

  const pistonGuideRequestedFocusMode =
    activePistonOscillationGuideSession?.status === 'active'
    || activePistonOscillationGuideSession?.status === 'completed'
      ? getPistonOscillationGuideHeightResetPresentation(
        activePistonOscillationGuideSession.heightReset,
      )?.focusMode ?? getPistonOscillationGuideRequestedFocusMode(
        activePistonOscillationGuideSession.step,
      )
      : undefined;

  const pistonGuideExpectedStrongTargetId =
    activePistonOscillationGuideSession?.status === 'active'
      ? pistonOscillationGuidePressureIssue === 'overpressure'
        ? 'redo'
        : getPistonOscillationGuideStrongTargetId(
          activePistonOscillationGuideSession.step,
          pistonOscillationGuideHeightAdjustmentStage,
          pistonGuideHeightHandoffComplete,
          activePistonOscillationGuideSession,
          pistonOscillationPeriodSelectionToolActive,
        )
      : null;

  const pistonGuideStrongTargetContext = pistonGuideExpectedStrongTargetId
    && activePistonOscillationGuideSession
      ? [
          activeFile.id,
          activePistonOscillationGuideSession.startedAtMs,
          activePistonOscillationGuideSession.measurementIndex,
          activePistonOscillationGuideSession.step,
          activePistonOscillationGuideSession.dataProcessing?.activeRunIndex ?? 'none',
          pistonGuideExpectedStrongTargetId,
        ].join(':')
      : null;

  const pistonOscillationGuideStrongReminderActive =
    pistonOscillationGuideStrongReminderActiveContext !== null
    && pistonOscillationGuideStrongReminderActiveContext === pistonGuideStrongTargetContext;

  const pistonGuideStrongTargetContextChanged =
    pistonOscillationGuideStrongTargetContextRef.current !== pistonGuideStrongTargetContext;

  useEffect(() => {
    if (pistonOscillationGuideStrongTargetContextRef.current === pistonGuideStrongTargetContext) {
      return;
    }
    const pressureIssueChanged = pistonOscillationGuidePreviousPressureIssueRef.current
      !== pistonOscillationGuidePressureIssue;
    pistonOscillationGuidePreviousPressureIssueRef.current = pistonOscillationGuidePressureIssue;
    pistonOscillationGuideStrongTargetContextRef.current = pistonGuideStrongTargetContext;
    setPistonOscillationGuideStrongReminderClockContext(null);
    setPistonOscillationGuideStrongReminderActive(false);
    setPistonOscillationGuidePulseElapsedMs(0);
    if (!pressureIssueChanged) {
      clearPistonOscillationGuideFeedback();
      pistonOscillationGuideMissCountRef.current = 0;
    }
    if (pistonOscillationGuideStrongReminderTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideStrongReminderTimerRef.current);
      pistonOscillationGuideStrongReminderTimerRef.current = null;
    }
  }, [pistonGuideStrongTargetContext, pistonOscillationGuidePressureIssue]);

  useEffect(() => {
    if (
      pistonGuideStrongTargetContext === null
      || pistonOscillationGuidePressureIssue !== null
      || pistonOscillationGuideStrongReminderClockContext !== null
      || pistonOscillationGuidePulseElapsedMs
        >= PISTON_OSCILLATION_GUIDE_STRONG_REMINDER_DELAY_MS
    ) return;
    setPistonOscillationGuideStrongReminderClockContext(
      pistonGuideStrongTargetContext,
    );
  }, [
    pistonGuideStrongTargetContext,
    pistonOscillationGuidePressureIssue,
    pistonOscillationGuidePulseElapsedMs,
    pistonOscillationGuideStrongReminderClockContext,
  ]);

  useEffect(() => {
    if (
      activePistonOscillationGuideSession?.status !== 'active'
      || pistonGuideStrongTargetContextChanged
      || pistonGuideExpectedStrongTargetId === null
      || pistonOscillationGuideStrongReminderClockContext
        !== pistonGuideStrongTargetContext
      || pistonOscillationGuidePressureIssue !== null
      || pistonOscillationGuideStrongReminderActive
      || activePistonOscillationGuideTimeFrozen
      || pistonOscillationGuideLessonDialog !== null
      || pistonOscillationGuidePulseElapsedMs
        < PISTON_OSCILLATION_GUIDE_STRONG_REMINDER_DELAY_MS
    ) return;
    setPistonOscillationGuideStrongReminderActive(
      true,
      pistonGuideStrongTargetContext,
    );
  }, [
    activePistonOscillationGuideSession?.status,
    activePistonOscillationGuideTimeFrozen,
    pistonGuideExpectedStrongTargetId,
    pistonOscillationGuideStrongReminderActive,
    pistonOscillationGuideStrongReminderClockContext,
    pistonOscillationGuidePressureIssue,
    pistonGuideStrongTargetContextChanged,
    pistonOscillationGuideLessonDialog,
    pistonOscillationGuidePulseElapsedMs,
  ]);

  const pistonGuideStrongHoseInteractionHidden = Boolean(
    (pistonGuideExpectedStrongTargetId === 'hoseDisconnect'
      || pistonGuideExpectedStrongTargetId === 'hoseReconnect')
    && (
      pistonOscillationGuideHoseDragging
      || (
        pistonGuideExpectedStrongTargetId === 'hoseDisconnect'
        && pistonOscillationGuideHoseState === 'disconnected'
      )
      || (
        pistonGuideExpectedStrongTargetId === 'hoseReconnect'
        && pistonOscillationGuideHoseState === 'connected'
      )
    )
  );

  const pistonGuideStrongTargetId =
    activePistonOscillationGuideSession?.status === 'active'
    && pistonOscillationGuideStrongReminderActive
    && !activePistonOscillationGuideTimeFrozen
    && pistonOscillationGuideLessonDialog === null
    && !pistonGuideStrongHoseInteractionHidden
      ? pistonGuideExpectedStrongTargetId
      : null;

  const pistonGuideStrongReminderText = activePistonOscillationGuideSession
    ? pistonOscillationGuidePressureIssue === 'underpressure'
      ? pistonOscillationCopy.guide.pressureTooLowStrongReminder
      : pistonOscillationGuidePressureIssue === 'overpressure'
        ? pistonOscillationCopy.guide.pressureTooHighStrongReminder
        : getPistonOscillationGuideReminderText(
          pistonOscillationCopy,
          activePistonOscillationGuideSession.step,
          activePistonOscillationGuideSession.measurementIndex,
          pistonGuideExpectedStrongTargetId,
        )
    : '';

  useLayoutEffect(() => {
    if (!pistonGuideStrongTargetId) {
      setPistonOscillationGuideStrongMaskLayout(null);
      return undefined;
    }
    const root = liveWorkspaceRef.current;
    if (!root) return undefined;
    const updateLayout = () => {
      const nextLayout = getPistonOscillationGuideStrongMaskLayout(
        root,
        pistonGuideStrongTargetId,
      );
      setPistonOscillationGuideStrongMaskLayout((currentLayout) => {
        if (
          !nextLayout
          || !currentLayout
          || pistonGuideStrongTargetId !== 'platform'
          || currentLayout.top !== nextLayout.top
          || currentLayout.width !== nextLayout.width
          || currentLayout.height !== nextLayout.height
        ) return nextLayout;
        const renderedCard = root.querySelector<HTMLElement>(
          '.studio-piston-guide-strong-mask .studio-heat-guide-strong-card',
        );
        const stableCardHeight = renderedCard?.offsetHeight
          ?? (currentLayout.card.compact ? 168 : 112);
        const stableCardRight = currentLayout.card.x + currentLayout.card.width;
        const stableCardBottom = currentLayout.card.y + stableCardHeight;
        const cutoutRight = nextLayout.cutout.x + nextLayout.cutout.width;
        const cutoutBottom = nextLayout.cutout.y + nextLayout.cutout.height;
        const overlapsMovingCutout = !(
          stableCardRight + 8 <= nextLayout.cutout.x
          || cutoutRight + 8 <= currentLayout.card.x
          || stableCardBottom + 8 <= nextLayout.cutout.y
          || cutoutBottom + 8 <= currentLayout.card.y
        );
        return overlapsMovingCutout
          ? nextLayout
          : { ...nextLayout, card: currentLayout.card };
      });
    };
    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(root);
    root.addEventListener('scroll', updateLayout, true);
    const timer = window.setInterval(
      updateLayout,
      pistonGuideStrongTargetId === 'platform' ? 32 : 120,
    );
    return () => {
      observer.disconnect();
      root.removeEventListener('scroll', updateLayout, true);
      window.clearInterval(timer);
    };
  }, [pistonGuideStrongTargetId]);

  const applyPistonOscillationGuideEvents = (
    file: WorkbenchFileState,
    events: readonly PistonOscillationGuideEvent[],
  ): WorkbenchFileState => events.reduce<WorkbenchFileState>(
    (current, event) => current.kind === 'heatCapacityPistonOscillation'
      ? transitionPistonOscillationGuideWorkbenchState(current, event)
      : current,
    file,
  );

  const handlePistonOscillationPowerToggle = (powerOn: boolean) => {
    const fileId = activeFileIdRef.current;
    const liveFile = filesRef.current.find((file) => file.id === fileId);
    if (
      !liveFile
      || liveFile.kind !== 'heatCapacityPistonOscillation'
      || (
        pistonOscillationDemoPlayback.fileId === fileId
        && pistonOscillationDemoPlayback.phase !== 'idle'
      )
    ) return;
    if (liveFile.pistonOscillationGuideSession.status === 'active') {
      const completesGuideShutdown = (
        liveFile.pistonOscillationGuideSession.step === 'powerOff'
        && liveFile.pistonOscillationGuideSession.powerOn
        && !powerOn
      );
      if (completesGuideShutdown) {
        pistonOscillationGuideShutdownCompletedFileIdRef.current = fileId;
        setPistonOscillationCalculationSuppressedFileId(null);
      }
      updateFileById(fileId, (file) => applyPistonOscillationGuideEvents(file, [{
        type: 'setPower',
        powerOn,
        nowMs: Date.now(),
      }]));
      return;
    }
    if (liveFile.pistonOscillationFreeSession.status === 'active') {
      updateFileById(fileId, (file) => file.kind === 'heatCapacityPistonOscillation'
        ? transitionPistonOscillationFreeWorkbenchState(file, {
            type: 'setPower',
            powerOn,
            nowMs: Date.now(),
          })
        : file);
      return;
    }
    setPistonOscillationPowerOnByFileId((current) => ({
      ...current,
      [fileId]: powerOn,
    }));
  };

  const handlePistonOscillationGuideActionAttempt = (
    action: PistonOscillationGuideAction,
    context: PistonOscillationGuideActionContext,
  ): PistonOscillationGuideGuardResult => {
    const liveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!liveFile || liveFile.kind !== 'heatCapacityPistonOscillation') {
      return { allowed: true, reason: 'allowed' };
    }
    const session = liveFile.pistonOscillationGuideSession;
    const guard = getPistonOscillationGuideActionGuard(session, action, context);
    const releaseOnly = action === 'platformRelease' || action === 'leftHandRelease';
    if (guard.allowed) {
      if (
        !releaseOnly
        && !isPistonOscillationGuideStrongReminderActive()
      ) {
        setPistonOscillationGuidePulseElapsedMs(0);
      }
      if (!releaseOnly) {
        clearPistonOscillationGuideFeedback();
      }
      return guard;
    }

    const heightSubmitRequiresReset = action === 'confirmHeight'
      && (
        session.step === 'firstHeightAdjustment'
        || session.step === 'nextHeightAdjustment'
      )
      && (
        guard.reason === 'wrongTargetHeight'
        || guard.reason === 'leftHandRequired'
        || guard.reason === 'rightHandMustBeReleased'
      );
    if (heightSubmitRequiresReset) {
      const heightMm = typeof context.heightMm === 'number' && Number.isFinite(context.heightMm)
        ? Math.max(0, context.heightMm)
        : 0;
      pistonOscillationGuideResumeStrongReminderAfterLessonRef.current =
        isPistonOscillationGuideStrongReminderActive();
      pistonOscillationGuideMissCountRef.current = 0;
      clearPistonOscillationGuideFeedback();
      setPistonOscillationGuideStrongReminderActive(false);
      setPistonOscillationGuidePulseElapsedMs(0);
      setPistonOscillationGuideTargetHeightReady(false);
      pistonOscillationGuideTargetHeightReadyRef.current = false;
      setPistonOscillationGuideHeightHandoffComplete(false);
      pistonOscillationGuideHeightHandoffCompleteRef.current = false;
      setPistonOscillationGuideHeightAdjustmentStage('readingHeight');
      updateFileById(liveFile.id, (file) => applyPistonOscillationGuideEvents(file, [{
        type: 'beginHeightReset',
        reason: 'wrongHeightConfirmation',
        heightMm,
        nowMs: Date.now(),
      }]));
      return guard;
    }

    if (isPistonOscillationGuideStrongReminderActive()) return guard;

    const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[session.measurementIndex];
    const message = getPistonOscillationGuideGuardFeedbackText(
      pistonOscillationCopy,
      action,
      guard,
      targetHeightMm,
    );
    showPistonOscillationGuideFeedback(message, 'warning', 'guide');
    if (!isPistonOscillationGuideStrongReminderActive()) {
      setPistonOscillationGuidePulseElapsedMs(0);
    }

    pistonOscillationGuideMissCountRef.current += 1;
    if (
      pistonOscillationGuideMissCountRef.current >= 2
      && !isPistonOscillationGuideStrongReminderActive()
    ) {
      const expectedFileId = liveFile.id;
      const expectedStep = session.step;
      const expectedTargetContext = pistonOscillationGuideStrongTargetContextRef.current;
      if (pistonOscillationGuideStrongReminderTimerRef.current !== null) {
        window.clearTimeout(pistonOscillationGuideStrongReminderTimerRef.current);
      }
      pistonOscillationGuideStrongReminderTimerRef.current = window.setTimeout(() => {
        pistonOscillationGuideStrongReminderTimerRef.current = null;
        const currentFile = filesRef.current.find((file) => file.id === expectedFileId);
        if (
          currentFile?.kind === 'heatCapacityPistonOscillation'
          && currentFile.pistonOscillationGuideSession.status === 'active'
          && currentFile.pistonOscillationGuideSession.step === expectedStep
          && currentFile.pistonOscillationGuideSession.heightReset === null
          && pistonOscillationGuideStrongTargetContextRef.current === expectedTargetContext
        ) {
          setPistonOscillationGuideStrongReminderActive(
            true,
            expectedTargetContext,
          );
        }
      }, PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS);
    }
    return guard;
  };

  const handlePistonOscillationGuideScrewDirectionFeedback = (
    feedback: PistonOscillationGuideScrewDirectionFeedback,
  ) => {
    const expectsTightening = feedback.expectedDirection === 'clockwise';
    const text = feedback.kind === 'boundaryBlocked'
      ? expectsTightening
        ? pistonOscillationCopy.guide.screwBoundaryBlockedTighten
        : pistonOscillationCopy.guide.screwBoundaryBlockedLoosen
      : expectsTightening
        ? pistonOscillationCopy.guide.screwWrongDirectionTighten
        : pistonOscillationCopy.guide.screwWrongDirectionLoosen;
    showPistonOscillationGuideFeedback(
      text,
      feedback.kind === 'boundaryBlocked' ? 'warning' : 'info',
      'guide',
      { durationMs: PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS },
    );
  };

  const handlePistonOscillationGuideHeightConfirmed = (
    snapshot: PistonOscillationGuideInstrumentSnapshot,
  ) => {
    updateActiveFile((file) => applyPistonOscillationGuideEvents(file, [{
      type: 'confirmHeight',
      heightMm: snapshot.equilibriumHeightMm,
      leftHandSupporting: snapshot.spaceHeld,
      rightHandReleased: !snapshot.mouseHeld,
      nowMs: Date.now(),
    }]));
  };

  const handlePistonOscillationGuideSupportLoss = (
    event: PistonOscillationGuideSupportLossEvent,
  ) => {
    pistonOscillationGuideResumeStrongReminderAfterLessonRef.current =
      isPistonOscillationGuideStrongReminderActive();
    clearPistonOscillationGuideFeedback();
    setPistonOscillationGuideStrongReminderActive(false);
    setPistonOscillationGuidePulseElapsedMs(0);
    setPistonOscillationGuideTargetHeightReady(false);
    pistonOscillationGuideTargetHeightReadyRef.current = false;
    setPistonOscillationGuideHeightHandoffComplete(false);
    pistonOscillationGuideHeightHandoffCompleteRef.current = false;
    setPistonOscillationGuideHeightAdjustmentStage('readingHeight');
    updateActiveFile((file) => applyPistonOscillationGuideEvents(file, [{
      type: 'beginHeightReset',
      reason: 'supportLost',
      heightMm: event.heightMm,
      nowMs: Date.now(),
    }]));
  };

  const handlePistonOscillationGuideHeightResetComplete = () => {
    updateActiveFile((file) => applyPistonOscillationGuideEvents(file, [{
      type: 'heightResetComplete',
      nowMs: Date.now(),
    }]));
  };

  const handlePistonOscillationGuideInstrumentSnapshot = (
    snapshot: PistonOscillationGuideInstrumentSnapshot,
  ) => {
    const previousSnapshot = pistonOscillationGuideInstrumentSnapshotRef.current;
    const previousHeightAdjustmentStage = previousSnapshot?.heightAdjustmentStage;
    pistonOscillationGuideInstrumentSnapshotRef.current = snapshot;
    setPistonOscillationGuidePistonStable(snapshot.pistonPhase === 'idle');
    if (previousHeightAdjustmentStage !== snapshot.heightAdjustmentStage) {
      setPistonOscillationGuideHeightAdjustmentStage(snapshot.heightAdjustmentStage);
    }
    if (previousSnapshot?.hoseDragging !== snapshot.hoseDragging) {
      setPistonOscillationGuideHoseDragging(snapshot.hoseDragging);
    }
    if (previousSnapshot?.hoseState !== snapshot.hoseState) {
      setPistonOscillationGuideHoseState(snapshot.hoseState);
    }
    const currentFile = filesRef.current.find(
      (file) => file.id === activeFileIdRef.current,
    );
    if (
      !currentFile
      || currentFile.kind !== 'heatCapacityPistonOscillation'
      || currentFile.pistonOscillationGuideSession.status !== 'active'
    ) return;
    const currentSession = currentFile.pistonOscillationGuideSession;
    const currentStep = currentSession.step;
    const isAtHeight = (heightMm: number) => (
      Math.abs(snapshot.equilibriumHeightMm - heightMm) <= 0.25
    );
    const currentTargetHeightMm =
      PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[currentSession.measurementIndex];
    const targetHeightReady = (
      currentStep === 'firstHeightAdjustment'
      || currentStep === 'nextHeightAdjustment'
    ) && isAtHeight(currentTargetHeightMm);
    if (pistonOscillationGuideTargetHeightReadyRef.current !== targetHeightReady) {
      pistonOscillationGuideTargetHeightReadyRef.current = targetHeightReady;
      setPistonOscillationGuideTargetHeightReady(targetHeightReady);
      setPistonOscillationGuidePulseElapsedMs(0);
    }
    const heightHandoffComplete = Boolean(
      targetHeightReady
      && snapshot.spaceHeld
      && !snapshot.mouseHeld
    );
    if (
      pistonOscillationGuideHeightHandoffCompleteRef.current
      !== heightHandoffComplete
    ) {
      pistonOscillationGuideHeightHandoffCompleteRef.current = heightHandoffComplete;
      setPistonOscillationGuideHeightHandoffComplete(heightHandoffComplete);
    }
    const snapshotCanAdvance = (
      (currentStep === 'screwLock' && snapshot.lockingScrewState === 'locked')
      || (currentStep === 'hoseReconnect' && snapshot.hoseState === 'connected')
      || (currentStep === 'screwLoosen' && snapshot.lockingScrewState === 'loose')
      || (currentStep === 'crossRunDisconnect'
        && snapshot.spaceHeld
        && snapshot.hoseState === 'disconnected')
    );
    const shouldOpenLockingScrewLesson = (
      currentStep === 'screwLoosen'
      && previousSnapshot?.lockingScrewState !== 'loose'
      && snapshot.lockingScrewState === 'loose'
      && !snapshot.lockingScrewDragging
    ) || (
      currentStep === 'acquisitionReady'
      && previousSnapshot?.lockingScrewDragging === true
      && !snapshot.lockingScrewDragging
      && snapshot.lockingScrewState === 'loose'
    );
    if (!snapshotCanAdvance) {
      if (shouldOpenLockingScrewLesson) {
        window.setTimeout(() => {
          openPistonOscillationGuideOneTimeLesson('lockingScrew');
        }, 0);
      }
      return;
    }
    setPistonOscillationGuideStrongReminderActive(false);
    setPistonOscillationGuidePulseElapsedMs(0);
    pistonOscillationGuideMissCountRef.current = 0;
    const nowMs = Date.now();
    updateActiveFile((file) => {
      if (
        file.kind !== 'heatCapacityPistonOscillation'
        || file.pistonOscillationGuideSession.status !== 'active'
      ) return file;
      let nextFile: WorkbenchFileState = file;
      for (let guard = 0; guard < 8; guard += 1) {
        if (nextFile.kind !== 'heatCapacityPistonOscillation') break;
        const nextSession = nextFile.pistonOscillationGuideSession;
        const step = nextSession.step;
        let event: PistonOscillationGuideEvent | null = null;
        if (step === 'screwLock' && snapshot.lockingScrewState === 'locked') {
          event = { type: 'lockScrew', nowMs };
        } else if (step === 'hoseReconnect' && snapshot.hoseState === 'connected') {
          event = { type: 'reconnectHose', nowMs };
        } else if (step === 'screwLoosen' && snapshot.lockingScrewState === 'loose') {
          event = { type: 'loosenScrew', nowMs };
        } else if (
          step === 'crossRunDisconnect'
          && snapshot.spaceHeld
          && snapshot.hoseState === 'disconnected'
        ) {
          event = { type: 'disconnectHose', nowMs };
        }
        if (!event) break;
        const advanced = applyPistonOscillationGuideEvents(nextFile, [event]);
        if (advanced === nextFile) break;
        nextFile = advanced;
      }
      return nextFile;
    });
    if (shouldOpenLockingScrewLesson) {
      window.setTimeout(() => {
        openPistonOscillationGuideOneTimeLesson('lockingScrew');
      }, 0);
    }
  };

  const changePistonOscillationPeriodSelectionMode = (active: boolean) => setPistonOscillationPeriodSelectionToolActive(active);
  useEffect(() => () => {
    if (pistonOscillationGuideStrongReminderTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideStrongReminderTimerRef.current);
    }
    if (pistonOscillationGuidePressureRangeLessonTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuidePressureRangeLessonTimerRef.current);
    }
  }, []);

  return { pistonOscillationGuidePulseElapsedMs, setPistonOscillationGuidePulseElapsedMs, setPistonOscillationGuideStrongReminderClockContext, pistonOscillationGuideStrongMaskLayout, pistonOscillationGuidePistonStable, pistonOscillationGuideResetFeedback, setPistonOscillationGuideResetFeedback, pistonOscillationGuideResetFeedbackTimerRef, pistonOscillationGuideStrongReminderTimerRef, pistonOscillationGuidePressureRangeLessonTimerRef, pistonOscillationGuidePressureIssueRef, pistonOscillationGuidePressureMissCountRef, pistonOscillationGuideStrongTargetContextRef, pistonOscillationGuideResumeStrongReminderAfterLessonRef, setPistonOscillationGuidePressureIssue, setPistonOscillationGuideStrongReminderActive, activePistonOscillationGuideTimeFrozen, activePistonOscillationGuideInstrumentRestoreState, activePistonOscillationGuideSnapTargetHeightMm, pistonOscillationCopy, pistonGuidePulseActive, pistonGuideVisualCue, pistonGuideScrewInteractionMode, pistonGuideAcquisitionCue, pistonGuideRequestedFocusMode, pistonGuideExpectedStrongTargetId, pistonGuideStrongTargetContext, pistonOscillationGuideStrongReminderActive, pistonGuideStrongTargetId, pistonGuideStrongReminderText, applyPistonOscillationGuideEvents, handlePistonOscillationPowerToggle, handlePistonOscillationGuideActionAttempt, handlePistonOscillationGuideScrewDirectionFeedback, handlePistonOscillationGuideHeightConfirmed, handlePistonOscillationGuideSupportLoss, handlePistonOscillationGuideHeightResetComplete, handlePistonOscillationGuideInstrumentSnapshot, changePistonOscillationPeriodSelectionMode };
};
