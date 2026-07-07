export type HeatCapacityFreeGasType = 'air' | 'helium';

export const HEAT_CAPACITY_FREE_GAS_TYPES: readonly HeatCapacityFreeGasType[] = ['air', 'helium'];

export interface HeatCapacityFreeGasTypeModelDefaults {
  gamma: number;
  gasWallConductanceWPerK: number;
  leakageRatePerS: number;
}

export const HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS: Record<
  HeatCapacityFreeGasType,
  HeatCapacityFreeGasTypeModelDefaults
> = {
  air: {
    gamma: 1.4,
    gasWallConductanceWPerK: 0.14,
    leakageRatePerS: 0.00005,
  },
  helium: {
    gamma: 5 / 3,
    gasWallConductanceWPerK: 0.03,
    leakageRatePerS: 0.00004,
  },
};

export const getHeatCapacityFreeGasTypeGamma = (
  gasType: HeatCapacityFreeGasType,
): number => (
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS[gasType].gamma
);

export const getHeatCapacityFreeGasTypeModelDefaults = (
  gasType: HeatCapacityFreeGasType,
): HeatCapacityFreeGasTypeModelDefaults => ({
  ...HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS[gasType],
});

export const normalizeHeatCapacityFreeGasType = (
  value: unknown,
  fallback: HeatCapacityFreeGasType = 'air',
): HeatCapacityFreeGasType => (
  value === 'air' || value === 'helium' ? value : fallback
);

export const resolveHeatCapacityFreeGasTypeFromGamma = (
  gamma: unknown,
  fallback: HeatCapacityFreeGasType = 'air',
): HeatCapacityFreeGasType => {
  const numericGamma = typeof gamma === 'number' && Number.isFinite(gamma)
    ? gamma
    : getHeatCapacityFreeGasTypeGamma(fallback);
  const airDistance = Math.abs(numericGamma - getHeatCapacityFreeGasTypeGamma('air'));
  const heliumDistance = Math.abs(numericGamma - getHeatCapacityFreeGasTypeGamma('helium'));
  return heliumDistance < airDistance ? 'helium' : 'air';
};
