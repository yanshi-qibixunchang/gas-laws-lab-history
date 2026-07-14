import type { HeatCapacityProcessSampleKey } from './heatCapacityProcessTypes.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
} from './heatCapacityDefaultConfig.ts';
import { getHeatCapacityPreheatTotalPresentationMs } from './heatCapacityPreheatModel.ts';

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
  | 'completeTeachingMode';

export type HeatCapacityAutoDemoControlId =
  | 'powerSwitch'
  | 'pressureZero'
  | 'pumpValve'
  | 'pumpBulb'
  | 'stopcock'
  | 'instrumentPressureDisplay'
  | 'instrumentTemperatureDisplay'
  | 'instrumentPanel';

export type HeatCapacityAutoDemoCameraFocusMode = 'instrument' | 'pump' | 'bottle';

export interface HeatCapacityAutoDemoStepAction {
  action: HeatCapacityAutoDemoAction;
  delayMs?: number;
  sampleKey?: HeatCapacityProcessSampleKey;
}

export interface HeatCapacityAutoDemoStepFocus {
  targetControlId: HeatCapacityAutoDemoControlId;
  cameraFocusMode?: HeatCapacityAutoDemoCameraFocusMode;
  durationMs: number;
}

export type HeatCapacityAutoDemoWaitStage = 'u1' | 'u2';

export interface HeatCapacityAutoDemoWaitSpec {
  stage: HeatCapacityAutoDemoWaitStage;
  targetS: number;
  speedMultiplier: typeof HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER;
  sampleKey: HeatCapacityProcessSampleKey;
}

export interface HeatCapacityAutoDemoStep {
  id: string;
  title: string;
  description: string;
  target: string;
  progressCriterion: string;
  note: string;
  targetControlId?: HeatCapacityAutoDemoControlId;
  cameraFocusMode?: HeatCapacityAutoDemoCameraFocusMode;
  focusSequence?: HeatCapacityAutoDemoStepFocus[];
  wait?: HeatCapacityAutoDemoWaitSpec;
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
  cameraFocusMode?: HeatCapacityAutoDemoCameraFocusMode;
}

const DEFAULT_PRE_HIGHLIGHT_MS = 4_000;
const DEFAULT_OBSERVE_MS = 3_000;
const POWER_TRANSITION_MS = 650;
const PUMP_VALVE_TRANSITION_MS = 420;
export const HEAT_CAPACITY_AUTO_DEMO_ZEROING_ACTION_DURATION_MS = 1_200;
const STOPCOCK_OPENING_MS = HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs;
const STOPCOCK_CLOSING_MS = HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs;
export const HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER = 16 as const;
export const HEAT_CAPACITY_AUTO_DEMO_WAIT_EXIT_DURATION_MS = 160;
export const HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS = Math.round(
  HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS * 1000,
);
export const HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_RELEASE_MS = Math.round(
  HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS * 1000,
);
const getAutoDemoWaitWallClockMs = (standardWaitMs: number) => Math.round(
  standardWaitMs / HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
);
const getAutoDemoWaitSampleDelayMs = (standardWaitMs: number) => Math.max(
  0,
  getAutoDemoWaitWallClockMs(standardWaitMs) - DEFAULT_OBSERVE_MS - DEFAULT_PRE_HIGHLIGHT_MS,
);
export const HEAT_CAPACITY_AUTO_DEMO_STABILIZATION_SAMPLE_DELAY_MS =
  getAutoDemoWaitSampleDelayMs(HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS);
export const HEAT_CAPACITY_AUTO_DEMO_RECOVERY_SAMPLE_DELAY_MS =
  getAutoDemoWaitSampleDelayMs(HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_RELEASE_MS);
export const HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS = Math.round(
  STOPCOCK_OPENING_MS + HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1000,
);
export const HEAT_CAPACITY_AUTO_DEMO_RELEASE_ACTION_DURATION_MS =
  HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS + STOPCOCK_CLOSING_MS;
export const HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT = HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes;
export const HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS = Array.from(
  { length: HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT },
  (_, index) => Math.round(index * HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1000),
);
const HEAT_CAPACITY_TEACHING_LAST_PUMP_STROKE_DELAY_MS =
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS[
    HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS.length - 1
  ] ?? 0;
const HEAT_CAPACITY_TEACHING_PUMP_SAMPLE_DELAY_MS =
  HEAT_CAPACITY_TEACHING_LAST_PUMP_STROKE_DELAY_MS + 300;

const createTeachingPumpStrokeActions = (): HeatCapacityAutoDemoStepAction[] => [
  ...HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS.map((delayMs): HeatCapacityAutoDemoStepAction => ({
    action: 'pumpStroke',
    delayMs,
  })),
  { action: 'captureSample', delayMs: HEAT_CAPACITY_TEACHING_PUMP_SAMPLE_DELAY_MS, sampleKey: 'pumpPeakSample' },
];

export const createHeatCapacityAutoDemoSteps = (): HeatCapacityAutoDemoStep[] => [
  {
    id: 'power-on',
    title: '开启电源',
    description: '打开电源，使温度与压强测量系统开始工作',
    target: '电源开关',
    progressCriterion: '仪表亮起并显示 Uₜ / Uₚ 后进入下一步。',
    note: '观察仪表屏幕亮起，并出现 Uₜ 与 Uₚ 读数',
    targetControlId: 'powerSwitch',
    cameraFocusMode: 'instrument',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: POWER_TRANSITION_MS,
    observeDurationMs: 0,
    actions: [{ action: 'powerOn' }],
  },
  {
    id: 'sensor-preheat',
    title: '传感器预热',
    description: '保持仪器通电，完成传感器预热。',
    target: '温度与压强传感器',
    progressCriterion: '仿真用 5 s 等效表示现实仪器连续预热 20 min。',
    note: '预热完成后，传感器读数恢复并继续后续实验。',
    preHighlightMs: 0,
    actionDurationMs: getHeatCapacityPreheatTotalPresentationMs(),
    observeDurationMs: 0,
    actions: [],
  },
  {
    id: 'open-stopcock-for-zero',
    title: '打开玻璃旋塞',
    description: '打开旋塞，使气瓶与外界连通，确保内外气压一致',
    target: '玻璃旋塞',
    progressCriterion: '气瓶与外界连通后进入压强差调零。',
    note: '调零前先让气瓶与外界相通，再检查和校正压强差示数',
    targetControlId: 'stopcock',
    cameraFocusMode: 'bottle',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: STOPCOCK_OPENING_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'openStopcockForZero' }],
  },
  {
    id: 'zero-pressure',
    title: '压强差调零',
    description: '旋转压力调零旋钮，使压强差 Uₚ 接近 0',
    target: 'Uₚ 显示屏 / 压力调零旋钮',
    progressCriterion: 'Uₚ 接近 0 mV 后记录 U₀。',
    note: '调零后压强差 Uₚ 示数在 0mv 附近上下波动',
    targetControlId: 'pressureZero',
    cameraFocusMode: 'instrument',
    focusSequence: [
      { targetControlId: 'instrumentPressureDisplay', cameraFocusMode: 'instrument', durationMs: 4_000 },
      { targetControlId: 'pressureZero', cameraFocusMode: 'instrument', durationMs: 4_000 },
    ],
    preHighlightMs: 8_000,
    actionDurationMs: HEAT_CAPACITY_AUTO_DEMO_ZEROING_ACTION_DURATION_MS,
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
    progressCriterion: '玻璃旋塞关闭后准备打开打气阀门。',
    note: '封闭后才能进行有效加压',
    targetControlId: 'stopcock',
    cameraFocusMode: 'bottle',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: STOPCOCK_CLOSING_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'closeStopcockForPumping' }],
  },
  {
    id: 'open-pump-valve',
    title: '打开打气阀门',
    description: '打开阀门，允许打气球向气瓶输入空气',
    target: '打气阀门',
    progressCriterion: '打气阀门打开后开始连续打气。',
    note: '阀门打开后，指示灯变绿',
    targetControlId: 'pumpValve',
    cameraFocusMode: 'bottle',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: PUMP_VALVE_TRANSITION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'openPumpValve' }],
  },
  {
    id: 'pump-pressurize',
    title: '连续打气加压',
    description: '连续快速按压打气球，使 Uₚ 升高',
    target: '打气球',
    progressCriterion: '打到 Uₚ ≥ 120 mV 后，关闭打气阀门进入稳定等待。',
    note: '标准看 Uₚ 读数，不按打气次数判断；压强不得超过安全上限。',
    targetControlId: 'pumpBulb',
    cameraFocusMode: 'pump',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: HEAT_CAPACITY_TEACHING_PUMP_SAMPLE_DELAY_MS + 300,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [
      ...createTeachingPumpStrokeActions(),
    ],
  },
  {
    id: 'close-pump-valve',
    title: '关闭打气阀门',
    description: '关闭阀门，停止加压',
    target: '打气阀门',
    progressCriterion: '打气阀门关闭后进入封闭等待。',
    note: '关闭后打气球不再形成有效加压通路',
    targetControlId: 'pumpValve',
    cameraFocusMode: 'bottle',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: PUMP_VALVE_TRANSITION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{ action: 'closePumpValve' }],
  },
  {
    id: 'sealed-stabilize',
    title: '封闭等待稳定',
    description: '关闭打气阀门后保持气瓶封闭，等待压强和温度信号稳定',
    target: 'Uₚ / Uₜ 显示屏',
    progressCriterion: '等待 5 min 后记录 U₁ / Uₜ₁。',
    note: '演示使用固定 ×16 倍速展示完整 5 min 计时，结束后自动记录稳定读数。',
    targetControlId: 'instrumentPanel',
    cameraFocusMode: 'instrument',
    wait: {
      stage: 'u1',
      targetS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
      speedMultiplier: HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
      sampleKey: 'stableBeforeReleaseSample',
    },
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs:
      HEAT_CAPACITY_AUTO_DEMO_STABILIZATION_SAMPLE_DELAY_MS +
      HEAT_CAPACITY_AUTO_DEMO_WAIT_EXIT_DURATION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{
      action: 'captureSample',
      delayMs: HEAT_CAPACITY_AUTO_DEMO_STABILIZATION_SAMPLE_DELAY_MS,
      sampleKey: 'stableBeforeReleaseSample',
    }],
  },
  {
    id: 'release-and-close-stopcock',
    title: '打开旋塞放气，并快速关闭',
    description: '让瓶内气体快速突出容器外',
    target: '玻璃旋塞',
    progressCriterion: '快速放气后立即关闭玻璃旋塞。',
    note: '咻的一声完全消失立即关闭，系统进入回温过程',
    targetControlId: 'stopcock',
    cameraFocusMode: 'bottle',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: HEAT_CAPACITY_AUTO_DEMO_RELEASE_ACTION_DURATION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [
      { action: 'openStopcockForRelease' },
      {
        action: 'captureSample',
        delayMs: HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS,
        sampleKey: 'releaseLowSample',
      },
      { action: 'closeStopcockForRecovery', delayMs: HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS },
    ],
  },
  {
    id: 'thermal-recovery',
    title: '等待回温',
    description: '快速放气并关闭玻璃旋塞后，等待瓶内空气回温',
    target: 'Uₜ / Uₚ 显示屏',
    progressCriterion: '等待 5 min 后记录 U₂ / Uₜ₂。',
    note: '演示使用固定 ×16 倍速展示完整 5 min 计时，结束后自动记录回温读数。',
    targetControlId: 'instrumentTemperatureDisplay',
    cameraFocusMode: 'instrument',
    wait: {
      stage: 'u2',
      targetS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS,
      speedMultiplier: HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
      sampleKey: 'recoverySample',
    },
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs:
      HEAT_CAPACITY_AUTO_DEMO_RECOVERY_SAMPLE_DELAY_MS +
      HEAT_CAPACITY_AUTO_DEMO_WAIT_EXIT_DURATION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [{
      action: 'captureSample',
      delayMs: HEAT_CAPACITY_AUTO_DEMO_RECOVERY_SAMPLE_DELAY_MS,
      sampleKey: 'recoverySample',
    }],
  },
  {
    id: 'power-off',
    title: '关闭电源',
    description: '实验演示结束，关闭电源',
    target: '电源开关',
    progressCriterion: '电源关闭后演示结束。',
    note: '显示屏进入非工作状态',
    targetControlId: 'powerSwitch',
    cameraFocusMode: 'instrument',
    preHighlightMs: DEFAULT_PRE_HIGHLIGHT_MS,
    actionDurationMs: POWER_TRANSITION_MS,
    observeDurationMs: DEFAULT_OBSERVE_MS,
    actions: [
      { action: 'powerOff' },
      { action: 'completeTeachingMode', delayMs: POWER_TRANSITION_MS + DEFAULT_OBSERVE_MS },
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
        cameraFocusMode: focus.cameraFocusMode ?? step.cameraFocusMode,
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
        cameraFocusMode: step.cameraFocusMode,
      });
    });

    const nextCursorMs = cursorMs + step.preHighlightMs + step.actionDurationMs + step.observeDurationMs;
    const nextStep = steps[stepIndex + 1];
    if (nextStep) {
      timeline.push({
        atMs: actionBaseMs + step.actionDurationMs,
        stage: 'preview',
        stepIndex: stepIndex + 1,
        step: nextStep,
      });
    } else {
      timeline.push({
        atMs: actionBaseMs + step.actionDurationMs,
        stage: 'observe',
        stepIndex,
        step,
      });
    }
    cursorMs = nextCursorMs;
  });

  return timeline.sort((a, b) => a.atMs - b.atMs);
};

export interface HeatCapacityAutoDemoWaitTimer {
  stage: HeatCapacityAutoDemoWaitStage;
  elapsedS: number;
  targetS: number;
  speedMultiplier: typeof HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER;
  phase: 'active' | 'exiting';
}

export const deriveHeatCapacityAutoDemoWaitTimer = (
  timeline: HeatCapacityAutoDemoTimelineItem[],
  elapsedMs: number,
): HeatCapacityAutoDemoWaitTimer | null => {
  const normalizedElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const waitSteps = new Map<number, HeatCapacityAutoDemoStep>();
  timeline.forEach((item) => {
    if (item.step.wait) waitSteps.set(item.stepIndex, item.step);
  });

  for (const [stepIndex, step] of waitSteps) {
    const wait = step.wait;
    if (!wait) continue;
    const stepItems = timeline.filter((item) => item.stepIndex === stepIndex);
    const waitStartedAtMs = Math.min(...stepItems.map((item) => item.atMs));
    const waitCompletedAtMs = stepItems.find((item) => (
      item.stage === 'action' && item.action?.sampleKey === wait.sampleKey
    ))?.atMs;
    if (!Number.isFinite(waitStartedAtMs) || waitCompletedAtMs === undefined) continue;
    const waitExitedAtMs = timeline.find((item) => (
      item.stage === 'preview' &&
      item.stepIndex === stepIndex + 1 &&
      item.atMs >= waitCompletedAtMs
    ))?.atMs ?? waitCompletedAtMs + HEAT_CAPACITY_AUTO_DEMO_WAIT_EXIT_DURATION_MS;
    if (normalizedElapsedMs < waitStartedAtMs || normalizedElapsedMs >= waitExitedAtMs) continue;

    const activeElapsedMs = Math.min(normalizedElapsedMs, waitCompletedAtMs) - waitStartedAtMs;
    return {
      stage: wait.stage,
      elapsedS: Math.min(
        wait.targetS,
        Math.max(0, activeElapsedMs / 1000 * wait.speedMultiplier),
      ),
      targetS: wait.targetS,
      speedMultiplier: wait.speedMultiplier,
      phase: normalizedElapsedMs < waitCompletedAtMs ? 'active' : 'exiting',
    };
  }

  return null;
};
