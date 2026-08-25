import {
  clampWorkbenchLiveSplitRatio,
  createDefaultStandardResultsLayout,
  IDEAL_RESULT_HEIGHT_RATIO,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchIdealWindowLayout,
  type WorkbenchFileState,
  type WorkbenchStandardResultsLayout,
  type WorkbenchStandardResultsTab,
} from './workbenchState.ts';

export interface WorkbenchLayoutDefaultState {
  resultsHeightRatio: number;
  liveWorkspaceSplitRatio: number;
}

export interface WorkbenchLayoutDefaults {
  standard: WorkbenchLayoutDefaultState;
  ideal: WorkbenchLayoutDefaultState;
  heatCapacity: WorkbenchLayoutDefaultState;
  heatCapacityPistonOscillation: WorkbenchLayoutDefaultState;
}

type StoredIdealResultWindowDefaults = Partial<Pick<WorkbenchIdealWindowLayout, 'heightRatio'>> & {
  frontHeightRatio?: number;
  backHeightRatio?: number;
};

const isLayoutRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getFiniteLayoutNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

export const IDEAL_RESULT_MIN_HEIGHT_RATIO = 0.25;
export const IDEAL_RESULT_MAX_HEIGHT_RATIO = 1;
export const IDEAL_RESULT_WINDOW_DEFAULTS_STORAGE_KEY = 'hsl_workbench_ideal_result_window_defaults';
export const WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY = 'hsl_workbench_layout_defaults_v1';

export const standardResultsTabKeys: WorkbenchStandardResultsTab[] = ['summary', 'dataTable', 'figures'];
export const idealResultWindowKeys: WorkbenchIdealResultWindowKey[] = ['experimentPoints', 'verification'];

export const isIdealResultWindowKey = (key: string): key is WorkbenchIdealResultWindowKey => (
  key === 'experimentPoints' || key === 'verification'
);

export const isStandardResultsTab = (key: string): key is WorkbenchStandardResultsTab => (
  standardResultsTabKeys.includes(key as WorkbenchStandardResultsTab)
);

export const clampIdealResultHeightRatio = (value: number) => (
  Math.min(IDEAL_RESULT_MAX_HEIGHT_RATIO, Math.max(IDEAL_RESULT_MIN_HEIGHT_RATIO, value))
);

export const normalizeIdealWindowLayoutState = (
  layout: unknown,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
): WorkbenchIdealWindowLayout => {
  const storedLayout = isLayoutRecord(layout) ? layout : null;
  const openTabs = Array.isArray(storedLayout?.openTabs)
    ? storedLayout.openTabs.filter((key): key is WorkbenchIdealResultWindowKey => typeof key === 'string' && isIdealResultWindowKey(key))
    : undefined;
  const storedOpenPanels = Array.isArray(storedLayout?.openPanels)
    ? storedLayout.openPanels.filter((key): key is WorkbenchIdealResultWindowKey => typeof key === 'string' && isIdealResultWindowKey(key))
    : undefined;
  const activeIdealResultTab: WorkbenchIdealResultWindowKey = (
    typeof storedLayout?.activeIdealResultTab === 'string' && isIdealResultWindowKey(storedLayout.activeIdealResultTab)
      ? storedLayout.activeIdealResultTab
      : undefined
  )
    ?? storedOpenPanels?.slice(-1)[0]
    ?? 'experimentPoints';
  const normalizedOpenTabs: WorkbenchIdealResultWindowKey[] = openTabs?.length ? openTabs : ['experimentPoints', 'verification'];
  const heightRatio = clampIdealResultHeightRatio(
    getFiniteLayoutNumber(storedLayout?.heightRatio)
    ?? getFiniteLayoutNumber(storedLayout?.frontHeightRatio)
    ?? getFiniteLayoutNumber(storedLayout?.backHeightRatio)
    ?? getFiniteLayoutNumber(defaults?.resultsHeightRatio)
    ?? IDEAL_RESULT_HEIGHT_RATIO,
  );

  return {
    openTabs: normalizedOpenTabs,
    activeIdealResultTab: normalizedOpenTabs.includes(activeIdealResultTab) ? activeIdealResultTab : normalizedOpenTabs[0],
    heightRatio,
    hasCustomHeight: storedLayout?.hasCustomHeight === true || storedLayout?.hasCustomHeights === true,
  };
};

export const normalizeStandardResultsLayout = (
  layout: unknown,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
): WorkbenchStandardResultsLayout => {
  const storedLayout = isLayoutRecord(layout) ? layout : null;
  const openTabs = Array.isArray(storedLayout?.openTabs)
    ? storedLayout.openTabs.filter((key): key is WorkbenchStandardResultsTab => typeof key === 'string' && isStandardResultsTab(key))
    : undefined;
  const normalizedOpenTabs: WorkbenchStandardResultsTab[] = openTabs?.length ? openTabs : ['summary', 'dataTable', 'figures'];
  const activeTab = typeof storedLayout?.activeTab === 'string' && isStandardResultsTab(storedLayout.activeTab) && normalizedOpenTabs.includes(storedLayout.activeTab)
    ? storedLayout.activeTab
    : normalizedOpenTabs[0];

  return {
    openTabs: normalizedOpenTabs,
    activeTab,
    heightRatio: clampIdealResultHeightRatio(
      getFiniteLayoutNumber(storedLayout?.heightRatio)
      ?? getFiniteLayoutNumber(defaults?.resultsHeightRatio)
      ?? IDEAL_RESULT_HEIGHT_RATIO,
    ),
  };
};

export const createDefaultWorkbenchLayoutDefaults = (): WorkbenchLayoutDefaults => ({
  standard: {
    resultsHeightRatio: IDEAL_RESULT_HEIGHT_RATIO,
    liveWorkspaceSplitRatio: WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  },
  ideal: {
    resultsHeightRatio: IDEAL_RESULT_HEIGHT_RATIO,
    liveWorkspaceSplitRatio: WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  },
  heatCapacity: {
    resultsHeightRatio: IDEAL_RESULT_HEIGHT_RATIO,
    liveWorkspaceSplitRatio: WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  },
  heatCapacityPistonOscillation: {
    resultsHeightRatio: IDEAL_RESULT_HEIGHT_RATIO,
    liveWorkspaceSplitRatio: WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
  },
});

const areLayoutTabsEqual = <T extends string>(current: readonly T[], expected: readonly T[]) => (
  current.length === expected.length && current.every((tab, index) => tab === expected[index])
);

export const isWorkbenchFileLayoutDefault = (
  file: WorkbenchFileState,
  defaults: WorkbenchLayoutDefaults,
): boolean => {
  const defaultLiveSplitRatio = defaults[file.kind].liveWorkspaceSplitRatio;
  const baseLayoutDefault = file.visiblePanels.length === 2
    && file.visiblePanels.includes('preview')
    && file.visiblePanels.includes('realtime')
    && file.liveWorkspaceSplitRatio === defaultLiveSplitRatio;
  if (!baseLayoutDefault) return false;

  if (file.kind === 'standard') {
    const expected = createDefaultStandardResultsLayout({
      heightRatio: defaults.standard.resultsHeightRatio,
    });
    return areLayoutTabsEqual(file.standardResultsLayout.openTabs, expected.openTabs)
      && file.standardResultsLayout.activeTab === expected.activeTab
      && file.standardResultsLayout.heightRatio === expected.heightRatio;
  }

  if (file.kind === 'ideal') {
    const expected = {
      openTabs: ['experimentPoints', 'verification'] as WorkbenchIdealResultWindowKey[],
      activeIdealResultTab: 'experimentPoints' as const,
      heightRatio: defaults.ideal.resultsHeightRatio,
      hasCustomHeight: false,
    };
    return areLayoutTabsEqual(file.idealWindowLayout.openTabs, expected.openTabs)
      && file.idealWindowLayout.activeIdealResultTab === expected.activeIdealResultTab
      && file.idealWindowLayout.heightRatio === expected.heightRatio
      && file.idealWindowLayout.hasCustomHeight === expected.hasCustomHeight;
  }

  if (file.kind === 'heatCapacity') {
    return file.openHeatCapacityTabs.length === 0
      && file.activeHeatCapacityTabId === null
      && file.heatCapacityMaterialsExpanded
      && file.heatCapacityTabContainerHeight === IDEAL_RESULT_HEIGHT_RATIO;
  }

  return true;
};

export const sanitizeWorkbenchLayoutDefaultState = (
  defaults: unknown,
): WorkbenchLayoutDefaultState => ({
  resultsHeightRatio: clampIdealResultHeightRatio(
    getFiniteLayoutNumber(isLayoutRecord(defaults) ? defaults.resultsHeightRatio : undefined)
    ?? IDEAL_RESULT_HEIGHT_RATIO,
  ),
  liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
    getFiniteLayoutNumber(isLayoutRecord(defaults) ? defaults.liveWorkspaceSplitRatio : undefined),
  ),
});

const sanitizePistonOscillationLayoutDefaultState = (
  defaults: unknown,
): WorkbenchLayoutDefaultState => {
  const sanitized = sanitizeWorkbenchLayoutDefaultState(defaults);
  return {
    ...sanitized,
    liveWorkspaceSplitRatio:
      sanitized.liveWorkspaceSplitRatio === WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO
        ? WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO
        : sanitized.liveWorkspaceSplitRatio,
  };
};

export const sanitizeIdealResultWindowDefaults = (
  defaults: unknown,
): WorkbenchLayoutDefaultState => {
  const storedDefaults = isLayoutRecord(defaults) ? defaults as StoredIdealResultWindowDefaults : null;
  return {
    resultsHeightRatio: clampIdealResultHeightRatio(
      getFiniteLayoutNumber(storedDefaults?.heightRatio)
      ?? getFiniteLayoutNumber(storedDefaults?.frontHeightRatio)
      ?? getFiniteLayoutNumber(storedDefaults?.backHeightRatio)
      ?? IDEAL_RESULT_HEIGHT_RATIO,
    ),
    liveWorkspaceSplitRatio: WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  };
};

export const sanitizeWorkbenchLayoutDefaults = (
  defaults: unknown,
): WorkbenchLayoutDefaults => {
  const fallback = createDefaultWorkbenchLayoutDefaults();
  const storedDefaults = isLayoutRecord(defaults) ? defaults : null;
  return {
    standard: sanitizeWorkbenchLayoutDefaultState(storedDefaults?.standard ?? fallback.standard),
    ideal: sanitizeWorkbenchLayoutDefaultState(storedDefaults?.ideal ?? fallback.ideal),
    heatCapacity: sanitizeWorkbenchLayoutDefaultState(storedDefaults?.heatCapacity ?? fallback.heatCapacity),
    heatCapacityPistonOscillation: sanitizePistonOscillationLayoutDefaultState(
      storedDefaults?.heatCapacityPistonOscillation ?? fallback.heatCapacityPistonOscillation,
    ),
  };
};

export const loadWorkbenchLayoutDefaults = (): WorkbenchLayoutDefaults => {
  if (typeof window === 'undefined') return createDefaultWorkbenchLayoutDefaults();

  try {
    const stored = window.localStorage.getItem(WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY);
    if (stored) return sanitizeWorkbenchLayoutDefaults(JSON.parse(stored) as Partial<WorkbenchLayoutDefaults>);

    const storedPreviousIdealDefaults = window.localStorage.getItem(IDEAL_RESULT_WINDOW_DEFAULTS_STORAGE_KEY);
    if (!storedPreviousIdealDefaults) return createDefaultWorkbenchLayoutDefaults();
    return sanitizeWorkbenchLayoutDefaults({
      ideal: sanitizeIdealResultWindowDefaults(JSON.parse(storedPreviousIdealDefaults)),
    });
  } catch {
    return createDefaultWorkbenchLayoutDefaults();
  }
};

export const persistWorkbenchLayoutDefaults = (defaults: WorkbenchLayoutDefaults) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY,
    JSON.stringify(sanitizeWorkbenchLayoutDefaults(defaults)),
  );
};
