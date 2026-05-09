import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { HeatCapacityInstrumentModelProps } from './InstrumentModelContract.ts';
import type {
  HeatCapacityInstrumentPartId,
  HeatCapacityParticleVisualState,
} from '../../utils/heatCapacityExperiment.ts';

const vesselSize = 3.2;
const TransparentHitboxMaterial = () => <meshBasicMaterial transparent opacity={0} depthWrite={false} />;
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const tooltipPositions: Partial<Record<HeatCapacityInstrumentPartId, [number, number, number]>> = {
  Hit_C1: [-2.05, 1.38, 0],
  Hit_C2: [2.05, 1.38, 0],
  Hit_Pump: [-3.45, 1.12, 0],
  Hit_Pressure_Gauge: [3.92, -0.23, 2.02],
  Hit_Temperature_Display: [2.32, 1.6, 0],
  Hit_Instrument_Box: [3.2, -0.18, 2.25],
  Pressure_Sensor: [-0.92, -0.86, 1.24],
  Temperature_Sensor: [0.94, 0.98, 1.28],
  Glass_Outer_Shell: [0, 1.1, 0],
  Square_Glass_Bottle: [0, 1.1, 0],
  Sealing_Stopper: [0, 2.08, 0],
  Top_Glass_Tube: [0, 2.86, 0],
  Valve_Manifold: [0, 2.38, 0],
  Instrument_Box_Temp_Display: [2.48, -0.25, 2.02],
  Instrument_Box_Pressure_Display: [3.22, -0.25, 2.02],
  Instrument_Box_Analog_Gauge: [3.92, -0.23, 2.02],
  Instrument_Box_Pump_Control: [4.24, 0.09, 2.02],
  Instrument_Box_Power_Switch: [4.48, -0.37, 2.02],
  Instrument_Box_Pump_Check_Switch: [4.24, 0.09, 2.02],
};

const focusPositions: Partial<Record<HeatCapacityInstrumentPartId, [number, number, number]>> = {
  Hit_C1: [-2.05, 0.58, 0],
  Valve_C1: [-2.05, 0.58, 0],
  Hit_C2: [2.05, 0.58, 0],
  Valve_C2: [2.05, 0.58, 0],
  Hit_Pump: [-3.45, -0.1, 0],
  Pump_Handle: [-3.45, -0.1, 0],
  Hit_Pressure_Gauge: [3.98, -0.14, 1.88],
  Pressure_Gauge_Needle: [3.98, -0.14, 1.88],
  Hit_Temperature_Display: [1.92, 0.82, 0],
  Temperature_Display: [1.92, 0.82, 0],
  Hit_Instrument_Box: [3.25, -0.58, 2.18],
  Instrument_Box: [3.25, -0.58, 2.18],
  Instrument_Box_Display: [3.25, -0.14, 1.88],
  Instrument_Box_Temp_Display: [2.45, -0.16, 1.88],
  Instrument_Box_Pressure_Display: [3.25, -0.16, 1.88],
  Instrument_Box_Analog_Gauge: [3.98, -0.14, 1.88],
  Instrument_Box_Power_Switch: [4.48, -0.37, 2.02],
  Instrument_Box_Pump_Control: [4.24, 0.09, 2.02],
};

const labelPointerStyle = { pointerEvents: 'auto' as const };
const tooltipPointerStyle = { pointerEvents: 'none' as const };

const formatDisplayMetric = (value: number | null | undefined, digits = 2) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const phaseDisplayLabels = {
  equalizing: 'equalize',
  pumping: 'pump',
  stabilizingP1: 'stabilize',
  recordP1: 'record p1',
  releasing: 'release',
  recovering: 'recover',
  recordP2: 'record p2',
  completed: 'done',
} as const;

const activateLabelPart = (
  event: React.PointerEvent,
  partId: HeatCapacityInstrumentPartId,
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void,
) => {
  event.stopPropagation();
  onPartActivate?.(partId);
};

const getPartColor = (
  partId: HeatCapacityInstrumentPartId,
  highlightedPart: HeatCapacityInstrumentPartId | null,
  secondaryHighlightedParts: HeatCapacityInstrumentPartId[] = [],
  active = false,
  aliases: HeatCapacityInstrumentPartId[] = [],
) => {
  const partIds = [partId, ...aliases];
  if (highlightedPart && partIds.includes(highlightedPart)) return '#f59e0b';
  if (partIds.some((id) => secondaryHighlightedParts.includes(id))) return '#facc15';
  return active ? '#38bdf8' : '#64748b';
};

const stopAndActivate = (
  event: ThreeEvent<PointerEvent | MouseEvent>,
  partId: HeatCapacityInstrumentPartId,
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void,
) => {
  event.stopPropagation();
  onPartActivate?.(partId);
};

const stopAndHover = (
  event: ThreeEvent<PointerEvent>,
  partId: HeatCapacityInstrumentPartId,
  onPartHover?: (partId: HeatCapacityInstrumentPartId) => void,
) => {
  event.stopPropagation();
  onPartHover?.(partId);
};

const useAnimatedMetric = (
  targetValue: number,
  powered: boolean,
  response = 4.5,
  jitter = 0,
) => {
  const valueRef = useRef(targetValue);
  const [displayValue, setDisplayValue] = useState(targetValue);

  useEffect(() => {
    if (!powered) {
      valueRef.current = targetValue;
      setDisplayValue(targetValue);
    }
  }, [powered, targetValue]);

  useFrame(({ clock }, delta) => {
    if (!powered) return;
    const settle = 1 - Math.exp(-response * delta);
    valueRef.current += (targetValue - valueRef.current) * settle;
    const closeEnough = Math.abs(targetValue - valueRef.current) < Math.max(jitter * 1.8, 0.002);
    const drift = closeEnough && jitter > 0
      ? Math.sin(clock.elapsedTime * 3.7 + targetValue * 0.011) * jitter
      : 0;
    setDisplayValue(valueRef.current + drift);
  });

  return displayValue;
};

interface AnimatedParticleSeed {
  base: [number, number, number];
  velocity: [number, number, number];
  outflowBias: number;
}

interface ParticleMotionState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

const createParticles = (count: number): AnimatedParticleSeed[] => {
  const visibleCount = Math.min(120, Math.max(36, Math.round(count * 0.68)));
  return Array.from({ length: visibleCount }, (_, index) => {
    const a = index * 12.9898;
    const b = index * 78.233;
    const c = index * 37.719;
    const noise = (value: number) => {
      const raw = Math.sin(value) * 43758.5453;
      return raw - Math.floor(raw);
    };
    const velocity = new THREE.Vector3(
      noise(a + 9.7) - 0.5,
      noise(b + 4.3) - 0.5,
      noise(c + 6.1) - 0.5,
    ).normalize();
    return {
      base: [
        (noise(a) - 0.5) * 2.45,
        (noise(b) - 0.5) * 2.45,
        (noise(c) - 0.5) * 2.45,
      ],
      velocity: [velocity.x, velocity.y, velocity.z],
      outflowBias: noise(a + b + c),
    };
  });
};

const createMotionState = (particle: AnimatedParticleSeed): ParticleMotionState => ({
  position: new THREE.Vector3(...particle.base),
  velocity: new THREE.Vector3(...particle.velocity).multiplyScalar(0.72),
});

const resolveWallBounce = (
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  bound: number,
  radius: number,
) => {
  const limit = bound - radius;
  for (const axis of ['x', 'y', 'z'] as const) {
    if (position[axis] > limit) {
      position[axis] = limit;
      velocity[axis] *= -1;
    }
    if (position[axis] < -limit) {
      position[axis] = -limit;
      velocity[axis] *= -1;
    }
  }
};

const resolveElasticParticleCollisions = (
  motions: ParticleMotionState[],
  visibleCount: number,
  radius: number,
) => {
  const minDistance = radius * 2;
  const minDistanceSquared = minDistance * minDistance;

  for (let i = 0; i < visibleCount; i += 1) {
    const first = motions[i];
    if (!first) continue;

    for (let j = i + 1; j < visibleCount; j += 1) {
      const second = motions[j];
      if (!second) continue;

      const delta = second.position.clone().sub(first.position);
      const distanceSquared = delta.lengthSq();
      if (distanceSquared <= 1e-8 || distanceSquared >= minDistanceSquared) continue;

      const distance = Math.sqrt(distanceSquared);
      const normal = delta.multiplyScalar(1 / distance);
      const overlap = (minDistance - distance) * 0.5;
      first.position.addScaledVector(normal, -overlap);
      second.position.addScaledVector(normal, overlap);

      const relativeVelocity = first.velocity.clone().sub(second.velocity);
      const normalVelocity = relativeVelocity.dot(normal);
      if (normalVelocity <= 0) continue;

      first.velocity.addScaledVector(normal, -normalVelocity);
      second.velocity.addScaledVector(normal, normalVelocity);
    }
  }
};

const AnimatedParticles: React.FC<{
  particleCount: number;
  visualState: HeatCapacityParticleVisualState;
}> = ({ particleCount, visualState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const motionsRef = useRef<ParticleMotionState[]>([]);
  const revealedCountRef = useRef(0);
  const particles = useMemo(() => createParticles(particleCount), [particleCount]);
  const targetVisibleCount = Math.min(
    particles.length,
    Math.max(18, Math.round(particles.length * clampNumber(visualState.densityMultiplier / 1.75, 0.45, 1))),
  );
  const particleScale = clampNumber(0.045 + visualState.speedMultiplier * 0.012, 0.048, 0.082);

  useEffect(() => {
    motionsRef.current = particles.map(createMotionState);
    revealedCountRef.current = Math.min(revealedCountRef.current || targetVisibleCount, targetVisibleCount);
  }, [particles]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const bound = vesselSize * 0.43;
    const safeDelta = Math.min(delta, 0.04);
    const revealRate = visualState.outflowActive ? 18 : 28;
    const previousVisibleCount = Math.round(revealedCountRef.current);
    if (revealedCountRef.current < targetVisibleCount) {
      revealedCountRef.current = Math.min(targetVisibleCount, revealedCountRef.current + revealRate * safeDelta);
    } else if (revealedCountRef.current > targetVisibleCount) {
      revealedCountRef.current = Math.max(targetVisibleCount, revealedCountRef.current - revealRate * safeDelta);
    }
    const visibleCount = Math.round(revealedCountRef.current);
    const step = safeDelta * 0.88 * visualState.speedMultiplier;

    particles.forEach((particle, index) => {
      const mesh = group.children[index] as THREE.Mesh | undefined;
      if (!mesh) return;
      const visible = index < visibleCount;
      mesh.visible = visible;
      if (!visible) return;

      const motion = motionsRef.current[index] ?? createMotionState(particle);
      motionsRef.current[index] = motion;

      if (index >= previousVisibleCount && index < visibleCount && !visualState.outflowActive) {
        motion.position.set(-bound * 0.84, particle.base[1] * 0.72, particle.base[2] * 0.72);
        motion.velocity.set(Math.abs(motion.velocity.x) + 0.35, motion.velocity.y, motion.velocity.z).normalize().multiplyScalar(0.72);
      }

      const thermalJitter = 0.025 * (1.05 - visualState.stability);
      motion.velocity.x += Math.sin(index * 17.17 + motion.position.y) * thermalJitter;
      motion.velocity.y += Math.cos(index * 11.73 + motion.position.z) * thermalJitter;
      motion.velocity.z += Math.sin(index * 7.31 + motion.position.x) * thermalJitter;
      motion.velocity.normalize().multiplyScalar(0.72);

      if (visualState.outflowActive && particle.outflowBias > 0.52) {
        motion.velocity.x += 0.18 * visualState.outflowIntensity;
      }

      motion.position.addScaledVector(motion.velocity, step * (1.18 - visualState.stability * 0.36));
      resolveWallBounce(motion.position, motion.velocity, bound, particleScale);
    });

    resolveElasticParticleCollisions(motionsRef.current, visibleCount, particleScale);

    particles.forEach((particle, index) => {
      const mesh = group.children[index] as THREE.Mesh | undefined;
      const motion = motionsRef.current[index];
      if (!mesh || !motion || index >= visibleCount) return;
      resolveWallBounce(motion.position, motion.velocity, bound, particleScale);
      mesh.position.copy(motion.position);
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.base}>
          <sphereGeometry args={[particleScale, 12, 12]} />
          <meshStandardMaterial
            color={visualState.color}
            emissive={visualState.color}
            emissiveIntensity={visualState.emissiveIntensity}
          />
        </mesh>
      ))}
    </group>
  );
};

const Valve: React.FC<{
  partId: 'Valve_C1' | 'Valve_C2';
  hitPartId: 'Hit_C1' | 'Hit_C2';
  label: string;
  position: [number, number, number];
  open: boolean;
  highlightedPart: HeatCapacityInstrumentPartId | null;
  secondaryHighlightedParts: HeatCapacityInstrumentPartId[];
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartHover?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartLeave?: () => void;
}> = ({
  partId,
  hitPartId,
  label,
  position,
  open,
  highlightedPart,
  secondaryHighlightedParts,
  onPartActivate,
  onPartHover,
  onPartLeave,
}) => (
  <group position={position}>
    <mesh
      name={partId}
      rotation={[0, 0, open ? Math.PI / 2 : 0]}
      onPointerUp={(event) => stopAndActivate(event, hitPartId, onPartActivate)}
      onPointerOver={(event) => stopAndHover(event, hitPartId, onPartHover)}
      onPointerOut={onPartLeave}
    >
      <boxGeometry args={[0.22, 0.72, 0.22]} />
      <meshStandardMaterial
        color={getPartColor(partId, highlightedPart, secondaryHighlightedParts, open, [hitPartId])}
        metalness={0.35}
        roughness={0.35}
      />
    </mesh>
    <mesh
      name={hitPartId}
      onPointerUp={(event) => stopAndActivate(event, hitPartId, onPartActivate)}
      onPointerOver={(event) => stopAndHover(event, hitPartId, onPartHover)}
      onPointerOut={onPartLeave}
    >
      <boxGeometry args={[0.8, 0.9, 0.8]} />
      <TransparentHitboxMaterial />
    </mesh>
    <Html distanceFactor={8} position={[0, 0.62, 0]} style={labelPointerStyle}>
      <div
        className="cursor-pointer rounded border border-slate-300/70 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm"
        onPointerDown={(event) => activateLabelPart(event, hitPartId, onPartActivate)}
      >
        {label} {open ? '开启' : '关闭'}
      </div>
    </Html>
  </group>
);

const Pump: React.FC<{
  progress: number;
  highlightedPart: HeatCapacityInstrumentPartId | null;
  secondaryHighlightedParts: HeatCapacityInstrumentPartId[];
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartHover?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartLeave?: () => void;
}> = ({
  progress,
  highlightedPart,
  secondaryHighlightedParts,
  onPartActivate,
  onPartHover,
  onPartLeave,
}) => (
  <group position={[-3.45, -0.1, 0]}>
    <mesh
      name="Pump_Handle"
      position={[0, -progress * 0.35, 0]}
      onPointerUp={(event) => stopAndActivate(event, 'Hit_Pump', onPartActivate)}
      onPointerOver={(event) => stopAndHover(event, 'Hit_Pump', onPartHover)}
      onPointerOut={onPartLeave}
    >
      <boxGeometry args={[0.24, 1.2, 0.24]} />
      <meshStandardMaterial
        color={getPartColor('Pump_Handle', highlightedPart, secondaryHighlightedParts, progress > 0, ['Hit_Pump'])}
        metalness={0.25}
        roughness={0.4}
      />
    </mesh>
    <mesh position={[0, -0.78, 0]}>
      <boxGeometry args={[0.7, 0.32, 0.7]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    <mesh
      name="Hit_Pump"
      onPointerUp={(event) => stopAndActivate(event, 'Hit_Pump', onPartActivate)}
      onPointerOver={(event) => stopAndHover(event, 'Hit_Pump', onPartHover)}
      onPointerOut={onPartLeave}
    >
      <boxGeometry args={[1.1, 1.7, 1.1]} />
      <TransparentHitboxMaterial />
    </mesh>
    <Html distanceFactor={8} position={[0, 0.86, 0]} style={labelPointerStyle}>
      <div
        className="cursor-pointer rounded border border-slate-300/70 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm"
        onPointerDown={(event) => activateLabelPart(event, 'Hit_Pump', onPartActivate)}
      >
        泵
      </div>
    </Html>
  </group>
);

const TemperatureDisplay: React.FC<{
  temperature: number;
  highlightedPart: HeatCapacityInstrumentPartId | null;
  secondaryHighlightedParts: HeatCapacityInstrumentPartId[];
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartHover?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartLeave?: () => void;
}> = ({
  temperature,
  highlightedPart,
  secondaryHighlightedParts,
  onPartActivate,
  onPartHover,
  onPartLeave,
}) => (
  <group position={[1.92, 0.82, 0]}>
    <mesh
      name="Temperature_Display"
      onPointerUp={(event) => stopAndActivate(event, 'Hit_Temperature_Display', onPartActivate)}
      onPointerOver={(event) => stopAndHover(event, 'Hit_Temperature_Display', onPartHover)}
      onPointerOut={onPartLeave}
    >
      <boxGeometry args={[0.08, 0.9, 0.64]} />
      <meshStandardMaterial
        color={getPartColor('Temperature_Display', highlightedPart, secondaryHighlightedParts, false, ['Hit_Temperature_Display'])}
      />
    </mesh>
    <mesh
      name="Hit_Temperature_Display"
      onPointerUp={(event) => stopAndActivate(event, 'Hit_Temperature_Display', onPartActivate)}
      onPointerOver={(event) => stopAndHover(event, 'Hit_Temperature_Display', onPartHover)}
      onPointerOut={onPartLeave}
    >
      <boxGeometry args={[0.58, 1.08, 0.92]} />
      <TransparentHitboxMaterial />
    </mesh>
    <Html distanceFactor={8} position={[0.86, -0.08, 0]} style={labelPointerStyle}>
      <div
        className="cursor-pointer rounded border border-slate-300/70 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm"
        onPointerDown={(event) => activateLabelPart(event, 'Hit_Temperature_Display', onPartActivate)}
      >
        T {temperature.toFixed(3)}
      </div>
    </Html>
  </group>
);

const GlassEnvelope: React.FC = () => (
  <group>
    <mesh name="Square_Glass_Bottle" position={[0, -0.02, 0]} scale={[1.12, 1.08, 1.12]}>
      <boxGeometry args={[vesselSize, vesselSize, vesselSize]} />
      <meshPhysicalMaterial
        color="#dbeafe"
        transparent
        opacity={0.13}
        roughness={0.08}
        transmission={0.72}
        thickness={0.24}
        clearcoat={0.7}
      />
    </mesh>
    <mesh name="Glass_Wall_Panels" position={[0, -0.02, 0]} scale={[1.13, 1.09, 1.13]}>
      <boxGeometry args={[vesselSize, vesselSize, vesselSize]} />
      <meshBasicMaterial color="#93c5fd" transparent opacity={0.06} wireframe />
    </mesh>
    <mesh name="Glass_Edge_Frame" position={[0, -0.02, 0]} scale={[1.135, 1.095, 1.135]}>
      <boxGeometry args={[vesselSize, vesselSize, vesselSize]} />
      <meshBasicMaterial color="#bfdbfe" transparent opacity={0.38} wireframe />
    </mesh>
    <mesh name="Glass_Bottom_Base" position={[0, -1.88, 0]}>
      <boxGeometry args={[3.9, 0.18, 3.9]} />
      <meshStandardMaterial color="#d8e7f2" transparent opacity={0.34} roughness={0.28} />
    </mesh>
    <mesh name="Glass_Outer_Shell" position={[0, -0.02, 0]} scale={[1.14, 1.1, 1.14]}>
      <boxGeometry args={[vesselSize, vesselSize, vesselSize]} />
      <meshBasicMaterial color="#dbeafe" transparent opacity={0.035} />
    </mesh>
  </group>
);

const TopValveAssembly: React.FC = () => (
  <group>
    <mesh name="Sealing_Stopper" position={[0, 1.78, 0]}>
      <cylinderGeometry args={[0.66, 0.82, 0.34, 36]} />
      <meshStandardMaterial color="#e9d5a6" roughness={0.46} />
    </mesh>
    <mesh position={[0, 1.98, 0]}>
      <cylinderGeometry args={[0.74, 0.74, 0.08, 36]} />
      <meshStandardMaterial color="#f5deb3" roughness={0.38} />
    </mesh>
    <mesh name="Top_Glass_Tube" position={[0, 2.48, 0]}>
      <cylinderGeometry args={[0.14, 0.14, 1.08, 24]} />
      <meshPhysicalMaterial color="#dbeafe" transparent opacity={0.32} transmission={0.58} thickness={0.12} />
    </mesh>
    <mesh name="Valve_Manifold" position={[0, 2.16, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.17, 0.17, 1.35, 28]} />
      <meshPhysicalMaterial color="#dbeafe" transparent opacity={0.34} transmission={0.5} thickness={0.12} />
    </mesh>
    <mesh position={[-0.78, 2.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 0.72, 20]} />
      <meshPhysicalMaterial color="#dbeafe" transparent opacity={0.34} transmission={0.5} thickness={0.1} />
    </mesh>
    <mesh position={[0.78, 2.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 0.72, 20]} />
      <meshPhysicalMaterial color="#dbeafe" transparent opacity={0.34} transmission={0.5} thickness={0.1} />
    </mesh>
    <mesh position={[-1.16, 2.16, 0]}>
      <sphereGeometry args={[0.17, 18, 18]} />
      <meshStandardMaterial color="#60a5fa" metalness={0.18} roughness={0.34} />
    </mesh>
    <mesh position={[1.16, 2.16, 0]}>
      <sphereGeometry args={[0.17, 18, 18]} />
      <meshStandardMaterial color="#f97316" metalness={0.18} roughness={0.34} />
    </mesh>
  </group>
);

const PanelLCD: React.FC<{
  name: HeatCapacityInstrumentPartId;
  position: [number, number, number];
  label: string;
  value: string;
  powered: boolean;
  width?: number;
  hitPartId?: HeatCapacityInstrumentPartId;
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartHover?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartLeave?: () => void;
}> = ({
  name,
  position,
  label,
  value,
  powered,
  width = 0.82,
  hitPartId = 'Hit_Instrument_Box',
  onPartActivate,
  onPartHover,
  onPartLeave,
}) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    return canvasTexture;
  }, []);

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = powered ? '#38bdf8' : '#1e293b';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = powered ? '#7dd3fc' : '#475569';
    context.lineWidth = 12;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = powered ? '#062235' : '#64748b';
    context.font = '700 30px monospace';
    context.textAlign = 'left';
    context.fillText(label, 30, 45);
    context.font = '900 70px monospace';
    context.textAlign = 'center';
    context.fillText(powered ? value : '----', canvas.width / 2, 126);
    texture.needsUpdate = true;
  }, [label, powered, texture, value]);

  return (
    <mesh
      name={name}
      position={position}
      onPointerUp={(event) => stopAndActivate(event, hitPartId, onPartActivate)}
      onPointerOver={(event) => stopAndHover(event, hitPartId, onPartHover)}
      onPointerOut={onPartLeave}
    >
      <boxGeometry args={[width, 0.36, 0.045]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
};

const PanelText: React.FC<{
  position: [number, number, number];
  text: string;
  width?: number;
  height?: number;
  size?: number;
  color?: string;
}> = ({ position, text, width = 0.34, height = 0.16, size = 48, color = '#0f172a' }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    return canvasTexture;
  }, []);

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    context.font = `800 ${size}px "Microsoft YaHei", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    texture.needsUpdate = true;
  }, [color, size, text, texture]);

  return (
    <mesh position={position}>
      <boxGeometry args={[width, height, 0.01]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
};

const PanelLeverSwitch: React.FC<{
  name: HeatCapacityInstrumentPartId;
  hitPartId: HeatCapacityInstrumentPartId;
  position: [number, number, number];
  label: string;
  isOn: boolean;
  momentary?: boolean;
  highlighted?: boolean;
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartHover?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartLeave?: () => void;
}> = ({
  name,
  hitPartId,
  position,
  label,
  isOn,
  momentary = false,
  highlighted = false,
  onPartActivate,
  onPartHover,
  onPartLeave,
}) => {
  const targetRotation = isOn ? -0.48 : 0.48;
  const rotationRef = useRef(targetRotation);
  const [rotation, setRotation] = useState(targetRotation);

  useFrame((_, delta) => {
    rotationRef.current += (targetRotation - rotationRef.current) * (1 - Math.exp(-8.5 * delta));
    setRotation(rotationRef.current);
  });

  return (
    <group position={position}>
      <mesh
        name={name}
        position={[0, 0, 0.012]}
        onPointerUp={(event) => stopAndActivate(event, hitPartId, onPartActivate)}
        onPointerOver={(event) => stopAndHover(event, hitPartId, onPartHover)}
        onPointerOut={onPartLeave}
      >
        <boxGeometry args={[0.38, 0.58, 0.045]} />
        <meshStandardMaterial color={highlighted ? '#fde68a' : '#f8fafc'} metalness={0.08} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, 0.048]}>
        <boxGeometry args={[0.07, 0.38, 0.025]} />
        <meshStandardMaterial color="#475569" metalness={0.35} roughness={0.24} />
      </mesh>
      <group rotation={[rotation, 0, 0]} position={[0, 0, 0.085]}>
        <mesh position={[0, 0.02, 0.085]}>
          <boxGeometry args={[0.055, 0.34, 0.055]} />
          <meshStandardMaterial color={momentary ? '#475569' : '#334155'} metalness={0.46} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.2, 0.14]}>
          <sphereGeometry args={[0.09, 20, 20]} />
          <meshStandardMaterial color={isOn || highlighted ? '#f59e0b' : '#64748b'} metalness={0.34} roughness={0.22} />
        </mesh>
      </group>
      <PanelText position={[0, 0.43, 0.064]} text={'\u5f00'} width={0.18} height={0.1} size={52} color="#0f172a" />
      <PanelText position={[0, -0.43, 0.064]} text={'\u5173'} width={0.18} height={0.1} size={52} color="#0f172a" />
      <PanelText position={[0, -0.68, 0.066]} text={label} width={0.5} height={0.13} size={38} color="#1e293b" />
      <mesh
        name={name}
        position={[0, 0, 0.14]}
        onPointerUp={(event) => stopAndActivate(event, hitPartId, onPartActivate)}
        onPointerOver={(event) => stopAndHover(event, hitPartId, onPartHover)}
        onPointerOut={onPartLeave}
      >
        <boxGeometry args={[0.56, 0.88, 0.3]} />
        <TransparentHitboxMaterial />
      </mesh>
    </group>
  );
};

const SensorAndInstrumentChain: React.FC<{
  instrumentState: HeatCapacityInstrumentModelProps['state'];
  displayState: HeatCapacityInstrumentModelProps['displayState'];
  highlightedPart: HeatCapacityInstrumentPartId | null;
  secondaryHighlightedParts: HeatCapacityInstrumentPartId[];
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartHover?: (partId: HeatCapacityInstrumentPartId) => void;
  onPartLeave?: () => void;
}> = ({
  instrumentState,
  displayState,
  highlightedPart,
  secondaryHighlightedParts,
  onPartActivate,
  onPartHover,
  onPartLeave,
}) => {
  const pressureCable = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.7, -0.52, 0.68),
    new THREE.Vector3(-0.72, -1.78, 1.72),
    new THREE.Vector3(1.35, -1.94, 2.2),
    new THREE.Vector3(2.18, -1.32, 2.05),
  ]), []);
  const temperatureCable = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.44, 1.62, 0.88),
    new THREE.Vector3(0.98, 1.24, 1.86),
    new THREE.Vector3(2.08, -0.86, 2.34),
    new THREE.Vector3(2.72, -1.08, 2.06),
  ]), []);
  const boxColor = getPartColor('Instrument_Box', highlightedPart, secondaryHighlightedParts, false, ['Hit_Instrument_Box']);
  const screenColor = getPartColor('Instrument_Box_Display', highlightedPart, secondaryHighlightedParts, false, ['Hit_Instrument_Box']);
  const powered = displayState.instrumentPowered;
  const previousPumpProgress = useRef(instrumentState.pumpProgress);
  const pumpPulseTimer = useRef<number | null>(null);
  const [pumpPulseActive, setPumpPulseActive] = useState(false);
  const animatedPressure = useAnimatedMetric(displayState.pressure, powered, 3.6, 0.08);
  const animatedTemperature = useAnimatedMetric(displayState.temperature, powered, 3.0, 0.004);
  const analogNeedleRotation = powered ? -1.15 + clampNumber((animatedPressure - 90) / 80, 0, 1) * 2.3 : -1.25;
  useEffect(() => {
    if (instrumentState.pumpProgress === previousPumpProgress.current) return undefined;
    previousPumpProgress.current = instrumentState.pumpProgress;
    setPumpPulseActive(true);
    if (pumpPulseTimer.current !== null) window.clearTimeout(pumpPulseTimer.current);
    pumpPulseTimer.current = window.setTimeout(() => {
      setPumpPulseActive(false);
      pumpPulseTimer.current = null;
    }, 900);
    return undefined;
  }, [instrumentState.pumpProgress]);

  useEffect(() => () => {
    if (pumpPulseTimer.current !== null) window.clearTimeout(pumpPulseTimer.current);
  }, []);

  const pumpActive = (
    pumpPulseActive ||
    highlightedPart === 'Hit_Pump' ||
    highlightedPart === 'Pump_Handle' ||
    highlightedPart === 'Instrument_Box_Pump_Control'
  );
  const pumpTravelTarget = clampNumber(instrumentState.pumpProgress, 0, 1) * 0.48 + (pumpActive ? 0.18 : 0);
  const pumpTravel = useAnimatedMetric(pumpTravelTarget, true, 7.5, 0);
  const sensorChainExplanation = '传感器数据由压力腔内传感器采集并显示到外部仪表箱';
  return (
    <group>
      <mesh
        name="Pressure_Sensor"
        position={[-1.68, -0.52, 0.68]}
        rotation={[0, 0, Math.PI / 2]}
        onPointerUp={(event) => stopAndActivate(event, 'Pressure_Sensor', onPartActivate)}
        onPointerOver={(event) => stopAndHover(event, 'Pressure_Sensor', onPartHover)}
        onPointerOut={onPartLeave}
      >
        <cylinderGeometry args={[0.07, 0.1, 0.42, 18]} />
        <meshStandardMaterial color="#94a3b8" emissive="#334155" emissiveIntensity={0.08} metalness={0.58} roughness={0.22} />
      </mesh>
      <mesh
        name="Temperature_Sensor"
        position={[0.44, 0.25, 0.88]}
        onPointerUp={(event) => stopAndActivate(event, 'Temperature_Sensor', onPartActivate)}
        onPointerOver={(event) => stopAndHover(event, 'Temperature_Sensor', onPartHover)}
        onPointerOut={onPartLeave}
      >
        <cylinderGeometry args={[0.045, 0.055, 2.35, 16]} />
        <meshStandardMaterial color="#f8fafc" emissive="#cbd5e1" emissiveIntensity={0.08} metalness={0.18} roughness={0.2} />
      </mesh>
      <mesh position={[0.44, -0.98, 0.88]}>
        <sphereGeometry args={[0.08, 18, 18]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.18} metalness={0.2} roughness={0.3} />
      </mesh>
      <mesh
        name="Sensor_Cable_Pressure"
        onPointerUp={(event) => stopAndActivate(event, 'Sensor_Cable_Pressure', onPartActivate)}
        onPointerOver={(event) => stopAndHover(event, 'Sensor_Cable_Pressure', onPartHover)}
        onPointerOut={onPartLeave}
      >
        <tubeGeometry args={[pressureCable, 36, 0.024, 8, false]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
      <mesh
        name="Sensor_Cable_Temperature"
        onPointerUp={(event) => stopAndActivate(event, 'Sensor_Cable_Temperature', onPartActivate)}
        onPointerOver={(event) => stopAndHover(event, 'Sensor_Cable_Temperature', onPartHover)}
        onPointerOut={onPartLeave}
      >
        <tubeGeometry args={[temperatureCable, 36, 0.024, 8, false]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>
      <group position={[3.95, 0.9, 1.05]}>
        <mesh name="Pump_Column">
          <boxGeometry args={[0.32, 3.05, 0.32]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.16} roughness={0.3} />
        </mesh>
        <group
          name="Pump_Slider"
          position={[0, 0.86 - pumpTravel, 0.19]}
          onPointerUp={(event) => stopAndActivate(event, 'Hit_Pump', onPartActivate)}
          onPointerOver={(event) => stopAndHover(event, 'Hit_Pump', onPartHover)}
          onPointerOut={onPartLeave}
        >
          <mesh name="Pump_Handle">
            <boxGeometry args={[0.42, 0.24, 0.12]} />
            <meshStandardMaterial color={pumpActive ? '#f59e0b' : '#64748b'} metalness={0.28} roughness={0.24} />
          </mesh>
        </group>
        <mesh
          name="Hit_Pump"
          onPointerUp={(event) => stopAndActivate(event, 'Hit_Pump', onPartActivate)}
          onPointerOver={(event) => stopAndHover(event, 'Hit_Pump', onPartHover)}
          onPointerOut={onPartLeave}
        >
          <boxGeometry args={[0.9, 3.35, 0.85]} />
          <TransparentHitboxMaterial />
        </mesh>
      </group>
      <group position={[3.25, -0.72, 2.18]} rotation={[0, -0.18, 0]}>
        <mesh
          name="Instrument_Box"
          onPointerUp={(event) => stopAndActivate(event, 'Hit_Instrument_Box', onPartActivate)}
          onPointerOver={(event) => stopAndHover(event, 'Hit_Instrument_Box', onPartHover)}
          onPointerOut={onPartLeave}
        >
          <boxGeometry args={[3.7, 1.12, 0.72]} />
          <meshStandardMaterial color={boxColor === '#64748b' ? '#e5edf5' : boxColor} metalness={0.16} roughness={0.38} />
        </mesh>
        <mesh
          name="Instrument_Box_Display"
          position={[0, 0.16, 0.375]}
          userData={{ explanation: sensorChainExplanation }}
          onPointerUp={(event) => stopAndActivate(event, 'Hit_Instrument_Box', onPartActivate)}
          onPointerOver={(event) => stopAndHover(event, 'Hit_Instrument_Box', onPartHover)}
          onPointerOut={onPartLeave}
        >
          <boxGeometry args={[3.32, 0.72, 0.04]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.05} roughness={0.32} />
        </mesh>
        <mesh name="Instrument_Box_Front_Panel" position={[0, 0.16, 0.402]}>
          <boxGeometry args={[3.38, 0.78, 0.012]} />
          <meshBasicMaterial color="#e2e8f0" transparent opacity={0.1} />
        </mesh>
        <PanelLCD
          name="Instrument_Box_Temp_Display"
          position={[-1.08, 0.22, 0.405]}
          label="T"
          value={formatDisplayMetric(animatedTemperature, 3)}
          powered={powered}
          width={0.76}
          onPartActivate={onPartActivate}
          onPartHover={onPartHover}
          onPartLeave={onPartLeave}
        />
        <mesh name="Instrument_Box_Temp_LCD" position={[-1.08, 0.22, 0.433]}>
          <boxGeometry args={[0.8, 0.4, 0.012]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
        </mesh>
        <PanelLCD
          name="Instrument_Box_Pressure_Display"
          position={[-0.18, 0.22, 0.405]}
          label="P kPa"
          value={formatDisplayMetric(animatedPressure, 1)}
          powered={powered}
          width={0.9}
          hitPartId="Hit_Pressure_Gauge"
          onPartActivate={onPartActivate}
          onPartHover={onPartHover}
          onPartLeave={onPartLeave}
        />
        <mesh name="Instrument_Box_Pressure_LCD" position={[-0.18, 0.22, 0.433]}>
          <boxGeometry args={[0.94, 0.4, 0.012]} />
          <meshBasicMaterial color={screenColor === '#64748b' ? '#38bdf8' : screenColor} transparent opacity={0.08} />
        </mesh>
        <group
          name="Instrument_Box_Analog_Gauge"
          position={[0.82, 0.18, 0.41]}
          userData={{ pressure: animatedPressure }}
          onPointerUp={(event) => stopAndActivate(event, 'Hit_Pressure_Gauge', onPartActivate)}
          onPointerOver={(event) => stopAndHover(event, 'Hit_Pressure_Gauge', onPartHover)}
          onPointerOut={onPartLeave}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.045, 36]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.28} />
          </mesh>
          <mesh name="Pressure_Gauge_Needle" position={[0, 0, 0.028]} rotation={[0, 0, analogNeedleRotation]}>
            <boxGeometry args={[0.035, 0.27, 0.018]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
        <mesh
          name="Hit_Pressure_Gauge"
          position={[0.82, 0.18, 0.43]}
          onPointerUp={(event) => stopAndActivate(event, 'Hit_Pressure_Gauge', onPartActivate)}
          onPointerOver={(event) => stopAndHover(event, 'Hit_Pressure_Gauge', onPartHover)}
          onPointerOut={onPartLeave}
        >
          <boxGeometry args={[0.64, 0.58, 0.18]} />
          <TransparentHitboxMaterial />
        </mesh>
        <PanelLeverSwitch
          name="Instrument_Box_Pump_Control"
          hitPartId="Hit_Pump"
          position={[1.28, 0.13, 0.55]}
          label={'\u6253\u6c14'}
          isOn={pumpActive}
          momentary
          highlighted={pumpActive}
          onPartActivate={onPartActivate}
          onPartHover={onPartHover}
          onPartLeave={onPartLeave}
        />
        <mesh
          name="Instrument_Box_Pump_Check_Switch"
          position={[1.28, 0.18, 0.62]}
          onPointerUp={(event) => stopAndActivate(event, 'Hit_Pump', onPartActivate)}
          onPointerOver={(event) => stopAndHover(event, 'Hit_Pump', onPartHover)}
          onPointerOut={onPartLeave}
        >
          <boxGeometry args={[0.36, 0.54, 0.22]} />
          <TransparentHitboxMaterial />
        </mesh>
        <PanelLeverSwitch
          name="Instrument_Box_Power_Switch"
          hitPartId="Instrument_Box_Power_Switch"
          position={[1.58, -0.25, 0.55]}
          label={'\u7535\u6e90'}
          isOn={powered}
          highlighted={highlightedPart === 'Instrument_Box_Power_Switch'}
          onPartActivate={onPartActivate}
          onPartHover={onPartHover}
          onPartLeave={onPartLeave}
        />
        <mesh name="Instrument_Box_Power_Light" position={[1.58, 0.08, 0.6]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color={powered ? '#22c55e' : '#475569'} emissive={powered ? '#22c55e' : '#000000'} emissiveIntensity={powered ? 0.65 : 0} />
        </mesh>
        <mesh
          name="Hit_Instrument_Box"
          position={[0, 0.04, 0.12]}
          onPointerUp={(event) => stopAndActivate(event, 'Hit_Instrument_Box', onPartActivate)}
          onPointerOver={(event) => stopAndHover(event, 'Hit_Instrument_Box', onPartHover)}
          onPointerOut={onPartLeave}
        >
          <boxGeometry args={[3.96, 1.24, 0.24]} />
          <TransparentHitboxMaterial />
        </mesh>
      </group>
    </group>
  );
};

const FocusHalo: React.FC<{
  partId: HeatCapacityInstrumentPartId | null;
}> = ({ partId }) => {
  const groupRef = useRef<THREE.Group>(null);
  const position = partId ? focusPositions[partId] : null;

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 4.6) * 0.09;
    group.scale.setScalar(pulse);
    group.rotation.z = clock.elapsedTime * 0.9;
  });

  if (!position) return null;

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <torusGeometry args={[0.72, 0.025, 10, 64]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <pointLight color="#facc15" intensity={0.85} distance={2.4} />
    </group>
  );
};

const InstrumentProceduralModel: React.FC<HeatCapacityInstrumentModelProps> = ({
  state,
  particleCount,
  particleVisualState,
  displayState,
  interactionHints,
  onPartActivate,
}) => {
  const [hoveredPart, setHoveredPart] = useState<HeatCapacityInstrumentPartId | null>(null);
  const hoveredHint = hoveredPart ? interactionHints?.[hoveredPart] : null;

  useEffect(() => {
    if (!hoveredPart) return undefined;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [hoveredPart]);

  return (
    <group>
      <GlassEnvelope />
      <mesh name="Vessel" onPointerUp={(event) => stopAndActivate(event, 'Vessel', onPartActivate)}>
        <boxGeometry args={[vesselSize, vesselSize, vesselSize]} />
        <meshPhysicalMaterial
          color="#bae6fd"
          transparent
          opacity={0.18}
          roughness={0.18}
          transmission={0.45}
          thickness={0.18}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(vesselSize, vesselSize, vesselSize)]} />
        <lineBasicMaterial color="#64748b" />
      </lineSegments>
      <TopValveAssembly />
      <FocusHalo partId={state.highlightedPart} />
      <AnimatedParticles particleCount={particleCount} visualState={particleVisualState} />
      <SensorAndInstrumentChain
        instrumentState={state}
        displayState={displayState}
        highlightedPart={state.highlightedPart}
        secondaryHighlightedParts={state.secondaryHighlightedParts}
        onPartActivate={onPartActivate}
        onPartHover={setHoveredPart}
        onPartLeave={() => setHoveredPart(null)}
      />
      <mesh position={[-2.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 1.38, 18]} />
        <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.35} />
      </mesh>
      <mesh position={[2.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 1.38, 18]} />
        <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.35} />
      </mesh>
      <Valve
        partId="Valve_C1"
        hitPartId="Hit_C1"
        label="C1"
        position={[-2.05, 0.58, 0]}
        open={state.c1Open}
        highlightedPart={state.highlightedPart}
        secondaryHighlightedParts={state.secondaryHighlightedParts}
        onPartActivate={onPartActivate}
        onPartHover={setHoveredPart}
        onPartLeave={() => setHoveredPart(null)}
      />
      <Valve
        partId="Valve_C2"
        hitPartId="Hit_C2"
        label="C2"
        position={[2.05, 0.58, 0]}
        open={state.c2Open}
        highlightedPart={state.highlightedPart}
        secondaryHighlightedParts={state.secondaryHighlightedParts}
        onPartActivate={onPartActivate}
        onPartHover={setHoveredPart}
        onPartLeave={() => setHoveredPart(null)}
      />
      <TemperatureDisplay
        temperature={state.temperature}
        highlightedPart={state.highlightedPart}
        secondaryHighlightedParts={state.secondaryHighlightedParts}
        onPartActivate={onPartActivate}
        onPartHover={setHoveredPart}
        onPartLeave={() => setHoveredPart(null)}
      />
      {hoveredPart && hoveredHint && (
        <Html distanceFactor={7} position={tooltipPositions[hoveredPart] ?? [0, 0, 0]} style={tooltipPointerStyle}>
          <div className="max-w-[180px] rounded border border-sky-200 bg-white/95 px-2 py-1 text-[10px] font-semibold leading-4 text-slate-700 shadow-sm">
            {hoveredHint}
          </div>
        </Html>
      )}
    </group>
  );
};

export default InstrumentProceduralModel;
