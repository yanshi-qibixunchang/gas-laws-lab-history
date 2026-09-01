import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
  createEmptyHeatCapacityFreeBatchState,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  calculateFreeHeatCapacityTrialSignals,
  HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createFreeTraceTrial,
  createDefaultFreeTraceStore,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  createHeatCapacityFreeAttempt,
} from '../../src/domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import {
  HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityFreeExperimentDomainState,
  configureHeatCapacityFreeBatchWorkbenchState,
  freezeHeatCapacityFreeParametersForCurrentGroup,
} from '../../src/features/workbench/workbenchState.ts';
import {
  normalizeHeatCapacityFreeRestoreExperimentDomainResult,
  normalizeHeatCapacityFreeRestoreTraceStore,
} from '../../src/features/workbench/workbenchHeatCapacityFreeRestoreNormalization.ts';
import {
  normalizeHeatCapacitySessionRuntimeState,
} from '../../src/features/workbench/workbenchHeatCapacitySessionRestore.ts';

const fallbackDomain = () => (
  createDefaultHeatCapacityFreeExperimentDomainState(
    'real',
    'aggregate-migration-test',
  )
);

const configuredFile = configureHeatCapacityFreeBatchWorkbenchState(
  createDefaultHeatCapacityFile(1),
  3,
  100,
);
const startedFile = freezeHeatCapacityFreeParametersForCurrentGroup(configuredFile);
assert.notEqual(startedFile.heatCapacityFreeBatch.startedAtMs, null);
assert.notEqual(startedFile.heatCapacityFreeBatch.frozenConfigSnapshot, null);

const {
  nextTrialSequence: discardedSequence,
  scoringVersion: discardedScoringVersion,
  ...startedLegacyBatchFields
} = startedFile.heatCapacityFreeBatch;
void discardedSequence;
void discardedScoringVersion;
const startedLegacyBatch = {
  ...startedLegacyBatchFields,
  version: HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
};

const emptyV2Batch = createEmptyHeatCapacityFreeBatchState();
const {
  nextTrialSequence: discardedEmptySequence,
  scoringVersion: discardedEmptyScoringVersion,
  ...emptyLegacyBatchFields
} = emptyV2Batch;
void discardedEmptySequence;
void discardedEmptyScoringVersion;
const emptyLegacyBatch = {
  ...emptyLegacyBatchFields,
  version: HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
};

const emptyLegacy = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
  {
    ...fallbackDomain(),
    batch: emptyLegacyBatch,
  },
  'real',
  'air',
  fallbackDomain(),
);
if (emptyLegacy.ok === false) throw new Error(emptyLegacy.reason);
assert.equal(emptyLegacy.ok, true);
assert.equal(emptyLegacy.status, 'migrated');
assert.equal(emptyLegacy.value.batch.version, HEAT_CAPACITY_FREE_BATCH_VERSION);
assert.equal(emptyLegacy.value.batch.nextTrialSequence, 1);

const missingBatchHighWaterDomain = {
  ...fallbackDomain(),
  batch: undefined,
  traceStore: {
    ...createDefaultFreeTraceStore(),
    nextTraceTrialIndex: 7,
  },
};
const missingBatchHighWater =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    missingBatchHighWaterDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (missingBatchHighWater.ok === false) {
  throw new Error(missingBatchHighWater.reason);
}
assert.equal(missingBatchHighWater.status, 'migrated');
assert.equal(missingBatchHighWater.value.batch.id, null);
assert.equal(missingBatchHighWater.value.batch.nextTrialSequence, 1);
assert.equal(missingBatchHighWater.value.traceStore.nextTraceTrialIndex, 7);

const orphanTrace = createFreeTraceTrial(
  createDefaultFreeTraceStore(),
  startedFile.heatCapacityFreeBatch.frozenConfigSnapshot!,
);
const missingBatchTraceAuthorityDomain = {
  ...fallbackDomain(),
  batch: undefined,
  traceStore: orphanTrace.store,
};
const missingBatchTraceAuthority =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    missingBatchTraceAuthorityDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (missingBatchTraceAuthority.ok) {
  throw new Error('Expected unbatched trace authority quarantine.');
}
assert.equal(missingBatchTraceAuthority.status, 'quarantined');
assert.deepEqual(
  missingBatchTraceAuthority.raw,
  missingBatchTraceAuthorityDomain,
);

const startedLegacyDomain = {
  ...fallbackDomain(),
  batch: startedLegacyBatch,
  traceStore: {
    activeTraceTrialId: null,
    nextTraceTrialIndex: 4,
    traceTrials: [],
  },
  trials: [
    createHeatCapacityFreeTrial('free-trial-1', null, 'real'),
    createHeatCapacityFreeTrial('free-trial-2', null, 'real'),
  ],
};
const startedLegacy = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
  startedLegacyDomain,
  'real',
  'air',
  fallbackDomain(),
);
if (startedLegacy.ok === false) throw new Error(startedLegacy.reason);
assert.equal(startedLegacy.ok, true);
assert.equal(startedLegacy.status, 'migrated');
assert.equal(startedLegacy.value.batch.version, HEAT_CAPACITY_FREE_BATCH_VERSION);
assert.equal(
  startedLegacy.value.batch.nextTrialSequence,
  4,
  'the trace high-water must survive an empty trace collection and prevent identity reuse',
);
assert.deepEqual(
  startedLegacy.value.trials.map((trial) => trial.batchMembership),
  [
    { version: 1, batchId: startedLegacyBatch.id, sequence: 1 },
    { version: 1, batchId: startedLegacyBatch.id, sequence: 2 },
  ],
);
assert.equal(startedLegacy.value.traceStore.nextTraceTrialIndex, 4);

const futureLegacyMembershipDomain =
  structuredClone(startedLegacyDomain);
(
  futureLegacyMembershipDomain.trials[0] as unknown as {
    batchMembership: unknown;
  }
).batchMembership = {
  version:
    HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION + 1,
  batchId: startedLegacyBatch.id,
  sequence: 1,
};
const futureLegacyMembership =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    futureLegacyMembershipDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (futureLegacyMembership.ok) {
  throw new Error('Expected future trial membership isolation.');
}
assert.equal(futureLegacyMembership.status, 'unsupported-future');
assert.deepEqual(
  futureLegacyMembership.raw,
  futureLegacyMembershipDomain,
);

const conflictingLegacyMembershipDomain =
  structuredClone(startedLegacyDomain);
(
  conflictingLegacyMembershipDomain.trials[0] as unknown as {
    batchMembership: unknown;
  }
).batchMembership = {
  version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
  batchId: 'foreign-batch',
  sequence: 777,
};
const conflictingLegacyMembership =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    conflictingLegacyMembershipDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (conflictingLegacyMembership.ok) {
  throw new Error('Expected conflicting legacy trial membership isolation.');
}
assert.equal(conflictingLegacyMembership.status, 'quarantined');
assert.deepEqual(
  conflictingLegacyMembership.raw,
  conflictingLegacyMembershipDomain,
);

const exactLegacyMembershipDomain =
  structuredClone(startedLegacyDomain);
(
  exactLegacyMembershipDomain.trials[0] as unknown as {
    batchMembership: unknown;
  }
).batchMembership = {
  version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
  batchId: startedLegacyBatch.id,
  sequence: 1,
};
const exactLegacyMembership =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    exactLegacyMembershipDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (exactLegacyMembership.ok === false) {
  throw new Error(exactLegacyMembership.reason);
}
assert.equal(exactLegacyMembership.status, 'migrated');

const extraAuthorityLegacyMembershipDomain =
  structuredClone(exactLegacyMembershipDomain);
(
  extraAuthorityLegacyMembershipDomain.trials[0] as unknown as {
    batchMembership: Record<string, unknown>;
  }
).batchMembership.unexpectedAuthority = 'must-not-drop';
const extraAuthorityLegacyMembership =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    extraAuthorityLegacyMembershipDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (extraAuthorityLegacyMembership.ok) {
  throw new Error('Expected extra legacy membership authority quarantine.');
}
assert.equal(extraAuthorityLegacyMembership.status, 'quarantined');
assert.deepEqual(
  extraAuthorityLegacyMembership.raw,
  extraAuthorityLegacyMembershipDomain,
);

const futureCurrentMembershipDomain =
  structuredClone(startedLegacy.value);
(
  futureCurrentMembershipDomain.trials[0] as unknown as {
    batchMembership: unknown;
  }
).batchMembership = {
  version:
    HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION + 1,
  batchId: startedLegacyBatch.id,
  sequence: 1,
};
const futureCurrentMembership =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    futureCurrentMembershipDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (futureCurrentMembership.ok) {
  throw new Error('Expected future current trial membership isolation.');
}
assert.equal(futureCurrentMembership.status, 'unsupported-future');
assert.deepEqual(
  futureCurrentMembership.raw,
  futureCurrentMembershipDomain,
);
const futureMembershipWithMalformedSibling =
  structuredClone(futureCurrentMembershipDomain);
futureMembershipWithMalformedSibling.activeRunConfigSnapshot = {
  malformed: true,
} as never;
const futureMembershipBeforeMalformedSibling =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    futureMembershipWithMalformedSibling,
    'real',
    'air',
    fallbackDomain(),
  );
if (futureMembershipBeforeMalformedSibling.ok) {
  throw new Error('Expected future membership to precede malformed siblings.');
}
assert.equal(
  futureMembershipBeforeMalformedSibling.status,
  'unsupported-future',
);
assert.equal(
  futureMembershipBeforeMalformedSibling.sourceVersion,
  HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION + 1,
);
assert.deepEqual(
  futureMembershipBeforeMalformedSibling.raw,
  futureMembershipWithMalformedSibling,
);

const futureCalculationSessionDomain = structuredClone(startedLegacy.value);
futureCalculationSessionDomain.batch.calculationSession = {
  version: HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION + 1,
  futureOnly: true,
} as never;
const futureCalculationSession =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    futureCalculationSessionDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (futureCalculationSession.ok) {
  throw new Error('Expected future calculation session isolation.');
}
assert.equal(futureCalculationSession.status, 'unsupported-future');
assert.equal(
  futureCalculationSession.sourceVersion,
  HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION + 1,
);
assert.equal(
  futureCalculationSession.fieldPath,
  'batch.calculationSession.version',
);
assert.deepEqual(
  futureCalculationSession.raw,
  futureCalculationSessionDomain,
);

const futureScoringVersionDomain = structuredClone(startedLegacy.value);
if (futureScoringVersionDomain.batch.frozenConfigSnapshot === null) {
  throw new Error('Expected a frozen configuration snapshot.');
}
futureScoringVersionDomain.batch.frozenConfigSnapshot.scoring
  .processScoringVersion = 'free-process-score-v99' as never;
futureScoringVersionDomain.activeRunConfigSnapshot = {
  malformed: true,
} as never;
const futureScoringVersion =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    futureScoringVersionDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (futureScoringVersion.ok) {
  throw new Error('Expected future process-scoring version isolation.');
}
assert.equal(futureScoringVersion.status, 'unsupported-future');
assert.equal(futureScoringVersion.sourceVersion, 99);
assert.equal(
  futureScoringVersion.fieldPath,
  'batch.frozenConfigSnapshot.scoring.processScoringVersion',
);
assert.deepEqual(futureScoringVersion.raw, futureScoringVersionDomain);

const futureStandardReferenceDomain = structuredClone(startedLegacy.value);
futureStandardReferenceDomain.trials[0].standardReferenceSnapshot = {
  generatorVersion: 'free-standard-reference-v99',
} as never;
const futureStandardReference =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    futureStandardReferenceDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (futureStandardReference.ok) {
  throw new Error('Expected future standard-reference generator isolation.');
}
assert.equal(futureStandardReference.status, 'unsupported-future');
assert.equal(futureStandardReference.sourceVersion, 99);
assert.equal(
  futureStandardReference.fieldPath,
  'trials[0].standardReferenceSnapshot.generatorVersion',
);
assert.deepEqual(futureStandardReference.raw, futureStandardReferenceDomain);

const correctedSignalCacheDomain = structuredClone(startedLegacy.value);
const correctedSignalCacheTrial = correctedSignalCacheDomain.trials[0];
correctedSignalCacheTrial.u1 = normalizeHeatCapacityFreeRecordInput({
  atS: 4,
  displayPressureMv: 100,
  displayTemperatureMv: 0,
  calibrationVersion: 1,
  zeroEventId: 'zero-cache-test',
  phaseAtRecord: 'sealedStabilizing',
});
correctedSignalCacheTrial.u2 = normalizeHeatCapacityFreeRecordInput({
  atS: 5,
  displayPressureMv: 30,
  displayTemperatureMv: 0,
  calibrationVersion: 1,
  zeroEventId: 'zero-cache-test',
  phaseAtRecord: 'recovering',
});
correctedSignalCacheTrial.correctedSignals =
  calculateFreeHeatCapacityTrialSignals(correctedSignalCacheTrial);
if (correctedSignalCacheTrial.correctedSignals === null) {
  throw new Error('Expected a corrected-signal cache fixture.');
}
correctedSignalCacheTrial.correctedSignals.calculationVersion =
  'log-pressure-v99' as never;
const repairedCorrectedSignalCache =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    correctedSignalCacheDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (repairedCorrectedSignalCache.ok === false) {
  throw new Error(repairedCorrectedSignalCache.reason);
}
assert.equal(repairedCorrectedSignalCache.status, 'repaired-cache');
assert.equal(
  repairedCorrectedSignalCache.value.trials[0].correctedSignals
    ?.calculationVersion,
  'log-pressure-v1',
);

const opaqueCorrectedSignalCacheDomain =
  structuredClone(correctedSignalCacheDomain);
(
  opaqueCorrectedSignalCacheDomain.trials[0].correctedSignals as unknown as
    Record<string, unknown>
).futureAuthority = true;
const opaqueCorrectedSignalCache =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    opaqueCorrectedSignalCacheDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (opaqueCorrectedSignalCache.ok) {
  throw new Error('Expected opaque corrected-signal authority quarantine.');
}
assert.equal(opaqueCorrectedSignalCache.status, 'quarantined');
assert.deepEqual(
  opaqueCorrectedSignalCache.raw,
  opaqueCorrectedSignalCacheDomain,
);

const exactV2 = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
  startedLegacy.value,
  'real',
  'air',
  fallbackDomain(),
);
if (exactV2.ok === false) throw new Error(exactV2.reason);
assert.equal(exactV2.ok, true);
assert.equal(exactV2.status, 'exact');
assert.deepEqual(
  exactV2.value,
  startedLegacy.value,
  'migrate -> normalize -> encode-clone -> migrate must be idempotent',
);

const canonicalAttempt = createHeatCapacityFreeAttempt({
  startReason: 'effective-pump',
  preheatOutcome: 'omitted',
  atS: 2,
  wallClockMs: 2_000,
  powerOn: false,
});
const exactAttemptDomain = {
  ...exactV2.value,
  activeAttempt: canonicalAttempt,
};
const exactAttempt = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
  exactAttemptDomain,
  'real',
  'air',
  fallbackDomain(),
);
if (exactAttempt.ok === false) throw new Error(exactAttempt.reason);
assert.equal(exactAttempt.status, 'exact');
assert.deepEqual(exactAttempt.value.activeAttempt, canonicalAttempt);

const nonCanonicalAttemptDomain = structuredClone(exactAttemptDomain);
(
  nonCanonicalAttemptDomain.activeAttempt as unknown as Record<string, unknown>
).opaqueAuthority = 'must-not-drop';
const nonCanonicalAttempt =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    nonCanonicalAttemptDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (nonCanonicalAttempt.ok) {
  throw new Error('Expected non-canonical active attempt quarantine.');
}
assert.equal(nonCanonicalAttempt.status, 'quarantined');
assert.deepEqual(nonCanonicalAttempt.raw, nonCanonicalAttemptDomain);

const extraBatchAuthorityDomain = structuredClone(exactV2.value);
(
  extraBatchAuthorityDomain.batch as unknown as Record<string, unknown>
).opaqueAuthority = 'must-not-drop';
const extraBatchAuthority =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    extraBatchAuthorityDomain,
    'real',
    'air',
    fallbackDomain(),
  );
if (extraBatchAuthority.ok) {
  throw new Error('Expected same-version batch authority quarantine.');
}
assert.equal(extraBatchAuthority.status, 'quarantined');
assert.deepEqual(extraBatchAuthority.raw, extraBatchAuthorityDomain);

const encodedClone = structuredClone(exactV2.value);
const decodedClone = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
  encodedClone,
  'real',
  'air',
  fallbackDomain(),
);
if (decodedClone.ok === false) throw new Error(decodedClone.reason);
assert.equal(decodedClone.ok, true);
assert.equal(decodedClone.status, 'exact');
assert.deepEqual(decodedClone.value, exactV2.value);

const futureRaw = {
  ...fallbackDomain(),
  traceStore: {
    corrupt: true,
  },
  batch: {
    ...emptyV2Batch,
    version: HEAT_CAPACITY_FREE_BATCH_VERSION + 1,
  },
};
const future = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
  futureRaw,
  'real',
  'air',
  fallbackDomain(),
);
if (future.ok) throw new Error('Expected future Free batch quarantine.');
assert.equal(future.ok, false);
assert.equal(future.status, 'unsupported-future');
assert.equal(future.sourceVersion, HEAT_CAPACITY_FREE_BATCH_VERSION + 1);
assert.deepEqual(future.raw, futureRaw);

const duplicateRaw = {
  ...startedLegacyDomain,
  trials: [
    createHeatCapacityFreeTrial('free-trial-1', null, 'real'),
    createHeatCapacityFreeTrial('free-trial-1', null, 'real'),
  ],
};
const duplicate = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
  duplicateRaw,
  'real',
  'air',
  fallbackDomain(),
);
if (duplicate.ok) throw new Error('Expected duplicate legacy trial quarantine.');
assert.equal(duplicate.ok, false);
assert.equal(duplicate.status, 'quarantined');
assert.match(duplicate.reason, /relationship repair/i);
assert.deepEqual(duplicate.raw, duplicateRaw);

assert.deepEqual(
  normalizeHeatCapacityFreeRestoreTraceStore({
    activeTraceTrialId: null,
    nextTraceTrialIndex: 7,
    traceTrials: [],
  }),
  {
    ...createDefaultFreeTraceStore(),
    nextTraceTrialIndex: 7,
  },
  'an empty trace collection must retain its monotonic high-water',
);
assert.deepEqual(
  normalizeHeatCapacityFreeRestoreTraceStore(createDefaultFreeTraceStore()),
  createDefaultFreeTraceStore(),
);

const runtimeWithLegacyActiveDomain = {
  ...startedFile,
  heatCapacityFreeRealDomain: startedLegacyDomain,
  heatCapacityFreeBatch: createEmptyHeatCapacityFreeBatchState(),
  heatCapacityFreeTrials: [],
  heatCapacityFreeTraceStore: createDefaultFreeTraceStore(),
};
const normalizedRuntime = normalizeHeatCapacitySessionRuntimeState(
  runtimeWithLegacyActiveDomain as unknown as typeof startedFile,
);
assert.deepEqual(
  normalizedRuntime.heatCapacityFreeBatch,
  normalizedRuntime.heatCapacityFreeRealDomain.batch,
);
assert.deepEqual(
  normalizedRuntime.heatCapacityFreeTrials,
  normalizedRuntime.heatCapacityFreeRealDomain.trials,
);
assert.deepEqual(
  normalizedRuntime.heatCapacityFreeTraceStore,
  normalizedRuntime.heatCapacityFreeExperimentGroups.groups[0]?.runSeries.traceStore,
  'the active top-level projection must be rebuilt from the current experiment group',
);
assert.equal(
  normalizedRuntime.heatCapacityFreeBatch.nextTrialSequence,
  startedFile.heatCapacityFreeExperimentGroups.groups[0]?.runSeries.batch.nextTrialSequence,
  'a stale legacy domain high-water must not overwrite the current experiment-group authority',
);
assert.equal(normalizedRuntime.heatCapacityFreeBatch.nextTrialSequence, 1);

console.log('workbenchHeatCapacityFreeAggregateMigration tests passed');
