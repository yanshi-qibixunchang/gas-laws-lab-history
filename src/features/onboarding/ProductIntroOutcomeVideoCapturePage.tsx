import { useEffect, useRef, useState } from 'react';
import { AudioProvider } from '../../audio/react/AudioProvider.tsx';
import { ProductIntroOutcomeDemo } from './ProductIntroOutcomeDemo.tsx';
import '../workbench/WorkbenchStudioPrototype.css';
import './ProductIntroOutcomeVideoCapturePage.css';

interface ProductIntroOutcomeVideoCaptureApi {
  getElapsedMs: () => number;
  setElapsedMs: (elapsedMs: number) => void;
}

declare global {
  interface Window {
    hardSphereLabProductIntroOutcomeCapture?: ProductIntroOutcomeVideoCaptureApi;
  }
}

export const ProductIntroOutcomeVideoCapturePage = () => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    const api: ProductIntroOutcomeVideoCaptureApi = {
      getElapsedMs: () => elapsedRef.current,
      setElapsedMs: (nextElapsedMs) => {
        const normalized = Number.isFinite(nextElapsedMs)
          ? Math.max(0, nextElapsedMs)
          : 0;
        elapsedRef.current = normalized;
        setElapsedMs(normalized);
      },
    };
    window.hardSphereLabProductIntroOutcomeCapture = api;
    return () => {
      if (window.hardSphereLabProductIntroOutcomeCapture === api) {
        delete window.hardSphereLabProductIntroOutcomeCapture;
      }
    };
  }, []);

  return (
    <AudioProvider initialSettings={{ enabled: false, volume: 0 }}>
      <main
        className="studio-workbench studio-theme-light product-intro-outcome-video-capture-page"
        data-product-intro-outcome-video-capture="true"
      >
        <ProductIntroOutcomeDemo controlledElapsedMs={elapsedMs} />
      </main>
    </AudioProvider>
  );
};
