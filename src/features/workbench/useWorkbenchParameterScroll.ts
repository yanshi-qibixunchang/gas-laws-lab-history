import { useEffect } from 'react';
import type { WorkbenchFileKind } from './workbenchFileKind.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
import { IDEAL_ADVANCED_SCROLL_DURATION_MS } from './workbenchLayoutConstants.ts';

interface WorkbenchParameterScrollPorts {
  window: Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame' | 'performance'>;
  currentParametersBodyRef: Ref<HTMLElement | null>;
  idealAdvancedScrollFrameRef: Ref<number | null>;
  idealAdvancedSettingsPreviousScrollTopRef: Ref<number>;
  setIdealAdvancedSettingsOpen: Setter<boolean>;
  setIdealAdvancedSettingsBodyVisible: Setter<boolean>;
}

/** One clock and easing for both directions; no parameter or experiment state is owned here. */
export const createWorkbenchParameterScrollActions = (ports: WorkbenchParameterScrollPorts) => {
  const { window, currentParametersBodyRef, idealAdvancedScrollFrameRef,
    idealAdvancedSettingsPreviousScrollTopRef, setIdealAdvancedSettingsOpen,
    setIdealAdvancedSettingsBodyVisible } = ports;
  const animateCurrentParametersScroll = (
    targetTop: number,
    onComplete?: () => void,
    duration = IDEAL_ADVANCED_SCROLL_DURATION_MS,
  ) => {
    const container = currentParametersBodyRef.current;

    if (!container) {
      onComplete?.();
      return;
    }

    if (idealAdvancedScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(idealAdvancedScrollFrameRef.current);
    }

    const startTop = container.scrollTop;
    const distance = targetTop - startTop;
    const startTime = window.performance.now();
    const easeInOut = (value: number) => (
      value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2
    );

    const step = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      container.scrollTop = startTop + distance * easeInOut(progress);

      if (progress < 1) {
        idealAdvancedScrollFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      idealAdvancedScrollFrameRef.current = null;
      container.scrollTop = targetTop;
      onComplete?.();
    };

    idealAdvancedScrollFrameRef.current = window.requestAnimationFrame(step);
  };

  const toggleIdealAdvancedSettings = () => {
    setIdealAdvancedSettingsOpen((current) => {
      if (!current) {
        idealAdvancedSettingsPreviousScrollTopRef.current = currentParametersBodyRef.current?.scrollTop ?? 0;
        setIdealAdvancedSettingsBodyVisible(true);
      }
      return !current;
    });
  };
  return { animateCurrentParametersScroll, toggleIdealAdvancedSettings };
};


export const useWorkbenchParameterScroll = (ports: {
  activeFileKind: WorkbenchFileKind; idealAdvancedSettingsOpen: boolean; idealAdvancedSettingsBodyVisible: boolean;
  currentParametersBodyRef: Ref<HTMLElement | null>; idealAdvancedSettingsBodyRef: Ref<HTMLElement | null>;
  idealAdvancedSettingsPreviousScrollTopRef: Ref<number>; idealAdvancedScrollFrameRef: Ref<number | null>;
  animateCurrentParametersScroll: (targetTop: number, onComplete?: () => void) => void;
  setIdealAdvancedSettingsBodyVisible: Setter<boolean>;
}) => {
  const { activeFileKind, idealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible, currentParametersBodyRef,
    idealAdvancedSettingsBodyRef, idealAdvancedSettingsPreviousScrollTopRef, idealAdvancedScrollFrameRef,
    animateCurrentParametersScroll, setIdealAdvancedSettingsBodyVisible } = ports;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  useEffect(() => {
    if (activeFileKind !== 'ideal') return undefined;
    if (!idealAdvancedSettingsOpen && !idealAdvancedSettingsBodyVisible) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      if (idealAdvancedSettingsOpen) {
        const container = currentParametersBodyRef.current;
        const body = idealAdvancedSettingsBodyRef.current;
        if (!container || !body) return;

        const containerRect = container.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const targetTop = clamp(container.scrollTop + bodyRect.top - containerRect.top, 0, maxScrollTop);
        animateCurrentParametersScroll(targetTop);
        return;
      }

      animateCurrentParametersScroll(
        idealAdvancedSettingsPreviousScrollTopRef.current,
        () => setIdealAdvancedSettingsBodyVisible(false),
      );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (idealAdvancedScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(idealAdvancedScrollFrameRef.current);
        idealAdvancedScrollFrameRef.current = null;
      }
    };
  }, [idealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible, activeFileKind]);
};
