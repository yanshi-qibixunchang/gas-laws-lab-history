import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
  HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
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
} from '../../domain/heatCapacity/heatCapacityHardSphereGeometry.ts';
import {
  createHeatCapacityHardSphereSimulation,
  stepHeatCapacityHardSphereSimulation,
  type HeatCapacityHardSphereSimulation,
} from '../../domain/heatCapacity/heatCapacityHardSphereSimulation.ts';
import {
  createHeatCapacityHardSphereMainReleaseSchedule,
  createHeatCapacityHardSpherePostExchangeSchedule,
  getHeatCapacityHardSphereScheduleFrame,
  type HeatCapacityHardSphereVisualFlowSchedule,
} from '../../domain/heatCapacity/heatCapacityHardSphereReleaseSchedule.ts';
import {
  stepHeatCapacityHardSphereKineticSpeed,
  type HeatCapacityHardSphereKineticSpeedState,
} from '../../domain/heatCapacity/heatCapacityHardSphereKineticSpeed.ts';

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
  releaseTimeline?: HeatCapacityHardSphereReleaseTimeline;
  stopcockFlowOpen?: boolean;
  glassStopcockOpen: boolean;
  pumpValveOpen: boolean;
  pumpBulbState: HeatCapacityHardSpherePumpBulbState;
  pumpFlowActive?: boolean;
  pumpFlowIntensity?: number;
  particleMultiplier?: number;
  speedMultiplier?: number;
  visualResetKey?: number;
}

const BOTTLE_INNER_HALF_SIZE = new THREE.Vector3(0.73, 0.73, 0.73);
const PARTICLE_RADIUS = 0.048;
const OUTLET_APPROACH_POINT = new THREE.Vector3(0, BOTTLE_INNER_HALF_SIZE.y - PARTICLE_RADIUS * 0.35, 0);
const RELEASE_VISUAL_TAIL_S = 0.2;
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

const createSimulation = (): HeatCapacityHardSphereSimulation => (
  createHeatCapacityHardSphereSimulation({
    maxParticles: HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
    particleRadius: PARTICLE_RADIUS,
    container: skeletonHardSphereContainer,
    seed: HARD_SPHERE_SIMULATION_SEED,
  })
);

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
) => [
  timeline.phase,
  timeline.amountBeforeRatio.toFixed(4),
  timeline.amountTargetRatio.toFixed(4),
  timeline.responseDelayS.toFixed(3),
  timeline.mainDurationS.toFixed(3),
].join(':');

const getVisualFlowSchedule = (
  timeline: HeatCapacityHardSphereReleaseTimeline,
  particleMultiplier: number,
  gasTemperatureK: number | undefined,
  ambientTemperatureK: number | undefined,
  elapsedS: number,
): HeatCapacityHardSphereVisualFlowSchedule => {
  const id = getReleaseScheduleId(timeline);
  if (timeline.phase === 'main-release') {
    return createHeatCapacityHardSphereMainReleaseSchedule({
      id,
      amountBeforeRatio: timeline.amountBeforeRatio,
      amountCurrentRatio: timeline.amountCurrentRatio,
      amountTargetRatio: timeline.amountTargetRatio,
      particleMultiplier,
      elapsedS,
    });
  }
  if (timeline.phase === 'post-release-exchange') {
    const mainSchedule = createHeatCapacityHardSphereMainReleaseSchedule({
      id: `${id}:main-source`,
      amountBeforeRatio: timeline.amountBeforeRatio,
      amountCurrentRatio: timeline.amountBeforeRatio,
      amountTargetRatio: timeline.amountTargetRatio,
      particleMultiplier,
      elapsedS: 0,
    });
    return createHeatCapacityHardSpherePostExchangeSchedule({
      id,
      reservedExitCount: mainSchedule.postExchangeReservedCount,
      releaseMinimumParticleCount: mainSchedule.releaseMinimumParticleCount,
      gasTemperatureK: gasTemperatureK ?? ambientTemperatureK ?? 298.15,
      ambientTemperatureK: ambientTemperatureK ?? gasTemperatureK ?? 298.15,
      elapsedS,
    });
  }
  return {
    id,
    phase: 'idle',
    elapsedS: 0,
    durationS: 0,
    progress: 0,
    targetExitCount: 0,
    expectedExitedCount: 0,
    exitSpeed: 0,
    stopReason: 'none',
    totalPlannedExitCount: 0,
    postExchangeReservedCount: 0,
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
  releaseTimeline = HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
  stopcockFlowOpen = false,
  glassStopcockOpen,
  pumpValveOpen,
  pumpBulbState,
  pumpFlowActive = false,
  pumpFlowIntensity = 0,
  particleMultiplier = 1,
  speedMultiplier = 1,
  visualResetKey = 0,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const visualStateRef = useRef<HeatCapacityHardSphereVisualState | null>(null);
  const displayVisualStateRef = useRef<HeatCapacityHardSphereVisualState | null>(null);
  const outflowTailRemainingRef = useRef(0);
  const outflowDriftSpeedRef = useRef(0);
  const exitSelectionRateRef = useRef(0);
  const activeReleaseScheduleIdRef = useRef<string | null>(null);
  const activeReleaseScheduleElapsedRef = useRef(0);
  const submittedReleaseExitCountRef = useRef(0);
  const kineticSpeedStateRef = useRef<HeatCapacityHardSphereKineticSpeedState | null>(null);
  const simulationRef = useRef<HeatCapacityHardSphereSimulation>(createSimulation());
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

  useEffect(() => {
    hideParticlePool(meshRef.current, simulationRef.current);
    activeReleaseScheduleIdRef.current = null;
    activeReleaseScheduleElapsedRef.current = 0;
    submittedReleaseExitCountRef.current = 0;
    kineticSpeedStateRef.current = null;
  }, [enabled, particleMultiplier, visualResetKey]);

  useFrame((_, delta) => {
    if (!enabled) return;
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

    if (currentVisual.outflowActive) {
      outflowTailRemainingRef.current = RELEASE_VISUAL_TAIL_S;
      outflowDriftSpeedRef.current = currentVisual.outflowDriftSpeed;
      exitSelectionRateRef.current = currentVisual.exitSelectionRate;
    } else if (outflowTailRemainingRef.current > 0) {
      outflowTailRemainingRef.current = Math.max(0, outflowTailRemainingRef.current - safeDelta);
    }
    const outflowTailFactor = RELEASE_VISUAL_TAIL_S > 0
      ? clampNumber(outflowTailRemainingRef.current / RELEASE_VISUAL_TAIL_S, 0, 1)
      : 0;
    const effectiveOutflowDriftSpeed = currentVisual.outflowActive
      ? currentVisual.outflowDriftSpeed
      : outflowDriftSpeedRef.current * outflowTailFactor;
    const effectiveExitSelectionRate = currentVisual.outflowActive
      ? currentVisual.exitSelectionRate
      : exitSelectionRateRef.current * outflowTailFactor;
    const pumpPortActive = pumpFlowActive || (pumpBulbState === 'compressing' && pumpValveOpen);
    const baseVisualFlowSchedule = getVisualFlowSchedule(
      currentReleaseTimeline,
      particleMultiplier,
      gasTemperatureK,
      ambientTemperatureK,
      0,
    );
    const releaseScheduleActive = baseVisualFlowSchedule.phase === 'main-release' ||
      baseVisualFlowSchedule.phase === 'post-release-exchange';
    if (!releaseScheduleActive) {
      activeReleaseScheduleIdRef.current = null;
      activeReleaseScheduleElapsedRef.current = 0;
      submittedReleaseExitCountRef.current = 0;
    } else if (activeReleaseScheduleIdRef.current !== baseVisualFlowSchedule.id) {
      activeReleaseScheduleIdRef.current = baseVisualFlowSchedule.id;
      activeReleaseScheduleElapsedRef.current = releaseScheduleDeltaS;
      submittedReleaseExitCountRef.current = 0;
    } else {
      activeReleaseScheduleElapsedRef.current += releaseScheduleDeltaS;
    }
    const currentScheduleFrame = getHeatCapacityHardSphereScheduleFrame(
      getVisualFlowSchedule(
        currentReleaseTimeline,
        particleMultiplier,
        gasTemperatureK,
        ambientTemperatureK,
        activeReleaseScheduleElapsedRef.current,
      ),
      activeReleaseScheduleElapsedRef.current,
    );
    const releaseExitBudget = releaseScheduleActive
      ? Math.max(0, currentScheduleFrame.expectedExitedCount - submittedReleaseExitCountRef.current)
      : 0;
    submittedReleaseExitCountRef.current += releaseExitBudget;
    const kineticSpeedState = stepHeatCapacityHardSphereKineticSpeed({
      currentSpeed: kineticSpeedStateRef.current?.speed ?? currentVisual.thermalSpeedMultiplier,
      targetSpeed: currentVisual.thermalSpeedMultiplier,
      releaseMemoryRemainingS: kineticSpeedStateRef.current?.releaseMemoryRemainingS ?? 0,
      releaseActive: currentVisual.outflowActive || releaseScheduleActive,
      dtS: safeDelta,
    });
    kineticSpeedStateRef.current = kineticSpeedState;

    stepHeatCapacityHardSphereSimulation(simulationRef.current, {
      dtS: safeDelta,
      targetParticleCount: currentVisual.targetParticleCount,
      thermalSpeedMultiplier: kineticSpeedState.speed,
      outflowActive: currentVisual.outflowActive,
      outflowDriftSpeed: effectiveOutflowDriftSpeed,
      exitSelectionRate: effectiveExitSelectionRate,
      releasePhase: currentReleaseTimeline.phase,
      releaseExitBudget,
      releaseExitSpeed: currentScheduleFrame.exitSpeed,
      releaseMinimumParticleCount: currentScheduleFrame.releaseMinimumParticleCount,
      pumpFlowActive: pumpPortActive,
      pumpFlowIntensity,
    });

    for (const particle of simulationRef.current.particles) {
      const visible = particle.state !== 'hidden';
      dummyObject.position.set(particle.position.x, particle.position.y, particle.position.z);
      dummyObject.scale.setScalar(visible ? PARTICLE_RADIUS : 0);
      dummyObject.updateMatrix();
      mesh.setMatrixAt(particle.id, dummyObject.matrix);
      mesh.setColorAt(particle.id, visible ? getParticleColor(displayVisualState, sceneTheme) : hiddenParticleColor);
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
