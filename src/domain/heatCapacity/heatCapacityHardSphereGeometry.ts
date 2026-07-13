export interface HeatCapacityHardSphereVec3 {
  x: number;
  y: number;
  z: number;
}

export type HeatCapacityHardSphereParticleState = 'inside' | 'entering' | 'exiting' | 'hidden';

export interface HeatCapacityHardSphereParticle {
  id: number;
  position: HeatCapacityHardSphereVec3;
  velocity: HeatCapacityHardSphereVec3;
  state: HeatCapacityHardSphereParticleState;
  outflowProgress: number;
  exitInertiaSpeed?: number;
  exitInertiaAgeS?: number;
  exitDelayS?: number;
  releaseRecoveryDelayS?: number;
}

export interface HeatCapacityHardSphereBoxContainer {
  kind: 'box';
  halfSize: HeatCapacityHardSphereVec3;
  outletPoint: HeatCapacityHardSphereVec3;
  outletDirection: HeatCapacityHardSphereVec3;
  pumpPortPoint: HeatCapacityHardSphereVec3;
}

export interface HeatCapacityHardSphereCylinderContainer {
  kind: 'cylinder';
  radius: number;
  halfHeight: number;
  outletPoint: HeatCapacityHardSphereVec3;
  outletDirection: HeatCapacityHardSphereVec3;
  pumpPortPoint: HeatCapacityHardSphereVec3;
}

export type HeatCapacityHardSphereContainer =
  | HeatCapacityHardSphereBoxContainer
  | HeatCapacityHardSphereCylinderContainer;

const cloneVec3 = (value: HeatCapacityHardSphereVec3): HeatCapacityHardSphereVec3 => ({
  x: value.x,
  y: value.y,
  z: value.z,
});

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const seededNoise = (value: number) => {
  const raw = Math.sin(value) * 43758.5453;
  return raw - Math.floor(raw);
};

const finiteOrZero = (value: number) => (
  Number.isFinite(value) ? value : 0
);

const normalizeVec3 = (value: HeatCapacityHardSphereVec3): HeatCapacityHardSphereVec3 => {
  const x = finiteOrZero(value.x);
  const y = finiteOrZero(value.y);
  const z = finiteOrZero(value.z);
  const length = Math.hypot(x, y, z);
  if (length <= 0.000001) return { x: 0, y: 1, z: 0 };
  return {
    x: x / length,
    y: y / length,
    z: z / length,
  };
};

export const createHeatCapacityHardSphereBoxContainer = (input: {
  halfSize: HeatCapacityHardSphereVec3;
  outletPoint: HeatCapacityHardSphereVec3;
  outletDirection: HeatCapacityHardSphereVec3;
  pumpPortPoint: HeatCapacityHardSphereVec3;
}): HeatCapacityHardSphereBoxContainer => ({
  kind: 'box',
  halfSize: cloneVec3(input.halfSize),
  outletPoint: cloneVec3(input.outletPoint),
  outletDirection: normalizeVec3(input.outletDirection),
  pumpPortPoint: cloneVec3(input.pumpPortPoint),
});

export const createHeatCapacityHardSphereCylinderContainer = (input: {
  radius: number;
  halfHeight: number;
  outletPoint: HeatCapacityHardSphereVec3;
  outletDirection: HeatCapacityHardSphereVec3;
  pumpPortPoint: HeatCapacityHardSphereVec3;
}): HeatCapacityHardSphereCylinderContainer => ({
  kind: 'cylinder',
  radius: Math.max(0, finiteOrZero(input.radius)),
  halfHeight: Math.max(0, finiteOrZero(input.halfHeight)),
  outletPoint: cloneVec3(input.outletPoint),
  outletDirection: normalizeVec3(input.outletDirection),
  pumpPortPoint: cloneVec3(input.pumpPortPoint),
});

export const isHeatCapacityHardSphereInsideContainer = (
  container: HeatCapacityHardSphereContainer,
  position: HeatCapacityHardSphereVec3,
  radius: number,
) => {
  if (container.kind === 'cylinder') {
    const usableRadius = Math.max(0, container.radius - radius);
    const usableY = Math.max(0, container.halfHeight - radius);
    return (
      Math.hypot(position.x, position.z) <= usableRadius + 0.000001 &&
      Math.abs(position.y) <= usableY + 0.000001
    );
  }
  const usableX = Math.max(0, container.halfSize.x - radius);
  const usableY = Math.max(0, container.halfSize.y - radius);
  const usableZ = Math.max(0, container.halfSize.z - radius);
  return (
    Math.abs(position.x) <= usableX + 0.000001 &&
    Math.abs(position.y) <= usableY + 0.000001 &&
    Math.abs(position.z) <= usableZ + 0.000001
  );
};

export const sampleHeatCapacityHardSpherePosition = (
  container: HeatCapacityHardSphereContainer,
  radius: number,
  seed: number,
): HeatCapacityHardSphereVec3 => {
  if (container.kind === 'cylinder') {
    const usableRadius = Math.max(0, container.radius - radius);
    const usableY = Math.max(0, container.halfHeight - radius);
    const angle = seededNoise(seed * 19.871 + 0.41) * Math.PI * 2;
    const radial = Math.sqrt(seededNoise(seed * 61.541 + 0.67)) * usableRadius;
    return {
      x: Math.cos(angle) * radial,
      y: (seededNoise(seed * 78.233 + 0.57) * 2 - 1) * usableY,
      z: Math.sin(angle) * radial,
    };
  }
  const usableX = Math.max(0, container.halfSize.x - radius);
  const usableY = Math.max(0, container.halfSize.y - radius);
  const usableZ = Math.max(0, container.halfSize.z - radius);
  return {
    x: (seededNoise(seed * 12.9898 + 0.31) * 2 - 1) * usableX,
    y: (seededNoise(seed * 78.233 + 0.57) * 2 - 1) * usableY,
    z: (seededNoise(seed * 37.719 + 0.83) * 2 - 1) * usableZ,
  };
};

export const resolveHeatCapacityHardSphereWallBounce = (
  container: HeatCapacityHardSphereContainer,
  particle: HeatCapacityHardSphereParticle,
  radius: number,
) => {
  if (container.kind === 'cylinder') {
    const usableRadius = Math.max(0, container.radius - radius);
    const usableY = Math.max(0, container.halfHeight - radius);
    const positionY = finiteOrZero(particle.position.y);
    particle.position.y = clampNumber(positionY, -usableY, usableY);
    if (positionY > usableY && particle.velocity.y > 0) {
      particle.velocity.y = -Math.abs(particle.velocity.y);
    } else if (positionY < -usableY && particle.velocity.y < 0) {
      particle.velocity.y = Math.abs(particle.velocity.y);
    }

    const positionX = finiteOrZero(particle.position.x);
    const positionZ = finiteOrZero(particle.position.z);
    const radialDistance = Math.hypot(positionX, positionZ);
    if (radialDistance > usableRadius && radialDistance > 0.000001) {
      const normalX = positionX / radialDistance;
      const normalZ = positionZ / radialDistance;
      particle.position.x = normalX * usableRadius;
      particle.position.z = normalZ * usableRadius;
      const radialVelocity = particle.velocity.x * normalX + particle.velocity.z * normalZ;
      if (radialVelocity > 0) {
        particle.velocity.x -= 2 * radialVelocity * normalX;
        particle.velocity.z -= 2 * radialVelocity * normalZ;
      }
    } else if (usableRadius <= 0) {
      particle.position.x = 0;
      particle.position.z = 0;
    } else {
      particle.position.x = positionX;
      particle.position.z = positionZ;
    }
    return;
  }
  const limits = {
    x: Math.max(0, container.halfSize.x - radius),
    y: Math.max(0, container.halfSize.y - radius),
    z: Math.max(0, container.halfSize.z - radius),
  };
  for (const axis of ['x', 'y', 'z'] as const) {
    const limit = limits[axis];
    const position = finiteOrZero(particle.position[axis]);
    particle.position[axis] = clampNumber(position, -limit, limit);
    if (position > limit && particle.velocity[axis] > 0) {
      particle.velocity[axis] = -Math.abs(particle.velocity[axis]);
    } else if (position < -limit && particle.velocity[axis] < 0) {
      particle.velocity[axis] = Math.abs(particle.velocity[axis]);
    }
  }
};
