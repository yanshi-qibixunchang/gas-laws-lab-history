import fs from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG,
  getPistonCylinderAreaM2,
  getPistonOscillationSettlingStateAtProgress,
  getPistonOscillationSmallSignalFrequencyFromLockedHeightHz,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
} from '../../src/domain/pistonOscillation/pistonOscillationEquivalentLossModel.ts';
import {
  PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
  calculatePistonOscillationLinearFit,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
  createPistonOscillationDynamicSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG,
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_MODEL_VERSION,
  applyPistonOscillationTailIrregularityObservation,
} from '../../src/domain/pistonOscillation/pistonOscillationTailIrregularityObservationModel.ts';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(
  ROOT,
  'docs',
  'instrument-modeling',
  'reference',
  'piston-oscillation-real-data',
  'capstone-piston-oscillation-4runs-1000hz.csv',
);
const OUTPUT_DIRECTORY = path.join(
  ROOT,
  '.codex-tmp',
  'piston-oscillation-tail-irregularity-integration-validation',
);
const OUTPUT_PATH = path.join(OUTPUT_DIRECTORY, 'validation.json');
const SAMPLE_RATE_HZ = 1_000;
const PRESS_DURATION_S = 0.08;
const TRAJECTORY_DURATION_S = 0.5;
const SEED_COUNT = 256;
const CONFIG_OVERRIDE = process.env.PISTON_TAIL_CONFIG_JSON
  ? JSON.parse(process.env.PISTON_TAIL_CONFIG_JSON)
  : undefined;
const REFERENCE_GAMMA = 1.4;
const HEIGHTS_MM = [50, 40, 30, 20];
const RELEASE_AMPLITUDE_BY_HEIGHT_MM = new Map([
  [50, 10],
  [40, 9.25],
  [30, 7.75],
  [20, 7],
]);

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

const mean = (values) => (
  values.reduce((sum, value) => sum + value, 0) / values.length
);

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const quantile = (values, probability) => {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - position)
    + sorted[upper] * (position - lower);
};

const parseRealRuns = () => {
  const rows = fs.readFileSync(SOURCE_PATH, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(',').map(Number));
  return RUN_DEFINITIONS.map((definition, runIndex) => ({
    ...definition,
    samples: rows.map((row, sampleIndex) => ({
      sampleIndex,
      timeS: row[runIndex * 2],
      pressureKpa: row[runIndex * 2 + 1],
    })),
  }));
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

const extractPrimaryExtrema = (deviationsKpa, expectedPeriodS) => {
  const smoothed = centeredMovingAverage(deviationsKpa, 7);
  const candidates = [];
  for (let index = 2; index < smoothed.length - 2; index += 1) {
    const previous = smoothed[index - 1];
    const current = smoothed[index];
    const next = smoothed[index + 1];
    if (current > previous && current >= next) {
      candidates.push({ sampleIndex: index, type: 'peak', deviationKpa: current });
    } else if (current < previous && current <= next) {
      candidates.push({ sampleIndex: index, type: 'trough', deviationKpa: current });
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
      if (Math.abs(candidate.deviationKpa) > Math.abs(previous.deviationKpa)) {
        accepted[accepted.length - 1] = candidate;
      }
      continue;
    }
    if (candidate.sampleIndex - previous.sampleIndex < minimumDistanceSamples) continue;
    accepted.push(candidate);
  }
  return accepted.map((extremum) => ({
    ...extremum,
    timeS: extremum.sampleIndex / SAMPLE_RATE_HZ,
  }));
};

const createGuidePressHistory = (heightMm, amplitudeMm) => {
  const physicsConfig = {
    ambientPressurePa: 101_325,
    linearDampingNsPerM:
      DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.linearDampingNsPerM,
    sensorSampleRateHz: SAMPLE_RATE_HZ,
    trajectoryDurationS: TRAJECTORY_DURATION_S,
  };
  let state = getPistonOscillationSettlingStateAtProgress(
    heightMm,
    1,
    physicsConfig,
  );
  const equilibriumHeightMm = state.pistonHeightM * 1_000;
  const intervalCount = Math.round(PRESS_DURATION_S * SAMPLE_RATE_HZ);
  const pressSamples = [{ pressurePa: state.pressurePa }];
  for (let intervalIndex = 1; intervalIndex <= intervalCount; intervalIndex += 1) {
    state = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: state,
      pistonHeightMm:
        equilibriumHeightMm - amplitudeMm * intervalIndex / intervalCount,
      velocityMmPerS: -amplitudeMm / PRESS_DURATION_S,
      elapsedS: PRESS_DURATION_S / intervalCount,
      physicsConfig,
    });
    pressSamples.push({ pressurePa: state.pressurePa });
  }
  return {
    heightMm,
    amplitudeMm,
    physicsConfig,
    pressSamples,
    releaseState: state,
  };
};

const createProductReleaseTrajectory = (press) => (
  simulatePistonOscillationThermalRelease({
    lockedHeightMm: press.heightMm,
    initialDisplacementMm: -press.amplitudeMm,
    initialVelocityMmPerS: 0,
    referenceThermodynamicState: press.releaseState,
  }, {
    ...press.physicsConfig,
    linearDampingNsPerM:
      PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
    trajectoryDurationS: TRAJECTORY_DURATION_S,
  })
);

const summarize = (values) => ({
  minimum: Math.min(...values),
  p10: quantile(values, 0.1),
  p25: quantile(values, 0.25),
  median: median(values),
  p75: quantile(values, 0.75),
  p90: quantile(values, 0.9),
  maximum: Math.max(...values),
});

const calculateFit = (rows) => {
  const fit = calculatePistonOscillationLinearFit(rows.map((row, runIndex) => ({
    runIndex,
    measurementIndex: runIndex,
    rawMeasurementRecordId: `validation-${runIndex}`,
    periodSquaredS2: row.periodS ** 2,
    heightMm: row.heightMm,
    heightM: row.heightMm / 1_000,
  })), 0);
  if (!fit) throw new Error('The product linear-fit function rejected the validation rows.');
  const areaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const gamma = 4 * Math.PI ** 2
    * PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG
    * fit.slopeMPerS2
    / (areaM2 * PISTON_OSCILLATION_REFERENCE_PRESSURE_PA);
  return {
    gamma,
    gammaErrorPercent: Math.abs(gamma - REFERENCE_GAMMA) / REFERENCE_GAMMA * 100,
    rSquared: fit.rSquared,
  };
};

const findPhaseLockedRealExtrema = (run) => {
  const extrema = [];
  const maximumOrdinal = Math.floor(
    (run.faintVisibleUntilS - run.anchorTimeS) / (run.periodS / 2),
  );
  for (let ordinal = 0; ordinal <= maximumOrdinal; ordinal += 1) {
    const expectedTimeS = run.anchorTimeS + ordinal * run.periodS / 2;
    const type = ordinal % 2 === 0
      ? run.anchorType
      : run.anchorType === 'peak' ? 'trough' : 'peak';
    const halfWindowS = Math.min(0.004, run.periodS * 0.2);
    const candidates = run.samples.filter(
      (sample) => Math.abs(sample.timeS - expectedTimeS) <= halfWindowS,
    );
    const selected = candidates.reduce((best, candidate) => {
      if (!best) return candidate;
      return type === 'peak'
        ? candidate.pressureKpa > best.pressureKpa ? candidate : best
        : candidate.pressureKpa < best.pressureKpa ? candidate : best;
    }, null);
    if (selected) extrema.push({ ...selected, type, ordinal });
  }
  return extrema;
};

const getRealSelection = (run, strategy) => {
  const sameType = findPhaseLockedRealExtrema(run).filter(
    (extremum) => extremum.type === run.anchorType,
  );
  const periodCount = strategy === 'early' ? run.periodCount : 3;
  const left = strategy === 'early' ? sameType[0] : sameType.at(-(periodCount + 1));
  const right = strategy === 'early' ? sameType[periodCount] : sameType.at(-1);
  if (!left || !right) throw new Error(`Missing ${strategy} real selection for run ${run.run}.`);
  return {
    heightMm: run.heightMm,
    periodS: (right.timeS - left.timeS) / periodCount,
  };
};

const getModelSelection = (pressuresKpa, heightMm, strategy) => {
  const expectedPeriodS = 1
    / getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(
      heightMm,
      { ambientPressurePa: 101_325 },
    );
  const baselineKpa = mean(pressuresKpa.slice(-100));
  const extrema = extractPrimaryExtrema(
    pressuresKpa.map((pressureKpa) => pressureKpa - baselineKpa),
    expectedPeriodS,
  ).filter((extremum) => (
    extremum.timeS <= 0.26
    && Math.abs(extremum.deviationKpa) >= 0.08
  ));
  const anchorType = extrema[0]?.type;
  const sameType = extrema.filter((extremum) => extremum.type === anchorType);
  const periodCount = 3;
  const left = strategy === 'early' ? sameType[0] : sameType.at(-(periodCount + 1));
  const right = strategy === 'early' ? sameType[periodCount] : sameType.at(-1);
  if (!left || !right) {
    throw new Error(`Missing ${strategy} model selection at ${heightMm} mm.`);
  }
  return {
    heightMm,
    periodS: (right.timeS - left.timeS) / periodCount,
  };
};

const physicalByHeight = new Map(HEIGHTS_MM.map((heightMm) => {
  const amplitudeMm = RELEASE_AMPLITUDE_BY_HEIGHT_MM.get(heightMm);
  const press = createGuidePressHistory(heightMm, amplitudeMm);
  const trajectory = createProductReleaseTrajectory(press);
  const expectedPeriodS = 1
    / getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(
      heightMm,
      { ambientPressurePa: 101_325 },
    );
  return [heightMm, { press, trajectory, expectedPeriodS }];
}));

const experimentSeeds = Array.from(
  { length: SEED_COUNT },
  (_, index) => (0x3c6ef372 + index * 0x85ebca6b) >>> 0,
);
const experimentRows = experimentSeeds.map((experimentSeed) => {
  const earlyRows = [];
  const tailRows = [];
  const baselineEarlyRows = [];
  const baselineTailRows = [];
  const eventCounts = [];
  for (const heightMm of HEIGHTS_MM) {
    const physical = physicalByHeight.get(heightMm);
    const sensorSeed = (
      experimentSeed ^ Math.imul(heightMm, 0x27d4eb2d)
    ) >>> 0;
    const sensorConfig = {
      ...DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
      seed: sensorSeed,
    };
    const pressSeries = createPistonOscillationDynamicSensorObservationSeries(
      physical.press.pressSamples,
      SAMPLE_RATE_HZ,
      { config: sensorConfig },
    );
    const releaseSeries = createPistonOscillationDynamicSensorObservationSeries(
      physical.trajectory.samples,
      SAMPLE_RATE_HZ,
      {
        initialState: pressSeries.finalDynamicState,
        initialObservedPressureKpa:
          pressSeries.samples.at(-1)?.absolutePressureKpa ?? null,
        config: sensorConfig,
      },
    );
    const applied = applyPistonOscillationTailIrregularityObservation({
      observationSeries: releaseSeries,
      expectedPeriodS: physical.expectedPeriodS,
      config: CONFIG_OVERRIDE,
    });
    const baselinePressures = releaseSeries.samples.map(
      (sample) => sample.absolutePressureKpa,
    );
    const candidatePressures = applied.observationSeries.samples.map(
      (sample) => sample.absolutePressureKpa,
    );
    baselineEarlyRows.push(getModelSelection(baselinePressures, heightMm, 'early'));
    baselineTailRows.push(getModelSelection(baselinePressures, heightMm, 'tail'));
    earlyRows.push(getModelSelection(candidatePressures, heightMm, 'early'));
    tailRows.push(getModelSelection(candidatePressures, heightMm, 'tail'));
    eventCounts.push(applied.events.length);
  }
  const early = calculateFit(earlyRows);
  const tail = calculateFit(tailRows);
  const baselineEarly = calculateFit(baselineEarlyRows);
  const baselineTail = calculateFit(baselineTailRows);
  return {
    experimentSeed,
    early,
    tail,
    baselineEarly,
    baselineTail,
    tailErrorIncreasePercentagePoints:
      tail.gammaErrorPercent - early.gammaErrorPercent,
    baselineTailErrorIncreasePercentagePoints:
      baselineTail.gammaErrorPercent - baselineEarly.gammaErrorPercent,
    tailWorse: tail.gammaErrorPercent > early.gammaErrorPercent,
    tailFitWorse: tail.rSquared < early.rSquared,
    medianEventCount: median(eventCounts),
    medianAbsoluteTailPeriodDifferenceMs: median(tailRows.map((row, index) => (
      Math.abs(row.periodS - earlyRows[index].periodS) * 1_000
    ))),
  };
});

const realRuns = parseRealRuns();
const realEarlyRows = realRuns.map((run) => getRealSelection(run, 'early'));
const realTailRows = realRuns.map((run) => getRealSelection(run, 'tail'));
const realEarly = calculateFit(realEarlyRows);
const realTail = calculateFit(realTailRows);
const realTailErrorIncreasePercentagePoints =
  realTail.gammaErrorPercent - realEarly.gammaErrorPercent;
const realMedianAbsoluteTailPeriodDifferenceMs = median(realTailRows.map((row, index) => (
  Math.abs(row.periodS - realEarlyRows[index].periodS) * 1_000
)));
const candidateIncrease = summarize(
  experimentRows.map((row) => row.tailErrorIncreasePercentagePoints),
);
const baselineIncrease = summarize(
  experimentRows.map((row) => row.baselineTailErrorIncreasePercentagePoints),
);
const result = {
  generatedAt: new Date().toISOString(),
  status: 'formal-product-integration-validation',
  modelVersion: PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_MODEL_VERSION,
  effectiveConfig: {
    ...PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG,
    ...CONFIG_OVERRIDE,
  },
  comparisonDefinition: {
    real: 'User-confirmed early selection versus final three periods across 50/40/30/20 mm real traces.',
    product: 'First three versus final three detected primary periods across 50/40/30/20 mm, 256 deterministic experiment seeds.',
    consistencyTarget: 'Compare the additional tail-selection error, not the absolute total error of one real dataset.',
  },
  configOverride: CONFIG_OVERRIDE ?? null,
  real: {
    early: realEarly,
    tail: realTail,
    earlyRows: realEarlyRows,
    tailRows: realTailRows,
    tailErrorIncreasePercentagePoints: realTailErrorIncreasePercentagePoints,
    medianAbsoluteTailPeriodDifferenceMs: realMedianAbsoluteTailPeriodDifferenceMs,
  },
  product: {
    experimentCount: experimentRows.length,
    earlyGammaErrorPercent: summarize(
      experimentRows.map((row) => row.early.gammaErrorPercent),
    ),
    tailGammaErrorPercent: summarize(
      experimentRows.map((row) => row.tail.gammaErrorPercent),
    ),
    tailErrorIncreasePercentagePoints: candidateIncrease,
    baselineTailErrorIncreasePercentagePoints: baselineIncrease,
    tailWorseShare: mean(experimentRows.map((row) => Number(row.tailWorse))),
    tailFitWorseShare: mean(experimentRows.map((row) => Number(row.tailFitWorse))),
    medianAbsoluteTailPeriodDifferenceMs: summarize(
      experimentRows.map((row) => row.medianAbsoluteTailPeriodDifferenceMs),
    ),
    eventCount: summarize(experimentRows.map((row) => row.medianEventCount)),
  },
  alignment: {
    medianAdditionalErrorDifferencePercentagePoints:
      candidateIncrease.median - realTailErrorIncreasePercentagePoints,
    medianAdditionalErrorRatio:
      candidateIncrease.median / realTailErrorIncreasePercentagePoints,
    p10ToP90ContainsRealAdditionalError:
      realTailErrorIncreasePercentagePoints >= candidateIncrease.p10
      && realTailErrorIncreasePercentagePoints <= candidateIncrease.p90,
  },
  rows: experimentRows,
};

fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify({
  outputPath: OUTPUT_PATH,
  real: result.real,
  product: {
    experimentCount: result.product.experimentCount,
    earlyGammaErrorPercent: result.product.earlyGammaErrorPercent,
    tailGammaErrorPercent: result.product.tailGammaErrorPercent,
    tailErrorIncreasePercentagePoints:
      result.product.tailErrorIncreasePercentagePoints,
    tailWorseShare: result.product.tailWorseShare,
    tailFitWorseShare: result.product.tailFitWorseShare,
    medianAbsoluteTailPeriodDifferenceMs:
      result.product.medianAbsoluteTailPeriodDifferenceMs,
  },
  alignment: result.alignment,
}, null, 2));
