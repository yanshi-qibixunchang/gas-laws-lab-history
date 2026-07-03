import {
  DEFAULT_HEAT_CAPACITY_MODEL_CONFIG,
} from './heatCapacityExperimentModel.ts';
import type {
  HeatCapacityFreeEnvironmentConfig,
  HeatCapacityFreePhysicsConfig,
} from './heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from './heatCapacityFreeRecordModel.ts';
import type {
  HeatCapacityFreeSensorConfig,
} from './heatCapacityFreeSensorModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG,
} from './heatCapacityFreeEnvironmentDisturbanceModel.ts';
import type {
  HeatCapacityFreeEnvironmentDisturbanceConfig,
} from './heatCapacityFreeEnvironmentDisturbanceModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_PRESSURE_SENSOR_NONLINEARITY_CONFIG,
} from './heatCapacityFreePressureSensorNonlinearityModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG,
} from './heatCapacityFreePumpValveExchangeModel.ts';
import type {
  HeatCapacityFreePumpValveExchangeConfig,
} from './heatCapacityFreePumpValveExchangeModel.ts';
import type {
  HeatCapacityFreeLeakageConfig,
} from './heatCapacityFreeLeakageModel.ts';
import type {
  HeatCapacityFreeThermalConfig,
} from './heatCapacityFreeThermalModel.ts';
import type {
  HeatCapacityGuidePhysicsConfig,
} from './heatCapacityGuidePhysicsEngine.ts';

export const HEAT_CAPACITY_TUNED_EFFECTIVE_PUMP_STROKE_VOLUME_L = 0.0069;

export const HEAT_CAPACITY_GUIDE_FIXED_PUMP_TARGET_MV = 120;
export const HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV = 0.75;
export const HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV = 0;
export const HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV = HEAT_CAPACITY_GUIDE_FIXED_PUMP_TARGET_MV;
export const HEAT_CAPACITY_AUTO_DEMO_RESULT_U2_MV = 33.46;
export const HEAT_CAPACITY_AUTO_DEMO_RESULT_GAMMA = 1.398;
export const HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV = 1499;

export const HEAT_CAPACITY_STANDARD_OPERATION = {
  pumpStrokes: 18,
  pumpTotalDurationS: 12,
  waitAfterPumpS: 300,
  openDurationS: 0.35,
  waitAfterReleaseS: 300,
} as const;

export interface HeatCapacityCorePhysicsDefaults {
  environment: HeatCapacityFreeEnvironmentConfig;
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpPressureLimitKPa: number;
  stopcockFlowRate: number;
  thermal: HeatCapacityFreeThermalConfig;
}

export const createDefaultHeatCapacityEnvironmentConfig = (): HeatCapacityFreeEnvironmentConfig => ({
  ambientPressureKPa: 101.3,
  ambientTemperatureK: 298.15,
});

export const createDefaultHeatCapacityThermalConfig = (): HeatCapacityFreeThermalConfig => ({
  gasWallConductanceWPerK: 0.14,
  wallAmbientConductanceWPerK: 0.45,
  wallHeatCapacityJPerK: 45,
  minimumGasHeatCapacityJPerK: 0.1,
});

export const createDefaultHeatCapacityCorePhysicsDefaults = (): HeatCapacityCorePhysicsDefaults => ({
  environment: createDefaultHeatCapacityEnvironmentConfig(),
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.00345,
  pumpPressureLimitKPa: 109,
  stopcockFlowRate: 5.25,
  thermal: createDefaultHeatCapacityThermalConfig(),
});

export const createDefaultHeatCapacityFreeLeakageConfig = (): HeatCapacityFreeLeakageConfig => ({
  enabled: true,
  ratePerS: 0.00005,
});

export const createDefaultHeatCapacityFreePumpValveExchangeConfig = (): HeatCapacityFreePumpValveExchangeConfig => ({
  ...DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG,
  enabled: true,
  gasExchangeRatePerS: 0.005,
  thermalConductanceWPerK: 0.004,
  openingDelayS: 0.42,
});

export const createDefaultHeatCapacityFreeEnvironmentDisturbanceConfig =
  (): HeatCapacityFreeEnvironmentDisturbanceConfig => ({
    ...DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG,
    enabled: true,
  });

export const createDefaultHeatCapacityFreePhysicsConfig = (): HeatCapacityFreePhysicsConfig => {
  const core = createDefaultHeatCapacityCorePhysicsDefaults();
  return {
    environment: core.environment,
    vesselVolumeL: core.vesselVolumeL,
    gamma: core.gamma,
    pumpAmountGainRatio: core.pumpAmountGainRatio,
    pumpPressureLimitKPa: core.pumpPressureLimitKPa,
    stopcockFlowRate: core.stopcockFlowRate,
    thermal: core.thermal,
    pumpValveExchange: createDefaultHeatCapacityFreePumpValveExchangeConfig(),
    environmentDisturbance: createDefaultHeatCapacityFreeEnvironmentDisturbanceConfig(),
    leakage: createDefaultHeatCapacityFreeLeakageConfig(),
  };
};

export const createDefaultHeatCapacityFreeSensorConfig = (): HeatCapacityFreeSensorConfig => ({
  pressureMvPerKPa: DEFAULT_HEAT_CAPACITY_MODEL_CONFIG.sensor.pressureSensitivityMvPerKPa,
  temperatureMvAtAmbient: DEFAULT_HEAT_CAPACITY_MODEL_CONFIG.sensor.temperatureBaseMv,
  temperatureMvPerK: 2,
  lagRate: 8,
  noiseMv: 0.04,
  quantizationMv: 0.01,
  minSampleIntervalS: 0.08,
  maxSampleIntervalS: 0.12,
  historyWindowS: 2,
  pressureNonlinearity: {
    ...DEFAULT_HEAT_CAPACITY_FREE_PRESSURE_SENSOR_NONLINEARITY_CONFIG,
    enabled: true,
    kneeMv: 15,
    minGain: 0.65,
    exponent: 1.4,
  },
});

export const createDefaultHeatCapacityFreeRecordConfig = (): HeatCapacityFreeRecordConfig => ({
  u0ZeroToleranceMv: 0.12,
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  minimumUsefulU1CorrectedMv: 90,
  overVentedMinimumU2CorrectedMv: 0.2,
  pressureDangerMv: 140,
});

export const HEAT_CAPACITY_DEFAULT_PRESSURE_WARNING_MV = 120;

export const createDefaultHeatCapacityGuidePhysicsConfig = (): HeatCapacityGuidePhysicsConfig => {
  const core = createDefaultHeatCapacityCorePhysicsDefaults();
  return {
    environment: core.environment,
    vesselVolumeL: core.vesselVolumeL,
    gamma: core.gamma,
    pumpAmountGainRatio: core.pumpAmountGainRatio,
    pumpPressureLimitKPa: core.pumpPressureLimitKPa,
    stopcockFlowRate: core.stopcockFlowRate,
    thermal: core.thermal,
  };
};
