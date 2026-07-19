import {
  IDEAL_RESULT_HEIGHT_RATIO,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchIdealWindowLayout,
  type WorkbenchStandardResultsLayout,
  type WorkbenchStandardResultsTab,
} from '../workbenchState.ts';

export interface WorkbenchPersistenceV3LayoutDefaults {
  resultsHeightRatio: number;
  liveWorkspaceSplitRatio: number;
}

const IDEAL_RESULT_MIN_HEIGHT_RATIO = 0.25;
const IDEAL_RESULT_MAX_HEIGHT_RATIO = 1;

const isLayoutRecord = (
  value: unknown,
): value is Record<string, unknown> => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const getFiniteLayoutNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined
);

const standardResultsTabKeys: WorkbenchStandardResultsTab[] = [
  'summary',
  'dataTable',
  'figures',
];

const isIdealResultWindowKey = (
  key: string,
): key is WorkbenchIdealResultWindowKey => (
  key === 'experimentPoints' || key === 'verification'
);

const isStandardResultsTab = (
  key: string,
): key is WorkbenchStandardResultsTab => (
  standardResultsTabKeys.includes(key as WorkbenchStandardResultsTab)
);

const clampIdealResultHeightRatio = (value: number) => (
  Math.min(
    IDEAL_RESULT_MAX_HEIGHT_RATIO,
    Math.max(IDEAL_RESULT_MIN_HEIGHT_RATIO, value),
  )
);

export const normalizePersistenceV3IdealWindowLayout = (
  layout: unknown,
  defaults?: Partial<WorkbenchPersistenceV3LayoutDefaults>,
): WorkbenchIdealWindowLayout => {
  const storedLayout = isLayoutRecord(layout) ? layout : null;
  const openTabs = Array.isArray(storedLayout?.openTabs)
    ? storedLayout.openTabs.filter(
        (key): key is WorkbenchIdealResultWindowKey => (
          typeof key === 'string' && isIdealResultWindowKey(key)
        ),
      )
    : undefined;
  const storedOpenPanels = Array.isArray(storedLayout?.openPanels)
    ? storedLayout.openPanels.filter(
        (key): key is WorkbenchIdealResultWindowKey => (
          typeof key === 'string' && isIdealResultWindowKey(key)
        ),
      )
    : undefined;
  const activeIdealResultTab: WorkbenchIdealResultWindowKey = (
    typeof storedLayout?.activeIdealResultTab === 'string' &&
      isIdealResultWindowKey(storedLayout.activeIdealResultTab)
      ? storedLayout.activeIdealResultTab
      : undefined
  )
    ?? storedOpenPanels?.slice(-1)[0]
    ?? 'experimentPoints';
  const normalizedOpenTabs: WorkbenchIdealResultWindowKey[] =
    openTabs?.length
      ? openTabs
      : ['experimentPoints', 'verification'];
  const heightRatio = clampIdealResultHeightRatio(
    getFiniteLayoutNumber(storedLayout?.heightRatio)
      ?? getFiniteLayoutNumber(storedLayout?.frontHeightRatio)
      ?? getFiniteLayoutNumber(storedLayout?.backHeightRatio)
      ?? getFiniteLayoutNumber(defaults?.resultsHeightRatio)
      ?? IDEAL_RESULT_HEIGHT_RATIO,
  );

  return {
    openTabs: normalizedOpenTabs,
    activeIdealResultTab: normalizedOpenTabs.includes(activeIdealResultTab)
      ? activeIdealResultTab
      : normalizedOpenTabs[0],
    heightRatio,
    hasCustomHeight:
      storedLayout?.hasCustomHeight === true ||
      storedLayout?.hasCustomHeights === true,
  };
};

export const normalizePersistenceV3StandardResultsLayout = (
  layout: unknown,
  defaults?: Partial<WorkbenchPersistenceV3LayoutDefaults>,
): WorkbenchStandardResultsLayout => {
  const storedLayout = isLayoutRecord(layout) ? layout : null;
  const openTabs = Array.isArray(storedLayout?.openTabs)
    ? storedLayout.openTabs.filter(
        (key): key is WorkbenchStandardResultsTab => (
          typeof key === 'string' && isStandardResultsTab(key)
        ),
      )
    : undefined;
  const normalizedOpenTabs: WorkbenchStandardResultsTab[] =
    openTabs?.length
      ? openTabs
      : ['summary', 'dataTable', 'figures'];
  const activeTab =
    typeof storedLayout?.activeTab === 'string' &&
      isStandardResultsTab(storedLayout.activeTab) &&
      normalizedOpenTabs.includes(storedLayout.activeTab)
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
