import type { HeatCapacityRuntimePhase } from './heatCapacityExperimentModel.ts';

export type HeatCapacityHardSpherePumpBulbState = 'idle' | 'compressing' | 'releasing';

export interface HeatCapacityHardSphereVisualInput {
  powerOn: boolean;
  temperatureMv: number | null;
  pressureMv: number | null;
  phase: HeatCapacityRuntimePhase | string;
  manualStep?: string | null;
  glassStopcockOpen: boolean;
  pumpValveOpen: boolean;
  pumpBulbState: HeatCapacityHardSpherePumpBulbState;
  particleMultiplier?: number;
  speedMultiplier?: number;
  ambientTemperatureMv?: number;
  upperTemperatureMv?: number;
  nominalPressureMv?: number;
  pressureDeltaKPa?: number;
  releaseBurstActive?: boolean;
}

export interface HeatCapacityHardSphereVisualState {
  densityMultiplier: number;
  speedMultiplier: number;
  temperatureColorFactor: number;
  emissiveIntensity: number;
  outflowActive: boolean;
  outflowIntensity: number;
  stability: number;
  targetParticleCount: number;
}

export const HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES = 80;
export const HEAT_CAPACITY_HARD_SPHERE_MIN_PARTICLES = 18;
export const HEAT_CAPACITY_HARD_SPHERE_COLOR_MIN_MV = 1495;
export const HEAT_CAPACITY_HARD_SPHERE_COLOR_MAX_MV = 1515;

export const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

export const lerpNumber = (start: number, end: number, progress: number) => (
  start + (end - start) * progress
);

export const normalizeClamped = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value) || max <= min) return 0;
  return clampNumber((value - min) / (max - min), 0, 1);
};

const finiteOrFallback = (value: number | null | undefined, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const roundToStep = (value: number, step: number) => (
  Math.round(value / step) * step
);

export const getHeatCapacityHardSphereVisualState = (
  input: HeatCapacityHardSphereVisualInput,
): HeatCapacityHardSphereVisualState => {
  const particleMultiplier = clampNumber(finiteOrFallback(input.particleMultiplier, 1), 0.5, 1.25);
  const requestedSpeedMultiplier = clampNumber(finiteOrFallback(input.speedMultiplier, 1), 0.55, 1.65);
  const ambientTemperatureMv = finiteOrFallback(input.ambientTemperatureMv, 1499);
  const upperTemperatureMv = finiteOrFallback(input.upperTemperatureMv, ambientTemperatureMv + 28);
  const nominalPressureMv = Math.max(20, finiteOrFallback(input.nominalPressureMv, 120));

  const pressureDeltaKPa = finiteOrFallback(input.pressureDeltaKPa, finiteOrFallback(input.pressureMv, 0) / 20);
  const currentTemperatureMv = finiteOrFallback(input.temperatureMv, ambientTemperatureMv);
  const smoothedTemperatureMv = roundToStep(currentTemperatureMv, 0.4);
  const smoothedPressureMv = Math.max(0, roundToStep(finiteOrFallback(input.pressureMv, pressureDeltaKPa * 20), 2));
  const temperatureColorFactor = normalizeClamped(
    currentTemperatureMv,
    HEAT_CAPACITY_HARD_SPHERE_COLOR_MIN_MV,
    HEAT_CAPACITY_HARD_SPHERE_COLOR_MAX_MV,
  );
  const pressureFactor = normalizeClamped(smoothedPressureMv, 0, nominalPressureMv);
  const releasePressureFactor = Math.max(pressureFactor, normalizeClamped(pressureDeltaKPa, 0, 6));
  const compressionThermalFactor = Math.max(pressureFactor, normalizeClamped(pressureDeltaKPa, 0, 6));
  const phase = input.phase;
  const actualOutflow = input.releaseBurstActive === true && input.glassStopcockOpen;
  const activePump = phase === 'pumping' && input.pumpValveOpen && input.pumpBulbState === 'compressing';

  let baseCount = Math.round(lerpNumber(30, 72, pressureFactor));
  let densityMultiplier = lerpNumber(0.72, 1.85, pressureFactor);
  let speedMultiplier = lerpNumber(0.55, 2.2, temperatureColorFactor);
  let emissiveIntensity = lerpNumber(0.14, 0.34, temperatureColorFactor);
  let stability = lerpNumber(0.92, 0.5, temperatureColorFactor);
  let outflowIntensity = 0;

  if (activePump) {
    baseCount += 8;
    densityMultiplier += 0.24;
    speedMultiplier += 0.22 + compressionThermalFactor * 0.36;
    emissiveIntensity = 0.42 + compressionThermalFactor * 0.08;
    stability = 0.42;
  } else if (phase === 'pumping') {
    baseCount += 5;
    densityMultiplier += 0.16;
    speedMultiplier += 0.12 + compressionThermalFactor * 0.22;
    stability = 0.52;
  }

  if (phase === 'sealedStabilizing') {
    densityMultiplier += 0.14;
    speedMultiplier = lerpNumber(speedMultiplier, 1.04 + compressionThermalFactor * 0.12, 0.32);
    stability = 0.76;
  }

  if (actualOutflow) {
    baseCount = Math.round(lerpNumber(18, 32, pressureFactor));
    densityMultiplier = lerpNumber(0.46, 0.86, pressureFactor);
    speedMultiplier = Math.min(speedMultiplier * 0.72, 0.68 + (1 - releasePressureFactor) * 0.06);
    emissiveIntensity = 0.18;
    stability = 0.28;
    outflowIntensity = clampNumber(lerpNumber(0.72, 1.45, releasePressureFactor), 0.65, 1.45);
  } else if (phase === 'recovering') {
    baseCount = Math.round(lerpNumber(24, 38, pressureFactor));
    densityMultiplier = lerpNumber(0.64, 1.08, pressureFactor);
    speedMultiplier = lerpNumber(speedMultiplier, 1, 0.42);
    emissiveIntensity = 0.16;
    stability = 0.86;
  } else if (phase === 'demoComplete') {
    baseCount = Math.round(lerpNumber(26, 38, pressureFactor));
    densityMultiplier = lerpNumber(0.68, 1.08, pressureFactor);
    speedMultiplier = lerpNumber(speedMultiplier, 1, 0.68);
    emissiveIntensity = 0.14;
    stability = 0.92;
  }

  const visualSpeedMultiplier = clampNumber(speedMultiplier * requestedSpeedMultiplier, 0.5, 2.35);

  const targetParticleCount = clampNumber(
    Math.round(baseCount * particleMultiplier),
    HEAT_CAPACITY_HARD_SPHERE_MIN_PARTICLES,
    HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
  );

  return {
    densityMultiplier: clampNumber(densityMultiplier * particleMultiplier, 0.42, 2.05),
    speedMultiplier: visualSpeedMultiplier,
    temperatureColorFactor,
    emissiveIntensity,
    outflowActive: actualOutflow,
    outflowIntensity,
    stability: clampNumber(stability, 0.25, 0.96),
    targetParticleCount,
  };
};
