import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { HeatCapacityInstrumentModelProps } from './InstrumentModelContract.ts';
import type { HeatCapacityInstrumentPartId } from '../../utils/heatCapacityExperiment.ts';

const vesselSize = 3.2;

const getPartColor = (
  partId: HeatCapacityInstrumentPartId,
  highlightedPart: HeatCapacityInstrumentPartId | null,
  active = false,
) => {
  if (highlightedPart === partId) return '#f59e0b';
  return active ? '#38bdf8' : '#64748b';
};

const stopAndActivate = (
  event: ThreeEvent<PointerEvent>,
  partId: HeatCapacityInstrumentPartId,
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void,
) => {
  event.stopPropagation();
  onPartActivate?.(partId);
};

const createParticles = (count: number) => {
  const visibleCount = Math.min(96, Math.max(24, Math.round(count * 0.55)));
  return Array.from({ length: visibleCount }, (_, index) => {
    const a = index * 12.9898;
    const b = index * 78.233;
    const c = index * 37.719;
    const noise = (value: number) => {
      const raw = Math.sin(value) * 43758.5453;
      return raw - Math.floor(raw);
    };
    return [
      (noise(a) - 0.5) * 2.45,
      (noise(b) - 0.5) * 2.45,
      (noise(c) - 0.5) * 2.45,
    ] as const;
  });
};

const Valve: React.FC<{
  partId: 'Valve_C1' | 'Valve_C2';
  hitPartId: 'Hit_C1' | 'Hit_C2';
  label: string;
  position: [number, number, number];
  open: boolean;
  highlightedPart: HeatCapacityInstrumentPartId | null;
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
}> = ({ partId, hitPartId, label, position, open, highlightedPart, onPartActivate }) => (
  <group position={position}>
    <mesh
      name={partId}
      rotation={[0, 0, open ? Math.PI / 2 : 0]}
      onPointerDown={(event) => stopAndActivate(event, hitPartId, onPartActivate)}
    >
      <boxGeometry args={[0.22, 0.72, 0.22]} />
      <meshStandardMaterial color={getPartColor(partId, highlightedPart, open)} metalness={0.35} roughness={0.35} />
    </mesh>
    <mesh name={hitPartId} visible={false} onPointerDown={(event) => stopAndActivate(event, hitPartId, onPartActivate)}>
      <boxGeometry args={[0.8, 0.9, 0.8]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
    <Html distanceFactor={8} position={[0, 0.62, 0]}>
      <div className="rounded border border-slate-300/70 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
        {label} {open ? 'open' : 'closed'}
      </div>
    </Html>
  </group>
);

const Pump: React.FC<{
  progress: number;
  highlightedPart: HeatCapacityInstrumentPartId | null;
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
}> = ({ progress, highlightedPart, onPartActivate }) => (
  <group position={[-3.45, -0.1, 0]}>
    <mesh name="Pump_Handle" position={[0, -progress * 0.35, 0]} onPointerDown={(event) => stopAndActivate(event, 'Hit_Pump', onPartActivate)}>
      <boxGeometry args={[0.24, 1.2, 0.24]} />
      <meshStandardMaterial color={getPartColor('Pump_Handle', highlightedPart, progress > 0)} metalness={0.25} roughness={0.4} />
    </mesh>
    <mesh position={[0, -0.78, 0]}>
      <boxGeometry args={[0.7, 0.32, 0.7]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    <mesh name="Hit_Pump" visible={false} onPointerDown={(event) => stopAndActivate(event, 'Hit_Pump', onPartActivate)}>
      <boxGeometry args={[1.1, 1.7, 1.1]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
    <Html distanceFactor={8} position={[0, 0.86, 0]}>
      <div className="rounded border border-slate-300/70 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
        pump
      </div>
    </Html>
  </group>
);

const Gauge: React.FC<{
  pressure: number;
  highlightedPart: HeatCapacityInstrumentPartId | null;
}> = ({ pressure, highlightedPart }) => {
  const needleRotation = -0.9 + Math.min(1, Math.max(0, (pressure - 90) / 90)) * 1.8;
  return (
    <group position={[0, 2.18, 0]}>
      <mesh name="Pressure_Gauge_Needle">
        <cylinderGeometry args={[0.52, 0.52, 0.08, 32]} />
        <meshStandardMaterial color={highlightedPart === 'Pressure_Gauge_Needle' ? '#fef3c7' : '#f8fafc'} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[0, 0, needleRotation]}>
        <boxGeometry args={[0.08, 0.72, 0.04]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <Html distanceFactor={8} position={[0, 0.72, 0]}>
        <div className="rounded border border-slate-300/70 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
          {pressure.toFixed(1)} kPa
        </div>
      </Html>
    </group>
  );
};

const TemperatureDisplay: React.FC<{
  temperature: number;
  highlightedPart: HeatCapacityInstrumentPartId | null;
}> = ({ temperature, highlightedPart }) => (
  <group position={[1.92, 0.82, 0]}>
    <mesh name="Temperature_Display">
      <boxGeometry args={[0.08, 0.9, 0.64]} />
      <meshStandardMaterial color={highlightedPart === 'Temperature_Display' ? '#fef3c7' : '#e2e8f0'} />
    </mesh>
    <Html distanceFactor={8} position={[0.12, 0, 0]}>
      <div className="rounded border border-slate-300/70 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
        T {temperature.toFixed(3)}
      </div>
    </Html>
  </group>
);

const InstrumentProceduralModel: React.FC<HeatCapacityInstrumentModelProps> = ({
  state,
  particleCount,
  onPartActivate,
}) => {
  const particles = useMemo(() => createParticles(particleCount), [particleCount]);
  const particleScale = Math.max(0.045, Math.min(0.09, 0.055 + (state.temperature - 1) * 0.05));
  const particleColor = state.temperature < 0.95 ? '#7dd3fc' : state.temperature > 1.03 ? '#fb923c' : '#38bdf8';

  return (
    <group>
      <mesh name="Vessel" onPointerDown={(event) => stopAndActivate(event, 'Vessel', onPartActivate)}>
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
      {particles.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[particleScale, 12, 12]} />
          <meshStandardMaterial color={particleColor} emissive={particleColor} emissiveIntensity={0.18} />
        </mesh>
      ))}
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
        onPartActivate={onPartActivate}
      />
      <Valve
        partId="Valve_C2"
        hitPartId="Hit_C2"
        label="C2"
        position={[2.05, 0.58, 0]}
        open={state.c2Open}
        highlightedPart={state.highlightedPart}
        onPartActivate={onPartActivate}
      />
      <Pump progress={state.pumpProgress} highlightedPart={state.highlightedPart} onPartActivate={onPartActivate} />
      <Gauge pressure={state.pressure} highlightedPart={state.highlightedPart} />
      <TemperatureDisplay temperature={state.temperature} highlightedPart={state.highlightedPart} />
    </group>
  );
};

export default InstrumentProceduralModel;
