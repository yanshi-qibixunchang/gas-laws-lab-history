import {
  FREE_PUMP_STROKE_DURATION_S,
  FREE_RELEASE_MAIN_DURATION_S,
  FREE_RELEASE_RESPONSE_DELAY_S,
  type HeatCapacityFreePhysicsConfig,
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
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  type HeatCapacityFreeConfigSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityFreeFileAcknowledgements,
  createDefaultHeatCapacityFreeExperimentDomainState,
  hasHeatCapacityFreeIdealThermalBoundaryContamination,
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  normalizeHeatCapacityFreeExperimentDomainBoundary,
  normalizeHeatCapacityFreePhysicsConfig,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  type HeatCapacityFreeDisplayScheme,
  type HeatCapacityFreeExperimentDomainState,
  type HeatCapacityFreeFileAcknowledgements,
  type HeatCapacityFreeParameterScheme,
  type WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import {
  createHeatCapacityFreeParameterDraftFromConfigs,
  getHeatCapacityFreeGasTypeGamma,
  normalizeHeatCapacityFreeGasType,
  normalizeHeatCapacityFreeParameterDraft,
  resolveHeatCapacityFreeGasTypeFromGamma,
  type HeatCapacityFreeExperimentGroupStatus,
  type HeatCapacityFreeGasType,
  type HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type {
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  normalizeHeatCapacityFreeStandardReferenceSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import type {
  WorkbenchExperimentFileEnvelopeV1,
} from './workbenchPersistenceSchema.ts';

export const HEAT_CAPACITY_SCHEMA_VERSION = 1 as const;
export const HEAT_CAPACITY_PROCESS_SCORING_VERSION = 'free-process-score-v1' as const;

const heatCapacityFreeUiReplayKeys = [
  'selectedHeatCapacityPanel',
  'openHeatCapacityTabs',
  'activeHeatCapacityTabId',
  'heatCapacityMaterialsExpanded',
  'heatCapacityTabContainerHeight',
  'heatCapacityPhase',
  'glassPistonState',
  'stopcockAngleDeg',
  'temperatureSignalTargetMv',
  'pressureSignalTargetMv',
  'displayResponseLastUpdateMs',
  'pressureZeroDisplayedSamples',
  'pressureDisplayJitterOffset',
  'pressureDisplayNextJitterAtMs',
  'pressureReleaseBurstUntilMs',
  'temperatureDisplayJitterOffset',
  'temperatureDisplayNextJitterAtMs',
  'pressureZeroed',
  'pressureZeroAdjusted',
  'pressureZeroKnobAngle',
  'pressureZeroOffset',
  'pressureZeroDisplayText',
  'releaseRecoveryTargetDeltaKPa',
  'pressureSignalRawReadoutMv',
  'pressureSignalReadoutMv',
  'pressureGaugeTargetValue',
  'pressureGaugeDisplayValue',
  'pressureGaugeNeedleAngle',
  'gaugePressureMinKPa',
  'gaugePressureMaxKPa',
  'pressureWarningThresholdKPa',
  'pressureSafeThresholdKPa',
  'pressureSafetyThresholdKPa',
  'pressureSafetyStatus',
  'pressureSafetyMessage',
  'pressureBlockedPumping',
  'pressureOverLimit',
  'pressureZeroMvPerTurn',
  'pressureZeroAdjustMode',
  'temperatureSignalMv',
  'pressureSignalMv',
  'pressureKPa',
  'pressureLimitKPa',
  'pumpValveOpen',
  'pumpValveState',
  'pumpBulbState',
  'pumpStrokeTimestamps',
  'pumpFrequency',
  'pumpFrequencyStatus',
  'lastPumpTime',
  'pumpStrokeCount',
  'pumpHint',
  'heatCapacityFreeStopcockFlowOpen',
  'heatCapacityFreeStopcockPendingOpenAtMs',
  'heatCapacityFreeStopcockFlowPurpose',
  'heatCapacityFreeEquilibriumSpeedMultiplier',
  'heatCapacityFreeEquilibriumSpeedHintShown',
  'hardSphereViewEnabled',
  'visualizationMode',
  'calculationModel',
  'pressureSensitivityMvPerKPa',
  'vesselPressureReadoutKPa',
  'vesselTemperatureReadoutK',
  'recordedPressures',
  'heatCapacityProcessSamples',
  'theoreticalGamma',
] as const satisfies readonly (keyof WorkbenchHeatCapacityState)[];

export type HeatCapacityFreeUiReplayV1 = Pick<
  WorkbenchHeatCapacityState,
  typeof heatCapacityFreeUiReplayKeys[number]
>;

export interface HeatCapacityFreePersistenceDataV1 {
  runtimeVersion: typeof HEAT_CAPACITY_FREE_RUNTIME_VERSION;
  traceVersion: typeof HEAT_CAPACITY_FREE_TRACE_VERSION;
  calculationVersion: typeof HEAT_CAPACITY_FREE_CALCULATION_VERSION;
  parameterScheme: HeatCapacityFreeParameterScheme;
  displayScheme: HeatCapacityFreeDisplayScheme;
  gasType: HeatCapacityFreeGasType;
  real: HeatCapacityFreeExperimentDomainState;
  ideal: HeatCapacityFreeExperimentDomainState;
  config: HeatCapacityFreeConfigSnapshot;
  parameterDraft: HeatCapacityFreeParameterDraft;
  experimentGroupStatus: HeatCapacityFreeExperimentGroupStatus;
  activeRunConfigSnapshot: HeatCapacityFreeConfigSnapshot | null;
  acknowledgements: HeatCapacityFreeFileAcknowledgements;
  recordConfig: HeatCapacityFreeRecordConfig;
  pressureWarningMv: number;
  instrumentNoiseEnabled: boolean;
  runtime: WorkbenchHeatCapacityState['heatCapacityFreePhysicsState'];
  controls: {
    powerOn: boolean;
    pumpValveOpen: boolean;
    stopcockOpen: boolean;
    pumpBulbState: WorkbenchHeatCapacityState['pumpBulbState'];
    stopcockFlowOpen: boolean;
    stopcockFlowPurpose: WorkbenchHeatCapacityState['heatCapacityFreeStopcockFlowPurpose'];
  };
  sensor: WorkbenchHeatCapacityState['heatCapacityFreeSensorState'];
  calibration: WorkbenchHeatCapacityState['heatCapacityFreeCalibrationState'];
  rollbackSnapshots: WorkbenchHeatCapacityState['heatCapacityFreeRollbackSnapshots'];
  traceStore: WorkbenchHeatCapacityState['heatCapacityFreeTraceStore'];
  trials: WorkbenchHeatCapacityState['heatCapacityFreeTrials'];
  uiReplay: HeatCapacityFreeUiReplayV1;
}

export interface HeatCapacityGuidePersistenceDataV1 {
  physicsConfig: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig'];
  physicsState: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState'];
  workflow: WorkbenchHeatCapacityState['heatCapacityGuideWorkflow'];
  trial: WorkbenchHeatCapacityState['heatCapacityGuideTrial'];
}

export interface HeatCapacityPersistencePayloadV1 {
  experimentKind: 'heatCapacity';
  heatCapacitySchemaVersion: typeof HEAT_CAPACITY_SCHEMA_VERSION;
  mode: WorkbenchHeatCapacityState['heatCapacityMode'];
  common: {
    materialsExpanded: boolean;
    selectedHeatCapacityPanel: WorkbenchHeatCapacityState['selectedHeatCapacityPanel'];
    openHeatCapacityTabs: WorkbenchHeatCapacityState['openHeatCapacityTabs'];
    activeHeatCapacityTabId: WorkbenchHeatCapacityState['activeHeatCapacityTabId'];
    experimentSeed: WorkbenchHeatCapacityState['heatCapacityExperimentSeed'];
    experimentProfile: WorkbenchHeatCapacityState['heatCapacityExperimentProfile'];
  };
  free: HeatCapacityFreePersistenceDataV1 | null;
  guided: HeatCapacityGuidePersistenceDataV1 | null;
  demo: null;
}

export interface HeatCapacityPayloadValidationResult {
  valid: boolean;
  errors: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const clonePersistenceValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => clonePersistenceValue(item)) as T;
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clonePersistenceValue(item)]),
    ) as T;
  }
  return value;
};

const normalizePersistedHeatCapacityFreeTrial = (value: unknown): HeatCapacityFreeTrial | null => {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  const standardReferenceSnapshot = normalizeHeatCapacityFreeStandardReferenceSnapshot(value.standardReferenceSnapshot);
  return {
    ...(value as unknown as HeatCapacityFreeTrial),
    parameterScheme: value.parameterScheme === 'ideal' ? 'ideal' : 'real',
    standardReferenceSnapshot: standardReferenceSnapshot &&
      !hasHeatCapacityFreeIdealThermalBoundaryContamination(standardReferenceSnapshot.configSnapshot.physics)
      ? standardReferenceSnapshot
      : null,
    completedAtMs: isFiniteNumber(value.completedAtMs) ? value.completedAtMs : null,
  };
};

const createHeatCapacityFreeUiReplay = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeUiReplayV1 => (
  Object.fromEntries(heatCapacityFreeUiReplayKeys.map((key) => [
    key,
    clonePersistenceValue(file[key]),
  ])) as HeatCapacityFreeUiReplayV1
);

export const createHeatCapacityFreeConfigSnapshotFromFile = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeConfigSnapshot => {
  const fallback = createDefaultFreeConfigSnapshot();
  return {
    version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    environment: {
      ambientPressureKPa: file.heatCapacityFreePhysicsConfig.environment.ambientPressureKPa,
      ambientTemperatureK: file.heatCapacityFreePhysicsConfig.environment.ambientTemperatureK,
    },
    physics: {
      ...fallback.physics,
      gamma: file.heatCapacityFreePhysicsConfig.gamma,
      vesselVolumeL: fallback.physics.vesselVolumeL,
      pumpAmountGainRatio: fallback.physics.pumpAmountGainRatio,
      pumpPressureLimitKPa: file.heatCapacityFreePhysicsConfig.pumpPressureLimitKPa,
      pumpStrokeDurationS: FREE_PUMP_STROKE_DURATION_S,
      recommendedPumpIntervalS: 0.1,
      stopcockFlowRate: file.heatCapacityFreePhysicsConfig.stopcockFlowRate,
      releaseVisualResponseDelayS: FREE_RELEASE_RESPONSE_DELAY_S,
      releaseVisualMainDurationS: FREE_RELEASE_MAIN_DURATION_S,
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
      pressureMvPerKPa: file.heatCapacityFreeSensorConfig.pressureMvPerKPa,
      temperatureMvAtAmbient: file.heatCapacityFreeSensorConfig.temperatureMvAtAmbient,
      temperatureMvPerK: file.heatCapacityFreeSensorConfig.temperatureMvPerK,
      lagRate: file.heatCapacityFreeSensorConfig.lagRate,
      pumpLagRate: HEAT_CAPACITY_FREE_PUMP_SENSOR_LAG_RATE,
      noiseMv: file.heatCapacityFreeSensorConfig.noiseMv,
      quantizationMv: file.heatCapacityFreeSensorConfig.quantizationMv,
      minSampleIntervalS: file.heatCapacityFreeSensorConfig.minSampleIntervalS,
      maxSampleIntervalS: file.heatCapacityFreeSensorConfig.maxSampleIntervalS,
      fastProcessSampleStepS: HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S,
      historyWindowS: file.heatCapacityFreeSensorConfig.historyWindowS,
      pressureNonlinearity: normalizeFreePressureSensorNonlinearityConfig(
        file.heatCapacityFreeSensorConfig.pressureNonlinearity,
      ),
    },
    record: {
      u0ZeroToleranceMv: file.heatCapacityFreeRecordConfig.u0ZeroToleranceMv,
      pressureStableSlopeMvPerS: file.heatCapacityFreeRecordConfig.pressureStableSlopeMvPerS,
      temperatureStableSlopeMvPerS: file.heatCapacityFreeRecordConfig.temperatureStableSlopeMvPerS,
      temperatureAmbientToleranceMv: file.heatCapacityFreeRecordConfig.temperatureAmbientToleranceMv,
      minimumUsefulU1CorrectedMv: file.heatCapacityFreeRecordConfig.minimumUsefulU1CorrectedMv,
      overVentedMinimumU2CorrectedMv: file.heatCapacityFreeRecordConfig.overVentedMinimumU2CorrectedMv,
      pressureWarningMv: file.heatCapacityFreePressureWarningMv,
      pressureDangerMv: file.heatCapacityFreeRecordConfig.pressureDangerMv,
    },
    scoring: {
      processScoringVersion: HEAT_CAPACITY_PROCESS_SCORING_VERSION,
    },
  };
};

export const createHeatCapacityPersistencePayload = (
  file: WorkbenchHeatCapacityState,
  savedAt: number,
): HeatCapacityPersistencePayloadV1 => {
  void savedAt;
  const fileWithCurrentDomain = createHeatCapacityPersistenceSourceFile(file);
  return {
    experimentKind: 'heatCapacity',
    heatCapacitySchemaVersion: HEAT_CAPACITY_SCHEMA_VERSION,
    mode: file.heatCapacityMode,
    common: {
      materialsExpanded: file.heatCapacityMaterialsExpanded,
      selectedHeatCapacityPanel: file.selectedHeatCapacityPanel,
      openHeatCapacityTabs: clonePersistenceValue(file.openHeatCapacityTabs),
      activeHeatCapacityTabId: file.activeHeatCapacityTabId,
      experimentSeed: file.heatCapacityExperimentSeed,
      experimentProfile: clonePersistenceValue(file.heatCapacityExperimentProfile),
    },
    free: {
      runtimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
      traceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
      calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
      parameterScheme: fileWithCurrentDomain.heatCapacityFreeParameterScheme,
      displayScheme: fileWithCurrentDomain.heatCapacityFreeDisplayScheme,
      gasType: fileWithCurrentDomain.heatCapacityFreeGasType,
      real: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeRealDomain),
      ideal: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeIdealDomain),
      config: createHeatCapacityFreeConfigSnapshotFromFile(fileWithCurrentDomain),
      parameterDraft: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeParameterDraft),
      experimentGroupStatus: fileWithCurrentDomain.heatCapacityFreeExperimentGroupStatus,
      activeRunConfigSnapshot: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeActiveRunConfigSnapshot),
      acknowledgements: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeFileAcknowledgements),
      recordConfig: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeRecordConfig),
      pressureWarningMv: fileWithCurrentDomain.heatCapacityFreePressureWarningMv,
      instrumentNoiseEnabled: fileWithCurrentDomain.heatCapacityFreeInstrumentNoiseEnabled,
      runtime: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreePhysicsState),
      controls: {
        powerOn: fileWithCurrentDomain.powerOn,
        pumpValveOpen: fileWithCurrentDomain.pumpValveOpen,
        stopcockOpen: fileWithCurrentDomain.glassPistonState === 'open',
        pumpBulbState: fileWithCurrentDomain.pumpBulbState,
        stopcockFlowOpen: fileWithCurrentDomain.heatCapacityFreeStopcockFlowOpen,
        stopcockFlowPurpose: fileWithCurrentDomain.heatCapacityFreeStopcockFlowPurpose,
      },
      sensor: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeSensorState),
      calibration: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeCalibrationState),
      rollbackSnapshots: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeRollbackSnapshots),
      traceStore: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeTraceStore),
      trials: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeTrials),
      uiReplay: createHeatCapacityFreeUiReplay(fileWithCurrentDomain),
    },
    guided: file.heatCapacityMode === 'guide' || file.heatCapacityGuideTrial !== null
      ? {
          physicsConfig: clonePersistenceValue(file.heatCapacityGuidePhysicsConfig),
          physicsState: clonePersistenceValue(file.heatCapacityGuidePhysicsState),
          workflow: clonePersistenceValue(file.heatCapacityGuideWorkflow),
          trial: clonePersistenceValue(file.heatCapacityGuideTrial),
        }
      : null,
    demo: null,
  };
};

export const validateHeatCapacityPersistencePayload = (
  payload: unknown,
): HeatCapacityPayloadValidationResult => {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (payload.experimentKind !== 'heatCapacity') {
    errors.push('experimentKind must be heatCapacity');
  }
  if (payload.heatCapacitySchemaVersion !== HEAT_CAPACITY_SCHEMA_VERSION) {
    errors.push('heatCapacitySchemaVersion is unsupported');
  }
  const free = isRecord(payload.free) ? payload.free : null;
  if (!free) {
    errors.push('free payload is required');
    return { valid: false, errors };
  }
  const runtime = isRecord(free.runtime) ? free.runtime : null;
  if (!runtime || !isFiniteNumber(runtime.gasAmountRatio) || runtime.gasAmountRatio <= 0) {
    errors.push('free.runtime.gasAmountRatio must be > 0');
  }
  const config = isRecord(free.config) ? free.config : null;
  const environment = config && isRecord(config.environment) ? config.environment : null;
  const physics = config && isRecord(config.physics) ? config.physics : null;
  if (!config || config.version !== HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION) {
    errors.push('free.config.version is unsupported');
  }
  if (!isRecord(free.parameterDraft)) {
    errors.push('free.parameterDraft is required');
  }
  if (
    free.gasType !== undefined &&
    free.gasType !== 'air' &&
    free.gasType !== 'helium'
  ) {
    errors.push('free.gasType must be air or helium');
  }
  if (!isRecord(free.recordConfig)) {
    errors.push('free.recordConfig is required');
  }
  if (!isFiniteNumber(free.pressureWarningMv)) {
    errors.push('free.pressureWarningMv must be a finite number');
  }
  if (typeof free.instrumentNoiseEnabled !== 'boolean') {
    errors.push('free.instrumentNoiseEnabled must be a boolean');
  }
  if (!environment || !isFiniteNumber(environment.ambientTemperatureK) || environment.ambientTemperatureK <= 0) {
    errors.push('free.config.environment.ambientTemperatureK must be > 0');
  }
  if (!physics || !isFiniteNumber(physics.gamma) || physics.gamma <= 1) {
    errors.push('free.config.physics.gamma must be > 1');
  }
  if (!isRecord(free.traceStore) || !Array.isArray(free.traceStore.traceTrials)) {
    errors.push('free.traceStore.traceTrials must be an array');
  }
  if (!Array.isArray(free.trials)) {
    errors.push('free.trials must be an array');
  }
  return { valid: errors.length === 0, errors };
};

export const getHeatCapacityPersistenceReplayFields = (
  payload: HeatCapacityPersistencePayloadV1,
): HeatCapacityFreeUiReplayV1 => (
  payload.free?.uiReplay ?? createHeatCapacityFreeUiReplay(createDefaultHeatCapacityFile(1))
);

const finiteOrDefault = (value: unknown, fallback: number) => (
  isFiniteNumber(value) ? value : fallback
);

const normalizeHeatCapacityFreeRecordConfig = (
  value: unknown,
  fallback: HeatCapacityFreeRecordConfig,
): HeatCapacityFreeRecordConfig => {
  const record = isRecord(value) ? value : {};
  return {
    u0ZeroToleranceMv: finiteOrDefault(record.u0ZeroToleranceMv, fallback.u0ZeroToleranceMv),
    pressureStableSlopeMvPerS: finiteOrDefault(
      record.pressureStableSlopeMvPerS,
      fallback.pressureStableSlopeMvPerS,
    ),
    temperatureStableSlopeMvPerS: finiteOrDefault(
      record.temperatureStableSlopeMvPerS,
      fallback.temperatureStableSlopeMvPerS,
    ),
    temperatureAmbientToleranceMv: finiteOrDefault(
      record.temperatureAmbientToleranceMv,
      fallback.temperatureAmbientToleranceMv,
    ),
    minimumUsefulU1CorrectedMv: finiteOrDefault(
      record.minimumUsefulU1CorrectedMv,
      fallback.minimumUsefulU1CorrectedMv,
    ),
    overVentedMinimumU2CorrectedMv: finiteOrDefault(
      record.overVentedMinimumU2CorrectedMv,
      fallback.overVentedMinimumU2CorrectedMv,
    ),
    pressureDangerMv: finiteOrDefault(record.pressureDangerMv, fallback.pressureDangerMv),
  };
};

const normalizeHeatCapacityFreeExperimentGroupStatus = (
  value: unknown,
  fallback: HeatCapacityFreeExperimentGroupStatus,
): HeatCapacityFreeExperimentGroupStatus => (
  value === 'draft' || value === 'running' || value === 'completed'
    ? value
    : fallback
);

const normalizeHeatCapacityFreeParameterScheme = (
  value: unknown,
  fallback: HeatCapacityFreeParameterScheme,
): HeatCapacityFreeParameterScheme => (
  value === 'ideal' || value === 'real' ? value : fallback
);

const normalizeHeatCapacityFreeConfigSnapshot = (
  value: unknown,
): HeatCapacityFreeConfigSnapshot => {
  const fallback = createDefaultFreeConfigSnapshot();
  if (!isRecord(value) || value.version !== HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION) {
    return fallback;
  }
  const environment = isRecord(value.environment) ? value.environment : {};
  const physics = isRecord(value.physics) ? value.physics : {};
  const thermal = isRecord(physics.thermal) ? physics.thermal : {};
  const pumpValveExchange = isRecord(physics.pumpValveExchange) ? physics.pumpValveExchange : {};
  const environmentDisturbance = isRecord(physics.environmentDisturbance)
    ? physics.environmentDisturbance
    : {};
  const leakage = isRecord(physics.leakage) ? physics.leakage : {};
  const sensor = isRecord(value.sensor) ? value.sensor : {};
  const pressureNonlinearity = isRecord(sensor.pressureNonlinearity)
    ? sensor.pressureNonlinearity
    : {};
  const record = isRecord(value.record) ? value.record : {};
  const scoring = isRecord(value.scoring) ? value.scoring : {};
  return {
    version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    environment: {
      ambientPressureKPa: finiteOrDefault(
        environment.ambientPressureKPa,
        fallback.environment.ambientPressureKPa,
      ),
      ambientTemperatureK: finiteOrDefault(
        environment.ambientTemperatureK,
        fallback.environment.ambientTemperatureK,
      ),
    },
    physics: {
      gamma: finiteOrDefault(physics.gamma, fallback.physics.gamma),
      vesselVolumeL: finiteOrDefault(physics.vesselVolumeL, fallback.physics.vesselVolumeL),
      pumpAmountGainRatio: finiteOrDefault(
        physics.pumpAmountGainRatio,
        fallback.physics.pumpAmountGainRatio,
      ),
      pumpPressureLimitKPa: finiteOrDefault(
        physics.pumpPressureLimitKPa,
        fallback.physics.pumpPressureLimitKPa,
      ),
      pumpStrokeDurationS: finiteOrDefault(
        physics.pumpStrokeDurationS,
        fallback.physics.pumpStrokeDurationS,
      ),
      recommendedPumpIntervalS: finiteOrDefault(
        physics.recommendedPumpIntervalS,
        fallback.physics.recommendedPumpIntervalS,
      ),
      stopcockFlowRate: finiteOrDefault(physics.stopcockFlowRate, fallback.physics.stopcockFlowRate),
      releaseVisualResponseDelayS: finiteOrDefault(
        physics.releaseVisualResponseDelayS,
        fallback.physics.releaseVisualResponseDelayS,
      ),
      releaseVisualMainDurationS: finiteOrDefault(
        physics.releaseVisualMainDurationS,
        fallback.physics.releaseVisualMainDurationS,
      ),
      thermal: {
        gasWallConductanceWPerK: finiteOrDefault(
          thermal.gasWallConductanceWPerK,
          fallback.physics.thermal.gasWallConductanceWPerK,
        ),
        wallAmbientConductanceWPerK: finiteOrDefault(
          thermal.wallAmbientConductanceWPerK,
          fallback.physics.thermal.wallAmbientConductanceWPerK,
        ),
        wallHeatCapacityJPerK: finiteOrDefault(
          thermal.wallHeatCapacityJPerK,
          fallback.physics.thermal.wallHeatCapacityJPerK,
        ),
        minimumGasHeatCapacityJPerK: finiteOrDefault(
          thermal.minimumGasHeatCapacityJPerK,
          fallback.physics.thermal.minimumGasHeatCapacityJPerK,
        ),
      },
      pumpValveExchange: normalizeFreePumpValveExchangeConfig({
        enabled: pumpValveExchange.enabled === true,
        gasExchangeRatePerS: finiteOrDefault(
          pumpValveExchange.gasExchangeRatePerS,
          fallback.physics.pumpValveExchange?.gasExchangeRatePerS ?? 0.00015,
        ),
        thermalConductanceWPerK: finiteOrDefault(
          pumpValveExchange.thermalConductanceWPerK,
          fallback.physics.pumpValveExchange?.thermalConductanceWPerK ?? 0.01,
        ),
        openingDelayS: finiteOrDefault(
          pumpValveExchange.openingDelayS,
          fallback.physics.pumpValveExchange?.openingDelayS ?? 0.42,
        ),
      }),
      environmentDisturbance: normalizeFreeEnvironmentDisturbanceConfig({
        enabled: environmentDisturbance.enabled === true,
        pressureAmplitudeKPa: finiteOrDefault(
          environmentDisturbance.pressureAmplitudeKPa,
          fallback.physics.environmentDisturbance?.pressureAmplitudeKPa ?? 0.002,
        ),
        temperatureAmplitudeK: finiteOrDefault(
          environmentDisturbance.temperatureAmplitudeK,
          fallback.physics.environmentDisturbance?.temperatureAmplitudeK ?? 0.015,
        ),
        timeScaleS: finiteOrDefault(
          environmentDisturbance.timeScaleS,
          fallback.physics.environmentDisturbance?.timeScaleS ?? 180,
        ),
      }),
      leakage: {
        enabled: leakage.enabled === true,
        ratePerS: finiteOrDefault(leakage.ratePerS, fallback.physics.leakage.ratePerS),
      },
    },
    sensor: {
      pressureMvPerKPa: finiteOrDefault(sensor.pressureMvPerKPa, fallback.sensor.pressureMvPerKPa),
      temperatureMvAtAmbient: finiteOrDefault(
        sensor.temperatureMvAtAmbient,
        fallback.sensor.temperatureMvAtAmbient,
      ),
      temperatureMvPerK: finiteOrDefault(sensor.temperatureMvPerK, fallback.sensor.temperatureMvPerK),
      lagRate: finiteOrDefault(sensor.lagRate, fallback.sensor.lagRate),
      pumpLagRate: finiteOrDefault(sensor.pumpLagRate, fallback.sensor.pumpLagRate),
      noiseMv: finiteOrDefault(sensor.noiseMv, fallback.sensor.noiseMv),
      quantizationMv: finiteOrDefault(sensor.quantizationMv, fallback.sensor.quantizationMv),
      minSampleIntervalS: finiteOrDefault(sensor.minSampleIntervalS, fallback.sensor.minSampleIntervalS),
      maxSampleIntervalS: finiteOrDefault(sensor.maxSampleIntervalS, fallback.sensor.maxSampleIntervalS),
      fastProcessSampleStepS: finiteOrDefault(
        sensor.fastProcessSampleStepS,
        fallback.sensor.fastProcessSampleStepS,
      ),
      historyWindowS: finiteOrDefault(sensor.historyWindowS, fallback.sensor.historyWindowS),
      pressureNonlinearity: normalizeFreePressureSensorNonlinearityConfig({
        enabled: pressureNonlinearity.enabled === true,
        kneeMv: finiteOrDefault(
          pressureNonlinearity.kneeMv,
          fallback.sensor.pressureNonlinearity?.kneeMv ?? 70,
        ),
        minGain: finiteOrDefault(
          pressureNonlinearity.minGain,
          fallback.sensor.pressureNonlinearity?.minGain ?? 0.72,
        ),
        exponent: finiteOrDefault(
          pressureNonlinearity.exponent,
          fallback.sensor.pressureNonlinearity?.exponent ?? 1.8,
        ),
        extraNoiseMv: finiteOrDefault(
          pressureNonlinearity.extraNoiseMv,
          fallback.sensor.pressureNonlinearity?.extraNoiseMv ?? 0.08,
        ),
      }),
    },
    record: {
      u0ZeroToleranceMv: finiteOrDefault(record.u0ZeroToleranceMv, fallback.record.u0ZeroToleranceMv),
      pressureStableSlopeMvPerS: finiteOrDefault(
        record.pressureStableSlopeMvPerS,
        fallback.record.pressureStableSlopeMvPerS,
      ),
      temperatureStableSlopeMvPerS: finiteOrDefault(
        record.temperatureStableSlopeMvPerS,
        fallback.record.temperatureStableSlopeMvPerS,
      ),
      temperatureAmbientToleranceMv: finiteOrDefault(
        record.temperatureAmbientToleranceMv,
        fallback.record.temperatureAmbientToleranceMv,
      ),
      minimumUsefulU1CorrectedMv: finiteOrDefault(
        record.minimumUsefulU1CorrectedMv,
        fallback.record.minimumUsefulU1CorrectedMv,
      ),
      overVentedMinimumU2CorrectedMv: finiteOrDefault(
        record.overVentedMinimumU2CorrectedMv,
        fallback.record.overVentedMinimumU2CorrectedMv,
      ),
      pressureWarningMv: finiteOrDefault(record.pressureWarningMv, fallback.record.pressureWarningMv),
      pressureDangerMv: finiteOrDefault(record.pressureDangerMv, fallback.record.pressureDangerMv),
    },
    scoring: {
      processScoringVersion: scoring.processScoringVersion === HEAT_CAPACITY_PROCESS_SCORING_VERSION
        ? HEAT_CAPACITY_PROCESS_SCORING_VERSION
        : fallback.scoring.processScoringVersion,
    },
  };
};

const createPhysicsConfigFromSnapshot = (
  snapshot: HeatCapacityFreeConfigSnapshot,
  gasType: HeatCapacityFreeGasType,
): HeatCapacityFreePhysicsConfig => normalizeHeatCapacityFreePhysicsConfig({
  environment: { ...snapshot.environment },
  vesselVolumeL: snapshot.physics.vesselVolumeL,
  gamma: getHeatCapacityFreeGasTypeGamma(gasType),
  pumpAmountGainRatio: snapshot.physics.pumpAmountGainRatio,
  pumpPressureLimitKPa: snapshot.physics.pumpPressureLimitKPa,
  stopcockFlowRate: snapshot.physics.stopcockFlowRate,
  thermal: { ...snapshot.physics.thermal },
  pumpValveExchange: normalizeFreePumpValveExchangeConfig(snapshot.physics.pumpValveExchange),
  environmentDisturbance: normalizeFreeEnvironmentDisturbanceConfig(snapshot.physics.environmentDisturbance),
  leakage: { ...snapshot.physics.leakage },
});

const createSensorConfigFromSnapshot = (
  snapshot: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeSensorConfig => ({
  pressureMvPerKPa: snapshot.sensor.pressureMvPerKPa,
  temperatureMvAtAmbient: snapshot.sensor.temperatureMvAtAmbient,
  temperatureMvPerK: snapshot.sensor.temperatureMvPerK,
  lagRate: snapshot.sensor.lagRate,
  noiseMv: snapshot.sensor.noiseMv,
  quantizationMv: snapshot.sensor.quantizationMv,
  minSampleIntervalS: snapshot.sensor.minSampleIntervalS,
  maxSampleIntervalS: snapshot.sensor.maxSampleIntervalS,
  historyWindowS: snapshot.sensor.historyWindowS,
  pressureNonlinearity: normalizeFreePressureSensorNonlinearityConfig(snapshot.sensor.pressureNonlinearity),
});

const createRuntimeFieldsFromRestoredFreeDomain = (
  domain: HeatCapacityFreeExperimentDomainState,
) => {
  const parameterDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    domain.physicsConfig,
    domain.sensorConfig,
    domain.recordConfig,
    domain.pressureWarningMv,
    domain.instrumentNoiseEnabled,
  );
  const gasTypeGamma = getHeatCapacityFreeGasTypeGamma(parameterDraft.gasType);
  return {
    heatCapacityFreeGasType: parameterDraft.gasType,
    heatCapacityFreeExperimentGroupStatus: domain.experimentGroupStatus,
    heatCapacityFreeParameterDraft: parameterDraft,
    heatCapacityFreeActiveRunConfigSnapshot: domain.activeRunConfigSnapshot,
    heatCapacityFreeRecordConfig: domain.recordConfig,
    heatCapacityFreePressureWarningMv: domain.pressureWarningMv,
    heatCapacityFreeInstrumentNoiseEnabled: domain.instrumentNoiseEnabled,
    heatCapacityFreeEnvironmentConfig: domain.environmentConfig,
    heatCapacityFreePhysicsConfig: {
      ...domain.physicsConfig,
      gamma: gasTypeGamma,
    },
    heatCapacityFreePhysicsState: domain.physicsState,
    heatCapacityFreeSensorConfig: domain.sensorConfig,
    heatCapacityFreeSensorState: domain.sensorState,
    heatCapacityFreeCalibrationState: domain.calibrationState,
    heatCapacityFreeStopcockFlowOpen: domain.stopcockFlowOpen,
    heatCapacityFreeStopcockPendingOpenAtMs: domain.stopcockPendingOpenAtMs,
    heatCapacityFreeStopcockFlowPurpose: domain.stopcockFlowPurpose,
    heatCapacityFreeRollbackSnapshots: domain.rollbackSnapshots,
    heatCapacityFreeTraceStore: domain.traceStore,
    heatCapacityFreeTrials: domain.trials,
    theoreticalGamma: gasTypeGamma,
  };
};

const createHeatCapacityPersistenceSourceFile = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  // Boundary rule: real/ideal domains are the durable stores; top-level fields are
  // only the active runtime projection. If that projection is visibly polluted by
  // ideal thermal settings, rebuild it from the active domain before persisting.
  const normalizedRealDomain = normalizeHeatCapacityFreeExperimentDomainBoundary(
    file.heatCapacityFreeRealDomain,
    'real',
    file.heatCapacityFreeGasType,
  );
  const normalizedIdealDomain = normalizeHeatCapacityFreeExperimentDomainBoundary(
    file.heatCapacityFreeIdealDomain,
    'ideal',
    'air',
  );
  const fileWithBoundaryDomains: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityFreeRealDomain: normalizedRealDomain,
    heatCapacityFreeIdealDomain: normalizedIdealDomain,
  };
  const activeDomain = file.heatCapacityFreeParameterScheme === 'ideal'
    ? normalizedIdealDomain
    : normalizedRealDomain;
  const useDomainAsActiveSource =
    file.heatCapacityFreeParameterScheme === 'real' &&
    hasHeatCapacityFreeIdealThermalBoundaryContamination(file.heatCapacityFreePhysicsConfig);
  const synchronizedFile = useDomainAsActiveSource
    ? {
        ...fileWithBoundaryDomains,
        ...createRuntimeFieldsFromRestoredFreeDomain(activeDomain),
      }
    : storeHeatCapacityFreeRuntimeFieldsInDomain(
        fileWithBoundaryDomains,
        file.heatCapacityFreeParameterScheme,
      );

  return {
    ...synchronizedFile,
    heatCapacityFreeRealDomain: normalizeHeatCapacityFreeExperimentDomainBoundary(
      synchronizedFile.heatCapacityFreeRealDomain,
      'real',
      synchronizedFile.heatCapacityFreeGasType,
    ),
    heatCapacityFreeIdealDomain: normalizeHeatCapacityFreeExperimentDomainBoundary(
      synchronizedFile.heatCapacityFreeIdealDomain,
      'ideal',
      'air',
    ),
  };
};

const normalizePayloadMode = (
  value: unknown,
): WorkbenchHeatCapacityState['heatCapacityMode'] => (
  value === 'demo' || value === 'guide' || value === 'free' ? value : 'free'
);

const normalizePumpBulbState = (
  value: unknown,
): WorkbenchHeatCapacityState['pumpBulbState'] => (
  value === 'compressing' || value === 'releasing' || value === 'idle' ? value : 'idle'
);

const normalizePersistedStopcockFlowPurpose = (
  value: unknown,
  stopcockOpen: boolean,
): WorkbenchHeatCapacityState['heatCapacityFreeStopcockFlowPurpose'] => {
  if (!stopcockOpen) return 'none';
  return value === 'release' || value === 'zeroing' ? value : 'none';
};

const hasCurrentFreeParameterPayload = (
  value: Partial<HeatCapacityFreePersistenceDataV1> | null,
) => (
  isRecord(value?.parameterDraft) &&
  isRecord(value?.recordConfig) &&
  isFiniteNumber(value?.pressureWarningMv) &&
  typeof value?.instrumentNoiseEnabled === 'boolean'
);

const restoreEquilibriumSpeed = (
  value: unknown,
): WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier => (
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(
    value ?? HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  )
);

const guideWorkflowSteps = new Set([
  'powerRequired',
  'openStopcockForZeroRequired',
  'zeroRequired',
  'recordU0Required',
  'closeStopcockBeforePumpRequired',
  'openPumpValveRequired',
  'pumpRequired',
  'closePumpValveRequired',
  'u1Waiting',
  'recordU1Required',
  'openStopcockForReleaseRequired',
  'closeStopcockAfterReleaseRequired',
  'u2Waiting',
  'recordU2Required',
  'closePowerRequired',
  'completed',
]);

const normalizeGuideWorkflow = (
  value: unknown,
  fallback: WorkbenchHeatCapacityState['heatCapacityGuideWorkflow'],
): WorkbenchHeatCapacityState['heatCapacityGuideWorkflow'] => {
  if (!isRecord(value) || typeof value.step !== 'string' || !guideWorkflowSteps.has(value.step)) {
    return fallback;
  }
  return {
    ...fallback,
    ...value,
    step: value.step as WorkbenchHeatCapacityState['heatCapacityGuideWorkflow']['step'],
    speedMultiplier: restoreEquilibriumSpeed(value.speedMultiplier),
    paused: value.paused === true,
    waitStartedAtS: isFiniteNumber(value.waitStartedAtS) ? value.waitStartedAtS : null,
    waitStage: value.waitStage === 'u1' || value.waitStage === 'u2' ? value.waitStage : null,
    strongReminderActive: value.strongReminderActive === true,
    strongReminderTargetControlId: typeof value.strongReminderTargetControlId === 'string'
      ? value.strongReminderTargetControlId
      : null,
  };
};

const normalizeGuidePhysicsConfig = (
  value: unknown,
  fallback: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig'],
): WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig'] => (
  isRecord(value)
    ? {
        ...fallback,
        ...clonePersistenceValue(value),
        environment: isRecord(value.environment)
          ? { ...fallback.environment, ...clonePersistenceValue(value.environment) }
          : fallback.environment,
        thermal: isRecord(value.thermal)
          ? { ...fallback.thermal, ...clonePersistenceValue(value.thermal) }
          : fallback.thermal,
      } as WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig']
    : fallback
);

const normalizeGuidePhysicsState = (
  value: unknown,
  fallback: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState'],
): WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState'] => (
  isRecord(value)
    ? {
        ...fallback,
        ...clonePersistenceValue(value),
        simulationTimeS: finiteOrDefault(value.simulationTimeS, fallback.simulationTimeS),
        gasAmountRatio: finiteOrDefault(value.gasAmountRatio, fallback.gasAmountRatio),
        gasTemperatureK: finiteOrDefault(value.gasTemperatureK, fallback.gasTemperatureK),
        wallTemperatureK: finiteOrDefault(value.wallTemperatureK, fallback.wallTemperatureK),
        pumpProcesses: Array.isArray(value.pumpProcesses)
          ? clonePersistenceValue(value.pumpProcesses)
          : fallback.pumpProcesses,
        pumpStrokeCount: finiteOrDefault(value.pumpStrokeCount, fallback.pumpStrokeCount),
        lastPumpStrokeAtS: isFiniteNumber(value.lastPumpStrokeAtS) ? value.lastPumpStrokeAtS : null,
        lastPumpValveOpenedAtS: isFiniteNumber(value.lastPumpValveOpenedAtS) ? value.lastPumpValveOpenedAtS : null,
        lastPumpValveClosedAtS: isFiniteNumber(value.lastPumpValveClosedAtS) ? value.lastPumpValveClosedAtS : null,
        lastStopcockOpenedAtS: isFiniteNumber(value.lastStopcockOpenedAtS) ? value.lastStopcockOpenedAtS : null,
        lastStopcockClosedAtS: isFiniteNumber(value.lastStopcockClosedAtS) ? value.lastStopcockClosedAtS : null,
      } as WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState']
    : fallback
);

const normalizeGuideTrial = (
  value: unknown,
): WorkbenchHeatCapacityState['heatCapacityGuideTrial'] => (
  isRecord(value) && (value.source === 'guide' || value.source === 'demo') && typeof value.id === 'string'
    ? clonePersistenceValue(value) as unknown as WorkbenchHeatCapacityState['heatCapacityGuideTrial']
    : null
);

export const restoreHeatCapacityFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchHeatCapacityState => {
  const fallback = createDefaultHeatCapacityFile(index);
  const heatPayload = isRecord(payload) ? payload as Partial<HeatCapacityPersistencePayloadV1> : {};
  const free = isRecord(heatPayload.free) ? heatPayload.free as Partial<HeatCapacityFreePersistenceDataV1> : null;
  const guided = isRecord(heatPayload.guided) ? heatPayload.guided as Partial<HeatCapacityGuidePersistenceDataV1> : null;
  const common = isRecord(heatPayload.common) ? heatPayload.common as Partial<HeatCapacityPersistencePayloadV1['common']> : {};
  const restoredMode = normalizePayloadMode(heatPayload.mode);
  const freeHasCurrentParameterPayload = hasCurrentFreeParameterPayload(free);
  const snapshot = freeHasCurrentParameterPayload
    ? normalizeHeatCapacityFreeConfigSnapshot(free?.config)
    : createDefaultFreeConfigSnapshot();
  const uiReplay = isRecord(free?.uiReplay) ? free!.uiReplay as Partial<HeatCapacityFreeUiReplayV1> : {};
  const controls = isRecord(free?.controls) ? free!.controls as Partial<HeatCapacityFreePersistenceDataV1['controls']> : {};
  const parameterDraftRecord = isRecord(free?.parameterDraft) ? free!.parameterDraft as Record<string, unknown> : {};
  const restoredGasType = normalizeHeatCapacityFreeGasType(
    free?.gasType,
    normalizeHeatCapacityFreeGasType(
      parameterDraftRecord.gasType,
      resolveHeatCapacityFreeGasTypeFromGamma(parameterDraftRecord.gamma ?? snapshot.physics.gamma),
    ),
  );
  const physicsConfig = createPhysicsConfigFromSnapshot(snapshot, restoredGasType);
  const sensorConfig = createSensorConfigFromSnapshot(snapshot);
  const fallbackRecordConfig = {
    ...fallback.heatCapacityFreeRecordConfig,
    u0ZeroToleranceMv: snapshot.record.u0ZeroToleranceMv,
    pressureStableSlopeMvPerS: snapshot.record.pressureStableSlopeMvPerS,
    temperatureStableSlopeMvPerS: snapshot.record.temperatureStableSlopeMvPerS,
    temperatureAmbientToleranceMv: snapshot.record.temperatureAmbientToleranceMv,
    minimumUsefulU1CorrectedMv: snapshot.record.minimumUsefulU1CorrectedMv,
    overVentedMinimumU2CorrectedMv: snapshot.record.overVentedMinimumU2CorrectedMv,
    pressureDangerMv: snapshot.record.pressureDangerMv,
  };
  const recordConfig = freeHasCurrentParameterPayload
    ? normalizeHeatCapacityFreeRecordConfig(free?.recordConfig, fallbackRecordConfig)
    : fallback.heatCapacityFreeRecordConfig;
  const pressureWarningMv = freeHasCurrentParameterPayload
    ? finiteOrDefault(free?.pressureWarningMv, snapshot.record.pressureWarningMv ?? HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV)
    : fallback.heatCapacityFreePressureWarningMv;
  const instrumentNoiseEnabled = freeHasCurrentParameterPayload
    ? free?.instrumentNoiseEnabled === true
    : fallback.heatCapacityFreeInstrumentNoiseEnabled;
  const fallbackDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    physicsConfig,
    sensorConfig,
    recordConfig,
    pressureWarningMv,
    instrumentNoiseEnabled,
  );
  const parameterDraft = freeHasCurrentParameterPayload
    ? normalizeHeatCapacityFreeParameterDraft(
        {
          ...parameterDraftRecord,
          gasType: restoredGasType,
        },
        fallbackDraft,
      )
    : fallback.heatCapacityFreeParameterDraft;
  const activeRunConfigSnapshot = free?.activeRunConfigSnapshot === null
    ? null
    : freeHasCurrentParameterPayload && isRecord(free?.activeRunConfigSnapshot)
      ? normalizeHeatCapacityFreeConfigSnapshot(free.activeRunConfigSnapshot)
      : null;
  const layout = fileEnvelope.layout;
  const visiblePanels = Array.isArray(layout.visiblePanels)
    ? layout.visiblePanels.filter((panel): panel is WorkbenchHeatCapacityState['visiblePanels'][number] => (
        panel === 'preview' ||
        panel === 'realtime' ||
        panel === 'heatCapacityGuide' ||
        panel === 'heatCapacityRecords' ||
        panel === 'heatCapacityReview'
      ))
    : fallback.visiblePanels;
  const liveWorkspaceSplitRatio = isFiniteNumber(layout.liveWorkspaceSplitRatio)
    ? layout.liveWorkspaceSplitRatio
    : fallback.liveWorkspaceSplitRatio;
  const restoredFreeTrials = Array.isArray(free?.trials)
    ? free!.trials
        .map(normalizePersistedHeatCapacityFreeTrial)
        .filter((trial): trial is HeatCapacityFreeTrial => trial !== null)
    : fallback.heatCapacityFreeTrials;
  const restoredParameterScheme = normalizeHeatCapacityFreeParameterScheme(
    free?.parameterScheme,
    fallback.heatCapacityFreeParameterScheme,
  );
  const restoredDisplayScheme = normalizeHeatCapacityFreeParameterScheme(
    free?.displayScheme,
    restoredParameterScheme,
  );
  const hasPersistedRealDomain = isRecord(free?.real);
  const hasPersistedIdealDomain = isRecord(free?.ideal);
  const restoredRealDomain = hasPersistedRealDomain
    ? clonePersistenceValue(free!.real) as unknown as HeatCapacityFreeExperimentDomainState
    : createDefaultHeatCapacityFreeExperimentDomainState('real', `${fileEnvelope.id}:real`);
  const restoredIdealDomain = hasPersistedIdealDomain
    ? clonePersistenceValue(free!.ideal) as unknown as HeatCapacityFreeExperimentDomainState
    : createDefaultHeatCapacityFreeExperimentDomainState('ideal', `${fileEnvelope.id}:ideal`);
  const restoredRealDomainWithGasType = normalizeHeatCapacityFreeExperimentDomainBoundary(
    restoredRealDomain,
    'real',
    restoredGasType,
  );
  const restoredIdealDomainWithGasType = normalizeHeatCapacityFreeExperimentDomainBoundary(
    restoredIdealDomain,
    'ideal',
    'air',
  );
  const restoredActiveDomain = restoredParameterScheme === 'ideal'
    ? restoredIdealDomainWithGasType
    : restoredRealDomainWithGasType;
  const activeDomainPersisted = restoredParameterScheme === 'ideal'
    ? hasPersistedIdealDomain
    : hasPersistedRealDomain;
  const hasPersistedActiveDomain = freeHasCurrentParameterPayload && activeDomainPersisted;
  const restoredActiveDomainRuntimeFields = hasPersistedActiveDomain
    ? createRuntimeFieldsFromRestoredFreeDomain(restoredActiveDomain)
    : null;
  const restoredStopcockFlowOpen = controls.stopcockFlowOpen === true;
  const restoredStopcockPendingOpenAtMs =
    typeof uiReplay.heatCapacityFreeStopcockPendingOpenAtMs === 'number' &&
    Number.isFinite(uiReplay.heatCapacityFreeStopcockPendingOpenAtMs)
      ? uiReplay.heatCapacityFreeStopcockPendingOpenAtMs
      : null;
  const restoredStopcockFlowPurpose = normalizePersistedStopcockFlowPurpose(
    controls.stopcockFlowPurpose,
    restoredStopcockFlowOpen || restoredStopcockPendingOpenAtMs !== null,
  );
  const restoredOpenHeatCapacityTabs = Array.isArray(common.openHeatCapacityTabs)
    ? common.openHeatCapacityTabs.filter((tab): tab is WorkbenchHeatCapacityState['openHeatCapacityTabs'][number] => (
        tab === 'guide' ||
        tab === 'records' ||
        tab === 'review'
      ))
    : fallback.openHeatCapacityTabs;
  const restoredActiveHeatCapacityTabId =
    common.activeHeatCapacityTabId === 'guide' ||
    common.activeHeatCapacityTabId === 'records' ||
    common.activeHeatCapacityTabId === 'review'
      ? common.activeHeatCapacityTabId
      : fallback.activeHeatCapacityTabId;
  const restoredSelectedHeatCapacityPanel =
    common.selectedHeatCapacityPanel === 'heatCapacityGuide' ||
    common.selectedHeatCapacityPanel === 'heatCapacityRecords' ||
    common.selectedHeatCapacityPanel === 'heatCapacityReview'
      ? common.selectedHeatCapacityPanel
      : fallback.selectedHeatCapacityPanel;
  const restoredGuideFields = guided
    ? {
        heatCapacityGuidePhysicsConfig: normalizeGuidePhysicsConfig(
          guided.physicsConfig,
          fallback.heatCapacityGuidePhysicsConfig,
        ),
        heatCapacityGuidePhysicsState: normalizeGuidePhysicsState(
          guided.physicsState,
          fallback.heatCapacityGuidePhysicsState,
        ),
        heatCapacityGuideWorkflow: normalizeGuideWorkflow(
          guided.workflow,
          fallback.heatCapacityGuideWorkflow,
        ),
        heatCapacityGuideTrial: normalizeGuideTrial(guided.trial),
      }
    : {
        heatCapacityGuidePhysicsConfig: fallback.heatCapacityGuidePhysicsConfig,
        heatCapacityGuidePhysicsState: fallback.heatCapacityGuidePhysicsState,
        heatCapacityGuideWorkflow: fallback.heatCapacityGuideWorkflow,
        heatCapacityGuideTrial: fallback.heatCapacityGuideTrial,
      };

  return {
    ...fallback,
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    visiblePanels: visiblePanels.length > 0 ? visiblePanels : fallback.visiblePanels,
    liveWorkspaceSplitRatio,
    heatCapacityMode: restoredMode,
    heatCapacityExperimentSeed: common.experimentSeed ?? fallback.heatCapacityExperimentSeed,
    heatCapacityExperimentProfile: common.experimentProfile ?? fallback.heatCapacityExperimentProfile,
    selectedHeatCapacityPanel: restoredSelectedHeatCapacityPanel,
    openHeatCapacityTabs: restoredOpenHeatCapacityTabs,
    activeHeatCapacityTabId: restoredActiveHeatCapacityTabId,
    heatCapacityFreeRuntimeVersion: free?.runtimeVersion ?? HEAT_CAPACITY_FREE_RUNTIME_VERSION,
    heatCapacityFreeTraceVersion: free?.traceVersion ?? HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeParameterScheme: restoredParameterScheme,
    heatCapacityFreeDisplayScheme: restoredDisplayScheme,
    heatCapacityFreeGasType: parameterDraft.gasType,
    heatCapacityFreeRealDomain: restoredRealDomainWithGasType,
    heatCapacityFreeIdealDomain: restoredIdealDomainWithGasType,
    heatCapacityFreeEnvironmentConfig: { ...snapshot.environment },
    heatCapacityFreeExperimentGroupStatus: normalizeHeatCapacityFreeExperimentGroupStatus(
      free?.experimentGroupStatus,
      fallback.heatCapacityFreeExperimentGroupStatus,
    ),
    heatCapacityFreeParameterDraft: parameterDraft,
    heatCapacityFreeActiveRunConfigSnapshot: activeRunConfigSnapshot,
    heatCapacityFreeFileAcknowledgements: {
      ...createDefaultHeatCapacityFreeFileAcknowledgements(),
      ...(free?.acknowledgements ?? {}),
    },
    heatCapacityFreeRecordConfig: recordConfig,
    heatCapacityFreePressureWarningMv: pressureWarningMv,
    heatCapacityFreeInstrumentNoiseEnabled: instrumentNoiseEnabled,
    heatCapacityFreePhysicsConfig: {
      ...physicsConfig,
      gamma: getHeatCapacityFreeGasTypeGamma(parameterDraft.gasType),
    },
    heatCapacityFreePhysicsState: free?.runtime ?? fallback.heatCapacityFreePhysicsState,
    heatCapacityFreeSensorConfig: sensorConfig,
    heatCapacityFreeSensorState: free?.sensor ?? fallback.heatCapacityFreeSensorState,
    heatCapacityFreeCalibrationState: free?.calibration ?? fallback.heatCapacityFreeCalibrationState,
    heatCapacityFreeRollbackSnapshots: free?.rollbackSnapshots ?? fallback.heatCapacityFreeRollbackSnapshots,
    heatCapacityFreeTraceStore: free?.traceStore ?? createDefaultFreeTraceStore(),
    heatCapacityFreeTrials: restoredFreeTrials,
    ...(restoredActiveDomainRuntimeFields ?? {}),
    ...uiReplay,
    theoreticalGamma: getHeatCapacityFreeGasTypeGamma(parameterDraft.gasType),
    heatCapacityFreeEquilibriumSpeedMultiplier: restoreEquilibriumSpeed(
      uiReplay.heatCapacityFreeEquilibriumSpeedMultiplier,
    ),
    powerOn: controls.powerOn === true,
    pumpValveOpen: controls.pumpValveOpen === true,
    pumpValveState: controls.pumpValveOpen === true ? 'open' : 'closed',
    pumpBulbState: normalizePumpBulbState(controls.pumpBulbState ?? uiReplay.pumpBulbState),
    heatCapacityFreeStopcockFlowOpen: restoredStopcockFlowOpen,
    heatCapacityFreeStopcockPendingOpenAtMs: restoredStopcockPendingOpenAtMs,
    heatCapacityFreeStopcockFlowPurpose: restoredStopcockFlowPurpose,
    ...restoredGuideFields,
  };
};
