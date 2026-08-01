import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import {
  createClosedHeatCapacityReleaseState,
  type HeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  createHeatCapacityModeDeferredTimer,
  createHeatCapacityModeUiCheckpoint,
  getHeatCapacityModeDeferredTimerRemainingMs,
  type HeatCapacityModeGuideCheckpoint,
  type HeatCapacityModeJsonObject,
  type HeatCapacityModeUiCheckpoint,
} from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  encodeWorkbenchClosedFilesStorageEnvelope,
  decodeWorkbenchClosedFilesStorageEnvelope,
  decodeWorkbenchStorageEnvelope,
  type WorkbenchMigrationModeCaptureOverride,
} from './workbenchPersistenceMigration.ts';
import {
  WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  isWorkbenchExperimentFileEnvelope,
} from './workbenchPersistenceSchema.ts';
import {
  WORKBENCH_CLOSED_FILES_STORAGE_KEY,
  WORKBENCH_SESSION_STORAGE_KEY,
  createWorkbenchSessionFromCanonicalFiles,
  createWorkbenchSessionFromRuntimeFiles,
  decodeWorkbenchSessionWithDiagnostics,
  installWorkbenchPersistenceBootstrap,
  type WorkbenchSessionState,
} from './workbenchSession.ts';
import {
  WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY,
  createWorkbenchHeatCapacityRefreshSession,
  installWorkbenchHeatCapacityRefreshBootstrap,
  normalizeWorkbenchHeatCapacityRefreshSession,
  type WorkbenchHeatCapacityRefreshSession,
} from './workbenchHeatCapacityRefreshSession.ts';
import {
  HEAT_CAPACITY_SCHEMA_VERSION,
  createHeatCapacityPersistencePayload,
  restoreHeatCapacityFileFromPersistencePayload,
} from './workbenchHeatCapacityPersistence.ts';
import {
  createHeatCapacityModeRuntimeShell,
  normalizeLegacyHeatCapacityModeSessionEntry,
  normalizeHeatCapacityModeSessionStore,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
  type HeatCapacityModeSessionEntry,
} from './workbenchHeatCapacityModeSession.ts';

export { normalizeLegacyHeatCapacityModeSessionEntry };
import type {
  WorkbenchFileState,
  WorkbenchHeatCapacityState,
  WorkbenchPanelKey,
} from './workbenchState.ts';
import {
  createDefaultHeatCapacityFile,
  mergeHeatCapacityGuideRuntimeState,
  normalizeHeatCapacityFileName,
} from './workbenchState.ts';
import { assertUniqueWorkbenchFileCollections } from './workbenchFileIdentity.ts';
import { isWorkbenchPanelKey } from './workbenchPanelRegistry.ts';
import { clonePersistenceValue, isPersistenceRecord } from './workbenchPersistenceValue.ts';
import {
  areCanonicalPersistenceValuesEqual,
  isCanonicalPistonOscillationWorkspaceFile,
  isCanonicalStandardOrIdealWorkspaceFile,
} from './workbenchWorkspaceFileValidation.ts';
import {
  commitWorkbenchPersistenceV3ProductionSnapshot,
  createEmptyWorkbenchPersistenceV3RetainedState,
  restoreWorkbenchPersistenceV3ProductionWorkspace,
  type WorkbenchPersistenceV3RetainedState,
} from './persistenceV3/productionFacade.ts';
import {
  IndexedDbWorkbenchPersistenceV3GenerationStore,
  WORKBENCH_PERSISTENCE_V3_GENERATION_HEAD_STORE,
  WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
} from './workbenchPersistenceV3IndexedDbGenerationStore.ts';
import {
  WorkbenchPersistenceWorkerClient,
  WorkbenchPersistenceWorkerTransportError,
} from './workbenchPersistenceWorkerClient.ts';

export const WORKBENCH_INDEXED_DB_NAME = 'hard-sphere-lab-workbench';
export const WORKBENCH_INDEXED_DB_VERSION = 3;
export const WORKBENCH_WORKSPACE_META_STORE = 'workspaceMeta';
export const WORKBENCH_FILES_STORE = 'files';
export const WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE = 'heatCapacityModeSessions';
export const WORKBENCH_PERSISTENT_NAMESPACE = 'persistent:main';
export const WORKBENCH_WINDOW_NAMESPACE_QUERY_PARAM = 'hslWorkspaceNamespace';
export const WORKBENCH_TEMP_NAMESPACE_SESSION_KEY = 'hsl_workbench_temporary_namespace_v2';
export const WORKBENCH_TEMP_NAMESPACE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
export const WORKBENCH_TEMP_NAMESPACE_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1_000;
export const WORKBENCH_MIGRATION_CONFLICT_WAIT_TIMEOUT_MS = 3_000;
export const WORKBENCH_MIGRATION_CONFLICT_POLL_INTERVAL_MS = 50;
export const WORKBENCH_INDEXED_DB_BLOCKED_TIMEOUT_MS = 5_000;

const WORKSPACE_SCHEMA_FAMILY = 'hard-sphere-lab/workspace-indexeddb-v2' as const;
const FILE_RECORD_SCHEMA_FAMILY = 'hard-sphere-lab/workspace-file-v2' as const;
const MODE_RECORD_SCHEMA_FAMILY = 'hard-sphere-lab/heat-capacity-mode-session-v2' as const;

type WorkbenchMigrationState = 'ready' | 'pending-verification' | 'cleanup-pending';

type WorkspaceMetaRecord = {
  schemaFamily: typeof WORKSPACE_SCHEMA_FAMILY;
  schemaVersion: 2;
  namespace: string;
  appVersion: string;
  savedAtMs: number;
  lastSuccessfulSaveAtMs: number;
  migrationState: WorkbenchMigrationState;
  activeFileId: string | null;
  selectedPanel: WorkbenchPanelKey;
  openFileIds: string[];
  closedFileIds: string[];
  refreshMetadata: WorkbenchHeatCapacityRefreshMetadata | null;
};

type WorkbenchHeatCapacityRefreshMetadata = {
  activeHeatCapacityFileId: string;
  mode: HeatCapacityMode;
  checkpointId: string;
  capturedAtMs: number;
  modeTransition: WorkbenchHeatCapacityRefreshSession['modeTransition'];
  modeTransitionDemoClock: WorkbenchHeatCapacityRefreshSession['modeTransitionDemoClock'];
  ui: WorkbenchHeatCapacityRefreshSession['ui'];
  guideTransient: Pick<
    WorkbenchHeatCapacityRefreshSession['guide'],
    'toastQueue' | 'pressureAlarmVisible' | 'pressureAlarmRemainingMs'
  >;
};

type WorkspaceFileRecord = {
  schemaFamily: typeof FILE_RECORD_SCHEMA_FAMILY;
  key: string;
  namespace: string;
  fileId: string;
  state: WorkbenchFileState;
};

export const advanceWorkbenchWorkspaceMetaRevision = (
  meta: WorkspaceMetaRecord,
  currentRevision: number | null,
): WorkspaceMetaRecord => {
  const previousRevision = currentRevision ?? 0;
  const nextRevision = previousRevision + 1;
  if (
    !Number.isSafeInteger(previousRevision) ||
    previousRevision < 0 ||
    !Number.isSafeInteger(nextRevision) ||
    nextRevision <= previousRevision
  ) {
    throw new Error('Workspace persistence revision cannot advance safely.');
  }
  return {
    ...meta,
    lastSuccessfulSaveAtMs: Math.max(meta.savedAtMs, nextRevision),
  };
};

type HeatCapacityModeSessionRecord = {
  schemaFamily: typeof MODE_RECORD_SCHEMA_FAMILY;
  key: string;
  namespace: string;
  fileId: string;
  mode: HeatCapacityMode;
  entry: HeatCapacityModeSessionEntry;
};

export type WorkbenchWorkspacePersistenceSnapshot = {
  files: WorkbenchFileState[];
  closedFiles: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
  refreshSession: WorkbenchHeatCapacityRefreshSession | null;
  activeModeCheckpoint: HeatCapacityModeUiCheckpoint | null;
  preserveActiveHeatCapacityModeSession: boolean;
  migrationModeCaptureOverrides?: readonly WorkbenchMigrationModeCaptureOverride[];
};

export interface WorkbenchArchivedNamespaceSnapshot {
  namespace: string;
  files: WorkbenchFileState[];
  closedFiles: WorkbenchFileState[];
}

export type WorkbenchActiveModeCheckpointOverride = {
  provided: true;
  fileId: string;
  mode: HeatCapacityMode;
  checkpoint: HeatCapacityModeUiCheckpoint | null;
};

export const createWorkbenchActiveModeCheckpointOverride = (
  fileId: string,
  mode: HeatCapacityMode,
  checkpoint: HeatCapacityModeUiCheckpoint | null,
): WorkbenchActiveModeCheckpointOverride => {
  if (checkpoint && (checkpoint.fileId !== fileId || checkpoint.mode !== mode)) {
    throw new Error('Active mode checkpoint override does not match its target file and mode.');
  }
  return { provided: true, fileId, mode, checkpoint };
};

export const resolveWorkbenchActiveModeCheckpointOverride = (
  fileId: string,
  mode: HeatCapacityMode,
  override: WorkbenchActiveModeCheckpointOverride | undefined,
): { provided: boolean; checkpoint: HeatCapacityModeUiCheckpoint | null } => (
  override?.provided === true && override.fileId === fileId && override.mode === mode
    ? { provided: true, checkpoint: override.checkpoint }
    : { provided: false, checkpoint: null }
);

export const assertWorkbenchHeatCapacityRefreshCheckpointMatchesMetadata = (
  checkpoint: HeatCapacityModeUiCheckpoint | null | undefined,
  metadata: {
    activeHeatCapacityFileId: string;
    mode: HeatCapacityMode;
    capturedAtMs: number;
  },
) => {
  if (
    !checkpoint ||
    checkpoint.fileId !== metadata.activeHeatCapacityFileId ||
    checkpoint.mode !== metadata.mode
  ) {
    throw new Error('Heat-capacity refresh metadata has no matching canonical mode checkpoint.');
  }
  if (checkpoint.capturedAtMs !== metadata.capturedAtMs) {
    throw new Error('Heat-capacity refresh metadata and canonical UI checkpoint have mismatched capture anchors.');
  }
};

export type WorkbenchPersistenceBootstrapResult = {
  namespace: string;
  migratedLegacyStorage: boolean;
  error: Error | null;
};

export type WorkbenchPersistenceInitializationStage =
  | 'starting'
  | 'preparing-storage'
  | 'opening-storage'
  | 'reading-workspace'
  | 'restoring-workspace'
  | 'migrating-workspace'
  | 'recovering-workspace'
  | 'preparing-workbench'
  | 'complete'
  | 'failed';

type WorkbenchPersistenceInitializationListener = (
  stage: WorkbenchPersistenceInitializationStage,
) => void;

let databasePromise: Promise<IDBDatabase> | null = null;
let activeNamespace = WORKBENCH_PERSISTENT_NAMESPACE;
let persistenceReady = false;
let temporaryNamespaceCleanupTimerId: number | null = null;
let initializationPromise: Promise<WorkbenchPersistenceBootstrapResult> | null = null;
let currentInitializationStage: WorkbenchPersistenceInitializationStage = 'starting';
const persistenceInitializationListeners = new Set<WorkbenchPersistenceInitializationListener>();
const persistenceWorkerClient = new WorkbenchPersistenceWorkerClient();
const expectedWorkspaceRevisionByNamespace = new Map<string, number | null>();
const retainedPersistenceV3StateByNamespace = new Map<
  string,
  WorkbenchPersistenceV3RetainedState
>();

const publishPersistenceInitializationStage = (
  stage: WorkbenchPersistenceInitializationStage,
) => {
  currentInitializationStage = stage;
  persistenceInitializationListeners.forEach((listener) => listener(stage));
};

export const subscribeWorkbenchPersistenceInitialization = (
  listener: WorkbenchPersistenceInitializationListener,
) => {
  persistenceInitializationListeners.add(listener);
  listener(currentInitializationStage);
  return () => {
    persistenceInitializationListeners.delete(listener);
  };
};

export class WorkbenchPersistenceConflictError extends Error {
  constructor(namespace: string) {
    super(`Workspace persistence conflict detected for namespace: ${namespace}. Reload this workspace before saving again.`);
    this.name = 'WorkbenchPersistenceConflictError';
  }
}

export class WorkbenchRefreshMetadataAnchorMismatchError extends Error {
  constructor() {
    super('IndexedDB refresh metadata and current mode session have mismatched capture anchors.');
    this.name = 'WorkbenchRefreshMetadataAnchorMismatchError';
  }
}

export const isWorkbenchRefreshMetadataAnchorRecoverySourceVersion = (
  appVersion: string,
) => appVersion === '5.1.2';

export const isWorkbenchWorkspaceRevisionCurrent = (
  expectedRevision: number | null,
  actualRevision: number | null,
) => expectedRevision === actualRevision;

export const isWorkbenchMigrationStateTransitionCurrent = (
  expectedRevision: number,
  expectedState: WorkbenchMigrationState,
  currentRevision: number,
  currentState: WorkbenchMigrationState,
  nextState: WorkbenchMigrationState,
) => (
  isWorkbenchWorkspaceRevisionCurrent(expectedRevision, currentRevision) &&
  expectedState === currentState &&
  (
    (currentState === 'pending-verification' && nextState === 'cleanup-pending') ||
    (currentState === 'cleanup-pending' && nextState === 'ready')
  )
);

export const getWorkbenchMigrationConflictRecoveryAction = (
  state: WorkbenchMigrationState | null,
): 'restore-ready' | 'wait' | 'fail' => {
  if (state === 'ready') return 'restore-ready';
  if (state === 'pending-verification' || state === 'cleanup-pending') return 'wait';
  return 'fail';
};

type CommittedWorkspaceSourceCache = {
  fileKeys: Set<string>;
  modeKeys: Set<string>;
  fileSources: Map<string, WeakRef<WorkbenchFileState>>;
  fileTokens: Map<string, string>;
  modeSources: Map<string, WeakRef<HeatCapacityModeSessionEntry>>;
  modeTokens: Map<string, string>;
};

const committedWorkspaceSources = new Map<string, CommittedWorkspaceSourceCache>();

const markPersistenceReady = () => {
  persistenceReady = true;
  scheduleTemporaryNamespaceCleanup();
};

const requestResult = <Value>(request: IDBRequest<Value>): Promise<Value> => new Promise((resolve, reject) => {
  request.addEventListener('success', () => resolve(request.result), { once: true });
  request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed.')), { once: true });
});

const transactionComplete = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.addEventListener('complete', () => resolve(), { once: true });
  transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.')), { once: true });
  transaction.addEventListener('error', () => reject(transaction.error ?? new Error('IndexedDB transaction failed.')), { once: true });
});

const openWorkbenchDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) return databasePromise;
  let cachedOpening: Promise<IDBDatabase>;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(WORKBENCH_INDEXED_DB_NAME, WORKBENCH_INDEXED_DB_VERSION);
    let settled = false;
    let blockedTimeoutId: number | null = null;
    const clearBlockedTimeout = () => {
      if (blockedTimeoutId === null) return;
      window.clearTimeout(blockedTimeoutId);
      blockedTimeoutId = null;
    };
    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(WORKBENCH_WORKSPACE_META_STORE)) {
        database.createObjectStore(WORKBENCH_WORKSPACE_META_STORE, { keyPath: 'namespace' });
      }
      if (!database.objectStoreNames.contains(WORKBENCH_FILES_STORE)) {
        database.createObjectStore(WORKBENCH_FILES_STORE, { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains(WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE)) {
        database.createObjectStore(WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE, { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains(WORKBENCH_PERSISTENCE_V3_GENERATION_HEAD_STORE)) {
        database.createObjectStore(WORKBENCH_PERSISTENCE_V3_GENERATION_HEAD_STORE, {
          keyPath: 'namespace',
        });
      }
      if (!database.objectStoreNames.contains(WORKBENCH_PERSISTENCE_V3_GENERATION_STORE)) {
        database.createObjectStore(WORKBENCH_PERSISTENCE_V3_GENERATION_STORE, {
          keyPath: 'key',
        });
      }
    });
    request.addEventListener('success', () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      settled = true;
      clearBlockedTimeout();
      database.addEventListener('versionchange', () => {
        database.close();
        if (databasePromise === cachedOpening) databasePromise = null;
      }, { once: true });
      resolve(database);
    }, { once: true });
    request.addEventListener('error', () => {
      if (settled) return;
      settled = true;
      clearBlockedTimeout();
      reject(request.error ?? new Error('Unable to open IndexedDB.'));
    }, { once: true });
    request.addEventListener('blocked', () => {
      console.warn('[Workbench persistence] IndexedDB upgrade is waiting for another app window to close.');
      if (settled || blockedTimeoutId !== null) return;
      blockedTimeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        blockedTimeoutId = null;
        reject(new Error(
          'IndexedDB upgrade is blocked by another app window. Close other Gas Laws Lab windows, then retry initialization.',
        ));
      }, WORKBENCH_INDEXED_DB_BLOCKED_TIMEOUT_MS);
    }, { once: true });
  });
  cachedOpening = opening.catch((error) => {
    if (databasePromise === cachedOpening) databasePromise = null;
    throw error;
  });
  databasePromise = cachedOpening;
  return cachedOpening;
};

const isFreshWorkbenchWindow = () => {
  try {
    return new URL(window.location.href).searchParams.get('hslFreshWindow') === '1';
  } catch {
    return false;
  }
};

const createTemporaryNamespace = () => {
  const suffix = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `temporary:${suffix}`;
};

const isExplicitWorkbenchNamespace = (value: string) => (
  value === WORKBENCH_PERSISTENT_NAMESPACE ||
  /^persistent:window:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
);

const resolveWorkbenchNamespace = () => {
  const explicitNamespace = new URL(window.location.href).searchParams.get(
    WORKBENCH_WINDOW_NAMESPACE_QUERY_PARAM,
  );
  if (explicitNamespace !== null) {
    if (!isExplicitWorkbenchNamespace(explicitNamespace)) {
      throw new Error('The requested workbench persistence namespace is invalid.');
    }
    return explicitNamespace;
  }
  if (!isFreshWorkbenchWindow()) return WORKBENCH_PERSISTENT_NAMESPACE;
  try {
    const restored = window.sessionStorage.getItem(WORKBENCH_TEMP_NAMESPACE_SESSION_KEY);
    if (restored?.startsWith('temporary:')) return restored;
    const created = createTemporaryNamespace();
    window.sessionStorage.setItem(WORKBENCH_TEMP_NAMESPACE_SESSION_KEY, created);
    return created;
  } catch (cause) {
    throw new Error('Temporary workspace namespace could not be stored for this window.', { cause });
  }
};

const fileRecordKey = (namespace: string, fileId: string) => `${namespace}|${fileId}`;
const modeRecordKey = (namespace: string, fileId: string, mode: HeatCapacityMode) => (
  `${namespace}|${fileId}|${mode}`
);

const getHeatCapacityPersistenceShellSeed = (fileId: string): number => {
  const legacyMatch = /^heatCapacity-(\d+)$/.exec(fileId);
  if (legacyMatch) {
    const legacyIndex = Number(legacyMatch[1]);
    if (Number.isSafeInteger(legacyIndex) && legacyIndex > 0) return legacyIndex;
  }
  let hash = 2_166_136_261;
  for (let index = 0; index < fileId.length; index += 1) {
    hash ^= fileId.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) + 1;
};

const isUniqueStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) &&
  value.every((item) => typeof item === 'string') &&
  new Set(value).size === value.length
);

const areWorkspaceFileIdentitiesValid = (
  openFileIds: unknown,
  closedFileIds: unknown,
  activeFileId: unknown,
) => {
  if (!isUniqueStringArray(openFileIds) || !isUniqueStringArray(closedFileIds)) return false;
  if (closedFileIds.some((fileId) => openFileIds.includes(fileId))) return false;
  return openFileIds.length === 0
    ? activeFileId === null
    : typeof activeFileId === 'string' && openFileIds.includes(activeFileId);
};

const assertDistinctWorkspaceFileCollections = (
  openFiles: WorkbenchFileState[],
  closedFiles: WorkbenchFileState[],
  activeFileId?: string,
) => {
  try {
    assertUniqueWorkbenchFileCollections(openFiles, closedFiles, activeFileId);
  } catch (cause) {
    const detail = cause instanceof Error ? ` ${cause.message}` : '';
    throw new Error(`Workspace persistence cannot save invalid file ownership.${detail}`);
  }
};

const areKeySetsEqual = (left: Set<string>, right: Set<string>) => (
  left.size === right.size && [...left].every((key) => right.has(key))
);

const getWorkspaceFileSourceToken = (file: WorkbenchFileState) => [
  file.kind,
  file.name,
  file.runState,
  file.createdAt,
  file.updatedAt,
  file.lastOpenedAt ?? null,
].join('|');

const getModeSessionSourceToken = (entry: HeatCapacityModeSessionEntry) => [
  entry.status,
  entry.capturedAtMs,
  entry.resumeRunState,
  entry.snapshot?.common.lastUpdateMs ?? null,
  entry.uiCheckpoint?.checkpointId ?? null,
  entry.uiCheckpoint?.capturedAtMs ?? null,
].join('|');

const MODE_OWNED_REFRESH_LAYOUT_KEYS = new Set([
  'runState',
  'guideChecklistViewedIndex',
  'pendingStrongReminderControlId',
  'pendingStrongReminderRemainingMs',
  'baseStrongReminderFileId',
  'baseStrongReminderControlId',
  'baseStrongReminderRemainingMs',
  'pumpAnimationFileId',
  'pumpAnimationReleaseRemainingMs',
  'pumpAnimationIdleRemainingMs',
  'cameraTransition',
  'ultraVisualState',
  'hardSphereVisualCheckpoint',
  'heatCapacityFocusSession',
]);

const createRefreshMetadata = (
  refreshSession: WorkbenchHeatCapacityRefreshSession | null,
): WorkbenchHeatCapacityRefreshMetadata | null => {
  const normalized = normalizeWorkbenchHeatCapacityRefreshSession(refreshSession);
  if (!normalized) return null;
  const layout = Object.fromEntries(
    Object.entries(normalized.ui.layout).filter(([key]) => !MODE_OWNED_REFRESH_LAYOUT_KEYS.has(key)),
  ) as HeatCapacityModeJsonObject;
  const drafts = Object.fromEntries(
    Object.entries(normalized.ui.drafts).filter(([key]) => key !== 'undoStack' && key !== 'redoStack'),
  ) as HeatCapacityModeJsonObject;
  const windows = Object.fromEntries(
    Object.entries(normalized.ui.windows).filter(([key]) => key !== 'lessonAutoResumeDemo'),
  ) as HeatCapacityModeJsonObject;
  return {
    activeHeatCapacityFileId: normalized.activeHeatCapacityFileId,
    mode: normalized.mode,
    checkpointId: normalized.checkpointId,
    capturedAtMs: normalized.capturedAtMs,
    modeTransition: normalized.modeTransition,
    modeTransitionDemoClock: normalized.modeTransitionDemoClock,
    ui: {
      windows,
      drafts,
      layout,
    },
    guideTransient: {
      toastQueue: normalized.guide.toastQueue,
      pressureAlarmVisible: normalized.guide.pressureAlarmVisible,
      pressureAlarmRemainingMs: normalized.guide.pressureAlarmRemainingMs,
    },
  };
};

export const attachLegacySceneSnapshotToRefreshBootstrap = (
  reconstructed: WorkbenchHeatCapacityRefreshSession | null,
  legacy: WorkbenchHeatCapacityRefreshSession | null,
): WorkbenchHeatCapacityRefreshSession | null => {
  if (
    !reconstructed ||
    reconstructed.sceneSnapshot ||
    !legacy?.sceneSnapshot ||
    reconstructed.activeHeatCapacityFileId !== legacy.activeHeatCapacityFileId ||
    reconstructed.mode !== legacy.mode ||
    reconstructed.checkpointId !== legacy.checkpointId
  ) {
    return reconstructed;
  }
  return {
    ...reconstructed,
    sceneSnapshot: legacy.sceneSnapshot,
  };
};

export const materializeWorkbenchHeatCapacityModeSessionsForPersistence = ({
  file,
  captureCurrentMode,
  uiCheckpoint,
  capturedAtMs,
}: {
  file: WorkbenchHeatCapacityState;
  captureCurrentMode: boolean;
  uiCheckpoint: HeatCapacityModeUiCheckpoint | null;
  capturedAtMs?: number;
}) => captureCurrentMode
  ? suspendHeatCapacityModeSession(file, uiCheckpoint, capturedAtMs).heatCapacityModeSessions
  : file.heatCapacityModeSessions;

const assertCanonicalHeatCapacityModeSessions = (
  modeSessions: WorkbenchHeatCapacityState['heatCapacityModeSessions'],
  fileId: string,
) => {
  const normalized = normalizeHeatCapacityModeSessionStore(modeSessions, fileId);
  if (!areCanonicalPersistenceValuesEqual(normalized, modeSessions)) {
    throw new Error(`Workspace persistence produced a non-canonical heat-capacity mode session: ${fileId}.`);
  }
};

const materializeMigrationActiveModeSessionForPersistence = ({
  file,
  override,
  uiCheckpoint,
  capturedAtMs,
}: {
  file: WorkbenchHeatCapacityState;
  override: WorkbenchMigrationModeCaptureOverride;
  uiCheckpoint: HeatCapacityModeUiCheckpoint | null;
  capturedAtMs: number;
}) => {
  if (
    (
      override.source !== 'legacy-4.2.3' &&
      override.source !== 'public-5.1.1-blank-demo'
    ) ||
    (
      override.source === 'public-5.1.1-blank-demo' &&
      override.mode !== 'demo'
    ) ||
    override.fileId !== file.id ||
    override.mode !== file.heatCapacityMode
  ) {
    throw new Error('Migration mode-capture override does not match its active heat-capacity file.');
  }
  assertCanonicalHeatCapacityModeSessions(file.heatCapacityModeSessions, file.id);
  const sourceEntry = file.heatCapacityModeSessions[override.mode];
  if (
    sourceEntry.status === 'empty' ||
    sourceEntry.snapshot === null ||
    sourceEntry.capturedAtMs !== override.capturedAtMs
  ) {
    throw new Error('Migration mode-capture override has no matching canonical source entry.');
  }
  if (capturedAtMs < override.capturedAtMs) {
    throw new Error('Migration mode-capture override cannot move its wall clock backwards.');
  }
  const restored = restoreHeatCapacityModeSession(file, override.mode, capturedAtMs);
  if (!restored) {
    throw new Error('Migration mode-capture override could not restore its canonical source entry.');
  }
  const modeSessions = suspendHeatCapacityModeSession(
    restored,
    uiCheckpoint,
    capturedAtMs,
  ).heatCapacityModeSessions;
  assertCanonicalHeatCapacityModeSessions(modeSessions, file.id);
  return modeSessions;
};

const createCanonicalModeRecords = (
  namespace: string,
  file: WorkbenchHeatCapacityState,
  activeModeCheckpoint: HeatCapacityModeUiCheckpoint | null,
  options: {
    captureCurrentMode: boolean;
    capturedAtMs?: number;
    migrationModeCaptureOverride?: WorkbenchMigrationModeCaptureOverride;
  },
): HeatCapacityModeSessionRecord[] => {
  const checkpoint = activeModeCheckpoint?.fileId === file.id &&
    activeModeCheckpoint.mode === file.heatCapacityMode
    ? activeModeCheckpoint
    : file.heatCapacityModeSessions[file.heatCapacityMode].uiCheckpoint;
  const modeSessions = options.captureCurrentMode && options.migrationModeCaptureOverride
    ? materializeMigrationActiveModeSessionForPersistence({
        file,
        override: options.migrationModeCaptureOverride,
        uiCheckpoint: checkpoint,
        capturedAtMs: options.capturedAtMs ?? Date.now(),
      })
    : materializeWorkbenchHeatCapacityModeSessionsForPersistence({
        file,
        captureCurrentMode: options.captureCurrentMode,
        uiCheckpoint: checkpoint,
        capturedAtMs: options.capturedAtMs,
      });
  assertCanonicalHeatCapacityModeSessions(modeSessions, file.id);
  return (['demo', 'guide', 'free'] as const).map((mode) => ({
    schemaFamily: MODE_RECORD_SCHEMA_FAMILY,
    key: modeRecordKey(namespace, file.id, mode),
    namespace,
    fileId: file.id,
    mode,
    entry: modeSessions[mode],
  }));
};

export const createPersistenceRecords = (
  namespace: string,
  snapshot: WorkbenchWorkspacePersistenceSnapshot,
  migrationState: WorkspaceMetaRecord['migrationState'] = 'ready',
) => {
  const savedAtMs = Date.now();
  assertDistinctWorkspaceFileCollections(snapshot.files, snapshot.closedFiles, snapshot.activeFileId);
  if (!isWorkbenchPanelKey(snapshot.selectedPanel)) {
    throw new Error('Workspace persistence cannot save an invalid selected panel.');
  }
  if (
    (snapshot.files.length > 0 && !snapshot.files.some((file) => file.id === snapshot.activeFileId)) ||
    (snapshot.files.length === 0 && snapshot.activeFileId !== '')
  ) {
    throw new Error('Workspace persistence cannot save an invalid active file identity.');
  }
  const activeHeatCapacityFile = snapshot.files.find((file): file is WorkbenchHeatCapacityState => (
    file.id === snapshot.activeFileId && file.kind === 'heatCapacity'
  ));
  if (
    snapshot.activeModeCheckpoint &&
    (
      !activeHeatCapacityFile ||
      snapshot.activeModeCheckpoint.fileId !== activeHeatCapacityFile.id ||
      snapshot.activeModeCheckpoint.mode !== activeHeatCapacityFile.heatCapacityMode
    )
  ) {
    throw new Error('Workspace persistence cannot save an orphaned active mode checkpoint.');
  }
  const refreshMetadata = createRefreshMetadata(snapshot.refreshSession);
  if (
    refreshMetadata &&
    (
      !activeHeatCapacityFile ||
      refreshMetadata.activeHeatCapacityFileId !== activeHeatCapacityFile.id ||
      refreshMetadata.mode !== activeHeatCapacityFile.heatCapacityMode
    )
  ) {
    throw new Error('Workspace persistence cannot save refresh metadata for a different active mode.');
  }
  if (snapshot.preserveActiveHeatCapacityModeSession) {
    if (!activeHeatCapacityFile || !refreshMetadata || snapshot.activeModeCheckpoint !== null) {
      throw new Error('Workspace persistence cannot preserve an active mode without matching refresh metadata.');
    }
    const preservedEntry = activeHeatCapacityFile.heatCapacityModeSessions[activeHeatCapacityFile.heatCapacityMode];
    if (
      preservedEntry.capturedAtMs !== refreshMetadata.capturedAtMs ||
      preservedEntry.status === 'empty' ||
      preservedEntry.snapshot === null
    ) {
      throw new Error('Workspace persistence cannot preserve mismatched refresh and mode-session anchors.');
    }
  }
  if (refreshMetadata) {
    const refreshSourceCheckpoint = snapshot.activeModeCheckpoint ??
      activeHeatCapacityFile?.heatCapacityModeSessions[
        activeHeatCapacityFile.heatCapacityMode
      ].uiCheckpoint ??
      null;
    assertWorkbenchHeatCapacityRefreshCheckpointMatchesMetadata(
      refreshSourceCheckpoint,
      refreshMetadata,
    );
  }
  const allFiles = [...snapshot.files, ...snapshot.closedFiles];
  const migrationModeCaptureOverrides = snapshot.migrationModeCaptureOverrides ?? [];
  if (
    migrationModeCaptureOverrides.length > 0 &&
    migrationState !== 'pending-verification'
  ) {
    throw new Error('Migration mode capture is only valid during pending migration verification.');
  }
  if (snapshot.preserveActiveHeatCapacityModeSession && migrationModeCaptureOverrides.length > 0) {
    throw new Error('Workspace persistence cannot combine refresh preservation with migration mode capture.');
  }
  const migrationModeCaptureOverrideByFileId = new Map<
    string,
    WorkbenchMigrationModeCaptureOverride
  >();
  for (const override of migrationModeCaptureOverrides) {
    if (migrationModeCaptureOverrideByFileId.has(override.fileId)) {
      throw new Error(`Workspace persistence received duplicate migration mode capture: ${override.fileId}.`);
    }
    const file = allFiles.find((candidate) => candidate.id === override.fileId);
    if (
      (
        override.source !== 'legacy-4.2.3' &&
        override.source !== 'public-5.1.1-blank-demo'
      ) ||
      (
        override.source === 'public-5.1.1-blank-demo' &&
        override.mode !== 'demo'
      ) ||
      !file ||
      file.kind !== 'heatCapacity' ||
      file.heatCapacityMode !== override.mode ||
      file.heatCapacityModeSessions[override.mode].capturedAtMs !== override.capturedAtMs
    ) {
      throw new Error(`Workspace persistence received an invalid migration mode capture: ${override.fileId}.`);
    }
    migrationModeCaptureOverrideByFileId.set(override.fileId, override);
  }
  const fileRecords: WorkspaceFileRecord[] = allFiles.map((file) => ({
    schemaFamily: FILE_RECORD_SCHEMA_FAMILY,
    key: fileRecordKey(namespace, file.id),
    namespace,
    fileId: file.id,
    state: createWorkbenchSessionFromRuntimeFiles({
      files: [file.kind === 'heatCapacity'
        ? createHeatCapacityModeRuntimeShell(
            file,
            createDefaultHeatCapacityFile(getHeatCapacityPersistenceShellSeed(file.id)),
          )
        : file],
      activeFileId: file.id,
      selectedPanel: 'preview',
    }).files[0]!,
  }));
  const modeRecords = allFiles.flatMap((file) => {
    if (file.kind !== 'heatCapacity') return [];
    const activeModeFile = file.id === snapshot.activeFileId;
    return createCanonicalModeRecords(namespace, file, snapshot.activeModeCheckpoint, {
      captureCurrentMode: activeModeFile && !snapshot.preserveActiveHeatCapacityModeSession,
      capturedAtMs: activeModeFile
        ? refreshMetadata?.capturedAtMs ?? savedAtMs
        : undefined,
      migrationModeCaptureOverride: activeModeFile
        ? migrationModeCaptureOverrideByFileId.get(file.id)
        : undefined,
    });
  });
  if (refreshMetadata) {
    const refreshModeRecord = modeRecords.find((record) => (
      record.fileId === refreshMetadata.activeHeatCapacityFileId &&
      record.mode === refreshMetadata.mode
    ));
    const refreshModeCheckpoint = refreshModeRecord?.entry.uiCheckpoint;
    if (!refreshModeRecord) {
      throw new Error('Workspace persistence cannot save refresh metadata without a canonical mode record.');
    }
    assertWorkbenchHeatCapacityRefreshCheckpointMatchesMetadata(
      refreshModeCheckpoint,
      refreshMetadata,
    );
  }
  const meta: WorkspaceMetaRecord = {
    schemaFamily: WORKSPACE_SCHEMA_FAMILY,
    schemaVersion: 2,
    namespace,
    appVersion: __APP_VERSION__,
    savedAtMs,
    lastSuccessfulSaveAtMs: savedAtMs,
    migrationState,
    activeFileId: snapshot.files.length > 0 ? snapshot.activeFileId : null,
    selectedPanel: snapshot.selectedPanel,
    openFileIds: snapshot.files.map((file) => file.id),
    closedFileIds: snapshot.closedFiles.map((file) => file.id),
    refreshMetadata,
  };
  return { meta, fileRecords, modeRecords };
};

const deleteStaleNamespaceRecords = async (
  store: IDBObjectStore,
  namespace: string,
  retainedKeys: Set<IDBValidKey>,
) => {
  const keys = await requestResult(store.getAllKeys());
  for (const key of keys) {
    if (typeof key === 'string' && key.startsWith(`${namespace}|`) && !retainedKeys.has(key)) {
      store.delete(key);
    }
  }
};

const writeWorkbenchWorkspaceToIndexedDb = async (
  database: IDBDatabase,
  namespace: string,
  snapshot: WorkbenchWorkspacePersistenceSnapshot,
  migrationState: WorkspaceMetaRecord['migrationState'] = 'ready',
  preparedRecords: ReturnType<typeof createPersistenceRecords> | null = null,
  expectedRevision: number | null | undefined = undefined,
) => {
  const records = preparedRecords ?? createPersistenceRecords(namespace, snapshot, migrationState);
  const sourceFiles = [...snapshot.files, ...snapshot.closedFiles];
  const sourceFileById = new Map(sourceFiles.map((file) => [file.id, file]));
  const previousSources = committedWorkspaceSources.get(namespace);
  const fileKeys = new Set(records.fileRecords.map((record) => record.key));
  const modeKeys = new Set(records.modeRecords.map((record) => record.key));
  const fileRecordsToWrite = records.fileRecords.filter((record) => {
    const source = sourceFileById.get(record.fileId)!;
    const newFileIdentity = !previousSources?.fileKeys.has(record.key);
    return (
      !previousSources ||
      newFileIdentity ||
      record.fileId === snapshot.activeFileId ||
      previousSources.fileSources.get(record.key)?.deref() !== source ||
      previousSources.fileTokens.get(record.key) !== getWorkspaceFileSourceToken(source)
    );
  });
  const modeRecordsToWrite = records.modeRecords.filter((record) => {
    const sourceFile = sourceFileById.get(record.fileId);
    if (!sourceFile || sourceFile.kind !== 'heatCapacity') return true;
    const sourceFileKey = fileRecordKey(namespace, sourceFile.id);
    const newFileIdentity = !previousSources?.fileKeys.has(sourceFileKey);
    const sourceEntry = sourceFile.heatCapacityModeSessions[record.mode];
    const activeModeRecord = sourceFile.id === snapshot.activeFileId &&
      sourceFile.heatCapacityMode === record.mode;
    const currentModeSourceChanged = sourceFile.heatCapacityMode === record.mode && (
      !previousSources ||
      previousSources.fileSources.get(fileRecordKey(namespace, sourceFile.id))?.deref() !== sourceFile ||
      previousSources.fileTokens.get(fileRecordKey(namespace, sourceFile.id)) !==
        getWorkspaceFileSourceToken(sourceFile)
    );
    return (
      !previousSources ||
      newFileIdentity ||
      activeModeRecord ||
      currentModeSourceChanged ||
      previousSources.modeSources.get(record.key)?.deref() !== sourceEntry ||
      previousSources.modeTokens.get(record.key) !== getModeSessionSourceToken(sourceEntry)
    );
  });
  const transaction = database.transaction(
    [
      WORKBENCH_WORKSPACE_META_STORE,
      WORKBENCH_FILES_STORE,
      WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE,
    ],
    'readwrite',
    { durability: 'strict' },
  );
  const completed = transactionComplete(transaction);
  const metaStore = transaction.objectStore(WORKBENCH_WORKSPACE_META_STORE);
  const currentMetaValue = await requestResult(metaStore.get(namespace));
  const currentMeta = currentMetaValue === undefined
    ? null
    : normalizeWorkbenchWorkspaceMetaRecord(currentMetaValue);
  const currentRevision = currentMeta?.lastSuccessfulSaveAtMs ?? null;
  if (currentMetaValue !== undefined && currentRevision === null) {
    transaction.abort();
    await completed.catch(() => undefined);
    throw new Error(`IndexedDB workspace metadata is invalid for namespace: ${namespace}.`);
  }
  if (
    expectedRevision !== undefined &&
    !isWorkbenchWorkspaceRevisionCurrent(expectedRevision, currentRevision)
  ) {
    transaction.abort();
    await completed.catch(() => undefined);
    throw new WorkbenchPersistenceConflictError(namespace);
  }
  records.meta = advanceWorkbenchWorkspaceMetaRevision(records.meta, currentRevision);
  const fileStore = transaction.objectStore(WORKBENCH_FILES_STORE);
  const modeStore = transaction.objectStore(WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE);
  if (!previousSources || !areKeySetsEqual(previousSources.fileKeys, fileKeys)) {
    await deleteStaleNamespaceRecords(fileStore, namespace, fileKeys);
  }
  if (!previousSources || !areKeySetsEqual(previousSources.modeKeys, modeKeys)) {
    await deleteStaleNamespaceRecords(modeStore, namespace, modeKeys);
  }
  fileRecordsToWrite.forEach((record) => fileStore.put(record));
  modeRecordsToWrite.forEach((record) => modeStore.put(record));
  metaStore.put(records.meta);
  await completed;
  committedWorkspaceSources.set(namespace, {
    fileKeys,
    modeKeys,
    fileSources: new Map(sourceFiles.map((file) => [
      fileRecordKey(namespace, file.id),
      new WeakRef(file),
    ])),
    fileTokens: new Map(sourceFiles.map((file) => [
      fileRecordKey(namespace, file.id),
      getWorkspaceFileSourceToken(file),
    ])),
    modeSources: new Map(sourceFiles.flatMap((file) => file.kind === 'heatCapacity'
      ? (['demo', 'guide', 'free'] as const).map((mode) => [
          modeRecordKey(namespace, file.id, mode),
          new WeakRef(file.heatCapacityModeSessions[mode]),
        ] as const)
      : [])),
    modeTokens: new Map(sourceFiles.flatMap((file) => file.kind === 'heatCapacity'
      ? (['demo', 'guide', 'free'] as const).map((mode) => [
          modeRecordKey(namespace, file.id, mode),
          getModeSessionSourceToken(file.heatCapacityModeSessions[mode]),
        ] as const)
      : [])),
  });
  return records;
};

const createPersistenceV3GenerationId = (capturedAtMs: number) => {
  const suffix = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${capturedAtMs}-${suffix}`;
};

export const materializePersistenceV3Snapshot = (
  snapshot: WorkbenchWorkspacePersistenceSnapshot,
  capturedAtMs: number,
) => ({
  files: snapshot.files.map((file) => {
    if (
      file.kind !== 'heatCapacity' ||
      file.id !== snapshot.activeFileId ||
      file.heatCapacityMode === null ||
      snapshot.preserveActiveHeatCapacityModeSession
    ) {
      return file;
    }
    const uiCheckpoint = snapshot.activeModeCheckpoint ??
      file.heatCapacityModeSessions[file.heatCapacityMode].uiCheckpoint;
    return {
      ...file,
      heatCapacityModeSessions:
        materializeWorkbenchHeatCapacityModeSessionsForPersistence({
          file,
          captureCurrentMode: true,
          uiCheckpoint,
          capturedAtMs:
            snapshot.refreshSession?.capturedAtMs ?? capturedAtMs,
        }),
    };
  }),
  closedFiles: snapshot.closedFiles,
  activeFileId: snapshot.activeFileId,
  selectedPanel: snapshot.selectedPanel,
});

const isWorkbenchPersistenceQuotaExceededError = (
  cause: unknown,
) => (
  typeof cause === 'object' &&
  cause !== null &&
  'name' in cause &&
  cause.name === 'QuotaExceededError'
);

const commitWorkbenchPersistenceV3WithQuotaRecovery = async ({
  store,
  namespace,
  generationId,
  capturedAtMs,
  snapshot,
  retained,
}: {
  store: IndexedDbWorkbenchPersistenceV3GenerationStore;
  namespace: string;
  generationId: string;
  capturedAtMs: number;
  snapshot: ReturnType<typeof materializePersistenceV3Snapshot>;
  retained: WorkbenchPersistenceV3RetainedState;
}) => {
  try {
    return await commitWorkbenchPersistenceV3ProductionSnapshot({
      store,
      namespace,
      generationId,
      capturedAtMs,
      snapshot,
      retained,
    });
  } catch (cause) {
    if (!isWorkbenchPersistenceQuotaExceededError(cause)) throw cause;
    const head = await store.readHead(namespace);
    await store.pruneGenerations(namespace, {
      retainGenerationIds: [
        head.currentGenerationId,
        head.previousGenerationId,
      ].filter((value): value is string => value !== null),
    });
    return commitWorkbenchPersistenceV3ProductionSnapshot({
      store,
      namespace,
      generationId,
      capturedAtMs,
      snapshot,
      retained,
    });
  }
};

const waitForWorkbenchPersistenceIdle = () => new Promise<void>((resolve) => {
  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(() => resolve(), { timeout: 2_000 });
    return;
  }
  globalThis.setTimeout(resolve, 0);
});

export const saveWorkbenchWorkspaceToIndexedDb = async (
  snapshot: WorkbenchWorkspacePersistenceSnapshot,
): Promise<void> => {
  if (!persistenceReady) {
    throw new Error(
      'IndexedDB persistence is not ready; the last successful workspace remains unchanged.',
    );
  }
  const capturedAtMs = Date.now();
  const namespace = activeNamespace;
  const generationId = createPersistenceV3GenerationId(capturedAtMs);
  const productionSnapshot = materializePersistenceV3Snapshot(
    snapshot,
    capturedAtMs,
  );
  const retained = retainedPersistenceV3StateByNamespace.get(namespace) ??
    createEmptyWorkbenchPersistenceV3RetainedState();
  let committedRetained: WorkbenchPersistenceV3RetainedState | null = null;
  if (persistenceWorkerClient.isSupported()) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        committedRetained = await persistenceWorkerClient.save({
          type: 'save',
          requestId: generationId,
          namespace,
          generationId,
          capturedAtMs,
          snapshot: productionSnapshot,
          retained,
        });
        break;
      } catch (cause) {
        if (!(cause instanceof WorkbenchPersistenceWorkerTransportError)) {
          throw cause;
        }
        persistenceWorkerClient.restart();
        if (attempt === 0) continue;
        console.warn(
          '[Workbench persistence] Worker transport failed twice; using the bounded main-thread fallback.',
          cause,
        );
      }
    }
  }
  if (committedRetained === null) {
    await waitForWorkbenchPersistenceIdle();
    const database = await openWorkbenchDatabase();
    const store = new IndexedDbWorkbenchPersistenceV3GenerationStore(database);
    const committed = await commitWorkbenchPersistenceV3WithQuotaRecovery({
      store,
      namespace,
      generationId,
      capturedAtMs,
      snapshot: productionSnapshot,
      retained,
    });
    committedRetained = committed.retained;
  }
  retainedPersistenceV3StateByNamespace.set(
    namespace,
    committedRetained,
  );
};

const normalizeWorkspaceRefreshMetadata = (
  value: unknown,
): WorkbenchHeatCapacityRefreshMetadata | null => {
  if (value === null) return null;
  if (
    !isPersistenceRecord(value) ||
    typeof value.activeHeatCapacityFileId !== 'string' ||
    (
      value.mode !== 'demo' &&
      value.mode !== 'guide' &&
      value.mode !== 'free'
    ) ||
    typeof value.checkpointId !== 'string' ||
    typeof value.capturedAtMs !== 'number' ||
    !Number.isFinite(value.capturedAtMs) ||
    !isPersistenceRecord(value.modeTransition) ||
    !(
      value.modeTransitionDemoClock === null ||
      isPersistenceRecord(value.modeTransitionDemoClock)
    ) ||
    !isPersistenceRecord(value.ui) ||
    !isPersistenceRecord(value.ui.windows) ||
    !isPersistenceRecord(value.ui.drafts) ||
    !isPersistenceRecord(value.ui.layout) ||
    !isPersistenceRecord(value.guideTransient)
  ) return null;
  return value as unknown as WorkbenchHeatCapacityRefreshMetadata;
};

export const normalizeWorkbenchWorkspaceMetaRecord = (value: unknown): WorkspaceMetaRecord | null => {
  if (!isPersistenceRecord(value)) return null;
  const hasOpenFileIds = Object.prototype.hasOwnProperty.call(value, 'openFileIds');
  const hasClosedFileIds = Object.prototype.hasOwnProperty.call(value, 'closedFileIds');
  const legacyFileIds = !hasOpenFileIds && isUniqueStringArray(value.fileIds)
    ? value.fileIds
    : null;
  const openFileIds = hasOpenFileIds ? value.openFileIds : legacyFileIds;
  const closedFileIds = hasClosedFileIds ? value.closedFileIds : [];
  const activeFileId = Array.isArray(openFileIds) && openFileIds.length === 0 && value.activeFileId === ''
    ? null
    : value.activeFileId;
  if (
    value.schemaFamily !== WORKSPACE_SCHEMA_FAMILY ||
    value.schemaVersion !== 2 ||
    typeof value.namespace !== 'string' ||
    typeof value.appVersion !== 'string' ||
    typeof value.savedAtMs !== 'number' ||
    !Number.isSafeInteger(value.savedAtMs) ||
    value.savedAtMs < 0 ||
    (typeof activeFileId !== 'string' && activeFileId !== null) ||
    !areWorkspaceFileIdentitiesValid(openFileIds, closedFileIds, activeFileId)
  ) return null;
  const hasStoredRevision = Object.prototype.hasOwnProperty.call(value, 'lastSuccessfulSaveAtMs');
  const lastSuccessfulSaveAtMs = hasStoredRevision
    ? value.lastSuccessfulSaveAtMs
    : value.savedAtMs;
  if (
    typeof lastSuccessfulSaveAtMs !== 'number' ||
    !Number.isSafeInteger(lastSuccessfulSaveAtMs) ||
    lastSuccessfulSaveAtMs < value.savedAtMs
  ) return null;
  const hasStoredMigrationState = Object.prototype.hasOwnProperty.call(value, 'migrationState');
  const migrationState = hasStoredMigrationState ? value.migrationState : 'ready';
  if (
    migrationState !== 'ready' &&
    migrationState !== 'pending-verification' &&
    migrationState !== 'cleanup-pending'
  ) return null;
  const hasStoredRefreshMetadata = Object.prototype.hasOwnProperty.call(value, 'refreshMetadata');
  const hasCurrentRevisionMetadata = hasStoredRevision || hasStoredMigrationState;
  if (
    hasCurrentRevisionMetadata &&
    (!hasStoredRevision || !hasStoredMigrationState || !hasStoredRefreshMetadata)
  ) return null;
  const refreshMetadata = hasStoredRefreshMetadata
    ? normalizeWorkspaceRefreshMetadata(value.refreshMetadata)
    : null;
  const allowsLegacyOptionalRefreshMetadata = !hasStoredRevision && !hasStoredMigrationState;
  if (
    hasStoredRefreshMetadata &&
    value.refreshMetadata !== null &&
    refreshMetadata === null &&
    !allowsLegacyOptionalRefreshMetadata
  ) return null;
  return {
    ...value,
    activeFileId,
    selectedPanel: isWorkbenchPanelKey(value.selectedPanel) ? value.selectedPanel : 'preview',
    openFileIds,
    closedFileIds,
    refreshMetadata,
    lastSuccessfulSaveAtMs,
    migrationState,
  } as WorkspaceMetaRecord;
};

const hasWorkspaceFileRecordIdentity = (
  value: unknown,
  namespace: string,
  fileId: string,
): value is Record<string, unknown> => (
  isPersistenceRecord(value) &&
  value.schemaFamily === FILE_RECORD_SCHEMA_FAMILY &&
  value.namespace === namespace &&
  value.fileId === fileId &&
  value.key === fileRecordKey(namespace, fileId)
);

const isCurrentWorkspaceFileRecord = (
  value: unknown,
  namespace: string,
  fileId: string,
): value is WorkspaceFileRecord => (
  hasWorkspaceFileRecordIdentity(value, namespace, fileId) &&
  isPersistenceRecord(value.state) &&
  value.state.id === fileId &&
  (
    value.state.kind === 'standard' ||
    value.state.kind === 'ideal' ||
    value.state.kind === 'heatCapacity' ||
    value.state.kind === 'heatCapacityPistonOscillation'
  ) &&
  (
    value.state.kind === 'heatCapacity' ||
    isCanonicalStandardOrIdealWorkspaceFile(value.state) ||
    isCanonicalPistonOscillationWorkspaceFile(value.state)
  ) &&
  (() => {
    try {
      const normalized = createWorkbenchSessionFromRuntimeFiles({
        files: [value.state as unknown as WorkbenchFileState],
        activeFileId: fileId,
        selectedPanel: 'preview',
      }).files[0];
      return areCanonicalPersistenceValuesEqual(normalized, value.state);
    } catch {
      return false;
    }
  })()
);

const isCompatibleLegacyHeatCapacityWorkspaceStateRecord = (
  value: unknown,
  namespace: string,
  fileId: string,
) => (
  hasWorkspaceFileRecordIdentity(value, namespace, fileId) &&
  isPersistenceRecord(value.state) &&
  value.state.id === fileId &&
  value.state.kind === 'heatCapacity' &&
  (
    value.state.heatCapacityFreeTraceVersion === 4 ||
    value.state.heatCapacityFreeTraceVersion === 5
  )
);

const hasExactPersistenceKeys = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) => {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return areCanonicalPersistenceValuesEqual(actualKeys, sortedExpectedKeys);
};

const restoreLegacyIndexedDbHeatCapacityShell = (
  value: unknown,
  fileId: string,
): WorkbenchHeatCapacityState | null => {
  if (
    !isWorkbenchExperimentFileEnvelope(value) ||
    value.kind !== 'heatCapacity' ||
    value.id !== fileId ||
    value.name.trim().length === 0
  ) return null;
  const payload = value.payload;
  const common = isPersistenceRecord(payload.common) ? payload.common : null;
  if (
    !hasExactPersistenceKeys(payload, [
      'experimentKind',
      'heatCapacitySchemaVersion',
      'mode',
      'common',
      'free',
      'guided',
      'demo',
    ]) ||
    payload.experimentKind !== 'heatCapacity' ||
    payload.heatCapacitySchemaVersion !== HEAT_CAPACITY_SCHEMA_VERSION ||
    (payload.mode !== 'demo' && payload.mode !== 'guide' && payload.mode !== 'free') ||
    payload.free !== null ||
    payload.guided !== null ||
    payload.demo !== null ||
    !common ||
    !hasExactPersistenceKeys(common, [
      'materialsExpanded',
      'teachingStatus',
      'openHeatCapacityTabs',
      'activeHeatCapacityTabId',
      'experimentSeed',
      'experimentProfile',
      'lessonIntroAutoShown',
      'modeSessions',
    ]) ||
    (
      common.teachingStatus !== 'idle' &&
      common.teachingStatus !== 'running' &&
      common.teachingStatus !== 'completed'
    ) ||
    common.experimentSeed !== null ||
    common.experimentProfile !== null
  ) return null;
  const modeSessions = normalizeHeatCapacityModeSessionStore(common.modeSessions, fileId);
  if (
    !areCanonicalPersistenceValuesEqual(common.modeSessions, modeSessions) ||
    (['demo', 'guide', 'free'] as const).some((mode) => (
      modeSessions[mode].status !== 'empty' ||
      modeSessions[mode].snapshot !== null ||
      modeSessions[mode].uiCheckpoint !== null
    ))
  ) return null;
  const restored = restoreHeatCapacityFileFromPersistencePayload(value, payload, 1);
  const shell = createHeatCapacityModeRuntimeShell(restored, createDefaultHeatCapacityFile(1));
  const canonicalPayload = createHeatCapacityPersistencePayload(shell, value.updatedAt);
  const canonicalEnvelope = encodeWorkbenchClosedFilesStorageEnvelope([shell], value.updatedAt).files[0];
  const shellMetadataKeys = [
    'materialsExpanded',
    'openHeatCapacityTabs',
    'activeHeatCapacityTabId',
    'lessonIntroAutoShown',
    'modeSessions',
  ] as const;
  if (
    !canonicalEnvelope ||
    !shellMetadataKeys.every((key) => (
      areCanonicalPersistenceValuesEqual(common[key], canonicalPayload.common[key])
    )) ||
    !areCanonicalPersistenceValuesEqual(value.layout, canonicalEnvelope.layout)
  ) return null;
  return shell;
};

export const normalizeWorkbenchWorkspaceFileRecord = (
  value: unknown,
  namespace: string,
  fileId: string,
): WorkspaceFileRecord | null => {
  if (isCurrentWorkspaceFileRecord(value, namespace, fileId)) return value;
  if (isCompatibleLegacyHeatCapacityWorkspaceStateRecord(
    value,
    namespace,
    fileId,
  )) {
    try {
      const legacyRecord = value as Record<string, unknown> & {
        state: WorkbenchHeatCapacityState;
      };
      const state = createWorkbenchSessionFromRuntimeFiles({
        files: [legacyRecord.state],
        activeFileId: fileId,
        selectedPanel: 'preview',
      }).files[0];
      if (state?.kind === 'heatCapacity' && state.id === fileId) {
        const normalized: WorkspaceFileRecord = {
          schemaFamily: FILE_RECORD_SCHEMA_FAMILY,
          key: fileRecordKey(namespace, fileId),
          namespace,
          fileId,
          state,
        };
        if (isCurrentWorkspaceFileRecord(normalized, namespace, fileId)) {
          return normalized;
        }
      }
    } catch {
      // Preserve and quarantine legacy state that cannot be migrated safely.
    }
  }
  if (
    hasWorkspaceFileRecordIdentity(value, namespace, fileId) &&
    isPersistenceRecord(value.state) &&
    value.state.id === fileId &&
    value.state.kind === 'heatCapacity' &&
    typeof value.state.name === 'string'
  ) {
    const normalizedName = normalizeHeatCapacityFileName(value.state.name);
    if (normalizedName !== value.state.name) {
      const normalized = {
        schemaFamily: FILE_RECORD_SCHEMA_FAMILY,
        key: fileRecordKey(namespace, fileId),
        namespace,
        fileId,
        state: {
          ...value.state,
          name: normalizedName,
        },
      };
      if (isCurrentWorkspaceFileRecord(normalized, namespace, fileId)) return normalized;
    }
  }
  if (
    !hasWorkspaceFileRecordIdentity(value, namespace, fileId) ||
    Object.prototype.hasOwnProperty.call(value, 'state') ||
    !Object.prototype.hasOwnProperty.call(value, 'envelope')
  ) return null;
  const decoded = decodeWorkbenchClosedFilesStorageEnvelope({
    schemaFamily: WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
    schemaVersion: WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
    appVersion: 'legacy-indexeddb-v2',
    savedAt: 0,
    files: [value.envelope],
  });
  const decodedFile = decoded.handled &&
    decoded.diagnostics.length === 0 &&
    decoded.files.length === 1 &&
    decoded.files[0]?.id === fileId
    ? decoded.files[0]
    : restoreLegacyIndexedDbHeatCapacityShell(value.envelope, fileId);
  if (!decodedFile) return null;
  const normalized: WorkspaceFileRecord = {
    schemaFamily: FILE_RECORD_SCHEMA_FAMILY,
    key: fileRecordKey(namespace, fileId),
    namespace,
    fileId,
    state: decodedFile,
  };
  return isCurrentWorkspaceFileRecord(normalized, namespace, fileId) ? normalized : null;
};

const isHeatCapacityModeSessionRecord = (
  value: unknown,
  namespace: string,
  fileId: string,
  mode: HeatCapacityMode,
): value is HeatCapacityModeSessionRecord => (
  isPersistenceRecord(value) &&
  value.schemaFamily === MODE_RECORD_SCHEMA_FAMILY &&
  value.namespace === namespace &&
  value.fileId === fileId &&
  value.mode === mode &&
  value.key === modeRecordKey(namespace, fileId, mode) &&
  isPersistenceRecord(value.entry) && (() => {
    const normalized = normalizeHeatCapacityModeSessionStore({
      schemaVersion: 2,
      [mode]: value.entry,
    }, fileId)[mode];
    return areCanonicalPersistenceValuesEqual(normalized, value.entry);
  })()
);

const hasHeatCapacityModeSessionRecordIdentity = (
  value: unknown,
  namespace: string,
  fileId: string,
  mode: HeatCapacityMode,
) => isPersistenceRecord(value) &&
  value.schemaFamily === MODE_RECORD_SCHEMA_FAMILY &&
  value.namespace === namespace &&
  value.fileId === fileId &&
  value.mode === mode &&
  value.key === modeRecordKey(namespace, fileId, mode) &&
  isPersistenceRecord(value.entry);

const createLegacyGuideReleaseProjection = (
  physicsState: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState'],
  storedReleaseState: HeatCapacityReleaseState,
): HeatCapacityReleaseState => {
  const openedAtS = physicsState.lastStopcockOpenedAtS;
  const closedAtS = physicsState.lastStopcockClosedAtS;
  if (openedAtS === null) return createClosedHeatCapacityReleaseState(physicsState.simulationTimeS);
  const flowOpen = closedAtS === null || openedAtS >= closedAtS;
  const formedRelease = physicsState.releaseStarted;
  if (flowOpen) {
    return {
      phase: formedRelease ? 'releasing' : 'open',
      purpose: formedRelease ? 'release' : 'zeroing',
      attemptId: Math.max(1, storedReleaseState.attemptId),
      phaseStartedAtS: openedAtS,
      openingStartedAtS: openedAtS,
      openingCompletedAtS: openedAtS,
      closeCommandAtS: null,
      closingCompletedAtS: null,
      releaseDurationS: formedRelease
        ? Math.max(0, physicsState.simulationTimeS - openedAtS)
        : 0,
      formedRelease,
      quickToggle: false,
    };
  }
  if (!formedRelease || closedAtS === null) {
    return createClosedHeatCapacityReleaseState(closedAtS ?? physicsState.simulationTimeS);
  }
  return {
    phase: 'closedAfterRelease',
    purpose: 'release',
    attemptId: Math.max(1, storedReleaseState.attemptId),
    phaseStartedAtS: closedAtS,
    openingStartedAtS: openedAtS,
    openingCompletedAtS: openedAtS,
    closeCommandAtS: closedAtS,
    closingCompletedAtS: closedAtS,
    releaseDurationS: Math.max(0, closedAtS - openedAtS),
    formedRelease: true,
    quickToggle: false,
  };
};

const reprojectLegacyGuideModeSessionEntry = (
  file: WorkbenchHeatCapacityState,
  mode: Exclude<HeatCapacityMode, 'free'>,
  entry: HeatCapacityModeSessionEntry,
): HeatCapacityModeSessionEntry | null => {
  const snapshot = entry.snapshot;
  if (!snapshot || snapshot.mode !== mode || snapshot.fileId !== file.id || entry.capturedAtMs === null) {
    return null;
  }
  const runtime = snapshot.mode === 'guide' ? snapshot.guide : snapshot.demo;
  const physicsState = runtime.heatCapacityGuidePhysicsState;
  const workflow = runtime.heatCapacityGuideWorkflow;
  const storedReleaseState = snapshot.common.heatCapacityReleaseState;
  const releaseState = mode === 'guide'
    ? storedReleaseState
    : createLegacyGuideReleaseProjection(physicsState, storedReleaseState);
  const physicsPumpValveOpen = physicsState.lastPumpValveOpenedAtS !== null &&
    (
      physicsState.lastPumpValveClosedAtS === null ||
      physicsState.lastPumpValveOpenedAtS >= physicsState.lastPumpValveClosedAtS
    );
  const releaseControlOpen = releaseState.phase === 'opening' ||
    releaseState.phase === 'open' ||
    releaseState.phase === 'releasing';
  const powerOn = mode === 'guide'
    ? workflow.step !== 'powerRequired' && workflow.step !== 'completed'
    : snapshot.common.powerOn;
  const projectedBase: WorkbenchHeatCapacityState = {
    ...file,
    ...snapshot.common,
    ...runtime,
    heatCapacityMode: mode,
    heatCapacityModeSessions: file.heatCapacityModeSessions,
    runState: entry.resumeRunState,
    heatCapacityTeachingStatus: mode === 'guide'
      ? workflow.step === 'completed' ? 'completed' : 'running'
      : snapshot.common.heatCapacityTeachingStatus,
    powerOn,
    pumpValveOpen: physicsPumpValveOpen,
    pumpValveState: physicsPumpValveOpen ? 'open' : 'closed',
    glassPistonState: releaseControlOpen ? 'open' : 'closed',
    stopcockAngleDeg: releaseControlOpen ? 90 : 0,
    heatCapacityReleaseState: releaseState,
    ambientPressureKPa: runtime.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa,
    ambientTemperatureK: runtime.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK,
    theoreticalGamma: runtime.heatCapacityGuidePhysicsConfig.gamma,
  };
  const projected = mergeHeatCapacityGuideRuntimeState(
    projectedBase,
    physicsState,
    workflow,
    entry.capturedAtMs,
    { immediatePressureDisplay: true },
  );
  const suspended = suspendHeatCapacityModeSession(projected, entry.uiCheckpoint, entry.capturedAtMs);
  const candidate = suspended.heatCapacityModeSessions[mode];
  const normalized = normalizeHeatCapacityModeSessionStore({
    schemaVersion: 2,
    [mode]: candidate,
  }, file.id)[mode];
  return areCanonicalPersistenceValuesEqual(normalized, candidate) ? candidate : null;
};

const normalizeLegacySplitHeatCapacityModeRecord = (
  value: unknown,
  namespace: string,
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
): HeatCapacityModeSessionRecord | null => {
  if (!hasHeatCapacityModeSessionRecordIdentity(value, namespace, file.id, mode)) return null;
  const legacyRecord = value as Record<string, unknown>;
  const legacyEntry = normalizeLegacyHeatCapacityModeSessionEntry(legacyRecord.entry, mode, file.id);
  if (!legacyEntry) return null;
  const entry = mode === 'free'
    ? legacyEntry
    : reprojectLegacyGuideModeSessionEntry(file, mode, legacyEntry);
  if (!entry) return null;
  const normalized: HeatCapacityModeSessionRecord = {
    schemaFamily: MODE_RECORD_SCHEMA_FAMILY,
    key: modeRecordKey(namespace, file.id, mode),
    namespace,
    fileId: file.id,
    mode,
    entry,
  };
  return isHeatCapacityModeSessionRecord(normalized, namespace, file.id, mode)
    ? normalized
    : null;
};

export const isWorkbenchRefreshMetadataTargetActive = (
  metadataFileId: string,
  activeFileId: string | null,
  openFileIds: readonly string[],
) => metadataFileId === activeFileId && openFileIds.includes(metadataFileId);

export const resolveWorkbenchHeatCapacityModeRestoreAtMs = ({
  refreshTarget,
  workspaceActiveFileId,
  fileId,
  fileMode,
  modeSessionCapturedAtMs,
  nowMs,
}: {
  refreshTarget: Pick<
    WorkbenchHeatCapacityRefreshMetadata,
    'activeHeatCapacityFileId' | 'mode' | 'capturedAtMs'
  > | null;
  workspaceActiveFileId: string | null;
  fileId: string;
  fileMode: HeatCapacityMode;
  modeSessionCapturedAtMs: number | null;
  nowMs: number;
}) => {
  const refreshOwnsMode = refreshTarget?.activeHeatCapacityFileId === fileId &&
    refreshTarget.mode === fileMode &&
    workspaceActiveFileId === fileId;
  if (!refreshOwnsMode || !refreshTarget) return nowMs;
  if (modeSessionCapturedAtMs !== refreshTarget.capturedAtMs) {
    throw new WorkbenchRefreshMetadataAnchorMismatchError();
  }
  return refreshTarget.capturedAtMs;
};

const restoreRefreshSessionFromMetadata = (
  metadata: WorkbenchHeatCapacityRefreshMetadata | null,
  files: WorkbenchFileState[],
  activeFileId: string | null,
): WorkbenchHeatCapacityRefreshSession | null => {
  if (!metadata) return null;
  if (!isWorkbenchRefreshMetadataTargetActive(
    metadata.activeHeatCapacityFileId,
    activeFileId,
    files.map((file) => file.id),
  )) {
    throw new Error('IndexedDB refresh metadata does not target the active open file.');
  }
  const file = files.find((candidate) => candidate.id === metadata.activeHeatCapacityFileId);
  if (!file || file.kind !== 'heatCapacity' || file.heatCapacityMode !== metadata.mode) {
    throw new Error('IndexedDB refresh metadata does not match its active heat-capacity file mode.');
  }
  const checkpoint = file.heatCapacityModeSessions[metadata.mode].uiCheckpoint;
  assertWorkbenchHeatCapacityRefreshCheckpointMatchesMetadata(checkpoint, metadata);
  const restored = createWorkbenchHeatCapacityRefreshSession(
    file.id,
    metadata.mode,
    metadata.capturedAtMs,
  );
  restored.checkpointId = metadata.checkpointId;
  restored.modeTransition = metadata.modeTransition;
  restored.modeTransitionDemoClock = metadata.modeTransitionDemoClock;
  const transition = metadata.modeTransition;
  const restoreDeferredGuideUi = checkpoint.mode === 'guide' && metadata.mode === 'guide' && (
    (
      (transition.phase === 'waiting-for-motion' || transition.phase === 'preparing-target') &&
      transition.visibleMode === 'guide' &&
      transition.sourceMode === 'guide' &&
      transition.targetMode !== 'guide'
    ) ||
    (
      transition.phase === 'animating' &&
      transition.visibleMode === 'guide' &&
      transition.targetMode === 'guide'
    )
  );
  restored.modeTransitionGuideUi = restoreDeferredGuideUi && checkpoint.mode === 'guide'
    ? checkpoint.payload.guide
    : null;
  if (checkpoint.mode === 'demo') restored.demo = checkpoint.payload.demo;
  if (checkpoint.mode === 'guide') {
    const guide = checkpoint.payload.guide;
    restored.guide = {
      ...restored.guide,
      focusControlId: guide.normalReminder?.controlId ?? null,
      focusPulseActive: guide.normalReminder !== null,
      missCount: guide.missCount,
      pauseReasons: guide.lessonDialog ? ['lesson-dialog'] : [],
      normalReminder: {
        active: guide.normalReminder !== null,
        controlId: guide.normalReminder?.controlId ?? null,
        message: null,
        remainingMs: getHeatCapacityModeDeferredTimerRemainingMs(guide.normalReminder?.timer),
      },
      strongReminder: {
        active: guide.strongReminder.active,
        controlId: guide.strongReminder.controlId,
        message: null,
        remainingMs: null,
      },
      lessonDialog: guide.lessonDialog,
      shownLessonIds: guide.shownLessonIds,
      toastQueue: metadata.guideTransient.toastQueue,
      pressureAlarmVisible: metadata.guideTransient.pressureAlarmVisible,
      pressureAlarmRemainingMs: metadata.guideTransient.pressureAlarmRemainingMs,
    };
  } else {
    restored.guide = {
      ...restored.guide,
      toastQueue: metadata.guideTransient.toastQueue,
      pressureAlarmVisible: metadata.guideTransient.pressureAlarmVisible,
      pressureAlarmRemainingMs: metadata.guideTransient.pressureAlarmRemainingMs,
    };
  }
  const guideCheckpoint = checkpoint.mode === 'guide' ? checkpoint.payload.guide : null;
  restored.ui = {
    windows: {
      ...metadata.ui.windows,
      lessonAutoResumeDemo: checkpoint.mode === 'demo' &&
        checkpoint.payload.demo.pauseReasons.includes('lesson-dialog'),
    },
    drafts: metadata.ui.drafts,
    layout: {
      ...metadata.ui.layout,
      runState: file.runState,
      guideChecklistViewedIndex: guideCheckpoint?.checklistViewedIndex ?? 0,
      pendingStrongReminderControlId: guideCheckpoint?.pendingStrongReminder?.controlId ?? null,
      pendingStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
        guideCheckpoint?.pendingStrongReminder?.timer,
      ),
      baseStrongReminderFileId: guideCheckpoint?.baseStrongReminder ? file.id : null,
      baseStrongReminderControlId: guideCheckpoint?.baseStrongReminder?.controlId ?? null,
      baseStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
        guideCheckpoint?.baseStrongReminder?.timer,
      ),
      pumpAnimationFileId: checkpoint.pumpAnimation ? file.id : null,
      pumpAnimationReleaseRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
        checkpoint.pumpAnimation?.release,
      ),
      pumpAnimationIdleRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
        checkpoint.pumpAnimation?.idle,
      ),
      cameraTransition: checkpoint.scene.cameraTransition,
      ultraVisualState: checkpoint.scene.ultraVisualState,
      hardSphereVisualCheckpoint: checkpoint.scene.hardSphereVisualCheckpoint,
      heatCapacityFocusSession: checkpoint.scene.focusSession,
    },
  };
  restored.focusMode = checkpoint.scene.focusMode;
  restored.cameraPose = checkpoint.scene.cameraPose;
  restored.sceneSnapshot = null;
  const normalized = normalizeWorkbenchHeatCapacityRefreshSession(restored);
  if (!normalized || !areCanonicalPersistenceValuesEqual(createRefreshMetadata(normalized), metadata)) {
    throw new Error('IndexedDB refresh metadata could not be reconstructed without loss.');
  }
  return normalized;
};

const loadWorkspaceFromIndexedDb = async (
  database: IDBDatabase,
  namespace: string,
  options: {
    allowPendingMigration?: boolean;
    ignoreRefreshMetadata?: boolean;
  } = {},
): Promise<{
  session: WorkbenchSessionState;
  closedFiles: WorkbenchFileState[];
  refreshSession: WorkbenchHeatCapacityRefreshSession | null;
  revision: number;
} | null> => {
  const transaction = database.transaction(
    [
      WORKBENCH_WORKSPACE_META_STORE,
      WORKBENCH_FILES_STORE,
      WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE,
    ],
    'readonly',
  );
  const metaValue = await requestResult(transaction.objectStore(WORKBENCH_WORKSPACE_META_STORE).get(namespace));
  if (metaValue === undefined) return null;
  const meta = normalizeWorkbenchWorkspaceMetaRecord(metaValue);
  if (!meta) {
    throw new Error(`IndexedDB workspace metadata is invalid for namespace: ${namespace}.`);
  }
  if (meta.migrationState !== 'ready' && !options.allowPendingMigration) {
    throw new Error(`IndexedDB workspace migration is still pending verification: ${namespace}.`);
  }
  const effectiveRefreshMetadata = options.ignoreRefreshMetadata
    ? null
    : meta.refreshMetadata;
  const orderedIds = [...meta.openFileIds, ...meta.closedFileIds]
    .filter((fileId, index, ids): fileId is string => (
      typeof fileId === 'string' && ids.indexOf(fileId) === index
    ));
  const fileStore = transaction.objectStore(WORKBENCH_FILES_STORE);
  const modeStore = transaction.objectStore(WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE);
  const fileRecords = await Promise.all(orderedIds.map((fileId) => (
    requestResult(fileStore.get(fileRecordKey(namespace, fileId)))
  )));
  const normalizedFileRecords = fileRecords.map((record, index) => (
    normalizeWorkbenchWorkspaceFileRecord(record, namespace, orderedIds[index]!)
  ));
  const invalidFileRecordIndex = normalizedFileRecords.findIndex((record) => record === null);
  if (invalidFileRecordIndex >= 0) {
    throw new Error(`IndexedDB workspace file record is missing or invalid: ${orderedIds[invalidFileRecordIndex]}.`);
  }
  const storedFiles = (normalizedFileRecords as WorkspaceFileRecord[]).map((record) => record.state);
  const restoredRuntimeFiles = await Promise.all(storedFiles.map(async (file, fileIndex) => {
    if (file.kind !== 'heatCapacity') return file;
    const storedFileRecord = fileRecords[fileIndex];
    const allowLegacySplitModeRecords = hasWorkspaceFileRecordIdentity(
      storedFileRecord,
      namespace,
      file.id,
    ) &&
      !Object.prototype.hasOwnProperty.call(storedFileRecord, 'state') &&
      Object.prototype.hasOwnProperty.call(storedFileRecord, 'envelope');
    const allowCompatibleLegacyModeRecords =
      allowLegacySplitModeRecords ||
      isCompatibleLegacyHeatCapacityWorkspaceStateRecord(
        storedFileRecord,
        namespace,
        file.id,
      );
    const entries = await Promise.all((['demo', 'guide', 'free'] as const).map(async (mode) => {
      const record = await requestResult(modeStore.get(modeRecordKey(namespace, file.id, mode)));
      const normalizedRecord = isHeatCapacityModeSessionRecord(record, namespace, file.id, mode)
        ? record
        : allowCompatibleLegacyModeRecords
          ? normalizeLegacySplitHeatCapacityModeRecord(record, namespace, file, mode)
          : null;
      if (!normalizedRecord) {
        throw new Error(`IndexedDB heat-capacity mode record is missing or invalid: ${file.id}/${mode}.`);
      }
      return normalizedRecord.entry;
    }));
    const modeSessions = normalizeHeatCapacityModeSessionStore({
      schemaVersion: 2,
      demo: entries[0],
      guide: entries[1],
      free: entries[2],
    }, file.id);
    const withSessions: WorkbenchHeatCapacityState = { ...file, heatCapacityModeSessions: modeSessions };
    const currentEntry = modeSessions[file.heatCapacityMode];
    if (currentEntry.status === 'empty' || !currentEntry.snapshot) {
      throw new Error(`IndexedDB current heat-capacity mode has no canonical runtime: ${file.id}/${file.heatCapacityMode}.`);
    }
    const restoredAtMs = resolveWorkbenchHeatCapacityModeRestoreAtMs({
      refreshTarget: effectiveRefreshMetadata,
      workspaceActiveFileId: meta.activeFileId,
      fileId: file.id,
      fileMode: file.heatCapacityMode,
      modeSessionCapturedAtMs: currentEntry.capturedAtMs,
      nowMs: Date.now(),
    });
    const restored = restoreHeatCapacityModeSession(withSessions, file.heatCapacityMode, restoredAtMs);
    if (!restored) {
      throw new Error(`IndexedDB current heat-capacity mode could not be restored: ${file.id}/${file.heatCapacityMode}.`);
    }
    return restored;
  }));
  const restoredFiles = createWorkbenchSessionFromCanonicalFiles({
    files: restoredRuntimeFiles,
    activeFileId: meta.activeFileId ?? '',
    selectedPanel: meta.selectedPanel,
  }).files;
  const restoredIds = restoredFiles.map((file) => file.id);
  if (restoredIds.length !== orderedIds.length || restoredIds.some((fileId, index) => fileId !== orderedIds[index])) {
    throw new Error('IndexedDB workspace reconstruction did not preserve every file and its order.');
  }
  const fileById = new Map(restoredFiles.map((file) => [file.id, file]));
  const openFiles = meta.openFileIds.flatMap((fileId) => {
    const file = fileById.get(fileId);
    return file ? [file] : [];
  });
  const closedFiles = meta.closedFileIds.flatMap((fileId) => {
    const file = fileById.get(fileId);
    return file ? [file] : [];
  });
  return {
    session: createWorkbenchSessionFromCanonicalFiles({
      files: openFiles,
      activeFileId: meta.activeFileId ?? '',
      selectedPanel: meta.selectedPanel,
    }),
    closedFiles,
    refreshSession: restoreRefreshSessionFromMetadata(
      effectiveRefreshMetadata,
      openFiles,
      meta.activeFileId,
    ),
    revision: meta.lastSuccessfulSaveAtMs,
  };
};

type WorkbenchPersistenceRecords = ReturnType<typeof createPersistenceRecords>;

const arePersistenceRecordsEquivalent = (actual: unknown, expected: unknown) => (
  areCanonicalPersistenceValuesEqual(actual, expected)
);

const verifyWrittenWorkspace = async (
  database: IDBDatabase,
  expected: WorkbenchPersistenceRecords,
) => {
  const transaction = database.transaction(
    [
      WORKBENCH_WORKSPACE_META_STORE,
      WORKBENCH_FILES_STORE,
      WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE,
    ],
    'readonly',
  );
  const completed = transactionComplete(transaction);
  const metaRequest = requestResult(
    transaction.objectStore(WORKBENCH_WORKSPACE_META_STORE).get(expected.meta.namespace),
  );
  const fileStore = transaction.objectStore(WORKBENCH_FILES_STORE);
  const modeStore = transaction.objectStore(WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE);
  const namespaceKeyRange = IDBKeyRange.bound(
    `${expected.meta.namespace}|`,
    `${expected.meta.namespace}|\uffff`,
  );
  const fileKeysRequest = requestResult(fileStore.getAllKeys(namespaceKeyRange));
  const modeKeysRequest = requestResult(modeStore.getAllKeys(namespaceKeyRange));
  const fileRequests = expected.fileRecords.map((record) => requestResult(fileStore.get(record.key)));
  const modeRequests = expected.modeRecords.map((record) => requestResult(modeStore.get(record.key)));
  const verificationResults = await Promise.all([
    metaRequest,
    fileKeysRequest,
    modeKeysRequest,
    Promise.all(fileRequests),
    Promise.all(modeRequests),
    completed,
  ] as const);
  const [
    actualMeta,
    actualFileKeys,
    actualModeKeys,
    actualFileRecords,
    actualModeRecords,
  ] = verificationResults;
  const namespacePrefix = `${expected.meta.namespace}|`;
  const actualNamespaceFileKeys = actualFileKeys
    .filter((key): key is string => typeof key === 'string' && key.startsWith(namespacePrefix))
    .sort();
  const actualNamespaceModeKeys = actualModeKeys
    .filter((key): key is string => typeof key === 'string' && key.startsWith(namespacePrefix))
    .sort();
  const expectedFileKeys = expected.fileRecords.map((record) => record.key).sort();
  const expectedModeKeys = expected.modeRecords.map((record) => record.key).sort();
  if (!arePersistenceRecordsEquivalent(actualMeta, expected.meta)) return false;
  if (!arePersistenceRecordsEquivalent(actualNamespaceFileKeys, expectedFileKeys)) return false;
  if (!arePersistenceRecordsEquivalent(actualNamespaceModeKeys, expectedModeKeys)) return false;
  if (actualFileRecords.some((record, index) => (
    !arePersistenceRecordsEquivalent(record, expected.fileRecords[index])
  ))) return false;
  if (actualModeRecords.some((record, index) => (
    !arePersistenceRecordsEquivalent(record, expected.modeRecords[index])
  ))) return false;

  const restored = await loadWorkspaceFromIndexedDb(database, expected.meta.namespace, {
    allowPendingMigration: true,
  });
  if (!restored) return false;
  const restoredOpenIds = restored.session.files.map((file) => file.id);
  const restoredClosedIds = restored.closedFiles.map((file) => file.id);
  return (
    restored.revision === expected.meta.lastSuccessfulSaveAtMs &&
    arePersistenceRecordsEquivalent(restoredOpenIds, expected.meta.openFileIds) &&
    arePersistenceRecordsEquivalent(restoredClosedIds, expected.meta.closedFileIds) &&
    restored.session.activeFileId === (expected.meta.activeFileId ?? '') &&
    restored.session.selectedPanel === expected.meta.selectedPanel &&
    arePersistenceRecordsEquivalent(
      createRefreshMetadata(restored.refreshSession),
      expected.meta.refreshMetadata,
    )
  );
};

const updateMigrationState = async (
  database: IDBDatabase,
  meta: WorkspaceMetaRecord,
  migrationState: WorkspaceMetaRecord['migrationState'],
) => {
  const transaction = database.transaction(WORKBENCH_WORKSPACE_META_STORE, 'readwrite', {
    durability: 'strict',
  });
  const completed = transactionComplete(transaction);
  const metaStore = transaction.objectStore(WORKBENCH_WORKSPACE_META_STORE);
  const currentMetaValue = await requestResult(metaStore.get(meta.namespace));
  const currentMeta = normalizeWorkbenchWorkspaceMetaRecord(currentMetaValue);
  if (!currentMeta) {
    transaction.abort();
    await completed.catch(() => undefined);
    throw new Error(`IndexedDB workspace metadata is invalid for namespace: ${meta.namespace}.`);
  }
  if (!isWorkbenchMigrationStateTransitionCurrent(
    meta.lastSuccessfulSaveAtMs,
    meta.migrationState,
    currentMeta.lastSuccessfulSaveAtMs,
    currentMeta.migrationState,
    migrationState,
  )) {
    transaction.abort();
    await completed.catch(() => undefined);
    throw new WorkbenchPersistenceConflictError(meta.namespace);
  }
  const committedAtMs = Math.max(Date.now(), currentMeta.savedAtMs);
  let updatedMeta: WorkspaceMetaRecord;
  try {
    updatedMeta = advanceWorkbenchWorkspaceMetaRevision({
      ...currentMeta,
      savedAtMs: committedAtMs,
      migrationState,
    }, currentMeta.lastSuccessfulSaveAtMs);
  } catch (error) {
    transaction.abort();
    await completed.catch(() => undefined);
    throw error;
  }
  metaStore.put(updatedMeta);
  await completed;
  return updatedMeta;
};

const cleanupExpiredTemporaryNamespaces = async (
  database: IDBDatabase,
  excludedNamespaces: ReadonlySet<string> = new Set(),
) => {
  const readTransaction = database.transaction(WORKBENCH_WORKSPACE_META_STORE, 'readonly');
  const allMeta = await requestResult(readTransaction.objectStore(WORKBENCH_WORKSPACE_META_STORE).getAll());
  const expiresBeforeMs = Date.now() - WORKBENCH_TEMP_NAMESPACE_MAX_AGE_MS;
  const expired = allMeta
    .map(normalizeWorkbenchWorkspaceMetaRecord)
    .filter((value): value is WorkspaceMetaRecord => (
      value !== null &&
      value.namespace.startsWith('temporary:') &&
      !excludedNamespaces.has(value.namespace) &&
      value.savedAtMs < expiresBeforeMs
    ));
  if (expired.length === 0) return;
  const transaction = database.transaction(
    [
      WORKBENCH_WORKSPACE_META_STORE,
      WORKBENCH_FILES_STORE,
      WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE,
    ],
    'readwrite',
  );
  const completed = transactionComplete(transaction);
  const fileStore = transaction.objectStore(WORKBENCH_FILES_STORE);
  const modeStore = transaction.objectStore(WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE);
  const fileKeys = await requestResult(fileStore.getAllKeys());
  const modeKeys = await requestResult(modeStore.getAllKeys());
  const metaStore = transaction.objectStore(WORKBENCH_WORKSPACE_META_STORE);
  const deletedNamespaces: string[] = [];
  for (const meta of expired) {
    const currentMeta = normalizeWorkbenchWorkspaceMetaRecord(
      await requestResult(metaStore.get(meta.namespace)),
    );
    if (
      !currentMeta ||
      currentMeta.savedAtMs !== meta.savedAtMs ||
      currentMeta.lastSuccessfulSaveAtMs !== meta.lastSuccessfulSaveAtMs ||
      currentMeta.savedAtMs >= expiresBeforeMs
    ) continue;
    metaStore.delete(meta.namespace);
    fileKeys.forEach((key) => {
      if (typeof key === 'string' && key.startsWith(`${meta.namespace}|`)) fileStore.delete(key);
    });
    modeKeys.forEach((key) => {
      if (typeof key === 'string' && key.startsWith(`${meta.namespace}|`)) modeStore.delete(key);
    });
    deletedNamespaces.push(meta.namespace);
  }
  await completed;
  deletedNamespaces.forEach((namespace) => committedWorkspaceSources.delete(namespace));
};

const scheduleTemporaryNamespaceCleanup = () => {
  if (temporaryNamespaceCleanupTimerId !== null) return;
  const runCleanup = () => {
    if (!persistenceReady) return;
    void openWorkbenchDatabase()
      .then((database) => cleanupExpiredTemporaryNamespaces(database, new Set([activeNamespace])))
      .catch((error) => {
        console.error('[Workbench persistence] Temporary namespace cleanup failed.', error);
      });
  };
  runCleanup();
  temporaryNamespaceCleanupTimerId = window.setInterval(() => {
    runCleanup();
  }, WORKBENCH_TEMP_NAMESPACE_CLEANUP_INTERVAL_MS);
};

const requireLegacyDecodedFileParity = (
  rawFiles: unknown[],
  decodedFiles: WorkbenchFileState[],
  label: string,
) => {
  const rawIds = rawFiles.map((file) => {
    if (!isPersistenceRecord(file) || typeof file.id !== 'string' || file.id.trim().length === 0) {
      throw new Error(`Legacy ${label} contains an invalid file identity.`);
    }
    return file.id;
  });
  if (new Set(rawIds).size !== rawIds.length) {
    throw new Error(`Legacy ${label} contains duplicate file identities.`);
  }
  const decodedIds = decodedFiles.map((file) => file.id);
  if (
    rawIds.length !== decodedIds.length ||
    rawIds.some((fileId, index) => fileId !== decodedIds[index])
  ) {
    throw new Error(`Legacy ${label} could not be decoded without dropping or reordering files.`);
  }
};

const asModeJsonObject = (value: unknown): HeatCapacityModeJsonObject | null => (
  isPersistenceRecord(value) ? value as HeatCapacityModeJsonObject : null
);

const getRefreshLayoutNumber = (
  layout: HeatCapacityModeJsonObject,
  key: string,
): number | null => {
  const value = layout[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
};

const getRefreshLayoutString = (
  layout: HeatCapacityModeJsonObject,
  key: string,
): string | null => typeof layout[key] === 'string' ? layout[key] as string : null;

const createLegacyRefreshModeCheckpoint = (
  refreshSession: WorkbenchHeatCapacityRefreshSession,
): HeatCapacityModeUiCheckpoint => {
  const layout = refreshSession.ui.layout;
  const releaseRemainingMs = getRefreshLayoutNumber(layout, 'pumpAnimationReleaseRemainingMs');
  const idleRemainingMs = getRefreshLayoutNumber(layout, 'pumpAnimationIdleRemainingMs');
  const pumpAnimationFileId = getRefreshLayoutString(layout, 'pumpAnimationFileId');
  const pumpAnimation = pumpAnimationFileId === refreshSession.activeHeatCapacityFileId &&
    (releaseRemainingMs !== null || idleRemainingMs !== null)
    ? {
        release: createHeatCapacityModeDeferredTimer(releaseRemainingMs),
        idle: createHeatCapacityModeDeferredTimer(idleRemainingMs),
      }
    : null;
  const base = {
    fileId: refreshSession.activeHeatCapacityFileId,
    checkpointId: `${refreshSession.checkpointId}:mode-migration`,
    capturedAtMs: refreshSession.capturedAtMs,
    scene: {
      focusMode: refreshSession.focusMode,
      cameraPose: refreshSession.cameraPose,
      cameraTransition: asModeJsonObject(layout.cameraTransition),
      ultraVisualState: asModeJsonObject(layout.ultraVisualState),
      hardSphereVisualCheckpoint: asModeJsonObject(layout.hardSphereVisualCheckpoint),
      focusSession: asModeJsonObject(layout.heatCapacityFocusSession),
    },
    pumpAnimation,
  };
  if (refreshSession.mode === 'demo') {
    return createHeatCapacityModeUiCheckpoint({
      ...base,
      mode: 'demo',
      payload: { kind: 'demo', demo: refreshSession.demo },
    });
  }
  if (refreshSession.mode === 'guide') {
    const pendingControlId = getRefreshLayoutString(layout, 'pendingStrongReminderControlId');
    const pendingRemainingMs = getRefreshLayoutNumber(layout, 'pendingStrongReminderRemainingMs');
    const baseControlId = getRefreshLayoutString(layout, 'baseStrongReminderControlId');
    const baseRemainingMs = getRefreshLayoutNumber(layout, 'baseStrongReminderRemainingMs');
    const guide: HeatCapacityModeGuideCheckpoint = {
      missCount: refreshSession.guide.missCount,
      normalReminder: refreshSession.guide.normalReminder.active &&
        refreshSession.guide.normalReminder.controlId
        ? {
            controlId: refreshSession.guide.normalReminder.controlId,
            timer: createHeatCapacityModeDeferredTimer(
              refreshSession.guide.normalReminder.remainingMs ?? 0,
            )!,
          }
        : null,
      strongReminder: {
        active: refreshSession.guide.strongReminder.active,
        controlId: refreshSession.guide.strongReminder.controlId,
      },
      lessonDialog: refreshSession.guide.lessonDialog,
      shownLessonIds: refreshSession.guide.shownLessonIds,
      checklistViewedIndex: getRefreshLayoutNumber(layout, 'guideChecklistViewedIndex') ?? 0,
      pendingStrongReminder: pendingRemainingMs !== null
        ? {
            controlId: pendingControlId,
            timer: createHeatCapacityModeDeferredTimer(pendingRemainingMs)!,
          }
        : null,
      baseStrongReminder: baseRemainingMs !== null
        ? {
            controlId: baseControlId,
            timer: createHeatCapacityModeDeferredTimer(baseRemainingMs)!,
          }
        : null,
    };
    return createHeatCapacityModeUiCheckpoint({
      ...base,
      mode: 'guide',
      payload: { kind: 'guide', guide },
    });
  }
  return createHeatCapacityModeUiCheckpoint({
    ...base,
    mode: 'free',
    payload: { kind: 'free' },
  });
};

const mergeLegacyGuideSessionCheckpoint = (
  checkpoint: HeatCapacityModeUiCheckpoint | null,
  session: WorkbenchSessionState,
  rawSession: unknown,
): { checkpoint: HeatCapacityModeUiCheckpoint | null; session: WorkbenchSessionState } => {
  if (!isPersistenceRecord(rawSession) || rawSession.heatCapacityGuideSession === undefined) {
    return { checkpoint, session };
  }
  const legacyGuide = rawSession.heatCapacityGuideSession;
  if (
    !isPersistenceRecord(legacyGuide) ||
    (typeof legacyGuide.fileId !== 'string' && legacyGuide.fileId !== null) ||
    typeof legacyGuide.strongReminderActive !== 'boolean' ||
    (
      legacyGuide.strongReminderControlId !== undefined &&
      typeof legacyGuide.strongReminderControlId !== 'string' &&
      legacyGuide.strongReminderControlId !== null
    )
  ) {
    throw new Error('Legacy Guide session metadata is invalid.');
  }
  if (legacyGuide.fileId === null && !legacyGuide.strongReminderActive) return { checkpoint, session };
  const file = session.files.find((candidate) => candidate.id === legacyGuide.fileId);
  if (!file || file.kind !== 'heatCapacity') {
    throw new Error('Legacy Guide session cannot be mapped to a heat-capacity file without loss.');
  }
  const source = checkpoint?.fileId === file.id && checkpoint.mode === 'guide'
    ? checkpoint
    : file.heatCapacityModeSessions.guide.uiCheckpoint;
  const capturedAtMs = Date.now();
  const guideCheckpoint: Extract<HeatCapacityModeUiCheckpoint, { mode: 'guide' }> =
    source?.fileId === file.id && source.mode === 'guide'
    ? source
    : createHeatCapacityModeUiCheckpoint({
        fileId: file.id,
        checkpointId: `${file.id}:${capturedAtMs}:legacy-guide`,
        capturedAtMs,
        scene: {
          focusMode: 'none',
          cameraPose: null,
          cameraTransition: null,
          ultraVisualState: null,
          hardSphereVisualCheckpoint: null,
          focusSession: null,
        },
        pumpAnimation: null,
        mode: 'guide',
        payload: {
          kind: 'guide',
          guide: {
            missCount: 0,
            normalReminder: null,
            strongReminder: { active: false, controlId: null },
            lessonDialog: null,
            shownLessonIds: [],
            checklistViewedIndex: 0,
            pendingStrongReminder: null,
            baseStrongReminder: null,
          },
        },
      }) as Extract<HeatCapacityModeUiCheckpoint, { mode: 'guide' }>;
  const mergedCheckpoint = createHeatCapacityModeUiCheckpoint({
    fileId: guideCheckpoint.fileId,
    checkpointId: guideCheckpoint.checkpointId,
    capturedAtMs: guideCheckpoint.capturedAtMs,
    scene: guideCheckpoint.scene,
    pumpAnimation: guideCheckpoint.pumpAnimation,
    mode: 'guide',
    payload: {
      kind: 'guide',
      guide: {
        ...guideCheckpoint.payload.guide,
        strongReminder: {
          active: legacyGuide.strongReminderActive,
          controlId: typeof legacyGuide.strongReminderControlId === 'string'
            ? legacyGuide.strongReminderControlId
            : null,
        },
      },
    },
  });
  if (session.activeFileId === file.id && file.heatCapacityMode === 'guide') {
    return { checkpoint: mergedCheckpoint, session };
  }
  const guideEntry = file.heatCapacityModeSessions.guide;
  if (guideEntry.status === 'empty' || !guideEntry.snapshot) {
    if (file.heatCapacityMode !== 'guide') {
      throw new Error('Legacy Guide session has no recoverable Guide runtime to receive its UI checkpoint.');
    }
    const suspendedGuideFile = suspendHeatCapacityModeSession(file, mergedCheckpoint);
    return {
      checkpoint,
      session: {
        ...session,
        files: session.files.map((candidate) => (
          candidate.id === file.id ? suspendedGuideFile : candidate
        )),
      },
    };
  }
  return {
    checkpoint,
    session: {
      ...session,
      files: session.files.map((candidate) => candidate.id === file.id && candidate.kind === 'heatCapacity'
        ? {
            ...candidate,
            heatCapacityModeSessions: {
              ...candidate.heatCapacityModeSessions,
              guide: { ...candidate.heatCapacityModeSessions.guide, uiCheckpoint: mergedCheckpoint },
            },
          }
        : candidate),
    },
  };
};

const createLegacyGuideRefreshSession = (
  file: WorkbenchHeatCapacityState,
  checkpoint: Extract<HeatCapacityModeUiCheckpoint, { mode: 'guide' }>,
) => {
  const restored = createWorkbenchHeatCapacityRefreshSession(
    file.id,
    'guide',
    checkpoint.capturedAtMs,
  );
  const guide = checkpoint.payload.guide;
  restored.checkpointId = checkpoint.checkpointId;
  restored.focusMode = checkpoint.scene.focusMode;
  restored.cameraPose = checkpoint.scene.cameraPose;
  restored.guide = {
    ...restored.guide,
    focusControlId: guide.normalReminder?.controlId ?? null,
    focusPulseActive: guide.normalReminder !== null,
    missCount: guide.missCount,
    pauseReasons: guide.lessonDialog ? ['lesson-dialog'] : [],
    normalReminder: {
      active: guide.normalReminder !== null,
      controlId: guide.normalReminder?.controlId ?? null,
      message: null,
      remainingMs: getHeatCapacityModeDeferredTimerRemainingMs(guide.normalReminder?.timer),
    },
    strongReminder: {
      active: guide.strongReminder.active,
      controlId: guide.strongReminder.controlId,
      message: null,
      remainingMs: null,
    },
    lessonDialog: guide.lessonDialog,
    shownLessonIds: guide.shownLessonIds,
  };
  restored.ui = {
    ...restored.ui,
    layout: {
      ...restored.ui.layout,
      runState: file.runState,
      guideChecklistViewedIndex: guide.checklistViewedIndex,
      pendingStrongReminderControlId: guide.pendingStrongReminder?.controlId ?? null,
      pendingStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
        guide.pendingStrongReminder?.timer,
      ),
      baseStrongReminderFileId: guide.baseStrongReminder ? file.id : null,
      baseStrongReminderControlId: guide.baseStrongReminder?.controlId ?? null,
      baseStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
        guide.baseStrongReminder?.timer,
      ),
      pumpAnimationFileId: checkpoint.pumpAnimation ? file.id : null,
      pumpAnimationReleaseRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
        checkpoint.pumpAnimation?.release,
      ),
      pumpAnimationIdleRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
        checkpoint.pumpAnimation?.idle,
      ),
      cameraTransition: checkpoint.scene.cameraTransition,
      ultraVisualState: checkpoint.scene.ultraVisualState,
      hardSphereVisualCheckpoint: checkpoint.scene.hardSphereVisualCheckpoint,
      heatCapacityFocusSession: checkpoint.scene.focusSession,
    },
  };
  const normalized = normalizeWorkbenchHeatCapacityRefreshSession(restored);
  if (!normalized) throw new Error('Legacy Guide checkpoint could not produce a refresh bootstrap.');
  return normalized;
};

const removeLegacyStorageKeys = () => {
  const freshWindow = isFreshWorkbenchWindow();
  const workspaceStorage = freshWindow ? window.sessionStorage : window.localStorage;
  const hadLegacyData = (
    workspaceStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY) !== null ||
    (!freshWindow && window.localStorage.getItem(WORKBENCH_CLOSED_FILES_STORAGE_KEY) !== null) ||
    window.sessionStorage.getItem(WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY) !== null
  );
  workspaceStorage.removeItem(WORKBENCH_SESSION_STORAGE_KEY);
  if (!freshWindow) window.localStorage.removeItem(WORKBENCH_CLOSED_FILES_STORAGE_KEY);
  window.sessionStorage.removeItem(WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY);
  return hadLegacyData;
};

const readLegacyRefreshSessionForBootstrap = (): WorkbenchHeatCapacityRefreshSession | null => {
  try {
    const rawRefresh = window.sessionStorage.getItem(
      WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY,
    );
    return rawRefresh
      ? normalizeWorkbenchHeatCapacityRefreshSession(JSON.parse(rawRefresh) as unknown)
      : null;
  } catch {
    return null;
  }
};

const readLegacyWorkspaceForMigration = () => {
  const freshWindow = isFreshWorkbenchWindow();
  const storage = freshWindow ? window.sessionStorage : window.localStorage;
  const rawSession = storage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
  const rawClosed = freshWindow
    ? null
    : window.localStorage.getItem(WORKBENCH_CLOSED_FILES_STORAGE_KEY);
  const rawRefresh = window.sessionStorage.getItem(WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY);
  let session = createWorkbenchSessionFromRuntimeFiles({
    files: [],
    activeFileId: '',
    selectedPanel: 'preview',
  });
  let closedFiles: WorkbenchFileState[] = [];
  let migrationModeCaptureOverrides: WorkbenchMigrationModeCaptureOverride[] = [];
  const recoveryDiagnostics: ReturnType<
    typeof decodeWorkbenchSessionWithDiagnostics
  >['diagnostics'] = [];
  let parsedSession: unknown = null;
  if (rawSession) {
    parsedSession = JSON.parse(rawSession) as unknown;
    const decoded = decodeWorkbenchStorageEnvelope(parsedSession);
    if (decoded.handled) {
      if (decoded.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
        throw new Error(`Legacy workspace migration rejected: ${decoded.diagnostics.map((item) => item.code).join(', ')}.`);
      }
      if (!isPersistenceRecord(parsedSession) || !Array.isArray(parsedSession.files)) {
        throw new Error('Legacy workspace envelope has no verifiable file list.');
      }
      requireLegacyDecodedFileParity(parsedSession.files, decoded.session.files, 'workspace');
      session = decoded.session;
      migrationModeCaptureOverrides = decoded.migrationModeCaptureOverrides;
    } else {
      if (
        !isPersistenceRecord(parsedSession) ||
        parsedSession.version !== 1 ||
        !Array.isArray(parsedSession.files)
      ) {
        throw new Error('Legacy workspace payload is invalid or unsupported.');
      }
      const decodedRuntimeSession = decodeWorkbenchSessionWithDiagnostics(
        parsedSession,
      );
      session = decodedRuntimeSession.session;
      recoveryDiagnostics.push(...decodedRuntimeSession.diagnostics);
      requireLegacyDecodedFileParity(parsedSession.files, session.files, 'workspace');
    }
  }
  if (rawClosed) {
    const parsed = JSON.parse(rawClosed) as unknown;
    const decoded = decodeWorkbenchClosedFilesStorageEnvelope(parsed);
    if (decoded.handled) {
      if (decoded.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
        throw new Error(`Legacy closed-files migration rejected: ${decoded.diagnostics.map((item) => item.code).join(', ')}.`);
      }
      if (!isPersistenceRecord(parsed) || !Array.isArray(parsed.files)) {
        throw new Error('Legacy closed-files envelope has no verifiable file list.');
      }
      requireLegacyDecodedFileParity(parsed.files, decoded.files, 'closed-files');
      closedFiles = decoded.files;
      migrationModeCaptureOverrides = [
        ...migrationModeCaptureOverrides,
        ...decoded.migrationModeCaptureOverrides,
      ];
    } else if (Array.isArray(parsed)) {
      const decodedLegacyClosedResult = decodeWorkbenchSessionWithDiagnostics({
        version: 1,
        files: parsed,
        activeFileId: isPersistenceRecord(parsed[0]) && typeof parsed[0].id === 'string'
          ? parsed[0].id
          : '',
        selectedPanel: 'preview',
      });
      const decodedLegacyClosed = decodedLegacyClosedResult.session.files;
      recoveryDiagnostics.push(...decodedLegacyClosedResult.diagnostics);
      requireLegacyDecodedFileParity(parsed, decodedLegacyClosed, 'closed-files');
      closedFiles = decodedLegacyClosed;
    } else {
      throw new Error('Legacy closed-files payload is invalid or unsupported.');
    }
  }
  assertDistinctWorkspaceFileCollections(session.files, closedFiles, session.activeFileId);
  let refreshSession = rawRefresh
    ? normalizeWorkbenchHeatCapacityRefreshSession(JSON.parse(rawRefresh) as unknown)
    : null;
  if (rawRefresh && !refreshSession) {
    throw new Error('Legacy heat-capacity refresh session is invalid.');
  }
  let activeModeCheckpoint = refreshSession
    ? createLegacyRefreshModeCheckpoint(refreshSession)
    : null;
  if (activeModeCheckpoint) {
    const checkpointFile = session.files.find((file) => file.id === activeModeCheckpoint.fileId);
    if (
      !checkpointFile ||
      checkpointFile.kind !== 'heatCapacity' ||
      checkpointFile.heatCapacityMode !== activeModeCheckpoint.mode
    ) {
      throw new Error('Legacy refresh checkpoint does not match its active heat-capacity file mode.');
    }
  }
  const mergedLegacyGuide = mergeLegacyGuideSessionCheckpoint(
    activeModeCheckpoint,
    session,
    parsedSession,
  );
  activeModeCheckpoint = mergedLegacyGuide.checkpoint;
  session = mergedLegacyGuide.session;
  if (
    !refreshSession &&
    activeModeCheckpoint?.mode === 'guide' &&
    session.activeFileId === activeModeCheckpoint.fileId
  ) {
    const activeGuideFile = session.files.find((file): file is WorkbenchHeatCapacityState => (
      file.id === activeModeCheckpoint?.fileId &&
      file.kind === 'heatCapacity' &&
      file.heatCapacityMode === 'guide'
    ));
    if (!activeGuideFile) {
      throw new Error('Legacy active Guide checkpoint has no matching active Guide file.');
    }
    refreshSession = createLegacyGuideRefreshSession(activeGuideFile, activeModeCheckpoint);
  }
  return {
    session,
    closedFiles,
    refreshSession,
    activeModeCheckpoint,
    migrationModeCaptureOverrides,
    recoveryDiagnostics,
    hasLegacyData: Boolean(rawSession || rawClosed || rawRefresh),
    removeAfterVerifiedWrite: removeLegacyStorageKeys,
  };
};

const installBootstrap = (
  session: WorkbenchSessionState,
  closedFiles: WorkbenchFileState[],
  refreshSession: WorkbenchHeatCapacityRefreshSession | null,
) => {
  installWorkbenchPersistenceBootstrap(session, closedFiles);
  installWorkbenchHeatCapacityRefreshBootstrap(refreshSession);
};

const readWorkspaceMetaRecord = async (
  database: IDBDatabase,
  namespace: string,
): Promise<WorkspaceMetaRecord | null> => {
  const transaction = database.transaction(WORKBENCH_WORKSPACE_META_STORE, 'readonly');
  const value = await requestResult(
    transaction.objectStore(WORKBENCH_WORKSPACE_META_STORE).get(namespace),
  );
  if (value === undefined) return null;
  const meta = normalizeWorkbenchWorkspaceMetaRecord(value);
  if (!meta) {
    throw new Error(`IndexedDB workspace metadata is invalid for namespace: ${namespace}.`);
  }
  return meta;
};

type LegacyV2RawRecord = {
  sourceStore:
    | typeof WORKBENCH_WORKSPACE_META_STORE
    | typeof WORKBENCH_FILES_STORE
    | typeof WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE;
  raw: unknown;
};

const readLegacyV2RawRecords = async (
  database: IDBDatabase,
  namespace: string,
) => {
  const transaction = database.transaction(
    [
      WORKBENCH_WORKSPACE_META_STORE,
      WORKBENCH_FILES_STORE,
      WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE,
    ],
    'readonly',
  );
  const [metaValue, fileValues, modeValues] = await Promise.all([
    requestResult(
      transaction.objectStore(WORKBENCH_WORKSPACE_META_STORE).get(namespace),
    ),
    requestResult(
      transaction.objectStore(WORKBENCH_FILES_STORE).getAll(),
    ) as Promise<unknown[]>,
    requestResult(
      transaction.objectStore(
        WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE,
      ).getAll(),
    ) as Promise<unknown[]>,
  ]);
  const namespaceFileValues = fileValues.filter((value) => (
    isPersistenceRecord(value) && value.namespace === namespace
  ));
  const namespaceModeValues = modeValues.filter((value) => (
    isPersistenceRecord(value) && value.namespace === namespace
  ));
  const metaRawRecords: LegacyV2RawRecord[] = metaValue === undefined
    ? []
    : [{
        sourceStore: WORKBENCH_WORKSPACE_META_STORE,
        raw: structuredClone(metaValue),
      }];
  const rawRecords: LegacyV2RawRecord[] = [
    ...metaRawRecords,
    ...namespaceFileValues.map<LegacyV2RawRecord>((raw) => ({
      sourceStore: WORKBENCH_FILES_STORE,
      raw: structuredClone(raw),
    })),
    ...namespaceModeValues.map<LegacyV2RawRecord>((raw) => ({
      sourceStore: WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE,
      raw: structuredClone(raw),
    })),
  ];
  return {
    metaValue,
    fileValues: namespaceFileValues,
    modeValues: namespaceModeValues,
    rawRecords,
  };
};

const salvageLegacyV2WorkspaceIntoV3 = async (
  database: IDBDatabase,
  namespace: string,
) => {
  const raw = await readLegacyV2RawRecords(database, namespace);
  const salvagedById = new Map<string, WorkbenchFileState>();
  for (const fileValue of raw.fileValues) {
    if (
      !isPersistenceRecord(fileValue) ||
      typeof fileValue.fileId !== 'string' ||
      fileValue.fileId.trim().length === 0 ||
      salvagedById.has(fileValue.fileId)
    ) {
      continue;
    }
    const normalized = normalizeWorkbenchWorkspaceFileRecord(
      fileValue,
      namespace,
      fileValue.fileId,
    );
    if (!normalized) continue;
    let state = normalized.state;
    if (state.kind === 'heatCapacity') {
      const heatState = state;
      const allowLegacySplitModeRecords =
        hasWorkspaceFileRecordIdentity(
          fileValue,
          namespace,
          heatState.id,
        ) &&
        !Object.prototype.hasOwnProperty.call(fileValue, 'state') &&
        Object.prototype.hasOwnProperty.call(fileValue, 'envelope');
      const allowCompatibleLegacyModeRecords =
        allowLegacySplitModeRecords ||
        isCompatibleLegacyHeatCapacityWorkspaceStateRecord(
          fileValue,
          namespace,
          heatState.id,
        );
      const entries = (['demo', 'guide', 'free'] as const).map((mode) => {
        const modeValue = raw.modeValues.find((candidate) => (
          isPersistenceRecord(candidate) &&
          candidate.key === modeRecordKey(namespace, heatState.id, mode)
        ));
        const normalizedMode = isHeatCapacityModeSessionRecord(
          modeValue,
          namespace,
          heatState.id,
          mode,
        )
          ? modeValue
          : allowCompatibleLegacyModeRecords
            ? normalizeLegacySplitHeatCapacityModeRecord(
                modeValue,
                namespace,
                heatState,
                mode,
              )
            : null;
        return normalizedMode?.entry ?? null;
      });
      if (entries.some((entry) => entry === null)) continue;
      const modeSessions = normalizeHeatCapacityModeSessionStore({
        schemaVersion: 2,
        demo: entries[0]!,
        guide: entries[1]!,
        free: entries[2]!,
      }, heatState.id);
      const withSessions: WorkbenchHeatCapacityState = {
        ...heatState,
        heatCapacityModeSessions: modeSessions,
      };
      const currentEntry = modeSessions[heatState.heatCapacityMode];
      if (currentEntry.status === 'empty' || currentEntry.snapshot === null) {
        continue;
      }
      const restored = restoreHeatCapacityModeSession(
        withSessions,
        heatState.heatCapacityMode,
        Math.max(Date.now(), currentEntry.capturedAtMs),
      );
      if (!restored) continue;
      state = restored;
    }
    try {
      const canonical = createWorkbenchSessionFromRuntimeFiles({
        files: [state],
        activeFileId: state.id,
        selectedPanel: 'preview',
      }).files[0];
      if (canonical?.id === state.id) salvagedById.set(state.id, canonical);
    } catch {
      // The raw record remains preserved below even when it cannot be run.
    }
  }

  const metaHint = isPersistenceRecord(raw.metaValue)
    ? raw.metaValue
    : null;
  const hintedOpenIds = Array.isArray(metaHint?.openFileIds)
    ? metaHint.openFileIds.filter(
        (fileId): fileId is string => typeof fileId === 'string',
      )
    : [];
  const hintedClosedIds = Array.isArray(metaHint?.closedFileIds)
    ? metaHint.closedFileIds.filter(
        (fileId): fileId is string => typeof fileId === 'string',
      )
    : [];
  const closedFiles = hintedClosedIds.flatMap((fileId) => {
    const file = salvagedById.get(fileId);
    return file ? [file] : [];
  });
  const closedIds = new Set(closedFiles.map((file) => file.id));
  const files = [
    ...hintedOpenIds.flatMap((fileId) => {
      const file = salvagedById.get(fileId);
      return file && !closedIds.has(fileId) ? [file] : [];
    }),
    ...[...salvagedById.values()].filter((file) => (
      !closedIds.has(file.id) && !hintedOpenIds.includes(file.id)
    )),
  ];
  const selectedPanel = isWorkbenchPanelKey(metaHint?.selectedPanel)
    ? metaHint.selectedPanel
    : 'preview';
  const hintedActiveFileId = typeof metaHint?.activeFileId === 'string'
    ? metaHint.activeFileId
    : '';
  const session = createWorkbenchSessionFromRuntimeFiles({
    files,
    activeFileId: files.some((file) => file.id === hintedActiveFileId)
      ? hintedActiveFileId
      : files[0]?.id ?? '',
    selectedPanel,
  });
  const retained = createEmptyWorkbenchPersistenceV3RetainedState();
  retained.legacyRawRecords = raw.rawRecords;
  const capturedAtMs = Date.now();
  const committed = await commitWorkbenchPersistenceV3ProductionSnapshot({
    store: new IndexedDbWorkbenchPersistenceV3GenerationStore(database),
    namespace,
    generationId: createPersistenceV3GenerationId(capturedAtMs),
    capturedAtMs,
    snapshot: {
      files: session.files,
      closedFiles,
      activeFileId: session.activeFileId,
      selectedPanel: session.selectedPanel,
    },
    retained,
  });
  return {
    session,
    closedFiles,
    retained: committed.retained,
  };
};

const loadReadyWorkspaceWithRefreshMetadataRecovery = async (
  database: IDBDatabase,
  namespace: string,
) => {
  try {
    return await loadWorkspaceFromIndexedDb(database, namespace);
  } catch (cause) {
    if (!(cause instanceof WorkbenchRefreshMetadataAnchorMismatchError)) throw cause;
    const currentMeta = await readWorkspaceMetaRecord(database, namespace);
    if (
      currentMeta?.migrationState !== 'ready' ||
      !isWorkbenchRefreshMetadataAnchorRecoverySourceVersion(currentMeta.appVersion)
    ) {
      throw cause;
    }
    const restored = await loadWorkspaceFromIndexedDb(database, namespace, {
      ignoreRefreshMetadata: true,
    });
    if (!restored) {
      throw new Error('IndexedDB workspace metadata disappeared during refresh metadata recovery.');
    }
    console.warn(
      '[Workbench persistence] Ignored mismatched 5.1.2 refresh metadata while preserving canonical workspace records.',
    );
    return restored;
  }
};

const waitForReadyWorkspaceAfterMigrationConflict = async (
  database: IDBDatabase,
  namespace: string,
) => {
  const deadlineMs = Date.now() + WORKBENCH_MIGRATION_CONFLICT_WAIT_TIMEOUT_MS;
  while (true) {
    const currentMeta = await readWorkspaceMetaRecord(database, namespace);
    const recoveryAction = getWorkbenchMigrationConflictRecoveryAction(
      currentMeta?.migrationState ?? null,
    );
    if (recoveryAction === 'restore-ready') {
      return loadReadyWorkspaceWithRefreshMetadataRecovery(database, namespace);
    }
    if (recoveryAction === 'fail') return null;
    const remainingMs = deadlineMs - Date.now();
    if (remainingMs <= 0) return null;
    await new Promise<void>((resolve) => {
      window.setTimeout(
        resolve,
        Math.min(WORKBENCH_MIGRATION_CONFLICT_POLL_INTERVAL_MS, remainingMs),
      );
    });
  }
};

export const loadWorkbenchArchivedNamespaceSnapshot = async (
  namespace: string,
): Promise<WorkbenchArchivedNamespaceSnapshot | null> => {
  if (!isExplicitWorkbenchNamespace(namespace)) {
    throw new Error('The archived workbench namespace is invalid.');
  }
  if (!window.indexedDB) {
    throw new Error('IndexedDB is unavailable in this runtime.');
  }

  const database = await openWorkbenchDatabase();
  const restoredV3 = await restoreWorkbenchPersistenceV3ProductionWorkspace(
    new IndexedDbWorkbenchPersistenceV3GenerationStore(database),
    namespace,
  );
  if (restoredV3) {
    return {
      namespace,
      files: clonePersistenceValue(restoredV3.files),
      closedFiles: clonePersistenceValue(restoredV3.closedFiles),
    };
  }

  const currentMeta = await readWorkspaceMetaRecord(database, namespace);
  if (currentMeta?.migrationState !== 'ready') return null;
  const restoredV2 = await loadReadyWorkspaceWithRefreshMetadataRecovery(database, namespace);
  if (!restoredV2) return null;
  return {
    namespace,
    files: clonePersistenceValue(restoredV2.session.files),
    closedFiles: clonePersistenceValue(restoredV2.closedFiles),
  };
};

const commitRestoredV2WorkspaceIntoV3 = async (
  database: IDBDatabase,
  namespace: string,
  session: WorkbenchSessionState,
  closedFiles: WorkbenchFileState[],
) => {
  const capturedAtMs = Date.now();
  const generationId = createPersistenceV3GenerationId(capturedAtMs);
  const snapshot = {
    files: session.files,
    closedFiles,
    activeFileId: session.activeFileId,
    selectedPanel: session.selectedPanel,
  };
  const retained = createEmptyWorkbenchPersistenceV3RetainedState();
  if (persistenceWorkerClient.isSupported()) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return {
          retained: await persistenceWorkerClient.save({
            type: 'save',
            requestId: generationId,
            namespace,
            generationId,
            capturedAtMs,
            snapshot,
            retained,
          }),
        };
      } catch (cause) {
        if (!(cause instanceof WorkbenchPersistenceWorkerTransportError)) {
          throw cause;
        }
        persistenceWorkerClient.restart();
        if (attempt === 0) continue;
      }
    }
  }
  await waitForWorkbenchPersistenceIdle();
  return commitWorkbenchPersistenceV3WithQuotaRecovery({
    store: new IndexedDbWorkbenchPersistenceV3GenerationStore(database),
    namespace,
    generationId,
    capturedAtMs,
    snapshot,
    retained,
  });
};

const performWorkbenchIndexedDbInitialization = async (): Promise<WorkbenchPersistenceBootstrapResult> => {
  persistenceReady = false;
  let legacyFallback: ReturnType<typeof readLegacyWorkspaceForMigration> | null = null;
  let database: IDBDatabase | null = null;
  try {
    publishPersistenceInitializationStage('preparing-storage');
    activeNamespace = resolveWorkbenchNamespace();
    retainedPersistenceV3StateByNamespace.delete(activeNamespace);
    if (!window.indexedDB) throw new Error('IndexedDB is unavailable in this runtime.');
    publishPersistenceInitializationStage('opening-storage');
    database = await openWorkbenchDatabase();
    publishPersistenceInitializationStage('reading-workspace');
    const persistenceV3Store =
      new IndexedDbWorkbenchPersistenceV3GenerationStore(database);
    let restoredV3:
      Awaited<ReturnType<
        typeof restoreWorkbenchPersistenceV3ProductionWorkspace
      >> = null;
    try {
      publishPersistenceInitializationStage('restoring-workspace');
      restoredV3 =
        await restoreWorkbenchPersistenceV3ProductionWorkspace(
          persistenceV3Store,
          activeNamespace,
        );
    } catch (cause) {
      console.warn(
        '[Workbench persistence] V3 restore failed; trying preserved V2 sources.',
        cause,
      );
    }
    if (restoredV3) {
      publishPersistenceInitializationStage('preparing-workbench');
      const session = createWorkbenchSessionFromRuntimeFiles({
        files: restoredV3.files,
        activeFileId: restoredV3.activeFileId,
        selectedPanel: restoredV3.selectedPanel,
      });
      installBootstrap(session, restoredV3.closedFiles, null);
      retainedPersistenceV3StateByNamespace.set(
        activeNamespace,
        restoredV3.retained,
      );
      try {
        const existingV2Meta = await readWorkspaceMetaRecord(
          database,
          activeNamespace,
        );
        if (existingV2Meta?.migrationState === 'ready') {
          expectedWorkspaceRevisionByNamespace.set(
            activeNamespace,
            existingV2Meta.lastSuccessfulSaveAtMs,
          );
        } else {
          expectedWorkspaceRevisionByNamespace.set(activeNamespace, null);
        }
      } catch (cause) {
        expectedWorkspaceRevisionByNamespace.delete(activeNamespace);
        console.warn(
          '[Workbench persistence] V3 restored; invalid V2 shadow will not be written.',
          cause,
        );
      }
      markPersistenceReady();
      if (restoredV3.usedPreviousGeneration) {
        console.warn(
          '[Workbench persistence] Restored the previous verified V3 generation.',
        );
      }
      return {
        namespace: activeNamespace,
        migratedLegacyStorage: false,
        error: null,
      };
    }
    const existingMeta = await readWorkspaceMetaRecord(database, activeNamespace);
    if (existingMeta?.migrationState === 'ready') {
      publishPersistenceInitializationStage('migrating-workspace');
      const restored = await loadReadyWorkspaceWithRefreshMetadataRecovery(database, activeNamespace);
      if (!restored) throw new Error('IndexedDB workspace metadata disappeared during initialization.');
      const committed = await commitRestoredV2WorkspaceIntoV3(
        database,
        activeNamespace,
        restored.session,
        restored.closedFiles,
      );
      publishPersistenceInitializationStage('preparing-workbench');
      installBootstrap(restored.session, restored.closedFiles, restored.refreshSession);
      retainedPersistenceV3StateByNamespace.set(
        activeNamespace,
        committed.retained,
      );
      expectedWorkspaceRevisionByNamespace.set(
        activeNamespace,
        restored.revision,
      );
      markPersistenceReady();
      return { namespace: activeNamespace, migratedLegacyStorage: false, error: null };
    }

    if (existingMeta?.migrationState === 'cleanup-pending') {
      publishPersistenceInitializationStage('migrating-workspace');
      const restored = await loadWorkspaceFromIndexedDb(database, activeNamespace, {
        allowPendingMigration: true,
      });
      if (!restored) throw new Error('Verified IndexedDB migration data disappeared before cleanup completed.');
      const refreshBootstrap = attachLegacySceneSnapshotToRefreshBootstrap(
        restored.refreshSession,
        readLegacyRefreshSessionForBootstrap(),
      );
      const removedLegacyStorage = removeLegacyStorageKeys();
      const readyMeta = await updateMigrationState(database, existingMeta, 'ready');
      const committed = await commitRestoredV2WorkspaceIntoV3(
        database,
        activeNamespace,
        restored.session,
        restored.closedFiles,
      );
      publishPersistenceInitializationStage('preparing-workbench');
      installBootstrap(restored.session, restored.closedFiles, refreshBootstrap);
      retainedPersistenceV3StateByNamespace.set(
        activeNamespace,
        committed.retained,
      );
      expectedWorkspaceRevisionByNamespace.set(
        activeNamespace,
        readyMeta.lastSuccessfulSaveAtMs,
      );
      markPersistenceReady();
      return {
        namespace: activeNamespace,
        migratedLegacyStorage: removedLegacyStorage,
        error: null,
      };
    }
    legacyFallback = readLegacyWorkspaceForMigration();
    if (legacyFallback.recoveryDiagnostics.length > 0) {
      throw new Error(
        `Legacy workspace opened with ${legacyFallback.recoveryDiagnostics.length} isolated recovery diagnostic(s); preserving raw data in V3.`,
      );
    }
    if (existingMeta?.migrationState === 'pending-verification' && !legacyFallback.hasLegacyData) {
      throw new Error('An interrupted workspace migration cannot be verified because its legacy source is missing.');
    }
    if (legacyFallback.hasLegacyData) {
      publishPersistenceInitializationStage('migrating-workspace');
      const writtenRecords = await writeWorkbenchWorkspaceToIndexedDb(database, activeNamespace, {
        files: legacyFallback.session.files,
        closedFiles: legacyFallback.closedFiles,
        activeFileId: legacyFallback.session.activeFileId,
        selectedPanel: legacyFallback.session.selectedPanel,
        refreshSession: legacyFallback.refreshSession,
        activeModeCheckpoint: legacyFallback.activeModeCheckpoint,
        preserveActiveHeatCapacityModeSession: false,
        migrationModeCaptureOverrides: legacyFallback.migrationModeCaptureOverrides,
      }, 'pending-verification', null, existingMeta?.lastSuccessfulSaveAtMs ?? null);
      if (!await verifyWrittenWorkspace(database, writtenRecords)) {
        committedWorkspaceSources.delete(activeNamespace);
        throw new Error('IndexedDB migration verification failed.');
      }
      const cleanupPendingMeta = await updateMigrationState(
        database,
        writtenRecords.meta,
        'cleanup-pending',
      );
      const verified = await loadWorkspaceFromIndexedDb(database, activeNamespace, {
        allowPendingMigration: true,
      });
      if (!verified) throw new Error('IndexedDB migration verification failed after reconstruction.');
      const refreshBootstrap = attachLegacySceneSnapshotToRefreshBootstrap(
        verified.refreshSession,
        legacyFallback.refreshSession,
      );
      legacyFallback.removeAfterVerifiedWrite();
      const readyMeta = await updateMigrationState(database, cleanupPendingMeta, 'ready');
      const committed = await commitRestoredV2WorkspaceIntoV3(
        database,
        activeNamespace,
        verified.session,
        verified.closedFiles,
      );
      publishPersistenceInitializationStage('preparing-workbench');
      installBootstrap(verified.session, verified.closedFiles, refreshBootstrap);
      retainedPersistenceV3StateByNamespace.set(
        activeNamespace,
        committed.retained,
      );
      expectedWorkspaceRevisionByNamespace.set(
        activeNamespace,
        readyMeta.lastSuccessfulSaveAtMs,
      );
      markPersistenceReady();
      return { namespace: activeNamespace, migratedLegacyStorage: true, error: null };
    }
    publishPersistenceInitializationStage('preparing-workbench');
    installBootstrap(legacyFallback.session, [], null);
    expectedWorkspaceRevisionByNamespace.set(activeNamespace, null);
    markPersistenceReady();
    return { namespace: activeNamespace, migratedLegacyStorage: false, error: null };
  } catch (cause) {
    publishPersistenceInitializationStage('recovering-workspace');
    expectedWorkspaceRevisionByNamespace.delete(activeNamespace);
    let error = cause instanceof Error ? cause : new Error(String(cause));
    if (error instanceof WorkbenchPersistenceConflictError && database) {
      try {
        const restored = await waitForReadyWorkspaceAfterMigrationConflict(database, activeNamespace);
        if (restored) {
          const committed = await commitRestoredV2WorkspaceIntoV3(
            database,
            activeNamespace,
            restored.session,
            restored.closedFiles,
          );
          const refreshBootstrap = attachLegacySceneSnapshotToRefreshBootstrap(
            restored.refreshSession,
            legacyFallback?.refreshSession ?? readLegacyRefreshSessionForBootstrap(),
          );
          installBootstrap(restored.session, restored.closedFiles, refreshBootstrap);
          retainedPersistenceV3StateByNamespace.set(
            activeNamespace,
            committed.retained,
          );
          expectedWorkspaceRevisionByNamespace.set(activeNamespace, restored.revision);
          markPersistenceReady();
          return { namespace: activeNamespace, migratedLegacyStorage: false, error: null };
        }
      } catch (recoveryCause) {
        error = recoveryCause instanceof Error ? recoveryCause : new Error(String(recoveryCause));
      }
    }
    if (!legacyFallback) {
      try {
        legacyFallback = readLegacyWorkspaceForMigration();
      } catch (legacyCause) {
        console.error('[Workbench persistence] Legacy fallback decoding failed.', legacyCause);
      }
    }
    if (database) {
      try {
        let recovered: {
          session: WorkbenchSessionState;
          closedFiles: WorkbenchFileState[];
          retained: WorkbenchPersistenceV3RetainedState;
        };
        if (legacyFallback?.hasLegacyData) {
          const rawV2 = await readLegacyV2RawRecords(
            database,
            activeNamespace,
          );
          const retained = createEmptyWorkbenchPersistenceV3RetainedState();
          retained.legacyRawRecords = [
            ...rawV2.rawRecords,
            ...legacyFallback.recoveryDiagnostics.map((diagnostic) => ({
              sourceStore: 'legacy-runtime-recovery',
              fileId: diagnostic.fileId,
              scope: diagnostic.scope,
              status: diagnostic.status,
              reason: diagnostic.reason,
              recovery: diagnostic.recovery,
              ...(
                diagnostic.scope === 'free-domain'
                  ? {
                      domain: diagnostic.domain,
                      sourceVersion: diagnostic.sourceVersion,
                      ...(diagnostic.fieldPath === undefined
                        ? {}
                        : { fieldPath: diagnostic.fieldPath }),
                    }
                  : {}
              ),
              raw: structuredClone(diagnostic.raw),
            })),
          ];
          const capturedAtMs = Date.now();
          const committed =
            await commitWorkbenchPersistenceV3ProductionSnapshot({
              store:
                new IndexedDbWorkbenchPersistenceV3GenerationStore(database),
              namespace: activeNamespace,
              generationId:
                createPersistenceV3GenerationId(capturedAtMs),
              capturedAtMs,
              snapshot: {
                files: legacyFallback.session.files,
                closedFiles: legacyFallback.closedFiles,
                activeFileId: legacyFallback.session.activeFileId,
                selectedPanel: legacyFallback.session.selectedPanel,
              },
              retained,
            });
          recovered = {
            session: legacyFallback.session,
            closedFiles: legacyFallback.closedFiles,
            retained: committed.retained,
          };
        } else {
          recovered = await salvageLegacyV2WorkspaceIntoV3(
            database,
            activeNamespace,
          );
        }
        installBootstrap(recovered.session, recovered.closedFiles, null);
        retainedPersistenceV3StateByNamespace.set(
          activeNamespace,
          recovered.retained,
        );
        markPersistenceReady();
        console.warn(
          '[Workbench persistence] Opened a writable V3 safe workspace while preserving unreadable source records.',
        );
        return {
          namespace: activeNamespace,
          migratedLegacyStorage: false,
          error,
        };
      } catch (recoveryCause) {
        console.error(
          '[Workbench persistence] V3 safe-workspace recovery failed.',
          recoveryCause,
        );
      }
    }
    const fallback = legacyFallback?.hasLegacyData
      ? legacyFallback
      : {
          session: createWorkbenchSessionFromRuntimeFiles({
            files: [],
            activeFileId: '',
            selectedPanel: 'preview',
          }),
          closedFiles: [],
          refreshSession: null,
        };
    installBootstrap(fallback.session, fallback.closedFiles, fallback.refreshSession);
    console.error('[Workbench persistence] IndexedDB initialization failed.', error);
    return { namespace: activeNamespace, migratedLegacyStorage: false, error };
  }
};

export const initializeWorkbenchIndexedDbPersistence = (): Promise<WorkbenchPersistenceBootstrapResult> => {
  if (initializationPromise) return initializationPromise;
  publishPersistenceInitializationStage('starting');
  const sharedInitialization = performWorkbenchIndexedDbInitialization()
    .then((result) => {
      publishPersistenceInitializationStage(result.error ? 'failed' : 'complete');
      return result;
    })
    .finally(() => {
      if (initializationPromise === sharedInitialization) initializationPromise = null;
    });
  initializationPromise = sharedInitialization;
  return sharedInitialization;
};

export const getActiveWorkbenchPersistenceNamespace = () => activeNamespace;
