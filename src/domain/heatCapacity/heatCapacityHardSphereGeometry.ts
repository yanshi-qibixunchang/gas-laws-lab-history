export interface HeatCapacityHardSphereVec3 {
  x: number;
  y: number;
  z: number;
}

export type HeatCapacityHardSphereParticleState = 'inside' | 'exiting' | 'hidden';

export interface HeatCapacityHardSphereParticle {
  id: number;
  position: HeatCapacityHardSphereVec3;
  velocity: HeatCapacityHardSphereVec3;
  state: HeatCapacityHardSphereParticleState;
  outflowProgress: number;
}

export interface HeatCapacityHardSphereBoxContainer {
  kind: 'box';
  halfSize: HeatCapacityHardSphereVec3;
  outletPoint: HeatCapacityHardSphereVec3;
  outletDirection: HeatCapacityHardSphereVec3;
  pumpPortPoint: HeatCapacityHardSphereVec3;
}

export type HeatCapacityHardSphereContainer = HeatCapacityHardSphereBoxContainer;

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

export const isHeatCapacityHardSphereInsideContainer = (
  container: HeatCapacityHardSphereContainer,
  position: HeatCapacityHardSphereVec3,
  radius: number,
) => {
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
