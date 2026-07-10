import type {
  WorkbenchFileState,
  WorkbenchHeatCapacityPanelKey,
  WorkbenchHeatCapacityTabId,
  WorkbenchPanelKey,
} from './workbenchState.ts';

export const HEAT_CAPACITY_TAB_IDS = [
  'guide',
  'records',
  'review',
] as const satisfies readonly WorkbenchHeatCapacityTabId[];

export const isWorkbenchHeatCapacityTabId = (
  value: unknown,
): value is WorkbenchHeatCapacityTabId => (
  HEAT_CAPACITY_TAB_IDS.includes(value as WorkbenchHeatCapacityTabId)
);

export const normalizeWorkbenchHeatCapacityTabIds = (
  value: unknown,
  fallback: WorkbenchHeatCapacityTabId[],
): WorkbenchHeatCapacityTabId[] => (
  Array.isArray(value) ? value.filter(isWorkbenchHeatCapacityTabId) : fallback
);

export const getHeatCapacityMaterialsTabOrder = (
  _file: WorkbenchFileState,
): WorkbenchHeatCapacityTabId[] => [...HEAT_CAPACITY_TAB_IDS];

export const isHeatCapacityPanelKey = (
  key: unknown,
): key is WorkbenchHeatCapacityPanelKey => (
  key === 'heatCapacityGuide' ||
  key === 'heatCapacityRecords' ||
  key === 'heatCapacityReview'
);

export const heatCapacityTabIdToPanelKey = (
  tabId: WorkbenchHeatCapacityTabId,
): WorkbenchHeatCapacityPanelKey => (
  tabId === 'guide'
    ? 'heatCapacityGuide'
    : tabId === 'records'
      ? 'heatCapacityRecords'
      : 'heatCapacityReview'
);

export const heatCapacityPanelKeyToTabId = (
  panelKey: WorkbenchPanelKey,
): WorkbenchHeatCapacityTabId | null => (
  panelKey === 'heatCapacityGuide'
    ? 'guide'
    : panelKey === 'heatCapacityRecords'
      ? 'records'
      : panelKey === 'heatCapacityReview'
        ? 'review'
        : null
);
