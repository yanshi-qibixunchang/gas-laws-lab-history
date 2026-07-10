import {
  PHYSICS_ENGINE_SNAPSHOT_VERSION,
  type PhysicsEngineSnapshotV1,
} from '../../domain/hardSphere/PhysicsEngine.ts';
import type {
  Particle,
  PressureWindowPoint,
  SimulationParams,
} from '../../shared/types.ts';
import {
  isPersistenceFiniteNumber as isFiniteNumber,
  isPersistenceRecord as isRecord,
} from './workbenchPersistenceValue.ts';

const cloneParticle = (particle: Particle): Particle => ({ ...particle });

const clonePressureWindowPoint = (point: PressureWindowPoint): PressureWindowPoint => ({ ...point });

export const cloneHardSphereEngineSnapshot = (
  snapshot: PhysicsEngineSnapshotV1 | null | undefined,
): PhysicsEngineSnapshotV1 | null => (
  snapshot
    ? {
        ...snapshot,
        params: { ...snapshot.params },
        particles: snapshot.particles.map(cloneParticle),
        collectedSpeeds: [...snapshot.collectedSpeeds],
        collectedEnergies: [...snapshot.collectedEnergies],
        tempHistory: snapshot.tempHistory.map((point) => ({ ...point })),
        pressureHistory: snapshot.pressureHistory.map(clonePressureWindowPoint),
      }
    : null
);

export const normalizeSimulationParamsSnapshot = (
  value: unknown,
): SimulationParams | null => {
  if (!isRecord(value)) return null;
  const requiredKeys = ['L', 'N', 'r', 'm', 'k', 'dt', 'nu', 'equilibriumTime', 'statsDuration'] as const;
  if (!requiredKeys.every((key) => isFiniteNumber(value[key]))) return null;
  const params = {
    L: value.L as number,
    N: value.N as number,
    r: value.r as number,
    m: value.m as number,
    k: value.k as number,
    dt: value.dt as number,
    nu: value.nu as number,
    equilibriumTime: value.equilibriumTime as number,
    statsDuration: value.statsDuration as number,
  };
  if (
    params.L <= 0 ||
    params.N <= 0 ||
    params.r <= 0 ||
    params.m <= 0 ||
    params.k <= 0 ||
    params.dt <= 0 ||
    params.nu < 0 ||
    params.equilibriumTime < 0 ||
    params.statsDuration <= 0
  ) {
    return null;
  }
  if (value.targetTemperature !== undefined && !isFiniteNumber(value.targetTemperature)) return null;
  return {
    ...params,
    ...(isFiniteNumber(value.targetTemperature) ? { targetTemperature: value.targetTemperature as number } : {}),
  };
};

const normalizeParticle = (value: unknown): Particle | null => {
  if (!isRecord(value)) return null;
  const keys = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'speed', 'energy'] as const;
  if (!keys.every((key) => isFiniteNumber(value[key]))) return null;
  return {
    x: value.x as number,
    y: value.y as number,
    z: value.z as number,
    vx: value.vx as number,
    vy: value.vy as number,
    vz: value.vz as number,
    speed: value.speed as number,
    energy: value.energy as number,
  };
};

const normalizeNumberArray = (value: unknown): number[] | null => (
  Array.isArray(value) && value.every(isFiniteNumber) ? [...value] : null
);

const normalizeTempHistory = (
  value: unknown,
): PhysicsEngineSnapshotV1['tempHistory'] | null => {
  if (!Array.isArray(value)) return null;
  const points = value.map((point) => {
    if (!isRecord(point)) return null;
    if (!isFiniteNumber(point.time) || !isFiniteNumber(point.error) || !isFiniteNumber(point.totalEnergy)) {
      return null;
    }
    return {
      time: point.time,
      error: point.error,
      totalEnergy: point.totalEnergy,
    };
  });
  return points.every((point): point is NonNullable<typeof point> => point !== null) ? points : null;
};

const normalizePressureHistory = (
  value: unknown,
): PressureWindowPoint[] | null => {
  if (!Array.isArray(value)) return null;
  const points = value.map((point) => {
    if (!isRecord(point)) return null;
    if (
      !isFiniteNumber(point.time) ||
      !isFiniteNumber(point.duration) ||
      !isFiniteNumber(point.measuredPressure) ||
      !isFiniteNumber(point.idealPressure) ||
      typeof point.isCollectionWindow !== 'boolean'
    ) {
      return null;
    }
    return {
      time: point.time,
      duration: point.duration,
      measuredPressure: point.measuredPressure,
      idealPressure: point.idealPressure,
      isCollectionWindow: point.isCollectionWindow,
    };
  });
  return points.every((point): point is NonNullable<typeof point> => point !== null) ? points : null;
};

export const normalizeHardSphereEngineSnapshot = (
  value: unknown,
): PhysicsEngineSnapshotV1 | null => {
  if (!isRecord(value) || value.schemaVersion !== PHYSICS_ENGINE_SNAPSHOT_VERSION) return null;
  const params = normalizeSimulationParamsSnapshot(value.params);
  const particles = Array.isArray(value.particles)
    ? value.particles.map(normalizeParticle)
    : null;
  const collectedSpeeds = normalizeNumberArray(value.collectedSpeeds);
  const collectedEnergies = normalizeNumberArray(value.collectedEnergies);
  const tempHistory = normalizeTempHistory(value.tempHistory);
  const pressureHistory = normalizePressureHistory(value.pressureHistory);
  if (
    !params ||
    !particles ||
    !particles.every((particle): particle is Particle => particle !== null) ||
    !collectedSpeeds ||
    !collectedEnergies ||
    !tempHistory ||
    !pressureHistory ||
    !isFiniteNumber(value.time) ||
    !isFiniteNumber(value.targetTemperature) ||
    !isFiniteNumber(value.collectedSampleWindowTotal) ||
    !isFiniteNumber(value.lastSampleTime) ||
    !isFiniteNumber(value.pressureWindowStartTime) ||
    !isFiniteNumber(value.pressureWindowMomentum) ||
    !isFiniteNumber(value.latestMeasuredPressure)
  ) {
    return null;
  }
  return {
    schemaVersion: PHYSICS_ENGINE_SNAPSHOT_VERSION,
    params,
    particles,
    time: value.time,
    targetTemperature: value.targetTemperature,
    collectedSpeeds,
    collectedEnergies,
    collectedSampleWindowTotal: value.collectedSampleWindowTotal,
    tempHistory,
    lastSampleTime: value.lastSampleTime,
    pressureWindowStartTime: value.pressureWindowStartTime,
    pressureWindowMomentum: value.pressureWindowMomentum,
    pressureHistory,
    latestMeasuredPressure: value.latestMeasuredPressure,
  };
};

export const isValidHardSphereEngineSnapshot = (value: unknown): value is PhysicsEngineSnapshotV1 => (
  normalizeHardSphereEngineSnapshot(value) !== null
);
