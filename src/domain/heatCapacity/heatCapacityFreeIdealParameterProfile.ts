import {
  createDefaultHeatCapacityFreePhysicsConfig,
  createDefaultHeatCapacityFreeRecordConfig,
  createDefaultHeatCapacityFreeSensorConfig,
} from './heatCapacityDefaultConfig.ts';
import type {
  HeatCapacityFreePhysicsConfig,
} from './heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from './heatCapacityFreeRecordModel.ts';
import type {
  HeatCapacityFreeSensorConfig,
} from './heatCapacityFreeSensorModel.ts';
import {
  getHeatCapacityFreeIdealTheoreticalGamma,
} from './heatCapacityGasTheory.ts';

export type HeatCapacityFreeIdealStage =
  | 'fastAdiabatic'
  | 'thermalEquilibrium';

export interface HeatCapacityFreeIdealEffectiveConfigs {
  environment: {
    ambientPressureKPa: number;
    ambientTemperatureK: number;
  };
  physics: HeatCapacityFreePhysicsConfig;
  sensor: HeatCapacityFreeSensorConfig;
  record: HeatCapacityFreeRecordConfig;
  pressureWarningMv: number;
  instrumentNoiseEnabled: boolean;
  thermalMode: 'adiabatic' | 'full-exchange';
}

const IDEAL_AMBIENT_PRESSURE_KPA = 101.3;
const IDEAL_AMBIENT_TEMPERATURE_K = 298.15;
const IDEAL_PRESSURE_WARNING_MV = 120;
const IDEAL_FULL_EXCHANGE_CONDUCTANCE_W_PER_K = 5;
export const HEAT_CAPACITY_FREE_IDEAL_THERMAL_SETTLED_TOLERANCE_K = 0.01;

export const createHeatCapacityFreeIdealStagePhysicsConfig = (
  physics: HeatCapacityFreePhysicsConfig,
  stage: HeatCapacityFreeIdealStage,
): HeatCapacityFreePhysicsConfig => {
  const fullExchange = stage === 'thermalEquilibrium';
  return {
    ...physics,
    thermal: {
      ...physics.thermal,
      gasWallConductanceWPerK: fullExchange
        ? IDEAL_FULL_EXCHANGE_CONDUCTANCE_W_PER_K
        : 0,
      wallAmbientConductanceWPerK: fullExchange
        ? IDEAL_FULL_EXCHANGE_CONDUCTANCE_W_PER_K
        : 0,
    },
    pumpValveExchange: physics.pumpValveExchange
      ? {
          ...physics.pumpValveExchange,
          enabled: false,
          gasExchangeRatePerS: 0,
          thermalConductanceWPerK: 0,
        }
      : physics.pumpValveExchange,
    environmentDisturbance: physics.environmentDisturbance
      ? {
          ...physics.environmentDisturbance,
          enabled: false,
          pressureAmplitudeKPa: 0,
          temperatureAmplitudeK: 0,
        }
      : physics.environmentDisturbance,
    leakage: {
      ...physics.leakage,
      enabled: false,
      ratePerS: 0,
    },
  };
};

export const createHeatCapacityFreeIdealEffectiveConfigs = (
  stage: HeatCapacityFreeIdealStage,
): HeatCapacityFreeIdealEffectiveConfigs => {
  const basePhysics = createDefaultHeatCapacityFreePhysicsConfig();
  const baseSensor = createDefaultHeatCapacityFreeSensorConfig();
  const record = createDefaultHeatCapacityFreeRecordConfig();
  const environment = {
    ambientPressureKPa: IDEAL_AMBIENT_PRESSURE_KPA,
    ambientTemperatureK: IDEAL_AMBIENT_TEMPERATURE_K,
  };
  const physics = createHeatCapacityFreeIdealStagePhysicsConfig(basePhysics, stage);

  return {
    environment,
    physics: {
      ...physics,
      environment,
      gamma: getHeatCapacityFreeIdealTheoreticalGamma(),
    },
    sensor: {
      ...baseSensor,
      lagRate: 120,
      noiseMv: 0,
      pressureNonlinearity: {
        ...baseSensor.pressureNonlinearity,
        enabled: false,
        extraNoiseMv: 0,
      },
    },
    record: {
      ...record,
      temperatureAmbientToleranceMv:
        HEAT_CAPACITY_FREE_IDEAL_THERMAL_SETTLED_TOLERANCE_K * baseSensor.temperatureMvPerK,
    },
    pressureWarningMv: IDEAL_PRESSURE_WARNING_MV,
    instrumentNoiseEnabled: false,
    thermalMode: stage === 'thermalEquilibrium' ? 'full-exchange' : 'adiabatic',
  };
};
