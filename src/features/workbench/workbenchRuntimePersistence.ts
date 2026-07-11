import type {
  ChartData,
  Particle,
  SimulationStats,
} from '../../shared/types.ts';
import {
  clonePersistenceValue,
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
