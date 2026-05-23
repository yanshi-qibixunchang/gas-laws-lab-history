export const HEAT_CAPACITY_AUTO_DEMO_ANIMATION_COMMIT_INTERVAL_MS = 33;

export interface HeatCapacityAutoDemoAnimationFrameCommitInput {
  timestampMs: number;
  lastCommitTimestampMs: number | null;
  progress: number;
  intervalMs?: number;
}

export const shouldCommitHeatCapacityAutoDemoAnimationFrame = ({
  timestampMs,
  lastCommitTimestampMs,
  progress,
  intervalMs = HEAT_CAPACITY_AUTO_DEMO_ANIMATION_COMMIT_INTERVAL_MS,
}: HeatCapacityAutoDemoAnimationFrameCommitInput): boolean => {
  if (progress <= 0 || progress >= 1) return true;
  if (lastCommitTimestampMs === null) return true;
  return timestampMs - lastCommitTimestampMs >= intervalMs;
};
