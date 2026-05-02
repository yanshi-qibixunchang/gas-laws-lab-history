import type { WorkbenchFileState, WorkbenchPanelKey } from './workbenchState.ts';
import { createInitialWorkbenchFiles } from './workbenchState.ts';

export const WORKBENCH_SESSION_VERSION = 1;
export const WORKBENCH_SESSION_STORAGE_KEY = 'hsl_workbench_session_v1';

export interface WorkbenchSessionState {
  version: typeof WORKBENCH_SESSION_VERSION;
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

const panelKeys: WorkbenchPanelKey[] = ['preview', 'realtime', 'results', 'experimentPoints', 'verification', 'history'];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const fallbackSession = (): WorkbenchSessionState => {
  const files = createInitialWorkbenchFiles();
  return {
    version: WORKBENCH_SESSION_VERSION,
    files,
    activeFileId: files[0]?.id ?? '',
    selectedPanel: 'preview',
  };
};

const normalizeRuntimeState = (file: WorkbenchFileState): WorkbenchFileState => (
  file.runState === 'running'
    ? { ...file, runState: 'paused' }
    : file
);

export const decodeWorkbenchSession = (value: unknown): WorkbenchSessionState => {
  if (!isRecord(value) || value.version !== WORKBENCH_SESSION_VERSION || !Array.isArray(value.files)) {
    return fallbackSession();
  }

  const files = value.files.filter((file): file is WorkbenchFileState => (
    isRecord(file) &&
    typeof file.id === 'string' &&
    typeof file.name === 'string' &&
    (file.kind === 'standard' || file.kind === 'ideal')
  )).map(normalizeRuntimeState);

  if (files.length === 0) return fallbackSession();

  const requestedActiveId = typeof value.activeFileId === 'string' ? value.activeFileId : '';
  const activeFileId = files.some((file) => file.id === requestedActiveId) ? requestedActiveId : files[0].id;
  const selectedPanel = panelKeys.includes(value.selectedPanel as WorkbenchPanelKey)
    ? value.selectedPanel as WorkbenchPanelKey
    : 'preview';

  return {
    version: WORKBENCH_SESSION_VERSION,
    files,
    activeFileId,
    selectedPanel,
  };
};

export const encodeWorkbenchSession = (
  files: WorkbenchFileState[],
  activeFileId: string,
  selectedPanel: WorkbenchPanelKey,
): WorkbenchSessionState => decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  files: files.map(normalizeRuntimeState),
  activeFileId,
  selectedPanel,
});

export const loadWorkbenchSession = (): WorkbenchSessionState => {
  if (typeof window === 'undefined') return fallbackSession();

  try {
    const raw = window.localStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) return fallbackSession();
    return decodeWorkbenchSession(JSON.parse(raw));
  } catch {
    return fallbackSession();
  }
};

export const persistWorkbenchSession = (session: WorkbenchSessionState) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(WORKBENCH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage failures should not block the live workbench.
  }
};
