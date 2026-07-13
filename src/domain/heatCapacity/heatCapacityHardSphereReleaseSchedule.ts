import {
  resolveHeatCapacityHardSpherePopulation,
} from './heatCapacityHardSpherePopulation.ts';
import { clampNumber } from './heatCapacityHardSphereModel.ts';

export type HeatCapacityHardSphereVisualFlowPhase =
  | 'idle'
  | 'main-release'
  | 'complete';

export interface HeatCapacityHardSphereVisualFlowSchedule {
  id: string;
  phase: HeatCapacityHardSphereVisualFlowPhase;
  elapsedS: number;
  durationS: number;
  progress: number;
  exitAssignmentCount: number;
  exitSpeed: number;
  baselineParticleCount: number;
  amountBeforeParticleCount: number;
  amountTargetParticleCount: number;
  addedParticleCount: number;
  releaseMinimumParticleCount: number;
}

export interface HeatCapacityHardSphereMainReleaseScheduleInput {
  id: string;
  amountBeforeRatio: number;
  amountCurrentRatio: number;
  amountTargetRatio: number;
  particleMultiplier: number;
  particleCountScale?: number;
  elapsedS: number;
  durationS: number;
  feedbackProgress?: number;
}

export const HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE = Object.freeze({
  exitSpeed: 4.4,
  mainStaggerMaxS: 0.028,
  farApproachSpeedMultiplier: 5.6,
  nearApproachSpeedMultiplier: 7.2,
  approachResponseS: 0.045,
  balancedReboundDurationS: 0.16,
  closedInertiaDurationS: 0.14,
  recoveryResponseS: 0.075,
  maximumRecoveryDelayS: 0.024,
  pressureBalancedReturnBias: 0.68,
  minimumVisibleExitS: 0.075,
  exitOcclusionRadii: 5.5,
  exitProgressScale: 0.9,
});

const finiteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) ? value : fallback
);

const createEmptyParticleBounds = () => ({
  baselineParticleCount: 0,
  amountBeforeParticleCount: 0,
  amountTargetParticleCount: 0,
  addedParticleCount: 0,
  releaseMinimumParticleCount: 0,
});

const resolveReleaseParticleBounds = (input: {
  amountBeforeRatio: number;
  amountCurrentRatio: number;
  amountTargetRatio: number;
  particleMultiplier: number;
  particleCountScale: number;
}) => {
  const populationInput = {
    particleMultiplier: input.particleMultiplier,
    particleCountScale: input.particleCountScale,
  };
  const beforePopulation = resolveHeatCapacityHardSpherePopulation({
    ...populationInput,
    amountRatio: input.amountBeforeRatio,
  });
  const currentPopulation = resolveHeatCapacityHardSpherePopulation({
    ...populationInput,
    amountRatio: input.amountCurrentRatio,
  });
  const targetPopulation = resolveHeatCapacityHardSpherePopulation({
    ...populationInput,
    amountRatio: input.amountTargetRatio,
  });
  const baselineParticleCount = beforePopulation.baselineParticleCount;
  const amountBeforeParticleCount = beforePopulation.targetParticleCount;
  const amountCurrentParticleCount = currentPopulation.targetParticleCount;
  const amountTargetParticleCount = targetPopulation.targetParticleCount;
  const targetFloorCount = Math.max(baselineParticleCount, amountTargetParticleCount);
  const addedParticleCount = Math.max(0, amountBeforeParticleCount - baselineParticleCount);
  const requestedDropCount = Math.max(
    0,
    amountBeforeParticleCount - targetFloorCount,
    amountCurrentParticleCount - targetFloorCount,
  );

  return {
    baselineParticleCount,
    amountBeforeParticleCount,
    amountTargetParticleCount,
    addedParticleCount,
    releaseMinimumParticleCount: baselineParticleCount,
    exitAssignmentCount: Math.min(addedParticleCount, requestedDropCount),
  };
};

const createCompleteSchedule = (
  id: string,
  particleBounds = createEmptyParticleBounds(),
): HeatCapacityHardSphereVisualFlowSchedule => ({
  id,
  ...particleBounds,
  phase: 'complete',
  elapsedS: 0,
  durationS: 0,
  progress: 1,
  exitAssignmentCount: 0,
  exitSpeed: 0,
});

const resolveReleaseProgress = (elapsedS: number, durationS: number) => {
  if (durationS <= 0) return 1;
  return clampNumber(elapsedS / durationS, 0, 1);
};

export const createHeatCapacityHardSphereMainReleaseSchedule = (
  input: HeatCapacityHardSphereMainReleaseScheduleInput,
): HeatCapacityHardSphereVisualFlowSchedule => {
  const particleMultiplier = clampNumber(finiteOrFallback(input.particleMultiplier, 1), 0.5, 1.25);
  const particleCountScale = clampNumber(finiteOrFallback(input.particleCountScale ?? 1, 1), 0.25, 1.25);
  const amountBeforeRatio = finiteOrFallback(input.amountBeforeRatio, 1);
  const amountCurrentRatio = finiteOrFallback(input.amountCurrentRatio, amountBeforeRatio);
  const amountTargetRatio = finiteOrFallback(input.amountTargetRatio, 1);
  const releaseParticleBounds = resolveReleaseParticleBounds({
    amountBeforeRatio,
    amountCurrentRatio,
    amountTargetRatio,
    particleMultiplier,
    particleCountScale,
  });
  const exitAssignmentCount = releaseParticleBounds.exitAssignmentCount;
  if (exitAssignmentCount <= 0) return createCompleteSchedule(input.id, releaseParticleBounds);
  const durationS = clampNumber(finiteOrFallback(input.durationS, 0.375), 0.05, 5);
  const elapsedS = clampNumber(finiteOrFallback(input.elapsedS, 0), 0, durationS);
  const progress = input.feedbackProgress === undefined
    ? resolveReleaseProgress(elapsedS, durationS)
    : clampNumber(finiteOrFallback(input.feedbackProgress, 0), 0, 1);

  return {
    id: input.id,
    phase: 'main-release',
    elapsedS,
    durationS,
    progress,
    exitAssignmentCount,
    exitSpeed: HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.exitSpeed,
    baselineParticleCount: releaseParticleBounds.baselineParticleCount,
    amountBeforeParticleCount: releaseParticleBounds.amountBeforeParticleCount,
    amountTargetParticleCount: releaseParticleBounds.amountTargetParticleCount,
    addedParticleCount: releaseParticleBounds.addedParticleCount,
    releaseMinimumParticleCount: releaseParticleBounds.releaseMinimumParticleCount,
  };
};

export const getHeatCapacityHardSphereScheduleFrame = (
  schedule: HeatCapacityHardSphereVisualFlowSchedule,
  elapsedS: number,
  feedbackProgress?: number,
): HeatCapacityHardSphereVisualFlowSchedule => {
  const nextElapsedS = clampNumber(finiteOrFallback(elapsedS, schedule.elapsedS), 0, Math.max(schedule.durationS, 0));
  const progress = feedbackProgress === undefined
    ? resolveReleaseProgress(nextElapsedS, schedule.durationS)
    : clampNumber(finiteOrFallback(feedbackProgress, schedule.progress), 0, 1);
  return {
    ...schedule,
    elapsedS: nextElapsedS,
    progress,
  };
};
