import type { PointsByRelation } from '../../domain/idealGas/idealGasExperiment.ts';
import { PhysicsEngine } from '../../domain/hardSphere/PhysicsEngine.ts';
import { validateHardSphereSimulationParams } from '../../domain/hardSphere/hardSphereSimulationValidation.ts';
import type {
  ChartData,
  IdealGasExperimentPoint,
  Particle,
  PressureMeasurementSummary,
  PressureWindowPoint,
  SimulationStats,
} from '../../shared/types.ts';
import {
  normalizeHardSphereEngineSnapshot,
  normalizeSimulationParamsSnapshot,
} from './workbenchHardSpherePersistence.ts';
import { isWorkbenchPanelKey } from './workbenchPanelRegistry.ts';
import { isPersistenceRecord } from './workbenchPersistenceValue.ts';
import {
  IDEAL_RESULT_MAX_HEIGHT_RATIO,
  IDEAL_RESULT_MIN_HEIGHT_RATIO,
} from './workbenchLayoutCompatibility.ts';
import {
  clampWorkbenchLiveSplitRatio,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchStandardResultsTab,
} from './workbenchFileState.ts';
import {
  createDefaultHeatCapacityPistonOscillationFile,
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS,
  WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
} from './workbenchPistonOscillationState.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';

const BASE_FILE_KEYS = [
  'id',
  'name',
  'kind',
  'visiblePanels',
  'params',
  'appliedParams',
  'runState',
  'stats',
  'chartData',
  'finalChartData',
  'liveWorkspaceSplitRatio',
  'createdAt',
  'updatedAt',
  'lastOpenedAt',
] as const;

const STANDARD_FILE_KEYS = [
  ...BASE_FILE_KEYS,
  'particles',
  'hardSphereEngineSnapshot',
  'standardResultsLayout',
] as const;

const IDEAL_FILE_KEYS = [
  ...BASE_FILE_KEYS,
  'relation',
  'activeParams',
  'pointsByRelation',
  'latestPressureSummary',
  'needsReset',
  'particles',
  'hardSphereEngineSnapshot',
  'verificationState',
  'historyUnlocked',
  'idealWindowLayout',
] as const;

const PISTON_OSCILLATION_FILE_KEYS = [
  ...BASE_FILE_KEYS,
  'pistonOscillationSchemaVersion',
  'previewCameraPreset',
  'pistonOscillationOperationVisualizationEnabled',
  'pistonOscillationLessonIntroAutoShown',
  'pistonOscillationDemoSession',
  'pistonOscillationGuideSession',
  'pistonOscillationFreeSession',
  'pistonOscillationMaterialsExpanded',
] as const;

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isNullableFiniteNumber = (value: unknown) => value === null || isFiniteNumber(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowedKeys: readonly string[]) => {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
};

const hasExactKeys = (value: Record<string, unknown>, expectedKeys: readonly string[]) => (
  Object.keys(value).length === expectedKeys.length &&
  expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
);

export const areCanonicalPersistenceValuesEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => areCanonicalPersistenceValuesEqual(item, right[index]));
  }
  if (!isPersistenceRecord(left) || !isPersistenceRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => (
      key === rightKeys[index] && areCanonicalPersistenceValuesEqual(left[key], right[key])
    ));
};

const isCanonicalSimulationParams = (value: unknown) => {
  const normalized = normalizeSimulationParamsSnapshot(value);
  return normalized !== null && areCanonicalPersistenceValuesEqual(value, normalized);
};

const isCanonicalRunnableSimulationParams = (value: unknown) => {
  const normalized = normalizeSimulationParamsSnapshot(value);
  return normalized !== null &&
    validateHardSphereSimulationParams(normalized).valid &&
    areCanonicalPersistenceValuesEqual(value, normalized);
};

const EMPTY_ENGINE_STATS: SimulationStats = {
  time: 0,
  temperature: 0,
  pressure: 0,
  meanSpeed: 0,
  rmsSpeed: 0,
  isEquilibrated: false,
  progress: 0,
  phase: 'idle',
};

const EMPTY_ENGINE_CHART_DATA: ChartData = {
  speed: [],
  energy: [],
  energyLog: [],
  tempHistory: [],
};

const isParticle = (value: unknown): value is Particle => (
  isPersistenceRecord(value) &&
  hasExactKeys(value, ['x', 'y', 'z', 'vx', 'vy', 'vz', 'speed', 'energy']) &&
  ['x', 'y', 'z', 'vx', 'vy', 'vz', 'speed', 'energy'].every((key) => isFiniteNumber(value[key]))
);

const isSimulationStats = (value: unknown): value is SimulationStats => (
  isPersistenceRecord(value) &&
  hasExactKeys(value, ['time', 'temperature', 'pressure', 'meanSpeed', 'rmsSpeed', 'isEquilibrated', 'progress', 'phase']) &&
  ['time', 'temperature', 'pressure', 'meanSpeed', 'rmsSpeed', 'progress'].every((key) => isFiniteNumber(value[key])) &&
  typeof value.isEquilibrated === 'boolean' &&
  (value.phase === 'idle' || value.phase === 'equilibrating' || value.phase === 'collecting' || value.phase === 'finished')
);

const isHistogramBin = (value: unknown) => (
  isPersistenceRecord(value) &&
  hasOnlyKeys(value, ['binStart', 'binEnd', 'count', 'probability', 'theoretical']) &&
  ['binStart', 'binEnd', 'count', 'probability'].every((key) => isFiniteNumber(value[key])) &&
  (value.theoretical === undefined || isFiniteNumber(value.theoretical))
);

const isChartData = (value: unknown): value is ChartData => (
  isPersistenceRecord(value) &&
  hasExactKeys(value, ['speed', 'energy', 'energyLog', 'tempHistory']) &&
  Array.isArray(value.speed) && value.speed.every(isHistogramBin) &&
  Array.isArray(value.energy) && value.energy.every(isHistogramBin) &&
  Array.isArray(value.energyLog) && value.energyLog.every((point) => (
    isPersistenceRecord(point) &&
    hasExactKeys(point, ['energy', 'logProb', 'theoreticalLog']) &&
    ['energy', 'logProb', 'theoreticalLog'].every((key) => isFiniteNumber(point[key]))
  )) &&
  Array.isArray(value.tempHistory) && value.tempHistory.every((point) => (
    isPersistenceRecord(point) &&
    hasOnlyKeys(point, ['time', 'temperature', 'targetTemperature', 'error', 'totalEnergy']) &&
    isFiniteNumber(point.time) &&
    isFiniteNumber(point.error) &&
    isFiniteNumber(point.totalEnergy) &&
    (point.temperature === undefined || isFiniteNumber(point.temperature)) &&
    (point.targetTemperature === undefined || isFiniteNumber(point.targetTemperature))
  ))
);

const isPressureWindowPoint = (value: unknown): value is PressureWindowPoint => (
  isPersistenceRecord(value) &&
  hasExactKeys(value, ['time', 'duration', 'measuredPressure', 'idealPressure', 'isCollectionWindow']) &&
  isFiniteNumber(value.time) &&
  isFiniteNumber(value.duration) &&
  isFiniteNumber(value.measuredPressure) &&
  isFiniteNumber(value.idealPressure) &&
  typeof value.isCollectionWindow === 'boolean'
);

const isPressureMeasurementSummary = (value: unknown): value is PressureMeasurementSummary => (
  isPersistenceRecord(value) &&
  hasExactKeys(value, [
    'latestPressure',
    'meanPressure',
    'meanIdealPressure',
    'meanTemperature',
    'relativeGap',
    'sampleCount',
    'history',
  ]) &&
  isFiniteNumber(value.latestPressure) &&
  isNullableFiniteNumber(value.meanPressure) &&
  isNullableFiniteNumber(value.meanIdealPressure) &&
  isNullableFiniteNumber(value.meanTemperature) &&
  isNullableFiniteNumber(value.relativeGap) &&
  Number.isInteger(value.sampleCount) && (value.sampleCount as number) >= 0 &&
  Array.isArray(value.history) && value.history.every(isPressureWindowPoint)
);

const isIdealGasPoint = (
  value: unknown,
  expectedRelation: keyof PointsByRelation,
): value is IdealGasExperimentPoint => (
  isPersistenceRecord(value) &&
  hasOnlyKeys(value, [
    'id',
    'relation',
    'targetTemperature',
    'meanTemperature',
    'meanPressure',
    'idealPressure',
    'relativeGap',
    'timestamp',
    'boxLength',
    'volume',
    'inverseVolume',
    'particleCount',
  ]) &&
  typeof value.id === 'string' && value.id.trim().length > 0 &&
  value.relation === expectedRelation &&
  ['targetTemperature', 'meanTemperature', 'meanPressure', 'idealPressure', 'relativeGap', 'timestamp']
    .every((key) => isFiniteNumber(value[key])) &&
  (value.boxLength === undefined || isNullableFiniteNumber(value.boxLength)) &&
  (value.volume === undefined || isNullableFiniteNumber(value.volume)) &&
  (value.inverseVolume === undefined || isNullableFiniteNumber(value.inverseVolume)) &&
  (value.particleCount === undefined || isNullableFiniteNumber(value.particleCount))
);

const isPointsByRelation = (value: unknown): value is PointsByRelation => (
  isPersistenceRecord(value) &&
  hasExactKeys(value, ['pt', 'pv', 'pn']) &&
  (['pt', 'pv', 'pn'] as const).every((relation) => (
    Array.isArray(value[relation]) && value[relation].every((point) => isIdealGasPoint(point, relation))
  ))
);

const isCanonicalEngineSnapshot = (value: unknown) => {
  if (value === null) return true;
  const normalized = normalizeHardSphereEngineSnapshot(value);
  return normalized !== null && areCanonicalPersistenceValuesEqual(value, normalized);
};

const isCanonicalEngineSnapshotProjection = (
  value: unknown,
  params: unknown,
  particles: unknown,
  stats: unknown,
  chartData: unknown,
  latestPressureSummary?: unknown,
) => {
  if (value === null) return Array.isArray(particles) && particles.length === 0 &&
    areCanonicalPersistenceValuesEqual(stats, EMPTY_ENGINE_STATS) &&
    areCanonicalPersistenceValuesEqual(chartData, EMPTY_ENGINE_CHART_DATA) &&
    (latestPressureSummary === undefined || latestPressureSummary === null);
  const normalized = normalizeHardSphereEngineSnapshot(value);
  if (
    normalized === null ||
    !areCanonicalPersistenceValuesEqual(value, normalized) ||
    !areCanonicalPersistenceValuesEqual(params, normalized.params) ||
    !areCanonicalPersistenceValuesEqual(particles, normalized.particles)
  ) return false;
  try {
    const engine = PhysicsEngine.fromSnapshot(normalized);
    return areCanonicalPersistenceValuesEqual(stats, engine.getStats()) &&
      areCanonicalPersistenceValuesEqual(chartData, engine.getHistogramData(false)) &&
      (
        latestPressureSummary === undefined ||
        areCanonicalPersistenceValuesEqual(
          latestPressureSummary,
          engine.getPressureMeasurementSummary(),
        )
      );
  } catch {
    return false;
  }
};

const isBaseFileState = (value: Record<string, unknown>) => (
  typeof value.id === 'string' && value.id.trim().length > 0 &&
  typeof value.name === 'string' && value.name.trim().length > 0 &&
  Array.isArray(value.visiblePanels) &&
  new Set(value.visiblePanels).size === value.visiblePanels.length &&
  value.visiblePanels.every(isWorkbenchPanelKey) &&
  isCanonicalSimulationParams(value.params) &&
  isCanonicalRunnableSimulationParams(value.appliedParams) &&
  (
    value.runState === 'idle' ||
    value.runState === 'running' ||
    value.runState === 'paused' ||
    value.runState === 'finished' ||
    value.runState === 'needs-reset'
  ) &&
  isSimulationStats(value.stats) &&
  isChartData(value.chartData) &&
  (value.finalChartData === null || isChartData(value.finalChartData)) &&
  isFiniteNumber(value.liveWorkspaceSplitRatio) &&
  clampWorkbenchLiveSplitRatio(value.liveWorkspaceSplitRatio) === value.liveWorkspaceSplitRatio &&
  isFiniteNumber(value.createdAt) &&
  isFiniteNumber(value.updatedAt) &&
  isFiniteNumber(value.lastOpenedAt)
);

const STANDARD_TABS = ['summary', 'dataTable', 'figures'] as const satisfies readonly WorkbenchStandardResultsTab[];
const IDEAL_TABS = ['experimentPoints', 'verification'] as const satisfies readonly WorkbenchIdealResultWindowKey[];

const isStandardLayout = (value: unknown) => (
  isPersistenceRecord(value) &&
  hasExactKeys(value, ['openTabs', 'activeTab', 'heightRatio']) &&
  Array.isArray(value.openTabs) && value.openTabs.length > 0 &&
  new Set(value.openTabs).size === value.openTabs.length &&
  value.openTabs.every((tab) => STANDARD_TABS.includes(tab as WorkbenchStandardResultsTab)) &&
  STANDARD_TABS.includes(value.activeTab as WorkbenchStandardResultsTab) &&
  value.openTabs.includes(value.activeTab) &&
  isFiniteNumber(value.heightRatio) &&
  value.heightRatio >= IDEAL_RESULT_MIN_HEIGHT_RATIO &&
  value.heightRatio <= IDEAL_RESULT_MAX_HEIGHT_RATIO
);

const isIdealLayout = (value: unknown) => (
  isPersistenceRecord(value) &&
  hasExactKeys(value, ['openTabs', 'activeIdealResultTab', 'heightRatio', 'hasCustomHeight']) &&
  Array.isArray(value.openTabs) && value.openTabs.length > 0 &&
  new Set(value.openTabs).size === value.openTabs.length &&
  value.openTabs.every((tab) => IDEAL_TABS.includes(tab as WorkbenchIdealResultWindowKey)) &&
  IDEAL_TABS.includes(value.activeIdealResultTab as WorkbenchIdealResultWindowKey) &&
  value.openTabs.includes(value.activeIdealResultTab) &&
  isFiniteNumber(value.heightRatio) &&
  value.heightRatio >= IDEAL_RESULT_MIN_HEIGHT_RATIO &&
  value.heightRatio <= IDEAL_RESULT_MAX_HEIGHT_RATIO &&
  typeof value.hasCustomHeight === 'boolean'
);

export const isCanonicalStandardOrIdealWorkspaceFile = (
  value: unknown,
): value is Extract<WorkbenchFileState, { kind: 'standard' | 'ideal' }> => {
  if (!isPersistenceRecord(value) || !isBaseFileState(value)) return false;
  if (value.kind === 'standard') {
    return hasExactKeys(value, STANDARD_FILE_KEYS) &&
      (isCanonicalRunnableSimulationParams(value.params) || value.runState === 'needs-reset') &&
      Array.isArray(value.particles) && value.particles.every(isParticle) &&
      isCanonicalEngineSnapshot(value.hardSphereEngineSnapshot) &&
      isCanonicalEngineSnapshotProjection(
        value.hardSphereEngineSnapshot,
        value.appliedParams,
        value.particles,
        value.stats,
        value.chartData,
      ) &&
      isStandardLayout(value.standardResultsLayout);
  }
  if (value.kind === 'ideal') {
    return hasExactKeys(value, IDEAL_FILE_KEYS) &&
      (value.relation === 'pt' || value.relation === 'pv' || value.relation === 'pn') &&
      isCanonicalRunnableSimulationParams(value.activeParams) &&
      areCanonicalPersistenceValuesEqual(value.activeParams, value.appliedParams) &&
      isPointsByRelation(value.pointsByRelation) &&
      (value.latestPressureSummary === null || isPressureMeasurementSummary(value.latestPressureSummary)) &&
      typeof value.needsReset === 'boolean' &&
      (isCanonicalRunnableSimulationParams(value.params) || value.needsReset) &&
      Array.isArray(value.particles) && value.particles.every(isParticle) &&
      isCanonicalEngineSnapshot(value.hardSphereEngineSnapshot) &&
      isCanonicalEngineSnapshotProjection(
        value.hardSphereEngineSnapshot,
        value.activeParams,
        value.particles,
        value.stats,
        value.chartData,
        value.latestPressureSummary,
      ) &&
      (
        value.verificationState === 'not-started' ||
        value.verificationState === 'collecting' ||
        value.verificationState === 'verified' ||
        value.verificationState === 'failed'
      ) &&
      typeof value.historyUnlocked === 'boolean' &&
      isIdealLayout(value.idealWindowLayout);
  }
  return false;
};

export const isCanonicalPistonOscillationWorkspaceFile = (
  value: unknown,
): value is Extract<WorkbenchFileState, { kind: 'heatCapacityPistonOscillation' }> => {
  if (
    !isPersistenceRecord(value) ||
    !isBaseFileState(value) ||
    value.kind !== 'heatCapacityPistonOscillation' ||
    !hasExactKeys(value, PISTON_OSCILLATION_FILE_KEYS) ||
    value.pistonOscillationSchemaVersion !== WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION ||
    !WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS.includes(
      value.previewCameraPreset as Extract<
        WorkbenchFileState,
        { kind: 'heatCapacityPistonOscillation' }
      >['previewCameraPreset'],
    ) || typeof value.pistonOscillationOperationVisualizationEnabled !== 'boolean'
    || typeof value.pistonOscillationLessonIntroAutoShown !== 'boolean'
    || typeof value.pistonOscillationMaterialsExpanded !== 'boolean'
  ) return false;
  const fallback = createDefaultHeatCapacityPistonOscillationFile(1);
  return value.runState === 'idle' &&
    areCanonicalPersistenceValuesEqual(value.visiblePanels, ['preview', 'realtime']) &&
    areCanonicalPersistenceValuesEqual(value.params, fallback.params) &&
    areCanonicalPersistenceValuesEqual(value.appliedParams, fallback.appliedParams) &&
    areCanonicalPersistenceValuesEqual(value.stats, fallback.stats) &&
    areCanonicalPersistenceValuesEqual(value.chartData, fallback.chartData) &&
    value.finalChartData === null &&
    isPersistenceRecord(value.pistonOscillationDemoSession) &&
    value.pistonOscillationDemoSession.schemaVersion ===
      fallback.pistonOscillationDemoSession.schemaVersion &&
    isPersistenceRecord(value.pistonOscillationGuideSession) &&
    value.pistonOscillationGuideSession.schemaVersion ===
      fallback.pistonOscillationGuideSession.schemaVersion &&
    isPersistenceRecord(value.pistonOscillationFreeSession) &&
    value.pistonOscillationFreeSession.schemaVersion ===
      fallback.pistonOscillationFreeSession.schemaVersion;
};
