import assert from 'node:assert/strict';
import {
  InMemoryWorkbenchPersistenceV3GenerationStore,
  type WorkbenchPersistenceV3GenerationCandidate,
} from '../../src/features/workbench/persistenceV3/generationStore.ts';
import {
  WorkbenchPersistenceV3Error,
} from '../../src/features/workbench/persistenceV3/contract.ts';

interface TestGenerationContent {
  label: string;
  values: number[];
  nested?: {
    enabled: boolean;
  };
}

const namespace = 'workspace-generation-test';
const createCandidate = (
  generationId: string,
  contentFingerprint: string,
  content: TestGenerationContent,
  capturedAtMs: number,
): WorkbenchPersistenceV3GenerationCandidate<TestGenerationContent> => ({
  namespace,
  generationId,
  contentFingerprint,
  capturedAtMs,
  content,
});

const assertGenerationError = (
  expectedKind: WorkbenchPersistenceV3Error['kind'],
  expectedCode: string,
) => (error: unknown) => {
  assert.equal(error instanceof WorkbenchPersistenceV3Error, true);
  const generationError = error as WorkbenchPersistenceV3Error;
  assert.equal(generationError.kind, expectedKind);
  assert.equal(generationError.diagnostic.code, expectedCode);
  return true;
};

const store =
  new InMemoryWorkbenchPersistenceV3GenerationStore<TestGenerationContent>();

const initialHead = await store.readHead(namespace);
assert.deepEqual(initialHead, {
  namespace,
  revision: 0,
  currentGenerationId: null,
  previousGenerationId: null,
});

const candidateA = createCandidate(
  'generation-a',
  'fingerprint-a',
  {
    label: 'A',
    values: [1, 2],
    nested: { enabled: true },
  },
  100,
);
const stagedA = await store.stageCandidate(candidateA);
assert.equal(stagedA.status, 'staged');
assert.deepEqual(
  await store.readHead(namespace),
  initialHead,
  'staging a candidate must not create or advance the head',
);

candidateA.content.values.push(999);
stagedA.generation.content.values.push(998);
const readbackA = await store.readGeneration(namespace, 'generation-a');
assert.deepEqual(
  readbackA,
  createCandidate(
    'generation-a',
    'fingerprint-a',
    {
      label: 'A',
      values: [1, 2],
      nested: { enabled: true },
    },
    100,
  ),
  'staged content and readback values must be isolated from caller mutations',
);
readbackA!.content.values.push(997);
assert.deepEqual(
  (await store.readGeneration(namespace, 'generation-a'))?.content.values,
  [1, 2],
  'mutating one readback must not mutate the stored candidate',
);

const duplicateA = await store.stageCandidate(
  createCandidate(
    'generation-a',
    'fingerprint-a',
    {
      nested: { enabled: true },
      values: [1, 2],
      label: 'A',
    },
    100,
  ),
);
assert.equal(duplicateA.status, 'already-staged');
assert.equal(
  duplicateA.generation.capturedAtMs,
  100,
  'idempotent staging must return the original immutable generation metadata',
);

await assert.rejects(
  store.stageCandidate(
    createCandidate(
      'generation-a',
      'fingerprint-a',
      {
        nested: { enabled: true },
        values: [1, 2],
        label: 'A',
      },
      999,
    ),
  ),
  assertGenerationError(
    'conflict',
    'persistence-v3-generation-descriptor-conflict',
  ),
  'the same generation identity cannot be rebound to a different capture time',
);

await assert.rejects(
  store.stageCandidate(
    createCandidate(
      'generation-a',
      'fingerprint-conflict',
      { label: 'A', values: [1, 2], nested: { enabled: true } },
      101,
    ),
  ),
  assertGenerationError(
    'conflict',
    'persistence-v3-generation-content-address-conflict',
  ),
);
await assert.rejects(
  store.stageCandidate(
    createCandidate(
      'generation-a',
      'fingerprint-a',
      { label: 'different-content', values: [1, 2] },
      102,
    ),
  ),
  assertGenerationError(
    'conflict',
    'persistence-v3-generation-content-address-conflict',
  ),
);
assert.deepEqual(
  (await store.readGeneration(namespace, 'generation-a'))?.content,
  { label: 'A', values: [1, 2], nested: { enabled: true } },
  'a content-address conflict must never overwrite the first staged generation',
);
assert.deepEqual(
  await store.readHead(namespace),
  initialHead,
  'content-address conflicts must not mutate the head',
);

await assert.rejects(
  store.compareAndSwapHead({
    namespace,
    generationId: 'generation-missing',
    expectedRevision: 0,
  }),
  assertGenerationError(
    'snapshot-contract',
    'persistence-v3-generation-candidate-missing',
  ),
);

const activatedA = await store.compareAndSwapHead({
  namespace,
  generationId: 'generation-a',
  expectedRevision: 0,
});
assert.deepEqual(activatedA, {
  ok: true,
  status: 'activated',
  head: {
    namespace,
    revision: 1,
    currentGenerationId: 'generation-a',
    previousGenerationId: null,
  },
});

await store.stageCandidate(
  createCandidate(
    'generation-b',
    'fingerprint-b',
    { label: 'B', values: [3] },
    200,
  ),
);
assert.equal(
  (await store.readHead(namespace)).revision,
  1,
  'a later staged candidate must remain invisible to readers of the head',
);

const staleActivation = await store.compareAndSwapHead({
  namespace,
  generationId: 'generation-b',
  expectedRevision: 0,
});
assert.deepEqual(staleActivation, {
  ok: false,
  status: 'revision-conflict',
  expectedRevision: 0,
  head: {
    namespace,
    revision: 1,
    currentGenerationId: 'generation-a',
    previousGenerationId: null,
  },
});

const activatedB = await store.compareAndSwapHead({
  namespace,
  generationId: 'generation-b',
  expectedRevision: 1,
});
assert.deepEqual(activatedB, {
  ok: true,
  status: 'activated',
  head: {
    namespace,
    revision: 2,
    currentGenerationId: 'generation-b',
    previousGenerationId: 'generation-a',
  },
});

await store.stageCandidate(
  createCandidate(
    'generation-c',
    'fingerprint-c',
    { label: 'C', values: [4] },
    300,
  ),
);
const activatedC = await store.compareAndSwapHead({
  namespace,
  generationId: 'generation-c',
  expectedRevision: 2,
});
assert.deepEqual(activatedC, {
  ok: true,
  status: 'activated',
  head: {
    namespace,
    revision: 3,
    currentGenerationId: 'generation-c',
    previousGenerationId: 'generation-b',
  },
});

const alreadyCurrent = await store.compareAndSwapHead({
  namespace,
  generationId: 'generation-c',
  expectedRevision: 3,
});
assert.deepEqual(alreadyCurrent, {
  ok: true,
  status: 'already-current',
  head: activatedC.head,
});
assert.equal(
  (await store.readHead(namespace)).revision,
  3,
  'idempotently activating the current generation must not consume a revision',
);

for (const [id, fingerprint, label, capturedAtMs] of [
  ['generation-d', 'fingerprint-d', 'D', 400],
  ['generation-e', 'fingerprint-e', 'E', 500],
] as const) {
  await store.stageCandidate(
    createCandidate(id, fingerprint, { label, values: [] }, capturedAtMs),
  );
}

const pruneResult = await store.pruneGenerations(namespace, {
  retainGenerationIds: ['generation-d', 'not-present'],
});
assert.deepEqual(
  [...pruneResult.retainedGenerationIds].sort(),
  ['generation-b', 'generation-c', 'generation-d'],
  'prune must always retain current, previous, and explicitly retained generations',
);
assert.deepEqual(
  [...pruneResult.removedGenerationIds].sort(),
  ['generation-a', 'generation-e'],
);
assert.deepEqual(
  [...await store.listGenerationIds(namespace)].sort(),
  ['generation-b', 'generation-c', 'generation-d'],
);
assert.notEqual(await store.readGeneration(namespace, 'generation-b'), null);
assert.notEqual(await store.readGeneration(namespace, 'generation-c'), null);

const rollbackToPrevious = await store.compareAndSwapHead({
  namespace,
  generationId: 'generation-b',
  expectedRevision: 3,
});
assert.deepEqual(rollbackToPrevious, {
  ok: true,
  status: 'activated',
  head: {
    namespace,
    revision: 4,
    currentGenerationId: 'generation-b',
    previousGenerationId: 'generation-c',
  },
});

const otherNamespace = 'workspace-generation-test-other';
await store.stageCandidate({
  namespace: otherNamespace,
  generationId: 'generation-a',
  contentFingerprint: 'other-fingerprint',
  capturedAtMs: 1,
  content: { label: 'other', values: [] },
});
assert.deepEqual(await store.readHead(otherNamespace), {
  namespace: otherNamespace,
  revision: 0,
  currentGenerationId: null,
  previousGenerationId: null,
});
assert.equal(
  await store.readGeneration(namespace, 'generation-a'),
  null,
  'generation identities are isolated by workspace namespace',
);
assert.notEqual(
  await store.readGeneration(otherNamespace, 'generation-a'),
  null,
);

await assert.rejects(
  store.compareAndSwapHead({
    namespace,
    generationId: 'generation-b',
    expectedRevision: -1,
  }),
  assertGenerationError(
    'snapshot-contract',
    'persistence-v3-generation-invalid-expected-revision',
  ),
);

const uncloneableStore =
  new InMemoryWorkbenchPersistenceV3GenerationStore<unknown>();
await assert.rejects(
  uncloneableStore.stageCandidate({
    namespace: 'workspace-uncloneable',
    generationId: 'generation-uncloneable',
    contentFingerprint: 'fingerprint-uncloneable',
    capturedAtMs: 1,
    content: { callback: () => undefined },
  }),
  assertGenerationError(
    'snapshot-contract',
    'persistence-v3-generation-content-not-cloneable',
  ),
);
assert.deepEqual(
  await uncloneableStore.listGenerationIds('workspace-uncloneable'),
  [],
  'an uncloneable candidate must not leave a partial generation behind',
);
assert.equal(
  (await uncloneableStore.readHead('workspace-uncloneable')).revision,
  0,
);

console.log('workbenchPersistenceV3GenerationStore tests passed');
