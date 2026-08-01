import {
  WORKBENCH_FILE_KINDS,
  isWorkbenchFileKind,
  type WorkbenchFileKind,
} from '../workbenchFileKind.ts';
import {
  createWorkbenchPersistenceV3Diagnostic,
  createWorkbenchPersistenceV3Failure,
  createWorkbenchPersistenceV3Success,
  type WorkbenchPersistenceV3DecodeResult,
  type WorkbenchPersistenceV3Diagnostic,
  type WorkbenchPersistenceV3DiagnosticCategory,
  type WorkbenchPersistenceV3DiagnosticPhase,
  type WorkbenchPersistenceV3Success,
} from './contract.ts';
import {
  WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
  areWorkbenchPersistenceV3ProjectionFieldClassesEqual,
  cloneWorkbenchPersistenceV3FileProjection,
  getWorkbenchPersistenceV3AggregateKindForFileKind,
  isWorkbenchPersistenceV3AuthoritativeCacheRepairAllowed,
  isWorkbenchPersistenceV3AuthoritativeMigrationAllowed,
  projectWorkbenchPersistenceV3File,
  reprojectWorkbenchPersistenceV3File,
  type WorkbenchPersistenceV3FileProjection,
} from './projection.ts';

export const WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY =
  'hard-sphere-lab.persistence-v3.file' as const;
export const WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_VERSION = 1 as const;

export interface WorkbenchPersistenceV3FileRecord {
  [key: string]: unknown;
  schemaFamily: typeof WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY;
  schemaVersion: typeof WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_VERSION;
  aggregateKind: WorkbenchPersistenceV3FileProjection['aggregateKind'];
  fileKind: WorkbenchFileKind;
  fileId: string;
  projection: WorkbenchPersistenceV3FileProjection;
}

export interface WorkbenchPersistenceV3FileCodec<
  Kind extends WorkbenchFileKind = WorkbenchFileKind,
> {
  readonly kind: Kind;
  readonly aggregateKind:
    WorkbenchPersistenceV3FileProjection['aggregateKind'];
  readonly projectionVersion:
    typeof WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION;
}

type WorkbenchPersistenceV3FileCodecRegistry = {
  [Kind in WorkbenchFileKind]: WorkbenchPersistenceV3FileCodec<Kind>;
};

export const WORKBENCH_PERSISTENCE_V3_FILE_CODECS = {
  standard: {
    kind: 'standard',
    aggregateKind: 'standard-document',
    projectionVersion: WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
  },
  ideal: {
    kind: 'ideal',
    aggregateKind: 'ideal-document',
    projectionVersion: WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
  },
  heatCapacity: {
    kind: 'heatCapacity',
    aggregateKind: 'heat-capacity-document',
    projectionVersion: WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
  },
  heatCapacityPistonOscillation: {
    kind: 'heatCapacityPistonOscillation',
    aggregateKind: 'piston-oscillation-document',
    projectionVersion: WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
  },
} satisfies WorkbenchPersistenceV3FileCodecRegistry;

export const WORKBENCH_REGISTERED_PERSISTENCE_V3_FILE_KINDS =
  WORKBENCH_FILE_KINDS.map((kind) => (
    WORKBENCH_PERSISTENCE_V3_FILE_CODECS[kind].kind
  ));

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

const WORKBENCH_PERSISTENCE_V3_FILE_RECORD_KEYS = [
  'schemaFamily',
  'schemaVersion',
  'aggregateKind',
  'fileKind',
  'fileId',
  'projection',
] as const;

const WORKBENCH_PERSISTENCE_V3_PROJECTION_KEYS = [
  'projectionVersion',
  'fileId',
  'fileKind',
  'aggregateKind',
  'fields',
] as const;

const WORKBENCH_PERSISTENCE_V3_FIELD_CLASS_KEYS = [
  'authoritative',
  'relation',
  'derived',
  'quality',
  'uiCheckpoint',
] as const;

interface DiagnosticOptions {
  phase: WorkbenchPersistenceV3DiagnosticPhase;
  category: WorkbenchPersistenceV3DiagnosticCategory;
  code: string;
  message: string;
  fileId?: string;
  fileKind?: WorkbenchFileKind;
  fieldPath?: string;
  sourceVersion?: number;
  retry?: WorkbenchPersistenceV3Diagnostic['retry'];
  recovery?: WorkbenchPersistenceV3Diagnostic['recovery'];
  severity?: WorkbenchPersistenceV3Diagnostic['severity'];
}

const createFileCodecDiagnostic = ({
  phase,
  category,
  code,
  message,
  fileId = 'unknown',
  fileKind,
  fieldPath,
  sourceVersion,
  retry = category === 'unsupported-future' ? 'manual' : 'never',
  recovery = 'quarantine-file',
  severity = category === 'derived-cache' ? 'warning' : 'error',
}: DiagnosticOptions) => createWorkbenchPersistenceV3Diagnostic({
  severity,
  phase,
  category,
  code,
  message,
  aggregate: fileKind
    ? {
        kind: getWorkbenchPersistenceV3AggregateKindForFileKind(fileKind),
        id: fileId,
        fileId,
        fileKind,
      }
    : {
        kind: 'file-header',
        id: fileId,
        fileId,
      },
  retry,
  recovery,
  fieldPath,
  sourceVersion,
  supportedVersion: category === 'schema-version' ||
      category === 'unsupported-future'
    ? WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_VERSION
    : undefined,
});

const createCodecFailure = (
  status: 'unsupported-future' | 'quarantined',
  raw: unknown,
  options: DiagnosticOptions,
) => createWorkbenchPersistenceV3Failure(
  status,
  raw,
  [createFileCodecDiagnostic(options)],
);

const preserveNestedFailure = (
  raw: unknown,
  result: Extract<
    WorkbenchPersistenceV3DecodeResult<unknown>,
    { ok: false }
  >,
) => createWorkbenchPersistenceV3Failure(
  result.status,
  raw,
  result.diagnostics,
);

interface CanonicalProjectionResult {
  projection: WorkbenchPersistenceV3FileProjection;
  status: WorkbenchPersistenceV3Success<unknown>['status'];
  diagnostics: WorkbenchPersistenceV3Diagnostic[];
}

const canonicalizeProjection = (
  projection: WorkbenchPersistenceV3FileProjection,
  raw: unknown,
  index: number,
  phase: 'encode' | 'decode',
): WorkbenchPersistenceV3DecodeResult<CanonicalProjectionResult> => {
  const projectionRecord = projection as unknown as Record<string, unknown>;
  if (
    !isPlainRecord(projectionRecord) ||
    !hasExactOwnKeys(
      projectionRecord,
      WORKBENCH_PERSISTENCE_V3_PROJECTION_KEYS,
    ) ||
    !isPlainRecord(projectionRecord.fields) ||
    !hasExactOwnKeys(
      projectionRecord.fields,
      WORKBENCH_PERSISTENCE_V3_FIELD_CLASS_KEYS,
    ) ||
    !WORKBENCH_PERSISTENCE_V3_FIELD_CLASS_KEYS.every((key) => (
      isPlainRecord(projectionRecord.fields[key])
    ))
  ) {
    return createCodecFailure('quarantined', raw, {
      fileId: typeof projectionRecord.fileId === 'string'
        ? projectionRecord.fileId
        : 'unknown',
      fileKind: isWorkbenchFileKind(projectionRecord.fileKind)
        ? projectionRecord.fileKind
        : undefined,
      phase,
      category: 'schema-shape',
      code: 'persistence-v3-projection-envelope-invalid',
      message:
        'The V3 projection or field-class envelope contains unknown or missing fields.',
      fieldPath: 'projection',
    });
  }
  const reprojected = reprojectWorkbenchPersistenceV3File(projection, index);
  if (reprojected.ok === false) {
    return preserveNestedFailure(raw, reprojected);
  }
  const canonical = projectWorkbenchPersistenceV3File(
    reprojected.value,
    index,
  );
  if (canonical.ok === false) {
    return preserveNestedFailure(raw, canonical);
  }

  const identity = {
    fileId: projection.fileId,
    fileKind: projection.fileKind,
  };
  if (
    !areWorkbenchPersistenceV3ProjectionFieldClassesEqual(
      projection,
      canonical.value,
      ['relation'],
    )
  ) {
    return createCodecFailure('quarantined', raw, {
      ...identity,
      phase,
      category: 'relationship',
      code: 'persistence-v3-file-relation-not-canonical',
      message: 'V3 file relationships do not match the authoritative projection.',
      fieldPath: 'projection.fields.relation',
    });
  }
  const authoritativeChanged =
    !areWorkbenchPersistenceV3ProjectionFieldClassesEqual(
      projection,
      canonical.value,
      ['authoritative'],
    );
  if (
    authoritativeChanged &&
    !(
      (
        (
          reprojected.status === 'migrated' ||
          canonical.status === 'migrated'
        ) &&
        isWorkbenchPersistenceV3AuthoritativeMigrationAllowed(
          projection,
          canonical.value,
        )
      ) ||
      (
        (
          reprojected.status === 'repaired-cache' ||
          canonical.status === 'repaired-cache'
        ) &&
        isWorkbenchPersistenceV3AuthoritativeCacheRepairAllowed(
          projection,
          canonical.value,
        )
      )
    )
  ) {
    return createCodecFailure('quarantined', raw, {
      ...identity,
      phase,
      category: 'authoritative-data',
      code: 'persistence-v3-file-authority-not-canonical',
      message: 'V3 authoritative data cannot be reprojected without alteration.',
      fieldPath: 'projection.fields.authoritative',
    });
  }
  const derivedRepaired =
    !areWorkbenchPersistenceV3ProjectionFieldClassesEqual(
      projection,
      canonical.value,
      ['derived'],
    );
  const uiRepaired =
    !areWorkbenchPersistenceV3ProjectionFieldClassesEqual(
      projection,
      canonical.value,
      ['uiCheckpoint'],
    );
  const qualityRepaired =
    !areWorkbenchPersistenceV3ProjectionFieldClassesEqual(
      projection,
      canonical.value,
      ['quality'],
    );
  const repaired = derivedRepaired || uiRepaired || qualityRepaired ||
    reprojected.status === 'repaired-cache' ||
    canonical.status === 'repaired-cache';
  const migrated = reprojected.status === 'migrated' ||
    canonical.status === 'migrated';
  const diagnostics = [
    ...reprojected.diagnostics,
    ...canonical.diagnostics,
  ];
  if (derivedRepaired) {
    diagnostics.push(createFileCodecDiagnostic({
      ...identity,
      phase,
      category: 'derived-cache',
      code: 'persistence-v3-file-derived-cache-repaired',
      message: 'Derived file data was recomputed from authoritative state.',
      fieldPath: 'projection.fields.derived',
      retry: 'never',
      recovery: 'recompute-derived',
      severity: 'warning',
    }));
  }
  if (uiRepaired) {
    diagnostics.push(createFileCodecDiagnostic({
      ...identity,
      phase,
      category: 'quality',
      code: 'persistence-v3-file-ui-checkpoint-repaired',
      message: 'The optional UI checkpoint was repaired independently of experiment data.',
      fieldPath: 'projection.fields.uiCheckpoint',
      retry: 'never',
      recovery: 'none',
      severity: 'warning',
    }));
  }
  if (qualityRepaired) {
    diagnostics.push(createFileCodecDiagnostic({
      ...identity,
      phase,
      category: 'quality',
      code: 'persistence-v3-file-quality-repaired',
      message:
        'Malformed quality metadata was repaired without altering experiment authority.',
      fieldPath: 'projection.fields.quality',
      retry: 'never',
      recovery: 'none',
      severity: 'warning',
    }));
  }

  return createWorkbenchPersistenceV3Success(
    migrated ? 'migrated' : repaired ? 'repaired-cache' : 'exact',
    {
      projection: cloneWorkbenchPersistenceV3FileProjection(canonical.value),
      status: migrated ? 'migrated' : repaired ? 'repaired-cache' : 'exact',
      diagnostics,
    },
    diagnostics,
  );
};

const readProjectionRecord = (
  raw: unknown,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3FileRecord> => {
  if (!isPlainRecord(raw)) {
    return createCodecFailure('quarantined', raw, {
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-file-record-not-object',
      message: 'A V3 file record must be a plain object.',
    });
  }
  const fileId = typeof raw.fileId === 'string' ? raw.fileId : 'unknown';
  const fileKind = isWorkbenchFileKind(raw.fileKind)
    ? raw.fileKind
    : undefined;
  if (!Number.isInteger(raw.schemaVersion) || (raw.schemaVersion as number) < 1) {
    return createCodecFailure('quarantined', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'schema-version',
      code: 'persistence-v3-file-version-missing-or-invalid',
      message: 'The V3 file schema version is missing or invalid.',
      fieldPath: 'schemaVersion',
    });
  }
  if (
    (raw.schemaVersion as number) >
    WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_VERSION
  ) {
    return createCodecFailure('unsupported-future', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'unsupported-future',
      code: 'persistence-v3-file-version-future',
      message: 'The V3 file record requires a newer application.',
      fieldPath: 'schemaVersion',
      sourceVersion: raw.schemaVersion as number,
      retry: 'manual',
    });
  }
  if (
    raw.schemaFamily !== WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY
  ) {
    return createCodecFailure('quarantined', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-file-family-invalid',
      message: 'The V3 file schema family is invalid.',
      fieldPath: 'schemaFamily',
    });
  }
  if (!hasExactOwnKeys(raw, WORKBENCH_PERSISTENCE_V3_FILE_RECORD_KEYS)) {
    return createCodecFailure('quarantined', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-file-record-keys-invalid',
      message: 'The V3 file record contains unknown or missing fields.',
      fieldPath: 'record',
    });
  }
  if (
    fileKind === undefined ||
    typeof raw.fileId !== 'string' ||
    raw.fileId.trim().length === 0 ||
    !isPlainRecord(raw.projection)
  ) {
    return createCodecFailure('quarantined', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'identity',
      code: 'persistence-v3-file-header-invalid',
      message: 'The V3 file identity or projection is invalid.',
      fieldPath: fileKind === undefined ? 'fileKind' : 'fileId',
    });
  }
  const projection = raw.projection;
  if (
    !Number.isInteger(projection.projectionVersion) ||
    (projection.projectionVersion as number) < 1
  ) {
    return createCodecFailure('quarantined', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'schema-version',
      code: 'persistence-v3-projection-version-missing-or-invalid',
      message: 'The V3 projection version is missing or invalid.',
      fieldPath: 'projection.projectionVersion',
    });
  }
  if (
    (projection.projectionVersion as number) >
    WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION
  ) {
    return createCodecFailure('unsupported-future', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'unsupported-future',
      code: 'persistence-v3-projection-version-future',
      message: 'The V3 file projection requires a newer application.',
      fieldPath: 'projection.projectionVersion',
      sourceVersion: projection.projectionVersion as number,
      retry: 'manual',
    });
  }
  if (
    !hasExactOwnKeys(
      projection,
      WORKBENCH_PERSISTENCE_V3_PROJECTION_KEYS,
    ) ||
    !isPlainRecord(projection.fields) ||
    !hasExactOwnKeys(
      projection.fields,
      WORKBENCH_PERSISTENCE_V3_FIELD_CLASS_KEYS,
    ) ||
    !WORKBENCH_PERSISTENCE_V3_FIELD_CLASS_KEYS.every((key) => (
      isPlainRecord(projection.fields[key])
    ))
  ) {
    return createCodecFailure('quarantined', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'schema-shape',
      code: 'persistence-v3-projection-keys-invalid',
      message:
        'The V3 projection or field-class envelope contains unknown or missing fields.',
      fieldPath: 'projection',
    });
  }
  const codec = WORKBENCH_PERSISTENCE_V3_FILE_CODECS[fileKind];
  if (
    raw.aggregateKind !== codec.aggregateKind ||
    projection.fileId !== raw.fileId ||
    projection.fileKind !== fileKind ||
    projection.aggregateKind !== codec.aggregateKind
  ) {
    return createCodecFailure('quarantined', raw, {
      fileId,
      fileKind,
      phase: 'decode',
      category: 'relationship',
      code: 'persistence-v3-file-header-projection-mismatch',
      message: 'The V3 file header and projection identities do not match.',
      fieldPath: 'projection.fileId',
    });
  }
  return createWorkbenchPersistenceV3Success(
    'exact',
    raw as unknown as WorkbenchPersistenceV3FileRecord,
  );
};

export const encodeWorkbenchPersistenceV3FileProjection = (
  projection: WorkbenchPersistenceV3FileProjection,
  index = 1,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3FileRecord> => {
  const canonical = canonicalizeProjection(
    projection,
    projection,
    index,
    'encode',
  );
  if (canonical.ok === false) return canonical;
  const value = canonical.value.projection;
  return createWorkbenchPersistenceV3Success(
    canonical.value.status,
    {
      schemaFamily: WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY,
      schemaVersion: WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_VERSION,
      aggregateKind: value.aggregateKind,
      fileKind: value.fileKind,
      fileId: value.fileId,
      projection: value,
    },
    canonical.value.diagnostics,
  );
};

export const decodeWorkbenchPersistenceV3FileRecord = (
  raw: unknown,
  index = 1,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3FileProjection> => {
  const parsed = readProjectionRecord(raw);
  if (parsed.ok === false) return parsed;
  const canonical = canonicalizeProjection(
    parsed.value.projection,
    raw,
    index,
    'decode',
  );
  if (canonical.ok === false) return canonical;
  return createWorkbenchPersistenceV3Success(
    canonical.value.status,
    canonical.value.projection,
    canonical.value.diagnostics,
  );
};
