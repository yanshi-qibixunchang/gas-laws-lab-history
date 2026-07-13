import {
  normalizeHeatCapacityGuideSpeedMultiplier,
  type HeatCapacityGuideSpeedMultiplier,
} from './heatCapacityGuideExperimentTimerModel.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from './heatCapacityDefaultConfig.ts';

export type HeatCapacityGuideWorkflowStep =
  | 'powerRequired'
  | 'preheatRequired'
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
  | 'preheatComplete'
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
  | 'releaseComplete'
  | 'releaseCloseAnimationComplete'
  | 'abortGuide';

export interface HeatCapacityGuideWorkflowState {
  step: HeatCapacityGuideWorkflowStep;
  speedMultiplier: HeatCapacityGuideSpeedMultiplier;
  paused: boolean;
  waitStartedAtS: number | null;
  waitStage: 'u1' | 'u2' | null;
  strongReminderActive: boolean;
  strongReminderTargetControlId: string | null;
  wrongActionCount: number;
  releaseCloseResumeAtMs: number | null;
}

export interface HeatCapacityGuideActionContext {
  action: HeatCapacityGuideAction;
  powerOn: boolean;
  stopcockOpen: boolean;
  pumpValveOpen: boolean;
  displayPressureMv: number;
  pressureZeroReady?: boolean;
  simulationTimeS?: number;
  wallClockMs?: number;
  releaseFormed?: boolean;
}

export interface HeatCapacityGuideGuardResult {
  allowed: boolean;
  message: string;
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
  releaseCloseResumeAtMs: null,
});

export const getHeatCapacityGuideTargetControlId = (
  step: HeatCapacityGuideWorkflowStep,
): string | null => {
  switch (step) {
    case 'powerRequired':
    case 'closePowerRequired':
      return 'powerSwitch';
    case 'preheatRequired':
      return null;
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

const accepted = (message: string, targetControlId: string | null): HeatCapacityGuideGuardResult => ({
  allowed: true,
  message,
  targetControlId,
});

const rejected = (
  workflow: HeatCapacityGuideWorkflowState,
  message: string,
): HeatCapacityGuideGuardResult => ({
  allowed: false,
  message,
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
        : rejected(workflow, '请先打开电源。');
    case 'preheatRequired':
      return context.action === 'preheatComplete' && context.powerOn
        ? accepted('传感器预热完成。', null)
        : rejected(workflow, '请等待传感器预热完成。');
    case 'openStopcockForZeroRequired':
      return context.action === 'openStopcock' && context.stopcockOpen
        ? accepted('玻璃旋塞已打开。', 'stopcock')
        : rejected(workflow, '请先打开玻璃旋塞。');
    case 'zeroRequired':
      return context.action === 'adjustZero' && context.pressureZeroReady === true
        ? accepted('压强已调零。', 'pressureZero')
        : rejected(workflow, '请调节压力调零旋钮，使 Uₚ 接近 0。');
    case 'recordU0Required':
      return context.action === 'recordU0'
        ? accepted('已记录 U₀。', 'recordU0')
        : rejected(workflow, '请记录 U₀。');
    case 'closeStopcockBeforePumpRequired':
      return context.action === 'closeStopcock' && !context.stopcockOpen
        ? accepted('玻璃旋塞已关闭。', 'stopcock')
        : rejected(workflow, '请先关闭玻璃旋塞，再开始打气。');
    case 'openPumpValveRequired':
      return context.action === 'openPumpValve' && context.pumpValveOpen
        ? accepted('打气阀门已打开。', 'pumpValve')
        : rejected(workflow, '请打开打气阀门。');
    case 'pumpRequired':
      if (context.action === 'pressPumpBulb') return accepted('继续打气，直到 Uₚ ≥ 120 mV。', 'pumpBulb');
      if (context.action === 'closePumpValve' && context.displayPressureMv >= HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV) {
        return accepted('已达到 Uₚ ≥ 120 mV。', 'pumpValve');
      }
      return rejected(workflow, `请连续打气，直到 Uₚ ≥ ${HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV.toFixed(0)} mV。`);
    case 'closePumpValveRequired':
      return context.action === 'closePumpValve' && !context.pumpValveOpen
        ? accepted('打气阀门已关闭。', 'pumpValve')
        : rejected(workflow, '请关闭打气阀门。');
    case 'u1Waiting':
      return context.action === 'timerComplete'
        ? accepted('U₁ 等待完成。', 'recordU1')
        : rejected(workflow, '请等待计时器达到 5 min。');
    case 'recordU1Required':
      return context.action === 'recordU1'
        ? accepted('已记录 U₁。', 'recordU1')
        : rejected(workflow, '请记录 U₁。');
    case 'openStopcockForReleaseRequired':
      if (context.action === 'releaseComplete' && context.stopcockOpen) {
        return accepted('放气完成。', 'stopcock');
      }
      if (context.action === 'closeStopcock' && !context.stopcockOpen) {
        return accepted(
          context.releaseFormed ? '已主动结束放气。' : '快速开关未形成放气，请重新打开玻璃旋塞。',
          'stopcock',
        );
      }
      return context.action === 'openStopcock' && context.stopcockOpen
        ? accepted('放气旋塞已打开。', 'stopcock')
        : rejected(workflow, '请打开玻璃旋塞进行放气。');
    case 'closeStopcockAfterReleaseRequired':
      if (
        context.action === 'releaseCloseAnimationComplete' &&
        workflow.releaseCloseResumeAtMs !== null &&
        (context.wallClockMs ?? Number.NEGATIVE_INFINITY) >= workflow.releaseCloseResumeAtMs
      ) {
        return accepted('放气旋塞关闭动画已完成。', 'stopcock');
      }
      if (workflow.releaseCloseResumeAtMs !== null) {
        return rejected(workflow, '玻璃旋塞正在关闭。');
      }
      return context.action === 'closeStopcock' && !context.stopcockOpen
        ? accepted('放气旋塞已关闭。', 'stopcock')
        : rejected(workflow, '请关闭玻璃旋塞结束放气。');
    case 'u2Waiting':
      return context.action === 'timerComplete'
        ? accepted('U₂ 等待完成。', 'recordU2')
        : rejected(workflow, '请等待计时器达到 5 min。');
    case 'recordU2Required':
      return context.action === 'recordU2'
        ? accepted('已记录 U₂。', 'recordU2')
        : rejected(workflow, '请记录 U₂。');
    case 'closePowerRequired':
      return context.action === 'togglePower' && !context.powerOn
        ? accepted('实验已完成。', 'powerSwitch')
        : rejected(workflow, '请关闭电源，完成本次引导实验。');
    case 'completed':
      return rejected(workflow, '本次引导实验已完成。');
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

const beginReleaseCloseAnimationWait = (
  workflow: HeatCapacityGuideWorkflowState,
  context: HeatCapacityGuideActionContext,
) => nextClean(workflow, {
  step: 'closeStopcockAfterReleaseRequired',
  paused: true,
  releaseCloseResumeAtMs: (context.wallClockMs ?? 0) +
    HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs,
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
      return nextClean(workflow, { step: 'preheatRequired' });
    case 'preheatRequired':
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
      if (context.action === 'releaseComplete') {
        return nextClean(workflow, {
          step: 'closeStopcockAfterReleaseRequired',
          paused: true,
          releaseCloseResumeAtMs: null,
        });
      }
      if (context.action === 'closeStopcock') {
        return context.releaseFormed
          ? beginReleaseCloseAnimationWait(workflow, context)
          : nextClean(workflow, {
              paused: false,
              releaseCloseResumeAtMs: null,
            });
      }
      return nextClean(workflow, {});
    case 'closeStopcockAfterReleaseRequired':
      if (context.action === 'closeStopcock') {
        return beginReleaseCloseAnimationWait(workflow, context);
      }
      return nextClean(workflow, {
        step: 'u2Waiting',
        paused: false,
        waitStartedAtS: context.simulationTimeS ?? null,
        waitStage: 'u2',
        releaseCloseResumeAtMs: null,
      });
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
