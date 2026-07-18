import {
  clampWorkbenchLiveSplitRatio,
  type WorkbenchFileState,
  type WorkbenchPanelKey,
} from './workbenchState.ts';
import {
  normalizeHardSphereEngineSnapshot,
} from './workbenchHardSpherePersistence.ts';
import { repairMissingHardSphereEngineSnapshot } from './workbenchHardSphereProjection.ts';
import {
  normalizeHeatCapacitySessionRuntimeState,
} from './workbenchHeatCapacitySessionRestore.ts';
import { isWorkbenchPanelKey } from './workbenchPanelRegistry.ts';
import {
  isPersistenceRecord as isRecord,
  normalizePersistenceNullableNumber as normalizeNullableNumber,
} from './workbenchPersistenceValue.ts';
import { isWorkbenchFileKind } from './workbenchFileKind.ts';
import {
  normalizePistonOscillationRuntimeState,
} from './workbenchPistonOscillationPersistence.ts';

export const WORKBENCH_SESSION_VERSION = 1;
export const WORKBENCH_SESSION_STORAGE_KEY = 'hsl_workbench_session_v1';
export const WORKBENCH_CLOSED_FILES_STORAGE_KEY = 'hsl_workbench_closed_files_v1';

export interface WorkbenchSessionState {
  version: typeof WORKBENCH_SESSION_VERSION;
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

let bootstrappedSession: WorkbenchSessionState | null = null;
let bootstrappedClosedFiles: WorkbenchFileState[] = [];
let workbenchBootstrapInstalled = false;

export const installWorkbenchPersistenceBootstrap = (
  session: WorkbenchSessionState,
  closedFiles: WorkbenchFileState[],
) => {
  bootstrappedSession = createWorkbenchSessionFromCanonicalFiles(session);
  bootstrappedClosedFiles = closedFiles.length === 0
    ? []
    : createWorkbenchSessionFromCanonicalFiles({
        files: closedFiles,
        activeFileId: closedFiles[0]!.id,
        selectedPanel: 'preview',
      }).files;
  workbenchBootstrapInstalled = true;
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
  };
};

const normalizeRuntimeState = (file: WorkbenchFileState): WorkbenchFileState => {
  if (file.kind === 'heatCapacity') {
    return normalizeHeatCapacitySessionRuntimeState(file);
  }
  if (file.kind === 'heatCapacityPistonOscillation') {
    return normalizePistonOscillationRuntimeState(file) ?? file;
  }
  return repairMissingHardSphereEngineSnapshot({
    ...file,
    runState: file.runState === 'running' ? 'paused' : file.runState,
    lastOpenedAt: normalizeLastOpenedAt(file, file.updatedAt),
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
    hardSphereEngineSnapshot: normalizeHardSphereEngineSnapshot(file.hardSphereEngineSnapshot),
  } as Extract<WorkbenchFileState, { kind: 'standard' | 'ideal' }>);
};

const createWorkbenchSessionFromValidatedFiles = (
  files: WorkbenchFileState[],
  activeFileIdValue: string,
  selectedPanelValue: WorkbenchPanelKey,
): WorkbenchSessionState => {
  if (new Set(files.map((file) => file.id)).size !== files.length) {
    throw new TypeError('Workbench runtime file identifiers must be unique.');
  }
  if (files.length === 0) return fallbackSession();
  const activeFileId = files.some((file) => file.id === activeFileIdValue)
    ? activeFileIdValue
    : files[0]!.id;
  const restoredSelectedPanel = isWorkbenchPanelKey(selectedPanelValue)
    ? selectedPanelValue
    : 'preview';
  const activeFile = files.find((file) => file.id === activeFileId);
  const selectedPanel = (
    activeFile?.kind === 'heatCapacity' && !(
      restoredSelectedPanel === 'preview' ||
      restoredSelectedPanel === 'realtime' ||
      restoredSelectedPanel === 'heatCapacityGuide' ||
      restoredSelectedPanel === 'heatCapacityRecords' ||
      restoredSelectedPanel === 'heatCapacityReview'
    )
  ) || (
    activeFile?.kind === 'heatCapacityPistonOscillation' &&
    restoredSelectedPanel !== 'preview' &&
    restoredSelectedPanel !== 'realtime'
  )
    ? 'preview'
    : restoredSelectedPanel;
  return {
    version: WORKBENCH_SESSION_VERSION,
    files,
    activeFileId,
    selectedPanel,
  };
};

const assertWorkbenchRuntimeFiles = (files: WorkbenchFileState[]) => {
  if (!Array.isArray(files)) throw new TypeError('Workbench runtime files must be an array.');
  files.forEach((file) => {
    if (
      !isRecord(file) ||
      typeof file.id !== 'string' ||
      typeof file.name !== 'string' ||
      !isWorkbenchFileKind(file.kind)
    ) {
      throw new TypeError('Workbench runtime file is invalid.');
    }
  });
};

export const createWorkbenchSessionFromCanonicalFiles = (value: {
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}): WorkbenchSessionState => {
  assertWorkbenchRuntimeFiles(value.files);
  return createWorkbenchSessionFromValidatedFiles(
    value.files,
    value.activeFileId,
    value.selectedPanel,
  );
};

export const createWorkbenchSessionFromRuntimeFiles = (value: {
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}): WorkbenchSessionState => {
  assertWorkbenchRuntimeFiles(value.files);
  return createWorkbenchSessionFromValidatedFiles(
    value.files.map(normalizeRuntimeState),
    value.activeFileId,
    value.selectedPanel,
  );
};

export const decodeWorkbenchSession = (value: unknown): WorkbenchSessionState => {
  if (!isRecord(value) || value.version !== WORKBENCH_SESSION_VERSION || !Array.isArray(value.files)) {
    return fallbackSession();
  }

  const files = value.files.filter((file): file is WorkbenchFileState => (
    isRecord(file) &&
    typeof file.id === 'string' &&
    typeof file.name === 'string' &&
    isWorkbenchFileKind(file.kind)
  )).map(normalizeRuntimeState);

  return createWorkbenchSessionFromRuntimeFiles({
    files,
    activeFileId: typeof value.activeFileId === 'string' ? value.activeFileId : '',
    selectedPanel: isWorkbenchPanelKey(value.selectedPanel) ? value.selectedPanel : 'preview',
  });
};

export const encodeWorkbenchSession = (
  files: WorkbenchFileState[],
  activeFileId: string,
  selectedPanel: WorkbenchPanelKey,
): WorkbenchSessionState => decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  files,
  activeFileId,
  selectedPanel,
});

export const loadWorkbenchSession = (): WorkbenchSessionState => {
  if (workbenchBootstrapInstalled) return bootstrappedSession ?? fallbackSession();
  return fallbackSession();
};

export const loadClosedWorkbenchFiles = (): WorkbenchFileState[] => {
  if (workbenchBootstrapInstalled) return bootstrappedClosedFiles;
  return [];
};
