import {
  deriveHeatCapacityFreeBatchProgress,
  HEAT_CAPACITY_FREE_SCORING_VERSION,
} from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  calculateHeatCapacityFreeBatchScore,
} from '../../domain/heatCapacity/heatCapacityFreeBatchScoringModel.ts';
import {
  assertHeatCapacityFreeExperimentGroupCollection,
  HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_COLLECTION_VERSION,
  HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_RECORD_VERSION,
  isHeatCapacityFreeExperimentGroupExecutableUnfinished,
  type HeatCapacityFreeExperimentGroupCollection,
  type HeatCapacityFreeExperimentGroupLifecycleStatus,
  type HeatCapacityFreeExperimentGroupRecord,
  type HeatCapacityFreeExperimentGroupScheme,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import {
  calculateFreeHeatCapacityMeanResult,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import type {
  HeatCapacityFreeExperimentDomainState,
} from './workbenchState.ts';

interface MigrateLegacyHeatCapacityExperimentGroupsInput {
  fileId: string;
  selectedScheme: HeatCapacityFreeExperimentGroupScheme;
  real: HeatCapacityFreeExperimentDomainState;
  ideal: HeatCapacityFreeExperimentDomainState;
  fallbackCreatedAtMs?: number;
}

interface LegacyGroupCandidate {
  group: HeatCapacityFreeExperimentGroupRecord;
  sortTimestamp: number | null;
}

const hasLegacyFormalData = (
  domain: HeatCapacityFreeExperimentDomainState,
) => (
  domain.batch.startedAtMs !== null ||
  domain.batch.experimentCompletedAtMs !== null ||
  domain.batch.calculationSession !== null ||
  domain.trials.length > 0 ||
  domain.traceStore.traceTrials.length > 0
);

const latestTrialCompletion = (
  domain: HeatCapacityFreeExperimentDomainState,
) => domain.trials.reduce<number | null>((latest, trial) => (
  trial.completedAtMs === null
    ? latest
    : latest === null
      ? trial.completedAtMs
      : Math.max(latest, trial.completedAtMs)
), null);

const earliestLegacyTimestamp = (
  domain: HeatCapacityFreeExperimentDomainState,
) => {
  const values = [
    domain.batch.configuredAtMs,
    domain.batch.startedAtMs,
    ...domain.trials.map((trial) => trial.completedAtMs),
  ].filter((value): value is number => value !== null && Number.isFinite(value));
  return values.length === 0 ? null : Math.min(...values);
};

const calculateLegacyRealFinalScore = (
  group: Pick<HeatCapacityFreeExperimentGroupRecord, 'runSeries' | 'calculation' | 'scoringVersion'>,
) => {
  const session = group.calculation?.kind === 'real-interactive'
    ? group.calculation.session
    : null;
  const operationScoresByTrialId = new Map(group.runSeries.trials.map((trial) => [
    trial.id,
    selectHeatCapacityFreeProcessReview({
      trials: group.runSeries.trials,
      traceStore: group.runSeries.traceStore,
      selectedTrialId: trial.id,
      theoreticalGamma: session?.theoreticalGamma,
      calculationSession: session,
      scoringVersion: group.scoringVersion,
    }).score,
  ]));
  return calculateHeatCapacityFreeBatchScore({
    session,
    operationScoresByTrialId,
  });
};

const createLegacyGroupCandidate = (
  fileId: string,
  scheme: HeatCapacityFreeExperimentGroupScheme,
  domain: HeatCapacityFreeExperimentDomainState,
  fallbackCreatedAtMs: number,
): LegacyGroupCandidate | null => {
  if (!hasLegacyFormalData(domain) || domain.batch.targetGroupCount === null) {
    return null;
  }
  const progress = deriveHeatCapacityFreeBatchProgress(domain.batch, domain.trials);
  const acquisitionCompletedAtMs = progress.allGroupsRecorded
    ? domain.batch.experimentCompletedAtMs ?? latestTrialCompletion(domain)
    : null;
  const legacySession = domain.batch.calculationSession;
  const idealResult = scheme === 'ideal' && progress.allGroupsRecorded
    ? calculateFreeHeatCapacityMeanResult(domain.trials, {
        theoreticalGamma:
          domain.batch.frozenConfigSnapshot?.physics.gamma ??
          domain.physicsConfig.gamma,
      })
    : null;
  let status: HeatCapacityFreeExperimentGroupLifecycleStatus;
  if (scheme === 'ideal' && idealResult?.status === 'ready') {
    status = 'completed';
  } else if (
    scheme === 'real' &&
    progress.allGroupsRecorded &&
    legacySession?.status === 'completed'
  ) {
    status = 'completed';
  } else if (scheme === 'real' && progress.allGroupsRecorded) {
    status = 'awaiting-real-calculation';
  } else if (scheme === 'ideal' && progress.allGroupsRecorded) {
    status = 'legacy-incomplete-readonly';
  } else {
    status = 'collecting';
  }
  const sortTimestamp = earliestLegacyTimestamp(domain);
  const startedAtMs = domain.batch.startedAtMs ?? sortTimestamp ?? fallbackCreatedAtMs;
  const completedAtMs = status === 'completed'
    ? scheme === 'real'
      ? legacySession?.completedAtMs ?? acquisitionCompletedAtMs ?? startedAtMs
      : acquisitionCompletedAtMs ?? startedAtMs
    : null;
  const archivedCalculationSession = scheme === 'ideal'
    ? legacySession
    : null;
  const calculation = scheme === 'real' && legacySession !== null
    ? {
        kind: 'real-interactive' as const,
        session: legacySession,
      }
    : scheme === 'ideal' && idealResult?.status === 'ready'
      ? {
          kind: 'ideal-automatic' as const,
          result: idealResult,
        }
      : null;
  const groupBase: HeatCapacityFreeExperimentGroupRecord = {
    version: HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_RECORD_VERSION,
    id: `${fileId}:legacy:${scheme}:group:1`,
    scheme,
    schemeGroupNumber: 1,
    globalOrder: 1,
    status,
    targetExperimentCount: domain.batch.targetGroupCount,
    gasType: scheme === 'ideal' ? 'air' : domain.gasType,
    parameterSnapshot:
      domain.batch.frozenConfigSnapshot ??
      domain.trials.find((trial) => trial.configSnapshot !== null)?.configSnapshot ??
      null,
    runSeries: {
      batch: domain.batch,
      trials: domain.trials,
      traceStore: domain.traceStore,
    },
    calculation,
    finalScore: null,
    scoringVersion: domain.batch.scoringVersion ?? HEAT_CAPACITY_FREE_SCORING_VERSION,
    createdAtMs: sortTimestamp ?? fallbackCreatedAtMs,
    startedAtMs,
    acquisitionCompletedAtMs,
    completedAtMs,
    legacyCompatibility: {
      source: 'legacy-free-domain',
      sourceScheme: scheme,
      orderUnknown: sortTimestamp === null,
      note: archivedCalculationSession === null
        ? null
        : '旧版理想方案的交互式答题记录仅供审计，不参与评分或正式报告。',
      archivedCalculationSession,
    },
  };
  return {
    sortTimestamp,
    group: status === 'completed' && scheme === 'real'
      ? {
          ...groupBase,
          finalScore: calculateLegacyRealFinalScore(groupBase),
        }
      : groupBase,
  };
};

export const migrateLegacyHeatCapacityFreeExperimentGroups = ({
  fileId,
  selectedScheme,
  real,
  ideal,
  fallbackCreatedAtMs = 0,
}: MigrateLegacyHeatCapacityExperimentGroupsInput): HeatCapacityFreeExperimentGroupCollection => {
  const candidates = [
    createLegacyGroupCandidate(fileId, 'real', real, fallbackCreatedAtMs),
    createLegacyGroupCandidate(fileId, 'ideal', ideal, fallbackCreatedAtMs),
  ].filter((candidate): candidate is LegacyGroupCandidate => candidate !== null);
  const unfinished = candidates.filter(({ group }) => (
    isHeatCapacityFreeExperimentGroupExecutableUnfinished(group)
  ));
  const conflict = unfinished.length > 1;
  const conflictAdjusted = candidates.map((candidate) => (
    conflict &&
    candidate.group.scheme !== selectedScheme &&
    isHeatCapacityFreeExperimentGroupExecutableUnfinished(candidate.group)
      ? {
          ...candidate,
          group: {
            ...candidate.group,
            status: 'legacy-incomplete-readonly' as const,
            legacyCompatibility: {
              ...candidate.group.legacyCompatibility!,
              note: '旧文件的真实与理想方案同时未完成；未选中的方案已保留为只读记录。',
            },
          },
        }
      : candidate
  ));
  const timestamps = conflictAdjusted
    .map((candidate) => candidate.sortTimestamp)
    .filter((value): value is number => value !== null);
  const ambiguousOrder = conflictAdjusted.length > 1 && (
    timestamps.length !== conflictAdjusted.length ||
    new Set(timestamps).size !== timestamps.length
  );
  const sorted = [...conflictAdjusted].sort((left, right) => {
    if (left.sortTimestamp !== null && right.sortTimestamp !== null) {
      const byTime = left.sortTimestamp - right.sortTimestamp;
      if (byTime !== 0) return byTime;
    } else if (left.sortTimestamp !== null) {
      return -1;
    } else if (right.sortTimestamp !== null) {
      return 1;
    }
    return left.group.scheme === right.group.scheme
      ? 0
      : left.group.scheme === 'real'
        ? -1
        : 1;
  });
  const groups = sorted.map((candidate, index) => ({
    ...candidate.group,
    globalOrder: index + 1,
    legacyCompatibility: candidate.group.legacyCompatibility === null
      ? null
      : {
          ...candidate.group.legacyCompatibility,
          orderUnknown:
            candidate.group.legacyCompatibility.orderUnknown || ambiguousOrder,
        },
  }));
  const activeUnfinished = groups.find(isHeatCapacityFreeExperimentGroupExecutableUnfinished);
  const selected = groups.find((group) => group.scheme === selectedScheme);
  const current = activeUnfinished ?? selected ?? groups[groups.length - 1] ?? null;
  return assertHeatCapacityFreeExperimentGroupCollection({
    version: HEAT_CAPACITY_FREE_EXPERIMENT_GROUP_COLLECTION_VERSION,
    groups,
    currentGroupId: current?.id ?? null,
    viewedGroupId: current?.id ?? null,
    pendingNextScheme: selectedScheme,
    lastViewedTrialIdByGroupId: Object.fromEntries(groups.map((group) => [
      group.id,
      group.runSeries.trials[0]?.id ?? null,
    ])),
    nextSchemeGroupNumber: {
      real: groups.some((group) => group.scheme === 'real') ? 2 : 1,
      ideal: groups.some((group) => group.scheme === 'ideal') ? 2 : 1,
    },
    nextGlobalOrder: groups.length + 1,
    capacityEstimate: {
      bytes: 0,
      measuredAtMs: null,
    },
  });
};
