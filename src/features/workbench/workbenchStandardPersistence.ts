import {
  PhysicsEngine,
  type PhysicsEngineSnapshotV2,
} from '../../domain/hardSphere/PhysicsEngine.ts';
import type {
  ChartData,
  Particle,
  SimulationStats,
} from '../../shared/types.ts';
import {
  cloneHardSphereEngineSnapshot,
  isLegacyHardSphereEngineSnapshotV1,
  normalizeHardSphereEngineSnapshot,
  normalizeSimulationParamsSnapshot,
  upgradeLegacyHardSphereEngineSnapshotV1,
} from './workbenchHardSpherePersistence.ts';
import {
  sanitizeHardSphereSimulationParams,
  validateHardSphereSimulationParams,
} from '../../domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  clonePersistenceValue,
  isPersistenceFiniteNumber as isFiniteNumber,
  isPersistenceRecord as isRecord,
} from './workbenchPersistenceValue.ts';
import {
  WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  clampWorkbenchLiveSplitRatio,
  createEmptyChartData,
  createDefaultStandardFile,
  createIdleStats,
  type WorkbenchRunState,
  type WorkbenchStandardResultsLayout,
  type WorkbenchStandardState,
} from './workbenchFileState.ts';
import { areWorkbenchParamsEqual } from './workbenchState.ts';
import {
  normalizeStandardResultsLayout,
} from './workbenchLayoutCompatibility.ts';
import type {
  WorkbenchExperimentFileEnvelopeV1,
} from './workbenchPersistenceSchema.ts';
import {
  isPersistedWorkbenchRunState,
  LEGACY_HARD_SPHERE_MAX_INGESTED_PARTICLES,
  isPersistedChartDataResourceSafe,
  isPersistedParticlesResourceSafe,
  isPersistedSimulationStatsResourceSafe,
  normalizePersistedChartData,
  normalizePersistedParticles,
  normalizePersistedSimulationStats,
  normalizePersistedVisiblePanels,
} from './workbenchRuntimePersistence.ts';

export const LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION = 1 as const;
export const STANDARD_SIMULATION_SCHEMA_VERSION = 2 as const;

export interface StandardPersistencePayloadV2 {
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
    engineSnapshot: PhysicsEngineSnapshotV2 | null;
  };
  results: {
    standardResultsLayout: WorkbenchStandardResultsLayout;
  };
}

export interface StandardPayloadValidationResult {
  valid: boolean;
  errors: string[];
}

const isSimulationParamsResourceSafe = (value: unknown) => (
  isRecord(value) &&
  Object.keys(value).length <= 10 &&
  Object.values(value).every(isFiniteNumber) &&
  normalizeSimulationParamsSnapshot(value) !== null
);

export const createStandardPersistencePayload = (
  file: WorkbenchStandardState,
  savedAt: number,
): StandardPersistencePayloadV2 => {
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
  const isLegacySchema = payload.standardSchemaVersion === LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION;
  if (!isLegacySchema && payload.standardSchemaVersion !== STANDARD_SIMULATION_SCHEMA_VERSION) {
    errors.push('standardSchemaVersion is unsupported');
  }
  if (!isSimulationParamsResourceSafe(payload.params)) errors.push('params is invalid');
  if (!isSimulationParamsResourceSafe(payload.appliedParams)) errors.push('appliedParams is invalid');
  const runtime = isRecord(payload.runtime) ? payload.runtime : null;
  if (!runtime) {
    errors.push('runtime is required');
  } else {
    if (!isPersistedWorkbenchRunState(runtime.runState)) errors.push('runtime.runState is invalid');
    if (!isPersistedSimulationStatsResourceSafe(runtime.stats)) errors.push('runtime.stats exceeds resource bounds');
    if (!isPersistedChartDataResourceSafe(runtime.chartData)) errors.push('runtime.chartData exceeds resource bounds');
    if (runtime.finalChartData !== null && !isPersistedChartDataResourceSafe(runtime.finalChartData)) {
      errors.push('runtime.finalChartData exceeds resource bounds');
    }
    if (!isPersistedParticlesResourceSafe(
      runtime.particles,
      isLegacySchema ? LEGACY_HARD_SPHERE_MAX_INGESTED_PARTICLES : undefined,
    )) errors.push('runtime.particles exceeds resource bounds');
    if (
      runtime.engineSnapshot !== null &&
      (
        isLegacySchema
          ? !isLegacyHardSphereEngineSnapshotV1(runtime.engineSnapshot)
          : normalizeHardSphereEngineSnapshot(runtime.engineSnapshot) === null
      )
    ) errors.push('runtime.engineSnapshot is invalid');
  }
  return { valid: errors.length === 0, errors };
};

export const restoreStandardFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchStandardState => {
  const layout = fileEnvelope.layout;
  const standardSchemaVersion = isRecord(payload) ? payload.standardSchemaVersion : undefined;
  const standardPayload = isRecord(payload) ? payload as Partial<StandardPersistencePayloadV2> : {};
  const runtime = isRecord(standardPayload.runtime) ? standardPayload.runtime as Partial<StandardPersistencePayloadV2['runtime']> : {};
  const results = isRecord(standardPayload.results) ? standardPayload.results as Partial<StandardPersistencePayloadV2['results']> : {};
  const fallback = createDefaultStandardFile(index, {
    resultsHeightRatio: isRecord(layout.standardResultsLayout) && isFiniteNumber(layout.standardResultsLayout.heightRatio)
      ? layout.standardResultsLayout.heightRatio
      : undefined,
    liveWorkspaceSplitRatio: isFiniteNumber(layout.liveWorkspaceSplitRatio)
      ? layout.liveWorkspaceSplitRatio
      : WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  });
  const runState = isPersistedWorkbenchRunState(runtime.runState)
    ? runtime.runState === 'running' ? 'paused' : runtime.runState
    : fallback.runState;
  const params = isRecord(standardPayload.params)
    ? clonePersistenceValue(standardPayload.params) as WorkbenchStandardState['params']
    : fallback.params;
  const persistedAppliedParams = isRecord(standardPayload.appliedParams)
    ? clonePersistenceValue(standardPayload.appliedParams) as WorkbenchStandardState['appliedParams']
    : fallback.appliedParams;
  const appliedParamsValid = validateHardSphereSimulationParams(persistedAppliedParams).valid;
  const appliedParams = appliedParamsValid
    ? persistedAppliedParams
    : sanitizeHardSphereSimulationParams(persistedAppliedParams);
  const isLegacySchema = standardSchemaVersion === LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION;
  const hardSphereEngineSnapshot = isLegacySchema
    ? upgradeLegacyHardSphereEngineSnapshotV1(runtime.engineSnapshot)
    : normalizeHardSphereEngineSnapshot(runtime.engineSnapshot);
  const snapshotMatchesAppliedParams = hardSphereEngineSnapshot !== null &&
    areWorkbenchParamsEqual(hardSphereEngineSnapshot.params, appliedParams);
  let legacyProjectedEngine: PhysicsEngine | null = null;
  if (isLegacySchema && hardSphereEngineSnapshot !== null && snapshotMatchesAppliedParams) {
    try {
      legacyProjectedEngine = PhysicsEngine.fromSnapshot(hardSphereEngineSnapshot);
    } catch {
      legacyProjectedEngine = null;
    }
  }
  const hadLiveProjection = hardSphereEngineSnapshot !== null ||
    (Array.isArray(runtime.particles) && runtime.particles.length > 0) ||
    (isRecord(runtime.stats) && runtime.stats.phase !== 'idle') ||
    (isRecord(runtime.chartData) && Object.values(runtime.chartData).some((value) => (
      Array.isArray(value) && value.length > 0
    )));
  const resetLiveProjection = !appliedParamsValid ||
    (runtime.engineSnapshot !== null && !snapshotMatchesAppliedParams) ||
    (isLegacySchema && hardSphereEngineSnapshot !== null && legacyProjectedEngine === null) ||
    (hardSphereEngineSnapshot === null && hadLiveProjection);
  return {
    ...fallback,
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    visiblePanels: normalizePersistedVisiblePanels(layout.visiblePanels, fallback.visiblePanels),
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(layout.liveWorkspaceSplitRatio),
    params,
    appliedParams,
    runState: resetLiveProjection || !validateHardSphereSimulationParams(params).valid
      ? 'needs-reset'
      : runState,
    stats: resetLiveProjection
      ? createIdleStats()
      : legacyProjectedEngine?.getStats() ?? normalizePersistedSimulationStats(runtime.stats),
    chartData: resetLiveProjection
      ? createEmptyChartData()
      : legacyProjectedEngine?.getHistogramData(false) ?? normalizePersistedChartData(runtime.chartData),
    finalChartData: runtime.finalChartData === null ? null : normalizePersistedChartData(runtime.finalChartData),
    particles: resetLiveProjection
      ? []
      : legacyProjectedEngine?.particles.map((particle) => ({ ...particle })) ?? normalizePersistedParticles(runtime.particles),
    hardSphereEngineSnapshot: resetLiveProjection ? null : hardSphereEngineSnapshot,
    standardResultsLayout: normalizeStandardResultsLayout(
      results.standardResultsLayout ?? layout.standardResultsLayout,
    ),
  };
};
