import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION,
  getPistonOscillationSettlingStateAtProgress,
  normalizePistonOscillationThermodynamicState,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG,
  advancePistonOscillationPrescribedThermodynamicState,
  createPistonOscillationThermodynamicStateFromTrajectorySample,
  getPistonOscillationThermalRelaxationTimeS,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  createPistonOscillationPhysicsSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';

const loadedState = getPistonOscillationSettlingStateAtProgress(80, 1);
const fastPressedState = advancePistonOscillationPrescribedThermodynamicState({
  referenceState: loadedState,
  pistonHeightMm: 70,
  elapsedS: 0.05,
});
const slowPressedState = advancePistonOscillationPrescribedThermodynamicState({
  referenceState: loadedState,
  pistonHeightMm: 70,
  elapsedS: 1,
});

assert.equal(
  DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.relaxationTimeAtReferenceHeightS,
  0.05,
);
assert.equal(DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.volumeExponent, 1);
assert.ok(
  Math.abs(
    getPistonOscillationThermalRelaxationTimeS(fastPressedState.totalVolumeM3)
      - 0.05 * fastPressedState.totalVolumeM3
        / (
          fastPressedState.sealedDeadVolumeM3
          + fastPressedState.graduatedCylinderVolumeM3 * 5 / 7
        ),
  ) < 1e-12,
  'the candidate relaxation time must scale linearly with total sealed volume',
);
assert.equal(fastPressedState.modelVersion, PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION);
assert.equal(fastPressedState.thermal.enabled, true);
assert.ok(fastPressedState.temperatureK > slowPressedState.temperatureK);
assert.ok(fastPressedState.pressurePa > slowPressedState.pressurePa);
assert.ok(
  fastPressedState.temperatureK > loadedState.temperatureK,
  'rapid compression must heat the gas',
);

const heldState = advancePistonOscillationPrescribedThermodynamicState({
  referenceState: fastPressedState,
  pistonHeightMm: 70,
  elapsedS: 0.25,
  velocityMmPerS: 0,
});
assert.equal(heldState.pistonHeightM, fastPressedState.pistonHeightM);
assert.ok(heldState.temperatureK < fastPressedState.temperatureK);
assert.ok(heldState.pressurePa < fastPressedState.pressurePa);
assert.ok(
  Math.abs(heldState.temperatureK - 293.15)
    < Math.abs(fastPressedState.temperatureK - 293.15),
  'a fixed-volume hold must relax toward the ambient wall temperature',
);
assert.ok(heldState.thermal.enabled);
if (heldState.thermal.enabled) {
  assert.ok(heldState.thermal.cumulativeHeatTransferJ < 0);
}
assert.ok(normalizePistonOscillationThermodynamicState(heldState));

const equilibriumHeightMm = 79.5028476117188;
const initialDisplacementMm = 70 - equilibriumHeightMm;
const release = simulatePistonOscillationThermalRelease({
  lockedHeightMm: 80,
  initialDisplacementMm,
  initialVelocityMmPerS: -40,
  referenceThermodynamicState: fastPressedState,
});
assert.equal(release.modelVersion, PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION);
assert.equal(release.sampleRateHz, 1_000);
assert.equal(release.samples.length, 6_001);
assert.equal(release.initialVelocityMPerS, -0.04);
assert.ok(release.thermalModel);
const persistedPhysicsSnapshot = createPistonOscillationPhysicsSnapshot(release, 0.01);
assert.equal(
  persistedPhysicsSnapshot.modelVersion,
  PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION,
);
assert.ok(persistedPhysicsSnapshot.initialThermodynamicState?.thermal.enabled);
assert.ok(persistedPhysicsSnapshot.thermalModel?.enabled);
assert.ok(
  Math.abs((release.samples[0]?.pressurePa ?? 0) - fastPressedState.pressurePa) < 1e-7,
  'release must begin from the pressure reached by the continuous press history',
);
assert.ok(
  Math.abs((release.samples[0]?.temperatureK ?? 0) - fastPressedState.temperatureK) < 1e-12,
  'release must not reset gas temperature at the handoff',
);
assert.ok(release.samples.every((sample) => (
  Number.isFinite(sample.displacementM)
  && Number.isFinite(sample.velocityMPerS)
  && Number.isFinite(sample.pressurePa)
  && Number.isFinite(sample.temperatureK)
  && Number.isFinite(sample.cumulativeHeatTransferJ)
)));
assert.ok(
  Math.abs(release.samples[800]?.displacementM ?? 1)
    < Math.abs(release.initialDisplacementM) * 0.05,
  'the candidate thermal trajectory must still settle within the accepted visible window',
);

const reconstructed = createPistonOscillationThermodynamicStateFromTrajectorySample(
  release,
  release.samples[125]!,
);
assert.equal(reconstructed.modelVersion, PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION);
assert.ok(
  Math.abs(reconstructed.pressurePa - release.samples[125]!.pressurePa) < 1e-8,
);
assert.ok(
  Math.abs(reconstructed.temperatureK - release.samples[125]!.temperatureK) < 1e-12,
);

const repeatedRelease = simulatePistonOscillationThermalRelease({
  lockedHeightMm: 80,
  initialDisplacementMm,
  initialVelocityMmPerS: -40,
  referenceThermodynamicState: fastPressedState,
});
assert.deepEqual(repeatedRelease.samples.slice(0, 100), release.samples.slice(0, 100));

console.log('pistonOscillationThermalPhysicsModel tests passed');
