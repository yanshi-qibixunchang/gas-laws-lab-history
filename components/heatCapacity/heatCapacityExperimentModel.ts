import {
  mapHeatCapacitySignals,
  type HeatCapacitySensorMappingConfig,
} from './heatCapacitySensorMapping.ts';

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

export interface HeatCapacityTracePoint {
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
  | 'afterPumpSample'
  | 'beforeReleaseSample'
  | 'afterReleaseSample'
  | 'recoverySample';

export type HeatCapacityProcessSamples = Partial<Record<HeatCapacityProcessSampleKey, HeatCapacityTracePoint>>;

export interface HeatCapacityModelConfig {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  pressureLimitKPa: number;
  pumpPressureGainTooSlowKPa: number;
  pumpPressureGainSuitableKPa: number;
  pumpTemperatureGainTooSlowK: number;
  pumpTemperatureGainSuitableK: number;
  thermalRelaxRate: number;
  releaseRate: number;
  releaseCoolingKPerKPa: number;
  maxTracePoints: number;
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
  temperatureSignalMv: number;
  pressureZeroOffset: number;
  pressureZeroAdjusted: boolean;
  heatCapacityPhase: HeatCapacityRuntimePhase;
  heatCapacityTrace: HeatCapacityTracePoint[];
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

export const DEFAULT_HEAT_CAPACITY_MODEL_CONFIG: HeatCapacityModelConfig = {
  ambientPressureKPa: 101.33,
  ambientTemperatureK: 298.15,
  pressureLimitKPa: 500,
  pumpPressureGainTooSlowKPa: 1.2,
  pumpPressureGainSuitableKPa: 3.8,
  pumpTemperatureGainTooSlowK: 0.22,
  pumpTemperatureGainSuitableK: 0.82,
  thermalRelaxRate: 0.72,
  releaseRate: 6.5,
  releaseCoolingKPerKPa: 0.24,
  maxTracePoints: 720,
  sensor: {
    pressureSensitivityMvPerKPa: 20,
    temperatureBaseMv: 1500,
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

const appendTracePoint = (
  state: HeatCapacityRuntimeState,
  controls: Pick<HeatCapacityStepControls, 'pumpFrequency' | 'pumpValveOpen' | 'stopcockOpen'>,
): HeatCapacityTracePoint[] => {
  if (state.heatCapacityPhase === 'powerOff') return state.heatCapacityTrace;
  const point: HeatCapacityTracePoint = {
    timeS: roundNumber(state.simulationTimeS, 3),
    phase: state.heatCapacityPhase,
    temperatureSignalMv: roundNumber(state.temperatureSignalMv, 3),
    pressureSignalMv: roundNumber(state.pressureSignalMvDisplayed, 3),
    gasTemperatureK: roundNumber(state.gasTemperatureK, 3),
    gasPressureKPaAbs: roundNumber(state.gasPressureKPaAbs, 3),
    pressureDeltaKPa: roundNumber(state.pressureDeltaKPa, 3),
    pumpFrequency: roundNumber(controls.pumpFrequency, 3),
    pumpValveOpen: controls.pumpValveOpen,
    stopcockOpen: controls.stopcockOpen,
  };
  const nextTrace = [...state.heatCapacityTrace, point];
  return nextTrace.slice(-state.modelConfig.maxTracePoints);
};

const withMappedSignals = (
  state: HeatCapacityRuntimeState,
): HeatCapacityRuntimeState => {
  const pressureDeltaKPa = roundNumber(Math.max(0, state.gasPressureKPaAbs - state.ambientPressureKPa), 4);
  const signals = mapHeatCapacitySignals({
    ambientTemperatureK: state.ambientTemperatureK,
    gasTemperatureK: state.gasTemperatureK,
    pressureDeltaKPa,
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
  if (controls.stopcockOpen && state.pressureDeltaKPa > 0.02) return 'releasing';
  if (state.pressureZeroAdjusted && controls.pumpValveOpen && state.pressureDeltaKPa <= 0.02) return 'readyToPump';
  if (state.pressureZeroAdjusted && state.pressureDeltaKPa <= 0.02) return 'zeroed';
  if (state.pressureDeltaKPa > 0.02) {
    return Math.abs(state.gasTemperatureK - state.ambientTemperatureK) > 0.08
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
    temperatureSignalMv: modelConfig.sensor.temperatureBaseMv,
    pressureZeroOffset: 0,
    pressureZeroAdjusted: false,
    heatCapacityPhase: 'powerOff',
    heatCapacityTrace: [],
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

  const nextState = withMappedSignals({
    ...state,
    lastUpdateMs: now,
    heatCapacityPhase: state.pressureZeroAdjusted ? 'zeroed' : 'readyToZero',
  });

  return {
    ...nextState,
    heatCapacityTrace: appendTracePoint(nextState, {
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    }),
  };
};

export const updateHeatCapacityRuntimeZeroOffset = (
  state: HeatCapacityRuntimeState,
  pressureZeroOffset: number,
  now = Date.now(),
): HeatCapacityRuntimeState => {
  const nextState = withMappedSignals({
    ...state,
    pressureZeroOffset: roundNumber(pressureZeroOffset, 3),
    pressureZeroAdjusted: Math.abs(pressureZeroOffset) > 0.0001,
    heatCapacityPhase: Math.abs(pressureZeroOffset) > 0.0001 ? 'zeroed' : state.heatCapacityPhase,
    lastUpdateMs: now,
  });
  return {
    ...nextState,
    heatCapacityTrace: appendTracePoint(nextState, {
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    }),
  };
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
  const pressureGain = suitable
    ? state.modelConfig.pumpPressureGainSuitableKPa
    : state.modelConfig.pumpPressureGainTooSlowKPa;
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
    state: {
      ...nextState,
      heatCapacityTrace: appendTracePoint(nextState, controls),
    },
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

  if (controls.stopcockOpen && state.pressureDeltaKPa > 0.02) {
    const releaseFraction = 1 - Math.exp(-state.modelConfig.releaseRate * dt);
    const releasedDelta = state.pressureDeltaKPa * releaseFraction;
    const nextDelta = Math.max(0, state.pressureDeltaKPa - releasedDelta);
    gasPressureKPaAbs = state.ambientPressureKPa + nextDelta;
    gasTemperatureK -= Math.min(3.5, releasedDelta * state.modelConfig.releaseCoolingKPerKPa);
    heatCapacityPhase = 'releasing';
  } else {
    const thermalFraction = 1 - Math.exp(-state.modelConfig.thermalRelaxRate * dt);
    gasTemperatureK += (state.ambientTemperatureK - gasTemperatureK) * thermalFraction;
    heatCapacityPhase = getPassivePhase({
      ...state,
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

  return {
    ...nextState,
    heatCapacityTrace: appendTracePoint(nextState, controls),
  };
};

export const captureHeatCapacityProcessSample = (
  state: HeatCapacityRuntimeState,
  key: HeatCapacityProcessSampleKey,
  controls: Partial<Pick<HeatCapacityStepControls, 'pumpFrequency' | 'pumpValveOpen' | 'stopcockOpen'>> = {},
): HeatCapacityRuntimeState => {
  const point: HeatCapacityTracePoint = {
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
