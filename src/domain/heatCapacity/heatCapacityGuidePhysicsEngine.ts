import {
  getFreeStopcockApertureEffectiveDtS,
} from './heatCapacityFreeStopcockApertureModel.ts';
import {
  stepFreeThermalState,
} from './heatCapacityFreeThermalModel.ts';

export interface HeatCapacityGuidePhysicsConfig {
  environment: {
    ambientTemperatureK: number;
    ambientPressureKPa: number;
  };
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpPressureLimitKPa: number;
  stopcockFlowRate: number;
  thermal: {
    gasWallConductanceWPerK: number;
    wallAmbientConductanceWPerK: number;
    wallHeatCapacityJPerK: number;
    minimumGasHeatCapacityJPerK: number;
  };
}

export interface HeatCapacityGuidePumpProcess {
  startedAtS: number;
  strength: number;
  appliedProgress: number;
}

export interface HeatCapacityGuidePhysicsState {
  simulationTimeS: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
  pumpProcesses: HeatCapacityGuidePumpProcess[];
  pumpStrokeCount: number;
  lastPumpStrokeAtS: number | null;
  lastPumpValveOpenedAtS: number | null;
  lastPumpValveClosedAtS: number | null;
  currentPumpValveOpenDurationS: number;
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

export interface HeatCapacityGuideControls {
  powerOn: boolean;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
}

export interface HeatCapacityGuidePumpStrokeEvent {
  atS: number;
  strength: number;
}

export type HeatCapacityGuidePumpStrokeRejectReason =
  | 'powerOff'
  | 'pumpValveClosed'
  | 'stopcockOpen'
  | 'pressureDanger';

export interface HeatCapacityGuidePumpStrokeResult {
  accepted: boolean;
  reason: 'accepted' | HeatCapacityGuidePumpStrokeRejectReason;
  state: HeatCapacityGuidePhysicsState;
}

const MIN_GAS_AMOUNT_RATIO = 0.000001;
const MIN_GAS_TEMPERATURE_K = 1;
const PRESSURE_EPSILON_KPA = 0.000001;
const PRESSURE_NEAR_AMBIENT_KPA = 0.03;
const GUIDE_PUMP_STROKE_DURATION_S = 0.08;
const GUIDE_OPEN_FLOW_MAX_SUBSTEP_S = 0.02;
const GUIDE_CLOSED_WAIT_MAX_SUBSTEP_S = 1;

const GUIDE_PUMP_STROKE_PROGRESS_POINTS = [
  [0, 0],
  [0.02, 0.18],
  [0.04, 0.68],
  [0.06, 0.92],
  [GUIDE_PUMP_STROKE_DURATION_S, 1],
] as const;

const clampNonNegativeFinite = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

const clampUnit = (value: number) => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
);

export const createDefaultGuidePhysicsConfig = (): HeatCapacityGuidePhysicsConfig => ({
  environment: {
    ambientTemperatureK: 298.15,
    ambientPressureKPa: 101.3,
  },
  vesselVolumeL: 10,
  gamma: 1.4,
  pumpAmountGainRatio: 0.0039,
  pumpPressureLimitKPa: 108.8,
  stopcockFlowRate: 4.4,
  thermal: {
    gasWallConductanceWPerK: 0.115,
    wallAmbientConductanceWPerK: 0.36,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
});

export const createDefaultGuidePhysicsState = (
  config: HeatCapacityGuidePhysicsConfig = createDefaultGuidePhysicsConfig(),
): HeatCapacityGuidePhysicsState => ({
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
  releaseStarted: false,
  lastStopcockOpenedAtS: null,
  lastStopcockClosedAtS: null,
  currentStopcockOpenDurationS: 0,
  releaseReference: null,
});

export const deriveGuidePhysicalState = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
) => {
  const ambientPressureKPa = Math.max(PRESSURE_EPSILON_KPA, config.environment.ambientPressureKPa);
  const ambientTemperatureK = Math.max(MIN_GAS_TEMPERATURE_K, config.environment.ambientTemperatureK);
  const gasPressureKPa = ambientPressureKPa *
    Math.max(MIN_GAS_AMOUNT_RATIO, state.gasAmountRatio) *
    (Math.max(MIN_GAS_TEMPERATURE_K, state.gasTemperatureK) / ambientTemperatureK);
  return {
    gasPressureKPa,
    pressureDeltaKPa: gasPressureKPa - ambientPressureKPa,
  };
};

const getGuidePumpStrokeProgress = (elapsedS: number) => {
  const elapsed = clampNonNegativeFinite(elapsedS);
  if (elapsed >= GUIDE_PUMP_STROKE_DURATION_S - 1e-9) return 1;
  for (let index = 1; index < GUIDE_PUMP_STROKE_PROGRESS_POINTS.length; index += 1) {
    const [rightTime, rightProgress] = GUIDE_PUMP_STROKE_PROGRESS_POINTS[index];
    if (elapsed <= rightTime) {
      const [leftTime, leftProgress] = GUIDE_PUMP_STROKE_PROGRESS_POINTS[index - 1];
      const span = Math.max(0.000001, rightTime - leftTime);
      const localProgress = clampUnit((elapsed - leftTime) / span);
      return leftProgress + (rightProgress - leftProgress) * localProgress;
    }
  }
  return 1;
};

const applyPumpInflow = (
  state: Pick<HeatCapacityGuidePhysicsState, 'gasAmountRatio' | 'gasTemperatureK'>,
  config: HeatCapacityGuidePhysicsConfig,
  amountDeltaRatio: number,
) => {
  const safeAmountDeltaRatio = clampNonNegativeFinite(amountDeltaRatio);
  if (safeAmountDeltaRatio === 0) return state;
  const gasAmountRatio = Math.max(MIN_GAS_AMOUNT_RATIO, state.gasAmountRatio);
  const gasTemperatureK = Math.max(MIN_GAS_TEMPERATURE_K, state.gasTemperatureK);
  const inflowTemperatureK = Math.max(
    MIN_GAS_TEMPERATURE_K,
    config.environment.ambientTemperatureK,
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

const stepPumpProcesses = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  atS: number,
): HeatCapacityGuidePhysicsState => {
  if (state.pumpProcesses.length === 0) return { ...state, pumpProcesses: [] };
  let gasAmountRatio = state.gasAmountRatio;
  let gasTemperatureK = state.gasTemperatureK;
  const pumpProcesses: HeatCapacityGuidePumpProcess[] = [];

  for (const process of state.pumpProcesses) {
    const previousProgress = clampUnit(process.appliedProgress);
    const nextProgress = getGuidePumpStrokeProgress(atS - process.startedAtS);
    const progressDelta = Math.max(0, nextProgress - previousProgress);
    if (progressDelta > 0) {
      const pumped = applyPumpInflow(
        { gasAmountRatio, gasTemperatureK },
        config,
        config.pumpAmountGainRatio * clampNonNegativeFinite(process.strength) * progressDelta,
      );
      gasAmountRatio = pumped.gasAmountRatio;
      gasTemperatureK = pumped.gasTemperatureK;
    }
    if (nextProgress < 1) {
      pumpProcesses.push({
        ...process,
        appliedProgress: nextProgress,
      });
    }
  }

  return {
    ...state,
    gasAmountRatio,
    gasTemperatureK,
    pumpProcesses,
  };
};

const createPumpReject = (
  reason: HeatCapacityGuidePumpStrokeRejectReason,
  state: HeatCapacityGuidePhysicsState,
): HeatCapacityGuidePumpStrokeResult => ({
  accepted: false,
  reason,
  state,
});

export const applyGuidePumpStroke = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  controls: HeatCapacityGuideControls,
  event: HeatCapacityGuidePumpStrokeEvent,
): HeatCapacityGuidePumpStrokeResult => {
  if (!controls.powerOn) return createPumpReject('powerOff', state);
  if (!controls.pumpValveOpen) return createPumpReject('pumpValveClosed', state);
  if (controls.stopcockOpen) return createPumpReject('stopcockOpen', state);
  if (deriveGuidePhysicalState(state, config).gasPressureKPa >= config.pumpPressureLimitKPa) {
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
        ...state.pumpProcesses,
        {
          startedAtS: event.atS,
          strength: clampNonNegativeFinite(event.strength),
          appliedProgress: 0,
        },
      ],
    },
  };
};

const createReleaseReference = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  atS: number,
) => {
  const derived = deriveGuidePhysicalState(state, config);
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

const calculateFlowAmountRatio = (input: {
  gasPressureKPa: number;
  ambientPressureKPa: number;
  coefficient: number;
  effectiveDtS: number;
}) => {
  const pressureDeltaKPa = input.gasPressureKPa - input.ambientPressureKPa;
  if (Math.abs(pressureDeltaKPa) <= PRESSURE_NEAR_AMBIENT_KPA) return 0;
  const drive = Math.sqrt(Math.abs(pressureDeltaKPa) / Math.max(PRESSURE_EPSILON_KPA, input.ambientPressureKPa));
  const amountRatio = clampNonNegativeFinite(input.coefficient) * drive * clampNonNegativeFinite(input.effectiveDtS);
  return pressureDeltaKPa > 0 ? -amountRatio : amountRatio;
};

const stepOpenStopcock = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  dtS: number,
) => {
  const effectiveDtS = getFreeStopcockApertureEffectiveDtS(
    state.currentStopcockOpenDurationS,
    dtS,
  );
  if (effectiveDtS <= 0) return state;
  const derived = deriveGuidePhysicalState(state, config);
  const amountDelta = calculateFlowAmountRatio({
    gasPressureKPa: derived.gasPressureKPa,
    ambientPressureKPa: config.environment.ambientPressureKPa,
    coefficient: config.stopcockFlowRate,
    effectiveDtS,
  });
  if (amountDelta === 0) {
    return {
      ...state,
      releaseReference: state.releaseReference && state.releaseReference.reachedAmbientAtS === null
        ? { ...state.releaseReference, reachedAmbientAtS: state.simulationTimeS }
        : state.releaseReference,
    };
  }

  const nextAmountRatio = Math.max(MIN_GAS_AMOUNT_RATIO, state.gasAmountRatio + amountDelta);
  const outflow = amountDelta < 0;
  const gasTemperatureK = outflow
    ? Math.max(
        MIN_GAS_TEMPERATURE_K,
        state.gasTemperatureK * Math.pow(nextAmountRatio / Math.max(MIN_GAS_AMOUNT_RATIO, state.gasAmountRatio), config.gamma - 1),
      )
    : (
        state.gasAmountRatio * state.gasTemperatureK +
        amountDelta * config.environment.ambientTemperatureK
      ) / nextAmountRatio;
  const nextState = {
    ...state,
    gasAmountRatio: nextAmountRatio,
    gasTemperatureK,
  };
  const nextDerived = deriveGuidePhysicalState(nextState, config);
  if (nextDerived.gasPressureKPa <= config.environment.ambientPressureKPa + PRESSURE_NEAR_AMBIENT_KPA) {
    const ambientAmountRatio = config.environment.ambientTemperatureK / Math.max(MIN_GAS_TEMPERATURE_K, gasTemperatureK);
    return {
      ...nextState,
      gasAmountRatio: Math.max(MIN_GAS_AMOUNT_RATIO, ambientAmountRatio),
      releaseReference: nextState.releaseReference && nextState.releaseReference.reachedAmbientAtS === null
        ? { ...nextState.releaseReference, reachedAmbientAtS: nextState.simulationTimeS }
        : nextState.releaseReference,
    };
  }
  return nextState;
};

const stepThermal = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  dtS: number,
) => {
  const result = stepFreeThermalState(
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
  return {
    ...state,
    gasTemperatureK: result.state.gasTemperatureK,
    wallTemperatureK: result.state.wallTemperatureK,
  };
};

export const stepGuidePhysicsState = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  input: HeatCapacityGuideControls & { dtS: number },
): HeatCapacityGuidePhysicsState => {
  const totalDtS = clampNonNegativeFinite(input.dtS);
  if (!input.powerOn || totalDtS === 0) return state;
  let nextState = state;
  let remainingS = totalDtS;

  while (remainingS > 0) {
    const requiresFastStep = input.stopcockOpen || nextState.pumpProcesses.length > 0;
    const stepS = Math.min(
      remainingS,
      requiresFastStep ? GUIDE_OPEN_FLOW_MAX_SUBSTEP_S : GUIDE_CLOSED_WAIT_MAX_SUBSTEP_S,
    );
    const atS = nextState.simulationTimeS + stepS;
    const wasStopcockOpen = nextState.lastStopcockOpenedAtS !== null &&
      (nextState.lastStopcockClosedAtS === null || nextState.lastStopcockOpenedAtS >= nextState.lastStopcockClosedAtS);

    if (input.stopcockOpen && !wasStopcockOpen) {
      nextState = {
        ...nextState,
        lastStopcockOpenedAtS: nextState.simulationTimeS,
        lastStopcockClosedAtS: null,
        currentStopcockOpenDurationS: 0,
        releaseStarted: true,
        releaseReference: createReleaseReference(nextState, config, nextState.simulationTimeS),
      };
    } else if (!input.stopcockOpen && wasStopcockOpen) {
      nextState = {
        ...nextState,
        lastStopcockClosedAtS: nextState.simulationTimeS,
        currentStopcockOpenDurationS: 0,
      };
    }

    nextState = {
      ...stepPumpProcesses(nextState, config, atS),
      simulationTimeS: atS,
    };

    if (input.stopcockOpen) {
      nextState = stepOpenStopcock(nextState, config, stepS);
      nextState = {
        ...nextState,
        currentStopcockOpenDurationS: nextState.currentStopcockOpenDurationS + stepS,
      };
    }

    nextState = stepThermal(nextState, config, stepS);
    remainingS -= stepS;
  }

  return nextState;
};
