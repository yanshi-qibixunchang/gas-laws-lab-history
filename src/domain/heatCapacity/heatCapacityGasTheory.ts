import {
  HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS,
} from './heatCapacityDefaultConfig.ts';

export type HeatCapacityFreeGasType = 'air' | 'helium';

export type HeatCapacityGammaAbsoluteErrorLevel =
  | 'absoluteIdeal'
  | 'idealExperiment'
  | 'bestRealistic'
  | 'suitable'
  | 'severe'
  | 'outsideReference';

export const HEAT_CAPACITY_FREE_GAS_TYPES: readonly HeatCapacityFreeGasType[] = ['air', 'helium'];
export const HEAT_CAPACITY_FREE_IDEAL_GAS_TYPE: HeatCapacityFreeGasType = 'air';

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
    leakageRatePerS: 0.000035,
  },
};

export const getHeatCapacityFreeGasTypeGamma = (
  gasType: HeatCapacityFreeGasType,
): number => (
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS[gasType].gamma
);

export const getHeatCapacityFreeIdealTheoreticalGamma = (): number => (
  getHeatCapacityFreeGasTypeGamma(HEAT_CAPACITY_FREE_IDEAL_GAS_TYPE)
);

export const getHeatCapacityFreeGasTypeModelDefaults = (
  gasType: HeatCapacityFreeGasType,
): HeatCapacityFreeGasTypeModelDefaults => ({
  ...HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS[gasType],
});

export const calculateHeatCapacityGammaAbsoluteError = (
  gamma: number | null,
  theoreticalGamma: number,
): number | null => (
  gamma !== null && Number.isFinite(gamma) && Number.isFinite(theoreticalGamma)
    ? Math.abs(gamma - theoreticalGamma)
    : null
);

export const classifyHeatCapacityGammaAbsoluteError = (
  absoluteError: number | null,
): HeatCapacityGammaAbsoluteErrorLevel | null => {
  if (absoluteError === null || !Number.isFinite(absoluteError)) return null;
  const within = (limit: number) => absoluteError <= limit + 1e-12;
  if (within(HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS.absoluteIdeal)) return 'absoluteIdeal';
  if (within(HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS.idealExperiment)) return 'idealExperiment';
  if (within(HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS.bestRealistic)) return 'bestRealistic';
  if (within(HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS.suitable)) return 'suitable';
  if (within(HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS.severe)) return 'severe';
  return 'outsideReference';
};

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
