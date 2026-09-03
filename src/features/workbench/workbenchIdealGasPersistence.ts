import {
  PhysicsEngine,
  type PhysicsEngineSnapshotV2,
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
  isLegacyHardSphereEngineSnapshotV1,
  normalizeHardSphereEngineSnapshot,
  upgradeLegacyHardSphereEngineSnapshotV1,
} from './workbenchHardSpherePersistence.ts';
import {
  HARD_SPHERE_MAX_PRESSURE_HISTORY,
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
  createDefaultIdealFile,
  createIdleStats,
  type WorkbenchIdealState,
  type WorkbenchIdealWindowLayout,
  type WorkbenchRunState,
} from './workbenchFileState.ts';
import { areWorkbenchParamsEqual } from './workbenchParameterState.ts';
import { normalizeIdealWindowLayoutState } from './workbenchLayoutCompatibility.ts';
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

export const LEGACY_IDEAL_GAS_SCHEMA_VERSION = 1 as const;
export const IDEAL_GAS_SCHEMA_VERSION = 2 as const;

export interface IdealGasPersistencePayloadV2 {
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
    engineSnapshot: PhysicsEngineSnapshotV2 | null;
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

const idealRelations = ['pt', 'pv', 'pn'] as const satisfies readonly ExperimentRelation[];
const verificationStates = ['not-started', 'collecting', 'verified', 'failed'] as const satisfies readonly WorkbenchIdealState['verificationState'][];
const MAX_IDEAL_POINTS_PER_RELATION = 1000;
const MAX_IDEAL_POINT_STRING_LENGTH = 256;

const isIdealPointResourceSafe = (value: unknown) => (
  isRecord(value) &&
  Object.keys(value).length <= 12 &&
  Object.values(value).every((field) => (
    field === null ||
    typeof field === 'boolean' ||
    isFiniteNumber(field) ||
    (typeof field === 'string' && field.length <= MAX_IDEAL_POINT_STRING_LENGTH)
  ))
);

const isPointsByRelationResourceSafe = (value: unknown) => (
  isRecord(value) &&
  (['pt', 'pv', 'pn'] as const).every((relation) => (
    Array.isArray(value[relation]) &&
    value[relation].length <= MAX_IDEAL_POINTS_PER_RELATION &&
    value[relation].every(isIdealPointResourceSafe)
  ))
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

const normalizePressureWindowPoint = (value: unknown): PressureMeasurementSummary['history'][number] | null => {
  if (!isRecord(value) || !isFiniteNumber(value.time) || !isFiniteNumber(value.idealPressure)) return null;
  const measuredPressure = isFiniteNumber(value.measuredPressure)
    ? value.measuredPressure
    : isFiniteNumber(value.pressure)
      ? value.pressure
      : null;
  if (measuredPressure === null) return null;
  return {
    time: value.time,
    duration: isFiniteNumber(value.duration) ? Math.max(0, value.duration) : 0,
    measuredPressure,
    idealPressure: value.idealPressure,
    isCollectionWindow: typeof value.isCollectionWindow === 'boolean'
      ? value.isCollectionWindow
      : true,
  };
};

export const normalizePersistedPressureSummary = (
  value: unknown,
): PressureMeasurementSummary | null => {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.latestPressure) ||
    (value.meanPressure !== null && !isFiniteNumber(value.meanPressure)) ||
    (value.meanIdealPressure !== null && !isFiniteNumber(value.meanIdealPressure)) ||
    (value.meanTemperature !== null && !isFiniteNumber(value.meanTemperature)) ||
    (value.relativeGap !== null && !isFiniteNumber(value.relativeGap)) ||
    !Number.isInteger(value.sampleCount) ||
    (value.sampleCount as number) < 0 ||
    !Array.isArray(value.history)
  ) return null;
  const history = value.history.map(normalizePressureWindowPoint);
  if (history.some((point) => point === null)) return null;
  return {
    latestPressure: value.latestPressure,
    meanPressure: value.meanPressure as number | null,
    meanIdealPressure: value.meanIdealPressure as number | null,
    meanTemperature: value.meanTemperature as number | null,
    relativeGap: value.relativeGap as number | null,
    sampleCount: value.sampleCount as number,
    history: history as PressureMeasurementSummary['history'],
  };
};

export const createIdealGasPersistencePayload = (
  file: WorkbenchIdealState,
  savedAt: number,
): IdealGasPersistencePayloadV2 => {
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
      latestPressureSummary: normalizePersistedPressureSummary(file.latestPressureSummary),
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
  const isLegacySchema = payload.idealGasSchemaVersion === LEGACY_IDEAL_GAS_SCHEMA_VERSION;
  if (!isLegacySchema && payload.idealGasSchemaVersion !== IDEAL_GAS_SCHEMA_VERSION) {
    errors.push('idealGasSchemaVersion is unsupported');
  }
  if (!idealRelations.includes(payload.relation as ExperimentRelation)) {
    errors.push('relation is invalid');
  }
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
    if (
      runtime.latestPressureSummary !== null &&
      (
        !isRecord(runtime.latestPressureSummary) ||
        !Array.isArray(runtime.latestPressureSummary.history) ||
        runtime.latestPressureSummary.history.length > HARD_SPHERE_MAX_PRESSURE_HISTORY
      )
    ) errors.push('runtime.latestPressureSummary exceeds resource bounds');
  }
  const experiment = isRecord(payload.experiment) ? payload.experiment : null;
  if (!experiment || !isPointsByRelationResourceSafe(experiment.pointsByRelation)) {
    errors.push('experiment.pointsByRelation exceeds resource bounds');
  }
  return { valid: errors.length === 0, errors };
};

export const restoreIdealGasFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchIdealState => {
  const layout = fileEnvelope.layout;
  const idealGasSchemaVersion = isRecord(payload) ? payload.idealGasSchemaVersion : undefined;
  const idealPayload = isRecord(payload) ? payload as Partial<IdealGasPersistencePayloadV2> : {};
  const runtime = isRecord(idealPayload.runtime) ? idealPayload.runtime as Partial<IdealGasPersistencePayloadV2['runtime']> : {};
  const experiment = isRecord(idealPayload.experiment) ? idealPayload.experiment as Partial<IdealGasPersistencePayloadV2['experiment']> : {};
  const results = isRecord(idealPayload.results) ? idealPayload.results as Partial<IdealGasPersistencePayloadV2['results']> : {};
  const idealWindowLayout = normalizeIdealWindowLayoutState(
    (results.idealWindowLayout ?? layout.idealWindowLayout) as Parameters<typeof normalizeIdealWindowLayoutState>[0],
  );
  const fallback = createDefaultIdealFile(index, {
    resultsHeightRatio: idealWindowLayout.heightRatio,
    liveWorkspaceSplitRatio: isFiniteNumber(layout.liveWorkspaceSplitRatio)
      ? layout.liveWorkspaceSplitRatio
      : WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  });
  const runState = isPersistedWorkbenchRunState(runtime.runState)
    ? runtime.runState === 'running' ? 'paused' : runtime.runState
    : fallback.runState;
  const params = isRecord(idealPayload.params)
    ? clonePersistenceValue(idealPayload.params) as WorkbenchIdealState['params']
    : fallback.params;
  const persistedActiveParams = isRecord(idealPayload.activeParams)
    ? clonePersistenceValue(idealPayload.activeParams) as WorkbenchIdealState['activeParams']
    : fallback.activeParams;
  const activeParamsValid = validateHardSphereSimulationParams(persistedActiveParams).valid;
  const activeParams = activeParamsValid
    ? persistedActiveParams
    : sanitizeHardSphereSimulationParams(persistedActiveParams);
  const persistedAppliedParams = isRecord(idealPayload.appliedParams)
    ? clonePersistenceValue(idealPayload.appliedParams) as WorkbenchIdealState['appliedParams']
    : fallback.appliedParams;
  const appliedParamsValid = validateHardSphereSimulationParams(persistedAppliedParams).valid &&
    areWorkbenchParamsEqual(persistedAppliedParams, activeParams);
  const appliedParams = appliedParamsValid ? persistedAppliedParams : { ...activeParams };
  const isLegacySchema = idealGasSchemaVersion === LEGACY_IDEAL_GAS_SCHEMA_VERSION;
  const hardSphereEngineSnapshot = isLegacySchema
    ? upgradeLegacyHardSphereEngineSnapshotV1(runtime.engineSnapshot)
    : normalizeHardSphereEngineSnapshot(runtime.engineSnapshot);
  const snapshotMatchesActiveParams = hardSphereEngineSnapshot !== null &&
    areWorkbenchParamsEqual(hardSphereEngineSnapshot.params, activeParams);
  let legacyProjectedEngine: PhysicsEngine | null = null;
  if (isLegacySchema && hardSphereEngineSnapshot !== null && snapshotMatchesActiveParams) {
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
  const resetLiveProjection = !activeParamsValid || !appliedParamsValid ||
    (runtime.engineSnapshot !== null && !snapshotMatchesActiveParams) ||
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
    relation: normalizeRelation(idealPayload.relation, fallback.relation),
    params,
    appliedParams,
    activeParams,
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
    latestPressureSummary: resetLiveProjection
      ? null
      : legacyProjectedEngine?.getPressureMeasurementSummary() ?? normalizePersistedPressureSummary(runtime.latestPressureSummary),
    needsReset: resetLiveProjection || !validateHardSphereSimulationParams(params).valid || experiment.needsReset === true,
    particles: resetLiveProjection
      ? []
      : legacyProjectedEngine?.particles.map((particle) => ({ ...particle })) ?? normalizePersistedParticles(runtime.particles),
    hardSphereEngineSnapshot: resetLiveProjection ? null : hardSphereEngineSnapshot,
    pointsByRelation: normalizePointsByRelation(experiment.pointsByRelation),
    verificationState: verificationStates.includes(experiment.verificationState as WorkbenchIdealState['verificationState'])
      ? experiment.verificationState as WorkbenchIdealState['verificationState']
      : fallback.verificationState,
    historyUnlocked: experiment.historyUnlocked === true,
    idealWindowLayout,
  };
};
