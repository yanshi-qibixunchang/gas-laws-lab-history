export const PISTON_OSCILLATION_AIR_MATERIAL_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION =
  'piston-oscillation-dry-air-material-v1' as const;
export const PISTON_OSCILLATION_AIR_MATERIAL_ID = 'dry-air' as const;
export const PISTON_OSCILLATION_AIR_ADIABATIC_INDEX = 1.4 as const;

export interface PistonOscillationAirMaterialSnapshot {
  schemaVersion: typeof PISTON_OSCILLATION_AIR_MATERIAL_SCHEMA_VERSION;
  modelVersion: string;
  materialId: string;
  adiabaticIndex: number;
  provenance: 'captured' | 'legacy-inferred';
}

export const PISTON_OSCILLATION_AIR_MATERIAL = Object.freeze({
  schemaVersion: PISTON_OSCILLATION_AIR_MATERIAL_SCHEMA_VERSION,
  modelVersion: PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION,
  materialId: PISTON_OSCILLATION_AIR_MATERIAL_ID,
  adiabaticIndex: PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
});

export const createPistonOscillationAirMaterialSnapshot = (
  provenance: PistonOscillationAirMaterialSnapshot['provenance'] = 'captured',
): PistonOscillationAirMaterialSnapshot => ({
  ...PISTON_OSCILLATION_AIR_MATERIAL,
  provenance,
});

export const createLegacyPistonOscillationAirMaterialSnapshot = (
  adiabaticIndex: number,
): PistonOscillationAirMaterialSnapshot => ({
  schemaVersion: PISTON_OSCILLATION_AIR_MATERIAL_SCHEMA_VERSION,
  modelVersion: 'legacy-physics-config-air-material',
  materialId: PISTON_OSCILLATION_AIR_MATERIAL_ID,
  adiabaticIndex,
  provenance: 'legacy-inferred',
});

export const isPistonOscillationAirMaterialSnapshot = (
  value: unknown,
): value is PistonOscillationAirMaterialSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Partial<PistonOscillationAirMaterialSnapshot>;
  return snapshot.schemaVersion === PISTON_OSCILLATION_AIR_MATERIAL_SCHEMA_VERSION
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
      snapshot.provenance !== 'captured'
      || (
        snapshot.modelVersion === PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION
        && snapshot.materialId === PISTON_OSCILLATION_AIR_MATERIAL_ID
        && snapshot.adiabaticIndex === PISTON_OSCILLATION_AIR_ADIABATIC_INDEX
      )
    );
};

