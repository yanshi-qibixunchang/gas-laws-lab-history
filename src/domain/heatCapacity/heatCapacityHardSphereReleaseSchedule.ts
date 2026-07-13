import {
  HEAT_CAPACITY_HARD_SPHERE_AMOUNT_EXAGGERATION,
  HEAT_CAPACITY_HARD_SPHERE_BASE_PARTICLES,
  HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
  HEAT_CAPACITY_HARD_SPHERE_MIN_PARTICLES,
  clampNumber,
} from './heatCapacityHardSphereModel.ts';

export type HeatCapacityHardSphereVisualFlowPhase =
  | 'idle'
  | 'main-release'
  | 'partial-stopped'
  | 'post-release-exchange'
  | 'complete';

export type HeatCapacityHardSphereVisualFlowStopReason =
  | 'none'
  | 'duration-complete'
  | 'pressure-equalized'
  | 'stopcock-closing';

export interface HeatCapacityHardSphereVisualFlowSchedule {
  id: string;
  phase: HeatCapacityHardSphereVisualFlowPhase;
  elapsedS: number;
  durationS: number;
  progress: number;
  targetExitCount: number;
  expectedExitedCount: number;
  exitSpeed: number;
  stopReason: HeatCapacityHardSphereVisualFlowStopReason;
  totalPlannedExitCount: number;
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
  elapsedS: number;
  durationS: number;
  feedbackProgress?: number;
}

export const HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE = Object.freeze({
  exitSpeed: 9.5,
  mainStaggerMaxS: 0.035,
  farApproachSpeedMultiplier: 1.55,
  nearApproachSpeedMultiplier: 2.4,
  approachResponseS: 0.035,
  balancedReboundFactor: 0.72,
  balancedReboundDurationS: 0.14,
  closedInertiaDurationS: 0.12,
  recoveryResponseS: 0.085,
  exitProgressScale: 1.25,
});

const MAIN_RELEASE_FIRST_BURST_S = 0.08;
const MAIN_RELEASE_FIRST_BURST_PROGRESS = 0.62;

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

const resolveBaselineParticleCount = (particleMultiplier: number) => clampNumber(
  Math.max(
    HEAT_CAPACITY_HARD_SPHERE_MIN_PARTICLES,
    Math.round(HEAT_CAPACITY_HARD_SPHERE_BASE_PARTICLES * particleMultiplier),
  ),
  0,
  HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
);

const resolveParticleCountForAmountRatio = (
  amountRatio: number,
  particleMultiplier: number,
  baselineParticleCount: number,
) => clampNumber(
  Math.round(
    HEAT_CAPACITY_HARD_SPHERE_BASE_PARTICLES *
      (1 + (amountRatio - 1) * HEAT_CAPACITY_HARD_SPHERE_AMOUNT_EXAGGERATION) *
      particleMultiplier,
  ),
  baselineParticleCount,
  HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
);

const resolveReleaseParticleBounds = (input: {
  amountBeforeRatio: number;
  amountCurrentRatio: number;
  amountTargetRatio: number;
  particleMultiplier: number;
}) => {
  const baselineParticleCount = resolveBaselineParticleCount(input.particleMultiplier);
  const amountBeforeParticleCount = resolveParticleCountForAmountRatio(
    input.amountBeforeRatio,
    input.particleMultiplier,
    baselineParticleCount,
  );
  const amountCurrentParticleCount = resolveParticleCountForAmountRatio(
    input.amountCurrentRatio,
    input.particleMultiplier,
    baselineParticleCount,
  );
  const amountTargetParticleCount = resolveParticleCountForAmountRatio(
    input.amountTargetRatio,
    input.particleMultiplier,
    baselineParticleCount,
  );
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
    totalPlannedExitCount: Math.min(addedParticleCount, requestedDropCount),
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
  targetExitCount: 0,
  expectedExitedCount: 0,
  exitSpeed: 0,
  stopReason: 'duration-complete',
  totalPlannedExitCount: 0,
});

const resolveMainReleaseProgress = (elapsedS: number, durationS: number) => {
  if (durationS <= 0) return 1;
  const elapsed = clampNumber(elapsedS, 0, durationS);
  if (elapsed <= MAIN_RELEASE_FIRST_BURST_S) {
    return clampNumber(
      MAIN_RELEASE_FIRST_BURST_PROGRESS * (elapsed / MAIN_RELEASE_FIRST_BURST_S),
      0,
      MAIN_RELEASE_FIRST_BURST_PROGRESS,
    );
  }
  return clampNumber(
    MAIN_RELEASE_FIRST_BURST_PROGRESS +
      (1 - MAIN_RELEASE_FIRST_BURST_PROGRESS) *
      ((elapsed - MAIN_RELEASE_FIRST_BURST_S) / Math.max(durationS - MAIN_RELEASE_FIRST_BURST_S, 0.0001)),
    0,
    1,
  );
};

const resolveLinearProgress = (elapsedS: number, durationS: number) => (
  durationS <= 0 ? 1 : clampNumber(elapsedS / durationS, 0, 1)
);

const getExpectedCount = (
  targetExitCount: number,
  progress: number,
) => {
  const safeProgress = clampNumber(progress, 0, 1);
  if (safeProgress <= 0) return 0;
  return Math.min(targetExitCount, Math.ceil(targetExitCount * safeProgress));
};

export const createHeatCapacityHardSphereMainReleaseSchedule = (
  input: HeatCapacityHardSphereMainReleaseScheduleInput,
): HeatCapacityHardSphereVisualFlowSchedule => {
  const particleMultiplier = clampNumber(finiteOrFallback(input.particleMultiplier, 1), 0.5, 1.25);
  const amountBeforeRatio = finiteOrFallback(input.amountBeforeRatio, 1);
  const amountCurrentRatio = finiteOrFallback(input.amountCurrentRatio, amountBeforeRatio);
  const amountTargetRatio = finiteOrFallback(input.amountTargetRatio, 1);
  const releaseParticleBounds = resolveReleaseParticleBounds({
    amountBeforeRatio,
    amountCurrentRatio,
    amountTargetRatio,
    particleMultiplier,
  });
  const totalPlannedExitCount = releaseParticleBounds.totalPlannedExitCount;
  if (totalPlannedExitCount <= 0) return createCompleteSchedule(input.id, releaseParticleBounds);
  const durationS = clampNumber(finiteOrFallback(input.durationS, 0.375), 0.05, 5);
  const elapsedS = clampNumber(finiteOrFallback(input.elapsedS, 0), 0, durationS);
  const progress = input.feedbackProgress === undefined
    ? resolveMainReleaseProgress(elapsedS, durationS)
    : clampNumber(finiteOrFallback(input.feedbackProgress, 0), 0, 1);

  return {
    id: input.id,
    phase: 'main-release',
    elapsedS,
    durationS,
    progress,
    targetExitCount: totalPlannedExitCount,
    expectedExitedCount: getExpectedCount(totalPlannedExitCount, progress),
    exitSpeed: HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.exitSpeed,
    stopReason: progress >= 1 ? 'duration-complete' : 'none',
    totalPlannedExitCount,
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
    ? schedule.phase === 'main-release'
      ? resolveMainReleaseProgress(nextElapsedS, schedule.durationS)
      : resolveLinearProgress(nextElapsedS, schedule.durationS)
    : clampNumber(finiteOrFallback(feedbackProgress, schedule.progress), 0, 1);
  return {
    ...schedule,
    elapsedS: nextElapsedS,
    progress,
    expectedExitedCount: getExpectedCount(schedule.targetExitCount, progress),
    stopReason: progress >= 1 ? 'duration-complete' : schedule.stopReason,
  };
};
