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
  releaseCoolingFactor: number;
  thermal: HeatCapacityFreeThermalConfig;
  leakage: HeatCapacityFreeLeakageConfig;
}

export interface HeatCapacityFreePumpProcess {
  startedAtS: number;
  strength: number;
  appliedProgress: number;
}

export interface HeatCapacityFreeReleaseProcess {
  openedAtS: number;
  responseDelayS: number;
  durationS: number;
  appliedProgress: number;
  pressureBeforeKPa: number;
  temperatureBeforeK: number;
  amountBeforeRatio: number;
  amountTargetRatio: number;
  temperatureTargetK: number;
}

export interface HeatCapacityFreePhysicsState {
  simulationTimeS: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
  pumpProcesses: HeatCapacityFreePumpProcess[];
  releaseProcess: HeatCapacityFreeReleaseProcess | null;
  pumpStrokeCount: number;
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
export const FREE_PUMP_STROKE_DURATION_S = 0.08;
export const FREE_RELEASE_RESPONSE_DELAY_S = 0.02;
export const FREE_RELEASE_MAIN_DURATION_S = 0.18;
export const FREE_RELEASE_TOTAL_DURATION_S =
  FREE_RELEASE_RESPONSE_DELAY_S + FREE_RELEASE_MAIN_DURATION_S;

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

const approach = (
  current: number,
  target: number,
  rate: number,
  dtS: number,
) => {
  const safeRate = clampNonNegativeFinite(rate);
  const safeDtS = clampNonNegativeFinite(dtS);
  if (safeRate === 0 || safeDtS === 0) {
    return current;
  }
  const fraction = 1 - Math.exp(-safeRate * safeDtS);
  return current + (target - current) * fraction;
};

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

export const getFreeReleaseProcessProgress = (elapsedS: number) => {
  const elapsed = clampNonNegativeFinite(elapsedS);
  if (elapsed <= FREE_RELEASE_RESPONSE_DELAY_S) return 0;
  return clampUnit((elapsed - FREE_RELEASE_RESPONSE_DELAY_S) / FREE_RELEASE_MAIN_DURATION_S);
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
  releaseProcess: null,
  pumpStrokeCount: 0,
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

const createOpeningReleaseProcess = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  atS: number,
) => {
  const derived = deriveFreePhysicalState(state, config);
  if (derived.gasPressureKPa <= config.environment.ambientPressureKPa + PRESSURE_EPSILON_KPA) {
    return null;
  }

  const adiabaticTemperatureK = state.gasTemperatureK *
    (config.environment.ambientPressureKPa / derived.gasPressureKPa) **
      ((config.gamma - 1) / config.gamma);
  const cooledTemperatureK = config.environment.ambientTemperatureK +
    (adiabaticTemperatureK - config.environment.ambientTemperatureK) *
      config.releaseCoolingFactor;
  const releasedAmountRatio = config.environment.ambientTemperatureK / cooledTemperatureK;
  return {
    openedAtS: atS,
    responseDelayS: FREE_RELEASE_RESPONSE_DELAY_S,
    durationS: FREE_RELEASE_MAIN_DURATION_S,
    appliedProgress: 0,
    pressureBeforeKPa: derived.gasPressureKPa,
    temperatureBeforeK: state.gasTemperatureK,
    amountBeforeRatio: state.gasAmountRatio,
    amountTargetRatio: releasedAmountRatio,
    temperatureTargetK: cooledTemperatureK,
  };
};

const stepReleaseProcess = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  atS: number,
): HeatCapacityFreePhysicsState => {
  const process = state.releaseProcess;
  if (!process) return state;
  const nextProgress = getFreeReleaseProcessProgress(atS - process.openedAtS);
  const gasAmountRatio = process.amountBeforeRatio +
    (process.amountTargetRatio - process.amountBeforeRatio) * nextProgress;
  const gasTemperatureK = process.temperatureBeforeK +
    (process.temperatureTargetK - process.temperatureBeforeK) * nextProgress;
  const processFinished = nextProgress >= 1;
  const nextState: HeatCapacityFreePhysicsState = {
    ...state,
    gasAmountRatio,
    gasTemperatureK,
    releaseProcess: processFinished
      ? null
      : {
          ...process,
          appliedProgress: nextProgress,
        },
    releaseReference: state.releaseReference
      ? {
          ...state.releaseReference,
          reachedAmbientAtS: processFinished
            ? atS
            : state.releaseReference.reachedAmbientAtS,
        }
      : state.releaseReference,
  };
  const pressureKPa = deriveFreePhysicalState(nextState, config).gasPressureKPa;
  return {
    ...nextState,
    maxPressureKPa: Math.max(state.maxPressureKPa, pressureKPa),
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
) => {
  const thermal = stepThermalState(state, config, dtS);
  const ambientPressureAmountRatio = config.environment.ambientTemperatureK /
    thermal.state.gasTemperatureK;
  const nextAmountRatio = approach(
    state.gasAmountRatio,
    ambientPressureAmountRatio,
    config.stopcockFlowRate,
    dtS,
  );
  return {
    ...state,
    gasAmountRatio: nextAmountRatio,
    gasTemperatureK: thermal.state.gasTemperatureK,
    wallTemperatureK: thermal.state.wallTemperatureK,
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
      releaseProcess: null,
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
  const openingReleaseProcess = newlyOpened
    ? createOpeningReleaseProcess(openedBaseState, config, atS)
    : null;
  const releaseCandidate: HeatCapacityFreePhysicsState = openingReleaseProcess
    ? {
        ...openedBaseState,
        releaseStarted: true,
        releaseProcess: openingReleaseProcess,
        releaseReference: openedBaseState.releaseReference ?? {
          pressureBeforeKPa: openingReleaseProcess.pressureBeforeKPa,
          temperatureBeforeK: openingReleaseProcess.temperatureBeforeK,
          amountBeforeRatio: openingReleaseProcess.amountBeforeRatio,
          openedAtS: openingReleaseProcess.openedAtS,
          reachedAmbientAtS: null,
        },
      }
    : openedBaseState;
  const hadReleaseProcess = releaseCandidate.releaseProcess !== null;
  const releaseAdvancedState = stepReleaseProcess(releaseCandidate, config, atS);
  const flowedState = hadReleaseProcess
    ? releaseAdvancedState
    : stepOpenState(releaseAdvancedState, config, dtS);
  const pressureKPa = deriveFreePhysicalState(flowedState, config).gasPressureKPa;

  return {
    ...flowedState,
    maxPressureKPa: Math.max(state.maxPressureKPa, pressureKPa),
  };
};
