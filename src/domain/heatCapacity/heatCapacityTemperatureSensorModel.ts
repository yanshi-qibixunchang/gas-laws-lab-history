export interface HeatCapacityTemperatureSensorConfig {
  tauSensorS: number;
}

export interface HeatCapacityTemperatureSensorState {
  temperatureK: number;
}

export interface HeatCapacityTemperatureSensorStepInput {
  gasTemperatureK: number;
  dtS: number;
  speedMultiplier?: number;
}

export const DEFAULT_HEAT_CAPACITY_TEMPERATURE_SENSOR_CONFIG: HeatCapacityTemperatureSensorConfig = {
  tauSensorS: 0.8,
};

const normalizePositiveFinite = (value: number | undefined, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

const normalizeNonNegativeFinite = (value: number | undefined, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
);

export const createHeatCapacityTemperatureSensorState = (
  temperatureK: number,
): HeatCapacityTemperatureSensorState => ({ temperatureK });

export const stepHeatCapacityTemperatureSensor = (
  state: HeatCapacityTemperatureSensorState,
  input: HeatCapacityTemperatureSensorStepInput,
  config: Partial<HeatCapacityTemperatureSensorConfig> = {},
): HeatCapacityTemperatureSensorState => {
  const dtS = normalizeNonNegativeFinite(input.dtS, 0);
  const speedMultiplier = normalizeNonNegativeFinite(input.speedMultiplier, 1);
  const effectiveDtS = dtS * speedMultiplier;
  if (effectiveDtS <= 0 || !Number.isFinite(input.gasTemperatureK)) {
    return state;
  }

  const tauSensorS = normalizePositiveFinite(
    config.tauSensorS,
    DEFAULT_HEAT_CAPACITY_TEMPERATURE_SENSOR_CONFIG.tauSensorS,
  );
  const responseFraction = -Math.expm1(-effectiveDtS / tauSensorS);

  return {
    temperatureK: state.temperatureK +
      (input.gasTemperatureK - state.temperatureK) * responseFraction,
  };
};
