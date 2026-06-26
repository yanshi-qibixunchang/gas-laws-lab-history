import type {
  HeatCapacityGuideWorkflowState,
} from './heatCapacityGuideWorkflowModel.ts';

export const HEAT_CAPACITY_GUIDE_WAIT_TARGET_S = 300;
export const HEAT_CAPACITY_GUIDE_SPEED_OPTIONS = [2, 4, 8, 16] as const;
export type HeatCapacityGuideSpeedMultiplier = typeof HEAT_CAPACITY_GUIDE_SPEED_OPTIONS[number];
const HEAT_CAPACITY_GUIDE_TIMER_EPSILON_S = 1e-6;

export interface HeatCapacityGuideTimerState {
  stage: 'none' | 'u1-wait' | 'u2-wait' | 'u1-ready' | 'u2-ready';
  elapsedS: number;
  targetS: number;
  complete: boolean;
}

const clampNonNegative = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

export const normalizeHeatCapacityGuideSpeedMultiplier = (
  value: unknown,
): HeatCapacityGuideSpeedMultiplier => (
  HEAT_CAPACITY_GUIDE_SPEED_OPTIONS.includes(value as HeatCapacityGuideSpeedMultiplier)
    ? value as HeatCapacityGuideSpeedMultiplier
    : 8
);

export const deriveHeatCapacityGuideExperimentTimer = (
  workflow: Pick<HeatCapacityGuideWorkflowState, 'step' | 'waitStage' | 'waitStartedAtS'>,
  simulationTimeS: number,
): HeatCapacityGuideTimerState => {
  if (
    workflow.waitStage === null ||
    workflow.waitStartedAtS === null ||
    (workflow.step !== 'u1Waiting' && workflow.step !== 'u2Waiting' && workflow.step !== 'recordU1Required' && workflow.step !== 'recordU2Required')
  ) {
    return {
      stage: 'none',
      elapsedS: 0,
      targetS: HEAT_CAPACITY_GUIDE_WAIT_TARGET_S,
      complete: false,
    };
  }

  const rawElapsedS = clampNonNegative(simulationTimeS - workflow.waitStartedAtS);
  const complete = rawElapsedS + HEAT_CAPACITY_GUIDE_TIMER_EPSILON_S >= HEAT_CAPACITY_GUIDE_WAIT_TARGET_S;
  const elapsedS = complete
    ? HEAT_CAPACITY_GUIDE_WAIT_TARGET_S
    : Math.min(HEAT_CAPACITY_GUIDE_WAIT_TARGET_S, rawElapsedS);
  const readyStage = workflow.waitStage === 'u1' ? 'u1-ready' : 'u2-ready';
  const waitStage = workflow.waitStage === 'u1' ? 'u1-wait' : 'u2-wait';
  return {
    stage: complete ? readyStage : waitStage,
    elapsedS,
    targetS: HEAT_CAPACITY_GUIDE_WAIT_TARGET_S,
    complete,
  };
};
