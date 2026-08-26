export const WORKBENCH_SIDEBAR_REFRESH_STATE_STORAGE_KEY =
  'hsl_workbench_sidebar_refresh_state_v1';

export const WORKBENCH_SIDEBAR_REFRESH_STATE_SCHEMA_VERSION = 1 as const;

export type WorkbenchSidebarRefreshState = {
  schemaVersion: typeof WORKBENCH_SIDEBAR_REFRESH_STATE_SCHEMA_VERSION;
  leftCollapsed: boolean;
  parametersCollapsed: boolean;
};

export type WorkbenchSidebarRefreshStateStorage = Pick<
  Storage,
  'getItem' | 'setItem'
>;

export const createDefaultWorkbenchSidebarRefreshState = ():
WorkbenchSidebarRefreshState => ({
  schemaVersion: WORKBENCH_SIDEBAR_REFRESH_STATE_SCHEMA_VERSION,
  leftCollapsed: false,
  parametersCollapsed: true,
});

export const normalizeWorkbenchSidebarRefreshState = (
  value: unknown,
): WorkbenchSidebarRefreshState => {
  const fallback = createDefaultWorkbenchSidebarRefreshState();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const candidate = value as Record<string, unknown>;
  return {
    schemaVersion: WORKBENCH_SIDEBAR_REFRESH_STATE_SCHEMA_VERSION,
    leftCollapsed: typeof candidate.leftCollapsed === 'boolean'
      ? candidate.leftCollapsed
      : fallback.leftCollapsed,
    parametersCollapsed: typeof candidate.parametersCollapsed === 'boolean'
      ? candidate.parametersCollapsed
      : fallback.parametersCollapsed,
  };
};

const getTabSessionStorage = (): WorkbenchSidebarRefreshStateStorage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const loadWorkbenchSidebarRefreshState = (
  storage: WorkbenchSidebarRefreshStateStorage | null = getTabSessionStorage(),
): WorkbenchSidebarRefreshState => {
  if (!storage) return createDefaultWorkbenchSidebarRefreshState();
  try {
    const rawValue = storage.getItem(WORKBENCH_SIDEBAR_REFRESH_STATE_STORAGE_KEY);
    return rawValue
      ? normalizeWorkbenchSidebarRefreshState(JSON.parse(rawValue))
      : createDefaultWorkbenchSidebarRefreshState();
  } catch {
    return createDefaultWorkbenchSidebarRefreshState();
  }
};

export const persistWorkbenchSidebarRefreshState = (
  value: unknown,
  storage: WorkbenchSidebarRefreshStateStorage | null = getTabSessionStorage(),
): boolean => {
  if (!storage) return false;
  try {
    storage.setItem(
      WORKBENCH_SIDEBAR_REFRESH_STATE_STORAGE_KEY,
      JSON.stringify(normalizeWorkbenchSidebarRefreshState(value)),
    );
    return true;
  } catch {
    return false;
  }
};
