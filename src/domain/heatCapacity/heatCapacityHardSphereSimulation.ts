import {
  isHeatCapacityHardSphereInsideContainer,
  resolveHeatCapacityHardSphereWallBounce,
  sampleHeatCapacityHardSpherePosition,
  type HeatCapacityHardSphereContainer,
  type HeatCapacityHardSphereParticle,
  type HeatCapacityHardSphereVec3,
} from './heatCapacityHardSphereGeometry.ts';
import { HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE } from './heatCapacityHardSphereReleaseSchedule.ts';
import type {
  HeatCapacityReleaseFeedback,
  HeatCapacityReleaseFeedbackStopReason,
} from './heatCapacityReleaseFeedbackModel.ts';

export interface HeatCapacityHardSphereSimulation {
  particles: HeatCapacityHardSphereParticle[];
  maxParticles: number;
  particleRadius: number;
  container: HeatCapacityHardSphereContainer;
  accumulatorS: number;
  entryAccumulator: number;
  exitAccumulator: number;
  lastSubStepCount: number;
  seed: number;
  releaseRecoveryRemainingS: number;
  releaseRecoveryReason: HeatCapacityReleaseFeedbackStopReason;
}

export interface HeatCapacityHardSphereSimulationOptions {
  maxParticles: number;
  particleRadius: number;
  container: HeatCapacityHardSphereContainer;
  seed: number;
}

export interface HeatCapacityHardSphereSimulationStepInput {
  dtS: number;
  targetParticleCount: number;
  thermalSpeedMultiplier: number;
  releaseExitBudget: number;
  releaseExitSpeed: number;
  releaseMinimumParticleCount: number;
  releaseJustStopped: boolean;
  releaseFeedback: HeatCapacityReleaseFeedback;
  pumpFlowActive: boolean;
  pumpFlowIntensity: number;
  pumpEntryRateScale?: number;
}

export interface HeatCapacityHardSphereSimulationStepResult {
  acceptedReleaseExitCount: number;
}

const FIXED_DT_S = 1 / 120;
const MAX_SUB_STEPS = 5;
const BASE_PARTICLE_SPEED = 0.54;
const SPAWN_ATTEMPTS = 24;
const COLLISION_SOLVER_ITERATIONS = 2;
const PUMP_ENTRY_BASE_RATE_PER_S = 18;
const PUMP_ENTRY_INTENSITY_RATE_PER_S = 54;
const MAIN_RELEASE_STAGGER_MAX_S = HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.mainStaggerMaxS;

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const consumeFlowBudget = (
  needed: number,
  dtS: number,
  ratePerS: number,
  accumulator: number,
) => {
  if (needed <= 0 || dtS <= 0 || ratePerS <= 0) {
    return { budget: 0, accumulator: 0 };
  }
  const available = Math.max(0, accumulator) + ratePerS * dtS;
  const budget = Math.min(needed, Math.floor(available));
  return {
    budget,
    accumulator: clampNumber(available - budget, 0, 0.999999),
  };
};

const seededNoise = (value: number) => {
  const raw = Math.sin(value) * 43758.5453;
  return raw - Math.floor(raw);
};

const isFiniteVec3 = (value: HeatCapacityHardSphereVec3) => (
  Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)
);

const lengthVec3 = (value: HeatCapacityHardSphereVec3) => (
  Math.hypot(value.x, value.y, value.z)
);

const normalizeVec3 = (
  value: HeatCapacityHardSphereVec3,
  fallback: HeatCapacityHardSphereVec3,
) => {
  const length = lengthVec3(value);
  if (!Number.isFinite(length) || length <= 0.000001) return { ...fallback };
  return {
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
  };
};

const deterministicDirection = (seed: number): HeatCapacityHardSphereVec3 => {
  const direction = {
    x: seededNoise(seed * 12.9898 + 5.7) - 0.5,
    y: seededNoise(seed * 78.233 + 2.9) - 0.5,
    z: seededNoise(seed * 37.719 + 8.1) - 0.5,
  };
  return normalizeVec3(direction, { x: 1, y: 0, z: 0 });
};

const scaleVec3 = (
  value: HeatCapacityHardSphereVec3,
  scalar: number,
): HeatCapacityHardSphereVec3 => ({
  x: value.x * scalar,
  y: value.y * scalar,
  z: value.z * scalar,
});

const distanceSq = (
  left: HeatCapacityHardSphereVec3,
  right: HeatCapacityHardSphereVec3,
) => {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const dz = left.z - right.z;
  return dx * dx + dy * dy + dz * dz;
};

const dotVec3 = (
  left: HeatCapacityHardSphereVec3,
  right: HeatCapacityHardSphereVec3,
) => (
  left.x * right.x + left.y * right.y + left.z * right.z
);

const getContainerCaptureRadius = (
  container: HeatCapacityHardSphereContainer,
) => {
  if (container.kind === 'cylinder') {
    return Math.max(container.radius, container.halfHeight) * 2;
  }
  return Math.max(container.halfSize.x, container.halfSize.y, container.halfSize.z) * 2;
};

const clampPositionToContainer = (
  container: HeatCapacityHardSphereContainer,
  position: HeatCapacityHardSphereVec3,
  radius: number,
): HeatCapacityHardSphereVec3 => {
  const probeParticle: HeatCapacityHardSphereParticle = {
    id: -1,
    position: { ...position },
    velocity: { x: 0, y: 0, z: 0 },
    state: 'inside',
    outflowProgress: 0,
  };
  resolveHeatCapacityHardSphereWallBounce(container, probeParticle, radius);
  return probeParticle.position;
};

const getOutletProximity = (
  container: HeatCapacityHardSphereContainer,
  position: HeatCapacityHardSphereVec3,
) => {
  const captureRadius = getContainerCaptureRadius(container);
  return clampNumber(1 - Math.sqrt(distanceSq(position, container.outletPoint)) / captureRadius, 0, 1);
};

const getOutletAttractionDirection = (
  container: HeatCapacityHardSphereContainer,
  position: HeatCapacityHardSphereVec3,
) => {
  const toOutlet = normalizeVec3({
    x: container.outletPoint.x - position.x,
    y: container.outletPoint.y - position.y,
    z: container.outletPoint.z - position.z,
  }, container.outletDirection);
  const upwardBlend = clampNumber(getOutletProximity(container, position) * 0.52, 0.08, 0.62);
  return normalizeVec3({
    x: toOutlet.x + (container.outletDirection.x - toOutlet.x) * upwardBlend,
    y: toOutlet.y + (container.outletDirection.y - toOutlet.y) * upwardBlend,
    z: toOutlet.z + (container.outletDirection.z - toOutlet.z) * upwardBlend,
  }, container.outletDirection);
};

const getOutletPriority = (
  particle: HeatCapacityHardSphereParticle,
  container: HeatCapacityHardSphereContainer,
) => {
  const proximityFactor = getOutletProximity(container, particle.position);
  const directionFactor = clampNumber(
    dotVec3(
      normalizeVec3(particle.velocity, container.outletDirection),
      getOutletAttractionDirection(container, particle.position),
    ),
    0,
    1,
  );
  const stableBias = seededNoise(particle.id * 17.91 + 3.7);
  return proximityFactor * 0.82 + directionFactor * 0.12 + stableBias * 0.06;
};

const countParticlesByState = (
  particles: HeatCapacityHardSphereParticle[],
  state: HeatCapacityHardSphereParticle['state'],
) => particles.reduce((count, particle) => count + (particle.state === state ? 1 : 0), 0);

const clearExitInertia = (particle: HeatCapacityHardSphereParticle) => {
  particle.exitInertiaSpeed = 0;
  particle.exitInertiaAgeS = 0;
  particle.exitDelayS = 0;
};

const clearReleaseRecovery = (particle: HeatCapacityHardSphereParticle) => {
  particle.releaseRecoveryDelayS = 0;
};

const getOutletSignedDistance = (
  container: HeatCapacityHardSphereContainer,
  position: HeatCapacityHardSphereVec3,
) => dotVec3({
  x: position.x - container.outletPoint.x,
  y: position.y - container.outletPoint.y,
  z: position.z - container.outletPoint.z,
}, container.outletDirection);

const hasParticleCrossedOutlet = (
  particle: HeatCapacityHardSphereParticle,
  simulation: HeatCapacityHardSphereSimulation,
) => getOutletSignedDistance(simulation.container, particle.position) >= simulation.particleRadius * 0.3;

const getExitOcclusionOffset = (simulation: HeatCapacityHardSphereSimulation) => (
  Math.max(
    simulation.particleRadius * HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.exitOcclusionRadii,
    0.12,
  )
);

const beginReleaseRecovery = (
  simulation: HeatCapacityHardSphereSimulation,
  stopReason: HeatCapacityReleaseFeedbackStopReason,
) => {
  const pressureBalanced = stopReason === 'pressure-balanced';
  simulation.releaseRecoveryReason = stopReason;
  simulation.releaseRecoveryRemainingS = pressureBalanced
    ? HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.balancedReboundDurationS
    : HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.closedInertiaDurationS;

  for (const particle of simulation.particles) {
    if (particle.state === 'exiting') {
      if (hasParticleCrossedOutlet(particle, simulation)) {
        continue;
      }
      particle.state = 'inside';
      particle.outflowProgress = 0;
      clearExitInertia(particle);
    }
    if (particle.state !== 'inside') continue;
    particle.releaseRecoveryDelayS = pressureBalanced
      ? seededNoise(particle.id * 43.19 + simulation.seed * 0.07) *
        HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.maximumRecoveryDelayS
      : 0;
  }
};

const resetVelocityMagnitude = (
  particle: HeatCapacityHardSphereParticle,
  seed: number,
) => {
  const direction = normalizeVec3(particle.velocity, deterministicDirection(seed));
  particle.velocity = scaleVec3(direction, BASE_PARTICLE_SPEED);
};

const steerParticleThroughReleaseGradient = (
  particle: HeatCapacityHardSphereParticle,
  simulation: HeatCapacityHardSphereSimulation,
  flowDriveRatio: number,
  dtS: number,
) => {
  const outletProximity = getOutletProximity(simulation.container, particle.position);
  const drive = clampNumber(Math.sqrt(Math.max(0, flowDriveRatio)), 0, 1);
  const responseS = HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.approachResponseS *
    (1.18 - outletProximity * 0.42);
  const blend = 1 - Math.exp(-dtS / Math.max(0.001, responseS));
  const speedMultiplier = (
    HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.farApproachSpeedMultiplier +
    (
      HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.nearApproachSpeedMultiplier -
      HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.farApproachSpeedMultiplier
    ) * outletProximity
  ) * (0.82 + drive * 0.18);
  const outletDirection = getOutletAttractionDirection(simulation.container, particle.position);
  const targetVelocity = scaleVec3(outletDirection, BASE_PARTICLE_SPEED * speedMultiplier);
  particle.velocity.x += (targetVelocity.x - particle.velocity.x) * blend;
  particle.velocity.y += (targetVelocity.y - particle.velocity.y) * blend;
  particle.velocity.z += (targetVelocity.z - particle.velocity.z) * blend;
};

const recoverParticleVelocity = (
  particle: HeatCapacityHardSphereParticle,
  simulation: HeatCapacityHardSphereSimulation,
  dtS: number,
) => {
  const recoveryDelayS = Math.max(0, particle.releaseRecoveryDelayS ?? 0);
  if (recoveryDelayS > 0) {
    particle.releaseRecoveryDelayS = Math.max(0, recoveryDelayS - dtS);
    return;
  }
  const responseS = HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.recoveryResponseS;
  const blend = 1 - Math.exp(-dtS / Math.max(0.001, responseS));
  if (simulation.releaseRecoveryReason === 'pressure-balanced') {
    const outletDirection = getOutletAttractionDirection(simulation.container, particle.position);
    const thermalDirection = deterministicDirection(simulation.seed + particle.id * 37 + 17);
    const returnBias = HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.pressureBalancedReturnBias;
    const targetDirection = normalizeVec3({
      x: thermalDirection.x * (1 - returnBias) - outletDirection.x * returnBias,
      y: thermalDirection.y * (1 - returnBias) - outletDirection.y * returnBias,
      z: thermalDirection.z * (1 - returnBias) - outletDirection.z * returnBias,
    }, scaleVec3(outletDirection, -1));
    const targetVelocity = scaleVec3(targetDirection, BASE_PARTICLE_SPEED);
    particle.velocity.x += (targetVelocity.x - particle.velocity.x) * blend;
    particle.velocity.y += (targetVelocity.y - particle.velocity.y) * blend;
    particle.velocity.z += (targetVelocity.z - particle.velocity.z) * blend;
    return;
  }
  const speed = lengthVec3(particle.velocity);
  if (speed <= 0.000001) return;
  const nextSpeed = speed + (BASE_PARTICLE_SPEED - speed) * blend;
  particle.velocity = scaleVec3(particle.velocity, nextSpeed / speed);
};

const restoreFiniteParticle = (
  particle: HeatCapacityHardSphereParticle,
  container: HeatCapacityHardSphereContainer,
  radius: number,
  seed: number,
  allowContainerResample = true,
) => {
  const invalidPosition = !isFiniteVec3(particle.position);
  const outsideContainer = allowContainerResample &&
    !isHeatCapacityHardSphereInsideContainer(container, particle.position, radius);
  if (invalidPosition || outsideContainer) {
    particle.position = sampleHeatCapacityHardSpherePosition(container, radius, seed);
  }
  if (!isFiniteVec3(particle.velocity) || lengthVec3(particle.velocity) <= 0.000001) {
    particle.velocity = scaleVec3(deterministicDirection(seed + 13), BASE_PARTICLE_SPEED);
  }
};

const resolveInputExitSpeed = (
  input: HeatCapacityHardSphereSimulationStepInput,
) => {
  if (!Number.isFinite(input.releaseExitSpeed) || input.releaseExitSpeed <= 0) {
    return HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.exitSpeed;
  }
  return Math.max(0.4, input.releaseExitSpeed);
};

const resolveExitStaggerDelayS = (
  particle: HeatCapacityHardSphereParticle,
  order: number,
  batchSize: number,
) => {
  const maxDelayS = MAIN_RELEASE_STAGGER_MAX_S;
  if (maxDelayS <= 0 || batchSize <= 1 || order <= 0) return 0;
  const orderProgress = clampNumber(order / Math.max(batchSize - 1, 1), 0, 1);
  const stableJitter = (seededNoise(particle.id * 29.17 + batchSize * 3.11) - 0.5) * 0.22;
  return clampNumber((0.18 + orderProgress * 0.82 + stableJitter) * maxDelayS, 0, maxDelayS);
};

const startParticleExit = (
  particle: HeatCapacityHardSphereParticle,
  container: HeatCapacityHardSphereContainer,
  input: HeatCapacityHardSphereSimulationStepInput,
  order: number,
  batchSize: number,
) => {
  particle.state = 'exiting';
  particle.outflowProgress = Math.max(particle.outflowProgress, 0.12);
  const outletProximity = getOutletProximity(container, particle.position);
  particle.exitInertiaSpeed = resolveInputExitSpeed(input) * (0.74 + outletProximity * 0.26);
  particle.exitInertiaAgeS = 0;
  particle.exitDelayS = resolveExitStaggerDelayS(particle, order, batchSize);
  clearReleaseRecovery(particle);
};

const isSpawnPositionFree = (
  particles: HeatCapacityHardSphereParticle[],
  position: HeatCapacityHardSphereVec3,
  radius: number,
) => {
  const minDistanceSq = (radius * 2) ** 2;
  return particles.every((particle) => (
    particle.state === 'hidden' || distanceSq(particle.position, position) >= minDistanceSq
  ));
};

const spawnParticle = (
  particle: HeatCapacityHardSphereParticle,
  particles: HeatCapacityHardSphereParticle[],
  container: HeatCapacityHardSphereContainer,
  radius: number,
  seed: number,
  mode: 'initial' | 'pump',
) => {
  for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt += 1) {
    const attemptSeed = seed + particle.id * 101 + attempt * 17;
    const sampledPosition = sampleHeatCapacityHardSpherePosition(container, radius, attemptSeed);
    const position = mode === 'pump'
      ? clampPositionToContainer(container, {
          x: container.pumpPortPoint.x + (seededNoise(attemptSeed + 1.1) - 0.5) * radius * 1.8,
          y: container.pumpPortPoint.y + (seededNoise(attemptSeed + 2.1) - 0.5) * radius * 1.8,
          z: container.pumpPortPoint.z + (seededNoise(attemptSeed + 3.1) - 0.5) * radius * 1.8,
        }, radius)
      : sampledPosition;
    if (!isSpawnPositionFree(particles, position, radius)) continue;
    const pumpDirection = normalizeVec3({
      x: -container.pumpPortPoint.x + (seededNoise(attemptSeed + 4.1) - 0.5) * 0.16,
      y: -container.pumpPortPoint.y * 0.56 + (seededNoise(attemptSeed + 5.1) - 0.5) * 0.22,
      z: -container.pumpPortPoint.z * 0.56 + (seededNoise(attemptSeed + 6.1) - 0.5) * 0.22,
    }, deterministicDirection(attemptSeed));
    particle.position = position;
    particle.velocity = scaleVec3(
      mode === 'pump'
        ? pumpDirection
        : deterministicDirection(attemptSeed),
      BASE_PARTICLE_SPEED,
    );
    particle.outflowProgress = 0;
    clearExitInertia(particle);
    clearReleaseRecovery(particle);
    particle.state = mode === 'pump' ? 'entering' : 'inside';
    return true;
  }
  return false;
};

const reconcileParticleCount = (
  simulation: HeatCapacityHardSphereSimulation,
  input: HeatCapacityHardSphereSimulationStepInput,
): number => {
  const targetParticleCount = clampNumber(
    Math.round(input.targetParticleCount),
    0,
    simulation.maxParticles,
  );
  const reconcileDtS = clampNumber(
    Number.isFinite(input.dtS) ? input.dtS : 0,
    0,
    FIXED_DT_S * MAX_SUB_STEPS,
  );
  let visibleCount = simulation.particles.reduce((count, particle) => (
    count + (particle.state !== 'hidden' ? 1 : 0)
  ), 0);
  const insideCount = countParticlesByState(simulation.particles, 'inside');
  const fromPumpPort = input.pumpFlowActive || input.pumpFlowIntensity > 0;
  const releaseMinimumParticleCount = clampNumber(
    Math.round(Number.isFinite(input.releaseMinimumParticleCount) ? input.releaseMinimumParticleCount : 0),
    0,
    simulation.maxParticles,
  );
  const missingCount = targetParticleCount - visibleCount;
  const initialFill = visibleCount === 0;
  const rawPumpEntryRateScale = input.pumpEntryRateScale ?? 1;
  const pumpEntryRateScale = clampNumber(
    Number.isFinite(rawPumpEntryRateScale) ? rawPumpEntryRateScale : 1,
    0,
    2,
  );
  const spawnRate = fromPumpPort
    ? (
      PUMP_ENTRY_BASE_RATE_PER_S +
      PUMP_ENTRY_INTENSITY_RATE_PER_S * clampNumber(input.pumpFlowIntensity, 0, 1.6)
    ) * pumpEntryRateScale
    : 0;
  const spawnBudgetResult = initialFill
    ? { budget: Math.max(0, missingCount), accumulator: 0 }
    : consumeFlowBudget(missingCount, reconcileDtS, spawnRate, simulation.entryAccumulator);
  const spawnLimit = spawnBudgetResult.budget;
  simulation.entryAccumulator = spawnBudgetResult.accumulator;
  let spawnedCount = 0;

  while (visibleCount < targetParticleCount && spawnedCount < spawnLimit) {
    const particle = simulation.particles.find((item) => item.state === 'hidden');
    if (!particle) break;
    const spawned = spawnParticle(
      particle,
      simulation.particles,
      simulation.container,
      simulation.particleRadius,
      simulation.seed + visibleCount * 31 + simulation.lastSubStepCount,
      initialFill ? 'initial' : 'pump',
    );
    if (!spawned) break;
    visibleCount += 1;
    spawnedCount += 1;
  }

  const releaseExitBudget = Math.max(
    0,
    Number.isFinite(input.releaseExitBudget) ? input.releaseExitBudget : 0,
  );
  if (input.releaseFeedback.active && releaseExitBudget > 0) {
    const available = Math.max(0, simulation.exitAccumulator) + releaseExitBudget;
    const requestedTrimLimit = Math.floor(available);
    const releasableInsideCount = Math.max(0, insideCount - releaseMinimumParticleCount);
    const trimLimit = Math.min(releasableInsideCount, requestedTrimLimit);
    simulation.exitAccumulator = requestedTrimLimit > releasableInsideCount
      ? 0
      : clampNumber(available - trimLimit, 0, 0.999999);
    if (trimLimit <= 0) return 0;
    const sortedInside = simulation.particles
      .filter((particle) => particle.state === 'inside')
      .sort((left, right) => getOutletPriority(right, simulation.container) - getOutletPriority(left, simulation.container));
    const selectedInside = sortedInside.slice(0, trimLimit);
    for (let index = 0; index < selectedInside.length; index += 1) {
      const particle = selectedInside[index];
      if (!particle) continue;
      startParticleExit(particle, simulation.container, input, index, selectedInside.length);
    }
    return trimLimit;
  }

  simulation.exitAccumulator = 0;
  return 0;
};

const resolveParticleCollisions = (
  particles: HeatCapacityHardSphereParticle[],
  radius: number,
) => {
  const minDistance = radius * 2;
  const minDistanceSq = minDistance * minDistance;
  for (let iteration = 0; iteration < COLLISION_SOLVER_ITERATIONS; iteration += 1) {
    for (let leftIndex = 0; leftIndex < particles.length; leftIndex += 1) {
      const left = particles[leftIndex];
      if (!left || left.state !== 'inside') continue;
      for (let rightIndex = leftIndex + 1; rightIndex < particles.length; rightIndex += 1) {
        const right = particles[rightIndex];
        if (!right || right.state !== 'inside') continue;
        const dx = right.position.x - left.position.x;
        const dy = right.position.y - left.position.y;
        const dz = right.position.z - left.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq >= minDistanceSq) continue;
        const dist = Math.sqrt(Math.max(distSq, 0));
        const normal = dist <= 0.000001
          ? deterministicDirection(left.id * 31 + right.id * 47 + iteration)
          : { x: dx / dist, y: dy / dist, z: dz / dist };
        const overlap = minDistance - dist;
        const correction = overlap * 0.5 + 0.00001;
        left.position.x -= normal.x * correction;
        left.position.y -= normal.y * correction;
        left.position.z -= normal.z * correction;
        right.position.x += normal.x * correction;
        right.position.y += normal.y * correction;
        right.position.z += normal.z * correction;

        const relativeVelocity = {
          x: left.velocity.x - right.velocity.x,
          y: left.velocity.y - right.velocity.y,
          z: left.velocity.z - right.velocity.z,
        };
        const closingSpeed =
          relativeVelocity.x * normal.x +
          relativeVelocity.y * normal.y +
          relativeVelocity.z * normal.z;
        if (closingSpeed > 0) {
          left.velocity.x -= normal.x * closingSpeed;
          left.velocity.y -= normal.y * closingSpeed;
          left.velocity.z -= normal.z * closingSpeed;
          right.velocity.x += normal.x * closingSpeed;
          right.velocity.y += normal.y * closingSpeed;
          right.velocity.z += normal.z * closingSpeed;
        }
      }
    }
  }
};

const stepParticle = (
  particle: HeatCapacityHardSphereParticle,
  simulation: HeatCapacityHardSphereSimulation,
  input: HeatCapacityHardSphereSimulationStepInput,
  dtS: number,
) => {
  restoreFiniteParticle(
    particle,
    simulation.container,
    simulation.particleRadius,
    simulation.seed + particle.id,
    particle.state !== 'exiting',
  );
  if (particle.state === 'inside') {
    const jitterScale = 0.018 * dtS;
    particle.velocity.x += Math.sin(particle.id * 8.17 + particle.position.y * 2.1) * jitterScale;
    particle.velocity.y += Math.cos(particle.id * 6.73 + particle.position.z * 1.7) * jitterScale;
    particle.velocity.z += Math.sin(particle.id * 5.31 + particle.position.x * 1.9) * jitterScale;
    if (input.releaseFeedback.active) {
      steerParticleThroughReleaseGradient(
        particle,
        simulation,
        input.releaseFeedback.flowDriveRatio,
        dtS,
      );
    } else if (simulation.releaseRecoveryRemainingS > 0) {
      recoverParticleVelocity(particle, simulation, dtS);
    } else {
      resetVelocityMagnitude(particle, simulation.seed + particle.id);
    }

    const speedScale = clampNumber(input.thermalSpeedMultiplier, 0.1, 3);
    particle.position.x += particle.velocity.x * dtS * speedScale;
    particle.position.y += particle.velocity.y * dtS * speedScale;
    particle.position.z += particle.velocity.z * dtS * speedScale;
    resolveHeatCapacityHardSphereWallBounce(simulation.container, particle, simulation.particleRadius);
  } else if (particle.state === 'entering') {
    const entryDirection = normalizeVec3(particle.velocity, {
      x: -simulation.container.pumpPortPoint.x,
      y: -simulation.container.pumpPortPoint.y * 0.56,
      z: -simulation.container.pumpPortPoint.z * 0.56,
    });
    const entrySpeed = 1.35 + clampNumber(input.pumpFlowIntensity, 0, 1.6) * 0.62;
    particle.velocity = scaleVec3(entryDirection, BASE_PARTICLE_SPEED);
    particle.position.x += entryDirection.x * dtS * entrySpeed;
    particle.position.y += entryDirection.y * dtS * entrySpeed;
    particle.position.z += entryDirection.z * dtS * entrySpeed;
    particle.outflowProgress = clampNumber(particle.outflowProgress + dtS * (2.4 + entrySpeed), 0, 1);
    resolveHeatCapacityHardSphereWallBounce(simulation.container, particle, simulation.particleRadius);
    const entryDistance = Math.sqrt(distanceSq(particle.position, simulation.container.pumpPortPoint));
    if (particle.outflowProgress >= 0.28 || entryDistance >= simulation.particleRadius * 4.5) {
      particle.state = 'inside';
      particle.outflowProgress = 0;
      clearExitInertia(particle);
      const thermalMix = deterministicDirection(simulation.seed + particle.id * 19);
      particle.velocity = scaleVec3(normalizeVec3({
        x: entryDirection.x * 0.55 + thermalMix.x * 0.45,
        y: entryDirection.y * 0.55 + thermalMix.y * 0.45,
        z: entryDirection.z * 0.55 + thermalMix.z * 0.45,
      }, thermalMix), BASE_PARTICLE_SPEED);
    }
  } else if (particle.state === 'exiting') {
    const releaseFeedbackStopped = !input.releaseFeedback.active;
    const crossedOutletBeforeStep = hasParticleCrossedOutlet(particle, simulation);
    if (releaseFeedbackStopped && !crossedOutletBeforeStep) {
      particle.state = 'inside';
      particle.outflowProgress = 0;
      clearExitInertia(particle);
      return;
    }
    const delayS = clampNumber(particle.exitDelayS ?? 0, 0, 2);
    if (delayS > 0) {
      particle.exitDelayS = Math.max(0, delayS - dtS);
      if (delayS >= dtS) return;
    }
    const activeDtS = delayS > 0 ? dtS - delayS : dtS;
    const inputExitSpeed = resolveInputExitSpeed(input);
    const storedExitSpeed = Number.isFinite(particle.exitInertiaSpeed ?? 0) && (particle.exitInertiaSpeed ?? 0) > 0
      ? particle.exitInertiaSpeed ?? inputExitSpeed
      : inputExitSpeed;
    const exitInertiaAgeS = Math.max(0, particle.exitInertiaAgeS ?? 0);
    const releaseIntensity = input.releaseFeedback.intensity;
    const activeExitSpeed = storedExitSpeed * (0.82 + clampNumber(releaseIntensity, 0, 1) * 0.18);
    const coastScale = releaseFeedbackStopped
      ? Math.max(0.38, Math.exp(-exitInertiaAgeS / 0.22))
      : 1;
    const exitSpeed = activeExitSpeed * coastScale;
    const exitDirection = crossedOutletBeforeStep
      ? simulation.container.outletDirection
      : getOutletAttractionDirection(simulation.container, particle.position);
    particle.velocity = scaleVec3(exitDirection, exitSpeed);
    particle.position.x += particle.velocity.x * activeDtS;
    particle.position.y += particle.velocity.y * activeDtS;
    particle.position.z += particle.velocity.z * activeDtS;
    const progressRate = exitSpeed * HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.exitProgressScale;
    particle.outflowProgress = clampNumber(
      particle.outflowProgress + activeDtS * progressRate,
      0,
      1,
    );
    const nextExitInertiaAgeS = exitInertiaAgeS + activeDtS;
    particle.exitInertiaAgeS = nextExitInertiaAgeS;
    const crossedOutletAfterStep = hasParticleCrossedOutlet(particle, simulation);
    const visibleLongEnough = nextExitInertiaAgeS >=
      HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.minimumVisibleExitS;
    const reachedExitTail = particle.outflowProgress >= 1 ||
      getOutletSignedDistance(simulation.container, particle.position) > getExitOcclusionOffset(simulation);
    if (crossedOutletAfterStep && visibleLongEnough && reachedExitTail) {
      particle.state = 'hidden';
      particle.outflowProgress = 0;
      clearExitInertia(particle);
    }
  }
};

export const createHeatCapacityHardSphereSimulation = (
  options: HeatCapacityHardSphereSimulationOptions,
): HeatCapacityHardSphereSimulation => ({
  particles: Array.from({ length: options.maxParticles }, (_, id) => ({
    id,
    position: sampleHeatCapacityHardSpherePosition(options.container, options.particleRadius, options.seed + id * 29),
    velocity: scaleVec3(deterministicDirection(options.seed + id * 41), BASE_PARTICLE_SPEED),
    state: 'hidden',
    outflowProgress: 0,
    exitInertiaSpeed: 0,
    exitInertiaAgeS: 0,
    exitDelayS: 0,
    releaseRecoveryDelayS: 0,
  })),
  maxParticles: options.maxParticles,
  particleRadius: options.particleRadius,
  container: options.container,
  accumulatorS: 0,
  entryAccumulator: 0,
  exitAccumulator: 0,
  lastSubStepCount: 0,
  seed: options.seed,
  releaseRecoveryRemainingS: 0,
  releaseRecoveryReason: 'none',
});

export const stepHeatCapacityHardSphereSimulation = (
  simulation: HeatCapacityHardSphereSimulation,
  input: HeatCapacityHardSphereSimulationStepInput,
): HeatCapacityHardSphereSimulationStepResult => {
  const acceptedReleaseExitCount = reconcileParticleCount(simulation, input);
  if (input.releaseJustStopped) {
    beginReleaseRecovery(
      simulation,
      input.releaseFeedback.stopReason,
    );
  } else if (input.releaseFeedback.active) {
    simulation.releaseRecoveryRemainingS = 0;
    simulation.releaseRecoveryReason = 'none';
  }
  const safeDtS = clampNumber(Number.isFinite(input.dtS) ? input.dtS : 0, 0, FIXED_DT_S * MAX_SUB_STEPS);
  simulation.accumulatorS = clampNumber(simulation.accumulatorS + safeDtS, 0, FIXED_DT_S * MAX_SUB_STEPS);
  simulation.lastSubStepCount = 0;
  while (simulation.accumulatorS >= FIXED_DT_S && simulation.lastSubStepCount < MAX_SUB_STEPS) {
    for (const particle of simulation.particles) {
      if (particle.state === 'hidden') continue;
      stepParticle(particle, simulation, input, FIXED_DT_S);
    }
    resolveParticleCollisions(simulation.particles, simulation.particleRadius);
    for (const particle of simulation.particles) {
      if (particle.state !== 'inside') continue;
      resolveHeatCapacityHardSphereWallBounce(simulation.container, particle, simulation.particleRadius);
    }
    if (simulation.releaseRecoveryRemainingS > 0) {
      simulation.releaseRecoveryRemainingS = Math.max(
        0,
        simulation.releaseRecoveryRemainingS - FIXED_DT_S,
      );
      if (simulation.releaseRecoveryRemainingS === 0) {
        simulation.releaseRecoveryReason = 'none';
      }
    }
    simulation.accumulatorS -= FIXED_DT_S;
    simulation.lastSubStepCount += 1;
  }
  simulation.seed += simulation.lastSubStepCount + 1;
  return {
    acceptedReleaseExitCount,
  };
};
