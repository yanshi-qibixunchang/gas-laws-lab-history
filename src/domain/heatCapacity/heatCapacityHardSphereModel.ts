import type { HeatCapacityRuntimePhase } from './heatCapacityProcessTypes.ts';
import { HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA } from './heatCapacityReleaseModel.ts';
import {
  resolveHeatCapacityHardSpherePopulation,
} from './heatCapacityHardSpherePopulation.ts';

export type HeatCapacityHardSpherePumpBulbState = 'idle' | 'compressing' | 'releasing';

export type HeatCapacityHardSphereReleasePhase =
  | 'none'
  | 'response-delay'
  | 'main-release'
  | 'partial-stopped'
  | 'post-release-exchange';

export interface HeatCapacityHardSphereReleaseTimeline {
  phase: HeatCapacityHardSphereReleasePhase;
  elapsedS: number;
  responseDelayS: number;
  mainDurationS: number;
  progress: number;
  pressureFactor: number;
  amountBeforeRatio: number;
  amountCurrentRatio: number;
  amountTargetRatio: number;
}

export interface HeatCapacityHardSphereVisualInput {
  temperatureMv: number | null;
  pressureMv: number | null;
  phase: HeatCapacityRuntimePhase | string;
  guideStep?: string | null;
  glassStopcockOpen: boolean;
  pumpValveOpen: boolean;
  pumpBulbState: HeatCapacityHardSpherePumpBulbState;
  particleMultiplier?: number;
  particleCountScale?: number;
  speedMultiplier?: number;
  gasAmountRatio?: number;
  gasTemperatureK?: number;
  ambientTemperatureK?: number;
  ambientTemperatureMv?: number;
  upperTemperatureMv?: number;
  nominalPressureMv?: number;
  pressureDeltaKPa?: number;
  pumpFlowActive?: boolean;
  pumpFlowIntensity?: number;
}

export interface HeatCapacityHardSphereVisualState {
  densityMultiplier: number;
  thermalSpeedMultiplier: number;
  speedMultiplier: number;
  temperatureColorFactor: number;
  emissiveIntensity: number;
  stability: number;
  targetParticleCount: number;
}

export const HEAT_CAPACITY_HARD_SPHERE_COLD_DELTA_K = -5;
export const HEAT_CAPACITY_HARD_SPHERE_HOT_DELTA_K = 3;
export const HEAT_CAPACITY_HARD_SPHERE_OUTFLOW_EQUILIBRIUM_KPA = HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA;
export const HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE: HeatCapacityHardSphereReleaseTimeline = {
  phase: 'none',
  elapsedS: 0,
  responseDelayS: 0,
  mainDurationS: 0,
  progress: 0,
  pressureFactor: 0,
  amountBeforeRatio: 1,
  amountCurrentRatio: 1,
  amountTargetRatio: 1,
};

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
  const requestedSpeedMultiplier = clampNumber(finiteOrFallback(input.speedMultiplier, 1), 0.55, 1.8);
  const nominalPressureMv = Math.max(20, finiteOrFallback(input.nominalPressureMv, 120));
  const ambientTemperatureK = finiteOrFallback(input.ambientTemperatureK, 298.15);
  const gasTemperatureK = finiteOrFallback(input.gasTemperatureK, ambientTemperatureK);
  const gasAmountRatio = clampNumber(finiteOrFallback(input.gasAmountRatio, 1), 0.25, 2);

  const pressureDeltaKPa = finiteOrFallback(input.pressureDeltaKPa, finiteOrFallback(input.pressureMv, 0) / 20);
  const smoothedPressureMv = Math.max(0, roundToStep(finiteOrFallback(input.pressureMv, pressureDeltaKPa * 20), 2));
  const pressureFactor = normalizeClamped(smoothedPressureMv, 0, nominalPressureMv);
  const compressionThermalFactor = Math.max(pressureFactor, normalizeClamped(pressureDeltaKPa, 0, 6));
  const phase = input.phase;
  const actualOutflow = input.glassStopcockOpen === true &&
    Math.abs(pressureDeltaKPa) > HEAT_CAPACITY_HARD_SPHERE_OUTFLOW_EQUILIBRIUM_KPA;
  const activePump = phase === 'pumping' && input.pumpValveOpen && input.pumpBulbState === 'compressing';
  const pumpFlowIntensity = clampNumber(finiteOrFallback(input.pumpFlowIntensity, input.pumpFlowActive ? 1 : 0), 0, 1.6);
  const pumpCompressionTemperatureBoostK = activePump
    ? lerpNumber(0.35, 1.45, compressionThermalFactor) * clampNumber(pumpFlowIntensity || 1, 0.55, 1.15)
    : 0;
  const rawTemperatureDeltaK = gasTemperatureK - ambientTemperatureK;
  const effectiveTemperatureDeltaK = activePump
    ? Math.max(rawTemperatureDeltaK, pumpCompressionTemperatureBoostK)
    : rawTemperatureDeltaK;
  const temperatureColorFactor = normalizeClamped(
    effectiveTemperatureDeltaK,
    HEAT_CAPACITY_HARD_SPHERE_COLD_DELTA_K,
    HEAT_CAPACITY_HARD_SPHERE_HOT_DELTA_K,
  );

  const population = resolveHeatCapacityHardSpherePopulation({
    amountRatio: gasAmountRatio,
    particleMultiplier,
    particleCountScale: input.particleCountScale,
  });
  let densityMultiplier = clampNumber(0.88 + (gasAmountRatio - 1) * 3.4, 0.54, 1.9);
  const thermalSpeedMultiplier = clampNumber(1 + effectiveTemperatureDeltaK * 0.1, 0.78, 1.55);
  let emissiveIntensity = lerpNumber(0.14, 0.34, temperatureColorFactor);
  let stability = lerpNumber(0.92, 0.5, temperatureColorFactor);

  if (activePump) {
    densityMultiplier += 0.24;
    emissiveIntensity = 0.42 + compressionThermalFactor * 0.08;
    stability = 0.42;
  } else if (phase === 'pumping') {
    densityMultiplier += 0.16;
    stability = 0.52;
  }

  if (phase === 'sealedStabilizing') {
    densityMultiplier += 0.14;
    stability = 0.76;
  }

  if (actualOutflow) {
    densityMultiplier = clampNumber(densityMultiplier * 0.9, 0.5, 1.6);
    emissiveIntensity = 0.18;
    stability = 0.28;
  } else if (phase === 'recovering') {
    densityMultiplier = clampNumber(densityMultiplier, 0.64, 1.24);
    emissiveIntensity = 0.16;
    stability = 0.86;
  }

  const visualThermalSpeedMultiplier = clampNumber(thermalSpeedMultiplier * requestedSpeedMultiplier, 0.68, 2.65);
  const targetParticleCount = population.targetParticleCount;

  return {
    densityMultiplier: clampNumber(densityMultiplier * particleMultiplier, 0.42, 2.05),
    thermalSpeedMultiplier: visualThermalSpeedMultiplier,
    speedMultiplier: visualThermalSpeedMultiplier,
    temperatureColorFactor,
    emissiveIntensity,
    stability: clampNumber(stability, 0.25, 0.96),
    targetParticleCount,
  };
};
