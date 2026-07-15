export type HeatCapacityModeTransitionDemoClock = {
  fileId: string;
  elapsedMs: number;
  initialDelayRemainingMs: number;
};

export const captureHeatCapacityModeTransitionDemoClock = ({
  fileId,
  nowMs,
  timelineStartedAtMs,
}: {
  fileId: string;
  nowMs: number;
  timelineStartedAtMs: number;
}): HeatCapacityModeTransitionDemoClock => {
  const initialDelayRemainingMs = Math.max(0, timelineStartedAtMs - nowMs);
  return {
    fileId,
    elapsedMs: initialDelayRemainingMs > 0
      ? 0
      : Math.max(0, nowMs - timelineStartedAtMs),
    initialDelayRemainingMs,
  };
};

export const resolveHeatCapacityModeTransitionDemoResume = (
  clock: HeatCapacityModeTransitionDemoClock | null,
  fileId: string,
  phase: 'idle' | 'running' | 'paused',
) => clock?.fileId === fileId && phase === 'running'
  ? {
      elapsedMs: clock.elapsedMs,
      initialDelayRemainingMs: clock.initialDelayRemainingMs,
    }
  : null;
