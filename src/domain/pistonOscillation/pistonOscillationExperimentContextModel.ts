export const PISTON_OSCILLATION_EXPERIMENT_CONTEXT_SCHEMA_VERSION = 1 as const;

export type PistonOscillationExperimentScheme = 'real' | 'ideal';

export interface PistonOscillationExperimentContextSnapshot {
  schemaVersion: typeof PISTON_OSCILLATION_EXPERIMENT_CONTEXT_SCHEMA_VERSION;
  groupId: string;
  scheme: PistonOscillationExperimentScheme;
  parameterProfileVersion: string;
  provenance: 'captured' | 'legacy-inferred';
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const createPistonOscillationExperimentContextSnapshot = (options: {
  groupId: string;
  scheme: PistonOscillationExperimentScheme;
  parameterProfileVersion: string;
  provenance?: PistonOscillationExperimentContextSnapshot['provenance'];
}): PistonOscillationExperimentContextSnapshot => ({
  schemaVersion: PISTON_OSCILLATION_EXPERIMENT_CONTEXT_SCHEMA_VERSION,
  groupId: options.groupId.trim(),
  scheme: options.scheme,
  parameterProfileVersion: options.parameterProfileVersion.trim(),
  provenance: options.provenance ?? 'captured',
});

export const normalizePistonOscillationExperimentContextSnapshot = (
  value: unknown,
): PistonOscillationExperimentContextSnapshot | null => {
  if (
    !isPlainRecord(value)
    || value.schemaVersion !== PISTON_OSCILLATION_EXPERIMENT_CONTEXT_SCHEMA_VERSION
    || typeof value.groupId !== 'string'
    || value.groupId.trim().length === 0
    || (value.scheme !== 'real' && value.scheme !== 'ideal')
    || typeof value.parameterProfileVersion !== 'string'
    || value.parameterProfileVersion.trim().length === 0
    || (value.provenance !== 'captured' && value.provenance !== 'legacy-inferred')
  ) return null;
  return createPistonOscillationExperimentContextSnapshot({
    groupId: value.groupId,
    scheme: value.scheme,
    parameterProfileVersion: value.parameterProfileVersion,
    provenance: value.provenance,
  });
};

export const doPistonOscillationExperimentContextsAgree = (
  first: PistonOscillationExperimentContextSnapshot,
  second: PistonOscillationExperimentContextSnapshot,
) => first.groupId === second.groupId
  && first.scheme === second.scheme
  && first.parameterProfileVersion === second.parameterProfileVersion;
