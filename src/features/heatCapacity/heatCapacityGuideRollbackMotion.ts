import { useEffect, useRef, useState } from 'react';

export type HeatCapacityGuideRollbackAnimation =
  | 'valveBounce'
  | 'stopcockBounce'
  | 'pumpBulbBounce'
  | 'knobBounce'
  | 'powerBounce';

export type HeatCapacityGuideRollbackCueAction =
  | 'powerOn'
  | 'powerOff'
  | 'stopcockOpen'
  | 'stopcockClose'
  | 'pumpValveOpen'
  | 'pumpValveClose'
  | 'pumpBulbStroke'
  | 'knobTick';

export type HeatCapacityGuideRollbackCuePhase =
  | 'departure'
  | 'turnaround'
  | 'knobLeftPeak'
  | 'knobRightPeak'
  | 'settled';

export type HeatCapacityGuideRollbackCue = {
  animation: HeatCapacityGuideRollbackAnimation;
  action: HeatCapacityGuideRollbackCueAction;
  phase: HeatCapacityGuideRollbackCuePhase;
  cycleKey: number;
};

type PendingRollbackCue = Omit<HeatCapacityGuideRollbackCue, 'cycleKey'>;

type HeatCapacityGuideRollbackTarget = {
  value: number;
  cue?: PendingRollbackCue;
};

export type HeatCapacityGuideRollbackPlan = {
  targets: readonly HeatCapacityGuideRollbackTarget[];
  startCue?: PendingRollbackCue;
  interruptCue?: PendingRollbackCue;
  stiffness?: number;
  damping?: number;
  positionTolerance?: number;
  velocityTolerance?: number;
  maxStageDurationMs?: number;
  minValue?: number;
  maxValue?: number;
};

export const HEAT_CAPACITY_BLOCKED_VALVE_TRAVEL_DEG = 30;
export const HEAT_CAPACITY_BLOCKED_PUMP_BULB_COMPRESSION = 0.45;
export const HEAT_CAPACITY_BLOCKED_KNOB_LEFT_TRAVEL_DEG = -20;
export const HEAT_CAPACITY_BLOCKED_KNOB_RIGHT_TRAVEL_DEG = 10;

const DEFAULT_STIFFNESS = 420;
const DEFAULT_DAMPING = 38;
const DEFAULT_POSITION_TOLERANCE = 0.012;
const DEFAULT_VELOCITY_TOLERANCE = 0.16;
const DEFAULT_MAX_STAGE_DURATION_MS = 260;
const MAX_INTEGRATION_STEP_S = 1 / 120;

const withCycleKey = (
  cue: PendingRollbackCue | undefined,
  cycleKey: number,
): HeatCapacityGuideRollbackCue[] => cue ? [{ ...cue, cycleKey }] : [];

export const createHeatCapacityBinaryRollbackPlan = ({
  animation,
  amplitude,
  departureAction,
  returnAction,
}: {
  animation: 'valveBounce' | 'stopcockBounce' | 'powerBounce';
  amplitude: number;
  departureAction: HeatCapacityGuideRollbackCueAction;
  returnAction: HeatCapacityGuideRollbackCueAction;
}): HeatCapacityGuideRollbackPlan => ({
  startCue: {
    animation,
    action: departureAction,
    phase: 'departure',
  },
  interruptCue: {
    animation,
    action: returnAction,
    phase: 'turnaround',
  },
  targets: [
    {
      value: amplitude,
      cue: {
        animation,
        action: returnAction,
        phase: 'turnaround',
      },
    },
    { value: 0 },
  ],
  minValue: Math.min(0, amplitude),
  maxValue: Math.max(0, amplitude),
});

export const createHeatCapacityKnobRollbackPlan = (
  angleScale = 1,
): HeatCapacityGuideRollbackPlan => ({
  targets: [
    {
      value: HEAT_CAPACITY_BLOCKED_KNOB_LEFT_TRAVEL_DEG * angleScale,
      cue: {
        animation: 'knobBounce',
        action: 'knobTick',
        phase: 'knobLeftPeak',
      },
    },
    {
      value: HEAT_CAPACITY_BLOCKED_KNOB_RIGHT_TRAVEL_DEG * angleScale,
      cue: {
        animation: 'knobBounce',
        action: 'knobTick',
        phase: 'knobRightPeak',
      },
    },
    {
      value: 0,
      cue: {
        animation: 'knobBounce',
        action: 'knobTick',
        phase: 'settled',
      },
    },
  ],
  stiffness: 520,
  damping: 42,
  maxStageDurationMs: 220,
  minValue: HEAT_CAPACITY_BLOCKED_KNOB_LEFT_TRAVEL_DEG * angleScale,
  maxValue: HEAT_CAPACITY_BLOCKED_KNOB_RIGHT_TRAVEL_DEG * angleScale,
});

export const createHeatCapacityPumpBulbRollbackPlan = (): HeatCapacityGuideRollbackPlan => ({
  startCue: {
    animation: 'pumpBulbBounce',
    action: 'pumpBulbStroke',
    phase: 'departure',
  },
  interruptCue: {
    animation: 'pumpBulbBounce',
    action: 'pumpBulbStroke',
    phase: 'turnaround',
  },
  targets: [
    { value: HEAT_CAPACITY_BLOCKED_PUMP_BULB_COMPRESSION },
    { value: 0 },
  ],
  stiffness: 480,
  damping: 40,
  maxStageDurationMs: 220,
  minValue: 0,
  maxValue: HEAT_CAPACITY_BLOCKED_PUMP_BULB_COMPRESSION,
});

export class HeatCapacityGuideRollbackMotion {
  private value = 0;
  private velocity = 0;
  private plan: HeatCapacityGuideRollbackPlan | null = null;
  private targetIndex = 0;
  private stageElapsedMs = 0;
  private cycleKey = 0;
  private active = false;

  trigger(cycleKey: number, plan: HeatCapacityGuideRollbackPlan) {
    if (!Number.isFinite(cycleKey) || cycleKey <= 0 || cycleKey === this.cycleKey) return [];
    this.cycleKey = cycleKey;
    if (this.active && this.plan) {
      const finalTargetIndex = this.plan.targets.length - 1;
      if (this.targetIndex < finalTargetIndex) {
        const cues = withCycleKey(this.plan.interruptCue, cycleKey);
        this.targetIndex = finalTargetIndex;
        this.stageElapsedMs = 0;
        return cues;
      }
      return [];
    }
    this.plan = plan;
    this.targetIndex = 0;
    this.stageElapsedMs = 0;
    this.active = plan.targets.length > 0;
    return withCycleKey(plan.startCue, cycleKey);
  }

  step(deltaS: number) {
    const cues: HeatCapacityGuideRollbackCue[] = [];
    if (!this.active || !this.plan) return { value: this.value, active: false, cues };
    const safeDeltaS = Number.isFinite(deltaS) ? Math.min(0.05, Math.max(0, deltaS)) : 0;
    let remainingS = safeDeltaS;
    const target = this.plan.targets[this.targetIndex];
    const stiffness = this.plan.stiffness ?? DEFAULT_STIFFNESS;
    const damping = this.plan.damping ?? DEFAULT_DAMPING;
    while (remainingS > 0) {
      const stepS = Math.min(MAX_INTEGRATION_STEP_S, remainingS);
      const acceleration = stiffness * (target.value - this.value) - damping * this.velocity;
      this.velocity += acceleration * stepS;
      this.value += this.velocity * stepS;
      if (this.plan.minValue !== undefined) this.value = Math.max(this.plan.minValue, this.value);
      if (this.plan.maxValue !== undefined) this.value = Math.min(this.plan.maxValue, this.value);
      remainingS -= stepS;
    }
    this.stageElapsedMs += safeDeltaS * 1000;
    const positionTolerance = this.plan.positionTolerance ?? DEFAULT_POSITION_TOLERANCE;
    const velocityTolerance = this.plan.velocityTolerance ?? DEFAULT_VELOCITY_TOLERANCE;
    const maxStageDurationMs = this.plan.maxStageDurationMs ?? DEFAULT_MAX_STAGE_DURATION_MS;
    const stageReached = (
      Math.abs(target.value - this.value) <= positionTolerance &&
      Math.abs(this.velocity) <= velocityTolerance
    ) || this.stageElapsedMs >= maxStageDurationMs;
    if (stageReached) {
      this.value = target.value;
      this.velocity = 0;
      cues.push(...withCycleKey(target.cue, this.cycleKey));
      this.targetIndex += 1;
      this.stageElapsedMs = 0;
      if (this.targetIndex >= this.plan.targets.length) {
        this.active = false;
        this.plan = null;
      }
    }
    return { value: this.value, active: this.active, cues };
  }

  getSnapshot() {
    return {
      value: this.value,
      velocity: this.velocity,
      active: this.active,
      cycleKey: this.cycleKey,
      targetIndex: this.targetIndex,
    };
  }
}

export const useHeatCapacityGuideRollbackMotion = ({
  active,
  cycleKey,
  plan,
  onCue,
  onFrame,
}: {
  active: boolean;
  cycleKey: number;
  plan: HeatCapacityGuideRollbackPlan;
  onCue: (cue: HeatCapacityGuideRollbackCue) => void;
  onFrame?: () => void;
}) => {
  const [value, setValue] = useState(0);
  const motionRef = useRef(new HeatCapacityGuideRollbackMotion());
  const frameIdRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef<number | null>(null);
  const onCueRef = useRef(onCue);
  const onFrameRef = useRef(onFrame);
  onCueRef.current = onCue;
  onFrameRef.current = onFrame;

  const requestMotionFrameRef = useRef<() => void>(() => undefined);
  requestMotionFrameRef.current = () => {
    if (frameIdRef.current !== null) return;
    frameIdRef.current = window.requestAnimationFrame((timestamp) => {
      frameIdRef.current = null;
      const previousTimestamp = lastFrameAtRef.current ?? timestamp;
      lastFrameAtRef.current = timestamp;
      const result = motionRef.current.step((timestamp - previousTimestamp) / 1000);
      setValue(result.value);
      result.cues.forEach((cue) => onCueRef.current(cue));
      onFrameRef.current?.();
      if (result.active) requestMotionFrameRef.current();
      else lastFrameAtRef.current = null;
    });
  };

  useEffect(() => {
    if (!active || cycleKey <= 0) return;
    const cues = motionRef.current.trigger(cycleKey, plan);
    cues.forEach((cue) => onCueRef.current(cue));
    requestMotionFrameRef.current();
  }, [active, cycleKey, plan]);

  useEffect(() => () => {
    if (frameIdRef.current !== null) window.cancelAnimationFrame(frameIdRef.current);
  }, []);

  return value;
};
