import {
  getPistonOscillationTrajectorySampleAt,
  simulatePistonOscillationRelease,
  type PistonOscillationTrajectory,
} from '../../domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S,
  PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM,
  PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA,
  PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  createPistonOscillationSensorObservationSeries,
  findPistonOscillationObservedFallingTriggerSample,
} from '../../domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  getPistonOscillationShellCopy,
  type PistonOscillationLanguage,
} from './pistonOscillationCopy.ts';
import type {
  PistonOscillationOperationCue,
} from './pistonOscillationOperationVisualizationModel.ts';

export type PistonOscillationDemoFocusMode = 'overview' | 'pistonFocus';
export type PistonOscillationDemoAcquisitionPhase = 'idle' | 'armed' | 'recording' | 'stopped';
export type PistonOscillationDemoStage = 'reset' | 'orient' | 'highlight' | 'action' | 'observe';
export type PistonOscillationDemoOperationMirrorView =
  | 'scaleReadingView'
  | 'screwOperationView';
export type PistonOscillationDemoControl =
  | 'settings'
  | 'platform'
  | 'mirrorOutline'
  | 'screw'
  | 'hose'
  | 'hoseSnap'
  | 'start'
  | 'stop'
  | 'retain'
  | null;
export const PISTON_OSCILLATION_DEMO_PRESS_DISPLACEMENTS_MM = [10.5, 9.8, 9] as const;
export const getPistonOscillationDemoPressDisplacementMm = (measurementIndex: number) => {
  const normalizedIndex = Number.isFinite(measurementIndex)
    ? Math.min(
      PISTON_OSCILLATION_DEMO_PRESS_DISPLACEMENTS_MM.length - 1,
      Math.max(0, Math.round(measurementIndex)),
    )
    : 0;
  return PISTON_OSCILLATION_DEMO_PRESS_DISPLACEMENTS_MM[normalizedIndex];
};
export type PistonOscillationDemoPlatformAction = 'adjustHeight' | 'press' | null;
export type PistonOscillationDemoKeyboardField = 'sampleRate' | 'trigger' | null;
export type PistonOscillationDemoStepKind =
  | 'settings'
  | 'settle'
  | 'disconnect'
  | 'adjustHeight'
  | 'secureHeight'
  | 'reconnectHose'
  | 'restoreFreeMotion'
  | 'startAcquisition'
  | 'recordOscillation'
  | 'stopAcquisition'
  | 'saveRun';

export interface PistonOscillationDemoFrame {
  elapsedMs: number;
  focusMode: PistonOscillationDemoFocusMode;
  activeControl: PistonOscillationDemoControl;
  highlightControl: PistonOscillationDemoControl;
  highlightElapsedSeconds: number;
  stage: PistonOscillationDemoStage;
  highlightControls: readonly PistonOscillationDemoControl[];
  stepIndex: number;
  stepCount: number;
  stepTitle: string;
  stepDescription: string;
  stepTarget: string;
  stepProgressCriterion: string;
  stepNote: string;
  measurementIndex: number;
  measurementCount: number;
  targetHeightMm: number;
  savedMeasurementCount: number;
  sampleRateInput: string;
  triggerInput: string;
  virtualKeyboardVisible: boolean;
  virtualKeyboardField: PistonOscillationDemoKeyboardField;
  virtualKeyboardPressedKey: string | null;
  hoseState: 'connected' | 'disconnected';
  hoseDragging: boolean;
  hoseGhostProgress: number;
  hoseWithinMagneticRange: boolean;
  lockingScrewProgress: number;
  operationMirrorView: PistonOscillationDemoOperationMirrorView | null;
  equilibriumHeightMm: number;
  platformAction: PistonOscillationDemoPlatformAction;
  leftHandSupporting: boolean;
  pistonOffsetMm: number;
  acquisitionPhase: PistonOscillationDemoAcquisitionPhase;
  releaseElapsedSeconds: number | null;
  formalElapsedSeconds: number;
  retainFeedbackVisible: boolean;
  operationCue: PistonOscillationOperationCue | null;
  completed: boolean;
}

export const PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS = 2_700;
export const PISTON_OSCILLATION_DEMO_ORIENT_MS = 1_800;
export const PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS = 3_100;
export const PISTON_OSCILLATION_DEMO_OBSERVE_MS = 2_050;
export const PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS =
  PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S;

type SegmentStage = 'orient' | 'highlight' | 'action';
type SegmentControl = Exclude<PistonOscillationDemoControl, null>;

interface SegmentSpec {
  stage: SegmentStage;
  control: PistonOscillationDemoControl;
  highlightControls?: readonly SegmentControl[];
  durationMs: number;
  focusMode?: PistonOscillationDemoFocusMode;
  operationMirrorView?: PistonOscillationDemoOperationMirrorView;
}

interface StepDefinition {
  kind: PistonOscillationDemoStepKind;
  measurementIndex: number;
  focusMode: PistonOscillationDemoFocusMode;
  segments: SegmentSpec[];
}

export interface PistonOscillationDemoSegmentWindow extends SegmentSpec {
  focusMode: PistonOscillationDemoFocusMode;
  startsAtMs: number;
  endsAtMs: number;
}

export interface PistonOscillationDemoHighlightWindow {
  control: SegmentControl;
  controls: readonly SegmentControl[];
  focusMode: PistonOscillationDemoFocusMode;
  startsAtMs: number;
  endsAtMs: number;
}

export interface PistonOscillationDemoActionWindow {
  control: PistonOscillationDemoControl;
  focusMode: PistonOscillationDemoFocusMode;
  startsAtMs: number;
  endsAtMs: number;
}

export interface PistonOscillationDemoStepWindow {
  stepIndex: number;
  kind: PistonOscillationDemoStepKind;
  measurementIndex: number;
  startsAtMs: number;
  actionStartsAtMs: number;
  actionEndsAtMs: number;
  endsAtMs: number;
  segments: PistonOscillationDemoSegmentWindow[];
  highlightWindows: PistonOscillationDemoHighlightWindow[];
  actionWindows: PistonOscillationDemoActionWindow[];
}

interface StepCopy {
  title: string;
  description: string;
  target: string;
  criterion: string;
  note: string;
}

interface DemoMetaCopy {
  settingsDescription: string;
  settingsTarget: string;
  settingsCriterion: string;
  settingsNote: string;
  settleDescription: string;
  settleTarget: string;
  settleCriterion: string;
  settleNote: string;
  disconnectDescription: string;
  disconnectTarget: string;
  disconnectCriterion: string;
  adjustDescription: (height: number) => string;
  adjustTarget: (height: number) => string;
  adjustCriterion: (height: number) => string;
  adjustNote: string;
  secureTitle: string;
  secureDescription: string;
  secureTarget: (height: number) => string;
  secureCriterion: string;
  secureNote: string;
  reconnectTitle: string;
  reconnectDescription: string;
  reconnectTarget: string;
  reconnectCriterion: string;
  reconnectNote: string;
  freeDescription: string;
  freeTarget: string;
  freeCriterion: string;
  freeNote: string;
  startDescription: string;
  startTarget: string;
  startCriterion: string;
  startNote: string;
  recordTitle: (run: number) => string;
  recordDescription: string;
  recordTarget: string;
  recordCriterion: string;
  recordNote: string;
  stopDescription: string;
  stopTarget: string;
  stopCriterion: string;
  stopNote: string;
  saveDescription: string;
  saveTarget: (run: number) => string;
  saveCriterion: string;
  saveNote: (run: number) => string;
  completedTitle: string;
  completedDescription: string;
  completedTarget: string;
  completedCriterion: string;
  completedNote: string;
  resetDescription: string;
  observe: (note: string) => string;
}

const META_COPY: Record<PistonOscillationLanguage, DemoMetaCopy> = {
  'zh-CN': {
    settingsDescription: '用屏幕键盘输入 1000 Hz 和 120 kPa。',
    settingsTarget: '设置采样率与触发值',
    settingsCriterion: '输入框显示 1000、120',
    settingsNote: '依次选择、输入并确认。',
    settleDescription: '确认曲线已保存，等待活塞停止。',
    settleTarget: '等待活塞稳定',
    settleCriterion: '曲线已保存，活塞已停止',
    settleNote: '稳定后再开始下一组。',
    disconnectDescription: '左手托住平台，用右手断开软管。',
    disconnectTarget: '断开压力传感器软管',
    disconnectCriterion: '软管断开，气缸通大气',
    adjustDescription: (height) => `根据刻度读取操作镜，将平台调至 ${height} mm；松手前用左手托住。`,
    adjustTarget: (height) => `调至 ${height} mm`,
    adjustCriterion: (height) => `刻度为 ${height.toFixed(1)} mm，平台受支撑`,
    adjustNote: '螺钉松开时，至少一只手托住平台。',
    secureTitle: '旋紧螺钉并固定高度',
    secureDescription: '观察螺钉操作镜，左手托住平台并旋紧锁紧螺钉。',
    secureTarget: (height) => `固定 ${height} mm 高度`,
    secureCriterion: '螺钉已锁紧，平台高度固定',
    secureNote: '旋紧后确认平台位置保持不变。',
    reconnectTitle: '接回压力传感器软管',
    reconnectDescription: '将软管接头拖回接口，恢复气路密封。',
    reconnectTarget: '接回压力传感器软管',
    reconnectCriterion: '接头吸附到位，软管已接通',
    reconnectNote: '接通后确认软管与接口连接稳定。',
    freeDescription: '在操作镜中旋松螺钉，使活塞自由振动。',
    freeTarget: '恢复自由振动',
    freeCriterion: '螺钉已松开',
    freeNote: '采集前必须完全松开螺钉。',
    startDescription: '点击图表左下角开始，等待下降触发。',
    startTarget: '开始压力采集',
    startCriterion: '状态为“等待触发”',
    startNote: '触发前压力不写入正式曲线。',
    recordTitle: (run) => `第 ${run} 次：按压、释放并记录`,
    recordDescription: '双手下压至 120–130 kPa 后同时松开，记录 0.500 s。',
    recordTarget: '记录压力振动',
    recordCriterion: '完成下降触发与 0.500 s 记录',
    recordNote: '双手同时松开后开始振动。',
    stopDescription: '记录满 0.500 s，待活塞停止后点击暂停。',
    stopTarget: '冻结当前曲线',
    stopCriterion: '状态为“已停止 · 曲线冻结”',
    stopNote: '冻结后检查曲线。',
    saveDescription: '检查曲线后点击保存。',
    saveTarget: (run) => `保存第 ${run} 条正式曲线`,
    saveCriterion: '显示保存确认',
    saveNote: (run) => run < 3 ? '保存后进入下一次高度调节。' : '第三条曲线保存后，本次演示结束。',
    completedTitle: '活塞振动法演示完成',
    completedDescription: '80、70、60 mm 三次仪器操作与压力曲线采集均已演示完成。',
    completedTarget: '完成三组实验实操演示',
    completedCriterion: '三条正式曲线均已依次保存',
    completedNote: '演示模式到此结束；周期框选、拟合与计算由引导模式继续完成。',
    resetDescription: '演示准备中，仪器与采集界面正在复位。',
    observe: (note) => `观察：${note}`,
  },
  'zh-TW': {
    settingsDescription: '用螢幕鍵盤輸入 1000 Hz 與 120 kPa。',
    settingsTarget: '設定採樣率與觸發值',
    settingsCriterion: '輸入框顯示 1000、120',
    settingsNote: '依序選擇、輸入並確認。',
    settleDescription: '確認曲線已儲存，等待活塞停止。',
    settleTarget: '等待活塞穩定',
    settleCriterion: '曲線已儲存，活塞已停止',
    settleNote: '穩定後再開始下一組。',
    disconnectDescription: '左手托住平台，用右手斷開軟管。',
    disconnectTarget: '斷開壓力感測器軟管',
    disconnectCriterion: '軟管斷開，氣缸通大氣',
    adjustDescription: (height) => `根據刻度讀取操作鏡，將平台調至 ${height} mm；鬆手前用左手托住。`,
    adjustTarget: (height) => `調至 ${height} mm`,
    adjustCriterion: (height) => `刻度為 ${height.toFixed(1)} mm，平台受支撐`,
    adjustNote: '螺釘鬆開時，至少一隻手托住平台。',
    secureTitle: '旋緊螺釘並固定高度',
    secureDescription: '觀察螺釘操作鏡，左手托住平台並旋緊鎖緊螺釘。',
    secureTarget: (height) => `固定 ${height} mm 高度`,
    secureCriterion: '螺釘已鎖緊，平台高度固定',
    secureNote: '旋緊後確認平台位置保持不變。',
    reconnectTitle: '接回壓力感測器軟管',
    reconnectDescription: '將軟管接頭拖回介面，恢復氣路密封。',
    reconnectTarget: '接回壓力感測器軟管',
    reconnectCriterion: '接頭吸附到位，軟管已接通',
    reconnectNote: '接通後確認軟管與介面連接穩定。',
    freeDescription: '在操作鏡中旋鬆螺釘，使活塞自由振動。',
    freeTarget: '恢復自由振動',
    freeCriterion: '螺釘已鬆開',
    freeNote: '採集前必須完全鬆開螺釘。',
    startDescription: '點擊圖表左下角開始，等待下降觸發。',
    startTarget: '開始壓力採集',
    startCriterion: '狀態為「等待觸發」',
    startNote: '觸發前壓力不寫入正式曲線。',
    recordTitle: (run) => `第 ${run} 次：按壓、釋放並記錄`,
    recordDescription: '雙手下壓至 120–130 kPa 後同時鬆開，記錄 0.500 s。',
    recordTarget: '記錄壓力振動',
    recordCriterion: '完成下降觸發與 0.500 s 記錄',
    recordNote: '雙手同時鬆開後開始振動。',
    stopDescription: '記錄滿 0.500 s，待活塞停止後點擊暫停。',
    stopTarget: '凍結目前曲線',
    stopCriterion: '狀態為「已停止 · 曲線凍結」',
    stopNote: '凍結後檢查曲線。',
    saveDescription: '檢查曲線後點擊儲存。',
    saveTarget: (run) => `儲存第 ${run} 條正式曲線`,
    saveCriterion: '顯示儲存確認',
    saveNote: (run) => run < 3 ? '儲存後進入下一次高度調節。' : '第三條曲線儲存後，本次演示結束。',
    completedTitle: '活塞振動法演示完成',
    completedDescription: '80、70、60 mm 三次儀器操作與壓力曲線採集均已演示完成。',
    completedTarget: '完成三組實驗實操演示',
    completedCriterion: '三條正式曲線均已依序儲存',
    completedNote: '演示模式到此結束；週期框選、擬合與計算由引導模式繼續完成。',
    resetDescription: '演示準備中，儀器與採集介面正在復位。',
    observe: (note) => `觀察：${note}`,
  },
  en: {
    settingsDescription: 'Enter 1000 Hz and 120 kPa with the on-screen keypad.',
    settingsTarget: 'Set the sample rate and trigger',
    settingsCriterion: 'The fields show 1000 and 120',
    settingsNote: 'Select, enter, and confirm each value.',
    settleDescription: 'Confirm the curve is saved, then wait for the piston to stop.',
    settleTarget: 'Wait for the piston to settle',
    settleCriterion: 'The curve is saved and the piston has stopped',
    settleNote: 'Begin the next run only after settling.',
    disconnectDescription: 'Support the platform with the left hand and disconnect the hose.',
    disconnectTarget: 'Disconnect the pressure-sensor hose',
    disconnectCriterion: 'The hose is disconnected and the cylinder is vented',
    adjustDescription: (height) => `Use the scale-reading mirror to set ${height} mm; support the platform before releasing.`,
    adjustTarget: (height) => `Set the equilibrium height to ${height} mm`,
    adjustCriterion: (height) => `The scale reads ${height.toFixed(1)} mm and the platform is supported`,
    adjustNote: 'Keep at least one hand on the platform while the screw is loose.',
    secureTitle: 'Tighten the screw and secure the height',
    secureDescription: 'Watch the screw-operation mirror, support the platform, and tighten the locking screw.',
    secureTarget: (height) => `Secure the ${height} mm height`,
    secureCriterion: 'The screw is tight and the platform height is fixed',
    secureNote: 'Confirm the platform remains at the set height.',
    reconnectTitle: 'Reconnect the pressure-sensor hose',
    reconnectDescription: 'Drag the hose connector back to the port to restore the seal.',
    reconnectTarget: 'Reconnect the pressure-sensor hose',
    reconnectCriterion: 'The connector snaps into place and the hose is connected',
    reconnectNote: 'Confirm the hose-to-port connection is stable.',
    freeDescription: 'Loosen the screw in the operation mirror so the piston can oscillate.',
    freeTarget: 'Restore free oscillation',
    freeCriterion: 'The screw is loose',
    freeNote: 'Fully loosen the screw before acquisition.',
    startDescription: 'Select Start below the chart and wait for the falling trigger.',
    startTarget: 'Start pressure acquisition',
    startCriterion: 'The state is “Waiting for trigger”',
    startNote: 'Pre-trigger pressure is not stored in the formal curve.',
    recordTitle: (run) => `Run ${run}: press, release, and record`,
    recordDescription: 'Press to 120–130 kPa, release both hands, and record for 0.500 s.',
    recordTarget: 'Record the pressure oscillation',
    recordCriterion: 'The trigger fires and 0.500 s is recorded',
    recordNote: 'Oscillation begins after both hands release.',
    stopDescription: 'After 0.500 s, wait for the piston to stop and select Pause.',
    stopTarget: 'Freeze the current curve',
    stopCriterion: 'The state is “Stopped · Curve frozen”',
    stopNote: 'Inspect the curve after freezing it.',
    saveDescription: 'Inspect the curve, then select Save.',
    saveTarget: (run) => `Save formal curve ${run}`,
    saveCriterion: 'A save confirmation appears',
    saveNote: (run) => run < 3 ? 'The next height adjustment begins after saving.' : 'The demonstration ends after the third curve is saved.',
    completedTitle: 'Piston-oscillation demonstration complete',
    completedDescription: 'All three instrument-operation and pressure-acquisition runs at 80, 70, and 60 mm are complete.',
    completedTarget: 'Complete all three practical demonstration runs',
    completedCriterion: 'All three formal curves were saved in sequence',
    completedNote: 'Demo mode ends here; Guide mode continues with period selection, fitting, and calculation.',
    resetDescription: 'Preparing the demonstration and resetting the instrument and acquisition panels.',
    observe: (note) => `Observe: ${note}`,
  },
};

const orient = (
  focusMode: PistonOscillationDemoFocusMode,
  operationMirrorView?: PistonOscillationDemoOperationMirrorView,
): SegmentSpec => ({
  stage: 'orient', control: null, durationMs: PISTON_OSCILLATION_DEMO_ORIENT_MS,
  focusMode, operationMirrorView,
});
const highlight = (
  controls: SegmentControl | readonly SegmentControl[],
  focusMode?: PistonOscillationDemoFocusMode,
  operationMirrorView?: PistonOscillationDemoOperationMirrorView,
): SegmentSpec => {
  const highlightControls = Array.isArray(controls) ? controls : [controls];
  return {
    stage: 'highlight', control: highlightControls[0]!, highlightControls,
    durationMs: PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS,
    focusMode, operationMirrorView,
  };
};
const action = (
  control: PistonOscillationDemoControl,
  durationMs: number,
  focusMode?: PistonOscillationDemoFocusMode,
  operationMirrorView?: PistonOscillationDemoOperationMirrorView,
): SegmentSpec => ({
  stage: 'action', control, durationMs, focusMode, operationMirrorView,
});

const createRunSteps = (measurementIndex: number): StepDefinition[] => [
  { kind: 'adjustHeight', measurementIndex, focusMode: 'pistonFocus', segments: [
    orient('pistonFocus', 'scaleReadingView'),
    highlight(['platform', 'mirrorOutline'], 'pistonFocus', 'scaleReadingView'),
    action('platform', 4_200, 'pistonFocus', 'scaleReadingView'),
  ] },
  { kind: 'secureHeight', measurementIndex, focusMode: 'pistonFocus', segments: [
    orient('pistonFocus', 'screwOperationView'),
    highlight(['screw', 'mirrorOutline'], 'pistonFocus', 'screwOperationView'),
    action('screw', 2_100, 'pistonFocus', 'screwOperationView'),
  ] },
  { kind: 'reconnectHose', measurementIndex, focusMode: 'overview', segments: [
    orient('overview'),
    highlight(['hose', 'hoseSnap'], 'overview'),
    action('hose', 2_100, 'overview'),
  ] },
  { kind: 'restoreFreeMotion', measurementIndex, focusMode: 'pistonFocus', segments: [
    orient('pistonFocus', 'screwOperationView'),
    highlight(['screw', 'mirrorOutline'], 'pistonFocus', 'screwOperationView'),
    action('screw', 2_100, 'pistonFocus', 'screwOperationView'),
  ] },
  { kind: 'startAcquisition', measurementIndex, focusMode: 'pistonFocus', segments: [
    orient('pistonFocus', 'screwOperationView'), highlight('start'), action('start', 1_050),
  ] },
  { kind: 'recordOscillation', measurementIndex, focusMode: 'pistonFocus', segments: [
    orient('pistonFocus', 'screwOperationView'), highlight('platform'), action('platform', 3_300),
  ] },
  { kind: 'stopAcquisition', measurementIndex, focusMode: 'pistonFocus', segments: [
    orient('pistonFocus', 'screwOperationView'), highlight('stop'), action('stop', 1_000),
  ] },
  { kind: 'saveRun', measurementIndex, focusMode: 'pistonFocus', segments: [
    orient('pistonFocus', 'screwOperationView'), highlight('retain'), action('retain', 1_050),
  ] },
];

const STEP_DEFINITIONS: StepDefinition[] = [
  { kind: 'settings', measurementIndex: 0, focusMode: 'overview', segments: [
    orient('overview'), highlight('settings'), action('settings', 4_500),
  ] },
  ...PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.flatMap((_, measurementIndex): StepDefinition[] => [
    ...(measurementIndex === 0 ? [] : [
      { kind: 'settle', measurementIndex, focusMode: 'overview', segments: [action(null, 3_550)] },
      { kind: 'disconnect', measurementIndex, focusMode: 'overview', segments: [
        orient('overview'), highlight('hose', 'overview'), action('hose', 2_050, 'overview'),
      ] },
    ] as StepDefinition[]),
    ...createRunSteps(measurementIndex),
  ]),
];

export const PISTON_OSCILLATION_DEMO_STEP_WINDOWS: PistonOscillationDemoStepWindow[] = (() => {
  let cursor = PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS;
  return STEP_DEFINITIONS.map((step, index) => {
    const startsAtMs = cursor;
    const segments = step.segments.map((segment): PistonOscillationDemoSegmentWindow => {
      const segmentStart = cursor;
      cursor += segment.durationMs;
      return { ...segment, focusMode: segment.focusMode ?? step.focusMode, startsAtMs: segmentStart, endsAtMs: cursor };
    });
    const highlightWindows = segments
      .filter((segment): segment is PistonOscillationDemoSegmentWindow & { control: SegmentControl } => segment.stage === 'highlight' && segment.control !== null)
      .map(({ control, highlightControls, focusMode, startsAtMs: start, endsAtMs: end }) => ({
        control,
        controls: highlightControls ?? [control],
        focusMode,
        startsAtMs: start,
        endsAtMs: end,
      }));
    const actionWindows = segments
      .filter((segment) => segment.stage === 'action')
      .map(({ control, focusMode, startsAtMs: start, endsAtMs: end }) => ({ control, focusMode, startsAtMs: start, endsAtMs: end }));
    const actionStartsAtMs = actionWindows[0]?.startsAtMs ?? cursor;
    const actionEndsAtMs = actionWindows.at(-1)?.endsAtMs ?? cursor;
    cursor += PISTON_OSCILLATION_DEMO_OBSERVE_MS;
    return {
      stepIndex: index + 1, kind: step.kind, measurementIndex: step.measurementIndex,
      startsAtMs, actionStartsAtMs, actionEndsAtMs, endsAtMs: cursor,
      segments, highlightWindows, actionWindows,
    };
  });
})();

export const PISTON_OSCILLATION_DEMO_DURATION_MS = PISTON_OSCILLATION_DEMO_STEP_WINDOWS.at(-1)?.endsAtMs
  ?? PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const progressBetween = (elapsedMs: number, startMs: number, endMs: number) => (
  clamp01((elapsedMs - startMs) / Math.max(1, endMs - startMs))
);
const getStepWindow = (measurementIndex: number, kind: PistonOscillationDemoStepKind) => (
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS.find((window) => window.measurementIndex === measurementIndex && window.kind === kind)!
);
const getActionWindow = (measurementIndex: number, kind: PistonOscillationDemoStepKind, control: PistonOscillationDemoControl) => (
  getStepWindow(measurementIndex, kind).actionWindows.find((window) => window.control === control)!
);

const trajectoryCache = new Map<number, PistonOscillationTrajectory>();
const triggerTimeCache = new Map<number, number>();
export const getPistonOscillationDemoTrajectory = (measurementIndex: number) => {
  const index = Math.min(2, Math.max(0, Math.round(measurementIndex)));
  const cached = trajectoryCache.get(index);
  if (cached) return cached;
  const trajectory = simulatePistonOscillationRelease({
    equilibriumHeightMm: PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[index],
    initialDisplacementMm: -getPistonOscillationDemoPressDisplacementMm(index),
  });
  trajectoryCache.set(index, trajectory);
  return trajectory;
};

const getDemoTriggerTimeS = (measurementIndex: number) => {
  const cached = triggerTimeCache.get(measurementIndex);
  if (cached !== undefined) return cached;
  const trajectory = getPistonOscillationDemoTrajectory(measurementIndex);
  const observations = createPistonOscillationSensorObservationSeries(
    trajectory.samples,
    trajectory.sampleRateHz,
  );
  const triggerTimeS = findPistonOscillationObservedFallingTriggerSample(
    observations,
    PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA,
  )?.timeS ?? 0;
  triggerTimeCache.set(measurementIndex, triggerTimeS);
  return triggerTimeS;
};

const getStepCopy = (language: PistonOscillationLanguage, window: PistonOscillationDemoStepWindow): StepCopy => {
  const shell = getPistonOscillationShellCopy(language);
  const guide = shell.guide;
  const meta = META_COPY[language];
  const run = window.measurementIndex + 1;
  const height = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[window.measurementIndex];
  switch (window.kind) {
    case 'settings': return { title: guide.parameterSetupTitle, description: meta.settingsDescription, target: meta.settingsTarget, criterion: meta.settingsCriterion, note: meta.settingsNote };
    case 'settle': return { title: guide.crossRunStabilizingTitle, description: meta.settleDescription, target: meta.settleTarget, criterion: meta.settleCriterion, note: meta.settleNote };
    case 'disconnect': return { title: guide.crossRunDisconnectTitle, description: meta.disconnectDescription, target: meta.disconnectTarget, criterion: meta.disconnectCriterion, note: meta.adjustNote };
    case 'adjustHeight': return { title: guide.adjustHeightTitle(height), description: meta.adjustDescription(height), target: meta.adjustTarget(height), criterion: meta.adjustCriterion(height), note: meta.adjustNote };
    case 'secureHeight': return { title: meta.secureTitle, description: meta.secureDescription, target: meta.secureTarget(height), criterion: meta.secureCriterion, note: meta.secureNote };
    case 'reconnectHose': return { title: meta.reconnectTitle, description: meta.reconnectDescription, target: meta.reconnectTarget, criterion: meta.reconnectCriterion, note: meta.reconnectNote };
    case 'restoreFreeMotion': return { title: guide.loosenScrewTitle, description: meta.freeDescription, target: meta.freeTarget, criterion: meta.freeCriterion, note: meta.freeNote };
    case 'startAcquisition': return { title: guide.startAcquisitionTitle, description: meta.startDescription, target: meta.startTarget, criterion: meta.startCriterion, note: meta.startNote };
    case 'recordOscillation': return { title: meta.recordTitle(run), description: meta.recordDescription, target: meta.recordTarget, criterion: meta.recordCriterion, note: meta.recordNote };
    case 'stopAcquisition': return { title: guide.pauseRecordingTitle, description: meta.stopDescription, target: meta.stopTarget, criterion: meta.stopCriterion, note: meta.stopNote };
    case 'saveRun': return { title: guide.saveCurveTitle(run), description: meta.saveDescription, target: meta.saveTarget(run), criterion: meta.saveCriterion, note: meta.saveNote(run) };
  }
};

const getKeyboardPresentation = (elapsedMs: number) => {
  const window = getActionWindow(0, 'settings', 'settings');
  const duration = window.endsAtMs - window.startsAtMs;
  const strokes = [
    [0.05, 'sampleRate', '1', '1'], [0.16, 'sampleRate', '0', '10'],
    [0.27, 'sampleRate', '0', '100'], [0.38, 'sampleRate', '0', '1000'],
    [0.50, 'sampleRate', 'action', '1000'], [0.62, 'trigger', '1', '1'],
    [0.74, 'trigger', '2', '12'], [0.86, 'trigger', '0', '120'],
    [0.96, 'trigger', 'action', '120'],
  ] as const;
  let sampleRateInput = elapsedMs >= window.endsAtMs ? '1000' : '';
  let triggerInput = elapsedMs >= window.endsAtMs ? '120' : '';
  let field: PistonOscillationDemoKeyboardField = 'sampleRate';
  let pressedKey: string | null = null;
  for (const [at, strokeField, key, value] of strokes) {
    const strokeAt = window.startsAtMs + at * duration;
    if (elapsedMs < strokeAt) break;
    if (strokeField === 'sampleRate') sampleRateInput = value;
    else triggerInput = value;
    field = key === 'action' && strokeField === 'sampleRate' ? 'trigger' : strokeField;
    if (elapsedMs - strokeAt <= 170) pressedKey = key;
  }
  const visible = elapsedMs >= window.startsAtMs && elapsedMs < window.endsAtMs;
  return {
    sampleRateInput, triggerInput, virtualKeyboardVisible: visible,
    virtualKeyboardField: visible ? field : null,
    virtualKeyboardPressedKey: visible ? pressedKey : null,
  };
};

const getEquilibriumHeight = (elapsedMs: number) => {
  let height = 0;
  PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.forEach((target, index) => {
    const window = getActionWindow(index, 'adjustHeight', 'platform');
    if (elapsedMs < window.startsAtMs) return;
    const start = index === 0 ? 0 : PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[index - 1];
    height = start + (target - start) * easeInOut(progressBetween(elapsedMs, window.startsAtMs, window.endsAtMs));
  });
  return height;
};

const getHosePresentation = (elapsedMs: number) => {
  let state: PistonOscillationDemoFrame['hoseState'] = 'disconnected';
  let ghost = 0;
  let inRange = false;
  for (let index = 0; index < 3; index += 1) {
    if (index > 0) {
      const disconnect = getActionWindow(index, 'disconnect', 'hose');
      if (elapsedMs >= disconnect.startsAtMs && elapsedMs < disconnect.endsAtMs) {
        const progress = easeInOut(progressBetween(elapsedMs, disconnect.startsAtMs, disconnect.endsAtMs));
        return { hoseState: 'disconnected' as const, hoseDragging: true, hoseGhostProgress: 1 - progress, hoseWithinMagneticRange: progress < 0.18 };
      }
      if (elapsedMs >= disconnect.endsAtMs) { state = 'disconnected'; ghost = 0; inRange = false; }
    }
    const connect = getActionWindow(index, 'reconnectHose', 'hose');
    if (elapsedMs >= connect.startsAtMs && elapsedMs < connect.endsAtMs) {
      const progress = easeInOut(progressBetween(elapsedMs, connect.startsAtMs, connect.endsAtMs));
      return { hoseState: 'disconnected' as const, hoseDragging: true, hoseGhostProgress: progress, hoseWithinMagneticRange: progress >= 0.82 };
    }
    if (elapsedMs >= connect.endsAtMs) { state = 'connected'; ghost = 1; inRange = true; }
  }
  return { hoseState: state, hoseDragging: false, hoseGhostProgress: ghost, hoseWithinMagneticRange: inRange };
};

const getScrewProgress = (elapsedMs: number) => {
  let progress = 0;
  for (let index = 0; index < 3; index += 1) {
    const lock = getActionWindow(index, 'secureHeight', 'screw');
    const loosen = getActionWindow(index, 'restoreFreeMotion', 'screw');
    if (elapsedMs >= lock.startsAtMs && elapsedMs < lock.endsAtMs) return easeInOut(progressBetween(elapsedMs, lock.startsAtMs, lock.endsAtMs));
    if (elapsedMs >= lock.endsAtMs) progress = 1;
    if (elapsedMs >= loosen.startsAtMs && elapsedMs < loosen.endsAtMs) return 1 - easeInOut(progressBetween(elapsedMs, loosen.startsAtMs, loosen.endsAtMs));
    if (elapsedMs >= loosen.endsAtMs) progress = 0;
  }
  return progress;
};

const getRunTiming = (index: number) => {
  const start = getActionWindow(index, 'startAcquisition', 'start');
  const oscillation = getActionWindow(index, 'recordOscillation', 'platform');
  const stop = getActionWindow(index, 'stopAcquisition', 'stop');
  const retain = getActionWindow(index, 'saveRun', 'retain');
  return {
    acquisitionStartAtMs: start.startsAtMs + 525,
    pressStartMs: oscillation.startsAtMs,
    pressEndMs: oscillation.startsAtMs + 1_100,
    releaseAtMs: oscillation.startsAtMs + 1_500,
    acquisitionStopAtMs: stop.startsAtMs + 500,
    retainAtMs: retain.startsAtMs + 450,
  };
};

const DEMO_SPACE_HOLD_WINDOWS = Array.from(
  { length: PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS },
  (_, measurementIndex) => {
    const adjustHeight = PISTON_OSCILLATION_DEMO_STEP_WINDOWS.find((window) => (
      window.measurementIndex === measurementIndex && window.kind === 'adjustHeight'
    ))!;
    const secureHeight = PISTON_OSCILLATION_DEMO_STEP_WINDOWS.find((window) => (
      window.measurementIndex === measurementIndex && window.kind === 'secureHeight'
    ))!;
    const supportStartAtMs = measurementIndex === 0
      ? adjustHeight.startsAtMs
      : PISTON_OSCILLATION_DEMO_STEP_WINDOWS.find((window) => (
        window.measurementIndex === measurementIndex - 1 && window.kind === 'saveRun'
      ))!.actionEndsAtMs;
    const restoreFreeMotion = PISTON_OSCILLATION_DEMO_STEP_WINDOWS.find((window) => (
      window.measurementIndex === measurementIndex && window.kind === 'restoreFreeMotion'
    ))!;
    return [
      { startsAtMs: supportStartAtMs, endsAtMs: secureHeight.actionEndsAtMs },
      {
        startsAtMs: restoreFreeMotion.startsAtMs,
        endsAtMs: getRunTiming(measurementIndex).releaseAtMs,
      },
    ] as const;
  },
).flat();

const isDemoSpaceHeld = (elapsedMs: number) => DEMO_SPACE_HOLD_WINDOWS.some(
  ({ startsAtMs, endsAtMs }) => elapsedMs >= startsAtMs && elapsedMs < endsAtMs,
);

const getDemoMouseAction = (
  window: PistonOscillationDemoStepWindow,
  stage: PistonOscillationDemoStage,
  elapsedMs: number,
): PistonOscillationOperationCue['mouseAction'] | null => {
  if (stage !== 'action') return null;
  switch (window.kind) {
    case 'adjustHeight':
      return window.measurementIndex === 0 ? 'moveUp' : 'moveDown';
    case 'secureHeight':
      return 'rotateClockwise';
    case 'restoreFreeMotion':
      return 'rotateCounterclockwise';
    case 'disconnect':
    case 'reconnectHose':
    case 'startAcquisition':
    case 'stopAcquisition':
    case 'saveRun':
      return 'click';
    case 'recordOscillation':
      return elapsedMs < getRunTiming(window.measurementIndex).releaseAtMs
        ? 'moveDown'
        : null;
    case 'settings':
    case 'settle':
      return null;
  }
};

const getDemoOperationCue = (
  elapsedMs: number,
  window: PistonOscillationDemoStepWindow,
  stage: PistonOscillationDemoStage,
): PistonOscillationOperationCue | null => {
  const spaceHeld = isDemoSpaceHeld(elapsedMs);
  const mouseAction = getDemoMouseAction(window, stage, elapsedMs);
  const keys: PistonOscillationOperationCue['keys'][number][] = [];
  if (spaceHeld) keys.push('space');
  if (mouseAction) keys.push('mouseLeft');
  if (keys.length === 0) return null;
  return mouseAction ? { keys, mouseAction } : { keys };
};

export const getPistonOscillationDemoFrame = (
  elapsedMsInput: number,
  language: PistonOscillationLanguage = 'zh-CN',
): PistonOscillationDemoFrame => {
  const elapsedMs = Math.min(PISTON_OSCILLATION_DEMO_DURATION_MS, Math.max(0, elapsedMsInput));
  const currentWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS.find((window) => elapsedMs < window.endsAtMs)
    ?? PISTON_OSCILLATION_DEMO_STEP_WINDOWS.at(-1)!;
  const currentSegment = currentWindow.segments.find((segment) => elapsedMs >= segment.startsAtMs && elapsedMs < segment.endsAtMs);
  const reset = elapsedMs < PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS;
  const stage: PistonOscillationDemoStage = reset ? 'reset' : currentSegment?.stage
    ?? 'observe';
  const highlightControl = stage === 'highlight' ? currentSegment?.control ?? null : null;
  const highlightControls = stage === 'highlight'
    ? currentSegment?.highlightControls ?? (highlightControl ? [highlightControl] : [])
    : [];
  const activeControl = stage === 'action' ? currentSegment?.control ?? null : null;
  const presentationStepIndex = currentWindow.stepIndex;
  const measurementIndex = currentWindow.measurementIndex;
  const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[measurementIndex];
  const keyboard = getKeyboardPresentation(elapsedMs);
  const hose = getHosePresentation(elapsedMs);
  const lockingScrewProgress = getScrewProgress(elapsedMs);
  const runTiming = getRunTiming(measurementIndex);
  const trajectory = getPistonOscillationDemoTrajectory(measurementIndex);
  const triggerTimeS = getDemoTriggerTimeS(measurementIndex);
  const releaseElapsedSeconds = elapsedMs < runTiming.releaseAtMs ? null : (elapsedMs - runTiming.releaseAtMs) / 1000;
  const formalElapsedSeconds = releaseElapsedSeconds === null ? 0 : Math.min(
    PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS,
    Math.max(0, releaseElapsedSeconds - triggerTimeS),
  );
  const acquisitionPhase: PistonOscillationDemoAcquisitionPhase = elapsedMs < runTiming.acquisitionStartAtMs
    ? 'idle' : elapsedMs < runTiming.releaseAtMs + triggerTimeS * 1000
      ? 'armed' : elapsedMs < runTiming.acquisitionStopAtMs ? 'recording' : 'stopped';
  const platformAction: PistonOscillationDemoPlatformAction = activeControl !== 'platform' ? null
    : currentWindow.kind === 'adjustHeight' ? 'adjustHeight'
      : currentWindow.kind === 'recordOscillation' ? 'press' : null;
  const leftHandSupporting = isDemoSpaceHeld(elapsedMs);
  let pistonOffsetMm = 0;
  if (platformAction === 'press') {
    const pressDisplacementMm = getPistonOscillationDemoPressDisplacementMm(
      measurementIndex,
    );
    pistonOffsetMm = elapsedMs < runTiming.pressEndMs
      ? -pressDisplacementMm
        * easeInOut(progressBetween(elapsedMs, runTiming.pressStartMs, runTiming.pressEndMs))
      : elapsedMs < runTiming.releaseAtMs
        ? -pressDisplacementMm
        : 0;
  }
  if (elapsedMs >= runTiming.releaseAtMs) {
    pistonOffsetMm = getPistonOscillationTrajectorySampleAt(
      trajectory,
      (elapsedMs - runTiming.releaseAtMs) / 1000,
    ).displacementM * 1_000;
  }
  const latestSegment = currentWindow.segments.slice().reverse().find((segment) => elapsedMs >= segment.startsAtMs);
  const latestOperationMirrorSegment = currentWindow.segments.slice().reverse().find((segment) => (
    elapsedMs >= segment.startsAtMs && segment.operationMirrorView !== undefined
  ));
  const focusMode = reset ? 'overview' : currentSegment?.focusMode ?? latestSegment?.focusMode
    ?? STEP_DEFINITIONS[currentWindow.stepIndex - 1].focusMode;
  const operationMirrorView = focusMode === 'pistonFocus'
    ? currentSegment?.operationMirrorView ?? latestOperationMirrorSegment?.operationMirrorView ?? null
    : null;
  const completed = elapsedMs >= PISTON_OSCILLATION_DEMO_DURATION_MS;
  const meta = META_COPY[language];
  const step = completed ? {
    title: meta.completedTitle, description: meta.completedDescription,
    target: meta.completedTarget, criterion: meta.completedCriterion, note: meta.completedNote,
  } : getStepCopy(language, currentWindow);
  const stepDescription = stage === 'reset' ? meta.resetDescription
    : stage === 'observe' ? meta.observe(step.note) : step.description;
  const savedMeasurementCount = [0, 1, 2].reduce((count, index) => count + (elapsedMs >= getRunTiming(index).retainAtMs ? 1 : 0), 0);
  return {
    elapsedMs, focusMode, activeControl, highlightControl, highlightControls,
    highlightElapsedSeconds: stage === 'highlight' && currentSegment ? (elapsedMs - currentSegment.startsAtMs) / 1000 : 0,
    stage, stepIndex: presentationStepIndex, stepCount: PISTON_OSCILLATION_DEMO_STEP_WINDOWS.length,
    stepTitle: step.title, stepDescription, stepTarget: step.target,
    stepProgressCriterion: step.criterion, stepNote: step.note,
    measurementIndex, measurementCount: PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS,
    targetHeightMm, savedMeasurementCount, ...keyboard, ...hose,
    lockingScrewProgress, operationMirrorView,
    equilibriumHeightMm: getEquilibriumHeight(elapsedMs),
    platformAction, leftHandSupporting, pistonOffsetMm,
    acquisitionPhase, releaseElapsedSeconds, formalElapsedSeconds,
    retainFeedbackVisible: elapsedMs >= runTiming.retainAtMs,
    operationCue: getDemoOperationCue(elapsedMs, currentWindow, stage),
    completed,
  };
};
