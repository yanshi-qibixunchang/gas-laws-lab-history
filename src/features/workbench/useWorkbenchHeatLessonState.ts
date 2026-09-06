import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import { type HeatCapacityGuideLessonDialogState, type HeatCapacityGuideLessonView } from './workbenchHeatCapacityGuidePresentation.ts';
import { useRef, useState } from 'react';
import { type GuideHeatCapacityStep } from '../heatCapacity/heatCapacityGuideStepModel.ts';

import { getHeatCapacityRefreshBoolean, normalizeHeatCapacityLessonCloseTimerPlan, type HeatCapacityLessonCloseTimerPlan } from './workbenchHeatCapacityUiCheckpoint.ts';


export interface useWorkbenchHeatLessonStatePorts {
  initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
  initialHeatCapacityRefreshLayout: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
  initialHeatCapacityRefreshWindows: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
}

export const useWorkbenchHeatLessonState = (ports: useWorkbenchHeatLessonStatePorts) => {
  const { initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, initialHeatCapacityRefreshWindows } = ports;
  const initialHeatCapacityRefreshLessonDialog: HeatCapacityGuideLessonDialogState | null = (() => {
    const restoredDialog = initialHeatCapacityRefreshSession?.guide.lessonDialog;
    if (!restoredDialog) return null;
    if (restoredDialog.kind === 'intro') return { kind: 'intro', pageIndex: restoredDialog.pageIndex };
    return {
      kind: 'step',
      lessonId: restoredDialog.lessonId,
    };
  })();

  const initialHeatCapacityLessonCloseTimerPlan = initialHeatCapacityRefreshSession
    ? normalizeHeatCapacityLessonCloseTimerPlan(
        initialHeatCapacityRefreshLayout,
        initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
        initialHeatCapacityRefreshSession.mode,
        initialHeatCapacityRefreshLessonDialog !== null,
      )
    : null;

  const heatCapacityGuideLessonShownRef = useRef<Set<string>>(
    new Set(initialHeatCapacityRefreshSession?.guide.shownLessonIds ?? []),
  );

  const heatCapacityGuideLessonStepRef = useRef<{ fileId: string | null; step: GuideHeatCapacityStep }>({
    fileId: null,
    step: 'idle',
  });

  const heatCapacityLessonDialogActiveRef = useRef(initialHeatCapacityRefreshLessonDialog !== null);

  const heatCapacityLessonPausedFileIdRef = useRef<string | null>(
    initialHeatCapacityRefreshLessonDialog ? initialHeatCapacityRefreshSession?.activeHeatCapacityFileId ?? null : null,
  );

  const heatCapacityLessonAutoResumeDemoRef = useRef(
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'lessonAutoResumeDemo'),
  );

  const heatCapacityGuideLessonTransitionTimerRef = useRef<number | null>(null);

  const heatCapacityGuideLessonCloseTimerRef = useRef<number | null>(null);

  const heatCapacityGuideLessonCloseTimerGenerationRef = useRef(0);

  const heatCapacityGuideLessonCloseDeadlineAtMsRef = useRef<number | null>(null);

  const heatCapacityGuideLessonCloseShouldResumeDemoRef = useRef(false);

  const heatCapacityGuideLessonClosePausedRef = useRef<HeatCapacityLessonCloseTimerPlan | null>(
    initialHeatCapacityLessonCloseTimerPlan,
  );

  const heatCapacityGuideLessonDialogRef = useRef<HTMLElement | null>(null);

  const [heatCapacityGuideLessonDialog, setHeatCapacityGuideLessonDialog] = useState<HeatCapacityGuideLessonDialogState | null>(
    initialHeatCapacityRefreshLessonDialog,
  );

  const [heatCapacityGuideLessonOutgoingView, setHeatCapacityGuideLessonOutgoingView] = useState<HeatCapacityGuideLessonView | null>(null);

  const [heatCapacityGuideLessonClosing, setHeatCapacityGuideLessonClosing] = useState(
    initialHeatCapacityLessonCloseTimerPlan !== null,
  );

  const heatCapacityLessonDialogActive = heatCapacityGuideLessonDialog !== null || heatCapacityGuideLessonClosing;

  const lessonDialogProjectionEffect = { run: () => {
    heatCapacityLessonDialogActiveRef.current = heatCapacityLessonDialogActive;
  }, dependencies: [heatCapacityLessonDialogActive] } satisfies WorkbenchHeatEffect;

  const lessonDialogFocusEffect = { run: () => {
    if (!heatCapacityGuideLessonDialog) return;
    heatCapacityGuideLessonDialogRef.current?.focus();
  }, dependencies: [heatCapacityGuideLessonDialog] } satisfies WorkbenchHeatEffect;
  return {
    effects: { lessonDialogProjection: lessonDialogProjectionEffect, lessonDialogFocus: lessonDialogFocusEffect }, heatCapacityGuideLessonShownRef, heatCapacityGuideLessonStepRef, heatCapacityLessonDialogActiveRef, heatCapacityLessonPausedFileIdRef, heatCapacityLessonAutoResumeDemoRef, heatCapacityGuideLessonTransitionTimerRef, heatCapacityGuideLessonCloseTimerRef, heatCapacityGuideLessonCloseTimerGenerationRef, heatCapacityGuideLessonCloseDeadlineAtMsRef, heatCapacityGuideLessonCloseShouldResumeDemoRef, heatCapacityGuideLessonClosePausedRef, heatCapacityGuideLessonDialogRef, heatCapacityGuideLessonDialog, setHeatCapacityGuideLessonDialog, heatCapacityGuideLessonOutgoingView, setHeatCapacityGuideLessonOutgoingView, heatCapacityGuideLessonClosing, setHeatCapacityGuideLessonClosing, heatCapacityLessonDialogActive };
};
