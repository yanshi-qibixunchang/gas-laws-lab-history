import type {
  ChartData,
  Particle,
  SimulationStats,
} from '../../shared/types.ts';
import {
  HARD_SPHERE_MAX_PARTICLE_COUNT,
  HARD_SPHERE_MAX_TEMPERATURE_HISTORY,
} from '../../domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  clonePersistenceValue,
  isPersistenceFiniteNumber,
  isPersistenceRecord,
} from './workbenchPersistenceValue.ts';
import { normalizeWorkbenchPanelKeys } from './workbenchPanelRegistry.ts';
import {
  createEmptyChartData,
  createIdleStats,
  type WorkbenchPanelKey,
  type WorkbenchRunState,
} from './workbenchState.ts';

const workbenchRunStates = ['idle', 'running', 'paused', 'finished', 'needs-reset'] as const satisfies readonly WorkbenchRunState[];
const HARD_SPHERE_HISTOGRAM_BIN_COUNT = 30;
export const LEGACY_HARD_SPHERE_MAX_INGESTED_PARTICLES = 10_000;

const hasAtMostPrimitiveFields = (value: unknown, maximumFieldCount: number) => (
  isPersistenceRecord(value) &&
  Object.keys(value).length <= maximumFieldCount &&
  Object.values(value).every((field) => (
    field === undefined ||
    field === null ||
    typeof field === 'string' ||
    typeof field === 'boolean' ||
    isPersistenceFiniteNumber(field)
  ))
);

export const isPersistedSimulationStatsResourceSafe = (value: unknown) => (
  hasAtMostPrimitiveFields(value, 8)
);

export const isPersistedParticlesResourceSafe = (
  value: unknown,
  maximumParticleCount = HARD_SPHERE_MAX_PARTICLE_COUNT,
) => (
  Array.isArray(value) &&
  value.length <= maximumParticleCount &&
  value.every((particle) => hasAtMostPrimitiveFields(particle, 8))
);

export const isPersistedChartDataResourceSafe = (value: unknown) => {
  if (!isPersistenceRecord(value) || Object.keys(value).length > 4) return false;
  const speed = value.speed;
  const energy = value.energy;
  const energyLog = value.energyLog;
  const tempHistory = value.tempHistory;
  return Array.isArray(speed) && speed.length <= HARD_SPHERE_HISTOGRAM_BIN_COUNT &&
    speed.every((point) => hasAtMostPrimitiveFields(point, 5)) &&
    Array.isArray(energy) && energy.length <= HARD_SPHERE_HISTOGRAM_BIN_COUNT &&
    energy.every((point) => hasAtMostPrimitiveFields(point, 5)) &&
    Array.isArray(energyLog) && energyLog.length <= HARD_SPHERE_HISTOGRAM_BIN_COUNT &&
    energyLog.every((point) => hasAtMostPrimitiveFields(point, 3)) &&
    Array.isArray(tempHistory) && tempHistory.length <= HARD_SPHERE_MAX_TEMPERATURE_HISTORY &&
    tempHistory.every((point) => hasAtMostPrimitiveFields(point, 5));
};

export const isPersistedWorkbenchRunState = (value: unknown): value is WorkbenchRunState => (
  workbenchRunStates.includes(value as WorkbenchRunState)
);

export const normalizePersistedVisiblePanels = (
  value: unknown,
  fallback: WorkbenchPanelKey[],
): WorkbenchPanelKey[] => normalizeWorkbenchPanelKeys(value, fallback);

export const normalizePersistedSimulationStats = (value: unknown): SimulationStats => (
  isPersistenceRecord(value) ? { ...createIdleStats(), ...value } as SimulationStats : createIdleStats()
);

export const normalizePersistedChartData = (value: unknown): ChartData => (
  isPersistenceRecord(value) ? clonePersistenceValue(value) as unknown as ChartData : createEmptyChartData()
);

export const normalizePersistedParticles = (value: unknown): Particle[] => (
  Array.isArray(value) ? clonePersistenceValue(value) as Particle[] : []
);
