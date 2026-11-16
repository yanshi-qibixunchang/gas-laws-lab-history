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
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultStandardFile,
} from '../../src/features/workbench/workbenchState.ts';

const namespace = 'production-facade-test';

// Repair both open/free and closed/guided legacy in-memory precision metadata
// before canonical validation, including the opaque fallback. Keep all other
// unknown fields available for future recovery rather than dropping the file.
const brokenFit = {
  precisionVersion: 'piston-continuous-precision-v1',
  linearFitResult: { slopeMPerS2: 0, precisionPlan: {
    version: 'piston-continuous-precision-v1', verified: false,
    gammaErrorInUc: NaN, combinedRelativeError: Infinity,
  } },
  sourceObservations: [1, 2, 3],
};
const practiceFiles = [createDefaultHeatCapacityPistonOscillationFile(31), createDefaultHeatCapacityPistonOscillationFile(32)];
for (const file of practiceFiles) file.pistonOscillationSchemaVersion = 999_999 as never;
practiceFiles[0].pistonOscillationFreeSession.dataProcessing = structuredClone(brokenFit) as never;
practiceFiles[1].pistonOscillationGuideSession.dataProcessing = structuredClone(brokenFit) as never;
const repairedCommit = await commitWorkbenchPersistenceV3ProductionSnapshot({
  store: new InMemoryWorkbenchPersistenceV3GenerationStore(), namespace: 'invalid-fit-repair', generationId: 'repair', capturedAtMs: 1,
  snapshot: { files: [practiceFiles[0]], closedFiles: [practiceFiles[1]], activeFileId: practiceFiles[0].id, selectedPanel: 'realtime' },
});
assert.equal(repairedCommit.retained.opaqueFiles.length, 2);
for (const [index, entry] of repairedCommit.retained.opaqueFiles.entries()) {
  const expected = structuredClone(practiceFiles[index]);
  const sessionKey = index === 0 ? 'pistonOscillationFreeSession' : 'pistonOscillationGuideSession';
  const plan = expected[sessionKey].dataProcessing!.linearFitResult!.precisionPlan!;
  plan.gammaErrorInUc = null;
  plan.combinedRelativeError = null;
  assert.deepEqual(entry.raw, expected, 'only the two unavailable diagnostics change');
}
assert.ok(Number.isNaN(practiceFiles[0].pistonOscillationFreeSession.dataProcessing!.linearFitResult!.precisionPlan!.gammaErrorInUc));
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

const malformedStore = new InMemoryWorkbenchPersistenceV3GenerationStore();
const malformed = createDefaultStandardFile(3);
malformed.name = '';
const malformedCommit = await commitWorkbenchPersistenceV3ProductionSnapshot({
  store: malformedStore,
  namespace: 'production-facade-malformed-diagnostic-test',
  generationId: 'generation-malformed',
  capturedAtMs: 300,
  snapshot: {
    files: [healthy],
    closedFiles: [malformed],
    activeFileId: healthy.id,
    selectedPanel: 'preview',
  },
});
const malformedDiagnostic = malformedCommit.retained.opaqueFiles[0]?.diagnostics[0];
assert.ok(malformedDiagnostic);
const malformedDiagnosticRecord = malformedDiagnostic as Record<string, unknown>;
assert.equal(malformedDiagnosticRecord.code, 'persistence-v3-runtime-file-header-invalid');
assert.equal(Object.hasOwn(malformedDiagnosticRecord, 'sourceVersion'), false);
assert.equal(Object.hasOwn(malformedDiagnosticRecord, 'supportedVersion'), false);
assert.equal(
  await malformedStore.readGeneration(
    'production-facade-malformed-diagnostic-test',
    'generation-malformed',
  ) !== null,
  true,
  'a quarantined file diagnostic with absent optional fields must still commit canonically',
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
