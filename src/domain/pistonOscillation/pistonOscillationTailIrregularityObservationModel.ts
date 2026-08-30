import {
  assertPistonOscillationSensorObservationSeries,
  quantizePistonOscillationObservedPressureKpa,
  type PistonOscillationSensorObservationSeries,
} from './pistonOscillationSensorObservationModel.ts';

export const PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_MODEL_VERSION =
  'piston-oscillation-tail-irregularity-observation-v1' as const;

export interface PistonOscillationTailIrregularityObservationConfig {
  onsetCycle: number;
  maximumRelativeAmplitude: number;
  minimumVisibleAmplitudeKpa: number;
  maximumEventTimeS: number;
  baseEventProbability: number;
  tailProbabilityGain: number;
  minimumEventCount: number;
  maximumEventCount: number;
  shoulderEventShare: number;
  minimumTimeShiftMs: number;
  maximumTimeShiftMs: number;
  minimumShoulderFraction: number;
  maximumShoulderFraction: number;
  minimumShoulderAmplitudeKpa: number;
  maximumShoulderAmplitudeKpa: number;
}

export const PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG:
Readonly<PistonOscillationTailIrregularityObservationConfig> = Object.freeze({
    onsetCycle: 3.75,
    maximumRelativeAmplitude: 0.55,
    minimumVisibleAmplitudeKpa: 0.1,
    maximumEventTimeS: 0.25,
    baseEventProbability: 0.35,
    tailProbabilityGain: 0.4,
    minimumEventCount: 2,
    maximumEventCount: 5,
    shoulderEventShare: 0.65,
    minimumTimeShiftMs: 4.5,
    maximumTimeShiftMs: 5.2,
    minimumShoulderFraction: 0.025,
    maximumShoulderFraction: 0.22,
    minimumShoulderAmplitudeKpa: 0.02,
    maximumShoulderAmplitudeKpa: 0.25,
  });

type PistonOscillationTailExtremumType = 'peak' | 'trough';

interface PistonOscillationTailExtremum {
  sampleIndex: number;
  timeS: number;
  type: PistonOscillationTailExtremumType;
  deviationKpa: number;
}

export interface PistonOscillationTailIrregularityObservationEvent {
  eventIndex: number;
  destinationExtremumType: PistonOscillationTailExtremumType;
  destinationExtremumTimeS: number;
  eventPhase: number;
  centerTimeS: number;
  relativeAmplitude: number;
  timeShiftMs: number;
  shoulderAmplitudeKpa: number;
}

export interface PistonOscillationTailIrregularityObservationResult {
  modelVersion:
    typeof PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_MODEL_VERSION;
  seed: number;
  events: PistonOscillationTailIrregularityObservationEvent[];
  observationSeries: PistonOscillationSensorObservationSeries;
}

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.max(minimum, Math.min(maximum, value))
);

const mean = (values: readonly number[]) => values.length === 0
  ? 0
  : values.reduce((sum, value) => sum + value, 0) / values.length;

const median = (values: readonly number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

const smoothstep = (value: number) => {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

const hashUnitInterval = (seed: number, index: number, salt: number) => {
  let value = (
    Math.imul(seed | 0, 0x45d9f3b)
    ^ Math.imul((index + 1) | 0, 0x27d4eb2d)
    ^ salt
  ) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
};

const interpolate = (values: readonly number[], samplePosition: number) => {
  const bounded = clamp(samplePosition, 0, values.length - 1);
  const left = Math.floor(bounded);
  const right = Math.ceil(bounded);
  if (left === right) return values[left] ?? values.at(-1) ?? 0;
  const fraction = bounded - left;
  return (values[left] ?? 0) * (1 - fraction)
    + (values[right] ?? 0) * fraction;
};

const centeredMovingAverage = (
  values: readonly number[],
  windowSamples: number,
) => {
  const radius = Math.floor(Math.max(1, windowSamples) / 2);
  const prefix = [0];
  for (const value of values) prefix.push((prefix.at(-1) ?? 0) + value);
  return values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    return ((prefix[end] ?? 0) - (prefix[start] ?? 0))
      / Math.max(1, end - start);
  });
};

const extractPrimaryExtrema = (options: {
  deviationsKpa: readonly number[];
  expectedPeriodS: number;
  sampleRateHz: number;
}) => {
  const smoothed = centeredMovingAverage(options.deviationsKpa, 7);
  const candidates: PistonOscillationTailExtremum[] = [];
  for (let index = 2; index < smoothed.length - 2; index += 1) {
    const previous = smoothed[index - 1]!;
    const current = smoothed[index]!;
    const next = smoothed[index + 1]!;
    if (current > previous && current >= next) {
      candidates.push({
        sampleIndex: index,
        timeS: index / options.sampleRateHz,
        type: 'peak',
        deviationKpa: current,
      });
    } else if (current < previous && current <= next) {
      candidates.push({
        sampleIndex: index,
        timeS: index / options.sampleRateHz,
        type: 'trough',
        deviationKpa: current,
      });
    }
  }
  const minimumDistanceSamples = Math.max(
    4,
    Math.floor(options.expectedPeriodS * options.sampleRateHz * 0.3),
  );
  const accepted: PistonOscillationTailExtremum[] = [];
  for (const candidate of candidates) {
    const previous = accepted.at(-1);
    if (!previous) {
      accepted.push(candidate);
      continue;
    }
    if (candidate.type === previous.type) {
      if (Math.abs(candidate.deviationKpa) > Math.abs(previous.deviationKpa)) {
        accepted[accepted.length - 1] = candidate;
      }
      continue;
    }
    if (candidate.sampleIndex - previous.sampleIndex < minimumDistanceSamples) {
      continue;
    }
    accepted.push(candidate);
  }
  return accepted;
};

const deriveTailIrregularitySeed = (
  series: PistonOscillationSensorObservationSeries,
  expectedPeriodS: number,
) => {
  const sensorSeed = series.dynamicConfig?.seed ?? 0;
  const initialNoiseSampleIndex = series.initialDynamicState?.nextNoiseSampleIndex ?? 0;
  const periodMicroseconds = Math.round(expectedPeriodS * 1_000_000);
  return (
    sensorSeed
    ^ Math.imul(initialNoiseSampleIndex + 1, 0x85ebca6b)
    ^ Math.imul(periodMicroseconds + 1, 0x27d4eb2d)
  ) >>> 0;
};

const createTailEvents = (options: {
  pressuresKpa: readonly number[];
  baselineKpa: number;
  expectedPeriodS: number;
  sampleRateHz: number;
  seed: number;
  config: Readonly<PistonOscillationTailIrregularityObservationConfig>;
}) => {
  const config = options.config;
  const extrema = extractPrimaryExtrema({
    deviationsKpa: options.pressuresKpa.map((value) => value - options.baselineKpa),
    expectedPeriodS: options.expectedPeriodS,
    sampleRateHz: options.sampleRateHz,
  }).filter((extremum) => extremum.timeS <= config.maximumEventTimeS);
  const initialAmplitudeKpa = Math.max(
    Number.EPSILON,
    median(extrema.slice(0, 4).map((extremum) => Math.abs(extremum.deviationKpa))),
  );
  const candidates = extrema.flatMap((extremum, ordinal) => {
    const previousExtremum = extrema[ordinal - 1];
    if (!previousExtremum) return [];
    const cycleOrdinal = ordinal / 2;
    const relativeAmplitude = Math.abs(extremum.deviationKpa)
      / initialAmplitudeKpa;
    if (
      cycleOrdinal < config.onsetCycle
      || relativeAmplitude > config.maximumRelativeAmplitude
      || Math.abs(extremum.deviationKpa) < config.minimumVisibleAmplitudeKpa
    ) return [];
    const tailDepth = clamp(
      (config.maximumRelativeAmplitude - relativeAmplitude)
        / config.maximumRelativeAmplitude,
      0,
      1,
    );
    return [{
      extremum,
      previousExtremum,
      ordinal,
      relativeAmplitude,
      priority: hashUnitInterval(options.seed, ordinal, 0x6d2b79f5),
      probability: clamp(
        config.baseEventProbability + tailDepth * config.tailProbabilityGain,
        0,
        1,
      ),
    }];
  });
  const selected = candidates.filter(
    (candidate) => candidate.priority <= candidate.probability,
  );
  if (selected.length < config.minimumEventCount) {
    selected.push(...[...candidates]
      .filter((candidate) => !selected.includes(candidate))
      .sort((left, right) => left.priority - right.priority)
      .slice(0, config.minimumEventCount - selected.length));
  }
  selected.sort((left, right) => left.extremum.timeS - right.extremum.timeS);
  return selected.slice(0, config.maximumEventCount).map((candidate, eventIndex) => {
    const unsignedTimeShiftMs = config.minimumTimeShiftMs
      + hashUnitInterval(options.seed, eventIndex, 0x85ebca6b)
        * (config.maximumTimeShiftMs - config.minimumTimeShiftMs);
    const timeShiftMs = unsignedTimeShiftMs
      * (hashUnitInterval(options.seed, eventIndex, 0xc2b2ae35) < 0.68 ? 1 : -1);
    const relativeShoulder = config.minimumShoulderFraction
      + hashUnitInterval(options.seed, eventIndex, 0x27d4eb2f)
        * (config.maximumShoulderFraction - config.minimumShoulderFraction);
    const shoulderAmplitudeKpa = clamp(
      Math.abs(candidate.extremum.deviationKpa) * relativeShoulder,
      config.minimumShoulderAmplitudeKpa,
      config.maximumShoulderAmplitudeKpa,
    );
    const phaseChoice = hashUnitInterval(options.seed, eventIndex, 0x165667b1);
    const eventPhase = phaseChoice < config.shoulderEventShare
      ? 0.66 + hashUnitInterval(options.seed, eventIndex, 0xd3a2646c) * 0.22
      : 0.22 + hashUnitInterval(options.seed, eventIndex, 0xfd7046c5) * 0.4;
    const centerTimeS = candidate.previousExtremum.timeS
      + eventPhase * (
        candidate.extremum.timeS - candidate.previousExtremum.timeS
      );
    return {
      eventIndex,
      destinationExtremumType: candidate.extremum.type,
      destinationExtremumTimeS: candidate.extremum.timeS,
      eventPhase,
      centerTimeS,
      relativeAmplitude: candidate.relativeAmplitude,
      timeShiftMs,
      shoulderAmplitudeKpa,
      sourceDeviationKpa: interpolate(
        options.pressuresKpa,
        centerTimeS * options.sampleRateHz,
      ) - options.baselineKpa,
    };
  });
};

const getWarpWeight = (
  timeS: number,
  eventTimeS: number,
  halfPeriodS: number,
) => {
  const startS = eventTimeS - halfPeriodS * 0.28;
  const plateauStartS = eventTimeS - halfPeriodS * 0.06;
  const plateauEndS = eventTimeS + halfPeriodS * 0.06;
  const endS = eventTimeS + halfPeriodS * 0.28;
  if (timeS <= startS || timeS >= endS) return 0;
  if (timeS < plateauStartS) {
    return smoothstep((timeS - startS) / (plateauStartS - startS));
  }
  if (timeS <= plateauEndS) return 1;
  return 1 - smoothstep((timeS - plateauEndS) / (endS - plateauEndS));
};

const getShoulderOffsetKpa = (options: {
  timeS: number;
  centerTimeS: number;
  halfPeriodS: number;
  shoulderAmplitudeKpa: number;
  sourceDeviationKpa: number;
}) => {
  const signTowardBaseline = -Math.sign(options.sourceDeviationKpa || 1);
  const primarySigmaS = options.halfPeriodS * 0.08;
  const reboundCenterS = options.centerTimeS + options.halfPeriodS * 0.12;
  const reboundSigmaS = options.halfPeriodS * 0.065;
  const primary = Math.exp(-0.5 * (
    (options.timeS - options.centerTimeS) / primarySigmaS
  ) ** 2);
  const rebound = Math.exp(-0.5 * (
    (options.timeS - reboundCenterS) / reboundSigmaS
  ) ** 2);
  return signTowardBaseline * options.shoulderAmplitudeKpa
    * (primary - 0.38 * rebound);
};

export const applyPistonOscillationTailIrregularityObservation = (options: {
  observationSeries: PistonOscillationSensorObservationSeries;
  expectedPeriodS: number;
  seed?: number;
  config?: Partial<PistonOscillationTailIrregularityObservationConfig>;
}): PistonOscillationTailIrregularityObservationResult => {
  const series = assertPistonOscillationSensorObservationSeries(
    options.observationSeries,
  );
  if (!Number.isFinite(options.expectedPeriodS) || options.expectedPeriodS <= 0) {
    throw new RangeError('expectedPeriodS must be finite and greater than zero.');
  }
  const seed = options.seed === undefined
    ? deriveTailIrregularitySeed(series, options.expectedPeriodS)
    : options.seed;
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError('seed must be a safe integer.');
  }
  const config = {
    ...PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG,
    ...options.config,
  };
  const pressuresKpa = series.samples.map((sample) => sample.absolutePressureKpa);
  const baselineKpa = mean(pressuresKpa.slice(-Math.min(100, pressuresKpa.length)));
  const events = createTailEvents({
    pressuresKpa,
    baselineKpa,
    expectedPeriodS: options.expectedPeriodS,
    sampleRateHz: series.sampleRateHz,
    seed,
    config,
  });
  const halfPeriodS = options.expectedPeriodS / 2;
  const samples = series.samples.map((sample) => {
    let sourceTimeShiftS = 0;
    let shoulderOffsetKpa = 0;
    for (const event of events) {
      const weight = getWarpWeight(
        sample.timeS,
        event.centerTimeS,
        halfPeriodS,
      );
      if (weight === 0) continue;
      sourceTimeShiftS += event.timeShiftMs / 1_000 * weight;
      shoulderOffsetKpa += getShoulderOffsetKpa({
        timeS: sample.timeS,
        centerTimeS: event.centerTimeS,
        halfPeriodS,
        shoulderAmplitudeKpa: event.shoulderAmplitudeKpa,
        sourceDeviationKpa: event.sourceDeviationKpa,
      }) * weight;
    }
    if (sourceTimeShiftS === 0 && shoulderOffsetKpa === 0) return { ...sample };
    const sourcePressureKpa = interpolate(
      pressuresKpa,
      (sample.timeS - sourceTimeShiftS) * series.sampleRateHz,
    );
    return {
      ...sample,
      absolutePressureKpa: quantizePistonOscillationObservedPressureKpa(
        Math.max(Number.EPSILON, sourcePressureKpa + shoulderOffsetKpa) * 1_000,
      ),
    };
  });
  const observationSeries = assertPistonOscillationSensorObservationSeries({
    ...series,
    samples,
  });
  return {
    modelVersion: PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_MODEL_VERSION,
    seed,
    events: events.map(({ sourceDeviationKpa: _sourceDeviationKpa, ...event }) => event),
    observationSeries,
  };
};
