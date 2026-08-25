export const PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION =
  'piston-oscillation-sensor-observation-v1' as const;

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

export interface PistonOscillationSensorObservationSeries {
  modelVersion: typeof PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION;
  sampleRateHz: number;
  pressureResolutionKpa: typeof PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA;
  pressureQuantization: typeof PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION;
  samples: PistonOscillationObservedSample[];
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

export const createPistonOscillationSensorObservationSeries = (
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
    modelVersion: PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
    sampleRateHz: normalizedSampleRateHz,
    pressureResolutionKpa: PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
    pressureQuantization: PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
    samples,
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
  if (series.modelVersion !== PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION) {
    throw new RangeError('series uses an unsupported observation model version.');
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
