import {
  createPistonOscillationFreeParameterSnapshot,
  normalizePistonOscillationFreeParameterSnapshot,
  type PistonOscillationFreeParameterDraft,
  type PistonOscillationFreeParameterSnapshot,
} from './pistonOscillationFreeParameterConfig.ts';
import {
  createPistonOscillationGasMaterialSnapshot,
  isPistonOscillationGasMaterialSnapshot,
  type PistonOscillationGasMaterialSnapshot,
} from './pistonOscillationGasMaterialModel.ts';

export const PISTON_OSCILLATION_FREE_EXPERIMENT_GROUP_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_REAL_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-parameter-profile-v1' as const;

export type PistonOscillationExperimentScheme = 'real' | 'ideal';

export type PistonOscillationFreeExperimentLockReason =
  | 'bottom-impact'
  | 'formal-acquisition-started'
  | 'acquisition-repeated'
  | 'measurement-frozen'
  | 'measurement-saved'
  | 'data-processing-started'
  | 'calculation-started'
  | 'legacy-evidence';

export interface PistonOscillationFreeExperimentLock {
  schemaVersion: 1;
  lockedAtMs: number;
  reason: PistonOscillationFreeExperimentLockReason;
}

export interface PistonOscillationFreeExperimentGroup {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_EXPERIMENT_GROUP_SCHEMA_VERSION;
  groupId: string;
  createdAtMs: number | null;
  provenance: 'created' | 'legacy-inferred';
  scheme: PistonOscillationExperimentScheme;
  gasMaterialSnapshot: PistonOscillationGasMaterialSnapshot;
  parameterProfileVersion: string;
  parameterSnapshot: PistonOscillationFreeParameterSnapshot | null;
  lock: PistonOscillationFreeExperimentLock | null;
}

const LOCK_REASONS: readonly PistonOscillationFreeExperimentLockReason[] = [
  'bottom-impact',
  'formal-acquisition-started',
  'acquisition-repeated',
  'measurement-frozen',
  'measurement-saved',
  'data-processing-started',
  'calculation-started',
  'legacy-evidence',
];

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isFiniteTimestamp = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
);

export const createPistonOscillationFreeExperimentGroup = (options: {
  groupId?: string;
  createdAtMs?: number | null;
  provenance?: PistonOscillationFreeExperimentGroup['provenance'];
  scheme?: PistonOscillationExperimentScheme;
  gasMaterialSnapshot?: PistonOscillationGasMaterialSnapshot;
  parameterProfileVersion?: string;
} = {}): PistonOscillationFreeExperimentGroup => ({
  schemaVersion: PISTON_OSCILLATION_FREE_EXPERIMENT_GROUP_SCHEMA_VERSION,
  groupId: options.groupId?.trim() || 'piston-free-group:unstarted',
  createdAtMs: options.createdAtMs ?? null,
  provenance: options.provenance ?? 'created',
  scheme: options.scheme ?? 'real',
  gasMaterialSnapshot: {
    ...(options.gasMaterialSnapshot ?? createPistonOscillationGasMaterialSnapshot()),
  },
  parameterProfileVersion: options.parameterProfileVersion?.trim()
    || PISTON_OSCILLATION_REAL_PARAMETER_PROFILE_VERSION,
  parameterSnapshot: null,
  lock: null,
});

export const lockPistonOscillationFreeExperimentGroup = (
  group: PistonOscillationFreeExperimentGroup,
  parameters: PistonOscillationFreeParameterDraft,
  reason: PistonOscillationFreeExperimentLockReason,
  lockedAtMs: number,
): PistonOscillationFreeExperimentGroup => {
  if (group.lock !== null) return group;
  return {
    ...group,
    gasMaterialSnapshot: { ...group.gasMaterialSnapshot },
    parameterSnapshot: createPistonOscillationFreeParameterSnapshot(
      parameters,
      lockedAtMs,
    ),
    lock: {
      schemaVersion: 1,
      lockedAtMs,
      reason,
    },
  };
};

export const doPistonOscillationGasMaterialSnapshotsAgree = (
  first: PistonOscillationGasMaterialSnapshot,
  second: PistonOscillationGasMaterialSnapshot,
) => first.gasType === second.gasType
  && first.modelVersion === second.modelVersion
  && first.materialId === second.materialId
  && first.adiabaticIndex === second.adiabaticIndex;

export const normalizePistonOscillationFreeExperimentGroup = (
  value: unknown,
  options: {
    fallbackGroupId: string;
    fallbackCreatedAtMs: number | null;
    fallbackParameters: PistonOscillationFreeParameterDraft;
    fallbackGasMaterialSnapshot?: PistonOscillationGasMaterialSnapshot;
    legacyParameterSnapshot?: PistonOscillationFreeParameterSnapshot | null;
    forceLock?: boolean;
    forceLockAtMs?: number;
  },
): PistonOscillationFreeExperimentGroup => {
  const persisted = isPlainRecord(value) ? value : null;
  const persistedGasMaterial = persisted?.gasMaterialSnapshot;
  const validCurrentGroup = persisted?.schemaVersion
      === PISTON_OSCILLATION_FREE_EXPERIMENT_GROUP_SCHEMA_VERSION
    && typeof persisted.groupId === 'string'
    && persisted.groupId.trim().length > 0
    && (persisted.createdAtMs === null || isFiniteTimestamp(persisted.createdAtMs))
    && (persisted.provenance === 'created' || persisted.provenance === 'legacy-inferred')
    // Ideal is not accepted from persistence until its effective profile is implemented.
    && persisted.scheme === 'real'
    && isPistonOscillationGasMaterialSnapshot(persistedGasMaterial)
    && persistedGasMaterial.gasType === 'air'
    && (
      options.fallbackGasMaterialSnapshot === undefined
      || doPistonOscillationGasMaterialSnapshotsAgree(
        persistedGasMaterial,
        options.fallbackGasMaterialSnapshot,
      )
    )
    && typeof persisted.parameterProfileVersion === 'string'
    && persisted.parameterProfileVersion.length > 0;
  const group = validCurrentGroup
    ? createPistonOscillationFreeExperimentGroup({
        groupId: persisted.groupId as string,
        createdAtMs: persisted.createdAtMs as number | null,
        provenance: persisted.provenance as PistonOscillationFreeExperimentGroup['provenance'],
        scheme: 'real',
        gasMaterialSnapshot: persistedGasMaterial as PistonOscillationGasMaterialSnapshot,
        parameterProfileVersion: persisted.parameterProfileVersion as string,
      })
    : createPistonOscillationFreeExperimentGroup({
        groupId: options.fallbackGroupId,
        createdAtMs: options.fallbackCreatedAtMs,
        provenance: 'legacy-inferred',
        gasMaterialSnapshot: options.fallbackGasMaterialSnapshot,
      });
  const persistedParameterSnapshot = normalizePistonOscillationFreeParameterSnapshot(
    persisted?.parameterSnapshot,
  ) ?? options.legacyParameterSnapshot ?? null;
  const persistedLock = isPlainRecord(persisted?.lock)
    && persisted.lock.schemaVersion === 1
    && isFiniteTimestamp(persisted.lock.lockedAtMs)
    && LOCK_REASONS.includes(
      persisted.lock.reason as PistonOscillationFreeExperimentLockReason,
    )
      ? {
          schemaVersion: 1 as const,
          lockedAtMs: persisted.lock.lockedAtMs,
          reason: persisted.lock.reason as PistonOscillationFreeExperimentLockReason,
        }
      : null;
  const requiresLock = options.forceLock === true
    || persistedLock !== null
    || persistedParameterSnapshot !== null;
  if (!requiresLock) return group;
  const lockedAtMs = persistedLock?.lockedAtMs
    ?? persistedParameterSnapshot?.frozenAtMs
    ?? options.forceLockAtMs
    ?? options.fallbackCreatedAtMs
    ?? 0;
  return {
    ...group,
    parameterSnapshot: persistedParameterSnapshot
      ?? createPistonOscillationFreeParameterSnapshot(
        options.fallbackParameters,
        lockedAtMs,
      ),
    lock: persistedLock ?? {
      schemaVersion: 1,
      lockedAtMs,
      reason: 'legacy-evidence',
    },
  };
};
