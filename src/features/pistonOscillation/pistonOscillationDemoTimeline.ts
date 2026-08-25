import {
  PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
  PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
  findPistonAcquisitionFallingTriggerSeconds,
} from './pistonOscillationPresetAcquisition.ts';
import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';

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
  sampleRateInput: string;
  triggerInput: string;
  hoseState: 'connected' | 'disconnected';
  hoseDragging: boolean;
  hoseGhostProgress: number;
  hoseWithinMagneticRange: boolean;
  lockingScrewProgress: number;
  equilibriumHeightMm: number;
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
export const PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS = 2;

type PistonOscillationDemoSegmentStage = 'highlight' | 'action' | 'preview';
type PistonOscillationDemoSegmentControl = Exclude<PistonOscillationDemoControl, null>;

interface PistonOscillationDemoSegmentSpec {
  stage: PistonOscillationDemoSegmentStage;
  control: PistonOscillationDemoControl;
  durationMs: number;
  focusMode?: PistonOscillationDemoFocusMode;
  previewDescription?: string;
}

interface PistonOscillationDemoStepMechanics {
  focusMode: PistonOscillationDemoFocusMode;
  segments: PistonOscillationDemoSegmentSpec[];
}

export interface PistonOscillationDemoSegmentWindow {
  stage: PistonOscillationDemoSegmentStage;
  control: PistonOscillationDemoControl;
  focusMode: PistonOscillationDemoFocusMode;
  startsAtMs: number;
  endsAtMs: number;
  previewDescription?: string;
}

export interface PistonOscillationDemoHighlightWindow {
  control: PistonOscillationDemoSegmentControl;
  focusMode: PistonOscillationDemoFocusMode;
  startsAtMs: number;
  endsAtMs: number;
}

export interface PistonOscillationDemoActionWindow {
  control: PistonOscillationDemoSegmentControl;
  focusMode: PistonOscillationDemoFocusMode;
  startsAtMs: number;
  endsAtMs: number;
}

export interface PistonOscillationDemoStepWindow {
  stepIndex: number;
  startsAtMs: number;
  actionStartsAtMs: number;
  actionEndsAtMs: number;
  endsAtMs: number;
  segments: PistonOscillationDemoSegmentWindow[];
  highlightWindows: PistonOscillationDemoHighlightWindow[];
  actionWindows: PistonOscillationDemoActionWindow[];
}

interface PistonOscillationDemoStepCopy {
  title: string;
  description: string;
  target: string;
  progressCriterion: string;
  note: string;
}

const highlight = (
  control: PistonOscillationDemoSegmentControl,
  focusMode?: PistonOscillationDemoFocusMode,
): PistonOscillationDemoSegmentSpec => ({
  stage: 'highlight',
  control,
  durationMs: PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS,
  focusMode,
});

const action = (
  control: PistonOscillationDemoSegmentControl,
  durationMs: number,
  focusMode?: PistonOscillationDemoFocusMode,
): PistonOscillationDemoSegmentSpec => ({
  stage: 'action',
  control,
  durationMs,
  focusMode,
});

const preview = (
  previewDescription: string,
  focusMode?: PistonOscillationDemoFocusMode,
): PistonOscillationDemoSegmentSpec => ({
  stage: 'preview',
  control: null,
  durationMs: PISTON_OSCILLATION_DEMO_OBSERVE_MS,
  focusMode,
  previewDescription,
});

const PISTON_OSCILLATION_DEMO_STEP_MECHANICS: PistonOscillationDemoStepMechanics[] = [
  {
    focusMode: 'overview',
    segments: [highlight('settings'), action('settings', 1_900)],
  },
  {
    focusMode: 'pistonFocus',
    segments: [highlight('platform'), action('platform', 3_300)],
  },
  {
    focusMode: 'pistonFocus',
    segments: [
      highlight('mirrorOutline'),
      highlight('screw'),
      action('screw', 1_500),
      preview('将软管接头拖入磁吸范围'),
      highlight('hose', 'overview'),
      highlight('hoseSnap', 'overview'),
      action('hose', 1_500, 'overview'),
    ],
  },
  {
    focusMode: 'pistonFocus',
    segments: [highlight('screw'), action('screw', 1_500)],
  },
  {
    focusMode: 'pistonFocus',
    segments: [highlight('start'), action('start', 600)],
  },
  {
    focusMode: 'pistonFocus',
    segments: [highlight('platform'), action('platform', 4_200)],
  },
  {
    focusMode: 'pistonFocus',
    segments: [highlight('stop'), action('stop', 700)],
  },
  {
    focusMode: 'pistonFocus',
    segments: [highlight('retain'), action('retain', 600)],
  },
];

const PISTON_OSCILLATION_DEMO_COPY: Record<PistonOscillationLanguage, {
  steps: PistonOscillationDemoStepCopy[];
  reconnectPreview: string;
  completedTitle: string;
  completedDescription: string;
  resetDescription: string;
  upcoming: (description: string) => string;
  next: (description: string) => string;
  observe: (note: string) => string;
}> = {
  'zh-CN': {
    reconnectPreview: '用右手（鼠标左键）将软管接头拖入磁吸范围',
    completedTitle: '单次演示完成',
    completedDescription: '已完成 80 mm 的单次实验演示。',
    resetDescription: '演示准备中，仪器与采集界面正在复位。',
    upcoming: (description) => `即将操作：${description}`,
    next: (description) => `下一步：${description}`,
    observe: (note) => `观察：${note}`,
    steps: [
      { title: '设置压力采集参数', description: '将采样频率填写为 1000 Hz，并将下降触发阈值填写为 105 kPa。', target: '完成采样频率与下降触发阈值设置', progressCriterion: '两个输入框分别显示 1000 和 105', note: '高采样率保留波形细节，压力下降越过阈值后才写入正式曲线。' },
      { title: '调节 80 mm 平衡高度', description: '软管保持断开；用右手（鼠标左键）向上拖动顶部平台至 80 mm，移开右手（鼠标左键）前先用左手（Space）托住。', target: '石墨活塞下沿对准 80 mm', progressCriterion: '平衡高度达到 80.0 mm，左手（Space）已托住', note: '软管断开、螺钉松开时，左手（Space）或右手（鼠标左键）必须有一只托住平台。' },
      { title: '固定高度并接回软管', description: '保持左手（Space）托住平台，用右手（鼠标左键）旋紧侧面锁紧螺钉，再用右手（鼠标左键）把软管接回仪器接口。', target: '固定 80 mm 高度并恢复密封', progressCriterion: '螺钉锁紧、软管接通', note: '先固定高度，再接回软管。' },
      { title: '恢复活塞自由状态', description: '用右手（鼠标左键）旋松侧面锁紧螺钉，等待活塞位置与压力基线稳定。', target: '释放活塞并建立稳定基线', progressCriterion: '螺钉松开、压力基线稳定', note: '密封恢复后，活塞应处于可自由振动状态。' },
      { title: '开始压力采集', description: '启动采集，软件持续监测绝对压强并等待下降触发。', target: '启动压力采集', progressCriterion: '采集状态进入等待触发', note: '触发前压力仅用于监测，不写入本次测量。' },
      { title: '按压、释放并记录振动', description: '让左手（Space）与右手（鼠标左键）全部就位后双手下压顶部平台，再将两只手全部松开。', target: '产生一次完整的衰减振动', progressCriterion: '双手释放后触发成功并形成振动曲线', note: '左手（Space）与右手（鼠标左键）全部释放后，活塞才开始回弹振动。' },
      { title: '停止压力采集', description: '曲线稳定后停止采集，冻结本次临时曲线。', target: '停止并冻结本次曲线', progressCriterion: '采集状态显示已停止', note: '停止后检查曲线质量，再决定保留或重做。' },
      { title: '演示保留操作', description: '点击保留按钮，示范确认本次曲线的操作。', target: '确认本次曲线', progressCriterion: '保留按钮给出确认反馈', note: '完成本次曲线确认后，即可进入下一次测量。' },
    ],
  },
  'zh-TW': {
    reconnectPreview: '用右手（滑鼠左鍵）將軟管接頭拖入磁吸範圍',
    completedTitle: '單次演示完成',
    completedDescription: '已完成 80 mm 的單次實驗演示。',
    resetDescription: '演示準備中，儀器與採集介面正在復位。',
    upcoming: (description) => `即將操作：${description}`,
    next: (description) => `下一步：${description}`,
    observe: (note) => `觀察：${note}`,
    steps: [
      { title: '設定壓力採集參數', description: '將採樣頻率填寫為 1000 Hz，並將下降觸發閾值填寫為 105 kPa。', target: '完成採樣頻率與下降觸發閾值設定', progressCriterion: '兩個輸入框分別顯示 1000 和 105', note: '高採樣率保留波形細節，壓力下降越過閾值後才寫入正式曲線。' },
      { title: '調節 80 mm 平衡高度', description: '軟管保持斷開；用右手（滑鼠左鍵）向上拖動頂部平台至 80 mm，移開右手（滑鼠左鍵）前先用左手（Space）托住。', target: '石墨活塞下沿對準 80 mm', progressCriterion: '平衡高度達到 80.0 mm，左手（Space）已托住', note: '軟管斷開、螺釘鬆開時，左手（Space）或右手（滑鼠左鍵）必須有一隻托住平台。' },
      { title: '固定高度並接回軟管', description: '保持左手（Space）托住平台，用右手（滑鼠左鍵）旋緊側面鎖緊螺釘，再用右手（滑鼠左鍵）把軟管接回儀器接口。', target: '固定 80 mm 高度並恢復密封', progressCriterion: '螺釘鎖緊、軟管接通', note: '先固定高度，再接回軟管。' },
      { title: '恢復活塞自由狀態', description: '用右手（滑鼠左鍵）旋鬆側面鎖緊螺釘，等待活塞位置與壓力基線穩定。', target: '釋放活塞並建立穩定基線', progressCriterion: '螺釘鬆開、壓力基線穩定', note: '密封恢復後，活塞應處於可自由振動狀態。' },
      { title: '開始壓力採集', description: '啟動採集，軟體持續監測絕對壓強並等待下降觸發。', target: '啟動壓力採集', progressCriterion: '採集狀態進入等待觸發', note: '觸發前壓力僅用於監測，不寫入本次測量。' },
      { title: '按壓、釋放並記錄振動', description: '讓左手（Space）與右手（滑鼠左鍵）全部就位後雙手下壓頂部平台，再將兩隻手全部鬆開。', target: '產生一次完整的衰減振動', progressCriterion: '雙手釋放後觸發成功並形成振動曲線', note: '左手（Space）與右手（滑鼠左鍵）全部釋放後，活塞才開始回彈振動。' },
      { title: '停止壓力採集', description: '曲線穩定後停止採集，凍結本次暫存曲線。', target: '停止並凍結本次曲線', progressCriterion: '採集狀態顯示已停止', note: '停止後檢查曲線品質，再決定保留或重做。' },
      { title: '演示保留操作', description: '點擊保留按鈕，示範確認本次曲線的操作。', target: '確認本次曲線', progressCriterion: '保留按鈕給出確認回饋', note: '完成本次曲線確認後，即可進入下一次測量。' },
    ],
  },
  en: {
    reconnectPreview: 'Use the right hand (left mouse button) to drag the hose connector into magnetic range',
    completedTitle: 'Single demonstration complete',
    completedDescription: 'The single 80 mm experiment demonstration is complete.',
    resetDescription: 'Preparing the demonstration and resetting the instrument and acquisition panels.',
    upcoming: (description) => `Upcoming action: ${description}`,
    next: (description) => `Next: ${description}`,
    observe: (note) => `Observe: ${note}`,
    steps: [
      { title: 'Set pressure acquisition parameters', description: 'Enter 1000 Hz for the sample rate and 105 kPa for the falling-edge trigger threshold.', target: 'Complete the sample-rate and trigger-threshold settings', progressCriterion: 'The two fields show 1000 and 105', note: 'The high sample rate preserves waveform detail; formal recording starts only after pressure crosses the threshold downward.' },
      { title: 'Set the 80 mm equilibrium height', description: 'Keep the hose disconnected. Use the right hand (left mouse button) to drag the top platform up to 80 mm. Before moving the right hand (left mouse button) away, support the platform with the left hand (Space).', target: 'Align the graphite piston lower edge with 80 mm', progressCriterion: 'The equilibrium height is 80.0 mm and the left hand (Space) is supporting', note: 'With the hose disconnected and screw loose, either the left hand (Space) or right hand (left mouse button) must support the platform.' },
      { title: 'Secure the height and reconnect the hose', description: 'Keep the left hand (Space) supporting the platform. Use the right hand (left mouse button) to tighten the side locking screw, then use the right hand (left mouse button) to reconnect the hose.', target: 'Secure the 80 mm height and restore the seal', progressCriterion: 'The screw is locked and the hose is connected', note: 'Secure the height before reconnecting the hose.' },
      { title: 'Restore free piston motion', description: 'Use the right hand (left mouse button) to loosen the side locking screw, then wait for the piston position and pressure baseline to stabilize.', target: 'Release the piston and establish a stable baseline', progressCriterion: 'The screw is loose and the pressure baseline is stable', note: 'After resealing, the piston should be free to oscillate.' },
      { title: 'Start pressure acquisition', description: 'Start acquisition so the software monitors absolute pressure and waits for a falling-edge trigger.', target: 'Start pressure acquisition', progressCriterion: 'Acquisition is waiting for the trigger', note: 'Pressure before the trigger is monitored but not stored in this measurement.' },
      { title: 'Press, release, and record oscillation', description: 'Put the left hand (Space) and right hand (left mouse button) in place, press the top platform with both hands, then release both hands.', target: 'Produce one complete damped oscillation', progressCriterion: 'Releasing both hands triggers and records the oscillation curve', note: 'The piston starts rebounding only after the left hand (Space) and right hand (left mouse button) are both released.' },
      { title: 'Stop pressure acquisition', description: 'After the curve stabilizes, stop acquisition to freeze the temporary curve.', target: 'Stop and freeze the current curve', progressCriterion: 'Acquisition shows the stopped state', note: 'Check curve quality before keeping or repeating the measurement.' },
      { title: 'Demonstrate keeping the run', description: 'Select the keep button to demonstrate confirmation of the current curve.', target: 'Confirm the current curve', progressCriterion: 'The keep button shows confirmation feedback', note: 'After confirming this curve, proceed to the next measurement.' },
    ],
  },
};

export const PISTON_OSCILLATION_DEMO_STEP_WINDOWS: PistonOscillationDemoStepWindow[] = (() => {
  let cursor = PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS;
  return PISTON_OSCILLATION_DEMO_STEP_MECHANICS.map((step, index) => {
    const startsAtMs = cursor;
    const segments = step.segments.map((segment): PistonOscillationDemoSegmentWindow => {
      const startsAtMs = cursor;
      cursor += segment.durationMs;
      return {
        stage: segment.stage,
        control: segment.control,
        focusMode: segment.focusMode ?? step.focusMode,
        startsAtMs,
        endsAtMs: cursor,
        previewDescription: segment.previewDescription,
      };
    });
    const highlightWindows = segments
      .filter((segment) => segment.stage === 'highlight')
      .map(({ control, focusMode, startsAtMs, endsAtMs }) => ({
        control: control as PistonOscillationDemoSegmentControl,
        focusMode,
        startsAtMs,
        endsAtMs,
      }));
    const actionWindows = segments
      .filter((segment) => segment.stage === 'action')
      .map(({ control, focusMode, startsAtMs, endsAtMs }) => ({
        control: control as PistonOscillationDemoSegmentControl,
        focusMode,
        startsAtMs,
        endsAtMs,
      }));
    const actionStartsAtMs = actionWindows[0]?.startsAtMs ?? cursor;
    const actionEndsAtMs = actionWindows.at(-1)?.endsAtMs ?? cursor;
    cursor += PISTON_OSCILLATION_DEMO_OBSERVE_MS;
    return {
      stepIndex: index + 1,
      startsAtMs,
      actionStartsAtMs,
      actionEndsAtMs,
      endsAtMs: cursor,
      segments,
      highlightWindows,
      actionWindows,
    };
  });
})();

export const PISTON_OSCILLATION_DEMO_DURATION_MS =
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS.at(-1)?.endsAtMs
  ?? PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const progressBetween = (elapsedMs: number, startMs: number, endMs: number) => (
  clamp01((elapsedMs - startMs) / Math.max(1, endMs - startMs))
);

const typeValue = (value: string, elapsedMs: number, startMs: number, endMs: number) => {
  if (elapsedMs < startMs) return '';
  const characterCount = Math.min(
    value.length,
    Math.max(1, Math.ceil(progressBetween(elapsedMs, startMs, endMs) * value.length)),
  );
  return value.slice(0, characterCount);
};

const getActionWindow = (
  stepIndex: number,
  control: PistonOscillationDemoSegmentControl,
) => PISTON_OSCILLATION_DEMO_STEP_WINDOWS[stepIndex - 1].actionWindows.find(
  (window) => window.control === control,
)!;

export const getPistonOscillationDemoFrame = (
  elapsedMsInput: number,
  language: PistonOscillationLanguage = 'zh-CN',
): PistonOscillationDemoFrame => {
  const copy = PISTON_OSCILLATION_DEMO_COPY[language];
  const elapsedMs = Math.min(
    PISTON_OSCILLATION_DEMO_DURATION_MS,
    Math.max(0, elapsedMsInput),
  );
  const currentWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS.find(
    (window) => elapsedMs < window.endsAtMs,
  ) ?? PISTON_OSCILLATION_DEMO_STEP_WINDOWS.at(-1)!;
  const currentSegment = currentWindow.segments.find(
    (segment) => elapsedMs >= segment.startsAtMs && elapsedMs < segment.endsAtMs,
  );
  const isInitialReset = elapsedMs < PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS;
  const stage: PistonOscillationDemoStage = isInitialReset
    ? 'reset'
    : currentSegment?.stage
      ?? (currentWindow.stepIndex < PISTON_OSCILLATION_DEMO_STEP_WINDOWS.length
        ? 'preview'
        : 'observe');
  const highlightControl: PistonOscillationDemoControl =
    stage === 'highlight' ? currentSegment?.control ?? null : null;
  const highlightElapsedSeconds = stage === 'highlight' && currentSegment
    ? (elapsedMs - currentSegment.startsAtMs) / 1000
    : 0;
  const activeControl: PistonOscillationDemoControl =
    stage === 'action' ? currentSegment?.control ?? null : null;
  const presentationStepIndex = stage === 'preview' && !currentSegment
    ? Math.min(currentWindow.stepIndex + 1, copy.steps.length)
    : currentWindow.stepIndex;

  const settingsAction = getActionWindow(1, 'settings');
  const heightAction = getActionWindow(2, 'platform');
  const sealScrewAction = getActionWindow(3, 'screw');
  const sealHoseAction = getActionWindow(3, 'hose');
  const releaseScrewAction = getActionWindow(4, 'screw');
  const acquisitionStartAction = getActionWindow(5, 'start');
  const oscillationAction = getActionWindow(6, 'platform');
  const acquisitionStopAction = getActionWindow(7, 'stop');
  const retainAction = getActionWindow(8, 'retain');

  const sampleRateInput = typeValue(
    String(PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ),
    elapsedMs,
    settingsAction.startsAtMs,
    settingsAction.endsAtMs,
  );
  const triggerInput = typeValue(
    String(PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA),
    elapsedMs,
    settingsAction.startsAtMs,
    settingsAction.endsAtMs,
  );
  const heightProgress = easeInOut(progressBetween(
    elapsedMs,
    heightAction.startsAtMs,
    heightAction.endsAtMs,
  ));
  const lockingProgress = easeInOut(progressBetween(
    elapsedMs,
    sealScrewAction.startsAtMs,
    sealScrewAction.endsAtMs,
  ));
  const releaseProgress = easeInOut(progressBetween(
    elapsedMs,
    releaseScrewAction.startsAtMs,
    releaseScrewAction.endsAtMs,
  ));
  const lockingScrewProgress = elapsedMs < releaseScrewAction.startsAtMs
    ? lockingProgress
    : 1 - releaseProgress;
  const hoseGhostProgress = easeInOut(progressBetween(
    elapsedMs,
    sealHoseAction.startsAtMs,
    sealHoseAction.endsAtMs,
  ));
  const hoseDragging = elapsedMs >= sealHoseAction.startsAtMs
    && elapsedMs < sealHoseAction.endsAtMs;
  const hoseState: PistonOscillationDemoFrame['hoseState'] =
    elapsedMs >= sealHoseAction.endsAtMs ? 'connected' : 'disconnected';
  const hoseWithinMagneticRange = hoseState === 'connected'
    || (hoseDragging && hoseGhostProgress >= 0.82);
  const acquisitionStartAtMs = acquisitionStartAction.startsAtMs + 300;
  const pressStartMs = oscillationAction.startsAtMs;
  const pressEndMs = pressStartMs + 1_000;
  const releaseAtMs = pressStartMs + 1_300;
  const acquisitionStopAtMs = acquisitionStopAction.startsAtMs + 350;
  const retainAtMs = retainAction.startsAtMs + 300;
  const releaseElapsedSeconds = elapsedMs < releaseAtMs
    ? null
    : (elapsedMs - releaseAtMs) / 1000;
  const triggerSeconds = findPistonAcquisitionFallingTriggerSeconds(
    PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
    PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
  ) ?? 0;
  const formalElapsedSeconds = releaseElapsedSeconds === null
    ? 0
    : Math.min(
      PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS,
      Math.max(0, releaseElapsedSeconds - triggerSeconds),
    );
  const acquisitionPhase: PistonOscillationDemoAcquisitionPhase =
    elapsedMs < acquisitionStartAtMs
      ? 'idle'
      : elapsedMs < releaseAtMs + triggerSeconds * 1000
        ? 'armed'
        : elapsedMs < acquisitionStopAtMs
          ? 'recording'
          : 'stopped';
  let pistonOffsetMm = 0;
  if (elapsedMs >= pressStartMs && elapsedMs < pressEndMs) {
    pistonOffsetMm = -12 * easeInOut(progressBetween(elapsedMs, pressStartMs, pressEndMs));
  } else if (elapsedMs >= pressEndMs && elapsedMs < releaseAtMs) {
    pistonOffsetMm = -12;
  } else if (releaseElapsedSeconds !== null && releaseElapsedSeconds < 0.8) {
    pistonOffsetMm = -12
      * Math.exp(-6.2 * releaseElapsedSeconds)
      * Math.cos(Math.PI * 2 * 7.5 * releaseElapsedSeconds);
  }

  const latestSegment = currentWindow.segments.slice().reverse().find(
    (segment) => elapsedMs >= segment.startsAtMs,
  );
  const focusMode: PistonOscillationDemoFocusMode = isInitialReset
    ? 'overview'
    : currentSegment?.focusMode
      ?? latestSegment?.focusMode
      ?? PISTON_OSCILLATION_DEMO_STEP_MECHANICS[currentWindow.stepIndex - 1].focusMode;
  const completed = elapsedMs >= PISTON_OSCILLATION_DEMO_DURATION_MS;
  const baseStep = copy.steps[presentationStepIndex - 1];
  const step = completed
    ? {
      ...baseStep,
      title: copy.completedTitle,
      description: copy.completedDescription,
    }
    : baseStep;
  const stepDescription = stage === 'reset'
    ? copy.resetDescription
    : stage === 'highlight'
      ? copy.upcoming(step.description)
      : stage === 'preview'
        ? copy.next(currentSegment?.previewDescription
          ? copy.reconnectPreview
          : step.description)
        : stage === 'observe'
          ? copy.observe(step.note)
          : step.description;
  return {
    elapsedMs,
    focusMode,
    activeControl,
    highlightControl,
    highlightElapsedSeconds,
    stage,
    stepIndex: presentationStepIndex,
    stepCount: copy.steps.length,
    stepTitle: step.title,
    stepDescription,
    stepTarget: step.target,
    stepProgressCriterion: step.progressCriterion,
    stepNote: step.note,
    sampleRateInput,
    triggerInput,
    hoseState,
    hoseDragging,
    hoseGhostProgress,
    hoseWithinMagneticRange,
    lockingScrewProgress,
    equilibriumHeightMm: 80 * heightProgress,
    pistonOffsetMm,
    acquisitionPhase,
    releaseElapsedSeconds,
    formalElapsedSeconds,
    retainFeedbackVisible: elapsedMs >= retainAtMs,
    completed,
  };
};
