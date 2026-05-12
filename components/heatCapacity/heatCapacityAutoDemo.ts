import type { HeatCapacityProcessSampleKey } from './heatCapacityExperimentModel.ts';

export type HeatCapacityAutoDemoAction =
  | 'powerOn'
  | 'powerOff'
  | 'observeInitialPressure'
  | 'zeroPressure'
  | 'openStopcockForZero'
  | 'openPumpValve'
  | 'closePumpValve'
  | 'closeStopcockForPumping'
  | 'pumpStroke'
  | 'captureSample'
  | 'openStopcockForRelease'
  | 'closeStopcockForRecovery'
  | 'markDemoComplete';

export type HeatCapacityAutoDemoControlId =
  | 'powerSwitch'
  | 'pressureZero'
  | 'pumpValve'
  | 'pumpBulb'
  | 'stopcock'
  | 'instrumentPressureDisplay'
  | 'instrumentTemperatureDisplay'
  | 'instrumentPanel';

export interface HeatCapacityAutoDemoStepAction {
  action: HeatCapacityAutoDemoAction;
  delayMs?: number;
  sampleKey?: HeatCapacityProcessSampleKey;
}

export interface HeatCapacityAutoDemoStepFocus {
  targetControlId: HeatCapacityAutoDemoControlId;
  durationMs: number;
}

export interface HeatCapacityAutoDemoStep {
  id: string;
  title: string;
  description: string;
  target: string;
  note: string;
  targetControlId?: HeatCapacityAutoDemoControlId;
  focusSequence?: HeatCapacityAutoDemoStepFocus[];
  preHighlightMs: number;
  actionDurationMs: number;
  observeDurationMs: number;
  actions: HeatCapacityAutoDemoStepAction[];
}

export type HeatCapacityAutoDemoTimelineStage = 'highlight' | 'action' | 'observe' | 'preview';

export interface HeatCapacityAutoDemoTimelineItem {
  atMs: number;
  stage: HeatCapacityAutoDemoTimelineStage;
  stepIndex: number;
  step: HeatCapacityAutoDemoStep;
  action?: HeatCapacityAutoDemoStepAction;
  focusControlId?: HeatCapacityAutoDemoControlId;
}

const DEFAULT_PRE_HIGHLIGHT_MS = 5_000;
const DEFAULT_OBSERVE_MS = 6_000;
const STOPCOCK_TRANSITION_MS = 1_000;
const POWER_TRANSITION_MS = 650;
const PUMP_VALVE_TRANSITION_MS = 420;

export const createHeatCapacityAutoDemoSteps = (): HeatCapacityAutoDemoStep[] => [
  {
    id: 'power-on',
    title: '开启电源',
    description: '打开电源，使温度与压强测量系统开始工作',
    target: '电源开关',
    note: '观察仪表屏幕亮起，并出现 U_T 与 U_p 读数',
    targetControlId: 'powerSwitch',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: POWER_TRANSITION_MS,
    observeDurationMs: 4_000,
    actions: [{ action: 'powerOn' }],
  },
  {
    id: 'open-stopcock-for-zero',
    title: '打开玻璃旋塞',
    description: '打开旋塞，使气瓶与外界连通，确保内外气压一致',
    target: '玻璃旋塞',
    note: '调零前先让气瓶与外界相通，再检查和校正压强差示数',
    targetControlId: 'stopcock',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: STOPCOCK_TRANSITION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'openStopcockForZero' }],
  },
  {
    id: 'zero-pressure',
    title: '压强差调零',
    description: '旋转压力调零旋钮，使压强差 U_p 接近 0',
    target: 'U_p 显示屏 / 压力调零旋钮',
    note: '调零后压强差 U_p 示数在 0mv 附近上下波动',
    targetControlId: 'pressureZero',
    focusSequence: [
      { targetControlId: 'instrumentPressureDisplay', durationMs: 4_000 },
      { targetControlId: 'pressureZero', durationMs: 4_000 },
    ],
    preHighlightMs: 8_000,
    actionDurationMs: 1_200,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [
      { action: 'observeInitialPressure' },
      { action: 'zeroPressure', delayMs: 180 },
      { action: 'captureSample', delayMs: 1_100, sampleKey: 'zeroedSample' },
    ],
  },
  {
    id: 'close-stopcock-before-pump',
    title: '关闭玻璃旋塞',
    description: '关闭旋塞，使气瓶形成封闭空间',
    target: '玻璃旋塞',
    note: '封闭后才能进行有效加压',
    targetControlId: 'stopcock',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: STOPCOCK_TRANSITION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'closeStopcockForPumping' }],
  },
  {
    id: 'open-pump-valve',
    title: '打开打气阀门',
    description: '打开阀门，允许打气球向气瓶输入空气',
    target: '打气阀门',
    note: '阀门打开后，指示灯变绿',
    targetControlId: 'pumpValve',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: PUMP_VALVE_TRANSITION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'openPumpValve' }],
  },
  {
    id: 'pump-pressurize',
    title: '连续打气加压',
    description: '连续快速打气，使瓶内压强升高',
    target: '打气球',
    note: '打气操作需在短时内完成，压力表指针不得超过安全上限',
    targetControlId: 'pumpBulb',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: 3_600,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [
      { action: 'pumpStroke' },
      { action: 'pumpStroke', delayMs: 430 },
      { action: 'pumpStroke', delayMs: 860 },
      { action: 'pumpStroke', delayMs: 1_290 },
      { action: 'pumpStroke', delayMs: 1_720 },
      { action: 'pumpStroke', delayMs: 2_150 },
      { action: 'pumpStroke', delayMs: 2_580 },
      { action: 'captureSample', delayMs: 3_250, sampleKey: 'pumpPeakSample' },
    ],
  },
  {
    id: 'close-pump-valve',
    title: '关闭打气阀门',
    description: '关闭阀门，停止加压',
    target: '打气阀门',
    note: '关闭后打气球不再形成有效加压通路',
    targetControlId: 'pumpValve',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: PUMP_VALVE_TRANSITION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'closePumpValve' }],
  },
  {
    id: 'sealed-stabilize',
    title: '封闭等待稳定',
    description: '等待气体状态相对稳定，观察压强和温度信号变化',
    target: 'U_p / U_T 显示屏',
    note: '稳定不是完全静止，末位读数会在小范围内波动',
    targetControlId: 'instrumentPanel',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: 2_900,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'captureSample', delayMs: 2_800, sampleKey: 'stableBeforeReleaseSample' }],
  },
  {
    id: 'release-and-close-stopcock',
    title: '打开旋塞放气，并快速关闭',
    description: '让瓶内气体快速突出容器外',
    target: '玻璃旋塞',
    note: '咻的一声完全消失立即关闭，系统进入回温过程',
    targetControlId: 'stopcock',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: 2_700,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [
      { action: 'openStopcockForRelease' },
      { action: 'captureSample', delayMs: 1_450, sampleKey: 'releaseLowSample' },
      { action: 'closeStopcockForRecovery', delayMs: 1_650 },
    ],
  },
  {
    id: 'thermal-recovery',
    title: '等待回温',
    description: '等待瓶内空气与环境换热，温度信号逐渐恢复',
    target: 'U_T / U_p 显示屏',
    note: 'U_T 变化慢于 U_p，U_p 小幅恢复或趋稳',
    targetControlId: 'instrumentTemperatureDisplay',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: 2_900,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'captureSample', delayMs: 2_800, sampleKey: 'recoverySample' }],
  },
  {
    id: 'power-off',
    title: '关闭电源',
    description: '实验演示结束，关闭电源',
    target: '电源开关',
    note: '显示屏进入非工作状态',
    targetControlId: 'powerSwitch',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: POWER_TRANSITION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [
      { action: 'powerOff' },
      { action: 'markDemoComplete', delayMs: POWER_TRANSITION_MS + DEFAULT_OBSERVE_MS },
    ],
  },
];

export const getHeatCapacityAutoDemoTimeline = (
  steps = createHeatCapacityAutoDemoSteps(),
): HeatCapacityAutoDemoTimelineItem[] => {
  let cursorMs = 0;
  const timeline: HeatCapacityAutoDemoTimelineItem[] = [];

  steps.forEach((step, stepIndex) => {
    const focusSequence = step.focusSequence ?? (
      step.targetControlId ? [{ targetControlId: step.targetControlId, durationMs: step.preHighlightMs }] : []
    );
    let focusCursorMs = cursorMs;
    focusSequence.forEach((focus) => {
      timeline.push({
        atMs: focusCursorMs,
        stage: 'highlight',
        stepIndex,
        step,
        focusControlId: focus.targetControlId,
      });
      focusCursorMs += focus.durationMs;
    });
    if (focusSequence.length === 0) {
      timeline.push({
        atMs: cursorMs,
        stage: 'highlight',
        stepIndex,
        step,
      });
    }

    const actionBaseMs = cursorMs + step.preHighlightMs;
    step.actions.forEach((action) => {
      timeline.push({
        atMs: actionBaseMs + (action.delayMs ?? 0),
        stage: 'action',
        stepIndex,
        step,
        action,
      });
    });

    timeline.push({
      atMs: actionBaseMs + step.actionDurationMs,
      stage: 'observe',
      stepIndex,
      step,
    });
    const nextCursorMs = cursorMs + step.preHighlightMs + step.actionDurationMs + step.observeDurationMs;
    const nextStep = steps[stepIndex + 1];
    if (nextStep) {
      timeline.push({
        atMs: nextCursorMs - 1_000,
        stage: 'preview',
        stepIndex: stepIndex + 1,
        step: nextStep,
      });
    }
    cursorMs = nextCursorMs;
  });

  return timeline.sort((a, b) => a.atMs - b.atMs);
};
