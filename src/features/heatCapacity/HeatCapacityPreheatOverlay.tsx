import React, { useEffect, useRef, useState } from 'react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import {
  HEAT_CAPACITY_PREHEAT_COMPLETION_HOLD_MS,
  HEAT_CAPACITY_REAL_PREHEAT_MINUTES,
  HEAT_CAPACITY_SIMULATED_PREHEAT_DURATION_MS,
  getHeatCapacityPreheatProgress,
} from '../../domain/heatCapacity/heatCapacityPreheatModel.ts';
import { heatCapacityPreheatCopies } from './heatCapacityPreheatCopy.ts';
import './HeatCapacityPreheatOverlay.css';

interface HeatCapacityPreheatOverlayProps {
  language: WorkbenchLanguagePreference;
  paused?: boolean;
  onComplete: () => void;
}

const toRgbChannel = (start: number, end: number, progress: number) => (
  Math.round(start + (end - start) * progress)
);

const getHeatCapacityPreheatProgressColor = (progressRatio: number, complete: boolean) => {
  if (complete) return 'rgb(34, 197, 94)';
  const transitionRatio = Math.min(1, Math.max(0, (progressRatio - 0.8) / 0.2));
  const eased = transitionRatio * transitionRatio * (3 - 2 * transitionRatio);
  return `rgb(${toRgbChannel(14, 249, eased)}, ${toRgbChannel(165, 115, eased)}, ${toRgbChannel(233, 22, eased)})`;
};

export const HeatCapacityPreheatOverlay = ({
  language,
  paused = false,
  onComplete,
}: HeatCapacityPreheatOverlayProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);
  const previousFrameAtRef = useRef<number | null>(null);
  const completeRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let frameId = 0;
    const totalPresentationMs = HEAT_CAPACITY_SIMULATED_PREHEAT_DURATION_MS +
      HEAT_CAPACITY_PREHEAT_COMPLETION_HOLD_MS;

    const step = (timestamp: number) => {
      if (paused) {
        previousFrameAtRef.current = null;
      } else {
        const previousFrameAt = previousFrameAtRef.current;
        previousFrameAtRef.current = timestamp;
        if (previousFrameAt !== null) {
          elapsedRef.current = Math.min(
            totalPresentationMs,
            elapsedRef.current + Math.max(0, timestamp - previousFrameAt),
          );
          setElapsedMs(elapsedRef.current);
        }
      }

      if (elapsedRef.current >= totalPresentationMs) {
        if (!completeRef.current) {
          completeRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [paused]);

  const progress = getHeatCapacityPreheatProgress(elapsedMs);
  const copy = heatCapacityPreheatCopies[language];
  const progressColor = getHeatCapacityPreheatProgressColor(
    progress.progressRatio,
    progress.phase === 'complete',
  );

  return (
    <section
      className={`studio-heat-preheat studio-heat-preheat-${progress.phase}`}
      data-heat-capacity-preheat="true"
      aria-busy={progress.phase !== 'complete'}
      aria-live="polite"
    >
      <header className="studio-heat-preheat-kicker">
        <span>{copy.title}</span>
        <em>{copy.status[progress.phase]}</em>
      </header>
      <div
        className="studio-heat-preheat-ring"
        role="progressbar"
        aria-label={copy.progressAria(progress.equivalentMinutes)}
        aria-valuemin={0}
        aria-valuemax={HEAT_CAPACITY_REAL_PREHEAT_MINUTES}
        aria-valuenow={progress.equivalentMinutes}
        style={{
          '--studio-heat-preheat-progress': `${progress.progressRatio * 100}%`,
          '--studio-heat-preheat-progress-color': progressColor,
        } as React.CSSProperties & Record<
          '--studio-heat-preheat-progress' | '--studio-heat-preheat-progress-color',
          string
        >}
      >
        <strong>{progress.equivalentMinutes}</strong>
        <span>{copy.minuteUnit}</span>
      </div>
      <p>{copy.description}</p>
    </section>
  );
};

export default HeatCapacityPreheatOverlay;
