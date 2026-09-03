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
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  type HeatCapacityFreeConfigSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  applyCurrentHeatCapacityFreeExperimentGroupToRuntimeFields,
  selectHeatCapacityFreeAppliedParameterDraft,
  selectHeatCapacityFreeActiveRunConfigSnapshot,
  selectHeatCapacityFreeGasType,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  createDefaultHeatCapacityFreeExperimentDomainState,
  normalizeHeatCapacityFreeFileAcknowledgements,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
import {
  createDefaultHeatCapacityFile,
} from './workbenchHeatCapacityFileFactory.ts';
import {
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  getHeatCapacityStopcockTargetAngle,
} from './workbenchHeatCapacityInstrumentState.ts';
import type {
  HeatCapacityFreeExperimentDomainState,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';
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
  areHeatCapacityPersistenceValuesEqual,
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
  type HeatCapacityFreePersistenceDataV2,
  type HeatCapacityPersistencePayloadV2,
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
import {
  normalizeHeatCapacityModeSessionStore,
  normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence,
} from './workbenchHeatCapacityModeSession.ts';
import {
  migrateLegacyHeatCapacityFreeExperimentGroups,
} from './workbenchHeatCapacityExperimentGroupMigration.ts';
import {
  estimateHeatCapacityFreeExperimentGroupCollectionBytes,
} from '../../domain/heatCapacity/heatCapacityFreeCapacityPolicy.ts';
import {
  updateHeatCapacityFreeExperimentGroupCapacityEstimate,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  prepareHeatCapacityFreeCapture,
} from './workbenchHeatCapacityFreeCapture.ts';

const repairHeatCapacityExperimentGroupDerivedTrialCaches = (
  value: unknown,
): unknown => {
  if (!isRecord(value) || !Array.isArray(value.groups)) return value;
  const candidate = clonePersistenceValue(value);
  if (!isRecord(candidate) || !Array.isArray(candidate.groups)) return value;
  let repaired = false;
  for (const group of candidate.groups) {
    if (
      !isRecord(group) ||
      !isRecord(group.runSeries) ||
      !Array.isArray(group.runSeries.trials)
    ) {
      continue;
    }
    const fallbackSnapshot = normalizeHeatCapacityFreeRestoreConfigSnapshot(
      group.parameterSnapshot,
    );
    group.runSeries.trials = group.runSeries.trials.map((trial) => {
      if (!isRecord(trial)) return trial;
      const normalized = normalizeHeatCapacityFreeRestoreTrial(
        trial,
        fallbackSnapshot,
      );
      if (normalized === null) return trial;
      const repairedTrial = {
        ...trial,
        correctedSignals: clonePersistenceValue(normalized.correctedSignals),
        standardReferenceSnapshot: clonePersistenceValue(
          normalized.standardReferenceSnapshot,
        ),
      };
      if (
        !areHeatCapacityPersistenceValuesEqual(repairedTrial, normalized) ||
        areHeatCapacityPersistenceValuesEqual(repairedTrial, trial)
      ) {
        return trial;
      }
      repaired = true;
      return repairedTrial;
    });
  }
  return repaired ? candidate : value;
};

export {
  HEAT_CAPACITY_PROCESS_SCORING_VERSION,
} from './workbenchHeatCapacityFreeRestoreNormalization.ts';
export {
  HEAT_CAPACITY_SCHEMA_VERSION,
  validateHeatCapacityPersistencePayload,
} from './workbenchHeatCapacityPersistenceContract.ts';
export type {
  HeatCapacityFreePersistenceDataV1,
  HeatCapacityFreePersistenceDataV2,
  HeatCapacityFreeUiReplayV1,
  HeatCapacityGuidePersistenceDataV1,
  HeatCapacityPayloadValidationResult,
  HeatCapacityPersistencePayloadV1,
  HeatCapacityPersistencePayloadV2,
} from './workbenchHeatCapacityPersistenceContract.ts';
export {
  createHeatCapacityFreeConfigSnapshotFromFile,
} from './workbenchHeatCapacityFreeConfigSnapshot.ts';

export const createHeatCapacityPersistencePayload = (
  file: WorkbenchHeatCapacityState,
  savedAt: number,
): HeatCapacityPersistencePayloadV2 => {
  void savedAt;
  const fileWithCurrentDomain = createHeatCapacityPersistenceSourceFile(file);
  const experimentGroups = updateHeatCapacityFreeExperimentGroupCapacityEstimate(
    fileWithCurrentDomain.heatCapacityFreeExperimentGroups,
    estimateHeatCapacityFreeExperimentGroupCollectionBytes(
      fileWithCurrentDomain.heatCapacityFreeExperimentGroups,
    ),
    fileWithCurrentDomain.updatedAt,
  );
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
      modeSessions: clonePersistenceValue(file.heatCapacityModeSessions),
    },
    free: {
      runtimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
      traceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
      calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
      preheatCompleted: fileWithCurrentDomain.heatCapacityFreePreheatCompleted,
      parameterScheme: fileWithCurrentDomain.heatCapacityFreeParameterScheme,
      displayScheme: fileWithCurrentDomain.heatCapacityFreeDisplayScheme,
      gasType: selectHeatCapacityFreeGasType(fileWithCurrentDomain),
      real: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeRealDomain),
      ideal: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeIdealDomain),
      experimentGroups: clonePersistenceValue(
        experimentGroups,
      ),
      config: createHeatCapacityFreeConfigSnapshotFromFile(fileWithCurrentDomain),
      parameterDraft: clonePersistenceValue(
        selectHeatCapacityFreeAppliedParameterDraft(fileWithCurrentDomain),
      ),
      experimentGroupStatus: fileWithCurrentDomain.heatCapacityFreeRunWorkspace.currentExperimentStatus,
      activeRunConfigSnapshot: clonePersistenceValue(
        selectHeatCapacityFreeActiveRunConfigSnapshot(fileWithCurrentDomain),
      ),
      acknowledgements: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeFileAcknowledgements),
      recordConfig: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeInstrumentConfig.record),
      pressureWarningMv: fileWithCurrentDomain.heatCapacityFreeInstrumentConfig.pressureWarningMv,
      instrumentNoiseEnabled: fileWithCurrentDomain.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
      runtime: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeInstrumentState.physics),
      controls: {
        powerOn: fileWithCurrentDomain.powerOn,
        pumpValveOpen: fileWithCurrentDomain.pumpValveOpen,
        stopcockOpen: fileWithCurrentDomain.glassPistonState === 'open',
        pumpBulbState: fileWithCurrentDomain.pumpBulbState,
        releaseState: clonePersistenceValue(
          file.heatCapacityMode === 'free'
            ? fileWithCurrentDomain.heatCapacityReleaseState
            : file.heatCapacityReleaseState,
        ),
      },
      sensor: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeInstrumentState.sensor),
      calibration: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeInstrumentState.calibration),
      rollbackSnapshots: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeRollbackSnapshots),
      traceStore: clonePersistenceValue(
        fileWithCurrentDomain.heatCapacityFreeRunWorkspace.traceStore,
      ),
      trials: clonePersistenceValue(fileWithCurrentDomain.heatCapacityFreeRunWorkspace.trials),
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
  const gasTypeGamma = getHeatCapacityFreeGasTypeGamma(domain.gasType);
  return {
    heatCapacityFreeRunWorkspace: {
      batch: domain.batch,
      traceStore: domain.traceStore,
      trials: domain.trials,
      activeAttempt: domain.activeAttempt,
      currentExperimentStatus: domain.experimentGroupStatus,
    },
    heatCapacityFreeInstrumentConfig: {
      record: domain.recordConfig,
      pressureWarningMv: domain.pressureWarningMv,
      instrumentNoiseEnabled: domain.instrumentNoiseEnabled,
      environment: domain.environmentConfig,
      physics: {
        ...domain.physicsConfig,
        gamma: gasTypeGamma,
      },
      sensor: domain.sensorConfig,
    },
    heatCapacityFreeInstrumentState: {
      physics: domain.physicsState,
      sensor: domain.sensorState,
      calibration: domain.calibrationState,
    },
    heatCapacityReleaseState: { ...domain.releaseState },
    heatCapacityFreeRollbackSnapshots: domain.rollbackSnapshots,
    theoreticalGamma: gasTypeGamma,
  };
};

const createHeatCapacityPersistenceSourceFile = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  const captured = prepareHeatCapacityFreeCapture(file, file.heatCapacityMode === 'free');
  if (captured.ok === false) {
    throw new Error(`${captured.fieldPath}: ${captured.reason}`);
  }
  return captured.file;
};

const normalizePayloadMode = (
  value: unknown,
): WorkbenchHeatCapacityState['heatCapacityMode'] => {
  if (value === null) return null;
  return value === 'demo' || value === 'guide' || value === 'free' ? value : 'free';
};

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
  const heatPayload = isRecord(payload) ? payload as Partial<HeatCapacityPersistencePayloadV2> : {};
  const free = isRecord(heatPayload.free) ? heatPayload.free as Partial<HeatCapacityFreePersistenceDataV2> : null;
  const common = isRecord(heatPayload.common) ? heatPayload.common as Partial<HeatCapacityPersistencePayloadV2['common']> : {};
  const restoredMode = normalizePayloadMode(heatPayload.mode);
  const freeHasCurrentParameterPayload = hasCurrentFreeParameterPayload(free);
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
    ...fallback.heatCapacityFreeInstrumentConfig.record,
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
    : fallback.heatCapacityFreeInstrumentConfig.record;
  const recordConfig = normalizedPersistedRecordConfig;
  const pressureWarningMv = freeHasCurrentParameterPayload
    ? finiteOrDefault(free?.pressureWarningMv, snapshot.record.pressureWarningMv ?? HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV)
    : fallback.heatCapacityFreeInstrumentConfig.pressureWarningMv;
  const instrumentNoiseEnabled = freeHasCurrentParameterPayload
    ? free?.instrumentNoiseEnabled === true
    : fallback.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled;
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
    : selectHeatCapacityFreeAppliedParameterDraft(fallback);
  const parameterDraft = restoredParameterDraft;
  const normalizedActiveRunConfigSnapshot = free?.activeRunConfigSnapshot === null
    ? null
    : freeHasCurrentParameterPayload && isRecord(free?.activeRunConfigSnapshot)
      ? normalizeHeatCapacityFreeRestoreConfigSnapshot(free.activeRunConfigSnapshot)
      : null;
  const activeRunConfigSnapshot = normalizedActiveRunConfigSnapshot;
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
        .map((trial) => normalizeHeatCapacityFreeRestoreTrial(trial))
        .filter((trial): trial is HeatCapacityFreeTrial => trial !== null)
    : fallback.heatCapacityFreeRunWorkspace.trials;
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
  const restoredRealDomainWithGasType = (
    restoredParameterScheme === 'real' && !hasPersistedRealDomain
  )
    ? { ...restoredRealDomain, activeRunConfigSnapshot }
    : restoredRealDomain;
  const restoredIdealDomainWithGasType = (
    restoredParameterScheme === 'ideal' && !hasPersistedIdealDomain
  )
    ? { ...restoredIdealDomain, activeRunConfigSnapshot }
    : restoredIdealDomain;
  const persistedExperimentGroups =
    normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence(
      repairHeatCapacityExperimentGroupDerivedTrialCaches(
        free?.experimentGroups,
      ),
    );
  if (
    heatPayload.heatCapacitySchemaVersion === HEAT_CAPACITY_SCHEMA_VERSION &&
    free !== null &&
    persistedExperimentGroups === null
  ) {
    throw new Error('The heat-capacity experiment-group collection is invalid.');
  }
  const restoredExperimentGroups = persistedExperimentGroups ??
    migrateLegacyHeatCapacityFreeExperimentGroups({
      fileId: fileEnvelope.id,
      selectedScheme: restoredParameterScheme,
      real: restoredRealDomainWithGasType,
      ideal: restoredIdealDomainWithGasType,
      fallbackCreatedAtMs: fileEnvelope.createdAt,
    });
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
  const restoredRunWorkspaceBase =
    restoredActiveDomainRuntimeFields?.heatCapacityFreeRunWorkspace ?? {
      ...fallback.heatCapacityFreeRunWorkspace,
      traceStore: free?.traceStore ?? createDefaultFreeTraceStore(),
      trials: restoredFreeTrials,
    };
  const restoredCurrentExperimentStatus =
    normalizeHeatCapacityFreeRestoreExperimentGroupStatus(
      free?.experimentGroupStatus,
      restoredRunWorkspaceBase.currentExperimentStatus,
    );
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
    heatCapacityModeSessions: normalizeHeatCapacityModeSessionStore(common.modeSessions, fileEnvelope.id),
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
    heatCapacityFreeRealDomain: restoredRealDomainWithGasType,
    heatCapacityFreeIdealDomain: restoredIdealDomainWithGasType,
    heatCapacityFreeExperimentGroups: restoredExperimentGroups,
    heatCapacityFreeFileAcknowledgements: normalizeHeatCapacityFreeFileAcknowledgements(
      free?.acknowledgements,
    ),
    heatCapacityFreeInstrumentConfig: {
      environment: { ...snapshot.environment },
      record: recordConfig,
      pressureWarningMv,
      instrumentNoiseEnabled,
      physics: {
        ...physicsConfig,
        gamma: getHeatCapacityFreeGasTypeGamma(parameterDraft.gasType),
      },
      sensor: sensorConfig,
    },
    heatCapacityFreeInstrumentState: {
      physics: free?.runtime ?? fallback.heatCapacityFreeInstrumentState.physics,
      sensor: free?.sensor ?? fallback.heatCapacityFreeInstrumentState.sensor,
      calibration: free?.calibration ?? fallback.heatCapacityFreeInstrumentState.calibration,
    },
    heatCapacityFreeRollbackSnapshots: free?.rollbackSnapshots ?? fallback.heatCapacityFreeRollbackSnapshots,
    ...(restoredActiveDomainRuntimeFields ?? {}),
    heatCapacityFreeRunWorkspace: {
      ...restoredRunWorkspaceBase,
      currentExperimentStatus: restoredCurrentExperimentStatus,
    },
    ...uiReplay,
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
  const restoredFileWithLegacyActiveDomain = activeDomainPersisted
    ? restoredFile
    : storeHeatCapacityFreeRuntimeFieldsInDomain(
        restoredFile,
        restoredParameterScheme,
      );
  return normalizeHeatCapacitySessionRuntimeState(
    applyCurrentHeatCapacityFreeExperimentGroupToRuntimeFields(
      restoredFileWithLegacyActiveDomain,
    ),
  );
};
