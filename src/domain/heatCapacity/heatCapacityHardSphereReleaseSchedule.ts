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
  postExchangeReservedCount: number;
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
}

export interface HeatCapacityHardSpherePostExchangeScheduleInput {
  id: string;
  reservedExitCount: number;
  releaseMinimumParticleCount?: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
  elapsedS: number;
}

const MAIN_RELEASE_DURATION_S = 0.24;
const MAIN_RELEASE_EXIT_SPEED = 5.15;
const POST_EXCHANGE_EXIT_SPEED = 1.28;
const MAIN_RELEASE_FIRST_BURST_S = 0.08;
const MAIN_RELEASE_FIRST_BURST_PROGRESS = 0.62;
const POST_EXCHANGE_MIN_DURATION_S = 3;
const POST_EXCHANGE_MAX_DURATION_S = 8;
const POST_EXCHANGE_RESERVE_RATIO = 0.25;
const POST_EXCHANGE_TEMPERATURE_WINDOW_K = 8;
const POST_EXCHANGE_VISIBLE_TEMPERATURE_DELTA_K = 0.55;

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
  postExchangeReservedCount: 0,
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
) => Math.min(targetExitCount, Math.floor(targetExitCount * clampNumber(progress, 0, 1)));

const resolveMainReleaseSplit = (totalPlannedExitCount: number) => {
  if (totalPlannedExitCount <= 0) {
    return { mainBurstExitCount: 0, postExchangeReservedCount: 0 };
  }
  if (totalPlannedExitCount < 4) {
    return {
      mainBurstExitCount: totalPlannedExitCount,
      postExchangeReservedCount: 0,
    };
  }
  const postExchangeReservedCount = clampNumber(
    Math.round(totalPlannedExitCount * POST_EXCHANGE_RESERVE_RATIO),
    1,
    totalPlannedExitCount - 1,
  );
  if (totalPlannedExitCount < 10) {
    return {
      mainBurstExitCount: totalPlannedExitCount - postExchangeReservedCount,
      postExchangeReservedCount,
    };
  }
  return {
    mainBurstExitCount: Math.max(1, totalPlannedExitCount - postExchangeReservedCount),
    postExchangeReservedCount,
  };
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
  const { mainBurstExitCount, postExchangeReservedCount } = resolveMainReleaseSplit(totalPlannedExitCount);
  const elapsedS = clampNumber(finiteOrFallback(input.elapsedS, 0), 0, MAIN_RELEASE_DURATION_S);
  const progress = resolveMainReleaseProgress(elapsedS, MAIN_RELEASE_DURATION_S);

  return {
    id: input.id,
    phase: 'main-release',
    elapsedS,
    durationS: MAIN_RELEASE_DURATION_S,
    progress,
    targetExitCount: mainBurstExitCount,
    expectedExitedCount: getExpectedCount(mainBurstExitCount, progress),
    exitSpeed: MAIN_RELEASE_EXIT_SPEED,
    stopReason: progress >= 1 ? 'duration-complete' : 'none',
    totalPlannedExitCount,
    postExchangeReservedCount,
    baselineParticleCount: releaseParticleBounds.baselineParticleCount,
    amountBeforeParticleCount: releaseParticleBounds.amountBeforeParticleCount,
    amountTargetParticleCount: releaseParticleBounds.amountTargetParticleCount,
    addedParticleCount: releaseParticleBounds.addedParticleCount,
    releaseMinimumParticleCount: releaseParticleBounds.releaseMinimumParticleCount,
  };
};

export const estimateHeatCapacityHardSphereExchangeDurationS = (input: {
  gasTemperatureK: number;
  ambientTemperatureK: number;
  minS?: number;
  maxS?: number;
}) => {
  const minS = finiteOrFallback(input.minS ?? POST_EXCHANGE_MIN_DURATION_S, POST_EXCHANGE_MIN_DURATION_S);
  const maxS = Math.max(minS, finiteOrFallback(input.maxS ?? POST_EXCHANGE_MAX_DURATION_S, POST_EXCHANGE_MAX_DURATION_S));
  const temperatureDeltaK = Math.abs(
    finiteOrFallback(input.gasTemperatureK, input.ambientTemperatureK) -
      finiteOrFallback(input.ambientTemperatureK, input.gasTemperatureK),
  );
  if (temperatureDeltaK < POST_EXCHANGE_VISIBLE_TEMPERATURE_DELTA_K) return 0;
  const progress = clampNumber(
    (temperatureDeltaK - POST_EXCHANGE_VISIBLE_TEMPERATURE_DELTA_K) /
      Math.max(POST_EXCHANGE_TEMPERATURE_WINDOW_K - POST_EXCHANGE_VISIBLE_TEMPERATURE_DELTA_K, 0.0001),
    0,
    1,
  );
  return minS + (maxS - minS) * progress;
};

export const createHeatCapacityHardSpherePostExchangeSchedule = (
  input: HeatCapacityHardSpherePostExchangeScheduleInput,
): HeatCapacityHardSphereVisualFlowSchedule => {
  const targetExitCount = Math.max(0, Math.round(finiteOrFallback(input.reservedExitCount, 0)));
  const releaseMinimumParticleCount = Math.max(
    0,
    Math.round(finiteOrFallback(input.releaseMinimumParticleCount ?? 0, 0)),
  );
  const durationS = estimateHeatCapacityHardSphereExchangeDurationS({
    gasTemperatureK: input.gasTemperatureK,
    ambientTemperatureK: input.ambientTemperatureK,
  });
  const particleBounds = {
    baselineParticleCount: releaseMinimumParticleCount,
    amountBeforeParticleCount: releaseMinimumParticleCount + targetExitCount,
    amountTargetParticleCount: releaseMinimumParticleCount,
    addedParticleCount: targetExitCount,
    releaseMinimumParticleCount,
  };
  if (targetExitCount <= 0 || durationS <= 0) return createCompleteSchedule(input.id, particleBounds);
  const elapsedS = clampNumber(finiteOrFallback(input.elapsedS, 0), 0, durationS);
  const progress = resolveLinearProgress(elapsedS, durationS);

  return {
    id: input.id,
    phase: 'post-release-exchange',
    elapsedS,
    durationS,
    progress,
    targetExitCount,
    expectedExitedCount: getExpectedCount(targetExitCount, progress),
    exitSpeed: POST_EXCHANGE_EXIT_SPEED,
    stopReason: progress >= 1 ? 'duration-complete' : 'none',
    totalPlannedExitCount: targetExitCount,
    postExchangeReservedCount: targetExitCount,
    ...particleBounds,
  };
};

export const getHeatCapacityHardSphereScheduleFrame = (
  schedule: HeatCapacityHardSphereVisualFlowSchedule,
  elapsedS: number,
): HeatCapacityHardSphereVisualFlowSchedule => {
  const nextElapsedS = clampNumber(finiteOrFallback(elapsedS, schedule.elapsedS), 0, Math.max(schedule.durationS, 0));
  const progress = schedule.phase === 'main-release'
    ? resolveMainReleaseProgress(nextElapsedS, schedule.durationS)
    : resolveLinearProgress(nextElapsedS, schedule.durationS);
  return {
    ...schedule,
    elapsedS: nextElapsedS,
    progress,
    expectedExitedCount: getExpectedCount(schedule.targetExitCount, progress),
    stopReason: progress >= 1 ? 'duration-complete' : schedule.stopReason,
  };
};
