import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  useHeatCapacityGuardedFrame,
  useHeatCapacityRuntimeFailureReporter,
} from './heatCapacityRuntimeGuard.ts';
import {
  HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
  clampNumber,
  getHeatCapacityHardSphereVisualState,
  type HeatCapacityHardSpherePumpBulbState,
  type HeatCapacityHardSphereReleaseTimeline,
  type HeatCapacityHardSphereVisualState,
} from '../../domain/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  resolveHeatCapacityHardSphereTemperatureColor,
  type HeatCapacityHardSphereSceneTheme,
} from '../../domain/heatCapacity/heatCapacityHardSphereColor.ts';
import {
  createHeatCapacityHardSphereBoxContainer,
  createHeatCapacityHardSphereCylinderContainer,
  type HeatCapacityHardSphereContainer,
  type HeatCapacityHardSphereParticle,
} from '../../domain/heatCapacity/heatCapacityHardSphereGeometry.ts';
import {
  createHeatCapacityHardSphereSimulation,
  stepHeatCapacityHardSphereSimulation,
  type HeatCapacityHardSphereSimulation,
} from '../../domain/heatCapacity/heatCapacityHardSphereSimulation.ts';
import {
  createHeatCapacityHardSphereMainReleaseSchedule,
  getHeatCapacityHardSphereScheduleFrame,
  type HeatCapacityHardSphereVisualFlowSchedule,
} from '../../domain/heatCapacity/heatCapacityHardSphereReleaseSchedule.ts';
import {
  resolveHeatCapacityReleaseFeedback,
} from '../../domain/heatCapacity/heatCapacityReleaseFeedbackModel.ts';
import {
  stepHeatCapacityHardSphereKineticSpeed,
  type HeatCapacityHardSphereKineticSpeedState,
} from '../../domain/heatCapacity/heatCapacityHardSphereKineticSpeed.ts';
import {
  HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
} from '../../domain/heatCapacity/heatCapacityHardSpherePopulation.ts';

export type HeatCapacityHardSphereParticleCheckpoint = HeatCapacityHardSphereParticle;

export type HeatCapacityHardSphereVisualCheckpoint = {
  version: 2;
  containerProfile: 'skeleton-box' | 'ultra-cylinder';
  particles: HeatCapacityHardSphereParticleCheckpoint[];
  accumulatorS: number;
  entryAccumulator: number;
  exitAccumulator: number;
  lastSubStepCount: number;
  seed: number;
  displayVisualState: HeatCapacityHardSphereVisualState | null;
  activeReleaseScheduleId: string | null;
  activeReleaseScheduleElapsedS: number;
  assignedReleaseExitCount: number;
  kineticSpeedState: HeatCapacityHardSphereKineticSpeedState | null;
};

export type HeatCapacityHardSphereCheckpointProvider = () => HeatCapacityHardSphereVisualCheckpoint | null;

interface HeatCapacityHardSphereLayerProps {
  enabled: boolean;
  containerProfile?: 'skeleton-box' | 'ultra-cylinder';
  sceneTheme: HeatCapacityHardSphereSceneTheme;
  temperatureMv: number | null;
  pressureMv: number | null;
  pressureDeltaKPa?: number;
  gasAmountRatio?: number;
  gasTemperatureK?: number;
  ambientTemperatureK?: number;
  phase: string;
  guideStep?: string | null;
  releaseTimeline?: HeatCapacityHardSphereReleaseTimeline;
  glassStopcockOpen: boolean;
  pumpValveOpen: boolean;
  pumpBulbState: HeatCapacityHardSpherePumpBulbState;
  pumpFlowActive?: boolean;
  pumpFlowIntensity?: number;
  particleMultiplier?: number;
  speedMultiplier?: number;
  visualResetKey?: number;
  paused?: boolean;
  initialVisualCheckpoint?: HeatCapacityHardSphereVisualCheckpoint | null;
  restoreVisualCheckpoint?: HeatCapacityHardSphereVisualCheckpoint | null;
  restoreVisualCheckpointKey?: number | null;
  onVisualRestoreComplete?: (restoreKey: number) => void;
  onCheckpointProviderChange?: (provider: HeatCapacityHardSphereCheckpointProvider | null) => void;
}

const BOTTLE_INNER_HALF_SIZE = new THREE.Vector3(0.73, 0.73, 0.73);
const PARTICLE_RADIUS = 0.048;
const OUTLET_APPROACH_POINT = new THREE.Vector3(0, BOTTLE_INNER_HALF_SIZE.y - PARTICLE_RADIUS * 0.35, 0);
const SKELETON_HARD_SPHERE_GROUP_POSITION: [number, number, number] = [-1.3, -0.28, 0];
const ULTRA_HARD_SPHERE_CYLINDER_CENTER = new THREE.Vector3(-1.399999976158142, 0.7625, 0);
const ULTRA_HARD_SPHERE_CYLINDER_RADIUS = 0.48500001430511475;
const ULTRA_HARD_SPHERE_CYLINDER_HALF_HEIGHT = 0.6325;
const ULTRA_HARD_SPHERE_PARTICLE_RADIUS = PARTICLE_RADIUS * 0.75;
const HEAT_CAPACITY_HARD_SPHERE_VISUAL_SMOOTHING_RESPONSE_S = 0.46;
const HARD_SPHERE_SIMULATION_SEED = 179;
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

const skeletonHardSphereContainer = createHeatCapacityHardSphereBoxContainer({
  halfSize: {
    x: BOTTLE_INNER_HALF_SIZE.x,
    y: BOTTLE_INNER_HALF_SIZE.y,
    z: BOTTLE_INNER_HALF_SIZE.z,
  },
  outletPoint: OUTLET_APPROACH_POINT,
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: -0.67, y: 0.28, z: 0.26 },
});

const ultraHardSphereContainer = createHeatCapacityHardSphereCylinderContainer({
  radius: ULTRA_HARD_SPHERE_CYLINDER_RADIUS,
  halfHeight: ULTRA_HARD_SPHERE_CYLINDER_HALF_HEIGHT,
  outletPoint: { x: 0, y: ULTRA_HARD_SPHERE_CYLINDER_HALF_HEIGHT - ULTRA_HARD_SPHERE_PARTICLE_RADIUS * 0.35, z: 0 },
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: 0.32, y: -0.08, z: 0.33 },
});

const hardSphereContainerProfiles: Record<NonNullable<HeatCapacityHardSphereLayerProps['containerProfile']>, {
  container: HeatCapacityHardSphereContainer;
  particleRadius: number;
  particleCountScale: number;
  pumpEntryRateScale: number;
  groupPosition: [number, number, number];
}> = {
  'skeleton-box': {
    container: skeletonHardSphereContainer,
    particleRadius: PARTICLE_RADIUS,
    particleCountScale: 1,
    pumpEntryRateScale: 1,
    groupPosition: SKELETON_HARD_SPHERE_GROUP_POSITION,
  },
  'ultra-cylinder': {
    container: ultraHardSphereContainer,
    particleRadius: ULTRA_HARD_SPHERE_PARTICLE_RADIUS,
    particleCountScale: 0.525,
    pumpEntryRateScale: 0.5,
    groupPosition: [
      ULTRA_HARD_SPHERE_CYLINDER_CENTER.x,
      ULTRA_HARD_SPHERE_CYLINDER_CENTER.y,
      ULTRA_HARD_SPHERE_CYLINDER_CENTER.z,
    ],
  },
};

const isHardSphereCheckpointRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const readHardSphereCheckpointNumber = (
  value: unknown,
  minimum = -1_000_000,
  maximum = 1_000_000,
): number | null => (
  typeof value === 'number' && Number.isFinite(value)
    ? clampNumber(value, minimum, maximum)
    : null
);

const readHardSphereCheckpointVector = (value: unknown) => {
  if (!isHardSphereCheckpointRecord(value)) return null;
  const x = readHardSphereCheckpointNumber(value.x);
  const y = readHardSphereCheckpointNumber(value.y);
  const z = readHardSphereCheckpointNumber(value.z);
  return x === null || y === null || z === null ? null : { x, y, z };
};

const readHardSphereVisualState = (value: unknown): HeatCapacityHardSphereVisualState | null => {
  if (!isHardSphereCheckpointRecord(value)) return null;
  const densityMultiplier = readHardSphereCheckpointNumber(value.densityMultiplier, 0, 100);
  const thermalSpeedMultiplier = readHardSphereCheckpointNumber(value.thermalSpeedMultiplier, 0, 100);
  const speedMultiplier = readHardSphereCheckpointNumber(value.speedMultiplier, 0, 100);
  const temperatureColorFactor = readHardSphereCheckpointNumber(value.temperatureColorFactor, 0, 1);
  const emissiveIntensity = readHardSphereCheckpointNumber(value.emissiveIntensity, 0, 100);
  const stability = readHardSphereCheckpointNumber(value.stability, 0, 1);
  const targetParticleCount = readHardSphereCheckpointNumber(
    value.targetParticleCount,
    0,
    HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
  );
  if (
    densityMultiplier === null || thermalSpeedMultiplier === null || speedMultiplier === null ||
    temperatureColorFactor === null || emissiveIntensity === null || stability === null ||
    targetParticleCount === null
  ) return null;
  return {
    densityMultiplier,
    thermalSpeedMultiplier,
    speedMultiplier,
    temperatureColorFactor,
    emissiveIntensity,
    stability,
    targetParticleCount: Math.round(targetParticleCount),
  };
};

const readHardSphereParticleCheckpoint = (value: unknown): HeatCapacityHardSphereParticleCheckpoint | null => {
  if (!isHardSphereCheckpointRecord(value)) return null;
  const id = readHardSphereCheckpointNumber(value.id, 0, HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES - 1);
  const position = readHardSphereCheckpointVector(value.position);
  const velocity = readHardSphereCheckpointVector(value.velocity);
  const outflowProgress = readHardSphereCheckpointNumber(value.outflowProgress, 0, 100);
  if (
    id === null || position === null || velocity === null || outflowProgress === null ||
    (value.state !== 'inside' && value.state !== 'entering' && value.state !== 'exiting' && value.state !== 'hidden')
  ) return null;
  const readOptional = (candidate: unknown) => (
    candidate === undefined ? undefined : readHardSphereCheckpointNumber(candidate, 0, 100)
  );
  const exitInertiaSpeed = readOptional(value.exitInertiaSpeed);
  const exitInertiaAgeS = readOptional(value.exitInertiaAgeS);
  const exitDelayS = readOptional(value.exitDelayS);
  const releaseRecoveryDelayS = readOptional(value.releaseRecoveryDelayS);
  if (
    exitInertiaSpeed === null || exitInertiaAgeS === null || exitDelayS === null ||
    releaseRecoveryDelayS === null
  ) return null;
  return {
    id: Math.round(id),
    position,
    velocity,
    state: value.state,
    outflowProgress,
    ...(exitInertiaSpeed === undefined ? {} : { exitInertiaSpeed }),
    ...(exitInertiaAgeS === undefined ? {} : { exitInertiaAgeS }),
    ...(exitDelayS === undefined ? {} : { exitDelayS }),
    ...(releaseRecoveryDelayS === undefined ? {} : { releaseRecoveryDelayS }),
  };
};

export const normalizeHeatCapacityHardSphereVisualCheckpoint = (
  value: unknown,
  expectedContainerProfile?: HeatCapacityHardSphereVisualCheckpoint['containerProfile'],
): HeatCapacityHardSphereVisualCheckpoint | null => {
  if (!isHardSphereCheckpointRecord(value) || value.version !== 2) return null;
  const containerProfile = value.containerProfile === 'ultra-cylinder' ? 'ultra-cylinder'
    : value.containerProfile === 'skeleton-box' ? 'skeleton-box'
      : null;
  if (!containerProfile || (expectedContainerProfile && containerProfile !== expectedContainerProfile)) return null;
  if (!Array.isArray(value.particles) || value.particles.length !== HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES) return null;
  const particles = value.particles.map(readHardSphereParticleCheckpoint);
  if (particles.some((particle) => particle === null)) return null;
  const normalizedParticles = particles as HeatCapacityHardSphereParticleCheckpoint[];
  const particleIds = new Set(normalizedParticles.map((particle) => particle.id));
  if (particleIds.size !== HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES) return null;
  const accumulatorS = readHardSphereCheckpointNumber(value.accumulatorS, 0, 1);
  const entryAccumulator = readHardSphereCheckpointNumber(value.entryAccumulator, 0, 1);
  const exitAccumulator = readHardSphereCheckpointNumber(value.exitAccumulator, 0, 1);
  const lastSubStepCount = readHardSphereCheckpointNumber(value.lastSubStepCount, 0, 10_000);
  const seed = readHardSphereCheckpointNumber(value.seed, 0, Number.MAX_SAFE_INTEGER);
  const activeReleaseScheduleElapsedS = readHardSphereCheckpointNumber(value.activeReleaseScheduleElapsedS, 0, 10_000);
  const assignedReleaseExitCount = readHardSphereCheckpointNumber(
    value.assignedReleaseExitCount,
    0,
    HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
  );
  if (
    accumulatorS === null || entryAccumulator === null || exitAccumulator === null || lastSubStepCount === null ||
    seed === null || activeReleaseScheduleElapsedS === null || assignedReleaseExitCount === null
  ) return null;
  const displayVisualState = value.displayVisualState === null ? null : readHardSphereVisualState(value.displayVisualState);
  if (value.displayVisualState !== null && displayVisualState === null) return null;
  let kineticSpeedState: HeatCapacityHardSphereKineticSpeedState | null = null;
  if (value.kineticSpeedState !== null) {
    if (!isHardSphereCheckpointRecord(value.kineticSpeedState)) return null;
    const speed = readHardSphereCheckpointNumber(value.kineticSpeedState.speed, 0, 100);
    const releaseMemoryRemainingS = readHardSphereCheckpointNumber(
      value.kineticSpeedState.releaseMemoryRemainingS,
      0,
      10,
    );
    if (speed === null || releaseMemoryRemainingS === null) return null;
    kineticSpeedState = { speed, releaseMemoryRemainingS };
  }
  return {
    version: 2,
    containerProfile,
    particles: normalizedParticles.sort((left, right) => left.id - right.id),
    accumulatorS,
    entryAccumulator,
    exitAccumulator,
    lastSubStepCount: Math.round(lastSubStepCount),
    seed: Math.round(seed),
    displayVisualState,
    activeReleaseScheduleId: typeof value.activeReleaseScheduleId === 'string'
      ? value.activeReleaseScheduleId.slice(0, 1_024)
      : null,
    activeReleaseScheduleElapsedS,
    assignedReleaseExitCount: Math.round(assignedReleaseExitCount),
    kineticSpeedState,
  };
};

const createSimulation = (
  container: HeatCapacityHardSphereContainer,
  particleRadius: number,
): HeatCapacityHardSphereSimulation => (
  createHeatCapacityHardSphereSimulation({
    maxParticles: HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
    particleRadius,
    container,
    seed: HARD_SPHERE_SIMULATION_SEED,
  })
);

const createSimulationFromCheckpoint = (
  container: HeatCapacityHardSphereContainer,
  particleRadius: number,
  checkpoint: HeatCapacityHardSphereVisualCheckpoint | null,
): HeatCapacityHardSphereSimulation => {
  const simulation = createSimulation(container, particleRadius);
  if (!checkpoint) return simulation;
  return {
    ...simulation,
    particles: checkpoint.particles.map((particle) => ({
      ...particle,
      position: { ...particle.position },
      velocity: { ...particle.velocity },
    })),
    accumulatorS: checkpoint.accumulatorS,
    entryAccumulator: checkpoint.entryAccumulator,
    exitAccumulator: checkpoint.exitAccumulator,
    lastSubStepCount: checkpoint.lastSubStepCount,
    seed: checkpoint.seed,
  };
};

const createHardSphereVisualCheckpoint = (
  containerProfile: HeatCapacityHardSphereVisualCheckpoint['containerProfile'],
  simulation: HeatCapacityHardSphereSimulation,
  displayVisualState: HeatCapacityHardSphereVisualState | null,
  activeReleaseScheduleId: string | null,
  activeReleaseScheduleElapsedS: number,
  assignedReleaseExitCount: number,
  kineticSpeedState: HeatCapacityHardSphereKineticSpeedState | null,
): HeatCapacityHardSphereVisualCheckpoint => ({
  version: 2,
  containerProfile,
  particles: simulation.particles.map((particle) => ({
    ...particle,
    position: { ...particle.position },
    velocity: { ...particle.velocity },
  })),
  accumulatorS: simulation.accumulatorS,
  entryAccumulator: simulation.entryAccumulator,
  exitAccumulator: simulation.exitAccumulator,
  lastSubStepCount: simulation.lastSubStepCount,
  seed: simulation.seed,
  displayVisualState: displayVisualState ? cloneHeatCapacityHardSphereVisualState(displayVisualState) : null,
  activeReleaseScheduleId,
  activeReleaseScheduleElapsedS,
  assignedReleaseExitCount,
  kineticSpeedState: kineticSpeedState ? { ...kineticSpeedState } : null,
});

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

const cloneHeatCapacityHardSphereVisualState = (
  visualState: HeatCapacityHardSphereVisualState,
): HeatCapacityHardSphereVisualState => ({
  ...visualState,
});

const smoothVisualValue = (
  current: number,
  target: number,
  alpha: number,
) => current + (target - current) * alpha;

const smoothHeatCapacityHardSphereVisualState = (
  current: HeatCapacityHardSphereVisualState,
  target: HeatCapacityHardSphereVisualState,
  dtS: number,
): HeatCapacityHardSphereVisualState => {
  const responseS = HEAT_CAPACITY_HARD_SPHERE_VISUAL_SMOOTHING_RESPONSE_S;
  const alpha = responseS > 0
    ? 1 - Math.exp(-Math.max(0, dtS) / responseS)
    : 1;
  return {
    ...target,
    temperatureColorFactor: smoothVisualValue(current.temperatureColorFactor, target.temperatureColorFactor, alpha),
    emissiveIntensity: smoothVisualValue(current.emissiveIntensity, target.emissiveIntensity, alpha),
  };
};

const getReleaseScheduleId = (
  timeline: HeatCapacityHardSphereReleaseTimeline,
  particleCountScale: number,
) => [
  timeline.phase,
  timeline.amountBeforeRatio.toFixed(4),
  timeline.responseDelayS.toFixed(3),
  timeline.mainDurationS.toFixed(3),
  particleCountScale.toFixed(3),
].join(':');

const getVisualFlowSchedule = (
  timeline: HeatCapacityHardSphereReleaseTimeline,
  particleMultiplier: number,
  particleCountScale: number,
  elapsedS: number,
  feedbackProgress?: number,
): HeatCapacityHardSphereVisualFlowSchedule => {
  const id = getReleaseScheduleId(timeline, particleCountScale);
  if (timeline.phase === 'main-release') {
    return createHeatCapacityHardSphereMainReleaseSchedule({
      id,
      amountBeforeRatio: timeline.amountBeforeRatio,
      amountCurrentRatio: timeline.amountCurrentRatio,
      amountTargetRatio: timeline.amountTargetRatio,
      particleMultiplier,
      particleCountScale,
      elapsedS,
      durationS: timeline.mainDurationS,
      feedbackProgress,
    });
  }
  return {
    id,
    phase: 'idle',
    elapsedS: 0,
    durationS: 0,
    progress: 0,
    exitAssignmentCount: 0,
    exitSpeed: 0,
    baselineParticleCount: 0,
    amountBeforeParticleCount: 0,
    amountTargetParticleCount: 0,
    addedParticleCount: 0,
    releaseMinimumParticleCount: 0,
  };
};

const hideParticlePool = (
  mesh: THREE.InstancedMesh | null,
  simulation: HeatCapacityHardSphereSimulation,
) => {
  if (!mesh) return;
  for (const particle of simulation.particles) {
    particle.state = 'hidden';
    particle.outflowProgress = 0;
    dummyObject.position.set(particle.position.x, particle.position.y, particle.position.z);
    dummyObject.scale.setScalar(0);
    dummyObject.updateMatrix();
    mesh.setMatrixAt(particle.id, dummyObject.matrix);
    mesh.setColorAt(particle.id, hiddenParticleColor);
  }
  simulation.accumulatorS = 0;
  simulation.entryAccumulator = 0;
  simulation.exitAccumulator = 0;
  simulation.lastSubStepCount = 0;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};

const renderParticlePool = (
  mesh: THREE.InstancedMesh,
  simulation: HeatCapacityHardSphereSimulation,
  particleRadius: number,
  visualState: HeatCapacityHardSphereVisualState,
  sceneTheme: HeatCapacityHardSphereSceneTheme,
) => {
  for (const particle of simulation.particles) {
    const visible = particle.state !== 'hidden';
    dummyObject.position.set(particle.position.x, particle.position.y, particle.position.z);
    dummyObject.scale.setScalar(visible ? particleRadius : 0);
    dummyObject.updateMatrix();
    mesh.setMatrixAt(particle.id, dummyObject.matrix);
    mesh.setColorAt(particle.id, visible ? getParticleColor(visualState, sceneTheme) : hiddenParticleColor);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};

const HeatCapacityHardSphereLayer: React.FC<HeatCapacityHardSphereLayerProps> = ({
  enabled,
  containerProfile = 'skeleton-box',
  sceneTheme,
  temperatureMv,
  pressureMv,
  pressureDeltaKPa,
  gasAmountRatio,
  gasTemperatureK,
  ambientTemperatureK,
  phase,
  guideStep = null,
  releaseTimeline = HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
  glassStopcockOpen,
  pumpValveOpen,
  pumpBulbState,
  pumpFlowActive = false,
  pumpFlowIntensity = 0,
  particleMultiplier = 1,
  speedMultiplier = 1,
  visualResetKey = 0,
  paused = false,
  initialVisualCheckpoint = null,
  restoreVisualCheckpoint = null,
  restoreVisualCheckpointKey = null,
  onVisualRestoreComplete,
  onCheckpointProviderChange,
}) => {
  const reportRuntimeFailure = useHeatCapacityRuntimeFailureReporter();
  const hardSphereProfile = hardSphereContainerProfiles[containerProfile];
  const [restoredInitialCheckpoint] = useState(() => (
    normalizeHeatCapacityHardSphereVisualCheckpoint(
      initialVisualCheckpoint,
      containerProfile,
    )
  ));
  const resetSignature = `${enabled}:${containerProfile}:${particleMultiplier}:${visualResetKey}`;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const visualStateRef = useRef<HeatCapacityHardSphereVisualState | null>(null);
  const displayVisualStateRef = useRef<HeatCapacityHardSphereVisualState | null>(
    restoredInitialCheckpoint?.displayVisualState
      ? cloneHeatCapacityHardSphereVisualState(restoredInitialCheckpoint.displayVisualState)
      : null,
  );
  const activeReleaseScheduleIdRef = useRef<string | null>(restoredInitialCheckpoint?.activeReleaseScheduleId ?? null);
  const activeReleaseScheduleElapsedRef = useRef(restoredInitialCheckpoint?.activeReleaseScheduleElapsedS ?? 0);
  const assignedReleaseExitCountRef = useRef(restoredInitialCheckpoint?.assignedReleaseExitCount ?? 0);
  const activeReleaseScheduleRef = useRef<HeatCapacityHardSphereVisualFlowSchedule | null>(null);
  const releaseInitialPressureDeltaRef = useRef(0);
  const releasePathWasOpenRef = useRef(false);
  const releaseFeedbackWasActiveRef = useRef(false);
  const kineticSpeedStateRef = useRef<HeatCapacityHardSphereKineticSpeedState | null>(
    restoredInitialCheckpoint?.kineticSpeedState ? { ...restoredInitialCheckpoint.kineticSpeedState } : null,
  );
  const [initialSimulation] = useState(() => (
    createSimulationFromCheckpoint(
      hardSphereProfile.container,
      hardSphereProfile.particleRadius,
      restoredInitialCheckpoint,
    )
  ));
  const simulationRef = useRef<HeatCapacityHardSphereSimulation>(initialSimulation);
  const lastResetSignatureRef = useRef<string | null>(restoredInitialCheckpoint ? resetSignature : null);
  const lastRestoreVisualCheckpointKeyRef = useRef<number | null>(null);
  const runtimeFailedRef = useRef(false);
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
    temperatureMv,
    pressureMv,
    pressureDeltaKPa,
    gasAmountRatio,
    gasTemperatureK,
    ambientTemperatureK,
    phase,
    guideStep,
    glassStopcockOpen,
    pumpValveOpen,
    pumpBulbState,
    pumpFlowActive,
    pumpFlowIntensity,
    particleMultiplier,
    particleCountScale: hardSphereProfile.particleCountScale,
    speedMultiplier,
  }), [
    ambientTemperatureK,
    gasAmountRatio,
    gasTemperatureK,
    glassStopcockOpen,
    guideStep,
    hardSphereProfile.particleCountScale,
    particleMultiplier,
    phase,
    pressureDeltaKPa,
    pressureMv,
    pumpBulbState,
    pumpFlowActive,
    pumpFlowIntensity,
    pumpValveOpen,
    speedMultiplier,
    temperatureMv,
  ]);

  const getVisualCheckpoint = useCallback<HeatCapacityHardSphereCheckpointProvider>(() => (
    createHardSphereVisualCheckpoint(
      containerProfile,
      simulationRef.current,
      displayVisualStateRef.current,
      activeReleaseScheduleIdRef.current,
      activeReleaseScheduleElapsedRef.current,
      assignedReleaseExitCountRef.current,
      kineticSpeedStateRef.current,
    )
  ), [containerProfile]);

  useEffect(() => {
    onCheckpointProviderChange?.(getVisualCheckpoint);
    return () => onCheckpointProviderChange?.(null);
  }, [getVisualCheckpoint, onCheckpointProviderChange]);

  useEffect(() => {
    visualStateRef.current = visualState;
    if (displayVisualStateRef.current === null) {
      displayVisualStateRef.current = cloneHeatCapacityHardSphereVisualState(visualState);
    }
    const displayVisualState = displayVisualStateRef.current;
    applyVisualMaterial(particleMaterial, displayVisualState, particleColors, sceneTheme);
  }, [particleColors, particleMaterial, sceneTheme, visualState]);

  useEffect(() => () => {
    particleGeometry.dispose();
    particleMaterial.dispose();
  }, [particleGeometry, particleMaterial]);

  useLayoutEffect(() => {
    if (lastResetSignatureRef.current === resetSignature) {
      const mesh = meshRef.current;
      const restoredDisplayVisualState = displayVisualStateRef.current ?? visualState;
      if (mesh) {
        applyVisualMaterial(particleMaterial, restoredDisplayVisualState, particleColors, sceneTheme);
        renderParticlePool(
          mesh,
          simulationRef.current,
          hardSphereProfile.particleRadius,
          restoredDisplayVisualState,
          sceneTheme,
        );
      }
      return;
    }
    lastResetSignatureRef.current = resetSignature;
    simulationRef.current = createSimulation(hardSphereProfile.container, hardSphereProfile.particleRadius);
    hideParticlePool(meshRef.current, simulationRef.current);
    activeReleaseScheduleIdRef.current = null;
    activeReleaseScheduleElapsedRef.current = 0;
    assignedReleaseExitCountRef.current = 0;
    activeReleaseScheduleRef.current = null;
    releaseInitialPressureDeltaRef.current = 0;
    releasePathWasOpenRef.current = false;
    releaseFeedbackWasActiveRef.current = false;
    kineticSpeedStateRef.current = null;
  }, [hardSphereProfile, particleColors, particleMaterial, resetSignature, sceneTheme, visualState]);

  useLayoutEffect(() => {
    if (
      !enabled ||
      restoreVisualCheckpointKey === null ||
      lastRestoreVisualCheckpointKeyRef.current === restoreVisualCheckpointKey
    ) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    lastRestoreVisualCheckpointKeyRef.current = restoreVisualCheckpointKey;
    const checkpoint = normalizeHeatCapacityHardSphereVisualCheckpoint(
      restoreVisualCheckpoint,
      containerProfile,
    );
    simulationRef.current = createSimulationFromCheckpoint(
      hardSphereProfile.container,
      hardSphereProfile.particleRadius,
      checkpoint,
    );
    displayVisualStateRef.current = checkpoint?.displayVisualState
      ? cloneHeatCapacityHardSphereVisualState(checkpoint.displayVisualState)
      : cloneHeatCapacityHardSphereVisualState(visualState);
    activeReleaseScheduleIdRef.current = checkpoint?.activeReleaseScheduleId ?? null;
    activeReleaseScheduleElapsedRef.current = checkpoint?.activeReleaseScheduleElapsedS ?? 0;
    assignedReleaseExitCountRef.current = checkpoint?.assignedReleaseExitCount ?? 0;
    activeReleaseScheduleRef.current = null;
    releaseInitialPressureDeltaRef.current = 0;
    releasePathWasOpenRef.current = false;
    releaseFeedbackWasActiveRef.current = false;
    kineticSpeedStateRef.current = checkpoint?.kineticSpeedState
      ? { ...checkpoint.kineticSpeedState }
      : null;
    lastResetSignatureRef.current = resetSignature;
    const displayVisualState = displayVisualStateRef.current;
    applyVisualMaterial(particleMaterial, displayVisualState, particleColors, sceneTheme);
    renderParticlePool(
      mesh,
      simulationRef.current,
      hardSphereProfile.particleRadius,
      displayVisualState,
      sceneTheme,
    );
    onVisualRestoreComplete?.(restoreVisualCheckpointKey);
  }, [
    containerProfile,
    enabled,
    hardSphereProfile,
    particleColors,
    particleMaterial,
    onVisualRestoreComplete,
    resetSignature,
    restoreVisualCheckpoint,
    restoreVisualCheckpointKey,
    sceneTheme,
    visualState,
  ]);

  useHeatCapacityGuardedFrame((_, delta) => {
    if (!enabled) return;
    if (paused) return;
    if (runtimeFailedRef.current) return;
    try {
    const mesh = meshRef.current;
    const currentVisual = visualStateRef.current;
    if (!mesh || !currentVisual) return;

    const safeDelta = Math.min(delta, 0.04);
    const releaseScheduleDeltaS = Math.min(Math.max(delta, 0), 0.5);
    const currentReleaseTimeline = releaseTimeline;
    const displayVisualState = displayVisualStateRef.current === null
      ? cloneHeatCapacityHardSphereVisualState(currentVisual)
      : smoothHeatCapacityHardSphereVisualState(displayVisualStateRef.current, currentVisual, safeDelta);
    displayVisualStateRef.current = displayVisualState;
    applyVisualMaterial(particleMaterial, displayVisualState, particleColors, sceneTheme);

    const releasePathOpen = currentReleaseTimeline.phase === 'main-release' ||
      currentReleaseTimeline.phase === 'post-release-exchange';
    const currentPressureDeltaKPa = Math.max(0, Number.isFinite(pressureDeltaKPa ?? 0)
      ? pressureDeltaKPa ?? 0
      : 0);
    if (releasePathOpen && !releasePathWasOpenRef.current) {
      releaseInitialPressureDeltaRef.current = currentPressureDeltaKPa;
    }
    const releaseFeedback = resolveHeatCapacityReleaseFeedback({
      releasePathOpen,
      pressureDeltaKPa: currentPressureDeltaKPa,
      openElapsedS: currentReleaseTimeline.elapsedS,
      initialPressureDeltaKPa: releaseInitialPressureDeltaRef.current,
    });
    const releaseJustStopped = releaseFeedbackWasActiveRef.current && !releaseFeedback.active;
    releasePathWasOpenRef.current = releasePathOpen;
    releaseFeedbackWasActiveRef.current = releaseFeedback.active;
    const pumpPortActive = pumpFlowActive || (pumpBulbState === 'compressing' && pumpValveOpen);
    const baseVisualFlowSchedule = getVisualFlowSchedule(
      currentReleaseTimeline,
      particleMultiplier,
      hardSphereProfile.particleCountScale,
      0,
      releaseFeedback.progressRatio,
    );
    const releaseScheduleActive = releaseFeedback.active && baseVisualFlowSchedule.phase === 'main-release';
    if (releaseScheduleActive && activeReleaseScheduleIdRef.current !== baseVisualFlowSchedule.id) {
      activeReleaseScheduleIdRef.current = baseVisualFlowSchedule.id;
      activeReleaseScheduleElapsedRef.current = releaseScheduleDeltaS;
      assignedReleaseExitCountRef.current = 0;
    } else if (releaseScheduleActive) {
      activeReleaseScheduleElapsedRef.current += releaseScheduleDeltaS;
    }
    const currentScheduleFrame = releaseScheduleActive
      ? getHeatCapacityHardSphereScheduleFrame(
        getVisualFlowSchedule(
          currentReleaseTimeline,
          particleMultiplier,
          hardSphereProfile.particleCountScale,
          activeReleaseScheduleElapsedRef.current,
          releaseFeedback.progressRatio,
        ),
        activeReleaseScheduleElapsedRef.current,
        releaseFeedback.progressRatio,
      )
      : activeReleaseScheduleRef.current ?? getVisualFlowSchedule(
        currentReleaseTimeline,
        particleMultiplier,
        hardSphereProfile.particleCountScale,
        0,
      );
    if (releaseScheduleActive) activeReleaseScheduleRef.current = currentScheduleFrame;
    const releaseExitBudget = releaseScheduleActive
      ? Math.max(0, currentScheduleFrame.exitAssignmentCount - assignedReleaseExitCountRef.current)
      : 0;
    const kineticSpeedState = stepHeatCapacityHardSphereKineticSpeed({
      currentSpeed: kineticSpeedStateRef.current?.speed ?? currentVisual.thermalSpeedMultiplier,
      targetSpeed: currentVisual.thermalSpeedMultiplier,
      releaseMemoryRemainingS: kineticSpeedStateRef.current?.releaseMemoryRemainingS ?? 0,
      releaseActive: releaseFeedback.active || releaseScheduleActive,
      dtS: safeDelta,
    });
    kineticSpeedStateRef.current = kineticSpeedState;

    const simulationStepResult = stepHeatCapacityHardSphereSimulation(simulationRef.current, {
      dtS: safeDelta,
      targetParticleCount: currentVisual.targetParticleCount,
      thermalSpeedMultiplier: kineticSpeedState.speed,
      pumpFlowActive: pumpPortActive,
      pumpFlowIntensity,
      pumpEntryRateScale: hardSphereProfile.pumpEntryRateScale,
      releaseExitBudget,
      releaseExitSpeed: currentScheduleFrame.exitSpeed,
      releaseMinimumParticleCount: currentScheduleFrame.releaseMinimumParticleCount,
      releaseFeedback,
      releaseJustStopped,
    });
    assignedReleaseExitCountRef.current += simulationStepResult.acceptedReleaseExitCount;

    if (!releaseScheduleActive) {
      activeReleaseScheduleIdRef.current = null;
      activeReleaseScheduleElapsedRef.current = 0;
      assignedReleaseExitCountRef.current = 0;
      activeReleaseScheduleRef.current = null;
    }
    if (!releasePathOpen) releaseInitialPressureDeltaRef.current = 0;

    renderParticlePool(
      mesh,
      simulationRef.current,
      hardSphereProfile.particleRadius,
      displayVisualState,
      sceneTheme,
    );
    } catch (error) {
      runtimeFailedRef.current = true;
      reportRuntimeFailure(error);
    }
  });

  if (!enabled) return null;

  return (
    <group name="HeatCapacityHardSphereLayer" position={hardSphereProfile.groupPosition}>
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
