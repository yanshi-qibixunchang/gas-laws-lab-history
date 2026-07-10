import type { HeatCapacityTeachingProfile } from '../../domain/heatCapacity/heatCapacityExperimentRandom.ts';
import {
  createHeatCapacityFreeParameterDraftFromConfigs,
  getHeatCapacityFreeGasTypeGamma,
  normalizeHeatCapacityFreeGasType,
  normalizeHeatCapacityFreeParameterDraft,
  resolveHeatCapacityFreeGasTypeFromGamma,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type { HeatCapacityFreeTrial } from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createDefaultFreeTraceStore,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  applyHeatCapacityPressureZero,
  clampWorkbenchLiveSplitRatio,
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityFreeExperimentDomainState,
  createDefaultHeatCapacityFreeRuntimeFields,
  getHeatCapacityStopcockState,
  getHeatCapacityStopcockTargetAngle,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  normalizeHeatCapacityFileName,
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  normalizeHeatCapacityFreeFileAcknowledgements,
  normalizeHeatCapacityStopcockAngle,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import {
  heatCapacityRestoreFiniteOrDefault as finiteOrDefault,
  normalizeHeatCapacityFreeRestoreConfigSnapshot,
  normalizeHeatCapacityFreeRestoreDisplayScheme,
  normalizeHeatCapacityFreeRestoreExperimentDomain,
  normalizeHeatCapacityFreeRestoreExperimentGroupStatus,
  normalizeHeatCapacityFreeRestoreParameterScheme,
  normalizeHeatCapacityFreeRestoreRecordConfig,
  normalizeHeatCapacityFreeRestoreTraceStore,
  normalizeHeatCapacityFreeRestoreTrial,
} from './workbenchHeatCapacityFreeRestoreNormalization.ts';
import {
  isPersistenceFiniteNumber as isFiniteNumber,
  isPersistenceRecord as isRecord,
  normalizePersistenceNullableNumber as normalizeNullableNumber,
} from './workbenchPersistenceValue.ts';
import { isWorkbenchPanelKey } from './workbenchPanelRegistry.ts';
import { normalizeWorkbenchHeatCapacityTabIds } from './workbenchHeatCapacityTabRegistry.ts';
import { normalizeHeatCapacityFreePhysicsConfig } from './workbenchHeatCapacityFreeRuntimeConfig.ts';

const normalizeHeatCapacityExperimentProfile = (value: unknown): HeatCapacityTeachingProfile | null => (
  isRecord(value) && normalizeNullableNumber(value.u1MeasuredMv) !== null && normalizeNullableNumber(value.u2MeasuredMv) !== null
    ? value as unknown as HeatCapacityTeachingProfile
    : null
);

const normalizeLastOpenedAt = (file: WorkbenchHeatCapacityState, fallback: number) => (
  normalizeNullableNumber(file.lastOpenedAt) ??
  normalizeNullableNumber(file.updatedAt) ??
  normalizeNullableNumber(file.createdAt) ??
  fallback
);

const heatCapacitySampleKeys = [
  'startSample',
  'zeroedSample',
  'afterPumpSample',
  'pumpPeakSample',
  'beforeReleaseSample',
  'stableBeforeReleaseSample',
  'afterReleaseSample',
  'releaseLowSample',
  'recoverySample',
] as const;

const normalizeHeatCapacityProcessSamplePoint = (value: unknown) => {
  if (!isRecord(value)) return null;
  const timeS = normalizeNullableNumber(value.timeS);
  const temperatureSignalMv = normalizeNullableNumber(value.temperatureSignalMv);
  const pressureSignalMv = normalizeNullableNumber(value.pressureSignalMv);
  const gasTemperatureK = normalizeNullableNumber(value.gasTemperatureK);
  const gasPressureKPaAbs = normalizeNullableNumber(value.gasPressureKPaAbs);
  const pressureDeltaKPa = normalizeNullableNumber(value.pressureDeltaKPa);
  const pumpFrequency = normalizeNullableNumber(value.pumpFrequency);
  if (
    timeS === null ||
    temperatureSignalMv === null ||
    pressureSignalMv === null ||
    gasTemperatureK === null ||
    gasPressureKPaAbs === null ||
    pressureDeltaKPa === null ||
    pumpFrequency === null
  ) {
    return null;
  }
  return {
    timeS,
    phase: typeof value.phase === 'string' ? value.phase : 'readyToZero',
    temperatureSignalMv,
    pressureSignalMv,
    gasTemperatureK,
    gasPressureKPaAbs,
    pressureDeltaKPa,
    pumpFrequency,
    pumpValveOpen: value.pumpValveOpen === true,
    stopcockOpen: value.stopcockOpen === true,
  };
};

const normalizeHeatCapacityProcessSamples = (value: unknown) => {
  if (!isRecord(value)) return {};
  return heatCapacitySampleKeys.reduce<Record<string, ReturnType<typeof normalizeHeatCapacityProcessSamplePoint>>>((samples, key) => {
    const point = normalizeHeatCapacityProcessSamplePoint(value[key]);
    if (point) samples[key] = point;
    return samples;
  }, {});
};

const normalizePersistedHeatCapacityFreeStopcockFlowPurpose = (
  value: unknown,
  stopcockOpen: boolean,
): WorkbenchHeatCapacityState['heatCapacityFreeStopcockFlowPurpose'] => {
  if (!stopcockOpen) return 'none';
  return value === 'release' || value === 'zeroing' ? value : 'none';
};

export const normalizeHeatCapacitySessionRuntimeState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  const fallback = createDefaultHeatCapacityFile(1);
  const heatCapacityVisiblePanels = file.visiblePanels.filter((panel) => (
    panel === 'preview' ||
    panel === 'realtime' ||
    panel === 'heatCapacityGuide' ||
    panel === 'heatCapacityRecords' ||
    panel === 'heatCapacityReview'
  ));
  const hasSavedStopcockAngle = isFiniteNumber(file.stopcockAngleDeg);
  const normalizedSavedStopcockAngle = hasSavedStopcockAngle
    ? normalizeHeatCapacityStopcockAngle(file.stopcockAngleDeg)
    : fallback.stopcockAngleDeg;
  const savedStopcockState = getHeatCapacityStopcockState(normalizedSavedStopcockAngle);
  const shouldMigrateBySavedState = (
    (file.glassPistonState === 'open' || file.glassPistonState === 'closed') &&
    (!hasSavedStopcockAngle || file.glassPistonState !== savedStopcockState)
  );
  const stopcockAngleDeg = shouldMigrateBySavedState
    ? getHeatCapacityStopcockTargetAngle(file.glassPistonState === 'open')
    : normalizedSavedStopcockAngle;
  const pressureSignalRawReadoutMv = normalizeNullableNumber(file.pressureSignalRawReadoutMv)
    ?? fallback.pressureSignalRawReadoutMv;
  const pressureInitialBiasMv = normalizeNullableNumber(file.pressureInitialBiasMv)
    ?? fallback.pressureInitialBiasMv;
  const pressureZeroOffset = normalizeNullableNumber(file.pressureZeroOffset)
    ?? fallback.pressureZeroOffset;
  const pressureSignalReadoutMv = normalizeNullableNumber(file.pressureSignalReadoutMv)
    ?? applyHeatCapacityPressureZero(pressureSignalRawReadoutMv, pressureInitialBiasMv, pressureZeroOffset);
  const pressureZeroAdjusted = file.pressureZeroAdjusted === true || file.pressureZeroed === true;
  const pressureZeroAdjustMode = file.pressureZeroAdjustMode === 'fineWheel' || file.pressureZeroAdjustMode === 'coarseDrag'
    ? file.pressureZeroAdjustMode
    : 'none';
  const openHeatCapacityTabs = normalizeWorkbenchHeatCapacityTabIds(file.openHeatCapacityTabs, []);
  const activeHeatCapacityTabId = file.activeHeatCapacityTabId && openHeatCapacityTabs.includes(file.activeHeatCapacityTabId)
    ? file.activeHeatCapacityTabId
    : openHeatCapacityTabs[0] ?? null;
  const heatCapacityFreeTrials = Array.isArray(file.heatCapacityFreeTrials)
    ? file.heatCapacityFreeTrials
        .map(normalizeHeatCapacityFreeRestoreTrial)
        .filter((trial): trial is HeatCapacityFreeTrial => trial !== null)
    : [];
  const fallbackFreeRuntimeFields = createDefaultHeatCapacityFreeRuntimeFields(`free-runtime-${file.id}`);
  const savedFreeRuntimeCompatible = file.heatCapacityFreeRuntimeVersion === HEAT_CAPACITY_FREE_RUNTIME_VERSION;
  const savedFreeSensorState = isRecord(file.heatCapacityFreeSensorState)
    ? file.heatCapacityFreeSensorState as typeof fallbackFreeRuntimeFields.heatCapacityFreeSensorState
    : null;
  const savedFreePhysicsConfigRaw = savedFreeRuntimeCompatible && isRecord(file.heatCapacityFreePhysicsConfig)
    ? normalizeHeatCapacityFreePhysicsConfig(file.heatCapacityFreePhysicsConfig)
    : fallbackFreeRuntimeFields.heatCapacityFreePhysicsConfig;
  const savedFreeSensorConfig = isRecord(file.heatCapacityFreeSensorConfig)
    ? file.heatCapacityFreeSensorConfig as typeof fallbackFreeRuntimeFields.heatCapacityFreeSensorConfig
    : fallbackFreeRuntimeFields.heatCapacityFreeSensorConfig;
  const savedFreeRecordConfig = normalizeHeatCapacityFreeRestoreRecordConfig(
    file.heatCapacityFreeRecordConfig,
    fallbackFreeRuntimeFields.heatCapacityFreeRecordConfig,
  );
  const savedFreePressureWarningMv = finiteOrDefault(
    file.heatCapacityFreePressureWarningMv,
    fallbackFreeRuntimeFields.heatCapacityFreePressureWarningMv,
  );
  const savedFreeInstrumentNoiseEnabled = typeof file.heatCapacityFreeInstrumentNoiseEnabled === 'boolean'
    ? file.heatCapacityFreeInstrumentNoiseEnabled
    : savedFreeSensorConfig.noiseMv > 0;
  const savedFreeStopcockFlowOpen = file.heatCapacityFreeStopcockFlowOpen === true;
  const savedFreeStopcockPendingOpenAtMs = normalizeNullableNumber(file.heatCapacityFreeStopcockPendingOpenAtMs);
  const savedFreeStopcockFlowPurpose = normalizePersistedHeatCapacityFreeStopcockFlowPurpose(
    file.heatCapacityFreeStopcockFlowPurpose,
    savedFreeStopcockFlowOpen || savedFreeStopcockPendingOpenAtMs !== null,
  );
  const fallbackFreeParameterDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    savedFreePhysicsConfigRaw,
    savedFreeSensorConfig,
    savedFreeRecordConfig,
    savedFreePressureWarningMv,
    savedFreeInstrumentNoiseEnabled,
  );
  const savedFreeParameterDraftRecord: Record<string, unknown> = isRecord(file.heatCapacityFreeParameterDraft)
    ? file.heatCapacityFreeParameterDraft
    : {};
  const savedFreeGasType = normalizeHeatCapacityFreeGasType(
    file.heatCapacityFreeGasType,
    normalizeHeatCapacityFreeGasType(
      savedFreeParameterDraftRecord.gasType,
      resolveHeatCapacityFreeGasTypeFromGamma(savedFreeParameterDraftRecord.gamma ?? savedFreePhysicsConfigRaw.gamma),
    ),
  );
  const savedFreeParameterDraft = normalizeHeatCapacityFreeParameterDraft(
    {
      ...savedFreeParameterDraftRecord,
      gasType: savedFreeGasType,
    },
    {
      ...fallbackFreeParameterDraft,
      gasType: savedFreeGasType,
    },
  );
  const savedFreeParameterScheme = normalizeHeatCapacityFreeRestoreParameterScheme(
    file.heatCapacityFreeParameterScheme,
  );
  const savedFreeDisplayScheme = normalizeHeatCapacityFreeRestoreDisplayScheme(
    file.heatCapacityFreeDisplayScheme,
    savedFreeParameterScheme,
  );
  const savedFreePhysicsConfig = {
    ...savedFreePhysicsConfigRaw,
    gamma: getHeatCapacityFreeGasTypeGamma(savedFreeParameterDraft.gasType),
  };
  const savedFreePhysicsState = savedFreeRuntimeCompatible && isRecord(file.heatCapacityFreePhysicsState)
    ? file.heatCapacityFreePhysicsState
    : null;
  const normalizedFreeRuntimeFields = savedFreeRuntimeCompatible
    ? {
        heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
        heatCapacityFreeExperimentGroupStatus: normalizeHeatCapacityFreeRestoreExperimentGroupStatus(
          file.heatCapacityFreeExperimentGroupStatus,
        ),
        heatCapacityFreeGasType: savedFreeParameterDraft.gasType,
        heatCapacityFreeParameterDraft: savedFreeParameterDraft,
        heatCapacityFreeActiveRunConfigSnapshot: normalizeHeatCapacityFreeRestoreConfigSnapshot(
          file.heatCapacityFreeActiveRunConfigSnapshot,
        ),
        heatCapacityFreeFileAcknowledgements: normalizeHeatCapacityFreeFileAcknowledgements(
          file.heatCapacityFreeFileAcknowledgements,
        ),
        heatCapacityFreeRecordConfig: savedFreeRecordConfig,
        heatCapacityFreePressureWarningMv: savedFreePressureWarningMv,
        heatCapacityFreeInstrumentNoiseEnabled: savedFreeInstrumentNoiseEnabled,
        heatCapacityFreeEnvironmentConfig: { ...savedFreePhysicsConfig.environment },
        heatCapacityFreePhysicsConfig: savedFreePhysicsConfig,
        heatCapacityFreePhysicsState: savedFreePhysicsState
          ? {
              ...fallbackFreeRuntimeFields.heatCapacityFreePhysicsState,
              ...savedFreePhysicsState,
              gasTemperatureK: normalizeNullableNumber(savedFreePhysicsState.gasTemperatureK)
                ?? savedFreePhysicsConfig.environment.ambientTemperatureK,
              wallTemperatureK: normalizeNullableNumber(savedFreePhysicsState.wallTemperatureK)
                ?? normalizeNullableNumber(savedFreePhysicsState.gasTemperatureK)
                ?? savedFreePhysicsConfig.environment.ambientTemperatureK,
              lastPumpStrokeAtS: normalizeNullableNumber(savedFreePhysicsState.lastPumpStrokeAtS),
            } as typeof fallbackFreeRuntimeFields.heatCapacityFreePhysicsState
          : fallbackFreeRuntimeFields.heatCapacityFreePhysicsState,
        heatCapacityFreeSensorConfig: savedFreeSensorConfig,
        heatCapacityFreeSensorState: savedFreeSensorState
          ? {
              ...savedFreeSensorState,
              pressureInitialBiasMv: normalizeNullableNumber(savedFreeSensorState.pressureInitialBiasMv)
                ?? fallbackFreeRuntimeFields.heatCapacityFreeSensorState.pressureInitialBiasMv,
            }
          : fallbackFreeRuntimeFields.heatCapacityFreeSensorState,
        heatCapacityFreeCalibrationState: isRecord(file.heatCapacityFreeCalibrationState)
          ? file.heatCapacityFreeCalibrationState as typeof fallbackFreeRuntimeFields.heatCapacityFreeCalibrationState
          : fallbackFreeRuntimeFields.heatCapacityFreeCalibrationState,
        heatCapacityFreeStopcockFlowOpen: savedFreeStopcockFlowOpen,
        heatCapacityFreeStopcockPendingOpenAtMs: savedFreeStopcockPendingOpenAtMs,
        heatCapacityFreeStopcockFlowPurpose: savedFreeStopcockFlowPurpose,
        heatCapacityFreeEquilibriumSpeedMultiplier: normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(
          file.heatCapacityFreeEquilibriumSpeedMultiplier,
        ),
        heatCapacityFreeEquilibriumSpeedHintShown: file.heatCapacityFreeEquilibriumSpeedHintShown === true,
        heatCapacityFreeRollbackSnapshots: isRecord(file.heatCapacityFreeRollbackSnapshots)
          ? file.heatCapacityFreeRollbackSnapshots as typeof fallbackFreeRuntimeFields.heatCapacityFreeRollbackSnapshots
          : fallbackFreeRuntimeFields.heatCapacityFreeRollbackSnapshots,
      }
    : fallbackFreeRuntimeFields;
  const heatCapacityFreeTraceStore = file.heatCapacityFreeTraceVersion === HEAT_CAPACITY_FREE_TRACE_VERSION
    ? normalizeHeatCapacityFreeRestoreTraceStore(file.heatCapacityFreeTraceStore)
    : createDefaultFreeTraceStore();
  const heatCapacityFreeRealDomain = normalizeHeatCapacityFreeRestoreExperimentDomain(
    file.heatCapacityFreeRealDomain,
    'real',
    savedFreeParameterDraft.gasType,
    createDefaultHeatCapacityFreeExperimentDomainState('real', `session-${file.id}:real`),
  );
  const heatCapacityFreeIdealDomain = normalizeHeatCapacityFreeRestoreExperimentDomain(
    file.heatCapacityFreeIdealDomain,
    'ideal',
    'air',
    createDefaultHeatCapacityFreeExperimentDomainState('ideal', `session-${file.id}:ideal`),
  );
  const normalizedHeatCapacityFile: WorkbenchHeatCapacityState = {
    ...fallback,
    ...file,
    ...normalizedFreeRuntimeFields,
    heatCapacityFreeParameterScheme: savedFreeParameterScheme,
    heatCapacityFreeDisplayScheme: savedFreeDisplayScheme,
    heatCapacityFreeRealDomain,
    heatCapacityFreeIdealDomain,
    name: normalizeHeatCapacityFileName(file.name),
    lastOpenedAt: normalizeLastOpenedAt(file, fallback.lastOpenedAt),
    visiblePanels: heatCapacityVisiblePanels.length > 0 ? heatCapacityVisiblePanels : fallback.visiblePanels,
    runState: file.runState === 'running' ? 'paused' : file.runState,
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
      file.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
    ),
    selectedHeatCapacityPanel: isWorkbenchPanelKey(file.selectedHeatCapacityPanel)
      ? file.selectedHeatCapacityPanel
      : 'preview',
    openHeatCapacityTabs,
    activeHeatCapacityTabId,
    heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded !== false,
    heatCapacityTabContainerHeight: normalizeNullableNumber(file.heatCapacityTabContainerHeight) ?? fallback.heatCapacityTabContainerHeight,
    heatCapacityExperimentSeed: typeof file.heatCapacityExperimentSeed === 'string' || typeof file.heatCapacityExperimentSeed === 'number'
      ? file.heatCapacityExperimentSeed
      : null,
    heatCapacityExperimentProfile: normalizeHeatCapacityExperimentProfile(file.heatCapacityExperimentProfile),
    heatCapacityMode: file.heatCapacityMode === 'demo' || file.heatCapacityMode === 'guide' || file.heatCapacityMode === 'free'
      ? file.heatCapacityMode
      : fallback.heatCapacityMode,
    heatCapacityLessonIntroAutoShown: typeof file.heatCapacityLessonIntroAutoShown === 'boolean'
      ? file.heatCapacityLessonIntroAutoShown
      : true,
    heatCapacityTeachingStatus: file.heatCapacityTeachingStatus === 'running' || file.heatCapacityTeachingStatus === 'completed'
      ? file.heatCapacityTeachingStatus
      : fallback.heatCapacityTeachingStatus,
    heatCapacityFreeTrials,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeTraceStore,
    stopcockAngleDeg,
    glassPistonState: getHeatCapacityStopcockState(stopcockAngleDeg),
    ambientPressureKPa: normalizeNullableNumber(file.ambientPressureKPa) ?? fallback.ambientPressureKPa,
    ambientTemperatureK: normalizeNullableNumber(file.ambientTemperatureK) ?? fallback.ambientTemperatureK,
    gasPressureKPaAbs: normalizeNullableNumber(file.gasPressureKPaAbs) ?? fallback.gasPressureKPaAbs,
    gasTemperatureK: normalizeNullableNumber(file.gasTemperatureK) ?? fallback.gasTemperatureK,
    pressureDeltaKPa: normalizeNullableNumber(file.pressureDeltaKPa) ?? fallback.pressureDeltaKPa,
    simulationTimeS: normalizeNullableNumber(file.simulationTimeS) ?? fallback.simulationTimeS,
    lastUpdateMs: normalizeNullableNumber(file.lastUpdateMs),
    pressureSignalMvRaw: normalizeNullableNumber(file.pressureSignalMvRaw) ?? pressureSignalRawReadoutMv,
    pressureSignalMvDisplayed: normalizeNullableNumber(file.pressureSignalMvDisplayed) ?? pressureSignalReadoutMv,
    pressureInitialBiasMv,
    temperatureSignalTargetMv: normalizeNullableNumber(file.temperatureSignalTargetMv) ?? fallback.temperatureSignalTargetMv,
    pressureSignalTargetMv: normalizeNullableNumber(file.pressureSignalTargetMv) ?? pressureSignalReadoutMv,
    displayResponseLastUpdateMs: normalizeNullableNumber(file.displayResponseLastUpdateMs),
    pressureReleaseBurstUntilMs: normalizeNullableNumber(file.pressureReleaseBurstUntilMs),
    pressureZeroDisplayedSamples: Array.isArray(file.pressureZeroDisplayedSamples)
      ? file.pressureZeroDisplayedSamples
          .map((sample) => isRecord(sample)
            ? {
                atMs: normalizeNullableNumber(sample.atMs),
                valueMv: normalizeNullableNumber(sample.valueMv),
              }
            : null)
          .filter((sample): sample is { atMs: number; valueMv: number } => sample !== null && sample.atMs !== null && sample.valueMv !== null)
      : [],
    pressureZeroed: pressureZeroAdjusted,
    pressureZeroAdjusted,
    pressureZeroKnobAngle: normalizeNullableNumber(file.pressureZeroKnobAngle) ?? fallback.pressureZeroKnobAngle,
    pressureZeroOffset,
    pressureZeroDisplayText: typeof file.pressureZeroDisplayText === 'string'
      ? file.pressureZeroDisplayText
      : fallback.pressureZeroDisplayText,
    releaseRecoveryTargetDeltaKPa: normalizeNullableNumber(file.releaseRecoveryTargetDeltaKPa),
    pressureSignalRawReadoutMv,
    pressureSignalReadoutMv,
    pressureGaugeDisplayValue: normalizeNullableNumber(file.pressureGaugeDisplayValue) ?? fallback.pressureGaugeDisplayValue,
    gaugePressureMinKPa: normalizeNullableNumber(file.gaugePressureMinKPa) ?? fallback.gaugePressureMinKPa,
    gaugePressureMaxKPa: normalizeNullableNumber(file.gaugePressureMaxKPa) ?? fallback.gaugePressureMaxKPa,
    pressureSafetyThresholdKPa: normalizeNullableNumber(file.pressureSafetyThresholdKPa) ?? fallback.pressureSafetyThresholdKPa,
    pressureOverLimit: file.powerOn === true && (
      normalizeNullableNumber(file.pressureDeltaKPa) ?? fallback.pressureDeltaKPa
    ) >= (normalizeNullableNumber(file.pressureSafetyThresholdKPa) ?? fallback.pressureSafetyThresholdKPa),
    pressureZeroAdjustMode,
    temperatureSignalMv: normalizeNullableNumber(file.temperatureSignalMv),
    pressureSignalMv: normalizeNullableNumber(file.pressureSignalMv),
    pumpValveOpen: file.pumpValveOpen === true,
    pumpValveState: file.pumpValveOpen === true ? 'open' : 'closed',
    pumpBulbState: file.pumpBulbState === 'compressing' || file.pumpBulbState === 'releasing' ? file.pumpBulbState : 'idle',
    pumpStrokeTimestamps: Array.isArray(file.pumpStrokeTimestamps)
      ? file.pumpStrokeTimestamps.filter(isFiniteNumber)
      : [],
    pumpFrequency: normalizeNullableNumber(file.pumpFrequency) ?? fallback.pumpFrequency,
    pumpFrequencyStatus: file.pumpFrequencyStatus === 'tooSlow' || file.pumpFrequencyStatus === 'suitable' ? file.pumpFrequencyStatus : 'idle',
    lastPumpTime: normalizeNullableNumber(file.lastPumpTime),
    pumpStrokeCount: normalizeNullableNumber(file.pumpStrokeCount) ?? 0,
    pumpHint: typeof file.pumpHint === 'string' ? file.pumpHint : fallback.pumpHint,
    hardSphereViewEnabled: file.hardSphereViewEnabled === true,
    vesselPressureReadoutKPa: normalizeNullableNumber(file.vesselPressureReadoutKPa) ?? fallback.vesselPressureReadoutKPa,
    vesselTemperatureReadoutK: normalizeNullableNumber(file.vesselTemperatureReadoutK) ?? fallback.vesselTemperatureReadoutK,
    visualizationMode: file.visualizationMode === 'particle' ? file.visualizationMode : fallback.visualizationMode,
    calculationModel: file.calculationModel === 'airHeatCapacityRatio' ? file.calculationModel : fallback.calculationModel,
    pressureSensitivityMvPerKPa: normalizeNullableNumber(file.pressureSensitivityMvPerKPa) ?? fallback.pressureSensitivityMvPerKPa,
    recordedPressures: {
      ...fallback.recordedPressures,
      ...file.recordedPressures,
      p0: normalizeNullableNumber(file.recordedPressures?.p0) ?? fallback.recordedPressures.p0,
    },
    theoreticalGamma: getHeatCapacityFreeGasTypeGamma(normalizedFreeRuntimeFields.heatCapacityFreeGasType),
    heatCapacityProcessSamples: {
      ...fallback.heatCapacityProcessSamples,
      ...normalizeHeatCapacityProcessSamples(file.heatCapacityProcessSamples),
    },
  };
  return storeHeatCapacityFreeRuntimeFieldsInDomain(
    normalizedHeatCapacityFile,
    savedFreeParameterScheme,
  );
};
