export const HEAT_CAPACITY_VIDEO_PROFILE = {
  initialTemperatureMvRange: [1498.8, 1499.3] as const,
  initialPressureOffsetMvRange: [0.3, 1.5] as const,
  pumpPressureIncrementSuitableMvRange: [10, 25] as const,
  pumpPressureIncrementTooSlowMvRange: [2, 6] as const,
  pumpPeakPressureMvRange: [115, 130] as const,
  stablePressureMvRange: [110, 120] as const,
  stableTemperatureMvRange: [1525, 1527] as const,
  releasePressureMvRange: [-0.05, 0.1] as const,
  releaseTemperatureMvRange: [1499, 1502] as const,
  recoveryPressureMvRange: [31, 33] as const,
  recoveryTemperatureMvRange: [1520, 1524] as const,
};

export interface HeatCapacityDisplayResponseConfig {
  riseRate: number;
  fallRate: number;
  overshootRatio: number;
  overshootLimitMv: number;
  settleNoiseAmplitude: number;
  jitterSeed: number;
}

export const HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE: HeatCapacityDisplayResponseConfig = {
  riseRate: 11.5,
  fallRate: 24,
  overshootRatio: 0.025,
  overshootLimitMv: 0.05,
  settleNoiseAmplitude: 0.025,
  jitterSeed: 1.4,
};

export const HEAT_CAPACITY_TEMPERATURE_DISPLAY_RESPONSE: HeatCapacityDisplayResponseConfig = {
  riseRate: 1.18,
  fallRate: 0.92,
  overshootRatio: 0.004,
  overshootLimitMv: 0.18,
  settleNoiseAmplitude: 0.035,
  jitterSeed: 4.2,
};

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getHeatCapacityRangeMidpoint = (range: readonly [number, number]) => (
  (range[0] + range[1]) / 2
);

export const getHeatCapacityRangeValue = (
  range: readonly [number, number],
  fraction: number,
) => range[0] + clampNumber(fraction, 0, 1) * (range[1] - range[0]);

const getHeatCapacityDisplayJitter = (
  now: number,
  amplitude: number,
  seed: number,
) => (
  Math.sin(now / (117 + seed * 19) + seed) * amplitude
  + Math.sin(now / (211 + seed * 23) + seed * 2.7) * amplitude * 0.38
);

export const getHeatCapacityDisplayValue = ({
  current,
  target,
  previousTarget,
  elapsedS,
  now,
  config,
}: {
  current: number | null;
  target: number;
  previousTarget: number;
  elapsedS: number;
  now: number;
  config: HeatCapacityDisplayResponseConfig;
}) => {
  if (current === null || !Number.isFinite(current)) return target;
  const displayDt = clampNumber(elapsedS, 0, 0.18);
  const delta = target - current;
  const rate = delta >= 0 ? config.riseRate : config.fallRate;
  const response = 1 - Math.exp(-rate * displayDt);
  const targetDelta = target - previousTarget;
  const rawOvershoot = Math.abs(targetDelta) > 0.4
    && Math.sign(targetDelta) === Math.sign(delta)
    && Math.abs(delta) < Math.abs(targetDelta) * 0.22
    ? targetDelta * config.overshootRatio
    : 0;
  const overshoot = clampNumber(rawOvershoot, -config.overshootLimitMv, config.overshootLimitMv);
  let nextValue = current + delta * response + overshoot;

  if (Math.abs(target - nextValue) <= Math.max(0.08, Math.abs(target) * 0.00012)) {
    nextValue = target + getHeatCapacityDisplayJitter(
      now,
      config.settleNoiseAmplitude,
      config.jitterSeed,
    );
  }

  return nextValue;
};
