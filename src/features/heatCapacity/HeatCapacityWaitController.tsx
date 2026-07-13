import React from 'react';
import {
  HEAT_CAPACITY_FREE_WAIT_SPEED_OPTIONS,
  type HeatCapacityFreeWaitSpeedMultiplier,
} from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import './HeatCapacityWaitController.css';

export const HEAT_CAPACITY_WAIT_SPEED_OPTIONS = HEAT_CAPACITY_FREE_WAIT_SPEED_OPTIONS;
export type HeatCapacityWaitSpeedMultiplier = HeatCapacityFreeWaitSpeedMultiplier;

export interface HeatCapacityWaitControllerProps {
  elapsedS: number;
  targetS: number;
  phaseLabel: string;
  statusText: string;
  speedMultiplier: HeatCapacityWaitSpeedMultiplier;
  speedLabelCode: string;
  speedLabel: string;
  speedAriaLabel: string;
  speedOptionsDisabled?: boolean;
  className?: string;
  onSpeedMultiplierChange: (speedMultiplier: HeatCapacityWaitSpeedMultiplier) => void;
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

export const formatHeatCapacityWaitDuration = (seconds: number) => {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const getHeatCapacityWaitProgressColor = (progressRatio: number) => {
  const warningRatio = clampUnit((clampUnit(progressRatio) - 0.72) / 0.28);
  const easedWarningRatio = warningRatio * warningRatio * (3 - 2 * warningRatio);
  const red = Math.round(14 + (239 - 14) * easedWarningRatio);
  const green = Math.round(165 + (68 - 165) * easedWarningRatio);
  const blue = Math.round(233 + (68 - 233) * easedWarningRatio);
  return `rgb(${red}, ${green}, ${blue})`;
};

export const HeatCapacityWaitController = ({
  elapsedS,
  targetS,
  phaseLabel,
  statusText,
  speedMultiplier,
  speedLabelCode,
  speedLabel,
  speedAriaLabel,
  speedOptionsDisabled = false,
  className,
  onSpeedMultiplierChange,
}: HeatCapacityWaitControllerProps) => {
  const selectedIndex = Math.max(
    0,
    HEAT_CAPACITY_WAIT_SPEED_OPTIONS.indexOf(speedMultiplier),
  );
  const elapsedText = formatHeatCapacityWaitDuration(elapsedS);
  const targetText = formatHeatCapacityWaitDuration(targetS);
  const progressRatio = targetS > 0 ? clampUnit(elapsedS / targetS) : 0;
  const progressColor = getHeatCapacityWaitProgressColor(progressRatio);
  const rootClassName = [
    'heat-capacity-wait-controller',
    `heat-capacity-wait-controller--speed-${selectedIndex}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rootClassName}
      data-heat-capacity-wait-controller="true"
      role="radiogroup"
      aria-label={speedAriaLabel}
    >
      <svg
        className="heat-capacity-wait-controller__shell"
        viewBox="0 0 260 82"
        aria-hidden="true"
      >
        <path
          className="heat-capacity-wait-controller__timer-cabin"
          d="M 74 50 L 92 76 H 179 C 191 76 200 74 210 68 C 218 62 224 55 225 49 L 74 50 Z"
        />
        <rect
          className="heat-capacity-wait-controller__main-capsule"
          x="0"
          y="12"
          width="238"
          height="38"
          rx="19"
          ry="19"
        />
      </svg>

      <span className="heat-capacity-wait-controller__screw heat-capacity-wait-controller__screw--start" aria-hidden="true" />
      <span className="heat-capacity-wait-controller__label" aria-hidden="true">
        <span>{speedLabelCode}</span>
        <strong>{speedLabel}</strong>
      </span>

      <span className="heat-capacity-wait-controller__options">
        <span className="heat-capacity-wait-controller__thumb" aria-hidden="true" />
        {HEAT_CAPACITY_WAIT_SPEED_OPTIONS.map((speed) => {
          const selected = speedMultiplier === speed;
          return (
            <button
              key={speed}
              type="button"
              className={`heat-capacity-wait-controller__option${
                selected ? ' heat-capacity-wait-controller__option--active' : ''
              }`}
              data-heat-capacity-wait-speed-option={speed}
              aria-checked={selected}
              role="radio"
              disabled={speedOptionsDisabled}
              onClick={(event) => {
                event.stopPropagation();
                if (!speedOptionsDisabled) onSpeedMultiplierChange(speed);
              }}
            >
              ×{speed}
            </button>
          );
        })}
      </span>

      <span
        className="heat-capacity-wait-controller__timer"
        data-heat-capacity-wait-timer="true"
        aria-label={`${phaseLabel} ${elapsedText}/${targetText} ${statusText}`}
        style={{
          '--heat-capacity-wait-progress': `${progressRatio * 100}%`,
          '--heat-capacity-wait-progress-color': progressColor,
        } as React.CSSProperties & Record<
          '--heat-capacity-wait-progress' | '--heat-capacity-wait-progress-color',
          string
        >}
      >
        <span>{phaseLabel}</span>
        <strong>
          {elapsedText}/{targetText}
        </strong>
        <em>{statusText}</em>
      </span>

      <span className="heat-capacity-wait-controller__screw heat-capacity-wait-controller__screw--end" aria-hidden="true" />
    </div>
  );
};
