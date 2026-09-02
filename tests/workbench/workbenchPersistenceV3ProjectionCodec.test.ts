import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  commitPistonOscillationGuideParameterWorkbenchState,
  editPistonOscillationGuideParameterWorkbenchState,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  startPistonOscillationFreeWorkbenchState,
  startPistonOscillationGuideWorkbenchState,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  type WorkbenchFileState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION,
  createWorkbenchPersistenceV3SemanticProjection,
  projectWorkbenchPersistenceV3File,
  reprojectWorkbenchPersistenceV3File,
} from '../../src/features/workbench/persistenceV3/projection.ts';
import {
  decodeWorkbenchPersistenceV3FileRecord,
  encodeWorkbenchPersistenceV3FileProjection,
} from '../../src/features/workbench/persistenceV3/codecRegistry.ts';
import {
  decodeCompatibleWorkbenchV3FileRecord,
} from '../../src/features/workbench/persistenceV3/compat/legacyV3ProjectionAdapter.ts';
import {
  WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER,
} from '../../src/features/workbench/persistenceV3/fingerprint.ts';
import {
  HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  calculateFreeHeatCapacityTrialSignals,
  HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createCompleteProcessReviewFixtureParts,
} from '../heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts';
import {
  createHeatCapacityFreeStandardReference,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  createHeatCapacityAutoDemoProfile,
} from '../../src/domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  advancePistonOscillationPeriodRun,
  createPistonOscillationRawMeasurementRecord,
  createPistonOscillationDataProcessingSession,
  findPistonOscillationExtrema,
  formatPistonOscillationEndpointTime,
  formatPistonOscillationPeriod,
  selectPistonOscillationPeriodRange,
  submitPistonOscillationLinearFit,
  submitPistonOscillationPeriod,
  submitPistonOscillationPeriodEndpoints,
  togglePistonOscillationFitRun,
  updatePistonOscillationPeriodAnswerDraft,
  type PistonOscillationDataProcessingSession,
  type PistonOscillationRawSample,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from '../pistonOscillation/helpers/pistonOscillationCurrentRecordTestFactory.ts';

const files: WorkbenchFileState[] = [
  createDefaultStandardFile(1),
  createDefaultIdealFile(2),
  createDefaultHeatCapacityFile(3),
  createDefaultHeatCapacityPistonOscillationFile(4),
];

for (const [index, file] of files.entries()) {
  const projected = projectWorkbenchPersistenceV3File(file, index + 1);
  if (!projected.ok) throw new Error(projected.diagnostics[0].message);
  const encoded = encodeWorkbenchPersistenceV3FileProjection(
    projected.value,
    index + 1,
  );
  if (!encoded.ok) throw new Error(encoded.diagnostics[0].message);
  const decoded = decodeWorkbenchPersistenceV3FileRecord(
    structuredClone(encoded.value),
    index + 1,
  );
  if (!decoded.ok) throw new Error(decoded.diagnostics[0].message);
  assert.equal(decoded.status, 'exact');

  const reprojected = reprojectWorkbenchPersistenceV3File(
    decoded.value,
    index + 1,
  );
  if (!reprojected.ok) throw new Error(reprojected.diagnostics[0].message);
  const projectedAgain = projectWorkbenchPersistenceV3File(
    reprojected.value,
    index + 1,
  );
  if (!projectedAgain.ok) throw new Error(projectedAgain.diagnostics[0].message);

  const firstSemantic = createWorkbenchPersistenceV3SemanticProjection(
    projected.value,
  );
  const secondSemantic = createWorkbenchPersistenceV3SemanticProjection(
    projectedAgain.value,
  );
  assert.deepEqual(secondSemantic, firstSemantic);
  assert.equal(
    await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint(firstSemantic),
    await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint(secondSemantic),
    `${file.kind} semantic fingerprint must survive encode/decode/reproject`,
  );
}

const heatProjectionResult = projectWorkbenchPersistenceV3File(
  createDefaultHeatCapacityFile(7),
  7,
);
if (!heatProjectionResult.ok) {
  throw new Error(heatProjectionResult.diagnostics[0].message);
}
const futureActiveHeatFile = createDefaultHeatCapacityFile(6);
futureActiveHeatFile.heatCapacityFreeRealDomain.batch = {
  ...futureActiveHeatFile.heatCapacityFreeRealDomain.batch,
  version: HEAT_CAPACITY_FREE_BATCH_VERSION + 1,
} as never;
const futureActiveHeatProjection =
  projectWorkbenchPersistenceV3File(futureActiveHeatFile, 6);
assert.equal(futureActiveHeatProjection.ok, false);
if (futureActiveHeatProjection.ok) {
  throw new Error('Expected an active future Free batch to be preserved.');
}
assert.equal(futureActiveHeatProjection.status, 'unsupported-future');
assert.deepEqual(futureActiveHeatProjection.raw, futureActiveHeatFile);
assert.equal(
  futureActiveHeatProjection.diagnostics[0].sourceVersion,
  HEAT_CAPACITY_FREE_BATCH_VERSION + 1,
);
const futureDormantHeatFile = createDefaultHeatCapacityFile(9);
futureDormantHeatFile.heatCapacityMode = 'guide';
futureDormantHeatFile.heatCapacityFreeRunWorkspace.batch = {
  ...futureDormantHeatFile.heatCapacityFreeRunWorkspace.batch,
  version: HEAT_CAPACITY_FREE_BATCH_VERSION + 1,
} as never;
const futureDormantHeatProjection =
  projectWorkbenchPersistenceV3File(futureDormantHeatFile, 9);
assert.equal(futureDormantHeatProjection.ok, false);
if (futureDormantHeatProjection.ok) {
  throw new Error('Expected a dormant future Free batch to be preserved.');
}
assert.equal(futureDormantHeatProjection.status, 'unsupported-future');
assert.deepEqual(futureDormantHeatProjection.raw, futureDormantHeatFile);
assert.equal(
  futureDormantHeatProjection.diagnostics[0].fieldPath,
  'heatCapacityFreeBatch',
);
const futureFreeRuntimeFile = createDefaultHeatCapacityFile(10);
futureFreeRuntimeFile.heatCapacityFreeRuntimeVersion =
  (HEAT_CAPACITY_FREE_RUNTIME_VERSION + 1) as never;
const futureFreeRuntimeProjection =
  projectWorkbenchPersistenceV3File(futureFreeRuntimeFile, 10);
assert.equal(futureFreeRuntimeProjection.ok, false);
if (futureFreeRuntimeProjection.ok) {
  throw new Error('Expected a future Free runtime projection to be preserved.');
}
assert.equal(futureFreeRuntimeProjection.status, 'unsupported-future');
assert.deepEqual(futureFreeRuntimeProjection.raw, futureFreeRuntimeFile);
const futureGuideTraceFile = createDefaultHeatCapacityFile(11);
futureGuideTraceFile.heatCapacityMode = 'guide';
futureGuideTraceFile.heatCapacityFreeTraceVersion =
  (HEAT_CAPACITY_FREE_TRACE_VERSION + 1) as never;
const futureGuideTraceProjection =
  projectWorkbenchPersistenceV3File(futureGuideTraceFile, 11);
assert.equal(futureGuideTraceProjection.ok, false);
if (futureGuideTraceProjection.ok) {
  throw new Error('Expected a future dormant Free trace to be preserved.');
}
assert.equal(futureGuideTraceProjection.status, 'unsupported-future');
assert.deepEqual(futureGuideTraceProjection.raw, futureGuideTraceFile);
const futureTraceAfterInvalidRuntimeFile = createDefaultHeatCapacityFile(11);
futureTraceAfterInvalidRuntimeFile.heatCapacityFreeRuntimeVersion = 0 as never;
futureTraceAfterInvalidRuntimeFile.heatCapacityFreeTraceVersion =
  (HEAT_CAPACITY_FREE_TRACE_VERSION + 1) as never;
const futureTraceAfterInvalidRuntimeProjection =
  projectWorkbenchPersistenceV3File(
    futureTraceAfterInvalidRuntimeFile,
    11,
  );
assert.equal(futureTraceAfterInvalidRuntimeProjection.ok, false);
if (futureTraceAfterInvalidRuntimeProjection.ok) {
  throw new Error(
    'Expected a future trace to precede an invalid current runtime version.',
  );
}
assert.equal(
  futureTraceAfterInvalidRuntimeProjection.status,
  'unsupported-future',
);
assert.deepEqual(
  futureTraceAfterInvalidRuntimeProjection.raw,
  futureTraceAfterInvalidRuntimeFile,
);
assert.equal(
  futureTraceAfterInvalidRuntimeProjection.diagnostics[0].fieldPath,
  'heatCapacityFreeTraceVersion',
);
const futureIdealAfterMalformedRealFile = createDefaultHeatCapacityFile(11);
futureIdealAfterMalformedRealFile.heatCapacityFreeRealDomain
  .activeRunConfigSnapshot = { malformed: true } as never;
futureIdealAfterMalformedRealFile.heatCapacityFreeIdealDomain.batch = {
  ...futureIdealAfterMalformedRealFile.heatCapacityFreeIdealDomain.batch,
  version: HEAT_CAPACITY_FREE_BATCH_VERSION + 1,
} as never;
const futureIdealAfterMalformedRealProjection =
  projectWorkbenchPersistenceV3File(
    futureIdealAfterMalformedRealFile,
    11,
  );
assert.equal(futureIdealAfterMalformedRealProjection.ok, false);
if (futureIdealAfterMalformedRealProjection.ok) {
  throw new Error(
    'Expected an ideal-domain future to precede malformed real authority.',
  );
}
assert.equal(
  futureIdealAfterMalformedRealProjection.status,
  'unsupported-future',
);
assert.deepEqual(
  futureIdealAfterMalformedRealProjection.raw,
  futureIdealAfterMalformedRealFile,
);
const futureIdealAfterNonRecordRealFile = createDefaultHeatCapacityFile(11);
(
  futureIdealAfterNonRecordRealFile as unknown as {
    heatCapacityFreeRealDomain: unknown;
  }
).heatCapacityFreeRealDomain = null;
futureIdealAfterNonRecordRealFile.heatCapacityFreeIdealDomain.batch = {
  ...futureIdealAfterNonRecordRealFile.heatCapacityFreeIdealDomain.batch,
  version: HEAT_CAPACITY_FREE_BATCH_VERSION + 1,
} as never;
const futureIdealAfterNonRecordRealProjection =
  projectWorkbenchPersistenceV3File(
    futureIdealAfterNonRecordRealFile,
    11,
  );
assert.equal(futureIdealAfterNonRecordRealProjection.ok, false);
if (futureIdealAfterNonRecordRealProjection.ok) {
  throw new Error(
    'Expected an ideal-domain future to precede a non-record real domain.',
  );
}
assert.equal(
  futureIdealAfterNonRecordRealProjection.status,
  'unsupported-future',
);
assert.deepEqual(
  futureIdealAfterNonRecordRealProjection.raw,
  futureIdealAfterNonRecordRealFile,
);
const futureFrozenSnapshotFile = structuredClone(
  storeHeatCapacityFreeRuntimeFieldsInDomain(
    freezeHeatCapacityFreeParametersForCurrentGroup(
      configureHeatCapacityFreeBatchWorkbenchState(
        createDefaultHeatCapacityFile(12),
        3,
        100,
      ),
      101,
    ),
    'real',
  ),
);
if (
  futureFrozenSnapshotFile.heatCapacityFreeRealDomain.batch
    .frozenConfigSnapshot === null
) {
  throw new Error('Expected a frozen configuration snapshot fixture.');
}
  futureFrozenSnapshotFile.heatCapacityFreeRealDomain.batch
    .frozenConfigSnapshot.version =
    (HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION + 90) as never;
const futureFrozenSnapshotProjection =
  projectWorkbenchPersistenceV3File(futureFrozenSnapshotFile, 12);
assert.equal(futureFrozenSnapshotProjection.ok, false);
if (futureFrozenSnapshotProjection.ok) {
  throw new Error('Expected a future frozen configuration snapshot to survive.');
}
assert.equal(
  futureFrozenSnapshotProjection.status,
  'unsupported-future',
);
assert.deepEqual(
  futureFrozenSnapshotProjection.raw,
  futureFrozenSnapshotFile,
);
assert.equal(
  futureFrozenSnapshotProjection.diagnostics[0].sourceVersion,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION + 90,
);
assert.equal(
  futureFrozenSnapshotProjection.diagnostics[0].fieldPath,
  'heatCapacityFreeRealDomain.batch.frozenConfigSnapshot.version',
);
const futureCalculationSessionFile = structuredClone(
  storeHeatCapacityFreeRuntimeFieldsInDomain(
    freezeHeatCapacityFreeParametersForCurrentGroup(
      configureHeatCapacityFreeBatchWorkbenchState(
        createDefaultHeatCapacityFile(12),
        3,
        100,
      ),
      101,
    ),
    'real',
  ),
);
const futureCalculationSessionAuthority = {
  version: HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION + 1,
  futureOnly: true,
};
futureCalculationSessionFile.heatCapacityFreeRunWorkspace.batch.calculationSession =
  futureCalculationSessionAuthority as never;
futureCalculationSessionFile.heatCapacityFreeRealDomain.batch
  .calculationSession = structuredClone(
    futureCalculationSessionAuthority,
  ) as never;
const futureCalculationSessionProjection =
  projectWorkbenchPersistenceV3File(futureCalculationSessionFile, 12);
assert.equal(futureCalculationSessionProjection.ok, false);
if (futureCalculationSessionProjection.ok) {
  throw new Error('Expected a future calculation session to remain raw.');
}
assert.equal(
  futureCalculationSessionProjection.status,
  'unsupported-future',
);
assert.deepEqual(
  futureCalculationSessionProjection.raw,
  futureCalculationSessionFile,
);
assert.equal(
  futureCalculationSessionProjection.diagnostics[0].fieldPath,
  'heatCapacityFreeRealDomain.batch.calculationSession.version',
);
const heatAuthority = heatProjectionResult.value.fields.authoritative as {
  activeRuntime: Record<string, unknown>;
  freeDomains: Record<string, unknown>;
};
for (const [key, supportedVersion] of [
  [
    'heatCapacityFreeRuntimeVersion',
    HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  ],
  [
    'heatCapacityFreeTraceVersion',
    HEAT_CAPACITY_FREE_TRACE_VERSION,
  ],
] as const) {
  const futureRuntimeProjection = structuredClone(
    heatProjectionResult.value,
  );
  (
    futureRuntimeProjection.fields.authoritative.activeRuntime as
      Record<string, unknown>
  )[key] = supportedVersion + 1;
  const futureRuntimeReprojection = reprojectWorkbenchPersistenceV3File(
    futureRuntimeProjection,
    7,
  );
  assert.equal(futureRuntimeReprojection.ok, false);
  if (futureRuntimeReprojection.ok) {
    throw new Error(`Expected future ${key} reprojection failure.`);
  }
  assert.equal(
    futureRuntimeReprojection.status,
    'unsupported-future',
  );
  assert.deepEqual(
    futureRuntimeReprojection.raw,
    futureRuntimeProjection,
  );
}
for (const rebuildableRuntimeField of [
  'heatCapacityFreeRunWorkspace',
  'heatCapacityFreeBatch',
  'heatCapacityFreeTraceStore',
  'heatCapacityFreeTrials',
  'heatCapacityFreeActiveAttempt',
]) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      heatAuthority.activeRuntime,
      rebuildableRuntimeField,
    ),
    false,
    `${rebuildableRuntimeField} must not be encoded as duplicate active Free authority`,
  );
}

const heatStartedForMigration =
  freezeHeatCapacityFreeParametersForCurrentGroup(
    configureHeatCapacityFreeBatchWorkbenchState(
      createDefaultHeatCapacityFile(8),
      3,
      100,
    ),
  );
const heatStartedProjection = projectWorkbenchPersistenceV3File(
  heatStartedForMigration,
  8,
);
if (!heatStartedProjection.ok) {
  throw new Error(heatStartedProjection.diagnostics[0].message);
}
for (const [label, mutate] of [
  [
    'projection',
    (projection: Record<string, unknown>) => {
      projection.opaqueAuthority = { retain: true };
    },
  ],
  [
    'field classes',
    (projection: Record<string, unknown>) => {
      (
        projection.fields as Record<string, unknown>
      ).opaqueAuthority = { retain: true };
    },
  ],
] as const) {
  const opaqueProjection = structuredClone(
    heatStartedProjection.value,
  ) as unknown as Record<string, unknown>;
  mutate(opaqueProjection);
  const opaqueEncode = encodeWorkbenchPersistenceV3FileProjection(
    opaqueProjection as unknown as typeof heatStartedProjection.value,
    8,
  );
  assert.equal(opaqueEncode.ok, false);
  if (opaqueEncode.ok) {
    throw new Error(`Expected unknown ${label} encode quarantine.`);
  }
  assert.equal(opaqueEncode.status, 'quarantined');
  assert.deepEqual(opaqueEncode.raw, opaqueProjection);
}
const durableHighWaterStarted = storeHeatCapacityFreeRuntimeFieldsInDomain(
  heatStartedForMigration,
  'real',
);
const durableHighWaterFile = {
  ...durableHighWaterStarted,
  heatCapacityFreeRunWorkspace: {
    ...durableHighWaterStarted.heatCapacityFreeRunWorkspace,
    batch: {
      ...durableHighWaterStarted.heatCapacityFreeRunWorkspace.batch,
      nextTrialSequence: 1,
    },
    traceStore: {
      ...durableHighWaterStarted.heatCapacityFreeRunWorkspace.traceStore,
      nextTraceTrialIndex: 1,
    },
  },
  heatCapacityFreeRealDomain: {
    ...durableHighWaterStarted.heatCapacityFreeRealDomain,
    batch: {
      ...durableHighWaterStarted.heatCapacityFreeRealDomain.batch,
      nextTrialSequence: 7,
    },
    traceStore: {
      ...durableHighWaterStarted.heatCapacityFreeRealDomain.traceStore,
      nextTraceTrialIndex: 7,
    },
  },
};
const durableHighWaterProjection = projectWorkbenchPersistenceV3File(
  durableHighWaterFile,
  8,
);
if (!durableHighWaterProjection.ok) {
  throw new Error(durableHighWaterProjection.diagnostics[0].message);
}
assert.equal(durableHighWaterProjection.status, 'repaired-cache');
assert.equal(
  durableHighWaterProjection.diagnostics.some((diagnostic) => (
    diagnostic.code === 'persistence-v3-heat-domain-cache-reprojected' &&
    diagnostic.fieldPath === 'activeRuntime'
  )),
  true,
  'a stale top-level projection must be reported as cache repair, not domain migration',
);
const durableHighWaterAuthority =
  durableHighWaterProjection.value.fields.authoritative as {
    freeDomains: {
      real: {
        batch: { nextTrialSequence: number };
        traceStore: { nextTraceTrialIndex: number };
      };
    };
  };
assert.equal(
  durableHighWaterAuthority.freeDomains.real.batch.nextTrialSequence,
  7,
  'V3 capture must not roll back the durable batch high-water',
);
assert.equal(
  durableHighWaterAuthority.freeDomains.real.traceStore.nextTraceTrialIndex,
  7,
  'V3 capture must not roll back the durable trace high-water',
);
const dormantHighWaterProjection = projectWorkbenchPersistenceV3File({
  ...durableHighWaterFile,
  heatCapacityMode: 'guide',
}, 8);
if (!dormantHighWaterProjection.ok) {
  throw new Error(dormantHighWaterProjection.diagnostics[0].message);
}
assert.equal(
  dormantHighWaterProjection.status,
  'repaired-cache',
  'a dormant stale Free projection must be reported as cache repair',
);
assert.equal(
  dormantHighWaterProjection.diagnostics.some((diagnostic) => (
    diagnostic.code === 'persistence-v3-heat-domain-cache-reprojected' &&
    diagnostic.fieldPath === 'activeRuntime'
  )),
  true,
);

const invalidCompletionStartedAt =
  durableHighWaterStarted.heatCapacityFreeRunWorkspace.batch.startedAtMs;
if (invalidCompletionStartedAt === null) {
  throw new Error('Expected the batch-completion fixture to be started.');
}
const invalidBatchCompletionFile = {
  ...durableHighWaterStarted,
  heatCapacityFreeRunWorkspace: {
    ...durableHighWaterStarted.heatCapacityFreeRunWorkspace,
    batch: {
      ...durableHighWaterStarted.heatCapacityFreeRunWorkspace.batch,
      experimentCompletedAtMs: invalidCompletionStartedAt + 1,
    },
  },
};
const invalidBatchCompletion = projectWorkbenchPersistenceV3File(
  invalidBatchCompletionFile,
  8,
);
if (!invalidBatchCompletion.ok) {
  throw new Error(invalidBatchCompletion.diagnostics[0].message);
}
assert.equal(
  invalidBatchCompletion.status,
  'repaired-cache',
  'an impossible completion timestamp in the flat cache must be rebuilt from the experiment group',
);
assert.equal(
  (
    invalidBatchCompletion.value.fields.authoritative.freeDomains as {
      real: { batch: { experimentCompletedAtMs: number | null } };
    }
  ).real.batch.experimentCompletedAtMs,
  null,
);

const durableTrialBatchId = durableHighWaterStarted.heatCapacityFreeRunWorkspace.batch.id;
if (durableTrialBatchId === null) {
  throw new Error('Expected the durable trial-authority fixture to have a batch id.');
}
const durableTrialAuthority = {
  ...createHeatCapacityFreeTrial(
    'trial-authority-1',
    null,
    'real',
    {
      version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
      batchId: durableTrialBatchId,
      sequence: 1,
    },
  ),
  preheatOutcome: 'completed' as const,
};
const futureCorrectedSignalTrial = structuredClone(durableTrialAuthority);
futureCorrectedSignalTrial.u1 = normalizeHeatCapacityFreeRecordInput({
  atS: 4,
  displayPressureMv: 100,
  displayTemperatureMv: 0,
  calibrationVersion: 1,
  zeroEventId: 'zero-v3-cache-test',
  phaseAtRecord: 'sealedStabilizing',
});
futureCorrectedSignalTrial.u2 = normalizeHeatCapacityFreeRecordInput({
  atS: 5,
  displayPressureMv: 30,
  displayTemperatureMv: 0,
  calibrationVersion: 1,
  zeroEventId: 'zero-v3-cache-test',
  phaseAtRecord: 'recovering',
});
futureCorrectedSignalTrial.correctedSignals =
  calculateFreeHeatCapacityTrialSignals(futureCorrectedSignalTrial);
if (futureCorrectedSignalTrial.correctedSignals === null) {
  throw new Error('Expected a V3 corrected-signal cache fixture.');
}
futureCorrectedSignalTrial.correctedSignals.calculationVersion =
  'log-pressure-v99' as never;
const futureCorrectedSignalBatch = {
  ...durableHighWaterStarted.heatCapacityFreeRunWorkspace.batch,
  nextTrialSequence: 2,
};
const durableCurrentGroup =
  durableHighWaterStarted.heatCapacityFreeExperimentGroups.groups.find(
    (group) => (
      group.id ===
        durableHighWaterStarted.heatCapacityFreeExperimentGroups.currentGroupId
    ),
  );
if (!durableCurrentGroup) {
  throw new Error('Expected a current experiment-group authority fixture.');
}
const futureCorrectedSignalGroups =
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
    durableHighWaterStarted.heatCapacityFreeExperimentGroups,
    {
      ...durableCurrentGroup.runSeries,
      batch: futureCorrectedSignalBatch,
      trials: [structuredClone(futureCorrectedSignalTrial)],
    },
  );
const futureCorrectedSignalFile = {
  ...durableHighWaterStarted,
  heatCapacityFreeRunWorkspace: {
    ...durableHighWaterStarted.heatCapacityFreeRunWorkspace,
    batch: futureCorrectedSignalBatch,
    trials: [futureCorrectedSignalTrial],
  },
  heatCapacityFreeExperimentGroups: futureCorrectedSignalGroups,
  heatCapacityFreeRealDomain: {
    ...durableHighWaterStarted.heatCapacityFreeRealDomain,
    batch: futureCorrectedSignalBatch,
    trials: [structuredClone(futureCorrectedSignalTrial)],
  },
};
const futureCorrectedSignalProjection =
  projectWorkbenchPersistenceV3File(futureCorrectedSignalFile, 8);
if (!futureCorrectedSignalProjection.ok) {
  throw new Error(futureCorrectedSignalProjection.diagnostics[0].message);
}
assert.equal(
  futureCorrectedSignalProjection.status,
  'repaired-cache',
);
const repairedCorrectedSignalAuthority =
  futureCorrectedSignalProjection.value.fields.authoritative as {
    freeDomains: {
      real: {
        trials: Array<{
          correctedSignals: {
            calculationVersion: string;
          } | null;
        }>;
      };
    };
  };
assert.equal(
  repairedCorrectedSignalAuthority.freeDomains.real.trials[0]
    .correctedSignals?.calculationVersion,
  'log-pressure-v1',
);
const canonicalCorrectedSignalRecord =
  encodeWorkbenchPersistenceV3FileProjection(
    futureCorrectedSignalProjection.value,
    8,
  );
if (!canonicalCorrectedSignalRecord.ok) {
  throw new Error(canonicalCorrectedSignalRecord.diagnostics[0].message);
}
const damagedCorrectedSignalRecord = structuredClone(
  canonicalCorrectedSignalRecord.value,
);
const damagedCorrectedSignalAuthority =
  damagedCorrectedSignalRecord.projection.fields.authoritative as {
    freeDomains: {
      real: {
        trials: Array<{
          correctedSignals: {
            calculationVersion: string;
          } | null;
        }>;
      };
    };
  };
if (
  damagedCorrectedSignalAuthority.freeDomains.real.trials[0]
    .correctedSignals === null
) {
  throw new Error('Expected an encoded corrected-signal cache fixture.');
}
damagedCorrectedSignalAuthority.freeDomains.real.trials[0]
  .correctedSignals.calculationVersion = 'log-pressure-v99';
const decodedCorrectedSignalRepair =
  decodeWorkbenchPersistenceV3FileRecord(
    damagedCorrectedSignalRecord,
    8,
  );
if (!decodedCorrectedSignalRepair.ok) {
  throw new Error(decodedCorrectedSignalRepair.diagnostics[0].message);
}
assert.equal(decodedCorrectedSignalRepair.status, 'repaired-cache');
const decodedCorrectedSignalAuthority =
  decodedCorrectedSignalRepair.value.fields.authoritative as {
    freeDomains: {
      real: {
        trials: Array<{
          correctedSignals: {
            calculationVersion: string;
          } | null;
        }>;
      };
    };
  };
assert.equal(
  decodedCorrectedSignalAuthority.freeDomains.real.trials[0]
    .correctedSignals?.calculationVersion,
  'log-pressure-v1',
);
const opaqueSiblingCorrectedSignalRecord = structuredClone(
  damagedCorrectedSignalRecord,
);
(
  (
    opaqueSiblingCorrectedSignalRecord.projection.fields.authoritative as {
      freeDomains: {
        real: Record<string, unknown>;
      };
    }
  ).freeDomains.real
).opaqueAuthority = 'must-not-be-hidden-by-cache-repair';
const opaqueSiblingCorrectedSignalDecode =
  decodeWorkbenchPersistenceV3FileRecord(
    opaqueSiblingCorrectedSignalRecord,
    8,
  );
assert.equal(opaqueSiblingCorrectedSignalDecode.ok, false);
if (opaqueSiblingCorrectedSignalDecode.ok) {
  throw new Error(
    'Expected cache repair with an opaque authoritative sibling to quarantine.',
  );
}
assert.equal(
  opaqueSiblingCorrectedSignalDecode.status,
  'quarantined',
);
assert.deepEqual(
  opaqueSiblingCorrectedSignalDecode.raw,
  opaqueSiblingCorrectedSignalRecord,
);
const opaqueCorrectedSignalFile = structuredClone(
  futureCorrectedSignalFile,
);
for (const trial of [
  opaqueCorrectedSignalFile.heatCapacityFreeRunWorkspace.trials[0],
  opaqueCorrectedSignalFile.heatCapacityFreeRealDomain.trials[0],
]) {
  (
    trial.correctedSignals as unknown as Record<string, unknown>
  ).futureAuthority = true;
}
const opaqueCorrectedSignalProjection =
  projectWorkbenchPersistenceV3File(opaqueCorrectedSignalFile, 8);
assert.equal(opaqueCorrectedSignalProjection.ok, false);
if (opaqueCorrectedSignalProjection.ok) {
  throw new Error('Expected opaque corrected-signal authority quarantine.');
}
assert.equal(opaqueCorrectedSignalProjection.status, 'quarantined');
assert.deepEqual(
  opaqueCorrectedSignalProjection.raw,
  opaqueCorrectedSignalFile,
);
const trialAuthorityBatch = {
  ...durableHighWaterStarted.heatCapacityFreeRunWorkspace.batch,
  nextTrialSequence: 2,
};
const trialAuthorityGroups =
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
    durableHighWaterStarted.heatCapacityFreeExperimentGroups,
    {
      ...durableCurrentGroup.runSeries,
      batch: trialAuthorityBatch,
      trials: [durableTrialAuthority],
    },
  );
const regressingTrialAuthorityFile = {
  ...durableHighWaterStarted,
  heatCapacityFreeRunWorkspace: {
    ...durableHighWaterStarted.heatCapacityFreeRunWorkspace,
    batch: trialAuthorityBatch,
    trials: [{
      ...durableTrialAuthority,
      preheatOutcome: 'omitted' as const,
    }],
  },
  heatCapacityFreeExperimentGroups: trialAuthorityGroups,
  heatCapacityFreeRealDomain: {
    ...durableHighWaterStarted.heatCapacityFreeRealDomain,
    batch: trialAuthorityBatch,
    trials: [durableTrialAuthority],
  },
};
const regressingTrialAuthority = projectWorkbenchPersistenceV3File(
  regressingTrialAuthorityFile,
  8,
);
if (!regressingTrialAuthority.ok) {
  throw new Error(regressingTrialAuthority.diagnostics[0].message);
}
assert.equal(regressingTrialAuthority.status, 'repaired-cache');
assert.equal(
  (
    regressingTrialAuthority.value.fields.authoritative.freeDomains as {
      real: { trials: Array<{ preheatOutcome: string }> };
    }
  ).real.trials[0]?.preheatOutcome,
  'completed',
  'a stale same-id runtime trial must be rebuilt from experiment-group authority',
);

const secondDurableTrialAuthority = {
  ...createHeatCapacityFreeTrial(
    'trial-authority-2',
    null,
    'real',
    {
      version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
      batchId: durableTrialBatchId,
      sequence: 2,
    },
  ),
  preheatOutcome: 'completed' as const,
};
const orderedTrialBatch = {
  ...trialAuthorityBatch,
  nextTrialSequence: 3,
};
const orderedTrialGroups =
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
    durableHighWaterStarted.heatCapacityFreeExperimentGroups,
    {
      ...durableCurrentGroup.runSeries,
      batch: orderedTrialBatch,
      trials: [durableTrialAuthority, secondDurableTrialAuthority],
    },
  );
const reorderedTrialAuthorityFile = {
  ...durableHighWaterStarted,
  heatCapacityFreeRunWorkspace: {
    ...durableHighWaterStarted.heatCapacityFreeRunWorkspace,
    batch: orderedTrialBatch,
    trials: [
      secondDurableTrialAuthority,
      durableTrialAuthority,
    ],
  },
  heatCapacityFreeExperimentGroups: orderedTrialGroups,
  heatCapacityFreeRealDomain: {
    ...durableHighWaterStarted.heatCapacityFreeRealDomain,
    batch: orderedTrialBatch,
    trials: [
      durableTrialAuthority,
      secondDurableTrialAuthority,
    ],
  },
};
const reorderedTrialAuthority = projectWorkbenchPersistenceV3File(
  reorderedTrialAuthorityFile,
  8,
);
if (!reorderedTrialAuthority.ok) {
  throw new Error(reorderedTrialAuthority.diagnostics[0].message);
}
assert.equal(reorderedTrialAuthority.status, 'repaired-cache');
assert.deepEqual(
  (
    reorderedTrialAuthority.value.fields.authoritative.freeDomains as {
      real: { trials: Array<{ id: string }> };
    }
  ).real.trials.map((trial) => trial.id),
  ['trial-authority-1', 'trial-authority-2'],
  'a stale runtime order must be rebuilt from experiment-group authority',
);

const completeTrialParts = createCompleteProcessReviewFixtureParts();
const completeTrialStandardReference =
  createHeatCapacityFreeStandardReference({
    traceTrial: completeTrialParts.traceTrial,
    trial: completeTrialParts.trial,
    theoreticalGamma: 1.4,
  });
const removeTraceAuthority = <
  RecordValue extends {
    traceTrialId: string | null;
    traceBranchId: string | null;
    traceSampleId: string | null;
    eventId: string | null;
  },
>(record: RecordValue | null) => record === null
  ? null
  : {
      ...record,
      traceTrialId: null,
      traceBranchId: null,
      traceSampleId: null,
      eventId: null,
    };
const completeBatchTrials = [1, 3, 4].map((sequence) => ({
  ...structuredClone(completeTrialParts.trial),
  id: `completed-trial-${sequence}`,
  batchMembership: {
    version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
    batchId: durableTrialBatchId,
    sequence,
  },
  traceTrialId: null,
  branchCount: 0,
  u0: removeTraceAuthority(completeTrialParts.trial.u0),
  u1: removeTraceAuthority(completeTrialParts.trial.u1),
  u2: removeTraceAuthority(completeTrialParts.trial.u2),
  standardReferenceSnapshot: completeTrialStandardReference,
  completedAtMs: invalidCompletionStartedAt + sequence,
}));
const completeBatchBeforeCompletion = {
  ...durableHighWaterStarted.heatCapacityFreeRunWorkspace.batch,
  nextTrialSequence: 5,
};
const completeBatchAfterCompletion = {
  ...completeBatchBeforeCompletion,
  experimentCompletedAtMs: invalidCompletionStartedAt + 5,
};
const nullTimestampCompletionFile = {
  ...durableHighWaterStarted,
  heatCapacityFreeExperimentGroupStatus: 'completed' as const,
  heatCapacityFreeRunWorkspace: {
    ...durableHighWaterStarted.heatCapacityFreeRunWorkspace,
    batch: completeBatchAfterCompletion,
    trials: completeBatchTrials.map((trial) => ({
      ...trial,
      completedAtMs: null,
    })),
  },
  heatCapacityFreeRealDomain: {
    ...durableHighWaterStarted.heatCapacityFreeRealDomain,
    batch: completeBatchBeforeCompletion,
    experimentGroupStatus: 'completed' as const,
    trials: completeBatchTrials.map((trial) => ({
      ...trial,
      completedAtMs: null,
    })),
  },
};
const nullTimestampCompletion = projectWorkbenchPersistenceV3File(
  nullTimestampCompletionFile,
  8,
);
if (!nullTimestampCompletion.ok) {
  throw new Error(nullTimestampCompletion.diagnostics[0].message);
}
assert.equal(
  nullTimestampCompletion.status,
  'repaired-cache',
  'invalid completion data in the runtime workspace cache must be discarded',
);
const legalBatchCompletionFile = {
  ...durableHighWaterStarted,
  heatCapacityFreeExperimentGroupStatus: 'completed' as const,
  heatCapacityFreeRunWorkspace: {
    ...durableHighWaterStarted.heatCapacityFreeRunWorkspace,
    batch: completeBatchAfterCompletion,
    trials: completeBatchTrials,
  },
  heatCapacityFreeRealDomain: {
    ...durableHighWaterStarted.heatCapacityFreeRealDomain,
    batch: completeBatchBeforeCompletion,
    experimentGroupStatus: 'completed' as const,
    trials: completeBatchTrials,
  },
};
const legalBatchCompletion = projectWorkbenchPersistenceV3File(
  legalBatchCompletionFile,
  8,
);
if (!legalBatchCompletion.ok) {
  throw new Error(legalBatchCompletion.diagnostics[0].message);
}
assert.equal(
  (
    legalBatchCompletion.value.fields.authoritative as {
      freeDomains: {
        real: {
          batch: { experimentCompletedAtMs: number | null };
        };
      };
    }
  ).freeDomains.real.batch.experimentCompletedAtMs,
  null,
  'cache-only completion data must not advance experiment-group lifecycle authority',
);

const opaqueBatchCaptureFile = structuredClone(durableHighWaterStarted);
(
  opaqueBatchCaptureFile.heatCapacityFreeRealDomain.batch as unknown as
    Record<string, unknown>
).opaqueAuthority = 'must-not-drop';
const opaqueBatchCapture = projectWorkbenchPersistenceV3File(
  opaqueBatchCaptureFile,
  8,
);
assert.equal(opaqueBatchCapture.ok, false);
if (opaqueBatchCapture.ok) {
  throw new Error('Expected same-version batch authority quarantine.');
}
assert.equal(opaqueBatchCapture.status, 'quarantined');
assert.deepEqual(opaqueBatchCapture.raw, opaqueBatchCaptureFile);

const heatCurrentRecord = encodeWorkbenchPersistenceV3FileProjection(
  heatStartedProjection.value,
  8,
);
if (!heatCurrentRecord.ok) {
  throw new Error(heatCurrentRecord.diagnostics[0].message);
}
const preGroupAuthorityRecord = structuredClone(heatCurrentRecord.value);
delete (
  preGroupAuthorityRecord.projection.fields.authoritative.freeDomains as
    Record<string, unknown>
).experimentGroups;
const strictPreGroupDecode = decodeWorkbenchPersistenceV3FileRecord(
  preGroupAuthorityRecord,
  8,
);
assert.equal(strictPreGroupDecode.ok, false);
if (strictPreGroupDecode.ok) {
  throw new Error('Expected current V3 decoding to reject pre-group authority.');
}
assert.equal(strictPreGroupDecode.status, 'quarantined');
const compatiblePreGroupDecode = decodeCompatibleWorkbenchV3FileRecord(
  preGroupAuthorityRecord,
  8,
);
assert.equal(compatiblePreGroupDecode.ok, true);
if (!compatiblePreGroupDecode.ok) {
  throw new Error(compatiblePreGroupDecode.diagnostics[0].message);
}
assert.equal(
  compatiblePreGroupDecode.status,
  'migrated',
  'early V3 heat projections must migrate only through the compatibility adapter',
);
for (const [label, section, key, value] of [
  [
    'Guide trial',
    'guide',
    'heatCapacityGuideTrial',
    { arbitrary: true },
  ],
  [
    'Guide workflow',
    'guide',
    'heatCapacityGuideWorkflow',
    { arbitrary: true },
  ],
  [
    'experiment profile',
    'activeRuntime',
    'heatCapacityExperimentProfile',
    { arbitrary: true },
  ],
  [
    'pressure limit',
    'activeRuntime',
    'pressureLimitKPa',
    'bad',
  ],
  [
    'run state',
    'activeRuntime',
    'runState',
    'future-state',
  ],
  [
    'process samples',
    'activeRuntime',
    'heatCapacityProcessSamples',
    { arbitrary: true },
  ],
  [
    'simulation params',
    'activeRuntime',
    'params',
    { arbitrary: true },
  ],
] as const) {
  const arbitraryKnownAuthorityRecord = structuredClone(
    heatCurrentRecord.value,
  );
  const arbitraryKnownAuthority =
    arbitraryKnownAuthorityRecord.projection.fields.authoritative as {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    };
  arbitraryKnownAuthority[section][key] = value;
  const arbitraryKnownAuthorityDecode =
    decodeWorkbenchPersistenceV3FileRecord(
      arbitraryKnownAuthorityRecord,
      8,
    );
  assert.equal(
    arbitraryKnownAuthorityDecode.ok,
    false,
    `${label} arbitrary payload must not decode`,
  );
  if (arbitraryKnownAuthorityDecode.ok) {
    throw new Error(`Expected ${label} arbitrary payload quarantine.`);
  }
  assert.equal(arbitraryKnownAuthorityDecode.status, 'quarantined');
  assert.deepEqual(
    arbitraryKnownAuthorityDecode.raw,
    arbitraryKnownAuthorityRecord,
  );
}
for (const [label, mutate] of [
  [
    'nested simulation params sibling',
    (authority: {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    }) => {
      (
        authority.activeRuntime.params as Record<string, unknown>
      ).opaqueAuthority = true;
    },
  ],
  [
    'invalid applied particle count',
    (authority: {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    }) => {
      (
        authority.activeRuntime.appliedParams as Record<string, unknown>
      ).N = 1.5;
    },
  ],
  [
    'invalid final chart',
    (authority: {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    }) => {
      authority.activeRuntime.finalChartData = { arbitrary: true };
    },
  ],
  [
    'nested process sample sibling',
    (authority: {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    }) => {
      authority.activeRuntime.heatCapacityProcessSamples = {
        startSample: {
          timeS: 0,
          phase: 'powerOff',
          temperatureSignalMv: 0,
          pressureSignalMv: 0,
          gasTemperatureK: 298.15,
          gasPressureKPaAbs: 101.3,
          pressureDeltaKPa: 0,
          pumpFrequency: 0,
          pumpValveOpen: false,
          stopcockOpen: false,
          opaqueAuthority: true,
        },
      };
    },
  ],
  [
    'invalid Guide config',
    (authority: {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    }) => {
      (
        authority.guide.heatCapacityGuidePhysicsConfig as
          Record<string, unknown>
      ).gamma = 'bad';
    },
  ],
  [
    'invalid Guide state',
    (authority: {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    }) => {
      (
        authority.guide.heatCapacityGuidePhysicsState as
          Record<string, unknown>
      ).simulationTimeS = -1;
    },
  ],
  [
    'non-canonical teaching profile',
    (authority: {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    }) => {
      authority.activeRuntime.heatCapacityExperimentProfile = {
        ...createHeatCapacityAutoDemoProfile(() => 0.5),
        theoreticalGamma: 9,
      };
    },
  ],
  [
    'pump-valve relationship',
    (authority: {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    }) => {
      authority.activeRuntime.pumpValveOpen = true;
      authority.activeRuntime.pumpValveState = 'closed';
    },
  ],
] as const) {
  const attackedKnownAuthorityRecord = structuredClone(
    heatCurrentRecord.value,
  );
  const attackedKnownAuthority =
    attackedKnownAuthorityRecord.projection.fields.authoritative as {
      activeRuntime: Record<string, unknown>;
      guide: Record<string, unknown>;
    };
  mutate(attackedKnownAuthority);
  const attackedKnownAuthorityDecode =
    decodeWorkbenchPersistenceV3FileRecord(
      attackedKnownAuthorityRecord,
      8,
    );
  assert.equal(
    attackedKnownAuthorityDecode.ok,
    false,
    `${label} must not decode`,
  );
  if (attackedKnownAuthorityDecode.ok) {
    throw new Error(`Expected ${label} quarantine.`);
  }
  assert.equal(attackedKnownAuthorityDecode.status, 'quarantined');
  assert.deepEqual(
    attackedKnownAuthorityDecode.raw,
    attackedKnownAuthorityRecord,
  );
}
for (const [label, mutate] of [
  [
    'record',
    (record: Record<string, unknown>) => {
      record.opaqueAuthority = { retain: true };
    },
  ],
  [
    'projection',
    (record: Record<string, unknown>) => {
      (
        record.projection as Record<string, unknown>
      ).opaqueAuthority = { retain: true };
    },
  ],
  [
    'field classes',
    (record: Record<string, unknown>) => {
      const projection = record.projection as Record<string, unknown>;
      (
        projection.fields as Record<string, unknown>
      ).opaqueAuthority = { retain: true };
    },
  ],
] as const) {
  const opaqueV3Record = structuredClone(
    heatCurrentRecord.value,
  ) as unknown as Record<string, unknown>;
  mutate(opaqueV3Record);
  const opaqueV3Decode = decodeWorkbenchPersistenceV3FileRecord(
    opaqueV3Record,
    8,
  );
  assert.equal(opaqueV3Decode.ok, false);
  if (opaqueV3Decode.ok) {
    throw new Error(`Expected unknown V3 ${label} field quarantine.`);
  }
  assert.equal(opaqueV3Decode.status, 'quarantined');
  assert.deepEqual(opaqueV3Decode.raw, opaqueV3Record);
}
const futureBatchWithDamagedTraceRecord = structuredClone(
  heatCurrentRecord.value,
);
const futureBatchWithDamagedTraceAuthority =
  futureBatchWithDamagedTraceRecord.projection.fields
    .authoritative as {
      freeDomains: {
        real: {
          batch: Record<string, unknown>;
          traceStore: unknown;
        };
      };
    };
futureBatchWithDamagedTraceAuthority.freeDomains.real.batch.version =
  HEAT_CAPACITY_FREE_BATCH_VERSION + 1;
futureBatchWithDamagedTraceAuthority.freeDomains.real.batch
  .frozenConfigSnapshot = { futureOnly: true };
futureBatchWithDamagedTraceAuthority.freeDomains.real.batch
  .calculationSession = { futureOnly: true };
futureBatchWithDamagedTraceAuthority.freeDomains.real.traceStore = {
  corrupt: true,
};
const futureBatchWithDamagedTrace =
  decodeWorkbenchPersistenceV3FileRecord(
    futureBatchWithDamagedTraceRecord,
    8,
  );
assert.equal(futureBatchWithDamagedTrace.ok, false);
if (futureBatchWithDamagedTrace.ok) {
  throw new Error(
    'Expected future batch dispatch before current trace parsing.',
  );
}
assert.equal(
  futureBatchWithDamagedTrace.status,
  'unsupported-future',
);
assert.deepEqual(
  futureBatchWithDamagedTrace.raw,
  futureBatchWithDamagedTraceRecord,
);
assert.equal(
  futureBatchWithDamagedTrace.diagnostics[0].sourceVersion,
  HEAT_CAPACITY_FREE_BATCH_VERSION + 1,
);
const futureTraceAfterInvalidRuntimeRecord = structuredClone(
  heatCurrentRecord.value,
);
const futureTraceAfterInvalidRuntimeAuthority =
  futureTraceAfterInvalidRuntimeRecord.projection.fields
    .authoritative.activeRuntime as Record<string, unknown>;
futureTraceAfterInvalidRuntimeAuthority.heatCapacityFreeRuntimeVersion = 0;
futureTraceAfterInvalidRuntimeAuthority.heatCapacityFreeTraceVersion =
  HEAT_CAPACITY_FREE_TRACE_VERSION + 1;
const futureTraceAfterInvalidRuntimeDecode =
  decodeWorkbenchPersistenceV3FileRecord(
    futureTraceAfterInvalidRuntimeRecord,
    8,
  );
assert.equal(futureTraceAfterInvalidRuntimeDecode.ok, false);
if (futureTraceAfterInvalidRuntimeDecode.ok) {
  throw new Error(
    'Expected a projected future trace to precede an invalid runtime version.',
  );
}
assert.equal(
  futureTraceAfterInvalidRuntimeDecode.status,
  'unsupported-future',
);
assert.deepEqual(
  futureTraceAfterInvalidRuntimeDecode.raw,
  futureTraceAfterInvalidRuntimeRecord,
);
assert.equal(
  futureTraceAfterInvalidRuntimeDecode.diagnostics[0].fieldPath,
  'fields.authoritative.activeRuntime.heatCapacityFreeTraceVersion',
);
const futureIdealAfterMalformedRealRecord = structuredClone(
  heatCurrentRecord.value,
);
const futureIdealAfterMalformedRealAuthority =
  futureIdealAfterMalformedRealRecord.projection.fields.authoritative as {
    freeDomains: {
      real: {
        activeRunConfigSnapshot: unknown;
      };
      ideal: {
        batch: Record<string, unknown>;
      };
    };
  };
futureIdealAfterMalformedRealAuthority.freeDomains.real
  .activeRunConfigSnapshot = { malformed: true };
futureIdealAfterMalformedRealAuthority.freeDomains.ideal.batch.version =
  HEAT_CAPACITY_FREE_BATCH_VERSION + 1;
const futureIdealAfterMalformedRealDecode =
  decodeWorkbenchPersistenceV3FileRecord(
    futureIdealAfterMalformedRealRecord,
    8,
  );
assert.equal(futureIdealAfterMalformedRealDecode.ok, false);
if (futureIdealAfterMalformedRealDecode.ok) {
  throw new Error(
    'Expected a projected ideal future to precede malformed real authority.',
  );
}
assert.equal(
  futureIdealAfterMalformedRealDecode.status,
  'unsupported-future',
);
assert.deepEqual(
  futureIdealAfterMalformedRealDecode.raw,
  futureIdealAfterMalformedRealRecord,
);
const futureIdealAfterNonRecordRealRecord = structuredClone(
  heatCurrentRecord.value,
);
const futureIdealAfterNonRecordRealAuthority =
  futureIdealAfterNonRecordRealRecord.projection.fields.authoritative as {
    freeDomains: {
      real: unknown;
      ideal: {
        batch: Record<string, unknown>;
      };
    };
  };
futureIdealAfterNonRecordRealAuthority.freeDomains.real = null;
futureIdealAfterNonRecordRealAuthority.freeDomains.ideal.batch.version =
  HEAT_CAPACITY_FREE_BATCH_VERSION + 1;
const futureIdealAfterNonRecordRealDecode =
  decodeWorkbenchPersistenceV3FileRecord(
    futureIdealAfterNonRecordRealRecord,
    8,
  );
assert.equal(futureIdealAfterNonRecordRealDecode.ok, false);
if (futureIdealAfterNonRecordRealDecode.ok) {
  throw new Error(
    'Expected a projected ideal future to precede a non-record real domain.',
  );
}
assert.equal(
  futureIdealAfterNonRecordRealDecode.status,
  'unsupported-future',
);
assert.deepEqual(
  futureIdealAfterNonRecordRealDecode.raw,
  futureIdealAfterNonRecordRealRecord,
);
const heatLegacyBatchRecord = structuredClone(heatCurrentRecord.value);
const legacyBatchAuthority = heatLegacyBatchRecord.projection.fields
  .authoritative as {
    freeDomains: {
      real: {
        batch: Record<string, unknown>;
        traceStore: Record<string, unknown>;
      };
    };
  };
legacyBatchAuthority.freeDomains.real.batch.version =
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION;
delete legacyBatchAuthority.freeDomains.real.batch.nextTrialSequence;
delete legacyBatchAuthority.freeDomains.real.batch.scoringVersion;
legacyBatchAuthority.freeDomains.real.traceStore.nextTraceTrialIndex = 7;
const migratedHeatBatch = decodeWorkbenchPersistenceV3FileRecord(
  heatLegacyBatchRecord,
  8,
);
if (!migratedHeatBatch.ok) {
  throw new Error(migratedHeatBatch.diagnostics[0].message);
}
assert.equal(migratedHeatBatch.ok, true);
assert.equal(migratedHeatBatch.status, 'migrated');
const migratedHeatAuthority = migratedHeatBatch.value.fields
  .authoritative as {
    freeDomains: {
      real: {
        batch: {
          version: number;
          nextTrialSequence: number;
        };
      };
    };
  };
assert.equal(
  migratedHeatAuthority.freeDomains.real.batch.version,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
);
assert.equal(
  migratedHeatAuthority.freeDomains.real.batch.nextTrialSequence,
  7,
  'V3 migration must retain the trace identity high-water',
);
const migratedHeatEncoded = encodeWorkbenchPersistenceV3FileProjection(
  migratedHeatBatch.value,
  8,
);
if (!migratedHeatEncoded.ok) {
  throw new Error(migratedHeatEncoded.diagnostics[0].message);
}
assert.equal(migratedHeatEncoded.status, 'exact');
const migratedHeatDecodedAgain = decodeWorkbenchPersistenceV3FileRecord(
  migratedHeatEncoded.value,
  8,
);
if (!migratedHeatDecodedAgain.ok) {
  throw new Error(migratedHeatDecodedAgain.diagnostics[0].message);
}
assert.equal(
  migratedHeatDecodedAgain.status,
  'exact',
  'migrated V3 Free aggregates must become exact after canonical encode',
);

const membershipBatchId =
  heatStartedForMigration.heatCapacityFreeRunWorkspace.batch.id;
if (membershipBatchId === null) {
  throw new Error('Expected the V3 membership fixture batch to have an ID.');
}
const membershipTrial = createHeatCapacityFreeTrial(
  'free-trial-1',
  null,
  'real',
  {
    version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
    batchId: membershipBatchId,
    sequence: 1,
  },
);
const membershipBatch = {
  ...heatStartedForMigration.heatCapacityFreeRunWorkspace.batch,
  nextTrialSequence: 2,
};
const membershipCurrentGroup =
  heatStartedForMigration.heatCapacityFreeExperimentGroups.groups.find(
    (group) => (
      group.id ===
        heatStartedForMigration.heatCapacityFreeExperimentGroups.currentGroupId
    ),
  );
if (!membershipCurrentGroup) {
  throw new Error('Expected a current membership experiment group.');
}
const membershipGroups = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
  heatStartedForMigration.heatCapacityFreeExperimentGroups,
  {
    ...membershipCurrentGroup.runSeries,
    batch: membershipBatch,
    trials: [membershipTrial],
  },
);
const membershipFile = {
  ...heatStartedForMigration,
  heatCapacityFreeRunWorkspace: {
    ...heatStartedForMigration.heatCapacityFreeRunWorkspace,
    batch: membershipBatch,
    trials: [membershipTrial],
  },
  heatCapacityFreeExperimentGroups: membershipGroups,
  heatCapacityFreeRealDomain: {
    ...heatStartedForMigration.heatCapacityFreeRealDomain,
    batch: membershipBatch,
    trials: [membershipTrial],
  },
};
const membershipProjection = projectWorkbenchPersistenceV3File(
  membershipFile,
  9,
);
if (!membershipProjection.ok) {
  throw new Error(membershipProjection.diagnostics[0].message);
}
const extraCurrentMembershipCaptureFile = structuredClone(membershipFile);
const extraCurrentMembershipGroup =
  extraCurrentMembershipCaptureFile.heatCapacityFreeExperimentGroups.groups.find(
    (group) => (
      group.id ===
        extraCurrentMembershipCaptureFile.heatCapacityFreeExperimentGroups.currentGroupId
    ),
  );
if (!extraCurrentMembershipGroup) {
  throw new Error('Expected a cloned current membership experiment group.');
}
for (const trial of [
  extraCurrentMembershipCaptureFile.heatCapacityFreeRunWorkspace.trials[0],
  extraCurrentMembershipCaptureFile.heatCapacityFreeRealDomain.trials[0],
  extraCurrentMembershipGroup.runSeries.trials[0],
]) {
  (
    trial.batchMembership as unknown as Record<string, unknown>
  ).opaqueAuthority = 'must-not-drop';
}
const extraCurrentMembershipCapture =
  projectWorkbenchPersistenceV3File(
    extraCurrentMembershipCaptureFile,
    9,
  );
assert.equal(extraCurrentMembershipCapture.ok, false);
if (extraCurrentMembershipCapture.ok) {
  throw new Error('Expected current membership authority quarantine.');
}
assert.equal(extraCurrentMembershipCapture.status, 'quarantined');
assert.deepEqual(
  extraCurrentMembershipCapture.raw,
  extraCurrentMembershipCaptureFile,
);
const membershipRecord = encodeWorkbenchPersistenceV3FileProjection(
  membershipProjection.value,
  9,
);
if (!membershipRecord.ok) {
  throw new Error(membershipRecord.diagnostics[0].message);
}
const futureMembershipRecord = structuredClone(
  membershipRecord.value,
);
const futureMembershipAuthority =
  futureMembershipRecord.projection.fields.authoritative as {
    freeDomains: {
      real: {
        trials: Array<{
          batchMembership: Record<string, unknown>;
        }>;
      };
    };
  };
futureMembershipAuthority.freeDomains.real.trials[0]
  .batchMembership.version =
    HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION + 1;
const futureMembershipDecoded =
  decodeWorkbenchPersistenceV3FileRecord(
    futureMembershipRecord,
    9,
  );
assert.equal(futureMembershipDecoded.ok, false);
if (futureMembershipDecoded.ok) {
  throw new Error('Expected future V3 trial membership preservation.');
}
assert.equal(futureMembershipDecoded.status, 'unsupported-future');
assert.deepEqual(
  futureMembershipDecoded.raw,
  futureMembershipRecord,
);
assert.equal(
  futureMembershipDecoded.diagnostics[0].sourceVersion,
  HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION + 1,
);

const conflictingLegacyMembershipRecord = structuredClone(
  membershipRecord.value,
);
const conflictingMembershipAuthority =
  conflictingLegacyMembershipRecord.projection.fields
    .authoritative as {
      freeDomains: {
        real: {
          batch: Record<string, unknown>;
          trials: Array<{
            batchMembership: Record<string, unknown>;
          }>;
        };
      };
    };
conflictingMembershipAuthority.freeDomains.real.batch.version =
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION;
delete conflictingMembershipAuthority.freeDomains.real.batch
  .nextTrialSequence;
conflictingMembershipAuthority.freeDomains.real.trials[0]
  .batchMembership = {
    version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
    batchId: 'foreign-batch',
    sequence: 777,
  };
const conflictingLegacyMembershipDecoded =
  decodeWorkbenchPersistenceV3FileRecord(
    conflictingLegacyMembershipRecord,
    9,
  );
assert.equal(conflictingLegacyMembershipDecoded.ok, false);
if (conflictingLegacyMembershipDecoded.ok) {
  throw new Error('Expected conflicting legacy membership quarantine.');
}
assert.equal(
  conflictingLegacyMembershipDecoded.status,
  'quarantined',
);
assert.deepEqual(
  conflictingLegacyMembershipDecoded.raw,
  conflictingLegacyMembershipRecord,
);

const extraAuthorityLegacyMembershipRecord = structuredClone(
  membershipRecord.value,
);
const extraAuthorityMembershipAuthority =
  extraAuthorityLegacyMembershipRecord.projection.fields
    .authoritative as {
      freeDomains: {
        real: {
          batch: Record<string, unknown>;
          trials: Array<{
            batchMembership: Record<string, unknown>;
          }>;
        };
      };
    };
extraAuthorityMembershipAuthority.freeDomains.real.batch.version =
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION;
delete extraAuthorityMembershipAuthority.freeDomains.real.batch
  .nextTrialSequence;
extraAuthorityMembershipAuthority.freeDomains.real.trials[0]
  .batchMembership.unexpectedAuthority = 'must-not-drop';
const extraAuthorityLegacyMembershipDecoded =
  decodeWorkbenchPersistenceV3FileRecord(
    extraAuthorityLegacyMembershipRecord,
    9,
  );
assert.equal(extraAuthorityLegacyMembershipDecoded.ok, false);
if (extraAuthorityLegacyMembershipDecoded.ok) {
  throw new Error('Expected extra legacy membership authority quarantine.');
}
assert.equal(
  extraAuthorityLegacyMembershipDecoded.status,
  'quarantined',
);
assert.deepEqual(
  extraAuthorityLegacyMembershipDecoded.raw,
  extraAuthorityLegacyMembershipRecord,
);

const missingHeatAuthorityRecord = structuredClone(
  heatCurrentRecord.value,
);
const missingHeatAuthority = missingHeatAuthorityRecord.projection.fields
  .authoritative as {
    freeDomains: {
      real: Record<string, unknown>;
    };
  };
delete missingHeatAuthority.freeDomains.real.trials;
const missingHeatAuthorityResult =
  decodeWorkbenchPersistenceV3FileRecord(
    missingHeatAuthorityRecord,
    8,
  );
assert.equal(missingHeatAuthorityResult.ok, false);
if (missingHeatAuthorityResult.ok) {
  throw new Error('Expected missing Free authority to quarantine.');
}
assert.equal(missingHeatAuthorityResult.status, 'quarantined');
assert.deepEqual(
  missingHeatAuthorityResult.raw,
  missingHeatAuthorityRecord,
);

const mixedMigrationAndDamageRecord = structuredClone(
  heatLegacyBatchRecord,
);
const damagedMigratingAuthority = mixedMigrationAndDamageRecord.projection
  .fields.authoritative as {
    freeDomains: {
      real: {
        activeAttempt: unknown;
      };
    };
  };
damagedMigratingAuthority.freeDomains.real.activeAttempt = {
  invalid: 'must-not-default-to-null-during-migration',
};
const mixedMigrationAndDamage =
  decodeWorkbenchPersistenceV3FileRecord(
    mixedMigrationAndDamageRecord,
    8,
  );
assert.equal(mixedMigrationAndDamage.ok, false);
if (mixedMigrationAndDamage.ok) {
  throw new Error(
    'Expected unrelated authority damage during batch migration to quarantine.',
  );
}
assert.equal(mixedMigrationAndDamage.status, 'quarantined');
assert.deepEqual(
  mixedMigrationAndDamage.raw,
  mixedMigrationAndDamageRecord,
);

const migrationWithUnknownAuthorityRecord = structuredClone(
  heatLegacyBatchRecord,
);
(
  migrationWithUnknownAuthorityRecord.projection.fields.authoritative
    .activeRuntime as Record<string, unknown>
).unrecognizedAuthority = {
  mustNotBeDropped: true,
};
const migrationWithUnknownAuthority =
  decodeWorkbenchPersistenceV3FileRecord(
    migrationWithUnknownAuthorityRecord,
    8,
  );
assert.equal(migrationWithUnknownAuthority.ok, false);
if (migrationWithUnknownAuthority.ok) {
  throw new Error(
    'Expected unrelated authority beside a supported batch migration to quarantine.',
  );
}
assert.equal(migrationWithUnknownAuthority.status, 'quarantined');
assert.deepEqual(
  migrationWithUnknownAuthority.raw,
  migrationWithUnknownAuthorityRecord,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    heatAuthority.activeRuntime,
    'heatCapacityFreeTrials',
  ),
  false,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    heatAuthority.activeRuntime,
    'heatCapacityFreeTraceStore',
  ),
  false,
);
assert.deepEqual(
  Object.keys(heatAuthority.freeDomains).sort(),
  ['experimentGroups', 'ideal', 'real'],
  'real, ideal, and the multi-group collection are the durable Free authorities',
);

const editedFreeFile = applyHeatCapacityFreeParameterDraftWorkbenchState(
  createDefaultHeatCapacityFile(8),
  {
    ...createDefaultHeatCapacityFile(8).heatCapacityFreeParameterDraft,
    gasType: 'helium',
    ambientTemperatureK: 303.15,
  },
);
const editedFreeProjection = projectWorkbenchPersistenceV3File(
  editedFreeFile,
  8,
);
if (!editedFreeProjection.ok) {
  throw new Error(editedFreeProjection.diagnostics[0].message);
}
const editedFreeReprojected = reprojectWorkbenchPersistenceV3File(
  editedFreeProjection.value,
  8,
);
if (!editedFreeReprojected.ok) {
  throw new Error(editedFreeReprojected.diagnostics[0].message);
}
assert.equal(editedFreeReprojected.value.kind, 'heatCapacity');
if (editedFreeReprojected.value.kind !== 'heatCapacity') {
  throw new Error('Expected a heat-capacity file.');
}
assert.equal(editedFreeReprojected.value.heatCapacityFreeGasType, 'helium');
assert.equal(
  editedFreeReprojected.value.heatCapacityFreeInstrumentConfig.physics.environment
    .ambientTemperatureK,
  303.15,
  'active Free parameter edits must be captured into the selected domain',
);

const guideWithHeliumFreeDomain = {
  ...createDefaultHeatCapacityFile(9),
  heatCapacityMode: 'guide' as const,
  heatCapacityFreeGasType: 'helium' as const,
  theoreticalGamma: 1.4,
};
const guideProjection = projectWorkbenchPersistenceV3File(
  guideWithHeliumFreeDomain,
  9,
);
if (!guideProjection.ok) {
  throw new Error(guideProjection.diagnostics[0].message);
}
const guideReprojected = reprojectWorkbenchPersistenceV3File(
  guideProjection.value,
  9,
);
if (!guideReprojected.ok) {
  throw new Error(guideReprojected.diagnostics[0].message);
}
assert.equal(guideReprojected.value.kind, 'heatCapacity');
if (guideReprojected.value.kind !== 'heatCapacity') {
  throw new Error('Expected a heat-capacity file.');
}
assert.equal(
  guideReprojected.value.theoreticalGamma,
  1.4,
  'an inactive helium Free domain must not overwrite the active Guide gamma',
);

for (const draftFile of [
  {
    ...createDefaultStandardFile(9),
    params: {
      ...createDefaultStandardFile(9).params,
      L: -1,
    },
    runState: 'needs-reset' as const,
  },
  {
    ...createDefaultIdealFile(10),
    params: {
      ...createDefaultIdealFile(10).params,
      L: -1,
    },
    runState: 'needs-reset' as const,
    needsReset: true,
  },
]) {
  const draftProjection = projectWorkbenchPersistenceV3File(draftFile);
  assert.equal(
    draftProjection.ok,
    true,
    'an invalid editable draft must not quarantine valid applied authority',
  );
  if (!draftProjection.ok) continue;
  const draftRuntime = reprojectWorkbenchPersistenceV3File(
    draftProjection.value,
  );
  if (!draftRuntime.ok) throw new Error(draftRuntime.diagnostics[0].message);
  assert.equal(draftRuntime.value.params.L, -1);
  assert.equal(draftRuntime.value.runState, 'needs-reset');
}

const invalidIdleStandard = {
  ...createDefaultStandardFile(40),
  params: {
    ...createDefaultStandardFile(40).params,
    N: 1_001,
  },
  runState: 'idle' as const,
};
const invalidIdleStandardProjection =
  projectWorkbenchPersistenceV3File(invalidIdleStandard, 40);
assert.equal(invalidIdleStandardProjection.ok, false);
if (invalidIdleStandardProjection.ok) {
  throw new Error('Expected invalid idle Standard parameters to quarantine.');
}
assert.equal(invalidIdleStandardProjection.status, 'quarantined');
assert.deepEqual(invalidIdleStandardProjection.raw, invalidIdleStandard);

const invalidIdealDraftWithoutReset = {
  ...createDefaultIdealFile(41),
  params: {
    ...createDefaultIdealFile(41).params,
    L: -1,
  },
  runState: 'needs-reset' as const,
  needsReset: false,
};
const invalidIdealDraftWithoutResetProjection =
  projectWorkbenchPersistenceV3File(invalidIdealDraftWithoutReset, 41);
assert.equal(invalidIdealDraftWithoutResetProjection.ok, false);
if (invalidIdealDraftWithoutResetProjection.ok) {
  throw new Error(
    'Expected an invalid Ideal draft without needsReset to quarantine.',
  );
}
assert.equal(invalidIdealDraftWithoutResetProjection.status, 'quarantined');

const mismatchedIdealAuthorityBase = createDefaultIdealFile(42);
const mismatchedIdealAuthority = {
  ...mismatchedIdealAuthorityBase,
  activeParams: {
    ...mismatchedIdealAuthorityBase.activeParams,
    N: mismatchedIdealAuthorityBase.activeParams.N + 1,
  },
};
const mismatchedIdealAuthorityProjection =
  projectWorkbenchPersistenceV3File(mismatchedIdealAuthority, 42);
assert.equal(mismatchedIdealAuthorityProjection.ok, false);
if (mismatchedIdealAuthorityProjection.ok) {
  throw new Error('Expected mismatched Ideal applied/active authority to quarantine.');
}
assert.equal(mismatchedIdealAuthorityProjection.status, 'quarantined');

const runningStandardProjection = projectWorkbenchPersistenceV3File(
  {
    ...createDefaultStandardFile(43),
    runState: 'running',
  },
  43,
);
assert.equal(runningStandardProjection.ok, true);
if (!runningStandardProjection.ok) {
  throw new Error(runningStandardProjection.diagnostics[0].message);
}
assert.equal(
  (
    runningStandardProjection.value.fields.authoritative.runtimeCheckpoint as
      Record<string, unknown>
  ).runState,
  'paused',
);
assert.equal(
  runningStandardProjection.status,
  'exact',
  'normalizing a running checkpoint to paused must not be reported as cache repair',
);
assert.equal(
  runningStandardProjection.diagnostics.some(
    (diagnostic) => diagnostic.category === 'derived-cache',
  ),
  false,
);

const standardProjection = projectWorkbenchPersistenceV3File(
  createDefaultStandardFile(11),
  11,
);
if (!standardProjection.ok) {
  throw new Error(standardProjection.diagnostics[0].message);
}
const standardEncoded = encodeWorkbenchPersistenceV3FileProjection(
  standardProjection.value,
  11,
);
if (!standardEncoded.ok) {
  throw new Error(standardEncoded.diagnostics[0].message);
}
const damagedCacheRecord = structuredClone(standardEncoded.value);
damagedCacheRecord.projection.fields.derived = {
  stats: {
    phase: 'corrupted-cache',
  },
  chartData: 'not-a-chart',
  particles: 'not-particles',
};
const repairedCache = decodeWorkbenchPersistenceV3FileRecord(
  damagedCacheRecord,
  11,
);
assert.equal(repairedCache.ok, true);
if (!repairedCache.ok) throw new Error(repairedCache.diagnostics[0].message);
assert.equal(repairedCache.status, 'repaired-cache');
assert.deepEqual(
  repairedCache.value.fields.authoritative,
  standardProjection.value.fields.authoritative,
  'cache repair must not alter authoritative data',
);

const brokenRelationshipRecord = structuredClone(standardEncoded.value);
brokenRelationshipRecord.projection.fields.relation.fileId =
  'different-authoritative-id';
const quarantined = decodeWorkbenchPersistenceV3FileRecord(
  brokenRelationshipRecord,
  11,
);
assert.equal(quarantined.ok, false);
if (quarantined.ok) throw new Error('Expected a quarantined relationship.');
assert.equal(quarantined.status, 'quarantined');
assert.equal(quarantined.diagnostics[0].category, 'relationship');
assert.deepEqual(quarantined.raw, brokenRelationshipRecord);

const damagedStandardAuthorityRecord = structuredClone(standardEncoded.value);
damagedStandardAuthorityRecord.projection.fields.authoritative.finalChartData = {
  not: 'chart-data',
};
const damagedStandardAuthority = decodeWorkbenchPersistenceV3FileRecord(
  damagedStandardAuthorityRecord,
  11,
);
assert.equal(damagedStandardAuthority.ok, false);
if (damagedStandardAuthority.ok) {
  throw new Error('Expected damaged Standard finalChartData to quarantine.');
}
assert.equal(damagedStandardAuthority.status, 'quarantined');
assert.deepEqual(damagedStandardAuthority.raw, damagedStandardAuthorityRecord);

const idealProjection = projectWorkbenchPersistenceV3File(
  createDefaultIdealFile(44),
  44,
);
if (!idealProjection.ok) {
  throw new Error(idealProjection.diagnostics[0].message);
}
const idealEncoded = encodeWorkbenchPersistenceV3FileProjection(
  idealProjection.value,
  44,
);
if (!idealEncoded.ok) {
  throw new Error(idealEncoded.diagnostics[0].message);
}
const damagedIdealPointsRecord = structuredClone(idealEncoded.value);
damagedIdealPointsRecord.projection.fields.authoritative.pointsByRelation = {
  pt: 'not-points',
};
const damagedIdealPoints = decodeWorkbenchPersistenceV3FileRecord(
  damagedIdealPointsRecord,
  44,
);
assert.equal(damagedIdealPoints.ok, false);
if (damagedIdealPoints.ok) {
  throw new Error('Expected damaged Ideal pointsByRelation to quarantine.');
}
assert.equal(damagedIdealPoints.status, 'quarantined');
assert.deepEqual(damagedIdealPoints.raw, damagedIdealPointsRecord);

const pistonProjection = projectWorkbenchPersistenceV3File(
  createDefaultHeatCapacityPistonOscillationFile(45),
  45,
);
if (!pistonProjection.ok) {
  throw new Error(pistonProjection.diagnostics[0].message);
}
const pistonEncoded = encodeWorkbenchPersistenceV3FileProjection(
  pistonProjection.value,
  45,
);
if (!pistonEncoded.ok) {
  throw new Error(pistonEncoded.diagnostics[0].message);
}
const futurePistonAuthorityRecord = structuredClone(pistonEncoded.value);
futurePistonAuthorityRecord.projection.fields.authoritative
  .pistonOscillationSchemaVersion = 999;
const futurePistonAuthority = decodeWorkbenchPersistenceV3FileRecord(
  futurePistonAuthorityRecord,
  45,
);
assert.equal(futurePistonAuthority.ok, false);
if (futurePistonAuthority.ok) {
  throw new Error('Expected future Piston authority to be preserved.');
}
assert.equal(futurePistonAuthority.status, 'unsupported-future');
assert.deepEqual(futurePistonAuthority.raw, futurePistonAuthorityRecord);

const createPersistencePistonMeasurement = (
  measurementIndex: 0 | 1 | 2,
  targetHeightMm: number,
  periodSampleCount: number,
) => {
  const samples: PistonOscillationRawSample[] = Array.from(
    { length: 2_001 },
    (_, sampleIndex) => ({
      sampleIndex,
      timeS: sampleIndex / 1_000,
      absolutePressureKpa: Math.trunc((
        101.32 + 6 * Math.exp(-sampleIndex / 500)
          * Math.cos(2 * Math.PI * sampleIndex / periodSampleCount)
      ) * 100) / 100,
    }),
  );
  const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
    lockedHeightMm: targetHeightMm,
    sampleRateHz: 1_000,
    samples,
  });
  return createPistonOscillationRawMeasurementRecord({
    recordId: `persistence-guide-${measurementIndex}`,
    capturedAtMs: 10_500 + measurementIndex,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm: artifacts.confirmedHeightMm,
    sampleRateHz: 1000,
    triggerThresholdKpa: 105,
    recordedDurationS: 2,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
    samples,
    pressOperationEvidence: artifacts.pressOperationEvidence,
    sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
    physicsSnapshot: artifacts.physicsSnapshot,
  });
};
const pistonGuideMeasurements = [
  createPersistencePistonMeasurement(0, 80, 40),
  createPersistencePistonMeasurement(1, 70, 36),
  createPersistencePistonMeasurement(2, 60, 32),
];

const completePersistencePistonProcessing = () => {
  let processing = createPistonOscillationDataProcessingSession(
    pistonGuideMeasurements,
    10_500,
  );
  for (let runIndex = 0; runIndex < processing.runs.length; runIndex += 1) {
    const extrema = findPistonOscillationExtrema(
      pistonGuideMeasurements[runIndex]!.samples,
    );
    const left = extrema[2];
    const right = extrema[8];
    assert.ok(left && right, 'test record must expose at least three periods');
    processing = selectPistonOscillationPeriodRange(
      processing,
      pistonGuideMeasurements,
      runIndex,
      left.timeS,
      right.timeS,
      3,
      10_600 + runIndex * 100,
    );
    const selection = processing.runs[runIndex]!.selection;
    assert.equal(selection?.issue, null);
    assert.ok(selection?.leftEndpoint && selection.rightEndpoint);
    processing = updatePistonOscillationPeriodAnswerDraft(
      processing,
      runIndex,
      't1',
      formatPistonOscillationEndpointTime(selection.leftEndpoint.timeS),
      10_610 + runIndex * 100,
    );
    processing = updatePistonOscillationPeriodAnswerDraft(
      processing,
      runIndex,
      't2',
      formatPistonOscillationEndpointTime(selection.rightEndpoint.timeS),
      10_620 + runIndex * 100,
    );
    processing = submitPistonOscillationPeriodEndpoints(
      processing,
      runIndex,
      10_630 + runIndex * 100,
    );
    const expectedPeriod = processing.runs[runIndex]!.answers.period.expectedValue;
    assert.notEqual(expectedPeriod, null);
    processing = updatePistonOscillationPeriodAnswerDraft(
      processing,
      runIndex,
      'period',
      formatPistonOscillationPeriod(expectedPeriod!),
      10_640 + runIndex * 100,
    );
    processing = submitPistonOscillationPeriod(
      processing,
      runIndex,
      10_650 + runIndex * 100,
    );
    assert.ok(processing.runs[runIndex]!.result);
    processing = advancePistonOscillationPeriodRun(
      processing,
      10_660 + runIndex * 100,
      pistonGuideMeasurements,
    );
  }
  for (let runIndex = 0; runIndex < processing.runs.length; runIndex += 1) {
    processing = togglePistonOscillationFitRun(
      processing,
      runIndex,
      11_000 + runIndex,
    );
  }
  processing = submitPistonOscillationLinearFit(
    processing,
    11_100,
    { requireAllRuns: true },
  );
  assert.ok(processing.linearFitResult);
  assert.ok(processing.calculationSession?.answers.gamma.expectedValue);
  return processing satisfies PistonOscillationDataProcessingSession;
};
const pistonGuideDataProcessing = completePersistencePistonProcessing();

let pistonGuideFile = createDefaultHeatCapacityPistonOscillationFile(451);
pistonGuideFile = startPistonOscillationGuideWorkbenchState(pistonGuideFile, 10_000);
pistonGuideFile = editPistonOscillationGuideParameterWorkbenchState(
  pistonGuideFile,
  'sampleRateHz',
  '1000',
  10_100,
);
pistonGuideFile = commitPistonOscillationGuideParameterWorkbenchState(
  pistonGuideFile,
  'sampleRateHz',
  10_200,
);
pistonGuideFile = editPistonOscillationGuideParameterWorkbenchState(
  pistonGuideFile,
  'triggerThresholdKpa',
  '105',
  10_300,
);
pistonGuideFile = commitPistonOscillationGuideParameterWorkbenchState(
  pistonGuideFile,
  'triggerThresholdKpa',
  10_400,
);
pistonGuideFile = {
  ...pistonGuideFile,
  pistonOscillationGuideSession: {
    ...pistonGuideFile.pistonOscillationGuideSession,
    status: 'active',
    measurementIndex: 2,
    step: 'calculationReady',
    updatedAtMs: 10_500,
    acquisitionCandidate: null,
    savedMeasurements: pistonGuideMeasurements,
    dataProcessing: pistonGuideDataProcessing,
  },
};
const pistonGuideProjection = projectWorkbenchPersistenceV3File(pistonGuideFile, 451);
if (!pistonGuideProjection.ok) {
  throw new Error(pistonGuideProjection.diagnostics[0].message);
}
assert.equal(pistonGuideProjection.status, 'exact');
assert.equal(
  pistonGuideProjection.value.fields.authoritative
    .pistonGuideSessionProjectionVersion,
  PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION,
);
const pistonGuideAuthority = pistonGuideProjection.value.fields.authoritative
  .guideSession as {
    savedMeasurements: Array<{
      sensorObservationSnapshot: {
        sampleRateHz: number;
        pressureResolutionKpa: number;
        pressureQuantization: string;
      };
    }>;
    dataProcessing: {
      processingPolicy: {
        policyVersion: string;
        guidedMinimumPeriodCount: number;
      };
      runs: Array<{
        selection: {
          leftEndpoint: { sampleIndex: number };
          rightEndpoint: { sampleIndex: number };
          extrema?: unknown;
          periodCount?: unknown;
        };
        result: {
          leftSampleIndex: number;
          rightSampleIndex: number;
          periodS?: unknown;
          periodSquaredS2?: unknown;
        };
      }>;
      linearFitResult: {
        algorithmVersion: string;
        selectedRunIndices: number[];
        slopeMPerS2?: unknown;
      };
    };
  };
assert.deepEqual(
  pistonGuideAuthority.savedMeasurements[0]!.sensorObservationSnapshot,
  pistonGuideMeasurements[0]!.sensorObservationSnapshot,
  'formal sensor-observation policy must be authoritative',
);
assert.deepEqual(
  pistonGuideAuthority.dataProcessing.processingPolicy,
  pistonGuideDataProcessing.processingPolicy,
  'the versioned period-selection policy must be authoritative',
);
assert.deepEqual(
  pistonGuideAuthority.dataProcessing.runs.map((run) => ({
    selection: [
      run.selection.leftEndpoint.sampleIndex,
      run.selection.rightEndpoint.sampleIndex,
    ],
    result: [run.result.leftSampleIndex, run.result.rightSampleIndex],
  })),
  pistonGuideDataProcessing.runs.map((run) => ({
    selection: [
      run.selection!.leftEndpoint!.sampleIndex,
      run.selection!.rightEndpoint!.sampleIndex,
    ],
    result: [run.result!.leftSampleIndex, run.result!.rightSampleIndex],
  })),
  'endpoint sample indices must remain authoritative for selection and result recovery',
);
assert.equal(
  Object.hasOwn(pistonGuideAuthority.dataProcessing.runs[0]!.selection, 'extrema'),
  false,
);
assert.equal(
  Object.hasOwn(pistonGuideAuthority.dataProcessing.runs[0]!.selection, 'periodCount'),
  false,
);
assert.equal(
  Object.hasOwn(pistonGuideAuthority.dataProcessing.runs[0]!.result, 'periodS'),
  false,
);
assert.equal(
  pistonGuideAuthority.dataProcessing.linearFitResult.algorithmVersion,
  pistonGuideDataProcessing.linearFitResult!.algorithmVersion,
  'the fit algorithm version must remain authoritative across recovery',
);
assert.equal(
  Object.hasOwn(
    pistonGuideAuthority.dataProcessing.runs[0]!.result,
    'periodSquaredS2',
  ),
  false,
);
assert.equal(
  Object.hasOwn(
    pistonGuideAuthority.dataProcessing.linearFitResult,
    'slopeMPerS2',
  ),
  false,
);
const pistonGuideDerivedCache = pistonGuideProjection.value.fields.derived
  .pistonGuideDataProcessingCache as {
    cacheVersion: number;
    dataProcessing: PistonOscillationDataProcessingSession;
  };
assert.equal(pistonGuideDerivedCache.cacheVersion, 1);
assert.deepEqual(
  pistonGuideDerivedCache.dataProcessing,
  pistonGuideDataProcessing,
  'recomputable period, fit, and calculation values belong to the derived cache',
);
const pistonGuideEncoded = encodeWorkbenchPersistenceV3FileProjection(
  pistonGuideProjection.value,
  451,
);
if (!pistonGuideEncoded.ok) {
  throw new Error(pistonGuideEncoded.diagnostics[0].message);
}
const pistonGuideDecoded = decodeWorkbenchPersistenceV3FileRecord(
  structuredClone(pistonGuideEncoded.value),
  451,
);
if (!pistonGuideDecoded.ok) {
  throw new Error(pistonGuideDecoded.diagnostics[0].message);
}
assert.equal(pistonGuideDecoded.status, 'exact');
const pistonGuideReprojected = reprojectWorkbenchPersistenceV3File(
  pistonGuideDecoded.value,
  451,
);
if (!pistonGuideReprojected.ok) {
  throw new Error(pistonGuideReprojected.diagnostics[0].message);
}
assert.equal(pistonGuideReprojected.value.kind, 'heatCapacityPistonOscillation');
if (pistonGuideReprojected.value.kind !== 'heatCapacityPistonOscillation') {
  throw new Error('Expected Piston guide file reprojection.');
}
assert.deepEqual(
  pistonGuideReprojected.value.pistonOscillationGuideSession,
  pistonGuideFile.pistonOscillationGuideSession,
  'Piston guide drafts, processing state, and all three recorded curves must survive V3 persistence',
);
assert.deepEqual(
  pistonGuideReprojected.value.pistonOscillationFreeSession,
  pistonGuideFile.pistonOscillationFreeSession,
  'an independent empty Free Mode session must survive alongside Guide Mode state',
);

const legacyBaselinePistonProjection = structuredClone(pistonGuideProjection.value);
const legacyBaselineGuide = legacyBaselinePistonProjection.fields.authoritative
  .guideSession as unknown as Record<string, unknown>;
legacyBaselineGuide.status = 'active';
legacyBaselineGuide.measurementIndex = 0;
legacyBaselineGuide.step = 'baselineStabilizing';
legacyBaselineGuide.savedMeasurements = [];
legacyBaselineGuide.dataProcessing = null;
const reprojectedLegacyBaseline = reprojectWorkbenchPersistenceV3File(
  legacyBaselinePistonProjection,
  451,
);
if (!reprojectedLegacyBaseline.ok) {
  throw new Error(reprojectedLegacyBaseline.diagnostics[0].message);
}
assert.equal(reprojectedLegacyBaseline.value.kind, 'heatCapacityPistonOscillation');
if (reprojectedLegacyBaseline.value.kind !== 'heatCapacityPistonOscillation') {
  throw new Error('Expected legacy baseline Piston guide file reprojection.');
}
assert.equal(
  reprojectedLegacyBaseline.value.pistonOscillationGuideSession.step,
  'acquisitionReady',
  'V3 restore must migrate the removed baseline checkpoint to the visible Start step',
);

const legacyCrossRunPistonProjection = structuredClone(legacyBaselinePistonProjection);
const legacyCrossRunGuide = legacyCrossRunPistonProjection.fields.authoritative
  .guideSession as unknown as Record<string, unknown>;
legacyCrossRunGuide.measurementIndex = 1;
legacyCrossRunGuide.step = 'crossRunStabilizing';
const reprojectedLegacyCrossRun = reprojectWorkbenchPersistenceV3File(
  legacyCrossRunPistonProjection,
  451,
);
if (!reprojectedLegacyCrossRun.ok) {
  throw new Error(reprojectedLegacyCrossRun.diagnostics[0].message);
}
assert.equal(reprojectedLegacyCrossRun.value.kind, 'heatCapacityPistonOscillation');
if (reprojectedLegacyCrossRun.value.kind !== 'heatCapacityPistonOscillation') {
  throw new Error('Expected legacy between-run Piston guide file reprojection.');
}
assert.equal(
  reprojectedLegacyCrossRun.value.pistonOscillationGuideSession.step,
  'crossRunDisconnect',
  'V3 restore must migrate the removed between-run checkpoint to the next visible operation',
);

const doubleActivePistonProjection = structuredClone(pistonGuideProjection.value);
doubleActivePistonProjection.fields.authoritative.freeSession =
  startPistonOscillationFreeWorkbenchState(
    createDefaultHeatCapacityPistonOscillationFile(452),
    10_600,
  ).pistonOscillationFreeSession;
const repairedDoubleActivePiston = reprojectWorkbenchPersistenceV3File(
  doubleActivePistonProjection,
  452,
);
if (!repairedDoubleActivePiston.ok) {
  throw new Error(repairedDoubleActivePiston.diagnostics[0].message);
}
assert.equal(repairedDoubleActivePiston.status, 'repaired-cache');
assert.equal(repairedDoubleActivePiston.value.kind, 'heatCapacityPistonOscillation');
if (repairedDoubleActivePiston.value.kind !== 'heatCapacityPistonOscillation') {
  throw new Error('Expected repaired double-active Piston projection.');
}
assert.equal(
  repairedDoubleActivePiston.value.pistonOscillationGuideSession.status,
  'active',
);
assert.equal(
  repairedDoubleActivePiston.value.pistonOscillationFreeSession.status,
  'paused',
);
assert.equal(
  repairedDoubleActivePiston.value.pistonOscillationFreeSession.startedAtMs,
  10_600,
  'V3 mode repair must preserve the suspended Free session progress',
);
assert.deepEqual(
  repairedDoubleActivePiston.diagnostics.map((diagnostic) => ({
    category: diagnostic.category,
    code: diagnostic.code,
    recovery: diagnostic.recovery,
    fieldPath: diagnostic.fieldPath,
    mode: diagnostic.mode,
  })),
  [{
    category: 'relationship',
    code: 'persistence-v3-piston-mode-exclusivity-repaired',
    recovery: 'none',
    fieldPath: 'fields.authoritative.freeSession.status',
    mode: 'free',
  }],
  'V3 mode repair must report a relationship repair rather than a derived-cache rebuild',
);
assert.deepEqual(
  pistonGuideReprojected.value.pistonOscillationGuideSession.savedMeasurements.map(
    (measurement) => ({
      targetHeightMm: measurement.targetHeightMm,
      sampleCount: measurement.samples.length,
    }),
  ),
  [
    { targetHeightMm: 80, sampleCount: 2_001 },
    { targetHeightMm: 70, sampleCount: 2_001 },
    { targetHeightMm: 60, sampleCount: 2_001 },
  ],
  'the persisted measurement contract must remain independent of the physics producer',
);

const legacyPistonGuideRecord = structuredClone(pistonGuideEncoded.value);
delete legacyPistonGuideRecord.projection.fields.authoritative
  .pistonGuideSessionProjectionVersion;
delete legacyPistonGuideRecord.projection.fields.authoritative
  .lessonIntroAutoShown;
legacyPistonGuideRecord.projection.fields.authoritative.guideSession =
  structuredClone(pistonGuideFile.pistonOscillationGuideSession);
legacyPistonGuideRecord.projection.fields.derived = {};
const migratedPistonGuide = decodeWorkbenchPersistenceV3FileRecord(
  legacyPistonGuideRecord,
  451,
);
if (!migratedPistonGuide.ok) {
  throw new Error(migratedPistonGuide.diagnostics[0].message);
}
assert.equal(
  migratedPistonGuide.status,
  'migrated',
  'legacy V3 projections with a complete guide session must migrate to split authority/cache fields',
);
assert.equal(
  migratedPistonGuide.value.fields.authoritative
    .pistonGuideSessionProjectionVersion,
  PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION,
);

const version531PistonRecord = structuredClone(pistonGuideEncoded.value);
const version531Authority = version531PistonRecord.projection.fields
  .authoritative;
version531PistonRecord.projection.fields.authoritative = {
  metadata: structuredClone(version531Authority.metadata),
  pistonOscillationSchemaVersion:
    version531Authority.pistonOscillationSchemaVersion,
};
version531PistonRecord.projection.fields.derived = {};
delete version531PistonRecord.projection.fields.uiCheckpoint
  .pistonOscillationOperationVisualizationEnabled;
delete version531PistonRecord.projection.fields.uiCheckpoint
  .pistonOscillationMaterialsExpanded;
const migratedVersion531Piston = decodeWorkbenchPersistenceV3FileRecord(
  version531PistonRecord,
  451,
);
if (!migratedVersion531Piston.ok) {
  throw new Error(migratedVersion531Piston.diagnostics[0].message);
}
assert.equal(
  migratedVersion531Piston.status,
  'migrated',
  'the exact pre-guide v5.3.1 piston authority must migrate without file loss',
);
const migratedVersion531File = reprojectWorkbenchPersistenceV3File(
  migratedVersion531Piston.value,
  451,
);
if (!migratedVersion531File.ok) {
  throw new Error(migratedVersion531File.diagnostics[0].message);
}
assert.equal(
  migratedVersion531File.value.kind,
  'heatCapacityPistonOscillation',
);
if (migratedVersion531File.value.kind !== 'heatCapacityPistonOscillation') {
  throw new Error('Expected the v5.3.1 Piston file to survive migration.');
}
assert.equal(migratedVersion531File.value.name, pistonGuideFile.name);
assert.equal(migratedVersion531File.value.pistonOscillationDemoSession.status, 'idle');
assert.equal(migratedVersion531File.value.pistonOscillationGuideSession.status, 'idle');

const versionTwoPistonGuideRecord = structuredClone(pistonGuideEncoded.value);
versionTwoPistonGuideRecord.projection.fields.authoritative
  .pistonGuideSessionProjectionVersion = 2;
delete (versionTwoPistonGuideRecord.projection.fields.authoritative
  .guideSession as Record<string, unknown>).completionExited;
const migratedVersionTwoPistonGuide = decodeWorkbenchPersistenceV3FileRecord(
  versionTwoPistonGuideRecord,
  451,
);
if (!migratedVersionTwoPistonGuide.ok) {
  throw new Error(migratedVersionTwoPistonGuide.diagnostics[0].message);
}
assert.equal(migratedVersionTwoPistonGuide.status, 'migrated');
assert.equal(
  migratedVersionTwoPistonGuide.value.fields.authoritative
    .pistonGuideSessionProjectionVersion,
  PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION,
  'projection v2 must migrate the completed-exit state explicitly',
);
const migratedVersionTwoFile = reprojectWorkbenchPersistenceV3File(
  migratedVersionTwoPistonGuide.value,
  451,
);
if (!migratedVersionTwoFile.ok) {
  throw new Error(migratedVersionTwoFile.diagnostics[0].message);
}
assert.equal(migratedVersionTwoFile.value.kind, 'heatCapacityPistonOscillation');
if (migratedVersionTwoFile.value.kind !== 'heatCapacityPistonOscillation') {
  throw new Error('Expected migrated Piston guide file.');
}
assert.equal(
  migratedVersionTwoFile.value.pistonOscillationGuideSession.completionExited,
  false,
);

const versionOnePistonGuideRecord = structuredClone(pistonGuideEncoded.value);
versionOnePistonGuideRecord.projection.fields.authoritative
  .pistonGuideSessionProjectionVersion = 1;
const versionOneGuideSession = versionOnePistonGuideRecord.projection.fields
  .authoritative.guideSession as {
    dataProcessing: { linearFitResult: Record<string, unknown> };
  };
delete versionOneGuideSession.dataProcessing.linearFitResult.algorithmVersion;
const migratedVersionOnePistonGuide = decodeWorkbenchPersistenceV3FileRecord(
  versionOnePistonGuideRecord,
  451,
);
if (!migratedVersionOnePistonGuide.ok) {
  throw new Error(migratedVersionOnePistonGuide.diagnostics[0].message);
}
assert.equal(migratedVersionOnePistonGuide.status, 'migrated');
assert.equal(
  migratedVersionOnePistonGuide.value.fields.authoritative
    .pistonGuideSessionProjectionVersion,
  PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION,
  'projection v1 must migrate explicitly to the versioned fit authority contract',
);

const tamperedPistonGuideRecord = structuredClone(pistonGuideEncoded.value);
const tamperedPistonGuideCache = tamperedPistonGuideRecord.projection.fields
  .derived.pistonGuideDataProcessingCache as {
    dataProcessing: PistonOscillationDataProcessingSession;
  };
tamperedPistonGuideCache.dataProcessing.runs[0]!.result!.periodS = 99;
tamperedPistonGuideCache.dataProcessing.runs[0]!.result!.periodSquaredS2 = 9_801;
tamperedPistonGuideCache.dataProcessing.linearFitResult!.slopeMPerS2 = 123_456;
tamperedPistonGuideCache.dataProcessing.linearFitResult!.rSquared = -99;
tamperedPistonGuideCache.dataProcessing.calculationSession!.answers.gamma
  .expectedValue = 987;
const repairedPistonGuide = decodeWorkbenchPersistenceV3FileRecord(
  tamperedPistonGuideRecord,
  451,
);
if (!repairedPistonGuide.ok) {
  throw new Error(repairedPistonGuide.diagnostics[0].message);
}
assert.equal(repairedPistonGuide.status, 'repaired-cache');
assert.ok(repairedPistonGuide.diagnostics.some((diagnostic) => (
  diagnostic.category === 'derived-cache'
  && diagnostic.recovery === 'recompute-derived'
)));
const repairedPistonGuideFile = reprojectWorkbenchPersistenceV3File(
  repairedPistonGuide.value,
  451,
);
if (!repairedPistonGuideFile.ok) {
  throw new Error(repairedPistonGuideFile.diagnostics[0].message);
}
assert.equal(repairedPistonGuideFile.value.kind, 'heatCapacityPistonOscillation');
if (repairedPistonGuideFile.value.kind !== 'heatCapacityPistonOscillation') {
  throw new Error('Expected repaired Piston guide file reprojection.');
}
const repairedProcessing = repairedPistonGuideFile.value
  .pistonOscillationGuideSession.dataProcessing;
assert.ok(repairedProcessing?.linearFitResult);
assert.deepEqual(
  repairedProcessing!.runs.map((run) => ({
    leftSampleIndex: run.result?.leftSampleIndex,
    rightSampleIndex: run.result?.rightSampleIndex,
    periodS: run.result?.periodS,
    periodSquaredS2: run.result?.periodSquaredS2,
  })),
  pistonGuideDataProcessing.runs.map((run) => ({
    leftSampleIndex: run.result?.leftSampleIndex,
    rightSampleIndex: run.result?.rightSampleIndex,
    periodS: run.result?.periodS,
    periodSquaredS2: run.result?.periodSquaredS2,
  })),
  'T and T-squared must be recalculated from authoritative endpoint sample indices',
);
assert.deepEqual(
  repairedProcessing!.linearFitResult,
  pistonGuideDataProcessing.linearFitResult,
  'linear fit must be recalculated after restoring period results',
);
assert.equal(
  repairedProcessing!.calculationSession!.answers.gamma.expectedValue,
  pistonGuideDataProcessing.calculationSession!.answers.gamma.expectedValue,
  'gamma must be recalculated from the restored fit rather than trusted from cache',
);

const heatModeProjection = projectWorkbenchPersistenceV3File(
  createDefaultHeatCapacityFile(46),
  46,
);
if (!heatModeProjection.ok) {
  throw new Error(heatModeProjection.diagnostics[0].message);
}
const heatModeEncoded = encodeWorkbenchPersistenceV3FileProjection(
  heatModeProjection.value,
  46,
);
if (!heatModeEncoded.ok) {
  throw new Error(heatModeEncoded.diagnostics[0].message);
}
const invalidModeSessionSlotRecord = structuredClone(heatModeEncoded.value);
const invalidModeSessionSlots = invalidModeSessionSlotRecord.projection.fields
  .authoritative.modeSessions as Record<string, unknown>;
invalidModeSessionSlots.guide = {
  status: 'suspended',
  resumeRunState: 'idle',
  capturedAtMs: null,
  snapshot: null,
  uiCheckpoint: null,
};
const invalidModeSessionSlot = decodeWorkbenchPersistenceV3FileRecord(
  invalidModeSessionSlotRecord,
  46,
);
assert.equal(invalidModeSessionSlot.ok, false);
if (invalidModeSessionSlot.ok) {
  throw new Error('Expected an invalid Heat mode-session slot to quarantine.');
}
assert.equal(invalidModeSessionSlot.status, 'quarantined');
assert.deepEqual(invalidModeSessionSlot.raw, invalidModeSessionSlotRecord);

const suspendedHeatFile = suspendHeatCapacityModeSession(
  createDefaultHeatCapacityFile(47),
  null,
  Date.now(),
);
const suspendedHeatProjection = projectWorkbenchPersistenceV3File(
  suspendedHeatFile,
  47,
);
if (!suspendedHeatProjection.ok) {
  throw new Error(suspendedHeatProjection.diagnostics[0].message);
}
const downgradeSuspendedFreeBatches = (
  modeSessions: Record<string, unknown>,
) => {
  const freeEntry = modeSessions.free as {
    snapshot: {
      free: {
        heatCapacityFreeBatch: Record<string, unknown>;
        heatCapacityFreeRealDomain: {
          batch: Record<string, unknown>;
        };
      };
    } | null;
  };
  if (freeEntry.snapshot === null) {
    throw new Error('Expected a suspended Free snapshot for v1 migration.');
  }
  const topBatch = structuredClone(
    freeEntry.snapshot.free.heatCapacityFreeBatch,
  );
  topBatch.version = HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION;
  delete topBatch.nextTrialSequence;
  delete topBatch.scoringVersion;
  const domainBatch = structuredClone(
    freeEntry.snapshot.free.heatCapacityFreeRealDomain.batch,
  );
  domainBatch.version = HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION;
  delete domainBatch.nextTrialSequence;
  delete domainBatch.scoringVersion;
  freeEntry.snapshot.free.heatCapacityFreeBatch = topBatch;
  freeEntry.snapshot.free.heatCapacityFreeRealDomain.batch = domainBatch;
};
const suspendedLegacyBatchFile = structuredClone(suspendedHeatFile);
downgradeSuspendedFreeBatches(
  suspendedLegacyBatchFile.heatCapacityModeSessions as unknown as
    Record<string, unknown>,
);
const migratedSuspendedLegacyBatch =
  projectWorkbenchPersistenceV3File(
    suspendedLegacyBatchFile,
    47,
  );
if (!migratedSuspendedLegacyBatch.ok) {
  throw new Error(migratedSuspendedLegacyBatch.diagnostics[0].message);
}
assert.equal(migratedSuspendedLegacyBatch.status, 'migrated');
const migratedSuspendedSessions =
  migratedSuspendedLegacyBatch.value.fields.authoritative
    .modeSessions as {
      free: {
        snapshot: {
          free: {
            heatCapacityFreeBatch: {
              version: number;
              nextTrialSequence: number;
            };
          };
        } | null;
      };
    };
assert.equal(
  migratedSuspendedSessions.free.snapshot?.free
    .heatCapacityFreeBatch.version,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
);
assert.equal(
  migratedSuspendedSessions.free.snapshot?.free
    .heatCapacityFreeBatch.nextTrialSequence,
  1,
);
const opaqueSuspendedLegacyBatchFile = structuredClone(
  suspendedLegacyBatchFile,
);
const opaqueSuspendedSessions =
  opaqueSuspendedLegacyBatchFile.heatCapacityModeSessions as unknown as {
    free: {
      snapshot: {
        free: {
          heatCapacityFreeBatch: Record<string, unknown>;
        };
      } | null;
    };
  };
if (opaqueSuspendedSessions.free.snapshot === null) {
  throw new Error('Expected an opaque suspended v1 batch fixture.');
}
opaqueSuspendedSessions.free.snapshot.free.heatCapacityFreeBatch
  .opaqueAuthority = true;
const opaqueSuspendedLegacyBatch =
  projectWorkbenchPersistenceV3File(
    opaqueSuspendedLegacyBatchFile,
    47,
  );
assert.equal(opaqueSuspendedLegacyBatch.ok, false);
if (opaqueSuspendedLegacyBatch.ok) {
  throw new Error('Expected opaque suspended v1 batch quarantine.');
}
assert.equal(opaqueSuspendedLegacyBatch.status, 'quarantined');

const suspendedLegacyBatchRecord =
  encodeWorkbenchPersistenceV3FileProjection(
    suspendedHeatProjection.value,
    47,
  );
if (!suspendedLegacyBatchRecord.ok) {
  throw new Error(suspendedLegacyBatchRecord.diagnostics[0].message);
}
const rawSuspendedLegacyBatchRecord = structuredClone(
  suspendedLegacyBatchRecord.value,
);
downgradeSuspendedFreeBatches(
  rawSuspendedLegacyBatchRecord.projection.fields.authoritative
    .modeSessions as Record<string, unknown>,
);
const decodedSuspendedLegacyBatch =
  decodeWorkbenchPersistenceV3FileRecord(
    rawSuspendedLegacyBatchRecord,
    47,
  );
if (!decodedSuspendedLegacyBatch.ok) {
  throw new Error(decodedSuspendedLegacyBatch.diagnostics[0].message);
}
assert.equal(decodedSuspendedLegacyBatch.status, 'migrated');
const futureSuspendedSnapshotFile = structuredClone(suspendedHeatFile);
const futureSuspendedSnapshot = futureSuspendedSnapshotFile
  .heatCapacityModeSessions.free.snapshot as unknown as Record<string, unknown>;
futureSuspendedSnapshot.schemaVersion =
  HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION + 1;
const futureSuspendedSnapshotProjection =
  projectWorkbenchPersistenceV3File(futureSuspendedSnapshotFile, 47);
assert.equal(futureSuspendedSnapshotProjection.ok, false);
if (futureSuspendedSnapshotProjection.ok) {
  throw new Error('Expected a future suspended snapshot to remain raw.');
}
assert.equal(
  futureSuspendedSnapshotProjection.status,
  'unsupported-future',
);
assert.deepEqual(
  futureSuspendedSnapshotProjection.raw,
  futureSuspendedSnapshotFile,
);
assert.equal(
  futureSuspendedSnapshotProjection.diagnostics[0].fieldPath,
  'heatCapacityModeSessions.free.snapshot.schemaVersion',
);

const futureSuspendedRuntimeFile = structuredClone(suspendedHeatFile);
const futureSuspendedRuntimeSnapshot = futureSuspendedRuntimeFile
  .heatCapacityModeSessions.free.snapshot as unknown as {
    free: Record<string, unknown>;
  };
futureSuspendedRuntimeSnapshot.free.heatCapacityFreeRuntimeVersion =
  HEAT_CAPACITY_FREE_RUNTIME_VERSION + 1;
const futureSuspendedRuntimeProjection =
  projectWorkbenchPersistenceV3File(futureSuspendedRuntimeFile, 47);
assert.equal(futureSuspendedRuntimeProjection.ok, false);
if (futureSuspendedRuntimeProjection.ok) {
  throw new Error('Expected a future suspended Free runtime to remain raw.');
}
assert.equal(
  futureSuspendedRuntimeProjection.status,
  'unsupported-future',
);
assert.deepEqual(
  futureSuspendedRuntimeProjection.raw,
  futureSuspendedRuntimeFile,
);
assert.equal(
  futureSuspendedRuntimeProjection.diagnostics[0].fieldPath,
  'heatCapacityModeSessions.free.snapshot.free.heatCapacityFreeRuntimeVersion',
);
const futureSuspendedRuntimeWithMalformedDomain = structuredClone(
  futureSuspendedRuntimeFile,
);
futureSuspendedRuntimeWithMalformedDomain.heatCapacityFreeRealDomain
  .activeRunConfigSnapshot = { malformed: true } as never;
const futureSuspendedRuntimeBeforeMalformedDomain =
  projectWorkbenchPersistenceV3File(
    futureSuspendedRuntimeWithMalformedDomain,
    47,
  );
assert.equal(
  futureSuspendedRuntimeBeforeMalformedDomain.ok,
  false,
);
if (futureSuspendedRuntimeBeforeMalformedDomain.ok) {
  throw new Error(
    'Expected a suspended future runtime to precede malformed domains.',
  );
}
assert.equal(
  futureSuspendedRuntimeBeforeMalformedDomain.status,
  'unsupported-future',
);
assert.deepEqual(
  futureSuspendedRuntimeBeforeMalformedDomain.raw,
  futureSuspendedRuntimeWithMalformedDomain,
);

const futureSuspendedCalculationFile = structuredClone(suspendedHeatFile);
const futureSuspendedCalculationSnapshot = futureSuspendedCalculationFile
  .heatCapacityModeSessions.free.snapshot as unknown as {
    free: {
      heatCapacityFreeBatch: Record<string, unknown>;
    };
  };
futureSuspendedCalculationSnapshot.free.heatCapacityFreeBatch =
  structuredClone(
    futureSuspendedCalculationSnapshot.free.heatCapacityFreeBatch,
  );
futureSuspendedCalculationSnapshot.free.heatCapacityFreeBatch
  .calculationSession = {
    version: HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION + 1,
    futureOnly: true,
  };
const futureSuspendedCalculationProjection =
  projectWorkbenchPersistenceV3File(futureSuspendedCalculationFile, 47);
assert.equal(futureSuspendedCalculationProjection.ok, false);
if (futureSuspendedCalculationProjection.ok) {
  throw new Error(
    'Expected a future suspended calculation session to remain raw.',
  );
}
assert.equal(
  futureSuspendedCalculationProjection.status,
  'unsupported-future',
);
assert.deepEqual(
  futureSuspendedCalculationProjection.raw,
  futureSuspendedCalculationFile,
);
assert.equal(
  futureSuspendedCalculationProjection.diagnostics[0].fieldPath,
  'heatCapacityModeSessions.free.snapshot.free.heatCapacityFreeBatch.calculationSession.version',
);

const futureSuspendedReprojection = structuredClone(
  suspendedHeatProjection.value,
);
const futureSuspendedReprojectionSessions = futureSuspendedReprojection.fields
  .authoritative.modeSessions as {
    free: {
      snapshot: {
        free: Record<string, unknown>;
      } | null;
    };
  };
if (futureSuspendedReprojectionSessions.free.snapshot === null) {
  throw new Error('Expected a suspended Free snapshot projection.');
}
futureSuspendedReprojectionSessions.free.snapshot.free
  .heatCapacityFreeTraceVersion = HEAT_CAPACITY_FREE_TRACE_VERSION + 1;
const futureSuspendedReprojected = reprojectWorkbenchPersistenceV3File(
  futureSuspendedReprojection,
  47,
);
assert.equal(futureSuspendedReprojected.ok, false);
if (futureSuspendedReprojected.ok) {
  throw new Error('Expected future suspended reprojection preservation.');
}
assert.equal(futureSuspendedReprojected.status, 'unsupported-future');
assert.deepEqual(
  futureSuspendedReprojected.raw,
  futureSuspendedReprojection,
);
const suspendedHeatEncoded = encodeWorkbenchPersistenceV3FileProjection(
  suspendedHeatProjection.value,
  47,
);
if (!suspendedHeatEncoded.ok) {
  throw new Error(suspendedHeatEncoded.diagnostics[0].message);
}
const crossFileModeSessionRecord = structuredClone(suspendedHeatEncoded.value);
const crossFileModeSessions = crossFileModeSessionRecord.projection.fields
  .authoritative.modeSessions as {
    free: {
      snapshot: {
        fileId: string;
      } | null;
    };
  };
if (crossFileModeSessions.free.snapshot === null) {
  throw new Error('Expected a suspended Free mode-session snapshot.');
}
crossFileModeSessions.free.snapshot.fileId = 'different-heat-capacity-file';
const crossFileModeSession = decodeWorkbenchPersistenceV3FileRecord(
  crossFileModeSessionRecord,
  47,
);
assert.equal(crossFileModeSession.ok, false);
if (crossFileModeSession.ok) {
  throw new Error('Expected a cross-file Heat mode-session to quarantine.');
}
assert.equal(crossFileModeSession.status, 'quarantined');
assert.deepEqual(crossFileModeSession.raw, crossFileModeSessionRecord);

for (const [index, source] of [
  createDefaultIdealFile(48),
  createDefaultHeatCapacityFile(49),
].entries()) {
  const projected = projectWorkbenchPersistenceV3File(source, index + 48);
  if (!projected.ok) throw new Error(projected.diagnostics[0].message);
  const encoded = encodeWorkbenchPersistenceV3FileProjection(
    projected.value,
    index + 48,
  );
  if (!encoded.ok) throw new Error(encoded.diagnostics[0].message);
  const damagedQualityRecord = structuredClone(encoded.value);
  damagedQualityRecord.projection.fields.quality = {
    invalid: 'rebuildable-quality',
  };
  const repairedQuality = decodeWorkbenchPersistenceV3FileRecord(
    damagedQualityRecord,
    index + 48,
  );
  assert.equal(repairedQuality.ok, true);
  if (!repairedQuality.ok) {
    throw new Error(repairedQuality.diagnostics[0].message);
  }
  assert.equal(
    repairedQuality.status,
    'repaired-cache',
    `${source.kind} rebuildable quality damage must be repaired locally`,
  );
  assert.deepEqual(
    repairedQuality.value.fields.authoritative,
    projected.value.fields.authoritative,
    'quality repair must not alter authoritative data',
  );
}

const unknownKindProjection = structuredClone(standardProjection.value) as
  unknown as Parameters<typeof reprojectWorkbenchPersistenceV3File>[0];
(unknownKindProjection as unknown as Record<string, unknown>).fileKind =
  'future-file-kind';
let unknownKindResult:
  | ReturnType<typeof reprojectWorkbenchPersistenceV3File>
  | undefined;
assert.doesNotThrow(() => {
  unknownKindResult = reprojectWorkbenchPersistenceV3File(
    unknownKindProjection,
    50,
  );
});
assert.ok(unknownKindResult);
assert.equal(unknownKindResult.ok, false);
if (unknownKindResult.ok) {
  throw new Error('Expected unknown fileKind reprojection to fail.');
}
assert.equal(unknownKindResult.status, 'quarantined');

for (const [index, source] of files.entries()) {
  const projected = projectWorkbenchPersistenceV3File(source, index + 20);
  if (!projected.ok) throw new Error(projected.diagnostics[0].message);
  const encoded = encodeWorkbenchPersistenceV3FileProjection(
    projected.value,
    index + 20,
  );
  if (!encoded.ok) throw new Error(encoded.diagnostics[0].message);
  const damagedUiRecord = structuredClone(encoded.value);
  damagedUiRecord.projection.fields.uiCheckpoint.visiblePanels = [
    'not-a-panel',
  ];
  damagedUiRecord.projection.fields.uiCheckpoint.liveWorkspaceSplitRatio =
    999;
  if (source.kind === 'standard') {
    damagedUiRecord.projection.fields.uiCheckpoint.standardResultsLayout = {
      bogus: true,
    };
  } else if (source.kind === 'ideal') {
    damagedUiRecord.projection.fields.uiCheckpoint.idealWindowLayout = {};
  } else if (source.kind === 'heatCapacity') {
    damagedUiRecord.projection.fields.uiCheckpoint.openHeatCapacityTabs =
      'bad-tabs';
  } else {
    damagedUiRecord.projection.fields.uiCheckpoint.previewCameraPreset =
      'rear';
  }
  const repairedUi = decodeWorkbenchPersistenceV3FileRecord(
    damagedUiRecord,
    index + 20,
  );
  assert.equal(repairedUi.ok, true);
  if (!repairedUi.ok) throw new Error(repairedUi.diagnostics[0].message);
  assert.equal(
    repairedUi.status,
    'repaired-cache',
    `${source.kind} UI damage must be locally repairable`,
  );
  assert.deepEqual(
    repairedUi.value.fields.authoritative,
    projected.value.fields.authoritative,
  );
}

for (const relativePath of [
  'src/features/workbench/persistenceV3/projection.ts',
  'src/features/workbench/persistenceV3/codecRegistry.ts',
  'src/features/workbench/persistenceV3/workspaceCodec.ts',
]) {
  const source = await readFile(relativePath, 'utf8');
  for (const forbiddenImport of [
    'createStandardPersistencePayload',
    'validateStandardPersistencePayload',
    'restoreStandardFileFromPersistencePayload',
    'createIdealGasPersistencePayload',
    'validateIdealGasPersistencePayload',
    'restoreIdealGasFileFromPersistencePayload',
    'createHeatCapacityPersistencePayload',
    'validateHeatCapacityPersistencePayload',
    'restoreHeatCapacityFileFromPersistencePayload',
    'createPistonOscillationPersistencePayload',
    'validatePistonOscillationPersistencePayload',
    'restorePistonOscillationFileFromPersistencePayload',
  ]) {
    assert.equal(
      source.includes(forbiddenImport),
      false,
      `${relativePath} must be independent of legacy ${forbiddenImport}`,
    );
  }
}

console.log('workbenchPersistenceV3ProjectionCodec tests passed');
