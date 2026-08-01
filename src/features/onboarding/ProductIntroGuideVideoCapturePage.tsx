import { useEffect, useRef, useState } from 'react';
import { AudioProvider } from '../../audio/react/AudioProvider.tsx';
import { ProductIntroModesDemo } from './ProductIntroModesDemo.tsx';
import './ProductIntroGuideVideoCapturePage.css';

interface ProductIntroGuideVideoCaptureApi {
  getElapsedMs: () => number;
  setElapsedMs: (elapsedMs: number) => void;
}

declare global {
  interface Window {
    hardSphereLabProductIntroGuideCapture?: ProductIntroGuideVideoCaptureApi;
  }
}

export const ProductIntroGuideVideoCapturePage = () => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    const api: ProductIntroGuideVideoCaptureApi = {
      getElapsedMs: () => elapsedRef.current,
      setElapsedMs: (nextElapsedMs) => {
        const normalized = Number.isFinite(nextElapsedMs)
          ? Math.max(0, nextElapsedMs)
          : 0;
        elapsedRef.current = normalized;
        setElapsedMs(normalized);
      },
    };
    window.hardSphereLabProductIntroGuideCapture = api;
    return () => {
      if (window.hardSphereLabProductIntroGuideCapture === api) {
        delete window.hardSphereLabProductIntroGuideCapture;
      }
    };
  }, []);

  return (
    <AudioProvider initialSettings={{ enabled: false, volume: 0 }}>
      <main
        className="studio-workbench studio-theme-light first-run-experience product-intro-guide-video-capture-page"
        data-product-intro-guide-video-capture="true"
      >
        <div className="product-intro-guide-video-capture-scale">
          <ProductIntroModesDemo
            active
            paused={false}
            reducedMotion={false}
            language="zh-CN"
            theme="light"
            controlledElapsedMs={elapsedMs}
            surfaceOnly
            mode="demo"
            onComplete={() => undefined}
          />
          <ProductIntroModesDemo
            active
            paused={false}
            reducedMotion={false}
            language="zh-CN"
            theme="light"
            controlledElapsedMs={elapsedMs}
            surfaceOnly
            mode="guide"
            onComplete={() => undefined}
          />
          <ProductIntroModesDemo
            active
            paused={false}
            reducedMotion={false}
            language="zh-CN"
            theme="light"
            controlledElapsedMs={elapsedMs}
            surfaceOnly
            mode="free"
            onComplete={() => undefined}
          />
        </div>
      </main>
    </AudioProvider>
  );
};
