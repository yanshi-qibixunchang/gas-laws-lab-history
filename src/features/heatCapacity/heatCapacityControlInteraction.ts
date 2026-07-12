export type HeatCapacityControlInteractionId = string;

export const HEAT_CAPACITY_ZERO_WHEEL_GESTURE_GAP_MS = 120;

let nextHeatCapacityControlInteractionSequence = 1;

export const createHeatCapacityControlInteractionId = (
  control: 'pressureZero',
  kind: 'drag' | 'wheel',
): HeatCapacityControlInteractionId => (
  `${control}:${kind}:${nextHeatCapacityControlInteractionSequence++}`
);

export class HeatCapacityWheelGestureTracker {
  private interactionId: HeatCapacityControlInteractionId | null = null;
  private lastEventAtMs: number | null = null;

  getInteractionId(nowMs: number) {
    const safeNowMs = Number.isFinite(nowMs) ? nowMs : 0;
    if (
      this.interactionId === null ||
      this.lastEventAtMs === null ||
      safeNowMs - this.lastEventAtMs > HEAT_CAPACITY_ZERO_WHEEL_GESTURE_GAP_MS
    ) {
      this.interactionId = createHeatCapacityControlInteractionId('pressureZero', 'wheel');
    }
    this.lastEventAtMs = safeNowMs;
    return this.interactionId;
  }

  reset() {
    this.interactionId = null;
    this.lastEventAtMs = null;
  }
}

export class HeatCapacityRejectedInteractionTracker {
  private readonly rejectedKeys = new Set<string>();

  shouldApplyFailure(
    fileId: string,
    action: string,
    interactionId?: HeatCapacityControlInteractionId,
  ) {
    if (!interactionId) return true;
    const rejectionKey = `${fileId}:${action}:${interactionId}`;
    if (this.rejectedKeys.has(rejectionKey)) return false;
    this.rejectedKeys.add(rejectionKey);
    if (this.rejectedKeys.size > 64) {
      const oldestKey = this.rejectedKeys.values().next().value;
      if (oldestKey) this.rejectedKeys.delete(oldestKey);
    }
    return true;
  }

  reset() {
    this.rejectedKeys.clear();
  }
}
