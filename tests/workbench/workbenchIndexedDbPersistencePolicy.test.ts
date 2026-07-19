import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  type WorkbenchFileState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createDefaultHeatCapacityModeSessionStore,
  createHeatCapacityModeRuntimeShell,
  normalizeHeatCapacityModeSessionStore,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  advanceWorkbenchWorkspaceMetaRevision,
  attachLegacySceneSnapshotToRefreshBootstrap,
  createPersistenceRecords,
  createWorkbenchActiveModeCheckpointOverride,
  getWorkbenchMigrationConflictRecoveryAction,
  isWorkbenchMigrationStateTransitionCurrent,
  isWorkbenchRefreshMetadataAnchorRecoverySourceVersion,
  isWorkbenchRefreshMetadataTargetActive,
  isWorkbenchWorkspaceRevisionCurrent,
  normalizeWorkbenchWorkspaceMetaRecord,
  resolveWorkbenchActiveModeCheckpointOverride,
} from '../../src/features/workbench/workbenchIndexedDbPersistence.ts';
import {
  createWorkbenchHeatCapacityRefreshSession,
} from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';
import type { HeatCapacityModeUiCheckpoint } from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  createWorkbenchSessionFromCanonicalFiles,
  createWorkbenchSessionFromRuntimeFiles,
} from '../../src/features/workbench/workbenchSession.ts';
import {
  normalizeHeatCapacitySessionRuntimeState,
} from '../../src/features/workbench/workbenchHeatCapacitySessionRestore.ts';
import {
  areCanonicalPersistenceValuesEqual,
  isCanonicalStandardOrIdealWorkspaceFile,
} from '../../src/features/workbench/workbenchWorkspaceFileValidation.ts';
import {
  encodeWorkbenchClosedFilesStorageEnvelope,
} from '../../src/features/workbench/workbenchPersistenceMigration.ts';
import * as indexedDbPersistenceModule from '../../src/features/workbench/workbenchIndexedDbPersistence.ts';

(globalThis as typeof globalThis & { __APP_VERSION__: string }).__APP_VERSION__ = '5.1.2';

type NormalizedWorkspaceFileRecord = {
  schemaFamily: string;
  key: string;
  namespace: string;
  fileId: string;
  state: WorkbenchFileState;
};

const normalizeWorkbenchWorkspaceFileRecord = (
  indexedDbPersistenceModule as unknown as {
    normalizeWorkbenchWorkspaceFileRecord?: (
      value: unknown,
      namespace: string,
      fileId: string,
    ) => NormalizedWorkspaceFileRecord | null;
  }
).normalizeWorkbenchWorkspaceFileRecord;
assert.equal(
  typeof normalizeWorkbenchWorkspaceFileRecord,
  'function',
  'IndexedDB must expose a tested compatibility boundary for workspace file records',
);
if (!normalizeWorkbenchWorkspaceFileRecord) {
  throw new Error('Workspace file-record compatibility boundary is unavailable.');
}

const normalizeLegacyHeatCapacityModeSessionEntry = (
  indexedDbPersistenceModule as unknown as {
    normalizeLegacyHeatCapacityModeSessionEntry?: (
      value: unknown,
      mode: 'demo' | 'guide' | 'free',
      fileId: string,
    ) => unknown;
  }
).normalizeLegacyHeatCapacityModeSessionEntry;
assert.equal(
  typeof normalizeLegacyHeatCapacityModeSessionEntry,
  'function',
  'IndexedDB must expose a tested compatibility boundary for split mode entries',
);

const legacyIdealFile = {
  ...createDefaultIdealFile(1),
  id: 'ideal-001',
  name: 'Legacy IndexedDB ideal file',
};
const legacyIdealEnvelope = encodeWorkbenchClosedFilesStorageEnvelope([legacyIdealFile], 1_000).files[0]!;
const legacyIdealRecord = {
  schemaFamily: 'hard-sphere-lab/workspace-file-v2',
  key: 'persistent:main|ideal-001',
  namespace: 'persistent:main',
  fileId: 'ideal-001',
  envelope: legacyIdealEnvelope,
};
const normalizedLegacyIdealRecord = normalizeWorkbenchWorkspaceFileRecord(
  legacyIdealRecord,
  'persistent:main',
  'ideal-001',
);
assert.equal(normalizedLegacyIdealRecord?.state.id, 'ideal-001');
assert.equal(normalizedLegacyIdealRecord?.state.kind, 'ideal');
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(normalizedLegacyIdealRecord?.state),
  true,
  'the recognized legacy envelope must be decoded through the strict current ideal-file validator',
);
for (const legacyFile of [
  { ...createDefaultStandardFile(2), id: 'standard-002', name: 'Legacy IndexedDB standard file' },
  { ...createDefaultHeatCapacityFile(3), id: 'heat-003', name: 'Legacy IndexedDB heat-capacity file' },
] satisfies WorkbenchFileState[]) {
  const encodedEnvelope = encodeWorkbenchClosedFilesStorageEnvelope([legacyFile], 1_001).files[0]!;
  const envelope = legacyFile.kind === 'heatCapacity'
    ? {
        ...encodedEnvelope,
        payload: {
          ...encodedEnvelope.payload,
          mode: 'guide',
          common: {
            ...(encodedEnvelope.payload.common as Record<string, unknown>),
            teachingStatus: 'running',
            modeSessions: createDefaultHeatCapacityModeSessionStore(),
          },
          free: null,
          guided: null,
          demo: null,
        },
      }
    : encodedEnvelope;
  const record = {
    schemaFamily: 'hard-sphere-lab/workspace-file-v2',
    key: `persistent:main|${legacyFile.id}`,
    namespace: 'persistent:main',
    fileId: legacyFile.id,
    envelope,
  };
  const normalized = normalizeWorkbenchWorkspaceFileRecord(record, 'persistent:main', legacyFile.id);
  assert.equal(normalized?.state.id, legacyFile.id);
  assert.equal(normalized?.state.kind, legacyFile.kind);
}
const currentIdealState = createWorkbenchSessionFromRuntimeFiles({
  files: [legacyIdealFile],
  activeFileId: legacyIdealFile.id,
  selectedPanel: 'preview',
}).files[0]!;
const currentIdealRecord = {
  schemaFamily: 'hard-sphere-lab/workspace-file-v2',
  key: 'persistent:main|ideal-001',
  namespace: 'persistent:main',
  fileId: 'ideal-001',
  state: currentIdealState,
};
assert.equal(
  normalizeWorkbenchWorkspaceFileRecord(currentIdealRecord, 'persistent:main', 'ideal-001'),
  currentIdealRecord,
  'already-current canonical records must remain lossless and retain their identity',
);
assert.equal(
  normalizeWorkbenchWorkspaceFileRecord(
    {
      ...legacyIdealRecord,
      envelope: { ...legacyIdealEnvelope, id: 'different-file' },
    },
    'persistent:main',
    'ideal-001',
  ),
  null,
  'a legacy envelope whose file identity does not match the outer record must remain rejected',
);

const indexedDbV2HeatCapacityFile = createWorkbenchSessionFromRuntimeFiles({
  files: [{
    ...createDefaultHeatCapacityFile(1),
    id: 'heatCapacity-001',
  }],
  activeFileId: 'heatCapacity-001',
  selectedPanel: 'preview',
}).files[0]!;
assert.equal(indexedDbV2HeatCapacityFile.kind, 'heatCapacity');
for (const legacyName of [
  'Heat Capacity Ratio - 001',
  'Hard-Sphere Heat Capacity Ratio - 001',
]) {
  const legacyState = {
    ...indexedDbV2HeatCapacityFile,
    name: legacyName,
  };
  const legacyStateRecord = {
    schemaFamily: 'hard-sphere-lab/workspace-file-v2',
    key: 'persistent:main|heatCapacity-001',
    namespace: 'persistent:main',
    fileId: 'heatCapacity-001',
    state: legacyState,
  };
  const normalized = normalizeWorkbenchWorkspaceFileRecord(
    legacyStateRecord,
    'persistent:main',
    'heatCapacity-001',
  );
  assert.deepEqual(
    normalized,
    {
      ...legacyStateRecord,
      state: {
        ...legacyState,
        name: 'Adiabatic Expansion - 001',
      },
    },
    `IndexedDB v2 heat-capacity state named "${legacyName}" must migrate only its historical display name`,
  );
}

const legacyTraceV5State = structuredClone(indexedDbV2HeatCapacityFile);
assert.equal(legacyTraceV5State.kind, 'heatCapacity');
legacyTraceV5State.name = 'Heat Capacity Ratio - 001';
(
  legacyTraceV5State as unknown as {
    heatCapacityFreeTraceVersion: number;
  }
).heatCapacityFreeTraceVersion = 5;
const legacyTraceV5StateRecord = {
  schemaFamily: 'hard-sphere-lab/workspace-file-v2',
  key: 'persistent:main|heatCapacity-001',
  namespace: 'persistent:main',
  fileId: 'heatCapacity-001',
  state: legacyTraceV5State,
};
const normalizedLegacyTraceV5StateRecord =
  normalizeWorkbenchWorkspaceFileRecord(
    legacyTraceV5StateRecord,
    'persistent:main',
    'heatCapacity-001',
  );
assert.equal(
  normalizedLegacyTraceV5StateRecord?.state.kind,
  'heatCapacity',
  'a structurally valid V2 heat-capacity state with trace V5 must migrate',
);
assert.equal(
  normalizedLegacyTraceV5StateRecord?.state.name,
  'Adiabatic Expansion - 001',
);
assert.equal(
  normalizedLegacyTraceV5StateRecord?.state.kind === 'heatCapacity'
    ? normalizedLegacyTraceV5StateRecord.state.heatCapacityFreeTraceVersion
    : null,
  6,
  'the V2 compatibility boundary must upgrade trace V5 to V6',
);
assert.equal(
  legacyTraceV5State.heatCapacityFreeTraceVersion,
  5,
  'V2 heat-capacity migration must not mutate the preserved source record',
);

const pistonOscillationState = createWorkbenchSessionFromRuntimeFiles({
  files: [{
    ...createDefaultHeatCapacityPistonOscillationFile(1),
    id: 'heatCapacityPistonOscillation-001',
  }],
  activeFileId: 'heatCapacityPistonOscillation-001',
  selectedPanel: 'preview',
}).files[0]!;
const pistonOscillationStateRecord = {
  schemaFamily: 'hard-sphere-lab/workspace-file-v2',
  key: 'persistent:main|heatCapacityPistonOscillation-001',
  namespace: 'persistent:main',
  fileId: 'heatCapacityPistonOscillation-001',
  state: pistonOscillationState,
};
assert.equal(
  normalizeWorkbenchWorkspaceFileRecord(
    pistonOscillationStateRecord,
    'persistent:main',
    'heatCapacityPistonOscillation-001',
  ),
  pistonOscillationStateRecord,
  'a fresh canonical piston-oscillation state record must load without a compatibility rewrite',
);

const malformedLegacyStateRecord = {
  schemaFamily: 'hard-sphere-lab/workspace-file-v2',
  key: 'persistent:main|heatCapacity-001',
  namespace: 'persistent:main',
  fileId: 'heatCapacity-001',
  state: {
    ...indexedDbV2HeatCapacityFile,
    id: 'heatCapacity-wrong-identity',
    name: 'Heat Capacity Ratio - 001',
  },
};
const malformedLegacyStateRecordBeforeNormalization = structuredClone(malformedLegacyStateRecord);
assert.equal(
  normalizeWorkbenchWorkspaceFileRecord(
    malformedLegacyStateRecord,
    'persistent:main',
    'heatCapacity-001',
  ),
  null,
  'the narrow historical-name migration must not coerce a record whose inner file identity is corrupt',
);
assert.deepEqual(
  malformedLegacyStateRecord,
  malformedLegacyStateRecordBeforeNormalization,
  'rejecting a malformed IndexedDB record must not mutate or discard the original record value',
);

const currentGuideFile = {
  ...createDefaultHeatCapacityFile(5),
  heatCapacityMode: 'guide' as const,
  heatCapacityTeachingStatus: 'running' as const,
  runState: 'paused' as const,
};
const currentGuideEntry = suspendHeatCapacityModeSession(currentGuideFile, null, 2_000)
  .heatCapacityModeSessions.guide;
const staleGuideEntry = structuredClone(currentGuideEntry) as typeof currentGuideEntry;
if (!staleGuideEntry.snapshot || staleGuideEntry.snapshot.mode !== 'guide') {
  throw new Error('Guide compatibility fixture has no snapshot.');
}
assert.equal(
  normalizeHeatCapacityModeSessionStore({
    schemaVersion: 2,
    guide: staleGuideEntry,
  }, currentGuideFile.id).guide.status,
  'empty',
  'the current boundary must continue rejecting stale Guide projections',
);
assert.notEqual(
  normalizeLegacyHeatCapacityModeSessionEntry?.(
    staleGuideEntry,
    'guide',
    currentGuideFile.id,
  ),
  null,
  'the explicit split-entry boundary must retain a structurally valid legacy Guide runtime for reprojection',
);

const active = createDefaultHeatCapacityFile(1);
const defaults = createDefaultHeatCapacityFile(2);
active.name = 'Preserved shell metadata';
active.heatCapacityMaterialsExpanded = true;
const shell = createHeatCapacityModeRuntimeShell(active, defaults);
assert.equal(shell.id, active.id);
assert.equal(shell.name, active.name);
assert.equal(shell.heatCapacityMaterialsExpanded, true);
assert.equal(shell.heatCapacityMode, active.heatCapacityMode);
assert.equal(shell.heatCapacityFreeTraceStore, defaults.heatCapacityFreeTraceStore);
assert.notEqual(shell.heatCapacityFreeTraceStore, active.heatCapacityFreeTraceStore);
assert.equal(shell.heatCapacityModeSessions.free.status, 'empty');
assert.notEqual(shell.heatCapacityModeSessions, active.heatCapacityModeSessions);

const pristineFreeRecords = createPersistenceRecords('pristine-free-writer-gate', {
  files: [active],
  closedFiles: [],
  activeFileId: active.id,
  selectedPanel: 'preview',
  refreshSession: null,
  activeModeCheckpoint: null,
  preserveActiveHeatCapacityModeSession: false,
});
const pristineFreeRecord = pristineFreeRecords.modeRecords.find((record) => (
  record.fileId === active.id && record.mode === 'free'
));
assert.equal(
  pristineFreeRecord?.entry.status,
  'suspended',
  'normal persistence must capture an untouched Free instrument without producing a self-rejected record',
);
assert.equal(
  normalizeHeatCapacityModeSessionStore({
    schemaVersion: 2,
    free: pristineFreeRecord?.entry,
  }, active.id).free.status,
  'suspended',
  'the writer gate must emit a strictly reloadable pristine Free record',
);

const malformedInactiveModeFile = structuredClone(active);
malformedInactiveModeFile.heatCapacityModeSessions.demo = {
  status: 'suspended',
  resumeRunState: 'idle',
  capturedAtMs: 1_000,
  snapshot: null,
  uiCheckpoint: null,
};
assert.throws(
  () => createPersistenceRecords('noncanonical-mode-writer-gate', {
    files: [malformedInactiveModeFile],
    closedFiles: [],
    activeFileId: malformedInactiveModeFile.id,
    selectedPanel: 'preview',
    refreshSession: null,
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: false,
  }),
  /non-canonical heat-capacity mode session/,
  'the normal writer must reject a malformed inactive mode instead of committing a self-poisoned workspace',
);

const stableShellHeatFile = {
  ...createDefaultHeatCapacityFile(7),
  id: 'heatCapacity-00000000-0000-4000-8000-000000000007',
};
const stableShellStandardFile = createDefaultStandardFile(8);
const createStableShellRecords = (files: WorkbenchFileState[]) => createPersistenceRecords(
  'stable-heat-shell-order',
  {
    files,
    closedFiles: [],
    activeFileId: stableShellStandardFile.id,
    selectedPanel: 'preview',
    refreshSession: null,
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: false,
  },
);
const heatFirstRecord = createStableShellRecords([
  stableShellHeatFile,
  stableShellStandardFile,
]).fileRecords.find((record) => record.fileId === stableShellHeatFile.id);
const heatLastRecord = createStableShellRecords([
  stableShellStandardFile,
  stableShellHeatFile,
]).fileRecords.find((record) => record.fileId === stableShellHeatFile.id);
assert.equal(
  areCanonicalPersistenceValuesEqual(heatFirstRecord, heatLastRecord),
  true,
  'an unchanged heat-capacity file record must not depend on its open/closed collection order',
);

const adjustedButNotZeroed = {
  ...createDefaultHeatCapacityFile(3),
  pressureZeroAdjusted: true,
  pressureZeroed: false,
};
const canonicalAdjustedSession = createWorkbenchSessionFromCanonicalFiles({
  files: [adjustedButNotZeroed],
  activeFileId: adjustedButNotZeroed.id,
  selectedPanel: 'preview',
});
assert.equal(canonicalAdjustedSession.files[0], adjustedButNotZeroed);
assert.equal(
  (canonicalAdjustedSession.files[0] as typeof adjustedButNotZeroed).pressureZeroed,
  false,
  'canonical IndexedDB reconstruction must not reinterpret an adjusted knob as a completed zero',
);
assert.equal(
  normalizeHeatCapacitySessionRuntimeState(adjustedButNotZeroed).pressureZeroed,
  false,
  'legacy repair must preserve the independent pressure-zero completion bit',
);

const guideWithInactiveHeliumFreeDomain = {
  ...createDefaultHeatCapacityFile(4),
  heatCapacityMode: 'guide' as const,
  heatCapacityTeachingStatus: 'running' as const,
  heatCapacityFreeGasType: 'helium' as const,
  theoreticalGamma: 1.4,
};
const canonicalGuideSession = createWorkbenchSessionFromCanonicalFiles({
  files: [guideWithInactiveHeliumFreeDomain],
  activeFileId: guideWithInactiveHeliumFreeDomain.id,
  selectedPanel: 'preview',
});
assert.equal(
  (canonicalGuideSession.files[0] as typeof guideWithInactiveHeliumFreeDomain).theoreticalGamma,
  1.4,
  'canonical Guide reconstruction must retain the active Guide physics gamma',
);
assert.equal(
  normalizeHeatCapacitySessionRuntimeState(guideWithInactiveHeliumFreeDomain).theoreticalGamma,
  1.4,
  'legacy repair must not project an inactive Free helium gamma onto Guide mode',
);

const checkpointB = {
  fileId: 'heat-b',
  mode: 'guide',
} as HeatCapacityModeUiCheckpoint;
assert.deepEqual(
  resolveWorkbenchActiveModeCheckpointOverride(
    'heat-b',
    'guide',
    createWorkbenchActiveModeCheckpointOverride('heat-b', 'guide', checkpointB),
  ),
  { provided: true, checkpoint: checkpointB },
  'a target file with a non-null checkpoint must own the materialized persistence snapshot',
);
assert.deepEqual(
  resolveWorkbenchActiveModeCheckpointOverride(
    'heat-b',
    'guide',
    createWorkbenchActiveModeCheckpointOverride('heat-b', 'guide', null),
  ),
  { provided: true, checkpoint: null },
  'an explicit target null checkpoint must not fall back to the previous file render state',
);
assert.deepEqual(
  resolveWorkbenchActiveModeCheckpointOverride(
    'heat-b',
    'guide',
    createWorkbenchActiveModeCheckpointOverride('heat-a', 'guide', {
      ...checkpointB,
      fileId: 'heat-a',
    }),
  ),
  { provided: false, checkpoint: null },
  'an override owned by file A must never be applied while file B is active',
);

const source = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchIndexedDbPersistence.ts',
), 'utf8');
const failedInitializationBranch = source.match(
  /const performWorkbenchIndexedDbInitialization = async[\s\S]*?\} catch \(cause\) \{([\s\S]*?)\n  \}\n\};/,
)?.[1] ?? '';
assert.ok(
  failedInitializationBranch.length > 0,
  'the IndexedDB initialization failure branch must remain visible to the data-retention regression test',
);
assert.doesNotMatch(
  failedInitializationBranch,
  /objectStore\([^)]*\)\.(?:clear|delete)\(|indexedDB\.deleteDatabase\(/,
  'initialization failure must surface read-only recovery without deleting malformed or missing workspace records',
);
assert.equal(isWorkbenchRefreshMetadataAnchorRecoverySourceVersion('5.1.2'), true);
assert.equal(
  isWorkbenchRefreshMetadataAnchorRecoverySourceVersion('5.1.3'),
  false,
  'the compatibility recovery must not silently accept a new-format writer producing the same mismatch',
);
assert.doesNotMatch(
  source.match(/export const createPersistenceRecords =[\s\S]*?const deleteStaleNamespaceRecords/)?.[0] ?? '',
  /encodeWorkbenchStorageEnvelope|createHeatCapacityPersistencePayload/,
  'normal v2 writes must not traverse the legacy migration encoder',
);
const normalV2LoadSource = source.match(
  /const loadWorkspaceFromIndexedDb =[\s\S]*?type WorkbenchPersistenceRecords/,
)?.[0] ?? '';
assert.doesNotMatch(
  normalV2LoadSource,
  /decodeWorkbenchSession/,
  'normal v2 reads must construct runtime files directly without traversing the legacy v1 decoder',
);
assert.doesNotMatch(
  normalV2LoadSource,
  /createWorkbenchSessionFromRuntimeFiles/,
  'normal v2 reads must not run canonical records through the legacy repair constructor',
);
assert.match(
  normalV2LoadSource,
  /createWorkbenchSessionFromCanonicalFiles/,
  'normal v2 reads should use the lossless canonical runtime file constructor',
);
assert.match(
  source,
  /assertDistinctWorkspaceFileCollections[\s\S]*assertUniqueWorkbenchFileCollections\(openFiles, closedFiles, activeFileId\)/,
  'the IndexedDB writer must enforce the same global ownership invariant as the UI commit boundary',
);
assert.match(source, /areWorkspaceFileIdentitiesValid[\s\S]*openFileIds\.includes\(activeFileId\)/);
assert.match(source, /Workspace persistence cannot save an orphaned active mode checkpoint/);
assert.match(source, /Workspace persistence cannot save refresh metadata for a different active mode/);
assert.match(source, /Workspace persistence cannot preserve mismatched refresh and mode-session anchors/);
assert.match(
  source,
  /captureCurrentMode: activeModeFile && !snapshot\.preserveActiveHeatCapacityModeSession,[\s\S]*refreshMetadata\?\.capturedAtMs \?\? savedAtMs/,
  'normal saves must use the refresh checkpoint or a fresh save time as the active runtime anchor, never an old UI checkpoint, while retaining inactive canonical mode stores',
);
assert.match(
  normalV2LoadSource,
  /resolveWorkbenchHeatCapacityModeRestoreAtMs\(\{[\s\S]*refreshTarget: effectiveRefreshMetadata,[\s\S]*modeSessionCapturedAtMs: currentEntry\.capturedAtMs/,
  'normal v2 loads must defer the active refresh target to its original mode-session anchor',
);
const refreshAnchorRecoverySource = source.match(
  /const loadReadyWorkspaceWithRefreshMetadataRecovery = async[\s\S]*?\n\};/,
)?.[0] ?? '';
assert.match(
  refreshAnchorRecoverySource,
  /WorkbenchRefreshMetadataAnchorMismatchError[\s\S]*migrationState !== 'ready'[\s\S]*isWorkbenchRefreshMetadataAnchorRecoverySourceVersion[\s\S]*ignoreRefreshMetadata: true/,
  'only a ready 5.1.2 workspace whose strict load reports the typed anchor mismatch may ignore refresh metadata',
);
assert.doesNotMatch(
  refreshAnchorRecoverySource,
  /objectStore\([^)]*\)\.(?:clear|delete)\(|indexedDB\.deleteDatabase\(|\.put\(/,
  'refresh metadata recovery must remain a read-only initialization path',
);
assert.match(
  normalV2LoadSource,
  /const effectiveRefreshMetadata = options\.ignoreRefreshMetadata[\s\S]*refreshTarget: effectiveRefreshMetadata[\s\S]*restoreRefreshSessionFromMetadata\([\s\S]*effectiveRefreshMetadata/,
  'recovery must isolate the same refresh metadata from both mode rebase and transient UI reconstruction',
);
assert.equal(isWorkbenchRefreshMetadataTargetActive('heat-1', 'heat-1', ['heat-1']), true);
assert.equal(
  isWorkbenchRefreshMetadataTargetActive('heat-closed', 'heat-open', ['heat-open']),
  false,
  'refresh metadata must not restore a closed heat-capacity file',
);
assert.equal(
  isWorkbenchRefreshMetadataTargetActive('heat-other', 'heat-open', ['heat-open', 'heat-other']),
  false,
  'refresh metadata must match the workspace activeFileId even when another heat-capacity file is open',
);
assert.match(source, /IndexedDB refresh metadata does not target the active open file/);
assert.match(source, /restoreDeferredGuideUi[\s\S]*checkpoint\.payload\.guide/);
assert.match(source, /committedWorkspaceSources[\s\S]*fileRecordsToWrite[\s\S]*modeRecordsToWrite/);
assert.match(
  source,
  /const newFileIdentity = !previousSources\?\.fileKeys\.has\(sourceFileKey\);[\s\S]*!previousSources \|\|[\s\S]*newFileIdentity \|\|[\s\S]*activeModeRecord/,
  'a new heat-capacity identity must force all Free, Guide, and Demo records through the incremental writer',
);
assert.match(source, /fileRecordsToWrite\.forEach\(\(record\) => fileStore\.put\(record\)\)/);
assert.match(source, /modeRecordsToWrite\.forEach\(\(record\) => modeStore\.put\(record\)\)/);
assert.match(source, /if \(!persistenceReady\)[\s\S]*last successful workspace remains unchanged/);
assert.match(source, /verifyWrittenWorkspace[\s\S]*actualFileRecords[\s\S]*actualModeRecords/);
assert.doesNotMatch(
  source,
  /saveWorkbenchWorkspaceV2ToIndexedDb|legacyV2WritesEnabled/,
  '5.2 production autosaves must not rewrite the legacy V2 workspace shadow',
);
assert.match(
  source,
  /commitRestoredV2WorkspaceIntoV3[\s\S]*persistenceWorkerClient\.save\([\s\S]*commitWorkbenchPersistenceV3WithQuotaRecovery/,
  'a verified V2 restore must migrate once through the worker or the bounded read-back verified V3 fallback',
);
assert.match(
  source,
  /saveWorkbenchWorkspaceToIndexedDb[\s\S]*persistenceWorkerClient\.save[\s\S]*WorkbenchPersistenceWorkerTransportError[\s\S]*waitForWorkbenchPersistenceIdle\(\)[\s\S]*commitWorkbenchPersistenceV3WithQuotaRecovery[\s\S]*retainedPersistenceV3StateByNamespace\.set/,
  'production saves must prefer the V3 worker, retry transport once, then use an idle-only bounded fallback',
);
assert.match(
  source,
  /const waitForWorkbenchPersistenceIdle =[\s\S]*requestIdleCallback[\s\S]*timeout: 2_000[\s\S]*setTimeout\(resolve, 0\)/,
  'the no-worker fallback must yield to an idle period instead of restoring a high-frequency main-thread write path',
);
assert.match(
  source,
  /actualNamespaceFileKeys[\s\S]*expectedFileKeys[\s\S]*actualNamespaceModeKeys[\s\S]*expectedModeKeys/,
  'post-commit verification must reject missing or unexpected namespace records',
);
assert.match(
  source,
  /IDBKeyRange\.bound\([\s\S]*expected\.meta\.namespace[\s\S]*getAllKeys\(namespaceKeyRange\)/,
  'post-commit key verification must stay bounded to the active namespace',
);
assert.match(
  source,
  /restored\.revision === expected\.meta\.lastSuccessfulSaveAtMs/,
  'strict reconstruction must be bound to the exact committed revision',
);
assert.match(source, /restoredOpenIds[\s\S]*expected\.meta\.openFileIds[\s\S]*restoredClosedIds[\s\S]*expected\.meta\.closedFileIds/);
assert.match(source, /const rawClosed = freshWindow[\s\S]*\? null[\s\S]*WORKBENCH_CLOSED_FILES_STORAGE_KEY/);
assert.match(source, /if \(!freshWindow\) window\.localStorage\.removeItem\(WORKBENCH_CLOSED_FILES_STORAGE_KEY\)/);
assert.match(source, /legacyFallback\?\.hasLegacyData[\s\S]*installBootstrap\(fallback\.session, fallback\.closedFiles, fallback\.refreshSession\)/);
assert.match(
  source,
  /existingMeta\?\.migrationState === 'cleanup-pending'[\s\S]*attachLegacySceneSnapshotToRefreshBootstrap[\s\S]*removeLegacyStorageKeys\(\)/,
  'an interrupted cleanup must capture a verified legacy scene snapshot before deleting its one-time source',
);
assert.match(
  source,
  /const verified = await loadWorkspaceFromIndexedDb[\s\S]*attachLegacySceneSnapshotToRefreshBootstrap[\s\S]*legacyFallback\.removeAfterVerifiedWrite\(\)/,
  'a completed migration must attach its one-time scene snapshot before deleting legacy storage',
);

const reconstructedRefresh = createWorkbenchHeatCapacityRefreshSession('heat-legacy', 'guide', 2_000);
reconstructedRefresh.checkpointId = 'checkpoint-verified';
const legacyRefresh = createWorkbenchHeatCapacityRefreshSession('heat-legacy', 'guide', 1_900);
legacyRefresh.checkpointId = reconstructedRefresh.checkpointId;
legacyRefresh.sceneSnapshot = {
  snapshotId: 'legacy-scene-once',
  capturedCheckpointId: 'checkpoint-before-verified',
  sceneRevision: 'heat-capacity-instrument-scene-v1',
  cameraPoseRevision: null,
  capturedAtMs: 1_900,
  mimeType: 'image/png',
  imageDataUrl: 'data:image/png;base64,AA==',
  widthPx: 1,
  heightPx: 1,
  widthCssPx: 1,
  heightCssPx: 1,
  pixelRatio: 1,
  themeId: null,
  performanceProfileId: null,
};
const refreshBootstrapWithLegacyScene = attachLegacySceneSnapshotToRefreshBootstrap(
  reconstructedRefresh,
  legacyRefresh,
);
assert.deepEqual(
  refreshBootstrapWithLegacyScene?.sceneSnapshot,
  legacyRefresh.sceneSnapshot,
  'the first verified bootstrap may retain the matching legacy scene snapshot once',
);
assert.equal(
  reconstructedRefresh.sceneSnapshot,
  null,
  'one-time bootstrap attachment must not mutate the canonical IndexedDB reconstruction',
);
const mismatchedLegacyRefresh = {
  ...legacyRefresh,
  checkpointId: 'checkpoint-from-another-state',
};
assert.equal(
  attachLegacySceneSnapshotToRefreshBootstrap(reconstructedRefresh, mismatchedLegacyRefresh)?.sceneSnapshot,
  null,
  'a stale legacy scene snapshot must not cross a checkpoint boundary',
);
assert.match(source, /persistenceReady = false;[\s\S]*catch \(cause\)/);
assert.match(
  source,
  /const markPersistenceReady = \([\s\S]*?\) => \{[\s\S]*persistenceReady = true;[\s\S]*scheduleTemporaryNamespaceCleanup\(\)/,
  'temporary namespace cleanup should start only after persistence initialization succeeds',
);
assert.match(
  source,
  /const runCleanup = \(\) => \{[\s\S]*if \(!persistenceReady\) return;/,
  'a cleanup timer retained across a failed retry must not touch IndexedDB while persistence is unavailable',
);
assert.doesNotMatch(
  source,
  /database = await openWorkbenchDatabase\(\);\s*await cleanupExpiredTemporaryNamespaces/,
  'fatal persistence initialization must not delete temporary namespaces before the workspace becomes ready',
);
assert.equal(isWorkbenchWorkspaceRevisionCurrent(null, null), true);
assert.equal(isWorkbenchWorkspaceRevisionCurrent(42, 42), true);
assert.equal(isWorkbenchWorkspaceRevisionCurrent(null, 42), false);
assert.equal(isWorkbenchWorkspaceRevisionCurrent(41, 42), false);
assert.equal(
  isWorkbenchMigrationStateTransitionCurrent(
    100,
    'pending-verification',
    100,
    'pending-verification',
    'cleanup-pending',
  ),
  true,
  'the owner of the current pending migration revision may advance verification',
);
assert.equal(
  isWorkbenchMigrationStateTransitionCurrent(
    100,
    'pending-verification',
    101,
    'cleanup-pending',
    'cleanup-pending',
  ),
  false,
  'a second migrator must not advance state from a stale revision and state snapshot',
);
assert.equal(
  isWorkbenchMigrationStateTransitionCurrent(
    100,
    'pending-verification',
    102,
    'ready',
    'cleanup-pending',
  ),
  false,
  'an old migration must not overwrite a workspace that another tab has already made ready',
);
assert.equal(getWorkbenchMigrationConflictRecoveryAction('pending-verification'), 'wait');
assert.equal(getWorkbenchMigrationConflictRecoveryAction('cleanup-pending'), 'wait');
assert.equal(getWorkbenchMigrationConflictRecoveryAction('ready'), 'restore-ready');
assert.equal(getWorkbenchMigrationConflictRecoveryAction(null), 'fail');
const preRevisionMeta = {
  schemaFamily: 'hard-sphere-lab/workspace-indexeddb-v2',
  schemaVersion: 2,
  namespace: 'persistent:main',
  appVersion: '4.3.1',
  savedAtMs: 42,
  activeFileId: 'standard-1',
  selectedPanel: 'preview',
  openFileIds: ['standard-1'],
  closedFileIds: [],
  refreshMetadata: null,
};
assert.deepEqual(
  normalizeWorkbenchWorkspaceMetaRecord(preRevisionMeta),
  {
    ...preRevisionMeta,
    lastSuccessfulSaveAtMs: 42,
    migrationState: 'ready',
  },
  'workspace metadata written before revision-CAS fields existed must restore in place without clearing IndexedDB',
);
const legacyFileOrderingMeta = {
  ...preRevisionMeta,
  activeFileId: 'standard-1',
  selectedPanel: 'retired-panel',
  fileIds: ['standard-1'],
  refreshMetadata: {
    activeHeatCapacityFileId: 'heat-legacy',
    mode: 'free',
    checkpointId: 'legacy-checkpoint',
    capturedAtMs: 42,
    modeTransition: {},
    ui: {},
  },
};
delete (legacyFileOrderingMeta as Partial<typeof legacyFileOrderingMeta>).openFileIds;
delete (legacyFileOrderingMeta as Partial<typeof legacyFileOrderingMeta>).closedFileIds;
assert.deepEqual(
  normalizeWorkbenchWorkspaceMetaRecord(legacyFileOrderingMeta),
  {
    ...legacyFileOrderingMeta,
    activeFileId: 'standard-1',
    selectedPanel: 'preview',
    openFileIds: ['standard-1'],
    closedFileIds: [],
    refreshMetadata: null,
    lastSuccessfulSaveAtMs: 42,
    migrationState: 'ready',
  },
  'legacy IndexedDB ordering and optional refresh UI metadata must upgrade without discarding workspace files',
);
assert.deepEqual(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    activeFileId: '',
    openFileIds: [],
  }),
  {
    ...preRevisionMeta,
    activeFileId: null,
    openFileIds: [],
    lastSuccessfulSaveAtMs: 42,
    migrationState: 'ready',
  },
  'the historical empty active-file sentinel must normalize to the canonical null identity',
);
assert.equal(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    lastSuccessfulSaveAtMs: undefined,
  }),
  null,
  'an explicitly corrupt revision must not be mistaken for the legacy missing-field shape',
);
assert.equal(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    lastSuccessfulSaveAtMs: 41,
    migrationState: 'ready',
    refreshMetadata: null,
  }),
  null,
  'current IndexedDB metadata must reject a logical revision older than its physical save anchor',
);
assert.equal(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    savedAtMs: -1,
    lastSuccessfulSaveAtMs: -1,
    migrationState: 'ready',
    refreshMetadata: null,
  }),
  null,
  'current IndexedDB metadata must reject negative physical and logical clocks',
);
assert.equal(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    savedAtMs: 42.5,
    lastSuccessfulSaveAtMs: 43,
    migrationState: 'ready',
    refreshMetadata: null,
  }),
  null,
  'current IndexedDB metadata must reject fractional physical clocks',
);
assert.equal(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    lastSuccessfulSaveAtMs: Number.MAX_VALUE,
    migrationState: 'ready',
    refreshMetadata: null,
  }),
  null,
  'current IndexedDB metadata must reject logical revisions outside the safe integer range',
);
assert.equal(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    migrationState: 'unknown',
  }),
  null,
  'an explicitly corrupt migration state must not be defaulted to ready',
);
assert.equal(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    lastSuccessfulSaveAtMs: 42,
    migrationState: 'ready',
    refreshMetadata: {
      activeHeatCapacityFileId: 'heat-current',
      mode: 'guide',
      checkpointId: 'corrupt-current-checkpoint',
    },
  }),
  null,
  'current IndexedDB metadata must reject explicitly corrupt refresh metadata instead of silently dropping it',
);
const currentMetaWithoutRefreshMetadata = {
  ...preRevisionMeta,
  lastSuccessfulSaveAtMs: 42,
  migrationState: 'ready',
} as Partial<typeof preRevisionMeta> & {
  lastSuccessfulSaveAtMs: number;
  migrationState: 'ready';
};
delete currentMetaWithoutRefreshMetadata.refreshMetadata;
assert.equal(
  normalizeWorkbenchWorkspaceMetaRecord(currentMetaWithoutRefreshMetadata),
  null,
  'current IndexedDB metadata must require its canonical refreshMetadata property even when no refresh session is active',
);
assert.match(
  source,
  /currentMetaValue[\s\S]*expectedRevision[\s\S]*WorkbenchPersistenceConflictError/,
  'normal writes should compare their expected revision inside the readwrite transaction',
);
assert.match(
  source,
  /'pending-verification', null, existingMeta\?\.lastSuccessfulSaveAtMs \?\? null\)/,
  'legacy migration writes must compare the revision observed before reading the legacy source',
);
assert.match(
  source,
  /const updateMigrationState[\s\S]*metaStore\.get\(meta\.namespace\)[\s\S]*isWorkbenchMigrationStateTransitionCurrent[\s\S]*WorkbenchPersistenceConflictError/,
  'migration-state advances must re-read and compare revision plus state inside their readwrite transaction',
);
assert.match(
  source,
  /const updateMigrationState[\s\S]*Math\.max\(Date\.now\(\), currentMeta\.savedAtMs\)[\s\S]*advanceWorkbenchWorkspaceMetaRevision\([\s\S]*currentMeta\.lastSuccessfulSaveAtMs[\s\S]*transaction\.abort\(\)/,
  'migration-state advances must keep the physical transition clock separate and abort if their logical revision cannot advance safely',
);
assert.match(
  source,
  /const waitForReadyWorkspaceAfterMigrationConflict[\s\S]*getWorkbenchMigrationConflictRecoveryAction[\s\S]*WORKBENCH_MIGRATION_CONFLICT_POLL_INTERVAL_MS[\s\S]*error instanceof WorkbenchPersistenceConflictError[\s\S]*waitForReadyWorkspaceAfterMigrationConflict/,
  'a tab losing a migration race should wait for the bounded pending/cleanup handoff and reload the winning canonical workspace',
);
assert.match(
  source,
  /const previousRevision = currentRevision \?\? 0;[\s\S]*const nextRevision = previousRevision \+ 1;[\s\S]*nextRevision <= previousRevision[\s\S]*Math\.max\(meta\.savedAtMs, nextRevision\)/,
  'workspace revisions should advance monotonically even within one Date.now millisecond',
);
const sameMillisecondCommitMeta = advanceWorkbenchWorkspaceMetaRevision(
  normalizeWorkbenchWorkspaceMetaRecord({
    ...preRevisionMeta,
    lastSuccessfulSaveAtMs: 42,
    migrationState: 'ready',
    refreshMetadata: null,
  })!,
  42,
);
assert.equal(sameMillisecondCommitMeta.savedAtMs, 42);
assert.equal(
  sameMillisecondCommitMeta.lastSuccessfulSaveAtMs,
  43,
  'same-millisecond CAS must advance only the logical revision without moving the physical capture anchor',
);
assert.throws(
  () => advanceWorkbenchWorkspaceMetaRevision(sameMillisecondCommitMeta, Number.MAX_SAFE_INTEGER),
  /cannot advance safely/,
  'CAS must fail explicitly instead of silently reusing a revision at the safe-integer boundary',
);
assert.match(
  source,
  /records\.meta = advanceWorkbenchWorkspaceMetaRevision\(records\.meta, currentRevision\)/,
  'the IndexedDB transaction must commit the separated physical anchor and logical revision together',
);
assert.match(
  source,
  /const productionSnapshot = materializePersistenceV3Snapshot\([\s\S]*persistenceWorkerClient\.save\(\{[\s\S]*snapshot: productionSnapshot/,
  'normal writes should materialize one immutable V3 snapshot before their first worker wait',
);
assert.equal(
  areCanonicalPersistenceValuesEqual({ alpha: 1, beta: 2 }, { beta: 2, alpha: 1 }),
  true,
  'canonical persistence equality must ignore object insertion order',
);
assert.equal(
  areCanonicalPersistenceValuesEqual({ alpha: 1, beta: undefined }, { alpha: 1 }),
  false,
  'canonical persistence equality must distinguish an explicit undefined property from an omitted property',
);
assert.doesNotMatch(
  source,
  /JSON\.stringify\((?:normalized|actual|createRefreshMetadata)/,
  'canonical IndexedDB validation must not use JSON.stringify equality',
);
assert.match(
  source,
  /const currentMeta = normalizeWorkbenchWorkspaceMetaRecord\([\s\S]*metaStore\.get\(meta\.namespace\)[\s\S]*currentMeta\.savedAtMs !== meta\.savedAtMs[\s\S]*currentMeta\.lastSuccessfulSaveAtMs !== meta\.lastSuccessfulSaveAtMs[\s\S]*currentMeta\.savedAtMs >= expiresBeforeMs[\s\S]*metaStore\.delete\(meta\.namespace\)/,
  'temporary namespace cleanup must revalidate age and revision in the deleting transaction',
);
assert.match(
  source,
  /database\.addEventListener\('versionchange',[\s\S]*database\.close\(\)[\s\S]*databasePromise === cachedOpening[\s\S]*databasePromise = null/,
  'a versionchange must close the stale connection and invalidate only its own cached opening',
);
assert.match(
  source,
  /request\.addEventListener\('blocked',[\s\S]*reject\(new Error[\s\S]*WORKBENCH_INDEXED_DB_BLOCKED_TIMEOUT_MS/,
  'a blocked database upgrade must fail after a bounded wait so initialization can show a retry card',
);
assert.match(
  source,
  /request\.addEventListener\('success',[\s\S]*if \(settled\)[\s\S]*database\.close\(\)/,
  'an unexpected late success after a terminal open event must close its untracked connection',
);

console.log('workbenchIndexedDbPersistencePolicy tests passed');
