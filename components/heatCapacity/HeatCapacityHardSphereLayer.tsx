import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
  clampNumber,
  getHeatCapacityHardSphereVisualState,
  type HeatCapacityHardSpherePumpBulbState,
  type HeatCapacityHardSphereVisualState,
} from './heatCapacityHardSphereModel.ts';

interface HeatCapacityHardSphereLayerProps {
  enabled: boolean;
  powerOn: boolean;
  temperatureMv: number | null;
  pressureMv: number | null;
  phase: string;
  manualStep?: string | null;
  releaseBurstActive?: boolean;
  glassStopcockOpen: boolean;
  pumpValveOpen: boolean;
  pumpBulbState: HeatCapacityHardSpherePumpBulbState;
  particleMultiplier?: number;
  speedMultiplier?: number;
}

interface ParticleSeed {
  position: [number, number, number];
  velocity: [number, number, number];
  outflowBias: number;
  thermalBias: number;
}

interface ParticleMotionState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  outflowProgress: number;
}

const BOTTLE_INNER_HALF_SIZE = new THREE.Vector3(0.73, 0.73, 0.73);
const PARTICLE_RADIUS = 0.048;
const dummyObject = new THREE.Object3D();
const particleEmissiveColor = new THREE.Color('#1fb6c9');
const coldParticleColor = new THREE.Color('#60a5fa');
const ambientParticleColor = new THREE.Color('#67e8f9');
const hotParticleColor = new THREE.Color('#fde68a');
const hiddenParticleColor = new THREE.Color('#000000');
const scratchParticleColor = new THREE.Color();

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
      thermalBias: seededNoise(a * 1.7 + c),
    };
  })
);

const createMotionState = (particle: ParticleSeed) => ({
  position: new THREE.Vector3(...particle.position),
  velocity: new THREE.Vector3(...particle.velocity).multiplyScalar(0.54),
  outflowProgress: 0,
});

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
};

const applyVisualMaterial = (
  material: THREE.MeshStandardMaterial | null,
  visualState: HeatCapacityHardSphereVisualState,
) => {
  if (!material) return;
  material.color.set('#ffffff');
  material.emissive.copy(particleEmissiveColor);
  material.emissiveIntensity = clampNumber(0.22 + visualState.emissiveIntensity * 0.28, 0.24, 0.5);
  material.opacity = clampNumber(0.86 + visualState.emissiveIntensity * 0.08, 0.88, 0.94);
  material.needsUpdate = true;
};

const getParticleColor = (
  visualState: HeatCapacityHardSphereVisualState,
  particle: ParticleSeed,
) => {
  const speedBand = clampNumber((visualState.speedMultiplier - 0.5) / 1.85 + (particle.thermalBias - 0.5) * 0.12, 0, 1);
  if (speedBand < 0.5) {
    return scratchParticleColor.copy(coldParticleColor).lerp(ambientParticleColor, speedBand / 0.5);
  }
  return scratchParticleColor.copy(ambientParticleColor).lerp(hotParticleColor, (speedBand - 0.5) / 0.5);
};

const HeatCapacityHardSphereLayer: React.FC<HeatCapacityHardSphereLayerProps> = ({
  enabled,
  powerOn,
  temperatureMv,
  pressureMv,
  phase,
  manualStep = null,
  releaseBurstActive = false,
  glassStopcockOpen,
  pumpValveOpen,
  pumpBulbState,
  particleMultiplier = 1,
  speedMultiplier = 1,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const visibleCountRef = useRef(0);
  const visualStateRef = useRef<HeatCapacityHardSphereVisualState | null>(null);
  const particles = useMemo(() => createParticles(HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES), []);
  const motionsRef = useRef<ParticleMotionState[]>(particles.map(createMotionState));
  const particleGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  const particleMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8eeeff',
    emissive: particleEmissiveColor,
    emissiveIntensity: 0.32,
    transparent: true,
    opacity: 0.9,
    roughness: 0.36,
    metalness: 0.02,
    vertexColors: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  }), []);
  const visualState = useMemo(() => getHeatCapacityHardSphereVisualState({
    powerOn,
    temperatureMv,
    pressureMv,
    phase,
    manualStep,
    glassStopcockOpen,
    pumpValveOpen,
    pumpBulbState,
    particleMultiplier,
    speedMultiplier,
    releaseBurstActive,
  }), [
    glassStopcockOpen,
    manualStep,
    particleMultiplier,
    phase,
    powerOn,
    pressureMv,
    pumpBulbState,
    pumpValveOpen,
    releaseBurstActive,
    speedMultiplier,
    temperatureMv,
  ]);

  useEffect(() => {
    visualStateRef.current = visualState;
    applyVisualMaterial(particleMaterial, visualState);
  }, [particleMaterial, visualState]);

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
    const countRate = currentVisual.outflowActive
      ? 76
      : visibleCountRef.current < targetCount
        ? 58
        : 44;
    const previousVisibleCount = Math.round(visibleCountRef.current);
    if (visibleCountRef.current < targetCount) {
      visibleCountRef.current = Math.min(targetCount, visibleCountRef.current + countRate * safeDelta);
    } else if (visibleCountRef.current > targetCount) {
      visibleCountRef.current = Math.max(targetCount, visibleCountRef.current - countRate * safeDelta);
    }

    const visibleCount = Math.round(visibleCountRef.current);
    const step = safeDelta * currentVisual.speedMultiplier * (0.82 + (1 - currentVisual.stability) * 0.42);

    for (let index = 0; index < HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES; index += 1) {
      const motion = motionsRef.current[index];
      const particle = particles[index];
      if (!motion || !particle) continue;

      if (index >= previousVisibleCount && index < visibleCount && !currentVisual.outflowActive) {
        resetParticleInsideBottle(motion, particle, pumpBulbState === 'compressing' && pumpValveOpen);
      }

      const visible = index < visibleCount;
      if (visible) {
        const jitter = 0.018 * (1 - currentVisual.stability);
        motion.velocity.x += Math.sin(index * 8.17 + motion.position.y * 2.1) * jitter;
        motion.velocity.y += Math.cos(index * 6.73 + motion.position.z * 1.7) * jitter;
        motion.velocity.z += Math.sin(index * 5.31 + motion.position.x * 1.9) * jitter;

        if (currentVisual.outflowActive && particle.outflowBias > 0.48) {
          motion.outflowProgress = clampNumber(motion.outflowProgress + safeDelta * (1.2 + currentVisual.outflowIntensity), 0, 1);
          motion.velocity.y += 0.09 * currentVisual.outflowIntensity;
          motion.velocity.x += 0.055 * currentVisual.outflowIntensity;
        } else {
          motion.outflowProgress = Math.max(0, motion.outflowProgress - safeDelta * 1.6);
        }

        motion.velocity.normalize().multiplyScalar(0.54);
        motion.position.addScaledVector(motion.velocity, step);

        if (currentVisual.outflowActive && particle.outflowBias > 0.48 && motion.outflowProgress > 0.2) {
          const outflowLift = currentVisual.outflowIntensity * safeDelta * 1.15;
          motion.position.y += outflowLift;
          motion.position.x += outflowLift * 0.38;
          if (motion.position.y > BOTTLE_INNER_HALF_SIZE.y + 0.18 || motion.outflowProgress >= 1) {
            resetParticleInsideBottle(motion, particle, false);
            motion.position.y = BOTTLE_INNER_HALF_SIZE.y - PARTICLE_RADIUS;
            motion.velocity.y = -Math.abs(motion.velocity.y);
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
      mesh.setColorAt(index, visible ? getParticleColor(currentVisual, particle) : hiddenParticleColor);
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
