import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG,
  getPistonCylinderAreaM2,
  getPistonOscillationSmallSignalFrequencyFromLockedHeightHz,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  BASELINE_SENSOR_SEED,
  CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
  SAMPLE_RATE_HZ,
  calculateGammaFromHeightPeriods,
  createCandidate,
  createFrictionReleaseTrajectory,
  createGuidePressHistory,
  extractPrimaryExtrema,
  mean,
  median,
  observeRelease,
  parseRealRuns,
  quantile,
  simulateCandidateRun,
  summarize,
} from './pistonOscillationFrictionReallocationProbe.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(
  ROOT,
  '.codex-tmp',
  'piston-oscillation-wp-t3-0',
);
const JSON_OUTPUT_PATH = path.join(OUTPUT_DIR, 'tail-irregularity-probe.json');
const EVENT_CSV_PATH = path.join(OUTPUT_DIR, 'real-tail-events.csv');
const SELECTION_CSV_PATH = path.join(OUTPUT_DIR, 'selection-strategy-outcomes.csv');
const REPORT_PATH = path.join(OUTPUT_DIR, 'README.md');
const REAL_MAP_SVG_PATH = path.join(OUTPUT_DIR, 'real-tail-anomaly-map.svg');
const SELECTION_SVG_PATH = path.join(OUTPUT_DIR, 'real-selection-strategy.svg');
const CANDIDATE_SVG_PATH = path.join(OUTPUT_DIR, 'candidate-tail-comparison.svg');
const OUTCOME_SVG_PATH = path.join(OUTPUT_DIR, 'candidate-selection-outcomes.svg');

const SAMPLE_INTERVAL_S = 1 / SAMPLE_RATE_HZ;
const CURRENT_MODEL = createCandidate(CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M, 0);
const REAL_COMPARISON_START_S = 0.07;
const REAL_COMPARISON_END_S = 0.24;
const RESAMPLED_PHASE_COUNT = 41;
const EARLY_TEMPLATE_HALF_CYCLE_COUNT = 4;
const TAIL_HALF_CYCLE_COUNT = 6;
const EQUAL_SELECTION_PERIOD_COUNT = 3;
const GUIDE_HEIGHTS_MM = [80, 70, 60];
const GUIDE_RELEASE_AMPLITUDE_MM = 8;
const REFERENCE_GAMMA = 1.4;
const DISTORTION_SEEDS = Array.from(
  { length: 24 },
  (_, index) => (0x7f4a7c15 + index * 0x9e3779b1) >>> 0,
);
const GUIDE_EXPERIMENT_SEEDS = Array.from(
  { length: 96 },
  (_, index) => (0x3c6ef372 + index * 0x85ebca6b) >>> 0,
);
const MATCHED_RELEASE_AMPLITUDE_MM = new Map([
  [50, 10],
  [40, 9.25],
  [30, 7.75],
  [20, 7],
]);

const round = (value, digits = 6) => Number(value.toFixed(digits));

const rootMeanSquare = (values) => values.length === 0
  ? 0
  : Math.sqrt(mean(values.map((value) => value ** 2)));

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

const smoothstep = (value) => {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

const hashUnitInterval = (seed, index, salt = 0) => {
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

const quantizePressureKpa = (pressureKpa) => Math.trunc(pressureKpa * 100) / 100;

const interpolate = (values, samplePosition) => {
  const bounded = clamp(samplePosition, 0, values.length - 1);
  const left = Math.floor(bounded);
  const right = Math.ceil(bounded);
  if (left === right) return values[left] ?? values.at(-1) ?? 0;
  const fraction = bounded - left;
  return (values[left] ?? 0) * (1 - fraction) + (values[right] ?? 0) * fraction;
};

const centeredMovingAverage = (values, windowSamples) => {
  const radius = Math.floor(Math.max(1, windowSamples) / 2);
  const prefix = [0];
  for (const value of values) prefix.push((prefix.at(-1) ?? 0) + value);
  return values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    return ((prefix[end] ?? 0) - (prefix[start] ?? 0)) / Math.max(1, end - start);
  });
};

const getBaselineKpa = (pressuresKpa) => mean(pressuresKpa.slice(-100));

const oppositeType = (type) => type === 'peak' ? 'trough' : 'peak';

const findPhaseLockedRealExtrema = (run) => {
  const extrema = [];
  const maximumOrdinal = Math.floor(
    (run.faintVisibleUntilS - run.anchorTimeS) / (run.periodS / 2),
  );
  for (let ordinal = 0; ordinal <= maximumOrdinal; ordinal += 1) {
    const expectedTimeS = run.anchorTimeS + ordinal * run.periodS / 2;
    const type = ordinal % 2 === 0 ? run.anchorType : oppositeType(run.anchorType);
    const halfWindowS = Math.min(0.004, run.periodS * 0.2);
    const candidates = run.samples.filter((sample) => (
      Math.abs(sample.timeS - expectedTimeS) <= halfWindowS
    ));
    const selected = candidates.reduce((best, candidate) => {
      if (!best) return candidate;
      return type === 'peak'
        ? candidate.pressureKpa > best.pressureKpa ? candidate : best
        : candidate.pressureKpa < best.pressureKpa ? candidate : best;
    }, null);
    if (!selected) continue;
    extrema.push({
      ordinal,
      type,
      sampleIndex: selected.sampleIndex,
      timeS: selected.timeS,
      expectedTimeS,
      timingShiftMs: (selected.timeS - expectedTimeS) * 1_000,
      pressureKpa: selected.pressureKpa,
      deviationKpa: selected.pressureKpa - run.baselineKpa,
    });
  }
  return extrema;
};

const resampleHalfCycle = (pressuresKpa, leftIndex, rightIndex) => (
  Array.from({ length: RESAMPLED_PHASE_COUNT }, (_, phaseIndex) => {
    const phase = phaseIndex / (RESAMPLED_PHASE_COUNT - 1);
    return interpolate(pressuresKpa, leftIndex + phase * (rightIndex - leftIndex));
  })
);

const createHalfCycles = (pressuresKpa, extrema, sourceLabel) => {
  const rows = [];
  for (let ordinal = 0; ordinal < extrema.length - 1; ordinal += 1) {
    const left = extrema[ordinal];
    const right = extrema[ordinal + 1];
    if (!left || !right || right.sampleIndex <= left.sampleIndex) continue;
    const raw = pressuresKpa.slice(left.sampleIndex, right.sampleIndex + 1);
    const resampled = resampleHalfCycle(
      pressuresKpa,
      left.sampleIndex,
      right.sampleIndex,
    );
    const deltaKpa = right.pressureKpa - left.pressureKpa;
    const amplitudeKpa = Math.abs(deltaKpa);
    if (amplitudeKpa <= 0.02) continue;
    const normalized = resampled.map((value) => (value - left.pressureKpa) / deltaKpa);
    const direction = Math.sign(deltaKpa) || 1;
    const projectedRawDifferences = raw.slice(1).map((value, index) => (
      direction * (value - (raw[index] ?? value))
    ));
    const backtracks = projectedRawDifferences.filter((value) => value < 0);
    let maximumBacktrackKpa = 0;
    let maximumBacktrackPhase = null;
    projectedRawDifferences.forEach((value, index) => {
      if (value >= 0 || -value <= maximumBacktrackKpa) return;
      maximumBacktrackKpa = -value;
      maximumBacktrackPhase = (index + 0.5) / Math.max(1, raw.length - 1);
    });
    rows.push({
      sourceLabel,
      ordinal,
      left,
      right,
      midpointTimeS: (left.timeS + right.timeS) / 2,
      durationMs: (right.timeS - left.timeS) * 1_000,
      amplitudeKpa,
      raw,
      normalized,
      maximumBacktrackKpa,
      maximumBacktrackPhase,
      cumulativeBacktrackKpa: -backtracks.reduce((sum, value) => sum + value, 0),
      destinationType: right.type,
    });
  }
  return rows;
};

const createCanonicalTemplate = (halfCycles) => (
  Array.from({ length: RESAMPLED_PHASE_COUNT }, (_, phaseIndex) => median(
    halfCycles.map((halfCycle) => halfCycle.normalized[phaseIndex]),
  ))
);

const getPhaseBin = (phase) => {
  if (phase < 0.2) return '离开极值 0–20%';
  if (phase < 0.4) return '前段 20–40%';
  if (phase < 0.6) return '中段 40–60%';
  if (phase < 0.8) return '接近极值 60–80%';
  return '极值肩部 80–100%';
};

const scoreHalfCycleShape = (halfCycle, template) => {
  const residualNormalized = halfCycle.normalized.map((value, index) => (
    value - (template[index] ?? value)
  ));
  const residualKpa = residualNormalized.map((value) => value * halfCycle.amplitudeKpa);
  const slopeResidualNormalized = residualNormalized.slice(1).map((value, index) => (
    value - (residualNormalized[index] ?? value)
  ));
  let maximumResidualIndex = 0;
  for (let index = 1; index < residualKpa.length; index += 1) {
    if (Math.abs(residualKpa[index]) > Math.abs(residualKpa[maximumResidualIndex])) {
      maximumResidualIndex = index;
    }
  }
  const anomalyPhase = maximumResidualIndex / (RESAMPLED_PHASE_COUNT - 1);
  const eventPhase = halfCycle.maximumBacktrackKpa >= 0.02
    && halfCycle.maximumBacktrackPhase !== null
    ? halfCycle.maximumBacktrackPhase
    : anomalyPhase;
  return {
    ...halfCycle,
    residualRmsKpa: rootMeanSquare(residualKpa),
    residualPeakKpa: Math.abs(residualKpa[maximumResidualIndex] ?? 0),
    normalizedResidualRms: rootMeanSquare(residualNormalized),
    normalizedSlopeResidualRms: rootMeanSquare(slopeResidualNormalized),
    anomalyPhase,
    anomalyPhaseBin: getPhaseBin(anomalyPhase),
    eventPhase,
    eventPhaseBin: getPhaseBin(eventPhase),
    eventTimeS: halfCycle.left.timeS
      + eventPhase * (halfCycle.right.timeS - halfCycle.left.timeS),
  };
};

const analyzeWaveformShape = (pressuresKpa, extrema, sourceLabel, tailStartOrdinal) => {
  const halfCycles = createHalfCycles(pressuresKpa, extrema, sourceLabel);
  const early = halfCycles.slice(0, EARLY_TEMPLATE_HALF_CYCLE_COUNT);
  const template = createCanonicalTemplate(early);
  const scored = halfCycles.map((halfCycle) => scoreHalfCycleShape(halfCycle, template));
  const tail = scored.filter((row) => row.ordinal >= tailStartOrdinal)
    .slice(-TAIL_HALF_CYCLE_COUNT);
  return { template, halfCycles: scored, early: scored.slice(0, EARLY_TEMPLATE_HALF_CYCLE_COUNT), tail };
};

const getPeriodFromExtrema = (left, right, periodCount) => (
  (right.timeS - left.timeS) / periodCount
);

const getRealSelectionRows = (run, extrema) => {
  const sameType = extrema.filter((extremum) => extremum.type === run.anchorType);
  const earlyRight = sameType[run.periodCount];
  const tailRight = sameType.at(-1);
  const tailLeft = sameType.at(-(EQUAL_SELECTION_PERIOD_COUNT + 1));
  if (!sameType[0] || !earlyRight || !tailLeft || !tailRight) {
    throw new Error(`Run ${run.run} does not contain enough phase-locked extrema.`);
  }
  const extendedPeriodCount = sameType.length - 1;
  return [
    {
      strategy: '实测已确认早段',
      periodCount: run.periodCount,
      left: sameType[0],
      right: earlyRight,
      periodS: getPeriodFromExtrema(sameType[0], earlyRight, run.periodCount),
    },
    {
      strategy: '等长尾段 3 周期',
      periodCount: EQUAL_SELECTION_PERIOD_COUNT,
      left: tailLeft,
      right: tailRight,
      periodS: getPeriodFromExtrema(
        tailLeft,
        tailRight,
        EQUAL_SELECTION_PERIOD_COUNT,
      ),
    },
    {
      strategy: '从早段延伸至可见尾端',
      periodCount: extendedPeriodCount,
      left: sameType[0],
      right: tailRight,
      periodS: getPeriodFromExtrema(sameType[0], tailRight, extendedPeriodCount),
    },
  ].map((row) => ({
    ...row,
    run: run.run,
    heightMm: run.heightMm,
    referencePeriodS: run.periodS,
    periodErrorMs: (row.periodS - run.periodS) * 1_000,
    absolutePeriodErrorMs: Math.abs(row.periodS - run.periodS) * 1_000,
  }));
};

const calculateFitOutcome = (rows) => {
  const periods = rows.map((row) => ({
    nominalHeightMm: row.heightMm,
    periodMs: row.periodS * 1_000,
  }));
  const { slopeMPerS2, gamma } = calculateGammaFromHeightPeriods(periods);
  const x = periods.map((row) => (row.periodMs / 1_000) ** 2);
  const y = periods.map((row) => row.nominalHeightMm / 1_000);
  const meanX = mean(x);
  const meanY = mean(y);
  const interceptM = meanY - slopeMPerS2 * meanX;
  const residual = y.map((value, index) => value - (
    slopeMPerS2 * x[index] + interceptM
  ));
  const total = y.map((value) => value - meanY);
  const residualSumSquares = residual.reduce((sum, value) => sum + value ** 2, 0);
  const totalSumSquares = total.reduce((sum, value) => sum + value ** 2, 0);
  const rSquared = totalSumSquares === 0 ? 1 : 1 - residualSumSquares / totalSumSquares;
  return {
    slopeMPerS2,
    interceptM,
    gamma,
    relativeGammaErrorPercent: Math.abs(gamma - REFERENCE_GAMMA) / REFERENCE_GAMMA * 100,
    rSquared,
  };
};

const createTailIrregularityEvents = ({
  pressuresKpa,
  baselineKpa,
  expectedPeriodS,
  seed,
  config,
}) => {
  const deviations = pressuresKpa.map((value) => value - baselineKpa);
  const extrema = extractPrimaryExtrema(deviations, expectedPeriodS)
    .filter((extremum) => extremum.timeS <= config.maximumEventTimeS);
  const initialAmplitudeKpa = median(
    extrema.slice(0, 4).map((extremum) => Math.abs(extremum.deviationKpa)),
  ) ?? 1;
  const candidates = extrema.flatMap((extremum, ordinal) => {
    const previousExtremum = extrema[ordinal - 1];
    if (!previousExtremum) return [];
    const cycleOrdinal = ordinal / 2;
    const relativeAmplitude = Math.abs(extremum.deviationKpa) / initialAmplitudeKpa;
    if (
      cycleOrdinal < config.onsetCycle
      || relativeAmplitude > config.maximumRelativeAmplitude
      || Math.abs(extremum.deviationKpa) < config.minimumVisibleAmplitudeKpa
    ) return [];
    const tailDepth = clamp(
      (config.maximumRelativeAmplitude - relativeAmplitude)
        / Math.max(0.01, config.maximumRelativeAmplitude),
      0,
      1,
    );
    const priority = hashUnitInterval(seed, ordinal, 0x6d2b79f5);
    const probability = clamp(
      config.baseEventProbability + tailDepth * config.tailProbabilityGain,
      0,
      1,
    );
    return [{
      extremum,
      previousExtremum,
      ordinal,
      cycleOrdinal,
      relativeAmplitude,
      priority,
      probability,
    }];
  });
  const selected = candidates.filter((candidate) => candidate.priority <= candidate.probability);
  if (selected.length < config.minimumEventCount) {
    const supplements = [...candidates]
      .filter((candidate) => !selected.includes(candidate))
      .sort((left, right) => left.priority - right.priority)
      .slice(0, config.minimumEventCount - selected.length);
    selected.push(...supplements);
  }
  selected.sort((left, right) => left.extremum.timeS - right.extremum.timeS);
  return selected.slice(0, config.maximumEventCount).map((candidate, eventIndex) => {
    const timeShiftMs = config.minimumTimeShiftMs
      + hashUnitInterval(seed, eventIndex, 0x85ebca6b)
        * (config.maximumTimeShiftMs - config.minimumTimeShiftMs);
    const shiftDirection = hashUnitInterval(seed, eventIndex, 0xc2b2ae35) < 0.68 ? 1 : -1;
    const relativeShoulder = config.minimumShoulderFraction
      + hashUnitInterval(seed, eventIndex, 0x27d4eb2f)
        * (config.maximumShoulderFraction - config.minimumShoulderFraction);
    const shoulderAmplitudeKpa = clamp(
      Math.abs(candidate.extremum.deviationKpa) * relativeShoulder,
      config.minimumShoulderAmplitudeKpa,
      config.maximumShoulderAmplitudeKpa,
    );
    const phaseChoice = hashUnitInterval(seed, eventIndex, 0x165667b1);
    const eventPhase = phaseChoice < config.shoulderEventShare
      ? 0.66 + hashUnitInterval(seed, eventIndex, 0xd3a2646c) * 0.22
      : 0.22 + hashUnitInterval(seed, eventIndex, 0xfd7046c5) * 0.4;
    const centerTimeS = candidate.previousExtremum.timeS
      + eventPhase * (
        candidate.extremum.timeS - candidate.previousExtremum.timeS
      );
    const sourceDeviationKpa = interpolate(
      pressuresKpa,
      centerTimeS * SAMPLE_RATE_HZ,
    ) - baselineKpa;
    return {
      eventIndex,
      extremumOrdinal: candidate.ordinal,
      extremumType: candidate.extremum.type,
      destinationExtremumTimeS: candidate.extremum.timeS,
      eventPhase,
      centerTimeS,
      relativeAmplitude: candidate.relativeAmplitude,
      timeShiftMs: timeShiftMs * shiftDirection,
      shoulderAmplitudeKpa,
      sourceDeviationKpa,
    };
  });
};

const getWarpWindow = (timeS, event, halfPeriodS) => {
  const startS = event.centerTimeS - halfPeriodS * 0.28;
  const plateauStartS = event.centerTimeS - halfPeriodS * 0.06;
  const plateauEndS = event.centerTimeS + halfPeriodS * 0.06;
  const endS = event.centerTimeS + halfPeriodS * 0.28;
  if (timeS <= startS || timeS >= endS) return 0;
  if (timeS < plateauStartS) {
    return smoothstep((timeS - startS) / (plateauStartS - startS));
  }
  if (timeS <= plateauEndS) return 1;
  return 1 - smoothstep((timeS - plateauEndS) / (endS - plateauEndS));
};

const getShoulderOffsetKpa = (timeS, event, halfPeriodS) => {
  const signTowardBaseline = -Math.sign(event.sourceDeviationKpa || 1);
  const primaryCenterS = event.centerTimeS;
  const primarySigmaS = halfPeriodS * 0.08;
  const reboundCenterS = event.centerTimeS + halfPeriodS * 0.12;
  const reboundSigmaS = halfPeriodS * 0.065;
  const primary = Math.exp(-0.5 * ((timeS - primaryCenterS) / primarySigmaS) ** 2);
  const rebound = Math.exp(-0.5 * ((timeS - reboundCenterS) / reboundSigmaS) ** 2);
  return signTowardBaseline * event.shoulderAmplitudeKpa * (primary - 0.38 * rebound);
};

const applySeededTailIrregularities = ({
  pressuresKpa,
  expectedPeriodS,
  seed,
  config,
}) => {
  const baselineKpa = getBaselineKpa(pressuresKpa);
  const events = createTailIrregularityEvents({
    pressuresKpa,
    baselineKpa,
    expectedPeriodS,
    seed,
    config,
  });
  const halfPeriodS = expectedPeriodS / 2;
  const output = pressuresKpa.map((_, sampleIndex) => {
    const timeS = sampleIndex / SAMPLE_RATE_HZ;
    let sourceTimeShiftS = 0;
    let shoulderOffsetKpa = 0;
    for (const event of events) {
      const weight = getWarpWindow(timeS, event, halfPeriodS);
      sourceTimeShiftS += event.timeShiftMs / 1_000 * weight;
      shoulderOffsetKpa += getShoulderOffsetKpa(timeS, event, halfPeriodS) * weight;
    }
    const sourcePressureKpa = interpolate(
      pressuresKpa,
      (timeS - sourceTimeShiftS) * SAMPLE_RATE_HZ,
    );
    return quantizePressureKpa(sourcePressureKpa + shoulderOffsetKpa);
  });
  return { pressuresKpa: output, events, baselineKpa };
};

const toExtremaSequence = (pressuresKpa, baselineKpa, expectedPeriodS, endTimeS) => (
  extractPrimaryExtrema(
    pressuresKpa.map((value) => value - baselineKpa),
    expectedPeriodS,
  )
    .filter((extremum) => (
      extremum.timeS <= endTimeS
      && Math.abs(extremum.deviationKpa) >= 0.08
    ))
    .map((extremum, ordinal) => ({
      ...extremum,
      ordinal,
      pressureKpa: extremum.deviationKpa + baselineKpa,
    }))
);

const getIntrinsicShapeMetrics = ({
  pressuresKpa,
  expectedPeriodS,
  endTimeS,
  sourceLabel,
}) => {
  const baselineKpa = getBaselineKpa(pressuresKpa);
  const extrema = toExtremaSequence(
    pressuresKpa,
    baselineKpa,
    expectedPeriodS,
    endTimeS,
  );
  if (extrema.length < 8) return null;
  const tailStartOrdinal = Math.max(
    EARLY_TEMPLATE_HALF_CYCLE_COUNT,
    extrema.length - TAIL_HALF_CYCLE_COUNT - 1,
  );
  const shape = analyzeWaveformShape(
    pressuresKpa,
    extrema,
    sourceLabel,
    tailStartOrdinal,
  );
  if (shape.early.length === 0 || shape.tail.length === 0) return null;
  const earlySelection = getStrategyPeriod(extrema, 'early');
  const tailSelection = getStrategyPeriod(extrema, 'tail');
  if (!earlySelection || !tailSelection) return null;
  return {
    baselineKpa,
    extrema,
    shape,
    earlyNormalizedSlopeResidualRms: median(
      shape.early.map((row) => row.normalizedSlopeResidualRms),
    ),
    tailNormalizedSlopeResidualRms: median(
      shape.tail.map((row) => row.normalizedSlopeResidualRms),
    ),
    tailResidualPeakKpa: median(shape.tail.map((row) => row.residualPeakKpa)),
    tailMaximumBacktrackKpa: median(shape.tail.map((row) => row.maximumBacktrackKpa)),
    approachAnomalyShare: shape.tail.filter((row) => row.eventPhase >= 0.6).length
      / shape.tail.length,
    tailPeriodDeviationMs: Math.abs(
      tailSelection.periodS - earlySelection.periodS,
    ) * 1_000,
  };
};

const getStrategyPeriod = (extrema, strategy) => {
  const firstType = extrema[0]?.type;
  const sameType = extrema.filter((extremum) => extremum.type === firstType);
  if (sameType.length < EQUAL_SELECTION_PERIOD_COUNT + 1) return null;
  let left;
  let right;
  let periodCount;
  if (strategy === 'early') {
    left = sameType[0];
    right = sameType[EQUAL_SELECTION_PERIOD_COUNT];
    periodCount = EQUAL_SELECTION_PERIOD_COUNT;
  } else if (strategy === 'tail') {
    left = sameType.at(-(EQUAL_SELECTION_PERIOD_COUNT + 1));
    right = sameType.at(-1);
    periodCount = EQUAL_SELECTION_PERIOD_COUNT;
  } else {
    left = sameType[0];
    right = sameType.at(-1);
    periodCount = sameType.length - 1;
  }
  if (!left || !right || periodCount <= 0) return null;
  return {
    periodS: (right.timeS - left.timeS) / periodCount,
    periodCount,
    leftTimeS: left.timeS,
    rightTimeS: right.timeS,
  };
};

const evaluateGuideSelectionStrategy = (seriesByHeight, strategy) => {
  const rows = GUIDE_HEIGHTS_MM.map((heightMm) => {
    const pressuresKpa = seriesByHeight.get(heightMm);
    const expectedPeriodS = 1 / getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(
      heightMm,
      { ambientPressurePa: 101_325 },
    );
    const baselineKpa = getBaselineKpa(pressuresKpa);
    const extrema = toExtremaSequence(
      pressuresKpa,
      baselineKpa,
      expectedPeriodS,
      0.26,
    );
    const selected = getStrategyPeriod(extrema, strategy);
    if (!selected) throw new Error(`No ${strategy} selection at ${heightMm} mm.`);
    return {
      heightMm,
      ...selected,
    };
  });
  return { rows, ...calculateFitOutcome(rows) };
};

const evaluateCandidateConfig = ({
  config,
  realBaseRows,
  realTargets,
}) => {
  const metrics = [];
  for (const seed of DISTORTION_SEEDS) {
    for (const base of realBaseRows) {
      const candidate = applySeededTailIrregularities({
        pressuresKpa: base.pressuresKpa,
        expectedPeriodS: base.run.periodS,
        seed: seed ^ base.run.run,
        config,
      });
      const shape = getIntrinsicShapeMetrics({
        pressuresKpa: candidate.pressuresKpa,
        expectedPeriodS: base.run.periodS,
        endTimeS: Math.min(base.run.faintVisibleUntilS, 0.26),
        sourceLabel: `candidate-${base.run.run}-${seed}`,
      });
      if (!shape) continue;
      metrics.push({ ...shape, eventCount: candidate.events.length });
    }
  }
  if (metrics.length === 0) return { config, score: Number.POSITIVE_INFINITY, metrics: [] };
  const candidateTailResidualPeaksKpa = metrics.flatMap((row) => (
    row.shape.tail.map((halfCycle) => halfCycle.residualPeakKpa)
  ));
  const summary = {
    tailNormalizedSlopeResidualRms: median(
      metrics.map((row) => row.tailNormalizedSlopeResidualRms),
    ),
    tailResidualPeakKpa: median(metrics.map((row) => row.tailResidualPeakKpa)),
    tailResidualPeakP90Kpa: quantile(candidateTailResidualPeaksKpa, 0.9),
    tailMaximumBacktrackKpa: median(metrics.map((row) => row.tailMaximumBacktrackKpa)),
    approachAnomalyShare: mean(metrics.map((row) => row.approachAnomalyShare)),
    eventCount: mean(metrics.map((row) => row.eventCount)),
    tailPeriodDeviationMs: median(metrics.map((row) => row.tailPeriodDeviationMs)),
  };
  const logDistance = (observed, target, floor) => Math.abs(Math.log(
    (observed + floor) / (target + floor),
  ));
  const score =
    logDistance(
      summary.tailNormalizedSlopeResidualRms,
      realTargets.tailNormalizedSlopeResidualRms,
      0.001,
    )
    + logDistance(summary.tailResidualPeakKpa, realTargets.tailResidualPeakKpa, 0.01)
    + logDistance(
      summary.tailResidualPeakP90Kpa,
      realTargets.anomalyResidualPeakP90Kpa,
      0.02,
    )
    + logDistance(
      summary.tailMaximumBacktrackKpa,
      realTargets.tailMaximumBacktrackKpa,
      0.01,
    )
    + logDistance(
      summary.tailPeriodDeviationMs,
      realTargets.tailPeriodAbsoluteErrorMedianMs,
      0.1,
    ) * 1.5
    + Math.abs(summary.approachAnomalyShare - realTargets.approachAnomalyShare)
    + Math.abs(summary.eventCount - realTargets.anomalyCountPerRun) * 0.2;
  return { config, score, summary, metrics };
};

const evaluateGuideConfigPilot = ({
  config,
  baselineSeriesByExperimentSeed,
  experimentSeeds,
}) => {
  const rows = experimentSeeds.map((experimentSeed) => {
    const baselineSeries = baselineSeriesByExperimentSeed.get(experimentSeed);
    const candidateSeries = new Map();
    for (const heightMm of GUIDE_HEIGHTS_MM) {
      const base = baselineSeries.get(heightMm);
      const expectedPeriodS = 1 / getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(
        heightMm,
        { ambientPressurePa: 101_325 },
      );
      const candidate = applySeededTailIrregularities({
        pressuresKpa: base,
        expectedPeriodS,
        seed: (experimentSeed ^ Math.imul(heightMm, 0x85ebca6b)) >>> 0,
        config,
      });
      candidateSeries.set(heightMm, candidate.pressuresKpa);
    }
    const early = evaluateGuideSelectionStrategy(candidateSeries, 'early');
    const tail = evaluateGuideSelectionStrategy(candidateSeries, 'tail');
    return {
      experimentSeed,
      earlyGammaErrorPercent: early.relativeGammaErrorPercent,
      tailGammaErrorPercent: tail.relativeGammaErrorPercent,
      gammaErrorIncreasePercentagePoints:
        tail.relativeGammaErrorPercent - early.relativeGammaErrorPercent,
      tailWorse: tail.relativeGammaErrorPercent > early.relativeGammaErrorPercent,
    };
  });
  return {
    experimentCount: rows.length,
    gammaErrorIncreasePercentagePoints: summarizeDistribution(
      rows.map((row) => row.gammaErrorIncreasePercentagePoints),
    ),
    tailWorseShare: mean(rows.map((row) => Number(row.tailWorse))),
  };
};

const createCandidateGrid = () => {
  const rows = [];
  let id = 0;
  for (const onsetCycle of [3.75, 4.5]) {
    for (const maximumTimeShiftMs of [1.2, 1.8, 2.4]) {
      for (const maximumShoulderAmplitudeKpa of [0.14, 0.25, 0.4]) {
        for (const shoulderEventShare of [0.35, 0.5, 0.65]) {
        rows.push({
          id: `tail-irregularity-${String(id += 1).padStart(2, '0')}`,
          onsetCycle,
          maximumRelativeAmplitude: 0.55,
          minimumVisibleAmplitudeKpa: 0.1,
          maximumEventTimeS: 0.25,
          baseEventProbability: 0.35,
          tailProbabilityGain: 0.4,
          minimumEventCount: 2,
          maximumEventCount: 5,
          shoulderEventShare,
          minimumTimeShiftMs: 0.4,
          maximumTimeShiftMs,
          minimumShoulderFraction: 0.025,
          maximumShoulderFraction: 0.22,
          minimumShoulderAmplitudeKpa: 0.02,
          maximumShoulderAmplitudeKpa,
        });
        }
      }
    }
  }
  return rows;
};

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const mapValue = (value, inputMinimum, inputMaximum, outputMinimum, outputMaximum) => (
  outputMinimum + (value - inputMinimum) / (inputMaximum - inputMinimum)
    * (outputMaximum - outputMinimum)
);

const svgPolyline = (points, mapX, mapY, stroke, width = 2, dash = '') => (
  `<polyline points="${points.map((point) => `${mapX(point.x)},${mapY(point.y)}`).join(' ')}" `
  + `fill="none" stroke="${stroke}" stroke-width="${width}" `
  + `${dash ? `stroke-dasharray="${dash}" ` : ''}stroke-linecap="round" stroke-linejoin="round"/>`
);

const createRealAnomalyMapSvg = (realAnalyses, anomalyDisplayScaleKpa) => {
  const width = 1600;
  const height = 980;
  const margin = { left: 92, right: 42, top: 135, bottom: 70 };
  const gapX = 70;
  const gapY = 90;
  const panelWidth = (width - margin.left - margin.right - gapX) / 2;
  const panelHeight = (height - margin.top - margin.bottom - gapY) / 2;
  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];
  lines.push('<rect width="100%" height="100%" fill="#fbfcfe"/>');
  lines.push('<text x="800" y="48" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="30" font-weight="700" fill="#172b4d">四组实测尾段局部异常位置</text>');
  lines.push('<text x="800" y="82" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="16" fill="#475467">蓝线：相对平衡压力；橙色圆：超过早段 90% 形态残差阈值的半周期异常中心</text>');
  realAnalyses.forEach((analysis, panelIndex) => {
    const column = panelIndex % 2;
    const row = Math.floor(panelIndex / 2);
    const left = margin.left + column * (panelWidth + gapX);
    const top = margin.top + row * (panelHeight + gapY);
    const x = (value) => mapValue(value, REAL_COMPARISON_START_S, REAL_COMPARISON_END_S, left, left + panelWidth);
    const y = (value) => mapValue(value, -7, 7, top + panelHeight, top);
    for (const tick of [-6, -3, 0, 3, 6]) {
      lines.push(`<line x1="${left}" x2="${left + panelWidth}" y1="${y(tick)}" y2="${y(tick)}" stroke="#e4e7ec"/>`);
      lines.push(`<text x="${left - 12}" y="${y(tick) + 5}" text-anchor="end" font-family="Segoe UI" font-size="12" fill="#667085">${tick}</text>`);
    }
    for (const tick of [0.08, 0.12, 0.16, 0.20, 0.24]) {
      lines.push(`<line x1="${x(tick)}" x2="${x(tick)}" y1="${top}" y2="${top + panelHeight}" stroke="#eef1f5"/>`);
      lines.push(`<text x="${x(tick)}" y="${top + panelHeight + 24}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#667085">${tick.toFixed(2)}</text>`);
    }
    const points = analysis.run.samples
      .filter((sample) => sample.timeS >= REAL_COMPARISON_START_S && sample.timeS <= REAL_COMPARISON_END_S)
      .map((sample) => ({ x: sample.timeS, y: sample.pressureKpa - analysis.run.baselineKpa }));
    lines.push(svgPolyline(points, x, y, '#1677b8', 2.6));
    const tailStartS = analysis.run.anchorTimeS + analysis.run.periodCount * analysis.run.periodS;
    lines.push(`<line x1="${x(clamp(tailStartS, REAL_COMPARISON_START_S, REAL_COMPARISON_END_S))}" x2="${x(clamp(tailStartS, REAL_COMPARISON_START_S, REAL_COMPARISON_END_S))}" y1="${top}" y2="${top + panelHeight}" stroke="#7f8ea3" stroke-dasharray="6 5"/>`);
    analysis.anomalyEvents
      .filter((event) => event.midpointTimeS >= REAL_COMPARISON_START_S && event.midpointTimeS <= REAL_COMPARISON_END_S)
      .forEach((event) => {
        const sampleIndex = Math.round(event.eventTimeS * SAMPLE_RATE_HZ);
        const pressureKpa = analysis.run.samples[sampleIndex]?.pressureKpa ?? analysis.run.baselineKpa;
        const radius = 5 + Math.min(7, event.residualPeakKpa / Math.max(0.01, anomalyDisplayScaleKpa) * 2);
        lines.push(`<circle cx="${x(event.eventTimeS)}" cy="${y(pressureKpa - analysis.run.baselineKpa)}" r="${radius}" fill="#f79009" fill-opacity="0.24" stroke="#dc6803" stroke-width="2"/>`);
      });
    lines.push(`<text x="${left + 12}" y="${top + 25}" font-family="Segoe UI, Microsoft YaHei" font-size="20" font-weight="700" fill="#172b4d">运行 ${analysis.run.run} · ${analysis.run.heightMm} mm</text>`);
    lines.push(`<text x="${left + 12}" y="${top + 50}" font-family="Segoe UI, Microsoft YaHei" font-size="13" fill="#667085">尾段异常 ${analysis.anomalyEvents.length} 个；虚线为已确认早段终点</text>`);
    lines.push(`<rect x="${left}" y="${top}" width="${panelWidth}" height="${panelHeight}" fill="none" stroke="#98a2b3"/>`);
  });
  lines.push('<text x="800" y="958" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">横轴：释放后时间 / s　纵轴：相对平衡压力 / kPa　数据：四组 1000 Hz 实测记录</text>');
  lines.push('</svg>');
  return lines.join('\n');
};

const createSelectionStrategySvg = (selectionRows, fitOutcomes) => {
  const width = 1500;
  const height = 720;
  const strategies = ['实测已确认早段', '等长尾段 3 周期', '从早段延伸至可见尾端'];
  const colors = ['#1677b8', '#dc6803', '#667085'];
  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];
  lines.push('<rect width="100%" height="100%" fill="#fbfcfe"/>');
  lines.push('<text x="750" y="48" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="30" font-weight="700" fill="#172b4d">实测曲线：框选策略会怎样改变周期与最终结果</text>');
  const left = 110;
  const top = 125;
  const chartWidth = 820;
  const chartHeight = 470;
  const xGroup = (runIndex) => left + (runIndex + 0.5) * chartWidth / 4;
  const y = (value) => mapValue(value, -2.5, 2.5, top + chartHeight, top);
  for (const tick of [-2, -1, 0, 1, 2]) {
    lines.push(`<line x1="${left}" x2="${left + chartWidth}" y1="${y(tick)}" y2="${y(tick)}" stroke="${tick === 0 ? '#98a2b3' : '#e4e7ec'}"/>`);
    lines.push(`<text x="${left - 16}" y="${y(tick) + 5}" text-anchor="end" font-family="Segoe UI" font-size="13" fill="#667085">${tick.toFixed(1)}</text>`);
  }
  for (let runIndex = 0; runIndex < 4; runIndex += 1) {
    lines.push(`<text x="${xGroup(runIndex)}" y="${top + chartHeight + 30}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#344054">运行 ${runIndex + 1}</text>`);
    strategies.forEach((strategy, strategyIndex) => {
      const row = selectionRows.find((item) => item.run === runIndex + 1 && item.strategy === strategy);
      const x = xGroup(runIndex) + (strategyIndex - 1) * 42;
      const value = row?.periodErrorMs ?? 0;
      lines.push(`<line x1="${x}" x2="${x}" y1="${y(0)}" y2="${y(value)}" stroke="${colors[strategyIndex]}" stroke-width="4"/>`);
      lines.push(`<circle cx="${x}" cy="${y(value)}" r="7" fill="${strategyIndex === 2 ? '#fff' : colors[strategyIndex]}" stroke="${colors[strategyIndex]}" stroke-width="3"/>`);
      lines.push(`<text x="${x}" y="${y(value) + (value >= 0 ? -13 : 22)}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#344054">${value >= 0 ? '+' : ''}${value.toFixed(2)}</text>`);
    });
  }
  lines.push(`<text x="${left + chartWidth / 2}" y="${top + chartHeight + 65}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="15" fill="#475467">相对已确认早段的单周期偏差 / ms</text>`);
  const cardLeft = 1010;
  lines.push(`<text x="${cardLeft}" y="${top}" font-family="Segoe UI, Microsoft YaHei" font-size="21" font-weight="700" fill="#172b4d">四组联合拟合</text>`);
  strategies.forEach((strategy, index) => {
    const outcome = fitOutcomes.find((row) => row.strategy === strategy);
    const cardTop = top + 35 + index * 145;
    lines.push(`<rect x="${cardLeft}" y="${cardTop}" width="390" height="118" rx="12" fill="#fff" stroke="${colors[index]}" stroke-width="2"/>`);
    lines.push(`<text x="${cardLeft + 18}" y="${cardTop + 28}" font-family="Segoe UI, Microsoft YaHei" font-size="16" font-weight="700" fill="#344054">${escapeXml(strategy)}</text>`);
    lines.push(`<text x="${cardLeft + 18}" y="${cardTop + 64}" font-family="Segoe UI" font-size="25" font-weight="700" fill="${colors[index]}">γ = ${outcome.gamma.toFixed(4)}</text>`);
    lines.push(`<text x="${cardLeft + 205}" y="${cardTop + 61}" font-family="Segoe UI" font-size="14" fill="#475467">|误差| ${outcome.relativeGammaErrorPercent.toFixed(2)}%</text>`);
    lines.push(`<text x="${cardLeft + 205}" y="${cardTop + 87}" font-family="Segoe UI" font-size="14" fill="#475467">R² ${outcome.rSquared.toFixed(4)}</text>`);
  });
  strategies.forEach((strategy, index) => {
    const legendX = 215 + index * 310;
    lines.push(`<line x1="${legendX}" x2="${legendX + 32}" y1="92" y2="92" stroke="${colors[index]}" stroke-width="4"/>`);
    lines.push(`<text x="${legendX + 42}" y="98" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#344054">${escapeXml(strategy)}</text>`);
  });
  lines.push('</svg>');
  return lines.join('\n');
};

const createCandidateComparisonSvg = (panels) => {
  const width = 1600;
  const height = 980;
  const margin = { left: 92, right: 42, top: 135, bottom: 70 };
  const gapX = 70;
  const gapY = 90;
  const panelWidth = (width - margin.left - margin.right - gapX) / 2;
  const panelHeight = (height - margin.top - margin.bottom - gapY) / 2;
  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];
  lines.push('<rect width="100%" height="100%" fill="#fbfcfe"/>');
  lines.push('<text x="800" y="48" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="30" font-weight="700" fill="#172b4d">尾端局部削折候选（0.10–0.24 s 放大，同轴）</text>');
  lines.push('<text x="800" y="82" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="16" fill="#475467">实测用于形态参照；候选只在采集数据层加入带种子的局部时移与削肩</text>');
  const legends = [
    { label: '四组实测', color: '#1677b8', dash: '' },
    { label: '当前软件基线', color: '#667085', dash: '8 6' },
    { label: '临时尾端候选', color: '#dc6803', dash: '' },
  ];
  legends.forEach((legend, index) => {
    const x = 360 + index * 310;
    lines.push(`<line x1="${x}" x2="${x + 46}" y1="108" y2="108" stroke="${legend.color}" stroke-width="4" ${legend.dash ? `stroke-dasharray="${legend.dash}"` : ''}/>`);
    lines.push(`<text x="${x + 58}" y="114" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#344054">${legend.label}</text>`);
  });
  panels.forEach((panel, panelIndex) => {
    const column = panelIndex % 2;
    const row = Math.floor(panelIndex / 2);
    const left = margin.left + column * (panelWidth + gapX);
    const top = margin.top + row * (panelHeight + gapY);
    const x = (value) => mapValue(value, 0.10, 0.24, left, left + panelWidth);
    const y = (value) => mapValue(value, -4, 4, top + panelHeight, top);
    for (const tick of [-3, -1.5, 0, 1.5, 3]) {
      lines.push(`<line x1="${left}" x2="${left + panelWidth}" y1="${y(tick)}" y2="${y(tick)}" stroke="#e4e7ec"/>`);
    }
    for (const tick of [0.10, 0.13, 0.16, 0.19, 0.22, 0.24]) {
      lines.push(`<line x1="${x(tick)}" x2="${x(tick)}" y1="${top}" y2="${top + panelHeight}" stroke="#eef1f5"/>`);
      lines.push(`<text x="${x(tick)}" y="${top + panelHeight + 23}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#667085">${tick.toFixed(2)}</text>`);
    }
    const createPoints = (values, baselineKpa) => values
      .map((value, sampleIndex) => ({ x: sampleIndex / SAMPLE_RATE_HZ, y: value - baselineKpa }))
      .filter((point) => point.x >= 0.10 && point.x <= 0.24);
    lines.push(svgPolyline(createPoints(panel.real, panel.realBaselineKpa), x, y, '#1677b8', 2.5));
    lines.push(svgPolyline(createPoints(panel.baseline, panel.baselineKpa), x, y, '#667085', 2.2, '8 6'));
    lines.push(svgPolyline(createPoints(panel.candidate, panel.candidateBaselineKpa), x, y, '#dc6803', 2.8));
    for (const event of panel.events) {
      if (event.centerTimeS < 0.10 || event.centerTimeS > 0.24) continue;
      lines.push(`<line x1="${x(event.centerTimeS)}" x2="${x(event.centerTimeS)}" y1="${top + 8}" y2="${top + 34}" stroke="#dc6803" stroke-width="3"/>`);
    }
    lines.push(`<text x="${left + 12}" y="${top + 26}" font-family="Segoe UI, Microsoft YaHei" font-size="20" font-weight="700" fill="#172b4d">${panel.heightMm} mm</text>`);
    lines.push(`<text x="${left + 12}" y="${top + 51}" font-family="Segoe UI, Microsoft YaHei" font-size="13" fill="#667085">本次种子产生 ${panel.events.length} 个局部削折</text>`);
    lines.push(`<rect x="${left}" y="${top}" width="${panelWidth}" height="${panelHeight}" fill="none" stroke="#98a2b3"/>`);
  });
  lines.push('<text x="800" y="958" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">横轴：释放后时间 / s　纵轴：相对平衡压力 / kPa；所有面板采用相同坐标范围</text>');
  lines.push('</svg>');
  return lines.join('\n');
};

const createOutcomeSvg = (strategySummaries) => {
  const width = 1450;
  const height = 720;
  const strategies = ['early', 'tail', 'extended'];
  const labels = { early: '早段 3 周期', tail: '尾段 3 周期', extended: '早段至尾端' };
  const colors = { early: '#1677b8', tail: '#dc6803', extended: '#667085' };
  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];
  lines.push('<rect width="100%" height="100%" fill="#fbfcfe"/>');
  lines.push('<text x="725" y="48" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="30" font-weight="700" fill="#172b4d">96 组固定种子实验：框选策略的结果分布</text>');
  const maximumGammaP90 = Math.max(...strategySummaries.map((row) => row.gammaError.p90));
  const maximumFitLossP90 = Math.max(...strategySummaries.map((row) => row.rSquaredLoss.p90));
  const panels = [
    {
      key: 'gammaError',
      title: 'γ 绝对相对误差 / %',
      maximum: Math.max(4, Math.ceil(maximumGammaP90 * 1.18 / 2) * 2),
    },
    {
      key: 'rSquaredLoss',
      title: '拟合损失 1 − R²',
      maximum: Math.max(0.02, Math.ceil(maximumFitLossP90 * 120) / 100),
    },
  ];
  panels.forEach((panel, panelIndex) => {
    const left = 110 + panelIndex * 700;
    const top = 135;
    const chartWidth = 560;
    const chartHeight = 420;
    const y = (value) => mapValue(value, 0, panel.maximum, top + chartHeight, top);
    for (let tickIndex = 0; tickIndex <= 4; tickIndex += 1) {
      const tick = panel.maximum * tickIndex / 4;
      lines.push(`<line x1="${left}" x2="${left + chartWidth}" y1="${y(tick)}" y2="${y(tick)}" stroke="#e4e7ec"/>`);
      lines.push(`<text x="${left - 12}" y="${y(tick) + 5}" text-anchor="end" font-family="Segoe UI" font-size="12" fill="#667085">${tick.toFixed(panel.maximum < 1 ? 3 : 1)}</text>`);
    }
    lines.push(`<text x="${left + chartWidth / 2}" y="100" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="20" font-weight="700" fill="#344054">${panel.title}</text>`);
    strategies.forEach((strategy, strategyIndex) => {
      const summary = strategySummaries.find((row) => row.strategy === strategy);
      const values = panel.key === 'gammaError' ? summary.gammaError : summary.rSquaredLoss;
      const x = left + (strategyIndex + 0.5) * chartWidth / 3;
      lines.push(`<line x1="${x}" x2="${x}" y1="${y(values.p10)}" y2="${y(values.p90)}" stroke="${colors[strategy]}" stroke-width="5" stroke-linecap="round"/>`);
      lines.push(`<rect x="${x - 34}" y="${y(values.p75)}" width="68" height="${Math.max(2, y(values.p25) - y(values.p75))}" fill="#fff" stroke="${colors[strategy]}" stroke-width="3"/>`);
      lines.push(`<line x1="${x - 34}" x2="${x + 34}" y1="${y(values.median)}" y2="${y(values.median)}" stroke="${colors[strategy]}" stroke-width="4"/>`);
      lines.push(`<text x="${x}" y="${top + chartHeight + 30}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#344054">${labels[strategy]}</text>`);
      lines.push(`<text x="${x}" y="${y(values.p90) - 12}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#475467">中位 ${values.median.toFixed(panel.maximum < 1 ? 3 : 2)}</text>`);
    });
    lines.push(`<rect x="${left}" y="${top}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#98a2b3"/>`);
  });
  lines.push('<text x="725" y="640" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="15" fill="#475467">须线为 P10–P90，箱体为 P25–P75，横线为中位数；每组实验包含 80/70/60 mm 三条独立种子曲线</text>');
  lines.push('</svg>');
  return lines.join('\n');
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const writeCsv = (filePath, rows) => {
  if (rows.length === 0) {
    fs.writeFileSync(filePath, '', 'utf8');
    return;
  }
  const headers = Object.keys(rows[0]);
  const content = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
  fs.writeFileSync(filePath, `${content}\n`, 'utf8');
};

const summarizeDistribution = (values) => ({
  minimum: Math.min(...values),
  p10: quantile(values, 0.1),
  p25: quantile(values, 0.25),
  median: quantile(values, 0.5),
  p75: quantile(values, 0.75),
  p90: quantile(values, 0.9),
  maximum: Math.max(...values),
});

const runProbe = () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const realRuns = parseRealRuns();
  const preliminaryRealAnalyses = realRuns.map((run) => {
    const extrema = findPhaseLockedRealExtrema(run);
    const shape = analyzeWaveformShape(
      run.samples.map((sample) => sample.pressureKpa),
      extrema,
      `real-${run.run}`,
      run.periodCount * 2,
    );
    return { run, extrema, shape };
  });
  const earlyNormalizedSlopeResiduals = preliminaryRealAnalyses.flatMap((analysis) => (
    analysis.shape.early.map((row) => row.normalizedSlopeResidualRms)
  ));
  const anomalyThresholdNormalizedSlopeResidualRms = Math.max(
    0.004,
    quantile(earlyNormalizedSlopeResiduals, 0.9) * 1.35,
  );
  const realAnalyses = preliminaryRealAnalyses.map((analysis) => {
    const anomalyEvents = analysis.shape.tail.filter((row) => (
      (
        row.normalizedSlopeResidualRms
          > anomalyThresholdNormalizedSlopeResidualRms
        && row.residualPeakKpa >= 0.03
      )
      || row.maximumBacktrackKpa >= 0.02
    ));
    return { ...analysis, anomalyEvents };
  });
  const realEarly = realAnalyses.flatMap((analysis) => analysis.shape.early);
  const realTail = realAnalyses.flatMap((analysis) => analysis.shape.tail);
  const realAnomalies = realAnalyses.flatMap((analysis) => analysis.anomalyEvents);
  const realSelectionRows = realAnalyses.flatMap((analysis) => (
    getRealSelectionRows(analysis.run, analysis.extrema)
  ));
  const realTailSelectionRows = realSelectionRows.filter((row) => (
    row.strategy === '等长尾段 3 周期'
  ));
  const realTargets = {
    earlyNormalizedSlopeResidualRms: median(
      realEarly.map((row) => row.normalizedSlopeResidualRms),
    ),
    tailNormalizedSlopeResidualRms: median(
      realTail.map((row) => row.normalizedSlopeResidualRms),
    ),
    tailResidualPeakKpa: median(realTail.map((row) => row.residualPeakKpa)),
    tailMaximumBacktrackKpa: median(
      realAnomalies.map((row) => row.maximumBacktrackKpa),
    ),
    approachAnomalyShare: realAnomalies.filter((row) => row.eventPhase >= 0.6).length
      / Math.max(1, realAnomalies.length),
    anomalyThresholdNormalizedSlopeResidualRms,
    anomalyCountPerRun: realAnomalies.length / realRuns.length,
    anomalyResidualPeakMedianKpa: median(
      realAnomalies.map((row) => row.residualPeakKpa),
    ),
    anomalyResidualPeakP90Kpa: quantile(
      realAnomalies.map((row) => row.residualPeakKpa),
      0.9,
    ),
    anomalyResidualPeakMaximumKpa: Math.max(
      ...realAnomalies.map((row) => row.residualPeakKpa),
    ),
    tailPeriodAbsoluteErrorMedianMs: median(
      realTailSelectionRows.map((row) => row.absolutePeriodErrorMs),
    ),
  };
  const realFitOutcomes = [...new Set(realSelectionRows.map((row) => row.strategy))]
    .map((strategy) => ({
      strategy,
      ...calculateFitOutcome(realSelectionRows.filter((row) => row.strategy === strategy)),
    }));

  const realBaseRows = realRuns.map((run) => {
    const amplitudeMm = MATCHED_RELEASE_AMPLITUDE_MM.get(run.heightMm);
    if (amplitudeMm === undefined) throw new Error(`Missing amplitude at ${run.heightMm} mm.`);
    const simulation = simulateCandidateRun(
      run,
      CURRENT_MODEL,
      amplitudeMm,
      BASELINE_SENSOR_SEED,
    );
    return { run, amplitudeMm, pressuresKpa: simulation.pressuresKpa };
  });
  const candidateEvaluations = createCandidateGrid()
    .map((config) => evaluateCandidateConfig({ config, realBaseRows, realTargets }));
  const guidePhysicalByHeight = new Map(GUIDE_HEIGHTS_MM.map((heightMm) => {
    const press = createGuidePressHistory(heightMm, GUIDE_RELEASE_AMPLITUDE_MM);
    const trajectory = createFrictionReleaseTrajectory(press, CURRENT_MODEL);
    return [heightMm, { press, trajectory }];
  }));
  const baselineSeriesByExperimentSeed = new Map(
    GUIDE_EXPERIMENT_SEEDS.map((experimentSeed) => [
      experimentSeed,
      new Map(GUIDE_HEIGHTS_MM.map((heightMm) => {
        const physical = guidePhysicalByHeight.get(heightMm);
        const sensorSeed = (experimentSeed ^ Math.imul(heightMm, 0x27d4eb2d)) >>> 0;
        return [heightMm, observeRelease(physical.press, physical.trajectory, sensorSeed)];
      })),
    ]),
  );
  const realGammaErrorIncreasePercentagePoints =
    realFitOutcomes.find((row) => row.strategy === '等长尾段 3 周期').relativeGammaErrorPercent
    - realFitOutcomes.find((row) => row.strategy === '实测已确认早段').relativeGammaErrorPercent;
  const pilotSeeds = GUIDE_EXPERIMENT_SEEDS;
  for (const evaluation of candidateEvaluations) {
    evaluation.guidePilot = evaluateGuideConfigPilot({
      config: evaluation.config,
      baselineSeriesByExperimentSeed,
      experimentSeeds: pilotSeeds,
    });
    const pilotIncrease = evaluation.guidePilot
      .gammaErrorIncreasePercentagePoints.median;
    const consequenceDistance = Math.abs(Math.log(
      (Math.max(0, pilotIncrease) + 0.25)
      / (realGammaErrorIncreasePercentagePoints + 0.25),
    ));
    const weakDirectionPenalty = Math.max(
      0,
      0.65 - evaluation.guidePilot.tailWorseShare,
    ) * 3;
    const excessiveTailPenalty = Math.max(
      0,
      evaluation.guidePilot.gammaErrorIncreasePercentagePoints.p90
        - realGammaErrorIncreasePercentagePoints * 3,
    ) / 10;
    evaluation.combinedScore = evaluation.score
      + consequenceDistance * 1.5
      + weakDirectionPenalty
      + excessiveTailPenalty;
  }
  candidateEvaluations.sort((left, right) => left.combinedScore - right.combinedScore);
  const selectedEvaluation = candidateEvaluations[0];
  if (!selectedEvaluation || !Number.isFinite(selectedEvaluation.score)) {
    throw new Error('No usable tail-irregularity configuration was found.');
  }
  const selectedConfig = selectedEvaluation.config;

  const comparisonPanels = realBaseRows.map((base) => {
    const candidate = applySeededTailIrregularities({
      pressuresKpa: base.pressuresKpa,
      expectedPeriodS: base.run.periodS,
      seed: 0x9e3779b9 ^ base.run.run,
      config: selectedConfig,
    });
    return {
      heightMm: base.run.heightMm,
      real: base.run.samples.map((sample) => sample.pressureKpa),
      realBaselineKpa: base.run.baselineKpa,
      baseline: base.pressuresKpa,
      baselineKpa: getBaselineKpa(base.pressuresKpa),
      candidate: candidate.pressuresKpa,
      candidateBaselineKpa: getBaselineKpa(candidate.pressuresKpa),
      events: candidate.events,
    };
  });

  const guideExperimentOutcomes = [];
  for (const experimentSeed of GUIDE_EXPERIMENT_SEEDS) {
    const baselineSeries = baselineSeriesByExperimentSeed.get(experimentSeed);
    const candidateSeries = new Map();
    for (const heightMm of GUIDE_HEIGHTS_MM) {
      const base = baselineSeries.get(heightMm);
      const expectedPeriodS = 1 / getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(
        heightMm,
        { ambientPressurePa: 101_325 },
      );
      const candidate = applySeededTailIrregularities({
        pressuresKpa: base,
        expectedPeriodS,
        seed: (experimentSeed ^ Math.imul(heightMm, 0x85ebca6b)) >>> 0,
        config: selectedConfig,
      });
      candidateSeries.set(heightMm, candidate.pressuresKpa);
    }
    for (const strategy of ['early', 'tail', 'extended']) {
      const baseline = evaluateGuideSelectionStrategy(baselineSeries, strategy);
      const candidate = evaluateGuideSelectionStrategy(candidateSeries, strategy);
      guideExperimentOutcomes.push({
        experimentSeed,
        strategy,
        baselineGamma: baseline.gamma,
        baselineGammaErrorPercent: baseline.relativeGammaErrorPercent,
        baselineRSquared: baseline.rSquared,
        candidateGamma: candidate.gamma,
        candidateGammaErrorPercent: candidate.relativeGammaErrorPercent,
        candidateRSquared: candidate.rSquared,
        candidateRows: candidate.rows,
      });
    }
  }
  const strategySummaries = ['early', 'tail', 'extended'].map((strategy) => {
    const rows = guideExperimentOutcomes.filter((row) => row.strategy === strategy);
    return {
      strategy,
      gammaError: summarizeDistribution(rows.map((row) => row.candidateGammaErrorPercent)),
      rSquaredLoss: summarizeDistribution(rows.map((row) => 1 - row.candidateRSquared)),
      baselineGammaError: summarizeDistribution(rows.map((row) => row.baselineGammaErrorPercent)),
      baselineRSquaredLoss: summarizeDistribution(rows.map((row) => 1 - row.baselineRSquared)),
    };
  });
  const experimentComparisons = GUIDE_EXPERIMENT_SEEDS.map((experimentSeed) => {
    const rows = guideExperimentOutcomes.filter((row) => row.experimentSeed === experimentSeed);
    const early = rows.find((row) => row.strategy === 'early');
    const tail = rows.find((row) => row.strategy === 'tail');
    const extended = rows.find((row) => row.strategy === 'extended');
    return {
      experimentSeed,
      tailGammaWorseThanEarly: tail.candidateGammaErrorPercent > early.candidateGammaErrorPercent,
      tailFitWorseThanEarly: tail.candidateRSquared < early.candidateRSquared,
      extendedGammaWorseThanEarly:
        extended.candidateGammaErrorPercent > early.candidateGammaErrorPercent,
      tailGammaErrorIncreasePercentagePoints:
        tail.candidateGammaErrorPercent - early.candidateGammaErrorPercent,
      extendedGammaErrorIncreasePercentagePoints:
        extended.candidateGammaErrorPercent - early.candidateGammaErrorPercent,
    };
  });

  const earliestEventTimeS = Math.min(...comparisonPanels.flatMap((panel) => (
    panel.events.map((event) => event.centerTimeS)
  )));
  const earlyGuardEndIndex = Math.max(0, Math.floor((earliestEventTimeS - 0.02) * SAMPLE_RATE_HZ));
  const maximumEarlyDifferenceKpa = Math.max(...comparisonPanels.flatMap((panel) => (
    panel.candidate.slice(0, earlyGuardEndIndex + 1).map((value, index) => (
      Math.abs(value - panel.baseline[index])
    ))
  )));
  const finalBaselineOffsetKpa = Math.max(...comparisonPanels.map((panel) => (
    Math.abs(
      mean(panel.candidate.slice(-50)) - mean(panel.baseline.slice(-50)),
    )
  )));

  const anomalyRows = realAnalyses.flatMap((analysis) => analysis.anomalyEvents.map((event) => ({
    run: analysis.run.run,
    heightMm: analysis.run.heightMm,
    halfCycleOrdinal: event.ordinal,
    destinationType: event.destinationType,
    midpointTimeS: round(event.midpointTimeS, 4),
    eventTimeS: round(event.eventTimeS, 4),
    anomalyPhase: round(event.eventPhase, 4),
    anomalyPhaseBin: event.eventPhaseBin,
    residualPeakKpa: round(event.residualPeakKpa, 4),
    maximumBacktrackKpa: round(event.maximumBacktrackKpa, 4),
    cumulativeBacktrackKpa: round(event.cumulativeBacktrackKpa, 4),
    amplitudeKpa: round(event.amplitudeKpa, 4),
  })));
  const selectionCsvRows = [
    ...realSelectionRows.map((row) => ({
      source: 'real',
      experimentSeed: '',
      runOrHeight: `run-${row.run}-${row.heightMm}mm`,
      strategy: row.strategy,
      periodCount: row.periodCount,
      periodMs: round(row.periodS * 1_000, 6),
      periodErrorMs: round(row.periodErrorMs, 6),
      gamma: '',
      gammaErrorPercent: '',
      rSquared: '',
    })),
    ...guideExperimentOutcomes.flatMap((outcome) => outcome.candidateRows.map((row) => ({
      source: 'candidate-guide',
      experimentSeed: outcome.experimentSeed,
      runOrHeight: `${row.heightMm}mm`,
      strategy: outcome.strategy,
      periodCount: row.periodCount,
      periodMs: round(row.periodS * 1_000, 6),
      periodErrorMs: '',
      gamma: round(outcome.candidateGamma, 8),
      gammaErrorPercent: round(outcome.candidateGammaErrorPercent, 6),
      rSquared: round(outcome.candidateRSquared, 8),
    }))),
  ];

  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    stage: 'WP-T3.0-tail-irregularity-offline-probe',
    status: 'analysis-only-not-integrated',
    source: {
      realDataPath:
        'docs/instrument-modeling/piston-oscillation/references/real-data/capstone-piston-oscillation-4runs-1000hz.csv',
      runCount: realRuns.length,
      samplesPerRun: realRuns[0].samples.length,
      sampleRateHz: SAMPLE_RATE_HZ,
      interpretation: 'CSV run 4 is treated as 20 mm; original source is unchanged.',
    },
    boundary: {
      productSourceChanged: false,
      physicsModelChanged: false,
      scoringChanged: false,
      uiChanged: false,
      proposedLayer: 'recorded-observation tail irregularity after the approved sensor channel',
    },
    chartContract: {
      realMap: '2x2 fixed-axis line small multiples with anomaly markers',
      realSelection: 'grouped dot-range plus exact fit cards',
      candidateComparison: '2x2 fixed-axis real/current/candidate line small multiples',
      candidateOutcome: 'P10-P90 interval plus interquartile range by selection strategy',
      palette: {
        real: '#1677b8',
        baseline: '#667085',
        candidate: '#dc6803',
      },
      nonColorEncoding: 'line dash, open marks, direct labels, and faceting',
    },
    realMorphology: {
      definition: {
        canonicalTemplate: 'Median of the first four normalized half-cycles across each run.',
        anomaly: 'Tail half-cycle with peak template residual above the early P90 floor, or at least 0.02 kPa one-step backtrack.',
        phase: '0 leaves an extremum; 1 approaches the next extremum.',
      },
      targets: realTargets,
      anomalyCount: anomalyRows.length,
      anomalyRows,
      phaseBins: [...new Set(anomalyRows.map((row) => row.anomalyPhaseBin))].map((phaseBin) => ({
        phaseBin,
        count: anomalyRows.filter((row) => row.anomalyPhaseBin === phaseBin).length,
      })),
      destinationTypes: ['peak', 'trough'].map((destinationType) => ({
        destinationType,
        count: anomalyRows.filter((row) => row.destinationType === destinationType).length,
      })),
      perRun: realAnalyses.map((analysis) => ({
        run: analysis.run.run,
        heightMm: analysis.run.heightMm,
        confirmedPeriodMs: analysis.run.periodS * 1_000,
        tailAnomalyCount: analysis.anomalyEvents.length,
        earlyNormalizedSlopeResidualRms: median(
          analysis.shape.early.map((row) => row.normalizedSlopeResidualRms),
        ),
        tailNormalizedSlopeResidualRms: median(
          analysis.shape.tail.map((row) => row.normalizedSlopeResidualRms),
        ),
        tailResidualPeakKpa: median(
          analysis.shape.tail.map((row) => row.residualPeakKpa),
        ),
        tailMaximumBacktrackKpa: Math.max(
          ...analysis.shape.tail.map((row) => row.maximumBacktrackKpa),
        ),
      })),
    },
    realSelection: {
      rows: realSelectionRows.map((row) => ({
        ...row,
        left: { timeS: row.left.timeS, type: row.left.type },
        right: { timeS: row.right.timeS, type: row.right.type },
      })),
      fitOutcomes: realFitOutcomes,
      hypothesis: {
        tailGammaErrorIncreasePercentagePoints:
          realFitOutcomes.find((row) => row.strategy === '等长尾段 3 周期').relativeGammaErrorPercent
          - realFitOutcomes.find((row) => row.strategy === '实测已确认早段').relativeGammaErrorPercent,
        extendedGammaErrorIncreasePercentagePoints:
          realFitOutcomes.find((row) => row.strategy === '从早段延伸至可见尾端').relativeGammaErrorPercent
          - realFitOutcomes.find((row) => row.strategy === '实测已确认早段').relativeGammaErrorPercent,
      },
    },
    candidate: {
      interpretation:
        'Seeded acquisition-layer local time warp plus zero-tail shoulder attenuation. It is a pedagogical observation artifact, not a calibrated physical force.',
      selectedConfig,
      morphologyScore: selectedEvaluation.score,
      combinedScore: selectedEvaluation.combinedScore,
      morphologySummary: selectedEvaluation.summary,
      guidePilot: selectedEvaluation.guidePilot,
      nextBestConfigurations: candidateEvaluations.slice(0, 5).map((row) => ({
        config: row.config,
        morphologyScore: row.score,
        combinedScore: row.combinedScore,
        summary: row.summary,
        guidePilot: row.guidePilot,
      })),
      visualEvents: comparisonPanels.map((panel) => ({
        heightMm: panel.heightMm,
        events: panel.events,
      })),
    },
    guideSelectionValidation: {
      experimentCount: GUIDE_EXPERIMENT_SEEDS.length,
      strategySummaries,
      tailGammaWorseThanEarlyShare: mean(
        experimentComparisons.map((row) => Number(row.tailGammaWorseThanEarly)),
      ),
      tailFitWorseThanEarlyShare: mean(
        experimentComparisons.map((row) => Number(row.tailFitWorseThanEarly)),
      ),
      extendedGammaWorseThanEarlyShare: mean(
        experimentComparisons.map((row) => Number(row.extendedGammaWorseThanEarly)),
      ),
      tailGammaErrorIncreasePercentagePoints: summarize(
        experimentComparisons.map((row) => row.tailGammaErrorIncreasePercentagePoints),
      ),
      extendedGammaErrorIncreasePercentagePoints: summarize(
        experimentComparisons.map((row) => row.extendedGammaErrorIncreasePercentagePoints),
      ),
    },
    guards: {
      maximumEarlyDifferenceKpa,
      finalBaselineOffsetKpa,
      sampleCountPreserved: comparisonPanels.every((panel) => (
        panel.candidate.length === panel.baseline.length
      )),
      sampleRatePreservedHz: SAMPLE_RATE_HZ,
      deterministicReplayPassed: comparisonPanels.every((panel, index) => {
        const base = realBaseRows[index];
        const replay = applySeededTailIrregularities({
          pressuresKpa: base.pressuresKpa,
          expectedPeriodS: base.run.periodS,
          seed: 0x9e3779b9 ^ base.run.run,
          config: selectedConfig,
        });
        return replay.pressuresKpa.every((value, sampleIndex) => (
          value === panel.candidate[sampleIndex]
        ));
      }),
    },
    limitations: [
      'Only one real trace exists at each height, so event probability cannot be statistically calibrated.',
      'The user did not calculate the circled real tail windows; this probe reconstructs them from phase-locked extrema and the product formula.',
      'A random timing disturbance raises expected error and variance but cannot guarantee that every individual tail selection is worse than every early selection.',
      'The selected coefficients are a temporary visual-and-pedagogical candidate, not physical apparatus parameters.',
      'Formal integration still requires product-level persistence, compatibility, workflow, and existing error-consequence regression tests.',
    ],
  };

  fs.writeFileSync(JSON_OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  writeCsv(EVENT_CSV_PATH, anomalyRows);
  writeCsv(SELECTION_CSV_PATH, selectionCsvRows);
  fs.writeFileSync(
    REAL_MAP_SVG_PATH,
    createRealAnomalyMapSvg(realAnalyses, realTargets.tailResidualPeakKpa),
    'utf8',
  );
  fs.writeFileSync(
    SELECTION_SVG_PATH,
    createSelectionStrategySvg(realSelectionRows, realFitOutcomes),
    'utf8',
  );
  fs.writeFileSync(
    CANDIDATE_SVG_PATH,
    createCandidateComparisonSvg(comparisonPanels),
    'utf8',
  );
  fs.writeFileSync(
    OUTCOME_SVG_PATH,
    createOutcomeSvg(strategySummaries),
    'utf8',
  );

  const earlyFit = realFitOutcomes.find((row) => row.strategy === '实测已确认早段');
  const tailFit = realFitOutcomes.find((row) => row.strategy === '等长尾段 3 周期');
  const extendedFit = realFitOutcomes.find((row) => row.strategy === '从早段延伸至可见尾端');
  const tailSummary = strategySummaries.find((row) => row.strategy === 'tail');
  const earlySummary = strategySummaries.find((row) => row.strategy === 'early');
  const report = `# WP-T3.0 尾端局部异常与框选后果离线验证\n\n`
    + `本轮结论：四组实测的尾端确实比开头更容易出现局部斜率异常，但离散“折一下”并不是每个半周期都出现。按软件真实公式重算后，直接选最后 3 个周期会把四组联合 γ 从 **${earlyFit.gamma.toFixed(4)}** 改为 **${tailFit.gamma.toFixed(4)}**，绝对相对误差由 **${earlyFit.relativeGammaErrorPercent.toFixed(2)}%** 变为 **${tailFit.relativeGammaErrorPercent.toFixed(2)}%**；从早段一直选到可见尾端得到 **${extendedFit.gamma.toFixed(4)}**。因此“尾段更差”的方向在这四组实测上成立，但“多选一定更差”不成立。\n\n`
    + `> 这是离线分析与临时候选。正式软件物理模型、观测模型、UI、评分、存档和产品源码均未改变。\n\n`
    + `## 实测共同点\n\n`
    + `- 以早段归一化斜率残差 P90 的 1.35 倍作为相对形态阈值（${anomalyThresholdNormalizedSlopeResidualRms.toFixed(4)}）；尾段共识别 ${anomalyRows.length} 个超过阈值或出现至少 0.02 kPa 回折的半周期。\n`
    + `- 尾段归一化斜率残差中位数为 ${realTargets.tailNormalizedSlopeResidualRms.toFixed(4)}，早段为 ${realTargets.earlyNormalizedSlopeResidualRms.toFixed(4)}。\n`
    + `- 离散异常并不固定在一个相位：${(realTargets.approachAnomalyShare * 100).toFixed(1)}% 落在半周期后 40%（接近波峰/波谷肩部），更多事件散布在 20%–60% 的过渡段。因此“谷前左肩被削”是反复出现的变体，而不是每个周期都应强制加入的模板。\n`
    + `- 所有尾段半周期的峰值残差中位数为 ${realTargets.tailResidualPeakKpa.toFixed(3)} kPa；被识别为异常的半周期中位数为 ${realTargets.anomalyResidualPeakMedianKpa.toFixed(3)} kPa，P90 为 ${realTargets.anomalyResidualPeakP90Kpa.toFixed(3)} kPa，最大值 ${realTargets.anomalyResidualPeakMaximumKpa.toFixed(3)} kPa。四条曲线只有各一条，以上数值只能作为形态量级，不是标定值。\n\n`
    + `## 真实框选后果\n\n`
    + `| 策略 | γ | γ 绝对相对误差 | R² |\n`
    + `| --- | ---: | ---: | ---: |\n`
    + `| 已确认早段 | ${earlyFit.gamma.toFixed(5)} | ${earlyFit.relativeGammaErrorPercent.toFixed(3)}% | ${earlyFit.rSquared.toFixed(5)} |\n`
    + `| 最后 3 周期 | ${tailFit.gamma.toFixed(5)} | ${tailFit.relativeGammaErrorPercent.toFixed(3)}% | ${tailFit.rSquared.toFixed(5)} |\n`
    + `| 早段延伸至尾端 | ${extendedFit.gamma.toFixed(5)} | ${extendedFit.relativeGammaErrorPercent.toFixed(3)}% | ${extendedFit.rSquared.toFixed(5)} |\n\n`
    + `尾段等长框选相对早段的 γ 误差增加 **${(tailFit.relativeGammaErrorPercent - earlyFit.relativeGammaErrorPercent).toFixed(3)} 个百分点**。理论上拉远端点可分摊随机读点误差，但这四条实测的末端偏移具有方向性，扩展框选仍得到 **${extendedFit.relativeGammaErrorPercent.toFixed(3)}%** 误差；因此“选得更多”和“端点质量更好”必须共同判断。\n\n`
    + `## 临时候选函数\n\n`
    + `候选不再声称新增摩擦或热学机制，而是在已生成的 1000 Hz 观测序列尾段做两件事：\n\n`
    + `1. 在低振幅的若干局部区间加入 ${selectedConfig.minimumTimeShiftMs.toFixed(1)}–${selectedConfig.maximumTimeShiftMs.toFixed(1)} ms 的平滑局部时移，使该小段先减速、随后追上；\n`
    + `2. 同一位置加入最多 ${selectedConfig.maximumShoulderAmplitudeKpa.toFixed(2)} kPa、回到零的局部削肩项，制造可见但连续的折斜。\n\n`
    + `事件由实验种子固定：同一已保存实验重放不变，新实验自然不同。函数不改变采样率、样本数和早段数据，也不留下永久基线偏移。它的定位是“教学性采集尾端失真”，不是仪器物理参数。\n\n`
    + `## 96 组种子验证\n\n`
    + `临时候选下，早段 3 周期的 γ 绝对相对误差中位数为 **${earlySummary.gammaError.median.toFixed(2)}%**，尾段 3 周期为 **${tailSummary.gammaError.median.toFixed(2)}%**。在 ${(result.guideSelectionValidation.tailGammaWorseThanEarlyShare * 100).toFixed(1)}% 的实验种子中，尾段 γ 误差大于早段；在 ${(result.guideSelectionValidation.tailFitWorseThanEarlyShare * 100).toFixed(1)}% 的种子中，尾段 R² 更差。这个结果支持“尾段更容易算差”的教学趋势，但没有人为保证每一次都变差。\n\n`
    + `## 保护项与限制\n\n`
    + `- 最早事件前的最大数据差：${maximumEarlyDifferenceKpa.toFixed(3)} kPa；末 50 ms 平均基线最大差：${finalBaselineOffsetKpa.toFixed(3)} kPa。\n`
    + `- 采样率仍为 ${SAMPLE_RATE_HZ} Hz，样本数保持，固定种子重放通过。\n`
    + `- 只有四条实测曲线，事件概率和系数不能称为真实装置标定；正式接入前仍需你先看图确认，再跑现有正确/错误后果、自由流程和旧数据兼容回归。\n`
    + `- 随机误差提高的是误差分布与变差概率；若强制每次尾段都比早段差，就必须按正确答案定向篡改，这不建议做。\n\n`
    + `## 图形与可复核数据\n\n`
    + `- [四组实测异常位置](./real-tail-anomaly-map.svg)\n`
    + `- [实测框选策略后果](./real-selection-strategy.svg)\n`
    + `- [实测／当前／临时候选尾段](./candidate-tail-comparison.svg)\n`
    + `- [96 组框选后果分布](./candidate-selection-outcomes.svg)\n`
    + `- [完整 JSON](./tail-irregularity-probe.json)\n`
    + `- [实测异常 CSV](./real-tail-events.csv)\n`
    + `- [框选结果 CSV](./selection-strategy-outcomes.csv)\n`;
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  console.log(`WP-T3.0 outputs written to ${OUTPUT_DIR}`);
  console.log(JSON.stringify({
    realTargets,
    realFitOutcomes,
    selectedConfig,
    selectedMorphology: selectedEvaluation.summary,
    guideSelectionValidation: result.guideSelectionValidation,
    guards: result.guards,
  }, null, 2));
};

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) runProbe();

export {
  applySeededTailIrregularities,
  createTailIrregularityEvents,
  runProbe as runPistonOscillationTailIrregularityProbe,
};
