import type {
  PistonOscillationThermodynamicState,
} from './pistonOscillationPhysicsEngine.ts';

export const PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION =
  'piston-oscillation-press-interaction-v1' as const;

const RELEASE_VELOCITY_ESTIMATION_WINDOW_S = 0.08;
const MINIMUM_SEGMENT_DURATION_S = 0.001;
const MINIMUM_MEANINGFUL_MOTION_M = 0.000_005;

export interface PistonOscillationPressTracePoint {
  observedAtMs: number;
  pistonHeightMm: number;
  displacementMm: number;
  pressurePa: number;
  temperatureK: number;
}

export interface PistonOscillationPersistedPressTraceSample {
  timeS: number;
  pistonHeightM: number;
  displacementM: number;
  pressurePa: number;
  temperatureK: number;
}

export type PistonOscillationReleaseOrder =
  | 'space-first'
  | 'mouse-first'
  | 'simultaneous'
  | 'unknown';

export interface PistonOscillationReleasePhysicalSnapshot {
  pistonHeightM: number;
  displacementM: number;
  velocityMPerS: number;
  totalVolumeM3: number;
  pressurePa: number;
  temperatureK: number;
}

export interface PistonOscillationPressOperationEvidence {
  modelVersion: typeof PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION | string;
  provenance: 'captured' | 'legacy-unknown';
  pressDurationS: number | null;
  compressionDurationS: number | null;
  holdDurationS: number | null;
  averageDownwardSpeedMPerS: number | null;
  peakDownwardSpeedMPerS: number | null;
  releaseVelocityMPerS: number | null;
  spaceReleaseOffsetS: number | null;
  mouseReleaseOffsetS: number | null;
  signedReleaseGapS: number | null;
  releaseOrder: PistonOscillationReleaseOrder;
  trace: PistonOscillationPersistedPressTraceSample[];
  releaseState: PistonOscillationReleasePhysicalSnapshot | null;
}

const finiteOrThrow = (name: string, value: number) => {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
  return value;
};

export const appendPistonOscillationPressTracePoint = (
  trace: PistonOscillationPressTracePoint[],
  point: PistonOscillationPressTracePoint,
) => {
  finiteOrThrow('point.observedAtMs', point.observedAtMs);
  finiteOrThrow('point.pistonHeightMm', point.pistonHeightMm);
  finiteOrThrow('point.displacementMm', point.displacementMm);
  finiteOrThrow('point.pressurePa', point.pressurePa);
  finiteOrThrow('point.temperatureK', point.temperatureK);
  if (point.observedAtMs < 0 || point.pistonHeightMm < 0 || point.pressurePa <= 0) {
    throw new RangeError('The press trace point contains an invalid physical value.');
  }
  const last = trace.at(-1);
  if (last && point.observedAtMs < last.observedAtMs) {
    throw new RangeError('Press trace times must be monotonic.');
  }
  if (last?.observedAtMs === point.observedAtMs) {
    trace[trace.length - 1] = { ...point };
  } else {
    trace.push({ ...point });
  }
  return trace;
};

const getSegmentVelocityMPerS = (
  first: PistonOscillationPressTracePoint,
  second: PistonOscillationPressTracePoint,
) => {
  const durationS = (second.observedAtMs - first.observedAtMs) / 1_000;
  if (durationS < MINIMUM_SEGMENT_DURATION_S) return null;
  return ((second.pistonHeightMm - first.pistonHeightMm) / 1_000) / durationS;
};

const estimateTrailingVelocityMPerS = (
  trace: readonly PistonOscillationPressTracePoint[],
  releasedAtMs: number,
) => {
  const windowStartMs = releasedAtMs - RELEASE_VELOCITY_ESTIMATION_WINDOW_S * 1_000;
  const candidates = trace.filter((point) => (
    point.observedAtMs >= windowStartMs && point.observedAtMs <= releasedAtMs
  ));
  if (candidates.length < 2) return 0;
  const originMs = candidates[0]!.observedAtMs;
  const meanTimeS = candidates.reduce(
    (sum, point) => sum + (point.observedAtMs - originMs) / 1_000,
    0,
  ) / candidates.length;
  const meanHeightM = candidates.reduce(
    (sum, point) => sum + point.pistonHeightMm / 1_000,
    0,
  ) / candidates.length;
  let covariance = 0;
  let variance = 0;
  for (const point of candidates) {
    const centeredTimeS = (point.observedAtMs - originMs) / 1_000 - meanTimeS;
    covariance += centeredTimeS * (point.pistonHeightMm / 1_000 - meanHeightM);
    variance += centeredTimeS ** 2;
  }
  return variance <= Number.EPSILON ? 0 : covariance / variance;
};

const getReleaseOrder = (
  spaceReleasedAtMs: number | null,
  mouseReleasedAtMs: number | null,
): PistonOscillationReleaseOrder => {
  if (spaceReleasedAtMs === null || mouseReleasedAtMs === null) return 'unknown';
  const gapMs = spaceReleasedAtMs - mouseReleasedAtMs;
  if (Math.abs(gapMs) < 0.5) return 'simultaneous';
  return gapMs < 0 ? 'space-first' : 'mouse-first';
};

export const createPistonOscillationPressOperationEvidence = (options: {
  trace: readonly PistonOscillationPressTracePoint[];
  releasedAtMs: number;
  spaceReleasedAtMs: number | null;
  mouseReleasedAtMs: number | null;
  equilibriumHeightMm: number;
  releaseThermodynamicState: PistonOscillationThermodynamicState;
  releaseVelocityMPerS?: number;
}): PistonOscillationPressOperationEvidence => {
  const releasedAtMs = finiteOrThrow('releasedAtMs', options.releasedAtMs);
  const exactReleaseVelocityMPerS = options.releaseVelocityMPerS === undefined
    ? null
    : finiteOrThrow('releaseVelocityMPerS', options.releaseVelocityMPerS);
  const trace = options.trace
    .filter((point) => point.observedAtMs <= releasedAtMs)
    .map((point) => ({ ...point }));
  if (trace.length === 0) {
    return {
      modelVersion: PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION,
      provenance: 'captured',
      pressDurationS: 0,
      compressionDurationS: 0,
      holdDurationS: 0,
      averageDownwardSpeedMPerS: 0,
      peakDownwardSpeedMPerS: 0,
      releaseVelocityMPerS: exactReleaseVelocityMPerS ?? 0,
      spaceReleaseOffsetS: null,
      mouseReleaseOffsetS: null,
      signedReleaseGapS: null,
      releaseOrder: getReleaseOrder(
        options.spaceReleasedAtMs,
        options.mouseReleasedAtMs,
      ),
      trace: [],
      releaseState: {
        pistonHeightM: options.releaseThermodynamicState.pistonHeightM,
        displacementM: options.releaseThermodynamicState.pistonHeightM
          - options.equilibriumHeightMm / 1_000,
        velocityMPerS: exactReleaseVelocityMPerS ?? 0,
        totalVolumeM3: options.releaseThermodynamicState.totalVolumeM3,
        pressurePa: options.releaseThermodynamicState.pressurePa,
        temperatureK: options.releaseThermodynamicState.temperatureK,
      },
    };
  }
  const first = trace[0]!;
  const last = trace.at(-1)!;
  if (last.observedAtMs < releasedAtMs) {
    trace.push({ ...last, observedAtMs: releasedAtMs });
  }
  const initialHeightM = first.pistonHeightMm / 1_000;
  let minimumHeightM = initialHeightM;
  let compressionEndedAtMs = first.observedAtMs;
  let peakDownwardSpeedMPerS = 0;
  for (let index = 1; index < trace.length; index += 1) {
    const previous = trace[index - 1]!;
    const current = trace[index]!;
    const currentHeightM = current.pistonHeightMm / 1_000;
    if (currentHeightM < minimumHeightM - MINIMUM_MEANINGFUL_MOTION_M) {
      minimumHeightM = currentHeightM;
      compressionEndedAtMs = current.observedAtMs;
    }
    const segmentVelocityMPerS = getSegmentVelocityMPerS(previous, current);
    if (segmentVelocityMPerS !== null) {
      peakDownwardSpeedMPerS = Math.max(
        peakDownwardSpeedMPerS,
        -segmentVelocityMPerS,
      );
    }
  }
  const pressDurationS = Math.max(0, (releasedAtMs - first.observedAtMs) / 1_000);
  const compressionDurationS = Math.max(
    0,
    (compressionEndedAtMs - first.observedAtMs) / 1_000,
  );
  const holdDurationS = Math.max(0, (releasedAtMs - compressionEndedAtMs) / 1_000);
  const downwardDistanceM = Math.max(0, initialHeightM - minimumHeightM);
  const averageDownwardSpeedMPerS = compressionDurationS > 0
    ? downwardDistanceM / compressionDurationS
    : 0;
  const releaseVelocityMPerS = exactReleaseVelocityMPerS
    ?? estimateTrailingVelocityMPerS(trace, releasedAtMs);
  const signedReleaseGapS = options.spaceReleasedAtMs === null
    || options.mouseReleasedAtMs === null
    ? null
    : (options.spaceReleasedAtMs - options.mouseReleasedAtMs) / 1_000;
  const toOffsetS = (timeMs: number | null) => timeMs === null
    ? null
    : Math.max(0, (timeMs - first.observedAtMs) / 1_000);
  return {
    modelVersion: PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION,
    provenance: 'captured',
    pressDurationS,
    compressionDurationS,
    holdDurationS,
    averageDownwardSpeedMPerS,
    peakDownwardSpeedMPerS,
    releaseVelocityMPerS,
    spaceReleaseOffsetS: toOffsetS(options.spaceReleasedAtMs),
    mouseReleaseOffsetS: toOffsetS(options.mouseReleasedAtMs),
    signedReleaseGapS,
    releaseOrder: getReleaseOrder(options.spaceReleasedAtMs, options.mouseReleasedAtMs),
    trace: trace.map((point) => ({
      timeS: (point.observedAtMs - first.observedAtMs) / 1_000,
      pistonHeightM: point.pistonHeightMm / 1_000,
      displacementM: point.displacementMm / 1_000,
      pressurePa: point.pressurePa,
      temperatureK: point.temperatureK,
    })),
    releaseState: {
      pistonHeightM: options.releaseThermodynamicState.pistonHeightM,
      displacementM: options.releaseThermodynamicState.pistonHeightM
        - options.equilibriumHeightMm / 1_000,
      velocityMPerS: releaseVelocityMPerS,
      totalVolumeM3: options.releaseThermodynamicState.totalVolumeM3,
      pressurePa: options.releaseThermodynamicState.pressurePa,
      temperatureK: options.releaseThermodynamicState.temperatureK,
    },
  };
};

export const createLegacyUnknownPistonOscillationPressOperationEvidence = (
): PistonOscillationPressOperationEvidence => ({
  modelVersion: 'legacy-unknown',
  provenance: 'legacy-unknown',
  pressDurationS: null,
  compressionDurationS: null,
  holdDurationS: null,
  averageDownwardSpeedMPerS: null,
  peakDownwardSpeedMPerS: null,
  releaseVelocityMPerS: null,
  spaceReleaseOffsetS: null,
  mouseReleaseOffsetS: null,
  signedReleaseGapS: null,
  releaseOrder: 'unknown',
  trace: [],
  releaseState: null,
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const nullableNonNegativeFinite = (value: unknown) => (
  value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
);

export const clonePistonOscillationPressOperationEvidence = (
  evidence: PistonOscillationPressOperationEvidence,
): PistonOscillationPressOperationEvidence => ({
  ...evidence,
  trace: evidence.trace.map((sample) => ({ ...sample })),
  releaseState: evidence.releaseState ? { ...evidence.releaseState } : null,
});

export const normalizePistonOscillationPressOperationEvidence = (
  value: unknown,
): PistonOscillationPressOperationEvidence | null => {
  if (!isRecord(value)) return null;
  if (value.provenance === 'legacy-unknown') {
    return createLegacyUnknownPistonOscillationPressOperationEvidence();
  }
  const releaseOrders: readonly PistonOscillationReleaseOrder[] = [
    'space-first',
    'mouse-first',
    'simultaneous',
    'unknown',
  ];
  const nullableMetrics = [
    value.pressDurationS,
    value.compressionDurationS,
    value.holdDurationS,
    value.averageDownwardSpeedMPerS,
    value.peakDownwardSpeedMPerS,
    value.spaceReleaseOffsetS,
    value.mouseReleaseOffsetS,
  ];
  if (
    value.modelVersion !== PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION
    || value.provenance !== 'captured'
    || !releaseOrders.includes(value.releaseOrder as PistonOscillationReleaseOrder)
    || nullableMetrics.some((metric) => !nullableNonNegativeFinite(metric))
    || !(
      value.releaseVelocityMPerS === null
      || (typeof value.releaseVelocityMPerS === 'number'
        && Number.isFinite(value.releaseVelocityMPerS))
    )
    || !(
      value.signedReleaseGapS === null
      || (typeof value.signedReleaseGapS === 'number'
        && Number.isFinite(value.signedReleaseGapS))
    )
    || !Array.isArray(value.trace)
  ) return null;
  const trace: PistonOscillationPersistedPressTraceSample[] = [];
  let previousTimeS = -1;
  for (const sample of value.trace) {
    if (!isRecord(sample)) return null;
    const numbers = [
      sample.timeS,
      sample.pistonHeightM,
      sample.displacementM,
      sample.pressurePa,
      sample.temperatureK,
    ];
    if (
      numbers.some((number) => typeof number !== 'number' || !Number.isFinite(number))
      || (sample.timeS as number) < previousTimeS
      || (sample.pistonHeightM as number) < 0
      || (sample.pressurePa as number) <= 0
      || (sample.temperatureK as number) <= 0
    ) return null;
    previousTimeS = sample.timeS as number;
    trace.push({
      timeS: sample.timeS as number,
      pistonHeightM: sample.pistonHeightM as number,
      displacementM: sample.displacementM as number,
      pressurePa: sample.pressurePa as number,
      temperatureK: sample.temperatureK as number,
    });
  }
  let releaseState: PistonOscillationReleasePhysicalSnapshot | null = null;
  if (value.releaseState !== null) {
    if (!isRecord(value.releaseState)) return null;
    const numbers = [
      value.releaseState.pistonHeightM,
      value.releaseState.displacementM,
      value.releaseState.velocityMPerS,
      value.releaseState.totalVolumeM3,
      value.releaseState.pressurePa,
      value.releaseState.temperatureK,
    ];
    if (
      numbers.some((number) => typeof number !== 'number' || !Number.isFinite(number))
      || (value.releaseState.pistonHeightM as number) < 0
      || (value.releaseState.totalVolumeM3 as number) <= 0
      || (value.releaseState.pressurePa as number) <= 0
      || (value.releaseState.temperatureK as number) <= 0
    ) return null;
    releaseState = {
      pistonHeightM: value.releaseState.pistonHeightM as number,
      displacementM: value.releaseState.displacementM as number,
      velocityMPerS: value.releaseState.velocityMPerS as number,
      totalVolumeM3: value.releaseState.totalVolumeM3 as number,
      pressurePa: value.releaseState.pressurePa as number,
      temperatureK: value.releaseState.temperatureK as number,
    };
  }
  return {
    modelVersion: PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION,
    provenance: 'captured',
    pressDurationS: value.pressDurationS as number | null,
    compressionDurationS: value.compressionDurationS as number | null,
    holdDurationS: value.holdDurationS as number | null,
    averageDownwardSpeedMPerS: value.averageDownwardSpeedMPerS as number | null,
    peakDownwardSpeedMPerS: value.peakDownwardSpeedMPerS as number | null,
    releaseVelocityMPerS: value.releaseVelocityMPerS as number | null,
    spaceReleaseOffsetS: value.spaceReleaseOffsetS as number | null,
    mouseReleaseOffsetS: value.mouseReleaseOffsetS as number | null,
    signedReleaseGapS: value.signedReleaseGapS as number | null,
    releaseOrder: value.releaseOrder as PistonOscillationReleaseOrder,
    trace,
    releaseState,
  };
};
