export interface HeatCapacityFreeEnvironmentDisturbanceConfig {
  enabled: boolean;
  pressureAmplitudeKPa: number;
  temperatureAmplitudeK: number;
  timeScaleS: number;
}

export interface HeatCapacityFreeEnvironmentDisturbanceInput {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  timeS: number;
  seed: number | string;
}

export interface HeatCapacityFreeEnvironmentDisturbanceSample {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  pressureOffsetKPa: number;
  temperatureOffsetK: number;
}

export const DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG: HeatCapacityFreeEnvironmentDisturbanceConfig = {
  enabled: false,
  pressureAmplitudeKPa: 0.002,
  temperatureAmplitudeK: 0.015,
  timeScaleS: 180,
};

const TWO_PI = Math.PI * 2;

const finiteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) ? value : fallback
);

const positiveFiniteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) && value > 0 ? value : fallback
);

const nonNegativeFiniteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) && value >= 0 ? value : fallback
);

const clampFinite = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
);

const hashSeededValue = (
  seed: number | string,
  channel: string,
) => {
  const text = `${seed}:${channel}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1_000_000) / 1_000_000;
};

export const normalizeFreeEnvironmentDisturbanceConfig = (
  value: Partial<HeatCapacityFreeEnvironmentDisturbanceConfig> | null | undefined,
): HeatCapacityFreeEnvironmentDisturbanceConfig => {
  if (
    value?.pressureAmplitudeKPa !== undefined &&
    !Number.isFinite(value.pressureAmplitudeKPa)
  ) {
    return { ...DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG };
  }
  return {
    enabled: value?.enabled === true,
    pressureAmplitudeKPa: clampFinite(
      value?.pressureAmplitudeKPa ?? DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG.pressureAmplitudeKPa,
      0,
      1,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG.pressureAmplitudeKPa,
    ),
    temperatureAmplitudeK: clampFinite(
      value?.temperatureAmplitudeK ?? DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG.temperatureAmplitudeK,
      0,
      5,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG.temperatureAmplitudeK,
    ),
    timeScaleS: clampFinite(
      value?.timeScaleS ?? DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG.timeScaleS,
      1,
      3600,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG.timeScaleS,
    ),
  };
};

const sampleSmoothUnit = (
  seed: number | string,
  channel: string,
  timeS: number,
  timeScaleS: number,
) => {
  const phaseA = hashSeededValue(seed, `${channel}:phase-a`) * TWO_PI;
  const phaseB = hashSeededValue(seed, `${channel}:phase-b`) * TWO_PI;
  const rateJitter = 0.75 + hashSeededValue(seed, `${channel}:rate`) * 0.5;
  const primary = Math.sin((timeS / timeScaleS) * TWO_PI * rateJitter + phaseA);
  const secondary = 0.35 * Math.sin((timeS / (timeScaleS * 0.41)) * TWO_PI + phaseB);
  return Math.max(-1, Math.min(1, (primary + secondary) / 1.35));
};

export const sampleFreeEnvironmentDisturbance = (
  config: HeatCapacityFreeEnvironmentDisturbanceConfig,
  input: HeatCapacityFreeEnvironmentDisturbanceInput,
): HeatCapacityFreeEnvironmentDisturbanceSample => {
  const safeConfig = normalizeFreeEnvironmentDisturbanceConfig(config);
  const basePressureKPa = positiveFiniteOrFallback(input.ambientPressureKPa, 101.3);
  const baseTemperatureK = positiveFiniteOrFallback(input.ambientTemperatureK, 298.15);
  if (!safeConfig.enabled) {
    return {
      ambientPressureKPa: basePressureKPa,
      ambientTemperatureK: baseTemperatureK,
      pressureOffsetKPa: 0,
      temperatureOffsetK: 0,
    };
  }

  const timeS = nonNegativeFiniteOrFallback(input.timeS, 0);
  const timeScaleS = positiveFiniteOrFallback(safeConfig.timeScaleS, 180);
  const pressureOffsetKPa = safeConfig.pressureAmplitudeKPa *
    sampleSmoothUnit(input.seed, 'pressure', timeS, timeScaleS);
  const temperatureOffsetK = safeConfig.temperatureAmplitudeK *
    sampleSmoothUnit(input.seed, 'temperature', timeS, timeScaleS * 1.21);
  return {
    ambientPressureKPa: Math.max(0.001, basePressureKPa + finiteOrFallback(pressureOffsetKPa, 0)),
    ambientTemperatureK: Math.max(0.001, baseTemperatureK + finiteOrFallback(temperatureOffsetK, 0)),
    pressureOffsetKPa: finiteOrFallback(pressureOffsetKPa, 0),
    temperatureOffsetK: finiteOrFallback(temperatureOffsetK, 0),
  };
};
