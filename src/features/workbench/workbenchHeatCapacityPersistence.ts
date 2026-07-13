import type {
  HeatCapacityFreePhysicsConfig,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
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
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  type HeatCapacityFreeConfigSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityFreeExperimentDomainState,
  getHeatCapacityStopcockTargetAngle,
  hasHeatCapacityFreeIdealThermalBoundaryContamination,
  normalizeHeatCapacityFreeFileAcknowledgements,
  normalizeHeatCapacityFreeExperimentDomainBoundary,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  type HeatCapacityFreeExperimentDomainState,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import {
  createHeatCapacityFreeParameterDraftFromConfigs,
  getHeatCapacityFreeGasTypeGamma,
  normalizeHeatCapacityFreeGasType,
  normalizeHeatCapacityFreeParameterDraft,
  resolveHeatCapacityFreeGasTypeFromGamma,
  type HeatCapacityFreeGasType,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import type {
  WorkbenchExperimentFileEnvelopeV1,
} from './workbenchPersistenceSchema.ts';
import {
  clonePersistenceValue,
  isPersistenceFiniteNumber as isFiniteNumber,
  isPersistenceRecord as isRecord,
} from './workbenchPersistenceValue.ts';
import {
  heatCapacityRestoreFiniteOrDefault as finiteOrDefault,
  normalizeHeatCapacityFreeRestoreConfigSnapshot,
  normalizeHeatCapacityFreeRestoreDisplayScheme,
  normalizeHeatCapacityFreeRestoreExperimentDomain,
  normalizeHeatCapacityFreeRestoreExperimentGroupStatus,
  normalizeHeatCapacityFreeRestoreParameterScheme,
  normalizeHeatCapacityFreeRestoreTrial,
  normalizeHeatCapacityFreeRestoreRecordConfig,
} from './workbenchHeatCapacityFreeRestoreNormalization.ts';
import {
  createClosedHeatCapacityReleaseState,
  normalizeHeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  HEAT_CAPACITY_SCHEMA_VERSION,
  createHeatCapacityFreeUiReplay,
  normalizeHeatCapacityFreeUiReplay,
  type HeatCapacityFreePersistenceDataV1,
  type HeatCapacityPersistencePayloadV1,
} from './workbenchHeatCapacityPersistenceContract.ts';
import {
  createHeatCapacityGuidePersistenceData,
  normalizeHeatCapacityPersistenceEquilibriumSpeed,
  restoreHeatCapacityGuidePersistenceFields,
} from './workbenchHeatCapacityGuidePersistence.ts';
import {
  createHeatCapacityFreeConfigSnapshotFromFile,
} from './workbenchHeatCapacityFreeConfigSnapshot.ts';
import {
  normalizeHeatCapacityFreePhysicsConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import {
  isWorkbenchHeatCapacityTabId,
  normalizeWorkbenchHeatCapacityTabIds,
} from './workbenchHeatCapacityTabRegistry.ts';
import {
  normalizeHeatCapacitySessionRuntimeState,
} from './workbenchHeatCapacitySessionRestore.ts';
import {
  normalizeHeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';

export {
  HEAT_CAPACITY_PROCESS_SCORING_VERSION,
} from './workbenchHeatCapacityFreeRestoreNormalization.ts';
export {
  HEAT_CAPACITY_SCHEMA_VERSION,
  validateHeatCapacityPersistencePayload,
} from './workbenchHeatCapacityPersistenceContract.ts';
export type {
  HeatCapacityFreePersistenceDataV1,
  HeatCapacityFreeUiReplayV1,
  HeatCapacityGuidePersistenceDataV1,
  HeatCapacityPayloadValidationResult,
  HeatCapacityPersistencePayloadV1,
} from './workbenchHeatCapacityPersistenceContract.ts';
export {
  createHeatCapacityFreeConfigSnapshotFromFile,
} from './workbenchHeatCapacityFreeConfigSnapshot.ts';

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
      teachingStatus: file.heatCapacityTeachingStatus,
      openHeatCapacityTabs: clonePersistenceValue(file.openHeatCapacityTabs),
      activeHeatCapacityTabId: file.activeHeatCapacityTabId,
      experimentSeed: file.heatCapacityExperimentSeed,
      experimentProfile: clonePersistenceValue(file.heatCapacityExperimentProfile),
      lessonIntroAutoShown: file.heatCapacityLessonIntroAutoShown,
    },
    free: {
      runtimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
      traceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
      calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
      preheatCompleted: fileWithCurrentDomain.heatCapacityFreePreheatCompleted,
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
        releaseState: clonePersistenceValue(fileWithCurrentDomain.heatCapacityReleaseState),
      },
      sensor: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeSensorState),
      calibration: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeCalibrationState),
      rollbackSnapshots: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeRollbackSnapshots),
      traceStore: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeTraceStore),
      trials: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeTrials),
      uiReplay: createHeatCapacityFreeUiReplay(fileWithCurrentDomain),
    },
    guided: createHeatCapacityGuidePersistenceData(file),
    demo: null,
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
  pumpWorkRetention: snapshot.physics.pumpWorkRetention,
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
  const gasTypeGamma = getHeatCapacityFreeGasTypeGamma(domain.gasType);
  return {
    heatCapacityFreeGasType: domain.gasType,
    heatCapacityFreeExperimentGroupStatus: domain.experimentGroupStatus,
    heatCapacityFreeParameterDraft: { ...parameterDraft, gasType: domain.gasType },
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
    heatCapacityReleaseState: { ...domain.releaseState },
    heatCapacityFreeRollbackSnapshots: domain.rollbackSnapshots,
    heatCapacityFreeTraceStore: domain.traceStore,
    heatCapacityFreeTrials: domain.trials,
    heatCapacityFreeActiveAttempt: domain.activeAttempt,
    theoreticalGamma: gasTypeGamma,
  };
};

const migrateLegacyFreeTemperatureCalibrationDomain = (
  domain: HeatCapacityFreeExperimentDomainState,
  currentRecordDefaults: HeatCapacityFreeExperimentDomainState['recordConfig'],
  currentSensorDefaults: HeatCapacityFreeExperimentDomainState['sensorConfig'],
): HeatCapacityFreeExperimentDomainState => {
  const sensorConfig = {
    ...domain.sensorConfig,
    temperatureMvAtAmbient: currentSensorDefaults.temperatureMvAtAmbient,
    temperatureMvPerK: currentSensorDefaults.temperatureMvPerK,
  };
  const sensorTemperatureK = isFiniteNumber(domain.sensorState.sensorTemperatureK)
    ? domain.sensorState.sensorTemperatureK
    : domain.physicsState.gasTemperatureK;
  const displayTemperatureMv = sensorConfig.temperatureMvAtAmbient +
    (sensorTemperatureK - domain.physicsConfig.environment.ambientTemperatureK) *
      sensorConfig.temperatureMvPerK;
  const migrateRollbackSnapshot = (
    snapshot: HeatCapacityFreeExperimentDomainState['rollbackSnapshots']['afterPowerOn'],
  ) => {
    if (snapshot === null) return null;
    const rollbackSensorTemperatureK = isFiniteNumber(
      snapshot.heatCapacityFreeSensorState.sensorTemperatureK,
    )
      ? snapshot.heatCapacityFreeSensorState.sensorTemperatureK
      : snapshot.heatCapacityFreePhysicsState.gasTemperatureK;
    const rollbackDisplayTemperatureMv = sensorConfig.temperatureMvAtAmbient +
      (
        rollbackSensorTemperatureK -
        domain.physicsConfig.environment.ambientTemperatureK
      ) * sensorConfig.temperatureMvPerK;
    return {
      ...snapshot,
      temperatureSignalMv: snapshot.powerOn ? rollbackDisplayTemperatureMv : null,
      temperatureSignalTargetMv: rollbackDisplayTemperatureMv,
      heatCapacityFreeSensorState: {
        ...snapshot.heatCapacityFreeSensorState,
        sensorTemperatureK: rollbackSensorTemperatureK,
        displayTemperatureMv: rollbackDisplayTemperatureMv,
        temperatureHistory: [{
          atS: snapshot.heatCapacityFreePhysicsState.simulationTimeS,
          valueMv: rollbackDisplayTemperatureMv,
        }],
        temperatureSlopeMvPerS: 0,
      },
    };
  };
  return {
    ...domain,
    activeRunConfigSnapshot: domain.activeRunConfigSnapshot === null
      ? null
      : {
          ...domain.activeRunConfigSnapshot,
          version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
          sensor: {
            ...domain.activeRunConfigSnapshot.sensor,
            temperatureMvAtAmbient: currentSensorDefaults.temperatureMvAtAmbient,
            temperatureMvPerK: currentSensorDefaults.temperatureMvPerK,
          },
          record: {
            ...domain.activeRunConfigSnapshot.record,
            temperatureStableSlopeMvPerS: currentRecordDefaults.temperatureStableSlopeMvPerS,
            temperatureAmbientToleranceMv: currentRecordDefaults.temperatureAmbientToleranceMv,
          },
        },
    recordConfig: {
      ...domain.recordConfig,
      temperatureStableSlopeMvPerS: currentRecordDefaults.temperatureStableSlopeMvPerS,
      temperatureAmbientToleranceMv: currentRecordDefaults.temperatureAmbientToleranceMv,
    },
    sensorConfig,
    sensorState: {
      ...domain.sensorState,
      sensorTemperatureK,
      displayTemperatureMv,
      temperatureHistory: [{
        atS: domain.physicsState.simulationTimeS,
        valueMv: displayTemperatureMv,
      }],
      temperatureSlopeMvPerS: 0,
    },
    rollbackSnapshots: {
      afterPowerOn: migrateRollbackSnapshot(domain.rollbackSnapshots.afterPowerOn),
      beforePump: migrateRollbackSnapshot(domain.rollbackSnapshots.beforePump),
      beforeRelease: migrateRollbackSnapshot(domain.rollbackSnapshots.beforeRelease),
    },
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
  );
  const normalizedIdealDomain = normalizeHeatCapacityFreeExperimentDomainBoundary(
    file.heatCapacityFreeIdealDomain,
    'ideal',
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
    ),
    heatCapacityFreeIdealDomain: normalizeHeatCapacityFreeExperimentDomainBoundary(
      synchronizedFile.heatCapacityFreeIdealDomain,
      'ideal',
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

const hasCurrentFreeParameterPayload = (
  value: Partial<HeatCapacityFreePersistenceDataV1> | null,
) => (
  isRecord(value?.parameterDraft) &&
  isRecord(value?.recordConfig) &&
  isFiniteNumber(value?.pressureWarningMv) &&
  typeof value?.instrumentNoiseEnabled === 'boolean'
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
  const restoredMode = normalizePayloadMode(heatPayload.mode);
  const freeHasCurrentParameterPayload = hasCurrentFreeParameterPayload(free);
  const persistedFreeConfigVersion = isRecord(free?.config) && isFiniteNumber(free.config.version)
    ? free.config.version
    : 0;
  const migrateLegacyTemperatureCalibration = freeHasCurrentParameterPayload &&
    persistedFreeConfigVersion < HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION;
  const snapshot = freeHasCurrentParameterPayload
    ? normalizeHeatCapacityFreeRestoreConfigSnapshot(free?.config) ?? createDefaultFreeConfigSnapshot()
    : createDefaultFreeConfigSnapshot();
  const uiReplay = normalizeHeatCapacityFreeUiReplay(free?.uiReplay);
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
  const normalizedPersistedRecordConfig = freeHasCurrentParameterPayload
    ? normalizeHeatCapacityFreeRestoreRecordConfig(free?.recordConfig, fallbackRecordConfig)
    : fallback.heatCapacityFreeRecordConfig;
  const recordConfig = migrateLegacyTemperatureCalibration
    ? {
        ...normalizedPersistedRecordConfig,
        temperatureStableSlopeMvPerS:
          fallback.heatCapacityFreeRecordConfig.temperatureStableSlopeMvPerS,
        temperatureAmbientToleranceMv:
          fallback.heatCapacityFreeRecordConfig.temperatureAmbientToleranceMv,
      }
    : normalizedPersistedRecordConfig;
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
  const restoredParameterDraft = freeHasCurrentParameterPayload
    ? normalizeHeatCapacityFreeParameterDraft(
        {
          ...parameterDraftRecord,
          gasType: restoredGasType,
        },
        fallbackDraft,
      )
    : fallback.heatCapacityFreeParameterDraft;
  const parameterDraft = migrateLegacyTemperatureCalibration
    ? {
        ...restoredParameterDraft,
        temperatureStableSlopeMvPerS: recordConfig.temperatureStableSlopeMvPerS,
        temperatureAmbientToleranceMv: recordConfig.temperatureAmbientToleranceMv,
      }
    : restoredParameterDraft;
  const normalizedActiveRunConfigSnapshot = free?.activeRunConfigSnapshot === null
    ? null
    : freeHasCurrentParameterPayload && isRecord(free?.activeRunConfigSnapshot)
      ? normalizeHeatCapacityFreeRestoreConfigSnapshot(free.activeRunConfigSnapshot)
      : null;
  const activeRunConfigSnapshot = migrateLegacyTemperatureCalibration && normalizedActiveRunConfigSnapshot
      ? {
        ...normalizedActiveRunConfigSnapshot,
        version: normalizedActiveRunConfigSnapshot.version,
        sensor: {
          ...normalizedActiveRunConfigSnapshot.sensor,
          temperatureMvAtAmbient: sensorConfig.temperatureMvAtAmbient,
          temperatureMvPerK: sensorConfig.temperatureMvPerK,
        },
        record: {
          ...normalizedActiveRunConfigSnapshot.record,
          temperatureStableSlopeMvPerS: recordConfig.temperatureStableSlopeMvPerS,
          temperatureAmbientToleranceMv: recordConfig.temperatureAmbientToleranceMv,
        },
      }
    : normalizedActiveRunConfigSnapshot;
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
        .map(normalizeHeatCapacityFreeRestoreTrial)
        .filter((trial): trial is HeatCapacityFreeTrial => trial !== null)
    : fallback.heatCapacityFreeTrials;
  const restoredParameterScheme = normalizeHeatCapacityFreeRestoreParameterScheme(
    free?.parameterScheme,
    fallback.heatCapacityFreeParameterScheme,
  );
  const restoredDisplayScheme = normalizeHeatCapacityFreeRestoreDisplayScheme(
    free?.displayScheme,
    restoredParameterScheme,
  );
  const hasPersistedRealDomain = isRecord(free?.real);
  const hasPersistedIdealDomain = isRecord(free?.ideal);
  const fallbackRealDomain = createDefaultHeatCapacityFreeExperimentDomainState(
    'real',
    `${fileEnvelope.id}:real`,
  );
  const fallbackIdealDomain = createDefaultHeatCapacityFreeExperimentDomainState(
    'ideal',
    `${fileEnvelope.id}:ideal`,
  );
  const restoredRealDomain = normalizeHeatCapacityFreeRestoreExperimentDomain(
    free?.real,
    'real',
    restoredGasType,
    fallbackRealDomain,
  );
  const restoredIdealDomain = normalizeHeatCapacityFreeRestoreExperimentDomain(
    free?.ideal,
    'ideal',
    'air',
    fallbackIdealDomain,
  );
  const restoredRealDomainWithGasType = migrateLegacyTemperatureCalibration
      ? migrateLegacyFreeTemperatureCalibrationDomain(
        restoredRealDomain,
        fallbackRealDomain.recordConfig,
        fallbackRealDomain.sensorConfig,
      )
    : restoredRealDomain;
  const restoredIdealDomainWithGasType = migrateLegacyTemperatureCalibration
      ? migrateLegacyFreeTemperatureCalibrationDomain(
        restoredIdealDomain,
        fallbackIdealDomain.recordConfig,
        fallbackIdealDomain.sensorConfig,
      )
    : restoredIdealDomain;
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
  const restoredReleaseState = normalizeHeatCapacityReleaseState(
    controls.releaseState,
    createClosedHeatCapacityReleaseState(
      restoredActiveDomain.physicsState.simulationTimeS,
    ),
  );
  const restoredStopcockOpen = restoredReleaseState.phase === 'opening' ||
    restoredReleaseState.phase === 'open' ||
    restoredReleaseState.phase === 'releasing';
  const restoredOpenHeatCapacityTabs = normalizeWorkbenchHeatCapacityTabIds(
    common.openHeatCapacityTabs,
    fallback.openHeatCapacityTabs,
  );
  const restoredActiveHeatCapacityTabId = isWorkbenchHeatCapacityTabId(common.activeHeatCapacityTabId)
    ? common.activeHeatCapacityTabId
    : fallback.activeHeatCapacityTabId;
  const restoredGuideFields = restoreHeatCapacityGuidePersistenceFields(
    heatPayload.guided,
    fallback,
  );
  const restoredTeachingStatus = common.teachingStatus === 'running' || common.teachingStatus === 'completed'
    ? common.teachingStatus
    : restoredMode === 'free'
      ? 'idle'
      : restoredGuideFields.heatCapacityGuideWorkflow.step === 'completed'
        ? 'completed'
        : 'running';
  const migratedActiveSensorTemperatureK = isFiniteNumber(
    restoredActiveDomain.sensorState.sensorTemperatureK,
  )
    ? restoredActiveDomain.sensorState.sensorTemperatureK
    : restoredActiveDomain.physicsState.gasTemperatureK;
  const migratedActiveTemperatureDisplayMv =
    restoredActiveDomain.sensorConfig.temperatureMvAtAmbient +
    (
      migratedActiveSensorTemperatureK -
      restoredActiveDomain.physicsConfig.environment.ambientTemperatureK
    ) * restoredActiveDomain.sensorConfig.temperatureMvPerK;

  const restoredFile: WorkbenchHeatCapacityState = {
    ...fallback,
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    visiblePanels: visiblePanels.length > 0 ? visiblePanels : fallback.visiblePanels,
    liveWorkspaceSplitRatio,
    heatCapacityMode: restoredMode,
    heatCapacityTeachingStatus: restoredTeachingStatus,
    heatCapacityLessonIntroAutoShown: typeof common.lessonIntroAutoShown === 'boolean'
      ? common.lessonIntroAutoShown
      : true,
    heatCapacityExperimentSeed: common.experimentSeed ?? fallback.heatCapacityExperimentSeed,
    heatCapacityExperimentProfile: normalizeHeatCapacityTeachingProfile(common.experimentProfile),
    openHeatCapacityTabs: restoredOpenHeatCapacityTabs,
    activeHeatCapacityTabId: restoredActiveHeatCapacityTabId,
    heatCapacityFreeRuntimeVersion: free?.runtimeVersion ?? HEAT_CAPACITY_FREE_RUNTIME_VERSION,
    heatCapacityFreePreheatCompleted: free !== null && Object.prototype.hasOwnProperty.call(free, 'preheatCompleted')
      ? free.preheatCompleted === true
      : true,
    heatCapacityFreeTraceVersion: free?.traceVersion ?? HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeParameterScheme: restoredParameterScheme,
    heatCapacityFreeDisplayScheme: restoredDisplayScheme,
    heatCapacityFreeGasType: parameterDraft.gasType,
    heatCapacityFreeRealDomain: restoredRealDomainWithGasType,
    heatCapacityFreeIdealDomain: restoredIdealDomainWithGasType,
    heatCapacityFreeEnvironmentConfig: { ...snapshot.environment },
    heatCapacityFreeExperimentGroupStatus: normalizeHeatCapacityFreeRestoreExperimentGroupStatus(
      free?.experimentGroupStatus,
      fallback.heatCapacityFreeExperimentGroupStatus,
    ),
    heatCapacityFreeParameterDraft: parameterDraft,
    heatCapacityFreeActiveRunConfigSnapshot: activeRunConfigSnapshot,
    heatCapacityFreeFileAcknowledgements: normalizeHeatCapacityFreeFileAcknowledgements(
      free?.acknowledgements,
    ),
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
    ...(migrateLegacyTemperatureCalibration
      ? {
          gasTemperatureK: restoredActiveDomain.physicsState.gasTemperatureK,
          sensorTemperatureK: migratedActiveSensorTemperatureK,
          temperatureSignalTargetMv: migratedActiveTemperatureDisplayMv,
          temperatureSignalMv: controls.powerOn === true
            ? migratedActiveTemperatureDisplayMv
            : null,
          temperatureDisplayJitterOffset: 0,
          temperatureDisplayNextJitterAtMs: fileEnvelope.updatedAt,
          vesselTemperatureReadoutK: restoredActiveDomain.physicsState.gasTemperatureK,
          heatCapacityProcessSamples: {},
        }
      : {}),
    heatCapacityMaterialsExpanded: typeof common.materialsExpanded === 'boolean'
      ? common.materialsExpanded
      : fallback.heatCapacityMaterialsExpanded,
    theoreticalGamma: getHeatCapacityFreeGasTypeGamma(parameterDraft.gasType),
    heatCapacityFreeEquilibriumSpeedMultiplier: normalizeHeatCapacityPersistenceEquilibriumSpeed(
      uiReplay.heatCapacityFreeEquilibriumSpeedMultiplier,
    ),
    powerOn: controls.powerOn === true,
    glassPistonState: restoredStopcockOpen ? 'open' : 'closed',
    stopcockAngleDeg: getHeatCapacityStopcockTargetAngle(restoredStopcockOpen),
    pumpValveOpen: controls.pumpValveOpen === true,
    pumpValveState: controls.pumpValveOpen === true ? 'open' : 'closed',
    pumpBulbState: normalizePumpBulbState(controls.pumpBulbState),
    heatCapacityReleaseState: restoredReleaseState,
    ...restoredGuideFields,
  };
  return normalizeHeatCapacitySessionRuntimeState(restoredFile);
};
