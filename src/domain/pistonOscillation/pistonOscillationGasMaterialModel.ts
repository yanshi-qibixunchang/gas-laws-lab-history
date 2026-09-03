export const PISTON_OSCILLATION_GAS_MATERIAL_SCHEMA_VERSION = 1 as const;

export type PistonOscillationGasType = 'air' | 'helium';

export const PISTON_OSCILLATION_DRY_AIR_MATERIAL_MODEL_VERSION =
  'piston-oscillation-dry-air-material-v1' as const;
export const PISTON_OSCILLATION_DRY_AIR_MATERIAL_ID = 'dry-air' as const;
export const PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX = 1.4 as const;
export const PISTON_OSCILLATION_HELIUM_MATERIAL_MODEL_VERSION =
  'piston-oscillation-helium-reference-v1' as const;
export const PISTON_OSCILLATION_HELIUM_MATERIAL_ID = 'helium-4' as const;
export const PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX = 5 / 3;

export interface PistonOscillationGasMaterialSnapshot {
  schemaVersion: typeof PISTON_OSCILLATION_GAS_MATERIAL_SCHEMA_VERSION;
  gasType: PistonOscillationGasType;
  modelVersion: string;
  materialId: string;
  adiabaticIndex: number;
  provenance: 'captured' | 'legacy-inferred';
}

export const PISTON_OSCILLATION_DRY_AIR_MATERIAL = Object.freeze({
  schemaVersion: PISTON_OSCILLATION_GAS_MATERIAL_SCHEMA_VERSION,
  gasType: 'air' as const,
  modelVersion: PISTON_OSCILLATION_DRY_AIR_MATERIAL_MODEL_VERSION,
  materialId: PISTON_OSCILLATION_DRY_AIR_MATERIAL_ID,
  adiabaticIndex: PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX,
});

export const PISTON_OSCILLATION_HELIUM_MATERIAL = Object.freeze({
  schemaVersion: PISTON_OSCILLATION_GAS_MATERIAL_SCHEMA_VERSION,
  gasType: 'helium' as const,
  modelVersion: PISTON_OSCILLATION_HELIUM_MATERIAL_MODEL_VERSION,
  materialId: PISTON_OSCILLATION_HELIUM_MATERIAL_ID,
  adiabaticIndex: PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX,
});

const CAPTURED_GAS_MATERIALS = [
  PISTON_OSCILLATION_DRY_AIR_MATERIAL,
  PISTON_OSCILLATION_HELIUM_MATERIAL,
] as const;

export const createPistonOscillationGasMaterialSnapshot = (
  gasType: PistonOscillationGasType = 'air',
): PistonOscillationGasMaterialSnapshot => {
  const material = CAPTURED_GAS_MATERIALS.find((candidate) => (
    candidate.gasType === gasType
  ));
  if (!material) {
    throw new RangeError(`No captured piston-oscillation material profile exists for ${gasType}.`);
  }
  return {
    ...material,
    provenance: 'captured',
  };
};

export const isPistonOscillationGasMaterialSnapshot = (
  value: unknown,
): value is PistonOscillationGasMaterialSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Partial<PistonOscillationGasMaterialSnapshot>;
  const knownGasType = snapshot.gasType === 'air' || snapshot.gasType === 'helium';
  const capturedMaterial = CAPTURED_GAS_MATERIALS.find((candidate) => (
    candidate.gasType === snapshot.gasType
  ));
  return snapshot.schemaVersion === PISTON_OSCILLATION_GAS_MATERIAL_SCHEMA_VERSION
    && knownGasType
    && typeof snapshot.modelVersion === 'string'
    && snapshot.modelVersion.length > 0
    && typeof snapshot.materialId === 'string'
    && snapshot.materialId.length > 0
    && typeof snapshot.adiabaticIndex === 'number'
    && Number.isFinite(snapshot.adiabaticIndex)
    && snapshot.adiabaticIndex > 1
    && snapshot.adiabaticIndex <= 2
    && (snapshot.provenance === 'captured' || snapshot.provenance === 'legacy-inferred')
    && (
      snapshot.provenance === 'captured'
      ? (
        capturedMaterial !== undefined
        && snapshot.modelVersion === capturedMaterial.modelVersion
        && snapshot.materialId === capturedMaterial.materialId
        && snapshot.adiabaticIndex === capturedMaterial.adiabaticIndex
      )
      : snapshot.gasType === 'air'
    );
};
