import {
  mapHeatCapacitySignals,
  type HeatCapacitySensorMappingConfig,
} from './heatCapacitySensorMapping.ts';
import {
  HEAT_CAPACITY_VIDEO_PROFILE,
  getHeatCapacityRangeMidpoint,
  getHeatCapacityRangeValue,
} from './heatCapacityDisplayResponse.ts';
import {
  DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS,
} from './heatCapacityResultModel.ts';

export type HeatCapacityRuntimePhase =
  | 'powerOff'
  | 'readyToZero'
  | 'zeroed'
  | 'readyToPump'
  | 'pumping'
  | 'sealedStabilizing'
  | 'releasing'
  | 'recovering'
  | 'demoComplete';

export type HeatCapacityPumpFrequencyStatus = 'idle' | 'tooSlow' | 'suitable';

export interface HeatCapacityProcessSamplePoint {
  timeS: number;
  phase: HeatCapacityRuntimePhase;
  temperatureSignalMv: number;
  pressureSignalMv: number;
  gasTemperatureK: number;
  gasPressureKPaAbs: number;
  pressureDeltaKPa: number;
  pumpFrequency: number;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
}

export type HeatCapacityProcessSampleKey =
  | 'startSample'
  | 'zeroedSample'
  | 'afterPumpSample'
  | 'pumpPeakSample'
  | 'beforeReleaseSample'
  | 'stableBeforeReleaseSample'
  | 'afterReleaseSample'
  | 'releaseLowSample'
  | 'recoverySample';

export type HeatCapacityProcessSamples = Partial<Record<HeatCapacityProcessSampleKey, HeatCapacityProcessSamplePoint>>;

export interface HeatCapacityModelConfig {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  visualizationMode: 'particle';
  calculationModel: 'airHeatCapacityRatio';
  theoreticalGamma: number;
  pressureLimitKPa: number;
  pumpPressureGainTooSlowKPa: number;
  pumpPressureGainSuitableKPa: number;
  pumpTemperatureGainTooSlowK: number;
  pumpTemperatureGainSuitableK: number;
  thermalRelaxRate: number;
  releaseRate: number;
  releaseCoolingKPerKPa: number;
  sealedPressureSettleRate: number;
  recoveryPressureRate: number;
  pumpHeatFollowRate: number;
  recoveryHeatFollowRate: number;
  pumpPressurePeakMv: number;
  stablePressureMv: number;
  recoveryPressureMv: number;
  stableTemperatureMv: number;
  releaseTemperatureMv: number;
  recoveryTemperatureMv: number;
  sensor: HeatCapacitySensorMappingConfig;
}

export interface HeatCapacityRuntimeState {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  gasPressureKPaAbs: number;
  gasTemperatureK: number;
  pressureDeltaKPa: number;
  simulationTimeS: number;
  lastUpdateMs: number | null;
  pressureSignalMvRaw: number;
  pressureSignalMvDisplayed: number;
  pressureInitialBiasMv: number;
  temperatureSignalMv: number;
  pressureZeroOffset: number;
  pressureZeroAdjusted: boolean;
  heatCapacityPhase: HeatCapacityRuntimePhase;
  heatCapacityProcessSamples: HeatCapacityProcessSamples;
  modelConfig: HeatCapacityModelConfig;
}

export interface HeatCapacityStepControls {
  powerOn: boolean;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
  pumpFrequency: number;
  pumpFrequencyStatus: HeatCapacityPumpFrequencyStatus;
  demoComplete?: boolean;
}

export interface HeatCapacityPumpStrokeResult {
  accepted: boolean;
  reason: 'accepted' | 'powerOff' | 'pumpValveClosed' | 'stopcockOpen';
  state: HeatCapacityRuntimeState;
}

export const HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA = 0.12;

export const DEFAULT_HEAT_CAPACITY_MODEL_CONFIG: HeatCapacityModelConfig = {
  ambientPressureKPa: DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS.atmosphericPressureKPa,
  ambientTemperatureK: 298.15,
  visualizationMode: 'particle',
  calculationModel: 'airHeatCapacityRatio',
  theoreticalGamma: DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS.theoreticalGamma,
  pressureLimitKPa: 500,
  pumpPressureGainTooSlowKPa: 0.2,
  pumpPressureGainSuitableKPa: 0.78,
  pumpTemperatureGainTooSlowK: 0.35,
  pumpTemperatureGainSuitableK: 1.15,
  thermalRelaxRate: 0.18,
  releaseRate: 9.5,
  releaseCoolingKPerKPa: 0.54,
  sealedPressureSettleRate: 0.42,
  recoveryPressureRate: 0.34,
  pumpHeatFollowRate: 0.72,
  recoveryHeatFollowRate: 0.38,
  pumpPressurePeakMv: getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.pumpPeakPressureMvRange),
  stablePressureMv: getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.stablePressureMvRange),
  recoveryPressureMv: getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.recoveryPressureMvRange),
  stableTemperatureMv: getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.stableTemperatureMvRange),
  releaseTemperatureMv: getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.releaseTemperatureMvRange),
  recoveryTemperatureMv: getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.recoveryTemperatureMvRange),
  sensor: {
    pressureSensitivityMvPerKPa: DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS.pressureSensitivityMvPerKPa,
    temperatureBaseMv: getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.initialTemperatureMvRange),
    temperatureSensitivityMvPerK: 4,
    noiseStdDevMv: 0,
  },
};

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const roundNumber = (value: number, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const mapPressureMvToDeltaKPa = (
  pressureMv: number,
  config: HeatCapacityModelConfig,
) => pressureMv / config.sensor.pressureSensitivityMvPerKPa;

const mapTemperatureMvToGasK = (
  temperatureMv: number,
  config: HeatCapacityModelConfig,
) => config.ambientTemperatureK + (
  (temperatureMv - config.sensor.temperatureBaseMv) / config.sensor.temperatureSensitivityMvPerK
);

const getDeterministicFraction = (
  state: HeatCapacityRuntimeState,
  now: number,
  seed: number,
) => {
  const basis = state.simulationTimeS * 12.9898 + now * 0.00031 + seed;
  return (Math.sin(basis) * 43758.5453) % 1 < 0
    ? ((Math.sin(basis) * 43758.5453) % 1) + 1
    : (Math.sin(basis) * 43758.5453) % 1;
};

const moveToward = (
  current: number,
  target: number,
  rate: number,
  dt: number,
) => current + (target - current) * (1 - Math.exp(-rate * dt));

const mergeModelConfig = (
  config?: Partial<HeatCapacityModelConfig>,
): HeatCapacityModelConfig => ({
  ...DEFAULT_HEAT_CAPACITY_MODEL_CONFIG,
  ...config,
  sensor: {
    ...DEFAULT_HEAT_CAPACITY_MODEL_CONFIG.sensor,
    ...config?.sensor,
  },
});

const withMappedSignals = (
  state: HeatCapacityRuntimeState,
): HeatCapacityRuntimeState => {
  const pressureDeltaKPa = roundNumber(Math.max(0, state.gasPressureKPaAbs - state.ambientPressureKPa), 4);
  const signals = mapHeatCapacitySignals({
    ambientTemperatureK: state.ambientTemperatureK,
    gasTemperatureK: state.gasTemperatureK,
    pressureDeltaKPa,
    pressureInitialBiasMv: state.pressureInitialBiasMv,
    pressureZeroOffset: state.pressureZeroOffset,
    config: state.modelConfig.sensor,
  });

  return {
    ...state,
    gasPressureKPaAbs: roundNumber(state.gasPressureKPaAbs, 4),
    gasTemperatureK: roundNumber(state.gasTemperatureK, 4),
    pressureDeltaKPa,
    pressureSignalMvRaw: signals.pressureSignalMvRaw,
    pressureSignalMvDisplayed: signals.pressureSignalMvDisplayed,
    temperatureSignalMv: signals.temperatureSignalMv,
  };
};

const getPassivePhase = (
  state: HeatCapacityRuntimeState,
  controls: HeatCapacityStepControls,
): HeatCapacityRuntimePhase => {
  if (!controls.powerOn) return 'powerOff';
  if (controls.demoComplete) return 'demoComplete';
  if (state.heatCapacityPhase === 'releasing' || state.heatCapacityPhase === 'recovering') {
    return controls.stopcockOpen && state.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA
      ? 'releasing'
      : 'recovering';
  }
  if (controls.stopcockOpen && state.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA) return 'releasing';
  if (state.pressureZeroAdjusted && controls.pumpValveOpen && state.pressureDeltaKPa <= 0.02) return 'readyToPump';
  if (state.pressureZeroAdjusted && state.pressureDeltaKPa <= 0.02) return 'zeroed';
  if (state.pressureDeltaKPa > 0.02) {
    return state.heatCapacityPhase === 'releasing' || state.heatCapacityPhase === 'recovering'
      ? 'recovering'
      : 'sealedStabilizing';
  }
  return 'readyToZero';
};

export const createDefaultHeatCapacityRuntimeState = (
  now: number | null = null,
  config?: Partial<HeatCapacityModelConfig>,
): HeatCapacityRuntimeState => {
  const modelConfig = mergeModelConfig(config);
  return withMappedSignals({
    ambientPressureKPa: modelConfig.ambientPressureKPa,
    ambientTemperatureK: modelConfig.ambientTemperatureK,
    gasPressureKPaAbs: modelConfig.ambientPressureKPa,
    gasTemperatureK: modelConfig.ambientTemperatureK,
    pressureDeltaKPa: 0,
    simulationTimeS: 0,
    lastUpdateMs: now,
    pressureSignalMvRaw: 0,
    pressureSignalMvDisplayed: 0,
    pressureInitialBiasMv: 0,
    temperatureSignalMv: modelConfig.sensor.temperatureBaseMv,
    pressureZeroOffset: 0,
    pressureZeroAdjusted: false,
    heatCapacityPhase: 'powerOff',
    heatCapacityProcessSamples: {},
    modelConfig,
  });
};

export const powerHeatCapacityRuntimeState = (
  state: HeatCapacityRuntimeState,
  powerOn: boolean,
  now = Date.now(),
): HeatCapacityRuntimeState => {
  if (!powerOn) {
    return withMappedSignals({
      ...state,
      lastUpdateMs: now,
      heatCapacityPhase: 'powerOff',
    });
  }

  return withMappedSignals({
    ...state,
    lastUpdateMs: now,
    heatCapacityPhase: state.pressureZeroAdjusted ? 'zeroed' : 'readyToZero',
  });
};

export const updateHeatCapacityRuntimeZeroOffset = (
  state: HeatCapacityRuntimeState,
  pressureZeroOffset: number,
  now = Date.now(),
): HeatCapacityRuntimeState => {
  return withMappedSignals({
    ...state,
    pressureZeroOffset: roundNumber(pressureZeroOffset, 3),
    pressureZeroAdjusted: Math.abs(pressureZeroOffset) > 0.0001,
    heatCapacityPhase: Math.abs(pressureZeroOffset) > 0.0001 ? 'zeroed' : state.heatCapacityPhase,
    lastUpdateMs: now,
  });
};

export const applyHeatCapacityPumpStroke = (
  state: HeatCapacityRuntimeState,
  controls: HeatCapacityStepControls,
  now = Date.now(),
): HeatCapacityPumpStrokeResult => {
  if (!controls.powerOn) {
    return { accepted: false, reason: 'powerOff', state };
  }
  if (!controls.pumpValveOpen) {
    return { accepted: false, reason: 'pumpValveClosed', state };
  }
  if (controls.stopcockOpen) {
    return { accepted: false, reason: 'stopcockOpen', state };
  }

  const suitable = controls.pumpFrequencyStatus === 'suitable';
  const pressureGainMv = suitable
    ? getHeatCapacityRangeValue(
        HEAT_CAPACITY_VIDEO_PROFILE.pumpPressureIncrementSuitableMvRange,
        getDeterministicFraction(state, now, 3.1),
      )
    : getHeatCapacityRangeValue(
        HEAT_CAPACITY_VIDEO_PROFILE.pumpPressureIncrementTooSlowMvRange,
        getDeterministicFraction(state, now, 8.7),
      );
  const pressureGain = Math.max(
    0,
    pressureGainMv / state.modelConfig.sensor.pressureSensitivityMvPerKPa,
  );
  const temperatureGain = suitable
    ? state.modelConfig.pumpTemperatureGainSuitableK
    : state.modelConfig.pumpTemperatureGainTooSlowK;
  const nextPressureDelta = clampNumber(
    state.pressureDeltaKPa + pressureGain,
    0,
    state.modelConfig.pressureLimitKPa - state.ambientPressureKPa,
  );
  const nextState = withMappedSignals({
    ...state,
    gasPressureKPaAbs: state.ambientPressureKPa + nextPressureDelta,
    gasTemperatureK: state.gasTemperatureK + temperatureGain,
    heatCapacityPhase: 'pumping',
    lastUpdateMs: now,
  });

  return {
    accepted: true,
    reason: 'accepted',
    state: nextState,
  };
};

export const stepHeatCapacityExperiment = (
  state: HeatCapacityRuntimeState,
  controls: HeatCapacityStepControls,
  dtS: number,
  now = Date.now(),
): HeatCapacityRuntimeState => {
  const dt = clampNumber(Number.isFinite(dtS) ? dtS : 0, 0, 2);
  if (!controls.powerOn) {
    return withMappedSignals({
      ...state,
      lastUpdateMs: now,
      heatCapacityPhase: 'powerOff',
    });
  }
  if (controls.demoComplete || state.heatCapacityPhase === 'demoComplete') {
    return {
      ...state,
      lastUpdateMs: now,
      heatCapacityPhase: 'demoComplete',
    };
  }

  let gasPressureKPaAbs = state.gasPressureKPaAbs;
  let gasTemperatureK = state.gasTemperatureK;
  let heatCapacityPhase = getPassivePhase(state, controls);

  const stablePressureDelta = mapPressureMvToDeltaKPa(state.modelConfig.stablePressureMv, state.modelConfig);
  const recoveryPressureDelta = mapPressureMvToDeltaKPa(state.modelConfig.recoveryPressureMv, state.modelConfig);
  const stableTemperatureK = mapTemperatureMvToGasK(state.modelConfig.stableTemperatureMv, state.modelConfig);
  const releaseTemperatureK = mapTemperatureMvToGasK(state.modelConfig.releaseTemperatureMv, state.modelConfig);
  const recoveryTemperatureK = mapTemperatureMvToGasK(state.modelConfig.recoveryTemperatureMv, state.modelConfig);

  if (controls.stopcockOpen && state.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA) {
    const releaseFraction = 1 - Math.exp(-state.modelConfig.releaseRate * dt);
    const releasedDelta = state.pressureDeltaKPa * releaseFraction;
    const nextDelta = Math.max(0, state.pressureDeltaKPa - releasedDelta);
    gasPressureKPaAbs = state.ambientPressureKPa + nextDelta;
    const releasedCooling = Math.min(7.5, releasedDelta * state.modelConfig.releaseCoolingKPerKPa);
    gasTemperatureK = Math.max(
      releaseTemperatureK,
      moveToward(gasTemperatureK - releasedCooling, releaseTemperatureK, state.modelConfig.recoveryHeatFollowRate, dt),
    );
    heatCapacityPhase = 'releasing';
  } else {
    if (state.pressureDeltaKPa > stablePressureDelta) {
      const nextDelta = moveToward(
        state.pressureDeltaKPa,
        stablePressureDelta,
        state.modelConfig.sealedPressureSettleRate,
        dt,
      );
      gasPressureKPaAbs = state.ambientPressureKPa + nextDelta;
    } else if (
      !controls.stopcockOpen &&
      (state.heatCapacityPhase === 'releasing' || state.heatCapacityPhase === 'recovering') &&
      state.pressureDeltaKPa < recoveryPressureDelta
    ) {
      const nextDelta = moveToward(
        state.pressureDeltaKPa,
        recoveryPressureDelta,
        state.modelConfig.recoveryPressureRate,
        dt,
      );
      gasPressureKPaAbs = state.ambientPressureKPa + nextDelta;
    }

    if (state.heatCapacityPhase === 'releasing' || state.heatCapacityPhase === 'recovering') {
      gasTemperatureK = moveToward(
        gasTemperatureK,
        recoveryTemperatureK,
        state.modelConfig.recoveryHeatFollowRate,
        dt,
      );
    } else if (state.pressureDeltaKPa > 0.35) {
      gasTemperatureK = moveToward(
        gasTemperatureK,
        stableTemperatureK,
        state.modelConfig.pumpHeatFollowRate,
        dt,
      );
    } else {
      gasTemperatureK = moveToward(
        gasTemperatureK,
        state.ambientTemperatureK,
        state.modelConfig.thermalRelaxRate,
        dt,
      );
    }
    heatCapacityPhase = getPassivePhase({
      ...state,
      gasPressureKPaAbs,
      pressureDeltaKPa: Math.max(0, gasPressureKPaAbs - state.ambientPressureKPa),
      gasTemperatureK,
    }, controls);
  }

  const nextState = withMappedSignals({
    ...state,
    gasPressureKPaAbs,
    gasTemperatureK,
    simulationTimeS: state.simulationTimeS + dt,
    lastUpdateMs: now,
    heatCapacityPhase,
  });

  return nextState;
};

export const captureHeatCapacityProcessSample = (
  state: HeatCapacityRuntimeState,
  key: HeatCapacityProcessSampleKey,
  controls: Partial<Pick<HeatCapacityStepControls, 'pumpFrequency' | 'pumpValveOpen' | 'stopcockOpen'>> = {},
): HeatCapacityRuntimeState => {
  const point: HeatCapacityProcessSamplePoint = {
    timeS: roundNumber(state.simulationTimeS, 3),
    phase: state.heatCapacityPhase,
    temperatureSignalMv: roundNumber(state.temperatureSignalMv, 3),
    pressureSignalMv: roundNumber(state.pressureSignalMvDisplayed, 3),
    gasTemperatureK: roundNumber(state.gasTemperatureK, 3),
    gasPressureKPaAbs: roundNumber(state.gasPressureKPaAbs, 3),
    pressureDeltaKPa: roundNumber(state.pressureDeltaKPa, 3),
    pumpFrequency: roundNumber(controls.pumpFrequency ?? 0, 3),
    pumpValveOpen: controls.pumpValveOpen ?? false,
    stopcockOpen: controls.stopcockOpen ?? false,
  };

  return {
    ...state,
    heatCapacityProcessSamples: {
      ...state.heatCapacityProcessSamples,
      [key]: point,
    },
  };
};
