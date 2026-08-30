import fs from 'node:fs';
import path from 'node:path';

import {
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG,
  PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2,
  getPistonCylinderAreaM2,
  getPistonOscillationSettlingStateAtProgress,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(
  ROOT,
  'docs',
  'instrument-modeling',
  'reference',
  'piston-oscillation-real-data',
  'capstone-piston-oscillation-4runs-1000hz.csv',
);
const OUTPUT_PATH = path.join(
  ROOT,
  'docs',
  'instrument-modeling',
  'analysis',
  'piston-oscillation-waveform-commonality-comparison-2026-08-30.json',
);

const SAMPLE_RATE_HZ = 1_000;
const SAMPLE_INTERVAL_S = 1 / SAMPLE_RATE_HZ;
const PRESS_DURATION_S = 0.08;
const PRESS_DURATION_SENSITIVITY_S = [0.04, 0.08, 0.16];
const TRAJECTORY_DURATION_S = 0.5;
const CURRENT_LINEAR_DAMPING_NS_PER_M = 0.434;
const DAMPING_CANDIDATES_NS_PER_M = [0.434, 0.7, 0.9, 1, 1.1, 1.2, 1.4];
const RELEASE_AMPLITUDES_MM = Array.from(
  { length: 39 },
  (_, index) => 2.5 + index * 0.25,
);
const NATURAL_VARIATION_SEEDS = Array.from({ length: 32 }, (_, index) => (
  0x4f1bbcdc + index * 0x9e3779b1
) >>> 0);

const RUN_DEFINITIONS = [
  {
    run: 1,
    heightMm: 50,
    anchorType: 'trough',
    anchorTimeS: 0.010,
    periodS: 0.0305,
    periodCount: 6,
    clearVisibleUntilS: 0.25,
    faintVisibleUntilS: 0.36,
  },
  {
    run: 2,
    heightMm: 40,
    anchorType: 'trough',
    anchorTimeS: 0.009,
    periodS: 0.029,
    periodCount: 4,
    clearVisibleUntilS: 0.25,
    faintVisibleUntilS: 0.28,
  },
  {
    run: 3,
    heightMm: 30,
    anchorType: 'peak',
    anchorTimeS: 0.021,
    periodS: 0.0265,
    periodCount: 4,
    clearVisibleUntilS: 0.18,
    faintVisibleUntilS: 0.23,
  },
  {
    run: 4,
    heightMm: 20,
    anchorType: 'trough',
    anchorTimeS: 0.007,
    periodS: 0.022,
    periodCount: 3,
    clearVisibleUntilS: 0.16,
    faintVisibleUntilS: 0.19,
  },
];

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

const sampleStandardDeviation = (values) => {
  const average = mean(values);
  return Math.sqrt(values.reduce(
    (sum, value) => sum + (value - average) ** 2,
    0,
  ) / Math.max(1, values.length - 1));
};

const rootMeanSquare = (values) => Math.sqrt(mean(values.map((value) => value ** 2)));

const quantile = (values, probability) => {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const fraction = position - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
};

const correlationAtLagOne = (values) => {
  if (values.length < 3) return 0;
  const left = values.slice(0, -1);
  const right = values.slice(1);
  const leftMean = mean(left);
  const rightMean = mean(right);
  const numerator = left.reduce(
    (sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean),
    0,
  );
  const denominator = Math.sqrt(
    left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0)
    * right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0),
  );
  return denominator === 0 ? 0 : numerator / denominator;
};

const centeredMovingAverage = (values, windowSize) => {
  const halfWindow = Math.floor(windowSize / 2);
  const prefix = [0];
  for (const value of values) prefix.push(prefix.at(-1) + value);
  return values.map((_, index) => {
    const start = Math.max(0, index - halfWindow);
    const end = Math.min(values.length, index + halfWindow + 1);
    return (prefix[end] - prefix[start]) / (end - start);
  });
};

const getLongestExactPlateauSampleCount = (values) => {
  let longest = 1;
  let current = 1;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] === values[index - 1]) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
};

const quantizePressureKpa = (pressurePa) => Math.trunc(pressurePa / 10) / 100;

const hashUnitInterval = (seed, sampleIndex, salt) => {
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

const deterministicStandardNormal = (seed, sampleIndex, salt = 0) => {
  const first = Math.max(
    Number.EPSILON,
    hashUnitInterval(seed, sampleIndex, 0x68bc21eb ^ salt),
  );
  const second = hashUnitInterval(seed, sampleIndex, 0x02e5be93 ^ salt);
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
};

const parseRealRuns = () => {
  const rows = fs.readFileSync(SOURCE_PATH, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(',').map(Number));
  return RUN_DEFINITIONS.map((definition, runIndex) => {
    const samples = rows.map((row, sampleIndex) => ({
      sampleIndex,
      timeS: row[runIndex * 2],
      pressureKpa: row[runIndex * 2 + 1],
    }));
    const baselineKpa = mean(samples.slice(-100).map((sample) => sample.pressureKpa));
    return { ...definition, baselineKpa, samples };
  });
};

const oppositeType = (type) => type === 'peak' ? 'trough' : 'peak';

const extractRealPhaseLockedExtrema = (run) => {
  const extrema = [];
  for (let ordinal = 0; ordinal <= run.periodCount * 2; ordinal += 1) {
    const expectedTimeS = run.anchorTimeS + ordinal * run.periodS / 2;
    const type = ordinal % 2 === 0 ? run.anchorType : oppositeType(run.anchorType);
    const halfWindowS = Math.min(0.004, run.periodS * 0.2);
    const candidates = run.samples.filter(
      (sample) => Math.abs(sample.timeS - expectedTimeS) <= halfWindowS,
    );
    const selected = candidates.reduce((best, candidate) => {
      if (!best) return candidate;
      if (type === 'peak') {
        return candidate.pressureKpa > best.pressureKpa ? candidate : best;
      }
      return candidate.pressureKpa < best.pressureKpa ? candidate : best;
    }, null);
    extrema.push({
      ordinal,
      type,
      sampleIndex: selected.sampleIndex,
      timeS: selected.timeS,
      pressureKpa: selected.pressureKpa,
      deviationKpa: selected.pressureKpa - run.baselineKpa,
    });
  }
  return extrema;
};

const extractSmoothedExtrema = (pressuresKpa, expectedPeriodS) => {
  const smoothed = centeredMovingAverage(pressuresKpa, 7);
  const candidates = [];
  for (let index = 2; index < smoothed.length - 2; index += 1) {
    const previous = smoothed[index - 1];
    const current = smoothed[index];
    const next = smoothed[index + 1];
    if (current > previous && current >= next) {
      candidates.push({ sampleIndex: index, type: 'peak', pressureKpa: current });
    } else if (current < previous && current <= next) {
      candidates.push({ sampleIndex: index, type: 'trough', pressureKpa: current });
    }
  }
  const minimumDistanceSamples = Math.max(
    4,
    Math.floor(expectedPeriodS * SAMPLE_RATE_HZ * 0.3),
  );
  const accepted = [];
  for (const candidate of candidates) {
    const previous = accepted.at(-1);
    if (!previous) {
      accepted.push(candidate);
      continue;
    }
    if (candidate.type === previous.type) {
      const candidateMagnitude = Math.abs(candidate.pressureKpa);
      const previousMagnitude = Math.abs(previous.pressureKpa);
      if (candidateMagnitude > previousMagnitude) accepted[accepted.length - 1] = candidate;
      continue;
    }
    if (candidate.sampleIndex - previous.sampleIndex < minimumDistanceSamples) continue;
    accepted.push(candidate);
  }
  return accepted;
};

const selectModelExtremaSequence = (run, pressuresKpa, baselineKpa) => {
  const extrema = extractSmoothedExtrema(
    pressuresKpa.map((value) => value - baselineKpa),
    run.periodS,
  );
  const requiredCount = run.periodCount * 2 + 1;
  for (let startIndex = 0; startIndex < extrema.length; startIndex += 1) {
    if (extrema[startIndex].type !== run.anchorType) continue;
    const selected = extrema.slice(startIndex, startIndex + requiredCount);
    if (selected.length < requiredCount) continue;
    return selected.map((extremum, ordinal) => ({
      ordinal,
      type: extremum.type,
      sampleIndex: extremum.sampleIndex,
      timeS: extremum.sampleIndex / SAMPLE_RATE_HZ,
      pressureKpa: extremum.pressureKpa + baselineKpa,
      deviationKpa: extremum.pressureKpa,
    }));
  }
  return null;
};

const createPressAndReleasePhysicalSamples = (
  run,
  dampingNsPerM,
  amplitudeMm,
  pressDurationS = PRESS_DURATION_S,
) => {
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const ambientPressurePa = run.baselineKpa * 1_000
    - PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG
      * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2
      / cylinderAreaM2;
  const physicsConfig = {
    ambientPressurePa,
    linearDampingNsPerM: dampingNsPerM,
    sensorSampleRateHz: SAMPLE_RATE_HZ,
    trajectoryDurationS: TRAJECTORY_DURATION_S,
  };
  let state = getPistonOscillationSettlingStateAtProgress(
    run.heightMm,
    1,
    physicsConfig,
  );
  const equilibriumHeightMm = state.pistonHeightM * 1_000;
  const intervalCount = Math.round(pressDurationS * SAMPLE_RATE_HZ);
  const displacementMm = -amplitudeMm;
  const pressSamples = [{ pressurePa: state.pressurePa }];
  for (let intervalIndex = 1; intervalIndex <= intervalCount; intervalIndex += 1) {
    state = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: state,
      pistonHeightMm:
        equilibriumHeightMm + displacementMm * intervalIndex / intervalCount,
      elapsedS: pressDurationS / intervalCount,
      velocityMmPerS: displacementMm / pressDurationS,
      physicsConfig,
    });
    pressSamples.push({ pressurePa: state.pressurePa });
  }
  const trajectory = simulatePistonOscillationThermalRelease({
    lockedHeightMm: run.heightMm,
    initialDisplacementMm: displacementMm,
    initialVelocityMmPerS: 0,
    referenceThermodynamicState: state,
  }, physicsConfig);
  return {
    pressSamples,
    releaseSamples: trajectory.samples.map((sample) => ({ pressurePa: sample.pressurePa })),
  };
};

const observeSeries = (physical, candidate, seed) => {
  const combined = [
    ...physical.pressSamples,
    ...physical.releaseSamples.slice(1),
  ];
  const releaseStartIndex = physical.pressSamples.length - 1;
  let firstOrderPressurePa = combined[0].pressurePa;
  let secondOrderPressurePa = combined[0].pressurePa;
  let secondOrderVelocityPaPerS = 0;
  let fastNoisePa = 0;
  let slowNoisePa = 0;
  const observed = [];
  const firstOrderBlend = 1 - Math.exp(
    -SAMPLE_INTERVAL_S / candidate.responseTimeConstantS,
  );
  const fastNoiseBlend = candidate.fastNoiseTimeConstantS
    ? Math.exp(-SAMPLE_INTERVAL_S / candidate.fastNoiseTimeConstantS)
    : 0;
  const slowNoiseBlend = candidate.slowNoiseTimeConstantS
    ? Math.exp(-SAMPLE_INTERVAL_S / candidate.slowNoiseTimeConstantS)
    : 0;
  const angularFrequency = 2 * Math.PI * (candidate.secondOrderFrequencyHz ?? 100);
  const dampingRatio = candidate.secondOrderDampingRatio ?? 0.75;
  const secondOrderMix = candidate.secondOrderMix ?? 0;
  for (let sampleIndex = 0; sampleIndex < combined.length; sampleIndex += 1) {
    const physicalPressurePa = combined[sampleIndex].pressurePa;
    if (sampleIndex > 0) {
      firstOrderPressurePa += firstOrderBlend
        * (physicalPressurePa - firstOrderPressurePa);
      if (secondOrderMix > 0) {
        const substepCount = 4;
        const dtS = SAMPLE_INTERVAL_S / substepCount;
        for (let substep = 0; substep < substepCount; substep += 1) {
          const accelerationPaPerS2 = angularFrequency ** 2
            * (physicalPressurePa - secondOrderPressurePa)
            - 2 * dampingRatio * angularFrequency * secondOrderVelocityPaPerS;
          secondOrderVelocityPaPerS += accelerationPaPerS2 * dtS;
          secondOrderPressurePa += secondOrderVelocityPaPerS * dtS;
        }
      } else {
        secondOrderPressurePa = firstOrderPressurePa;
      }
    }
    const fastInnovation = deterministicStandardNormal(seed, sampleIndex, 0x173a);
    const slowInnovation = deterministicStandardNormal(seed, sampleIndex, 0x72b1);
    fastNoisePa = fastNoiseBlend * fastNoisePa
      + Math.sqrt(1 - fastNoiseBlend ** 2)
        * (candidate.fastNoiseStandardDeviationPa ?? 0) * fastInnovation;
    slowNoisePa = slowNoiseBlend * slowNoisePa
      + Math.sqrt(1 - slowNoiseBlend ** 2)
        * (candidate.slowNoiseStandardDeviationPa ?? 0) * slowInnovation;
    const whiteNoisePa = (candidate.whiteNoiseStandardDeviationPa ?? 0)
      * deterministicStandardNormal(seed, sampleIndex, 0x5c91);
    const filteredPressurePa = firstOrderPressurePa * (1 - secondOrderMix)
      + secondOrderPressurePa * secondOrderMix;
    const pressureKpa = quantizePressureKpa(
      filteredPressurePa + fastNoisePa + slowNoisePa + whiteNoisePa,
    );
    if (sampleIndex >= releaseStartIndex) observed.push(pressureKpa);
  }
  return observed.slice(0, Math.floor(TRAJECTORY_DURATION_S * SAMPLE_RATE_HZ) + 1);
};

const OBSERVATION_CANDIDATES = [
  {
    id: 'current-observation',
    label: '当前观测层',
    responseTimeConstantS: 0.003,
    whiteNoiseStandardDeviationPa: 4,
  },
  {
    id: 'larger-independent-white-noise',
    label: '仅提高独立白噪声',
    responseTimeConstantS: 0.003,
    whiteNoiseStandardDeviationPa: 12,
  },
  {
    id: 'multi-timescale-correlated-residual',
    label: '多时间尺度连续微波动',
    responseTimeConstantS: 0.003,
    whiteNoiseStandardDeviationPa: 2,
    fastNoiseStandardDeviationPa: 7,
    fastNoiseTimeConstantS: 0.002,
    slowNoiseStandardDeviationPa: 9,
    slowNoiseTimeConstantS: 0.018,
  },
  {
    id: 'correlated-residual-with-weak-second-order-response',
    label: '连续微波动＋弱二阶响应',
    responseTimeConstantS: 0.003,
    whiteNoiseStandardDeviationPa: 2,
    fastNoiseStandardDeviationPa: 7,
    fastNoiseTimeConstantS: 0.002,
    slowNoiseStandardDeviationPa: 9,
    slowNoiseTimeConstantS: 0.018,
    secondOrderMix: 0.15,
    secondOrderFrequencyHz: 100,
    secondOrderDampingRatio: 0.7,
  },
];

const getMorphologyMetrics = (pressuresKpa) => {
  const tail = pressuresKpa.slice(-100);
  const fastSmooth = centeredMovingAverage(tail, 11);
  const slowSmooth = centeredMovingAverage(tail, 51);
  const fastResidual = tail.map((value, index) => value - fastSmooth[index]);
  const slowResidual = tail.map((value, index) => value - slowSmooth[index]);
  return {
    tailStandardDeviationKpa: sampleStandardDeviation(tail),
    tailRangeKpa: Math.max(...tail) - Math.min(...tail),
    tailLagOneCorrelation: correlationAtLagOne(tail),
    fastResidualStandardDeviationKpa: sampleStandardDeviation(fastResidual),
    slowResidualStandardDeviationKpa: sampleStandardDeviation(slowResidual),
    exactRepeatShare: pressuresKpa.slice(1).filter(
      (value, index) => value === pressuresKpa[index],
    ).length / Math.max(1, pressuresKpa.length - 1),
    longestExactPlateauMs: Math.max(
      0,
      getLongestExactPlateauSampleCount(pressuresKpa) - 1,
    ) * 1_000 / SAMPLE_RATE_HZ,
  };
};

const evaluateModelRun = (
  run,
  realExtrema,
  dampingNsPerM,
  amplitudeMm,
  seed,
  pressDurationS = PRESS_DURATION_S,
) => {
  const physical = createPressAndReleasePhysicalSamples(
    run,
    dampingNsPerM,
    amplitudeMm,
    pressDurationS,
  );
  const currentCandidate = OBSERVATION_CANDIDATES[0];
  const pressuresKpa = observeSeries(physical, currentCandidate, seed);
  const modelExtrema = selectModelExtremaSequence(run, pressuresKpa, run.baselineKpa);
  if (!modelExtrema) return null;
  const timingErrorsS = modelExtrema.map((extremum, index) => (
    extremum.timeS - modelExtrema[0].timeS
    - (realExtrema[index].timeS - realExtrema[0].timeS)
  ));
  const amplitudeErrorsKpa = modelExtrema.map((extremum, index) => (
    extremum.deviationKpa - realExtrema[index].deviationKpa
  ));
  const allPrimaryExtrema = extractSmoothedExtrema(
    pressuresKpa.map((pressureKpa) => pressureKpa - run.baselineKpa),
    run.periodS,
  );
  const visible = allPrimaryExtrema.filter(
    (extremum) => Math.abs(extremum.pressureKpa) >= 0.5,
  );
  const visibleDurationS = visible.length > 0
    ? visible.at(-1).sampleIndex / SAMPLE_RATE_HZ
    : 0;
  const durationErrorS = visibleDurationS < run.clearVisibleUntilS
    ? run.clearVisibleUntilS - visibleDurationS
    : visibleDurationS > run.faintVisibleUntilS
      ? visibleDurationS - run.faintVisibleUntilS
      : 0;
  const timingRmseS = rootMeanSquare(timingErrorsS);
  const amplitudeRmseKpa = rootMeanSquare(amplitudeErrorsKpa);
  return {
    amplitudeMm,
    pressuresKpa,
    physical,
    modelExtrema,
    timingRmseS,
    amplitudeRmseKpa,
    visibleDurationS,
    durationErrorS,
    score:
      timingRmseS / 0.0015
      + amplitudeRmseKpa / 0.75
      + durationErrorS / 0.03,
  };
};

const summarizeValues = (values) => ({
  minimum: Math.min(...values),
  p10: quantile(values, 0.1),
  median: quantile(values, 0.5),
  p90: quantile(values, 0.9),
  maximum: Math.max(...values),
});

const realRuns = parseRealRuns();
const realProfiles = realRuns.map((run) => {
  const pressuresKpa = run.samples.map((sample) => sample.pressureKpa);
  return {
    run: run.run,
    heightMm: run.heightMm,
    periodMs: run.periodS * 1_000,
    visibleRangeMs: [run.clearVisibleUntilS * 1_000, run.faintVisibleUntilS * 1_000],
    baselineKpa: run.baselineKpa,
    ...getMorphologyMetrics(pressuresKpa),
  };
});

const fitCache = new Map();
const dampingSweep = DAMPING_CANDIDATES_NS_PER_M.map((dampingNsPerM) => {
  const runs = realRuns.map((run) => {
    const realExtrema = extractRealPhaseLockedExtrema(run);
    const evaluations = RELEASE_AMPLITUDES_MM.map((amplitudeMm) => (
      evaluateModelRun(run, realExtrema, dampingNsPerM, amplitudeMm, 0x5f3759df)
    )).filter(Boolean);
    const best = evaluations.reduce(
      (selected, candidate) => !selected || candidate.score < selected.score
        ? candidate
        : selected,
      null,
    );
    fitCache.set(`${dampingNsPerM}:${run.run}`, best);
    return {
      run: run.run,
      heightMm: run.heightMm,
      releaseAmplitudeMm: best.amplitudeMm,
      realPeriodMs: run.periodS * 1_000,
      modelPeriodMs: (
        best.modelExtrema.at(-1).timeS - best.modelExtrema[0].timeS
      ) / run.periodCount * 1_000,
      timingRmseMs: best.timingRmseS * 1_000,
      amplitudeRmseKpa: best.amplitudeRmseKpa,
      modelVisibleDurationMs: best.visibleDurationS * 1_000,
      realVisibleRangeMs: [
        run.clearVisibleUntilS * 1_000,
        run.faintVisibleUntilS * 1_000,
      ],
      score: best.score,
    };
  });
  return {
    dampingNsPerM,
    averageScore: mean(runs.map((run) => run.score)),
    averageTimingRmseMs: mean(runs.map((run) => run.timingRmseMs)),
    averageAmplitudeRmseKpa: mean(runs.map((run) => run.amplitudeRmseKpa)),
    averageVisibleDurationErrorMs: mean(runs.map((run) => {
      const [minimum, maximum] = run.realVisibleRangeMs;
      if (run.modelVisibleDurationMs < minimum) return minimum - run.modelVisibleDurationMs;
      if (run.modelVisibleDurationMs > maximum) return run.modelVisibleDurationMs - maximum;
      return 0;
    })),
    runs,
  };
});

const bestDamping = dampingSweep.reduce(
  (selected, candidate) => candidate.averageScore < selected.averageScore
    ? candidate
    : selected,
  dampingSweep[0],
);

const pressDurationSensitivity = PRESS_DURATION_SENSITIVITY_S.map(
  (pressDurationS) => {
    const candidates = Math.abs(pressDurationS - PRESS_DURATION_S) < 1e-12
      ? dampingSweep.map((row) => ({
          dampingNsPerM: row.dampingNsPerM,
          averageScore: row.averageScore,
          averageTimingRmseMs: row.averageTimingRmseMs,
          averageAmplitudeRmseKpa: row.averageAmplitudeRmseKpa,
          averageVisibleDurationErrorMs: row.averageVisibleDurationErrorMs,
        }))
      : DAMPING_CANDIDATES_NS_PER_M.map((dampingNsPerM) => {
          const runs = realRuns.map((run) => {
            const realExtrema = extractRealPhaseLockedExtrema(run);
            const best = RELEASE_AMPLITUDES_MM.map((amplitudeMm) => (
              evaluateModelRun(
                run,
                realExtrema,
                dampingNsPerM,
                amplitudeMm,
                0x5f3759df,
                pressDurationS,
              )
            )).filter(Boolean).reduce(
              (selected, candidate) => !selected || candidate.score < selected.score
                ? candidate
                : selected,
              null,
            );
            return best;
          });
          return {
            dampingNsPerM,
            averageScore: mean(runs.map((run) => run.score)),
            averageTimingRmseMs: mean(runs.map((run) => run.timingRmseS * 1_000)),
            averageAmplitudeRmseKpa: mean(runs.map((run) => run.amplitudeRmseKpa)),
            averageVisibleDurationErrorMs: mean(
              runs.map((run) => run.durationErrorS * 1_000),
            ),
          };
        });
    const selected = candidates.reduce(
      (best, candidate) => candidate.averageScore < best.averageScore
        ? candidate
        : best,
      candidates[0],
    );
    return {
      pressDurationMs: pressDurationS * 1_000,
      selectedDampingNsPerM: selected.dampingNsPerM,
      averageScore: selected.averageScore,
      averageTimingRmseMs: selected.averageTimingRmseMs,
      averageAmplitudeRmseKpa: selected.averageAmplitudeRmseKpa,
      averageVisibleDurationErrorMs: selected.averageVisibleDurationErrorMs,
    };
  },
);

const observationCandidates = OBSERVATION_CANDIDATES.map((candidate) => {
  const profiles = [];
  const periodShiftsMs = [];
  for (const run of realRuns) {
    const fit = fitCache.get(`${bestDamping.dampingNsPerM}:${run.run}`);
    const referencePressures = observeSeries(
      fit.physical,
      OBSERVATION_CANDIDATES[0],
      NATURAL_VARIATION_SEEDS[0],
    );
    const referenceExtrema = selectModelExtremaSequence(
      run,
      referencePressures,
      run.baselineKpa,
    );
    const referencePeriodMs = referenceExtrema
      ? (referenceExtrema.at(-1).timeS - referenceExtrema[0].timeS)
        / run.periodCount * 1_000
      : null;
    for (const seed of NATURAL_VARIATION_SEEDS) {
      const pressuresKpa = observeSeries(fit.physical, candidate, seed);
      profiles.push({
        run: run.run,
        heightMm: run.heightMm,
        seed,
        ...getMorphologyMetrics(pressuresKpa),
      });
      const extrema = selectModelExtremaSequence(run, pressuresKpa, run.baselineKpa);
      if (extrema && referencePeriodMs !== null) {
        const periodMs = (
          extrema.at(-1).timeS - extrema[0].timeS
        ) / run.periodCount * 1_000;
        periodShiftsMs.push(periodMs - referencePeriodMs);
      }
    }
  }
  const metrics = [
    'tailStandardDeviationKpa',
    'tailRangeKpa',
    'tailLagOneCorrelation',
    'fastResidualStandardDeviationKpa',
    'slowResidualStandardDeviationKpa',
    'exactRepeatShare',
    'longestExactPlateauMs',
  ];
  return {
    id: candidate.id,
    label: candidate.label,
    configuration: candidate,
    sampleCount: profiles.length,
    metricDistributions: Object.fromEntries(metrics.map((metric) => [
      metric,
      summarizeValues(profiles.map((profile) => profile[metric])),
    ])),
    primaryPeriodShiftMs: summarizeValues(periodShiftsMs),
  };
});

const realMetricRanges = Object.fromEntries([
  'tailStandardDeviationKpa',
  'tailRangeKpa',
  'tailLagOneCorrelation',
  'fastResidualStandardDeviationKpa',
  'slowResidualStandardDeviationKpa',
  'exactRepeatShare',
  'longestExactPlateauMs',
].map((metric) => [metric, summarizeValues(realProfiles.map((profile) => profile[metric]))]));

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: 'Compare shared waveform morphology without fitting any one real trace point by point.',
  source: {
    path: path.relative(ROOT, SOURCE_PATH).replace(/\\/g, '/'),
    runCount: 4,
    samplesPerRun: 501,
    sampleRateHz: SAMPLE_RATE_HZ,
    knownInterpretation: 'CSV run 4 is treated as 20 mm while the original 60 mm header remains unchanged.',
  },
  method: {
    physicalModel: 'Current finite-thermal release model; only linear damping is swept offline.',
    releaseAlignment:
      'Each real run receives one nuisance release amplitude selected from 2.5–12.0 mm; release starts at zero velocity after an 80 ms linear press. No product parameter is changed.',
    morphology:
      'Tail metrics use the final 100 ms. Fast and slow residuals subtract centered 11 ms and 51 ms moving averages. Exact plateaus are consecutive equal 0.01 kPa observations.',
    naturalVariation:
      'Each observation candidate is evaluated over 32 deterministic seeds at all four heights.',
  },
  realProfiles,
  realMetricRanges,
  dampingSweep,
  pressDurationSensitivity,
  selectedOfflineDampingCandidateNsPerM: bestDamping.dampingNsPerM,
  observationCandidates,
  interpretationRules: {
    common: 'A feature appearing in all four real runs may be a required morphology target.',
    recurringVariant: 'A feature appearing in two or three runs may occur probabilistically but must not be forced into every run.',
    isolated: 'A one-run feature is not used to add a model term without independent mechanism evidence.',
  },
  limitations: [
    'There is only one real trace per height, so height effects and between-run variability cannot be separated statistically.',
    'Release displacement, release velocity, press duration, hose geometry, and sensor cavity volume were not recorded.',
    'The damping sweep is an evidence trigger, not a parameter certification or direct product change.',
    'Observation candidate coefficients are mechanism probes and are not approved product defaults.',
  ],
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(OUTPUT_PATH);
console.log(JSON.stringify({
  selectedOfflineDampingCandidateNsPerM: output.selectedOfflineDampingCandidateNsPerM,
  realMetricRanges: output.realMetricRanges,
  dampingSweep: output.dampingSweep.map((row) => ({
    dampingNsPerM: row.dampingNsPerM,
    averageScore: row.averageScore,
    averageTimingRmseMs: row.averageTimingRmseMs,
    averageAmplitudeRmseKpa: row.averageAmplitudeRmseKpa,
    averageVisibleDurationErrorMs: row.averageVisibleDurationErrorMs,
  })),
  observationCandidates: output.observationCandidates.map((row) => ({
    id: row.id,
    tailStd: row.metricDistributions.tailStandardDeviationKpa,
    fastResidualStd: row.metricDistributions.fastResidualStandardDeviationKpa,
    tailLagOne: row.metricDistributions.tailLagOneCorrelation,
    plateauMs: row.metricDistributions.longestExactPlateauMs,
    periodShiftMs: row.primaryPeriodShiftMs,
  })),
}, null, 2));
