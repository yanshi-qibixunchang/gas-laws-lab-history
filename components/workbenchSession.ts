import {
  clampWorkbenchLiveSplitRatio,
  applyHeatCapacityPressureZero,
  createDefaultHeatCapacityFile,
  getHeatCapacityStopcockState,
  normalizeHeatCapacityStopcockAngle,
  normalizeHeatCapacityFileName,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  type WorkbenchFileState,
  type WorkbenchPanelKey,
} from './workbenchState.ts';

export const WORKBENCH_SESSION_VERSION = 1;
export const WORKBENCH_SESSION_STORAGE_KEY = 'hsl_workbench_session_v1';

export interface WorkbenchSessionState {
  version: typeof WORKBENCH_SESSION_VERSION;
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

const panelKeys: WorkbenchPanelKey[] = ['preview', 'realtime', 'results', 'experimentPoints', 'verification', 'history'];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const normalizeNullableNumber = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const heatCapacitySampleKeys = [
  'startSample',
  'afterPumpSample',
  'beforeReleaseSample',
  'afterReleaseSample',
  'recoverySample',
] as const;

const normalizeHeatCapacityTracePoint = (value: unknown) => {
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
  return heatCapacitySampleKeys.reduce<Record<string, ReturnType<typeof normalizeHeatCapacityTracePoint>>>((samples, key) => {
    const point = normalizeHeatCapacityTracePoint(value[key]);
    if (point) samples[key] = point;
    return samples;
  }, {});
};

const fallbackSession = (): WorkbenchSessionState => {
  return {
    version: WORKBENCH_SESSION_VERSION,
    files: [],
    activeFileId: '',
    selectedPanel: 'preview',
  };
};

const normalizeRuntimeState = (file: WorkbenchFileState): WorkbenchFileState => {
  if (file.kind === 'heatCapacity') {
    const fallback = createDefaultHeatCapacityFile(1);
    const visiblePanels = file.visiblePanels.filter((panel) => panel === 'preview' || panel === 'realtime');
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
      ? (file.glassPistonState === 'open' ? 90 : 0)
      : normalizedSavedStopcockAngle;
    const pressureRawPlaceholder = normalizeNullableNumber(file.pressureRawPlaceholder)
      ?? fallback.pressureRawPlaceholder;
    const pressureZeroOffset = normalizeNullableNumber(file.pressureZeroOffset)
      ?? fallback.pressureZeroOffset;
    const pressureDisplayedPlaceholder = normalizeNullableNumber(file.pressureDisplayedPlaceholder)
      ?? applyHeatCapacityPressureZero(pressureRawPlaceholder, pressureZeroOffset);
    const pressureZeroAdjusted = file.pressureZeroAdjusted === true || file.pressureZeroed === true;
    const pressureZeroAdjustMode = file.pressureZeroAdjustMode === 'fineWheel' || file.pressureZeroAdjustMode === 'coarseDrag'
      ? file.pressureZeroAdjustMode
      : 'none';
    const heatCapacityTrace = Array.isArray(file.heatCapacityTrace)
      ? file.heatCapacityTrace.map(normalizeHeatCapacityTracePoint).filter((point): point is NonNullable<typeof point> => point !== null)
      : fallback.heatCapacityTrace;
    return {
      ...fallback,
      ...file,
      name: normalizeHeatCapacityFileName(file.name),
      visiblePanels: visiblePanels.length > 0 ? visiblePanels : fallback.visiblePanels,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
        file.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
      ),
      selectedHeatCapacityPanel: file.selectedHeatCapacityPanel === 'realtime' ? 'realtime' : 'preview',
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
      temperatureSignalTargetMv: normalizeNullableNumber(file.temperatureSignalTargetMv) ?? fallback.temperatureSignalTargetMv,
      pressureSignalTargetMv: normalizeNullableNumber(file.pressureSignalTargetMv) ?? pressureDisplayedPlaceholder,
      displayResponseLastUpdateMs: normalizeNullableNumber(file.displayResponseLastUpdateMs),
      pressureZeroed: pressureZeroAdjusted,
      pressureZeroAdjusted,
      pressureZeroKnobAngle: normalizeNullableNumber(file.pressureZeroKnobAngle) ?? fallback.pressureZeroKnobAngle,
      pressureZeroOffset,
      pressureZeroDisplayText: typeof file.pressureZeroDisplayText === 'string'
        ? file.pressureZeroDisplayText
        : fallback.pressureZeroDisplayText,
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
      pressurePlaceholder: normalizeNullableNumber(file.pressurePlaceholder) ?? fallback.pressurePlaceholder,
      temperaturePlaceholder: normalizeNullableNumber(file.temperaturePlaceholder) ?? fallback.temperaturePlaceholder,
      recordedPressures: {
        ...fallback.recordedPressures,
        ...file.recordedPressures,
      },
      heatCapacityTrace,
      heatCapacityProcessSamples: {
        ...fallback.heatCapacityProcessSamples,
        ...normalizeHeatCapacityProcessSamples(file.heatCapacityProcessSamples),
      },
    };
  }

  return {
    ...file,
    runState: file.runState === 'running' ? 'paused' : file.runState,
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
  const selectedPanel = activeFile?.kind === 'heatCapacity' && restoredSelectedPanel !== 'preview' && restoredSelectedPanel !== 'realtime'
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

  try {
    const raw = window.localStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) return fallbackSession();
    return decodeWorkbenchSession(JSON.parse(raw));
  } catch {
    return fallbackSession();
  }
};

export const persistWorkbenchSession = (session: WorkbenchSessionState) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(WORKBENCH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage failures should not block the live workbench.
  }
};
