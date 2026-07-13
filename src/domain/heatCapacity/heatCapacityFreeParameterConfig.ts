import {
  normalizeFreeLeakageConfig,
} from './heatCapacityFreeLeakageModel.ts';
import {
  normalizeFreePumpValveExchangeConfig,
} from './heatCapacityFreePumpValveExchangeModel.ts';
import {
  normalizeFreeEnvironmentDisturbanceConfig,
} from './heatCapacityFreeEnvironmentDisturbanceModel.ts';
import {
  HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
  HEAT_CAPACITY_FREE_FALLBACK_PRESSURE_DANGER_RATIO,
  type HeatCapacityFreeEnvironmentConfig,
  type HeatCapacityFreePhysicsConfig,
} from './heatCapacityFreePhysicsEngine.ts';
import {
  type HeatCapacityFreeRecordConfig,
} from './heatCapacityFreeRecordModel.ts';
import {
  type HeatCapacityFreeSensorConfig,
} from './heatCapacityFreeSensorModel.ts';
import {
  normalizeFreePressureSensorNonlinearityConfig,
} from './heatCapacityFreePressureSensorNonlinearityModel.ts';
import {
  normalizeFreeThermalConfig,
} from './heatCapacityFreeThermalModel.ts';
import {
  HEAT_CAPACITY_DEFAULT_PRESSURE_WARNING_MV,
  createDefaultHeatCapacityEnvironmentConfig,
  createDefaultHeatCapacityFreeLeakageConfig,
  createDefaultHeatCapacityFreePhysicsConfig,
  createDefaultHeatCapacityFreeRecordConfig,
  createDefaultHeatCapacityFreeSensorConfig,
  createDefaultHeatCapacityThermalConfig,
} from './heatCapacityDefaultConfig.ts';
export {
  HEAT_CAPACITY_FREE_GAS_TYPES,
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS,
  HEAT_CAPACITY_FREE_IDEAL_GAS_TYPE,
  getHeatCapacityFreeGasTypeGamma,
  getHeatCapacityFreeGasTypeModelDefaults,
  getHeatCapacityFreeIdealTheoreticalGamma,
  normalizeHeatCapacityFreeGasType,
  resolveHeatCapacityFreeGasTypeFromGamma,
  type HeatCapacityFreeGasType,
  type HeatCapacityFreeGasTypeModelDefaults,
} from './heatCapacityGasTheory.ts';
import {
  getHeatCapacityFreeGasTypeGamma,
  getHeatCapacityFreeGasTypeModelDefaults,
  normalizeHeatCapacityFreeGasType,
  resolveHeatCapacityFreeGasTypeFromGamma,
  type HeatCapacityFreeGasType,
} from './heatCapacityGasTheory.ts';

export type HeatCapacityFreeExperimentGroupStatus = 'draft' | 'running' | 'completed';

export interface HeatCapacityFreeParameterDraft {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  gasWallConductanceWPerK: number;
  wallAmbientConductanceWPerK: number;
  leakageEnabled: boolean;
  instrumentNoiseEnabled: boolean;
  gasType: HeatCapacityFreeGasType;
  wallHeatCapacityJPerK: number;
  leakageRatePerS: number;
  noiseMv: number;
  sensorLagTimeS: number;
  u0ZeroToleranceMv: number;
  pressureStableSlopeMvPerS: number;
  temperatureStableSlopeMvPerS: number;
  temperatureAmbientToleranceMv: number;
  minimumUsefulU1CorrectedMv: number;
  overVentedMinimumU2CorrectedMv: number;
  pressureWarningMv: number;
  pressureDangerMv: number;
}

export interface HeatCapacityFreeParameterApplyResult {
  environmentConfig: HeatCapacityFreeEnvironmentConfig;
  physicsConfig: HeatCapacityFreePhysicsConfig;
  sensorConfig: HeatCapacityFreeSensorConfig;
  recordConfig: HeatCapacityFreeRecordConfig;
  pressureWarningMv: number;
  instrumentNoiseEnabled: boolean;
  gasType: HeatCapacityFreeGasType;
}

const DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG = createDefaultHeatCapacityEnvironmentConfig();
const DEFAULT_HEAT_CAPACITY_FREE_THERMAL_CONFIG = createDefaultHeatCapacityThermalConfig();
const DEFAULT_HEAT_CAPACITY_FREE_LEAKAGE_CONFIG = createDefaultHeatCapacityFreeLeakageConfig();
const HEAT_CAPACITY_FREE_PUMP_TRANSIENT_PRESSURE_MARGIN_KPA = 0.7;
const DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG = createDefaultHeatCapacityFreePhysicsConfig();
const DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG = createDefaultHeatCapacityFreeSensorConfig();
const DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG = createDefaultHeatCapacityFreeRecordConfig();
const DEFAULT_HEAT_CAPACITY_FREE_PRESSURE_WARNING_MV = HEAT_CAPACITY_DEFAULT_PRESSURE_WARNING_MV;
const HEAT_CAPACITY_FREE_FIXED_PRESSURE_MV_PER_KPA =
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.pressureMvPerKPa;
const HEAT_CAPACITY_FREE_PRESSURE_THRESHOLD_GAP_MV = 0.01;

const finiteNumberOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const finiteAtLeastOr = (
  value: unknown,
  fallback: number,
  min: number,
) => Math.max(min, finiteNumberOr(value, fallback));

const finiteGreaterThanOr = (
  value: unknown,
  fallback: number,
  min: number,
) => (
  typeof value === 'number' && Number.isFinite(value) && value > min
    ? value
    : fallback
);

const booleanOr = (value: unknown, fallback: boolean) => (
  typeof value === 'boolean' ? value : fallback
);

export const getHeatCapacityFreePressureDangerLimitKPa = (
  draft: Pick<HeatCapacityFreeParameterDraft, 'ambientPressureKPa' | 'pressureDangerMv'>,
) => {
  const ambientPressureKPa = finiteAtLeastOr(
    draft.ambientPressureKPa,
    DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientPressureKPa,
    0.001,
  );
  const pressureMvPerKPa = HEAT_CAPACITY_FREE_FIXED_PRESSURE_MV_PER_KPA;
  const pressureDangerMv = finiteAtLeastOr(
    draft.pressureDangerMv,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG.pressureDangerMv,
    0,
  );
  const pressureDangerDeltaKPa = pressureDangerMv / pressureMvPerKPa;
  const transientMarginKPa = Math.min(
    HEAT_CAPACITY_FREE_PUMP_TRANSIENT_PRESSURE_MARGIN_KPA,
    pressureDangerDeltaKPa * 0.1,
  );
  const configuredLimitKPa = ambientPressureKPa + pressureDangerDeltaKPa + transientMarginKPa;
  const fallbackLimitKPa = ambientPressureKPa * HEAT_CAPACITY_FREE_FALLBACK_PRESSURE_DANGER_RATIO;
  const normalLimitKPa = Number.isFinite(configuredLimitKPa)
    ? configuredLimitKPa
    : fallbackLimitKPa;
  return Math.min(
    HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
    Math.max(ambientPressureKPa, normalLimitKPa),
  );
};

export const getHeatCapacityFreePressureDangerUpperLimitMv = (
  draft: Pick<HeatCapacityFreeParameterDraft, 'ambientPressureKPa'>,
) => {
  const ambientPressureKPa = finiteAtLeastOr(
    draft.ambientPressureKPa,
    DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientPressureKPa,
    0.001,
  );
  const pressureMvPerKPa = HEAT_CAPACITY_FREE_FIXED_PRESSURE_MV_PER_KPA;
  return Math.max(
    0,
    (HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA - ambientPressureKPa) * pressureMvPerKPa,
  );
};

const normalizeHeatCapacityFreePhysicsConfig = (
  value: Partial<HeatCapacityFreePhysicsConfig> | null | undefined,
): HeatCapacityFreePhysicsConfig => {
  const environment: HeatCapacityFreeEnvironmentConfig = {
    ambientPressureKPa: finiteAtLeastOr(
      value?.environment?.ambientPressureKPa,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientPressureKPa,
      0.001,
    ),
    ambientTemperatureK: finiteAtLeastOr(
      value?.environment?.ambientTemperatureK,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientTemperatureK,
      0.001,
    ),
  };
  return {
    environment,
    vesselVolumeL: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.vesselVolumeL,
    gamma: finiteAtLeastOr(
      value?.gamma,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.gamma,
      1.001,
    ),
    pumpAmountGainRatio: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpAmountGainRatio,
    pumpWorkRetention: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpWorkRetention,
    pumpPressureLimitKPa: finiteAtLeastOr(
      value?.pumpPressureLimitKPa,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpPressureLimitKPa,
      0.001,
    ),
    stopcockFlowRate: finiteAtLeastOr(
      value?.stopcockFlowRate,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.stopcockFlowRate,
      0,
    ),
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

const normalizeHeatCapacityFreeSensorConfig = (
  value: Partial<HeatCapacityFreeSensorConfig> | null | undefined,
): HeatCapacityFreeSensorConfig => ({
  pressureMvPerKPa: HEAT_CAPACITY_FREE_FIXED_PRESSURE_MV_PER_KPA,
  temperatureMvAtAmbient: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient,
  temperatureMvPerK: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvPerK,
  lagRate: finiteAtLeastOr(
    value?.lagRate,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.lagRate,
    0.001,
  ),
  noiseMv: finiteAtLeastOr(
    value?.noiseMv,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.noiseMv,
    0,
  ),
  quantizationMv: finiteAtLeastOr(
    value?.quantizationMv,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.quantizationMv,
    0,
  ),
  minSampleIntervalS: finiteAtLeastOr(
    value?.minSampleIntervalS,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.minSampleIntervalS,
    0.001,
  ),
  maxSampleIntervalS: finiteAtLeastOr(
    value?.maxSampleIntervalS,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.maxSampleIntervalS,
    0.001,
  ),
  historyWindowS: finiteAtLeastOr(
    value?.historyWindowS,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.historyWindowS,
    0.001,
  ),
  pressureNonlinearity: normalizeFreePressureSensorNonlinearityConfig(
    value?.pressureNonlinearity ?? DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.pressureNonlinearity,
  ),
});

const normalizeHeatCapacityFreeRecordConfig = (
  value: Partial<HeatCapacityFreeRecordConfig> | null | undefined,
): HeatCapacityFreeRecordConfig => ({
  u0ZeroToleranceMv: finiteAtLeastOr(
    value?.u0ZeroToleranceMv,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG.u0ZeroToleranceMv,
    0,
  ),
  pressureStableSlopeMvPerS: finiteAtLeastOr(
    value?.pressureStableSlopeMvPerS,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG.pressureStableSlopeMvPerS,
    0,
  ),
  temperatureStableSlopeMvPerS: finiteAtLeastOr(
    value?.temperatureStableSlopeMvPerS,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG.temperatureStableSlopeMvPerS,
    0,
  ),
  temperatureAmbientToleranceMv: finiteAtLeastOr(
    value?.temperatureAmbientToleranceMv,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG.temperatureAmbientToleranceMv,
    0,
  ),
  minimumUsefulU1CorrectedMv: finiteAtLeastOr(
    value?.minimumUsefulU1CorrectedMv,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
    0,
  ),
  overVentedMinimumU2CorrectedMv: finiteAtLeastOr(
    value?.overVentedMinimumU2CorrectedMv,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG.overVentedMinimumU2CorrectedMv,
    0,
  ),
  pressureDangerMv: finiteAtLeastOr(
    value?.pressureDangerMv,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG.pressureDangerMv,
    0,
  ),
});

export const convertSensorLagRateToLagTimeS = (lagRate: number): number => (
  1 / Math.max(0.001, finiteNumberOr(lagRate, DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.lagRate))
);

export const convertSensorLagTimeSToLagRate = (lagTimeS: number): number => (
  1 / Math.max(0.001, finiteNumberOr(lagTimeS, convertSensorLagRateToLagTimeS(
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.lagRate,
  )))
);

export const createHeatCapacityFreeParameterDraftFromConfigs = (
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  recordConfig: HeatCapacityFreeRecordConfig,
  pressureWarningMv: number,
  instrumentNoiseEnabled: boolean,
): HeatCapacityFreeParameterDraft => {
  const physics = normalizeHeatCapacityFreePhysicsConfig(physicsConfig);
  const sensor = normalizeHeatCapacityFreeSensorConfig(sensorConfig);
  const record = normalizeHeatCapacityFreeRecordConfig(recordConfig);
  const gasType = resolveHeatCapacityFreeGasTypeFromGamma(physics.gamma);
  return {
    ambientPressureKPa: physics.environment.ambientPressureKPa,
    ambientTemperatureK: physics.environment.ambientTemperatureK,
    gasWallConductanceWPerK: physics.thermal.gasWallConductanceWPerK,
    wallAmbientConductanceWPerK: physics.thermal.wallAmbientConductanceWPerK,
    leakageEnabled: physics.leakage.enabled,
    instrumentNoiseEnabled,
    gasType,
    wallHeatCapacityJPerK: physics.thermal.wallHeatCapacityJPerK,
    leakageRatePerS: physics.leakage.ratePerS,
    noiseMv: sensor.noiseMv,
    sensorLagTimeS: convertSensorLagRateToLagTimeS(sensor.lagRate),
    u0ZeroToleranceMv: record.u0ZeroToleranceMv,
    pressureStableSlopeMvPerS: record.pressureStableSlopeMvPerS,
    temperatureStableSlopeMvPerS: record.temperatureStableSlopeMvPerS,
    temperatureAmbientToleranceMv: record.temperatureAmbientToleranceMv,
    minimumUsefulU1CorrectedMv: record.minimumUsefulU1CorrectedMv,
    overVentedMinimumU2CorrectedMv: record.overVentedMinimumU2CorrectedMv,
    pressureWarningMv: finiteAtLeastOr(
      pressureWarningMv,
      DEFAULT_HEAT_CAPACITY_FREE_PRESSURE_WARNING_MV,
      0,
    ),
    pressureDangerMv: record.pressureDangerMv,
  };
};

const createDefaultHeatCapacityFreeParameterDraft = () => (
  createHeatCapacityFreeParameterDraftFromConfigs(
    DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
    DEFAULT_HEAT_CAPACITY_FREE_RECORD_CONFIG,
    DEFAULT_HEAT_CAPACITY_FREE_PRESSURE_WARNING_MV,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.noiseMv > 0,
  )
);

export const normalizeHeatCapacityFreeParameterDraft = (
  value: Partial<HeatCapacityFreeParameterDraft> | null | undefined,
  fallback: HeatCapacityFreeParameterDraft = createDefaultHeatCapacityFreeParameterDraft(),
): HeatCapacityFreeParameterDraft => {
  const legacyGamma = typeof (value as { gamma?: unknown } | null | undefined)?.gamma === 'number'
    ? (value as { gamma?: number }).gamma
    : undefined;
  const gasTypeFallback = normalizeHeatCapacityFreeGasType(
    fallback.gasType,
    resolveHeatCapacityFreeGasTypeFromGamma(legacyGamma),
  );
  const gasType = normalizeHeatCapacityFreeGasType(
    value?.gasType,
    legacyGamma === undefined ? gasTypeFallback : resolveHeatCapacityFreeGasTypeFromGamma(legacyGamma, gasTypeFallback),
  );
  const pressureDangerMv = finiteAtLeastOr(value?.pressureDangerMv, fallback.pressureDangerMv, 0);
  const rawPressureWarningMv = finiteAtLeastOr(value?.pressureWarningMv, fallback.pressureWarningMv, 0);
  const pressureWarningMv = Math.min(
    rawPressureWarningMv,
    Math.max(0, pressureDangerMv - HEAT_CAPACITY_FREE_PRESSURE_THRESHOLD_GAP_MV),
  );
  const maximumUsefulU1Mv = Math.max(
    0,
    Math.min(pressureWarningMv, pressureDangerMv * 0.85) / 1.08,
  );
  const minimumUsefulU1CorrectedMv = Math.min(
    finiteAtLeastOr(
      value?.minimumUsefulU1CorrectedMv,
      fallback.minimumUsefulU1CorrectedMv,
      0,
    ),
    maximumUsefulU1Mv,
  );
  return {
    ambientPressureKPa: finiteAtLeastOr(value?.ambientPressureKPa, fallback.ambientPressureKPa, 0.001),
    ambientTemperatureK: finiteAtLeastOr(value?.ambientTemperatureK, fallback.ambientTemperatureK, 0.001),
    gasWallConductanceWPerK: finiteAtLeastOr(value?.gasWallConductanceWPerK, fallback.gasWallConductanceWPerK, 0),
    wallAmbientConductanceWPerK: finiteAtLeastOr(value?.wallAmbientConductanceWPerK, fallback.wallAmbientConductanceWPerK, 0),
    leakageEnabled: booleanOr(value?.leakageEnabled, fallback.leakageEnabled),
    instrumentNoiseEnabled: booleanOr(value?.instrumentNoiseEnabled, fallback.instrumentNoiseEnabled),
    gasType,
    wallHeatCapacityJPerK: finiteAtLeastOr(value?.wallHeatCapacityJPerK, fallback.wallHeatCapacityJPerK, 1),
    leakageRatePerS: finiteAtLeastOr(value?.leakageRatePerS, fallback.leakageRatePerS, 0),
    noiseMv: finiteAtLeastOr(value?.noiseMv, fallback.noiseMv, 0),
    sensorLagTimeS: finiteGreaterThanOr(value?.sensorLagTimeS, fallback.sensorLagTimeS, 0),
    u0ZeroToleranceMv: finiteAtLeastOr(value?.u0ZeroToleranceMv, fallback.u0ZeroToleranceMv, 0),
    pressureStableSlopeMvPerS: finiteAtLeastOr(value?.pressureStableSlopeMvPerS, fallback.pressureStableSlopeMvPerS, 0),
    temperatureStableSlopeMvPerS: finiteAtLeastOr(
      value?.temperatureStableSlopeMvPerS,
      fallback.temperatureStableSlopeMvPerS,
      0,
    ),
    temperatureAmbientToleranceMv: finiteAtLeastOr(
      value?.temperatureAmbientToleranceMv,
      fallback.temperatureAmbientToleranceMv,
      0,
    ),
    minimumUsefulU1CorrectedMv,
    overVentedMinimumU2CorrectedMv: finiteAtLeastOr(
      value?.overVentedMinimumU2CorrectedMv,
      fallback.overVentedMinimumU2CorrectedMv,
      0,
    ),
    pressureWarningMv,
    pressureDangerMv,
  };
};

export const applyHeatCapacityFreeGasTypeModelDefaultsToDraft = (
  draft: HeatCapacityFreeParameterDraft,
  gasType: HeatCapacityFreeGasType,
): HeatCapacityFreeParameterDraft => {
  const defaults = getHeatCapacityFreeGasTypeModelDefaults(gasType);
  return normalizeHeatCapacityFreeParameterDraft({
    ...draft,
    gasType,
    gasWallConductanceWPerK: defaults.gasWallConductanceWPerK,
    leakageRatePerS: defaults.leakageRatePerS,
  }, draft);
};

export const applyHeatCapacityFreeParameterDraftToConfigs = (
  draft: HeatCapacityFreeParameterDraft,
): HeatCapacityFreeParameterApplyResult => {
  const normalizedDraft = normalizeHeatCapacityFreeParameterDraft(draft);
  const environmentConfig: HeatCapacityFreeEnvironmentConfig = {
    ambientPressureKPa: normalizedDraft.ambientPressureKPa,
    ambientTemperatureK: normalizedDraft.ambientTemperatureK,
  };
  const physicsConfig = normalizeHeatCapacityFreePhysicsConfig({
    ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
    environment: environmentConfig,
    gamma: getHeatCapacityFreeGasTypeGamma(normalizedDraft.gasType),
    vesselVolumeL: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.vesselVolumeL,
    pumpAmountGainRatio: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpAmountGainRatio,
    pumpWorkRetention: DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpWorkRetention,
    pumpPressureLimitKPa: getHeatCapacityFreePressureDangerLimitKPa(normalizedDraft),
    thermal: {
      ...DEFAULT_HEAT_CAPACITY_FREE_THERMAL_CONFIG,
      gasWallConductanceWPerK: normalizedDraft.gasWallConductanceWPerK,
      wallAmbientConductanceWPerK: normalizedDraft.wallAmbientConductanceWPerK,
      wallHeatCapacityJPerK: normalizedDraft.wallHeatCapacityJPerK,
    },
    leakage: {
      ...DEFAULT_HEAT_CAPACITY_FREE_LEAKAGE_CONFIG,
      enabled: normalizedDraft.leakageEnabled,
      ratePerS: normalizedDraft.leakageRatePerS,
    },
  });
  const sensorConfig = normalizeHeatCapacityFreeSensorConfig({
    ...DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
    lagRate: convertSensorLagTimeSToLagRate(normalizedDraft.sensorLagTimeS),
    noiseMv: normalizedDraft.noiseMv,
  });
  const recordConfig = normalizeHeatCapacityFreeRecordConfig({
    u0ZeroToleranceMv: normalizedDraft.u0ZeroToleranceMv,
    pressureStableSlopeMvPerS: normalizedDraft.pressureStableSlopeMvPerS,
    temperatureStableSlopeMvPerS: normalizedDraft.temperatureStableSlopeMvPerS,
    temperatureAmbientToleranceMv: normalizedDraft.temperatureAmbientToleranceMv,
    minimumUsefulU1CorrectedMv: normalizedDraft.minimumUsefulU1CorrectedMv,
    overVentedMinimumU2CorrectedMv: normalizedDraft.overVentedMinimumU2CorrectedMv,
    pressureDangerMv: normalizedDraft.pressureDangerMv,
  });
  return {
    environmentConfig,
    physicsConfig,
    sensorConfig,
    recordConfig,
    pressureWarningMv: normalizedDraft.pressureWarningMv,
    instrumentNoiseEnabled: normalizedDraft.instrumentNoiseEnabled,
    gasType: normalizedDraft.gasType,
  };
};

export const getEffectiveHeatCapacityFreeSensorConfig = (
  sensorConfig: HeatCapacityFreeSensorConfig,
  instrumentNoiseEnabled: boolean,
): HeatCapacityFreeSensorConfig => ({
  ...sensorConfig,
  noiseMv: instrumentNoiseEnabled ? sensorConfig.noiseMv : 0,
  pressureNonlinearity: {
    ...normalizeFreePressureSensorNonlinearityConfig(sensorConfig.pressureNonlinearity),
    enabled: instrumentNoiseEnabled &&
      normalizeFreePressureSensorNonlinearityConfig(sensorConfig.pressureNonlinearity).enabled,
  },
});
