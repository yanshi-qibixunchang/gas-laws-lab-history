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
import type {
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';

export const WORKBENCH_SESSION_VERSION = 1;
export const WORKBENCH_SESSION_STORAGE_KEY = 'hsl_workbench_session_v1';
export const WORKBENCH_CLOSED_FILES_STORAGE_KEY = 'hsl_workbench_closed_files_v1';

export interface WorkbenchSessionState {
  version: typeof WORKBENCH_SESSION_VERSION;
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

const panelKeys: WorkbenchPanelKey[] = ['preview', 'realtime', 'results', 'experimentPoints', 'verification', 'heatCapacityGuide', 'heatCapacityRecords', 'heatCapacityProcessing', 'history'];
const heatCapacityTabIds: WorkbenchHeatCapacityTabId[] = ['guide', 'records', 'processing'];

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
  return {
    id: value.id,
    source: 'free',
    automaticU0: isRecord(value.automaticU0)
      ? value.automaticU0 as HeatCapacityFreeTrial['automaticU0']
      : null,
    u0: isRecord(value.u0) ? value.u0 as unknown as HeatCapacityFreeTrial['u0'] : null,
    u1: isRecord(value.u1) ? value.u1 as unknown as HeatCapacityFreeTrial['u1'] : null,
    u2: isRecord(value.u2) ? value.u2 as unknown as HeatCapacityFreeTrial['u2'] : null,
    blockedReason: typeof value.blockedReason === 'string'
      ? value.blockedReason as HeatCapacityFreeTrial['blockedReason']
      : null,
    correctedSignals: isRecord(value.correctedSignals) && isRecord(value.u0)
      ? value.correctedSignals as unknown as HeatCapacityFreeTrial['correctedSignals']
      : null,
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
      panel === 'heatCapacityProcessing'
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
    const normalizedFreeRuntimeFields = savedFreeRuntimeCompatible
      ? {
          heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
          heatCapacityFreeEnvironmentConfig: isRecord(file.heatCapacityFreeEnvironmentConfig)
            ? file.heatCapacityFreeEnvironmentConfig as typeof fallbackFreeRuntimeFields.heatCapacityFreeEnvironmentConfig
            : fallbackFreeRuntimeFields.heatCapacityFreeEnvironmentConfig,
          heatCapacityFreePhysicsConfig: isRecord(file.heatCapacityFreePhysicsConfig)
            ? file.heatCapacityFreePhysicsConfig as typeof fallbackFreeRuntimeFields.heatCapacityFreePhysicsConfig
            : fallbackFreeRuntimeFields.heatCapacityFreePhysicsConfig,
          heatCapacityFreePhysicsState: isRecord(file.heatCapacityFreePhysicsState)
            ? file.heatCapacityFreePhysicsState as typeof fallbackFreeRuntimeFields.heatCapacityFreePhysicsState
            : fallbackFreeRuntimeFields.heatCapacityFreePhysicsState,
          heatCapacityFreeSensorConfig: isRecord(file.heatCapacityFreeSensorConfig)
            ? file.heatCapacityFreeSensorConfig as typeof fallbackFreeRuntimeFields.heatCapacityFreeSensorConfig
            : fallbackFreeRuntimeFields.heatCapacityFreeSensorConfig,
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
        }
      : fallbackFreeRuntimeFields;
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
      heatCapacityPausedTeachingSnapshot: isRecord(file.heatCapacityPausedTeachingSnapshot)
        ? file.heatCapacityPausedTeachingSnapshot as typeof fallback.heatCapacityPausedTeachingSnapshot
        : null,
      heatCapacityFreeTrials,
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
    restoredSelectedPanel === 'heatCapacityProcessing'
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

export const loadWorkbenchSession = (): WorkbenchSessionState => {
  if (typeof window === 'undefined') return fallbackSession();
  const storage = getWorkbenchSessionStorage();
  if (!storage) return fallbackSession();

  try {
    const raw = storage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) return fallbackSession();
    return decodeWorkbenchSession(JSON.parse(raw));
  } catch {
    return fallbackSession();
  }
};

export const persistWorkbenchSession = (session: WorkbenchSessionState) => {
  if (typeof window === 'undefined') return;
  const storage = getWorkbenchSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(WORKBENCH_SESSION_STORAGE_KEY, JSON.stringify(session));
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
    window.localStorage.setItem(WORKBENCH_CLOSED_FILES_STORAGE_KEY, JSON.stringify(normalizedFiles));
  } catch {
    // Storage failures should not block the live workbench.
  }
};
