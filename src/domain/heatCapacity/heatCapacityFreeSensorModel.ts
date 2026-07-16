import {
  type HeatCapacityFreeCalibrationState,
} from './heatCapacityFreeCalibrationModel.ts';
import {
  applyFreePressureSensorNonlinearity,
  normalizeFreePressureSensorNonlinearityConfig,
  type HeatCapacityFreePressureSensorNonlinearityConfig,
} from './heatCapacityFreePressureSensorNonlinearityModel.ts';
import {
  stepHeatCapacityTemperatureSensor,
} from './heatCapacityTemperatureSensorModel.ts';

export interface HeatCapacityFreeDisplaySample {
  atS: number;
  valueMv: number;
}

export interface HeatCapacityFreeSensorConfig {
  pressureMvPerKPa: number;
  temperatureMvAtAmbient: number;
  temperatureMvPerK: number;
  lagRate: number;
  noiseMv: number;
  quantizationMv: number;
  minSampleIntervalS: number;
  maxSampleIntervalS: number;
  historyWindowS: number;
  pressureNonlinearity?: HeatCapacityFreePressureSensorNonlinearityConfig;
}

export interface HeatCapacityFreePhysicalDisplayInput {
  gasPressureKPa: number;
  pressureDeltaKPa: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
}

export interface HeatCapacityFreeSensorState {
  seed: number | string;
  pressureInitialBiasMv: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  sensorTemperatureK: number;
  nextSampleAtS: number;
  pressureHistory: HeatCapacityFreeDisplaySample[];
  temperatureHistory: HeatCapacityFreeDisplaySample[];
  pressureSlopeMvPerS: number;
  temperatureSlopeMvPerS: number;
  pressureReliability: number;
  pressureNonlinearErrorMv: number;
  pressureStochasticErrorMv: number;
}

const SAMPLE_TIME_EPSILON_S = 0.000000001;

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

const quantize = (value: number, quantum: number) => {
  if (!Number.isFinite(quantum) || quantum <= 0) {
    return value;
  }
  return Number((Math.round(value / quantum) * quantum).toFixed(12));
};

export const createSeededFreePressureInitialBiasMv = (
  seed: number | string,
  rangeMv: number,
  minimumMagnitudeMv = 0.25,
) => {
  if (!Number.isFinite(rangeMv) || rangeMv <= 0) {
    return 0;
  }
  const signedValue = -rangeMv +
    hashSeededValue(seed, 0, 'initial-pressure-bias') * rangeMv * 2;
  const sign = signedValue < 0 ? -1 : 1;
  const magnitude = Math.min(
    rangeMv,
    Math.max(Math.abs(signedValue), Math.min(minimumMagnitudeMv, rangeMv)),
  );
  return quantize(sign * magnitude, 0.01);
};

const approach = (
  current: number,
  target: number,
  rate: number,
  dtS: number,
) => {
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(dtS) || dtS <= 0) {
    return current;
  }
  return current + (target - current) * (1 - Math.exp(-rate * dtS));
};

export const calculateFreeSensorHistorySlope = (history: HeatCapacityFreeDisplaySample[]) => {
  if (history.length < 2) {
    return 0;
  }
  const first = history[0];
  const last = history[history.length - 1];
  const elapsedS = last.atS - first.atS;
  if (elapsedS <= 0) {
    return 0;
  }
  return (last.valueMv - first.valueMv) / elapsedS;
};

const trimHistory = (
  history: HeatCapacityFreeDisplaySample[],
  atS: number,
  windowS: number,
) => history.filter((sample) => atS - sample.atS <= windowS);

const toTargetDisplay = (
  physical: HeatCapacityFreePhysicalDisplayInput,
  sensorTemperatureK: number,
  config: HeatCapacityFreeSensorConfig,
  pressureInitialBiasMv: number,
  seedInput?: { seed: number | string; sampleIndex: number },
) => {
  const rawPressureMv = physical.pressureDeltaKPa * config.pressureMvPerKPa;
  const pressureNonlinearity = applyFreePressureSensorNonlinearity(
    rawPressureMv,
    normalizeFreePressureSensorNonlinearityConfig(config.pressureNonlinearity),
    seedInput,
  );
  return {
    pressureMv: pressureNonlinearity.pressureMv + pressureInitialBiasMv,
    temperatureMv: config.temperatureMvAtAmbient +
      (sensorTemperatureK - physical.ambientTemperatureK) *
        config.temperatureMvPerK,
    pressureReliability: pressureNonlinearity.reliability,
    pressureNonlinearErrorMv: pressureNonlinearity.nonlinearErrorMv,
    pressureStochasticErrorMv: pressureNonlinearity.stochasticErrorMv,
  };
};

const getNextSampleIntervalS = (
  seed: number | string,
  sampleIndex: number,
  config: HeatCapacityFreeSensorConfig,
) => {
  const min = Math.min(config.minSampleIntervalS, config.maxSampleIntervalS);
  const max = Math.max(config.minSampleIntervalS, config.maxSampleIntervalS);
  if (max <= min) {
    return min;
  }
  return min + hashSeededValue(seed, sampleIndex, 'interval') * (max - min);
};

export const createDefaultFreeSensorState = (
  seed: number | string,
  initialDisplay: {
    pressureMv: number;
    pressureInitialBiasMv?: number;
    temperatureMv: number;
    sensorTemperatureK: number;
  },
): HeatCapacityFreeSensorState => ({
  seed,
  pressureInitialBiasMv: initialDisplay.pressureInitialBiasMv ?? initialDisplay.pressureMv,
  displayPressureMv: initialDisplay.pressureMv,
  displayTemperatureMv: initialDisplay.temperatureMv,
  sensorTemperatureK: initialDisplay.sensorTemperatureK,
  nextSampleAtS: 0,
  pressureHistory: [
    {
      atS: 0,
      valueMv: initialDisplay.pressureMv,
    },
  ],
  temperatureHistory: [
    {
      atS: 0,
      valueMv: initialDisplay.temperatureMv,
    },
  ],
  pressureSlopeMvPerS: 0,
  temperatureSlopeMvPerS: 0,
  pressureReliability: 1,
  pressureNonlinearErrorMv: 0,
  pressureStochasticErrorMv: 0,
});

export const stepFreeSensor = (
  state: HeatCapacityFreeSensorState,
  physical: HeatCapacityFreePhysicalDisplayInput,
  calibration: HeatCapacityFreeCalibrationState,
  config: HeatCapacityFreeSensorConfig,
  atS: number,
): HeatCapacityFreeSensorState => {
  if (atS + SAMPLE_TIME_EPSILON_S < state.nextSampleAtS) {
    return state;
  }

  const sampleIndex = state.pressureHistory.length;
  const lastSampleAtS = state.pressureHistory[state.pressureHistory.length - 1]?.atS ?? atS;
  const dtS = Math.max(0, atS - lastSampleAtS);
  void calibration;
  const sensorTemperatureK = stepHeatCapacityTemperatureSensor(
    {
      temperatureK: state.sensorTemperatureK,
    },
    {
      gasTemperatureK: physical.gasTemperatureK,
      dtS,
    },
  ).temperatureK;
  const target = toTargetDisplay(
    physical,
    sensorTemperatureK,
    config,
    state.pressureInitialBiasMv,
    { seed: state.seed, sampleIndex },
  );
  const pressureNoiseMv = (hashSeededValue(state.seed, sampleIndex, 'pressure') - 0.5) *
    2 *
    config.noiseMv;
  const temperatureNoiseMv = (hashSeededValue(state.seed, sampleIndex, 'temperature') - 0.5) *
    2 *
    config.noiseMv;
  const displayPressureMv = quantize(
    approach(state.displayPressureMv, target.pressureMv, config.lagRate, dtS) +
      pressureNoiseMv,
    config.quantizationMv,
  );
  const displayTemperatureMv = quantize(
    target.temperatureMv + temperatureNoiseMv,
    config.quantizationMv,
  );
  const pressureHistory = trimHistory(
    [
      ...state.pressureHistory,
      {
        atS,
        valueMv: displayPressureMv,
      },
    ],
    atS,
    config.historyWindowS,
  );
  const temperatureHistory = trimHistory(
    [
      ...state.temperatureHistory,
      {
        atS,
        valueMv: displayTemperatureMv,
      },
    ],
    atS,
    config.historyWindowS,
  );

  return {
    seed: state.seed,
    pressureInitialBiasMv: state.pressureInitialBiasMv,
    displayPressureMv,
    displayTemperatureMv,
    sensorTemperatureK,
    nextSampleAtS: atS + getNextSampleIntervalS(state.seed, sampleIndex, config),
    pressureHistory,
    temperatureHistory,
    pressureSlopeMvPerS: calculateFreeSensorHistorySlope(pressureHistory),
    temperatureSlopeMvPerS: calculateFreeSensorHistorySlope(temperatureHistory),
    pressureReliability: target.pressureReliability,
    pressureNonlinearErrorMv: target.pressureNonlinearErrorMv,
    pressureStochasticErrorMv: target.pressureStochasticErrorMv,
  };
};

export const getFreeSensorDisplay = (
  state: HeatCapacityFreeSensorState,
  calibration?: Pick<HeatCapacityFreeCalibrationState, 'zeroOffsetMv'> | null,
  config?: Pick<HeatCapacityFreeSensorConfig, 'quantizationMv'> | null,
) => ({
  displayPressureMv: quantize(
    state.displayPressureMv + (calibration?.zeroOffsetMv ?? 0),
    config?.quantizationMv ?? 0,
  ),
  displayTemperatureMv: state.displayTemperatureMv,
  pressureSlopeMvPerS: state.pressureSlopeMvPerS,
  temperatureSlopeMvPerS: state.temperatureSlopeMvPerS,
});
