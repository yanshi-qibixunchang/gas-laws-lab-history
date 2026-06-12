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

const stepWithFlow = (
  simulation: ReturnType<typeof createHeatCapacityHardSphereSimulation>,
  input: {
    dtS: number;
    targetParticleCount: number;
    outflowActive?: boolean;
    outflowDriftSpeed?: number;
    exitSelectionRate?: number;
    pumpFlowActive?: boolean;
    pumpFlowIntensity?: number;
  },
) => {
  stepHeatCapacityHardSphereSimulation(simulation, {
    dtS: input.dtS,
    targetParticleCount: input.targetParticleCount,
    thermalSpeedMultiplier: 1,
    outflowActive: input.outflowActive ?? false,
    outflowDriftSpeed: input.outflowDriftSpeed ?? 0,
    exitSelectionRate: input.exitSelectionRate ?? 0,
    pumpFlowActive: input.pumpFlowActive ?? false,
    pumpFlowIntensity: input.pumpFlowIntensity ?? 0,
  });
};

const createVisibleSimulation = (targetParticleCount: number, seed: number) => {
  const visibleSimulation = createHeatCapacityHardSphereSimulation({
    maxParticles: 64,
    particleRadius,
    container,
    seed,
  });
  stepIdle(visibleSimulation, 0.2, targetParticleCount);
  return visibleSimulation;
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

const naturalSpawnSimulation = createVisibleSimulation(12, 211);
stepIdle(naturalSpawnSimulation, 1 / 60, 24);
const naturalSpawnVisibleCount = getHeatCapacityHardSphereVisibleParticles(naturalSpawnSimulation).length;
assert.equal(
  naturalSpawnVisibleCount,
  12,
  'natural recovery should not create hard spheres unless gas enters through the pump port',
);

const pumpEntrySimulation = createVisibleSimulation(12, 213);
stepWithFlow(pumpEntrySimulation, {
  dtS: 1 / 60,
  targetParticleCount: 24,
  pumpFlowActive: true,
  pumpFlowIntensity: 1,
});
const enteringParticles = getHeatCapacityHardSphereVisibleParticles(pumpEntrySimulation)
  .filter((particle) => particle.state === 'entering');
assert.equal(
  enteringParticles.length > 0,
  true,
  'pump flow should add new hard spheres through a visible entering state',
);
assert.equal(
  enteringParticles.every((particle) => (
    Math.abs(particle.position.x - container.pumpPortPoint.x) <= particleRadius * 2.6 &&
    Math.abs(particle.position.y - container.pumpPortPoint.y) <= particleRadius * 2.6 &&
    Math.abs(particle.position.z - container.pumpPortPoint.z) <= particleRadius * 2.6
  )),
  true,
  'pump-entering hard spheres should originate at the pump port instead of random bottle positions',
);
assert.equal(
  enteringParticles.every((particle) => particle.velocity.x > 0),
  true,
  'pump-entering hard spheres should be sprayed inward from the left-side pump port',
);

const naturalTrimSimulation = createVisibleSimulation(24, 223);
stepIdle(naturalTrimSimulation, 1 / 60, 12);
const naturalTrimVisibleCount = getHeatCapacityHardSphereVisibleParticles(naturalTrimSimulation).length;
assert.equal(
  naturalTrimVisibleCount,
  24,
  'natural recovery should not delete hard spheres unless gas leaves through the outlet',
);

const createReleaseSelectionSimulation = (seed: number) => {
  const releaseSimulation = createVisibleSimulation(30, seed);
  stepWithFlow(releaseSimulation, {
    dtS: 1 / 60,
    targetParticleCount: 12,
    outflowActive: true,
    outflowDriftSpeed: 1.2,
    exitSelectionRate: 1.2,
  });
  return releaseSimulation;
};
const releaseSelectionSimulation = createReleaseSelectionSimulation(229);
const releaseSelectionExitingCount = releaseSelectionSimulation.particles
  .filter((particle) => particle.state === 'exiting').length;
assert.equal(
  releaseSelectionExitingCount > 0,
  true,
  'active release should choose some hard spheres to leave through the outlet',
);
assert.equal(
  releaseSelectionExitingCount < 18,
  true,
  'active release should not choose every excess hard sphere in one frame',
);

const lowPressureSelectionSimulation = createVisibleSimulation(30, 231);
for (let step = 0; step < 10; step += 1) {
  stepWithFlow(lowPressureSelectionSimulation, {
    dtS: 1 / 60,
    targetParticleCount: 12,
    outflowActive: true,
    outflowDriftSpeed: 0.72,
    exitSelectionRate: 0.6,
  });
}
const lowPressureExitCount = lowPressureSelectionSimulation.particles
  .filter((particle) => particle.state === 'exiting').length;
const highPressureSelectionSimulation = createVisibleSimulation(30, 233);
for (let step = 0; step < 10; step += 1) {
  stepWithFlow(highPressureSelectionSimulation, {
    dtS: 1 / 60,
    targetParticleCount: 12,
    outflowActive: true,
    outflowDriftSpeed: 1.45,
    exitSelectionRate: 1.36,
  });
}
const highPressureExitCount = highPressureSelectionSimulation.particles
  .filter((particle) => particle.state === 'exiting').length;
assert.equal(
  highPressureExitCount > lowPressureExitCount,
  true,
  'larger pressure difference should select more exiting hard spheres over the same time span',
);

const zeroPressureOpenSimulation = createVisibleSimulation(24, 235);
stepWithFlow(zeroPressureOpenSimulation, {
  dtS: 1 / 60,
  targetParticleCount: 12,
  outflowActive: false,
  outflowDriftSpeed: 1.45,
  exitSelectionRate: 1.36,
});
assert.equal(
  zeroPressureOpenSimulation.particles.some((particle) => particle.state === 'exiting'),
  false,
  'zero-pressure tail values should not select new hard spheres for exit after flow has stopped',
);
assert.equal(
  getHeatCapacityHardSphereVisibleParticles(zeroPressureOpenSimulation).length,
  24,
  'zero-pressure return to natural motion should not compensate by hiding bottle particles',
);

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

const distanceToOutlet = (
  particle: typeof stableParticles[number],
) => Math.hypot(
  particle.position.x - container.outletPoint.x,
  particle.position.y - container.outletPoint.y,
  particle.position.z - container.outletPoint.z,
);

const radialDistanceToOutlet = (
  particle: typeof stableParticles[number],
) => Math.hypot(
  particle.position.x - container.outletPoint.x,
  particle.position.z - container.outletPoint.z,
);

const driftingOutflowSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 101,
});
const driftingParticle = driftingOutflowSimulation.particles[0];
assert.ok(driftingParticle);
driftingOutflowSimulation.particles[0] = {
  ...driftingParticle,
  position: { x: 0.62, y: -0.42, z: 0.18 },
  velocity: { x: 0.54, y: -0.2, z: 0 },
  state: 'inside',
  outflowProgress: 0,
};
const beforeDriftDistance = distanceToOutlet(driftingOutflowSimulation.particles[0]);
for (let step = 0; step < 10; step += 1) {
  stepHeatCapacityHardSphereSimulation(driftingOutflowSimulation, {
    dtS: 1 / 60,
    targetParticleCount: 1,
    thermalSpeedMultiplier: 1,
    outflowActive: true,
    outflowDriftSpeed: 1.45,
    exitSelectionRate: 0,
    pumpFlowActive: false,
    pumpFlowIntensity: 0,
  });
}
assert.equal(
  distanceToOutlet(driftingOutflowSimulation.particles[0]) < beforeDriftDistance,
  true,
  'active release drift should pull inside particles toward the bottle outlet',
);

const exitingOutflowSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 103,
});
const exitingParticle = exitingOutflowSimulation.particles[0];
assert.ok(exitingParticle);
exitingOutflowSimulation.particles[0] = {
  ...exitingParticle,
  position: { x: 0.54, y: 0.12, z: -0.24 },
  velocity: { x: 0, y: 0.54, z: 0 },
  state: 'exiting',
  outflowProgress: 0.12,
};
const beforeExitRadialDistance = radialDistanceToOutlet(exitingOutflowSimulation.particles[0]);
stepHeatCapacityHardSphereSimulation(exitingOutflowSimulation, {
  dtS: 1 / 30,
  targetParticleCount: 0,
  thermalSpeedMultiplier: 1,
  outflowActive: true,
  outflowDriftSpeed: 1.45,
  exitSelectionRate: 1.36,
  pumpFlowActive: false,
  pumpFlowIntensity: 0,
});
assert.equal(
  radialDistanceToOutlet(exitingOutflowSimulation.particles[0]) < beforeExitRadialDistance,
  true,
  'exiting particles should converge toward the outlet instead of moving only along the global up axis',
);
