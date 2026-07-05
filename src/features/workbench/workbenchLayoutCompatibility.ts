import {
  clampWorkbenchLiveSplitRatio,
  IDEAL_RESULT_HEIGHT_RATIO,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchIdealWindowLayout,
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
}

type StoredIdealResultWindowDefaults = Partial<Pick<WorkbenchIdealWindowLayout, 'heightRatio'>> & {
  frontHeightRatio?: number;
  backHeightRatio?: number;
};

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
  layout: WorkbenchIdealWindowLayout | (Partial<WorkbenchIdealWindowLayout> & {
    openPanels?: WorkbenchIdealResultWindowKey[];
    frontHeightRatio?: number;
    backHeightRatio?: number;
    hasCustomHeights?: boolean;
  }) | null | undefined,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
): WorkbenchIdealWindowLayout => {
  const storedLayout = layout as (Partial<WorkbenchIdealWindowLayout> & {
    openPanels?: string[];
    frontHeightRatio?: number;
    backHeightRatio?: number;
    hasCustomHeights?: boolean;
  }) | null | undefined;
  const openTabs = storedLayout?.openTabs?.filter(isIdealResultWindowKey) as WorkbenchIdealResultWindowKey[] | undefined;
  const storedOpenPanels = storedLayout?.openPanels?.filter(isIdealResultWindowKey) as WorkbenchIdealResultWindowKey[] | undefined;
  const activeIdealResultTab: WorkbenchIdealResultWindowKey = storedLayout?.activeIdealResultTab
    ?? storedOpenPanels?.slice(-1)[0]
    ?? 'experimentPoints';
  const normalizedOpenTabs: WorkbenchIdealResultWindowKey[] = openTabs?.length ? openTabs : ['experimentPoints', 'verification'];
  const heightRatio = clampIdealResultHeightRatio(
    storedLayout?.heightRatio
    ?? storedLayout?.frontHeightRatio
    ?? storedLayout?.backHeightRatio
    ?? defaults?.resultsHeightRatio
    ?? IDEAL_RESULT_HEIGHT_RATIO,
  );

  return {
    openTabs: normalizedOpenTabs,
    activeIdealResultTab: normalizedOpenTabs.includes(activeIdealResultTab) ? activeIdealResultTab : normalizedOpenTabs[0],
    heightRatio,
    hasCustomHeight: Boolean(storedLayout?.hasCustomHeight ?? storedLayout?.hasCustomHeights),
  };
};

export const normalizeStandardResultsLayout = (
  layout: Partial<WorkbenchStandardResultsLayout> | null | undefined,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
): WorkbenchStandardResultsLayout => {
  const openTabs = layout?.openTabs?.filter(isStandardResultsTab) as WorkbenchStandardResultsTab[] | undefined;
  const normalizedOpenTabs: WorkbenchStandardResultsTab[] = openTabs?.length ? openTabs : ['summary', 'dataTable', 'figures'];
  const activeTab = layout?.activeTab && normalizedOpenTabs.includes(layout.activeTab)
    ? layout.activeTab
    : normalizedOpenTabs[0];

  return {
    openTabs: normalizedOpenTabs,
    activeTab,
    heightRatio: clampIdealResultHeightRatio(layout?.heightRatio ?? defaults?.resultsHeightRatio ?? IDEAL_RESULT_HEIGHT_RATIO),
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
});

export const sanitizeWorkbenchLayoutDefaultState = (
  defaults: Partial<WorkbenchLayoutDefaultState> | null | undefined,
): WorkbenchLayoutDefaultState => ({
  resultsHeightRatio: clampIdealResultHeightRatio(defaults?.resultsHeightRatio ?? IDEAL_RESULT_HEIGHT_RATIO),
  liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(defaults?.liveWorkspaceSplitRatio),
});

export const sanitizeIdealResultWindowDefaults = (
  defaults: StoredIdealResultWindowDefaults | null | undefined,
): WorkbenchLayoutDefaultState => {
  const storedDefaults = defaults;
  return {
    resultsHeightRatio: clampIdealResultHeightRatio(
      storedDefaults?.heightRatio
      ?? storedDefaults?.frontHeightRatio
      ?? storedDefaults?.backHeightRatio
      ?? IDEAL_RESULT_HEIGHT_RATIO,
    ),
    liveWorkspaceSplitRatio: WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  };
};

export const sanitizeWorkbenchLayoutDefaults = (
  defaults: Partial<WorkbenchLayoutDefaults> | null | undefined,
): WorkbenchLayoutDefaults => {
  const fallback = createDefaultWorkbenchLayoutDefaults();
  return {
    standard: sanitizeWorkbenchLayoutDefaultState(defaults?.standard ?? fallback.standard),
    ideal: sanitizeWorkbenchLayoutDefaultState(defaults?.ideal ?? fallback.ideal),
    heatCapacity: sanitizeWorkbenchLayoutDefaultState(defaults?.heatCapacity ?? fallback.heatCapacity),
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
