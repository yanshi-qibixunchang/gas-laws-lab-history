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
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG,
  getPistonOscillationThermalRelaxationTimeS,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  BASELINE_SENSOR_SEED,
  FINE_AMPLITUDES_MM,
  SAMPLE_INTERVAL_S,
  SAMPLE_RATE_HZ,
  SENSOR_ROBUSTNESS_SEEDS,
  TRAJECTORY_DURATION_S,
  calculateGammaFromHeightPeriods,
  centeredMovingAverage,
  createCandidate,
  createFrictionReleaseTrajectory,
  createGuidePressHistory,
  createPressHistory,
  estimatePeriodMs,
  extractPrimaryExtrema,
  extractRealPhaseLockedExtrema,
  mean,
  median,
  observeRelease,
  parseRealRuns,
  rootMeanSquare,
  scoreObservedRun,
  summarize,
} from './pistonOscillationFrictionReallocationProbe.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, '.codex-tmp', 'piston-oscillation-wp-t2-1');
const JSON_OUTPUT_PATH = path.join(OUTPUT_DIR, 'stick-slip-probe.json');
const CSV_OUTPUT_PATH = path.join(OUTPUT_DIR, 'stick-slip-grid.csv');
const REPORT_OUTPUT_PATH = path.join(OUTPUT_DIR, 'README.md');
const WAVEFORM_SVG_PATH = path.join(OUTPUT_DIR, 'waveform-comparison.svg');
const TAIL_SVG_PATH = path.join(OUTPUT_DIR, 'tail-slope-comparison.svg');
const STICK_STATE_SVG_PATH = path.join(OUTPUT_DIR, 'stick-state-detail.svg');
const PARAMETER_SVG_PATH = path.join(OUTPUT_DIR, 'parameter-scan.svg');

const CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M = 1.1;
const ZERO_FRICTION_REALLOCATION_NS_PER_M = 1.05;
const PRESSURE_EQUIVALENT_AREA_M2 = getPistonCylinderAreaM2(
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
);
const PISTON_WEIGHT_N = PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG
  * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2;
const DEFAULT_KINETIC_REGULARIZATION_SPEED_M_PER_S = 0.001;
const DEFAULT_CONTACT_CORRELATION_LENGTH_MM = 1.2;
const CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N = 0.02;
const UNIFORM_STATIC_FRICTION_VALUES_N = [
  0.005,
  0.01,
  0.02,
  0.04,
  0.08,
  0.12,
  0.16,
  0.24,
  0.32,
];
const KINETIC_TO_STATIC_RATIOS = [0.6, 0.8];
const RESIDUAL_LINEAR_LOSS_VALUES = [1, 1.05];
const COARSE_AMPLITUDES_MM = Array.from({ length: 20 }, (_, index) => 2.5 + index * 0.5);
const CONTACT_VARIATION_FRACTIONS = [0, 0.1, 0.2, 0.3];
const CONTACT_CORRELATION_LENGTHS_MM = [0.6, 1.2, 2.4];
const CONTACT_SEED_BASE = 0x2f6e2b1d;
const MORPHOLOGY_WINDOW_START_S = 0.07;
const MORPHOLOGY_WINDOW_END_S = 0.24;

const round = (value, digits = 6) => Number(value.toFixed(digits));

const hashUnitInterval = (seed, salt) => {
  let value = (Math.imul(seed | 0, 0x45d9f3b) ^ Math.imul(salt | 0, 0x27d4eb2d)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
};

const getContactScale = (pistonHeightMm, candidate) => {
  if (candidate.contactVariationFraction <= 0) return 1;
  const phase1 = hashUnitInterval(candidate.contactSeed, 0x31c5) * 2 * Math.PI;
  const phase2 = hashUnitInterval(candidate.contactSeed, 0x7a4f) * 2 * Math.PI;
  const phase3 = hashUnitInterval(candidate.contactSeed, 0xb259) * 2 * Math.PI;
  const coordinate = 2 * Math.PI * pistonHeightMm
    / candidate.contactCorrelationLengthMm;
  const field = 0.55 * Math.sin(coordinate + phase1)
    + 0.3 * Math.sin(coordinate * 0.47 + phase2)
    + 0.15 * Math.sin(coordinate * 1.83 + phase3);
  return Math.max(
    1 - candidate.contactVariationFraction,
    Math.min(1 + candidate.contactVariationFraction, 1 + candidate.contactVariationFraction * field),
  );
};

const createStickSlipCandidate = ({
  residualLinearLossNsPerM,
  staticFrictionN,
  kineticToStaticRatio,
  contactVariationFraction = 0,
  contactCorrelationLengthMm = DEFAULT_CONTACT_CORRELATION_LENGTH_MM,
  contactSeed = CONTACT_SEED_BASE,
}) => ({
  residualLinearLossNsPerM,
  staticFrictionN,
  kineticFrictionN: staticFrictionN * kineticToStaticRatio,
  kineticToStaticRatio,
  kineticRegularizationSpeedMPerS: DEFAULT_KINETIC_REGULARIZATION_SPEED_M_PER_S,
  contactVariationFraction,
  contactCorrelationLengthMm,
  contactSeed,
});

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

const createStickSlipReleaseTrajectory = (
  press,
  candidate,
  maximumIntegrationRateHz = 24_000,
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
  const movingMassKg = physicsConfig.movingMassKg
    ?? PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG;
  const ambientPressurePa = physicsConfig.ambientPressurePa;
  const ambientTemperatureK = physicsConfig.ambientTemperatureK ?? 293.15;
  const gasHeatCapacityJPerK = equilibrium.gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    / (gamma - 1);
  const initialHeatTransferRateW = press.releaseState.thermal.enabled
    && 'heatTransferRateW' in press.releaseState.thermal
    ? press.releaseState.thermal.heatTransferRateW
    : 0;
  let state = {
    displacementM: press.releaseState.pistonHeightM - equilibrium.equilibriumHeightM,
    velocityMPerS: 0,
    temperatureK: press.releaseState.temperatureK,
    cumulativeHeatTransferJ: press.releaseState.thermal.enabled
      ? press.releaseState.thermal.cumulativeHeatTransferJ
      : 0,
    heatTransferRateW: initialHeatTransferRateW,
    dissipatedEnergyJ: 0,
  };
  let stuck = false;
  let elapsedS = 0;
  let currentStickEpisodeStartS = null;
  const stickEpisodes = [];

  const initialEffectiveGasHeightM = press.releaseState.totalVolumeM3 / cylinderAreaM2;
  const initialAngularFrequencyRadPerS = Math.sqrt(
    gamma * press.releaseState.pressurePa * cylinderAreaM2
      / (movingMassKg * initialEffectiveGasHeightM),
  );
  const periodLimitedStepS = 1 / (
    initialAngularFrequencyRadPerS / (2 * Math.PI) * 320
  );
  const maximumStepS = Math.min(
    1 / maximumIntegrationRateHz,
    thermalConfig.heatTransferLagTimeS / 10,
    periodLimitedStepS,
    movingMassKg / Math.max(1e-9, candidate.residualLinearLossNsPerM * 60),
  );
  const substepsPerSample = Math.max(1, Math.ceil(SAMPLE_INTERVAL_S / maximumStepS));
  const integrationStepS = SAMPLE_INTERVAL_S / substepsPerSample;

  const getMechanicalEnvironment = (current) => {
    const pistonHeightM = equilibrium.equilibriumHeightM + current.displacementM;
    if (!Number.isFinite(pistonHeightM) || pistonHeightM < 0) {
      throw new RangeError('Stick-slip probe passed below the 0 mm stop.');
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
    const driveWithoutDryFrictionN = pressureForceN - gravityForceN - linearLossForceN;
    const contactScale = getContactScale(pistonHeightM * 1_000, candidate);
    return {
      pistonHeightM,
      totalVolumeM3,
      pressurePa,
      driveWithoutDryFrictionN,
      contactScale,
      staticThresholdN: candidate.staticFrictionN * contactScale,
      kineticThresholdN: candidate.kineticFrictionN * contactScale,
    };
  };

  const derivative = (current, forcedStuck) => {
    const environment = getMechanicalEnvironment(current);
    const relaxationTimeS = getPistonOscillationThermalRelaxationTimeS(
      environment.totalVolumeM3,
      thermalConfig,
    );
    const targetHeatTransferRateW = gasHeatCapacityJPerK
      * (ambientTemperatureK - current.temperatureK) / relaxationTimeS;
    const effectiveVelocityMPerS = forcedStuck ? 0 : current.velocityMPerS;
    const temperatureRateFromWorkKPerS = -(gamma - 1)
      * current.temperatureK * cylinderAreaM2 * effectiveVelocityMPerS
      / environment.totalVolumeM3;
    const kineticFrictionForceN = forcedStuck ? 0 : environment.kineticThresholdN
      * Math.tanh(
        current.velocityMPerS / candidate.kineticRegularizationSpeedMPerS,
      );
    const dissipatedPowerW = forcedStuck ? 0
      : candidate.residualLinearLossNsPerM * current.velocityMPerS ** 2
        + kineticFrictionForceN * current.velocityMPerS;
    return {
      displacementRateMPerS: effectiveVelocityMPerS,
      velocityRateMPerS2: forcedStuck ? 0 : (
        environment.driveWithoutDryFrictionN - kineticFrictionForceN
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

  const integrate = (current, forcedStuck) => {
    const k1 = derivative(current, forcedStuck);
    const k2 = derivative(addScaledDerivative(current, k1, integrationStepS / 2), forcedStuck);
    const k3 = derivative(addScaledDerivative(current, k2, integrationStepS / 2), forcedStuck);
    const k4 = derivative(addScaledDerivative(current, k3, integrationStepS), forcedStuck);
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
  let stuckSubstepCount = 0;
  let minimumDissipatedPowerW = Number.POSITIVE_INFINITY;
  let minimumDissipatedEnergyIncrementJ = Number.POSITIVE_INFINITY;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const environment = getMechanicalEnvironment(state);
    const instantaneousDerivative = derivative(state, stuck);
    minimumDissipatedPowerW = Math.min(
      minimumDissipatedPowerW,
      instantaneousDerivative.dissipatedPowerW,
    );
    samples.push({
      timeS: sampleIndex / SAMPLE_RATE_HZ,
      displacementM: state.displacementM,
      velocityMPerS: state.velocityMPerS,
      pressurePa: environment.pressurePa,
      temperatureK: state.temperatureK,
      cumulativeHeatTransferJ: state.cumulativeHeatTransferJ,
      heatTransferRateW: state.heatTransferRateW,
      dissipatedEnergyJ: state.dissipatedEnergyJ,
      stuck,
      driveWithoutDryFrictionN: environment.driveWithoutDryFrictionN,
      staticThresholdN: environment.staticThresholdN,
    });
    if (sampleIndex === sampleCount - 1) break;
    const previousDissipatedEnergyJ = state.dissipatedEnergyJ;
    for (let substep = 0; substep < substepsPerSample; substep += 1) {
      const previousVelocityMPerS = state.velocityMPerS;
      if (stuck) {
        state = integrate({ ...state, velocityMPerS: 0 }, true);
        state.velocityMPerS = 0;
        stuckSubstepCount += 1;
        const environmentAfterThermalStep = getMechanicalEnvironment(state);
        if (
          Math.abs(environmentAfterThermalStep.driveWithoutDryFrictionN)
            > environmentAfterThermalStep.staticThresholdN
        ) {
          stuck = false;
          if (currentStickEpisodeStartS !== null) {
            stickEpisodes.push({
              startS: currentStickEpisodeStartS,
              endS: elapsedS + integrationStepS,
              durationMs: (elapsedS + integrationStepS - currentStickEpisodeStartS) * 1_000,
            });
            currentStickEpisodeStartS = null;
          }
        }
      } else {
        state = integrate(state, false);
        const environmentAfterStep = getMechanicalEnvironment(state);
        const crossedZero = previousVelocityMPerS !== 0
          && previousVelocityMPerS * state.velocityMPerS <= 0;
        if (
          candidate.staticFrictionN > 0
          && crossedZero
          && Math.abs(environmentAfterStep.driveWithoutDryFrictionN)
            <= environmentAfterStep.staticThresholdN
        ) {
          state.velocityMPerS = 0;
          stuck = true;
          currentStickEpisodeStartS = elapsedS + integrationStepS;
        }
      }
      elapsedS += integrationStepS;
    }
    minimumDissipatedEnergyIncrementJ = Math.min(
      minimumDissipatedEnergyIncrementJ,
      state.dissipatedEnergyJ - previousDissipatedEnergyJ,
    );
  }
  if (stuck && currentStickEpisodeStartS !== null) {
    stickEpisodes.push({
      startS: currentStickEpisodeStartS,
      endS: TRAJECTORY_DURATION_S,
      durationMs: (TRAJECTORY_DURATION_S - currentStickEpisodeStartS) * 1_000,
      openAtEnd: true,
    });
  }
  return {
    samples,
    equilibrium,
    substepsPerSample,
    integrationStepS,
    stickEpisodes,
    totalStuckDurationMs: stuckSubstepCount * integrationStepS * 1_000,
    firstStickTimeMs: stickEpisodes.length > 0 ? stickEpisodes[0].startS * 1_000 : null,
    minimumDissipatedPowerW,
    minimumDissipatedEnergyIncrementJ,
    totalDissipatedEnergyJ: samples.at(-1).dissipatedEnergyJ,
  };
};

const longestRun = (flags) => {
  let longest = 0;
  let current = 0;
  for (const flag of flags) {
    current = flag ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
};

const getTailMorphology = (pressuresKpa, baselineKpa, expectedPeriodS) => {
  const deviations = pressuresKpa.map((pressureKpa) => pressureKpa - baselineKpa);
  const smoothed = centeredMovingAverage(deviations, 3);
  const slopes = smoothed.slice(1).map((value, index) => value - smoothed[index]);
  const smoothSlopes = centeredMovingAverage(slopes, 7);
  const slopeResiduals = slopes.map((value, index) => value - smoothSlopes[index]);
  const startIndex = Math.round(MORPHOLOGY_WINDOW_START_S * SAMPLE_RATE_HZ);
  const endIndex = Math.min(
    Math.round(MORPHOLOGY_WINDOW_END_S * SAMPLE_RATE_HZ),
    slopes.length,
  );
  const eligibleIndices = Array.from(
    { length: Math.max(0, endIndex - startIndex) },
    (_, offset) => startIndex + offset,
  ).filter((index) => Math.abs(smoothed[index]) >= 0.15);
  const eligibleSlopes = eligibleIndices.map((index) => slopes[index]);
  const eligibleResiduals = eligibleIndices.map((index) => slopeResiduals[index]);
  const slopeResidualRmsKpaPerMs = eligibleResiduals.length > 0
    ? rootMeanSquare(eligibleResiduals)
    : 0;
  const slopeRmsKpaPerMs = eligibleSlopes.length > 0
    ? rootMeanSquare(eligibleSlopes)
    : 0;
  const lowSlopeFlags = Array.from(
    { length: Math.max(0, endIndex - startIndex) },
    (_, offset) => startIndex + offset,
  ).map((index) => (
    Math.abs(slopes[index]) <= 0.02 && Math.abs(smoothed[index]) >= 0.2
  ));
  const extrema = extractPrimaryExtrema(deviations, expectedPeriodS)
    .filter((extremum) => (
      extremum.timeS >= MORPHOLOGY_WINDOW_START_S
      && extremum.timeS <= MORPHOLOGY_WINDOW_END_S
      && extremum.sampleIndex >= 5
      && extremum.sampleIndex < smoothed.length - 5
    ));
  const turningRows = extrema.map((extremum) => {
    const index = extremum.sampleIndex;
    const center = smoothed[index];
    const entry2 = Math.abs(smoothed[index - 2] - center);
    const entry4 = Math.abs(smoothed[index - 4] - center);
    const exit2 = Math.abs(smoothed[index + 2] - center);
    const exit4 = Math.abs(smoothed[index + 4] - center);
    const entryShoulderRatio = entry4 > 1e-6 ? entry2 / entry4 : 0;
    const exitShoulderRatio = exit4 > 1e-6 ? exit2 / exit4 : 0;
    const flatThresholdKpa = 0.03;
    let left = index;
    let right = index;
    while (left > 0 && Math.abs(smoothed[left - 1] - center) <= flatThresholdKpa) left -= 1;
    while (
      right < smoothed.length - 1
      && Math.abs(smoothed[right + 1] - center) <= flatThresholdKpa
    ) right += 1;
    return {
      entryShoulderRatio,
      exitShoulderRatio,
      signedShoulderAsymmetry: Math.log(
        (exitShoulderRatio + 0.02) / (entryShoulderRatio + 0.02),
      ),
      absoluteShoulderAsymmetry: Math.abs(Math.log(
        (exitShoulderRatio + 0.02) / (entryShoulderRatio + 0.02),
      )),
      flatDurationMs: right - left,
    };
  });
  return {
    slopeResidualRmsKpaPerMs,
    slopeResidualRatio: slopeRmsKpaPerMs > 1e-9
      ? slopeResidualRmsKpaPerMs / slopeRmsKpaPerMs
      : 0,
    longestLowSlopeRunMs: longestRun(lowSlopeFlags),
    turningCount: turningRows.length,
    medianSignedShoulderAsymmetry: turningRows.length > 0
      ? median(turningRows.map((row) => row.signedShoulderAsymmetry))
      : 0,
    medianAbsoluteShoulderAsymmetry: turningRows.length > 0
      ? median(turningRows.map((row) => row.absoluteShoulderAsymmetry))
      : 0,
    medianFlatDurationMs: turningRows.length > 0
      ? median(turningRows.map((row) => row.flatDurationMs))
      : 0,
    maximumFlatDurationMs: turningRows.length > 0
      ? Math.max(...turningRows.map((row) => row.flatDurationMs))
      : 0,
    turningRows,
  };
};

const getMorphologyDistance = (real, model) => rootMeanSquare([
  (model.slopeResidualRatio - real.slopeResidualRatio) / 0.06,
  (
    model.medianAbsoluteShoulderAsymmetry
      - real.medianAbsoluteShoulderAsymmetry
  ) / 0.18,
  (model.medianFlatDurationMs - real.medianFlatDurationMs) / 1.5,
  (model.longestLowSlopeRunMs - real.longestLowSlopeRunMs) / 2,
]);

const simulationCache = new Map();

const simulateStickSlipRun = (run, candidate, amplitudeMm, sensorSeed = BASELINE_SENSOR_SEED) => {
  const runCandidate = {
    ...candidate,
    contactSeed: (candidate.contactSeed + Number(run.run) * 0x9e3779b1) >>> 0,
  };
  const key = [
    run.run,
    round(candidate.residualLinearLossNsPerM, 4),
    round(candidate.staticFrictionN, 4),
    round(candidate.kineticFrictionN, 4),
    round(candidate.contactVariationFraction, 3),
    round(candidate.contactCorrelationLengthMm, 3),
    runCandidate.contactSeed,
    round(amplitudeMm, 3),
    sensorSeed,
  ].join(':');
  const cached = simulationCache.get(key);
  if (cached) return cached;
  const press = createPressHistory(run, amplitudeMm);
  const trajectory = createStickSlipReleaseTrajectory(press, runCandidate);
  const pressuresKpa = observeRelease(press, trajectory, sensorSeed);
  const result = { press, trajectory, pressuresKpa, runCandidate };
  simulationCache.set(key, result);
  return result;
};

const evaluateStickSlipCandidate = (realRuns, candidate, amplitudeValuesMm) => {
  const runs = realRuns.map((run) => {
    const realExtrema = extractRealPhaseLockedExtrema(run);
    const realMorphology = getTailMorphology(
      run.samples.map((sample) => sample.pressureKpa),
      run.baselineKpa,
      run.periodS,
    );
    let best = null;
    for (const amplitudeMm of amplitudeValuesMm) {
      const simulation = simulateStickSlipRun(run, candidate, amplitudeMm);
      const waveform = scoreObservedRun(run, realExtrema, simulation.pressuresKpa);
      if (!waveform) continue;
      const morphology = getTailMorphology(
        simulation.pressuresKpa,
        run.baselineKpa,
        run.periodS,
      );
      const morphologyDistance = getMorphologyDistance(realMorphology, morphology);
      const combinedScore = waveform.score + morphologyDistance * 0.75;
      const row = {
        amplitudeMm,
        waveform,
        morphology,
        realMorphology,
        morphologyDistance,
        combinedScore,
        stickEpisodeCount: simulation.trajectory.stickEpisodes.length,
        totalStuckDurationMs: simulation.trajectory.totalStuckDurationMs,
        firstStickTimeMs: simulation.trajectory.firstStickTimeMs,
        stickEpisodes: simulation.trajectory.stickEpisodes,
        minimumDissipatedPowerW: simulation.trajectory.minimumDissipatedPowerW,
        minimumDissipatedEnergyIncrementJ:
          simulation.trajectory.minimumDissipatedEnergyIncrementJ,
      };
      if (!best || row.combinedScore < best.combinedScore) best = row;
    }
    if (!best) throw new Error(`No usable stick-slip fit for run ${run.run}.`);
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
    averageCombinedScore: mean(runs.map((run) => run.combinedScore)),
    averageWaveformScore: mean(runs.map((run) => run.waveform.score)),
    averageMorphologyDistance: mean(runs.map((run) => run.morphologyDistance)),
    averageTimingRmseMs: mean(runs.map((run) => run.waveform.timingRmseMs)),
    averageAmplitudeRmseKpa: mean(runs.map((run) => run.waveform.amplitudeRmseKpa)),
    averageLateAmplitudeRmseKpa:
      mean(runs.map((run) => run.waveform.lateAmplitudeRmseKpa)),
    totalStickEpisodeCount: runs.reduce((sum, run) => sum + run.stickEpisodeCount, 0),
    earliestStickTimeMs: Math.min(...runs.flatMap(
      (run) => run.firstStickTimeMs === null ? [] : [run.firstStickTimeMs],
    ), Number.POSITIVE_INFINITY),
    staticFrictionEquivalentPressureKpa:
      candidate.staticFrictionN / PRESSURE_EQUIVALENT_AREA_M2 / 1_000,
    staticFrictionWeightFraction: candidate.staticFrictionN / PISTON_WEIGHT_N,
    runs,
  };
};

const validateZeroThresholdDegeneration = (realRuns) => {
  const stickSlipCandidate = createStickSlipCandidate({
    residualLinearLossNsPerM: CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
    staticFrictionN: 0,
    kineticToStaticRatio: 0.8,
  });
  const smoothCandidate = createCandidate(
    CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
    0,
  );
  const rows = realRuns.map((run) => {
    const press = createPressHistory(run, 8);
    const stickSlip = createStickSlipReleaseTrajectory(press, stickSlipCandidate);
    const smooth = createFrictionReleaseTrajectory(press, smoothCandidate, 24_000);
    return {
      run: run.run,
      heightMm: run.heightMm,
      maximumPressureDifferenceKpa: Math.max(...stickSlip.samples.map(
        (sample, index) => Math.abs(sample.pressurePa - smooth.samples[index].pressurePa)
          / 1_000,
      )),
      maximumDisplacementDifferenceMm: Math.max(...stickSlip.samples.map(
        (sample, index) => Math.abs(
          sample.displacementM - smooth.samples[index].displacementM,
        ) * 1_000,
      )),
    };
  });
  return {
    rows,
    maximumPressureDifferenceKpa: Math.max(
      ...rows.map((row) => row.maximumPressureDifferenceKpa),
    ),
    maximumDisplacementDifferenceMm: Math.max(
      ...rows.map((row) => row.maximumDisplacementDifferenceMm),
    ),
  };
};

const compareWithBaselineAtFixedAmplitude = (
  realRuns,
  baseline,
  candidate,
) => {
  const rows = realRuns.map((run) => {
    const baselineFit = baseline.runs.find((row) => row.run === run.run);
    const baselineSimulation = simulateStickSlipRun(
      run,
      baseline,
      baselineFit.amplitudeMm,
    );
    const candidateSimulation = simulateStickSlipRun(
      run,
      candidate,
      baselineFit.amplitudeMm,
    );
    const rmsUntil = (endS) => {
      const sampleCount = Math.round(endS * SAMPLE_RATE_HZ) + 1;
      return rootMeanSquare(candidateSimulation.pressuresKpa
        .slice(0, sampleCount)
        .map((value, index) => value - baselineSimulation.pressuresKpa[index]));
    };
    return {
      run: run.run,
      heightMm: run.heightMm,
      amplitudeMm: baselineFit.amplitudeMm,
      first70MsRmsDifferenceKpa: rmsUntil(0.07),
      first150MsRmsDifferenceKpa: rmsUntil(0.15),
      firstStickTimeMs: candidateSimulation.trajectory.firstStickTimeMs,
      stickEpisodeCount: candidateSimulation.trajectory.stickEpisodes.length,
    };
  });
  return {
    rows,
    maximumFirst70MsRmsDifferenceKpa: Math.max(
      ...rows.map((row) => row.first70MsRmsDifferenceKpa),
    ),
    maximumFirst150MsRmsDifferenceKpa: Math.max(
      ...rows.map((row) => row.first150MsRmsDifferenceKpa),
    ),
    earliestStickTimeMs: Math.min(
      ...rows.flatMap((row) => row.firstStickTimeMs === null
        ? []
        : [row.firstStickTimeMs]),
      Number.POSITIVE_INFINITY,
    ),
  };
};

const evaluateGuideOutcome = (
  candidate,
  sensorSeed = BASELINE_SENSOR_SEED,
  actualHeightOverrides = {},
  maximumIntegrationRateHz = 24_000,
) => {
  const rows = [80, 70, 60].map((nominalHeightMm) => {
    const actualHeightMm = actualHeightOverrides[nominalHeightMm] ?? nominalHeightMm;
    const press = createGuidePressHistory(actualHeightMm, 8);
    const trajectory = createStickSlipReleaseTrajectory(
      press,
      {
        ...candidate,
        contactSeed: (candidate.contactSeed + nominalHeightMm * 0x9e3779b1) >>> 0,
      },
      maximumIntegrationRateHz,
    );
    const pressuresKpa = observeRelease(press, trajectory, sensorSeed);
    return {
      nominalHeightMm,
      actualHeightMm,
      periodMs: estimatePeriodMs(actualHeightMm, pressuresKpa),
      firstStickTimeMs: trajectory.firstStickTimeMs,
      stickEpisodeCount: trajectory.stickEpisodes.length,
    };
  });
  return { rows, ...calculateGammaFromHeightPeriods(rows) };
};

const validateIntegrationConvergence = (candidate) => {
  const waveformRows = [80, 70, 60].map((heightMm) => {
    const press = createGuidePressHistory(heightMm, 8);
    const coarse = createStickSlipReleaseTrajectory(press, candidate, 24_000);
    const fine = createStickSlipReleaseTrajectory(press, candidate, 48_000);
    return {
      heightMm,
      maximumPressureDifferenceKpa: Math.max(...coarse.samples.map(
        (sample, index) => Math.abs(sample.pressurePa - fine.samples[index].pressurePa)
          / 1_000,
      )),
      maximumDisplacementDifferenceMm: Math.max(...coarse.samples.map(
        (sample, index) => Math.abs(
          sample.displacementM - fine.samples[index].displacementM,
        ) * 1_000,
      )),
      coarseStickEpisodeCount: coarse.stickEpisodes.length,
      fineStickEpisodeCount: fine.stickEpisodes.length,
      firstStickTimeDifferenceMs: coarse.firstStickTimeMs === null
        || fine.firstStickTimeMs === null
        ? null
        : Math.abs(coarse.firstStickTimeMs - fine.firstStickTimeMs),
    };
  });
  const coarseGuide = evaluateGuideOutcome(candidate, BASELINE_SENSOR_SEED, {}, 24_000);
  const fineGuide = evaluateGuideOutcome(candidate, BASELINE_SENSOR_SEED, {}, 48_000);
  return {
    waveformRows,
    maximumPressureDifferenceKpa: Math.max(
      ...waveformRows.map((row) => row.maximumPressureDifferenceKpa),
    ),
    maximumDisplacementDifferenceMm: Math.max(
      ...waveformRows.map((row) => row.maximumDisplacementDifferenceMm),
    ),
    gammaAbsoluteDifference: Math.abs(coarseGuide.gamma - fineGuide.gamma),
  };
};

const evaluateSensorSeedRobustness = (realRuns, candidate) => {
  const rows = SENSOR_ROBUSTNESS_SEEDS.map((sensorSeed) => {
    const runRows = realRuns.map((run) => {
      const fit = candidate.runs.find((row) => row.run === run.run);
      const simulation = simulateStickSlipRun(
        run,
        candidate,
        fit.amplitudeMm,
        sensorSeed,
      );
      const morphology = getTailMorphology(
        simulation.pressuresKpa,
        run.baselineKpa,
        run.periodS,
      );
      const score = scoreObservedRun(
        run,
        extractRealPhaseLockedExtrema(run),
        simulation.pressuresKpa,
      );
      return {
        morphologyDistance: getMorphologyDistance(fit.realMorphology, morphology),
        waveformScore: score?.score ?? Number.POSITIVE_INFINITY,
      };
    });
    return {
      sensorSeed,
      averageMorphologyDistance: mean(runRows.map((row) => row.morphologyDistance)),
      averageWaveformScore: mean(runRows.map((row) => row.waveformScore)),
    };
  });
  return {
    rows,
    averageMorphologyDistance: summarize(
      rows.map((row) => row.averageMorphologyDistance),
    ),
    averageWaveformScore: summarize(rows.map((row) => row.averageWaveformScore)),
  };
};

const evaluateContactSeedRobustness = (realRuns, candidate) => {
  const seeds = Array.from(
    { length: 8 },
    (_, index) => (CONTACT_SEED_BASE + index * 0x9e3779b1) >>> 0,
  );
  const rows = seeds.map((contactSeed) => {
    const seededCandidate = { ...candidate, contactSeed };
    const runRows = realRuns.map((run) => {
      const fit = candidate.runs.find((row) => row.run === run.run);
      const simulation = simulateStickSlipRun(
        run,
        seededCandidate,
        fit.amplitudeMm,
      );
      const morphology = getTailMorphology(
        simulation.pressuresKpa,
        run.baselineKpa,
        run.periodS,
      );
      return {
        morphologyDistance: getMorphologyDistance(fit.realMorphology, morphology),
        firstStickTimeMs: simulation.trajectory.firstStickTimeMs,
      };
    });
    return {
      contactSeed,
      averageMorphologyDistance: mean(runRows.map((row) => row.morphologyDistance)),
      earliestStickTimeMs: Math.min(
        ...runRows.flatMap((row) => row.firstStickTimeMs === null
          ? []
          : [row.firstStickTimeMs]),
        Number.POSITIVE_INFINITY,
      ),
    };
  });
  return {
    rows,
    averageMorphologyDistance: summarize(
      rows.map((row) => row.averageMorphologyDistance),
    ),
    earliestStickTimeMs: summarize(rows.map((row) => row.earliestStickTimeMs)),
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

const createComparisonSvg = ({
  title,
  panels,
  xMinimum,
  xMaximum,
  yMinimum,
  yMaximum,
  legendLabels = {
    real: '四组实测',
    baseline: 'WP-T1 当前基线',
    uniform: '窗口内作用的均匀探针',
    heterogeneous: '固定接触差异探针',
  },
}) => {
  const width = 1400;
  const height = 900;
  const outerLeft = 86;
  const outerTop = 100;
  const gapX = 58;
  const gapY = 62;
  const panelWidth = (width - outerLeft - 60 - gapX) / 2;
  const panelHeight = (height - outerTop - 70 - gapY) / 2;
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#fbfcfe"/>',
    `<text x="${width / 2}" y="38" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei, sans-serif" font-size="25" font-weight="700" fill="#172033">${escapeXml(title)}</text>`,
    '<g font-family="Segoe UI, Microsoft YaHei, sans-serif" font-size="14" fill="#344054">',
    `<line x1="180" y1="68" x2="220" y2="68" stroke="#1677b8" stroke-width="3"/><text x="230" y="73">${escapeXml(legendLabels.real)}</text>`,
    `<line x1="390" y1="68" x2="430" y2="68" stroke="#667085" stroke-width="2.5" stroke-dasharray="8 5"/><text x="440" y="73">${escapeXml(legendLabels.baseline)}</text>`,
    `<line x1="690" y1="68" x2="730" y2="68" stroke="#8a6d1d" stroke-width="2.5" stroke-dasharray="3 4"/><text x="740" y="73">${escapeXml(legendLabels.uniform)}</text>`,
    `<line x1="1040" y1="68" x2="1080" y2="68" stroke="#e36a1b" stroke-width="3"/><text x="1090" y="73">${escapeXml(legendLabels.heterogeneous)}</text>`,
    '</g>',
  ];
  panels.forEach((panel, panelIndex) => {
    const column = panelIndex % 2;
    const row = Math.floor(panelIndex / 2);
    const left = outerLeft + column * (panelWidth + gapX);
    const top = outerTop + row * (panelHeight + gapY);
    const xScale = (value) => left + (value - xMinimum)
      / (xMaximum - xMinimum) * panelWidth;
    const yScale = (value) => top + panelHeight - (value - yMinimum)
      / (yMaximum - yMinimum) * panelHeight;
    const clipId = `clip-${panelIndex}`;
    lines.push(`<defs><clipPath id="${clipId}"><rect x="${left}" y="${top}" width="${panelWidth}" height="${panelHeight}"/></clipPath></defs>`);
    lines.push(`<rect x="${left}" y="${top}" width="${panelWidth}" height="${panelHeight}" fill="#fff" stroke="#b8c2d1"/>`);
    for (let tick = 0; tick <= 7; tick += 1) {
      const value = xMinimum + (xMaximum - xMinimum) * tick / 7;
      const x = xScale(value);
      lines.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + panelHeight}" stroke="#e7ebf1"/>`);
      lines.push(`<text x="${x}" y="${top + panelHeight + 20}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#667085">${value.toFixed(2)}</text>`);
    }
    for (let tick = 0; tick <= 6; tick += 1) {
      const value = yMinimum + (yMaximum - yMinimum) * tick / 6;
      const y = yScale(value);
      lines.push(`<line x1="${left}" y1="${y}" x2="${left + panelWidth}" y2="${y}" stroke="${Math.abs(value) < 1e-9 ? '#c8d0dc' : '#e7ebf1'}"/>`);
      lines.push(`<text x="${left - 10}" y="${y + 4}" text-anchor="end" font-family="Segoe UI" font-size="12" fill="#667085">${value.toFixed(0)}</text>`);
    }
    lines.push(`<text x="${left + 8}" y="${top + 23}" font-family="Segoe UI, Microsoft YaHei" font-size="17" font-weight="700" fill="#172033">${panel.heightMm} mm</text>`);
    const clip = `clip-path="url(#${clipId})" fill="none" stroke-linejoin="round" stroke-linecap="round"`;
    lines.push(svgPolyline(panel.real, xScale, yScale, `${clip} stroke="#1677b8" stroke-width="2.8"`));
    lines.push(svgPolyline(panel.baseline, xScale, yScale, `${clip} stroke="#667085" stroke-width="2.2" stroke-dasharray="8 5"`));
    lines.push(svgPolyline(panel.uniform, xScale, yScale, `${clip} stroke="#8a6d1d" stroke-width="2.2" stroke-dasharray="3 4"`));
    lines.push(svgPolyline(panel.heterogeneous, xScale, yScale, `${clip} stroke="#e36a1b" stroke-width="2.8"`));
    lines.push(`<text x="${left + panelWidth / 2}" y="${top + panelHeight + 42}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="13" fill="#475467">释放后时间 / s</text>`);
    lines.push(`<text x="${left - 52}" y="${top + panelHeight / 2}" transform="rotate(-90 ${left - 52} ${top + panelHeight / 2})" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="13" fill="#475467">相对平衡压强 / kPa</text>`);
  });
  lines.push('</svg>');
  return lines.join('\n');
};

const createStickStateSvg = ({ run, series, stickEpisodes, candidate }) => {
  const width = 1400;
  const height = 620;
  const left = 100;
  const right = 50;
  const top = 90;
  const bottom = 90;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const xMinimum = 0.06;
  const xMaximum = 0.26;
  const yMinimum = -7;
  const yMaximum = 7;
  const xScale = (value) => left + (value - xMinimum) / (xMaximum - xMinimum) * plotWidth;
  const yScale = (value) => top + plotHeight - (value - yMinimum) / (yMaximum - yMinimum) * plotHeight;
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#fbfcfe"/>',
    `<text x="${width / 2}" y="38" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="25" font-weight="700" fill="#172033">低速停滞—再滑动诊断（${run.heightMm} mm）</text>`,
    `<text x="${width / 2}" y="66" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">阴影仅表示模型判定为静止锁定的区间；F_s=${candidate.staticFrictionN.toFixed(3)} N</text>`,
    `<rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" fill="#fff" stroke="#b8c2d1"/>`,
  ];
  for (const episode of stickEpisodes) {
    const start = Math.max(xMinimum, episode.startS);
    const end = Math.min(xMaximum, episode.endS);
    if (end <= start) continue;
    lines.push(`<rect x="${xScale(start)}" y="${top}" width="${xScale(end) - xScale(start)}" height="${plotHeight}" fill="#f6c86a" fill-opacity="0.38"/>`);
  }
  for (let tick = 0; tick <= 10; tick += 1) {
    const value = xMinimum + (xMaximum - xMinimum) * tick / 10;
    const x = xScale(value);
    lines.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + plotHeight}" stroke="#e7ebf1"/>`);
    lines.push(`<text x="${x}" y="${top + plotHeight + 24}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#667085">${value.toFixed(2)}</text>`);
  }
  for (let value = yMinimum; value <= yMaximum; value += 2) {
    const y = yScale(value);
    lines.push(`<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="${value === 0 ? '#c8d0dc' : '#e7ebf1'}"/>`);
    lines.push(`<text x="${left - 12}" y="${y + 4}" text-anchor="end" font-family="Segoe UI" font-size="12" fill="#667085">${value}</text>`);
  }
  lines.push(svgPolyline(series, xScale, yScale, 'clip-path="url(#detail-clip)" fill="none" stroke="#e36a1b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"'));
  lines.splice(4, 0, `<defs><clipPath id="detail-clip"><rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}"/></clipPath></defs>`);
  lines.push(`<text x="${left + plotWidth / 2}" y="${height - 30}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">释放后时间 / s</text>`);
  lines.push(`<text x="35" y="${top + plotHeight / 2}" transform="rotate(-90 35 ${top + plotHeight / 2})" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">相对平衡压强 / kPa</text>`);
  lines.push('</svg>');
  return lines.join('\n');
};

const createParameterSvg = (rows, baselineMorphologyDistance) => {
  const width = 1400;
  const height = 690;
  const left = 95;
  const top = 95;
  const gap = 90;
  const panelWidth = (width - left - 60 - gap) / 2;
  const panelHeight = 470;
  const xMinimum = 0;
  const xMaximum = Math.max(...rows.map((row) => row.staticFrictionN));
  const morphologyMaximum = Math.max(
    baselineMorphologyDistance,
    ...rows.map((row) => row.averageMorphologyDistance),
  ) * 1.08;
  const onsetValues = rows.map((row) => row.earliestStickTimeMs)
    .filter(Number.isFinite);
  const onsetMaximum = Math.max(260, ...onsetValues) * 1.05;
  const panels = [
    {
      title: '尾段形态距离（越低越接近实测）',
      yMaximum: morphologyMaximum,
      value: (row) => row.averageMorphologyDistance,
      baseline: baselineMorphologyDistance,
      unit: '形态距离',
    },
    {
      title: '首次静止锁定时刻',
      yMaximum: onsetMaximum,
      value: (row) => Number.isFinite(row.earliestStickTimeMs)
        ? row.earliestStickTimeMs
        : onsetMaximum,
      baseline: null,
      unit: 'ms',
    },
  ];
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#fbfcfe"/>',
    '<text x="700" y="40" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="25" font-weight="700" fill="#172033">WP-T2.1 静摩擦阈值扫描</text>',
    '<text x="700" y="68" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">浅色区域为本轮保守探针带 F_s≤0.02 N；不同线型代表 c_res 与动/静摩擦比组合</text>',
  ];
  panels.forEach((panel, panelIndex) => {
    const panelLeft = left + panelIndex * (panelWidth + gap);
    const xScale = (value) => panelLeft + value / xMaximum * panelWidth;
    const yScale = (value) => top + panelHeight - value / panel.yMaximum * panelHeight;
    lines.push(`<rect x="${panelLeft}" y="${top}" width="${xScale(CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N) - panelLeft}" height="${panelHeight}" fill="#e9f5ed"/>`);
    lines.push(`<rect x="${panelLeft}" y="${top}" width="${panelWidth}" height="${panelHeight}" fill="none" stroke="#b8c2d1"/>`);
    lines.push(`<text x="${panelLeft + panelWidth / 2}" y="${top - 18}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="17" font-weight="700" fill="#172033">${panel.title}</text>`);
    if (panel.baseline !== null) {
      const y = yScale(panel.baseline);
      lines.push(`<line x1="${panelLeft}" y1="${y}" x2="${panelLeft + panelWidth}" y2="${y}" stroke="#667085" stroke-width="2" stroke-dasharray="8 5"/>`);
    }
    for (let tick = 0; tick <= 6; tick += 1) {
      const xValue = xMaximum * tick / 6;
      const x = xScale(xValue);
      lines.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + panelHeight}" stroke="#e7ebf1"/>`);
      lines.push(`<text x="${x}" y="${top + panelHeight + 23}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#667085">${xValue.toFixed(2)}</text>`);
      const yValue = panel.yMaximum * tick / 6;
      const y = yScale(yValue);
      lines.push(`<line x1="${panelLeft}" y1="${y}" x2="${panelLeft + panelWidth}" y2="${y}" stroke="#e7ebf1"/>`);
      lines.push(`<text x="${panelLeft - 10}" y="${y + 4}" text-anchor="end" font-family="Segoe UI" font-size="12" fill="#667085">${yValue.toFixed(panelIndex === 0 ? 1 : 0)}</text>`);
    }
    const grouped = new Map();
    for (const row of rows) {
      const key = `${row.residualLinearLossNsPerM}:${row.kineticToStaticRatio}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }
    let groupIndex = 0;
    for (const groupRows of grouped.values()) {
      const ordered = [...groupRows].sort((a, b) => a.staticFrictionN - b.staticFrictionN);
      const color = groupIndex % 2 === 0 ? '#8a6d1d' : '#e36a1b';
      const dash = groupIndex < 2 ? '' : 'stroke-dasharray="5 4"';
      lines.push(svgPolyline(
        ordered.map((row) => ({ x: row.staticFrictionN, y: panel.value(row) })),
        xScale,
        yScale,
        `fill="none" stroke="${color}" stroke-width="2" ${dash}`,
      ));
      for (const row of ordered) {
        lines.push(`<circle cx="${xScale(row.staticFrictionN)}" cy="${yScale(panel.value(row))}" r="4" fill="${color}"/>`);
      }
      groupIndex += 1;
    }
    lines.push(`<text x="${panelLeft + panelWidth / 2}" y="${height - 54}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">静摩擦阈值 F_s / N</text>`);
    lines.push(`<text x="${panelLeft - 58}" y="${top + panelHeight / 2}" transform="rotate(-90 ${panelLeft - 58} ${top + panelHeight / 2})" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">${panel.unit}</text>`);
  });
  lines.push('</svg>');
  return lines.join('\n');
};

const toGridRow = (candidate) => ({
  residualLinearLossNsPerM: candidate.residualLinearLossNsPerM,
  staticFrictionN: candidate.staticFrictionN,
  kineticFrictionN: candidate.kineticFrictionN,
  kineticToStaticRatio: candidate.kineticToStaticRatio,
  contactVariationFraction: candidate.contactVariationFraction,
  contactCorrelationLengthMm: candidate.contactCorrelationLengthMm,
  averageCombinedScore: candidate.averageCombinedScore,
  averageWaveformScore: candidate.averageWaveformScore,
  averageMorphologyDistance: candidate.averageMorphologyDistance,
  averageTimingRmseMs: candidate.averageTimingRmseMs,
  averageAmplitudeRmseKpa: candidate.averageAmplitudeRmseKpa,
  averageLateAmplitudeRmseKpa: candidate.averageLateAmplitudeRmseKpa,
  totalStickEpisodeCount: candidate.totalStickEpisodeCount,
  earliestStickTimeMs: candidate.earliestStickTimeMs,
  staticFrictionEquivalentPressureKpa: candidate.staticFrictionEquivalentPressureKpa,
  staticFrictionWeightFraction: candidate.staticFrictionWeightFraction,
});

const formatFinite = (value, digits = 3) => Number.isFinite(value)
  ? value.toFixed(digits)
  : '无锁定';

export {
  MORPHOLOGY_WINDOW_END_S,
  MORPHOLOGY_WINDOW_START_S,
  createComparisonSvg,
  escapeXml,
  getMorphologyDistance,
  getTailMorphology,
  hashUnitInterval,
  svgPolyline,
};

export const runPistonOscillationStickSlipProbe = () => {
  const realRuns = parseRealRuns();
  const zeroThresholdDegeneration = validateZeroThresholdDegeneration(realRuns);
  if (zeroThresholdDegeneration.maximumPressureDifferenceKpa > 1e-8) {
    throw new Error(
      `Zero-threshold stick-slip integrator differs by ${zeroThresholdDegeneration.maximumPressureDifferenceKpa} kPa.`,
    );
  }
  console.log('WP-T2.1: zero-threshold degeneration passed.');

  const baseline = evaluateStickSlipCandidate(
    realRuns,
    createStickSlipCandidate({
      residualLinearLossNsPerM: CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
      staticFrictionN: 0,
      kineticToStaticRatio: 0.8,
    }),
    FINE_AMPLITUDES_MM,
  );
  const zeroFrictionReallocation = evaluateStickSlipCandidate(
    realRuns,
    createStickSlipCandidate({
      residualLinearLossNsPerM: ZERO_FRICTION_REALLOCATION_NS_PER_M,
      staticFrictionN: 0,
      kineticToStaticRatio: 0.8,
    }),
    FINE_AMPLITUDES_MM,
  );

  const uniformGrid = [];
  for (const residualLinearLossNsPerM of RESIDUAL_LINEAR_LOSS_VALUES) {
    for (const staticFrictionN of UNIFORM_STATIC_FRICTION_VALUES_N) {
      for (const kineticToStaticRatio of KINETIC_TO_STATIC_RATIOS) {
        uniformGrid.push(evaluateStickSlipCandidate(
          realRuns,
          createStickSlipCandidate({
            residualLinearLossNsPerM,
            staticFrictionN,
            kineticToStaticRatio,
          }),
          COARSE_AMPLITUDES_MM,
        ));
      }
    }
    console.log(`WP-T2.1: uniform scan completed through c_res=${residualLinearLossNsPerM}.`);
  }

  const uniformWithGuards = uniformGrid.map((candidate) => {
    const baselineComparison = compareWithBaselineAtFixedAmplitude(
      realRuns,
      baseline,
      candidate,
    );
    return {
      candidate,
      baselineComparison,
      conservativeForce:
        candidate.staticFrictionN <= CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N,
      preservesEarlyShape:
        baselineComparison.maximumFirst70MsRmsDifferenceKpa <= 0.5,
      tailActivatedAfterEarlyWindow:
        baselineComparison.earliestStickTimeMs >= 70,
      morphologyImproved:
        candidate.averageMorphologyDistance < baseline.averageMorphologyDistance,
    };
  });
  const selectMinimum = (rows) => rows.reduce(
    (best, row) => row.candidate.averageMorphologyDistance
      < best.candidate.averageMorphologyDistance ? row : best,
    rows[0],
  );
  const conservativeRows = uniformWithGuards.filter((row) => row.conservativeForce);
  const uniformPlausibleRows = conservativeRows.filter((row) => (
    row.preservesEarlyShape && row.tailActivatedAfterEarlyWindow
  ));
  const bestConservativeUniform = selectMinimum(
    uniformPlausibleRows.length > 0 ? uniformPlausibleRows : conservativeRows,
  );
  const bestUniform = selectMinimum(uniformWithGuards);
  const activationWindowUniformRows = uniformWithGuards.filter((row) => (
    row.baselineComparison.earliestStickTimeMs >= 70
    && row.baselineComparison.earliestStickTimeMs <= 240
  ));
  const windowActivationUniform = selectMinimum(
    activationWindowUniformRows.length > 0
      ? activationWindowUniformRows
      : uniformWithGuards,
  );

  const anchorRows = [bestConservativeUniform, windowActivationUniform].filter(
    (row, index, rows) => rows.findIndex((candidate) => (
      candidate.candidate.residualLinearLossNsPerM
        === row.candidate.residualLinearLossNsPerM
      && candidate.candidate.staticFrictionN === row.candidate.staticFrictionN
      && candidate.candidate.kineticToStaticRatio === row.candidate.kineticToStaticRatio
    )) === index,
  );
  const heterogeneousGrid = [];
  for (const anchor of anchorRows) {
    for (const contactVariationFraction of CONTACT_VARIATION_FRACTIONS) {
      for (const contactCorrelationLengthMm of CONTACT_CORRELATION_LENGTHS_MM) {
        if (contactVariationFraction === 0 && contactCorrelationLengthMm
          !== DEFAULT_CONTACT_CORRELATION_LENGTH_MM) continue;
        heterogeneousGrid.push(evaluateStickSlipCandidate(
          realRuns,
          createStickSlipCandidate({
            residualLinearLossNsPerM: anchor.candidate.residualLinearLossNsPerM,
            staticFrictionN: anchor.candidate.staticFrictionN,
            kineticToStaticRatio: anchor.candidate.kineticToStaticRatio,
            contactVariationFraction,
            contactCorrelationLengthMm,
          }),
          FINE_AMPLITUDES_MM,
        ));
      }
    }
  }
  const heterogeneousWithGuards = heterogeneousGrid.map((candidate) => ({
    candidate,
    baselineComparison: compareWithBaselineAtFixedAmplitude(
      realRuns,
      baseline,
      candidate,
    ),
  }));
  const heterogeneousActivationRows = heterogeneousWithGuards.filter((row) => (
    row.baselineComparison.earliestStickTimeMs >= 70
    && row.baselineComparison.earliestStickTimeMs <= 240
  ));
  const windowActivationHeterogeneous = selectMinimum(
    heterogeneousActivationRows.length > 0
      ? heterogeneousActivationRows
      : heterogeneousWithGuards,
  );
  const selectedCandidate = windowActivationHeterogeneous.candidate;

  console.log('WP-T2.1: contact-variation scan completed. Running physical guards.');

  const baselineGuide = evaluateGuideOutcome(baseline);
  const selectedGuide = evaluateGuideOutcome(selectedCandidate);
  const baselineWrongLow = evaluateGuideOutcome(baseline, BASELINE_SENSOR_SEED, { 70: 65 });
  const selectedWrongLow = evaluateGuideOutcome(
    selectedCandidate,
    BASELINE_SENSOR_SEED,
    { 70: 65 },
  );
  const baselineWrongHigh = evaluateGuideOutcome(baseline, BASELINE_SENSOR_SEED, { 70: 75 });
  const selectedWrongHigh = evaluateGuideOutcome(
    selectedCandidate,
    BASELINE_SENSOR_SEED,
    { 70: 75 },
  );
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
  const integrationConvergence = validateIntegrationConvergence(selectedCandidate);
  const sensorSeedRobustness = evaluateSensorSeedRobustness(
    realRuns,
    selectedCandidate,
  );
  const contactSeedRobustness = selectedCandidate.contactVariationFraction > 0
    ? evaluateContactSeedRobustness(realRuns, selectedCandidate)
    : null;
  const contactVariationGate = {
    passed: contactSeedRobustness === null || (
      contactSeedRobustness.averageMorphologyDistance.median
        <= windowActivationUniform.candidate.averageMorphologyDistance * 1.05
      && contactSeedRobustness.averageMorphologyDistance.p90
        <= windowActivationUniform.candidate.averageMorphologyDistance * 1.2
    ),
    interpretation:
      'A fixed contact field must not depend on one favorable spatial seed to appear better than the uniform threshold.',
  };
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
  const prematurePermanentLockRows = selectedCandidate.runs.flatMap((run) => (
    run.stickEpisodes
      .filter((episode) => (
        episode.openAtEnd
        && episode.startS * 1_000 < run.realVisibleRangeMs[1]
      ))
      .map((episode) => ({
        run: run.run,
        heightMm: run.heightMm,
        lockStartMs: episode.startS * 1_000,
        realFaintVisibleUntilMs: run.realVisibleRangeMs[1],
      }))
  ));
  const continuedOscillationGate = {
    passed: prematurePermanentLockRows.length === 0,
    prematurePermanentLockRows,
  };

  const morphologyImprovementFraction = (
    baseline.averageMorphologyDistance - selectedCandidate.averageMorphologyDistance
  ) / baseline.averageMorphologyDistance;
  const requiresStressBandForce = selectedCandidate.staticFrictionN
    > CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N;
  const contactVariationImprovementFraction = (
    windowActivationUniform.candidate.averageMorphologyDistance
      - selectedCandidate.averageMorphologyDistance
  ) / windowActivationUniform.candidate.averageMorphologyDistance;
  const productGuardsPassed = (
    zeroThresholdDegeneration.maximumPressureDifferenceKpa <= 1e-8
    && windowActivationHeterogeneous.baselineComparison
      .maximumFirst70MsRmsDifferenceKpa <= 0.5
    && Math.abs(selectedGuide.gamma - baselineGuide.gamma) <= 0.01
    && errorDirectionGates.lowerMiddleHeight.sameDirection
    && errorDirectionGates.higherMiddleHeight.sameDirection
    && integrationConvergence.maximumPressureDifferenceKpa <= 0.01
    && integrationConvergence.gammaAbsoluteDifference <= 0.002
    && energyGate.passed
    && continuedOscillationGate.passed
    && contactVariationGate.passed
  );
  const physicallyPlausibleProbe = selectedCandidate.staticFrictionN
    <= CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N;
  const mechanismUseful = morphologyImprovementFraction >= 0.1
    && productGuardsPassed
    && physicallyPlausibleProbe;

  const comparisonPanels = realRuns.map((run) => {
    const getSimulation = (candidate) => {
      const fit = candidate.runs.find((row) => row.run === run.run);
      return simulateStickSlipRun(run, candidate, fit.amplitudeMm);
    };
    const baselineSimulation = getSimulation(baseline);
    const uniformSimulation = getSimulation(windowActivationUniform.candidate);
    const heterogeneousSimulation = getSimulation(selectedCandidate);
    const map = (pressuresKpa, startS = 0, endS = 0.35) => pressuresKpa
      .map((pressureKpa, index) => ({
        x: index / SAMPLE_RATE_HZ,
        y: pressureKpa - run.baselineKpa,
      }))
      .filter((point) => point.x >= startS && point.x <= endS);
    return {
      run: run.run,
      heightMm: run.heightMm,
      full: {
        real: map(run.samples.map((sample) => sample.pressureKpa)),
        baseline: map(baselineSimulation.pressuresKpa),
        uniform: map(uniformSimulation.pressuresKpa),
        heterogeneous: map(heterogeneousSimulation.pressuresKpa),
      },
      tail: {
        real: map(run.samples.map((sample) => sample.pressureKpa), 0.07, 0.24),
        baseline: map(baselineSimulation.pressuresKpa, 0.07, 0.24),
        uniform: map(uniformSimulation.pressuresKpa, 0.07, 0.24),
        heterogeneous: map(heterogeneousSimulation.pressuresKpa, 0.07, 0.24),
      },
      heterogeneousSimulation,
    };
  });
  const detailPanel = [...comparisonPanels].sort((left, right) => (
    right.heterogeneousSimulation.trajectory.stickEpisodes.length
      - left.heterogeneousSimulation.trajectory.stickEpisodes.length
  ))[0];

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    stage: 'WP-T2.1',
    status: 'analysis-only; product model, defaults, scoring, and persistence unchanged',
    source: {
      path: 'docs/instrument-modeling/piston-oscillation/references/real-data/capstone-piston-oscillation-4runs-1000hz.csv',
      runCount: realRuns.length,
      samplesPerRun: realRuns[0].samples.length,
      sampleRateHz: SAMPLE_RATE_HZ,
    },
    physicalModel: {
      sliding:
        'F_k(x,v) = -mu_k(x) sign(v), regularized only inside |v| around 1 mm/s for integration.',
      capture:
        'At a true velocity reversal, the piston locks only when the non-dry-friction drive is no greater than F_s(x).',
      release:
        'While locked, displacement and velocity stay fixed but gas temperature and heat flow continue; motion restarts when the thermal/mechanical drive exceeds F_s(x).',
      contactVariation:
        'Optional fixed-in-run spatial variation of F_s and F_k, correlated over 0.6–2.4 mm; no independent per-sample noise and no hose term.',
    },
    chartContract: {
      waveform: 'Fixed x=0–0.35 s, y=−18–18 kPa for all four heights.',
      tail: 'Fixed x=0.07–0.24 s, y=−7–7 kPa for all four heights.',
      detail: 'Shaded regions are model state, not measurement uncertainty.',
      parameter:
        'Morphology distance is a deterministic diagnostic, not a probability or confidence interval.',
    },
    probeBoundaries: {
      conservativeStaticFrictionCeilingN: CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N,
      conservativeEquivalentPressureKpa:
        CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N
          / PRESSURE_EQUIVALENT_AREA_M2 / 1_000,
      conservativeWeightFraction:
        CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N / PISTON_WEIGHT_N,
      kineticRegularizationSpeedMmPerS:
        DEFAULT_KINETIC_REGULARIZATION_SPEED_M_PER_S * 1_000,
      morphologyWindowS: [MORPHOLOGY_WINDOW_START_S, MORPHOLOGY_WINDOW_END_S],
    },
    zeroThresholdDegeneration,
    baseline,
    zeroFrictionReallocation,
    bestConservativeUniform: {
      ...bestConservativeUniform,
      candidate: toGridRow(bestConservativeUniform.candidate),
    },
    bestUniform: {
      ...bestUniform,
      candidate: toGridRow(bestUniform.candidate),
    },
    windowActivationUniform: {
      ...windowActivationUniform,
      candidate: toGridRow(windowActivationUniform.candidate),
    },
    selectedHeterogeneous: {
      candidate: toGridRow(selectedCandidate),
      baselineComparison: windowActivationHeterogeneous.baselineComparison,
    },
    morphologyImprovementFraction,
    contactVariationImprovementFraction,
    requiresStressBandForce,
    physicallyPlausibleProbe,
    mechanismUseful,
    guideOutcome: {
      baseline: baselineGuide,
      candidate: selectedGuide,
      gammaAbsoluteDifference: Math.abs(selectedGuide.gamma - baselineGuide.gamma),
    },
    errorDirectionGates,
    integrationConvergence,
    sensorSeedRobustness,
    contactSeedRobustness,
    contactVariationGate,
    energyGate,
    continuedOscillationGate,
    productGuardsPassed,
    uniformGrid: uniformGrid.map(toGridRow),
    heterogeneousGrid: heterogeneousGrid.map(toGridRow),
    limitations: [
      'Only one trace exists at each of four heights, so apparatus-to-apparatus and repeat-to-repeat variation are not identifiable.',
      'Release displacement and actual friction force were not measured; displacement remains a nuisance fit and friction values are probes, not calibrated constants.',
      'The conservative 0.02 N ceiling is an explicit screening boundary, not a measured apparatus limit.',
      'A fixed spatial contact field tests a physical roughness/alignment hypothesis; it must not be interpreted as measured surface topography.',
      'No product implementation is authorized by this result alone.',
    ],
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  const gridRows = [...uniformGrid, ...heterogeneousGrid].map(toGridRow);
  const csvColumns = Object.keys(gridRows[0]);
  fs.writeFileSync(CSV_OUTPUT_PATH, [
    csvColumns.join(','),
    ...gridRows.map((row) => csvColumns.map((column) => row[column]).join(',')),
  ].join('\n') + '\n', 'utf8');
  fs.writeFileSync(WAVEFORM_SVG_PATH, createComparisonSvg({
    title: 'WP-T2.1 全段波形比较（固定同轴）',
    panels: comparisonPanels.map((panel) => ({ heightMm: panel.heightMm, ...panel.full })),
    xMinimum: 0,
    xMaximum: 0.35,
    yMinimum: -18,
    yMaximum: 18,
  }), 'utf8');
  fs.writeFileSync(TAIL_SVG_PATH, createComparisonSvg({
    title: 'WP-T2.1 尾段斜率与转折比较（固定同轴）',
    panels: comparisonPanels.map((panel) => ({ heightMm: panel.heightMm, ...panel.tail })),
    xMinimum: 0.07,
    xMaximum: 0.24,
    yMinimum: -7,
    yMaximum: 7,
  }), 'utf8');
  fs.writeFileSync(STICK_STATE_SVG_PATH, createStickStateSvg({
    run: detailPanel,
    series: detailPanel.tail.heterogeneous,
    stickEpisodes: detailPanel.heterogeneousSimulation.trajectory.stickEpisodes,
    candidate: selectedCandidate,
  }), 'utf8');
  fs.writeFileSync(
    PARAMETER_SVG_PATH,
    createParameterSvg(uniformGrid.map(toGridRow), baseline.averageMorphologyDistance),
    'utf8',
  );

  const conclusion = mechanismUseful
    ? `低速静摩擦锁定—再滑动机制在保守探针带内把尾段形态距离改善了 ${(morphologyImprovementFraction * 100).toFixed(1)}%，同时通过现有主体结果门槛；它具备进入用户视觉审核的条件，但仍不是装置标定值。`
    : requiresStressBandForce
      ? `要让真正的静止锁定进入 0.07–0.24 s 目标尾段，探针需要 F_s=${selectedCandidate.staticFrictionN.toFixed(2)} N（活塞自重的 ${(selectedCandidate.staticFrictionWeightFraction * 100).toFixed(1)}%）。标量形态距离虽下降 ${(morphologyImprovementFraction * 100).toFixed(1)}%，实际波形却过早变成平台、综合波形误差由 ${baseline.averageWaveformScore.toFixed(2)} 增至 ${selectedCandidate.averageWaveformScore.toFixed(2)}，且 γ 改变 ${Math.abs(selectedGuide.gamma - baselineGuide.gamma).toFixed(3)}；这不是你要的持续振动中的局部削角，因此该机制被本轮否决。`
      : `低速静摩擦在本轮扫描中没有同时满足“明显改善尾端折角、保持前段与主体结果、且处于保守力值带”三项要求；当前不建议接入产品。`;
  const selectedRows = selectedCandidate.runs.map((run) => (
    `| ${run.heightMm} | ${run.amplitudeMm.toFixed(2)} | ${run.morphologyDistance.toFixed(3)} | ${run.stickEpisodeCount} | ${formatFinite(run.firstStickTimeMs, 1)} | ${run.totalStuckDurationMs.toFixed(1)} |`
  )).join('\n');
  const report = `# WP-T2.1 低速微卡滞探针\n\n${conclusion}\n\n> 本目录只包含离线分析。当前软件物理模型、默认参数、评分、存档和 UI 均未改变。\n\n## 本轮实际加入的物理含义\n\n- 滑动时使用动摩擦；只有在速度真正换向的瞬间，且剩余驱动力不超过静摩擦阈值时，活塞才会短暂锁住；\n- 锁住期间位置不动，但气体仍继续换热；换热改变压强后，若驱动力重新超过阈值，活塞再次滑动；\n- 第二层探针只让接触阈值随活塞位置缓慢变化，并在一次实验内固定。它代表密封导向接触、微小不圆度或表面状态沿行程的差异，不是逐点噪声，也没有加入软管模型。\n\n## 关键结果\n\n| 项目 | 结果 |\n|---|---:|\n| WP-T1 尾段形态距离 | ${baseline.averageMorphologyDistance.toFixed(3)} |\n| 保守带最佳均匀静摩擦 | ${bestConservativeUniform.candidate.staticFrictionN.toFixed(3)} N |\n| 全扫描最佳均匀静摩擦 | ${bestUniform.candidate.staticFrictionN.toFixed(3)} N |\n| 作用时刻落入目标尾段的均匀探针 | ${windowActivationUniform.candidate.staticFrictionN.toFixed(3)} N |\n| 固定接触差异压力测试探针 | ${selectedCandidate.staticFrictionN.toFixed(3)} N |\n| 候选等效压强 | ${selectedCandidate.staticFrictionEquivalentPressureKpa.toFixed(4)} kPa |\n| 候选占活塞自重 | ${(selectedCandidate.staticFrictionWeightFraction * 100).toFixed(2)}% |\n| 候选接触变化幅度 | ±${(selectedCandidate.contactVariationFraction * 100).toFixed(0)}% |\n| 候选接触相关长度 | ${selectedCandidate.contactCorrelationLengthMm.toFixed(1)} mm |\n| 尾段形态距离改善 | ${(morphologyImprovementFraction * 100).toFixed(1)}% |\n| 固定接触差异相对均匀阈值的改善 | ${(contactVariationImprovementFraction * 100).toFixed(1)}% |\n| 综合波形误差 | ${baseline.averageWaveformScore.toFixed(2)} → ${selectedCandidate.averageWaveformScore.toFixed(2)} |\n| 前 70 ms 最大 RMS 改变 | ${windowActivationHeterogeneous.baselineComparison.maximumFirst70MsRmsDifferenceKpa.toFixed(3)} kPa |\n| 80/70/60 mm 推导 γ 改变 | ${Math.abs(selectedGuide.gamma - baselineGuide.gamma).toFixed(5)} |\n| 实测仍振动时是否过早永久锁定 | ${continuedOscillationGate.passed ? '否' : '是（未通过）'} |\n| 固定接触差异是否跨位置种子稳定 | ${contactVariationGate.passed ? '是' : '否（未通过）'} |\n| 数值、能量、γ 与错误方向门槛 | ${productGuardsPassed ? '通过' : '未通过'} |\n\n## 四组候选表现\n\n| 高度 / mm | 等效释放幅度 / mm | 形态距离 | 锁定次数 | 首次锁定 / ms | 累计锁定 / ms |\n|---:|---:|---:|---:|---:|---:|\n${selectedRows}\n\n## 如何解释\n\n- 若保守带已经产生与实测相同方向的削角，它说明“低速接触摩擦”是有物理意义的候选原因；\n- 若只有更大的压力测试带才出现明显折角，只能说明数学机制能够造形，不能证明装置真的有这么大的摩擦；\n- 本次压力测试的标量形态距离变小，是因为曲线被提前压平，并不代表它重现了实测中仍持续振动的局部斜率变化；\n- 固定接触差异在八个位置种子中高度不稳定，也没有挽救综合波形、γ 和持续振动门槛，因此不能作为正式方向；\n- 四条实测曲线不足以标定 F_s、F_k 或接触相关长度，正式接入仍需可复核的机械数据。\n\n## 图形与机器可读结果\n\n- [全段固定同轴比较](./waveform-comparison.svg)\n- [尾段固定同轴比较](./tail-slope-comparison.svg)\n- [锁定状态细节](./stick-state-detail.svg)\n- [静摩擦参数扫描](./parameter-scan.svg)\n- [完整 JSON](./stick-slip-probe.json)\n- [网格 CSV](./stick-slip-grid.csv)\n\n## 结论边界\n\n本轮不是把折线“拟合得像照片”，而是检验一种可解释机制能否自然产生折角。保守上限 ${CONSERVATIVE_STATIC_FRICTION_PROBE_CEILING_N.toFixed(2)} N 是筛选规则，不是装置实测上限；任何候选参数都只能称为临时探针。\n`;
  fs.writeFileSync(REPORT_OUTPUT_PATH, report, 'utf8');

  console.log(JSON.stringify({
    conclusion,
    baselineMorphologyDistance: baseline.averageMorphologyDistance,
    bestConservativeUniform: toGridRow(bestConservativeUniform.candidate),
    bestUniform: toGridRow(bestUniform.candidate),
    windowActivationUniform: toGridRow(windowActivationUniform.candidate),
    selected: toGridRow(selectedCandidate),
    morphologyImprovementFraction,
    contactVariationImprovementFraction,
    requiresStressBandForce,
    physicallyPlausibleProbe,
    mechanismUseful,
    productGuardsPassed,
    outputDirectory: path.relative(ROOT, OUTPUT_DIR).replace(/\\/g, '/'),
  }, null, 2));
  return output;
};

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) runPistonOscillationStickSlipProbe();
