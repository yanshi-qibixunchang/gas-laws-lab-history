import assert from 'node:assert/strict';
import {
  getPistonOscillationSettlingStateAtProgress,
  type PistonOscillationTrajectory,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG,
  PISTON_OSCILLATION_RELEASE_ASYMMETRY_MODEL_VERSION,
  createPistonOscillationReleaseAsymmetryProfile,
  getPistonOscillationReleaseAsymmetryExtraLinearLossNsPerM,
  getPistonOscillationReleaseAsymmetrySeverity,
  normalizePistonOscillationReleaseAsymmetryConfig,
} from '../../src/domain/pistonOscillation/pistonOscillationReleaseAsymmetryModel.ts';
import {
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
} from '../../src/domain/pistonOscillation/pistonOscillationEquivalentLossModel.ts';

assert.equal(
  PISTON_OSCILLATION_RELEASE_ASYMMETRY_MODEL_VERSION,
  'piston-oscillation-release-asymmetry-v1',
);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.neutralReleaseGapS,
  0.06,
);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.saturatedReleaseGapS,
  0.15,
);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG
    .peakExtraLinearLossNsPerM,
  3,
);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.alignmentTimePeriods,
  1,
);

for (const gapS of [null, 0, 0.04, 0.06]) {
  assert.equal(getPistonOscillationReleaseAsymmetrySeverity(gapS), 0);
}
assert.ok(
  Math.abs(getPistonOscillationReleaseAsymmetrySeverity(0.09) - 7 / 27)
    < 1e-12,
);
assert.ok(
  Math.abs(getPistonOscillationReleaseAsymmetrySeverity(-0.12) - 20 / 27)
    < 1e-12,
);
for (const gapS of [0.15, -0.25]) {
  assert.equal(getPistonOscillationReleaseAsymmetrySeverity(gapS), 1);
}

const naturalPeriodS = 0.04;
const severeProfile = createPistonOscillationReleaseAsymmetryProfile({
  signedReleaseGapS: -0.15,
}, naturalPeriodS);
assert.equal(severeProfile.absoluteReleaseGapS, 0.15);
assert.equal(severeProfile.severity, 1);
assert.equal(severeProfile.alignmentTimeS, naturalPeriodS);
assert.equal(
  getPistonOscillationReleaseAsymmetryExtraLinearLossNsPerM(severeProfile, 0),
  3,
);
assert.ok(
  Math.abs(
    getPistonOscillationReleaseAsymmetryExtraLinearLossNsPerM(
      severeProfile,
      naturalPeriodS,
    ) - 3 / Math.E,
  ) < 1e-12,
);
assert.ok(
  Math.abs(
    getPistonOscillationReleaseAsymmetryExtraLinearLossNsPerM(
      severeProfile,
      naturalPeriodS * 3,
    ) - 3 / Math.E ** 3,
  ) < 1e-12,
);
assert.throws(
  () => normalizePistonOscillationReleaseAsymmetryConfig({
    neutralReleaseGapS: 0.15,
    saturatedReleaseGapS: 0.15,
  }),
  /must be greater/,
);
assert.throws(
  () => getPistonOscillationReleaseAsymmetrySeverity(Number.NaN),
  /must be finite or null/,
);

const loadedState = getPistonOscillationSettlingStateAtProgress(80, 1, {
  linearDampingNsPerM: PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
});
const pressedState = advancePistonOscillationPrescribedThermodynamicState({
  referenceState: loadedState,
  pistonHeightMm: 70,
  elapsedS: 0.25,
  physicsConfig: {
    linearDampingNsPerM: PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  },
});
const oneHandHeldState = advancePistonOscillationPrescribedThermodynamicState({
  referenceState: pressedState,
  pistonHeightMm: pressedState.pistonHeightM * 1_000,
  velocityMmPerS: 0,
  elapsedS: 0.15,
  physicsConfig: {
    linearDampingNsPerM: PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  },
});
assert.equal(oneHandHeldState.pistonHeightM, pressedState.pistonHeightM);
assert.equal(oneHandHeldState.velocityMPerS, 0);
assert.ok(
  oneHandHeldState.pressurePa < pressedState.pressurePa,
  'one-hand waiting should retain fixed volume while heat flow continues',
);

const initialDisplacementMm = (
  oneHandHeldState.pistonHeightM - loadedState.pistonHeightM
) * 1_000;
const releaseInput = {
  lockedHeightMm: 80,
  initialDisplacementMm,
  initialVelocityMmPerS: 0,
  referenceThermodynamicState: oneHandHeldState,
};
const physicsConfig = {
  linearDampingNsPerM: PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  sensorSampleRateHz: 1_000,
  trajectoryDurationS: 0.8,
};
const baseline = simulatePistonOscillationThermalRelease(
  releaseInput,
  physicsConfig,
);
const neutralGap = simulatePistonOscillationThermalRelease({
  ...releaseInput,
  releaseAsymmetry: { signedReleaseGapS: 0.06 },
}, physicsConfig);
const severeGap = simulatePistonOscillationThermalRelease({
  ...releaseInput,
  releaseAsymmetry: { signedReleaseGapS: -0.15 },
}, physicsConfig);

assert.deepEqual(
  neutralGap.samples,
  baseline.samples,
  'a release gap at the accepted neutral boundary must not alter the trajectory',
);
assert.equal(
  severeGap.config.linearDampingNsPerM,
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  'the transient side-contact term must not rewrite the accepted base loss',
);

interface PressureExtremum {
  type: 'peak' | 'trough';
  timeS: number;
  pressurePa: number;
}

const findPressureExtrema = (
  trajectory: PistonOscillationTrajectory,
): PressureExtremum[] => {
  const extrema: PressureExtremum[] = [];
  const refineExtremum = (
    previousPressurePa: number,
    currentTimeS: number,
    currentPressurePa: number,
    nextTimeS: number,
    nextPressurePa: number,
    type: PressureExtremum['type'],
  ) => {
    const denominator = previousPressurePa
      - 2 * currentPressurePa
      + nextPressurePa;
    const rawOffset = Math.abs(denominator) <= Number.EPSILON
      ? 0
      : 0.5 * (previousPressurePa - nextPressurePa) / denominator;
    const sampleOffset = Math.min(0.5, Math.max(-0.5, rawOffset));
    return {
      type,
      timeS: currentTimeS + sampleOffset * (nextTimeS - currentTimeS),
      pressurePa: currentPressurePa
        - 0.25 * (previousPressurePa - nextPressurePa) * sampleOffset,
    };
  };
  for (let index = 1; index < trajectory.samples.length - 1; index += 1) {
    const previous = trajectory.samples[index - 1]!;
    const current = trajectory.samples[index]!;
    const next = trajectory.samples[index + 1]!;
    if (current.pressurePa > previous.pressurePa && current.pressurePa >= next.pressurePa) {
      extrema.push(refineExtremum(
        previous.pressurePa,
        current.timeS,
        current.pressurePa,
        next.timeS,
        next.pressurePa,
        'peak',
      ));
    } else if (
      current.pressurePa < previous.pressurePa
      && current.pressurePa <= next.pressurePa
    ) {
      extrema.push(refineExtremum(
        previous.pressurePa,
        current.timeS,
        current.pressurePa,
        next.timeS,
        next.pressurePa,
        'trough',
      ));
    }
  }
  return extrema;
};

const baselineExtrema = findPressureExtrema(baseline);
const severeExtrema = findPressureExtrema(severeGap);
const baselineTroughs = baselineExtrema.filter(({ type }) => type === 'trough');
const severeTroughs = severeExtrema.filter(({ type }) => type === 'trough');
const baselinePeaks = baselineExtrema.filter(({ type }) => type === 'peak');
const severePeaks = severeExtrema.filter(({ type }) => type === 'peak');
assert.ok(baselineTroughs.length >= 9 && severeTroughs.length >= 9);
assert.ok(baselinePeaks.length >= 9 && severePeaks.length >= 9);

const equilibriumPressurePa = baseline.equilibrium.equilibriumPressurePa;
const troughAmplitude = (extremum: PressureExtremum) => (
  equilibriumPressurePa - extremum.pressurePa
);
const peakAmplitude = (extremum: PressureExtremum) => (
  extremum.pressurePa - equilibriumPressurePa
);
assert.ok(
  troughAmplitude(severeTroughs[0]!) < troughAmplitude(baselineTroughs[0]!),
  'a severe release mismatch must reduce the first downward excursion',
);
assert.ok(
  peakAmplitude(severePeaks[0]!) < peakAmplitude(baselinePeaks[0]!),
  'a severe release mismatch must reduce the first return excursion',
);

const meanPeriodS = (
  extrema: readonly PressureExtremum[],
  startIndex: number,
  endIndex: number,
) => (extrema[endIndex]!.timeS - extrema[startIndex]!.timeS)
  / (endIndex - startIndex);
const baselineEarlyPeriodS = meanPeriodS(baselineTroughs, 0, 2);
const severeEarlyPeriodS = meanPeriodS(severeTroughs, 0, 2);
const baselineLatePeriodS = meanPeriodS(baselineTroughs, 6, 8);
const severeLatePeriodS = meanPeriodS(severeTroughs, 6, 8);
assert.ok(
  severeEarlyPeriodS > baselineEarlyPeriodS,
  'the transient contact loss should lengthen only the early measured period',
);
assert.ok(
  Math.abs(severeLatePeriodS / baselineLatePeriodS - 1) < 0.002,
  'the accepted free-vibration period must recover after the transient aligns',
);

console.log('pistonOscillationReleaseAsymmetryModel tests passed');
