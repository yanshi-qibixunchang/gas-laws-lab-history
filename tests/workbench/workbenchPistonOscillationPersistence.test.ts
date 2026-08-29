import assert from 'node:assert/strict';
import {
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  type WorkbenchExperimentFileEnvelopeV1,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';
import {
  decodeWorkbenchClosedFilesStorageEnvelope,
  decodeWorkbenchStorageEnvelope,
  encodeWorkbenchClosedFilesStorageEnvelope,
  encodeWorkbenchStorageEnvelope,
} from '../../src/features/workbench/workbenchPersistenceMigration.ts';
import {
  createPistonOscillationPersistencePayload,
  normalizePistonOscillationRuntimeState,
  restorePistonOscillationFileFromPersistencePayload,
  validatePistonOscillationPersistencePayload,
} from '../../src/features/workbench/workbenchPistonOscillationPersistence.ts';
import {
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultStandardFile,
  startPistonOscillationFreeWorkbenchState,
  startPistonOscillationGuideWorkbenchState,
  transitionPistonOscillationFreeWorkbenchState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
} from '../../src/features/workbench/workbenchSession.ts';

(globalThis as typeof globalThis & { __APP_VERSION__: string }).__APP_VERSION__ = '5.1.2';

const baseFile = {
  ...createDefaultHeatCapacityPistonOscillationFile(1),
  id: 'heatCapacityPistonOscillation-00000000-0000-4000-8000-000000000001',
  createdAt: 10,
  updatedAt: 20,
  lastOpenedAt: 30,
};

let activeFreeFile = startPistonOscillationFreeWorkbenchState(baseFile, 1_000);
activeFreeFile = transitionPistonOscillationFreeWorkbenchState(activeFreeFile, {
  type: 'setPlan',
  targetHeightsMm: [80, 70, 60],
  nowMs: 1_010,
});
activeFreeFile = transitionPistonOscillationFreeWorkbenchState(activeFreeFile, {
  type: 'setPower',
  powerOn: true,
  nowMs: 1_020,
});
const retainedFreePlan = activeFreeFile.pistonOscillationFreeSession.experimentPlan;
const guideStartedOverFree = startPistonOscillationGuideWorkbenchState(activeFreeFile, 1_030);
assert.equal(guideStartedOverFree.pistonOscillationGuideSession.status, 'active');
assert.equal(guideStartedOverFree.pistonOscillationFreeSession.status, 'paused');
assert.equal(guideStartedOverFree.pistonOscillationFreeSession.powerOn, false);
assert.deepEqual(
  guideStartedOverFree.pistonOscillationFreeSession.experimentPlan,
  retainedFreePlan,
  'starting Guide must pause Free without discarding its experiment plan',
);
assert.equal(
  guideStartedOverFree.pistonOscillationFreeSession.audit.at(-1)?.type,
  'session-paused',
);

const activeGuideFile = startPistonOscillationGuideWorkbenchState(baseFile, 2_000);
const freeStartedOverGuide = startPistonOscillationFreeWorkbenchState(activeGuideFile, 2_010);
assert.equal(freeStartedOverGuide.pistonOscillationGuideSession.status, 'idle');
assert.equal(freeStartedOverGuide.pistonOscillationGuideSession.startedAtMs, null);
assert.equal(freeStartedOverGuide.pistonOscillationFreeSession.status, 'active');

const selectedCompletedGuideFile = {
  ...baseFile,
  pistonOscillationGuideSession: {
    ...baseFile.pistonOscillationGuideSession,
    status: 'completed' as const,
    step: 'completed' as const,
    completionExited: false,
    dataProcessing: {
      status: 'completed',
    } as NonNullable<
      typeof baseFile.pistonOscillationGuideSession.dataProcessing
    >,
  },
};
const freeStartedOverSelectedCompletion = startPistonOscillationFreeWorkbenchState(
  selectedCompletedGuideFile,
  2_020,
);
assert.equal(freeStartedOverSelectedCompletion.pistonOscillationGuideSession.status, 'completed');
assert.equal(freeStartedOverSelectedCompletion.pistonOscillationGuideSession.completionExited, true);
assert.equal(freeStartedOverSelectedCompletion.pistonOscillationFreeSession.status, 'active');

const exitedCompletedGuideFile = {
  ...selectedCompletedGuideFile,
  pistonOscillationGuideSession: {
    ...selectedCompletedGuideFile.pistonOscillationGuideSession,
    completionExited: true,
  },
};
const freeStartedAlongsideExitedCompletion = startPistonOscillationFreeWorkbenchState(
  exitedCompletedGuideFile,
  2_030,
);
assert.strictEqual(
  freeStartedAlongsideExitedCompletion.pistonOscillationGuideSession,
  exitedCompletedGuideFile.pistonOscillationGuideSession,
  'an already-exited completed Guide session must remain intact when Free starts',
);

const independentlyActiveGuide = startPistonOscillationGuideWorkbenchState(baseFile, 3_000)
  .pistonOscillationGuideSession;
const independentlyActiveFree = startPistonOscillationFreeWorkbenchState(baseFile, 3_010)
  .pistonOscillationFreeSession;
const normalizedModeConflict = normalizePistonOscillationRuntimeState({
  ...baseFile,
  pistonOscillationGuideSession: independentlyActiveGuide,
  pistonOscillationFreeSession: independentlyActiveFree,
});
assert.ok(normalizedModeConflict);
assert.equal(normalizedModeConflict.pistonOscillationGuideSession.status, 'active');
assert.equal(normalizedModeConflict.pistonOscillationFreeSession.status, 'paused');
assert.equal(normalizedModeConflict.pistonOscillationFreeSession.startedAtMs, 3_010);
assert.equal(normalizedModeConflict.pistonOscillationFreeSession.powerOn, false);
assert.equal(
  normalizedModeConflict.pistonOscillationFreeSession.audit.at(-1)?.type,
  'session-paused',
  'normalization must repair persisted Guide/Free double-active state',
);

for (const cameraPreset of WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS) {
  const file = { ...baseFile, previewCameraPreset: cameraPreset };
  const payload = createPistonOscillationPersistencePayload(file, 40);
  assert.equal(validatePistonOscillationPersistencePayload(payload).valid, true);
  assert.deepEqual(payload, {
    experimentKind: 'heatCapacityPistonOscillation',
    pistonOscillationSchemaVersion: 1,
    preview: { cameraPreset },
    operationVisualizationEnabled: false,
    lessonIntroAutoShown: false,
    demoSession: file.pistonOscillationDemoSession,
    guideSession: file.pistonOscillationGuideSession,
    freeSession: file.pistonOscillationFreeSession,
    materialsExpanded: true,
  });
  assert.equal('modelVersion' in payload, false);
  assert.equal('glbPath' in payload, false);
  assert.equal('runtime' in payload, false);
}

const validPayload = createPistonOscillationPersistencePayload(baseFile, 40);
const preFreePayload = { ...validPayload } as Partial<typeof validPayload>;
delete preFreePayload.freeSession;
assert.equal(validatePistonOscillationPersistencePayload(preFreePayload).valid, true);
const preLessonPayload = {
  experimentKind: 'heatCapacityPistonOscillation',
  pistonOscillationSchemaVersion: 1,
  preview: { cameraPreset: 'overview' },
};
assert.equal(validatePistonOscillationPersistencePayload(preLessonPayload).valid, true);
[
  { ...validPayload, experimentKind: 'heatCapacity' },
  { ...validPayload, pistonOscillationSchemaVersion: 2 },
  { ...validPayload, preview: {} },
  { ...validPayload, preview: { cameraPreset: 'rear' } },
  { ...validPayload, lessonIntroAutoShown: 'yes' },
  { ...validPayload, operationVisualizationEnabled: 'yes' },
  { ...validPayload, demoSession: 'invalid' },
  { ...validPayload, guideSession: 'invalid' },
  { ...validPayload, freeSession: 'invalid' },
  { ...validPayload, materialsExpanded: 'yes' },
  { ...validPayload, unknown: true },
  { ...validPayload, preview: { cameraPreset: 'overview', unknown: true } },
].forEach((payload) => {
  assert.equal(validatePistonOscillationPersistencePayload(payload).valid, false);
});

const fileEnvelope: WorkbenchExperimentFileEnvelopeV1 = {
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: baseFile.id,
  kind: 'heatCapacityPistonOscillation',
  name: baseFile.name,
  createdAt: baseFile.createdAt,
  updatedAt: baseFile.updatedAt,
  lastOpenedAt: baseFile.lastOpenedAt,
  layout: {
    visiblePanels: ['preview', 'realtime'],
    liveWorkspaceSplitRatio: 0.63,
  },
  payload: validPayload as unknown as Record<string, unknown>,
};
const restored = restorePistonOscillationFileFromPersistencePayload(
  fileEnvelope,
  validPayload,
);
assert.equal(restored.id, baseFile.id);
assert.equal(restored.name, baseFile.name);
assert.equal(restored.createdAt, 10);
assert.equal(restored.updatedAt, 20);
assert.equal(restored.lastOpenedAt, 30);
assert.equal(restored.liveWorkspaceSplitRatio, 0.63);
assert.equal(restored.previewCameraPreset, 'overview');
assert.equal(restored.pistonOscillationOperationVisualizationEnabled, false);
assert.equal(restored.pistonOscillationLessonIntroAutoShown, false);
assert.deepEqual(
  restored.pistonOscillationDemoSession,
  baseFile.pistonOscillationDemoSession,
);
assert.deepEqual(
  restored.pistonOscillationGuideSession,
  baseFile.pistonOscillationGuideSession,
);
const restoredLegacyBaseline = restorePistonOscillationFileFromPersistencePayload(
  fileEnvelope,
  {
    ...validPayload,
    guideSession: {
      ...activeGuideFile.pistonOscillationGuideSession,
      step: 'baselineStabilizing',
    },
  } as unknown as typeof validPayload,
);
assert.equal(
  restoredLegacyBaseline.pistonOscillationGuideSession.step,
  'acquisitionReady',
  'a persisted legacy baseline checkpoint must resume at the visible Start step',
);
const restoredLegacyCrossRun = restorePistonOscillationFileFromPersistencePayload(
  fileEnvelope,
  {
    ...validPayload,
    guideSession: {
      ...activeGuideFile.pistonOscillationGuideSession,
      measurementIndex: 1,
      step: 'crossRunStabilizing',
    },
  } as unknown as typeof validPayload,
);
assert.equal(
  restoredLegacyCrossRun.pistonOscillationGuideSession.step,
  'crossRunDisconnect',
  'a persisted legacy between-run checkpoint must resume at the next visible operation',
);
assert.deepEqual(
  restored.pistonOscillationFreeSession,
  baseFile.pistonOscillationFreeSession,
);
assert.deepEqual(
  restorePistonOscillationFileFromPersistencePayload(
    fileEnvelope,
    preFreePayload,
  ).pistonOscillationFreeSession,
  baseFile.pistonOscillationFreeSession,
  'pre-Free files must restore with an empty Free Mode session',
);
assert.equal(restored.pistonOscillationMaterialsExpanded, true);
assert.equal(restored.runState, 'idle');
assert.equal(
  restorePistonOscillationFileFromPersistencePayload(
    fileEnvelope,
    preLessonPayload,
  ).pistonOscillationLessonIntroAutoShown,
  false,
);

const enabledOperationVisualizationPayload = {
  ...validPayload,
  operationVisualizationEnabled: true,
};
assert.equal(
  restorePistonOscillationFileFromPersistencePayload(
    fileEnvelope,
    enabledOperationVisualizationPayload,
  ).pistonOscillationOperationVisualizationEnabled,
  true,
);

const normalizedRuntime = normalizePistonOscillationRuntimeState({
  ...baseFile,
  runState: 'running',
  stats: { ...baseFile.stats, time: 99 },
  visiblePanels: ['preview', 'heatCapacityReview'],
});
assert.ok(normalizedRuntime);
assert.equal(normalizedRuntime.runState, 'idle');
assert.equal(normalizedRuntime.stats.time, 0);
assert.deepEqual(normalizedRuntime.visiblePanels, ['preview', 'realtime']);

const encoded = encodeWorkbenchStorageEnvelope(
  [{ ...baseFile, previewCameraPreset: 'side' }],
  baseFile.id,
  'heatCapacityReview',
  50,
);
const decoded = decodeWorkbenchStorageEnvelope(encoded);
assert.equal(decoded.handled, true);
assert.equal(decoded.diagnostics.length, 0);
assert.equal(decoded.session.files.length, 1);
assert.equal(decoded.session.files[0]?.kind, 'heatCapacityPistonOscillation');
if (decoded.session.files[0]?.kind !== 'heatCapacityPistonOscillation') {
  throw new Error('expected restored piston-oscillation file');
}
assert.equal(decoded.session.files[0].previewCameraPreset, 'side');
assert.equal(decoded.session.selectedPanel, 'preview');

const standard = {
  ...createDefaultStandardFile(1),
  id: 'standard-00000000-0000-4000-8000-000000000002',
};
const mixedEnvelope = encodeWorkbenchStorageEnvelope(
  [standard, baseFile],
  standard.id,
  'preview',
  60,
);
mixedEnvelope.files[1]!.payload = {
  ...mixedEnvelope.files[1]!.payload,
  preview: { cameraPreset: 'invalid' },
};
const mixedDecoded = decodeWorkbenchStorageEnvelope(mixedEnvelope);
assert.deepEqual(mixedDecoded.session.files.map((file) => file.kind), ['standard']);
assert.equal(mixedDecoded.diagnostics.length, 1);
assert.equal(mixedDecoded.diagnostics[0]?.code, 'invalid-file');
assert.equal(mixedDecoded.diagnostics[0]?.fileId, baseFile.id);

const closedEnvelope = encodeWorkbenchClosedFilesStorageEnvelope([baseFile], 70);
const decodedClosed = decodeWorkbenchClosedFilesStorageEnvelope(closedEnvelope);
assert.equal(decodedClosed.handled, true);
assert.equal(decodedClosed.files[0]?.kind, 'heatCapacityPistonOscillation');

const rawDecoded = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  files: [{ ...baseFile, runState: 'running', previewCameraPreset: 'top' }],
  activeFileId: baseFile.id,
  selectedPanel: 'results',
});
assert.equal(rawDecoded.files[0]?.kind, 'heatCapacityPistonOscillation');
assert.equal(rawDecoded.files[0]?.runState, 'idle');
assert.equal(rawDecoded.selectedPanel, 'preview');

console.log('workbenchPistonOscillationPersistence tests passed');
