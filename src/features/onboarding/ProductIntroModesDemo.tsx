import { MousePointer2, Pause, RotateCcw, Square, Wrench } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE } from '../../domain/heatCapacity/heatCapacityHardSphereModel.ts';
import HeatCapacityInstrumentScene from '../heatCapacity/HeatCapacityInstrumentScene.tsx';
import { HEAT_CAPACITY_QUALITY_PROFILES } from '../heatCapacity/heatCapacityQualityProfiles.ts';
import {
  createDefaultHeatCapacityFile,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
} from '../workbench/workbenchState.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { PRODUCT_INTRO_MODES_DEMO_MS } from './productIntroCarouselModel.ts';

interface ProductIntroModesDemoProps {
  active: boolean;
  paused: boolean;
  reducedMotion: boolean;
  language: WorkbenchLanguagePreference;
  theme: 'dark' | 'light';
  onComplete: () => void;
  controlledElapsedMs?: number;
  surfaceOnly?: boolean;
  mode?: 'demo' | 'guide';
}

type GuideStepCopy = {
  id: string;
  title: string;
  detail: string;
};

type GuideDemoCopy = {
  previewTitle: string;
  previewSubtitle: string;
  modeDemo: string;
  modeGuide: string;
  modeFree: string;
  checklist: string;
  stepLabel: string;
  modePurpose: string;
  demoPurpose: string;
  demoRunning: string;
  demoTargetLabel: string;
  demoProgressLabel: string;
  demoObservationLabel: string;
  steps: GuideStepCopy[];
  demoSteps: Array<{
    id: string;
    title: string;
    detail: string;
    target: string;
    progress: string;
    observation: string;
  }>;
};

export const productIntroGuideDemoCopies: Record<WorkbenchLanguagePreference, GuideDemoCopy> = {
  'zh-CN': {
    previewTitle: '3D 预览',
    previewSubtitle: '实时分子视口',
    modeDemo: '演示模式',
    modeGuide: '引导模式',
    modeFree: '自由模式',
    checklist: '引导清单',
    stepLabel: '步骤',
    modePurpose: '按原生清单完成实际操作，每完成一步立即勾选。',
    demoPurpose: '系统自动执行实验步骤，集中观察仪器响应与数据变化。',
    demoRunning: '自动演示',
    demoTargetLabel: '目标控件',
    demoProgressLabel: '推进标准',
    demoObservationLabel: '观察要点',
    steps: [
      { id: 'power-on', title: '打开电源', detail: '请先打开电源。' },
      { id: 'open-stopcock', title: '打开玻璃旋塞', detail: '打开玻璃旋塞，再进行压强差调零。' },
      { id: 'zero-pressure', title: '调整压力调零', detail: '转动压力调零旋钮，使压力显示回到零点。' },
    ],
    demoSteps: [
      {
        id: 'power-on',
        title: '开启电源',
        detail: '打开电源，使温度与压强测量系统开始工作。',
        target: '电源开关',
        progress: '仪表亮起并显示读数。',
        observation: '观察仪表屏幕与电源状态。',
      },
      {
        id: 'open-stopcock',
        title: '打开玻璃旋塞',
        detail: '使气瓶与外界连通，准备进行压强差调零。',
        target: '玻璃旋塞',
        progress: '旋塞完全打开。',
        observation: '观察旋塞转动与气路状态。',
      },
      {
        id: 'zero-pressure',
        title: '压强差调零',
        detail: '自动旋转压力调零旋钮，使压强差回到零点。',
        target: '压力调零旋钮',
        progress: '压强差接近 0 mV。',
        observation: '观察旋钮、仪表示数同步变化。',
      },
    ],
  },
  'zh-TW': {
    previewTitle: '3D 預覽',
    previewSubtitle: '即時分子視口',
    modeDemo: '演示模式',
    modeGuide: '引導模式',
    modeFree: '自由模式',
    checklist: '引導清單',
    stepLabel: '步驟',
    modePurpose: '依照原生清單完成實際操作，每完成一步立即勾選。',
    demoPurpose: '系統自動執行實驗步驟，集中觀察儀器回應與資料變化。',
    demoRunning: '自動演示',
    demoTargetLabel: '目標控制項',
    demoProgressLabel: '推進標準',
    demoObservationLabel: '觀察要點',
    steps: [
      { id: 'power-on', title: '打開電源', detail: '請先打開電源。' },
      { id: 'open-stopcock', title: '打開玻璃旋塞', detail: '打開玻璃旋塞，再進行壓強差調零。' },
      { id: 'zero-pressure', title: '調整壓力調零', detail: '轉動壓力調零旋鈕，使壓力顯示回到零點。' },
    ],
    demoSteps: [
      {
        id: 'power-on',
        title: '開啟電源',
        detail: '打開電源，使溫度與壓強測量系統開始工作。',
        target: '電源開關',
        progress: '儀表亮起並顯示讀數。',
        observation: '觀察儀表螢幕與電源狀態。',
      },
      {
        id: 'open-stopcock',
        title: '打開玻璃旋塞',
        detail: '使氣瓶與外界連通，準備進行壓強差調零。',
        target: '玻璃旋塞',
        progress: '旋塞完全打開。',
        observation: '觀察旋塞轉動與氣路狀態。',
      },
      {
        id: 'zero-pressure',
        title: '壓強差調零',
        detail: '自動旋轉壓力調零旋鈕，使壓強差回到零點。',
        target: '壓力調零旋鈕',
        progress: '壓強差接近 0 mV。',
        observation: '觀察旋鈕、儀表示數同步變化。',
      },
    ],
  },
  en: {
    previewTitle: '3D Preview',
    previewSubtitle: 'Realtime molecular viewport',
    modeDemo: 'Demo mode',
    modeGuide: 'Guide mode',
    modeFree: 'Free mode',
    checklist: 'Guide checklist',
    stepLabel: 'Step',
    modePurpose: 'Follow the native checklist and mark each hands-on step complete.',
    demoPurpose: 'Watch the system run the experiment while instrument responses and data change.',
    demoRunning: 'Auto demo',
    demoTargetLabel: 'Target',
    demoProgressLabel: 'Progress',
    demoObservationLabel: 'Observe',
    steps: [
      { id: 'power-on', title: 'Turn on power', detail: 'Turn on the instrument power first.' },
      { id: 'open-stopcock', title: 'Open stopcock', detail: 'Open the glass stopcock before pressure zeroing.' },
      { id: 'zero-pressure', title: 'Zero pressure', detail: 'Turn the zero knob until the pressure display returns to zero.' },
    ],
    demoSteps: [
      {
        id: 'power-on',
        title: 'Turn on power',
        detail: 'Power the temperature and pressure measurement system.',
        target: 'Power switch',
        progress: 'The instrument display turns on.',
        observation: 'Watch the display and power state.',
      },
      {
        id: 'open-stopcock',
        title: 'Open stopcock',
        detail: 'Connect the vessel to ambient pressure before zeroing.',
        target: 'Glass stopcock',
        progress: 'The stopcock reaches its open position.',
        observation: 'Watch the stopcock and gas path.',
      },
      {
        id: 'zero-pressure',
        title: 'Zero pressure',
        detail: 'Automatically turn the zero knob until the pressure difference returns to zero.',
        target: 'Pressure-zero knob',
        progress: 'Pressure difference approaches 0 mV.',
        observation: 'Watch the knob and readout change together.',
      },
    ],
  },
};

type CursorKeyframe = {
  atMs: number;
  x: number;
  y: number;
};

const cursorKeyframes: CursorKeyframe[] = [
  { atMs: 0, x: 58, y: 52 },
  { atMs: 260, x: 72.5, y: 5.1 },
  { atMs: 510, x: 72.5, y: 5.1 },
  { atMs: 1_100, x: 72.5, y: 72 },
  { atMs: 1_310, x: 72.5, y: 72 },
  { atMs: 2_050, x: 31.5, y: 30 },
  { atMs: 2_270, x: 31.5, y: 30 },
  { atMs: 3_150, x: 69, y: 68 },
  { atMs: 3_390, x: 69, y: 68 },
  { atMs: 3_820, x: 76, y: 76 },
];

const clickTimesMs = [410, 1_210, 2_160, 3_280];
const demoCursorKeyframes: CursorKeyframe[] = [
  { atMs: 0, x: 58, y: 52 },
  { atMs: 260, x: 61.5, y: 5.1 },
  { atMs: 540, x: 61.5, y: 5.1 },
];
const demoClickTimesMs = [410];
const modeActivatedAtMs = 500;
const stepCompletedAtMs = [1_360, 2_320, 3_460];
const cursorHiddenAtMs = 4_050;
const demoCursorHiddenAtMs = 650;
const demoStepStartTimesMs = [560, 1_700, 3_100];
const demoPowerOnAtMs = 1_300;
const demoStopcockMotionStartMs = 2_150;
const demoStopcockMotionEndMs = 2_800;
const demoPressureZeroMotionStartMs = 3_550;
const demoPressureZeroMotionEndMs = 4_550;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
};

const getCursorState = (elapsedMs: number, mode: 'demo' | 'guide') => {
  const keyframes = mode === 'demo' ? demoCursorKeyframes : cursorKeyframes;
  const hiddenAtMs = mode === 'demo' ? demoCursorHiddenAtMs : cursorHiddenAtMs;
  const clickTimes = mode === 'demo' ? demoClickTimesMs : clickTimesMs;
  if (elapsedMs >= hiddenAtMs) {
    const finalPoint = keyframes[keyframes.length - 1];
    return { ...finalPoint, visible: false, clicking: false };
  }
  const nextIndex = keyframes.findIndex((frame) => frame.atMs >= elapsedMs);
  if (nextIndex <= 0) {
    if (nextIndex === -1) {
      const finalPoint = keyframes[keyframes.length - 1];
      return { ...finalPoint, visible: true, clicking: false };
    }
    const firstPoint = keyframes[0];
    return { ...firstPoint, visible: true, clicking: false };
  }
  const next = keyframes[nextIndex];
  const previous = keyframes[nextIndex - 1];
  const duration = Math.max(1, next.atMs - previous.atMs);
  const progress = ease((elapsedMs - previous.atMs) / duration);
  return {
    x: previous.x + (next.x - previous.x) * progress,
    y: previous.y + (next.y - previous.y) * progress,
    visible: true,
    clicking: clickTimes.some((time) => Math.abs(elapsedMs - time) <= 95),
  };
};

const getCompletedStepCount = (elapsedMs: number) => (
  stepCompletedAtMs.filter((time) => elapsedMs >= time).length
);

const getFocusedControl = (elapsedMs: number) => {
  if (elapsedMs >= 820 && elapsedMs < 1_430) return 'powerSwitch';
  if (elapsedMs >= 1_720 && elapsedMs < 2_410) return 'stopcock';
  if (elapsedMs >= 2_780 && elapsedMs < 3_560) return 'pressureZero';
  return null;
};

const getFocusedControlCueElapsedMs = (elapsedMs: number) => {
  if (elapsedMs >= 820 && elapsedMs < 1_430) return elapsedMs - 820;
  if (elapsedMs >= 1_720 && elapsedMs < 2_410) return elapsedMs - 1_720;
  if (elapsedMs >= 2_780 && elapsedMs < 3_560) return elapsedMs - 2_780;
  return 0;
};

const getDemoStepIndex = (elapsedMs: number) => {
  if (elapsedMs < demoStepStartTimesMs[1]) return 0;
  if (elapsedMs < demoStepStartTimesMs[2]) return 1;
  return 2;
};

const getDemoFocusedControl = (elapsedMs: number) => {
  if (elapsedMs >= 650 && elapsedMs < 1_650) return 'powerSwitch';
  if (elapsedMs >= 1_750 && elapsedMs < 3_050) return 'stopcock';
  if (elapsedMs >= 3_150 && elapsedMs < 5_000) return 'pressureZero';
  return null;
};

const getDemoFocusedControlCueElapsedMs = (elapsedMs: number) => {
  if (elapsedMs >= 650 && elapsedMs < 1_650) return elapsedMs - 650;
  if (elapsedMs >= 1_750 && elapsedMs < 3_050) return elapsedMs - 1_750;
  if (elapsedMs >= 3_150 && elapsedMs < 5_000) return elapsedMs - 3_150;
  return 0;
};

const getDemoCameraFocusState = (elapsedMs: number): {
  mode: 'instrument' | 'bottle' | null;
  key: number;
} => {
  if (elapsedMs < demoStepStartTimesMs[0]) return { mode: null, key: 0 };
  if (elapsedMs < demoStepStartTimesMs[1]) return { mode: 'instrument', key: 1 };
  if (elapsedMs < demoStepStartTimesMs[2]) return { mode: 'bottle', key: 2 };
  return { mode: 'instrument', key: 3 };
};

const getMotionProgress = (elapsedMs: number, startMs: number, endMs: number) => (
  ease((elapsedMs - startMs) / Math.max(1, endMs - startMs))
);

const guideBaseFile = createDefaultHeatCapacityFile(901);
const guideQualityProfile = HEAT_CAPACITY_QUALITY_PROFILES.highPerformance;

const GuideChecklist = ({ copy, completedCount }: { copy: GuideDemoCopy; completedCount: number }) => {
  const currentIndex = Math.min(copy.steps.length - 1, completedCount);
  const currentStep = copy.steps[currentIndex];
  const baseOffset = 42 - currentIndex * 48;
  const trackStyle = {
    '--studio-heat-guide-step-base-offset': `${baseOffset}px`,
    '--studio-heat-guide-step-visual-offset': '0px',
  } as CSSProperties;

  return (
    <section
      className="studio-heat-guide-step-panel first-run-guide-native-checklist"
      data-heat-capacity-guide-step-panel="true"
      aria-label={copy.checklist}
    >
      <div className="studio-heat-guide-step-header">
        <span>{copy.checklist}</span>
        <em>{copy.stepLabel} {Math.min(completedCount + 1, copy.steps.length)} / {copy.steps.length}</em>
        <strong>{currentStep.title}</strong>
      </div>
      <div className="studio-heat-guide-step-list" data-heat-capacity-guide-step-list="true">
        <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-top" aria-hidden="true" />
        <div className="studio-heat-guide-step-center-rail" aria-hidden="true" />
        <div className="studio-heat-guide-step-track studio-heat-guide-step-track-snapping" style={trackStyle}>
          {copy.steps.map((step, index) => {
            const done = index < completedCount || completedCount >= copy.steps.length;
            const centered = index === currentIndex;
            const status = done ? 'done' : centered ? 'current' : 'pending';
            return (
              <div
                key={step.id}
                className={`studio-heat-guide-step-row studio-heat-guide-step-row-${status} ${centered ? 'studio-heat-guide-step-row-centered' : ''}`}
                data-heat-capacity-guide-step-row={step.id}
                data-heat-capacity-guide-step-status={status}
                data-heat-capacity-guide-step-centered={centered ? 'true' : 'false'}
                style={{
                  '--studio-heat-guide-step-distance': Math.abs(index - currentIndex),
                  '--studio-heat-guide-step-signed-distance': index - currentIndex,
                } as CSSProperties}
              >
                <span className="studio-heat-guide-step-marker" aria-hidden="true"><i /></span>
                <span className="studio-heat-guide-step-text">
                  <strong>{step.title}</strong>
                  <em>{step.detail}</em>
                </span>
              </div>
            );
          })}
        </div>
        <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-bottom" aria-hidden="true" />
      </div>
    </section>
  );
};

const DemoStepPanel = ({ copy, stepIndex }: { copy: GuideDemoCopy; stepIndex: number }) => {
  const step = copy.demoSteps[Math.min(copy.demoSteps.length - 1, Math.max(0, stepIndex))];
  return (
    <div
      className="studio-heat-demo-step-panel studio-heat-demo-step-panel-visible first-run-demo-native-step-panel"
      data-heat-capacity-demo-step-panel="true"
    >
      <div className="studio-heat-demo-step-kicker">
        <span>Step {stepIndex + 1} / {copy.demoSteps.length}</span>
        <i>{copy.demoRunning}</i>
      </div>
      <strong>{step.title}</strong>
      <p>{step.detail}</p>
      <div><span>{copy.demoTargetLabel}</span><em>{step.target}</em></div>
      <div><span>{copy.demoProgressLabel}</span><em>{step.progress}</em></div>
      <div><span>{copy.demoObservationLabel}</span><em>{step.observation}</em></div>
    </div>
  );
};

const ModeControl = ({
  copy,
  activated,
  mode,
}: {
  copy: GuideDemoCopy;
  activated: boolean;
  mode: 'demo' | 'guide';
}) => (
  <div className="studio-panel-actions" aria-hidden="true">
    <div className="studio-heat-mode-control-row">
      <div className={`studio-heat-mode-control studio-heat-mode-control-${activated ? mode : 'explore'} ${activated ? 'studio-heat-mode-control-expanded' : ''}`}>
        <div className={`studio-heat-mode-segment studio-heat-mode-segment-demo ${activated && mode === 'demo' ? 'studio-heat-mode-segment-active' : ''}`}>
          <button type="button" className={`studio-heat-mode-button ${activated && mode === 'demo' ? 'studio-heat-mode-button-active' : ''}`} tabIndex={-1}>{copy.modeDemo}</button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-demo">
            {activated && mode === 'demo' ? (
              <>
                <button type="button" className="studio-heat-mode-action studio-heat-mode-action-icon" tabIndex={-1}><Pause size={12} strokeWidth={2.8} /></button>
                <button type="button" className="studio-heat-mode-action studio-heat-mode-action-icon" tabIndex={-1}><Square size={12} strokeWidth={2.8} /></button>
              </>
            ) : null}
          </div>
        </div>
        <div className={`studio-heat-mode-segment studio-heat-mode-segment-guide ${activated && mode === 'guide' ? 'studio-heat-mode-segment-active' : ''}`}>
          <button type="button" className={`studio-heat-mode-button ${activated && mode === 'guide' ? 'studio-heat-mode-button-active' : ''}`} tabIndex={-1}>{copy.modeGuide}</button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-guide">
            {activated && mode === 'guide' ? (
              <>
                <button type="button" className="studio-heat-mode-action studio-heat-mode-action-icon" tabIndex={-1}><Square size={12} strokeWidth={2.8} /></button>
                <button type="button" className="studio-heat-mode-action studio-heat-mode-action-icon" tabIndex={-1}><RotateCcw size={13} strokeWidth={2.7} /></button>
              </>
            ) : null}
          </div>
        </div>
        <div className="studio-heat-mode-segment studio-heat-mode-segment-free">
          <button type="button" className="studio-heat-mode-button" tabIndex={-1}>{copy.modeFree}</button>
          <div className="studio-heat-mode-actions" />
        </div>
      </div>
      <button type="button" className="studio-heat-guide-lesson-button" tabIndex={-1}><Wrench size={18} strokeWidth={2.1} /></button>
    </div>
  </div>
);

export const ProductIntroModesDemo = ({
  active,
  paused,
  reducedMotion,
  language,
  theme,
  onComplete,
  controlledElapsedMs,
  surfaceOnly = false,
  mode = 'guide',
}: ProductIntroModesDemoProps) => {
  const copy = productIntroGuideDemoCopies[language];
  const controlled = controlledElapsedMs !== undefined;
  const initialElapsed = controlled
    ? controlledElapsedMs
    : reducedMotion
      ? PRODUCT_INTRO_MODES_DEMO_MS
      : 0;
  const [elapsedMs, setElapsedMs] = useState(initialElapsed);
  const [sceneReady, setSceneReady] = useState(false);
  const elapsedRef = useRef(initialElapsed);
  const completionNotifiedRef = useRef(false);

  const notifyComplete = useCallback(() => {
    if (completionNotifiedRef.current) return;
    completionNotifiedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!controlled && reducedMotion) {
      elapsedRef.current = PRODUCT_INTRO_MODES_DEMO_MS;
      setElapsedMs(PRODUCT_INTRO_MODES_DEMO_MS);
    }
  }, [controlled, reducedMotion]);

  useEffect(() => {
    if (controlled || !active || paused || reducedMotion || !sceneReady) return undefined;
    const startedAt = performance.now();
    const startingElapsed = elapsedRef.current;
    const update = () => {
      elapsedRef.current = Math.min(
        PRODUCT_INTRO_MODES_DEMO_MS,
        startingElapsed + performance.now() - startedAt,
      );
      setElapsedMs(elapsedRef.current);
      if (elapsedRef.current >= PRODUCT_INTRO_MODES_DEMO_MS) notifyComplete();
    };
    update();
    const intervalId = window.setInterval(update, 32);
    return () => {
      window.clearInterval(intervalId);
      elapsedRef.current = Math.min(
        PRODUCT_INTRO_MODES_DEMO_MS,
        startingElapsed + performance.now() - startedAt,
      );
    };
  }, [active, controlled, notifyComplete, paused, reducedMotion, sceneReady]);

  const displayElapsedMs = controlled
    ? Math.min(PRODUCT_INTRO_MODES_DEMO_MS, Math.max(0, controlledElapsedMs))
    : reducedMotion
      ? PRODUCT_INTRO_MODES_DEMO_MS
      : elapsedMs;
  const activated = displayElapsedMs >= modeActivatedAtMs;
  const completedCount = getCompletedStepCount(displayElapsedMs);
  const demoStepIndex = getDemoStepIndex(displayElapsedMs);
  const demoCameraFocusState = getDemoCameraFocusState(displayElapsedMs);
  const cursor = getCursorState(displayElapsedMs, mode);
  const focusedControlId = mode === 'demo'
    ? getDemoFocusedControl(displayElapsedMs)
    : getFocusedControl(displayElapsedMs);
  const focusCueElapsedMs = mode === 'demo'
    ? getDemoFocusedControlCueElapsedMs(displayElapsedMs)
    : getFocusedControlCueElapsedMs(displayElapsedMs);
  const controlledFocusPulseTimeSeconds = controlled
    ? (focusCueElapsedMs / 1_000) * 0.62
    : undefined;
  const demoStopcockProgress = getMotionProgress(
    displayElapsedMs,
    demoStopcockMotionStartMs,
    demoStopcockMotionEndMs,
  );
  const demoPressureZeroProgress = getMotionProgress(
    displayElapsedMs,
    demoPressureZeroMotionStartMs,
    demoPressureZeroMotionEndMs,
  );
  const powerOn = mode === 'demo' ? displayElapsedMs >= demoPowerOnAtMs : completedCount >= 1;
  const stopcockProgress = mode === 'demo' ? demoStopcockProgress : completedCount >= 2 ? 1 : 0;
  const pressureZeroProgress = mode === 'demo' ? demoPressureZeroProgress : completedCount >= 3 ? 1 : 0;
  const pressureZeroAdjusted = pressureZeroProgress >= 0.999;
  const pressureReadoutMv = 6.4 * (1 - pressureZeroProgress);
  const checklist = useMemo(
    () => activated && mode === 'guide'
      ? <GuideChecklist copy={copy} completedCount={completedCount} />
      : null,
    [activated, completedCount, copy, mode],
  );
  const demoPanel = useMemo(
    () => activated && mode === 'demo'
      ? <DemoStepPanel copy={copy} stepIndex={demoStepIndex} />
      : null,
    [activated, copy, demoStepIndex, mode],
  );

  return (
    <div
      className="first-run-guide-native-demo"
      data-product-intro-modes-demo="true"
      data-product-intro-mode={mode}
      data-product-intro-guide-native-preview="true"
      data-product-intro-modes-demo-paused={paused ? 'true' : 'false'}
      data-product-intro-modes-demo-models-ready={sceneReady ? 'true' : 'false'}
      data-product-intro-modes-demo-elapsed={Math.round(displayElapsedMs)}
      data-product-intro-modes-demo-controlled={controlled ? 'true' : 'false'}
    >
      <section
        className="studio-dock-panel studio-fixed-panel first-run-guide-native-panel"
        aria-label={`${mode === 'demo' ? copy.modeDemo : copy.modeGuide} · ${copy.previewTitle}`}
      >
        <div className="studio-dock-header">
          <div>
            <span>{copy.previewTitle}</span>
            <small>{copy.previewSubtitle}</small>
          </div>
          <ModeControl copy={copy} activated={activated} mode={mode} />
        </div>
        <div className="studio-preview studio-preview-heat-capacity">
          <div className="studio-preview-stage studio-heat-preview-stage">
            <div className="studio-heat-preview-mount" data-heat-capacity-preview-mount="true">
              <HeatCapacityInstrumentScene
                sceneFileId={`product-intro-${mode}-native-preview`}
                experimentMode={mode}
                performanceMode="highPerformance"
                sceneTheme={theme}
                language={language}
                autoDemoActive={mode === 'demo' && activated}
                powerOn={powerOn}
                stopcockAngleDeg={HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG + (
                  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG - HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG
                ) * stopcockProgress}
                pressureZeroAdjusted={pressureZeroAdjusted}
                pressureZeroKnobAngle={90 * pressureZeroProgress}
                pressureZeroTimelineDriven={mode === 'demo' && pressureZeroProgress > 0}
                pressureZeroTimelineMotionActive={mode === 'demo' && pressureZeroProgress > 0 && pressureZeroProgress < 1}
                pressureZeroOffset={-6.4 * pressureZeroProgress}
                pressureZeroDisplayText={`${pressureReadoutMv.toFixed(3)} mV`}
                pressureSignalRawReadoutMv={6.4}
                pressureSignalReadoutMv={pressureReadoutMv}
                pressureGaugeDisplayValue={guideBaseFile.pressureGaugeDisplayValue * (1 - pressureZeroProgress)}
                gaugePressureMinKPa={guideBaseFile.gaugePressureMinKPa}
                gaugePressureMaxKPa={guideBaseFile.gaugePressureMaxKPa}
                pressureSafetyThresholdKPa={guideBaseFile.pressureSafetyThresholdKPa}
                pressureOverLimit={false}
                pressureZeroAdjustMode="none"
                pressureKPa={powerOn ? 0 : null}
                pressureDeltaKPa={0}
                gasAmountRatio={1}
                gasTemperatureK={guideBaseFile.gasTemperatureK}
                ambientTemperatureK={guideBaseFile.ambientTemperatureK}
                pressureLimitKPa={guideBaseFile.pressureLimitKPa}
                pumpValveOpen={false}
                pumpValveState="closed"
                pumpBulbState="idle"
                pumpPulseId={0}
                recordPulseId={0}
                pumpFrequency={0}
                pumpFrequencyStatus="idle"
                pumpHint=""
                vesselPressureReadoutKPa={guideBaseFile.vesselPressureReadoutKPa}
                vesselTemperatureReadoutK={guideBaseFile.vesselTemperatureReadoutK}
                phase={powerOn ? 'ready' : 'powerOff'}
                temperatureSignalMv={powerOn ? guideBaseFile.temperatureSignalTargetMv : null}
                pressureSignalMv={powerOn ? pressureReadoutMv : null}
                pressureReleaseBurstActive={false}
                releaseFlowActive={false}
                releaseAudioPathOpen={false}
                releaseTimeline={HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE}
                pumpFlowActive={false}
                pumpFlowIntensity={0}
                hardSphereViewEnabled={false}
                hardSphereViewLocked
                particleMultiplier={guideQualityProfile.particleMultiplier}
                speedMultiplier={guideQualityProfile.speedMultiplier}
                hardSphereVisualResetKey={0}
                hardSpherePaused={controlled ? false : paused || !active}
                interactionLocked
                cameraInteractionLocked
                demoFocusControlId={focusedControlId}
                demoFocusPulseActive={focusedControlId !== null}
                demoFocusPulseTimeSeconds={controlledFocusPulseTimeSeconds}
                demoCameraFocusMode={mode === 'demo' ? demoCameraFocusState.mode : null}
                demoCameraFocusKey={mode === 'demo' ? demoCameraFocusState.key : 0}
                guideRollbackAnimation={null}
                guideRollbackKey={0}
                focusResetKey={0}
                overlayTopRight={mode === 'demo' ? demoPanel : checklist}
                onFocusModeChange={() => undefined}
                onLockedInteraction={() => undefined}
                onPowerToggle={() => undefined}
                onStopcockOpenChange={() => undefined}
                onPressureZeroFineAdjust={() => true}
                onPressureZeroCoarseAdjust={() => true}
                onPumpValveToggle={() => undefined}
                onPumpBulbPress={() => undefined}
                onHardSphereViewToggle={() => undefined}
                onSceneReady={() => setSceneReady(true)}
              />
            </div>
          </div>
        </div>
        {!reducedMotion && cursor.visible ? (
          <div
            className={`first-run-guide-native-cursor ${cursor.clicking ? 'is-clicking' : ''}`}
            style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
            aria-hidden="true"
          >
            <span className="first-run-guide-native-click-ring" />
            <MousePointer2 size={18} strokeWidth={1.8} fill="currentColor" />
          </div>
        ) : null}
      </section>
      {!surfaceOnly ? (
        <div className="first-run-guide-native-caption">
          <strong>{mode === 'demo' ? copy.modeDemo : copy.modeGuide}</strong>
          <span>{mode === 'demo' ? copy.demoPurpose : copy.modePurpose}</span>
        </div>
      ) : null}
    </div>
  );
};
