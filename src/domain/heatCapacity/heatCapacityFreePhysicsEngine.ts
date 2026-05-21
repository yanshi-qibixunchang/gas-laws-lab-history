import {
  stepFreeThermalState,
  type HeatCapacityFreeThermalConfig,
} from './heatCapacityFreeThermalModel.ts';

export interface HeatCapacityFreeEnvironmentConfig {
  ambientTemperatureK: number;
  ambientPressureKPa: number;
}

export interface HeatCapacityFreePhysicsConfig {
  environment: HeatCapacityFreeEnvironmentConfig;
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpTemperatureGainK: number;
  stopcockFlowRate: number;
  releaseCoolingFactor: number;
  thermal: HeatCapacityFreeThermalConfig;
}

export interface HeatCapacityFreePhysicsState {
  simulationTimeS: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
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

const PRESSURE_DANGER_RATIO = 1.45;
const PRESSURE_EPSILON_KPA = 0.000001;

const clampNonNegativeFinite = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
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
  pumpStrokeCount: 0,
  maxPressureKPa: config.environment.ambientPressureKPa,
  releaseStarted: false,
  lastStopcockOpenedAtS: null,
  lastStopcockClosedAtS: null,
  currentStopcockOpenDurationS: 0,
  releaseReference: null,
});

const createPumpReject = (
  reason: HeatCapacityFreePumpStrokeRejectReason,
  state: HeatCapacityFreePhysicsState,
): HeatCapacityFreePumpStrokeResult => ({
  accepted: false,
  reason,
  state,
});

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
  const dangerPressureKPa = config.environment.ambientPressureKPa * PRESSURE_DANGER_RATIO;
  if (currentPressureKPa >= dangerPressureKPa) {
    return createPumpReject('pressureDanger', state);
  }

  const strength = clampNonNegativeFinite(event.strength);
  const candidateState: HeatCapacityFreePhysicsState = {
    ...state,
    simulationTimeS: event.atS,
    gasAmountRatio: state.gasAmountRatio + config.pumpAmountGainRatio * strength,
    gasTemperatureK: state.gasTemperatureK + config.pumpTemperatureGainK * strength,
    wallTemperatureK: state.wallTemperatureK,
    pumpStrokeCount: state.pumpStrokeCount + 1,
  };
  const nextPressureKPa = deriveFreePhysicalState(candidateState, config).gasPressureKPa;
  if (nextPressureKPa >= dangerPressureKPa) {
    return createPumpReject('pressureDanger', state);
  }

  return {
    accepted: true,
    reason: 'accepted',
    state: {
      ...candidateState,
      maxPressureKPa: Math.max(state.maxPressureKPa, nextPressureKPa),
    },
  };
};

const applyOpeningRelease = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  atS: number,
) => {
  const derived = deriveFreePhysicalState(state, config);
  if (derived.gasPressureKPa <= config.environment.ambientPressureKPa + PRESSURE_EPSILON_KPA) {
    return state;
  }

  const adiabaticTemperatureK = state.gasTemperatureK *
    (config.environment.ambientPressureKPa / derived.gasPressureKPa) **
      ((config.gamma - 1) / config.gamma);
  const cooledTemperatureK = config.environment.ambientTemperatureK +
    (adiabaticTemperatureK - config.environment.ambientTemperatureK) *
      config.releaseCoolingFactor;
  const releasedAmountRatio = config.environment.ambientTemperatureK / cooledTemperatureK;
  const releaseReference = state.releaseReference ?? {
    pressureBeforeKPa: derived.gasPressureKPa,
    temperatureBeforeK: state.gasTemperatureK,
    amountBeforeRatio: state.gasAmountRatio,
    openedAtS: atS,
    reachedAmbientAtS: atS,
  };

  return {
    ...state,
    gasAmountRatio: releasedAmountRatio,
    gasTemperatureK: cooledTemperatureK,
    wallTemperatureK: state.wallTemperatureK,
    releaseStarted: true,
    releaseReference,
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

  if (!controls.stopcockOpen) {
    const thermal = stepThermalState(state, config, dtS);
    const closedState: HeatCapacityFreePhysicsState = {
      ...state,
      simulationTimeS: atS,
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
    ...state,
    simulationTimeS: atS,
    lastStopcockOpenedAtS: newlyOpened ? atS : state.lastStopcockOpenedAtS,
    currentStopcockOpenDurationS: newlyOpened
      ? clampNonNegativeFinite(dtS)
      : state.currentStopcockOpenDurationS + clampNonNegativeFinite(dtS),
  };
  const releaseCandidate = newlyOpened
    ? applyOpeningRelease(openedBaseState, config, atS)
    : openedBaseState;
  const releaseWasApplied = newlyOpened && releaseCandidate !== openedBaseState;
  const flowedState = releaseWasApplied
    ? releaseCandidate
    : stepOpenState(releaseCandidate, config, dtS);
  const pressureKPa = deriveFreePhysicalState(flowedState, config).gasPressureKPa;

  return {
    ...flowedState,
    maxPressureKPa: Math.max(state.maxPressureKPa, pressureKPa),
  };
};
