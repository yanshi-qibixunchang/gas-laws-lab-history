import {
  deriveEffectiveFreeGasWallConductanceWPerK,
  type HeatCapacityFreeThermalConfig,
} from './heatCapacityFreeThermalModel.ts';
import {
  stepFreeLeakageThermodynamicState,
  type HeatCapacityFreeLeakageConfig,
} from './heatCapacityFreeLeakageModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG,
  stepFreePumpValveThermodynamicExchange,
  type HeatCapacityFreePumpValveExchangeConfig,
} from './heatCapacityFreePumpValveExchangeModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG,
  sampleFreeEnvironmentDisturbance,
  type HeatCapacityFreeEnvironmentDisturbanceConfig,
} from './heatCapacityFreeEnvironmentDisturbanceModel.ts';
import {
  getHeatCapacityReleaseApertureEffectiveDtS,
} from './heatCapacityFreeStopcockApertureModel.ts';
import {
  HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
  stepHeatCapacityReleaseGasState,
} from './heatCapacityReleaseModel.ts';
import {
  applyHeatCapacityMassEnergyFlux,
  calculateHeatCapacityIdealGasAmountMol,
  createHeatCapacityThermodynamicStateAtAmbient,
  createHeatCapacityThermodynamicStateFromTemperature,
  createReducedFlowWorkPumpEnergyFluxV1,
  deriveHeatCapacityThermodynamicState,
  stepHeatCapacityThermodynamicHeatExchange,
  type HeatCapacityThermodynamicState,
  type HeatCapacityThermodynamicSystemConfig,
} from './heatCapacityThermodynamicKernel.ts';

export interface HeatCapacityFreeEnvironmentConfig {
  ambientTemperatureK: number;
  ambientPressureKPa: number;
}

export interface HeatCapacityFreePhysicsConfig {
  environment: HeatCapacityFreeEnvironmentConfig;
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpWorkRetention: number;
  pumpPressureLimitKPa: number;
  stopcockFlowRate: number;
  thermal: HeatCapacityFreeThermalConfig;
  pumpValveExchange?: HeatCapacityFreePumpValveExchangeConfig;
  environmentDisturbance?: HeatCapacityFreeEnvironmentDisturbanceConfig;
  leakage: HeatCapacityFreeLeakageConfig;
}

export interface HeatCapacityFreePumpProcess {
  startedAtS: number;
  strength: number;
  appliedProgress: number;
}

export interface HeatCapacityFreePhysicsState {
  simulationTimeS: number;
  /** Authoritative gas amount. Optional only at the legacy persistence boundary. */
  amountMol?: number;
  /** Authoritative gas internal energy. Optional only at the legacy persistence boundary. */
  internalEnergyJ?: number;
  /** Fixed amount represented by gasAmountRatio = 1. */
  referenceAmountMol?: number;
  /** Compatibility projection; synchronized from amountMol. */
  gasAmountRatio: number;
  /** Compatibility projection; synchronized from internalEnergyJ / (n Cv). */
  gasTemperatureK: number;
  /** Shared kernel wall temperature projection. */
  wallTemperatureK: number;
  pumpProcesses: HeatCapacityFreePumpProcess[];
  pumpStrokeCount: number;
  lastPumpStrokeAtS: number | null;
  lastPumpValveOpenedAtS: number | null;
  lastPumpValveClosedAtS: number | null;
  currentPumpValveOpenDurationS: number;
  environmentDisturbanceSeed: number | string;
  ambientPressureOffsetKPa: number;
  ambientTemperatureOffsetK: number;
  effectiveAmbientPressureKPa: number;
  effectiveAmbientTemperatureK: number;
  maxPressureKPa: number;
  releaseStarted: boolean;
  lastStopcockOpenedAtS: number | null;
  lastStopcockClosedAtS: number | null;
  currentStopcockOpenDurationS: number;
  releaseReference: {
    pressureBeforeKPa: number;
    temperatureBeforeK: number;
    amountBeforeRatio: number;
    openedAtS: number;
    reachedAmbientAtS: number | null;
  } | null;
}

export interface HeatCapacityFreeControls {
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
  stopcockFlowPurpose?: 'zeroing' | 'release';
}

export interface HeatCapacityFreePumpStrokeEvent {
  atS: number;
  strength: number;
}

export type HeatCapacityFreePumpStrokeRejectReason =
  | 'pumpValveClosed'
  | 'stopcockOpen'
  | 'pressureDanger';

export interface HeatCapacityFreePumpStrokeResult {
  accepted: boolean;
  reason: 'accepted' | HeatCapacityFreePumpStrokeRejectReason;
  state: HeatCapacityFreePhysicsState;
}

export const HEAT_CAPACITY_FREE_FALLBACK_PRESSURE_DANGER_RATIO = 1.45;
export const HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA = 300;
const PRESSURE_EPSILON_KPA = 0.000001;
const FREE_OPEN_FLOW_MAX_SUBSTEP_S = 0.02;
const MIN_GAS_AMOUNT_RATIO = 0.000001;
const MIN_GAS_TEMPERATURE_K = 1;
const FREE_POST_RELEASE_LATE_LEAK_START_S = 300;
const FREE_POST_RELEASE_LATE_LEAK_RAMP_S = 180;
const FREE_POST_RELEASE_LATE_LEAK_MAX_MULTIPLIER = 3.5;
export const FREE_PUMP_STROKE_DURATION_S = 0.08;

const FREE_PUMP_STROKE_PROGRESS_POINTS = [
  [0, 0],
  [0.02, 0.18],
  [0.04, 0.68],
  [0.06, 0.92],
  [FREE_PUMP_STROKE_DURATION_S, 1],
] as const;

const clampNonNegativeFinite = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

const clampUnit = (value: number) => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
);

const requireProductionPumpWorkRetention = (value: number) => {
  if (!Number.isFinite(value)) {
    throw new RangeError('pumpWorkRetention must be configured as a finite number.');
  }
  if (value < 0 || value >= 1) {
    throw new RangeError(
      'production pumpWorkRetention must be in [0, 1); 1 is reserved for ideal-upper-bound tests.',
    );
  }
  return value;
};

const resolveFreeReferenceAmountMol = (
  state: Pick<HeatCapacityFreePhysicsState, 'referenceAmountMol'>,
  config: HeatCapacityFreePhysicsConfig,
) => (
  Number.isFinite(state.referenceAmountMol) && (state.referenceAmountMol ?? 0) > 0
    ? state.referenceAmountMol as number
    : calculateHeatCapacityIdealGasAmountMol({
        ambientPressureKPa: config.environment.ambientPressureKPa,
        ambientTemperatureK: config.environment.ambientTemperatureK,
        vesselVolumeL: config.vesselVolumeL,
      })
);

const createFreeThermodynamicSystem = (
  state: Pick<HeatCapacityFreePhysicsState, 'referenceAmountMol'>,
  config: HeatCapacityFreePhysicsConfig,
): HeatCapacityThermodynamicSystemConfig => ({
  gammaTrue: config.gamma,
  vesselVolumeL: config.vesselVolumeL,
  referenceAmountMol: resolveFreeReferenceAmountMol(state, config),
});

const createFreeAmbientEquilibriumSystem = (
  system: HeatCapacityThermodynamicSystemConfig,
  config: HeatCapacityFreePhysicsConfig,
): HeatCapacityThermodynamicSystemConfig => ({
  ...system,
  referenceAmountMol: calculateHeatCapacityIdealGasAmountMol({
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    vesselVolumeL: config.vesselVolumeL,
  }),
});

const materializeFreeThermodynamicState = (
  state: Pick<
    HeatCapacityFreePhysicsState,
    | 'amountMol'
    | 'internalEnergyJ'
    | 'referenceAmountMol'
    | 'gasAmountRatio'
    | 'gasTemperatureK'
    | 'wallTemperatureK'
  >,
  config: HeatCapacityFreePhysicsConfig,
) => {
  const system = createFreeThermodynamicSystem(state, config);
  const amountMol = Number.isFinite(state.amountMol) && (state.amountMol ?? 0) > 0
    ? state.amountMol as number
    : system.referenceAmountMol * Math.max(MIN_GAS_AMOUNT_RATIO, state.gasAmountRatio);
  const gasTemperatureK = Math.max(MIN_GAS_TEMPERATURE_K, state.gasTemperatureK);
  const wallTemperatureK = Math.max(MIN_GAS_TEMPERATURE_K, state.wallTemperatureK);
  const migrated = createHeatCapacityThermodynamicStateFromTemperature({
    amountMol,
    gasTemperatureK,
    wallTemperatureK,
    gammaTrue: config.gamma,
  });
  const thermodynamicState: HeatCapacityThermodynamicState = {
    ...migrated,
    internalEnergyJ: Number.isFinite(state.internalEnergyJ) && (state.internalEnergyJ ?? 0) > 0
      ? state.internalEnergyJ as number
      : migrated.internalEnergyJ,
  };
  return {
    system,
    state: thermodynamicState,
  };
};

export const synchronizeFreePhysicsThermodynamicState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  thermodynamicState?: HeatCapacityThermodynamicState,
): HeatCapacityFreePhysicsState => {
  const materialized = materializeFreeThermodynamicState(state, config);
  const authoritativeState = thermodynamicState ?? materialized.state;
  const derived = deriveHeatCapacityThermodynamicState(
    authoritativeState,
    materialized.system,
  );
  return {
    ...state,
    amountMol: authoritativeState.amountMol,
    internalEnergyJ: authoritativeState.internalEnergyJ,
    referenceAmountMol: materialized.system.referenceAmountMol,
    gasAmountRatio: derived.gasAmountRatio,
    gasTemperatureK: derived.gasTemperatureK,
    wallTemperatureK: authoritativeState.wallTemperatureK,
  };
};

const isStopcockCurrentlyOpen = (state: HeatCapacityFreePhysicsState) => (
  state.lastStopcockOpenedAtS !== null &&
  (
    state.lastStopcockClosedAtS === null ||
    state.lastStopcockOpenedAtS >= state.lastStopcockClosedAtS
  )
);

const isPumpValveCurrentlyOpen = (state: HeatCapacityFreePhysicsState) => (
  state.lastPumpValveOpenedAtS !== null &&
  (
    state.lastPumpValveClosedAtS === null ||
    state.lastPumpValveOpenedAtS >= state.lastPumpValveClosedAtS
  )
);

export const getFreePumpStrokeProgress = (elapsedS: number) => {
  const elapsed = clampNonNegativeFinite(elapsedS);
  if (elapsed >= FREE_PUMP_STROKE_DURATION_S - 1e-9) return 1;
  for (let index = 1; index < FREE_PUMP_STROKE_PROGRESS_POINTS.length; index += 1) {
    const [rightTime, rightProgress] = FREE_PUMP_STROKE_PROGRESS_POINTS[index];
    if (elapsed <= rightTime) {
      const [leftTime, leftProgress] = FREE_PUMP_STROKE_PROGRESS_POINTS[index - 1];
      const span = Math.max(0.000001, rightTime - leftTime);
      const localProgress = clampUnit((elapsed - leftTime) / span);
      return leftProgress + (rightProgress - leftProgress) * localProgress;
    }
  }
  return 1;
};

export const deriveFreePhysicalState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
) => {
  const materialized = materializeFreeThermodynamicState(state, config);
  const thermodynamic = deriveHeatCapacityThermodynamicState(
    materialized.state,
    materialized.system,
  );
  const ambientPressureKPa = Number.isFinite(state.effectiveAmbientPressureKPa)
    ? state.effectiveAmbientPressureKPa
    : config.environment.ambientPressureKPa;
  return {
    gasPressureKPa: thermodynamic.gasPressureKPa,
    pressureDeltaKPa: thermodynamic.gasPressureKPa - ambientPressureKPa,
  };
};

export const createDefaultFreePhysicsState = (
  config: HeatCapacityFreePhysicsConfig,
  environmentDisturbanceSeed: number | string = 'free-physics',
): HeatCapacityFreePhysicsState => {
  const thermodynamic = createHeatCapacityThermodynamicStateAtAmbient({
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    vesselVolumeL: config.vesselVolumeL,
    gammaTrue: config.gamma,
  });
  return {
    simulationTimeS: 0,
    amountMol: thermodynamic.state.amountMol,
    internalEnergyJ: thermodynamic.state.internalEnergyJ,
    referenceAmountMol: thermodynamic.system.referenceAmountMol,
    gasAmountRatio: 1,
    gasTemperatureK: config.environment.ambientTemperatureK,
    wallTemperatureK: config.environment.ambientTemperatureK,
    pumpProcesses: [],
    pumpStrokeCount: 0,
    lastPumpStrokeAtS: null,
    lastPumpValveOpenedAtS: null,
    lastPumpValveClosedAtS: null,
    currentPumpValveOpenDurationS: 0,
    environmentDisturbanceSeed,
    ambientPressureOffsetKPa: 0,
    ambientTemperatureOffsetK: 0,
    effectiveAmbientPressureKPa: config.environment.ambientPressureKPa,
    effectiveAmbientTemperatureK: config.environment.ambientTemperatureK,
    maxPressureKPa: config.environment.ambientPressureKPa,
    releaseStarted: false,
    lastStopcockOpenedAtS: null,
    lastStopcockClosedAtS: null,
    currentStopcockOpenDurationS: 0,
    releaseReference: null,
  };
};

const getPumpProcesses = (
  state: HeatCapacityFreePhysicsState,
) => state.pumpProcesses ?? [];

const applyPumpInflow = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  amountDeltaRatio: number,
): HeatCapacityFreePhysicsState => {
  const synchronizedState = synchronizeFreePhysicsThermodynamicState(state, config);
  const safeAmountDeltaRatio = clampNonNegativeFinite(amountDeltaRatio);
  if (safeAmountDeltaRatio === 0) {
    return synchronizedState;
  }
  const materialized = materializeFreeThermodynamicState(synchronizedState, config);
  const retention = requireProductionPumpWorkRetention(config.pumpWorkRetention);
  const pumpEnergy = createReducedFlowWorkPumpEnergyFluxV1({
    amountDeltaMol: materialized.system.referenceAmountMol * safeAmountDeltaRatio,
    ambientTemperatureK: Math.max(
      MIN_GAS_TEMPERATURE_K,
      config.environment.ambientTemperatureK,
    ),
    gammaTrue: config.gamma,
    pumpWorkRetention: retention,
    usage: 'production',
  });
  const nextThermodynamicState = applyHeatCapacityMassEnergyFlux(
    materialized.state,
    pumpEnergy.flux,
  );
  return synchronizeFreePhysicsThermodynamicState(
    synchronizedState,
    config,
    nextThermodynamicState,
  );
};

const projectStateAfterPendingAndNewPump = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  newStrength = 0,
) => {
  let projectedState = synchronizeFreePhysicsThermodynamicState(state, config);
  for (const process of getPumpProcesses(state)) {
    const remainingProgress = 1 - clampUnit(process.appliedProgress);
    const strength = clampNonNegativeFinite(process.strength);
    projectedState = applyPumpInflow(
      projectedState,
      config,
      config.pumpAmountGainRatio * strength * remainingProgress,
    );
  }
  const safeNewStrength = clampNonNegativeFinite(newStrength);
  return applyPumpInflow(
    projectedState,
    config,
    config.pumpAmountGainRatio * safeNewStrength,
  );
};

const stepPumpProcesses = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  atS: number,
): HeatCapacityFreePhysicsState => {
  const processes = getPumpProcesses(state);
  if (processes.length === 0) {
    return {
      ...state,
      pumpProcesses: [],
    };
  }

  let pumpedState = synchronizeFreePhysicsThermodynamicState(state, config);
  const nextProcesses: HeatCapacityFreePumpProcess[] = [];

  for (const process of processes) {
    const strength = clampNonNegativeFinite(process.strength);
    const previousProgress = clampUnit(process.appliedProgress);
    const nextProgress = getFreePumpStrokeProgress(atS - process.startedAtS);
    const progressDelta = Math.max(0, nextProgress - previousProgress);
    if (progressDelta > 0 && strength > 0) {
      pumpedState = applyPumpInflow(
        pumpedState,
        config,
        config.pumpAmountGainRatio * strength * progressDelta,
      );
    }
    if (nextProgress < 1) {
      nextProcesses.push({
        ...process,
        appliedProgress: nextProgress,
      });
    }
  }

  pumpedState = {
    ...pumpedState,
    pumpProcesses: nextProcesses,
  };
  const pressureKPa = deriveFreePhysicalState(pumpedState, config).gasPressureKPa;
  return {
    ...pumpedState,
    maxPressureKPa: Math.max(state.maxPressureKPa, pressureKPa),
  };
};

const createPumpReject = (
  reason: HeatCapacityFreePumpStrokeRejectReason,
  state: HeatCapacityFreePhysicsState,
): HeatCapacityFreePumpStrokeResult => ({
  accepted: false,
  reason,
  state,
});

export const getFreePumpPressureLimitKPa = (
  config: HeatCapacityFreePhysicsConfig,
) => {
  const ambientPressureKPa = clampNonNegativeFinite(config.environment.ambientPressureKPa);
  const fallbackLimitKPa = ambientPressureKPa * HEAT_CAPACITY_FREE_FALLBACK_PRESSURE_DANGER_RATIO;
  const configuredLimitKPa = Number.isFinite(config.pumpPressureLimitKPa)
    ? config.pumpPressureLimitKPa
    : fallbackLimitKPa;
  return Math.min(
    HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
    Math.max(ambientPressureKPa, configuredLimitKPa),
  );
};

export const applyFreePumpStroke = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  controls: HeatCapacityFreeControls,
  event: HeatCapacityFreePumpStrokeEvent,
): HeatCapacityFreePumpStrokeResult => {
  const synchronizedState = synchronizeFreePhysicsThermodynamicState(state, config);
  if (!controls.pumpValveOpen) {
    return createPumpReject('pumpValveClosed', synchronizedState);
  }
  if (controls.stopcockOpen) {
    return createPumpReject('stopcockOpen', synchronizedState);
  }

  const currentPressureKPa = deriveFreePhysicalState(synchronizedState, config).gasPressureKPa;
  const pressureLimitKPa = getFreePumpPressureLimitKPa(config);
  if (currentPressureKPa >= pressureLimitKPa) {
    return createPumpReject('pressureDanger', synchronizedState);
  }

  const strength = clampNonNegativeFinite(event.strength);
  const candidateState = projectStateAfterPendingAndNewPump(synchronizedState, config, strength);
  const nextPressureKPa = deriveFreePhysicalState(candidateState, config).gasPressureKPa;
  if (nextPressureKPa >= HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA) {
    return createPumpReject('pressureDanger', synchronizedState);
  }

  return {
    accepted: true,
    reason: 'accepted',
    state: {
      ...synchronizedState,
      simulationTimeS: event.atS,
      pumpStrokeCount: synchronizedState.pumpStrokeCount + 1,
      lastPumpStrokeAtS: event.atS,
      pumpProcesses: [
        ...getPumpProcesses(synchronizedState),
        {
          startedAtS: event.atS,
          strength,
          appliedProgress: 0,
        },
      ],
    },
  };
};

const createReleaseReference = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  atS: number,
) => {
  const derived = deriveFreePhysicalState(state, config);
  if (derived.gasPressureKPa <= config.environment.ambientPressureKPa + PRESSURE_EPSILON_KPA) {
    return null;
  }

  return {
    pressureBeforeKPa: derived.gasPressureKPa,
    temperatureBeforeK: state.gasTemperatureK,
    amountBeforeRatio: state.gasAmountRatio,
    openedAtS: atS,
    reachedAmbientAtS: null,
  };
};

const stepThermalState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  dtS: number,
) => {
  const synchronizedState = synchronizeFreePhysicsThermodynamicState(state, config);
  const materialized = materializeFreeThermodynamicState(synchronizedState, config);
  let thermodynamicState = materialized.state;
  let remainingS = clampNonNegativeFinite(dtS);
  let heatGasToWallJ = 0;
  let heatWallToAmbientJ = 0;
  while (remainingS > 0) {
    const stepS = Math.min(remainingS, FREE_OPEN_FLOW_MAX_SUBSTEP_S);
    const derived = deriveHeatCapacityThermodynamicState(
      thermodynamicState,
      materialized.system,
    );
    const gasWallConductanceWPerK = deriveEffectiveFreeGasWallConductanceWPerK(
      config.thermal.gasWallConductanceWPerK,
      Math.abs(derived.gasTemperatureK - thermodynamicState.wallTemperatureK),
    );
    const exchange = stepHeatCapacityThermodynamicHeatExchange(
      thermodynamicState,
      materialized.system,
      {
        ambientTemperatureK: config.environment.ambientTemperatureK,
        gasWallConductanceWPerK,
        wallAmbientConductanceWPerK: config.thermal.wallAmbientConductanceWPerK,
        wallHeatCapacityJPerK: config.thermal.wallHeatCapacityJPerK,
        maxSubstepS: stepS,
      },
      stepS,
    );
    thermodynamicState = exchange.state;
    heatGasToWallJ += exchange.ledger.heatGasToWallJ;
    heatWallToAmbientJ += exchange.ledger.heatWallToAmbientJ;
    remainingS -= stepS;
  }
  const derived = deriveHeatCapacityThermodynamicState(
    thermodynamicState,
    materialized.system,
  );
  return {
    state: synchronizeFreePhysicsThermodynamicState(
      synchronizedState,
      config,
      thermodynamicState,
    ),
    gasHeatCapacityJPerK: derived.gasHeatCapacityJPerK,
    heatGasToWallJ,
    heatWallToAmbientJ,
  };
};

const getOpenStopcockFlowRatePerS = (
  config: HeatCapacityFreePhysicsConfig,
) => {
  const baseRate = clampNonNegativeFinite(config.stopcockFlowRate);
  if (baseRate === 0) return 0;
  return baseRate;
};

const stepOpenFlowAmountAndTemperature = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  dtS: number,
) => {
  const flowCoefficient = getOpenStopcockFlowRatePerS(config);
  if (flowCoefficient === 0 || dtS <= 0) {
    return synchronizeFreePhysicsThermodynamicState(state, config);
  }
  const synchronizedState = synchronizeFreePhysicsThermodynamicState(state, config);
  const materialized = materializeFreeThermodynamicState(synchronizedState, config);
  const flowSystem = createFreeAmbientEquilibriumSystem(materialized.system, config);
  const derived = deriveHeatCapacityThermodynamicState(
    materialized.state,
    flowSystem,
  );
  const next = stepHeatCapacityReleaseGasState({
    gasAmountRatio: derived.gasAmountRatio,
    gasTemperatureK: derived.gasTemperatureK,
  }, {
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    gamma: config.gamma,
    coefficient: flowCoefficient,
  }, dtS);
  const nextThermodynamicState = createHeatCapacityThermodynamicStateFromTemperature({
    amountMol: flowSystem.referenceAmountMol * next.gasAmountRatio,
    gasTemperatureK: next.gasTemperatureK,
    wallTemperatureK: materialized.state.wallTemperatureK,
    gammaTrue: config.gamma,
  });
  return synchronizeFreePhysicsThermodynamicState(
    synchronizedState,
    config,
    nextThermodynamicState,
  );
};

const stepSealedLeakageState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  dtS: number,
) => {
  const closedElapsedBeforeS = state.releaseStarted && state.lastStopcockClosedAtS !== null
    ? Math.max(0, state.simulationTimeS - state.lastStopcockClosedAtS)
    : 0;
  const lateLeakRamp = clampUnit(
    (closedElapsedBeforeS - FREE_POST_RELEASE_LATE_LEAK_START_S) /
      FREE_POST_RELEASE_LATE_LEAK_RAMP_S,
  );
  const leakage = lateLeakRamp > 0
    ? {
        ...config.leakage,
        ratePerS: config.leakage.ratePerS * (
          1 + (FREE_POST_RELEASE_LATE_LEAK_MAX_MULTIPLIER - 1) * lateLeakRamp
        ),
      }
    : config.leakage;
  const synchronizedState = synchronizeFreePhysicsThermodynamicState(state, config);
  const materialized = materializeFreeThermodynamicState(synchronizedState, config);
  const flowSystem = createFreeAmbientEquilibriumSystem(materialized.system, config);
  const nextThermodynamicState = stepFreeLeakageThermodynamicState(
    materialized.state,
    flowSystem,
    leakage,
    {
      ambientPressureKPa: config.environment.ambientPressureKPa,
      ambientTemperatureK: config.environment.ambientTemperatureK,
      dtS,
    },
  );
  return synchronizeFreePhysicsThermodynamicState(
    synchronizedState,
    config,
    nextThermodynamicState,
  );
};

const applyEnvironmentDisturbanceState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  atS: number,
) => {
  const sample = sampleFreeEnvironmentDisturbance(
    config.environmentDisturbance ?? DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG,
    {
      ambientPressureKPa: config.environment.ambientPressureKPa,
      ambientTemperatureK: config.environment.ambientTemperatureK,
      timeS: atS,
      seed: state.environmentDisturbanceSeed ?? 'free-physics',
    },
  );
  return {
    ...state,
    ambientPressureOffsetKPa: sample.pressureOffsetKPa,
    ambientTemperatureOffsetK: sample.temperatureOffsetK,
    effectiveAmbientPressureKPa: sample.ambientPressureKPa,
    effectiveAmbientTemperatureK: sample.ambientTemperatureK,
  };
};

const createEffectiveEnvironmentConfig = (
  config: HeatCapacityFreePhysicsConfig,
  state: HeatCapacityFreePhysicsState,
): HeatCapacityFreePhysicsConfig => ({
  ...config,
  environment: {
    ambientPressureKPa: Number.isFinite(state.effectiveAmbientPressureKPa)
      ? state.effectiveAmbientPressureKPa
      : config.environment.ambientPressureKPa,
    ambientTemperatureK: Number.isFinite(state.effectiveAmbientTemperatureK)
      ? state.effectiveAmbientTemperatureK
      : config.environment.ambientTemperatureK,
  },
});

const stepPumpValveExchangeState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  dtS: number,
  valveOpenElapsedBeforeS: number,
) => {
  const synchronizedState = synchronizeFreePhysicsThermodynamicState(state, config);
  const materialized = materializeFreeThermodynamicState(synchronizedState, config);
  const flowSystem = createFreeAmbientEquilibriumSystem(materialized.system, config);
  const result = stepFreePumpValveThermodynamicExchange(
    materialized.state,
    flowSystem,
    config.pumpValveExchange ?? DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG,
    {
      ambientPressureKPa: config.environment.ambientPressureKPa,
      ambientTemperatureK: config.environment.ambientTemperatureK,
      vesselVolumeL: config.vesselVolumeL,
      gamma: config.gamma,
      dtS,
      valveOpenElapsedBeforeS,
    },
  );
  return synchronizeFreePhysicsThermodynamicState(
    synchronizedState,
    config,
    result.state,
  );
};

const applyPumpValveTiming = (
  state: HeatCapacityFreePhysicsState,
  controls: HeatCapacityFreeControls,
  wasPumpValveOpen: boolean,
  pumpValveOpenElapsedBeforeS: number,
  dtS: number,
  atS: number,
): HeatCapacityFreePhysicsState => {
  const newlyOpened = controls.pumpValveOpen && !wasPumpValveOpen;
  const newlyClosed = !controls.pumpValveOpen && wasPumpValveOpen;
  return {
    ...state,
    lastPumpValveOpenedAtS: newlyOpened ? atS : state.lastPumpValveOpenedAtS,
    lastPumpValveClosedAtS: newlyClosed ? atS : state.lastPumpValveClosedAtS,
    currentPumpValveOpenDurationS: controls.pumpValveOpen
      ? pumpValveOpenElapsedBeforeS + clampNonNegativeFinite(dtS)
      : 0,
  };
};

const stepOpenState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  dtS: number,
  atS: number,
  openElapsedBeforeS: number,
) => {
  let nextState = state;
  let remainingS = clampNonNegativeFinite(dtS);
  let openElapsedS = clampNonNegativeFinite(openElapsedBeforeS);
  while (remainingS > 0) {
    const stepS = Math.min(remainingS, FREE_OPEN_FLOW_MAX_SUBSTEP_S);
    const thermal = stepThermalState(
      nextState,
      config,
      stepS,
    );
    const effectiveFlowDtS = getHeatCapacityReleaseApertureEffectiveDtS(openElapsedS, stepS);
    nextState = stepOpenFlowAmountAndTemperature(
      thermal.state,
      config,
      effectiveFlowDtS,
    );
    openElapsedS += stepS;
    remainingS -= stepS;
  }

  const pressureKPa = deriveFreePhysicalState(nextState, config).gasPressureKPa;
  const releaseReference = nextState.releaseReference &&
    nextState.releaseReference.reachedAmbientAtS === null &&
    pressureKPa <= config.environment.ambientPressureKPa + HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA
    ? {
        ...nextState.releaseReference,
        reachedAmbientAtS: atS,
      }
    : nextState.releaseReference;
  return {
    ...nextState,
    releaseReference,
  };
};

export const stepFreePhysics = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  controls: HeatCapacityFreeControls,
  dtS: number,
  atS: number,
): HeatCapacityFreePhysicsState => {
  const synchronizedState = synchronizeFreePhysicsThermodynamicState(state, config);
  const environmentState = applyEnvironmentDisturbanceState(synchronizedState, config, atS);
  const effectiveConfig = createEffectiveEnvironmentConfig(config, environmentState);
  const wasStopcockOpen = isStopcockCurrentlyOpen(environmentState);
  const wasPumpValveOpen = isPumpValveCurrentlyOpen(environmentState);
  const pumpValveOpenElapsedBeforeS = controls.pumpValveOpen
    ? (wasPumpValveOpen ? environmentState.currentPumpValveOpenDurationS : 0)
    : 0;
  const stopcockOpenElapsedBeforeS = controls.stopcockOpen
    ? (wasStopcockOpen ? environmentState.currentStopcockOpenDurationS : 0)
    : 0;
  const pumpedState = stepPumpProcesses(environmentState, effectiveConfig, atS);

  if (!controls.stopcockOpen) {
    const thermal = stepThermalState(pumpedState, effectiveConfig, dtS);
    const leakedState = stepSealedLeakageState(
      thermal.state,
      effectiveConfig,
      dtS,
    );
    const thermalLeakageState: HeatCapacityFreePhysicsState = {
      ...leakedState,
      simulationTimeS: atS,
      lastStopcockClosedAtS: wasStopcockOpen ? atS : environmentState.lastStopcockClosedAtS,
      currentStopcockOpenDurationS: 0,
    };
    const pumpValveExchangedState = controls.pumpValveOpen
      ? stepPumpValveExchangeState(
        thermalLeakageState,
        effectiveConfig,
        dtS,
        pumpValveOpenElapsedBeforeS,
      )
      : thermalLeakageState;
    const closedState = applyPumpValveTiming(
      pumpValveExchangedState,
      controls,
      wasPumpValveOpen,
      pumpValveOpenElapsedBeforeS,
      dtS,
      atS,
    );
    const closedPressureKPa = deriveFreePhysicalState(closedState, effectiveConfig).gasPressureKPa;
    return {
      ...closedState,
      maxPressureKPa: Math.max(environmentState.maxPressureKPa, closedPressureKPa),
    };
  }

  const newlyOpened = !wasStopcockOpen;
  const releaseEligible = controls.stopcockFlowPurpose === 'release';
  const openedBaseState: HeatCapacityFreePhysicsState = {
    ...pumpedState,
    simulationTimeS: atS,
    lastStopcockOpenedAtS: newlyOpened ? atS : synchronizedState.lastStopcockOpenedAtS,
    currentStopcockOpenDurationS: newlyOpened
      ? clampNonNegativeFinite(dtS)
      : synchronizedState.currentStopcockOpenDurationS + clampNonNegativeFinite(dtS),
  };
  const openingReleaseReference = newlyOpened && releaseEligible
    ? createReleaseReference(openedBaseState, effectiveConfig, atS)
    : null;
  const releaseCandidate: HeatCapacityFreePhysicsState = openingReleaseReference
      ? {
        ...openedBaseState,
        releaseStarted: true,
        releaseReference: openedBaseState.releaseReference ?? openingReleaseReference,
      }
    : openedBaseState;
  const flowedState = stepOpenState(
    releaseCandidate,
    effectiveConfig,
    dtS,
    atS,
    stopcockOpenElapsedBeforeS,
  );
  const timedFlowedState = applyPumpValveTiming(
    flowedState,
    controls,
    wasPumpValveOpen,
    pumpValveOpenElapsedBeforeS,
    dtS,
    atS,
  );
  const pressureKPa = deriveFreePhysicalState(timedFlowedState, effectiveConfig).gasPressureKPa;

  return {
    ...timedFlowedState,
    maxPressureKPa: Math.max(environmentState.maxPressureKPa, pressureKPa),
  };
};
