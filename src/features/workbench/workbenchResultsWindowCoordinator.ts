import type {
  WorkbenchIdealResultWindowKey,
  WorkbenchIdealState,
  WorkbenchStandardResultsTab,
  WorkbenchStandardState,
} from './workbenchState.ts';
import {
  clampIdealResultHeightRatio,
  idealResultWindowKeys,
  isIdealResultWindowKey,
  normalizeIdealWindowLayoutState,
  normalizeStandardResultsLayout,
  standardResultsTabKeys,
  type WorkbenchLayoutDefaultState,
} from './workbenchLayoutCompatibility.ts';

export type WorkbenchResultsTabState = 'off' | 'open' | 'active';

export interface WorkbenchResultsTabOpenOptions {
  openAllTabs?: boolean;
  replaceOpenTabs?: boolean;
}

export interface WorkbenchResultsTabOpenPlan<TFile, TTab extends string> {
  layoutChanged: boolean;
  activeTab: TTab;
  nextFile: TFile;
}

export type WorkbenchResultsTabClosePlan<TFile, TTab extends string> =
  | { kind: 'ignored' }
  | { kind: 'close-window' }
  | {
      kind: 'close-tab';
      activeTab: TTab;
      nextFile: TFile;
    };

const resolveOpenTabs = <TTab extends string>(
  currentTabs: TTab[],
  allTabs: readonly TTab[],
  requestedTab: TTab,
  options: WorkbenchResultsTabOpenOptions,
) => (
  options.openAllTabs
    ? [...allTabs]
    : options.replaceOpenTabs
      ? [requestedTab]
      : currentTabs.includes(requestedTab)
        ? currentTabs
        : [...currentTabs, requestedTab]
);

const hasResultsLayoutChange = <TTab extends string>(
  resultsVisible: boolean,
  currentTabs: TTab[],
  nextTabs: TTab[],
) => (
  !resultsVisible
  || nextTabs.length !== currentTabs.length
  || nextTabs.some((tab) => !currentTabs.includes(tab))
);

const pickNextOpenTab = <TTab extends string>(tabs: TTab[], closingTab: TTab) => {
  const closingIndex = tabs.indexOf(closingTab);
  if (closingIndex < 0) return tabs[0] ?? null;
  return tabs[closingIndex + 1] ?? tabs[closingIndex - 1] ?? null;
};

export const activateIdealResultsTab = (
  file: WorkbenchIdealState,
  tab: WorkbenchIdealResultWindowKey,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
  now = Date.now(),
): WorkbenchIdealState => ({
  ...file,
  idealWindowLayout: {
    ...normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults),
    activeIdealResultTab: tab,
  },
  updatedAt: now,
});

export const createIdealResultsTabOpenPlan = (
  file: WorkbenchIdealState,
  tab: WorkbenchIdealResultWindowKey,
  options: WorkbenchResultsTabOpenOptions = {},
  defaults?: Partial<WorkbenchLayoutDefaultState>,
  now = Date.now(),
): WorkbenchResultsTabOpenPlan<WorkbenchIdealState, WorkbenchIdealResultWindowKey> => {
  const currentLayout = normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults);
  const nextOpenTabs = resolveOpenTabs(
    currentLayout.openTabs,
    idealResultWindowKeys,
    tab,
    options,
  );
  const layoutChanged = hasResultsLayoutChange(
    file.visiblePanels.includes('results'),
    currentLayout.openTabs,
    nextOpenTabs,
  );

  if (!layoutChanged) {
    return {
      layoutChanged,
      activeTab: tab,
      nextFile: activateIdealResultsTab(file, tab, defaults, now),
    };
  }

  return {
    layoutChanged,
    activeTab: tab,
    nextFile: {
      ...file,
      visiblePanels: [
        ...file.visiblePanels.filter((panel) => !isIdealResultWindowKey(panel) && panel !== 'results'),
        'results',
      ],
      idealWindowLayout: {
        ...currentLayout,
        openTabs: nextOpenTabs,
        activeIdealResultTab: tab,
        heightRatio: clampIdealResultHeightRatio(currentLayout.heightRatio),
      },
      updatedAt: now,
    },
  };
};

export const closeIdealResultsWindowLayout = (
  file: WorkbenchIdealState,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
  now = Date.now(),
): WorkbenchIdealState => {
  const currentLayout = normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults);
  return {
    ...file,
    visiblePanels: file.visiblePanels.filter((panel) => !isIdealResultWindowKey(panel) && panel !== 'results'),
    idealWindowLayout: {
      ...currentLayout,
      heightRatio: clampIdealResultHeightRatio(currentLayout.heightRatio),
    },
    updatedAt: now,
  };
};

export const createIdealResultsTabClosePlan = (
  file: WorkbenchIdealState,
  tab: WorkbenchIdealResultWindowKey,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
  now = Date.now(),
): WorkbenchResultsTabClosePlan<WorkbenchIdealState, WorkbenchIdealResultWindowKey> => {
  const layout = normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults);
  if (!layout.openTabs.includes(tab)) return { kind: 'ignored' };
  if (layout.openTabs.length <= 1) return { kind: 'close-window' };

  const nextOpenTabs = layout.openTabs.filter((item) => item !== tab);
  const activeTab = layout.activeIdealResultTab === tab
    ? pickNextOpenTab(layout.openTabs, tab) ?? nextOpenTabs[0]
    : layout.activeIdealResultTab;
  return {
    kind: 'close-tab',
    activeTab,
    nextFile: {
      ...file,
      idealWindowLayout: {
        ...layout,
        openTabs: nextOpenTabs,
        activeIdealResultTab: activeTab,
      },
      updatedAt: now,
    },
  };
};

export const getIdealResultsTabState = (
  file: WorkbenchIdealState,
  tab: WorkbenchIdealResultWindowKey,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
): WorkbenchResultsTabState => {
  if (!file.visiblePanels.includes('results')) return 'off';
  const layout = normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults);
  if (layout.activeIdealResultTab === tab) return 'active';
  return layout.openTabs.includes(tab) ? 'open' : 'off';
};

export const activateStandardResultsTab = (
  file: WorkbenchStandardState,
  tab: WorkbenchStandardResultsTab,
  now = Date.now(),
): WorkbenchStandardState => ({
  ...file,
  standardResultsLayout: {
    ...normalizeStandardResultsLayout(file.standardResultsLayout),
    activeTab: tab,
  },
  updatedAt: now,
});

export const createStandardResultsTabOpenPlan = (
  file: WorkbenchStandardState,
  tab: WorkbenchStandardResultsTab,
  options: WorkbenchResultsTabOpenOptions = {},
  now = Date.now(),
): WorkbenchResultsTabOpenPlan<WorkbenchStandardState, WorkbenchStandardResultsTab> => {
  const currentLayout = normalizeStandardResultsLayout(file.standardResultsLayout);
  const nextOpenTabs = resolveOpenTabs(
    currentLayout.openTabs,
    standardResultsTabKeys,
    tab,
    options,
  );
  const layoutChanged = hasResultsLayoutChange(
    file.visiblePanels.includes('results'),
    currentLayout.openTabs,
    nextOpenTabs,
  );

  if (!layoutChanged) {
    return {
      layoutChanged,
      activeTab: tab,
      nextFile: activateStandardResultsTab(file, tab, now),
    };
  }

  return {
    layoutChanged,
    activeTab: tab,
    nextFile: {
      ...file,
      visiblePanels: file.visiblePanels.includes('results')
        ? file.visiblePanels
        : [...file.visiblePanels, 'results'],
      standardResultsLayout: {
        ...currentLayout,
        openTabs: nextOpenTabs,
        activeTab: tab,
      },
      updatedAt: now,
    },
  };
};

export const createStandardResultsTabClosePlan = (
  file: WorkbenchStandardState,
  tab: WorkbenchStandardResultsTab,
  now = Date.now(),
): WorkbenchResultsTabClosePlan<WorkbenchStandardState, WorkbenchStandardResultsTab> => {
  const layout = normalizeStandardResultsLayout(file.standardResultsLayout);
  if (!layout.openTabs.includes(tab)) return { kind: 'ignored' };
  if (layout.openTabs.length <= 1) return { kind: 'close-window' };

  const nextOpenTabs = layout.openTabs.filter((item) => item !== tab);
  const activeTab = layout.activeTab === tab
    ? pickNextOpenTab(layout.openTabs, tab) ?? nextOpenTabs[0]
    : layout.activeTab;
  return {
    kind: 'close-tab',
    activeTab,
    nextFile: {
      ...file,
      standardResultsLayout: {
        ...layout,
        openTabs: nextOpenTabs,
        activeTab,
      },
      updatedAt: now,
    },
  };
};

export const getStandardResultsTabState = (
  file: WorkbenchStandardState,
  tab: WorkbenchStandardResultsTab,
): WorkbenchResultsTabState => {
  if (!file.visiblePanels.includes('results')) return 'off';
  const layout = normalizeStandardResultsLayout(file.standardResultsLayout);
  if (layout.activeTab === tab) return 'active';
  return layout.openTabs.includes(tab) ? 'open' : 'off';
};
