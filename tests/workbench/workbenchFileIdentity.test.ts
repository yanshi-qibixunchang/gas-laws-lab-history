import assert from 'node:assert/strict';
import {
  assertUniqueWorkbenchFileCollections,
  createUniqueWorkbenchFileId,
  getNextWorkbenchFileDisplayIndex,
} from '../../src/features/workbench/workbenchFileIdentity.ts';
import {
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  type WorkbenchFileKind,
  type WorkbenchFileState,
} from '../../src/features/workbench/workbenchState.ts';
import { createPersistenceRecords } from '../../src/features/workbench/workbenchIndexedDbPersistence.ts';

(globalThis as typeof globalThis & { __APP_VERSION__: string }).__APP_VERSION__ = '5.1.2';

const UUID_A = '00000000-0000-4000-8000-000000000001';
const UUID_B = '00000000-0000-4000-8000-000000000002';
const UUID_C = '00000000-0000-4000-8000-000000000003';

const legacyHeat = createDefaultHeatCapacityFile(1);
const legacyIdeal = createDefaultIdealFile(1);
const legacyStandard = createDefaultStandardFile(1);
assert.deepEqual(
  [legacyHeat.id, legacyIdeal.id, legacyStandard.id],
  ['heatCapacity-001', 'ideal-001', 'standard-001'],
  'legacy sequential identities must remain readable and must not be rewritten',
);

const collisionValues = [UUID_A, UUID_B];
const collisionId = createUniqueWorkbenchFileId(
  'heatCapacity',
  new Set([`heatCapacity-${UUID_A}`]),
  () => collisionValues.shift()!,
);
assert.equal(collisionId, `heatCapacity-${UUID_B}`);
assert.throws(
  () => createUniqueWorkbenchFileId(
    'heatCapacity',
    new Set([`heatCapacity-${UUID_A}`]),
    () => UUID_A,
  ),
  /Unable to allocate a unique workspace file identity/,
  'a permanently issued identity must not be reused even after repeated collisions',
);
assert.throws(
  () => createUniqueWorkbenchFileId('ideal', new Set(), () => 'contains|separator'),
  /invalid UUID/,
  'new identities must never admit the IndexedDB key separator',
);

const numberedFiles: WorkbenchFileState[] = [
  createDefaultHeatCapacityFile(1),
  createDefaultHeatCapacityFile(2),
  createDefaultHeatCapacityFile(3),
];
assert.equal(
  getNextWorkbenchFileDisplayIndex('heatCapacity', numberedFiles.filter((file) => !file.id.endsWith('002'))),
  4,
  'deleting a middle experiment must not duplicate a visible number that still exists',
);
assert.equal(
  getNextWorkbenchFileDisplayIndex('heatCapacity', numberedFiles.slice(0, 2)),
  3,
  'deleting the last experiment may reuse its readable display slot without reusing its internal identity',
);
assert.equal(
  getNextWorkbenchFileDisplayIndex('heatCapacity', []),
  1,
  'an empty experiment collection should restart only the user-visible numbering',
);
assert.equal(
  getNextWorkbenchFileDisplayIndex('heatCapacity', [{
    ...createDefaultHeatCapacityFile(9),
    name: 'Custom experiment name',
  }]),
  1,
  'custom names must not be mistaken for the internal identity namespace',
);

assert.doesNotThrow(() => assertUniqueWorkbenchFileCollections(
  [legacyHeat, legacyIdeal],
  [legacyStandard],
  legacyHeat.id,
));
assert.throws(
  () => assertUniqueWorkbenchFileCollections([legacyHeat], [legacyHeat], legacyHeat.id),
  /globally unique/,
  'open and closed collections must never own the same identity',
);
assert.throws(
  () => assertUniqueWorkbenchFileCollections([legacyHeat, structuredClone(legacyHeat)], [], legacyHeat.id),
  /globally unique/,
  'duplicate identities inside one collection must be rejected before UI mutation',
);
assert.throws(
  () => assertUniqueWorkbenchFileCollections([legacyHeat], [], 'heatCapacity-missing'),
  /not open/,
  'the active identity must belong to the open collection',
);
assert.throws(
  () => assertUniqueWorkbenchFileCollections([legacyHeat], [], ''),
  /not open/,
  'a non-empty workspace must always have an active identity',
);
assert.doesNotThrow(() => assertUniqueWorkbenchFileCollections([], [], ''));

const issued = new Set<string>(numberedFiles.map((file) => file.id));
const deterministicUuids = [UUID_A, UUID_B, UUID_C];
const allocate = (kind: WorkbenchFileKind) => {
  const id = createUniqueWorkbenchFileId(kind, issued, () => deterministicUuids.shift()!);
  issued.add(id);
  return id;
};
const firstNewId = allocate('heatCapacity');
const secondNewId = allocate('heatCapacity');
assert.notEqual(firstNewId, secondNewId);
assert.equal(issued.has('heatCapacity-001'), true);
assert.equal(issued.has(firstNewId), true);
assert.equal(issued.has(secondNewId), true);

const createPersistedHeatFile = (id: string, index: number) => ({
  ...createDefaultHeatCapacityFile(index),
  id,
});
const firstNewFile = createPersistedHeatFile(firstNewId, 1);
const secondNewFile = createPersistedHeatFile(secondNewId, 1);
const recordsFor = (namespace: string, file: ReturnType<typeof createPersistedHeatFile>) => (
  createPersistenceRecords(namespace, {
    files: [file],
    closedFiles: [],
    activeFileId: file.id,
    selectedPanel: 'preview',
    refreshSession: null,
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: false,
  })
);
const firstRecords = recordsFor('identity-delete-create-a', firstNewFile);
const secondRecords = recordsFor('identity-delete-create-b', secondNewFile);
assert.equal(firstRecords.modeRecords.length, 3);
assert.equal(secondRecords.modeRecords.length, 3);
assert.deepEqual(
  firstRecords.modeRecords.map((record) => record.mode).sort(),
  ['demo', 'free', 'guide'],
  'every new heat-capacity identity must materialize all three mode records',
);
assert.equal(
  firstRecords.modeRecords.some((record) => secondRecords.modeRecords.some((other) => other.fileId === record.fileId)),
  false,
  'delete then create must never share mode-record ownership',
);

const rapidIssued = new Set<string>();
const rapidIds = Array.from({ length: 80 }, (_, index) => {
  const uuid = `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, '0')}`;
  const id = createUniqueWorkbenchFileId('heatCapacity', rapidIssued, () => uuid);
  rapidIssued.add(id);
  return id;
});
assert.equal(new Set(rapidIds).size, rapidIds.length, 'rapid consecutive creation must retain unique identities');

console.log('workbenchFileIdentity tests passed');
