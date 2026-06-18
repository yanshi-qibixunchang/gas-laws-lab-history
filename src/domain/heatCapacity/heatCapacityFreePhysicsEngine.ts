import {
  stepFreeThermalState,
  type HeatCapacityFreeThermalConfig,
} from './heatCapacityFreeThermalModel.ts';
import {
  stepFreeLeakageAmountRatio,
  type HeatCapacityFreeLeakageConfig,
} from './heatCapacityFreeLeakageModel.ts';

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
  pumpTemperatureGainK: number;
  stopcockFlowRate: number;
  thermal: HeatCapacityFreeThermalConfig;
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
  const gasPressureKPa = config.environment.ambientPressureKPa *
    state.gasAmountRatio *
    (state.gasTemperatureK / config.environment.ambientTemperatureK);
  return {
    gasPressureKPa,
    pressureDeltaKPa: gasPressureKPa - config.environment.ambientPressureKPa,
  };
};

export const createDefaultFreePhysicsState = (
  config: HeatCapacityFreePhysicsConfig,
): HeatCapacityFreePhysicsState => ({
  simulationTimeS: 0,
  gasAmountRatio: 1,
  gasTemperatureK: config.environment.ambientTemperatureK,
  wallTemperatureK: config.environment.ambientTemperatureK,
  pumpProcesses: [],
  pumpStrokeCount: 0,
  lastPumpStrokeAtS: null,
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
    gasAmountRatio += config.pumpAmountGainRatio * strength * remainingProgress;
    gasTemperatureK += config.pumpTemperatureGainK * strength * remainingProgress;
  }
  const safeNewStrength = clampNonNegativeFinite(newStrength);
  gasAmountRatio += config.pumpAmountGainRatio * safeNewStrength;
  gasTemperatureK += config.pumpTemperatureGainK * safeNewStrength;
  return {
    ...state,
    gasAmountRatio,
    gasTemperatureK,
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
      gasAmountRatio += config.pumpAmountGainRatio * strength * progressDelta;
      gasTemperatureK += config.pumpTemperatureGainK * strength * progressDelta;
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
  if (nextPressureKPa >= pressureLimitKPa) {
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

const stepOpenState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  dtS: number,
  atS: number,
) => {
  let nextState = state;
  let remainingS = clampNonNegativeFinite(dtS);
  while (remainingS > 0) {
    const stepS = Math.min(remainingS, FREE_OPEN_FLOW_MAX_SUBSTEP_S);
    const thermal = stepThermalState(nextState, config, stepS);
    nextState = stepOpenFlowAmountAndTemperature(
      {
        ...nextState,
        gasTemperatureK: thermal.state.gasTemperatureK,
        wallTemperatureK: thermal.state.wallTemperatureK,
      },
      config,
      stepS,
    );
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
  const wasStopcockOpen = isStopcockCurrentlyOpen(state);
  const pumpedState = stepPumpProcesses(state, config, atS);

  if (!controls.stopcockOpen) {
    const thermal = stepThermalState(pumpedState, config, dtS);
    const gasAmountRatio = stepSealedLeakageAmountRatio(
      pumpedState,
      config,
      thermal.state.gasTemperatureK,
      dtS,
    );
    const closedState: HeatCapacityFreePhysicsState = {
      ...pumpedState,
      simulationTimeS: atS,
      gasAmountRatio,
      gasTemperatureK: thermal.state.gasTemperatureK,
      wallTemperatureK: thermal.state.wallTemperatureK,
      lastStopcockClosedAtS: wasStopcockOpen ? atS : state.lastStopcockClosedAtS,
      currentStopcockOpenDurationS: 0,
    };
    const closedPressureKPa = deriveFreePhysicalState(closedState, config).gasPressureKPa;
    return {
      ...closedState,
      maxPressureKPa: Math.max(state.maxPressureKPa, closedPressureKPa),
    };
  }

  const newlyOpened = !wasStopcockOpen;
  const openedBaseState: HeatCapacityFreePhysicsState = {
    ...pumpedState,
    simulationTimeS: atS,
    lastStopcockOpenedAtS: newlyOpened ? atS : state.lastStopcockOpenedAtS,
    currentStopcockOpenDurationS: newlyOpened
      ? clampNonNegativeFinite(dtS)
      : state.currentStopcockOpenDurationS + clampNonNegativeFinite(dtS),
  };
  const openingReleaseReference = newlyOpened
    ? createReleaseReference(openedBaseState, config, atS)
    : null;
  const releaseCandidate: HeatCapacityFreePhysicsState = openingReleaseReference
      ? {
        ...openedBaseState,
        releaseStarted: true,
        releaseReference: openedBaseState.releaseReference ?? openingReleaseReference,
      }
    : openedBaseState;
  const flowedState = stepOpenState(releaseCandidate, config, dtS, atS);
  const pressureKPa = deriveFreePhysicalState(flowedState, config).gasPressureKPa;

  return {
    ...flowedState,
    maxPressureKPa: Math.max(state.maxPressureKPa, pressureKPa),
  };
};
