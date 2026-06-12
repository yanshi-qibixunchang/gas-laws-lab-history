import assert from 'node:assert/strict';
import {
  createHeatCapacityHardSphereBoxContainer,
  isHeatCapacityHardSphereInsideContainer,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts';
import {
  createHeatCapacityHardSphereSimulation,
  getHeatCapacityHardSphereVisibleParticles,
  stepHeatCapacityHardSphereSimulation,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts';

const container = createHeatCapacityHardSphereBoxContainer({
  halfSize: { x: 0.73, y: 0.73, z: 0.73 },
  outletPoint: { x: 0, y: 0.7132, z: 0 },
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: -0.67, y: 0.28, z: 0.26 },
});
const particleRadius = 0.048;

const stepIdle = (
  simulation: ReturnType<typeof createHeatCapacityHardSphereSimulation>,
  dtS: number,
  targetParticleCount: number,
) => {
  stepHeatCapacityHardSphereSimulation(simulation, {
    dtS,
    targetParticleCount,
    thermalSpeedMultiplier: 1,
    outflowActive: false,
    outflowDriftSpeed: 0,
    exitSelectionRate: 0,
    pumpFlowActive: false,
    pumpFlowIntensity: 0,
  });
};

const simulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 128,
  particleRadius,
  container,
  seed: 41,
});

stepIdle(simulation, 0.2, 64);

assert.equal(simulation.lastSubStepCount <= 5, true);
assert.equal(getHeatCapacityHardSphereVisibleParticles(simulation).length, 64);

const overlapSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 2,
  particleRadius,
  container,
  seed: 7,
});
overlapSimulation.particles[0] = {
  id: 0,
  position: { x: -0.01, y: 0, z: 0 },
  velocity: { x: 0.54, y: 0, z: 0 },
  state: 'inside',
  outflowProgress: 0,
};
overlapSimulation.particles[1] = {
  id: 1,
  position: { x: 0.01, y: 0, z: 0 },
  velocity: { x: -0.54, y: 0, z: 0 },
  state: 'inside',
  outflowProgress: 0,
};
stepIdle(overlapSimulation, 1 / 120, 2);
const [left, right] = overlapSimulation.particles;
assert.ok(left && right);
assert.equal(Math.hypot(
  left.position.x - right.position.x,
  left.position.y - right.position.y,
  left.position.z - right.position.z,
) >= particleRadius * 2 - 0.0001, true);
assert.equal(left.velocity.x < 0, true, 'left particle should exchange normal velocity after a head-on collision');
assert.equal(right.velocity.x > 0, true, 'right particle should exchange normal velocity after a head-on collision');

const stableSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 128,
  particleRadius,
  container,
  seed: 99,
});

for (let step = 0; step < 1800; step += 1) {
  stepIdle(stableSimulation, 1 / 60, 128);
}

const stableParticles = getHeatCapacityHardSphereVisibleParticles(stableSimulation);
assert.equal(stableParticles.length, 128);
for (const particle of stableParticles) {
  assert.equal(Number.isFinite(particle.position.x), true);
  assert.equal(Number.isFinite(particle.position.y), true);
  assert.equal(Number.isFinite(particle.position.z), true);
  assert.equal(Number.isFinite(particle.velocity.x), true);
  assert.equal(Number.isFinite(particle.velocity.y), true);
  assert.equal(Number.isFinite(particle.velocity.z), true);
  assert.equal(isHeatCapacityHardSphereInsideContainer(container, particle.position, particleRadius), true);
}

let closestDistance = Number.POSITIVE_INFINITY;
for (let leftIndex = 0; leftIndex < stableParticles.length; leftIndex += 1) {
  const leftParticle = stableParticles[leftIndex];
  if (!leftParticle) continue;
  for (let rightIndex = leftIndex + 1; rightIndex < stableParticles.length; rightIndex += 1) {
    const rightParticle = stableParticles[rightIndex];
    if (!rightParticle) continue;
    closestDistance = Math.min(
      closestDistance,
      Math.hypot(
        leftParticle.position.x - rightParticle.position.x,
        leftParticle.position.y - rightParticle.position.y,
        leftParticle.position.z - rightParticle.position.z,
      ),
    );
  }
}
assert.equal(
  closestDistance >= particleRadius * 2 - 0.004,
  true,
  'stable simulation should not leave visibly overlapping molecules',
);
