/**
 * Read-only compatibility constructors for persisted records created before
 * the current thermal/press/sensor chain. Current acquisition code must never
 * import this module; Git history, rather than dormant production branches,
 * remains the archive for superseded behavior.
 */
import {
  PISTON_OSCILLATION_DRY_AIR_MATERIAL_ID,
  PISTON_OSCILLATION_GAS_MATERIAL_SCHEMA_VERSION,
  type PistonOscillationGasMaterialSnapshot,
} from './pistonOscillationGasMaterialModel.ts';
import {
  PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION,
  type PistonOscillationEquivalentLossSnapshot,
} from './pistonOscillationEquivalentLossModel.ts';
import type {
  PistonOscillationPressOperationEvidence,
} from './pistonOscillationPressInteractionModel.ts';
import {
  createPistonOscillationEquilibriumState,
  createPistonOscillationIdealAdiabaticLoadedGasState,
  type PistonOscillationThermodynamicState,
} from './pistonOscillationPhysicsEngine.ts';

export const createLegacyPistonOscillationGasMaterialSnapshot = (
  adiabaticIndex: number,
): PistonOscillationGasMaterialSnapshot => ({
  schemaVersion: PISTON_OSCILLATION_GAS_MATERIAL_SCHEMA_VERSION,
  gasType: 'air',
  modelVersion: 'legacy-physics-config-air-material',
  materialId: PISTON_OSCILLATION_DRY_AIR_MATERIAL_ID,
  adiabaticIndex,
  provenance: 'legacy-inferred',
});

export const createLegacyPistonOscillationEquivalentLossSnapshot = (
  linearCoefficientNsPerM: number,
): PistonOscillationEquivalentLossSnapshot => ({
  schemaVersion: PISTON_OSCILLATION_EQUIVALENT_LOSS_SCHEMA_VERSION,
  modelVersion: 'legacy-physics-config-equivalent-loss',
  kind: 'legacy-unspecified-linear-loss',
  linearCoefficientNsPerM,
  provenance: 'legacy-inferred',
});

export const createLegacyUnknownPistonOscillationPressOperationEvidence = (
): PistonOscillationPressOperationEvidence => ({
  modelVersion: 'legacy-unknown',
  provenance: 'legacy-unknown',
  completion: 'legacy-unknown',
  pressDurationS: null,
  compressionDurationS: null,
  holdDurationS: null,
  averageDownwardSpeedMPerS: null,
  peakDownwardSpeedMPerS: null,
  releaseVelocityMPerS: null,
  spaceReleaseOffsetS: null,
  mouseReleaseOffsetS: null,
  signedReleaseGapS: null,
  releaseOrder: 'unknown',
  trace: [],
  releaseState: null,
});

export const createLegacyPistonOscillationLooseConnectedThermodynamicState = (
  equilibriumHeightMm: number,
  pistonOffsetMm: number,
): PistonOscillationThermodynamicState => (
  createPistonOscillationIdealAdiabaticLoadedGasState(
    createPistonOscillationEquilibriumState(equilibriumHeightMm),
    pistonOffsetMm,
  )
);
