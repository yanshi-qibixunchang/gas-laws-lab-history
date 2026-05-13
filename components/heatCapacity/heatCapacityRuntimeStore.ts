import {
  canZeroHeatCapacityPressure,
  getHeatCapacityStopcockState,
  refreshHeatCapacityPumpFrequency,
  stepHeatCapacityWorkbenchFile,
  type WorkbenchHeatCapacityState,
} from '../workbenchState.ts';
import type { HeatCapacityRuntimePhase, HeatCapacityTracePoint } from './heatCapacityExperimentModel.ts';

type HeatCapacityRuntimeListener = () => void;

export interface HeatCapacityChartSnapshot {
  heatCapacityTrace: HeatCapacityTracePoint[];
  powerOn: boolean;
}

export interface HeatCapacityRealtimeSnapshot {
  canZeroPressure: boolean;
  heatCapacityPhase: HeatCapacityRuntimePhase;
  powerOn: boolean;
  pressureSafetyStatus: 'normal' | 'warning' | 'danger';
  pressureSensitivityMvPerKPa: number;
  pressureSignalMv: number | null;
  pressureZeroAdjusted: boolean;
  pumpHint: string;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
  temperatureSignalMv: number | null;
}

export interface HeatCapacitySceneSnapshot {
  powerOn: boolean;
  stopcockAngleDeg: number;
  pressureZeroAdjusted: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroOffset: number;
  pressureZeroDisplayText: string;
  pressureRawPlaceholder: number;
  pressureDisplayedPlaceholder: number;
  pressureGaugeDisplayValue: number;
  pressureGaugeNeedleAngle: number;
  gaugePressureMinKPa: number;
  gaugePressureMaxKPa: number;
  pressureSafetyThresholdKPa: number;
  pressureSafetyMessage: string | null;
  pressureSafetyStatus: 'normal' | 'warning' | 'danger';
  pressureOverLimit: boolean;
  pressureZeroAdjustMode: 'none' | 'fineWheel' | 'coarseDrag';
  pressureKPa: number | null;
  pressureLimitKPa: number;
  pumpValveOpen: boolean;
  pumpValveState: 'open' | 'closed';
  pumpBulbState: 'idle' | 'compressing' | 'releasing';
  pumpFrequency: number;
  pumpFrequencyStatus: 'idle' | 'tooSlow' | 'suitable';
  pumpHint: string;
  pressurePlaceholder: number;
  temperaturePlaceholder: number;
  phase: string;
  temperatureSignalMv: number | null;
  pressureSignalMv: number | null;
}

interface ReplaceOptions {
  dirty?: boolean;
  forceNotify?: boolean;
  notifyAt?: number;
}

export class HeatCapacityTraceRingBuffer {
  private readonly capacity: number;
  private points: HeatCapacityTracePoint[] = [];
  private cachedWindow: HeatCapacityTracePoint[] = [];

  constructor(capacity = 96) {
    this.capacity = capacity;
  }

  sync(points: HeatCapacityTracePoint[]) {
    const nextPoints = points.slice(-this.capacity);
    const changed = (
      nextPoints.length !== this.cachedWindow.length ||
      nextPoints[0] !== this.cachedWindow[0] ||
      nextPoints.at(-1) !== this.cachedWindow.at(-1)
    );
    this.points = nextPoints;
    if (changed) this.cachedWindow = nextPoints.slice();
    return changed;
  }

  getWindow() {
    return this.cachedWindow;
  }
}

export interface HeatCapacityRuntimeController {
  consumeDirtyFile: () => WorkbenchHeatCapacityState | null;
  getFile: () => WorkbenchHeatCapacityState;
  getChartSnapshot: () => HeatCapacityChartSnapshot;
  getRealtimeSnapshot: () => HeatCapacityRealtimeSnapshot;
  getSceneSnapshot: () => HeatCapacitySceneSnapshot;
  markPersisted: () => void;
  replaceFile: (file: WorkbenchHeatCapacityState, options?: ReplaceOptions) => void;
  subscribeChart: (listener: HeatCapacityRuntimeListener) => () => void;
  subscribeRealtime: (listener: HeatCapacityRuntimeListener) => () => void;
  subscribeScene: (listener: HeatCapacityRuntimeListener) => () => void;
  tick: (now?: number) => void;
  updateFile: (
    updater: (file: WorkbenchHeatCapacityState) => WorkbenchHeatCapacityState,
    options?: ReplaceOptions,
  ) => WorkbenchHeatCapacityState;
}

const HEAT_CAPACITY_CHART_NOTIFY_INTERVAL_MS = 180;
const HEAT_CAPACITY_REALTIME_NOTIFY_INTERVAL_MS = 180;
const HEAT_CAPACITY_SCENE_NOTIFY_INTERVAL_MS = 120;

const createChartSnapshot = (
  file: WorkbenchHeatCapacityState,
  heatCapacityTrace: HeatCapacityTracePoint[],
): HeatCapacityChartSnapshot => ({
  heatCapacityTrace,
  powerOn: file.powerOn,
});

const createRealtimeSnapshot = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityRealtimeSnapshot => ({
  canZeroPressure: canZeroHeatCapacityPressure(file),
  heatCapacityPhase: file.heatCapacityPhase,
  powerOn: file.powerOn,
  pressureSafetyStatus: file.pressureSafetyStatus,
  pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
  pressureSignalMv: file.pressureSignalMv,
  pressureZeroAdjusted: file.pressureZeroAdjusted,
  pumpHint: file.pumpHint,
  pumpValveOpen: file.pumpValveOpen,
  stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
  temperatureSignalMv: file.temperatureSignalMv,
});

const createSceneSnapshot = (file: WorkbenchHeatCapacityState): HeatCapacitySceneSnapshot => ({
  powerOn: file.powerOn,
  stopcockAngleDeg: file.stopcockAngleDeg,
  pressureZeroAdjusted: file.pressureZeroAdjusted,
  pressureZeroKnobAngle: file.pressureZeroKnobAngle,
  pressureZeroOffset: file.pressureZeroOffset,
  pressureZeroDisplayText: file.pressureZeroDisplayText,
  pressureRawPlaceholder: file.pressureRawPlaceholder,
  pressureDisplayedPlaceholder: file.pressureDisplayedPlaceholder,
  pressureGaugeDisplayValue: file.pressureGaugeDisplayValue,
  pressureGaugeNeedleAngle: file.pressureGaugeNeedleAngle,
  gaugePressureMinKPa: file.gaugePressureMinKPa,
  gaugePressureMaxKPa: file.gaugePressureMaxKPa,
  pressureSafetyThresholdKPa: file.pressureSafetyThresholdKPa,
  pressureSafetyMessage: file.pressureSafetyMessage,
  pressureSafetyStatus: file.pressureSafetyStatus,
  pressureOverLimit: file.pressureOverLimit,
  pressureZeroAdjustMode: file.pressureZeroAdjustMode,
  pressureKPa: file.pressureKPa,
  pressureLimitKPa: file.pressureLimitKPa,
  pumpValveOpen: file.pumpValveOpen,
  pumpValveState: file.pumpValveState,
  pumpBulbState: file.pumpBulbState,
  pumpFrequency: file.pumpFrequency,
  pumpFrequencyStatus: file.pumpFrequencyStatus,
  pumpHint: file.pumpHint,
  pressurePlaceholder: file.pressurePlaceholder,
  temperaturePlaceholder: file.temperaturePlaceholder,
  phase: file.heatCapacityPhase,
  temperatureSignalMv: file.temperatureSignalMv,
  pressureSignalMv: file.pressureSignalMv,
});

const areRealtimeSnapshotsEqual = (
  left: HeatCapacityRealtimeSnapshot,
  right: HeatCapacityRealtimeSnapshot,
) => (
  left.canZeroPressure === right.canZeroPressure &&
  left.heatCapacityPhase === right.heatCapacityPhase &&
  left.powerOn === right.powerOn &&
  left.pressureSafetyStatus === right.pressureSafetyStatus &&
  left.pressureSensitivityMvPerKPa === right.pressureSensitivityMvPerKPa &&
  left.pressureSignalMv === right.pressureSignalMv &&
  left.pressureZeroAdjusted === right.pressureZeroAdjusted &&
  left.pumpHint === right.pumpHint &&
  left.pumpValveOpen === right.pumpValveOpen &&
  left.stopcockOpen === right.stopcockOpen &&
  left.temperatureSignalMv === right.temperatureSignalMv
);

const areSceneSnapshotsEqual = (
  left: HeatCapacitySceneSnapshot,
  right: HeatCapacitySceneSnapshot,
) => (
  left.powerOn === right.powerOn &&
  left.stopcockAngleDeg === right.stopcockAngleDeg &&
  left.pressureZeroAdjusted === right.pressureZeroAdjusted &&
  left.pressureZeroKnobAngle === right.pressureZeroKnobAngle &&
  left.pressureZeroOffset === right.pressureZeroOffset &&
  left.pressureZeroDisplayText === right.pressureZeroDisplayText &&
  left.pressureRawPlaceholder === right.pressureRawPlaceholder &&
  left.pressureDisplayedPlaceholder === right.pressureDisplayedPlaceholder &&
  left.pressureGaugeDisplayValue === right.pressureGaugeDisplayValue &&
  left.pressureGaugeNeedleAngle === right.pressureGaugeNeedleAngle &&
  left.gaugePressureMinKPa === right.gaugePressureMinKPa &&
  left.gaugePressureMaxKPa === right.gaugePressureMaxKPa &&
  left.pressureSafetyThresholdKPa === right.pressureSafetyThresholdKPa &&
  left.pressureSafetyMessage === right.pressureSafetyMessage &&
  left.pressureSafetyStatus === right.pressureSafetyStatus &&
  left.pressureOverLimit === right.pressureOverLimit &&
  left.pressureZeroAdjustMode === right.pressureZeroAdjustMode &&
  left.pressureKPa === right.pressureKPa &&
  left.pressureLimitKPa === right.pressureLimitKPa &&
  left.pumpValveOpen === right.pumpValveOpen &&
  left.pumpValveState === right.pumpValveState &&
  left.pumpBulbState === right.pumpBulbState &&
  left.pumpFrequency === right.pumpFrequency &&
  left.pumpFrequencyStatus === right.pumpFrequencyStatus &&
  left.pumpHint === right.pumpHint &&
  left.pressurePlaceholder === right.pressurePlaceholder &&
  left.temperaturePlaceholder === right.temperaturePlaceholder &&
  left.phase === right.phase &&
  left.temperatureSignalMv === right.temperatureSignalMv &&
  left.pressureSignalMv === right.pressureSignalMv
);

export const createHeatCapacityRuntimeController = (
  initialFile: WorkbenchHeatCapacityState,
  traceCapacity = 96,
): HeatCapacityRuntimeController => {
  let currentFile = initialFile;
  let dirtyFile: WorkbenchHeatCapacityState | null = null;
  const chartListeners = new Set<HeatCapacityRuntimeListener>();
  const realtimeListeners = new Set<HeatCapacityRuntimeListener>();
  const sceneListeners = new Set<HeatCapacityRuntimeListener>();
  const traceRing = new HeatCapacityTraceRingBuffer(traceCapacity);
  traceRing.sync(initialFile.heatCapacityTrace);

  let chartSnapshot = createChartSnapshot(currentFile, traceRing.getWindow());
  let realtimeSnapshot = createRealtimeSnapshot(currentFile);
  let sceneSnapshot = createSceneSnapshot(currentFile);
  let lastChartNotifyAt = 0;
  let lastRealtimeNotifyAt = 0;
  let lastSceneNotifyAt = 0;

  const emit = (listeners: Set<HeatCapacityRuntimeListener>) => {
    listeners.forEach((listener) => listener());
  };

  const shouldNotify = (
    previousNotifyAt: number,
    now: number,
    intervalMs: number,
    forceNotify: boolean,
  ) => (
    forceNotify || previousNotifyAt === 0 || now - previousNotifyAt >= intervalMs
  );

  const notifyChangedSlices = ({
    chartChanged,
    realtimeChanged,
    sceneChanged,
    forceNotify = false,
    notifyAt = Date.now(),
  }: {
    chartChanged: boolean;
    realtimeChanged: boolean;
    sceneChanged: boolean;
    forceNotify?: boolean;
    notifyAt?: number;
  }) => {
    if (chartChanged && shouldNotify(lastChartNotifyAt, notifyAt, HEAT_CAPACITY_CHART_NOTIFY_INTERVAL_MS, forceNotify)) {
      lastChartNotifyAt = notifyAt;
      emit(chartListeners);
    }
    if (realtimeChanged && shouldNotify(lastRealtimeNotifyAt, notifyAt, HEAT_CAPACITY_REALTIME_NOTIFY_INTERVAL_MS, forceNotify)) {
      lastRealtimeNotifyAt = notifyAt;
      emit(realtimeListeners);
    }
    if (sceneChanged && shouldNotify(lastSceneNotifyAt, notifyAt, HEAT_CAPACITY_SCENE_NOTIFY_INTERVAL_MS, forceNotify)) {
      lastSceneNotifyAt = notifyAt;
      emit(sceneListeners);
    }
  };

  const replaceFile = (file: WorkbenchHeatCapacityState, options: ReplaceOptions = {}) => {
    currentFile = file;
    const traceChanged = traceRing.sync(file.heatCapacityTrace);
    const nextChartSnapshot = createChartSnapshot(currentFile, traceRing.getWindow());
    const nextRealtimeSnapshot = createRealtimeSnapshot(currentFile);
    const nextSceneSnapshot = createSceneSnapshot(currentFile);
    const chartChanged = traceChanged || nextChartSnapshot.powerOn !== chartSnapshot.powerOn;
    const realtimeChanged = !areRealtimeSnapshotsEqual(realtimeSnapshot, nextRealtimeSnapshot);
    const sceneChanged = !areSceneSnapshotsEqual(sceneSnapshot, nextSceneSnapshot);
    chartSnapshot = nextChartSnapshot;
    realtimeSnapshot = nextRealtimeSnapshot;
    sceneSnapshot = nextSceneSnapshot;
    if (options.dirty) dirtyFile = currentFile;
    notifyChangedSlices({
      chartChanged,
      forceNotify: options.forceNotify ?? false,
      notifyAt: options.notifyAt,
      realtimeChanged,
      sceneChanged,
    });
  };

  return {
    consumeDirtyFile: () => {
      const file = dirtyFile;
      dirtyFile = null;
      return file;
    },
    getFile: () => currentFile,
    getChartSnapshot: () => chartSnapshot,
    getRealtimeSnapshot: () => realtimeSnapshot,
    getSceneSnapshot: () => sceneSnapshot,
    markPersisted: () => {
      dirtyFile = null;
    },
    replaceFile,
    subscribeChart: (listener) => {
      chartListeners.add(listener);
      return () => chartListeners.delete(listener);
    },
    subscribeRealtime: (listener) => {
      realtimeListeners.add(listener);
      return () => realtimeListeners.delete(listener);
    },
    subscribeScene: (listener) => {
      sceneListeners.add(listener);
      return () => sceneListeners.delete(listener);
    },
    tick: (now = Date.now()) => {
      const refreshedFile = refreshHeatCapacityPumpFrequency(currentFile, now);
      const nextFile = refreshedFile.powerOn
        ? stepHeatCapacityWorkbenchFile(refreshedFile, now)
        : refreshedFile;
      if (nextFile === currentFile) return;
      replaceFile(nextFile, { dirty: true, notifyAt: now });
    },
    updateFile: (updater, options = { dirty: true }) => {
      const nextFile = updater(currentFile);
      replaceFile(nextFile, { forceNotify: true, ...options });
      return nextFile;
    },
  };
};
