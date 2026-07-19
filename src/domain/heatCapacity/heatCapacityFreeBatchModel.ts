import type {
  HeatCapacityFreeConfigSnapshot,
} from './heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityCalculationWorkflowSession,
} from './heatCapacityCalculationWorkflowModel.ts';
import {
  isHeatCapacityFreeTrialComplete,
  HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
  type HeatCapacityFreeBatchTrialIdentity,
  type HeatCapacityFreeTrial,
  type HeatCapacityFreeTrialBatchMembership,
} from './heatCapacityFreeTrialModel.ts';

export const HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION = 1 as const;
export const HEAT_CAPACITY_FREE_BATCH_VERSION = 2 as const;
export const HEAT_CAPACITY_FREE_BATCH_MIN_GROUPS = 3 as const;
export const HEAT_CAPACITY_FREE_BATCH_MAX_GROUPS = 7 as const;
export const HEAT_CAPACITY_FREE_BATCH_GROUP_OPTIONS = [3, 4, 5, 6, 7] as const;

export type HeatCapacityFreeBatchGroupCount =
  (typeof HEAT_CAPACITY_FREE_BATCH_GROUP_OPTIONS)[number];

interface HeatCapacityFreeBatchStateFields {
  id: string | null;
  targetGroupCount: HeatCapacityFreeBatchGroupCount | null;
  frozenConfigSnapshot: HeatCapacityFreeConfigSnapshot | null;
  configuredAtMs: number | null;
  startedAtMs: number | null;
  experimentCompletedAtMs: number | null;
  calculationSession: HeatCapacityCalculationWorkflowSession | null;
}

export interface HeatCapacityFreeBatchStateV1 extends HeatCapacityFreeBatchStateFields {
  version: typeof HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION;
}

export interface HeatCapacityFreeBatchState extends HeatCapacityFreeBatchStateFields {
  version: typeof HEAT_CAPACITY_FREE_BATCH_VERSION;
  nextTrialSequence: number;
}

export interface HeatCapacityFreeBatchProgress {
  configured: boolean;
  locked: boolean;
  targetGroupCount: HeatCapacityFreeBatchGroupCount | null;
  completedGroupCount: number;
  currentGroupNumber: number | null;
  allGroupsRecorded: boolean;
}

export const isHeatCapacityFreeBatchGroupCount = (
  value: unknown,
): value is HeatCapacityFreeBatchGroupCount => (
  typeof value === 'number' &&
  HEAT_CAPACITY_FREE_BATCH_GROUP_OPTIONS.includes(value as HeatCapacityFreeBatchGroupCount)
);

export const createEmptyHeatCapacityFreeBatchState = (): HeatCapacityFreeBatchState => ({
  version: HEAT_CAPACITY_FREE_BATCH_VERSION,
  nextTrialSequence: 1,
  id: null,
  targetGroupCount: null,
  frozenConfigSnapshot: null,
  configuredAtMs: null,
  startedAtMs: null,
  experimentCompletedAtMs: null,
  calculationSession: null,
});

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const hasExactOwnKeys = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) => {
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const HEAT_CAPACITY_FREE_BATCH_V1_KEYS = [
  'version',
  'id',
  'targetGroupCount',
  'frozenConfigSnapshot',
  'configuredAtMs',
  'startedAtMs',
  'experimentCompletedAtMs',
  'calculationSession',
] as const;

const HEAT_CAPACITY_FREE_BATCH_V2_KEYS = [
  ...HEAT_CAPACITY_FREE_BATCH_V1_KEYS,
  'nextTrialSequence',
] as const;

const HEAT_CAPACITY_FREE_BATCH_MEMBERSHIP_KEYS = [
  'version',
  'batchId',
  'sequence',
] as const;

const isNullableTimestamp = (value: unknown): value is number | null => (
  value === null ||
  (typeof value === 'number' && Number.isFinite(value) && value >= 0)
);

const isNullableRecord = (value: unknown) => value === null || isPlainRecord(value);

const hasValidBatchRelationships = (
  state: HeatCapacityFreeBatchStateFields,
) => {
  if (state.targetGroupCount === null) {
    return state.id === null &&
      state.frozenConfigSnapshot === null &&
      state.configuredAtMs === null &&
      state.startedAtMs === null &&
      state.experimentCompletedAtMs === null &&
      state.calculationSession === null;
  }
  if (
    state.id === null ||
    state.id.trim() === '' ||
    state.configuredAtMs === null
  ) {
    return false;
  }
  if (state.startedAtMs === null) {
    return state.frozenConfigSnapshot === null &&
      state.experimentCompletedAtMs === null &&
      state.calculationSession === null;
  }
  if (
    state.frozenConfigSnapshot === null ||
    state.startedAtMs < state.configuredAtMs
  ) {
    return false;
  }
  if (
    state.experimentCompletedAtMs !== null &&
    state.experimentCompletedAtMs < state.startedAtMs
  ) {
    return false;
  }
  return state.calculationSession === null || (
    state.experimentCompletedAtMs !== null &&
    state.calculationSession.mode === 'free'
  );
};

const decodeHeatCapacityFreeBatchFields = (
  value: Record<string, unknown>,
): HeatCapacityFreeBatchStateFields | null => {
  const targetGroupCount = isHeatCapacityFreeBatchGroupCount(value.targetGroupCount)
    ? value.targetGroupCount
    : value.targetGroupCount === null
      ? null
      : undefined;
  if (
    targetGroupCount === undefined ||
    (value.id !== null && typeof value.id !== 'string') ||
    !isNullableRecord(value.frozenConfigSnapshot) ||
    !isNullableTimestamp(value.configuredAtMs) ||
    !isNullableTimestamp(value.startedAtMs) ||
    !isNullableTimestamp(value.experimentCompletedAtMs) ||
    !isNullableRecord(value.calculationSession)
  ) {
    return null;
  }
  const fields: HeatCapacityFreeBatchStateFields = {
    id: value.id as string | null,
    targetGroupCount,
    frozenConfigSnapshot:
      value.frozenConfigSnapshot as HeatCapacityFreeConfigSnapshot | null,
    configuredAtMs: value.configuredAtMs,
    startedAtMs: value.startedAtMs,
    experimentCompletedAtMs: value.experimentCompletedAtMs,
    calculationSession:
      value.calculationSession as HeatCapacityCalculationWorkflowSession | null,
  };
  return hasValidBatchRelationships(fields) ? fields : null;
};

export type HeatCapacityFreeBatchVersionDispatch =
  | {
      kind: 'missing';
    }
  | {
      kind: 'v1';
      value: HeatCapacityFreeBatchStateV1;
    }
  | {
      kind: 'v2';
      value: HeatCapacityFreeBatchState;
    }
  | {
      kind: 'unsupported-future';
      version: number;
    }
  | {
      kind: 'invalid';
      version: unknown;
    };

export const dispatchHeatCapacityFreeBatchVersion = (
  value: unknown,
): HeatCapacityFreeBatchVersionDispatch => {
  if (value === undefined || value === null) return { kind: 'missing' };
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', version: undefined };
  }
  const version = value.version;
  if (
    typeof version === 'number' &&
    Number.isSafeInteger(version) &&
    version > HEAT_CAPACITY_FREE_BATCH_VERSION
  ) {
    return { kind: 'unsupported-future', version };
  }
  if (
    version !== HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION &&
    version !== HEAT_CAPACITY_FREE_BATCH_VERSION
  ) {
    return { kind: 'invalid', version };
  }
  if (
    !hasExactOwnKeys(
      value,
      version === HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION
        ? HEAT_CAPACITY_FREE_BATCH_V1_KEYS
        : HEAT_CAPACITY_FREE_BATCH_V2_KEYS,
    )
  ) {
    return { kind: 'invalid', version };
  }
  const fields = decodeHeatCapacityFreeBatchFields(value);
  if (fields === null) return { kind: 'invalid', version };
  if (version === HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION) {
    return {
      kind: 'v1',
      value: {
        version: HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
        ...fields,
      },
    };
  }
  if (
    typeof value.nextTrialSequence !== 'number' ||
    !Number.isSafeInteger(value.nextTrialSequence) ||
    value.nextTrialSequence < 1
  ) {
    return { kind: 'invalid', version };
  }
  return {
    kind: 'v2',
    value: {
      version: HEAT_CAPACITY_FREE_BATCH_VERSION,
      nextTrialSequence: value.nextTrialSequence,
      ...fields,
    },
  };
};

export const migrateHeatCapacityFreeBatchStateV1ToV2 = (
  state: HeatCapacityFreeBatchStateV1,
  nextTrialSequence = 1,
): HeatCapacityFreeBatchState => {
  if (
    !Number.isSafeInteger(nextTrialSequence) ||
    nextTrialSequence < 1
  ) {
    throw new RangeError('Free batch next trial sequence must be a positive safe integer.');
  }
  return {
    ...state,
    version: HEAT_CAPACITY_FREE_BATCH_VERSION,
    nextTrialSequence,
  };
};

export const normalizeHeatCapacityFreeBatchState = (
  value: unknown,
): HeatCapacityFreeBatchState => {
  const dispatched = dispatchHeatCapacityFreeBatchVersion(value);
  if (dispatched.kind === 'missing') {
    return createEmptyHeatCapacityFreeBatchState();
  }
  if (dispatched.kind === 'v1') {
    if (dispatched.value.startedAtMs !== null) {
      throw new Error(
        'A started legacy Free batch requires aggregate identity migration.',
      );
    }
    return migrateHeatCapacityFreeBatchStateV1ToV2(dispatched.value);
  }
  if (dispatched.kind === 'v2') return dispatched.value;
  if (dispatched.kind === 'unsupported-future') {
    throw new Error(
      `Unsupported future Free batch version: ${dispatched.version}.`,
    );
  }
  throw new Error('Invalid Free batch state.');
};

export const configureHeatCapacityFreeBatch = (
  state: HeatCapacityFreeBatchState,
  targetGroupCount: HeatCapacityFreeBatchGroupCount,
  batchId: string,
  now = Date.now(),
): HeatCapacityFreeBatchState => {
  if (
    state.startedAtMs !== null ||
    !isHeatCapacityFreeBatchGroupCount(targetGroupCount) ||
    batchId.trim() === ''
  ) {
    return state;
  }
  return {
    ...state,
    nextTrialSequence: 1,
    id: batchId,
    targetGroupCount,
    frozenConfigSnapshot: null,
    configuredAtMs: now,
    experimentCompletedAtMs: null,
    calculationSession: null,
  };
};

export const startHeatCapacityFreeBatch = (
  state: HeatCapacityFreeBatchState,
  frozenConfigSnapshot: HeatCapacityFreeConfigSnapshot,
  now = Date.now(),
): HeatCapacityFreeBatchState => {
  if (
    state.targetGroupCount === null ||
    state.startedAtMs !== null ||
    state.frozenConfigSnapshot !== null
  ) {
    return state;
  }
  return {
    ...state,
    frozenConfigSnapshot,
    startedAtMs: now,
    experimentCompletedAtMs: null,
  };
};

export const completeHeatCapacityFreeBatchExperiment = (
  state: HeatCapacityFreeBatchState,
  now = Date.now(),
): HeatCapacityFreeBatchState => (
  state.targetGroupCount === null || state.startedAtMs === null
    ? state
    : {
        ...state,
        experimentCompletedAtMs: state.experimentCompletedAtMs ?? now,
      }
);

export type HeatCapacityFreeTrialIdFactory = (
  batchId: string,
  sequence: number,
) => string;

export const createHeatCapacityFreeTrialId: HeatCapacityFreeTrialIdFactory = (
  batchId,
  sequence,
) => {
  if (batchId.trim() === '') {
    throw new Error('Free batch identity cannot be empty.');
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError('Free trial sequence must be a positive safe integer.');
  }
  return `${batchId}:trial:${sequence}`;
};

export interface HeatCapacityFreeTrialIdentityAllocation {
  batch: HeatCapacityFreeBatchState;
  identity: HeatCapacityFreeBatchTrialIdentity;
}

export const allocateHeatCapacityFreeTrialIdentity = (
  state: HeatCapacityFreeBatchState,
  createId: HeatCapacityFreeTrialIdFactory = createHeatCapacityFreeTrialId,
): HeatCapacityFreeTrialIdentityAllocation | null => {
  if (
    !isHeatCapacityFreeBatchLocked(state) ||
    state.id === null
  ) {
    return null;
  }
  const sequence = state.nextTrialSequence;
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError('Free batch next trial sequence is invalid.');
  }
  if (sequence >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Free batch trial identity space is exhausted.');
  }
  const id = createId(state.id, sequence);
  if (id.trim() === '') {
    throw new Error('Free trial identity factory returned an empty identity.');
  }
  const batchMembership: HeatCapacityFreeTrialBatchMembership = {
    version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
    batchId: state.id,
    sequence,
  };
  return {
    batch: {
      ...state,
      nextTrialSequence: sequence + 1,
    },
    identity: {
      id,
      batchMembership,
    },
  };
};

const readLegacyTrialSequence = (id: string) => {
  const match = /^free-trial-(\d+)$/.exec(id);
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) && sequence >= 1 ? sequence : null;
};

export interface HeatCapacityFreeBatchTrialIdentityAssignment {
  trialIndex: number;
  previousId: string;
  id: string;
  batchMembership: HeatCapacityFreeTrialBatchMembership;
  idChanged: boolean;
}

export interface HeatCapacityFreeBatchTrialIdRewrite {
  trialIndex: number;
  previousId: string;
  id: string;
}

export type HeatCapacityFreeBatchAggregateMigrationPlan =
  | {
      ok: true;
      status: 'exact' | 'migrated' | 'relationship-repair-required';
      sourceVersion: 1 | 2 | null;
      batch: HeatCapacityFreeBatchState;
      assignments: HeatCapacityFreeBatchTrialIdentityAssignment[];
      trialIdRewrites: HeatCapacityFreeBatchTrialIdRewrite[];
    }
  | {
      ok: false;
      status: 'invalid' | 'unsupported-future';
      sourceVersion: unknown;
      reason: string;
    };

export interface PlanHeatCapacityFreeBatchAggregateMigrationInput {
  batch: unknown;
  trials: readonly Pick<HeatCapacityFreeTrial, 'id' | 'batchMembership'>[];
  traceNextTrialIndex?: number;
  createTrialId?: HeatCapacityFreeTrialIdFactory;
}

const invalidAggregateMigrationPlan = (
  sourceVersion: unknown,
  reason: string,
): HeatCapacityFreeBatchAggregateMigrationPlan => ({
  ok: false,
  status: 'invalid',
  sourceVersion,
  reason,
});

export const planHeatCapacityFreeBatchAggregateMigration = ({
  batch: batchValue,
  trials,
  traceNextTrialIndex = 1,
  createTrialId = createHeatCapacityFreeTrialId,
}: PlanHeatCapacityFreeBatchAggregateMigrationInput): HeatCapacityFreeBatchAggregateMigrationPlan => {
  const dispatched = dispatchHeatCapacityFreeBatchVersion(batchValue);
  if (dispatched.kind === 'unsupported-future') {
    return {
      ok: false,
      status: 'unsupported-future',
      sourceVersion: dispatched.version,
      reason: `Unsupported future Free batch version: ${dispatched.version}.`,
    };
  }
  if (dispatched.kind === 'invalid') {
    return invalidAggregateMigrationPlan(
      dispatched.version,
      'Free batch shape or relationships are invalid.',
    );
  }
  if (
    !Number.isSafeInteger(traceNextTrialIndex) ||
    traceNextTrialIndex < 1
  ) {
    return invalidAggregateMigrationPlan(
      dispatched.kind === 'missing' ? null : dispatched.value.version,
      'Free trace next trial index must be a positive safe integer.',
    );
  }

  const sourceVersion = dispatched.kind === 'missing'
    ? null
    : dispatched.value.version;
  if (dispatched.kind === 'missing') {
    return trials.length === 0
      ? {
          ok: true,
          status: 'migrated',
          sourceVersion,
          batch: createEmptyHeatCapacityFreeBatchState(),
          assignments: [],
          trialIdRewrites: [],
        }
      : invalidAggregateMigrationPlan(
          sourceVersion,
          'Unbatched Free trials require a dedicated historical migration.',
        );
  }

  if (dispatched.kind === 'v2') {
    const state = dispatched.value;
    if (state.id === null) {
      return (
        trials.length === 0 &&
        state.nextTrialSequence === 1
      )
        ? {
            ok: true,
            status: 'exact',
            sourceVersion,
            batch: state,
            assignments: [],
            trialIdRewrites: [],
          }
        : invalidAggregateMigrationPlan(
            sourceVersion,
            'An empty Free batch cannot own trials or a consumed identity sequence.',
          );
    }
    if (
      (state.startedAtMs === null && trials.length > 0) ||
      (
        state.targetGroupCount !== null &&
        trials.length > state.targetGroupCount
      )
    ) {
      return invalidAggregateMigrationPlan(
        sourceVersion,
        'Current Free batch trial membership exceeds its lifecycle boundary.',
      );
    }
    const ids = new Set<string>();
    const sequences = new Set<number>();
    const assignments: HeatCapacityFreeBatchTrialIdentityAssignment[] = [];
    for (let trialIndex = 0; trialIndex < trials.length; trialIndex += 1) {
      const trial = trials[trialIndex]!;
      const membership = trial.batchMembership;
      if (
        trial.id.trim() === '' ||
        ids.has(trial.id) ||
        membership == null ||
        !isPlainRecord(membership) ||
        !hasExactOwnKeys(
          membership as unknown as Record<string, unknown>,
          HEAT_CAPACITY_FREE_BATCH_MEMBERSHIP_KEYS,
        ) ||
        membership.version !== HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION ||
        membership.batchId !== state.id ||
        !Number.isSafeInteger(membership.sequence) ||
        membership.sequence < 1 ||
        sequences.has(membership.sequence)
      ) {
        return invalidAggregateMigrationPlan(
          sourceVersion,
          'Current Free batch trial identities are inconsistent.',
        );
      }
      ids.add(trial.id);
      sequences.add(membership.sequence);
      assignments.push({
        trialIndex,
        previousId: trial.id,
        id: trial.id,
        batchMembership: { ...membership },
        idChanged: false,
      });
    }
    const maximumSequence = Math.max(0, ...sequences);
    if (state.nextTrialSequence <= maximumSequence) {
      return invalidAggregateMigrationPlan(
        sourceVersion,
        'Free batch next trial sequence does not exceed issued identities.',
      );
    }
    const migratedNextTrialSequence = Math.max(
      state.nextTrialSequence,
      traceNextTrialIndex,
    );
    return {
      ok: true,
      status: migratedNextTrialSequence === state.nextTrialSequence
        ? 'exact'
        : 'migrated',
      sourceVersion,
      batch: migratedNextTrialSequence === state.nextTrialSequence
        ? state
        : {
            ...state,
            nextTrialSequence: migratedNextTrialSequence,
          },
      assignments,
      trialIdRewrites: [],
    };
  }

  const legacy = dispatched.value;
  if (legacy.id === null) {
    return trials.length === 0
      ? {
          ok: true,
          status: 'migrated',
          sourceVersion,
          batch: migrateHeatCapacityFreeBatchStateV1ToV2(legacy),
          assignments: [],
          trialIdRewrites: [],
        }
      : invalidAggregateMigrationPlan(
          sourceVersion,
          'Legacy Free trials cannot be attached to an empty batch.',
        );
  }
  if (trials.some((trial) => typeof trial.id !== 'string' || trial.id.trim() === '')) {
    return invalidAggregateMigrationPlan(
      sourceVersion,
      'Legacy Free trial identities must be non-empty strings.',
    );
  }
  if (
    (legacy.startedAtMs === null && trials.length > 0) ||
    (
      legacy.targetGroupCount !== null &&
      trials.length > legacy.targetGroupCount
    )
  ) {
    return invalidAggregateMigrationPlan(
      sourceVersion,
      'Legacy Free batch trial membership exceeds its lifecycle boundary.',
    );
  }

  const parsedSequences = trials
    .map((trial) => readLegacyTrialSequence(trial.id))
    .filter((sequence): sequence is number => sequence !== null);
  const initialHighWater = Math.max(
    traceNextTrialIndex - 1,
    0,
    ...parsedSequences,
  );
  if (initialHighWater >= Number.MAX_SAFE_INTEGER) {
    return invalidAggregateMigrationPlan(
      sourceVersion,
      'Free batch trial identity space is exhausted.',
    );
  }
  const sourceIdCounts = new Map<string, number>();
  for (const trial of trials) {
    sourceIdCounts.set(trial.id, (sourceIdCounts.get(trial.id) ?? 0) + 1);
  }
  const protectedUniqueSourceIds = new Set(
    [...sourceIdCounts.entries()]
      .filter(([, count]) => count === 1)
      .map(([id]) => id),
  );
  const usedIds = new Set<string>();
  const usedSequences = new Set<number>();
  let nextFreshSequence = initialHighWater + 1;
  const assignments: HeatCapacityFreeBatchTrialIdentityAssignment[] = [];

  const takeFreshSequence = () => {
    while (usedSequences.has(nextFreshSequence)) nextFreshSequence += 1;
    if (
      !Number.isSafeInteger(nextFreshSequence) ||
      nextFreshSequence >= Number.MAX_SAFE_INTEGER
    ) {
      return null;
    }
    const sequence = nextFreshSequence;
    usedSequences.add(sequence);
    nextFreshSequence += 1;
    return sequence;
  };

  for (let trialIndex = 0; trialIndex < trials.length; trialIndex += 1) {
    const trial = trials[trialIndex]!;
    const parsedSequence = readLegacyTrialSequence(trial.id);
    let sequence = parsedSequence !== null && !usedSequences.has(parsedSequence)
      ? parsedSequence
      : takeFreshSequence();
    if (sequence === null) {
      return invalidAggregateMigrationPlan(
        sourceVersion,
        'Free batch trial identity space is exhausted.',
      );
    }
    usedSequences.add(sequence);

    let id = trial.id;
    if (usedIds.has(id)) {
      let generatedId = createTrialId(legacy.id, sequence);
      while (
        generatedId.trim() === '' ||
        usedIds.has(generatedId) ||
        protectedUniqueSourceIds.has(generatedId)
      ) {
        const freshSequence = takeFreshSequence();
        if (freshSequence === null) {
          return invalidAggregateMigrationPlan(
            sourceVersion,
            'Free batch trial identity space is exhausted.',
          );
        }
        sequence = freshSequence;
        generatedId = createTrialId(legacy.id, sequence);
      }
      id = generatedId;
    }
    usedIds.add(id);
    assignments.push({
      trialIndex,
      previousId: trial.id,
      id,
      batchMembership: {
        version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
        batchId: legacy.id,
        sequence,
      },
      idChanged: id !== trial.id,
    });
  }

  const maximumAssignedSequence = Math.max(
    initialHighWater,
    ...assignments.map((assignment) => assignment.batchMembership.sequence),
  );
  if (maximumAssignedSequence >= Number.MAX_SAFE_INTEGER) {
    return invalidAggregateMigrationPlan(
      sourceVersion,
      'Free batch trial identity space is exhausted.',
    );
  }
  const trialIdRewrites = assignments
    .filter((assignment) => assignment.idChanged)
    .map((assignment) => ({
      trialIndex: assignment.trialIndex,
      previousId: assignment.previousId,
      id: assignment.id,
    }));
  return {
    ok: true,
    status: trialIdRewrites.length > 0
      ? 'relationship-repair-required'
      : 'migrated',
    sourceVersion,
    batch: migrateHeatCapacityFreeBatchStateV1ToV2(
      legacy,
      maximumAssignedSequence + 1,
    ),
    assignments,
    trialIdRewrites,
  };
};

export const getCompletedHeatCapacityFreeBatchTrials = (
  state: HeatCapacityFreeBatchState,
  trials: readonly HeatCapacityFreeTrial[],
) => trials.filter((trial) => (
  state.id !== null &&
  trial.batchMembership?.version ===
    HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION &&
  trial.batchMembership?.batchId === state.id &&
  Number.isSafeInteger(trial.batchMembership.sequence) &&
  trial.batchMembership.sequence >= 1 &&
  trial.completedAtMs !== null &&
  isHeatCapacityFreeTrialComplete(trial)
));

export const deriveHeatCapacityFreeBatchProgress = (
  state: HeatCapacityFreeBatchState,
  trials: readonly HeatCapacityFreeTrial[],
): HeatCapacityFreeBatchProgress => {
  const completedGroupCount =
    getCompletedHeatCapacityFreeBatchTrials(state, trials).length;
  const targetGroupCount = state.targetGroupCount;
  const allGroupsRecorded = targetGroupCount !== null && completedGroupCount >= targetGroupCount;
  return {
    configured: targetGroupCount !== null,
    locked: state.startedAtMs !== null,
    targetGroupCount,
    completedGroupCount,
    currentGroupNumber: targetGroupCount === null
      ? null
      : allGroupsRecorded
        ? targetGroupCount
        : Math.min(targetGroupCount, completedGroupCount + 1),
    allGroupsRecorded,
  };
};

export const isHeatCapacityFreeBatchLocked = (
  state: HeatCapacityFreeBatchState,
) => state.startedAtMs !== null && state.frozenConfigSnapshot !== null;

export const shouldStartHeatCapacityFreeBatchCalculation = (
  state: HeatCapacityFreeBatchState,
  trials: readonly HeatCapacityFreeTrial[],
  powerOn: boolean,
) => (
  state.startedAtMs !== null &&
  state.experimentCompletedAtMs === null &&
  !powerOn &&
  deriveHeatCapacityFreeBatchProgress(state, trials).allGroupsRecorded
);
