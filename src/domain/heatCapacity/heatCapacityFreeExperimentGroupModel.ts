import {
  completeHeatCapacityFreeBatchExperiment,
  configureHeatCapacityFreeBatch,
  createEmptyHeatCapacityFreeBatchState,
  deriveHeatCapacityFreeBatchProgress,
  startHeatCapacityFreeBatch,
  type HeatCapacityFreeBatchGroupCount,
  type HeatCapacityFreeBatchState,
  type HeatCapacityFreeScoringVersion,
  HEAT_CAPACITY_FREE_SCORING_VERSION,
} from './heatCapacityFreeBatchModel.ts';
import type {
  HeatCapacityCalculationWorkflowSession,
} from './heatCapacityCalculationWorkflowModel.ts';
import type {
  HeatCapacityFreeBatchScore,
} from './heatCapacityFreeProcessReviewTypes.ts';
import type {
  HeatCapacityFreeGasType,
} from './heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeProcessingResult,
  HeatCapacityFreeTrial,
} from './heatCapacityFreeTrialModel.ts';
import {
  createDefaultFreeTraceStore,
  type HeatCapacityFreeConfigSnapshot,
  type HeatCapacityFreeTraceStore,
} from './heatCapacityFreeTraceModel.ts';

export const HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_COLLECTION_VERSION = 1 as const;
export const HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_RECORD_VERSION = 1 as const;

export type HeatCapacityFreeExperimentGroupScheme = 'real' | 'ideal';

export type HeatCapacityFreeExperimentGroupLifecycleStatus =
  | 'draft'
  | 'collecting'
  | 'awaiting-real-calculation'
  | 'awaiting-ideal-calculation'
  | 'awaiting-ideal-processing'
  | 'completed'
  | 'legacy-incomplete-readonly';

export interface HeatCapacityFreeExperimentGroupRunSeries {
  batch: HeatCapacityFreeBatchState;
  trials: HeatCapacityFreeTrial[];
  traceStore: HeatCapacityFreeTraceStore;
}

export type HeatCapacityFreeExperimentGroupCalculation =
  | {
      kind: 'real-interactive';
      session: HeatCapacityCalculationWorkflowSession;
    }
  | {
      kind: 'ideal-interactive';
      session: HeatCapacityCalculationWorkflowSession;
    }
  | {
      /** Historical Ideal groups completed before the interactive workflow was introduced. */
      kind: 'ideal-automatic';
      result: HeatCapacityFreeProcessingResult;
    };

export interface HeatCapacityFreeLegacyCompatibilityRecord {
  source: 'legacy-free-domain';
  sourceScheme: HeatCapacityFreeExperimentGroupScheme;
  orderUnknown: boolean;
  note: string | null;
  archivedCalculationSession: HeatCapacityCalculationWorkflowSession | null;
}

export interface HeatCapacityFreeExperimentGroupRecord {
  version: typeof HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_RECORD_VERSION;
  id: string;
  scheme: HeatCapacityFreeExperimentGroupScheme;
  schemeGroupNumber: number | null;
  globalOrder: number | null;
  status: HeatCapacityFreeExperimentGroupLifecycleStatus;
  targetExperimentCount: HeatCapacityFreeBatchGroupCount;
  gasType: HeatCapacityFreeGasType;
  parameterSnapshot: HeatCapacityFreeConfigSnapshot | null;
  runSeries: HeatCapacityFreeExperimentGroupRunSeries;
  calculation: HeatCapacityFreeExperimentGroupCalculation | null;
  finalScore: HeatCapacityFreeBatchScore | null;
  scoringVersion: HeatCapacityFreeScoringVersion;
  createdAtMs: number;
  startedAtMs: number | null;
  acquisitionCompletedAtMs: number | null;
  completedAtMs: number | null;
  legacyCompatibility: HeatCapacityFreeLegacyCompatibilityRecord | null;
}

export interface HeatCapacityFreeExperimentGroupCapacityEstimate {
  bytes: number;
  measuredAtMs: number | null;
}

export interface HeatCapacityFreeExperimentGroupCollection {
  version: typeof HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_COLLECTION_VERSION;
  groups: HeatCapacityFreeExperimentGroupRecord[];
  currentGroupId: string | null;
  viewedGroupId: string | null;
  pendingNextScheme: HeatCapacityFreeExperimentGroupScheme;
  lastViewedTrialIdByGroupId: Record<string, string | null>;
  nextSchemeGroupNumber: Record<HeatCapacityFreeExperimentGroupScheme, number>;
  nextGlobalOrder: number;
  capacityEstimate: HeatCapacityFreeExperimentGroupCapacityEstimate;
}

export interface CreateHeatCapacityFreeExperimentGroupDraftInput {
  id: string;
  scheme: HeatCapacityFreeExperimentGroupScheme;
  gasType: HeatCapacityFreeGasType;
  targetExperimentCount: HeatCapacityFreeBatchGroupCount;
  now?: number;
}

const isPositiveSafeInteger = (value: number) => (
  Number.isSafeInteger(value) && value >= 1
);

const isTimestamp = (value: number | null) => (
  value === null || (Number.isFinite(value) && value >= 0)
);

export const isHeatCapacityFreeExperimentGroupExecutableUnfinished = (
  group: Pick<HeatCapacityFreeExperimentGroupRecord, 'status'>,
) => (
  group.status === 'draft' ||
  group.status === 'collecting' ||
  group.status === 'awaiting-real-calculation' ||
  group.status === 'awaiting-ideal-calculation' ||
  group.status === 'awaiting-ideal-processing'
);

export const createEmptyHeatCapacityFreeExperimentGroupCollection = (
  pendingNextScheme: HeatCapacityFreeExperimentGroupScheme = 'real',
): HeatCapacityFreeExperimentGroupCollection => ({
  version: HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_COLLECTION_VERSION,
  groups: [],
  currentGroupId: null,
  viewedGroupId: null,
  pendingNextScheme,
  lastViewedTrialIdByGroupId: {},
  nextSchemeGroupNumber: {
    real: 1,
    ideal: 1,
  },
  nextGlobalOrder: 1,
  capacityEstimate: {
    bytes: 0,
    measuredAtMs: null,
  },
});

export const selectHeatCapacityFreeExperimentGroupById = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  groupId: string | null,
) => groupId === null
  ? null
  : collection.groups.find((group) => group.id === groupId) ?? null;

export const selectCurrentHeatCapacityFreeExperimentGroup = (
  collection: HeatCapacityFreeExperimentGroupCollection,
) => selectHeatCapacityFreeExperimentGroupById(
  collection,
  collection.currentGroupId,
);

export const selectViewedHeatCapacityFreeExperimentGroup = (
  collection: HeatCapacityFreeExperimentGroupCollection,
) => selectHeatCapacityFreeExperimentGroupById(
  collection,
  collection.viewedGroupId,
);

export const getHeatCapacityFreeExperimentGroupInvariantErrors = (
  collection: HeatCapacityFreeExperimentGroupCollection,
): string[] => {
  const errors: string[] = [];
  if (collection.version !== HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_COLLECTION_VERSION) {
    errors.push('Experiment-group collection version is unsupported.');
  }
  if (!isPositiveSafeInteger(collection.nextGlobalOrder)) {
    errors.push('Next global experiment-group order must be a positive safe integer.');
  }
  if (
    !isPositiveSafeInteger(collection.nextSchemeGroupNumber.real) ||
    !isPositiveSafeInteger(collection.nextSchemeGroupNumber.ideal)
  ) {
    errors.push('Next scheme experiment-group numbers must be positive safe integers.');
  }

  const ids = new Set<string>();
  const globalOrders = new Set<number>();
  const schemeNumbers = {
    real: new Set<number>(),
    ideal: new Set<number>(),
  };
  let executableUnfinishedCount = 0;
  for (const group of collection.groups) {
    if (group.id.trim() === '' || ids.has(group.id)) {
      errors.push('Experiment-group identities must be non-empty and unique.');
    }
    ids.add(group.id);
    if (!isTimestamp(group.createdAtMs) || !isTimestamp(group.startedAtMs) ||
      !isTimestamp(group.acquisitionCompletedAtMs) || !isTimestamp(group.completedAtMs)) {
      errors.push(`Experiment group ${group.id} contains an invalid timestamp.`);
    }
    if (group.status === 'draft') {
      if (
        group.schemeGroupNumber !== null ||
        group.globalOrder !== null ||
        group.parameterSnapshot !== null ||
        group.startedAtMs !== null
      ) {
        errors.push(`Draft experiment group ${group.id} cannot own a formal identity or snapshot.`);
      }
    } else if (
      group.schemeGroupNumber === null ||
      group.globalOrder === null ||
      !isPositiveSafeInteger(group.schemeGroupNumber) ||
      !isPositiveSafeInteger(group.globalOrder)
    ) {
      errors.push(`Formal experiment group ${group.id} is missing its stable numbering.`);
    }
    if (group.schemeGroupNumber !== null) {
      if (schemeNumbers[group.scheme].has(group.schemeGroupNumber)) {
        errors.push(`Experiment-group number ${group.schemeGroupNumber} is duplicated for ${group.scheme}.`);
      }
      schemeNumbers[group.scheme].add(group.schemeGroupNumber);
    }
    if (group.globalOrder !== null) {
      if (globalOrders.has(group.globalOrder)) {
        errors.push(`Global experiment-group order ${group.globalOrder} is duplicated.`);
      }
      globalOrders.add(group.globalOrder);
    }
    if (isHeatCapacityFreeExperimentGroupExecutableUnfinished(group)) {
      executableUnfinishedCount += 1;
    }
    if (group.status === 'completed') {
      if (group.completedAtMs === null || group.acquisitionCompletedAtMs === null) {
        errors.push(`Completed experiment group ${group.id} is missing completion timestamps.`);
      }
      if (group.scheme === 'real') {
        if (
          group.calculation?.kind !== 'real-interactive' ||
          group.calculation.session.status !== 'completed' ||
          group.finalScore === null
        ) {
          errors.push(`Completed real experiment group ${group.id} is missing calculation or score.`);
        }
      } else {
        const calculationCompleted = group.calculation?.kind === 'ideal-automatic' ||
          (
            group.calculation?.kind === 'ideal-interactive' &&
            group.calculation.session.status === 'completed'
          );
        if (!calculationCompleted || group.finalScore !== null) {
          errors.push(`Completed ideal experiment group ${group.id} is missing calculation or owns a score.`);
        }
      }
    }
  }
  if (executableUnfinishedCount > 1) {
    errors.push('Only one executable unfinished experiment group is allowed.');
  }
  if (collection.currentGroupId !== null && !ids.has(collection.currentGroupId)) {
    errors.push('Current experiment-group identity does not exist.');
  }
  if (collection.viewedGroupId !== null && !ids.has(collection.viewedGroupId)) {
    errors.push('Viewed experiment-group identity does not exist.');
  }
  for (const [groupId, trialId] of Object.entries(collection.lastViewedTrialIdByGroupId)) {
    const group = collection.groups.find((candidate) => candidate.id === groupId);
    if (!group || (trialId !== null && !group.runSeries.trials.some((trial) => trial.id === trialId))) {
      errors.push(`Last-viewed experiment reference for ${groupId} is invalid.`);
    }
  }
  return errors;
};

export const assertHeatCapacityFreeExperimentGroupCollection = (
  collection: HeatCapacityFreeExperimentGroupCollection,
) => {
  const errors = getHeatCapacityFreeExperimentGroupInvariantErrors(collection);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
  return collection;
};

export const createHeatCapacityFreeExperimentGroupDraft = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  input: CreateHeatCapacityFreeExperimentGroupDraftInput,
): HeatCapacityFreeExperimentGroupCollection => {
  if (
    input.id.trim() === '' ||
    collection.groups.some((group) => group.id === input.id) ||
    collection.groups.some(isHeatCapacityFreeExperimentGroupExecutableUnfinished)
  ) {
    return collection;
  }
  const now = input.now ?? Date.now();
  const batch = configureHeatCapacityFreeBatch(
    createEmptyHeatCapacityFreeBatchState(),
    input.targetExperimentCount,
    input.id,
    now,
  );
  const group: HeatCapacityFreeExperimentGroupRecord = {
    version: HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_RECORD_VERSION,
    id: input.id,
    scheme: input.scheme,
    schemeGroupNumber: null,
    globalOrder: null,
    status: 'draft',
    targetExperimentCount: input.targetExperimentCount,
    gasType: input.gasType,
    parameterSnapshot: null,
    runSeries: {
      batch,
      trials: [],
      traceStore: createDefaultFreeTraceStore(),
    },
    calculation: null,
    finalScore: null,
    scoringVersion: HEAT_CAPACITY_FREE_SCORING_VERSION,
    createdAtMs: now,
    startedAtMs: null,
    acquisitionCompletedAtMs: null,
    completedAtMs: null,
    legacyCompatibility: null,
  };
  return assertHeatCapacityFreeExperimentGroupCollection({
    ...collection,
    groups: [...collection.groups, group],
    currentGroupId: group.id,
    viewedGroupId: group.id,
    pendingNextScheme: input.scheme,
    lastViewedTrialIdByGroupId: {
      ...collection.lastViewedTrialIdByGroupId,
      [group.id]: null,
    },
  });
};

const replaceGroup = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  group: HeatCapacityFreeExperimentGroupRecord,
) => assertHeatCapacityFreeExperimentGroupCollection({
  ...collection,
  groups: collection.groups.map((candidate) => (
    candidate.id === group.id ? group : candidate
  )),
});

export const setHeatCapacityFreeExperimentGroupDraftScheme = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  scheme: HeatCapacityFreeExperimentGroupScheme,
  gasType: HeatCapacityFreeGasType,
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (!group || group.status !== 'draft') return collection;
  return replaceGroup({
    ...collection,
    pendingNextScheme: scheme,
  }, {
    ...group,
    scheme,
    gasType,
  });
};

export const setHeatCapacityFreeExperimentGroupDraftTargetCount = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  targetExperimentCount: HeatCapacityFreeBatchGroupCount,
  now = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (!group || group.status !== 'draft') return collection;
  const batch = configureHeatCapacityFreeBatch(
    group.runSeries.batch,
    targetExperimentCount,
    group.id,
    now,
  );
  return replaceGroup(collection, {
    ...group,
    targetExperimentCount,
    runSeries: {
      ...group.runSeries,
      batch,
    },
  });
};

export const startHeatCapacityFreeExperimentGroup = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  parameterSnapshot: HeatCapacityFreeConfigSnapshot,
  now = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (!group || group.status !== 'draft') return collection;
  const schemeGroupNumber = collection.nextSchemeGroupNumber[group.scheme];
  const globalOrder = collection.nextGlobalOrder;
  if (!isPositiveSafeInteger(schemeGroupNumber) || !isPositiveSafeInteger(globalOrder)) {
    throw new RangeError('Experiment-group identity space is invalid.');
  }
  const startedBatch = startHeatCapacityFreeBatch(
    group.runSeries.batch,
    parameterSnapshot,
    now,
  );
  if (startedBatch === group.runSeries.batch) return collection;
  return replaceGroup({
    ...collection,
    nextSchemeGroupNumber: {
      ...collection.nextSchemeGroupNumber,
      [group.scheme]: schemeGroupNumber + 1,
    },
    nextGlobalOrder: globalOrder + 1,
  }, {
    ...group,
    schemeGroupNumber,
    globalOrder,
    status: 'collecting',
    parameterSnapshot,
    startedAtMs: now,
    runSeries: {
      ...group.runSeries,
      batch: startedBatch,
    },
  });
};

export const updateCurrentHeatCapacityFreeExperimentGroupRunSeries = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  runSeries: HeatCapacityFreeExperimentGroupRunSeries,
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (!group || !isHeatCapacityFreeExperimentGroupExecutableUnfinished(group)) {
    return collection;
  }
  return replaceGroup(collection, {
    ...group,
    runSeries,
  });
};

export const raiseCurrentHeatCapacityFreeExperimentGroupHighWaterMarks = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  highWaterMarks: {
    nextTrialSequence: number;
    nextTraceTrialIndex: number;
  },
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (!group || group.runSeries.batch.id === null) return collection;
  const nextTraceTrialIndex = Math.max(
    group.runSeries.traceStore.nextTraceTrialIndex,
    highWaterMarks.nextTraceTrialIndex,
  );
  const nextTrialSequence = Math.max(
    group.runSeries.batch.nextTrialSequence,
    highWaterMarks.nextTrialSequence,
    nextTraceTrialIndex,
  );
  if (
    nextTraceTrialIndex === group.runSeries.traceStore.nextTraceTrialIndex &&
    nextTrialSequence === group.runSeries.batch.nextTrialSequence
  ) {
    return collection;
  }
  return replaceGroup(collection, {
    ...group,
    runSeries: {
      ...group.runSeries,
      batch: {
        ...group.runSeries.batch,
        nextTrialSequence,
      },
      traceStore: {
        ...group.runSeries.traceStore,
        nextTraceTrialIndex,
      },
    },
  });
};

export const updateCurrentHeatCapacityFreeRealCalculationSession = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  session: HeatCapacityCalculationWorkflowSession,
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'awaiting-real-calculation' ||
    group.scheme !== 'real' ||
    session.mode !== 'free' ||
    session.presentation !== 'interactive'
  ) {
    return collection;
  }
  return replaceGroup(collection, {
    ...group,
    calculation: {
      kind: 'real-interactive',
      session,
    },
    runSeries: {
      ...group.runSeries,
      batch: {
        ...group.runSeries.batch,
        calculationSession: session,
      },
    },
  });
};

export const updateCurrentHeatCapacityFreeIdealCalculationSession = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  session: HeatCapacityCalculationWorkflowSession,
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'awaiting-ideal-calculation' ||
    group.scheme !== 'ideal' ||
    session.mode !== 'free' ||
    session.presentation !== 'interactive'
  ) {
    return collection;
  }
  return replaceGroup(collection, {
    ...group,
    calculation: {
      kind: 'ideal-interactive',
      session,
    },
    runSeries: {
      ...group.runSeries,
      batch: {
        ...group.runSeries.batch,
        calculationSession: session,
      },
    },
  });
};

export const beginHeatCapacityFreeRealGroupCalculation = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  session: HeatCapacityCalculationWorkflowSession,
  now = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'collecting' ||
    group.scheme !== 'real' ||
    session.mode !== 'free' ||
    session.presentation !== 'interactive' ||
    !deriveHeatCapacityFreeBatchProgress(
      group.runSeries.batch,
      group.runSeries.trials,
    ).allGroupsRecorded
  ) {
    return collection;
  }
  const batch = completeHeatCapacityFreeBatchExperiment(
    {
      ...group.runSeries.batch,
      calculationSession: session,
    },
    now,
  );
  return replaceGroup(collection, {
    ...group,
    status: 'awaiting-real-calculation',
    acquisitionCompletedAtMs: now,
    runSeries: {
      ...group.runSeries,
      batch,
    },
    calculation: {
      kind: 'real-interactive',
      session,
    },
  });
};

export const beginHeatCapacityFreeIdealGroupCalculation = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  session: HeatCapacityCalculationWorkflowSession,
  now = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'collecting' ||
    group.scheme !== 'ideal' ||
    session.mode !== 'free' ||
    session.presentation !== 'interactive' ||
    !deriveHeatCapacityFreeBatchProgress(
      group.runSeries.batch,
      group.runSeries.trials,
    ).allGroupsRecorded
  ) {
    return collection;
  }
  const batch = completeHeatCapacityFreeBatchExperiment(
    {
      ...group.runSeries.batch,
      calculationSession: session,
    },
    now,
  );
  return replaceGroup(collection, {
    ...group,
    status: 'awaiting-ideal-calculation',
    acquisitionCompletedAtMs: now,
    runSeries: {
      ...group.runSeries,
      batch,
    },
    calculation: {
      kind: 'ideal-interactive',
      session,
    },
  });
};

/**
 * Compatibility-only transition for Ideal groups saved by releases that
 * calculated results automatically. New groups use the interactive workflow.
 */
export const beginHeatCapacityFreeIdealGroupProcessing = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  now = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'collecting' ||
    group.scheme !== 'ideal' ||
    !deriveHeatCapacityFreeBatchProgress(
      group.runSeries.batch,
      group.runSeries.trials,
    ).allGroupsRecorded
  ) {
    return collection;
  }
  return replaceGroup(collection, {
    ...group,
    status: 'awaiting-ideal-processing',
    acquisitionCompletedAtMs: now,
    runSeries: {
      ...group.runSeries,
      batch: completeHeatCapacityFreeBatchExperiment(group.runSeries.batch, now),
    },
  });
};

export const completeHeatCapacityFreeRealExperimentGroup = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  session: HeatCapacityCalculationWorkflowSession,
  finalScore: HeatCapacityFreeBatchScore,
  now = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'awaiting-real-calculation' ||
    group.scheme !== 'real' ||
    session.mode !== 'free' ||
    session.presentation !== 'interactive' ||
    session.status !== 'completed' ||
    finalScore.total === null
  ) {
    return collection;
  }
  return replaceGroup(collection, {
    ...group,
    status: 'completed',
    completedAtMs: now,
    calculation: {
      kind: 'real-interactive',
      session,
    },
    finalScore,
    runSeries: {
      ...group.runSeries,
      batch: {
        ...group.runSeries.batch,
        calculationSession: session,
      },
    },
  });
};

export const completeHeatCapacityFreeIdealExperimentGroupCalculation = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  session: HeatCapacityCalculationWorkflowSession,
  now = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'awaiting-ideal-calculation' ||
    group.scheme !== 'ideal' ||
    session.mode !== 'free' ||
    session.presentation !== 'interactive' ||
    session.status !== 'completed'
  ) {
    return collection;
  }
  return replaceGroup(collection, {
    ...group,
    status: 'completed',
    completedAtMs: now,
    calculation: {
      kind: 'ideal-interactive',
      session,
    },
    finalScore: null,
    runSeries: {
      ...group.runSeries,
      batch: {
        ...group.runSeries.batch,
        calculationSession: session,
      },
    },
  });
};

/** Compatibility-only completion for historical automatic Ideal results. */
export const completeHeatCapacityFreeIdealExperimentGroup = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  result: HeatCapacityFreeProcessingResult,
  now = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'awaiting-ideal-processing' ||
    group.scheme !== 'ideal' ||
    result.status !== 'ready' ||
    result.validTrialCount < group.targetExperimentCount
  ) {
    return collection;
  }
  return replaceGroup(collection, {
    ...group,
    status: 'completed',
    completedAtMs: now,
    calculation: {
      kind: 'ideal-automatic',
      result,
    },
    finalScore: null,
  });
};

export const restartCurrentHeatCapacityFreeExperimentGroup = (
  collection: HeatCapacityFreeExperimentGroupCollection,
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (
    !group ||
    group.status !== 'collecting' ||
    group.parameterSnapshot === null
  ) {
    return collection;
  }
  return replaceGroup({
    ...collection,
    lastViewedTrialIdByGroupId: {
      ...collection.lastViewedTrialIdByGroupId,
      [group.id]: null,
    },
  }, {
    ...group,
    acquisitionCompletedAtMs: null,
    completedAtMs: null,
    calculation: null,
    finalScore: null,
    runSeries: {
      batch: {
        ...group.runSeries.batch,
        nextTrialSequence: 1,
        experimentCompletedAtMs: null,
        calculationSession: null,
      },
      trials: [],
      traceStore: createDefaultFreeTraceStore(),
    },
  });
};

const getMostRecentCompletedGroup = (
  groups: readonly HeatCapacityFreeExperimentGroupRecord[],
) => [...groups]
  .filter((group) => (
    group.status === 'completed' || group.status === 'legacy-incomplete-readonly'
  ))
  .sort((left, right) => (right.globalOrder ?? 0) - (left.globalOrder ?? 0))[0] ?? null;

export const abandonCurrentHeatCapacityFreeExperimentGroupDraft = (
  collection: HeatCapacityFreeExperimentGroupCollection,
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (!group || group.status !== 'draft') return collection;
  const groups = collection.groups.filter((candidate) => candidate.id !== group.id);
  const fallback = getMostRecentCompletedGroup(groups);
  const lastViewedTrialIdByGroupId = {
    ...collection.lastViewedTrialIdByGroupId,
  };
  delete lastViewedTrialIdByGroupId[group.id];
  return assertHeatCapacityFreeExperimentGroupCollection({
    ...collection,
    groups,
    currentGroupId: fallback?.id ?? null,
    viewedGroupId: fallback?.id ?? null,
    pendingNextScheme: group.scheme,
    lastViewedTrialIdByGroupId,
  });
};

export const setHeatCapacityFreePendingNextGroupScheme = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  scheme: HeatCapacityFreeExperimentGroupScheme,
): HeatCapacityFreeExperimentGroupCollection => {
  const current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
  if (current && isHeatCapacityFreeExperimentGroupExecutableUnfinished(current)) {
    return collection;
  }
  return {
    ...collection,
    pendingNextScheme: scheme,
  };
};

export const selectHeatCapacityFreeViewedExperimentGroup = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  groupId: string,
): HeatCapacityFreeExperimentGroupCollection => (
  collection.groups.some((group) => group.id === groupId)
    ? {
        ...collection,
        viewedGroupId: groupId,
      }
    : collection
);

export const selectHeatCapacityFreeViewedTrial = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  groupId: string,
  trialId: string | null,
): HeatCapacityFreeExperimentGroupCollection => {
  const group = selectHeatCapacityFreeExperimentGroupById(collection, groupId);
  if (!group || (trialId !== null && !group.runSeries.trials.some((trial) => trial.id === trialId))) {
    return collection;
  }
  return {
    ...collection,
    lastViewedTrialIdByGroupId: {
      ...collection.lastViewedTrialIdByGroupId,
      [groupId]: trialId,
    },
  };
};

export const updateHeatCapacityFreeExperimentGroupCapacityEstimate = (
  collection: HeatCapacityFreeExperimentGroupCollection,
  bytes: number,
  measuredAtMs = Date.now(),
): HeatCapacityFreeExperimentGroupCollection => {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || !Number.isFinite(measuredAtMs) || measuredAtMs < 0) {
    return collection;
  }
  return {
    ...collection,
    capacityEstimate: {
      bytes,
      measuredAtMs,
    },
  };
};
