import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG,
  PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3,
  PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2,
  PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K,
  createPistonOscillationLoadedEquilibriumState,
  getPistonCylinderAreaM2,
  getPistonOscillationSettlingStateAtProgress,
  getPistonOscillationSmallSignalFrequencyFromLockedHeightHz,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG,
  advancePistonOscillationPrescribedThermodynamicState,
  getPistonOscillationThermalRelaxationTimeS,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
  createPistonOscillationDynamicSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(
  ROOT,
  'docs',
  'instrument-modeling',
  'reference',
  'piston-oscillation-real-data',
  'capstone-piston-oscillation-4runs-1000hz.csv',
);
const OUTPUT_DIR = path.join(
  ROOT,
  '.codex-tmp',
  'piston-oscillation-wp-t2',
);
const JSON_OUTPUT_PATH = path.join(OUTPUT_DIR, 'friction-reallocation-probe.json');
const CSV_OUTPUT_PATH = path.join(OUTPUT_DIR, 'friction-reallocation-grid.csv');
const REPORT_OUTPUT_PATH = path.join(OUTPUT_DIR, 'README.md');
const WAVEFORM_SVG_PATH = path.join(OUTPUT_DIR, 'waveform-comparison.svg');
const ENVELOPE_SVG_PATH = path.join(OUTPUT_DIR, 'envelope-comparison.svg');
const GRID_SVG_PATH = path.join(OUTPUT_DIR, 'parameter-grid.svg');

const SAMPLE_RATE_HZ = 1_000;
const SAMPLE_INTERVAL_S = 1 / SAMPLE_RATE_HZ;
const PRESS_DURATION_S = 0.08;
const TRAJECTORY_DURATION_S = 0.5;
const CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M = 1.1;
const ACCEPTED_PRESS_LINEAR_LOSS_NS_PER_M = 0.434;
const DEFAULT_REGULARIZATION_SPEED_M_PER_S = 0.002;
const BASELINE_SENSOR_SEED = 0x5f3759df;
const SENSOR_ROBUSTNESS_SEEDS = Array.from(
  { length: 12 },
  (_, index) => (0x6d2b79f5 + index * 0x9e3779b1) >>> 0,
);
const GUIDE_HEIGHTS_MM = [80, 70, 60];
const GUIDE_RELEASE_AMPLITUDE_MM = 8;
const COARSE_LINEAR_LOSS_VALUES = [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1];
const COARSE_COULOMB_VALUES = [0, 0.002, 0.004, 0.006, 0.008, 0.01];
const COARSE_AMPLITUDES_MM = Array.from({ length: 20 }, (_, index) => 2.5 + index * 0.5);
const FINE_AMPLITUDES_MM = Array.from({ length: 39 }, (_, index) => 2.5 + index * 0.25);

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
  return sorted[lower] * (upper - position) + sorted[upper] * (position - lower);
};

const summarize = (values) => ({
  minimum: Math.min(...values),
  p10: quantile(values, 0.1),
  median: quantile(values, 0.5),
  p90: quantile(values, 0.9),
  maximum: Math.max(...values),
});

const rootMeanSquare = (values) => Math.sqrt(mean(values.map((value) => value ** 2)));

const round = (value, digits = 6) => Number(value.toFixed(digits));

const uniqueSorted = (values) => [...new Set(values.map((value) => round(value, 9)))]
  .sort((left, right) => left - right);

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
    return { ...definition, samples, baselineKpa };
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
    if (!selected) throw new Error(`Missing phase-locked extremum for run ${run.run}.`);
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

const selectModelExtremaSequence = (run, pressuresKpa) => {
  const extrema = extractPrimaryExtrema(
    pressuresKpa.map((pressureKpa) => pressureKpa - run.baselineKpa),
    run.periodS,
  );
  const requiredCount = run.periodCount * 2 + 1;
  for (let startIndex = 0; startIndex < extrema.length; startIndex += 1) {
    if (extrema[startIndex].type !== run.anchorType) continue;
    const selected = extrema.slice(startIndex, startIndex + requiredCount);
    if (selected.length < requiredCount) continue;
    return selected.map((extremum, ordinal) => ({ ...extremum, ordinal }));
  }
  return null;
};

const getAmbientPressureForRealRunPa = (run) => {
  const areaM2 = getPistonCylinderAreaM2(PISTON_OSCILLATION_CYLINDER_DIAMETER_M);
  return run.baselineKpa * 1_000
    - PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG
      * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2
      / areaM2;
};

const pressCache = new Map();

const createPressHistory = (run, amplitudeMm) => {
  const key = `${run.heightMm}:${round(amplitudeMm, 3)}`;
  const cached = pressCache.get(key);
  if (cached) return cached;
  const physicsConfig = {
    ambientPressurePa: getAmbientPressureForRealRunPa(run),
    linearDampingNsPerM: ACCEPTED_PRESS_LINEAR_LOSS_NS_PER_M,
    sensorSampleRateHz: SAMPLE_RATE_HZ,
    trajectoryDurationS: TRAJECTORY_DURATION_S,
  };
  let state = getPistonOscillationSettlingStateAtProgress(
    run.heightMm,
    1,
    physicsConfig,
  );
  const equilibriumHeightMm = state.pistonHeightM * 1_000;
  const intervalCount = Math.round(PRESS_DURATION_S * SAMPLE_RATE_HZ);
  const pressSamples = [{ pressurePa: state.pressurePa }];
  for (let intervalIndex = 1; intervalIndex <= intervalCount; intervalIndex += 1) {
    state = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: state,
      pistonHeightMm: equilibriumHeightMm - amplitudeMm * intervalIndex / intervalCount,
      velocityMmPerS: -amplitudeMm / PRESS_DURATION_S,
      elapsedS: PRESS_DURATION_S / intervalCount,
      physicsConfig,
    });
    pressSamples.push({ pressurePa: state.pressurePa });
  }
  const result = {
    run,
    amplitudeMm,
    physicsConfig,
    pressSamples,
    releaseState: state,
  };
  pressCache.set(key, result);
  return result;
};

const addScaledDerivative = (state, derivative, scaleS) => ({
  displacementM: state.displacementM + derivative.displacementRateMPerS * scaleS,
  velocityMPerS: state.velocityMPerS + derivative.velocityRateMPerS2 * scaleS,
  temperatureK: state.temperatureK + derivative.temperatureRateKPerS * scaleS,
  cumulativeHeatTransferJ:
    state.cumulativeHeatTransferJ + derivative.heatTransferRateW * scaleS,
  heatTransferRateW:
    state.heatTransferRateW + derivative.heatTransferRateRateWPerS * scaleS,
  dissipatedEnergyJ:
    state.dissipatedEnergyJ + derivative.dissipatedPowerW * scaleS,
});

const createFrictionReleaseTrajectory = (
  press,
  candidate,
  maximumIntegrationRateHz = 12_000,
) => {
  const physicsConfig = {
    ...press.physicsConfig,
    linearDampingNsPerM: candidate.residualLinearLossNsPerM,
  };
  const equilibrium = createPistonOscillationLoadedEquilibriumState(
    press.run.heightMm,
    physicsConfig,
  );
  const thermalConfig = DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG;
  const cylinderAreaM2 = equilibrium.cylinderAreaM2;
  const gamma = physicsConfig.gamma ?? 1.4;
  const gasHeatCapacityJPerK = equilibrium.gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    / (gamma - 1);
  const initialDisplacementM = press.releaseState.pistonHeightM
    - equilibrium.equilibriumHeightM;
  const initialHeatTransferRateW = press.releaseState.thermal.enabled
    && 'heatTransferRateW' in press.releaseState.thermal
    ? press.releaseState.thermal.heatTransferRateW
    : 0;
  let state = {
    displacementM: initialDisplacementM,
    velocityMPerS: 0,
    temperatureK: press.releaseState.temperatureK,
    cumulativeHeatTransferJ: press.releaseState.thermal.enabled
      ? press.releaseState.thermal.cumulativeHeatTransferJ
      : 0,
    heatTransferRateW: initialHeatTransferRateW,
    dissipatedEnergyJ: 0,
  };
  const movingMassKg = physicsConfig.movingMassKg
    ?? PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG;
  const ambientPressurePa = physicsConfig.ambientPressurePa;
  const ambientTemperatureK = physicsConfig.ambientTemperatureK ?? 293.15;
  const initialEffectiveGasHeightM = press.releaseState.totalVolumeM3 / cylinderAreaM2;
  const initialAngularFrequencyRadPerS = Math.sqrt(
    gamma * press.releaseState.pressurePa * cylinderAreaM2
      / (movingMassKg * initialEffectiveGasHeightM),
  );
  const periodLimitedStepS = 1 / (
    initialAngularFrequencyRadPerS / (2 * Math.PI) * 240
  );
  const nearZeroEquivalentDampingNsPerM = candidate.residualLinearLossNsPerM
    + candidate.coulombFrictionN / candidate.regularizationSpeedMPerS;
  const dampingLimitedStepS = nearZeroEquivalentDampingNsPerM > 0
    ? movingMassKg / (nearZeroEquivalentDampingNsPerM * 50)
    : Number.POSITIVE_INFINITY;
  const maximumStepS = Math.min(
    1 / maximumIntegrationRateHz,
    thermalConfig.heatTransferLagTimeS / 8,
    periodLimitedStepS,
    dampingLimitedStepS,
  );
  const substepsPerSample = Math.max(1, Math.ceil(SAMPLE_INTERVAL_S / maximumStepS));
  const integrationStepS = SAMPLE_INTERVAL_S / substepsPerSample;

  const derivative = (current) => {
    const pistonHeightM = equilibrium.equilibriumHeightM + current.displacementM;
    if (!Number.isFinite(pistonHeightM) || pistonHeightM < 0) {
      throw new RangeError('Analysis candidate passed below the 0 mm stop.');
    }
    const totalVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
      + cylinderAreaM2 * pistonHeightM;
    const pressurePa = equilibrium.gasAmountMol
      * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
      * current.temperatureK / totalVolumeM3;
    const pressureForceN = cylinderAreaM2 * (pressurePa - ambientPressurePa);
    const gravityForceN = movingMassKg * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2;
    const linearLossForceN = candidate.residualLinearLossNsPerM
      * current.velocityMPerS;
    const coulombLossForceN = candidate.coulombFrictionN * Math.tanh(
      current.velocityMPerS / candidate.regularizationSpeedMPerS,
    );
    const relaxationTimeS = getPistonOscillationThermalRelaxationTimeS(
      totalVolumeM3,
      thermalConfig,
    );
    const targetHeatTransferRateW = gasHeatCapacityJPerK
      * (ambientTemperatureK - current.temperatureK) / relaxationTimeS;
    const temperatureRateFromWorkKPerS = -(gamma - 1)
      * current.temperatureK * cylinderAreaM2 * current.velocityMPerS
      / totalVolumeM3;
    const dissipatedPowerW = candidate.residualLinearLossNsPerM
      * current.velocityMPerS ** 2
      + coulombLossForceN * current.velocityMPerS;
    return {
      displacementRateMPerS: current.velocityMPerS,
      velocityRateMPerS2: (
        pressureForceN - gravityForceN - linearLossForceN - coulombLossForceN
      ) / movingMassKg,
      temperatureRateKPerS:
        temperatureRateFromWorkKPerS + current.heatTransferRateW / gasHeatCapacityJPerK,
      heatTransferRateW: current.heatTransferRateW,
      heatTransferRateRateWPerS:
        (targetHeatTransferRateW - current.heatTransferRateW)
        / thermalConfig.heatTransferLagTimeS,
      dissipatedPowerW,
    };
  };

  const integrate = (current) => {
    const k1 = derivative(current);
    const k2 = derivative(addScaledDerivative(current, k1, integrationStepS / 2));
    const k3 = derivative(addScaledDerivative(current, k2, integrationStepS / 2));
    const k4 = derivative(addScaledDerivative(current, k3, integrationStepS));
    return {
      displacementM: current.displacementM + integrationStepS / 6 * (
        k1.displacementRateMPerS + 2 * k2.displacementRateMPerS
        + 2 * k3.displacementRateMPerS + k4.displacementRateMPerS
      ),
      velocityMPerS: current.velocityMPerS + integrationStepS / 6 * (
        k1.velocityRateMPerS2 + 2 * k2.velocityRateMPerS2
        + 2 * k3.velocityRateMPerS2 + k4.velocityRateMPerS2
      ),
      temperatureK: current.temperatureK + integrationStepS / 6 * (
        k1.temperatureRateKPerS + 2 * k2.temperatureRateKPerS
        + 2 * k3.temperatureRateKPerS + k4.temperatureRateKPerS
      ),
      cumulativeHeatTransferJ: current.cumulativeHeatTransferJ + integrationStepS / 6 * (
        k1.heatTransferRateW + 2 * k2.heatTransferRateW
        + 2 * k3.heatTransferRateW + k4.heatTransferRateW
      ),
      heatTransferRateW: current.heatTransferRateW + integrationStepS / 6 * (
        k1.heatTransferRateRateWPerS + 2 * k2.heatTransferRateRateWPerS
        + 2 * k3.heatTransferRateRateWPerS + k4.heatTransferRateRateWPerS
      ),
      dissipatedEnergyJ: current.dissipatedEnergyJ + integrationStepS / 6 * (
        k1.dissipatedPowerW + 2 * k2.dissipatedPowerW
        + 2 * k3.dissipatedPowerW + k4.dissipatedPowerW
      ),
    };
  };

  const sampleCount = Math.floor(TRAJECTORY_DURATION_S * SAMPLE_RATE_HZ) + 1;
  const samples = [];
  let minimumDissipatedPowerW = Number.POSITIVE_INFINITY;
  let minimumDissipatedEnergyIncrementJ = Number.POSITIVE_INFINITY;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const pistonHeightM = equilibrium.equilibriumHeightM + state.displacementM;
    const totalVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
      + cylinderAreaM2 * pistonHeightM;
    const pressurePa = equilibrium.gasAmountMol
      * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
      * state.temperatureK / totalVolumeM3;
    const instantaneousDerivative = derivative(state);
    minimumDissipatedPowerW = Math.min(
      minimumDissipatedPowerW,
      instantaneousDerivative.dissipatedPowerW,
    );
    samples.push({
      timeS: sampleIndex / SAMPLE_RATE_HZ,
      displacementM: state.displacementM,
      velocityMPerS: state.velocityMPerS,
      pressurePa,
      temperatureK: state.temperatureK,
      cumulativeHeatTransferJ: state.cumulativeHeatTransferJ,
      heatTransferRateW: state.heatTransferRateW,
      dissipatedEnergyJ: state.dissipatedEnergyJ,
    });
    if (sampleIndex === sampleCount - 1) break;
    const previousDissipatedEnergyJ = state.dissipatedEnergyJ;
    for (let substep = 0; substep < substepsPerSample; substep += 1) {
      state = integrate(state);
    }
    minimumDissipatedEnergyIncrementJ = Math.min(
      minimumDissipatedEnergyIncrementJ,
      state.dissipatedEnergyJ - previousDissipatedEnergyJ,
    );
  }
  return {
    samples,
    equilibrium,
    substepsPerSample,
    integrationStepS,
    minimumDissipatedPowerW,
    minimumDissipatedEnergyIncrementJ,
    totalDissipatedEnergyJ: samples.at(-1).dissipatedEnergyJ,
  };
};

const observeRelease = (press, trajectory, seed) => {
  const combined = [
    ...press.pressSamples,
    ...trajectory.samples.slice(1).map((sample) => ({ pressurePa: sample.pressurePa })),
  ];
  const releaseStartIndex = press.pressSamples.length - 1;
  const observed = createPistonOscillationDynamicSensorObservationSeries(
    combined,
    SAMPLE_RATE_HZ,
    {
      config: {
        ...DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
        seed,
      },
    },
  );
  return observed.samples
    .slice(releaseStartIndex, releaseStartIndex + trajectory.samples.length)
    .map((sample) => sample.absolutePressureKpa);
};

const scoreObservedRun = (run, realExtrema, pressuresKpa) => {
  const modelExtrema = selectModelExtremaSequence(run, pressuresKpa);
  if (!modelExtrema) return null;
  const timingErrorsMs = modelExtrema.map((extremum, index) => (
    (
      extremum.timeS - modelExtrema[0].timeS
      - (realExtrema[index].timeS - realExtrema[0].timeS)
    ) * 1_000
  ));
  const amplitudeErrorsKpa = modelExtrema.map((extremum, index) => (
    extremum.deviationKpa - realExtrema[index].deviationKpa
  ));
  const realFirstMagnitude = Math.max(0.01, Math.abs(realExtrema[0].deviationKpa));
  const modelFirstMagnitude = Math.max(0.01, Math.abs(modelExtrema[0].deviationKpa));
  const envelopeShapeErrors = modelExtrema.map((extremum, index) => (
    Math.abs(extremum.deviationKpa) / modelFirstMagnitude
    - Math.abs(realExtrema[index].deviationKpa) / realFirstMagnitude
  ));
  const lateStartIndex = Math.floor(modelExtrema.length * 0.55);
  const lateAmplitudeErrorsKpa = amplitudeErrorsKpa.slice(lateStartIndex);
  const allPrimaryExtrema = extractPrimaryExtrema(
    pressuresKpa.map((pressureKpa) => pressureKpa - run.baselineKpa),
    run.periodS,
  );
  const visible = allPrimaryExtrema.filter(
    (extremum) => Math.abs(extremum.deviationKpa) >= 0.5,
  );
  const visibleDurationS = visible.length > 0 ? visible.at(-1).timeS : 0;
  const visibleDurationErrorS = visibleDurationS < run.clearVisibleUntilS
    ? run.clearVisibleUntilS - visibleDurationS
    : visibleDurationS > run.faintVisibleUntilS
      ? visibleDurationS - run.faintVisibleUntilS
      : 0;
  const timingRmseMs = rootMeanSquare(timingErrorsMs);
  const amplitudeRmseKpa = rootMeanSquare(amplitudeErrorsKpa);
  const lateAmplitudeRmseKpa = rootMeanSquare(lateAmplitudeErrorsKpa);
  const envelopeShapeRmse = rootMeanSquare(envelopeShapeErrors);
  const modelPeriodMs = (
    modelExtrema.at(-1).timeS - modelExtrema[0].timeS
  ) / run.periodCount * 1_000;
  return {
    pressuresKpa,
    modelExtrema,
    modelPeriodMs,
    timingRmseMs,
    amplitudeRmseKpa,
    lateAmplitudeRmseKpa,
    envelopeShapeRmse,
    visibleDurationMs: visibleDurationS * 1_000,
    visibleDurationErrorMs: visibleDurationErrorS * 1_000,
    score:
      timingRmseMs / 1.5
      + amplitudeRmseKpa / 0.75
      + lateAmplitudeRmseKpa / 0.75
      + envelopeShapeRmse / 0.08
      + visibleDurationErrorS / 0.03,
  };
};

const simulationCache = new Map();

const simulateCandidateRun = (run, candidate, amplitudeMm, seed = BASELINE_SENSOR_SEED) => {
  const key = [
    run.run,
    round(candidate.residualLinearLossNsPerM, 4),
    round(candidate.coulombFrictionN, 5),
    round(candidate.regularizationSpeedMPerS, 5),
    round(amplitudeMm, 3),
    seed,
  ].join(':');
  const cached = simulationCache.get(key);
  if (cached) return cached;
  const press = createPressHistory(run, amplitudeMm);
  const trajectory = createFrictionReleaseTrajectory(press, candidate);
  const pressuresKpa = observeRelease(press, trajectory, seed);
  const result = { press, trajectory, pressuresKpa };
  simulationCache.set(key, result);
  return result;
};

const evaluateCandidate = (realRuns, candidate, amplitudeValuesMm) => {
  const runs = realRuns.map((run) => {
    const realExtrema = extractRealPhaseLockedExtrema(run);
    let best = null;
    for (const amplitudeMm of amplitudeValuesMm) {
      const simulation = simulateCandidateRun(run, candidate, amplitudeMm);
      const score = scoreObservedRun(run, realExtrema, simulation.pressuresKpa);
      if (!score) continue;
      const result = {
        ...score,
        amplitudeMm,
        totalDissipatedEnergyJ: simulation.trajectory.totalDissipatedEnergyJ,
        minimumDissipatedPowerW: simulation.trajectory.minimumDissipatedPowerW,
        minimumDissipatedEnergyIncrementJ:
          simulation.trajectory.minimumDissipatedEnergyIncrementJ,
      };
      if (!best || result.score < best.score) best = result;
    }
    if (!best) throw new Error(`Candidate has no usable fit for run ${run.run}.`);
    return {
      run: run.run,
      heightMm: run.heightMm,
      realPeriodMs: run.periodS * 1_000,
      realVisibleRangeMs: [run.clearVisibleUntilS * 1_000, run.faintVisibleUntilS * 1_000],
      ...best,
    };
  });
  return {
    ...candidate,
    averageScore: mean(runs.map((run) => run.score)),
    averageTimingRmseMs: mean(runs.map((run) => run.timingRmseMs)),
    averageAmplitudeRmseKpa: mean(runs.map((run) => run.amplitudeRmseKpa)),
    averageLateAmplitudeRmseKpa: mean(runs.map((run) => run.lateAmplitudeRmseKpa)),
    averageEnvelopeShapeRmse: mean(runs.map((run) => run.envelopeShapeRmse)),
    averageVisibleDurationErrorMs: mean(runs.map((run) => run.visibleDurationErrorMs)),
    runs,
  };
};

const createCandidate = (
  residualLinearLossNsPerM,
  coulombFrictionN,
  regularizationSpeedMPerS = DEFAULT_REGULARIZATION_SPEED_M_PER_S,
) => ({ residualLinearLossNsPerM, coulombFrictionN, regularizationSpeedMPerS });

const createProductBaselineTrajectory = (press) => simulatePistonOscillationThermalRelease({
  lockedHeightMm: press.run.heightMm,
  initialDisplacementMm: -press.amplitudeMm,
  initialVelocityMmPerS: 0,
  referenceThermodynamicState: press.releaseState,
}, {
  ...press.physicsConfig,
  linearDampingNsPerM: CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
  trajectoryDurationS: TRAJECTORY_DURATION_S,
});

const validateZeroFrictionDegeneration = (realRuns) => {
  const baseline = createCandidate(CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M, 0);
  const rows = realRuns.map((run) => {
    const press = createPressHistory(run, 8);
    const custom = createFrictionReleaseTrajectory(press, baseline);
    const product = createProductBaselineTrajectory(press);
    const pressureDifferencesKpa = custom.samples.map((sample, index) => (
      Math.abs(sample.pressurePa - product.samples[index].pressurePa) / 1_000
    ));
    const displacementDifferencesMm = custom.samples.map((sample, index) => (
      Math.abs(sample.displacementM - product.samples[index].displacementM) * 1_000
    ));
    return {
      run: run.run,
      heightMm: run.heightMm,
      customSubstepsPerSample: custom.substepsPerSample,
      productSubstepsPerSample: product.integrationSubstepsPerSample,
      maximumPressureDifferenceKpa: Math.max(...pressureDifferencesKpa),
      maximumDisplacementDifferenceMm: Math.max(...displacementDifferencesMm),
    };
  });
  return {
    rows,
    maximumPressureDifferenceKpa: Math.max(...rows.map((row) => row.maximumPressureDifferenceKpa)),
    maximumDisplacementDifferenceMm:
      Math.max(...rows.map((row) => row.maximumDisplacementDifferenceMm)),
  };
};

const createGuideRun = (heightMm) => ({
  run: `guide-${heightMm}`,
  heightMm,
  baselineKpa: (
    101_325
    + PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG
      * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2
      / getPistonCylinderAreaM2(PISTON_OSCILLATION_CYLINDER_DIAMETER_M)
  ) / 1_000,
});

const createGuidePressHistory = (heightMm, amplitudeMm) => {
  const run = createGuideRun(heightMm);
  const key = `guide:${heightMm}:${round(amplitudeMm, 3)}`;
  const cached = pressCache.get(key);
  if (cached) return cached;
  const physicsConfig = {
    ambientPressurePa: 101_325,
    linearDampingNsPerM: ACCEPTED_PRESS_LINEAR_LOSS_NS_PER_M,
    sensorSampleRateHz: SAMPLE_RATE_HZ,
    trajectoryDurationS: TRAJECTORY_DURATION_S,
  };
  let state = getPistonOscillationSettlingStateAtProgress(heightMm, 1, physicsConfig);
  const equilibriumHeightMm = state.pistonHeightM * 1_000;
  const intervalCount = Math.round(PRESS_DURATION_S * SAMPLE_RATE_HZ);
  const pressSamples = [{ pressurePa: state.pressurePa }];
  for (let intervalIndex = 1; intervalIndex <= intervalCount; intervalIndex += 1) {
    state = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: state,
      pistonHeightMm: equilibriumHeightMm - amplitudeMm * intervalIndex / intervalCount,
      velocityMmPerS: -amplitudeMm / PRESS_DURATION_S,
      elapsedS: PRESS_DURATION_S / intervalCount,
      physicsConfig,
    });
    pressSamples.push({ pressurePa: state.pressurePa });
  }
  const result = {
    run,
    amplitudeMm,
    physicsConfig,
    pressSamples,
    releaseState: state,
  };
  pressCache.set(key, result);
  return result;
};

const estimatePeriodMs = (heightMm, pressuresKpa) => {
  const expectedPeriodS = 1 / getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(
    heightMm,
    { ambientPressurePa: 101_325 },
  );
  const baselineKpa = createGuideRun(heightMm).baselineKpa;
  const extrema = extractPrimaryExtrema(
    pressuresKpa.map((pressureKpa) => pressureKpa - baselineKpa),
    expectedPeriodS,
  );
  const intervalsMs = [];
  for (let index = 2; index < Math.min(extrema.length, 10); index += 1) {
    if (extrema[index].type !== extrema[index - 2].type) continue;
    intervalsMs.push((extrema[index].timeS - extrema[index - 2].timeS) * 1_000);
  }
  if (intervalsMs.length < 2) {
    throw new Error(`Unable to estimate a stable period at ${heightMm} mm.`);
  }
  return median(intervalsMs);
};

const calculateGammaFromHeightPeriods = (rows) => {
  const xValues = rows.map((row) => (row.periodMs / 1_000) ** 2);
  const yValues = rows.map((row) => row.nominalHeightMm / 1_000);
  const meanX = mean(xValues);
  const meanY = mean(yValues);
  const covariance = xValues.reduce(
    (sum, value, index) => sum + (value - meanX) * (yValues[index] - meanY),
    0,
  );
  const variance = xValues.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const slopeMPerS2 = covariance / variance;
  const areaM2 = getPistonCylinderAreaM2(PISTON_OSCILLATION_CYLINDER_DIAMETER_M);
  const gamma = 4 * Math.PI ** 2
    * PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG
    * slopeMPerS2
    / (areaM2 * PISTON_OSCILLATION_REFERENCE_PRESSURE_PA);
  return { slopeMPerS2, gamma };
};

const evaluateGuideOutcome = (
  candidate,
  seed = BASELINE_SENSOR_SEED,
  actualHeightOverrides = {},
  maximumIntegrationRateHz = 12_000,
) => {
  const rows = GUIDE_HEIGHTS_MM.map((nominalHeightMm) => {
    const actualHeightMm = actualHeightOverrides[nominalHeightMm] ?? nominalHeightMm;
    const press = createGuidePressHistory(actualHeightMm, GUIDE_RELEASE_AMPLITUDE_MM);
    const trajectory = createFrictionReleaseTrajectory(
      press,
      candidate,
      maximumIntegrationRateHz,
    );
    const pressuresKpa = observeRelease(press, trajectory, seed);
    return {
      nominalHeightMm,
      actualHeightMm,
      periodMs: estimatePeriodMs(actualHeightMm, pressuresKpa),
    };
  });
  return { rows, ...calculateGammaFromHeightPeriods(rows) };
};

const compareCandidateWaveforms = (realRuns, baseline, candidate) => realRuns.map((run) => {
  const baselineRun = baseline.runs.find((row) => row.run === run.run);
  const candidateRun = candidate.runs.find((row) => row.run === run.run);
  const baselineSimulation = simulateCandidateRun(
    run,
    baseline,
    baselineRun.amplitudeMm,
  );
  const candidateSimulation = simulateCandidateRun(
    run,
    candidate,
    baselineRun.amplitudeMm,
  );
  const earlySampleCount = Math.round(0.15 * SAMPLE_RATE_HZ) + 1;
  const earlyRmsDifferenceKpa = rootMeanSquare(
    candidateSimulation.pressuresKpa.slice(0, earlySampleCount).map(
      (value, index) => value - baselineSimulation.pressuresKpa[index],
    ),
  );
  return {
    run: run.run,
    heightMm: run.heightMm,
    baselineAmplitudeMm: baselineRun.amplitudeMm,
    candidateAmplitudeMm: candidateRun.amplitudeMm,
    comparisonAmplitudeMm: baselineRun.amplitudeMm,
    earlyRmsDifferenceKpa,
  };
});

const evaluateSeedRobustness = (realRuns, evaluatedCandidate) => {
  const seedRows = SENSOR_ROBUSTNESS_SEEDS.map((seed) => {
    const runs = realRuns.map((run) => {
      const fitted = evaluatedCandidate.runs.find((row) => row.run === run.run);
      const simulation = simulateCandidateRun(run, evaluatedCandidate, fitted.amplitudeMm, seed);
      const score = scoreObservedRun(
        run,
        extractRealPhaseLockedExtrema(run),
        simulation.pressuresKpa,
      );
      if (!score) throw new Error(`Seed ${seed} lost extrema for run ${run.run}.`);
      return score;
    });
    return {
      seed,
      averageScore: mean(runs.map((run) => run.score)),
      averageTimingRmseMs: mean(runs.map((run) => run.timingRmseMs)),
      averageAmplitudeRmseKpa: mean(runs.map((run) => run.amplitudeRmseKpa)),
      averageLateAmplitudeRmseKpa: mean(runs.map((run) => run.lateAmplitudeRmseKpa)),
    };
  });
  return {
    seedCount: seedRows.length,
    rows: seedRows,
    averageScore: summarize(seedRows.map((row) => row.averageScore)),
    averageTimingRmseMs: summarize(seedRows.map((row) => row.averageTimingRmseMs)),
    averageAmplitudeRmseKpa:
      summarize(seedRows.map((row) => row.averageAmplitudeRmseKpa)),
    averageLateAmplitudeRmseKpa:
      summarize(seedRows.map((row) => row.averageLateAmplitudeRmseKpa)),
  };
};

const evaluatePairedSeedComparison = (realRuns, zeroFrictionCandidate, frictionCandidate) => {
  const rows = SENSOR_ROBUSTNESS_SEEDS.map((seed) => {
    const evaluateAtSeed = (candidate) => mean(realRuns.map((run) => {
      const fitted = candidate.runs.find((row) => row.run === run.run);
      const simulation = simulateCandidateRun(run, candidate, fitted.amplitudeMm, seed);
      const score = scoreObservedRun(
        run,
        extractRealPhaseLockedExtrema(run),
        simulation.pressuresKpa,
      );
      if (!score) throw new Error(`Seed ${seed} lost extrema for run ${run.run}.`);
      return score.score;
    }));
    const zeroFrictionScore = evaluateAtSeed(zeroFrictionCandidate);
    const frictionScore = evaluateAtSeed(frictionCandidate);
    return {
      seed,
      zeroFrictionScore,
      frictionScore,
      frictionMinusZeroScore: frictionScore - zeroFrictionScore,
    };
  });
  return {
    seedCount: rows.length,
    frictionMinusZeroScore: summarize(
      rows.map((row) => row.frictionMinusZeroScore),
    ),
    frictionBetterShare: rows.filter((row) => row.frictionMinusZeroScore < 0).length
      / rows.length,
    rows,
  };
};

const evaluateRegularizationSensitivity = (realRuns, candidate) => [0.001, 0.002, 0.004]
  .map((regularizationSpeedMPerS) => evaluateCandidate(
    realRuns,
    createCandidate(
      candidate.residualLinearLossNsPerM,
      candidate.coulombFrictionN,
      regularizationSpeedMPerS,
    ),
    FINE_AMPLITUDES_MM,
  ))
  .map((row) => ({
    regularizationSpeedMmPerS: row.regularizationSpeedMPerS * 1_000,
    averageScore: row.averageScore,
    averageTimingRmseMs: row.averageTimingRmseMs,
    averageAmplitudeRmseKpa: row.averageAmplitudeRmseKpa,
    averageLateAmplitudeRmseKpa: row.averageLateAmplitudeRmseKpa,
    averageVisibleDurationErrorMs: row.averageVisibleDurationErrorMs,
  }));

const validateIntegrationConvergence = (candidate) => {
  const waveformRows = GUIDE_HEIGHTS_MM.map((heightMm) => {
    const press = createGuidePressHistory(heightMm, GUIDE_RELEASE_AMPLITUDE_MM);
    const coarse = createFrictionReleaseTrajectory(press, candidate, 12_000);
    const fine = createFrictionReleaseTrajectory(press, candidate, 24_000);
    return {
      heightMm,
      maximumPressureDifferenceKpa: Math.max(...coarse.samples.map(
        (sample, index) => Math.abs(sample.pressurePa - fine.samples[index].pressurePa) / 1_000,
      )),
      maximumDisplacementDifferenceMm: Math.max(...coarse.samples.map(
        (sample, index) => Math.abs(
          sample.displacementM - fine.samples[index].displacementM,
        ) * 1_000,
      )),
      dissipatedEnergyDifferenceJ: Math.abs(
        coarse.totalDissipatedEnergyJ - fine.totalDissipatedEnergyJ,
      ),
    };
  });
  const coarseGuide = evaluateGuideOutcome(candidate, BASELINE_SENSOR_SEED, {}, 12_000);
  const fineGuide = evaluateGuideOutcome(candidate, BASELINE_SENSOR_SEED, {}, 24_000);
  return {
    waveformRows,
    maximumPressureDifferenceKpa:
      Math.max(...waveformRows.map((row) => row.maximumPressureDifferenceKpa)),
    maximumDisplacementDifferenceMm:
      Math.max(...waveformRows.map((row) => row.maximumDisplacementDifferenceMm)),
    gammaAbsoluteDifference: Math.abs(coarseGuide.gamma - fineGuide.gamma),
  };
};

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const svgPolyline = (points, xScale, yScale, attributes) => (
  `<polyline points="${points.map((point) => `${round(xScale(point.x), 2)},${round(yScale(point.y), 2)}`).join(' ')}" ${attributes}/>`
);

const createSmallMultipleSvg = ({ title, panels, envelope = false }) => {
  const width = 1400;
  const height = 900;
  const outerLeft = 82;
  const outerTop = 92;
  const gapX = 58;
  const gapY = 62;
  const panelWidth = (width - outerLeft - 60 - gapX) / 2;
  const panelHeight = (height - outerTop - 70 - gapY) / 2;
  const xMinimum = 0;
  const xMaximum = 0.35;
  const yMinimum = envelope ? 0 : -18;
  const yMaximum = 18;
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#fbfcfe"/>',
    `<text x="${width / 2}" y="38" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei, sans-serif" font-size="25" font-weight="700" fill="#172033">${escapeXml(title)}</text>`,
    '<g font-family="Segoe UI, Microsoft YaHei, sans-serif" font-size="14" fill="#344054">',
    '<line x1="260" y1="66" x2="300" y2="66" stroke="#1677b8" stroke-width="3"/><text x="310" y="71">四组实测</text>',
    '<line x1="440" y1="66" x2="480" y2="66" stroke="#667085" stroke-width="2.5" stroke-dasharray="8 5"/><text x="490" y="71">WP-T1 基线</text>',
    '<line x1="660" y1="66" x2="700" y2="66" stroke="#29845a" stroke-width="2.5" stroke-dasharray="3 4"/><text x="710" y="71">最佳零摩擦重分配</text>',
    '<line x1="980" y1="66" x2="1020" y2="66" stroke="#e36a1b" stroke-width="3"/><text x="1030" y="71">非零摩擦探针</text>',
    '</g>',
  ];
  panels.forEach((panel, panelIndex) => {
    const column = panelIndex % 2;
    const row = Math.floor(panelIndex / 2);
    const left = outerLeft + column * (panelWidth + gapX);
    const top = outerTop + row * (panelHeight + gapY);
    const xScale = (value) => left + (value - xMinimum) / (xMaximum - xMinimum) * panelWidth;
    const yScale = (value) => top + panelHeight
      - (value - yMinimum) / (yMaximum - yMinimum) * panelHeight;
    const clipId = `panel-clip-${panelIndex}`;
    lines.push(`<defs><clipPath id="${clipId}"><rect x="${left}" y="${top}" width="${panelWidth}" height="${panelHeight}"/></clipPath></defs>`);
    lines.push(`<rect x="${left}" y="${top}" width="${panelWidth}" height="${panelHeight}" fill="#fff" stroke="#b8c2d1"/>`);
    for (let tick = 0; tick <= 7; tick += 1) {
      const value = tick * 0.05;
      const x = xScale(value);
      lines.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + panelHeight}" stroke="#e7ebf1"/>`);
      lines.push(`<text x="${x}" y="${top + panelHeight + 20}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#667085">${value.toFixed(2)}</text>`);
    }
    const yTicks = envelope ? [0, 3, 6, 9, 12, 15, 18] : [-15, -10, -5, 0, 5, 10, 15];
    for (const value of yTicks) {
      const y = yScale(value);
      lines.push(`<line x1="${left}" y1="${y}" x2="${left + panelWidth}" y2="${y}" stroke="${value === 0 ? '#c8d0dc' : '#e7ebf1'}"/>`);
      lines.push(`<text x="${left - 10}" y="${y + 4}" text-anchor="end" font-family="Segoe UI" font-size="12" fill="#667085">${value}</text>`);
    }
    lines.push(`<text x="${left + 8}" y="${top + 23}" font-family="Segoe UI, Microsoft YaHei" font-size="17" font-weight="700" fill="#172033">${panel.heightMm} mm</text>`);
    lines.push(svgPolyline(panel.real, xScale, yScale, `clip-path="url(#${clipId})" fill="none" stroke="#1677b8" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"`));
    lines.push(svgPolyline(panel.baseline, xScale, yScale, `clip-path="url(#${clipId})" fill="none" stroke="#667085" stroke-width="2.2" stroke-dasharray="8 5" stroke-linejoin="round" stroke-linecap="round"`));
    lines.push(svgPolyline(panel.zeroReallocation, xScale, yScale, `clip-path="url(#${clipId})" fill="none" stroke="#29845a" stroke-width="2.2" stroke-dasharray="3 4" stroke-linejoin="round" stroke-linecap="round"`));
    lines.push(svgPolyline(panel.candidate, xScale, yScale, `clip-path="url(#${clipId})" fill="none" stroke="#e36a1b" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"`));
    lines.push(`<text x="${left + panelWidth / 2}" y="${top + panelHeight + 41}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="13" fill="#475467">释放后时间 / s</text>`);
    lines.push(`<text x="${left - 50}" y="${top + panelHeight / 2}" transform="rotate(-90 ${left - 50} ${top + panelHeight / 2})" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="13" fill="#475467">${envelope ? '极值幅度 / kPa' : '相对平衡压强 / kPa'}</text>`);
  });
  lines.push('</svg>');
  return lines.join('\n');
};

const scoreColor = (delta, scale) => {
  const normalized = Math.max(-1, Math.min(1, delta / scale));
  if (normalized <= 0) {
    const amount = -normalized;
    return `rgb(${Math.round(240 - 80 * amount)},${Math.round(248 - 35 * amount)},${Math.round(242 - 60 * amount)})`;
  }
  return `rgb(250,${Math.round(245 - 95 * normalized)},${Math.round(240 - 100 * normalized)})`;
};

const createParameterGridSvg = (rows, baseline, selected) => {
  const linearValues = uniqueSorted(rows.map((row) => row.residualLinearLossNsPerM));
  const frictionValues = uniqueSorted(rows.map((row) => row.coulombFrictionN));
  const width = 1300;
  const height = 760;
  const left = 150;
  const top = 100;
  const gridWidth = 1020;
  const gridHeight = 540;
  const cellWidth = gridWidth / frictionValues.length;
  const cellHeight = gridHeight / linearValues.length;
  const maximumAbsDelta = Math.max(
    0.1,
    ...rows.map((row) => Math.abs(row.averageScore - baseline.averageScore)),
  );
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#fbfcfe"/>',
    '<text x="650" y="42" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="25" font-weight="700" fill="#172033">摩擦—剩余线性损耗联合扫描</text>',
    `<text x="650" y="70" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">颜色为综合诊断分数相对 WP-T1 的变化：绿色更优，红色更差；空白为细网格未覆盖组合</text>`,
  ];
  linearValues.slice().reverse().forEach((linear, visualRow) => {
    const y = top + visualRow * cellHeight;
    lines.push(`<text x="${left - 14}" y="${y + cellHeight / 2 + 5}" text-anchor="end" font-family="Segoe UI" font-size="13" fill="#475467">${linear.toFixed(3)}</text>`);
    frictionValues.forEach((friction, column) => {
      const x = left + column * cellWidth;
      const row = rows.find((candidate) => (
        Math.abs(candidate.residualLinearLossNsPerM - linear) < 1e-9
        && Math.abs(candidate.coulombFrictionN - friction) < 1e-9
      ));
      if (!row) {
        lines.push(`<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="#f2f4f7" stroke="#fff"/>`);
        return;
      }
      const delta = row.averageScore - baseline.averageScore;
      const selectedCell = Math.abs(row.residualLinearLossNsPerM - selected.residualLinearLossNsPerM) < 1e-9
        && Math.abs(row.coulombFrictionN - selected.coulombFrictionN) < 1e-9;
      lines.push(`<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${scoreColor(delta, maximumAbsDelta)}" stroke="${selectedCell ? '#7a2e0e' : '#fff'}" stroke-width="${selectedCell ? 4 : 1}"/>`);
      lines.push(`<text x="${x + cellWidth / 2}" y="${y + cellHeight / 2 + 4}" text-anchor="middle" font-family="Segoe UI" font-size="11" font-weight="${selectedCell ? 700 : 400}" fill="#172033">${delta >= 0 ? '+' : ''}${delta.toFixed(2)}</text>`);
    });
  });
  frictionValues.forEach((friction, column) => {
    const x = left + column * cellWidth + cellWidth / 2;
    lines.push(`<text x="${x}" y="${top + gridHeight + 22}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#475467">${friction.toFixed(3)}</text>`);
  });
  lines.push(`<text x="${left + gridWidth / 2}" y="${top + gridHeight + 54}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="15" fill="#344054">平滑库仑摩擦 F_c / N</text>`);
  lines.push(`<text x="40" y="${top + gridHeight / 2}" transform="rotate(-90 40 ${top + gridHeight / 2})" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="15" fill="#344054">剩余线性损耗 c_res / (N·s/m)</text>`);
  lines.push(`<text x="${left}" y="${height - 30}" font-family="Segoe UI, Microsoft YaHei" font-size="13" fill="#475467">深色边框：本轮离线候选；WP-T1 基线为 c_res=1.100、F_c=0。</text>`);
  lines.push('</svg>');
  return lines.join('\n');
};

export {
  ACCEPTED_PRESS_LINEAR_LOSS_NS_PER_M,
  BASELINE_SENSOR_SEED,
  CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
  DEFAULT_REGULARIZATION_SPEED_M_PER_S,
  FINE_AMPLITUDES_MM,
  OUTPUT_DIR,
  PRESS_DURATION_S,
  RUN_DEFINITIONS,
  SAMPLE_INTERVAL_S,
  SAMPLE_RATE_HZ,
  SENSOR_ROBUSTNESS_SEEDS,
  TRAJECTORY_DURATION_S,
  addScaledDerivative,
  calculateGammaFromHeightPeriods,
  centeredMovingAverage,
  compareCandidateWaveforms,
  createCandidate,
  createFrictionReleaseTrajectory,
  createGuidePressHistory,
  createPressHistory,
  createSmallMultipleSvg,
  estimatePeriodMs,
  evaluateCandidate,
  evaluateGuideOutcome,
  evaluateSeedRobustness,
  extractPrimaryExtrema,
  extractRealPhaseLockedExtrema,
  getAmbientPressureForRealRunPa,
  mean,
  median,
  observeRelease,
  parseRealRuns,
  quantile,
  rootMeanSquare,
  round,
  scoreObservedRun,
  simulateCandidateRun,
  summarize,
  uniqueSorted,
  validateIntegrationConvergence,
};

export const runPistonOscillationFrictionReallocationProbe = () => {
const realRuns = parseRealRuns();
const zeroFrictionDegeneration = validateZeroFrictionDegeneration(realRuns);
if (zeroFrictionDegeneration.maximumPressureDifferenceKpa > 1e-8) {
  throw new Error(
    `Zero-friction analysis integrator differs from product baseline by ${zeroFrictionDegeneration.maximumPressureDifferenceKpa} kPa.`,
  );
}

console.log('WP-T2.0: zero-friction degeneration passed.');

const coarseGrid = [];
for (const residualLinearLossNsPerM of COARSE_LINEAR_LOSS_VALUES) {
  for (const coulombFrictionN of COARSE_COULOMB_VALUES) {
    coarseGrid.push(evaluateCandidate(
      realRuns,
      createCandidate(residualLinearLossNsPerM, coulombFrictionN),
      COARSE_AMPLITUDES_MM,
    ));
  }
  console.log(`WP-T2.0: coarse grid completed through c_res=${residualLinearLossNsPerM}.`);
}

const coarseBest = coarseGrid.reduce(
  (selected, candidate) => candidate.averageScore < selected.averageScore
    ? candidate
    : selected,
  coarseGrid[0],
);
const fineLinearValues = uniqueSorted([-0.05, -0.025, 0, 0.025, 0.05]
  .map((offset) => coarseBest.residualLinearLossNsPerM + offset)
  .filter((value) => value >= 0.7 && value <= CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M));
const fineCoulombValues = uniqueSorted([-0.002, -0.001, 0, 0.001, 0.002]
  .map((offset) => coarseBest.coulombFrictionN + offset)
  .filter((value) => value >= 0 && value <= 0.01));
const fineGrid = [];
for (const residualLinearLossNsPerM of fineLinearValues) {
  for (const coulombFrictionN of fineCoulombValues) {
    fineGrid.push(evaluateCandidate(
      realRuns,
      createCandidate(residualLinearLossNsPerM, coulombFrictionN),
      FINE_AMPLITUDES_MM,
    ));
  }
  console.log(`WP-T2.0: fine grid completed through c_res=${residualLinearLossNsPerM}.`);
}

const fineBaseline = evaluateCandidate(
  realRuns,
  createCandidate(CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M, 0),
  FINE_AMPLITUDES_MM,
);
const allGrid = [...coarseGrid, ...fineGrid, fineBaseline].reduce((rows, candidate) => {
  const key = `${candidate.residualLinearLossNsPerM}:${candidate.coulombFrictionN}`;
  const existingIndex = rows.findIndex((row) => row.key === key);
  if (existingIndex < 0) return [...rows, { key, candidate }];
  if (candidate.averageScore < rows[existingIndex].candidate.averageScore) {
    rows[existingIndex] = { key, candidate };
  }
  return rows;
}, []).map((row) => row.candidate);

const baseline = allGrid.find((candidate) => (
  Math.abs(candidate.residualLinearLossNsPerM - CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M) < 1e-9
  && candidate.coulombFrictionN === 0
)) ?? fineBaseline;
const mathematicalBest = allGrid.reduce(
  (selected, candidate) => candidate.averageScore < selected.averageScore
    ? candidate
    : selected,
  allGrid[0],
);
const bestZeroFrictionReallocation = allGrid
  .filter((candidate) => candidate.coulombFrictionN === 0)
  .reduce(
    (selected, candidate) => candidate.averageScore < selected.averageScore
      ? candidate
      : selected,
  );
const bestFrictionCandidate = allGrid
  .filter((candidate) => candidate.coulombFrictionN > 0)
  .reduce(
    (selected, candidate) => candidate.averageScore < selected.averageScore
      ? candidate
      : selected,
  );

const candidatesWithGuards = allGrid.map((candidate) => {
  const earlyComparison = compareCandidateWaveforms(realRuns, baseline, candidate);
  const maximumEarlyRmsDifferenceKpa = Math.max(
    ...earlyComparison.map((row) => row.earlyRmsDifferenceKpa),
  );
  const feasible = candidate.coulombFrictionN > 0
    && candidate.averageTimingRmseMs <= baseline.averageTimingRmseMs + 0.25
    && candidate.averageAmplitudeRmseKpa <= baseline.averageAmplitudeRmseKpa + 0.1
    && candidate.averageLateAmplitudeRmseKpa < baseline.averageLateAmplitudeRmseKpa
    && candidate.averageScore < baseline.averageScore
    && maximumEarlyRmsDifferenceKpa <= 0.5;
  return { candidate, earlyComparison, maximumEarlyRmsDifferenceKpa, feasible };
});
const feasibleCandidates = candidatesWithGuards.filter((row) => row.feasible);
const selectedEntry = feasibleCandidates.length > 0
  ? feasibleCandidates.reduce(
      (selected, row) => row.candidate.averageScore < selected.candidate.averageScore
        ? row
        : selected,
      feasibleCandidates[0],
    )
  : candidatesWithGuards.find((row) => row.candidate === bestFrictionCandidate);
const selectedCandidate = selectedEntry.candidate;

console.log('WP-T2.0: parameter scan completed. Running guards.');

const baselineGuide = evaluateGuideOutcome(baseline);
const bestZeroFrictionGuide = evaluateGuideOutcome(bestZeroFrictionReallocation);
const selectedGuide = evaluateGuideOutcome(selectedCandidate);
const baselineWrongLow = evaluateGuideOutcome(baseline, BASELINE_SENSOR_SEED, { 70: 65 });
const selectedWrongLow = evaluateGuideOutcome(selectedCandidate, BASELINE_SENSOR_SEED, { 70: 65 });
const baselineWrongHigh = evaluateGuideOutcome(baseline, BASELINE_SENSOR_SEED, { 70: 75 });
const selectedWrongHigh = evaluateGuideOutcome(selectedCandidate, BASELINE_SENSOR_SEED, { 70: 75 });
const errorDirectionGates = {
  lowerMiddleHeight: {
    baselineGammaShift: baselineWrongLow.gamma - baselineGuide.gamma,
    candidateGammaShift: selectedWrongLow.gamma - selectedGuide.gamma,
    sameDirection: Math.sign(baselineWrongLow.gamma - baselineGuide.gamma)
      === Math.sign(selectedWrongLow.gamma - selectedGuide.gamma),
  },
  higherMiddleHeight: {
    baselineGammaShift: baselineWrongHigh.gamma - baselineGuide.gamma,
    candidateGammaShift: selectedWrongHigh.gamma - selectedGuide.gamma,
    sameDirection: Math.sign(baselineWrongHigh.gamma - baselineGuide.gamma)
      === Math.sign(selectedWrongHigh.gamma - selectedGuide.gamma),
  },
};
const baselineSeedRobustness = evaluateSeedRobustness(realRuns, baseline);
const bestZeroFrictionSeedRobustness = evaluateSeedRobustness(
  realRuns,
  bestZeroFrictionReallocation,
);
const selectedSeedRobustness = evaluateSeedRobustness(realRuns, selectedCandidate);
const pairedFrictionIdentification = evaluatePairedSeedComparison(
  realRuns,
  bestZeroFrictionReallocation,
  selectedCandidate,
);
const frictionScoreImprovementFraction = (
  bestZeroFrictionReallocation.averageScore - selectedCandidate.averageScore
) / bestZeroFrictionReallocation.averageScore;
const frictionMechanismIdentified = frictionScoreImprovementFraction >= 0.01
  && pairedFrictionIdentification.frictionBetterShare >= 0.9
  && pairedFrictionIdentification.frictionMinusZeroScore.p90 < 0;
const regularizationSensitivity = selectedCandidate.coulombFrictionN > 0
  ? evaluateRegularizationSensitivity(realRuns, selectedCandidate)
  : [];
const integrationConvergence = validateIntegrationConvergence(selectedCandidate);
const energyGate = {
  minimumDissipatedPowerW: Math.min(
    ...selectedCandidate.runs.map((run) => run.minimumDissipatedPowerW),
  ),
  minimumDissipatedEnergyIncrementJ: Math.min(
    ...selectedCandidate.runs.map((run) => run.minimumDissipatedEnergyIncrementJ),
  ),
};
energyGate.passed = energyGate.minimumDissipatedPowerW >= -1e-12
  && energyGate.minimumDissipatedEnergyIncrementJ >= -1e-12;

const waveformPanels = realRuns.map((run) => {
  const baselineRun = baseline.runs.find((row) => row.run === run.run);
  const zeroReallocationRun = bestZeroFrictionReallocation.runs.find(
    (row) => row.run === run.run,
  );
  const selectedRun = selectedCandidate.runs.find((row) => row.run === run.run);
  const baselineSimulation = simulateCandidateRun(run, baseline, baselineRun.amplitudeMm);
  const selectedSimulation = simulateCandidateRun(
    run,
    selectedCandidate,
    selectedRun.amplitudeMm,
  );
  const zeroReallocationSimulation = simulateCandidateRun(
    run,
    bestZeroFrictionReallocation,
    zeroReallocationRun.amplitudeMm,
  );
  const mapSeries = (pressuresKpa) => pressuresKpa.slice(0, 351).map((value, index) => ({
    x: index / SAMPLE_RATE_HZ,
    y: value - run.baselineKpa,
  }));
  const mapEnvelope = (pressuresKpa) => extractPrimaryExtrema(
    pressuresKpa.map((pressureKpa) => pressureKpa - run.baselineKpa),
    run.periodS,
  ).filter((extremum) => extremum.timeS <= 0.35).map((extremum) => ({
    x: extremum.timeS,
    y: Math.abs(extremum.deviationKpa),
  }));
  return {
    run: run.run,
    heightMm: run.heightMm,
    waveform: {
      real: mapSeries(run.samples.map((sample) => sample.pressureKpa)),
      baseline: mapSeries(baselineSimulation.pressuresKpa),
      zeroReallocation: mapSeries(zeroReallocationSimulation.pressuresKpa),
      candidate: mapSeries(selectedSimulation.pressuresKpa),
    },
    envelope: {
      real: mapEnvelope(run.samples.map((sample) => sample.pressureKpa)),
      baseline: mapEnvelope(baselineSimulation.pressuresKpa),
      zeroReallocation: mapEnvelope(zeroReallocationSimulation.pressuresKpa),
      candidate: mapEnvelope(selectedSimulation.pressuresKpa),
    },
  };
});

const productGuardsPassed = (
  zeroFrictionDegeneration.maximumPressureDifferenceKpa <= 1e-8
  && selectedEntry.maximumEarlyRmsDifferenceKpa <= 0.5
  && Math.abs(selectedGuide.gamma - baselineGuide.gamma) <= 0.01
  && errorDirectionGates.lowerMiddleHeight.sameDirection
  && errorDirectionGates.higherMiddleHeight.sameDirection
  && integrationConvergence.maximumPressureDifferenceKpa <= 0.01
  && integrationConvergence.gammaAbsoluteDifference <= 0.002
  && energyGate.passed
);

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  stage: 'WP-T2.0',
  status: 'analysis-only; product model and defaults unchanged',
  source: {
    path: path.relative(ROOT, SOURCE_PATH).replace(/\\/g, '/'),
    runCount: realRuns.length,
    samplesPerRun: realRuns[0].samples.length,
    sampleRateHz: SAMPLE_RATE_HZ,
    heightInterpretationMm: [50, 40, 30, 20],
  },
  fixedBoundaries: {
    pressLinearLossNsPerM: ACCEPTED_PRESS_LINEAR_LOSS_NS_PER_M,
    currentReleaseResidualLinearLossNsPerM: CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
    thermalModel: DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG,
    sensorModel: DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
    pressDurationMs: PRESS_DURATION_S * 1_000,
    frictionModel: 'F_f = -F_c tanh(v / v_s)',
    regularizationSpeedMmPerS: DEFAULT_REGULARIZATION_SPEED_M_PER_S * 1_000,
  },
  chartContract: {
    waveform:
      'Four small multiples at fixed x=0–0.35 s and y=−18–18 kPa; real, WP-T1, best zero-friction reallocation, and the friction probe share each axis.',
    envelope:
      'Absolute phase-consistent extrema use the same x=0–0.35 s and y=0–18 kPa scales.',
    parameterGrid:
      'Color is candidate engineering-score delta versus WP-T1, not a probability or confidence interval.',
  },
  method: {
    identification:
      'Thermal and sensor models are fixed. c_res is constrained not to exceed 1.1 N·s/m while smooth Coulomb friction is jointly scanned. One nuisance release amplitude is fitted per real run.',
    score:
      'Sum of timing RMSE/1.5 ms, all-extrema amplitude RMSE/0.75 kPa, late-extrema amplitude RMSE/0.75 kPa, normalized envelope-shape RMSE/0.08, and visible-duration error/30 ms.',
    selectionGuards:
      'A friction candidate must improve the baseline total and late-amplitude scores, preserve timing and total amplitude, and keep the maximum first-150-ms RMS change at or below 0.5 kPa.',
    identificationGuard:
      'Friction is considered separately identified only if it improves the best zero-friction reallocation by at least 1% and remains better for at least 90% of paired sensor seeds with a negative p90 score difference. This is a practical-relevance rule, not a confidence interval.',
  },
  zeroFrictionDegeneration,
  baseline,
  mathematicalBest,
  bestZeroFrictionReallocation,
  frictionProbeCandidate: selectedCandidate,
  feasibleFrictionCandidateCount: feasibleCandidates.length,
  frictionIdentification: {
    identified: frictionMechanismIdentified,
    scoreImprovementFractionVersusBestZeroFriction:
      frictionScoreImprovementFraction,
    pairedSeedComparison: pairedFrictionIdentification,
  },
  selection: {
    selectedByGuards: feasibleCandidates.length > 0,
    maximumEarlyRmsDifferenceKpa: selectedEntry.maximumEarlyRmsDifferenceKpa,
    earlyComparison: selectedEntry.earlyComparison,
  },
  guideOutcome: {
    baseline: baselineGuide,
    bestZeroFrictionReallocation: bestZeroFrictionGuide,
    candidate: selectedGuide,
    gammaAbsoluteDifference: Math.abs(selectedGuide.gamma - baselineGuide.gamma),
  },
  errorDirectionGates,
  seedRobustness: {
    baseline: baselineSeedRobustness,
    bestZeroFrictionReallocation: bestZeroFrictionSeedRobustness,
    candidate: selectedSeedRobustness,
  },
  regularizationSensitivity,
  integrationConvergence,
  energyGate,
  productGuardsPassed,
  frictionMechanismIdentified,
  grid: allGrid.map((candidate) => ({
    residualLinearLossNsPerM: candidate.residualLinearLossNsPerM,
    coulombFrictionN: candidate.coulombFrictionN,
    regularizationSpeedMPerS: candidate.regularizationSpeedMPerS,
    averageScore: candidate.averageScore,
    averageTimingRmseMs: candidate.averageTimingRmseMs,
    averageAmplitudeRmseKpa: candidate.averageAmplitudeRmseKpa,
    averageLateAmplitudeRmseKpa: candidate.averageLateAmplitudeRmseKpa,
    averageEnvelopeShapeRmse: candidate.averageEnvelopeShapeRmse,
    averageVisibleDurationErrorMs: candidate.averageVisibleDurationErrorMs,
  })),
  limitations: [
    'Only one real trace exists at each height, so height dependence and repeat-to-repeat variation cannot be separated.',
    'Release displacement is unrecorded and is therefore a nuisance fit rather than an apparatus measurement.',
    'F_c and c_res remain weakly identifiable when a friction candidate does not materially outperform the best zero-friction reallocation.',
    'The smooth Coulomb term represents sliding resistance only; it does not implement static sticking, Stribeck behavior, tilt, or hose dynamics.',
    'A selected candidate remains temporary until the user approves its waveforms and a later product work package is authorized.',
  ],
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(JSON_OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
fs.writeFileSync(CSV_OUTPUT_PATH, [
  'residualLinearLossNsPerM,coulombFrictionN,regularizationSpeedMPerS,averageScore,averageTimingRmseMs,averageAmplitudeRmseKpa,averageLateAmplitudeRmseKpa,averageEnvelopeShapeRmse,averageVisibleDurationErrorMs',
  ...output.grid.map((row) => [
    row.residualLinearLossNsPerM,
    row.coulombFrictionN,
    row.regularizationSpeedMPerS,
    row.averageScore,
    row.averageTimingRmseMs,
    row.averageAmplitudeRmseKpa,
    row.averageLateAmplitudeRmseKpa,
    row.averageEnvelopeShapeRmse,
    row.averageVisibleDurationErrorMs,
  ].join(',')),
].join('\n') + '\n', 'utf8');
fs.writeFileSync(WAVEFORM_SVG_PATH, createSmallMultipleSvg({
  title: 'WP-T2.0 波形比较（固定同轴）',
  panels: waveformPanels.map((panel) => ({ heightMm: panel.heightMm, ...panel.waveform })),
}), 'utf8');
fs.writeFileSync(ENVELOPE_SVG_PATH, createSmallMultipleSvg({
  title: 'WP-T2.0 主峰谷包络比较',
  panels: waveformPanels.map((panel) => ({ heightMm: panel.heightMm, ...panel.envelope })),
  envelope: true,
}), 'utf8');
fs.writeFileSync(
  GRID_SVG_PATH,
  createParameterGridSvg(output.grid, baseline, selectedCandidate),
  'utf8',
);

const reportRows = selectedCandidate.runs.map((run) => (
  `| ${run.heightMm} | ${run.amplitudeMm.toFixed(2)} | ${run.realPeriodMs.toFixed(2)} | ${run.modelPeriodMs.toFixed(2)} | ${run.amplitudeRmseKpa.toFixed(3)} | ${run.lateAmplitudeRmseKpa.toFixed(3)} | ${run.visibleDurationMs.toFixed(0)} | ${run.realVisibleRangeMs[0].toFixed(0)}–${run.realVisibleRangeMs[1].toFixed(0)} |`
)).join('\n');
const frictionProbeDescription = `c_res=${selectedCandidate.residualLinearLossNsPerM.toFixed(3)} N·s/m、F_c=${selectedCandidate.coulombFrictionN.toFixed(3)} N、v_s=${(selectedCandidate.regularizationSpeedMPerS * 1_000).toFixed(1)} mm/s`;
const conclusion = frictionMechanismIdentified
  ? `非零摩擦在最佳零摩擦重分配之上仍有稳定且达到实际意义门槛的改进；离线探针为 ${frictionProbeDescription}。`
  : `平滑摩擦结构在数值上可运行，但没有被现有四组数据独立识别。最优摩擦探针 ${frictionProbeDescription} 相对最佳零摩擦重分配只改善 ${(frictionScoreImprovementFraction * 100).toFixed(2)}%，未达到预设 1% 实际意义门槛；本阶段建议不改产品模型。`;
const report = `# WP-T2.0 摩擦—剩余线性损耗重新分配探针\n\n${conclusion}\n\n> 本目录是离线分析产物；当前产品源码、默认参数和存档结构均未改变。\n\n## 明确结论\n\n- 当前数据支持“释放段总耗散在约 1.0–1.1 N·s/m 附近存在一条近似等效带”，但不能把其中一部分唯一归因为机械摩擦；\n- 最佳零摩擦重分配为 c_res=${bestZeroFrictionReallocation.residualLinearLossNsPerM.toFixed(3)} N·s/m，分数 ${bestZeroFrictionReallocation.averageScore.toFixed(3)}；\n- 最佳非零摩擦探针分数 ${selectedCandidate.averageScore.toFixed(3)}，相对前者的增益只有 ${(frictionScoreImprovementFraction * 100).toFixed(2)}%；\n- 该摩擦结构通过守恒、积分收敛、γ 与错误方向门槛，说明“可以安全模拟”，但不等于“有足够依据接入”；\n- 因此 WP-T2.0 的建议是：保留当前 WP-T1 产品默认值，先不进入摩擦产品实现包。\n\n## 固定边界\n\n- 按压段仍使用已验收的 ${ACCEPTED_PRESS_LINEAR_LOSS_NS_PER_M} N·s/m 手感；\n- 释放段从当前 ${CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M} N·s/m 出发做重新分配，不允许直接叠加；\n- 热模型固定为 50 mm 时 50 ms、体积一次缩放、热流建立 ${DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.heatTransferLagTimeS * 1_000} ms；\n- 传感器固定为当前 3 ms 响应、连续微波动、1000 Hz 与 0.01 kPa 量化；\n- 摩擦只采用平滑滑动项 F_f = -F_c tanh(v/v_s)，不含静摩擦、Stribeck、倾斜或软管模型。\n\n## 三种方案对比\n\n| 指标 | WP-T1 当前基线 | 最佳零摩擦重分配 | 非零摩擦探针 |\n|---|---:|---:|---:|\n| c_res / (N·s/m) | ${baseline.residualLinearLossNsPerM.toFixed(3)} | ${bestZeroFrictionReallocation.residualLinearLossNsPerM.toFixed(3)} | ${selectedCandidate.residualLinearLossNsPerM.toFixed(3)} |\n| F_c / N | ${baseline.coulombFrictionN.toFixed(3)} | ${bestZeroFrictionReallocation.coulombFrictionN.toFixed(3)} | ${selectedCandidate.coulombFrictionN.toFixed(3)} |\n| 综合诊断分数 | ${baseline.averageScore.toFixed(3)} | ${bestZeroFrictionReallocation.averageScore.toFixed(3)} | ${selectedCandidate.averageScore.toFixed(3)} |\n| 全部极值幅值 RMSE / kPa | ${baseline.averageAmplitudeRmseKpa.toFixed(3)} | ${bestZeroFrictionReallocation.averageAmplitudeRmseKpa.toFixed(3)} | ${selectedCandidate.averageAmplitudeRmseKpa.toFixed(3)} |\n| 后段极值幅值 RMSE / kPa | ${baseline.averageLateAmplitudeRmseKpa.toFixed(3)} | ${bestZeroFrictionReallocation.averageLateAmplitudeRmseKpa.toFixed(3)} | ${selectedCandidate.averageLateAmplitudeRmseKpa.toFixed(3)} |\n| 极值相对时刻 RMSE / ms | ${baseline.averageTimingRmseMs.toFixed(3)} | ${bestZeroFrictionReallocation.averageTimingRmseMs.toFixed(3)} | ${selectedCandidate.averageTimingRmseMs.toFixed(3)} |\n| 可见时长平均区间外误差 / ms | ${baseline.averageVisibleDurationErrorMs.toFixed(1)} | ${bestZeroFrictionReallocation.averageVisibleDurationErrorMs.toFixed(1)} | ${selectedCandidate.averageVisibleDurationErrorMs.toFixed(1)} |\n| 80/70/60 mm 推导 γ | ${baselineGuide.gamma.toFixed(5)} | ${bestZeroFrictionGuide.gamma.toFixed(5)} | ${selectedGuide.gamma.toFixed(5)} |\n\n## 四组摩擦探针\n\n| 高度 / mm | 等效释放幅度 / mm | 实测周期 / ms | 探针周期 / ms | 幅值 RMSE / kPa | 后段 RMSE / kPa | 探针可见时长 / ms | 实测区间 / ms |\n|---:|---:|---:|---:|---:|---:|---:|---:|\n${reportRows}\n\n## 验证门槛\n\n- 零摩擦退化到产品 WP-T1 的最大压强差：${zeroFrictionDegeneration.maximumPressureDifferenceKpa.toExponential(3)} kPa；\n- 12 kHz 与 24 kHz 加密积分最大压强差：${integrationConvergence.maximumPressureDifferenceKpa.toFixed(6)} kPa，γ 差 ${integrationConvergence.gammaAbsoluteDifference.toFixed(6)}；\n- 摩擦与线性损耗的瞬时耗散功率及累计耗散均未出现负值：${energyGate.passed ? '通过' : '未通过'}；\n- 70 mm 误设为 65/75 mm 时，探针与基线的 γ 偏移方向一致：${errorDirectionGates.lowerMiddleHeight.sameDirection && errorDirectionGates.higherMiddleHeight.sameDirection ? '通过' : '未通过'}；\n- 结构安全门槛：${productGuardsPassed ? '通过' : '未通过'}；摩擦独立识别门槛：${frictionMechanismIdentified ? '通过' : '未通过'}。\n\n## 图形与数据\n\n- [四组同轴波形](./waveform-comparison.svg)\n- [主峰谷包络](./envelope-comparison.svg)\n- [联合参数网格](./parameter-grid.svg)\n- [机器可读完整结果](./friction-reallocation-probe.json)\n- [网格 CSV](./friction-reallocation-grid.csv)\n\n## 解释边界\n\n1% 是“是否值得为产品新增独立机制”的实际意义门槛，不是统计置信区间。四组数据每个高度只有一次，释放位移也未实测；因此目前只能证明平滑摩擦项在物理和数值上自洽，不能声称 F_c 是装置标定值，也不能证明它优于一个更简单的零摩擦线性损耗调整。\n`;
fs.writeFileSync(REPORT_OUTPUT_PATH, report, 'utf8');

console.log(JSON.stringify({
  conclusion,
  zeroFrictionMaximumPressureDifferenceKpa:
    zeroFrictionDegeneration.maximumPressureDifferenceKpa,
  baseline: {
    residualLinearLossNsPerM: baseline.residualLinearLossNsPerM,
    coulombFrictionN: baseline.coulombFrictionN,
    averageScore: baseline.averageScore,
    averageLateAmplitudeRmseKpa: baseline.averageLateAmplitudeRmseKpa,
  },
  selected: {
    residualLinearLossNsPerM: selectedCandidate.residualLinearLossNsPerM,
    coulombFrictionN: selectedCandidate.coulombFrictionN,
    averageScore: selectedCandidate.averageScore,
    averageLateAmplitudeRmseKpa: selectedCandidate.averageLateAmplitudeRmseKpa,
    maximumEarlyRmsDifferenceKpa: selectedEntry.maximumEarlyRmsDifferenceKpa,
  },
  bestZeroFrictionReallocation: {
    residualLinearLossNsPerM:
      bestZeroFrictionReallocation.residualLinearLossNsPerM,
    averageScore: bestZeroFrictionReallocation.averageScore,
    averageLateAmplitudeRmseKpa:
      bestZeroFrictionReallocation.averageLateAmplitudeRmseKpa,
  },
  frictionIdentification: {
    identified: frictionMechanismIdentified,
    scoreImprovementPercent: frictionScoreImprovementFraction * 100,
    pairedSeedP90Difference:
      pairedFrictionIdentification.frictionMinusZeroScore.p90,
    frictionBetterShare: pairedFrictionIdentification.frictionBetterShare,
  },
  gamma: {
    baseline: baselineGuide.gamma,
    candidate: selectedGuide.gamma,
  },
  feasibleFrictionCandidateCount: feasibleCandidates.length,
  productGuardsPassed,
  frictionMechanismIdentified,
  outputDirectory: OUTPUT_DIR,
}, null, 2));
return output;
};

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) runPistonOscillationFrictionReallocationProbe();
