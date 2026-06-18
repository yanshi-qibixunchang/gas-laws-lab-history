export interface HeatCapacityFreeLeakageConfig {
  enabled: boolean;
  ratePerS: number;
}

export interface HeatCapacityFreeLeakageStepInput {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  dtS: number;
}

const DEFAULT_LEAKAGE_CONFIG: HeatCapacityFreeLeakageConfig = {
  enabled: false,
  ratePerS: 0.00005,
};

const clampFinite = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
);

const positiveFiniteOrZero = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

const positiveFiniteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) && value > 0 ? value : fallback
);

export const normalizeFreeLeakageConfig = (
  value: Partial<HeatCapacityFreeLeakageConfig> | null | undefined,
): HeatCapacityFreeLeakageConfig => {
  if (value?.ratePerS !== undefined && !Number.isFinite(value.ratePerS)) {
    return { ...DEFAULT_LEAKAGE_CONFIG };
  }
  return {
    enabled: value?.enabled === true,
    ratePerS: clampFinite(value?.ratePerS ?? DEFAULT_LEAKAGE_CONFIG.ratePerS, 0, 0.02, DEFAULT_LEAKAGE_CONFIG.ratePerS),
  };
};

export const stepFreeLeakageAmountRatio = (
  amountRatio: number,
  config: HeatCapacityFreeLeakageConfig,
  input: HeatCapacityFreeLeakageStepInput,
) => {
  const currentAmountRatio = positiveFiniteOrFallback(amountRatio, 1);
  const safeConfig = normalizeFreeLeakageConfig(config);
  if (!safeConfig.enabled || safeConfig.ratePerS <= 0) {
    return currentAmountRatio;
  }

  const ambientPressureKPa = positiveFiniteOrFallback(input.ambientPressureKPa, 101.3);
  const ambientTemperatureK = positiveFiniteOrFallback(input.ambientTemperatureK, 298.15);
  const gasTemperatureK = positiveFiniteOrFallback(input.gasTemperatureK, ambientTemperatureK);
  const inputAmountRatio = positiveFiniteOrFallback(input.gasAmountRatio, currentAmountRatio);
  const gasPressureKPa = ambientPressureKPa * inputAmountRatio * (gasTemperatureK / ambientTemperatureK);
  const pressureRatio = gasPressureKPa / ambientPressureKPa;
  const pressureDrive = Math.sign(pressureRatio - 1) *
    Math.abs(pressureRatio * pressureRatio - 1);
  if (Math.abs(pressureDrive) <= 0) {
    return currentAmountRatio;
  }

  const equilibriumAmountRatio = ambientTemperatureK / gasTemperatureK;
  const maxStepRatio = safeConfig.ratePerS *
    Math.abs(pressureDrive) *
    positiveFiniteOrZero(input.dtS);
  if (pressureDrive > 0) {
    return Math.max(equilibriumAmountRatio, currentAmountRatio - maxStepRatio);
  }
  return Math.min(equilibriumAmountRatio, currentAmountRatio + maxStepRatio);
};
