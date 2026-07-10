import type { WorkbenchPanelKey } from './workbenchState.ts';

export const WORKBENCH_PANEL_KEYS = [
  'preview',
  'realtime',
  'results',
  'experimentPoints',
  'verification',
  'heatCapacityGuide',
  'heatCapacityRecords',
  'heatCapacityReview',
  'history',
] as const satisfies readonly WorkbenchPanelKey[];

export const isWorkbenchPanelKey = (value: unknown): value is WorkbenchPanelKey => (
  WORKBENCH_PANEL_KEYS.includes(value as WorkbenchPanelKey)
);

export const normalizeWorkbenchPanelKeys = (
  value: unknown,
  fallback: WorkbenchPanelKey[],
): WorkbenchPanelKey[] => (
  Array.isArray(value) ? value.filter(isWorkbenchPanelKey) : fallback
);
