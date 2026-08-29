export const PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION =
  'piston-oscillation-temporary-equivalent-linear-loss-v1' as const;
export const PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_KIND =
  'temporary-equivalent-linear-loss' as const;
export const PISTON_OSCILLATION_TEMPORARY_LINEAR_LOSS_NS_PER_M = 0.434 as const;

export interface PistonOscillationEquivalentLossSnapshot {
  schemaVersion: typeof PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION;
  modelVersion: string;
  kind: string;
  linearCoefficientNsPerM: number;
  provenance: 'captured' | 'legacy-inferred';
}

export const createPistonOscillationEquivalentLossSnapshot = (
): PistonOscillationEquivalentLossSnapshot => ({
  schemaVersion: PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION,
  modelVersion: PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION,
  kind: PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_KIND,
  linearCoefficientNsPerM: PISTON_OSCILLATION_TEMPORARY_LINEAR_LOSS_NS_PER_M,
  provenance: 'captured',
});

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
      || (
        snapshot.modelVersion
          === PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION
        && snapshot.kind === PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_KIND
        && snapshot.linearCoefficientNsPerM
          === PISTON_OSCILLATION_TEMPORARY_LINEAR_LOSS_NS_PER_M
      )
    );
};
