import { useEffect, useMemo, useState } from 'react';
import WorkbenchStudioPrototype from '../features/workbench/WorkbenchStudioPrototype';
import { loadWorkbenchGeneralSettings } from '../features/workbench/workbenchGeneralSettings.ts';
import { AudioProvider } from '../audio/react/AudioProvider.tsx';
import {
  initializeWorkbenchIndexedDbPersistence,
  type WorkbenchPersistenceBootstrapResult,
} from '../features/workbench/workbenchIndexedDbPersistence.ts';
import { getWorkbenchAppBrandName } from '../features/workbench/workbenchBrand.ts';

const WORKBENCH_FRAME_WIDTH = 1440;
const WORKBENCH_FRAME_HEIGHT = 810;
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

const WorkbenchAspectFrame = () => {
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

  const useFixedFrame = !viewport.touchLike &&
    viewport.width >= WORKBENCH_FRAME_MIN_DESKTOP_WIDTH &&
    viewport.height >= WORKBENCH_FRAME_MIN_DESKTOP_HEIGHT;
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
          <WorkbenchStudioPrototype />
        </div>
      </div>
    </div>
  );
};

function App() {
  const [persistenceBootstrap, setPersistenceBootstrap] = useState<WorkbenchPersistenceBootstrapResult | null>(null);
  const [persistenceRetrying, setPersistenceRetrying] = useState(false);
  const initialGeneralSettings = useMemo(() => loadWorkbenchGeneralSettings(), []);
  const initialAudioSettings = useMemo(() => {
    return {
      enabled: initialGeneralSettings.audioEnabled,
      volume: initialGeneralSettings.audioVolume,
    };
  }, [initialGeneralSettings]);

  useEffect(() => {
    document.documentElement.lang = initialGeneralSettings.language;
    document.title = getWorkbenchAppBrandName(initialGeneralSettings.language);
  }, [initialGeneralSettings.language]);

  useEffect(() => {
    let active = true;
    void initializeWorkbenchIndexedDbPersistence().then((result) => {
      if (active) setPersistenceBootstrap(result);
    });
    return () => { active = false; };
  }, []);

  const retryPersistenceInitialization = () => {
    if (persistenceRetrying) return;
    setPersistenceRetrying(true);
    void initializeWorkbenchIndexedDbPersistence().then((result) => {
      setPersistenceBootstrap(result);
      setPersistenceRetrying(false);
    });
  };

  if (!persistenceBootstrap) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 24, color: '#d7e0e8', background: '#11161b' }}>
        正在恢复工作区…
      </div>
    );
  }

  const persistenceWarning = initialGeneralSettings.language === 'en'
    ? 'The workspace opened in safe mode. Original local records were preserved; storage recovery can be retried without clearing data.'
    : initialGeneralSettings.language === 'zh-TW'
      ? '工作區已以安全模式開啟。原始本機記錄已保留，可在不清除資料的情況下重試儲存恢復。'
      : '工作区已以安全模式打开。原始本地记录已保留，可在不清空数据的情况下重试存储恢复。';
  const retryLabel = persistenceRetrying
    ? initialGeneralSettings.language === 'en'
      ? 'Retrying…'
      : '正在重试…'
    : initialGeneralSettings.language === 'en'
      ? 'Retry storage'
      : initialGeneralSettings.language === 'zh-TW'
        ? '重試儲存'
        : '重试存储';

  return (
    <AudioProvider initialSettings={initialAudioSettings}>
      <WorkbenchAspectFrame />
      {persistenceBootstrap.error ? (
        <div
          role="status"
          data-workbench-persistence-safe-mode="true"
          title={persistenceBootstrap.error.message}
          style={{
            position: 'fixed',
            zIndex: 10000,
            left: '50%',
            bottom: 12,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: 'min(920px, calc(100vw - 24px))',
            padding: '9px 12px',
            color: '#f2f6fa',
            background: 'rgba(48, 55, 62, 0.96)',
            border: '1px solid rgba(196, 207, 218, 0.45)',
            borderRadius: 8,
            boxShadow: '0 8px 26px rgba(0, 0, 0, 0.35)',
            fontSize: 13,
          }}
        >
          <span>{persistenceWarning}</span>
          <button
            type="button"
            disabled={persistenceRetrying}
            onClick={retryPersistenceInitialization}
            style={{
              flex: '0 0 auto',
              padding: '5px 9px',
              color: '#f7fafc',
              background: '#245d86',
              border: '1px solid #5795bf',
              borderRadius: 5,
              cursor: persistenceRetrying ? 'wait' : 'pointer',
            }}
          >
            {retryLabel}
          </button>
        </div>
      ) : null}
    </AudioProvider>
  );
}

export default App;
