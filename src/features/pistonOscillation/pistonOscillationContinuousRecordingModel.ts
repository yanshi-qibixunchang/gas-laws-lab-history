import {
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  getPistonOscillationObservedTimeS,
  quantizePistonOscillationObservedPressureKpa,
  type PistonOscillationObservedSample,
  type PistonOscillationSensorObservationSeries,
} from '../../domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import type {
  PistonOscillationLivePressureObservation,
} from './pistonOscillationLivePressureChannel.ts';

export interface PistonOscillationRecordingReleaseSegment {
  startedAtMs: number;
  observationSeries: PistonOscillationSensorObservationSeries;
}

const BASELINE_PRESSURE_KPA = 101.325;

const getReleasePressureKpa = (
  segment: PistonOscillationRecordingReleaseSegment,
  sampledAtMs: number,
) => {
  const samples = segment.observationSeries.samples;
  const first = samples[0];
  const last = samples.at(-1);
  if (!first || !last) return BASELINE_PRESSURE_KPA;
  const elapsedS = Math.max(0, (sampledAtMs - segment.startedAtMs) / 1_000);
  if (elapsedS <= first.timeS) return first.absolutePressureKpa;
  if (elapsedS >= last.timeS) return last.absolutePressureKpa;
  const sampleIndex = Math.max(
    0,
    Math.min(
      samples.length - 1,
      Math.floor(elapsedS * segment.observationSeries.sampleRateHz + 1e-9),
    ),
  );
  return samples[sampleIndex]?.absolutePressureKpa ?? first.absolutePressureKpa;
};

const getLivePressureKpa = (
  observations: readonly PistonOscillationLivePressureObservation[],
  sampledAtMs: number,
) => {
  const first = observations[0];
  const last = observations.at(-1);
  if (!first || !last) {
    return quantizePistonOscillationObservedPressureKpa(
      BASELINE_PRESSURE_KPA * 1_000,
    );
  }
  if (sampledAtMs <= first.sampledAtMs) return first.absolutePressureKpa;
  if (sampledAtMs >= last.sampledAtMs) return last.absolutePressureKpa;
  let lowerBound = 1;
  let upperBound = observations.length - 1;
  while (lowerBound < upperBound) {
    const middle = Math.floor((lowerBound + upperBound) / 2);
    if (observations[middle]!.sampledAtMs < sampledAtMs) {
      lowerBound = middle + 1;
    } else {
      upperBound = middle;
    }
  }
  const upperIndex = lowerBound;
  const lower = observations[Math.max(0, upperIndex - 1)] ?? first;
  const upper = observations[Math.min(observations.length - 1, upperIndex)] ?? last;
  const spanMs = upper.sampledAtMs - lower.sampledAtMs;
  if (spanMs <= 0) return upper.absolutePressureKpa;
  const ratio = Math.min(1, Math.max(0, (sampledAtMs - lower.sampledAtMs) / spanMs));
  return quantizePistonOscillationObservedPressureKpa((
    lower.absolutePressureKpa
    + (upper.absolutePressureKpa - lower.absolutePressureKpa) * ratio
  ) * 1_000);
};

const getLatestAtOrBefore = <Value extends { startedAtMs: number }>(
  values: readonly Value[],
  sampledAtMs: number,
) => {
  let latest: Value | null = null;
  for (const value of values) {
    if (value.startedAtMs > sampledAtMs) break;
    latest = value;
  }
  return latest;
};

const getLatestPressStartAtOrBefore = (
  pressStartedAtMs: readonly number[],
  sampledAtMs: number,
) => {
  let latest: number | null = null;
  for (const startedAtMs of pressStartedAtMs) {
    if (startedAtMs > sampledAtMs) break;
    latest = startedAtMs;
  }
  return latest;
};

export const createPistonOscillationContinuousRecordingSamples = (options: {
  durationS: number;
  sampleRateHz: number;
  recordingStartedAtMs: number;
  releaseSegments: readonly PistonOscillationRecordingReleaseSegment[];
  pressStartedAtMs: readonly number[];
  liveObservations: readonly PistonOscillationLivePressureObservation[];
}): PistonOscillationObservedSample[] => {
  const requestedIntervalCount = Math.max(
    0,
    Math.floor(options.durationS * options.sampleRateHz + 1e-9),
  );
  const latestReleaseSampledAtMs = options.releaseSegments.reduce(
    (latest, segment) => Math.max(
      latest,
      segment.startedAtMs + (
        segment.observationSeries.samples.at(-1)?.timeS ?? 0
      ) * 1_000,
    ),
    options.recordingStartedAtMs,
  );
  const latestLiveSampledAtMs = options.liveObservations.at(-1)?.sampledAtMs
    ?? options.recordingStartedAtMs;
  const maximumIntervalCount = Math.max(0, Math.floor(
    (
      Math.max(latestReleaseSampledAtMs, latestLiveSampledAtMs)
      - options.recordingStartedAtMs
    ) / 1_000 * options.sampleRateHz + 1e-9,
  ));
  const intervalCount = Math.min(requestedIntervalCount, maximumIntervalCount);
  return Array.from({ length: intervalCount + 1 }, (_, sampleIndex) => {
    const timeS = getPistonOscillationObservedTimeS(sampleIndex, options.sampleRateHz);
    const sampledAtMs = options.recordingStartedAtMs + timeS * 1_000;
    const releaseSegment = getLatestAtOrBefore(options.releaseSegments, sampledAtMs);
    const pressStartedAtMs = getLatestPressStartAtOrBefore(
      options.pressStartedAtMs,
      sampledAtMs,
    );
    const releaseControlsSample = releaseSegment !== null
      && (pressStartedAtMs === null || releaseSegment.startedAtMs >= pressStartedAtMs);
    const absolutePressureKpa = releaseControlsSample
      ? getReleasePressureKpa(releaseSegment, sampledAtMs)
      : getLivePressureKpa(options.liveObservations, sampledAtMs);
    return { sampleIndex, timeS, absolutePressureKpa };
  });
};

export const createPistonOscillationContinuousObservationSeries = (options: {
  samples: readonly PistonOscillationObservedSample[];
  sampleRateHz: number;
  releaseSegments: readonly PistonOscillationRecordingReleaseSegment[];
  pressStartedAtMs: readonly number[];
  liveObservations: readonly PistonOscillationLivePressureObservation[];
}): PistonOscillationSensorObservationSeries => {
  const samples = options.samples.map((sample) => ({ ...sample }));
  const firstRelease = options.releaseSegments[0]?.observationSeries ?? null;
  const latestReleaseSegment = options.releaseSegments.at(-1) ?? null;
  const latestPressStartedAtMs = options.pressStartedAtMs.at(-1) ?? null;
  const latestLiveObservation = options.liveObservations.at(-1) ?? null;
  const liveControlsEnd = latestPressStartedAtMs !== null
    && (
      latestReleaseSegment === null
      || latestPressStartedAtMs > latestReleaseSegment.startedAtMs
    );
  const dynamicConfig = firstRelease?.dynamicConfig
    ?? latestReleaseSegment?.observationSeries.dynamicConfig
    ?? latestLiveObservation?.sensorConfig
    ?? null;
  const initialDynamicState = firstRelease?.initialDynamicState
    ?? options.liveObservations[0]?.sensorState
    ?? null;
  const finalDynamicState = liveControlsEnd
    ? latestLiveObservation?.sensorState ?? null
    : latestReleaseSegment?.observationSeries.finalDynamicState
      ?? latestLiveObservation?.sensorState
      ?? null;
  if (dynamicConfig && finalDynamicState) {
    return {
      modelVersion: PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
      sampleRateHz: options.sampleRateHz,
      pressureResolutionKpa: PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
      pressureQuantization: PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
      samples,
      dynamicConfig: { ...dynamicConfig },
      initialDynamicState: initialDynamicState ? { ...initialDynamicState } : null,
      finalDynamicState: { ...finalDynamicState },
    };
  }
  return {
    modelVersion: PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
    sampleRateHz: options.sampleRateHz,
    pressureResolutionKpa: PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
    pressureQuantization: PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
    samples,
  };
};
