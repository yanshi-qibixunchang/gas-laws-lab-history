import type {
  HeatCapacityFreePhysicsState,
} from './heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeTrial,
} from './heatCapacityFreeTrialModel.ts';

export const HEAT_CAPACITY_FREE_TARGET_WAIT_S = 300;

export type HeatCapacityFreeExperimentTimerStage =
  | 'idle'
  | 'u1-wait'
  | 'u2-wait'
  | 'complete';

export interface HeatCapacityFreeExperimentTimerState {
  stage: HeatCapacityFreeExperimentTimerStage;
  anchorAtS: number | null;
  elapsedS: number;
  targetS: number;
  remainingS: number;
  reachedTarget: boolean;
}

const roundTimerSeconds = (value: number) => (
  Number.isFinite(value) ? Number(Math.max(0, value).toFixed(3)) : 0
);

const createInactiveTimer = (
  stage: 'idle' | 'complete',
): HeatCapacityFreeExperimentTimerState => ({
  stage,
  anchorAtS: null,
  elapsedS: 0,
  targetS: HEAT_CAPACITY_FREE_TARGET_WAIT_S,
  remainingS: stage === 'complete' ? 0 : HEAT_CAPACITY_FREE_TARGET_WAIT_S,
  reachedTarget: stage === 'complete',
});

const createWaitingTimer = (
  stage: 'u1-wait' | 'u2-wait',
  simulationTimeS: number,
  anchorAtS: number,
): HeatCapacityFreeExperimentTimerState => {
  const elapsedS = roundTimerSeconds(simulationTimeS - anchorAtS);
  const remainingS = roundTimerSeconds(HEAT_CAPACITY_FREE_TARGET_WAIT_S - elapsedS);
  return {
    stage,
    anchorAtS,
    elapsedS,
    targetS: HEAT_CAPACITY_FREE_TARGET_WAIT_S,
    remainingS,
    reachedTarget: elapsedS >= HEAT_CAPACITY_FREE_TARGET_WAIT_S,
  };
};

export const deriveHeatCapacityFreeExperimentTimer = (
  trial: HeatCapacityFreeTrial | null | undefined,
  physics: HeatCapacityFreePhysicsState,
): HeatCapacityFreeExperimentTimerState => {
  if (!trial?.u0) {
    return createInactiveTimer('idle');
  }
  if (trial.u2) {
    return createInactiveTimer('complete');
  }
  if (!trial.u1) {
    if (physics.pumpStrokeCount > 0 && physics.lastPumpStrokeAtS !== null) {
      return createWaitingTimer('u1-wait', physics.simulationTimeS, physics.lastPumpStrokeAtS);
    }
    return createInactiveTimer('idle');
  }
  if (
    physics.releaseStarted &&
    physics.releaseReference !== null &&
    physics.lastStopcockClosedAtS !== null
  ) {
    return createWaitingTimer('u2-wait', physics.simulationTimeS, physics.lastStopcockClosedAtS);
  }
  return createInactiveTimer('idle');
};
