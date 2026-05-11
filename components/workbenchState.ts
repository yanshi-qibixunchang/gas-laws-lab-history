import type {
  ChartData,
  ExperimentRelation,
  Particle,
  PressureMeasurementSummary,
  SimulationParams,
  SimulationStats,
} from '../types';
import {
  createEmptyPointsByRelation,
  type PointsByRelation,
} from '../utils/idealGasExperiment.ts';

export type WorkbenchFileKind = 'standard' | 'ideal' | 'heatCapacity';
export type WorkbenchRunState = 'idle' | 'running' | 'paused' | 'finished' | 'needs-reset';
export type WorkbenchExportEnvironmentStatus =
  | 'checking'
  | 'available-system'
  | 'available-bundled'
  | 'unavailable'
  | 'error';
export type WorkbenchPanelKey =
  | 'preview'
  | 'realtime'
  | 'results'
  | 'experimentPoints'
  | 'verification'
  | 'history';
export type WorkbenchIdealResultWindowKey = 'experimentPoints' | 'verification';
export type WorkbenchStandardResultsTab = 'summary' | 'dataTable' | 'figures';

export const IDEAL_RESULT_HEIGHT_RATIO = 0.5;
export const WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO = 0.48;
export const WORKBENCH_LIVE_SPLIT_MIN_RATIO = 0.34;
export const WORKBENCH_LIVE_SPLIT_MAX_RATIO = 0.66;
export const WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO = 0.66;
export const HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG = 0;
export const HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG = 90;
export const HEAT_CAPACITY_STOPCOCK_SECOND_OPEN_ANGLE_DEG = 270;
export const HEAT_CAPACITY_STOPCOCK_OPEN_MAGNET_DEG = 10;

export const clampWorkbenchLiveSplitRatio = (value: unknown) => {
  const ratio = typeof value === 'number' && Number.isFinite(value)
    ? value
    : WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO;
  return Math.min(WORKBENCH_LIVE_SPLIT_MAX_RATIO, Math.max(WORKBENCH_LIVE_SPLIT_MIN_RATIO, ratio));
};

export type WorkbenchHeatCapacityStopcockState = 'closed' | 'open';
export type WorkbenchHeatCapacityPumpValveState = 'closed' | 'open';
export type WorkbenchHeatCapacityPumpBulbState = 'idle' | 'compressing' | 'releasing';
export type WorkbenchHeatCapacityPumpFrequencyStatus = 'idle' | 'tooSlow' | 'suitable';
export type WorkbenchHeatCapacityPressureZeroAdjustMode = 'none' | 'fineWheel' | 'coarseDrag';

export const HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS = 3000;
export const HEAT_CAPACITY_MIN_PUMP_FREQUENCY = 0.5;
export const HEAT_CAPACITY_PRESSURE_RAW_PLACEHOLDER_MV = 3.2;
export const HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG = 2;
export const HEAT_CAPACITY_PRESSURE_ZERO_FINE_OFFSET_STEP_MV = 0.05;
export const HEAT_CAPACITY_PRESSURE_ZERO_COARSE_OFFSET_PER_DEG_MV = 0.01;
export const HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV = -6;
export const HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV = 6;

const normalizeDegrees360 = (value: number) => ((value % 360) + 360) % 360;
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const isNearHeatCapacityOpenAngle = (angle: number, target: number) => (
  Math.abs(angle - target) <= HEAT_CAPACITY_STOPCOCK_OPEN_MAGNET_DEG
);

export const normalizeHeatCapacityStopcockAngle = (value: unknown) => {
  const angle = typeof value === 'number' && Number.isFinite(value)
    ? value
    : HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG;
  const normalized = normalizeDegrees360(angle);
  if (isNearHeatCapacityOpenAngle(normalized, HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG)) {
    return HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG;
  }
  if (isNearHeatCapacityOpenAngle(normalized, HEAT_CAPACITY_STOPCOCK_SECOND_OPEN_ANGLE_DEG)) {
    return HEAT_CAPACITY_STOPCOCK_SECOND_OPEN_ANGLE_DEG;
  }
  return normalized;
};

export const getHeatCapacityStopcockState = (angleDeg: unknown): WorkbenchHeatCapacityStopcockState => (
  normalizeHeatCapacityStopcockAngle(angleDeg) === HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG ||
  normalizeHeatCapacityStopcockAngle(angleDeg) === HEAT_CAPACITY_STOPCOCK_SECOND_OPEN_ANGLE_DEG
    ? 'open'
    : 'closed'
);

export const getHeatCapacityPumpFrequencyState = (
  timestamps: number[],
  now = Date.now(),
  windowMs = HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS,
) => {
  const windowStart = now - windowMs;
  const recentTimestamps = timestamps
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp >= windowStart && timestamp <= now);
  const pumpFrequency = recentTimestamps.length / (windowMs / 1000);
  const pumpFrequencyStatus: WorkbenchHeatCapacityPumpFrequencyStatus = recentTimestamps.length === 0
    ? 'idle'
    : pumpFrequency < HEAT_CAPACITY_MIN_PUMP_FREQUENCY
      ? 'tooSlow'
      : 'suitable';
  return {
    timestamps: recentTimestamps,
    pumpFrequency,
    pumpFrequencyStatus,
  };
};

export const applyHeatCapacityPressureZero = (rawPressure: number, zeroOffset: number) => (
  roundNumber(rawPressure - zeroOffset, 2)
);

const getHeatCapacityPressureZeroDisplayText = (adjusted: boolean, zeroOffset: number) => (
  adjusted ? `零点偏移：${zeroOffset >= 0 ? '+' : ''}${zeroOffset.toFixed(2)} mV` : '未调零'
);

export const setHeatCapacityPressureZeroOffset = (
  file: WorkbenchHeatCapacityState,
  zeroOffset: number,
  adjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode = 'none',
  knobAngle = file.pressureZeroKnobAngle,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const pressureRawPlaceholder = Number.isFinite(file.pressureRawPlaceholder)
    ? file.pressureRawPlaceholder
    : HEAT_CAPACITY_PRESSURE_RAW_PLACEHOLDER_MV;
  const pressureZeroOffset = roundNumber(clampNumber(
    zeroOffset,
    HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
    HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
  ), 2);
  const pressureDisplayedPlaceholder = applyHeatCapacityPressureZero(pressureRawPlaceholder, pressureZeroOffset);
  const pressureZeroAdjusted = adjustMode !== 'none' || pressureZeroOffset !== 0;
  return {
    ...file,
    pressureZeroed: pressureZeroAdjusted,
    pressureZeroAdjusted,
    pressureZeroKnobAngle: roundNumber(knobAngle, 2),
    pressureZeroOffset,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, pressureZeroOffset),
    pressureRawPlaceholder,
    pressureDisplayedPlaceholder,
    pressureGaugeDisplayValue: pressureDisplayedPlaceholder,
    pressureSignalMv: file.powerOn ? pressureDisplayedPlaceholder : file.pressureSignalMv,
    pressureZeroAdjustMode: adjustMode,
    updatedAt: now,
  };
};

export const adjustHeatCapacityPressureZeroFine = (
  file: WorkbenchHeatCapacityState,
  direction: number,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const stepDirection = direction >= 0 ? 1 : -1;
  return setHeatCapacityPressureZeroOffset(
    file,
    file.pressureZeroOffset + stepDirection * HEAT_CAPACITY_PRESSURE_ZERO_FINE_OFFSET_STEP_MV,
    'fineWheel',
    file.pressureZeroKnobAngle + stepDirection * HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG,
    now,
  );
};

export const adjustHeatCapacityPressureZeroCoarse = (
  file: WorkbenchHeatCapacityState,
  angleDeltaDeg: number,
  now = Date.now(),
): WorkbenchHeatCapacityState => setHeatCapacityPressureZeroOffset(
  file,
  file.pressureZeroOffset + angleDeltaDeg * HEAT_CAPACITY_PRESSURE_ZERO_COARSE_OFFSET_PER_DEG_MV,
  'coarseDrag',
  file.pressureZeroKnobAngle + angleDeltaDeg,
  now,
);

export const resetHeatCapacityPressureZero = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => setHeatCapacityPressureZeroOffset(file, 0, 'none', 0, now);

export const isHeatCapacityPressureZeroValid = (file: WorkbenchHeatCapacityState) => (
  file.pressureZeroAdjusted && Math.abs(file.pressureDisplayedPlaceholder) <= 0.2
);

export interface WorkbenchStandardResultsLayout {
  openTabs: WorkbenchStandardResultsTab[];
  activeTab: WorkbenchStandardResultsTab;
  heightRatio: number;
}

export interface WorkbenchIdealWindowLayout {
  openTabs: WorkbenchIdealResultWindowKey[];
  activeIdealResultTab: WorkbenchIdealResultWindowKey;
  heightRatio: number;
  hasCustomHeight: boolean;
}

export interface WorkbenchParameterRow {
  key: keyof SimulationParams | 'relation';
  label: string;
  value: string;
  unit?: string;
  editable: boolean;
}

export interface WorkbenchValidationResult {
  valid: boolean;
  errors: string[];
}

interface WorkbenchFileBase {
  id: string;
  name: string;
  kind: WorkbenchFileKind;
  visiblePanels: WorkbenchPanelKey[];
  params: SimulationParams;
  appliedParams: SimulationParams;
  runState: WorkbenchRunState;
  stats: SimulationStats;
  chartData: ChartData;
  finalChartData: ChartData | null;
  liveWorkspaceSplitRatio: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorkbenchStandardState extends WorkbenchFileBase {
  kind: 'standard';
  particles: Particle[];
  standardResultsLayout: WorkbenchStandardResultsLayout;
}

export interface WorkbenchIdealState extends WorkbenchFileBase {
  kind: 'ideal';
  relation: ExperimentRelation;
  activeParams: SimulationParams;
  pointsByRelation: PointsByRelation;
  latestPressureSummary: PressureMeasurementSummary | null;
  needsReset: boolean;
  particles: Particle[];
  verificationState: 'not-started' | 'collecting' | 'verified' | 'failed';
  historyUnlocked: boolean;
  idealWindowLayout: WorkbenchIdealWindowLayout;
}

export interface WorkbenchHeatCapacityState extends WorkbenchFileBase {
  kind: 'heatCapacity';
  particles: Particle[];
  selectedHeatCapacityPanel: Extract<WorkbenchPanelKey, 'preview' | 'realtime'>;
  heatCapacityPhase: 'setup' | 'heating' | 'pumping' | 'recording' | 'complete';
  powerOn: boolean;
  glassPistonState: WorkbenchHeatCapacityStopcockState;
  stopcockAngleDeg: number;
  pressureZeroed: boolean;
  pressureZeroAdjusted: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroOffset: number;
  pressureZeroDisplayText: string;
  pressureRawPlaceholder: number;
  pressureDisplayedPlaceholder: number;
  pressureGaugeDisplayValue: number;
  pressureZeroAdjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode;
  temperatureSignalMv: number | null;
  pressureSignalMv: number | null;
  pressureKPa: number | null;
  pressureLimitKPa: number;
  pumpValveOpen: boolean;
  pumpValveState: WorkbenchHeatCapacityPumpValveState;
  pumpBulbState: WorkbenchHeatCapacityPumpBulbState;
  pumpStrokeTimestamps: number[];
  pumpFrequency: number;
  pumpFrequencyStatus: WorkbenchHeatCapacityPumpFrequencyStatus;
  lastPumpTime: number | null;
  pumpStrokeCount: number;
  pumpHint: string;
  pressurePlaceholder: number;
  temperaturePlaceholder: number;
  recordedPressures: {
    p0: number | null;
    p1: number | null;
    p2: number | null;
  };
  theoreticalGamma: number;
}

export type WorkbenchFileState = WorkbenchStandardState | WorkbenchIdealState | WorkbenchHeatCapacityState;

export const canZeroHeatCapacityPressure = (file: WorkbenchHeatCapacityState) => (
  file.powerOn && getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open'
);

export const registerHeatCapacityPumpStroke = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (!file.pumpValveOpen) {
    return {
      ...file,
      pumpHint: '打气阀门未打开，无法有效打气',
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }

  const frequencyState = getHeatCapacityPumpFrequencyState([...file.pumpStrokeTimestamps, now], now);
  const suitable = frequencyState.pumpFrequencyStatus === 'suitable';
  const nextPressureRawPlaceholder = roundNumber(
    Math.min(6, file.pressureRawPlaceholder + (suitable ? 0.35 : 0.08)),
    2,
  );
  const nextPressureDisplayedPlaceholder = applyHeatCapacityPressureZero(
    nextPressureRawPlaceholder,
    file.pressureZeroOffset,
  );
  return {
    ...file,
    heatCapacityPhase: 'pumping',
    pumpBulbState: 'compressing',
    pumpStrokeTimestamps: frequencyState.timestamps,
    pumpFrequency: frequencyState.pumpFrequency,
    pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
    lastPumpTime: now,
    pumpStrokeCount: file.pumpStrokeCount + 1,
    pressurePlaceholder: Math.min(file.pressureLimitKPa, file.pressurePlaceholder + (suitable ? 8 : 1.5)),
    temperaturePlaceholder: file.temperaturePlaceholder + (suitable ? 0.035 : 0.008),
    pressureKPa: Math.min(file.pressureLimitKPa, file.pressurePlaceholder + (suitable ? 8 : 1.5)),
    pressureRawPlaceholder: nextPressureRawPlaceholder,
    pressureDisplayedPlaceholder: nextPressureDisplayedPlaceholder,
    pressureGaugeDisplayValue: nextPressureDisplayedPlaceholder,
    pressureSignalMv: file.powerOn ? nextPressureDisplayedPlaceholder : file.pressureSignalMv,
    pumpHint: suitable ? '打气频率合适，可以继续观察压强变化' : '打气频率过低，实验效果可能不明显',
    updatedAt: now,
  };
};

export const refreshHeatCapacityPumpFrequency = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const frequencyState = getHeatCapacityPumpFrequencyState(file.pumpStrokeTimestamps, now);
  const pumpHint = frequencyState.pumpFrequencyStatus === 'idle'
    ? '未打气'
    : frequencyState.pumpFrequencyStatus === 'tooSlow'
      ? '打气频率过低，实验效果可能不明显'
      : '打气频率合适，可以继续观察压强变化';
  return {
    ...file,
    pumpStrokeTimestamps: frequencyState.timestamps,
    pumpFrequency: frequencyState.pumpFrequency,
    pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
    pumpBulbState: frequencyState.pumpFrequencyStatus === 'idle' ? 'idle' : file.pumpBulbState,
    pumpHint,
    updatedAt: now,
  };
};

export const DEFAULT_STANDARD_PARAMS: SimulationParams = {
  L: 15,
  N: 200,
  r: 0.2,
  m: 1.0,
  k: 1.0,
  dt: 0.01,
  nu: 1.0,
  equilibriumTime: 10,
  statsDuration: 60,
};

export const DEFAULT_IDEAL_PARAMS: SimulationParams = {
  L: 12,
  N: 128,
  r: 0.16,
  m: 1.0,
  k: 1.0,
  dt: 0.01,
  nu: 0.8,
  targetTemperature: 0.6,
  equilibriumTime: 4,
  statsDuration: 12,
};

export const DEFAULT_HEAT_CAPACITY_PARAMS: SimulationParams = {
  L: 10,
  N: 160,
  r: 0.18,
  m: 1.0,
  k: 1.0,
  dt: 0.01,
  nu: 0.6,
  targetTemperature: 1,
  equilibriumTime: 6,
  statsDuration: 18,
};

export const createIdleStats = (): SimulationStats => ({
  time: 0,
  temperature: 0,
  pressure: 0,
  meanSpeed: 0,
  rmsSpeed: 0,
  isEquilibrated: false,
  progress: 0,
  phase: 'idle',
});

export const createEmptyChartData = (): ChartData => ({
  speed: [],
  energy: [],
  energyLog: [],
  tempHistory: [],
});

export const cloneParams = (params: SimulationParams): SimulationParams => ({ ...params });

export const createDefaultStandardResultsLayout = (
  defaults?: Partial<Pick<WorkbenchStandardResultsLayout, 'heightRatio'>>,
): WorkbenchStandardResultsLayout => ({
  openTabs: ['summary', 'dataTable', 'figures'],
  activeTab: 'summary',
  heightRatio: defaults?.heightRatio ?? IDEAL_RESULT_HEIGHT_RATIO,
});

export const createDefaultIdealWindowLayout = (
  defaults?: Partial<Pick<WorkbenchIdealWindowLayout, 'heightRatio'>>,
): WorkbenchIdealWindowLayout => ({
  openTabs: ['experimentPoints', 'verification'],
  activeIdealResultTab: 'experimentPoints',
  heightRatio: defaults?.heightRatio ?? IDEAL_RESULT_HEIGHT_RATIO,
  hasCustomHeight: false,
});

const formatNumber = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '');
};

const createBaseFile = (
  kind: WorkbenchFileKind,
  index: number,
  params: SimulationParams,
  defaults?: Partial<Pick<WorkbenchFileBase, 'liveWorkspaceSplitRatio'>>,
): Omit<WorkbenchFileBase, 'kind'> => {
  const paddedIndex = String(index).padStart(3, '0');
  const now = Date.now();
  const namePrefix = kind === 'standard'
    ? 'Standard Simulation'
    : kind === 'ideal'
      ? 'Ideal Gas Simulation'
      : 'Heat Capacity Ratio';

  return {
    id: `${kind}-${paddedIndex}`,
    name: `${namePrefix} - ${paddedIndex}`,
    visiblePanels: ['preview', 'realtime'],
    params: cloneParams(params),
    appliedParams: cloneParams(params),
    runState: 'idle',
    stats: createIdleStats(),
    chartData: createEmptyChartData(),
    finalChartData: null,
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(defaults?.liveWorkspaceSplitRatio),
    createdAt: now,
    updatedAt: now,
  };
};

export const normalizeHeatCapacityFileName = (name: string) => {
  const match = /^Hard-Sphere Heat Capacity Ratio - (\d{3})$/.exec(name);
  return match ? `Heat Capacity Ratio - ${match[1]}` : name;
};

export interface WorkbenchFileLayoutDefaults {
  resultsHeightRatio?: number;
  liveWorkspaceSplitRatio?: number;
}

export const createDefaultStandardFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchStandardState => ({
  ...createBaseFile('standard', index, DEFAULT_STANDARD_PARAMS, defaults),
  kind: 'standard',
  particles: [],
  standardResultsLayout: createDefaultStandardResultsLayout({ heightRatio: defaults?.resultsHeightRatio }),
});

export const createDefaultIdealFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchIdealState => ({
  ...createBaseFile('ideal', index, DEFAULT_IDEAL_PARAMS, defaults),
  kind: 'ideal',
  relation: 'pt',
  activeParams: cloneParams(DEFAULT_IDEAL_PARAMS),
  pointsByRelation: createEmptyPointsByRelation(),
  latestPressureSummary: null,
  needsReset: false,
  particles: [],
  verificationState: 'not-started',
  historyUnlocked: false,
  idealWindowLayout: createDefaultIdealWindowLayout({ heightRatio: defaults?.resultsHeightRatio }),
});

export const createDefaultHeatCapacityFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchHeatCapacityState => ({
  ...createBaseFile('heatCapacity', index, DEFAULT_HEAT_CAPACITY_PARAMS, {
    ...defaults,
    liveWorkspaceSplitRatio: defaults?.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  }),
  kind: 'heatCapacity',
  particles: [],
  selectedHeatCapacityPanel: 'preview',
  heatCapacityPhase: 'setup',
  powerOn: false,
  glassPistonState: 'closed',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  pressureZeroed: false,
  pressureZeroAdjusted: false,
  pressureZeroKnobAngle: 0,
  pressureZeroOffset: 0,
  pressureZeroDisplayText: '未调零',
  pressureRawPlaceholder: HEAT_CAPACITY_PRESSURE_RAW_PLACEHOLDER_MV,
  pressureDisplayedPlaceholder: HEAT_CAPACITY_PRESSURE_RAW_PLACEHOLDER_MV,
  pressureGaugeDisplayValue: HEAT_CAPACITY_PRESSURE_RAW_PLACEHOLDER_MV,
  pressureZeroAdjustMode: 'none',
  temperatureSignalMv: null,
  pressureSignalMv: null,
  pressureKPa: null,
  pressureLimitKPa: 500,
  pumpValveOpen: false,
  pumpValveState: 'closed',
  pumpBulbState: 'idle',
  pumpStrokeTimestamps: [],
  pumpFrequency: 0,
  pumpFrequencyStatus: 'idle',
  lastPumpTime: null,
  pumpStrokeCount: 0,
  pumpHint: '未打气',
  pressurePlaceholder: 101.33,
  temperaturePlaceholder: 1,
  recordedPressures: {
    p0: null,
    p1: null,
    p2: null,
  },
  theoreticalGamma: 5 / 3,
});

export const createInitialWorkbenchFiles = (): WorkbenchFileState[] => [
  createDefaultStandardFile(1),
  createDefaultIdealFile(1),
];

export const areWorkbenchParamsEqual = (a: SimulationParams, b: SimulationParams) => (
  a.N === b.N &&
  a.L === b.L &&
  a.r === b.r &&
  a.m === b.m &&
  a.k === b.k &&
  a.dt === b.dt &&
  a.nu === b.nu &&
  a.equilibriumTime === b.equilibriumTime &&
  a.statsDuration === b.statsDuration &&
  a.targetTemperature === b.targetTemperature
);

export const getWorkbenchParameterRows = (file: WorkbenchFileState): WorkbenchParameterRow[] => {
  const rows: WorkbenchParameterRow[] = [
    { key: 'N', label: 'N', value: formatNumber(file.params.N), unit: 'particles', editable: true },
    { key: 'r', label: 'r', value: formatNumber(file.params.r), editable: true },
    { key: 'L', label: 'L', value: formatNumber(file.params.L), editable: true },
    { key: 'dt', label: 'dt', value: formatNumber(file.params.dt), editable: true },
    { key: 'nu', label: 'nu', value: formatNumber(file.params.nu), editable: true },
    { key: 'equilibriumTime', label: 'equilibriumTime', value: formatNumber(file.params.equilibriumTime), unit: 's', editable: true },
    { key: 'statsDuration', label: 'statsDuration', value: formatNumber(file.params.statsDuration), unit: 's', editable: true },
  ];

  if (file.kind === 'ideal') {
    rows.push(
      {
        key: 'targetTemperature',
        label: 'targetTemperature',
        value: formatNumber(file.params.targetTemperature),
        unit: 'K*',
        editable: true,
      },
      {
        key: 'relation',
        label: 'verification',
        value: file.relation === 'pt' ? 'P-T relation' : file.relation === 'pv' ? 'P-V relation' : 'P-N relation',
        editable: false,
      },
    );
  }

  return rows;
};

export const validateWorkbenchParams = (params: SimulationParams): WorkbenchValidationResult => {
  const errors: string[] = [];

  if (!Number.isFinite(params.N) || params.N <= 0) errors.push('N must be greater than 0.');
  if (!Number.isFinite(params.L) || params.L <= 0) errors.push('L must be greater than 0.');
  if (!Number.isFinite(params.r) || params.r <= 0) errors.push('r must be greater than 0.');
  if (!Number.isFinite(params.dt) || params.dt <= 0) errors.push('dt must be greater than 0.');
  if (!Number.isFinite(params.equilibriumTime) || params.equilibriumTime < 0) {
    errors.push('equilibriumTime must be 0 or greater.');
  }
  if (!Number.isFinite(params.statsDuration) || params.statsDuration <= 0) {
    errors.push('statsDuration must be greater than 0.');
  }
  if (typeof params.targetTemperature === 'number' && (!Number.isFinite(params.targetTemperature) || params.targetTemperature <= 0)) {
    errors.push('targetTemperature must be greater than 0.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
