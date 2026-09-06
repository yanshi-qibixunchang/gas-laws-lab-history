import { useEffect } from 'react';
import type { PistonOscillationGuideFeedbackState, PistonOscillationGuideCompletionToastState, PistonOscillationGuideFeedbackSource } from './workbenchPistonGuidePresentation.ts';
import { useRef, useState } from 'react';
import type { PromptFeedbackKind } from '../../components/prompts/promptFeedbackPolicy.ts';
import { createPromptViewportFeedbackMessage, resolvePromptViewportFeedbackAdvance, resolvePromptViewportFeedbackShow } from '../../components/prompts/promptViewportFeedbackController.ts';
import { HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS } from '../heatCapacity/heatCapacityToastController.ts';

export interface useWorkbenchPistonFeedbackPorts {

}

export const useWorkbenchPistonFeedback = (ports: useWorkbenchPistonFeedbackPorts) => {
  const {  } = ports;
  const [pistonOscillationGuideFeedback, setPistonOscillationGuideFeedback] =
    useState<PistonOscillationGuideFeedbackState | null>(null);

  const [pistonOscillationGuideCompletionToast, setPistonOscillationGuideCompletionToast] =
    useState<PistonOscillationGuideCompletionToastState | null>(null);

  const pistonOscillationGuideFeedbackCurrentRef =
    useRef<PistonOscillationGuideFeedbackState | null>(null);

  const pistonOscillationGuideFeedbackPendingRef =
    useRef<PistonOscillationGuideFeedbackState | null>(null);

  const pistonOscillationGuideFeedbackTimerRef = useRef<number | null>(null);

  const pistonOscillationGuideFeedbackTimerGenerationRef = useRef(0);

  const clearPistonOscillationGuideFeedbackRef = useRef<() => void>(() => undefined);

  const pistonOscillationGuideCompletionToastTimerRef = useRef<number | null>(null);

  const setPistonOscillationGuideFeedbackCurrent = (
    message: PistonOscillationGuideFeedbackState | null,
  ) => {
    pistonOscillationGuideFeedbackCurrentRef.current = message;
    setPistonOscillationGuideFeedback(message);
  };

  const setPistonOscillationGuideFeedbackPending = (
    message: PistonOscillationGuideFeedbackState | null,
  ) => {
    pistonOscillationGuideFeedbackPendingRef.current = message;
  };

  const clearPistonOscillationGuideFeedback = () => {
    pistonOscillationGuideFeedbackTimerGenerationRef.current += 1;
    if (pistonOscillationGuideFeedbackTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideFeedbackTimerRef.current);
      pistonOscillationGuideFeedbackTimerRef.current = null;
    }
    setPistonOscillationGuideFeedbackCurrent(null);
    setPistonOscillationGuideFeedbackPending(null);
  };

  clearPistonOscillationGuideFeedbackRef.current = clearPistonOscillationGuideFeedback;

  const schedulePistonOscillationGuideFeedbackAdvance = (delayMs: number) => {
    if (pistonOscillationGuideFeedbackTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideFeedbackTimerRef.current);
      pistonOscillationGuideFeedbackTimerRef.current = null;
    }
    const timerGeneration = ++pistonOscillationGuideFeedbackTimerGenerationRef.current;
    pistonOscillationGuideFeedbackTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== pistonOscillationGuideFeedbackTimerGenerationRef.current) return;
      pistonOscillationGuideFeedbackTimerRef.current = null;
      const nextState = resolvePromptViewportFeedbackAdvance({
        current: pistonOscillationGuideFeedbackCurrentRef.current,
        pending: pistonOscillationGuideFeedbackPendingRef.current,
      }, Date.now());
      setPistonOscillationGuideFeedbackPending(nextState.pending);
      setPistonOscillationGuideFeedbackCurrent(nextState.current);
      if (nextState.shouldContinueTimer && nextState.current) {
        schedulePistonOscillationGuideFeedbackAdvance(nextState.current.durationMs);
      }
    }, Math.max(0, delayMs));
  };

  const showPistonOscillationGuideFeedback = (
    text: string,
    kind: PromptFeedbackKind,
    source: PistonOscillationGuideFeedbackSource,
    options: { durationMs?: number; priority?: number } = {},
  ) => {
    const nextMessage = createPromptViewportFeedbackMessage(text, kind, {
      source,
      durationMs: options.durationMs,
      priority: options.priority,
    });
    const nextState = resolvePromptViewportFeedbackShow({
      current: pistonOscillationGuideFeedbackCurrentRef.current,
      pending: pistonOscillationGuideFeedbackPendingRef.current,
    }, nextMessage, { interrupt: true });
    if (!nextState.changed) return;
    setPistonOscillationGuideFeedbackCurrent(nextState.current);
    setPistonOscillationGuideFeedbackPending(nextState.pending);
    if (nextState.shouldRestartTimer && nextState.current) {
      schedulePistonOscillationGuideFeedbackAdvance(nextState.current.durationMs);
    }
  };

  const clearPistonOscillationGuideCompletionToast = () => {
    if (pistonOscillationGuideCompletionToastTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideCompletionToastTimerRef.current);
      pistonOscillationGuideCompletionToastTimerRef.current = null;
    }
    setPistonOscillationGuideCompletionToast(null);
  };

  const showPistonOscillationGuideCompletionToast = (
    fileId: string,
    kicker: string,
    message: string,
  ) => {
    if (pistonOscillationGuideCompletionToastTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideCompletionToastTimerRef.current);
    }
    setPistonOscillationGuideCompletionToast({
      id: Date.now(),
      fileId,
      kicker,
      message,
    });
    pistonOscillationGuideCompletionToastTimerRef.current = window.setTimeout(() => {
      pistonOscillationGuideCompletionToastTimerRef.current = null;
      setPistonOscillationGuideCompletionToast(null);
    }, HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS);
  };
  useEffect(() => () => {
    pistonOscillationGuideFeedbackTimerGenerationRef.current += 1;
    if (pistonOscillationGuideFeedbackTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideFeedbackTimerRef.current);
    }
    if (pistonOscillationGuideCompletionToastTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideCompletionToastTimerRef.current);
    }
  }, []);

  return { pistonOscillationGuideFeedback, pistonOscillationGuideCompletionToast, clearPistonOscillationGuideFeedbackRef, clearPistonOscillationGuideFeedback, showPistonOscillationGuideFeedback, clearPistonOscillationGuideCompletionToast, showPistonOscillationGuideCompletionToast };
};
