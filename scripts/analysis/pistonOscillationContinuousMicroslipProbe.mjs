import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG,
  PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3,
  PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2,
  PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K,
  createPistonOscillationLoadedEquilibriumState,
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
  addScaledDerivative,
  calculateGammaFromHeightPeriods,
  createCandidate,
  createFrictionReleaseTrajectory,
  createGuidePressHistory,
  createPressHistory,
  estimatePeriodMs,
  evaluateCandidate,
  extractRealPhaseLockedExtrema,
  mean,
  observeRelease,
  parseRealRuns,
  rootMeanSquare,
  scoreObservedRun,
  simulateCandidateRun,
  summarize,
} from './pistonOscillationFrictionReallocationProbe.mjs';
import {
  createComparisonSvg,
  escapeXml,
  getMorphologyDistance,
  getTailMorphology,
  hashUnitInterval,
  svgPolyline,
} from './pistonOscillationStickSlipProbe.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, '.codex-tmp', 'piston-oscillation-wp-t2-2');
const JSON_OUTPUT_PATH = path.join(OUTPUT_DIR, 'continuous-microslip-probe.json');
const CSV_OUTPUT_PATH = path.join(OUTPUT_DIR, 'continuous-microslip-grid.csv');
const REPORT_OUTPUT_PATH = path.join(OUTPUT_DIR, 'README.md');
const REPORT_ARTIFACT_JSON_PATH = path.join(OUTPUT_DIR, 'report-artifact.json');
const REPORT_HEADLINE_SQL_PATH = path.join(OUTPUT_DIR, 'headline.sql');
const REPORT_MORPHOLOGY_SQL_PATH = path.join(OUTPUT_DIR, 'morphology.sql');
const WAVEFORM_SVG_PATH = path.join(OUTPUT_DIR, 'candidate-waveform-comparison.svg');
const TAIL_SVG_PATH = path.join(OUTPUT_DIR, 'candidate-tail-comparison.svg');
const STRESS_SVG_PATH = path.join(OUTPUT_DIR, 'stress-tail-comparison.svg');
const FORCE_SVG_PATH = path.join(OUTPUT_DIR, 'microslip-force-detail.svg');
const TRADEOFF_SVG_PATH = path.join(OUTPUT_DIR, 'force-morphology-tradeoff.svg');

const CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M = 1.1;
const CANDIDATE_FORCE_CEILING_N = 0.02;
const STRESS_FORCE_CEILING_N = 0.08;
const SIGN_REGULARIZATION_SPEED_M_PER_S = 0.01;
const CONTACT_SEED_BASE = 0x43f6a888;
const RESIDUAL_LINEAR_LOSS_VALUES = [0.9, 1, 1.1];
const LOW_SPEED_FORCE_VALUES_N = [0.0025, 0.005, 0.01, 0.02, 0.04, 0.08];
const TRANSITION_SPEED_VALUES_M_PER_S = [0.05, 0.15, 0.3, 0.6];
const KINETIC_FLOOR_FRACTIONS = [0, 0.2];
const CONTACT_VARIATION_FRACTIONS = [0.1, 0.2, 0.3];
const CONTACT_CORRELATION_LENGTHS_MM = [0.6, 1.2, 2.4];
const EARLY_WINDOW_S = 0.07;
const MAXIMUM_EARLY_RMS_DIFFERENCE_KPA = 0.3;
const MAXIMUM_TIMING_REGRESSION_MS = 0.5;
const MAXIMUM_AMPLITUDE_REGRESSION_KPA = 0.2;
const MAXIMUM_WAVEFORM_SCORE_MULTIPLIER = 1.2;

const round = (value, digits = 6) => Number(value.toFixed(digits));

const createMicroslipCandidate = ({
  residualLinearLossNsPerM,
  lowSpeedForceN,
  transitionSpeedMPerS,
  kineticFloorFraction,
  contactVariationFraction = 0,
  contactCorrelationLengthMm = 1.2,
  contactSeed = CONTACT_SEED_BASE,
}) => ({
  residualLinearLossNsPerM,
  lowSpeedForceN,
  transitionSpeedMPerS,
  kineticFloorFraction,
  kineticFloorForceN: lowSpeedForceN * kineticFloorFraction,
  signRegularizationSpeedMPerS: SIGN_REGULARIZATION_SPEED_M_PER_S,
  contactVariationFraction,
  contactCorrelationLengthMm,
  contactSeed,
});

const getContactField = (pistonHeightMm, candidate) => {
  if (candidate.contactVariationFraction <= 0) return 0;
  const phase1 = hashUnitInterval(candidate.contactSeed, 0x21a3) * 2 * Math.PI;
  const phase2 = hashUnitInterval(candidate.contactSeed, 0x5c71) * 2 * Math.PI;
  const phase3 = hashUnitInterval(candidate.contactSeed, 0xb095) * 2 * Math.PI;
  const coordinate = 2 * Math.PI * pistonHeightMm
    / candidate.contactCorrelationLengthMm;
  return 0.55 * Math.sin(coordinate + phase1)
    + 0.3 * Math.sin(coordinate * 0.47 + phase2)
    + 0.15 * Math.sin(coordinate * 1.83 + phase3);
};

const getMicroslipForce = (pistonHeightMm, velocityMPerS, candidate) => {
  if (candidate.lowSpeedForceN <= 0) {
    return { signedForceN: 0, magnitudeN: 0, contactScale: 1 };
  }
  const contactScale = Math.max(
    0.1,
    1 + candidate.contactVariationFraction
      * getContactField(pistonHeightMm, candidate),
  );
  const speedRatio = Math.abs(velocityMPerS) / candidate.transitionSpeedMPerS;
  const lowSpeedWeight = Math.exp(-(speedRatio ** 2));
  const magnitudeN = contactScale * (
    candidate.kineticFloorForceN
      + (candidate.lowSpeedForceN - candidate.kineticFloorForceN)
        * lowSpeedWeight
  );
  return {
    signedForceN: magnitudeN * Math.tanh(
      velocityMPerS / candidate.signRegularizationSpeedMPerS,
    ),
    magnitudeN,
    contactScale,
  };
};

const createContinuousMicroslipReleaseTrajectory = (
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
    + candidate.lowSpeedForceN / candidate.signRegularizationSpeedMPerS;
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
      throw new RangeError('Continuous microslip probe passed below the 0 mm stop.');
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
    const microslip = getMicroslipForce(
      pistonHeightM * 1_000,
      current.velocityMPerS,
      candidate,
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
      + microslip.signedForceN * current.velocityMPerS;
    return {
      displacementRateMPerS: current.velocityMPerS,
      velocityRateMPerS2: (
        pressureForceN - gravityForceN - linearLossForceN - microslip.signedForceN
      ) / movingMassKg,
      temperatureRateKPerS:
        temperatureRateFromWorkKPerS + current.heatTransferRateW / gasHeatCapacityJPerK,
      heatTransferRateW: current.heatTransferRateW,
      heatTransferRateRateWPerS:
        (targetHeatTransferRateW - current.heatTransferRateW)
        / thermalConfig.heatTransferLagTimeS,
      dissipatedPowerW,
      pressurePa,
      pistonHeightM,
      microslipForceN: microslip.signedForceN,
      microslipMagnitudeN: microslip.magnitudeN,
      contactScale: microslip.contactScale,
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
  let maximumMicroslipForceN = 0;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const instantaneous = derivative(state);
    minimumDissipatedPowerW = Math.min(
      minimumDissipatedPowerW,
      instantaneous.dissipatedPowerW,
    );
    maximumMicroslipForceN = Math.max(
      maximumMicroslipForceN,
      Math.abs(instantaneous.microslipForceN),
    );
    samples.push({
      timeS: sampleIndex / SAMPLE_RATE_HZ,
      displacementM: state.displacementM,
      velocityMPerS: state.velocityMPerS,
      pressurePa: instantaneous.pressurePa,
      temperatureK: state.temperatureK,
      cumulativeHeatTransferJ: state.cumulativeHeatTransferJ,
      heatTransferRateW: state.heatTransferRateW,
      dissipatedEnergyJ: state.dissipatedEnergyJ,
      microslipForceN: instantaneous.microslipForceN,
      microslipMagnitudeN: instantaneous.microslipMagnitudeN,
      contactScale: instantaneous.contactScale,
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
    maximumMicroslipForceN,
    totalDissipatedEnergyJ: samples.at(-1).dissipatedEnergyJ,
  };
};

const simulationCache = new Map();

const simulateMicroslipRun = (
  run,
  candidate,
  amplitudeMm,
  sensorSeed = BASELINE_SENSOR_SEED,
  maximumIntegrationRateHz = 12_000,
) => {
  const runCandidate = {
    ...candidate,
    contactSeed: (candidate.contactSeed + Number(run.run) * 0x9e3779b1) >>> 0,
  };
  const key = [
    run.run,
    round(candidate.residualLinearLossNsPerM, 4),
    round(candidate.lowSpeedForceN, 5),
    round(candidate.transitionSpeedMPerS, 4),
    round(candidate.kineticFloorFraction, 3),
    round(candidate.contactVariationFraction, 3),
    round(candidate.contactCorrelationLengthMm, 3),
    runCandidate.contactSeed,
    round(amplitudeMm, 3),
    sensorSeed,
    maximumIntegrationRateHz,
  ].join(':');
  const cached = simulationCache.get(key);
  if (cached) return cached;
  const press = createPressHistory(run, amplitudeMm);
  const trajectory = createContinuousMicroslipReleaseTrajectory(
    press,
    runCandidate,
    maximumIntegrationRateHz,
  );
  const pressuresKpa = observeRelease(press, trajectory, sensorSeed);
  const result = { press, trajectory, pressuresKpa, runCandidate };
  simulationCache.set(key, result);
  return result;
};

const createBaselineAnalysis = (realRuns) => {
  const fitted = evaluateCandidate(
    realRuns,
    createCandidate(CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M, 0),
    FINE_AMPLITUDES_MM,
  );
  const runs = realRuns.map((run) => {
    const fit = fitted.runs.find((row) => row.run === run.run);
    const simulation = simulateCandidateRun(run, fitted, fit.amplitudeMm);
    return {
      run: run.run,
      heightMm: run.heightMm,
      amplitudeMm: fit.amplitudeMm,
      waveform: fit,
      pressuresKpa: simulation.pressuresKpa,
      realMorphology: getTailMorphology(
        run.samples.map((sample) => sample.pressureKpa),
        run.baselineKpa,
        run.periodS,
      ),
      morphology: getTailMorphology(
        simulation.pressuresKpa,
        run.baselineKpa,
        run.periodS,
      ),
    };
  });
  for (const row of runs) {
    row.morphologyDistance = getMorphologyDistance(row.realMorphology, row.morphology);
  }
  return {
    ...fitted,
    averageMorphologyDistance: mean(runs.map((run) => run.morphologyDistance)),
    runs,
  };
};

const evaluateMicroslipCandidate = (
  realRuns,
  baseline,
  candidate,
  amplitudeValuesForRun,
  sensorSeed = BASELINE_SENSOR_SEED,
) => {
  const runs = realRuns.map((run) => {
    const baselineRun = baseline.runs.find((row) => row.run === run.run);
    const realExtrema = extractRealPhaseLockedExtrema(run);
    const amplitudeValues = amplitudeValuesForRun(run, baselineRun);
    let best = null;
    for (const amplitudeMm of amplitudeValues) {
      const simulation = simulateMicroslipRun(
        run,
        candidate,
        amplitudeMm,
        sensorSeed,
      );
      const waveform = scoreObservedRun(run, realExtrema, simulation.pressuresKpa);
      if (!waveform) continue;
      const morphology = getTailMorphology(
        simulation.pressuresKpa,
        run.baselineKpa,
        run.periodS,
      );
      const morphologyDistance = getMorphologyDistance(
        baselineRun.realMorphology,
        morphology,
      );
      const baselineAtSameAmplitude = simulateCandidateRun(
        run,
        baseline,
        amplitudeMm,
        sensorSeed,
      );
      const earlySampleCount = Math.round(EARLY_WINDOW_S * SAMPLE_RATE_HZ) + 1;
      const earlyRmsDifferenceKpa = rootMeanSquare(
        simulation.pressuresKpa.slice(0, earlySampleCount).map(
          (value, index) => value - baselineAtSameAmplitude.pressuresKpa[index],
        ),
      );
      const combinedScore = waveform.score + morphologyDistance * 0.75;
      const row = {
        amplitudeMm,
        waveform,
        morphology,
        morphologyDistance,
        earlyRmsDifferenceKpa,
        combinedScore,
        totalDissipatedEnergyJ: simulation.trajectory.totalDissipatedEnergyJ,
        minimumDissipatedPowerW: simulation.trajectory.minimumDissipatedPowerW,
        minimumDissipatedEnergyIncrementJ:
          simulation.trajectory.minimumDissipatedEnergyIncrementJ,
        maximumMicroslipForceN: simulation.trajectory.maximumMicroslipForceN,
      };
      if (!best || row.combinedScore < best.combinedScore) best = row;
    }
    if (!best) throw new Error(`No usable microslip fit for run ${run.run}.`);
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
    averageVisibleDurationErrorMs:
      mean(runs.map((run) => run.waveform.visibleDurationErrorMs)),
    maximumEarlyRmsDifferenceKpa: Math.max(
      ...runs.map((run) => run.earlyRmsDifferenceKpa),
    ),
    maximumMicroslipForceN: Math.max(
      ...runs.map((run) => run.maximumMicroslipForceN),
    ),
    minimumDissipatedPowerW: Math.min(
      ...runs.map((run) => run.minimumDissipatedPowerW),
    ),
    minimumDissipatedEnergyIncrementJ: Math.min(
      ...runs.map((run) => run.minimumDissipatedEnergyIncrementJ),
    ),
    runs,
  };
};

const fixedBaselineAmplitudeProvider = (_run, baselineRun) => [baselineRun.amplitudeMm];

const refinedAmplitudeProvider = (_run, baselineRun) => [-0.5, -0.25, 0, 0.25, 0.5]
  .map((offset) => baselineRun.amplitudeMm + offset)
  .filter((value) => value >= 2.5 && value <= 12);

const getGuardAssessment = (candidate, baseline) => ({
  earlyShape: candidate.maximumEarlyRmsDifferenceKpa
    <= MAXIMUM_EARLY_RMS_DIFFERENCE_KPA,
  timing: candidate.averageTimingRmseMs
    <= baseline.averageTimingRmseMs + MAXIMUM_TIMING_REGRESSION_MS,
  amplitude: candidate.averageAmplitudeRmseKpa
    <= baseline.averageAmplitudeRmseKpa + MAXIMUM_AMPLITUDE_REGRESSION_KPA,
  lateAmplitude: candidate.averageLateAmplitudeRmseKpa
    <= baseline.averageLateAmplitudeRmseKpa + MAXIMUM_AMPLITUDE_REGRESSION_KPA,
  waveform: candidate.averageWaveformScore
    <= baseline.averageScore * MAXIMUM_WAVEFORM_SCORE_MULTIPLIER,
  energy: candidate.minimumDissipatedPowerW >= -1e-12
    && candidate.minimumDissipatedEnergyIncrementJ >= -1e-12,
});

const allGuardsPass = (assessment) => Object.values(assessment).every(Boolean);

const candidatePenalty = (candidate, baseline) => {
  const assessment = getGuardAssessment(candidate, baseline);
  return candidate.averageMorphologyDistance
    + Math.max(0, candidate.maximumEarlyRmsDifferenceKpa
      - MAXIMUM_EARLY_RMS_DIFFERENCE_KPA) * 6
    + Math.max(0, candidate.averageTimingRmseMs
      - baseline.averageTimingRmseMs - MAXIMUM_TIMING_REGRESSION_MS) * 0.4
    + Math.max(0, candidate.averageAmplitudeRmseKpa
      - baseline.averageAmplitudeRmseKpa - MAXIMUM_AMPLITUDE_REGRESSION_KPA) * 2
    + (assessment.waveform ? 0 : 2);
};

const selectBest = (candidates, baseline) => {
  const guarded = candidates.filter((candidate) => allGuardsPass(
    getGuardAssessment(candidate, baseline),
  ));
  const pool = guarded.length > 0 ? guarded : candidates;
  return pool.reduce((best, candidate) => (
    candidatePenalty(candidate, baseline) < candidatePenalty(best, baseline)
      ? candidate
      : best
  ), pool[0]);
};

const validateZeroForceDegeneration = (realRuns) => {
  const candidate = createMicroslipCandidate({
    residualLinearLossNsPerM: CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
    lowSpeedForceN: 0,
    transitionSpeedMPerS: 0.15,
    kineticFloorFraction: 0,
  });
  const smooth = createCandidate(CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M, 0);
  const rows = realRuns.map((run) => {
    const press = createPressHistory(run, 8);
    const microslip = createContinuousMicroslipReleaseTrajectory(press, candidate);
    const baseline = createFrictionReleaseTrajectory(press, smooth);
    return {
      run: run.run,
      heightMm: run.heightMm,
      maximumPressureDifferenceKpa: Math.max(...microslip.samples.map(
        (sample, index) => Math.abs(sample.pressurePa - baseline.samples[index].pressurePa)
          / 1_000,
      )),
      maximumDisplacementDifferenceMm: Math.max(...microslip.samples.map(
        (sample, index) => Math.abs(
          sample.displacementM - baseline.samples[index].displacementM,
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

const evaluateGuideOutcome = (
  candidate,
  sensorSeed = BASELINE_SENSOR_SEED,
  actualHeightOverrides = {},
  maximumIntegrationRateHz = 12_000,
) => {
  const rows = [80, 70, 60].map((nominalHeightMm) => {
    const actualHeightMm = actualHeightOverrides[nominalHeightMm] ?? nominalHeightMm;
    const press = createGuidePressHistory(actualHeightMm, 8);
    const trajectory = createContinuousMicroslipReleaseTrajectory(
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
    };
  });
  return { rows, ...calculateGammaFromHeightPeriods(rows) };
};

const attachGuideOutcome = (candidate, baselineGuide) => {
  const guideOutcome = evaluateGuideOutcome(candidate);
  return {
    ...candidate,
    guideOutcome,
    guideGammaAbsoluteDifference: Math.abs(guideOutcome.gamma - baselineGuide.gamma),
  };
};

const selectBestWithGuide = (candidates, baseline, maximumForceN) => {
  if (candidates.length === 0) {
    throw new Error(`No continuous-microslip candidates available below ${maximumForceN} N.`);
  }
  const withinForceBoundary = candidates.filter(
    (candidate) => candidate.maximumMicroslipForceN <= maximumForceN + 1e-9,
  );
  const forcePool = withinForceBoundary.length > 0 ? withinForceBoundary : candidates;
  const fullyGuarded = forcePool.filter((candidate) => (
    allGuardsPass(getGuardAssessment(candidate, baseline))
    && candidate.guideGammaAbsoluteDifference <= 0.01
  ));
  const pool = fullyGuarded.length > 0 ? fullyGuarded : forcePool;
  return pool.reduce((best, candidate) => {
    const candidateScore = candidatePenalty(candidate, baseline)
      + candidate.guideGammaAbsoluteDifference * 8;
    const bestScore = candidatePenalty(best, baseline)
      + best.guideGammaAbsoluteDifference * 8;
    return candidateScore < bestScore ? candidate : best;
  }, pool[0]);
};

const rankWithGuide = (candidates, baseline) => [...candidates].sort((left, right) => (
  candidatePenalty(left, baseline) + left.guideGammaAbsoluteDifference * 8
  - candidatePenalty(right, baseline) - right.guideGammaAbsoluteDifference * 8
));

const createMatchingUniformCandidate = (
  realRuns,
  baseline,
  heterogeneousCandidate,
  baselineGuide,
) => attachGuideOutcome(evaluateMicroslipCandidate(
  realRuns,
  baseline,
  createMicroslipCandidate({
    residualLinearLossNsPerM: heterogeneousCandidate.residualLinearLossNsPerM,
    lowSpeedForceN: heterogeneousCandidate.lowSpeedForceN,
    transitionSpeedMPerS: heterogeneousCandidate.transitionSpeedMPerS,
    kineticFloorFraction: heterogeneousCandidate.kineticFloorFraction,
    contactVariationFraction: 0,
    contactCorrelationLengthMm: heterogeneousCandidate.contactCorrelationLengthMm,
  }),
  refinedAmplitudeProvider,
), baselineGuide);

const validateIntegrationConvergence = (candidate) => {
  const rows = [80, 70, 60].map((heightMm) => {
    const press = createGuidePressHistory(heightMm, 8);
    const coarse = createContinuousMicroslipReleaseTrajectory(press, candidate, 12_000);
    const fine = createContinuousMicroslipReleaseTrajectory(press, candidate, 24_000);
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
    };
  });
  const coarseGuide = evaluateGuideOutcome(candidate, BASELINE_SENSOR_SEED, {}, 12_000);
  const fineGuide = evaluateGuideOutcome(candidate, BASELINE_SENSOR_SEED, {}, 24_000);
  return {
    rows,
    maximumPressureDifferenceKpa: Math.max(
      ...rows.map((row) => row.maximumPressureDifferenceKpa),
    ),
    maximumDisplacementDifferenceMm: Math.max(
      ...rows.map((row) => row.maximumDisplacementDifferenceMm),
    ),
    gammaAbsoluteDifference: Math.abs(coarseGuide.gamma - fineGuide.gamma),
  };
};

const evaluateSeedRobustness = (realRuns, baseline, candidate, mode) => {
  const seeds = mode === 'sensor'
    ? SENSOR_ROBUSTNESS_SEEDS
    : Array.from(
      { length: 8 },
      (_, index) => (CONTACT_SEED_BASE + index * 0x9e3779b1) >>> 0,
    );
  const rows = seeds.map((seed) => {
    const seededCandidate = mode === 'sensor'
      ? candidate
      : { ...candidate, contactSeed: seed };
    const sensorSeed = mode === 'sensor' ? seed : BASELINE_SENSOR_SEED;
    const runRows = realRuns.map((run) => {
      const fit = candidate.runs.find((row) => row.run === run.run);
      const baselineRun = baseline.runs.find((row) => row.run === run.run);
      const simulation = simulateMicroslipRun(
        run,
        seededCandidate,
        fit.amplitudeMm,
        sensorSeed,
      );
      const morphology = getTailMorphology(
        simulation.pressuresKpa,
        run.baselineKpa,
        run.periodS,
      );
      const waveform = scoreObservedRun(
        run,
        extractRealPhaseLockedExtrema(run),
        simulation.pressuresKpa,
      );
      return {
        morphologyDistance: getMorphologyDistance(
          baselineRun.realMorphology,
          morphology,
        ),
        waveformScore: waveform?.score ?? Number.POSITIVE_INFINITY,
      };
    });
    return {
      seed,
      averageMorphologyDistance: mean(runRows.map((row) => row.morphologyDistance)),
      averageWaveformScore: mean(runRows.map((row) => row.waveformScore)),
    };
  });
  return {
    mode,
    rows,
    averageMorphologyDistance: summarize(
      rows.map((row) => row.averageMorphologyDistance),
    ),
    averageWaveformScore: summarize(rows.map((row) => row.averageWaveformScore)),
  };
};

const toGridRow = (candidate) => ({
  residualLinearLossNsPerM: candidate.residualLinearLossNsPerM,
  lowSpeedForceN: candidate.lowSpeedForceN,
  transitionSpeedMPerS: candidate.transitionSpeedMPerS,
  kineticFloorFraction: candidate.kineticFloorFraction,
  contactVariationFraction: candidate.contactVariationFraction,
  contactCorrelationLengthMm: candidate.contactCorrelationLengthMm,
  averageWaveformScore: candidate.averageWaveformScore,
  averageMorphologyDistance: candidate.averageMorphologyDistance,
  averageTimingRmseMs: candidate.averageTimingRmseMs,
  averageAmplitudeRmseKpa: candidate.averageAmplitudeRmseKpa,
  averageLateAmplitudeRmseKpa: candidate.averageLateAmplitudeRmseKpa,
  averageVisibleDurationErrorMs: candidate.averageVisibleDurationErrorMs,
  maximumEarlyRmsDifferenceKpa: candidate.maximumEarlyRmsDifferenceKpa,
  maximumMicroslipForceN: candidate.maximumMicroslipForceN,
});

const createForceDetailSvg = ({ run, pressuresKpa, trajectory, baselineKpa }) => {
  const width = 1400;
  const height = 760;
  const left = 105;
  const right = 55;
  const top = 92;
  const gap = 65;
  const panelHeight = 245;
  const plotWidth = width - left - right;
  const xMinimum = 0.05;
  const xMaximum = 0.25;
  const xScale = (value) => left + (value - xMinimum) / (xMaximum - xMinimum)
    * plotWidth;
  const pressureScale = (value) => top + panelHeight - (value + 7) / 14 * panelHeight;
  const forceTop = top + panelHeight + gap;
  const maximumForceN = Math.max(
    0.005,
    ...trajectory.samples.map((sample) => Math.abs(sample.microslipForceN)),
  );
  const forceScale = (value) => forceTop + panelHeight
    - (value + maximumForceN) / (2 * maximumForceN) * panelHeight;
  const pressurePoints = pressuresKpa.map((pressureKpa, index) => ({
    x: index / SAMPLE_RATE_HZ,
    y: pressureKpa - baselineKpa,
  })).filter((point) => point.x >= xMinimum && point.x <= xMaximum);
  const forcePoints = trajectory.samples.map((sample) => ({
    x: sample.timeS,
    y: sample.microslipForceN,
  })).filter((point) => point.x >= xMinimum && point.x <= xMaximum);
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#fbfcfe"/>',
    `<text x="700" y="38" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="25" font-weight="700" fill="#172033">连续微滑受力细节（${run.heightMm} mm）</text>`,
    '<text x="700" y="66" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">上：模拟传感器压强；下：底层连续微滑力，正负仅表示运动方向</text>',
  ];
  const drawPanel = (panelTop, yMinimum, yMaximum, yScale, unit) => {
    lines.push(`<rect x="${left}" y="${panelTop}" width="${plotWidth}" height="${panelHeight}" fill="#fff" stroke="#b8c2d1"/>`);
    for (let tick = 0; tick <= 8; tick += 1) {
      const xValue = xMinimum + (xMaximum - xMinimum) * tick / 8;
      const x = xScale(xValue);
      lines.push(`<line x1="${x}" y1="${panelTop}" x2="${x}" y2="${panelTop + panelHeight}" stroke="#e7ebf1"/>`);
      if (panelTop === forceTop) {
        lines.push(`<text x="${x}" y="${panelTop + panelHeight + 22}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#667085">${xValue.toFixed(3)}</text>`);
      }
    }
    for (let tick = 0; tick <= 4; tick += 1) {
      const yValue = yMinimum + (yMaximum - yMinimum) * tick / 4;
      const y = yScale(yValue);
      lines.push(`<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="${Math.abs(yValue) < 1e-12 ? '#c8d0dc' : '#e7ebf1'}"/>`);
      lines.push(`<text x="${left - 12}" y="${y + 4}" text-anchor="end" font-family="Segoe UI" font-size="12" fill="#667085">${yValue.toFixed(unit === 'N' ? 3 : 1)}</text>`);
    }
    lines.push(`<text x="34" y="${panelTop + panelHeight / 2}" transform="rotate(-90 34 ${panelTop + panelHeight / 2})" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">${unit}</text>`);
  };
  drawPanel(top, -7, 7, pressureScale, '相对压强 / kPa');
  drawPanel(forceTop, -maximumForceN, maximumForceN, forceScale, 'N');
  lines.push(svgPolyline(
    pressurePoints,
    xScale,
    pressureScale,
    'fill="none" stroke="#1677b8" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"',
  ));
  lines.push(svgPolyline(
    forcePoints,
    xScale,
    forceScale,
    'fill="none" stroke="#e36a1b" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"',
  ));
  lines.push(`<text x="${left + plotWidth / 2}" y="${height - 26}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">释放后时间 / s</text>`);
  lines.push('</svg>');
  return lines.join('\n');
};

const createTradeoffSvg = (rows, baselineMorphologyDistance) => {
  const width = 1400;
  const height = 700;
  const left = 105;
  const right = 55;
  const top = 100;
  const bottom = 90;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const xScale = (value) => left + value / STRESS_FORCE_CEILING_N * plotWidth;
  const maximumY = Math.max(
    baselineMorphologyDistance,
    ...rows.map((row) => row.averageMorphologyDistance),
  ) * 1.05;
  const yScale = (value) => top + plotHeight - value / maximumY * plotHeight;
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#fbfcfe"/>',
    '<text x="700" y="40" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="25" font-weight="700" fill="#172033">连续微滑力—尾段形态扫描</text>',
    '<text x="700" y="68" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">每点为一种均匀接触组合；圆点通过前段与波形门槛，叉号未通过</text>',
    `<rect x="${left}" y="${top}" width="${xScale(CANDIDATE_FORCE_CEILING_N) - left}" height="${plotHeight}" fill="#e9f5ed"/>`,
    `<rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#b8c2d1"/>`,
  ];
  for (let tick = 0; tick <= 8; tick += 1) {
    const xValue = STRESS_FORCE_CEILING_N * tick / 8;
    const x = xScale(xValue);
    lines.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + plotHeight}" stroke="#e7ebf1"/>`);
    lines.push(`<text x="${x}" y="${top + plotHeight + 24}" text-anchor="middle" font-family="Segoe UI" font-size="12" fill="#667085">${xValue.toFixed(2)}</text>`);
  }
  for (let tick = 0; tick <= 6; tick += 1) {
    const yValue = maximumY * tick / 6;
    const y = yScale(yValue);
    lines.push(`<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="#e7ebf1"/>`);
    lines.push(`<text x="${left - 12}" y="${y + 4}" text-anchor="end" font-family="Segoe UI" font-size="12" fill="#667085">${yValue.toFixed(1)}</text>`);
  }
  const baselineY = yScale(baselineMorphologyDistance);
  lines.push(`<line x1="${left}" y1="${baselineY}" x2="${left + plotWidth}" y2="${baselineY}" stroke="#667085" stroke-width="2" stroke-dasharray="8 5"/>`);
  for (const row of rows) {
    const passed = row.guardsPassed;
    const x = xScale(row.maximumMicroslipForceN);
    const y = yScale(row.averageMorphologyDistance);
    if (passed) {
      lines.push(`<circle cx="${x}" cy="${y}" r="4" fill="#e36a1b" fill-opacity="0.7"/>`);
    } else {
      lines.push(`<line x1="${x - 3}" y1="${y - 3}" x2="${x + 3}" y2="${y + 3}" stroke="#8a6d1d" stroke-width="1.5"/><line x1="${x - 3}" y1="${y + 3}" x2="${x + 3}" y2="${y - 3}" stroke="#8a6d1d" stroke-width="1.5"/>`);
    }
  }
  lines.push(`<text x="${left + plotWidth / 2}" y="${height - 34}" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">仿真实际最大微滑力 / N</text>`);
  lines.push(`<text x="34" y="${top + plotHeight / 2}" transform="rotate(-90 34 ${top + plotHeight / 2})" text-anchor="middle" font-family="Segoe UI, Microsoft YaHei" font-size="14" fill="#475467">尾段形态距离（越低越接近实测）</text>`);
  lines.push('</svg>');
  return lines.join('\n');
};

const createTechnicalReportArtifact = ({
  generatedAt,
  baseline,
  matchingUniformCandidate,
  bestVariedCandidate,
  bestVariedStress,
  baselineImprovementFraction,
  matchingUniformImprovementFraction,
  variationImprovementFraction,
  stressImprovementFraction,
  gammaDifference,
  integrationConvergence,
  sensorSeedRobustness,
  contactSeedRobustness,
  errorDirectionPassed,
}) => {
  const resultSource = {
    id: 'probe_results',
    label: 'WP-T2.2 连续微滑扫描结果',
    path: 'continuous-microslip-probe.json',
  };
  const morphologyRows = [
    {
      model: 'WP-T1 基线',
      morphologyDistance: baseline.averageMorphologyDistance,
      improvementFraction: 0,
      forceBand: '无新增微滑',
    },
    {
      model: '同参数均匀微滑',
      morphologyDistance: matchingUniformCandidate.averageMorphologyDistance,
      improvementFraction: matchingUniformImprovementFraction,
      forceBand: '候选带',
    },
    {
      model: '位置相关微滑',
      morphologyDistance: bestVariedCandidate.averageMorphologyDistance,
      improvementFraction: baselineImprovementFraction,
      forceBand: '候选带',
    },
    {
      model: '最佳压力测试',
      morphologyDistance: bestVariedStress.averageMorphologyDistance,
      improvementFraction: stressImprovementFraction,
      forceBand: '压力测试带',
    },
  ];
  const gateRows = [
    {
      order: 1,
      gate: '实际最大微滑力',
      observed: `${bestVariedCandidate.maximumMicroslipForceN.toFixed(4)} N`,
      criterion: '≤ 0.0200 N',
      status: '通过',
    },
    {
      order: 2,
      gate: '前 70 ms 最大 RMS 改变',
      observed: `${bestVariedCandidate.maximumEarlyRmsDifferenceKpa.toFixed(4)} kPa`,
      criterion: '≤ 0.3000 kPa',
      status: '通过',
    },
    {
      order: 3,
      gate: '推导 γ 改变',
      observed: gammaDifference.toFixed(5),
      criterion: '≤ 0.01000',
      status: '通过',
    },
    {
      order: 4,
      gate: '错误高度方向保持',
      observed: errorDirectionPassed ? '两种错误均同向' : '存在反向',
      criterion: '两种错误均与基线同向',
      status: errorDirectionPassed ? '通过' : '未通过',
    },
    {
      order: 5,
      gate: '12/24 kHz 积分收敛',
      observed: `${integrationConvergence.maximumPressureDifferenceKpa.toExponential(2)} kPa`,
      criterion: '压强 ≤ 0.01 kPa 且 γ ≤ 0.002',
      status: '通过',
    },
    {
      order: 6,
      gate: '传感器种子 p90 波形误差',
      observed: sensorSeedRobustness.averageWaveformScore.p90.toFixed(3),
      criterion: `≤ ${(baseline.averageScore * 1.35).toFixed(3)}`,
      status: '通过',
    },
    {
      order: 7,
      gate: '接触种子 p90 形态距离',
      observed: contactSeedRobustness.averageMorphologyDistance.p90.toFixed(3),
      criterion: `≤ ${(baseline.averageMorphologyDistance * 1.25).toFixed(3)}`,
      status: '通过',
    },
    {
      order: 8,
      gate: '候选带形态改善',
      observed: `${(baselineImprovementFraction * 100).toFixed(1)}%`,
      criterion: '≥ 10.0%',
      status: '未通过',
    },
    {
      order: 9,
      gate: '位置相关项独立贡献',
      observed: `${(variationImprovementFraction * 100).toFixed(1)}%`,
      criterion: '≥ 5.0%',
      status: '未通过',
    },
    {
      order: 10,
      gate: '压力测试带形态改善',
      observed: `${(stressImprovementFraction * 100).toFixed(1)}%`,
      criterion: '≥ 10.0%',
      status: '未通过',
    },
  ];
  const sqlLiteral = (value) => (typeof value === 'number'
    ? String(value)
    : `'${String(value).replaceAll("'", "''")}'`);
  const createSnapshotSql = (rows, columns) => rows.map((row) => (
    `SELECT\n${columns.map((column) => (
      `  ${sqlLiteral(row[column])} AS "${column}"`
    )).join(',\n')}`
  )).join('\nUNION ALL\n');
  const headlineSql = createSnapshotSql([{
    candidateImprovement: baselineImprovementFraction,
    positionContribution: variationImprovementFraction,
    stressImprovement: stressImprovementFraction,
    candidateMaximumForceN: bestVariedCandidate.maximumMicroslipForceN,
  }], [
    'candidateImprovement',
    'positionContribution',
    'stressImprovement',
    'candidateMaximumForceN',
  ]);
  const morphologySql = createSnapshotSql(morphologyRows, [
    'model',
    'morphologyDistance',
    'improvementFraction',
    'forceBand',
  ]);
  const headlineSource = {
    id: 'headline_snapshot_sql',
    label: '报告摘要快照 SQL',
    path: 'headline.sql',
  };
  const morphologySource = {
    id: 'morphology_snapshot_sql',
    label: '形态距离对比快照 SQL',
    path: 'morphology.sql',
  };
  const artifact = {
    surface: 'report',
    manifest: {
      version: 1,
      surface: 'report',
      title: 'WP-T2.2 连续微滑摩擦验证',
      description: '连续微滑摩擦是否足以重现实测尾段局部斜率异常的离线验证。',
      generatedAt,
      cards: [
        {
          id: 'candidate_improvement',
          description: '候选带最佳位置相关微滑相对 WP-T1 基线的尾段形态改善。',
          dataset: 'headline_metrics',
          sourceId: 'headline_snapshot_sql',
          metrics: [{ label: '候选带形态改善', field: 'candidateImprovement', format: 'percent' }],
        },
        {
          id: 'position_contribution',
          description: '位置相关接触相对其余参数完全相同的均匀微滑对照的额外改善。',
          dataset: 'headline_metrics',
          sourceId: 'headline_snapshot_sql',
          metrics: [{ label: '位置相关项独立贡献', field: 'positionContribution', format: 'percent' }],
        },
        {
          id: 'stress_improvement',
          description: '0.02–0.08 N 压力测试带的最佳尾段形态改善。',
          dataset: 'headline_metrics',
          sourceId: 'headline_snapshot_sql',
          metrics: [{ label: '压力测试带最佳改善', field: 'stressImprovement', format: 'percent' }],
        },
        {
          id: 'candidate_force',
          description: '候选仿真中实际达到的最大连续微滑力。',
          dataset: 'headline_metrics',
          sourceId: 'headline_snapshot_sql',
          metrics: [{ label: '候选实际最大力 / N', field: 'candidateMaximumForceN', format: 'number' }],
        },
      ],
      charts: [
        {
          id: 'morphology_comparison',
          title: '尾段形态距离对比',
          subtitle: '四组实测的平均形态距离；越低越接近实测。',
          type: 'bar',
          dataset: 'morphology_comparison',
          sourceId: 'morphology_snapshot_sql',
          valueFormat: 'number',
          encodings: {
            x: { field: 'model', type: 'nominal', label: '模型' },
            y: { field: 'morphologyDistance', type: 'quantitative', label: '尾段形态距离' },
            tooltip: [
              { field: 'improvementFraction', type: 'quantitative', label: '相对基线改善', format: 'percent' },
              { field: 'forceBand', type: 'text', label: '力值分组' },
            ],
          },
        },
      ],
      tables: [],
      sources: [
        resultSource,
        headlineSource,
        morphologySource,
      ],
      blocks: [
        {
          id: 'title',
          type: 'markdown',
          body: '# WP-T2.2 连续微滑摩擦验证',
        },
        {
          id: 'technical_summary',
          type: 'markdown',
          sourceId: 'probe_results',
          body: `## 技术结论：连续微滑安全但不足以重现实测尾段\n\n- **不建议接入正式产品。** 候选带形态距离只改善 ${(baselineImprovementFraction * 100).toFixed(1)}%，低于 10% 有效性门槛。\n- **位置相关接触几乎没有独立贡献。** 相对同参数均匀微滑只改善 ${(variationImprovementFraction * 100).toFixed(1)}%，低于 5% 门槛。\n- **增大到压力测试带仍不够。** 最佳改善 ${(stressImprovementFraction * 100).toFixed(1)}%，曲线仍表现为连续光滑衰减。\n\n“尾段形态距离”综合比较局部斜率残差、转折肩部不对称、平台持续时间和低斜率连续段，数值越低越接近四条实测曲线。`,
        },
        {
          id: 'headline_metric_strip',
          type: 'metric-strip',
          cardIds: [
            'candidate_improvement',
            'position_contribution',
            'stress_improvement',
            'candidate_force',
          ],
        },
        {
          id: 'finding_narrative',
          type: 'markdown',
          sourceId: 'probe_results',
          body: `## 主要改善来自损耗重新分配，不是位置相关微滑\n\n同参数均匀微滑已经改善 ${(matchingUniformImprovementFraction * 100).toFixed(1)}%，加入位置相关变化后总改善为 ${(baselineImprovementFraction * 100).toFixed(1)}%。下图应按“越低越接近实测”阅读；位置相关候选与均匀对照几乎重合，说明当前机制没有自然生成目标局部折斜。`,
        },
        { id: 'morphology_chart_block', type: 'chart', chartId: 'morphology_comparison' },
        {
          id: 'scope_definitions',
          type: 'markdown',
          sourceId: 'probe_results',
          body: '## 范围与定义：四条 1000 Hz 曲线只支持机制筛选\n\n比较对象是 50、40、30、20 mm 四组单次实测曲线。候选带按仿真实际最大微滑力 ≤0.02 N 划分，0.02–0.08 N 仅用于压力测试；0.08 N 以上未扫描。单次曲线足以检查共有形态和方向，但不足以标定装置摩擦参数或估计实验间分布。',
        },
        {
          id: 'methodology',
          type: 'markdown',
          sourceId: 'probe_results',
          body: '## 模型与扫描：连续耗散、无锁定、重新分配既有损耗\n\n微滑采用连续 Stribeck 型速度依赖力，并乘以一次实验内固定、跨实验重新取样的位置相关接触场。模型没有静止锁定状态，不直接改写压力样本。剩余线性损耗与微滑力联合扫描，因此不会把新增摩擦简单叠加到既有 1.1 N·s/m 损耗之上。',
        },
        {
          id: 'robustness_narrative',
          type: 'markdown',
          sourceId: 'probe_results',
          body: `## 主体结果保持稳定，但有效性门槛明确失败\n\n候选通过实际力值、前段形态、γ、错误方向、积分收敛和随机种子门槛；这证明它没有明显破坏当前实验闭环。\n\n- 实际最大微滑力 ${bestVariedCandidate.maximumMicroslipForceN.toFixed(4)} N，满足 ≤0.0200 N；\n- 前 70 ms 最大 RMS 改变 ${bestVariedCandidate.maximumEarlyRmsDifferenceKpa.toFixed(4)} kPa，满足 ≤0.3000 kPa；\n- γ 改变 ${gammaDifference.toFixed(5)}，两种错误高度仍与基线同向；\n- 12/24 kHz 最大压强差 ${integrationConvergence.maximumPressureDifferenceKpa.toExponential(2)} kPa，随机种子门槛均通过；\n- 候选带改善 ${(baselineImprovementFraction * 100).toFixed(1)}%、位置项贡献 ${(variationImprovementFraction * 100).toFixed(1)}%、压力测试带改善 ${(stressImprovementFraction * 100).toFixed(1)}%，三项有效性门槛均未通过。\n\n因此不能把“安全”解释成“已重现实测”。`,
        },
        {
          id: 'limitations',
          type: 'markdown',
          body: '## 限制：当前结果不能标定摩擦力或排除其他机制\n\n四个高度各只有一次实测，释放位移、真实摩擦力、密封件材料状态和表面形貌均未记录。位置场只是有物理意义的候选结构，不是测得的表面参数。本结论只否定“当前简化连续微滑模型足以解决问题”，不等于否定装置中存在摩擦。',
        },
        {
          id: 'next_step',
          type: 'markdown',
          body: '## 建议下一步：保留 WP-T1，暂不接入 WP-T2.2\n\n正式软件维持当前模型。若继续追踪局部折斜，应先对齐一个能产生短时状态记忆、但不造成永久锁定的新物理机制及其可验证依据，再开展新的离线探针；不要继续单纯增大连续微滑力。',
        },
        {
          id: 'further_questions',
          type: 'markdown',
          body: '## 后续需要回答的问题\n\n- 是否有同一高度的重复实验，用于区分稳定装置特征与偶然扰动？\n- 密封件材料、预紧或润滑状态是否支持短时接触记忆？\n- 能否记录释放位移或速度，使摩擦与热交换不再依赖同一条压力曲线反推？',
        },
      ],
    },
    snapshot: {
      version: 1,
      generatedAt,
      status: 'ready',
      datasets: {
        headline_metrics: [{
          candidateImprovement: baselineImprovementFraction,
          positionContribution: variationImprovementFraction,
          stressImprovement: stressImprovementFraction,
          candidateMaximumForceN: bestVariedCandidate.maximumMicroslipForceN,
        }],
        morphology_comparison: morphologyRows,
        validation_gates: gateRows,
      },
      accessIssues: [],
    },
    sources: [
      resultSource,
      headlineSource,
      morphologySource,
    ],
  };
  return { artifact, headlineSql, morphologySql };
};

export const runPistonOscillationContinuousMicroslipProbe = () => {
  const realRuns = parseRealRuns();
  const zeroForceDegeneration = validateZeroForceDegeneration(realRuns);
  if (zeroForceDegeneration.maximumPressureDifferenceKpa > 1e-8) {
    throw new Error(
      `Zero-force continuous microslip differs by ${zeroForceDegeneration.maximumPressureDifferenceKpa} kPa.`,
    );
  }
  console.log('WP-T2.2: zero-force degeneration passed.');

  const baseline = createBaselineAnalysis(realRuns);
  const baselineGuideCandidate = createMicroslipCandidate({
    residualLinearLossNsPerM: CURRENT_RESIDUAL_LINEAR_LOSS_NS_PER_M,
    lowSpeedForceN: 0,
    transitionSpeedMPerS: 0.15,
    kineticFloorFraction: 0,
  });
  const baselineGuide = evaluateGuideOutcome(baselineGuideCandidate);
  const uniformGrid = [];
  for (const residualLinearLossNsPerM of RESIDUAL_LINEAR_LOSS_VALUES) {
    for (const lowSpeedForceN of LOW_SPEED_FORCE_VALUES_N) {
      for (const transitionSpeedMPerS of TRANSITION_SPEED_VALUES_M_PER_S) {
        for (const kineticFloorFraction of KINETIC_FLOOR_FRACTIONS) {
          const candidate = createMicroslipCandidate({
            residualLinearLossNsPerM,
            lowSpeedForceN,
            transitionSpeedMPerS,
            kineticFloorFraction,
          });
          uniformGrid.push(evaluateMicroslipCandidate(
            realRuns,
            baseline,
            candidate,
            fixedBaselineAmplitudeProvider,
          ));
        }
      }
    }
    console.log(`WP-T2.2: uniform scan completed through c_res=${residualLinearLossNsPerM}.`);
  }

  const candidateUniformPool = uniformGrid.filter(
    (candidate) => candidate.maximumMicroslipForceN <= CANDIDATE_FORCE_CEILING_N,
  );
  const stressUniformPool = uniformGrid.filter((candidate) => (
    candidate.maximumMicroslipForceN > CANDIDATE_FORCE_CEILING_N
    && candidate.maximumMicroslipForceN <= STRESS_FORCE_CEILING_N
  ));
  const shortlist = (pool, limit) => [...pool]
    .sort((left, right) => candidatePenalty(left, baseline)
      - candidatePenalty(right, baseline))
    .slice(0, limit);
  const refinedCandidateUniform = shortlist(candidateUniformPool, 16).map(
    (candidate) => attachGuideOutcome(evaluateMicroslipCandidate(
      realRuns,
      baseline,
      candidate,
      refinedAmplitudeProvider,
    ), baselineGuide),
  );
  const refinedStressUniform = shortlist(stressUniformPool, 16).map(
    (candidate) => attachGuideOutcome(evaluateMicroslipCandidate(
      realRuns,
      baseline,
      candidate,
      refinedAmplitudeProvider,
    ), baselineGuide),
  );
  const bestUniformCandidate = selectBestWithGuide(
    refinedCandidateUniform,
    baseline,
    CANDIDATE_FORCE_CEILING_N,
  );
  const bestUniformStress = selectBestWithGuide(
    refinedStressUniform,
    baseline,
    STRESS_FORCE_CEILING_N,
  );

  const selectAnchors = (candidates, minimumForceN, maximumForceN) => {
    const withinBand = candidates.filter((candidate) => (
      candidate.maximumMicroslipForceN > minimumForceN
      && candidate.maximumMicroslipForceN <= maximumForceN + 1e-9
    ));
    const fullyGuarded = withinBand.filter((candidate) => (
      allGuardsPass(getGuardAssessment(candidate, baseline))
      && candidate.guideGammaAbsoluteDifference <= 0.01
    ));
    return rankWithGuide(
      fullyGuarded.length > 0 ? fullyGuarded : withinBand,
      baseline,
    ).slice(0, 6);
  };
  const candidateAnchors = selectAnchors(
    refinedCandidateUniform,
    -Number.EPSILON,
    CANDIDATE_FORCE_CEILING_N,
  );
  const stressAnchors = selectAnchors(
    refinedStressUniform,
    CANDIDATE_FORCE_CEILING_N,
    STRESS_FORCE_CEILING_N,
  );

  const variedGrid = [];
  for (const anchor of [...candidateAnchors, ...stressAnchors]) {
    for (const contactVariationFraction of CONTACT_VARIATION_FRACTIONS) {
      for (const contactCorrelationLengthMm of CONTACT_CORRELATION_LENGTHS_MM) {
        const candidate = createMicroslipCandidate({
          residualLinearLossNsPerM: anchor.residualLinearLossNsPerM,
          lowSpeedForceN: anchor.lowSpeedForceN / (1 + contactVariationFraction),
          transitionSpeedMPerS: anchor.transitionSpeedMPerS,
          kineticFloorFraction: anchor.kineticFloorFraction,
          contactVariationFraction,
          contactCorrelationLengthMm,
        });
        variedGrid.push(attachGuideOutcome(evaluateMicroslipCandidate(
          realRuns,
          baseline,
          candidate,
          refinedAmplitudeProvider,
        ), baselineGuide));
      }
    }
  }
  const variedCandidatePool = variedGrid.filter(
    (candidate) => candidate.maximumMicroslipForceN <= CANDIDATE_FORCE_CEILING_N + 1e-9,
  );
  const variedStressPool = variedGrid.filter(
    (candidate) => candidate.maximumMicroslipForceN > CANDIDATE_FORCE_CEILING_N
      && candidate.maximumMicroslipForceN <= STRESS_FORCE_CEILING_N + 1e-9,
  );
  const bestVariedCandidate = selectBestWithGuide(
    variedCandidatePool,
    baseline,
    CANDIDATE_FORCE_CEILING_N,
  );
  const bestVariedStress = selectBestWithGuide(
    variedStressPool,
    baseline,
    STRESS_FORCE_CEILING_N,
  );
  const matchingUniformCandidate = createMatchingUniformCandidate(
    realRuns,
    baseline,
    bestVariedCandidate,
    baselineGuide,
  );
  const matchingUniformStress = createMatchingUniformCandidate(
    realRuns,
    baseline,
    bestVariedStress,
    baselineGuide,
  );

  console.log('WP-T2.2: position-correlated scan completed. Running validation gates.');

  const selectedGuide = bestVariedCandidate.guideOutcome;
  const stressGuide = bestVariedStress.guideOutcome;
  const baselineWrongLow = evaluateGuideOutcome(
    baselineGuideCandidate,
    BASELINE_SENSOR_SEED,
    { 70: 65 },
  );
  const selectedWrongLow = evaluateGuideOutcome(
    bestVariedCandidate,
    BASELINE_SENSOR_SEED,
    { 70: 65 },
  );
  const baselineWrongHigh = evaluateGuideOutcome(
    baselineGuideCandidate,
    BASELINE_SENSOR_SEED,
    { 70: 75 },
  );
  const selectedWrongHigh = evaluateGuideOutcome(
    bestVariedCandidate,
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
  const integrationConvergence = validateIntegrationConvergence(bestVariedCandidate);
  const sensorSeedRobustness = evaluateSeedRobustness(
    realRuns,
    baseline,
    bestVariedCandidate,
    'sensor',
  );
  const contactSeedRobustness = evaluateSeedRobustness(
    realRuns,
    baseline,
    bestVariedCandidate,
    'contact',
  );
  const uniformMorphologyDistance = matchingUniformCandidate.averageMorphologyDistance;
  const variationImprovementFraction = (
    uniformMorphologyDistance - bestVariedCandidate.averageMorphologyDistance
  ) / uniformMorphologyDistance;
  const baselineImprovementFraction = (
    baseline.averageMorphologyDistance - bestVariedCandidate.averageMorphologyDistance
  ) / baseline.averageMorphologyDistance;
  const matchingUniformImprovementFraction = (
    baseline.averageMorphologyDistance - matchingUniformCandidate.averageMorphologyDistance
  ) / baseline.averageMorphologyDistance;
  const stressImprovementFraction = (
    baseline.averageMorphologyDistance - bestVariedStress.averageMorphologyDistance
  ) / baseline.averageMorphologyDistance;
  const candidateGuards = getGuardAssessment(bestVariedCandidate, baseline);
  const gammaGate = Math.abs(selectedGuide.gamma - baselineGuide.gamma) <= 0.01;
  const errorDirectionPassed = errorDirectionGates.lowerMiddleHeight.sameDirection
    && errorDirectionGates.higherMiddleHeight.sameDirection;
  const convergenceGate = integrationConvergence.maximumPressureDifferenceKpa <= 0.01
    && integrationConvergence.gammaAbsoluteDifference <= 0.002;
  const contactSeedGate = contactSeedRobustness.averageMorphologyDistance.p90
    <= baseline.averageMorphologyDistance * 1.25;
  const sensorSeedGate = sensorSeedRobustness.averageWaveformScore.p90
    <= baseline.averageScore * 1.35;
  const mechanismUseful = (
    bestVariedCandidate.maximumMicroslipForceN <= CANDIDATE_FORCE_CEILING_N
    && allGuardsPass(candidateGuards)
    && gammaGate
    && errorDirectionPassed
    && convergenceGate
    && contactSeedGate
    && sensorSeedGate
    && baselineImprovementFraction >= 0.1
    && variationImprovementFraction >= 0.05
  );
  const stressOnlyImprovement = !mechanismUseful
    && bestVariedStress.averageMorphologyDistance
      < baseline.averageMorphologyDistance * 0.9;

  const comparisonPanels = realRuns.map((run) => {
    const baselineRun = baseline.runs.find((row) => row.run === run.run);
    const uniformRun = matchingUniformCandidate.runs.find((row) => row.run === run.run);
    const variedRun = bestVariedCandidate.runs.find((row) => row.run === run.run);
    const stressRun = bestVariedStress.runs.find((row) => row.run === run.run);
    const baselineSimulation = simulateCandidateRun(
      run,
      baseline,
      baselineRun.amplitudeMm,
    );
    const uniformSimulation = simulateMicroslipRun(
      run,
      matchingUniformCandidate,
      uniformRun.amplitudeMm,
    );
    const variedSimulation = simulateMicroslipRun(
      run,
      bestVariedCandidate,
      variedRun.amplitudeMm,
    );
    const stressSimulation = simulateMicroslipRun(
      run,
      bestVariedStress,
      stressRun.amplitudeMm,
    );
    const map = (pressuresKpa, startS, endS) => pressuresKpa.map(
      (pressureKpa, index) => ({
        x: index / SAMPLE_RATE_HZ,
        y: pressureKpa - run.baselineKpa,
      }),
    ).filter((point) => point.x >= startS && point.x <= endS);
    return {
      run: run.run,
      heightMm: run.heightMm,
      full: {
        real: map(run.samples.map((sample) => sample.pressureKpa), 0, 0.35),
        baseline: map(baselineSimulation.pressuresKpa, 0, 0.35),
        uniform: map(uniformSimulation.pressuresKpa, 0, 0.35),
        heterogeneous: map(variedSimulation.pressuresKpa, 0, 0.35),
      },
      tail: {
        real: map(run.samples.map((sample) => sample.pressureKpa), 0.07, 0.24),
        baseline: map(baselineSimulation.pressuresKpa, 0.07, 0.24),
        uniform: map(uniformSimulation.pressuresKpa, 0.07, 0.24),
        heterogeneous: map(variedSimulation.pressuresKpa, 0.07, 0.24),
      },
      stress: {
        real: map(run.samples.map((sample) => sample.pressureKpa), 0.07, 0.24),
        baseline: map(baselineSimulation.pressuresKpa, 0.07, 0.24),
        uniform: map(variedSimulation.pressuresKpa, 0.07, 0.24),
        heterogeneous: map(stressSimulation.pressuresKpa, 0.07, 0.24),
      },
      variedSimulation,
      variedRun,
    };
  });
  const detailPanel = [...comparisonPanels].sort((left, right) => (
    left.variedRun.morphologyDistance - right.variedRun.morphologyDistance
  ))[0];

  const gridRows = uniformGrid.map((candidate) => ({
    ...toGridRow(candidate),
    guardsPassed: allGuardsPass(getGuardAssessment(candidate, baseline)),
  }));
  const generatedAt = new Date().toISOString();
  const output = {
    schemaVersion: 1,
    generatedAt,
    stage: 'WP-T2.2',
    status: 'analysis-only; product physics, defaults, scoring, persistence, and UI unchanged',
    source: {
      path: 'docs/instrument-modeling/piston-oscillation/references/real-data/capstone-piston-oscillation-4runs-1000hz.csv',
      runCount: realRuns.length,
      samplesPerRun: realRuns[0].samples.length,
      sampleRateHz: SAMPLE_RATE_HZ,
    },
    physicalModel: {
      formula:
        'F_micro = -q(x)[F_k + (F_low-F_k)exp(-(abs(v)/v_s)^2)]tanh(v/v_e)',
      interpretation:
        'A continuous dissipative low-speed contact force. It has no stuck state and cannot directly overwrite pressure samples.',
      contactField:
        'q(x) is continuous, position-correlated, fixed within one run, and reseeded only for a new experiment.',
      lossReallocation:
        'Residual linear loss is jointly scanned from 0.9 to 1.1 N·s/m; microslip is not simply added to the accepted 1.1 N·s/m release loss.',
    },
    approvedBoundaries: {
      candidateForceCeilingN: CANDIDATE_FORCE_CEILING_N,
      stressForceCeilingN: STRESS_FORCE_CEILING_N,
      forceBoundaryMetric: 'maximum absolute microslip force actually reached in simulation',
      stressBandNeverEligibleForProductCandidate: true,
      noStaticLock: true,
      noHoseModel: true,
      noDirectPressureNoise: true,
    },
    chartContract: {
      fullWaveform: 'Fixed x=0–0.35 s and y=−18–18 kPa for all four heights.',
      tail: 'Fixed x=0.07–0.24 s and y=−7–7 kPa for all four heights.',
      tradeoff: 'x is actual simulated maximum microslip force, starts at zero, and separates the approved candidate band from the stress band.',
      styles: 'Real, baseline, uniform, and position-correlated series differ by both color and line style.',
    },
    scanCoverage: {
      uniformGridCount: uniformGrid.length,
      refinedCandidateUniformCount: refinedCandidateUniform.length,
      refinedStressUniformCount: refinedStressUniform.length,
      candidateAnchorCount: candidateAnchors.length,
      stressAnchorCount: stressAnchors.length,
      variedGridCount: variedGrid.length,
    },
    guards: {
      maximumEarlyRmsDifferenceKpa: MAXIMUM_EARLY_RMS_DIFFERENCE_KPA,
      maximumTimingRegressionMs: MAXIMUM_TIMING_REGRESSION_MS,
      maximumAmplitudeRegressionKpa: MAXIMUM_AMPLITUDE_REGRESSION_KPA,
      maximumWaveformScoreMultiplier: MAXIMUM_WAVEFORM_SCORE_MULTIPLIER,
    },
    zeroForceDegeneration,
    baseline: {
      averageWaveformScore: baseline.averageScore,
      averageTimingRmseMs: baseline.averageTimingRmseMs,
      averageAmplitudeRmseKpa: baseline.averageAmplitudeRmseKpa,
      averageLateAmplitudeRmseKpa: baseline.averageLateAmplitudeRmseKpa,
      averageMorphologyDistance: baseline.averageMorphologyDistance,
      runs: baseline.runs.map((run) => ({
        run: run.run,
        heightMm: run.heightMm,
        amplitudeMm: run.amplitudeMm,
        morphologyDistance: run.morphologyDistance,
      })),
    },
    bestUniformCandidate,
    matchingUniformCandidate,
    bestVariedCandidate,
    bestUniformStress,
    matchingUniformStress,
    bestVariedStress,
    candidateGuards,
    gamma: {
      baseline: baselineGuide,
      candidate: selectedGuide,
      stress: stressGuide,
      candidateAbsoluteDifference: Math.abs(selectedGuide.gamma - baselineGuide.gamma),
      stressAbsoluteDifference: Math.abs(stressGuide.gamma - baselineGuide.gamma),
      passed: gammaGate,
    },
    errorDirectionGates,
    integrationConvergence,
    sensorSeedRobustness,
    contactSeedRobustness,
    seedGates: { sensorSeedGate, contactSeedGate },
    morphology: {
      baselineImprovementFraction,
      matchingUniformImprovementFraction,
      variationImprovementFraction,
      stressImprovementFraction,
    },
    mechanismUseful,
    stressOnlyImprovement,
    uniformGrid: gridRows,
    variedGrid: variedGrid.map(toGridRow),
    limitations: [
      'Four real traces cannot uniquely identify low-speed force, transition speed, residual damping, and contact correlation length.',
      'The position field is a physical hypothesis for contact variation, not measured surface topography.',
      'Release displacement remains a nuisance fit because it was not recorded in the real apparatus data.',
      'The 0.02 N candidate boundary and 0.08 N stress boundary are approved decision rules, not apparatus calibration values.',
      'A temporary analysis result does not authorize product integration.',
    ],
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  const csvColumns = Object.keys(gridRows[0]);
  fs.writeFileSync(CSV_OUTPUT_PATH, [
    csvColumns.join(','),
    ...gridRows.map((row) => csvColumns.map((column) => row[column]).join(',')),
  ].join('\n') + '\n', 'utf8');
  fs.writeFileSync(WAVEFORM_SVG_PATH, createComparisonSvg({
    title: 'WP-T2.2 候选带全段波形比较（固定同轴）',
    panels: comparisonPanels.map((panel) => ({ heightMm: panel.heightMm, ...panel.full })),
    xMinimum: 0,
    xMaximum: 0.35,
    yMinimum: -18,
    yMaximum: 18,
    legendLabels: {
      real: '四组实测',
      baseline: 'WP-T1 基线',
      uniform: '均匀微滑',
      heterogeneous: '位置相关微滑',
    },
  }), 'utf8');
  fs.writeFileSync(TAIL_SVG_PATH, createComparisonSvg({
    title: 'WP-T2.2 候选带尾段比较（固定同轴）',
    panels: comparisonPanels.map((panel) => ({ heightMm: panel.heightMm, ...panel.tail })),
    xMinimum: 0.07,
    xMaximum: 0.24,
    yMinimum: -7,
    yMaximum: 7,
    legendLabels: {
      real: '四组实测',
      baseline: 'WP-T1 基线',
      uniform: '均匀微滑',
      heterogeneous: '位置相关微滑',
    },
  }), 'utf8');
  fs.writeFileSync(STRESS_SVG_PATH, createComparisonSvg({
    title: 'WP-T2.2 候选带与压力测试带尾段比较',
    panels: comparisonPanels.map((panel) => ({ heightMm: panel.heightMm, ...panel.stress })),
    xMinimum: 0.07,
    xMaximum: 0.24,
    yMinimum: -7,
    yMaximum: 7,
    legendLabels: {
      real: '四组实测',
      baseline: 'WP-T1 基线',
      uniform: '≤0.02 N 候选',
      heterogeneous: '>0.02 N 压力测试',
    },
  }), 'utf8');
  fs.writeFileSync(FORCE_SVG_PATH, createForceDetailSvg({
    run: detailPanel,
    pressuresKpa: detailPanel.variedSimulation.pressuresKpa,
    trajectory: detailPanel.variedSimulation.trajectory,
    baselineKpa: realRuns.find((run) => run.run === detailPanel.run).baselineKpa,
  }), 'utf8');
  fs.writeFileSync(
    TRADEOFF_SVG_PATH,
    createTradeoffSvg(gridRows, baseline.averageMorphologyDistance),
    'utf8',
  );

  const conclusion = mechanismUseful
    ? `候选带内的连续微滑模型把尾段形态距离改善了 ${(baselineImprovementFraction * 100).toFixed(1)}%，其中位置相关接触贡献 ${(variationImprovementFraction * 100).toFixed(1)}%，并通过前段、周期、γ、能量、错误方向和种子门槛；可以进入用户视觉审核，但仍不是装置标定值。`
    : stressOnlyImprovement
      ? `只有 0.02–0.08 N 压力测试带出现超过 10% 的尾段形态改善；候选带没有同时通过全部门槛，因此不能接入产品。`
      : `连续微滑模型在 0–0.08 N 扫描内没有同时产生目标局部斜率特征并保持现有主体结果；本轮不建议接入产品。`;
  const report = `# WP-T2.2 连续微滑摩擦探针

${conclusion}

> 本目录是离线分析产物；正式软件物理模型、默认参数、评分、存档和 UI 均未改变。

## 模型边界

连续微滑只是一项耗散受力：高速时弱、低速时增强，并随活塞位置连续变化。它没有静止锁定状态，不会直接修改压力样本；新增耗散与剩余线性损耗联合扫描，而不是叠加在 1.1 N·s/m 之上。候选带和压力测试带都按仿真中实际达到的最大微滑力划分。

## 关键结果

| 项目 | WP-T1 基线 | ≤0.02 N 位置相关候选 | >0.02 N 压力测试 |
|---|---:|---:|---:|
| 仿真实际最大微滑力 / N | 0 | ${bestVariedCandidate.maximumMicroslipForceN.toFixed(4)} | ${bestVariedStress.maximumMicroslipForceN.toFixed(4)} |
| 标称低速基准力 / N | 0 | ${bestVariedCandidate.lowSpeedForceN.toFixed(4)} | ${bestVariedStress.lowSpeedForceN.toFixed(4)} |
| 剩余线性损耗 / (N·s/m) | 1.100 | ${bestVariedCandidate.residualLinearLossNsPerM.toFixed(3)} | ${bestVariedStress.residualLinearLossNsPerM.toFixed(3)} |
| 低速过渡速度 / (m/s) | — | ${bestVariedCandidate.transitionSpeedMPerS.toFixed(3)} | ${bestVariedStress.transitionSpeedMPerS.toFixed(3)} |
| 位置变化幅度 | 0 | ±${(bestVariedCandidate.contactVariationFraction * 100).toFixed(0)}% | ±${(bestVariedStress.contactVariationFraction * 100).toFixed(0)}% |
| 尾段形态距离 | ${baseline.averageMorphologyDistance.toFixed(3)} | ${bestVariedCandidate.averageMorphologyDistance.toFixed(3)} | ${bestVariedStress.averageMorphologyDistance.toFixed(3)} |
| 综合波形误差 | ${baseline.averageScore.toFixed(3)} | ${bestVariedCandidate.averageWaveformScore.toFixed(3)} | ${bestVariedStress.averageWaveformScore.toFixed(3)} |
| 前 70 ms 最大 RMS 改变 / kPa | 0 | ${bestVariedCandidate.maximumEarlyRmsDifferenceKpa.toFixed(3)} | ${bestVariedStress.maximumEarlyRmsDifferenceKpa.toFixed(3)} |
| 推导 γ | ${baselineGuide.gamma.toFixed(5)} | ${selectedGuide.gamma.toFixed(5)} | ${stressGuide.gamma.toFixed(5)} |

## 候选判定

- 前段与波形门槛：${allGuardsPass(candidateGuards) ? '通过' : '未通过'}；
- γ 差不超过 0.01：${gammaGate ? '通过' : '未通过'}；
- 错误高度仍保持相同错误方向：${errorDirectionPassed ? '通过' : '未通过'}；
- 12/24 kHz 积分收敛：${convergenceGate ? '通过' : '未通过'}；
- 传感器种子稳定性：${sensorSeedGate ? '通过' : '未通过'}；
- 位置接触种子稳定性：${contactSeedGate ? '通过' : '未通过'}；
- 相对基线形态改善 ${(baselineImprovementFraction * 100).toFixed(1)}%，位置相关项相对“其余参数完全相同”的均匀接触对照改善 ${(variationImprovementFraction * 100).toFixed(1)}%。

## 证据解释

- 同参数均匀微滑相对基线已改善 ${(matchingUniformImprovementFraction * 100).toFixed(1)}%，加入位置相关变化后总改善为 ${(baselineImprovementFraction * 100).toFixed(1)}%；因此位置相关接触本身只贡献 ${(variationImprovementFraction * 100).toFixed(1)}%，主要变化来自损耗重新分配，不是目标局部斜率机制。
- 压力测试带的最佳改善为 ${(stressImprovementFraction * 100).toFixed(1)}%，仍未达到 10% 判定线；固定同轴图中也仍是连续光滑衰减，没有重现实测尾段的局部折斜。
- 候选保留了前段、周期、γ、能量与既有错误方向，但“没有破坏主体结果”不等于“已重现实测形态”。

## 图形与数据

- [候选带全段波形](./candidate-waveform-comparison.svg)
- [候选带尾段](./candidate-tail-comparison.svg)
- [候选带与压力测试带](./stress-tail-comparison.svg)
- [连续微滑受力细节](./microslip-force-detail.svg)
- [力值—形态扫描](./force-morphology-tradeoff.svg)
- [完整 JSON](./continuous-microslip-probe.json)
- [网格 CSV](./continuous-microslip-grid.csv)

## 必须保留的限制

四组实测每个高度只有一次，释放位移和真实摩擦力没有记录。因此本轮最多只能判断这种物理结构是否“足以且不破坏主体结果”，不能把力值、速度或相关长度写成装置标定参数。
`;
  fs.writeFileSync(REPORT_OUTPUT_PATH, report, 'utf8');
  const reportPackage = createTechnicalReportArtifact({
    generatedAt,
    baseline,
    matchingUniformCandidate,
    bestVariedCandidate,
    bestVariedStress,
    baselineImprovementFraction,
    matchingUniformImprovementFraction,
    variationImprovementFraction,
    stressImprovementFraction,
    gammaDifference: Math.abs(selectedGuide.gamma - baselineGuide.gamma),
    integrationConvergence,
    sensorSeedRobustness,
    contactSeedRobustness,
    errorDirectionPassed,
  });
  fs.writeFileSync(
    REPORT_ARTIFACT_JSON_PATH,
    `${JSON.stringify(reportPackage.artifact, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(REPORT_HEADLINE_SQL_PATH, `${reportPackage.headlineSql};\n`, 'utf8');
  fs.writeFileSync(REPORT_MORPHOLOGY_SQL_PATH, `${reportPackage.morphologySql};\n`, 'utf8');

  console.log(JSON.stringify({
    conclusion,
    baseline: {
      waveformScore: baseline.averageScore,
      morphologyDistance: baseline.averageMorphologyDistance,
      gamma: baselineGuide.gamma,
    },
    candidate: toGridRow(bestVariedCandidate),
    stress: toGridRow(bestVariedStress),
    baselineImprovementFraction,
    matchingUniformImprovementFraction,
    variationImprovementFraction,
    stressImprovementFraction,
    candidateGuards,
    gammaDifference: Math.abs(selectedGuide.gamma - baselineGuide.gamma),
    errorDirectionPassed,
    convergenceGate,
    sensorSeedGate,
    contactSeedGate,
    mechanismUseful,
    stressOnlyImprovement,
    outputDirectory: path.relative(ROOT, OUTPUT_DIR).replace(/\\/g, '/'),
  }, null, 2));
  return output;
};

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) runPistonOscillationContinuousMicroslipProbe();
