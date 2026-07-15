import {
  getHeatCapacityAutoDemoTimelineItemKey,
  type HeatCapacityAutoDemoTimelineItem,
} from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';

const HEAT_CAPACITY_AUTO_DEMO_PREHEAT_STEP_ID = 'sensor-preheat' as const;

export interface HeatCapacityAutoDemoResumeCursor {
  elapsedMs: number;
  currentItemIndex: number | null;
  currentStepId: string | null;
  executedItemKeys: readonly string[];
}

export interface NormalizedHeatCapacityAutoDemoResumeCursor {
  restartedInterruptedPreheat: boolean;
  elapsedMs: number;
  lastProcessedTimelineIndex: number;
  executedItemKeys: string[];
}

/**
 * A preheat interrupted by navigation is intentionally replayed from the
 * beginning of the preheat presentation. Earlier Demo actions remain
 * executed, so returning never toggles the power switch a second time.
 */
export const normalizeHeatCapacityAutoDemoResumeCursor = (
  timeline: readonly HeatCapacityAutoDemoTimelineItem[],
  cursor: HeatCapacityAutoDemoResumeCursor,
): NormalizedHeatCapacityAutoDemoResumeCursor => {
  const currentItemIndex = cursor.currentItemIndex ?? -1;
  const currentTimelineItem = timeline[currentItemIndex] ?? null;
  const preheatTimelineStartIndex = timeline.findIndex((item) => (
    item.step.id === HEAT_CAPACITY_AUTO_DEMO_PREHEAT_STEP_ID && item.stage === 'highlight'
  ));
  const interruptedPreheat = preheatTimelineStartIndex >= 0 && (
    currentTimelineItem?.step.id === HEAT_CAPACITY_AUTO_DEMO_PREHEAT_STEP_ID ||
    cursor.currentStepId === HEAT_CAPACITY_AUTO_DEMO_PREHEAT_STEP_ID
  );

  if (interruptedPreheat) {
    return {
      restartedInterruptedPreheat: true,
      elapsedMs: timeline[preheatTimelineStartIndex]?.atMs ?? Math.max(0, cursor.elapsedMs),
      lastProcessedTimelineIndex: preheatTimelineStartIndex - 1,
      executedItemKeys: timeline
        .slice(0, preheatTimelineStartIndex)
        .map(getHeatCapacityAutoDemoTimelineItemKey),
    };
  }

  const lastProcessedTimelineIndex = currentItemIndex;
  return {
    restartedInterruptedPreheat: false,
    elapsedMs: Math.max(0, cursor.elapsedMs),
    lastProcessedTimelineIndex,
    executedItemKeys: cursor.executedItemKeys.length > 0
      ? [...cursor.executedItemKeys]
      : timeline
          .slice(0, Math.max(0, lastProcessedTimelineIndex + 1))
          .map(getHeatCapacityAutoDemoTimelineItemKey),
  };
};
