import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import { HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS } from './workbenchTeachingUiTiming.ts';
import { type HeatCapacityGuideLessonDialogState, type HeatCapacityGuideLessonView, HEAT_CAPACITY_GUIDE_LESSON_TRIGGER_BY_COMPLETED_STEP } from './workbenchHeatCapacityGuidePresentation.ts';
import React from 'react';




export interface useWorkbenchHeatLessonsPorts {
  lessonState: {
    heatCapacityLessonPausedFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityGuideLessonTransitionTimerRef: React.MutableRefObject<number | null>;
    heatCapacityGuideLessonCloseTimerRef: React.MutableRefObject<number | null>;
    heatCapacityGuideLessonCloseTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityGuideLessonCloseDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityGuideLessonCloseShouldResumeDemoRef: React.MutableRefObject<boolean>;
    heatCapacityGuideLessonClosePausedRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityLessonCloseTimerPlan | null>;
    setHeatCapacityGuideLessonDialog: React.Dispatch<React.SetStateAction<import("./workbenchHeatCapacityGuidePresentation.ts").HeatCapacityGuideLessonDialogState | null>>;
    setHeatCapacityGuideLessonClosing: React.Dispatch<React.SetStateAction<boolean>>;
    heatCapacityLessonDialogActiveRef: React.MutableRefObject<boolean>;
    heatCapacityGuideLessonShownRef: React.MutableRefObject<Set<string>>;
    heatCapacityGuideLessonStepRef: React.MutableRefObject<{ fileId: string | null; step: import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep; }>;
    heatCapacityLessonAutoResumeDemoRef: React.MutableRefObject<boolean>;
    setHeatCapacityGuideLessonOutgoingView: React.Dispatch<React.SetStateAction<import("./workbenchHeatCapacityGuidePresentation.ts").HeatCapacityGuideLessonView | null>>;
    heatCapacityGuideLessonDialog: import("./workbenchHeatCapacityGuidePresentation.ts").HeatCapacityGuideLessonDialogState | null;
  };
  workspace: {
    updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
    activeFileIdRef: React.MutableRefObject<string>;
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  };
  lifecycle: {
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
  };
  scene: {
    heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
    heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
  };
  demoRuntime: {
    runHeatCapacityAutoDemo: () => void;
    pauseHeatCapacityAutoDemo: () => void;
  };
  demoState: {
    autoDemoRunning: boolean;
  };
  guide: {
    clearGuideHeatCapacityStrongReminder: () => void;
  };
  feedback: {
    heatCapacityRealtimeCopy: import("./workbenchHeatCapacityRealtimeCopy.ts").HeatCapacityRealtimeCopy;
  };
  guideState: {
    guideHeatCapacityActiveFileId: string | null;
    activeHeatCapacityGuideFileId: string | null;
    activeHeatCapacityGuideStep: import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep;
  };
}

export const useWorkbenchHeatLessons = (ports: useWorkbenchHeatLessonsPorts) => {
  const { heatCapacityLessonPausedFileIdRef, heatCapacityGuideLessonTransitionTimerRef, heatCapacityGuideLessonCloseTimerRef, heatCapacityGuideLessonCloseTimerGenerationRef, heatCapacityGuideLessonCloseDeadlineAtMsRef, heatCapacityGuideLessonCloseShouldResumeDemoRef, heatCapacityGuideLessonClosePausedRef, setHeatCapacityGuideLessonDialog, setHeatCapacityGuideLessonClosing, heatCapacityLessonDialogActiveRef, heatCapacityGuideLessonShownRef, heatCapacityGuideLessonStepRef, heatCapacityLessonAutoResumeDemoRef, setHeatCapacityGuideLessonOutgoingView, heatCapacityGuideLessonDialog } = ports.lessonState;
  const { updateFileById, activeFileIdRef, filesRef, activeFile } = ports.workspace;
  const { desktopExitQuiescedRef } = ports.lifecycle;
  const { heatCapacityRefreshRestorePendingRef, heatCapacityRuntimeFailureFileIdRef } = ports.scene;
  const { runHeatCapacityAutoDemo, pauseHeatCapacityAutoDemo } = ports.demoRuntime;
  const { autoDemoRunning } = ports.demoState;
  const { clearGuideHeatCapacityStrongReminder } = ports.guide;
  const { heatCapacityRealtimeCopy } = ports.feedback;
  const { guideHeatCapacityActiveFileId, activeHeatCapacityGuideFileId, activeHeatCapacityGuideStep } = ports.guideState;
  const resetHeatCapacityLessonResumeClock = (fileId: string | null = heatCapacityLessonPausedFileIdRef.current) => {
    if (!fileId) return;
    const now = Date.now();
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return {
        ...file,
        heatCapacityGuideWorkflow: file.heatCapacityMode === 'guide'
          ? {
              ...file.heatCapacityGuideWorkflow,
              strongReminderActive: false,
              strongReminderTargetControlId: null,
            }
          : file.heatCapacityGuideWorkflow,
        lastUpdateMs: file.powerOn ? now : file.lastUpdateMs,
        displayResponseLastUpdateMs: file.powerOn ? now : file.displayResponseLastUpdateMs,
        updatedAt: now,
      };
    });
    heatCapacityLessonPausedFileIdRef.current = null;
  };

  const clearHeatCapacityGuideLessonTimers = () => {
    if (heatCapacityGuideLessonTransitionTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideLessonTransitionTimerRef.current);
      heatCapacityGuideLessonTransitionTimerRef.current = null;
    }
    if (heatCapacityGuideLessonCloseTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideLessonCloseTimerRef.current);
      heatCapacityGuideLessonCloseTimerRef.current = null;
    }
    heatCapacityGuideLessonCloseTimerGenerationRef.current += 1;
    heatCapacityGuideLessonCloseDeadlineAtMsRef.current = null;
    heatCapacityGuideLessonCloseShouldResumeDemoRef.current = false;
    heatCapacityGuideLessonClosePausedRef.current = null;
  };

  const scheduleHeatCapacityGuideLessonClose = (
    fileId: string,
    shouldResumeAutoDemo: boolean,
    delayMs: number,
  ) => {
    if (heatCapacityGuideLessonCloseTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideLessonCloseTimerRef.current);
    }
    const normalizedDelayMs = Math.max(0, delayMs);
    const timerGeneration = ++heatCapacityGuideLessonCloseTimerGenerationRef.current;
    heatCapacityGuideLessonClosePausedRef.current = null;
    heatCapacityGuideLessonCloseShouldResumeDemoRef.current = shouldResumeAutoDemo;
    heatCapacityGuideLessonCloseDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityGuideLessonCloseTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityGuideLessonCloseTimerGenerationRef.current) return;
      heatCapacityGuideLessonCloseTimerRef.current = null;
      heatCapacityGuideLessonCloseDeadlineAtMsRef.current = null;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRefreshRestorePendingRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null
      ) {
        heatCapacityGuideLessonClosePausedRef.current = {
          fileId,
          remainingMs: 0,
          shouldResumeAutoDemo,
        };
        return;
      }
      heatCapacityGuideLessonCloseShouldResumeDemoRef.current = false;
      resetHeatCapacityLessonResumeClock(fileId);
      setHeatCapacityGuideLessonDialog(null);
      setHeatCapacityGuideLessonClosing(false);
      heatCapacityLessonDialogActiveRef.current = false;
      if (shouldResumeAutoDemo) runHeatCapacityAutoDemo();
    }, normalizedDelayMs);
  };

  const clearHeatCapacityGuideLessonState = () => {
    resetHeatCapacityLessonResumeClock(heatCapacityLessonPausedFileIdRef.current);
    clearHeatCapacityGuideLessonTimers();
    heatCapacityGuideLessonShownRef.current.clear();
    heatCapacityGuideLessonStepRef.current = { fileId: null, step: 'idle' };
    heatCapacityLessonDialogActiveRef.current = false;
    heatCapacityLessonPausedFileIdRef.current = null;
    heatCapacityLessonAutoResumeDemoRef.current = false;
    setHeatCapacityGuideLessonDialog(null);
    setHeatCapacityGuideLessonOutgoingView(null);
    setHeatCapacityGuideLessonClosing(false);
  };

  const clearHeatCapacityGuideLessonRuntimeForFileExit = () => {
    clearHeatCapacityGuideLessonTimers();
    heatCapacityGuideLessonShownRef.current.clear();
    heatCapacityGuideLessonStepRef.current = { fileId: null, step: 'idle' };
    heatCapacityLessonDialogActiveRef.current = false;
    heatCapacityLessonPausedFileIdRef.current = null;
    heatCapacityLessonAutoResumeDemoRef.current = false;
    setHeatCapacityGuideLessonDialog(null);
    setHeatCapacityGuideLessonOutgoingView(null);
    setHeatCapacityGuideLessonClosing(false);
  };

  const openHeatCapacityLessonIntro = (fileId: string | null = activeFileIdRef.current) => {
    const targetFile = filesRef.current.find((file) => file.id === fileId);
    if (!targetFile || targetFile.kind !== 'heatCapacity') return;
    const shouldResumeAutoDemo = targetFile.id === activeFileIdRef.current && autoDemoRunning;
    heatCapacityLessonAutoResumeDemoRef.current = shouldResumeAutoDemo;
    if (shouldResumeAutoDemo) pauseHeatCapacityAutoDemo();
    heatCapacityLessonPausedFileIdRef.current = targetFile.id;
    clearHeatCapacityGuideLessonTimers();
    clearGuideHeatCapacityStrongReminder();
    heatCapacityLessonDialogActiveRef.current = true;
    setHeatCapacityGuideLessonOutgoingView(null);
    setHeatCapacityGuideLessonClosing(false);
    setHeatCapacityGuideLessonDialog({ kind: 'intro', pageIndex: 0 });
  };

  const closeHeatCapacityGuideLessonDialog = () => {
    if (!heatCapacityGuideLessonDialog) return;
    const pausedFileId = heatCapacityLessonPausedFileIdRef.current;
    const shouldResumeAutoDemo = heatCapacityLessonAutoResumeDemoRef.current;
    heatCapacityLessonAutoResumeDemoRef.current = false;
    clearHeatCapacityGuideLessonTimers();
    setHeatCapacityGuideLessonOutgoingView(null);
    setHeatCapacityGuideLessonClosing(true);
    scheduleHeatCapacityGuideLessonClose(
      pausedFileId ?? activeFileIdRef.current,
      shouldResumeAutoDemo,
      HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS,
    );
  };

  const lessonIntroEffect = { run: () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityLessonIntroAutoShown) return;
    openHeatCapacityLessonIntro(activeFile.id);
    updateFileById(activeFile.id, (file) => (
      file.kind === 'heatCapacity'
        ? {
            ...file,
            heatCapacityLessonIntroAutoShown: true,
            updatedAt: Date.now(),
          }
        : file
    ));
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityLessonIntroAutoShown : null,
  ] } satisfies WorkbenchHeatEffect;

  const getHeatCapacityGuideLessonView = (
    dialog: HeatCapacityGuideLessonDialogState,
  ): HeatCapacityGuideLessonView => {
    if (dialog.kind === 'intro') {
      const introPageCount = heatCapacityRealtimeCopy.guideLessonIntroPages.length;
      const pageIndex = Math.max(0, Math.min(introPageCount - 1, dialog.pageIndex));
      const introCopy = heatCapacityRealtimeCopy.guideLessonIntroPages[pageIndex];
      return {
        key: `intro-${pageIndex}`,
        title: introCopy.title,
        body: introCopy.body,
      };
    }
    const stepCopy = heatCapacityRealtimeCopy.guideLessonStepExplanations[dialog.lessonId];
    return {
      key: `step-${dialog.lessonId}`,
      title: stepCopy.title,
      body: stepCopy.body,
    };
  };

  const handleHeatCapacityGuideLessonDialogAdvance = () => {
    if (!heatCapacityGuideLessonDialog) return;
    if (heatCapacityGuideLessonDialog.kind === 'intro') {
      const pageIndex = heatCapacityGuideLessonDialog.pageIndex;
      const pageCount = heatCapacityRealtimeCopy.guideLessonIntroPages.length;
      if (pageIndex < pageCount - 1) {
        clearHeatCapacityGuideLessonTimers();
        setHeatCapacityGuideLessonClosing(false);
        setHeatCapacityGuideLessonOutgoingView(getHeatCapacityGuideLessonView(heatCapacityGuideLessonDialog));
        setHeatCapacityGuideLessonDialog({ kind: 'intro', pageIndex: pageIndex + 1 });
        heatCapacityGuideLessonTransitionTimerRef.current = window.setTimeout(() => {
          heatCapacityGuideLessonTransitionTimerRef.current = null;
          setHeatCapacityGuideLessonOutgoingView(null);
        }, HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS);
        return;
      }
      closeHeatCapacityGuideLessonDialog();
      return;
    }
    if (heatCapacityGuideLessonDialog.kind === 'step') {
      closeHeatCapacityGuideLessonDialog();
    }
  };

  const handleHeatCapacityGuideLessonDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeHeatCapacityGuideLessonDialog();
      return;
    }
    if (event.target instanceof HTMLElement && event.target.closest('button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handleHeatCapacityGuideLessonDialogAdvance();
    }
  };

  const handleHeatCapacityGuideLessonCloseButtonMouseDown = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
  };

  const handleHeatCapacityGuideLessonCloseButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    closeHeatCapacityGuideLessonDialog();
  };

  const lessonStepProjectionEffect = { run: () => {
    const activeGuideLessonFile = activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      guideHeatCapacityActiveFileId === activeFile.id;
    const previousGuideLessonStep = heatCapacityGuideLessonStepRef.current;

    if (!activeGuideLessonFile) {
      heatCapacityGuideLessonStepRef.current = {
        fileId: activeHeatCapacityGuideFileId,
        step: activeHeatCapacityGuideStep,
      };
      if (heatCapacityGuideLessonDialog?.kind === 'step') {
        clearHeatCapacityGuideLessonState();
      }
      return;
    }

    const previousGuideStep = previousGuideLessonStep.step;
    if (
      previousGuideLessonStep.fileId === activeFile.id &&
      previousGuideStep !== activeHeatCapacityGuideStep
    ) {
      const lessonId = HEAT_CAPACITY_GUIDE_LESSON_TRIGGER_BY_COMPLETED_STEP[previousGuideStep];
      const lessonKey = lessonId ? `${activeFile.id}:${previousGuideStep}:${lessonId}` : null;
      if (
        lessonId &&
        lessonKey &&
        activeHeatCapacityGuideStep !== 'idle' &&
        activeHeatCapacityGuideStep !== 'completed' &&
        !heatCapacityGuideLessonShownRef.current.has(lessonKey)
      ) {
        heatCapacityGuideLessonShownRef.current.add(lessonKey);
        heatCapacityLessonPausedFileIdRef.current = activeFile.id;
        clearHeatCapacityGuideLessonTimers();
        clearGuideHeatCapacityStrongReminder();
        heatCapacityLessonDialogActiveRef.current = true;
        setHeatCapacityGuideLessonOutgoingView(null);
        setHeatCapacityGuideLessonClosing(false);
        setHeatCapacityGuideLessonDialog({ kind: 'step', lessonId });
      }
    }

    heatCapacityGuideLessonStepRef.current = {
      fileId: activeFile.id,
      step: activeHeatCapacityGuideStep,
    };
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    guideHeatCapacityActiveFileId,
    heatCapacityGuideLessonDialog?.kind,
  ] } satisfies WorkbenchHeatEffect;
  return {
    effects: { lessonIntro: lessonIntroEffect, lessonStepProjection: lessonStepProjectionEffect }, clearHeatCapacityGuideLessonTimers, scheduleHeatCapacityGuideLessonClose, clearHeatCapacityGuideLessonState, clearHeatCapacityGuideLessonRuntimeForFileExit, openHeatCapacityLessonIntro, getHeatCapacityGuideLessonView, handleHeatCapacityGuideLessonDialogAdvance, handleHeatCapacityGuideLessonDialogKeyDown, handleHeatCapacityGuideLessonCloseButtonMouseDown, handleHeatCapacityGuideLessonCloseButtonClick };
};
