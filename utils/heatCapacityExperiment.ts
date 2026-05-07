export const HARD_SPHERE_GAMMA = 5 / 3;

export type HeatCapacityPhase =
  | 'equalizing'
  | 'pumping'
  | 'stabilizingP1'
  | 'recordP1'
  | 'releasing'
  | 'recovering'
  | 'recordP2'
  | 'completed';

export type HeatCapacityMode = 'guided' | 'manual-entry';

export interface HeatCapacityRecordedPoint {
  p0: number | null;
  p1: number | null;
  p2: number | null;
}

export interface HeatCapacityTrial {
  p0: number;
  p1: number;
  p2: number;
  timestamp: number;
}

export interface HeatCapacityResult {
  gamma: number;
  theoreticalGamma: number;
  relativeErrorPercent: number;
}

export interface HeatCapacitySummary {
  validCount: number;
  meanGamma: number | null;
  theoreticalGamma: number;
  relativeErrorPercent: number | null;
}

export type HeatCapacityInstrumentPartId =
  | 'Vessel'
  | 'Valve_C1'
  | 'Valve_C2'
  | 'Pump_Handle'
  | 'Pressure_Gauge_Needle'
  | 'Temperature_Display'
  | 'Hit_C1'
  | 'Hit_C2'
  | 'Hit_Pump';

export interface HeatCapacityInstrumentState {
  c1Open: boolean;
  c2Open: boolean;
  pumpProgress: number;
  pressure: number;
  temperature: number;
  phase: HeatCapacityPhase;
  highlightedPart: HeatCapacityInstrumentPartId | null;
}

export interface HeatCapacityState {
  phase: HeatCapacityPhase;
  mode: HeatCapacityMode;
  ambientPressure: number;
  ambientTemperature: number;
  pressure: number;
  temperature: number;
  particleCount: number;
  vesselLength: number;
  recorded: HeatCapacityRecordedPoint;
  trials: HeatCapacityTrial[];
  result: HeatCapacityResult | null;
  instrument: HeatCapacityInstrumentState;
  pendingP2: number | null;
  lastError: string | null;
}

export type HeatCapacityAction =
  | { type: 'recordP0' }
  | { type: 'pump'; strokes: number }
  | { type: 'stabilizeP1' }
  | { type: 'recordP1' }
  | { type: 'release'; durationMs: number; closeDelayMs?: number }
  | { type: 'recover' }
  | { type: 'recordP2' }
  | { type: 'reset' };

export interface HeatCapacityExperimentOptions {
  ambientPressure?: number;
  ambientTemperature?: number;
  particleCount?: number;
  vesselLength?: number;
  mode?: HeatCapacityMode;
}

const DEFAULT_AMBIENT_PRESSURE = 101.325;
const DEFAULT_AMBIENT_TEMPERATURE = 1;
const DEFAULT_PARTICLE_COUNT = 128;
const DEFAULT_VESSEL_LENGTH = 12;
const IDEAL_RELEASE_DURATION_MS = 420;
const PUMP_PRESSURE_STEP = 5.2;
const PUMP_TEMPERATURE_STEP = 0.018;

const sanitizePositiveNumber = (value: number | undefined, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

const sanitizePositiveInteger = (value: number | undefined, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.round(value));
};

const roundMetric = (value: number, decimals = 6) => (
  Number(value.toFixed(decimals))
);

const createInstrumentState = (
  phase: HeatCapacityPhase,
  pressure: number,
  temperature: number,
  overrides: Partial<HeatCapacityInstrumentState> = {},
): HeatCapacityInstrumentState => ({
  c1Open: false,
  c2Open: phase === 'equalizing',
  pumpProgress: 0,
  pressure,
  temperature,
  phase,
  highlightedPart: phase === 'equalizing' ? 'Valve_C2' : null,
  ...overrides,
});

const syncInstrument = (
  state: HeatCapacityState,
  overrides: Partial<HeatCapacityInstrumentState> = {},
): HeatCapacityInstrumentState => createInstrumentState(state.phase, state.pressure, state.temperature, {
  ...state.instrument,
  pressure: state.pressure,
  temperature: state.temperature,
  phase: state.phase,
  ...overrides,
});

const withError = (state: HeatCapacityState, lastError: string): HeatCapacityState => ({
  ...state,
  lastError,
  instrument: syncInstrument(state),
});

const withState = (
  state: HeatCapacityState,
  patch: Partial<Omit<HeatCapacityState, 'instrument'>> & {
    instrument?: Partial<HeatCapacityInstrumentState>;
  },
): HeatCapacityState => {
  const next = {
    ...state,
    ...patch,
    lastError: patch.lastError ?? null,
  } as HeatCapacityState;
  return {
    ...next,
    instrument: syncInstrument(next, patch.instrument),
  };
};

export const calculateGamma = (p0: number, p1: number, p2: number): number | null => {
  if (
    !Number.isFinite(p0) ||
    !Number.isFinite(p1) ||
    !Number.isFinite(p2) ||
    p0 <= 0 ||
    p1 <= p0 ||
    p2 <= p0 ||
    p2 >= p1
  ) {
    return null;
  }

  const denominator = Math.log(p1 / p2);
  if (Math.abs(denominator) < Number.EPSILON) return null;
  return Math.log(p1 / p0) / denominator;
};

export const calculateRelativeErrorPercent = (
  measured: number,
  theoretical = HARD_SPHERE_GAMMA,
): number | null => {
  if (!Number.isFinite(measured) || !Number.isFinite(theoretical) || theoretical === 0) return null;
  return Math.abs((measured - theoretical) / theoretical) * 100;
};

export const calculateGammaSummary = (
  trials: HeatCapacityTrial[],
  theoreticalGamma = HARD_SPHERE_GAMMA,
): HeatCapacitySummary => {
  const gammas = trials
    .map((trial) => calculateGamma(trial.p0, trial.p1, trial.p2))
    .filter((gamma): gamma is number => gamma !== null);

  if (gammas.length === 0) {
    return {
      validCount: 0,
      meanGamma: null,
      theoreticalGamma,
      relativeErrorPercent: null,
    };
  }

  const meanGamma = gammas.reduce((sum, gamma) => sum + gamma, 0) / gammas.length;
  return {
    validCount: gammas.length,
    meanGamma,
    theoreticalGamma,
    relativeErrorPercent: calculateRelativeErrorPercent(meanGamma, theoreticalGamma),
  };
};

export const createHeatCapacityExperiment = (
  options: HeatCapacityExperimentOptions = {},
): HeatCapacityState => {
  const ambientPressure = sanitizePositiveNumber(options.ambientPressure, DEFAULT_AMBIENT_PRESSURE);
  const ambientTemperature = sanitizePositiveNumber(options.ambientTemperature, DEFAULT_AMBIENT_TEMPERATURE);
  const phase: HeatCapacityPhase = 'equalizing';

  return {
    phase,
    mode: options.mode ?? 'guided',
    ambientPressure,
    ambientTemperature,
    pressure: ambientPressure,
    temperature: ambientTemperature,
    particleCount: sanitizePositiveInteger(options.particleCount, DEFAULT_PARTICLE_COUNT),
    vesselLength: sanitizePositiveNumber(options.vesselLength, DEFAULT_VESSEL_LENGTH),
    recorded: {
      p0: null,
      p1: null,
      p2: null,
    },
    trials: [],
    result: null,
    pendingP2: null,
    lastError: null,
    instrument: createInstrumentState(phase, ambientPressure, ambientTemperature),
  };
};

const getReleasePenalty = (durationMs: number, closeDelayMs: number) => {
  const releaseDeviation = Math.abs(durationMs - IDEAL_RELEASE_DURATION_MS) / IDEAL_RELEASE_DURATION_MS;
  const slowReleasePenalty = Math.min(0.16, releaseDeviation * 0.045);
  const closeDelayPenalty = Math.min(0.12, Math.max(0, closeDelayMs) * 0.00018);
  return slowReleasePenalty + closeDelayPenalty;
};

const getIdealRecoveredPressure = (p0: number, p1: number) => (
  p1 / Math.pow(p1 / p0, 1 / HARD_SPHERE_GAMMA)
);

const clampRecoveredPressure = (p0: number, p1: number, candidate: number) => {
  const epsilon = Math.max(0.001, Math.abs(p1 - p0) * 1e-6);
  if (p1 <= p0 + epsilon * 2) return (p0 + p1) / 2;
  return Math.min(p1 - epsilon, Math.max(p0 + epsilon, candidate));
};

const createResult = (p0: number, p1: number, p2: number): HeatCapacityResult | null => {
  const gamma = calculateGamma(p0, p1, p2);
  if (gamma === null) return null;
  return {
    gamma,
    theoreticalGamma: HARD_SPHERE_GAMMA,
    relativeErrorPercent: calculateRelativeErrorPercent(gamma) ?? 0,
  };
};

export const applyHeatCapacityAction = (
  state: HeatCapacityState,
  action: HeatCapacityAction,
): HeatCapacityState => {
  if (action.type === 'reset') {
    return {
      ...createHeatCapacityExperiment({
        ambientPressure: state.ambientPressure,
        ambientTemperature: state.ambientTemperature,
        particleCount: state.particleCount,
        vesselLength: state.vesselLength,
        mode: state.mode,
      }),
      trials: [...state.trials],
    };
  }

  if (action.type === 'recordP0') {
    if (state.phase !== 'equalizing') {
      return withError(state, 'p0 can only be recorded while the vessel is equalized with the environment.');
    }
    return withState(state, {
      phase: 'pumping',
      pressure: state.ambientPressure,
      temperature: state.ambientTemperature,
      recorded: { ...state.recorded, p0: roundMetric(state.ambientPressure) },
      instrument: {
        c1Open: true,
        c2Open: false,
        highlightedPart: 'Hit_Pump',
      },
    });
  }

  if (action.type === 'pump') {
    if (state.phase !== 'pumping') {
      return withError(state, 'The pump can only be used after p0 is recorded and C2 is closed.');
    }
    const strokes = Math.max(0, Math.min(12, Math.round(action.strokes)));
    const pressure = state.pressure + strokes * PUMP_PRESSURE_STEP;
    const temperature = state.temperature + strokes * PUMP_TEMPERATURE_STEP;
    return withState(state, {
      pressure: roundMetric(pressure),
      temperature: roundMetric(temperature),
      instrument: {
        c1Open: true,
        c2Open: false,
        pumpProgress: Math.min(1, strokes / 8),
        highlightedPart: 'Pump_Handle',
      },
    });
  }

  if (action.type === 'stabilizeP1') {
    if (state.phase === 'stabilizingP1') {
      return withState(state, {
        phase: 'recordP1',
        temperature: state.ambientTemperature,
        instrument: {
          c1Open: false,
          c2Open: false,
          pumpProgress: 0,
          highlightedPart: 'Pressure_Gauge_Needle',
        },
      });
    }
    if (state.phase !== 'pumping' || state.pressure <= state.ambientPressure) {
      return withError(state, 'The gas must be pressurized before waiting for p1 stabilization.');
    }
    return withState(state, {
      phase: 'stabilizingP1',
      temperature: state.ambientTemperature,
      instrument: {
        c1Open: false,
        c2Open: false,
        pumpProgress: 0,
        highlightedPart: 'Pressure_Gauge_Needle',
      },
    });
  }

  if (action.type === 'recordP1') {
    if (state.phase !== 'recordP1') {
      if (state.phase === 'stabilizingP1') {
        return withError(state, 'p1 can only be recorded after the high-pressure gas has stabilized.');
      }
      return withError(state, 'p1 cannot be recorded before the gas is pressurized and stable.');
    }
    return withState(state, {
      phase: 'releasing',
      recorded: { ...state.recorded, p1: roundMetric(state.pressure) },
      instrument: {
        c1Open: false,
        c2Open: false,
        highlightedPart: 'Valve_C2',
      },
    });
  }

  if (action.type === 'release') {
    if (state.phase !== 'releasing' || state.recorded.p0 === null || state.recorded.p1 === null) {
      return withError(state, 'C2 can only release gas after p1 has been recorded.');
    }
    const closeDelayMs = action.closeDelayMs ?? 0;
    const idealP2 = getIdealRecoveredPressure(state.recorded.p0, state.recorded.p1);
    const penalty = getReleasePenalty(action.durationMs, closeDelayMs);
    const pendingP2 = clampRecoveredPressure(
      state.recorded.p0,
      state.recorded.p1,
      idealP2 * (1 - penalty),
    );
    const adiabaticTemperature = Math.max(
      state.ambientTemperature * 0.72,
      state.ambientTemperature * (state.recorded.p0 / state.recorded.p1) ** ((HARD_SPHERE_GAMMA - 1) / HARD_SPHERE_GAMMA),
    );

    return withState(state, {
      phase: 'recovering',
      pressure: roundMetric(state.recorded.p0),
      temperature: roundMetric(adiabaticTemperature),
      pendingP2: roundMetric(pendingP2),
      instrument: {
        c1Open: false,
        c2Open: false,
        highlightedPart: 'Temperature_Display',
      },
    });
  }

  if (action.type === 'recover') {
    if (state.phase !== 'recovering' || state.pendingP2 === null) {
      return withError(state, 'The gas can only recover after a release has been completed.');
    }
    return withState(state, {
      phase: 'recordP2',
      pressure: state.pendingP2,
      temperature: state.ambientTemperature,
      instrument: {
        c1Open: false,
        c2Open: false,
        highlightedPart: 'Pressure_Gauge_Needle',
      },
    });
  }

  if (action.type === 'recordP2') {
    if (
      state.phase !== 'recordP2' ||
      state.recorded.p0 === null ||
      state.recorded.p1 === null
    ) {
      return withError(state, 'p2 cannot be recorded before thermal recovery is complete.');
    }
    const p2 = roundMetric(state.pressure);
    const result = createResult(state.recorded.p0, state.recorded.p1, p2);
    if (!result) return withError(state, 'The recorded p0, p1, and p2 do not produce a valid gamma value.');

    return withState(state, {
      phase: 'completed',
      recorded: { ...state.recorded, p2 },
      result,
      trials: [
        ...state.trials,
        {
          p0: state.recorded.p0,
          p1: state.recorded.p1,
          p2,
          timestamp: Date.now(),
        },
      ],
      instrument: {
        c1Open: false,
        c2Open: false,
        highlightedPart: null,
      },
    });
  }

  return state;
};
