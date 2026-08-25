import { useEffect, useState, type ReactNode } from 'react';

export const WORKBENCH_FRAME_WIDTH = 1440;
export const WORKBENCH_FRAME_HEIGHT = 810;
const WORKBENCH_FRAME_MIN_DESKTOP_WIDTH = 900;
const WORKBENCH_FRAME_MIN_DESKTOP_HEIGHT = 560;

interface WorkbenchFrameViewport {
  width: number;
  height: number;
  touchLike: boolean;
}

const mediaMatches = (query: string) =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(query).matches;

const isTouchLikeViewport = () => {
  const coarsePointer = mediaMatches('(pointer: coarse)');
  const noHover = mediaMatches('(hover: none)');
  const finePointer = mediaMatches('(pointer: fine)');
  const supportsHover = mediaMatches('(hover: hover)');
  const hasTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

  if (coarsePointer || noHover) return true;
  if (finePointer && supportsHover) return false;
  return hasTouchPoints;
};

const getWorkbenchFrameViewport = (): WorkbenchFrameViewport => {
  if (typeof window === 'undefined') {
    return {
      width: WORKBENCH_FRAME_WIDTH,
      height: WORKBENCH_FRAME_HEIGHT,
      touchLike: false,
    };
  }

  const visualViewport = window.visualViewport;
  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
    touchLike: isTouchLikeViewport(),
  };
};

export const WorkbenchAspectFrame = ({
  children,
  forceFixed = false,
}: {
  children: ReactNode;
  forceFixed?: boolean;
}) => {
  const [viewport, setViewport] = useState<WorkbenchFrameViewport>(() => getWorkbenchFrameViewport());

  useEffect(() => {
    const updateViewport = () => setViewport(getWorkbenchFrameViewport());
    updateViewport();
    window.addEventListener('resize', updateViewport);
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateViewport);
      }
    };
  }, []);

  const useFixedFrame = forceFixed || (!viewport.touchLike &&
    viewport.width >= WORKBENCH_FRAME_MIN_DESKTOP_WIDTH &&
    viewport.height >= WORKBENCH_FRAME_MIN_DESKTOP_HEIGHT);
  const scale = useFixedFrame
    ? Math.min(
        viewport.width / WORKBENCH_FRAME_WIDTH,
        viewport.height / WORKBENCH_FRAME_HEIGHT,
      )
    : 1;
  const scaledFrameWidth = WORKBENCH_FRAME_WIDTH * scale;
  const scaledFrameHeight = WORKBENCH_FRAME_HEIGHT * scale;

  return (
    <div
      data-workbench-aspect-frame={useFixedFrame ? 'fixed' : 'responsive'}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        background: useFixedFrame ? '#11161b' : '#1a1f25',
      }}
    >
      <div
        style={{
          width: useFixedFrame ? scaledFrameWidth : '100vw',
          height: useFixedFrame ? scaledFrameHeight : '100vh',
          overflow: 'hidden',
          background: '#1a1f25',
          outline: useFixedFrame ? '1px solid rgba(127, 139, 152, 0.38)' : 'none',
          boxShadow: useFixedFrame
            ? '0 0 0 1px rgba(20, 26, 32, 0.95), 0 24px 70px rgba(0, 0, 0, 0.46)'
            : 'none',
        }}
      >
        <div
          style={{
            width: useFixedFrame ? WORKBENCH_FRAME_WIDTH : '100%',
            height: useFixedFrame ? WORKBENCH_FRAME_HEIGHT : '100%',
            transform: useFixedFrame ? `scale(${scale})` : 'none',
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default WorkbenchAspectFrame;
