import {
  calculateFreeGasHeatCapacityJPerK,
} from './heatCapacityFreeThermalModel.ts';
import {
  applyHeatCapacityMassEnergyFlux,
  deriveHeatCapacityThermodynamicState,
  type HeatCapacityThermodynamicState,
  type HeatCapacityThermodynamicSystemConfig,
} from './heatCapacityThermodynamicKernel.ts';

export interface HeatCapacityFreePumpValveExchangeConfig {
  enabled: boolean;
  gasExchangeRatePerS: number;
  thermalConductanceWPerK: number;
  openingDelayS: number;
}

export interface HeatCapacityFreePumpValveExchangeState {
  gasAmountRatio: number;
  gasTemperatureK: number;
}

export interface HeatCapacityFreePumpValveExchangeInput {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  vesselVolumeL: number;
  gamma: number;
  dtS: number;
  valveOpenElapsedBeforeS: number;
}

export interface HeatCapacityFreePumpValveExchangeResult {
  state: HeatCapacityFreePumpValveExchangeState;
  activeDtS: number;
  gasExchangeAmountRatio: number;
  heatGasToChamberJ: number;
}

export interface HeatCapacityFreePumpValveThermodynamicExchangeResult {
  state: HeatCapacityThermodynamicState;
  activeDtS: number;
  gasExchangeAmountMol: number;
  heatGasToChamberJ: number;
}

export const DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG: HeatCapacityFreePumpValveExchangeConfig = {
  enabled: false,
  gasExchangeRatePerS: 0.00015,
  thermalConductanceWPerK: 0.01,
  openingDelayS: 0.42,
};

const MIN_GAS_AMOUNT_RATIO = 0.000001;
const MIN_TEMPERATURE_K = 1;

const finiteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) ? value : fallback
);

const positiveFiniteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) && value > 0 ? value : fallback
);

const nonNegativeFiniteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) && value >= 0 ? value : fallback
);

const clampFinite = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
);

export const normalizeFreePumpValveExchangeConfig = (
  value: Partial<HeatCapacityFreePumpValveExchangeConfig> | null | undefined,
): HeatCapacityFreePumpValveExchangeConfig => {
  if (
    value?.gasExchangeRatePerS !== undefined &&
    !Number.isFinite(value.gasExchangeRatePerS)
  ) {
    return { ...DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG };
  }
  return {
    enabled: value?.enabled === true,
    gasExchangeRatePerS: clampFinite(
      value?.gasExchangeRatePerS ?? DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG.gasExchangeRatePerS,
      0,
      0.02,
      DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG.gasExchangeRatePerS,
    ),
    thermalConductanceWPerK: clampFinite(
      value?.thermalConductanceWPerK ?? DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG.thermalConductanceWPerK,
      0,
      1,
      DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG.thermalConductanceWPerK,
    ),
    openingDelayS: clampFinite(
      value?.openingDelayS ?? DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG.openingDelayS,
      0,
      5,
      DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG.openingDelayS,
    ),
  };
};

const calculateActiveOpenDurationS = (
  valveOpenElapsedBeforeS: number,
  dtS: number,
  openingDelayS: number,
) => {
  const elapsedBeforeS = nonNegativeFiniteOrFallback(valveOpenElapsedBeforeS, 0);
  const stepS = nonNegativeFiniteOrFallback(dtS, 0);
  const delayS = nonNegativeFiniteOrFallback(openingDelayS, 0);
  const activeBeforeS = Math.max(0, elapsedBeforeS - delayS);
  const activeAfterS = Math.max(0, elapsedBeforeS + stepS - delayS);
  return Math.max(0, activeAfterS - activeBeforeS);
};

const calculatePressureRatio = (
  amountRatio: number,
  gasTemperatureK: number,
  ambientTemperatureK: number,
) => amountRatio * (gasTemperatureK / ambientTemperatureK);

const stepGasExchange = (
  state: HeatCapacityFreePumpValveExchangeState,
  config: HeatCapacityFreePumpValveExchangeConfig,
  input: HeatCapacityFreePumpValveExchangeInput,
  activeDtS: number,
) => {
  const rate = nonNegativeFiniteOrFallback(config.gasExchangeRatePerS, 0);
  if (rate <= 0 || activeDtS <= 0) {
    return {
      state,
      gasExchangeAmountRatio: 0,
    };
  }

  const ambientTemperatureK = positiveFiniteOrFallback(input.ambientTemperatureK, 298.15);
  const gasTemperatureK = positiveFiniteOrFallback(state.gasTemperatureK, ambientTemperatureK);
  const amountRatio = positiveFiniteOrFallback(state.gasAmountRatio, 1);
  const pressureRatio = calculatePressureRatio(amountRatio, gasTemperatureK, ambientTemperatureK);
  const pressureDrive = Math.sign(pressureRatio - 1) *
    Math.abs(pressureRatio * pressureRatio - 1);
  if (Math.abs(pressureDrive) <= 0) {
    return {
      state: {
        gasAmountRatio: amountRatio,
        gasTemperatureK,
      },
      gasExchangeAmountRatio: 0,
    };
  }

  const equilibriumAmountRatio = Math.max(
    MIN_GAS_AMOUNT_RATIO,
    ambientTemperatureK / gasTemperatureK,
  );
  const maxStepRatio = rate * Math.abs(pressureDrive) * activeDtS;
  const chamberTemperatureK = Math.max(
    MIN_TEMPERATURE_K,
    ambientTemperatureK,
  );

  if (pressureDrive > 0) {
    const outflowAmountRatio = Math.min(
      amountRatio - equilibriumAmountRatio,
      maxStepRatio,
    );
    const safeOutflowAmountRatio = Math.max(0, outflowAmountRatio);
    return {
      state: {
        gasAmountRatio: Math.max(MIN_GAS_AMOUNT_RATIO, amountRatio - safeOutflowAmountRatio),
        gasTemperatureK,
      },
      gasExchangeAmountRatio: -safeOutflowAmountRatio,
    };
  }

  const inflowAmountRatio = Math.min(
    equilibriumAmountRatio - amountRatio,
    maxStepRatio,
  );
  const safeInflowAmountRatio = Math.max(0, inflowAmountRatio);
  if (safeInflowAmountRatio <= 0) {
    return {
      state: {
        gasAmountRatio: amountRatio,
        gasTemperatureK,
      },
      gasExchangeAmountRatio: 0,
    };
  }
  const nextAmountRatio = amountRatio + safeInflowAmountRatio;
  return {
    state: {
      gasAmountRatio: nextAmountRatio,
      gasTemperatureK: (
        amountRatio * gasTemperatureK +
        safeInflowAmountRatio * chamberTemperatureK
      ) / nextAmountRatio,
    },
    gasExchangeAmountRatio: safeInflowAmountRatio,
  };
};

const stepThermalExchange = (
  state: HeatCapacityFreePumpValveExchangeState,
  config: HeatCapacityFreePumpValveExchangeConfig,
  input: HeatCapacityFreePumpValveExchangeInput,
  activeDtS: number,
) => {
  const conductance = nonNegativeFiniteOrFallback(config.thermalConductanceWPerK, 0);
  if (conductance <= 0 || activeDtS <= 0) {
    return {
      state,
      heatGasToChamberJ: 0,
    };
  }

  const ambientTemperatureK = positiveFiniteOrFallback(input.ambientTemperatureK, 298.15);
  const chamberTemperatureK = Math.max(
    MIN_TEMPERATURE_K,
    ambientTemperatureK,
  );
  const gasTemperatureK = positiveFiniteOrFallback(state.gasTemperatureK, ambientTemperatureK);
  const gasHeatCapacityJPerK = calculateFreeGasHeatCapacityJPerK({
    ambientPressureKPa: positiveFiniteOrFallback(input.ambientPressureKPa, 101.3),
    ambientTemperatureK,
    vesselVolumeL: positiveFiniteOrFallback(input.vesselVolumeL, 2),
    gamma: Math.max(1.001, finiteOrFallback(input.gamma, 1.4)),
    gasAmountRatio: positiveFiniteOrFallback(state.gasAmountRatio, 1),
  }, 0.1);
  const heatGasToChamberJ = conductance *
    (gasTemperatureK - chamberTemperatureK) *
    activeDtS;
  const nextTemperatureK = Math.max(
    MIN_TEMPERATURE_K,
    gasTemperatureK - heatGasToChamberJ / gasHeatCapacityJPerK,
  );
  return {
    state: {
      ...state,
      gasTemperatureK: finiteOrFallback(nextTemperatureK, gasTemperatureK),
    },
    heatGasToChamberJ,
  };
};

export const stepFreePumpValveExchange = (
  state: HeatCapacityFreePumpValveExchangeState,
  config: HeatCapacityFreePumpValveExchangeConfig,
  input: HeatCapacityFreePumpValveExchangeInput,
): HeatCapacityFreePumpValveExchangeResult => {
  const safeConfig = normalizeFreePumpValveExchangeConfig(config);
  const normalizedState = {
    gasAmountRatio: positiveFiniteOrFallback(state.gasAmountRatio, 1),
    gasTemperatureK: positiveFiniteOrFallback(
      state.gasTemperatureK,
      positiveFiniteOrFallback(input.ambientTemperatureK, 298.15),
    ),
  };
  const activeDtS = safeConfig.enabled
    ? calculateActiveOpenDurationS(
      input.valveOpenElapsedBeforeS,
      input.dtS,
      safeConfig.openingDelayS,
    )
    : 0;
  if (!safeConfig.enabled || activeDtS <= 0) {
    return {
      state: normalizedState,
      activeDtS,
      gasExchangeAmountRatio: 0,
      heatGasToChamberJ: 0,
    };
  }

  const gasExchange = stepGasExchange(normalizedState, safeConfig, input, activeDtS);
  const thermalExchange = stepThermalExchange(gasExchange.state, safeConfig, input, activeDtS);

  return {
    state: {
      gasAmountRatio: finiteOrFallback(
        thermalExchange.state.gasAmountRatio,
        normalizedState.gasAmountRatio,
      ),
      gasTemperatureK: finiteOrFallback(
        thermalExchange.state.gasTemperatureK,
        normalizedState.gasTemperatureK,
      ),
    },
    activeDtS,
    gasExchangeAmountRatio: gasExchange.gasExchangeAmountRatio,
    heatGasToChamberJ: thermalExchange.heatGasToChamberJ,
  };
};

export const stepFreePumpValveThermodynamicExchange = (
  state: HeatCapacityThermodynamicState,
  system: HeatCapacityThermodynamicSystemConfig,
  config: HeatCapacityFreePumpValveExchangeConfig,
  input: HeatCapacityFreePumpValveExchangeInput,
): HeatCapacityFreePumpValveThermodynamicExchangeResult => {
  const safeConfig = normalizeFreePumpValveExchangeConfig(config);
  const activeDtS = safeConfig.enabled
    ? calculateActiveOpenDurationS(
      input.valveOpenElapsedBeforeS,
      input.dtS,
      safeConfig.openingDelayS,
    )
    : 0;
  if (!safeConfig.enabled || activeDtS <= 0) {
    return {
      state,
      activeDtS,
      gasExchangeAmountMol: 0,
      heatGasToChamberJ: 0,
    };
  }

  const before = deriveHeatCapacityThermodynamicState(state, system);
  const projectedExchange = stepGasExchange(
    {
      gasAmountRatio: before.gasAmountRatio,
      gasTemperatureK: before.gasTemperatureK,
    },
    safeConfig,
    input,
    activeDtS,
  );
  const gasExchangeAmountMol = (
    projectedExchange.state.gasAmountRatio - before.gasAmountRatio
  ) * system.referenceAmountMol;
  const sourceTemperatureK = gasExchangeAmountMol > 0
    ? positiveFiniteOrFallback(input.ambientTemperatureK, before.gasTemperatureK)
    : before.gasTemperatureK;
  const massExchangedState = gasExchangeAmountMol === 0
    ? state
    : applyHeatCapacityMassEnergyFlux(state, {
        source: 'pump-valve-gas-exchange',
        amountDeltaMol: gasExchangeAmountMol,
        internalEnergyDeltaJ: gasExchangeAmountMol *
          before.cvMolarJPerMolK *
          sourceTemperatureK,
      });
  const afterMassExchange = deriveHeatCapacityThermodynamicState(
    massExchangedState,
    system,
  );
  const chamberTemperatureK = positiveFiniteOrFallback(
    input.ambientTemperatureK,
    afterMassExchange.gasTemperatureK,
  );
  const requestedHeatGasToChamberJ = safeConfig.thermalConductanceWPerK *
    (afterMassExchange.gasTemperatureK - chamberTemperatureK) *
    activeDtS;
  const equilibriumHeatGasToChamberJ = afterMassExchange.gasHeatCapacityJPerK *
    (afterMassExchange.gasTemperatureK - chamberTemperatureK);
  const heatGasToChamberJ = Math.sign(requestedHeatGasToChamberJ) ===
    Math.sign(equilibriumHeatGasToChamberJ)
    ? Math.sign(requestedHeatGasToChamberJ) * Math.min(
        Math.abs(requestedHeatGasToChamberJ),
        Math.abs(equilibriumHeatGasToChamberJ),
      )
    : 0;
  const nextState = heatGasToChamberJ === 0
    ? massExchangedState
    : applyHeatCapacityMassEnergyFlux(massExchangedState, {
        source: 'pump-valve-thermal-exchange',
        amountDeltaMol: 0,
        internalEnergyDeltaJ: -heatGasToChamberJ,
      });
  return {
    state: nextState,
    activeDtS,
    gasExchangeAmountMol,
    heatGasToChamberJ,
  };
};
