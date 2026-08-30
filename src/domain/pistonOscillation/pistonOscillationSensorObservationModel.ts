export const PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION =
  'piston-oscillation-sensor-observation-v1' as const;
export const PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION =
  'piston-oscillation-sensor-observation-lag-drift-v2' as const;
export const PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION =
  'piston-oscillation-sensor-observation-correlated-fluctuation-v3' as const;
export const PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_CONFIG_VERSION =
  'piston-oscillation-sensor-candidate-config-v1' as const;
export const PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG_VERSION =
  'piston-oscillation-sensor-candidate-config-v2' as const;
export const PISTON_OSCILLATION_CORRELATED_FLUCTUATION_MODEL_VERSION =
  'two-timescale-stationary-correlated-residual-v1' as const;

export const PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ = 1_000 as const;
export const PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA = 0.01 as const;
export const PISTON_OSCILLATION_SENSOR_TIME_DECIMAL_PLACES = 3 as const;
export const PISTON_OSCILLATION_SENSOR_PRESSURE_DECIMAL_PLACES = 2 as const;
export const PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION =
  'truncate-toward-zero' as const;

export interface PistonOscillationPhysicalPressureSample {
  pressurePa: number;
}

export interface PistonOscillationObservedSample {
  sampleIndex: number;
  timeS: number;
  absolutePressureKpa: number;
}

export interface PistonOscillationDynamicSensorConfig {
  modelVersion: typeof PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG_VERSION;
  responseTimeConstantS: number;
  driftRatePaPerS: number;
  driftWanderAmplitudePa: number;
  driftWanderPeriodS: number;
  correlatedFluctuationModelVersion:
    typeof PISTON_OSCILLATION_CORRELATED_FLUCTUATION_MODEL_VERSION;
  fastFluctuationTimeConstantS: number;
  fastFluctuationStandardDeviationPa: number;
  slowFluctuationTimeConstantS: number;
  slowFluctuationStandardDeviationPa: number;
  noiseStandardDeviationPa: number;
  seed: number;
  provenance: 'educational-candidate';
}

export interface PistonOscillationLegacyDynamicSensorConfig {
  modelVersion: typeof PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_CONFIG_VERSION;
  responseTimeConstantS: number;
  driftRatePaPerS: number;
  driftWanderAmplitudePa: number;
  driftWanderPeriodS: number;
  noiseStandardDeviationPa: number;
  seed: number;
  provenance: 'educational-candidate';
}

export type PistonOscillationStoredDynamicSensorConfig =
  | PistonOscillationDynamicSensorConfig
  | PistonOscillationLegacyDynamicSensorConfig;

export interface PistonOscillationDynamicSensorState {
  modelVersion: typeof PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION;
  filteredPressurePa: number;
  fastFluctuationPa: number;
  slowFluctuationPa: number;
  sessionElapsedS: number;
  nextNoiseSampleIndex: number;
}

export interface PistonOscillationLegacyDynamicSensorState {
  modelVersion:
    typeof PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION;
  filteredPressurePa: number;
  sessionElapsedS: number;
  nextNoiseSampleIndex: number;
}

export type PistonOscillationStoredDynamicSensorState =
  | PistonOscillationDynamicSensorState
  | PistonOscillationLegacyDynamicSensorState;

export const DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG:
PistonOscillationDynamicSensorConfig = Object.freeze({
  modelVersion: PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG_VERSION,
  responseTimeConstantS: 0.003,
  driftRatePaPerS: 0.2,
  driftWanderAmplitudePa: 8,
  driftWanderPeriodS: 180,
  correlatedFluctuationModelVersion:
    PISTON_OSCILLATION_CORRELATED_FLUCTUATION_MODEL_VERSION,
  fastFluctuationTimeConstantS: 0.002,
  fastFluctuationStandardDeviationPa: 7,
  slowFluctuationTimeConstantS: 0.018,
  slowFluctuationStandardDeviationPa: 9,
  noiseStandardDeviationPa: 2,
  seed: 1_597_334_677,
  provenance: 'educational-candidate',
});

export interface PistonOscillationSensorObservationSeries {
  modelVersion:
    | typeof PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION
    | typeof PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION;
  sampleRateHz: number;
  pressureResolutionKpa: typeof PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA;
  pressureQuantization: typeof PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION;
  samples: PistonOscillationObservedSample[];
  dynamicConfig?: PistonOscillationDynamicSensorConfig | null;
  initialDynamicState?: PistonOscillationDynamicSensorState | null;
  finalDynamicState?: PistonOscillationDynamicSensorState | null;
}

const assertPositiveSafeInteger = (name: string, value: number) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer.`);
  }
  return value;
};

const assertNonNegativeSafeInteger = (name: string, value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer.`);
  }
  return value;
};

const assertFinitePositive = (name: string, value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and greater than zero.`);
  }
  return value;
};

const assertFiniteNonNegative = (name: string, value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and non-negative.`);
  }
  return value;
};

const assertFinite = (name: string, value: number) => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
  return value;
};

export const normalizePistonOscillationDynamicSensorConfig = (
  input: Partial<PistonOscillationDynamicSensorConfig> = {},
): PistonOscillationDynamicSensorConfig => {
  const defaults = DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG;
  const seed = input.seed ?? defaults.seed;
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError('seed must be a safe integer.');
  }
  return {
    modelVersion: PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG_VERSION,
    responseTimeConstantS: assertFinitePositive(
      'responseTimeConstantS',
      input.responseTimeConstantS ?? defaults.responseTimeConstantS,
    ),
    driftRatePaPerS: assertFinite(
      'driftRatePaPerS',
      input.driftRatePaPerS ?? defaults.driftRatePaPerS,
    ),
    driftWanderAmplitudePa: assertFiniteNonNegative(
      'driftWanderAmplitudePa',
      input.driftWanderAmplitudePa ?? defaults.driftWanderAmplitudePa,
    ),
    driftWanderPeriodS: assertFinitePositive(
      'driftWanderPeriodS',
      input.driftWanderPeriodS ?? defaults.driftWanderPeriodS,
    ),
    correlatedFluctuationModelVersion:
      PISTON_OSCILLATION_CORRELATED_FLUCTUATION_MODEL_VERSION,
    fastFluctuationTimeConstantS: assertFinitePositive(
      'fastFluctuationTimeConstantS',
      input.fastFluctuationTimeConstantS ?? defaults.fastFluctuationTimeConstantS,
    ),
    fastFluctuationStandardDeviationPa: assertFiniteNonNegative(
      'fastFluctuationStandardDeviationPa',
      input.fastFluctuationStandardDeviationPa
        ?? defaults.fastFluctuationStandardDeviationPa,
    ),
    slowFluctuationTimeConstantS: assertFinitePositive(
      'slowFluctuationTimeConstantS',
      input.slowFluctuationTimeConstantS ?? defaults.slowFluctuationTimeConstantS,
    ),
    slowFluctuationStandardDeviationPa: assertFiniteNonNegative(
      'slowFluctuationStandardDeviationPa',
      input.slowFluctuationStandardDeviationPa
        ?? defaults.slowFluctuationStandardDeviationPa,
    ),
    noiseStandardDeviationPa: assertFiniteNonNegative(
      'noiseStandardDeviationPa',
      input.noiseStandardDeviationPa ?? defaults.noiseStandardDeviationPa,
    ),
    seed,
    provenance: 'educational-candidate',
  };
};

let previousGeneratedSensorSessionSeed: number | null = null;

export const createPistonOscillationSensorSessionSeed = () => {
  const randomValues = new Uint32Array(1);
  let candidate: number;
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomValues);
    candidate = randomValues[0] ?? 0;
  } else {
    candidate = Math.floor(Math.random() * 0x1_0000_0000);
  }
  if (candidate === previousGeneratedSensorSessionSeed) {
    candidate = (candidate + 1) % 0x1_0000_0000;
  }
  previousGeneratedSensorSessionSeed = candidate;
  return candidate;
};

const cloneDynamicSensorState = (
  state: PistonOscillationDynamicSensorState | null | undefined,
) => state ? { ...state } : null;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);
const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

export const isPistonOscillationDynamicSensorConfig = (
  value: unknown,
): value is PistonOscillationDynamicSensorConfig => {
  if (!isRecord(value)) return false;
  return value.modelVersion === PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG_VERSION
    && value.correlatedFluctuationModelVersion
      === PISTON_OSCILLATION_CORRELATED_FLUCTUATION_MODEL_VERSION
    && value.provenance === 'educational-candidate'
    && isFiniteNumber(value.responseTimeConstantS)
    && value.responseTimeConstantS > 0
    && isFiniteNumber(value.driftRatePaPerS)
    && isFiniteNumber(value.driftWanderAmplitudePa)
    && value.driftWanderAmplitudePa >= 0
    && isFiniteNumber(value.driftWanderPeriodS)
    && value.driftWanderPeriodS > 0
    && isFiniteNumber(value.fastFluctuationTimeConstantS)
    && value.fastFluctuationTimeConstantS > 0
    && isFiniteNumber(value.fastFluctuationStandardDeviationPa)
    && value.fastFluctuationStandardDeviationPa >= 0
    && isFiniteNumber(value.slowFluctuationTimeConstantS)
    && value.slowFluctuationTimeConstantS > 0
    && isFiniteNumber(value.slowFluctuationStandardDeviationPa)
    && value.slowFluctuationStandardDeviationPa >= 0
    && isFiniteNumber(value.noiseStandardDeviationPa)
    && value.noiseStandardDeviationPa >= 0
    && Number.isSafeInteger(value.seed);
};

export const isPistonOscillationLegacyDynamicSensorConfig = (
  value: unknown,
): value is PistonOscillationLegacyDynamicSensorConfig => {
  if (!isRecord(value)) return false;
  return value.modelVersion
      === PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_CONFIG_VERSION
    && value.provenance === 'educational-candidate'
    && isFiniteNumber(value.responseTimeConstantS)
    && value.responseTimeConstantS > 0
    && isFiniteNumber(value.driftRatePaPerS)
    && isFiniteNumber(value.driftWanderAmplitudePa)
    && value.driftWanderAmplitudePa >= 0
    && isFiniteNumber(value.driftWanderPeriodS)
    && value.driftWanderPeriodS > 0
    && isFiniteNumber(value.noiseStandardDeviationPa)
    && value.noiseStandardDeviationPa >= 0
    && Number.isSafeInteger(value.seed);
};

export const isPistonOscillationDynamicSensorState = (
  state: unknown,
): state is PistonOscillationDynamicSensorState => {
  if (!isRecord(state)) return false;
  return state.modelVersion
      === PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION
    && isFiniteNumber(state.filteredPressurePa)
    && state.filteredPressurePa > 0
    && isFiniteNumber(state.fastFluctuationPa)
    && isFiniteNumber(state.slowFluctuationPa)
    && isFiniteNumber(state.sessionElapsedS)
    && state.sessionElapsedS >= 0
    && Number.isSafeInteger(state.nextNoiseSampleIndex)
    && (state.nextNoiseSampleIndex as number) >= 0;
};

export const isPistonOscillationLegacyDynamicSensorState = (
  state: unknown,
): state is PistonOscillationLegacyDynamicSensorState => {
  if (!isRecord(state)) return false;
  return state.modelVersion
      === PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION
    && isFiniteNumber(state.filteredPressurePa)
    && state.filteredPressurePa > 0
    && isFiniteNumber(state.sessionElapsedS)
    && state.sessionElapsedS >= 0
    && Number.isSafeInteger(state.nextNoiseSampleIndex)
    && (state.nextNoiseSampleIndex as number) >= 0;
};

const hashUnitInterval = (seed: number, sampleIndex: number, salt: number) => {
  let value = (
    Math.imul(seed | 0, 0x45d9f3b)
    ^ Math.imul((sampleIndex + 1) | 0, 0x27d4eb2d)
    ^ salt
  ) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
};

const getDeterministicStandardNormal = (
  seed: number,
  sampleIndex: number,
  streamSalt = 0,
) => {
  const first = Math.max(
    Number.EPSILON,
    hashUnitInterval(seed, sampleIndex, 0x68bc21eb ^ streamSalt),
  );
  const second = hashUnitInterval(seed, sampleIndex, 0x02e5be93 ^ streamSalt);
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
};

const advanceStationaryCorrelatedFluctuation = (options: {
  previousValuePa: number;
  elapsedS: number;
  timeConstantS: number;
  standardDeviationPa: number;
  standardNormal: number;
}) => {
  if (options.elapsedS === 0 || options.standardDeviationPa === 0) {
    return options.standardDeviationPa === 0 ? 0 : options.previousValuePa;
  }
  const persistence = Math.exp(-options.elapsedS / options.timeConstantS);
  const innovationScale = options.standardDeviationPa
    * Math.sqrt(Math.max(0, 1 - persistence * persistence));
  return persistence * options.previousValuePa
    + innovationScale * options.standardNormal;
};

const getDynamicDriftOffsetPa = (
  elapsedS: number,
  config: PistonOscillationDynamicSensorConfig,
) => {
  const phase = hashUnitInterval(config.seed, 0, 0x51ed270b) * 2 * Math.PI;
  return config.driftRatePaPerS * elapsedS
    + config.driftWanderAmplitudePa * (
      Math.sin(phase + 2 * Math.PI * elapsedS / config.driftWanderPeriodS)
      - Math.sin(phase)
    );
};

export const createInitialPistonOscillationDynamicSensorState = (
  physicalPressurePa: number,
): PistonOscillationDynamicSensorState => ({
  modelVersion: PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  filteredPressurePa: assertFinitePositive('physicalPressurePa', physicalPressurePa),
  fastFluctuationPa: 0,
  slowFluctuationPa: 0,
  sessionElapsedS: 0,
  nextNoiseSampleIndex: 0,
});

export const observePistonOscillationDynamicPressure = (input: {
  physicalPressurePa: number;
  sampleRateHz?: number;
  state?: PistonOscillationDynamicSensorState | null;
  config?: Partial<PistonOscillationDynamicSensorConfig>;
  elapsedS?: number;
  noiseSampleIndexAdvance?: number;
}) => {
  const physicalPressurePa = assertFinitePositive(
    'physicalPressurePa',
    input.physicalPressurePa,
  );
  const sampleRateHz = assertPositiveSafeInteger(
    'sampleRateHz',
    input.sampleRateHz ?? PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
  );
  const config = normalizePistonOscillationDynamicSensorConfig(input.config);
  const previousState = input.state
    ?? createInitialPistonOscillationDynamicSensorState(physicalPressurePa);
  if (!isPistonOscillationDynamicSensorState(previousState)) {
    throw new RangeError('state is not a valid dynamic sensor state.');
  }
  const isInitialSample = input.state === null || input.state === undefined;
  const elapsedStepS = isInitialSample
    ? 0
    : input.elapsedS === undefined
      ? 1 / sampleRateHz
      : assertFiniteNonNegative('elapsedS', input.elapsedS);
  const noiseSampleIndexAdvance = input.noiseSampleIndexAdvance ?? 1;
  if (!Number.isSafeInteger(noiseSampleIndexAdvance) || noiseSampleIndexAdvance < 1) {
    throw new RangeError('noiseSampleIndexAdvance must be a positive safe integer.');
  }
  const responseBlend = elapsedStepS === 0
    ? 0
    : 1 - Math.exp(-elapsedStepS / config.responseTimeConstantS);
  const filteredPressurePa = previousState.filteredPressurePa
    + responseBlend * (physicalPressurePa - previousState.filteredPressurePa);
  const sessionElapsedS = previousState.sessionElapsedS + elapsedStepS;
  const noiseSampleIndex = previousState.nextNoiseSampleIndex
    + noiseSampleIndexAdvance - 1;
  const noisePa = config.noiseStandardDeviationPa
    * getDeterministicStandardNormal(
      config.seed,
      noiseSampleIndex,
    );
  const fastFluctuationPa = advanceStationaryCorrelatedFluctuation({
    previousValuePa: previousState.fastFluctuationPa,
    elapsedS: elapsedStepS,
    timeConstantS: config.fastFluctuationTimeConstantS,
    standardDeviationPa: config.fastFluctuationStandardDeviationPa,
    standardNormal: getDeterministicStandardNormal(
      config.seed,
      noiseSampleIndex,
      0x2c9277b5,
    ),
  });
  const slowFluctuationPa = advanceStationaryCorrelatedFluctuation({
    previousValuePa: previousState.slowFluctuationPa,
    elapsedS: elapsedStepS,
    timeConstantS: config.slowFluctuationTimeConstantS,
    standardDeviationPa: config.slowFluctuationStandardDeviationPa,
    standardNormal: getDeterministicStandardNormal(
      config.seed,
      noiseSampleIndex,
      0x6e624eb7,
    ),
  });
  const observedPressurePa = filteredPressurePa
    + getDynamicDriftOffsetPa(sessionElapsedS, config)
    + fastFluctuationPa
    + slowFluctuationPa
    + noisePa;
  const state: PistonOscillationDynamicSensorState = {
    modelVersion: PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
    filteredPressurePa,
    fastFluctuationPa,
    slowFluctuationPa,
    sessionElapsedS,
    nextNoiseSampleIndex: previousState.nextNoiseSampleIndex + noiseSampleIndexAdvance,
  };
  return {
    absolutePressureKpa: quantizePistonOscillationObservedPressureKpa(
      Math.max(Number.EPSILON, observedPressurePa),
    ),
    state,
    config,
    components: {
      physicalPressurePa,
      filteredPressurePa,
      driftOffsetPa: getDynamicDriftOffsetPa(sessionElapsedS, config),
      fastFluctuationPa,
      slowFluctuationPa,
      noisePa,
    },
  };
};

export const getPistonOscillationObservedTimeS = (
  sampleIndex: number,
  sampleRateHz: number = PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
) => (
  assertNonNegativeSafeInteger('sampleIndex', sampleIndex)
  / assertPositiveSafeInteger('sampleRateHz', sampleRateHz)
);

export const quantizePistonOscillationObservedPressureKpa = (
  pressurePa: number,
) => {
  const normalizedPressurePa = assertFinitePositive('pressurePa', pressurePa);
  const pascalsPerHundredthKpa = 10;
  return Math.trunc(normalizedPressurePa / pascalsPerHundredthKpa) / 100;
};

export const formatPistonOscillationObservedTimeS = (timeS: number) => (
  assertFiniteNonNegative('timeS', timeS).toFixed(
    PISTON_OSCILLATION_SENSOR_TIME_DECIMAL_PLACES,
  )
);

export const formatPistonOscillationObservedPressureKpa = (
  absolutePressureKpa: number,
) => assertFinitePositive('absolutePressureKpa', absolutePressureKpa).toFixed(
  PISTON_OSCILLATION_SENSOR_PRESSURE_DECIMAL_PLACES,
);

/**
 * Ideal, zero-lag sensor reference retained for scientific comparison and
 * legacy-record migration. Current acquisition paths use the dynamic sensor
 * model below and must not call this reference projection.
 */
export const createPistonOscillationIdealSensorReferenceSeries = (
  physicalSamples: readonly PistonOscillationPhysicalPressureSample[],
  sampleRateHz: number = PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
): PistonOscillationSensorObservationSeries => {
  const normalizedSampleRateHz = assertPositiveSafeInteger(
    'sampleRateHz',
    sampleRateHz,
  );
  if (!Array.isArray(physicalSamples) || physicalSamples.length === 0) {
    throw new RangeError('physicalSamples must contain at least one sample.');
  }
  const samples: PistonOscillationObservedSample[] = [];
  for (let sampleIndex = 0; sampleIndex < physicalSamples.length; sampleIndex += 1) {
    const physicalSample = physicalSamples[sampleIndex];
    if (!physicalSample || typeof physicalSample !== 'object') {
      throw new RangeError(`physicalSamples[${sampleIndex}] is missing.`);
    }
    samples.push({
      sampleIndex,
      timeS: getPistonOscillationObservedTimeS(sampleIndex, normalizedSampleRateHz),
      absolutePressureKpa: quantizePistonOscillationObservedPressureKpa(
        physicalSample.pressurePa,
      ),
    });
  }
  return {
    modelVersion: PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
    sampleRateHz: normalizedSampleRateHz,
    pressureResolutionKpa: PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
    pressureQuantization: PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
    samples,
  };
};

export const createPistonOscillationDynamicSensorObservationSeries = (
  physicalSamples: readonly PistonOscillationPhysicalPressureSample[],
  sampleRateHz: number = PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
  options: {
    initialState?: PistonOscillationDynamicSensorState | null;
    initialObservedPressureKpa?: number | null;
    config?: Partial<PistonOscillationDynamicSensorConfig>;
  } = {},
): PistonOscillationSensorObservationSeries => {
  const normalizedSampleRateHz = assertPositiveSafeInteger(
    'sampleRateHz',
    sampleRateHz,
  );
  if (!Array.isArray(physicalSamples) || physicalSamples.length === 0) {
    throw new RangeError('physicalSamples must contain at least one sample.');
  }
  const config = normalizePistonOscillationDynamicSensorConfig(options.config);
  const initialState = cloneDynamicSensorState(options.initialState);
  const initialObservedPressureKpa = options.initialObservedPressureKpa == null
    ? null
    : assertFinitePositive(
        'initialObservedPressureKpa',
        options.initialObservedPressureKpa,
      );
  let state = initialState;
  const samples: PistonOscillationObservedSample[] = [];
  for (let sampleIndex = 0; sampleIndex < physicalSamples.length; sampleIndex += 1) {
    const physicalSample = physicalSamples[sampleIndex];
    if (!physicalSample || typeof physicalSample !== 'object') {
      throw new RangeError(`physicalSamples[${sampleIndex}] is missing.`);
    }
    if (sampleIndex === 0 && state && initialObservedPressureKpa !== null) {
      samples.push({
        sampleIndex,
        timeS: 0,
        absolutePressureKpa: quantizePistonOscillationObservedPressureKpa(
          initialObservedPressureKpa * 1_000,
        ),
      });
      continue;
    }
    const observation = observePistonOscillationDynamicPressure({
      physicalPressurePa: physicalSample.pressurePa,
      sampleRateHz: normalizedSampleRateHz,
      state,
      config,
    });
    state = observation.state;
    samples.push({
      sampleIndex,
      timeS: getPistonOscillationObservedTimeS(sampleIndex, normalizedSampleRateHz),
      absolutePressureKpa: observation.absolutePressureKpa,
    });
  }
  return {
    modelVersion: PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
    sampleRateHz: normalizedSampleRateHz,
    pressureResolutionKpa: PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
    pressureQuantization: PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
    samples,
    dynamicConfig: config,
    initialDynamicState: initialState,
    finalDynamicState: cloneDynamicSensorState(state),
  };
};

const isPressureOnObservationGrid = (absolutePressureKpa: number) => {
  const hundredths = absolutePressureKpa
    / PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA;
  return Math.abs(hundredths - Math.round(hundredths)) <= 1e-9;
};

export const assertPistonOscillationSensorObservationSeries = (
  series: PistonOscillationSensorObservationSeries,
) => {
  if (!series || typeof series !== 'object') {
    throw new TypeError('series must be a sensor observation series.');
  }
  const dynamic = series.modelVersion
    === PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION;
  if (
    series.modelVersion !== PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION
    && !dynamic
  ) {
    throw new RangeError('series uses an unsupported observation model version.');
  }
  if (dynamic) {
    const config = series.dynamicConfig;
    const initialState = series.initialDynamicState;
    const finalState = series.finalDynamicState;
    if (
      !isPistonOscillationDynamicSensorConfig(config)
      || (initialState != null && !isPistonOscillationDynamicSensorState(initialState))
      || !isPistonOscillationDynamicSensorState(finalState)
      || (
        initialState == null
          ? finalState.nextNoiseSampleIndex < series.samples.length
          : finalState.nextNoiseSampleIndex < initialState.nextNoiseSampleIndex
            || finalState.sessionElapsedS < initialState.sessionElapsedS
      )
    ) {
      throw new RangeError('series uses invalid dynamic sensor metadata.');
    }
  }
  const sampleRateHz = assertPositiveSafeInteger('series.sampleRateHz', series.sampleRateHz);
  if (
    series.pressureResolutionKpa
      !== PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA
    || series.pressureQuantization
      !== PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION
  ) {
    throw new RangeError('series uses an unsupported pressure observation policy.');
  }
  if (!Array.isArray(series.samples) || series.samples.length === 0) {
    throw new RangeError('series.samples must contain at least one sample.');
  }
  for (let index = 0; index < series.samples.length; index += 1) {
    const sample = series.samples[index];
    if (!sample || sample.sampleIndex !== index) {
      throw new RangeError(`series.samples[${index}] has a missing or invalid sample index.`);
    }
    const expectedTimeS = getPistonOscillationObservedTimeS(index, sampleRateHz);
    if (
      !Number.isFinite(sample.timeS)
      || Math.abs(sample.timeS - expectedTimeS) > 1e-12
    ) {
      throw new RangeError(`series.samples[${index}] is not on the sample-time grid.`);
    }
    if (
      !Number.isFinite(sample.absolutePressureKpa)
      || sample.absolutePressureKpa <= 0
      || !isPressureOnObservationGrid(sample.absolutePressureKpa)
    ) {
      throw new RangeError(`series.samples[${index}] is not on the pressure grid.`);
    }
  }
  return series;
};

export const findPistonOscillationObservedFallingTriggerSample = (
  series: PistonOscillationSensorObservationSeries,
  thresholdKpa: number,
): PistonOscillationObservedSample | null => {
  const validatedSeries = assertPistonOscillationSensorObservationSeries(series);
  const normalizedThresholdKpa = assertFinitePositive('thresholdKpa', thresholdKpa);
  for (let index = 1; index < validatedSeries.samples.length; index += 1) {
    const previous = validatedSeries.samples[index - 1]!;
    const current = validatedSeries.samples[index]!;
    if (
      previous.absolutePressureKpa >= normalizedThresholdKpa
      && current.absolutePressureKpa < normalizedThresholdKpa
      && current.absolutePressureKpa < previous.absolutePressureKpa
    ) {
      return { ...current };
    }
  }
  return null;
};

export const createPistonOscillationRecordedObservationSamples = (
  series: PistonOscillationSensorObservationSeries,
  triggerSampleIndex: number,
  recordedDurationS: number,
): PistonOscillationObservedSample[] => {
  const validatedSeries = assertPistonOscillationSensorObservationSeries(series);
  const normalizedTriggerSampleIndex = assertNonNegativeSafeInteger(
    'triggerSampleIndex',
    triggerSampleIndex,
  );
  const normalizedDurationS = assertFiniteNonNegative(
    'recordedDurationS',
    recordedDurationS,
  );
  if (normalizedTriggerSampleIndex >= validatedSeries.samples.length) {
    throw new RangeError('triggerSampleIndex is outside the observation series.');
  }
  const rawIntervalCount = normalizedDurationS * validatedSeries.sampleRateHz;
  const intervalCount = Math.round(rawIntervalCount);
  if (Math.abs(rawIntervalCount - intervalCount) > 1e-9) {
    throw new RangeError('recordedDurationS must lie on the sample-time grid.');
  }
  const finalSourceIndex = normalizedTriggerSampleIndex + intervalCount;
  if (finalSourceIndex >= validatedSeries.samples.length) {
    throw new RangeError('The observation series does not contain the requested recording window.');
  }
  return Array.from({ length: intervalCount + 1 }, (_, sampleIndex) => {
    const source = validatedSeries.samples[normalizedTriggerSampleIndex + sampleIndex]!;
    return {
      sampleIndex,
      timeS: getPistonOscillationObservedTimeS(
        sampleIndex,
        validatedSeries.sampleRateHz,
      ),
      absolutePressureKpa: source.absolutePressureKpa,
    };
  });
};
