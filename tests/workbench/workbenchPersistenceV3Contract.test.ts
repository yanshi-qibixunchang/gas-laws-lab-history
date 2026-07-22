import assert from 'node:assert/strict';
import {
  WORKBENCH_PERSISTENCE_V3_FILE_CODECS,
  WORKBENCH_REGISTERED_PERSISTENCE_V3_FILE_KINDS,
  decodeWorkbenchPersistenceV3FileRecord,
  encodeWorkbenchPersistenceV3FileProjection,
} from '../../src/features/workbench/persistenceV3/codecRegistry.ts';
import {
  projectWorkbenchPersistenceV3File,
} from '../../src/features/workbench/persistenceV3/projection.ts';
import {
  WORKBENCH_FILE_KINDS,
} from '../../src/features/workbench/workbenchFileKind.ts';
import {
  WORKBENCH_PERSISTENCE_FIELD_CLASSES,
  WORKBENCH_PERSISTENCE_V3_AGGREGATE_KINDS,
  WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
  createWorkbenchPersistenceV3Diagnostic,
} from '../../src/features/workbench/persistenceV3/contract.ts';
import {
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  type WorkbenchFileState,
} from '../../src/features/workbench/workbenchState.ts';

assert.equal(
  WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  'hard-sphere-lab.persistence-v3',
);
assert.equal(WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION, 1);
assert.deepEqual(WORKBENCH_PERSISTENCE_FIELD_CLASSES, [
  'authoritative',
  'relation',
  'derived',
  'quality',
  'ui-checkpoint',
  'transient',
]);
assert.ok(WORKBENCH_PERSISTENCE_V3_AGGREGATE_KINDS.includes('heat-capacity-calculation'));
assert.deepEqual(
  Object.keys(WORKBENCH_PERSISTENCE_V3_FILE_CODECS).sort(),
  [...WORKBENCH_FILE_KINDS].sort(),
  'every WorkbenchFileKind must have exactly one independent V3 codec',
);
assert.deepEqual(
  [...WORKBENCH_REGISTERED_PERSISTENCE_V3_FILE_KINDS].sort(),
  [...WORKBENCH_FILE_KINDS].sort(),
);

const canonicalDiagnostic = createWorkbenchPersistenceV3Diagnostic({
  severity: 'error',
  phase: 'capture',
  category: 'schema-shape',
  code: 'test-undefined-optionals',
  message: 'Optional diagnostic fields must be omitted when absent.',
  aggregate: {
    kind: 'file-header',
    id: 'file-1',
    fileId: undefined,
    revision: undefined,
  },
  retry: 'after-state-change',
  recovery: 'quarantine-file',
  fieldPath: undefined,
  sourceVersion: undefined,
  supportedVersion: undefined,
});
assert.equal(Object.hasOwn(canonicalDiagnostic, 'fieldPath'), false);
assert.equal(Object.hasOwn(canonicalDiagnostic, 'sourceVersion'), false);
assert.equal(Object.hasOwn(canonicalDiagnostic, 'supportedVersion'), false);
assert.equal(Object.hasOwn(canonicalDiagnostic.aggregate, 'fileId'), false);
assert.equal(Object.hasOwn(canonicalDiagnostic.aggregate, 'revision'), false);

const files: WorkbenchFileState[] = [
  createDefaultStandardFile(1),
  createDefaultIdealFile(1),
  createDefaultHeatCapacityFile(1),
  createDefaultHeatCapacityPistonOscillationFile(1),
];

for (const [index, file] of files.entries()) {
  const projected = projectWorkbenchPersistenceV3File(file, index + 1);
  assert.equal(projected.ok, true, `${file.kind} must project into V3`);
  if (!projected.ok) continue;
  const encoded = encodeWorkbenchPersistenceV3FileProjection(projected.value, index + 1);
  assert.equal(encoded.ok, true, `${file.kind} must encode through its V3 codec`);
  if (!encoded.ok) continue;
  const decoded = decodeWorkbenchPersistenceV3FileRecord(encoded.value, index + 1);
  assert.equal(decoded.ok, true, `${file.kind} must round-trip through V3`);
  if (!decoded.ok) continue;
  assert.equal(decoded.status, 'exact');
  assert.equal(decoded.value.fileKind, file.kind);
  assert.equal(decoded.value.fileId, file.id);

  const futureRecord = structuredClone(encoded.value);
  futureRecord.schemaVersion += 1;
  (futureRecord as Record<string, unknown>).futureField = {
    mustRemainOpaque: true,
  };
  const future = decodeWorkbenchPersistenceV3FileRecord(futureRecord, index + 1);
  assert.equal(future.ok, false);
  assert.equal(future.status, 'unsupported-future');
  assert.equal(future.diagnostics[0].retry, 'manual');
  assert.deepEqual(future.raw, futureRecord);

  const malformedRecord = structuredClone(encoded.value) as Record<string, unknown>;
  delete malformedRecord.schemaVersion;
  const malformed = decodeWorkbenchPersistenceV3FileRecord(malformedRecord, index + 1);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.status, 'quarantined');
  assert.equal(malformed.diagnostics[0].category, 'schema-version');
  assert.equal(malformed.diagnostics[0].retry, 'never');
  assert.deepEqual(malformed.raw, malformedRecord);
}

console.log('workbenchPersistenceV3Contract tests passed');
