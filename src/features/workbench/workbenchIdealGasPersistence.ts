import type {
  PhysicsEngineSnapshotV1,
} from '../../domain/hardSphere/PhysicsEngine.ts';
import {
  createEmptyPointsByRelation,
  type PointsByRelation,
} from '../../domain/idealGas/idealGasExperiment.ts';
import type {
  ChartData,
  ExperimentRelation,
  Particle,
  PressureMeasurementSummary,
  SimulationStats,
} from '../../shared/types.ts';
import {
  cloneHardSphereEngineSnapshot,
  clonePersistenceValue,
  normalizeHardSphereEngineSnapshot,
} from './workbenchHardSpherePersistence.ts';
import {
  WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  clampWorkbenchLiveSplitRatio,
  createDefaultIdealFile,
  createDefaultIdealWindowLayout,
  createEmptyChartData,
  createIdleStats,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchIdealState,
  type WorkbenchIdealWindowLayout,
  type WorkbenchPanelKey,
  type WorkbenchRunState,
} from './workbenchState.ts';
import type {
  WorkbenchExperimentFileEnvelopeV1,
} from './workbenchPersistenceSchema.ts';

export const IDEAL_GAS_SCHEMA_VERSION = 1 as const;

export interface IdealGasPersistencePayloadV1 {
  experimentKind: 'ideal';
  idealGasSchemaVersion: typeof IDEAL_GAS_SCHEMA_VERSION;
  relation: ExperimentRelation;
  params: WorkbenchIdealState['params'];
  appliedParams: WorkbenchIdealState['appliedParams'];
  activeParams: WorkbenchIdealState['activeParams'];
  runtime: {
    runState: WorkbenchRunState;
    stats: SimulationStats;
    chartData: ChartData;
    finalChartData: ChartData | null;
    particles: Particle[];
    engineSnapshot: PhysicsEngineSnapshotV1 | null;
    latestPressureSummary: PressureMeasurementSummary | null;
  };
  experiment: {
    pointsByRelation: PointsByRelation;
    needsReset: boolean;
    verificationState: WorkbenchIdealState['verificationState'];
    historyUnlocked: boolean;
  };
  results: {
    idealWindowLayout: WorkbenchIdealWindowLayout;
  };
}

export interface IdealGasPayloadValidationResult {
  valid: boolean;
  errors: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const panelKeys = ['preview', 'realtime', 'results', 'experimentPoints', 'verification', 'heatCapacityGuide', 'heatCapacityRecords', 'heatCapacityReview', 'history'] as const satisfies readonly WorkbenchPanelKey[];
const runStates = ['idle', 'running', 'paused', 'finished', 'needs-reset'] as const satisfies readonly WorkbenchRunState[];
const idealTabs = ['experimentPoints', 'verification'] as const satisfies readonly WorkbenchIdealResultWindowKey[];
const idealRelations = ['pt', 'pv', 'pn'] as const satisfies readonly ExperimentRelation[];
const verificationStates = ['not-started', 'collecting', 'verified', 'failed'] as const satisfies readonly WorkbenchIdealState['verificationState'][];

const isWorkbenchRunState = (value: unknown): value is WorkbenchRunState => (
  runStates.includes(value as WorkbenchRunState)
);

const normalizeVisiblePanels = (
  value: unknown,
  fallback: WorkbenchPanelKey[],
): WorkbenchPanelKey[] => (
  Array.isArray(value)
    ? value.filter((panel): panel is WorkbenchPanelKey => panelKeys.includes(panel as WorkbenchPanelKey))
    : fallback
);

const normalizeIdealWindowLayout = (
  value: unknown,
): WorkbenchIdealWindowLayout => {
  const fallback = createDefaultIdealWindowLayout();
  if (!isRecord(value)) return fallback;
  const openTabs = Array.isArray(value.openTabs)
    ? value.openTabs.filter((tab): tab is WorkbenchIdealResultWindowKey => idealTabs.includes(tab as WorkbenchIdealResultWindowKey))
    : fallback.openTabs;
  const activeIdealResultTab = idealTabs.includes(value.activeIdealResultTab as WorkbenchIdealResultWindowKey)
    ? value.activeIdealResultTab as WorkbenchIdealResultWindowKey
    : openTabs[0] ?? fallback.activeIdealResultTab;
  return {
    openTabs: openTabs.length > 0 ? openTabs : fallback.openTabs,
    activeIdealResultTab,
    heightRatio: isFiniteNumber(value.heightRatio) ? value.heightRatio : fallback.heightRatio,
    hasCustomHeight: value.hasCustomHeight === true,
  };
};

const normalizeStats = (value: unknown): SimulationStats => (
  isRecord(value) ? { ...createIdleStats(), ...value } as SimulationStats : createIdleStats()
);

const normalizeChartData = (value: unknown): ChartData => (
  isRecord(value) ? clonePersistenceValue(value) as unknown as ChartData : createEmptyChartData()
);

const normalizeParticles = (value: unknown): Particle[] => (
  Array.isArray(value) ? clonePersistenceValue(value) as Particle[] : []
);

const normalizeRelation = (value: unknown, fallback: ExperimentRelation): ExperimentRelation => (
  idealRelations.includes(value as ExperimentRelation) ? value as ExperimentRelation : fallback
);

const normalizePointsByRelation = (value: unknown): PointsByRelation => {
  const fallback = createEmptyPointsByRelation();
  if (!isRecord(value)) return fallback;
  return {
    pt: Array.isArray(value.pt) ? clonePersistenceValue(value.pt) as PointsByRelation['pt'] : fallback.pt,
    pv: Array.isArray(value.pv) ? clonePersistenceValue(value.pv) as PointsByRelation['pv'] : fallback.pv,
    pn: Array.isArray(value.pn) ? clonePersistenceValue(value.pn) as PointsByRelation['pn'] : fallback.pn,
  };
};

const normalizePressureSummary = (
  value: unknown,
): PressureMeasurementSummary | null => (
  isRecord(value) ? clonePersistenceValue(value) as unknown as PressureMeasurementSummary : null
);

export const createIdealGasPersistencePayload = (
  file: WorkbenchIdealState,
  savedAt: number,
): IdealGasPersistencePayloadV1 => {
  void savedAt;
  return {
    experimentKind: 'ideal',
    idealGasSchemaVersion: IDEAL_GAS_SCHEMA_VERSION,
    relation: file.relation,
    params: { ...file.params },
    appliedParams: { ...file.appliedParams },
    activeParams: { ...file.activeParams },
    runtime: {
      runState: file.runState,
      stats: { ...file.stats },
      chartData: clonePersistenceValue(file.chartData),
      finalChartData: file.finalChartData ? clonePersistenceValue(file.finalChartData) : null,
      particles: file.particles.map((particle) => ({ ...particle })),
      engineSnapshot: cloneHardSphereEngineSnapshot(file.hardSphereEngineSnapshot),
      latestPressureSummary: file.latestPressureSummary ? clonePersistenceValue(file.latestPressureSummary) : null,
    },
    experiment: {
      pointsByRelation: clonePersistenceValue(file.pointsByRelation),
      needsReset: file.needsReset,
      verificationState: file.verificationState,
      historyUnlocked: file.historyUnlocked,
    },
    results: {
      idealWindowLayout: clonePersistenceValue(file.idealWindowLayout),
    },
  };
};

export const validateIdealGasPersistencePayload = (
  payload: unknown,
): IdealGasPayloadValidationResult => {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (payload.experimentKind !== 'ideal') {
    errors.push('experimentKind must be ideal');
  }
  if (payload.idealGasSchemaVersion !== IDEAL_GAS_SCHEMA_VERSION) {
    errors.push('idealGasSchemaVersion is unsupported');
  }
  if (!idealRelations.includes(payload.relation as ExperimentRelation)) {
    errors.push('relation is invalid');
  }
  const runtime = isRecord(payload.runtime) ? payload.runtime : null;
  if (!runtime) {
    errors.push('runtime is required');
  } else {
    if (!isWorkbenchRunState(runtime.runState)) errors.push('runtime.runState is invalid');
    if (runtime.engineSnapshot !== null && normalizeHardSphereEngineSnapshot(runtime.engineSnapshot) === null) {
      errors.push('runtime.engineSnapshot is invalid');
    }
  }
  return { valid: errors.length === 0, errors };
};

export const restoreIdealGasFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchIdealState => {
  const layout = fileEnvelope.layout;
  const idealPayload = isRecord(payload) ? payload as Partial<IdealGasPersistencePayloadV1> : {};
  const runtime = isRecord(idealPayload.runtime) ? idealPayload.runtime as Partial<IdealGasPersistencePayloadV1['runtime']> : {};
  const experiment = isRecord(idealPayload.experiment) ? idealPayload.experiment as Partial<IdealGasPersistencePayloadV1['experiment']> : {};
  const results = isRecord(idealPayload.results) ? idealPayload.results as Partial<IdealGasPersistencePayloadV1['results']> : {};
  const fallback = createDefaultIdealFile(index, {
    resultsHeightRatio: isRecord(layout.idealWindowLayout) && isFiniteNumber(layout.idealWindowLayout.heightRatio)
      ? layout.idealWindowLayout.heightRatio
      : undefined,
    liveWorkspaceSplitRatio: isFiniteNumber(layout.liveWorkspaceSplitRatio)
      ? layout.liveWorkspaceSplitRatio
      : WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  });
  const runState = isWorkbenchRunState(runtime.runState)
    ? runtime.runState === 'running' ? 'paused' : runtime.runState
    : fallback.runState;
  return {
    ...fallback,
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    visiblePanels: normalizeVisiblePanels(layout.visiblePanels, fallback.visiblePanels),
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(layout.liveWorkspaceSplitRatio),
    relation: normalizeRelation(idealPayload.relation, fallback.relation),
    params: isRecord(idealPayload.params) ? clonePersistenceValue(idealPayload.params) as WorkbenchIdealState['params'] : fallback.params,
    appliedParams: isRecord(idealPayload.appliedParams)
      ? clonePersistenceValue(idealPayload.appliedParams) as WorkbenchIdealState['appliedParams']
      : fallback.appliedParams,
    activeParams: isRecord(idealPayload.activeParams)
      ? clonePersistenceValue(idealPayload.activeParams) as WorkbenchIdealState['activeParams']
      : fallback.activeParams,
    runState,
    stats: normalizeStats(runtime.stats),
    chartData: normalizeChartData(runtime.chartData),
    finalChartData: runtime.finalChartData === null ? null : normalizeChartData(runtime.finalChartData),
    latestPressureSummary: normalizePressureSummary(runtime.latestPressureSummary),
    needsReset: experiment.needsReset === true,
    particles: normalizeParticles(runtime.particles),
    hardSphereEngineSnapshot: normalizeHardSphereEngineSnapshot(runtime.engineSnapshot),
    pointsByRelation: normalizePointsByRelation(experiment.pointsByRelation),
    verificationState: verificationStates.includes(experiment.verificationState as WorkbenchIdealState['verificationState'])
      ? experiment.verificationState as WorkbenchIdealState['verificationState']
      : fallback.verificationState,
    historyUnlocked: experiment.historyUnlocked === true,
    idealWindowLayout: normalizeIdealWindowLayout(results.idealWindowLayout ?? layout.idealWindowLayout),
  };
};
