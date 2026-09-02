import type { WorkbenchPanelKey } from './workbenchFileState.ts';

export const WORKBENCH_PANEL_KEYS = [
  'preview',
  'realtime',
  'results',
  'experimentPoints',
  'verification',
  'heatCapacityGuide',
  'heatCapacityRecords',
  'heatCapacityReview',
] as const satisfies readonly WorkbenchPanelKey[];

export const isWorkbenchPanelKey = (value: unknown): value is WorkbenchPanelKey => (
  WORKBENCH_PANEL_KEYS.includes(value as WorkbenchPanelKey)
);
