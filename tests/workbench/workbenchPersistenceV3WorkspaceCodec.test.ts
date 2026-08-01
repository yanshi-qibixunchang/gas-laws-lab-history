import assert from 'node:assert/strict';
import {
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createLegacyWorkbenchFileEnvelopeFixture as createWorkbenchFileEnvelopeWithCodec,
} from './helpers/legacyWorkbenchSourceFixture.ts';
import {
  projectWorkbenchPersistenceV3File,
} from '../../src/features/workbench/persistenceV3/projection.ts';
import {
  encodeWorkbenchPersistenceV3FileProjection,
} from '../../src/features/workbench/persistenceV3/codecRegistry.ts';
import {
  WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
} from '../../src/features/workbench/persistenceV3/contract.ts';
import {
  createWorkbenchPersistenceV3WorkspaceSemanticProjection,
  decodeWorkbenchPersistenceV3WorkspaceRecord,
  encodeWorkbenchPersistenceV3WorkspaceProjection,
  projectWorkbenchPersistenceV3Workspace,
  reprojectWorkbenchPersistenceV3Workspace,
} from '../../src/features/workbench/persistenceV3/workspaceCodec.ts';

const capturedRuntimeFiles = [
  createDefaultIdealFile(101),
  createDefaultStandardFile(102),
  createDefaultHeatCapacityPistonOscillationFile(103),
];
const capturedWorkspace = projectWorkbenchPersistenceV3Workspace(
  {
    files: capturedRuntimeFiles,
    activeFileId: capturedRuntimeFiles[1].id,
    selectedPanel: 'preview',
  },
  9_000,
);
assert.equal(capturedWorkspace.ok, true);
if (!capturedWorkspace.ok) {
  throw new Error(capturedWorkspace.diagnostics[0].message);
}
assert.equal(capturedWorkspace.status, 'exact');
const capturedWorkspaceEncoded =
  encodeWorkbenchPersistenceV3WorkspaceProjection(
    capturedWorkspace.value,
  );
if (!capturedWorkspaceEncoded.ok) {
  throw new Error(capturedWorkspaceEncoded.diagnostics[0].message);
}
for (const [label, mutate] of [
  [
    'record',
    (record: Record<string, unknown>) => {
      record.opaqueAuthority = { retain: true };
    },
  ],
  [
    'manifest',
    (record: Record<string, unknown>) => {
      (
        record.manifest as Record<string, unknown>
      ).opaqueAuthority = { retain: true };
    },
  ],
] as const) {
  const opaqueWorkspaceRecord = structuredClone(
    capturedWorkspaceEncoded.value,
  ) as unknown as Record<string, unknown>;
  mutate(opaqueWorkspaceRecord);
  const opaqueWorkspaceDecode =
    decodeWorkbenchPersistenceV3WorkspaceRecord(opaqueWorkspaceRecord);
  assert.equal(opaqueWorkspaceDecode.ok, false);
  if (opaqueWorkspaceDecode.ok) {
    throw new Error(`Expected unknown workspace ${label} quarantine.`);
  }
  assert.equal(opaqueWorkspaceDecode.status, 'quarantined');
  assert.deepEqual(opaqueWorkspaceDecode.raw, opaqueWorkspaceRecord);
}
for (const [label, mutate] of [
  [
    'projection',
    (projection: Record<string, unknown>) => {
      projection.opaqueAuthority = { retain: true };
    },
  ],
  [
    'entry',
    (projection: Record<string, unknown>) => {
      const entries = projection.entries as Array<Record<string, unknown>>;
      entries[0]!.opaqueAuthority = { retain: true };
    },
  ],
] as const) {
  const opaqueWorkspaceProjection = structuredClone(
    capturedWorkspace.value,
  ) as unknown as Record<string, unknown>;
  mutate(opaqueWorkspaceProjection);
  const opaqueWorkspaceEncode =
    encodeWorkbenchPersistenceV3WorkspaceProjection(
      opaqueWorkspaceProjection as unknown as typeof capturedWorkspace.value,
    );
  assert.equal(opaqueWorkspaceEncode.ok, false);
  if (opaqueWorkspaceEncode.ok) {
    throw new Error(`Expected unknown workspace ${label} encode quarantine.`);
  }
  assert.equal(opaqueWorkspaceEncode.status, 'quarantined');
  assert.deepEqual(
    opaqueWorkspaceEncode.raw,
    opaqueWorkspaceProjection,
  );
}
const capturedWorkspaceDecoded =
  decodeWorkbenchPersistenceV3WorkspaceRecord(
    capturedWorkspaceEncoded.value,
  );
if (!capturedWorkspaceDecoded.ok) {
  throw new Error(capturedWorkspaceDecoded.diagnostics[0].message);
}
const capturedWorkspaceRestored =
  reprojectWorkbenchPersistenceV3Workspace(
    capturedWorkspaceDecoded.value,
  );
if (!capturedWorkspaceRestored.ok) {
  throw new Error(capturedWorkspaceRestored.diagnostics[0].message);
}
assert.deepEqual(
  capturedWorkspaceRestored.value.files.map((file) => file.id),
  capturedRuntimeFiles.map((file) => file.id),
);
assert.equal(
  capturedWorkspaceRestored.value.activeFileId,
  capturedRuntimeFiles[1].id,
);
assert.deepEqual(
  createWorkbenchPersistenceV3WorkspaceSemanticProjection(
    capturedWorkspaceDecoded.value,
  ),
  createWorkbenchPersistenceV3WorkspaceSemanticProjection(
    capturedWorkspace.value,
  ),
  'runtime workspace semantic identity must survive project/encode/decode/reproject preparation',
);

const invalidActiveWorkspaceRecord = structuredClone(
  capturedWorkspaceEncoded.value,
);
invalidActiveWorkspaceRecord.manifest.activeFileId = 'ghost-file';
invalidActiveWorkspaceRecord.manifest.selectedPanel =
  'not-a-panel' as never;
const repairedWorkspaceSelection =
  decodeWorkbenchPersistenceV3WorkspaceRecord(
    invalidActiveWorkspaceRecord,
  );
assert.equal(repairedWorkspaceSelection.ok, true);
if (!repairedWorkspaceSelection.ok) {
  throw new Error(
    repairedWorkspaceSelection.diagnostics[0].message,
  );
}
assert.equal(repairedWorkspaceSelection.status, 'repaired-cache');
assert.equal(
  repairedWorkspaceSelection.value.activeFileId,
  capturedRuntimeFiles[0].id,
);
assert.equal(repairedWorkspaceSelection.value.selectedPanel, 'preview');
const repairedWorkspaceSelectionEncoded =
  encodeWorkbenchPersistenceV3WorkspaceProjection(
    repairedWorkspaceSelection.value,
  );
if (!repairedWorkspaceSelectionEncoded.ok) {
  throw new Error(
    repairedWorkspaceSelectionEncoded.diagnostics[0].message,
  );
}
assert.equal(
  repairedWorkspaceSelectionEncoded.value.manifest.activeFileId,
  capturedRuntimeFiles[0].id,
);
const repairedWorkspaceSelectionDecodedAgain =
  decodeWorkbenchPersistenceV3WorkspaceRecord(
    repairedWorkspaceSelectionEncoded.value,
  );
if (!repairedWorkspaceSelectionDecodedAgain.ok) {
  throw new Error(
    repairedWorkspaceSelectionDecodedAgain.diagnostics[0].message,
  );
}
assert.deepEqual(
  createWorkbenchPersistenceV3WorkspaceSemanticProjection(
    repairedWorkspaceSelection.value,
  ),
  createWorkbenchPersistenceV3WorkspaceSemanticProjection(
    repairedWorkspaceSelectionDecodedAgain.value,
  ),
);

const mismatchedDecodedEntry = structuredClone(
  capturedWorkspace.value,
);
mismatchedDecodedEntry.entries[0].fileId = 'mismatched-entry-id';
const mismatchedDecodedEntryEncoded =
  encodeWorkbenchPersistenceV3WorkspaceProjection(
    mismatchedDecodedEntry,
  );
assert.equal(mismatchedDecodedEntryEncoded.ok, false);
if (mismatchedDecodedEntryEncoded.ok) {
  throw new Error('Expected a decoded entry identity mismatch.');
}
assert.equal(mismatchedDecodedEntryEncoded.status, 'quarantined');

for (const invalidEntries of [
  [null],
  [{
    kind: 'future-entry-kind',
    fileId: 'invalid-kind',
    diagnostics: [],
  }],
  [{
    kind: 'preserved',
    fileId: 'invalid-preserved-status',
    status: 'exact',
    raw: {
      fileId: 'invalid-preserved-status',
    },
    diagnostics: [],
  }],
]) {
  let invalidEntryResult:
    | ReturnType<
        typeof encodeWorkbenchPersistenceV3WorkspaceProjection
      >
    | undefined;
  assert.doesNotThrow(() => {
    invalidEntryResult =
      encodeWorkbenchPersistenceV3WorkspaceProjection({
        ...capturedWorkspace.value,
        entries: invalidEntries,
      } as never);
  });
  assert.ok(invalidEntryResult);
  assert.equal(invalidEntryResult.ok, false);
  if (invalidEntryResult.ok) {
    throw new Error('Expected an invalid workspace entry shape.');
  }
  assert.equal(invalidEntryResult.status, 'quarantined');
}

const exactFile = createDefaultIdealFile(1);
const exactProjection = projectWorkbenchPersistenceV3File(exactFile, 1);
if (!exactProjection.ok) throw new Error(exactProjection.diagnostics[0].message);
const exactRecord = encodeWorkbenchPersistenceV3FileProjection(
  exactProjection.value,
  1,
);
if (!exactRecord.ok) throw new Error(exactRecord.diagnostics[0].message);

const legacyFile = createDefaultHeatCapacityPistonOscillationFile(2);
const legacyRecord = createWorkbenchFileEnvelopeWithCodec(legacyFile, 2_000);

const futureSource = createDefaultStandardFile(3);
const futureProjection = projectWorkbenchPersistenceV3File(futureSource, 3);
if (!futureProjection.ok) throw new Error(futureProjection.diagnostics[0].message);
const futureRecordResult = encodeWorkbenchPersistenceV3FileProjection(
  futureProjection.value,
  3,
);
if (!futureRecordResult.ok) {
  throw new Error(futureRecordResult.diagnostics[0].message);
}
const futureRecord = structuredClone(futureRecordResult.value);
futureRecord.schemaVersion += 1;
(futureRecord as Record<string, unknown>).futureOnly = {
  opaque: ['must', 'survive'],
};

const brokenSource = createDefaultStandardFile(4);
const brokenProjection = projectWorkbenchPersistenceV3File(brokenSource, 4);
if (!brokenProjection.ok) throw new Error(brokenProjection.diagnostics[0].message);
const brokenRecordResult = encodeWorkbenchPersistenceV3FileProjection(
  brokenProjection.value,
  4,
);
if (!brokenRecordResult.ok) {
  throw new Error(brokenRecordResult.diagnostics[0].message);
}
const brokenRecord = structuredClone(brokenRecordResult.value);
brokenRecord.projection.fields.relation.fileId = 'wrong-file-id';

const rawWorkspace = {
  schemaFamily: WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
  capturedAtMs: 10_000,
  manifest: {
    activeFileId: exactFile.id,
    selectedPanel: 'preview',
    fileOrder: [
      exactFile.id,
      legacyFile.id,
      futureSource.id,
      brokenSource.id,
    ],
  },
  records: [
    exactRecord.value,
    legacyRecord,
    futureRecord,
    brokenRecord,
  ],
};

const decoded = decodeWorkbenchPersistenceV3WorkspaceRecord(rawWorkspace);
assert.equal(decoded.ok, true);
if (!decoded.ok) throw new Error(decoded.diagnostics[0].message);
assert.equal(decoded.status, 'migrated');
assert.deepEqual(
  decoded.value.entries.map((entry) => entry.kind),
  ['decoded', 'decoded', 'preserved', 'preserved'],
);
assert.equal(decoded.value.entries[0]?.kind, 'decoded');
assert.equal(
  decoded.value.entries[1]?.kind === 'decoded'
    ? decoded.value.entries[1].sourceStatus
    : null,
  'migrated',
);
assert.equal(
  decoded.value.entries[2]?.kind === 'preserved'
    ? decoded.value.entries[2].status
    : null,
  'unsupported-future',
);
assert.equal(
  decoded.value.entries[3]?.kind === 'preserved'
    ? decoded.value.entries[3].status
    : null,
  'quarantined',
);

const runtime = reprojectWorkbenchPersistenceV3Workspace(decoded.value);
assert.equal(runtime.ok, true);
if (!runtime.ok) throw new Error(runtime.diagnostics[0].message);
assert.deepEqual(
  runtime.value.files.map((file) => file.id),
  [exactFile.id, legacyFile.id],
  'future and quarantined records must not suppress healthy files',
);
assert.equal(runtime.value.activeFileId, exactFile.id);

const encodedAgain = encodeWorkbenchPersistenceV3WorkspaceProjection(
  decoded.value,
);
assert.equal(encodedAgain.ok, true);
if (!encodedAgain.ok) throw new Error(encodedAgain.diagnostics[0].message);
assert.deepEqual(encodedAgain.value.records[2], futureRecord);
assert.deepEqual(encodedAgain.value.records[3], brokenRecord);

const mismatchedPreservedEntry = structuredClone(decoded.value);
if (mismatchedPreservedEntry.entries[2]?.kind !== 'preserved') {
  throw new Error('Expected the future record to remain preserved.');
}
mismatchedPreservedEntry.entries[2].fileId = 'wrong-preserved-id';
const mismatchedPreservedEntryEncoded =
  encodeWorkbenchPersistenceV3WorkspaceProjection(
    mismatchedPreservedEntry,
  );
assert.equal(mismatchedPreservedEntryEncoded.ok, false);
if (mismatchedPreservedEntryEncoded.ok) {
  throw new Error('Expected a preserved entry identity mismatch.');
}
assert.equal(mismatchedPreservedEntryEncoded.status, 'quarantined');

const decodedAgain = decodeWorkbenchPersistenceV3WorkspaceRecord(
  encodedAgain.value,
);
assert.equal(decodedAgain.ok, true);
if (!decodedAgain.ok) throw new Error(decodedAgain.diagnostics[0].message);
assert.deepEqual(
  createWorkbenchPersistenceV3WorkspaceSemanticProjection(decodedAgain.value),
  createWorkbenchPersistenceV3WorkspaceSemanticProjection(decoded.value),
);
const uiOnlyWorkspaceChange = structuredClone(decoded.value);
uiOnlyWorkspaceChange.capturedAtMs += 1;
uiOnlyWorkspaceChange.selectedPanel = 'history';
assert.deepEqual(
  createWorkbenchPersistenceV3WorkspaceSemanticProjection(
    uiOnlyWorkspaceChange,
  ),
  createWorkbenchPersistenceV3WorkspaceSemanticProjection(decoded.value),
  'workspace capture metadata and UI selection must not change semantic identity',
);

const futureWorkspace = structuredClone(rawWorkspace);
futureWorkspace.schemaVersion += 1;
(futureWorkspace as Record<string, unknown>).futureWorkspaceField = true;
const unsupportedWorkspace = decodeWorkbenchPersistenceV3WorkspaceRecord(
  futureWorkspace,
);
assert.equal(unsupportedWorkspace.ok, false);
if (unsupportedWorkspace.ok) {
  throw new Error('Expected an unsupported future workspace.');
}
assert.equal(unsupportedWorkspace.status, 'unsupported-future');
assert.deepEqual(unsupportedWorkspace.raw, futureWorkspace);

console.log('workbenchPersistenceV3WorkspaceCodec tests passed');
