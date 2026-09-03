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
import {
  createPistonOscillationExperimentContextSnapshot,
  type PistonOscillationExperimentContextSnapshot,
  type PistonOscillationExperimentScheme,
} from './pistonOscillationExperimentContextModel.ts';
import {
  PISTON_OSCILLATION_IDEAL_PARAMETER_PROFILE_VERSION,
  createPistonOscillationIdealParameterDraft,
} from './pistonOscillationIdealParameterProfile.ts';
import {
  PISTON_OSCILLATION_LEGACY_PENDING_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION,
  PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
  applyPistonOscillationRealGasProfile,
  getPistonOscillationRealParameterProfileVersion,
} from './pistonOscillationRealParameterProfile.ts';

export type { PistonOscillationExperimentScheme } from './pistonOscillationExperimentContextModel.ts';

export const PISTON_OSCILLATION_FREE_EXPERIMENT_GROUP_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_REAL_PARAMETER_PROFILE_VERSION =
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION;

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

export { PISTON_OSCILLATION_IDEAL_PARAMETER_PROFILE_VERSION };
export { PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION };

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

export const isPistonOscillationLegacyPendingRealHeliumExperimentGroup = (
  value: unknown,
) => {
  if (!isPlainRecord(value) || !isPlainRecord(value.gasMaterialSnapshot)) return false;
  return value.schemaVersion === PISTON_OSCILLATION_FREE_EXPERIMENT_GROUP_SCHEMA_VERSION
    && value.scheme === 'real'
    && value.gasMaterialSnapshot.gasType === 'helium'
    && value.parameterProfileVersion
      === PISTON_OSCILLATION_LEGACY_PENDING_REAL_HELIUM_PARAMETER_PROFILE_VERSION;
};

export const getPistonOscillationParameterProfileVersion = (
  scheme: PistonOscillationExperimentScheme,
  gasType: PistonOscillationGasMaterialSnapshot['gasType'],
) => scheme === 'ideal'
  ? PISTON_OSCILLATION_IDEAL_PARAMETER_PROFILE_VERSION
  : getPistonOscillationRealParameterProfileVersion(gasType);

export const createPistonOscillationFreeExperimentGroup = (options: {
  groupId?: string;
  createdAtMs?: number | null;
  provenance?: PistonOscillationFreeExperimentGroup['provenance'];
  scheme?: PistonOscillationExperimentScheme;
  gasMaterialSnapshot?: PistonOscillationGasMaterialSnapshot;
  parameterProfileVersion?: string;
} = {}): PistonOscillationFreeExperimentGroup => {
  const scheme = options.scheme ?? 'real';
  const gasMaterialSnapshot = {
    ...(options.gasMaterialSnapshot ?? createPistonOscillationGasMaterialSnapshot()),
  };
  return {
    schemaVersion: PISTON_OSCILLATION_FREE_EXPERIMENT_GROUP_SCHEMA_VERSION,
    groupId: options.groupId?.trim() || 'piston-free-group:unstarted',
    createdAtMs: options.createdAtMs ?? null,
    provenance: options.provenance ?? 'created',
    scheme,
    gasMaterialSnapshot,
    parameterProfileVersion: options.parameterProfileVersion?.trim()
      || getPistonOscillationParameterProfileVersion(scheme, gasMaterialSnapshot.gasType),
    parameterSnapshot: null,
    lock: null,
  };
};

export const createPistonOscillationFreeExperimentContextSnapshot = (
  group: PistonOscillationFreeExperimentGroup,
  provenance: PistonOscillationExperimentContextSnapshot['provenance'] = 'captured',
) => createPistonOscillationExperimentContextSnapshot({
  groupId: group.groupId,
  scheme: group.scheme,
  parameterProfileVersion: group.parameterProfileVersion,
  provenance,
});

export const selectPistonOscillationFreeExperimentScheme = (
  group: PistonOscillationFreeExperimentGroup,
  scheme: PistonOscillationExperimentScheme,
): PistonOscillationFreeExperimentGroup => {
  if (group.lock !== null || group.scheme === scheme) return group;
  return {
    ...group,
    scheme,
    parameterProfileVersion: getPistonOscillationParameterProfileVersion(
      scheme,
      group.gasMaterialSnapshot.gasType,
    ),
  };
};

export const selectPistonOscillationFreeGasType = (
  group: PistonOscillationFreeExperimentGroup,
  gasType: PistonOscillationGasMaterialSnapshot['gasType'],
): PistonOscillationFreeExperimentGroup => {
  if (group.lock !== null || group.gasMaterialSnapshot.gasType === gasType) return group;
  return {
    ...group,
    gasMaterialSnapshot: createPistonOscillationGasMaterialSnapshot(gasType),
    parameterProfileVersion: getPistonOscillationParameterProfileVersion(
      group.scheme,
      gasType,
    ),
  };
};

export const isPistonOscillationFreeExperimentProfileImplemented = (
  group: PistonOscillationFreeExperimentGroup,
) => group.parameterProfileVersion === getPistonOscillationParameterProfileVersion(
  group.scheme,
  group.gasMaterialSnapshot.gasType,
);

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
  const validGroupIdentity = persisted?.schemaVersion
      === PISTON_OSCILLATION_FREE_EXPERIMENT_GROUP_SCHEMA_VERSION
    && typeof persisted.groupId === 'string'
    && persisted.groupId.trim().length > 0
    && (persisted.createdAtMs === null || isFiniteTimestamp(persisted.createdAtMs))
    && (persisted.provenance === 'created' || persisted.provenance === 'legacy-inferred')
    && (persisted.scheme === 'real' || persisted.scheme === 'ideal')
    && isPistonOscillationGasMaterialSnapshot(persistedGasMaterial)
    && (
      options.fallbackGasMaterialSnapshot === undefined
      || doPistonOscillationGasMaterialSnapshotsAgree(
        persistedGasMaterial,
        options.fallbackGasMaterialSnapshot,
      )
    )
    && typeof persisted.parameterProfileVersion === 'string'
    && persisted.parameterProfileVersion.length > 0;
  const legacyPendingRealHelium = validGroupIdentity
    && isPistonOscillationLegacyPendingRealHeliumExperimentGroup(persisted);
  const validCurrentGroup = validGroupIdentity
    && (
      persisted.parameterProfileVersion === getPistonOscillationParameterProfileVersion(
        persisted.scheme as PistonOscillationExperimentScheme,
        (persistedGasMaterial as PistonOscillationGasMaterialSnapshot).gasType,
      )
      || legacyPendingRealHelium
    );
  const group = validCurrentGroup
    ? createPistonOscillationFreeExperimentGroup({
        groupId: persisted.groupId as string,
        createdAtMs: persisted.createdAtMs as number | null,
        provenance: persisted.provenance as PistonOscillationFreeExperimentGroup['provenance'],
        scheme: persisted.scheme as PistonOscillationExperimentScheme,
        gasMaterialSnapshot: persistedGasMaterial as PistonOscillationGasMaterialSnapshot,
        parameterProfileVersion: legacyPendingRealHelium
          ? PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION
          : persisted.parameterProfileVersion as string,
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
    parameterSnapshot: group.scheme === 'ideal'
      ? createPistonOscillationFreeParameterSnapshot(
          createPistonOscillationIdealParameterDraft(),
          lockedAtMs,
        )
      : legacyPendingRealHelium && persistedParameterSnapshot
        ? createPistonOscillationFreeParameterSnapshot(
            applyPistonOscillationRealGasProfile(
              persistedParameterSnapshot.parameters,
              'helium',
            ),
            persistedParameterSnapshot.frozenAtMs,
          )
        : persistedParameterSnapshot
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
