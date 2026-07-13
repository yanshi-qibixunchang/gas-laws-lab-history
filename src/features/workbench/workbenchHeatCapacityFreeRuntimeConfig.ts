import {
  HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
  type HeatCapacityFreeEnvironmentConfig,
  type HeatCapacityFreePhysicsConfig,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import type { HeatCapacityFreeSensorConfig } from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  createDefaultHeatCapacityEnvironmentConfig,
  createDefaultHeatCapacityFreePhysicsConfig,
  createDefaultHeatCapacityFreeSensorConfig,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import { normalizeFreeThermalConfig } from '../../domain/heatCapacity/heatCapacityFreeThermalModel.ts';
import { normalizeFreeLeakageConfig } from '../../domain/heatCapacity/heatCapacityFreeLeakageModel.ts';
import { normalizeFreePumpValveExchangeConfig } from '../../domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts';
import { normalizeFreeEnvironmentDisturbanceConfig } from '../../domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts';
import { normalizeFreePressureSensorNonlinearityConfig } from '../../domain/heatCapacity/heatCapacityFreePressureSensorNonlinearityModel.ts';
import {
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
  HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
} from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';

export const DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG: HeatCapacityFreeEnvironmentConfig = {
  ...createDefaultHeatCapacityEnvironmentConfig(),
};
export const DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG: HeatCapacityFreePhysicsConfig =
  createDefaultHeatCapacityFreePhysicsConfig();
export const DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG: HeatCapacityFreeSensorConfig =
  createDefaultHeatCapacityFreeSensorConfig();

const finiteNumberOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeHeatCapacityFreeSensorConfig = (
  config: Partial<HeatCapacityFreeSensorConfig> | null | undefined,
): HeatCapacityFreeSensorConfig => ({
  pressureMvPerKPa: Math.max(0.001, finiteNumberOr(
    config?.pressureMvPerKPa,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.pressureMvPerKPa,
  )),
  // One FD-NCD-C instrument has one temperature calibration. Legacy files may
  // still contain mode-specific 2/4 mV/K values, but they are deliberately not
  // allowed back into the active runtime.
  temperatureMvAtAmbient: HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
  temperatureMvPerK: HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
  lagRate: clampNumber(
    finiteNumberOr(config?.lagRate, DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.lagRate),
    0.01,
    60,
  ),
  noiseMv: Math.max(0, finiteNumberOr(
    config?.noiseMv,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.noiseMv,
  )),
  quantizationMv: Math.max(0, finiteNumberOr(
    config?.quantizationMv,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.quantizationMv,
  )),
  minSampleIntervalS: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.minSampleIntervalS,
  maxSampleIntervalS: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.maxSampleIntervalS,
  historyWindowS: Math.max(0.001, finiteNumberOr(
    config?.historyWindowS,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.historyWindowS,
  )),
  pressureNonlinearity: normalizeFreePressureSensorNonlinearityConfig(
    config?.pressureNonlinearity ?? DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.pressureNonlinearity,
  ),
});

export const normalizeHeatCapacityFreePhysicsConfig = (
  value: Partial<HeatCapacityFreePhysicsConfig> | null | undefined,
): HeatCapacityFreePhysicsConfig => {
  const environment = {
    ambientPressureKPa: finiteNumberOr(
      value?.environment?.ambientPressureKPa,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientPressureKPa,
    ),
    ambientTemperatureK: finiteNumberOr(
      value?.environment?.ambientTemperatureK,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientTemperatureK,
    ),
  };
  return {
    environment,
    vesselVolumeL: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.vesselVolumeL,
    gamma: Math.max(1.001, finiteNumberOr(
      value?.gamma,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.gamma,
    )),
    pumpAmountGainRatio: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpAmountGainRatio,
    pumpWorkRetention: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpWorkRetention,
    pumpPressureLimitKPa: clampNumber(
      Math.max(0.001, finiteNumberOr(
        value?.pumpPressureLimitKPa,
        DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpPressureLimitKPa,
      )),
      0.001,
      HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
    ),
    stopcockFlowRate: Math.max(0, finiteNumberOr(
      value?.stopcockFlowRate,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.stopcockFlowRate,
    )),
    thermal: normalizeFreeThermalConfig(value?.thermal),
    pumpValveExchange: normalizeFreePumpValveExchangeConfig(
      value?.pumpValveExchange ?? DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpValveExchange,
    ),
    environmentDisturbance: normalizeFreeEnvironmentDisturbanceConfig(
      value?.environmentDisturbance ?? DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.environmentDisturbance,
    ),
    leakage: normalizeFreeLeakageConfig(value?.leakage),
  };
};
