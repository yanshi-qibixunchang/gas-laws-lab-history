import {
  stepFreeThermalState,
  type HeatCapacityFreeThermalConfig,
} from './heatCapacityFreeThermalModel.ts';
import {
  stepFreeLeakageAmountRatio,
  type HeatCapacityFreeLeakageConfig,
} from './heatCapacityFreeLeakageModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_PUMP_VALVE_EXCHANGE_CONFIG,
  stepFreePumpValveExchange,
  type HeatCapacityFreePumpValveExchangeConfig,
} from './heatCapacityFreePumpValveExchangeModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG,
  sampleFreeEnvironmentDisturbance,
  type HeatCapacityFreeEnvironmentDisturbanceConfig,
} from './heatCapacityFreeEnvironmentDisturbanceModel.ts';
import {
  getFreeStopcockApertureEffectiveDtS,
} from './heatCapacityFreeStopcockApertureModel.ts';

export interface HeatCapacityFreeEnvironmentConfig {
  ambientTemperatureK: number;
  ambientPressureKPa: number;
}

export interface HeatCapacityFreePhysicsConfig {
  environment: HeatCapacityFreeEnvironmentConfig;
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpPressureLimitKPa: number;
  pumpInflowTemperatureRiseK: number;
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
  gasAmountRatio: number;
  gasTemperatureK: number;
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
  powerOn: boolean;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
  stopcockFlowPurpose?: 'zeroing' | 'release';
}

export interface HeatCapacityFreePumpStrokeEvent {
  atS: number;
  strength: number;
}

export type HeatCapacityFreePumpStrokeRejectReason =
  | 'powerOff'
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
const PRESSURE_NEAR_AMBIENT_KPA = 0.03;
const FREE_OPEN_FLOW_MAX_SUBSTEP_S = 0.02;
const MIN_GAS_AMOUNT_RATIO = 0.000001;
const MIN_GAS_TEMPERATURE_K = 1;
export const FREE_PUMP_STROKE_DURATION_S = 0.08;
export const FREE_RELEASE_RESPONSE_DELAY_S = 0.02;
export const FREE_RELEASE_MAIN_DURATION_S = 0.18;

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
  const ambientPressureKPa = Number.isFinite(state.effectiveAmbientPressureKPa)
    ? state.effectiveAmbientPressureKPa
    : config.environment.ambientPressureKPa;
  const ambientTemperatureK = Number.isFinite(state.effectiveAmbientTemperatureK)
    ? state.effectiveAmbientTemperatureK
    : config.environment.ambientTemperatureK;
  const gasPressureKPa = ambientPressureKPa *
    state.gasAmountRatio *
    (state.gasTemperatureK / ambientTemperatureK);
  return {
    gasPressureKPa,
    pressureDeltaKPa: gasPressureKPa - ambientPressureKPa,
  };
};

export const createDefaultFreePhysicsState = (
  config: HeatCapacityFreePhysicsConfig,
  environmentDisturbanceSeed: number | string = 'free-physics',
): HeatCapacityFreePhysicsState => ({
  simulationTimeS: 0,
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
});

const getPumpProcesses = (
  state: HeatCapacityFreePhysicsState,
) => state.pumpProcesses ?? [];

const applyPumpInflow = (
  state: Pick<HeatCapacityFreePhysicsState, 'gasAmountRatio' | 'gasTemperatureK'>,
  config: HeatCapacityFreePhysicsConfig,
  amountDeltaRatio: number,
) => {
  const safeAmountDeltaRatio = clampNonNegativeFinite(amountDeltaRatio);
  if (safeAmountDeltaRatio === 0) {
    return state;
  }
  const gasAmountRatio = Math.max(MIN_GAS_AMOUNT_RATIO, state.gasAmountRatio);
  const gasTemperatureK = Math.max(MIN_GAS_TEMPERATURE_K, state.gasTemperatureK);
  const inflowTemperatureK = Math.max(
    MIN_GAS_TEMPERATURE_K,
    config.environment.ambientTemperatureK + config.pumpInflowTemperatureRiseK,
  );
  const nextAmountRatio = gasAmountRatio + safeAmountDeltaRatio;
  return {
    gasAmountRatio: nextAmountRatio,
    gasTemperatureK: (
      gasAmountRatio * gasTemperatureK +
      safeAmountDeltaRatio * inflowTemperatureK
    ) / nextAmountRatio,
  };
};

const projectStateAfterPendingAndNewPump = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  newStrength = 0,
) => {
  let gasAmountRatio = state.gasAmountRatio;
  let gasTemperatureK = state.gasTemperatureK;
  for (const process of getPumpProcesses(state)) {
    const remainingProgress = 1 - clampUnit(process.appliedProgress);
    const strength = clampNonNegativeFinite(process.strength);
    const pumped = applyPumpInflow(
      { gasAmountRatio, gasTemperatureK },
      config,
      config.pumpAmountGainRatio * strength * remainingProgress,
    );
    gasAmountRatio = pumped.gasAmountRatio;
    gasTemperatureK = pumped.gasTemperatureK;
  }
  const safeNewStrength = clampNonNegativeFinite(newStrength);
  const pumped = applyPumpInflow(
    { gasAmountRatio, gasTemperatureK },
    config,
    config.pumpAmountGainRatio * safeNewStrength,
  );
  return {
    ...state,
    gasAmountRatio: pumped.gasAmountRatio,
    gasTemperatureK: pumped.gasTemperatureK,
  };
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

  let gasAmountRatio = state.gasAmountRatio;
  let gasTemperatureK = state.gasTemperatureK;
  const nextProcesses: HeatCapacityFreePumpProcess[] = [];

  for (const process of processes) {
    const strength = clampNonNegativeFinite(process.strength);
    const previousProgress = clampUnit(process.appliedProgress);
    const nextProgress = getFreePumpStrokeProgress(atS - process.startedAtS);
    const progressDelta = Math.max(0, nextProgress - previousProgress);
    if (progressDelta > 0 && strength > 0) {
      const pumped = applyPumpInflow(
        { gasAmountRatio, gasTemperatureK },
        config,
        config.pumpAmountGainRatio * strength * progressDelta,
      );
      gasAmountRatio = pumped.gasAmountRatio;
      gasTemperatureK = pumped.gasTemperatureK;
    }
    if (nextProgress < 1) {
      nextProcesses.push({
        ...process,
        appliedProgress: nextProgress,
      });
    }
  }

  const pumpedState: HeatCapacityFreePhysicsState = {
    ...state,
    gasAmountRatio,
    gasTemperatureK,
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
  if (!controls.powerOn) {
    return createPumpReject('powerOff', state);
  }
  if (!controls.pumpValveOpen) {
    return createPumpReject('pumpValveClosed', state);
  }
  if (controls.stopcockOpen) {
    return createPumpReject('stopcockOpen', state);
  }

  const currentPressureKPa = deriveFreePhysicalState(state, config).gasPressureKPa;
  const pressureLimitKPa = getFreePumpPressureLimitKPa(config);
  if (currentPressureKPa >= pressureLimitKPa) {
    return createPumpReject('pressureDanger', state);
  }

  const strength = clampNonNegativeFinite(event.strength);
  const candidateState = projectStateAfterPendingAndNewPump(state, config, strength);
  const nextPressureKPa = deriveFreePhysicalState(candidateState, config).gasPressureKPa;
  if (nextPressureKPa >= HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA) {
    return createPumpReject('pressureDanger', state);
  }

  return {
    accepted: true,
    reason: 'accepted',
    state: {
      ...state,
      simulationTimeS: event.atS,
      pumpStrokeCount: state.pumpStrokeCount + 1,
      lastPumpStrokeAtS: event.atS,
      pumpProcesses: [
        ...getPumpProcesses(state),
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
) => stepFreeThermalState(
  {
    gasTemperatureK: state.gasTemperatureK,
    wallTemperatureK: state.wallTemperatureK,
  },
  config.thermal,
  {
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    vesselVolumeL: config.vesselVolumeL,
    gamma: config.gamma,
    gasAmountRatio: state.gasAmountRatio,
    dtS,
  },
);

const getOpenStopcockFlowRatePerS = (
  config: HeatCapacityFreePhysicsConfig,
) => {
  const baseRate = clampNonNegativeFinite(config.stopcockFlowRate);
  if (baseRate === 0) return 0;
  return baseRate;
};

const calculateOpenStopcockFlowAmountRatio = (input: {
  gasPressureKPa: number;
  ambientPressureKPa: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
  gamma: number;
  coefficient: number;
  dtS: number;
}) => {
  const coefficient = clampNonNegativeFinite(input.coefficient);
  const dtS = clampNonNegativeFinite(input.dtS);
  if (coefficient === 0 || dtS === 0) {
    return 0;
  }

  const ambientPressureKPa = Math.max(PRESSURE_EPSILON_KPA, input.ambientPressureKPa);
  const gasPressureKPa = Math.max(PRESSURE_EPSILON_KPA, input.gasPressureKPa);
  const pressureDeltaKPa = gasPressureKPa - ambientPressureKPa;
  if (Math.abs(pressureDeltaKPa) <= PRESSURE_NEAR_AMBIENT_KPA) {
    return 0;
  }

  const gamma = Math.max(1.001, input.gamma);
  const ambientTemperatureK = Math.max(MIN_GAS_TEMPERATURE_K, input.ambientTemperatureK);
  const gasTemperatureK = Math.max(MIN_GAS_TEMPERATURE_K, input.gasTemperatureK);
  const outflow = pressureDeltaKPa > 0;
  const upstreamPressureKPa = outflow ? gasPressureKPa : ambientPressureKPa;
  const downstreamPressureKPa = outflow ? ambientPressureKPa : gasPressureKPa;
  const upstreamTemperatureK = outflow ? gasTemperatureK : ambientTemperatureK;
  const pressureRatio = Math.min(
    1,
    Math.max(PRESSURE_EPSILON_KPA, downstreamPressureKPa / upstreamPressureKPa),
  );
  const criticalPressureRatio = Math.pow(
    2 / (gamma + 1),
    gamma / (gamma - 1),
  );
  const effectivePressureRatio = Math.max(pressureRatio, criticalPressureRatio);
  const flowDrive = Math.sqrt(Math.max(
    0,
    (2 * gamma / (gamma - 1)) *
      (
        Math.pow(effectivePressureRatio, 2 / gamma) -
        Math.pow(effectivePressureRatio, (gamma + 1) / gamma)
      ),
  ));
  const pressureScale = upstreamPressureKPa / ambientPressureKPa;
  const temperatureScale = Math.sqrt(ambientTemperatureK / upstreamTemperatureK);
  const amountRatio = coefficient * pressureScale * temperatureScale * flowDrive * dtS;
  return outflow ? -amountRatio : amountRatio;
};

const stepOpenFlowAmountAndTemperature = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  dtS: number,
) => {
  const flowCoefficient = getOpenStopcockFlowRatePerS(config);
  if (flowCoefficient === 0 || dtS <= 0) {
    return state;
  }

  const ambientTemperatureK = Math.max(
    MIN_GAS_TEMPERATURE_K,
    config.environment.ambientTemperatureK,
  );
  const gasTemperatureK = Math.max(MIN_GAS_TEMPERATURE_K, state.gasTemperatureK);
  const gasAmountRatio = Math.max(MIN_GAS_AMOUNT_RATIO, state.gasAmountRatio);
  const gamma = Math.max(1.001, config.gamma);
  const gasPressureKPa = config.environment.ambientPressureKPa *
    gasAmountRatio *
    (gasTemperatureK / ambientTemperatureK);
  const pressureRatio = gasAmountRatio * gasTemperatureK / ambientTemperatureK;
  const cv = 1 / (gamma - 1);
  const cp = gamma * cv;
  const signedFlowAmountRatio = calculateOpenStopcockFlowAmountRatio({
    gasPressureKPa,
    ambientPressureKPa: config.environment.ambientPressureKPa,
    gasTemperatureK,
    ambientTemperatureK,
    gamma,
    coefficient: flowCoefficient,
    dtS,
  });

  if (pressureRatio > 1 + PRESSURE_EPSILON_KPA) {
    const outflowToAmbientRatio = Math.max(
      0,
      (gasAmountRatio - ambientTemperatureK / gasTemperatureK) / gamma,
    );
    const outflowAmountRatio = Math.min(
      gasAmountRatio - MIN_GAS_AMOUNT_RATIO,
      outflowToAmbientRatio,
      Math.max(0, -signedFlowAmountRatio),
    );
    if (outflowAmountRatio <= 0) {
      return state;
    }
    const nextAmountRatio = Math.max(
      MIN_GAS_AMOUNT_RATIO,
      gasAmountRatio - outflowAmountRatio,
    );
    const nextEnergy = gasAmountRatio * cv * gasTemperatureK -
      outflowAmountRatio * cp * gasTemperatureK;
    const nextTemperatureK = Math.max(
      MIN_GAS_TEMPERATURE_K,
      nextEnergy / (nextAmountRatio * cv),
    );
    return {
      ...state,
      gasAmountRatio: Number.isFinite(nextAmountRatio)
        ? nextAmountRatio
        : state.gasAmountRatio,
      gasTemperatureK: Number.isFinite(nextTemperatureK)
        ? nextTemperatureK
        : state.gasTemperatureK,
    };
  }

  if (pressureRatio < 1 - PRESSURE_EPSILON_KPA) {
    const inflowToAmbientRatio = Math.max(0, (1 - pressureRatio) / gamma);
    const inflowAmountRatio = Math.min(
      inflowToAmbientRatio,
      Math.max(0, signedFlowAmountRatio),
    );
    if (inflowAmountRatio <= 0) {
      return state;
    }
    const nextAmountRatio = gasAmountRatio + inflowAmountRatio;
    const nextEnergy = gasAmountRatio * cv * gasTemperatureK +
      inflowAmountRatio * cp * ambientTemperatureK;
    const nextTemperatureK = Math.max(
      MIN_GAS_TEMPERATURE_K,
      nextEnergy / (nextAmountRatio * cv),
    );
    return {
      ...state,
      gasAmountRatio: Number.isFinite(nextAmountRatio)
        ? nextAmountRatio
        : state.gasAmountRatio,
      gasTemperatureK: Number.isFinite(nextTemperatureK)
        ? nextTemperatureK
        : state.gasTemperatureK,
    };
  }

  return state;
};

const stepSealedLeakageAmountRatio = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  gasTemperatureK: number,
  dtS: number,
) => stepFreeLeakageAmountRatio(
  state.gasAmountRatio,
  config.leakage,
  {
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    gasAmountRatio: state.gasAmountRatio,
    gasTemperatureK,
    dtS,
  },
);

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
  const result = stepFreePumpValveExchange(
    {
      gasAmountRatio: state.gasAmountRatio,
      gasTemperatureK: state.gasTemperatureK,
    },
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
  return {
    ...state,
    gasAmountRatio: result.state.gasAmountRatio,
    gasTemperatureK: result.state.gasTemperatureK,
  };
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
    const thermal = stepThermalState(nextState, config, stepS);
    const thermalState = {
      ...nextState,
      gasTemperatureK: thermal.state.gasTemperatureK,
      wallTemperatureK: thermal.state.wallTemperatureK,
    };
    const effectiveFlowDtS = getFreeStopcockApertureEffectiveDtS(openElapsedS, stepS);
    nextState = stepOpenFlowAmountAndTemperature(
      thermalState,
      config,
      effectiveFlowDtS,
    );
    openElapsedS += stepS;
    remainingS -= stepS;
  }

  const pressureKPa = deriveFreePhysicalState(nextState, config).gasPressureKPa;
  const releaseReference = nextState.releaseReference &&
    nextState.releaseReference.reachedAmbientAtS === null &&
    pressureKPa <= config.environment.ambientPressureKPa + PRESSURE_NEAR_AMBIENT_KPA
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
  const environmentState = applyEnvironmentDisturbanceState(state, config, atS);
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
    const gasAmountRatio = stepSealedLeakageAmountRatio(
      pumpedState,
      effectiveConfig,
      thermal.state.gasTemperatureK,
      dtS,
    );
    const thermalLeakageState: HeatCapacityFreePhysicsState = {
      ...pumpedState,
      simulationTimeS: atS,
      gasAmountRatio,
      gasTemperatureK: thermal.state.gasTemperatureK,
      wallTemperatureK: thermal.state.wallTemperatureK,
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
    lastStopcockOpenedAtS: newlyOpened ? atS : state.lastStopcockOpenedAtS,
    currentStopcockOpenDurationS: newlyOpened
      ? clampNonNegativeFinite(dtS)
      : state.currentStopcockOpenDurationS + clampNonNegativeFinite(dtS),
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
