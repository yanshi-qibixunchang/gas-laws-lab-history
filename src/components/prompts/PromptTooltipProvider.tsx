import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PROMPT_TOOLTIP_DELAY_MS } from './promptFeedbackPolicy.ts';
import './PromptTooltipProvider.css';

interface PromptTooltipProviderProps {
  children: ReactNode;
}

interface ActivePromptTooltip {
  target: HTMLElement;
  text: string;
}

interface PromptTooltipPosition {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
  theme: 'light' | 'dark';
}

const tooltipSelector = '[data-prompt-tooltip]';

const getTooltipTarget = (source: EventTarget | null) => {
  if (!(source instanceof Element)) return null;
  const target = source.closest<HTMLElement>(tooltipSelector);
  if (!target) return null;
  const text = target.dataset.promptTooltip?.trim();
  return text ? { target, text } : null;
};

const promoteNativeTitle = (element: Element) => {
  if (!(element instanceof HTMLElement)) return;
  if (element instanceof HTMLIFrameElement) return;
  const nativeTitle = element.getAttribute('title')?.trim();
  if (!nativeTitle) return;
  if (!element.dataset.promptTooltip) element.dataset.promptTooltip = nativeTitle;
  element.dataset.promptTooltipMigrated = 'true';
  element.removeAttribute('title');
};

const promoteNativeTitlesWithin = (root: ParentNode) => {
  if (root instanceof HTMLElement && root.hasAttribute('title')) promoteNativeTitle(root);
  root.querySelectorAll<HTMLElement>('[title]').forEach(promoteNativeTitle);
};

export const PromptTooltipProvider = ({ children }: PromptTooltipProviderProps) => {
  const generatedId = useId();
  const tooltipId = `${generatedId}-prompt-tooltip`;
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hoverTargetRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<ActivePromptTooltip | null>(null);
  const [position, setPosition] = useState<PromptTooltipPosition>({
    left: 8,
    top: 8,
    placement: 'top',
    theme: 'dark',
  });

  useEffect(() => {
    promoteNativeTitlesWithin(document);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === 'attributes' && record.target instanceof HTMLElement) {
          promoteNativeTitle(record.target);
        }
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) promoteNativeTitlesWithin(node);
        });
      });
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['title'],
    });

    const clearShowTimer = () => {
      if (showTimerRef.current === null) return;
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    };
    const clearHideTimer = () => {
      if (hideTimerRef.current === null) return;
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    };
    const hideTooltip = (delay: number = PROMPT_TOOLTIP_DELAY_MS.hide) => {
      clearShowTimer();
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        setActiveTooltip(null);
        hideTimerRef.current = null;
      }, delay);
    };
    const scheduleTooltip = (
      next: ActivePromptTooltip,
      delay: number,
      stillRelevant: () => boolean,
    ) => {
      clearShowTimer();
      clearHideTimer();
      showTimerRef.current = window.setTimeout(() => {
        if (next.target.isConnected && stillRelevant()) setActiveTooltip(next);
        showTimerRef.current = null;
      }, delay);
    };

    const handlePointerOver = (event: PointerEvent) => {
      const next = getTooltipTarget(event.target);
      if (!next) return;
      if (event.relatedTarget instanceof Node && next.target.contains(event.relatedTarget)) return;
      hoverTargetRef.current = next.target;
      scheduleTooltip(next, PROMPT_TOOLTIP_DELAY_MS.pointer, () => hoverTargetRef.current === next.target);
    };
    const handlePointerOut = (event: PointerEvent) => {
      const current = getTooltipTarget(event.target);
      if (!current) return;
      if (event.relatedTarget instanceof Node && current.target.contains(event.relatedTarget)) return;
      if (hoverTargetRef.current === current.target) hoverTargetRef.current = null;
      if (current.target.contains(document.activeElement)) return;
      hideTooltip();
    };
    const handleFocusIn = (event: FocusEvent) => {
      const next = getTooltipTarget(event.target);
      if (!next) return;
      scheduleTooltip(
        next,
        PROMPT_TOOLTIP_DELAY_MS.focus,
        () => next.target.contains(document.activeElement),
      );
    };
    const handleFocusOut = (event: FocusEvent) => {
      const current = getTooltipTarget(event.target);
      if (!current || hoverTargetRef.current === current.target) return;
      hideTooltip();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearShowTimer();
      hideTooltip(0);
    };

    document.addEventListener('pointerover', handlePointerOver, true);
    document.addEventListener('pointerout', handlePointerOut, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      observer.disconnect();
      clearShowTimer();
      clearHideTimer();
      document.removeEventListener('pointerover', handlePointerOver, true);
      document.removeEventListener('pointerout', handlePointerOut, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    const target = activeTooltip?.target;
    if (!target) return undefined;
    const originalDescription = target.getAttribute('aria-describedby');
    const descriptions = new Set((originalDescription ?? '').split(/\s+/).filter(Boolean));
    descriptions.add(tooltipId);
    target.setAttribute('aria-describedby', [...descriptions].join(' '));
    return () => {
      if (!target.isConnected) return;
      if (originalDescription) target.setAttribute('aria-describedby', originalDescription);
      else target.removeAttribute('aria-describedby');
    };
  }, [activeTooltip?.target, tooltipId]);

  useLayoutEffect(() => {
    if (!activeTooltip || !tooltipRef.current) return undefined;
    const updatePosition = () => {
      const anchorRect = activeTooltip.target.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      if (!tooltipRect) return;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const gap = 8;
      const edge = 8;
      const fitsAbove = anchorRect.top - tooltipRect.height - gap >= edge;
      const placement: PromptTooltipPosition['placement'] = fitsAbove ? 'top' : 'bottom';
      const preferredTop = placement === 'top'
        ? anchorRect.top - tooltipRect.height - gap
        : anchorRect.bottom + gap;
      const top = Math.min(
        Math.max(edge, preferredTop),
        Math.max(edge, viewportHeight - tooltipRect.height - edge),
      );
      const centeredLeft = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
      const left = Math.min(
        Math.max(edge, centeredLeft),
        Math.max(edge, viewportWidth - tooltipRect.width - edge),
      );
      const theme = activeTooltip.target.closest('.studio-theme-light') ||
        document.querySelector('.studio-workbench.studio-theme-light')
        ? 'light'
        : 'dark';
      setPosition({ left, top, placement, theme });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeTooltip]);

  return (
    <>
      {children}
      {activeTooltip ? (
        <div
          ref={tooltipRef}
          id={tooltipId}
          className="prompt-tooltip"
          role="tooltip"
          data-prompt-tooltip-surface="true"
          data-prompt-tooltip-placement={position.placement}
          data-prompt-theme={position.theme}
          style={{ left: position.left, top: position.top }}
        >
          {activeTooltip.text}
        </div>
      ) : null}
    </>
  );
};
