export const PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_EQUIVALENT_LOSS_MODEL_VERSION =
  'piston-oscillation-unified-equivalent-linear-loss-v1' as const;
export const PISTON_OSCILLATION_EQUIVALENT_LOSS_KIND =
  'unified-equivalent-linear-loss' as const;
export const PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M = 1.1 as const;

// These identifiers and the 0.434 N·s/m value remain readable only because
// released files may already contain them. New experiments must use the single
// current coefficient above for both virtual-hand press and free release.
export const PISTON_OSCILLATION_LEGACY_BASELINE_EQUIVALENT_LOSS_MODEL_VERSION =
  'piston-oscillation-temporary-equivalent-linear-loss-v1' as const;
export const PISTON_OSCILLATION_LEGACY_BASELINE_EQUIVALENT_LOSS_KIND =
  'temporary-equivalent-linear-loss' as const;
export const PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M = 0.434 as const;
export const PISTON_OSCILLATION_LEGACY_RELEASE_REVIEW_LOSS_MODEL_VERSION =
  'piston-oscillation-finite-thermal-release-loss-review-v1' as const;
export const PISTON_OSCILLATION_LEGACY_RELEASE_REVIEW_LOSS_KIND =
  'review-candidate-residual-linear-release-loss' as const;

export interface PistonOscillationEquivalentLossSnapshot {
  schemaVersion: typeof PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION;
  modelVersion: string;
  kind: string;
  linearCoefficientNsPerM: number;
  provenance: 'captured' | 'legacy-inferred';
}

export const createPistonOscillationEquivalentLossSnapshot = (
  linearCoefficientNsPerM: number,
): PistonOscillationEquivalentLossSnapshot => {
  if (
    !Number.isFinite(linearCoefficientNsPerM)
    || linearCoefficientNsPerM < 0
    || linearCoefficientNsPerM > 10
  ) {
    throw new RangeError(
      'Captured piston equivalent loss must be between 0 and 10 N·s/m.',
    );
  }
  return {
    schemaVersion: PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION,
    modelVersion: PISTON_OSCILLATION_EQUIVALENT_LOSS_MODEL_VERSION,
    kind: PISTON_OSCILLATION_EQUIVALENT_LOSS_KIND,
    linearCoefficientNsPerM,
    provenance: 'captured',
  };
};

const isCapturedPistonOscillationEquivalentLossSnapshot = (
  snapshot: Partial<PistonOscillationEquivalentLossSnapshot>,
) => (
  (
    snapshot.modelVersion === PISTON_OSCILLATION_EQUIVALENT_LOSS_MODEL_VERSION
    && snapshot.kind === PISTON_OSCILLATION_EQUIVALENT_LOSS_KIND
    && typeof snapshot.linearCoefficientNsPerM === 'number'
    && Number.isFinite(snapshot.linearCoefficientNsPerM)
    && snapshot.linearCoefficientNsPerM >= 0
    && snapshot.linearCoefficientNsPerM <= 10
  )
  || (
    snapshot.modelVersion
      === PISTON_OSCILLATION_LEGACY_RELEASE_REVIEW_LOSS_MODEL_VERSION
    && snapshot.kind
      === PISTON_OSCILLATION_LEGACY_RELEASE_REVIEW_LOSS_KIND
    && snapshot.linearCoefficientNsPerM
      === PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M
  )
  || (
    snapshot.modelVersion
      === PISTON_OSCILLATION_LEGACY_BASELINE_EQUIVALENT_LOSS_MODEL_VERSION
    && snapshot.kind
      === PISTON_OSCILLATION_LEGACY_BASELINE_EQUIVALENT_LOSS_KIND
    && snapshot.linearCoefficientNsPerM
      === PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M
  )
);

export const isPistonOscillationEquivalentLossSnapshot = (
  value: unknown,
): value is PistonOscillationEquivalentLossSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Partial<PistonOscillationEquivalentLossSnapshot>;
  return snapshot.schemaVersion === PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION
    && typeof snapshot.modelVersion === 'string'
    && snapshot.modelVersion.length > 0
    && typeof snapshot.kind === 'string'
    && snapshot.kind.length > 0
    && typeof snapshot.linearCoefficientNsPerM === 'number'
    && Number.isFinite(snapshot.linearCoefficientNsPerM)
    && snapshot.linearCoefficientNsPerM >= 0
    && (snapshot.provenance === 'captured' || snapshot.provenance === 'legacy-inferred')
    && (
      snapshot.provenance !== 'captured'
      || isCapturedPistonOscillationEquivalentLossSnapshot(snapshot)
    );
};
