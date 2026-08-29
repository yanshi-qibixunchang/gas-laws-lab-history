import assert from 'node:assert/strict';
import {
  createPistonOscillationIdealAdiabaticLoadedGasState,
  createPistonOscillationLoadedEquilibriumState,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION,
  appendPistonOscillationPressTracePoint,
  createPistonOscillationIncompletePressOperationEvidence,
  createPistonOscillationPressOperationEvidence,
  type PistonOscillationPressTracePoint,
} from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  createLegacyUnknownPistonOscillationPressOperationEvidence,
} from '../../src/domain/pistonOscillation/pistonOscillationLegacyCompatibility.ts';

const equilibrium = createPistonOscillationLoadedEquilibriumState(80);
const releaseState = createPistonOscillationIdealAdiabaticLoadedGasState(equilibrium, -8);
const trace: PistonOscillationPressTracePoint[] = [];
for (const point of [
  { observedAtMs: 1_000, pistonHeightMm: 79.5, displacementMm: 0 },
  { observedAtMs: 1_050, pistonHeightMm: 77.5, displacementMm: -2 },
  { observedAtMs: 1_100, pistonHeightMm: 75.5, displacementMm: -4 },
  { observedAtMs: 1_150, pistonHeightMm: 73.5, displacementMm: -6 },
  { observedAtMs: 1_200, pistonHeightMm: 71.5, displacementMm: -8 },
] as const) {
  appendPistonOscillationPressTracePoint(trace, {
    ...point,
    pressurePa: releaseState.pressurePa,
    temperatureK: releaseState.temperatureK,
  });
}

const movingRelease = createPistonOscillationPressOperationEvidence({
  trace,
  releasedAtMs: 1_200,
  spaceReleasedAtMs: 1_180,
  mouseReleasedAtMs: 1_200,
  equilibriumHeightMm: equilibrium.equilibriumHeightM * 1_000,
  releaseThermodynamicState: releaseState,
});
assert.equal(
  movingRelease.modelVersion,
  PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION,
);
assert.equal(movingRelease.releaseOrder, 'space-first');
assert.equal(movingRelease.signedReleaseGapS, -0.02);
assert.ok(Math.abs((movingRelease.releaseVelocityMPerS ?? 0) + 0.04) < 1e-12);
assert.ok(Math.abs((movingRelease.averageDownwardSpeedMPerS ?? 0) - 0.04) < 1e-12);
assert.ok(Math.abs((movingRelease.peakDownwardSpeedMPerS ?? 0) - 0.04) < 1e-12);
assert.equal(movingRelease.holdDurationS, 0);
assert.equal(movingRelease.trace.at(-1)?.timeS, 0.2);
assert.equal(
  movingRelease.releaseState?.velocityMPerS,
  movingRelease.releaseVelocityMPerS,
);

const heldRelease = createPistonOscillationPressOperationEvidence({
  trace,
  releasedAtMs: 1_600,
  spaceReleasedAtMs: 1_600,
  mouseReleasedAtMs: 1_600,
  equilibriumHeightMm: equilibrium.equilibriumHeightM * 1_000,
  releaseThermodynamicState: releaseState,
});
assert.equal(heldRelease.releaseOrder, 'simultaneous');
assert.equal(heldRelease.releaseVelocityMPerS, 0);
assert.equal(heldRelease.holdDurationS, 0.4);
assert.equal(heldRelease.pressDurationS, 0.6);

const exactVelocityRelease = createPistonOscillationPressOperationEvidence({
  trace,
  releasedAtMs: 1_200,
  spaceReleasedAtMs: 1_200,
  mouseReleasedAtMs: 1_200,
  equilibriumHeightMm: equilibrium.equilibriumHeightM * 1_000,
  releaseThermodynamicState: releaseState,
  releaseVelocityMPerS: -0.0125,
});
assert.equal(exactVelocityRelease.releaseVelocityMPerS, -0.0125);
assert.equal(exactVelocityRelease.releaseState?.velocityMPerS, -0.0125);

const incomplete = createPistonOscillationIncompletePressOperationEvidence({
  trace,
  capturedUntilMs: 1_600,
});
assert.equal(incomplete.completion, 'not-released');
assert.equal(incomplete.releaseState, null);
assert.equal(incomplete.releaseVelocityMPerS, null);
assert.equal(incomplete.holdDurationS, 0.4);

const legacy = createLegacyUnknownPistonOscillationPressOperationEvidence();
assert.equal(legacy.provenance, 'legacy-unknown');
assert.equal(legacy.releaseVelocityMPerS, null);
assert.deepEqual(legacy.trace, []);

assert.throws(
  () => appendPistonOscillationPressTracePoint(trace, {
    observedAtMs: 999,
    pistonHeightMm: 70,
    displacementMm: -9,
    pressurePa: 110_000,
    temperatureK: 295,
  }),
  /monotonic/,
);

console.log('pistonOscillationPressInteractionModel tests passed');
