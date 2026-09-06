import { useEffect } from 'react';
import type { PistonOscillationGuideLessonDialogState, PistonOscillationGuideLessonView } from './workbenchPistonGuidePresentation.ts';
import { useRef, useState } from 'react';
import type { PistonOscillationGuideStep } from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';

export interface useWorkbenchPistonLessonStatePorts {

}

export const useWorkbenchPistonLessonState = (ports: useWorkbenchPistonLessonStatePorts) => {
  const {  } = ports;
  const [pistonOscillationGuideLessonDialog, setPistonOscillationGuideLessonDialog] =
    useState<PistonOscillationGuideLessonDialogState | null>(null);

  const [pistonOscillationGuideLessonOutgoingView, setPistonOscillationGuideLessonOutgoingView] =
    useState<PistonOscillationGuideLessonView | null>(null);

  const pistonOscillationGuidePreviousSessionRef = useRef<{
    fileId: string;
    status: 'idle' | 'active' | 'completed';
    step: PistonOscillationGuideStep;
  } | null>(null);

  const pistonOscillationGuideLessonShownRef = useRef<Set<string>>(new Set());

  const pistonOscillationGuideLessonCloseTimerRef = useRef<number | null>(null);

  const pistonOscillationGuideLessonTransitionTimerRef = useRef<number | null>(null);

  const pistonOscillationGuideLessonDialogRef = useRef<HTMLElement | null>(null);

  const pistonOscillationGuideLessonReturnFocusRef = useRef<HTMLElement | null>(null);

  const pistonOscillationDemoResumeAfterLessonRef = useRef(false);
  useEffect(() => () => {
    if (pistonOscillationGuideLessonCloseTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideLessonCloseTimerRef.current);
    }
    if (pistonOscillationGuideLessonTransitionTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideLessonTransitionTimerRef.current);
    }
  }, []);

  return { pistonOscillationGuideLessonDialog, setPistonOscillationGuideLessonDialog, pistonOscillationGuideLessonOutgoingView, setPistonOscillationGuideLessonOutgoingView, pistonOscillationGuidePreviousSessionRef, pistonOscillationGuideLessonShownRef, pistonOscillationGuideLessonCloseTimerRef, pistonOscillationGuideLessonTransitionTimerRef, pistonOscillationGuideLessonDialogRef, pistonOscillationGuideLessonReturnFocusRef, pistonOscillationDemoResumeAfterLessonRef };
};
