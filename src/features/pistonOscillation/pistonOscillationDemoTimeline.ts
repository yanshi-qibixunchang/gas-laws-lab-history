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

export type PistonOscillationDemoFocusMode = 'overview' | 'pistonFocus';
export type PistonOscillationDemoAcquisitionPhase = 'idle' | 'armed' | 'recording' | 'stopped';
export type PistonOscillationDemoStage = 'reset' | 'highlight' | 'action' | 'preview' | 'observe';
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
  | 'secureAndReconnect'
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
  equilibriumHeightMm: number;
  platformAction: PistonOscillationDemoPlatformAction;
  leftHandSupporting: boolean;
  pistonOffsetMm: number;
  acquisitionPhase: PistonOscillationDemoAcquisitionPhase;
  releaseElapsedSeconds: number | null;
  formalElapsedSeconds: number;
  retainFeedbackVisible: boolean;
  completed: boolean;
}

export const PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS = 1_800;
export const PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS = 4_000;
export const PISTON_OSCILLATION_DEMO_OBSERVE_MS = 3_000;
export const PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS =
  PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S;

type SegmentStage = 'highlight' | 'action' | 'preview';
type SegmentControl = Exclude<PistonOscillationDemoControl, null>;

interface SegmentSpec {
  stage: SegmentStage;
  control: PistonOscillationDemoControl;
  durationMs: number;
  focusMode?: PistonOscillationDemoFocusMode;
  previewDescription?: 'reconnectHose';
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
  adjustTarget: (height: number) => string;
  adjustCriterion: (height: number) => string;
  adjustNote: string;
  secureTitle: string;
  secureTarget: (height: number) => string;
  secureCriterion: string;
  secureNote: string;
  freeTarget: string;
  freeCriterion: string;
  freeNote: string;
  startTarget: string;
  startCriterion: string;
  startNote: string;
  recordTitle: (run: number) => string;
  recordTarget: string;
  recordCriterion: string;
  recordNote: string;
  stopTarget: string;
  stopCriterion: string;
  stopNote: string;
  saveTarget: (run: number) => string;
  saveCriterion: string;
  saveNote: (run: number) => string;
  completedTitle: string;
  completedDescription: string;
  completedTarget: string;
  completedCriterion: string;
  completedNote: string;
  reconnectPreview: string;
  resetDescription: string;
  upcoming: (description: string) => string;
  next: (description: string) => string;
  observe: (note: string) => string;
}

const META_COPY: Record<PistonOscillationLanguage, DemoMetaCopy> = {
  'zh-CN': {
    settingsDescription: '使用屏幕数字键盘依次输入 1000 Hz 和 120 kPa。',
    settingsTarget: '完成采样频率与下降触发阈值设置',
    settingsCriterion: '两个输入框分别显示 1000 和 120',
    settingsNote: '演示会先选择输入框，再用屏幕数字键盘逐位输入并确认。',
    adjustTarget: (height) => `将平衡高度调至 ${height} mm`,
    adjustCriterion: (height) => `刻度读数达到 ${height.toFixed(1)} mm，平台得到支撑`,
    adjustNote: '软管断开且螺钉松开时，平台必须始终由至少一只手支撑。',
    secureTitle: '固定高度并接回软管',
    secureTarget: (height) => `固定 ${height} mm 高度并恢复密封`,
    secureCriterion: '螺钉已锁紧、软管已接通',
    secureNote: '必须先固定高度，再接回压力传感器软管。',
    freeTarget: '释放活塞并建立稳定状态',
    freeCriterion: '螺钉已松开，活塞可自由振动',
    freeNote: '锁紧螺钉只用于调节高度，正式振动前必须松开。',
    startTarget: '启动压力采集',
    startCriterion: '采集状态显示“等待触发”',
    startNote: '触发前压力只用于监测，不写入正式曲线。',
    recordTitle: (run) => `第 ${run} 次：按压、释放并记录`,
    recordTarget: '产生并记录一次完整的压力振动',
    recordCriterion: '下降触发成功，正式记录达到 0.500 s',
    recordNote: '两只手全部释放后，活塞才开始回弹振动。',
    stopTarget: '停止并冻结当前曲线',
    stopCriterion: '采集状态显示“已停止 · 曲线冻结”',
    stopNote: '冻结后检查曲线，再决定保存或重做。',
    saveTarget: (run) => `保存第 ${run} 条正式曲线`,
    saveCriterion: '保存按钮给出确认反馈',
    saveNote: (run) => run < 3 ? '保存后进入下一次高度调节。' : '第三条曲线保存后，本次演示结束。',
    completedTitle: '活塞振动法演示完成',
    completedDescription: '80、70、60 mm 三次仪器操作与压力曲线采集均已演示完成。',
    completedTarget: '完成三组实验实操演示',
    completedCriterion: '三条正式曲线均已依次保存',
    completedNote: '演示模式到此结束；周期框选、拟合与计算由引导模式继续完成。',
    reconnectPreview: '用右手（鼠标左键）将软管接头拖入磁吸范围',
    resetDescription: '演示准备中，仪器与采集界面正在复位。',
    upcoming: (description) => `即将操作：${description}`,
    next: (description) => `下一步：${description}`,
    observe: (note) => `观察：${note}`,
  },
  'zh-TW': {
    settingsDescription: '使用螢幕數字鍵盤依序輸入 1000 Hz 與 120 kPa。',
    settingsTarget: '完成採樣頻率與下降觸發閾值設定',
    settingsCriterion: '兩個輸入框分別顯示 1000 與 120',
    settingsNote: '演示會先選擇輸入框，再用螢幕數字鍵盤逐位輸入並確認。',
    adjustTarget: (height) => `將平衡高度調至 ${height} mm`,
    adjustCriterion: (height) => `刻度讀數達到 ${height.toFixed(1)} mm，平台得到支撐`,
    adjustNote: '軟管斷開且螺釘鬆開時，平台必須始終由至少一隻手支撐。',
    secureTitle: '固定高度並接回軟管',
    secureTarget: (height) => `固定 ${height} mm 高度並恢復密封`,
    secureCriterion: '螺釘已鎖緊、軟管已接通',
    secureNote: '必須先固定高度，再接回壓力感測器軟管。',
    freeTarget: '釋放活塞並建立穩定狀態',
    freeCriterion: '螺釘已鬆開，活塞可自由振動',
    freeNote: '鎖緊螺釘只用於調節高度，正式振動前必須鬆開。',
    startTarget: '啟動壓力採集',
    startCriterion: '採集狀態顯示「等待觸發」',
    startNote: '觸發前壓力只用於監測，不寫入正式曲線。',
    recordTitle: (run) => `第 ${run} 次：按壓、釋放並記錄`,
    recordTarget: '產生並記錄一次完整的壓力振動',
    recordCriterion: '下降觸發成功，正式記錄達到 0.500 s',
    recordNote: '兩隻手全部鬆開後，活塞才開始回彈振動。',
    stopTarget: '停止並凍結目前曲線',
    stopCriterion: '採集狀態顯示「已停止 · 曲線凍結」',
    stopNote: '凍結後檢查曲線，再決定儲存或重做。',
    saveTarget: (run) => `儲存第 ${run} 條正式曲線`,
    saveCriterion: '儲存按鈕給出確認回饋',
    saveNote: (run) => run < 3 ? '儲存後進入下一次高度調節。' : '第三條曲線儲存後，本次演示結束。',
    completedTitle: '活塞振動法演示完成',
    completedDescription: '80、70、60 mm 三次儀器操作與壓力曲線採集均已演示完成。',
    completedTarget: '完成三組實驗實操演示',
    completedCriterion: '三條正式曲線均已依序儲存',
    completedNote: '演示模式到此結束；週期框選、擬合與計算由引導模式繼續完成。',
    reconnectPreview: '用右手（滑鼠左鍵）將軟管接頭拖入磁吸範圍',
    resetDescription: '演示準備中，儀器與採集介面正在復位。',
    upcoming: (description) => `即將操作：${description}`,
    next: (description) => `下一步：${description}`,
    observe: (note) => `觀察：${note}`,
  },
  en: {
    settingsDescription: 'Use the on-screen numeric keypad to enter 1000 Hz and then 120 kPa.',
    settingsTarget: 'Complete the sample-rate and falling-trigger settings',
    settingsCriterion: 'The two fields show 1000 and 120',
    settingsNote: 'The demo selects each field, enters every digit on the keypad, and confirms it.',
    adjustTarget: (height) => `Set the equilibrium height to ${height} mm`,
    adjustCriterion: (height) => `The scale reads ${height.toFixed(1)} mm and the platform is supported`,
    adjustNote: 'With the hose disconnected and screw loose, at least one hand must support the platform.',
    secureTitle: 'Secure the height and reconnect the hose',
    secureTarget: (height) => `Secure ${height} mm and restore the seal`,
    secureCriterion: 'The screw is locked and the hose is connected',
    secureNote: 'Secure the height before reconnecting the pressure-sensor hose.',
    freeTarget: 'Release the piston and establish a stable state',
    freeCriterion: 'The screw is loose and the piston is free to oscillate',
    freeNote: 'The locking screw is only for height adjustment and must be loose before recording.',
    startTarget: 'Start pressure acquisition',
    startCriterion: 'The acquisition state shows “Waiting for trigger”',
    startNote: 'Pre-trigger pressure is monitored but is not stored in the formal curve.',
    recordTitle: (run) => `Run ${run}: press, release, and record`,
    recordTarget: 'Generate and record one complete pressure oscillation',
    recordCriterion: 'The falling trigger fires and formal recording reaches 0.500 s',
    recordNote: 'The piston starts rebounding only after both hands are released.',
    stopTarget: 'Stop and freeze the current curve',
    stopCriterion: 'The acquisition state shows “Stopped · Curve frozen”',
    stopNote: 'Inspect the frozen curve before keeping or repeating it.',
    saveTarget: (run) => `Save formal curve ${run}`,
    saveCriterion: 'The save control shows confirmation feedback',
    saveNote: (run) => run < 3 ? 'The next height adjustment begins after saving.' : 'The demonstration ends after the third curve is saved.',
    completedTitle: 'Piston-oscillation demonstration complete',
    completedDescription: 'All three instrument-operation and pressure-acquisition runs at 80, 70, and 60 mm are complete.',
    completedTarget: 'Complete all three practical demonstration runs',
    completedCriterion: 'All three formal curves were saved in sequence',
    completedNote: 'Demo mode ends here; Guide mode continues with period selection, fitting, and calculation.',
    reconnectPreview: 'Use the right hand (left mouse button) to drag the hose connector into magnetic range',
    resetDescription: 'Preparing the demonstration and resetting the instrument and acquisition panels.',
    upcoming: (description) => `Upcoming action: ${description}`,
    next: (description) => `Next: ${description}`,
    observe: (note) => `Observe: ${note}`,
  },
};

const highlight = (control: SegmentControl, focusMode?: PistonOscillationDemoFocusMode): SegmentSpec => ({
  stage: 'highlight', control, durationMs: PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS, focusMode,
});
const action = (control: PistonOscillationDemoControl, durationMs: number, focusMode?: PistonOscillationDemoFocusMode): SegmentSpec => ({
  stage: 'action', control, durationMs, focusMode,
});
const preview = (focusMode?: PistonOscillationDemoFocusMode): SegmentSpec => ({
  stage: 'preview', control: null, durationMs: PISTON_OSCILLATION_DEMO_OBSERVE_MS,
  focusMode, previewDescription: 'reconnectHose',
});

const createRunSteps = (measurementIndex: number): StepDefinition[] => [
  { kind: 'adjustHeight', measurementIndex, focusMode: 'pistonFocus', segments: [highlight('platform'), action('platform', 3_300)] },
  { kind: 'secureAndReconnect', measurementIndex, focusMode: 'pistonFocus', segments: [
    highlight('mirrorOutline'), highlight('screw'), action('screw', 1_500), preview(),
    highlight('hose', 'overview'), highlight('hoseSnap', 'overview'), action('hose', 1_500, 'overview'),
  ] },
  { kind: 'restoreFreeMotion', measurementIndex, focusMode: 'pistonFocus', segments: [highlight('screw'), action('screw', 1_500)] },
  { kind: 'startAcquisition', measurementIndex, focusMode: 'pistonFocus', segments: [highlight('start'), action('start', 600)] },
  { kind: 'recordOscillation', measurementIndex, focusMode: 'pistonFocus', segments: [highlight('platform'), action('platform', 2_400)] },
  { kind: 'stopAcquisition', measurementIndex, focusMode: 'pistonFocus', segments: [highlight('stop'), action('stop', 700)] },
  { kind: 'saveRun', measurementIndex, focusMode: 'pistonFocus', segments: [highlight('retain'), action('retain', 600)] },
];

const STEP_DEFINITIONS: StepDefinition[] = [
  { kind: 'settings', measurementIndex: 0, focusMode: 'overview', segments: [highlight('settings'), action('settings', 3_600)] },
  ...PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.flatMap((_, measurementIndex): StepDefinition[] => [
    ...(measurementIndex === 0 ? [] : [
      { kind: 'settle', measurementIndex, focusMode: 'overview', segments: [action(null, 2_500)] },
      { kind: 'disconnect', measurementIndex, focusMode: 'overview', segments: [
        highlight('platform', 'pistonFocus'), highlight('hose', 'overview'), action('hose', 1_600, 'overview'),
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
      .map(({ control, focusMode, startsAtMs: start, endsAtMs: end }) => ({ control, focusMode, startsAtMs: start, endsAtMs: end }));
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
    case 'settle': return { title: guide.crossRunStabilizingTitle, description: guide.crossRunStabilizingDetail, target: meta.freeTarget, criterion: meta.freeCriterion, note: meta.adjustNote };
    case 'disconnect': return { title: guide.crossRunDisconnectTitle, description: guide.crossRunDisconnectDetail, target: guide.crossRunDisconnectTitle, criterion: shell.interaction.hoseDisconnected, note: meta.adjustNote };
    case 'adjustHeight': return { title: guide.adjustHeightTitle(height), description: guide.adjustHeightDetail(height), target: meta.adjustTarget(height), criterion: meta.adjustCriterion(height), note: meta.adjustNote };
    case 'secureAndReconnect': return { title: meta.secureTitle, description: `${guide.lockScrewDetail} ${guide.reconnectHoseDetail}`, target: meta.secureTarget(height), criterion: meta.secureCriterion, note: meta.secureNote };
    case 'restoreFreeMotion': return { title: guide.loosenScrewTitle, description: guide.loosenScrewDetail, target: meta.freeTarget, criterion: meta.freeCriterion, note: meta.freeNote };
    case 'startAcquisition': return { title: guide.startAcquisitionTitle, description: guide.startAcquisitionDetail, target: meta.startTarget, criterion: meta.startCriterion, note: meta.startNote };
    case 'recordOscillation': return { title: meta.recordTitle(run), description: `${guide.releasePistonDetail} ${guide.recordingDetail}`, target: meta.recordTarget, criterion: meta.recordCriterion, note: meta.recordNote };
    case 'stopAcquisition': return { title: guide.pauseRecordingTitle, description: guide.pauseRecordingDetail, target: meta.stopTarget, criterion: meta.stopCriterion, note: meta.stopNote };
    case 'saveRun': return { title: guide.saveCurveTitle(run), description: guide.saveCurveDetail(run), target: meta.saveTarget(run), criterion: meta.saveCriterion, note: meta.saveNote(run) };
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
    const connect = getActionWindow(index, 'secureAndReconnect', 'hose');
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
    const lock = getActionWindow(index, 'secureAndReconnect', 'screw');
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
    acquisitionStartAtMs: start.startsAtMs + 300,
    pressStartMs: oscillation.startsAtMs,
    pressEndMs: oscillation.startsAtMs + 800,
    releaseAtMs: oscillation.startsAtMs + 1_050,
    acquisitionStopAtMs: stop.startsAtMs + 350,
    retainAtMs: retain.startsAtMs + 300,
  };
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
    ?? (currentWindow.stepIndex < PISTON_OSCILLATION_DEMO_STEP_WINDOWS.length ? 'preview' : 'observe');
  const highlightControl = stage === 'highlight' ? currentSegment?.control ?? null : null;
  const activeControl = stage === 'action' ? currentSegment?.control ?? null : null;
  const presentationStepIndex = stage === 'preview' && !currentSegment
    ? Math.min(currentWindow.stepIndex + 1, PISTON_OSCILLATION_DEMO_STEP_WINDOWS.length)
    : currentWindow.stepIndex;
  const presentationWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS[presentationStepIndex - 1];
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
  const heightAction = getActionWindow(measurementIndex, 'adjustHeight', 'platform');
  const leftHandSupporting = (currentWindow.kind === 'adjustHeight'
    && elapsedMs >= heightAction.startsAtMs + (heightAction.endsAtMs - heightAction.startsAtMs) * 0.78)
    || (currentWindow.kind === 'secureAndReconnect' && lockingScrewProgress < 1)
    || currentWindow.kind === 'disconnect'
    || platformAction === 'press';
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
  const focusMode = reset ? 'overview' : currentSegment?.focusMode ?? latestSegment?.focusMode
    ?? STEP_DEFINITIONS[currentWindow.stepIndex - 1].focusMode;
  const completed = elapsedMs >= PISTON_OSCILLATION_DEMO_DURATION_MS;
  const meta = META_COPY[language];
  const step = completed ? {
    title: meta.completedTitle, description: meta.completedDescription,
    target: meta.completedTarget, criterion: meta.completedCriterion, note: meta.completedNote,
  } : getStepCopy(language, presentationWindow);
  const stepDescription = stage === 'reset' ? meta.resetDescription
    : stage === 'highlight' ? meta.upcoming(step.description)
      : stage === 'preview' ? meta.next(currentSegment?.previewDescription === 'reconnectHose' ? meta.reconnectPreview : step.description)
        : stage === 'observe' ? meta.observe(step.note) : step.description;
  const savedMeasurementCount = [0, 1, 2].reduce((count, index) => count + (elapsedMs >= getRunTiming(index).retainAtMs ? 1 : 0), 0);
  return {
    elapsedMs, focusMode, activeControl, highlightControl,
    highlightElapsedSeconds: stage === 'highlight' && currentSegment ? (elapsedMs - currentSegment.startsAtMs) / 1000 : 0,
    stage, stepIndex: presentationStepIndex, stepCount: PISTON_OSCILLATION_DEMO_STEP_WINDOWS.length,
    stepTitle: step.title, stepDescription, stepTarget: step.target,
    stepProgressCriterion: step.criterion, stepNote: step.note,
    measurementIndex, measurementCount: PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS,
    targetHeightMm, savedMeasurementCount, ...keyboard, ...hose,
    lockingScrewProgress, equilibriumHeightMm: getEquilibriumHeight(elapsedMs),
    platformAction, leftHandSupporting, pistonOffsetMm,
    acquisitionPhase, releaseElapsedSeconds, formalElapsedSeconds,
    retainFeedbackVisible: elapsedMs >= runTiming.retainAtMs,
    completed,
  };
};
