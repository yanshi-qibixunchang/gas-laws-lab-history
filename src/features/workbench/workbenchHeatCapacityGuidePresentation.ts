import { type GuideHeatCapacityStep } from '../heatCapacity/heatCapacityGuideStepModel.ts';
import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { type HeatCapacityGuideLessonStepId } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import { type HeatCapacityFocusMode } from './workbenchHeatCapacityUiCheckpoint.ts';

export interface HeatCapacityGuideChecklistStepDefinition {
  id: string;
  guideStep: GuideHeatCapacityStep;
  title: Record<WorkbenchLanguagePreference, string>;
}

export type HeatCapacityGuideLessonDialogState =
  | { kind: 'intro'; pageIndex: number }
  | { kind: 'step'; lessonId: HeatCapacityGuideLessonStepId };

export type HeatCapacityGuideLessonView = {
  key: string;
  title: string;
  body: string;
};

export const HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS: HeatCapacityGuideChecklistStepDefinition[] = [
  {
    id: 'power-on',
    guideStep: 'powerOnRequired',
    title: { 'zh-CN': '打开电源', 'zh-TW': '打開電源', en: 'Turn on power' },
  },
  {
    id: 'sensor-preheat',
    guideStep: 'preheatRequired',
    title: { 'zh-CN': '传感器预热', 'zh-TW': '感測器預熱', en: 'Sensor warm-up' },
  },
  {
    id: 'open-stopcock-zero',
    guideStep: 'openStopcockForZeroRequired',
    title: { 'zh-CN': '打开玻璃旋塞', 'zh-TW': '打開玻璃旋塞', en: 'Open stopcock' },
  },
  {
    id: 'zero-adjust',
    guideStep: 'zeroAdjustRequired',
    title: { 'zh-CN': '调整压力调零', 'zh-TW': '調整壓強調零', en: 'Zero pressure' },
  },
  {
    id: 'record-u0',
    guideStep: 'recordU0Required',
    title: { 'zh-CN': '记录 U₀', 'zh-TW': '記錄 U₀', en: 'Record U₀' },
  },
  {
    id: 'close-stopcock-before-pump',
    guideStep: 'closeStopcockRequired',
    title: { 'zh-CN': '关闭玻璃旋塞', 'zh-TW': '關閉玻璃旋塞', en: 'Close stopcock' },
  },
  {
    id: 'open-pump-valve',
    guideStep: 'openPumpValveRequired',
    title: { 'zh-CN': '打开打气阀门', 'zh-TW': '打開打氣閥門', en: 'Open pump valve' },
  },
  {
    id: 'pump',
    guideStep: 'pumpRequired',
    title: { 'zh-CN': '打气至 120 mV', 'zh-TW': '打氣至 120 mV', en: 'Pump to 120 mV' },
  },
  {
    id: 'close-pump-valve',
    guideStep: 'closePumpValveRequired',
    title: { 'zh-CN': '关闭打气阀门', 'zh-TW': '關閉打氣閥門', en: 'Close pump valve' },
  },
  {
    id: 'wait-u1',
    guideStep: 'stabilizeBeforeReleaseRequired',
    title: { 'zh-CN': '封闭等待 5 min', 'zh-TW': '封閉等待 5 min', en: 'Wait sealed 5 min' },
  },
  {
    id: 'record-u1',
    guideStep: 'recordU1Required',
    title: { 'zh-CN': '记录 U₁', 'zh-TW': '記錄 U₁', en: 'Record U₁' },
  },
  {
    id: 'open-release-stopcock',
    guideStep: 'openStopcockReleaseRequired',
    title: { 'zh-CN': '打开放气旋塞', 'zh-TW': '打開放氣旋塞', en: 'Open release stopcock' },
  },
  {
    id: 'close-release-stopcock',
    guideStep: 'closeStopcockAfterReleaseRequired',
    title: { 'zh-CN': '关闭放气旋塞', 'zh-TW': '關閉放氣旋塞', en: 'Close release stopcock' },
  },
  {
    id: 'wait-u2',
    guideStep: 'recoverRequired',
    title: { 'zh-CN': '回温等待 5 min', 'zh-TW': '回溫等待 5 min', en: 'Recover 5 min' },
  },
  {
    id: 'record-u2',
    guideStep: 'recordU2Required',
    title: { 'zh-CN': '记录 U₂', 'zh-TW': '記錄 U₂', en: 'Record U₂' },
  },
  {
    id: 'close-power',
    guideStep: 'closePowerRequired',
    title: { 'zh-CN': '关闭电源', 'zh-TW': '關閉電源', en: 'Turn off power' },
  },
];

export const HEAT_CAPACITY_GUIDE_LESSON_TRIGGER_BY_COMPLETED_STEP: Partial<Record<GuideHeatCapacityStep, HeatCapacityGuideLessonStepId>> = {
  openStopcockForZeroRequired: 'pressureZeroBaseline',
  closeStopcockRequired: 'sealedInitialState',
  pumpRequired: 'pressureTarget',
  stabilizeBeforeReleaseRequired: 'preReleaseStability',
  closeStopcockAfterReleaseRequired: 'quickReleaseState',
  recoverRequired: 'thermalRecovery',
};

export const getHeatCapacityGuideChecklistIndex = (step: GuideHeatCapacityStep): number => {
  const exactIndex = HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.findIndex((item) => item.guideStep === step);
  if (exactIndex >= 0) return exactIndex;
  if (step === 'completed') return HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1;
  return 0;
};

export type HeatCapacityGuideStrongDomCutout = {
  id: string;
  selector: string;
  padding?: number;
  rx?: number;
  optional?: boolean;
};

export type HeatCapacityGuideStrongTargetSpec = {
  id: string;
  focusMode: HeatCapacityFocusMode | null;
  sceneHoleIds: string[];
  domHoles?: HeatCapacityGuideStrongDomCutout[];
  reminderCopyKey?: 'guideStrongReminder' | 'guideStrongReminderPressureZero';
};

export const HEAT_CAPACITY_GUIDE_STRONG_TARGET_CONFIGS: Record<string, HeatCapacityGuideStrongTargetSpec> = {
  powerSwitch: {
    id: 'powerSwitch',
    focusMode: 'none',
    sceneHoleIds: ['powerSwitch'],
  },
  pressureZero: {
    id: 'pressureZero',
    focusMode: 'instrument',
    sceneHoleIds: ['pressureZero', 'instrumentDisplay'],
    reminderCopyKey: 'guideStrongReminderPressureZero',
  },
  pumpBulb: {
    id: 'pumpBulb',
    focusMode: 'pump',
    sceneHoleIds: ['pumpBulb', 'instrumentDisplay'],
  },
  pumpValve: {
    id: 'pumpValve',
    focusMode: 'bottle',
    sceneHoleIds: ['bottleControls'],
  },
  stopcock: {
    id: 'stopcock',
    focusMode: 'bottle',
    sceneHoleIds: ['bottleControls'],
  },
  instrumentPressureDisplay: {
    id: 'instrumentPressureDisplay',
    focusMode: 'instrument',
    sceneHoleIds: ['instrumentDisplay'],
  },
  instrumentTemperatureDisplay: {
    id: 'instrumentTemperatureDisplay',
    focusMode: 'instrument',
    sceneHoleIds: ['instrumentDisplay'],
  },
  recordU0: {
    id: 'recordU0',
    focusMode: 'instrument',
    sceneHoleIds: ['instrumentDisplay'],
    domHoles: [
      { id: 'recordButton', selector: '[data-heat-capacity-guided-record="u0"], [data-heat-capacity-free-record="u0"]', padding: 10, rx: 12 },
    ],
  },
  recordU1: {
    id: 'recordU1',
    focusMode: 'instrument',
    domHoles: [
      { id: 'recordButton', selector: '[data-heat-capacity-guided-record="u1"], [data-heat-capacity-free-record="u1"]', padding: 10, rx: 12 },
      { id: 'guideTimer', selector: '[data-heat-capacity-wait-timer="true"]', padding: 8, rx: 12, optional: true },
    ],
    sceneHoleIds: ['instrumentDisplay'],
  },
  recordU2: {
    id: 'recordU2',
    focusMode: 'instrument',
    domHoles: [
      { id: 'recordButton', selector: '[data-heat-capacity-guided-record="u2"], [data-heat-capacity-free-record="u2"]', padding: 10, rx: 12 },
      { id: 'guideTimer', selector: '[data-heat-capacity-wait-timer="true"]', padding: 8, rx: 12, optional: true },
    ],
    sceneHoleIds: ['instrumentDisplay'],
  },
};

export const HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK: HeatCapacityGuideStrongTargetSpec = {
  id: 'fallback',
  focusMode: null,
  sceneHoleIds: [],
};

export const getHeatCapacityGuideStrongTargetSpec = (controlId: string | null): HeatCapacityGuideStrongTargetSpec => (
  controlId ? HEAT_CAPACITY_GUIDE_STRONG_TARGET_CONFIGS[controlId] ?? HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK : HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK
);
