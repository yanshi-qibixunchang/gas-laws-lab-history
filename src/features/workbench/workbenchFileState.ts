import type {
  ChartData,
  ExperimentRelation,
  Particle,
  PressureMeasurementSummary,
  SimulationParams,
  SimulationStats,
} from '../../shared/types';
import type { PhysicsEngineSnapshotV2 } from '../../domain/hardSphere/PhysicsEngine.ts';
import {
  createEmptyPointsByRelation,
  type PointsByRelation,
} from '../../domain/idealGas/idealGasExperiment.ts';
import {
  WORKBENCH_FILE_NAME_PREFIX_BY_KIND,
  type WorkbenchFileKind,
} from './workbenchFileKind.ts';

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
  | 'heatCapacityGuide'
  | 'heatCapacityRecords'
  | 'heatCapacityReview';

export type WorkbenchIdealResultWindowKey = 'experimentPoints' | 'verification';
export type WorkbenchStandardResultsTab = 'summary' | 'dataTable' | 'figures';
export type WorkbenchHeatCapacityPanelKey =
  | 'heatCapacityGuide'
  | 'heatCapacityRecords'
  | 'heatCapacityReview';
export type WorkbenchHeatCapacityTabId = 'guide' | 'records' | 'review';

export const IDEAL_RESULT_HEIGHT_RATIO = 0.5;
export const WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO = 0.48;
export const WORKBENCH_LIVE_SPLIT_MIN_RATIO = 0.34;
export const WORKBENCH_LIVE_SPLIT_MAX_RATIO = 0.66;
export const WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO = 0.66;
export const WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO = 0.56605;

export const clampWorkbenchLiveSplitRatio = (value: unknown) => {
  const ratio = typeof value === 'number' && Number.isFinite(value)
    ? value
    : WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO;
  return Math.min(WORKBENCH_LIVE_SPLIT_MAX_RATIO, Math.max(WORKBENCH_LIVE_SPLIT_MIN_RATIO, ratio));
};

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

export interface WorkbenchFileBase {
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
  lastOpenedAt: number;
}

export interface WorkbenchStandardState extends WorkbenchFileBase {
  kind: 'standard';
  particles: Particle[];
  hardSphereEngineSnapshot: PhysicsEngineSnapshotV2 | null;
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
  hardSphereEngineSnapshot: PhysicsEngineSnapshotV2 | null;
  verificationState: 'not-started' | 'collecting' | 'verified' | 'failed';
  historyUnlocked: boolean;
  idealWindowLayout: WorkbenchIdealWindowLayout;
}

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

export interface WorkbenchFileLayoutDefaults {
  resultsHeightRatio?: number;
  liveWorkspaceSplitRatio?: number;
}

export const createWorkbenchBaseFile = (
  kind: WorkbenchFileKind,
  index: number,
  params: SimulationParams,
  defaults?: Partial<Pick<WorkbenchFileBase, 'liveWorkspaceSplitRatio'>>,
): Omit<WorkbenchFileBase, 'kind'> => {
  const paddedIndex = String(index).padStart(3, '0');
  const now = Date.now();
  const namePrefix = WORKBENCH_FILE_NAME_PREFIX_BY_KIND[kind];

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
    lastOpenedAt: now,
  };
};

export const createDefaultStandardFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchStandardState => ({
  ...createWorkbenchBaseFile('standard', index, DEFAULT_STANDARD_PARAMS, defaults),
  kind: 'standard',
  particles: [],
  hardSphereEngineSnapshot: null,
  standardResultsLayout: createDefaultStandardResultsLayout({ heightRatio: defaults?.resultsHeightRatio }),
});

export const createDefaultIdealFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchIdealState => ({
  ...createWorkbenchBaseFile('ideal', index, DEFAULT_IDEAL_PARAMS, defaults),
  kind: 'ideal',
  relation: 'pt',
  activeParams: cloneParams(DEFAULT_IDEAL_PARAMS),
  pointsByRelation: createEmptyPointsByRelation(),
  latestPressureSummary: null,
  needsReset: false,
  particles: [],
  hardSphereEngineSnapshot: null,
  verificationState: 'not-started',
  historyUnlocked: false,
  idealWindowLayout: createDefaultIdealWindowLayout({ heightRatio: defaults?.resultsHeightRatio }),
});
