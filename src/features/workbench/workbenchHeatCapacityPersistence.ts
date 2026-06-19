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
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  normalizeHeatCapacityFreePhysicsConfig,
  type WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import {
  createHeatCapacityFreeParameterDraftFromConfigs,
  normalizeHeatCapacityFreeParameterDraft,
  type HeatCapacityFreeExperimentGroupStatus,
  type HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type {
  WorkbenchExperimentFileEnvelopeV1,
} from './workbenchPersistenceSchema.ts';

export const HEAT_CAPACITY_SCHEMA_VERSION = 1 as const;
export const HEAT_CAPACITY_REFERENCE_GENERATOR_VERSION = 'free-reference-v1' as const;
export const HEAT_CAPACITY_PROCESS_SCORING_VERSION = 'free-process-score-v1' as const;

const heatCapacityFreeUiReplayKeys = [
  'selectedHeatCapacityPanel',
  'openHeatCapacityTabs',
  'activeHeatCapacityTabId',
  'heatCapacityMaterialsExpanded',
  'heatCapacityTabContainerHeight',
  'heatCapacityExpectedTrialCount',
  'heatCapacityExpectedTrialCountMode',
  'heatCapacityActiveTrialIndex',
  'heatCapacityProcessingCalculated',
  'heatCapacityProcessingResult',
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
  'pressureRawPlaceholder',
  'pressureDisplayedPlaceholder',
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
  'heatCapacityFreeEquilibriumSpeedMultiplier',
  'heatCapacityFreeEquilibriumSpeedHintShown',
  'hardSphereViewEnabled',
  'hardSphereParticleMultiplier',
  'hardSphereSpeedMultiplier',
  'hardSphereTrailsEnabled',
  'visualizationMode',
  'calculationModel',
  'pressureSensitivityMvPerKPa',
  'pressurePlaceholder',
  'temperaturePlaceholder',
  'recordedPressures',
  'heatCapacityProcessSamples',
  'theoreticalGamma',
] as const satisfies readonly (keyof WorkbenchHeatCapacityState)[];

export type HeatCapacityFreeUiReplayV1 = Pick<
  WorkbenchHeatCapacityState,
  typeof heatCapacityFreeUiReplayKeys[number]
>;

export interface HeatCapacityReferenceStoreV1 {
  standard: null | HeatCapacityReferenceCurveV1;
  operableBest: null | HeatCapacityReferenceCurveV1;
}

export interface HeatCapacityReferenceCurveV1 {
  id: string;
  kind: 'standard' | 'operableBest';
  generatorVersion: string;
  generatedAt: number;
  configSnapshot: HeatCapacityFreeConfigSnapshot;
  operationScript: {
    steps: Array<{
      action: string;
      atS: number;
      durationS?: number;
    }>;
  };
  alignmentMode: 'nativeTime' | 'stageScaled';
  trace: Array<{
    sampleId: string;
    stageId: string;
    timeS: number;
    pressureDeltaKPa: number;
    temperatureDeltaK: number;
  }>;
  stages: Array<{
    id: string;
    label: string;
    startS: number;
    endS: number;
    countText?: string;
    durationText?: string;
  }>;
  records: {
    u0: unknown | null;
    u1: unknown | null;
    u2: unknown | null;
  };
}

export interface HeatCapacityFreePersistenceDataV1 {
  runtimeVersion: typeof HEAT_CAPACITY_FREE_RUNTIME_VERSION;
  traceVersion: typeof HEAT_CAPACITY_FREE_TRACE_VERSION;
  calculationVersion: typeof HEAT_CAPACITY_FREE_CALCULATION_VERSION;
  config: HeatCapacityFreeConfigSnapshot;
  parameterDraft?: HeatCapacityFreeParameterDraft;
  experimentGroupStatus?: HeatCapacityFreeExperimentGroupStatus;
  activeRunConfigSnapshot?: HeatCapacityFreeConfigSnapshot | null;
  advancedRiskAccepted?: boolean;
  recordConfig?: HeatCapacityFreeRecordConfig;
  pressureWarningMv?: number;
  instrumentNoiseEnabled?: boolean;
  runtime: WorkbenchHeatCapacityState['heatCapacityFreePhysicsState'];
  controls: {
    powerOn: boolean;
    pumpValveOpen: boolean;
    stopcockOpen: boolean;
    pumpBulbState: WorkbenchHeatCapacityState['pumpBulbState'];
    stopcockFlowOpen: boolean;
  };
  sensor: WorkbenchHeatCapacityState['heatCapacityFreeSensorState'];
  calibration: WorkbenchHeatCapacityState['heatCapacityFreeCalibrationState'];
  traceStore: WorkbenchHeatCapacityState['heatCapacityFreeTraceStore'];
  trials: WorkbenchHeatCapacityState['heatCapacityFreeTrials'];
  references: HeatCapacityReferenceStoreV1;
  uiReplay: HeatCapacityFreeUiReplayV1;
}

export interface HeatCapacityPersistencePayloadV1 {
  experimentKind: 'heatCapacity';
  heatCapacitySchemaVersion: typeof HEAT_CAPACITY_SCHEMA_VERSION;
  mode: WorkbenchHeatCapacityState['heatCapacityMode'];
  common: {
    trials: WorkbenchHeatCapacityState['heatCapacityTrials'];
    expectedTrialCount: number;
    expectedTrialCountMode: WorkbenchHeatCapacityState['heatCapacityExpectedTrialCountMode'];
    activeTrialIndex: number;
    materialsExpanded: boolean;
    selectedHeatCapacityPanel: WorkbenchHeatCapacityState['selectedHeatCapacityPanel'];
    openHeatCapacityTabs: WorkbenchHeatCapacityState['openHeatCapacityTabs'];
    activeHeatCapacityTabId: WorkbenchHeatCapacityState['activeHeatCapacityTabId'];
    processingCalculated: boolean;
    processingResult: WorkbenchHeatCapacityState['heatCapacityProcessingResult'];
    experimentSeed: WorkbenchHeatCapacityState['heatCapacityExperimentSeed'];
    experimentProfile: WorkbenchHeatCapacityState['heatCapacityExperimentProfile'];
  };
  free: HeatCapacityFreePersistenceDataV1 | null;
  guided: null;
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

const createHeatCapacityFreeUiReplay = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeUiReplayV1 => (
  Object.fromEntries(heatCapacityFreeUiReplayKeys.map((key) => [
    key,
    clonePersistenceValue(file[key]),
  ])) as HeatCapacityFreeUiReplayV1
);

export const createEmptyHeatCapacityReferenceStore = (): HeatCapacityReferenceStoreV1 => ({
  standard: null,
  operableBest: null,
});

export const createHeatCapacityFreeConfigSnapshotFromFile = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeConfigSnapshot => ({
  version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  environment: {
    ambientPressureKPa: file.heatCapacityFreePhysicsConfig.environment.ambientPressureKPa,
    ambientTemperatureK: file.heatCapacityFreePhysicsConfig.environment.ambientTemperatureK,
  },
  physics: {
    gamma: file.heatCapacityFreePhysicsConfig.gamma,
    vesselVolumeL: file.heatCapacityFreePhysicsConfig.vesselVolumeL,
    pumpAmountGainRatio: file.heatCapacityFreePhysicsConfig.pumpAmountGainRatio,
    pumpPressureLimitKPa: file.heatCapacityFreePhysicsConfig.pumpPressureLimitKPa,
    pumpTemperatureGainK: file.heatCapacityFreePhysicsConfig.pumpTemperatureGainK,
    pumpStrokeDurationS: FREE_PUMP_STROKE_DURATION_S,
    recommendedPumpIntervalS: 0.1,
    stopcockFlowRate: file.heatCapacityFreePhysicsConfig.stopcockFlowRate,
    releaseVisualResponseDelayS: FREE_RELEASE_RESPONSE_DELAY_S,
    releaseVisualMainDurationS: FREE_RELEASE_MAIN_DURATION_S,
    thermal: { ...file.heatCapacityFreePhysicsConfig.thermal },
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
});

export const createHeatCapacityPersistencePayload = (
  file: WorkbenchHeatCapacityState,
  savedAt: number,
): HeatCapacityPersistencePayloadV1 => {
  void savedAt;
  return {
    experimentKind: 'heatCapacity',
    heatCapacitySchemaVersion: HEAT_CAPACITY_SCHEMA_VERSION,
    mode: file.heatCapacityMode,
    common: {
      trials: clonePersistenceValue(file.heatCapacityTrials),
      expectedTrialCount: file.heatCapacityExpectedTrialCount,
      expectedTrialCountMode: file.heatCapacityExpectedTrialCountMode,
      activeTrialIndex: file.heatCapacityActiveTrialIndex,
      materialsExpanded: file.heatCapacityMaterialsExpanded,
      selectedHeatCapacityPanel: file.selectedHeatCapacityPanel,
      openHeatCapacityTabs: clonePersistenceValue(file.openHeatCapacityTabs),
      activeHeatCapacityTabId: file.activeHeatCapacityTabId,
      processingCalculated: file.heatCapacityProcessingCalculated,
      processingResult: clonePersistenceValue(file.heatCapacityProcessingResult),
      experimentSeed: file.heatCapacityExperimentSeed,
      experimentProfile: clonePersistenceValue(file.heatCapacityExperimentProfile),
    },
    free: {
      runtimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
      traceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
      calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
      config: createHeatCapacityFreeConfigSnapshotFromFile(file),
      parameterDraft: clonePersistenceValue(file.heatCapacityFreeParameterDraft),
      experimentGroupStatus: file.heatCapacityFreeExperimentGroupStatus,
      activeRunConfigSnapshot: clonePersistenceValue(file.heatCapacityFreeActiveRunConfigSnapshot),
      advancedRiskAccepted: file.heatCapacityFreeAdvancedRiskAccepted,
      recordConfig: clonePersistenceValue(file.heatCapacityFreeRecordConfig),
      pressureWarningMv: file.heatCapacityFreePressureWarningMv,
      instrumentNoiseEnabled: file.heatCapacityFreeInstrumentNoiseEnabled,
      runtime: clonePersistenceValue(file.heatCapacityFreePhysicsState),
      controls: {
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: file.glassPistonState === 'open',
        pumpBulbState: file.pumpBulbState,
        stopcockFlowOpen: file.heatCapacityFreeStopcockFlowOpen,
      },
      sensor: clonePersistenceValue(file.heatCapacityFreeSensorState),
      calibration: clonePersistenceValue(file.heatCapacityFreeCalibrationState),
      traceStore: clonePersistenceValue(file.heatCapacityFreeTraceStore),
      trials: clonePersistenceValue(file.heatCapacityFreeTrials),
      references: createEmptyHeatCapacityReferenceStore(),
      uiReplay: createHeatCapacityFreeUiReplay(file),
    },
    guided: null,
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

const normalizeHeatCapacityFreeConfigSnapshot = (
  value: unknown,
): HeatCapacityFreeConfigSnapshot => {
  const fallback = createDefaultFreeConfigSnapshot();
  if (!isRecord(value)) return fallback;
  const environment = isRecord(value.environment) ? value.environment : {};
  const physics = isRecord(value.physics) ? value.physics : {};
  const thermal = isRecord(physics.thermal) ? physics.thermal : {};
  const leakage = isRecord(physics.leakage) ? physics.leakage : {};
  const sensor = isRecord(value.sensor) ? value.sensor : {};
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
      pumpTemperatureGainK: finiteOrDefault(
        physics.pumpTemperatureGainK,
        fallback.physics.pumpTemperatureGainK,
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
        finiteOrDefault(
          physics.releaseResponseDelayS,
          fallback.physics.releaseVisualResponseDelayS,
        ),
      ),
      releaseVisualMainDurationS: finiteOrDefault(
        physics.releaseVisualMainDurationS,
        finiteOrDefault(
          physics.releaseMainDurationS,
          fallback.physics.releaseVisualMainDurationS,
        ),
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
): HeatCapacityFreePhysicsConfig => normalizeHeatCapacityFreePhysicsConfig({
  environment: { ...snapshot.environment },
  vesselVolumeL: snapshot.physics.vesselVolumeL,
  gamma: snapshot.physics.gamma,
  pumpAmountGainRatio: snapshot.physics.pumpAmountGainRatio,
  pumpPressureLimitKPa: snapshot.physics.pumpPressureLimitKPa,
  pumpTemperatureGainK: snapshot.physics.pumpTemperatureGainK,
  stopcockFlowRate: snapshot.physics.stopcockFlowRate,
  thermal: { ...snapshot.physics.thermal },
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
});

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

const restoreEquilibriumSpeed = (
  value: unknown,
): WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier => (
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(
    value ?? HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  )
);

export const restoreHeatCapacityFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchHeatCapacityState => {
  const fallback = createDefaultHeatCapacityFile(index);
  const heatPayload = isRecord(payload) ? payload as Partial<HeatCapacityPersistencePayloadV1> : {};
  const free = isRecord(heatPayload.free) ? heatPayload.free as Partial<HeatCapacityFreePersistenceDataV1> : null;
  const common = isRecord(heatPayload.common) ? heatPayload.common as Partial<HeatCapacityPersistencePayloadV1['common']> : {};
  const snapshot = normalizeHeatCapacityFreeConfigSnapshot(free?.config);
  const uiReplay = isRecord(free?.uiReplay) ? free!.uiReplay as Partial<HeatCapacityFreeUiReplayV1> : {};
  const controls = isRecord(free?.controls) ? free!.controls as Partial<HeatCapacityFreePersistenceDataV1['controls']> : {};
  const physicsConfig = createPhysicsConfigFromSnapshot(snapshot);
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
  const recordConfig = normalizeHeatCapacityFreeRecordConfig(free?.recordConfig, fallbackRecordConfig);
  const pressureWarningMv = finiteOrDefault(
    free?.pressureWarningMv,
    snapshot.record.pressureWarningMv ?? HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  );
  const instrumentNoiseEnabled = typeof free?.instrumentNoiseEnabled === 'boolean'
    ? free.instrumentNoiseEnabled
    : sensorConfig.noiseMv > 0;
  const fallbackDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    physicsConfig,
    sensorConfig,
    recordConfig,
    pressureWarningMv,
    instrumentNoiseEnabled,
  );
  const parameterDraft = normalizeHeatCapacityFreeParameterDraft(free?.parameterDraft, fallbackDraft);
  const activeRunConfigSnapshot = free?.activeRunConfigSnapshot === null
    ? null
    : isRecord(free?.activeRunConfigSnapshot)
      ? normalizeHeatCapacityFreeConfigSnapshot(free.activeRunConfigSnapshot)
      : null;
  const layout = fileEnvelope.layout;
  const visiblePanels = Array.isArray(layout.visiblePanels)
    ? layout.visiblePanels
    : fallback.visiblePanels;
  const liveWorkspaceSplitRatio = isFiniteNumber(layout.liveWorkspaceSplitRatio)
    ? layout.liveWorkspaceSplitRatio
    : fallback.liveWorkspaceSplitRatio;

  return {
    ...fallback,
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    visiblePanels: visiblePanels as WorkbenchHeatCapacityState['visiblePanels'],
    liveWorkspaceSplitRatio,
    heatCapacityMode: normalizePayloadMode(heatPayload.mode),
    heatCapacityTrials: Array.isArray(common.trials) ? common.trials : fallback.heatCapacityTrials,
    heatCapacityExpectedTrialCount: isFiniteNumber(common.expectedTrialCount)
      ? common.expectedTrialCount
      : fallback.heatCapacityExpectedTrialCount,
    heatCapacityExpectedTrialCountMode: common.expectedTrialCountMode ?? fallback.heatCapacityExpectedTrialCountMode,
    heatCapacityActiveTrialIndex: isFiniteNumber(common.activeTrialIndex)
      ? common.activeTrialIndex
      : fallback.heatCapacityActiveTrialIndex,
    heatCapacityProcessingCalculated: common.processingCalculated === true,
    heatCapacityProcessingResult: common.processingResult ?? fallback.heatCapacityProcessingResult,
    heatCapacityExperimentSeed: common.experimentSeed ?? fallback.heatCapacityExperimentSeed,
    heatCapacityExperimentProfile: common.experimentProfile ?? fallback.heatCapacityExperimentProfile,
    selectedHeatCapacityPanel: common.selectedHeatCapacityPanel ?? fallback.selectedHeatCapacityPanel,
    openHeatCapacityTabs: Array.isArray(common.openHeatCapacityTabs)
      ? common.openHeatCapacityTabs
      : fallback.openHeatCapacityTabs,
    activeHeatCapacityTabId: common.activeHeatCapacityTabId ?? fallback.activeHeatCapacityTabId,
    heatCapacityFreeRuntimeVersion: free?.runtimeVersion ?? HEAT_CAPACITY_FREE_RUNTIME_VERSION,
    heatCapacityFreeTraceVersion: free?.traceVersion ?? HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeEnvironmentConfig: { ...snapshot.environment },
    heatCapacityFreeExperimentGroupStatus: normalizeHeatCapacityFreeExperimentGroupStatus(
      free?.experimentGroupStatus,
      fallback.heatCapacityFreeExperimentGroupStatus,
    ),
    heatCapacityFreeParameterDraft: parameterDraft,
    heatCapacityFreeActiveRunConfigSnapshot: activeRunConfigSnapshot,
    heatCapacityFreeAdvancedRiskAccepted: free?.advancedRiskAccepted === true,
    heatCapacityFreeRecordConfig: recordConfig,
    heatCapacityFreePressureWarningMv: pressureWarningMv,
    heatCapacityFreeInstrumentNoiseEnabled: instrumentNoiseEnabled,
    heatCapacityFreePhysicsConfig: physicsConfig,
    heatCapacityFreePhysicsState: free?.runtime ?? fallback.heatCapacityFreePhysicsState,
    heatCapacityFreeSensorConfig: sensorConfig,
    heatCapacityFreeSensorState: free?.sensor ?? fallback.heatCapacityFreeSensorState,
    heatCapacityFreeCalibrationState: free?.calibration ?? fallback.heatCapacityFreeCalibrationState,
    heatCapacityFreeTraceStore: free?.traceStore ?? createDefaultFreeTraceStore(),
    heatCapacityFreeTrials: Array.isArray(free?.trials) ? free!.trials : fallback.heatCapacityFreeTrials,
    ...uiReplay,
    heatCapacityFreeEquilibriumSpeedMultiplier: restoreEquilibriumSpeed(
      uiReplay.heatCapacityFreeEquilibriumSpeedMultiplier,
    ),
    powerOn: controls.powerOn === true,
    pumpValveOpen: controls.pumpValveOpen === true,
    pumpValveState: controls.pumpValveOpen === true ? 'open' : 'closed',
    pumpBulbState: normalizePumpBulbState(controls.pumpBulbState ?? uiReplay.pumpBulbState),
    heatCapacityFreeStopcockFlowOpen: controls.stopcockFlowOpen === true,
  };
};
