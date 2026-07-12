import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from './heatCapacityDefaultConfig.ts';

export type HeatCapacityReleasePurpose = 'none' | 'zeroing' | 'release';

export type HeatCapacityReleasePhase =
  | 'closed'
  | 'opening'
  | 'open'
  | 'releasing'
  | 'closing'
  | 'closedAfterRelease';

export interface HeatCapacityReleaseState {
  phase: HeatCapacityReleasePhase;
  purpose: HeatCapacityReleasePurpose;
  attemptId: number;
  phaseStartedAtS: number;
  openingStartedAtS: number | null;
  openingCompletedAtS: number | null;
  closeCommandAtS: number | null;
  closingCompletedAtS: number | null;
  releaseDurationS: number;
  formedRelease: boolean;
  quickToggle: boolean;
}

export type HeatCapacityReleaseTransitionType = 'opening-complete' | 'closing-complete';

export interface HeatCapacityReleaseTransition {
  type: HeatCapacityReleaseTransitionType;
  atS: number;
  purpose: HeatCapacityReleasePurpose;
  attemptId: number;
  formedRelease: boolean;
  releaseDurationS: number;
}

const RELEASE_TIME_EPSILON_S = 1e-9;

const finiteNonNegative = (value: number, fallback = 0) => (
  Number.isFinite(value) && value >= 0 ? value : fallback
);

export const createClosedHeatCapacityReleaseState = (
  atS = 0,
): HeatCapacityReleaseState => ({
  phase: 'closed',
  purpose: 'none',
  attemptId: 0,
  phaseStartedAtS: finiteNonNegative(atS),
  openingStartedAtS: null,
  openingCompletedAtS: null,
  closeCommandAtS: null,
  closingCompletedAtS: null,
  releaseDurationS: 0,
  formedRelease: false,
  quickToggle: false,
});

export const isHeatCapacityReleaseFlowOpen = (
  state: HeatCapacityReleaseState,
) => state.phase === 'open' || state.phase === 'releasing';

export const isHeatCapacityMainReleaseFlowOpen = (
  state: HeatCapacityReleaseState,
) => state.phase === 'releasing' && state.purpose === 'release';

export const isHeatCapacityReleaseMotionActive = (
  state: HeatCapacityReleaseState,
) => state.phase === 'opening' || state.phase === 'closing';

export const getHeatCapacityReleaseDurationS = (
  state: HeatCapacityReleaseState,
  atS = state.phaseStartedAtS,
) => (
  state.phase === 'releasing' && state.openingCompletedAtS !== null
    ? Math.max(0, finiteNonNegative(atS) - state.openingCompletedAtS)
    : state.releaseDurationS
);

export const getHeatCapacityReleaseNextTransitionAtS = (
  state: HeatCapacityReleaseState,
): number | null => {
  if (state.phase === 'opening' && state.openingStartedAtS !== null) {
    return state.openingStartedAtS + HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs / 1000;
  }
  if (state.phase === 'closing' && state.closeCommandAtS !== null) {
    return state.closeCommandAtS + HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs / 1000;
  }
  return null;
};

export const advanceHeatCapacityReleaseState = (
  state: HeatCapacityReleaseState,
  atS: number,
): { state: HeatCapacityReleaseState; transitions: HeatCapacityReleaseTransition[] } => {
  const safeAtS = finiteNonNegative(atS, state.phaseStartedAtS);
  const transitionAtS = getHeatCapacityReleaseNextTransitionAtS(state);
  if (transitionAtS === null || safeAtS + RELEASE_TIME_EPSILON_S < transitionAtS) {
    return { state, transitions: [] };
  }

  if (state.phase === 'opening') {
    const nextPhase: HeatCapacityReleasePhase = state.purpose === 'release' ? 'releasing' : 'open';
    const nextState: HeatCapacityReleaseState = {
      ...state,
      phase: nextPhase,
      phaseStartedAtS: transitionAtS,
      openingCompletedAtS: transitionAtS,
      formedRelease: state.purpose === 'release',
      releaseDurationS: 0,
    };
    return {
      state: nextState,
      transitions: [{
        type: 'opening-complete',
        atS: transitionAtS,
        purpose: state.purpose,
        attemptId: state.attemptId,
        formedRelease: nextState.formedRelease,
        releaseDurationS: 0,
      }],
    };
  }

  const nextPhase: HeatCapacityReleasePhase = state.formedRelease
    ? 'closedAfterRelease'
    : 'closed';
  const nextState: HeatCapacityReleaseState = {
    ...state,
    phase: nextPhase,
    purpose: state.formedRelease ? 'release' : 'none',
    phaseStartedAtS: transitionAtS,
    closingCompletedAtS: transitionAtS,
  };
  return {
    state: nextState,
    transitions: [{
      type: 'closing-complete',
      atS: transitionAtS,
      purpose: state.purpose,
      attemptId: state.attemptId,
      formedRelease: state.formedRelease,
      releaseDurationS: state.releaseDurationS,
    }],
  };
};

export const beginHeatCapacityReleaseOpening = (
  state: HeatCapacityReleaseState,
  purpose: Exclude<HeatCapacityReleasePurpose, 'none'>,
  atS: number,
): HeatCapacityReleaseState => {
  const safeAtS = finiteNonNegative(atS, state.phaseStartedAtS);
  if (state.phase === 'opening' || state.phase === 'open' || state.phase === 'releasing' || state.phase === 'closing') {
    return state;
  }
  return {
    phase: 'opening',
    purpose,
    attemptId: state.attemptId + 1,
    phaseStartedAtS: safeAtS,
    openingStartedAtS: safeAtS,
    openingCompletedAtS: null,
    closeCommandAtS: null,
    closingCompletedAtS: null,
    releaseDurationS: 0,
    formedRelease: false,
    quickToggle: false,
  };
};

export const beginHeatCapacityReleaseClosing = (
  state: HeatCapacityReleaseState,
  atS: number,
): HeatCapacityReleaseState => {
  const safeAtS = finiteNonNegative(atS, state.phaseStartedAtS);
  const advanced = advanceHeatCapacityReleaseState(state, safeAtS).state;
  if (advanced.phase !== 'opening' && advanced.phase !== 'open' && advanced.phase !== 'releasing') {
    return advanced;
  }
  const formedRelease = advanced.phase === 'releasing' && advanced.openingCompletedAtS !== null;
  const releaseDurationS = formedRelease && advanced.openingCompletedAtS !== null
    ? Math.max(0, safeAtS - advanced.openingCompletedAtS)
    : 0;
  return {
    ...advanced,
    phase: 'closing',
    phaseStartedAtS: safeAtS,
    closeCommandAtS: safeAtS,
    closingCompletedAtS: null,
    releaseDurationS,
    formedRelease,
    quickToggle: advanced.phase === 'opening',
  };
};

export const normalizeHeatCapacityReleaseState = (
  value: unknown,
  fallback = createClosedHeatCapacityReleaseState(),
): HeatCapacityReleaseState => {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Partial<Record<keyof HeatCapacityReleaseState, unknown>>;
  const validPhase: HeatCapacityReleasePhase[] = ['closed', 'opening', 'open', 'releasing', 'closing', 'closedAfterRelease'];
  const validPurpose: HeatCapacityReleasePurpose[] = ['none', 'zeroing', 'release'];
  const phase = typeof candidate.phase === 'string' && validPhase.includes(candidate.phase as HeatCapacityReleasePhase)
    ? candidate.phase as HeatCapacityReleasePhase
    : fallback.phase;
  const purpose = typeof candidate.purpose === 'string' && validPurpose.includes(candidate.purpose as HeatCapacityReleasePurpose)
    ? candidate.purpose as HeatCapacityReleasePurpose
    : fallback.purpose;
  const nullableTime = (entry: unknown) => (
    typeof entry === 'number' && Number.isFinite(entry) && entry >= 0 ? entry : null
  );
  return {
    phase,
    purpose,
    attemptId: typeof candidate.attemptId === 'number' && Number.isInteger(candidate.attemptId) && candidate.attemptId >= 0
      ? candidate.attemptId
      : fallback.attemptId,
    phaseStartedAtS: typeof candidate.phaseStartedAtS === 'number'
      ? finiteNonNegative(candidate.phaseStartedAtS, fallback.phaseStartedAtS)
      : fallback.phaseStartedAtS,
    openingStartedAtS: nullableTime(candidate.openingStartedAtS),
    openingCompletedAtS: nullableTime(candidate.openingCompletedAtS),
    closeCommandAtS: nullableTime(candidate.closeCommandAtS),
    closingCompletedAtS: nullableTime(candidate.closingCompletedAtS),
    releaseDurationS: typeof candidate.releaseDurationS === 'number'
      ? finiteNonNegative(candidate.releaseDurationS)
      : fallback.releaseDurationS,
    formedRelease: candidate.formedRelease === true,
    quickToggle: candidate.quickToggle === true,
  };
};

export interface HeatCapacityReleaseGasState {
  gasAmountRatio: number;
  gasTemperatureK: number;
}

export interface HeatCapacityReleaseFlowConfig {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  gamma: number;
  coefficient: number;
}

const MIN_AMOUNT_RATIO = 0.000001;
const MIN_TEMPERATURE_K = 1;
const MIN_PRESSURE_KPA = 0.000001;
const AIR_REFERENCE_GAMMA = 1.4;
export const HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA = 0.03;

const clampNonNegative = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

const calculateSignedReleaseAmountRatio = (input: {
  gasPressureKPa: number;
  ambientPressureKPa: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
  gamma: number;
  coefficient: number;
  effectiveDtS: number;
}) => {
  const coefficient = clampNonNegative(input.coefficient);
  const effectiveDtS = clampNonNegative(input.effectiveDtS);
  if (coefficient === 0 || effectiveDtS === 0) return 0;
  const ambientPressureKPa = Math.max(MIN_PRESSURE_KPA, input.ambientPressureKPa);
  const gasPressureKPa = Math.max(MIN_PRESSURE_KPA, input.gasPressureKPa);
  const pressureDeltaKPa = gasPressureKPa - ambientPressureKPa;
  if (Math.abs(pressureDeltaKPa) <= HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA) return 0;
  const gamma = Math.max(1.001, input.gamma);
  const gammaFlowScale = Math.sqrt(AIR_REFERENCE_GAMMA / gamma);
  const ambientTemperatureK = Math.max(MIN_TEMPERATURE_K, input.ambientTemperatureK);
  const gasTemperatureK = Math.max(MIN_TEMPERATURE_K, input.gasTemperatureK);
  const outflow = pressureDeltaKPa > 0;
  const upstreamPressureKPa = outflow ? gasPressureKPa : ambientPressureKPa;
  const downstreamPressureKPa = outflow ? ambientPressureKPa : gasPressureKPa;
  const upstreamTemperatureK = outflow ? gasTemperatureK : ambientTemperatureK;
  const pressureRatio = Math.min(1, Math.max(MIN_PRESSURE_KPA, downstreamPressureKPa / upstreamPressureKPa));
  const criticalPressureRatio = Math.pow(2 / (gamma + 1), gamma / (gamma - 1));
  const effectivePressureRatio = Math.max(pressureRatio, criticalPressureRatio);
  const flowDrive = Math.sqrt(Math.max(
    0,
    (2 * gamma / (gamma - 1)) * (
      Math.pow(effectivePressureRatio, 2 / gamma) -
      Math.pow(effectivePressureRatio, (gamma + 1) / gamma)
    ),
  ));
  const pressureScale = upstreamPressureKPa / ambientPressureKPa;
  const temperatureScale = Math.sqrt(ambientTemperatureK / upstreamTemperatureK);
  const amountRatio = coefficient * gammaFlowScale * pressureScale * temperatureScale * flowDrive * effectiveDtS;
  return outflow ? -amountRatio : amountRatio;
};

export const stepHeatCapacityReleaseGasState = (
  state: HeatCapacityReleaseGasState,
  config: HeatCapacityReleaseFlowConfig,
  effectiveDtS: number,
): HeatCapacityReleaseGasState => {
  if (config.coefficient <= 0 || effectiveDtS <= 0) return state;
  const ambientTemperatureK = Math.max(MIN_TEMPERATURE_K, config.ambientTemperatureK);
  const gasTemperatureK = Math.max(MIN_TEMPERATURE_K, state.gasTemperatureK);
  const gasAmountRatio = Math.max(MIN_AMOUNT_RATIO, state.gasAmountRatio);
  const gamma = Math.max(1.001, config.gamma);
  const gasPressureKPa = config.ambientPressureKPa * gasAmountRatio * (gasTemperatureK / ambientTemperatureK);
  const pressureRatio = gasAmountRatio * gasTemperatureK / ambientTemperatureK;
  const cv = 1 / (gamma - 1);
  const cp = gamma * cv;
  const signedFlowAmountRatio = calculateSignedReleaseAmountRatio({
    gasPressureKPa,
    ambientPressureKPa: config.ambientPressureKPa,
    gasTemperatureK,
    ambientTemperatureK,
    gamma,
    coefficient: config.coefficient,
    effectiveDtS,
  });

  if (pressureRatio > 1 + MIN_PRESSURE_KPA) {
    const outflowToAmbientRatio = Math.max(0, (gasAmountRatio - ambientTemperatureK / gasTemperatureK) / gamma);
    const outflowAmountRatio = Math.min(
      gasAmountRatio - MIN_AMOUNT_RATIO,
      outflowToAmbientRatio,
      Math.max(0, -signedFlowAmountRatio),
    );
    if (outflowAmountRatio <= 0) return state;
    const nextAmountRatio = Math.max(MIN_AMOUNT_RATIO, gasAmountRatio - outflowAmountRatio);
    const nextEnergy = gasAmountRatio * cv * gasTemperatureK - outflowAmountRatio * cp * gasTemperatureK;
    return {
      gasAmountRatio: nextAmountRatio,
      gasTemperatureK: Math.max(MIN_TEMPERATURE_K, nextEnergy / (nextAmountRatio * cv)),
    };
  }

  if (pressureRatio < 1 - MIN_PRESSURE_KPA) {
    const inflowToAmbientRatio = Math.max(0, (1 - pressureRatio) / gamma);
    const inflowAmountRatio = Math.min(inflowToAmbientRatio, Math.max(0, signedFlowAmountRatio));
    if (inflowAmountRatio <= 0) return state;
    const nextAmountRatio = gasAmountRatio + inflowAmountRatio;
    const nextEnergy = gasAmountRatio * cv * gasTemperatureK + inflowAmountRatio * cp * ambientTemperatureK;
    return {
      gasAmountRatio: nextAmountRatio,
      gasTemperatureK: Math.max(MIN_TEMPERATURE_K, nextEnergy / (nextAmountRatio * cv)),
    };
  }

  return state;
};
