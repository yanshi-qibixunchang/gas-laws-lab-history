export const FREE_THERMAL_AIR_GAS_CONSTANT_J_PER_MOL_K = 8.314462618;
export const FREE_THERMAL_MAX_SUBSTEP_S = 0.02;

export interface HeatCapacityFreeThermalConfig {
  gasWallConductanceWPerK: number;
  wallAmbientConductanceWPerK: number;
  wallHeatCapacityJPerK: number;
  minimumGasHeatCapacityJPerK: number;
}

export interface HeatCapacityFreeThermalState {
  gasTemperatureK: number;
  wallTemperatureK: number;
}

export interface HeatCapacityFreeThermalStepInput {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  vesselVolumeL: number;
  gamma: number;
  gasAmountRatio: number;
  dtS: number;
}

export interface HeatCapacityFreeThermalStepResult {
  state: HeatCapacityFreeThermalState;
  gasHeatCapacityJPerK: number;
  heatGasToWallJ: number;
  heatWallToAmbientJ: number;
}

const finiteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) ? value : fallback
);

const positiveFiniteOrZero = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

const clampFinite = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
);

export const deriveEffectiveFreeGasWallConductanceWPerK = (
  baseConductanceWPerK: number,
  deltaTK: number,
) => {
  const kneeK = 4;
  const gain = 0.35;
  const maxBoost = 2.5;
  const boost = Math.min(
    maxBoost,
    Math.pow(Math.max(0, deltaTK) / kneeK, 0.25),
  );
  return baseConductanceWPerK * (1 + gain * boost);
};

export const normalizeFreeThermalConfig = (
  value: Partial<HeatCapacityFreeThermalConfig> | null | undefined,
): HeatCapacityFreeThermalConfig => ({
  gasWallConductanceWPerK: clampFinite(value?.gasWallConductanceWPerK ?? 0.08, 0, 5, 0.08),
  wallAmbientConductanceWPerK: clampFinite(value?.wallAmbientConductanceWPerK ?? 0.45, 0, 5, 0.45),
  wallHeatCapacityJPerK: clampFinite(value?.wallHeatCapacityJPerK ?? 45, 1, 5000, 45),
  minimumGasHeatCapacityJPerK: clampFinite(value?.minimumGasHeatCapacityJPerK ?? 0.1, 0.01, 10, 0.1),
});

export const createDefaultFreeThermalState = (
  ambientTemperatureK: number,
): HeatCapacityFreeThermalState => ({
  gasTemperatureK: ambientTemperatureK,
  wallTemperatureK: ambientTemperatureK,
});

export const calculateFreeGasMoles = (
  input: Pick<
    HeatCapacityFreeThermalStepInput,
    'ambientPressureKPa' | 'ambientTemperatureK' | 'vesselVolumeL' | 'gasAmountRatio'
  >,
) => {
  const pressurePa = input.ambientPressureKPa * 1000;
  const volumeM3 = input.vesselVolumeL / 1000;
  return positiveFiniteOrZero(
    (pressurePa * volumeM3 * input.gasAmountRatio) /
      (FREE_THERMAL_AIR_GAS_CONSTANT_J_PER_MOL_K * input.ambientTemperatureK),
  );
};

export const calculateFreeGasHeatCapacityJPerK = (
  input: Pick<
    HeatCapacityFreeThermalStepInput,
    'ambientPressureKPa' | 'ambientTemperatureK' | 'vesselVolumeL' | 'gamma' | 'gasAmountRatio'
  >,
  minimumGasHeatCapacityJPerK: number,
) => {
  const minimum = clampFinite(minimumGasHeatCapacityJPerK, 0.01, 10, 0.1);
  const gammaMinusOne = input.gamma - 1;
  if (!Number.isFinite(gammaMinusOne) || gammaMinusOne <= 0) {
    return minimum;
  }
  const moles = calculateFreeGasMoles(input);
  const heatCapacity = moles * FREE_THERMAL_AIR_GAS_CONSTANT_J_PER_MOL_K / gammaMinusOne;
  return Math.max(positiveFiniteOrZero(heatCapacity), minimum);
};

export const stepFreeThermalState = (
  state: HeatCapacityFreeThermalState,
  config: HeatCapacityFreeThermalConfig,
  input: HeatCapacityFreeThermalStepInput,
): HeatCapacityFreeThermalStepResult => {
  const safeConfig = normalizeFreeThermalConfig(config);
  const dtS = positiveFiniteOrZero(input.dtS);
  const gasHeatCapacityJPerK = calculateFreeGasHeatCapacityJPerK(
    input,
    safeConfig.minimumGasHeatCapacityJPerK,
  );
  const wallHeatCapacityJPerK = safeConfig.wallHeatCapacityJPerK;
  const gasWallConductanceWPerK = safeConfig.gasWallConductanceWPerK;
  const wallAmbientConductanceWPerK = safeConfig.wallAmbientConductanceWPerK;

  let gasTemperatureK = state.gasTemperatureK;
  let wallTemperatureK = state.wallTemperatureK;
  let remainingS = dtS;
  let totalHeatGasToWallJ = 0;
  let totalHeatWallToAmbientJ = 0;

  while (remainingS > 0) {
    const stepS = Math.min(remainingS, FREE_THERMAL_MAX_SUBSTEP_S);
    const gasWallConductanceStepWPerK = deriveEffectiveFreeGasWallConductanceWPerK(
      gasWallConductanceWPerK,
      Math.abs(gasTemperatureK - wallTemperatureK),
    );
    const heatGasToWallJ =
      gasWallConductanceStepWPerK * (gasTemperatureK - wallTemperatureK) * stepS;
    const heatWallToAmbientJ =
      wallAmbientConductanceWPerK * (wallTemperatureK - input.ambientTemperatureK) * stepS;

    gasTemperatureK -= heatGasToWallJ / gasHeatCapacityJPerK;
    wallTemperatureK += (heatGasToWallJ - heatWallToAmbientJ) / wallHeatCapacityJPerK;

    totalHeatGasToWallJ += heatGasToWallJ;
    totalHeatWallToAmbientJ += heatWallToAmbientJ;
    remainingS -= stepS;
  }

  return {
    state: {
      gasTemperatureK: finiteOrFallback(gasTemperatureK, state.gasTemperatureK),
      wallTemperatureK: finiteOrFallback(wallTemperatureK, state.wallTemperatureK),
    },
    gasHeatCapacityJPerK,
    heatGasToWallJ: totalHeatGasToWallJ,
    heatWallToAmbientJ: totalHeatWallToAmbientJ,
  };
};
