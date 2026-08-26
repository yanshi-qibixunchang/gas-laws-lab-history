import assert from 'node:assert/strict';
import {
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_CYLINDER_DIAMETER_TOLERANCE_M,
  PISTON_OSCILLATION_EQUIVALENT_DEAD_VOLUME_HEIGHT_M,
  PISTON_OSCILLATION_INITIAL_CALIBRATION_PROFILE,
  PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG,
  PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_TOLERANCE_KG,
  PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3,
  PISTON_OSCILLATION_SENSOR_MAX_PRESSURE_KPA,
  PISTON_OSCILLATION_SENSOR_MIN_PRESSURE_KPA,
  createPistonOscillationEquilibriumState,
  findPistonOscillationFallingTriggerTimeS,
  getPistonCylinderAreaM2,
  getPistonOscillationInstantaneousThermodynamicState,
  getPistonOscillationSmallSignalFrequencyHz,
  getPistonOscillationTrajectorySampleAt,
  normalizePistonOscillationPhysicsConfig,
  simulatePistonOscillationRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
  PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION,
} from '../../src/domain/pistonOscillation/pistonOscillationAirMaterialModel.ts';
import {
  PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION,
  PISTON_OSCILLATION_TEMPORARY_LINEAR_LOSS_NS_PER_M,
} from '../../src/domain/pistonOscillation/pistonOscillationEquivalentLossModel.ts';

assert.equal(PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION, 'piston-oscillation-dry-air-material-v1');
assert.equal(PISTON_OSCILLATION_AIR_ADIABATIC_INDEX, 1.4);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.gamma,
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
  'the guided physics equation must use the single versioned dry-air material value',
);
assert.equal(
  PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION,
  'piston-oscillation-temporary-equivalent-linear-loss-v1',
);
assert.equal(PISTON_OSCILLATION_TEMPORARY_LINEAR_LOSS_NS_PER_M, 0.434);

assert.equal(
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  0.0325,
  'the formal model must keep the confirmed 32.5 mm cylinder inner diameter',
);
assert.equal(PISTON_OSCILLATION_CYLINDER_DIAMETER_TOLERANCE_M, 0.0001);
assert.equal(PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG, 0.0485);
assert.equal(PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_TOLERANCE_KG, 0.0006);
const areaM2 = getPistonCylinderAreaM2(PISTON_OSCILLATION_CYLINDER_DIAMETER_M);
assert.ok(Math.abs(areaM2 - 8.29576810088555e-4) < 1e-12);

const attemptedDiameterOverride = {
  cylinderDiameterM: 0.1,
} as Parameters<typeof normalizePistonOscillationPhysicsConfig>[0];
const normalizedAttemptedDiameterOverride = normalizePistonOscillationPhysicsConfig(
  attemptedDiameterOverride,
);
assert.equal(
  'cylinderDiameterM' in normalizedAttemptedDiameterOverride,
  false,
  'cylinder diameter must not become a runtime-adjustable physics parameter',
);
assert.equal(
  createPistonOscillationEquilibriumState(80, attemptedDiameterOverride).cylinderAreaM2,
  areaM2,
  'equilibrium geometry must continue to use the fixed instrument inner diameter',
);

const equilibrium80 = createPistonOscillationEquilibriumState(80);
assert.ok(
  Math.abs(equilibrium80.equilibriumPressurePa - 101_898.332) < 0.02,
  '48.5 g moving mass must raise the equilibrium pressure by about 0.573 kPa',
);
assert.ok(
  Math.abs(equilibrium80.sealedDeadVolumeM3 - PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3)
    < 1e-15,
  'the equilibrium gas volume must include the reviewed hose and connection dead volume',
);
assert.ok(
  Math.abs(
    equilibrium80.graduatedCylinderVolumeM3 + equilibrium80.sealedDeadVolumeM3
      - equilibrium80.equilibriumVolumeM3,
  ) < 1e-15,
);
assert.ok(equilibrium80.gasAmountMol > 0);

const instantaneousPressedState = getPistonOscillationInstantaneousThermodynamicState(
  80,
  -10.5,
);
const equivalentReleaseState = simulatePistonOscillationRelease({
  equilibriumHeightMm: 80,
  initialDisplacementMm: -10.5,
}).samples[0];
assert.ok(equivalentReleaseState);
assert.ok(
  Math.abs(
    instantaneousPressedState.pressurePa - (equivalentReleaseState?.pressurePa ?? 0)
  ) < 1e-9,
  'the live pressed-state pressure must use the same state equation as release trajectories',
);
assert.equal(instantaneousPressedState.config.gamma, PISTON_OSCILLATION_AIR_ADIABATIC_INDEX);
assert.throws(
  () => getPistonOscillationInstantaneousThermodynamicState(5, -6),
  /cannot pass below the 0 mm stop/,
);

const trajectories = [60, 70, 80].map((equilibriumHeightMm) => (
  simulatePistonOscillationRelease({
    equilibriumHeightMm,
    initialDisplacementMm: -8,
  })
));

for (const trajectory of trajectories) {
  assert.equal(trajectory.sampleRateHz, 1_000);
  assert.equal(trajectory.samples.length, 6_001);
  assert.ok(
    (trajectory.samples[0]?.pressurePa ?? 0) > 105_000,
    'the pressed state must begin above the 105 kPa falling trigger',
  );
  const triggerTimeS = findPistonOscillationFallingTriggerTimeS(trajectory, 105);
  assert.ok(triggerTimeS !== null && triggerTimeS > 0 && triggerTimeS < 0.1);

  const atRelease = getPistonOscillationTrajectorySampleAt(trajectory, 0);
  const afterDecay = getPistonOscillationTrajectorySampleAt(trajectory, 0.8);
  assert.equal(atRelease.displacementM, -0.008);
  assert.ok(
    Math.abs(afterDecay.displacementM) < Math.abs(atRelease.displacementM) * 0.04,
    'the base damping must settle the visible oscillation within about 0.8 s',
  );
  assert.ok(
    Math.abs(
      getPistonOscillationTrajectorySampleAt(trajectory, 10).pressurePa
        - (trajectory.samples.at(-1)?.pressurePa ?? 0),
    ) < 1e-9,
    'samples requested after the simulated window must remain continuous',
  );
  assert.equal(trajectory.diagnostics.withinIdealSensorRange, true);
  const sampledPressuresKpa = trajectory.samples.map((sample) => sample.pressurePa / 1_000);
  assert.equal(
    trajectory.diagnostics.minimumPressureKpa,
    Math.min(...sampledPressuresKpa),
    'minimum-pressure diagnostics must describe the generated samples exactly',
  );
  assert.equal(
    trajectory.diagnostics.maximumPressureKpa,
    Math.max(...sampledPressuresKpa),
    'maximum-pressure diagnostics must describe the generated samples exactly',
  );
  assert.ok(
    trajectory.diagnostics.minimumPressureKpa >= PISTON_OSCILLATION_SENSOR_MIN_PRESSURE_KPA,
  );
  assert.ok(
    trajectory.diagnostics.maximumPressureKpa <= PISTON_OSCILLATION_SENSOR_MAX_PRESSURE_KPA,
  );

  const terminalSample = trajectory.samples.at(-1);
  assert.ok(terminalSample);
  if (terminalSample) {
    const atTerminal = getPistonOscillationTrajectorySampleAt(
      trajectory,
      terminalSample.timeS,
    );
    const afterTerminal = getPistonOscillationTrajectorySampleAt(
      trajectory,
      terminalSample.timeS + 1,
    );
    assert.deepEqual(atTerminal, terminalSample);
    assert.equal(afterTerminal.displacementM, terminalSample.displacementM);
    assert.equal(afterTerminal.velocityMPerS, terminalSample.velocityMPerS);
    assert.equal(afterTerminal.pressurePa, terminalSample.pressurePa);
    assert.equal(afterTerminal.temperatureK, terminalSample.temperatureK);
    assert.equal(
      afterTerminal.timeS,
      terminalSample.timeS + 1,
      'post-window sampling should advance only the query time without jumping state values',
    );
  }
}

const overRangeTrajectory = simulatePistonOscillationRelease({
  equilibriumHeightMm: 80,
  initialDisplacementMm: -8,
}, {
  ambientPressurePa: 200_000,
});
assert.ok(
  overRangeTrajectory.diagnostics.maximumPressureKpa
    > PISTON_OSCILLATION_SENSOR_MAX_PRESSURE_KPA,
);
assert.equal(
  overRangeTrajectory.diagnostics.withinIdealSensorRange,
  false,
  'diagnostics must reject a trajectory that exceeds the ideal sensor range',
);

const lowSampleRateTrajectory = simulatePistonOscillationRelease({
  equilibriumHeightMm: 80,
  initialDisplacementMm: -8,
}, {
  sensorSampleRateHz: 20,
});
assert.equal(lowSampleRateTrajectory.sampleRateHz, 20);
assert.equal(lowSampleRateTrajectory.samples.length, 121);
assert.ok(
  lowSampleRateTrajectory.integrationSubstepsPerSample
    > (trajectories[2]?.integrationSubstepsPerSample ?? 0),
  'a lower sensor sample rate must automatically receive more integration substeps per sample',
);
assert.ok(
  lowSampleRateTrajectory.samples.every((sample) => (
    Number.isFinite(sample.displacementM)
    && Number.isFinite(sample.velocityMPerS)
    && Number.isFinite(sample.pressurePa)
    && Number.isFinite(sample.temperatureK)
  )),
  'adaptive internal stepping must keep low-rate sensor trajectories numerically stable',
);
const highRateAtEightTenths = getPistonOscillationTrajectorySampleAt(
  trajectories[2]!,
  0.8,
);
const lowRateAtEightTenths = getPistonOscillationTrajectorySampleAt(
  lowSampleRateTrajectory,
  0.8,
);
assert.ok(
  Math.abs(lowRateAtEightTenths.displacementM - highRateAtEightTenths.displacementM) < 1e-5,
  'adaptive integration should keep visible motion stable when sensor sampling is reduced',
);
assert.ok(
  Math.abs(lowRateAtEightTenths.pressurePa - highRateAtEightTenths.pressurePa) < 100,
  'adaptive integration should keep pressure stable when sensor sampling is reduced',
);

const frequency20 = getPistonOscillationSmallSignalFrequencyHz(20);
const frequency50 = getPistonOscillationSmallSignalFrequencyHz(50);
const frequency80 = getPistonOscillationSmallSignalFrequencyHz(80);
assert.ok(frequency20 > frequency50 && frequency50 > frequency80);
assert.ok(frequency80 > 20 && frequency20 < 50);

const invariantHeightsM = [0.06, 0.07, 0.08];
const invariantPoints = invariantHeightsM.map((heightM) => {
  const frequencyHz = getPistonOscillationSmallSignalFrequencyHz(heightM * 1_000, {
    linearDampingNsPerM: 0,
  });
  return { x: 1 / frequencyHz ** 2, y: heightM };
});
const invariantMeanX = invariantPoints.reduce((sum, point) => sum + point.x, 0)
  / invariantPoints.length;
const invariantMeanY = invariantPoints.reduce((sum, point) => sum + point.y, 0)
  / invariantPoints.length;
const invariantSlopeMPerS2 = invariantPoints.reduce(
  (sum, point) => sum + (point.x - invariantMeanX) * (point.y - invariantMeanY),
  0,
) / invariantPoints.reduce(
  (sum, point) => sum + (point.x - invariantMeanX) ** 2,
  0,
);
const invariantPressurePa = createPistonOscillationEquilibriumState(60, {
  linearDampingNsPerM: 0,
}).equilibriumPressurePa;
const recoveredIdealGamma = 4 * Math.PI ** 2
  * DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.movingMassKg
  * invariantSlopeMPerS2
  / (areaM2 * invariantPressurePa);
assert.ok(
  Math.abs(recoveredIdealGamma - PISTON_OSCILLATION_AIR_ADIABATIC_INDEX) < 1e-12,
  'the zero-loss analytic invariant must recover the versioned 1.40 air property',
);

const heavier = createPistonOscillationEquilibriumState(80, { movingMassKg: 0.07 });
assert.ok(heavier.equilibriumPressurePa > equilibrium80.equilibriumPressurePa);
assert.ok(
  getPistonOscillationSmallSignalFrequencyHz(80, { movingMassKg: 0.07 })
    < frequency80,
);

const warmer = createPistonOscillationEquilibriumState(80, {
  ambientTemperatureK: 303.15,
});
assert.ok(warmer.gasAmountMol < equilibrium80.gasAmountMol);

const repeated = simulatePistonOscillationRelease({
  equilibriumHeightMm: 80,
  initialDisplacementMm: -8,
}, DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG);
assert.deepEqual(repeated.samples.slice(0, 25), trajectories[2]?.samples.slice(0, 25));

assert.deepEqual(PISTON_OSCILLATION_INITIAL_CALIBRATION_PROFILE, {
  equivalentDeadVolumeHeightM: PISTON_OSCILLATION_EQUIVALENT_DEAD_VOLUME_HEIGHT_M,
  linearDampingNsPerM: PISTON_OSCILLATION_TEMPORARY_LINEAR_LOSS_NS_PER_M,
});
assert.equal('cylinderDiameterM' in DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG, false);
assert.equal(
  'integrationSubstepsPerSample' in DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  false,
  'integration substeps must remain an automatically derived trajectory diagnostic',
);

const invalidConfigCases: Array<{
  label: string;
  input: Parameters<typeof normalizePistonOscillationPhysicsConfig>[0];
  expected: RegExp;
}> = [
  { label: 'non-finite gamma', input: { gamma: Number.NaN }, expected: /gamma/ },
  { label: 'gamma lower bound', input: { gamma: 1 }, expected: /gamma/ },
  { label: 'gamma upper bound', input: { gamma: 2.001 }, expected: /gamma/ },
  { label: 'ambient pressure lower bound', input: { ambientPressurePa: 19_999 }, expected: /ambientPressurePa/ },
  { label: 'ambient pressure upper bound', input: { ambientPressurePa: 200_001 }, expected: /ambientPressurePa/ },
  { label: 'temperature lower bound', input: { ambientTemperatureK: 149.999 }, expected: /ambientTemperatureK/ },
  { label: 'temperature upper bound', input: { ambientTemperatureK: 400.001 }, expected: /ambientTemperatureK/ },
  { label: 'mass lower bound', input: { movingMassKg: 0.004 }, expected: /movingMassKg/ },
  { label: 'mass upper bound', input: { movingMassKg: 5.001 }, expected: /movingMassKg/ },
  { label: 'dead volume lower bound', input: { equivalentDeadVolumeHeightM: -0.001 }, expected: /equivalentDeadVolumeHeightM/ },
  { label: 'dead volume upper bound', input: { equivalentDeadVolumeHeightM: 1.001 }, expected: /equivalentDeadVolumeHeightM/ },
  { label: 'damping lower bound', input: { linearDampingNsPerM: -0.001 }, expected: /linearDampingNsPerM/ },
  { label: 'damping upper bound', input: { linearDampingNsPerM: 10.001 }, expected: /linearDampingNsPerM/ },
  { label: 'sample-rate lower bound', input: { sensorSampleRateHz: 0 }, expected: /sensorSampleRateHz/ },
  { label: 'sample-rate upper bound', input: { sensorSampleRateHz: 1_001 }, expected: /sensorSampleRateHz/ },
  { label: 'duration lower bound', input: { trajectoryDurationS: 0.099 }, expected: /trajectoryDurationS/ },
  { label: 'duration upper bound', input: { trajectoryDurationS: 10.001 }, expected: /trajectoryDurationS/ },
];

for (const { label, input, expected } of invalidConfigCases) {
  assert.throws(
    () => normalizePistonOscillationPhysicsConfig(input),
    expected,
    `${label} must be rejected instead of clamped or propagated`,
  );
}

for (const invalidHeightMm of [Number.NaN, -0.001, 80.001]) {
  assert.throws(
    () => createPistonOscillationEquilibriumState(invalidHeightMm),
    /equilibriumHeightMm/,
  );
}

assert.throws(
  () => simulatePistonOscillationRelease({
    equilibriumHeightMm: 5,
    initialDisplacementMm: -8,
  }),
  /cannot move below 0 mm/,
);
assert.throws(
  () => simulatePistonOscillationRelease({
    equilibriumHeightMm: 80,
    initialDisplacementMm: -8,
  }, { gamma: 1 }),
  /gamma must be greater than 1/,
);
assert.throws(
  () => simulatePistonOscillationRelease({
    equilibriumHeightMm: 80,
    initialDisplacementMm: -8,
  }, { sensorSampleRateHz: Number.NaN }),
  /sensorSampleRateHz/,
);
assert.throws(
  () => simulatePistonOscillationRelease({
    equilibriumHeightMm: 80,
    initialDisplacementMm: 0.001,
  }),
  /initialDisplacementMm/,
);
assert.throws(
  () => simulatePistonOscillationRelease({
    equilibriumHeightMm: 80,
    initialDisplacementMm: -12.001,
  }),
  /initialDisplacementMm/,
);
assert.throws(
  () => simulatePistonOscillationRelease({
    equilibriumHeightMm: 80,
    initialDisplacementMm: -8,
    initialVelocityMmPerS: 2_001,
  }),
  /initialVelocityMmPerS/,
);
