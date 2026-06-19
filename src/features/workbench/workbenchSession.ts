import {
  clampWorkbenchLiveSplitRatio,
  applyHeatCapacityPressureZero,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  createDefaultHeatCapacityFreeRuntimeFields,
  createDefaultHeatCapacityFile,
  getHeatCapacityStopcockTargetAngle,
  getHeatCapacityStopcockState,
  normalizeHeatCapacityStopcockAngle,
  normalizeHeatCapacityFileName,
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  normalizeHeatCapacityFreePhysicsConfig,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  type WorkbenchFileState,
  type WorkbenchPanelKey,
  type WorkbenchHeatCapacityTabId,
} from './workbenchState.ts';
import {
  createDefaultHeatCapacityProcessingResult,
  createHeatCapacityTrials,
  normalizeHeatCapacityExpectedTrialCount,
  normalizeHeatCapacityTrial,
  resizeHeatCapacityTrials,
} from '../../domain/heatCapacity/heatCapacityTrialModel.ts';
import type {
  HeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityExperimentRandom.ts';
import {
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeRecordInput,
  type HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createHeatCapacityFreeParameterDraftFromConfigs,
  normalizeHeatCapacityFreeParameterDraft,
  type HeatCapacityFreeExperimentGroupStatus,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  type HeatCapacityFreeConfigSnapshot,
  type HeatCapacityFreeTraceBranch,
  type HeatCapacityFreeTraceStore,
  type HeatCapacityFreeTraceTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  normalizeFreePumpValveExchangeConfig,
} from '../../domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts';
import {
  normalizeFreeEnvironmentDisturbanceConfig,
} from '../../domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts';
import {
  decodeWorkbenchClosedFilesStorageEnvelope,
  decodeWorkbenchStorageEnvelope,
  encodeWorkbenchClosedFilesStorageEnvelope,
  encodeWorkbenchStorageEnvelope,
} from './workbenchPersistenceMigration.ts';
import {
  normalizeHardSphereEngineSnapshot,
} from './workbenchHardSpherePersistence.ts';

export const WORKBENCH_SESSION_VERSION = 1;
export const WORKBENCH_SESSION_STORAGE_KEY = 'hsl_workbench_session_v1';
export const WORKBENCH_CLOSED_FILES_STORAGE_KEY = 'hsl_workbench_closed_files_v1';

export interface WorkbenchSessionState {
  version: typeof WORKBENCH_SESSION_VERSION;
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

const panelKeys: WorkbenchPanelKey[] = ['preview', 'realtime', 'results', 'experimentPoints', 'verification', 'heatCapacityGuide', 'heatCapacityRecords', 'heatCapacityProcessing', 'heatCapacityReview', 'history'];
const heatCapacityTabIds: WorkbenchHeatCapacityTabId[] = ['guide', 'records', 'processing', 'review'];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const normalizeHeatCapacityExperimentProfile = (value: unknown): HeatCapacityTeachingProfile | null => (
  isRecord(value) && normalizeNullableNumber(value.u1MeasuredMv) !== null && normalizeNullableNumber(value.u2MeasuredMv) !== null
    ? value as unknown as HeatCapacityTeachingProfile
    : null
);

const normalizeNullableNumber = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const normalizeLastOpenedAt = (file: WorkbenchFileState, fallback: number) => (
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

const normalizeHeatCapacityFreeTrial = (value: unknown): HeatCapacityFreeTrial | null => {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  const normalizeFreeRecord = (record: unknown): HeatCapacityFreeTrial['u0'] => (
    isRecord(record)
      ? normalizeHeatCapacityFreeRecordInput(record as unknown as HeatCapacityFreeRecordInput)
      : null
  );
  const normalizeCorrectedSignals = (signals: unknown): HeatCapacityFreeTrial['correctedSignals'] => {
    if (!isRecord(signals)) return null;
    const U0DisplayMv = normalizeNullableNumber(signals.U0DisplayMv);
    const U1DisplayMv = normalizeNullableNumber(signals.U1DisplayMv);
    const U2DisplayMv = normalizeNullableNumber(signals.U2DisplayMv);
    const U1CorrectedMv = normalizeNullableNumber(signals.U1CorrectedMv);
    const U2CorrectedMv = normalizeNullableNumber(signals.U2CorrectedMv);
    const gamma = normalizeNullableNumber(signals.gamma);
    if (
      U0DisplayMv === null ||
      U1DisplayMv === null ||
      U2DisplayMv === null ||
      U1CorrectedMv === null ||
      U2CorrectedMv === null ||
      gamma === null
    ) {
      return null;
    }
    return {
      calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
      atmosphericPressureKPa: normalizeNullableNumber(signals.atmosphericPressureKPa) ?? 101.3,
      pressureSensitivityMvPerKPa: normalizeNullableNumber(signals.pressureSensitivityMvPerKPa) ?? 20,
      U0DisplayMv,
      U1DisplayMv,
      U2DisplayMv,
      U1CorrectedMv,
      U2CorrectedMv,
      gamma,
    };
  };
  return {
    id: value.id,
    source: 'free',
    traceTrialId: typeof value.traceTrialId === 'string' ? value.traceTrialId : null,
    branchCount: normalizeNullableNumber(value.branchCount) ?? 0,
    automaticU0: isRecord(value.automaticU0)
      ? value.automaticU0 as HeatCapacityFreeTrial['automaticU0']
      : null,
    u0: normalizeFreeRecord(value.u0),
    u1: normalizeFreeRecord(value.u1),
    u2: normalizeFreeRecord(value.u2),
    blockedReason: typeof value.blockedReason === 'string'
      ? value.blockedReason as HeatCapacityFreeTrial['blockedReason']
      : null,
    correctedSignals: isRecord(value.u0) ? normalizeCorrectedSignals(value.correctedSignals) : null,
    configSnapshot: normalizeHeatCapacityFreeConfigSnapshot(value.configSnapshot),
  };
};

const finiteOrDefault = (value: unknown, fallback: number) => (
  normalizeNullableNumber(value) ?? fallback
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
): HeatCapacityFreeExperimentGroupStatus => (
  value === 'running' || value === 'completed' ? value : 'draft'
);

const normalizeHeatCapacityFreeConfigSnapshot = (
  value: unknown,
): HeatCapacityFreeConfigSnapshot | null => {
  if (!isRecord(value)) return null;
  const fallback = createDefaultFreeConfigSnapshot();
  const record = isRecord(value.record) ? value.record : {};
  const physics = isRecord(value.physics) ? value.physics : {};
  const {
    releaseResponseDelayS: _legacyReleaseResponseDelayS,
    releaseMainDurationS: _legacyReleaseMainDurationS,
    pumpTemperatureGainK: _legacyPumpTemperatureGainK,
    ...physicsRest
  } = physics;
  const pumpValveExchange = isRecord(physics.pumpValveExchange) ? physics.pumpValveExchange : {};
  const environmentDisturbance = isRecord(physics.environmentDisturbance)
    ? physics.environmentDisturbance
    : {};
  return {
    ...fallback,
    ...value,
    version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    environment: isRecord(value.environment)
      ? {
          ...fallback.environment,
          ambientPressureKPa: finiteOrDefault(
            value.environment.ambientPressureKPa,
            fallback.environment.ambientPressureKPa,
          ),
          ambientTemperatureK: finiteOrDefault(
            value.environment.ambientTemperatureK,
            fallback.environment.ambientTemperatureK,
          ),
        }
      : fallback.environment,
    physics: {
      ...fallback.physics,
      ...physicsRest,
      pumpInflowTemperatureRiseK: finiteOrDefault(
        physics.pumpInflowTemperatureRiseK,
        finiteOrDefault(
          _legacyPumpTemperatureGainK,
          fallback.physics.pumpInflowTemperatureRiseK,
        ),
      ),
      releaseVisualResponseDelayS: finiteOrDefault(
        physics.releaseVisualResponseDelayS,
        finiteOrDefault(
          _legacyReleaseResponseDelayS,
          fallback.physics.releaseVisualResponseDelayS,
        ),
      ),
      releaseVisualMainDurationS: finiteOrDefault(
        physics.releaseVisualMainDurationS,
        finiteOrDefault(
          _legacyReleaseMainDurationS,
          fallback.physics.releaseVisualMainDurationS,
        ),
      ),
      thermal: {
        ...fallback.physics.thermal,
        ...(isRecord(physics.thermal) ? physics.thermal : {}),
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
        chamberTemperatureRiseK: finiteOrDefault(
          pumpValveExchange.chamberTemperatureRiseK,
          fallback.physics.pumpValveExchange?.chamberTemperatureRiseK ?? 1.5,
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
        ...fallback.physics.leakage,
        ...(isRecord(physics.leakage) ? physics.leakage : {}),
      },
    },
    sensor: {
      ...fallback.sensor,
      ...(isRecord(value.sensor) ? value.sensor : {}),
    },
    record: {
      ...fallback.record,
      ...(isRecord(value.record) ? value.record : {}),
      u0ZeroToleranceMv: finiteOrDefault(record.u0ZeroToleranceMv, fallback.record.u0ZeroToleranceMv),
    },
    scoring: {
      ...fallback.scoring,
      ...(isRecord(value.scoring) ? value.scoring : {}),
    },
  } as HeatCapacityFreeConfigSnapshot;
};

const normalizeHeatCapacityFreeTraceBranch = (value: unknown): HeatCapacityFreeTraceBranch | null => {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  return {
    id: value.id,
    parentBranchId: typeof value.parentBranchId === 'string' ? value.parentBranchId : null,
    createdByEventId: typeof value.createdByEventId === 'string' ? value.createdByEventId : null,
    status: value.status === 'archived' ? 'archived' : 'main',
    hiddenInDefaultChart: value.hiddenInDefaultChart === true,
    nextSampleIndex: normalizeNullableNumber(value.nextSampleIndex) ?? 1,
    nextEventIndex: normalizeNullableNumber(value.nextEventIndex) ?? 1,
    nextSampleAtS: normalizeNullableNumber(value.nextSampleAtS),
    lastKeptSampleId: typeof value.lastKeptSampleId === 'string' ? value.lastKeptSampleId : null,
    idleState: isRecord(value.idleState)
      ? {
          lastUserActionAtS: normalizeNullableNumber(value.idleState.lastUserActionAtS),
          dormantSinceS: normalizeNullableNumber(value.idleState.dormantSinceS),
          lastHeartbeatAtS: normalizeNullableNumber(value.idleState.lastHeartbeatAtS),
        }
      : {
          lastUserActionAtS: null,
          dormantSinceS: null,
          lastHeartbeatAtS: null,
        },
    samples: Array.isArray(value.samples)
      ? value.samples.filter(isRecord) as unknown as HeatCapacityFreeTraceBranch['samples']
      : [],
    events: Array.isArray(value.events)
      ? value.events.filter(isRecord) as unknown as HeatCapacityFreeTraceBranch['events']
      : [],
  };
};

const normalizeHeatCapacityFreeTraceTrial = (value: unknown): HeatCapacityFreeTraceTrial | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.branches)) return null;
  const branches = value.branches
    .map(normalizeHeatCapacityFreeTraceBranch)
    .filter((branch): branch is HeatCapacityFreeTraceBranch => branch !== null);
  if (branches.length === 0) return null;
  const activeBranchId = typeof value.activeBranchId === 'string' &&
    branches.some((branch) => branch.id === value.activeBranchId)
    ? value.activeBranchId
    : branches[0].id;
  return {
    id: value.id,
    linkedTrialId: typeof value.linkedTrialId === 'string' ? value.linkedTrialId : null,
    status: value.status === 'completed' || value.status === 'discarded' ? value.status : 'active',
    activeBranchId,
    nextBranchIndex: normalizeNullableNumber(value.nextBranchIndex) ?? branches.length + 1,
    branches,
    configSnapshot: isRecord(value.configSnapshot)
      ? value.configSnapshot as unknown as HeatCapacityFreeTraceTrial['configSnapshot']
      : createDefaultFreeConfigSnapshot(),
  } as HeatCapacityFreeTraceTrial;
};

const normalizeHeatCapacityFreeTraceStore = (value: unknown): HeatCapacityFreeTraceStore => {
  if (!isRecord(value) || !Array.isArray(value.traceTrials)) {
    return createDefaultFreeTraceStore();
  }
  const traceTrials = value.traceTrials
    .map(normalizeHeatCapacityFreeTraceTrial)
    .filter((trial): trial is HeatCapacityFreeTraceTrial => trial !== null);
  if (traceTrials.length === 0) return createDefaultFreeTraceStore();
  const activeTraceTrialId = typeof value.activeTraceTrialId === 'string' &&
    traceTrials.some((trial) => trial.id === value.activeTraceTrialId)
    ? value.activeTraceTrialId
    : null;
  return {
    activeTraceTrialId,
    nextTraceTrialIndex: normalizeNullableNumber(value.nextTraceTrialIndex) ?? traceTrials.length + 1,
    traceTrials,
  };
};

const fallbackSession = (): WorkbenchSessionState => {
  return {
    version: WORKBENCH_SESSION_VERSION,
    files: [],
    activeFileId: '',
    selectedPanel: 'preview',
  };
};

const isFreshWorkbenchWindow = () => {
  if (typeof window === 'undefined') return false;

  try {
    return new URL(window.location.href).searchParams.get('hslFreshWindow') === '1';
  } catch {
    return false;
  }
};

const getWorkbenchSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  return isFreshWorkbenchWindow() ? window.sessionStorage : window.localStorage;
};

const normalizeRuntimeState = (file: WorkbenchFileState): WorkbenchFileState => {
  if (file.kind === 'heatCapacity') {
    const fallback = createDefaultHeatCapacityFile(1);
    const heatCapacityVisiblePanels = file.visiblePanels.filter((panel) => (
      panel === 'preview' ||
      panel === 'realtime' ||
      panel === 'heatCapacityGuide' ||
      panel === 'heatCapacityRecords' ||
      panel === 'heatCapacityProcessing' ||
      panel === 'heatCapacityReview'
    ));
    const hasSavedStopcockAngle = typeof file.stopcockAngleDeg === 'number' && Number.isFinite(file.stopcockAngleDeg);
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
    const pressureRawPlaceholder = normalizeNullableNumber(file.pressureRawPlaceholder)
      ?? fallback.pressureRawPlaceholder;
    const pressureInitialBiasMv = normalizeNullableNumber(file.pressureInitialBiasMv)
      ?? fallback.pressureInitialBiasMv;
    const pressureZeroOffset = normalizeNullableNumber(file.pressureZeroOffset)
      ?? fallback.pressureZeroOffset;
    const pressureDisplayedPlaceholder = normalizeNullableNumber(file.pressureDisplayedPlaceholder)
      ?? applyHeatCapacityPressureZero(pressureRawPlaceholder, pressureInitialBiasMv, pressureZeroOffset);
    const pressureZeroAdjusted = file.pressureZeroAdjusted === true || file.pressureZeroed === true;
    const pressureZeroAdjustMode = file.pressureZeroAdjustMode === 'fineWheel' || file.pressureZeroAdjustMode === 'coarseDrag'
      ? file.pressureZeroAdjustMode
      : 'none';
    const expectedTrialCount = normalizeHeatCapacityExpectedTrialCount(file.heatCapacityExpectedTrialCount);
    const heatCapacityTrials = Array.isArray(file.heatCapacityTrials)
      ? resizeHeatCapacityTrials(
          file.heatCapacityTrials.map((trial, index) => normalizeHeatCapacityTrial(trial, index + 1)),
          expectedTrialCount,
        )
      : createHeatCapacityTrials(expectedTrialCount);
    const openHeatCapacityTabs = Array.isArray(file.openHeatCapacityTabs)
      ? file.openHeatCapacityTabs.filter((tab): tab is WorkbenchHeatCapacityTabId => heatCapacityTabIds.includes(tab as WorkbenchHeatCapacityTabId))
      : [];
    const activeHeatCapacityTabId = file.activeHeatCapacityTabId && openHeatCapacityTabs.includes(file.activeHeatCapacityTabId)
      ? file.activeHeatCapacityTabId
      : openHeatCapacityTabs[0] ?? null;
    const theoreticalGamma = fallback.theoreticalGamma;
    const savedProcessingResult = file.heatCapacityProcessingResult;
    const savedProcessingUsesAirTheory = savedProcessingResult?.calculated === true
      && normalizeNullableNumber(savedProcessingResult.theoreticalGamma) === theoreticalGamma;
    const heatCapacityFreeTrials = Array.isArray(file.heatCapacityFreeTrials)
      ? file.heatCapacityFreeTrials
          .map(normalizeHeatCapacityFreeTrial)
          .filter((trial): trial is HeatCapacityFreeTrial => trial !== null)
      : [];
    const fallbackFreeRuntimeFields = createDefaultHeatCapacityFreeRuntimeFields(`free-runtime-${file.id}`);
    const savedFreeRuntimeCompatible = file.heatCapacityFreeRuntimeVersion === HEAT_CAPACITY_FREE_RUNTIME_VERSION;
    const savedFreeSensorState = isRecord(file.heatCapacityFreeSensorState)
      ? file.heatCapacityFreeSensorState as typeof fallbackFreeRuntimeFields.heatCapacityFreeSensorState
      : null;
    const savedFreePhysicsConfig = savedFreeRuntimeCompatible && isRecord(file.heatCapacityFreePhysicsConfig)
      ? normalizeHeatCapacityFreePhysicsConfig(file.heatCapacityFreePhysicsConfig)
      : fallbackFreeRuntimeFields.heatCapacityFreePhysicsConfig;
    const savedFreeSensorConfig = isRecord(file.heatCapacityFreeSensorConfig)
      ? file.heatCapacityFreeSensorConfig as typeof fallbackFreeRuntimeFields.heatCapacityFreeSensorConfig
      : fallbackFreeRuntimeFields.heatCapacityFreeSensorConfig;
    const savedFreeRecordConfig = normalizeHeatCapacityFreeRecordConfig(
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
      savedFreePhysicsConfig,
      savedFreeSensorConfig,
      savedFreeRecordConfig,
      savedFreePressureWarningMv,
      savedFreeInstrumentNoiseEnabled,
    );
    const savedFreePhysicsState = savedFreeRuntimeCompatible && isRecord(file.heatCapacityFreePhysicsState)
      ? file.heatCapacityFreePhysicsState
      : null;
    const normalizedFreeRuntimeFields = savedFreeRuntimeCompatible
      ? {
          heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
          heatCapacityFreeExperimentGroupStatus: normalizeHeatCapacityFreeExperimentGroupStatus(
            file.heatCapacityFreeExperimentGroupStatus,
          ),
          heatCapacityFreeParameterDraft: normalizeHeatCapacityFreeParameterDraft(
            file.heatCapacityFreeParameterDraft,
            fallbackFreeParameterDraft,
          ),
          heatCapacityFreeActiveRunConfigSnapshot: normalizeHeatCapacityFreeConfigSnapshot(
            file.heatCapacityFreeActiveRunConfigSnapshot,
          ),
          heatCapacityFreeAdvancedRiskAccepted: file.heatCapacityFreeAdvancedRiskAccepted === true,
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
          heatCapacityFreeStopcockFlowOpen: file.heatCapacityFreeStopcockFlowOpen === true,
          heatCapacityFreeStopcockPendingOpenAtMs: normalizeNullableNumber(file.heatCapacityFreeStopcockPendingOpenAtMs),
          heatCapacityFreeEquilibriumSpeedMultiplier: normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(
            file.heatCapacityFreeEquilibriumSpeedMultiplier,
          ),
          heatCapacityFreeEquilibriumSpeedHintShown: file.heatCapacityFreeEquilibriumSpeedHintShown === true,
        }
      : fallbackFreeRuntimeFields;
    const heatCapacityFreeTraceStore = file.heatCapacityFreeTraceVersion === HEAT_CAPACITY_FREE_TRACE_VERSION
      ? normalizeHeatCapacityFreeTraceStore(file.heatCapacityFreeTraceStore)
      : createDefaultFreeTraceStore();
    return {
      ...fallback,
      ...file,
      ...normalizedFreeRuntimeFields,
      name: normalizeHeatCapacityFileName(file.name),
      lastOpenedAt: normalizeLastOpenedAt(file, fallback.lastOpenedAt),
      visiblePanels: heatCapacityVisiblePanels.length > 0 ? heatCapacityVisiblePanels : fallback.visiblePanels,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
        file.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
      ),
      selectedHeatCapacityPanel: panelKeys.includes(file.selectedHeatCapacityPanel as WorkbenchPanelKey)
        ? file.selectedHeatCapacityPanel
        : 'preview',
      openHeatCapacityTabs,
      activeHeatCapacityTabId,
      heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded !== false,
      heatCapacityTabContainerHeight: normalizeNullableNumber(file.heatCapacityTabContainerHeight) ?? fallback.heatCapacityTabContainerHeight,
      heatCapacityExpectedTrialCount: expectedTrialCount,
      heatCapacityExpectedTrialCountMode: file.heatCapacityExpectedTrialCountMode === '5' || file.heatCapacityExpectedTrialCountMode === 'custom'
        ? file.heatCapacityExpectedTrialCountMode
        : '3',
      heatCapacityTrials,
      heatCapacityActiveTrialIndex: Math.min(
        Math.max(0, normalizeNullableNumber(file.heatCapacityActiveTrialIndex) ?? 0),
        Math.max(0, heatCapacityTrials.length - 1),
      ),
      heatCapacityProcessingCalculated: file.heatCapacityProcessingCalculated === true && savedProcessingUsesAirTheory,
      heatCapacityProcessingResult: savedProcessingUsesAirTheory
        ? savedProcessingResult
        : createDefaultHeatCapacityProcessingResult(theoreticalGamma),
      heatCapacityExperimentSeed: typeof file.heatCapacityExperimentSeed === 'string' || typeof file.heatCapacityExperimentSeed === 'number'
        ? file.heatCapacityExperimentSeed
        : null,
      heatCapacityExperimentProfile: normalizeHeatCapacityExperimentProfile(file.heatCapacityExperimentProfile),
      heatCapacityMode: file.heatCapacityMode === 'demo' || file.heatCapacityMode === 'guide' || file.heatCapacityMode === 'free'
        ? file.heatCapacityMode
        : fallback.heatCapacityMode,
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
      pressureSignalMvRaw: normalizeNullableNumber(file.pressureSignalMvRaw) ?? pressureRawPlaceholder,
      pressureSignalMvDisplayed: normalizeNullableNumber(file.pressureSignalMvDisplayed) ?? pressureDisplayedPlaceholder,
      pressureInitialBiasMv,
      temperatureSignalTargetMv: normalizeNullableNumber(file.temperatureSignalTargetMv) ?? fallback.temperatureSignalTargetMv,
      pressureSignalTargetMv: normalizeNullableNumber(file.pressureSignalTargetMv) ?? pressureDisplayedPlaceholder,
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
      pressureRawPlaceholder,
      pressureDisplayedPlaceholder,
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
        ? file.pumpStrokeTimestamps.filter((timestamp): timestamp is number => typeof timestamp === 'number' && Number.isFinite(timestamp))
        : [],
      pumpFrequency: normalizeNullableNumber(file.pumpFrequency) ?? fallback.pumpFrequency,
      pumpFrequencyStatus: file.pumpFrequencyStatus === 'tooSlow' || file.pumpFrequencyStatus === 'suitable' ? file.pumpFrequencyStatus : 'idle',
      lastPumpTime: normalizeNullableNumber(file.lastPumpTime),
      pumpStrokeCount: normalizeNullableNumber(file.pumpStrokeCount) ?? 0,
      pumpHint: typeof file.pumpHint === 'string' ? file.pumpHint : fallback.pumpHint,
      hardSphereViewEnabled: file.hardSphereViewEnabled === true,
      hardSphereParticleMultiplier: normalizeNullableNumber(file.hardSphereParticleMultiplier) ?? fallback.hardSphereParticleMultiplier,
      hardSphereSpeedMultiplier: normalizeNullableNumber(file.hardSphereSpeedMultiplier) ?? fallback.hardSphereSpeedMultiplier,
      hardSphereTrailsEnabled: file.hardSphereTrailsEnabled === true,
      pressurePlaceholder: normalizeNullableNumber(file.pressurePlaceholder) ?? fallback.pressurePlaceholder,
      temperaturePlaceholder: normalizeNullableNumber(file.temperaturePlaceholder) ?? fallback.temperaturePlaceholder,
      visualizationMode: file.visualizationMode === 'particle' ? file.visualizationMode : fallback.visualizationMode,
      calculationModel: file.calculationModel === 'airHeatCapacityRatio' ? file.calculationModel : fallback.calculationModel,
      pressureSensitivityMvPerKPa: normalizeNullableNumber(file.pressureSensitivityMvPerKPa) ?? fallback.pressureSensitivityMvPerKPa,
      recordedPressures: {
        ...fallback.recordedPressures,
        ...file.recordedPressures,
        p0: normalizeNullableNumber(file.recordedPressures?.p0) ?? fallback.recordedPressures.p0,
      },
      theoreticalGamma,
      heatCapacityProcessSamples: {
        ...fallback.heatCapacityProcessSamples,
        ...normalizeHeatCapacityProcessSamples(file.heatCapacityProcessSamples),
      },
    };
  }

  return {
    ...file,
    runState: file.runState === 'running' ? 'paused' : file.runState,
    lastOpenedAt: normalizeLastOpenedAt(file, file.updatedAt),
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
    hardSphereEngineSnapshot: normalizeHardSphereEngineSnapshot(file.hardSphereEngineSnapshot),
  };
};

export const decodeWorkbenchSession = (value: unknown): WorkbenchSessionState => {
  if (!isRecord(value) || value.version !== WORKBENCH_SESSION_VERSION || !Array.isArray(value.files)) {
    return fallbackSession();
  }

  const files = value.files.filter((file): file is WorkbenchFileState => (
    isRecord(file) &&
    typeof file.id === 'string' &&
    typeof file.name === 'string' &&
    (file.kind === 'standard' || file.kind === 'ideal' || file.kind === 'heatCapacity')
  )).map(normalizeRuntimeState);

  if (files.length === 0) return fallbackSession();

  const requestedActiveId = typeof value.activeFileId === 'string' ? value.activeFileId : '';
  const activeFileId = files.some((file) => file.id === requestedActiveId) ? requestedActiveId : files[0].id;
  const restoredSelectedPanel = panelKeys.includes(value.selectedPanel as WorkbenchPanelKey)
    ? value.selectedPanel as WorkbenchPanelKey
    : 'preview';
  const activeFile = files.find((file) => file.id === activeFileId);
  const selectedPanel = activeFile?.kind === 'heatCapacity' && !(
    restoredSelectedPanel === 'preview' ||
    restoredSelectedPanel === 'realtime' ||
    restoredSelectedPanel === 'heatCapacityGuide' ||
    restoredSelectedPanel === 'heatCapacityRecords' ||
    restoredSelectedPanel === 'heatCapacityProcessing' ||
    restoredSelectedPanel === 'heatCapacityReview'
  )
    ? 'preview'
    : restoredSelectedPanel;

  return {
    version: WORKBENCH_SESSION_VERSION,
    files,
    activeFileId,
    selectedPanel,
  };
};

export const encodeWorkbenchSession = (
  files: WorkbenchFileState[],
  activeFileId: string,
  selectedPanel: WorkbenchPanelKey,
): WorkbenchSessionState => decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  files: files.map(normalizeRuntimeState),
  activeFileId,
  selectedPanel,
});

const normalizeWorkbenchFileList = (
  files: WorkbenchFileState[],
): WorkbenchFileState[] => {
  if (files.length === 0) return [];
  return decodeWorkbenchSession({
    version: WORKBENCH_SESSION_VERSION,
    files,
    activeFileId: files[0].id,
    selectedPanel: 'preview',
  }).files;
};

export const loadWorkbenchSession = (): WorkbenchSessionState => {
  if (typeof window === 'undefined') return fallbackSession();
  const storage = getWorkbenchSessionStorage();
  if (!storage) return fallbackSession();

  try {
    const raw = storage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) return fallbackSession();
    const parsed = JSON.parse(raw);
    const decodedEnvelope = decodeWorkbenchStorageEnvelope(parsed);
    return decodedEnvelope.handled
      ? decodeWorkbenchSession(decodedEnvelope.session)
      : decodeWorkbenchSession(parsed);
  } catch {
    return fallbackSession();
  }
};

export const persistWorkbenchSession = (session: WorkbenchSessionState) => {
  if (typeof window === 'undefined') return;
  const storage = getWorkbenchSessionStorage();
  if (!storage) return;

  try {
    const envelope = encodeWorkbenchStorageEnvelope(
      session.files,
      session.activeFileId,
      session.selectedPanel,
    );
    storage.setItem(WORKBENCH_SESSION_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage failures should not block the live workbench.
  }
};

export const loadClosedWorkbenchFiles = (): WorkbenchFileState[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(WORKBENCH_CLOSED_FILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const decodedEnvelope = decodeWorkbenchClosedFilesStorageEnvelope(parsed);
    if (decodedEnvelope.handled) {
      return normalizeWorkbenchFileList(decodedEnvelope.files);
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((file): file is WorkbenchFileState => (
      isRecord(file) &&
      typeof file.id === 'string' &&
      typeof file.name === 'string' &&
      (file.kind === 'standard' || file.kind === 'ideal' || file.kind === 'heatCapacity')
    )).map(normalizeRuntimeState);
  } catch {
    return [];
  }
};

export const persistClosedWorkbenchFiles = (files: WorkbenchFileState[]) => {
  if (typeof window === 'undefined') return;

  try {
    const normalizedFiles = files
      .map(normalizeRuntimeState)
      .filter((file, index, allFiles) => allFiles.findIndex((candidate) => candidate.id === file.id) === index);
    const envelope = encodeWorkbenchClosedFilesStorageEnvelope(normalizedFiles);
    window.localStorage.setItem(WORKBENCH_CLOSED_FILES_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage failures should not block the live workbench.
  }
};
