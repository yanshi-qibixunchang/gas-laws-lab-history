import {
  FREE_PUMP_STROKE_DURATION_S,
  type HeatCapacityFreeEnvironmentConfig,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  HEAT_CAPACITY_FREE_PUMP_SENSOR_LAG_RATE,
  type HeatCapacityFreeSensorConfig,
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

export const createHeatCapacityFreeConfigSnapshotFromFile = (
  file: WorkbenchHeatCapacityState,
  options: HeatCapacityFreeConfigSnapshotOptions = {},
): HeatCapacityFreeConfigSnapshot => {
  const fallback = createDefaultFreeConfigSnapshot();
  const environmentConfig = options.environmentConfig ?? file.heatCapacityFreePhysicsConfig.environment;
  const sensorConfig = options.sensorConfig ?? file.heatCapacityFreeSensorConfig;
  const recordConfig = options.recordConfig ?? file.heatCapacityFreeRecordConfig;
  return {
    version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    environment: { ...environmentConfig },
    physics: {
      ...fallback.physics,
      gamma: file.heatCapacityFreePhysicsConfig.gamma,
      vesselVolumeL: fallback.physics.vesselVolumeL,
      pumpAmountGainRatio: fallback.physics.pumpAmountGainRatio,
      pumpPressureLimitKPa: file.heatCapacityFreePhysicsConfig.pumpPressureLimitKPa,
      pumpStrokeDurationS: FREE_PUMP_STROKE_DURATION_S,
      recommendedPumpIntervalS: 0.1,
      stopcockFlowRate: file.heatCapacityFreePhysicsConfig.stopcockFlowRate,
      thermal: { ...file.heatCapacityFreePhysicsConfig.thermal },
      pumpValveExchange: normalizeFreePumpValveExchangeConfig(
        file.heatCapacityFreePhysicsConfig.pumpValveExchange,
      ),
      environmentDisturbance: normalizeFreeEnvironmentDisturbanceConfig(
        file.heatCapacityFreePhysicsConfig.environmentDisturbance,
      ),
      leakage: { ...file.heatCapacityFreePhysicsConfig.leakage },
    },
    sensor: {
      pressureMvPerKPa: sensorConfig.pressureMvPerKPa,
      temperatureMvAtAmbient: sensorConfig.temperatureMvAtAmbient,
      temperatureMvPerK: sensorConfig.temperatureMvPerK,
      lagRate: sensorConfig.lagRate,
      pumpLagRate: HEAT_CAPACITY_FREE_PUMP_SENSOR_LAG_RATE,
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
      pressureWarningMv: file.heatCapacityFreePressureWarningMv,
      pressureDangerMv: recordConfig.pressureDangerMv,
    },
    scoring: { ...fallback.scoring },
  };
};
