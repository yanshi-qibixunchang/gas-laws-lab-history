export interface HeatCapacityFreePressureSensorNonlinearityConfig {
  enabled: boolean;
  kneeMv: number;
  minGain: number;
  exponent: number;
  extraNoiseMv: number;
}

export interface HeatCapacityFreePressureSensorNonlinearityResult {
  pressureMv: number;
  reliability: number;
  nonlinearErrorMv: number;
  stochasticErrorMv: number;
}

export const DEFAULT_HEAT_CAPACITY_FREE_PRESSURE_SENSOR_NONLINEARITY_CONFIG: HeatCapacityFreePressureSensorNonlinearityConfig = {
  enabled: false,
  kneeMv: 70,
  minGain: 0.72,
  exponent: 1.8,
  extraNoiseMv: 0.08,
};

const LOW_SIGNAL_RESPONSE_SHARPNESS = 1.35;

const finiteOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const finitePositiveOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

const finiteUnitOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : fallback
);

const hashSeededValue = (
  seed: number | string,
  sampleIndex: number,
  channel: string,
) => {
  const text = `${seed}:${sampleIndex}:${channel}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
};

const clampUnit = (value: number) => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
);

export const normalizeFreePressureSensorNonlinearityConfig = (
  value: Partial<HeatCapacityFreePressureSensorNonlinearityConfig> | null | undefined,
): HeatCapacityFreePressureSensorNonlinearityConfig => {
  const fallback = DEFAULT_HEAT_CAPACITY_FREE_PRESSURE_SENSOR_NONLINEARITY_CONFIG;
  return {
    enabled: value?.enabled === true,
    kneeMv: finitePositiveOr(value?.kneeMv, fallback.kneeMv),
    minGain: finiteUnitOr(value?.minGain, fallback.minGain),
    exponent: finitePositiveOr(value?.exponent, fallback.exponent),
    extraNoiseMv: Math.max(0, finiteOr(value?.extraNoiseMv, fallback.extraNoiseMv)),
  };
};

export const applyFreePressureSensorNonlinearity = (
  rawPressureMv: number,
  config: HeatCapacityFreePressureSensorNonlinearityConfig,
  seedInput?: { seed: number | string; sampleIndex: number },
): HeatCapacityFreePressureSensorNonlinearityResult => {
  const raw = finiteOr(rawPressureMv, 0);
  const safeConfig = normalizeFreePressureSensorNonlinearityConfig(config);
  if (!safeConfig.enabled) {
    return {
      pressureMv: raw,
      reliability: 1,
      nonlinearErrorMv: 0,
      stochasticErrorMv: 0,
    };
  }

  const sign = raw < 0 ? -1 : 1;
  const absRaw = Math.abs(raw);
  if (absRaw === 0) {
    return {
      pressureMv: 0,
      reliability: safeConfig.minGain,
      nonlinearErrorMv: 0,
      stochasticErrorMv: 0,
    };
  }

  const relativeSignal = Math.pow(absRaw / safeConfig.kneeMv, safeConfig.exponent) *
    LOW_SIGNAL_RESPONSE_SHARPNESS;
  const reliability = clampUnit(
    safeConfig.minGain +
      (1 - safeConfig.minGain) * (1 - Math.exp(-relativeSignal)),
  );
  const nonlinearPressureMv = sign * absRaw * reliability;
  const nonlinearErrorMv = nonlinearPressureMv - raw;
  const lowSignalNoiseScale = safeConfig.minGain < 1
    ? safeConfig.extraNoiseMv * clampUnit((1 - reliability) / (1 - safeConfig.minGain))
    : 0;
  const stochasticErrorMv = seedInput
    ? (
      hashSeededValue(seedInput.seed, seedInput.sampleIndex, 'pressure-low-signal') - 0.5
    ) * 2 * lowSignalNoiseScale
    : 0;
  return {
    pressureMv: nonlinearPressureMv + stochasticErrorMv,
    reliability,
    nonlinearErrorMv,
    stochasticErrorMv,
  };
};
