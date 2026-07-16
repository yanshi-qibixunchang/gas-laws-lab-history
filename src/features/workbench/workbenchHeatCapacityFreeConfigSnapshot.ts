import {
  FREE_PUMP_STROKE_DURATION_S,
  type HeatCapacityFreeEnvironmentConfig,
  type HeatCapacityFreePhysicsConfig,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeSensorConfig,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  normalizeFreePressureSensorNonlinearityConfig,
} from '../../domain/heatCapacity/heatCapacityFreePressureSensorNonlinearityModel.ts';
import {
  normalizeFreePumpValveExchangeConfig,
} from '../../domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts';
import {
  normalizeFreeEnvironmentDisturbanceConfig,
} from '../../domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts';
import {
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  createDefaultFreeConfigSnapshot,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S,
  type HeatCapacityFreeConfigSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import type { HeatCapacityFreeRecordConfig } from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type { WorkbenchHeatCapacityState } from './workbenchState.ts';

export interface HeatCapacityFreeConfigSnapshotOptions {
  environmentConfig?: HeatCapacityFreeEnvironmentConfig;
  sensorConfig?: HeatCapacityFreeSensorConfig;
  recordConfig?: HeatCapacityFreeRecordConfig;
}

export interface HeatCapacityFreeRuntimeConfigSnapshotSource {
  environmentConfig: HeatCapacityFreeEnvironmentConfig;
  physicsConfig: HeatCapacityFreePhysicsConfig;
  sensorConfig: HeatCapacityFreeSensorConfig;
  recordConfig: HeatCapacityFreeRecordConfig;
  pressureWarningMv: number;
}

export const createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs = ({
  environmentConfig,
  physicsConfig,
  sensorConfig,
  recordConfig,
  pressureWarningMv,
}: HeatCapacityFreeRuntimeConfigSnapshotSource): HeatCapacityFreeConfigSnapshot => {
  const fallback = createDefaultFreeConfigSnapshot();
  return {
    version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    environment: { ...environmentConfig },
    physics: {
      ...fallback.physics,
      gamma: physicsConfig.gamma,
      vesselVolumeL: fallback.physics.vesselVolumeL,
      pumpAmountGainRatio: fallback.physics.pumpAmountGainRatio,
      pumpWorkRetention: fallback.physics.pumpWorkRetention,
      pumpPressureLimitKPa: physicsConfig.pumpPressureLimitKPa,
      pumpStrokeDurationS: FREE_PUMP_STROKE_DURATION_S,
      recommendedPumpIntervalS: HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
      stopcockFlowRate: physicsConfig.stopcockFlowRate,
      thermal: { ...physicsConfig.thermal },
      pumpValveExchange: normalizeFreePumpValveExchangeConfig(
        physicsConfig.pumpValveExchange,
      ),
      environmentDisturbance: normalizeFreeEnvironmentDisturbanceConfig(
        physicsConfig.environmentDisturbance,
      ),
      leakage: { ...physicsConfig.leakage },
    },
    sensor: {
      pressureMvPerKPa: sensorConfig.pressureMvPerKPa,
      temperatureMvAtAmbient: sensorConfig.temperatureMvAtAmbient,
      temperatureMvPerK: sensorConfig.temperatureMvPerK,
      lagRate: sensorConfig.lagRate,
      noiseMv: sensorConfig.noiseMv,
      quantizationMv: sensorConfig.quantizationMv,
      minSampleIntervalS: sensorConfig.minSampleIntervalS,
      maxSampleIntervalS: sensorConfig.maxSampleIntervalS,
      fastProcessSampleStepS: HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S,
      historyWindowS: sensorConfig.historyWindowS,
      pressureNonlinearity: normalizeFreePressureSensorNonlinearityConfig(
        sensorConfig.pressureNonlinearity,
      ),
    },
    record: {
      u0ZeroToleranceMv: recordConfig.u0ZeroToleranceMv,
      pressureStableSlopeMvPerS: recordConfig.pressureStableSlopeMvPerS,
      temperatureStableSlopeMvPerS: recordConfig.temperatureStableSlopeMvPerS,
      temperatureAmbientToleranceMv: recordConfig.temperatureAmbientToleranceMv,
      minimumUsefulU1CorrectedMv: recordConfig.minimumUsefulU1CorrectedMv,
      overVentedMinimumU2CorrectedMv: recordConfig.overVentedMinimumU2CorrectedMv,
      pressureWarningMv,
      pressureDangerMv: recordConfig.pressureDangerMv,
    },
    scoring: { ...fallback.scoring },
  };
};

export const createHeatCapacityFreeConfigSnapshotFromFile = (
  file: WorkbenchHeatCapacityState,
  options: HeatCapacityFreeConfigSnapshotOptions = {},
): HeatCapacityFreeConfigSnapshot => {
  const environmentConfig = options.environmentConfig ?? file.heatCapacityFreePhysicsConfig.environment;
  const sensorConfig = options.sensorConfig ?? file.heatCapacityFreeSensorConfig;
  const recordConfig = options.recordConfig ?? file.heatCapacityFreeRecordConfig;
  return createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs({
    environmentConfig,
    physicsConfig: file.heatCapacityFreePhysicsConfig,
    sensorConfig,
    recordConfig,
    pressureWarningMv: file.heatCapacityFreePressureWarningMv,
  });
};
