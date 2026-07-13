import {
  DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG,
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
  HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
  mapHeatCapacitySignals,
  type HeatCapacitySensorMappingConfig,
} from './heatCapacitySensorMapping.ts';
import {
  stepHeatCapacityTemperatureSensor,
} from './heatCapacityTemperatureSensorModel.ts';
import {
  HEAT_CAPACITY_VIDEO_PROFILE,
  getHeatCapacityRangeMidpoint,
  getHeatCapacityRangeValue,
} from './heatCapacityDisplayResponse.ts';
import type {
  HeatCapacityProcessSampleKey,
  HeatCapacityProcessSamplePoint,
  HeatCapacityProcessSamples,
  HeatCapacityRuntimePhase,
} from './heatCapacityProcessTypes.ts';
const DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS = {
  atmosphericPressureKPa: 101.3,
  theoreticalGamma: 1.4,
} as const;

export type HeatCapacityPumpFrequencyStatus = 'idle' | 'tooSlow' | 'suitable';

export type {
  HeatCapacityProcessSampleKey,
  HeatCapacityProcessSamplePoint,
  HeatCapacityProcessSamples,
  HeatCapacityRuntimePhase,
};

// Scripted Demo/Guide runtime config. Profile-derived target fields here keep
// teaching behavior stable and must not be used as Free Mode physical truth.
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
  sensorTemperatureK: number;
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
  releaseRecoveryTargetDeltaKPa: number | null;
  modelConfig: HeatCapacityModelConfig;
}

export interface HeatCapacityStepControls {
  powerOn: boolean;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
  pumpFrequency: number;
  pumpFrequencyStatus: HeatCapacityPumpFrequencyStatus;
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
    ...DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG,
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

const getOpenStopcockHeatFollowRate = (
  config: HeatCapacityModelConfig,
) => config.recoveryHeatFollowRate / Math.max(1.001, config.theoreticalGamma);

const getReleaseRecoveryBaseTargetDelta = ({
  pressureDeltaKPa,
  stablePressureDelta,
  recoveryPressureDelta,
}: {
  pressureDeltaKPa: number;
  stablePressureDelta: number;
  recoveryPressureDelta: number;
}) => {
  const pressureFraction = clampNumber(
    pressureDeltaKPa / Math.max(HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, stablePressureDelta),
    0,
    1,
  );
  return recoveryPressureDelta * pressureFraction;
};

const mergeModelConfig = (
  config?: Partial<HeatCapacityModelConfig>,
): HeatCapacityModelConfig => ({
  ...DEFAULT_HEAT_CAPACITY_MODEL_CONFIG,
  ...config,
  sensor: {
    ...DEFAULT_HEAT_CAPACITY_MODEL_CONFIG.sensor,
    ...config?.sensor,
    // Demo keeps its teaching temperature trajectory, but it is rendered by
    // the same virtual-instrument calibration as Guide and Free modes.
    temperatureBaseMv: HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
    temperatureSensitivityMvPerK: HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
  },
});

const normalizeRuntimeTemperatureState = (
  state: HeatCapacityRuntimeState,
): HeatCapacityRuntimeState => {
  const modelConfig = mergeModelConfig(state.modelConfig);
  const gasTemperatureK = Number.isFinite(state.gasTemperatureK) && state.gasTemperatureK > 0
    ? state.gasTemperatureK
    : state.ambientTemperatureK;
  const sensorTemperatureK = Number.isFinite(state.sensorTemperatureK) && state.sensorTemperatureK > 0
    ? state.sensorTemperatureK
    : gasTemperatureK;
  return {
    ...state,
    gasTemperatureK,
    sensorTemperatureK,
    modelConfig,
  };
};

const withMappedSignals = (
  state: HeatCapacityRuntimeState,
): HeatCapacityRuntimeState => {
  const normalizedState = normalizeRuntimeTemperatureState(state);
  const pressureDeltaKPa = roundNumber(Math.max(
    0,
    normalizedState.gasPressureKPaAbs - normalizedState.ambientPressureKPa,
  ), 4);
  const signals = mapHeatCapacitySignals({
    ambientTemperatureK: normalizedState.ambientTemperatureK,
    gasTemperatureK: normalizedState.sensorTemperatureK,
    pressureDeltaKPa,
    pressureInitialBiasMv: normalizedState.pressureInitialBiasMv,
    pressureZeroOffset: normalizedState.pressureZeroOffset,
    config: normalizedState.modelConfig.sensor,
  });

  return {
    ...normalizedState,
    gasPressureKPaAbs: roundNumber(normalizedState.gasPressureKPaAbs, 4),
    gasTemperatureK: roundNumber(normalizedState.gasTemperatureK, 4),
    sensorTemperatureK: roundNumber(normalizedState.sensorTemperatureK, 6),
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
  const phase = state.heatCapacityPhase as HeatCapacityRuntimePhase;
  if (phase === 'releasing' || phase === 'recovering') {
    return controls.stopcockOpen && state.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA
      ? 'releasing'
      : 'recovering';
  }
  if (controls.stopcockOpen && state.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA) return 'releasing';
  if (state.pressureZeroAdjusted && controls.pumpValveOpen && state.pressureDeltaKPa <= 0.02) return 'readyToPump';
  if (state.pressureZeroAdjusted && state.pressureDeltaKPa <= 0.02) return 'zeroed';
  if (state.pressureDeltaKPa > 0.02) return 'sealedStabilizing';
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
    sensorTemperatureK: modelConfig.ambientTemperatureK,
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
    releaseRecoveryTargetDeltaKPa: null,
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
  state = withMappedSignals(state);
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
    releaseRecoveryTargetDeltaKPa: null,
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
  state = normalizeRuntimeTemperatureState(state);
  const dt = clampNumber(Number.isFinite(dtS) ? dtS : 0, 0, 2);
  if (!controls.powerOn) {
    return withMappedSignals({
      ...state,
      lastUpdateMs: now,
      heatCapacityPhase: 'powerOff',
    });
  }
  let gasPressureKPaAbs = state.gasPressureKPaAbs;
  let gasTemperatureK = state.gasTemperatureK;
  let heatCapacityPhase = getPassivePhase(state, controls);
  let releaseRecoveryTargetDeltaKPa = state.releaseRecoveryTargetDeltaKPa;

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
    const releaseBaseTargetDelta = getReleaseRecoveryBaseTargetDelta({
      pressureDeltaKPa: state.pressureDeltaKPa,
      stablePressureDelta,
      recoveryPressureDelta,
    });
    releaseRecoveryTargetDeltaKPa = Math.max(
      releaseRecoveryTargetDeltaKPa ?? 0,
      releaseBaseTargetDelta,
    );
    heatCapacityPhase = 'releasing';
  } else {
    const recoveryPressureTargetDelta = clampNumber(
      releaseRecoveryTargetDeltaKPa ?? recoveryPressureDelta,
      0,
      recoveryPressureDelta,
    );
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
      state.pressureDeltaKPa < recoveryPressureTargetDelta
    ) {
      const nextDelta = moveToward(
        state.pressureDeltaKPa,
        recoveryPressureTargetDelta,
        state.modelConfig.recoveryPressureRate,
        dt,
      );
      gasPressureKPaAbs = state.ambientPressureKPa + nextDelta;
    }

    if (state.heatCapacityPhase === 'releasing' || state.heatCapacityPhase === 'recovering') {
      gasTemperatureK = moveToward(
        gasTemperatureK,
        recoveryTemperatureK,
        controls.stopcockOpen
          ? getOpenStopcockHeatFollowRate(state.modelConfig)
          : state.modelConfig.recoveryHeatFollowRate,
        dt,
      );
      if (controls.stopcockOpen) {
        releaseRecoveryTargetDeltaKPa = releaseRecoveryTargetDeltaKPa === null
          ? null
          : moveToward(
              releaseRecoveryTargetDeltaKPa,
              0,
              getOpenStopcockHeatFollowRate(state.modelConfig),
              dt,
            );
      }
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
      releaseRecoveryTargetDeltaKPa = null;
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
    sensorTemperatureK: stepHeatCapacityTemperatureSensor(
      { temperatureK: state.sensorTemperatureK },
      { gasTemperatureK, dtS: dt },
    ).temperatureK,
    simulationTimeS: state.simulationTimeS + dt,
    lastUpdateMs: now,
    heatCapacityPhase,
    releaseRecoveryTargetDeltaKPa,
  });

  return nextState;
};

export const captureHeatCapacityProcessSample = (
  state: HeatCapacityRuntimeState,
  key: HeatCapacityProcessSampleKey,
  controls: Partial<Pick<HeatCapacityStepControls, 'pumpFrequency' | 'pumpValveOpen' | 'stopcockOpen'>> = {},
): HeatCapacityRuntimeState => {
  state = withMappedSignals(state);
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
