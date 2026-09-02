import {
  normalizeHeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import type { HeatCapacityRuntimePhase } from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import {
  createHeatCapacityFreeParameterDraftFromConfigs,
  getHeatCapacityFreeGasTypeGamma,
  normalizeHeatCapacityFreeGasType,
  normalizeHeatCapacityFreeParameterDraft,
  resolveHeatCapacityFreeGasTypeFromGamma,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  clampWorkbenchLiveSplitRatio,
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityFreeExperimentDomainState,
  createDefaultHeatCapacityFreeRuntimeFields,
  applyHeatCapacityFreeDomainToRuntimeFields,
  applyCurrentHeatCapacityFreeExperimentGroupToRuntimeFields,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  normalizeHeatCapacityFileName,
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  normalizeHeatCapacityFreeFileAcknowledgements,
  projectHeatCapacityFreeExperimentGroupToDomain,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
} from './workbenchState.ts';
import {
  applyHeatCapacityPressureZero,
  getHeatCapacityGaugePressureState,
  getHeatCapacityStopcockTargetAngle,
} from './workbenchHeatCapacityInstrumentState.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';
import {
  heatCapacityRestoreFiniteOrDefault as finiteOrDefault,
  normalizeHeatCapacityFreeRestoreDisplayScheme,
  normalizeHeatCapacityFreeRestoreCalibrationState,
  normalizeHeatCapacityFreeRestoreExperimentDomainResult,
  normalizeHeatCapacityFreeRestoreExperimentGroupStatus,
  normalizeHeatCapacityFreeRestoreParameterScheme,
  normalizeHeatCapacityFreeRestorePhysicsState,
  normalizeHeatCapacityFreeRestoreRecordConfig,
  normalizeHeatCapacityFreeRestoreSensorState,
  type HeatCapacityFreeRestoreAggregateResult,
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
import {
  calculateHeatCapacityFreeCalculationReference,
  calculateHeatCapacityGuideCalculationReference,
  normalizeHeatCapacityCalculationWorkflowSessionForTrials,
  normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence,
  normalizeHeatCapacityModeSessionStore,
} from './workbenchHeatCapacityModeSession.ts';
import {
  selectCurrentHeatCapacityFreeExperimentGroup,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  migrateLegacyHeatCapacityFreeExperimentGroups,
} from './workbenchHeatCapacityExperimentGroupMigration.ts';

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

export interface HeatCapacityFreeDomainRecoveryDiagnostic {
  fileId: string;
  domain: 'real' | 'ideal';
  status: 'unsupported-future' | 'quarantined';
  sourceVersion: unknown;
  reason: string;
  fieldPath?: string;
  recovery: 'use-safe-default-domain';
  raw: unknown;
}

export interface HeatCapacitySessionRuntimeRestoreResult {
  value: WorkbenchHeatCapacityState;
  diagnostics: HeatCapacityFreeDomainRecoveryDiagnostic[];
}

const createHeatCapacityFreeDomainRecoveryDiagnostic = (
  fileId: string,
  domain: 'real' | 'ideal',
  result: Extract<HeatCapacityFreeRestoreAggregateResult, { ok: false }>,
): HeatCapacityFreeDomainRecoveryDiagnostic => ({
  fileId,
  domain,
  status: result.status,
  sourceVersion: result.sourceVersion,
  reason: result.reason,
  ...(result.fieldPath === undefined ? {} : { fieldPath: result.fieldPath }),
  recovery: 'use-safe-default-domain',
  raw: result.raw,
});

export const normalizeHeatCapacitySessionRuntimeStateResult = (
  file: WorkbenchHeatCapacityState,
): HeatCapacitySessionRuntimeRestoreResult => {
  const recoveryDiagnostics: HeatCapacityFreeDomainRecoveryDiagnostic[] = [];
  const {
    selectedHeatCapacityPanel: discardedLegacySelectedPanel,
    heatCapacityFreeStopcockFlowOpen: discardedLegacyFlowOpen,
    heatCapacityFreeStopcockPendingOpenAtMs: discardedLegacyPendingOpen,
    heatCapacityFreeStopcockFlowPurpose: discardedLegacyFlowPurpose,
    heatCapacityFreeActiveRunConfigSnapshot: discardedLegacyActiveRunConfigSnapshot,
    heatCapacityFreeBatch: discardedLegacyBatch,
    heatCapacityFreeTraceStore: discardedLegacyTraceStore,
    heatCapacityFreeTrials: discardedLegacyTrials,
    heatCapacityFreeActiveAttempt: discardedLegacyActiveAttempt,
    ...fileWithoutLegacySelectedPanel
  } = file as WorkbenchHeatCapacityState & {
    selectedHeatCapacityPanel?: unknown;
    heatCapacityFreeStopcockFlowOpen?: unknown;
    heatCapacityFreeStopcockPendingOpenAtMs?: unknown;
    heatCapacityFreeStopcockFlowPurpose?: unknown;
    heatCapacityFreeActiveRunConfigSnapshot?: unknown;
    heatCapacityFreeBatch?: unknown;
    heatCapacityFreeTraceStore?: unknown;
    heatCapacityFreeTrials?: unknown;
    heatCapacityFreeActiveAttempt?: unknown;
  };
  void discardedLegacySelectedPanel;
  void discardedLegacyFlowOpen;
  void discardedLegacyPendingOpen;
  void discardedLegacyFlowPurpose;
  void discardedLegacyActiveRunConfigSnapshot;
  void discardedLegacyBatch;
  void discardedLegacyTraceStore;
  void discardedLegacyTrials;
  void discardedLegacyActiveAttempt;
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
        heatCapacityFreeRollbackSnapshots: isRecord(file.heatCapacityFreeRollbackSnapshots)
          ? file.heatCapacityFreeRollbackSnapshots as typeof fallbackFreeRuntimeFields.heatCapacityFreeRollbackSnapshots
          : fallbackFreeRuntimeFields.heatCapacityFreeRollbackSnapshots,
      }
    : fallbackFreeRuntimeFields;
  const fallbackRealDomain = createDefaultHeatCapacityFreeExperimentDomainState(
    'real',
    `session-${file.id}:real`,
  );
  const realDomainResult = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    file.heatCapacityFreeRealDomain,
    'real',
    savedFreeParameterDraft.gasType,
    fallbackRealDomain,
  );
  let heatCapacityFreeRealDomain = fallbackRealDomain;
  if (realDomainResult.ok === false) {
    recoveryDiagnostics.push(
      createHeatCapacityFreeDomainRecoveryDiagnostic(
        file.id,
        'real',
        realDomainResult,
      ),
    );
  } else {
    heatCapacityFreeRealDomain = realDomainResult.value;
  }
  const fallbackIdealDomain = createDefaultHeatCapacityFreeExperimentDomainState(
    'ideal',
    `session-${file.id}:ideal`,
  );
  const idealDomainResult = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    file.heatCapacityFreeIdealDomain,
    'ideal',
    'air',
    fallbackIdealDomain,
  );
  let heatCapacityFreeIdealDomain = fallbackIdealDomain;
  if (idealDomainResult.ok === false) {
    recoveryDiagnostics.push(
      createHeatCapacityFreeDomainRecoveryDiagnostic(
        file.id,
        'ideal',
        idealDomainResult,
      ),
    );
  } else {
    heatCapacityFreeIdealDomain = idealDomainResult.value;
  }
  const selectedDomainBeforeGroupProjection = savedFreeParameterScheme === 'ideal'
    ? heatCapacityFreeIdealDomain
    : heatCapacityFreeRealDomain;
  const normalizedExperimentGroups =
    normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence(
      file.heatCapacityFreeExperimentGroups,
    ) ?? migrateLegacyHeatCapacityFreeExperimentGroups({
      fileId: file.id,
      selectedScheme: savedFreeParameterScheme,
      real: heatCapacityFreeRealDomain,
      ideal: heatCapacityFreeIdealDomain,
      fallbackCreatedAtMs: file.createdAt,
    });
  const currentExperimentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    normalizedExperimentGroups,
  );
  const activeFreeDomainBase = currentExperimentGroup?.scheme === savedFreeParameterScheme
    ? projectHeatCapacityFreeExperimentGroupToDomain(
        selectedDomainBeforeGroupProjection,
        currentExperimentGroup,
      )
    : selectedDomainBeforeGroupProjection;
  const completedFreeTrials = activeFreeDomainBase.trials
    .filter((trial) => (
      trial.completedAtMs !== null &&
      trial.u1 !== null &&
      trial.u2 !== null &&
      trial.correctedSignals !== null
    ));
  const freeCalculationGroups = activeFreeDomainBase.batch.frozenConfigSnapshot === null
    ? []
    : completedFreeTrials.flatMap((trial) => {
        const reference = calculateHeatCapacityFreeCalculationReference(
          trial,
          activeFreeDomainBase.batch.frozenConfigSnapshot!,
        );
        return reference === null ? [] : [{ trialId: trial.id, reference }];
      });
  const activeFreeDomain = {
    ...activeFreeDomainBase,
    batch: {
      ...activeFreeDomainBase.batch,
      calculationSession: (
        activeFreeDomainBase.batch.experimentCompletedAtMs !== null &&
        activeFreeDomainBase.batch.targetGroupCount === completedFreeTrials.length &&
        freeCalculationGroups.length === completedFreeTrials.length &&
        activeFreeDomainBase.batch.frozenConfigSnapshot !== null
      )
        ? normalizeHeatCapacityCalculationWorkflowSessionForTrials(
            activeFreeDomainBase.batch.calculationSession,
            {
              mode: 'free',
              groups: freeCalculationGroups,
              theoreticalGamma:
                activeFreeDomainBase.batch.frozenConfigSnapshot.physics.gamma,
              presentation: 'interactive',
            },
          )
        : null,
    },
  };
  const heatCapacityFreeRollbackSnapshots = activeFreeDomain.rollbackSnapshots;
  const normalizedHeatCapacityMode = file.heatCapacityMode === 'demo' || file.heatCapacityMode === 'guide' || file.heatCapacityMode === 'free'
    ? file.heatCapacityMode
    : fallback.heatCapacityMode;
  const guideCalculationReference = file.heatCapacityGuideTrial === null
    ? null
    : calculateHeatCapacityGuideCalculationReference(
        file.heatCapacityGuideTrial,
        file.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa,
        file.pressureSensitivityMvPerKPa,
      );
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
    heatCapacityFreeRealDomain: savedFreeParameterScheme === 'real'
      ? activeFreeDomain
      : heatCapacityFreeRealDomain,
    heatCapacityFreeIdealDomain: savedFreeParameterScheme === 'ideal'
      ? activeFreeDomain
      : heatCapacityFreeIdealDomain,
    heatCapacityFreeExperimentGroups: normalizedExperimentGroups,
    heatCapacityFreeRunWorkspace: {
      batch: activeFreeDomain.batch,
      traceStore: activeFreeDomain.traceStore,
      trials: activeFreeDomain.trials,
      activeAttempt: activeFreeDomain.activeAttempt,
    },
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
    heatCapacityExperimentProfile: normalizeHeatCapacityTeachingProfile(file.heatCapacityExperimentProfile),
    heatCapacityMode: normalizedHeatCapacityMode,
    heatCapacityModeSessions: normalizeHeatCapacityModeSessionStore(file.heatCapacityModeSessions, file.id),
    heatCapacityLessonIntroAutoShown: typeof file.heatCapacityLessonIntroAutoShown === 'boolean'
      ? file.heatCapacityLessonIntroAutoShown
      : true,
    heatCapacityTeachingStatus: file.heatCapacityTeachingStatus === 'running' || file.heatCapacityTeachingStatus === 'completed'
      ? file.heatCapacityTeachingStatus
      : fallback.heatCapacityTeachingStatus,
    heatCapacityGuideCalculationSession:
      file.heatCapacityGuideTrial === null || guideCalculationReference === null
        ? null
        : normalizeHeatCapacityCalculationWorkflowSessionForTrials(
            file.heatCapacityGuideCalculationSession,
            {
              mode: file.heatCapacityGuideTrial.source,
              groups: [{
                trialId: file.heatCapacityGuideTrial.id,
                reference: guideCalculationReference,
              }],
              theoreticalGamma: file.heatCapacityGuidePhysicsConfig.gamma,
              presentation: file.heatCapacityGuideTrial.source === 'demo'
                ? 'system-readonly'
                : 'interactive',
            },
          ),
    heatCapacityFreePreheatCompleted: Object.prototype.hasOwnProperty.call(file, 'heatCapacityFreePreheatCompleted')
      ? file.heatCapacityFreePreheatCompleted === true
      : true,
    heatCapacityPhase: normalizeHeatCapacityRuntimePhase(file.heatCapacityPhase, fallback.heatCapacityPhase),
    powerOn: normalizedPowerOn,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
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
    pressureZeroed: file.pressureZeroed === true,
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
    theoreticalGamma: normalizedHeatCapacityMode === 'free'
      ? getHeatCapacityFreeGasTypeGamma(normalizedFreeRuntimeFields.heatCapacityFreeGasType)
      : normalizeNullableNumber(file.heatCapacityGuidePhysicsConfig.gamma) ??
        fallback.heatCapacityGuidePhysicsConfig.gamma,
    heatCapacityProcessSamples: {
      ...fallback.heatCapacityProcessSamples,
      ...normalizeHeatCapacityProcessSamples(file.heatCapacityProcessSamples),
    },
  };
  // Legacy session normalization must keep the decoded domain aggregate until
  // its group migration and later persistence capture have reconciled caches.
  const fileWithMigratedActiveProjection =
    applyCurrentHeatCapacityFreeExperimentGroupToRuntimeFields(
      applyHeatCapacityFreeDomainToRuntimeFields(
        normalizedHeatCapacityFile,
        activeFreeDomain,
      ),
    );
  const value = normalizedHeatCapacityMode === 'free'
    ? fileWithMigratedActiveProjection
    : {
        ...fileWithMigratedActiveProjection,
        heatCapacityReleaseState: normalizedHeatCapacityFile.heatCapacityReleaseState,
      };
  return { value, diagnostics: recoveryDiagnostics };
};

export const normalizeHeatCapacitySessionRuntimeState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => (
  normalizeHeatCapacitySessionRuntimeStateResult(file).value
);
