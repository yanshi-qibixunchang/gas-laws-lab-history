import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
  clampNumber,
  getHeatCapacityHardSphereVisualState,
  type HeatCapacityHardSpherePumpBulbState,
  type HeatCapacityHardSphereVisualState,
} from '../../domain/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  resolveHeatCapacityHardSphereTemperatureColor,
  type HeatCapacityHardSphereSceneTheme,
} from '../../domain/heatCapacity/heatCapacityHardSphereColor.ts';

interface HeatCapacityHardSphereLayerProps {
  enabled: boolean;
  sceneTheme: HeatCapacityHardSphereSceneTheme;
  powerOn: boolean;
  temperatureMv: number | null;
  pressureMv: number | null;
  pressureDeltaKPa?: number;
  gasAmountRatio?: number;
  gasTemperatureK?: number;
  ambientTemperatureK?: number;
  phase: string;
  manualStep?: string | null;
  releaseFlowActive?: boolean;
  releaseProgress?: number;
  stopcockFlowOpen?: boolean;
  glassStopcockOpen: boolean;
  pumpValveOpen: boolean;
  pumpBulbState: HeatCapacityHardSpherePumpBulbState;
  pumpFlowActive?: boolean;
  pumpFlowIntensity?: number;
  particleMultiplier?: number;
  speedMultiplier?: number;
}

interface ParticleSeed {
  position: [number, number, number];
  velocity: [number, number, number];
  outflowBias: number;
}

interface ParticleMotionState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  outflowProgress: number;
  exiting: boolean;
  exited: boolean;
}

const BOTTLE_INNER_HALF_SIZE = new THREE.Vector3(0.73, 0.73, 0.73);
const PARTICLE_RADIUS = 0.048;
const OUTLET_EXIT_DIRECTION = new THREE.Vector3(0, 1, 0);
const OUTLET_APPROACH_POINT = new THREE.Vector3(0, BOTTLE_INNER_HALF_SIZE.y - PARTICLE_RADIUS * 0.35, 0);
const OUTLET_CAPTURE_RADIUS = 1.45;
const OUTLET_OCCLUSION_Y = BOTTLE_INNER_HALF_SIZE.y + 0.08;
const RELEASE_EXIT_RATE_PER_S = 504;
const RELEASE_REPLENISH_RATE_PER_S = 240;
const RELEASE_VISUAL_TAIL_S = 0.2;
const PARTICLE_SPAWN_RATE_PER_S = 58;
const PUMP_PARTICLE_SPAWN_RATE_PER_S = 228;
const dummyObject = new THREE.Object3D();
const neutralParticleMaterialColor = new THREE.Color('#ffffff');
const hardSphereParticlePalettes = {
  dark: {
    material: '#ffffff',
    emissive: '#22d3ee',
    emissiveBase: 0.24,
    emissiveScale: 0.34,
    opacityBase: 0.88,
    opacityScale: 0.08,
  },
  light: {
    material: '#ffffff',
    emissive: '#06a6bd',
    emissiveBase: 0.36,
    emissiveScale: 0.38,
    opacityBase: 0.93,
    opacityScale: 0.06,
  },
} as const;
const hiddenParticleColor = new THREE.Color('#000000');
const scratchParticleColor = new THREE.Color();
const scratchVisualTemperatureColor = new THREE.Color();
const scratchOutletDirection = new THREE.Vector3();

const seededNoise = (value: number) => {
  const raw = Math.sin(value) * 43758.5453;
  return raw - Math.floor(raw);
};

const createParticles = (count: number): ParticleSeed[] => (
  Array.from({ length: count }, (_, index) => {
    const a = index * 12.9898;
    const b = index * 78.233;
    const c = index * 37.719;
    const velocity = new THREE.Vector3(
      seededNoise(a + 9.7) - 0.5,
      seededNoise(b + 4.3) - 0.5,
      seededNoise(c + 6.1) - 0.5,
    ).normalize();

    return {
      position: [
        (seededNoise(a) - 0.5) * BOTTLE_INNER_HALF_SIZE.x * 1.62,
        (seededNoise(b) - 0.5) * BOTTLE_INNER_HALF_SIZE.y * 1.58,
        (seededNoise(c) - 0.5) * BOTTLE_INNER_HALF_SIZE.z * 1.62,
      ],
      velocity: [velocity.x, velocity.y, velocity.z],
      outflowBias: seededNoise(a + b + c),
    };
  })
);

const createMotionState = (particle: ParticleSeed) => ({
  position: new THREE.Vector3(...particle.position),
  velocity: new THREE.Vector3(...particle.velocity).multiplyScalar(0.54),
  outflowProgress: 0,
  exiting: false,
  exited: true,
});

const getOutletProximity = (position: THREE.Vector3) => {
  const distance = position.distanceTo(OUTLET_APPROACH_POINT);
  return clampNumber(1 - distance / OUTLET_CAPTURE_RADIUS, 0, 1);
};

const getOutletAttractionDirection = (
  position: THREE.Vector3,
  target: THREE.Vector3,
) => {
  target.subVectors(OUTLET_APPROACH_POINT, position);
  if (target.lengthSq() < 0.000001) {
    target.copy(OUTLET_EXIT_DIRECTION);
  } else {
    target.normalize();
    const upwardBlend = clampNumber(getOutletProximity(position) * 0.52, 0.08, 0.62);
    target.lerp(OUTLET_EXIT_DIRECTION, upwardBlend).normalize();
  }
  return target;
};

const getOutletPriority = (
  motion: ParticleMotionState,
  particle: ParticleSeed,
) => {
  const heightFactor = clampNumber(
    (motion.position.y + BOTTLE_INNER_HALF_SIZE.y) / (BOTTLE_INNER_HALF_SIZE.y * 2),
    0,
    1,
  );
  const radialDistance = Math.hypot(
    motion.position.x - OUTLET_APPROACH_POINT.x,
    motion.position.z - OUTLET_APPROACH_POINT.z,
  );
  const radialFactor = clampNumber(1 - radialDistance / OUTLET_CAPTURE_RADIUS, 0, 1);
  const directionFactor = clampNumber(
    motion.velocity.dot(getOutletAttractionDirection(motion.position, scratchOutletDirection)),
    0,
    1,
  );
  return heightFactor * 0.48 + radialFactor * 0.28 + directionFactor * 0.14 + particle.outflowBias * 0.1;
};

const resolveWallBounce = (
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  radius: number,
) => {
  for (const axis of ['x', 'y', 'z'] as const) {
    const limit = BOTTLE_INNER_HALF_SIZE[axis] - radius;
    if (position[axis] > limit) {
      position[axis] = limit;
      velocity[axis] = -Math.abs(velocity[axis]);
    } else if (position[axis] < -limit) {
      position[axis] = -limit;
      velocity[axis] = Math.abs(velocity[axis]);
    }
  }
};

const resetParticleInsideBottle = (
  motion: ParticleMotionState,
  particle: ParticleSeed,
  fromPumpPort: boolean,
) => {
  if (fromPumpPort) {
    motion.position.set(-0.67, 0.28 + particle.position[1] * 0.18, 0.26 + particle.position[2] * 0.2);
    motion.velocity.set(0.68, particle.velocity[1] * 0.42, particle.velocity[2] * 0.42).normalize().multiplyScalar(0.54);
  } else {
    motion.position.set(particle.position[0], particle.position[1], particle.position[2]);
    motion.velocity.set(particle.velocity[0], particle.velocity[1], particle.velocity[2]).multiplyScalar(0.54);
  }
  motion.outflowProgress = 0;
  motion.exiting = false;
  motion.exited = false;
};

const applyVisualMaterial = (
  material: THREE.MeshStandardMaterial | null,
  visualState: HeatCapacityHardSphereVisualState,
  particleColors: ReturnType<typeof createParticleColors>,
  sceneTheme: HeatCapacityHardSphereSceneTheme,
) => {
  if (!material) return;
  const visualTemperatureColor = scratchVisualTemperatureColor.set(resolveHeatCapacityHardSphereTemperatureColor(sceneTheme, visualState.temperatureColorFactor));
  material.color.copy(neutralParticleMaterialColor);
  material.emissive.copy(visualTemperatureColor);
  material.emissiveIntensity = clampNumber(
    particleColors.emissiveBase + visualState.emissiveIntensity * particleColors.emissiveScale,
    particleColors.emissiveBase,
    particleColors.emissiveBase + particleColors.emissiveScale,
  );
  material.opacity = clampNumber(
    particleColors.opacityBase + visualState.emissiveIntensity * particleColors.opacityScale,
    particleColors.opacityBase,
    particleColors.opacityBase + particleColors.opacityScale,
  );
  material.needsUpdate = true;
};

const getParticleColor = (
  visualState: HeatCapacityHardSphereVisualState,
  sceneTheme: HeatCapacityHardSphereSceneTheme,
) => {
  const temperatureColor = scratchVisualTemperatureColor.set(resolveHeatCapacityHardSphereTemperatureColor(sceneTheme, visualState.temperatureColorFactor));
  return scratchParticleColor.copy(temperatureColor);
};

const createParticleColors = (sceneTheme: HeatCapacityHardSphereLayerProps['sceneTheme']) => {
  const palette = hardSphereParticlePalettes[sceneTheme];
  return {
    material: new THREE.Color(palette.material),
    emissive: new THREE.Color(palette.emissive),
    emissiveBase: palette.emissiveBase,
    emissiveScale: palette.emissiveScale,
    opacityBase: palette.opacityBase,
    opacityScale: palette.opacityScale,
  };
};

const HeatCapacityHardSphereLayer: React.FC<HeatCapacityHardSphereLayerProps> = ({
  enabled,
  sceneTheme,
  powerOn,
  temperatureMv,
  pressureMv,
  pressureDeltaKPa,
  gasAmountRatio,
  gasTemperatureK,
  ambientTemperatureK,
  phase,
  manualStep = null,
  releaseFlowActive = false,
  releaseProgress = 0,
  stopcockFlowOpen = false,
  glassStopcockOpen,
  pumpValveOpen,
  pumpBulbState,
  pumpFlowActive = false,
  pumpFlowIntensity = 0,
  particleMultiplier = 1,
  speedMultiplier = 1,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const visualStateRef = useRef<HeatCapacityHardSphereVisualState | null>(null);
  const outflowTailRemainingRef = useRef(0);
  const outflowIntensityRef = useRef(0);
  const particles = useMemo(() => createParticles(HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES), []);
  const motionsRef = useRef<ParticleMotionState[]>(particles.map(createMotionState));
  const particleGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  const particleColors = useMemo(() => createParticleColors(sceneTheme), [sceneTheme]);
  const particleMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: neutralParticleMaterialColor,
    emissive: particleColors.emissive,
    emissiveIntensity: particleColors.emissiveBase,
    transparent: true,
    opacity: particleColors.opacityBase,
    roughness: 0.36,
    metalness: 0.02,
    vertexColors: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  }), [particleColors]);
  const visualState = useMemo(() => getHeatCapacityHardSphereVisualState({
    powerOn,
    temperatureMv,
    pressureMv,
    pressureDeltaKPa,
    gasAmountRatio,
    gasTemperatureK,
    ambientTemperatureK,
    phase,
    manualStep,
    glassStopcockOpen,
    stopcockFlowOpen,
    pumpValveOpen,
    pumpBulbState,
    pumpFlowActive,
    pumpFlowIntensity,
    particleMultiplier,
    speedMultiplier,
    releaseFlowActive,
    releaseProgress,
  }), [
    ambientTemperatureK,
    gasAmountRatio,
    gasTemperatureK,
    glassStopcockOpen,
    manualStep,
    particleMultiplier,
    phase,
    powerOn,
    pressureDeltaKPa,
    pressureMv,
    pumpBulbState,
    pumpFlowActive,
    pumpFlowIntensity,
    pumpValveOpen,
    releaseFlowActive,
    releaseProgress,
    speedMultiplier,
    stopcockFlowOpen,
    temperatureMv,
  ]);

  useEffect(() => {
    visualStateRef.current = visualState;
    applyVisualMaterial(particleMaterial, visualState, particleColors, sceneTheme);
  }, [particleColors, particleMaterial, sceneTheme, visualState]);

  useEffect(() => () => {
    particleGeometry.dispose();
    particleMaterial.dispose();
  }, [particleGeometry, particleMaterial]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let index = 0; index < HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES; index += 1) {
      const motion = motionsRef.current[index];
      const particle = particles[index];
      if (!motion || !particle) continue;
      motion.exiting = false;
      motion.exited = true;
      motion.outflowProgress = 0;
      dummyObject.position.copy(motion.position);
      dummyObject.scale.setScalar(0);
      dummyObject.updateMatrix();
      mesh.setMatrixAt(index, dummyObject.matrix);
      mesh.setColorAt(index, hiddenParticleColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [enabled, particles]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const mesh = meshRef.current;
    const currentVisual = visualStateRef.current;
    if (!mesh || !currentVisual) return;

    const safeDelta = Math.min(delta, 0.04);
    const targetCount = currentVisual.targetParticleCount;
    if (currentVisual.outflowActive) {
      outflowTailRemainingRef.current = RELEASE_VISUAL_TAIL_S;
      outflowIntensityRef.current = currentVisual.outflowIntensity;
    } else if (outflowTailRemainingRef.current > 0) {
      outflowTailRemainingRef.current = Math.max(0, outflowTailRemainingRef.current - safeDelta);
    }
    const outflowTailFactor = RELEASE_VISUAL_TAIL_S > 0
      ? clampNumber(outflowTailRemainingRef.current / RELEASE_VISUAL_TAIL_S, 0, 1)
      : 0;
    const outflowVisuallyActive = currentVisual.outflowActive || outflowTailFactor > 0;
    const effectiveOutflowIntensity = currentVisual.outflowActive
      ? currentVisual.outflowIntensity
      : outflowIntensityRef.current * outflowTailFactor;
    const motions = motionsRef.current;
    let activeInsideCount = motions.reduce((count, motion) => (
      count + (!motion.exited && !motion.exiting ? 1 : 0)
    ), 0);
    let exitingCount = motions.reduce((count, motion) => (
      count + (!motion.exited && motion.exiting ? 1 : 0)
    ), 0);

    const spawnVisibleParticles = (
      spawnNeeded: number,
      spawnRate: number,
      fromPumpPort: boolean,
    ) => {
      const spawnBudget = Math.min(
        spawnNeeded,
        Math.max(1, Math.ceil(spawnRate * safeDelta)),
      );
      let spawned = 0;
      for (let index = 0; index < HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES && spawned < spawnBudget; index += 1) {
        const motion = motions[index];
        const particle = particles[index];
        if (!motion || !particle || !motion.exited || motion.exiting) continue;
        resetParticleInsideBottle(motion, particle, fromPumpPort);
        spawned += 1;
      }
      return spawned;
    };

    if (outflowVisuallyActive) {
      if (activeInsideCount > targetCount) {
        const exitNeeded = activeInsideCount - targetCount;
        const exitBudget = Math.min(
          exitNeeded,
          Math.max(1, Math.ceil(RELEASE_EXIT_RATE_PER_S * (0.72 + effectiveOutflowIntensity * 0.28) * safeDelta)),
        );
        const ranked = motions
          .map((motion, index) => ({ motion, particle: particles[index], index }))
          .filter((item): item is { motion: ParticleMotionState; particle: ParticleSeed; index: number } => (
            item.particle !== undefined &&
            !item.motion.exited &&
            !item.motion.exiting
          ))
          .sort((left, right) => (
            getOutletPriority(right.motion, right.particle) -
            getOutletPriority(left.motion, left.particle)
          ));
        for (const item of ranked.slice(0, exitBudget)) {
          item.motion.exiting = true;
          item.motion.outflowProgress = Math.max(item.motion.outflowProgress, 0.12);
        }
        activeInsideCount -= exitBudget;
        exitingCount += exitBudget;
      }
      if (activeInsideCount < targetCount) {
        const spawned = spawnVisibleParticles(
          targetCount - activeInsideCount,
          RELEASE_REPLENISH_RATE_PER_S,
          false,
        );
        activeInsideCount += spawned;
      }
    } else if (activeInsideCount + exitingCount < targetCount) {
      const spawnNeeded = targetCount - activeInsideCount - exitingCount;
      const spawnRate = pumpFlowActive || (pumpBulbState === 'compressing' && pumpValveOpen)
        ? PUMP_PARTICLE_SPAWN_RATE_PER_S
        : PARTICLE_SPAWN_RATE_PER_S;
      spawnVisibleParticles(
        spawnNeeded,
        spawnRate,
        pumpFlowActive || (pumpBulbState === 'compressing' && pumpValveOpen),
      );
    }

    const step = safeDelta * currentVisual.speedMultiplier * (0.82 + (1 - currentVisual.stability) * 0.42);

    for (let index = 0; index < HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES; index += 1) {
      const motion = motions[index];
      const particle = particles[index];
      if (!motion || !particle) continue;

      const visible = !motion.exited;
      if (visible) {
        const jitter = 0.018 * (1 - currentVisual.stability);
        motion.velocity.x += Math.sin(index * 8.17 + motion.position.y * 2.1) * jitter;
        motion.velocity.y += Math.cos(index * 6.73 + motion.position.z * 1.7) * jitter;
        motion.velocity.z += Math.sin(index * 5.31 + motion.position.x * 1.9) * jitter;

        if (outflowVisuallyActive) {
          const outletProximity = getOutletProximity(motion.position);
          const flowStrength = effectiveOutflowIntensity *
            (0.16 + outletProximity * 0.98) *
            (0.82 + particle.outflowBias * 0.26);
          const outletDirection = getOutletAttractionDirection(motion.position, scratchOutletDirection);
          motion.outflowProgress = clampNumber(
            motion.outflowProgress + safeDelta * (0.55 + flowStrength * 1.22),
            0,
            1,
          );
          motion.velocity.addScaledVector(outletDirection, flowStrength * safeDelta * 9.6);
        } else {
          motion.outflowProgress = Math.max(0, motion.outflowProgress - safeDelta * 1.6);
        }

        motion.velocity.normalize().multiplyScalar(0.54);
        motion.position.addScaledVector(motion.velocity, step);

        if (motion.exiting) {
          const exitIntensity = Math.max(effectiveOutflowIntensity, 0.86);
          const exitDirection = getOutletAttractionDirection(motion.position, scratchOutletDirection);
          motion.outflowProgress = clampNumber(
            motion.outflowProgress + safeDelta * (2.8 + exitIntensity * 1.7),
            0,
            1,
          );
          motion.velocity.lerp(exitDirection, clampNumber(safeDelta * (4.4 + exitIntensity * 1.2), 0, 0.56));
          motion.position.addScaledVector(
            exitDirection,
            safeDelta * (1.9 + exitIntensity * 1.25),
          );
          if (motion.position.y > OUTLET_OCCLUSION_Y || motion.outflowProgress >= 1) {
            motion.exiting = false;
            motion.exited = true;
            motion.outflowProgress = 0;
          }
        } else {
          resolveWallBounce(motion.position, motion.velocity, PARTICLE_RADIUS);
        }
      }

      const scale = visible ? PARTICLE_RADIUS : 0;
      dummyObject.position.copy(motion.position);
      dummyObject.scale.setScalar(Math.max(0, scale));
      dummyObject.updateMatrix();
      mesh.setMatrixAt(index, dummyObject.matrix);
      mesh.setColorAt(index, visible ? getParticleColor(currentVisual, sceneTheme) : hiddenParticleColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <group name="HeatCapacityHardSphereLayer" position={[-1.3, -0.28, 0]}>
      <instancedMesh
        ref={meshRef}
        args={[particleGeometry, particleMaterial, HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES]}
        dispose={null}
        frustumCulled={false}
      />
    </group>
  );
};

export default HeatCapacityHardSphereLayer;
