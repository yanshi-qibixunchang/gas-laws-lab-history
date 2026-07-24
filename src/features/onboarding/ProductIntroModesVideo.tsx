import { useEffect, useRef, useState } from 'react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { productIntroGuideDemoCopies } from './ProductIntroModesDemo.tsx';
import { PRODUCT_INTRO_CONTENT_PLAYBACK_RATE } from './productIntroCarouselModel.ts';

interface ProductIntroModesVideoProps {
  active: boolean;
  paused: boolean;
  reducedMotion: boolean;
  language: WorkbenchLanguagePreference;
  onComplete: () => void;
}

const PRODUCT_INTRO_MODES_VIDEO_URL = new URL(
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
  const learningPathLabelLines = language === 'en'
    ? ['Learning', 'path']
    : [copy.learningPathLabel.slice(0, 2), copy.learningPathLabel.slice(2)];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(false);
  const completionNotifiedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const entering = active && !activeRef.current;
    activeRef.current = active;
    video.defaultPlaybackRate = PRODUCT_INTRO_CONTENT_PLAYBACK_RATE;
    video.playbackRate = PRODUCT_INTRO_CONTENT_PLAYBACK_RATE;

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
      data-product-intro-modes-video-layout="demo-guide-free"
      data-product-intro-modes-video-ready={ready ? 'true' : 'false'}
      data-product-intro-modes-video-paused={paused ? 'true' : 'false'}
      data-product-intro-playback-rate={PRODUCT_INTRO_CONTENT_PLAYBACK_RATE}
    >
      <video
        ref={videoRef}
        className="first-run-guide-video-surface"
        aria-label={`${copy.modeDemo}、${copy.modeGuide}、${copy.modeFree} · ${copy.previewTitle}`}
        muted
        playsInline
        preload="auto"
        src={PRODUCT_INTRO_MODES_VIDEO_URL}
        onLoadedData={() => setReady(true)}
        onLoadedMetadata={(event) => {
          event.currentTarget.defaultPlaybackRate = PRODUCT_INTRO_CONTENT_PLAYBACK_RATE;
          event.currentTarget.playbackRate = PRODUCT_INTRO_CONTENT_PLAYBACK_RATE;
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
        <div className="first-run-guide-native-caption">
          <strong>{copy.modeFree}</strong>
          <span>{copy.freePurpose}</span>
        </div>
      </div>
      <div
        className="first-run-modes-learning-path"
        aria-label={`${copy.learningPathLabel}：${copy.learningObserve}，${copy.learningFollow}，${copy.learningIndependent}`}
      >
        <div className="first-run-modes-learning-path-content">
          <strong className="first-run-modes-learning-path-badge" aria-hidden="true">
            <span>{learningPathLabelLines[0]}</span>
            <span>{learningPathLabelLines[1]}</span>
          </strong>
          <div className="first-run-modes-learning-path-sequence">
            <span>{copy.learningObserve}</span>
            <i aria-hidden="true">→</i>
            <span>{copy.learningFollow}</span>
            <i aria-hidden="true">→</i>
            <span>{copy.learningIndependent}</span>
          </div>
          <p>{copy.learningPathSummary}</p>
        </div>
      </div>
    </div>
  );
};
