import { useLayoutEffect, useRef } from 'react';

const OVERLAY_MOTION_DURATION_MS = 200;
const OVERLAY_MOTION_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const MINIMUM_MOTION_PX = 0.5;

type OverlayLayoutRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

const getOverlayLayoutRect = (item: HTMLElement, root: HTMLElement): OverlayLayoutRect => {
  let left = 0;
  let top = 0;
  let current: HTMLElement | null = item;
  const rootRect = root.getBoundingClientRect();

  while (current && current !== root) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  if (current !== root) {
    const itemRect = item.getBoundingClientRect();
    return {
      left: itemRect.left,
      top: itemRect.top,
      width: itemRect.width,
      height: itemRect.height,
    };
  }

  return {
    left: rootRect.left + left,
    top: rootRect.top + top,
    width: item.offsetWidth,
    height: item.offsetHeight,
  };
};

export const usePreviewOverlayMotion = <ElementType extends HTMLElement>() => {
  const rootRef = useRef<ElementType | null>(null);
  const previousRectsRef = useRef<Map<string, OverlayLayoutRect>>(new Map());
  const activeAnimationsRef = useRef<Map<string, Animation>>(new Map());

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-preview-overlay-item]'));
    const nextRects = new Map<string, OverlayLayoutRect>();

    for (const item of items) {
      const key = item.dataset.previewOverlayItem;
      if (!key) continue;
      nextRects.set(key, getOverlayLayoutRect(item, root));
    }

    for (const [key, animation] of activeAnimationsRef.current.entries()) {
      if (!nextRects.has(key)) {
        animation.cancel();
        activeAnimationsRef.current.delete(key);
      }
    }

    if (prefersReducedMotion()) {
      activeAnimationsRef.current.forEach((animation) => {
        animation.cancel();
      });
      activeAnimationsRef.current.clear();
      previousRectsRef.current = nextRects;
      return;
    }

    for (const item of items) {
      const key = item.dataset.previewOverlayItem;
      if (!key) continue;

      const previousRect = previousRectsRef.current.get(key);
      const nextRect = nextRects.get(key);
      if (!previousRect || !nextRect) continue;

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < MINIMUM_MOTION_PX && Math.abs(deltaY) < MINIMUM_MOTION_PX) continue;

      const activeAnimation = activeAnimationsRef.current.get(key);
      if (activeAnimation) {
        activeAnimation.cancel();
      }

      const animation = item.animate(
        [
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
          { transform: 'translate3d(0, 0, 0)' },
        ],
        {
          duration: OVERLAY_MOTION_DURATION_MS,
          easing: OVERLAY_MOTION_EASING,
        },
      );

      activeAnimationsRef.current.set(key, animation);
      animation.finished
        .catch(() => undefined)
        .finally(() => {
          if (activeAnimationsRef.current.get(key) === animation) {
            activeAnimationsRef.current.delete(key);
          }
        });
    }

    previousRectsRef.current = nextRects;
  });

  return rootRef;
};

export default usePreviewOverlayMotion;
