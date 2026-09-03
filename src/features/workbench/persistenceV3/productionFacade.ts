import type {
  WorkbenchFileState,
} from '../workbenchFileUnion.ts';
import type {
  WorkbenchPanelKey,
} from '../workbenchFileState.ts';
import {
  projectWorkbenchPersistenceV3File,
} from './projection.ts';
import {
  decodeWorkbenchPersistenceV3WorkspaceRecord,
  encodeWorkbenchPersistenceV3WorkspaceProjection,
  reprojectWorkbenchPersistenceV3Workspace,
  type WorkbenchPersistenceV3PreservedWorkspaceEntry,
  type WorkbenchPersistenceV3WorkspaceEntry,
  type WorkbenchPersistenceV3WorkspaceProjection,
  type WorkbenchPersistenceV3WorkspaceRecord,
} from './workspaceCodec.ts';
import {
  WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER,
} from './fingerprint.ts';
import type {
  WorkbenchPersistenceV3GenerationStore,
  WorkbenchPersistenceV3StoredGeneration,
} from './generationStore.ts';

export const WORKBENCH_PERSISTENCE_V3_PRODUCTION_CONTENT_FAMILY =
  'hard-sphere-lab/workspace-generation-content-v3' as const;
export const WORKBENCH_PERSISTENCE_V3_PRODUCTION_CONTENT_VERSION = 1 as const;

export interface WorkbenchPersistenceV3OpaqueFile {
  fileId: string;
  location: 'open' | 'closed';
  raw: unknown;
  diagnostics: unknown[];
}

export interface WorkbenchPersistenceV3ProductionContent {
  schemaFamily: typeof WORKBENCH_PERSISTENCE_V3_PRODUCTION_CONTENT_FAMILY;
  schemaVersion: typeof WORKBENCH_PERSISTENCE_V3_PRODUCTION_CONTENT_VERSION;
  workspace: WorkbenchPersistenceV3WorkspaceRecord;
  openFileIds: string[];
  closedFileIds: string[];
  opaqueFiles: WorkbenchPersistenceV3OpaqueFile[];
  legacyRawRecords: unknown[];
}

export interface WorkbenchPersistenceV3ProductionSnapshot {
  files: WorkbenchFileState[];
  closedFiles: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

export interface WorkbenchPersistenceV3RetainedState {
  preservedEntries: WorkbenchPersistenceV3PreservedWorkspaceEntry[];
  preservedOpenFileIds: string[];
  preservedClosedFileIds: string[];
  opaqueFiles: WorkbenchPersistenceV3OpaqueFile[];
  legacyRawRecords: unknown[];
}

export interface WorkbenchPersistenceV3RestoredProductionWorkspace {
  files: WorkbenchFileState[];
  closedFiles: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
  retained: WorkbenchPersistenceV3RetainedState;
  generationId: string;
  usedPreviousGeneration: boolean;
}

const hasExactOwnKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
) => {
  const keys = Object.keys(value);
  return keys.length === expected.length &&
    expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const cloneValue = <Value>(value: Value): Value => structuredClone(value);

const emptyRetainedState = (): WorkbenchPersistenceV3RetainedState => ({
  preservedEntries: [],
  preservedOpenFileIds: [],
  preservedClosedFileIds: [],
  opaqueFiles: [],
  legacyRawRecords: [],
});

const mergeIds = (
  current: readonly string[],
  retained: readonly string[],
  excluded: ReadonlySet<string>,
) => [
  ...current,
  ...retained.filter((fileId) => (
    !excluded.has(fileId) && !current.includes(fileId)
  )),
];

const createProductionContent = (
  snapshot: WorkbenchPersistenceV3ProductionSnapshot,
  capturedAtMs: number,
  retained: WorkbenchPersistenceV3RetainedState,
): {
  content: WorkbenchPersistenceV3ProductionContent;
  retained: WorkbenchPersistenceV3RetainedState;
} => {
  const currentFiles = [...snapshot.files, ...snapshot.closedFiles];
  const currentIds = new Set(currentFiles.map((file) => file.id));
  if (
    currentIds.size !== currentFiles.length ||
    currentFiles.some((file) => (
      typeof file.id !== 'string' || file.id.trim().length === 0
    ))
  ) {
    throw new Error('Persistence V3 cannot save duplicate or empty file identities.');
  }

  const entries: WorkbenchPersistenceV3WorkspaceEntry[] = [];
  const opaqueFiles: WorkbenchPersistenceV3OpaqueFile[] = [];
  for (const [index, file] of currentFiles.entries()) {
    const projected = projectWorkbenchPersistenceV3File(file, index + 1);
    if (projected.ok) {
      entries.push({
        kind: 'decoded',
        fileId: file.id,
        sourceStatus: projected.status,
        projection: projected.value,
        diagnostics: projected.diagnostics,
      });
      continue;
    }
    opaqueFiles.push({
      fileId: file.id,
      location: snapshot.files.some((candidate) => candidate.id === file.id)
        ? 'open'
        : 'closed',
      raw: cloneValue(file),
      diagnostics: cloneValue(projected.diagnostics),
    });
  }

  const preservedEntries = retained.preservedEntries
    .filter((entry) => !currentIds.has(entry.fileId))
    .map(cloneValue);
  entries.push(...preservedEntries);
  opaqueFiles.push(
    ...retained.opaqueFiles
      .filter((entry) => !currentIds.has(entry.fileId))
      .map(cloneValue),
  );

  const preservedIds = new Set([
    ...preservedEntries.map((entry) => entry.fileId),
    ...opaqueFiles.map((entry) => entry.fileId),
  ]);
  const openFileIds = mergeIds(
    snapshot.files.map((file) => file.id),
    retained.preservedOpenFileIds,
    currentIds,
  ).filter((fileId) => currentIds.has(fileId) || preservedIds.has(fileId));
  const closedFileIds = mergeIds(
    snapshot.closedFiles.map((file) => file.id),
    retained.preservedClosedFileIds,
    new Set([...currentIds, ...openFileIds]),
  ).filter((fileId) => (
    !openFileIds.includes(fileId) &&
    (currentIds.has(fileId) || preservedIds.has(fileId))
  ));

  const projection: WorkbenchPersistenceV3WorkspaceProjection = {
    capturedAtMs,
    activeFileId: entries.some((entry) => entry.fileId === snapshot.activeFileId)
      ? snapshot.activeFileId
      : entries[0]?.fileId ?? null,
    selectedPanel: snapshot.selectedPanel,
    entries,
  };
  const encoded = encodeWorkbenchPersistenceV3WorkspaceProjection(projection);
  if (!encoded.ok) {
    throw new Error(
      encoded.diagnostics[0]?.message ??
        'Persistence V3 workspace encoding failed.',
    );
  }
  const nextRetained: WorkbenchPersistenceV3RetainedState = {
    preservedEntries,
    preservedOpenFileIds: openFileIds.filter((fileId) => (
      preservedIds.has(fileId)
    )),
    preservedClosedFileIds: closedFileIds.filter((fileId) => (
      preservedIds.has(fileId)
    )),
    opaqueFiles,
    legacyRawRecords: retained.legacyRawRecords.map(cloneValue),
  };
  return {
    content: {
      schemaFamily: WORKBENCH_PERSISTENCE_V3_PRODUCTION_CONTENT_FAMILY,
      schemaVersion: WORKBENCH_PERSISTENCE_V3_PRODUCTION_CONTENT_VERSION,
      workspace: encoded.value,
      openFileIds,
      closedFileIds,
      opaqueFiles,
      legacyRawRecords: nextRetained.legacyRawRecords,
    },
    retained: nextRetained,
  };
};

const decodeProductionContent = (
  value: unknown,
): WorkbenchPersistenceV3ProductionContent | null => {
  if (
    !isPlainRecord(value) ||
    !hasExactOwnKeys(value, [
      'schemaFamily',
      'schemaVersion',
      'workspace',
      'openFileIds',
      'closedFileIds',
      'opaqueFiles',
      'legacyRawRecords',
    ]) ||
    value.schemaFamily !== WORKBENCH_PERSISTENCE_V3_PRODUCTION_CONTENT_FAMILY ||
    value.schemaVersion !==
      WORKBENCH_PERSISTENCE_V3_PRODUCTION_CONTENT_VERSION ||
    !Array.isArray(value.openFileIds) ||
    !value.openFileIds.every((fileId) => typeof fileId === 'string') ||
    !Array.isArray(value.closedFileIds) ||
    !value.closedFileIds.every((fileId) => typeof fileId === 'string') ||
    new Set([...value.openFileIds, ...value.closedFileIds]).size !==
      value.openFileIds.length + value.closedFileIds.length ||
    !Array.isArray(value.opaqueFiles) ||
    !value.opaqueFiles.every((entry) => (
      isPlainRecord(entry) &&
      hasExactOwnKeys(entry, [
        'fileId',
        'location',
        'raw',
        'diagnostics',
      ]) &&
      typeof entry.fileId === 'string' &&
      (entry.location === 'open' || entry.location === 'closed') &&
      Array.isArray(entry.diagnostics)
    )) ||
    !Array.isArray(value.legacyRawRecords)
  ) {
    return null;
  }
  return cloneValue(
    value as unknown as WorkbenchPersistenceV3ProductionContent,
  );
};

const verifyStoredGeneration = async (
  generation: WorkbenchPersistenceV3StoredGeneration,
) => {
  const fingerprint =
    await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint(
      generation.content,
    );
  return fingerprint === generation.contentFingerprint;
};

export const commitWorkbenchPersistenceV3ProductionSnapshot = async ({
  store,
  namespace,
  generationId,
  capturedAtMs,
  snapshot,
  retained = emptyRetainedState(),
}: {
  store: WorkbenchPersistenceV3GenerationStore;
  namespace: string;
  generationId: string;
  capturedAtMs: number;
  snapshot: WorkbenchPersistenceV3ProductionSnapshot;
  retained?: WorkbenchPersistenceV3RetainedState;
}) => {
  const prepared = createProductionContent(
    snapshot,
    capturedAtMs,
    retained,
  );
  const contentFingerprint =
    await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint(
      prepared.content,
    );
  await store.stageCandidate({
    namespace,
    generationId,
    contentFingerprint,
    capturedAtMs,
    content: prepared.content,
  });
  const staged = await store.readGeneration(namespace, generationId);
  if (
    staged === null ||
    staged.contentFingerprint !== contentFingerprint ||
    !await verifyStoredGeneration(staged)
  ) {
    throw new Error('Persistence V3 staged generation read-back verification failed.');
  }

  let activated = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const head = await store.readHead(namespace);
    const result = await store.compareAndSwapHead({
      namespace,
      generationId,
      expectedRevision: head.revision,
    });
    if (result.ok) {
      activated = result.head;
      break;
    }
  }
  if (activated === null) {
    throw new Error('Persistence V3 generation head changed repeatedly during save.');
  }
  const committed = await store.readGeneration(namespace, generationId);
  if (committed === null || !await verifyStoredGeneration(committed)) {
    throw new Error('Persistence V3 committed generation verification failed.');
  }
  await store.pruneGenerations(namespace, {
    retainGenerationIds: [
      activated.currentGenerationId,
      activated.previousGenerationId,
    ].filter((value): value is string => value !== null),
  });
  return {
    generation: committed,
    retained: prepared.retained,
  };
};

const restoreProductionGeneration = async (
  generation: WorkbenchPersistenceV3StoredGeneration,
): Promise<Omit<
  WorkbenchPersistenceV3RestoredProductionWorkspace,
  'usedPreviousGeneration'
> | null> => {
  if (!await verifyStoredGeneration(generation)) return null;
  const content = decodeProductionContent(generation.content);
  if (content === null) return null;
  const decoded = decodeWorkbenchPersistenceV3WorkspaceRecord(
    content.workspace,
  );
  if (!decoded.ok) return null;
  const runtime = reprojectWorkbenchPersistenceV3Workspace(decoded.value);
  if (!runtime.ok) return null;

  const fileById = new Map(runtime.value.files.map((file) => [file.id, file]));
  const files = content.openFileIds.flatMap((fileId) => {
    const file = fileById.get(fileId);
    return file === undefined ? [] : [file];
  });
  const closedFiles = content.closedFileIds.flatMap((fileId) => {
    const file = fileById.get(fileId);
    return file === undefined ? [] : [file];
  });
  for (const file of runtime.value.files) {
    if (
      !content.openFileIds.includes(file.id) &&
      !content.closedFileIds.includes(file.id)
    ) {
      files.push(file);
    }
  }
  const preservedEntries = decoded.value.entries
    .filter(
      (entry): entry is WorkbenchPersistenceV3PreservedWorkspaceEntry => (
        entry.kind === 'preserved'
      ),
    )
    .map(cloneValue);
  const preservedIds = new Set([
    ...preservedEntries.map((entry) => entry.fileId),
    ...content.opaqueFiles.map((entry) => entry.fileId),
  ]);
  return {
    files,
    closedFiles,
    activeFileId: files.some((file) => file.id === runtime.value.activeFileId)
      ? runtime.value.activeFileId
      : files[0]?.id ?? '',
    selectedPanel: runtime.value.selectedPanel,
    retained: {
      preservedEntries,
      preservedOpenFileIds: content.openFileIds.filter((fileId) => (
        preservedIds.has(fileId)
      )),
      preservedClosedFileIds: content.closedFileIds.filter((fileId) => (
        preservedIds.has(fileId)
      )),
      opaqueFiles: content.opaqueFiles.map(cloneValue),
      legacyRawRecords: content.legacyRawRecords.map(cloneValue),
    },
    generationId: generation.generationId,
  };
};

export const restoreWorkbenchPersistenceV3ProductionWorkspace = async (
  store: WorkbenchPersistenceV3GenerationStore,
  namespace: string,
): Promise<WorkbenchPersistenceV3RestoredProductionWorkspace | null> => {
  const head = await store.readHead(namespace);
  const headCandidates = [
    head.currentGenerationId,
    head.previousGenerationId,
  ].filter((value): value is string => value !== null);
  const generationIds = await store.listGenerationIds(namespace);
  const candidates = [
    ...headCandidates,
    ...generationIds.filter((generationId) => (
      !headCandidates.includes(generationId)
    )).reverse(),
  ];
  const unreadableGenerations: unknown[] = [];
  for (const generationId of candidates) {
    const generation = await store.readGeneration(namespace, generationId);
    if (generation === null) continue;
    let restored: Awaited<ReturnType<
      typeof restoreProductionGeneration
    >> = null;
    try {
      restored = await restoreProductionGeneration(generation);
    } catch {
      restored = null;
    }
    if (restored !== null) {
      return {
        ...restored,
        retained: {
          ...restored.retained,
          legacyRawRecords: [
            ...restored.retained.legacyRawRecords,
            ...unreadableGenerations,
          ],
        },
        usedPreviousGeneration:
          generationId !== head.currentGenerationId,
      };
    }
    unreadableGenerations.push({
      source: 'unreadable-persistence-v3-generation',
      raw: cloneValue(generation),
    });
  }
  return null;
};

export const createEmptyWorkbenchPersistenceV3RetainedState =
  emptyRetainedState;
