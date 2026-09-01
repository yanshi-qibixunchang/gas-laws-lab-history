import type {
  WorkbenchFileState,
  WorkbenchPanelKey,
} from '../workbenchState.ts';
import {
  WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
  createWorkbenchPersistenceV3Diagnostic,
  createWorkbenchPersistenceV3Failure,
  createWorkbenchPersistenceV3Success,
  type WorkbenchPersistenceV3DecodeResult,
  type WorkbenchPersistenceV3Diagnostic,
  type WorkbenchPersistenceV3Success,
} from './contract.ts';
import {
  WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY,
  decodeWorkbenchPersistenceV3FileRecord,
  encodeWorkbenchPersistenceV3FileProjection,
  type WorkbenchPersistenceV3FileRecord,
} from './codecRegistry.ts';
import {
  createWorkbenchPersistenceV3SemanticProjection,
  projectWorkbenchPersistenceV3File,
  reprojectWorkbenchPersistenceV3File,
  type WorkbenchPersistenceV3FileProjection,
} from './projection.ts';

const WORKBENCH_PANEL_KEYS = new Set<WorkbenchPanelKey>([
  'preview',
  'realtime',
  'results',
  'experimentPoints',
  'verification',
  'heatCapacityGuide',
  'heatCapacityRecords',
  'heatCapacityReview',
  'history',
]);

export interface WorkbenchPersistenceV3DecodedWorkspaceEntry {
  kind: 'decoded';
  fileId: string;
  sourceStatus: WorkbenchPersistenceV3Success<unknown>['status'];
  projection: WorkbenchPersistenceV3FileProjection;
  diagnostics: WorkbenchPersistenceV3Diagnostic[];
}

export interface WorkbenchPersistenceV3PreservedWorkspaceEntry {
  kind: 'preserved';
  fileId: string;
  status: 'unsupported-future' | 'quarantined';
  raw: unknown;
  diagnostics: WorkbenchPersistenceV3Diagnostic[];
}

export type WorkbenchPersistenceV3WorkspaceEntry =
  | WorkbenchPersistenceV3DecodedWorkspaceEntry
  | WorkbenchPersistenceV3PreservedWorkspaceEntry;

export interface WorkbenchPersistenceV3WorkspaceProjection {
  capturedAtMs: number;
  activeFileId: string | null;
  selectedPanel: WorkbenchPanelKey;
  entries: WorkbenchPersistenceV3WorkspaceEntry[];
}

export interface WorkbenchPersistenceV3WorkspaceRecord {
  [key: string]: unknown;
  schemaFamily: typeof WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY;
  schemaVersion: typeof WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION;
  capturedAtMs: number;
  manifest: {
    activeFileId: string | null;
    selectedPanel: WorkbenchPanelKey;
    fileOrder: string[];
  };
  records: unknown[];
}

export interface WorkbenchPersistenceV3RuntimeWorkspace {
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

export type WorkbenchPersistenceV3ForeignFileDecoder = (
  raw: unknown,
  index: number,
) => WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3FileProjection> | null;

export interface WorkbenchPersistenceV3WorkspaceDecodeOptions {
  decodeCurrentFileRecord?: WorkbenchPersistenceV3ForeignFileDecoder;
  decodeForeignFileRecord?: WorkbenchPersistenceV3ForeignFileDecoder;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasExactOwnKeys = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) => {
  const ownKeys = Object.keys(value);
  return ownKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const WORKSPACE_RECORD_KEYS = [
  'schemaFamily',
  'schemaVersion',
  'capturedAtMs',
  'manifest',
  'records',
] as const;

const WORKSPACE_MANIFEST_KEYS = [
  'activeFileId',
  'selectedPanel',
  'fileOrder',
] as const;

const WORKSPACE_PROJECTION_KEYS = [
  'capturedAtMs',
  'activeFileId',
  'selectedPanel',
  'entries',
] as const;

const DECODED_WORKSPACE_ENTRY_KEYS = [
  'kind',
  'fileId',
  'sourceStatus',
  'projection',
  'diagnostics',
] as const;

const PRESERVED_WORKSPACE_ENTRY_KEYS = [
  'kind',
  'fileId',
  'status',
  'raw',
  'diagnostics',
] as const;

const isValidWorkspaceEntryShape = (
  value: unknown,
): value is WorkbenchPersistenceV3WorkspaceEntry => {
  if (
    !isPlainRecord(value) ||
    typeof value.fileId !== 'string' ||
    value.fileId.trim().length === 0 ||
    !Array.isArray(value.diagnostics)
  ) {
    return false;
  }
  if (value.kind === 'decoded') {
    return (
      hasExactOwnKeys(value, DECODED_WORKSPACE_ENTRY_KEYS) &&
      (
        value.sourceStatus === 'exact' ||
        value.sourceStatus === 'migrated' ||
        value.sourceStatus === 'repaired-cache'
      ) &&
      isPlainRecord(value.projection)
    );
  }
  if (value.kind === 'preserved') {
    return (
      hasExactOwnKeys(value, PRESERVED_WORKSPACE_ENTRY_KEYS) &&
      (
        value.status === 'unsupported-future' ||
        value.status === 'quarantined'
      ) &&
      Object.prototype.hasOwnProperty.call(value, 'raw')
    );
  }
  return false;
};

const isFiniteNonNegative = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
);

const isPanelKey = (value: unknown): value is WorkbenchPanelKey => (
  typeof value === 'string' &&
  WORKBENCH_PANEL_KEYS.has(value as WorkbenchPanelKey)
);

const cloneValue = <T>(value: T): T => structuredClone(value);

interface WorkspaceDiagnosticOptions {
  status?: 'unsupported-future' | 'quarantined';
  phase: 'decode' | 'encode' | 'migration' | 'restore';
  category:
    | 'schema-version'
    | 'schema-shape'
    | 'identity'
    | 'relationship'
    | 'unsupported-future'
    | 'derived-cache';
  code: string;
  message: string;
  fieldPath?: string;
  fileId?: string;
  sourceVersion?: number;
  severity?: WorkbenchPersistenceV3Diagnostic['severity'];
}

const createWorkspaceDiagnostic = ({
  status,
  phase,
  category,
  code,
  message,
  fieldPath,
  fileId,
  sourceVersion,
  severity = category === 'derived-cache' ? 'warning' : 'error',
}: WorkspaceDiagnosticOptions) => createWorkbenchPersistenceV3Diagnostic({
  severity,
  phase,
  category,
  code,
  message,
  aggregate: fileId
    ? {
        kind: 'file-header',
        id: fileId,
        fileId,
      }
    : {
        kind: 'workspace-manifest',
        id: 'workspace',
      },
  retry: status === 'unsupported-future' ? 'manual' : 'never',
  recovery: fileId ? 'quarantine-file' : 'read-only-workspace',
  fieldPath,
  sourceVersion,
  supportedVersion: sourceVersion === undefined
    ? undefined
    : WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
});

const workspaceFailure = (
  status: 'unsupported-future' | 'quarantined',
  raw: unknown,
  options: Omit<WorkspaceDiagnosticOptions, 'status'>,
) => createWorkbenchPersistenceV3Failure(status, raw, [
  createWorkspaceDiagnostic({
    ...options,
    status,
  }),
]);

const preserveFileFailure = (
  fileId: string,
  raw: unknown,
  result: Extract<
    WorkbenchPersistenceV3DecodeResult<unknown>,
    { ok: false }
  >,
): WorkbenchPersistenceV3PreservedWorkspaceEntry => ({
  kind: 'preserved',
  fileId,
  status: result.status,
  raw,
  diagnostics: result.diagnostics,
});

const getRecordIdentity = (
  raw: unknown,
) => {
  if (!isPlainRecord(raw)) return null;
  if (typeof raw.fileId === 'string') return raw.fileId;
  if (typeof raw.id === 'string') return raw.id;
  return null;
};

const decodeWorkspaceFileRecord = (
  raw: unknown,
  manifestFileId: string,
  index: number,
  decodeCurrentFileRecord?: WorkbenchPersistenceV3ForeignFileDecoder,
  decodeForeignFileRecord?: WorkbenchPersistenceV3ForeignFileDecoder,
): WorkbenchPersistenceV3WorkspaceEntry => {
  if (!isPlainRecord(raw)) {
    const diagnostic = createWorkspaceDiagnostic({
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-workspace-file-record-not-object',
      message: 'A workspace file record must be a plain object.',
      fieldPath: `records[${index}]`,
      fileId: manifestFileId,
    });
    return {
      kind: 'preserved',
      fileId: manifestFileId,
      status: 'quarantined',
      raw,
      diagnostics: [diagnostic],
    };
  }
  const recordFileId = getRecordIdentity(raw);
  if (recordFileId !== manifestFileId) {
    const diagnostic = createWorkspaceDiagnostic({
      phase: 'decode',
      category: 'relationship',
      code: 'persistence-v3-workspace-file-order-identity-mismatch',
      message: 'The workspace file order does not match the record identity.',
      fieldPath: `manifest.fileOrder[${index}]`,
      fileId: manifestFileId,
    });
    return {
      kind: 'preserved',
      fileId: manifestFileId,
      status: 'quarantined',
      raw,
      diagnostics: [diagnostic],
    };
  }

  const decoded = raw.schemaFamily ===
      WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY
    ? decodeCurrentFileRecord?.(raw, index + 1) ??
      decodeWorkbenchPersistenceV3FileRecord(raw, index + 1)
    : decodeForeignFileRecord?.(raw, index + 1) ??
      createWorkbenchPersistenceV3Failure('quarantined', raw, [
        createWorkspaceDiagnostic({
          phase: 'decode',
          category: 'schema-shape',
          code: 'persistence-v3-workspace-file-family-unsupported',
          message:
            'The workspace file record is not a current V3 file record.',
          fieldPath: `records[${index}].schemaFamily`,
          fileId: manifestFileId,
        }),
      ]);
  if (decoded.ok === false) {
    return preserveFileFailure(manifestFileId, raw, decoded);
  }
  return {
    kind: 'decoded',
    fileId: manifestFileId,
    sourceStatus: decoded.status,
    projection: decoded.value,
    diagnostics: decoded.diagnostics,
  };
};

interface WorkspaceSource {
  capturedAtMs: number;
  activeFileId: string | null;
  selectedPanel: WorkbenchPanelKey;
  fileOrder: string[];
  records: unknown[];
}

const readCurrentWorkspaceSource = (
  raw: Record<string, unknown>,
): WorkbenchPersistenceV3DecodeResult<WorkspaceSource> => {
  const version = raw.schemaVersion;
  if (!Number.isInteger(version) || (version as number) < 1) {
    return workspaceFailure('quarantined', raw, {
      phase: 'decode',
      category: 'schema-version',
      code: 'persistence-v3-workspace-version-missing-or-invalid',
      message: 'The V3 workspace schema version is missing or invalid.',
      fieldPath: 'schemaVersion',
    });
  }
  if ((version as number) > WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION) {
    return workspaceFailure('unsupported-future', raw, {
      phase: 'decode',
      category: 'unsupported-future',
      code: 'persistence-v3-workspace-version-future',
      message: 'The workspace record requires a newer application.',
      fieldPath: 'schemaVersion',
      sourceVersion: version as number,
    });
  }
  if (
    !hasExactOwnKeys(raw, WORKSPACE_RECORD_KEYS) ||
    !isPlainRecord(raw.manifest) ||
    !hasExactOwnKeys(raw.manifest, WORKSPACE_MANIFEST_KEYS)
  ) {
    return workspaceFailure('quarantined', raw, {
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-workspace-envelope-keys-invalid',
      message:
        'The V3 workspace record or manifest contains unknown or missing fields.',
      fieldPath: '$',
    });
  }
  if (
    !isFiniteNonNegative(raw.capturedAtMs) ||
    !isPlainRecord(raw.manifest) ||
    !Array.isArray(raw.records)
  ) {
    return workspaceFailure('quarantined', raw, {
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-workspace-shape-invalid',
      message: 'The V3 workspace record shape is invalid.',
      fieldPath: '$',
    });
  }
  const manifest = raw.manifest;
  if (
    !Array.isArray(manifest.fileOrder) ||
    !manifest.fileOrder.every((id) => (
      typeof id === 'string' && id.trim().length > 0
    )) ||
    new Set(manifest.fileOrder).size !== manifest.fileOrder.length ||
    manifest.fileOrder.length !== raw.records.length
  ) {
    return workspaceFailure('quarantined', raw, {
      phase: 'decode',
      category: 'relationship',
      code: 'persistence-v3-workspace-manifest-invalid',
      message: 'The V3 workspace manifest order or identity is invalid.',
      fieldPath: 'manifest.fileOrder',
    });
  }
  const fileOrder = [...manifest.fileOrder] as string[];
  const selectedPanel = isPanelKey(manifest.selectedPanel)
    ? manifest.selectedPanel
    : 'preview';
  const activeFileId =
    typeof manifest.activeFileId === 'string' &&
    manifest.activeFileId.trim().length > 0 &&
    fileOrder.includes(manifest.activeFileId)
      ? manifest.activeFileId
      : fileOrder[0] ?? null;
  const repaired = selectedPanel !== manifest.selectedPanel ||
    activeFileId !== manifest.activeFileId;
  const diagnostics = repaired
    ? [createWorkspaceDiagnostic({
        phase: 'decode',
        category: 'derived-cache',
        code: 'persistence-v3-workspace-ui-checkpoint-repaired',
        message:
          'The workspace selection checkpoint was repaired without changing file records.',
        fieldPath: selectedPanel !== manifest.selectedPanel
          ? 'manifest.selectedPanel'
          : 'manifest.activeFileId',
        severity: 'warning',
      })]
    : [];
  return createWorkbenchPersistenceV3Success(
    repaired ? 'repaired-cache' : 'exact',
    {
      capturedAtMs: raw.capturedAtMs,
      activeFileId,
      selectedPanel,
      fileOrder,
      records: [...raw.records],
    },
    diagnostics,
  );
};

export const decodeWorkbenchPersistenceV3WorkspaceRecord = (
  raw: unknown,
  options: WorkbenchPersistenceV3WorkspaceDecodeOptions = {},
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3WorkspaceProjection> => {
  if (!isPlainRecord(raw)) {
    return workspaceFailure('quarantined', raw, {
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-workspace-not-object',
      message: 'A workspace persistence record must be a plain object.',
      fieldPath: '$',
    });
  }
  if (raw.schemaFamily !== WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY) {
    return workspaceFailure('quarantined', raw, {
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-workspace-family-invalid',
      message: 'The workspace record is not a current V3 workspace.',
      fieldPath: 'schemaFamily',
    });
  }
  const source = readCurrentWorkspaceSource(raw);
  if (source.ok === false) return source;

  const entries = source.value.records.map((record, index) => (
    decodeWorkspaceFileRecord(
      record,
      source.value.fileOrder[index]!,
      index,
      options.decodeCurrentFileRecord,
      options.decodeForeignFileRecord,
    )
  ));
  const diagnostics = [
    ...source.diagnostics,
    ...entries.flatMap((entry) => entry.diagnostics),
  ];
  const hasMigrated = source.status === 'migrated' ||
    entries.some((entry) => (
      entry.kind === 'decoded' && entry.sourceStatus === 'migrated'
    ));
  const hasRepair = source.status === 'repaired-cache' ||
    entries.some((entry) => (
    entry.kind === 'preserved' ||
    (
      entry.kind === 'decoded' &&
      entry.sourceStatus === 'repaired-cache'
    )
  ));
  return createWorkbenchPersistenceV3Success(
    hasMigrated ? 'migrated' : hasRepair ? 'repaired-cache' : 'exact',
    {
      capturedAtMs: source.value.capturedAtMs,
      activeFileId: source.value.activeFileId,
      selectedPanel: source.value.selectedPanel,
      entries,
    },
    diagnostics,
  );
};

export const projectWorkbenchPersistenceV3Workspace = (
  runtime: WorkbenchPersistenceV3RuntimeWorkspace,
  capturedAtMs: number,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3WorkspaceProjection> => {
  if (
    !isFiniteNonNegative(capturedAtMs) ||
    !Array.isArray(runtime.files) ||
    runtime.files.some((file) => (
      typeof file.id !== 'string' || file.id.trim().length === 0
    )) ||
    new Set(runtime.files.map((file) => file.id)).size !==
      runtime.files.length
  ) {
    return workspaceFailure('quarantined', runtime, {
      phase: 'encode',
      category: 'identity',
      code: 'persistence-v3-runtime-workspace-identity-invalid',
      message:
        'The runtime workspace has an invalid capture time or duplicate file identity.',
      fieldPath: !isFiniteNonNegative(capturedAtMs)
        ? 'capturedAtMs'
        : 'files',
    });
  }

  const entries: WorkbenchPersistenceV3DecodedWorkspaceEntry[] = [];
  const diagnostics: WorkbenchPersistenceV3Diagnostic[] = [];
  let migrated = false;
  let repaired = false;
  for (const [index, file] of runtime.files.entries()) {
    const projected = projectWorkbenchPersistenceV3File(
      file,
      index + 1,
    );
    if (projected.ok === false) {
      return createWorkbenchPersistenceV3Failure(
        projected.status,
        runtime,
        projected.diagnostics,
      );
    }
    entries.push({
      kind: 'decoded',
      fileId: file.id,
      sourceStatus: projected.status,
      projection: projected.value,
      diagnostics: projected.diagnostics,
    });
    diagnostics.push(...projected.diagnostics);
    migrated = migrated || projected.status === 'migrated';
    repaired = repaired || projected.status === 'repaired-cache';
  }

  const selectedPanel = isPanelKey(runtime.selectedPanel)
    ? runtime.selectedPanel
    : 'preview';
  const activeFileId = runtime.files.some((file) => (
    file.id === runtime.activeFileId
  ))
    ? runtime.activeFileId
    : runtime.files[0]?.id ?? null;
  if (
    selectedPanel !== runtime.selectedPanel ||
    activeFileId !== runtime.activeFileId
  ) {
    repaired = true;
    diagnostics.push(createWorkspaceDiagnostic({
      phase: 'encode',
      category: 'derived-cache',
      code: 'persistence-v3-runtime-workspace-ui-repaired',
      message:
        'The runtime workspace selection checkpoint was repaired without changing file data.',
      fieldPath: selectedPanel !== runtime.selectedPanel
        ? 'selectedPanel'
        : 'activeFileId',
      severity: 'warning',
    }));
  }

  return createWorkbenchPersistenceV3Success(
    migrated ? 'migrated' : repaired ? 'repaired-cache' : 'exact',
    {
      capturedAtMs,
      activeFileId,
      selectedPanel,
      entries,
    },
    diagnostics,
  );
};

export const encodeWorkbenchPersistenceV3WorkspaceProjection = (
  projection: WorkbenchPersistenceV3WorkspaceProjection,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3WorkspaceRecord> => {
  if (
    !isPlainRecord(projection) ||
    !hasExactOwnKeys(projection, WORKSPACE_PROJECTION_KEYS) ||
    !isFiniteNonNegative(projection.capturedAtMs) ||
    !Array.isArray(projection.entries) ||
    !projection.entries.every(isValidWorkspaceEntryShape) ||
    new Set(projection.entries.map((entry) => entry.fileId)).size !==
      projection.entries.length
  ) {
    return workspaceFailure('quarantined', projection, {
      phase: 'encode',
      category: 'schema-shape',
      code: 'persistence-v3-workspace-projection-invalid',
      message: 'The workspace projection is invalid.',
      fieldPath: '$',
    });
  }
  const records: unknown[] = [];
  const diagnostics: WorkbenchPersistenceV3Diagnostic[] = [];
  let migrated = false;
  let repaired = false;
  for (const [index, entry] of projection.entries.entries()) {
    if (entry.kind === 'preserved') {
      const rawFileId = getRecordIdentity(entry.raw);
      if (rawFileId !== null && rawFileId !== entry.fileId) {
        return workspaceFailure('quarantined', projection, {
          phase: 'encode',
          category: 'relationship',
          code: 'persistence-v3-preserved-entry-identity-mismatch',
          message:
            'A preserved workspace entry does not match its raw file identity.',
          fieldPath: `entries[${index}].fileId`,
          fileId: entry.fileId,
        });
      }
      try {
        records.push(cloneValue(entry.raw));
      } catch (error) {
        return workspaceFailure('quarantined', projection, {
          phase: 'encode',
          category: 'schema-shape',
          code: 'persistence-v3-preserved-file-not-cloneable',
          message: error instanceof Error
            ? error.message
            : 'A preserved file record cannot be cloned.',
          fieldPath: `entries[${index}].raw`,
          fileId: entry.fileId,
        });
      }
      diagnostics.push(...entry.diagnostics);
      repaired = true;
      continue;
    }
    if (entry.fileId !== entry.projection.fileId) {
      return workspaceFailure('quarantined', projection, {
        phase: 'encode',
        category: 'relationship',
        code: 'persistence-v3-decoded-entry-identity-mismatch',
        message:
          'A decoded workspace entry does not match its file projection identity.',
        fieldPath: `entries[${index}].fileId`,
        fileId: entry.fileId,
      });
    }
    const encoded = encodeWorkbenchPersistenceV3FileProjection(
      entry.projection,
      index + 1,
    );
    if (encoded.ok === false) {
      return createWorkbenchPersistenceV3Failure(
        encoded.status,
        projection,
        encoded.diagnostics,
      );
    }
    records.push(encoded.value);
    diagnostics.push(...encoded.diagnostics);
    migrated = migrated || entry.sourceStatus === 'migrated' ||
      encoded.status === 'migrated';
    repaired = repaired || entry.sourceStatus === 'repaired-cache' ||
      encoded.status === 'repaired-cache';
  }
  const selectedPanel = isPanelKey(projection.selectedPanel)
    ? projection.selectedPanel
    : 'preview';
  const activeFileId = projection.activeFileId !== null &&
      projection.entries.some((entry) => entry.fileId === projection.activeFileId)
    ? projection.activeFileId
    : projection.entries[0]?.fileId ?? null;
  if (
    selectedPanel !== projection.selectedPanel ||
    activeFileId !== projection.activeFileId
  ) {
    repaired = true;
    diagnostics.push(createWorkspaceDiagnostic({
      phase: 'encode',
      category: 'derived-cache',
      code: 'persistence-v3-workspace-projection-ui-repaired',
      message:
        'The workspace selection checkpoint was repaired before encoding.',
      fieldPath: selectedPanel !== projection.selectedPanel
        ? 'selectedPanel'
        : 'activeFileId',
      severity: 'warning',
    }));
  }
  return createWorkbenchPersistenceV3Success(
    migrated ? 'migrated' : repaired ? 'repaired-cache' : 'exact',
    {
      schemaFamily: WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
      schemaVersion: WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
      capturedAtMs: projection.capturedAtMs,
      manifest: {
        activeFileId,
        selectedPanel,
        fileOrder: projection.entries.map((entry) => entry.fileId),
      },
      records,
    },
    diagnostics,
  );
};

export const reprojectWorkbenchPersistenceV3Workspace = (
  projection: WorkbenchPersistenceV3WorkspaceProjection,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3RuntimeWorkspace> => {
  if (
    !isPlainRecord(projection) ||
    !hasExactOwnKeys(projection, WORKSPACE_PROJECTION_KEYS) ||
    !Array.isArray(projection.entries) ||
    !projection.entries.every(isValidWorkspaceEntryShape)
  ) {
    return workspaceFailure('quarantined', projection, {
      phase: 'restore',
      category: 'schema-shape',
      code: 'persistence-v3-workspace-projection-envelope-invalid',
      message:
        'The workspace projection or one of its entries contains unknown fields.',
      fieldPath: '$',
    });
  }
  const files: WorkbenchFileState[] = [];
  const diagnostics: WorkbenchPersistenceV3Diagnostic[] = [];
  let migrated = false;
  let repaired = false;
  for (const [index, entry] of projection.entries.entries()) {
    if (entry.kind === 'preserved') {
      diagnostics.push(...entry.diagnostics);
      repaired = true;
      continue;
    }
    const file = reprojectWorkbenchPersistenceV3File(
      entry.projection,
      index + 1,
    );
    if (file.ok === false) {
      return createWorkbenchPersistenceV3Failure(
        file.status,
        entry.projection,
        file.diagnostics,
      );
    }
    files.push(file.value);
    diagnostics.push(...entry.diagnostics, ...file.diagnostics);
    migrated = migrated || entry.sourceStatus === 'migrated' ||
      file.status === 'migrated';
    repaired = repaired || entry.sourceStatus === 'repaired-cache' ||
      file.status === 'repaired-cache';
  }
  const activeFileId = files.some((file) => (
    file.id === projection.activeFileId
  ))
    ? projection.activeFileId ?? ''
    : files[0]?.id ?? '';
  return createWorkbenchPersistenceV3Success(
    migrated ? 'migrated' : repaired ? 'repaired-cache' : 'exact',
    {
      files,
      activeFileId,
      selectedPanel: projection.selectedPanel,
    },
    diagnostics,
  );
};

export const createWorkbenchPersistenceV3WorkspaceSemanticProjection = (
  projection: WorkbenchPersistenceV3WorkspaceProjection,
) => ({
  activeFileId: projection.activeFileId,
  entries: projection.entries.map((entry) => (
    entry.kind === 'decoded'
      ? {
          kind: entry.kind,
          fileId: entry.fileId,
          semantic: createWorkbenchPersistenceV3SemanticProjection(
            entry.projection,
          ),
        }
      : {
          kind: entry.kind,
          fileId: entry.fileId,
          status: entry.status,
          raw: cloneValue(entry.raw),
        }
  )),
});

export type {
  WorkbenchPersistenceV3FileRecord,
};
