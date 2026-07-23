import { MousePointer2, RotateCcw, Square, Wrench } from 'lucide-react';
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
  steps: GuideStepCopy[];
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
    steps: [
      { id: 'power-on', title: '打开电源', detail: '请先打开电源。' },
      { id: 'open-stopcock', title: '打开玻璃旋塞', detail: '打开玻璃旋塞，再进行压强差调零。' },
      { id: 'zero-pressure', title: '调整压力调零', detail: '转动压力调零旋钮，使压力显示回到零点。' },
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
    steps: [
      { id: 'power-on', title: '打開電源', detail: '請先打開電源。' },
      { id: 'open-stopcock', title: '打開玻璃旋塞', detail: '打開玻璃旋塞，再進行壓強差調零。' },
      { id: 'zero-pressure', title: '調整壓力調零', detail: '轉動壓力調零旋鈕，使壓力顯示回到零點。' },
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
    steps: [
      { id: 'power-on', title: 'Turn on power', detail: 'Turn on the instrument power first.' },
      { id: 'open-stopcock', title: 'Open stopcock', detail: 'Open the glass stopcock before pressure zeroing.' },
      { id: 'zero-pressure', title: 'Zero pressure', detail: 'Turn the zero knob until the pressure display returns to zero.' },
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
const modeActivatedAtMs = 500;
const stepCompletedAtMs = [1_360, 2_320, 3_460];
const cursorHiddenAtMs = 4_050;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
};

const getCursorState = (elapsedMs: number) => {
  if (elapsedMs >= cursorHiddenAtMs) {
    const finalPoint = cursorKeyframes[cursorKeyframes.length - 1];
    return { ...finalPoint, visible: false, clicking: false };
  }
  const nextIndex = cursorKeyframes.findIndex((frame) => frame.atMs >= elapsedMs);
  if (nextIndex <= 0) {
    const firstPoint = cursorKeyframes[0];
    return { ...firstPoint, visible: true, clicking: false };
  }
  const next = cursorKeyframes[nextIndex];
  const previous = cursorKeyframes[nextIndex - 1];
  const duration = Math.max(1, next.atMs - previous.atMs);
  const progress = ease((elapsedMs - previous.atMs) / duration);
  return {
    x: previous.x + (next.x - previous.x) * progress,
    y: previous.y + (next.y - previous.y) * progress,
    visible: true,
    clicking: clickTimesMs.some((time) => Math.abs(elapsedMs - time) <= 95),
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

const GuideModeControl = ({ copy, activated }: { copy: GuideDemoCopy; activated: boolean }) => (
  <div className="studio-panel-actions" aria-hidden="true">
    <div className="studio-heat-mode-control-row">
      <div className={`studio-heat-mode-control studio-heat-mode-control-${activated ? 'guide' : 'explore'} ${activated ? 'studio-heat-mode-control-expanded' : ''}`}>
        <div className="studio-heat-mode-segment studio-heat-mode-segment-demo">
          <button type="button" className="studio-heat-mode-button" tabIndex={-1}>{copy.modeDemo}</button>
          <div className="studio-heat-mode-actions" />
        </div>
        <div className={`studio-heat-mode-segment studio-heat-mode-segment-guide ${activated ? 'studio-heat-mode-segment-active' : ''}`}>
          <button type="button" className={`studio-heat-mode-button ${activated ? 'studio-heat-mode-button-active' : ''}`} tabIndex={-1}>{copy.modeGuide}</button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-guide">
            {activated ? (
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
  const cursor = getCursorState(displayElapsedMs);
  const focusedControlId = getFocusedControl(displayElapsedMs);
  const controlledFocusPulseTimeSeconds = controlled
    ? (getFocusedControlCueElapsedMs(displayElapsedMs) / 1_000) * 0.62
    : undefined;
  const powerOn = completedCount >= 1;
  const stopcockOpen = completedCount >= 2;
  const pressureZeroAdjusted = completedCount >= 3;
  const pressureReadoutMv = pressureZeroAdjusted ? 0 : 6.4;
  const checklist = useMemo(
    () => activated ? <GuideChecklist copy={copy} completedCount={completedCount} /> : null,
    [activated, completedCount, copy],
  );

  return (
    <div
      className="first-run-guide-native-demo"
      data-product-intro-modes-demo="true"
      data-product-intro-guide-native-preview="true"
      data-product-intro-modes-demo-paused={paused ? 'true' : 'false'}
      data-product-intro-modes-demo-models-ready={sceneReady ? 'true' : 'false'}
      data-product-intro-modes-demo-elapsed={Math.round(displayElapsedMs)}
      data-product-intro-modes-demo-controlled={controlled ? 'true' : 'false'}
    >
      <section
        className="studio-dock-panel studio-fixed-panel first-run-guide-native-panel"
        aria-label={`${copy.modeGuide} · ${copy.previewTitle}`}
      >
        <div className="studio-dock-header">
          <div>
            <span>{copy.previewTitle}</span>
            <small>{copy.previewSubtitle}</small>
          </div>
          <GuideModeControl copy={copy} activated={activated} />
        </div>
        <div className="studio-preview studio-preview-heat-capacity">
          <div className="studio-preview-stage studio-heat-preview-stage">
            <div className="studio-heat-preview-mount" data-heat-capacity-preview-mount="true">
              <HeatCapacityInstrumentScene
                sceneFileId="product-intro-guide-native-preview"
                experimentMode="guide"
                performanceMode="highPerformance"
                sceneTheme={theme}
                language={language}
                autoDemoActive={false}
                powerOn={powerOn}
                stopcockAngleDeg={stopcockOpen ? HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG : HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG}
                pressureZeroAdjusted={pressureZeroAdjusted}
                pressureZeroKnobAngle={pressureZeroAdjusted ? 90 : 0}
                pressureZeroTimelineDriven={false}
                pressureZeroTimelineMotionActive={false}
                pressureZeroOffset={pressureZeroAdjusted ? -6.4 : 0}
                pressureZeroDisplayText={pressureZeroAdjusted ? '0.000 mV' : '6.400 mV'}
                pressureSignalRawReadoutMv={6.4}
                pressureSignalReadoutMv={pressureReadoutMv}
                pressureGaugeDisplayValue={pressureZeroAdjusted ? 0 : guideBaseFile.pressureGaugeDisplayValue}
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
                guideRollbackAnimation={null}
                guideRollbackKey={0}
                focusResetKey={0}
                overlayTopRight={checklist}
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
          <strong>{copy.modeGuide}</strong>
          <span>{copy.modePurpose}</span>
        </div>
      ) : null}
    </div>
  );
};
