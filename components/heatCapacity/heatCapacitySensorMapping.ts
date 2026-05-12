export interface HeatCapacitySensorMappingConfig {
  pressureSensitivityMvPerKPa: number;
  temperatureBaseMv: number;
  temperatureSensitivityMvPerK: number;
  noiseStdDevMv: number;
}

export interface HeatCapacitySignalInput {
  ambientTemperatureK: number;
  gasTemperatureK: number;
  pressureDeltaKPa: number;
  pressureZeroOffset: number;
  config?: Partial<HeatCapacitySensorMappingConfig>;
}

export interface HeatCapacityMappedSignals {
  pressureSignalMvRaw: number;
  pressureSignalMvDisplayed: number;
  temperatureSignalMv: number;
}

export const DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG: HeatCapacitySensorMappingConfig = {
  pressureSensitivityMvPerKPa: 20,
  temperatureBaseMv: 1500,
  temperatureSensitivityMvPerK: 4,
  noiseStdDevMv: 0,
};

const roundSignal = (value: number, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const mergeConfig = (
  config?: Partial<HeatCapacitySensorMappingConfig>,
): HeatCapacitySensorMappingConfig => ({
  ...DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG,
  ...config,
});

export const applyPressureZero = (
  rawPressureMv: number,
  pressureZeroOffset: number,
) => roundSignal(rawPressureMv - pressureZeroOffset);

export const mapPressureDeltaToSignalMv = (
  pressureDeltaKPa: number,
  config?: Partial<HeatCapacitySensorMappingConfig>,
) => {
  const mergedConfig = mergeConfig(config);
  return roundSignal(pressureDeltaKPa * mergedConfig.pressureSensitivityMvPerKPa);
};

export const mapGasTemperatureToSignalMv = (
  gasTemperatureK: number,
  ambientTemperatureK: number,
  config?: Partial<HeatCapacitySensorMappingConfig>,
) => {
  const mergedConfig = mergeConfig(config);
  return roundSignal(
    mergedConfig.temperatureBaseMv +
      mergedConfig.temperatureSensitivityMvPerK * (gasTemperatureK - ambientTemperatureK),
  );
};

export const mapHeatCapacitySignals = ({
  ambientTemperatureK,
  gasTemperatureK,
  pressureDeltaKPa,
  pressureZeroOffset,
  config,
}: HeatCapacitySignalInput): HeatCapacityMappedSignals => {
  const pressureSignalMvRaw = mapPressureDeltaToSignalMv(pressureDeltaKPa, config);
  const pressureSignalMvDisplayed = applyPressureZero(pressureSignalMvRaw, pressureZeroOffset);
  const temperatureSignalMv = mapGasTemperatureToSignalMv(gasTemperatureK, ambientTemperatureK, config);

  return {
    pressureSignalMvRaw,
    pressureSignalMvDisplayed,
    temperatureSignalMv,
  };
};
