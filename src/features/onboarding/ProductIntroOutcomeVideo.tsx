import { useEffect, useRef, useState } from 'react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import {
  getProductIntroOutcomePlaybackRate,
  PRODUCT_INTRO_OUTCOME_CALCULATION_PLAYBACK_RATE,
  PRODUCT_INTRO_OUTCOME_REVIEW_PLAYBACK_RATE,
  PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS,
} from './productIntroOutcomeTimeline.ts';

interface ProductIntroOutcomeVideoProps {
  active: boolean;
  paused: boolean;
  reducedMotion: boolean;
  language: WorkbenchLanguagePreference;
  onComplete: () => void;
}

const PRODUCT_INTRO_OUTCOME_VIDEO_URL = new URL(
  '../../assets/onboarding/product-intro-outcome.zh-CN.mp4',
  import.meta.url,
).href;

const outcomeVideoLabels: Record<WorkbenchLanguagePreference, string> = {
  'zh-CN': '计算核验与过程回顾演示',
  'zh-TW': '計算核驗與過程回顧示範',
  en: 'Calculation verification and process review demonstration',
};

const syncOutcomePlaybackRate = (video: HTMLVideoElement) => {
  const nextRate = getProductIntroOutcomePlaybackRate(video.currentTime);
  if (video.playbackRate !== nextRate) video.playbackRate = nextRate;
};

export const ProductIntroOutcomeVideo = ({
  active,
  paused,
  reducedMotion,
  language,
  onComplete,
}: ProductIntroOutcomeVideoProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(false);
  const completionNotifiedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const entering = active && !activeRef.current;
    activeRef.current = active;
    video.defaultPlaybackRate = PRODUCT_INTRO_OUTCOME_CALCULATION_PLAYBACK_RATE;
    syncOutcomePlaybackRate(video);

    if (!active) {
      video.pause();
      return;
    }

    if (entering) {
      completionNotifiedRef.current = false;
      video.currentTime = 0;
      syncOutcomePlaybackRate(video);
    }

    if (reducedMotion) {
      video.pause();
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.max(0, video.duration - 0.04);
        syncOutcomePlaybackRate(video);
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
      className="first-run-outcome-video-demo"
      data-product-intro-outcome-video="true"
      data-product-intro-outcome-video-ready={ready ? 'true' : 'false'}
      data-product-intro-outcome-video-paused={paused ? 'true' : 'false'}
      data-product-intro-calculation-playback-rate={PRODUCT_INTRO_OUTCOME_CALCULATION_PLAYBACK_RATE}
      data-product-intro-review-playback-rate={PRODUCT_INTRO_OUTCOME_REVIEW_PLAYBACK_RATE}
      data-product-intro-review-rate-switch-seconds={PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS / 1_000}
    >
      <video
        ref={videoRef}
        className="first-run-guide-video-surface"
        aria-label={outcomeVideoLabels[language]}
        muted
        playsInline
        preload="auto"
        src={PRODUCT_INTRO_OUTCOME_VIDEO_URL}
        onLoadedData={() => setReady(true)}
        onLoadedMetadata={(event) => {
          event.currentTarget.defaultPlaybackRate = PRODUCT_INTRO_OUTCOME_CALCULATION_PLAYBACK_RATE;
          if (reducedMotion) {
            event.currentTarget.currentTime = Math.max(0, event.currentTarget.duration - 0.04);
          }
          syncOutcomePlaybackRate(event.currentTarget);
        }}
        onTimeUpdate={(event) => syncOutcomePlaybackRate(event.currentTarget)}
        onSeeked={(event) => syncOutcomePlaybackRate(event.currentTarget)}
        onPlaying={(event) => syncOutcomePlaybackRate(event.currentTarget)}
        onEnded={() => {
          if (completionNotifiedRef.current) return;
          completionNotifiedRef.current = true;
          onComplete();
        }}
      />
    </div>
  );
};
