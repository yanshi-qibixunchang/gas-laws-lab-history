import {
  areHeatCapacityPersistenceValuesEqual,
  decodeHeatCapacityFreeExperimentDomainAggregate,
  isAllowedHeatCapacityFreeDomainAggregateCacheRepair,
  isAllowedHeatCapacityFreeDomainAggregateMigration,
} from './workbenchHeatCapacityFreeAggregateCodec.ts';
import {
  applyHeatCapacityFreeDomainToRuntimeFields,
  createDefaultHeatCapacityFile,
  createHeatCapacityFreeExperimentDomainStateFromFile,
  hasHeatCapacityFreeIdealThermalBoundaryContamination,
  type HeatCapacityFreeExperimentDomainState,
  type HeatCapacityFreeParameterScheme,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import {
  HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
  isHeatCapacityFreeTrialComplete,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';

export interface HeatCapacityFreeCaptureFailure {
  ok: false;
  status: 'unsupported-future' | 'quarantined';
  fieldPath: string;
  sourceVersion: unknown;
  raw: unknown;
  reason: string;
}

export interface HeatCapacityFreeCaptureSuccess {
  ok: true;
  status: 'exact' | 'migrated' | 'repaired-cache';
  file: WorkbenchHeatCapacityState;
}

export type HeatCapacityFreeCaptureResult =
  | HeatCapacityFreeCaptureSuccess
  | HeatCapacityFreeCaptureFailure;

interface CanonicalDomainResult {
  ok: true;
  status: 'exact' | 'migrated' | 'repaired-cache';
  value: HeatCapacityFreeExperimentDomainState;
}

const decodeCanonicalDomain = (
  raw: unknown,
  scheme: HeatCapacityFreeParameterScheme,
  gasType: WorkbenchHeatCapacityState['heatCapacityFreeGasType'],
  fallback: HeatCapacityFreeExperimentDomainState,
  fieldPath: string,
): CanonicalDomainResult | HeatCapacityFreeCaptureFailure => {
  const decoded = decodeHeatCapacityFreeExperimentDomainAggregate(
    raw,
    scheme,
    gasType,
    fallback,
  );
  if (decoded.ok === false) {
    return {
      ok: false,
      status: decoded.status,
      fieldPath: decoded.fieldPath
        ? `${fieldPath}.${decoded.fieldPath}`
        : fieldPath,
      sourceVersion: decoded.sourceVersion,
      raw: decoded.raw,
      reason: decoded.reason,
    };
  }
  const allowed = decoded.status === 'migrated'
    ? isAllowedHeatCapacityFreeDomainAggregateMigration(raw, decoded.value)
    : decoded.status === 'repaired-cache'
      ? isAllowedHeatCapacityFreeDomainAggregateCacheRepair(raw, decoded.value)
    : areHeatCapacityPersistenceValuesEqual(raw, decoded.value);
  if (!allowed) {
    return {
      ok: false,
      status: 'quarantined',
      fieldPath,
      sourceVersion: decoded.sourceVersion,
      raw,
      reason:
        'Free domain capture requires changes outside the supported aggregate migration.',
    };
  }
  return {
    ok: true,
    status: decoded.status,
    value: decoded.value,
  };
};

const preservesSameIdAuthority = <Entry extends { id: string }>(
  candidate: readonly Entry[],
  required: readonly Entry[],
) => candidate.length >= required.length &&
  required.every((entry, index) => (
    areHeatCapacityPersistenceValuesEqual(candidate[index], entry)
  ));

const preservesEstablishedValue = (
  candidate: unknown,
  required: unknown,
) => required === null ||
  areHeatCapacityPersistenceValuesEqual(candidate, required);

const hasCompleteBatchTrialAuthority = (
  domain: HeatCapacityFreeExperimentDomainState,
) => {
  if (
    domain.batch.id === null ||
    domain.batch.targetGroupCount === null ||
    domain.trials.length !== domain.batch.targetGroupCount
  ) {
    return false;
  }
  let previousSequence = 0;
  return domain.trials.every((trial) => {
    const membership = trial.batchMembership;
    if (
      membership?.version !==
        HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION ||
      membership.batchId !== domain.batch.id ||
      membership.sequence <= previousSequence ||
      trial.completedAtMs === null ||
      (
        domain.batch.experimentCompletedAtMs !== null &&
        trial.completedAtMs > domain.batch.experimentCompletedAtMs
      ) ||
      !isHeatCapacityFreeTrialComplete(trial)
    ) {
      return false;
    }
    previousSequence = membership.sequence;
    return true;
  });
};

const preservesBatchAuthority = (
  candidateDomain: HeatCapacityFreeExperimentDomainState,
  required: HeatCapacityFreeExperimentDomainState['batch'],
) => {
  const candidate = candidateDomain.batch;
  const hasCompletedTrials = hasCompleteBatchTrialAuthority(candidateDomain);
  const completionPreserved = required.experimentCompletedAtMs === null
    ? (
        candidate.experimentCompletedAtMs === null ||
        hasCompletedTrials
      )
    : candidate.experimentCompletedAtMs === required.experimentCompletedAtMs;
  const calculationPreserved = required.calculationSession === null
    ? (
        candidate.calculationSession === null ||
        (
          candidate.experimentCompletedAtMs !== null &&
          hasCompletedTrials &&
          candidate.targetGroupCount !== null &&
          candidate.calculationSession.groups.length ===
            candidate.targetGroupCount
        )
      )
    : areHeatCapacityPersistenceValuesEqual(
        candidate.calculationSession,
        required.calculationSession,
      );
  return (
    candidate.version === required.version &&
    candidate.id === required.id &&
    candidate.targetGroupCount === required.targetGroupCount &&
    candidate.configuredAtMs === required.configuredAtMs &&
  preservesEstablishedValue(
    candidate.frozenConfigSnapshot,
    required.frozenConfigSnapshot,
  ) &&
  preservesEstablishedValue(candidate.startedAtMs, required.startedAtMs) &&
    completionPreserved &&
    calculationPreserved
  );
};

const reconcileActiveDomain = (
  runtime: CanonicalDomainResult,
  stored: CanonicalDomainResult,
  scheme: HeatCapacityFreeParameterScheme,
  gasType: WorkbenchHeatCapacityState['heatCapacityFreeGasType'],
  fallback: HeatCapacityFreeExperimentDomainState,
  fieldPath: string,
): CanonicalDomainResult | HeatCapacityFreeCaptureFailure => {
  if (
    !preservesBatchAuthority(runtime.value, stored.value.batch)
  ) {
    return {
      ok: false,
      status: 'quarantined',
      fieldPath: `${fieldPath}.batch`,
      sourceVersion: runtime.value.batch.version,
      raw: runtime.value,
      reason:
        'The active Free batch authority does not match its durable domain.',
    };
  }
  if (
    !preservesSameIdAuthority(runtime.value.trials, stored.value.trials) ||
    !preservesSameIdAuthority(
      runtime.value.traceStore.traceTrials,
      stored.value.traceStore.traceTrials,
    ) ||
    (
      stored.value.traceStore.activeTraceTrialId !== null &&
      runtime.value.traceStore.activeTraceTrialId !==
        stored.value.traceStore.activeTraceTrialId
    ) ||
    (
      stored.value.activeAttempt !== null &&
      !areHeatCapacityPersistenceValuesEqual(
        runtime.value.activeAttempt,
        stored.value.activeAttempt,
      )
    )
  ) {
    return {
      ok: false,
      status: 'quarantined',
      fieldPath,
      sourceVersion: runtime.value.batch.version,
      raw: runtime.value,
      reason:
        'The active Free runtime would rewrite or remove durable trial, trace, or attempt authority.',
    };
  }

  const nextTraceTrialIndex = Math.max(
    runtime.value.traceStore.nextTraceTrialIndex,
    stored.value.traceStore.nextTraceTrialIndex,
  );
  const nextTrialSequence = runtime.value.batch.id === null
    ? runtime.value.batch.nextTrialSequence
    : Math.max(
        runtime.value.batch.nextTrialSequence,
        stored.value.batch.nextTrialSequence,
        nextTraceTrialIndex,
      );
  const highWaterChanged =
    nextTraceTrialIndex !== runtime.value.traceStore.nextTraceTrialIndex ||
    nextTrialSequence !== runtime.value.batch.nextTrialSequence;
  const reconciledRaw: HeatCapacityFreeExperimentDomainState = {
    ...runtime.value,
    batch: {
      ...runtime.value.batch,
      nextTrialSequence,
    },
    traceStore: {
      ...runtime.value.traceStore,
      nextTraceTrialIndex,
    },
  };
  const reconciled = decodeCanonicalDomain(
    reconciledRaw,
    scheme,
    gasType,
    fallback,
    fieldPath,
  );
  if (reconciled.ok === false) return reconciled;
  return {
    ok: true,
    status:
      runtime.status === 'migrated' ||
      stored.status === 'migrated'
        ? 'migrated'
        : runtime.status === 'repaired-cache' ||
            stored.status === 'repaired-cache' ||
            highWaterChanged
          ? 'repaired-cache'
          : 'exact',
    value: reconciled.value,
  };
};

export const prepareHeatCapacityFreeCapture = (
  file: WorkbenchHeatCapacityState,
  captureActiveRuntime: boolean,
): HeatCapacityFreeCaptureResult => {
  const fallback = createDefaultHeatCapacityFile(1);
  const real = decodeCanonicalDomain(
    file.heatCapacityFreeRealDomain,
    'real',
    file.heatCapacityFreeGasType,
    fallback.heatCapacityFreeRealDomain,
    'heatCapacityFreeRealDomain',
  );
  if (real.ok === false) return real;
  const ideal = decodeCanonicalDomain(
    file.heatCapacityFreeIdealDomain,
    'ideal',
    'air',
    fallback.heatCapacityFreeIdealDomain,
    'heatCapacityFreeIdealDomain',
  );
  if (ideal.ok === false) return ideal;

  let capturedReal = real;
  let capturedIdeal = ideal;
  let dormantProjectionRepaired = false;
  if (captureActiveRuntime) {
    const scheme = file.heatCapacityFreeParameterScheme;
    const storedActive = scheme === 'ideal' ? ideal : real;
    const useStoredActive =
      scheme === 'real' &&
      hasHeatCapacityFreeIdealThermalBoundaryContamination(
        file.heatCapacityFreePhysicsConfig,
      );
    const runtimeSourceFile = file.heatCapacityMode === 'free'
      ? file
      : {
          ...file,
          heatCapacityReleaseState: {
            ...storedActive.value.releaseState,
          },
        };
    const rawRuntime = useStoredActive
      ? storedActive.value
      : createHeatCapacityFreeExperimentDomainStateFromFile(
          runtimeSourceFile,
          scheme,
        );
    const runtime = decodeCanonicalDomain(
      rawRuntime,
      scheme,
      scheme === 'ideal' ? 'air' : file.heatCapacityFreeGasType,
      scheme === 'ideal'
        ? fallback.heatCapacityFreeIdealDomain
        : fallback.heatCapacityFreeRealDomain,
      scheme === 'ideal'
        ? 'heatCapacityFreeIdealDomain'
        : 'heatCapacityFreeRealDomain',
    );
    if (runtime.ok === false) return runtime;
    const reconciled = reconcileActiveDomain(
      runtime,
      storedActive,
      scheme,
      scheme === 'ideal' ? 'air' : file.heatCapacityFreeGasType,
      scheme === 'ideal'
        ? fallback.heatCapacityFreeIdealDomain
        : fallback.heatCapacityFreeRealDomain,
      scheme === 'ideal'
        ? 'heatCapacityFreeIdealDomain'
        : 'heatCapacityFreeRealDomain',
    );
    if (reconciled.ok === false) return reconciled;
    if (scheme === 'ideal') {
      capturedIdeal = reconciled;
    } else {
      capturedReal = reconciled;
    }
  } else {
    const scheme = file.heatCapacityFreeParameterScheme;
    const storedActive = scheme === 'ideal' ? ideal : real;
    const dormantProjection = decodeCanonicalDomain(
      {
        ...storedActive.value,
        batch: file.heatCapacityFreeBatch,
        traceStore: file.heatCapacityFreeTraceStore,
        trials: file.heatCapacityFreeTrials,
        activeAttempt: file.heatCapacityFreeActiveAttempt,
      },
      scheme,
      scheme === 'ideal' ? 'air' : file.heatCapacityFreeGasType,
      scheme === 'ideal'
        ? fallback.heatCapacityFreeIdealDomain
        : fallback.heatCapacityFreeRealDomain,
      'heatCapacityFreeDormantProjection',
    );
    if (dormantProjection.ok === false) return dormantProjection;
    dormantProjectionRepaired =
      dormantProjection.status === 'migrated' ||
      !areHeatCapacityPersistenceValuesEqual(
        dormantProjection.value,
        storedActive.value,
      );
  }

  const fileWithDomains: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityFreeRealDomain: capturedReal.value,
    heatCapacityFreeIdealDomain: capturedIdeal.value,
  };
  const capturedFile = captureActiveRuntime
    ? applyHeatCapacityFreeDomainToRuntimeFields(
        fileWithDomains,
        file.heatCapacityFreeParameterScheme === 'ideal'
          ? capturedIdeal.value
          : capturedReal.value,
      )
    : fileWithDomains;
  return {
    ok: true,
    status:
      capturedReal.status === 'migrated' ||
      capturedIdeal.status === 'migrated'
        ? 'migrated'
        : capturedReal.status === 'repaired-cache' ||
            capturedIdeal.status === 'repaired-cache' ||
            dormantProjectionRepaired
          ? 'repaired-cache'
          : 'exact',
    file: capturedFile,
  };
};
