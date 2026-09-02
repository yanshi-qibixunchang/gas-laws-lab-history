import {
  getHeatCapacityMaterialsTabOrder,
  heatCapacityTabIdToPanelKey,
  isHeatCapacityPanelKey,
} from './workbenchHeatCapacityTabRegistry.ts';
import type {
  WorkbenchFileState,
  WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import type {
  WorkbenchHeatCapacityPanelKey,
  WorkbenchHeatCapacityTabId,
} from './workbenchFileState.ts';

export type WorkbenchHeatCapacityMaterialsTabState = 'off' | 'open' | 'active';

export interface WorkbenchHeatCapacityMaterialsWindowState {
  openTabs: WorkbenchHeatCapacityTabId[];
  activeTabId: WorkbenchHeatCapacityTabId;
}

export type WorkbenchHeatCapacityMaterialsTabMutationPlan =
  | { kind: 'ignored' }
  | {
      kind: 'ready';
      nextFile: WorkbenchHeatCapacityState;
      selectedPanel: WorkbenchHeatCapacityPanelKey | 'preview';
    };

export type WorkbenchHeatCapacityMaterialsTabOpenPlan =
  | { kind: 'ignored' }
  | {
      kind: 'ready';
      nextFile: WorkbenchHeatCapacityState;
      selectedPanel: WorkbenchHeatCapacityPanelKey;
      wasOpen: boolean;
    };

export const getHeatCapacityMaterialsTabState = (
  file: WorkbenchFileState,
  tabId: WorkbenchHeatCapacityTabId,
): WorkbenchHeatCapacityMaterialsTabState => {
  if (file.kind !== 'heatCapacity') return 'off';
  if (file.activeHeatCapacityTabId === tabId && file.openHeatCapacityTabs.includes(tabId)) return 'active';
  return file.openHeatCapacityTabs.includes(tabId) ? 'open' : 'off';
};

export const getHeatCapacityMaterialsWindowState = (
  file: WorkbenchFileState,
): WorkbenchHeatCapacityMaterialsWindowState | null => {
  if (file.kind !== 'heatCapacity') return null;

  const allowedTabs = getHeatCapacityMaterialsTabOrder(file);
  const openTabs = file.openHeatCapacityTabs.filter((tabId) => allowedTabs.includes(tabId));
  if (openTabs.length === 0) return null;

  const activeTabId = file.activeHeatCapacityTabId !== null
    && openTabs.includes(file.activeHeatCapacityTabId)
      ? file.activeHeatCapacityTabId
      : openTabs[0]!;

  return { openTabs, activeTabId };
};

export const createHeatCapacityMaterialsTabActivationPlan = (
  file: WorkbenchFileState,
  tabId: WorkbenchHeatCapacityTabId,
  updatedAt: number = Date.now(),
): WorkbenchHeatCapacityMaterialsTabMutationPlan => {
  if (file.kind !== 'heatCapacity' || !file.openHeatCapacityTabs.includes(tabId)) {
    return { kind: 'ignored' };
  }

  return {
    kind: 'ready',
    selectedPanel: heatCapacityTabIdToPanelKey(tabId),
    nextFile: {
      ...file,
      activeHeatCapacityTabId: tabId,
      updatedAt,
    },
  };
};

export const createHeatCapacityMaterialsTabOpenPlan = (
  file: WorkbenchFileState,
  tabId: WorkbenchHeatCapacityTabId,
  updatedAt: number = Date.now(),
): WorkbenchHeatCapacityMaterialsTabOpenPlan => {
  if (file.kind !== 'heatCapacity') return { kind: 'ignored' };
  if (!getHeatCapacityMaterialsTabOrder(file).includes(tabId)) return { kind: 'ignored' };

  const selectedPanel = heatCapacityTabIdToPanelKey(tabId);
  const wasOpen = file.openHeatCapacityTabs.includes(tabId);
  const openHeatCapacityTabs = wasOpen
    ? file.openHeatCapacityTabs
    : [...file.openHeatCapacityTabs, tabId];
  const visiblePanels = file.visiblePanels.includes(selectedPanel)
    ? file.visiblePanels
    : [...file.visiblePanels, selectedPanel];

  return {
    kind: 'ready',
    selectedPanel,
    wasOpen,
    nextFile: {
      ...file,
      visiblePanels,
      openHeatCapacityTabs,
      activeHeatCapacityTabId: tabId,
      heatCapacityMaterialsExpanded: true,
      updatedAt,
    },
  };
};

export const createHeatCapacityMaterialsOpenAllPlan = (
  file: WorkbenchFileState,
  updatedAt: number = Date.now(),
): WorkbenchHeatCapacityMaterialsTabMutationPlan => {
  if (file.kind !== 'heatCapacity') return { kind: 'ignored' };

  const openHeatCapacityTabs = getHeatCapacityMaterialsTabOrder(file);
  const activeHeatCapacityTabId = openHeatCapacityTabs[0];
  if (!activeHeatCapacityTabId) return { kind: 'ignored' };

  const panelKeys = openHeatCapacityTabs.map(heatCapacityTabIdToPanelKey);
  return {
    kind: 'ready',
    selectedPanel: heatCapacityTabIdToPanelKey(activeHeatCapacityTabId),
    nextFile: {
      ...file,
      visiblePanels: Array.from(new Set([...file.visiblePanels, ...panelKeys])),
      openHeatCapacityTabs: [...openHeatCapacityTabs],
      activeHeatCapacityTabId,
      heatCapacityMaterialsExpanded: true,
      updatedAt,
    },
  };
};

export const createHeatCapacityMaterialsTabClosePlan = (
  file: WorkbenchFileState,
  tabId: WorkbenchHeatCapacityTabId,
  updatedAt: number = Date.now(),
): WorkbenchHeatCapacityMaterialsTabMutationPlan => {
  if (file.kind !== 'heatCapacity' || !file.openHeatCapacityTabs.includes(tabId)) {
    return { kind: 'ignored' };
  }

  const tabIndex = file.openHeatCapacityTabs.indexOf(tabId);
  const openHeatCapacityTabs = file.openHeatCapacityTabs.filter((openTabId) => openTabId !== tabId);
  const activeHeatCapacityTabId = file.activeHeatCapacityTabId === tabId
    ? openHeatCapacityTabs[tabIndex] ?? openHeatCapacityTabs[tabIndex - 1] ?? null
    : file.activeHeatCapacityTabId;
  const selectedPanel = activeHeatCapacityTabId
    ? heatCapacityTabIdToPanelKey(activeHeatCapacityTabId)
    : 'preview';
  const panelKey = heatCapacityTabIdToPanelKey(tabId);

  return {
    kind: 'ready',
    selectedPanel,
    nextFile: {
      ...file,
      visiblePanels: file.visiblePanels.filter((panel) => panel !== panelKey),
      openHeatCapacityTabs,
      activeHeatCapacityTabId,
      updatedAt,
    },
  };
};

export const closeHeatCapacityMaterialsWindow = (
  file: WorkbenchHeatCapacityState,
  updatedAt: number = Date.now(),
): WorkbenchHeatCapacityState => ({
  ...file,
  visiblePanels: file.visiblePanels.filter((panel) => !isHeatCapacityPanelKey(panel)),
  openHeatCapacityTabs: [],
  activeHeatCapacityTabId: null,
  updatedAt,
});
