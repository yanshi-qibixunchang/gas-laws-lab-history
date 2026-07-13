export const HEAT_CAPACITY_REAL_PREHEAT_MINUTES = 20;
export const HEAT_CAPACITY_SIMULATED_PREHEAT_DURATION_MS = 5_000;
export const HEAT_CAPACITY_PREHEAT_COMPLETION_HOLD_MS = 600;
export const HEAT_CAPACITY_PREHEAT_NEARLY_READY_RATIO = 0.8;

export type HeatCapacityPreheatPhase = 'warming' | 'nearly-ready' | 'complete';

export interface HeatCapacityPreheatProgress {
  elapsedMs: number;
  progressRatio: number;
  equivalentMinutes: number;
  phase: HeatCapacityPreheatPhase;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getHeatCapacityPreheatProgress = (
  elapsedMs: number,
): HeatCapacityPreheatProgress => {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const progressRatio = clamp(
    safeElapsedMs / HEAT_CAPACITY_SIMULATED_PREHEAT_DURATION_MS,
    0,
    1,
  );
  const equivalentMinutes = progressRatio >= 1
    ? HEAT_CAPACITY_REAL_PREHEAT_MINUTES
    : Math.floor(progressRatio * HEAT_CAPACITY_REAL_PREHEAT_MINUTES);
  const phase: HeatCapacityPreheatPhase = progressRatio >= 1
    ? 'complete'
    : progressRatio >= HEAT_CAPACITY_PREHEAT_NEARLY_READY_RATIO
      ? 'nearly-ready'
      : 'warming';

  return {
    elapsedMs: safeElapsedMs,
    progressRatio,
    equivalentMinutes,
    phase,
  };
};

export const getHeatCapacityPreheatTotalPresentationMs = () => (
  HEAT_CAPACITY_SIMULATED_PREHEAT_DURATION_MS + HEAT_CAPACITY_PREHEAT_COMPLETION_HOLD_MS
);
