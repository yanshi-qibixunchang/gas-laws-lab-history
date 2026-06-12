export interface HeatCapacityHardSphereKineticSpeedState {
  speed: number;
  releaseMemoryRemainingS: number;
}

export interface HeatCapacityHardSphereKineticSpeedStepInput {
  currentSpeed: number;
  targetSpeed: number;
  releaseMemoryRemainingS: number;
  releaseActive: boolean;
  dtS: number;
}

const SPEED_MIN = 0.1;
const SPEED_MAX = 3;
const RELEASE_KINETIC_MEMORY_S = 1.45;
const RELEASE_COOLDOWN_RESPONSE_S = 1.75;
const ORDINARY_COOLDOWN_RESPONSE_S = 0.45;
const WARMUP_RESPONSE_S = 0.22;

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const finiteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) ? value : fallback
);

export const stepHeatCapacityHardSphereKineticSpeed = (
  input: HeatCapacityHardSphereKineticSpeedStepInput,
): HeatCapacityHardSphereKineticSpeedState => {
  const dtS = clampNumber(finiteOrFallback(input.dtS, 0), 0, 2);
  const targetSpeed = clampNumber(finiteOrFallback(input.targetSpeed, 1), SPEED_MIN, SPEED_MAX);
  const currentSpeed = clampNumber(finiteOrFallback(input.currentSpeed, targetSpeed), SPEED_MIN, SPEED_MAX);
  const releaseMemoryRemainingS = input.releaseActive
    ? RELEASE_KINETIC_MEMORY_S
    : clampNumber(finiteOrFallback(input.releaseMemoryRemainingS, 0) - dtS, 0, RELEASE_KINETIC_MEMORY_S);
  const responseS = targetSpeed >= currentSpeed
    ? WARMUP_RESPONSE_S
    : releaseMemoryRemainingS > 0
      ? RELEASE_COOLDOWN_RESPONSE_S
      : ORDINARY_COOLDOWN_RESPONSE_S;
  const alpha = responseS > 0
    ? 1 - Math.exp(-dtS / responseS)
    : 1;

  return {
    speed: currentSpeed + (targetSpeed - currentSpeed) * alpha,
    releaseMemoryRemainingS,
  };
};
