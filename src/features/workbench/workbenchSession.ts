import {
  clampWorkbenchLiveSplitRatio,
  type WorkbenchFileState,
  type WorkbenchPanelKey,
} from './workbenchState.ts';
import {
  decodeWorkbenchClosedFilesStorageEnvelope,
  decodeWorkbenchStorageEnvelope,
  encodeWorkbenchClosedFilesStorageEnvelope,
  encodeWorkbenchStorageEnvelope,
} from './workbenchPersistenceMigration.ts';
import {
  normalizeHardSphereEngineSnapshot,
} from './workbenchHardSpherePersistence.ts';
import {
  normalizeHeatCapacitySessionRuntimeState,
} from './workbenchHeatCapacitySessionRestore.ts';
import { isWorkbenchPanelKey } from './workbenchPanelRegistry.ts';
import {
  isPersistenceRecord as isRecord,
  normalizePersistenceNullableNumber as normalizeNullableNumber,
} from './workbenchPersistenceValue.ts';

export const WORKBENCH_SESSION_VERSION = 1;
export const WORKBENCH_SESSION_STORAGE_KEY = 'hsl_workbench_session_v1';
export const WORKBENCH_CLOSED_FILES_STORAGE_KEY = 'hsl_workbench_closed_files_v1';

export interface WorkbenchSessionState {
  version: typeof WORKBENCH_SESSION_VERSION;
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
  heatCapacityGuideSession?: WorkbenchHeatCapacityGuideSessionState;
}

export interface WorkbenchHeatCapacityGuideSessionState {
  fileId: string | null;
  strongReminderActive: boolean;
  strongReminderControlId: string | null;
}

export const getRestorableHeatCapacityGuideSessionFileId = (
  session: WorkbenchSessionState,
): string | null => {
  const fileId = session.heatCapacityGuideSession?.fileId;
  if (!fileId) return null;
  const file = session.files.find((candidate) => candidate.id === fileId);
  return file?.kind === 'heatCapacity' && file.heatCapacityMode === 'guide'
    ? file.id
    : null;
};

const normalizeLastOpenedAt = (file: WorkbenchFileState, fallback: number) => (
  normalizeNullableNumber(file.lastOpenedAt) ??
  normalizeNullableNumber(file.updatedAt) ??
  normalizeNullableNumber(file.createdAt) ??
  fallback
);

const fallbackSession = (): WorkbenchSessionState => {
  return {
    version: WORKBENCH_SESSION_VERSION,
    files: [],
    activeFileId: '',
    selectedPanel: 'preview',
    heatCapacityGuideSession: createDefaultHeatCapacityGuideSession(),
  };
};

const createDefaultHeatCapacityGuideSession = (): WorkbenchHeatCapacityGuideSessionState => ({
  fileId: null,
  strongReminderActive: false,
  strongReminderControlId: null,
});

const isFreshWorkbenchWindow = () => {
  if (typeof window === 'undefined') return false;

  try {
    return new URL(window.location.href).searchParams.get('hslFreshWindow') === '1';
  } catch {
    return false;
  }
};

const getWorkbenchSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  return isFreshWorkbenchWindow() ? window.sessionStorage : window.localStorage;
};

const normalizeRuntimeState = (file: WorkbenchFileState): WorkbenchFileState => {
  if (file.kind === 'heatCapacity') {
    return normalizeHeatCapacitySessionRuntimeState(file);
  }
  return {
    ...file,
    runState: file.runState === 'running' ? 'paused' : file.runState,
    lastOpenedAt: normalizeLastOpenedAt(file, file.updatedAt),
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
    hardSphereEngineSnapshot: normalizeHardSphereEngineSnapshot(file.hardSphereEngineSnapshot),
  };
};

const normalizeHeatCapacityGuideSession = (
  value: unknown,
  files: WorkbenchFileState[],
): WorkbenchHeatCapacityGuideSessionState => {
  if (!isRecord(value) || typeof value.fileId !== 'string') {
    return createDefaultHeatCapacityGuideSession();
  }
  const guideFile = files.find((file) => (
    file.id === value.fileId &&
    file.kind === 'heatCapacity' &&
    file.heatCapacityMode === 'guide'
  ));
  if (!guideFile) return createDefaultHeatCapacityGuideSession();
  return {
    fileId: guideFile.id,
    strongReminderActive: value.strongReminderActive === true,
    strongReminderControlId: typeof value.strongReminderControlId === 'string'
      ? value.strongReminderControlId
      : null,
  };
};

export const decodeWorkbenchSession = (value: unknown): WorkbenchSessionState => {
  if (!isRecord(value) || value.version !== WORKBENCH_SESSION_VERSION || !Array.isArray(value.files)) {
    return fallbackSession();
  }

  const files = value.files.filter((file): file is WorkbenchFileState => (
    isRecord(file) &&
    typeof file.id === 'string' &&
    typeof file.name === 'string' &&
    (file.kind === 'standard' || file.kind === 'ideal' || file.kind === 'heatCapacity')
  )).map(normalizeRuntimeState);

  if (files.length === 0) return fallbackSession();

  const requestedActiveId = typeof value.activeFileId === 'string' ? value.activeFileId : '';
  const activeFileId = files.some((file) => file.id === requestedActiveId) ? requestedActiveId : files[0].id;
  const restoredSelectedPanel = isWorkbenchPanelKey(value.selectedPanel)
    ? value.selectedPanel
    : 'preview';
  const activeFile = files.find((file) => file.id === activeFileId);
  const selectedPanel = activeFile?.kind === 'heatCapacity' && !(
    restoredSelectedPanel === 'preview' ||
    restoredSelectedPanel === 'realtime' ||
    restoredSelectedPanel === 'heatCapacityGuide' ||
    restoredSelectedPanel === 'heatCapacityRecords' ||
    restoredSelectedPanel === 'heatCapacityReview'
  )
    ? 'preview'
    : restoredSelectedPanel;
  const heatCapacityGuideSession = normalizeHeatCapacityGuideSession(value.heatCapacityGuideSession, files);

  return {
    version: WORKBENCH_SESSION_VERSION,
    files,
    activeFileId,
    selectedPanel,
    heatCapacityGuideSession,
  };
};

export const encodeWorkbenchSession = (
  files: WorkbenchFileState[],
  activeFileId: string,
  selectedPanel: WorkbenchPanelKey,
  heatCapacityGuideSession: WorkbenchHeatCapacityGuideSessionState = createDefaultHeatCapacityGuideSession(),
): WorkbenchSessionState => decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  files: files.map(normalizeRuntimeState),
  activeFileId,
  selectedPanel,
  heatCapacityGuideSession,
});

const normalizeWorkbenchFileList = (
  files: WorkbenchFileState[],
): WorkbenchFileState[] => {
  if (files.length === 0) return [];
  return decodeWorkbenchSession({
    version: WORKBENCH_SESSION_VERSION,
    files,
    activeFileId: files[0].id,
    selectedPanel: 'preview',
  }).files;
};

export const loadWorkbenchSession = (): WorkbenchSessionState => {
  if (typeof window === 'undefined') return fallbackSession();
  const storage = getWorkbenchSessionStorage();
  if (!storage) return fallbackSession();

  try {
    const raw = storage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) return fallbackSession();
    const parsed = JSON.parse(raw);
    const decodedEnvelope = decodeWorkbenchStorageEnvelope(parsed);
    return decodedEnvelope.handled
      ? decodeWorkbenchSession(decodedEnvelope.session)
      : decodeWorkbenchSession(parsed);
  } catch {
    return fallbackSession();
  }
};

export const persistWorkbenchSession = (session: WorkbenchSessionState) => {
  if (typeof window === 'undefined') return;
  const storage = getWorkbenchSessionStorage();
  if (!storage) return;

  try {
    const envelope = encodeWorkbenchStorageEnvelope(
      session.files,
      session.activeFileId,
      session.selectedPanel,
      Date.now(),
      session.heatCapacityGuideSession,
    );
    storage.setItem(WORKBENCH_SESSION_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage failures should not block the live workbench.
  }
};

export const loadClosedWorkbenchFiles = (): WorkbenchFileState[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(WORKBENCH_CLOSED_FILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const decodedEnvelope = decodeWorkbenchClosedFilesStorageEnvelope(parsed);
    if (decodedEnvelope.handled) {
      return normalizeWorkbenchFileList(decodedEnvelope.files);
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((file): file is WorkbenchFileState => (
      isRecord(file) &&
      typeof file.id === 'string' &&
      typeof file.name === 'string' &&
      (file.kind === 'standard' || file.kind === 'ideal' || file.kind === 'heatCapacity')
    )).map(normalizeRuntimeState);
  } catch {
    return [];
  }
};

export const persistClosedWorkbenchFiles = (files: WorkbenchFileState[]) => {
  if (typeof window === 'undefined') return;

  try {
    const normalizedFiles = files
      .map(normalizeRuntimeState)
      .filter((file, index, allFiles) => allFiles.findIndex((candidate) => candidate.id === file.id) === index);
    const envelope = encodeWorkbenchClosedFilesStorageEnvelope(normalizedFiles);
    window.localStorage.setItem(WORKBENCH_CLOSED_FILES_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage failures should not block the live workbench.
  }
};
