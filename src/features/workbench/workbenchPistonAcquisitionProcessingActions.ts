
import React from 'react';

import type { WorkbenchFileState } from './workbenchFileUnion.ts';

import { transitionPistonOscillationFreeWorkbenchState } from './workbenchPistonOscillationState.ts';

import { transitionPistonOscillationGuideAcquisitionSession } from "../pistonOscillation/pistonOscillationGuideAcquisitionBridge.ts";
import type { PistonOscillationGuideAcquisitionEvent } from "../pistonOscillation/PistonOscillationAcquisitionPanel.tsx";
import type { PistonOscillationGuideEvent, PistonOscillationGuideSession } from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import type { PistonOscillationFreeEvent } from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import { PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS } from './workbenchTeachingUiTiming.ts';

export interface createWorkbenchPistonAcquisitionProcessingActionsPorts {
  desktopExitQuiescedRef: React.MutableRefObject<boolean>;
  filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
  scheduleHeatCapacitySemanticSceneCheckpointRef: React.MutableRefObject<() => void>;
  scheduleWorkspacePersistenceRef: React.MutableRefObject<(reason?: import("./workbenchPersistenceScheduler.ts").WorkbenchPersistenceReason | undefined) => boolean>;
  setFiles: React.Dispatch<React.SetStateAction<import("./workbenchFileUnion.ts").WorkbenchFileState[]>>;
  activeFileIdRef: React.MutableRefObject<string>;
  setPistonOscillationGuideStrongReminderActive: (active: boolean, expectedContext?: string | null | undefined) => void;
  setPistonOscillationGuideStrongReminderClockContext: React.Dispatch<React.SetStateAction<string | null>>;
  setPistonOscillationGuidePressureIssue: (issue: import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuidePressureIssue | null) => void;
  setPistonOscillationGuidePulseElapsedMs: React.Dispatch<React.SetStateAction<number>>;
  showPistonOscillationGuideFeedback: (text: string, kind: import("../../components/prompts/promptFeedbackPolicy.ts").PromptFeedbackKind, source: "guide", options?: { durationMs?: number | undefined; priority?: number | undefined; }) => void;
  pistonOscillationCopy: import("../pistonOscillation/pistonOscillationCopy.ts").PistonOscillationShellCopy;
  pistonOscillationGuidePressureMissCountRef: React.MutableRefObject<Record<import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuidePressureIssue, number>>;
  pistonOscillationGuidePressureRangeLessonTimerRef: React.MutableRefObject<number | null>;
  pistonOscillationGuidePressureIssueRef: React.MutableRefObject<import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuidePressureIssue | null>;
  openPistonOscillationGuideOneTimeLesson: (kind: "pressureRange" | "lockingScrew" | "multiPeriod") => void;
  pistonOscillationGuideStrongReminderTimerRef: React.MutableRefObject<number | null>;
  pistonOscillationGuideStrongTargetContextRef: React.MutableRefObject<string | null>;
  clearPistonOscillationGuideFeedback: () => void;
  applyPistonOscillationGuideEvents: (file: import("./workbenchFileUnion.ts").WorkbenchFileState, events: readonly import("../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts").PistonOscillationGuideEvent[]) => import("./workbenchFileUnion.ts").WorkbenchFileState;
  updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  pistonOscillationLivePressureChannel: import("../pistonOscillation/pistonOscillationLivePressureChannel.ts").PistonOscillationLivePressureChannel;
  setPistonOscillationMeasurementCyclesByFileId: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPistonOscillationGuideLessonOutgoingView: React.Dispatch<React.SetStateAction<import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuideLessonView | null>>;
  setPistonOscillationGuideLessonDialog: React.Dispatch<React.SetStateAction<import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuideLessonDialogState | null>>;
  updateActiveFile: (updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  setPistonOscillationCalculationReviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPistonOscillationDataProcessingReviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPanel: React.Dispatch<React.SetStateAction<import("./workbenchFileState.ts").WorkbenchPanelKey>>;
  setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  flushWorkspacePersistenceRef: React.MutableRefObject<() => Promise<boolean>>;
  activePistonOscillationCalculationSession: import("../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts").PistonOscillationCalculationSessionSnapshot | null;
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  setPistonOscillationProcessReviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPistonOscillationCalculationSuppressedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setPistonOscillationProcessingSuppressedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  activePistonOscillationFreeSelected: boolean;
}

export const createWorkbenchPistonAcquisitionProcessingActions = (ports: createWorkbenchPistonAcquisitionProcessingActionsPorts) => {
  const { desktopExitQuiescedRef, filesRef, scheduleHeatCapacitySemanticSceneCheckpointRef, scheduleWorkspacePersistenceRef, setFiles, activeFileIdRef, setPistonOscillationGuideStrongReminderActive, setPistonOscillationGuideStrongReminderClockContext, setPistonOscillationGuidePressureIssue, setPistonOscillationGuidePulseElapsedMs, showPistonOscillationGuideFeedback, pistonOscillationCopy, pistonOscillationGuidePressureMissCountRef, pistonOscillationGuidePressureRangeLessonTimerRef, pistonOscillationGuidePressureIssueRef, openPistonOscillationGuideOneTimeLesson, pistonOscillationGuideStrongReminderTimerRef, pistonOscillationGuideStrongTargetContextRef, clearPistonOscillationGuideFeedback, applyPistonOscillationGuideEvents, updateFileById, pistonOscillationLivePressureChannel, setPistonOscillationMeasurementCyclesByFileId, setPistonOscillationGuideLessonOutgoingView, setPistonOscillationGuideLessonDialog, updateActiveFile, setPistonOscillationCalculationReviewOpen, setPistonOscillationDataProcessingReviewOpen, setSelectedPanel, setLeftCollapsed, flushWorkspacePersistenceRef, activePistonOscillationCalculationSession, activeFile, setPistonOscillationProcessReviewOpen, setPistonOscillationCalculationSuppressedFileId, setPistonOscillationProcessingSuppressedFileId, activePistonOscillationFreeSelected } = ports;
  const commitPistonOscillationGuideAcquisitionSession = (
    liveFile: Extract<WorkbenchFileState, { kind: 'heatCapacityPistonOscillation' }>,
    nextSession: PistonOscillationGuideSession,
    nowMs: number,
  ): boolean => {
    if (desktopExitQuiescedRef.current) return false;
    const currentFiles = filesRef.current;
    const fileIndex = currentFiles.findIndex((file) => file.id === liveFile.id);
    if (fileIndex < 0 || currentFiles[fileIndex] !== liveFile) return false;
    const nextFile = {
      ...liveFile,
      updatedAt: nowMs,
      pistonOscillationGuideSession: nextSession,
    };
    const nextFiles = [...currentFiles];
    nextFiles[fileIndex] = nextFile;
    scheduleHeatCapacitySemanticSceneCheckpointRef.current();
    scheduleWorkspacePersistenceRef.current('semantic');
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    return true;
  };

  const handlePistonOscillationGuideAcquisitionEvent = (
    event: PistonOscillationGuideAcquisitionEvent,
  ): boolean => {
    const nowMs = Date.now();
    if (event.type === 'pressureAttemptRejected') {
      const liveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
      const rejectionStep = liveFile?.kind === 'heatCapacityPistonOscillation'
        ? liveFile.pistonOscillationGuideSession.step
        : null;
      const rejectionMatchesStep = event.reason === 'underpressure'
        ? rejectionStep === 'waitingTrigger'
        : rejectionStep === 'recording' || rejectionStep === 'pauseAvailable';
      if (
        !liveFile
        || liveFile.kind !== 'heatCapacityPistonOscillation'
        || liveFile.pistonOscillationGuideSession.status !== 'active'
        || !rejectionMatchesStep
      ) return false;
      setPistonOscillationGuideStrongReminderActive(false);
      setPistonOscillationGuideStrongReminderClockContext(null);
      setPistonOscillationGuidePressureIssue(event.reason);
      setPistonOscillationGuidePulseElapsedMs(0);
      showPistonOscillationGuideFeedback(
        event.reason === 'underpressure'
          ? pistonOscillationCopy.guide.pressureTooLowFeedback
          : pistonOscillationCopy.guide.pressureTooHighFeedback,
        'warning',
        'guide',
        { durationMs: PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS },
      );
      const nextMissCount = pistonOscillationGuidePressureMissCountRef.current[event.reason] + 1;
      pistonOscillationGuidePressureMissCountRef.current[event.reason] = nextMissCount;
      if (
        event.reason === 'underpressure'
        && nextMissCount === 1
      ) {
        const expectedFileId = liveFile.id;
        const expectedSessionStartMs = liveFile.pistonOscillationGuideSession.startedAtMs;
        const expectedMeasurementIndex = liveFile.pistonOscillationGuideSession.measurementIndex;
        if (pistonOscillationGuidePressureRangeLessonTimerRef.current !== null) {
          window.clearTimeout(pistonOscillationGuidePressureRangeLessonTimerRef.current);
        }
        pistonOscillationGuidePressureRangeLessonTimerRef.current = window.setTimeout(() => {
          pistonOscillationGuidePressureRangeLessonTimerRef.current = null;
          const currentFile = filesRef.current.find((file) => file.id === expectedFileId);
          if (
            currentFile?.kind === 'heatCapacityPistonOscillation'
            && currentFile.pistonOscillationGuideSession.status === 'active'
            && currentFile.pistonOscillationGuideSession.startedAtMs === expectedSessionStartMs
            && currentFile.pistonOscillationGuideSession.measurementIndex === expectedMeasurementIndex
            && currentFile.pistonOscillationGuideSession.step === 'waitingTrigger'
            && pistonOscillationGuidePressureIssueRef.current === 'underpressure'
          ) {
            openPistonOscillationGuideOneTimeLesson('pressureRange');
          }
        }, PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS);
      }
      if (pistonOscillationGuideStrongReminderTimerRef.current !== null) {
        window.clearTimeout(pistonOscillationGuideStrongReminderTimerRef.current);
        pistonOscillationGuideStrongReminderTimerRef.current = null;
      }
      if (nextMissCount >= 2) {
        const expectedFileId = liveFile.id;
        const expectedSessionStartMs = liveFile.pistonOscillationGuideSession.startedAtMs;
        const expectedMeasurementIndex = liveFile.pistonOscillationGuideSession.measurementIndex;
        const expectedStep = liveFile.pistonOscillationGuideSession.step;
        pistonOscillationGuideStrongReminderTimerRef.current = window.setTimeout(() => {
          pistonOscillationGuideStrongReminderTimerRef.current = null;
          const currentFile = filesRef.current.find((file) => file.id === expectedFileId);
          if (
            currentFile?.kind === 'heatCapacityPistonOscillation'
            && currentFile.pistonOscillationGuideSession.status === 'active'
            && currentFile.pistonOscillationGuideSession.startedAtMs === expectedSessionStartMs
            && currentFile.pistonOscillationGuideSession.measurementIndex === expectedMeasurementIndex
            && currentFile.pistonOscillationGuideSession.step === expectedStep
            && pistonOscillationGuidePressureIssueRef.current === event.reason
          ) {
            setPistonOscillationGuideStrongReminderActive(
              true,
              pistonOscillationGuideStrongTargetContextRef.current,
            );
          }
        }, PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS);
      }
      return true;
    }
    if (event.type === 'pressureAttemptAccepted') {
      const liveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
      if (
        !liveFile
        || liveFile.kind !== 'heatCapacityPistonOscillation'
        || liveFile.pistonOscillationGuideSession.status !== 'active'
        || liveFile.pistonOscillationGuideSession.step !== 'waitingTrigger'
      ) return false;
      setPistonOscillationGuidePressureIssue(null);
      pistonOscillationGuidePressureMissCountRef.current = {
        underpressure: 0,
        overpressure: 0,
      };
      clearPistonOscillationGuideFeedback();
      setPistonOscillationGuideStrongReminderActive(false);
      setPistonOscillationGuidePulseElapsedMs(0);
      if (pistonOscillationGuideStrongReminderTimerRef.current !== null) {
        window.clearTimeout(pistonOscillationGuideStrongReminderTimerRef.current);
        pistonOscillationGuideStrongReminderTimerRef.current = null;
      }
      if (pistonOscillationGuidePressureRangeLessonTimerRef.current !== null) {
        window.clearTimeout(pistonOscillationGuidePressureRangeLessonTimerRef.current);
        pistonOscillationGuidePressureRangeLessonTimerRef.current = null;
      }
      return true;
    }
    const liveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!liveFile || liveFile.kind !== 'heatCapacityPistonOscillation') return false;
    const nextSession = transitionPistonOscillationGuideAcquisitionSession(
      liveFile.pistonOscillationGuideSession,
      event,
      nowMs,
    );
    if (
      nextSession === null
      || !commitPistonOscillationGuideAcquisitionSession(liveFile, nextSession, nowMs)
    ) return false;

    if (
      event.type === 'redoOverpressureAttempt'
      || event.type === 'restoreInterruptedAcquisition'
    ) {
      setPistonOscillationGuidePressureIssue(null);
      clearPistonOscillationGuideFeedback();
      setPistonOscillationGuideStrongReminderActive(false);
      setPistonOscillationGuidePulseElapsedMs(0);
      if (pistonOscillationGuideStrongReminderTimerRef.current !== null) {
        window.clearTimeout(pistonOscillationGuideStrongReminderTimerRef.current);
        pistonOscillationGuideStrongReminderTimerRef.current = null;
      }
    }
    if (event.type === 'redoOverpressureAttempt') {
      window.setTimeout(() => {
        openPistonOscillationGuideOneTimeLesson('pressureRange');
      }, 0);
    }
    return true;
  };

  const handlePistonOscillationProcessingEvent = (
    event: PistonOscillationGuideEvent | PistonOscillationFreeEvent,
  ) => {
    const liveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!liveFile) return;
    const freeProcessingActive = liveFile.kind === 'heatCapacityPistonOscillation'
      && liveFile.pistonOscillationFreeSession.status === 'active'
      && liveFile.pistonOscillationFreeSession.dataProcessing !== null
      && liveFile.pistonOscillationFreeSession.reacquisition === null;
    const nextFile = freeProcessingActive
      ? transitionPistonOscillationFreeWorkbenchState(
          liveFile,
          event as PistonOscillationFreeEvent,
        )
      : applyPistonOscillationGuideEvents(liveFile, [event as PistonOscillationGuideEvent]);
    updateFileById(liveFile.id, () => nextFile);
    if (
      !freeProcessingActive
      &&
      event.type === 'selectPeriodRange'
      && nextFile.kind === 'heatCapacityPistonOscillation'
    ) {
      const selection = nextFile.pistonOscillationGuideSession
        .dataProcessing?.runs[event.runIndex]?.selection;
      const minimumPeriodCount = nextFile.pistonOscillationGuideSession
        .dataProcessing?.processingPolicy.guidedMinimumPeriodCount;
      if (
        selection?.issue === null
        && minimumPeriodCount !== undefined
        && selection.periodCount >= minimumPeriodCount
      ) {
        window.setTimeout(() => {
          openPistonOscillationGuideOneTimeLesson('multiPeriod');
        }, 0);
      }
    }
  };

  const handlePistonOscillationFreeUnusableMeasurement = (runIndex: number) => {
    const fileId = activeFileIdRef.current;
    const liveFile = filesRef.current.find((file) => file.id === fileId);
    if (
      !liveFile
      || liveFile.kind !== 'heatCapacityPistonOscillation'
      || liveFile.pistonOscillationFreeSession.status !== 'active'
      || liveFile.pistonOscillationFreeSession.reacquisition !== null
    ) return;
    const nextFile = transitionPistonOscillationFreeWorkbenchState(liveFile, {
      type: 'requestUnusableMeasurementRedo',
      runIndex,
      nowMs: Date.now(),
    });
    if (nextFile.pistonOscillationFreeSession.reacquisition === null) return;
    updateFileById(fileId, () => nextFile);
    pistonOscillationLivePressureChannel.clear();
    setPistonOscillationMeasurementCyclesByFileId((current) => ({
      ...current,
      [fileId]: (current[fileId] ?? 0) + 1,
    }));
    setPistonOscillationGuideLessonOutgoingView(null);
    setPistonOscillationGuideLessonDialog({
      kind: 'freeReacquisition',
      fileId,
      closing: false,
    });
  };

  const completeAndExitPistonOscillationCalculation = () => {
    const liveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const completingFreeSession = Boolean(
      liveFile?.kind === 'heatCapacityPistonOscillation'
      && liveFile.pistonOscillationFreeSession.status === 'active'
      && liveFile.pistonOscillationFreeSession.dataProcessing !== null,
    );
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacityPistonOscillation') return file;
      const event = { type: 'completeCalculation' as const, nowMs: Date.now() };
      return file.pistonOscillationFreeSession.status === 'active'
        && file.pistonOscillationFreeSession.dataProcessing !== null
        ? transitionPistonOscillationFreeWorkbenchState(file, event)
        : applyPistonOscillationGuideEvents(file, [event]);
    });
    setPistonOscillationCalculationReviewOpen(false);
    if (completingFreeSession) {
      setPistonOscillationDataProcessingReviewOpen(false);
      setSelectedPanel('preview');
      setLeftCollapsed(false);
    }
    window.setTimeout(() => {
      void flushWorkspacePersistenceRef.current();
    }, 0);
  };

  const closePistonOscillationCalculationReview = () => {
    const calculationStatus = activePistonOscillationCalculationSession?.status ?? null;
    if (calculationStatus !== 'completed') return;
    setPistonOscillationCalculationReviewOpen(false);
  };

  const openPistonOscillationDataProcessingReview = () => {
    if (activeFile.kind !== 'heatCapacityPistonOscillation') return;
    const dataProcessing = activeFile.pistonOscillationFreeSession.status === 'active'
      ? activeFile.pistonOscillationFreeSession.dataProcessing
      : activeFile.pistonOscillationGuideSession.dataProcessing;
    if (!dataProcessing) return;
    setSelectedPanel('heatCapacityGuide');
    setPistonOscillationProcessReviewOpen(false);
    setPistonOscillationCalculationReviewOpen(false);
    setPistonOscillationCalculationSuppressedFileId(activeFile.id);
    setPistonOscillationProcessingSuppressedFileId(null);
    setPistonOscillationDataProcessingReviewOpen(true);
  };

  const openPistonOscillationCalculationReview = () => {
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation'
      || !activePistonOscillationCalculationSession
    ) return;
    setSelectedPanel('heatCapacityGuide');
    setPistonOscillationProcessReviewOpen(false);
    setPistonOscillationDataProcessingReviewOpen(true);
    setPistonOscillationProcessingSuppressedFileId(null);
    setPistonOscillationCalculationSuppressedFileId(null);
    setPistonOscillationCalculationReviewOpen(true);
  };

  const closePistonOscillationDataProcessingReview = () => {
    setPistonOscillationCalculationReviewOpen(false);
    setPistonOscillationDataProcessingReviewOpen(false);
    setSelectedPanel('preview');
    setLeftCollapsed(false);
  };

  const openPistonOscillationProcessReview = () => {
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation'
      || !activePistonOscillationFreeSelected
      || activeFile.pistonOscillationFreeSession.status !== 'active'
      || activeFile.pistonOscillationFreeSession.dataProcessing?.status !== 'completed'
    ) return;
    setSelectedPanel('heatCapacityReview');
    setPistonOscillationDataProcessingReviewOpen(false);
    setPistonOscillationCalculationReviewOpen(false);
    setPistonOscillationProcessReviewOpen(true);
  };

  const closePistonOscillationProcessReview = () => {
    setPistonOscillationProcessReviewOpen(false);
    setSelectedPanel('preview');
    setLeftCollapsed(false);
  };

  const returnToPistonOscillationInstrumentAfterDisplayError = () => {
    setPistonOscillationProcessingSuppressedFileId(activeFile.id);
    setPistonOscillationCalculationSuppressedFileId(activeFile.id);
    setPistonOscillationCalculationReviewOpen(false);
    setPistonOscillationDataProcessingReviewOpen(false);
    setPistonOscillationProcessReviewOpen(false);
    setSelectedPanel('preview');
    setLeftCollapsed(false);
  };

  const handlePistonOscillationGuideProcessingInteractionStart = () => {
    clearPistonOscillationGuideFeedback();
    setPistonOscillationGuideStrongReminderActive(false);
    setPistonOscillationGuidePulseElapsedMs(0);
  };

  const handlePistonOscillationGuideInvalidPeriodSelection = () => {
    const targetContext = pistonOscillationGuideStrongTargetContextRef.current;
    if (!targetContext) return;
    setPistonOscillationGuideStrongReminderActive(true, targetContext);
  };
  return { commitPistonOscillationGuideAcquisitionSession, handlePistonOscillationGuideAcquisitionEvent, handlePistonOscillationProcessingEvent, handlePistonOscillationFreeUnusableMeasurement, completeAndExitPistonOscillationCalculation, closePistonOscillationCalculationReview, openPistonOscillationDataProcessingReview, openPistonOscillationCalculationReview, closePistonOscillationDataProcessingReview, openPistonOscillationProcessReview, closePistonOscillationProcessReview, returnToPistonOscillationInstrumentAfterDisplayError, handlePistonOscillationGuideProcessingInteractionStart, handlePistonOscillationGuideInvalidPeriodSelection };
};
