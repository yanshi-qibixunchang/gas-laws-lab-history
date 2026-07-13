export const HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K = 8.314462618;
export const REDUCED_FLOW_WORK_PUMP_ENERGY_MODEL_V1 = 'reduced-flow-work-pump-energy-v1' as const;

const DEFAULT_HEAT_EXCHANGE_MAX_SUBSTEP_S = 0.02;
const MIN_POSITIVE_VALUE = 1e-12;

export interface HeatCapacityThermodynamicState {
  amountMol: number;
  internalEnergyJ: number;
  wallTemperatureK: number;
}

export interface HeatCapacityThermodynamicSystemConfig {
  gammaTrue: number;
  vesselVolumeL: number;
  referenceAmountMol: number;
}

export interface HeatCapacityThermodynamicDerivedState {
  amountMol: number;
  internalEnergyJ: number;
  wallTemperatureK: number;
  gasTemperatureK: number;
  gasPressureKPa: number;
  gasAmountRatio: number;
  cvMolarJPerMolK: number;
  cpMolarJPerMolK: number;
  gasHeatCapacityJPerK: number;
}

export interface HeatCapacityAmbientInitializationInput {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  vesselVolumeL: number;
  gammaTrue: number;
}

export interface HeatCapacityThermodynamicInitialization {
  state: HeatCapacityThermodynamicState;
  system: HeatCapacityThermodynamicSystemConfig;
}

export interface HeatCapacityMassEnergyFlux {
  source: string;
  amountDeltaMol: number;
  internalEnergyDeltaJ: number;
}

export type ReducedFlowWorkPumpEnergyUsageV1 =
  | 'production'
  | 'ideal-upper-bound-test';

export interface ReducedFlowWorkPumpEnergyInputV1 {
  amountDeltaMol: number;
  ambientTemperatureK: number;
  gammaTrue: number;
  pumpWorkRetention: number;
  usage?: ReducedFlowWorkPumpEnergyUsageV1;
}

export interface ReducedFlowWorkPumpEnergyLedgerV1 {
  environmentInternalEnergyJ: number;
  idealFlowWorkJ: number;
  retainedFlowWorkJ: number;
  externalLossJ: number;
  vesselInternalEnergyGainJ: number;
}

export interface ReducedFlowWorkPumpEnergyResultV1 {
  model: typeof REDUCED_FLOW_WORK_PUMP_ENERGY_MODEL_V1;
  retention: number;
  flux: HeatCapacityMassEnergyFlux;
  ledger: ReducedFlowWorkPumpEnergyLedgerV1;
}

export interface HeatCapacityHeatExchangeConfig {
  ambientTemperatureK: number;
  gasWallConductanceWPerK: number;
  wallAmbientConductanceWPerK: number;
  wallHeatCapacityJPerK: number;
  maxSubstepS?: number;
}

export interface HeatCapacityHeatExchangeLedger {
  heatGasToWallJ: number;
  heatWallToAmbientJ: number;
}

export interface HeatCapacityHeatExchangeResult {
  state: HeatCapacityThermodynamicState;
  ledger: HeatCapacityHeatExchangeLedger;
}

const requireFinite = (value: number, label: string) => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`);
  }
  return value;
};

const requirePositive = (value: number, label: string) => {
  requireFinite(value, label);
  if (value <= 0) {
    throw new RangeError(`${label} must be greater than zero.`);
  }
  return value;
};

const requireNonNegative = (value: number, label: string) => {
  requireFinite(value, label);
  if (value < 0) {
    throw new RangeError(`${label} must not be negative.`);
  }
  return value;
};

export const deriveHeatCapacityMolarProperties = (gammaTrue: number) => {
  const gamma = requireFinite(gammaTrue, 'gammaTrue');
  if (gamma <= 1) {
    throw new RangeError('gammaTrue must be greater than one.');
  }
  const cvMolarJPerMolK = HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K /
    (gamma - 1);
  return {
    cvMolarJPerMolK,
    cpMolarJPerMolK: cvMolarJPerMolK + HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K,
  };
};

export const calculateHeatCapacityIdealGasAmountMol = ({
  ambientPressureKPa,
  ambientTemperatureK,
  vesselVolumeL,
}: Pick<
  HeatCapacityAmbientInitializationInput,
  'ambientPressureKPa' | 'ambientTemperatureK' | 'vesselVolumeL'
>) => {
  const pressurePa = requirePositive(ambientPressureKPa, 'ambientPressureKPa') * 1000;
  const temperatureK = requirePositive(ambientTemperatureK, 'ambientTemperatureK');
  const volumeM3 = requirePositive(vesselVolumeL, 'vesselVolumeL') / 1000;
  return pressurePa * volumeM3 /
    (HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K * temperatureK);
};

export const createHeatCapacityThermodynamicStateFromTemperature = ({
  amountMol,
  gasTemperatureK,
  wallTemperatureK,
  gammaTrue,
}: {
  amountMol: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
  gammaTrue: number;
}): HeatCapacityThermodynamicState => {
  const safeAmountMol = requirePositive(amountMol, 'amountMol');
  const safeGasTemperatureK = requirePositive(gasTemperatureK, 'gasTemperatureK');
  const safeWallTemperatureK = requirePositive(wallTemperatureK, 'wallTemperatureK');
  const { cvMolarJPerMolK } = deriveHeatCapacityMolarProperties(gammaTrue);
  return {
    amountMol: safeAmountMol,
    internalEnergyJ: safeAmountMol * cvMolarJPerMolK * safeGasTemperatureK,
    wallTemperatureK: safeWallTemperatureK,
  };
};

export const createHeatCapacityThermodynamicStateAtAmbient = (
  input: HeatCapacityAmbientInitializationInput,
): HeatCapacityThermodynamicInitialization => {
  const referenceAmountMol = calculateHeatCapacityIdealGasAmountMol(input);
  return {
    state: createHeatCapacityThermodynamicStateFromTemperature({
      amountMol: referenceAmountMol,
      gasTemperatureK: input.ambientTemperatureK,
      wallTemperatureK: input.ambientTemperatureK,
      gammaTrue: input.gammaTrue,
    }),
    system: {
      gammaTrue: input.gammaTrue,
      vesselVolumeL: input.vesselVolumeL,
      referenceAmountMol,
    },
  };
};

export const deriveHeatCapacityThermodynamicState = (
  state: HeatCapacityThermodynamicState,
  system: HeatCapacityThermodynamicSystemConfig,
): HeatCapacityThermodynamicDerivedState => {
  const amountMol = requirePositive(state.amountMol, 'state.amountMol');
  const internalEnergyJ = requirePositive(state.internalEnergyJ, 'state.internalEnergyJ');
  const wallTemperatureK = requirePositive(state.wallTemperatureK, 'state.wallTemperatureK');
  const vesselVolumeM3 = requirePositive(system.vesselVolumeL, 'system.vesselVolumeL') / 1000;
  const referenceAmountMol = requirePositive(system.referenceAmountMol, 'system.referenceAmountMol');
  const { cvMolarJPerMolK, cpMolarJPerMolK } = deriveHeatCapacityMolarProperties(system.gammaTrue);
  const gasHeatCapacityJPerK = amountMol * cvMolarJPerMolK;
  const gasTemperatureK = internalEnergyJ / gasHeatCapacityJPerK;
  const gasPressureKPa = amountMol *
    HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K *
    gasTemperatureK /
    vesselVolumeM3 /
    1000;
  return {
    amountMol,
    internalEnergyJ,
    wallTemperatureK,
    gasTemperatureK,
    gasPressureKPa,
    gasAmountRatio: amountMol / referenceAmountMol,
    cvMolarJPerMolK,
    cpMolarJPerMolK,
    gasHeatCapacityJPerK,
  };
};

export const applyHeatCapacityMassEnergyFlux = (
  state: HeatCapacityThermodynamicState,
  flux: HeatCapacityMassEnergyFlux,
): HeatCapacityThermodynamicState => {
  requireFinite(flux.amountDeltaMol, 'flux.amountDeltaMol');
  requireFinite(flux.internalEnergyDeltaJ, 'flux.internalEnergyDeltaJ');
  const amountMol = state.amountMol + flux.amountDeltaMol;
  const internalEnergyJ = state.internalEnergyJ + flux.internalEnergyDeltaJ;
  requirePositive(amountMol, 'result.amountMol');
  requirePositive(internalEnergyJ, 'result.internalEnergyJ');
  return {
    amountMol,
    internalEnergyJ,
    wallTemperatureK: requirePositive(state.wallTemperatureK, 'state.wallTemperatureK'),
  };
};

export const normalizeReducedFlowWorkPumpRetentionV1 = (value: number) => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
);

export const createReducedFlowWorkPumpEnergyFluxV1 = (
  input: ReducedFlowWorkPumpEnergyInputV1,
): ReducedFlowWorkPumpEnergyResultV1 => {
  const amountDeltaMol = requireNonNegative(input.amountDeltaMol, 'amountDeltaMol');
  const ambientTemperatureK = requirePositive(input.ambientTemperatureK, 'ambientTemperatureK');
  const retention = normalizeReducedFlowWorkPumpRetentionV1(input.pumpWorkRetention);
  const usage = input.usage ?? 'production';
  if (retention === 1 && usage !== 'ideal-upper-bound-test') {
    throw new RangeError(
      'pumpWorkRetention = 1 is reserved for ideal-upper-bound-test usage.',
    );
  }
  const { cvMolarJPerMolK } = deriveHeatCapacityMolarProperties(input.gammaTrue);
  const environmentInternalEnergyJ = amountDeltaMol * cvMolarJPerMolK * ambientTemperatureK;
  const idealFlowWorkJ = amountDeltaMol *
    HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K *
    ambientTemperatureK;
  const retainedFlowWorkJ = idealFlowWorkJ * retention;
  const externalLossJ = idealFlowWorkJ - retainedFlowWorkJ;
  const vesselInternalEnergyGainJ = environmentInternalEnergyJ + retainedFlowWorkJ;
  return {
    model: REDUCED_FLOW_WORK_PUMP_ENERGY_MODEL_V1,
    retention,
    flux: {
      source: REDUCED_FLOW_WORK_PUMP_ENERGY_MODEL_V1,
      amountDeltaMol,
      internalEnergyDeltaJ: vesselInternalEnergyGainJ,
    },
    ledger: {
      environmentInternalEnergyJ,
      idealFlowWorkJ,
      retainedFlowWorkJ,
      externalLossJ,
      vesselInternalEnergyGainJ,
    },
  };
};

const clampTowardEquilibrium = (requestedJ: number, equilibriumJ: number) => {
  if (requestedJ === 0 || equilibriumJ === 0 || Math.sign(requestedJ) !== Math.sign(equilibriumJ)) {
    return 0;
  }
  return Math.sign(requestedJ) * Math.min(Math.abs(requestedJ), Math.abs(equilibriumJ));
};

export const stepHeatCapacityThermodynamicHeatExchange = (
  state: HeatCapacityThermodynamicState,
  system: HeatCapacityThermodynamicSystemConfig,
  config: HeatCapacityHeatExchangeConfig,
  dtS: number,
): HeatCapacityHeatExchangeResult => {
  const totalDtS = requireNonNegative(dtS, 'dtS');
  const ambientTemperatureK = requirePositive(config.ambientTemperatureK, 'ambientTemperatureK');
  const gasWallConductanceWPerK = requireNonNegative(
    config.gasWallConductanceWPerK,
    'gasWallConductanceWPerK',
  );
  const wallAmbientConductanceWPerK = requireNonNegative(
    config.wallAmbientConductanceWPerK,
    'wallAmbientConductanceWPerK',
  );
  const wallHeatCapacityJPerK = requirePositive(config.wallHeatCapacityJPerK, 'wallHeatCapacityJPerK');
  const maxSubstepS = requirePositive(
    config.maxSubstepS ?? DEFAULT_HEAT_EXCHANGE_MAX_SUBSTEP_S,
    'maxSubstepS',
  );
  let nextState = {
    amountMol: requirePositive(state.amountMol, 'state.amountMol'),
    internalEnergyJ: requirePositive(state.internalEnergyJ, 'state.internalEnergyJ'),
    wallTemperatureK: requirePositive(state.wallTemperatureK, 'state.wallTemperatureK'),
  };
  let remainingS = totalDtS;
  let heatGasToWallJ = 0;
  let heatWallToAmbientJ = 0;

  while (remainingS > 0) {
    const stepS = Math.min(remainingS, maxSubstepS);
    const derived = deriveHeatCapacityThermodynamicState(nextState, system);
    const gasWallEquilibriumJ = (
      derived.gasTemperatureK - nextState.wallTemperatureK
    ) / (
      1 / derived.gasHeatCapacityJPerK + 1 / wallHeatCapacityJPerK
    );
    const requestedGasToWallJ = gasWallConductanceWPerK *
      (derived.gasTemperatureK - nextState.wallTemperatureK) *
      stepS;
    const gasToWallJ = clampTowardEquilibrium(requestedGasToWallJ, gasWallEquilibriumJ);
    const internalEnergyJ = Math.max(
      MIN_POSITIVE_VALUE,
      nextState.internalEnergyJ - gasToWallJ,
    );
    const wallAfterGasK = nextState.wallTemperatureK + gasToWallJ / wallHeatCapacityJPerK;
    const requestedWallToAmbientJ = wallAmbientConductanceWPerK *
      (wallAfterGasK - ambientTemperatureK) *
      stepS;
    const wallAmbientEquilibriumJ = wallHeatCapacityJPerK *
      (wallAfterGasK - ambientTemperatureK);
    const wallToAmbientJ = clampTowardEquilibrium(
      requestedWallToAmbientJ,
      wallAmbientEquilibriumJ,
    );
    nextState = {
      amountMol: nextState.amountMol,
      internalEnergyJ,
      wallTemperatureK: Math.max(
        MIN_POSITIVE_VALUE,
        wallAfterGasK - wallToAmbientJ / wallHeatCapacityJPerK,
      ),
    };
    heatGasToWallJ += gasToWallJ;
    heatWallToAmbientJ += wallToAmbientJ;
    remainingS -= stepS;
  }

  return {
    state: nextState,
    ledger: {
      heatGasToWallJ,
      heatWallToAmbientJ,
    },
  };
};
