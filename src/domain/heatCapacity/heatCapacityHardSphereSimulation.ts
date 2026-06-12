import {
  isHeatCapacityHardSphereInsideContainer,
  resolveHeatCapacityHardSphereWallBounce,
  sampleHeatCapacityHardSpherePosition,
  type HeatCapacityHardSphereContainer,
  type HeatCapacityHardSphereParticle,
  type HeatCapacityHardSphereVec3,
} from './heatCapacityHardSphereGeometry.ts';

export interface HeatCapacityHardSphereSimulation {
  particles: HeatCapacityHardSphereParticle[];
  maxParticles: number;
  particleRadius: number;
  container: HeatCapacityHardSphereContainer;
  accumulatorS: number;
  lastSubStepCount: number;
  seed: number;
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
  outflowActive: boolean;
  outflowDriftSpeed: number;
  exitSelectionRate: number;
  pumpFlowActive: boolean;
  pumpFlowIntensity: number;
}

const FIXED_DT_S = 1 / 120;
const MAX_SUB_STEPS = 5;
const BASE_PARTICLE_SPEED = 0.54;
const SPAWN_ATTEMPTS = 24;
const COLLISION_SOLVER_ITERATIONS = 2;
const EXIT_OCCLUSION_OFFSET = 0.08;

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

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

const countParticlesByState = (
  particles: HeatCapacityHardSphereParticle[],
  state: HeatCapacityHardSphereParticle['state'],
) => particles.reduce((count, particle) => count + (particle.state === state ? 1 : 0), 0);

const resetVelocityMagnitude = (
  particle: HeatCapacityHardSphereParticle,
  seed: number,
) => {
  const direction = normalizeVec3(particle.velocity, deterministicDirection(seed));
  particle.velocity = scaleVec3(direction, BASE_PARTICLE_SPEED);
};

const restoreFiniteParticle = (
  particle: HeatCapacityHardSphereParticle,
  container: HeatCapacityHardSphereContainer,
  radius: number,
  seed: number,
) => {
  if (!isFiniteVec3(particle.position) || !isHeatCapacityHardSphereInsideContainer(container, particle.position, radius)) {
    particle.position = sampleHeatCapacityHardSpherePosition(container, radius, seed);
  }
  if (!isFiniteVec3(particle.velocity) || lengthVec3(particle.velocity) <= 0.000001) {
    particle.velocity = scaleVec3(deterministicDirection(seed + 13), BASE_PARTICLE_SPEED);
  }
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
  fromPumpPort: boolean,
) => {
  for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt += 1) {
    const attemptSeed = seed + particle.id * 101 + attempt * 17;
    const sampledPosition = sampleHeatCapacityHardSpherePosition(container, radius, attemptSeed);
    const position = fromPumpPort
      ? {
          x: clampNumber(
            container.pumpPortPoint.x + (seededNoise(attemptSeed + 1.1) - 0.5) * radius * 2.4,
            -container.halfSize.x + radius,
            container.halfSize.x - radius,
          ),
          y: clampNumber(
            container.pumpPortPoint.y + (sampledPosition.y - container.pumpPortPoint.y) * 0.18,
            -container.halfSize.y + radius,
            container.halfSize.y - radius,
          ),
          z: clampNumber(
            container.pumpPortPoint.z + (sampledPosition.z - container.pumpPortPoint.z) * 0.22,
            -container.halfSize.z + radius,
            container.halfSize.z - radius,
          ),
        }
      : sampledPosition;
    if (!isSpawnPositionFree(particles, position, radius)) continue;
    particle.position = position;
    particle.velocity = scaleVec3(
      fromPumpPort
        ? normalizeVec3({
            x: -container.pumpPortPoint.x,
            y: (seededNoise(attemptSeed + 3.1) - 0.5) * 0.5,
            z: -container.pumpPortPoint.z,
          }, deterministicDirection(attemptSeed))
        : deterministicDirection(attemptSeed),
      BASE_PARTICLE_SPEED,
    );
    particle.outflowProgress = 0;
    particle.state = 'inside';
    return true;
  }
  return false;
};

const reconcileParticleCount = (
  simulation: HeatCapacityHardSphereSimulation,
  input: HeatCapacityHardSphereSimulationStepInput,
) => {
  const targetParticleCount = clampNumber(
    Math.round(input.targetParticleCount),
    0,
    simulation.maxParticles,
  );
  let visibleCount = simulation.particles.reduce((count, particle) => (
    count + (particle.state !== 'hidden' ? 1 : 0)
  ), 0);
  const insideCount = countParticlesByState(simulation.particles, 'inside');
  const fromPumpPort = input.pumpFlowActive || input.pumpFlowIntensity > 0;

  while (visibleCount < targetParticleCount) {
    const particle = simulation.particles.find((item) => item.state === 'hidden');
    if (!particle) break;
    const spawned = spawnParticle(
      particle,
      simulation.particles,
      simulation.container,
      simulation.particleRadius,
      simulation.seed + visibleCount * 31 + simulation.lastSubStepCount,
      fromPumpPort,
    );
    if (!spawned) break;
    visibleCount += 1;
  }

  if (visibleCount <= targetParticleCount) return;

  const excess = visibleCount - targetParticleCount;
  const sortedInside = simulation.particles
    .filter((particle) => particle.state === 'inside')
    .sort((left, right) => (
      distanceSq(left.position, options.container.outletPoint) -
      distanceSq(right.position, options.container.outletPoint)
    ));
  for (const particle of sortedInside.slice(0, Math.min(excess, insideCount))) {
    if (input.outflowActive) {
      particle.state = 'exiting';
      particle.outflowProgress = Math.max(particle.outflowProgress, 0.12);
    } else {
      particle.state = 'hidden';
      particle.outflowProgress = 0;
    }
  }
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
  restoreFiniteParticle(particle, simulation.container, simulation.particleRadius, simulation.seed + particle.id);
  if (particle.state === 'inside') {
    const jitterScale = 0.018 * dtS;
    particle.velocity.x += Math.sin(particle.id * 8.17 + particle.position.y * 2.1) * jitterScale;
    particle.velocity.y += Math.cos(particle.id * 6.73 + particle.position.z * 1.7) * jitterScale;
    particle.velocity.z += Math.sin(particle.id * 5.31 + particle.position.x * 1.9) * jitterScale;
    resetVelocityMagnitude(particle, simulation.seed + particle.id);

    if (input.outflowActive && input.outflowDriftSpeed > 0) {
      const toOutlet = normalizeVec3({
        x: simulation.container.outletPoint.x - particle.position.x,
        y: simulation.container.outletPoint.y - particle.position.y,
        z: simulation.container.outletPoint.z - particle.position.z,
      }, simulation.container.outletDirection);
      const drift = input.outflowDriftSpeed * dtS * 0.72;
      particle.velocity.x += toOutlet.x * drift;
      particle.velocity.y += toOutlet.y * drift;
      particle.velocity.z += toOutlet.z * drift;
      resetVelocityMagnitude(particle, simulation.seed + particle.id + 23);
    }

    const speedScale = clampNumber(input.thermalSpeedMultiplier, 0.1, 3);
    particle.position.x += particle.velocity.x * dtS * speedScale;
    particle.position.y += particle.velocity.y * dtS * speedScale;
    particle.position.z += particle.velocity.z * dtS * speedScale;
    resolveHeatCapacityHardSphereWallBounce(simulation.container, particle, simulation.particleRadius);
  } else if (particle.state === 'exiting') {
    const exitSpeed = 0.9 + clampNumber(input.outflowDriftSpeed + input.exitSelectionRate, 0, 3) * 0.45;
    particle.velocity = scaleVec3(simulation.container.outletDirection, BASE_PARTICLE_SPEED);
    particle.position.x += simulation.container.outletDirection.x * dtS * exitSpeed;
    particle.position.y += simulation.container.outletDirection.y * dtS * exitSpeed;
    particle.position.z += simulation.container.outletDirection.z * dtS * exitSpeed;
    particle.outflowProgress = clampNumber(particle.outflowProgress + dtS * (1.8 + exitSpeed), 0, 1);
    const occlusionY = simulation.container.halfSize.y + EXIT_OCCLUSION_OFFSET;
    if (particle.outflowProgress >= 1 || particle.position.y > occlusionY) {
      particle.state = 'hidden';
      particle.outflowProgress = 0;
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
  })),
  maxParticles: options.maxParticles,
  particleRadius: options.particleRadius,
  container: options.container,
  accumulatorS: 0,
  lastSubStepCount: 0,
  seed: options.seed,
});

export const getHeatCapacityHardSphereVisibleParticles = (
  simulation: HeatCapacityHardSphereSimulation,
) => simulation.particles.filter((particle) => particle.state !== 'hidden');

export const stepHeatCapacityHardSphereSimulation = (
  simulation: HeatCapacityHardSphereSimulation,
  input: HeatCapacityHardSphereSimulationStepInput,
) => {
  reconcileParticleCount(simulation, input);
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
    simulation.accumulatorS -= FIXED_DT_S;
    simulation.lastSubStepCount += 1;
  }
  simulation.seed += simulation.lastSubStepCount + 1;
};
