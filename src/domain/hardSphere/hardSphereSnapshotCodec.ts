import {
  HARD_SPHERE_PRESSURE_SAMPLE_WINDOW_S,
  PHYSICS_ENGINE_SNAPSHOT_VERSION,
  type PhysicsEngineSnapshotV2,
} from './PhysicsEngine.ts';
import type {
  Particle,
  PressureWindowPoint,
  SimulationParams,
} from '../../shared/types.ts';
import {
  HARD_SPHERE_MAX_COLLECTED_SAMPLES,
  HARD_SPHERE_MAX_PARTICLE_COUNT,
  HARD_SPHERE_MAX_PRESSURE_HISTORY,
  HARD_SPHERE_MAX_TARGET_TEMPERATURE,
  HARD_SPHERE_MAX_TEMPERATURE_HISTORY,
  HARD_SPHERE_MIN_TARGET_TEMPERATURE,
  validateHardSphereSimulationParams,
} from './hardSphereSimulationValidation.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const cloneParticle = (particle: Particle): Particle => ({ ...particle });

const clonePressureWindowPoint = (point: PressureWindowPoint): PressureWindowPoint => ({ ...point });

export const cloneHardSphereEngineSnapshot = (
  snapshot: PhysicsEngineSnapshotV2 | null | undefined,
): PhysicsEngineSnapshotV2 | null => (
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

const normalizeNumberArray = (value: unknown, maxLength: number): number[] | null => (
  Array.isArray(value) && value.length <= maxLength && value.every(isFiniteNumber) ? [...value] : null
);

const normalizeTempHistory = (
  value: unknown,
): PhysicsEngineSnapshotV2['tempHistory'] | null => {
  if (!Array.isArray(value) || value.length > HARD_SPHERE_MAX_TEMPERATURE_HISTORY) return null;
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
  if (!Array.isArray(value) || value.length > HARD_SPHERE_MAX_PRESSURE_HISTORY) return null;
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

const SNAPSHOT_NUMBER_TOLERANCE = 1e-9;
const PRESSURE_WINDOW_EPSILON = 1e-9;
const HARD_SPHERE_MAX_SNAPSHOT_OVERRUN_S = 1;

const areSnapshotNumbersClose = (left: number, right: number) => (
  Number.isFinite(left) &&
  Number.isFinite(right) &&
  Math.abs(left - right) <= SNAPSHOT_NUMBER_TOLERANCE * Math.max(1, Math.abs(left), Math.abs(right))
);

const haveMonotonicSnapshotTimes = (points: Array<{ time: number }>) => (
  points.every((point, index) => (
    index === 0 || point.time + SNAPSHOT_NUMBER_TOLERANCE >= points[index - 1]!.time
  ))
);

const areSnapshotParticlesSemanticallyValid = (
  params: SimulationParams,
  particles: Particle[],
) => {
  if (particles.length !== params.N) return false;
  const coordinateTolerance = SNAPSHOT_NUMBER_TOLERANCE * Math.max(1, params.L);
  const lowerBound = params.r - coordinateTolerance;
  const upperBound = params.L - params.r + coordinateTolerance;
  const minimumDistinctDistance = SNAPSHOT_NUMBER_TOLERANCE * Math.max(1, params.L, params.r);
  const minimumDistinctDistanceSquared = minimumDistinctDistance * minimumDistinctDistance;

  for (const particle of particles) {
    if (
      particle.x < lowerBound || particle.x > upperBound ||
      particle.y < lowerBound || particle.y > upperBound ||
      particle.z < lowerBound || particle.z > upperBound ||
      particle.speed < 0 ||
      particle.energy < 0
    ) {
      return false;
    }
    const expectedSpeed = Math.hypot(particle.vx, particle.vy, particle.vz);
    const expectedEnergy = 0.5 * params.m * expectedSpeed * expectedSpeed;
    if (
      !Number.isFinite(expectedSpeed) ||
      !Number.isFinite(expectedEnergy) ||
      !areSnapshotNumbersClose(particle.speed, expectedSpeed) ||
      !areSnapshotNumbersClose(particle.energy, expectedEnergy)
    ) {
      return false;
    }
  }

  for (let leftIndex = 0; leftIndex < particles.length; leftIndex += 1) {
    const left = particles[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < particles.length; rightIndex += 1) {
      const right = particles[rightIndex]!;
      const dx = left.x - right.x;
      const dy = left.y - right.y;
      const dz = left.z - right.z;
      if (dx * dx + dy * dy + dz * dz <= minimumDistinctDistanceSquared) return false;
    }
  }

  return true;
};

const areCollectedSamplesSemanticallyValid = (
  params: SimulationParams,
  speeds: number[],
  energies: number[],
) => speeds.every((speed, index) => (
  speed >= 0 &&
  energies[index]! >= 0 &&
  areSnapshotNumbersClose(energies[index]!, 0.5 * params.m * speed * speed)
));

const isSnapshotTargetNumericallySafe = (
  params: SimulationParams,
  targetTemperature: number,
) => {
  if (!Number.isFinite(targetTemperature) || targetTemperature <= 0) return false;
  const thermalVariance = 3 * params.k * targetTemperature / params.m;
  const maximumHistogramSpeed = 3.5 * Math.sqrt(thermalVariance);
  const speedBinSize = maximumHistogramSpeed / 30;
  const maximumHistogramEnergy = 0.5 * params.m * maximumHistogramSpeed * maximumHistogramSpeed;
  const energyBinSize = maximumHistogramEnergy / 30;
  const pressure = params.N * params.k * targetTemperature / Math.pow(params.L, 3);
  return Number.isFinite(speedBinSize) && speedBinSize > 0 &&
    Number.isFinite(energyBinSize) && energyBinSize > 0 &&
    Number.isFinite(pressure) && pressure >= 0;
};

const isTemperatureHistorySemanticallyValid = (
  params: SimulationParams,
  targetTemperature: number,
  time: number,
  timeTolerance: number,
  history: PhysicsEngineSnapshotV2['tempHistory'],
) => haveMonotonicSnapshotTimes(history) && history.every((point) => {
  const temperature = 2 * point.totalEnergy / (3 * params.N * params.k);
  const expectedError = (temperature - targetTemperature) / targetTemperature * 100;
  return point.time >= 0 &&
    point.time <= time + timeTolerance &&
    point.totalEnergy >= 0 &&
    Number.isFinite(temperature) &&
    Number.isFinite(expectedError) &&
    areSnapshotNumbersClose(point.error, expectedError);
});

const isPressureHistorySemanticallyValid = (
  params: SimulationParams,
  time: number,
  timeTolerance: number,
  pressureWindowStartTime: number,
  pressureWindowMomentum: number,
  latestMeasuredPressure: number,
  history: PressureWindowPoint[],
) => {
  if (!haveMonotonicSnapshotTimes(history)) return false;
  if (history.some((point, index) => {
    const previousPoint = index > 0 ? history[index - 1]! : null;
    const windowStartTime = point.time - point.duration;
    const expectedCollectionWindow =
      windowStartTime >= params.equilibriumTime - PRESSURE_WINDOW_EPSILON &&
      point.time <= params.equilibriumTime + params.statsDuration + PRESSURE_WINDOW_EPSILON;
    return point.time < 0 ||
      point.time > time + timeTolerance ||
      point.duration <= PRESSURE_WINDOW_EPSILON ||
      point.duration > HARD_SPHERE_PRESSURE_SAMPLE_WINDOW_S + timeTolerance ||
      point.duration > point.time + timeTolerance ||
      point.measuredPressure < 0 ||
      point.idealPressure < 0 ||
      point.isCollectionWindow !== expectedCollectionWindow ||
      (
        previousPoint !== null &&
        !areSnapshotNumbersClose(point.time - point.duration, previousPoint.time)
      );
  })) return false;
  const latestHistoryPoint = history.at(-1) ?? null;
  if (
    latestHistoryPoint === null
      ? (
          !areSnapshotNumbersClose(latestMeasuredPressure, 0) ||
          !areSnapshotNumbersClose(pressureWindowStartTime, 0)
        )
      : (
          !areSnapshotNumbersClose(latestMeasuredPressure, latestHistoryPoint.measuredPressure) ||
          !areSnapshotNumbersClose(pressureWindowStartTime, latestHistoryPoint.time)
        )
  ) return false;
  const pendingDuration = time - pressureWindowStartTime;
  if (
    pendingDuration < -timeTolerance ||
    pendingDuration > HARD_SPHERE_PRESSURE_SAMPLE_WINDOW_S + timeTolerance
  ) return false;
  if (pendingDuration <= PRESSURE_WINDOW_EPSILON) {
    return areSnapshotNumbersClose(pressureWindowMomentum, 0);
  }
  const wallArea = 6 * params.L * params.L;
  return Number.isFinite(pressureWindowMomentum / (wallArea * pendingDuration));
};

export const normalizeHardSphereEngineSnapshot = (
  value: unknown,
): PhysicsEngineSnapshotV2 | null => {
  if (!isRecord(value) || value.schemaVersion !== PHYSICS_ENGINE_SNAPSHOT_VERSION) return null;
  const params = normalizeSimulationParamsSnapshot(value.params);
  if (
    !params ||
    !validateHardSphereSimulationParams(params).valid ||
    !Array.isArray(value.particles) ||
    value.particles.length !== params.N ||
    !Array.isArray(value.collectedSpeeds) ||
    value.collectedSpeeds.length > HARD_SPHERE_MAX_COLLECTED_SAMPLES ||
    !Array.isArray(value.collectedEnergies) ||
    value.collectedEnergies.length > HARD_SPHERE_MAX_COLLECTED_SAMPLES ||
    !Array.isArray(value.tempHistory) ||
    value.tempHistory.length > HARD_SPHERE_MAX_TEMPERATURE_HISTORY ||
    !Array.isArray(value.pressureHistory) ||
    value.pressureHistory.length > HARD_SPHERE_MAX_PRESSURE_HISTORY
  ) {
    return null;
  }
  const particles = Array.isArray(value.particles)
    ? value.particles.map(normalizeParticle)
    : null;
  const collectedSpeeds = normalizeNumberArray(value.collectedSpeeds, HARD_SPHERE_MAX_COLLECTED_SAMPLES);
  const collectedEnergies = normalizeNumberArray(value.collectedEnergies, HARD_SPHERE_MAX_COLLECTED_SAMPLES);
  const tempHistory = normalizeTempHistory(value.tempHistory);
  const pressureHistory = normalizePressureHistory(value.pressureHistory);
  if (
    !particles ||
    !particles.every((particle): particle is Particle => particle !== null) ||
    !collectedSpeeds ||
    !collectedEnergies ||
    !tempHistory ||
    !pressureHistory ||
    !isFiniteNumber(value.time) ||
    !isFiniteNumber(value.targetTemperature) ||
    (
      value.targetMode !== 'explicit' &&
      value.targetMode !== 'canonical-default' &&
      value.targetMode !== 'legacy-v1'
    ) ||
    !isFiniteNumber(value.collectedSampleWindowTotal) ||
    !isFiniteNumber(value.lastSampleTime) ||
    !isFiniteNumber(value.pressureWindowStartTime) ||
    !isFiniteNumber(value.pressureWindowMomentum) ||
    !isFiniteNumber(value.latestMeasuredPressure)
  ) {
    return null;
  }
  const time = value.time;
  const timeTolerance = SNAPSHOT_NUMBER_TOLERANCE * Math.max(1, time);
  const maximumRuntimeTime = params.equilibriumTime + params.statsDuration +
    HARD_SPHERE_MAX_SNAPSHOT_OVERRUN_S;
  const retainedSampleWindowCount = collectedSpeeds.length / params.N;
  const expectedRetainedSampleWindowCount = Math.min(
    value.collectedSampleWindowTotal,
    Math.floor(HARD_SPHERE_MAX_COLLECTED_SAMPLES / params.N),
  );
  if (
    !areSnapshotParticlesSemanticallyValid(params, particles) ||
    collectedSpeeds.length !== collectedEnergies.length ||
    collectedSpeeds.length % params.N !== 0 ||
    !areCollectedSamplesSemanticallyValid(params, collectedSpeeds, collectedEnergies) ||
    time < 0 ||
    time > maximumRuntimeTime + timeTolerance ||
    !Number.isFinite(time + params.dt) ||
    time + params.dt <= time ||
    !isSnapshotTargetNumericallySafe(params, value.targetTemperature) ||
    (
      value.targetMode !== 'legacy-v1' &&
      (
        value.targetTemperature < HARD_SPHERE_MIN_TARGET_TEMPERATURE ||
        value.targetTemperature > HARD_SPHERE_MAX_TARGET_TEMPERATURE
      )
    ) ||
    (
      params.targetTemperature !== undefined
        ? value.targetMode !== 'explicit' ||
          !areSnapshotNumbersClose(value.targetTemperature, params.targetTemperature)
        : value.targetMode === 'explicit' ||
          (
            value.targetMode === 'canonical-default' &&
            !areSnapshotNumbersClose(value.targetTemperature, params.m / params.k)
          )
    ) ||
    !Number.isSafeInteger(value.collectedSampleWindowTotal) ||
    value.collectedSampleWindowTotal < 0 ||
    retainedSampleWindowCount !== expectedRetainedSampleWindowCount ||
    tempHistory.length !== Math.min(
      value.collectedSampleWindowTotal,
      HARD_SPHERE_MAX_TEMPERATURE_HISTORY,
    ) ||
    (value.lastSampleTime !== -1 && value.lastSampleTime < 0) ||
    value.lastSampleTime > time + timeTolerance ||
    value.pressureWindowStartTime < 0 ||
    value.pressureWindowStartTime > time + timeTolerance ||
    value.pressureWindowMomentum < 0 ||
    value.latestMeasuredPressure < 0 ||
    (
      tempHistory.length === 0
        ? value.lastSampleTime !== -1
        : !areSnapshotNumbersClose(value.lastSampleTime, tempHistory.at(-1)!.time)
    ) ||
    !isTemperatureHistorySemanticallyValid(
      params,
      value.targetTemperature,
      time,
      timeTolerance,
      tempHistory,
    ) ||
    !isPressureHistorySemanticallyValid(
      params,
      time,
      timeTolerance,
      value.pressureWindowStartTime,
      value.pressureWindowMomentum,
      value.latestMeasuredPressure,
      pressureHistory,
    )
  ) {
    return null;
  }
  return {
    schemaVersion: PHYSICS_ENGINE_SNAPSHOT_VERSION,
    params,
    particles,
    time,
    targetTemperature: value.targetTemperature,
    targetMode: value.targetMode,
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

export const LEGACY_PHYSICS_ENGINE_SNAPSHOT_VERSION = 1 as const;

export const isLegacyHardSphereEngineSnapshotV1 = (value: unknown) => (
  isRecord(value) &&
  value.schemaVersion === LEGACY_PHYSICS_ENGINE_SNAPSHOT_VERSION &&
  normalizeSimulationParamsSnapshot(value.params) !== null &&
  Array.isArray(value.particles) &&
  Array.isArray(value.collectedSpeeds) &&
  Array.isArray(value.collectedEnergies) &&
  Array.isArray(value.tempHistory) &&
  Array.isArray(value.pressureHistory) &&
  isFiniteNumber(value.time) &&
  isFiniteNumber(value.targetTemperature) &&
  isFiniteNumber(value.collectedSampleWindowTotal) &&
  isFiniteNumber(value.lastSampleTime) &&
  isFiniteNumber(value.pressureWindowStartTime) &&
  isFiniteNumber(value.pressureWindowMomentum) &&
  isFiniteNumber(value.latestMeasuredPressure)
);

export const upgradeLegacyHardSphereEngineSnapshotV1 = (
  value: unknown,
): PhysicsEngineSnapshotV2 | null => {
  if (!isLegacyHardSphereEngineSnapshotV1(value) || !isRecord(value)) return null;
  const params = normalizeSimulationParamsSnapshot(value.params);
  if (
    params === null ||
    !validateHardSphereSimulationParams(params).valid ||
    !Array.isArray(value.particles) ||
    value.particles.length !== params.N ||
    value.particles.length > HARD_SPHERE_MAX_PARTICLE_COUNT
  ) return null;
  const repairedParticles = value.particles.map((candidate) => {
    const particle = normalizeParticle(candidate);
    if (particle === null) return null;
    const minimumLegacyCoordinate = params.r * 0.5;
    const maximumLegacyCoordinate = params.L - params.r * 0.5;
    if (
      particle.x < minimumLegacyCoordinate || particle.x > maximumLegacyCoordinate ||
      particle.y < minimumLegacyCoordinate || particle.y > maximumLegacyCoordinate ||
      particle.z < minimumLegacyCoordinate || particle.z > maximumLegacyCoordinate
    ) return null;
    const repaired = { ...particle };
    if (repaired.x < params.r) {
      repaired.x = params.r;
      if (repaired.vx < 0) repaired.vx *= -1;
    } else if (repaired.x > params.L - params.r) {
      repaired.x = params.L - params.r;
      if (repaired.vx > 0) repaired.vx *= -1;
    }
    if (repaired.y < params.r) {
      repaired.y = params.r;
      if (repaired.vy < 0) repaired.vy *= -1;
    } else if (repaired.y > params.L - params.r) {
      repaired.y = params.L - params.r;
      if (repaired.vy > 0) repaired.vy *= -1;
    }
    if (repaired.z < params.r) {
      repaired.z = params.r;
      if (repaired.vz < 0) repaired.vz *= -1;
    } else if (repaired.z > params.L - params.r) {
      repaired.z = params.L - params.r;
      if (repaired.vz > 0) repaired.vz *= -1;
    }
    repaired.speed = Math.hypot(repaired.vx, repaired.vy, repaired.vz);
    repaired.energy = 0.5 * params.m * repaired.speed * repaired.speed;
    return repaired;
  });
  if (repairedParticles.some((particle) => particle === null)) return null;
  const targetTemperature = value.targetTemperature;
  return normalizeHardSphereEngineSnapshot({
    ...value,
    schemaVersion: PHYSICS_ENGINE_SNAPSHOT_VERSION,
    params,
    particles: repairedParticles,
    targetTemperature,
    targetMode: params.targetTemperature === undefined ? 'legacy-v1' : 'explicit',
  });
};
