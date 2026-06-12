import assert from 'node:assert/strict';
import {
  createHeatCapacityHardSphereBoxContainer,
  createHeatCapacityHardSphereCylinderContainer,
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
    pumpFlowActive: false,
    pumpFlowIntensity: 0,
  });
};

const stepWithFlow = (
  simulation: ReturnType<typeof createHeatCapacityHardSphereSimulation>,
  input: {
    dtS: number;
    targetParticleCount: number;
    thermalSpeedMultiplier?: number;
    outflowActive?: boolean;
    outflowDriftSpeed?: number;
    releasePhase?: 'none' | 'response-delay' | 'main-release' | 'partial-stopped' | 'post-release-exchange';
    releaseExitBudget?: number;
    releaseExitSpeed?: number;
    releaseMinimumParticleCount?: number;
    pumpFlowActive?: boolean;
    pumpFlowIntensity?: number;
  },
) => {
  stepHeatCapacityHardSphereSimulation(simulation, {
    dtS: input.dtS,
    targetParticleCount: input.targetParticleCount,
    thermalSpeedMultiplier: input.thermalSpeedMultiplier ?? 1,
    outflowActive: input.outflowActive ?? false,
    outflowDriftSpeed: input.outflowDriftSpeed ?? 0,
    releasePhase: input.releasePhase ?? 'none',
    releaseExitBudget: input.releaseExitBudget ?? 0,
    releaseExitSpeed: input.releaseExitSpeed ?? 0,
    releaseMinimumParticleCount: input.releaseMinimumParticleCount ?? 0,
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

const cylinderContainer = createHeatCapacityHardSphereCylinderContainer({
  radius: 0.485,
  halfHeight: 0.6325,
  outletPoint: { x: 0, y: 0.6157, z: 0 },
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: 0.32, y: -0.08, z: 0.33 },
});
const cylinderSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 96,
  particleRadius,
  container: cylinderContainer,
  seed: 511,
});
stepIdle(cylinderSimulation, 0.2, 48);
for (let step = 0; step < 24; step += 1) {
  stepIdle(cylinderSimulation, 1 / 60, 48);
}
const cylinderVisibleParticles = getHeatCapacityHardSphereVisibleParticles(cylinderSimulation);
assert.equal(cylinderVisibleParticles.length, 48);
assert.equal(
  cylinderVisibleParticles.every((particle) => (
    isHeatCapacityHardSphereInsideContainer(cylinderContainer, particle.position, particleRadius)
  )),
  true,
  'cylinder hard-sphere simulation should keep static particles inside the cylindrical air wall',
);

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

const pressureOnlySelectionSimulation = createVisibleSimulation(30, 229);
for (let step = 0; step < 10; step += 1) {
  stepWithFlow(pressureOnlySelectionSimulation, {
    dtS: 1 / 60,
    targetParticleCount: 12,
    outflowActive: true,
    outflowDriftSpeed: 1.2,
  });
}
const pressureOnlySelectionExitingCount = pressureOnlySelectionSimulation.particles
  .filter((particle) => particle.state === 'exiting').length;
assert.equal(
  pressureOnlySelectionExitingCount,
  0,
  'pressure-only outflow must not choose hard spheres to leave without an explicit release timeline budget',
);
assert.equal(
  getHeatCapacityHardSphereVisibleParticles(pressureOnlySelectionSimulation).length,
  30,
  'pressure-only outflow must not trim the particle pool from target-count deltas',
);

const releaseSelectionSimulation = createVisibleSimulation(30, 229);
stepWithFlow(releaseSelectionSimulation, {
  dtS: 1 / 60,
  targetParticleCount: 12,
  outflowActive: true,
  outflowDriftSpeed: 1.2,
  releasePhase: 'main-release',
  releaseExitBudget: 4,
  releaseExitSpeed: 5.15,
});
const releaseSelectionExitingCount = releaseSelectionSimulation.particles
  .filter((particle) => particle.state === 'exiting').length;
assert.equal(
  releaseSelectionExitingCount,
  4,
  'active release should choose hard spheres only from the explicit release timeline budget',
);

const budgetedMainReleaseSimulation = createVisibleSimulation(30, 230);
stepWithFlow(budgetedMainReleaseSimulation, {
  dtS: 1 / 60,
  targetParticleCount: 12,
  outflowActive: true,
  outflowDriftSpeed: 1.45,
  releasePhase: 'main-release',
  releaseExitBudget: 5,
});
assert.equal(
  budgetedMainReleaseSimulation.particles.filter((particle) => particle.state === 'exiting').length,
  5,
  'main-release hard spheres should be selected from the explicit release timeline budget',
);

const budgetedReleaseWithoutTargetDropSimulation = createVisibleSimulation(30, 2301);
stepWithFlow(budgetedReleaseWithoutTargetDropSimulation, {
  dtS: 1 / 60,
  targetParticleCount: 30,
  outflowActive: false,
  outflowDriftSpeed: 0,
  releasePhase: 'main-release',
  releaseExitBudget: 5,
  releaseExitSpeed: 5.15,
});
assert.equal(
  budgetedReleaseWithoutTargetDropSimulation.particles.filter((particle) => particle.state === 'exiting').length,
  5,
  'explicit release timeline budget should select hard spheres even before the target count drops',
);

const exitInertiaSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 23011,
});
const exitInertiaParticle = exitInertiaSimulation.particles[0];
assert.ok(exitInertiaParticle);
exitInertiaSimulation.particles[0] = {
  ...exitInertiaParticle,
  position: { x: 0.42, y: 0.04, z: -0.16 },
  velocity: { x: 0, y: 0.54, z: 0 },
  state: 'inside',
  outflowProgress: 0,
};
stepWithFlow(exitInertiaSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 1,
  thermalSpeedMultiplier: 1.5,
  releasePhase: 'main-release',
  releaseExitBudget: 1,
  releaseExitSpeed: 5.15,
});
const afterFastExitPosition = { ...exitInertiaSimulation.particles[0].position };
const fastExitMove = Math.hypot(
  afterFastExitPosition.x - 0.42,
  afterFastExitPosition.y - 0.04,
  afterFastExitPosition.z + 0.16,
);
stepWithFlow(exitInertiaSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 1,
  thermalSpeedMultiplier: 0.68,
  outflowActive: false,
  outflowDriftSpeed: 0,
  releasePhase: 'none',
  releaseExitBudget: 0,
  releaseExitSpeed: 0,
});
const afterCoastPosition = exitInertiaSimulation.particles[0].position;
const coastMove = Math.hypot(
  afterCoastPosition.x - afterFastExitPosition.x,
  afterCoastPosition.y - afterFastExitPosition.y,
  afterCoastPosition.z - afterFastExitPosition.z,
);
assert.equal(
  coastMove >= fastExitMove * 0.72,
  true,
  'hard spheres already selected for fast release should preserve outlet inertia when the gas cools',
);

const staggeredMainReleaseSimulation = createVisibleSimulation(30, 23012);
stepWithFlow(staggeredMainReleaseSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 30,
  releasePhase: 'main-release',
  releaseExitBudget: 8,
  releaseExitSpeed: 5.15,
});
const staggeredOutflowProgress = staggeredMainReleaseSimulation.particles
  .filter((particle) => particle.state === 'exiting')
  .map((particle) => particle.outflowProgress);
assert.equal(staggeredOutflowProgress.length, 8);
assert.equal(
  Math.max(...staggeredOutflowProgress) - Math.min(...staggeredOutflowProgress) > 0.01,
  true,
  'a fast-release batch should be staggered so selected hard spheres do not all leave in lockstep',
);

const minimumProtectedReleaseSimulation = createVisibleSimulation(30, 2302);
stepWithFlow(minimumProtectedReleaseSimulation, {
  dtS: 1 / 60,
  targetParticleCount: 30,
  outflowActive: false,
  outflowDriftSpeed: 0,
  releasePhase: 'main-release',
  releaseExitBudget: 20,
  releaseExitSpeed: 5.15,
  releaseMinimumParticleCount: 24,
});
assert.equal(
  minimumProtectedReleaseSimulation.particles.filter((particle) => particle.state === 'exiting').length,
  6,
  'explicit release budgets should never select particles below the preset baseline lower bound',
);

const zeroPressureOpenSimulation = createVisibleSimulation(24, 235);
stepWithFlow(zeroPressureOpenSimulation, {
  dtS: 1 / 60,
  targetParticleCount: 12,
  outflowActive: false,
  outflowDriftSpeed: 1.45,
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

const postReleaseExchangeSimulation = createVisibleSimulation(24, 237);
stepWithFlow(postReleaseExchangeSimulation, {
  dtS: 1 / 60,
  targetParticleCount: 18,
  outflowActive: false,
  outflowDriftSpeed: 0,
  releasePhase: 'post-release-exchange',
  releaseExitBudget: 2,
});
assert.equal(
  postReleaseExchangeSimulation.particles.filter((particle) => particle.state === 'exiting').length,
  2,
  'post-release exchange should still support low-rate net outflow from the release timeline',
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
  pumpFlowActive: false,
  pumpFlowIntensity: 0,
});
assert.equal(
  radialDistanceToOutlet(exitingOutflowSimulation.particles[0]) < beforeExitRadialDistance,
  true,
  'exiting particles should converge toward the outlet instead of moving only along the global up axis',
);

const nearOutletExitSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 301,
});
const nearOutletParticle = nearOutletExitSimulation.particles[0];
assert.ok(nearOutletParticle);
nearOutletExitSimulation.particles[0] = {
  ...nearOutletParticle,
  position: { x: 0.02, y: 0.69, z: 0.01 },
  velocity: { x: 0, y: 0.54, z: 0 },
  state: 'exiting',
  outflowProgress: 0.25,
};
const beforeNearOutletPosition = { ...nearOutletExitSimulation.particles[0].position };
stepHeatCapacityHardSphereSimulation(nearOutletExitSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 0,
  thermalSpeedMultiplier: 1,
  outflowActive: true,
  outflowDriftSpeed: 1.45,
  releasePhase: 'main-release',
  releaseExitBudget: 0,
  pumpFlowActive: false,
  pumpFlowIntensity: 0,
});
const nearOutletAfter = nearOutletExitSimulation.particles[0];
assert.equal(
  nearOutletAfter.position.y > beforeNearOutletPosition.y,
  true,
  'exiting hard spheres near the bottle mouth should continue moving outward instead of being resampled inside',
);
assert.equal(
  Math.hypot(
    nearOutletAfter.position.x - beforeNearOutletPosition.x,
    nearOutletAfter.position.y - beforeNearOutletPosition.y,
    nearOutletAfter.position.z - beforeNearOutletPosition.z,
  ) < 0.16,
  true,
  'exiting hard spheres near the bottle mouth should not make a large random resampling jump',
);

const visibleExitTailSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 303,
});
const visibleExitTailParticle = visibleExitTailSimulation.particles[0];
assert.ok(visibleExitTailParticle);
visibleExitTailSimulation.particles[0] = {
  ...visibleExitTailParticle,
  position: { x: 0.03, y: 0.69, z: -0.02 },
  velocity: { x: 0, y: 0.54, z: 0 },
  state: 'inside',
  outflowProgress: 0,
};
stepWithFlow(visibleExitTailSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 1,
  releasePhase: 'main-release',
  releaseExitBudget: 1,
  releaseExitSpeed: 5.15,
});
for (let step = 0; step < 34; step += 1) {
  stepWithFlow(visibleExitTailSimulation, {
    dtS: 1 / 120,
    targetParticleCount: 1,
    thermalSpeedMultiplier: 0.68,
    releasePhase: 'none',
    releaseExitBudget: 0,
    releaseExitSpeed: 0,
  });
}
assert.equal(
  visibleExitTailSimulation.particles[0].state,
  'exiting',
  'a fast-release particle near the outlet should keep a visible inertial tail after crossing the bottle mouth',
);

const mainReleaseSpeedSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 307,
});
const postExchangeSpeedSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 307,
});
for (const speedSimulation of [mainReleaseSpeedSimulation, postExchangeSpeedSimulation]) {
  const particle = speedSimulation.particles[0];
  assert.ok(particle);
  speedSimulation.particles[0] = {
    ...particle,
    position: { x: 0.46, y: 0.12, z: -0.22 },
    velocity: { x: 0, y: 0.54, z: 0 },
    state: 'exiting',
    outflowProgress: 0.12,
  };
}
const mainReleaseBefore = { ...mainReleaseSpeedSimulation.particles[0].position };
const postExchangeBefore = { ...postExchangeSpeedSimulation.particles[0].position };
stepWithFlow(mainReleaseSpeedSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 0,
  outflowActive: true,
  outflowDriftSpeed: 1.45,
  releasePhase: 'main-release',
  releaseExitSpeed: 5.15,
});
stepWithFlow(postExchangeSpeedSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 0,
  outflowActive: false,
  outflowDriftSpeed: 0,
  releasePhase: 'post-release-exchange',
  releaseExitSpeed: 1.28,
});
const mainReleaseMove = Math.hypot(
  mainReleaseSpeedSimulation.particles[0].position.x - mainReleaseBefore.x,
  mainReleaseSpeedSimulation.particles[0].position.y - mainReleaseBefore.y,
  mainReleaseSpeedSimulation.particles[0].position.z - mainReleaseBefore.z,
);
const postExchangeMove = Math.hypot(
  postExchangeSpeedSimulation.particles[0].position.x - postExchangeBefore.x,
  postExchangeSpeedSimulation.particles[0].position.y - postExchangeBefore.y,
  postExchangeSpeedSimulation.particles[0].position.z - postExchangeBefore.z,
);
assert.equal(
  postExchangeMove < mainReleaseMove * 0.72,
  true,
  'post-release exchange should move exiting hard spheres more gently than main release',
);

const explicitFastExitSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 401,
});
const explicitSlowExitSimulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 1,
  particleRadius,
  container,
  seed: 401,
});
for (const speedSimulation of [explicitFastExitSimulation, explicitSlowExitSimulation]) {
  const particle = speedSimulation.particles[0];
  assert.ok(particle);
  speedSimulation.particles[0] = {
    ...particle,
    position: { x: 0.38, y: 0.08, z: -0.18 },
    velocity: { x: 0, y: 0.54, z: 0 },
    state: 'exiting',
    outflowProgress: 0.12,
  };
}
const explicitFastBefore = { ...explicitFastExitSimulation.particles[0].position };
const explicitSlowBefore = { ...explicitSlowExitSimulation.particles[0].position };
stepWithFlow(explicitFastExitSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 0,
  releasePhase: 'main-release',
  releaseExitSpeed: 5.4,
});
stepWithFlow(explicitSlowExitSimulation, {
  dtS: 1 / 120,
  targetParticleCount: 0,
  releasePhase: 'post-release-exchange',
  releaseExitSpeed: 1.2,
});
const explicitFastMove = Math.hypot(
  explicitFastExitSimulation.particles[0].position.x - explicitFastBefore.x,
  explicitFastExitSimulation.particles[0].position.y - explicitFastBefore.y,
  explicitFastExitSimulation.particles[0].position.z - explicitFastBefore.z,
);
const explicitSlowMove = Math.hypot(
  explicitSlowExitSimulation.particles[0].position.x - explicitSlowBefore.x,
  explicitSlowExitSimulation.particles[0].position.y - explicitSlowBefore.y,
  explicitSlowExitSimulation.particles[0].position.z - explicitSlowBefore.z,
);
assert.equal(
  explicitFastMove > explicitSlowMove * 2.5,
  true,
  'explicit releaseExitSpeed should control scheduled outflow speed independently of pressure drift',
);
