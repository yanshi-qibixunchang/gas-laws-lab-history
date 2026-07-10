import type {
  PhysicsEngineSnapshotV1,
} from '../../domain/hardSphere/PhysicsEngine.ts';
import type {
  ChartData,
  Particle,
  SimulationStats,
} from '../../shared/types.ts';
import {
  cloneHardSphereEngineSnapshot,
  normalizeHardSphereEngineSnapshot,
} from './workbenchHardSpherePersistence.ts';
import {
  clonePersistenceValue,
  isPersistenceFiniteNumber as isFiniteNumber,
  isPersistenceRecord as isRecord,
} from './workbenchPersistenceValue.ts';
import { normalizeWorkbenchPanelKeys } from './workbenchPanelRegistry.ts';
import {
  WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  clampWorkbenchLiveSplitRatio,
  createDefaultStandardFile,
  createEmptyChartData,
  createIdleStats,
  type WorkbenchPanelKey,
  type WorkbenchRunState,
  type WorkbenchStandardResultsLayout,
  type WorkbenchStandardState,
} from './workbenchState.ts';
import {
  normalizeStandardResultsLayout,
} from './workbenchLayoutCompatibility.ts';
import type {
  WorkbenchExperimentFileEnvelopeV1,
} from './workbenchPersistenceSchema.ts';

export const STANDARD_SIMULATION_SCHEMA_VERSION = 1 as const;

export interface StandardPersistencePayloadV1 {
  experimentKind: 'standard';
  standardSchemaVersion: typeof STANDARD_SIMULATION_SCHEMA_VERSION;
  params: WorkbenchStandardState['params'];
  appliedParams: WorkbenchStandardState['appliedParams'];
  runtime: {
    runState: WorkbenchRunState;
    stats: SimulationStats;
    chartData: ChartData;
    finalChartData: ChartData | null;
    particles: Particle[];
    engineSnapshot: PhysicsEngineSnapshotV1 | null;
  };
  results: {
    standardResultsLayout: WorkbenchStandardResultsLayout;
  };
}

export interface StandardPayloadValidationResult {
  valid: boolean;
  errors: string[];
}

const runStates = ['idle', 'running', 'paused', 'finished', 'needs-reset'] as const satisfies readonly WorkbenchRunState[];

const isWorkbenchRunState = (value: unknown): value is WorkbenchRunState => (
  runStates.includes(value as WorkbenchRunState)
);

const normalizeVisiblePanels = (
  value: unknown,
  fallback: WorkbenchPanelKey[],
): WorkbenchPanelKey[] => normalizeWorkbenchPanelKeys(value, fallback);

const normalizeStats = (value: unknown): SimulationStats => (
  isRecord(value) ? { ...createIdleStats(), ...value } as SimulationStats : createIdleStats()
);

const normalizeChartData = (value: unknown): ChartData => (
  isRecord(value) ? clonePersistenceValue(value) as unknown as ChartData : createEmptyChartData()
);

const normalizeParticles = (value: unknown): Particle[] => (
  Array.isArray(value) ? clonePersistenceValue(value) as Particle[] : []
);

export const createStandardPersistencePayload = (
  file: WorkbenchStandardState,
  savedAt: number,
): StandardPersistencePayloadV1 => {
  void savedAt;
  return {
    experimentKind: 'standard',
    standardSchemaVersion: STANDARD_SIMULATION_SCHEMA_VERSION,
    params: { ...file.params },
    appliedParams: { ...file.appliedParams },
    runtime: {
      runState: file.runState,
      stats: { ...file.stats },
      chartData: clonePersistenceValue(file.chartData),
      finalChartData: file.finalChartData ? clonePersistenceValue(file.finalChartData) : null,
      particles: file.particles.map((particle) => ({ ...particle })),
      engineSnapshot: cloneHardSphereEngineSnapshot(file.hardSphereEngineSnapshot),
    },
    results: {
      standardResultsLayout: clonePersistenceValue(file.standardResultsLayout),
    },
  };
};

export const validateStandardPersistencePayload = (
  payload: unknown,
): StandardPayloadValidationResult => {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (payload.experimentKind !== 'standard') {
    errors.push('experimentKind must be standard');
  }
  if (payload.standardSchemaVersion !== STANDARD_SIMULATION_SCHEMA_VERSION) {
    errors.push('standardSchemaVersion is unsupported');
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

export const restoreStandardFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchStandardState => {
  const layout = fileEnvelope.layout;
  const standardPayload = isRecord(payload) ? payload as Partial<StandardPersistencePayloadV1> : {};
  const runtime = isRecord(standardPayload.runtime) ? standardPayload.runtime as Partial<StandardPersistencePayloadV1['runtime']> : {};
  const results = isRecord(standardPayload.results) ? standardPayload.results as Partial<StandardPersistencePayloadV1['results']> : {};
  const fallback = createDefaultStandardFile(index, {
    resultsHeightRatio: isRecord(layout.standardResultsLayout) && isFiniteNumber(layout.standardResultsLayout.heightRatio)
      ? layout.standardResultsLayout.heightRatio
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
    params: isRecord(standardPayload.params) ? clonePersistenceValue(standardPayload.params) as WorkbenchStandardState['params'] : fallback.params,
    appliedParams: isRecord(standardPayload.appliedParams)
      ? clonePersistenceValue(standardPayload.appliedParams) as WorkbenchStandardState['appliedParams']
      : fallback.appliedParams,
    runState,
    stats: normalizeStats(runtime.stats),
    chartData: normalizeChartData(runtime.chartData),
    finalChartData: runtime.finalChartData === null ? null : normalizeChartData(runtime.finalChartData),
    particles: normalizeParticles(runtime.particles),
    hardSphereEngineSnapshot: normalizeHardSphereEngineSnapshot(runtime.engineSnapshot),
    standardResultsLayout: normalizeStandardResultsLayout(
      results.standardResultsLayout ?? layout.standardResultsLayout,
    ),
  };
};
