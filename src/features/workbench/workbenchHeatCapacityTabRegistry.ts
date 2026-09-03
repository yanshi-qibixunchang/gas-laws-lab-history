import type {
  WorkbenchHeatCapacityPanelKey,
  WorkbenchHeatCapacityTabId,
  WorkbenchPanelKey,
} from './workbenchFileState.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';

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
  file: WorkbenchFileState,
): WorkbenchHeatCapacityTabId[] => {
  if (file.kind !== 'heatCapacity') return [];
  if (file.heatCapacityMode === 'guide') return ['guide', 'records'];
  if (file.heatCapacityMode === 'free') return [...HEAT_CAPACITY_TAB_IDS];
  return [];
};

export const getPistonOscillationMaterialsPanelOrder = (
  file: WorkbenchFileState,
): WorkbenchHeatCapacityPanelKey[] => {
  if (file.kind !== 'heatCapacityPistonOscillation') return [];
  const guideSelected = file.pistonOscillationGuideSession.status === 'active'
    || (
      file.pistonOscillationGuideSession.status === 'completed'
      && !file.pistonOscillationGuideSession.completionExited
    );
  const activeDataProcessing = file.pistonOscillationFreeSession.status === 'active'
    ? file.pistonOscillationFreeSession.dataProcessing
    : guideSelected
      ? file.pistonOscillationGuideSession.dataProcessing
      : null;
  if (activeDataProcessing === null) return [];
  return file.pistonOscillationFreeSession.status === 'active'
    && activeDataProcessing.status === 'completed'
      ? ['heatCapacityGuide', 'heatCapacityReview']
      : ['heatCapacityGuide'];
};

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
