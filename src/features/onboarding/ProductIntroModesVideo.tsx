import { useEffect, useRef, useState } from 'react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { productIntroGuideDemoCopies } from './ProductIntroModesDemo.tsx';

interface ProductIntroModesVideoProps {
  active: boolean;
  paused: boolean;
  reducedMotion: boolean;
  language: WorkbenchLanguagePreference;
  onComplete: () => void;
}

const PRODUCT_INTRO_DEMO_GUIDE_VIDEO_URL = new URL(
  '../../assets/onboarding/product-intro-demo-guide.zh-CN.mp4',
  import.meta.url,
).href;

export const ProductIntroModesVideo = ({
  active,
  paused,
  reducedMotion,
  language,
  onComplete,
}: ProductIntroModesVideoProps) => {
  const copy = productIntroGuideDemoCopies[language];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(false);
  const completionNotifiedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const entering = active && !activeRef.current;
    activeRef.current = active;

    if (!active) {
      video.pause();
      return;
    }

    if (entering) {
      completionNotifiedRef.current = false;
      video.currentTime = 0;
    }

    if (reducedMotion) {
      video.pause();
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.max(0, video.duration - 0.04);
      }
      return;
    }

    if (paused) {
      video.pause();
      return;
    }

    void video.play().catch(() => undefined);
  }, [active, paused, ready, reducedMotion]);

  return (
    <div
      className="first-run-modes-video-demo"
      data-product-intro-modes-video="true"
      data-product-intro-modes-video-layout="demo-guide"
      data-product-intro-modes-video-ready={ready ? 'true' : 'false'}
      data-product-intro-modes-video-paused={paused ? 'true' : 'false'}
    >
      <video
        ref={videoRef}
        className="first-run-guide-video-surface"
        aria-label={`${copy.modeDemo}、${copy.modeGuide} · ${copy.previewTitle}`}
        muted
        playsInline
        preload="auto"
        src={PRODUCT_INTRO_DEMO_GUIDE_VIDEO_URL}
        onLoadedData={() => setReady(true)}
        onLoadedMetadata={(event) => {
          if (reducedMotion) {
            event.currentTarget.currentTime = Math.max(0, event.currentTarget.duration - 0.04);
          }
        }}
        onEnded={() => {
          if (completionNotifiedRef.current) return;
          completionNotifiedRef.current = true;
          onComplete();
        }}
      />
      <div className="first-run-modes-video-captions">
        <div className="first-run-guide-native-caption">
          <strong>{copy.modeDemo}</strong>
          <span>{copy.demoPurpose}</span>
        </div>
        <div className="first-run-guide-native-caption">
          <strong>{copy.modeGuide}</strong>
          <span>{copy.modePurpose}</span>
        </div>
      </div>
    </div>
  );
};
