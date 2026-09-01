import {
  isWorkbenchPanelKey,
} from './workbenchPanelRegistry.ts';
import type { WorkbenchPanelKey } from './workbenchState.ts';

export type RestorableWorkbenchPanelKey = WorkbenchPanelKey | 'history';

export const isRestorableWorkbenchPanelKey = (
  value: unknown,
): value is RestorableWorkbenchPanelKey => (
  value === 'history' || isWorkbenchPanelKey(value)
);

export const normalizeWorkbenchPanelKey = (
  value: unknown,
  fallback: WorkbenchPanelKey,
): WorkbenchPanelKey => (
  value === 'history'
    ? 'verification'
    : isWorkbenchPanelKey(value)
      ? value
      : fallback
);

export const normalizeWorkbenchPanelKeys = (
  value: unknown,
  fallback: WorkbenchPanelKey[],
): WorkbenchPanelKey[] => {
  if (!Array.isArray(value)) return [...fallback];
  const normalized = value.flatMap<WorkbenchPanelKey>((panel) => {
    if (!isRestorableWorkbenchPanelKey(panel)) return [];
    return [normalizeWorkbenchPanelKey(panel, 'preview')];
  });
  return [...new Set(normalized)];
};
