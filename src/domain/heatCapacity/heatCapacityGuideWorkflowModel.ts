import {
  normalizeHeatCapacityGuideSpeedMultiplier,
  type HeatCapacityGuideSpeedMultiplier,
} from './heatCapacityGuideExperimentTimerModel.ts';

export type HeatCapacityGuideWorkflowStep =
  | 'powerRequired'
  | 'openStopcockForZeroRequired'
  | 'zeroRequired'
  | 'recordU0Required'
  | 'closeStopcockBeforePumpRequired'
  | 'openPumpValveRequired'
  | 'pumpRequired'
  | 'closePumpValveRequired'
  | 'u1Waiting'
  | 'recordU1Required'
  | 'openStopcockForReleaseRequired'
  | 'closeStopcockAfterReleaseRequired'
  | 'u2Waiting'
  | 'recordU2Required'
  | 'closePowerRequired'
  | 'completed';

export type HeatCapacityGuideAction =
  | 'togglePower'
  | 'openStopcock'
  | 'closeStopcock'
  | 'adjustZero'
  | 'recordU0'
  | 'openPumpValve'
  | 'closePumpValve'
  | 'pressPumpBulb'
  | 'recordU1'
  | 'recordU2'
  | 'timerComplete'
  | 'abortGuide';

export type HeatCapacityGuideRollbackAnimation =
  | 'valveBounce'
  | 'stopcockBounce'
  | 'pumpBulbBounce'
  | 'knobBounce'
  | 'powerBounce';

export interface HeatCapacityGuideWorkflowState {
  step: HeatCapacityGuideWorkflowStep;
  speedMultiplier: HeatCapacityGuideSpeedMultiplier;
  paused: boolean;
  waitStartedAtS: number | null;
  waitStage: 'u1' | 'u2' | null;
  strongReminderActive: boolean;
  strongReminderTargetControlId: string | null;
  wrongActionCount: number;
}

export interface HeatCapacityGuideActionContext {
  action: HeatCapacityGuideAction;
  powerOn: boolean;
  stopcockOpen: boolean;
  pumpValveOpen: boolean;
  displayPressureMv: number;
  pressureZeroReady?: boolean;
  simulationTimeS?: number;
}

export interface HeatCapacityGuideGuardResult {
  allowed: boolean;
  message: string;
  rollbackAnimation?: HeatCapacityGuideRollbackAnimation;
  targetControlId: string | null;
}

export const HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV = 120;

export const createDefaultHeatCapacityGuideWorkflow = (
  speedMultiplier: unknown = 8,
): HeatCapacityGuideWorkflowState => ({
  step: 'powerRequired',
  speedMultiplier: normalizeHeatCapacityGuideSpeedMultiplier(speedMultiplier),
  paused: false,
  waitStartedAtS: null,
  waitStage: null,
  strongReminderActive: false,
  strongReminderTargetControlId: null,
  wrongActionCount: 0,
});

export const getHeatCapacityGuideTargetControlId = (
  step: HeatCapacityGuideWorkflowStep,
): string | null => {
  switch (step) {
    case 'powerRequired':
    case 'closePowerRequired':
      return 'powerSwitch';
    case 'openStopcockForZeroRequired':
    case 'closeStopcockBeforePumpRequired':
    case 'openStopcockForReleaseRequired':
    case 'closeStopcockAfterReleaseRequired':
      return 'stopcock';
    case 'zeroRequired':
      return 'pressureZero';
    case 'recordU0Required':
      return 'recordU0';
    case 'openPumpValveRequired':
    case 'closePumpValveRequired':
      return 'pumpValve';
    case 'pumpRequired':
      return 'pumpBulb';
    case 'recordU1Required':
      return 'recordU1';
    case 'recordU2Required':
      return 'recordU2';
    default:
      return null;
  }
};

const rollbackForAction = (
  action: HeatCapacityGuideAction,
): HeatCapacityGuideRollbackAnimation | undefined => {
  switch (action) {
    case 'togglePower':
      return 'powerBounce';
    case 'openStopcock':
    case 'closeStopcock':
      return 'stopcockBounce';
    case 'openPumpValve':
    case 'closePumpValve':
      return 'valveBounce';
    case 'pressPumpBulb':
      return 'pumpBulbBounce';
    case 'adjustZero':
      return 'knobBounce';
    default:
      return undefined;
  }
};

const accepted = (message: string, targetControlId: string | null): HeatCapacityGuideGuardResult => ({
  allowed: true,
  message,
  targetControlId,
});

const rejected = (
  workflow: HeatCapacityGuideWorkflowState,
  context: HeatCapacityGuideActionContext,
  message: string,
): HeatCapacityGuideGuardResult => ({
  allowed: false,
  message,
  rollbackAnimation: rollbackForAction(context.action),
  targetControlId: getHeatCapacityGuideTargetControlId(workflow.step),
});

export const getHeatCapacityGuideActionGuard = (
  workflow: HeatCapacityGuideWorkflowState,
  context: HeatCapacityGuideActionContext,
): HeatCapacityGuideGuardResult => {
  if (context.action === 'abortGuide') {
    return accepted('已中止引导实验。', null);
  }

  switch (workflow.step) {
    case 'powerRequired':
      return context.action === 'togglePower' && context.powerOn
        ? accepted('电源已打开。', 'powerSwitch')
        : rejected(workflow, context, '请先打开电源。');
    case 'openStopcockForZeroRequired':
      return context.action === 'openStopcock' && context.stopcockOpen
        ? accepted('玻璃旋塞已打开。', 'stopcock')
        : rejected(workflow, context, '请先打开玻璃旋塞。');
    case 'zeroRequired':
      return context.action === 'adjustZero' && context.pressureZeroReady === true
        ? accepted('压强已调零。', 'pressureZero')
        : rejected(workflow, context, '请调节压力调零旋钮，使 Uₚ 接近 0。');
    case 'recordU0Required':
      return context.action === 'recordU0'
        ? accepted('已记录 U₀。', 'recordU0')
        : rejected(workflow, context, '请记录 U₀。');
    case 'closeStopcockBeforePumpRequired':
      return context.action === 'closeStopcock' && !context.stopcockOpen
        ? accepted('玻璃旋塞已关闭。', 'stopcock')
        : rejected(workflow, context, '请先关闭玻璃旋塞，再开始打气。');
    case 'openPumpValveRequired':
      return context.action === 'openPumpValve' && context.pumpValveOpen
        ? accepted('打气阀门已打开。', 'pumpValve')
        : rejected(workflow, context, '请打开打气阀门。');
    case 'pumpRequired':
      if (context.action === 'pressPumpBulb') return accepted('继续打气，直到 Uₚ ≥ 120 mV。', 'pumpBulb');
      if (context.action === 'closePumpValve' && context.displayPressureMv >= HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV) {
        return accepted('已达到 Uₚ ≥ 120 mV。', 'pumpValve');
      }
      return rejected(workflow, context, `请连续打气，直到 Uₚ ≥ ${HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV.toFixed(0)} mV。`);
    case 'closePumpValveRequired':
      return context.action === 'closePumpValve' && !context.pumpValveOpen
        ? accepted('打气阀门已关闭。', 'pumpValve')
        : rejected(workflow, context, '请关闭打气阀门。');
    case 'u1Waiting':
      return context.action === 'timerComplete'
        ? accepted('U₁ 等待完成。', 'recordU1')
        : rejected(workflow, context, '请等待计时器达到 5 min。');
    case 'recordU1Required':
      return context.action === 'recordU1'
        ? accepted('已记录 U₁。', 'recordU1')
        : rejected(workflow, context, '请记录 U₁。');
    case 'openStopcockForReleaseRequired':
      return context.action === 'openStopcock' && context.stopcockOpen
        ? accepted('放气旋塞已打开。', 'stopcock')
        : rejected(workflow, context, '请打开玻璃旋塞进行放气。');
    case 'closeStopcockAfterReleaseRequired':
      return context.action === 'closeStopcock' && !context.stopcockOpen
        ? accepted('放气旋塞已关闭。', 'stopcock')
        : rejected(workflow, context, '请关闭玻璃旋塞结束放气。');
    case 'u2Waiting':
      return context.action === 'timerComplete'
        ? accepted('U₂ 等待完成。', 'recordU2')
        : rejected(workflow, context, '请等待计时器达到 5 min。');
    case 'recordU2Required':
      return context.action === 'recordU2'
        ? accepted('已记录 U₂。', 'recordU2')
        : rejected(workflow, context, '请记录 U₂。');
    case 'closePowerRequired':
      return context.action === 'togglePower' && !context.powerOn
        ? accepted('实验已完成。', 'powerSwitch')
        : rejected(workflow, context, '请关闭电源，完成本次引导实验。');
    case 'completed':
      return rejected(workflow, context, '本次引导实验已完成。');
  }
};

const nextClean = (
  workflow: HeatCapacityGuideWorkflowState,
  patch: Partial<HeatCapacityGuideWorkflowState>,
): HeatCapacityGuideWorkflowState => ({
  ...workflow,
  ...patch,
  strongReminderActive: patch.strongReminderActive ?? false,
  strongReminderTargetControlId: patch.strongReminderTargetControlId ?? null,
  wrongActionCount: 0,
});

export const transitionHeatCapacityGuideWorkflow = (
  workflow: HeatCapacityGuideWorkflowState,
  context: HeatCapacityGuideActionContext,
): HeatCapacityGuideWorkflowState => {
  const guard = getHeatCapacityGuideActionGuard(workflow, context);
  if (!guard.allowed) {
    return {
      ...workflow,
      wrongActionCount: workflow.wrongActionCount + 1,
    };
  }

  switch (workflow.step) {
    case 'powerRequired':
      return nextClean(workflow, { step: 'openStopcockForZeroRequired' });
    case 'openStopcockForZeroRequired':
      return nextClean(workflow, { step: 'zeroRequired' });
    case 'zeroRequired':
      return nextClean(workflow, { step: 'recordU0Required' });
    case 'recordU0Required':
      return nextClean(workflow, { step: 'closeStopcockBeforePumpRequired' });
    case 'closeStopcockBeforePumpRequired':
      return nextClean(workflow, { step: 'openPumpValveRequired' });
    case 'openPumpValveRequired':
      return nextClean(workflow, { step: 'pumpRequired' });
    case 'pumpRequired':
      if (context.action === 'pressPumpBulb') {
        return context.displayPressureMv >= HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV
          ? nextClean(workflow, { step: 'closePumpValveRequired' })
          : nextClean(workflow, {});
      }
      return context.action === 'closePumpValve'
        ? nextClean(workflow, { step: 'u1Waiting', waitStartedAtS: context.simulationTimeS ?? null, waitStage: 'u1' })
        : nextClean(workflow, {});
    case 'closePumpValveRequired':
      return nextClean(workflow, { step: 'u1Waiting', waitStartedAtS: context.simulationTimeS ?? null, waitStage: 'u1' });
    case 'u1Waiting':
      return nextClean(workflow, {
        step: 'recordU1Required',
        paused: true,
        strongReminderActive: true,
        strongReminderTargetControlId: 'recordU1',
      });
    case 'recordU1Required':
      return nextClean(workflow, {
        step: 'openStopcockForReleaseRequired',
        paused: false,
        waitStartedAtS: null,
        waitStage: null,
      });
    case 'openStopcockForReleaseRequired':
      return nextClean(workflow, { step: 'closeStopcockAfterReleaseRequired' });
    case 'closeStopcockAfterReleaseRequired':
      return nextClean(workflow, { step: 'u2Waiting', waitStartedAtS: context.simulationTimeS ?? null, waitStage: 'u2' });
    case 'u2Waiting':
      return nextClean(workflow, {
        step: 'recordU2Required',
        paused: true,
        strongReminderActive: true,
        strongReminderTargetControlId: 'recordU2',
      });
    case 'recordU2Required':
      return nextClean(workflow, {
        step: 'closePowerRequired',
        paused: true,
        waitStartedAtS: null,
        waitStage: null,
        strongReminderActive: true,
        strongReminderTargetControlId: 'powerSwitch',
      });
    case 'closePowerRequired':
      return nextClean(workflow, { step: 'completed', paused: false });
    case 'completed':
      return workflow;
  }
};
