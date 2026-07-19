import assert from 'node:assert/strict';
import {
  InMemoryWorkbenchPersistenceV3GenerationStore,
  type WorkbenchPersistenceV3GenerationStore,
} from '../../src/features/workbench/persistenceV3/generationStore.ts';
import {
  commitWorkbenchPersistenceV3ProductionSnapshot,
  restoreWorkbenchPersistenceV3ProductionWorkspace,
} from '../../src/features/workbench/persistenceV3/productionFacade.ts';
import {
  createDefaultHeatCapacityFile,
  createDefaultStandardFile,
} from '../../src/features/workbench/workbenchState.ts';

const namespace = 'production-facade-test';
const store = new InMemoryWorkbenchPersistenceV3GenerationStore();
const healthy = createDefaultStandardFile(1);
const future = createDefaultHeatCapacityFile(2);
future.heatCapacityFreeRuntimeVersion = 999_999 as never;

const first = await commitWorkbenchPersistenceV3ProductionSnapshot({
  store,
  namespace,
  generationId: 'generation-1',
  capturedAtMs: 100,
  snapshot: {
    files: [healthy],
    closedFiles: [future],
    activeFileId: healthy.id,
    selectedPanel: 'preview',
  },
});
assert.equal(first.retained.opaqueFiles.length, 1);
assert.equal(first.retained.opaqueFiles[0]?.fileId, future.id);
assert.deepEqual(first.retained.opaqueFiles[0]?.raw, future);

const restoredFirst = await restoreWorkbenchPersistenceV3ProductionWorkspace(
  store,
  namespace,
);
assert.ok(restoredFirst);
assert.equal(restoredFirst.usedPreviousGeneration, false);
assert.deepEqual(restoredFirst.files.map((file) => file.id), [healthy.id]);
assert.deepEqual(restoredFirst.closedFiles, []);
assert.equal(restoredFirst.retained.opaqueFiles[0]?.fileId, future.id);

const renamedHealthy = {
  ...healthy,
  name: 'Renamed healthy file',
};
await commitWorkbenchPersistenceV3ProductionSnapshot({
  store,
  namespace,
  generationId: 'generation-2',
  capturedAtMs: 200,
  snapshot: {
    files: [renamedHealthy],
    closedFiles: [],
    activeFileId: healthy.id,
    selectedPanel: 'results',
  },
  retained: first.retained,
});

const restoredSecond = await restoreWorkbenchPersistenceV3ProductionWorkspace(
  store,
  namespace,
);
assert.ok(restoredSecond);
assert.equal(restoredSecond.files[0]?.name, 'Renamed healthy file');
assert.equal(restoredSecond.selectedPanel, 'results');
assert.equal(
  restoredSecond.retained.opaqueFiles[0]?.fileId,
  future.id,
  'a future file must remain opaque across later healthy saves',
);

const corruptCurrentStore: WorkbenchPersistenceV3GenerationStore = {
  readHead: (targetNamespace) => store.readHead(targetNamespace),
  stageCandidate: (candidate) => store.stageCandidate(candidate),
  compareAndSwapHead: (command) => store.compareAndSwapHead(command),
  listGenerationIds: (targetNamespace) =>
    store.listGenerationIds(targetNamespace),
  pruneGenerations: (targetNamespace, options) =>
    store.pruneGenerations(targetNamespace, options),
  async readGeneration(targetNamespace, generationId) {
    const generation = await store.readGeneration(
      targetNamespace,
      generationId,
    );
    if (generation === null || generationId !== 'generation-2') {
      return generation;
    }
    return {
      ...generation,
      contentFingerprint: 'corrupt-current-generation',
    };
  },
};
const restoredPrevious =
  await restoreWorkbenchPersistenceV3ProductionWorkspace(
    corruptCurrentStore,
    namespace,
  );
assert.ok(restoredPrevious);
assert.equal(restoredPrevious.generationId, 'generation-1');
assert.equal(restoredPrevious.usedPreviousGeneration, true);
assert.equal(restoredPrevious.files[0]?.name, healthy.name);

console.log('workbenchPersistenceV3ProductionFacade tests passed');
