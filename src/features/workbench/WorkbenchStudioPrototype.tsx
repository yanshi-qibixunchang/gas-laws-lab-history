import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus2,
  FileArchive,
  FileText,
  FlaskConical,
  Folder,
  FolderOpen,
  Gauge,
  Info,
  Languages,
  Loader2,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  PanelLeft,
  PanelTopOpen,
  Pause,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  Square,
  Settings,
  Table2,
  Trash2,
  Undo2,
  Wrench,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import type { ExperimentRelation, HistogramBin, IdealGasExperimentPoint, Particle, SimulationParams, SimulationStats } from '../../shared/types';
import { PhysicsEngine, type PhysicsEngineSnapshotV1 } from '../../domain/hardSphere/PhysicsEngine';
import { translations } from '../../i18n/translations';
import SimulationCanvas from '../../components/SimulationCanvas';
import {
  areWorkbenchParamsEqual,
  adjustHeatCapacityPressureZeroCoarse,
  adjustHeatCapacityPressureZeroFine,
  canZeroHeatCapacityPressure,
  cloneParams,
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultIdealWindowLayout,
  createDefaultStandardFile,
  createDefaultStandardResultsLayout,
  acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  applyHeatCapacityGuideRecordWorkbenchState,
  abortHeatCapacityGuideWorkbenchState,
  canOpenHeatCapacityParameterSidebar,
  captureHeatCapacityFreeRollbackSnapshot,
  completeHeatCapacityTeachingModeWorkbenchState,
  enterHeatCapacityFreeModeWorkbenchState,
  exitHeatCapacityTeachingModeWorkbenchState,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getActiveHeatCapacityFreeTrialIndex,
  getHeatCapacityFreeDisplayPhase,
  getHeatCapacityFreeParameterLockReason,
  getHeatCapacityFreeRecordButtonState,
  getHeatCapacityGuideRecordButtonState,
  getHeatCapacityFreeStopcockFlowPurpose,
  getHeatCapacityParameterSidebarBlockReason,
  hasCompletedHeatCapacityFreeRecordSet,
  isHeatCapacityFreeGammaEditingAvailable,
  getHeatCapacityStopcockTargetAngle,
  getHeatCapacityStopcockState,
  getHeatCapacityPressureReleaseBurstUntilMs,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureThresholdsMv,
  getHeatCapacityPumpFrequencyState,
  HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS,
  HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS,
  HEAT_CAPACITY_RELEASE_BURST_DURATION_MS,
  HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  isHeatCapacityPhysicalKernelMode,
  isHeatCapacityFreeEquilibriumSpeedAvailable,
  isHeatCapacityPressureZeroWithinTolerance,
  getWorkbenchParameterRows,
  normalizeHeatCapacityFileName,
  captureHeatCapacityWorkbenchSample,
  powerHeatCapacityWorkbenchFile,
  prepareNextHeatCapacityFreeExperimentGroupWorkbenchState,
  prepareHeatCapacityAutoDemoStart,
  applyHeatCapacityFreeRecordWorkbenchState,
  refreshHeatCapacityPumpFrequency,
  recordHeatCapacityFreeTraceEvent,
  registerHeatCapacityPumpStroke,
  removeHeatCapacityFreeTrialRecordWorkbenchState,
  resetHeatCapacityFreeRunWorkbenchState,
  selectActiveHeatCapacityWorkbenchDisplay,
  setHeatCapacityFreeEquilibriumSpeedHintShown,
  setHeatCapacityFreeEquilibriumSpeedMultiplier,
  setHeatCapacityGuideEquilibriumSpeedMultiplier,
  setHeatCapacityGuidePumpValveOpen,
  setHeatCapacityGuideStopcockOpen,
  setHeatCapacityPressureZeroOffset,
  shouldPromptHeatCapacityFreePowerOffBeforeNextGroup,
  startHeatCapacityGuideWorkbenchState,
  stepHeatCapacityWorkbenchFile,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  IDEAL_RESULT_HEIGHT_RATIO,
  WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  WORKBENCH_LIVE_SPLIT_MIN_RATIO,
  WORKBENCH_LIVE_SPLIT_MAX_RATIO,
  clampWorkbenchLiveSplitRatio,
  validateWorkbenchParams,
  type WorkbenchExportEnvironmentStatus,
  type WorkbenchFileKind,
  type WorkbenchFileState,
  type WorkbenchHeatCapacityState,
  type WorkbenchIdealState,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchIdealWindowLayout,
  type WorkbenchHeatCapacityPanelKey,
  type WorkbenchHeatCapacityTabId,
  type WorkbenchPanelKey,
  type WorkbenchParameterRow,
  type WorkbenchStandardResultsLayout,
  type WorkbenchStandardResultsTab,
} from './workbenchState';
import {
  cloneHardSphereEngineSnapshot,
} from './workbenchHardSpherePersistence.ts';
import HeatCapacityInstrumentScene from '../heatCapacity/HeatCapacityInstrumentScene';
import { HeatCapacityLeftPanel } from '../heatCapacity/HeatCapacityLeftPanel.tsx';
import HeatCapacityProcessReviewPanel from '../heatCapacity/HeatCapacityProcessReviewPanel.tsx';
import {
  HEAT_CAPACITY_FREE_PARAMETER_SIDEBAR_BLOCK_FALLBACK,
  formatHeatCapacityFreeParameterValue,
  getHeatCapacityFreeParameterDraftValue,
  getHeatCapacityFreeParameterInputValue,
  heatCapacityFreeAdvancedNumberParameters,
  heatCapacityFreeAdvancedParameterGroups,
  heatCapacityFreeBasicCheckboxes,
  heatCapacityFreeBasicNumberParameters,
  heatCapacityFreeSharedText,
  type HeatCapacityFreeBasicCheckboxKey,
  type HeatCapacityFreeCheckboxDefinition,
  type HeatCapacityFreeDraftNumberKey,
  type HeatCapacityFreeNumberParameterDefinition,
  type HeatCapacityFreeParameterSymbolPart,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import {
  createHeatCapacityAutoDemoSteps,
  getHeatCapacityAutoDemoTimeline,
  type HeatCapacityAutoDemoAction,
  type HeatCapacityAutoDemoStep,
  type HeatCapacityAutoDemoTimelineItem,
} from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  formatHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import type {
  HeatCapacityFreeRecordRejectReason,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type {
  HeatCapacityFreeTrialRecordRemovalKind,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  deriveHeatCapacityFreeExperimentTimer,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentTimerModel.ts';
import {
  deriveHeatCapacityGuideExperimentTimer,
} from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
import {
  HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
  FREE_RELEASE_MAIN_DURATION_S,
  FREE_RELEASE_RESPONSE_DELAY_S,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
  clampNumber as clampHeatCapacityHardSphereNumber,
  type HeatCapacityHardSphereReleaseTimeline,
} from '../../domain/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  getHeatCapacityFreePressureDangerUpperLimitMv,
  type HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import {
  createHeatCapacityAutoDemoProfile,
} from '../../domain/heatCapacity/heatCapacityExperimentRandom.ts';
import {
  createWorkbenchExportPayload,
  createWorkbenchFigureSpecs,
  createWorkbenchResultSummary,
  type WorkbenchExportMode,
} from './workbenchResults';
import {
  encodeWorkbenchSession,
  loadClosedWorkbenchFiles,
  loadWorkbenchSession,
  persistClosedWorkbenchFiles,
  persistWorkbenchSession,
  type WorkbenchSessionState,
} from './workbenchSession.ts';
import {
  clonePointsByRelation,
  createIdealGasExperimentPoint,
  getIdealFailureReasonText,
  getIdealGasAnalysis,
  getIdealHistoryContent,
  getIdealRecommendationText,
  getPresetSequence,
  getRelationLabel,
  getRelationVariableKey,
  getRelationVariableNumericValue,
  getRelationXValue,
  isVariableKeyForRelation,
  type ExperimentParamKey,
  type IdealGasAnalysis,
  type IdealExperimentLanguageCode,
} from '../../domain/idealGas/idealGasExperiment';
import {
  DEFAULT_HEAT_CAPACITY_QUALITY_MODE,
  HEAT_CAPACITY_QUALITY_MODE_ORDER,
  HEAT_CAPACITY_QUALITY_PROFILES,
  type HeatCapacityQualityMode,
} from '../heatCapacity/heatCapacityQualityProfiles';
import './WorkbenchStudioPrototype.css';

type LogKind = 'info' | 'warning' | 'success' | 'error';
type ConsoleTab = 'logs' | 'warnings' | 'summary';
type TopMenu = 'new' | 'edit' | 'window' | 'settings' | 'help' | null;
type TopCommandSubmenu = 'newExperiment' | 'openExperiment';
type ResultsSectionKey = WorkbenchStandardResultsTab;
type WorkbenchThemePreference = 'system' | 'light' | 'dark';
type WorkbenchResolvedTheme = 'light' | 'dark';
type WorkbenchLanguagePreference = 'zh-CN' | 'zh-TW' | 'en';
type WorkbenchPerformanceMode = HeatCapacityQualityMode;
const WORKBENCH_USER_GUIDE_URLS: Record<WorkbenchLanguagePreference, string> = {
  'zh-CN': 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release#readme',
  'zh-TW': 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/blob/main/README.zh-TW.md',
  en: 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/blob/main/README.en.md',
};
const WORKBENCH_WINDOW_CONTROL_COPY: Record<WorkbenchLanguagePreference, {
  controls: string;
  minimize: string;
  maximize: string;
  restore: string;
  close: string;
}> = {
  ['zh-CN']: {
    controls: '窗口控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原窗口',
    close: '关闭',
  },
  ['zh-TW']: {
    controls: '視窗控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '還原視窗',
    close: '關閉',
  },
  ['en']: {
    controls: 'Window controls',
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
  },
};
type IdealSamplingPresetKey = 'fast' | 'balanced' | 'stable';
type WorkbenchParameterSymbolPart = string | { sub: string };
type HeatCapacityGuideRecordKind = 'u0' | 'u1' | 'u2';
type HeatCapacityMode = 'demo' | 'guide' | 'free';
type WorkbenchUpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'retrying' | 'downloaded' | 'installing' | 'unsupported' | 'error';
type WorkbenchLocalizedText = Partial<Record<WorkbenchLanguagePreference, string>>;

type HeatCapacityFocusMode = 'none' | 'instrument' | 'pump' | 'bottle';
type HeatCapacityFocusControlSnapshot = {
  powerOn: boolean;
  stopcockOpen: boolean;
  pumpValveOpen: boolean;
  pressureZeroAdjusted: boolean;
  pressureZeroOffset: number;
};
type HeatCapacityFocusSession = {
  fileId: string;
  mode: Exclude<HeatCapacityFocusMode, 'none'>;
  parametersCollapsedBeforeFocus: boolean;
  baseline: HeatCapacityFocusControlSnapshot;
  nonReversibleAction: boolean;
};

type HeatCapacityGuideStrongMaskHole =
  | {
      id: string;
      shape: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    }
  | {
      id: string;
      shape: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
    };

type HeatCapacityGuideStrongDomHole = {
  id: string;
  selector: string;
  padding?: number;
  rx?: number;
  optional?: boolean;
};

type HeatCapacityGuideStrongTargetSpec = {
  id: string;
  focusMode: HeatCapacityFocusMode | null;
  sceneHoleIds: string[];
  domHoles?: HeatCapacityGuideStrongDomHole[];
  reminderCopyKey?: 'guideStrongReminder' | 'guideStrongReminderPressureZero';
};

interface WorkbenchUpdateReleaseItem {
  scope: string;
  importance: string;
  title: WorkbenchLocalizedText;
  body: WorkbenchLocalizedText;
}

interface WorkbenchUpdateReleaseSection {
  type: string;
  title: WorkbenchLocalizedText;
  items: WorkbenchUpdateReleaseItem[];
}

const WORKBENCH_PARAMETER_DETAILS: Record<ExperimentParamKey, {
  symbol: WorkbenchParameterSymbolPart[];
  help: Record<WorkbenchLanguagePreference, string>;
}> = {
  N: {
    symbol: ['N'],
    help: {
      'zh-CN': '控制容器内参与碰撞和压强统计的粒子数量。',
      'zh-TW': '控制容器內參與碰撞和壓強統計的粒子數量。',
      en: 'Sets the number of particles used for collisions and pressure statistics.',
    },
  },
  r: {
    symbol: ['r'],
    help: {
      'zh-CN': '决定硬球半径，影响碰撞截面和可占据空间。',
      'zh-TW': '決定硬球半徑，影響碰撞截面和可佔據空間。',
      en: 'Sets the hard-sphere radius, affecting collision size and available space.',
    },
  },
  L: {
    symbol: ['L'],
    help: {
      'zh-CN': '决定立方容器边长，改变体积和压强换算基准。',
      'zh-TW': '決定立方容器邊長，改變體積和壓強換算基準。',
      en: 'Sets the cubic container side length, changing volume and pressure scaling.',
    },
  },
  m: {
    symbol: ['m'],
    help: {
      'zh-CN': '决定单个粒子的质量，用于速度、能量和碰撞响应。',
      'zh-TW': '決定單個粒子的質量，用於速度、能量和碰撞響應。',
      en: 'Sets particle mass for velocity, energy, and collision response.',
    },
  },
  k: {
    symbol: ['k'],
    help: {
      'zh-CN': '归一化玻尔兹曼常数，用于温度和粒子动能换算。',
      'zh-TW': '歸一化波茲曼常數，用於溫度和粒子動能換算。',
      en: 'Sets the normalized Boltzmann constant for temperature-energy conversion.',
    },
  },
  dt: {
    symbol: ['dt'],
    help: {
      'zh-CN': '决定每一步积分时间间隔，影响模拟推进精度和速度。',
      'zh-TW': '決定每一步積分時間間隔，影響模擬推進精度和速度。',
      en: 'Sets the integration time step, affecting simulation precision and pace.',
    },
  },
  nu: {
    symbol: ['ν'],
    help: {
      'zh-CN': '控制 Andersen 热浴碰撞频率，影响达到目标温度的速度。',
      'zh-TW': '控制 Andersen 熱浴碰撞頻率，影響達到目標溫度的速度。',
      en: 'Sets the Andersen thermostat collision frequency and equilibration speed.',
    },
  },
  targetTemperature: {
    symbol: ['T', { sub: 'target' }],
    help: {
      'zh-CN': '设定理想气体实验的热浴目标温度。',
      'zh-TW': '設定理想氣體實驗的熱浴目標溫度。',
      en: 'Sets the thermostat target temperature for ideal-gas runs.',
    },
  },
  equilibriumTime: {
    symbol: ['t', { sub: 'eq' }],
    help: {
      'zh-CN': '决定开始统计前等待热平衡的时间。',
      'zh-TW': '決定開始統計前等待熱平衡的時間。',
      en: 'Sets how long the run equilibrates before statistics are collected.',
    },
  },
  statsDuration: {
    symbol: ['t', { sub: 'stat' }],
    help: {
      'zh-CN': '决定用于结果统计的采样持续时间。',
      'zh-TW': '決定用於結果統計的採樣持續時間。',
      en: 'Sets the duration of the statistics collection window.',
    },
  },
};

interface WorkbenchUpdateState {
  status: WorkbenchUpdateStatus;
  currentVersion: string;
  latestVersion?: string | null;
  releaseName?: string | null;
  releaseDate?: string | null;
  releaseNotes?: string | null;
  releaseSummary?: WorkbenchLocalizedText | null;
  releaseSections?: WorkbenchUpdateReleaseSection[] | null;
  releasePageUrl?: string | null;
  manualDownloadUrl?: string | null;
  downloadAttempt?: number | null;
  maxDownloadAttempts?: number | null;
  retrying?: boolean;
  errorKind?: string | null;
  percent?: number | null;
  message?: string;
}

interface WorkbenchDesktopUpdaterBridge {
  checkForUpdates?: () => Promise<WorkbenchUpdateState>;
  downloadUpdate?: () => Promise<WorkbenchUpdateState>;
  quitAndInstall?: () => Promise<WorkbenchUpdateState>;
  openManualDownload?: () => Promise<{ status: 'opened' | 'error'; url?: string; message?: string }>;
  onStatus?: (callback: (state: WorkbenchUpdateState) => void) => (() => void);
}

const mergeWorkbenchUpdateDialogState = (
  nextState: WorkbenchUpdateState,
  previousState: WorkbenchUpdateState | null,
): WorkbenchUpdateState => {
  if (!previousState) return nextState;
  const nextVersion = nextState.latestVersion ?? null;
  const previousVersion = previousState.latestVersion ?? null;
  if (nextVersion && previousVersion && nextVersion !== previousVersion) return nextState;

  return {
    ...nextState,
    releaseName: nextState.releaseName ?? previousState.releaseName,
    releaseDate: nextState.releaseDate ?? previousState.releaseDate,
    releaseNotes: nextState.releaseNotes ?? previousState.releaseNotes,
    releaseSummary: nextState.releaseSummary ?? previousState.releaseSummary,
    releaseSections: nextState.releaseSections ?? previousState.releaseSections,
    releasePageUrl: nextState.releasePageUrl ?? previousState.releasePageUrl,
    manualDownloadUrl: nextState.manualDownloadUrl ?? previousState.manualDownloadUrl,
  };
};

const WORKBENCH_APP_VERSION = __APP_VERSION__;

type GuideHeatCapacityStep =
  | 'idle'
  | 'powerOnRequired'
  | 'openStopcockForZeroRequired'
  | 'zeroAdjustRequired'
  | 'recordU0Required'
  | 'closeStopcockRequired'
  | 'openPumpValveRequired'
  | 'pumpRequired'
  | 'closePumpValveRequired'
  | 'stabilizeBeforeReleaseRequired'
  | 'recordU1Required'
  | 'openStopcockReleaseRequired'
  | 'closeStopcockAfterReleaseRequired'
  | 'recoverRequired'
  | 'recordU2Required'
  | 'closePowerRequired'
  | 'completed';

type GuideHeatCapacityAction =
  | 'turnPowerOn'
  | 'turnPowerOff'
  | 'adjustPressureZero'
  | 'recordU0'
  | 'closeStopcock'
  | 'openStopcock'
  | 'openPumpValve'
  | 'closePumpValve'
  | 'pumpBulb'
  | 'recordU1'
  | 'recordU2';

type GuideHeatCapacityRollbackAnimation = 'valveBounce' | 'stopcockBounce' | 'pumpBulbBounce' | 'knobBounce' | 'powerBounce';
type HeatCapacityLockedControl = 'powerSwitch' | 'pressureZero' | 'stopcock' | 'pumpValve' | 'pumpBulb';
type HeatCapacityToastLevel = 'info' | 'success' | 'warning' | 'danger';
type HeatCapacityToastSource =
  | 'guide'
  | 'guide-blocked'
  | 'pressure-warning'
  | 'pressure-close-valve'
  | 'pressure-alarm';

interface HeatCapacityToastMessage {
  id: string;
  text: string;
  level: HeatCapacityToastLevel;
  priority: number;
  source: HeatCapacityToastSource;
  createdAt: number;
}

interface GuideHeatCapacityGuardResult {
  allowed: boolean;
  expectedControlId?: string;
  expectedMessage?: string;
  expectedLevel?: HeatCapacityToastLevel;
  rollbackAnimation?: GuideHeatCapacityRollbackAnimation;
  suppressGuidance?: boolean;
  suppressStrongReminder?: boolean;
}

const GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS = 10_000;
const GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS = 4000;
const HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS = 250;
const HEAT_CAPACITY_GUIDE_WAIT_DURATION_MS = 5 * 60 * 1000;
const HEAT_CAPACITY_GUIDE_RELEASE_DURATION_MS = 350;
const HEAT_CAPACITY_GUIDE_WAIT_DURATION_S = HEAT_CAPACITY_GUIDE_WAIT_DURATION_MS / 1000;
const HEAT_CAPACITY_GUIDE_RELEASE_DURATION_S = HEAT_CAPACITY_GUIDE_RELEASE_DURATION_MS / 1000;
const HEAT_CAPACITY_GUIDE_START_NOTICE_MS = 1000;
const HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS = 2000;
const HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS = 2000;
const HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS = 220;
const HEAT_CAPACITY_FREE_RESET_FEEDBACK_MS = 650;
const HEAT_CAPACITY_FREE_SPEED_NOTICE_DURATION_MS = 2400;
const HEAT_CAPACITY_FREE_SPEED_OVERLAY_EXIT_MS = 160;
const HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX = 48;
const HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX = 42;
const HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS = 120;
const HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS = 2500;
const HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE = 0.72;
const HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS = 2;
const HEAT_CAPACITY_TOAST_PRIORITY: Record<HeatCapacityToastLevel, number> = {
  info: 0,
  success: 0,
  warning: 1,
  danger: 2,
};
const HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY = 3;
const HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY = 4;

interface HeatCapacityGuideChecklistStepDefinition {
  id: string;
  guideStep: GuideHeatCapacityStep;
  title: Record<WorkbenchLanguagePreference, string>;
}

const HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS: HeatCapacityGuideChecklistStepDefinition[] = [
  {
    id: 'power-on',
    guideStep: 'powerOnRequired',
    title: { 'zh-CN': '打开电源', 'zh-TW': '打開電源', en: 'Turn on power' },
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

const getHeatCapacityGuideChecklistIndex = (step: GuideHeatCapacityStep): number => {
  const exactIndex = HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.findIndex((item) => item.guideStep === step);
  if (exactIndex >= 0) return exactIndex;
  if (step === 'completed') return HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1;
  return 0;
};

const HEAT_CAPACITY_GUIDE_STRONG_TARGET_CONFIGS: Record<string, HeatCapacityGuideStrongTargetSpec> = {
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
      { id: 'guideTimer', selector: '[data-heat-capacity-free-wait-timer="true"]', padding: 8, rx: 12, optional: true },
    ],
    sceneHoleIds: ['instrumentDisplay'],
  },
  recordU2: {
    id: 'recordU2',
    focusMode: 'instrument',
    domHoles: [
      { id: 'recordButton', selector: '[data-heat-capacity-guided-record="u2"], [data-heat-capacity-free-record="u2"]', padding: 10, rx: 12 },
      { id: 'guideTimer', selector: '[data-heat-capacity-free-wait-timer="true"]', padding: 8, rx: 12, optional: true },
    ],
    sceneHoleIds: ['instrumentDisplay'],
  },
};

const HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK: HeatCapacityGuideStrongTargetSpec = {
  id: 'fallback',
  focusMode: null,
  sceneHoleIds: [],
};

const getHeatCapacityGuideStrongTargetSpec = (controlId: string | null): HeatCapacityGuideStrongTargetSpec => (
  controlId ? HEAT_CAPACITY_GUIDE_STRONG_TARGET_CONFIGS[controlId] ?? HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK : HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK
);

const getHeatCapacityGuideDomHole = (
  maskRoot: HTMLElement | null,
  domHole: HeatCapacityGuideStrongDomHole,
  bounds: { width: number; height: number },
): HeatCapacityGuideStrongMaskHole | null => {
  if (!maskRoot || bounds.width <= 0 || bounds.height <= 0) return null;
  const sceneRoot = maskRoot.closest('[data-heat-capacity-instrument-scene="true"]') as HTMLElement | null;
  const element = sceneRoot?.querySelector(domHole.selector) as HTMLElement | null;
  if (!element) return null;
  const rootRect = maskRoot.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const padding = domHole.padding ?? 8;
  const x = Math.max(0, elementRect.left - rootRect.left - padding);
  const y = Math.max(0, elementRect.top - rootRect.top - padding);
  const right = Math.min(bounds.width, elementRect.right - rootRect.left + padding);
  const bottom = Math.min(bounds.height, elementRect.bottom - rootRect.top + padding);
  const width = Math.max(1, right - x);
  const height = Math.max(1, bottom - y);
  return {
    id: domHole.id,
    shape: 'rect',
    x,
    y,
    width,
    height,
    rx: domHole.rx ?? 8,
  };
};

const getHeatCapacityGuideStrongMaskHoles = (
  targetSpec: HeatCapacityGuideStrongTargetSpec,
  projectedHoles: Record<string, HeatCapacityGuideStrongMaskHole>,
  maskRoot: HTMLElement | null,
  bounds: { width: number; height: number },
): HeatCapacityGuideStrongMaskHole[] => {
  const holes: HeatCapacityGuideStrongMaskHole[] = [];
  targetSpec.sceneHoleIds.forEach((holeId) => {
    const projectedHole = projectedHoles[holeId];
    if (projectedHole) holes.push(projectedHole);
  });
  targetSpec.domHoles?.forEach((domHole) => {
    const hole = getHeatCapacityGuideDomHole(maskRoot, domHole, bounds);
    if (hole) holes.push(hole);
  });
  if (holes.length > 0) return holes;
  return [
    {
      id: 'centerViewport',
      shape: 'rect',
      x: bounds.width * 0.33,
      y: bounds.height * 0.32,
      width: bounds.width * 0.34,
      height: bounds.height * 0.26,
      rx: 14,
    },
  ];
};

const renderHeatCapacityGuideStrongMaskHole = (
  hole: HeatCapacityGuideStrongMaskHole,
  variant: 'mask' | 'outline',
) => {
  const isMask = variant === 'mask';
  const commonProps = {
    fill: isMask ? '#000' : 'rgba(56, 189, 248, 0.1)',
    stroke: isMask ? 'none' : 'rgba(125, 211, 252, 0.95)',
    strokeWidth: isMask ? 0 : 0.55,
    className: isMask ? undefined : 'studio-heat-guide-strong-cutout-outline',
    vectorEffect: 'non-scaling-stroke' as const,
  };
  if (hole.shape === 'rect') {
    return (
      <rect
        key={`${variant}-${hole.id}`}
        {...commonProps}
        x={hole.x}
        y={hole.y}
        width={hole.width}
        height={hole.height}
        rx={hole.rx ?? 2}
      />
    );
  }
  return (
    <ellipse
      key={`${variant}-${hole.id}`}
      {...commonProps}
      cx={hole.cx}
      cy={hole.cy}
      rx={hole.rx}
      ry={hole.ry}
    />
  );
};

const isHeatCapacityGuideRecordStep = (step: GuideHeatCapacityStep) => (
  step === 'recordU0Required' ||
  step === 'recordU1Required' ||
  step === 'recordU2Required'
);

const isGuideHeatCapacityPauseStep = (step: GuideHeatCapacityStep) => (
  step === 'recordU1Required' ||
  step === 'recordU2Required' ||
  step === 'closePowerRequired'
);

const renderHeatCapacityParameterSymbol = (
  parts: HeatCapacityFreeParameterSymbolPart[],
) => {
  const hasParts = parts.length > 0;
  return (
    <span
      className={`studio-param-symbol ${hasParts ? '' : 'studio-param-symbol-empty'}`}
      aria-hidden={hasParts ? undefined : true}
    >
      {parts.map((part, index) => (
        typeof part === 'string'
          ? <span key={index}>{part}</span>
          : <sub key={index}>{part.sub}</sub>
      ))}
    </span>
  );
};

interface ConsoleLog {
  id: number;
  time: string;
  kind: LogKind;
  message: string;
}

interface WorkbenchEditSnapshot {
  label: string;
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
  workbenchLayoutDefaults: WorkbenchLayoutDefaults;
}

interface PanelDefinition {
  key: WorkbenchPanelKey;
  title: string;
  hint: string;
  icon: React.ReactNode;
  defaultVisible?: boolean;
}

interface StandardEngineRuntime {
  engine: PhysicsEngine;
  frameCount: number;
  simulationTimerId: number | null;
}

interface ApplyActiveFileParamsOptions {
  silent?: boolean;
  forceReset?: boolean;
}

interface UpdateIdealScanVariableOptions {
  snap?: boolean;
}

interface WorkbenchGeneralSettings {
  theme: WorkbenchThemePreference;
  language: WorkbenchLanguagePreference;
  performanceMode: WorkbenchPerformanceMode;
}

interface WorkbenchCopy {
  menus: {
    newStudy: string;
    experimentFiles: string;
    newWindow: string;
    newExperiment: string;
    openExperiment: string;
    noCachedExperiments: string;
    edit: string;
    window: string;
    settings: string;
    help: string;
    general: string;
    standardStudy: string;
    idealStudy: string;
    heatCapacityStudy: string;
    undo: string;
    redo: string;
    empty: string;
    clearEditHistory: string;
    panelsFor: (name: string) => string;
    resetDefaultLayout: string;
    default: string;
    performanceMode: string;
    exportEnvironment: string;
    saveWorkbenchLayoutDefault: string;
    userGuide: string;
    theoryPdf: string;
    about: string;
    topCommandsAria: string;
  };
  settings: {
    title: string;
    subtitle: string;
    closeAria: string;
    theme: string;
    themeHint: string;
    themeOptions: Record<WorkbenchThemePreference, { label: string; hint: string }>;
    language: string;
    languageHint: string;
    languageOptions: Record<WorkbenchLanguagePreference, { label: string; hint: string }>;
    performanceMode: string;
    performanceModeHint: string;
    performanceModeSummary: Record<WorkbenchPerformanceMode, string>;
  };
  about: {
    title: string;
    subtitle: string;
    closeAria: string;
    currentVersion: string;
    checkUpdates: string;
    localDataExportEnvironment: string;
    workspaceSessionCache: string;
    buildNotes: string;
    updateNotConfigured: string;
    checking: string;
    available: string;
    unavailable: string;
    error: string;
    environmentResultTitle: string;
    environmentResultAvailable: string;
    environmentResultUnavailable: string;
    environmentResultError: string;
    updateResultTitle: string;
    updateResultBody: string;
    updateAvailableTitle: string;
    updateAvailableBody: string;
    updateReadyTitle: string;
    updateReadyBody: string;
    currentVersionLabel: string;
    latestVersionLabel: string;
    releaseDateLabel: string;
    releaseNotesLabel: string;
    noReleaseNotes: string;
    ignoreThisVersion: string;
    updateNow: string;
    restartAndInstall: string;
    later: string;
    ignoredVersionTitle: string;
    ignoredVersionBody: (version: string) => string;
    updateAvailableStatus: (version: string) => string;
    upToDateStatus: string;
    unsupportedUpdateStatus: string;
    downloadingUpdateStatus: (percent: number | null) => string;
    retryingUpdateStatus: (attempt: number | null, maxAttempts: number | null) => string;
    updateReadyStatus: string;
    updateErrorStatus: string;
    updateDownloadFailedStatus: (attempt: number | null, maxAttempts: number | null) => string;
    retryDownload: string;
    manualDownload: string;
    buildPlaceholder: string;
    sessionCacheSummary: (total: number) => string;
    sessionCacheBreakdown: (ideal: number, heat: number, standard: number) => string;
  };
  files: {
    openFiles: string;
    files: string;
    panels: string;
    noOpenFiles: string;
    noOpenFileState: string;
    noOpenPanelState: string;
    emptyHint: string;
    noOpenStudy: string;
    emptyTitle: string;
    emptyBody: string;
    createStandard: string;
    createIdeal: string;
    createHeatCapacity: string;
    rename: string;
    delete: string;
    confirmDelete: string;
    closeExperiment: string;
    confirmCloseRunningExperiment: (name: string) => string;
    cancel: string;
    locked: string;
    shown: string;
    open: string;
    active: string;
    off: string;
    std: string;
    ideal: string;
    heat: string;
    workspaceAria: string;
    openActions: (name: string) => string;
  };
  panels: {
    previewTitle: string;
    previewHint: string;
    realtimeTitle: string;
    heatRealtimeTitle: string;
    standardRealtimeHint: string;
    idealRealtimeHint: string;
    heatRealtimeHint: string;
    standardResultsTitle: string;
    standardResultsHint: string;
    idealResultsTitle: string;
    idealResultsHint: string;
    pointsTitle: string;
    pointsHint: string;
    verificationTitle: string;
    verificationHint: string;
    summaryTitle: string;
    dataTableTitle: string;
    figuresTitle: string;
    liveWorkspaceResizeAria: string;
  };
  parameters: {
    title: string;
    currentFileValues: string;
    lockedUntilStopped: string;
    editValues: string;
    hide: string;
    standardSimulation: string;
    idealSimulation: string;
    heatCapacityExperiment: string;
    savedChangesOnStart: string;
    idealRuntimeOnStart: string;
    applied: string;
    relation: string;
    scanVariable: string;
    samplingPreset: string;
    targetTemperature: string;
    boxLength: string;
    particleCount: string;
    customPreset: string;
    setSamplingPrecision: string;
    relationHints: Record<ExperimentRelation, string>;
    setScanValue: (title: string) => string;
    adjustScanValue: (title: string) => string;
    recommendedValues: (title: string) => string;
    parameterLabels: Record<ExperimentParamKey | 'relation', string>;
    samplingPresets: Record<IdealSamplingPresetKey, string>;
    samplingDuration: (equilibriumTime: number, statsDuration: number) => string;
    advancedSettings: string;
    advancedShow: string;
    advancedHide: string;
    edit: string;
    save: string;
    saveHint: string;
    standardReadonlyNote: string;
    idealReadonlyNote: string;
    heatCapacityReadonlyNote: string;
    microscopicVisualization: string;
    hardSphereView: string;
    hardSphereOn: string;
    hardSphereOff: string;
    hardSphereTeachingOnly: string;
    controlledLockHint: string;
  };
  results: {
    title: string;
    experimentStatus: string;
    scan: string;
    temperature: string;
    pressure: string;
    measuredPressure: string;
    idealPressure: string;
    gap: string;
    pointsTitle: (relation: string) => string;
    pointsShort: (count: number) => string;
    recordedPoints: (count: number) => string;
    clearRelation: string;
    confirmClear: string;
    remove: string;
    confirmRemove: string;
    cancel: string;
    noPoints: string;
    runToRecord: string;
    tableAction: string;
    tableTime: string;
    finalState: string;
    meanSpeed: string;
    measuredBars: string;
    idealLine: string;
    samples: (count: number) => string;
    sampleWindows: (count: number) => string;
    waiting: string;
    finalSpeedSamples: string;
    finalEnergySamples: string;
    tempHistorySamples: string;
    finalDataReady: string;
    energyDrift: string;
    meanAbsTempError: string;
    tempSamples: string;
    resultsReady: (relation: string) => string;
    waitingForRecordedPoints: (relation: string) => string;
    metric: string;
    value: string;
    status: string;
    ready: string;
    notReady: string;
    yes: string;
    no: string;
    diagnostic: string;
    export: string;
    exportAll: string;
    exportFigures: string;
    reportPdf: string;
    verificationFigure: string;
    pointsCsv: string;
    verification: string;
    rawPv: string;
    history: string;
    resultReadyStatus: string;
    resultNotReadyStatus: string;
    resultReadyDetail: string;
    resultNotReadyDetail: string;
    finalTime: string;
    finalTemperature: string;
    finalPressure: string;
    rmsSpeed: string;
    speedBins: string;
    energyBins: string;
    notReadyPreview: string;
    figuresHint: string;
    noIdealPointsTitle: string;
    noIdealPointsBody: string;
    activeRelation: string;
    noIdealVerificationTitle: string;
    noIdealVerificationBody: string;
    historyLockedFor: (relation: string) => string;
    historyUnlocked: string;
    historyUnlockHint: string;
    historicalContext: string;
    workbenchInterpretation: string;
    keyFigures: string;
    keyFiguresValue: (rSquared: string, slopeError: string) => string;
    whyLocked: string;
    whyItHappened: string;
    recommendedNextStep: string;
    exportFilesHint: string;
    pvLinearizedValidation: string;
    relationValidation: (relation: string) => string;
    measuredScatterHint: string;
    originalPvPhysicalView: string;
    originalPvPhysicalHint: string;
    verdictLabel: (relation: string, verdict: string) => string;
    pointsMetric: string;
    rSquared: string;
    slope: string;
    theorySlope: string;
    slopeError: string;
    failureReason: string;
    noneValue: string;
    currentVerification: (rSquared: string, slopeError: string) => string;
    currentVerdictRecommendation: (verdict: string, recommendation: string) => string;
    noIdealHistoryTitle: string;
    noIdealHistoryBody: string;
    noVerificationChartTitle: string;
    noVerificationChartBody: string;
    panelNotConnectedTitle: string;
    panelNotConnectedBody: string;
    measuredLegend: string;
    fitLegend: string;
    theoryLegend: string;
    idealPressureTrace: (relation: string) => string;
    currentIdealPressureHint: string;
    meanTemperature: string;
    relativeGap: string;
    samplingProgress: string;
    speedDistribution: string;
    energyDistribution: string;
    standardRealtimeEmpty: string;
    phase: string;
    phaseStates: Record<SimulationStats['phase'], string>;
    probabilityDensity: string;
    experimentPointTableTitle: string;
    experimentPointTableBody: string;
    idealResultsSectionsAria: string;
    openIdealResultsTabTitle: string;
    verificationChartAria: (relation: string) => string;
    resultsTreeExpandAria: string;
    resultsTreeCollapseAria: string;
    resultsOpenHint: string;
    resultsJumpHint: string;
    figureStatus: Record<'ready' | 'not-ready' | 'not-applicable', string>;
  };
  actions: {
    start: string;
    pause: string;
    stop: string;
    close: string;
    resetView: string;
    hide: string;
    cancel: string;
  };
  shortcuts: {
    title: string;
    hint: string;
    undo: string;
    redo: string;
    closeSettings: string;
  };
  console: {
    title: string;
    tabs: Record<ConsoleTab, string>;
    total: string;
    info: string;
    success: string;
    warnings: string;
    errors: string;
    latest: string;
    runtime: string;
    noLogs: string;
    noWarnings: string;
  };
  status: {
    activeFile: (name: string) => string;
    selectedBlock: (name: string) => string;
    none: string;
    noRuntime: string;
    standardRuntime: string;
    idealRuntime: (relation: string, verdict: string) => string;
    runStates: Record<WorkbenchFileState['runState'], string>;
    verdictStates: Record<string, string>;
  };
  exportEnvironment: Record<WorkbenchExportEnvironmentStatus, { label: string; detail: string }>;
  logs: {
    initialized: string;
    defaultLayout: string;
    standardConnected: string;
    exportBridgeRequired: string;
    autoPausedSingleRuntime: (name: string) => string;
    autoPausedCreateFile: (name: string) => string;
    autoPausedSwitchFile: (name: string) => string;
    fileCreated: (name: string) => string;
    mockAction: (label: string) => string;
    lockedPanel: (title: string) => string;
    layoutReset: (name: string) => string;
    idealResultsOpened: (name: string, tab: string) => string;
    standardResultsOpened: (name: string, tab: string) => string;
    idealResultsClosed: (name: string) => string;
    fileSelected: (name: string) => string;
    confirmClear: (name: string, relation: string) => string;
    clearedRelation: (name: string, relation: string) => string;
    exportLabels: Record<WorkbenchExportMode, string>;
    exportNotReady: (name: string) => string;
    exportNeedsTwoPoints: (name: string) => string;
    exportPayloadPrepared: (name: string, label: string, filename: string, detail: string) => string;
    exportPreparing: (name: string, label: string) => string;
    exportCancelled: (name: string, label: string) => string;
    exportFailed: (name: string, label: string, message: string) => string;
    exportCsvSaved: (name: string, target: string) => string;
    exportCompleted: (name: string, label: string, outDir: string, fileCount: number, figureHint: string) => string;
    exportFigureHint: string;
    unknownExporterError: string;
    selectedLocation: string;
    selectedFolder: string;
    fileNameCannotBeEmpty: string;
    fileNameUnchanged: (name: string) => string;
    fileRenamed: (name: string) => string;
    fileRemoved: (name: string) => string;
    fileClosed: (name: string) => string;
    fileOpenedFromCache: (name: string) => string;
    confirmDeleteFile: (name: string) => string;
    layoutAlreadyDefault: (name: string) => string;
    undoAction: (label: string) => string;
    redoAction: (label: string) => string;
    editHistoryCleared: string;
    layoutSaveNeedsFile: string;
    layoutDefaultSaved: (name: string) => string;
    standardFinished: (name: string) => string;
    standardResultsReady: (name: string) => string;
    idealPointRecorded: (name: string, relation: string, value: string) => string;
    idealPointMissingSummary: (name: string) => string;
    controlledVariablesLocked: (name: string, relation: string, keys: string) => string;
    pauseBeforeEditingParameters: (name: string) => string;
    invalidParameter: (name: string, label: string, value: string) => string;
    pauseBeforeApplyingParameters: (name: string) => string;
    idealRuntimeAlreadyApplied: (name: string) => string;
    noSavedParameterChanges: (name: string) => string;
    idealRuntimeApplied: (name: string, relation: string, keys: string) => string;
    standardParametersApplied: (name: string, action: string) => string;
    parametersSavedAndApplied: string;
    parametersApplied: string;
    runtimeCreateFailed: (name: string, kind: string) => string;
    standardStarted: (name: string) => string;
    idealStarted: (name: string, relation: string) => string;
    simulationPaused: (name: string, kind: string) => string;
    standardTerminated: (name: string) => string;
    idealTerminated: (name: string) => string;
    standardReset: (name: string) => string;
    idealReset: (name: string, relation: string) => string;
    panelOpened: (name: string, panel: string) => string;
    panelClosed: (name: string, panel: string) => string;
    pauseBeforeSwitchingRelation: (name: string) => string;
    relationAlreadyActive: (name: string, relation: string) => string;
    relationSwitched: (name: string, relation: string) => string;
    pauseBeforeChangingSamplingPreset: (name: string) => string;
    pauseBeforeChangingScanVariable: (name: string) => string;
    confirmRemoveIdealPoint: (name: string, relation: string) => string;
    idealPointRemoved: (name: string) => string;
    relationHasNoPoints: (name: string, relation: string) => string;
    scanInputRequired: (key: string, format: string) => string;
    scanInputIntegerOnly: string;
    scanInputDecimalOnly: (key: string) => string;
    scanInputGreaterThanZero: (key: string) => string;
    scanInputStep: (label: string, step: string) => string;
    scanInputRange: (key: string, min: string, max: string) => string;
    formatPositiveInteger: string;
    formatDecimalNumber: string;
  };
}

type WorkbenchExperimentLogCopy = Pick<WorkbenchCopy['logs'],
  | 'undoAction'
  | 'redoAction'
  | 'editHistoryCleared'
  | 'layoutSaveNeedsFile'
  | 'layoutDefaultSaved'
  | 'standardFinished'
  | 'standardResultsReady'
  | 'idealPointRecorded'
  | 'idealPointMissingSummary'
  | 'controlledVariablesLocked'
  | 'pauseBeforeEditingParameters'
  | 'invalidParameter'
  | 'pauseBeforeApplyingParameters'
  | 'idealRuntimeAlreadyApplied'
  | 'noSavedParameterChanges'
  | 'idealRuntimeApplied'
  | 'standardParametersApplied'
  | 'parametersSavedAndApplied'
  | 'parametersApplied'
  | 'runtimeCreateFailed'
  | 'standardStarted'
  | 'idealStarted'
  | 'simulationPaused'
  | 'standardTerminated'
  | 'idealTerminated'
  | 'standardReset'
  | 'idealReset'
  | 'panelOpened'
  | 'panelClosed'
  | 'pauseBeforeSwitchingRelation'
  | 'relationAlreadyActive'
  | 'relationSwitched'
  | 'pauseBeforeChangingSamplingPreset'
  | 'pauseBeforeChangingScanVariable'
  | 'confirmRemoveIdealPoint'
  | 'idealPointRemoved'
  | 'relationHasNoPoints'
  | 'scanInputRequired'
  | 'scanInputIntegerOnly'
  | 'scanInputDecimalOnly'
  | 'scanInputGreaterThanZero'
  | 'scanInputStep'
  | 'scanInputRange'
  | 'formatPositiveInteger'
  | 'formatDecimalNumber'
>;

const experimentLogCopies = {
  'zh-CN': {
    undoAction: (label) => '撤销：' + label,
    redoAction: (label) => '重做：' + label,
    editHistoryCleared: '编辑历史已清空。',
    layoutSaveNeedsFile: '请先创建或打开工作台文件，再保存布局默认值。',
    layoutDefaultSaved: (name) => name + '：当前窗口布局已保存为默认布局。',
    standardFinished: (name) => name + '：标准模拟已完成，最终图表数据已就绪。',
    standardResultsReady: (name) => name + '：结果已就绪。可从面板列表打开结果，查看摘要、数据和图像。',
    idealPointRecorded: (name, relation, value) => name + '：已记录 ' + relation + ' 点，扫描值 ' + value + '。',
    idealPointMissingSummary: (name) => name + '：理想气体运行已结束，但压强摘要尚未就绪，未记录实验点。',
    controlledVariablesLocked: (name, relation, keys) => name + '：' + relation + ' 数据表已有记录，受控变量已锁定。清空表格后才能修改 ' + keys + '。',
    pauseBeforeEditingParameters: (name) => name + '：请先暂停模拟，再编辑参数。',
    invalidParameter: (name, label, value) => name + '：参数 ' + label + '="' + value + '" 无效。',
    pauseBeforeApplyingParameters: (name) => name + '：请先暂停模拟，再应用已保存参数。',
    idealRuntimeAlreadyApplied: (name) => name + '：理想运行时已使用当前保存参数，无需重新应用。',
    noSavedParameterChanges: (name) => name + '：没有需要应用的已保存参数变更。',
    idealRuntimeApplied: (name, relation, keys) => name + '：已为 ' + relation + ' 应用理想运行时；变更参数：' + keys + '。',
    standardParametersApplied: (name, action) => name + '：参数已' + action + '；运行时已重建，可开始运行。',
    parametersSavedAndApplied: '保存并应用',
    parametersApplied: '应用',
    runtimeCreateFailed: (name, kind) => name + '：未能创建' + kind + '运行时。',
    standardStarted: (name) => name + '：标准模拟已启动，3D 预览正在实时更新。',
    idealStarted: (name, relation) => name + '：' + relation + ' 采样运行已启动。',
    simulationPaused: (name, kind) => name + '：' + kind + '已暂停。',
    standardTerminated: (name) => name + '：标准模拟已终止并返回初始状态。',
    idealTerminated: (name) => name + '：理想气体模拟已终止并返回初始状态。',
    standardReset: (name) => name + '：标准运行时已重置。',
    idealReset: (name, relation) => name + '：' + relation + ' 理想运行时已重置。',
    panelOpened: (name, panel) => name + '：已打开面板 ' + panel + '。',
    panelClosed: (name, panel) => name + '：已关闭面板 ' + panel + '。',
    pauseBeforeSwitchingRelation: (name) => name + '：请先暂停当前理想气体运行，再切换关系。',
    relationAlreadyActive: (name, relation) => name + '：' + relation + ' 已是当前关系。',
    relationSwitched: (name, relation) => name + '：已切换到 ' + relation + ' 关系。',
    pauseBeforeChangingSamplingPreset: (name) => name + '：请先暂停当前理想气体运行，再更改采样预设。',
    pauseBeforeChangingScanVariable: (name) => name + '：请先暂停当前理想气体运行，再更改扫描变量。',
    confirmRemoveIdealPoint: (name, relation) => name + '：点击确认移除以删除此 ' + relation + ' 点。',
    idealPointRemoved: (name) => name + '：已移除理想气体实验点。',
    relationHasNoPoints: (name, relation) => name + '：' + relation + ' 没有可清空的点。',
    scanInputRequired: (key, format) => key + ' 需要输入' + format + '。',
    scanInputIntegerOnly: 'N 只支持正整数输入。N 的最小步长为 1。',
    scanInputDecimalOnly: (key) => key + ' 只支持普通小数输入。',
    scanInputGreaterThanZero: (key) => key + ' 必须大于 0。',
    scanInputStep: (label, step) => label + ' 的最小步长为 ' + step + '。',
    scanInputRange: (key, min, max) => key + ' 必须保持在 ' + min + ' 到 ' + max + ' 之间。',
    formatPositiveInteger: '正整数',
    formatDecimalNumber: '小数',
  },
  'zh-TW': {
    undoAction: (label) => '復原：' + label,
    redoAction: (label) => '重做：' + label,
    editHistoryCleared: '編輯歷史已清空。',
    layoutSaveNeedsFile: '請先建立或開啟工作台檔案，再儲存版面預設值。',
    layoutDefaultSaved: (name) => name + '：目前視窗版面已儲存為預設版面。',
    standardFinished: (name) => name + '：標準模擬已完成，最終圖表資料已就緒。',
    standardResultsReady: (name) => name + '：結果已就緒。可從面板列表開啟結果，查看摘要、資料和圖像。',
    idealPointRecorded: (name, relation, value) => name + '：已記錄 ' + relation + ' 點，掃描值 ' + value + '。',
    idealPointMissingSummary: (name) => name + '：理想氣體執行已結束，但壓強摘要尚未就緒，未記錄實驗點。',
    controlledVariablesLocked: (name, relation, keys) => name + '：' + relation + ' 資料表已有記錄，受控變量已鎖定。清空表格後才能修改 ' + keys + '。',
    pauseBeforeEditingParameters: (name) => name + '：請先暫停模擬，再編輯參數。',
    invalidParameter: (name, label, value) => name + '：參數 ' + label + '="' + value + '" 無效。',
    pauseBeforeApplyingParameters: (name) => name + '：請先暫停模擬，再套用已儲存參數。',
    idealRuntimeAlreadyApplied: (name) => name + '：理想執行階段已使用目前儲存參數，無需重新套用。',
    noSavedParameterChanges: (name) => name + '：沒有需要套用的已儲存參數變更。',
    idealRuntimeApplied: (name, relation, keys) => name + '：已為 ' + relation + ' 套用理想執行階段；變更參數：' + keys + '。',
    standardParametersApplied: (name, action) => name + '：參數已' + action + '；執行階段已重建，可開始執行。',
    parametersSavedAndApplied: '儲存並套用',
    parametersApplied: '套用',
    runtimeCreateFailed: (name, kind) => name + '：未能建立' + kind + '執行階段。',
    standardStarted: (name) => name + '：標準模擬已啟動，3D 預覽正在即時更新。',
    idealStarted: (name, relation) => name + '：' + relation + ' 採樣執行已啟動。',
    simulationPaused: (name, kind) => name + '：' + kind + '已暫停。',
    standardTerminated: (name) => name + '：標準模擬已終止並返回初始狀態。',
    idealTerminated: (name) => name + '：理想氣體模擬已終止並返回初始狀態。',
    standardReset: (name) => name + '：標準執行階段已重置。',
    idealReset: (name, relation) => name + '：' + relation + ' 理想執行階段已重置。',
    panelOpened: (name, panel) => name + '：已開啟面板 ' + panel + '。',
    panelClosed: (name, panel) => name + '：已關閉面板 ' + panel + '。',
    pauseBeforeSwitchingRelation: (name) => name + '：請先暫停目前理想氣體執行，再切換關係。',
    relationAlreadyActive: (name, relation) => name + '：' + relation + ' 已是目前關係。',
    relationSwitched: (name, relation) => name + '：已切換到 ' + relation + ' 關係。',
    pauseBeforeChangingSamplingPreset: (name) => name + '：請先暫停目前理想氣體執行，再更改採樣預設。',
    pauseBeforeChangingScanVariable: (name) => name + '：請先暫停目前理想氣體執行，再更改掃描變量。',
    confirmRemoveIdealPoint: (name, relation) => name + '：點擊確認移除以刪除此 ' + relation + ' 點。',
    idealPointRemoved: (name) => name + '：已移除理想氣體實驗點。',
    relationHasNoPoints: (name, relation) => name + '：' + relation + ' 沒有可清空的點。',
    scanInputRequired: (key, format) => key + ' 需要輸入' + format + '。',
    scanInputIntegerOnly: 'N 只支援正整數輸入。N 的最小步長為 1。',
    scanInputDecimalOnly: (key) => key + ' 只支援普通小數輸入。',
    scanInputGreaterThanZero: (key) => key + ' 必須大於 0。',
    scanInputStep: (label, step) => label + ' 的最小步長為 ' + step + '。',
    scanInputRange: (key, min, max) => key + ' 必須保持在 ' + min + ' 到 ' + max + ' 之間。',
    formatPositiveInteger: '正整數',
    formatDecimalNumber: '小數',
  },
  en: {
    undoAction: (label) => 'Undo: ' + label,
    redoAction: (label) => 'Redo: ' + label,
    editHistoryCleared: 'Edit history cleared.',
    layoutSaveNeedsFile: 'Create or open a workbench file before saving layout defaults.',
    layoutDefaultSaved: (name) => name + ': current window layout saved as the default.',
    standardFinished: (name) => name + ': standard simulation finished and final chart data is ready.',
    standardResultsReady: (name) => name + ': results are ready. Open Results from the Panels list to review summary, data, and figures.',
    idealPointRecorded: (name, relation, value) => name + ': recorded ' + relation + ' point at ' + value + '.',
    idealPointMissingSummary: (name) => name + ': ideal-gas run finished, but pressure summary was not ready for a point.',
    controlledVariablesLocked: (name, relation, keys) => name + ': controlled variables are locked while the ' + relation + ' data table has rows. Clear the table before changing ' + keys + '.',
    pauseBeforeEditingParameters: (name) => name + ': pause the simulation before editing parameters.',
    invalidParameter: (name, label, value) => name + ': invalid parameter ' + label + '="' + value + '".',
    pauseBeforeApplyingParameters: (name) => name + ': pause the simulation before applying saved parameters.',
    idealRuntimeAlreadyApplied: (name) => name + ': ideal runtime is already applied for the saved parameters.',
    noSavedParameterChanges: (name) => name + ': no saved parameter changes to apply.',
    idealRuntimeApplied: (name, relation, keys) => name + ': ideal runtime applied for ' + relation + '; changed keys: ' + keys + '.',
    standardParametersApplied: (name, action) => name + ': parameters ' + action + '; runtime rebuilt and ready to run.',
    parametersSavedAndApplied: 'saved and applied',
    parametersApplied: 'applied',
    runtimeCreateFailed: (name, kind) => name + ': failed to create a ' + kind + ' runtime.',
    standardStarted: (name) => name + ': standard simulation started with live 3D preview.',
    idealStarted: (name, relation) => name + ': ' + relation + ' sample run started.',
    simulationPaused: (name, kind) => name + ': ' + kind + ' paused.',
    standardTerminated: (name) => name + ': standard simulation terminated and returned to its start state.',
    idealTerminated: (name) => name + ': ideal-gas simulation terminated and returned to its start state.',
    standardReset: (name) => name + ': standard runtime reset.',
    idealReset: (name, relation) => name + ': ideal runtime reset for ' + relation + '.',
    panelOpened: (name, panel) => name + ': opened panel ' + panel + '.',
    panelClosed: (name, panel) => name + ': closed panel ' + panel + '.',
    pauseBeforeSwitchingRelation: (name) => name + ': pause the current ideal run before switching relation.',
    relationAlreadyActive: (name, relation) => name + ': ' + relation + ' is already active.',
    relationSwitched: (name, relation) => name + ': switched to ' + relation + ' relation.',
    pauseBeforeChangingSamplingPreset: (name) => name + ': pause the current ideal run before changing sampling preset.',
    pauseBeforeChangingScanVariable: (name) => name + ': pause the current ideal run before changing the scan variable.',
    confirmRemoveIdealPoint: (name, relation) => name + ': click Confirm Remove to remove this ' + relation + ' point.',
    idealPointRemoved: (name) => name + ': ideal experiment point removed.',
    relationHasNoPoints: (name, relation) => name + ': ' + relation + ' has no points to clear.',
    scanInputRequired: (key, format) => key + ' requires a ' + format + '.',
    scanInputIntegerOnly: 'N only supports positive integer input. N minimum step is 1.',
    scanInputDecimalOnly: (key) => key + ' only supports ordinary decimal input.',
    scanInputGreaterThanZero: (key) => key + ' must be greater than 0.',
    scanInputStep: (label, step) => label + ' minimum step is ' + step + '.',
    scanInputRange: (key, min, max) => key + ' must stay between ' + min + ' and ' + max + '.',
    formatPositiveInteger: 'positive integer',
    formatDecimalNumber: 'decimal number',
  },
} satisfies Record<WorkbenchLanguagePreference, WorkbenchExperimentLogCopy>;

const LOCKED_PANEL_KEYS: WorkbenchPanelKey[] = ['preview', 'realtime'];
const LEFT_SIDEBAR_MIN = 220;
const LEFT_SIDEBAR_MAX = 420;
const PARAM_SIDEBAR_MIN = 240;
const PARAM_SIDEBAR_MAX = 420;
const EDIT_HISTORY_LIMIT = 50;
const SIMULATION_TICK_INTERVAL_MS = 16;
const IDEAL_ADVANCED_SCROLL_DURATION_MS = 420;
const IDEAL_SCAN_THUMB_SIZE = 13;
const IDEAL_SCAN_THUMB_HIT_RADIUS = 9.1;
const IDEAL_SCAN_SNAP_THRESHOLD: Record<ExperimentRelation, number> = {
  pt: 0.04,
  pv: 0.25,
  pn: 8,
};
const IDEAL_RESULT_MIN_HEIGHT_RATIO = 0.25;
const IDEAL_RESULT_MAX_HEIGHT_RATIO = 1;
const HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO = IDEAL_RESULT_MIN_HEIGHT_RATIO;
const STANDARD_RESULTS_BOTTOM_INSET = 10;
const RESIZER_GRAB_SAFE_SPACE = 14;
const IDEAL_RESULT_WINDOW_DEFAULTS_STORAGE_KEY = 'hsl_workbench_ideal_result_window_defaults';
const WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY = 'hsl_workbench_layout_defaults_v1';
const WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY = 'hsl_workbench_general_settings_v2';
const WORKBENCH_IGNORED_UPDATE_VERSION_KEY = 'hslIgnoredUpdateVersion';
const HEAT_CAPACITY_AUTO_DEMO_RESET_MS = 1_800;
const HEAT_CAPACITY_AUTO_DEMO_STEP_PANEL_EXIT_MS = 560;

const defaultWorkbenchGeneralSettings: WorkbenchGeneralSettings = {
  theme: 'system',
  language: 'zh-CN',
  performanceMode: DEFAULT_HEAT_CAPACITY_QUALITY_MODE,
};

const workbenchCopies: Record<WorkbenchLanguagePreference, WorkbenchCopy> = {
  'zh-CN': {
    menus: {
      newStudy: '新建研究', experimentFiles: '实验文件', newWindow: '新窗口', newExperiment: '新建实验', openExperiment: '打开实验', noCachedExperiments: '没有可打开的缓存实验', edit: '编辑', window: '窗口', settings: '设置', help: '帮助', general: '通用',
      standardStudy: '标准模拟研究', idealStudy: '理想气体模拟研究', heatCapacityStudy: '空气比热容比实验', undo: '撤销', redo: '重做', empty: '空',
      clearEditHistory: '清空编辑历史', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '恢复默认布局', default: '默认',
      performanceMode: '3D 性能模式', exportEnvironment: '导出环境', saveWorkbenchLayoutDefault: '保存当前窗口布局为默认',
      userGuide: '用户指南', theoryPdf: '理论文档 PDF', about: '关于热容比实验室', topCommandsAria: '顶部命令',
    },
    settings: {
      title: '通用设置', subtitle: '主题、语言、快捷键和布局偏好', closeAria: '关闭通用设置', theme: '主题', themeHint: '使用系统、亮色或暗色模式',
      themeOptions: { system: { label: '跟随系统', hint: '遵循系统偏好' }, light: { label: '亮色', hint: '亮色工作区预览' }, dark: { label: '暗色', hint: '暗色工作区预览' } },
      language: '语言', languageHint: '选择界面语言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '简体中文界面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D 性能模式',
      performanceModeHint: '用四档模式控制 Heat Capacity 小球数量、速率和运行负载',
      performanceModeSummary: { lowLoad: '低负载', balanced: '均衡', highPerformance: '高性能', ultra: '极致画质' },
    },
    about: {
      title: '关于热容比实验室',
      subtitle: '热容比实验室',
      closeAria: '关闭关于窗口',
      currentVersion: '当前版本',
      checkUpdates: '检查更新',
      localDataExportEnvironment: '本地数据导出环境',
      workspaceSessionCache: '工作区会话缓存',
      buildNotes: '构建说明',
      updateNotConfigured: '更新通道尚未配置',
      checking: '正在检查',
      available: '可用',
      unavailable: '不可用',
      error: '检查失败',
      environmentResultTitle: '本地环境检查完成',
      environmentResultAvailable: '本地数据导出环境可用。',
      environmentResultUnavailable: '本地数据导出环境不可用，当前环境不能直接导出 PDF / 图像。',
      environmentResultError: '本地数据导出环境检查失败。模拟、实时图表和结果预览仍可使用。',
      updateResultTitle: '更新检查完成',
      updateResultBody: '更新通道尚未配置，当前仅显示占位结果。',
      updateAvailableTitle: '发现可用更新',
      updateAvailableBody: '新版本已发布，可以立即下载并准备安装。',
      updateReadyTitle: '更新已下载',
      updateReadyBody: '重启应用后会安装新版本。',
      currentVersionLabel: '当前版本',
      latestVersionLabel: '最新版本',
      releaseDateLabel: '发布时间',
      releaseNotesLabel: '更新说明',
      noReleaseNotes: '该版本没有附加更新说明。',
      ignoreThisVersion: '忽略此版本',
      updateNow: '立即更新',
      restartAndInstall: '重启并安装',
      later: '稍后',
      ignoredVersionTitle: '已忽略此版本',
      ignoredVersionBody: (version) => '版本 ' + version + ' 不会再主动提醒。',
      updateAvailableStatus: (version) => '发现 ' + version,
      upToDateStatus: '已是最新版本',
      unsupportedUpdateStatus: '仅桌面安装版可用',
      downloadingUpdateStatus: (percent) => '正在下载' + (percent === null ? '' : ' ' + Math.round(percent) + '%'),
      retryingUpdateStatus: (attempt, maxAttempts) => '网络波动，正在重试下载' + (attempt && maxAttempts ? '（' + attempt + '/' + maxAttempts + '）' : '') + '...',
      updateReadyStatus: '更新已准备好',
      updateErrorStatus: '检查失败',
      updateDownloadFailedStatus: (attempt, maxAttempts) => '自动更新失败' + (attempt && maxAttempts ? '，已重试 ' + attempt + '/' + maxAttempts + ' 次' : '') + '。可以稍后重试或手动下载安装包。',
      retryDownload: '重试下载',
      manualDownload: '手动下载',
      buildPlaceholder: '版权和构建说明预留到正式发布前补充。',
      sessionCacheSummary: (total) => '当前会话包含 ' + total + ' 个实验文件',
      sessionCacheBreakdown: (ideal, heat, standard) => '理想/比热/标准：' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: '打开文件', files: '文件', panels: '面板', noOpenFiles: '没有打开的文件', noOpenFileState: '当前没有打开的实验文件', noOpenPanelState: '打开实验后显示可用面板。', emptyHint: '在主工作区新建或打开实验。',
      noOpenStudy: '没有打开的研究', emptyTitle: '开始新的实验工作区', emptyBody: '创建标准模拟、理想气体关系研究或空气比热容比实验，以恢复预览、图表、结果和参数面板。',
      createStandard: '创建标准模拟研究', createIdeal: '创建理想气体模拟研究', createHeatCapacity: '创建空气比热容比实验', rename: '重命名', delete: '删除', confirmDelete: '确认删除', closeExperiment: '关闭实验', confirmCloseRunningExperiment: (name) => '实验正在运行。确认关闭 ' + name + ' 吗？', cancel: '取消',
      locked: '锁定', shown: '显示', open: '打开', active: '活动', off: '关闭', std: '标准', ideal: '理想', heat: '热容', workspaceAria: '文件工作区', openActions: (name) => '打开 ' + name + ' 的操作菜单',
    },
    panels: {
      previewTitle: '3D 预览', previewHint: '实时分子视口', realtimeTitle: '实时数据 / 图表', heatRealtimeTitle: '实时数据', standardRealtimeHint: '实时温度、压力和图表轨迹', idealRealtimeHint: '实时 T、P、关系和图表轨迹', heatRealtimeHint: 'Uₜ / Uₚ、压强和过程采样',
      standardResultsTitle: '结果', standardResultsHint: '实验状态、数据表和图像', idealResultsTitle: '结果', idealResultsHint: '验证图、历史解锁和导出详情',
      pointsTitle: '实验数据记录', pointsHint: '已记录的关系实验点', verificationTitle: '关系验证分析', verificationHint: '验证图、诊断和导出详情',
      summaryTitle: '摘要', dataTableTitle: '数据表', figuresTitle: '图像', liveWorkspaceResizeAria: '调整视图预览和实时数据区域大小',
    },
    parameters: {
      title: '当前参数', currentFileValues: '当前文件值', lockedUntilStopped: '停止或完成前锁定', editValues: '编辑参数值', hide: '隐藏',
      standardSimulation: '标准模拟', idealSimulation: '理想气体模拟', heatCapacityExperiment: '空气比热容比实验', savedChangesOnStart: '启动时已保存参数', idealRuntimeOnStart: '理想运行时将在开始时连接', applied: '参数已应用',
      relation: '关系', scanVariable: '扫描变量', samplingPreset: '采样预设', targetTemperature: '目标温度', boxLength: '盒长 L', particleCount: '粒子数 N', customPreset: '自定义', setSamplingPrecision: '设置采样精度', relationHints: { pt: '固定 N 和 V 扫描温度', pv: '通过盒长 L 扫描体积', pn: '固定 T 和 V 扫描粒子数' }, setScanValue: (title) => '设置' + title, adjustScanValue: (title) => '调整' + title, recommendedValues: (title) => title + '推荐值',
      parameterLabels: { N: '粒子数量', r: '粒子半径', L: '容器边长', m: '粒子质量', k: '玻尔兹曼常数', dt: '时间步长', nu: '碰撞频率', targetTemperature: '目标温度', equilibriumTime: '平衡时间', statsDuration: '统计时长', relation: '关系' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '稳定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 统计',
      advancedSettings: '高级设置', advancedShow: '显示模型常数和采样值', advancedHide: '隐藏模型常数和采样值', edit: '编辑', save: '保存', saveHint: '保存高级参数到当前工作台文件',
      standardReadonlyNote: '标准模拟参数在这里直接显示。', idealReadonlyNote: '关系、扫描变量和采样预设在上方控制。', heatCapacityReadonlyNote: '粒子动画仅用于可视化气体分子运动状态；最终比热容比按 FD-NCD-C 空气实验模型计算。', microscopicVisualization: '微观可视化', hardSphereView: '硬球可视化', hardSphereOn: '开', hardSphereOff: '关', hardSphereTeachingOnly: '只影响三维教学显示，不参与 Uₜ、Uₚ、U₀/U₁/U₂ 或 γ 计算。', controlledLockHint: '当前关系已有数据，受控变量已锁定。',
    },
    results: {
      title: '结果', experimentStatus: '实验状态', scan: '扫描', temperature: '温度', pressure: '压强', measuredPressure: '实测 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 点', pointsShort: (count) => count + ' 点', recordedPoints: (count) => count + ' 个记录点',
      clearRelation: '清空关系', confirmClear: '确认清空', remove: '移除', confirmRemove: '确认移除', cancel: '取消', noPoints: '没有点', runToRecord: '运行实验以记录点。', tableAction: '操作', tableTime: '时间',
      finalState: '最终状态', meanSpeed: '平均速度', measuredBars: '实测柱', idealLine: '理想线', samples: (count) => count + ' 个样本', sampleWindows: (count) => count + ' 次采样', waiting: '等待中', finalSpeedSamples: '最终速度样本', finalEnergySamples: '最终能量样本', tempHistorySamples: '温度历史样本', finalDataReady: '最终数据就绪', energyDrift: '能量漂移', meanAbsTempError: '平均绝对温度误差', tempSamples: '温度样本', resultsReady: (relation) => relation + ' 实验结果已就绪', waitingForRecordedPoints: (relation) => relation + ' 等待记录点',
      metric: '指标', value: '值', status: '状态', ready: '就绪', notReady: '未就绪', yes: '是', no: '否', diagnostic: '诊断', export: '导出', exportAll: '总导出', exportFigures: '导出图像', reportPdf: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV', verification: '验证', rawPv: '原始 P-V', history: '历史',
      resultReadyStatus: '结果就绪', resultNotReadyStatus: '结果未就绪', resultReadyDetail: '最终数据已捕获，可用于摘要、表格、图像和后续报告导出。', resultNotReadyDetail: '运行标准模拟，直到采集阶段结束后生成最终结果数据。', finalTime: '最终时间', finalTemperature: '最终温度', finalPressure: '最终压力', rmsSpeed: '均方根速度', speedBins: '速度分箱', energyBins: '能量分箱', notReadyPreview: '未就绪', figuresHint: '图像就绪状态、推荐文件名和预览。', noIdealPointsTitle: '没有理想气体点', noIdealPointsBody: '选择理想气体文件以查看实验点。', activeRelation: '当前关系', noIdealVerificationTitle: '没有验证图', noIdealVerificationBody: '验证图仅适用于理想气体文件。', historyLockedFor: (relation) => relation + ' 的历史内容已锁定', historyUnlocked: '已由验证通过的实验数据解锁。', historyUnlockHint: '通过一次成功验证后解锁。', historicalContext: '历史背景', workbenchInterpretation: '工作台解释', keyFigures: '关键数值', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / 斜率误差 ' + slopeError, whyLocked: '为什么锁定', whyItHappened: '原因说明', recommendedNextStep: '建议下一步', exportFilesHint: '导出环境和推荐文件。', pvLinearizedValidation: 'P - 1/V 线性化验证', relationValidation: (relation) => relation + ' 验证', measuredScatterHint: '实测散点、拟合线与理论参考。', originalPvPhysicalView: '原始 P - V 物理视图', originalPvPhysicalHint: '直接显示反比关系，判定仍使用线性化视图。', verdictLabel: (relation, verdict) => relation + ' 判定：' + verdict, pointsMetric: '点数', rSquared: 'R2', slope: '拟合斜率', theorySlope: '理论斜率', slopeError: '斜率误差', failureReason: '未通过原因', noneValue: '无', currentVerification: (rSquared, slopeError) => '当前验证：R2 ' + rSquared + '，斜率误差 ' + slopeError + '。', currentVerdictRecommendation: (verdict, recommendation) => '当前判定：' + verdict + '。建议：' + recommendation, noIdealHistoryTitle: '没有理想气体历史内容', noIdealHistoryBody: '理想气体验证通过后会解锁历史内容。', noVerificationChartTitle: '没有验证图', noVerificationChartBody: '验证图仅适用于理想气体文件。', panelNotConnectedTitle: '面板尚未连接', panelNotConnectedBody: '该面板将在后续工作台集成批次中接入。', measuredLegend: '实测', fitLegend: '拟合', theoryLegend: '理论', idealPressureTrace: (relation) => relation + ' 压强轨迹', currentIdealPressureHint: '运行当前理想气体点以采集压强窗口。', meanTemperature: '平均温度', relativeGap: '相对差值', samplingProgress: '采样进度', speedDistribution: '速度分布', energyDistribution: '能量分布', standardRealtimeEmpty: '运行标准模拟以生成实时图表数据。', phase: '阶段', phaseStates: { idle: '空闲', equilibrating: '热平衡中', collecting: '采集中', finished: '已完成' }, probabilityDensity: '概率密度', experimentPointTableTitle: '没有实验点表', experimentPointTableBody: '实验点表仅适用于理想气体文件。', idealResultsSectionsAria: '理想气体结果分页', openIdealResultsTabTitle: '打开此理想气体结果分页。', verificationChartAria: (relation) => relation + ' 验证图', resultsTreeExpandAria: '展开结果分区', resultsTreeCollapseAria: '折叠结果分区', resultsOpenHint: '点击选择，双击打开。', resultsJumpHint: '双击打开结果并跳转到此分区。', figureStatus: { ready: '就绪', 'not-ready': '未就绪', 'not-applicable': '不适用' },
    },
    actions: { start: '开始', pause: '暂停', stop: '停止', close: '关闭', resetView: '默认视角', hide: '隐藏', cancel: '取消' },
    shortcuts: { title: '快捷键', hint: '常用工作台快捷键', undo: '撤销', redo: '重做', closeSettings: '关闭设置' },
    console: { title: '控制台 / 输出', tabs: { logs: '日志', warnings: '警告', summary: '摘要' }, total: '总计', info: '信息', success: '成功', warnings: '警告', errors: '错误', latest: '最新', runtime: '运行时', noLogs: '暂无日志。', noWarnings: '暂无警告或错误。' },
    status: { activeFile: (name) => '当前文件：' + name, selectedBlock: (name) => '选中板块：' + name, none: '无', noRuntime: '未连接运行时', standardRuntime: '标准运行时已连接', idealRuntime: (relation, verdict) => '理想运行时已连接 / ' + relation + ' / ' + verdict, runStates: { idle: '空闲', running: '运行中', paused: '已暂停', finished: '已完成', 'needs-reset': '需要重置' }, verdictStates: { insufficient: '数据不足', collecting: '采集中', verified: '已验证', failed: '未通过', preliminary: '初步成立', notYet: '尚未成立', 'not-started': '尚未开始' } },
    exportEnvironment: {
      checking: { label: '正在检查导出环境', detail: '正在检查本机 Python/Matplotlib 和内置导出器是否可用。' },
      'available-system': { label: '系统 Python 导出器可用', detail: '科学报告和图像导出将使用本机 Python/Matplotlib 环境。' },
      'available-bundled': { label: '内置导出器可用', detail: '科学报告和图像导出将使用桌面程序随附的导出器。' },
      unavailable: { label: '桌面导出桥接不可用', detail: '当前环境不能直接导出 PDF/图像。请在热容比实验室桌面程序中使用本地导出。' },
      error: { label: '导出环境异常', detail: '导出器检测失败。模拟、实时图表和结果预览仍可使用。' },
    },
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '默认布局：3D 预览、实时数据 / 图表、当前参数。', standardConnected: '标准模拟运行时、3D 预览和实时图表数据已连接。', exportBridgeRequired: '科学 PDF 导出需要桌面运行时桥接。', autoPausedSingleRuntime: (name) => name + '：由于一次只能运行一个工作台运行时，已自动暂停。', autoPausedCreateFile: (name) => name + '：创建新文件时已自动暂停。', autoPausedSwitchFile: (name) => name + '：切换文件时已自动暂停。', fileCreated: (name) => '已创建工作台文件：' + name, mockAction: (label) => '模拟操作：' + label, lockedPanel: (title) => title + ' 是默认工作区的一部分，不能隐藏。', layoutReset: (name) => name + '：布局已恢复为 3D 预览 + 实时数据 / 图表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 打开理想结果窗口。', standardResultsOpened: (name, tab) => name + '：已打开结果窗口并切换到 ' + tab + '。', idealResultsClosed: (name) => name + '：已关闭理想结果窗口。', fileSelected: (name) => '已选择文件标签：' + name, confirmClear: (name, relation) => name + '：点击确认清空以删除全部 ' + relation + ' 点。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 点。', exportLabels: { completeBundle: '总导出', report: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV', figuresZip: '结果图像' }, exportNotReady: (name) => name + '：结果数据尚未满足导出条件。', exportNeedsTwoPoints: (name) => name + '：拟合报告或验证图至少需要 2 个记录点。', exportPayloadPrepared: (name, label, filename, detail) => name + '：' + label + ' 载荷已准备为 ' + filename + '；' + detail, exportPreparing: (name, label) => name + '：正在准备导出 ' + label + '。', exportCancelled: (name, label) => name + '：已取消导出 ' + label + '。', exportFailed: (name, label, message) => name + '：' + label + ' 导出失败：' + message, exportCsvSaved: (name, target) => name + '：点 CSV 已保存到 ' + target + '。', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + '：' + label + ' 已导出到 ' + outDir + '（' + fileCount + ' 个文件）。' + figureHint, exportFigureHint: '图像文件位于 figures 子文件夹内。', unknownExporterError: '未知导出器错误', selectedLocation: '选定位置', selectedFolder: '选定文件夹', fileNameCannotBeEmpty: '文件名不能为空。', fileNameUnchanged: (name) => name + '：名称未改变。', fileRenamed: (name) => '工作台文件已重命名为 ' + name + '。', fileRemoved: (name) => name + '：已从当前工作台会话移除。', fileClosed: (name) => name + '：已关闭并保留在本地缓存。', fileOpenedFromCache: (name) => '已从本地缓存打开实验：' + name, confirmDeleteFile: (name) => name + '：点击确认删除以从工作台会话移除此打开文件。', layoutAlreadyDefault: (name) => name + '：布局已经使用默认面板。', ...experimentLogCopies['zh-CN'] },
  },
  'zh-TW': {
    menus: {
      newStudy: '新增研究', experimentFiles: '實驗檔案', newWindow: '新視窗', newExperiment: '新增實驗', openExperiment: '開啟實驗', noCachedExperiments: '沒有可開啟的快取實驗', edit: '編輯', window: '視窗', settings: '設定', help: '說明', general: '一般',
      standardStudy: '標準模擬研究', idealStudy: '理想氣體模擬研究', heatCapacityStudy: '空氣比熱容比實驗', undo: '復原', redo: '重做', empty: '空',
      clearEditHistory: '清除編輯記錄', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '還原預設版面', default: '預設',
      performanceMode: '3D 效能模式', exportEnvironment: '匯出環境', saveWorkbenchLayoutDefault: '將目前視窗版面存為預設',
      userGuide: '使用指南', theoryPdf: '理論文件 PDF', about: '關於熱容比實驗室', topCommandsAria: '頂部命令',
    },
    settings: {
      title: '一般設定', subtitle: '主題、語言、快捷鍵與版面偏好', closeAria: '關閉一般設定', theme: '主題', themeHint: '使用系統、亮色或暗色模式',
      themeOptions: { system: { label: '跟隨系統', hint: '依照系統偏好' }, light: { label: '亮色', hint: '亮色工作區預覽' }, dark: { label: '暗色', hint: '暗色工作區預覽' } },
      language: '語言', languageHint: '選擇介面語言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '簡體中文介面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D 效能模式',
      performanceModeHint: '用四檔模式控制 Heat Capacity 小球數量、速率和運行負載',
      performanceModeSummary: { lowLoad: '低負載', balanced: '均衡', highPerformance: '高效能', ultra: '極致畫質' },
    },
    about: {
      title: '關於熱容比實驗室',
      subtitle: '熱容比實驗室',
      closeAria: '關閉關於視窗',
      currentVersion: '目前版本',
      checkUpdates: '檢查更新',
      localDataExportEnvironment: '本地資料匯出環境',
      workspaceSessionCache: '工作區工作階段快取',
      buildNotes: '建置說明',
      updateNotConfigured: '更新通道尚未配置',
      checking: '正在檢查',
      available: '可用',
      unavailable: '不可用',
      error: '檢查失敗',
      environmentResultTitle: '本地環境檢查完成',
      environmentResultAvailable: '本地資料匯出環境可用。',
      environmentResultUnavailable: '本地資料匯出環境不可用，目前環境不能直接匯出 PDF / 圖像。',
      environmentResultError: '本地資料匯出環境檢查失敗。模擬、即時圖表和結果預覽仍可使用。',
      updateResultTitle: '更新檢查完成',
      updateResultBody: '更新通道尚未配置，目前僅顯示佔位結果。',
      updateAvailableTitle: '發現可用更新',
      updateAvailableBody: '新版本已發布，可以立即下載並準備安裝。',
      updateReadyTitle: '更新已下載',
      updateReadyBody: '重新啟動應用程式後會安裝新版本。',
      currentVersionLabel: '目前版本',
      latestVersionLabel: '最新版本',
      releaseDateLabel: '發布時間',
      releaseNotesLabel: '更新說明',
      noReleaseNotes: '此版本沒有附加更新說明。',
      ignoreThisVersion: '忽略此版本',
      updateNow: '立即更新',
      restartAndInstall: '重新啟動並安裝',
      later: '稍後',
      ignoredVersionTitle: '已忽略此版本',
      ignoredVersionBody: (version) => '版本 ' + version + ' 不會再主動提醒。',
      updateAvailableStatus: (version) => '發現 ' + version,
      upToDateStatus: '已是最新版本',
      unsupportedUpdateStatus: '僅桌面安裝版可用',
      downloadingUpdateStatus: (percent) => '正在下載' + (percent === null ? '' : ' ' + Math.round(percent) + '%'),
      retryingUpdateStatus: (attempt, maxAttempts) => '網路波動，正在重試下載' + (attempt && maxAttempts ? '（' + attempt + '/' + maxAttempts + '）' : '') + '...',
      updateReadyStatus: '更新已準備好',
      updateErrorStatus: '檢查失敗',
      updateDownloadFailedStatus: (attempt, maxAttempts) => '自動更新失敗' + (attempt && maxAttempts ? '，已重試 ' + attempt + '/' + maxAttempts + ' 次' : '') + '。可以稍後重試或手動下載安裝程式。',
      retryDownload: '重試下載',
      manualDownload: '手動下載',
      buildPlaceholder: '版權和建置說明預留到正式發布前補充。',
      sessionCacheSummary: (total) => '目前工作階段包含 ' + total + ' 個實驗檔案',
      sessionCacheBreakdown: (ideal, heat, standard) => '理想/熱容比/標準：' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: '開啟檔案', files: '檔案', panels: '面板', noOpenFiles: '沒有開啟的檔案', noOpenFileState: '目前沒有開啟的實驗檔案', noOpenPanelState: '開啟實驗後顯示可用面板。', emptyHint: '在主工作區建立或開啟實驗。',
      noOpenStudy: '沒有開啟的研究', emptyTitle: '開始新的實驗工作區', emptyBody: '建立標準模擬、理想氣體關係研究或空氣比熱容比實驗，以恢復預覽、圖表、結果和參數面板。',
      createStandard: '建立標準模擬研究', createIdeal: '建立理想氣體模擬研究', createHeatCapacity: '建立空氣比熱容比實驗', rename: '重新命名', delete: '刪除', confirmDelete: '確認刪除', closeExperiment: '關閉實驗', confirmCloseRunningExperiment: (name) => '實驗正在執行。確認關閉 ' + name + ' 嗎？', cancel: '取消',
      locked: '鎖定', shown: '顯示', open: '開啟', active: '作用中', off: '關閉', std: '標準', ideal: '理想', heat: '熱容', workspaceAria: '檔案工作區', openActions: (name) => '開啟 ' + name + ' 的操作選單',
    },
    panels: {
      previewTitle: '3D 預覽', previewHint: '即時分子視口', realtimeTitle: '即時資料 / 圖表', heatRealtimeTitle: '即時資料', standardRealtimeHint: '即時溫度、壓力和圖表軌跡', idealRealtimeHint: '即時 T、P、關係和圖表軌跡', heatRealtimeHint: 'Uₜ / Uₚ、壓強和過程採樣',
      standardResultsTitle: '結果', standardResultsHint: '實驗狀態、資料表和圖像', idealResultsTitle: '結果', idealResultsHint: '驗證圖、歷史解鎖和匯出詳情',
      pointsTitle: '實驗資料記錄', pointsHint: '已記錄的關係實驗點', verificationTitle: '關係驗證分析', verificationHint: '驗證圖、診斷和匯出詳情',
      summaryTitle: '摘要', dataTableTitle: '資料表', figuresTitle: '圖像', liveWorkspaceResizeAria: '調整視圖預覽和即時資料區域大小',
    },
    parameters: {
      title: '目前參數', currentFileValues: '目前檔案值', lockedUntilStopped: '停止或完成前鎖定', editValues: '編輯參數值', hide: '隱藏',
      standardSimulation: '標準模擬', idealSimulation: '理想氣體模擬', heatCapacityExperiment: '空氣比熱容比實驗', savedChangesOnStart: '啟動時已儲存參數', idealRuntimeOnStart: '理想執行階段將在開始時連接', applied: '參數已套用',
      relation: '關係', scanVariable: '掃描變量', samplingPreset: '採樣預設', targetTemperature: '目標溫度', boxLength: '盒長 L', particleCount: '粒子數 N', customPreset: '自訂', setSamplingPrecision: '設定採樣精度', relationHints: { pt: '固定 N 和 V 掃描溫度', pv: '透過盒長 L 掃描體積', pn: '固定 T 和 V 掃描粒子數' }, setScanValue: (title) => '設定' + title, adjustScanValue: (title) => '調整' + title, recommendedValues: (title) => title + '建議值',
      parameterLabels: { N: '粒子數量', r: '粒子半徑', L: '容器邊長', m: '粒子質量', k: '波茲曼常數', dt: '時間步長', nu: '碰撞頻率', targetTemperature: '目標溫度', equilibriumTime: '平衡時間', statsDuration: '統計時長', relation: '關係' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '穩定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 統計',
      advancedSettings: '進階設定', advancedShow: '顯示模型常數和採樣值', advancedHide: '隱藏模型常數和採樣值', edit: '編輯', save: '儲存', saveHint: '將進階參數儲存到目前工作台檔案',
      standardReadonlyNote: '標準模擬參數在這裡直接顯示。', idealReadonlyNote: '關係、掃描變量和採樣預設在上方控制。', heatCapacityReadonlyNote: '粒子動畫僅用於視覺化氣體分子運動狀態；最終比熱容比按 FD-NCD-C 空氣實驗模型計算。', microscopicVisualization: '微觀可視化', hardSphereView: '硬球可視化', hardSphereOn: '開', hardSphereOff: '關', hardSphereTeachingOnly: '只影響三維教學顯示，不參與 Uₜ、Uₚ、U₀/U₁/U₂ 或 γ 計算。', controlledLockHint: '目前關係已有資料，受控變量已鎖定。',
    },
    results: {
      title: '結果', experimentStatus: '實驗狀態', scan: '掃描', temperature: '溫度', pressure: '壓強', measuredPressure: '實測 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 點', pointsShort: (count) => count + ' 點', recordedPoints: (count) => count + ' 個記錄點',
      clearRelation: '清空關係', confirmClear: '確認清空', remove: '移除', confirmRemove: '確認移除', cancel: '取消', noPoints: '沒有點', runToRecord: '執行實驗以記錄點。', tableAction: '操作', tableTime: '時間',
      finalState: '最終狀態', meanSpeed: '平均速度', measuredBars: '實測柱', idealLine: '理想線', samples: (count) => count + ' 個樣本', sampleWindows: (count) => count + ' 次採樣', waiting: '等待中', finalSpeedSamples: '最終速度樣本', finalEnergySamples: '最終能量樣本', tempHistorySamples: '溫度歷史樣本', finalDataReady: '最終資料就緒', energyDrift: '能量漂移', meanAbsTempError: '平均絕對溫度誤差', tempSamples: '溫度樣本', resultsReady: (relation) => relation + ' 實驗結果已就緒', waitingForRecordedPoints: (relation) => relation + ' 等待記錄點',
      metric: '指標', value: '值', status: '狀態', ready: '就緒', notReady: '未就緒', yes: '是', no: '否', diagnostic: '診斷', export: '匯出', exportAll: '總匯出', exportFigures: '匯出圖像', reportPdf: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV', verification: '驗證', rawPv: '原始 P-V', history: '歷史',
      resultReadyStatus: '結果就緒', resultNotReadyStatus: '結果未就緒', resultReadyDetail: '最終資料已擷取，可用於摘要、表格、圖像和後續報告匯出。', resultNotReadyDetail: '執行標準模擬，直到採集階段結束後產生最終結果資料。', finalTime: '最終時間', finalTemperature: '最終溫度', finalPressure: '最終壓力', rmsSpeed: '均方根速度', speedBins: '速度分箱', energyBins: '能量分箱', notReadyPreview: '未就緒', figuresHint: '圖像就緒狀態、建議檔名和預覽。', noIdealPointsTitle: '沒有理想氣體點', noIdealPointsBody: '選擇理想氣體檔案以查看實驗點。', activeRelation: '目前關係', noIdealVerificationTitle: '沒有驗證圖', noIdealVerificationBody: '驗證圖僅適用於理想氣體檔案。', historyLockedFor: (relation) => relation + ' 的歷史內容已鎖定', historyUnlocked: '已由驗證通過的實驗資料解鎖。', historyUnlockHint: '通過一次成功驗證後解鎖。', historicalContext: '歷史背景', workbenchInterpretation: '工作台解釋', keyFigures: '關鍵數值', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / 斜率誤差 ' + slopeError, whyLocked: '為什麼鎖定', whyItHappened: '原因說明', recommendedNextStep: '建議下一步', exportFilesHint: '匯出環境和建議檔案。', pvLinearizedValidation: 'P - 1/V 線性化驗證', relationValidation: (relation) => relation + ' 驗證', measuredScatterHint: '實測散點、擬合線與理論參考。', originalPvPhysicalView: '原始 P - V 物理視圖', originalPvPhysicalHint: '直接顯示反比關係，判定仍使用線性化視圖。', verdictLabel: (relation, verdict) => relation + ' 判定：' + verdict, pointsMetric: '點數', rSquared: 'R2', slope: '擬合斜率', theorySlope: '理論斜率', slopeError: '斜率誤差', failureReason: '未通過原因', noneValue: '無', currentVerification: (rSquared, slopeError) => '目前驗證：R2 ' + rSquared + '，斜率誤差 ' + slopeError + '。', currentVerdictRecommendation: (verdict, recommendation) => '目前判定：' + verdict + '。建議：' + recommendation, noIdealHistoryTitle: '沒有理想氣體歷史內容', noIdealHistoryBody: '理想氣體驗證通過後會解鎖歷史內容。', noVerificationChartTitle: '沒有驗證圖', noVerificationChartBody: '驗證圖僅適用於理想氣體檔案。', panelNotConnectedTitle: '面板尚未連接', panelNotConnectedBody: '該面板將在後續工作台整合批次中接入。', measuredLegend: '實測', fitLegend: '擬合', theoryLegend: '理論', idealPressureTrace: (relation) => relation + '壓強軌跡', currentIdealPressureHint: '執行目前理想氣體點以採集壓強窗口。', meanTemperature: '平均溫度', relativeGap: '相對差值', samplingProgress: '採樣進度', speedDistribution: '速度分布', energyDistribution: '能量分布', standardRealtimeEmpty: '執行標準模擬以產生即時圖表資料。', phase: '階段', phaseStates: { idle: '閒置', equilibrating: '熱平衡中', collecting: '採集中', finished: '已完成' }, probabilityDensity: '機率密度', experimentPointTableTitle: '沒有實驗點表', experimentPointTableBody: '實驗點表僅適用於理想氣體檔案。', idealResultsSectionsAria: '理想氣體結果分頁', openIdealResultsTabTitle: '開啟此理想氣體結果分頁。', verificationChartAria: (relation) => relation + ' 驗證圖', resultsTreeExpandAria: '展開結果分區', resultsTreeCollapseAria: '摺疊結果分區', resultsOpenHint: '點選選取，雙擊開啟。', resultsJumpHint: '雙擊開啟結果並跳至此分區。', figureStatus: { ready: '就緒', 'not-ready': '未就緒', 'not-applicable': '不適用' },
    },
    actions: { start: '開始', pause: '暫停', stop: '停止', close: '關閉', resetView: '預設視角', hide: '隱藏', cancel: '取消' },
    shortcuts: { title: '快捷鍵', hint: '常用工作台快捷鍵', undo: '復原', redo: '重做', closeSettings: '關閉設定' },
    console: { title: '控制台 / 輸出', tabs: { logs: '日誌', warnings: '警告', summary: '摘要' }, total: '總計', info: '資訊', success: '成功', warnings: '警告', errors: '錯誤', latest: '最新', runtime: '執行階段', noLogs: '暫無日誌。', noWarnings: '暫無警告或錯誤。' },
    status: { activeFile: (name) => '目前檔案：' + name, selectedBlock: (name) => '選取區塊：' + name, none: '無', noRuntime: '未連接執行階段', standardRuntime: '標準執行階段已連接', idealRuntime: (relation, verdict) => '理想執行階段已連接 / ' + relation + ' / ' + verdict, runStates: { idle: '閒置', running: '執行中', paused: '已暫停', finished: '已完成', 'needs-reset': '需要重置' }, verdictStates: { insufficient: '資料不足', collecting: '採集中', verified: '已驗證', failed: '未通過', preliminary: '初步成立', notYet: '尚未成立', 'not-started': '尚未開始' } },
    exportEnvironment: {
      checking: { label: '正在檢查匯出環境', detail: '正在檢查本機 Python/Matplotlib 和內建匯出器是否可用。' },
      'available-system': { label: '系統 Python 匯出器可用', detail: '科學報告和圖像匯出將使用本機 Python/Matplotlib 環境。' },
      'available-bundled': { label: '內建匯出器可用', detail: '科學報告和圖像匯出將使用桌面程式隨附的匯出器。' },
      unavailable: { label: '桌面匯出橋接不可用', detail: '目前環境不能直接匯出 PDF/圖像。請在熱容比實驗室桌面程式中使用本地匯出。' },
      error: { label: '匯出環境異常', detail: '匯出器偵測失敗。模擬、即時圖表和結果預覽仍可使用。' },
    },
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '預設版面：3D 預覽、即時資料 / 圖表、目前參數。', standardConnected: '標準模擬執行階段、3D 預覽和即時圖表資料已連接。', exportBridgeRequired: '科學 PDF 匯出需要桌面執行階段橋接。', autoPausedSingleRuntime: (name) => name + '：由於一次只能執行一個工作台執行階段，已自動暫停。', autoPausedCreateFile: (name) => name + '：建立新檔案時已自動暫停。', autoPausedSwitchFile: (name) => name + '：切換檔案時已自動暫停。', fileCreated: (name) => '已建立工作台檔案：' + name, mockAction: (label) => '模擬操作：' + label, lockedPanel: (title) => title + ' 是預設工作區的一部分，不能隱藏。', layoutReset: (name) => name + '：版面已還原為 3D 預覽 + 即時資料 / 圖表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 開啟理想結果視窗。', standardResultsOpened: (name, tab) => name + '：已開啟結果視窗並切換到 ' + tab + '。', idealResultsClosed: (name) => name + '：已關閉理想結果視窗。', fileSelected: (name) => '已選擇檔案分頁：' + name, confirmClear: (name, relation) => name + '：點擊確認清空以刪除全部 ' + relation + ' 點。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 點。', exportLabels: { completeBundle: '總匯出', report: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV', figuresZip: '結果圖像' }, exportNotReady: (name) => name + '：結果資料尚未滿足匯出條件。', exportNeedsTwoPoints: (name) => name + '：擬合報告或驗證圖至少需要 2 個記錄點。', exportPayloadPrepared: (name, label, filename, detail) => name + '：' + label + ' 載荷已準備為 ' + filename + '；' + detail, exportPreparing: (name, label) => name + '：正在準備匯出 ' + label + '。', exportCancelled: (name, label) => name + '：已取消匯出 ' + label + '。', exportFailed: (name, label, message) => name + '：' + label + ' 匯出失敗：' + message, exportCsvSaved: (name, target) => name + '：點 CSV 已儲存到 ' + target + '。', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + '：' + label + ' 已匯出到 ' + outDir + '（' + fileCount + ' 個檔案）。' + figureHint, exportFigureHint: '圖像檔案位於 figures 子資料夾內。', unknownExporterError: '未知匯出器錯誤', selectedLocation: '選定位置', selectedFolder: '選定資料夾', fileNameCannotBeEmpty: '檔案名稱不能為空。', fileNameUnchanged: (name) => name + '：名稱未改變。', fileRenamed: (name) => '工作台檔案已重新命名為 ' + name + '。', fileRemoved: (name) => name + '：已從目前工作台工作階段移除。', fileClosed: (name) => name + '：已關閉並保留在本機快取。', fileOpenedFromCache: (name) => '已從本機快取開啟實驗：' + name, confirmDeleteFile: (name) => name + '：點擊確認刪除以從工作台工作階段移除此開啟檔案。', layoutAlreadyDefault: (name) => name + '：版面已經使用預設面板。', ...experimentLogCopies['zh-TW'] },
  },
  en: {
    menus: {
      newStudy: 'New Study', experimentFiles: 'Experiment Files', newWindow: 'New Window', newExperiment: 'New Experiment', openExperiment: 'Open Experiment', noCachedExperiments: 'No cached experiments to open', edit: 'Edit', window: 'Window', settings: 'Settings', help: 'Help', general: 'General',
      standardStudy: 'Standard Simulation Study', idealStudy: 'Ideal Gas Simulation Study', heatCapacityStudy: 'Heat Capacity Ratio Experiment', undo: 'Undo', redo: 'Redo', empty: 'empty',
      clearEditHistory: 'Clear Edit History', panelsFor: (name) => 'Panels for ' + name, resetDefaultLayout: 'Reset Default Layout', default: 'default',
      performanceMode: '3D Performance Mode', exportEnvironment: 'Export Environment', saveWorkbenchLayoutDefault: 'Save Current Window Layout as Default',
      userGuide: 'User Guide', theoryPdf: 'Theory Document PDF', about: 'About Heat Capacity Ratio Lab', topCommandsAria: 'Top commands',
    },
    settings: {
      title: 'General Settings', subtitle: 'Theme, language, shortcuts, and layout preferences', closeAria: 'Close General Settings', theme: 'Theme', themeHint: 'Use system, light, or dark mode',
      themeOptions: { system: { label: 'System', hint: 'Follow OS preference' }, light: { label: 'Light', hint: 'Bright workspace preview' }, dark: { label: 'Dark', hint: 'Dark workspace preview' } },
      language: 'Language', languageHint: 'Choose the interface language',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: 'Simplified Chinese interface' }, 'zh-TW': { label: '繁體中文', hint: 'Traditional Chinese interface' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D performance mode',
      performanceModeHint: 'Use four modes to control Heat Capacity particle count, speed, and runtime load',
      performanceModeSummary: { lowLoad: 'Low load', balanced: 'Balanced', highPerformance: 'High performance', ultra: 'Ultra' },
    },
    about: {
      title: 'About Heat Capacity Ratio Lab',
      subtitle: 'Heat Capacity Ratio Lab',
      closeAria: 'Close About window',
      currentVersion: 'Current Version',
      checkUpdates: 'Check for Updates',
      localDataExportEnvironment: 'Local Data Export Environment',
      workspaceSessionCache: 'Workspace Session Cache',
      buildNotes: 'Build Notes',
      updateNotConfigured: 'Update channel is not configured',
      checking: 'Checking',
      available: 'Available',
      unavailable: 'Unavailable',
      error: 'Check failed',
      environmentResultTitle: 'Local Environment Check Complete',
      environmentResultAvailable: 'Local data export environment is available.',
      environmentResultUnavailable: 'Local data export environment is unavailable. This environment cannot directly export PDF / image files.',
      environmentResultError: 'Local data export environment check failed. Simulation, live charts, and result previews remain available.',
      updateResultTitle: 'Update Check Complete',
      updateResultBody: 'Update channel is not configured. This is a placeholder result.',
      updateAvailableTitle: 'Update Available',
      updateAvailableBody: 'A newer version is available and can be downloaded now.',
      updateReadyTitle: 'Update Downloaded',
      updateReadyBody: 'Restart the app to install the new version.',
      currentVersionLabel: 'Current Version',
      latestVersionLabel: 'Latest Version',
      releaseDateLabel: 'Release Date',
      releaseNotesLabel: 'Release Notes',
      noReleaseNotes: 'No release notes were provided for this version.',
      ignoreThisVersion: 'Ignore This Version',
      updateNow: 'Update Now',
      restartAndInstall: 'Restart and Install',
      later: 'Later',
      ignoredVersionTitle: 'Version Ignored',
      ignoredVersionBody: (version) => 'Version ' + version + ' will not prompt again.',
      updateAvailableStatus: (version) => 'Found ' + version,
      upToDateStatus: 'Up to date',
      unsupportedUpdateStatus: 'Desktop installer only',
      downloadingUpdateStatus: (percent) => 'Downloading' + (percent === null ? '' : ' ' + Math.round(percent) + '%'),
      retryingUpdateStatus: (attempt, maxAttempts) => 'Network fluctuation, retrying download' + (attempt && maxAttempts ? ' (' + attempt + '/' + maxAttempts + ')' : '') + '...',
      updateReadyStatus: 'Update ready',
      updateErrorStatus: 'Check failed',
      updateDownloadFailedStatus: (attempt, maxAttempts) => 'Automatic update failed' + (attempt && maxAttempts ? ' after ' + attempt + '/' + maxAttempts + ' attempts' : '') + '. You can retry later or download the installer manually.',
      retryDownload: 'Retry Download',
      manualDownload: 'Manual Download',
      buildPlaceholder: 'Copyright and build details reserved for the final release.',
      sessionCacheSummary: (total) => 'Current session contains ' + total + ' experiment files',
      sessionCacheBreakdown: (ideal, heat, standard) => 'Ideal / Heat / Standard: ' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: 'Open Files', files: 'Files', panels: 'Panels', noOpenFiles: 'No open files', noOpenFileState: 'No experiment file is currently open', noOpenPanelState: 'Available panels appear after an experiment is opened.', emptyHint: 'Create or open an experiment from the main workspace.',
      noOpenStudy: 'No open study', emptyTitle: 'Start a new Heat Capacity Ratio Lab file', emptyBody: 'Create an ideal gas study, heat capacity ratio experiment, or standard simulation to restore previews, charts, results, and parameter panels.',
      createStandard: 'Create Standard Simulation Study', createIdeal: 'Create Ideal Gas Simulation Study', createHeatCapacity: 'Create Heat Capacity Ratio Experiment', rename: 'Rename', delete: 'Delete', confirmDelete: 'Confirm Delete', closeExperiment: 'Close Experiment', confirmCloseRunningExperiment: (name) => 'The experiment is running. Close ' + name + '?', cancel: 'Cancel',
      locked: 'locked', shown: 'shown', open: 'open', active: 'active', off: 'off', std: 'Standard', ideal: 'Ideal', heat: 'Heat', workspaceAria: 'File workspace', openActions: (name) => 'Open actions for ' + name,
    },
    panels: {
      previewTitle: '3D Preview', previewHint: 'Realtime molecular viewport', realtimeTitle: 'Realtime Data / Charts', heatRealtimeTitle: 'Realtime Data', standardRealtimeHint: 'Live temperature, pressure, and chart traces', idealRealtimeHint: 'Live T, P, relation, and chart traces', heatRealtimeHint: 'Uₜ / Uₚ, pressure, and process samples',
      standardResultsTitle: 'Results', standardResultsHint: 'Experiment status, data table, and figures', idealResultsTitle: 'Results', idealResultsHint: 'Verification chart, history unlock, and export details',
      pointsTitle: 'Experiment Data', pointsHint: 'Recorded relation experiment points', verificationTitle: 'Relation Verification', verificationHint: 'Verification chart, diagnostics, and export details',
      summaryTitle: 'Summary', dataTableTitle: 'Data Table', figuresTitle: 'Figures', liveWorkspaceResizeAria: 'Resize view preview and realtime data',
    },
    parameters: {
      title: 'Current Parameters', currentFileValues: 'current file values', lockedUntilStopped: 'locked until stopped or finished', editValues: 'edit parameter values', hide: 'Hide',
      standardSimulation: 'Standard Simulation', idealSimulation: 'Ideal Gas Simulation', heatCapacityExperiment: 'Heat Capacity Ratio Experiment', savedChangesOnStart: 'parameters saved on start', idealRuntimeOnStart: 'ideal runtime will connect on start', applied: 'parameters applied',
      relation: 'Relation', scanVariable: 'Scan Variable', samplingPreset: 'Sampling Preset', targetTemperature: 'Target Temperature', boxLength: 'Box Length L', particleCount: 'Particle Count N', customPreset: 'Custom', setSamplingPrecision: 'Set sampling precision', relationHints: { pt: 'Scan temperature at fixed N and V', pv: 'Scan volume through box length L', pn: 'Scan particle count at fixed T and V' }, setScanValue: (title) => 'Set ' + title, adjustScanValue: (title) => 'Adjust ' + title, recommendedValues: (title) => title + ' recommended values',
      parameterLabels: { N: 'Particle count', r: 'Particle radius', L: 'Box length', m: 'Particle mass', k: 'Boltzmann constant', dt: 'Time step', nu: 'Collision frequency', targetTemperature: 'Target temperature', equilibriumTime: 'Equilibration time', statsDuration: 'Sampling duration', relation: 'Relation' },
      samplingPresets: { fast: 'Fast', balanced: 'Balanced', stable: 'Stable' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's eq / ' + statsDuration + 's stats',
      advancedSettings: 'Advanced settings', advancedShow: 'Show model constants and sampling values', advancedHide: 'Hide model constants and sampling values', edit: 'Edit', save: 'Save', saveHint: 'Save advanced parameters to this workbench file',
      standardReadonlyNote: 'Standard simulation parameters are shown directly here.', idealReadonlyNote: 'Relation, scan variable, and sampling preset are controlled above.', heatCapacityReadonlyNote: 'The particle animation only visualizes molecular motion; the heat capacity ratio is still calculated by the FD-NCD-C air experiment model.', microscopicVisualization: 'Microscopic Visualization', hardSphereView: 'Hard-Sphere View', hardSphereOn: 'ON', hardSphereOff: 'OFF', hardSphereTeachingOnly: 'Affects only the 3D teaching display. It is not used for Uₜ, Uₚ, U₀/U₁/U₂, or γ.', controlledLockHint: 'This relation already has data, so controlled variables are locked.',
    },
    results: {
      title: 'Results', experimentStatus: 'Experiment status', scan: 'Scan', temperature: 'Temperature', pressure: 'Pressure', measuredPressure: 'Measured P', idealPressure: 'Ideal P', gap: 'Gap', pointsTitle: (relation) => relation + ' points', pointsShort: (count) => count + ' pts', recordedPoints: (count) => count + ' recorded points',
      clearRelation: 'Clear Relation', confirmClear: 'Confirm Clear', remove: 'Remove', confirmRemove: 'Confirm Remove', cancel: 'Cancel', noPoints: 'no points', runToRecord: 'Run the experiment to record points.', tableAction: 'Action', tableTime: 'Time',
      finalState: 'Final state', meanSpeed: 'Mean speed', measuredBars: 'measured bars', idealLine: 'ideal line', samples: (count) => count + ' samples', sampleWindows: (count) => count + ' sampling windows', waiting: 'waiting', finalSpeedSamples: 'final speed samples', finalEnergySamples: 'final energy samples', tempHistorySamples: 'temp history samples', finalDataReady: 'final data ready', energyDrift: 'energy drift', meanAbsTempError: 'mean abs temp error', tempSamples: 'Temp samples', resultsReady: (relation) => relation + ' experiment result ready', waitingForRecordedPoints: (relation) => relation + ' waiting for recorded points',
      metric: 'Metric', value: 'Value', status: 'Status', ready: 'ready', notReady: 'not-ready', yes: 'yes', no: 'no', diagnostic: 'Diagnostic', export: 'Export', exportAll: 'Export All', exportFigures: 'Export Figures', reportPdf: 'Report PDF', verificationFigure: 'Verification Figure', pointsCsv: 'Points CSV', verification: 'Verification', rawPv: 'Raw P-V', history: 'History',
      resultReadyStatus: 'Results ready', resultNotReadyStatus: 'Results not ready', resultReadyDetail: 'Final data has been captured for summary, tables, figures, and future report export.', resultNotReadyDetail: 'Run the standard simulation until the collecting phase finishes to prepare final result data.', finalTime: 'Final time', finalTemperature: 'Final temperature', finalPressure: 'Final pressure', rmsSpeed: 'RMS speed', speedBins: 'Speed bins', energyBins: 'Energy bins', notReadyPreview: 'not ready', figuresHint: 'Figure readiness, recommended filenames, and preview.', noIdealPointsTitle: 'No ideal-gas points', noIdealPointsBody: 'Select an ideal-gas file to review experiment points.', activeRelation: 'Active', noIdealVerificationTitle: 'No ideal-gas verification', noIdealVerificationBody: 'Select an ideal-gas file to review verification results.', historyLockedFor: (relation) => 'History locked for ' + relation, historyUnlocked: 'Unlocked by verified experiment data.', historyUnlockHint: 'Unlocks after a successful verification.', historicalContext: 'Historical context', workbenchInterpretation: 'Workbench interpretation', keyFigures: 'Key figures', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / slope error ' + slopeError, whyLocked: 'Why it is locked', whyItHappened: 'Why it happened', recommendedNextStep: 'Recommended next step', exportFilesHint: 'Export environment and recommended files.', pvLinearizedValidation: 'P - 1/V linearized validation', relationValidation: (relation) => relation + ' validation', measuredScatterHint: 'Measured scatter with fit and theoretical reference.', originalPvPhysicalView: 'Original P - V physical view', originalPvPhysicalHint: 'Shows the inverse relation directly while verdict uses the linearized view.', verdictLabel: (relation, verdict) => relation + ' verdict: ' + verdict, pointsMetric: 'Points', rSquared: 'R2', slope: 'Slope', theorySlope: 'Theory slope', slopeError: 'Slope error', failureReason: 'Failure reason', noneValue: 'none', currentVerification: (rSquared, slopeError) => 'Current verification: R2 ' + rSquared + ', slope error ' + slopeError + '.', currentVerdictRecommendation: (verdict, recommendation) => 'Current verdict: ' + verdict + '. Recommendation: ' + recommendation, noIdealHistoryTitle: 'No ideal-gas history', noIdealHistoryBody: 'History unlocks after ideal-gas verification.', noVerificationChartTitle: 'No verification chart', noVerificationChartBody: 'Verification charts are available for ideal-gas files.', panelNotConnectedTitle: 'Panel not connected', panelNotConnectedBody: 'This panel will be wired in a later Workbench integration batch.', measuredLegend: 'measured', fitLegend: 'fit', theoryLegend: 'theory', idealPressureTrace: (relation) => relation + ' pressure trace', currentIdealPressureHint: 'Run the current ideal point to collect pressure windows.', meanTemperature: 'Mean temperature', relativeGap: 'Relative gap', samplingProgress: 'Sampling progress', speedDistribution: 'Speed distribution', energyDistribution: 'Energy distribution', standardRealtimeEmpty: 'Run the standard simulation to populate realtime chart data.', phase: 'Phase', phaseStates: { idle: 'idle', equilibrating: 'equilibrating', collecting: 'collecting', finished: 'finished' }, probabilityDensity: 'probability density', experimentPointTableTitle: 'No experiment point table', experimentPointTableBody: 'Experiment points are available for ideal-gas files.', idealResultsSectionsAria: 'Ideal Results sections', openIdealResultsTabTitle: 'Open this ideal Results tab.', verificationChartAria: (relation) => relation + ' verification chart', resultsTreeExpandAria: 'Expand Results sections', resultsTreeCollapseAria: 'Collapse Results sections', resultsOpenHint: 'Click to select, double-click to open.', resultsJumpHint: 'Double-click to open Results and jump to this section.', figureStatus: { ready: 'ready', 'not-ready': 'not-ready', 'not-applicable': 'not applicable' },
    },
    actions: { start: 'Start', pause: 'Pause', stop: 'Stop', close: 'Close', resetView: 'Default view', hide: 'Hide', cancel: 'Cancel' },
    shortcuts: { title: 'Shortcuts', hint: 'Common workbench shortcuts', undo: 'Undo', redo: 'Redo', closeSettings: 'Close settings' },
    console: { title: 'Console / Output', tabs: { logs: 'Logs', warnings: 'Warnings', summary: 'Summary' }, total: 'Total', info: 'Info', success: 'Success', warnings: 'Warnings', errors: 'Errors', latest: 'Latest', runtime: 'Runtime', noLogs: 'No log entries yet.', noWarnings: 'No warnings or errors yet.' },
    status: { activeFile: (name) => 'Active file: ' + name, selectedBlock: (name) => 'Selected block: ' + name, none: 'none', noRuntime: 'No runtime connected', standardRuntime: 'Standard runtime connected', idealRuntime: (relation, verdict) => 'Ideal runtime connected / ' + relation + ' / ' + verdict, runStates: { idle: 'idle', running: 'running', paused: 'paused', finished: 'finished', 'needs-reset': 'runtime refresh needed' }, verdictStates: { insufficient: 'insufficient', collecting: 'collecting', verified: 'verified', failed: 'failed', preliminary: 'preliminary', notYet: 'not yet', 'not-started': 'not started' } },
    exportEnvironment: {
      checking: { label: 'Checking export environment', detail: 'Desktop runtime is checking local Python/Matplotlib and bundled exporter availability.' },
      'available-system': { label: 'System Python exporter available', detail: 'Scientific report and figure export will use this computer\'s Python/Matplotlib environment.' },
      'available-bundled': { label: 'Bundled exporter available', detail: 'Scientific report and figure export will use the exporter packaged with the desktop app.' },
      unavailable: { label: 'Desktop export bridge unavailable', detail: 'This environment cannot export PDF or figures directly. Use local export in the Heat Capacity Ratio Lab desktop app.' },
      error: { label: 'Export environment error', detail: 'Exporter detection failed. Simulation, realtime charts, and result previews remain available.' },
    },
    logs: { initialized: 'Workbench studio prototype initialized.', defaultLayout: 'Default layout: 3D Preview, Realtime Data / Charts, Current Parameters.', standardConnected: 'Standard Simulation runtime, 3D preview, and realtime chart data are connected.', exportBridgeRequired: 'Scientific PDF export requires the desktop runtime bridge.', autoPausedSingleRuntime: (name) => name + ': auto-paused because only one workbench runtime can run at a time.', autoPausedCreateFile: (name) => name + ': auto-paused when creating a new file.', autoPausedSwitchFile: (name) => name + ': auto-paused when switching files.', fileCreated: (name) => 'Workbench file created: ' + name, mockAction: (label) => 'Mock action: ' + label, lockedPanel: (title) => title + ' is locked as part of the default workspace and cannot be hidden.', layoutReset: (name) => name + ': layout reset to 3D Preview + Realtime Data / Charts', idealResultsOpened: (name, tab) => name + ': opened ideal Results window on ' + tab + '.', standardResultsOpened: (name, tab) => name + ': opened Results window on ' + tab + '.', idealResultsClosed: (name) => name + ': closed ideal Results window.', fileSelected: (name) => 'File tab selected: ' + name, confirmClear: (name, relation) => name + ': click Confirm Clear to clear all ' + relation + ' points.', clearedRelation: (name, relation) => name + ': cleared ' + relation + ' points.', exportLabels: { completeBundle: 'complete export', report: 'report PDF', verificationFigure: 'verification figure', pointsCsv: 'points CSV', figuresZip: 'result figures' }, exportNotReady: (name) => name + ': result data does not meet export requirements yet.', exportNeedsTwoPoints: (name) => name + ': at least 2 recorded points are required for a fitted report or verification figure.', exportPayloadPrepared: (name, label, filename, detail) => name + ': ' + label + ' payload prepared as ' + filename + '; ' + detail, exportPreparing: (name, label) => name + ': preparing ' + label + ' export.', exportCancelled: (name, label) => name + ': ' + label + ' export cancelled.', exportFailed: (name, label, message) => name + ': ' + label + ' export failed: ' + message, exportCsvSaved: (name, target) => name + ': points CSV saved to ' + target + '.', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + ': ' + label + ' exported to ' + outDir + ' (' + fileCount + ' files).' + figureHint, exportFigureHint: 'Figure files are inside the figures subfolders.', unknownExporterError: 'unknown exporter error', selectedLocation: 'selected location', selectedFolder: 'selected folder', fileNameCannotBeEmpty: 'File name cannot be empty.', fileNameUnchanged: (name) => name + ': name unchanged.', fileRenamed: (name) => 'Workbench file renamed to ' + name + '.', fileRemoved: (name) => name + ': removed from the current workbench session.', fileClosed: (name) => name + ': closed and kept in local cache.', fileOpenedFromCache: (name) => 'Experiment opened from local cache: ' + name, confirmDeleteFile: (name) => name + ': click Confirm Delete to remove this open file from the workbench session.', layoutAlreadyDefault: (name) => name + ': layout is already using the default panels.', ...experimentLogCopies.en },
  },
};

const heatCapacityRealtimeCopies = {
  'zh-CN': {
    guideTitle: '实验指引',
    guideHint: '空气比热容比实验步骤与说明',
    recordsTitle: '数据与结果',
    recordsHint: 'U₀ / U₁ / U₂ 与空气比热容比计算',
    dataResultsTitle: '数据与结果',
    dataResultsHint: '记录值、单组 γ 与平均结果',
    reviewTitle: '过程回顾',
    reviewHint: '自由模式 trace 与操作诊断',
    materialsTitle: '实验资料与结果',
    materialsHint: 'U₁ / U₂ 与空气比热容比计算',
    closeMaterialsAria: '关闭实验资料与结果',
    materialsGroupAria: '展开或收起实验资料与结果',
    materialsFolderTitle: '点击文件夹展开/收起；单击文字选中；双击文字打开全部子标签页',
    materialsTabTitle: '单击选中；双击打开标签页',
    materialsTabsAria: '空气比热容比实验资料分页',
    previewMountAria: '空气比热容比视图预览区域',
    realtimePanelTitle: '实时数据',
    realtimeKicker: '实时数据',
    realtimeSubtitle: 'Uₜ / Uₚ、压强和过程采样',
    realtimeTitle: '空气比热容比实验',
    stagePrefix: '阶段：',
    demoPaused: '自动演示暂停',
    demoRunning: '自动演示',
    demoReady: '自动演示准备',
    autoDemoStart: '自动演示',
    autoDemoPause: '暂停演示',
    autoDemoResume: '继续演示',
    autoDemoStop: '终止演示',
    modeDemo: '演示模式',
    modeGuide: '引导模式',
    modeFree: '自由模式',
    resetFreeMode: '重置自由模式',
    freeSpeedLabelCode: 'WAIT RATE',
    freeSpeedLabel: '等待倍速',
    freeSpeedAria: '等待倍速',
    freeWaitTimerLabel: { u1: 'U₁ 等待', u2: 'U₂ 等待' },
    freeWaitRecordStatus: { pending: '未记录', rerecord: '可重记' },
    freeSpeedNoticeKicker: '倍速',
    freeSpeedNotice: '真实实验等待过程较慢，仿真已提供倍速等待以加快达到平衡。',
    exitGuideMode: '退出引导',
    exitTeachingMode: '退出教学模式',
    singleTrialBadge: '本次实验',
    trialBadge: (trialIndex: number) => `第 ${trialIndex} 组实验`,
    autoDemoFinishedLabel: '演示完成',
    demoPausedLabel: '已暂停',
    demoDoneLabel: '已完成',
    demoTargetLabel: '目标控件',
    demoProgressLabel: '推进标准',
    demoObservationLabel: '观察要点',
    autoDemoFinishedTitle: '演示完成',
    autoDemoFinishedDescription: '演示完成，可重新开始或进入引导 / 自由操作。',
    demoFallbackNote: '过程采样已保留。',
    startGuideExperiment: '引导模式',
    skipRecoveryWait: '真实实验中需要等待系统稳定；程序已省略该等待过程。',
    recordU0: '记录 U₀',
    recordU1: '记录 U₁ / Uₜ₁',
    recordU2: '记录 U₂ / Uₜ₂',
    recordDialogConfirm: '确认记录',
    recordDialogCancel: '取消',
    recordDialogCurrentPhase: '当前阶段',
    recordDialogPressure: '当前 Uₚ',
    recordDialogTemperature: '当前 Uₜ',
    recordDialogStopcock: '玻璃旋塞',
    recordDialogPumpValve: '打气阀门',
    recordDialogReady: '当前状态适合记录。',
    recordU0Warning: '请先完成压强差调零，使 Uₚ 接近 0。',
    recordU1Warning: '当前尚未达到放气前稳定状态，不建议记录 U₁。',
    recordU2Warning: '当前尚未完成回温稳定，不建议记录 U₂。',
    guideStrongReminder: '请点击目标控件，继续实验。',
    guideStrongReminderPressureZero: '请调节压强调零旋钮，继续实验。',
    guidePumpInsufficientReminder: 'Uₚ 未达到 120 mV，请继续打气。',
    guideRecordBlockedMessages: {
      u0NeedPower: '当前还不能记录 U₀。请先打开电源。',
      u0NeedStopcock: '当前还不能记录 U₀。请先打开玻璃旋塞。',
      u0NeedZero: '当前还不能记录 U₀。请先完成压力调零。',
      u0NeedCurrentStep: '当前还不能记录 U₀。请按当前步骤继续。',
      u1NeedPump: '当前还不能记录 U₁。请先完成打气。',
      u1NeedClosePumpValve: '当前还不能记录 U₁。请先关闭打气阀门。',
      u1NeedWait: '当前还不能记录 U₁。请等待计时达到 5 min。',
      u1NeedCurrentStep: '当前还不能记录 U₁。请按当前步骤继续。',
      u2NeedRelease: '当前还不能记录 U₂。请先完成快速放气。',
      u2NeedCloseStopcock: '当前还不能记录 U₂。请先关闭玻璃旋塞。',
      u2NeedWait: '当前还不能记录 U₂。请等待计时达到 5 min。',
      u2NeedCurrentStep: '当前还不能记录 U₂。请按当前步骤继续。',
    },
    guideUsageHints: {
      zeroFocus: '请双击仪表进入聚焦模式，开始压力调零。',
      zeroAdjust: '拖拽旋钮进行粗调，使用滚轮进行细调。',
      pumpValve: '请打开打气阀门。',
      pumpFocus: '请双击打气球进入聚焦模式。',
      pumpAction: '双击聚焦打气球，快速点按打气球，按压至 Uₚ ≥ 120 mV 后自动退出。',
      waitU1Ready: '5 min 到了，记录 U₁ / Uₜ₁。',
      releaseReady: '放气时间到了，请关闭玻璃旋塞。',
      waitU2Ready: '5 min 到了，记录 U₂ / Uₜ₂。',
    },
    recordU0Success: 'U₀ 已记录。',
    recordU0SuccessToast: 'U₀ 记录成功。',
    recordU1SuccessToast: 'U₁ 和 Uₜ 记录成功。',
    recordU2SuccessToast: 'U₂ 和 Uₜ 记录成功。',
    finalTrialCompleteToast: '本次实验已完成。',
    freePowerOffBeforeNextGroup: '请先关闭电源，完成本组实验后再调整参数。',
    freeRecordSuccessLog: {
      u0: '自由模式已记录 U₀ 显示值。',
      u1: '自由模式已记录 U₁ 显示值。',
      u2: '自由模式已记录 U₂ 显示值。',
    },
    freeModeActiveLog: (name: string) => `${name}：自由模式已启用。`,
    freeRunResetLog: (name: string) => `${name}：自由模式运行已重置。`,
    freeRecordRejectMessages: {
      'zero-not-ready': '请先打开电源并打开玻璃旋塞，再记录 U₀。',
      'missing-u0': '请先点击记录 U₀，再记录 U₁ 或 U₂。',
      'calibration-changed': '调零状态已改变，请重新记录 U₀ 后再继续。',
      'unstable-pressure': '压强读数仍在变化，请等待稳定后再记录。',
      'unstable-temperature': '温度读数仍在变化，请等待回到稳定环境值后再记录。',
      'insufficient-u1': 'U₁ 压强差不足，请关闭旋塞并继续打气到有效范围。',
      'release-not-started': '请先完成快速放气并关闭旋塞，再记录 U₂。',
      'over-vented': '放气过度，U₂ 已低于有效范围；请重新开始本组 Free trial。',
      'pressure-danger': '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
      'invalid-sequence': '当前操作顺序不能记录该数据点，请按 U₀、U₁、U₂ 的顺序进行。',
    } satisfies Record<HeatCapacityFreeRecordRejectReason, string>,
    pumpFrequencySlowToast: '打气太慢，请加快打气频率。',
    pressureWarningMessage: '压强已达到建议打气范围，请停止打气并等待回温。',
    pressureAlarmMessage: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
    closePumpValveReminder: '请关闭打气阀门。',
    pressureAlarmLog: (name: string) => `${name}：压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。`,
    toastSystemKicker: '系统',
    autoDemoLockedToast: '演示中无法操作',
    autoDemoCompletedLockedToast: '演示已完成，请退出后进入自由模式操作。',
    guideCompletedLockedToast: '引导内容已完成，请退出后进入自由模式操作。',
    autoDemoCompletionToast: '演示完成',
    guideModeStartingToast: '正在启动引导模式',
    guideModeExitedToast: '引导模式已终止',
    teachingModeExitedToast: '已退出教学模式',
    guideModeExitedLog: (name: string) => `${name}：引导模式已终止。`,
    autoDemoPreparingHint: '系统正在自动恢复默认状态，稍后开始演示',
    autoDemoReadyToCompleteHint: '自动演示即将完成，过程采样已保留',
    autoDemoImportedCompleteLog: (name: string) => `${name}：自动演示数据已导入并完成计算。`,
    autoDemoResumedLog: (name: string) => `${name}：自动演示已继续。`,
    autoDemoRunningLog: (name: string) => `${name}：自动演示正在运行。`,
    autoDemoPreparingTitle: '准备演示',
    autoDemoInitializingDescription: '正在初始化自动演示',
    autoDemoPreparingTarget: '自动演示准备',
    autoDemoPreparingProgress: '完成复位后从开启电源步骤开始。',
    autoDemoPreparingNote: '系统正在自动复位控件、视角和演示数据；完成后将从开启电源步骤开始。',
    autoDemoInitializingToast: '正在初始化自动演示',
    autoDemoStartedLog: (name: string) => `${name}：自动演示已启动。`,
    autoDemoPausedHint: '自动演示已暂停',
    autoDemoPausedToast: '演示已暂停',
    autoDemoPausedLog: (name: string) => `${name}：自动演示已暂停。`,
    autoDemoTerminatedHint: '自动演示已终止',
    autoDemoTerminatedTitle: '演示已终止',
    autoDemoTerminatedDescription: '自动演示已停止，当前曲线和读数保留。',
    autoDemoTerminatedTarget: '自动演示流程',
    autoDemoTerminatedProgress: '演示已停止，用户可重新选择模式。',
    autoDemoTerminatedNote: '用户交互已恢复，可重新开始或进入引导 / 自由操作。',
    autoDemoTerminatedToast: '演示已终止',
    autoDemoTerminatedLog: (name: string) => `${name}：自动演示已终止。`,
    safetyLimit: '安全上限',
    safetyActive: '激活',
    pressureAlarmTitle: '报警',
    pressureWarningFallback: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
    pressureWarningObserve: '聚焦模式已退出，请立即停止打气。',
    operationLocked: '操作锁定',
    phaseLabels: {
      powerOff: '未开机',
      readyToZero: '等待调零',
      zeroed: '已调零',
      readyToPump: '准备打气',
      pumping: '打气中',
      sealedStabilizing: '封闭等待稳定',
      releasing: '快速放气',
      recovering: '等待回温',
      fallback: '实验准备',
    },
    stopcock: { open: '打开', closed: '关闭' },
    safety: {
      danger: '危险',
      warning: '建议停止',
      normal: '安全',
      dangerNote: '停止打气',
      warningNote: '等待回温',
      normalNote: '可继续观察',
    },
    zeroStatus: {
      completed: '已完成',
      adjustable: '可调零',
      notReady: '未就绪',
    },
    hints: {
      powerOff: '请先打开电源。',
      readyToZero: '请观察 Uₚ，并进行压强调零。',
      readyToPump: '请关闭玻璃旋塞并准备打气。',
      pumping: '连续打气至 Uₚ ≥ 120 mV，达到后停止加压。',
      sealedStabilizing: '真实实验需封闭等待 5 min，稳定后记录 U₁。',
      releasing: '关闭玻璃旋塞，并等待回温稳定。',
      recovering: '关闭玻璃旋塞后等待 5 min，回温稳定后记录 U₂。',
      fallback: '观察实时读数变化。',
    },
    readings: {
      temperature: '温度信号',
      pressure: '压强差电压',
      delta: '由当前 Uₚ 换算',
      safety: '压力状态',
      pumpValve: '打气阀门',
      stopcock: '玻璃旋塞',
      zero: '压强调零',
      currentHint: '当前提示',
      opened: '已打开',
      closed: '已关闭',
    },
  },
  'zh-TW': {
    guideTitle: '實驗指引',
    guideHint: '空氣比熱容比實驗步驟與說明',
    recordsTitle: '資料與結果',
    recordsHint: 'U₀ / U₁ / U₂ 與空氣比熱容比計算',
    dataResultsTitle: '資料與結果',
    dataResultsHint: '記錄值、單組 γ 與平均結果',
    reviewTitle: '過程回顧',
    reviewHint: '自由模式 trace 與操作診斷',
    materialsTitle: '實驗資料與結果',
    materialsHint: 'U₁ / U₂ 與空氣比熱容比計算',
    closeMaterialsAria: '關閉實驗資料與結果',
    materialsGroupAria: '展開或收起實驗資料與結果',
    materialsFolderTitle: '點擊資料夾展開/收起；單擊文字選取；雙擊文字開啟全部子分頁',
    materialsTabTitle: '單擊選取；雙擊開啟分頁',
    materialsTabsAria: '空氣比熱容比實驗資料分頁',
    previewMountAria: '空氣比熱容比視圖預覽區域',
    realtimePanelTitle: '即時資料',
    realtimeKicker: '即時資料',
    realtimeSubtitle: 'Uₜ / Uₚ、壓強和過程採樣',
    realtimeTitle: '空氣比熱容比實驗',
    stagePrefix: '階段：',
    demoPaused: '自動演示暫停',
    demoRunning: '自動演示',
    demoReady: '自動演示準備',
    autoDemoStart: '自動演示',
    autoDemoPause: '暫停演示',
    autoDemoResume: '繼續演示',
    autoDemoStop: '終止演示',
    modeDemo: '演示模式',
    modeGuide: '引導模式',
    modeFree: '自由模式',
    resetFreeMode: '重置自由模式',
    freeSpeedLabelCode: 'WAIT RATE',
    freeSpeedLabel: '等待倍速',
    freeSpeedAria: '等待倍速',
    freeWaitTimerLabel: { u1: 'U₁ 等待', u2: 'U₂ 等待' },
    freeWaitRecordStatus: { pending: '未記錄', rerecord: '可重記' },
    freeSpeedNoticeKicker: '倍速',
    freeSpeedNotice: '真實實驗等待過程較慢，仿真已提供倍速等待以加快達到平衡。',
    exitGuideMode: '退出引導',
    exitTeachingMode: '退出教學模式',
    singleTrialBadge: '本次實驗',
    trialBadge: (trialIndex: number) => `第 ${trialIndex} 組實驗`,
    autoDemoFinishedLabel: '演示完成',
    demoPausedLabel: '已暫停',
    demoDoneLabel: '已完成',
    demoTargetLabel: '目標控件',
    demoProgressLabel: '推進標準',
    demoObservationLabel: '觀察要點',
    autoDemoFinishedTitle: '演示完成',
    autoDemoFinishedDescription: '演示完成，可重新開始或進入引導 / 自由操作。',
    demoFallbackNote: '過程採樣已保留。',
    startGuideExperiment: '引導模式',
    skipRecoveryWait: '真實實驗中需要等待系統穩定；程序已省略該等待過程。',
    recordU0: '記錄 U₀',
    recordU1: '記錄 U₁ / Uₜ₁',
    recordU2: '記錄 U₂ / Uₜ₂',
    recordDialogConfirm: '確認記錄',
    recordDialogCancel: '取消',
    recordDialogCurrentPhase: '目前階段',
    recordDialogPressure: '目前 Uₚ',
    recordDialogTemperature: '目前 Uₜ',
    recordDialogStopcock: '玻璃旋塞',
    recordDialogPumpValve: '打氣閥門',
    recordDialogReady: '目前狀態適合記錄。',
    recordU0Warning: '請先完成壓強差調零，使 Uₚ 接近 0。',
    recordU1Warning: '目前尚未達到放氣前穩定狀態，不建議記錄 U₁。',
    recordU2Warning: '目前尚未完成回溫穩定，不建議記錄 U₂。',
    guideStrongReminder: '請點擊目標控件，繼續實驗。',
    guideStrongReminderPressureZero: '請調節壓強調零旋鈕，繼續實驗。',
    guidePumpInsufficientReminder: 'Uₚ 未達到 120 mV，請繼續打氣。',
    guideRecordBlockedMessages: {
      u0NeedPower: '目前還不能記錄 U₀。請先打開電源。',
      u0NeedStopcock: '目前還不能記錄 U₀。請先打開玻璃旋塞。',
      u0NeedZero: '目前還不能記錄 U₀。請先完成壓強調零。',
      u0NeedCurrentStep: '目前還不能記錄 U₀。請按目前步驟繼續。',
      u1NeedPump: '目前還不能記錄 U₁。請先完成打氣。',
      u1NeedClosePumpValve: '目前還不能記錄 U₁。請先關閉打氣閥門。',
      u1NeedWait: '目前還不能記錄 U₁。請等待計時達到 5 min。',
      u1NeedCurrentStep: '目前還不能記錄 U₁。請按目前步驟繼續。',
      u2NeedRelease: '目前還不能記錄 U₂。請先完成快速放氣。',
      u2NeedCloseStopcock: '目前還不能記錄 U₂。請先關閉玻璃旋塞。',
      u2NeedWait: '目前還不能記錄 U₂。請等待計時達到 5 min。',
      u2NeedCurrentStep: '目前還不能記錄 U₂。請按目前步驟繼續。',
    },
    guideUsageHints: {
      zeroFocus: '請雙擊儀表進入聚焦模式，開始壓強調零。',
      zeroAdjust: '拖曳旋鈕進行粗調，使用滾輪進行細調。',
      pumpValve: '請打開打氣閥門。',
      pumpFocus: '請雙擊打氣球進入聚焦模式。',
      pumpAction: '雙擊聚焦打氣球，快速點按打氣球，按壓至 Uₚ ≥ 120 mV 後自動退出。',
      waitU1Ready: '5 min 到了，記錄 U₁ / Uₜ₁。',
      releaseReady: '放氣時間到了，請關閉玻璃旋塞。',
      waitU2Ready: '5 min 到了，記錄 U₂ / Uₜ₂。',
    },
    recordU0Success: 'U₀ 已記錄。',
    recordU0SuccessToast: 'U₀ 記錄成功。',
    recordU1SuccessToast: 'U₁ 和 Uₜ 記錄成功。',
    recordU2SuccessToast: 'U₂ 和 Uₜ 記錄成功。',
    finalTrialCompleteToast: '本次實驗已完成。',
    freePowerOffBeforeNextGroup: '請先關閉電源，完成本組實驗後再調整參數。',
    freeRecordSuccessLog: {
      u0: '自由模式已記錄 U₀ 顯示值。',
      u1: '自由模式已記錄 U₁ 顯示值。',
      u2: '自由模式已記錄 U₂ 顯示值。',
    },
    freeModeActiveLog: (name: string) => `${name}：自由模式已啟用。`,
    freeRunResetLog: (name: string) => `${name}：自由模式執行已重置。`,
    freeRecordRejectMessages: {
      'zero-not-ready': '請先打開電源並打開玻璃旋塞，再記錄 U₀。',
      'missing-u0': '請先點擊記錄 U₀，再記錄 U₁ 或 U₂。',
      'calibration-changed': '調零狀態已改變，請重新記錄 U₀ 後再繼續。',
      'unstable-pressure': '壓強讀數仍在變化，請等待穩定後再記錄。',
      'unstable-temperature': '溫度讀數仍在變化，請等待回到穩定環境值後再記錄。',
      'insufficient-u1': 'U₁ 壓強差不足，請關閉旋塞並繼續打氣到有效範圍。',
      'release-not-started': '請先完成快速放氣並關閉旋塞，再記錄 U₂。',
      'over-vented': '放氣過度，U₂ 已低於有效範圍；請重新開始本組 Free trial。',
      'pressure-danger': '壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。',
      'invalid-sequence': '目前操作順序不能記錄該資料點，請按 U₀、U₁、U₂ 的順序進行。',
    } satisfies Record<HeatCapacityFreeRecordRejectReason, string>,
    pumpFrequencySlowToast: '打氣太慢，請加快打氣頻率。',
    pressureWarningMessage: '壓強已達到建議打氣範圍，請停止打氣並等待回溫。',
    pressureAlarmMessage: '壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。',
    closePumpValveReminder: '請關閉打氣閥門。',
    pressureAlarmLog: (name: string) => `${name}：壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。`,
    toastSystemKicker: '系統',
    autoDemoLockedToast: '演示中無法操作',
    autoDemoCompletedLockedToast: '演示已完成，請退出後進入自由模式操作。',
    guideCompletedLockedToast: '引導內容已完成，請退出後進入自由模式操作。',
    autoDemoCompletionToast: '演示完成',
    guideModeStartingToast: '正在啟動引導模式',
    guideModeExitedToast: '引導模式已終止',
    teachingModeExitedToast: '已退出教學模式',
    guideModeExitedLog: (name: string) => `${name}：引導模式已終止。`,
    autoDemoPreparingHint: '系統正在自動恢復預設狀態，稍後開始演示',
    autoDemoReadyToCompleteHint: '自動演示即將完成，過程採樣已保留',
    autoDemoImportedCompleteLog: (name: string) => `${name}：自動演示資料已匯入並完成計算。`,
    autoDemoResumedLog: (name: string) => `${name}：自動演示已繼續。`,
    autoDemoRunningLog: (name: string) => `${name}：自動演示正在執行。`,
    autoDemoPreparingTitle: '準備演示',
    autoDemoInitializingDescription: '正在初始化自動演示',
    autoDemoPreparingTarget: '自動演示準備',
    autoDemoPreparingProgress: '完成復位後從開啟電源步驟開始。',
    autoDemoPreparingNote: '系統正在自動復位控件、視角和演示資料；完成後將從開啟電源步驟開始。',
    autoDemoInitializingToast: '正在初始化自動演示',
    autoDemoStartedLog: (name: string) => `${name}：自動演示已啟動。`,
    autoDemoPausedHint: '自動演示已暫停',
    autoDemoPausedToast: '演示已暫停',
    autoDemoPausedLog: (name: string) => `${name}：自動演示已暫停。`,
    autoDemoTerminatedHint: '自動演示已終止',
    autoDemoTerminatedTitle: '演示已終止',
    autoDemoTerminatedDescription: '自動演示已停止，目前曲線和讀數保留。',
    autoDemoTerminatedTarget: '自動演示流程',
    autoDemoTerminatedProgress: '演示已停止，使用者可重新選擇模式。',
    autoDemoTerminatedNote: '使用者互動已恢復，可重新開始或進入引導 / 自由操作。',
    autoDemoTerminatedToast: '演示已終止',
    autoDemoTerminatedLog: (name: string) => `${name}：自動演示已終止。`,
    safetyLimit: '安全上限',
    safetyActive: '啟用',
    pressureAlarmTitle: '警報',
    pressureWarningFallback: '壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。',
    pressureWarningObserve: '聚焦模式已退出，請立即停止打氣。',
    operationLocked: '操作鎖定',
    phaseLabels: {
      powerOff: '未開機',
      readyToZero: '等待調零',
      zeroed: '已調零',
      readyToPump: '準備打氣',
      pumping: '打氣中',
      sealedStabilizing: '封閉等待穩定',
      releasing: '快速放氣',
      recovering: '等待回溫',
      fallback: '實驗準備',
    },
    stopcock: { open: '打開', closed: '關閉' },
    safety: {
      danger: '危險',
      warning: '接近閾值',
      normal: '安全',
      dangerNote: '停止打氣',
      warningNote: '準備停止打氣',
      normalNote: '可繼續觀察',
    },
    zeroStatus: {
      completed: '已完成',
      adjustable: '可調零',
      notReady: '未就緒',
    },
    hints: {
      powerOff: '請先打開電源。',
      readyToZero: '請觀察 Uₚ，並進行壓強調零。',
      readyToPump: '請關閉玻璃旋塞並準備打氣。',
      pumping: '連續打氣至 Uₚ ≥ 120 mV，達到後停止加壓。',
      sealedStabilizing: '真實實驗需封閉等待 5 min，穩定後記錄 U₁。',
      releasing: '關閉玻璃旋塞，並等待回溫穩定。',
      recovering: '關閉玻璃旋塞後等待 5 min，回溫穩定後記錄 U₂。',
      fallback: '觀察即時讀數變化。',
    },
    readings: {
      temperature: '溫度信號',
      pressure: '壓強差電壓',
      delta: '由目前 Uₚ 換算',
      safety: '壓力狀態',
      pumpValve: '打氣閥門',
      stopcock: '玻璃旋塞',
      zero: '壓強調零',
      currentHint: '目前提示',
      opened: '已打開',
      closed: '已關閉',
    },
  },
  en: {
    guideTitle: 'Experiment Guide',
    guideHint: 'Procedure and notes for the air heat capacity ratio experiment',
    recordsTitle: 'Data & Results',
    recordsHint: 'U₀ / U₁ / U₂ and heat capacity ratio calculation',
    dataResultsTitle: 'Data & Results',
    dataResultsHint: 'Recorded values, trial γ, and mean result',
    reviewTitle: 'Process Review',
    reviewHint: 'Free Mode trace and operation diagnosis',
    materialsTitle: 'Experiment Notes & Results',
    materialsHint: 'U₁ / U₂ and air heat capacity ratio calculation',
    closeMaterialsAria: 'Close experiment notes and results',
    materialsGroupAria: 'Expand or collapse experiment notes and results',
    materialsFolderTitle: 'Click the folder to expand or collapse; click text to select; double-click text to open all child tabs',
    materialsTabTitle: 'Click to select; double-click to open the tab',
    materialsTabsAria: 'Heat Capacity experiment notes tabs',
    previewMountAria: 'Heat capacity ratio view preview mount',
    realtimePanelTitle: 'Realtime Data',
    realtimeKicker: 'Realtime Data',
    realtimeSubtitle: 'Uₜ / Uₚ, pressure, and process samples',
    realtimeTitle: 'Air Heat Capacity Ratio Experiment',
    stagePrefix: 'Stage: ',
    demoPaused: 'Auto demo paused',
    demoRunning: 'Auto demo',
    demoReady: 'Auto demo ready',
    autoDemoStart: 'Auto demo',
    autoDemoPause: 'Pause demo',
    autoDemoResume: 'Resume demo',
    autoDemoStop: 'Stop demo',
    modeDemo: 'Demo mode',
    modeGuide: 'Guide mode',
    modeFree: 'Free mode',
    resetFreeMode: 'Reset Free mode',
    freeSpeedLabelCode: 'WAIT RATE',
    freeSpeedLabel: 'Wait speed',
    freeSpeedAria: 'Wait speed multiplier',
    freeWaitTimerLabel: { u1: 'U1 wait', u2: 'U2 wait' },
    freeWaitRecordStatus: { pending: 'Not recorded', rerecord: 'Can re-record' },
    freeSpeedNoticeKicker: 'Speed',
    freeSpeedNotice: 'Real experiments wait slowly; simulation speed controls are available to reach equilibrium faster.',
    exitGuideMode: 'Exit guide',
    exitTeachingMode: 'Exit teaching mode',
    singleTrialBadge: 'This experiment',
    trialBadge: (trialIndex: number) => `Trial ${trialIndex}`,
    autoDemoFinishedLabel: 'Demo complete',
    demoPausedLabel: 'Paused',
    demoDoneLabel: 'Complete',
    demoTargetLabel: 'Target control',
    demoProgressLabel: 'Standard',
    demoObservationLabel: 'Observation',
    autoDemoFinishedTitle: 'Demo complete',
    autoDemoFinishedDescription: 'Demo complete. You can restart or use guide / free mode.',
    demoFallbackNote: 'Process samples are retained.',
    startGuideExperiment: 'Guide mode',
    skipRecoveryWait: 'The real experiment would wait for the system to stabilize; this program omits that wait.',
    recordU0: 'Record U₀',
    recordU1: 'Record U₁ / Uₜ₁',
    recordU2: 'Record U₂ / Uₜ₂',
    recordDialogConfirm: 'Confirm record',
    recordDialogCancel: 'Cancel',
    recordDialogCurrentPhase: 'Current phase',
    recordDialogPressure: 'Current Uₚ',
    recordDialogTemperature: 'Current Uₜ',
    recordDialogStopcock: 'Glass stopcock',
    recordDialogPumpValve: 'Pump valve',
    recordDialogReady: 'Current state is suitable for recording.',
    recordU0Warning: 'Complete pressure zeroing first so Uₚ is close to 0.',
    recordU1Warning: 'The pre-release stable state has not been reached. U₁ recording is not recommended.',
    recordU2Warning: 'Thermal recovery is not complete. U₂ recording is not recommended.',
    guideStrongReminder: 'Click the target control to continue the experiment.',
    guideStrongReminderPressureZero: 'Adjust the pressure-zero knob to continue the experiment.',
    guidePumpInsufficientReminder: 'Uₚ has not reached 120 mV. Continue pumping.',
    guideRecordBlockedMessages: {
      u0NeedPower: 'U₀ cannot be recorded yet. Turn on the power first.',
      u0NeedStopcock: 'U₀ cannot be recorded yet. Open the glass stopcock first.',
      u0NeedZero: 'U₀ cannot be recorded yet. Complete pressure zeroing first.',
      u0NeedCurrentStep: 'U₀ cannot be recorded yet. Continue the current step.',
      u1NeedPump: 'U₁ cannot be recorded yet. Complete pumping first.',
      u1NeedClosePumpValve: 'U₁ cannot be recorded yet. Close the pump valve first.',
      u1NeedWait: 'U₁ cannot be recorded yet. Wait until the timer reaches 5 min.',
      u1NeedCurrentStep: 'U₁ cannot be recorded yet. Continue the current step.',
      u2NeedRelease: 'U₂ cannot be recorded yet. Complete quick release first.',
      u2NeedCloseStopcock: 'U₂ cannot be recorded yet. Close the glass stopcock first.',
      u2NeedWait: 'U₂ cannot be recorded yet. Wait until the timer reaches 5 min.',
      u2NeedCurrentStep: 'U₂ cannot be recorded yet. Continue the current step.',
    },
    guideUsageHints: {
      zeroFocus: 'Double-click the instrument to enter focus mode and start pressure zeroing.',
      zeroAdjust: 'Drag the knob for coarse adjustment and use the wheel for fine adjustment.',
      pumpValve: 'Open the pump valve.',
      pumpFocus: 'Double-click the pump bulb to enter focus mode.',
      pumpAction: 'Double-click the pump bulb to focus, then click rapidly until Uₚ ≥ 120 mV; focus exits automatically.',
      waitU1Ready: '5 min has elapsed. Record U₁ / Uₜ₁.',
      releaseReady: 'Release time has elapsed. Close the glass stopcock.',
      waitU2Ready: '5 min has elapsed. Record U₂ / Uₜ₂.',
    },
    recordU0Success: 'U₀ recorded.',
    recordU0SuccessToast: 'U₀ recorded successfully.',
    recordU1SuccessToast: 'U₁ and Uₜ recorded successfully.',
    recordU2SuccessToast: 'U₂ and Uₜ recorded successfully.',
    finalTrialCompleteToast: 'The experiment is complete.',
    freePowerOffBeforeNextGroup: 'Turn off the power to complete this trial before adjusting parameters.',
    freeRecordSuccessLog: {
      u0: 'Free Mode recorded the U₀ display value.',
      u1: 'Free Mode recorded the U₁ display value.',
      u2: 'Free Mode recorded the U₂ display value.',
    },
    freeModeActiveLog: (name: string) => `${name}: Free Mode active.`,
    freeRunResetLog: (name: string) => `${name}: Free Mode run reset.`,
    freeRecordRejectMessages: {
      'zero-not-ready': 'Turn on power and open the glass stopcock before recording U₀.',
      'missing-u0': 'Record U₀ before recording U₁ or U₂.',
      'calibration-changed': 'The zeroing state changed. Record U₀ again before continuing.',
      'unstable-pressure': 'The pressure reading is still changing. Wait until it is stable.',
      'unstable-temperature': 'The temperature reading is still changing. Wait until it returns to a stable ambient value.',
      'insufficient-u1': 'U₁ pressure difference is too small. Close the stopcock and keep pumping into the effective range.',
      'release-not-started': 'Complete the quick release and close the stopcock before recording U₂.',
      'over-vented': 'The release was excessive and U₂ is below the effective range. Restart this Free trial.',
      'pressure-danger': 'Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.',
      'invalid-sequence': 'This point cannot be recorded in the current sequence. Record in U₀, U₁, U₂ order.',
    } satisfies Record<HeatCapacityFreeRecordRejectReason, string>,
    pumpFrequencySlowToast: 'Pumping is too slow. Increase the pumping rate.',
    pressureWarningMessage: 'Pressure has reached the recommended pumping range. Stop pumping and wait for thermal recovery.',
    pressureAlarmMessage: 'Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.',
    closePumpValveReminder: 'Close the pump valve.',
    pressureAlarmLog: (name: string) => `${name}: Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.`,
    toastSystemKicker: 'SYSTEM',
    autoDemoLockedToast: 'Cannot operate during the demo',
    autoDemoCompletedLockedToast: 'Demo is complete. Exit before operating in Free Mode.',
    guideCompletedLockedToast: 'Guide is complete. Exit before operating in Free Mode.',
    autoDemoCompletionToast: 'Demo complete',
    guideModeStartingToast: 'Starting guide mode',
    guideModeExitedToast: 'Guide mode stopped',
    teachingModeExitedToast: 'Teaching mode exited',
    guideModeExitedLog: (name: string) => `${name}: guide mode stopped.`,
    autoDemoPreparingHint: 'The system is restoring default state and will start the demo shortly',
    autoDemoReadyToCompleteHint: 'Auto demo is about to finish; process samples are retained',
    autoDemoImportedCompleteLog: (name: string) => `${name}: auto-demo data imported and calculated.`,
    autoDemoResumedLog: (name: string) => `${name}: auto demo resumed.`,
    autoDemoRunningLog: (name: string) => `${name}: auto demo is already running.`,
    autoDemoPreparingTitle: 'Preparing demo',
    autoDemoInitializingDescription: 'Initializing auto demo',
    autoDemoPreparingTarget: 'Auto demo setup',
    autoDemoPreparingProgress: 'After reset, the demo starts from power-on.',
    autoDemoPreparingNote: 'The system is resetting controls, view, and demo data. After that it starts from power on.',
    autoDemoInitializingToast: 'Initializing auto demo',
    autoDemoStartedLog: (name: string) => `${name}: auto demo started.`,
    autoDemoPausedHint: 'Auto demo paused',
    autoDemoPausedToast: 'Demo paused',
    autoDemoPausedLog: (name: string) => `${name}: auto demo paused.`,
    autoDemoTerminatedHint: 'Auto demo stopped',
    autoDemoTerminatedTitle: 'Demo stopped',
    autoDemoTerminatedDescription: 'Auto demo has stopped. Current curves and readings are retained.',
    autoDemoTerminatedTarget: 'Auto demo flow',
    autoDemoTerminatedProgress: 'The demo is stopped. Choose a mode to continue.',
    autoDemoTerminatedNote: 'User interaction is restored. You can restart or enter guide / free mode.',
    autoDemoTerminatedToast: 'Demo stopped',
    autoDemoTerminatedLog: (name: string) => `${name}: auto demo stopped.`,
    safetyLimit: 'Safety limit',
    safetyActive: 'Active',
    pressureAlarmTitle: 'Alarm',
    pressureWarningFallback: 'Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.',
    pressureWarningObserve: 'Focus mode has exited. Stop pumping immediately.',
    operationLocked: 'Operation locked',
    phaseLabels: {
      powerOff: 'Power off',
      readyToZero: 'Waiting to zero',
      zeroed: 'Zeroed',
      readyToPump: 'Ready to pump',
      pumping: 'Pumping',
      sealedStabilizing: 'Sealed stabilization',
      releasing: 'Quick release',
      recovering: 'Thermal recovery',
      fallback: 'Experiment ready',
    },
    stopcock: { open: 'Open', closed: 'Closed' },
    safety: {
      danger: 'Danger',
      warning: 'Approaching threshold',
      normal: 'Safe',
      dangerNote: 'Stop pumping',
      warningNote: 'Prepare to stop',
      normalNote: 'Continue observing',
    },
    zeroStatus: {
      completed: 'Complete',
      adjustable: 'Adjustable',
      notReady: 'Not ready',
    },
    hints: {
      powerOff: 'Turn on the power first.',
      readyToZero: 'Observe Uₚ and zero the pressure signal.',
      readyToPump: 'Close the glass stopcock and prepare to pump.',
      pumping: 'Pump continuously until Uₚ ≥ 120 mV, then stop pressurizing.',
      sealedStabilizing: 'In the real procedure, wait sealed for 5 min, then record U₁.',
      releasing: 'Close the glass stopcock and wait for thermal recovery.',
      recovering: 'After closing the stopcock, wait 5 min and record U₂ after recovery.',
      fallback: 'Observe live readings.',
    },
    readings: {
      temperature: 'Temperature signal',
      pressure: 'Pressure-difference voltage',
      delta: 'Converted from current Uₚ',
      safety: 'Pressure status',
      pumpValve: 'Pump valve',
      stopcock: 'Glass stopcock',
      zero: 'Pressure zero',
      currentHint: 'Current hint',
      opened: 'Open',
      closed: 'Closed',
    },
  },
} as const;

const getHeatCapacityRealtimeCopy = (language: WorkbenchLanguagePreference) => (
  heatCapacityRealtimeCopies[language] ?? heatCapacityRealtimeCopies['zh-CN']
);

const getHeatCapacityFreeRecordRejectMessage = (
  reason: HeatCapacityFreeRecordRejectReason,
  copy: ReturnType<typeof getHeatCapacityRealtimeCopy>,
) => copy.freeRecordRejectMessages[reason];

interface WorkbenchLayoutDefaultState {
  resultsHeightRatio: number;
  liveWorkspaceSplitRatio: number;
}

interface WorkbenchLayoutDefaults {
  standard: WorkbenchLayoutDefaultState;
  ideal: WorkbenchLayoutDefaultState;
  heatCapacity: WorkbenchLayoutDefaultState;
}

const hasDesktopExportBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabExporter)
);

const hasDesktopUpdaterBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabUpdater)
);

const hasDesktopWindowControlBridge = () => (
  typeof window !== 'undefined' &&
  Boolean(
    window.hardSphereLabWindow?.minimize &&
    window.hardSphereLabWindow?.toggleMaximize &&
    window.hardSphereLabWindow?.close,
  )
);

const getFreshWorkbenchWindowUrl = () => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('hslFreshWindow', '1');
  return url.toString();
};

const isExportEnvironmentAvailableStatus = (status: WorkbenchExportEnvironmentStatus) => (
  status === 'available-system' || status === 'available-bundled'
);

const getAboutEnvironmentStatusLabel = (
  status: WorkbenchExportEnvironmentStatus,
  copy: WorkbenchCopy,
) => {
  if (status === 'checking') return copy.about.checking;
  if (isExportEnvironmentAvailableStatus(status)) return copy.about.available;
  if (status === 'error') return copy.about.error;
  return copy.about.unavailable;
};

const getAboutEnvironmentResultBody = (
  status: WorkbenchExportEnvironmentStatus,
  copy: WorkbenchCopy,
) => {
  if (isExportEnvironmentAvailableStatus(status)) return copy.about.environmentResultAvailable;
  if (status === 'error') return copy.about.environmentResultError;
  return copy.about.environmentResultUnavailable;
};

const getAboutUpdateStatusLabel = (
  state: WorkbenchUpdateState,
  copy: WorkbenchCopy,
) => {
  if (state.status === 'checking') return copy.about.checking;
  if (state.status === 'available') return copy.about.updateAvailableStatus(state.latestVersion || '--');
  if (state.status === 'not-available') return copy.about.upToDateStatus;
  if (state.status === 'downloading') return copy.about.downloadingUpdateStatus(state.percent ?? null);
  if (state.status === 'retrying') return copy.about.retryingUpdateStatus(state.downloadAttempt ?? null, state.maxDownloadAttempts ?? null);
  if (state.status === 'downloaded') return copy.about.updateReadyStatus;
  if (state.status === 'unsupported') return copy.about.unsupportedUpdateStatus;
  if (state.status === 'error') return copy.about.updateErrorStatus;
  return hasDesktopUpdaterBridge() ? copy.about.available : copy.about.unsupportedUpdateStatus;
};

const getWorkbenchLocalizedText = (
  value: WorkbenchLocalizedText | null | undefined,
  language: WorkbenchLanguagePreference,
) => (
  value?.[language] || value?.['zh-CN'] || value?.en || null
);

const WORKBENCH_VALIDATION_ERROR_COPIES: Record<WorkbenchLanguagePreference, Record<string, string>> = {
  'zh-CN': {
    'N must be greater than 0.': 'N 必须大于 0。',
    'L must be greater than 0.': 'L 必须大于 0。',
    'r must be greater than 0.': 'r 必须大于 0。',
    'dt must be greater than 0.': 'dt 必须大于 0。',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime 必须大于或等于 0。',
    'statsDuration must be greater than 0.': 'statsDuration 必须大于 0。',
    'targetTemperature must be greater than 0.': 'targetTemperature 必须大于 0。',
  },
  'zh-TW': {
    'N must be greater than 0.': 'N 必須大於 0。',
    'L must be greater than 0.': 'L 必須大於 0。',
    'r must be greater than 0.': 'r 必須大於 0。',
    'dt must be greater than 0.': 'dt 必須大於 0。',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime 必須大於或等於 0。',
    'statsDuration must be greater than 0.': 'statsDuration 必須大於 0。',
    'targetTemperature must be greater than 0.': 'targetTemperature 必須大於 0。',
  },
  en: {
    'N must be greater than 0.': 'N must be greater than 0.',
    'L must be greater than 0.': 'L must be greater than 0.',
    'r must be greater than 0.': 'r must be greater than 0.',
    'dt must be greater than 0.': 'dt must be greater than 0.',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime must be 0 or greater.',
    'statsDuration must be greater than 0.': 'statsDuration must be greater than 0.',
    'targetTemperature must be greater than 0.': 'targetTemperature must be greater than 0.',
  },
};

const getLocalizedWorkbenchValidationErrors = (
  errors: string[],
  language: WorkbenchLanguagePreference,
) => {
  const copy = WORKBENCH_VALIDATION_ERROR_COPIES[language] ?? WORKBENCH_VALIDATION_ERROR_COPIES['zh-CN'];
  return errors.map((error) => copy[error] ?? error);
};

const formatWorkbenchReleaseDate = (
  value: string | null | undefined,
  language: WorkbenchLanguagePreference,
) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = language === 'en' ? 'en-GB' : language;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getWorkbenchFileKindLabel = (kind: WorkbenchFileKind, copy: WorkbenchCopy['files']) => (
  kind === 'standard' ? copy.std : kind === 'ideal' ? copy.ideal : copy.heat
);

const formatWorkbenchLastOpenedAt = (
  timestamp: number,
  language: WorkbenchLanguagePreference,
) => {
  const date = new Date(timestamp);
  if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime())) return '--';

  const formatter = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language, {
    year: 'numeric',
    month: language === 'en' ? 'short' : '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (language === 'en') return formatter.format(date);

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}`;
};

const getWorkbenchSessionCacheSummary = (
  files: WorkbenchFileState[],
  copy: WorkbenchCopy,
) => {
  const counts = files.reduce(
    (nextCounts, file) => ({
      ideal: nextCounts.ideal + (file.kind === 'ideal' ? 1 : 0),
      heat: nextCounts.heat + (file.kind === 'heatCapacity' ? 1 : 0),
      standard: nextCounts.standard + (file.kind === 'standard' ? 1 : 0),
    }),
    { ideal: 0, heat: 0, standard: 0 },
  );
  return {
    summary: copy.about.sessionCacheSummary(files.length),
    breakdown: copy.about.sessionCacheBreakdown(counts.ideal, counts.heat, counts.standard),
  };
};

const isWorkbenchThemePreference = (value: unknown): value is WorkbenchThemePreference => (
  value === 'system' || value === 'light' || value === 'dark'
);

const isWorkbenchLanguagePreference = (value: unknown): value is WorkbenchLanguagePreference => (
  value === 'zh-CN' || value === 'zh-TW' || value === 'en'
);

const isWorkbenchPerformanceMode = (value: unknown): value is WorkbenchPerformanceMode => (
  typeof value === 'string' && HEAT_CAPACITY_QUALITY_MODE_ORDER.includes(value as HeatCapacityQualityMode)
);

const getSystemWorkbenchTheme = (): WorkbenchResolvedTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const loadWorkbenchGeneralSettings = (): WorkbenchGeneralSettings => {
  if (typeof window === 'undefined') return defaultWorkbenchGeneralSettings;

  try {
    const raw = window.localStorage.getItem(WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultWorkbenchGeneralSettings;

    const parsed = JSON.parse(raw) as Partial<WorkbenchGeneralSettings>;
    return {
      theme: isWorkbenchThemePreference(parsed.theme) ? parsed.theme : defaultWorkbenchGeneralSettings.theme,
      language: isWorkbenchLanguagePreference(parsed.language) ? parsed.language : defaultWorkbenchGeneralSettings.language,
      performanceMode: isWorkbenchPerformanceMode(parsed.performanceMode) ? parsed.performanceMode : defaultWorkbenchGeneralSettings.performanceMode,
    };
  } catch {
    return defaultWorkbenchGeneralSettings;
  }
};

const persistWorkbenchGeneralSettings = (settings: WorkbenchGeneralSettings) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Settings are UI preferences; failing to persist should not affect simulation work.
  }
};

const snapshotParticles = (engine: PhysicsEngine): Particle[] => (
  engine.particles.map((particle) => ({ ...particle }))
);

const formatMetric = (value: number, digits = 3) => {
  if (!Number.isFinite(value)) return '--';
  return value.toFixed(digits);
};

const formatHeatCapacityFreeWaitTimer = (seconds: number) => {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getHeatCapacityFreeWaitTimerProgressColor = (progressRatio: number) => {
  const warningRatio = clamp((progressRatio - 0.72) / 0.28, 0, 1);
  const easedWarningRatio = warningRatio * warningRatio * (3 - 2 * warningRatio);
  const red = Math.round(14 + (239 - 14) * easedWarningRatio);
  const green = Math.round(165 + (68 - 165) * easedWarningRatio);
  const blue = Math.round(233 + (68 - 233) * easedWarningRatio);
  return `rgb(${red}, ${green}, ${blue})`;
};

const getIdealScanStep = (relation: ExperimentRelation) => (
  relation === 'pn' ? 1 : relation === 'pv' ? 0.1 : 0.01
);

const getIdealScanDecimals = (relation: ExperimentRelation) => (
  relation === 'pn' ? 0 : relation === 'pv' ? 1 : 2
);

const getIdealScanStepLabel = (relation: ExperimentRelation) => (
  relation === 'pt' ? '0.01' : relation === 'pv' ? '0.1' : '1'
);

const getIdealScanInputLabel = (relation: ExperimentRelation) => (
  relation === 'pt' ? 'Target temperature' : relation === 'pv' ? 'L' : 'N'
);

const isIdealScanValueOnStep = (rawValue: string, relation: ExperimentRelation) => {
  if (relation === 'pn') return /^\d+$/.test(rawValue.trim());
  const fractionalPart = rawValue.trim().split('.')[1] ?? '';
  const trimmedFractionalPart = fractionalPart.replace(/0+$/, '');
  return trimmedFractionalPart.length <= getIdealScanDecimals(relation);
};

const getIdealScanPositionPercent = (value: number, scanMin: number, scanRange: number) => (
  scanRange > 0 ? clamp(((value - scanMin) / scanRange) * 100, 0, 100) : 0
);

const formatMaybeMetric = (value: number | null | undefined, digits = 3) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const renderScientificText = (text: string): React.ReactNode => {
  const parts = text.split(/(Uₜ₁|Uₜ₂|Uₜ|Uₚ)/g);
  return parts.map((part, index) => {
    if (part === 'Uₜ₁') return <React.Fragment key={`${part}-${index}`}>U<sub>T1</sub></React.Fragment>;
    if (part === 'Uₜ₂') return <React.Fragment key={`${part}-${index}`}>U<sub>T2</sub></React.Fragment>;
    if (part === 'Uₜ') return <React.Fragment key={`${part}-${index}`}>U<sub>T</sub></React.Fragment>;
    if (part === 'Uₚ') return <React.Fragment key={`${part}-${index}`}>U<sub>p</sub></React.Fragment>;
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const formatPercent = (value: number) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getHistogramSampleCount = (bins: HistogramBin[]) => bins.reduce((sum, bin) => sum + bin.count, 0);

const getCompactHistogramBins = (bins: HistogramBin[], maxBars = 36) => {
  if (bins.length <= maxBars) return bins;
  const stride = Math.ceil(bins.length / maxBars);
  const compactBins: HistogramBin[] = [];

  for (let index = 0; index < bins.length; index += stride) {
    const group = bins.slice(index, index + stride);
    const count = group.reduce((sum, bin) => sum + bin.count, 0);
    const probability = group.reduce((sum, bin) => sum + bin.probability, 0) / group.length;
    const theoretical = group.reduce((sum, bin) => sum + (bin.theoretical ?? 0), 0) / group.length;
    compactBins.push({
      binStart: group[0].binStart,
      binEnd: group[group.length - 1].binEnd,
      count,
      probability,
      theoretical,
    });
  }

  return compactBins;
};

const FINAL_CHART_VIEWBOX_WIDTH = 100;
const FINAL_CHART_VIEWBOX_HEIGHT = 64;
const FINAL_CHART_LEFT = 10;
const FINAL_CHART_RIGHT = 94;
const FINAL_CHART_TOP = 8;
const FINAL_CHART_BOTTOM = 54;
const FINAL_CHART_PLOT_WIDTH = FINAL_CHART_RIGHT - FINAL_CHART_LEFT;
const FINAL_CHART_PLOT_HEIGHT = FINAL_CHART_BOTTOM - FINAL_CHART_TOP;
type FinalChartLegendPosition = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';
type FinalChartLegendItem = {
  kind: 'bar' | 'line' | 'point' | 'boundary';
  label: string;
  className?: string;
};

const getIdealExperimentLanguageCode = (
  language: WorkbenchLanguagePreference,
): IdealExperimentLanguageCode => (
  language === 'en' ? 'en-GB' : language
);

const idealParamKeys: ExperimentParamKey[] = [
  'N',
  'L',
  'r',
  'm',
  'k',
  'dt',
  'nu',
  'targetTemperature',
  'equilibriumTime',
  'statsDuration',
];

const getChangedIdealParamKeys = (
  previousParams: SimulationParams,
  nextParams: SimulationParams,
): ExperimentParamKey[] => (
  idealParamKeys.filter((key) => {
    const previousValue = previousParams[key as keyof SimulationParams];
    const nextValue = nextParams[key as keyof SimulationParams];
    return previousValue !== nextValue;
  })
);

const getIdealVerificationState = (
  analysis: IdealGasAnalysis,
): WorkbenchIdealState['verificationState'] => {
  if (analysis.isVerified) return 'verified';
  if (analysis.verdictState === 'insufficient') return 'collecting';
  return analysis.sortedPoints.length === 0 ? 'not-started' : 'failed';
};

const createStandardPanels = (copy: WorkbenchCopy): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Activity size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.realtimeTitle, hint: copy.panels.standardRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'results', title: copy.panels.standardResultsTitle, hint: copy.panels.standardResultsHint, icon: <Gauge size={13} /> },
];

const createIdealPanels = (copy: WorkbenchCopy): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Activity size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.realtimeTitle, hint: copy.panels.idealRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'results', title: copy.panels.idealResultsTitle, hint: copy.panels.idealResultsHint, icon: <Gauge size={13} /> },
  { key: 'experimentPoints', title: copy.panels.pointsTitle, hint: copy.panels.pointsHint, icon: <Table2 size={13} /> },
  { key: 'verification', title: copy.panels.verificationTitle, hint: copy.panels.verificationHint, icon: <BarChart3 size={13} /> },
];

const createHeatCapacityPanels = (
  copy: WorkbenchCopy,
  heatCopy: ReturnType<typeof getHeatCapacityRealtimeCopy>,
): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Gauge size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.heatRealtimeTitle, hint: copy.panels.heatRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'heatCapacityGuide', title: heatCopy.guideTitle, hint: heatCopy.guideHint, icon: <BookOpen size={13} /> },
  { key: 'heatCapacityRecords', title: heatCopy.recordsTitle, hint: heatCopy.recordsHint, icon: <Table2 size={13} /> },
  { key: 'heatCapacityReview', title: heatCopy.reviewTitle, hint: heatCopy.reviewHint, icon: <PanelTopOpen size={13} /> },
];

const createResultsSections = (copy: WorkbenchCopy): Array<{ key: ResultsSectionKey; title: string; icon: React.ReactNode }> => [
  { key: 'summary', title: copy.panels.summaryTitle, icon: <Gauge size={12} /> },
  { key: 'dataTable', title: copy.panels.dataTableTitle, icon: <Table2 size={12} /> },
  { key: 'figures', title: copy.panels.figuresTitle, icon: <BarChart3 size={12} /> },
];

const idealRelationOptions: Array<{ key: ExperimentRelation; label: string }> = [
  { key: 'pt', label: 'P-T' },
  { key: 'pv', label: 'P-V' },
  { key: 'pn', label: 'P-N' },
];

const idealRelationKeys: ExperimentRelation[] = ['pt', 'pv', 'pn'];
const standardResultsTabKeys: WorkbenchStandardResultsTab[] = ['summary', 'dataTable', 'figures'];
const idealResultWindowKeys: WorkbenchIdealResultWindowKey[] = ['experimentPoints', 'verification'];
const heatCapacityMaterialsTabOrder: WorkbenchHeatCapacityTabId[] = ['guide', 'records', 'review'];
const getHeatCapacityMaterialsTabOrder = (_file: WorkbenchFileState): WorkbenchHeatCapacityTabId[] => heatCapacityMaterialsTabOrder;

const isIdealResultWindowKey = (key: string): key is WorkbenchIdealResultWindowKey => (
  key === 'experimentPoints' || key === 'verification'
);

const isStandardResultsTab = (key: string): key is WorkbenchStandardResultsTab => (
  standardResultsTabKeys.includes(key as WorkbenchStandardResultsTab)
);

const isHeatCapacityPanelKey = (key: WorkbenchPanelKey): key is WorkbenchHeatCapacityPanelKey => (
  key === 'heatCapacityGuide' ||
  key === 'heatCapacityRecords' ||
  key === 'heatCapacityReview'
);

const heatCapacityTabIdToPanelKey = (tabId: WorkbenchHeatCapacityTabId): WorkbenchHeatCapacityPanelKey => (
  tabId === 'guide'
    ? 'heatCapacityGuide'
    : tabId === 'records'
      ? 'heatCapacityRecords'
      : 'heatCapacityReview'
);

const heatCapacityPanelKeyToTabId = (panelKey: WorkbenchPanelKey): WorkbenchHeatCapacityTabId | null => (
  panelKey === 'heatCapacityGuide'
    ? 'guide'
    : panelKey === 'heatCapacityRecords'
      ? 'records'
    : panelKey === 'heatCapacityReview'
      ? 'review'
      : null
);

const clampIdealResultHeightRatio = (value: number) => (
  clamp(value, IDEAL_RESULT_MIN_HEIGHT_RATIO, IDEAL_RESULT_MAX_HEIGHT_RATIO)
);

const normalizeIdealWindowLayoutState = (
  layout: WorkbenchIdealWindowLayout | (Partial<WorkbenchIdealWindowLayout> & {
    openPanels?: WorkbenchIdealResultWindowKey[];
    frontHeightRatio?: number;
    backHeightRatio?: number;
    hasCustomHeights?: boolean;
  }) | null | undefined,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
): WorkbenchIdealWindowLayout => {
  const legacyLayout = layout as (Partial<WorkbenchIdealWindowLayout> & {
    openPanels?: string[];
    frontHeightRatio?: number;
    backHeightRatio?: number;
    hasCustomHeights?: boolean;
  }) | null | undefined;
  const openTabs = legacyLayout?.openTabs?.filter(isIdealResultWindowKey) as WorkbenchIdealResultWindowKey[] | undefined;
  const legacyOpenPanels = legacyLayout?.openPanels?.filter(isIdealResultWindowKey) as WorkbenchIdealResultWindowKey[] | undefined;
  const activeIdealResultTab: WorkbenchIdealResultWindowKey = legacyLayout?.activeIdealResultTab
    ?? legacyOpenPanels?.slice(-1)[0]
    ?? 'experimentPoints';
  const normalizedOpenTabs: WorkbenchIdealResultWindowKey[] = openTabs?.length ? openTabs : ['experimentPoints', 'verification'];
  const heightRatio = clampIdealResultHeightRatio(
    legacyLayout?.heightRatio
    ?? legacyLayout?.frontHeightRatio
    ?? legacyLayout?.backHeightRatio
    ?? defaults?.resultsHeightRatio
    ?? IDEAL_RESULT_HEIGHT_RATIO,
  );

  return {
    openTabs: normalizedOpenTabs,
    activeIdealResultTab: normalizedOpenTabs.includes(activeIdealResultTab) ? activeIdealResultTab : normalizedOpenTabs[0],
    heightRatio,
    hasCustomHeight: Boolean(legacyLayout?.hasCustomHeight ?? legacyLayout?.hasCustomHeights),
  };
};

const normalizeStandardResultsLayout = (
  layout: Partial<WorkbenchStandardResultsLayout> | null | undefined,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
): WorkbenchStandardResultsLayout => {
  const openTabs = layout?.openTabs?.filter(isStandardResultsTab) as WorkbenchStandardResultsTab[] | undefined;
  const normalizedOpenTabs: WorkbenchStandardResultsTab[] = openTabs?.length ? openTabs : ['summary', 'dataTable', 'figures'];
  const activeTab = layout?.activeTab && normalizedOpenTabs.includes(layout.activeTab)
    ? layout.activeTab
    : normalizedOpenTabs[0];

  return {
    openTabs: normalizedOpenTabs,
    activeTab,
    heightRatio: clampIdealResultHeightRatio(layout?.heightRatio ?? defaults?.resultsHeightRatio ?? IDEAL_RESULT_HEIGHT_RATIO),
  };
};

const pickNextOpenTab = <T extends string>(tabs: T[], closingTab: T) => {
  const closingIndex = tabs.indexOf(closingTab);
  if (closingIndex < 0) return tabs[0] ?? null;
  return tabs[closingIndex + 1] ?? tabs[closingIndex - 1] ?? null;
};

const createDefaultWorkbenchLayoutDefaults = (): WorkbenchLayoutDefaults => ({
  standard: {
    resultsHeightRatio: IDEAL_RESULT_HEIGHT_RATIO,
    liveWorkspaceSplitRatio: WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  },
  ideal: {
    resultsHeightRatio: IDEAL_RESULT_HEIGHT_RATIO,
    liveWorkspaceSplitRatio: WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  },
  heatCapacity: {
    resultsHeightRatio: IDEAL_RESULT_HEIGHT_RATIO,
    liveWorkspaceSplitRatio: WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  },
});

const sanitizeWorkbenchLayoutDefaultState = (
  defaults: Partial<WorkbenchLayoutDefaultState> | null | undefined,
): WorkbenchLayoutDefaultState => ({
  resultsHeightRatio: clampIdealResultHeightRatio(defaults?.resultsHeightRatio ?? IDEAL_RESULT_HEIGHT_RATIO),
  liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(defaults?.liveWorkspaceSplitRatio),
});

const sanitizeIdealResultWindowDefaults = (
  defaults: Partial<Pick<WorkbenchIdealWindowLayout, 'heightRatio'>> | null | undefined,
): WorkbenchLayoutDefaultState => {
  const legacyDefaults = defaults as Partial<Pick<WorkbenchIdealWindowLayout, 'heightRatio'>> & {
    frontHeightRatio?: number;
    backHeightRatio?: number;
  } | null | undefined;
  return {
    resultsHeightRatio: clampIdealResultHeightRatio(
      legacyDefaults?.heightRatio
      ?? legacyDefaults?.frontHeightRatio
      ?? legacyDefaults?.backHeightRatio
      ?? IDEAL_RESULT_HEIGHT_RATIO,
    ),
    liveWorkspaceSplitRatio: WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  };
};

const sanitizeWorkbenchLayoutDefaults = (
  defaults: Partial<WorkbenchLayoutDefaults> | null | undefined,
): WorkbenchLayoutDefaults => {
  const fallback = createDefaultWorkbenchLayoutDefaults();
  return {
    standard: sanitizeWorkbenchLayoutDefaultState(defaults?.standard ?? fallback.standard),
    ideal: sanitizeWorkbenchLayoutDefaultState(defaults?.ideal ?? fallback.ideal),
    heatCapacity: sanitizeWorkbenchLayoutDefaultState(defaults?.heatCapacity ?? fallback.heatCapacity),
  };
};

const loadWorkbenchLayoutDefaults = (): WorkbenchLayoutDefaults => {
  if (typeof window === 'undefined') return createDefaultWorkbenchLayoutDefaults();

  try {
    const stored = window.localStorage.getItem(WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY);
    if (stored) return sanitizeWorkbenchLayoutDefaults(JSON.parse(stored) as Partial<WorkbenchLayoutDefaults>);

    const legacyStored = window.localStorage.getItem(IDEAL_RESULT_WINDOW_DEFAULTS_STORAGE_KEY);
    if (!legacyStored) return createDefaultWorkbenchLayoutDefaults();
    return sanitizeWorkbenchLayoutDefaults({
      ideal: sanitizeIdealResultWindowDefaults(JSON.parse(legacyStored)),
    });
  } catch {
    return createDefaultWorkbenchLayoutDefaults();
  }
};

const persistWorkbenchLayoutDefaults = (defaults: WorkbenchLayoutDefaults) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY,
    JSON.stringify(sanitizeWorkbenchLayoutDefaults(defaults)),
  );
};

const idealSamplingPresets: Array<{ key: IdealSamplingPresetKey; label: string; equilibriumTime: number; statsDuration: number }> = [
  { key: 'fast', label: 'Fast', equilibriumTime: 2, statsDuration: 6 },
  { key: 'balanced', label: 'Balanced', equilibriumTime: 4, statsDuration: 12 },
  { key: 'stable', label: 'Stable', equilibriumTime: 6, statsDuration: 20 },
] as const;
type IdealSamplingPreset = typeof idealSamplingPresets[number];

const formatTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

const createInitialLogs = (language: WorkbenchLanguagePreference): ConsoleLog[] => {
  const copy = workbenchCopies[language].logs;
  return [
  { id: 1, time: formatTime(), kind: 'info', message: copy.initialized },
  { id: 2, time: formatTime(), kind: 'success', message: copy.defaultLayout },
  { id: 3, time: formatTime(), kind: 'success', message: copy.standardConnected },
  { id: 4, time: formatTime(), kind: 'warning', message: copy.exportBridgeRequired },
];
};

const getWorkbenchParameterDisplayLabel = (
  param: WorkbenchParameterRow,
  copy: WorkbenchCopy,
) => copy.parameters.parameterLabels[param.key] ?? (param.unit ? `${param.label} (${param.unit})` : param.label);

const getWorkbenchParameterDisplayUnit = (
  param: WorkbenchParameterRow,
  language: WorkbenchLanguagePreference,
) => {
  if (!param.unit) return '';
  if (param.key === 'N' && param.unit === 'particles') {
    if (language === 'zh-CN') return '个';
    if (language === 'zh-TW') return '個';
  }
  return param.unit;
};

const getWorkbenchParameterDetail = (param: WorkbenchParameterRow) => (
  param.key === 'relation' ? null : WORKBENCH_PARAMETER_DETAILS[param.key as ExperimentParamKey]
);

const assignWorkbenchParameterValue = (
  params: SimulationParams,
  key: keyof SimulationParams | 'relation',
  parsedValue: number,
) => {
  if (key === 'N') {
    params.N = Math.round(parsedValue);
  } else if (key === 'L') {
    params.L = parsedValue;
  } else if (key === 'r') {
    params.r = parsedValue;
  } else if (key === 'm') {
    params.m = parsedValue;
  } else if (key === 'k') {
    params.k = parsedValue;
  } else if (key === 'dt') {
    params.dt = parsedValue;
  } else if (key === 'nu') {
    params.nu = parsedValue;
  } else if (key === 'equilibriumTime') {
    params.equilibriumTime = parsedValue;
  } else if (key === 'statsDuration') {
    params.statsDuration = parsedValue;
  } else if (key === 'targetTemperature') {
    params.targetTemperature = parsedValue;
  }
};

const getLocalizedStatusValue = (value: string | undefined, copy: WorkbenchCopy) => (
  value ? copy.status.verdictStates[value] ?? copy.status.runStates[value as WorkbenchFileState['runState']] ?? value : copy.status.none
);

const isEditableElement = (element: EventTarget | Element | null) => {
  if (!(element instanceof HTMLElement)) return false;
  const tagName = element.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    element.isContentEditable
  );
};

const cloneWorkbenchChartData = (data: WorkbenchFileState['chartData']) => ({
  speed: data.speed.map((item) => ({ ...item })),
  energy: data.energy.map((item) => ({ ...item })),
  energyLog: data.energyLog.map((item) => ({ ...item })),
  tempHistory: data.tempHistory.map((item) => ({ ...item })),
});

const cloneHeatCapacityProcessSamples = (
  samples: WorkbenchHeatCapacityState['heatCapacityProcessSamples'],
): WorkbenchHeatCapacityState['heatCapacityProcessSamples'] => (
  Object.fromEntries(
    Object.entries(samples).map(([key, point]) => [key, point ? { ...point } : point]),
  ) as WorkbenchHeatCapacityState['heatCapacityProcessSamples']
);

const cloneWorkbenchFiles = (filesToClone: WorkbenchFileState[]): WorkbenchFileState[] => (
  filesToClone.map((file): WorkbenchFileState => {
    const common = {
      params: cloneParams(file.params),
      appliedParams: cloneParams(file.appliedParams),
      stats: { ...file.stats },
      chartData: cloneWorkbenchChartData(file.chartData),
      finalChartData: file.finalChartData ? cloneWorkbenchChartData(file.finalChartData) : null,
      visiblePanels: [...file.visiblePanels],
    };

    if (file.kind === 'standard') {
      return {
        ...file,
        ...common,
        particles: file.particles.map((particle) => ({ ...particle })),
        hardSphereEngineSnapshot: cloneHardSphereEngineSnapshot(file.hardSphereEngineSnapshot),
        standardResultsLayout: normalizeStandardResultsLayout(file.standardResultsLayout),
      };
    }

    if (file.kind === 'ideal') {
      return {
        ...file,
        ...common,
        activeParams: cloneParams(file.activeParams),
        pointsByRelation: clonePointsByRelation(file.pointsByRelation),
        latestPressureSummary: file.latestPressureSummary
          ? {
              ...file.latestPressureSummary,
              history: file.latestPressureSummary.history.map((point) => ({ ...point })),
            }
          : null,
        particles: file.particles.map((particle) => ({ ...particle })),
        hardSphereEngineSnapshot: cloneHardSphereEngineSnapshot(file.hardSphereEngineSnapshot),
        idealWindowLayout: normalizeIdealWindowLayoutState(file.idealWindowLayout),
      };
    }

    return {
      ...file,
      ...common,
      name: normalizeHeatCapacityFileName(file.name),
      particles: file.particles.map((particle) => ({ ...particle })),
      heatCapacityExperimentProfile: file.heatCapacityExperimentProfile ? { ...file.heatCapacityExperimentProfile } : null,
      pressureZeroDisplayedSamples: file.pressureZeroDisplayedSamples.map((sample) => ({ ...sample })),
      pumpStrokeTimestamps: [...file.pumpStrokeTimestamps],
      recordedPressures: { ...file.recordedPressures },
      heatCapacityProcessSamples: cloneHeatCapacityProcessSamples(file.heatCapacityProcessSamples),
      openHeatCapacityTabs: [...file.openHeatCapacityTabs],
      heatCapacityFreeTrials: file.heatCapacityFreeTrials.map((trial) => ({ ...trial })),
      heatCapacityFreePhysicsState: { ...file.heatCapacityFreePhysicsState },
      heatCapacityFreeSensorState: { ...file.heatCapacityFreeSensorState },
      heatCapacityFreeCalibrationState: {
        ...file.heatCapacityFreeCalibrationState,
        zeroEvents: file.heatCapacityFreeCalibrationState.zeroEvents.map((event) => ({ ...event })),
      },
    };
  })
);

const getRestorableHeatCapacityGuideSessionFileId = (session: WorkbenchSessionState) => {
  const fileId = session.heatCapacityGuideSession?.fileId;
  if (!fileId) return null;
  const file = session.files.find((candidate) => candidate.id === fileId);
  return file?.kind === 'heatCapacity' && file.heatCapacityMode === 'guide'
    ? file.id
    : null;
};

const WorkbenchStudioPrototype: React.FC = () => {
  const [initialSession] = useState(() => loadWorkbenchSession());
  const initialHeatCapacityGuideSessionFileId = getRestorableHeatCapacityGuideSessionFileId(initialSession);
  const [workbenchLayoutDefaults, setWorkbenchLayoutDefaults] = useState<WorkbenchLayoutDefaults>(() => loadWorkbenchLayoutDefaults());
  const [files, setFiles] = useState<WorkbenchFileState[]>(() => {
    const defaults = loadWorkbenchLayoutDefaults();
    return initialSession.files.map((file) => {
      if (file.kind === 'ideal') {
        return {
          ...file,
          liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
          idealWindowLayout: normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults.ideal),
        };
      }
      if (file.kind === 'heatCapacity') {
        const heatCapacityTabOrder = getHeatCapacityMaterialsTabOrder(file);
        const openHeatCapacityTabs = file.openHeatCapacityTabs.filter((tab) => heatCapacityTabOrder.includes(tab));
        const activeHeatCapacityTabId = file.activeHeatCapacityTabId && openHeatCapacityTabs.includes(file.activeHeatCapacityTabId)
          ? file.activeHeatCapacityTabId
          : openHeatCapacityTabs[0] ?? null;
        return {
          ...file,
          name: normalizeHeatCapacityFileName(file.name),
          visiblePanels: ['preview', 'realtime', ...openHeatCapacityTabs.map(heatCapacityTabIdToPanelKey)] as WorkbenchPanelKey[],
          openHeatCapacityTabs,
          activeHeatCapacityTabId,
          heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded !== false,
          heatCapacityTabContainerHeight: file.heatCapacityTabContainerHeight || 0.5,
          liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio ?? defaults.heatCapacity.liveWorkspaceSplitRatio),
        };
      }
      return {
        ...file,
        liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
        standardResultsLayout: normalizeStandardResultsLayout(file.standardResultsLayout, defaults.standard),
      };
    });
  });
  const [closedFiles, setClosedFiles] = useState<WorkbenchFileState[]>(() => loadClosedWorkbenchFiles());
  const initialGeneralSettings = useMemo(() => loadWorkbenchGeneralSettings(), []);
  const [activeFileId, setActiveFileId] = useState(initialSession.activeFileId);
  const [selectedFileId, setSelectedFileId] = useState(initialSession.activeFileId);
  const [selectedPanel, setSelectedPanel] = useState<WorkbenchPanelKey>(initialSession.selectedPanel);
  const [logs, setLogs] = useState<ConsoleLog[]>(() => createInitialLogs(initialGeneralSettings.language));
  const [exportEnvironmentStatus, setExportEnvironmentStatus] = useState<WorkbenchExportEnvironmentStatus>(() => (
    hasDesktopExportBridge() ? 'checking' : 'unavailable'
  ));
  const [exportEnvironmentDetail, setExportEnvironmentDetail] = useState<string | null>(null);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('logs');
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [consoleHeightPx, setConsoleHeightPx] = useState(156);
  const [openTopMenu, setOpenTopMenu] = useState<TopMenu>(null);
  const [topMenuLeft, setTopMenuLeft] = useState(10);
  const [activeTopCommandSubmenu, setActiveTopCommandSubmenu] = useState<TopCommandSubmenu | null>(null);
  const [pinnedTopCommandSubmenu, setPinnedTopCommandSubmenu] = useState<TopCommandSubmenu | null>(null);
  const [settingsGeneralOpen, setSettingsGeneralOpen] = useState(false);
  const [aboutWindowOpen, setAboutWindowOpen] = useState(false);
  const [aboutResultNotice, setAboutResultNotice] = useState<{ title: string; body: string } | null>(null);
  const [aboutUpdateChecking, setAboutUpdateChecking] = useState(false);
  const [updaterState, setUpdaterState] = useState<WorkbenchUpdateState>(() => ({
    status: hasDesktopUpdaterBridge() ? 'idle' : 'unsupported',
    currentVersion: WORKBENCH_APP_VERSION,
    latestVersion: null,
    releaseName: null,
    releaseDate: null,
    releaseNotes: null,
    releaseSummary: null,
    releaseSections: null,
    releasePageUrl: null,
    manualDownloadUrl: null,
    downloadAttempt: null,
    maxDownloadAttempts: null,
    retrying: false,
    errorKind: null,
    percent: null,
    message: '',
  }));
  const [updateDialogState, setUpdateDialogState] = useState<WorkbenchUpdateState | null>(null);
  const [desktopWindowMaximized, setDesktopWindowMaximized] = useState(false);
  const [settingsThemePreference, setSettingsThemePreference] = useState<WorkbenchThemePreference>(() => initialGeneralSettings.theme);
  const [systemWorkbenchTheme, setSystemWorkbenchTheme] = useState<WorkbenchResolvedTheme>(() => getSystemWorkbenchTheme());
  const [settingsLanguagePreference, setSettingsLanguagePreference] = useState<WorkbenchLanguagePreference>(() => initialGeneralSettings.language);
  const [settingsPerformanceMode, setSettingsPerformanceMode] = useState<WorkbenchPerformanceMode>(() => initialGeneralSettings.performanceMode);
  const [settingsLanguageMenuOpen, setSettingsLanguageMenuOpen] = useState(false);
  const settingsLanguageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const workbenchCopy = workbenchCopies[settingsLanguagePreference];
  const windowControlCopy = WORKBENCH_WINDOW_CONTROL_COPY[settingsLanguagePreference];
  const desktopWindowControlsAvailable = hasDesktopWindowControlBridge();
  const performanceModeOptions = useMemo(() => (
    HEAT_CAPACITY_QUALITY_MODE_ORDER.map((mode) => ({ mode, label: workbenchCopy.settings.performanceModeSummary[mode] }))
  ), [workbenchCopy]);
  const heatCapacityQualityProfile = HEAT_CAPACITY_QUALITY_PROFILES[settingsPerformanceMode];
  const workbenchTranslation = translations[settingsLanguagePreference === 'en' ? 'en-GB' : settingsLanguagePreference];
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [parametersCollapsed, setParametersCollapsed] = useState(() => (
    initialSession.files.find((file) => file.id === initialSession.activeFileId)?.kind === 'heatCapacity'
  ));
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(286);
  const [parameterSidebarWidth, setParameterSidebarWidth] = useState(300);
  const [filesSectionCollapsed, setFilesSectionCollapsed] = useState(false);
  const [panelsSectionCollapsed, setPanelsSectionCollapsed] = useState(false);
  const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null);
  const [pendingRemovePointId, setPendingRemovePointId] = useState<string | null>(null);
  const [pendingRemoveHeatCapacityTrialRecord, setPendingRemoveHeatCapacityTrialRecord] = useState<{
    trialIndex: number;
    kind: HeatCapacityFreeTrialRecordRemovalKind;
  } | null>(null);
  const [pendingClearRelationKey, setPendingClearRelationKey] = useState<string | null>(null);
  const [resultsChildrenCollapsed, setResultsChildrenCollapsed] = useState(false);
  const [samplingPresetMenuOpen, setSamplingPresetMenuOpen] = useState(false);
  const [idealAdvancedSettingsOpen, setIdealAdvancedSettingsOpen] = useState(false);
  const [idealAdvancedSettingsBodyVisible, setIdealAdvancedSettingsBodyVisible] = useState(false);
  const [parameterInputDrafts, setParameterInputDrafts] = useState<Record<string, string>>({});
  const [parameterErrors, setParameterErrors] = useState<string[]>([]);
  const [heatCapacityBasicInputDrafts, setHeatCapacityBasicInputDrafts] = useState<Record<string, string>>({});
  const [heatCapacityBasicInputErrors, setHeatCapacityBasicInputErrors] = useState<Record<string, string>>({});
  const [heatCapacityAdvancedOpen, setHeatCapacityAdvancedOpen] = useState(false);
  const [heatCapacityAdvancedDraft, setHeatCapacityAdvancedDraft] = useState<HeatCapacityFreeParameterDraft | null>(null);
  const [heatCapacityAdvancedInputDrafts, setHeatCapacityAdvancedInputDrafts] = useState<Record<string, string>>({});
  const [heatCapacityAdvancedInputErrors, setHeatCapacityAdvancedInputErrors] = useState<Record<string, string>>({});
  const [hoveredHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId] = useState<string | null>(null);
  const [pinnedHeatCapacityParamHelpId, setPinnedHeatCapacityParamHelpId] = useState<string | null>(null);
  const [heatCapacityParamHelpPopoverStyle, setHeatCapacityParamHelpPopoverStyle] = useState<
    React.CSSProperties | undefined
  >(undefined);
  const [scanInputDraft, setScanInputDraft] = useState('');
  const [scanInputFocused, setScanInputFocused] = useState(false);
  const [scanInputError, setScanInputError] = useState<string | null>(null);
  const [scanInputToast, setScanInputToast] = useState<string | null>(null);
  const [scanSliderThumbHover, setScanSliderThumbHover] = useState(false);
  const [scanSliderDragging, setScanSliderDragging] = useState(false);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [liveWorkspaceResizing, setLiveWorkspaceResizing] = useState(false);
  const [undoStack, setUndoStack] = useState<WorkbenchEditSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<WorkbenchEditSnapshot[]>([]);
  const standardRuntimeRef = useRef<Record<string, StandardEngineRuntime>>({});
  const idealRuntimeRef = useRef<Record<string, StandardEngineRuntime>>({});
  const filesRef = useRef<WorkbenchFileState[]>(initialSession.files);
  const activeFileIdRef = useRef(initialSession.activeFileId);
  const renamingFileIdRef = useRef<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const topCommandsRef = useRef<HTMLElement | null>(null);
  const topMenuRef = useRef<HTMLDivElement | null>(null);
  const workbenchBodyRef = useRef<HTMLElement | null>(null);
  const workspaceShellRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const liveWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const parameterSidebarResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const liveWorkspaceResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const consoleResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const resizeGhostFrameRef = useRef<number | null>(null);
  const consoleResizeRef = useRef<{ startY: number; startHeight: number; shellHeight: number; footerHeight: number } | null>(null);
  const fileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameSelectionModeRef = useRef<'initial' | 'normal'>('normal');
  const lastScanInputErrorRef = useRef<string | null>(null);
  const samplingPresetSelectRef = useRef<HTMLDivElement | null>(null);
  const consoleBodyRef = useRef<HTMLDivElement | null>(null);
  const currentParametersBodyRef = useRef<HTMLDivElement | null>(null);
  const heatCapacityParamHelpSuppressClickRef = useRef(false);
  const idealAdvancedSettingsBodyRef = useRef<HTMLDivElement | null>(null);
  const idealAdvancedSettingsPreviousScrollTopRef = useRef(0);
  const idealAdvancedScrollFrameRef = useRef<number | null>(null);
  const centerWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const fileTabsRef = useRef<HTMLDivElement | null>(null);
  const idealResultWindowRegionRef = useRef<HTMLDivElement | null>(null);
  const heatCapacityPumpAnimationRef = useRef<{
    releaseTimerId: number | null;
    idleTimerId: number | null;
  }>({ releaseTimerId: null, idleTimerId: null });
  const heatCapacityAutoDemoTimersRef = useRef<number[]>([]);
  const heatCapacityAutoDemoFileIdRef = useRef<string | null>(null);
  const heatCapacityAutoDemoTimelineRef = useRef<HeatCapacityAutoDemoTimelineItem[]>([]);
  const heatCapacityAutoDemoStartedAtMsRef = useRef(0);
  const heatCapacityAutoDemoPausedElapsedMsRef = useRef(0);
  const heatCapacityAutoDemoPausedFileIdRef = useRef<string | null>(null);
  const heatCapacityAutoDemoCompleteToastTimerRef = useRef<number | null>(null);
  const heatCapacityAutoDemoStepPanelTimerRef = useRef<number | null>(null);
  const heatCapacityGuideStartTimerRef = useRef<number | null>(null);
  const heatCapacityRecordSuccessToastTimersRef = useRef<number[]>([]);
  const heatCapacityPressureAlarmTimerRef = useRef<number | null>(null);
  const heatCapacityClosePumpValveReminderTimerRef = useRef<number | null>(null);
  const heatCapacityFocusSessionRef = useRef<HeatCapacityFocusSession | null>(null);
  const heatCapacityPumpFocusAlarmBlockedFileIdsRef = useRef<Set<string>>(new Set());
  const guidePumpInputLockedRef = useRef(false);
  const guidePassivePumpTargetNoticeKeyRef = useRef<string | null>(null);
  const heatCapacityPressureAlarmVisibleRef = useRef(false);
  const heatCapacityToastTimerRef = useRef<number | null>(null);
  const heatCapacityToastCurrentRef = useRef<HeatCapacityToastMessage | null>(null);
  const heatCapacityToastPendingRef = useRef<HeatCapacityToastMessage | null>(null);
  const guideHeatCapacityPulseTimerRef = useRef<number | null>(null);
  const guideHeatCapacityGuidancePulseTimerRef = useRef<number | null>(null);
  const guideHeatCapacityStrongReminderTimerRef = useRef<number | null>(null);
  const guideHeatCapacityPendingStrongReminderTimerRef = useRef<number | null>(null);
  const guideHeatCapacityMissCountRef = useRef(0);
  const guideHeatCapacityActiveFileIdRef = useRef<string | null>(null);
  const heatCapacityGuideChecklistTrackRef = useRef<HTMLDivElement | null>(null);
  const heatCapacityGuideChecklistFrameRef = useRef<number | null>(null);
  const heatCapacityGuideChecklistSnapTimerRef = useRef<number | null>(null);
  const heatCapacityGuideChecklistReturnTimerRef = useRef<number | null>(null);
  const heatCapacityGuideChecklistPendingWheelDeltaRef = useRef(0);
  const heatCapacityGuideChecklistVisualOffsetRef = useRef(0);
  const heatCapacityGuideChecklistViewedIndexRef = useRef(0);
  const heatCapacityGuideChecklistCurrentIndexRef = useRef(0);
  const heatCapacityAutoDemoLockedToastLastShownRef = useRef<{ message: string; at: number } | null>(null);
  const heatCapacityRecordControlsClosingTimerRef = useRef<number | null>(null);
  const heatCapacityFreeResetFeedbackTimerRef = useRef<number | null>(null);
  const heatCapacityFreeSpeedNoticeTimerRef = useRef<number | null>(null);
  const heatCapacityGuideMaskRef = useRef<HTMLDivElement | null>(null);
  const restoredHeatCapacityGuideStrongReminderFileIdRef = useRef<string | null>(
    initialSession.heatCapacityGuideSession?.strongReminderActive === true
      ? initialHeatCapacityGuideSessionFileId
      : null,
  );
  const restoredHeatCapacityGuideStrongReminderControlIdRef = useRef<string | null>(
    initialSession.heatCapacityGuideSession?.strongReminderActive === true
      ? initialSession.heatCapacityGuideSession?.strongReminderControlId ?? null
      : null,
  );
  const heatCapacityFreeSpeedOverlayExitTimerRef = useRef<number | null>(null);
  const aboutResultNoticeTimerRef = useRef<number | null>(null);
  const [heatCapacityPumpPulseId, setHeatCapacityPumpPulseId] = useState(0);
  const [autoDemoRunning, setAutoDemoRunning] = useState(false);
  const [autoDemoPaused, setAutoDemoPaused] = useState(false);
  const [autoDemoInteractionLocked, setAutoDemoInteractionLocked] = useState(false);
  const [heatCapacityToastCurrent, setHeatCapacityToastCurrent] = useState<HeatCapacityToastMessage | null>(null);
  const [, setHeatCapacityToastPending] = useState<HeatCapacityToastMessage | null>(null);
  const [heatCapacityPressureAlarmVisible, setHeatCapacityPressureAlarmVisible] = useState(false);
  const [autoDemoCompletionMessage, setAutoDemoCompletionMessage] = useState<string | null>(null);
  const [demoFocusControlId, setDemoFocusControlId] = useState<string | null>(null);
  const [demoFocusPulseActive, setDemoFocusPulseActive] = useState(false);
  const [heatCapacityFocusResetKey, setHeatCapacityFocusResetKey] = useState(0);
  const [heatCapacityHardSphereVisualResetKey, setHeatCapacityHardSphereVisualResetKey] = useState(0);
  const [heatCapacityRecordControlsClosing, setHeatCapacityRecordControlsClosing] = useState<HeatCapacityGuideRecordKind | null>(null);
  const [guideHeatCapacityActiveFileId, setGuideHeatCapacityActiveFileId] = useState<string | null>(initialHeatCapacityGuideSessionFileId);
  const [guideHeatCapacityFocusControlId, setGuideHeatCapacityFocusControlId] = useState<string | null>(null);
  const [guideHeatCapacityPulseActive, setGuideHeatCapacityPulseActive] = useState(false);
  const [guideHeatCapacityStrongReminderActive, setGuideHeatCapacityStrongReminderActive] = useState(false);
  const [guideHeatCapacityStrongReminderControlId, setGuideHeatCapacityStrongReminderControlId] = useState<string | null>(null);
  const [guideHeatCapacityStrongReminderFocusKey, setGuideHeatCapacityStrongReminderFocusKey] = useState(0);
  const [heatCapacityGuideMaskBounds, setHeatCapacityGuideMaskBounds] = useState({ width: 1, height: 1 });
  const [heatCapacityGuideProjectedHoles, setHeatCapacityGuideProjectedHoles] = useState<Record<string, HeatCapacityGuideStrongMaskHole>>({});
  const [heatCapacityGuideChecklistViewedIndex, setHeatCapacityGuideChecklistViewedIndex] = useState(0);
  const [heatCapacityRecordToastSequenceActive, setHeatCapacityRecordToastSequenceActive] = useState(false);
  const [heatCapacityFreeResetFeedbackActive, setHeatCapacityFreeResetFeedbackActive] = useState(false);
  const [heatCapacityFreeSpeedNoticeVisible, setHeatCapacityFreeSpeedNoticeVisible] = useState(false);
  const [heatCapacityFreeSpeedOverlayMounted, setHeatCapacityFreeSpeedOverlayMounted] = useState(false);
  const [heatCapacityFreeSpeedOverlayExiting, setHeatCapacityFreeSpeedOverlayExiting] = useState(false);
  const [heatCapacityReviewSelectionByFileId, setHeatCapacityReviewSelectionByFileId] = useState<Record<string, {
    selectedTrialId: string | null;
    userSelected: boolean;
  }>>({});
  const [guideHeatCapacityRollback, setGuideHeatCapacityRollback] = useState<{
    animation: GuideHeatCapacityRollbackAnimation;
    key: number;
  } | null>(null);
  const [autoDemoStepIndex, setAutoDemoStepIndex] = useState(0);
  const [autoDemoStepCount, setAutoDemoStepCount] = useState(0);
  const [autoDemoStepTitle, setAutoDemoStepTitle] = useState('');
  const [autoDemoStepDescription, setAutoDemoStepDescription] = useState('');
  const [autoDemoStepTarget, setAutoDemoStepTarget] = useState('');
  const [autoDemoStepProgressCriterion, setAutoDemoStepProgressCriterion] = useState('');
  const [autoDemoStepNote, setAutoDemoStepNote] = useState('');
  const [autoDemoStepPanelMode, setAutoDemoStepPanelMode] = useState<'hidden' | 'visible' | 'exiting'>('hidden');

  useEffect(() => {
    heatCapacityPressureAlarmVisibleRef.current = heatCapacityPressureAlarmVisible;
  }, [heatCapacityPressureAlarmVisible]);

  useEffect(() => {
    guideHeatCapacityActiveFileIdRef.current = guideHeatCapacityActiveFileId;
  }, [guideHeatCapacityActiveFileId]);

  useEffect(() => {
    if (!guideHeatCapacityStrongReminderActive) return undefined;
    const maskRoot = heatCapacityGuideMaskRef.current;
    if (!maskRoot) return undefined;
    const updateBounds = () => {
      const rect = maskRoot.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setHeatCapacityGuideMaskBounds((previous) => (
        previous.width === width && previous.height === height ? previous : { width, height }
      ));
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(maskRoot);
    window.addEventListener('resize', updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [guideHeatCapacityStrongReminderActive]);

  useEffect(() => () => {
    if (heatCapacityFreeResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityFreeResetFeedbackTimerRef.current);
    }
    if (heatCapacityFreeSpeedNoticeTimerRef.current !== null) {
      window.clearTimeout(heatCapacityFreeSpeedNoticeTimerRef.current);
    }
    if (heatCapacityFreeSpeedOverlayExitTimerRef.current !== null) {
      window.clearTimeout(heatCapacityFreeSpeedOverlayExitTimerRef.current);
    }
  }, []);

  const emptyWorkbenchFile = useMemo(() => createDefaultStandardFile(0), []);
  const isWorkbenchEmpty = files.length === 0;
  const activeFile = files.find((file) => file.id === activeFileId) ?? emptyWorkbenchFile;
  const activeHeatCapacityFreeParameterLockReason = getHeatCapacityFreeParameterLockReason(activeFile);
  const activeHeatCapacityFreeParameterLocked = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    activeHeatCapacityFreeParameterLockReason !== null;
  const visibleHeatCapacityParamHelpId =
    pinnedHeatCapacityParamHelpId ?? hoveredHeatCapacityParamHelpId;
  const openableClosedFiles = closedFiles.filter((file) => !files.some((openFile) => openFile.id === file.id));
  const standardPanels = useMemo(() => createStandardPanels(workbenchCopy), [workbenchCopy]);
  const idealPanels = useMemo(() => createIdealPanels(workbenchCopy), [workbenchCopy]);
  const heatCapacityRealtimeCopy = useMemo(
    () => getHeatCapacityRealtimeCopy(settingsLanguagePreference),
    [settingsLanguagePreference],
  );
  const heatCapacityPanels = useMemo(
    () => createHeatCapacityPanels(workbenchCopy, heatCapacityRealtimeCopy),
    [heatCapacityRealtimeCopy, workbenchCopy],
  );
  const resultsSections = useMemo(() => createResultsSections(workbenchCopy), [workbenchCopy]);
  const idealResultWindowPanels = useMemo(
    () => idealPanels.filter(
      (panel): panel is PanelDefinition & { key: WorkbenchIdealResultWindowKey } => (
        panel.key === 'experimentPoints' || panel.key === 'verification'
      ),
    ),
    [idealPanels],
  );
  const standardResultsLayout = activeFile.kind === 'standard'
    ? normalizeStandardResultsLayout(activeFile.standardResultsLayout)
    : normalizeStandardResultsLayout(null);
  const availablePanels = activeFile.kind === 'standard'
    ? standardPanels
    : activeFile.kind === 'ideal'
      ? idealPanels
      : heatCapacityPanels;
  const activePanelTitle = activeFile.kind === 'heatCapacity' && selectedPanel === 'results'
    ? heatCapacityRealtimeCopy.materialsTitle
    : availablePanels.find((panel) => panel.key === selectedPanel)?.title ?? '3D Preview';
  const primaryPanels = availablePanels.filter((panel) => panel.key === 'preview' || panel.key === 'realtime');
  const optionalPanels = availablePanels.filter(
    (panel) => (
      panel.key !== 'preview' &&
      panel.key !== 'realtime' &&
      !(activeFile.kind === 'ideal' && isIdealResultWindowKey(panel.key)) &&
      !(activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel.key)) &&
      activeFile.visiblePanels.includes(panel.key)
    ),
  );
  const resultsPanel = optionalPanels.find((panel) => panel.key === 'results');
  const auxiliaryPanels = optionalPanels.filter((panel) => panel.key !== 'results');
  const idealResultPanels = activeFile.kind === 'ideal'
    ? idealResultWindowPanels.filter((panel) => activeFile.visiblePanels.includes(panel.key))
    : [];

  const currentParameters = useMemo(() => getWorkbenchParameterRows(activeFile), [activeFile]);
  const sessionCacheSummary = useMemo(() => getWorkbenchSessionCacheSummary(files, workbenchCopy), [files, workbenchCopy]);
  const resultSummary = useMemo(() => createWorkbenchResultSummary(activeFile), [activeFile]);
  const figureSpecs = useMemo(
    () => createWorkbenchFigureSpecs(activeFile, settingsLanguagePreference),
    [activeFile, settingsLanguagePreference],
  );
  const idealAnalysis: IdealGasAnalysis | null = useMemo(
    () => (
      activeFile.kind === 'ideal'
        ? getIdealGasAnalysis(activeFile.relation, activeFile.pointsByRelation, activeFile.activeParams)
        : null
    ),
    [activeFile],
  );
  const editableCurrentParameters = currentParameters.filter((param) => !(activeFile.kind === 'ideal' && (param.key === 'targetTemperature' || param.key === 'relation')));
  const parametersDirty = !areWorkbenchParamsEqual(activeFile.params, activeFile.appliedParams);
  const parameterControlsLocked = activeFile.runState === 'running' || activeFile.runState === 'paused';
  const currentParameterControlsLocked = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free'
    ? false
    : parameterControlsLocked;
  const controlledVariableLockHint = workbenchCopy.parameters.controlledLockHint;
  const currentIdealRelationHasPoints = activeFile.kind === 'ideal' && activeFile.pointsByRelation[activeFile.relation].length > 0;
  const isIdealControlledVariableLocked = (
    key: keyof SimulationParams | 'relation',
  ) => (
    activeFile.kind === 'ideal'
    && currentIdealRelationHasPoints
    && key !== 'relation'
    && !isVariableKeyForRelation(activeFile.relation, key as ExperimentParamKey)
  );
  const getLockedIdealControlledVariableKeys = (nextParams: SimulationParams): ExperimentParamKey[] => (
    activeFile.kind === 'ideal' && currentIdealRelationHasPoints
      ? getChangedIdealParamKeys(activeFile.params, nextParams).filter((key) => !isVariableKeyForRelation(activeFile.relation, key))
      : []
  );
  const workbenchStyle = {
    '--studio-left-width': `${leftSidebarWidth}px`,
    '--studio-params-width': `${parameterSidebarWidth}px`,
    '--studio-left-resize-ghost-x': `${leftSidebarWidth}px`,
    '--studio-params-resize-ghost-x': `calc(100% - ${parameterSidebarWidth}px)`,
  } as React.CSSProperties & Record<
    '--studio-left-width' | '--studio-params-width' | '--studio-left-resize-ghost-x' | '--studio-params-resize-ghost-x',
    string
  >;
  const shellStyle = {
    '--studio-console-height': consoleCollapsed ? '32px' : `${consoleHeightPx}px`,
    '--studio-console-resize-ghost-y': `calc(100% - ${consoleCollapsed ? '32px' : `${consoleHeightPx}px`} - 24px)`,
  } as React.CSSProperties & Record<'--studio-console-height' | '--studio-console-resize-ghost-y', string>;
  const liveWorkspaceSplitRatio = clampWorkbenchLiveSplitRatio(activeFile.liveWorkspaceSplitRatio);
  const liveWorkspaceStyle = {
    '--studio-live-preview-ratio': `${(liveWorkspaceSplitRatio * 100).toFixed(3)}%`,
    '--studio-live-realtime-ratio': `${((1 - liveWorkspaceSplitRatio) * 100).toFixed(3)}%`,
    '--studio-live-resize-ghost-x': `${(liveWorkspaceSplitRatio * 100).toFixed(3)}%`,
  } as React.CSSProperties & Record<'--studio-live-preview-ratio' | '--studio-live-realtime-ratio' | '--studio-live-resize-ghost-x', string>;
  const displayedLogs = useMemo(
    () => (
      consoleTab === 'warnings'
        ? logs.filter((log) => log.kind === 'warning' || log.kind === 'error')
        : logs
    ),
    [consoleTab, logs],
  );
  const consoleSummary = useMemo(() => {
    const counts = logs.reduce<Record<LogKind, number>>(
      (nextCounts, log) => ({
        ...nextCounts,
        [log.kind]: nextCounts[log.kind] + 1,
      }),
      { info: 0, warning: 0, success: 0, error: 0 },
    );
    return {
      counts,
      latest: logs[logs.length - 1] ?? null,
      runtime: isWorkbenchEmpty
        ? workbenchCopy.status.noRuntime
        : activeFile.kind === 'standard'
          ? workbenchCopy.status.standardRuntime
          : activeFile.kind === 'ideal'
            ? workbenchCopy.status.idealRuntime(
                getRelationLabel(activeFile.relation),
                getLocalizedStatusValue(idealAnalysis?.verdictState ?? 'insufficient', workbenchCopy),
              )
            : workbenchCopy.status.noRuntime,
    };
  }, [activeFile, idealAnalysis?.verdictState, isWorkbenchEmpty, logs, workbenchCopy]);

  const animateCurrentParametersScroll = (
    targetTop: number,
    onComplete?: () => void,
    duration = IDEAL_ADVANCED_SCROLL_DURATION_MS,
  ) => {
    const container = currentParametersBodyRef.current;

    if (!container) {
      onComplete?.();
      return;
    }

    if (idealAdvancedScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(idealAdvancedScrollFrameRef.current);
    }

    const startTop = container.scrollTop;
    const distance = targetTop - startTop;
    const startTime = window.performance.now();
    const easeInOut = (value: number) => (
      value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2
    );

    const step = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      container.scrollTop = startTop + distance * easeInOut(progress);

      if (progress < 1) {
        idealAdvancedScrollFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      idealAdvancedScrollFrameRef.current = null;
      container.scrollTop = targetTop;
      onComplete?.();
    };

    idealAdvancedScrollFrameRef.current = window.requestAnimationFrame(step);
  };

  const toggleIdealAdvancedSettings = () => {
    setIdealAdvancedSettingsOpen((current) => {
      if (!current) {
        idealAdvancedSettingsPreviousScrollTopRef.current = currentParametersBodyRef.current?.scrollTop ?? 0;
        setIdealAdvancedSettingsBodyVisible(true);
      }
      return !current;
    });
  };

  const closeGeneralSettings = () => {
    setSettingsGeneralOpen(false);
    setSettingsLanguageMenuOpen(false);
  };

  const openGeneralSettings = () => {
    setOpenTopMenu(null);
    setAboutWindowOpen(false);
    setSettingsLanguageMenuOpen(false);
    setSettingsGeneralOpen(true);
  };

  const showAboutResultNotice = (title: string, body: string) => {
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
    }
    setAboutResultNotice({ title, body });
    aboutResultNoticeTimerRef.current = window.setTimeout(() => {
      setAboutResultNotice(null);
      aboutResultNoticeTimerRef.current = null;
    }, 1800);
  };

  const closeAboutWindow = () => {
    setAboutWindowOpen(false);
    setAboutResultNotice(null);
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
      aboutResultNoticeTimerRef.current = null;
    }
  };

  const openAboutWindow = () => {
    setOpenTopMenu(null);
    setSettingsGeneralOpen(false);
    setSettingsLanguageMenuOpen(false);
    setAboutWindowOpen(true);
  };

  const getIgnoredUpdateVersion = () => (
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(WORKBENCH_IGNORED_UPDATE_VERSION_KEY)
  );

  const rememberIgnoredUpdateVersion = (version: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKBENCH_IGNORED_UPDATE_VERSION_KEY, version);
    }
  };

  const applyUpdaterState = (nextState: WorkbenchUpdateState, options: { manual?: boolean } = {}) => {
    setUpdaterState(nextState);
    setAboutUpdateChecking(nextState.status === 'checking');

    if (nextState.status === 'available') {
      const latestVersion = nextState.latestVersion || '';
      if (latestVersion && getIgnoredUpdateVersion() === latestVersion) {
        if (options.manual) {
          showAboutResultNotice(workbenchCopy.about.ignoredVersionTitle, workbenchCopy.about.ignoredVersionBody(latestVersion));
        }
        return;
      }
      setUpdateDialogState((currentDialogState) => mergeWorkbenchUpdateDialogState(nextState, currentDialogState));
      return;
    }

    if (
      nextState.status === 'downloading'
      || nextState.status === 'retrying'
      || nextState.status === 'downloaded'
      || nextState.status === 'installing'
      || (nextState.status === 'error' && Boolean(nextState.latestVersion || nextState.manualDownloadUrl || nextState.releasePageUrl))
    ) {
      setUpdateDialogState((currentDialogState) => mergeWorkbenchUpdateDialogState(nextState, currentDialogState));
      return;
    }

    if (nextState.status === 'not-available' && options.manual) {
      showAboutResultNotice(workbenchCopy.about.updateResultTitle, workbenchCopy.about.upToDateStatus);
      return;
    }

    if ((nextState.status === 'unsupported' || nextState.status === 'error') && options.manual) {
      showAboutResultNotice(workbenchCopy.about.updateResultTitle, nextState.message || getAboutUpdateStatusLabel(nextState, workbenchCopy));
    }
  };

  const runAboutUpdateCheck = () => {
    if (aboutUpdateChecking) return;
    const updateCheckRequest = window.hardSphereLabUpdater?.checkForUpdates?.();
    if (!updateCheckRequest) {
      const unsupportedState: WorkbenchUpdateState = {
        ...updaterState,
        status: 'unsupported',
        currentVersion: WORKBENCH_APP_VERSION,
        message: workbenchCopy.about.unsupportedUpdateStatus,
      };
      applyUpdaterState(unsupportedState, { manual: true });
      return;
    }
    setAboutUpdateChecking(true);
    void updateCheckRequest
      .then((result) => applyUpdaterState(result, { manual: true }))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        applyUpdaterState({
          ...updaterState,
          status: 'error',
          currentVersion: WORKBENCH_APP_VERSION,
          message,
        }, { manual: true });
      });
  };

  const ignoreUpdateDialogVersion = () => {
    const version = updateDialogState?.latestVersion;
    if (version) {
      rememberIgnoredUpdateVersion(version);
      showAboutResultNotice(workbenchCopy.about.ignoredVersionTitle, workbenchCopy.about.ignoredVersionBody(version));
    }
    setUpdateDialogState(null);
  };

  const startUpdateDownload = () => {
    if (!updateDialogState) return;
    const downloadRequest = window.hardSphereLabUpdater?.downloadUpdate?.();
    if (!downloadRequest) return;
    setUpdateDialogState({ ...updateDialogState, status: 'downloading', percent: 0 });
    void downloadRequest
      .then((result) => applyUpdaterState(result))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        applyUpdaterState({
          ...updaterState,
          status: 'error',
          currentVersion: WORKBENCH_APP_VERSION,
          message,
        }, { manual: true });
      });
  };

  const restartAndInstallUpdate = () => {
    if (!updateDialogState) return;
    const installRequest = window.hardSphereLabUpdater?.quitAndInstall?.();
    if (!installRequest) return;
    setUpdateDialogState({ ...updateDialogState, status: 'installing', percent: 100 });
    void installRequest;
  };

  const updateSettingsThemePreference = (theme: WorkbenchThemePreference) => {
    setSettingsThemePreference(theme);
    persistWorkbenchGeneralSettings({ theme, language: settingsLanguagePreference, performanceMode: settingsPerformanceMode });
  };

  const updateSettingsLanguagePreference = (language: WorkbenchLanguagePreference) => {
    setSettingsLanguagePreference(language);
    setSettingsLanguageMenuOpen(false);
    persistWorkbenchGeneralSettings({ theme: settingsThemePreference, language, performanceMode: settingsPerformanceMode });
    window.setTimeout(() => settingsLanguageTriggerRef.current?.focus(), 0);
  };

  const updateSettingsPerformanceMode = (performanceMode: WorkbenchPerformanceMode) => {
    setSettingsPerformanceMode(performanceMode);
    persistWorkbenchGeneralSettings({ theme: settingsThemePreference, language: settingsLanguagePreference, performanceMode });
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemWorkbenchTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateSystemTheme);
      return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }

    mediaQuery.addListener(updateSystemTheme);
    return () => mediaQuery.removeListener(updateSystemTheme);
  }, []);

  useEffect(() => {
    if (!hasDesktopWindowControlBridge()) return undefined;
    const desktopWindowBridge = window.hardSphereLabWindow;
    let mounted = true;

    void desktopWindowBridge?.getState?.()
      .then((state) => {
        if (mounted) setDesktopWindowMaximized(Boolean(state?.maximized));
      })
      .catch(() => undefined);

    const unsubscribe = desktopWindowBridge?.onState?.((state) => {
      setDesktopWindowMaximized(Boolean(state.maximized));
    });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.hardSphereLabUpdater?.onStatus?.((state) => {
      applyUpdaterState(state);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [workbenchCopy]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
    setSelectedFileId(activeFileId);
  }, [activeFileId]);

  useEffect(() => {
    if (!selectedFileId || files.some((file) => file.id === selectedFileId)) return;
    setSelectedFileId(activeFileId);
  }, [activeFileId, files, selectedFileId]);

  useEffect(() => {
    const guideFileId = guideHeatCapacityActiveFileId && files.some((file) => (
      file.id === guideHeatCapacityActiveFileId &&
      file.kind === 'heatCapacity' &&
      file.heatCapacityMode === 'guide'
    ))
      ? guideHeatCapacityActiveFileId
      : null;
    persistWorkbenchSession(encodeWorkbenchSession(files, activeFileId, selectedPanel, {
      fileId: guideFileId,
      strongReminderActive: guideFileId !== null && guideHeatCapacityStrongReminderActive,
      strongReminderControlId: guideFileId !== null && guideHeatCapacityStrongReminderActive
        ? guideHeatCapacityStrongReminderControlId
        : null,
    }));
  }, [
    files,
    activeFileId,
    selectedPanel,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
  ]);

  useEffect(() => {
    persistClosedWorkbenchFiles(closedFiles);
  }, [closedFiles]);

  useEffect(() => {
    renamingFileIdRef.current = renamingFileId;
  }, [renamingFileId]);

  useEffect(() => {
    if (!settingsGeneralOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGeneralSettings();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsGeneralOpen]);

  useEffect(() => {
    if (activeFile.kind !== 'ideal') return undefined;
    if (!idealAdvancedSettingsOpen && !idealAdvancedSettingsBodyVisible) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      if (idealAdvancedSettingsOpen) {
        const container = currentParametersBodyRef.current;
        const body = idealAdvancedSettingsBodyRef.current;
        if (!container || !body) return;

        const containerRect = container.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const targetTop = clamp(container.scrollTop + bodyRect.top - containerRect.top, 0, maxScrollTop);
        animateCurrentParametersScroll(targetTop);
        return;
      }

      animateCurrentParametersScroll(
        idealAdvancedSettingsPreviousScrollTopRef.current,
        () => setIdealAdvancedSettingsBodyVisible(false),
      );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (idealAdvancedScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(idealAdvancedScrollFrameRef.current);
        idealAdvancedScrollFrameRef.current = null;
      }
    };
  }, [idealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible, activeFile.kind]);

  useEffect(() => {
    if (!renamingFileId) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [renamingFileId]);

  const activeIdealRelation = activeFile.kind === 'ideal' ? activeFile.relation : null;

  useEffect(() => {
    if (activeFile.kind !== 'ideal' || scanInputFocused) return;
    const value = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    setScanInputDraft(formatMetric(value, getIdealScanDecimals(activeFile.relation)));
    setScanInputError(null);
  }, [activeFile.kind, activeIdealRelation, activeFile.params, scanInputFocused]);

  useEffect(() => {
    if (!scanInputToast) return undefined;
    const timeoutId = window.setTimeout(() => setScanInputToast(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [scanInputToast]);

  useEffect(() => {
    setHeatCapacityBasicInputDrafts({});
    setHeatCapacityBasicInputErrors({});
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
    setParameterInputDrafts({});
    setHoveredHeatCapacityParamHelpId(null);
    setPinnedHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  }, [activeFile.id]);

  useEffect(() => {
    if (!canOpenHeatCapacityParameterSidebar(activeFile)) {
      setParametersCollapsed(true);
      setHeatCapacityAdvancedOpen(false);
      setPinnedHeatCapacityParamHelpId(null);
      setHoveredHeatCapacityParamHelpId(null);
      setHeatCapacityParamHelpPopoverStyle(undefined);
    }
  }, [activeFile.kind, activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null]);

  useEffect(() => {
    if (pinnedHeatCapacityParamHelpId === null) return undefined;
    const handleHeatCapacityParamHelpPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('[data-heat-capacity-param-help-button="true"]')) return;
      const activePopover = document.querySelector(
        `[data-heat-capacity-param-help-popover-id="${pinnedHeatCapacityParamHelpId}"]`,
      );
      if (activePopover?.contains(target)) return;
      heatCapacityParamHelpSuppressClickRef.current = true;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closePinnedHeatCapacityParameterHelp();
    };
    document.addEventListener('pointerdown', handleHeatCapacityParamHelpPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleHeatCapacityParamHelpPointerDown, true);
    };
  }, [pinnedHeatCapacityParamHelpId]);

  useEffect(() => {
    const handleHeatCapacityParamHelpClick = (event: MouseEvent) => {
      if (!heatCapacityParamHelpSuppressClickRef.current) return;
      heatCapacityParamHelpSuppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    document.addEventListener('click', handleHeatCapacityParamHelpClick, true);
    return () => {
      document.removeEventListener('click', handleHeatCapacityParamHelpClick, true);
    };
  }, []);

  useEffect(() => {
    if (!samplingPresetMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (samplingPresetSelectRef.current?.contains(event.target as Node)) return;
      setSamplingPresetMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [samplingPresetMenuOpen]);

  useEffect(() => () => {
    Object.values(standardRuntimeRef.current).forEach((runtime) => {
      if (runtime.simulationTimerId !== null) {
        window.clearTimeout(runtime.simulationTimerId);
      }
    });
    Object.values(idealRuntimeRef.current).forEach((runtime) => {
      if (runtime.simulationTimerId !== null) {
        window.clearTimeout(runtime.simulationTimerId);
      }
    });
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
    }
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    if (heatCapacityPressureAlarmTimerRef.current !== null) {
      window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
      heatCapacityPressureAlarmTimerRef.current = null;
    }
    if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
      window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
      heatCapacityClosePumpValveReminderTimerRef.current = null;
    }
    if (heatCapacityGuideStartTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideStartTimerRef.current);
      heatCapacityGuideStartTimerRef.current = null;
    }
    heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityRecordSuccessToastTimersRef.current = [];
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
      aboutResultNoticeTimerRef.current = null;
    }
  }, []);

  const pushLog = (message: string, kind: LogKind = 'info') => {
    setLogs((current) => [
      ...current,
      {
        id: current.length + 1,
        time: formatTime(),
        kind,
        message,
      },
    ]);
  };

  const showWorkbenchValidationErrors = (validation: { errors: string[] }) => {
    const localizedErrors = getLocalizedWorkbenchValidationErrors(validation.errors, settingsLanguagePreference);
    setParameterErrors(localizedErrors);
    localizedErrors.forEach((error) => pushLog(`${activeFile.name}: ${error}`, 'error'));
  };

  useEffect(() => {
    const bridge = window.hardSphereLabExporter;
    if (!bridge) {
      setExportEnvironmentStatus('unavailable');
      setExportEnvironmentDetail(workbenchCopy.exportEnvironment.unavailable.detail);
      return;
    }

    let cancelled = false;
    setExportEnvironmentStatus('checking');
    setExportEnvironmentDetail(workbenchCopy.exportEnvironment.checking.detail);

    bridge.checkExportEnvironment()
      .then((result) => {
        if (cancelled) return;
        const nextStatus = result.status === 'available-bundled' ? 'available-bundled' : result.status;
        const localizedDetail = workbenchCopy.exportEnvironment[nextStatus].detail;
        setExportEnvironmentStatus(nextStatus);
        setExportEnvironmentDetail(localizedDetail);
        setLogs((current) => [
          ...current,
          {
            id: current.length + 1,
            time: formatTime(),
            kind: nextStatus === 'available-system' || nextStatus === 'available-bundled' ? 'success' : 'warning',
            message: localizedDetail,
          },
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        const message = workbenchCopy.exportEnvironment.error.detail;
        setExportEnvironmentStatus('error');
        setExportEnvironmentDetail(message);
        setLogs((current) => [
          ...current,
          {
            id: current.length + 1,
            time: formatTime(),
            kind: 'error',
            message,
          },
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, [workbenchCopy.exportEnvironment]);

  const runAboutEnvironmentCheck = () => {
    const bridge = window.hardSphereLabExporter;
    setExportEnvironmentStatus('checking');
    setExportEnvironmentDetail(workbenchCopy.exportEnvironment.checking.detail);

    if (!bridge) {
      window.setTimeout(() => {
        const nextStatus: WorkbenchExportEnvironmentStatus = 'unavailable';
        const detail = workbenchCopy.exportEnvironment[nextStatus].detail;
        setExportEnvironmentStatus(nextStatus);
        setExportEnvironmentDetail(detail);
        showAboutResultNotice(workbenchCopy.about.environmentResultTitle, getAboutEnvironmentResultBody(nextStatus, workbenchCopy));
      }, 650);
      return;
    }

    bridge.checkExportEnvironment()
      .then((result) => {
        const nextStatus = result.status === 'available-bundled' ? 'available-bundled' : result.status;
        const localizedDetail = workbenchCopy.exportEnvironment[nextStatus].detail;
        setExportEnvironmentStatus(nextStatus);
        setExportEnvironmentDetail(localizedDetail);
        pushLog(localizedDetail, isExportEnvironmentAvailableStatus(nextStatus) ? 'success' : 'warning');
        showAboutResultNotice(workbenchCopy.about.environmentResultTitle, getAboutEnvironmentResultBody(nextStatus, workbenchCopy));
      })
      .catch(() => {
        const nextStatus: WorkbenchExportEnvironmentStatus = 'error';
        const message = workbenchCopy.exportEnvironment[nextStatus].detail;
        setExportEnvironmentStatus(nextStatus);
        setExportEnvironmentDetail(message);
        pushLog(message, 'error');
        showAboutResultNotice(workbenchCopy.about.environmentResultTitle, getAboutEnvironmentResultBody(nextStatus, workbenchCopy));
      });
  };

  const openManualUpdateDownload = () => {
    const manualDownloadRequest = window.hardSphereLabUpdater?.openManualDownload?.();
    if (!manualDownloadRequest) return;
    void manualDownloadRequest.then((result) => {
      if (result.status === 'error') {
        showAboutResultNotice(workbenchCopy.about.updateResultTitle, result.message || workbenchCopy.about.updateErrorStatus);
      }
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      showAboutResultNotice(workbenchCopy.about.updateResultTitle, message);
    });
  };

  useEffect(() => {
    if (consoleTab === 'summary') return;
    const body = consoleBodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [consoleTab, displayedLogs.length, logs.length]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setFiles((current) => {
        const activeId = activeFileIdRef.current;
        let changed = false;
        const nextFiles = current.map((file) => {
          if (file.id !== activeId || file.kind !== 'heatCapacity') return file;
          if (
            guideHeatCapacityActiveFileIdRef.current === file.id &&
            isGuideHeatCapacityPauseStep(getHeatCapacityGuideStep(file))
          ) {
            return file;
          }
          const refreshedFile = refreshHeatCapacityPumpFrequency(file, now);
          const steppedFile = refreshedFile.powerOn
            ? stepHeatCapacityWorkbenchFile(refreshedFile, now)
            : refreshedFile;
          if (
            steppedFile.pumpFrequency === file.pumpFrequency
            && steppedFile.pumpFrequencyStatus === file.pumpFrequencyStatus
            && steppedFile.pumpBulbState === file.pumpBulbState
            && steppedFile.pumpHint === file.pumpHint
            && steppedFile.pumpStrokeTimestamps.length === file.pumpStrokeTimestamps.length
            && steppedFile.simulationTimeS === file.simulationTimeS
            && steppedFile.pressureSignalMv === file.pressureSignalMv
            && steppedFile.temperatureSignalMv === file.temperatureSignalMv
            && steppedFile.heatCapacityPhase === file.heatCapacityPhase
          ) {
            return file;
          }
          changed = true;
          return steppedFile;
        });
        if (!changed) return current;
        filesRef.current = nextFiles;
        return nextFiles;
      });
    }, heatCapacityQualityProfile.tickIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [heatCapacityQualityProfile.tickIntervalMs]);

  const setWorkbenchFiles = (updater: (current: WorkbenchFileState[]) => WorkbenchFileState[]) => {
    setFiles((current) => {
      const next = updater(current);
      filesRef.current = next;
      return next;
    });
  };

  const updateFileById = (fileId: string, updater: (file: WorkbenchFileState) => WorkbenchFileState) => {
    setWorkbenchFiles((current) => current.map((file) => (file.id === fileId ? updater(file) : file)));
  };

  const updateActiveFile = (updater: (file: WorkbenchFileState) => WorkbenchFileState) => {
    updateFileById(activeFileIdRef.current, updater);
  };

  const updateHeatCapacityFreeEquilibriumSpeedMultiplier = (multiplier: number) => {
    const now = Date.now();
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? file.heatCapacityMode === 'guide'
        ? setHeatCapacityGuideEquilibriumSpeedMultiplier(file, multiplier, now)
        : setHeatCapacityFreeEquilibriumSpeedMultiplier(file, multiplier, now)
      : file);
  };

  const heatCapacityGuideSpeedEligible = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'guide' &&
    (
      activeFile.heatCapacityGuideWorkflow.step === 'u1Waiting' ||
      activeFile.heatCapacityGuideWorkflow.step === 'u2Waiting' ||
      activeFile.heatCapacityGuideWorkflow.step === 'recordU1Required' ||
      activeFile.heatCapacityGuideWorkflow.step === 'recordU2Required'
    );
  const heatCapacityFreeSpeedEligible = activeFile.kind === 'heatCapacity' &&
    isHeatCapacityFreeEquilibriumSpeedAvailable(activeFile);
  const heatCapacityFreeSpeedNoticeNeeded = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    heatCapacityFreeSpeedEligible &&
    !activeFile.heatCapacityFreeEquilibriumSpeedHintShown &&
    !heatCapacityPressureAlarmVisible;
  const heatCapacityFreeSpeedControlShouldShow = activeFile.kind === 'heatCapacity' &&
    (heatCapacityGuideSpeedEligible || (
      heatCapacityFreeSpeedEligible &&
      activeFile.heatCapacityFreeEquilibriumSpeedHintShown
    )) &&
    !heatCapacityFreeSpeedNoticeVisible;

  useEffect(() => {
    if (heatCapacityFreeSpeedNoticeTimerRef.current !== null) {
      window.clearTimeout(heatCapacityFreeSpeedNoticeTimerRef.current);
      heatCapacityFreeSpeedNoticeTimerRef.current = null;
    }
    if (!heatCapacityFreeSpeedNoticeNeeded || activeFile.kind !== 'heatCapacity') {
      setHeatCapacityFreeSpeedNoticeVisible(false);
      return undefined;
    }
    const fileId = activeFile.id;
    setHeatCapacityFreeSpeedNoticeVisible(true);
    heatCapacityFreeSpeedNoticeTimerRef.current = window.setTimeout(() => {
      heatCapacityFreeSpeedNoticeTimerRef.current = null;
      setHeatCapacityFreeSpeedNoticeVisible(false);
      updateFileById(fileId, (file) => file.kind === 'heatCapacity'
        ? setHeatCapacityFreeEquilibriumSpeedHintShown(file, true, Date.now())
        : file);
    }, HEAT_CAPACITY_FREE_SPEED_NOTICE_DURATION_MS);
    return () => {
      if (heatCapacityFreeSpeedNoticeTimerRef.current !== null) {
        window.clearTimeout(heatCapacityFreeSpeedNoticeTimerRef.current);
        heatCapacityFreeSpeedNoticeTimerRef.current = null;
      }
    };
  }, [activeFile.id, activeFile.kind, heatCapacityFreeSpeedNoticeNeeded]);

  useEffect(() => {
    if (heatCapacityFreeSpeedOverlayExitTimerRef.current !== null) {
      window.clearTimeout(heatCapacityFreeSpeedOverlayExitTimerRef.current);
      heatCapacityFreeSpeedOverlayExitTimerRef.current = null;
    }
    if (heatCapacityFreeSpeedControlShouldShow) {
      setHeatCapacityFreeSpeedOverlayMounted(true);
      setHeatCapacityFreeSpeedOverlayExiting(false);
      return undefined;
    }
    if (!heatCapacityFreeSpeedOverlayMounted) {
      setHeatCapacityFreeSpeedOverlayExiting(false);
      return undefined;
    }
    setHeatCapacityFreeSpeedOverlayExiting(true);
    heatCapacityFreeSpeedOverlayExitTimerRef.current = window.setTimeout(() => {
      heatCapacityFreeSpeedOverlayExitTimerRef.current = null;
      setHeatCapacityFreeSpeedOverlayMounted(false);
      setHeatCapacityFreeSpeedOverlayExiting(false);
    }, HEAT_CAPACITY_FREE_SPEED_OVERLAY_EXIT_MS);
    return () => {
      if (heatCapacityFreeSpeedOverlayExitTimerRef.current !== null) {
        window.clearTimeout(heatCapacityFreeSpeedOverlayExitTimerRef.current);
        heatCapacityFreeSpeedOverlayExitTimerRef.current = null;
      }
    };
  }, [heatCapacityFreeSpeedControlShouldShow, heatCapacityFreeSpeedOverlayMounted]);

  const toggleHeatCapacityHardSphereView = () => {
    if (activeFile.kind !== 'heatCapacity') return;
    setHeatCapacityHardSphereViewEnabled(!activeFile.hardSphereViewEnabled);
  };

  const showParameterSidebarBlockReason = (message: string | null) => {
    if (!message) return;
    setScanInputToast(message);
    pushLog(`${activeFile.name}: ${message}`, 'warning');
  };

  const openParameterSidebarFromRail = () => {
    if (shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(activeFile)) {
      showParameterSidebarBlockReason(heatCapacityRealtimeCopy.freePowerOffBeforeNextGroup);
      return;
    }
    if (!canOpenHeatCapacityParameterSidebar(activeFile)) {
      showParameterSidebarBlockReason(
        getHeatCapacityParameterSidebarBlockReason(activeFile) ?? HEAT_CAPACITY_FREE_PARAMETER_SIDEBAR_BLOCK_FALLBACK,
      );
      return;
    }
    setParametersCollapsed(false);
  };

  const collapseHeatCapacityFreeParameterSidebarForExperimentAction = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    setParametersCollapsed(true);
    setHeatCapacityAdvancedOpen(false);
    setPinnedHeatCapacityParamHelpId(null);
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

  const showHeatCapacityFreeParameterLockHint = () => {
    const message = getHeatCapacityFreeParameterLockReason(activeFile);
    if (!message) return;
    setScanInputToast(message);
    pushLog(`${activeFile.name}: ${message}`, 'warning');
  };

  const setHeatCapacityHardSphereViewEnabled = (checked: boolean) => {
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? {
          ...file,
          hardSphereViewEnabled: checked,
          updatedAt: Date.now(),
        }
        : file);
  };

  const getHeatCapacityFreeParameterMaximum = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    draft: HeatCapacityFreeParameterDraft,
  ) => (
    definition.id === 'pressureDangerMv'
      ? getHeatCapacityFreePressureDangerUpperLimitMv(draft)
      : null
  );

  const getHeatCapacityFreeValueTooLargeMessage = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    maxValue: number,
  ) => {
    const label = definition.label[settingsLanguagePreference];
    const formattedMax = formatHeatCapacityFreeParameterValue(
      getHeatCapacityFreeParameterInputValue(definition, maxValue),
      definition.precision,
    );
    const limitText = definition.id === 'pressureDangerMv'
      ? `${formattedMax} ${definition.unit} / ${HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA} kPa`
      : `${formattedMax} ${definition.unit}`.trim();
    return `${label}${heatCapacityFreeSharedText.valueTooLarge[settingsLanguagePreference]} ${limitText}`;
  };

  const showHeatCapacityFreeParameterInputError = (message: string) => {
    setScanInputToast(message);
    pushLog(`${activeFile.name}: ${message}`, 'warning');
  };

  const validateHeatCapacityFreeNumberValue = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    valueText: string,
    draft: HeatCapacityFreeParameterDraft,
    options: { checkMax?: boolean } = {},
  ): { valid: true; value: number } | { valid: false; message: string } => {
    if (valueText.trim() === '') {
      return { valid: false, message: heatCapacityFreeSharedText.invalidNumber[settingsLanguagePreference] };
    }
    const parsedValue = Number(valueText.trim());
    if (!Number.isFinite(parsedValue)) {
      return { valid: false, message: heatCapacityFreeSharedText.invalidNumber[settingsLanguagePreference] };
    }
    if (parsedValue < definition.min) {
      return { valid: false, message: heatCapacityFreeSharedText.valueTooSmall[settingsLanguagePreference] };
    }
    const draftValue = getHeatCapacityFreeParameterDraftValue(definition, parsedValue);
    if (options.checkMax !== false) {
      const maxValue = getHeatCapacityFreeParameterMaximum(definition, {
        ...draft,
        [definition.id]: draftValue,
      });
      if (maxValue !== null && draftValue > maxValue) {
        return { valid: false, message: getHeatCapacityFreeValueTooLargeMessage(definition, maxValue) };
      }
    }
    return { valid: true, value: draftValue };
  };

  const commitHeatCapacityBasicParameterInput = (
    parameterId: HeatCapacityFreeDraftNumberKey,
    valueText: string,
  ) => {
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const definition = heatCapacityFreeBasicNumberParameters.find((param) => param.id === parameterId);
    if (!definition) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const validation = validateHeatCapacityFreeNumberValue(
      definition,
      valueText,
      activeFile.heatCapacityFreeParameterDraft,
    );
    if (validation.valid === false) {
      setHeatCapacityBasicInputErrors((current) => ({
        ...current,
        [parameterId]: validation.message,
      }));
      if (validation.message.includes(heatCapacityFreeSharedText.valueTooLarge[settingsLanguagePreference])) {
        showHeatCapacityFreeParameterInputError(validation.message);
      }
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
          ...file.heatCapacityFreeParameterDraft,
          [parameterId]: validation.value,
        }),
        updatedAt: Date.now(),
      };
    });
    setHeatCapacityBasicInputDrafts((current) => {
      const { [parameterId]: _removed, ...rest } = current;
      return rest;
    });
    setHeatCapacityBasicInputErrors((current) => {
      const { [parameterId]: _removed, ...rest } = current;
      return rest;
    });
  };

  const setHeatCapacityBasicCheckbox = (
    parameterId: HeatCapacityFreeBasicCheckboxKey,
    checked: boolean,
  ) => {
    if (parameterId === 'hardSphereViewEnabled') {
      setHeatCapacityHardSphereViewEnabled(checked);
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
          ...file.heatCapacityFreeParameterDraft,
          [parameterId]: checked,
        }),
        updatedAt: Date.now(),
      };
    });
  };

  const createHeatCapacityAdvancedDraftFromFile = (): HeatCapacityFreeParameterDraft | null => (
    activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free'
      ? { ...activeFile.heatCapacityFreeParameterDraft }
      : null
  );

  const openHeatCapacityAdvancedSettings = () => {
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const draft = createHeatCapacityAdvancedDraftFromFile();
    if (!draft) return;
    setHeatCapacityAdvancedDraft(draft);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
    setHeatCapacityAdvancedOpen(true);
  };

  const cancelHeatCapacityAdvancedParameterDraft = () => {
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
  };

  const saveHeatCapacityAdvancedParameterDraft = (
    draft: HeatCapacityFreeParameterDraft,
  ) => {
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const nextDraft = { ...draft };
    const nextErrors: Record<string, string> = {};
    const parsedValues: Partial<Record<HeatCapacityFreeDraftNumberKey, number>> = {};
    heatCapacityFreeAdvancedNumberParameters.forEach((definition) => {
      const rawValue = heatCapacityAdvancedInputDrafts[definition.id];
      if (rawValue === undefined) return;
      const validation = validateHeatCapacityFreeNumberValue(
        definition,
        rawValue,
        nextDraft,
        { checkMax: false },
      );
      if (validation.valid === false) {
        nextErrors[definition.id] = validation.message;
        return;
      }
      parsedValues[definition.id] = validation.value;
    });
    Object.entries(parsedValues).forEach(([id, value]) => {
      nextDraft[id as HeatCapacityFreeDraftNumberKey] = value;
    });
    heatCapacityFreeAdvancedNumberParameters.forEach((definition) => {
      const maxValue = getHeatCapacityFreeParameterMaximum(definition, nextDraft);
      if (maxValue !== null && nextDraft[definition.id] > maxValue) {
        nextErrors[definition.id] = getHeatCapacityFreeValueTooLargeMessage(definition, maxValue);
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setHeatCapacityAdvancedInputErrors(nextErrors);
      const firstError = Object.values(nextErrors)[0];
      if (firstError.includes(heatCapacityFreeSharedText.valueTooLarge[settingsLanguagePreference])) {
        showHeatCapacityFreeParameterInputError(firstError);
      }
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, nextDraft),
        updatedAt: Date.now(),
      };
    });
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
  };

  const acknowledgeHeatCapacityFreeAdvancedRisk = () => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? {
            ...acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState(file),
            updatedAt: Date.now(),
          }
        : file
    ));
  };

  const closePinnedHeatCapacityParameterHelp = () => {
    setPinnedHeatCapacityParamHelpId(null);
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

  const updateHeatCapacityParamHelpPopoverStyle = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const gap = 7;
    const width = Math.min(260, Math.max(180, viewportWidth - margin * 2));
    const maxHeight = Math.min(220, Math.max(96, viewportHeight - margin * 2));
    const estimatedHeight = Math.min(136, maxHeight);
    const maxLeft = Math.max(margin, viewportWidth - width - margin);
    const left = Math.min(Math.max(margin, rect.right - width), maxLeft);
    const belowTop = rect.bottom + gap;
    const aboveTop = rect.top - gap - estimatedHeight;
    const preferredTop = belowTop + estimatedHeight <= viewportHeight - margin ? belowTop : aboveTop;
    const maxTop = Math.max(margin, viewportHeight - estimatedHeight - margin);
    const top = Math.min(Math.max(margin, preferredTop), maxTop);
    setHeatCapacityParamHelpPopoverStyle({ left, top, width, maxHeight });
  };

  const getGuideHeatCapacityDecisionPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.pressureSignalTargetMv)) return file.pressureSignalTargetMv;
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return file.pressureSignalMvDisplayed;
    if (Number.isFinite(file.pressureSignalMv)) return file.pressureSignalMv;
    return 0;
  };

  const getGuideHeatCapacityDisplayedPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.pressureSignalMv)) return file.pressureSignalMv;
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return file.pressureSignalMvDisplayed;
    if (Number.isFinite(file.pressureSignalTargetMv)) return file.pressureSignalTargetMv;
    return 0;
  };

  const getGuideHeatCapacityThresholdPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (file.heatCapacityMode === 'guide') {
      return Math.max(0, selectActiveHeatCapacityWorkbenchDisplay(file).pressureMv);
    }
    if (Number.isFinite(file.pressureSignalMvRaw)) return file.pressureSignalMvRaw;
    if (Number.isFinite(file.pressureSignalTargetMv)) return Math.max(0, file.pressureSignalTargetMv - file.pressureInitialBiasMv - file.pressureZeroOffset);
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return Math.max(0, file.pressureSignalMvDisplayed - file.pressureInitialBiasMv - file.pressureZeroOffset);
    if (Number.isFinite(file.pressureSignalMv)) return Math.max(0, file.pressureSignalMv - file.pressureInitialBiasMv - file.pressureZeroOffset);
    return 0;
  };

  const canProceedAfterPumping = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => getGuideHeatCapacityThresholdPressureMv(file) >= HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV;

  const getHeatCapacityPressureSafetyStatusFromMv = (
    pressureMv: number,
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): 'normal' | 'warning' | 'danger' => {
    const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
    return pressureMv >= pressureThresholdsMv.pressureDangerThresholdMv
      ? 'danger'
      : pressureMv >= pressureThresholdsMv.pressureWarningThresholdMv
      ? 'warning'
      : 'normal';
  };

  const showHeatCapacityPressureThresholdToast = (
    pressureMv: number,
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
    if (pressureMv >= pressureThresholdsMv.pressureDangerThresholdMv) {
      showHeatCapacityToast(heatCapacityRealtimeCopy.pressureAlarmMessage, 'danger', {
        interrupt: true,
        priority: HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
        source: 'pressure-alarm',
      });
      return;
    }
    if (pressureMv >= pressureThresholdsMv.pressureWarningThresholdMv) {
      showHeatCapacityToast(heatCapacityRealtimeCopy.pressureWarningMessage, 'info', {
        interrupt: true,
        priority: HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,
        source: 'pressure-warning',
      });
    }
  };

  const getGuideHeatCapacityAmbientTemperatureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const profile = file.heatCapacityExperimentProfile;
    if (profile && Number.isFinite(profile.ambientTemperatureMv)) return profile.ambientTemperatureMv;
    if (profile && Number.isFinite(profile.initialTemperatureMv)) return profile.initialTemperatureMv;
    if (Number.isFinite(file.temperatureSignalTargetMv)) return file.temperatureSignalTargetMv;
    return 1499.05;
  };

  const getGuideHeatCapacityDecisionTemperatureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.temperatureSignalTargetMv)) return file.temperatureSignalTargetMv;
    if (Number.isFinite(file.temperatureSignalMv)) return file.temperatureSignalMv;
    return getGuideHeatCapacityAmbientTemperatureMv(file);
  };

  const isGuideHeatCapacityTemperatureAtAmbient = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const ambientTemperatureMv = getGuideHeatCapacityAmbientTemperatureMv(file);
    const targetTemperatureMv = getGuideHeatCapacityDecisionTemperatureMv(file);
    const toleranceMv = Math.max(0.5, (file.heatCapacityExperimentProfile?.displayNoiseLevel ?? 0.08) * 6);
    return Math.abs(targetTemperatureMv - ambientTemperatureMv) <= toleranceMv;
  };

  const isGuideU0ZeroAttempted = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => (
    file.pressureZeroAdjusted ||
    file.pressureZeroAdjustMode !== 'none' ||
    Math.abs(file.pressureZeroKnobAngle) > 0.01
  );

  const isGuideU0ZeroReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    return file.powerOn &&
      stopcockState === 'open' &&
      isHeatCapacityPressureZeroWithinTolerance(file.pressureZeroDisplayedSamples);
  };

  const hasActiveTrialU1 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => file.heatCapacityGuideTrial?.u1 !== null && file.heatCapacityGuideTrial?.u1 !== undefined;

  const hasActiveTrialU2 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => file.heatCapacityGuideTrial?.u2 !== null && file.heatCapacityGuideTrial?.u2 !== undefined;

  const getActiveTrialRecordedU1Mv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => file.heatCapacityGuideTrial?.u1?.displayPressureMv ?? null;

  const getGuideHeatCapacityExpectedU1Mv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const profile = file.heatCapacityExperimentProfile;
    if (profile && Number.isFinite(profile.stableBeforeReleaseMv)) return profile.stableBeforeReleaseMv;
    if (profile && Number.isFinite(profile.u1MeasuredMv)) return profile.u1MeasuredMv;
    const stableSample = file.heatCapacityProcessSamples.stableBeforeReleaseSample;
    if (stableSample && Number.isFinite(stableSample.pressureSignalMv)) return stableSample.pressureSignalMv;
    const peakSample = file.heatCapacityProcessSamples.pumpPeakSample;
    if (peakSample && Number.isFinite(peakSample.pressureSignalMv)) return peakSample.pressureSignalMv;
    return null;
  };

  const getGuideHeatCapacityExpectedU2Mv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    recordedU1Mv: number | null,
  ) => {
    if (recordedU1Mv !== null) return recordedU1Mv * (1 - 1 / file.theoreticalGamma);
    const profile = file.heatCapacityExperimentProfile;
    if (profile && Number.isFinite(profile.recoveryPressureMv)) return profile.recoveryPressureMv;
    if (profile && Number.isFinite(profile.u2MeasuredMv)) return profile.u2MeasuredMv;
    const recoverySample = file.heatCapacityProcessSamples.recoverySample;
    if (recoverySample && Number.isFinite(recoverySample.pressureSignalMv)) return recoverySample.pressureSignalMv;
    return null;
  };

  const hasGuideHeatCapacityWaitElapsed = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    kind: 'u1' | 'u2',
  ) => {
    const referenceSample = kind === 'u1'
      ? file.heatCapacityProcessSamples.afterPumpSample
      : file.heatCapacityProcessSamples.releaseLowSample ?? file.heatCapacityProcessSamples.afterReleaseSample;
    if (!referenceSample) return false;
    return Math.max(0, file.simulationTimeS - referenceSample.timeS) >= HEAT_CAPACITY_GUIDE_WAIT_DURATION_S;
  };

  const isGuideHeatCapacityReleaseDurationReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const releaseStartSample = file.heatCapacityProcessSamples.beforeReleaseSample;
    if (!releaseStartSample) return false;
    return Math.max(0, file.simulationTimeS - releaseStartSample.timeS) >= HEAT_CAPACITY_GUIDE_RELEASE_DURATION_S;
  };

  const hasGuideHeatCapacityEnteredRecovery = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (file.heatCapacityPhase === 'recovering') return true;
    return false;
  };

  const isGuideHeatCapacityReleaseCompleteForU2 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    recordedU1Mv: number | null,
  ) => {
    if (recordedU1Mv === null) return false;
    if (file.heatCapacityProcessSamples.releaseLowSample || file.heatCapacityProcessSamples.afterReleaseSample) {
      return true;
    }
    if (hasGuideHeatCapacityEnteredRecovery(file) && isGuideHeatCapacityReleaseDurationReady(file)) return true;
    const pressureTarget = getGuideHeatCapacityDecisionPressureMv(file);
    return pressureTarget <= Math.max(5, recordedU1Mv * 0.14) && isGuideHeatCapacityReleaseDurationReady(file);
  };

  const getGuideHeatCapacityMinimumU1PlatformMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const expectedU1 = getGuideHeatCapacityExpectedU1Mv(file);
    return Math.max(HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, (expectedU1 ?? 110) * 0.45);
  };

  const hasGuideHeatCapacityReachedPumpTarget = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const targetMv = getGuideHeatCapacityMinimumU1PlatformMv(file);
    if (file.heatCapacityMode === 'guide') {
      return getGuideHeatCapacityDisplayedPressureMv(file) >= targetMv;
    }
    if (getGuideHeatCapacityThresholdPressureMv(file) >= targetMv) return true;
    const pumpSamples = [
      file.heatCapacityProcessSamples.afterPumpSample,
      file.heatCapacityProcessSamples.pumpPeakSample,
      file.heatCapacityProcessSamples.stableBeforeReleaseSample,
    ];
    return pumpSamples.some((sample) => (
      sample !== undefined &&
      Number.isFinite(sample.pressureSignalMv) &&
      sample.pressureSignalMv >= targetMv
    ));
  };

  const isGuideU1RecordReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const pressureForGate = getGuideHeatCapacityThresholdPressureMv(file);
    const minimumPlatformMv = HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV;
    const temperatureReady = isGuideHeatCapacityTemperatureAtAmbient(file);
    const hasEffectivePumping = file.pumpStrokeCount > 0 ||
      Boolean(file.heatCapacityProcessSamples.pumpPeakSample) ||
      pressureForGate >= minimumPlatformMv;

    return stopcockState === 'closed' &&
      !file.pumpValveOpen &&
      hasEffectivePumping &&
      canProceedAfterPumping(file) &&
      temperatureReady &&
      hasGuideHeatCapacityWaitElapsed(file, 'u1') &&
      file.heatCapacityPhase === 'sealedStabilizing';
  };

  const isGuideU2RecordReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const recordedU1Mv = getActiveTrialRecordedU1Mv(file);
    if (recordedU1Mv === null) return false;
    const pressureForGate = getGuideHeatCapacityThresholdPressureMv(file);
    const lowerBound = 0.2;
    const upperBound = Math.max(5, recordedU1Mv * 0.55);
    const releaseHasStarted = pressureForGate < Math.max(10, recordedU1Mv * 0.75);
    const releaseComplete = isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv);
    const temperatureReady = isGuideHeatCapacityTemperatureAtAmbient(file);

    return stopcockState === 'closed' &&
      releaseHasStarted &&
      releaseComplete &&
      pressureForGate >= lowerBound &&
      pressureForGate <= upperBound &&
      temperatureReady &&
      hasGuideHeatCapacityWaitElapsed(file, 'u2') &&
      file.heatCapacityPhase === 'recovering';
  };

  const getHeatCapacityGuideStep = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): GuideHeatCapacityStep => {
    if (file.heatCapacityMode === 'guide') {
      switch (file.heatCapacityGuideWorkflow.step) {
        case 'powerRequired':
          return 'powerOnRequired';
        case 'openStopcockForZeroRequired':
          return 'openStopcockForZeroRequired';
        case 'zeroRequired':
          return 'zeroAdjustRequired';
        case 'recordU0Required':
          return 'recordU0Required';
        case 'closeStopcockBeforePumpRequired':
          return 'closeStopcockRequired';
        case 'openPumpValveRequired':
          return 'openPumpValveRequired';
        case 'pumpRequired':
          return 'pumpRequired';
        case 'closePumpValveRequired':
          return 'closePumpValveRequired';
        case 'u1Waiting':
          return 'stabilizeBeforeReleaseRequired';
        case 'recordU1Required':
          return 'recordU1Required';
        case 'openStopcockForReleaseRequired':
          return 'openStopcockReleaseRequired';
        case 'closeStopcockAfterReleaseRequired':
          return 'closeStopcockAfterReleaseRequired';
        case 'u2Waiting':
          return 'recoverRequired';
        case 'recordU2Required':
          return 'recordU2Required';
        case 'closePowerRequired':
          return 'closePowerRequired';
        case 'completed':
          return 'completed';
      }
    }
    if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) return 'idle';
    if (file.runState === 'finished') return 'idle';
    if (!file.powerOn) return 'powerOnRequired';

    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const pressureValue = getGuideHeatCapacityThresholdPressureMv(file);
    const hasU0 = file.heatCapacityGuideTrial?.u0 !== null && file.heatCapacityGuideTrial?.u0 !== undefined;
    const hasU1 = hasActiveTrialU1(file);
    const hasU2 = hasActiveTrialU2(file);
    const recordedU1Mv = getActiveTrialRecordedU1Mv(file);
    const releaseComplete = recordedU1Mv !== null && isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv);
    const u1Ready = isGuideU1RecordReady(file);
    const u2Ready = isGuideU2RecordReady(file);

    if (!hasU0) {
      if (stopcockState !== 'open') return 'openStopcockForZeroRequired';
      if (!isGuideU0ZeroReady(file)) return 'zeroAdjustRequired';
      return 'recordU0Required';
    }
    if (!hasU1) {
      if (stopcockState !== 'closed') return 'closeStopcockRequired';
      const pumpTargetReached = hasGuideHeatCapacityReachedPumpTarget(file);
      if (!file.pumpValveOpen && pressureValue < 8 && file.pumpStrokeCount === 0) return 'openPumpValveRequired';
      if (!file.pumpValveOpen && !pumpTargetReached) return 'openPumpValveRequired';
      if (file.pumpValveOpen && !pumpTargetReached) return 'pumpRequired';
      if (file.pumpValveOpen && pumpTargetReached) return 'closePumpValveRequired';
      return u1Ready ? 'recordU1Required' : 'stabilizeBeforeReleaseRequired';
    }
    if (!hasU2) {
      if (u2Ready) return 'recordU2Required';
      if (!releaseComplete) return 'openStopcockReleaseRequired';
      if (stopcockState === 'open') return 'closeStopcockAfterReleaseRequired';
      return 'recoverRequired';
    }
    return 'completed';
  };

  const getGuideStepGuidance = (
    step: GuideHeatCapacityStep,
    file?: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): { message: string; controlId: string | null } => {
    const isEn = settingsLanguagePreference === 'en';
    const isTw = settingsLanguagePreference === 'zh-TW';
    const zeroAdjustMessage = file && isGuideU0ZeroAttempted(file)
      ? isEn
        ? 'Uₚ is still not close to 0. Continue adjusting the pressure-zero knob.'
        : isTw
          ? '目前 Uₚ 仍未接近 0，請繼續調整壓強調零旋鈕。'
          : '当前 Uₚ 仍未接近 0，请继续调整压力调零旋钮。'
      : `${heatCapacityRealtimeCopy.guideUsageHints.zeroFocus}${heatCapacityRealtimeCopy.guideUsageHints.zeroAdjust}`;
    const temperatureReady = file ? isGuideHeatCapacityTemperatureAtAmbient(file) : false;
    const waitBeforeU1Message = isEn
      ? 'Keep the vessel sealed for 5 min; when the timer completes, record U₁ / Uₜ₁.'
      : isTw
        ? '請保持氣瓶封閉等待 5 min；計時到達後記錄 U₁ / Uₜ₁。'
        : '请保持气瓶封闭等待 5 min；计时到达后记录 U₁ / Uₜ₁。';
    const recordedU1Mv = file ? getActiveTrialRecordedU1Mv(file) : null;
    const releaseComplete = file ? isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv) : false;
    const stopcockState = file ? getHeatCapacityStopcockState(file.stopcockAngleDeg) : 'closed';
    const openReleaseMessage = releaseComplete
      ? isEn
        ? 'Close the glass stopcock after quick release.'
        : isTw
          ? '放氣完成，請關閉玻璃旋塞。'
          : '放气完成，请关闭玻璃旋塞。'
      : stopcockState === 'open'
        ? isEn
          ? 'Keep the glass stopcock open until Uₚ drops close to 0.'
          : isTw
            ? '請保持玻璃旋塞打開，等待 Uₚ 降至接近 0。'
            : '请保持玻璃旋塞打开，等待 Uₚ 降至接近 0。'
        : isEn
          ? 'Open the glass stopcock for quick release.'
          : isTw
            ? '請打開玻璃旋塞進行快速放氣。'
            : '请打开玻璃旋塞进行快速放气。';
    const recoverMessage = isEn
      ? 'After closing the glass stopcock, wait 5 min; after thermal recovery, record U₂ / Uₜ₂.'
      : isTw
        ? '請關閉玻璃旋塞後等待 5 min；回溫穩定後記錄 U₂ / Uₜ₂。'
        : '请关闭玻璃旋塞后等待 5 min；回温稳定后记录 U₂ / Uₜ₂。';
    const messages: Record<GuideHeatCapacityStep, string> = {
      idle: isEn ? 'Start guide mode when ready.' : isTw ? '需要時開始引導模式。' : '需要时开始引导模式。',
      powerOnRequired: isEn ? 'Turn on the power first.' : isTw ? '請先打開電源。' : '请先打开电源。',
      openStopcockForZeroRequired: isEn ? 'Open the glass stopcock before pressure zeroing.' : isTw ? '請先打開玻璃旋塞，再進行壓強差調零。' : '请先打开玻璃旋塞，再进行压强差调零。',
      zeroAdjustRequired: zeroAdjustMessage,
      recordU0Required: isEn ? 'Record U₀ before pressurizing.' : isTw ? '請先記錄 U₀，再開始加壓。' : '请先记录 U₀，再开始加压。',
      closeStopcockRequired: isEn ? 'Close the glass stopcock before pumping.' : isTw ? '請先關閉玻璃旋塞。' : '请先关闭玻璃旋塞。',
      openPumpValveRequired: heatCapacityRealtimeCopy.guideUsageHints.pumpValve,
      pumpRequired: heatCapacityRealtimeCopy.guideUsageHints.pumpAction,
      closePumpValveRequired: isEn ? 'Close the pump valve to start the sealed 5 min wait.' : isTw ? '請關閉打氣閥門，進入封閉 5 min 等待。' : '请关闭打气阀门，进入封闭 5 min 等待。',
      stabilizeBeforeReleaseRequired: waitBeforeU1Message,
      recordU1Required: heatCapacityRealtimeCopy.guideUsageHints.waitU1Ready,
      openStopcockReleaseRequired: openReleaseMessage,
      closeStopcockAfterReleaseRequired: heatCapacityRealtimeCopy.guideUsageHints.releaseReady,
      recoverRequired: recoverMessage,
      recordU2Required: heatCapacityRealtimeCopy.guideUsageHints.waitU2Ready,
      closePowerRequired: isEn ? 'Turn off the power to finish this guided experiment.' : isTw ? '請關閉電源，完成本次引導實驗。' : '请关闭电源，完成本次引导实验。',
      completed: isEn ? 'Guide experiment complete.' : isTw ? '引導實驗已完成。' : '引导实验已完成。',
    };
    const controlByStep: Record<GuideHeatCapacityStep, string | null> = {
      idle: null,
      powerOnRequired: 'powerSwitch',
      openStopcockForZeroRequired: 'stopcock',
      zeroAdjustRequired: 'pressureZero',
      recordU0Required: 'recordU0',
      closeStopcockRequired: 'stopcock',
      openPumpValveRequired: 'pumpValve',
      pumpRequired: 'pumpBulb',
      closePumpValveRequired: 'pumpValve',
      stabilizeBeforeReleaseRequired: temperatureReady ? 'instrumentPressureDisplay' : 'instrumentTemperatureDisplay',
      recordU1Required: 'recordU1',
      openStopcockReleaseRequired: 'stopcock',
      closeStopcockAfterReleaseRequired: 'stopcock',
      recoverRequired: temperatureReady ? 'instrumentPressureDisplay' : 'instrumentTemperatureDisplay',
      recordU2Required: 'recordU2',
      closePowerRequired: 'powerSwitch',
      completed: null,
    };
    return { message: messages[step], controlId: controlByStep[step] };
  };

  const getGuideHeatCapacityRecordBlockedMessage = (
    kind: HeatCapacityGuideRecordKind,
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    latestStep: GuideHeatCapacityStep,
  ) => {
    const messages = heatCapacityRealtimeCopy.guideRecordBlockedMessages;
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    if (kind === 'u0') {
      if (!file.powerOn) return messages.u0NeedPower;
      if (stopcockState !== 'open') return messages.u0NeedStopcock;
      if (!isGuideU0ZeroReady(file)) return messages.u0NeedZero;
      return messages.u0NeedCurrentStep;
    }
    if (kind === 'u1') {
      if (file.pumpStrokeCount === 0 && !file.heatCapacityProcessSamples.pumpPeakSample) return messages.u1NeedPump;
      if (file.pumpValveOpen) return messages.u1NeedClosePumpValve;
      if (!hasGuideHeatCapacityWaitElapsed(file, 'u1')) return messages.u1NeedWait;
      return latestStep === 'recordU1Required' ? heatCapacityRealtimeCopy.recordU1Warning : messages.u1NeedCurrentStep;
    }
    if (!isGuideHeatCapacityReleaseCompleteForU2(file, getActiveTrialRecordedU1Mv(file))) return messages.u2NeedRelease;
    if (stopcockState === 'open') return messages.u2NeedCloseStopcock;
    if (!hasGuideHeatCapacityWaitElapsed(file, 'u2')) return messages.u2NeedWait;
    return latestStep === 'recordU2Required' ? heatCapacityRealtimeCopy.recordU2Warning : messages.u2NeedCurrentStep;
  };

  const setHeatCapacityToastCurrentState = (message: HeatCapacityToastMessage | null) => {
    heatCapacityToastCurrentRef.current = message;
    setHeatCapacityToastCurrent(message);
  };

  const setHeatCapacityToastPendingState = (message: HeatCapacityToastMessage | null) => {
    heatCapacityToastPendingRef.current = message;
    setHeatCapacityToastPending(message);
  };

  const scheduleHeatCapacityToastAdvance = () => {
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    heatCapacityToastTimerRef.current = window.setTimeout(() => {
      heatCapacityToastTimerRef.current = null;
      const pendingMessage = heatCapacityToastPendingRef.current;
      if (pendingMessage) {
        setHeatCapacityToastPendingState(null);
        setHeatCapacityToastCurrentState({
          ...pendingMessage,
          createdAt: Date.now(),
        });
        scheduleHeatCapacityToastAdvance();
        return;
      }
      setHeatCapacityToastCurrentState(null);
    }, HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS);
  };

  const isHeatCapacityPressureToast = (message: HeatCapacityToastMessage | null) => (
    message?.source === 'pressure-warning' ||
    message?.source === 'pressure-close-valve' ||
    message?.source === 'pressure-alarm'
  );

  const isHeatCapacityGuideToast = (message: HeatCapacityToastMessage | null) => (
    message?.source === 'guide' ||
    message?.source === 'guide-blocked'
  );

  const isHeatCapacityPressureAlertActive = () => (
    heatCapacityPressureAlarmVisibleRef.current ||
    heatCapacityPressureAlarmTimerRef.current !== null ||
    heatCapacityClosePumpValveReminderTimerRef.current !== null ||
    isHeatCapacityPressureToast(heatCapacityToastCurrentRef.current) ||
    isHeatCapacityPressureToast(heatCapacityToastPendingRef.current)
  );

  const showHeatCapacityToast = (
    text: string,
    level: HeatCapacityToastLevel = 'info',
    options: { interrupt?: boolean; priority?: number; source?: HeatCapacityToastSource } = {},
  ) => {
    const nextMessage: HeatCapacityToastMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      level,
      priority: options.priority ?? HEAT_CAPACITY_TOAST_PRIORITY[level],
      source: options.source ?? 'guide',
      createdAt: Date.now(),
    };
    const currentMessage = heatCapacityToastCurrentRef.current;
    if (!isHeatCapacityPressureToast(nextMessage) && isHeatCapacityPressureAlertActive()) return;
    if (isHeatCapacityPressureToast(currentMessage) && !isHeatCapacityPressureToast(nextMessage)) return;
    if (options.interrupt) {
      if (currentMessage && currentMessage.priority > nextMessage.priority) return;
      if (heatCapacityToastTimerRef.current !== null) {
        window.clearTimeout(heatCapacityToastTimerRef.current);
        heatCapacityToastTimerRef.current = null;
      }
      setHeatCapacityToastPendingState(null);
      setHeatCapacityToastCurrentState(nextMessage);
      scheduleHeatCapacityToastAdvance();
      return;
    }
    if (!currentMessage) {
      setHeatCapacityToastCurrentState(nextMessage);
      scheduleHeatCapacityToastAdvance();
      return;
    }
    if (nextMessage.priority < currentMessage.priority) return;
    const pendingMessage = heatCapacityToastPendingRef.current;
    if (isHeatCapacityPressureToast(pendingMessage) && !isHeatCapacityPressureToast(nextMessage)) return;
    if (
      !pendingMessage ||
      nextMessage.priority >= pendingMessage.priority
    ) {
      setHeatCapacityToastPendingState(nextMessage);
    }
  };

  const clearHeatCapacityToastBySource = (
    predicate: (message: HeatCapacityToastMessage | null) => boolean,
  ) => {
    const currentMessage = heatCapacityToastCurrentRef.current;
    const pendingMessage = heatCapacityToastPendingRef.current;
    const clearCurrent = predicate(currentMessage);
    const clearPending = predicate(pendingMessage);
    if (!clearCurrent && !clearPending) return;
    if (clearPending) setHeatCapacityToastPendingState(null);
    if (!clearCurrent) return;
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    const nextCurrent = clearPending ? null : pendingMessage;
    setHeatCapacityToastPendingState(null);
    if (nextCurrent) {
      setHeatCapacityToastCurrentState({
        ...nextCurrent,
        createdAt: Date.now(),
      });
      scheduleHeatCapacityToastAdvance();
      return;
    }
    setHeatCapacityToastCurrentState(null);
  };

  const clearHeatCapacityToastQueue = () => {
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    setHeatCapacityToastCurrentState(null);
    setHeatCapacityToastPendingState(null);
  };

  const clearHeatCapacityPressureAlarmInteractionLock = (fileId?: string | null) => {
    if (fileId) {
      heatCapacityPumpFocusAlarmBlockedFileIdsRef.current.delete(fileId);
    } else {
      heatCapacityPumpFocusAlarmBlockedFileIdsRef.current.clear();
    }
    if (heatCapacityPressureAlarmTimerRef.current !== null) {
      window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
      heatCapacityPressureAlarmTimerRef.current = null;
    }
    if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
      window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
      heatCapacityClosePumpValveReminderTimerRef.current = null;
    }
    heatCapacityPressureAlarmVisibleRef.current = false;
    setHeatCapacityPressureAlarmVisible(false);
    clearHeatCapacityToastBySource(isHeatCapacityPressureToast);
  };

  const clearHeatCapacityGuideStartTimer = () => {
    if (heatCapacityGuideStartTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideStartTimerRef.current);
      heatCapacityGuideStartTimerRef.current = null;
    }
  };

  const clearHeatCapacityRecordSuccessToastTimers = () => {
    heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityRecordSuccessToastTimersRef.current = [];
    setHeatCapacityRecordToastSequenceActive(false);
  };

  const getHeatCapacityRecordSuccessToast = (kind: HeatCapacityGuideRecordKind) => (
    kind === 'u0'
      ? heatCapacityRealtimeCopy.recordU0SuccessToast
      : kind === 'u1'
        ? heatCapacityRealtimeCopy.recordU1SuccessToast
        : heatCapacityRealtimeCopy.recordU2SuccessToast
  );

  const showHeatCapacitySuccessToastSequence = ({
    primaryMessage,
    followUpMessage,
  }: {
    primaryMessage: string;
    followUpMessage: string | null;
  }) => {
    clearHeatCapacityRecordSuccessToastTimers();
    setHeatCapacityRecordToastSequenceActive(true);
    showHeatCapacityToast(primaryMessage, 'success', { interrupt: true });

    if (followUpMessage) {
      const followUpTimerId = window.setTimeout(() => {
        showHeatCapacityToast(followUpMessage, 'success', { interrupt: true });
      }, HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS);
      heatCapacityRecordSuccessToastTimersRef.current.push(followUpTimerId);
    }

    const releaseDelay = followUpMessage
      ? HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS * 2
      : HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS;
    const releaseTimerId = window.setTimeout(() => {
      heatCapacityRecordSuccessToastTimersRef.current = [];
      setHeatCapacityRecordToastSequenceActive(false);
    }, releaseDelay);
    heatCapacityRecordSuccessToastTimersRef.current.push(releaseTimerId);
  };

  const showHeatCapacityRecordSuccessSequence = ({
    recordMessage,
    trialCompleteMessage,
  }: {
    recordMessage: string;
    trialCompleteMessage: string | null;
  }) => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: recordMessage,
      followUpMessage: trialCompleteMessage,
    });
  };

  const showHeatCapacityGuidePowerOffCompletionToast = () => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: heatCapacityRealtimeCopy.finalTrialCompleteToast,
      followUpMessage: null,
    });
  };

  const getHeatCapacityFocusControlSnapshot = (
    file: WorkbenchHeatCapacityState,
  ): HeatCapacityFocusControlSnapshot => ({
    powerOn: file.powerOn,
    stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
    pumpValveOpen: file.pumpValveOpen,
    pressureZeroAdjusted: file.pressureZeroAdjusted,
    pressureZeroOffset: file.pressureZeroOffset,
  });

  const isHeatCapacityFocusSessionMeaningful = (
    session: HeatCapacityFocusSession,
  ) => {
    if (session.nonReversibleAction) return true;
    const currentFile = filesRef.current.find((file) => file.id === session.fileId);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return true;
    const currentSnapshot = getHeatCapacityFocusControlSnapshot(currentFile);
    return (
      currentSnapshot.powerOn !== session.baseline.powerOn ||
      currentSnapshot.stopcockOpen !== session.baseline.stopcockOpen ||
      currentSnapshot.pumpValveOpen !== session.baseline.pumpValveOpen ||
      currentSnapshot.pressureZeroAdjusted !== session.baseline.pressureZeroAdjusted ||
      currentSnapshot.pressureZeroOffset !== session.baseline.pressureZeroOffset
    );
  };

  const markHeatCapacityFocusSessionNonReversible = () => {
    const session = heatCapacityFocusSessionRef.current;
    if (!session) return;
    heatCapacityFocusSessionRef.current = {
      ...session,
      nonReversibleAction: true,
    };
  };

  const isHeatCapacityPumpFocusBlockedByAlarm = (
    file: WorkbenchHeatCapacityState,
  ) => {
    const alarmedForFile = heatCapacityPumpFocusAlarmBlockedFileIdsRef.current.has(file.id);
    const activeDanger = (
      file.pressureSafetyStatus === 'danger' ||
      file.pressureOverLimit ||
      heatCapacityPressureAlarmVisibleRef.current
    );
    const samePumpingSession = (
      file.pumpStrokeCount > 0 ||
      file.heatCapacityFreePhysicsState.pumpStrokeCount > 0 ||
      file.heatCapacityGuidePhysicsState.pumpStrokeCount > 0
    );
    if (alarmedForFile && !activeDanger && !samePumpingSession) {
      heatCapacityPumpFocusAlarmBlockedFileIdsRef.current.delete(file.id);
      return false;
    }
    return activeDanger || (alarmedForFile && samePumpingSession);
  };

  const exitHeatCapacityFocusMode = () => {
    const session = heatCapacityFocusSessionRef.current;
    if (session) {
      const meaningfulSession = isHeatCapacityFocusSessionMeaningful(session);
      updateFileById(session.fileId, (file) => {
        if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
        if (!meaningfulSession) {
          return hasCompletedHeatCapacityFreeRecordSet(file)
            ? file
            : prepareNextHeatCapacityFreeExperimentGroupWorkbenchState(file);
        }
        if (
          file.heatCapacityFreeExperimentGroupStatus === 'draft' &&
          !hasCompletedHeatCapacityFreeRecordSet(file)
        ) {
          return freezeHeatCapacityFreeParametersForCurrentGroup(file);
        }
        return file;
      });
      if (!meaningfulSession && !session.parametersCollapsedBeforeFocus) {
        setParametersCollapsed(false);
      }
      heatCapacityFocusSessionRef.current = null;
    }
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const updateHeatCapacityFocusMode = (mode: HeatCapacityFocusMode) => {
    if (mode === 'none') {
      exitHeatCapacityFocusMode();
      return;
    }
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (currentFile?.kind === 'heatCapacity') {
      if (mode === 'pump' && isHeatCapacityPumpFocusBlockedByAlarm(currentFile)) {
        exitHeatCapacityFocusMode();
        showHeatCapacityToast(heatCapacityRealtimeCopy.closePumpValveReminder, 'warning', {
          interrupt: true,
          priority: HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
          source: 'pressure-close-valve',
        });
        return;
      }
      const currentSession = heatCapacityFocusSessionRef.current;
      heatCapacityFocusSessionRef.current = currentSession?.fileId === currentFile.id
        ? {
            ...currentSession,
            mode,
          }
        : {
            fileId: currentFile.id,
            mode,
            parametersCollapsedBeforeFocus: parametersCollapsed,
            baseline: getHeatCapacityFocusControlSnapshot(currentFile),
            nonReversibleAction: false,
          };
      setParametersCollapsed(true);
      setHeatCapacityAdvancedOpen(false);
      setPinnedHeatCapacityParamHelpId(null);
      setHoveredHeatCapacityParamHelpId(null);
      setHeatCapacityParamHelpPopoverStyle(undefined);
    }
  };

  const handleHeatCapacityFocusExitRequest = (mode: HeatCapacityFocusMode) => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (
      mode === 'pump' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'guide' &&
      guideHeatCapacityActiveFileIdRef.current === currentFile.id &&
      currentFile.heatCapacityGuideWorkflow.step === 'pumpRequired' &&
      !hasGuideHeatCapacityReachedPumpTarget(currentFile)
    ) {
      const guidance = getGuideStepGuidance('pumpRequired', currentFile);
      showGuideHeatCapacityGuidance(guidance.message, guidance.controlId, 'warning', 'guide-blocked');
      return false;
    }
    return true;
  };

  const showHeatCapacityPressureAlarm = (fileId: string, fileName: string) => {
    clearHeatCapacityToastQueue();
    heatCapacityPumpFocusAlarmBlockedFileIdsRef.current.add(fileId);
    setHeatCapacityPressureAlarmVisible(true);
    exitHeatCapacityFocusMode();
    pushLog(heatCapacityRealtimeCopy.pressureAlarmLog(fileName), 'warning');
    if (heatCapacityPressureAlarmTimerRef.current !== null) {
      window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
    }
    if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
      window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
      heatCapacityClosePumpValveReminderTimerRef.current = null;
    }
    heatCapacityPressureAlarmTimerRef.current = window.setTimeout(() => {
      heatCapacityPressureAlarmTimerRef.current = null;
      setHeatCapacityPressureAlarmVisible(false);
      heatCapacityClosePumpValveReminderTimerRef.current = window.setTimeout(() => {
        heatCapacityClosePumpValveReminderTimerRef.current = null;
        const currentFile = filesRef.current.find((file) => file.id === fileId);
        if (currentFile?.kind !== 'heatCapacity') return;
        if (!currentFile.pumpValveOpen) return;
        showHeatCapacityToast(heatCapacityRealtimeCopy.closePumpValveReminder, 'warning', {
          interrupt: true,
          priority: HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
          source: 'pressure-close-valve',
        });
      }, HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS);
    }, HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS);
  };

  const pulseGuideHeatCapacityControl = (controlId?: string | null) => {
    setGuideHeatCapacityFocusControlId(controlId ?? null);
    setGuideHeatCapacityPulseActive(Boolean(controlId));
    if (guideHeatCapacityPulseTimerRef.current !== null) window.clearTimeout(guideHeatCapacityPulseTimerRef.current);
    if (!controlId) return;
    guideHeatCapacityPulseTimerRef.current = window.setTimeout(() => {
      guideHeatCapacityPulseTimerRef.current = null;
      setGuideHeatCapacityPulseActive(false);
      setGuideHeatCapacityFocusControlId(null);
    }, 2200);
  };

  const clearGuideHeatCapacityGuidancePulseTimer = () => {
    if (guideHeatCapacityGuidancePulseTimerRef.current !== null) {
      window.clearInterval(guideHeatCapacityGuidancePulseTimerRef.current);
      guideHeatCapacityGuidancePulseTimerRef.current = null;
    }
  };

  const showGuideHeatCapacityGuidance = (
    message: string,
    controlId?: string | null,
    level: HeatCapacityToastLevel = 'info',
    source: Extract<HeatCapacityToastSource, 'guide' | 'guide-blocked'> = 'guide',
  ) => {
    if (isHeatCapacityPressureAlertActive()) return;
    const shouldReplaceActiveGuideBlockedToast = source === 'guide-blocked';
    showHeatCapacityToast(message, level, { source, interrupt: shouldReplaceActiveGuideBlockedToast });
    pulseGuideHeatCapacityControl(controlId);
  };

  const clearGuideHeatCapacityGuidance = () => {
    clearHeatCapacityToastBySource(isHeatCapacityGuideToast);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityFocusControlId(null);
    if (guideHeatCapacityPulseTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPulseTimerRef.current);
      guideHeatCapacityPulseTimerRef.current = null;
    }
  };

  const clearGuideHeatCapacityPendingStrongReminderTimer = () => {
    if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
    }
  };

  const activateGuideHeatCapacityStrongReminder = (controlId?: string | null) => {
    if (isHeatCapacityPressureAlertActive()) return;
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    clearGuideHeatCapacityPendingStrongReminderTimer();
    clearGuideHeatCapacityGuidance();
    setGuideHeatCapacityStrongReminderControlId(controlId ?? null);
    setGuideHeatCapacityStrongReminderFocusKey((key) => key + 1);
    pulseGuideHeatCapacityControl(controlId ?? null);
    setGuideHeatCapacityStrongReminderActive(true);
  };

  const scheduleGuideHeatCapacityStrongReminderAfterToast = (controlId?: string | null) => {
    clearGuideHeatCapacityPendingStrongReminderTimer();
    guideHeatCapacityPendingStrongReminderTimerRef.current = window.setTimeout(() => {
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
      activateGuideHeatCapacityStrongReminder(controlId ?? null);
    }, HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS);
  };

  const clearGuideHeatCapacityStrongReminder = () => {
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    clearGuideHeatCapacityPendingStrongReminderTimer();
    guideHeatCapacityMissCountRef.current = 0;
    setGuideHeatCapacityStrongReminderActive(false);
    setGuideHeatCapacityStrongReminderControlId(null);
  };

  const clearGuideHeatCapacityStrongReminderFocus = () => {
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const shouldResetStrongFocusAfterAllowedAction = (
    controlId: string | null,
    action: GuideHeatCapacityAction,
  ) => (
    (controlId === 'stopcock' && (action === 'openStopcock' || action === 'closeStopcock')) ||
    (controlId === 'pumpValve' && (action === 'openPumpValve' || action === 'closePumpValve'))
  );

  const resetHeatCapacityGuideUiStateForModeChange = () => {
    clearGuideHeatCapacityGuidance();
    clearGuideHeatCapacityStrongReminder();
    clearGuideHeatCapacityGuidancePulseTimer();
    setGuideHeatCapacityActiveFileId(null);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityFocusControlId(null);
    setGuideHeatCapacityRollback(null);
    setHeatCapacityGuideProjectedHoles({});
    setHeatCapacityFocusResetKey((key) => key + 1);
    setHeatCapacityHardSphereVisualResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const resetHeatCapacityModeUiForFreeBase = () => {
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    resetHeatCapacityGuideUiStateForModeChange();
    setPendingRemoveHeatCapacityTrialRecord(null);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    setAutoDemoCompletionMessage(null);
  };

  const registerGuideHeatCapacityMiss = (guard: GuideHeatCapacityGuardResult) => {
    const missCount = guideHeatCapacityMissCountRef.current + 1;
    guideHeatCapacityMissCountRef.current = missCount;
    return missCount >= 2;
  };

  useEffect(() => () => {
    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
      heatCapacityRecordControlsClosingTimerRef.current = null;
    }
    clearGuideHeatCapacityGuidancePulseTimer();
    clearGuideHeatCapacityStrongReminder();
  }, []);

  const getGuideHeatCapacityGuard = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    action: GuideHeatCapacityAction,
  ): GuideHeatCapacityGuardResult => {
    const step = getHeatCapacityGuideStep(file);
    const guidance = getGuideStepGuidance(step, file);
    const rollbackByAction: Partial<Record<GuideHeatCapacityAction, GuideHeatCapacityRollbackAnimation>> = {
      adjustPressureZero: 'knobBounce',
      openStopcock: 'stopcockBounce',
      closeStopcock: 'stopcockBounce',
      openPumpValve: 'valveBounce',
      closePumpValve: 'valveBounce',
      pumpBulb: 'pumpBulbBounce',
      turnPowerOn: 'powerBounce',
      turnPowerOff: 'powerBounce',
    };
    const allowedActions: Record<GuideHeatCapacityStep, GuideHeatCapacityAction[]> = {
      idle: ['turnPowerOn'],
      powerOnRequired: ['turnPowerOn'],
      openStopcockForZeroRequired: ['openStopcock'],
      zeroAdjustRequired: ['adjustPressureZero'],
      recordU0Required: ['adjustPressureZero', 'recordU0'],
      closeStopcockRequired: ['closeStopcock'],
      openPumpValveRequired: ['openPumpValve'],
      pumpRequired: ['pumpBulb'],
      closePumpValveRequired: ['closePumpValve'],
      stabilizeBeforeReleaseRequired: [],
      recordU1Required: ['recordU1'],
      openStopcockReleaseRequired: ['openStopcock'],
      closeStopcockAfterReleaseRequired: ['closeStopcock'],
      recoverRequired: [],
      recordU2Required: ['recordU2'],
      closePowerRequired: ['turnPowerOff'],
      completed: [],
    };
    if (
      action === 'closePumpValve' &&
      (step === 'pumpRequired' || step === 'closePumpValveRequired') &&
      !canProceedAfterPumping(file)
    ) {
      return {
        allowed: false,
        expectedControlId: 'pumpBulb',
        expectedMessage: heatCapacityRealtimeCopy.guidePumpInsufficientReminder,
        expectedLevel: 'warning',
        rollbackAnimation: 'valveBounce',
      };
    }
    if (step === 'stabilizeBeforeReleaseRequired') {
      return {
        allowed: false,
        expectedControlId: 'recordU1',
        expectedMessage: guidance.message,
        expectedLevel: 'warning',
        rollbackAnimation: rollbackByAction[action],
        suppressStrongReminder: true,
      };
    }
    if (step === 'recoverRequired') {
      return {
        allowed: false,
        expectedControlId: 'recordU2',
        expectedMessage: guidance.message,
        expectedLevel: 'warning',
        rollbackAnimation: rollbackByAction[action],
        suppressStrongReminder: true,
      };
    }
    if (allowedActions[step]?.includes(action)) return { allowed: true };
    if (isHeatCapacityGuideRecordStep(step)) {
      return {
        allowed: false,
        expectedControlId: guidance.controlId ?? undefined,
        rollbackAnimation: rollbackByAction[action],
        suppressGuidance: true,
      };
    }
    return {
      allowed: false,
      expectedControlId: guidance.controlId ?? undefined,
      expectedMessage: guidance.message,
      expectedLevel: 'warning',
      rollbackAnimation: rollbackByAction[action],
    };
  };

  const applyGuideHeatCapacityGuardFailure = (guard: GuideHeatCapacityGuardResult) => {
    if (guard.rollbackAnimation === 'pumpBulbBounce') setHeatCapacityPumpPulseId((pulseId) => pulseId + 1);
    if (guard.rollbackAnimation) {
      setGuideHeatCapacityRollback({
        animation: guard.rollbackAnimation,
        key: Date.now(),
      });
    }
    const shouldOpenStrongReminder = guard.suppressStrongReminder ? false : registerGuideHeatCapacityMiss(guard);
    if (guard.suppressGuidance) {
      if (shouldOpenStrongReminder) scheduleGuideHeatCapacityStrongReminderAfterToast(guard.expectedControlId ?? null);
      return;
    }
    showGuideHeatCapacityGuidance(guard.expectedMessage ?? '', guard.expectedControlId, guard.expectedLevel ?? 'warning', 'guide-blocked');
    if (shouldOpenStrongReminder) {
      scheduleGuideHeatCapacityStrongReminderAfterToast(guard.expectedControlId ?? null);
    }
  };

  const guardGuideHeatCapacityAction = (
    action: GuideHeatCapacityAction,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (source === 'autoDemo') return true;
    if (!activeFile || activeFile.kind !== 'heatCapacity') return true;
    if (guideHeatCapacityActiveFileId !== activeFile.id) return true;
    const guard = getGuideHeatCapacityGuard(activeFile, action);
    if (guard.allowed) {
      const activeStrongReminderControlId = guideHeatCapacityStrongReminderActive
        ? guideHeatCapacityStrongReminderControlId
        : null;
      clearGuideHeatCapacityStrongReminder();
      clearGuideHeatCapacityGuidance();
      clearGuideHeatCapacityPendingStrongReminderTimer();
      if (shouldResetStrongFocusAfterAllowedAction(activeStrongReminderControlId, action)) {
        clearGuideHeatCapacityStrongReminderFocus();
      }
      return true;
    }
    applyGuideHeatCapacityGuardFailure(guard);
    return false;
  };

  const activeHeatCapacityGuideFileId = activeFile.kind === 'heatCapacity' ? activeFile.id : null;
  const activeHeatCapacityGuideStep: GuideHeatCapacityStep = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityGuideStep(activeFile)
    : 'idle';

  const applyHeatCapacityGuideChecklistView = (
    viewedIndex: number,
    visualOffsetPx = 0,
    animate = true,
  ) => {
    const clampedIndex = Math.max(
      0,
      Math.min(HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1, viewedIndex),
    );
    const clampedOffset = Math.max(
      -HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX * 0.48,
      Math.min(HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX * 0.48, visualOffsetPx),
    );
    heatCapacityGuideChecklistViewedIndexRef.current = clampedIndex;
    heatCapacityGuideChecklistVisualOffsetRef.current = clampedOffset;
    setHeatCapacityGuideChecklistViewedIndex((current) => (
      current === clampedIndex ? current : clampedIndex
    ));
    const track = heatCapacityGuideChecklistTrackRef.current;
    if (!track) return;
    const baseOffset = HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX -
      clampedIndex * HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
    track.style.setProperty('--studio-heat-guide-step-base-offset', `${baseOffset}px`);
    track.style.setProperty('--studio-heat-guide-step-visual-offset', `${clampedOffset}px`);
    track.classList.toggle('studio-heat-guide-step-track-snapping', animate);
  };

  const clearHeatCapacityGuideChecklistTimers = () => {
    if (heatCapacityGuideChecklistFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityGuideChecklistFrameRef.current);
      heatCapacityGuideChecklistFrameRef.current = null;
    }
    if (heatCapacityGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistSnapTimerRef.current);
      heatCapacityGuideChecklistSnapTimerRef.current = null;
    }
    if (heatCapacityGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistReturnTimerRef.current);
      heatCapacityGuideChecklistReturnTimerRef.current = null;
    }
  };

  const returnHeatCapacityGuideChecklistToCurrentStep = () => {
    heatCapacityGuideChecklistPendingWheelDeltaRef.current = 0;
    applyHeatCapacityGuideChecklistView(heatCapacityGuideChecklistCurrentIndexRef.current, 0, true);
  };

  const snapHeatCapacityGuideChecklistView = () => {
    applyHeatCapacityGuideChecklistView(heatCapacityGuideChecklistViewedIndexRef.current, 0, true);
  };

  const processHeatCapacityGuideChecklistWheelFrame = () => {
    heatCapacityGuideChecklistFrameRef.current = null;
    const pendingDelta = heatCapacityGuideChecklistPendingWheelDeltaRef.current;
    heatCapacityGuideChecklistPendingWheelDeltaRef.current = 0;
    if (!pendingDelta) return;

    let nextIndex = heatCapacityGuideChecklistViewedIndexRef.current;
    let nextOffset = heatCapacityGuideChecklistVisualOffsetRef.current -
      pendingDelta * HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE;
    let committedSteps = 0;
    const rowHeight = HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
    const halfRow = rowHeight / 2;
    while (
      nextOffset <= -halfRow &&
      nextIndex < HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1 &&
      committedSteps < HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS
    ) {
      nextIndex += 1;
      nextOffset += rowHeight;
      committedSteps += 1;
    }
    while (
      nextOffset >= halfRow &&
      nextIndex > 0 &&
      committedSteps < HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS
    ) {
      nextIndex -= 1;
      nextOffset -= rowHeight;
      committedSteps += 1;
    }
    if (nextIndex <= 0 && nextOffset > 0) nextOffset = 0;
    if (nextIndex >= HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1 && nextOffset < 0) nextOffset = 0;

    applyHeatCapacityGuideChecklistView(nextIndex, nextOffset, false);

    if (heatCapacityGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistSnapTimerRef.current);
    }
    heatCapacityGuideChecklistSnapTimerRef.current = window.setTimeout(() => {
      heatCapacityGuideChecklistSnapTimerRef.current = null;
      snapHeatCapacityGuideChecklistView();
    }, HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS);

    if (heatCapacityGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistReturnTimerRef.current);
    }
    heatCapacityGuideChecklistReturnTimerRef.current = window.setTimeout(() => {
      heatCapacityGuideChecklistReturnTimerRef.current = null;
      returnHeatCapacityGuideChecklistToCurrentStep();
    }, HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS);
  };

  const handleHeatCapacityGuideChecklistWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const deltaModeScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
    const normalizedDelta = Math.max(-180, Math.min(180, event.deltaY * deltaModeScale));
    heatCapacityGuideChecklistPendingWheelDeltaRef.current += normalizedDelta;
    if (heatCapacityGuideChecklistFrameRef.current === null) {
      heatCapacityGuideChecklistFrameRef.current = window.requestAnimationFrame(processHeatCapacityGuideChecklistWheelFrame);
    }
  };

  useEffect(() => {
    const nextIndex = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'guide'
      ? getHeatCapacityGuideChecklistIndex(activeHeatCapacityGuideStep)
      : 0;
    heatCapacityGuideChecklistCurrentIndexRef.current = nextIndex;
    heatCapacityGuideChecklistPendingWheelDeltaRef.current = 0;
    if (heatCapacityGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistSnapTimerRef.current);
      heatCapacityGuideChecklistSnapTimerRef.current = null;
    }
    if (heatCapacityGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistReturnTimerRef.current);
      heatCapacityGuideChecklistReturnTimerRef.current = null;
    }
    applyHeatCapacityGuideChecklistView(nextIndex, 0, true);
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeHeatCapacityGuideStep,
  ]);

  useEffect(() => () => {
    clearHeatCapacityGuideChecklistTimers();
  }, []);

  useEffect(() => {
    if (
      activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.heatCapacityGuideWorkflow.step === 'pumpRequired'
    ) {
      guidePumpInputLockedRef.current = false;
      guidePassivePumpTargetNoticeKeyRef.current = null;
    }
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.step : null,
  ]);

  useEffect(() => {
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'guide') return;
    if (activeHeatCapacityGuideStep !== 'closePumpValveRequired') return;
    const focusSession = heatCapacityFocusSessionRef.current;
    if (focusSession?.fileId === activeFile.id && focusSession.mode === 'pump') {
      exitHeatCapacityFocusMode();
    }
    guidePumpInputLockedRef.current = true;
    const noticeKey = `${activeFile.id}:${activeFile.pumpStrokeCount}:close-pump-valve`;
    if (guidePassivePumpTargetNoticeKeyRef.current === noticeKey) return;
    guidePassivePumpTargetNoticeKeyRef.current = noticeKey;
    const guidance = getGuideStepGuidance('closePumpValveRequired', activeFile);
    showGuideHeatCapacityGuidance(guidance.message, guidance.controlId, 'info', 'guide');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.pumpStrokeCount : null,
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    guideHeatCapacityActiveFileId,
  ]);

  useEffect(() => {
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (!isGuideHeatCapacityPauseStep(activeHeatCapacityGuideStep)) return;
    if (heatCapacityRecordToastSequenceActive) return;
    if (isHeatCapacityGuideRecordStep(activeHeatCapacityGuideStep)) {
      clearGuideHeatCapacityGuidance();
    }
    const latestFile = filesRef.current.find((file) => file.id === activeHeatCapacityGuideFileId);
    if (!latestFile || latestFile.kind !== 'heatCapacity') return;
    const guidance = getGuideStepGuidance(activeHeatCapacityGuideStep, latestFile);
    pulseGuideHeatCapacityControl(guidance.controlId);
  }, [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    heatCapacityRecordToastSequenceActive,
    guideHeatCapacityActiveFileId,
    settingsLanguagePreference,
  ]);

  useEffect(() => {
    clearGuideHeatCapacityGuidancePulseTimer();
    if (!activeHeatCapacityGuideFileId) return undefined;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return undefined;
    if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) return undefined;
    if (heatCapacityRecordToastSequenceActive) return undefined;
    if (
      activeHeatCapacityGuideStep === 'idle' ||
      activeHeatCapacityGuideStep === 'stabilizeBeforeReleaseRequired' ||
      activeHeatCapacityGuideStep === 'recoverRequired' ||
      activeHeatCapacityGuideStep === 'completed'
    ) return undefined;
    const guideSessionFileId = activeHeatCapacityGuideFileId;
    guideHeatCapacityGuidancePulseTimerRef.current = window.setInterval(() => {
      const latestFile = filesRef.current.find((file) => file.id === guideSessionFileId);
      if (!latestFile || latestFile.kind !== 'heatCapacity') return;
      if (guideHeatCapacityActiveFileIdRef.current !== guideSessionFileId) return;
      if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) return;
      if (heatCapacityRecordToastSequenceActive) return;
      const latestStep = getHeatCapacityGuideStep(latestFile);
      if (latestStep === 'idle' || latestStep === 'completed') return;
      const guidance = getGuideStepGuidance(latestStep, latestFile);
      pulseGuideHeatCapacityControl(guidance.controlId);
    }, GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS);
    return () => {
      clearGuideHeatCapacityGuidancePulseTimer();
    };
  }, [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    autoDemoRunning,
    autoDemoPaused,
    autoDemoInteractionLocked,
    heatCapacityRecordToastSequenceActive,
    guideHeatCapacityActiveFileId,
    settingsLanguagePreference,
  ]);

  useEffect(() => {
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.id !== activeHeatCapacityGuideFileId) return;
    if (activeFile.heatCapacityMode !== 'guide') return;
    const workflow = activeFile.heatCapacityGuideWorkflow;
    if (!workflow.strongReminderActive || !workflow.strongReminderTargetControlId) return;
    if (heatCapacityRecordToastSequenceActive) return;
    if (
      guideHeatCapacityStrongReminderActive &&
      guideHeatCapacityStrongReminderControlId === workflow.strongReminderTargetControlId
    ) {
      return;
    }
    activateGuideHeatCapacityStrongReminder(workflow.strongReminderTargetControlId);
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.step : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.strongReminderActive : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.strongReminderTargetControlId : null,
    activeHeatCapacityGuideFileId,
    heatCapacityRecordToastSequenceActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
  ]);

  useEffect(() => {
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    const clearStaleStrongReminder = () => {
      setGuideHeatCapacityStrongReminderActive(false);
      setGuideHeatCapacityStrongReminderControlId(null);
      guideHeatCapacityMissCountRef.current = 0;
    };
    if (!activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      return undefined;
    }
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      return undefined;
    }
    if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) {
      clearStaleStrongReminder();
      return undefined;
    }
    if (heatCapacityRecordToastSequenceActive) {
      clearStaleStrongReminder();
      return undefined;
    }
    if (activeFile.kind !== 'heatCapacity' || activeFile.id !== activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      return undefined;
    }
    if (
      activeHeatCapacityGuideStep === 'idle' ||
      activeHeatCapacityGuideStep === 'stabilizeBeforeReleaseRequired' ||
      activeHeatCapacityGuideStep === 'recoverRequired' ||
      activeHeatCapacityGuideStep === 'completed'
    ) {
      clearStaleStrongReminder();
      return undefined;
    }
    const guidance = getGuideStepGuidance(activeHeatCapacityGuideStep, activeFile);
    if (
      guideHeatCapacityStrongReminderActive &&
      guideHeatCapacityStrongReminderControlId === guidance.controlId
    ) return undefined;
    clearStaleStrongReminder();
    const guideSessionFileId = activeHeatCapacityGuideFileId;
    guideHeatCapacityStrongReminderTimerRef.current = window.setTimeout(() => {
      guideHeatCapacityStrongReminderTimerRef.current = null;
      const latestFile = filesRef.current.find((file) => file.id === guideSessionFileId);
      if (!latestFile || latestFile.kind !== 'heatCapacity') return;
      if (guideHeatCapacityActiveFileId !== guideSessionFileId) return;
      if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) return;
      if (heatCapacityRecordToastSequenceActive) return;
      const latestStep = getHeatCapacityGuideStep(latestFile);
      if (latestStep === 'idle' || latestStep === 'completed') return;
      if (latestStep === 'stabilizeBeforeReleaseRequired' || latestStep === 'recoverRequired') return;
      if (isHeatCapacityGuideRecordStep(latestStep) && latestStep !== activeHeatCapacityGuideStep) return;
      const guidance = getGuideStepGuidance(latestStep, latestFile);
      activateGuideHeatCapacityStrongReminder(guidance.controlId);
    }, GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS);
    return () => {
      if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
        window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
        guideHeatCapacityStrongReminderTimerRef.current = null;
      }
    };
  }, [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    autoDemoRunning,
    autoDemoPaused,
    autoDemoInteractionLocked,
    heatCapacityRecordToastSequenceActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
    settingsLanguagePreference,
  ]);

  const restoreGuideHeatCapacitySession = () => {
    const restoreFileId = restoredHeatCapacityGuideStrongReminderFileIdRef.current;
    if (!restoreFileId) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.id !== restoreFileId) return;
    if (guideHeatCapacityActiveFileId !== restoreFileId) return;
    if (activeFile.heatCapacityMode !== 'guide') {
      restoredHeatCapacityGuideStrongReminderFileIdRef.current = null;
      restoredHeatCapacityGuideStrongReminderControlIdRef.current = null;
      return;
    }
    const latestStep = getHeatCapacityGuideStep(activeFile);
    if (latestStep === 'idle' || latestStep === 'completed') {
      restoredHeatCapacityGuideStrongReminderFileIdRef.current = null;
      restoredHeatCapacityGuideStrongReminderControlIdRef.current = null;
      return;
    }
    const guidance = getGuideStepGuidance(latestStep, activeFile);
    const restoredControlId = restoredHeatCapacityGuideStrongReminderControlIdRef.current;
    activateGuideHeatCapacityStrongReminder(restoredControlId ?? guidance.controlId);
    restoredHeatCapacityGuideStrongReminderFileIdRef.current = null;
    restoredHeatCapacityGuideStrongReminderControlIdRef.current = null;
  };

  useEffect(() => {
    restoreGuideHeatCapacitySession();
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeHeatCapacityGuideStep,
    guideHeatCapacityActiveFileId,
    settingsLanguagePreference,
  ]);

  const showHeatCapacityRecordButtonExit = (kind: HeatCapacityGuideRecordKind) => {
    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
    }
    setHeatCapacityRecordControlsClosing(kind);
    heatCapacityRecordControlsClosingTimerRef.current = window.setTimeout(() => {
      heatCapacityRecordControlsClosingTimerRef.current = null;
      setHeatCapacityRecordControlsClosing(null);
    }, 220);
  };

  const recordHeatCapacityGuideSample = (kind: HeatCapacityGuideRecordKind) => {
    if (!activeFile || activeFile.kind !== 'heatCapacity') return;
    const action = kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2';
    if (!guardGuideHeatCapacityAction(action)) return;
    const now = Date.now();
    const currentFile = filesRef.current.find((file) => file.id === activeFile.id);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    if (currentFile.heatCapacityMode === 'guide') {
      const attempt = applyHeatCapacityGuideRecordWorkbenchState(currentFile, kind, now);
      const message = attempt.accepted
        ? getHeatCapacityRecordSuccessToast(kind)
        : attempt.reason;
      updateFileById(currentFile.id, (file) => (
        file.kind === 'heatCapacity' && file.id === currentFile.id
          ? {
              ...attempt.file,
              pumpHint: attempt.accepted ? attempt.file.pumpHint : message,
              updatedAt: now,
            }
          : file
      ));
      if (attempt.accepted) {
        showHeatCapacityRecordButtonExit(kind);
        setHeatCapacityFocusResetKey((key) => key + 1);
        heatCapacityFocusSessionRef.current = null;
        showHeatCapacityRecordSuccessSequence({
          recordMessage: message,
          trialCompleteMessage: null,
        });
        pushLog(message, 'success');
        return;
      }
      showGuideHeatCapacityGuidance(
        message,
        kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2',
        'warning',
        'guide-blocked',
      );
      pushLog(message, 'warning');
      return;
    }
  };

  const recordFreeHeatCapacitySample = (kind: HeatCapacityGuideRecordKind) => {
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const now = Date.now();
    const currentFile = filesRef.current.find((file) => file.id === activeFile.id);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    const attempt = applyHeatCapacityFreeRecordWorkbenchState(
      currentFile,
      kind,
      now,
    );
    const message = attempt.accepted
      ? heatCapacityRealtimeCopy.freeRecordSuccessLog[kind]
      : getHeatCapacityFreeRecordRejectMessage(attempt.reason as HeatCapacityFreeRecordRejectReason, heatCapacityRealtimeCopy);
    collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateFileById(currentFile.id, (file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? {
            ...attempt.file,
            pumpHint: attempt.accepted ? attempt.file.pumpHint : message,
            updatedAt: now,
          }
        : file
    ));
    if (attempt.accepted) {
      markHeatCapacityFocusSessionNonReversible();
      clearGuideHeatCapacityGuidance();
      showGuideHeatCapacityGuidance(message, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'success');
      pushLog(message, 'success');
      return;
    }
    clearGuideHeatCapacityGuidance();
    showGuideHeatCapacityGuidance(message, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'warning', 'guide-blocked');
    pushLog(message, 'warning');
  };

  const requestRemoveHeatCapacityTrialRecord = (
    trialIndex: number,
    kind: HeatCapacityFreeTrialRecordRemovalKind,
  ) => {
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const pendingMatches = pendingRemoveHeatCapacityTrialRecord?.trialIndex === trialIndex &&
      pendingRemoveHeatCapacityTrialRecord.kind === kind;
    const recordLabel = kind === 'u0' ? 'U₀' : kind === 'u1' ? 'U₁' : kind === 'u2' ? 'U₂' : '本组';
    const displayTrialIndex = trialIndex + 1;
    if (!pendingMatches) {
      setPendingRemoveHeatCapacityTrialRecord({ trialIndex, kind });
      pushLog(`${activeFile.name}: 再次点击确认删除第 ${displayTrialIndex} 组${kind === 'trial' ? '' : ` ${recordLabel}`}记录。`, 'warning');
      return;
    }

    captureUndoSnapshot(`removed heat-capacity ${kind} record`);
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      if (file.heatCapacityMode === 'free') {
        return removeHeatCapacityFreeTrialRecordWorkbenchState(file, trialIndex, kind, Date.now());
      }
      return file;
    });
    setPendingRemoveHeatCapacityTrialRecord(null);
    pushLog(`${activeFile.name}: 已删除第 ${displayTrialIndex} 组${kind === 'trial' ? '' : ` ${recordLabel}`}记录。`);
  };

  const updateHeatCapacityPower = (nextPowerOn?: boolean, source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const guardedPowerOn = nextPowerOn ?? (currentFile?.kind === 'heatCapacity' ? !currentFile.powerOn : true);
    if (!guardGuideHeatCapacityAction(guardedPowerOn ? 'turnPowerOn' : 'turnPowerOff', source)) return;
    const shouldShowGuidePowerOffCompletionToast = source === 'user' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'guide' &&
      currentFile.heatCapacityGuideWorkflow.step === 'closePowerRequired' &&
      currentFile.powerOn &&
      guardedPowerOn === false &&
      guideHeatCapacityActiveFileIdRef.current === currentFile.id;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const resolvedPowerOn = nextPowerOn ?? !file.powerOn;
      const cleanFile = file;
      if (resolvedPowerOn && cleanFile.heatCapacityMode === 'demo' && !cleanFile.heatCapacityExperimentProfile) {
        const experimentProfile = createHeatCapacityAutoDemoProfile();
        return powerHeatCapacityWorkbenchFile({
          ...cleanFile,
          heatCapacityExperimentSeed: experimentProfile.seed,
          heatCapacityExperimentProfile: experimentProfile,
        }, resolvedPowerOn, now);
      }
      return powerHeatCapacityWorkbenchFile(cleanFile, resolvedPowerOn, now);
    });
    if (shouldShowGuidePowerOffCompletionToast) {
      showHeatCapacityGuidePowerOffCompletionToast();
      pushLog(heatCapacityRealtimeCopy.finalTrialCompleteToast, 'success');
    }
  };

  const activateHeatCapacityGuideExperiment = (fileId: string, fileName: string) => {
    const now = Date.now();
    clearHeatCapacityPressureAlarmInteractionLock(fileId);
    clearGuideHeatCapacityGuidance();
    setGuideHeatCapacityActiveFileId(fileId);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    updateFileById(fileId, (file) => (
      file.kind === 'heatCapacity'
        ? startHeatCapacityGuideWorkbenchState(file, now)
        : file
    ));
    pushLog(`${fileName}: heat-capacity guide mode reset.`, 'success');
  };

  const startHeatCapacityGuideExperiment = () => {
    if (activeFile.kind !== 'heatCapacity') return;
    const guideFileId = activeFile.id;
    const guideFileName = activeFile.name;
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    resetHeatCapacityGuideUiStateForModeChange();
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    activateHeatCapacityGuideExperiment(guideFileId, guideFileName);
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.guideModeStartingToast, HEAT_CAPACITY_GUIDE_START_NOTICE_MS);
  };

  const exitHeatCapacityGuideMode = () => {
    const guideCompleted = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityTeachingStatus === 'completed';
    resetHeatCapacityModeUiForFreeBase();
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? guideCompleted
        ? exitHeatCapacityTeachingModeWorkbenchState(file, Date.now())
        : abortHeatCapacityGuideWorkbenchState(file, Date.now())
      : file);
    showHeatCapacityAutoDemoCompletionToast(guideCompleted
      ? heatCapacityRealtimeCopy.teachingModeExitedToast
      : heatCapacityRealtimeCopy.guideModeExitedToast);
    pushLog(heatCapacityRealtimeCopy.guideModeExitedLog(activeFile.name), 'warning');
  };

  const exitCompletedHeatCapacityTeachingMode = () => {
    if (activeFile.kind !== 'heatCapacity') return;
    resetHeatCapacityModeUiForFreeBase();
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? exitHeatCapacityTeachingModeWorkbenchState(file, Date.now())
      : file);
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.teachingModeExitedToast);
    pushLog(heatCapacityRealtimeCopy.freeModeActiveLog(activeFile.name), 'info');
  };

  const enterHeatCapacityFreeMode = () => {
    clearHeatCapacityPressureAlarmInteractionLock(activeFile.id);
    resetHeatCapacityModeUiForFreeBase();
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? enterHeatCapacityFreeModeWorkbenchState(file, Date.now())
      : file);
    pushLog(heatCapacityRealtimeCopy.freeModeActiveLog(activeFile.name), 'info');
  };

  const resetHeatCapacityFreeRun = () => {
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const now = Date.now();
    if (heatCapacityFreeResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityFreeResetFeedbackTimerRef.current);
    }
    setHeatCapacityFreeResetFeedbackActive(true);
    heatCapacityFreeResetFeedbackTimerRef.current = window.setTimeout(() => {
      heatCapacityFreeResetFeedbackTimerRef.current = null;
      setHeatCapacityFreeResetFeedbackActive(false);
    }, HEAT_CAPACITY_FREE_RESET_FEEDBACK_MS);
    resetHeatCapacityModeUiForFreeBase();
    clearHeatCapacityPressureAlarmInteractionLock(activeFile.id);
    captureUndoSnapshot('reset heat-capacity free run');
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? resetHeatCapacityFreeRunWorkbenchState(file, now)
      : file);
    pushLog(heatCapacityRealtimeCopy.freeRunResetLog(activeFile.name), 'warning');
  };

  const updateHeatCapacityStopcockOpen = (nextOpen?: boolean, source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const guardedOpen = nextOpen ?? (
      currentFile?.kind === 'heatCapacity'
        ? getHeatCapacityStopcockState(currentFile.stopcockAngleDeg) !== 'open'
        : true
    );
    const stopcockAction = guardedOpen ? 'openStopcock' : 'closeStopcock';
    if (!guardGuideHeatCapacityAction(stopcockAction, source)) return;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const resolvedOpen = nextOpen ?? getHeatCapacityStopcockState(file.stopcockAngleDeg) !== 'open';
      if (file.heatCapacityMode === 'guide') {
        return setHeatCapacityGuideStopcockOpen(file, resolvedOpen, now);
      }
      const stopcockAngleDeg = getHeatCapacityStopcockTargetAngle(resolvedOpen);
      const wasOpen = getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open';
      const stopcockFlowPurpose = getHeatCapacityFreeStopcockFlowPurpose(file, resolvedOpen);
      const pressureReleaseBurstUntilMs = !wasOpen
        ? getHeatCapacityPressureReleaseBurstUntilMs(file, resolvedOpen, now)
        : file.pressureReleaseBurstUntilMs;
      const freeStopcockFlowPatch = isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)
        ? resolvedOpen
          ? {
              heatCapacityFreeStopcockFlowOpen: false,
              heatCapacityFreeStopcockPendingOpenAtMs: now + HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS,
              heatCapacityFreeStopcockFlowPurpose: stopcockFlowPurpose,
            }
          : {
              heatCapacityFreeStopcockFlowOpen: false,
              heatCapacityFreeStopcockPendingOpenAtMs: null,
              heatCapacityFreeStopcockFlowPurpose: 'none' as const,
            }
        : {};
      const isGuideReleaseClosure = source === 'user' &&
        !resolvedOpen &&
        guideHeatCapacityActiveFileId === file.id &&
        getHeatCapacityGuideStep(file) === 'closeStopcockAfterReleaseRequired';
      const isGuideReleaseOpening = source === 'user' &&
        resolvedOpen &&
        guideHeatCapacityActiveFileId === file.id &&
        getHeatCapacityGuideStep(file) === 'openStopcockReleaseRequired';
      const nextFile = stepHeatCapacityWorkbenchFile({
        ...file,
        stopcockAngleDeg,
        glassPistonState: resolvedOpen ? 'open' : 'closed',
        ...freeStopcockFlowPatch,
        pressureReleaseBurstUntilMs: resolvedOpen ? pressureReleaseBurstUntilMs : null,
        pressureDisplayNextJitterAtMs: pressureReleaseBurstUntilMs ? now : file.pressureDisplayNextJitterAtMs,
        updatedAt: now,
      }, now);
      const releaseStartFile = isGuideReleaseOpening
        ? captureHeatCapacityWorkbenchSample(nextFile, 'beforeReleaseSample', now, { applyProfile: false })
        : nextFile;
      const sampledFile = isGuideReleaseClosure
        ? captureHeatCapacityWorkbenchSample(releaseStartFile, 'releaseLowSample', now)
        : releaseStartFile;
      return sampledFile.heatCapacityMode === 'free'
        ? recordHeatCapacityFreeTraceEvent(
            sampledFile,
            resolvedOpen ? 'stopcock-open' : 'stopcock-close',
            now,
            { visualStopcockOpen: resolvedOpen },
          )
        : sampledFile;
    });
  };

  const adjustHeatCapacityPressureZeroFineFromScene = (direction: number, source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    if (!guardGuideHeatCapacityAction('adjustPressureZero', source)) return;
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      return adjustHeatCapacityPressureZeroFine(file, direction, now);
    });
  };

  const adjustHeatCapacityPressureZeroCoarseFromScene = (angleDeltaDeg: number, source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    if (!guardGuideHeatCapacityAction('adjustPressureZero', source)) return;
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      return adjustHeatCapacityPressureZeroCoarse(file, angleDeltaDeg, now);
    });
  };

  const updateHeatCapacityPumpValve = (source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const nextAction = currentFile?.kind === 'heatCapacity' && currentFile.pumpValveOpen ? 'closePumpValve' : 'openPumpValve';
    if (!guardGuideHeatCapacityAction(nextAction, source)) return;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const pumpValveOpen = !file.pumpValveOpen;
      if (file.heatCapacityMode === 'guide') {
        return setHeatCapacityGuidePumpValveOpen(file, pumpValveOpen, now);
      }
      const nextFileBase: WorkbenchHeatCapacityState = {
        ...file,
        pumpValveOpen,
        pumpValveState: pumpValveOpen ? 'open' : 'closed',
        pumpHint: pumpValveOpen ? '打气阀门已打开' : '打气阀门已关闭',
        updatedAt: now,
      };
      const shouldCaptureFreeBeforePump = nextFileBase.heatCapacityMode === 'free' &&
        pumpValveOpen &&
        file.heatCapacityFreePhysicsState.pumpStrokeCount === 0 &&
        file.pumpStrokeCount === 0 &&
        (() => {
          const activeTrialIndex = getActiveHeatCapacityFreeTrialIndex(file);
          return activeTrialIndex >= 0 && Boolean(file.heatCapacityFreeTrials[activeTrialIndex]?.u0);
        })();
      const nextFile: WorkbenchHeatCapacityState = shouldCaptureFreeBeforePump
        ? {
            ...nextFileBase,
            heatCapacityFreeRollbackSnapshots: {
              ...nextFileBase.heatCapacityFreeRollbackSnapshots,
              beforePump: captureHeatCapacityFreeRollbackSnapshot(nextFileBase),
              beforeRelease: null,
            },
          }
        : nextFileBase;
      return nextFile.heatCapacityMode === 'free'
        ? recordHeatCapacityFreeTraceEvent(
            nextFile,
            pumpValveOpen ? 'pump-valve-open' : 'pump-valve-close',
            now,
          )
        : nextFile;
    });
    if (nextAction === 'closePumpValve') {
      clearHeatCapacityToastBySource(isHeatCapacityPressureToast);
    }
  };

  const clearHeatCapacityPumpAnimationTimers = () => {
    const animationTimers = heatCapacityPumpAnimationRef.current;
    if (animationTimers.releaseTimerId !== null) {
      window.clearTimeout(animationTimers.releaseTimerId);
      animationTimers.releaseTimerId = null;
    }
    if (animationTimers.idleTimerId !== null) {
      window.clearTimeout(animationTimers.idleTimerId);
      animationTimers.idleTimerId = null;
    }
  };

  const clearHeatCapacityAutoDemoTimers = () => {
    heatCapacityAutoDemoTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityAutoDemoTimersRef.current = [];
  };

  const showHeatCapacityAutoDemoLockedToast = (message: string = heatCapacityRealtimeCopy.autoDemoLockedToast) => {
    const now = Date.now();
    const lastShown = heatCapacityAutoDemoLockedToastLastShownRef.current;
    if (
      lastShown &&
      lastShown.message === message &&
      now - lastShown.at < HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS
    ) {
      return;
    }
    heatCapacityAutoDemoLockedToastLastShownRef.current = { message, at: now };
    showHeatCapacityToast(message, 'warning');
  };

  const showHeatCapacityTeachingCompletedLockedInteraction = (
    message?: string,
    control?: HeatCapacityLockedControl,
  ) => {
    const fallbackMessage = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'guide'
      ? heatCapacityRealtimeCopy.guideCompletedLockedToast
      : heatCapacityRealtimeCopy.autoDemoCompletedLockedToast;
    const rollbackByControl: Partial<Record<HeatCapacityLockedControl, GuideHeatCapacityRollbackAnimation>> = {
      powerSwitch: 'powerBounce',
      pressureZero: 'knobBounce',
      stopcock: 'stopcockBounce',
      pumpValve: 'valveBounce',
      pumpBulb: 'pumpBulbBounce',
    };
    const rollbackAnimation = control ? rollbackByControl[control] ?? null : null;
    if (rollbackAnimation === 'pumpBulbBounce') setHeatCapacityPumpPulseId((pulseId) => pulseId + 1);
    if (rollbackAnimation) {
      setGuideHeatCapacityRollback({
        animation: rollbackAnimation,
        key: Date.now(),
      });
    }
    showHeatCapacityAutoDemoLockedToast(message ?? fallbackMessage);
  };

  const showHeatCapacityAutoDemoCompletionToast = (message: string = heatCapacityRealtimeCopy.autoDemoCompletionToast, durationMs = 3000) => {
    setAutoDemoCompletionMessage(message);
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
    }
    heatCapacityAutoDemoCompleteToastTimerRef.current = window.setTimeout(() => {
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
      setAutoDemoCompletionMessage(null);
    }, durationMs);
  };

  const showHeatCapacityAutoDemoStepPanel = () => {
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    setAutoDemoStepPanelMode('visible');
  };

  const hideHeatCapacityAutoDemoStepPanel = () => {
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    setAutoDemoStepPanelMode((currentMode) => (currentMode === 'hidden' ? 'hidden' : 'exiting'));
    heatCapacityAutoDemoStepPanelTimerRef.current = window.setTimeout(() => {
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
      setAutoDemoStepPanelMode('hidden');
    }, HEAT_CAPACITY_AUTO_DEMO_STEP_PANEL_EXIT_MS);
  };

  const clearHeatCapacityAutoDemoUiState = () => {
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
    }
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    setAutoDemoRunning(false);
    setAutoDemoPaused(false);
    setAutoDemoInteractionLocked(false);
    setAutoDemoCompletionMessage(null);
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    setAutoDemoStepIndex(0);
    setAutoDemoStepCount(0);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    heatCapacityAutoDemoFileIdRef.current = null;
    heatCapacityAutoDemoPausedFileIdRef.current = null;
    heatCapacityAutoDemoPausedElapsedMsRef.current = 0;
    heatCapacityAutoDemoTimelineRef.current = [];
  };

  const isHeatCapacityUserInteractionLocked = (source: 'user' | 'autoDemo' = 'user') => (
    source !== 'autoDemo' && autoDemoInteractionLocked
  );

  const willHeatCapacityAutoDemoPumpExceedAlarm = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    now: number,
  ) => {
    const projectedFile = registerHeatCapacityPumpStroke(file, now);
    return getGuideHeatCapacityThresholdPressureMv(projectedFile) >= (
      getHeatCapacityPressureThresholdsMv(file).pressureDangerThresholdMv
    );
  };

  const pressHeatCapacityPumpBulb = (
    fileId = activeFileIdRef.current,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    const fileBeforePump = filesRef.current.find((file) => file.id === fileId);
    if (
      source !== 'autoDemo' &&
      fileBeforePump?.kind === 'heatCapacity' &&
      fileBeforePump.heatCapacityMode === 'free' &&
      isHeatCapacityPumpFocusBlockedByAlarm(fileBeforePump)
    ) {
      showHeatCapacityPressureAlarm(fileBeforePump.id, fileBeforePump.name);
      return;
    }
    if (
      source !== 'autoDemo' &&
      fileBeforePump?.kind === 'heatCapacity' &&
      fileBeforePump.heatCapacityMode === 'guide' &&
      fileBeforePump.id === activeFileIdRef.current
    ) {
      if (
        guidePumpInputLockedRef.current ||
        fileBeforePump.heatCapacityGuideWorkflow.step !== 'pumpRequired'
      ) {
        return;
      }
    }
    if (source !== 'autoDemo' && fileId === activeFileIdRef.current && !guardGuideHeatCapacityAction('pumpBulb', source)) return;
    const now = Date.now();
    let nextHeatCapacityFile = fileBeforePump?.kind === 'heatCapacity'
      ? registerHeatCapacityPumpStroke(fileBeforePump, now)
      : null;
    const guidePumpTargetReached = Boolean(
      source !== 'autoDemo' &&
      nextHeatCapacityFile?.kind === 'heatCapacity' &&
      nextHeatCapacityFile.heatCapacityMode === 'guide' &&
      nextHeatCapacityFile.heatCapacityGuideWorkflow.step === 'closePumpValveRequired' &&
      getGuideHeatCapacityDisplayedPressureMv(nextHeatCapacityFile) >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
    );
    if (guidePumpTargetReached) {
      guidePumpInputLockedRef.current = true;
    }
    if (source === 'user' && nextHeatCapacityFile) {
      collapseHeatCapacityFreeParameterSidebarForExperimentAction();
      markHeatCapacityFocusSessionNonReversible();
    }
    const pressureStatusBeforePump = fileBeforePump?.kind === 'heatCapacity'
      ? getHeatCapacityPressureSafetyStatusFromMv(getGuideHeatCapacityThresholdPressureMv(fileBeforePump), fileBeforePump)
      : 'normal';
    if (
      source === 'autoDemo' &&
      nextHeatCapacityFile &&
      getGuideHeatCapacityThresholdPressureMv(nextHeatCapacityFile) >= (
        getHeatCapacityPressureThresholdsMv(nextHeatCapacityFile).pressureDangerThresholdMv
      )
    ) {
      return;
    }
    if (source !== 'autoDemo' && fileBeforePump?.kind === 'heatCapacity') {
      const pressureBeforePumpMv = getGuideHeatCapacityThresholdPressureMv(fileBeforePump);
      if (
        pressureBeforePumpMv >= getHeatCapacityPressureThresholdsMv(fileBeforePump).pressureDangerThresholdMv
      ) {
        showHeatCapacityToast(heatCapacityRealtimeCopy.pressureAlarmMessage, 'danger', {
          interrupt: true,
          priority: HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
          source: 'pressure-alarm',
        });
      }
      const nextFrequencyState = getHeatCapacityPumpFrequencyState(
        [...fileBeforePump.pumpStrokeTimestamps, now],
        now,
      );
      if (
        fileBeforePump.heatCapacityPhase === 'pumping' &&
        nextFrequencyState.timestamps.length >= 2 &&
        nextFrequencyState.pumpFrequencyStatus === 'tooSlow'
      ) {
        showHeatCapacityToast(heatCapacityRealtimeCopy.pumpFrequencySlowToast, 'warning');
      }
    }
    setHeatCapacityPumpPulseId((pulseId) => pulseId + 1);
    clearHeatCapacityPumpAnimationTimers();
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return nextHeatCapacityFile;
    });
    if (source !== 'autoDemo' && nextHeatCapacityFile && !guidePumpTargetReached) {
      const pressureAfterPumpMv = getGuideHeatCapacityThresholdPressureMv(nextHeatCapacityFile);
      const pressureStatusAfterPump = getHeatCapacityPressureSafetyStatusFromMv(pressureAfterPumpMv, nextHeatCapacityFile);
      if (pressureStatusAfterPump === 'danger' && pressureStatusBeforePump !== 'danger') {
        showHeatCapacityPressureAlarm(nextHeatCapacityFile.id, nextHeatCapacityFile.name);
      } else if (pressureStatusAfterPump === 'warning') {
        showHeatCapacityToast(heatCapacityRealtimeCopy.pressureWarningMessage, 'info', {
          interrupt: true,
          priority: HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,
          source: 'pressure-warning',
        });
      } else if (pressureStatusAfterPump === 'danger') {
        showHeatCapacityPressureThresholdToast(pressureAfterPumpMv, nextHeatCapacityFile);
      }
    }
    if (guidePumpTargetReached && nextHeatCapacityFile) {
      exitHeatCapacityFocusMode();
      const guidance = getGuideStepGuidance('closePumpValveRequired', nextHeatCapacityFile);
      showGuideHeatCapacityGuidance(guidance.message, 'pumpValve', 'info', 'guide');
    }
    heatCapacityPumpAnimationRef.current.releaseTimerId = window.setTimeout(() => {
      heatCapacityPumpAnimationRef.current.releaseTimerId = null;
      updateFileById(fileId, (file) => file.kind === 'heatCapacity'
        ? { ...file, pumpBulbState: 'releasing', updatedAt: Date.now() }
        : file);
    }, 120);
    heatCapacityPumpAnimationRef.current.idleTimerId = window.setTimeout(() => {
      heatCapacityPumpAnimationRef.current.idleTimerId = null;
      updateFileById(fileId, (file) => file.kind === 'heatCapacity'
        ? refreshHeatCapacityPumpFrequency({ ...file, pumpBulbState: 'idle' }, Date.now())
        : file);
    }, 360);
  };

  const setHeatCapacityStopcockOpenByFileId = (
    fileId: string,
    nextOpen: boolean,
  ) => {
    const now = Date.now();
    const stopcockAngleDeg = getHeatCapacityStopcockTargetAngle(nextOpen);
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      const wasOpen = getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open';
      const stopcockFlowPurpose = getHeatCapacityFreeStopcockFlowPurpose(file, nextOpen);
      const pressureReleaseBurstUntilMs = !wasOpen
        ? getHeatCapacityPressureReleaseBurstUntilMs(file, nextOpen, now)
        : file.pressureReleaseBurstUntilMs;
      const freeStopcockFlowPatch = isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)
        ? nextOpen
          ? {
              heatCapacityFreeStopcockFlowOpen: false,
              heatCapacityFreeStopcockPendingOpenAtMs: now + HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS,
              heatCapacityFreeStopcockFlowPurpose: stopcockFlowPurpose,
            }
          : {
              heatCapacityFreeStopcockFlowOpen: false,
              heatCapacityFreeStopcockPendingOpenAtMs: null,
              heatCapacityFreeStopcockFlowPurpose: 'none' as const,
            }
        : {};
      return stepHeatCapacityWorkbenchFile({
        ...file,
        stopcockAngleDeg,
        glassPistonState: nextOpen ? 'open' : 'closed',
        ...freeStopcockFlowPatch,
        pressureReleaseBurstUntilMs: nextOpen ? pressureReleaseBurstUntilMs : null,
        pressureDisplayNextJitterAtMs: pressureReleaseBurstUntilMs ? now : file.pressureDisplayNextJitterAtMs,
        updatedAt: now,
      }, now);
    });
  };

  const commitHeatCapacityAutoDemoPressureZero = (fileId: string) => {
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const targetOffset = -(file.pressureSignalMvRaw + file.pressureInitialBiasMv);
      const targetKnobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(targetOffset);
      const zeroedFile = setHeatCapacityPressureZeroOffset(file, targetOffset, 'fineWheel', targetKnobAngle, now);
      const zeroPressureValue = zeroedFile.pressureSignalMv ?? 0;
      const pressureZeroDisplayedSamples = Array.from({ length: 5 }, (_item, index) => ({
        atMs: now - (4 - index) * 100,
        valueMv: zeroPressureValue,
      }));
      return {
        ...zeroedFile,
        pressureZeroDisplayedSamples,
        pressureZeroed: isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples),
      };
    });
  };

  const commitHeatCapacityAutoDemoDefaultReset = (fileId: string) => {
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const targetStopcockAngle = getHeatCapacityStopcockTargetAngle(false);
      return setHeatCapacityPressureZeroOffset({
        ...file,
        powerOn: false,
        runState: 'running',
        glassPistonState: getHeatCapacityStopcockState(targetStopcockAngle),
        stopcockAngleDeg: targetStopcockAngle,
        pumpValveOpen: false,
        pumpValveState: 'closed',
        pumpBulbState: 'idle',
        pumpStrokeTimestamps: [],
        pumpFrequency: 0,
        pumpFrequencyStatus: 'idle',
        lastPumpTime: null,
        pumpHint: heatCapacityRealtimeCopy.autoDemoPreparingHint,
        updatedAt: now,
      }, 0, 'none', 0, now);
    });
  };

  const applyHeatCapacityAutoDemoAction = (
    fileId: string,
    action: HeatCapacityAutoDemoAction,
    sampleKey?: Parameters<typeof captureHeatCapacityWorkbenchSample>[1],
  ) => {
    const now = Date.now();
    if (action === 'pumpStroke') {
      pressHeatCapacityPumpBulb(fileId, 'autoDemo');
      return;
    }

    if (action === 'closeStopcockForPumping' || action === 'closeStopcockForRecovery') {
      setHeatCapacityStopcockOpenByFileId(fileId, false);
      return;
    }

    if (action === 'openStopcockForRelease' || action === 'openStopcockForZero') {
      setHeatCapacityStopcockOpenByFileId(fileId, true);
      return;
    }

    if (action === 'zeroPressure') {
      commitHeatCapacityAutoDemoPressureZero(fileId);
      return;
    }

    if (action === 'captureSample' && sampleKey === 'zeroedSample') {
      const latestFile = filesRef.current.find((file) => file.id === fileId);
      if (
        !latestFile ||
        latestFile.kind !== 'heatCapacity' ||
        heatCapacityAutoDemoFileIdRef.current !== fileId
      ) {
        return;
      }
      if (!isGuideU0ZeroReady(latestFile)) {
        const retryTimer = window.setTimeout(() => {
          heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== retryTimer);
          applyHeatCapacityAutoDemoAction(fileId, 'captureSample', 'zeroedSample');
        }, 180);
        heatCapacityAutoDemoTimersRef.current.push(retryTimer);
        return;
      }
    }

    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;

      if (action === 'powerOn') {
        return prepareHeatCapacityAutoDemoStart(file, now);
      }

      if (action === 'openPumpValve') {
        return {
          ...file,
          pumpValveOpen: true,
          pumpValveState: 'open',
          pumpHint: '打气阀门已打开',
          updatedAt: now,
        };
      }

      if (action === 'closePumpValve') {
        return {
          ...file,
          pumpValveOpen: false,
          pumpValveState: 'closed',
          pumpHint: '打气阀门已关闭',
          updatedAt: now,
        };
      }

      if (action === 'captureSample' && sampleKey) {
        return captureHeatCapacityWorkbenchSample(file, sampleKey, now);
      }

      if (action === 'observeInitialPressure') {
        return {
          ...file,
          pumpHint: '观察初始压强差示数是否为零',
          updatedAt: now,
        };
      }

      if (action === 'powerOff') {
        return {
          ...powerHeatCapacityWorkbenchFile(file, false, now),
          runState: 'running' as const,
          pumpHint: heatCapacityRealtimeCopy.autoDemoReadyToCompleteHint,
        };
      }

      if (action === 'completeTeachingMode') {
        const completedFile = completeHeatCapacityTeachingModeWorkbenchState(file, now);
        window.setTimeout(() => {
          pushLog(heatCapacityRealtimeCopy.autoDemoImportedCompleteLog(completedFile.name), 'success');
        }, 0);
        return {
          ...completedFile,
          heatCapacityMaterialsExpanded: true,
          updatedAt: now,
        };
      }

      return file;
    });
  };

  const setHeatCapacityAutoDemoStepState = (
    step: HeatCapacityAutoDemoStep,
    stepIndex: number,
    stage: HeatCapacityAutoDemoTimelineItem['stage'],
    focusControlId?: HeatCapacityAutoDemoTimelineItem['focusControlId'],
  ) => {
    showHeatCapacityAutoDemoStepPanel();
    setAutoDemoStepIndex(stepIndex + 1);
    setAutoDemoStepTitle(step.title);
    setAutoDemoStepDescription(stage === 'preview'
      ? `下一步：${step.description}`
      : stage === 'highlight'
      ? `即将操作：${step.description}`
      : stage === 'action'
        ? step.description
        : `观察：${step.note}`);
    setAutoDemoStepTarget(step.target);
    setAutoDemoStepProgressCriterion(step.progressCriterion);
    setAutoDemoStepNote(step.note);
    const nextFocusControlId = focusControlId ?? step.targetControlId ?? null;
    setDemoFocusControlId(stage === 'highlight' ? nextFocusControlId : null);
    setDemoFocusPulseActive(stage === 'highlight' && Boolean(nextFocusControlId));
  };

  const finishHeatCapacityAutoDemoUi = (message: string = heatCapacityRealtimeCopy.autoDemoCompletionToast) => {
    clearHeatCapacityAutoDemoTimers();
    setAutoDemoRunning(false);
    setAutoDemoPaused(false);
    setAutoDemoInteractionLocked(false);
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    hideHeatCapacityAutoDemoStepPanel();
    showHeatCapacityAutoDemoCompletionToast(message);
  };

  const scheduleHeatCapacityAutoDemoTimeline = (
    demoFileId: string,
    timeline: HeatCapacityAutoDemoTimelineItem[],
    startFromElapsedMs = 0,
    initialDelayMs = 0,
  ) => {
    heatCapacityAutoDemoStartedAtMsRef.current = performance.now() + initialDelayMs - startFromElapsedMs;
    heatCapacityAutoDemoFileIdRef.current = demoFileId;
    heatCapacityAutoDemoTimelineRef.current = timeline;

    timeline.forEach((timelineItem) => {
      if (timelineItem.atMs < startFromElapsedMs) return;
      const timerId = window.setTimeout(() => {
        setHeatCapacityAutoDemoStepState(
          timelineItem.step,
          timelineItem.stepIndex,
          timelineItem.stage,
          timelineItem.focusControlId,
        );
        if (timelineItem.stage === 'preview') {
          setDemoFocusPulseActive(false);
        }
        if (timelineItem.stage === 'action' && timelineItem.action) {
          applyHeatCapacityAutoDemoAction(demoFileId, timelineItem.action.action, timelineItem.action.sampleKey);
          if (timelineItem.action.action === 'completeTeachingMode') {
            setSelectedPanel('heatCapacityRecords');
            finishHeatCapacityAutoDemoUi();
          }
        }
        if (timelineItem.stage !== 'highlight') setDemoFocusPulseActive(false);
        heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== timerId);
      }, initialDelayMs + timelineItem.atMs - startFromElapsedMs);
      heatCapacityAutoDemoTimersRef.current.push(timerId);
    });
  };

  const runHeatCapacityAutoDemo = () => {
    if (activeFile.kind !== 'heatCapacity') return;
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();

    if (autoDemoPaused && activeFile.runState === 'paused' && heatCapacityAutoDemoPausedFileIdRef.current === activeFile.id) {
      clearHeatCapacityAutoDemoTimers();
      showHeatCapacityAutoDemoStepPanel();
      setAutoDemoRunning(true);
      setAutoDemoPaused(false);
      setAutoDemoInteractionLocked(true);
      updateActiveFile((file) => file.kind === 'heatCapacity'
        ? { ...file, runState: 'running', updatedAt: Date.now() }
        : file);
      scheduleHeatCapacityAutoDemoTimeline(
        activeFile.id,
        heatCapacityAutoDemoTimelineRef.current,
        heatCapacityAutoDemoPausedElapsedMsRef.current,
      );
      pushLog(heatCapacityRealtimeCopy.autoDemoResumedLog(activeFile.name), 'success');
      return;
    }

    if (autoDemoRunning || activeFile.runState === 'running') {
      pushLog(heatCapacityRealtimeCopy.autoDemoRunningLog(activeFile.name), 'warning');
      return;
    }

    clearHeatCapacityAutoDemoTimers();
    clearGuideHeatCapacityGuidance();
    setGuideHeatCapacityActiveFileId(null);
    const demoFileId = activeFile.id;
    clearHeatCapacityPressureAlarmInteractionLock(demoFileId);
    const steps = createHeatCapacityAutoDemoSteps();
  const timeline = getHeatCapacityAutoDemoTimeline(steps);
  setHeatCapacityFocusResetKey((key) => key + 1);
  setHeatCapacityHardSphereVisualResetKey((key) => key + 1);
  heatCapacityFocusSessionRef.current = null;
  heatCapacityAutoDemoPausedElapsedMsRef.current = 0;
    heatCapacityAutoDemoPausedFileIdRef.current = null;
    const now = Date.now();
    updateFileById(demoFileId, (file) => file.kind === 'heatCapacity'
      ? {
          ...file,
          heatCapacityMode: 'demo',
          powerOn: false,
          runState: 'running',
          pumpValveOpen: false,
          pumpValveState: 'closed',
          pumpBulbState: 'idle',
          pumpHint: heatCapacityRealtimeCopy.autoDemoPreparingHint,
          updatedAt: now,
        }
      : file);
    showHeatCapacityAutoDemoStepPanel();
    setAutoDemoRunning(true);
    setAutoDemoPaused(false);
    setAutoDemoInteractionLocked(true);
    setAutoDemoStepCount(steps.length);
    setAutoDemoStepIndex(0);
    setAutoDemoStepTitle(heatCapacityRealtimeCopy.autoDemoPreparingTitle);
    setAutoDemoStepDescription(heatCapacityRealtimeCopy.autoDemoInitializingDescription);
    setAutoDemoStepTarget(heatCapacityRealtimeCopy.autoDemoPreparingTarget);
    setAutoDemoStepProgressCriterion(heatCapacityRealtimeCopy.autoDemoPreparingProgress);
    setAutoDemoStepNote(heatCapacityRealtimeCopy.autoDemoPreparingNote);
    clearHeatCapacityToastQueue();
    setAutoDemoCompletionMessage(null);
    setSelectedPanel('preview');
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.autoDemoInitializingToast, HEAT_CAPACITY_AUTO_DEMO_RESET_MS);
    commitHeatCapacityAutoDemoDefaultReset(demoFileId);
    scheduleHeatCapacityAutoDemoTimeline(demoFileId, timeline, 0, HEAT_CAPACITY_AUTO_DEMO_RESET_MS);
    pushLog(heatCapacityRealtimeCopy.autoDemoStartedLog(activeFile.name), 'success');
  };

  const createEditSnapshot = (label: string): WorkbenchEditSnapshot => ({
    label,
    files: cloneWorkbenchFiles(filesRef.current),
    activeFileId: activeFileIdRef.current,
    selectedPanel,
    workbenchLayoutDefaults: sanitizeWorkbenchLayoutDefaults(workbenchLayoutDefaults),
  });

  const reconcileRuntimesAfterRestore = (restoredFiles: WorkbenchFileState[]) => {
    Object.keys(standardRuntimeRef.current).forEach((fileId) => {
      cancelRuntimeFrame(fileId);
    });
    Object.keys(idealRuntimeRef.current).forEach((fileId) => {
      cancelRuntimeFrame(fileId);
    });
    standardRuntimeRef.current = {};
    idealRuntimeRef.current = {};

    restoredFiles.forEach((file) => {
      if (file.kind === 'standard') {
        const runtime = createStandardRuntime(file);
        if (runtime) {
          standardRuntimeRef.current[file.id] = runtime;
        }
        return;
      }

      if (file.kind === 'heatCapacity') return;

      const runtime = createIdealRuntime(file);
      if (runtime) {
        idealRuntimeRef.current[file.id] = runtime;
      }
    });
  };

  const restoreSnapshot = (snapshot: WorkbenchEditSnapshot) => {
    const restoredFiles = cloneWorkbenchFiles(snapshot.files).map((file) => (
      file.runState === 'running'
        ? { ...file, runState: 'paused' as const }
        : file
    ));
    const activeExists = restoredFiles.some((file) => file.id === snapshot.activeFileId);
    const nextActiveFileId = activeExists ? snapshot.activeFileId : restoredFiles[0]?.id ?? '';

    reconcileRuntimesAfterRestore(restoredFiles);
    setWorkbenchFiles(() => restoredFiles);
    setActiveFileId(nextActiveFileId);
    activeFileIdRef.current = nextActiveFileId;
    setSelectedPanel(snapshot.selectedPanel);
    setParametersCollapsed(restoredFiles.find((file) => file.id === nextActiveFileId)?.kind === 'heatCapacity');
    setWorkbenchLayoutDefaults(snapshot.workbenchLayoutDefaults);
    persistWorkbenchLayoutDefaults(snapshot.workbenchLayoutDefaults);
    setParameterInputDrafts({});
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setRenameDraft('');
    setOpenTopMenu(null);
  };

  const pushUndoSnapshot = (snapshot: WorkbenchEditSnapshot) => {
    setUndoStack((current) => [...current, snapshot].slice(-EDIT_HISTORY_LIMIT));
    setRedoStack([]);
  };

  const captureUndoSnapshot = (label: string) => {
    pushUndoSnapshot(createEditSnapshot(label));
  };

  const undoLastEdit = () => {
    const snapshot = undoStack[undoStack.length - 1];
    if (!snapshot) return;

    const currentSnapshot = createEditSnapshot(snapshot.label);
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, currentSnapshot].slice(-EDIT_HISTORY_LIMIT));
    restoreSnapshot(snapshot);
    pushLog(workbenchCopy.logs.undoAction(snapshot.label), 'warning');
  };

  const redoLastEdit = () => {
    const snapshot = redoStack[redoStack.length - 1];
    if (!snapshot) return;

    const currentSnapshot = createEditSnapshot(snapshot.label);
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, currentSnapshot].slice(-EDIT_HISTORY_LIMIT));
    restoreSnapshot(snapshot);
    pushLog(workbenchCopy.logs.redoAction(snapshot.label), 'success');
  };

  const clearEditHistory = () => {
    setUndoStack([]);
    setRedoStack([]);
    setOpenTopMenu(null);
    pushLog(workbenchCopy.logs.editHistoryCleared, 'warning');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isEditableElement(event.target) || isEditableElement(document.activeElement)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey && undoStack.length > 0) {
        event.preventDefault();
        undoLastEdit();
        return;
      }

      if ((key === 'y' || (key === 'z' && event.shiftKey)) && redoStack.length > 0) {
        event.preventDefault();
        redoLastEdit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoStack, redoStack, selectedPanel]);

  const startSidebarResize = (side: 'left' | 'params', event: React.MouseEvent) => {
    if (openTopMenu) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = side === 'left' ? leftSidebarWidth : parameterSidebarWidth;
    const workspaceShellWidth = workspaceShellRef.current?.getBoundingClientRect().width ?? 0;
    let pendingSidebarWidth = startWidth;
    let didResize = false;

    const updateSidebarGhost = () => {
      if (side === 'left') {
        sidebarResizeGhostRef.current?.style.setProperty('--studio-left-resize-ghost-x', `${pendingSidebarWidth}px`);
        return;
      }
      parameterSidebarResizeGhostRef.current?.style.setProperty(
        '--studio-params-resize-ghost-x',
        `${Math.max(0, workspaceShellWidth - pendingSidebarWidth)}px`,
      );
    };
    updateSidebarGhost();

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      pendingSidebarWidth = side === 'left'
        ? clamp(startWidth + delta, LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX)
        : clamp(startWidth - delta, PARAM_SIDEBAR_MIN, PARAM_SIDEBAR_MAX);
      didResize = true;
      scheduleResizeGhostUpdate(updateSidebarGhost);
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      document.body.classList.remove('studio-resizing');
      workbenchBodyRef.current?.classList.remove('studio-left-sidebar-resizing');
      workspaceShellRef.current?.classList.remove('studio-params-sidebar-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (commit && didResize) {
        if (side === 'left') {
          setLeftSidebarWidth(pendingSidebarWidth);
        } else {
          setParameterSidebarWidth(pendingSidebarWidth);
        }
      }
    };

    const handleUp = () => finishResize(true);

    document.body.classList.add('studio-resizing');
    if (side === 'left') {
      workbenchBodyRef.current?.classList.add('studio-left-sidebar-resizing');
    } else {
      workspaceShellRef.current?.classList.add('studio-params-sidebar-resizing');
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startIdealResultWindowResize = (event: React.MouseEvent) => {
    if (activeFile.kind !== 'ideal') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = idealResultWindowRegionRef.current?.getBoundingClientRect().height
      ?? centerWorkspaceRef.current?.getBoundingClientRect().height
      ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized ideal result window');
    const startY = event.clientY;
    const startRatio = activeFile.idealWindowLayout.heightRatio;
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = startRatio + deltaRatio;
      const clampedRatio = clamp(nextRatio, IDEAL_RESULT_MIN_HEIGHT_RATIO, IDEAL_RESULT_MAX_HEIGHT_RATIO);
      didResize = true;
      updateActiveFile((file) => {
        if (file.kind !== 'ideal') return file;
        return {
          ...file,
          idealWindowLayout: {
            ...file.idealWindowLayout,
            heightRatio: clampedRatio,
            hasCustomHeight: true,
          },
          updatedAt: Date.now(),
        };
      });
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) {
        pushUndoSnapshot(snapshot);
      }
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const getStandardResultsMaxHeightRatio = () => {
    const workspaceRect = centerWorkspaceRef.current?.getBoundingClientRect();
    const fileTabsRect = fileTabsRef.current?.getBoundingClientRect();
    if (!workspaceRect || workspaceRect.height <= 0) return IDEAL_RESULT_MAX_HEIGHT_RATIO;

    const fileTabOverlap = fileTabsRect
      ? Math.max(0, fileTabsRect.bottom - workspaceRect.top)
      : 0;
    const reservedTopSpace = Math.max(RESIZER_GRAB_SAFE_SPACE, fileTabOverlap + RESIZER_GRAB_SAFE_SPACE);
    const availableHeight = workspaceRect.height - STANDARD_RESULTS_BOTTOM_INSET - reservedTopSpace;
    return clamp(
      availableHeight / workspaceRect.height,
      IDEAL_RESULT_MIN_HEIGHT_RATIO,
      IDEAL_RESULT_MAX_HEIGHT_RATIO,
    );
  };

  const getHeatCapacityMaterialsMaxHeightRatio = () => {
    const workspaceRect = centerWorkspaceRef.current?.getBoundingClientRect();
    const fileTabsRect = fileTabsRef.current?.getBoundingClientRect();
    if (!workspaceRect || workspaceRect.height <= 0) return IDEAL_RESULT_MAX_HEIGHT_RATIO;

    const fileTabOverlap = fileTabsRect
      ? Math.max(0, fileTabsRect.bottom - workspaceRect.top)
      : 0;
    const reservedTopSpace = Math.max(RESIZER_GRAB_SAFE_SPACE, fileTabOverlap + RESIZER_GRAB_SAFE_SPACE);
    const availableHeight = workspaceRect.height - STANDARD_RESULTS_BOTTOM_INSET - reservedTopSpace;
    return clamp(
      availableHeight / workspaceRect.height,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      IDEAL_RESULT_MAX_HEIGHT_RATIO,
    );
  };

  const startStandardResultsResize = (event: React.MouseEvent) => {
    if (activeFile.kind !== 'standard') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = centerWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized standard Results window');
    const startY = event.clientY;
    const startRatio = normalizeStandardResultsLayout(activeFile.standardResultsLayout).heightRatio;
    const maxHeightRatio = getStandardResultsMaxHeightRatio();
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = startRatio + deltaRatio;
      didResize = true;
      updateActiveFile((file) => {
        if (file.kind !== 'standard') return file;
        return {
          ...file,
          standardResultsLayout: {
            ...normalizeStandardResultsLayout(file.standardResultsLayout),
            heightRatio: clamp(nextRatio, IDEAL_RESULT_MIN_HEIGHT_RATIO, maxHeightRatio),
          },
          updatedAt: Date.now(),
        };
      });
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) {
        pushUndoSnapshot(snapshot);
      }
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startHeatCapacityMaterialsResize = (event: React.MouseEvent) => {
    if (activeFile.kind !== 'heatCapacity') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = centerWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized heat-capacity materials window');
    const startY = event.clientY;
    const maxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio();
    const startRatio = clamp(
      activeFile.heatCapacityTabContainerHeight || 0.5,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      maxHeightRatio,
    );
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = clamp(
        startRatio + deltaRatio,
        HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
        maxHeightRatio,
      );
      didResize = true;
      updateActiveFile((file) => (
        file.kind === 'heatCapacity'
          ? { ...file, heatCapacityTabContainerHeight: nextRatio, updatedAt: Date.now() }
          : file
      ));
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) pushUndoSnapshot(snapshot);
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const cancelResizeGhostFrame = () => {
    if (resizeGhostFrameRef.current === null) return;
    window.cancelAnimationFrame(resizeGhostFrameRef.current);
    resizeGhostFrameRef.current = null;
  };

  const scheduleResizeGhostUpdate = (updateGhost: () => void) => {
    cancelResizeGhostFrame();
    resizeGhostFrameRef.current = window.requestAnimationFrame(() => {
      resizeGhostFrameRef.current = null;
      updateGhost();
    });
  };

  const startLiveWorkspaceResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (isWorkbenchEmpty) return;
    const workspace = liveWorkspaceRef.current ?? event.currentTarget.parentElement;
    if (!workspace) return;

    event.preventDefault();
    event.stopPropagation();

    const initialWorkspaceRect = workspace.getBoundingClientRect();
    const resizerWidth = event.currentTarget.getBoundingClientRect().width || 8;
    if (initialWorkspaceRect.width <= resizerWidth) return;

    const getNextRatio = (clientX: number) => {
      const workspaceRect = workspace.getBoundingClientRect();
      const availableWidth = workspaceRect.width - resizerWidth;
      if (availableWidth <= 0) return clampWorkbenchLiveSplitRatio(activeFile.liveWorkspaceSplitRatio);
      return clamp(
        (clientX - workspaceRect.left - resizerWidth / 2) / availableWidth,
        WORKBENCH_LIVE_SPLIT_MIN_RATIO,
        WORKBENCH_LIVE_SPLIT_MAX_RATIO,
      );
    };

    let pendingLiveWorkspaceSplitRatio = liveWorkspaceSplitRatio;
    let didResize = false;
    liveWorkspaceResizeGhostRef.current?.style.setProperty(
      '--studio-live-resize-ghost-x',
      `${(pendingLiveWorkspaceSplitRatio * 100).toFixed(3)}%`,
    );

    const handleMove = (moveEvent: PointerEvent) => {
      pendingLiveWorkspaceSplitRatio = getNextRatio(moveEvent.clientX);
      didResize = true;
      scheduleResizeGhostUpdate(() => {
        liveWorkspaceResizeGhostRef.current?.style.setProperty(
          '--studio-live-resize-ghost-x',
          `${(pendingLiveWorkspaceSplitRatio * 100).toFixed(3)}%`,
        );
      });
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      setLiveWorkspaceResizing(false);
      document.body.classList.remove('studio-horizontal-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      if (commit && didResize) {
        updateActiveFile((file) => ({
          ...file,
          liveWorkspaceSplitRatio: pendingLiveWorkspaceSplitRatio,
          updatedAt: Date.now(),
        }));
      }
    };
    const handleUp = () => finishResize(true);
    const handleCancel = () => finishResize(false);

    setLiveWorkspaceResizing(true);
    document.body.classList.add('studio-horizontal-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  };

  const startConsoleResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (consoleCollapsed) return;
    event.preventDefault();
    event.stopPropagation();
    const shellRect = shellRef.current?.getBoundingClientRect();
    const consoleRect = event.currentTarget.parentElement?.getBoundingClientRect();
    const shellHeight = shellRect?.height ?? window.innerHeight;
    const footerHeight = shellRect && consoleRect ? Math.max(0, shellRect.bottom - consoleRect.bottom) : 24;
    consoleResizeRef.current = {
      startY: event.clientY,
      startHeight: consoleHeightPx,
      shellHeight,
      footerHeight,
    };
    let pendingConsoleHeightPx = consoleHeightPx;
    let didResize = false;
    shellRef.current?.classList.add('studio-console-resizing');
    consoleResizeGhostRef.current?.style.setProperty(
      '--studio-console-resize-ghost-y',
      `${shellHeight - footerHeight - pendingConsoleHeightPx}px`,
    );

    const handleMove = (moveEvent: PointerEvent) => {
      const resizeState = consoleResizeRef.current;
      if (!resizeState) return;
      const maxHeight = Math.max(180, Math.min(420, Math.round(window.innerHeight * 0.48)));
      pendingConsoleHeightPx = clamp(resizeState.startHeight + resizeState.startY - moveEvent.clientY, 96, maxHeight);
      didResize = true;
      scheduleResizeGhostUpdate(() => {
        consoleResizeGhostRef.current?.style.setProperty(
          '--studio-console-resize-ghost-y',
          `${resizeState.shellHeight - resizeState.footerHeight - pendingConsoleHeightPx}px`,
        );
      });
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      consoleResizeRef.current = null;
      shellRef.current?.classList.remove('studio-console-resizing');
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      if (commit && didResize) {
        setConsoleHeightPx(pendingConsoleHeightPx);
      }
    };
    const handleUp = () => finishResize(true);
    const handleCancel = () => finishResize(false);

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  };

  const saveCurrentWorkbenchLayoutAsDefault = () => {
    if (isWorkbenchEmpty) {
      pushLog(workbenchCopy.logs.layoutSaveNeedsFile, 'warning');
      return;
    }

    const nextFileDefaults = sanitizeWorkbenchLayoutDefaultState({
      resultsHeightRatio: activeFile.kind === 'ideal'
        ? normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal).heightRatio
        : activeFile.kind === 'standard'
          ? normalizeStandardResultsLayout(activeFile.standardResultsLayout, workbenchLayoutDefaults.standard).heightRatio
          : workbenchLayoutDefaults.heatCapacity.resultsHeightRatio,
      liveWorkspaceSplitRatio: activeFile.liveWorkspaceSplitRatio,
    });
    const nextDefaults = sanitizeWorkbenchLayoutDefaults({
      ...workbenchLayoutDefaults,
      [activeFile.kind]: nextFileDefaults,
    });

    setWorkbenchLayoutDefaults(nextDefaults);
    persistWorkbenchLayoutDefaults(nextDefaults);
    setOpenTopMenu(null);
    pushLog(workbenchCopy.logs.layoutDefaultSaved(activeFile.name), 'success');
  };

  const cancelRuntimeFrame = (fileId: string) => {
    const runtime = standardRuntimeRef.current[fileId] ?? idealRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId === null) return;

    window.clearTimeout(runtime.simulationTimerId);
    runtime.simulationTimerId = null;
  };

  const createHardSphereEngine = (
    params: SimulationParams,
    snapshot: PhysicsEngineSnapshotV1 | null,
  ): PhysicsEngine => (
    snapshot && areWorkbenchParamsEqual(snapshot.params, params)
      ? PhysicsEngine.fromSnapshot(snapshot)
      : new PhysicsEngine(cloneParams(params))
  );

  const createStandardRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'standard') return null;
    return {
      engine: createHardSphereEngine(file.appliedParams, file.hardSphereEngineSnapshot),
      frameCount: 0,
      simulationTimerId: null,
    };
  };

  const createIdealRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'ideal') return null;

    return {
      engine: createHardSphereEngine(file.activeParams, file.hardSphereEngineSnapshot),
      frameCount: 0,
      simulationTimerId: null,
    };
  };

  const prepareReopenedWorkbenchFile = (file: WorkbenchFileState): WorkbenchFileState => {
    const baseFile = {
      ...file,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };

    if (baseFile.kind !== 'standard' && baseFile.kind !== 'ideal') {
      return baseFile;
    }

    const runtime = baseFile.kind === 'standard'
      ? createStandardRuntime(baseFile)
      : createIdealRuntime(baseFile);
    if (!runtime) return baseFile;

    if (baseFile.kind === 'standard') {
      standardRuntimeRef.current[baseFile.id] = runtime;
    } else {
      idealRuntimeRef.current[baseFile.id] = runtime;
    }

    return {
      ...baseFile,
      stats: runtime.engine.getStats(),
      chartData: runtime.engine.getHistogramData(false),
      particles: snapshotParticles(runtime.engine),
      hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
      ...(baseFile.kind === 'ideal' ? { latestPressureSummary: runtime.engine.getPressureMeasurementSummary() } : {}),
    };
  };

  const getStandardRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'standard') return null;

    const existingRuntime = standardRuntimeRef.current[file.id];
    if (existingRuntime && areWorkbenchParamsEqual(existingRuntime.engine.params, file.appliedParams)) {
      return existingRuntime;
    }

    cancelRuntimeFrame(file.id);
    const nextRuntime = createStandardRuntime(file);
    if (nextRuntime) {
      standardRuntimeRef.current[file.id] = nextRuntime;
    }
    return nextRuntime;
  };

  const getIdealRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'ideal') return null;

    const existingRuntime = idealRuntimeRef.current[file.id];
    if (existingRuntime && areWorkbenchParamsEqual(existingRuntime.engine.params, file.activeParams)) {
      return existingRuntime;
    }

    cancelRuntimeFrame(file.id);
    const nextRuntime = createIdealRuntime(file);
    if (nextRuntime) {
      idealRuntimeRef.current[file.id] = nextRuntime;
    }
    return nextRuntime;
  };

  const pauseRunningFilesExcept = (fileId: string) => {
    const runningFiles = filesRef.current.filter(
      (file) => file.id !== fileId && file.runState === 'running',
    );

    runningFiles.forEach((file) => {
      cancelRuntimeFrame(file.id);
      updateFileById(file.id, (currentFile) => ({
        ...currentFile,
        runState: 'paused',
        updatedAt: Date.now(),
      }));
        pushLog(workbenchCopy.logs.autoPausedSingleRuntime(file.name), 'warning');
    });
  };

  const scheduleStandardFrame = (fileId: string) => {
    const runtime = standardRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId !== null) return;

    runtime.simulationTimerId = window.setTimeout(() => {
      runtime.simulationTimerId = null;
      runStandardFrame(fileId);
    }, SIMULATION_TICK_INTERVAL_MS);
  };

  const runStandardFrame = (fileId: string) => {
    const file = filesRef.current.find((candidate) => candidate.id === fileId);
    const runtime = file ? standardRuntimeRef.current[file.id] : null;
    if (!file || file.kind !== 'standard' || !runtime || file.runState !== 'running') return;

    for (let stepIndex = 0; stepIndex < 5; stepIndex += 1) {
      runtime.engine.step();
      if (
        runtime.engine.time >= runtime.engine.params.equilibriumTime &&
        runtime.engine.time < runtime.engine.params.equilibriumTime + runtime.engine.params.statsDuration
      ) {
        runtime.engine.collectSamples();
      }
    }

    const stats = runtime.engine.getStats();
    const particles = snapshotParticles(runtime.engine);
    runtime.frameCount += 1;
    const shouldRefreshChart = runtime.frameCount % 5 === 0 || stats.phase === 'finished';
    const chartData = shouldRefreshChart ? runtime.engine.getHistogramData(false) : file.chartData;
    const finished = stats.phase === 'finished';
    const finalChartData = finished ? runtime.engine.getHistogramData(true) : file.finalChartData;

    updateFileById(file.id, (currentFile) => {
      if (currentFile.kind !== 'standard') return currentFile;
      return {
        ...currentFile,
        runState: finished ? 'finished' : 'running',
        stats,
        chartData,
        finalChartData,
        particles,
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        updatedAt: Date.now(),
      };
    });

    if (finished) {
      cancelRuntimeFrame(file.id);
      pushLog(workbenchCopy.logs.standardFinished(file.name), 'success');
      pushLog(workbenchCopy.logs.standardResultsReady(file.name), 'success');
      return;
    }

    scheduleStandardFrame(file.id);
  };

  const scheduleIdealFrame = (fileId: string) => {
    const runtime = idealRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId !== null) return;

    runtime.simulationTimerId = window.setTimeout(() => {
      runtime.simulationTimerId = null;
      runIdealFrame(fileId);
    }, SIMULATION_TICK_INTERVAL_MS);
  };

  const runIdealFrame = (fileId: string) => {
    const file = filesRef.current.find((candidate) => candidate.id === fileId);
    const runtime = file ? idealRuntimeRef.current[file.id] : null;
    if (!file || file.kind !== 'ideal' || !runtime || file.runState !== 'running') return;

    for (let stepIndex = 0; stepIndex < 5; stepIndex += 1) {
      runtime.engine.step();
      if (
        runtime.engine.time >= runtime.engine.params.equilibriumTime &&
        runtime.engine.time < runtime.engine.params.equilibriumTime + runtime.engine.params.statsDuration
      ) {
        runtime.engine.collectSamples();
      }
    }

    const stats = runtime.engine.getStats();
    const particles = snapshotParticles(runtime.engine);
    runtime.frameCount += 1;
    const shouldRefreshChart = runtime.frameCount % 5 === 0 || stats.phase === 'finished';
    const chartData = shouldRefreshChart ? runtime.engine.getHistogramData(false) : file.chartData;
    const finished = stats.phase === 'finished';

    if (!finished) {
      const latestPressureSummary = runtime.engine.getPressureMeasurementSummary();
      updateFileById(file.id, (currentFile) => {
        if (currentFile.kind !== 'ideal') return currentFile;
        return {
          ...currentFile,
          runState: 'running',
          stats,
          chartData,
          latestPressureSummary,
          particles,
          hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
          verificationState: 'collecting',
          updatedAt: Date.now(),
        };
      });
      scheduleIdealFrame(file.id);
      return;
    }

    runtime.engine.flushPressureMeasurement();
    const latestPressureSummary = runtime.engine.getPressureMeasurementSummary();
    const recordedPoint = createIdealGasExperimentPoint(file.relation, file.activeParams, latestPressureSummary);

    updateFileById(file.id, (currentFile) => {
      if (currentFile.kind !== 'ideal') return currentFile;

      const nextPointsByRelation = recordedPoint
        ? {
            ...currentFile.pointsByRelation,
            [currentFile.relation]: [...currentFile.pointsByRelation[currentFile.relation], recordedPoint],
          }
        : currentFile.pointsByRelation;
      const analysis = getIdealGasAnalysis(currentFile.relation, nextPointsByRelation, currentFile.activeParams);
      const verificationState = getIdealVerificationState(analysis);

      return {
        ...currentFile,
        runState: 'finished',
        stats,
        chartData: runtime.engine.getHistogramData(false),
        latestPressureSummary,
        particles,
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        pointsByRelation: nextPointsByRelation,
        verificationState,
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });

    cancelRuntimeFrame(file.id);
    pushLog(
      recordedPoint
        ? workbenchCopy.logs.idealPointRecorded(file.name, getRelationLabel(file.relation), formatMetric(getRelationVariableNumericValue(file.relation, file.activeParams), 3))
        : workbenchCopy.logs.idealPointMissingSummary(file.name),
      recordedPoint ? 'success' : 'warning',
    );
  };

  const rejectLockedIdealControlledVariables = (nextParams: SimulationParams) => {
    if (activeFile.kind !== 'ideal') return false;
    const lockedKeys = getLockedIdealControlledVariableKeys(nextParams);
    if (lockedKeys.length === 0) return false;

    const message = workbenchCopy.logs.controlledVariablesLocked(activeFile.name, getRelationLabel(activeFile.relation), lockedKeys.join(', '));
    setParameterErrors([message]);
    pushLog(message, 'warning');
    return true;
  };

  const clearWorkbenchParameterInputDraft = (paramKey: string) => {
    setParameterInputDrafts((current) => {
      const { [paramKey]: _removed, ...rest } = current;
      return rest;
    });
  };

  const revertWorkbenchParameterInput = (paramKey: string) => {
    clearWorkbenchParameterInputDraft(paramKey);
    setParameterErrors([]);
  };

  const commitWorkbenchParameterInput = (
    param: WorkbenchParameterRow,
    rawValue: string,
  ) => {
    if (parameterControlsLocked) {
      pushLog(workbenchCopy.logs.pauseBeforeEditingParameters(activeFile.name), 'warning');
      return;
    }

    if (!param.editable || param.key === 'relation') {
      clearWorkbenchParameterInputDraft(param.key);
      return;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      setParameterErrors([workbenchCopy.logs.invalidParameter(activeFile.name, param.label, rawValue)]);
      pushLog(workbenchCopy.logs.invalidParameter(activeFile.name, param.label, rawValue), 'error');
      return;
    }

    const nextParams = cloneParams(activeFile.params);
    assignWorkbenchParameterValue(nextParams, param.key, parsedValue);

    if (areWorkbenchParamsEqual(nextParams, activeFile.params)) {
      clearWorkbenchParameterInputDraft(param.key);
      setParameterErrors([]);
      return;
    }

    const validation = validateWorkbenchParams(nextParams);
    if (!validation.valid) {
      showWorkbenchValidationErrors(validation);
      return;
    }

    if (rejectLockedIdealControlledVariables(nextParams)) return;

    const appliedRuntime = applyActiveFileParams(nextParams);
    if (appliedRuntime || activeFile.kind !== 'standard') {
      clearWorkbenchParameterInputDraft(param.key);
    }
  };

  const applyActiveFileParams = (
    paramsOverride?: SimulationParams,
    options: ApplyActiveFileParamsOptions = {},
  ): StandardEngineRuntime | null => {
    if (activeFile.runState === 'running') {
      if (!options.silent) pushLog(workbenchCopy.logs.pauseBeforeApplyingParameters(activeFile.name), 'warning');
      return null;
    }

    const nextParams = paramsOverride ? cloneParams(paramsOverride) : cloneParams(activeFile.params);
    if (rejectLockedIdealControlledVariables(nextParams)) return null;

    const hasOverride = Boolean(paramsOverride);
    const nextParamsAlreadyApplied = areWorkbenchParamsEqual(nextParams, activeFile.appliedParams);
    const willChangeSavedParams = !areWorkbenchParamsEqual(nextParams, activeFile.params);
    const willChangeAppliedParams = !nextParamsAlreadyApplied;
    const forceReset = options.forceReset === true;

    if (activeFile.kind === 'ideal' && !forceReset && !hasOverride && !parametersDirty && !activeFile.needsReset) {
      if (!options.silent) pushLog(workbenchCopy.logs.idealRuntimeAlreadyApplied(activeFile.name));
      return getIdealRuntime(activeFile);
    }

    if (activeFile.kind === 'standard' && !forceReset && !hasOverride && !parametersDirty) {
      if (!options.silent) pushLog(workbenchCopy.logs.noSavedParameterChanges(activeFile.name));
      return getStandardRuntime(activeFile);
    }

    if (activeFile.kind === 'heatCapacity') {
      const validation = validateWorkbenchParams(nextParams);
      if (!validation.valid) {
        showWorkbenchValidationErrors(validation);
        return null;
      }

      if (willChangeSavedParams || willChangeAppliedParams) {
        captureUndoSnapshot(hasOverride ? 'saved heat capacity parameters' : 'applied heat capacity parameters');
      }
      updateActiveFile((file) => {
        if (file.kind !== 'heatCapacity') return file;
        return {
          ...file,
          params: nextParams,
          appliedParams: cloneParams(nextParams),
          updatedAt: Date.now(),
        };
      });
      setParameterErrors([]);
      if (!options.silent) {
        pushLog(`${activeFile.name}: heat-capacity UI parameters saved; no simulation runtime started.`, 'success');
      }
      return null;
    }

    if (activeFile.kind === 'standard' && !forceReset && hasOverride && nextParamsAlreadyApplied) {
      if (willChangeSavedParams) {
        captureUndoSnapshot('saved parameters');
      }
      updateActiveFile((file) => ({
        ...file,
        params: nextParams,
        updatedAt: Date.now(),
      }));
      setParameterErrors([]);
      if (!options.silent) pushLog(`${activeFile.name}: edited parameters match the applied runtime. No rebuild needed.`);
      return getStandardRuntime(activeFile);
    }

    if (activeFile.kind === 'ideal') {
      const validation = validateWorkbenchParams(nextParams);
      if (!validation.valid) {
        showWorkbenchValidationErrors(validation);
        return null;
      }

      const changedKeys = getChangedIdealParamKeys(activeFile.activeParams, nextParams);
      const nextActiveParams = cloneParams(nextParams);
      const nextRuntime: StandardEngineRuntime = {
        engine: new PhysicsEngine(nextActiveParams),
        frameCount: 0,
        simulationTimerId: null,
      };
      const nextPointsByRelation = activeFile.pointsByRelation;
      const analysis = getIdealGasAnalysis(activeFile.relation, nextPointsByRelation, nextActiveParams);

      if (willChangeSavedParams || willChangeAppliedParams || activeFile.needsReset || forceReset) {
        captureUndoSnapshot(hasOverride ? 'saved and applied ideal parameters' : 'applied ideal parameters');
      }

      cancelRuntimeFrame(activeFile.id);
      idealRuntimeRef.current[activeFile.id] = nextRuntime;
      updateActiveFile((file) => {
        if (file.kind !== 'ideal') return file;
        return {
          ...file,
          params: nextParams,
          appliedParams: cloneParams(nextActiveParams),
          activeParams: nextActiveParams,
          runState: 'idle',
          stats: nextRuntime.engine.getStats(),
          chartData: nextRuntime.engine.getHistogramData(false),
          finalChartData: null,
          latestPressureSummary: nextRuntime.engine.getPressureMeasurementSummary(),
          needsReset: false,
          particles: snapshotParticles(nextRuntime.engine),
          hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
          pointsByRelation: nextPointsByRelation,
          verificationState: getIdealVerificationState(analysis),
          historyUnlocked: analysis.isVerified,
          updatedAt: Date.now(),
        };
      });
      setParameterErrors([]);
      if (!options.silent) {
        pushLog(
          workbenchCopy.logs.idealRuntimeApplied(activeFile.name, getRelationLabel(activeFile.relation), changedKeys.length > 0 ? changedKeys.join(', ') : workbenchCopy.results.noneValue),
          'success',
        );
      }
      return nextRuntime;
    }

    const nextAppliedParams = cloneParams(nextParams);
    const nextRuntime: StandardEngineRuntime = {
      engine: new PhysicsEngine(nextAppliedParams),
      frameCount: 0,
      simulationTimerId: null,
    };

    if (willChangeSavedParams || willChangeAppliedParams || forceReset) {
      captureUndoSnapshot(hasOverride ? 'saved and applied parameters' : 'applied parameters');
    }
    cancelRuntimeFrame(activeFile.id);
    standardRuntimeRef.current[activeFile.id] = nextRuntime;
    updateActiveFile((file) => ({
      ...file,
      params: nextParams,
      appliedParams: nextAppliedParams,
      runState: 'idle',
      stats: nextRuntime.engine.getStats(),
      chartData: nextRuntime.engine.getHistogramData(false),
      finalChartData: null,
      particles: snapshotParticles(nextRuntime.engine),
      hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
      updatedAt: Date.now(),
    }));
    setParameterErrors([]);
    if (!options.silent) {
      pushLog(
        workbenchCopy.logs.standardParametersApplied(activeFile.name, hasOverride ? workbenchCopy.logs.parametersSavedAndApplied : workbenchCopy.logs.parametersApplied),
        'success',
      );
    }
    return nextRuntime;
  };

  const prepareActiveFileForRun = (): boolean => {
    if (activeFile.runState === 'paused') return true;

    if (parametersDirty || (activeFile.kind === 'ideal' && activeFile.needsReset) || activeFile.runState === 'finished') {
      const appliedRuntime = applyActiveFileParams(undefined, { silent: true, forceReset: activeFile.runState === 'finished' });
      if (!appliedRuntime) return false;
      return true;
    }

    return true;
  };

  const runActiveFile = () => {
    if (activeFile.kind === 'heatCapacity') {
      if (parametersDirty) {
        applyActiveFileParams(undefined, { silent: true });
      }
      setParameterErrors([]);
      setSamplingPresetMenuOpen(false);
      runHeatCapacityAutoDemo();
      return;
    }

    if (!prepareActiveFileForRun()) {
      return;
    }

    setParameterErrors([]);
    setSamplingPresetMenuOpen(false);
    pauseRunningFilesExcept(activeFile.id);
    const runtime = activeFile.kind === 'standard'
      ? standardRuntimeRef.current[activeFile.id] ?? getStandardRuntime(activeFile)
      : idealRuntimeRef.current[activeFile.id] ?? getIdealRuntime(activeFile);
    if (!runtime) {
      pushLog(
        workbenchCopy.logs.runtimeCreateFailed(
          activeFile.name,
          activeFile.kind === 'standard' ? workbenchCopy.parameters.standardSimulation : workbenchCopy.parameters.idealSimulation,
        ),
        'error',
      );
      return;
    }

    updateActiveFile((file) => {
      const baseFile = {
        ...file,
        runState: 'running' as const,
        stats: runtime.engine.getStats(),
        chartData: runtime.engine.getHistogramData(false),
        particles: snapshotParticles(runtime.engine),
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        updatedAt: Date.now(),
      };

      if (file.kind !== 'ideal') return baseFile;
      return {
        ...baseFile,
        latestPressureSummary: runtime.engine.getPressureMeasurementSummary(),
        verificationState: 'collecting' as const,
      };
    });
    pushLog(
      activeFile.kind === 'standard'
        ? workbenchCopy.logs.standardStarted(activeFile.name)
        : workbenchCopy.logs.idealStarted(activeFile.name, getRelationLabel(activeFile.relation)),
      'success',
    );
    if (activeFile.kind === 'standard') {
      scheduleStandardFrame(activeFile.id);
    } else {
      scheduleIdealFrame(activeFile.id);
    }
  };

  const pauseHeatCapacityAutoDemo = () => {
    if (!autoDemoRunning) return;
    const elapsedMs = Math.max(0, performance.now() - heatCapacityAutoDemoStartedAtMsRef.current);
    heatCapacityAutoDemoPausedElapsedMsRef.current = elapsedMs;
    heatCapacityAutoDemoPausedFileIdRef.current = activeFile.id;
    clearHeatCapacityAutoDemoTimers();
    setAutoDemoRunning(false);
    setAutoDemoPaused(true);
    setAutoDemoInteractionLocked(true);
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? { ...file, runState: 'paused', pumpHint: heatCapacityRealtimeCopy.autoDemoPausedHint, updatedAt: Date.now() }
      : file);
    showHeatCapacityAutoDemoLockedToast(heatCapacityRealtimeCopy.autoDemoPausedToast);
    pushLog(heatCapacityRealtimeCopy.autoDemoPausedLog(activeFile.name), 'warning');
  };

  const terminateHeatCapacityAutoDemo = () => {
    resetHeatCapacityModeUiForFreeBase();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      return exitHeatCapacityTeachingModeWorkbenchState(file, now);
    });
    setAutoDemoStepTitle(heatCapacityRealtimeCopy.autoDemoTerminatedTitle);
    setAutoDemoStepDescription(heatCapacityRealtimeCopy.autoDemoTerminatedDescription);
    setAutoDemoStepTarget(heatCapacityRealtimeCopy.autoDemoTerminatedTarget);
    setAutoDemoStepProgressCriterion(heatCapacityRealtimeCopy.autoDemoTerminatedProgress);
    setAutoDemoStepNote(heatCapacityRealtimeCopy.autoDemoTerminatedNote);
    hideHeatCapacityAutoDemoStepPanel();
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.autoDemoTerminatedToast);
    pushLog(heatCapacityRealtimeCopy.autoDemoTerminatedLog(activeFile.name), 'warning');
  };

  const pauseActiveFile = () => {
    if (activeFile.kind === 'heatCapacity') {
      pauseHeatCapacityAutoDemo();
      return;
    }

    cancelRuntimeFrame(activeFile.id);
    updateActiveFile((file) => ({
      ...file,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
    }));
    pushLog(
      workbenchCopy.logs.simulationPaused(
        activeFile.name,
        activeFile.kind === 'standard' ? workbenchCopy.parameters.standardSimulation : workbenchCopy.parameters.idealSimulation,
      ),
      'warning',
    );
  };

  const toggleActiveFileRunState = () => {
    if (activeFile.runState === 'running') {
      pauseActiveFile();
      return;
    }

    runActiveFile();
  };

  const stopActiveFile = () => {
    cancelRuntimeFrame(activeFile.id);

    if (activeFile.kind === 'heatCapacity') {
      terminateHeatCapacityAutoDemo();
      return;
    }

    if (activeFile.kind === 'standard') {
      const nextRuntime = createStandardRuntime(activeFile);
      if (!nextRuntime) return;

      standardRuntimeRef.current[activeFile.id] = nextRuntime;
      updateActiveFile((file) => {
        if (file.kind !== 'standard') return file;
        return {
          ...file,
          runState: 'idle',
          stats: nextRuntime.engine.getStats(),
          chartData: nextRuntime.engine.getHistogramData(false),
          finalChartData: null,
          particles: snapshotParticles(nextRuntime.engine),
          hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
          updatedAt: Date.now(),
        };
      });
      pushLog(workbenchCopy.logs.standardTerminated(activeFile.name), 'warning');
      return;
    }

    const nextRuntime = createIdealRuntime(activeFile);
    if (!nextRuntime) return;

    idealRuntimeRef.current[activeFile.id] = nextRuntime;
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const analysis = getIdealGasAnalysis(file.relation, file.pointsByRelation, file.activeParams);
      return {
        ...file,
        runState: 'idle',
        stats: nextRuntime.engine.getStats(),
        chartData: nextRuntime.engine.getHistogramData(false),
        finalChartData: null,
        latestPressureSummary: nextRuntime.engine.getPressureMeasurementSummary(),
        needsReset: false,
        particles: snapshotParticles(nextRuntime.engine),
        hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    pushLog(workbenchCopy.logs.idealTerminated(activeFile.name), 'warning');
  };

  const resetActiveFile = () => {
    if (activeFile.runState === 'running') {
      cancelRuntimeFrame(activeFile.id);
    }

    if (activeFile.kind === 'heatCapacity') {
      if (parametersDirty) {
        applyActiveFileParams();
        return;
      }
      resetHeatCapacityModeUiForFreeBase();
      updateActiveFile((file) => {
        if (file.kind !== 'heatCapacity') return file;
        return resetHeatCapacityFreeRunWorkbenchState(file, Date.now());
      });
      pushLog(`${activeFile.name}: heat-capacity UI state reset.`, 'warning');
      return;
    }

    if (parametersDirty || (activeFile.kind === 'ideal' && activeFile.needsReset)) {
      applyActiveFileParams();
      return;
    }

    if (activeFile.kind === 'standard') {
      const nextRuntime = createStandardRuntime(activeFile);
      if (!nextRuntime) return;

      standardRuntimeRef.current[activeFile.id] = nextRuntime;
      updateActiveFile((file) => {
        if (file.kind !== 'standard') return file;
        return {
          ...file,
          runState: 'idle',
          stats: nextRuntime.engine.getStats(),
          chartData: nextRuntime.engine.getHistogramData(false),
          finalChartData: null,
          particles: snapshotParticles(nextRuntime.engine),
          hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
          updatedAt: Date.now(),
        };
      });
      pushLog(workbenchCopy.logs.standardReset(activeFile.name), 'warning');
      return;
    }

    const nextRuntime = createIdealRuntime(activeFile);
    if (!nextRuntime) return;

    idealRuntimeRef.current[activeFile.id] = nextRuntime;
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const analysis = getIdealGasAnalysis(file.relation, file.pointsByRelation, file.activeParams);
      return {
        ...file,
        runState: 'idle',
        stats: nextRuntime.engine.getStats(),
        chartData: nextRuntime.engine.getHistogramData(false),
        finalChartData: null,
        latestPressureSummary: nextRuntime.engine.getPressureMeasurementSummary(),
        needsReset: false,
        particles: snapshotParticles(nextRuntime.engine),
        hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    pushLog(workbenchCopy.logs.idealReset(activeFile.name, getRelationLabel(activeFile.relation)), 'warning');
  };

  useEffect(() => {
    filesRef.current
      .forEach((file) => {
        if (file.kind === 'heatCapacity') return;
        const runtimeExists = file.kind === 'standard'
          ? Boolean(standardRuntimeRef.current[file.id])
          : Boolean(idealRuntimeRef.current[file.id]);
        if (runtimeExists) return;

        const runtime = file.kind === 'standard' ? createStandardRuntime(file) : createIdealRuntime(file);
        if (!runtime) return;

        if (file.kind === 'standard') {
          standardRuntimeRef.current[file.id] = runtime;
        } else {
          idealRuntimeRef.current[file.id] = runtime;
        }
        if (file.particles.length > 0) return;

        updateFileById(file.id, (currentFile) => {
          const initializedFile = {
            ...currentFile,
            stats: runtime.engine.getStats(),
            chartData: runtime.engine.getHistogramData(false),
            particles: snapshotParticles(runtime.engine),
            hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
            updatedAt: Date.now(),
          };

          if (currentFile.kind !== 'ideal') return initializedFile;
          return {
            ...initializedFile,
            latestPressureSummary: runtime.engine.getPressureMeasurementSummary(),
          };
        });
      });
  }, []);

  const createFile = (kind: WorkbenchFileKind) => {
    captureUndoSnapshot(`created ${kind} file`);
    const index = [...files, ...closedFiles].filter((file) => file.kind === kind).length + 1;
    let file: WorkbenchFileState = kind === 'standard'
      ? createDefaultStandardFile(index, workbenchLayoutDefaults.standard)
      : kind === 'ideal'
        ? createDefaultIdealFile(index, workbenchLayoutDefaults.ideal)
        : createDefaultHeatCapacityFile(index, workbenchLayoutDefaults.heatCapacity);

    if (file.kind === 'standard' || file.kind === 'ideal') {
      const runtime = file.kind === 'standard' ? createStandardRuntime(file) : createIdealRuntime(file);
      if (runtime) {
        if (file.kind === 'standard') {
          standardRuntimeRef.current[file.id] = runtime;
        } else {
          idealRuntimeRef.current[file.id] = runtime;
        }
        file = {
          ...file,
          stats: runtime.engine.getStats(),
          chartData: runtime.engine.getHistogramData(false),
          particles: snapshotParticles(runtime.engine),
          hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
          ...(file.kind === 'ideal' ? { latestPressureSummary: runtime.engine.getPressureMeasurementSummary() } : {}),
        };
      }
    }

    if (activeFile.runState === 'running') {
      cancelRuntimeFrame(activeFile.id);
      updateFileById(activeFile.id, (currentFile) => ({
        ...currentFile,
        runState: 'paused',
        updatedAt: Date.now(),
      }));
      pushLog(workbenchCopy.logs.autoPausedCreateFile(activeFile.name), 'warning');
    }

    setWorkbenchFiles((current) => [...current, file]);
    setActiveFileId(file.id);
    activeFileIdRef.current = file.id;
    setSelectedPanel('preview');
    setParametersCollapsed(file.kind === 'heatCapacity');
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenTopMenu(null);
    if (file.kind === 'heatCapacity') {
      clearHeatCapacityAutoDemoUiState();
    }
    pushLog(workbenchCopy.logs.fileCreated(file.name), 'success');
  };

  const openNewWorkbenchWindow = () => {
    setOpenTopMenu(null);
    const desktopNewWindowRequest = window.hardSphereLabWindow?.newWindow?.();

    if (desktopNewWindowRequest) {
      void desktopNewWindowRequest.then((result) => {
        if (result?.status !== 'ok') {
          window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
        }
      }).catch(() => {
        window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
      });
      return;
    }

    window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
  };

  const minimizeDesktopWindow = () => {
    void window.hardSphereLabWindow?.minimize?.()
      .then((state) => {
        if (state) setDesktopWindowMaximized(Boolean(state.maximized));
      })
      .catch(() => undefined);
  };

  const toggleDesktopWindowMaximize = () => {
    void window.hardSphereLabWindow?.toggleMaximize?.()
      .then((state) => {
        if (state) setDesktopWindowMaximized(Boolean(state.maximized));
      })
      .catch(() => undefined);
  };

  const closeDesktopWindow = () => {
    void window.hardSphereLabWindow?.close?.();
  };

  const openUserGuide = () => {
    setOpenTopMenu(null);
    const desktopUserGuideRequest = window.hardSphereLabUserGuide?.openUserGuide?.(settingsLanguagePreference);

    if (desktopUserGuideRequest) {
      void desktopUserGuideRequest.catch(() => {
        window.open(WORKBENCH_USER_GUIDE_URLS[settingsLanguagePreference], '_blank', 'noopener,noreferrer');
      });
      return;
    }

    window.open(WORKBENCH_USER_GUIDE_URLS[settingsLanguagePreference], '_blank', 'noopener,noreferrer');
  };

  const handleAction = (label: string, kind: LogKind = 'info') => {
    pushLog(workbenchCopy.logs.mockAction(label), kind);
  };

  const handleLockedPanel = (title: string) => {
    pushLog(workbenchCopy.logs.lockedPanel(title), 'warning');
  };

  const normalizeIdealResultLayout = (
    file: WorkbenchIdealState,
    visible: boolean,
    tab: WorkbenchIdealResultWindowKey = file.idealWindowLayout.activeIdealResultTab,
    openAllTabs = false,
    replaceOpenTabs = false,
    defaults = workbenchLayoutDefaults.ideal,
  ): WorkbenchIdealState => {
    const currentLayout = normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults);
    const openTabs = openAllTabs
      ? idealResultWindowKeys
      : replaceOpenTabs
        ? [tab]
        : currentLayout.openTabs.includes(tab)
        ? currentLayout.openTabs
        : [...currentLayout.openTabs, tab];
    return {
      ...file,
      visiblePanels: visible
        ? [
            ...file.visiblePanels.filter((panel) => !isIdealResultWindowKey(panel) && panel !== 'results'),
            'results',
          ]
        : file.visiblePanels.filter((panel) => !isIdealResultWindowKey(panel) && panel !== 'results'),
      idealWindowLayout: {
        ...currentLayout,
        openTabs,
        activeIdealResultTab: tab,
        heightRatio: clampIdealResultHeightRatio(currentLayout.heightRatio),
      },
      updatedAt: Date.now(),
    };
  };

  const setActiveIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    if (activeFile.kind !== 'ideal') return;
    setSelectedPanel(tab);
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return {
        ...file,
        idealWindowLayout: {
          ...normalizeIdealWindowLayoutState(file.idealWindowLayout, workbenchLayoutDefaults.ideal),
          activeIdealResultTab: tab,
        },
        updatedAt: Date.now(),
      };
    });
  };

  const openIdealResultTab = (tab: WorkbenchIdealResultWindowKey, options: { openAllTabs?: boolean; replaceOpenTabs?: boolean } = {}) => {
    if (activeFile.kind !== 'ideal') return;
    setResultsChildrenCollapsed(false);
    setSelectedPanel(tab);

    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    const nextOpenTabs = options.openAllTabs
      ? idealResultWindowKeys
      : options.replaceOpenTabs
        ? [tab]
        : layout.openTabs.includes(tab)
        ? layout.openTabs
        : [...layout.openTabs, tab];
    const isLayoutChange = !activeFile.visiblePanels.includes('results')
      || nextOpenTabs.length !== layout.openTabs.length
      || nextOpenTabs.some((item) => !layout.openTabs.includes(item));

    if (!isLayoutChange) {
      setActiveIdealResultTab(tab);
      return;
    }

    captureUndoSnapshot(activeFile.visiblePanels.includes('results') ? `opened ${tab} tab` : 'opened ideal Results window');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return normalizeIdealResultLayout(file, true, tab, Boolean(options.openAllTabs), Boolean(options.replaceOpenTabs));
    });
    pushLog(workbenchCopy.logs.idealResultsOpened(activeFile.name, tab));
  };

  const openIdealResultsWindow = (tab: WorkbenchIdealResultWindowKey = 'experimentPoints', openAllTabs = false, replaceOpenTabs = false) => {
    openIdealResultTab(tab, { openAllTabs, replaceOpenTabs });
  };

  const openIdealResultWindow = (panel: WorkbenchIdealResultWindowKey) => {
    const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
    openIdealResultsWindow(panel, false, replaceOpenTabs);
  };

  const closeIdealResultsWindow = (recordUndo = true) => {
    if (activeFile.kind !== 'ideal') return;
    if (!activeFile.visiblePanels.includes('results')) return;

    if (recordUndo) captureUndoSnapshot('closed ideal Results window');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return normalizeIdealResultLayout(file, false);
    });
    if (isIdealResultWindowKey(selectedPanel)) setSelectedPanel('preview');
    pushLog(workbenchCopy.logs.idealResultsClosed(activeFile.name));
  };

  const closeIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    if (activeFile.kind !== 'ideal') return;
    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    if (!layout.openTabs.includes(tab)) return;

    captureUndoSnapshot(`closed ${idealResultWindowPanels.find((panel) => panel.key === tab)?.title ?? tab} tab`);
    if (layout.openTabs.length <= 1) {
      closeIdealResultsWindow(false);
      return;
    }

    const nextOpenTabs = layout.openTabs.filter((item) => item !== tab);
    const nextActiveTab = layout.activeIdealResultTab === tab
      ? pickNextOpenTab(layout.openTabs, tab) ?? nextOpenTabs[0]
      : layout.activeIdealResultTab;
    setSelectedPanel(nextActiveTab);
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return {
        ...file,
        idealWindowLayout: {
          ...normalizeIdealWindowLayoutState(file.idealWindowLayout, workbenchLayoutDefaults.ideal),
          openTabs: nextOpenTabs,
          activeIdealResultTab: nextActiveTab,
        },
        updatedAt: Date.now(),
      };
    });
  };

  const closeIdealResultWindow = (panel: WorkbenchIdealResultWindowKey) => {
    closeIdealResultTab(panel);
  };

  const setActiveStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    if (activeFile.kind !== 'standard') return;
    setSelectedPanel('results');
    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      return {
        ...file,
        standardResultsLayout: {
          ...normalizeStandardResultsLayout(file.standardResultsLayout),
          activeTab: tab,
        },
        updatedAt: Date.now(),
      };
    });
  };

  const openStandardResultsWindow = (tab: WorkbenchStandardResultsTab = 'summary', openAllTabs = false, replaceOpenTabs = false) => {
    if (activeFile.kind !== 'standard') return;
    setResultsChildrenCollapsed(false);
    setSelectedPanel('results');

    const layout = normalizeStandardResultsLayout(activeFile.standardResultsLayout);
    const nextOpenTabs = openAllTabs
      ? standardResultsTabKeys
      : replaceOpenTabs
        ? [tab]
        : layout.openTabs.includes(tab)
        ? layout.openTabs
        : [...layout.openTabs, tab];
    const isLayoutChange = !activeFile.visiblePanels.includes('results')
      || nextOpenTabs.length !== layout.openTabs.length
      || nextOpenTabs.some((item) => !layout.openTabs.includes(item));

    if (!isLayoutChange) {
      setActiveStandardResultsTab(tab);
      return;
    }

    captureUndoSnapshot(activeFile.visiblePanels.includes('results') ? `opened ${tab} tab` : 'opened Results panel');
    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      return {
        ...file,
        visiblePanels: file.visiblePanels.includes('results') ? file.visiblePanels : [...file.visiblePanels, 'results'],
        standardResultsLayout: {
          ...normalizeStandardResultsLayout(file.standardResultsLayout),
          openTabs: nextOpenTabs,
          activeTab: tab,
        },
        updatedAt: Date.now(),
      };
    });
    pushLog(workbenchCopy.logs.standardResultsOpened(
      activeFile.name,
      resultsSections.find((section) => section.key === tab)?.title ?? tab,
    ));
  };

  const closeStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    if (activeFile.kind !== 'standard') return;
    const layout = normalizeStandardResultsLayout(activeFile.standardResultsLayout);
    if (!layout.openTabs.includes(tab)) return;

    captureUndoSnapshot(`closed ${resultsSections.find((section) => section.key === tab)?.title ?? tab} tab`);
    if (layout.openTabs.length <= 1) {
      closePanel('results', false);
      return;
    }

    const nextOpenTabs = layout.openTabs.filter((item) => item !== tab);
    const nextActiveTab = layout.activeTab === tab
      ? pickNextOpenTab(layout.openTabs, tab) ?? nextOpenTabs[0]
      : layout.activeTab;
    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      return {
        ...file,
        standardResultsLayout: {
          ...normalizeStandardResultsLayout(file.standardResultsLayout),
          openTabs: nextOpenTabs,
          activeTab: nextActiveTab,
        },
        updatedAt: Date.now(),
      };
    });
  };

  const getHeatCapacityPanelDisplayDefinition = (tabId: WorkbenchHeatCapacityTabId, panel: PanelDefinition): PanelDefinition => {
    if (
      activeFile.kind === 'heatCapacity' &&
      (activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide') &&
      tabId === 'records'
    ) {
      return {
        ...panel,
        title: heatCapacityRealtimeCopy.dataResultsTitle,
        hint: heatCapacityRealtimeCopy.dataResultsHint,
      };
    }
    return panel;
  };

  const getHeatCapacityTabDefinition = (tabId: WorkbenchHeatCapacityTabId) => {
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    const panel = availablePanels.find((item) => item.key === panelKey) ?? availablePanels[0];
    return getHeatCapacityPanelDisplayDefinition(tabId, panel);
  };

  const getHeatCapacityTabState = (tabId: WorkbenchHeatCapacityTabId) => {
    if (activeFile.kind !== 'heatCapacity') return 'off';
    if (activeFile.activeHeatCapacityTabId === tabId && activeFile.openHeatCapacityTabs.includes(tabId)) return 'active';
    return activeFile.openHeatCapacityTabs.includes(tabId) ? 'open' : 'off';
  };

  const activateHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId) => {
    const tabId = requestedTabId;
    if (activeFile.kind !== 'heatCapacity' || !activeFile.openHeatCapacityTabs.includes(tabId)) return;
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    setSelectedPanel(panelKey);
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? { ...file, activeHeatCapacityTabId: tabId, selectedHeatCapacityPanel: panelKey, updatedAt: Date.now() }
        : file
    ));
  };

  const openHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId, recordUndo = true) => {
    const tabId = requestedTabId;
    if (activeFile.kind !== 'heatCapacity') return;
    const allowedTabs = getHeatCapacityMaterialsTabOrder(activeFile);
    if (!allowedTabs.includes(tabId)) return;
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    const alreadyOpen = activeFile.openHeatCapacityTabs.includes(tabId);
    setSelectedPanel(panelKey);
    if (recordUndo && !alreadyOpen) {
      captureUndoSnapshot(`opened ${getHeatCapacityTabDefinition(tabId)?.title ?? tabId} heat-capacity tab`);
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const openHeatCapacityTabs = file.openHeatCapacityTabs.includes(tabId)
        ? file.openHeatCapacityTabs
        : [...file.openHeatCapacityTabs, tabId];
      const visiblePanels = file.visiblePanels.includes(panelKey)
        ? file.visiblePanels
        : [...file.visiblePanels, panelKey];
      return {
        ...file,
        visiblePanels,
        openHeatCapacityTabs,
        activeHeatCapacityTabId: tabId,
        selectedHeatCapacityPanel: panelKey,
        heatCapacityMaterialsExpanded: true,
        updatedAt: Date.now(),
      };
    });
  };

  const openAllHeatCapacityMaterialsTabs = () => {
    if (activeFile.kind !== 'heatCapacity') return;
    const heatCapacityTabOrder = getHeatCapacityMaterialsTabOrder(activeFile);
    const firstTabId = heatCapacityTabOrder[0] ?? 'guide';
    const firstPanelKey = heatCapacityTabIdToPanelKey(firstTabId);
    captureUndoSnapshot('opened heat-capacity materials tabs');
    setSelectedPanel(firstPanelKey);
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const materialTabOrder = getHeatCapacityMaterialsTabOrder(file);
      const panelKeys = materialTabOrder.map(heatCapacityTabIdToPanelKey);
      const activeTabId = materialTabOrder[0] ?? 'guide';
      const selectedPanelKey = heatCapacityTabIdToPanelKey(activeTabId);
      return {
        ...file,
        visiblePanels: Array.from(new Set([...file.visiblePanels, ...panelKeys])),
        openHeatCapacityTabs: [...materialTabOrder],
        activeHeatCapacityTabId: activeTabId,
        selectedHeatCapacityPanel: selectedPanelKey,
        heatCapacityMaterialsExpanded: true,
        updatedAt: Date.now(),
      };
    });
  };

  const closeHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId, recordUndo = true) => {
    const tabId = requestedTabId;
    if (activeFile.kind !== 'heatCapacity' || !activeFile.openHeatCapacityTabs.includes(tabId)) return;
    const tabIndex = activeFile.openHeatCapacityTabs.indexOf(tabId);
    const nextOpenTabs = activeFile.openHeatCapacityTabs.filter((tab) => tab !== tabId);
    const nextActiveTab = activeFile.activeHeatCapacityTabId === tabId
      ? nextOpenTabs[tabIndex] ?? nextOpenTabs[tabIndex - 1] ?? null
      : activeFile.activeHeatCapacityTabId;
    const nextSelectedPanel = nextActiveTab ? heatCapacityTabIdToPanelKey(nextActiveTab) : 'preview';
    if (recordUndo) {
      captureUndoSnapshot(`closed ${getHeatCapacityTabDefinition(tabId)?.title ?? tabId} heat-capacity tab`);
    }
    setSelectedPanel(nextSelectedPanel);
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const panelKey = heatCapacityTabIdToPanelKey(tabId);
      return {
        ...file,
        visiblePanels: file.visiblePanels.filter((panel) => panel !== panelKey),
        openHeatCapacityTabs: file.openHeatCapacityTabs.filter((tab) => tab !== tabId),
        activeHeatCapacityTabId: nextActiveTab,
        selectedHeatCapacityPanel: nextSelectedPanel as typeof file.selectedHeatCapacityPanel,
        updatedAt: Date.now(),
      };
    });
  };

  const toggleWindowHeatCapacityTab = (tabId: WorkbenchHeatCapacityTabId) => {
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.openHeatCapacityTabs.includes(tabId)) {
      closeHeatCapacityTab(tabId);
    } else {
      openHeatCapacityTab(tabId);
    }
  };

  const openPanel = (panel: WorkbenchPanelKey) => {
    setSelectedPanel(panel);
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal') {
      if (panel === 'results') {
        openIdealResultsWindow('experimentPoints', true);
        return;
      }
      if (isIdealResultWindowKey(panel)) {
        openIdealResultsWindow(panel);
        return;
      }
    }

    if (activeFile.kind === 'standard' && panel === 'results') {
      openStandardResultsWindow('summary', true);
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) openHeatCapacityTab(tabId);
      return;
    }

    if (activeFile.visiblePanels.includes(panel)) return;

    captureUndoSnapshot(`opened ${availablePanels.find((item) => item.key === panel)?.title ?? panel} panel`);
    setWorkbenchFiles((current) =>
      current.map((file) => {
        if (file.id !== activeFile.id) return file;
        return {
          ...file,
          visiblePanels: [...file.visiblePanels, panel],
        };
      }),
    );
    pushLog(workbenchCopy.logs.panelOpened(activeFile.name, availablePanels.find((item) => item.key === panel)?.title ?? panel));
  };

  const closePanel = (panel: WorkbenchPanelKey, recordUndo = true) => {
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal' && isIdealResultWindowKey(panel)) {
      closeIdealResultsWindow();
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) closeHeatCapacityTab(tabId, recordUndo);
      return;
    }

    if (!activeFile.visiblePanels.includes(panel)) return;

    if (recordUndo) captureUndoSnapshot(`closed ${availablePanels.find((item) => item.key === panel)?.title ?? panel} panel`);
    setWorkbenchFiles((current) =>
      current.map((file) => {
        if (file.id !== activeFile.id) return file;
        return {
          ...file,
          visiblePanels: file.visiblePanels.filter((item) => item !== panel),
        };
      }),
    );
    if (selectedPanel === panel) setSelectedPanel('preview');
    pushLog(workbenchCopy.logs.panelClosed(activeFile.name, availablePanels.find((item) => item.key === panel)?.title ?? panel));
  };

  const togglePanel = (panel: WorkbenchPanelKey) => {
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      setSelectedPanel(panel);
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.visiblePanels.includes(panel)) {
      closePanel(panel);
    } else {
      openPanel(panel);
    }
  };

  const isWindowPanelVisible = (panel: WorkbenchPanelKey) => (
    activeFile.visiblePanels.includes(panel)
  );

  const toggleWindowPanel = (panel: WorkbenchPanelKey) => {
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      setSelectedPanel(panel);
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal' && panel === 'results') {
      if (isWindowPanelVisible(panel)) {
        closeIdealResultsWindow();
      } else {
        openIdealResultsWindow('experimentPoints', true);
      }
      return;
    }

    if (activeFile.kind === 'standard' && panel === 'results') {
      if (isWindowPanelVisible(panel)) {
        closePanel('results');
      } else {
        openStandardResultsWindow('summary', true);
      }
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) toggleWindowHeatCapacityTab(tabId);
      return;
    }

    togglePanel(panel);
  };

  const toggleWindowIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    const state = getIdealResultTabState(tab);
    if (state === 'off') {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openIdealResultsWindow(tab, false, replaceOpenTabs);
    } else {
      closeIdealResultTab(tab);
    }
  };

  const toggleWindowStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    const state = getStandardResultsTabState(tab);
    if (state === 'off') {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openStandardResultsWindow(tab, false, replaceOpenTabs);
    } else {
      closeStandardResultsTab(tab);
    }
  };

  const runWindowMenuSwitch = (action: () => void) => {
    action();
    setOpenTopMenu(null);
  };

  const selectResultsSection = (section: ResultsSectionKey, openResults = false) => {
    setSelectedPanel('results');
    if (activeFile.kind !== 'standard') return;
    if (openResults) {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openStandardResultsWindow(section, false, replaceOpenTabs);
    }
  };

  const getIdealResultTabState = (tab: WorkbenchIdealResultWindowKey) => {
    if (activeFile.kind !== 'ideal' || !activeFile.visiblePanels.includes('results')) return 'off';
    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    if (layout.activeIdealResultTab === tab) return 'active';
    return layout.openTabs.includes(tab) ? 'open' : 'off';
  };

  const getStandardResultsTabState = (tab: WorkbenchStandardResultsTab) => {
    if (activeFile.kind !== 'standard' || !activeFile.visiblePanels.includes('results')) return 'off';
    const layout = normalizeStandardResultsLayout(activeFile.standardResultsLayout);
    if (layout.activeTab === tab) return 'active';
    return layout.openTabs.includes(tab) ? 'open' : 'off';
  };

  const getLocalizedTreeState = (state: 'locked' | 'shown' | 'open' | 'active' | 'off') => workbenchCopy.files[state];

  const renderWindowResultsChildRows = () => {
    if (activeFile.kind === 'ideal') {
      return idealResultWindowPanels.map((panel) => {
        const state = getIdealResultTabState(panel.key);
        const visible = state !== 'off';
        return (
          <div className="studio-window-panel-row studio-window-panel-child-row" key={`window-${panel.key}`}>
            {panel.icon}
            <span>{panel.title}</span>
            <span className="studio-window-panel-status">{getLocalizedTreeState(state)}</span>
            <button
              type="button"
              className={`studio-window-switch ${visible ? 'studio-window-switch-on' : 'studio-window-switch-off'}`}
              role="switch"
              aria-checked={visible}
              aria-label={`${panel.title} ${getLocalizedTreeState(state)}`}
              onClick={(event) => {
                event.stopPropagation();
                runWindowMenuSwitch(() => toggleWindowIdealResultTab(panel.key));
              }}
            >
              <span className="studio-window-switch-thumb" />
            </button>
          </div>
        );
      });
    }

    if (activeFile.kind === 'standard') {
      return resultsSections.map((section) => {
        const state = getStandardResultsTabState(section.key);
        const visible = state !== 'off';
        return (
          <div className="studio-window-panel-row studio-window-panel-child-row" key={`window-${section.key}`}>
            {section.icon}
            <span>{section.title}</span>
            <span className="studio-window-panel-status">{getLocalizedTreeState(state)}</span>
            <button
              type="button"
              className={`studio-window-switch ${visible ? 'studio-window-switch-on' : 'studio-window-switch-off'}`}
              role="switch"
              aria-checked={visible}
              aria-label={`${section.title} ${getLocalizedTreeState(state)}`}
              onClick={(event) => {
                event.stopPropagation();
                runWindowMenuSwitch(() => toggleWindowStandardResultsTab(section.key));
              }}
            >
              <span className="studio-window-switch-thumb" />
            </button>
          </div>
        );
      });
    }

    return null;
  };

  const changeIdealRelation = (nextRelation: ExperimentRelation) => {
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(workbenchCopy.logs.pauseBeforeSwitchingRelation(activeFile.name), 'warning');
      return;
    }
    if (activeFile.relation === nextRelation) {
      pushLog(workbenchCopy.logs.relationAlreadyActive(activeFile.name, getRelationLabel(nextRelation)));
      return;
    }

    captureUndoSnapshot('changed ideal relation');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const analysis = getIdealGasAnalysis(nextRelation, file.pointsByRelation, file.activeParams);
      return {
        ...file,
        relation: nextRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    setSamplingPresetMenuOpen(false);
    pushLog(workbenchCopy.logs.relationSwitched(activeFile.name, getRelationLabel(nextRelation)), 'success');
  };

  const applyIdealSamplingPreset = (preset: IdealSamplingPreset) => {
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(workbenchCopy.logs.pauseBeforeChangingSamplingPreset(activeFile.name), 'warning');
      return;
    }

    applyActiveFileParams({
      ...activeFile.params,
      equilibriumTime: preset.equilibriumTime,
      statsDuration: preset.statsDuration,
    });
  };

  const getSnappedIdealScanValue = (relation: ExperimentRelation, rawValue: number) => {
    const presetSequence = getPresetSequence(relation);
    const threshold = IDEAL_SCAN_SNAP_THRESHOLD[relation];
    const closest = presetSequence.reduce(
      (best, preset) => {
        const distance = Math.abs(preset - rawValue);
        return distance < best.distance ? { value: preset, distance } : best;
      },
      { value: rawValue, distance: Number.POSITIVE_INFINITY },
    );

    return closest.distance <= threshold ? closest.value : rawValue;
  };

  const showScanInputError = (message: string, options: { refocus?: boolean; rawValue?: string } = {}) => {
    setScanInputError(message);
    setParameterErrors([message]);
    setScanInputToast(message);
    const errorKey = `${message}\n${options.rawValue ?? ''}`;
    if (lastScanInputErrorRef.current !== errorKey) {
      lastScanInputErrorRef.current = errorKey;
      pushLog(`${activeFile.name}: ${message}`, 'error');
    }
    if (options.refocus) {
      window.setTimeout(() => {
        scanInputRef.current?.focus();
        scanInputRef.current?.select();
      }, 0);
    }
  };

  const clearScanInputError = () => {
    lastScanInputErrorRef.current = null;
    setScanInputError(null);
    setParameterErrors([]);
  };

  const parseIdealScanInput = (
    rawValue: string,
    relation: ExperimentRelation,
    scanMin: number,
    scanMax: number,
  ): { valid: true; value: number } | { valid: false; message: string } => {
    const trimmedValue = rawValue.trim();
    const relationKey = getRelationVariableKey(relation);
    const decimalPattern = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
    const integerPattern = /^\d+$/;
    const formatName = relationKey === 'N' ? workbenchCopy.logs.formatPositiveInteger : workbenchCopy.logs.formatDecimalNumber;
    const decimals = getIdealScanDecimals(relation);

    if (!trimmedValue) {
      return { valid: false, message: workbenchCopy.logs.scanInputRequired(String(relationKey), formatName) };
    }

    if (relationKey === 'N' && !integerPattern.test(trimmedValue)) {
      return { valid: false, message: workbenchCopy.logs.scanInputIntegerOnly };
    }

    if (relationKey !== 'N' && !decimalPattern.test(trimmedValue)) {
      return { valid: false, message: workbenchCopy.logs.scanInputDecimalOnly(String(relationKey)) };
    }

    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return { valid: false, message: workbenchCopy.logs.scanInputGreaterThanZero(String(relationKey)) };
    }

    if (!isIdealScanValueOnStep(trimmedValue, relation)) {
      return {
        valid: false,
        message: workbenchCopy.logs.scanInputStep(getIdealScanInputLabel(relation), getIdealScanStepLabel(relation)),
      };
    }

    if (parsedValue < scanMin || parsedValue > scanMax) {
      return {
        valid: false,
        message: workbenchCopy.logs.scanInputRange(String(relationKey), formatMetric(scanMin, decimals), formatMetric(scanMax, decimals)),
      };
    }

    return { valid: true, value: relationKey === 'N' ? Math.round(parsedValue) : parsedValue };
  };

  const validateIdealScanDraft = (rawValue: string) => {
    if (activeFile.kind !== 'ideal') return true;
    const presetSequence = getPresetSequence(activeFile.relation);
    const relationVariableValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    const scanMin = Math.min(...presetSequence, relationVariableValue);
    const scanMax = Math.max(...presetSequence, relationVariableValue);
    const parsed = parseIdealScanInput(rawValue, activeFile.relation, scanMin, scanMax);

    if (parsed.valid === false) {
      showScanInputError(parsed.message, { rawValue });
      return false;
    }

    clearScanInputError();
    return true;
  };

  const updateIdealScanVariable = (rawValue: number, options: UpdateIdealScanVariableOptions = {}) => {
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(workbenchCopy.logs.pauseBeforeChangingScanVariable(activeFile.name), 'warning');
      return;
    }

    const relationKey = getRelationVariableKey(activeFile.relation);
    const nextParams = cloneParams(activeFile.params);
    const snappedValue = options.snap === false ? rawValue : getSnappedIdealScanValue(activeFile.relation, rawValue);
    const nextValue = relationKey === 'N' ? Math.round(snappedValue) : snappedValue;
    const currentValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);

    if (Math.abs(nextValue - currentValue) <= 1e-6) return;

    if (relationKey === 'targetTemperature') nextParams.targetTemperature = nextValue;
    if (relationKey === 'L') nextParams.L = nextValue;
    if (relationKey === 'N') nextParams.N = Math.round(nextValue);

    const validation = validateWorkbenchParams(nextParams);
    if (!validation.valid) {
      showWorkbenchValidationErrors(validation);
      return;
    }

    captureUndoSnapshot('changed ideal scan variable');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return {
        ...file,
        params: nextParams,
        needsReset: true,
        updatedAt: Date.now(),
      };
    });
    setParameterErrors([]);
    setScanInputError(null);
    setScanInputDraft(formatMetric(nextValue, getIdealScanDecimals(activeFile.relation)));
  };

  const commitIdealScanInput = () => {
    if (activeFile.kind !== 'ideal') return;
    if (parameterControlsLocked) return;

    const presetSequence = getPresetSequence(activeFile.relation);
    const relationVariableValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    const scanMin = Math.min(...presetSequence, relationVariableValue);
    const scanMax = Math.max(...presetSequence, relationVariableValue);
    const parsed = parseIdealScanInput(scanInputDraft, activeFile.relation, scanMin, scanMax);

    if (parsed.valid === false) {
      showScanInputError(parsed.message, { refocus: true, rawValue: scanInputDraft });
      return;
    }

    updateIdealScanVariable(parsed.value, { snap: false });
    scanInputRef.current?.blur();
    setScanInputFocused(false);
    clearScanInputError();
  };

  const isPointerOnIdealScanThumb = (
    event: React.PointerEvent<HTMLInputElement>,
    scanProgressPercent: number,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const thumbCenterX = rect.left
      + (IDEAL_SCAN_THUMB_SIZE / 2)
      + ((rect.width - IDEAL_SCAN_THUMB_SIZE) * scanProgressPercent) / 100;
    return Math.abs(event.clientX - thumbCenterX) <= IDEAL_SCAN_THUMB_HIT_RADIUS;
  };

  const requestRemoveIdealPoint = (point: IdealGasExperimentPoint) => {
    if (activeFile.kind !== 'ideal') return;

    if (pendingRemovePointId !== point.id) {
      setPendingRemovePointId(point.id);
      pushLog(workbenchCopy.logs.confirmRemoveIdealPoint(activeFile.name, getRelationLabel(point.relation)), 'warning');
      return;
    }

    captureUndoSnapshot('removed ideal experiment point');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const nextPointsByRelation = {
        ...file.pointsByRelation,
        [point.relation]: file.pointsByRelation[point.relation].filter((candidate) => candidate.id !== point.id),
      };
      const analysis = getIdealGasAnalysis(file.relation, nextPointsByRelation, file.activeParams);
      return {
        ...file,
        pointsByRelation: nextPointsByRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingRemovePointId(null);
    pushLog(workbenchCopy.logs.idealPointRemoved(activeFile.name), 'warning');
  };

  const cancelRemoveIdealPoint = () => {
    setPendingRemovePointId(null);
  };

  const cancelClearIdealRelation = () => {
    setPendingClearRelationKey(null);
  };

  const renderIdealPointRemoveAction = (point: IdealGasExperimentPoint) => (
    <div className={`studio-table-action-row ${pendingRemovePointId === point.id ? 'studio-table-action-row-pending' : ''}`}>
      <button
        type="button"
        className={`studio-table-action ${pendingRemovePointId === point.id ? 'studio-table-action-confirm' : ''}`}
        onClick={() => requestRemoveIdealPoint(point)}
      >
        {pendingRemovePointId === point.id ? workbenchCopy.results.confirmRemove : workbenchCopy.results.remove}
      </button>
      {pendingRemovePointId === point.id ? (
        <button
          type="button"
          className="studio-table-action studio-table-action-cancel"
          aria-label={`${workbenchCopy.results.cancel} ${point.id}`}
          onClick={cancelRemoveIdealPoint}
        >
          {workbenchCopy.results.cancel}
        </button>
      ) : null}
    </div>
  );

  const requestClearIdealRelation = () => {
    if (activeFile.kind !== 'ideal') return;

    const points = activeFile.pointsByRelation[activeFile.relation];
    if (points.length === 0) {
      pushLog(workbenchCopy.logs.relationHasNoPoints(activeFile.name, getRelationLabel(activeFile.relation)));
      return;
    }

    const clearKey = `${activeFile.id}:${activeFile.relation}`;
    if (pendingClearRelationKey !== clearKey) {
      setPendingClearRelationKey(clearKey);
      pushLog(workbenchCopy.logs.confirmClear(activeFile.name, getRelationLabel(activeFile.relation)), 'warning');
      return;
    }

    captureUndoSnapshot('cleared ideal relation points');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const nextPointsByRelation = {
        ...file.pointsByRelation,
        [file.relation]: [],
      };
      const analysis = getIdealGasAnalysis(file.relation, nextPointsByRelation, file.activeParams);
      return {
        ...file,
        pointsByRelation: nextPointsByRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingClearRelationKey(null);
    setPendingRemovePointId(null);
    pushLog(workbenchCopy.logs.clearedRelation(activeFile.name, getRelationLabel(activeFile.relation)), 'warning');
  };

  const beginRenameFile = (file: WorkbenchFileState) => {
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    renamingFileIdRef.current = file.id;
    renameSelectionModeRef.current = 'initial';
    setRenamingFileId(file.id);
    setRenameDraft(file.name);
  };

  const selectRenameNumericSuffix = (input: HTMLInputElement) => {
    const numericSuffix = input.value.match(/\d+$/);
    if (!numericSuffix || numericSuffix.index === undefined) {
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    input.setSelectionRange(numericSuffix.index, input.value.length);
  };

  const commitRenameFile = (fileId: string) => {
    const nextName = renameDraft.trim();
    if (!nextName) {
      pushLog(workbenchCopy.logs.fileNameCannotBeEmpty, 'error');
      return;
    }

    const targetFile = files.find((file) => file.id === fileId);
    if (targetFile && targetFile.name === nextName) {
      cancelRenameFile();
      pushLog(workbenchCopy.logs.fileNameUnchanged(nextName));
      return;
    }

    captureUndoSnapshot('renamed file');
    updateFileById(fileId, (file) => ({
      ...file,
      name: nextName,
      updatedAt: Date.now(),
    }));
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
    pushLog(workbenchCopy.logs.fileRenamed(nextName), 'success');
  };

  const cancelRenameFile = () => {
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
  };

  const commitRenameFileFromOutside = () => {
    const fileId = renamingFileIdRef.current;
    if (!fileId) return;

    const nextName = renameDraft.trim();
    if (!nextName) {
      pushLog(workbenchCopy.logs.fileNameCannotBeEmpty, 'error');
      renamingFileIdRef.current = null;
      renameSelectionModeRef.current = 'normal';
      setRenamingFileId(null);
      setRenameDraft('');
      return;
    }

    const targetFile = filesRef.current.find((file) => file.id === fileId);
    if (targetFile && targetFile.name === nextName) {
      cancelRenameFile();
      pushLog(workbenchCopy.logs.fileNameUnchanged(nextName));
      return;
    }

    captureUndoSnapshot('renamed file');
    updateFileById(fileId, (file) => ({
      ...file,
      name: nextName,
      updatedAt: Date.now(),
    }));
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
    pushLog(workbenchCopy.logs.fileRenamed(nextName), 'success');
  };

  useEffect(() => {
    if (openTopMenu === 'new') return undefined;

    setActiveTopCommandSubmenu(null);
    setPinnedTopCommandSubmenu(null);
    return undefined;
  }, [openTopMenu]);

  useEffect(() => {
    if (!openTopMenu) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (topMenuRef.current?.contains(target) || topCommandsRef.current?.contains(target)) return;
      setOpenTopMenu(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openTopMenu]);

  useEffect(() => {
    if (!openFileMenuId) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (fileMenuRef.current?.contains(target) || fileMenuButtonRef.current?.contains(target)) return;
      setOpenFileMenuId(null);
      setPendingDeleteFileId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openFileMenuId]);

  useEffect(() => {
    if (!renamingFileId) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (renameInputRef.current?.contains(target)) return;
      commitRenameFileFromOutside();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [renamingFileId, renameDraft]);

  const releaseHeatCapacityRuntimeState = (fileId: string) => {
    const ownsAutoDemo = heatCapacityAutoDemoFileIdRef.current === fileId || heatCapacityAutoDemoPausedFileIdRef.current === fileId;
    const ownsGuideSession = guideHeatCapacityActiveFileId === fileId;
    if (!ownsAutoDemo && !ownsGuideSession && activeFileIdRef.current !== fileId) return;

    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearGuideHeatCapacityGuidance();
    setGuideHeatCapacityActiveFileId(null);
    setGuideHeatCapacityFocusControlId(null);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityRollback(null);
    heatCapacityFocusSessionRef.current = null;
  };

  const closeWorkbenchFile = (fileId: string) => {
    const index = files.findIndex((file) => file.id === fileId);
    const file = files[index];
    if (!file) return;

    cancelRuntimeFrame(fileId);
    delete standardRuntimeRef.current[fileId];
    delete idealRuntimeRef.current[fileId];
    if (file.kind === 'heatCapacity') releaseHeatCapacityRuntimeState(fileId);

    const cachedFile: WorkbenchFileState = {
      ...file,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
    };
    setClosedFiles((current) => [cachedFile, ...current.filter((candidate) => candidate.id !== fileId)]);

    const isClosingActiveFile = fileId === activeFileId;
    const remainingFiles = files.filter((candidate) => candidate.id !== fileId);
    const nextActiveFile = isClosingActiveFile
      ? remainingFiles[Math.min(index, remainingFiles.length - 1)]
      : activeFile;

    setWorkbenchFiles(() => remainingFiles);
    setActiveFileId(nextActiveFile?.id ?? '');
    activeFileIdRef.current = nextActiveFile?.id ?? '';
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    if (isClosingActiveFile) {
      setSelectedPanel('preview');
      setParametersCollapsed(nextActiveFile?.kind === 'heatCapacity');
      setPendingRemovePointId(null);
      setPendingClearRelationKey(null);
      renamingFileIdRef.current = null;
      setRenamingFileId(null);
      setParameterErrors([]);
      setIdealAdvancedSettingsOpen(false);
      setIdealAdvancedSettingsBodyVisible(false);
    }
    pushLog(workbenchCopy.logs.fileClosed(file.name), 'warning');
  };

  const requestCloseWorkbenchFile = (file: WorkbenchFileState) => {
    if (file.runState === 'running' && !window.confirm(workbenchCopy.files.confirmCloseRunningExperiment(file.name))) {
      return;
    }

    closeWorkbenchFile(file.id);
  };

  const openClosedWorkbenchFile = (fileId: string) => {
    const file = closedFiles.find((candidate) => candidate.id === fileId);
    if (!file || files.some((candidate) => candidate.id === fileId)) return;

    const activeHeatCapacityRuntimeActive = activeFile.kind === 'heatCapacity' && (
      autoDemoRunning ||
      autoDemoPaused ||
      autoDemoInteractionLocked
    );
    if (!isWorkbenchEmpty && (activeFile.runState === 'running' || activeHeatCapacityRuntimeActive)) {
      if (activeFile.kind === 'heatCapacity') {
        releaseHeatCapacityRuntimeState(activeFile.id);
      } else {
        cancelRuntimeFrame(activeFile.id);
      }
      updateFileById(activeFile.id, (currentFile) => ({
        ...currentFile,
        runState: 'paused',
        updatedAt: Date.now(),
      }));
      pushLog(workbenchCopy.logs.autoPausedSwitchFile(activeFile.name), 'warning');
    }

    const reopenedFile = prepareReopenedWorkbenchFile(file);
    setClosedFiles((current) => current.filter((candidate) => candidate.id !== fileId));
    setWorkbenchFiles((current) => current.some((candidate) => candidate.id === reopenedFile.id)
      ? current
      : [...current, reopenedFile]);
    setActiveFileId(reopenedFile.id);
    activeFileIdRef.current = reopenedFile.id;
    setSelectedPanel('preview');
    setParametersCollapsed(reopenedFile.kind === 'heatCapacity');
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenTopMenu(null);
    pushLog(workbenchCopy.logs.fileOpenedFromCache(reopenedFile.name), 'success');
  };

  const deleteWorkbenchFile = (fileId: string) => {
    const index = files.findIndex((file) => file.id === fileId);
    const file = files[index];
    if (!file) return;

    captureUndoSnapshot('deleted file');
    cancelRuntimeFrame(fileId);
    delete standardRuntimeRef.current[fileId];
    delete idealRuntimeRef.current[fileId];
    if (file.kind === 'heatCapacity') releaseHeatCapacityRuntimeState(fileId);
    setClosedFiles((current) => current.filter((candidate) => candidate.id !== fileId));

    const remainingFiles = files.filter((candidate) => candidate.id !== fileId);
    const nextActiveFile = fileId === activeFileId
      ? remainingFiles[Math.min(index, remainingFiles.length - 1)]
      : activeFile;

    setWorkbenchFiles(() => remainingFiles);
    setActiveFileId(nextActiveFile?.id ?? '');
    activeFileIdRef.current = nextActiveFile?.id ?? '';
    setSelectedPanel('preview');
    setParametersCollapsed(nextActiveFile?.kind === 'heatCapacity');
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    pushLog(workbenchCopy.logs.fileRemoved(file.name), 'warning');
  };

  const requestDeleteWorkbenchFile = (file: WorkbenchFileState) => {
    if (pendingDeleteFileId === file.id) {
      deleteWorkbenchFile(file.id);
      return;
    }

    setPendingDeleteFileId(file.id);
    pushLog(workbenchCopy.logs.confirmDeleteFile(file.name), 'warning');
  };

  const cancelDeleteWorkbenchFile = () => {
    setPendingDeleteFileId(null);
    setOpenFileMenuId(null);
  };

  const resetLayout = () => {
    const defaultLiveSplitRatio = activeFile.kind === 'standard'
      ? workbenchLayoutDefaults.standard.liveWorkspaceSplitRatio
      : activeFile.kind === 'ideal'
        ? workbenchLayoutDefaults.ideal.liveWorkspaceSplitRatio
        : workbenchLayoutDefaults.heatCapacity.liveWorkspaceSplitRatio;
    if (
      activeFile.visiblePanels.length === 2 &&
      activeFile.visiblePanels.includes('preview') &&
      activeFile.visiblePanels.includes('realtime') &&
      activeFile.liveWorkspaceSplitRatio === defaultLiveSplitRatio
    ) {
      setOpenTopMenu(null);
      pushLog(workbenchCopy.logs.layoutAlreadyDefault(activeFile.name));
      return;
    }

    captureUndoSnapshot('reset layout');
    setWorkbenchFiles((current) =>
      current.map((file) =>
        file.id === activeFile.id
          ? {
              ...file,
              visiblePanels: ['preview', 'realtime'],
              ...(file.kind === 'heatCapacity'
                ? {
                    selectedHeatCapacityPanel: 'preview' as const,
                    openHeatCapacityTabs: [] as WorkbenchHeatCapacityTabId[],
                    activeHeatCapacityTabId: null,
                    heatCapacityMaterialsExpanded: true,
                    heatCapacityTabContainerHeight: 0.5,
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.heatCapacity.liveWorkspaceSplitRatio,
                  }
                : file.kind === 'ideal'
                ? {
                    idealWindowLayout: createDefaultIdealWindowLayout({ heightRatio: workbenchLayoutDefaults.ideal.resultsHeightRatio }),
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.ideal.liveWorkspaceSplitRatio,
                  }
                : {
                    standardResultsLayout: createDefaultStandardResultsLayout({ heightRatio: workbenchLayoutDefaults.standard.resultsHeightRatio }),
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.standard.liveWorkspaceSplitRatio,
                  }),
            }
          : file,
      ),
    );
    setOpenTopMenu(null);
    pushLog(workbenchCopy.logs.layoutReset(activeFile.name), 'warning');
  };

  const selectFile = (file: WorkbenchFileState) => {
    setSelectedFileId(file.id);
    const activeHeatCapacityRuntimeActive = activeFile.kind === 'heatCapacity' && (
      autoDemoRunning ||
      autoDemoPaused ||
      autoDemoInteractionLocked
    );
    if (file.id !== activeFile.id && (activeFile.runState === 'running' || activeHeatCapacityRuntimeActive)) {
      if (activeFile.kind === 'heatCapacity') {
        releaseHeatCapacityRuntimeState(activeFile.id);
      } else {
        cancelRuntimeFrame(activeFile.id);
      }
      updateFileById(activeFile.id, (currentFile) => ({
        ...currentFile,
        runState: 'paused',
        updatedAt: Date.now(),
      }));
      pushLog(workbenchCopy.logs.autoPausedSwitchFile(activeFile.name), 'warning');
    }

    if (file.id !== activeFile.id) {
      updateFileById(file.id, (currentFile) => ({
        ...currentFile,
        lastOpenedAt: Date.now(),
      }));
    }

    setActiveFileId(file.id);
    activeFileIdRef.current = file.id;
    setSelectedPanel('preview');
    setParametersCollapsed(file.kind === 'heatCapacity');
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setSamplingPresetMenuOpen(false);
    pushLog(workbenchCopy.logs.fileSelected(file.name));
  };

  const renderWorkbenchParameterSymbol = (parts: WorkbenchParameterSymbolPart[]) => (
    <span className="studio-param-symbol">
      {parts.map((part, index) => (
        typeof part === 'string'
          ? <span key={index}>{part}</span>
          : <sub key={index}>{part.sub}</sub>
      ))}
    </span>
  );

  const renderWorkbenchParameterHelpButton = (
    parameterId: string,
    modelEffect: string,
  ) => {
    const workbenchHelpId = `workbench-${parameterId}`;
    const helpVisible = visibleHeatCapacityParamHelpId === workbenchHelpId;
    const helpPopover = helpVisible
      ? createPortal(
        <span
          className={`studio-param-help-popover studio-param-help-popover-${resolvedWorkbenchTheme}`}
          data-heat-capacity-param-help-popover-id={workbenchHelpId}
          role="tooltip"
          style={heatCapacityParamHelpPopoverStyle}
          onMouseEnter={() => setHoveredHeatCapacityParamHelpId(workbenchHelpId)}
          onMouseLeave={() => {
            if (pinnedHeatCapacityParamHelpId === null) {
              setHoveredHeatCapacityParamHelpId(null);
              setHeatCapacityParamHelpPopoverStyle(undefined);
            }
          }}
        >
          {modelEffect}
        </span>,
        document.body,
      )
      : null;
    return (
      <span
        className="studio-param-help-anchor"
        onMouseLeave={() => {
          if (pinnedHeatCapacityParamHelpId === null) {
            setHoveredHeatCapacityParamHelpId(null);
            setHeatCapacityParamHelpPopoverStyle(undefined);
          }
        }}
      >
        <button
          type="button"
          className={`studio-param-help-button ${pinnedHeatCapacityParamHelpId === workbenchHelpId ? 'studio-param-help-button-pinned' : ''}`}
          data-heat-capacity-param-help-button="true"
          data-workbench-param-help-button="true"
          data-workbench-param-help-id={parameterId}
          aria-label={modelEffect}
          onMouseEnter={(event) => {
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setHoveredHeatCapacityParamHelpId(workbenchHelpId);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setPinnedHeatCapacityParamHelpId(workbenchHelpId);
            setHoveredHeatCapacityParamHelpId(workbenchHelpId);
          }}
        >
          ?
        </button>
        {helpPopover}
      </span>
    );
  };

  const renderWorkbenchParameterInputRow = (param: WorkbenchParameterRow) => {
    const detail = getWorkbenchParameterDetail(param);
    const displayLabel = getWorkbenchParameterDisplayLabel(param, workbenchCopy);
    const isParamLocked = parameterControlsLocked || isIdealControlledVariableLocked(param.key);
    const paramLockHint = isIdealControlledVariableLocked(param.key) ? controlledVariableLockHint : undefined;
    const parameterValue = parameterInputDrafts[param.key] ?? param.value;
    const displayUnit = getWorkbenchParameterDisplayUnit(param, settingsLanguagePreference);

    return (
      <div
        className={`studio-param-input-row ${isParamLocked ? 'studio-param-input-row-locked' : ''}`}
        key={param.label}
        title={paramLockHint}
        aria-disabled={isParamLocked}
      >
        <span className="studio-param-input-label">
          <span className="studio-param-input-title">
            <span>{displayLabel}</span>
            {detail ? renderWorkbenchParameterSymbol(detail.symbol) : null}
          </span>
          {detail ? renderWorkbenchParameterHelpButton(param.key, detail.help[settingsLanguagePreference]) : null}
        </span>
        <span className="studio-param-input-cell">
          <input
            type="text"
            inputMode="decimal"
            aria-label={`${workbenchCopy.parameters.edit} ${displayLabel}`}
            value={parameterValue}
            disabled={isParamLocked || !param.editable}
            onChange={(event) => {
              const nextValue = event.target.value;
              setParameterInputDrafts((current) => ({ ...current, [param.key]: nextValue }));
              setParameterErrors([]);
            }}
            onBlur={() => commitWorkbenchParameterInput(param, parameterValue)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitWorkbenchParameterInput(param, parameterValue);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                revertWorkbenchParameterInput(param.key);
              }
            }}
          />
          {displayUnit ? <span className="studio-param-input-unit">{displayUnit}</span> : null}
        </span>
      </div>
    );
  };

  const renderHeatCapacityParameterHelpButton = (
    parameterId: string,
    modelEffect: string,
  ) => {
    const helpVisible = visibleHeatCapacityParamHelpId === parameterId;
    const helpPopover = helpVisible
      ? createPortal(
        <span
          className={`studio-param-help-popover studio-param-help-popover-${resolvedWorkbenchTheme}`}
          data-heat-capacity-param-help-popover-id={parameterId}
          role="tooltip"
          style={heatCapacityParamHelpPopoverStyle}
          onMouseEnter={() => setHoveredHeatCapacityParamHelpId(parameterId)}
          onMouseLeave={() => {
            if (pinnedHeatCapacityParamHelpId === null) {
              setHoveredHeatCapacityParamHelpId(null);
              setHeatCapacityParamHelpPopoverStyle(undefined);
            }
          }}
        >
          {modelEffect}
        </span>,
        document.body,
      )
      : null;
    return (
      <span
        className="studio-param-help-anchor"
        onMouseLeave={() => {
          if (pinnedHeatCapacityParamHelpId === null) {
            setHoveredHeatCapacityParamHelpId(null);
            setHeatCapacityParamHelpPopoverStyle(undefined);
          }
        }}
      >
        <button
          type="button"
          className={`studio-param-help-button ${pinnedHeatCapacityParamHelpId === parameterId ? 'studio-param-help-button-pinned' : ''}`}
          data-heat-capacity-param-help-button="true"
          data-heat-capacity-param-help-id={parameterId}
          aria-label={`${modelEffect}`}
          onMouseEnter={(event) => {
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setHoveredHeatCapacityParamHelpId(parameterId);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setPinnedHeatCapacityParamHelpId(parameterId);
            setHoveredHeatCapacityParamHelpId(parameterId);
          }}
        >
          ?
        </button>
        {helpPopover}
      </span>
    );
  };

  const renderHeatCapacityParameterLabel = (
    parameterId: string,
    label: string,
    parts: HeatCapacityFreeParameterSymbolPart[],
    modelEffect: string,
  ) => {
    const symbolLayoutClass = parts.length > 0
      ? 'studio-heat-free-param-label-with-symbol'
      : 'studio-heat-free-param-label-no-symbol';
    return (
      <span className={`studio-heat-free-param-label ${symbolLayoutClass}`}>
        <span className="studio-heat-free-param-name">{label}</span>
        {renderHeatCapacityParameterSymbol(parts)}
        {renderHeatCapacityParameterHelpButton(parameterId, modelEffect)}
      </span>
    );
  };

  const renderHeatCapacityFreeNumberInputRow = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    draft: HeatCapacityFreeParameterDraft,
    scope: 'basic' | 'advanced',
    disabled: boolean,
  ) => {
    const inputDrafts = scope === 'basic' ? heatCapacityBasicInputDrafts : heatCapacityAdvancedInputDrafts;
    const inputErrors = scope === 'basic' ? heatCapacityBasicInputErrors : heatCapacityAdvancedInputErrors;
    const setInputDrafts = scope === 'basic' ? setHeatCapacityBasicInputDrafts : setHeatCapacityAdvancedInputDrafts;
    const error = inputErrors[definition.id] ?? null;
    const displayValue = getHeatCapacityFreeParameterInputValue(
      definition,
      draft[definition.id],
    );
    const value = inputDrafts[definition.id] ?? formatHeatCapacityFreeParameterValue(
      displayValue,
      definition.precision,
    );
    const parameterId = definition.id;
    const label = definition.label[settingsLanguagePreference];
    const modelEffect = definition.effect[settingsLanguagePreference];

    return (
      <div
        key={`${scope}-${definition.id}`}
        className={`studio-heat-free-param-row ${disabled ? 'studio-heat-free-param-row-locked' : ''} ${error ? 'studio-heat-free-param-row-error' : ''}`}
        data-heat-capacity-free-param-id={definition.id}
      >
        {renderHeatCapacityParameterLabel(parameterId, label, definition.parts, modelEffect)}
        <span className="studio-heat-free-input-cell">
          <span className="studio-heat-free-input-shell">
            <input
              type="text"
              inputMode="decimal"
              disabled={disabled}
              aria-label={`${label} ${definition.unit}`.trim()}
              value={value}
              onChange={(event) => {
                const nextValue = event.target.value;
                setInputDrafts((current) => ({
                  ...current,
                  [definition.id]: nextValue,
                }));
                if (scope === 'basic') {
                  setHeatCapacityBasicInputErrors((current) => {
                    const { [definition.id]: _removed, ...rest } = current;
                    return rest;
                  });
                } else {
                  setHeatCapacityAdvancedInputErrors((current) => {
                    const { [definition.id]: _removed, ...rest } = current;
                    return rest;
                  });
                }
              }}
              onBlur={() => {
                if (scope === 'basic') {
                  commitHeatCapacityBasicParameterInput(definition.id, value);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && scope === 'basic') {
                  commitHeatCapacityBasicParameterInput(definition.id, value);
                }
              }}
            />
            {definition.unit ? <span className="studio-heat-free-unit">{definition.unit}</span> : null}
          </span>
          {error ? <small className="studio-heat-free-inline-error">{error}</small> : null}
        </span>
      </div>
    );
  };

  const renderHeatCapacityFreeCheckboxRow = (
    definition: HeatCapacityFreeCheckboxDefinition,
    checked: boolean,
    disabled: boolean,
  ) => {
    const label = definition.label[settingsLanguagePreference];
    const modelEffect = definition.effect[settingsLanguagePreference];
    return (
      <div
        key={definition.id}
        className={`studio-heat-free-param-row studio-heat-free-check-row ${disabled ? 'studio-heat-free-param-row-locked' : ''}`}
        data-heat-capacity-free-param-id={definition.id}
      >
        {renderHeatCapacityParameterLabel(definition.id, label, definition.parts, modelEffect)}
        <label className="studio-heat-free-check-control">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            data-heat-capacity-basic-checkbox={definition.id}
            onChange={(event) => setHeatCapacityBasicCheckbox(definition.id, event.target.checked)}
          />
          <span>{checked ? definition.onText[settingsLanguagePreference] : definition.offText[settingsLanguagePreference]}</span>
        </label>
      </div>
    );
  };

  const renderHeatCapacityBasicParameterRows = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    const draft = activeFile.heatCapacityFreeParameterDraft;
    const checkboxValue = (id: HeatCapacityFreeBasicCheckboxKey) => (
      id === 'hardSphereViewEnabled'
        ? activeFile.hardSphereViewEnabled
        : Boolean(draft[id])
    );
    return (
      <>
        {heatCapacityFreeBasicNumberParameters.map((definition) => (
          renderHeatCapacityFreeNumberInputRow(
            definition,
            draft,
            'basic',
            activeHeatCapacityFreeParameterLocked,
          )
        ))}
        {heatCapacityFreeBasicCheckboxes.map((definition) => (
          renderHeatCapacityFreeCheckboxRow(
            definition,
            checkboxValue(definition.id),
            definition.id === 'hardSphereViewEnabled'
              ? false
              : activeHeatCapacityFreeParameterLocked,
          )
        ))}
      </>
    );
  };

  const renderHeatCapacityFreeParameterPanel = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    return (
      <section
        className={`studio-heat-free-params ${activeHeatCapacityFreeParameterLocked ? 'is-locked' : ''}`}
        data-heat-capacity-free-parameter-panel="true"
        aria-disabled={activeHeatCapacityFreeParameterLocked}
        onPointerDownCapture={(event) => {
          if (!activeHeatCapacityFreeParameterLocked) return;
          const target = event.target instanceof Element ? event.target : null;
          if (target?.closest('[data-heat-capacity-param-help-button="true"]')) return;
          if (target?.closest('.studio-param-help-popover')) return;
          if (target?.closest('[data-heat-capacity-free-param-id="hardSphereViewEnabled"]')) return;
          event.preventDefault();
          showHeatCapacityFreeParameterLockHint();
        }}
      >
        {renderHeatCapacityBasicParameterRows()}
        <div className={`studio-heat-free-advanced-entry ${activeHeatCapacityFreeParameterLocked ? 'studio-heat-free-advanced-entry-locked' : ''}`}>
          <span onPointerDownCapture={() => {
            if (activeHeatCapacityFreeParameterLocked) showHeatCapacityFreeParameterLockHint();
          }}>
            <button
              type="button"
              className="studio-heat-free-advanced-button"
              disabled={activeHeatCapacityFreeParameterLocked}
              title={activeHeatCapacityFreeParameterLockReason ?? undefined}
              onClick={openHeatCapacityAdvancedSettings}
            >
              <Wrench size={14} />
              <span>{heatCapacityFreeSharedText.advancedOpen[settingsLanguagePreference]}</span>
            </button>
          </span>
        </div>
      </section>
    );
  };

  const renderHeatCapacityAdvancedRiskDialog = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    return (
      <section
        className="studio-heat-advanced-risk-window"
        role="alertdialog"
        aria-modal="true"
        aria-label={heatCapacityFreeSharedText.riskTitle[settingsLanguagePreference]}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div>
          <strong>{heatCapacityFreeSharedText.riskTitle[settingsLanguagePreference]}</strong>
          <span>{heatCapacityFreeSharedText.riskBody[settingsLanguagePreference]}</span>
        </div>
        <footer>
          <button type="button" onClick={cancelHeatCapacityAdvancedParameterDraft}>
            {heatCapacityFreeSharedText.cancel[settingsLanguagePreference]}
          </button>
          <button type="button" className="studio-heat-advanced-primary" onClick={acknowledgeHeatCapacityFreeAdvancedRisk}>
            {heatCapacityFreeSharedText.confirm[settingsLanguagePreference]}
          </button>
        </footer>
      </section>
    );
  };

  const renderHeatCapacityAdvancedParameterDialog = () => {
    if (
      !heatCapacityAdvancedOpen ||
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      heatCapacityAdvancedDraft === null
    ) {
      return null;
    }
    const riskPending = !activeFile.heatCapacityFreeAdvancedRiskAccepted;
    return (
      <div className="studio-heat-advanced-overlay" role="presentation">
        <section
          className={`studio-heat-advanced-window ${riskPending ? 'studio-heat-advanced-window-blocked' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={heatCapacityFreeSharedText.advancedTitle[settingsLanguagePreference]}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="studio-heat-advanced-header">
            <div>
              <strong>{heatCapacityFreeSharedText.advancedTitle[settingsLanguagePreference]}</strong>
            </div>
            <button type="button" onClick={cancelHeatCapacityAdvancedParameterDraft} aria-label={workbenchCopy.actions.close}>
              <X size={15} />
            </button>
          </header>
          <div className="studio-heat-advanced-groups" aria-disabled={riskPending}>
            {heatCapacityFreeAdvancedParameterGroups.map((group) => (
              <section className="studio-heat-advanced-group" key={group.id} data-heat-capacity-advanced-group-section={group.id}>
                <h3 className="studio-heat-advanced-group-title">{group.title[settingsLanguagePreference]}</h3>
                <div className="studio-heat-advanced-grid">
                  {heatCapacityFreeAdvancedNumberParameters.filter((definition) => definition.group === group.id)
                    .map((definition) => {
                      const gammaLocked = definition.id === 'gamma' &&
                        !isHeatCapacityFreeGammaEditingAvailable(activeFile);
                      return (
                        <div className="studio-heat-advanced-grid-item" key={definition.id} data-heat-capacity-advanced-group={group.id}>
                          {renderHeatCapacityFreeNumberInputRow(
                            definition,
                            heatCapacityAdvancedDraft,
                            'advanced',
                            riskPending || gammaLocked,
                          )}
                        </div>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
          <footer className="studio-heat-advanced-actions">
            <button type="button" onClick={cancelHeatCapacityAdvancedParameterDraft}>
              {heatCapacityFreeSharedText.cancel[settingsLanguagePreference]}
            </button>
            <button
              type="button"
              className="studio-heat-advanced-primary"
              disabled={riskPending}
              onClick={() => saveHeatCapacityAdvancedParameterDraft(heatCapacityAdvancedDraft)}
            >
              {heatCapacityFreeSharedText.save[settingsLanguagePreference]}
            </button>
          </footer>
        </section>
        {riskPending ? renderHeatCapacityAdvancedRiskDialog() : null}
      </div>
    );
  };

  const renderIdealControls = () => {
    if (activeFile.kind !== 'ideal') return null;

    const relationVariableKey = getRelationVariableKey(activeFile.relation);
    const relationVariableValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    const presetSequence = getPresetSequence(activeFile.relation);
    const volume = Math.pow(activeFile.params.L, 3);
    const scanMin = Math.min(...presetSequence, relationVariableValue);
    const scanMax = Math.max(...presetSequence, relationVariableValue);
    const scanStep = getIdealScanStep(activeFile.relation);
    const scanDecimals = getIdealScanDecimals(activeFile.relation);
    const scanRange = scanMax - scanMin;
    const scanProgressPercent = getIdealScanPositionPercent(relationVariableValue, scanMin, scanRange);
    const scanDisplayValue = scanInputFocused
      ? scanInputDraft
      : formatMetric(relationVariableValue, scanDecimals);
    const scanTitle =
      relationVariableKey === 'targetTemperature'
        ? workbenchCopy.parameters.targetTemperature
        : relationVariableKey === 'L'
          ? workbenchCopy.parameters.boxLength
          : workbenchCopy.parameters.particleCount;
    const scanKeyLabel = relationVariableKey === 'targetTemperature' ? 'T' : relationVariableKey;
    const scanSliderClass = [
      'studio-ideal-scan-slider',
      scanSliderThumbHover ? 'studio-ideal-scan-slider-thumb-hover' : '',
      scanSliderDragging ? 'studio-ideal-scan-slider-dragging' : '',
    ].filter(Boolean).join(' ');
    const scanInputClass = [
      'studio-ideal-scan-input',
      scanInputError ? 'studio-ideal-scan-input-error' : '',
    ].filter(Boolean).join(' ');
    const activeSamplingPreset = idealSamplingPresets.find(
      (preset) =>
        preset.equilibriumTime === activeFile.params.equilibriumTime &&
        preset.statsDuration === activeFile.params.statsDuration,
    );
    const samplingPresetLabel = activeSamplingPreset
      ? workbenchCopy.parameters.samplingPresets[activeSamplingPreset.key]
      : workbenchCopy.parameters.customPreset;
    const samplingPresetDescription = activeSamplingPreset
      ? workbenchCopy.parameters.samplingDuration(activeSamplingPreset.equilibriumTime, activeSamplingPreset.statsDuration)
      : workbenchCopy.parameters.samplingDuration(
          Number(formatMetric(activeFile.params.equilibriumTime, 1)),
          Number(formatMetric(activeFile.params.statsDuration, 1)),
        );

    return (
      <div className="studio-ideal-controls" aria-disabled={parameterControlsLocked}>
        <section>
          <h4>{workbenchCopy.parameters.relation}</h4>
          <div className="studio-ideal-relation-buttons" role="tablist" aria-label={workbenchCopy.parameters.relation}>
            {idealRelationOptions.map((option) => (
              <button
                type="button"
                key={option.key}
                className={activeFile.relation === option.key ? 'studio-ideal-control-active' : ''}
                disabled={parameterControlsLocked}
                onClick={() => changeIdealRelation(option.key)}
                title={workbenchCopy.parameters.relationHints[option.key]}
              >
                <strong>{option.label}</strong>
                <span>{workbenchCopy.results.pointsShort(activeFile.pointsByRelation[option.key].length)}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4>{workbenchCopy.parameters.scanVariable}</h4>
          <div className="studio-ideal-variable-card studio-ideal-scan-control">
            <div className="studio-ideal-scan-value-row">
              <div>
                <span>{scanTitle}</span>
                <input
                  className={scanInputClass}
                  type="text"
                  inputMode={activeFile.relation === 'pn' ? 'numeric' : 'decimal'}
                  value={scanDisplayValue}
                  disabled={parameterControlsLocked}
                  aria-label={workbenchCopy.parameters.setScanValue(scanTitle)}
                  aria-invalid={scanInputError ? true : undefined}
                  ref={scanInputRef}
                  onFocus={() => {
                    setScanInputFocused(true);
                    if (!scanInputFocused) {
                      setScanInputDraft(formatMetric(relationVariableValue, scanDecimals));
                    }
                  }}
                  onChange={(event) => {
                    setScanInputDraft(event.target.value);
                    validateIdealScanDraft(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitIdealScanInput();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setScanInputDraft(formatMetric(relationVariableValue, scanDecimals));
                      setScanInputFocused(false);
                      clearScanInputError();
                    }
                  }}
                  onBlur={() => commitIdealScanInput()}
                />
              </div>
              <span className="studio-ideal-scan-key">{scanKeyLabel}</span>
            </div>
            <input
              className={scanSliderClass}
              type="range"
              min={scanMin}
              max={scanMax}
              step={scanStep}
              value={relationVariableValue}
              disabled={parameterControlsLocked}
              aria-label={workbenchCopy.parameters.adjustScanValue(scanTitle)}
              style={{ '--studio-ideal-scan-progress': `${scanProgressPercent}%` } as React.CSSProperties}
              onPointerMove={(event) => {
                if (parameterControlsLocked) return;
                setScanSliderThumbHover(scanSliderDragging || isPointerOnIdealScanThumb(event, scanProgressPercent));
              }}
              onPointerLeave={() => {
                if (!scanSliderDragging) setScanSliderThumbHover(false);
              }}
              onPointerDown={(event) => {
                if (parameterControlsLocked) return;
                const pointerOnThumb = isPointerOnIdealScanThumb(event, scanProgressPercent);
                setScanSliderThumbHover(pointerOnThumb);
                setScanSliderDragging(pointerOnThumb);
                if (pointerOnThumb) {
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                setScanSliderDragging(false);
                setScanSliderThumbHover(isPointerOnIdealScanThumb(event, scanProgressPercent));
              }}
              onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                setScanSliderDragging(false);
                setScanSliderThumbHover(false);
              }}
              onBlur={() => {
                setScanSliderDragging(false);
                setScanSliderThumbHover(false);
              }}
              onChange={(event) => updateIdealScanVariable(Number(event.target.value))}
            />
            <div className="studio-ideal-scan-ticks" aria-label={workbenchCopy.parameters.recommendedValues(scanTitle)}>
              {presetSequence.map((value) => (
                <button
                  type="button"
                  key={`${activeFile.relation}-${value}`}
                  className={`studio-ideal-scan-tick-button ${Math.abs(value - relationVariableValue) <= 1e-6 ? 'studio-ideal-scan-tick-active' : ''}`}
                  disabled={parameterControlsLocked}
                  onClick={() => updateIdealScanVariable(value)}
                  style={{
                    '--studio-ideal-scan-tick-position': `${getIdealScanPositionPercent(value, scanMin, scanRange)}%`,
                  } as React.CSSProperties}
                >
                  {formatMetric(value, scanDecimals)}
                </button>
              ))}
            </div>
            {activeFile.relation === 'pv' ? (
              <div className="studio-ideal-scan-derived">
                <small>V = {formatMetric(volume, 1)}</small>
                <small>1/V = {formatMetric(volume > 0 ? 1 / volume : 0, 6)}</small>
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <h4>{workbenchCopy.parameters.samplingPreset}</h4>
          <div
            ref={samplingPresetSelectRef}
            className={`studio-ideal-preset-select ${samplingPresetMenuOpen ? 'studio-ideal-preset-select-open' : ''}`}
          >
            <button
              type="button"
              className="studio-ideal-preset-trigger"
              aria-haspopup="listbox"
              aria-expanded={samplingPresetMenuOpen}
              disabled={parameterControlsLocked}
              onClick={() => setSamplingPresetMenuOpen((current) => !current)}
            >
              <span>
                <strong>{samplingPresetLabel}</strong>
                <small>{samplingPresetDescription}</small>
              </span>
              <ChevronDown
                size={15}
                className={`studio-ideal-preset-chevron ${samplingPresetMenuOpen ? 'studio-ideal-preset-chevron-open' : ''}`}
              />
            </button>
            <span className="studio-ideal-preset-tooltip" role="tooltip">{workbenchCopy.parameters.setSamplingPrecision}</span>
            <div
              className="studio-ideal-preset-menu studio-ideal-preset-menu-overlay"
              role="listbox"
              aria-label={workbenchCopy.parameters.samplingPreset}
              aria-hidden={!samplingPresetMenuOpen}
            >
              {idealSamplingPresets.map((preset) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={activeSamplingPreset?.key === preset.key}
                  tabIndex={parameterControlsLocked || !samplingPresetMenuOpen ? -1 : 0}
                  key={preset.key}
                  className={activeSamplingPreset?.key === preset.key ? 'studio-ideal-control-active' : ''}
                  disabled={parameterControlsLocked}
                  onClick={() => {
                    setSamplingPresetMenuOpen(false);
                    applyIdealSamplingPreset(preset);
                  }}
                >
                  <strong>{workbenchCopy.parameters.samplingPresets[preset.key]}</strong>
                  <span>{workbenchCopy.parameters.samplingDuration(preset.equilibriumTime, preset.statsDuration)}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderAboutWindow = () => {
    if (!aboutWindowOpen) return null;

    const environmentChecking = exportEnvironmentStatus === 'checking';
    const updateChecking = aboutUpdateChecking;
    const environmentStatusLabel = getAboutEnvironmentStatusLabel(exportEnvironmentStatus, workbenchCopy);

    return (
      <div className="studio-settings-overlay studio-about-overlay" role="presentation" onMouseDown={closeAboutWindow}>
        <section
          className="studio-settings-window studio-about-window"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-about-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="studio-settings-header studio-about-header">
            <div>
              <strong id="studio-about-title">{workbenchCopy.about.title}</strong>
              <span>{workbenchCopy.about.subtitle}</span>
            </div>
            <button type="button" className="studio-settings-close" aria-label={workbenchCopy.about.closeAria} onClick={closeAboutWindow}>
              <X size={15} />
            </button>
          </div>

          <div className="studio-about-body">
            <section className="studio-about-card">
              <div className="studio-about-row">
                <span className="studio-about-label">{workbenchCopy.about.currentVersion}</span>
                <span className="studio-about-value"><strong>{WORKBENCH_APP_VERSION}</strong></span>
              </div>
              <button type="button" className="studio-about-row studio-about-action-row" onClick={runAboutUpdateCheck}>
                <span className="studio-about-label">{workbenchCopy.about.checkUpdates}</span>
                <span className="studio-about-value">
                  <span>{updateChecking ? workbenchCopy.about.checking : getAboutUpdateStatusLabel(updaterState, workbenchCopy)}</span>
                  <span className="studio-about-action-icon" aria-hidden="true">
                    {updateChecking ? <Loader2 size={15} /> : <ChevronRight size={17} />}
                  </span>
                </span>
              </button>
              <button type="button" className="studio-about-row studio-about-action-row" onClick={runAboutEnvironmentCheck}>
                <span className="studio-about-label">{workbenchCopy.about.localDataExportEnvironment}</span>
                <span className="studio-about-value">
                  <span className="studio-about-status">
                    <i className={`studio-about-status-dot ${isExportEnvironmentAvailableStatus(exportEnvironmentStatus) ? 'studio-about-status-dot-ready' : ''}`} />
                    <span>{environmentStatusLabel}</span>
                  </span>
                  <span className="studio-about-action-icon" aria-hidden="true">
                    {environmentChecking ? <Loader2 size={15} /> : <ChevronRight size={17} />}
                  </span>
                </span>
              </button>
              <div className="studio-about-row studio-about-cache-row">
                <span className="studio-about-label">{workbenchCopy.about.workspaceSessionCache}</span>
                <span className="studio-about-value">
                  <strong>{sessionCacheSummary.summary}</strong>
                  <span className="studio-about-cache-breakdown">{sessionCacheSummary.breakdown}</span>
                </span>
              </div>
              <div className="studio-about-row">
                <span className="studio-about-label">{workbenchCopy.about.buildNotes}</span>
                <span className="studio-about-value studio-about-build-note">{workbenchCopy.about.buildPlaceholder}</span>
              </div>
            </section>
          </div>

          {aboutResultNotice ? (
            <div className="studio-about-result-toast" role="status" aria-live="polite">
              <strong>{aboutResultNotice.title}</strong>
              <span>{aboutResultNotice.body}</span>
            </div>
          ) : null}
        </section>
      </div>
    );
  };

  const renderUpdateDialog = () => {
    if (!updateDialogState) return null;

    const downloading = updateDialogState.status === 'downloading';
    const retrying = updateDialogState.status === 'retrying';
    const downloaded = updateDialogState.status === 'downloaded';
    const installing = updateDialogState.status === 'installing';
    const failed = updateDialogState.status === 'error';
    const releaseNotes = updateDialogState.releaseNotes?.trim() || workbenchCopy.about.noReleaseNotes;
    const releaseSummary = getWorkbenchLocalizedText(updateDialogState.releaseSummary, settingsLanguagePreference);
    const releaseSections = updateDialogState.releaseSections ?? [];
    const latestVersion = updateDialogState.latestVersion || '--';
    const title = downloaded || installing ? workbenchCopy.about.updateReadyTitle : workbenchCopy.about.updateAvailableTitle;
    const body = downloaded || installing ? workbenchCopy.about.updateReadyBody : workbenchCopy.about.updateAvailableBody;
    const statusMessage = installing
      ? workbenchCopy.about.updateReadyStatus
      : retrying
        ? workbenchCopy.about.retryingUpdateStatus(updateDialogState.downloadAttempt ?? null, updateDialogState.maxDownloadAttempts ?? null)
        : failed
          ? workbenchCopy.about.updateDownloadFailedStatus(updateDialogState.downloadAttempt ?? null, updateDialogState.maxDownloadAttempts ?? null)
          : workbenchCopy.about.downloadingUpdateStatus(updateDialogState.percent ?? null);
    const showStatus = downloading || retrying || installing || failed;

    return (
      <div className="studio-settings-overlay studio-update-overlay" role="presentation" onMouseDown={() => setUpdateDialogState(null)}>
        <section
          className="studio-settings-window studio-update-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-update-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="studio-settings-header studio-update-header">
            <div>
              <strong id="studio-update-title">{title}</strong>
              <span>{body}</span>
            </div>
            <button type="button" className="studio-settings-close" aria-label={workbenchCopy.about.later} onClick={() => setUpdateDialogState(null)}>
              <X size={15} />
            </button>
          </div>
          <div className="studio-update-body">
            <div className="studio-update-version-grid">
              <span>{workbenchCopy.about.currentVersionLabel}</span>
              <strong>{updateDialogState.currentVersion || WORKBENCH_APP_VERSION}</strong>
              <span>{workbenchCopy.about.latestVersionLabel}</span>
              <strong>{latestVersion}</strong>
              <span>{workbenchCopy.about.releaseDateLabel}</span>
              <strong>{formatWorkbenchReleaseDate(updateDialogState.releaseDate, settingsLanguagePreference)}</strong>
            </div>
            {releaseSummary ? (
              <p className="studio-update-summary">{releaseSummary}</p>
            ) : null}
            <section className="studio-update-notes">
              <strong>{workbenchCopy.about.releaseNotesLabel}</strong>
              {releaseSections.length > 0 ? (
                <div className="studio-update-note-sections">
                  {releaseSections.map((section) => {
                    const sectionTitle = getWorkbenchLocalizedText(section.title, settingsLanguagePreference) || section.type;
                    return (
                      <section className="studio-update-note-section" key={section.type}>
                        <h4>{sectionTitle}</h4>
                        <ul>
                          {section.items.map((item, index) => {
                            const itemTitle = getWorkbenchLocalizedText(item.title, settingsLanguagePreference) || item.scope;
                            const itemBody = getWorkbenchLocalizedText(item.body, settingsLanguagePreference);
                            return (
                              <li key={item.scope + '-' + index}>
                                <span>{itemTitle}</span>
                                {itemBody ? <p>{itemBody}</p> : null}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p>{releaseNotes}</p>
              )}
            </section>
            {showStatus ? (
              <div className={'studio-update-status studio-update-status-' + updateDialogState.status}>
                <span>{statusMessage}</span>
                {downloading || installing ? (
                  <i style={{ width: `${Math.max(0, Math.min(100, updateDialogState.percent ?? 0))}%` }} />
                ) : null}
              </div>
            ) : null}
          </div>
          <footer className="studio-update-actions">
            {downloaded || installing ? (
              <>
                <button type="button" className="studio-update-secondary" onClick={() => setUpdateDialogState(null)}>
                  {workbenchCopy.about.later}
                </button>
                <button type="button" className="studio-update-primary" onClick={restartAndInstallUpdate} disabled={installing}>
                  {installing ? <Loader2 size={14} /> : <Download size={14} />}
                  {workbenchCopy.about.restartAndInstall}
                </button>
              </>
            ) : failed ? (
              <>
                <button type="button" className="studio-update-secondary" onClick={() => setUpdateDialogState(null)}>
                  {workbenchCopy.about.later}
                </button>
                <button type="button" className="studio-update-secondary" onClick={startUpdateDownload}>
                  <Download size={14} />
                  {workbenchCopy.about.retryDownload}
                </button>
                <button type="button" className="studio-update-primary" onClick={openManualUpdateDownload} disabled={!updateDialogState.manualDownloadUrl}>
                  <Download size={14} />
                  {workbenchCopy.about.manualDownload}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="studio-update-secondary" onClick={ignoreUpdateDialogVersion} disabled={downloading || retrying}>
                  {workbenchCopy.about.ignoreThisVersion}
                </button>
                <button type="button" className="studio-update-primary" onClick={startUpdateDownload} disabled={downloading || retrying}>
                  {downloading || retrying ? <Loader2 size={14} /> : <Download size={14} />}
                  {workbenchCopy.about.updateNow}
                </button>
              </>
            )}
          </footer>
        </section>
      </div>
    );
  };

  const renderGeneralSettingsWindow = () => {
    if (!settingsGeneralOpen) return null;

    const themeOptions: Array<{ key: WorkbenchThemePreference; label: string; hint: string }> = (
      ['system', 'light', 'dark'] as WorkbenchThemePreference[]
    ).map((key) => ({ key, ...workbenchCopy.settings.themeOptions[key] }));
    const languageOptions: Array<{ key: WorkbenchLanguagePreference; label: string; hint: string }> = (
      ['zh-CN', 'zh-TW', 'en'] as WorkbenchLanguagePreference[]
    ).map((key) => ({ key, ...workbenchCopy.settings.languageOptions[key] }));
    const activeLanguage = languageOptions.find((option) => option.key === settingsLanguagePreference) ?? languageOptions[0];

    return (
      <div className="studio-settings-overlay" role="presentation" onMouseDown={closeGeneralSettings}>
        <section
          className="studio-settings-window"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-settings-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="studio-settings-header">
            <div>
              <strong id="studio-settings-title">{workbenchCopy.settings.title}</strong>
              <span>{workbenchCopy.settings.subtitle}</span>
            </div>
            <button type="button" className="studio-settings-close" aria-label={workbenchCopy.settings.closeAria} onClick={closeGeneralSettings}>
              <X size={15} />
            </button>
          </div>

          <div className="studio-settings-body">
            <section className="studio-settings-section">
              <div className="studio-settings-section-title">
                <strong>{workbenchCopy.settings.theme}</strong>
                <span>{workbenchCopy.settings.themeHint}</span>
              </div>
              <div className="studio-settings-theme-grid" role="radiogroup" aria-label={workbenchCopy.settings.theme}>
                {themeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.key}
                    role="radio"
                    aria-checked={settingsThemePreference === option.key}
                    className={`studio-settings-theme-card studio-settings-theme-${option.key} ${settingsThemePreference === option.key ? 'studio-settings-theme-card-active' : ''}`}
                    onClick={() => updateSettingsThemePreference(option.key)}
                  >
                    <span className="studio-settings-theme-card-copy">
                      <strong>{option.label}</strong>
                      <small>{option.hint}</small>
                    </span>
                    <span className="studio-settings-preview" aria-hidden="true">
                      <i className="studio-settings-preview-menu" />
                      <i className="studio-settings-preview-left" />
                      <i className="studio-settings-preview-main" />
                      <i className="studio-settings-preview-right" />
                      <i className="studio-settings-preview-chart" />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="studio-settings-section studio-settings-control-row">
              <div className="studio-settings-section-title">
                <strong>{workbenchCopy.settings.language}</strong>
                <span>{workbenchCopy.settings.languageHint}</span>
              </div>
              <div className="studio-settings-control-surface">
                <div className={`studio-settings-language-select ${settingsLanguageMenuOpen ? 'studio-settings-language-select-open' : ''}`}>
                  <button
                    type="button"
                    className="studio-settings-language-trigger"
                    ref={settingsLanguageTriggerRef}
                    aria-haspopup="listbox"
                    aria-expanded={settingsLanguageMenuOpen}
                    onClick={() => setSettingsLanguageMenuOpen((current) => !current)}
                  >
                    <span>
                      <strong>{activeLanguage.label}</strong>
                      <small>{activeLanguage.hint}</small>
                    </span>
                    <ChevronDown
                      size={15}
                      className={`studio-settings-language-chevron ${settingsLanguageMenuOpen ? 'studio-settings-language-chevron-open' : ''}`}
                    />
                  </button>
                  {settingsLanguageMenuOpen ? (
                    <div className="studio-settings-language-menu" role="listbox" aria-label={workbenchCopy.settings.language}>
                      {languageOptions.map((option) => (
                        <button
                          type="button"
                          key={option.key}
                          role="option"
                          aria-selected={settingsLanguagePreference === option.key}
                          className={settingsLanguagePreference === option.key ? 'studio-settings-language-active' : ''}
                          onClick={() => updateSettingsLanguagePreference(option.key)}
                        >
                          <strong>{option.label}</strong>
                          <span>{option.hint}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="studio-settings-section studio-settings-control-row studio-settings-performance-row">
              <div className="studio-settings-section-title">
                <strong>{workbenchCopy.settings.performanceMode}</strong>
                <span>{workbenchCopy.settings.performanceModeHint}</span>
              </div>
              <div className="studio-settings-control-surface">
                <div
                  className={`studio-settings-performance-segmented studio-settings-performance-segmented-${settingsPerformanceMode}`}
                  role="radiogroup"
                  aria-label={workbenchCopy.settings.performanceMode}
                >
                  <span className="studio-settings-performance-thumb" aria-hidden="true" />
                  {performanceModeOptions.map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      role="radio"
                      aria-checked={settingsPerformanceMode === option.mode}
                      className={`studio-settings-performance-option ${
                        settingsPerformanceMode === option.mode ? 'studio-settings-performance-option-active' : ''
                      }`}
                      onClick={() => updateSettingsPerformanceMode(option.mode)}
                    >
                      <strong>{option.label}</strong>
                      <small>{workbenchCopy.settings.performanceModeSummary[option.mode]}</small>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="studio-settings-section studio-settings-shortcuts-section">
              <div className="studio-settings-section-title">
                <strong>{workbenchCopy.shortcuts.title}</strong>
                <span>{workbenchCopy.shortcuts.hint}</span>
              </div>
              <div className="studio-settings-control-surface">
                <div className="studio-settings-shortcuts-card">
                  <div className="studio-settings-shortcuts-list" aria-label={workbenchCopy.shortcuts.title}>
                    <span><kbd>Ctrl+Z</kbd>{workbenchCopy.shortcuts.undo}</span>
                    <span><kbd>Ctrl+Y</kbd><kbd>Ctrl+Shift+Z</kbd>{workbenchCopy.shortcuts.redo}</span>
                    <span><kbd>Esc</kbd>{workbenchCopy.shortcuts.closeSettings}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  };

  const openTopCommandSubmenu = (submenu: TopCommandSubmenu) => {
    setPinnedTopCommandSubmenu((current) => (current === submenu ? current : null));
    setActiveTopCommandSubmenu(submenu);
  };

  const closeTopCommandSubmenu = (submenu: TopCommandSubmenu) => {
    if (pinnedTopCommandSubmenu === submenu) return;
    setActiveTopCommandSubmenu((current) => (current === submenu ? null : current));
  };

  const pinTopCommandSubmenu = (submenu: TopCommandSubmenu) => {
    setActiveTopCommandSubmenu(submenu);
    setPinnedTopCommandSubmenu(submenu);
  };

  const blurTopCommandSubmenu = (submenu: TopCommandSubmenu, event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    closeTopCommandSubmenu(submenu);
  };

  const getTopCommandSubmenuClassName = (submenu: TopCommandSubmenu) => (
    `studio-command-submenu${activeTopCommandSubmenu === submenu ? ' studio-command-submenu-open' : ''}${pinnedTopCommandSubmenu === submenu ? ' studio-command-submenu-pinned' : ''}`
  );

  const renderTopCommand = (menu: Exclude<TopMenu, null>, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`studio-command-button ${openTopMenu === menu ? 'studio-command-button-active' : ''}`}
      onClick={(event) => {
        setTopMenuLeft(event.currentTarget.offsetLeft);
        setOpenTopMenu((current) => (current === menu ? null : menu));
      }}
    >
      {icon}
      <span>{label}</span>
      <ChevronDown size={12} />
    </button>
  );

  const renderTopMenu = () => {
    if (openTopMenu === 'new') {
      return (
        <div className="studio-command-menu studio-command-menu-new studio-command-menu-experiment-files" ref={topMenuRef} style={{ left: topMenuLeft }}>
          <button type="button" onClick={openNewWorkbenchWindow}>
            <PanelTopOpen size={14} />
            <span>{workbenchCopy.menus.newWindow}</span>
          </button>
          <div
            className={getTopCommandSubmenuClassName('newExperiment')}
            onMouseEnter={() => openTopCommandSubmenu('newExperiment')}
            onMouseLeave={() => closeTopCommandSubmenu('newExperiment')}
            onFocus={() => openTopCommandSubmenu('newExperiment')}
            onBlur={(event) => blurTopCommandSubmenu('newExperiment', event)}
            onClick={() => pinTopCommandSubmenu('newExperiment')}
          >
            <button type="button" className="studio-command-submenu-trigger">
              <FilePlus2 size={14} />
              <span>{workbenchCopy.menus.newExperiment}</span>
              <ChevronRight size={12} />
            </button>
            <div className="studio-command-submenu-panel">
              <button type="button" onClick={() => createFile('ideal')}>
                <FlaskConical size={14} />
                <span>{workbenchCopy.menus.idealStudy}</span>
              </button>
              <button type="button" onClick={() => createFile('heatCapacity')}>
                <Gauge size={14} />
                <span>{workbenchCopy.menus.heatCapacityStudy}</span>
              </button>
              <button type="button" onClick={() => createFile('standard')}>
                <Activity size={14} />
                <span>{workbenchCopy.menus.standardStudy}</span>
              </button>
            </div>
          </div>
          <div
            className={getTopCommandSubmenuClassName('openExperiment')}
            onMouseEnter={() => openTopCommandSubmenu('openExperiment')}
            onMouseLeave={() => closeTopCommandSubmenu('openExperiment')}
            onFocus={() => openTopCommandSubmenu('openExperiment')}
            onBlur={(event) => blurTopCommandSubmenu('openExperiment', event)}
            onClick={() => pinTopCommandSubmenu('openExperiment')}
          >
            <button type="button" className="studio-command-submenu-trigger">
              <FolderOpen size={14} />
              <span>{workbenchCopy.menus.openExperiment}</span>
              <ChevronRight size={12} />
            </button>
            <div className="studio-command-submenu-panel">
              {openableClosedFiles.length === 0 ? (
                <button type="button" disabled>
                  <Archive size={14} />
                  <span>{workbenchCopy.menus.noCachedExperiments}</span>
                </button>
              ) : openableClosedFiles.map((file) => (
                <button type="button" key={file.id} onClick={() => openClosedWorkbenchFile(file.id)}>
                  {file.kind === 'standard' ? <Activity size={14} /> : file.kind === 'ideal' ? <FlaskConical size={14} /> : <Gauge size={14} />}
                  <span>{file.name}</span>
                  <strong>{getWorkbenchFileKindLabel(file.kind, workbenchCopy.files)}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (openTopMenu === 'edit') {
      return (
        <div className="studio-command-menu studio-command-menu-edit" ref={topMenuRef} style={{ left: topMenuLeft }}>
          <button type="button" onClick={undoLastEdit} disabled={undoStack.length === 0}>
            <Undo2 size={14} />
            <span>{workbenchCopy.menus.undo}</span>
            <strong>{undoStack[undoStack.length - 1]?.label ?? workbenchCopy.menus.empty}</strong>
          </button>
          <button type="button" onClick={redoLastEdit} disabled={redoStack.length === 0}>
            <Redo2 size={14} />
            <span>{workbenchCopy.menus.redo}</span>
            <strong>{redoStack[redoStack.length - 1]?.label ?? workbenchCopy.menus.empty}</strong>
          </button>
          <button type="button" onClick={clearEditHistory} disabled={undoStack.length === 0 && redoStack.length === 0}>
            <RotateCcw size={14} />
            <span>{workbenchCopy.menus.clearEditHistory}</span>
            <strong>{undoStack.length + redoStack.length}</strong>
          </button>
        </div>
      );
    }

    if (openTopMenu === 'window') {
      return (
        <div className="studio-command-menu studio-command-menu-window" ref={topMenuRef} style={{ left: topMenuLeft }}>
          <div className="studio-command-menu-title">{workbenchCopy.menus.panelsFor(activeFile.name)}</div>
          {availablePanels.filter((panel) => !(activeFile.kind === 'ideal' && isIdealResultWindowKey(panel.key))).map((panel) => {
            const locked = LOCKED_PANEL_KEYS.includes(panel.key);
            const visible = isWindowPanelVisible(panel.key);
            const switchOn = locked || visible;
            return (
              <React.Fragment key={panel.key}>
                <div className="studio-window-panel-row">
                  {locked ? <LockKeyhole size={14} /> : panel.icon}
                  <span>{panel.title}</span>
                  <span className="studio-window-panel-status">{locked ? workbenchCopy.files.locked : visible ? workbenchCopy.files.shown : workbenchCopy.files.off}</span>
                  <button
                    type="button"
                    className={`studio-window-switch ${switchOn ? 'studio-window-switch-on' : 'studio-window-switch-off'}${locked ? ' studio-window-switch-locked' : ''}`}
                    role="switch"
                    aria-checked={switchOn}
                    aria-label={`${panel.title} ${locked ? workbenchCopy.files.locked : visible ? workbenchCopy.files.shown : workbenchCopy.files.off}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      runWindowMenuSwitch(() => toggleWindowPanel(panel.key));
                    }}
                  >
                    <span className="studio-window-switch-thumb" />
                  </button>
                </div>
                {panel.key === 'results' ? renderWindowResultsChildRows() : null}
              </React.Fragment>
            );
          })}
          <button type="button" onClick={resetLayout}>
            <RotateCcw size={14} />
            <span>{workbenchCopy.menus.resetDefaultLayout}</span>
            <strong>{workbenchCopy.menus.default}</strong>
          </button>
        </div>
      );
    }

    if (openTopMenu === 'settings') {
      return (
        <div className="studio-command-menu studio-command-menu-settings" ref={topMenuRef} style={{ left: topMenuLeft }}>
          <button type="button" onClick={openGeneralSettings}>
            <Settings size={14} />
            <span>{workbenchCopy.menus.general}</span>
            <strong>{`${settingsThemePreference} / ${settingsLanguagePreference} / ${workbenchCopy.settings.performanceModeSummary[settingsPerformanceMode]}`}</strong>
          </button>
          <button type="button" onClick={saveCurrentWorkbenchLayoutAsDefault}>
            <Archive size={14} />
            <span>{workbenchCopy.menus.saveWorkbenchLayoutDefault}</span>
            <strong>{`${Math.round((activeFile.kind === 'ideal' ? workbenchLayoutDefaults.ideal.resultsHeightRatio : activeFile.kind === 'standard' ? workbenchLayoutDefaults.standard.resultsHeightRatio : workbenchLayoutDefaults.heatCapacity.resultsHeightRatio) * 100)}% / ${Math.round((activeFile.kind === 'ideal' ? workbenchLayoutDefaults.ideal.liveWorkspaceSplitRatio : activeFile.kind === 'standard' ? workbenchLayoutDefaults.standard.liveWorkspaceSplitRatio : workbenchLayoutDefaults.heatCapacity.liveWorkspaceSplitRatio) * 100)}%`}</strong>
          </button>
        </div>
      );
    }

    if (openTopMenu === 'help') {
      return (
        <div className="studio-command-menu studio-command-menu-help" ref={topMenuRef} style={{ left: topMenuLeft }}>
          <button type="button" onClick={openUserGuide}>
            <BookOpen size={14} />
            <span>{workbenchCopy.menus.userGuide}</span>
          </button>
          <button type="button" onClick={() => handleAction('Open theory PDF')}>
            <FileText size={14} />
            <span>{workbenchCopy.menus.theoryPdf}</span>
          </button>
          <button type="button" onClick={openAboutWindow}>
            <Info size={14} />
            <span>{workbenchCopy.menus.about}</span>
          </button>
        </div>
      );
    }

    return null;
  };

  const renderCachedExperimentOpenActions = (className = 'studio-empty-open-actions') => (
    <div className={className}>
      <div className="studio-empty-open-heading">
        <FolderOpen size={14} />
        <span>{workbenchCopy.menus.openExperiment}</span>
      </div>
      <div className="studio-empty-open-list">
        {openableClosedFiles.length === 0 ? (
          <button type="button" className="studio-empty-command-row studio-empty-command-row-disabled" disabled>
            <Archive size={14} />
            <span>{workbenchCopy.menus.noCachedExperiments}</span>
          </button>
        ) : openableClosedFiles.slice(0, 5).map((file) => (
          <button
            type="button"
            className="studio-empty-command-row studio-empty-open-row"
            key={file.id}
            onClick={() => openClosedWorkbenchFile(file.id)}
          >
            {file.kind === 'standard' ? <Activity size={14} /> : file.kind === 'ideal' ? <FlaskConical size={14} /> : <Gauge size={14} />}
            <span>{file.name}</span>
            <span className="studio-empty-open-meta">
              <strong>{getWorkbenchFileKindLabel(file.kind, workbenchCopy.files)}</strong>
              <time dateTime={new Date(file.lastOpenedAt).toISOString()}>
                {formatWorkbenchLastOpenedAt(file.lastOpenedAt, settingsLanguagePreference)}
              </time>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderEmptyStudyActions = (className = 'studio-empty-actions') => (
    <div className={className}>
      <button
        type="button"
        className="studio-empty-command-row"
        data-workbench-create-experiment="ideal"
        onClick={() => createFile('ideal')}
      >
        <FlaskConical size={14} />
        {workbenchCopy.files.createIdeal}
      </button>
      <button
        type="button"
        className="studio-empty-command-row"
        data-workbench-create-experiment="heatCapacity"
        onClick={() => createFile('heatCapacity')}
      >
        <Gauge size={14} />
        {workbenchCopy.files.createHeatCapacity}
      </button>
      <button
        type="button"
        className="studio-empty-command-row"
        data-workbench-create-experiment="standard"
        onClick={() => createFile('standard')}
      >
        <Activity size={14} />
        {workbenchCopy.files.createStandard}
      </button>
    </div>
  );

  const renderEmptyWorkbench = () => (
    <div className="studio-empty-workbench">
      <div>
        <span className="studio-empty-kicker">{workbenchCopy.files.noOpenStudy}</span>
        <h2>{workbenchCopy.files.emptyTitle}</h2>
        <p>{workbenchCopy.files.emptyBody}</p>
        {renderEmptyStudyActions()}
        {renderCachedExperimentOpenActions()}
      </div>
    </div>
  );

  const renderHeatCapacityModeControl = () => {
    if (activeFile.kind !== 'heatCapacity') return null;
    const heatCapacityActiveMode: HeatCapacityMode = activeFile.heatCapacityMode;
    const heatCapacityTeachingCompleted = activeFile.heatCapacityTeachingStatus === 'completed';
    const heatCapacityDemoActionsVisible = heatCapacityActiveMode === 'demo'
      && (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked || heatCapacityTeachingCompleted);
    const heatCapacityGuideActionsVisible = heatCapacityActiveMode === 'guide';
    const heatCapacityFreeActionsVisible = heatCapacityActiveMode === 'free';
    const heatCapacityModeActionsVisible = heatCapacityDemoActionsVisible || heatCapacityGuideActionsVisible || heatCapacityFreeActionsVisible;
    const heatCapacityModeSegmentClassName = (mode: HeatCapacityMode) => `studio-heat-mode-segment studio-heat-mode-segment-${mode} ${heatCapacityActiveMode === mode ? 'studio-heat-mode-segment-active' : ''}`;

    return (
      <div
        className={`studio-heat-mode-control studio-heat-mode-control-${heatCapacityActiveMode} ${heatCapacityModeActionsVisible ? 'studio-heat-mode-control-expanded' : ''}`}
        data-heat-capacity-mode-control="true"
      >
        <div
          className={heatCapacityModeSegmentClassName('demo')}
          data-heat-capacity-mode-segment="demo"
        >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'demo' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="demo"
            aria-pressed={heatCapacityActiveMode === 'demo'}
            onClick={() => {
              if (heatCapacityTeachingCompleted) {
                showHeatCapacityTeachingCompletedLockedInteraction();
                return;
              }
              if (heatCapacityActiveMode !== 'demo' || !heatCapacityDemoActionsVisible) {
                runHeatCapacityAutoDemo();
              }
            }}
          >
            {heatCapacityRealtimeCopy.modeDemo}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-demo" aria-hidden={!heatCapacityDemoActionsVisible}>
            {heatCapacityDemoActionsVisible ? (
              heatCapacityTeachingCompleted ? (
                <button
                  type="button"
                  className="studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger"
                  data-heat-capacity-mode-action="exit-teaching"
                  title={heatCapacityRealtimeCopy.exitTeachingMode}
                  aria-label={heatCapacityRealtimeCopy.exitTeachingMode}
                  onClick={exitCompletedHeatCapacityTeachingMode}
                >
                  <LogOut size={13} strokeWidth={2.7} />
                </button>
              ) : (
                <>
                  {autoDemoPaused ? (
                    <button
                      type="button"
                      className="studio-heat-mode-action studio-heat-mode-action-icon"
                      data-heat-capacity-mode-action="resume-demo"
                      title={heatCapacityRealtimeCopy.autoDemoResume}
                      aria-label={heatCapacityRealtimeCopy.autoDemoResume}
                      onClick={runHeatCapacityAutoDemo}
                    >
                      <Play size={13} strokeWidth={2.7} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="studio-heat-mode-action studio-heat-mode-action-icon"
                      data-heat-capacity-mode-action="pause-demo"
                      title={heatCapacityRealtimeCopy.autoDemoPause}
                      aria-label={heatCapacityRealtimeCopy.autoDemoPause}
                      onClick={pauseHeatCapacityAutoDemo}
                    >
                      <Pause size={13} strokeWidth={2.7} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger"
                    data-heat-capacity-mode-action="stop-demo"
                    title={heatCapacityRealtimeCopy.autoDemoStop}
                    aria-label={heatCapacityRealtimeCopy.autoDemoStop}
                    onClick={terminateHeatCapacityAutoDemo}
                  >
                    <Square size={12} strokeWidth={2.8} />
                  </button>
                </>
              )
            ) : null}
          </div>
        </div>
        <div
          className={heatCapacityModeSegmentClassName('guide')}
          data-heat-capacity-mode-segment="guide"
        >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'guide' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="guide"
            aria-pressed={heatCapacityActiveMode === 'guide'}
            onClick={() => {
              if (heatCapacityTeachingCompleted) {
                showHeatCapacityTeachingCompletedLockedInteraction();
                return;
              }
              if (heatCapacityActiveMode !== 'guide') {
                startHeatCapacityGuideExperiment();
              }
            }}
          >
            {heatCapacityRealtimeCopy.modeGuide}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-guide" aria-hidden={!heatCapacityGuideActionsVisible}>
            {heatCapacityGuideActionsVisible ? (
              <>
                <button
                  type="button"
                  className="studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger"
                  data-heat-capacity-mode-action={heatCapacityTeachingCompleted ? 'exit-teaching' : 'exit-guide'}
                  title={heatCapacityTeachingCompleted ? heatCapacityRealtimeCopy.exitTeachingMode : heatCapacityRealtimeCopy.exitGuideMode}
                  aria-label={heatCapacityTeachingCompleted ? heatCapacityRealtimeCopy.exitTeachingMode : heatCapacityRealtimeCopy.exitGuideMode}
                  onClick={exitHeatCapacityGuideMode}
                >
                  {heatCapacityTeachingCompleted
                    ? <LogOut size={13} strokeWidth={2.7} />
                    : <Square size={12} strokeWidth={2.8} />}
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div
          className={heatCapacityModeSegmentClassName('free')}
          data-heat-capacity-mode-segment="free"
        >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'free' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="free"
            aria-pressed={heatCapacityActiveMode === 'free'}
            onClick={() => {
              if (heatCapacityTeachingCompleted) {
                showHeatCapacityTeachingCompletedLockedInteraction();
                return;
              }
              if (
                heatCapacityActiveMode !== 'free' ||
                autoDemoRunning ||
                autoDemoPaused ||
                autoDemoInteractionLocked
              ) {
                enterHeatCapacityFreeMode();
              }
            }}
          >
            {heatCapacityRealtimeCopy.modeFree}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-free" aria-hidden={!heatCapacityFreeActionsVisible}>
            {heatCapacityFreeActionsVisible ? (
              <button
                type="button"
                className={`studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger ${heatCapacityFreeResetFeedbackActive ? 'studio-heat-mode-action-feedback' : ''}`}
                data-heat-capacity-mode-action="reset-free"
                title={heatCapacityRealtimeCopy.resetFreeMode}
                aria-label={heatCapacityRealtimeCopy.resetFreeMode}
                onClick={resetHeatCapacityFreeRun}
              >
                <RotateCcw size={13} strokeWidth={2.7} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewPanel = () => (
    <div className={`studio-preview ${activeFile.kind === 'heatCapacity' ? 'studio-preview-heat-capacity' : ''}`}>
      <div className={`studio-preview-stage ${activeFile.kind === 'heatCapacity' ? 'studio-heat-preview-stage' : ''}`}>
        {activeFile.kind === 'heatCapacity' ? (
          <div
            className="studio-heat-preview-mount"
            aria-label={heatCapacityRealtimeCopy.previewMountAria}
            data-heat-capacity-preview-mount="true"
            onPointerDownCapture={(event) => {
              const target = event.target instanceof Element ? event.target : null;
              if (target?.closest('[data-heat-capacity-hard-sphere-toggle="true"]')) return;
              if (autoDemoInteractionLocked) showHeatCapacityAutoDemoLockedToast();
            }}
            onWheelCapture={(event) => {
              const target = event.target instanceof Element ? event.target : null;
              if (target?.closest('[data-heat-capacity-hard-sphere-toggle="true"]')) return;
              if (autoDemoInteractionLocked) showHeatCapacityAutoDemoLockedToast();
            }}
          >
            {(() => {
              const heatCapacityTeachingCompleted = activeFile.heatCapacityTeachingStatus === 'completed';
              const activeHeatCapacityDisplay = selectActiveHeatCapacityWorkbenchDisplay(activeFile);
              const activeHeatCapacityUsesPhysicalKernel = isHeatCapacityPhysicalKernelMode(activeFile.heatCapacityMode);
              const heatCapacityDisplayPhase = activeHeatCapacityUsesPhysicalKernel
                ? getHeatCapacityFreeDisplayPhase(activeFile)
                : activeFile.heatCapacityPhase;
              const guideRecordU0ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u0')
                : null;
              const guideRecordU1ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u1')
                : null;
              const guideRecordU2ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u2')
                : null;
              const activeGuideRecordKind: HeatCapacityGuideRecordKind | null =
                guideHeatCapacityActiveFileId === activeFile.id &&
                activeFile.heatCapacityMode === 'guide' &&
                !autoDemoRunning &&
                !autoDemoInteractionLocked
                  ? guideRecordU0ButtonState?.visible
                    ? 'u0'
                    : guideRecordU1ButtonState?.visible
                      ? 'u1'
                      : guideRecordU2ButtonState?.visible
                        ? 'u2'
                        : null
                  : null;
              const getGuideRecordLabel = (kind: HeatCapacityGuideRecordKind) => (
                kind === 'u0'
                  ? heatCapacityRealtimeCopy.recordU0
                  : kind === 'u1'
                    ? heatCapacityRealtimeCopy.recordU1
                    : heatCapacityRealtimeCopy.recordU2
              );
              const heatCapacityDemoStepPanel = autoDemoStepPanelMode !== 'hidden' && (autoDemoRunning || autoDemoPaused || autoDemoStepTitle) ? (
                <div
                  className={`studio-heat-demo-step-panel studio-heat-demo-step-panel-${autoDemoStepPanelMode}`}
                  data-heat-capacity-demo-step-panel="true"
                >
                  <div className="studio-heat-demo-step-kicker">
                    <span>{autoDemoRunning || autoDemoPaused ? `Step ${autoDemoStepIndex} / ${autoDemoStepCount}` : heatCapacityRealtimeCopy.autoDemoFinishedLabel}</span>
                    <i>{autoDemoPaused ? heatCapacityRealtimeCopy.demoPausedLabel : autoDemoRunning ? heatCapacityRealtimeCopy.demoRunning : heatCapacityRealtimeCopy.demoDoneLabel}</i>
                  </div>
                  <strong>{renderScientificText(autoDemoStepTitle || heatCapacityRealtimeCopy.autoDemoFinishedTitle)}</strong>
                  <p>{renderScientificText(autoDemoStepDescription || heatCapacityRealtimeCopy.autoDemoFinishedDescription)}</p>
                  <div><span>{heatCapacityRealtimeCopy.demoTargetLabel}</span><em>{renderScientificText(autoDemoStepTarget || '--')}</em></div>
                  <div><span>{heatCapacityRealtimeCopy.demoProgressLabel}</span><em>{renderScientificText(autoDemoStepProgressCriterion || '--')}</em></div>
                  <div><span>{heatCapacityRealtimeCopy.demoObservationLabel}</span><em>{renderScientificText(autoDemoStepNote || heatCapacityRealtimeCopy.demoFallbackNote)}</em></div>
                </div>
              ) : null;
              const heatCapacityGuideProcessPromptBlocked = heatCapacityPressureAlarmVisible ||
                heatCapacityFreeSpeedNoticeVisible ||
                autoDemoCompletionMessage ||
                autoDemoRunning ||
                autoDemoPaused ||
                autoDemoInteractionLocked;
              const heatCapacityGuideStepPanel = heatCapacityGuideProcessPromptBlocked
                ? null
                : (
                  guideHeatCapacityActiveFileId === activeFile.id &&
                  activeFile.heatCapacityMode === 'guide' &&
                  activeHeatCapacityGuideStep !== 'idle' &&
                  activeHeatCapacityGuideStep !== 'completed'
                )
                  ? (() => {
                    const heatCapacityGuideCurrentStepIndex = getHeatCapacityGuideChecklistIndex(activeHeatCapacityGuideStep);
                    const heatCapacityGuideViewedStepIndex = Math.max(
                      0,
                      Math.min(HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1, heatCapacityGuideChecklistViewedIndex),
                    );
                    const heatCapacityGuideSteps = HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.map((step, index) => {
                      const detail = getGuideStepGuidance(step.guideStep, activeFile).message;
                      const status = index < heatCapacityGuideCurrentStepIndex
                        ? 'done'
                        : index === heatCapacityGuideCurrentStepIndex
                          ? 'current'
                          : 'pending';
                      return {
                        ...step,
                        detail,
                        index,
                        status,
                        centerDistance: Math.abs(index - heatCapacityGuideViewedStepIndex),
                        signedDistance: index - heatCapacityGuideViewedStepIndex,
                      };
                    });
                    const viewedStep = heatCapacityGuideSteps[heatCapacityGuideViewedStepIndex] ?? heatCapacityGuideSteps[0];
                    const baseOffset = HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX -
                      heatCapacityGuideViewedStepIndex * HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
                    const trackStyle = {
                      '--studio-heat-guide-step-base-offset': `${baseOffset}px`,
                      '--studio-heat-guide-step-visual-offset': `${heatCapacityGuideChecklistVisualOffsetRef.current}px`,
                    } as React.CSSProperties;
                    return (
                      <section
                        className="studio-heat-guide-step-panel"
                        data-heat-capacity-guide-step-panel="true"
                        aria-label={settingsLanguagePreference === 'en' ? 'Guide checklist' : settingsLanguagePreference === 'zh-TW' ? '引導清單' : '引导清单'}
                      >
                        <div className="studio-heat-guide-step-header">
                          <span>{settingsLanguagePreference === 'en' ? 'Guide checklist' : settingsLanguagePreference === 'zh-TW' ? '引導清單' : '引导清单'}</span>
                          <em>
                            {settingsLanguagePreference === 'en' ? 'Step' : settingsLanguagePreference === 'zh-TW' ? '步驟' : '步骤'}
                            {' '}
                            {heatCapacityGuideViewedStepIndex + 1}
                            {' / '}
                            {heatCapacityGuideSteps.length}
                          </em>
                          <strong>{renderScientificText(viewedStep.title[settingsLanguagePreference])}</strong>
                        </div>
                        <div
                          className="studio-heat-guide-step-list"
                          data-heat-capacity-guide-step-list="true"
                          onWheel={handleHeatCapacityGuideChecklistWheel}
                        >
                          <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-top" aria-hidden="true" />
                          <div className="studio-heat-guide-step-center-rail" aria-hidden="true" />
                          <div
                            ref={heatCapacityGuideChecklistTrackRef}
                            className="studio-heat-guide-step-track studio-heat-guide-step-track-snapping"
                            style={trackStyle}
                          >
                            {heatCapacityGuideSteps.map((step) => {
                              const isCentered = step.index === heatCapacityGuideViewedStepIndex;
                              const requiredRecordKind: HeatCapacityGuideRecordKind | null =
                                step.guideStep === 'recordU0Required'
                                  ? 'u0'
                                  : step.guideStep === 'recordU1Required'
                                    ? 'u1'
                                    : step.guideStep === 'recordU2Required'
                                      ? 'u2'
                                      : null;
                              const stepRecordKind = step.status === 'current' && isCentered && requiredRecordKind === activeGuideRecordKind
                                ? requiredRecordKind
                                : null;
                              return (
                                <div
                                  key={step.id}
                                  className={`studio-heat-guide-step-row studio-heat-guide-step-row-${step.status} ${isCentered ? 'studio-heat-guide-step-row-centered' : ''} ${stepRecordKind ? 'studio-heat-guide-step-row-with-record' : ''}`}
                                  data-heat-capacity-guide-step-row={step.id}
                                  data-heat-capacity-guide-step-status={step.status}
                                  data-heat-capacity-guide-step-centered={isCentered ? 'true' : 'false'}
                                  style={{
                                    '--studio-heat-guide-step-distance': step.centerDistance,
                                    '--studio-heat-guide-step-signed-distance': step.signedDistance,
                                  } as React.CSSProperties}
                                >
                                  <span className="studio-heat-guide-step-marker" aria-hidden="true">
                                    <i />
                                  </span>
                                  <span className="studio-heat-guide-step-text">
                                    <strong>{renderScientificText(step.title[settingsLanguagePreference])}</strong>
                                    <em>{renderScientificText(step.detail)}</em>
                                  </span>
                                  {stepRecordKind ? (
                                    <span
                                      className={`studio-heat-guide-step-record-action studio-heat-record-controls ${guideHeatCapacityPulseActive && guideHeatCapacityFocusControlId?.startsWith('record') ? 'studio-heat-record-controls-pulse' : ''}`}
                                      data-heat-capacity-guide-step-record-action="true"
                                      data-heat-capacity-record-controls="true"
                                    >
                                      <button
                                        type="button"
                                        data-heat-capacity-guided-record={stepRecordKind}
                                        onClick={() => recordHeatCapacityGuideSample(stepRecordKind)}
                                      >
                                        {renderScientificText(getGuideRecordLabel(stepRecordKind))}
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                          <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-bottom" aria-hidden="true" />
                        </div>
                      </section>
                    );
                  })()
                  : null;
              const heatCapacityTopRightOverlay = heatCapacityDemoStepPanel || heatCapacityGuideStepPanel ? (
                <div className="studio-heat-top-right-stack" data-heat-capacity-top-right-stack="true">
                  {heatCapacityDemoStepPanel}
                  {!heatCapacityDemoStepPanel ? heatCapacityGuideStepPanel : null}
                </div>
              ) : null;
              const heatCapacityActiveSpeedMultiplier = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuideWorkflow.speedMultiplier
                : activeFile.heatCapacityFreeEquilibriumSpeedMultiplier;
              const heatCapacityFreeSpeedIndex = activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide'
                ? Math.max(
                    0,
                    HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS.indexOf(
                      heatCapacityActiveSpeedMultiplier,
                    ),
                  )
                : 0;
              const heatCapacityFreeActiveTrialIndex = activeFile.heatCapacityMode === 'free'
                ? getActiveHeatCapacityFreeTrialIndex(activeFile)
                : -1;
              const heatCapacityFreeActiveTrial = heatCapacityFreeActiveTrialIndex >= 0
                ? activeFile.heatCapacityFreeTrials[heatCapacityFreeActiveTrialIndex] ?? null
                : null;
              const heatCapacityFreeWaitTimer = activeFile.heatCapacityMode === 'guide'
                ? deriveHeatCapacityGuideExperimentTimer(
                    activeFile.heatCapacityGuideWorkflow,
                    activeFile.heatCapacityGuidePhysicsState.simulationTimeS,
                  )
                : activeFile.heatCapacityMode === 'free'
                  ? deriveHeatCapacityFreeExperimentTimer(
                    heatCapacityFreeActiveTrial,
                    activeFile.heatCapacityFreePhysicsState,
                  )
                  : null;
              const heatCapacityFreeWaitTimerDisplay =
                heatCapacityFreeWaitTimer?.stage === 'u1-wait' ||
                heatCapacityFreeWaitTimer?.stage === 'u2-wait' ||
                heatCapacityFreeWaitTimer?.stage === 'u1-ready' ||
                heatCapacityFreeWaitTimer?.stage === 'u2-ready'
                  ? {
                      label: heatCapacityFreeWaitTimer.stage === 'u1-wait' || heatCapacityFreeWaitTimer.stage === 'u1-ready'
                        ? heatCapacityRealtimeCopy.freeWaitTimerLabel.u1
                        : heatCapacityRealtimeCopy.freeWaitTimerLabel.u2,
                      elapsedText: formatHeatCapacityFreeWaitTimer(heatCapacityFreeWaitTimer.elapsedS),
                      targetText: formatHeatCapacityFreeWaitTimer(heatCapacityFreeWaitTimer.targetS),
                      progressRatio: heatCapacityFreeWaitTimer.targetS > 0
                        ? clamp(heatCapacityFreeWaitTimer.elapsedS / heatCapacityFreeWaitTimer.targetS, 0, 1)
                        : 0,
                      progressColor: getHeatCapacityFreeWaitTimerProgressColor(
                        heatCapacityFreeWaitTimer.targetS > 0
                          ? clamp(heatCapacityFreeWaitTimer.elapsedS / heatCapacityFreeWaitTimer.targetS, 0, 1)
                          : 0,
                      ),
                      statusText: heatCapacityFreeWaitTimer.stage === 'u1-wait' || heatCapacityFreeWaitTimer.stage === 'u1-ready'
                        ? activeFile.heatCapacityMode === 'guide'
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                          : heatCapacityFreeActiveTrial?.u1
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.rerecord
                          : heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                        : activeFile.heatCapacityMode === 'guide'
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                          : heatCapacityFreeActiveTrial?.u2
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.rerecord
                          : heatCapacityRealtimeCopy.freeWaitRecordStatus.pending,
                    }
                  : null;
              const heatCapacityFreeSpeedOptionsDisabled = activeFile.heatCapacityMode === 'guide' &&
                (
                  heatCapacityFreeWaitTimer?.stage === 'u1-ready' ||
                  heatCapacityFreeWaitTimer?.stage === 'u2-ready'
                );
              const heatCapacityTopCenterOverlay = heatCapacityFreeSpeedOverlayMounted && (activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide') ? (
                <div
                  className={`studio-heat-free-speed-overlay ${
                    heatCapacityFreeSpeedOverlayExiting
                      ? 'studio-heat-free-speed-overlay-exiting'
                      : 'studio-heat-free-speed-overlay-visible'
                  }${
                    activeFile.heatCapacityMode === 'guide' && heatCapacityFreeWaitTimerDisplay
                      ? ' studio-heat-free-speed-overlay-guide-wait'
                      : ''
                  }`}
                  data-heat-capacity-free-speed-overlay="true"
                >
                  <div
                    className={`studio-heat-free-speed-control studio-heat-free-speed-control-index-${heatCapacityFreeSpeedIndex}${
                      heatCapacityFreeWaitTimerDisplay ? ' studio-heat-free-speed-control-with-timer' : ''
                    }`}
                    data-heat-capacity-free-speed-control="true"
                    role="radiogroup"
                    aria-label={heatCapacityRealtimeCopy.freeSpeedAria}
                  >
                    {heatCapacityFreeWaitTimerDisplay ? (
                      <svg
                        className="studio-heat-free-speed-shell"
                        viewBox="0 0 260 82"
                        aria-hidden="true"
                      >
                        <path
                          className="studio-heat-free-speed-timer-cabin"
                          d="M 74 50 L 92 76 H 179 C 191 76 200 74 210 68 C 218 62 224 55 225 49 L 74 50 Z"
                        />
                        <rect
                          className="studio-heat-free-speed-main-capsule"
                          x="0"
                          y="12"
                          width="238"
                          height="38"
                          rx="19"
                          ry="19"
                        />
                      </svg>
                    ) : null}
                    <span className="studio-heat-free-speed-screw" aria-hidden="true" />
                    <span className="studio-heat-free-speed-label" aria-hidden="true">
                      <span>{heatCapacityRealtimeCopy.freeSpeedLabelCode}</span>
                      <strong>{heatCapacityRealtimeCopy.freeSpeedLabel}</strong>
                    </span>
                    <span className="studio-heat-free-speed-options">
                      <span className="studio-heat-free-speed-thumb" aria-hidden="true" />
                      {HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS.map((speed) => {
                        const selected = heatCapacityActiveSpeedMultiplier === speed;
                        return (
                          <button
                            key={speed}
                            type="button"
                            className={`studio-heat-free-speed-circle ${selected ? 'studio-heat-free-speed-circle-active' : ''}`}
                            data-heat-capacity-free-speed-option={speed}
                            aria-checked={selected}
                            role="radio"
                            disabled={heatCapacityFreeSpeedOptionsDisabled}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (heatCapacityFreeSpeedOptionsDisabled) return;
                              updateHeatCapacityFreeEquilibriumSpeedMultiplier(speed);
                            }}
                          >
                            ×{speed}
                          </button>
                        );
                      })}
                    </span>
                    {heatCapacityFreeWaitTimerDisplay ? (
                      <span
                        className="studio-heat-free-wait-timer"
                        data-heat-capacity-free-wait-timer="true"
                        style={{
                          '--studio-heat-free-wait-progress': `${heatCapacityFreeWaitTimerDisplay.progressRatio * 100}%`,
                          '--studio-heat-free-wait-progress-color': heatCapacityFreeWaitTimerDisplay.progressColor,
                        } as React.CSSProperties & Record<
                          '--studio-heat-free-wait-progress' | '--studio-heat-free-wait-progress-color',
                          string
                        >}
                      >
                        <span>{heatCapacityFreeWaitTimerDisplay.label}</span>
                        <strong>
                          {heatCapacityFreeWaitTimerDisplay.elapsedText}
                          /
                          {heatCapacityFreeWaitTimerDisplay.targetText}
                        </strong>
                        <em>{heatCapacityFreeWaitTimerDisplay.statusText}</em>
                      </span>
                    ) : null}
                    <span className="studio-heat-free-speed-screw" aria-hidden="true" />
                  </div>
                </div>
              ) : null;
              const freeRecordU0ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u0')
                : null;
              const freeRecordU1ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u1')
                : null;
              const freeRecordU2ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u2')
                : null;
              const renderFreeRecordButton = (
                kind: 'u0' | 'u1' | 'u2',
                state: NonNullable<typeof freeRecordU0ButtonState>,
              ) => {
                if (!state.visible) return null;
                const suffix = kind === 'u0' ? 'U₀' : kind === 'u1' ? 'U₁' : 'U₂';
                const label = `${state.mode === 'rerecord' ? '重新记录' : '记录'} ${suffix}`;
                return (
                  <button
                    type="button"
                    data-heat-capacity-free-record={kind}
                    onClick={() => recordFreeHeatCapacitySample(kind)}
                  >
                    {renderScientificText(label)}
                  </button>
                );
              };
              const heatCapacityBottomRightOverlay = (
                <div className="studio-heat-preview-control-stack" data-heat-capacity-preview-control-stack="true">
                  {activeFile.heatCapacityMode === 'free' ? (
                    <div
                      className="studio-heat-record-controls studio-heat-free-record-controls"
                      data-heat-capacity-free-record-controls="true"
                    >
                      {freeRecordU0ButtonState ? renderFreeRecordButton('u0', freeRecordU0ButtonState) : null}
                      {freeRecordU1ButtonState ? renderFreeRecordButton('u1', freeRecordU1ButtonState) : null}
                      {freeRecordU2ButtonState ? renderFreeRecordButton('u2', freeRecordU2ButtonState) : null}
                    </div>
                  ) : null}
                  {(() => {
                    const guideStep = getHeatCapacityGuideStep(activeFile);
                    const activeRecordKind = guideHeatCapacityActiveFileId === activeFile.id && !autoDemoRunning && !autoDemoInteractionLocked
                      ? activeFile.heatCapacityMode !== 'guide'
                        ? guideStep === 'recordU0Required'
                          ? 'u0'
                          : guideStep === 'recordU1Required'
                            ? 'u1'
                            : guideStep === 'recordU2Required'
                              ? 'u2'
                              : null
                        : null
                      : null;
                    const visibleRecordKind = activeFile.heatCapacityMode === 'guide'
                      ? null
                      : activeRecordKind ?? heatCapacityRecordControlsClosing;
                    if (!visibleRecordKind) return null;
                    const label = visibleRecordKind === 'u0'
                      ? heatCapacityRealtimeCopy.recordU0
                      : visibleRecordKind === 'u1'
                        ? heatCapacityRealtimeCopy.recordU1
                        : heatCapacityRealtimeCopy.recordU2;
                    return (
                      <div
                        className={`studio-heat-record-controls ${guideHeatCapacityPulseActive && guideHeatCapacityFocusControlId?.startsWith('record') ? 'studio-heat-record-controls-pulse' : ''} ${!activeRecordKind ? 'studio-heat-record-controls-exiting' : ''}`}
                        data-heat-capacity-record-controls="true"
                      >
                        <button
                          type="button"
                          data-heat-capacity-guided-record={visibleRecordKind}
                          disabled={!activeRecordKind}
                          onClick={() => recordHeatCapacityGuideSample(visibleRecordKind)}
                        >
                          {renderScientificText(label)}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
              const heatCapacityCenterOverlay = (
                <>
                  {heatCapacityPressureAlarmVisible ? (
                    <div className="studio-heat-pressure-warning" data-heat-capacity-pressure-warning="true" role="alert">
                      <div className="studio-heat-pressure-warning-kicker">
                        <span>{heatCapacityRealtimeCopy.safetyLimit}</span>
                        <em>{heatCapacityRealtimeCopy.safetyActive}</em>
                      </div>
                      <strong>{heatCapacityRealtimeCopy.pressureAlarmTitle}</strong>
                      <span>{heatCapacityRealtimeCopy.pressureWarningFallback}</span>
                      <em>{heatCapacityRealtimeCopy.pressureWarningObserve}</em>
                    </div>
                  ) : null}
                  {heatCapacityFreeSpeedNoticeVisible && !heatCapacityPressureAlarmVisible ? (
                    <div className="studio-heat-free-speed-notice" data-heat-capacity-free-speed-notice="true">
                      <span className="studio-heat-toast-kicker">{heatCapacityRealtimeCopy.freeSpeedNoticeKicker}</span>
                      <strong>{heatCapacityRealtimeCopy.freeSpeedNotice}</strong>
                    </div>
                  ) : null}
                  {autoDemoCompletionMessage ? (
                    <div className="studio-heat-demo-complete-toast" data-heat-capacity-demo-complete-toast="true">
                      <span className="studio-heat-toast-kicker">{heatCapacityRealtimeCopy.toastSystemKicker}</span>
                      <strong>{autoDemoCompletionMessage}</strong>
                    </div>
                  ) : null}
                  {heatCapacityToastCurrent ? (
                    <div
                      key={heatCapacityToastCurrent.id}
                      className={`studio-heat-guide-step-hint studio-heat-guide-step-hint-${heatCapacityToastCurrent.level}`}
                      data-heat-capacity-guide-step-hint="true"
                      data-heat-capacity-toast="true"
                      data-heat-capacity-toast-level={heatCapacityToastCurrent.level}
                    >
                      <span className="studio-heat-toast-kicker">{heatCapacityToastCurrent.level}</span>
                      <strong>{renderScientificText(heatCapacityToastCurrent.text)}</strong>
                    </div>
                  ) : null}
                </>
              );
              const heatCapacityBottomCenterOverlay = null;
              const heatCapacityGuideStrongTargetSpec = guideHeatCapacityStrongReminderActive
                ? getHeatCapacityGuideStrongTargetSpec(guideHeatCapacityStrongReminderControlId)
                : null;
              const heatCapacityGuideFocusMode = heatCapacityGuideStrongTargetSpec?.focusMode ?? null;
              const heatCapacityGuideMaskHoles = heatCapacityGuideStrongTargetSpec
                ? getHeatCapacityGuideStrongMaskHoles(
                  heatCapacityGuideStrongTargetSpec,
                  heatCapacityGuideProjectedHoles,
                  heatCapacityGuideMaskRef.current,
                  heatCapacityGuideMaskBounds,
                )
                : [];
              const heatCapacityGuideMaskId = heatCapacityGuideStrongTargetSpec
                ? `heat-capacity-guide-mask-${heatCapacityGuideStrongTargetSpec.id}`
                : 'heat-capacity-guide-mask';
              const heatCapacityGuideStrongReminderText = heatCapacityGuideStrongTargetSpec
                ? heatCapacityRealtimeCopy[heatCapacityGuideStrongTargetSpec.reminderCopyKey ?? 'guideStrongReminder']
                : heatCapacityRealtimeCopy.guideStrongReminder;
              const heatCapacityGuideMaskOverlay = heatCapacityGuideStrongTargetSpec ? (
                <div
                  ref={heatCapacityGuideMaskRef}
                  className={`studio-heat-guide-strong-mask studio-heat-guide-strong-mask-${heatCapacityGuideStrongTargetSpec.id}`}
                  data-heat-capacity-guide-strong-mask="true"
                  data-heat-capacity-guide-mask-target={heatCapacityGuideStrongTargetSpec.id}
                >
                  <svg
                    className="studio-heat-guide-strong-mask-svg"
                    viewBox={`0 0 ${heatCapacityGuideMaskBounds.width} ${heatCapacityGuideMaskBounds.height}`}
                    aria-hidden="true"
                  >
                    <defs>
                      <mask id={heatCapacityGuideMaskId} maskUnits="userSpaceOnUse">
                        <rect x="0" y="0" width={heatCapacityGuideMaskBounds.width} height={heatCapacityGuideMaskBounds.height} fill="#fff" />
                        {heatCapacityGuideMaskHoles.map((hole) => renderHeatCapacityGuideStrongMaskHole(hole, 'mask'))}
                      </mask>
                    </defs>
                    <rect
                      className="studio-heat-guide-strong-dim"
                      x="0"
                      y="0"
                      width={heatCapacityGuideMaskBounds.width}
                      height={heatCapacityGuideMaskBounds.height}
                      mask={`url(#${heatCapacityGuideMaskId})`}
                    />
                    <g>
                      {heatCapacityGuideMaskHoles.map((hole) => renderHeatCapacityGuideStrongMaskHole(hole, 'outline'))}
                    </g>
                  </svg>
                  <div className="studio-heat-guide-strong-card">
                    <strong>{renderScientificText(heatCapacityGuideStrongReminderText)}</strong>
                  </div>
                </div>
              ) : null;
              const heatCapacitySceneNow = Date.now();
              const heatCapacityHardSphereGasTemperatureK = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.gasTemperatureK
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreePhysicsState.gasTemperatureK
                  : activeFile.gasTemperatureK;
              const heatCapacityHardSphereAmbientTemperatureK = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreePhysicsConfig.environment.ambientTemperatureK
                  : activeFile.ambientTemperatureK;
              const heatCapacityHardSphereGasAmountRatio = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.gasAmountRatio
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreePhysicsState.gasAmountRatio
                  : clampHeatCapacityHardSphereNumber(
                      (Math.max(0.001, activeFile.gasPressureKPaAbs) / Math.max(0.001, activeFile.ambientPressureKPa)) *
                        (Math.max(1, heatCapacityHardSphereAmbientTemperatureK) / Math.max(1, heatCapacityHardSphereGasTemperatureK)),
                      0.05,
                      2.5,
                    );
              const activeHeatCapacityUsesVisualPhysics = activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide';
              const heatCapacityPhysicalReleaseReference = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.releaseReference
                : activeFile.heatCapacityFreePhysicsState.releaseReference;
              const heatCapacityPhysicalStopcockFlowOpen = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityStopcockState(activeFile.stopcockAngleDeg) === 'open' &&
                  heatCapacityPhysicalReleaseReference !== null
                : activeFile.heatCapacityFreeStopcockFlowOpen;
              const physicalReleaseFlowActive = activeHeatCapacityUsesVisualPhysics &&
                heatCapacityPhysicalStopcockFlowOpen &&
                heatCapacityPhysicalReleaseReference !== null &&
                activeFile.pressureDeltaKPa > 0.08;
              const teachingStopcockFlowOpen = getHeatCapacityStopcockState(activeFile.stopcockAngleDeg) === 'open';
              const teachingReleaseRemainingMs = !activeHeatCapacityUsesVisualPhysics &&
                typeof activeFile.pressureReleaseBurstUntilMs === 'number'
                ? Math.max(0, activeFile.pressureReleaseBurstUntilMs - heatCapacitySceneNow)
                : 0;
              const teachingReleaseFlowActive = !activeHeatCapacityUsesVisualPhysics &&
                teachingStopcockFlowOpen &&
                teachingReleaseRemainingMs > 0;
              const teachingReleaseProgress = teachingReleaseFlowActive
                ? Math.min(1, Math.max(0, 1 - teachingReleaseRemainingMs / HEAT_CAPACITY_RELEASE_BURST_DURATION_MS))
                : 0;
              const releaseFlowActive = physicalReleaseFlowActive || teachingReleaseFlowActive;
              const stopcockFlowOpen = activeHeatCapacityUsesVisualPhysics
                ? heatCapacityPhysicalStopcockFlowOpen
                : teachingStopcockFlowOpen;
              const heatCapacityHardSphereReleaseTimeline: HeatCapacityHardSphereReleaseTimeline = (() => {
                const gasAmountRatio = heatCapacityHardSphereGasAmountRatio;
                const pressureFactor = clampHeatCapacityHardSphereNumber(activeFile.pressureDeltaKPa / 6, 0, 1);
                const idleTimeline = {
                  ...HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
                  amountBeforeRatio: gasAmountRatio,
                  amountCurrentRatio: gasAmountRatio,
                  amountTargetRatio: gasAmountRatio,
                  pressureFactor,
                };

                if (activeHeatCapacityUsesVisualPhysics) {
                  const releaseReference = heatCapacityPhysicalReleaseReference;
                  if (
                    heatCapacityPhysicalStopcockFlowOpen &&
                    releaseReference
                  ) {
                    const physicalState = activeFile.heatCapacityMode === 'guide'
                      ? activeFile.heatCapacityGuidePhysicsState
                      : activeFile.heatCapacityFreePhysicsState;
                    const elapsedS = Math.max(
                      0,
                      physicalState.currentStopcockOpenDurationS,
                    );
                    const progress = releaseReference.reachedAmbientAtS === null
                      ? Math.min(1, Math.max(0, elapsedS / FREE_RELEASE_MAIN_DURATION_S))
                      : 1;
                    const gasTemperatureK = Math.max(1, heatCapacityHardSphereGasTemperatureK);
                    const ambientPressureAmountRatio =
                      heatCapacityHardSphereAmbientTemperatureK / gasTemperatureK;
                    return {
                      phase: releaseReference.reachedAmbientAtS === null
                        ? elapsedS > FREE_RELEASE_RESPONSE_DELAY_S ? 'main-release' : 'response-delay'
                        : 'post-release-exchange',
                      elapsedS,
                      responseDelayS: FREE_RELEASE_RESPONSE_DELAY_S,
                      mainDurationS: FREE_RELEASE_MAIN_DURATION_S,
                      progress,
                      pressureFactor,
                      amountBeforeRatio: releaseReference.amountBeforeRatio,
                      amountCurrentRatio: gasAmountRatio,
                      amountTargetRatio: ambientPressureAmountRatio,
                    };
                  }

                  if (!heatCapacityPhysicalStopcockFlowOpen && releaseReference?.reachedAmbientAtS === null) {
                    return {
                      ...idleTimeline,
                      phase: 'partial-stopped',
                      responseDelayS: FREE_RELEASE_RESPONSE_DELAY_S,
                      mainDurationS: FREE_RELEASE_MAIN_DURATION_S,
                    };
                  }

                  return idleTimeline;
                }

                if (teachingReleaseFlowActive) {
                  const teachingReleaseAmountDelta = 0.018 + pressureFactor * 0.042;
                  return {
                    phase: teachingReleaseProgress > 0 ? 'main-release' : 'response-delay',
                    elapsedS: teachingReleaseProgress * (HEAT_CAPACITY_RELEASE_BURST_DURATION_MS / 1000),
                    responseDelayS: 0,
                    mainDurationS: HEAT_CAPACITY_RELEASE_BURST_DURATION_MS / 1000,
                    progress: teachingReleaseProgress,
                    pressureFactor,
                    amountBeforeRatio: gasAmountRatio + teachingReleaseAmountDelta,
                    amountCurrentRatio: gasAmountRatio + teachingReleaseAmountDelta * (1 - teachingReleaseProgress),
                    amountTargetRatio: gasAmountRatio,
                  };
                }

                if (stopcockFlowOpen && activeFile.pressureDeltaKPa <= 0.08) {
                  return {
                    ...idleTimeline,
                    phase: 'post-release-exchange',
                    responseDelayS: 0,
                    mainDurationS: HEAT_CAPACITY_RELEASE_BURST_DURATION_MS / 1000,
                    progress: 1,
                  };
                }

                return idleTimeline;
              })();
              const activePumpProcesses = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.pumpProcesses
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreePhysicsState.pumpProcesses ?? []
                  : [];
              const pumpFlowIntensity = Math.min(1.6, activePumpProcesses.reduce((total, process) => (
                total + Math.max(0, 1 - process.appliedProgress)
              ), 0));
              const pumpFlowActive = pumpFlowIntensity > 0 ||
                (!activeHeatCapacityUsesVisualPhysics && activeFile.pumpValveOpen && activeFile.pumpBulbState === 'compressing');
              const heatCapacityHardSpherePaused = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuideWorkflow.paused
                : false;
              return (
                <HeatCapacityInstrumentScene
                  performanceMode={settingsPerformanceMode}
                  sceneTheme={resolvedWorkbenchTheme}
                  language={settingsLanguagePreference}
                  autoDemoActive={autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked}
                  powerOn={activeFile.powerOn}
                  stopcockAngleDeg={activeFile.stopcockAngleDeg}
                  pressureZeroAdjusted={activeFile.pressureZeroAdjusted}
                  pressureZeroKnobAngle={activeFile.pressureZeroKnobAngle}
                  pressureZeroOffset={activeFile.pressureZeroOffset}
                  pressureZeroDisplayText={activeFile.pressureZeroDisplayText}
                  pressureSignalRawReadoutMv={activeFile.pressureSignalRawReadoutMv}
                  pressureSignalReadoutMv={activeFile.pressureSignalReadoutMv}
                  pressureGaugeDisplayValue={activeFile.pressureGaugeDisplayValue}
                  gaugePressureMinKPa={activeFile.gaugePressureMinKPa}
                  gaugePressureMaxKPa={activeFile.gaugePressureMaxKPa}
                  pressureSafetyThresholdKPa={activeFile.pressureSafetyThresholdKPa}
                  pressureOverLimit={activeFile.pressureOverLimit}
                  pressureZeroAdjustMode={activeFile.pressureZeroAdjustMode}
                  pressureKPa={activeFile.pressureKPa}
                  pressureDeltaKPa={activeFile.pressureDeltaKPa}
                  gasAmountRatio={heatCapacityHardSphereGasAmountRatio}
                  gasTemperatureK={heatCapacityHardSphereGasTemperatureK}
                  ambientTemperatureK={heatCapacityHardSphereAmbientTemperatureK}
                  pressureLimitKPa={activeFile.pressureLimitKPa}
                  pumpValveOpen={activeFile.pumpValveOpen}
                  pumpValveState={activeFile.pumpValveState}
                  pumpBulbState={activeFile.pumpBulbState}
                  pumpPulseId={heatCapacityPumpPulseId}
                  pumpFrequency={activeFile.pumpFrequency}
                  pumpFrequencyStatus={activeFile.pumpFrequencyStatus}
                  pumpHint={activeFile.pumpHint}
                  vesselPressureReadoutKPa={activeFile.vesselPressureReadoutKPa}
                  vesselTemperatureReadoutK={activeFile.vesselTemperatureReadoutK}
                  phase={heatCapacityDisplayPhase}
                  temperatureSignalMv={activeFile.powerOn ? activeHeatCapacityDisplay.temperatureMv : null}
                  pressureSignalMv={activeFile.powerOn ? activeHeatCapacityDisplay.pressureMv : null}
                  pressureReleaseBurstActive={!activeHeatCapacityUsesPhysicalKernel && typeof activeFile.pressureReleaseBurstUntilMs === 'number' && heatCapacitySceneNow <= activeFile.pressureReleaseBurstUntilMs}
                  releaseFlowActive={releaseFlowActive}
                  releaseTimeline={heatCapacityHardSphereReleaseTimeline}
                  pumpFlowActive={pumpFlowActive}
                  pumpFlowIntensity={pumpFlowIntensity}
                  hardSphereViewEnabled={activeFile.hardSphereViewEnabled}
                  hardSphereViewLocked={false}
                  particleMultiplier={heatCapacityQualityProfile.particleMultiplier}
                  speedMultiplier={heatCapacityQualityProfile.speedMultiplier}
                  hardSphereVisualResetKey={heatCapacityHardSphereVisualResetKey}
                  hardSpherePaused={heatCapacityHardSpherePaused}
                  interactionLocked={autoDemoInteractionLocked || heatCapacityTeachingCompleted}
                  cameraInteractionLocked={autoDemoInteractionLocked}
                  demoFocusControlId={guideHeatCapacityFocusControlId ?? demoFocusControlId}
                  demoFocusPulseActive={demoFocusPulseActive || guideHeatCapacityPulseActive}
                  guideRollbackAnimation={guideHeatCapacityRollback?.animation ?? null}
                  guideRollbackKey={guideHeatCapacityRollback?.key ?? 0}
                  focusResetKey={heatCapacityFocusResetKey}
                  overlayTopCenter={heatCapacityTopCenterOverlay}
                  overlayTopRight={heatCapacityTopRightOverlay}
                  overlayBottomRight={heatCapacityBottomRightOverlay}
                  overlayCenter={heatCapacityCenterOverlay}
                  overlayBottomCenter={heatCapacityBottomCenterOverlay}
                  overlayGuideMask={heatCapacityGuideMaskOverlay}
                  guideFocusMode={heatCapacityGuideFocusMode}
                  guideFocusKey={guideHeatCapacityStrongReminderFocusKey}
                  onGuideTargetHolesChange={setHeatCapacityGuideProjectedHoles}
                  onFocusModeChange={updateHeatCapacityFocusMode}
                  onFocusExitRequest={handleHeatCapacityFocusExitRequest}
                  onLockedInteraction={heatCapacityTeachingCompleted
                    ? showHeatCapacityTeachingCompletedLockedInteraction
                    : showHeatCapacityAutoDemoLockedToast}
                  onPowerToggle={updateHeatCapacityPower}
                  onStopcockOpenChange={updateHeatCapacityStopcockOpen}
                  onPressureZeroFineAdjust={adjustHeatCapacityPressureZeroFineFromScene}
                  onPressureZeroCoarseAdjust={adjustHeatCapacityPressureZeroCoarseFromScene}
                  onPumpValveToggle={updateHeatCapacityPumpValve}
                  onPumpBulbPress={pressHeatCapacityPumpBulb}
                  onHardSphereViewToggle={toggleHeatCapacityHardSphereView}
                />
              );
            })()}
          </div>
        ) : (
        <div className="studio-canvas-host">
          <SimulationCanvas
            particles={activeFile.particles}
            L={activeFile.kind === 'ideal' ? activeFile.activeParams.L : activeFile.appliedParams.L}
            r={activeFile.kind === 'ideal' ? activeFile.activeParams.r : activeFile.appliedParams.r}
            isRunning={activeFile.runState === 'running'}
            t={workbenchTranslation}
            isFocused={isCanvasFocused}
            onFocusChange={setIsCanvasFocused}
            showNotification={(text) => pushLog(`${workbenchCopy.panels.previewTitle}: ${text}`)}
            supportsHover
            touchLike={false}
            isCompactLandscape={false}
            variant="workbench"
          />
        </div>
        )}
      </div>
      {activeFile.kind === 'heatCapacity' ? null : (
      <div className="studio-preview-metrics">
        <div className="studio-metric"><span>{workbenchCopy.results.temperature}</span><strong>{activeFile.stats.temperature.toFixed(3)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.pressure}</span><strong>{activeFile.stats.pressure.toFixed(4)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.meanSpeed}</span><strong>{activeFile.stats.meanSpeed.toFixed(3)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.finalState}</span><strong>{getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
      </div>
      )}
    </div>
  );

  const renderRealtimeHistogram = (title: string, bins: HistogramBin[], accent: 'blue' | 'violet') => {
    const compactBins = getCompactHistogramBins(bins);
    const maxProbability = Math.max(0.0001, ...compactBins.map((bin) => bin.probability), ...compactBins.map((bin) => bin.theoretical ?? 0));
    const runtime = activeFile.kind === 'standard' ? standardRuntimeRef.current[activeFile.id] : null;
    const sampleCount = activeFile.kind === 'standard' ? runtime?.engine.getCollectedSampleCount() ?? 0 : 0;

    return (
      <div className={`studio-live-chart studio-live-chart-${accent}`}>
        <div className="studio-live-chart-header">
          <span>{title}</span>
            <strong>{sampleCount > 0 ? workbenchCopy.results.sampleWindows(sampleCount) : workbenchCopy.results.waiting}</strong>
        </div>
        <div className="studio-live-chart-bars">
          {compactBins.length > 0 ? (
            compactBins.map((bin, index) => {
              const simulationHeight = Math.max(2, (bin.probability / maxProbability) * 100);
              const theoryHeight = bin.theoretical ? Math.max(2, (bin.theoretical / maxProbability) * 100) : 0;
              const label = `${bin.binStart.toFixed(2)}-${bin.binEnd.toFixed(2)}: ${bin.probability.toFixed(4)}`;

              return (
                <span className="studio-live-chart-bin" key={`${title}-${index}`} title={label}>
                  <i style={{ height: `${simulationHeight}%` }} />
                  {theoryHeight > 0 ? <em style={{ bottom: `${theoryHeight}%` }} /> : null}
                </span>
              );
            })
          ) : (
            <div className="studio-live-chart-empty">{workbenchCopy.results.standardRealtimeEmpty}</div>
          )}
        </div>
        <div className="studio-live-chart-axis">
          <span>{compactBins[0]?.binStart.toFixed(2) ?? '0.00'}</span>
          <span>{workbenchCopy.results.probabilityDensity}</span>
          <span>{compactBins[compactBins.length - 1]?.binEnd.toFixed(2) ?? '0.00'}</span>
        </div>
      </div>
    );
  };

  const renderIdealPressureTrace = () => {
    if (activeFile.kind !== 'ideal') return null;

    const summary = activeFile.latestPressureSummary;
    const history = summary?.history.slice(-42) ?? [];
    const maxPressure = Math.max(
      0.0001,
      ...history.map((point) => point.measuredPressure),
      ...history.map((point) => point.idealPressure),
    );

    return (
      <div className="studio-live-chart studio-ideal-pressure-chart">
        <div className="studio-live-chart-header">
          <span>{workbenchCopy.results.idealPressureTrace(getRelationLabel(activeFile.relation))}</span>
            <strong>{summary ? workbenchCopy.results.samples(summary.sampleCount) : workbenchCopy.results.waiting}</strong>
        </div>
        <div className="studio-ideal-pressure-bars">
          {history.length > 0 ? (
            history.map((point, index) => {
              const measuredHeight = Math.max(2, (point.measuredPressure / maxPressure) * 100);
              const idealHeight = Math.max(2, (point.idealPressure / maxPressure) * 100);
              return (
                <span
                  key={`${point.time}-${index}`}
                  title={`t=${point.time.toFixed(2)} ${workbenchCopy.results.measuredPressure}=${point.measuredPressure.toFixed(4)} ${workbenchCopy.results.idealPressure}=${point.idealPressure.toFixed(4)}`}
                >
                  <i style={{ height: `${measuredHeight}%` }} />
                  <em style={{ bottom: `${idealHeight}%` }} />
                </span>
              );
            })
          ) : (
            <div className="studio-live-chart-empty">{workbenchCopy.results.currentIdealPressureHint}</div>
          )}
        </div>
        <div className="studio-live-chart-axis">
          <span>{workbenchCopy.results.measuredBars}</span>
          <span>{workbenchCopy.results.idealLine}</span>
          <span>{getRelationLabel(activeFile.relation)}</span>
        </div>
      </div>
    );
  };

  const renderIdealRelationSnapshot = () => {
    if (activeFile.kind !== 'ideal') return null;

    const analysis = idealAnalysis;
    const summary = activeFile.latestPressureSummary;
    const relationValue = getRelationVariableNumericValue(activeFile.relation, activeFile.activeParams);

    return (
      <div className="studio-ideal-point-strip">
        <div><span>{workbenchCopy.results.scan}</span><strong>{formatMetric(relationValue, activeFile.relation === 'pn' ? 0 : 3)}</strong></div>
        <div><span>{workbenchCopy.results.measuredPressure}</span><strong>{formatMaybeMetric(summary?.meanPressure, 4)}</strong></div>
        <div><span>{workbenchCopy.results.idealPressure}</span><strong>{formatMaybeMetric(summary?.meanIdealPressure, 4)}</strong></div>
        <div><span>{workbenchCopy.results.gap}</span><strong>{summary?.relativeGap === null || summary?.relativeGap === undefined ? '--' : `${formatMetric(summary.relativeGap, 2)}%`}</strong></div>
        <div><span>{workbenchCopy.results.status}</span><strong>{getLocalizedStatusValue(analysis?.verdictState ?? 'insufficient', workbenchCopy)}</strong></div>
        <div><span>{workbenchCopy.results.finalState}</span><strong>{activeFile.needsReset ? workbenchCopy.parameters.idealRuntimeOnStart : getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
      </div>
    );
  };

  const renderHeatCapacityRealtimePanel = () => {
    if (activeFile.kind !== 'heatCapacity') return null;

    const getHeatCapacityPhaseLabel = (phase: typeof activeFile.heatCapacityPhase) => {
      if (phase === 'powerOff') return heatCapacityRealtimeCopy.phaseLabels.powerOff;
      if (phase === 'readyToZero') return heatCapacityRealtimeCopy.phaseLabels.readyToZero;
      if (phase === 'zeroed') return heatCapacityRealtimeCopy.phaseLabels.zeroed;
      if (phase === 'readyToPump') return heatCapacityRealtimeCopy.phaseLabels.readyToPump;
      if (phase === 'pumping') return heatCapacityRealtimeCopy.phaseLabels.pumping;
      if (phase === 'sealedStabilizing') return heatCapacityRealtimeCopy.phaseLabels.sealedStabilizing;
      if (phase === 'releasing') return heatCapacityRealtimeCopy.phaseLabels.releasing;
      if (phase === 'recovering') return heatCapacityRealtimeCopy.phaseLabels.recovering;
      return heatCapacityRealtimeCopy.phaseLabels.fallback;
    };
    const heatCapacityDisplayPhase = isHeatCapacityPhysicalKernelMode(activeFile.heatCapacityMode)
      ? getHeatCapacityFreeDisplayPhase(activeFile)
      : activeFile.heatCapacityPhase;
    const phaseLabel = getHeatCapacityPhaseLabel(heatCapacityDisplayPhase);
    const stopcockState = getHeatCapacityStopcockState(activeFile.stopcockAngleDeg);
    const stopcockStateLabel = stopcockState === 'open' ? heatCapacityRealtimeCopy.stopcock.open : heatCapacityRealtimeCopy.stopcock.closed;
    const heatCapacityRunBadge = activeFile.heatCapacityMode === 'free'
      ? heatCapacityRealtimeCopy.trialBadge(getActiveHeatCapacityFreeTrialIndex(activeFile) + 1)
      : heatCapacityRealtimeCopy.singleTrialBadge;
    const heatCapacityHeaderBadges = [
      {
        key: 'stage',
        label: `${heatCapacityRealtimeCopy.stagePrefix}${phaseLabel}`,
        className: 'studio-heat-status-badge-stage',
      },
      {
        key: 'trial',
        label: heatCapacityRunBadge,
        className: 'studio-heat-status-badge-trial',
        dataAttr: true,
      },
      ...(autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked
        ? [{
            key: 'demo',
            label: autoDemoPaused ? heatCapacityRealtimeCopy.demoPaused : autoDemoRunning ? heatCapacityRealtimeCopy.demoRunning : heatCapacityRealtimeCopy.demoReady,
            className: 'studio-heat-status-badge-mode',
          }]
        : []),
      ...(autoDemoInteractionLocked
        ? [{
            key: 'lock',
            label: heatCapacityRealtimeCopy.operationLocked,
            className: 'studio-heat-status-badge-warning',
          }]
        : []),
    ];
    const temperatureSignalValue = activeFile.powerOn && typeof activeFile.temperatureSignalMv === 'number'
      ? formatHeatCapacitySignalMv(activeFile.temperatureSignalMv)
      : '--.-';
    const pressureSignalValue = activeFile.powerOn && typeof activeFile.pressureSignalMv === 'number'
      ? formatHeatCapacitySignalMv(activeFile.pressureSignalMv)
      : '--.-';
    const currentDeltaPKPa = activeFile.powerOn &&
      typeof activeFile.pressureSignalMv === 'number' &&
      Number.isFinite(activeFile.pressureSensitivityMvPerKPa) &&
      activeFile.pressureSensitivityMvPerKPa > 0
      ? Math.max(0, activeFile.pressureSignalMv / activeFile.pressureSensitivityMvPerKPa)
      : null;
    const currentDeltaPValue = currentDeltaPKPa === null ? '--' : formatMetric(currentDeltaPKPa, 2);
    const effectivePressureSafetyStatus = heatCapacityPressureAlarmVisible ? 'danger' : activeFile.pressureSafetyStatus;
    const pressureSafetyStatusLabel = effectivePressureSafetyStatus === 'danger'
      ? heatCapacityRealtimeCopy.safety.danger
      : effectivePressureSafetyStatus === 'warning'
        ? heatCapacityRealtimeCopy.safety.warning
        : heatCapacityRealtimeCopy.safety.normal;
    const pressureSafetyNote = effectivePressureSafetyStatus === 'danger'
      ? heatCapacityRealtimeCopy.safety.dangerNote
      : effectivePressureSafetyStatus === 'warning'
        ? heatCapacityRealtimeCopy.safety.warningNote
        : heatCapacityRealtimeCopy.safety.normalNote;
    const zeroStatusLabel = activeFile.pressureZeroAdjusted
      ? heatCapacityRealtimeCopy.zeroStatus.completed
      : canZeroHeatCapacityPressure(activeFile)
        ? heatCapacityRealtimeCopy.zeroStatus.adjustable
        : heatCapacityRealtimeCopy.zeroStatus.notReady;
    const currentHint = (() => {
      if (guideHeatCapacityActiveFileId === activeFile.id && !autoDemoRunning && !autoDemoPaused && !autoDemoInteractionLocked) {
        const guideStep = getHeatCapacityGuideStep(activeFile);
        if (guideStep !== 'idle' && guideStep !== 'completed') {
          return getGuideStepGuidance(guideStep, activeFile).message;
        }
      }
      if (!activeFile.powerOn || heatCapacityDisplayPhase === 'powerOff') return heatCapacityRealtimeCopy.hints.powerOff;
      if (heatCapacityDisplayPhase === 'readyToZero') return heatCapacityRealtimeCopy.hints.readyToZero;
      if (heatCapacityDisplayPhase === 'zeroed' || heatCapacityDisplayPhase === 'readyToPump') return heatCapacityRealtimeCopy.hints.readyToPump;
      if (heatCapacityDisplayPhase === 'pumping') return heatCapacityRealtimeCopy.hints.pumping;
      if (heatCapacityDisplayPhase === 'sealedStabilizing') return heatCapacityRealtimeCopy.hints.sealedStabilizing;
      if (heatCapacityDisplayPhase === 'releasing') return heatCapacityRealtimeCopy.hints.releasing;
      if (heatCapacityDisplayPhase === 'recovering') return heatCapacityRealtimeCopy.hints.recovering;
      return activeFile.pumpHint || heatCapacityRealtimeCopy.hints.fallback;
    })();
    return (
      <div className="studio-realtime-panel studio-realtime-panel-heat">
        <div className="studio-heat-monitor-header" data-heat-capacity-realtime-header="true">
          <div className="studio-heat-monitor-title">
            <span>{heatCapacityRealtimeCopy.realtimeKicker}</span>
            <strong>{heatCapacityRealtimeCopy.realtimeTitle}</strong>
            <small>{renderScientificText(heatCapacityRealtimeCopy.realtimeSubtitle)}</small>
          </div>
          <div className="studio-heat-status-badges">
            {heatCapacityHeaderBadges.map((badge) => (
              <span
                key={badge.key}
                className={`studio-heat-status-badge ${badge.className}`}
                data-heat-capacity-trial-badge={badge.key === 'trial' ? 'true' : undefined}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
        <div className="studio-heat-live-readings" data-heat-capacity-live-readings="true">
          <div className="studio-heat-reading-card studio-heat-reading-card-primary">
            <span>{renderScientificText('Uₜ / mV')}</span>
            <strong>{temperatureSignalValue}</strong>
            <em>{heatCapacityRealtimeCopy.readings.temperature}</em>
          </div>
          <div className="studio-heat-reading-card studio-heat-reading-card-primary">
            <span>{renderScientificText('Uₚ / mV')}</span>
            <strong>{pressureSignalValue}</strong>
            <em>{heatCapacityRealtimeCopy.readings.pressure}</em>
          </div>
          <div className="studio-heat-reading-card">
            <span>{renderScientificText('ΔP / kPa')}</span>
            <strong>{currentDeltaPValue}</strong>
            <em>{renderScientificText(heatCapacityRealtimeCopy.readings.delta)}</em>
          </div>
          <div className={`studio-heat-reading-card studio-heat-safety-card studio-heat-safety-${effectivePressureSafetyStatus}`}>
            <span>{heatCapacityRealtimeCopy.readings.safety}</span>
            <strong>{pressureSafetyStatusLabel}</strong>
            <em>{pressureSafetyNote}</em>
          </div>
        </div>
        <div className="studio-heat-operation-status" data-heat-capacity-operation-status="true">
          <div><span>{heatCapacityRealtimeCopy.readings.pumpValve}</span><strong>{activeFile.pumpValveOpen ? heatCapacityRealtimeCopy.readings.opened : heatCapacityRealtimeCopy.readings.closed}</strong></div>
          <div><span>{heatCapacityRealtimeCopy.readings.stopcock}</span><strong>{stopcockStateLabel}</strong></div>
          <div><span>{heatCapacityRealtimeCopy.readings.zero}</span><strong>{zeroStatusLabel}</strong></div>
        </div>
        <div className="studio-heat-current-hint" data-heat-capacity-current-hint="true">
          <span>{heatCapacityRealtimeCopy.readings.currentHint}</span>
          <strong>{renderScientificText(currentHint)}</strong>
        </div>
      </div>
    );
  };

  const renderRealtimePanel = () => (
    activeFile.kind === 'heatCapacity' ? renderHeatCapacityRealtimePanel() : (
    <div className={`studio-realtime-panel ${activeFile.kind === 'ideal' ? 'studio-realtime-panel-ideal' : 'studio-realtime-panel-standard'}`}>
      <div className={`studio-realtime-summary ${activeFile.kind === 'ideal' ? 'studio-realtime-summary-ideal' : 'studio-realtime-summary-standard'}`}>
        {activeFile.kind === 'ideal' ? (
          <>
            <div title={workbenchCopy.results.meanTemperature}><span>{workbenchCopy.results.meanTemperature}</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanTemperature ?? activeFile.stats.temperature)}</strong></div>
            <div title={workbenchCopy.results.measuredPressure}><span>{workbenchCopy.results.measuredPressure}</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanPressure ?? activeFile.stats.pressure, 4)}</strong></div>
            <div title={workbenchCopy.results.idealPressure}><span>{workbenchCopy.results.idealPressure}</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanIdealPressure, 4)}</strong></div>
            <div title={workbenchCopy.results.relativeGap}><span>{workbenchCopy.results.gap}</span><strong>{activeFile.latestPressureSummary?.relativeGap === null || activeFile.latestPressureSummary?.relativeGap === undefined ? '--' : `${formatMetric(activeFile.latestPressureSummary.relativeGap, 2)}%`}</strong></div>
            <div title={workbenchCopy.results.activeRelation}><span>{workbenchCopy.parameters.relation}</span><strong>{getRelationLabel(activeFile.relation)}</strong></div>
            <div title={workbenchCopy.results.samplingProgress}><span>{workbenchCopy.results.samplingProgress}</span><strong>{formatPercent(activeFile.stats.progress)}</strong></div>
          </>
        ) : (
          <>
            <div><span>{workbenchCopy.results.temperature}</span><strong>{formatMetric(activeFile.stats.temperature)}</strong></div>
            <div><span>{workbenchCopy.results.pressure}</span><strong>{formatMetric(activeFile.stats.pressure, 4)}</strong></div>
            <div><span>{workbenchCopy.results.meanSpeed}</span><strong>{formatMetric(activeFile.stats.meanSpeed)}</strong></div>
            <div><span>{workbenchCopy.results.rmsSpeed}</span><strong>{formatMetric(activeFile.stats.rmsSpeed)}</strong></div>
            <div><span>{workbenchCopy.results.phase}</span><strong>{workbenchCopy.results.phaseStates[activeFile.stats.phase]}</strong></div>
            <div><span>{workbenchCopy.results.samplingProgress}</span><strong>{formatPercent(activeFile.stats.progress)}</strong></div>
          </>
        )}
      </div>
      <div className={`studio-live-charts ${activeFile.kind === 'ideal' ? 'studio-live-charts-ideal' : ''}`}>
        {activeFile.kind === 'standard' ? (
          <>
            {renderRealtimeHistogram(workbenchCopy.results.speedDistribution, activeFile.chartData.speed, 'blue')}
            {renderRealtimeHistogram(workbenchCopy.results.energyDistribution, activeFile.chartData.energy, 'violet')}
          </>
        ) : (
          <>
            {renderIdealPressureTrace()}
            {renderIdealRelationSnapshot()}
          </>
        )}
      </div>
    </div>
    )
  );

  const renderExperimentPointsPanel = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.experimentPointTableTitle}</strong>
            <p>{workbenchCopy.results.experimentPointTableBody}</p>
          </div>
        </div>
      );
    }

    const clearKey = `${activeFile.id}:${activeFile.relation}`;
    const points = idealAnalysis.sortedPoints;

    return (
      <div className="studio-data-table-panel">
        <section className="studio-data-table-section">
          <div className="studio-results-subheader">
            <div>
              <strong>{workbenchCopy.results.pointsTitle(getRelationLabel(activeFile.relation))}</strong>
              <span>{workbenchCopy.results.recordedPoints(points.length)}</span>
            </div>
            <div className={`studio-results-clear-actions ${pendingClearRelationKey === clearKey ? 'studio-results-clear-actions-pending' : ''}`}>
              <button
                type="button"
                className={`studio-results-clear-button ${pendingClearRelationKey === clearKey ? 'studio-results-clear-confirm' : ''}`}
                onClick={requestClearIdealRelation}
                disabled={points.length === 0}
              >
                <Trash2 size={13} />
                {pendingClearRelationKey === clearKey ? workbenchCopy.results.confirmClear : workbenchCopy.results.clearRelation}
              </button>
              {pendingClearRelationKey === clearKey ? (
                <button
                  type="button"
                  className="studio-results-clear-button studio-results-clear-cancel"
                  onClick={cancelClearIdealRelation}
                >
                  {workbenchCopy.results.cancel}
                </button>
              ) : null}
            </div>
          </div>
          {points.length === 0 ? (
            <div className="studio-panel-note">
              {workbenchCopy.results.runToRecord}
            </div>
          ) : (
            <table className="studio-table studio-ideal-points-table">
              <thead>
                <tr>
                  <th>#</th>
                  {activeFile.relation === 'pt' ? <th>{workbenchCopy.parameters.targetTemperature}</th> : null}
                  {activeFile.relation === 'pv' ? <><th>L</th><th>V</th><th>1/V</th></> : null}
                  {activeFile.relation === 'pn' ? <th>N</th> : null}
                  <th>{workbenchCopy.results.meanTemperature}</th>
                  <th>{workbenchCopy.results.measuredPressure}</th>
                  <th>{workbenchCopy.results.idealPressure}</th>
                  <th>{workbenchCopy.results.relativeGap}</th>
                  <th>{workbenchCopy.results.tableTime}</th>
                  <th>{workbenchCopy.results.tableAction}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr key={point.id}>
                    <td>{index + 1}</td>
                    {activeFile.relation === 'pt' ? <td>{formatMetric(point.targetTemperature, 2)}</td> : null}
                    {activeFile.relation === 'pv' ? (
                      <>
                        <td>{formatMaybeMetric(point.boxLength, 2)}</td>
                        <td>{formatMaybeMetric(point.volume, 1)}</td>
                        <td>{formatMaybeMetric(point.inverseVolume, 6)}</td>
                      </>
                    ) : null}
                    {activeFile.relation === 'pn' ? <td>{formatMaybeMetric(point.particleCount, 0)}</td> : null}
                    <td>{formatMetric(point.meanTemperature, 3)}</td>
                    <td>{formatMetric(point.meanPressure, 5)}</td>
                    <td>{formatMetric(point.idealPressure, 5)}</td>
                    <td>{formatMetric(point.relativeGap, 2)}%</td>
                    <td>{new Date(point.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</td>
                    <td>{renderIdealPointRemoveAction(point)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    );
  };

  const renderIdealValidationChart = (
    analysis: IdealGasAnalysis,
    variant: 'linear' | 'pvRaw' = 'linear',
  ) => {
    if (activeFile.kind !== 'ideal') return null;

    const points = analysis.sortedPoints
      .map((point) => ({
        point,
        x: variant === 'pvRaw' ? point.volume ?? 0 : getRelationXValue(analysis.relation, point),
        measured: point.meanPressure,
        ideal: point.idealPressure,
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.measured) && point.x > 0);

    if (points.length === 0) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
    }

    const xValues = points.map((point) => point.x);
    const yValues = points.flatMap((point) => [point.measured, point.ideal]);
    if (variant === 'linear' && analysis.regression.slope !== null && analysis.regression.intercept !== null) {
      xValues.forEach((x) => yValues.push((analysis.regression.slope ?? 0) * x + (analysis.regression.intercept ?? 0)));
    }

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(0, ...yValues);
    const maxY = Math.max(0.0001, ...yValues);
    const xSpan = Math.max(0.0001, maxX - minX);
    const ySpan = Math.max(0.0001, maxY - minY);
    const xTo = (value: number) => 34 + ((value - minX) / xSpan) * 324;
    const yTo = (value: number) => 146 - ((value - minY) / ySpan) * 112;
    const measuredPoints = points.map((point) => `${xTo(point.x)},${yTo(point.measured)}`).join(' ');
    const idealPoints = points.map((point) => `${xTo(point.x)},${yTo(point.ideal)}`).join(' ');
    const fitPoints =
      variant === 'linear' && analysis.regression.slope !== null && analysis.regression.intercept !== null
        ? [minX, maxX]
            .map((x) => `${xTo(x)},${yTo(analysis.regression.slope * x + analysis.regression.intercept)}`)
            .join(' ')
        : '';
    const theoryPoints =
      variant === 'linear' && analysis.theoreticalSlope !== null
        ? [minX, maxX].map((x) => `${xTo(x)},${yTo(analysis.theoreticalSlope * x)}`).join(' ')
        : idealPoints;
    const xLabel = variant === 'pvRaw'
      ? 'V'
      : analysis.relation === 'pv'
        ? '1/V'
        : analysis.relation === 'pn'
          ? 'N'
          : 'T';

    return (
      <div className="studio-ideal-chart-card">
        <svg viewBox="0 0 392 176" role="img" aria-label={workbenchCopy.results.verificationChartAria(getRelationLabel(analysis.relation))}>
          <line x1="34" y1="146" x2="358" y2="146" />
          <line x1="34" y1="34" x2="34" y2="146" />
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={`grid-${ratio}`}
              className="studio-ideal-chart-grid"
              x1="34"
              y1={146 - ratio * 112}
              x2="358"
              y2={146 - ratio * 112}
            />
          ))}
          {theoryPoints ? <polyline className="studio-ideal-chart-theory" points={theoryPoints} /> : null}
          {fitPoints ? <polyline className="studio-ideal-chart-fit" points={fitPoints} /> : null}
          <polyline className="studio-ideal-chart-measured" points={measuredPoints} />
          {points.map((point) => (
            <circle
              key={`${variant}-${point.point.id}`}
              cx={xTo(point.x)}
              cy={yTo(point.measured)}
              r="3.4"
            />
          ))}
          <text x="196" y="169">{xLabel}</text>
          <text x="8" y="25">P</text>
        </svg>
        <div className="studio-ideal-chart-legend">
          <span><i className="studio-ideal-legend-measured-dot" />{workbenchCopy.results.measuredLegend}</span>
          <span><i className="studio-ideal-legend-fit" />{workbenchCopy.results.fitLegend}</span>
          <span><i className="studio-ideal-legend-theory" />{workbenchCopy.results.theoryLegend}</span>
        </div>
      </div>
    );
  };

  const renderResultsDataTable = () => {
    return (
      <div className="studio-data-table-panel">
        <section className="studio-data-table-section">
          <h4>{workbenchCopy.results.finalState}</h4>
          <table className="studio-table">
            <tbody>
              <tr><th>{workbenchCopy.results.metric}</th><th>{workbenchCopy.results.value}</th><th>{workbenchCopy.results.status}</th></tr>
              <tr><td>{workbenchCopy.results.finalSpeedSamples}</td><td>{resultSummary.speedSampleCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
              <tr><td>{workbenchCopy.results.finalEnergySamples}</td><td>{resultSummary.energySampleCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
              <tr><td>{workbenchCopy.results.tempHistorySamples}</td><td>{resultSummary.tempHistoryCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
                <tr><td>{workbenchCopy.results.finalDataReady}</td><td>{resultSummary.ready ? workbenchCopy.results.yes : workbenchCopy.results.no}</td><td>{getLocalizedStatusValue(resultSummary.runState, workbenchCopy)}</td></tr>
              <tr><td>{workbenchCopy.results.energyDrift}</td><td>{resultSummary.energyDriftPercent === null ? '--' : `${formatMetric(resultSummary.energyDriftPercent, 4)}%`}</td><td>{workbenchCopy.results.diagnostic}</td></tr>
              <tr><td>{workbenchCopy.results.meanAbsTempError}</td><td>{resultSummary.temperatureErrorMeanAbs === null ? '--' : formatMetric(resultSummary.temperatureErrorMeanAbs, 5)}</td><td>{workbenchCopy.results.diagnostic}</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  };

  const exportAvailable = isExportEnvironmentAvailableStatus(exportEnvironmentStatus);
  const exportCopy = workbenchCopy.exportEnvironment[exportEnvironmentStatus];
  const idealPointCount = idealAnalysis?.sortedPoints.length ?? 0;
  const isExportModeDataReady = (mode: WorkbenchExportMode) => (
    activeFile.kind === 'ideal'
      ? mode === 'pointsCsv' || mode === 'completeBundle'
        ? idealPointCount > 0
        : idealPointCount >= 2
      : resultSummary.ready
  );

  const handleExportAction = async (mode: WorkbenchExportMode) => {
    const exportLabel = workbenchCopy.logs.exportLabels[mode];

    if (!isExportModeDataReady(mode)) {
      pushLog(
        activeFile.kind === 'ideal' && mode !== 'pointsCsv' && idealPointCount > 0
          ? workbenchCopy.logs.exportNeedsTwoPoints(activeFile.name)
          : workbenchCopy.logs.exportNotReady(activeFile.name),
        'warning',
      );
      return;
    }

    const payload = createWorkbenchExportPayload(activeFile, mode, settingsLanguagePreference);
    const bridge = window.hardSphereLabExporter;

    if (!exportAvailable) {
      const detail = exportEnvironmentDetail ?? exportCopy.detail;
      pushLog(workbenchCopy.logs.exportPayloadPrepared(activeFile.name, exportLabel, payload.filename, detail), 'warning');
      return;
    }

    if (!bridge) {
      pushLog(workbenchCopy.logs.exportPayloadPrepared(activeFile.name, exportLabel, payload.filename, workbenchCopy.exportEnvironment.unavailable.detail), 'warning');
      return;
    }

    setExportInProgress(true);
    pushLog(workbenchCopy.logs.exportPreparing(activeFile.name, exportLabel), 'info');

    try {
      const result = await bridge.exportWorkbenchPayload(payload, {
        mode,
        fileName: activeFile.name,
        defaultDirName: `${activeFile.name} ${mode === 'completeBundle' ? workbenchCopy.results.exportAll : mode === 'figuresZip' || mode === 'verificationFigure' ? workbenchCopy.results.exportFigures : 'Export'}`,
      });

      if (result.status === 'cancelled') {
        pushLog(workbenchCopy.logs.exportCancelled(activeFile.name, exportLabel), 'warning');
        return;
      }

      if (result.status !== 'ok') {
        pushLog(workbenchCopy.logs.exportFailed(activeFile.name, exportLabel, result.message ?? workbenchCopy.logs.unknownExporterError), 'error');
        return;
      }

      const fileCount = result.files?.length ?? 0;
      if (mode === 'pointsCsv') {
        pushLog(workbenchCopy.logs.exportCsvSaved(activeFile.name, result.files?.[0] ?? result.outDir ?? workbenchCopy.logs.selectedLocation), 'success');
        return;
      }

      const figureHint = mode === 'verificationFigure' || mode === 'figuresZip'
        ? ` ${workbenchCopy.logs.exportFigureHint}`
        : '';
      pushLog(workbenchCopy.logs.exportCompleted(activeFile.name, exportLabel, result.outDir ?? workbenchCopy.logs.selectedFolder, fileCount, figureHint), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : workbenchCopy.logs.unknownExporterError;
      pushLog(workbenchCopy.logs.exportFailed(activeFile.name, exportLabel, message), 'error');
    } finally {
      setExportInProgress(false);
    }
  };

  const renderResultsSummary = () => {
    return (
      <div className="studio-results-section">
        <div className={`studio-result-status ${resultSummary.ready ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
          <strong>{resultSummary.ready ? workbenchCopy.results.resultReadyStatus : workbenchCopy.results.resultNotReadyStatus}</strong>
          <span>
            {resultSummary.ready
              ? workbenchCopy.results.resultReadyDetail
              : workbenchCopy.results.resultNotReadyDetail}
          </span>
        </div>

        <div className="studio-analysis-grid">
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalTime}</span><strong>{formatMetric(resultSummary.finalTime, 2)} s</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalTemperature}</span><strong>{formatMetric(resultSummary.temperature)}</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalPressure}</span><strong>{formatMetric(resultSummary.pressure, 4)}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.meanSpeed}</span><strong>{formatMetric(resultSummary.meanSpeed)}</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.rmsSpeed}</span><strong>{formatMetric(resultSummary.rmsSpeed)}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.energyDrift}</span><strong>{resultSummary.energyDriftPercent === null ? '--' : `${formatMetric(resultSummary.energyDriftPercent, 4)}%`}</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.speedBins}</span><strong>{resultSummary.speedBinCount}</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.energyBins}</span><strong>{resultSummary.energyBinCount}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.tempSamples}</span><strong>{resultSummary.tempHistoryCount}</strong></div>
        </div>
      </div>
    );
  };

  const getFinalChartAxisCopy = (figureId: string): { xLabel: string; yLabel: string } => {
    const finalChartCopy = settingsLanguagePreference === 'en'
      ? {
          speed: 'Speed v',
          energy: 'Energy E',
          time: 'Time t',
          logDensity: 'Log density',
          temperatureError: 'Temperature error',
          totalEnergy: 'Total energy',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            speed: '速度 v',
            energy: '能量 E',
            time: '時間 t',
            logDensity: '對數密度',
            temperatureError: '溫度誤差',
            totalEnergy: '總能量',
          }
        : {
            speed: '速度 v',
            energy: '能量 E',
            time: '时间 t',
            logDensity: '对数密度',
            temperatureError: '温度误差',
            totalEnergy: '总能量',
          };

    switch (figureId) {
      case 'speed-distribution':
        return { xLabel: finalChartCopy.speed, yLabel: workbenchCopy.results.probabilityDensity };
      case 'energy-distribution':
        return { xLabel: finalChartCopy.energy, yLabel: workbenchCopy.results.probabilityDensity };
      case 'semilog-energy':
        return { xLabel: finalChartCopy.energy, yLabel: finalChartCopy.logDensity };
      case 'temperature-error':
        return { xLabel: finalChartCopy.time, yLabel: finalChartCopy.temperatureError };
      case 'total-energy':
        return { xLabel: finalChartCopy.time, yLabel: finalChartCopy.totalEnergy };
      default:
        return { xLabel: '', yLabel: '' };
    }
  };

  const getFinalChartSparseLegendPosition = (
    points: Array<{ x: number; y: number }>,
  ): FinalChartLegendPosition => {
    const candidates: Array<{
      position: FinalChartLegendPosition;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
    }> = [
      { position: 'upper-right', xMin: 0.58, xMax: 1, yMin: 0, yMax: 0.42 },
      { position: 'upper-left', xMin: 0, xMax: 0.42, yMin: 0, yMax: 0.42 },
      { position: 'lower-right', xMin: 0.58, xMax: 1, yMin: 0.58, yMax: 1 },
      { position: 'lower-left', xMin: 0, xMax: 0.42, yMin: 0.58, yMax: 1 },
    ];

    return candidates.reduce((best, candidate) => {
      const hits = points.filter((point) => {
        const normalizedX = (point.x - FINAL_CHART_LEFT) / FINAL_CHART_PLOT_WIDTH;
        const normalizedY = (point.y - FINAL_CHART_TOP) / FINAL_CHART_PLOT_HEIGHT;
        return (
          normalizedX >= candidate.xMin &&
          normalizedX <= candidate.xMax &&
          normalizedY >= candidate.yMin &&
          normalizedY <= candidate.yMax
        );
      }).length;
      return hits < best.hits ? { position: candidate.position, hits } : best;
    }, { position: 'upper-right' as FinalChartLegendPosition, hits: Number.POSITIVE_INFINITY }).position;
  };

  const getFinalChartLegendWidth = (items: FinalChartLegendItem[]) => {
    const estimateLabelWidth = (label: string) => Array.from(label).reduce((sum, char) => {
      if (/[\u3400-\u9fff]/.test(char)) return sum + 2.55;
      if (char === ' ') return sum + 0.78;
      if (/[A-Z0-9]/.test(char)) return sum + 1.55;
      if (/[il.,:;]/.test(char)) return sum + 0.72;
      return sum + 1.28;
    }, 0);
    const longestLabelWidth = Math.max(0, ...items.map((item) => estimateLabelWidth(item.label)));
    return Math.min(34, Math.max(13.5, longestLabelWidth + 8.9));
  };

  const renderFinalChartLegend = (
    items: FinalChartLegendItem[],
    position: FinalChartLegendPosition = 'upper-right',
    width?: number,
  ) => {
    const panelWidth = width ?? getFinalChartLegendWidth(items);
    const panelLeft = -2.1;
    const panelTop = -2.5;
    const itemGap = 4.35;
    const height = Math.max(6.3, items.length * itemGap + 1.15);
    const positions: Record<FinalChartLegendPosition, { x: number; y: number }> = {
      'upper-left': { x: FINAL_CHART_LEFT + 4.2, y: FINAL_CHART_TOP + 4.7 },
      'upper-right': { x: FINAL_CHART_RIGHT + 0.9 - panelWidth, y: FINAL_CHART_TOP + 4.7 },
      'lower-left': { x: FINAL_CHART_LEFT + 4.2, y: FINAL_CHART_BOTTOM - height - 2.4 },
      'lower-right': { x: FINAL_CHART_RIGHT + 0.9 - panelWidth, y: FINAL_CHART_BOTTOM - height - 2.4 },
    };
    const origin = positions[position];

    return (
      <g className="studio-final-chart-legend" transform={`translate(${origin.x} ${origin.y})`}>
        <rect className="studio-final-chart-legend-panel" x={panelLeft} y={panelTop} width={panelWidth} height={height} />
        {items.map((item, index) => {
          const itemY = index * itemGap;
          const textX = 3.45;
          return (
            <g key={`${item.kind}-${item.label}`} className="studio-final-chart-legend-item">
              {item.kind === 'bar' && (
                <rect className="studio-final-chart-bar studio-final-chart-legend-bar" x="-1.35" y={itemY - 1.25} width="2.65" height="2.35" />
              )}
              {item.kind === 'point' && (
                <circle className={item.className} cx="-0.2" cy={itemY} r="1.1" />
              )}
              {item.kind === 'line' && (
                <line className={item.className} x1="-1.55" y1={itemY} x2="1.45" y2={itemY} />
              )}
              {item.kind === 'boundary' && (
                <line className="studio-final-chart-legend-line" x1="-1.55" y1={itemY} x2="1.45" y2={itemY} />
              )}
              <text className="studio-final-chart-legend-text" x={textX} y={itemY + 0.82}>{item.label}</text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderFinalChartFrame = (
    figureId: string,
    variant: 'bars' | 'line' | 'semilog',
    children: React.ReactNode,
  ) => {
    const horizontalGrid = [0, 0.25, 0.5, 0.75, 1];
    const verticalGrid = [0, 0.25, 0.5, 0.75, 1];
    const { xLabel, yLabel } = getFinalChartAxisCopy(figureId);

    return (
      <svg
        className={`studio-final-chart studio-final-chart-${variant} studio-final-chart-${figureId}`}
        viewBox={`0 0 ${FINAL_CHART_VIEWBOX_WIDTH} ${FINAL_CHART_VIEWBOX_HEIGHT}`}
        aria-hidden="true"
        focusable="false"
      >
        <rect className="studio-final-chart-panel" x="5.5" y="5" width="91" height="52" />
        <g className="studio-final-chart-grid">
          {horizontalGrid.map((ratio) => {
            const y = FINAL_CHART_TOP + FINAL_CHART_PLOT_HEIGHT * ratio;
            return <line key={`h-${ratio}`} x1={FINAL_CHART_LEFT} y1={y} x2={FINAL_CHART_RIGHT} y2={y} />;
          })}
          {verticalGrid.map((ratio) => {
            const x = FINAL_CHART_LEFT + FINAL_CHART_PLOT_WIDTH * ratio;
            return <line key={`v-${ratio}`} x1={x} y1={FINAL_CHART_TOP} x2={x} y2={FINAL_CHART_BOTTOM} />;
          })}
        </g>
        <line className="studio-final-chart-axis" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_BOTTOM} x2={FINAL_CHART_RIGHT} y2={FINAL_CHART_BOTTOM} />
        <line className="studio-final-chart-axis" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_TOP} x2={FINAL_CHART_LEFT} y2={FINAL_CHART_BOTTOM} />
        <g className="studio-final-chart-ticks">
          {verticalGrid.map((ratio) => {
            const x = FINAL_CHART_LEFT + FINAL_CHART_PLOT_WIDTH * ratio;
            return <line key={`xt-${ratio}`} className="studio-final-chart-tick" x1={x} y1={FINAL_CHART_BOTTOM} x2={x} y2={FINAL_CHART_BOTTOM - 2.4} />;
          })}
          {horizontalGrid.map((ratio) => {
            const y = FINAL_CHART_TOP + FINAL_CHART_PLOT_HEIGHT * ratio;
            return <line key={`yt-${ratio}`} className="studio-final-chart-tick" x1={FINAL_CHART_LEFT} y1={y} x2={FINAL_CHART_LEFT + 2.4} y2={y} />;
          })}
        </g>
        {xLabel && (
          <text className="studio-final-chart-axis-label studio-final-chart-x-label" x={(FINAL_CHART_LEFT + FINAL_CHART_RIGHT) / 2} y="61.2">{xLabel}</text>
        )}
        {yLabel && (
          <text className="studio-final-chart-axis-label studio-final-chart-y-label" transform={`translate(3.2 ${(FINAL_CHART_TOP + FINAL_CHART_BOTTOM) / 2}) rotate(-90)`}>{yLabel}</text>
        )}
        {children}
      </svg>
    );
  };

  const renderFinalFigurePreview = (figureId: string) => {
    if (!resultSummary.ready || !activeFile.finalChartData) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.notReadyPreview}</div>;
    }

    if (figureId === 'temperature-error' || figureId === 'total-energy') {
      const history = activeFile.finalChartData.tempHistory;
      const values = history.map((point) => (figureId === 'temperature-error' ? Math.abs(point.error) : point.totalEnergy));
      const stride = Math.max(1, Math.ceil(values.length / 72));
      const sampledValues = values.filter((_, index) => index % stride === 0).slice(0, 72);
      if (!sampledValues.length) {
        return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
      }

      const rawMinY = figureId === 'temperature-error' ? 0 : Math.min(...sampledValues);
      const rawMaxY = Math.max(...sampledValues);
      const yPadding = rawMaxY === rawMinY ? Math.max(0.0001, Math.abs(rawMaxY) * 0.04) : 0;
      const minY = rawMinY - yPadding;
      const maxY = rawMaxY + yPadding;
      const ySpan = Math.max(0.0001, maxY - minY);
      const toX = (index: number) => FINAL_CHART_LEFT + (sampledValues.length === 1 ? 0.5 : index / (sampledValues.length - 1)) * FINAL_CHART_PLOT_WIDTH;
      const toY = (value: number) => FINAL_CHART_BOTTOM - ((value - minY) / ySpan) * FINAL_CHART_PLOT_HEIGHT;
      const historyPolyline = sampledValues.map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`).join(' ');
      const historyPoints = sampledValues.map((value, index) => ({ x: toX(index), y: toY(value) }));
      const historyLegendPosition = getFinalChartSparseLegendPosition(historyPoints);
      const historyLegendCopy = settingsLanguagePreference === 'en'
        ? { temperatureErrorTrace: 'Temperature error', totalEnergyTrace: 'Total energy', zeroReference: 'Zero reference' }
        : settingsLanguagePreference === 'zh-TW'
          ? { temperatureErrorTrace: '溫度誤差', totalEnergyTrace: '總能量', zeroReference: '零參考線' }
          : { temperatureErrorTrace: '温度误差', totalEnergyTrace: '总能量', zeroReference: '零参考线' };

      return renderFinalChartFrame(
        figureId,
        'line',
        <>
          {figureId === 'temperature-error' && (
            <line className="studio-final-chart-reference" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_BOTTOM} x2={FINAL_CHART_RIGHT} y2={FINAL_CHART_BOTTOM} />
          )}
          <polyline className="studio-final-chart-history" points={historyPolyline} />
          {renderFinalChartLegend([
            {
              kind: 'line',
              className: 'studio-final-chart-history',
              label: figureId === 'temperature-error' ? historyLegendCopy.temperatureErrorTrace : historyLegendCopy.totalEnergyTrace,
            },
            ...(figureId === 'temperature-error'
              ? [{
                  kind: 'line' as const,
                  className: 'studio-final-chart-reference',
                  label: historyLegendCopy.zeroReference,
                }]
              : []),
          ], historyLegendPosition)}
        </>,
      );
    }

    if (figureId === 'semilog-energy') {
      const measuredPoints = activeFile.finalChartData.energy
        .map((bin) => ({
          energy: (bin.binStart + bin.binEnd) / 2,
          logProb: Math.log(bin.probability),
          probability: bin.probability,
        }))
        .filter((point) => Number.isFinite(point.energy) && Number.isFinite(point.logProb) && point.probability > 0);
      if (!measuredPoints.length) {
        return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
      }

      const selectionStartIndex = measuredPoints.length > 4
        ? Math.max(1, Math.floor(measuredPoints.length * 0.18))
        : 0;
      const selectionEndIndex = measuredPoints.length > 4
        ? Math.min(measuredPoints.length - 2, Math.ceil(measuredPoints.length * 0.82) - 1)
        : measuredPoints.length - 1;
      const selectedPoints = measuredPoints.filter((_, index) => index >= selectionStartIndex && index <= selectionEndIndex);
      const excludedPoints = measuredPoints.filter((_, index) => index < selectionStartIndex || index > selectionEndIndex);
      const selectionStartEnergy = selectedPoints[0]?.energy ?? measuredPoints[0].energy;
      const selectionEndEnergy = selectedPoints[selectedPoints.length - 1]?.energy ?? measuredPoints[measuredPoints.length - 1].energy;
      const semilogLegendCopy = settingsLanguagePreference === 'en'
        ? { selected: 'Selected bins', excluded: 'Excluded bins', window: 'Fit window', theory: workbenchCopy.results.theoryLegend }
        : settingsLanguagePreference === 'zh-TW'
          ? { selected: '選中點', excluded: '未選點', window: '選中區間', theory: workbenchCopy.results.theoryLegend }
          : { selected: '选中点', excluded: '未选点', window: '选中区间', theory: workbenchCopy.results.theoryLegend };
      const formatEnergyTick = (value: number) => value.toFixed(value >= 10 ? 1 : 2);
      const theoryPoints = activeFile.finalChartData.energy
        .map((bin) => ({
          energy: (bin.binStart + bin.binEnd) / 2,
          logDensity: bin.theoretical && bin.theoretical > 0 ? Math.log(bin.theoretical) : Number.NaN,
        }))
        .filter((point) => (
          Number.isFinite(point.energy) &&
          Number.isFinite(point.logDensity) &&
          point.energy >= measuredPoints[0].energy &&
          point.energy <= measuredPoints[measuredPoints.length - 1].energy
        ));
      const xValues = [
        ...measuredPoints.map((point) => point.energy),
        ...theoryPoints.map((point) => point.energy),
      ];
      const yValues = [
        ...measuredPoints.map((point) => point.logProb),
        ...theoryPoints.map((point) => point.logDensity),
      ];
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const rawMinY = Math.min(...yValues);
      const rawMaxY = Math.max(...yValues);
      const xSpan = Math.max(0.0001, maxX - minX);
      const rawYSpan = Math.max(0.0001, rawMaxY - rawMinY);
      const minY = rawMinY - rawYSpan * 0.08;
      const maxY = rawMaxY + rawYSpan * 0.16;
      const ySpan = Math.max(0.0001, maxY - minY);
      const toX = (value: number) => FINAL_CHART_LEFT + ((value - minX) / xSpan) * FINAL_CHART_PLOT_WIDTH;
      const toY = (value: number) => FINAL_CHART_BOTTOM - ((value - minY) / ySpan) * FINAL_CHART_PLOT_HEIGHT;
      const theoryPolyline = theoryPoints.map((point) => `${toX(point.energy).toFixed(2)},${toY(point.logDensity).toFixed(2)}`).join(' ');
      const selectionStartX = toX(selectionStartEnergy);
      const selectionEndX = toX(selectionEndEnergy);

      return renderFinalChartFrame(
        figureId,
        'semilog',
        <>
          {theoryPolyline && <polyline className="studio-final-chart-theory studio-final-semilog-theory" points={theoryPolyline} />}
          <line className="studio-final-chart-selection-boundary" x1={selectionStartX} y1={FINAL_CHART_TOP} x2={selectionStartX} y2={FINAL_CHART_BOTTOM} />
          <line className="studio-final-chart-selection-boundary" x1={selectionEndX} y1={FINAL_CHART_TOP} x2={selectionEndX} y2={FINAL_CHART_BOTTOM} />
          <text className="studio-final-chart-boundary-label" x={selectionStartX} y="6.4">{formatEnergyTick(selectionStartEnergy)}</text>
          <text className="studio-final-chart-boundary-label" x={selectionEndX} y="6.4">{formatEnergyTick(selectionEndEnergy)}</text>
          {excludedPoints.map((point, index) => (
            <circle
              className="studio-final-chart-point studio-final-chart-excluded-point studio-final-semilog-point"
              key={`semilog-energy-excluded-${index}`}
              cx={toX(point.energy)}
              cy={toY(point.logProb)}
              r="1.05"
            />
          ))}
          {selectedPoints.map((point, index) => (
            <circle
              className="studio-final-chart-point studio-final-chart-selected-point studio-final-semilog-point"
              key={`semilog-energy-selected-${index}`}
              cx={toX(point.energy)}
              cy={toY(point.logProb)}
              r="1.15"
            />
          ))}
          {renderFinalChartLegend([
            { kind: 'point', className: 'studio-final-chart-selected-point', label: semilogLegendCopy.selected },
            { kind: 'point', className: 'studio-final-chart-excluded-point', label: semilogLegendCopy.excluded },
            { kind: 'boundary', label: semilogLegendCopy.window },
            { kind: 'line', className: 'studio-final-chart-theory', label: semilogLegendCopy.theory },
          ], 'upper-right')}
        </>,
      );
    }

    const bins = figureId === 'speed-distribution'
      ? activeFile.finalChartData.speed
      : activeFile.finalChartData.energy;
    const compactBins = getCompactHistogramBins(bins, 30)
      .filter((bin) => Number.isFinite(bin.binStart) && Number.isFinite(bin.binEnd) && Number.isFinite(bin.probability));
    if (!compactBins.length) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
    }

    const minX = Math.min(...compactBins.map((bin) => bin.binStart));
    const maxX = Math.max(...compactBins.map((bin) => bin.binEnd));
    const xSpan = Math.max(0.0001, maxX - minX);
    const maxProbability = Math.max(
      0.0001,
      ...compactBins.map((bin) => bin.probability),
      ...compactBins.map((bin) => bin.theoretical ?? 0),
    );
    const toX = (value: number) => FINAL_CHART_LEFT + ((value - minX) / xSpan) * FINAL_CHART_PLOT_WIDTH;
    const toY = (value: number) => FINAL_CHART_BOTTOM - (Math.max(0, value) / maxProbability) * FINAL_CHART_PLOT_HEIGHT;
    const theoryPolyline = compactBins
      .filter((bin) => Number.isFinite(bin.theoretical))
      .map((bin) => `${toX((bin.binStart + bin.binEnd) / 2).toFixed(2)},${toY(bin.theoretical ?? 0).toFixed(2)}`)
      .join(' ');

    return renderFinalChartFrame(
      figureId,
      'bars',
      <>
        {compactBins.map((bin, index) => {
          const barX = toX(bin.binStart);
          const barRight = toX(bin.binEnd);
          const barWidth = Math.max(0.8, (barRight - barX) * 0.72);
          const barHeight = bin.probability <= 0 ? 0 : Math.max(0.8, FINAL_CHART_BOTTOM - toY(bin.probability));
          return (
            <rect
              className="studio-final-chart-bar"
              key={`${figureId}-${index}`}
              x={barX + ((barRight - barX) - barWidth) / 2}
              y={FINAL_CHART_BOTTOM - barHeight}
              width={barWidth}
              height={barHeight}
            />
          );
        })}
        {theoryPolyline && <polyline className="studio-final-chart-theory" points={theoryPolyline} />}
        {renderFinalChartLegend([
          { kind: 'bar', label: workbenchCopy.results.measuredBars },
          ...(theoryPolyline
            ? [{
                kind: 'line' as const,
                className: 'studio-final-chart-theory',
                label: workbenchCopy.results.theoryLegend,
              }]
            : []),
        ], 'upper-right')}
      </>,
    );
  };

  const renderResultsFigures = () => {
    return (
      <div className="studio-results-section">
        <div className="studio-results-subheader">
          <div>
            <strong>{workbenchCopy.panels.figuresTitle}</strong>
            <span>{workbenchCopy.results.figuresHint}</span>
          </div>
          <button
            type="button"
            disabled={!isExportModeDataReady('figuresZip') || exportInProgress}
            onClick={() => handleExportAction('figuresZip')}
          >
            <FileArchive size={13} />
            {workbenchCopy.results.exportFigures}
          </button>
        </div>

        <div className="studio-figure-list">
          <div className="studio-figure-list-header">
            <strong>{workbenchCopy.panels.figuresTitle}</strong>
            <span>{workbenchCopy.results.exportFilesHint}</span>
          </div>
          {figureSpecs.map((figure) => (
            <div className="studio-figure-row" key={figure.id}>
              <div>
                <strong>{figure.title}</strong>
                <small>{figure.recommendedFilename}</small>
              </div>
              <span>{figure.dataCount}</span>
              <em className={`studio-figure-status-${figure.status}`}>{workbenchCopy.results.figureStatus[figure.status]}</em>
            </div>
          ))}
        </div>

        <div className="studio-final-figures-grid">
          {figureSpecs.map((figure) => (
            <section className="studio-final-figure-card" key={`preview-${figure.id}`}>
              <div>
                <strong>{figure.title}</strong>
                <span>{workbenchCopy.results.figureStatus[figure.status]}</span>
              </div>
              {renderFinalFigurePreview(figure.id)}
            </section>
          ))}
        </div>
      </div>
    );
  };

  const renderIdealPointsWindow = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.noIdealPointsTitle}</strong>
            <p>{workbenchCopy.results.noIdealPointsBody}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="studio-ideal-child-window-body">
        <div className="studio-ideal-results-card">
          <div className="studio-ideal-results-card-header">
            <div>
              <strong>{workbenchCopy.results.experimentStatus}</strong>
              <span>
                {idealPointCount > 0
                  ? workbenchCopy.results.resultsReady(getRelationLabel(activeFile.relation))
                  : workbenchCopy.results.waitingForRecordedPoints(getRelationLabel(activeFile.relation))}
                {' / '}
                {workbenchCopy.results.recordedPoints(idealAnalysis.sortedPoints.length)}
                {' / '}
                {getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy)}
              </span>
            </div>
          </div>
          <div className="studio-ideal-results-status-grid">
            <div><span>{workbenchCopy.results.activeRelation}</span><strong>{getRelationLabel(activeFile.relation)}</strong></div>
            <div><span>{workbenchCopy.results.pointsMetric}</span><strong>{idealAnalysis.sortedPoints.length}</strong></div>
            <div><span>{workbenchCopy.results.status}</span><strong>{getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy)}</strong></div>
            <div><span>{workbenchCopy.results.finalState}</span><strong>{activeFile.needsReset ? workbenchCopy.parameters.idealRuntimeOnStart : getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
          </div>
        </div>
        {renderExperimentPointsPanel()}
      </div>
    );
  };

  const renderIdealVerificationWindow = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.noIdealVerificationTitle}</strong>
            <p>{workbenchCopy.results.noIdealVerificationBody}</p>
          </div>
        </div>
      );
    }

    const verificationSpec = figureSpecs.find((figure) => figure.id === 'ideal-verification');
    const rawPvSpec = figureSpecs.find((figure) => figure.id === 'ideal-raw-pv');
    const pointsSpec = figureSpecs.find((figure) => figure.id === 'ideal-points');
    const historySpec = figureSpecs.find((figure) => figure.id === 'ideal-history');
    const idealLanguage = getIdealExperimentLanguageCode(settingsLanguagePreference);
    const historyContent = getIdealHistoryContent(idealLanguage, activeFile.relation);
    const failureReasonText = getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, idealLanguage);
    const recommendationText = getIdealRecommendationText(
      idealAnalysis.diagnosis.failureReason,
      idealAnalysis.verdictState,
      activeFile.relation,
      idealLanguage,
    );
    const exportSpecs = figureSpecs.filter((figure) => (
      figure.id === 'ideal-verification' ||
      figure.id === 'ideal-raw-pv' ||
      figure.id === 'ideal-points' ||
      figure.id === 'ideal-history'
    ));

    return (
      <div className="studio-ideal-child-window-body">
        {renderVerificationPanel()}
        <div className={`studio-ideal-results-card ${idealAnalysis.isVerified ? 'studio-ideal-history-unlocked' : 'studio-ideal-history-locked'}`}>
          <div className="studio-ideal-results-card-header">
            <div>
              <strong>{idealAnalysis.isVerified ? historyContent.title : workbenchCopy.results.historyLockedFor(getRelationLabel(activeFile.relation))}</strong>
              <span>{idealAnalysis.isVerified ? workbenchCopy.results.historyUnlocked : workbenchCopy.results.historyUnlockHint}</span>
            </div>
          </div>
          {idealAnalysis.isVerified ? (
            <div className="studio-ideal-history-grid">
              <div>
                <span>{workbenchCopy.results.historicalContext}</span>
                <strong>{historyContent.discovery}</strong>
              </div>
              <div>
                <span>{workbenchCopy.results.workbenchInterpretation}</span>
                <strong>{historyContent.simulation}</strong>
              </div>
              <div>
                <span>{workbenchCopy.results.keyFigures}</span>
                <strong>{workbenchCopy.results.keyFiguresValue(formatMaybeMetric(idealAnalysis.regression.rSquared, 5), idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`)}</strong>
              </div>
            </div>
          ) : (
            <div className="studio-ideal-history-grid">
              <div>
                <span>{workbenchCopy.results.whyLocked}</span>
                <strong>{failureReasonText}</strong>
              </div>
              <div>
                <span>{workbenchCopy.results.recommendedNextStep}</span>
                <strong>{recommendationText}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="studio-ideal-results-card">
          <div className="studio-ideal-results-card-header">
            <div>
              <strong>{workbenchCopy.results.export}</strong>
              <span>{workbenchCopy.results.exportFilesHint} {exportCopy.label}</span>
            </div>
          </div>
          <div className="studio-ideal-export-actions">
            <button type="button" disabled={!isExportModeDataReady('completeBundle') || exportInProgress} onClick={() => handleExportAction('completeBundle')}>
              <FileArchive size={13} />
              {workbenchCopy.results.exportAll}
            </button>
            <button type="button" disabled={!isExportModeDataReady('report') || exportInProgress} onClick={() => handleExportAction('report')}>
              <Download size={13} />
              {workbenchCopy.results.reportPdf}
            </button>
            <button type="button" disabled={!isExportModeDataReady('verificationFigure') || exportInProgress} onClick={() => handleExportAction('verificationFigure')}>
              <BarChart3 size={13} />
              {workbenchCopy.results.verificationFigure}
            </button>
            <button type="button" disabled={!isExportModeDataReady('pointsCsv') || exportInProgress} onClick={() => handleExportAction('pointsCsv')}>
              <Table2 size={13} />
              {workbenchCopy.results.pointsCsv}
            </button>
          </div>
          <div className="studio-ideal-export-files">
            {verificationSpec ? <div><span>{workbenchCopy.results.verification}</span><strong>{verificationSpec.recommendedFilename}</strong></div> : null}
            {rawPvSpec ? <div><span>{workbenchCopy.results.rawPv}</span><strong>{rawPvSpec.recommendedFilename}</strong></div> : null}
            {pointsSpec ? <div><span>{workbenchCopy.results.pointsCsv}</span><strong>{pointsSpec.recommendedFilename}</strong></div> : null}
            {historySpec ? <div><span>{workbenchCopy.results.history}</span><strong>{historySpec.recommendedFilename}</strong></div> : null}
          </div>
          <div className="studio-figure-list studio-ideal-export-specs">
            {exportSpecs.map((figure) => (
              <div className="studio-figure-row" key={`ideal-export-${figure.id}`}>
                <div>
                  <strong>{figure.title}</strong>
                  <small>{figure.recommendedFilename}</small>
                </div>
                <span>{figure.dataCount}</span>
                <em className={`studio-figure-status-${figure.status}`}>{workbenchCopy.results.figureStatus[figure.status]}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderResultsPanel = () => {
    if (activeFile.kind === 'ideal') {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.title}</strong>
            <p>{workbenchCopy.panels.pointsTitle} / {workbenchCopy.panels.verificationTitle}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="studio-results-panel">
        <div className="studio-results-toolbar">
          <div className="studio-results-title">
            <strong>{workbenchCopy.results.title}</strong>
            <span>
              {resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}
            </span>
          </div>
          <div className="studio-results-actions">
            <button
              type="button"
              disabled={!isExportModeDataReady('completeBundle') || exportInProgress}
              onClick={() => handleExportAction('completeBundle')}
            >
              <FileArchive size={13} />
              {workbenchCopy.results.exportAll}
            </button>
            <button
              type="button"
              disabled={!isExportModeDataReady('report') || exportInProgress}
              onClick={() => handleExportAction('report')}
            >
              <Download size={13} />
              {workbenchCopy.results.reportPdf}
            </button>
            <button
              type="button"
              aria-label={`${workbenchCopy.actions.close} ${workbenchCopy.results.title}`}
              onClick={(event) => {
                event.stopPropagation();
                closePanel('results');
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="studio-results-tabs" role="tablist" aria-label={workbenchCopy.results.title}>
          {(() => {
            const openStandardResultTabs = resultsSections.filter((section) => standardResultsLayout.openTabs.includes(section.key));
            return openStandardResultTabs.map((section) => (
              <button
              type="button"
              key={section.key}
              className={standardResultsLayout.activeTab === section.key ? 'studio-results-tab-active' : ''}
              onClick={() => setActiveStandardResultsTab(section.key)}
              role="tab"
              aria-selected={standardResultsLayout.activeTab === section.key}
            >
              {section.icon}
              <span>{section.title}</span>
              <span
                role="button"
                tabIndex={0}
                className="studio-results-tab-close"
                aria-label={`${workbenchCopy.actions.close} ${section.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeStandardResultsTab(section.key);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    closeStandardResultsTab(section.key);
                  }
                }}
              >
                <X size={12} />
              </span>
            </button>
            ));
          })()}
        </div>

        <div className="studio-results-body">
          {standardResultsLayout.activeTab === 'summary' ? renderResultsSummary() : null}
          {standardResultsLayout.activeTab === 'dataTable' ? renderResultsDataTable() : null}
          {standardResultsLayout.activeTab === 'figures' ? renderResultsFigures() : null}
        </div>
      </div>
    );
  };

  const renderVerificationPanel = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.noVerificationChartTitle}</strong>
            <p>{workbenchCopy.results.noVerificationChartBody}</p>
          </div>
        </div>
      );
    }

    const idealLanguage = getIdealExperimentLanguageCode(settingsLanguagePreference);
    const failureReasonText = getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, idealLanguage);
    const recommendationText = getIdealRecommendationText(
      idealAnalysis.diagnosis.failureReason,
      idealAnalysis.verdictState,
      activeFile.relation,
      idealLanguage,
    );
    const isPvVerification = activeFile.relation === 'pv';

    return (
      <div className={`studio-verification-panel studio-verification-panel-${activeFile.relation}`}>
        <div className={`studio-verification-main-layout ${isPvVerification ? 'studio-verification-layout-pv' : 'studio-verification-layout-single'}`}>
          <div className="studio-verification-chart-column">
            <section className="studio-verification-chart-section studio-verification-chart-primary">
              <div className="studio-results-subheader">
                <div>
                  <strong>{isPvVerification ? workbenchCopy.results.pvLinearizedValidation : workbenchCopy.results.relationValidation(getRelationLabel(activeFile.relation))}</strong>
                  <span>{workbenchCopy.results.measuredScatterHint}</span>
                </div>
              </div>
              {renderIdealValidationChart(idealAnalysis)}
            </section>

            {isPvVerification ? (
              <section className="studio-verification-chart-section studio-verification-chart-secondary">
                <div className="studio-results-subheader">
                  <div>
                    <strong>{workbenchCopy.results.originalPvPhysicalView}</strong>
                    <span>{workbenchCopy.results.originalPvPhysicalHint}</span>
                  </div>
                </div>
                {renderIdealValidationChart(idealAnalysis, 'pvRaw')}
              </section>
            ) : null}
          </div>

          <div className="studio-verification-side">
            <div className={`studio-result-status ${idealAnalysis.isVerified ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
              <strong>{workbenchCopy.results.verdictLabel(getRelationLabel(activeFile.relation), getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy))}</strong>
              <span>{recommendationText}</span>
            </div>

            <div className="studio-analysis-grid">
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.pointsMetric}</span><strong>{idealAnalysis.sortedPoints.length}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.rSquared}</span><strong>{formatMaybeMetric(idealAnalysis.regression.rSquared, 5)}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.slope}</span><strong>{formatMaybeMetric(idealAnalysis.regression.slope, 6)}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.theorySlope}</span><strong>{formatMaybeMetric(idealAnalysis.theoreticalSlope, 6)}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.slopeError}</span><strong>{idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.failureReason}</span><strong>{idealAnalysis.diagnosis.failureReason ? failureReasonText : workbenchCopy.results.noneValue}</strong></div>
            </div>

            <div className="studio-ideal-diagnosis-card">
              <div>
                <span>{workbenchCopy.results.whyItHappened}</span>
                <strong>{failureReasonText}</strong>
              </div>
              <div>
                <span>{workbenchCopy.results.recommendedNextStep}</span>
                <strong>{recommendationText}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryPanel = () => (
    activeFile.kind === 'ideal' && idealAnalysis ? (
      <div className="studio-history">
        {idealAnalysis.isVerified ? (
          <>
            <p><strong>{getIdealHistoryContent(getIdealExperimentLanguageCode(settingsLanguagePreference), activeFile.relation).title}</strong></p>
            <p>{getIdealHistoryContent(getIdealExperimentLanguageCode(settingsLanguagePreference), activeFile.relation).discovery}</p>
            <p>{getIdealHistoryContent(getIdealExperimentLanguageCode(settingsLanguagePreference), activeFile.relation).simulation}</p>
            <p>{workbenchCopy.results.currentVerification(formatMaybeMetric(idealAnalysis.regression.rSquared, 5), idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`)}</p>
          </>
        ) : (
          <>
            <p><strong>{workbenchCopy.results.historyLockedFor(getRelationLabel(activeFile.relation))}</strong></p>
            <p>{getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, getIdealExperimentLanguageCode(settingsLanguagePreference))}</p>
            <p>{workbenchCopy.results.currentVerdictRecommendation(getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy), getIdealRecommendationText(idealAnalysis.diagnosis.failureReason, idealAnalysis.verdictState, activeFile.relation, getIdealExperimentLanguageCode(settingsLanguagePreference)))}</p>
          </>
        )}
      </div>
    ) : (
      <div className="studio-empty">
        <div>
          <strong>{workbenchCopy.results.noIdealHistoryTitle}</strong>
          <p>{workbenchCopy.results.noIdealHistoryBody}</p>
        </div>
      </div>
    )
  );

  const renderPanelContent = (panel: PanelDefinition) => {
    if (panel.key === 'preview') return renderPreviewPanel();
    if (panel.key === 'realtime') return renderRealtimePanel();
    if (panel.key === 'verification') return activeFile.kind === 'ideal' ? renderIdealVerificationWindow() : renderVerificationPanel();
    if (panel.key === 'results') return renderResultsPanel();
    if (panel.key === 'experimentPoints') return renderIdealPointsWindow();
    if (activeFile.kind === 'heatCapacity' && panel.key === 'heatCapacityReview') {
      const reviewSelection = heatCapacityReviewSelectionByFileId[activeFile.id] ?? null;
      const reviewOptionIds = new Set(activeFile.heatCapacityFreeTrials.map((trial) => trial.id));
      const requestedReviewTrialId =
        reviewSelection?.userSelected && reviewSelection.selectedTrialId && reviewOptionIds.has(reviewSelection.selectedTrialId)
          ? reviewSelection.selectedTrialId
          : null;
      const review = selectHeatCapacityFreeProcessReview({
        trials: activeFile.heatCapacityFreeTrials,
        traceStore: activeFile.heatCapacityFreeTraceStore,
        theoreticalGamma: activeFile.theoreticalGamma,
        selectedTrialId: requestedReviewTrialId,
      });
      return (
        <HeatCapacityProcessReviewPanel
          mode={activeFile.heatCapacityMode}
          review={review}
          selectedTrialId={review.selectedTrialId}
          language={settingsLanguagePreference}
          onSelectedTrialChange={(trialId) => {
            setHeatCapacityReviewSelectionByFileId((previous) => ({
              ...previous,
              [activeFile.id]: { selectedTrialId: trialId, userSelected: true },
            }));
          }}
        />
      );
    }
    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel.key)) {
      return (
        <HeatCapacityLeftPanel
          file={activeFile}
          language={settingsLanguagePreference}
          panelKey={panel.key}
          pendingRemoveTrialRecord={pendingRemoveHeatCapacityTrialRecord}
          onRemoveTrialRecord={requestRemoveHeatCapacityTrialRecord}
          onCancelRemoveTrialRecord={() => setPendingRemoveHeatCapacityTrialRecord(null)}
        />
      );
    }
    if (panel.key === 'history') return renderHistoryPanel();
    return (
      <div className="studio-empty">
        <div>
          <strong>{workbenchCopy.results.panelNotConnectedTitle}</strong>
          <p>{workbenchCopy.results.panelNotConnectedBody}</p>
        </div>
      </div>
    );
  };

  const renderDockHeader = (panel: PanelDefinition) => (
    <div className="studio-dock-header">
      <div>
        <span>{panel.title}</span>
        <small>{renderScientificText(panel.hint)}</small>
      </div>
      {panel.key === 'preview' ? (
        <div className="studio-panel-actions">
          {activeFile.kind === 'heatCapacity' ? renderHeatCapacityModeControl() : (
            <button
              type="button"
              className={`studio-run-control studio-run-control-${activeFile.runState === 'running' ? 'pause' : 'start'}`}
              onClick={toggleActiveFileRunState}
              title={activeFile.runState === 'running' ? workbenchCopy.actions.pause : workbenchCopy.actions.start}
              aria-label={activeFile.runState === 'running' ? workbenchCopy.actions.pause : workbenchCopy.actions.start}
            >
              {activeFile.runState === 'running' ? (
                <Pause size={14} strokeWidth={2.5} />
              ) : (
                <Play size={15} strokeWidth={2.5} />
              )}
            </button>
          )}
          {activeFile.kind !== 'heatCapacity' && (activeFile.runState === 'running' || activeFile.runState === 'paused') ? (
            <button
              type="button"
              className="studio-run-control studio-run-control-stop"
              onClick={stopActiveFile}
              title={workbenchCopy.actions.stop}
              aria-label={workbenchCopy.actions.stop}
            >
              <Square size={13} strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const renderDockPanel = (panel: PanelDefinition, optional = false) => (
    <section
      className={`studio-dock-panel ${optional ? 'studio-optional-panel' : 'studio-fixed-panel'} ${panel.key === 'results' ? 'studio-results-window' : ''}`}
      key={panel.key}
      onClick={() => setSelectedPanel(panel.key)}
    >
      {panel.key === 'results' ? null : renderDockHeader(panel)}
      {renderPanelContent(panel)}
    </section>
  );

  const renderIdealResultWindows = () => {
    if (activeFile.kind !== 'ideal') return null;

    if (!activeFile.visiblePanels.includes('results')) return null;

    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    const activePanel = idealResultWindowPanels.find((panel) => panel.key === layout.activeIdealResultTab)
      ?? idealResultWindowPanels[0];
    const openIdealResultTabs = idealResultWindowPanels.filter((panel) => layout.openTabs.includes(panel.key));

    return (
      <div
        className="studio-ideal-results-region"
        ref={idealResultWindowRegionRef}
        aria-label={workbenchCopy.results.title}
      >
        <section
          className={`studio-ideal-result-window-layer ${selectedPanel === activePanel.key ? 'studio-ideal-result-window-selected' : ''}`}
          style={{ height: `${clampIdealResultHeightRatio(layout.heightRatio) * 100}%` }}
          aria-label={workbenchCopy.results.title}
        >
          <div
            className="studio-ideal-result-window-resizer"
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={startIdealResultWindowResize}
          />
          <div className="studio-results-toolbar studio-ideal-result-window-toolbar">
            <div className="studio-results-title">
              <strong>{workbenchCopy.results.title}</strong>
              <span>{activePanel.hint}</span>
            </div>
            <div className="studio-results-actions">
              <button
                type="button"
                aria-label={`${workbenchCopy.actions.close} ${workbenchCopy.results.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeIdealResultsWindow();
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="studio-results-tabs studio-ideal-results-tabs" role="tablist" aria-label={workbenchCopy.results.idealResultsSectionsAria}>
            {openIdealResultTabs.map((panel) => (
              <button
                type="button"
                key={panel.key}
                role="tab"
                aria-selected={layout.activeIdealResultTab === panel.key}
                className={layout.activeIdealResultTab === panel.key ? 'studio-results-tab-active' : ''}
                onClick={() => setActiveIdealResultTab(panel.key)}
              >
                {panel.icon}
                <span>{panel.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="studio-results-tab-close"
                  aria-label={`${workbenchCopy.actions.close} ${panel.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeIdealResultTab(panel.key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      closeIdealResultTab(panel.key);
                    }
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
          <div className="studio-results-body">
            {renderPanelContent(activePanel)}
          </div>
        </section>
      </div>
    );
  };

  const renderHeatCapacityMaterialsWindow = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.openHeatCapacityTabs.length === 0) return null;
    const materialTabOrder = getHeatCapacityMaterialsTabOrder(activeFile);
    const openTabs = activeFile.openHeatCapacityTabs
      .filter((tabId) => materialTabOrder.includes(tabId))
      .map((tabId) => {
        const panel = getHeatCapacityTabDefinition(tabId);
        return panel ? { tabId, panel } : null;
      })
      .filter((item): item is { tabId: WorkbenchHeatCapacityTabId; panel: PanelDefinition } => item !== null);
    if (openTabs.length === 0) return null;
    const activeTabId = activeFile.activeHeatCapacityTabId && openTabs.some((item) => item.tabId === activeFile.activeHeatCapacityTabId)
      ? activeFile.activeHeatCapacityTabId
      : openTabs[0].tabId;
    const activePanel = openTabs.find((item) => item.tabId === activeTabId)?.panel ?? openTabs[0].panel;
    const materialsMaxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio();
    const materialsHeightRatio = clamp(
      activeFile.heatCapacityTabContainerHeight || 0.5,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      materialsMaxHeightRatio,
    );

    return (
      <div
        className="studio-results-region studio-heat-materials-region"
        style={{ height: `${materialsHeightRatio * 100}%` }}
        data-heat-capacity-materials-window="true"
      >
        <div
          className="studio-results-window-resizer"
          role="separator"
          aria-orientation="horizontal"
          onMouseDown={startHeatCapacityMaterialsResize}
        />
        <section className="studio-dock-panel studio-optional-panel studio-results-window studio-heat-materials-window">
        <div className="studio-results-toolbar studio-heat-materials-toolbar">
          <div className="studio-results-title">
              <strong>{heatCapacityRealtimeCopy.materialsTitle}</strong>
              <span>{heatCapacityRealtimeCopy.materialsHint}</span>
            </div>
            <div className="studio-results-actions">
              <button
                type="button"
                aria-label={heatCapacityRealtimeCopy.closeMaterialsAria}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedPanel('preview');
                  updateActiveFile((file) => (
                    file.kind === 'heatCapacity'
                      ? {
                          ...file,
                          visiblePanels: file.visiblePanels.filter((panel) => !isHeatCapacityPanelKey(panel)),
                          openHeatCapacityTabs: [],
                          activeHeatCapacityTabId: null,
                          selectedHeatCapacityPanel: 'preview',
                          updatedAt: Date.now(),
                        }
                      : file
                  ));
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="studio-results-tabs studio-heat-materials-tabs" role="tablist" aria-label={heatCapacityRealtimeCopy.materialsTabsAria}>
            {openTabs.map(({ tabId, panel }) => (
              <button
                type="button"
                key={tabId}
                role="tab"
                aria-selected={tabId === activeTabId}
                className={tabId === activeTabId ? 'studio-results-tab-active' : ''}
                onClick={() => activateHeatCapacityTab(tabId)}
              >
                {panel.icon}
                <span>{panel.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="studio-results-tab-close"
                  aria-label={`${workbenchCopy.actions.close} ${panel.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeHeatCapacityTab(tabId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      closeHeatCapacityTab(tabId);
                    }
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
          <div className="studio-results-body studio-heat-materials-body">
            {renderPanelContent(activePanel)}
          </div>
        </section>
      </div>
    );
  };

  const handleSectionKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const renderSectionTitle = (
    label: string,
    collapsed: boolean,
    onToggle: () => void,
    kind: 'files' | 'panels' = 'files',
  ) => (
    <button
      type="button"
      className={`studio-tree-title-button studio-tree-title-button-${kind} ${collapsed ? 'studio-tree-title-collapsed' : ''}`}
      onClick={onToggle}
      aria-expanded={!collapsed}
    >
      {kind === 'panels' ? <PanelLeft size={14} /> : (
        <span className="studio-tree-folder-icon">
          <Folder size={14} className="studio-folder-closed" />
          <FolderOpen size={14} className="studio-folder-open" />
        </span>
      )}
      <span>{label}</span>
    </button>
  );

  const renderHeatCapacityPanelTree = () => {
    const previewPanel = availablePanels.find((panel) => panel.key === 'preview');
    const realtimePanel = availablePanels.find((panel) => panel.key === 'realtime');
    const materialPanels = getHeatCapacityMaterialsTabOrder(activeFile)
      .map((tabId) => {
        const panel = availablePanels.find((item) => item.key === heatCapacityTabIdToPanelKey(tabId));
        return panel ? { tabId, panel: getHeatCapacityPanelDisplayDefinition(tabId, panel) } : null;
      })
      .filter((item): item is { tabId: WorkbenchHeatCapacityTabId; panel: PanelDefinition } => Boolean(item.panel));
    const materialsSelected = selectedPanel === 'results';
    const materialsOpen = activeFile.kind === 'heatCapacity' && activeFile.openHeatCapacityTabs.length > 0;
    const topPanels = [previewPanel, realtimePanel].filter((panel): panel is PanelDefinition => Boolean(panel));

    return (
      <>
        {topPanels.map((panel) => {
          const locked = LOCKED_PANEL_KEYS.includes(panel.key);
          return (
            <div
              role="button"
              tabIndex={panelsSectionCollapsed ? -1 : 0}
              key={panel.key}
              className={`studio-tree-row studio-tree-row-child ${selectedPanel === panel.key ? 'studio-panel-row-active' : ''}`}
              onClick={() => {
                if (panelsSectionCollapsed) return;
                setSelectedPanel(panel.key);
                handleLockedPanel(panel.title);
              }}
              onDoubleClick={() => {
                if (panelsSectionCollapsed) return;
                handleLockedPanel(panel.title);
              }}
              onKeyDown={(event) => handleSectionKeyDown(event, () => {
                setSelectedPanel(panel.key);
                handleLockedPanel(panel.title);
              })}
              title={panel.hint}
            >
              {panel.icon}
              <span>{panel.title}</span>
              {locked ? (
                <button
                  type="button"
                  className="studio-panel-lock-button"
                  aria-label={`${panel.title} ${workbenchCopy.files.locked}`}
                  tabIndex={panelsSectionCollapsed ? -1 : 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleLockedPanel(panel.title);
                  }}
                >
                  <LockKeyhole size={12} />
                  {workbenchCopy.files.locked}
                </button>
              ) : null}
            </div>
          );
        })}
        <div
          role="button"
          tabIndex={panelsSectionCollapsed ? -1 : 0}
          className={`studio-tree-row studio-tree-row-child studio-heat-materials-group ${materialsSelected ? 'studio-panel-row-active' : ''}`}
          onClick={() => {
            if (panelsSectionCollapsed) return;
            setSelectedPanel('results');
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            openAllHeatCapacityMaterialsTabs();
          }}
          onKeyDown={(event) => handleSectionKeyDown(event, () => {
            setSelectedPanel('results');
          })}
          title={heatCapacityRealtimeCopy.materialsFolderTitle}
        >
          <button
            type="button"
            className={`studio-results-folder-button ${activeFile.kind === 'heatCapacity' && !activeFile.heatCapacityMaterialsExpanded ? 'studio-tree-title-collapsed' : ''}`}
            aria-expanded={activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMaterialsExpanded : true}
            aria-label={heatCapacityRealtimeCopy.materialsGroupAria}
            onClick={(event) => {
              event.stopPropagation();
              if (activeFile.kind !== 'heatCapacity') return;
              updateActiveFile((file) => (
                file.kind === 'heatCapacity'
                  ? { ...file, heatCapacityMaterialsExpanded: !file.heatCapacityMaterialsExpanded, updatedAt: Date.now() }
                  : file
              ));
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openAllHeatCapacityMaterialsTabs();
            }}
          >
            <span className="studio-results-expander-icon">
              <ChevronRight size={13} />
            </span>
          </button>
          <span
            className="studio-results-folder-label"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedPanel('results');
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openAllHeatCapacityMaterialsTabs();
            }}
          >
            {heatCapacityRealtimeCopy.materialsTitle}
          </span>
          <span className="studio-tree-meta">{materialsOpen ? workbenchCopy.files.active : workbenchCopy.files.off}</span>
        </div>
        {activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMaterialsExpanded ? (
          <div className="studio-results-nav studio-heat-materials-nav">
            {materialPanels.map(({ tabId, panel }) => {
              const state = getHeatCapacityTabState(tabId);
              return (
                <button
                  type="button"
                  key={tabId}
                  className={selectedPanel === panel.key ? 'studio-results-nav-active studio-panel-row-active' : ''}
                  tabIndex={panelsSectionCollapsed ? -1 : 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPanel(panel.key);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    openHeatCapacityTab(tabId);
                  }}
                  title={heatCapacityRealtimeCopy.materialsTabTitle}
                >
                  {panel.icon}
                  <span>{panel.title}</span>
                  <span className="studio-tree-meta">{getLocalizedTreeState(state)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </>
    );
  };

  const resolvedWorkbenchTheme = settingsThemePreference === 'system' ? systemWorkbenchTheme : settingsThemePreference;

  return (
    <div className={`studio-workbench studio-theme-${resolvedWorkbenchTheme}`} data-workbench-language={settingsLanguagePreference}>
      {scanInputToast ? (
        <div className="studio-scan-input-toast" role="status">
          {scanInputToast}
        </div>
      ) : null}
      {renderHeatCapacityAdvancedParameterDialog()}
      <div
        className={`studio-shell ${consoleCollapsed ? 'studio-shell-console-collapsed' : ''}`}
        style={shellStyle}
        ref={shellRef}
      >
        <div
          ref={consoleResizeGhostRef}
          className="studio-resize-ghost-divider studio-console-resize-ghost"
          aria-hidden="true"
        />
        <header className="studio-menu">
          <div className="studio-titlebar-brand" aria-label={workbenchCopy.about.subtitle}>
            <span className="studio-brand-mark" aria-hidden="true">
              <img src="favicon.png" alt="" />
            </span>
            <span>{workbenchCopy.about.subtitle}</span>
          </div>
          <nav className="studio-top-commands" aria-label={workbenchCopy.menus.topCommandsAria} ref={topCommandsRef}>
            {renderTopCommand('new', workbenchCopy.menus.experimentFiles, <FilePlus2 size={14} />)}
            {renderTopCommand('edit', workbenchCopy.menus.edit, <Undo2 size={14} />)}
            {renderTopCommand('window', workbenchCopy.menus.window, <Wrench size={14} />)}
            {renderTopCommand('settings', workbenchCopy.menus.settings, <Settings size={14} />)}
            {renderTopCommand('help', workbenchCopy.menus.help, <BookOpen size={14} />)}
          </nav>
          <div className="studio-titlebar-drag-fill" aria-hidden="true" />
          {desktopWindowControlsAvailable ? (
            <div className="studio-window-controls" aria-label={windowControlCopy.controls}>
              <button
                type="button"
                className="studio-window-control-button"
                aria-label={windowControlCopy.minimize}
                title={windowControlCopy.minimize}
                onClick={minimizeDesktopWindow}
              >
                <span className="studio-window-control-glyph studio-window-control-glyph-minimize" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="studio-window-control-button"
                aria-label={desktopWindowMaximized ? windowControlCopy.restore : windowControlCopy.maximize}
                title={desktopWindowMaximized ? windowControlCopy.restore : windowControlCopy.maximize}
                onClick={toggleDesktopWindowMaximize}
              >
                <span
                  className={`studio-window-control-glyph ${desktopWindowMaximized ? 'studio-window-control-glyph-restore' : 'studio-window-control-glyph-maximize'}`}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className="studio-window-control-button studio-window-control-close"
                aria-label={windowControlCopy.close}
                title={windowControlCopy.close}
                onClick={closeDesktopWindow}
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          ) : null}
          {renderTopMenu()}
        </header>
        {renderAboutWindow()}
        {renderUpdateDialog()}
        {renderGeneralSettingsWindow()}

        <main
          className={`studio-body ${leftCollapsed ? 'studio-left-collapsed' : ''}`}
          style={workbenchStyle}
          ref={workbenchBodyRef}
        >
          <div
            ref={sidebarResizeGhostRef}
            className="studio-resize-ghost-divider studio-sidebar-resize-ghost"
            aria-hidden="true"
          />
          <aside className="studio-sidebar" aria-label={`${workbenchCopy.files.openFiles} ${workbenchCopy.files.panels}`}>
            <div className="studio-panel-header">
              <span>{workbenchCopy.files.openFiles}</span>
              <button
                type="button"
                className="studio-panel-collapse"
                aria-label={`${workbenchCopy.actions.hide} ${workbenchCopy.files.openFiles}`}
                onClick={() => setLeftCollapsed(true)}
              >
                {workbenchCopy.actions.hide}
              </button>
            </div>
            <div className="studio-sidebar-body">
              <section className={`studio-tree-section ${openFileMenuId ? 'studio-tree-section-menu-open' : ''}`}>
                {renderSectionTitle(workbenchCopy.files.files, filesSectionCollapsed, () => setFilesSectionCollapsed((current) => !current))}
                <div className={`studio-tree-section-content ${filesSectionCollapsed ? 'studio-tree-section-content-collapsed' : ''}`} aria-hidden={filesSectionCollapsed}>
                  {isWorkbenchEmpty ? (
                    <div className="studio-empty-files">
                      <strong>{workbenchCopy.files.noOpenFileState}</strong>
                      <span>{workbenchCopy.files.emptyHint}</span>
                    </div>
                  ) : files.map((file) => {
                    const isRenaming = renamingFileId === file.id;
                    const menuOpen = openFileMenuId === file.id;
                    const pendingDelete = pendingDeleteFileId === file.id;
                    const fileKindLabel = getWorkbenchFileKindLabel(file.kind, workbenchCopy.files);

                    return (
                      <div
                        role="button"
                        tabIndex={filesSectionCollapsed ? -1 : 0}
                        key={file.id}
                        className={`studio-tree-row studio-file-row ${file.id === selectedFileId ? 'studio-file-row-selected' : ''} ${file.id === activeFile.id ? 'studio-file-row-active' : ''} ${menuOpen ? 'studio-file-row-menu-open' : ''} ${isRenaming ? 'studio-file-row-renaming' : ''}`}
                        onClick={() => {
                          if (!isRenaming && !filesSectionCollapsed) setSelectedFileId(file.id);
                        }}
                        onDoubleClick={() => {
                          if (!isRenaming && !filesSectionCollapsed) selectFile(file);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (isRenaming || filesSectionCollapsed) return;
                          setOpenFileMenuId(file.id);
                          setPendingDeleteFileId(null);
                        }}
                        onKeyDown={(event) => handleSectionKeyDown(event, () => selectFile(file))}
                      >
                        {file.kind === 'standard' ? <Activity size={13} /> : file.kind === 'ideal' ? <FlaskConical size={13} /> : <Gauge size={13} />}
                        {isRenaming ? (
                          <input
                            className="studio-file-rename-input"
                            ref={renameInputRef}
                            value={renameDraft}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={() => {
                              renameSelectionModeRef.current = 'normal';
                            }}
                            onChange={(event) => {
                              renameSelectionModeRef.current = 'normal';
                              setRenameDraft(event.target.value);
                            }}
                            onBlur={() => commitRenameFileFromOutside()}
                            onKeyDown={(event) => {
                              event.stopPropagation();
                              if (event.key === 'ArrowRight' && renameSelectionModeRef.current === 'initial') {
                                event.preventDefault();
                                selectRenameNumericSuffix(event.currentTarget);
                                renameSelectionModeRef.current = 'normal';
                                return;
                              }
                              if (event.key === 'Enter') {
                                renameSelectionModeRef.current = 'normal';
                                commitRenameFile(file.id);
                                return;
                              }
                              if (event.key === 'Escape') {
                                renameSelectionModeRef.current = 'normal';
                                cancelRenameFile();
                                return;
                              }
                              if (
                                event.key === 'ArrowLeft'
                                || event.key === 'Home'
                                || event.key === 'End'
                                || event.key === 'Delete'
                                || event.key === 'Backspace'
                                || event.key.length === 1
                              ) {
                                renameSelectionModeRef.current = 'normal';
                              }
                            }}
                          />
                        ) : (
                          <span>{file.name}</span>
                        )}
                        <span className="studio-tree-meta">{fileKindLabel}</span>
                        <button
                          type="button"
                          className="studio-file-menu-button"
                          aria-label={workbenchCopy.files.openActions(file.name)}
                          tabIndex={filesSectionCollapsed ? -1 : 0}
                          ref={menuOpen ? fileMenuButtonRef : undefined}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenFileMenuId((current) => (current === file.id ? null : file.id));
                            setPendingDeleteFileId(null);
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpen ? (
                          <div
                            className={pendingDelete ? 'studio-file-menu studio-file-menu-pending' : 'studio-file-menu'}
                            ref={fileMenuRef}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button type="button" onClick={() => beginRenameFile(file)}>
                              <Pencil size={13} />
                              {workbenchCopy.files.rename}
                            </button>
                            <button type="button" onClick={() => requestCloseWorkbenchFile(file)}>
                              <X size={13} />
                              {workbenchCopy.files.closeExperiment}
                            </button>
                            <div className={`studio-file-menu-confirm-row ${pendingDelete ? 'studio-file-menu-confirm-row-pending' : ''}`}>
                              <button
                                type="button"
                                className={pendingDelete ? 'studio-file-menu-danger studio-file-menu-confirm' : 'studio-file-menu-danger'}
                                onClick={() => requestDeleteWorkbenchFile(file)}
                              >
                                <Trash2 size={13} />
                                {pendingDelete ? workbenchCopy.files.confirmDelete : workbenchCopy.files.delete}
                              </button>
                              {pendingDelete ? (
                                <button
                                  type="button"
                                  className="studio-file-menu-cancel"
                                  aria-label={`${workbenchCopy.files.cancel} ${file.name}`}
                                  onClick={cancelDeleteWorkbenchFile}
                                >
                                  {workbenchCopy.files.cancel}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="studio-tree-section">
                {renderSectionTitle(isWorkbenchEmpty ? workbenchCopy.files.panels : activeFile.kind === 'heatCapacity' ? `${activeFile.name.toUpperCase()} / PANELS` : `${activeFile.name} / ${workbenchCopy.files.panels}`, panelsSectionCollapsed, () => setPanelsSectionCollapsed((current) => !current), 'panels')}
                <div className={`studio-tree-section-content ${panelsSectionCollapsed ? 'studio-tree-section-content-collapsed' : ''}`} aria-hidden={panelsSectionCollapsed}>
                {isWorkbenchEmpty ? (
                  <div className="studio-empty-panel-tree">
                    <span>{workbenchCopy.files.noOpenPanelState}</span>
                  </div>
                ) : activeFile.kind === 'heatCapacity' ? (
                  renderHeatCapacityPanelTree()
                ) : availablePanels.filter((panel) => !(activeFile.kind === 'ideal' && isIdealResultWindowKey(panel.key))).map((panel) => {
                  const visible = activeFile.visiblePanels.includes(panel.key);
                  const locked = LOCKED_PANEL_KEYS.includes(panel.key);
                  return (
                    <React.Fragment key={panel.key}>
                      <div
                        role="button"
                        tabIndex={panelsSectionCollapsed ? -1 : 0}
                        className={`studio-tree-row studio-tree-row-child ${selectedPanel === panel.key ? 'studio-panel-row-active' : ''}`}
                        onClick={() => {
                          if (panelsSectionCollapsed) return;
                          setSelectedPanel(panel.key);
                          if (locked) handleLockedPanel(panel.title);
                        }}
                        onDoubleClick={() => {
                          if (panelsSectionCollapsed) return;
                          if (locked) {
                            handleLockedPanel(panel.title);
                          } else if (panel.key === 'results' && activeFile.kind === 'ideal') {
                            openIdealResultsWindow('experimentPoints', true);
                          } else {
                            openPanel(panel.key);
                          }
                        }}
                        onKeyDown={(event) => handleSectionKeyDown(event, () => {
                          if (locked) {
                            setSelectedPanel(panel.key);
                            handleLockedPanel(panel.title);
                          } else if (panel.key === 'results') {
                            if (activeFile.kind === 'ideal') {
                              openIdealResultsWindow('experimentPoints', true);
                            } else {
                              openStandardResultsWindow('summary', true);
                            }
                          } else {
                            openPanel(panel.key);
                          }
                        })}
                        title={locked ? panel.hint : panel.key === 'results' ? `${panel.hint}. ${workbenchCopy.results.resultsOpenHint}` : `${panel.hint}. ${workbenchCopy.results.resultsJumpHint}`}
                      >
                        {panel.key === 'results' ? (
                          <button
                            type="button"
                            className={`studio-results-folder-button ${resultsChildrenCollapsed ? 'studio-tree-title-collapsed' : ''}`}
                            aria-label={resultsChildrenCollapsed ? workbenchCopy.results.resultsTreeExpandAria : workbenchCopy.results.resultsTreeCollapseAria}
                            aria-expanded={!resultsChildrenCollapsed}
                            tabIndex={panelsSectionCollapsed ? -1 : 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              setResultsChildrenCollapsed((current) => !current);
                            }}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              if (activeFile.kind === 'ideal') {
                                openIdealResultsWindow('experimentPoints', true);
                              } else {
                                openStandardResultsWindow('summary', true);
                              }
                            }}
                          >
                            <span className="studio-results-expander-icon">
                              <ChevronRight size={13} />
                            </span>
                            <span className="studio-results-folder-label">{panel.title}</span>
                          </button>
                        ) : (
                          <>
                            {panel.icon}
                            <span>{panel.title}</span>
                          </>
                        )}
                        {locked ? (
                          <button
                            type="button"
                            className="studio-panel-lock-button"
                            aria-label={`${panel.title} ${workbenchCopy.files.locked}`}
                            tabIndex={panelsSectionCollapsed ? -1 : 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleLockedPanel(panel.title);
                            }}
                          >
                            <LockKeyhole size={12} />
                            {workbenchCopy.files.locked}
                          </button>
                        ) : (
                          <span className="studio-tree-meta">{visible ? workbenchCopy.files.shown : workbenchCopy.files.off}</span>
                        )}
                      </div>
                      {panel.key === 'results' && activeFile.kind === 'ideal' && !resultsChildrenCollapsed ? (
                        <div className="studio-results-nav studio-results-child-nav studio-ideal-results-nav">
                          {idealResultWindowPanels.map((childPanel) => (
                            <button
                              type="button"
                              key={childPanel.key}
                              className={selectedPanel === childPanel.key ? 'studio-results-nav-active studio-panel-row-active' : ''}
                              tabIndex={panelsSectionCollapsed ? -1 : 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPanel(childPanel.key);
                              }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                openIdealResultWindow(childPanel.key);
                              }}
                              title={workbenchCopy.results.openIdealResultsTabTitle}
                            >
                              {childPanel.icon}
                              <span>{childPanel.title}</span>
                              <span className="studio-tree-meta">
                                {getLocalizedTreeState(getIdealResultTabState(childPanel.key))}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {panel.key === 'results' && activeFile.kind === 'standard' && !resultsChildrenCollapsed ? (
                        <div className="studio-results-nav studio-results-child-nav">
                          {resultsSections.map((section) => (
                            <button
                              type="button"
                              key={section.key}
                              className={getStandardResultsTabState(section.key) === 'active' && selectedPanel === 'results' ? 'studio-results-nav-active studio-panel-row-active' : ''}
                              tabIndex={panelsSectionCollapsed ? -1 : 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPanel('results');
                              }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                selectResultsSection(section.key, true);
                              }}
                              title={workbenchCopy.results.resultsJumpHint}
                            >
                              {section.icon}
                              <span>{section.title}</span>
                              <span className="studio-tree-meta">{getLocalizedTreeState(getStandardResultsTabState(section.key))}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </React.Fragment>
                  );
                })}
                </div>
              </section>
            </div>
            <div className="studio-sidebar-usage-hint" aria-label="文件树操作提示">
              <span>单击选中</span>
              <span>双击打开</span>
            </div>
            <div
              className="studio-sidebar-resizer"
              role="separator"
              aria-orientation="vertical"
              onMouseDown={(event) => startSidebarResize('left', event)}
            />
          </aside>

          {leftCollapsed ? (
            <button type="button" className="studio-rail-button studio-left-rail" onClick={() => setLeftCollapsed(false)}>
              {workbenchCopy.files.openFiles}
            </button>
          ) : null}

          <section className="studio-layout" aria-label={workbenchCopy.files.workspaceAria}>
            <div className="studio-file-tabs" ref={fileTabsRef}>
              {isWorkbenchEmpty ? (
                <div className="studio-file-tabs-empty">{workbenchCopy.files.noOpenFiles}</div>
              ) : files.map((file) => (
                <div
                  key={file.id}
                  className={`studio-file-tab ${file.id === selectedFileId ? 'studio-file-tab-selected' : ''} ${file.id === activeFile.id ? 'studio-file-tab-active' : ''}`}
                >
                  <button
                    type="button"
                    className="studio-file-tab-select"
                    onClick={() => setSelectedFileId(file.id)}
                    onDoubleClick={() => selectFile(file)}
                    title={file.name}
                  >
                    {file.kind === 'standard' ? <Activity size={13} /> : file.kind === 'ideal' ? <FlaskConical size={13} /> : <Gauge size={13} />}
                    <span className="studio-file-tab-name">{file.name}</span>
                    <span className="studio-file-kind">{getWorkbenchFileKindLabel(file.kind, workbenchCopy.files)}</span>
                  </button>
                  <button
                    type="button"
                    className="studio-file-tab-close"
                    aria-label={`${workbenchCopy.files.closeExperiment} ${file.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      requestCloseWorkbenchFile(file);
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className={`studio-workspace-shell ${isWorkbenchEmpty ? 'studio-workspace-shell-empty' : 'studio-workspace-shell-active'} ${!isWorkbenchEmpty && parametersCollapsed ? 'studio-params-collapsed' : ''}`} ref={workspaceShellRef}>
              <div
                ref={parameterSidebarResizeGhostRef}
                className="studio-resize-ghost-divider studio-params-sidebar-resize-ghost"
                aria-hidden="true"
              />
              <div
                className={`studio-center-workspace ${!isWorkbenchEmpty ? 'studio-center-workspace-active' : ''} ${!isWorkbenchEmpty && (resultsPanel || idealResultPanels.length > 0 || (activeFile.kind === 'heatCapacity' && activeFile.openHeatCapacityTabs.length > 0)) ? 'studio-results-open' : ''} ${isWorkbenchEmpty ? 'studio-center-workspace-empty' : ''}`}
                ref={centerWorkspaceRef}
              >
                {isWorkbenchEmpty ? (
                  renderEmptyWorkbench()
                ) : (
                  <>
                    <div
                      className={`studio-live-workspace ${liveWorkspaceResizing ? 'studio-live-workspace-resizing' : ''}`}
                      style={liveWorkspaceStyle}
                      ref={liveWorkspaceRef}
                    >
                      {primaryPanels[0] ? renderDockPanel(primaryPanels[0]) : null}
                      <button
                        type="button"
                        className="studio-live-workspace-resizer"
                        aria-label={workbenchCopy.panels.liveWorkspaceResizeAria}
                        onPointerDown={startLiveWorkspaceResize}
                      />
                      <div
                        ref={liveWorkspaceResizeGhostRef}
                        className="studio-resize-ghost-divider studio-live-workspace-resize-ghost"
                        aria-hidden="true"
                      />
                      {primaryPanels[1] ? renderDockPanel(primaryPanels[1]) : null}
                      {auxiliaryPanels.length > 0 ? (
                        <div className="studio-optional-panels">
                          {auxiliaryPanels.map((panel) => renderDockPanel(panel, true))}
                        </div>
                      ) : null}
                    </div>
                    {resultsPanel && activeFile.kind === 'standard' ? (
                      <div
                        className="studio-results-region"
                        style={{ height: `${clampIdealResultHeightRatio(standardResultsLayout.heightRatio) * 100}%` }}
                      >
                        <div
                          className="studio-results-window-resizer"
                          role="separator"
                          aria-orientation="horizontal"
                          onMouseDown={startStandardResultsResize}
                        />
                        {renderDockPanel(resultsPanel, true)}
                      </div>
                    ) : null}
                    {renderIdealResultWindows()}
                    {renderHeatCapacityMaterialsWindow()}
                  </>
                )}
              </div>

              {!isWorkbenchEmpty ? (
              <aside
                className={`studio-current-params ${currentParameterControlsLocked ? 'studio-current-params-locked' : ''}`}
                aria-label={workbenchCopy.parameters.title}
                aria-disabled={currentParameterControlsLocked}
              >
                <div
                  className="studio-params-resizer"
                  role="separator"
                  aria-orientation="vertical"
                  onMouseDown={(event) => startSidebarResize('params', event)}
                />
                <div className="studio-current-params-header">
                  <div>
                    <span>{workbenchCopy.parameters.title}</span>
                    <small>{currentParameterControlsLocked ? workbenchCopy.parameters.lockedUntilStopped : workbenchCopy.parameters.currentFileValues}</small>
                  </div>
                  <button
                    type="button"
                    className="studio-panel-collapse"
                    aria-label={`${workbenchCopy.actions.hide} ${workbenchCopy.parameters.title}`}
                    onClick={() => setParametersCollapsed(true)}
                  >
                    {workbenchCopy.actions.hide}
                  </button>
                </div>
                <div className="studio-current-params-body" ref={currentParametersBodyRef}>
                  <div className="studio-param-file">
                    <strong>{activeFile.kind === 'standard' ? workbenchCopy.parameters.standardSimulation : activeFile.kind === 'ideal' ? workbenchCopy.parameters.idealSimulation : workbenchCopy.parameters.heatCapacityExperiment}</strong>
                    <span>{activeFile.name}</span>
                    <span className={`studio-param-state ${parametersDirty || (activeFile.kind === 'ideal' && activeFile.needsReset) ? 'studio-param-state-pending' : ''}`}>
                      {parametersDirty
                        ? workbenchCopy.parameters.savedChangesOnStart
                        : activeFile.kind === 'ideal' && activeFile.needsReset
                          ? workbenchCopy.parameters.idealRuntimeOnStart
                          : workbenchCopy.parameters.applied}
                    </span>
                  </div>
                  {renderIdealControls()}
                  {activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free' ? (
                    renderHeatCapacityFreeParameterPanel()
                  ) : activeFile.kind === 'heatCapacity' ? (
                    <>
                      <div className="studio-panel-note">{workbenchCopy.parameters.heatCapacityReadonlyNote}</div>
                    </>
                  ) : null}
                  {activeFile.kind === 'ideal' ? (
                    <section className={`studio-param-advanced ${idealAdvancedSettingsOpen ? 'studio-param-advanced-open' : ''}`}>
                      <button
                        type="button"
                        className="studio-param-advanced-toggle"
                        aria-expanded={idealAdvancedSettingsOpen}
                        onClick={toggleIdealAdvancedSettings}
                      >
                        <span>
                          <strong>{workbenchCopy.parameters.advancedSettings}</strong>
                          <small>{idealAdvancedSettingsOpen ? workbenchCopy.parameters.advancedHide : workbenchCopy.parameters.advancedShow}</small>
                        </span>
                        <ChevronDown
                          size={15}
                          className={`studio-param-advanced-chevron ${idealAdvancedSettingsOpen ? 'studio-param-advanced-chevron-open' : ''}`}
                        />
                      </button>
                      {idealAdvancedSettingsBodyVisible ? (
                        <div className="studio-param-advanced-body" ref={idealAdvancedSettingsBodyRef} aria-hidden={!idealAdvancedSettingsOpen}>
                          {editableCurrentParameters.map((param) => renderWorkbenchParameterInputRow(param))}
                        </div>
                      ) : null}
                    </section>
                  ) : activeFile.kind === 'heatCapacity' ? null : (
                    <>
                      {editableCurrentParameters.map((param) => renderWorkbenchParameterInputRow(param))}
                    </>
                  )}
                  {parameterErrors.length > 0 ? (
                    <div className="studio-param-errors">
                      {parameterErrors.map((error) => (
                        <span key={error}>{error}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className="studio-readonly-note">
                    {activeFile.kind === 'standard'
                        ? workbenchCopy.parameters.standardReadonlyNote
                        : activeFile.kind === 'heatCapacity'
                          ? workbenchCopy.parameters.heatCapacityReadonlyNote
                          : workbenchCopy.parameters.idealReadonlyNote}
                  </div>
                </div>
              </aside>
              ) : null}

              {!isWorkbenchEmpty && parametersCollapsed ? (
                <button type="button" className="studio-rail-button studio-right-rail" onClick={openParameterSidebarFromRail}>
                  {workbenchCopy.parameters.title}
                </button>
              ) : null}
            </div>
          </section>
        </main>

        <section className={`studio-console ${consoleCollapsed ? 'studio-console-collapsed' : ''}`} aria-label={workbenchCopy.console.title}>
          <div
            className="studio-console-resizer"
            role="separator"
            aria-orientation="horizontal"
            aria-label={workbenchCopy.console.title}
            onPointerDown={startConsoleResize}
          />
          <div className="studio-console-header">
            <button
              type="button"
              className="studio-console-toggle"
              aria-expanded={!consoleCollapsed}
              aria-label={workbenchCopy.console.title}
              onClick={() => setConsoleCollapsed((current) => !current)}
            >
              <ChevronDown size={13} />
            </button>
            <span>{workbenchCopy.console.title}</span>
            <div className="studio-console-tabs">
              {(['logs', 'warnings', 'summary'] as const).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  className={consoleTab === tab ? 'studio-console-tab-active' : undefined}
                  onClick={() => setConsoleTab(tab)}
                >
                  {workbenchCopy.console.tabs[tab]}
                </button>
              ))}
            </div>
          </div>
          <div className="studio-console-body" ref={consoleBodyRef}>
            {consoleTab === 'summary' ? (
              <div className="studio-console-summary">
                <div><span>{workbenchCopy.console.total}</span><strong>{logs.length}</strong></div>
                <div><span>{workbenchCopy.console.info}</span><strong>{consoleSummary.counts.info}</strong></div>
                <div><span>{workbenchCopy.console.success}</span><strong>{consoleSummary.counts.success}</strong></div>
                <div><span>{workbenchCopy.console.warnings}</span><strong>{consoleSummary.counts.warning}</strong></div>
                <div><span>{workbenchCopy.console.errors}</span><strong>{consoleSummary.counts.error}</strong></div>
                <div className="studio-console-summary-wide">
                  <span>{workbenchCopy.console.latest}</span>
                  <strong>{consoleSummary.latest ? `${consoleSummary.latest.time} ${consoleSummary.latest.message}` : workbenchCopy.console.noLogs}</strong>
                </div>
                <div className="studio-console-summary-wide">
                  <span>{workbenchCopy.console.runtime}</span>
                  <strong>{consoleSummary.runtime}</strong>
                </div>
              </div>
            ) : displayedLogs.length > 0 ? (
              displayedLogs.map((log) => (
                <div className="studio-log" key={log.id}>
                  <span className="studio-log-time">{log.time}</span>
                  <span className={`studio-log-kind-${log.kind}`}>
                    {log.kind === 'info'
                      ? workbenchCopy.console.info
                      : log.kind === 'success'
                        ? workbenchCopy.console.success
                        : log.kind === 'warning'
                          ? workbenchCopy.console.warnings
                          : workbenchCopy.console.errors}
                  </span>
                  <span>{log.message}</span>
                </div>
              ))
            ) : (
              <div className="studio-console-empty">
                {consoleTab === 'warnings' ? workbenchCopy.console.noWarnings : workbenchCopy.console.noLogs}
              </div>
            )}
          </div>
        </section>

        <footer className="studio-status">
          <div className="studio-status-group">
            <span>{workbenchCopy.status.activeFile(isWorkbenchEmpty ? workbenchCopy.status.none : activeFile.name)}</span>
            <span>{workbenchCopy.status.selectedBlock(isWorkbenchEmpty ? workbenchCopy.status.none : activePanelTitle)}</span>
          </div>
          <div className="studio-status-group">
            <span>
              {consoleSummary.runtime}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default WorkbenchStudioPrototype;
