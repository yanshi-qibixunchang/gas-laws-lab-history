import {
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS,
  WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  applyHeatCapacityFreeDomainToRuntimeFields,
  areWorkbenchParamsEqual,
  clampWorkbenchLiveSplitRatio,
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  createEmptyChartData,
  createIdleStats,
  mergeHeatCapacityGuideRuntimeState,
  type WorkbenchFileState,
  type WorkbenchHeatCapacityState,
  type WorkbenchIdealState,
  type WorkbenchPanelKey,
  type WorkbenchStandardState,
} from '../workbenchState.ts';
import {
  HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
  HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION,
  suspendHeatCapacityModeSession,
} from '../workbenchHeatCapacityModeSession.ts';
import {
  HARD_SPHERE_MAX_COLLECTED_SAMPLES,
  HARD_SPHERE_MAX_PARTICLE_COUNT,
  HARD_SPHERE_MAX_PRESSURE_HISTORY,
  HARD_SPHERE_MAX_TEMPERATURE_HISTORY,
  validateHardSphereSimulationParams,
} from '../../../domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  normalizeHardSphereEngineSnapshot,
  upgradeLegacyHardSphereEngineSnapshotV1,
} from '../../../domain/hardSphere/hardSphereSnapshotCodec.ts';
import {
  HEAT_CAPACITY_FREE_BATCH_VERSION,
  createEmptyHeatCapacityFreeBatchState,
} from '../../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  areHeatCapacityPersistenceValuesEqual,
  decodeHeatCapacityFreeExperimentDomainAggregate,
} from '../workbenchHeatCapacityFreeAggregateCodec.ts';
import {
  createWorkbenchPersistenceV3Diagnostic,
  createWorkbenchPersistenceV3Failure,
  createWorkbenchPersistenceV3Success,
  type WorkbenchPersistenceV3DecodeResult,
} from './contract.ts';
import {
  WORKBENCH_FILE_KINDS,
  assertNeverWorkbenchFileKind,
  isWorkbenchFileKind,
  type WorkbenchFileKind,
} from '../workbenchFileKind.ts';
import {
  getWorkbenchPersistenceV3AggregateKindForFileKind,
  projectWorkbenchPersistenceV3File,
  type WorkbenchPersistenceV3FileProjection,
} from './projection.ts';
import {
  decodeHeatCapacityV3AuthorityValues,
} from './heatCapacityValueDecoder.ts';

const WORKBENCH_SESSION_SCHEMA_FAMILY =
  'hard-sphere-lab.workbench-session' as const;
const WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY =
  'hard-sphere-lab.experiment-file' as const;
const WORKBENCH_SESSION_SCHEMA_VERSION = 2 as const;
const WORKBENCH_FILE_SCHEMA_VERSION = 1 as const;
const LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION = 1 as const;
const STANDARD_SIMULATION_SCHEMA_VERSION = 2 as const;
const LEGACY_IDEAL_GAS_SCHEMA_VERSION = 1 as const;
const IDEAL_GAS_SCHEMA_VERSION = 2 as const;
const HEAT_CAPACITY_SCHEMA_VERSION = 1 as const;
const IDEAL_RESULT_MIN_HEIGHT_RATIO = 0.25;
const IDEAL_RESULT_MAX_HEIGHT_RATIO = 1;
const LEGACY_HARD_SPHERE_MAX_INGESTED_PARTICLES = 10_000;

interface LegacyWorkbenchExperimentFileEnvelope {
  schemaFamily: typeof WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY;
  fileSchemaVersion: typeof WORKBENCH_FILE_SCHEMA_VERSION;
  id: string;
  kind: WorkbenchFileKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  layout: Record<string, unknown>;
  payload: Record<string, unknown>;
}

const isPlainPersistenceRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const LEGACY_WORKBENCH_PANEL_KEYS = new Set<WorkbenchPanelKey>([
  'preview',
  'realtime',
  'results',
  'experimentPoints',
  'verification',
  'heatCapacityGuide',
  'heatCapacityRecords',
  'heatCapacityReview',
  'history',
]);

const isLegacyWorkbenchPanelKey = (
  value: unknown,
): value is WorkbenchPanelKey => (
  typeof value === 'string' &&
  LEGACY_WORKBENCH_PANEL_KEYS.has(value as WorkbenchPanelKey)
);

const LEGACY_WORKBENCH_WORKSPACE_KEYS = [
  'schemaFamily',
  'schemaVersion',
  'appVersion',
  'savedAt',
  'activeFileId',
  'selectedPanel',
  'files',
] as const;

const LEGACY_WORKBENCH_WORKSPACE_KEYS_WITH_GUIDE_SESSION = [
  ...LEGACY_WORKBENCH_WORKSPACE_KEYS,
  'heatCapacityGuideSession',
] as const;

const getLegacyRecordIdentity = (value: unknown) => (
  isPlainPersistenceRecord(value) && typeof value.id === 'string'
    ? value.id
    : null
);

export interface LegacyWorkbenchWorkspaceSource {
  capturedAtMs: number;
  sourceAppVersion: string;
  activeFileId: string | null;
  selectedPanel: WorkbenchPanelKey;
  fileOrder: string[];
  records: unknown[];
  legacyWorkspace: true;
}

export const decodeLegacyWorkbenchWorkspaceSource = (
  raw: unknown,
): WorkbenchPersistenceV3DecodeResult<LegacyWorkbenchWorkspaceSource> => {
  const fail = (
    status: 'unsupported-future' | 'quarantined',
    category:
      | 'schema-version'
      | 'schema-shape'
      | 'relationship'
      | 'unsupported-future',
    code: string,
    message: string,
    fieldPath: string,
    sourceVersion?: number,
  ) => createWorkbenchPersistenceV3Failure(status, raw, [
    createWorkbenchPersistenceV3Diagnostic({
      severity: 'error',
      phase: 'migration',
      category,
      code,
      message,
      aggregate: {
        kind: 'workspace-manifest',
        id: 'workspace',
      },
      retry: status === 'unsupported-future' ? 'manual' : 'never',
      recovery: 'read-only-workspace',
      fieldPath,
      sourceVersion,
      supportedVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
    }),
  ]);

  if (
    !isPlainPersistenceRecord(raw) ||
    raw.schemaFamily !== WORKBENCH_SESSION_SCHEMA_FAMILY
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-workspace-family-invalid',
      'The workspace record is neither a V3 workspace nor a supported legacy workspace.',
      'schemaFamily',
    );
  }
  const version = raw.schemaVersion;
  if (!Number.isInteger(version) || (version as number) < 1) {
    return fail(
      'quarantined',
      'schema-version',
      'legacy-workspace-version-missing-or-invalid',
      'The legacy workspace schema version is missing or invalid.',
      'schemaVersion',
    );
  }
  if ((version as number) > WORKBENCH_SESSION_SCHEMA_VERSION) {
    return fail(
      'unsupported-future',
      'unsupported-future',
      'legacy-workspace-version-future',
      'The legacy workspace requires a newer application.',
      'schemaVersion',
      version as number,
    );
  }
  if (
    !(
      hasExactOwnKeys(raw, LEGACY_WORKBENCH_WORKSPACE_KEYS) ||
      hasExactOwnKeys(
        raw,
        LEGACY_WORKBENCH_WORKSPACE_KEYS_WITH_GUIDE_SESSION,
      )
    ) ||
    version !== WORKBENCH_SESSION_SCHEMA_VERSION ||
    typeof raw.appVersion !== 'string' ||
    typeof raw.savedAt !== 'number' ||
    !Number.isFinite(raw.savedAt) ||
    raw.savedAt < 0 ||
    !Array.isArray(raw.files) ||
    !(
      raw.activeFileId === null ||
      typeof raw.activeFileId === 'string'
    ) ||
    !isLegacyWorkbenchPanelKey(raw.selectedPanel)
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-workspace-shape-invalid',
      'The legacy workspace shape is invalid.',
      '$',
    );
  }
  if (
    Object.prototype.hasOwnProperty.call(raw, 'heatCapacityGuideSession') &&
    (
      !isPlainPersistenceRecord(raw.heatCapacityGuideSession) ||
      !(
        hasExactOwnKeys(raw.heatCapacityGuideSession, [
          'fileId',
          'strongReminderActive',
        ]) ||
        hasExactOwnKeys(raw.heatCapacityGuideSession, [
          'fileId',
          'strongReminderActive',
          'strongReminderControlId',
        ])
      ) ||
      !(
        raw.heatCapacityGuideSession.fileId === null ||
        typeof raw.heatCapacityGuideSession.fileId === 'string'
      ) ||
      typeof raw.heatCapacityGuideSession.strongReminderActive !==
        'boolean' ||
      !(
        raw.heatCapacityGuideSession.strongReminderControlId === undefined ||
        raw.heatCapacityGuideSession.strongReminderControlId === null ||
        typeof raw.heatCapacityGuideSession.strongReminderControlId ===
          'string'
      )
    )
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-workspace-guide-session-shape-invalid',
      'The legacy workspace guide-session checkpoint is invalid.',
      'heatCapacityGuideSession',
    );
  }
  const fileOrder = raw.files.map(getLegacyRecordIdentity);
  if (
    fileOrder.some((id) => id === null || id.trim().length === 0) ||
    new Set(fileOrder).size !== fileOrder.length
  ) {
    return fail(
      'quarantined',
      'relationship',
      'legacy-workspace-file-identities-invalid',
      'The legacy workspace contains missing or duplicate file identities.',
      'files',
    );
  }
  return createWorkbenchPersistenceV3Success(
    'migrated',
    {
      capturedAtMs: raw.savedAt,
      sourceAppVersion: raw.appVersion,
      activeFileId: raw.activeFileId as string | null,
      selectedPanel: raw.selectedPanel,
      fileOrder: fileOrder as string[],
      records: [...raw.files],
      legacyWorkspace: true,
    },
    [
      createWorkbenchPersistenceV3Diagnostic({
        severity: 'info',
        phase: 'migration',
        category: 'schema-version',
        code: 'legacy-workspace-migrated-to-v3',
        message: 'The legacy workspace manifest was migrated to V3.',
        aggregate: {
          kind: 'workspace-manifest',
          id: 'workspace',
        },
        retry: 'never',
        recovery: 'none',
        sourceVersion: version as number,
        supportedVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
      }),
    ],
  );
};

const LEGACY_HEAT_CAPACITY_FREE_TRACE_VERSION = 4 as const;

const hasExactOwnKeys = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) => {
  const ownKeys = Object.keys(value);
  return ownKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const EMPTY_TRACE_STORE_KEYS = [
  'activeTraceTrialId',
  'nextTraceTrialIndex',
  'traceTrials',
] as const;

const KNOWN_FREE_PERSISTENCE_KEYS = new Set([
  'runtimeVersion',
  'traceVersion',
  'calculationVersion',
  'preheatCompleted',
  'parameterScheme',
  'displayScheme',
  'gasType',
  'real',
  'ideal',
  'config',
  'parameterDraft',
  'experimentGroupStatus',
  'activeRunConfigSnapshot',
  'activeAttempt',
  // Public v4.1.6/v4.1.12 top-level-only Free writer fields.
  'advancedRiskAccepted',
  'acknowledgements',
  'recordConfig',
  'pressureWarningMv',
  'instrumentNoiseEnabled',
  'runtime',
  'controls',
  'sensor',
  'calibration',
  'rollbackSnapshots',
  'traceStore',
  'trials',
  'references',
  'uiReplay',
]);

const KNOWN_FREE_DOMAIN_PERSISTENCE_KEYS = new Set([
  'scheme',
  'gasType',
  'batch',
  'experimentGroupStatus',
  'activeRunConfigSnapshot',
  'recordConfig',
  'pressureWarningMv',
  'instrumentNoiseEnabled',
  'environmentConfig',
  'physicsConfig',
  'physicsState',
  'sensorConfig',
  'sensorState',
  'calibrationState',
  'releaseState',
  'rollbackSnapshots',
  'traceStore',
  'trials',
  'activeAttempt',
  // Public trace-V4 domain fields consumed by the dedicated legacy migration.
  'stopcockFlowOpen',
  'stopcockPendingOpenAtMs',
  'stopcockFlowPurpose',
]);

const KNOWN_FREE_CONTROLS_KEYS = new Set([
  'powerOn',
  'pumpValveOpen',
  'stopcockOpen',
  'pumpBulbState',
  'releaseState',
  'stopcockFlowOpen',
  'stopcockFlowPurpose',
]);

const KNOWN_FREE_RELEASE_STATE_KEYS = new Set([
  'phase',
  'purpose',
  'attemptId',
  'phaseStartedAtS',
  'openingStartedAtS',
  'openingCompletedAtS',
  'closeCommandAtS',
  'closingCompletedAtS',
  'releaseDurationS',
  'formedRelease',
  'quickToggle',
]);

const KNOWN_FREE_RUNTIME_KEYS = new Set([
  'simulationTimeS',
  'amountMol',
  'internalEnergyJ',
  'referenceAmountMol',
  'gasAmountRatio',
  'gasTemperatureK',
  'wallTemperatureK',
  'pumpProcesses',
  'releaseProcess',
  'pumpStrokeCount',
  'lastPumpStrokeAtS',
  'lastPumpValveOpenedAtS',
  'lastPumpValveClosedAtS',
  'currentPumpValveOpenDurationS',
  'environmentDisturbanceSeed',
  'ambientPressureOffsetKPa',
  'ambientTemperatureOffsetK',
  'effectiveAmbientPressureKPa',
  'effectiveAmbientTemperatureK',
  'maxPressureKPa',
  'releaseStarted',
  'lastStopcockOpenedAtS',
  'lastStopcockClosedAtS',
  'currentStopcockOpenDurationS',
  'releaseReference',
]);

const KNOWN_FREE_CALIBRATION_KEYS = new Set([
  'calibrationVersion',
  'zeroOffsetMv',
  'zeroEvents',
  'automaticU0',
]);

const LEGACY_FREE_UI_REPLAY_KEYS = [
  'selectedHeatCapacityPanel',
  'openHeatCapacityTabs',
  'activeHeatCapacityTabId',
  'heatCapacityMaterialsExpanded',
  'heatCapacityExpectedTrialCount',
  'heatCapacityExpectedTrialCountMode',
  'heatCapacityActiveTrialIndex',
  'heatCapacityProcessingCalculated',
  'heatCapacityProcessingResult',
  'glassPistonState',
  'stopcockAngleDeg',
  'pressureReleaseBurstUntilMs',
  'pressureRawPlaceholder',
  'pressureDisplayedPlaceholder',
  'pressureGaugeTargetValue',
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
  'pumpValveOpen',
  'pumpValveState',
  'pumpBulbState',
  'heatCapacityFreeStopcockFlowOpen',
  'heatCapacityFreeStopcockPendingOpenAtMs',
  'heatCapacityFreeEquilibriumSpeedHintShown',
  'hardSphereParticleMultiplier',
  'hardSphereSpeedMultiplier',
  'hardSphereTrailsEnabled',
  'visualizationMode',
  'calculationModel',
  'pressureSensitivityMvPerKPa',
  'pressurePlaceholder',
  'temperaturePlaceholder',
  'theoreticalGamma',
] as const;

const CURRENT_FREE_UI_REPLAY_KEYS = [
  'heatCapacityTabContainerHeight',
  'heatCapacityPhase',
  'temperatureSignalTargetMv',
  'pressureSignalTargetMv',
  'displayResponseLastUpdateMs',
  'pressureZeroDisplayedSamples',
  'pressureDisplayJitterOffset',
  'pressureDisplayNextJitterAtMs',
  'temperatureDisplayJitterOffset',
  'temperatureDisplayNextJitterAtMs',
  'pressureZeroed',
  'pressureZeroAdjusted',
  'pressureZeroKnobAngle',
  'pressureZeroOffset',
  'pressureZeroDisplayText',
  'releaseRecoveryTargetDeltaKPa',
  'pressureSignalMvRaw',
  'pressureSignalMvDisplayed',
  'pressureSignalRawReadoutMv',
  'pressureSignalReadoutMv',
  'pressureGaugeDisplayValue',
  'pressureZeroAdjustMode',
  'temperatureSignalMv',
  'pressureSignalMv',
  'pressureKPa',
  'pressureLimitKPa',
  'pumpStrokeTimestamps',
  'pumpFrequency',
  'pumpFrequencyStatus',
  'lastPumpTime',
  'pumpStrokeCount',
  'pumpHint',
  'heatCapacityFreeEquilibriumSpeedMultiplier',
  'hardSphereViewEnabled',
  'vesselPressureReadoutKPa',
  'vesselTemperatureReadoutK',
  'recordedPressures',
  'heatCapacityProcessSamples',
] as const;

const KNOWN_FREE_UI_REPLAY_KEYS = new Set<string>([
  ...CURRENT_FREE_UI_REPLAY_KEYS,
  ...LEGACY_FREE_UI_REPLAY_KEYS,
]);

const KNOWN_FREE_CONFIG_SNAPSHOT_KEYS = [
  'version',
  'environment',
  'physics',
  'sensor',
  'record',
  'scoring',
] as const;

const KNOWN_FREE_CONFIG_SNAPSHOT_VERSIONS = new Set([
  5,
  7,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
]);

const KNOWN_FREE_PARAMETER_DRAFT_KEYS = new Set([
  'ambientPressureKPa',
  'ambientTemperatureK',
  'gasWallConductanceWPerK',
  'wallAmbientConductanceWPerK',
  'leakageEnabled',
  'instrumentNoiseEnabled',
  'gasType',
  'pressureMvPerKPa',
  'vesselVolumeL',
  'gamma',
  'wallHeatCapacityJPerK',
  'leakageRatePerS',
  'noiseMv',
  'sensorLagTimeS',
  'u0ZeroToleranceMv',
  'pressureStableSlopeMvPerS',
  'temperatureStableSlopeMvPerS',
  'temperatureAmbientToleranceMv',
  'minimumUsefulU1CorrectedMv',
  'overVentedMinimumU2CorrectedMv',
  'pressureWarningMv',
  'pressureDangerMv',
]);

const CURRENT_FREE_PARAMETER_DRAFT_KEYS = [
  'ambientPressureKPa',
  'ambientTemperatureK',
  'gasWallConductanceWPerK',
  'wallAmbientConductanceWPerK',
  'leakageEnabled',
  'instrumentNoiseEnabled',
  'gasType',
  'wallHeatCapacityJPerK',
  'leakageRatePerS',
  'noiseMv',
  'sensorLagTimeS',
  'u0ZeroToleranceMv',
  'pressureStableSlopeMvPerS',
  'temperatureStableSlopeMvPerS',
  'temperatureAmbientToleranceMv',
  'minimumUsefulU1CorrectedMv',
  'overVentedMinimumU2CorrectedMv',
  'pressureWarningMv',
  'pressureDangerMv',
] as const;

const LEGACY_V5_FREE_PARAMETER_DRAFT_KEYS = [
  'ambientPressureKPa',
  'ambientTemperatureK',
  'gasWallConductanceWPerK',
  'wallAmbientConductanceWPerK',
  'leakageEnabled',
  'instrumentNoiseEnabled',
  'pressureMvPerKPa',
  'vesselVolumeL',
  'gamma',
  'wallHeatCapacityJPerK',
  'leakageRatePerS',
  'noiseMv',
  'sensorLagTimeS',
  'u0ZeroToleranceMv',
  'pressureStableSlopeMvPerS',
  'temperatureStableSlopeMvPerS',
  'temperatureAmbientToleranceMv',
  'minimumUsefulU1CorrectedMv',
  'overVentedMinimumU2CorrectedMv',
  'pressureWarningMv',
  'pressureDangerMv',
] as const;

const FREE_CONFIG_ENVIRONMENT_KEYS = [
  'ambientPressureKPa',
  'ambientTemperatureK',
] as const;

const FREE_CONFIG_V5_PHYSICS_KEYS = [
  'gamma',
  'vesselVolumeL',
  'pumpAmountGainRatio',
  'pumpPressureLimitKPa',
  'pumpTemperatureGainK',
  'pumpStrokeDurationS',
  'recommendedPumpIntervalS',
  'stopcockFlowRate',
  'releaseResponseDelayS',
  'releaseMainDurationS',
  'releaseCoolingFactor',
  'thermal',
  'leakage',
] as const;

const FREE_CONFIG_V7_PHYSICS_KEYS = [
  'gamma',
  'vesselVolumeL',
  'pumpAmountGainRatio',
  'pumpPressureLimitKPa',
  'pumpStrokeDurationS',
  'recommendedPumpIntervalS',
  'stopcockFlowRate',
  'releaseVisualResponseDelayS',
  'releaseVisualMainDurationS',
  'thermal',
  'pumpValveExchange',
  'environmentDisturbance',
  'leakage',
] as const;

const FREE_CONFIG_V9_PHYSICS_KEYS = [
  'gamma',
  'vesselVolumeL',
  'pumpAmountGainRatio',
  'pumpWorkRetention',
  'pumpPressureLimitKPa',
  'pumpStrokeDurationS',
  'recommendedPumpIntervalS',
  'stopcockFlowRate',
  'openingAnimationDurationMs',
  'closingAnimationDurationMs',
  'releaseApertureRampS',
  'releaseOptimalMinS',
  'releaseOptimalMaxS',
  'autoDemoReleaseDurationS',
  'thermal',
  'pumpValveExchange',
  'environmentDisturbance',
  'leakage',
] as const;

const FREE_CONFIG_THERMAL_KEYS = [
  'gasWallConductanceWPerK',
  'wallAmbientConductanceWPerK',
  'wallHeatCapacityJPerK',
  'minimumGasHeatCapacityJPerK',
] as const;

const FREE_CONFIG_PUMP_VALVE_EXCHANGE_KEYS = [
  'enabled',
  'gasExchangeRatePerS',
  'thermalConductanceWPerK',
  'openingDelayS',
] as const;

const FREE_CONFIG_ENVIRONMENT_DISTURBANCE_KEYS = [
  'enabled',
  'pressureAmplitudeKPa',
  'temperatureAmplitudeK',
  'timeScaleS',
] as const;

const FREE_CONFIG_LEAKAGE_KEYS = [
  'enabled',
  'ratePerS',
] as const;

const FREE_CONFIG_V5_SENSOR_KEYS = [
  'pressureMvPerKPa',
  'temperatureMvAtAmbient',
  'temperatureMvPerK',
  'lagRate',
  'pumpLagRate',
  'noiseMv',
  'quantizationMv',
  'minSampleIntervalS',
  'maxSampleIntervalS',
  'fastProcessSampleStepS',
  'historyWindowS',
] as const;

const FREE_CONFIG_V7_SENSOR_KEYS = [
  ...FREE_CONFIG_V5_SENSOR_KEYS,
  'pressureNonlinearity',
] as const;

const FREE_CONFIG_V9_SENSOR_KEYS = [
  'pressureMvPerKPa',
  'temperatureMvAtAmbient',
  'temperatureMvPerK',
  'lagRate',
  'noiseMv',
  'quantizationMv',
  'minSampleIntervalS',
  'maxSampleIntervalS',
  'fastProcessSampleStepS',
  'historyWindowS',
  'pressureNonlinearity',
] as const;

const FREE_CONFIG_PRESSURE_NONLINEARITY_KEYS = [
  'enabled',
  'kneeMv',
  'minGain',
  'exponent',
  'extraNoiseMv',
] as const;

const FREE_CONFIG_RECORD_KEYS = [
  'u0ZeroToleranceMv',
  'pressureStableSlopeMvPerS',
  'temperatureStableSlopeMvPerS',
  'temperatureAmbientToleranceMv',
  'minimumUsefulU1CorrectedMv',
  'overVentedMinimumU2CorrectedMv',
  'pressureWarningMv',
  'pressureDangerMv',
] as const;

const FREE_RECORD_CONFIG_KEYS = [
  'u0ZeroToleranceMv',
  'pressureStableSlopeMvPerS',
  'temperatureStableSlopeMvPerS',
  'temperatureAmbientToleranceMv',
  'minimumUsefulU1CorrectedMv',
  'overVentedMinimumU2CorrectedMv',
  'pressureDangerMv',
] as const;

const FREE_ACKNOWLEDGEMENT_KEYS = [
  'advancedParametersRisk',
  'idealParameterProfileIntro',
] as const;

const FREE_CONFIG_SCORING_KEYS = [
  'processScoringVersion',
] as const;

const KNOWN_FREE_SENSOR_STATE_KEYS = new Set([
  'seed',
  'pressureInitialBiasMv',
  'displayPressureMv',
  'displayTemperatureMv',
  'sensorTemperatureK',
  'nextSampleAtS',
  'pressureHistory',
  'temperatureHistory',
  'pressureSlopeMvPerS',
  'temperatureSlopeMvPerS',
  'pressureReliability',
  'pressureNonlinearErrorMv',
  'pressureStochasticErrorMv',
]);

const FREE_SENSOR_SAMPLE_KEYS = [
  'atS',
  'valueMv',
] as const;

const LEGACY_FILE_ENVELOPE_KEYS = [
  'schemaFamily',
  'fileSchemaVersion',
  'id',
  'kind',
  'name',
  'createdAt',
  'updatedAt',
  'lastOpenedAt',
  'layout',
  'payload',
] as const;

const LEGACY_FILE_ENVELOPE_KEYS_WITHOUT_LAST_OPENED = (
  LEGACY_FILE_ENVELOPE_KEYS.filter((key) => key !== 'lastOpenedAt')
);

const LEGACY_FILE_LAYOUT_BASE_KEYS = [
  'visiblePanels',
  'liveWorkspaceSplitRatio',
] as const;

const LEGACY_FILE_LAYOUT_KEYS_BY_KIND = {
  standard: [
    ...LEGACY_FILE_LAYOUT_BASE_KEYS,
    'standardResultsLayout',
  ],
  ideal: [
    ...LEGACY_FILE_LAYOUT_BASE_KEYS,
    'idealWindowLayout',
  ],
  heatCapacity: [
    ...LEGACY_FILE_LAYOUT_BASE_KEYS,
    'openHeatCapacityTabs',
    'activeHeatCapacityTabId',
  ],
  heatCapacityPistonOscillation: LEGACY_FILE_LAYOUT_BASE_KEYS,
} as const satisfies Record<WorkbenchFileKind, readonly string[]>;

const LEGACY_PAYLOAD_KEYS_BY_KIND = {
  standard: [
    'experimentKind',
    'standardSchemaVersion',
    'params',
    'appliedParams',
    'runtime',
    'results',
  ],
  ideal: [
    'experimentKind',
    'idealGasSchemaVersion',
    'relation',
    'params',
    'appliedParams',
    'activeParams',
    'runtime',
    'experiment',
    'results',
  ],
  heatCapacity: [
    'experimentKind',
    'heatCapacitySchemaVersion',
    'mode',
    'common',
    'free',
    'guided',
    'demo',
  ],
  heatCapacityPistonOscillation: [
    'experimentKind',
    'pistonOscillationSchemaVersion',
    'preview',
  ],
} as const satisfies Record<WorkbenchFileKind, readonly string[]>;

const LEGACY_PAYLOAD_VERSION_BY_KIND = {
  standard: {
    key: 'standardSchemaVersion',
    current: STANDARD_SIMULATION_SCHEMA_VERSION,
    supported: new Set<number>([
      LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION,
      STANDARD_SIMULATION_SCHEMA_VERSION,
    ]),
  },
  ideal: {
    key: 'idealGasSchemaVersion',
    current: IDEAL_GAS_SCHEMA_VERSION,
    supported: new Set<number>([
      LEGACY_IDEAL_GAS_SCHEMA_VERSION,
      IDEAL_GAS_SCHEMA_VERSION,
    ]),
  },
  heatCapacity: {
    key: 'heatCapacitySchemaVersion',
    current: HEAT_CAPACITY_SCHEMA_VERSION,
    supported: new Set<number>([HEAT_CAPACITY_SCHEMA_VERSION]),
  },
  heatCapacityPistonOscillation: {
    key: 'pistonOscillationSchemaVersion',
    current: WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
    supported: new Set<number>([
      WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
    ]),
  },
} as const satisfies Record<
  WorkbenchFileKind,
  {
    key: string;
    current: number;
    supported: ReadonlySet<number>;
  }
>;

const CURRENT_HEAT_CAPACITY_COMMON_KEYS = [
  'materialsExpanded',
  'teachingStatus',
  'openHeatCapacityTabs',
  'activeHeatCapacityTabId',
  'experimentSeed',
  'experimentProfile',
  'lessonIntroAutoShown',
  'modeSessions',
] as const;

const LEGACY_423_HEAT_CAPACITY_COMMON_KEYS = [
  'materialsExpanded',
  'teachingStatus',
  'openHeatCapacityTabs',
  'activeHeatCapacityTabId',
  'experimentSeed',
  'experimentProfile',
  'lessonIntroAutoShown',
] as const;

const LEGACY_416_HEAT_CAPACITY_COMMON_KEYS = [
  'pausedTeachingSnapshot',
  'trials',
  'expectedTrialCount',
  'expectedTrialCountMode',
  'activeTrialIndex',
  'materialsExpanded',
  'selectedHeatCapacityPanel',
  'openHeatCapacityTabs',
  'activeHeatCapacityTabId',
  'processingCalculated',
  'processingResult',
  'experimentSeed',
  'experimentProfile',
] as const;

const hasOnlyKnownOwnKeys = (
  value: Record<string, unknown>,
  knownKeys: ReadonlySet<string>,
) => Object.keys(value).every((key) => knownKeys.has(key));

const hasRequiredOwnKeys = (
  value: Record<string, unknown>,
  requiredKeys: readonly string[],
) => requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));

const hasFiniteNumberFields = (
  value: Record<string, unknown>,
  keys: readonly string[],
) => keys.every((key) => (
  typeof value[key] === 'number' &&
  Number.isFinite(value[key])
));

const hasExactFiniteNumberFields = (
  value: unknown,
  keys: readonly string[],
) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, keys) &&
  hasFiniteNumberFields(value, keys)
);

const hasValidOptionalEnabledConfig = (
  value: unknown,
  keys: readonly string[],
) => (
  value === undefined ||
  (
    isPlainPersistenceRecord(value) &&
    hasExactOwnKeys(value, keys) &&
    (value.enabled === true || value.enabled === false)
  )
);

const STANDARD_SIMULATION_PARAMETER_KEYS = [
  'L',
  'N',
  'r',
  'm',
  'k',
  'dt',
  'nu',
  'equilibriumTime',
  'statsDuration',
] as const;

const IDEAL_SIMULATION_PARAMETER_KEYS = [
  'L',
  'N',
  'r',
  'm',
  'k',
  'dt',
  'nu',
  'targetTemperature',
  'equilibriumTime',
  'statsDuration',
] as const;

const SIMULATION_STATS_KEYS = [
  'time',
  'temperature',
  'pressure',
  'meanSpeed',
  'rmsSpeed',
  'isEquilibrated',
  'progress',
  'phase',
] as const;

const CHART_DATA_KEYS = [
  'speed',
  'energy',
  'energyLog',
  'tempHistory',
] as const;

const HISTOGRAM_BIN_KEYS = [
  'binStart',
  'binEnd',
  'count',
  'probability',
] as const;

const PARTICLE_KEYS = [
  'x',
  'y',
  'z',
  'vx',
  'vy',
  'vz',
  'speed',
  'energy',
] as const;

const PRESSURE_WINDOW_POINT_KEYS = [
  'time',
  'duration',
  'measuredPressure',
  'idealPressure',
  'isCollectionWindow',
] as const;

const PRESSURE_SUMMARY_KEYS = [
  'latestPressure',
  'meanPressure',
  'meanIdealPressure',
  'meanTemperature',
  'relativeGap',
  'sampleCount',
  'history',
] as const;

const IDEAL_POINT_REQUIRED_KEYS = [
  'id',
  'relation',
  'targetTemperature',
  'meanTemperature',
  'meanPressure',
  'idealPressure',
  'relativeGap',
  'timestamp',
] as const;

const IDEAL_POINT_KEYS = new Set([
  ...IDEAL_POINT_REQUIRED_KEYS,
  'boxLength',
  'volume',
  'inverseVolume',
  'particleCount',
]);

const ENGINE_SNAPSHOT_V1_KEYS = [
  'schemaVersion',
  'params',
  'particles',
  'time',
  'targetTemperature',
  'collectedSpeeds',
  'collectedEnergies',
  'collectedSampleWindowTotal',
  'tempHistory',
  'lastSampleTime',
  'pressureWindowStartTime',
  'pressureWindowMomentum',
  'pressureHistory',
  'latestMeasuredPressure',
] as const;

const ENGINE_SNAPSHOT_V2_KEYS = [
  ...ENGINE_SNAPSHOT_V1_KEYS,
  'targetMode',
] as const;

const hasValidLegacySimulationParameterShape = (
  value: unknown,
  includesTargetTemperature: boolean,
) => {
  if (!isPlainPersistenceRecord(value)) return false;
  const keys = includesTargetTemperature
    ? IDEAL_SIMULATION_PARAMETER_KEYS
    : STANDARD_SIMULATION_PARAMETER_KEYS;
  if (
    !hasExactOwnKeys(value, keys) ||
    !hasFiniteNumberFields(value, keys) ||
    !Number.isSafeInteger(value.N) ||
    (value.N as number) < 1 ||
    (value.L as number) <= 0 ||
    (value.r as number) <= 0 ||
    (value.m as number) <= 0 ||
    (value.k as number) <= 0 ||
    (value.dt as number) <= 0 ||
    (value.nu as number) < 0 ||
    (value.equilibriumTime as number) < 0 ||
    (value.statsDuration as number) <= 0
  ) {
    return false;
  }
  return !includesTargetTemperature ||
    (value.targetTemperature as number) > 0;
};

const hasValidLegacySimulationStatsShape = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, SIMULATION_STATS_KEYS) &&
  hasFiniteNumberFields(value, [
    'time',
    'temperature',
    'pressure',
    'meanSpeed',
    'rmsSpeed',
    'progress',
  ]) &&
  typeof value.isEquilibrated === 'boolean' &&
  (
    value.phase === 'idle' ||
    value.phase === 'equilibrating' ||
    value.phase === 'collecting' ||
    value.phase === 'finished'
  )
);

const hasValidLegacyParticleShape = (value: unknown) => (
  hasExactFiniteNumberFields(value, PARTICLE_KEYS)
);

const hasValidLegacyHistogramBinShape = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasOnlyKnownOwnKeys(value, new Set([
    ...HISTOGRAM_BIN_KEYS,
    'theoretical',
  ])) &&
  hasRequiredOwnKeys(value, HISTOGRAM_BIN_KEYS) &&
  hasFiniteNumberFields(value, HISTOGRAM_BIN_KEYS) &&
  (
    value.theoretical === undefined ||
    (
      typeof value.theoretical === 'number' &&
      Number.isFinite(value.theoretical)
    )
  )
);

const hasValidLegacyChartDataShape = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, CHART_DATA_KEYS) &&
  Array.isArray(value.speed) &&
  value.speed.length <= 30 &&
  value.speed.every(hasValidLegacyHistogramBinShape) &&
  Array.isArray(value.energy) &&
  value.energy.length <= 30 &&
  value.energy.every(hasValidLegacyHistogramBinShape) &&
  Array.isArray(value.energyLog) &&
  value.energyLog.length <= 30 &&
  value.energyLog.every((point) => (
    hasExactFiniteNumberFields(
      point,
      ['energy', 'logProb', 'theoreticalLog'],
    )
  )) &&
  Array.isArray(value.tempHistory) &&
  value.tempHistory.length <= HARD_SPHERE_MAX_TEMPERATURE_HISTORY &&
  value.tempHistory.every((point) => (
    isPlainPersistenceRecord(point) &&
    hasOnlyKnownOwnKeys(point, new Set([
      'time',
      'temperature',
      'targetTemperature',
      'error',
      'totalEnergy',
    ])) &&
    hasRequiredOwnKeys(point, ['time', 'error', 'totalEnergy']) &&
    hasFiniteNumberFields(point, ['time', 'error', 'totalEnergy']) &&
    (
      point.temperature === undefined ||
      (
        typeof point.temperature === 'number' &&
        Number.isFinite(point.temperature)
      )
    ) &&
    (
      point.targetTemperature === undefined ||
      (
        typeof point.targetTemperature === 'number' &&
        Number.isFinite(point.targetTemperature)
      )
    )
  ))
);

const hasValidLegacyPressureWindowPointShape = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, PRESSURE_WINDOW_POINT_KEYS) &&
  hasFiniteNumberFields(value, [
    'time',
    'duration',
    'measuredPressure',
    'idealPressure',
  ]) &&
  typeof value.isCollectionWindow === 'boolean'
);

const isNullableFiniteNumber = (value: unknown) => (
  value === null ||
  (
    typeof value === 'number' &&
    Number.isFinite(value)
  )
);

const hasValidLegacyPressureSummaryShape = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, PRESSURE_SUMMARY_KEYS) &&
  typeof value.latestPressure === 'number' &&
  Number.isFinite(value.latestPressure) &&
  isNullableFiniteNumber(value.meanPressure) &&
  isNullableFiniteNumber(value.meanIdealPressure) &&
  isNullableFiniteNumber(value.meanTemperature) &&
  isNullableFiniteNumber(value.relativeGap) &&
  Number.isSafeInteger(value.sampleCount) &&
  (value.sampleCount as number) >= 0 &&
  Array.isArray(value.history) &&
  value.history.length <= HARD_SPHERE_MAX_PRESSURE_HISTORY &&
  value.history.every(hasValidLegacyPressureWindowPointShape)
);

const hasValidLegacyIdealPointShape = (
  value: unknown,
  expectedRelation: 'pt' | 'pv' | 'pn',
) => (
  isPlainPersistenceRecord(value) &&
  hasOnlyKnownOwnKeys(value, IDEAL_POINT_KEYS) &&
  hasRequiredOwnKeys(value, IDEAL_POINT_REQUIRED_KEYS) &&
  typeof value.id === 'string' &&
  value.id.trim().length > 0 &&
  value.id.length <= 256 &&
  value.relation === expectedRelation &&
  hasFiniteNumberFields(value, [
    'targetTemperature',
    'meanTemperature',
    'meanPressure',
    'idealPressure',
    'relativeGap',
    'timestamp',
  ]) &&
  (
    value.boxLength === undefined ||
    isNullableFiniteNumber(value.boxLength)
  ) &&
  (
    value.volume === undefined ||
    isNullableFiniteNumber(value.volume)
  ) &&
  (
    value.inverseVolume === undefined ||
    isNullableFiniteNumber(value.inverseVolume)
  ) &&
  (
    value.particleCount === undefined ||
    isNullableFiniteNumber(value.particleCount)
  )
);

const hasValidLegacyPointsByRelationShape = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, ['pt', 'pv', 'pn']) &&
  (['pt', 'pv', 'pn'] as const).every((relation) => (
    Array.isArray(value[relation]) &&
    value[relation].length <= 1000 &&
    value[relation].every((point) => (
      hasValidLegacyIdealPointShape(point, relation)
    ))
  )) &&
  new Set(
    (['pt', 'pv', 'pn'] as const).flatMap((relation) => (
      (value[relation] as Array<Record<string, unknown>>)
        .map((point) => point.id)
    )),
  ).size ===
    (['pt', 'pv', 'pn'] as const).reduce(
      (count, relation) => count + (value[relation] as unknown[]).length,
      0,
    )
);

const hasValidLegacyEngineSnapshotShape = (value: unknown) => {
  if (value === null) return true;
  if (!isPlainPersistenceRecord(value)) return false;
  const expectedKeys = value.schemaVersion === 1
    ? ENGINE_SNAPSHOT_V1_KEYS
    : value.schemaVersion === 2
      ? ENGINE_SNAPSHOT_V2_KEYS
      : null;
  if (
    expectedKeys === null ||
    !hasExactOwnKeys(value, expectedKeys) ||
    !(
      hasValidLegacySimulationParameterShape(value.params, false) ||
      hasValidLegacySimulationParameterShape(value.params, true)
    ) ||
    !Array.isArray(value.particles) ||
    value.particles.length > HARD_SPHERE_MAX_PARTICLE_COUNT ||
    !value.particles.every(hasValidLegacyParticleShape) ||
    !Array.isArray(value.collectedSpeeds) ||
    value.collectedSpeeds.length > HARD_SPHERE_MAX_COLLECTED_SAMPLES ||
    !value.collectedSpeeds.every((entry) => (
      typeof entry === 'number' && Number.isFinite(entry)
    )) ||
    !Array.isArray(value.collectedEnergies) ||
    value.collectedEnergies.length > HARD_SPHERE_MAX_COLLECTED_SAMPLES ||
    !value.collectedEnergies.every((entry) => (
      typeof entry === 'number' && Number.isFinite(entry)
    )) ||
    !Array.isArray(value.tempHistory) ||
    value.tempHistory.length > HARD_SPHERE_MAX_TEMPERATURE_HISTORY ||
    !value.tempHistory.every((point) => (
      hasExactFiniteNumberFields(
        point,
        ['time', 'error', 'totalEnergy'],
      )
    )) ||
    !Array.isArray(value.pressureHistory) ||
    value.pressureHistory.length > HARD_SPHERE_MAX_PRESSURE_HISTORY ||
    !value.pressureHistory.every(hasValidLegacyPressureWindowPointShape) ||
    !hasFiniteNumberFields(value, [
      'time',
      'targetTemperature',
      'collectedSampleWindowTotal',
      'lastSampleTime',
      'pressureWindowStartTime',
      'pressureWindowMomentum',
      'latestMeasuredPressure',
    ])
  ) {
    return false;
  }
  return value.schemaVersion === 1 || (
    value.targetMode === 'explicit' ||
    value.targetMode === 'canonical-default' ||
    value.targetMode === 'legacy-v1'
  );
};

const hasValidLegacyResultHeight = (value: unknown) => (
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= IDEAL_RESULT_MIN_HEIGHT_RATIO &&
  value <= IDEAL_RESULT_MAX_HEIGHT_RATIO
);

const hasValidLegacyStandardResultsLayoutShape = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, ['openTabs', 'activeTab', 'heightRatio']) &&
  Array.isArray(value.openTabs) &&
  value.openTabs.length > 0 &&
  new Set(value.openTabs).size === value.openTabs.length &&
  value.openTabs.every((tab) => (
    tab === 'summary' ||
    tab === 'dataTable' ||
    tab === 'figures'
  )) &&
  (
    value.activeTab === 'summary' ||
    value.activeTab === 'dataTable' ||
    value.activeTab === 'figures'
  ) &&
  value.openTabs.includes(value.activeTab) &&
  hasValidLegacyResultHeight(value.heightRatio)
);

const hasValidLegacyIdealResultsLayoutShape = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, [
    'openTabs',
    'activeIdealResultTab',
    'heightRatio',
    'hasCustomHeight',
  ]) &&
  Array.isArray(value.openTabs) &&
  value.openTabs.length > 0 &&
  new Set(value.openTabs).size === value.openTabs.length &&
  value.openTabs.every((tab) => (
    tab === 'experimentPoints' ||
    tab === 'verification'
  )) &&
  (
    value.activeIdealResultTab === 'experimentPoints' ||
    value.activeIdealResultTab === 'verification'
  ) &&
  value.openTabs.includes(value.activeIdealResultTab) &&
  hasValidLegacyResultHeight(value.heightRatio) &&
  typeof value.hasCustomHeight === 'boolean'
);

const isLegacyWorkbenchRunState = (value: unknown) => (
  value === 'idle' ||
  value === 'running' ||
  value === 'paused' ||
  value === 'finished' ||
  value === 'needs-reset'
);

const hasValidLegacyStandardPayloadRecursiveShape = (
  payload: Record<string, unknown>,
) => {
  const version = payload.standardSchemaVersion;
  const runtime = isPlainPersistenceRecord(payload.runtime)
    ? payload.runtime
    : null;
  const results = isPlainPersistenceRecord(payload.results)
    ? payload.results
    : null;
  return (
    payload.experimentKind === 'standard' &&
    (
      version === LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION ||
      version === STANDARD_SIMULATION_SCHEMA_VERSION
    ) &&
    hasValidLegacySimulationParameterShape(payload.params, false) &&
    hasValidLegacySimulationParameterShape(payload.appliedParams, false) &&
    validateHardSphereSimulationParams(
      payload.appliedParams as WorkbenchStandardState['appliedParams'],
    ).valid &&
    runtime !== null &&
    hasExactOwnKeys(runtime, [
      'runState',
      'stats',
      'chartData',
      'finalChartData',
      'particles',
      'engineSnapshot',
    ]) &&
    isLegacyWorkbenchRunState(runtime.runState) &&
    hasValidLegacySimulationStatsShape(runtime.stats) &&
    hasValidLegacyChartDataShape(runtime.chartData) &&
    (
      runtime.finalChartData === null ||
      hasValidLegacyChartDataShape(runtime.finalChartData)
    ) &&
    Array.isArray(runtime.particles) &&
    runtime.particles.length <= (
      version === LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION
        ? LEGACY_HARD_SPHERE_MAX_INGESTED_PARTICLES
        : HARD_SPHERE_MAX_PARTICLE_COUNT
    ) &&
    runtime.particles.every(hasValidLegacyParticleShape) &&
    hasValidLegacyEngineSnapshotShape(runtime.engineSnapshot) &&
    (
      runtime.engineSnapshot === null ||
      (
        isPlainPersistenceRecord(runtime.engineSnapshot) &&
        runtime.engineSnapshot.schemaVersion === version &&
        areWorkbenchParamsEqual(
          runtime.engineSnapshot.params as WorkbenchStandardState['appliedParams'],
          payload.appliedParams as WorkbenchStandardState['appliedParams'],
        )
      )
    ) &&
    (
      validateHardSphereSimulationParams(
        payload.params as WorkbenchStandardState['params'],
      ).valid ||
      runtime.runState === 'needs-reset'
    ) &&
    results !== null &&
    hasExactOwnKeys(results, ['standardResultsLayout']) &&
    hasValidLegacyStandardResultsLayoutShape(
      results.standardResultsLayout,
    )
  );
};

const hasValidLegacyIdealPayloadRecursiveShape = (
  payload: Record<string, unknown>,
) => {
  const version = payload.idealGasSchemaVersion;
  const runtime = isPlainPersistenceRecord(payload.runtime)
    ? payload.runtime
    : null;
  const experiment = isPlainPersistenceRecord(payload.experiment)
    ? payload.experiment
    : null;
  const results = isPlainPersistenceRecord(payload.results)
    ? payload.results
    : null;
  return (
    payload.experimentKind === 'ideal' &&
    (
      version === LEGACY_IDEAL_GAS_SCHEMA_VERSION ||
      version === IDEAL_GAS_SCHEMA_VERSION
    ) &&
    (
      payload.relation === 'pt' ||
      payload.relation === 'pv' ||
      payload.relation === 'pn'
    ) &&
    hasValidLegacySimulationParameterShape(payload.params, true) &&
    hasValidLegacySimulationParameterShape(payload.appliedParams, true) &&
    hasValidLegacySimulationParameterShape(payload.activeParams, true) &&
    validateHardSphereSimulationParams(
      payload.appliedParams as WorkbenchIdealState['appliedParams'],
    ).valid &&
    validateHardSphereSimulationParams(
      payload.activeParams as WorkbenchIdealState['activeParams'],
    ).valid &&
    areWorkbenchParamsEqual(
      payload.appliedParams as WorkbenchIdealState['appliedParams'],
      payload.activeParams as WorkbenchIdealState['activeParams'],
    ) &&
    runtime !== null &&
    hasExactOwnKeys(runtime, [
      'runState',
      'stats',
      'chartData',
      'finalChartData',
      'particles',
      'engineSnapshot',
      'latestPressureSummary',
    ]) &&
    isLegacyWorkbenchRunState(runtime.runState) &&
    hasValidLegacySimulationStatsShape(runtime.stats) &&
    hasValidLegacyChartDataShape(runtime.chartData) &&
    (
      runtime.finalChartData === null ||
      hasValidLegacyChartDataShape(runtime.finalChartData)
    ) &&
    Array.isArray(runtime.particles) &&
    runtime.particles.length <= (
      version === LEGACY_IDEAL_GAS_SCHEMA_VERSION
        ? LEGACY_HARD_SPHERE_MAX_INGESTED_PARTICLES
        : HARD_SPHERE_MAX_PARTICLE_COUNT
    ) &&
    runtime.particles.every(hasValidLegacyParticleShape) &&
    hasValidLegacyEngineSnapshotShape(runtime.engineSnapshot) &&
    (
      runtime.engineSnapshot === null ||
      (
        isPlainPersistenceRecord(runtime.engineSnapshot) &&
        runtime.engineSnapshot.schemaVersion === version &&
        areWorkbenchParamsEqual(
          runtime.engineSnapshot.params as WorkbenchIdealState['activeParams'],
          payload.activeParams as WorkbenchIdealState['activeParams'],
        )
      )
    ) &&
    (
      runtime.latestPressureSummary === null ||
      hasValidLegacyPressureSummaryShape(runtime.latestPressureSummary)
    ) &&
    experiment !== null &&
    hasExactOwnKeys(experiment, [
      'pointsByRelation',
      'needsReset',
      'verificationState',
      'historyUnlocked',
    ]) &&
    hasValidLegacyPointsByRelationShape(experiment.pointsByRelation) &&
    typeof experiment.needsReset === 'boolean' &&
    (
      validateHardSphereSimulationParams(
        payload.params as WorkbenchIdealState['params'],
      ).valid ||
      experiment.needsReset ||
      runtime.runState === 'needs-reset'
    ) &&
    (
      experiment.verificationState === 'not-started' ||
      experiment.verificationState === 'collecting' ||
      experiment.verificationState === 'verified' ||
      experiment.verificationState === 'failed'
    ) &&
    typeof experiment.historyUnlocked === 'boolean' &&
    results !== null &&
    hasExactOwnKeys(results, ['idealWindowLayout']) &&
    hasValidLegacyIdealResultsLayoutShape(results.idealWindowLayout)
  );
};

const hasValidLegacyFileLayoutShape = (
  value: Record<string, unknown>,
  kind: WorkbenchFileKind,
) => {
  if (
    !Array.isArray(value.visiblePanels) ||
    new Set(value.visiblePanels).size !== value.visiblePanels.length ||
    !value.visiblePanels.every(isLegacyWorkbenchPanelKey) ||
    typeof value.liveWorkspaceSplitRatio !== 'number' ||
    !Number.isFinite(value.liveWorkspaceSplitRatio) ||
    clampWorkbenchLiveSplitRatio(value.liveWorkspaceSplitRatio) !==
      value.liveWorkspaceSplitRatio
  ) {
    return false;
  }
  switch (kind) {
    case 'standard':
      return hasValidLegacyStandardResultsLayoutShape(
        value.standardResultsLayout,
      );
    case 'ideal':
      return hasValidLegacyIdealResultsLayoutShape(value.idealWindowLayout);
    case 'heatCapacity': {
      const tabs = value.openHeatCapacityTabs;
      const activeTab = value.activeHeatCapacityTabId;
      return Array.isArray(tabs) &&
        new Set(tabs).size === tabs.length &&
        tabs.every((tab) => (
          tab === 'guide' ||
          tab === 'records' ||
          tab === 'review'
        )) &&
        (
          activeTab === null ||
          (
            (
              activeTab === 'guide' ||
              activeTab === 'records' ||
              activeTab === 'review'
            ) &&
            tabs.includes(activeTab)
          )
        );
    }
    case 'heatCapacityPistonOscillation':
      return true;
    default:
      return assertNeverWorkbenchFileKind(kind);
  }
};

const cloneLegacyPersistenceValue = <Value>(value: Value): Value => (
  structuredClone(value)
);

const hasLiveHardSphereCache = (
  runtime: Record<string, unknown>,
  includePressureSummary = false,
) => (
  (
    Array.isArray(runtime.particles) &&
    runtime.particles.length > 0
  ) ||
  (
    isPlainPersistenceRecord(runtime.stats) &&
    runtime.stats.phase !== 'idle'
  ) ||
  (
    isPlainPersistenceRecord(runtime.chartData) &&
    Object.values(runtime.chartData).some((value) => (
      Array.isArray(value) && value.length > 0
    ))
  ) ||
  (
    includePressureSummary &&
    runtime.latestPressureSummary !== null
  )
);

const decodeLegacyHardSphereSnapshot = (
  value: unknown,
  version: number,
) => {
  if (value === null) return null;
  return version === LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION
    ? upgradeLegacyHardSphereEngineSnapshotV1(value)
    : normalizeHardSphereEngineSnapshot(value);
};

const rebuildLegacyStandardFile = (
  envelope: LegacyWorkbenchExperimentFileEnvelope & { kind: 'standard' },
  index: number,
): WorkbenchStandardState | null => {
  const payload = envelope.payload;
  const runtime = payload.runtime as Record<string, unknown>;
  const results = payload.results as Record<string, unknown>;
  const version = payload.standardSchemaVersion as number;
  const snapshot = decodeLegacyHardSphereSnapshot(
    runtime.engineSnapshot,
    version,
  );
  if (runtime.engineSnapshot !== null && snapshot === null) return null;
  const clearLiveCache = snapshot === null && hasLiveHardSphereCache(runtime);
  const fallback = createDefaultStandardFile(index);
  const params = cloneLegacyPersistenceValue(
    payload.params,
  ) as WorkbenchStandardState['params'];
  const paramsValid = validateHardSphereSimulationParams(params).valid;
  const runState = clearLiveCache || !paramsValid
    ? 'needs-reset'
    : runtime.runState === 'running'
      ? 'paused'
      : runtime.runState as WorkbenchStandardState['runState'];
  return {
    ...fallback,
    id: envelope.id,
    name: envelope.name,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    lastOpenedAt: envelope.lastOpenedAt ?? envelope.updatedAt,
    visiblePanels: cloneLegacyPersistenceValue(
      envelope.layout.visiblePanels,
    ) as WorkbenchStandardState['visiblePanels'],
    liveWorkspaceSplitRatio:
      envelope.layout.liveWorkspaceSplitRatio as number,
    params,
    appliedParams: cloneLegacyPersistenceValue(
      payload.appliedParams,
    ) as WorkbenchStandardState['appliedParams'],
    runState,
    stats: clearLiveCache
      ? createIdleStats()
      : cloneLegacyPersistenceValue(
          runtime.stats,
        ) as WorkbenchStandardState['stats'],
    chartData: clearLiveCache
      ? createEmptyChartData()
      : cloneLegacyPersistenceValue(
          runtime.chartData,
        ) as WorkbenchStandardState['chartData'],
    finalChartData: runtime.finalChartData === null
      ? null
      : cloneLegacyPersistenceValue(
          runtime.finalChartData,
        ) as WorkbenchStandardState['finalChartData'],
    particles: clearLiveCache
      ? []
      : cloneLegacyPersistenceValue(
          runtime.particles,
        ) as WorkbenchStandardState['particles'],
    hardSphereEngineSnapshot: clearLiveCache ? null : snapshot,
    standardResultsLayout: cloneLegacyPersistenceValue(
      results.standardResultsLayout,
    ) as WorkbenchStandardState['standardResultsLayout'],
  };
};

const rebuildLegacyIdealFile = (
  envelope: LegacyWorkbenchExperimentFileEnvelope & { kind: 'ideal' },
  index: number,
): WorkbenchIdealState | null => {
  const payload = envelope.payload;
  const runtime = payload.runtime as Record<string, unknown>;
  const experiment = payload.experiment as Record<string, unknown>;
  const results = payload.results as Record<string, unknown>;
  const version = payload.idealGasSchemaVersion as number;
  const snapshot = decodeLegacyHardSphereSnapshot(
    runtime.engineSnapshot,
    version,
  );
  if (runtime.engineSnapshot !== null && snapshot === null) return null;
  const clearLiveCache = snapshot === null &&
    hasLiveHardSphereCache(runtime, true);
  const fallback = createDefaultIdealFile(index);
  const params = cloneLegacyPersistenceValue(
    payload.params,
  ) as WorkbenchIdealState['params'];
  const paramsValid = validateHardSphereSimulationParams(params).valid;
  const needsReset = clearLiveCache ||
    !paramsValid ||
    experiment.needsReset === true;
  const runState = needsReset
    ? 'needs-reset'
    : runtime.runState === 'running'
      ? 'paused'
      : runtime.runState as WorkbenchIdealState['runState'];
  return {
    ...fallback,
    id: envelope.id,
    name: envelope.name,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    lastOpenedAt: envelope.lastOpenedAt ?? envelope.updatedAt,
    visiblePanels: cloneLegacyPersistenceValue(
      envelope.layout.visiblePanels,
    ) as WorkbenchIdealState['visiblePanels'],
    liveWorkspaceSplitRatio:
      envelope.layout.liveWorkspaceSplitRatio as number,
    relation: payload.relation as WorkbenchIdealState['relation'],
    params,
    appliedParams: cloneLegacyPersistenceValue(
      payload.appliedParams,
    ) as WorkbenchIdealState['appliedParams'],
    activeParams: cloneLegacyPersistenceValue(
      payload.activeParams,
    ) as WorkbenchIdealState['activeParams'],
    runState,
    stats: clearLiveCache
      ? createIdleStats()
      : cloneLegacyPersistenceValue(
          runtime.stats,
        ) as WorkbenchIdealState['stats'],
    chartData: clearLiveCache
      ? createEmptyChartData()
      : cloneLegacyPersistenceValue(
          runtime.chartData,
        ) as WorkbenchIdealState['chartData'],
    finalChartData: runtime.finalChartData === null
      ? null
      : cloneLegacyPersistenceValue(
          runtime.finalChartData,
        ) as WorkbenchIdealState['finalChartData'],
    latestPressureSummary: clearLiveCache
      ? null
      : cloneLegacyPersistenceValue(
          runtime.latestPressureSummary,
        ) as WorkbenchIdealState['latestPressureSummary'],
    needsReset,
    particles: clearLiveCache
      ? []
      : cloneLegacyPersistenceValue(
          runtime.particles,
        ) as WorkbenchIdealState['particles'],
    hardSphereEngineSnapshot: clearLiveCache ? null : snapshot,
    pointsByRelation: cloneLegacyPersistenceValue(
      experiment.pointsByRelation,
    ) as WorkbenchIdealState['pointsByRelation'],
    verificationState:
      experiment.verificationState as WorkbenchIdealState['verificationState'],
    historyUnlocked: experiment.historyUnlocked as boolean,
    idealWindowLayout: cloneLegacyPersistenceValue(
      results.idealWindowLayout,
    ) as WorkbenchIdealState['idealWindowLayout'],
  };
};

const hasValidLegacyPistonPayloadRecursiveShape = (
  payload: Record<string, unknown>,
) => (
  payload.experimentKind === 'heatCapacityPistonOscillation' &&
  payload.pistonOscillationSchemaVersion ===
    WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION &&
  isPlainPersistenceRecord(payload.preview) &&
  hasExactOwnKeys(payload.preview, ['cameraPreset']) &&
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS.includes(
    payload.preview.cameraPreset as
      (typeof WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS)[number],
  )
);

const rebuildLegacyPistonFile = (
  envelope: LegacyWorkbenchExperimentFileEnvelope & {
    kind: 'heatCapacityPistonOscillation';
  },
  index: number,
): Extract<
  WorkbenchFileState,
  { kind: 'heatCapacityPistonOscillation' }
> => {
  const fallback = createDefaultHeatCapacityPistonOscillationFile(index);
  const preview = envelope.payload.preview as Record<string, unknown>;
  return {
    ...fallback,
    id: envelope.id,
    name: envelope.name,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    lastOpenedAt: envelope.lastOpenedAt ?? envelope.updatedAt,
    visiblePanels: cloneLegacyPersistenceValue(
      envelope.layout.visiblePanels,
    ) as typeof fallback.visiblePanels,
    liveWorkspaceSplitRatio:
      envelope.layout.liveWorkspaceSplitRatio as number,
    pistonOscillationSchemaVersion:
      WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
    previewCameraPreset:
      preview.cameraPreset as typeof fallback.previewCameraPreset,
  };
};

const hasValidFreeConfigSnapshotShape = (
  value: Record<string, unknown>,
  version: number,
) => {
  const environment = isPlainPersistenceRecord(value.environment)
    ? value.environment
    : null;
  const physics = isPlainPersistenceRecord(value.physics)
    ? value.physics
    : null;
  const sensor = isPlainPersistenceRecord(value.sensor)
    ? value.sensor
    : null;
  const record = isPlainPersistenceRecord(value.record)
    ? value.record
    : null;
  const scoring = isPlainPersistenceRecord(value.scoring)
    ? value.scoring
    : null;
  if (
    environment === null ||
    physics === null ||
    sensor === null ||
    record === null ||
    scoring === null ||
    !hasExactFiniteNumberFields(
      environment,
      FREE_CONFIG_ENVIRONMENT_KEYS,
    ) ||
    (environment.ambientPressureKPa as number) <= 0 ||
    (environment.ambientTemperatureK as number) <= 0 ||
    !hasExactFiniteNumberFields(record, FREE_CONFIG_RECORD_KEYS) ||
    !FREE_CONFIG_RECORD_KEYS.every((key) => (
      (record[key] as number) >= 0
    )) ||
    (record.pressureDangerMv as number) <=
      (record.pressureWarningMv as number) ||
    !hasExactOwnKeys(scoring, FREE_CONFIG_SCORING_KEYS) ||
    !isPlainPersistenceRecord(physics.thermal) ||
    !hasExactFiniteNumberFields(
      physics.thermal,
      FREE_CONFIG_THERMAL_KEYS,
    ) ||
    !isPlainPersistenceRecord(physics.leakage) ||
    !hasExactOwnKeys(physics.leakage, FREE_CONFIG_LEAKAGE_KEYS) ||
    typeof physics.leakage.enabled !== 'boolean' ||
    typeof physics.leakage.ratePerS !== 'number' ||
    !Number.isFinite(physics.leakage.ratePerS) ||
    physics.leakage.ratePerS < 0
  ) {
    return false;
  }
  const expectedScoringVersion = version === 9
    ? 'free-process-score-v3'
    : 'free-process-score-v1';
  if (scoring.processScoringVersion !== expectedScoringVersion) return false;

  const physicsKeys = version === 5
    ? FREE_CONFIG_V5_PHYSICS_KEYS
    : version === 7
      ? FREE_CONFIG_V7_PHYSICS_KEYS
      : FREE_CONFIG_V9_PHYSICS_KEYS;
  const sensorKeys = version === 5
    ? FREE_CONFIG_V5_SENSOR_KEYS
    : version === 7
      ? FREE_CONFIG_V7_SENSOR_KEYS
      : FREE_CONFIG_V9_SENSOR_KEYS;
  const optionalPhysicsKeys = version === 5
    ? []
    : ['pumpValveExchange', 'environmentDisturbance'];
  const optionalSensorKeys = version === 5
    ? []
    : ['pressureNonlinearity'];
  const requiredPhysicsKeys = physicsKeys.filter(
    (key) => !optionalPhysicsKeys.includes(key),
  );
  const requiredSensorKeys = sensorKeys.filter(
    (key) => !optionalSensorKeys.includes(key),
  );
  if (
    !hasOnlyKnownOwnKeys(physics, new Set(physicsKeys)) ||
    !hasRequiredOwnKeys(physics, requiredPhysicsKeys) ||
    !hasOnlyKnownOwnKeys(sensor, new Set(sensorKeys)) ||
    !hasRequiredOwnKeys(sensor, requiredSensorKeys)
  ) {
    return false;
  }
  const physicsNumericKeys = physicsKeys.filter((key) => (
    key !== 'thermal' &&
    key !== 'pumpValveExchange' &&
    key !== 'environmentDisturbance' &&
    key !== 'leakage'
  ));
  const sensorNumericKeys = sensorKeys.filter(
    (key) => key !== 'pressureNonlinearity',
  );
  if (
    !hasFiniteNumberFields(physics, physicsNumericKeys) ||
    !hasFiniteNumberFields(sensor, sensorNumericKeys) ||
    !physicsNumericKeys.every((key) => (physics[key] as number) >= 0) ||
    !sensorNumericKeys.every((key) => (sensor[key] as number) >= 0) ||
    (physics.gamma as number) <= 1 ||
    (physics.vesselVolumeL as number) <= 0 ||
    (sensor.pressureMvPerKPa as number) <= 0 ||
    (sensor.temperatureMvPerK as number) <= 0
  ) {
    return false;
  }
  if (
    !hasValidOptionalEnabledConfig(
      physics.pumpValveExchange,
      FREE_CONFIG_PUMP_VALVE_EXCHANGE_KEYS,
    ) ||
    !hasValidOptionalEnabledConfig(
      physics.environmentDisturbance,
      FREE_CONFIG_ENVIRONMENT_DISTURBANCE_KEYS,
    ) ||
    !hasValidOptionalEnabledConfig(
      sensor.pressureNonlinearity,
      FREE_CONFIG_PRESSURE_NONLINEARITY_KEYS,
    )
  ) {
    return false;
  }
  for (const optionalConfig of [
    physics.pumpValveExchange,
    physics.environmentDisturbance,
    sensor.pressureNonlinearity,
  ]) {
    if (
      isPlainPersistenceRecord(optionalConfig) &&
      !Object.entries(optionalConfig).every(([key, entry]) => (
        key === 'enabled' ||
        (
          typeof entry === 'number' &&
          Number.isFinite(entry)
        )
      ))
    ) {
      return false;
    }
  }
  return true;
};

const hasCanonicalEmptyTraceStore = (value: unknown) => (
  isPlainPersistenceRecord(value) &&
  hasExactOwnKeys(value, EMPTY_TRACE_STORE_KEYS) &&
  value.activeTraceTrialId === null &&
  Array.isArray(value.traceTrials) &&
  value.traceTrials.length === 0 &&
  typeof value.nextTraceTrialIndex === 'number' &&
  Number.isSafeInteger(value.nextTraceTrialIndex) &&
  value.nextTraceTrialIndex >= 1
);

const EMPTY_MODE_SESSION_ENTRY_KEYS = [
  'status',
  'resumeRunState',
  'capturedAtMs',
  'snapshot',
  'uiCheckpoint',
] as const;

const hasNoPersistedFreeModeSessionAuthority = (
  payload: Record<string, unknown>,
) => {
  const common = isPlainPersistenceRecord(payload.common)
    ? payload.common
    : null;
  if (
    common === null ||
    !Object.prototype.hasOwnProperty.call(common, 'modeSessions')
  ) {
    return true;
  }
  const modeSessions = isPlainPersistenceRecord(common.modeSessions)
    ? common.modeSessions
    : null;
  if (
    modeSessions === null ||
    !hasExactOwnKeys(modeSessions, [
      'schemaVersion',
      'demo',
      'guide',
      'free',
    ])
  ) {
    return false;
  }
  if (modeSessions.schemaVersion !== 2) return false;
  return ['demo', 'guide', 'free'].every((mode) => {
    const entry = isPlainPersistenceRecord(modeSessions[mode])
      ? modeSessions[mode]
      : null;
    return (
      entry !== null &&
      hasExactOwnKeys(entry, EMPTY_MODE_SESSION_ENTRY_KEYS) &&
      entry.status === 'empty' &&
      entry.resumeRunState === 'idle' &&
      entry.capturedAtMs === null &&
      entry.snapshot === null &&
      entry.uiCheckpoint === null
    );
  });
};

const hasNoRollbackAuthority = (value: unknown) => (
  value === undefined ||
  value === null ||
  (
    isPlainPersistenceRecord(value) &&
    hasExactOwnKeys(value, [
      'afterPowerOn',
      'beforePump',
      'beforeRelease',
    ]) &&
    value.afterPowerOn === null &&
    value.beforePump === null &&
    value.beforeRelease === null
  )
);

const hasValidFreeRecordConfig = (value: unknown) => (
  hasExactFiniteNumberFields(value, FREE_RECORD_CONFIG_KEYS) &&
  FREE_RECORD_CONFIG_KEYS.every((key) => (
    (value as Record<string, number>)[key] >= 0
  ))
);

const hasNoAcknowledgementAuthority = (value: unknown) => (
  value === undefined ||
  (
    isPlainPersistenceRecord(value) &&
    hasExactOwnKeys(value, FREE_ACKNOWLEDGEMENT_KEYS) &&
    value.advancedParametersRisk === false &&
    value.idealParameterProfileIntro === false
  )
);

const LEGACY_EMPTY_REFERENCE_STORE_KEYS = [
  'standard',
  'operableBest',
] as const;

const hasNoLegacyReferenceAuthority = (value: unknown) => (
  value === undefined ||
  value === null ||
  (
    isPlainPersistenceRecord(value) &&
    hasExactOwnKeys(value, LEGACY_EMPTY_REFERENCE_STORE_KEYS) &&
    value.standard === null &&
    value.operableBest === null
  )
);

const hasNoRuntimeHistory = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (!isPlainPersistenceRecord(value)) return false;
  return (
    hasOnlyKnownOwnKeys(value, KNOWN_FREE_RUNTIME_KEYS) &&
    (
      value.simulationTimeS === undefined ||
      value.simulationTimeS === 0
    ) &&
    (
      value.pumpProcesses === undefined ||
      (
        Array.isArray(value.pumpProcesses) &&
        value.pumpProcesses.length === 0
      )
    ) &&
    (
      value.pumpStrokeCount === undefined ||
      value.pumpStrokeCount === 0
    ) &&
    value.lastPumpStrokeAtS == null &&
    value.lastPumpValveOpenedAtS == null &&
    value.lastPumpValveClosedAtS == null &&
    value.lastStopcockOpenedAtS == null &&
    value.lastStopcockClosedAtS == null &&
    (
      value.releaseStarted === undefined ||
      value.releaseStarted === false
    ) &&
    value.releaseProcess == null &&
    value.releaseReference == null
  );
};

const hasIdleSensorHistory = (value: unknown) => {
  if (!isPlainPersistenceRecord(value)) return false;
  const hasIdleBaseline = (history: unknown) => (
    Array.isArray(history) &&
    history.length === 1 &&
    isPlainPersistenceRecord(history[0]) &&
    hasExactOwnKeys(history[0], FREE_SENSOR_SAMPLE_KEYS) &&
    history[0].atS === 0 &&
    typeof history[0].valueMv === 'number' &&
    Number.isFinite(history[0].valueMv)
  );
  return (
    hasOnlyKnownOwnKeys(value, KNOWN_FREE_SENSOR_STATE_KEYS) &&
    (typeof value.seed === 'number' || typeof value.seed === 'string') &&
    hasFiniteNumberFields(value, [
      'pressureInitialBiasMv',
      'displayPressureMv',
      'displayTemperatureMv',
      'nextSampleAtS',
      'pressureSlopeMvPerS',
      'temperatureSlopeMvPerS',
    ]) &&
    value.nextSampleAtS === 0 &&
    value.pressureSlopeMvPerS === 0 &&
    value.temperatureSlopeMvPerS === 0 &&
    hasIdleBaseline(value.pressureHistory) &&
    hasIdleBaseline(value.temperatureHistory) &&
    (
      value.sensorTemperatureK === undefined ||
      (
        typeof value.sensorTemperatureK === 'number' &&
        Number.isFinite(value.sensorTemperatureK) &&
        value.sensorTemperatureK > 0
      )
    ) &&
    (
      value.pressureReliability === undefined ||
      value.pressureReliability === 1
    ) &&
    (
      value.pressureNonlinearErrorMv === undefined ||
      value.pressureNonlinearErrorMv === 0
    ) &&
    (
      value.pressureStochasticErrorMv === undefined ||
      value.pressureStochasticErrorMv === 0
    )
  );
};

const hasIdleReleaseState = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (!isPlainPersistenceRecord(value)) return false;
  return (
    hasOnlyKnownOwnKeys(value, KNOWN_FREE_RELEASE_STATE_KEYS) &&
    (value.phase === undefined || value.phase === 'closed') &&
    (value.purpose === undefined || value.purpose === 'none') &&
    (value.attemptId === undefined || value.attemptId === 0) &&
    value.openingStartedAtS == null &&
    value.openingCompletedAtS == null &&
    value.closeCommandAtS == null &&
    value.closingCompletedAtS == null &&
    (value.releaseDurationS === undefined || value.releaseDurationS === 0) &&
    (value.formedRelease === undefined || value.formedRelease === false) &&
    (value.quickToggle === undefined || value.quickToggle === false)
  );
};

const hasIdleFreeControls = (value: unknown) => {
  if (!isPlainPersistenceRecord(value)) return false;
  return (
    hasOnlyKnownOwnKeys(value, KNOWN_FREE_CONTROLS_KEYS) &&
    value.powerOn === false &&
    value.pumpValveOpen === false &&
    (value.stopcockOpen === undefined || value.stopcockOpen === false) &&
    (value.pumpBulbState === undefined || value.pumpBulbState === 'idle') &&
    (
      value.stopcockFlowOpen === undefined ||
      value.stopcockFlowOpen === false
    ) &&
    (
      value.stopcockFlowPurpose === undefined ||
      value.stopcockFlowPurpose === 'none'
    ) &&
    hasIdleReleaseState(value.releaseState)
  );
};

const hasNoCalibrationHistory = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (!isPlainPersistenceRecord(value)) return false;
  return (
    hasOnlyKnownOwnKeys(value, KNOWN_FREE_CALIBRATION_KEYS) &&
    (
      value.calibrationVersion === undefined ||
      value.calibrationVersion === 0
    ) &&
    (
      value.zeroEvents === undefined ||
      (
        Array.isArray(value.zeroEvents) &&
        value.zeroEvents.length === 0
      )
    ) &&
    value.automaticU0 == null
  );
};

const LEGACY_PROCESSING_RESULT_KEYS = [
  'calculated',
  'status',
  'validTrialCount',
  'trialResults',
  'meanGamma',
  'theoreticalGamma',
  'relativeErrorPercent',
  'message',
] as const;

const hasNoLegacyProcessingHistory = (value: unknown) => (
  value === undefined ||
  value === null ||
  (
    isPlainPersistenceRecord(value) &&
    hasExactOwnKeys(value, LEGACY_PROCESSING_RESULT_KEYS) &&
    value.calculated === false &&
    value.status === 'not-calculated' &&
    value.validTrialCount === 0 &&
    Array.isArray(value.trialResults) &&
    value.trialResults.length === 0 &&
    value.meanGamma === null &&
    value.relativeErrorPercent === null
  )
);

const hasNoUiReplayHistory = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (!isPlainPersistenceRecord(value)) return false;
  const pumpStrokeTimestamps = value.pumpStrokeTimestamps;
  const recordedPressures = value.recordedPressures;
  const processSamples = value.heatCapacityProcessSamples;
  return (
    hasOnlyKnownOwnKeys(value, KNOWN_FREE_UI_REPLAY_KEYS) &&
    (
      pumpStrokeTimestamps === undefined ||
      (
        Array.isArray(pumpStrokeTimestamps) &&
        pumpStrokeTimestamps.length === 0
      )
    ) &&
    (
      recordedPressures === undefined ||
      recordedPressures === null ||
      (
        isPlainPersistenceRecord(recordedPressures) &&
        hasExactOwnKeys(recordedPressures, ['p0', 'p1', 'p2']) &&
        typeof recordedPressures.p0 === 'number' &&
        Number.isFinite(recordedPressures.p0) &&
        recordedPressures.p1 == null &&
        recordedPressures.p2 == null
      )
    ) &&
    (
      processSamples === undefined ||
      processSamples === null ||
      (
        isPlainPersistenceRecord(processSamples) &&
        Object.keys(processSamples).length === 0
      )
    ) &&
    (
      value.heatCapacityPhase === undefined ||
      value.heatCapacityPhase === 'powerOff'
    ) &&
    (
      value.heatCapacityActiveTrialIndex === undefined ||
      value.heatCapacityActiveTrialIndex === 0
    ) &&
    (
      value.heatCapacityProcessingCalculated === undefined ||
      value.heatCapacityProcessingCalculated === false
    ) &&
    hasNoLegacyProcessingHistory(value.heatCapacityProcessingResult) &&
    (
      value.glassPistonState === undefined ||
      value.glassPistonState === 'closed'
    ) &&
    (
      value.stopcockAngleDeg === undefined ||
      value.stopcockAngleDeg === 0
    ) &&
    (
      value.pumpValveOpen === undefined ||
      value.pumpValveOpen === false
    ) &&
    (
      value.pumpValveState === undefined ||
      value.pumpValveState === 'closed'
    ) &&
    (
      value.pumpBulbState === undefined ||
      value.pumpBulbState === 'idle'
    ) &&
    (
      value.lastPumpTime === undefined ||
      value.lastPumpTime === null
    ) &&
    (
      value.pumpStrokeCount === undefined ||
      value.pumpStrokeCount === 0
    ) &&
    (
      value.heatCapacityFreeStopcockFlowOpen === undefined ||
      value.heatCapacityFreeStopcockFlowOpen === false
    ) &&
    value.heatCapacityFreeStopcockPendingOpenAtMs == null &&
    (
      value.pressureZeroed === undefined ||
      value.pressureZeroed === false
    ) &&
    (
      value.pressureZeroAdjusted === undefined ||
      value.pressureZeroAdjusted === false
    ) &&
    (
      value.pressureZeroDisplayedSamples === undefined ||
      (
        Array.isArray(value.pressureZeroDisplayedSamples) &&
        value.pressureZeroDisplayedSamples.length === 0
      )
    )
  );
};

const hasNoFreeRunAuthority = (value: Record<string, unknown>) => (
  (value.activeAttempt === undefined || value.activeAttempt === null) &&
  (
    value.preheatCompleted === undefined ||
    typeof value.preheatCompleted === 'boolean'
  ) &&
  (
    value.parameterScheme === undefined ||
    value.parameterScheme === 'real' ||
    value.parameterScheme === 'ideal'
  ) &&
  (
    value.displayScheme === undefined ||
    value.displayScheme === 'real' ||
    value.displayScheme === 'ideal'
  ) &&
  (
    value.scheme === undefined ||
    value.scheme === 'real' ||
    value.scheme === 'ideal'
  ) &&
  (
    value.gasType === undefined ||
    value.gasType === 'air' ||
    value.gasType === 'helium'
  ) &&
  (
    value.advancedRiskAccepted === undefined ||
    value.advancedRiskAccepted === false
  ) &&
  (
    value.activeRunConfigSnapshot === undefined ||
    value.activeRunConfigSnapshot === null
  ) &&
  (
    value.experimentGroupStatus === undefined ||
    value.experimentGroupStatus === 'draft'
  ) &&
  hasValidFreeRecordConfig(value.recordConfig) &&
  hasNoAcknowledgementAuthority(value.acknowledgements) &&
  typeof value.pressureWarningMv === 'number' &&
  Number.isFinite(value.pressureWarningMv) &&
  value.pressureWarningMv >= 0 &&
  typeof value.instrumentNoiseEnabled === 'boolean' &&
  hasNoRollbackAuthority(value.rollbackSnapshots) &&
  hasNoLegacyReferenceAuthority(value.references) &&
  hasNoRuntimeHistory(value.runtime ?? value.physicsState) &&
  hasIdleSensorHistory(value.sensor ?? value.sensorState) &&
  hasNoCalibrationHistory(value.calibration ?? value.calibrationState) &&
  hasNoUiReplayHistory(value.uiReplay) &&
  (
    value.stopcockFlowOpen === undefined ||
    value.stopcockFlowOpen === false
  ) &&
  value.stopcockPendingOpenAtMs == null &&
  (
    value.stopcockFlowPurpose === undefined ||
    value.stopcockFlowPurpose === 'none'
  ) &&
  hasIdleReleaseState(value.releaseState)
);

type LegacyHeatCapacityPreparationFailure = {
  ok: false;
  status: 'unsupported-future' | 'quarantined';
  category:
    | 'schema-version'
    | 'schema-shape'
    | 'relationship'
    | 'authoritative-data'
    | 'unsupported-future';
  code: string;
  reason: string;
  fieldPath: string;
  sourceVersion?: number;
  supportedVersion?: number;
};

const createLegacyHeatCapacityDomainFutureFailure = (
  value: unknown,
  scheme: 'real' | 'ideal',
  fieldPath: string,
  pathMap?: Readonly<Record<string, string>>,
): LegacyHeatCapacityPreparationFailure | null => {
  const fallback = createDefaultHeatCapacityFile(1);
  const decoded = decodeHeatCapacityFreeExperimentDomainAggregate(
    value,
    scheme,
    'air',
    scheme === 'ideal'
      ? fallback.heatCapacityFreeIdealDomain
      : fallback.heatCapacityFreeRealDomain,
  );
  if (
    decoded.ok ||
    decoded.status !== 'unsupported-future' ||
    typeof decoded.sourceVersion !== 'number'
  ) {
    return null;
  }
  const relativePath = decoded.fieldPath ?? '';
  let resolvedPath = relativePath.length > 0
    ? `${fieldPath}.${relativePath}`
    : fieldPath;
  if (pathMap !== undefined) {
    for (const [aggregateKey, sourcePath] of Object.entries(pathMap)) {
      if (
        relativePath === aggregateKey ||
        relativePath.startsWith(`${aggregateKey}.`) ||
        relativePath.startsWith(`${aggregateKey}[`)
      ) {
        resolvedPath = `${sourcePath}${relativePath.slice(aggregateKey.length)}`;
        break;
      }
    }
  }
  const isBatchVersion = relativePath === 'batch.version';
  const isConfigVersion =
    relativePath.includes('ConfigSnapshot') ||
    relativePath.includes('configSnapshot');
  return {
    ok: false,
    status: 'unsupported-future',
    category: 'unsupported-future',
    code: isBatchVersion
      ? 'legacy-heat-capacity-batch-version-future'
      : isConfigVersion
        ? 'legacy-heat-capacity-config-version-future'
        : 'legacy-heat-capacity-domain-authority-version-future',
    reason: decoded.reason,
    fieldPath: resolvedPath,
    sourceVersion: decoded.sourceVersion,
    supportedVersion: isBatchVersion
      ? HEAT_CAPACITY_FREE_BATCH_VERSION
      : isConfigVersion
        ? HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION
        : undefined,
  };
};

const preflightLegacyHeatCapacityFutureVersions = (
  payload: Record<string, unknown>,
  free: Record<string, unknown>,
): LegacyHeatCapacityPreparationFailure | null => {
  const runtimeCandidates: Array<{
    value: unknown;
    fieldPath: string;
  }> = [{
    value: free.runtimeVersion,
    fieldPath: 'payload.free.runtimeVersion',
  }];
  const traceCandidates: Array<{
    value: unknown;
    fieldPath: string;
  }> = [{
    value: free.traceVersion,
    fieldPath: 'payload.free.traceVersion',
  }];
  const common = isPlainPersistenceRecord(payload.common)
    ? payload.common
    : null;
  const modeSessions = common &&
      isPlainPersistenceRecord(common.modeSessions)
    ? common.modeSessions
    : null;
  if (
    modeSessions !== null &&
    typeof modeSessions.schemaVersion === 'number' &&
    Number.isInteger(modeSessions.schemaVersion) &&
    modeSessions.schemaVersion > HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      status: 'unsupported-future',
      category: 'unsupported-future',
      code: 'legacy-heat-capacity-mode-session-version-future',
      reason:
        'The legacy heat-capacity mode-session store requires a newer application.',
      fieldPath: 'payload.common.modeSessions.schemaVersion',
      sourceVersion: modeSessions.schemaVersion,
      supportedVersion: HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION,
    };
  }
  if (modeSessions !== null) {
    for (const mode of ['demo', 'guide', 'free'] as const) {
      const entry = isPlainPersistenceRecord(modeSessions[mode])
        ? modeSessions[mode]
        : null;
      const snapshot = entry &&
          isPlainPersistenceRecord(entry.snapshot)
        ? entry.snapshot
        : null;
      if (
        snapshot !== null &&
        typeof snapshot.schemaVersion === 'number' &&
        Number.isInteger(snapshot.schemaVersion) &&
        snapshot.schemaVersion >
          HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION
      ) {
        return {
          ok: false,
          status: 'unsupported-future',
          category: 'unsupported-future',
          code: 'legacy-heat-capacity-mode-runtime-version-future',
          reason:
            'A legacy heat-capacity mode snapshot requires a newer application.',
          fieldPath:
            `payload.common.modeSessions.${mode}.snapshot.schemaVersion`,
          sourceVersion: snapshot.schemaVersion,
          supportedVersion:
            HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
        };
      }
      if (mode !== 'free') continue;
      const freeSnapshot = snapshot &&
          isPlainPersistenceRecord(snapshot.free)
        ? snapshot.free
        : null;
      if (freeSnapshot !== null) {
        runtimeCandidates.push({
          value: freeSnapshot.heatCapacityFreeRuntimeVersion,
          fieldPath:
            `payload.common.modeSessions.${mode}.snapshot.free.heatCapacityFreeRuntimeVersion`,
        });
        traceCandidates.push({
          value: freeSnapshot.heatCapacityFreeTraceVersion,
          fieldPath:
            `payload.common.modeSessions.${mode}.snapshot.free.heatCapacityFreeTraceVersion`,
        });
      }
    }
  }
  for (const candidate of runtimeCandidates) {
    if (
      typeof candidate.value === 'number' &&
      Number.isInteger(candidate.value) &&
      candidate.value > HEAT_CAPACITY_FREE_RUNTIME_VERSION
    ) {
      return {
        ok: false,
        status: 'unsupported-future',
        category: 'unsupported-future',
        code: 'legacy-heat-capacity-runtime-version-future',
        reason: 'The legacy Free runtime requires a newer application.',
        fieldPath: candidate.fieldPath,
        sourceVersion: candidate.value,
        supportedVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
      };
    }
  }
  for (const candidate of traceCandidates) {
    if (
      typeof candidate.value === 'number' &&
      Number.isInteger(candidate.value) &&
      candidate.value > HEAT_CAPACITY_FREE_TRACE_VERSION
    ) {
      return {
        ok: false,
        status: 'unsupported-future',
        category: 'unsupported-future',
        code: 'legacy-heat-capacity-trace-version-future',
        reason: 'The legacy Free trace requires a newer application.',
        fieldPath: candidate.fieldPath,
        sourceVersion: candidate.value,
        supportedVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
      };
    }
  }
  const domainCandidates: Array<{
    value: unknown;
    scheme: 'real' | 'ideal';
    fieldPath: string;
    pathMap?: Readonly<Record<string, string>>;
  }> = [];
  const topSelectedScheme = free.parameterScheme === 'ideal'
    ? 'ideal'
    : 'real';
  const topSelectedDomain = isPlainPersistenceRecord(
    free[topSelectedScheme],
  )
    ? free[topSelectedScheme] as Record<string, unknown>
    : null;
  domainCandidates.push({
    value: {
      ...(topSelectedDomain ?? {}),
      activeRunConfigSnapshot: free.activeRunConfigSnapshot,
      trials: free.trials,
      traceStore: free.traceStore,
    },
    scheme: topSelectedScheme,
    fieldPath: 'payload.free',
    pathMap: {
      batch: `payload.free.${topSelectedScheme}.batch`,
      activeRunConfigSnapshot: 'payload.free.activeRunConfigSnapshot',
      trials: 'payload.free.trials',
      traceStore: 'payload.free.traceStore',
    },
  });
  for (const scheme of ['real', 'ideal'] as const) {
    domainCandidates.push({
      value: free[scheme],
      scheme,
      fieldPath: `payload.free.${scheme}`,
    });
  }
  if (modeSessions !== null) {
    const freeEntry = isPlainPersistenceRecord(modeSessions.free)
      ? modeSessions.free
      : null;
    const snapshot = freeEntry &&
        isPlainPersistenceRecord(freeEntry.snapshot)
      ? freeEntry.snapshot
      : null;
    const freeSnapshot = snapshot &&
        isPlainPersistenceRecord(snapshot.free)
      ? snapshot.free
      : null;
    if (freeSnapshot !== null) {
      const snapshotPath =
        'payload.common.modeSessions.free.snapshot.free';
      const selectedScheme =
        freeSnapshot.heatCapacityFreeParameterScheme === 'ideal'
          ? 'ideal'
          : 'real';
      const selectedDomainKey = selectedScheme === 'ideal'
        ? 'heatCapacityFreeIdealDomain'
        : 'heatCapacityFreeRealDomain';
      const selectedDomain = isPlainPersistenceRecord(
        freeSnapshot[selectedDomainKey],
      )
        ? freeSnapshot[selectedDomainKey] as Record<string, unknown>
        : null;
      domainCandidates.push({
        value: {
          ...(selectedDomain ?? {}),
          batch: freeSnapshot.heatCapacityFreeBatch,
          activeRunConfigSnapshot:
            freeSnapshot.heatCapacityFreeActiveRunConfigSnapshot,
          trials: freeSnapshot.heatCapacityFreeTrials,
          traceStore: freeSnapshot.heatCapacityFreeTraceStore,
          activeAttempt: freeSnapshot.heatCapacityFreeActiveAttempt,
        },
        scheme: selectedScheme,
        fieldPath: snapshotPath,
        pathMap: {
          batch: `${snapshotPath}.heatCapacityFreeBatch`,
          activeRunConfigSnapshot:
            `${snapshotPath}.heatCapacityFreeActiveRunConfigSnapshot`,
          trials: `${snapshotPath}.heatCapacityFreeTrials`,
          traceStore: `${snapshotPath}.heatCapacityFreeTraceStore`,
          activeAttempt: `${snapshotPath}.heatCapacityFreeActiveAttempt`,
        },
      });
      domainCandidates.push(
        {
          value: freeSnapshot.heatCapacityFreeRealDomain,
          scheme: 'real',
          fieldPath: `${snapshotPath}.heatCapacityFreeRealDomain`,
        },
        {
          value: freeSnapshot.heatCapacityFreeIdealDomain,
          scheme: 'ideal',
          fieldPath: `${snapshotPath}.heatCapacityFreeIdealDomain`,
        },
      );
    }
  }
  for (const candidate of domainCandidates) {
    const failure = createLegacyHeatCapacityDomainFutureFailure(
      candidate.value,
      candidate.scheme,
      candidate.fieldPath,
      candidate.pathMap,
    );
    if (failure !== null) return failure;
  }
  const configCandidates: Array<{
    value: unknown;
    fieldPath: string;
  }> = [
    {
      value: free.config,
      fieldPath: 'payload.free.config',
    },
    {
      value: free.activeRunConfigSnapshot,
      fieldPath: 'payload.free.activeRunConfigSnapshot',
    },
  ];
  for (const scheme of ['real', 'ideal'] as const) {
    const domain = isPlainPersistenceRecord(free[scheme])
      ? free[scheme]
      : null;
    if (domain === null) continue;
    configCandidates.push({
      value: domain.activeRunConfigSnapshot,
      fieldPath: `payload.free.${scheme}.activeRunConfigSnapshot`,
    });
    const batch = isPlainPersistenceRecord(domain.batch)
      ? domain.batch
      : null;
    if (
      batch !== null &&
      typeof batch.version === 'number' &&
      Number.isInteger(batch.version) &&
      batch.version > HEAT_CAPACITY_FREE_BATCH_VERSION
    ) {
      return {
        ok: false,
        status: 'unsupported-future',
        category: 'unsupported-future',
        code: 'legacy-heat-capacity-batch-version-future',
        reason: 'A legacy Free batch requires a newer application.',
        fieldPath: `payload.free.${scheme}.batch.version`,
        sourceVersion: batch.version,
        supportedVersion: HEAT_CAPACITY_FREE_BATCH_VERSION,
      };
    }
    configCandidates.push({
      value: batch?.frozenConfigSnapshot,
      fieldPath: `payload.free.${scheme}.batch.frozenConfigSnapshot`,
    });
  }
  for (const candidate of configCandidates) {
    const config = isPlainPersistenceRecord(candidate.value)
      ? candidate.value
      : null;
    if (
      config !== null &&
      typeof config.version === 'number' &&
      Number.isInteger(config.version) &&
      config.version > HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION
    ) {
      return {
        ok: false,
        status: 'unsupported-future',
        category: 'unsupported-future',
        code: 'legacy-heat-capacity-config-version-future',
        reason:
          'The legacy Free configuration requires a newer application.',
        fieldPath: `${candidate.fieldPath}.version`,
        sourceVersion: config.version,
        supportedVersion: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
      };
    }
  }
  return null;
};

const inspectLegacyConfigSnapshotVersion = (
  value: unknown,
  fieldPath: string,
  required: boolean,
): LegacyHeatCapacityPreparationFailure | null => {
  if ((value === undefined || value === null) && !required) return null;
  if (!isPlainPersistenceRecord(value)) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-shape',
      code: 'legacy-heat-capacity-config-snapshot-invalid',
      reason: 'The legacy Free configuration snapshot shape is unsupported.',
      fieldPath,
    };
  }
  const version = value.version;
  if (
    typeof version === 'number' &&
    Number.isInteger(version) &&
    version > HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION
  ) {
    return {
      ok: false,
      status: 'unsupported-future',
      category: 'unsupported-future',
      code: 'legacy-heat-capacity-config-version-future',
      reason: 'The legacy Free configuration requires a newer application.',
      fieldPath: `${fieldPath}.version`,
      sourceVersion: version,
      supportedVersion: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    };
  }
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    !KNOWN_FREE_CONFIG_SNAPSHOT_VERSIONS.has(version)
  ) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-version',
      code: 'legacy-heat-capacity-config-version-invalid',
      reason: 'The legacy Free configuration version is unsupported.',
      fieldPath: `${fieldPath}.version`,
      sourceVersion: typeof version === 'number' ? version : undefined,
      supportedVersion: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    };
  }
  if (!hasExactOwnKeys(value, KNOWN_FREE_CONFIG_SNAPSHOT_KEYS)) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-shape',
      code: 'legacy-heat-capacity-config-snapshot-invalid',
      reason: 'The legacy Free configuration snapshot shape is unsupported.',
      fieldPath,
      sourceVersion: version,
      supportedVersion: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    };
  }
  if (!hasValidFreeConfigSnapshotShape(value, version)) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-shape',
      code: 'legacy-heat-capacity-config-snapshot-invalid',
      reason: 'The legacy Free configuration snapshot shape is unsupported.',
      fieldPath,
      sourceVersion: version,
      supportedVersion: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    };
  }
  return null;
};

const inspectLegacyParameterDraft = (
  value: unknown,
): LegacyHeatCapacityPreparationFailure | null => {
  if (value === undefined) return null;
  if (
    !isPlainPersistenceRecord(value) ||
    !hasOnlyKnownOwnKeys(value, KNOWN_FREE_PARAMETER_DRAFT_KEYS) ||
    !(
      hasExactOwnKeys(value, CURRENT_FREE_PARAMETER_DRAFT_KEYS) ||
      hasExactOwnKeys(value, LEGACY_V5_FREE_PARAMETER_DRAFT_KEYS)
    )
  ) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-shape',
      code: 'legacy-heat-capacity-parameter-draft-invalid',
      reason: 'The legacy Free parameter draft shape is unsupported.',
      fieldPath: 'payload.free.parameterDraft',
    };
  }
  const numericKeys = Object.keys(value).filter((key) => (
    key !== 'leakageEnabled' &&
    key !== 'instrumentNoiseEnabled' &&
    key !== 'gasType'
  ));
  if (
    !hasFiniteNumberFields(value, numericKeys) ||
    typeof value.leakageEnabled !== 'boolean' ||
    typeof value.instrumentNoiseEnabled !== 'boolean' ||
    (
      Object.prototype.hasOwnProperty.call(value, 'gasType') &&
      value.gasType !== 'air' &&
      value.gasType !== 'helium'
    ) ||
    (value.ambientPressureKPa as number) <= 0 ||
    (value.ambientTemperatureK as number) <= 0 ||
    (value.gasWallConductanceWPerK as number) < 0 ||
    (value.wallAmbientConductanceWPerK as number) < 0 ||
    (value.wallHeatCapacityJPerK as number) <= 0 ||
    (value.leakageRatePerS as number) < 0 ||
    (value.noiseMv as number) < 0 ||
    (value.sensorLagTimeS as number) <= 0 ||
    (value.u0ZeroToleranceMv as number) < 0 ||
    (value.pressureStableSlopeMvPerS as number) < 0 ||
    (value.temperatureStableSlopeMvPerS as number) < 0 ||
    (value.temperatureAmbientToleranceMv as number) < 0 ||
    (value.minimumUsefulU1CorrectedMv as number) < 0 ||
    (value.overVentedMinimumU2CorrectedMv as number) < 0 ||
    (value.pressureWarningMv as number) < 0 ||
    (value.pressureDangerMv as number) <= (value.pressureWarningMv as number) ||
    (
      Object.prototype.hasOwnProperty.call(value, 'pressureMvPerKPa') &&
      (value.pressureMvPerKPa as number) <= 0
    ) ||
    (
      Object.prototype.hasOwnProperty.call(value, 'vesselVolumeL') &&
      (value.vesselVolumeL as number) <= 0
    ) ||
    (
      Object.prototype.hasOwnProperty.call(value, 'gamma') &&
      (value.gamma as number) <= 1
    )
  ) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'authoritative-data',
      code: 'legacy-heat-capacity-parameter-draft-invalid',
      reason: 'The legacy Free parameter draft contains invalid values.',
      fieldPath: 'payload.free.parameterDraft',
    };
  }
  return null;
};

const prepareLegacyHeatCapacityEnvelope = (
  envelope: LegacyWorkbenchExperimentFileEnvelope & {
    kind: 'heatCapacity';
  },
): {
  ok: true;
  envelope: LegacyWorkbenchExperimentFileEnvelope & {
    kind: 'heatCapacity';
  };
  topLevelOnly: boolean;
} | LegacyHeatCapacityPreparationFailure => {
  const prepared = structuredClone(envelope);
  const heatCapacitySchemaVersion =
    prepared.payload.heatCapacitySchemaVersion;
  if (
    typeof heatCapacitySchemaVersion === 'number' &&
    Number.isInteger(heatCapacitySchemaVersion) &&
    heatCapacitySchemaVersion > HEAT_CAPACITY_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      status: 'unsupported-future',
      category: 'unsupported-future',
      code: 'legacy-heat-capacity-schema-version-future',
      reason: 'The legacy heat-capacity payload requires a newer application.',
      fieldPath: 'payload.heatCapacitySchemaVersion',
      sourceVersion: heatCapacitySchemaVersion,
      supportedVersion: HEAT_CAPACITY_SCHEMA_VERSION,
    };
  }
  if (heatCapacitySchemaVersion !== HEAT_CAPACITY_SCHEMA_VERSION) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-version',
      code: 'legacy-heat-capacity-schema-version-invalid',
      reason: 'The legacy heat-capacity payload schema version is unsupported.',
      fieldPath: 'payload.heatCapacitySchemaVersion',
      supportedVersion: HEAT_CAPACITY_SCHEMA_VERSION,
    };
  }
  const free = isPlainPersistenceRecord(prepared.payload.free)
    ? prepared.payload.free
    : null;
  if (free === null) {
    return {
      ok: true,
      envelope: prepared,
      topLevelOnly: false,
    };
  }
  const futureFailure = preflightLegacyHeatCapacityFutureVersions(
    prepared.payload,
    free,
  );
  if (futureFailure !== null) return futureFailure;
  const runtimeVersion = free.runtimeVersion;
  if (
    typeof runtimeVersion === 'number' &&
    Number.isInteger(runtimeVersion) &&
    runtimeVersion > HEAT_CAPACITY_FREE_RUNTIME_VERSION
  ) {
    return {
      ok: false,
      status: 'unsupported-future',
      category: 'unsupported-future',
      code: 'legacy-heat-capacity-runtime-version-future',
      reason: 'The legacy Free runtime requires a newer application.',
      fieldPath: 'payload.free.runtimeVersion',
      sourceVersion: runtimeVersion,
      supportedVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
    };
  }
  if (runtimeVersion !== HEAT_CAPACITY_FREE_RUNTIME_VERSION) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-version',
      code: 'legacy-heat-capacity-runtime-version-invalid',
      reason: 'The legacy Free runtime version is unsupported.',
      fieldPath: 'payload.free.runtimeVersion',
      supportedVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
    };
  }
  const traceVersion = free.traceVersion;
  if (
    typeof traceVersion === 'number' &&
    Number.isInteger(traceVersion) &&
    traceVersion > HEAT_CAPACITY_FREE_TRACE_VERSION
  ) {
    return {
      ok: false,
      status: 'unsupported-future',
      category: 'unsupported-future',
      code: 'legacy-heat-capacity-trace-version-future',
      reason: 'The legacy Free trace requires a newer application.',
      fieldPath: 'payload.free.traceVersion',
      sourceVersion: traceVersion,
      supportedVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    };
  }
  if (
    traceVersion !== HEAT_CAPACITY_FREE_TRACE_VERSION &&
    traceVersion !== LEGACY_HEAT_CAPACITY_FREE_TRACE_VERSION
  ) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-version',
      code: 'legacy-heat-capacity-trace-version-invalid',
      reason: 'The legacy Free trace version is unsupported.',
      fieldPath: 'payload.free.traceVersion',
      sourceVersion: typeof traceVersion === 'number'
        ? traceVersion
        : undefined,
      supportedVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    };
  }
  if (free.calculationVersion !== HEAT_CAPACITY_FREE_CALCULATION_VERSION) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'schema-version',
      code: 'legacy-heat-capacity-calculation-version-invalid',
      reason: 'The legacy Free calculation version is unsupported.',
      fieldPath: 'payload.free.calculationVersion',
    };
  }
  const topConfigFailure = inspectLegacyConfigSnapshotVersion(
    free.config,
    'payload.free.config',
    true,
  );
  if (topConfigFailure !== null) return topConfigFailure;
  const parameterDraftFailure = inspectLegacyParameterDraft(
    free.parameterDraft,
  );
  if (parameterDraftFailure !== null) return parameterDraftFailure;
  const topActiveConfigFailure = inspectLegacyConfigSnapshotVersion(
    free.activeRunConfigSnapshot,
    'payload.free.activeRunConfigSnapshot',
    false,
  );
  if (topActiveConfigFailure !== null) return topActiveConfigFailure;
  const domains = [free.real, free.ideal].filter(
    isPlainPersistenceRecord,
  );
  for (const [domainIndex, domain] of domains.entries()) {
    const activeConfigFailure = inspectLegacyConfigSnapshotVersion(
      domain.activeRunConfigSnapshot,
      `payload.free.domains[${domainIndex}].activeRunConfigSnapshot`,
      false,
    );
    if (activeConfigFailure !== null) return activeConfigFailure;
    const batch = isPlainPersistenceRecord(domain.batch)
      ? domain.batch
      : null;
    const frozenConfigFailure = inspectLegacyConfigSnapshotVersion(
      batch?.frozenConfigSnapshot,
      `payload.free.domains[${domainIndex}].batch.frozenConfigSnapshot`,
      false,
    );
    if (frozenConfigFailure !== null) return frozenConfigFailure;
  }
  if (domains.length === 0) {
    if (
      !hasOnlyKnownOwnKeys(free, KNOWN_FREE_PERSISTENCE_KEYS) ||
      !Array.isArray(free.trials) ||
      free.trials.length > 0 ||
      !hasCanonicalEmptyTraceStore(free.traceStore) ||
      !hasIdleFreeControls(free.controls) ||
      !hasNoFreeRunAuthority(free) ||
      !hasNoPersistedFreeModeSessionAuthority(prepared.payload)
    ) {
      return {
        ok: false,
        status: 'quarantined',
        category: 'relationship',
        code: 'legacy-unbatched-free-authority-requires-dedicated-migration',
        reason:
          'Legacy top-level-only Free authority cannot be assigned to a synthetic batch without an explicit historical relationship migration.',
        fieldPath: 'payload.free',
      };
    }
    if (traceVersion === LEGACY_HEAT_CAPACITY_FREE_TRACE_VERSION) {
      free.traceVersion = HEAT_CAPACITY_FREE_TRACE_VERSION;
    }
    return {
      ok: true,
      envelope: prepared,
      topLevelOnly: true,
    };
  }
  const missingBatchDomains = domains.filter((domain) => (
    domain.batch === undefined
  ));
  if (missingBatchDomains.length === 0) {
    return {
      ok: true,
      envelope: prepared,
      topLevelOnly: false,
    };
  }
  const hasUnknownPreBatchOwnKeys =
    !hasOnlyKnownOwnKeys(free, KNOWN_FREE_PERSISTENCE_KEYS) ||
    domains.some((domain) => (
      !hasOnlyKnownOwnKeys(domain, KNOWN_FREE_DOMAIN_PERSISTENCE_KEYS)
    ));
  const hasUnbatchedTrials = missingBatchDomains.some((domain) => (
    !Array.isArray(domain.trials) || domain.trials.length > 0
  )) || (
    Array.isArray(free.trials) && free.trials.length > 0
  );
  const hasUnbatchedTraceOrAttemptAuthority = missingBatchDomains.some(
    (domain) => (
      !hasCanonicalEmptyTraceStore(domain.traceStore) ||
      !hasNoFreeRunAuthority(domain)
    ),
  ) ||
    !hasCanonicalEmptyTraceStore(free.traceStore) ||
    !hasIdleFreeControls(free.controls) ||
    !hasNoFreeRunAuthority(free) ||
    !hasNoPersistedFreeModeSessionAuthority(prepared.payload);
  if (
    hasUnknownPreBatchOwnKeys ||
    hasUnbatchedTrials ||
    hasUnbatchedTraceOrAttemptAuthority
  ) {
    return {
      ok: false,
      status: 'quarantined',
      category: 'relationship',
      code: 'legacy-unbatched-free-authority-requires-dedicated-migration',
      reason:
        'Legacy unbatched Free authority cannot be assigned to a synthetic batch without an explicit historical relationship migration.',
      fieldPath: 'payload.free',
    };
  }
  if (traceVersion === LEGACY_HEAT_CAPACITY_FREE_TRACE_VERSION) {
    free.traceVersion = HEAT_CAPACITY_FREE_TRACE_VERSION;
  }
  for (const domain of missingBatchDomains) {
    domain.batch = createEmptyHeatCapacityFreeBatchState();
  }
  return {
    ok: true,
    envelope: prepared,
    topLevelOnly: false,
  };
};

const seedPublicBlankDemoModeSession = (
  file: WorkbenchHeatCapacityState,
  capturedAtMs: number,
) => {
  if (
    file.heatCapacityMode !== 'demo' ||
    file.heatCapacityModeSessions.demo.status !== 'empty'
  ) {
    return file;
  }
  const projection = mergeHeatCapacityGuideRuntimeState(
    {
      ...file,
      heatCapacityMode: 'demo',
      heatCapacityTeachingStatus: 'running',
      runState: 'paused',
      pumpBulbState: 'idle',
      pressureZeroed: false,
      pressureZeroAdjusted: false,
      displayResponseLastUpdateMs: null,
    },
    file.heatCapacityGuidePhysicsState,
    file.heatCapacityGuideWorkflow,
    capturedAtMs,
  );
  return suspendHeatCapacityModeSession(
    projection,
    null,
    capturedAtMs,
  );
};

const hasLegacyHeatActiveDomainParity = (
  free: Record<string, unknown>,
  activeDomain: Record<string, unknown>,
  mode: WorkbenchHeatCapacityState['heatCapacityMode'],
) => {
  const pairs = [
    ['gasType', 'gasType'],
    ['experimentGroupStatus', 'experimentGroupStatus'],
    ['activeRunConfigSnapshot', 'activeRunConfigSnapshot'],
    ['recordConfig', 'recordConfig'],
    ['pressureWarningMv', 'pressureWarningMv'],
    ['instrumentNoiseEnabled', 'instrumentNoiseEnabled'],
    ['runtime', 'physicsState'],
    ['sensor', 'sensorState'],
    ['calibration', 'calibrationState'],
    ['rollbackSnapshots', 'rollbackSnapshots'],
    ['traceStore', 'traceStore'],
    ['trials', 'trials'],
  ] as const;
  if (
    !pairs.every(([freeKey, domainKey]) => (
      !Object.prototype.hasOwnProperty.call(free, freeKey) ||
      (
        Object.prototype.hasOwnProperty.call(activeDomain, domainKey) &&
        areHeatCapacityPersistenceValuesEqual(
          free[freeKey],
          activeDomain[domainKey],
        )
      )
    ))
  ) {
    return false;
  }
  const controls = isPlainPersistenceRecord(free.controls)
    ? free.controls
    : null;
  return mode !== 'free' ||
    controls === null ||
    !Object.prototype.hasOwnProperty.call(controls, 'releaseState') ||
    (
      Object.prototype.hasOwnProperty.call(activeDomain, 'releaseState') &&
      areHeatCapacityPersistenceValuesEqual(
        controls.releaseState,
        activeDomain.releaseState,
      )
    );
};

const restoreLegacyHeatCapacityEnvelope = (
  envelope: LegacyWorkbenchExperimentFileEnvelope & {
    kind: 'heatCapacity';
  },
  index: number,
  sourceAppVersion?: string,
): WorkbenchPersistenceV3DecodeResult<WorkbenchFileState> => {
  const prepared = prepareLegacyHeatCapacityEnvelope(envelope);
  const fail = (
    status: 'unsupported-future' | 'quarantined',
    category:
      | 'schema-version'
      | 'schema-shape'
      | 'relationship'
      | 'authoritative-data'
      | 'unsupported-future',
    code: string,
    message: string,
    fieldPath: string,
    sourceVersion?: number,
    supportedVersion?: number,
  ) => createWorkbenchPersistenceV3Failure(status, envelope, [
    createWorkbenchPersistenceV3Diagnostic({
      severity: 'error',
      phase: 'migration',
      category,
      code,
      message,
      aggregate: {
        kind: 'heat-capacity-document',
        id: envelope.id,
        fileId: envelope.id,
        fileKind: envelope.kind,
      },
      retry: status === 'unsupported-future' ? 'manual' : 'never',
      recovery: 'quarantine-file',
      fieldPath,
      sourceVersion,
      supportedVersion,
    }),
  ]);
  if (prepared.ok === false) {
    return fail(
      prepared.status,
      prepared.category,
      prepared.code,
      prepared.reason,
      prepared.fieldPath,
      prepared.sourceVersion,
      prepared.supportedVersion,
    );
  }
  const payload = prepared.envelope.payload;
  if (
    !hasExactOwnKeys(
      payload,
      LEGACY_PAYLOAD_KEYS_BY_KIND.heatCapacity,
    )
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-file-payload-own-keys-invalid',
      'The legacy file payload contains unknown or missing top-level fields.',
      'payload',
    );
  }
  const common = isPlainPersistenceRecord(payload.common)
    ? payload.common
    : null;
  const free = isPlainPersistenceRecord(payload.free)
    ? payload.free
    : null;
  const guided = isPlainPersistenceRecord(payload.guided)
    ? payload.guided
    : null;
  const publicBlankDemoOmission =
    sourceAppVersion === 'development' &&
    payload.mode === 'demo' &&
    payload.guided === null &&
    common !== null &&
    hasExactOwnKeys(common, CURRENT_HEAT_CAPACITY_COMMON_KEYS);
  if (
    common === null ||
    !(
      hasExactOwnKeys(common, CURRENT_HEAT_CAPACITY_COMMON_KEYS) ||
      hasExactOwnKeys(common, LEGACY_423_HEAT_CAPACITY_COMMON_KEYS) ||
      hasExactOwnKeys(common, LEGACY_416_HEAT_CAPACITY_COMMON_KEYS)
    )
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-heat-capacity-common-own-keys-invalid',
      'The legacy heat-capacity common payload contains unknown or missing fields.',
      'payload.common',
    );
  }
  if (
    payload.experimentKind !== 'heatCapacity' ||
    !(
      payload.mode === 'demo' ||
      payload.mode === 'guide' ||
      payload.mode === 'free'
    ) ||
    common === null ||
    payload.demo !== null
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-heat-capacity-payload-values-invalid',
      'The legacy heat-capacity payload values are invalid.',
      'payload',
    );
  }
  if (
    typeof common.materialsExpanded !== 'boolean' ||
    !(
      common.teachingStatus === 'idle' ||
      common.teachingStatus === 'running' ||
      common.teachingStatus === 'completed'
    ) ||
    !Array.isArray(common.openHeatCapacityTabs) ||
    new Set(common.openHeatCapacityTabs).size !==
      common.openHeatCapacityTabs.length ||
    !common.openHeatCapacityTabs.every((tab) => (
      tab === 'guide' ||
      tab === 'records' ||
      tab === 'review'
    )) ||
    !(
      common.activeHeatCapacityTabId === null ||
      (
        (
          common.activeHeatCapacityTabId === 'guide' ||
          common.activeHeatCapacityTabId === 'records' ||
          common.activeHeatCapacityTabId === 'review'
        ) &&
        common.openHeatCapacityTabs.includes(
          common.activeHeatCapacityTabId,
        )
      )
    )
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-heat-capacity-common-values-invalid',
      'The legacy heat-capacity common values are invalid.',
      'payload.common',
    );
  }
  if (
    guided !== null &&
    !hasExactOwnKeys(guided, [
      'physicsConfig',
      'physicsState',
      'temperatureSensorState',
      'workflow',
      'trial',
      'calculationSession',
    ])
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-heat-capacity-guide-own-keys-invalid',
      'The legacy heat-capacity guide payload contains unknown or missing fields.',
      'payload.guided',
    );
  }
  if (
    (payload.mode === 'guide' || payload.mode === 'demo') &&
    guided === null &&
    !publicBlankDemoOmission
  ) {
    return fail(
      'quarantined',
      'relationship',
      'legacy-heat-capacity-guide-authority-missing',
      'Guide or Demo mode requires an explicit guide authority payload.',
      'payload.guided',
    );
  }
  if (
    free !== null &&
    !hasOnlyKnownOwnKeys(free, KNOWN_FREE_PERSISTENCE_KEYS)
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-heat-capacity-free-own-keys-invalid',
      'The legacy Free payload contains unknown fields.',
      'payload.free',
    );
  }
  if (
    free !== null &&
    isPlainPersistenceRecord(free.uiReplay) &&
    !hasOnlyKnownOwnKeys(free.uiReplay, KNOWN_FREE_UI_REPLAY_KEYS)
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-heat-capacity-ui-replay-own-keys-invalid',
      'The legacy Free UI replay contains unknown fields.',
      'payload.free.uiReplay',
    );
  }

  const fallback = createDefaultHeatCapacityFile(index);
  const hasRealDomain = isPlainPersistenceRecord(free?.real);
  const hasIdealDomain = isPlainPersistenceRecord(free?.ideal);
  if (hasRealDomain !== hasIdealDomain) {
    return fail(
      'quarantined',
      'relationship',
      'legacy-heat-capacity-domain-pair-incomplete',
      'The legacy Free real and ideal domains must be present together.',
      'payload.free',
    );
  }
  if (hasRealDomain && hasIdealDomain && free !== null) {
    const sourceActiveDomain = (
      free.parameterScheme === 'ideal' ? free.ideal : free.real
    ) as Record<string, unknown>;
    if (
      !hasLegacyHeatActiveDomainParity(
        free,
        sourceActiveDomain,
        payload.mode,
      )
    ) {
      return fail(
        'quarantined',
        'relationship',
        'legacy-heat-capacity-active-domain-parity-invalid',
        'The legacy Free active projection conflicts with its durable domain.',
        'payload.free',
      );
    }
  }
  const restoredGasType = free?.gasType === 'helium' ? 'helium' : 'air';
  let realDomain = fallback.heatCapacityFreeRealDomain;
  let idealDomain = fallback.heatCapacityFreeIdealDomain;
  if (hasRealDomain && hasIdealDomain) {
    const real = decodeHeatCapacityFreeExperimentDomainAggregate(
      free!.real,
      'real',
      restoredGasType,
      fallback.heatCapacityFreeRealDomain,
    );
    if (real.ok === false) {
      return fail(
        real.status,
        real.status === 'unsupported-future'
          ? 'unsupported-future'
          : 'relationship',
        'legacy-heat-capacity-real-domain-invalid',
        real.reason,
        real.fieldPath
          ? `payload.free.real.${real.fieldPath}`
          : 'payload.free.real',
        typeof real.sourceVersion === 'number'
          ? real.sourceVersion
          : undefined,
      );
    }
    const ideal = decodeHeatCapacityFreeExperimentDomainAggregate(
      free!.ideal,
      'ideal',
      'air',
      fallback.heatCapacityFreeIdealDomain,
    );
    if (ideal.ok === false) {
      return fail(
        ideal.status,
        ideal.status === 'unsupported-future'
          ? 'unsupported-future'
          : 'relationship',
        'legacy-heat-capacity-ideal-domain-invalid',
        ideal.reason,
        ideal.fieldPath
          ? `payload.free.ideal.${ideal.fieldPath}`
          : 'payload.free.ideal',
        typeof ideal.sourceVersion === 'number'
          ? ideal.sourceVersion
          : undefined,
      );
    }
    realDomain = real.value;
    idealDomain = ideal.value;
  } else if (prepared.topLevelOnly && free !== null) {
    realDomain = {
      ...fallback.heatCapacityFreeRealDomain,
      batch: createEmptyHeatCapacityFreeBatchState(),
      traceStore: cloneLegacyPersistenceValue(
        free.traceStore,
      ) as WorkbenchHeatCapacityState['heatCapacityFreeTraceStore'],
    };
  }

  const parameterScheme = free?.parameterScheme === 'ideal'
    ? 'ideal'
    : 'real';
  const displayScheme = free?.displayScheme === 'ideal'
    ? 'ideal'
    : parameterScheme;
  const activeDomain = parameterScheme === 'ideal'
    ? idealDomain
    : realDomain;
  const withActiveDomain = applyHeatCapacityFreeDomainToRuntimeFields(
    {
      ...fallback,
      heatCapacityFreeParameterScheme: parameterScheme,
      heatCapacityFreeDisplayScheme: displayScheme,
      heatCapacityFreeRealDomain: realDomain,
      heatCapacityFreeIdealDomain: idealDomain,
    },
    activeDomain,
  );
  const uiReplay = isPlainPersistenceRecord(free?.uiReplay)
    ? cloneLegacyPersistenceValue(free.uiReplay)
    : {};
  const controls = isPlainPersistenceRecord(free?.controls)
    ? free.controls
    : {};
  const modeSessions = isPlainPersistenceRecord(common.modeSessions)
    ? cloneLegacyPersistenceValue(common.modeSessions)
    : fallback.heatCapacityModeSessions;
  const guideFields = guided === null
    ? {}
    : {
        heatCapacityGuidePhysicsConfig: cloneLegacyPersistenceValue(
          guided.physicsConfig,
        ),
        heatCapacityGuidePhysicsState: cloneLegacyPersistenceValue(
          guided.physicsState,
        ),
        heatCapacityGuideTemperatureSensorState:
          cloneLegacyPersistenceValue(guided.temperatureSensorState),
        heatCapacityGuideWorkflow: cloneLegacyPersistenceValue(
          guided.workflow,
        ),
        heatCapacityGuideTrial: cloneLegacyPersistenceValue(guided.trial),
        heatCapacityGuideCalculationSession: cloneLegacyPersistenceValue(
          guided.calculationSession,
        ),
      };
  const restored = {
    ...withActiveDomain,
    ...uiReplay,
    ...guideFields,
    id: prepared.envelope.id,
    name: prepared.envelope.name,
    createdAt: prepared.envelope.createdAt,
    updatedAt: prepared.envelope.updatedAt,
    lastOpenedAt:
      prepared.envelope.lastOpenedAt ?? prepared.envelope.updatedAt,
    visiblePanels: cloneLegacyPersistenceValue(
      prepared.envelope.layout.visiblePanels,
    ),
    liveWorkspaceSplitRatio:
      prepared.envelope.layout.liveWorkspaceSplitRatio,
    heatCapacityMode: payload.mode,
    heatCapacityModeSessions: modeSessions,
    heatCapacityMaterialsExpanded: common.materialsExpanded,
    heatCapacityTeachingStatus: common.teachingStatus,
    heatCapacityExperimentSeed:
      common.experimentSeed ?? fallback.heatCapacityExperimentSeed,
    heatCapacityExperimentProfile:
      common.experimentProfile ?? fallback.heatCapacityExperimentProfile,
    heatCapacityLessonIntroAutoShown:
      typeof common.lessonIntroAutoShown === 'boolean'
        ? common.lessonIntroAutoShown
        : fallback.heatCapacityLessonIntroAutoShown,
    openHeatCapacityTabs: cloneLegacyPersistenceValue(
      common.openHeatCapacityTabs,
    ),
    activeHeatCapacityTabId: common.activeHeatCapacityTabId,
    heatCapacityFreeRuntimeVersion:
      free?.runtimeVersion ?? HEAT_CAPACITY_FREE_RUNTIME_VERSION,
    heatCapacityFreeTraceVersion:
      free?.traceVersion ?? HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreePreheatCompleted:
      free !== null &&
      Object.prototype.hasOwnProperty.call(free, 'preheatCompleted')
        ? free.preheatCompleted === true
        : true,
    heatCapacityFreeParameterScheme: parameterScheme,
    heatCapacityFreeDisplayScheme: displayScheme,
    heatCapacityFreeGasType: restoredGasType,
    heatCapacityFreeRealDomain: realDomain,
    heatCapacityFreeIdealDomain: idealDomain,
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'parameterDraft')
      ? {
          heatCapacityFreeParameterDraft:
            cloneLegacyPersistenceValue(free.parameterDraft),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'experimentGroupStatus')
      ? {
          heatCapacityFreeExperimentGroupStatus:
            free.experimentGroupStatus,
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'activeRunConfigSnapshot')
      ? {
          heatCapacityFreeActiveRunConfigSnapshot:
            cloneLegacyPersistenceValue(free.activeRunConfigSnapshot),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'acknowledgements')
      ? {
          heatCapacityFreeFileAcknowledgements:
            cloneLegacyPersistenceValue(free.acknowledgements),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'recordConfig')
      ? {
          heatCapacityFreeRecordConfig:
            cloneLegacyPersistenceValue(free.recordConfig),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'pressureWarningMv')
      ? { heatCapacityFreePressureWarningMv: free.pressureWarningMv }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'instrumentNoiseEnabled')
      ? {
          heatCapacityFreeInstrumentNoiseEnabled:
            free.instrumentNoiseEnabled,
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'runtime')
      ? {
          heatCapacityFreePhysicsState:
            cloneLegacyPersistenceValue(free.runtime),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'sensor')
      ? {
          heatCapacityFreeSensorState:
            cloneLegacyPersistenceValue(free.sensor),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'calibration')
      ? {
          heatCapacityFreeCalibrationState:
            cloneLegacyPersistenceValue(free.calibration),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'rollbackSnapshots')
      ? {
          heatCapacityFreeRollbackSnapshots:
            cloneLegacyPersistenceValue(free.rollbackSnapshots),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'traceStore')
      ? {
          heatCapacityFreeTraceStore:
            cloneLegacyPersistenceValue(free.traceStore),
        }
      : {}),
    ...(free !== null &&
        Object.prototype.hasOwnProperty.call(free, 'trials')
      ? {
          heatCapacityFreeTrials:
            cloneLegacyPersistenceValue(free.trials),
        }
      : {}),
    powerOn: controls.powerOn === true,
    pumpValveOpen: controls.pumpValveOpen === true,
    pumpValveState: controls.pumpValveOpen === true ? 'open' : 'closed',
    glassPistonState: controls.stopcockOpen === true ? 'open' : 'closed',
    stopcockAngleDeg: controls.stopcockOpen === true ? 90 : 0,
    pumpBulbState:
      controls.pumpBulbState === 'compressing' ||
        controls.pumpBulbState === 'releasing'
        ? controls.pumpBulbState
        : 'idle',
    ...(Object.prototype.hasOwnProperty.call(controls, 'releaseState')
      ? {
          heatCapacityReleaseState:
            cloneLegacyPersistenceValue(controls.releaseState),
        }
      : {}),
  } as unknown as WorkbenchHeatCapacityState;
  if (
    restored.kind !== 'heatCapacity' ||
    restored.id !== prepared.envelope.id
  ) {
    return fail(
      'quarantined',
      'relationship',
      'legacy-heat-capacity-migration-identity-invalid',
      'The rebuilt heat-capacity file identity is invalid.',
      'id',
    );
  }
  return createWorkbenchPersistenceV3Success(
    'migrated',
    publicBlankDemoOmission
      ? seedPublicBlankDemoModeSession(
          restored,
          prepared.envelope.updatedAt,
        )
      : restored,
  );
};

export interface LegacyWorkbenchFileDecodeOptions {
  sourceAppVersion?: string;
}

export const decodeLegacyWorkbenchFileEnvelopeToV3Projection = (
  raw: unknown,
  index = 1,
  options: LegacyWorkbenchFileDecodeOptions = {},
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3FileProjection> => {
  const rawRecord = isPlainPersistenceRecord(raw) ? raw : null;
  const fileId = rawRecord && typeof rawRecord.id === 'string'
    ? rawRecord.id
    : 'unknown';
  const fileKind = rawRecord && isWorkbenchFileKind(rawRecord.kind)
    ? rawRecord.kind
    : undefined;
  const aggregate = fileKind
    ? {
        kind: getWorkbenchPersistenceV3AggregateKindForFileKind(fileKind),
        id: fileId,
        fileId,
        fileKind,
      }
    : {
        kind: 'file-header' as const,
        id: fileId,
        fileId,
      };
  const fail = (
    status: 'unsupported-future' | 'quarantined',
    category: 'schema-version' | 'schema-shape' | 'unsupported-future',
    code: string,
    message: string,
    fieldPath: string,
    sourceVersion?: number,
  ) => createWorkbenchPersistenceV3Failure(status, raw, [
    createWorkbenchPersistenceV3Diagnostic({
      severity: 'error',
      phase: 'migration',
      category,
      code,
      message,
      aggregate,
      retry: status === 'unsupported-future' ? 'manual' : 'never',
      recovery: 'quarantine-file',
      fieldPath,
      sourceVersion,
      supportedVersion: WORKBENCH_FILE_SCHEMA_VERSION,
    }),
  ]);

  if (rawRecord === null) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-file-envelope-not-object',
      'The legacy file envelope must be a plain object.',
      '$',
    );
  }
  if (rawRecord.schemaFamily !== WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-file-envelope-family-invalid',
      'The legacy file envelope schema family is invalid.',
      'schemaFamily',
    );
  }
  const sourceVersion = rawRecord.fileSchemaVersion;
  if (!Number.isInteger(sourceVersion) || (sourceVersion as number) < 1) {
    return fail(
      'quarantined',
      'schema-version',
      'legacy-file-envelope-version-missing-or-invalid',
      'The legacy file envelope version is missing or invalid.',
      'fileSchemaVersion',
    );
  }
  if ((sourceVersion as number) > WORKBENCH_FILE_SCHEMA_VERSION) {
    return fail(
      'unsupported-future',
      'unsupported-future',
      'legacy-file-envelope-version-future',
      'The legacy file envelope requires a newer application.',
      'fileSchemaVersion',
      sourceVersion as number,
    );
  }
  if (
    !(
      hasExactOwnKeys(rawRecord, LEGACY_FILE_ENVELOPE_KEYS) ||
      hasExactOwnKeys(
        rawRecord,
        LEGACY_FILE_ENVELOPE_KEYS_WITHOUT_LAST_OPENED,
      )
    )
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-file-envelope-own-keys-invalid',
      'The legacy file envelope contains unknown or missing fields.',
      '$',
    );
  }
  if (
    fileKind === undefined ||
    fileId === 'unknown' ||
    fileId.trim().length === 0 ||
    typeof rawRecord.name !== 'string' ||
    rawRecord.name.trim().length === 0 ||
    typeof rawRecord.createdAt !== 'number' ||
    !Number.isFinite(rawRecord.createdAt) ||
    typeof rawRecord.updatedAt !== 'number' ||
    !Number.isFinite(rawRecord.updatedAt) ||
    (
      rawRecord.lastOpenedAt !== undefined &&
      (
        typeof rawRecord.lastOpenedAt !== 'number' ||
        !Number.isFinite(rawRecord.lastOpenedAt)
      )
    ) ||
    !isPlainPersistenceRecord(rawRecord.layout) ||
    !isPlainPersistenceRecord(rawRecord.payload)
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-file-envelope-shape-invalid',
      'The legacy file envelope shape is invalid.',
      '$',
    );
  }
  if (
    !hasExactOwnKeys(
      rawRecord.layout as Record<string, unknown>,
      LEGACY_FILE_LAYOUT_KEYS_BY_KIND[fileKind],
    )
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-file-layout-own-keys-invalid',
      'The legacy file layout contains unknown or missing fields.',
      'layout',
    );
  }
  if (
    !hasValidLegacyFileLayoutShape(
      rawRecord.layout as Record<string, unknown>,
      fileKind,
    )
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-file-layout-shape-invalid',
      'The legacy file layout values are invalid.',
      'layout',
    );
  }
  const payloadRecord = rawRecord.payload as Record<string, unknown>;
  const payloadVersion = LEGACY_PAYLOAD_VERSION_BY_KIND[fileKind];
  const payloadSourceVersion = payloadRecord[payloadVersion.key];
  if (
    !Number.isInteger(payloadSourceVersion) ||
    (payloadSourceVersion as number) < 1
  ) {
    return fail(
      'quarantined',
      'schema-version',
      'legacy-file-payload-version-missing-or-invalid',
      'The legacy file payload version is missing or invalid.',
      `payload.${payloadVersion.key}`,
    );
  }
  const hasUnsupportedFuturePayloadVersion =
    (payloadSourceVersion as number) > payloadVersion.current;
  if (hasUnsupportedFuturePayloadVersion) {
    return fail(
      'unsupported-future',
      'unsupported-future',
      fileKind === 'heatCapacity'
        ? 'legacy-heat-capacity-schema-version-future'
        : 'unsupported-future-payload-version',
      `The ${fileKind} payload requires a newer application version.`,
      `payload.${payloadVersion.key}`,
      payloadSourceVersion as number,
    );
  }
  if (!payloadVersion.supported.has(payloadSourceVersion as number)) {
    return fail(
      'quarantined',
      'schema-version',
      'legacy-file-payload-version-unsupported',
      `The ${fileKind} payload version is unsupported.`,
      `payload.${payloadVersion.key}`,
      payloadSourceVersion as number,
    );
  }
  if (
    fileKind !== 'heatCapacity' &&
    !hasExactOwnKeys(
      payloadRecord,
      LEGACY_PAYLOAD_KEYS_BY_KIND[fileKind],
    )
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-file-payload-own-keys-invalid',
      'The legacy file payload contains unknown or missing top-level fields.',
      'payload',
    );
  }
  if (
    fileKind === 'standard' &&
    !hasValidLegacyStandardPayloadRecursiveShape(payloadRecord)
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-standard-payload-recursive-shape-invalid',
      'The legacy Standard payload contains an unsupported nested shape.',
      'payload',
    );
  }
  if (
    fileKind === 'ideal' &&
    !hasValidLegacyIdealPayloadRecursiveShape(payloadRecord)
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-ideal-payload-recursive-shape-invalid',
      'The legacy Ideal payload contains an unsupported nested shape.',
      'payload',
    );
  }
  if (
    fileKind === 'heatCapacityPistonOscillation' &&
    !hasValidLegacyPistonPayloadRecursiveShape(payloadRecord)
  ) {
    return fail(
      'quarantined',
      'schema-shape',
      'legacy-piston-payload-recursive-shape-invalid',
      'The legacy piston-oscillation payload contains an unsupported nested shape.',
      'payload',
    );
  }
  const envelope =
    rawRecord as unknown as LegacyWorkbenchExperimentFileEnvelope;
  let decoded: WorkbenchPersistenceV3DecodeResult<WorkbenchFileState>;
  switch (envelope.kind) {
    case 'standard': {
      const rebuilt = rebuildLegacyStandardFile(
        envelope as LegacyWorkbenchExperimentFileEnvelope & {
          kind: 'standard';
        },
        index,
      );
      decoded = rebuilt === null
        ? createWorkbenchPersistenceV3Failure('quarantined', raw, [
            createWorkbenchPersistenceV3Diagnostic({
              severity: 'error',
              phase: 'migration',
              category: 'authoritative-data',
              code: 'legacy-standard-pure-rebuild-failed',
              message:
                'The Standard payload could not be rebuilt without changing authority.',
              aggregate,
              retry: 'never',
              recovery: 'quarantine-file',
              fieldPath: 'payload.runtime.engineSnapshot',
            }),
          ])
        : createWorkbenchPersistenceV3Success('migrated', rebuilt);
      break;
    }
    case 'ideal': {
      const rebuilt = rebuildLegacyIdealFile(
        envelope as LegacyWorkbenchExperimentFileEnvelope & {
          kind: 'ideal';
        },
        index,
      );
      decoded = rebuilt === null
        ? createWorkbenchPersistenceV3Failure('quarantined', raw, [
            createWorkbenchPersistenceV3Diagnostic({
              severity: 'error',
              phase: 'migration',
              category: 'authoritative-data',
              code: 'legacy-ideal-pure-rebuild-failed',
              message:
                'The Ideal payload could not be rebuilt without changing authority.',
              aggregate,
              retry: 'never',
              recovery: 'quarantine-file',
              fieldPath: 'payload.runtime.engineSnapshot',
            }),
          ])
        : createWorkbenchPersistenceV3Success('migrated', rebuilt);
      break;
    }
    case 'heatCapacity':
      decoded = restoreLegacyHeatCapacityEnvelope(
        envelope as LegacyWorkbenchExperimentFileEnvelope & {
          kind: 'heatCapacity';
        },
        index,
        options.sourceAppVersion,
      );
      break;
    case 'heatCapacityPistonOscillation':
      decoded = createWorkbenchPersistenceV3Success(
        'migrated',
        rebuildLegacyPistonFile(
          envelope as LegacyWorkbenchExperimentFileEnvelope & {
            kind: 'heatCapacityPistonOscillation';
          },
          index,
        ),
      );
      break;
    default:
      return assertNeverWorkbenchFileKind(envelope.kind);
  }
  if (decoded.ok === false) {
    return createWorkbenchPersistenceV3Failure(
      decoded.status,
      raw,
      decoded.diagnostics,
    );
  }
  const projected = projectWorkbenchPersistenceV3File(decoded.value, index);
  if (projected.ok === false) {
    return createWorkbenchPersistenceV3Failure(
      projected.status,
      raw,
      projected.diagnostics,
    );
  }
  if (projected.value.fileKind === 'heatCapacity') {
    const decodedHeatAuthority = decodeHeatCapacityV3AuthorityValues(
      projected.value.fields.authoritative.activeRuntime,
      projected.value.fields.authoritative.guide,
      projected.value.fields.relation.heatCapacityMode as
        WorkbenchHeatCapacityState['heatCapacityMode'],
    );
    if (decodedHeatAuthority.ok === false) {
      return createWorkbenchPersistenceV3Failure('quarantined', raw, [
        createWorkbenchPersistenceV3Diagnostic({
          severity: 'error',
          phase: 'migration',
          category: 'authoritative-data',
          code: 'legacy-heat-capacity-authority-value-invalid',
          message: decodedHeatAuthority.reason,
          aggregate,
          retry: 'never',
          recovery: 'quarantine-file',
          fieldPath: decodedHeatAuthority.fieldPath,
        }),
      ]);
    }
  }
  const migrationDiagnostic = createWorkbenchPersistenceV3Diagnostic({
    severity: 'info',
    phase: 'migration',
    category: 'schema-version',
    code: 'legacy-file-envelope-migrated-to-v3',
    message: 'The legacy file envelope was migrated to an independent V3 projection.',
    aggregate: {
      kind: projected.value.aggregateKind,
      id: projected.value.fileId,
      fileId: projected.value.fileId,
      fileKind: projected.value.fileKind,
    },
    retry: 'never',
    recovery: 'none',
    sourceVersion: sourceVersion as number,
    supportedVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  });
  return createWorkbenchPersistenceV3Success(
    'migrated',
    projected.value,
    [
      ...decoded.diagnostics,
      ...projected.diagnostics,
      migrationDiagnostic,
    ],
  );
};
