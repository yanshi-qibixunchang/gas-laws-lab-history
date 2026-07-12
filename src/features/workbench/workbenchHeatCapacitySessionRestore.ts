import type { HeatCapacityTeachingProfile } from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import type { HeatCapacityRuntimePhase } from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
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
  getHeatCapacityGaugePressureState,
  getHeatCapacityStopcockTargetAngle,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  normalizeHeatCapacityFileName,
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  normalizeHeatCapacityFreeFileAcknowledgements,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import {
  heatCapacityRestoreFiniteOrDefault as finiteOrDefault,
  normalizeHeatCapacityFreeRestoreConfigSnapshot,
  normalizeHeatCapacityFreeRestoreDisplayScheme,
  normalizeHeatCapacityFreeRestoreCalibrationState,
  normalizeHeatCapacityFreeRestoreExperimentDomain,
  normalizeHeatCapacityFreeRestoreExperimentGroupStatus,
  normalizeHeatCapacityFreeRestoreParameterScheme,
  normalizeHeatCapacityFreeRestorePhysicsState,
  normalizeHeatCapacityFreeRestoreRecordConfig,
  normalizeHeatCapacityFreeRestoreRollbackSnapshots,
  normalizeHeatCapacityFreeRestoreSensorState,
  normalizeHeatCapacityFreeRestoreTraceStore,
  normalizeHeatCapacityFreeRestoreTrial,
} from './workbenchHeatCapacityFreeRestoreNormalization.ts';
import {
  createClosedHeatCapacityReleaseState,
  normalizeHeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  isPersistenceFiniteNumber as isFiniteNumber,
  isPersistenceRecord as isRecord,
  normalizePersistenceNullableNumber as normalizeNullableNumber,
} from './workbenchPersistenceValue.ts';
import {
  isHeatCapacityPanelKey,
  normalizeWorkbenchHeatCapacityTabIds,
} from './workbenchHeatCapacityTabRegistry.ts';
import {
  normalizeHeatCapacityFreePhysicsConfig,
  normalizeHeatCapacityFreeSensorConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';

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

const heatCapacityRuntimePhases = [
  'powerOff',
  'readyToZero',
  'zeroed',
  'readyToPump',
  'pumping',
  'sealedStabilizing',
  'releasing',
  'recovering',
] as const satisfies readonly HeatCapacityRuntimePhase[];

const normalizeHeatCapacityRuntimePhase = (
  value: unknown,
  fallback: HeatCapacityRuntimePhase,
): HeatCapacityRuntimePhase => (
  heatCapacityRuntimePhases.includes(value as HeatCapacityRuntimePhase)
    ? value as HeatCapacityRuntimePhase
    : fallback
);

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
    phase: normalizeHeatCapacityRuntimePhase(value.phase, 'readyToZero'),
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

export const normalizeHeatCapacitySessionRuntimeState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  const {
    selectedHeatCapacityPanel: discardedLegacySelectedPanel,
    heatCapacityFreeStopcockFlowOpen: discardedLegacyFlowOpen,
    heatCapacityFreeStopcockPendingOpenAtMs: discardedLegacyPendingOpen,
    heatCapacityFreeStopcockFlowPurpose: discardedLegacyFlowPurpose,
    ...fileWithoutLegacySelectedPanel
  } = file as WorkbenchHeatCapacityState & {
    selectedHeatCapacityPanel?: unknown;
    heatCapacityFreeStopcockFlowOpen?: unknown;
    heatCapacityFreeStopcockPendingOpenAtMs?: unknown;
    heatCapacityFreeStopcockFlowPurpose?: unknown;
  };
  void discardedLegacySelectedPanel;
  void discardedLegacyFlowOpen;
  void discardedLegacyPendingOpen;
  void discardedLegacyFlowPurpose;
  const fallback = createDefaultHeatCapacityFile(1);
  const heatCapacityVisiblePanels = file.visiblePanels.filter((panel) => (
    panel === 'preview' ||
    panel === 'realtime' ||
    isHeatCapacityPanelKey(panel)
  ));
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
  const savedFreePhysicsConfigRaw = savedFreeRuntimeCompatible && isRecord(file.heatCapacityFreePhysicsConfig)
    ? normalizeHeatCapacityFreePhysicsConfig(file.heatCapacityFreePhysicsConfig)
    : fallbackFreeRuntimeFields.heatCapacityFreePhysicsConfig;
  const savedFreeSensorConfig = isRecord(file.heatCapacityFreeSensorConfig)
    ? normalizeHeatCapacityFreeSensorConfig(file.heatCapacityFreeSensorConfig)
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
  const savedFreePhysicsState = normalizeHeatCapacityFreeRestorePhysicsState(
    savedFreeRuntimeCompatible ? file.heatCapacityFreePhysicsState : null,
    {
      ...fallbackFreeRuntimeFields.heatCapacityFreePhysicsState,
      gasTemperatureK: savedFreePhysicsConfig.environment.ambientTemperatureK,
      wallTemperatureK: savedFreePhysicsConfig.environment.ambientTemperatureK,
      effectiveAmbientPressureKPa: savedFreePhysicsConfig.environment.ambientPressureKPa,
      effectiveAmbientTemperatureK: savedFreePhysicsConfig.environment.ambientTemperatureK,
    },
  );
  const savedFreeSensorState = normalizeHeatCapacityFreeRestoreSensorState(
    savedFreeRuntimeCompatible ? file.heatCapacityFreeSensorState : null,
    fallbackFreeRuntimeFields.heatCapacityFreeSensorState,
  );
  const savedFreeCalibrationState = normalizeHeatCapacityFreeRestoreCalibrationState(
    savedFreeRuntimeCompatible ? file.heatCapacityFreeCalibrationState : null,
    fallbackFreeRuntimeFields.heatCapacityFreeCalibrationState,
  );
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
        heatCapacityFreePhysicsState: savedFreePhysicsState,
        heatCapacityFreeSensorConfig: savedFreeSensorConfig,
        heatCapacityFreeSensorState: savedFreeSensorState,
        heatCapacityFreeCalibrationState: savedFreeCalibrationState,
        heatCapacityReleaseState: normalizeHeatCapacityReleaseState(
          file.heatCapacityReleaseState,
          createClosedHeatCapacityReleaseState(savedFreePhysicsState.simulationTimeS),
        ),
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
  const activeFreeDomain = savedFreeParameterScheme === 'ideal'
    ? heatCapacityFreeIdealDomain
    : heatCapacityFreeRealDomain;
  const heatCapacityFreeRollbackSnapshots = normalizeHeatCapacityFreeRestoreRollbackSnapshots(
    file.heatCapacityFreeRollbackSnapshots,
    activeFreeDomain,
  );
  const normalizedHeatCapacityMode = file.heatCapacityMode === 'demo' || file.heatCapacityMode === 'guide' || file.heatCapacityMode === 'free'
    ? file.heatCapacityMode
    : fallback.heatCapacityMode;
  const normalizedPowerOn = file.powerOn === true;
  const normalizedReleaseState = normalizeHeatCapacityReleaseState(
    file.heatCapacityReleaseState ?? activeFreeDomain.releaseState,
    createClosedHeatCapacityReleaseState(
      normalizedHeatCapacityMode === 'guide'
        ? file.heatCapacityGuidePhysicsState.simulationTimeS
        : savedFreePhysicsState.simulationTimeS,
    ),
  );
  const normalizedStopcockOpen = normalizedReleaseState.phase === 'opening' ||
    normalizedReleaseState.phase === 'open' ||
    normalizedReleaseState.phase === 'releasing';
  const normalizedPressureDeltaKPa = normalizeNullableNumber(file.pressureDeltaKPa) ?? fallback.pressureDeltaKPa;
  const restoredGaugeDisplayValue = normalizeNullableNumber(file.pressureGaugeDisplayValue);
  const gaugePressureState = getHeatCapacityGaugePressureState(
    normalizedPressureDeltaKPa,
    normalizedPowerOn,
    {
      ...file,
      heatCapacityMode: normalizedHeatCapacityMode,
      heatCapacityFreeRecordConfig: normalizedFreeRuntimeFields.heatCapacityFreeRecordConfig,
      heatCapacityFreePressureWarningMv: normalizedFreeRuntimeFields.heatCapacityFreePressureWarningMv,
      heatCapacityFreeSensorConfig: normalizedFreeRuntimeFields.heatCapacityFreeSensorConfig,
    },
    restoredGaugeDisplayValue ?? undefined,
  );
  const normalizedHeatCapacityFile: WorkbenchHeatCapacityState = {
    ...fallback,
    ...fileWithoutLegacySelectedPanel,
    ...normalizedFreeRuntimeFields,
    heatCapacityFreeParameterScheme: savedFreeParameterScheme,
    heatCapacityFreeDisplayScheme: savedFreeDisplayScheme,
    heatCapacityFreeRealDomain,
    heatCapacityFreeIdealDomain,
    heatCapacityFreeRollbackSnapshots,
    name: normalizeHeatCapacityFileName(file.name),
    lastOpenedAt: normalizeLastOpenedAt(file, fallback.lastOpenedAt),
    visiblePanels: heatCapacityVisiblePanels.length > 0 ? heatCapacityVisiblePanels : fallback.visiblePanels,
    runState: file.runState === 'running' ? 'paused' : file.runState,
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
      file.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
    ),
    openHeatCapacityTabs,
    activeHeatCapacityTabId,
    heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded !== false,
    heatCapacityTabContainerHeight: normalizeNullableNumber(file.heatCapacityTabContainerHeight) ?? fallback.heatCapacityTabContainerHeight,
    heatCapacityExperimentSeed: typeof file.heatCapacityExperimentSeed === 'string' || typeof file.heatCapacityExperimentSeed === 'number'
      ? file.heatCapacityExperimentSeed
      : null,
    heatCapacityExperimentProfile: normalizeHeatCapacityExperimentProfile(file.heatCapacityExperimentProfile),
    heatCapacityMode: normalizedHeatCapacityMode,
    heatCapacityLessonIntroAutoShown: typeof file.heatCapacityLessonIntroAutoShown === 'boolean'
      ? file.heatCapacityLessonIntroAutoShown
      : true,
    heatCapacityTeachingStatus: file.heatCapacityTeachingStatus === 'running' || file.heatCapacityTeachingStatus === 'completed'
      ? file.heatCapacityTeachingStatus
      : fallback.heatCapacityTeachingStatus,
    heatCapacityPhase: normalizeHeatCapacityRuntimePhase(file.heatCapacityPhase, fallback.heatCapacityPhase),
    powerOn: normalizedPowerOn,
    heatCapacityFreeTrials,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeTraceStore,
    heatCapacityReleaseState: normalizedReleaseState,
    stopcockAngleDeg: getHeatCapacityStopcockTargetAngle(normalizedStopcockOpen),
    glassPistonState: normalizedStopcockOpen ? 'open' : 'closed',
    ambientPressureKPa: normalizeNullableNumber(file.ambientPressureKPa) ?? fallback.ambientPressureKPa,
    ambientTemperatureK: normalizeNullableNumber(file.ambientTemperatureK) ?? fallback.ambientTemperatureK,
    gasPressureKPaAbs: normalizeNullableNumber(file.gasPressureKPaAbs) ?? fallback.gasPressureKPaAbs,
    gasTemperatureK: normalizeNullableNumber(file.gasTemperatureK) ?? fallback.gasTemperatureK,
    pressureDeltaKPa: normalizedPressureDeltaKPa,
    simulationTimeS: normalizeNullableNumber(file.simulationTimeS) ?? fallback.simulationTimeS,
    lastUpdateMs: normalizeNullableNumber(file.lastUpdateMs),
    pressureSignalMvRaw: normalizeNullableNumber(file.pressureSignalMvRaw) ?? pressureSignalRawReadoutMv,
    pressureSignalMvDisplayed: normalizeNullableNumber(file.pressureSignalMvDisplayed) ?? pressureSignalReadoutMv,
    pressureInitialBiasMv,
    temperatureSignalTargetMv: normalizeNullableNumber(file.temperatureSignalTargetMv) ?? fallback.temperatureSignalTargetMv,
    pressureSignalTargetMv: normalizeNullableNumber(file.pressureSignalTargetMv) ?? pressureSignalReadoutMv,
    displayResponseLastUpdateMs: normalizeNullableNumber(file.displayResponseLastUpdateMs),
    pressureDisplayJitterOffset: normalizeNullableNumber(file.pressureDisplayJitterOffset) ?? fallback.pressureDisplayJitterOffset,
    pressureDisplayNextJitterAtMs: normalizeNullableNumber(file.pressureDisplayNextJitterAtMs) ?? fallback.pressureDisplayNextJitterAtMs,
    temperatureDisplayJitterOffset: normalizeNullableNumber(file.temperatureDisplayJitterOffset) ?? fallback.temperatureDisplayJitterOffset,
    temperatureDisplayNextJitterAtMs: normalizeNullableNumber(file.temperatureDisplayNextJitterAtMs) ?? fallback.temperatureDisplayNextJitterAtMs,
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
    pressureGaugeTargetValue: gaugePressureState.pressureGaugeTargetValue,
    pressureGaugeDisplayValue: gaugePressureState.pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: gaugePressureState.pressureGaugeNeedleAngle,
    gaugePressureMinKPa: gaugePressureState.gaugePressureMinKPa,
    gaugePressureMaxKPa: gaugePressureState.gaugePressureMaxKPa,
    pressureWarningThresholdKPa: gaugePressureState.pressureWarningThresholdKPa,
    pressureSafeThresholdKPa: gaugePressureState.pressureSafeThresholdKPa,
    pressureSafetyThresholdKPa: gaugePressureState.pressureSafetyThresholdKPa,
    pressureSafetyStatus: gaugePressureState.pressureSafetyStatus,
    pressureSafetyMessage: gaugePressureState.pressureSafetyMessage,
    pressureBlockedPumping: gaugePressureState.pressureBlockedPumping,
    pressureOverLimit: gaugePressureState.pressureOverLimit,
    pressureZeroMvPerTurn: fallback.pressureZeroMvPerTurn,
    pressureZeroAdjustMode,
    temperatureSignalMv: normalizeNullableNumber(file.temperatureSignalMv),
    pressureSignalMv: normalizeNullableNumber(file.pressureSignalMv),
    pressureKPa: normalizeNullableNumber(file.pressureKPa),
    pressureLimitKPa: normalizeNullableNumber(file.pressureLimitKPa) ?? fallback.pressureLimitKPa,
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
    pressureSensitivityMvPerKPa: gaugePressureState.pressureSensitivityMvPerKPa,
    recordedPressures: {
      p0: normalizeNullableNumber(file.recordedPressures?.p0) ?? fallback.recordedPressures.p0,
      p1: normalizeNullableNumber(file.recordedPressures?.p1) ?? fallback.recordedPressures.p1,
      p2: normalizeNullableNumber(file.recordedPressures?.p2) ?? fallback.recordedPressures.p2,
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
