import type { PistonOscillationGuideLessonDialogState, PistonOscillationGuideLessonView } from './workbenchPistonGuidePresentation.ts';
import React, { useEffect, useLayoutEffect } from 'react';

import { PISTON_OSCILLATION_DEMO_DURATION_MS } from "../pistonOscillation/pistonOscillationDemoTimeline.ts";

import { pausePistonOscillationDemoSession, resolvePistonOscillationDemoSession, resumePistonOscillationDemoSession } from '../../domain/pistonOscillation/pistonOscillationDemoSessionModel.ts';
import { HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS } from './workbenchTeachingUiTiming.ts';

export interface useWorkbenchPistonLessonsPorts {
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  setPistonOscillationGuideLessonDialog: React.Dispatch<React.SetStateAction<import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuideLessonDialogState | null>>;
  setPistonOscillationGuideLessonOutgoingView: React.Dispatch<React.SetStateAction<import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuideLessonView | null>>;
  updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  pistonOscillationGuideLessonDialog: import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuideLessonDialogState | null;
  pistonOscillationGuideLessonTransitionTimerRef: React.MutableRefObject<number | null>;
  pistonOscillationGuideLessonCloseTimerRef: React.MutableRefObject<number | null>;
  pistonOscillationDemoResumeAfterLessonRef: React.MutableRefObject<boolean>;
  filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
  pistonOscillationDemoPlaybackChannel: import("../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts").PistonOscillationDemoPlaybackChannel;
  setPistonOscillationDemoPlayback: React.Dispatch<React.SetStateAction<{ fileId: string | null; phase: "idle" | "completed" | "running" | "paused" | "terminated"; elapsedMs: number; }>>;
  flushWorkspacePersistenceRef: React.MutableRefObject<() => Promise<boolean>>;
  applyPistonOscillationGuideEvents: (file: import("./workbenchFileUnion.ts").WorkbenchFileState, events: readonly import("../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts").PistonOscillationGuideEvent[]) => import("./workbenchFileUnion.ts").WorkbenchFileState;
  pistonOscillationGuideResumeStrongReminderAfterLessonRef: React.MutableRefObject<boolean>;
  setPistonOscillationGuideStrongReminderActive: (active: boolean, expectedContext?: string | null | undefined) => void;
  pistonOscillationGuideStrongTargetContextRef: React.MutableRefObject<string | null>;
  activeFileIdRef: React.MutableRefObject<string>;
  setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  showPistonOscillationGuideCompletionToast: (fileId: string, kicker: string, message: string) => void;
  pistonOscillationCopy: import("../pistonOscillation/pistonOscillationCopy.ts").PistonOscillationShellCopy;
  pistonOscillationGuideLessonShownRef: React.MutableRefObject<Set<string>>;
  clearPistonOscillationGuideFeedback: () => void;
  setPistonOscillationGuidePulseElapsedMs: React.Dispatch<React.SetStateAction<number>>;
  activePistonOscillationGuideSession: import("../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts").PistonOscillationGuideSession | null;
  pistonOscillationGuideLessonDialogRef: React.MutableRefObject<HTMLElement | null>;
  pistonOscillationGuideLessonReturnFocusRef: React.MutableRefObject<HTMLElement | null>;
  pistonOscillationGuidePreviousSessionRef: React.MutableRefObject<{ fileId: string; status: "idle" | "active" | "completed"; step: import("../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts").PistonOscillationGuideStep; } | null>;
}

export const useWorkbenchPistonLessons = (ports: useWorkbenchPistonLessonsPorts) => {
  const { activeFile, setPistonOscillationGuideLessonDialog, setPistonOscillationGuideLessonOutgoingView, updateFileById, pistonOscillationGuideLessonDialog, pistonOscillationGuideLessonTransitionTimerRef, pistonOscillationGuideLessonCloseTimerRef, pistonOscillationDemoResumeAfterLessonRef, filesRef, pistonOscillationDemoPlaybackChannel, setPistonOscillationDemoPlayback, flushWorkspacePersistenceRef, applyPistonOscillationGuideEvents, pistonOscillationGuideResumeStrongReminderAfterLessonRef, setPistonOscillationGuideStrongReminderActive, pistonOscillationGuideStrongTargetContextRef, activeFileIdRef, setLeftCollapsed, showPistonOscillationGuideCompletionToast, pistonOscillationCopy, pistonOscillationGuideLessonShownRef, clearPistonOscillationGuideFeedback, setPistonOscillationGuidePulseElapsedMs, activePistonOscillationGuideSession, pistonOscillationGuideLessonDialogRef, pistonOscillationGuideLessonReturnFocusRef, pistonOscillationGuidePreviousSessionRef } = ports;
  useEffect(() => {
    if (activeFile.kind !== 'heatCapacityPistonOscillation') {
      setPistonOscillationGuideLessonDialog(null);
      setPistonOscillationGuideLessonOutgoingView(null);
      return;
    }
    setPistonOscillationGuideLessonOutgoingView(null);
    const session = activeFile.pistonOscillationGuideSession;
    if (session.heightReset?.phase === 'explaining') {
      setPistonOscillationGuideLessonDialog((current) => (
        current?.kind === 'heightReset' && current.fileId === activeFile.id
          ? current
          : { kind: 'heightReset', fileId: activeFile.id, closing: false }
      ));
      return;
    }
    setPistonOscillationGuideLessonDialog((current) => (
      current?.kind === 'heightReset' ? null : current
    ));
    if (!activeFile.pistonOscillationLessonIntroAutoShown) {
      setPistonOscillationGuideLessonOutgoingView(null);
      setPistonOscillationGuideLessonDialog({
        kind: 'intro',
        fileId: activeFile.id,
        pageIndex: 0,
        closing: false,
      });
      updateFileById(activeFile.id, (file) => (
        file.kind === 'heatCapacityPistonOscillation'
          ? {
              ...file,
              pistonOscillationLessonIntroAutoShown: true,
              updatedAt: Date.now(),
            }
          : file
      ));
      return;
    }
    setPistonOscillationGuideLessonDialog((current) => (
      current && current.fileId !== activeFile.id ? null : current
    ));
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationLessonIntroAutoShown
      : null,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationGuideSession.heightReset?.phase
      : null,
  ]);

  const closePistonOscillationGuideLessonDialog = () => {
    if (!pistonOscillationGuideLessonDialog || pistonOscillationGuideLessonDialog.closing) return;
    const closingKind = pistonOscillationGuideLessonDialog.kind;
    const closingFileId = pistonOscillationGuideLessonDialog.fileId;
    setPistonOscillationGuideLessonDialog((current) => (
      current ? { ...current, closing: true } : current
    ));
    if (pistonOscillationGuideLessonTransitionTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideLessonTransitionTimerRef.current);
      pistonOscillationGuideLessonTransitionTimerRef.current = null;
    }
    setPistonOscillationGuideLessonOutgoingView(null);
    if (pistonOscillationGuideLessonCloseTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideLessonCloseTimerRef.current);
    }
    pistonOscillationGuideLessonCloseTimerRef.current = window.setTimeout(() => {
      pistonOscillationGuideLessonCloseTimerRef.current = null;
      setPistonOscillationGuideLessonDialog(null);
      if (closingKind === 'intro' && pistonOscillationDemoResumeAfterLessonRef.current) {
        pistonOscillationDemoResumeAfterLessonRef.current = false;
        const liveFile = filesRef.current.find((file) => file.id === closingFileId);
        if (
          liveFile?.kind === 'heatCapacityPistonOscillation'
          && liveFile.pistonOscillationDemoSession.status === 'paused'
        ) {
          const nowMs = Date.now();
          const resumedSession = resumePistonOscillationDemoSession(
            liveFile.pistonOscillationDemoSession,
            nowMs,
          );
          updateFileById(closingFileId, (file) => (
            file.kind === 'heatCapacityPistonOscillation'
              ? {
                  ...file,
                  pistonOscillationDemoSession: resumedSession,
                  updatedAt: nowMs,
                }
              : file
          ));
          const snapshot = {
            fileId: closingFileId,
            phase: resumedSession.status,
            elapsedMs: resumedSession.elapsedMs,
          } as const;
          pistonOscillationDemoPlaybackChannel.publish(snapshot);
          setPistonOscillationDemoPlayback(snapshot);
          window.setTimeout(() => {
            void flushWorkspacePersistenceRef.current();
          }, 0);
        }
      }
      if (closingKind === 'heightReset') {
        updateFileById(closingFileId, (file) => applyPistonOscillationGuideEvents(file, [{
          type: 'dismissHeightReset',
          nowMs: Date.now(),
        }]));
        if (pistonOscillationGuideResumeStrongReminderAfterLessonRef.current) {
          pistonOscillationGuideResumeStrongReminderAfterLessonRef.current = false;
          setPistonOscillationGuideStrongReminderActive(
            true,
            pistonOscillationGuideStrongTargetContextRef.current,
          );
        }
      } else if (closingKind === 'completion') {
        const liveFile = filesRef.current.find((file) => file.id === closingFileId);
        if (
          liveFile?.kind === 'heatCapacityPistonOscillation'
          && liveFile.pistonOscillationGuideSession.status === 'active'
          && liveFile.pistonOscillationGuideSession.step === 'completionReview'
          && liveFile.pistonOscillationGuideSession.dataProcessing?.status === 'completed'
        ) {
          updateFileById(closingFileId, (file) => applyPistonOscillationGuideEvents(file, [{
            type: 'acknowledgeCompletion',
            nowMs: Date.now(),
          }]));
          if (activeFileIdRef.current === closingFileId) {
            setLeftCollapsed(false);
          }
          showPistonOscillationGuideCompletionToast(
            closingFileId,
            pistonOscillationCopy.guide.completionToastKicker,
            pistonOscillationCopy.guide.completionToast,
          );
          window.setTimeout(() => {
            void flushWorkspacePersistenceRef.current();
          }, 0);
        }
      }
    }, HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS);
  };

  const openPistonOscillationGuideLessonIntro = () => {
    const liveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!liveFile || liveFile.kind !== 'heatCapacityPistonOscillation') return;
    if (pistonOscillationGuideLessonDialog?.kind === 'heightReset') return;
    if (pistonOscillationGuideLessonCloseTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideLessonCloseTimerRef.current);
      pistonOscillationGuideLessonCloseTimerRef.current = null;
    }
    if (pistonOscillationGuideLessonTransitionTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideLessonTransitionTimerRef.current);
      pistonOscillationGuideLessonTransitionTimerRef.current = null;
    }
    setPistonOscillationGuideLessonOutgoingView(null);
    const nowMs = Date.now();
    const resolvedDemoSession = resolvePistonOscillationDemoSession(
      liveFile.pistonOscillationDemoSession,
      PISTON_OSCILLATION_DEMO_DURATION_MS,
      nowMs,
    );
    pistonOscillationDemoResumeAfterLessonRef.current =
      resolvedDemoSession.status === 'running';
    if (resolvedDemoSession.status === 'running') {
      const pausedSession = pausePistonOscillationDemoSession(
        resolvedDemoSession,
        PISTON_OSCILLATION_DEMO_DURATION_MS,
        nowMs,
      );
      updateFileById(liveFile.id, (file) => (
        file.kind === 'heatCapacityPistonOscillation'
          ? {
              ...file,
              pistonOscillationDemoSession: pausedSession,
              updatedAt: nowMs,
            }
          : file
      ));
      const snapshot = {
        fileId: liveFile.id,
        phase: pausedSession.status,
        elapsedMs: pausedSession.elapsedMs,
      } as const;
      pistonOscillationDemoPlaybackChannel.publish(snapshot);
      setPistonOscillationDemoPlayback(snapshot);
      window.setTimeout(() => {
        void flushWorkspacePersistenceRef.current();
      }, 0);
    }
    setPistonOscillationGuideLessonDialog({
      kind: 'intro',
      fileId: liveFile.id,
      pageIndex: 0,
      closing: false,
    });
  };

  const openPistonOscillationGuideOneTimeLesson = (
    kind: Extract<
      PistonOscillationGuideLessonDialogState['kind'],
      'pressureRange' | 'lockingScrew' | 'multiPeriod'
    >,
  ) => {
    const liveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (
      !liveFile
      || liveFile.kind !== 'heatCapacityPistonOscillation'
      || liveFile.pistonOscillationGuideSession.status !== 'active'
      || pistonOscillationGuideLessonDialog !== null
    ) return;
    const lessonKey = [
      liveFile.id,
      liveFile.pistonOscillationGuideSession.startedAtMs,
      kind,
    ].join(':');
    if (pistonOscillationGuideLessonShownRef.current.has(lessonKey)) return;
    pistonOscillationGuideLessonShownRef.current.add(lessonKey);
    clearPistonOscillationGuideFeedback();
    setPistonOscillationGuideStrongReminderActive(false);
    setPistonOscillationGuidePulseElapsedMs(0);
    setPistonOscillationGuideLessonOutgoingView(null);
    setPistonOscillationGuideLessonDialog({
      kind,
      fileId: liveFile.id,
      closing: false,
    });
  };

  const getPistonOscillationGuideLessonView = (
    dialog: PistonOscillationGuideLessonDialogState,
  ): PistonOscillationGuideLessonView | null => {
    if (dialog.kind === 'intro') {
      const pageIndex = Math.max(
        0,
        Math.min(pistonOscillationCopy.lesson.pages.length - 1, dialog.pageIndex),
      );
      const page = pistonOscillationCopy.lesson.pages[pageIndex];
      return {
        key: `intro-${pageIndex}`,
        title: page.title,
        body: page.body,
      };
    }
    if (dialog.kind === 'completion') {
      return {
        key: 'guide-completion',
        title: pistonOscillationCopy.guide.completedTitle,
        body: pistonOscillationCopy.guide.completedDetail,
      };
    }
    if (dialog.kind === 'pressureRange') {
      return {
        key: 'guide-pressure-range',
        title: pistonOscillationCopy.guide.pressureRangeLessonTitle,
        body: pistonOscillationCopy.guide.pressureRangeLessonBody,
      };
    }
    if (dialog.kind === 'lockingScrew') {
      return {
        key: 'guide-locking-screw',
        title: pistonOscillationCopy.guide.lockingScrewLessonTitle,
        body: pistonOscillationCopy.guide.lockingScrewLessonBody,
      };
    }
    if (dialog.kind === 'multiPeriod') {
      return {
        key: 'guide-multi-period',
        title: pistonOscillationCopy.guide.multiPeriodLessonTitle,
        body: pistonOscillationCopy.guide.multiPeriodLessonBody,
      };
    }
    if (dialog.kind === 'freeReacquisition') {
      return {
        key: 'free-reacquisition',
        title: pistonOscillationCopy.processing.insufficientRecordTitle,
        body: pistonOscillationCopy.processing.insufficientRecordBody,
      };
    }
    const heightReset = activePistonOscillationGuideSession?.heightReset;
    if (!heightReset) return null;
    return heightReset.reason === 'wrongHeightConfirmation'
      ? {
          key: `height-reset-wrong-${heightReset.targetHeightMm}`,
          title: pistonOscillationCopy.recovery.wrongHeightTitle,
          body: pistonOscillationCopy.recovery.wrongHeightBody(heightReset.targetHeightMm),
        }
      : {
          key: `height-reset-support-${heightReset.targetHeightMm}`,
          title: pistonOscillationCopy.recovery.supportLostTitle,
          body: pistonOscillationCopy.recovery.supportLostBody(heightReset.targetHeightMm),
        };
  };

  const advancePistonOscillationGuideLessonDialog = () => {
    if (!pistonOscillationGuideLessonDialog) return;
    if (pistonOscillationGuideLessonDialog.kind === 'intro') {
      const pageIndex = pistonOscillationGuideLessonDialog.pageIndex;
      if (pageIndex < pistonOscillationCopy.lesson.pages.length - 1) {
        const outgoingView = getPistonOscillationGuideLessonView(
          pistonOscillationGuideLessonDialog,
        );
        setPistonOscillationGuideLessonOutgoingView(outgoingView);
        setPistonOscillationGuideLessonDialog({
          ...pistonOscillationGuideLessonDialog,
          pageIndex: pageIndex + 1,
        });
        if (pistonOscillationGuideLessonTransitionTimerRef.current !== null) {
          window.clearTimeout(pistonOscillationGuideLessonTransitionTimerRef.current);
        }
        pistonOscillationGuideLessonTransitionTimerRef.current = window.setTimeout(() => {
          pistonOscillationGuideLessonTransitionTimerRef.current = null;
          setPistonOscillationGuideLessonOutgoingView(null);
        }, HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS);
        return;
      }
      closePistonOscillationGuideLessonDialog();
      return;
    }
    closePistonOscillationGuideLessonDialog();
  };

  const handlePistonOscillationGuideLessonDialogKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
  ) => {
    if (event.key === 'Tab') {
      const dialog = pistonOscillationGuideLessonDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (
        event.shiftKey
          ? activeElement === first || !dialog.contains(activeElement)
          : activeElement === last || !dialog.contains(activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      closePistonOscillationGuideLessonDialog();
      return;
    }
    if (event.target instanceof HTMLElement && event.target.closest('button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      advancePistonOscillationGuideLessonDialog();
    }
  };

  useEffect(() => {
    if (!pistonOscillationGuideLessonDialog) {
      const returnTarget = pistonOscillationGuideLessonReturnFocusRef.current;
      pistonOscillationGuideLessonReturnFocusRef.current = null;
      if (returnTarget?.isConnected) {
        window.requestAnimationFrame(() => returnTarget.focus());
      }
      return undefined;
    }
    if (
      pistonOscillationGuideLessonReturnFocusRef.current === null
      && document.activeElement instanceof HTMLElement
      && !pistonOscillationGuideLessonDialogRef.current?.contains(document.activeElement)
    ) {
      pistonOscillationGuideLessonReturnFocusRef.current = document.activeElement;
    }
    const frame = window.requestAnimationFrame(() => {
      pistonOscillationGuideLessonDialogRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    pistonOscillationGuideLessonDialog?.kind,
    pistonOscillationGuideLessonDialog?.kind === 'intro'
      ? pistonOscillationGuideLessonDialog.pageIndex
      : null,
  ]);

  useLayoutEffect(() => {
    const currentSession = activeFile.kind === 'heatCapacityPistonOscillation'
      ? {
          fileId: activeFile.id,
          status: activeFile.pistonOscillationGuideSession.status,
          step: activeFile.pistonOscillationGuideSession.step,
        }
      : null;
    const previousSession = pistonOscillationGuidePreviousSessionRef.current;
    pistonOscillationGuidePreviousSessionRef.current = currentSession;

    const completionReviewEntered = currentSession?.status === 'active'
      && currentSession.step === 'completionReview'
      && (
        previousSession?.fileId !== currentSession.fileId
        || previousSession.step !== 'completionReview'
      );
    if (completionReviewEntered) {
      clearPistonOscillationGuideFeedback();
      setPistonOscillationGuideLessonOutgoingView(null);
      setPistonOscillationGuideLessonDialog({
        kind: 'completion',
        fileId: currentSession.fileId,
        closing: false,
      });
      return;
    }
    setPistonOscillationGuideLessonDialog((current) => (
      current?.kind === 'completion'
      && (
        currentSession?.fileId !== current.fileId
        || currentSession.status !== 'active'
        || currentSession.step !== 'completionReview'
      )
        ? null
        : current
    ));
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? `${activeFile.pistonOscillationGuideSession.status}:${activeFile.pistonOscillationGuideSession.step}`
      : null,
  ]);
  return { closePistonOscillationGuideLessonDialog, openPistonOscillationGuideLessonIntro, openPistonOscillationGuideOneTimeLesson, getPistonOscillationGuideLessonView, advancePistonOscillationGuideLessonDialog, handlePistonOscillationGuideLessonDialogKeyDown };
};
