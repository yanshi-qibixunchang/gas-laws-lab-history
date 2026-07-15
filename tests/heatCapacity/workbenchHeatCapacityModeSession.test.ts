import assert from 'node:assert/strict';
import {
  clearHeatCapacityModeSession,
  createDefaultHeatCapacityModeSessionStore,
  normalizeHeatCapacityModeSessionStore,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  createHeatCapacityModeDeferredTimer,
  createHeatCapacityModeUiCheckpoint,
  type HeatCapacityModeUiCheckpoint,
} from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  createDefaultHeatCapacityFile,
  startHeatCapacityGuideWorkbenchState,
} from '../../src/features/workbench/workbenchState.ts';
import { createDefaultFreeConfigSnapshot } from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import { createHeatCapacityFreeTrial } from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { createHeatCapacityGuideTrial } from '../../src/domain/heatCapacity/heatCapacityGuideTrialModel.ts';

const createGuideUiCheckpoint = (
  fileId: string,
  capturedAtMs: number,
  pendingRemainingMs: number | null,
  baseRemainingMs: number | null,
): HeatCapacityModeUiCheckpoint => createHeatCapacityModeUiCheckpoint({
  fileId,
  checkpointId: `${fileId}:${capturedAtMs}`,
  capturedAtMs,
  mode: 'guide',
  scene: {
    cameraPose: null,
    cameraTransition: null,
    ultraVisualState: null,
    hardSphereVisualCheckpoint: null,
    focusSession: null,
  },
  pumpAnimation: null,
  payload: {
    kind: 'guide',
    guide: {
      missCount: 0,
      normalReminder: null,
      strongReminder: { active: false, controlId: null },
      lessonDialog: null,
      shownLessonIds: [],
      checklistViewedIndex: 0,
      pendingStrongReminder: pendingRemainingMs === null
        ? null
        : {
            controlId: 'recordU1',
            timer: createHeatCapacityModeDeferredTimer(pendingRemainingMs)!,
          },
      baseStrongReminder: baseRemainingMs === null
        ? null
        : {
            controlId: 'recordU1',
            timer: createHeatCapacityModeDeferredTimer(baseRemainingMs)!,
          },
    },
  },
});

const cloneUnknown = <Value>(value: Value): Value => structuredClone(value);

const getEntryRecord = (
  store: unknown,
  mode: 'demo' | 'guide' | 'free',
) => (store as Record<string, unknown>)[mode] as Record<string, unknown>;

const freeSource = {
  ...createDefaultHeatCapacityFile(1),
  runState: 'running' as const,
  simulationTimeS: 137.5,
  lastUpdateMs: 900,
  displayResponseLastUpdateMs: 900,
  pumpStrokeCount: 9,
};
const withSuspendedFree = suspendHeatCapacityModeSession(freeSource, null, 1_000);
assert.equal(withSuspendedFree.heatCapacityModeSessions.free.status, 'suspended');
assert.equal(withSuspendedFree.heatCapacityModeSessions.free.resumeRunState, 'running');
assert.equal(
  withSuspendedFree.heatCapacityModeSessions.free.snapshot?.mode === 'free'
    ? withSuspendedFree.heatCapacityModeSessions.free.snapshot.free.heatCapacityFreePhysicsState
    : null,
  freeSource.heatCapacityFreePhysicsState,
  'in-memory mode checkpoints should structurally share immutable physics state instead of deep-cloning it on the UI thread',
);

const guideSource = {
  ...startHeatCapacityGuideWorkbenchState(withSuspendedFree, 1_100),
  runState: 'running' as const,
  simulationTimeS: 72.25,
  lastUpdateMs: 1_100,
  displayResponseLastUpdateMs: 1_100,
  heatCapacityGuidePhysicsState: {
    ...startHeatCapacityGuideWorkbenchState(withSuspendedFree, 1_100).heatCapacityGuidePhysicsState,
    simulationTimeS: 72.25,
  },
  heatCapacityGuideWorkflow: {
    ...startHeatCapacityGuideWorkbenchState(withSuspendedFree, 1_100).heatCapacityGuideWorkflow,
    step: 'u1Waiting' as const,
    waitStartedAtS: 28.5,
    waitStage: 'u1' as const,
  },
};
const guideUiCheckpoint = createGuideUiCheckpoint(guideSource.id, 1_200, 0, 1_280);
const withSuspendedGuide = suspendHeatCapacityModeSession(guideSource, guideUiCheckpoint, 1_200);
const suspendedGuideUi = withSuspendedGuide.heatCapacityModeSessions.guide.uiCheckpoint;
assert.equal(suspendedGuideUi?.mode, 'guide');
assert.equal(suspendedGuideUi?.payload.kind, 'guide');
if (suspendedGuideUi?.payload.kind !== 'guide') {
  throw new Error('Expected a Guide UI checkpoint.');
}
assert.deepEqual(
  suspendedGuideUi.payload.guide.pendingStrongReminder,
  { controlId: 'recordU1', timer: { state: 'due' } },
  'a due reminder must remain distinct from an absent timer',
);

assert.throws(
  () => suspendHeatCapacityModeSession(
    guideSource,
    { ...guideUiCheckpoint, fileId: `${guideSource.id}-other` },
    1_200,
  ),
  /checkpoint mismatch/,
  'a checkpoint from another file must fail before it can contaminate an in-memory mode session',
);
assert.throws(
  () => suspendHeatCapacityModeSession(
    guideSource,
    { ...guideUiCheckpoint, mode: 'free', payload: { kind: 'free' } },
    1_200,
  ),
  /checkpoint mismatch/,
  'a checkpoint from another mode must fail before it can contaminate an in-memory mode session',
);
assert.deepEqual(
  suspendedGuideUi.payload.guide.baseStrongReminder,
  { controlId: 'recordU1', timer: { state: 'waiting', remainingMs: 1_280 } },
  'a waiting reminder must preserve its remaining duration',
);
const checkpointRecord = suspendedGuideUi as unknown as Record<string, unknown>;
for (const forbiddenKey of [
  'modeTransition',
  'modeTransitionDemoClock',
  'ui',
  'windows',
  'drafts',
  'sceneSnapshot',
]) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(checkpointRecord, forbiddenKey),
    false,
    `${forbiddenKey} belongs to the refresh boundary and must not exist in a mode checkpoint`,
  );
}

const normalizedGuideStore = normalizeHeatCapacityModeSessionStore(
  cloneUnknown(withSuspendedGuide.heatCapacityModeSessions),
  guideSource.id,
);
assert.deepEqual(
  normalizedGuideStore.guide.uiCheckpoint?.mode === 'guide'
    ? normalizedGuideStore.guide.uiCheckpoint.payload.guide.pendingStrongReminder
    : null,
  { controlId: 'recordU1', timer: { state: 'due' } },
  'due timers must survive the persistence decoder',
);
assert.deepEqual(
  normalizedGuideStore.guide.uiCheckpoint?.mode === 'guide'
    ? normalizedGuideStore.guide.uiCheckpoint.payload.guide.baseStrongReminder
    : null,
  { controlId: 'recordU1', timer: { state: 'waiting', remainingMs: 1_280 } },
  'waiting timers must survive the persistence decoder',
);

const swappedGuideTimers = suspendHeatCapacityModeSession(
  guideSource,
  createGuideUiCheckpoint(guideSource.id, 1_201, 640, 0),
  1_201,
);
const normalizedSwappedGuideTimers = normalizeHeatCapacityModeSessionStore(
  cloneUnknown(swappedGuideTimers.heatCapacityModeSessions),
  guideSource.id,
);
const swappedCheckpoint = normalizedSwappedGuideTimers.guide.uiCheckpoint;
assert.equal(swappedCheckpoint?.mode, 'guide');
if (swappedCheckpoint?.mode !== 'guide') throw new Error('Expected a persisted Guide UI checkpoint.');
assert.deepEqual(
  swappedCheckpoint.payload.guide.pendingStrongReminder,
  { controlId: 'recordU1', timer: { state: 'waiting', remainingMs: 640 } },
);
assert.deepEqual(
  swappedCheckpoint.payload.guide.baseStrongReminder,
  { controlId: 'recordU1', timer: { state: 'due' } },
);

const restoredFree = restoreHeatCapacityModeSession(withSuspendedGuide, 'free', 5_000);
assert.notEqual(restoredFree, null);
assert.equal(restoredFree?.heatCapacityMode, 'free');
assert.equal(restoredFree?.simulationTimeS, 137.5);
assert.equal(restoredFree?.pumpStrokeCount, 9);
assert.equal(restoredFree?.runState, 'running');
assert.equal(restoredFree?.lastUpdateMs, 5_000);
assert.equal(
  restoredFree?.heatCapacityFreePhysicsState,
  freeSource.heatCapacityFreePhysicsState,
  'restoring a mode should reuse its immutable physics snapshot and avoid a second main-thread deep clone',
);
assert.equal(
  restoredFree?.simulationTimeS,
  freeSource.simulationTimeS,
  'an inactive Free session must not consume simulation time while another mode is selected',
);

const restoredGuide = restoreHeatCapacityModeSession(withSuspendedGuide, 'guide', 8_000);
assert.notEqual(restoredGuide, null);
assert.equal(restoredGuide?.heatCapacityMode, 'guide');
assert.equal(restoredGuide?.simulationTimeS, 72.25);
assert.equal(restoredGuide?.heatCapacityGuidePhysicsState.simulationTimeS, 72.25);
assert.equal(restoredGuide?.heatCapacityGuideWorkflow.step, 'u1Waiting');
assert.equal(restoredGuide?.heatCapacityGuideWorkflow.waitStartedAtS, 28.5);
assert.equal(restoredGuide?.lastUpdateMs, 8_000);
assert.equal(
  (restoredGuide?.heatCapacityGuidePhysicsState.simulationTimeS ?? 0) -
    (restoredGuide?.heatCapacityGuideWorkflow.waitStartedAtS ?? 0),
  43.75,
  'the five-minute wait must resume from its exact elapsed simulation time',
);

const demoSource = {
  ...restoredGuide!,
  heatCapacityMode: 'demo' as const,
  runState: 'running' as const,
  heatCapacityTeachingStatus: 'running' as const,
  simulationTimeS: 19.5,
  lastUpdateMs: 7_500,
  displayResponseLastUpdateMs: 7_500,
};
const withSuspendedDemo = suspendHeatCapacityModeSession(demoSource, null, 8_100);
const restoredDemo = restoreHeatCapacityModeSession(withSuspendedDemo, 'demo', 12_000);
assert.equal(restoredDemo?.runState, 'paused');
assert.equal(restoredDemo?.simulationTimeS, 19.5);
assert.equal(restoredDemo?.lastUpdateMs, 7_500);
assert.equal(
  restoredDemo?.simulationTimeS,
  demoSource.simulationTimeS,
  'returning to Demo must expose a paused checkpoint rather than advancing in the background',
);

const clearedGuide = clearHeatCapacityModeSession(withSuspendedDemo, 'guide');
assert.equal(clearedGuide.heatCapacityModeSessions.guide.status, 'empty');
assert.equal(clearedGuide.heatCapacityModeSessions.guide.snapshot, null);
assert.equal(clearedGuide.heatCapacityModeSessions.free.status, 'suspended');

const persistedSessionStore = cloneUnknown(withSuspendedGuide.heatCapacityModeSessions);
const unsupportedSchemaStore = cloneUnknown(persistedSessionStore) as unknown as Record<string, unknown>;
unsupportedSchemaStore.schemaVersion = 1;
assert.deepEqual(
  normalizeHeatCapacityModeSessionStore(unsupportedSchemaStore, guideSource.id),
  createDefaultHeatCapacityModeSessionStore(),
  'the previous schema must be rejected atomically rather than partially migrated',
);

const missingCommonKeyStore = cloneUnknown(persistedSessionStore);
const missingCommonGuideEntry = getEntryRecord(missingCommonKeyStore, 'guide');
delete ((missingCommonGuideEntry.snapshot as Record<string, unknown>).common as Record<string, unknown>)
  .gasTemperatureK;
const normalizedMissingCommonKeyStore = normalizeHeatCapacityModeSessionStore(
  missingCommonKeyStore,
  guideSource.id,
);
assert.equal(normalizedMissingCommonKeyStore.guide.status, 'empty');
assert.equal(
  normalizedMissingCommonKeyStore.free.status,
  'suspended',
  'a malformed entry must be cleared without corrupting a valid sibling mode',
);

for (const commonMutation of [
  {
    label: 'empty recorded pressures',
    apply: (common: Record<string, unknown>) => { common.recordedPressures = {}; },
  },
  {
    label: 'malformed process sample',
    apply: (common: Record<string, unknown>) => {
      common.heatCapacityProcessSamples = { startSample: {} };
    },
  },
  {
    label: 'empty release state',
    apply: (common: Record<string, unknown>) => { common.heatCapacityReleaseState = {}; },
  },
  {
    label: 'invalid pump valve state',
    apply: (common: Record<string, unknown>) => { common.pumpValveState = 'half-open'; },
  },
  {
    label: 'non-finite display timestamp',
    apply: (common: Record<string, unknown>) => { common.displayResponseLastUpdateMs = Number.NaN; },
  },
  {
    label: 'invalid nullable signal',
    apply: (common: Record<string, unknown>) => { common.temperatureSignalMv = '1498.7'; },
  },
]) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const guideSnapshot = getEntryRecord(malformedStore, 'guide').snapshot as Record<string, unknown>;
  commonMutation.apply(guideSnapshot.common as Record<string, unknown>);
  const normalized = normalizeHeatCapacityModeSessionStore(malformedStore, guideSource.id);
  assert.equal(
    normalized.guide.status,
    'empty',
    `${commonMutation.label} must invalidate the containing mode snapshot`,
  );
  assert.equal(
    normalized.free.status,
    'suspended',
    `${commonMutation.label} must not invalidate a valid sibling mode`,
  );
}

for (const nestedKey of [
  'heatCapacityGuidePhysicsConfig',
  'heatCapacityGuidePhysicsState',
  'heatCapacityGuideTemperatureSensorState',
  'heatCapacityGuideWorkflow',
] as const) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const guideSnapshot = getEntryRecord(malformedStore, 'guide').snapshot as Record<string, unknown>;
  (guideSnapshot.guide as Record<string, unknown>)[nestedKey] = {};
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, guideSource.id).guide.status,
    'empty',
    `an empty ${nestedKey} object must not be accepted as a Guide runtime`,
  );
}

for (const nestedKey of [
  'heatCapacityFreeParameterDraft',
  'heatCapacityFreeRecordConfig',
  'heatCapacityFreeEnvironmentConfig',
  'heatCapacityFreePhysicsConfig',
  'heatCapacityFreePhysicsState',
  'heatCapacityFreeSensorConfig',
  'heatCapacityFreeSensorState',
  'heatCapacityFreeCalibrationState',
  'heatCapacityFreeRollbackSnapshots',
  'heatCapacityFreeTraceStore',
] as const) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const freeSnapshot = getEntryRecord(malformedStore, 'free').snapshot as Record<string, unknown>;
  (freeSnapshot.free as Record<string, unknown>)[nestedKey] = {};
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, freeSource.id).free.status,
    'empty',
    `an empty ${nestedKey} object must not be accepted as a Free runtime`,
  );
}

const nonPositivePhysicsStore = cloneUnknown(persistedSessionStore);
const nonPositiveGuideSnapshot = getEntryRecord(nonPositivePhysicsStore, 'guide')
  .snapshot as Record<string, unknown>;
const nonPositiveGuideState = (
  (nonPositiveGuideSnapshot.guide as Record<string, unknown>).heatCapacityGuidePhysicsState
) as Record<string, unknown>;
nonPositiveGuideState.amountMol = 0;
assert.equal(
  normalizeHeatCapacityModeSessionStore(nonPositivePhysicsStore, guideSource.id).guide.status,
  'empty',
  'a non-positive thermodynamic amount must be rejected before it reaches the physics kernel',
);

const malformedTeachingProfileStore = cloneUnknown(persistedSessionStore);
const malformedTeachingProfileSnapshot = getEntryRecord(malformedTeachingProfileStore, 'guide')
  .snapshot as Record<string, unknown>;
(malformedTeachingProfileSnapshot.common as Record<string, unknown>).heatCapacityExperimentProfile = {};
assert.equal(
  normalizeHeatCapacityModeSessionStore(malformedTeachingProfileStore, guideSource.id).guide.status,
  'empty',
  'an arbitrary teaching-profile record must not cross the mode-session boundary',
);

for (const malformedFreeRuntime of [
  {
    label: 'active attempt',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeActiveAttempt = { arbitrary: true };
    },
  },
  {
    label: 'trial',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeTrials = [{ arbitrary: true }];
    },
  },
  {
    label: 'active config snapshot',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeActiveRunConfigSnapshot = { arbitrary: true };
    },
  },
  {
    label: 'trace trial',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeTraceStore = {
        activeTraceTrialId: null,
        nextTraceTrialIndex: 1,
        traceTrials: [{ arbitrary: true }],
      };
    },
  },
  {
    label: 'rollback snapshot',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeRollbackSnapshots = {
        afterPowerOn: { arbitrary: true },
        beforePump: null,
        beforeRelease: null,
      };
    },
  },
]) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const snapshot = getEntryRecord(malformedStore, 'free').snapshot as Record<string, unknown>;
  malformedFreeRuntime.apply(snapshot.free as Record<string, unknown>);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, freeSource.id).free.status,
    'empty',
    `an arbitrary non-empty ${malformedFreeRuntime.label} record must be rejected`,
  );
}

for (const malformedBranchPayload of [
  { label: 'trace sample', samples: [{ arbitrary: true }], events: [] },
  { label: 'trace event', samples: [], events: [{ arbitrary: true }] },
]) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const snapshot = getEntryRecord(malformedStore, 'free').snapshot as Record<string, unknown>;
  (snapshot.free as Record<string, unknown>).heatCapacityFreeTraceStore = {
    activeTraceTrialId: 'trace-1',
    nextTraceTrialIndex: 2,
    traceTrials: [{
      id: 'trace-1',
      linkedTrialId: null,
      status: 'active',
      activeBranchId: 'branch-1',
      nextBranchIndex: 2,
      branches: [{
        id: 'branch-1',
        parentBranchId: null,
        createdByEventId: null,
        status: 'main',
        hiddenInDefaultChart: false,
        nextSampleIndex: 1,
        nextEventIndex: 1,
        nextSampleAtS: null,
        lastKeptSampleId: null,
        idleState: {
          lastUserActionAtS: null,
          dormantSinceS: null,
          lastHeartbeatAtS: null,
        },
        samples: malformedBranchPayload.samples,
        events: malformedBranchPayload.events,
      }],
      configSnapshot: createDefaultFreeConfigSnapshot(),
    }],
  };
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, freeSource.id).free.status,
    'empty',
    `an arbitrary ${malformedBranchPayload.label} record must not cross the mode-session boundary`,
  );
}

const malformedStandardReferenceStore = cloneUnknown(persistedSessionStore);
const malformedStandardReferenceSnapshot = getEntryRecord(malformedStandardReferenceStore, 'free')
  .snapshot as Record<string, unknown>;
(malformedStandardReferenceSnapshot.free as Record<string, unknown>).heatCapacityFreeTrials = [{
  ...createHeatCapacityFreeTrial('trial-with-malformed-reference'),
  standardReferenceSnapshot: {
    generatorVersion: 'free-standard-reference-v3',
    configSnapshot: {},
    trace: [],
    stages: [],
    recordWindows: [],
    summary: {},
    operationUpperBound: {},
  },
}];
let normalizedMalformedStandardReference: ReturnType<typeof normalizeHeatCapacityModeSessionStore> | null = null;
assert.doesNotThrow(() => {
  normalizedMalformedStandardReference = normalizeHeatCapacityModeSessionStore(
    malformedStandardReferenceStore,
    freeSource.id,
  );
}, 'a malformed standard-reference snapshot must be rejected without throwing during normalization');
assert.equal(
  normalizedMalformedStandardReference?.free.status,
  'empty',
  'a malformed standard-reference snapshot must invalidate the containing mode entry',
);

const malformedGuideTrialStore = cloneUnknown(persistedSessionStore);
const malformedGuideTrialSnapshot = getEntryRecord(malformedGuideTrialStore, 'guide')
  .snapshot as Record<string, unknown>;
(malformedGuideTrialSnapshot.guide as Record<string, unknown>).heatCapacityGuideTrial = {
  arbitrary: true,
};
assert.equal(
  normalizeHeatCapacityModeSessionStore(malformedGuideTrialStore, guideSource.id).guide.status,
  'empty',
  'an arbitrary non-empty Guide trial record must be rejected',
);

for (const opaquePayload of (() => {
  const cyclicPayload: Record<string, unknown> = {};
  cyclicPayload.self = cyclicPayload;
  const deepPayload: Record<string, unknown> = {};
  let cursor = deepPayload;
  for (let depth = 0; depth < 20; depth += 1) {
    const next: Record<string, unknown> = {};
    cursor.next = next;
    cursor = next;
  }
  return [
    { label: 'cyclic', value: cyclicPayload },
    { label: 'over-depth', value: deepPayload },
  ];
})()) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const snapshot = getEntryRecord(malformedStore, 'guide').snapshot as Record<string, unknown>;
  (snapshot.guide as Record<string, unknown>).heatCapacityGuideTrial = {
    ...createHeatCapacityGuideTrial(`guide-${opaquePayload.label}`),
    eventLog: [{
      atS: 0,
      type: 'workflow',
      message: opaquePayload.label,
      data: opaquePayload.value,
    }],
  };
  let normalized: ReturnType<typeof normalizeHeatCapacityModeSessionStore> | null = null;
  assert.doesNotThrow(() => {
    normalized = normalizeHeatCapacityModeSessionStore(malformedStore, guideSource.id);
  }, `${opaquePayload.label} opaque event data must never make the public normalizer throw`);
  assert.equal(
    normalized?.guide.status,
    'empty',
    `${opaquePayload.label} opaque event data must invalidate the containing entry`,
  );
}

const malformedFreeDomainStore = cloneUnknown(persistedSessionStore);
const malformedFreeDomainSnapshot = getEntryRecord(malformedFreeDomainStore, 'free')
  .snapshot as Record<string, unknown>;
const malformedFreeDomain = (
  (malformedFreeDomainSnapshot.free as Record<string, unknown>).heatCapacityFreeRealDomain
) as Record<string, unknown>;
malformedFreeDomain.physicsState = {};
assert.equal(
  normalizeHeatCapacityModeSessionStore(malformedFreeDomainStore, freeSource.id).free.status,
  'empty',
  'an empty physics state nested inside a Free domain must invalidate the runtime',
);

const unknownNestedFieldsStore = cloneUnknown(persistedSessionStore);
const unknownNestedFreeSnapshot = getEntryRecord(unknownNestedFieldsStore, 'free')
  .snapshot as Record<string, unknown>;
const unknownNestedFreeRuntime = unknownNestedFreeSnapshot.free as Record<string, unknown>;
(unknownNestedFreeRuntime.heatCapacityFreePhysicsState as Record<string, unknown>).legacyField = 42;
const unknownNestedCommon = unknownNestedFreeSnapshot.common as Record<string, unknown>;
(unknownNestedCommon.recordedPressures as Record<string, unknown>).legacyPressure = 99;
unknownNestedCommon.heatCapacityProcessSamples = {
  ...unknownNestedCommon.heatCapacityProcessSamples as Record<string, unknown>,
  legacySample: { timeS: 1 },
};
const normalizedUnknownNestedFields = normalizeHeatCapacityModeSessionStore(
  unknownNestedFieldsStore,
  freeSource.id,
);
assert.equal(normalizedUnknownNestedFields.free.status, 'suspended');
if (normalizedUnknownNestedFields.free.snapshot?.mode !== 'free') {
  throw new Error('Expected the canonical Free snapshot to survive unknown-field stripping.');
}
assert.equal(
  Object.prototype.hasOwnProperty.call(
    normalizedUnknownNestedFields.free.snapshot.free.heatCapacityFreePhysicsState,
    'legacyField',
  ),
  false,
  'canonical nested physics reconstruction must not retain legacy fields',
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    normalizedUnknownNestedFields.free.snapshot.common.recordedPressures,
    'legacyPressure',
  ),
  false,
  'canonical pressure reconstruction must not retain legacy fields',
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    normalizedUnknownNestedFields.free.snapshot.common.heatCapacityProcessSamples,
    'legacySample',
  ),
  false,
  'canonical process-sample reconstruction must not retain unknown sample keys',
);

const mismatchedFileStore = cloneUnknown(persistedSessionStore);
(getEntryRecord(mismatchedFileStore, 'guide').snapshot as Record<string, unknown>).fileId = 'other-file';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedFileStore, guideSource.id).guide.status,
  'empty',
  'a runtime snapshot from another file must be discarded',
);

const mismatchedModeStore = cloneUnknown(persistedSessionStore);
(getEntryRecord(mismatchedModeStore, 'guide').snapshot as Record<string, unknown>).mode = 'free';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedModeStore, guideSource.id).guide.status,
  'empty',
  'a runtime snapshot stored under another mode must be discarded',
);

const mismatchedCheckpointFileStore = cloneUnknown(persistedSessionStore);
(getEntryRecord(mismatchedCheckpointFileStore, 'guide').uiCheckpoint as Record<string, unknown>).fileId = 'other-file';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedCheckpointFileStore, guideSource.id).guide.status,
  'empty',
  'a UI checkpoint from another file must invalidate the whole mode entry',
);

const malformedCheckpointStore = cloneUnknown(persistedSessionStore);
delete (getEntryRecord(malformedCheckpointStore, 'guide').uiCheckpoint as Record<string, unknown>).scene;
assert.equal(
  normalizeHeatCapacityModeSessionStore(malformedCheckpointStore, guideSource.id).guide.status,
  'empty',
  'a malformed dedicated UI checkpoint must not be partially restored',
);

console.log('workbenchHeatCapacityModeSession tests passed');
