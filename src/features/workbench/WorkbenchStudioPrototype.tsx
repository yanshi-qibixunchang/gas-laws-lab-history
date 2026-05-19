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
  MoreHorizontal,
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
import type { ExperimentRelation, HistogramBin, IdealGasExperimentPoint, Particle, SimulationParams, SimulationStats } from '../../shared/types';
import { PhysicsEngine } from '../../domain/hardSphere/PhysicsEngine';
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
  enterHeatCapacityFreeModeWorkbenchState,
  getHeatCapacityStopcockTargetAngle,
  getHeatCapacityStopcockState,
  getHeatCapacityPressureReleaseBurstUntilMs,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle,
  getHeatCapacityPumpFrequencyState,
  HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS,
  HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  HEAT_CAPACITY_PUMP_RATE_SLOW_THRESHOLD_HZ,
  isHeatCapacityPressureZeroWithinTolerance,
  getWorkbenchParameterRows,
  normalizeHeatCapacityFileName,
  captureHeatCapacityWorkbenchSample,
  markHeatCapacityDemoComplete,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoStart,
  refreshHeatCapacityPumpFrequency,
  registerHeatCapacityPumpStroke,
  resetHeatCapacityForManualExperiment,
  resetHeatCapacityFreeRunWorkbenchState,
  selectActiveHeatCapacityWorkbenchDisplay,
  setHeatCapacityPressureZeroOffset,
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
import HeatCapacityInstrumentScene from '../heatCapacity/HeatCapacityInstrumentScene';
import { HeatCapacityLeftPanel } from '../heatCapacity/HeatCapacityLeftPanel.tsx';
import {
  createHeatCapacityAutoDemoSteps,
  getHeatCapacityAutoDemoTimeline,
  type HeatCapacityAutoDemoAction,
  type HeatCapacityAutoDemoStep,
  type HeatCapacityAutoDemoTimelineItem,
} from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  calculateHeatCapacityMeanResult,
  createDefaultHeatCapacityProcessingResult,
  createHeatCapacityTrialFromAutoDemoSamples,
  createHeatCapacityTrials,
  getHeatCapacityCompletedTrialCount,
  getHeatCapacityNextActiveTrialIndex,
  normalizeHeatCapacityExpectedTrialCount,
  recordHeatCapacityU1,
  recordHeatCapacityU2,
  removeHeatCapacityTrialRecord,
  resizeHeatCapacityTrials,
  type HeatCapacityTrialRecordInput,
  type HeatCapacityTrialRecordRemovalKind,
} from '../../domain/heatCapacity/heatCapacityTrialModel.ts';
import {
  evaluateFreeU0Record,
  evaluateFreeU1Record,
  evaluateFreeU2Record,
  recordFreeU0,
  recordFreeU1,
  recordFreeU2,
  type HeatCapacityFreeRecordRejectReason,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  calculateFreeHeatCapacityMeanResult,
  createHeatCapacityFreeTrial,
  removeHeatCapacityFreeTrialRecord,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createHeatCapacityExperimentProfile,
  createHeatCapacityExperimentSeed,
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
import './WorkbenchStudioPrototype.css';

type LogKind = 'info' | 'warning' | 'success' | 'error';
type ConsoleTab = 'logs' | 'warnings' | 'summary';
type TopMenu = 'new' | 'edit' | 'window' | 'settings' | 'help' | null;
type ResultsSectionKey = WorkbenchStandardResultsTab;
type WorkbenchThemePreference = 'system' | 'light' | 'dark';
type WorkbenchLanguagePreference = 'zh-CN' | 'zh-TW' | 'en';
type WorkbenchPerformanceMode = 'standard' | 'balanced' | 'performance';
type IdealSamplingPresetKey = 'fast' | 'balanced' | 'stable';
type HeatCapacityManualRecordKind = 'u0' | 'u1' | 'u2';
type HeatCapacityMode = 'demo' | 'guide' | 'free';

const WORKBENCH_APP_VERSION = __APP_VERSION__;

type ManualHeatCapacityStep =
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
  | 'nextTrialRequired'
  | 'calculateRequired'
  | 'completed';

type ManualHeatCapacityAction =
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
  | 'recordU2'
  | 'startNextTrial'
  | 'calculate';

type ManualHeatCapacityRollbackAnimation = 'valveBounce' | 'stopcockBounce' | 'pumpBulbBounce' | 'knobBounce' | 'powerBounce';
type HeatCapacityToastLevel = 'info' | 'success' | 'warning' | 'danger';
type HeatCapacityToastSource =
  | 'manual-guide'
  | 'manual-blocked'
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

interface ManualHeatCapacityGuardResult {
  allowed: boolean;
  expectedControlId?: string;
  expectedMessage?: string;
  expectedLevel?: HeatCapacityToastLevel;
  rollbackAnimation?: ManualHeatCapacityRollbackAnimation;
  suppressGuidance?: boolean;
}

const MANUAL_HEAT_CAPACITY_IDLE_HINT_DELAY_MS = 1000;
const MANUAL_HEAT_CAPACITY_IDLE_HINT_REPEAT_MS = 3000;
const HEAT_CAPACITY_GUIDE_NEXT_TRIAL_DELAY_MS = 2000;
const HEAT_CAPACITY_GUIDE_START_NOTICE_MS = 1000;
const HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS = 2000;
const HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS = 2000;
const HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS = 220;
const HEAT_CAPACITY_FREE_RESET_FEEDBACK_MS = 650;
const HEAT_CAPACITY_PRESSURE_WARNING_MESSAGE = '压强接近安全阈值，请准备停止打气。';
const HEAT_CAPACITY_PRESSURE_ALARM_MESSAGE = '压强已超过安全阈值，请停止打气。';
const HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER = '请关闭打气阀门。';
const HEAT_CAPACITY_FREE_RECORD_CONFIG = {
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  u0ZeroToleranceMv: 0.12,
  minimumUsefulU1CorrectedMv: 90,
  overVentedMinimumU2CorrectedMv: 0.2,
  pressureDangerMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
};
const heatCapacityFreeRecordRejectMessages: Record<HeatCapacityFreeRecordRejectReason, string> = {
  'zero-not-ready': '请先开电源、打开旋塞并完成调零，待 Uₚ 稳定接近 0 后再记录 U₀。',
  'missing-u0': '请先点击记录 U₀，再记录 U₁ 或 U₂。',
  'calibration-changed': '调零状态已改变，请重新记录 U₀ 后再继续。',
  'unstable-pressure': '压强读数仍在变化，请等待稳定后再记录。',
  'unstable-temperature': '温度读数仍在变化，请等待回到稳定环境值后再记录。',
  'insufficient-u1': 'U₁ 压强差不足，请关闭旋塞并继续打气到有效范围。',
  'release-not-started': '请先完成快速放气并关闭旋塞，再记录 U₂。',
  'over-vented': '放气过度，U₂ 已低于有效范围；请重新开始本组 Free trial。',
  'pressure-danger': HEAT_CAPACITY_PRESSURE_ALARM_MESSAGE,
  'invalid-sequence': '当前操作顺序不能记录该数据点，请按 U₀、U₁、U₂ 的顺序进行。',
};
const HEAT_CAPACITY_TOAST_PRIORITY: Record<HeatCapacityToastLevel, number> = {
  info: 0,
  success: 0,
  warning: 1,
  danger: 2,
};
const HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY = 3;
const HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY = 4;

const isHeatCapacityManualRecordStep = (step: ManualHeatCapacityStep) => (
  step === 'recordU0Required' ||
  step === 'recordU1Required' ||
  step === 'recordU2Required'
);

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
    performanceModeOff: string;
    performanceModeBalanced: string;
    performanceModeOn: string;
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
    buildPlaceholder: string;
    sessionCacheSummary: (total: number) => string;
    sessionCacheBreakdown: (ideal: number, heat: number, standard: number) => string;
  };
  files: {
    openFiles: string;
    files: string;
    panels: string;
    noOpenFiles: string;
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
    hardSphereParticleMultiplier: string;
    hardSphereSpeedMultiplier: string;
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
  };
}

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
const HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO = 0.32;
const HEAT_CAPACITY_MATERIALS_MAX_HEIGHT_RATIO = 0.72;
const STANDARD_RESULTS_BOTTOM_INSET = 10;
const RESIZER_GRAB_SAFE_SPACE = 14;
const IDEAL_RESULT_WINDOW_DEFAULTS_STORAGE_KEY = 'hsl_workbench_ideal_result_window_defaults';
const WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY = 'hsl_workbench_layout_defaults_v1';
const WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY = 'hsl_workbench_general_settings';
const HEAT_CAPACITY_AUTO_DEMO_RESET_MS = 1_800;
const HEAT_CAPACITY_AUTO_DEMO_STEP_PANEL_EXIT_MS = 560;

const defaultWorkbenchGeneralSettings: WorkbenchGeneralSettings = {
  theme: 'system',
  language: 'zh-CN',
  performanceMode: 'standard',
};

const workbenchCopies: Record<WorkbenchLanguagePreference, WorkbenchCopy> = {
  'zh-CN': {
    menus: {
      newStudy: '新建研究', experimentFiles: '实验文件', newExperiment: '新建实验', openExperiment: '打开实验', noCachedExperiments: '没有可打开的缓存实验', edit: '编辑', window: '窗口', settings: '设置', help: '帮助', general: '通用',
      standardStudy: '标准模拟研究', idealStudy: '理想气体模拟研究', heatCapacityStudy: '空气比热容比实验', undo: '撤销', redo: '重做', empty: '空',
      clearEditHistory: '清空编辑历史', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '恢复默认布局', default: '默认',
      performanceMode: '性能模式', exportEnvironment: '导出环境', saveWorkbenchLayoutDefault: '保存当前窗口布局为默认',
      userGuide: '用户指南', theoryPdf: '理论文档 PDF', about: '关于热容比实验室', topCommandsAria: '顶部命令',
    },
    settings: {
      title: '通用设置', subtitle: '主题、语言、快捷键和布局偏好', closeAria: '关闭通用设置', theme: '主题', themeHint: '使用系统、亮色或暗色模式',
      themeOptions: { system: { label: '跟随系统', hint: '遵循系统偏好' }, light: { label: '亮色', hint: '亮色工作区预览' }, dark: { label: '暗色', hint: '暗色工作区预览' } },
      language: '语言', languageHint: '选择界面语言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '简体中文界面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '性能模式',
      performanceModeHint: '选择 Heat Capacity 的清晰度与刷新负载档位',
      performanceModeOff: '标准模式',
      performanceModeBalanced: '均衡模式',
      performanceModeOn: '性能优先',
      performanceModeSummary: { standard: '标准', balanced: '均衡', performance: '性能' },
    },
    about: {
      title: '关于热容比实验室',
      subtitle: 'Heat Capacity Ratio Lab with Hard Sphere',
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
      buildPlaceholder: '版权和构建说明预留到正式发布前补充。',
      sessionCacheSummary: (total) => '当前会话包含 ' + total + ' 个实验文件',
      sessionCacheBreakdown: (ideal, heat, standard) => '理想/比热/标准：' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: '打开文件', files: '文件', panels: '面板', noOpenFiles: '没有打开的文件', emptyHint: '创建一个研究以填充工作区。',
      noOpenStudy: '没有打开的研究', emptyTitle: '开始新的硬球工作台文件', emptyBody: '创建标准模拟或理想气体关系研究，以恢复预览、图表、结果和参数面板。',
      createStandard: '创建标准模拟研究', createIdeal: '创建理想气体模拟研究', createHeatCapacity: '创建空气比热容比实验', rename: '重命名', delete: '删除', confirmDelete: '确认删除', closeExperiment: '关闭实验', confirmCloseRunningExperiment: (name) => '实验正在运行。确认关闭 ' + name + ' 吗？', cancel: '取消',
      locked: '锁定', shown: '显示', open: '打开', active: '活动', off: '关闭', std: '标准', ideal: '理想', heat: 'HEAT', workspaceAria: '文件工作区', openActions: (name) => '打开 ' + name + ' 的操作菜单',
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
      parameterLabels: { N: 'N（粒子）', r: 'r', L: 'L', dt: 'dt', nu: 'nu', targetTemperature: '目标温度', equilibriumTime: '平衡时间（s）', statsDuration: '统计时长（s）', relation: '关系' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '稳定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 统计',
      advancedSettings: '高级设置', advancedShow: '显示模型常数和采样值', advancedHide: '隐藏模型常数和采样值', edit: '编辑', save: '保存', saveHint: '保存高级参数到当前工作台文件',
      standardReadonlyNote: '标准模拟参数在这里直接显示。', idealReadonlyNote: '关系、扫描变量和采样预设在上方控制。', heatCapacityReadonlyNote: '粒子动画仅用于可视化气体分子运动状态；最终比热容比按 FD-NCD-C 空气实验模型计算。', microscopicVisualization: '微观可视化', hardSphereView: '硬球可视化', hardSphereOn: '开', hardSphereOff: '关', hardSphereParticleMultiplier: '粒子数量倍率', hardSphereSpeedMultiplier: '粒子速度倍率', hardSphereTeachingOnly: '只影响三维教学显示，不参与 Uₜ、Uₚ、U₀/U₁/U₂ 或 gamma 计算。', controlledLockHint: '当前关系已有数据，受控变量已锁定。',
    },
    results: {
      title: '结果', experimentStatus: '实验状态', scan: '扫描', temperature: '温度', pressure: '压强', measuredPressure: '实测 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 点', pointsShort: (count) => count + ' 点', recordedPoints: (count) => count + ' 个记录点',
      clearRelation: '清空关系', confirmClear: '确认清空', remove: '移除', confirmRemove: '确认移除', cancel: '取消', noPoints: '没有点', runToRecord: '运行实验以记录点。', tableAction: '操作', tableTime: '时间',
      finalState: '最终状态', meanSpeed: '平均速度', measuredBars: '实测柱', idealLine: '理想线', samples: (count) => count + ' 个样本', sampleWindows: (count) => count + ' 次采样', waiting: '等待中', finalSpeedSamples: '最终速度样本', finalEnergySamples: '最终能量样本', tempHistorySamples: '温度历史样本', finalDataReady: '最终数据就绪', energyDrift: '能量漂移', meanAbsTempError: '平均绝对温度误差', tempSamples: '温度样本', resultsReady: (relation) => relation + ' 实验结果已就绪', waitingForRecordedPoints: (relation) => relation + ' 等待记录点',
      metric: '指标', value: '值', status: '状态', ready: '就绪', notReady: '未就绪', yes: '是', no: '否', diagnostic: '诊断', export: '导出', exportFigures: '导出图像', reportPdf: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV', verification: '验证', rawPv: '原始 P-V', history: '历史',
      resultReadyStatus: '结果就绪', resultNotReadyStatus: '结果未就绪', resultReadyDetail: '最终数据已捕获，可用于摘要、表格、图像和后续报告导出。', resultNotReadyDetail: '运行标准模拟，直到采集阶段结束后生成最终结果数据。', finalTime: '最终时间', finalTemperature: '最终温度', finalPressure: '最终压力', rmsSpeed: '均方根速度', speedBins: '速度分箱', energyBins: '能量分箱', notReadyPreview: '未就绪', figuresHint: '图像就绪状态、推荐文件名和预览。', noIdealPointsTitle: '没有理想气体点', noIdealPointsBody: '选择理想气体文件以查看实验点。', activeRelation: '当前关系', noIdealVerificationTitle: '没有验证图', noIdealVerificationBody: '验证图仅适用于理想气体文件。', historyLockedFor: (relation) => relation + ' 的历史内容已锁定', historyUnlocked: '已由验证通过的实验数据解锁。', historyUnlockHint: '通过一次成功验证后解锁。', historicalContext: '历史背景', workbenchInterpretation: '工作台解释', keyFigures: '关键数值', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / 斜率误差 ' + slopeError, whyLocked: '为什么锁定', whyItHappened: '原因说明', recommendedNextStep: '建议下一步', exportFilesHint: '导出环境和推荐文件。', pvLinearizedValidation: 'P - 1/V 线性化验证', relationValidation: (relation) => relation + ' 验证', measuredScatterHint: '实测散点、拟合线与理论参考。', originalPvPhysicalView: '原始 P - V 物理视图', originalPvPhysicalHint: '直接显示反比关系，判定仍使用线性化视图。', verdictLabel: (relation, verdict) => relation + ' 判定：' + verdict, pointsMetric: '点数', rSquared: 'R2', slope: '拟合斜率', theorySlope: '理论斜率', slopeError: '斜率误差', failureReason: '未通过原因', noneValue: '无', currentVerification: (rSquared, slopeError) => '当前验证：R2 ' + rSquared + '，斜率误差 ' + slopeError + '。', currentVerdictRecommendation: (verdict, recommendation) => '当前判定：' + verdict + '。建议：' + recommendation, noIdealHistoryTitle: '没有理想气体历史内容', noIdealHistoryBody: '理想气体验证通过后会解锁历史内容。', noVerificationChartTitle: '没有验证图', noVerificationChartBody: '验证图仅适用于理想气体文件。', panelNotConnectedTitle: '面板尚未连接', panelNotConnectedBody: '该面板将在后续工作台集成批次中接入。', measuredLegend: '实测', fitLegend: '拟合', theoryLegend: '理论', idealPressureTrace: (relation) => relation + ' 压强轨迹', currentIdealPressureHint: '运行当前理想气体点以采集压强窗口。', meanTemperature: '平均温度', relativeGap: '相对差值', samplingProgress: '采样进度', speedDistribution: '速度分布', energyDistribution: '能量分布', phase: '阶段', phaseStates: { idle: '空闲', equilibrating: '热平衡中', collecting: '采集中', finished: '已完成' }, probabilityDensity: '概率密度', experimentPointTableTitle: '没有实验点表', experimentPointTableBody: '实验点表仅适用于理想气体文件。', idealResultsSectionsAria: '理想气体结果分页', openIdealResultsTabTitle: '打开此理想气体结果分页。', verificationChartAria: (relation) => relation + ' 验证图', resultsTreeExpandAria: '展开结果分区', resultsTreeCollapseAria: '折叠结果分区', resultsOpenHint: '点击选择，双击打开。', resultsJumpHint: '双击打开结果并跳转到此分区。', figureStatus: { ready: '就绪', 'not-ready': '未就绪', 'not-applicable': '不适用' },
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
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '默认布局：3D 预览、实时数据 / 图表、当前参数。', standardConnected: '标准模拟运行时、3D 预览和实时图表数据已连接。', exportBridgeRequired: '科学 PDF 导出需要桌面运行时桥接。', autoPausedSingleRuntime: (name) => name + '：由于一次只能运行一个工作台运行时，已自动暂停。', autoPausedCreateFile: (name) => name + '：创建新文件时已自动暂停。', autoPausedSwitchFile: (name) => name + '：切换文件时已自动暂停。', fileCreated: (name) => '已创建工作台文件：' + name, mockAction: (label) => '模拟操作：' + label, lockedPanel: (title) => title + ' 是默认工作区的一部分，不能隐藏。', layoutReset: (name) => name + '：布局已恢复为 3D 预览 + 实时数据 / 图表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 打开理想结果窗口。', standardResultsOpened: (name, tab) => name + '：已打开结果窗口并切换到 ' + tab + '。', idealResultsClosed: (name) => name + '：已关闭理想结果窗口。', fileSelected: (name) => '已选择文件标签：' + name, confirmClear: (name, relation) => name + '：点击确认清空以删除全部 ' + relation + ' 点。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 点。', exportLabels: { report: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV', figuresZip: '结果图像' }, exportNotReady: (name) => name + '：结果数据尚未满足导出条件。', exportNeedsTwoPoints: (name) => name + '：拟合报告或验证图至少需要 2 个记录点。', exportPayloadPrepared: (name, label, filename, detail) => name + '：' + label + ' 载荷已准备为 ' + filename + '；' + detail, exportPreparing: (name, label) => name + '：正在准备导出 ' + label + '。', exportCancelled: (name, label) => name + '：已取消导出 ' + label + '。', exportFailed: (name, label, message) => name + '：' + label + ' 导出失败：' + message, exportCsvSaved: (name, target) => name + '：点 CSV 已保存到 ' + target + '。', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + '：' + label + ' 已导出到 ' + outDir + '（' + fileCount + ' 个文件）。' + figureHint, exportFigureHint: '图像文件位于 figures 子文件夹内。', unknownExporterError: '未知导出器错误', selectedLocation: '选定位置', selectedFolder: '选定文件夹', fileNameCannotBeEmpty: '文件名不能为空。', fileNameUnchanged: (name) => name + '：名称未改变。', fileRenamed: (name) => '工作台文件已重命名为 ' + name + '。', fileRemoved: (name) => name + '：已从当前工作台会话移除。', fileClosed: (name) => name + '：已关闭并保留在本地缓存。', fileOpenedFromCache: (name) => '已从本地缓存打开实验：' + name, confirmDeleteFile: (name) => name + '：点击确认删除以从工作台会话移除此打开文件。', layoutAlreadyDefault: (name) => name + '：布局已经使用默认面板。' },
  },
  'zh-TW': {
    menus: {
      newStudy: '新增研究', experimentFiles: '實驗檔案', newExperiment: '新增實驗', openExperiment: '開啟實驗', noCachedExperiments: '沒有可開啟的快取實驗', edit: '編輯', window: '視窗', settings: '設定', help: '說明', general: '一般',
      standardStudy: '標準模擬研究', idealStudy: '理想氣體模擬研究', heatCapacityStudy: '空氣比熱容比實驗', undo: '復原', redo: '重做', empty: '空',
      clearEditHistory: '清除編輯記錄', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '還原預設版面', default: '預設',
      performanceMode: '效能模式', exportEnvironment: '匯出環境', saveWorkbenchLayoutDefault: '將目前視窗版面存為預設',
      userGuide: '使用指南', theoryPdf: '理論文件 PDF', about: '關於熱容比實驗室', topCommandsAria: '頂部命令',
    },
    settings: {
      title: '一般設定', subtitle: '主題、語言、快捷鍵與版面偏好', closeAria: '關閉一般設定', theme: '主題', themeHint: '使用系統、亮色或暗色模式',
      themeOptions: { system: { label: '跟隨系統', hint: '依照系統偏好' }, light: { label: '亮色', hint: '亮色工作區預覽' }, dark: { label: '暗色', hint: '暗色工作區預覽' } },
      language: '語言', languageHint: '選擇介面語言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '簡體中文介面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '效能模式',
      performanceModeHint: '選擇 Heat Capacity 的清晰度與刷新負載檔位',
      performanceModeOff: '標準模式',
      performanceModeBalanced: '均衡模式',
      performanceModeOn: '效能優先',
      performanceModeSummary: { standard: '標準', balanced: '均衡', performance: '效能' },
    },
    about: {
      title: '關於熱容比實驗室',
      subtitle: 'Heat Capacity Ratio Lab with Hard Sphere',
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
      buildPlaceholder: '版權和建置說明預留到正式發布前補充。',
      sessionCacheSummary: (total) => '目前工作階段包含 ' + total + ' 個實驗檔案',
      sessionCacheBreakdown: (ideal, heat, standard) => '理想/熱容比/標準：' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: '開啟檔案', files: '檔案', panels: '面板', noOpenFiles: '沒有開啟的檔案', emptyHint: '建立一個研究以填入工作區。',
      noOpenStudy: '沒有開啟的研究', emptyTitle: '開始新的硬球工作台檔案', emptyBody: '建立標準模擬或理想氣體關係研究，以恢復預覽、圖表、結果和參數面板。',
      createStandard: '建立標準模擬研究', createIdeal: '建立理想氣體模擬研究', createHeatCapacity: '建立空氣比熱容比實驗', rename: '重新命名', delete: '刪除', confirmDelete: '確認刪除', closeExperiment: '關閉實驗', confirmCloseRunningExperiment: (name) => '實驗正在執行。確認關閉 ' + name + ' 嗎？', cancel: '取消',
      locked: '鎖定', shown: '顯示', open: '開啟', active: '作用中', off: '關閉', std: '標準', ideal: '理想', heat: 'HEAT', workspaceAria: '檔案工作區', openActions: (name) => '開啟 ' + name + ' 的操作選單',
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
      parameterLabels: { N: 'N（粒子）', r: 'r', L: 'L', dt: 'dt', nu: 'nu', targetTemperature: '目標溫度', equilibriumTime: '平衡時間（s）', statsDuration: '統計時長（s）', relation: '關係' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '穩定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 統計',
      advancedSettings: '進階設定', advancedShow: '顯示模型常數和採樣值', advancedHide: '隱藏模型常數和採樣值', edit: '編輯', save: '儲存', saveHint: '將進階參數儲存到目前工作台檔案',
      standardReadonlyNote: '標準模擬參數在這裡直接顯示。', idealReadonlyNote: '關係、掃描變量和採樣預設在上方控制。', heatCapacityReadonlyNote: '粒子動畫僅用於視覺化氣體分子運動狀態；最終比熱容比按 FD-NCD-C 空氣實驗模型計算。', microscopicVisualization: '微觀可視化', hardSphereView: '硬球可視化', hardSphereOn: '開', hardSphereOff: '關', hardSphereParticleMultiplier: '粒子數量倍率', hardSphereSpeedMultiplier: '粒子速度倍率', hardSphereTeachingOnly: '只影響三維教學顯示，不參與 Uₜ、Uₚ、U₀/U₁/U₂ 或 gamma 計算。', controlledLockHint: '目前關係已有資料，受控變量已鎖定。',
    },
    results: {
      title: '結果', experimentStatus: '實驗狀態', scan: '掃描', temperature: '溫度', pressure: '壓強', measuredPressure: '實測 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 點', pointsShort: (count) => count + ' 點', recordedPoints: (count) => count + ' 個記錄點',
      clearRelation: '清空關係', confirmClear: '確認清空', remove: '移除', confirmRemove: '確認移除', cancel: '取消', noPoints: '沒有點', runToRecord: '執行實驗以記錄點。', tableAction: '操作', tableTime: '時間',
      finalState: '最終狀態', meanSpeed: '平均速度', measuredBars: '實測柱', idealLine: '理想線', samples: (count) => count + ' 個樣本', sampleWindows: (count) => count + ' 次採樣', waiting: '等待中', finalSpeedSamples: '最終速度樣本', finalEnergySamples: '最終能量樣本', tempHistorySamples: '溫度歷史樣本', finalDataReady: '最終資料就緒', energyDrift: '能量漂移', meanAbsTempError: '平均絕對溫度誤差', tempSamples: '溫度樣本', resultsReady: (relation) => relation + ' 實驗結果已就緒', waitingForRecordedPoints: (relation) => relation + ' 等待記錄點',
      metric: '指標', value: '值', status: '狀態', ready: '就緒', notReady: '未就緒', yes: '是', no: '否', diagnostic: '診斷', export: '匯出', exportFigures: '匯出圖像', reportPdf: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV', verification: '驗證', rawPv: '原始 P-V', history: '歷史',
      resultReadyStatus: '結果就緒', resultNotReadyStatus: '結果未就緒', resultReadyDetail: '最終資料已擷取，可用於摘要、表格、圖像和後續報告匯出。', resultNotReadyDetail: '執行標準模擬，直到採集階段結束後產生最終結果資料。', finalTime: '最終時間', finalTemperature: '最終溫度', finalPressure: '最終壓力', rmsSpeed: '均方根速度', speedBins: '速度分箱', energyBins: '能量分箱', notReadyPreview: '未就緒', figuresHint: '圖像就緒狀態、建議檔名和預覽。', noIdealPointsTitle: '沒有理想氣體點', noIdealPointsBody: '選擇理想氣體檔案以查看實驗點。', activeRelation: '目前關係', noIdealVerificationTitle: '沒有驗證圖', noIdealVerificationBody: '驗證圖僅適用於理想氣體檔案。', historyLockedFor: (relation) => relation + ' 的歷史內容已鎖定', historyUnlocked: '已由驗證通過的實驗資料解鎖。', historyUnlockHint: '通過一次成功驗證後解鎖。', historicalContext: '歷史背景', workbenchInterpretation: '工作台解釋', keyFigures: '關鍵數值', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / 斜率誤差 ' + slopeError, whyLocked: '為什麼鎖定', whyItHappened: '原因說明', recommendedNextStep: '建議下一步', exportFilesHint: '匯出環境和建議檔案。', pvLinearizedValidation: 'P - 1/V 線性化驗證', relationValidation: (relation) => relation + ' 驗證', measuredScatterHint: '實測散點、擬合線與理論參考。', originalPvPhysicalView: '原始 P - V 物理視圖', originalPvPhysicalHint: '直接顯示反比關係，判定仍使用線性化視圖。', verdictLabel: (relation, verdict) => relation + ' 判定：' + verdict, pointsMetric: '點數', rSquared: 'R2', slope: '擬合斜率', theorySlope: '理論斜率', slopeError: '斜率誤差', failureReason: '未通過原因', noneValue: '無', currentVerification: (rSquared, slopeError) => '目前驗證：R2 ' + rSquared + '，斜率誤差 ' + slopeError + '。', currentVerdictRecommendation: (verdict, recommendation) => '目前判定：' + verdict + '。建議：' + recommendation, noIdealHistoryTitle: '沒有理想氣體歷史內容', noIdealHistoryBody: '理想氣體驗證通過後會解鎖歷史內容。', noVerificationChartTitle: '沒有驗證圖', noVerificationChartBody: '驗證圖僅適用於理想氣體檔案。', panelNotConnectedTitle: '面板尚未連接', panelNotConnectedBody: '該面板將在後續工作台整合批次中接入。', measuredLegend: '實測', fitLegend: '擬合', theoryLegend: '理論', idealPressureTrace: (relation) => relation + '壓強軌跡', currentIdealPressureHint: '執行目前理想氣體點以採集壓強窗口。', meanTemperature: '平均溫度', relativeGap: '相對差值', samplingProgress: '採樣進度', speedDistribution: '速度分布', energyDistribution: '能量分布', phase: '階段', phaseStates: { idle: '閒置', equilibrating: '熱平衡中', collecting: '採集中', finished: '已完成' }, probabilityDensity: '機率密度', experimentPointTableTitle: '沒有實驗點表', experimentPointTableBody: '實驗點表僅適用於理想氣體檔案。', idealResultsSectionsAria: '理想氣體結果分頁', openIdealResultsTabTitle: '開啟此理想氣體結果分頁。', verificationChartAria: (relation) => relation + ' 驗證圖', resultsTreeExpandAria: '展開結果分區', resultsTreeCollapseAria: '摺疊結果分區', resultsOpenHint: '點選選取，雙擊開啟。', resultsJumpHint: '雙擊開啟結果並跳至此分區。', figureStatus: { ready: '就緒', 'not-ready': '未就緒', 'not-applicable': '不適用' },
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
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '預設版面：3D 預覽、即時資料 / 圖表、目前參數。', standardConnected: '標準模擬執行階段、3D 預覽和即時圖表資料已連接。', exportBridgeRequired: '科學 PDF 匯出需要桌面執行階段橋接。', autoPausedSingleRuntime: (name) => name + '：由於一次只能執行一個工作台執行階段，已自動暫停。', autoPausedCreateFile: (name) => name + '：建立新檔案時已自動暫停。', autoPausedSwitchFile: (name) => name + '：切換檔案時已自動暫停。', fileCreated: (name) => '已建立工作台檔案：' + name, mockAction: (label) => '模擬操作：' + label, lockedPanel: (title) => title + ' 是預設工作區的一部分，不能隱藏。', layoutReset: (name) => name + '：版面已還原為 3D 預覽 + 即時資料 / 圖表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 開啟理想結果視窗。', standardResultsOpened: (name, tab) => name + '：已開啟結果視窗並切換到 ' + tab + '。', idealResultsClosed: (name) => name + '：已關閉理想結果視窗。', fileSelected: (name) => '已選擇檔案分頁：' + name, confirmClear: (name, relation) => name + '：點擊確認清空以刪除全部 ' + relation + ' 點。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 點。', exportLabels: { report: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV', figuresZip: '結果圖像' }, exportNotReady: (name) => name + '：結果資料尚未滿足匯出條件。', exportNeedsTwoPoints: (name) => name + '：擬合報告或驗證圖至少需要 2 個記錄點。', exportPayloadPrepared: (name, label, filename, detail) => name + '：' + label + ' 載荷已準備為 ' + filename + '；' + detail, exportPreparing: (name, label) => name + '：正在準備匯出 ' + label + '。', exportCancelled: (name, label) => name + '：已取消匯出 ' + label + '。', exportFailed: (name, label, message) => name + '：' + label + ' 匯出失敗：' + message, exportCsvSaved: (name, target) => name + '：點 CSV 已儲存到 ' + target + '。', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + '：' + label + ' 已匯出到 ' + outDir + '（' + fileCount + ' 個檔案）。' + figureHint, exportFigureHint: '圖像檔案位於 figures 子資料夾內。', unknownExporterError: '未知匯出器錯誤', selectedLocation: '選定位置', selectedFolder: '選定資料夾', fileNameCannotBeEmpty: '檔案名稱不能為空。', fileNameUnchanged: (name) => name + '：名稱未改變。', fileRenamed: (name) => '工作台檔案已重新命名為 ' + name + '。', fileRemoved: (name) => name + '：已從目前工作台工作階段移除。', fileClosed: (name) => name + '：已關閉並保留在本機快取。', fileOpenedFromCache: (name) => '已從本機快取開啟實驗：' + name, confirmDeleteFile: (name) => name + '：點擊確認刪除以從工作台工作階段移除此開啟檔案。', layoutAlreadyDefault: (name) => name + '：版面已經使用預設面板。' },
  },
  en: {
    menus: {
      newStudy: 'New Study', experimentFiles: 'Experiment Files', newExperiment: 'New Experiment', openExperiment: 'Open Experiment', noCachedExperiments: 'No cached experiments to open', edit: 'Edit', window: 'Window', settings: 'Settings', help: 'Help', general: 'General',
      standardStudy: 'Standard Simulation Study', idealStudy: 'Ideal Gas Simulation Study', heatCapacityStudy: 'Heat Capacity Ratio Experiment', undo: 'Undo', redo: 'Redo', empty: 'empty',
      clearEditHistory: 'Clear Edit History', panelsFor: (name) => 'Panels for ' + name, resetDefaultLayout: 'Reset Default Layout', default: 'default',
      performanceMode: 'Performance Mode', exportEnvironment: 'Export Environment', saveWorkbenchLayoutDefault: 'Save Current Window Layout as Default',
      userGuide: 'User Guide', theoryPdf: 'Theory Document PDF', about: 'About Heat Capacity Ratio Lab', topCommandsAria: 'Top commands',
    },
    settings: {
      title: 'General Settings', subtitle: 'Theme, language, shortcuts, and layout preferences', closeAria: 'Close General Settings', theme: 'Theme', themeHint: 'Use system, light, or dark mode',
      themeOptions: { system: { label: 'System', hint: 'Follow OS preference' }, light: { label: 'Light', hint: 'Bright workspace preview' }, dark: { label: 'Dark', hint: 'Dark workspace preview' } },
      language: 'Language', languageHint: 'Choose the interface language',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: 'Simplified Chinese interface' }, 'zh-TW': { label: '繁體中文', hint: 'Traditional Chinese interface' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: 'Performance mode',
      performanceModeHint: 'Choose the Heat Capacity clarity and refresh-load tier',
      performanceModeOff: 'Standard mode',
      performanceModeBalanced: 'Balanced mode',
      performanceModeOn: 'Performance first',
      performanceModeSummary: { standard: 'standard', balanced: 'balanced', performance: 'performance' },
    },
    about: {
      title: 'About Heat Capacity Ratio Lab',
      subtitle: 'Heat Capacity Ratio Lab with Hard Sphere',
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
      buildPlaceholder: 'Copyright and build details reserved for the final release.',
      sessionCacheSummary: (total) => 'Current session contains ' + total + ' experiment files',
      sessionCacheBreakdown: (ideal, heat, standard) => 'Ideal / Heat / Standard: ' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: 'Open Files', files: 'Files', panels: 'Panels', noOpenFiles: 'No open files', emptyHint: 'Create a study to populate the workbench.',
      noOpenStudy: 'No open study', emptyTitle: 'Start a new Heat Capacity Ratio Lab file', emptyBody: 'Create an ideal gas study, heat capacity ratio experiment, or standard simulation to restore previews, charts, results, and parameter panels.',
      createStandard: 'Create Standard Simulation Study', createIdeal: 'Create Ideal Gas Simulation Study', createHeatCapacity: 'Create Heat Capacity Ratio Experiment', rename: 'Rename', delete: 'Delete', confirmDelete: 'Confirm Delete', closeExperiment: 'Close Experiment', confirmCloseRunningExperiment: (name) => 'The experiment is running. Close ' + name + '?', cancel: 'Cancel',
      locked: 'locked', shown: 'shown', open: 'open', active: 'active', off: 'off', std: 'STD', ideal: 'IDEAL', heat: 'HEAT', workspaceAria: 'File workspace', openActions: (name) => 'Open actions for ' + name,
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
      parameterLabels: { N: 'N (particles)', r: 'r', L: 'L', dt: 'dt', nu: 'nu', targetTemperature: 'Target temperature', equilibriumTime: 'equilibriumTime (s)', statsDuration: 'statsDuration (s)', relation: 'Relation' },
      samplingPresets: { fast: 'Fast', balanced: 'Balanced', stable: 'Stable' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's eq / ' + statsDuration + 's stats',
      advancedSettings: 'Advanced settings', advancedShow: 'Show model constants and sampling values', advancedHide: 'Hide model constants and sampling values', edit: 'Edit', save: 'Save', saveHint: 'Save advanced parameters to this workbench file',
      standardReadonlyNote: 'Standard simulation parameters are shown directly here.', idealReadonlyNote: 'Relation, scan variable, and sampling preset are controlled above.', heatCapacityReadonlyNote: 'The particle animation only visualizes molecular motion; the heat capacity ratio is still calculated by the FD-NCD-C air experiment model.', microscopicVisualization: 'Microscopic Visualization', hardSphereView: 'Hard-Sphere View', hardSphereOn: 'ON', hardSphereOff: 'OFF', hardSphereParticleMultiplier: 'Particle multiplier', hardSphereSpeedMultiplier: 'Speed multiplier', hardSphereTeachingOnly: 'Affects only the 3D teaching display. It is not used for Uₜ, Uₚ, U₀/U₁/U₂, or gamma.', controlledLockHint: 'This relation already has data, so controlled variables are locked.',
    },
    results: {
      title: 'Results', experimentStatus: 'Experiment status', scan: 'Scan', temperature: 'Temperature', pressure: 'Pressure', measuredPressure: 'Measured P', idealPressure: 'Ideal P', gap: 'Gap', pointsTitle: (relation) => relation + ' points', pointsShort: (count) => count + ' pts', recordedPoints: (count) => count + ' recorded points',
      clearRelation: 'Clear Relation', confirmClear: 'Confirm Clear', remove: 'Remove', confirmRemove: 'Confirm Remove', cancel: 'Cancel', noPoints: 'no points', runToRecord: 'Run the experiment to record points.', tableAction: 'Action', tableTime: 'Time',
      finalState: 'Final state', meanSpeed: 'Mean speed', measuredBars: 'measured bars', idealLine: 'ideal line', samples: (count) => count + ' samples', sampleWindows: (count) => count + ' sampling windows', waiting: 'waiting', finalSpeedSamples: 'final speed samples', finalEnergySamples: 'final energy samples', tempHistorySamples: 'temp history samples', finalDataReady: 'final data ready', energyDrift: 'energy drift', meanAbsTempError: 'mean abs temp error', tempSamples: 'Temp samples', resultsReady: (relation) => relation + ' experiment result ready', waitingForRecordedPoints: (relation) => relation + ' waiting for recorded points',
      metric: 'Metric', value: 'Value', status: 'Status', ready: 'ready', notReady: 'not-ready', yes: 'yes', no: 'no', diagnostic: 'Diagnostic', export: 'Export', exportFigures: 'Export Figures', reportPdf: 'Report PDF', verificationFigure: 'Verification Figure', pointsCsv: 'Points CSV', verification: 'Verification', rawPv: 'Raw P-V', history: 'History',
      resultReadyStatus: 'Results ready', resultNotReadyStatus: 'Results not ready', resultReadyDetail: 'Final data has been captured for summary, tables, figures, and future report export.', resultNotReadyDetail: 'Run the standard simulation until the collecting phase finishes to prepare final result data.', finalTime: 'Final time', finalTemperature: 'Final temperature', finalPressure: 'Final pressure', rmsSpeed: 'RMS speed', speedBins: 'Speed bins', energyBins: 'Energy bins', notReadyPreview: 'not ready', figuresHint: 'Figure readiness, recommended filenames, and preview.', noIdealPointsTitle: 'No ideal-gas points', noIdealPointsBody: 'Select an ideal-gas file to review experiment points.', activeRelation: 'Active', noIdealVerificationTitle: 'No ideal-gas verification', noIdealVerificationBody: 'Select an ideal-gas file to review verification results.', historyLockedFor: (relation) => 'History locked for ' + relation, historyUnlocked: 'Unlocked by verified experiment data.', historyUnlockHint: 'Unlocks after a successful verification.', historicalContext: 'Historical context', workbenchInterpretation: 'Workbench interpretation', keyFigures: 'Key figures', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / slope error ' + slopeError, whyLocked: 'Why it is locked', whyItHappened: 'Why it happened', recommendedNextStep: 'Recommended next step', exportFilesHint: 'Export environment and recommended files.', pvLinearizedValidation: 'P - 1/V linearized validation', relationValidation: (relation) => relation + ' validation', measuredScatterHint: 'Measured scatter with fit and theoretical reference.', originalPvPhysicalView: 'Original P - V physical view', originalPvPhysicalHint: 'Shows the inverse relation directly while verdict uses the linearized view.', verdictLabel: (relation, verdict) => relation + ' verdict: ' + verdict, pointsMetric: 'Points', rSquared: 'R2', slope: 'Slope', theorySlope: 'Theory slope', slopeError: 'Slope error', failureReason: 'Failure reason', noneValue: 'none', currentVerification: (rSquared, slopeError) => 'Current verification: R2 ' + rSquared + ', slope error ' + slopeError + '.', currentVerdictRecommendation: (verdict, recommendation) => 'Current verdict: ' + verdict + '. Recommendation: ' + recommendation, noIdealHistoryTitle: 'No ideal-gas history', noIdealHistoryBody: 'History unlocks after ideal-gas verification.', noVerificationChartTitle: 'No verification chart', noVerificationChartBody: 'Verification charts are available for ideal-gas files.', panelNotConnectedTitle: 'Panel not connected', panelNotConnectedBody: 'This panel will be wired in a later Workbench integration batch.', measuredLegend: 'measured', fitLegend: 'fit', theoryLegend: 'theory', idealPressureTrace: (relation) => relation + ' pressure trace', currentIdealPressureHint: 'Run the current ideal point to collect pressure windows.', meanTemperature: 'Mean temperature', relativeGap: 'Relative gap', samplingProgress: 'Sampling progress', speedDistribution: 'Speed distribution', energyDistribution: 'Energy distribution', phase: 'Phase', phaseStates: { idle: 'idle', equilibrating: 'equilibrating', collecting: 'collecting', finished: 'finished' }, probabilityDensity: 'probability density', experimentPointTableTitle: 'No experiment point table', experimentPointTableBody: 'Experiment points are available for ideal-gas files.', idealResultsSectionsAria: 'Ideal Results sections', openIdealResultsTabTitle: 'Open this ideal Results tab.', verificationChartAria: (relation) => relation + ' verification chart', resultsTreeExpandAria: 'Expand Results sections', resultsTreeCollapseAria: 'Collapse Results sections', resultsOpenHint: 'Click to select, double-click to open.', resultsJumpHint: 'Double-click to open Results and jump to this section.', figureStatus: { ready: 'ready', 'not-ready': 'not-ready', 'not-applicable': 'not applicable' },
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
    logs: { initialized: 'Workbench studio prototype initialized.', defaultLayout: 'Default layout: 3D Preview, Realtime Data / Charts, Current Parameters.', standardConnected: 'Standard Simulation runtime, 3D preview, and realtime chart data are connected.', exportBridgeRequired: 'Scientific PDF export requires the desktop runtime bridge.', autoPausedSingleRuntime: (name) => name + ': auto-paused because only one workbench runtime can run at a time.', autoPausedCreateFile: (name) => name + ': auto-paused when creating a new file.', autoPausedSwitchFile: (name) => name + ': auto-paused when switching files.', fileCreated: (name) => 'Workbench file created: ' + name, mockAction: (label) => 'Mock action: ' + label, lockedPanel: (title) => title + ' is locked as part of the default workspace and cannot be hidden.', layoutReset: (name) => name + ': layout reset to 3D Preview + Realtime Data / Charts', idealResultsOpened: (name, tab) => name + ': opened ideal Results window on ' + tab + '.', standardResultsOpened: (name, tab) => name + ': opened Results window on ' + tab + '.', idealResultsClosed: (name) => name + ': closed ideal Results window.', fileSelected: (name) => 'File tab selected: ' + name, confirmClear: (name, relation) => name + ': click Confirm Clear to clear all ' + relation + ' points.', clearedRelation: (name, relation) => name + ': cleared ' + relation + ' points.', exportLabels: { report: 'report PDF', verificationFigure: 'verification figure', pointsCsv: 'points CSV', figuresZip: 'result figures' }, exportNotReady: (name) => name + ': result data does not meet export requirements yet.', exportNeedsTwoPoints: (name) => name + ': at least 2 recorded points are required for a fitted report or verification figure.', exportPayloadPrepared: (name, label, filename, detail) => name + ': ' + label + ' payload prepared as ' + filename + '; ' + detail, exportPreparing: (name, label) => name + ': preparing ' + label + ' export.', exportCancelled: (name, label) => name + ': ' + label + ' export cancelled.', exportFailed: (name, label, message) => name + ': ' + label + ' export failed: ' + message, exportCsvSaved: (name, target) => name + ': points CSV saved to ' + target + '.', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + ': ' + label + ' exported to ' + outDir + ' (' + fileCount + ' files).' + figureHint, exportFigureHint: 'Figure files are inside the figures subfolders.', unknownExporterError: 'unknown exporter error', selectedLocation: 'selected location', selectedFolder: 'selected folder', fileNameCannotBeEmpty: 'File name cannot be empty.', fileNameUnchanged: (name) => name + ': name unchanged.', fileRenamed: (name) => 'Workbench file renamed to ' + name + '.', fileRemoved: (name) => name + ': removed from the current workbench session.', fileClosed: (name) => name + ': closed and kept in local cache.', fileOpenedFromCache: (name) => 'Experiment opened from local cache: ' + name, confirmDeleteFile: (name) => name + ': click Confirm Delete to remove this open file from the workbench session.', layoutAlreadyDefault: (name) => name + ': layout is already using the default panels.' },
  },
};

const heatCapacityRealtimeCopies = {
  'zh-CN': {
    guideTitle: '实验指引',
    guideHint: '空气比热容比实验步骤与说明',
    recordsTitle: '数据记录',
    recordsHint: 'U₁ / U₂ 与温度信号记录',
    processingTitle: '数据处理',
    processingHint: '空气比热容比计算与结果',
    materialsTitle: '实验资料与结果',
    materialsHint: 'U₁ / U₂ 与空气比热容比计算',
    closeMaterialsAria: '关闭实验资料与结果',
    materialsGroupAria: '展开或收起实验资料与结果',
    materialsFolderTitle: '点击文件夹展开/收起；单击文字选中；双击文字打开全部子标签页',
    materialsTabTitle: '单击选中；双击打开标签页',
    materialsTabsAria: '空气比热容比实验资料分页',
    previewMountAria: '空气比热容比视图预览区域',
    stopcockMiniReadoutAria: '玻璃旋塞聚焦模式主机示数',
    stopcockMiniGaugeAria: '简化指针压力表',
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
    exitGuideMode: '退出引导',
    nextTrialAction: '下一组实验',
    trialBadge: (trialIndex: number) => `第 ${trialIndex} 组实验`,
    demoCompleteLabel: '演示完成',
    demoPausedLabel: '已暂停',
    demoDoneLabel: '已完成',
    demoTargetLabel: '目标控件',
    demoObservationLabel: '观察要点',
    demoCompleteTitle: '演示完成',
    demoCompleteDescription: '演示完成，可重新开始或进入引导 / 自由操作。',
    demoFallbackNote: '过程采样已保留。',
    startManualExperiment: '引导模式',
    startNextTrial: (trialIndex: number) => `开始第 ${trialIndex} 组实验`,
    skipRecoveryWait: '真实实验中需要等待系统稳定；程序已省略该等待过程。',
    finishExpectedTrialsFirst: '请先完成预计组数，再进行计算。',
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
    recordU0Success: 'U₀ 已记录。',
    recordU0SuccessToast: 'U₀ 记录成功。',
    recordU1SuccessToast: 'U₁ 和 Uₜ 记录成功。',
    recordU2SuccessToast: 'U₂ 和 Uₜ 记录成功。',
    trialCompleteToast: '本组实验已完成。',
    finalTrialCompleteToast: '本次实验已完成。',
    safetyLimit: '安全上限',
    safetyActive: '激活',
    pressureWarningTitle: '危险',
    pressureWarningFallback: '压强已超过安全阈值，请停止打气。',
    pressureWarningObserve: '聚焦模式已退出，请停止打气。',
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
      demoComplete: '演示结束',
      fallback: '实验准备',
    },
    stopcock: { open: '打开', closed: '关闭' },
    safety: {
      danger: '危险',
      warning: '接近阈值',
      normal: '安全',
      dangerNote: '停止打气',
      warningNote: '准备停止打气',
      normalNote: '可继续观察',
    },
    zeroStatus: {
      completed: '已完成',
      adjustable: '可调零',
      notReady: '未就绪',
    },
    hints: {
      demoComplete: '自动演示已结束，可重新开始或查看后续数据处理结果。',
      powerOff: '请先打开电源。',
      readyToZero: '请观察 Uₚ，并进行压强调零。',
      readyToPump: '请关闭玻璃旋塞并准备打气。',
      pumping: '保持合适打气频率，并注意压力表安全范围。',
      sealedStabilizing: '等待 Uₚ 和 Uₜ 小范围波动后进入放气步骤。',
      releasing: '关闭玻璃旋塞，并等待回温稳定。',
      recovering: '等待 Uₜ 回稳后记录 U₂。',
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
    recordsTitle: '資料記錄',
    recordsHint: 'U₁ / U₂ 與溫度信號記錄',
    processingTitle: '資料處理',
    processingHint: '空氣比熱容比計算與結果',
    materialsTitle: '實驗資料與結果',
    materialsHint: 'U₁ / U₂ 與空氣比熱容比計算',
    closeMaterialsAria: '關閉實驗資料與結果',
    materialsGroupAria: '展開或收起實驗資料與結果',
    materialsFolderTitle: '點擊資料夾展開/收起；單擊文字選取；雙擊文字開啟全部子分頁',
    materialsTabTitle: '單擊選取；雙擊開啟分頁',
    materialsTabsAria: '空氣比熱容比實驗資料分頁',
    previewMountAria: '空氣比熱容比視圖預覽區域',
    stopcockMiniReadoutAria: '玻璃旋塞聚焦模式主機示數',
    stopcockMiniGaugeAria: '簡化指針壓力表',
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
    exitGuideMode: '退出引導',
    nextTrialAction: '下一組實驗',
    trialBadge: (trialIndex: number) => `第 ${trialIndex} 組實驗`,
    demoCompleteLabel: '演示完成',
    demoPausedLabel: '已暫停',
    demoDoneLabel: '已完成',
    demoTargetLabel: '目標控件',
    demoObservationLabel: '觀察要點',
    demoCompleteTitle: '演示完成',
    demoCompleteDescription: '演示完成，可重新開始或進入引導 / 自由操作。',
    demoFallbackNote: '過程採樣已保留。',
    startManualExperiment: '引導模式',
    startNextTrial: (trialIndex: number) => `開始第 ${trialIndex} 組實驗`,
    skipRecoveryWait: '真實實驗中需要等待系統穩定；程序已省略該等待過程。',
    finishExpectedTrialsFirst: '請先完成預計組數，再進行計算。',
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
    recordU0Success: 'U₀ 已記錄。',
    recordU0SuccessToast: 'U₀ 記錄成功。',
    recordU1SuccessToast: 'U₁ 和 Uₜ 記錄成功。',
    recordU2SuccessToast: 'U₂ 和 Uₜ 記錄成功。',
    trialCompleteToast: '本組實驗已完成。',
    finalTrialCompleteToast: '本次實驗已完成。',
    safetyLimit: '安全上限',
    safetyActive: '啟用',
    pressureWarningTitle: '危險',
    pressureWarningFallback: '壓強已超過安全閾值，請停止打氣。',
    pressureWarningObserve: '聚焦模式已退出，請停止打氣。',
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
      demoComplete: '演示結束',
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
      demoComplete: '自動演示已結束，可重新開始或查看後續資料處理結果。',
      powerOff: '請先打開電源。',
      readyToZero: '請觀察 Uₚ，並進行壓強調零。',
      readyToPump: '請關閉玻璃旋塞並準備打氣。',
      pumping: '保持合適打氣頻率，並注意壓力表安全範圍。',
      sealedStabilizing: '等待 Uₚ 和 Uₜ 小範圍波動後進入放氣步驟。',
      releasing: '關閉玻璃旋塞，並等待回溫穩定。',
      recovering: '等待 Uₜ 回穩後記錄 U₂。',
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
    recordsTitle: 'Data Recording',
    recordsHint: 'U₁ / U₂ and temperature signal records',
    processingTitle: 'Data Processing',
    processingHint: 'Air heat capacity ratio calculation and result',
    materialsTitle: 'Experiment Notes & Results',
    materialsHint: 'U₁ / U₂ and air heat capacity ratio calculation',
    closeMaterialsAria: 'Close experiment notes and results',
    materialsGroupAria: 'Expand or collapse experiment notes and results',
    materialsFolderTitle: 'Click the folder to expand or collapse; click text to select; double-click text to open all child tabs',
    materialsTabTitle: 'Click to select; double-click to open the tab',
    materialsTabsAria: 'Heat Capacity experiment notes tabs',
    previewMountAria: 'Heat capacity ratio view preview mount',
    stopcockMiniReadoutAria: 'Stopcock focus host readout',
    stopcockMiniGaugeAria: 'Simplified pointer pressure gauge',
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
    exitGuideMode: 'Exit guide',
    nextTrialAction: 'Next trial',
    trialBadge: (trialIndex: number) => `Trial ${trialIndex}`,
    demoCompleteLabel: 'Demo complete',
    demoPausedLabel: 'Paused',
    demoDoneLabel: 'Complete',
    demoTargetLabel: 'Target control',
    demoObservationLabel: 'Observation',
    demoCompleteTitle: 'Demo complete',
    demoCompleteDescription: 'Demo complete. You can restart or use guide / free mode.',
    demoFallbackNote: 'Process samples are retained.',
    startManualExperiment: 'Guide mode',
    startNextTrial: (trialIndex: number) => `Start Trial ${trialIndex}`,
    skipRecoveryWait: 'The real experiment would wait for the system to stabilize; this program omits that wait.',
    finishExpectedTrialsFirst: 'Complete the expected trials before calculating.',
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
    recordU0Success: 'U₀ recorded.',
    recordU0SuccessToast: 'U₀ recorded successfully.',
    recordU1SuccessToast: 'U₁ and Uₜ recorded successfully.',
    recordU2SuccessToast: 'U₂ and Uₜ recorded successfully.',
    trialCompleteToast: 'This trial is complete.',
    finalTrialCompleteToast: 'The experiment is complete.',
    safetyLimit: 'Safety limit',
    safetyActive: 'Active',
    pressureWarningTitle: 'Danger',
    pressureWarningFallback: 'Pressure exceeds the safety threshold. Stop pumping.',
    pressureWarningObserve: 'Focus mode has exited. Stop pumping.',
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
      demoComplete: 'Demo ended',
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
      demoComplete: 'Auto demo has ended. Restart or review the data processing result.',
      powerOff: 'Turn on the power first.',
      readyToZero: 'Observe Uₚ and zero the pressure signal.',
      readyToPump: 'Close the glass stopcock and prepare to pump.',
      pumping: 'Keep a suitable pumping rate and watch the gauge limit.',
      sealedStabilizing: 'Wait until Uₚ and Uₜ fluctuate in a small range before release.',
      releasing: 'Close the glass stopcock and wait for thermal recovery.',
      recovering: 'Wait for Uₜ to stabilize, then record U₂.',
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
  value === 'standard' || value === 'balanced' || value === 'performance'
);

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
  { key: 'heatCapacityProcessing', title: heatCopy.processingTitle, hint: heatCopy.processingHint, icon: <BarChart3 size={13} /> },
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
const heatCapacityMaterialsTabOrder: WorkbenchHeatCapacityTabId[] = ['guide', 'records', 'processing'];

const isIdealResultWindowKey = (key: WorkbenchPanelKey): key is WorkbenchIdealResultWindowKey => (
  key === 'experimentPoints' || key === 'verification'
);

const isStandardResultsTab = (key: string): key is WorkbenchStandardResultsTab => (
  standardResultsTabKeys.includes(key as WorkbenchStandardResultsTab)
);

const isHeatCapacityPanelKey = (key: WorkbenchPanelKey): key is WorkbenchHeatCapacityPanelKey => (
  key === 'heatCapacityGuide' || key === 'heatCapacityRecords' || key === 'heatCapacityProcessing'
);

const heatCapacityTabIdToPanelKey = (tabId: WorkbenchHeatCapacityTabId): WorkbenchHeatCapacityPanelKey => (
  tabId === 'guide'
    ? 'heatCapacityGuide'
    : tabId === 'records'
      ? 'heatCapacityRecords'
      : 'heatCapacityProcessing'
);

const heatCapacityPanelKeyToTabId = (panelKey: WorkbenchPanelKey): WorkbenchHeatCapacityTabId | null => (
  panelKey === 'heatCapacityGuide'
    ? 'guide'
    : panelKey === 'heatCapacityRecords'
      ? 'records'
      : panelKey === 'heatCapacityProcessing'
        ? 'processing'
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
  const openTabs = layout?.openTabs?.filter(isIdealResultWindowKey);
  const activeIdealResultTab = layout?.activeIdealResultTab
    ?? layout?.openPanels?.filter(isIdealResultWindowKey).slice(-1)[0]
    ?? 'experimentPoints';
  const normalizedOpenTabs = openTabs?.length ? openTabs : ['experimentPoints', 'verification'];
  const heightRatio = clampIdealResultHeightRatio(
    layout?.heightRatio
    ?? layout?.frontHeightRatio
    ?? layout?.backHeightRatio
    ?? defaults?.resultsHeightRatio
    ?? IDEAL_RESULT_HEIGHT_RATIO,
  );

  return {
    openTabs: normalizedOpenTabs,
    activeIdealResultTab: normalizedOpenTabs.includes(activeIdealResultTab) ? activeIdealResultTab : normalizedOpenTabs[0],
    heightRatio,
    hasCustomHeight: Boolean(layout?.hasCustomHeight ?? layout?.hasCustomHeights),
  };
};

const normalizeStandardResultsLayout = (
  layout: Partial<WorkbenchStandardResultsLayout> | null | undefined,
  defaults?: Partial<WorkbenchLayoutDefaultState>,
): WorkbenchStandardResultsLayout => {
  const openTabs = layout?.openTabs?.filter(isStandardResultsTab);
  const normalizedOpenTabs = openTabs?.length ? openTabs : ['summary', 'dataTable', 'figures'];
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

const cloneWorkbenchFiles = (filesToClone: WorkbenchFileState[]): WorkbenchFileState[] => (
  filesToClone.map((file) => ({
    ...file,
    params: cloneParams(file.params),
    appliedParams: cloneParams(file.appliedParams),
    stats: { ...file.stats },
    chartData: {
      speed: file.chartData.speed.map((item) => ({ ...item })),
      energy: file.chartData.energy.map((item) => ({ ...item })),
      energyLog: file.chartData.energyLog.map((item) => ({ ...item })),
      tempHistory: file.chartData.tempHistory.map((item) => ({ ...item })),
    },
    finalChartData: file.finalChartData
      ? {
          speed: file.finalChartData.speed.map((item) => ({ ...item })),
          energy: file.finalChartData.energy.map((item) => ({ ...item })),
          energyLog: file.finalChartData.energyLog.map((item) => ({ ...item })),
          tempHistory: file.finalChartData.tempHistory.map((item) => ({ ...item })),
        }
      : null,
    ...(file.kind === 'standard'
      ? {
          kind: 'standard' as const,
          particles: file.particles.map((particle) => ({ ...particle })),
          standardResultsLayout: normalizeStandardResultsLayout(file.standardResultsLayout),
        }
      : file.kind === 'ideal'
        ? {
            kind: 'ideal' as const,
            relation: file.relation,
            activeParams: cloneParams(file.activeParams),
            pointsByRelation: clonePointsByRelation(file.pointsByRelation),
            latestPressureSummary: file.latestPressureSummary
              ? {
                  ...file.latestPressureSummary,
                  history: file.latestPressureSummary.history.map((point) => ({ ...point })),
                }
              : null,
            needsReset: file.needsReset,
            particles: file.particles.map((particle) => ({ ...particle })),
            verificationState: file.verificationState,
            historyUnlocked: file.historyUnlocked,
            idealWindowLayout: normalizeIdealWindowLayoutState(file.idealWindowLayout),
          }
        : {
            kind: 'heatCapacity' as const,
            name: normalizeHeatCapacityFileName(file.name),
            particles: file.particles.map((particle) => ({ ...particle })),
            selectedHeatCapacityPanel: file.selectedHeatCapacityPanel,
            openHeatCapacityTabs: [...file.openHeatCapacityTabs],
            activeHeatCapacityTabId: file.activeHeatCapacityTabId,
            heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded,
            heatCapacityTabContainerHeight: file.heatCapacityTabContainerHeight,
            heatCapacityExpectedTrialCount: file.heatCapacityExpectedTrialCount,
            heatCapacityExpectedTrialCountMode: file.heatCapacityExpectedTrialCountMode,
            heatCapacityTrials: file.heatCapacityTrials.map((trial) => ({ ...trial })),
            heatCapacityActiveTrialIndex: file.heatCapacityActiveTrialIndex,
            heatCapacityProcessingCalculated: file.heatCapacityProcessingCalculated,
            heatCapacityProcessingResult: {
              ...file.heatCapacityProcessingResult,
              trialResults: file.heatCapacityProcessingResult.trialResults.map((trial) => ({ ...trial })),
            },
            heatCapacityExperimentSeed: file.heatCapacityExperimentSeed,
            heatCapacityExperimentProfile: file.heatCapacityExperimentProfile ? { ...file.heatCapacityExperimentProfile } : null,
            heatCapacityPhase: file.heatCapacityPhase,
            powerOn: file.powerOn,
            glassPistonState: file.glassPistonState,
            stopcockAngleDeg: file.stopcockAngleDeg,
            ambientPressureKPa: file.ambientPressureKPa,
            ambientTemperatureK: file.ambientTemperatureK,
            gasPressureKPaAbs: file.gasPressureKPaAbs,
            gasTemperatureK: file.gasTemperatureK,
            pressureDeltaKPa: file.pressureDeltaKPa,
            simulationTimeS: file.simulationTimeS,
            lastUpdateMs: file.lastUpdateMs,
            pressureSignalMvRaw: file.pressureSignalMvRaw,
            pressureSignalMvDisplayed: file.pressureSignalMvDisplayed,
            temperatureSignalTargetMv: file.temperatureSignalTargetMv,
            pressureSignalTargetMv: file.pressureSignalTargetMv,
            displayResponseLastUpdateMs: file.displayResponseLastUpdateMs,
            pressureZeroed: file.pressureZeroed,
            pressureZeroAdjusted: file.pressureZeroAdjusted,
            pressureZeroKnobAngle: file.pressureZeroKnobAngle,
            pressureZeroOffset: file.pressureZeroOffset,
            pressureZeroDisplayText: file.pressureZeroDisplayText,
            pressureRawPlaceholder: file.pressureRawPlaceholder,
            pressureDisplayedPlaceholder: file.pressureDisplayedPlaceholder,
            pressureGaugeTargetValue: file.pressureGaugeTargetValue,
            pressureGaugeDisplayValue: file.pressureGaugeDisplayValue,
            pressureGaugeNeedleAngle: file.pressureGaugeNeedleAngle,
            gaugePressureMinKPa: file.gaugePressureMinKPa,
            gaugePressureMaxKPa: file.gaugePressureMaxKPa,
            pressureWarningThresholdKPa: file.pressureWarningThresholdKPa,
            pressureSafeThresholdKPa: file.pressureSafeThresholdKPa,
            pressureSafetyThresholdKPa: file.pressureSafetyThresholdKPa,
            pressureSafetyStatus: file.pressureSafetyStatus,
            pressureSafetyMessage: file.pressureSafetyMessage,
            pressureBlockedPumping: file.pressureBlockedPumping,
            pressureOverLimit: file.pressureOverLimit,
            pressureZeroMvPerTurn: file.pressureZeroMvPerTurn,
            pressureZeroAdjustMode: file.pressureZeroAdjustMode,
            temperatureSignalMv: file.temperatureSignalMv,
            pressureSignalMv: file.pressureSignalMv,
            pressureKPa: file.pressureKPa,
            pressureLimitKPa: file.pressureLimitKPa,
            pumpValveOpen: file.pumpValveOpen,
            pumpValveState: file.pumpValveState,
            pumpBulbState: file.pumpBulbState,
            pumpStrokeTimestamps: [...file.pumpStrokeTimestamps],
            pumpFrequency: file.pumpFrequency,
            pumpFrequencyStatus: file.pumpFrequencyStatus,
            lastPumpTime: file.lastPumpTime,
            pumpStrokeCount: file.pumpStrokeCount,
            pumpHint: file.pumpHint,
            pressurePlaceholder: file.pressurePlaceholder,
            temperaturePlaceholder: file.temperaturePlaceholder,
            recordedPressures: { ...file.recordedPressures },
            heatCapacityProcessSamples: Object.fromEntries(
              Object.entries(file.heatCapacityProcessSamples).map(([key, point]) => [key, point ? { ...point } : point]),
            ),
            theoreticalGamma: file.theoreticalGamma,
          }),
    visiblePanels: [...file.visiblePanels],
  }))
);

const WorkbenchStudioPrototype: React.FC = () => {
  const [initialSession] = useState(() => loadWorkbenchSession());
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
        const openHeatCapacityTabs = file.openHeatCapacityTabs.filter((tab) => heatCapacityMaterialsTabOrder.includes(tab));
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
  const [settingsGeneralOpen, setSettingsGeneralOpen] = useState(false);
  const [aboutWindowOpen, setAboutWindowOpen] = useState(false);
  const [aboutResultNotice, setAboutResultNotice] = useState<{ title: string; body: string } | null>(null);
  const [aboutUpdateChecking, setAboutUpdateChecking] = useState(false);
  const [settingsThemePreference, setSettingsThemePreference] = useState<WorkbenchThemePreference>(() => initialGeneralSettings.theme);
  const [settingsLanguagePreference, setSettingsLanguagePreference] = useState<WorkbenchLanguagePreference>(() => initialGeneralSettings.language);
  const [settingsPerformanceMode, setSettingsPerformanceMode] = useState<WorkbenchPerformanceMode>(() => initialGeneralSettings.performanceMode);
  const [settingsLanguageMenuOpen, setSettingsLanguageMenuOpen] = useState(false);
  const workbenchCopy = workbenchCopies[settingsLanguagePreference];
  const performanceModeOptions = useMemo(() => ([
    { mode: 'standard' as const, label: workbenchCopy.settings.performanceModeOff },
    { mode: 'balanced' as const, label: workbenchCopy.settings.performanceModeBalanced },
    { mode: 'performance' as const, label: workbenchCopy.settings.performanceModeOn },
  ]), [workbenchCopy]);
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
    kind: HeatCapacityTrialRecordRemovalKind;
  } | null>(null);
  const [pendingClearRelationKey, setPendingClearRelationKey] = useState<string | null>(null);
  const [resultsChildrenCollapsed, setResultsChildrenCollapsed] = useState(false);
  const [samplingPresetMenuOpen, setSamplingPresetMenuOpen] = useState(false);
  const [parametersEditing, setParametersEditing] = useState(false);
  const [idealAdvancedSettingsOpen, setIdealAdvancedSettingsOpen] = useState(false);
  const [idealAdvancedSettingsBodyVisible, setIdealAdvancedSettingsBodyVisible] = useState(false);
  const [parameterDraft, setParameterDraft] = useState<Record<string, string>>({});
  const [parameterErrors, setParameterErrors] = useState<string[]>([]);
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
  const consoleResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const fileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameSelectionModeRef = useRef<'initial' | 'normal'>('normal');
  const lastScanInputErrorRef = useRef<string | null>(null);
  const samplingPresetSelectRef = useRef<HTMLDivElement | null>(null);
  const consoleBodyRef = useRef<HTMLDivElement | null>(null);
  const currentParametersBodyRef = useRef<HTMLDivElement | null>(null);
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
  const heatCapacityAutoDemoAnimationFrameRef = useRef<number | null>(null);
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
  const heatCapacityFocusModeRef = useRef<'none' | 'stopcock' | 'instrument' | 'pump'>('none');
  const heatCapacityPressureAlarmVisibleRef = useRef(false);
  const heatCapacityToastTimerRef = useRef<number | null>(null);
  const heatCapacityToastCurrentRef = useRef<HeatCapacityToastMessage | null>(null);
  const heatCapacityToastPendingRef = useRef<HeatCapacityToastMessage | null>(null);
  const manualHeatCapacityPulseTimerRef = useRef<number | null>(null);
  const manualHeatCapacityIdleTimerRef = useRef<number | null>(null);
  const heatCapacityGuideNextTrialTimerRef = useRef<number | null>(null);
  const heatCapacityRecordControlsClosingTimerRef = useRef<number | null>(null);
  const heatCapacityFreeResetFeedbackTimerRef = useRef<number | null>(null);
  const aboutResultNoticeTimerRef = useRef<number | null>(null);
  const [heatCapacityFocusMode, setHeatCapacityFocusMode] = useState<'none' | 'stopcock' | 'instrument' | 'pump'>('none');
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
  const [heatCapacityRecordControlsClosing, setHeatCapacityRecordControlsClosing] = useState<HeatCapacityManualRecordKind | null>(null);
  const [manualHeatCapacityActiveFileId, setManualHeatCapacityActiveFileId] = useState<string | null>(null);
  const [manualHeatCapacityFocusControlId, setManualHeatCapacityFocusControlId] = useState<string | null>(null);
  const [manualHeatCapacityPulseActive, setManualHeatCapacityPulseActive] = useState(false);
  const [heatCapacityGuideNextTrialReadyKey, setHeatCapacityGuideNextTrialReadyKey] = useState<string | null>(null);
  const [heatCapacityGuideNextTrialNoticeHoldKey, setHeatCapacityGuideNextTrialNoticeHoldKey] = useState<string | null>(null);
  const [heatCapacityRecordToastSequenceActive, setHeatCapacityRecordToastSequenceActive] = useState(false);
  const [heatCapacityFreeResetFeedbackActive, setHeatCapacityFreeResetFeedbackActive] = useState(false);
  const [manualHeatCapacityRollback, setManualHeatCapacityRollback] = useState<{
    animation: ManualHeatCapacityRollbackAnimation;
    key: number;
  } | null>(null);
  const [autoDemoStepIndex, setAutoDemoStepIndex] = useState(0);
  const [autoDemoStepCount, setAutoDemoStepCount] = useState(0);
  const [autoDemoStepTitle, setAutoDemoStepTitle] = useState('');
  const [autoDemoStepDescription, setAutoDemoStepDescription] = useState('');
  const [autoDemoStepTarget, setAutoDemoStepTarget] = useState('');
  const [autoDemoStepNote, setAutoDemoStepNote] = useState('');
  const [autoDemoStepPanelMode, setAutoDemoStepPanelMode] = useState<'hidden' | 'visible' | 'exiting'>('hidden');

  useEffect(() => {
    heatCapacityPressureAlarmVisibleRef.current = heatCapacityPressureAlarmVisible;
  }, [heatCapacityPressureAlarmVisible]);

  useEffect(() => () => {
    if (heatCapacityFreeResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityFreeResetFeedbackTimerRef.current);
    }
  }, []);

  const emptyWorkbenchFile = useMemo(() => createDefaultStandardFile(0), []);
  const isWorkbenchEmpty = files.length === 0;
  const activeFile = files.find((file) => file.id === activeFileId) ?? emptyWorkbenchFile;
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
  const activePanelTitle = availablePanels.find((panel) => panel.key === selectedPanel)?.title ?? '3D Preview';
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
  } as React.CSSProperties;
  const shellStyle = {
    '--studio-console-height': consoleCollapsed ? '32px' : `${consoleHeightPx}px`,
  } as React.CSSProperties & Record<'--studio-console-height', string>;
  const liveWorkspaceSplitRatio = clampWorkbenchLiveSplitRatio(activeFile.liveWorkspaceSplitRatio);
  const liveWorkspaceStyle = {
    '--studio-live-preview-ratio': `${(liveWorkspaceSplitRatio * 100).toFixed(3)}%`,
    '--studio-live-realtime-ratio': `${((1 - liveWorkspaceSplitRatio) * 100).toFixed(3)}%`,
  } as React.CSSProperties;
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

  const runAboutUpdateCheck = () => {
    if (aboutUpdateChecking) return;
    setAboutUpdateChecking(true);
    window.setTimeout(() => {
      setAboutUpdateChecking(false);
      showAboutResultNotice(workbenchCopy.about.updateResultTitle, workbenchCopy.about.updateResultBody);
    }, 900);
  };

  const updateSettingsThemePreference = (theme: WorkbenchThemePreference) => {
    setSettingsThemePreference(theme);
    persistWorkbenchGeneralSettings({ theme, language: settingsLanguagePreference, performanceMode: settingsPerformanceMode });
  };

  const updateSettingsLanguagePreference = (language: WorkbenchLanguagePreference) => {
    setSettingsLanguagePreference(language);
    setSettingsLanguageMenuOpen(false);
    persistWorkbenchGeneralSettings({ theme: settingsThemePreference, language, performanceMode: settingsPerformanceMode });
  };

  const updateSettingsPerformanceMode = (performanceMode: WorkbenchPerformanceMode) => {
    setSettingsPerformanceMode(performanceMode);
    persistWorkbenchGeneralSettings({ theme: settingsThemePreference, language: settingsLanguagePreference, performanceMode });
  };

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    persistWorkbenchSession(encodeWorkbenchSession(files, activeFileId, selectedPanel));
  }, [files, activeFileId, selectedPanel]);

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

  useEffect(() => {
    if (activeFile.kind !== 'ideal' || scanInputFocused) return;
    const value = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    setScanInputDraft(formatMetric(value, getIdealScanDecimals(activeFile.relation)));
    setScanInputError(null);
  }, [activeFile.kind, activeFile.relation, activeFile.params, scanInputFocused]);

  useEffect(() => {
    if (!scanInputToast) return undefined;
    const timeoutId = window.setTimeout(() => setScanInputToast(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [scanInputToast]);

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
    if (heatCapacityGuideNextTrialTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideNextTrialTimerRef.current);
      heatCapacityGuideNextTrialTimerRef.current = null;
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
    }, settingsPerformanceMode === 'performance' ? 240 : settingsPerformanceMode === 'balanced' ? 150 : 100);
    return () => window.clearInterval(intervalId);
  }, [settingsPerformanceMode]);

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

  const toggleHeatCapacityHardSphereView = () => {
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? {
          ...file,
          hardSphereViewEnabled: !file.hardSphereViewEnabled,
          updatedAt: Date.now(),
        }
      : file);
  };

  const setHeatCapacityHardSphereMultiplier = (
    key: 'hardSphereParticleMultiplier' | 'hardSphereSpeedMultiplier',
    value: number,
  ) => {
    const nextValue = Math.min(1.25, Math.max(0.5, Number.isFinite(value) ? value : 1));
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? {
          ...file,
          [key]: Number(nextValue.toFixed(2)),
          updatedAt: Date.now(),
        }
      : file);
  };

  const createHeatCapacityTrialRecordInput = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    now = Date.now(),
  ): HeatCapacityTrialRecordInput => {
    const sample = (
      file.heatCapacityPhase === 'sealedStabilizing' || file.heatCapacityPhase === 'pumping'
    )
      ? file.heatCapacityProcessSamples.stableBeforeReleaseSample
      : (file.heatCapacityPhase === 'recovering' || file.heatCapacityPhase === 'demoComplete')
        ? file.heatCapacityProcessSamples.recoverySample
        : null;
    return {
      activeTrialIndex: file.heatCapacityActiveTrialIndex,
      phase: file.heatCapacityPhase,
      powerOn: file.powerOn,
      pressureSignalMv: sample?.pressureSignalMv ?? file.pressureSignalMv,
      temperatureSignalMv: sample?.temperatureSignalMv ?? file.temperatureSignalMv,
      pressureSafetyStatus: file.pressureSafetyStatus,
      pressureOverLimit: file.pressureOverLimit,
      now,
    };
  };

  const setHeatCapacityExpectedTrialCount = (
    count: number,
    mode: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>['heatCapacityExpectedTrialCountMode'],
  ) => {
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const nextCount = normalizeHeatCapacityExpectedTrialCount(count);
      return {
        ...file,
        heatCapacityExpectedTrialCount: nextCount,
        heatCapacityExpectedTrialCountMode: mode,
        heatCapacityTrials: resizeHeatCapacityTrials(file.heatCapacityTrials, nextCount),
        heatCapacityActiveTrialIndex: Math.min(file.heatCapacityActiveTrialIndex, Math.max(0, nextCount - 1)),
        heatCapacityProcessingCalculated: false,
        heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
        updatedAt: Date.now(),
      };
    });
  };

  const getManualHeatCapacityDecisionPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.pressureSignalTargetMv)) return file.pressureSignalTargetMv;
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return file.pressureSignalMvDisplayed;
    if (Number.isFinite(file.pressureSignalMv)) return file.pressureSignalMv;
    return 0;
  };

  const getManualHeatCapacityDisplayPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.pressureSignalMv)) return file.pressureSignalMv;
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return file.pressureSignalMvDisplayed;
    if (Number.isFinite(file.pressureSignalTargetMv)) return file.pressureSignalTargetMv;
    return 0;
  };

  const getManualHeatCapacityThresholdPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.pressureSignalMvRaw)) return file.pressureSignalMvRaw;
    if (Number.isFinite(file.pressureSignalTargetMv)) return Math.max(0, file.pressureSignalTargetMv - file.pressureInitialBiasMv - file.pressureZeroOffset);
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return Math.max(0, file.pressureSignalMvDisplayed - file.pressureInitialBiasMv - file.pressureZeroOffset);
    if (Number.isFinite(file.pressureSignalMv)) return Math.max(0, file.pressureSignalMv - file.pressureInitialBiasMv - file.pressureZeroOffset);
    return 0;
  };

  const canProceedAfterPumping = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => getManualHeatCapacityThresholdPressureMv(file) >= HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV;

  const getHeatCapacityPressureSafetyStatusFromMv = (
    pressureMv: number,
  ): 'normal' | 'warning' | 'danger' => (
    pressureMv >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV
      ? 'danger'
      : pressureMv >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV
        ? 'warning'
        : 'normal'
  );

  const showHeatCapacityPressureThresholdToast = (
    pressureMv: number,
  ) => {
    if (pressureMv >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV) {
      showHeatCapacityToast(HEAT_CAPACITY_PRESSURE_ALARM_MESSAGE, 'danger', {
        interrupt: true,
        priority: HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
        source: 'pressure-alarm',
      });
      return;
    }
    if (pressureMv >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV) {
      showHeatCapacityToast(HEAT_CAPACITY_PRESSURE_WARNING_MESSAGE, 'warning', {
        interrupt: true,
        priority: HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,
        source: 'pressure-warning',
      });
    }
  };

  const getManualHeatCapacityAmbientTemperatureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const profile = file.heatCapacityExperimentProfile;
    if (profile && Number.isFinite(profile.ambientTemperatureMv)) return profile.ambientTemperatureMv;
    if (profile && Number.isFinite(profile.initialTemperatureMv)) return profile.initialTemperatureMv;
    if (Number.isFinite(file.temperatureSignalTargetMv)) return file.temperatureSignalTargetMv;
    return 1499.05;
  };

  const getManualHeatCapacityDecisionTemperatureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.temperatureSignalTargetMv)) return file.temperatureSignalTargetMv;
    if (Number.isFinite(file.temperatureSignalMv)) return file.temperatureSignalMv;
    return getManualHeatCapacityAmbientTemperatureMv(file);
  };

  const isManualHeatCapacityTemperatureAtAmbient = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const ambientTemperatureMv = getManualHeatCapacityAmbientTemperatureMv(file);
    const targetTemperatureMv = getManualHeatCapacityDecisionTemperatureMv(file);
    const toleranceMv = Math.max(0.5, (file.heatCapacityExperimentProfile?.displayNoiseLevel ?? 0.08) * 6);
    return Math.abs(targetTemperatureMv - ambientTemperatureMv) <= toleranceMv;
  };

  const isManualU0ZeroAttempted = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => (
    file.pressureZeroAdjusted ||
    file.pressureZeroAdjustMode !== 'none' ||
    Math.abs(file.pressureZeroKnobAngle) > 0.01
  );

  const isManualU0ZeroReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    return file.powerOn &&
      stopcockState === 'open' &&
      isHeatCapacityPressureZeroWithinTolerance(file.pressureZeroDisplayedSamples);
  };

  const getActiveHeatCapacityTrial = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (file.heatCapacityTrials.length === 0) return null;
    const activeIndex = Math.min(
      file.heatCapacityTrials.length - 1,
      Math.max(0, file.heatCapacityActiveTrialIndex),
    );
    return file.heatCapacityTrials[activeIndex] ?? null;
  };

  const hasActiveTrialU1 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => getActiveHeatCapacityTrial(file)?.U1Mv !== null;

  const hasActiveTrialU2 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => getActiveHeatCapacityTrial(file)?.U2Mv !== null;

  const isActiveTrialComplete = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => getActiveHeatCapacityTrial(file)?.status === 'complete';

  const getActiveTrialRecordedU1Mv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => getActiveHeatCapacityTrial(file)?.U1Mv ?? null;

  const getManualHeatCapacityExpectedU1Mv = (
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

  const getManualHeatCapacityExpectedU2Mv = (
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

  const isManualHeatCapacityReleaseCompleteForU2 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    recordedU1Mv: number | null,
  ) => {
    if (recordedU1Mv === null) return false;
    if (file.heatCapacityProcessSamples.releaseLowSample || file.heatCapacityProcessSamples.afterReleaseSample) {
      return true;
    }
    if (file.heatCapacityPhase === 'recovering') return true;
    const pressureTarget = getManualHeatCapacityDecisionPressureMv(file);
    return pressureTarget <= Math.max(5, recordedU1Mv * 0.14);
  };

  const getManualHeatCapacityMinimumU1PlatformMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const expectedU1 = getManualHeatCapacityExpectedU1Mv(file);
    return Math.max(HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV, (expectedU1 ?? 110) * 0.45);
  };

  const isManualU1RecordReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const pressureForGate = getManualHeatCapacityThresholdPressureMv(file);
    const minimumPlatformMv = HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV;
    const temperatureReady = isManualHeatCapacityTemperatureAtAmbient(file);
    const hasEffectivePumping = file.pumpStrokeCount > 0 ||
      Boolean(file.heatCapacityProcessSamples.pumpPeakSample) ||
      pressureForGate >= minimumPlatformMv;

    return stopcockState === 'closed' &&
      !file.pumpValveOpen &&
      hasEffectivePumping &&
      canProceedAfterPumping(file) &&
      temperatureReady &&
      file.heatCapacityPhase === 'sealedStabilizing';
  };

  const isManualU2RecordReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const recordedU1Mv = getActiveTrialRecordedU1Mv(file);
    if (recordedU1Mv === null) return false;
    const pressureForGate = getManualHeatCapacityThresholdPressureMv(file);
    const lowerBound = 0.2;
    const upperBound = Math.max(5, recordedU1Mv * 0.55);
    const releaseHasStarted = pressureForGate < Math.max(10, recordedU1Mv * 0.75);
    const releaseComplete = isManualHeatCapacityReleaseCompleteForU2(file, recordedU1Mv);
    const temperatureReady = isManualHeatCapacityTemperatureAtAmbient(file);

    return stopcockState === 'closed' &&
      releaseHasStarted &&
      releaseComplete &&
      pressureForGate >= lowerBound &&
      pressureForGate <= upperBound &&
      temperatureReady &&
      file.heatCapacityPhase === 'recovering';
  };

  const getHeatCapacityManualStep = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): ManualHeatCapacityStep => {
    if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) return 'idle';
    if (file.heatCapacityPhase === 'demoComplete' || file.runState === 'finished') return 'idle';
    if (!file.powerOn) return 'powerOnRequired';

    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const pressureValue = getManualHeatCapacityThresholdPressureMv(file);
    const hasU0 = Boolean(file.heatCapacityProcessSamples.zeroedSample);
    const hasU1 = hasActiveTrialU1(file);
    const hasU2 = hasActiveTrialU2(file);
    const recordedU1Mv = getActiveTrialRecordedU1Mv(file);
    const releaseComplete = recordedU1Mv !== null && isManualHeatCapacityReleaseCompleteForU2(file, recordedU1Mv);
    const u1Ready = isManualU1RecordReady(file);
    const u2Ready = isManualU2RecordReady(file);
    const completedTrialCount = getHeatCapacityCompletedTrialCount(file.heatCapacityTrials);

    if (!hasU0) {
      if (stopcockState !== 'open') return 'openStopcockForZeroRequired';
      if (!isManualU0ZeroReady(file)) return 'zeroAdjustRequired';
      return 'recordU0Required';
    }
    if (!hasU1) {
      if (stopcockState !== 'closed') return 'closeStopcockRequired';
      const minimumU1PlatformMv = getManualHeatCapacityMinimumU1PlatformMv(file);
      if (!file.pumpValveOpen && pressureValue < 8 && file.pumpStrokeCount === 0) return 'openPumpValveRequired';
      if (!file.pumpValveOpen && pressureValue < minimumU1PlatformMv) return 'openPumpValveRequired';
      if (file.pumpValveOpen && pressureValue < minimumU1PlatformMv) return 'pumpRequired';
      if (file.pumpValveOpen && pressureValue >= minimumU1PlatformMv) return 'closePumpValveRequired';
      return u1Ready ? 'recordU1Required' : 'stabilizeBeforeReleaseRequired';
    }
    if (!hasU2) {
      if (u2Ready) return 'recordU2Required';
      if (!releaseComplete) return 'openStopcockReleaseRequired';
      if (stopcockState === 'open') return 'closeStopcockAfterReleaseRequired';
      return 'recoverRequired';
    }
    if (isActiveTrialComplete(file) && completedTrialCount < file.heatCapacityExpectedTrialCount) return 'nextTrialRequired';
    return file.heatCapacityProcessingCalculated ? 'completed' : 'calculateRequired';
  };

  const getManualStepGuidance = (
    step: ManualHeatCapacityStep,
    file?: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): { message: string; controlId: string | null } => {
    const isEn = settingsLanguagePreference === 'en';
    const isTw = settingsLanguagePreference === 'zh-TW';
    const zeroAdjustMessage = file && isManualU0ZeroAttempted(file)
      ? isEn
        ? 'Uₚ is still not close to 0. Continue adjusting the pressure-zero knob.'
        : isTw
          ? '目前 Uₚ 仍未接近 0，請繼續調整壓強調零旋鈕。'
          : '当前 Uₚ 仍未接近 0，请继续调整压力调零旋钮。'
      : isEn
        ? 'Adjust the pressure-zero knob until Uₚ is close to 0.'
        : isTw
          ? '請旋轉壓強調零旋鈕，使 Uₚ 接近 0。'
          : '请旋转压力调零旋钮，使 Uₚ 接近 0。';
    const temperatureReady = file ? isManualHeatCapacityTemperatureAtAmbient(file) : false;
    const waitBeforeU1Message = isEn
      ? 'Wait for U₁ and Uₜ to stabilize; then record U₁ and Uₜ.'
      : isTw
        ? '請等待 U₁ 和 Uₜ 穩定；穩定後記錄 U₁ 和 Uₜ。'
        : '请等待 U₁ 和 Uₜ 稳定；稳定后记录 U₁ 和 Uₜ。';
    const recordedU1Mv = file ? getActiveTrialRecordedU1Mv(file) : null;
    const releaseComplete = file ? isManualHeatCapacityReleaseCompleteForU2(file, recordedU1Mv) : false;
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
      ? 'Wait for U₂ and Uₜ to stabilize; then record U₂ and Uₜ.'
      : isTw
        ? '請等待 U₂ 和 Uₜ 穩定；穩定後記錄 U₂ 和 Uₜ。'
        : '请等待 U₂ 和 Uₜ 稳定；稳定后记录 U₂ 和 Uₜ。';
    const messages: Record<ManualHeatCapacityStep, string> = {
      idle: isEn ? 'Start guide mode when ready.' : isTw ? '需要時開始引導模式。' : '需要时开始引导模式。',
      powerOnRequired: isEn ? 'Turn on the power first.' : isTw ? '請先打開電源。' : '请先打开电源。',
      openStopcockForZeroRequired: isEn ? 'Open the glass stopcock before pressure zeroing.' : isTw ? '請先打開玻璃旋塞，再進行壓強差調零。' : '请先打开玻璃旋塞，再进行压强差调零。',
      zeroAdjustRequired: zeroAdjustMessage,
      recordU0Required: isEn ? 'Record U₀ before pressurizing.' : isTw ? '請先記錄 U₀，再開始加壓。' : '请先记录 U₀，再开始加压。',
      closeStopcockRequired: isEn ? 'Close the glass stopcock before pumping.' : isTw ? '請先關閉玻璃旋塞。' : '请先关闭玻璃旋塞。',
      openPumpValveRequired: isEn ? 'Open the pump valve before pumping.' : isTw ? '請先打開打氣閥門。' : '请先打开打气阀门。',
      pumpRequired: isEn ? 'Pump air until Uₚ reaches the required range.' : isTw ? '請連續打氣，使 Uₚ 上升到合適範圍。' : '请连续打气，使 Uₚ 上升到合适范围。',
      closePumpValveRequired: isEn ? 'Close the pump valve and wait for stabilization.' : isTw ? '請先關閉打氣閥門，等待读數穩定。' : '请先关闭打气阀门，等待读数稳定。',
      stabilizeBeforeReleaseRequired: waitBeforeU1Message,
      recordU1Required: isEn ? 'The temperature is back near room temperature. Record U₁ before releasing the gas.' : isTw ? '溫度已回到室溫附近，請先記錄 U₁，再進行放氣。' : '温度已回到室温附近，请先记录 U₁，再进行放气。',
      openStopcockReleaseRequired: openReleaseMessage,
      closeStopcockAfterReleaseRequired: isEn ? 'Close the glass stopcock after quick release.' : isTw ? '放氣後請關閉玻璃旋塞。' : '放气后请关闭玻璃旋塞。',
      recoverRequired: recoverMessage,
      recordU2Required: isEn ? 'Thermal recovery is complete. Record U₂ before calculating.' : isTw ? '回溫已完成，請先記錄 U₂，再進行計算。' : '回温已完成，请先记录 U₂，再进行计算。',
      nextTrialRequired: isEn ? 'This trial is complete. Use the top mode bar to start the next trial.' : isTw ? '本組已完成，請在上方模式列開始下一組實驗。' : '本组已完成，请在上方模式栏开始下一组实验。',
      calculateRequired: isEn ? 'Open Data Processing and calculate the result.' : isTw ? '請進入資料處理並計算結果。' : '请进入数据处理并计算结果。',
      completed: isEn ? 'Guide experiment complete.' : isTw ? '引導實驗已完成。' : '引导实验已完成。',
    };
    const controlByStep: Record<ManualHeatCapacityStep, string | null> = {
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
      nextTrialRequired: 'nextTrial',
      calculateRequired: 'recordU2',
      completed: null,
    };
    return { message: messages[step], controlId: controlByStep[step] };
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

  const isHeatCapacityManualToast = (message: HeatCapacityToastMessage | null) => (
    message?.source === 'manual-guide' ||
    message?.source === 'manual-blocked'
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
      source: options.source ?? 'manual-guide',
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

  const clearHeatCapacityGuideNextTrialReveal = () => {
    if (heatCapacityGuideNextTrialTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideNextTrialTimerRef.current);
      heatCapacityGuideNextTrialTimerRef.current = null;
    }
    setHeatCapacityGuideNextTrialReadyKey(null);
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
    setHeatCapacityGuideNextTrialNoticeHoldKey(null);
    setHeatCapacityRecordToastSequenceActive(false);
  };

  const getHeatCapacityRecordSuccessToast = (kind: HeatCapacityManualRecordKind) => (
    kind === 'u0'
      ? heatCapacityRealtimeCopy.recordU0SuccessToast
      : kind === 'u1'
        ? heatCapacityRealtimeCopy.recordU1SuccessToast
        : heatCapacityRealtimeCopy.recordU2SuccessToast
  );

  const showHeatCapacityRecordSuccessSequence = ({
    recordMessage,
    trialCompleteMessage,
    nextTrialNoticeHoldKey,
  }: {
    recordMessage: string;
    trialCompleteMessage: string | null;
    nextTrialNoticeHoldKey: string | null;
  }) => {
    clearHeatCapacityRecordSuccessToastTimers();
    if (nextTrialNoticeHoldKey) setHeatCapacityGuideNextTrialNoticeHoldKey(nextTrialNoticeHoldKey);
    setHeatCapacityRecordToastSequenceActive(true);
    showHeatCapacityToast(recordMessage, 'success', { interrupt: true });

    if (trialCompleteMessage) {
      const trialCompleteTimerId = window.setTimeout(() => {
        showHeatCapacityToast(trialCompleteMessage, 'success', { interrupt: true });
      }, HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS);
      heatCapacityRecordSuccessToastTimersRef.current.push(trialCompleteTimerId);
    }

    const releaseDelay = trialCompleteMessage
      ? HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS * 2
      : HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS;
    const releaseTimerId = window.setTimeout(() => {
      heatCapacityRecordSuccessToastTimersRef.current = [];
      if (nextTrialNoticeHoldKey) setHeatCapacityGuideNextTrialNoticeHoldKey(null);
      setHeatCapacityRecordToastSequenceActive(false);
    }, releaseDelay);
    heatCapacityRecordSuccessToastTimersRef.current.push(releaseTimerId);
  };

  const getHeatCapacityGuideNextTrialKey = (file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>) => {
    const completedTrialCount = getHeatCapacityCompletedTrialCount(file.heatCapacityTrials);
    const nextActiveTrialIndex = getHeatCapacityNextActiveTrialIndex(file.heatCapacityTrials);
    return `${file.id}:${completedTrialCount}:${nextActiveTrialIndex}`;
  };

  const exitHeatCapacityFocusMode = () => {
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusModeRef.current = 'none';
    setHeatCapacityFocusMode('none');
  };

  const showHeatCapacityPressureAlarm = (fileId: string, fileName: string) => {
    clearHeatCapacityToastQueue();
    setHeatCapacityPressureAlarmVisible(true);
    exitHeatCapacityFocusMode();
    pushLog(`${fileName}: 压强已超过安全阈值，请停止打气。`, 'warning');
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
        showHeatCapacityToast(HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER, 'warning', {
          interrupt: true,
          priority: HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
          source: 'pressure-close-valve',
        });
      }, HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS);
    }, HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS);
  };

  const showManualHeatCapacityGuidance = (
    message: string,
    controlId?: string | null,
    level: HeatCapacityToastLevel = 'info',
    source: Extract<HeatCapacityToastSource, 'manual-guide' | 'manual-blocked'> = 'manual-guide',
  ) => {
    if (isHeatCapacityPressureAlertActive()) return;
    showHeatCapacityToast(message, level, { source });
    setManualHeatCapacityFocusControlId(controlId ?? null);
    setManualHeatCapacityPulseActive(Boolean(controlId));
    if (manualHeatCapacityPulseTimerRef.current !== null) window.clearTimeout(manualHeatCapacityPulseTimerRef.current);
    manualHeatCapacityPulseTimerRef.current = window.setTimeout(() => {
      manualHeatCapacityPulseTimerRef.current = null;
      setManualHeatCapacityPulseActive(false);
      setManualHeatCapacityFocusControlId(null);
    }, 2200);
  };

  const clearManualHeatCapacityGuidance = () => {
    clearHeatCapacityToastBySource(isHeatCapacityManualToast);
    setManualHeatCapacityPulseActive(false);
    setManualHeatCapacityFocusControlId(null);
    if (manualHeatCapacityPulseTimerRef.current !== null) {
      window.clearTimeout(manualHeatCapacityPulseTimerRef.current);
      manualHeatCapacityPulseTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
      heatCapacityRecordControlsClosingTimerRef.current = null;
    }
  }, []);

  const getManualHeatCapacityGuard = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    action: ManualHeatCapacityAction,
  ): ManualHeatCapacityGuardResult => {
    if (action === 'calculate' && file.heatCapacityTrials.some((trial) => trial.status === 'complete')) {
      return { allowed: true };
    }
    const step = getHeatCapacityManualStep(file);
    const guidance = getManualStepGuidance(step, file);
    const allowedActions: Record<ManualHeatCapacityStep, ManualHeatCapacityAction[]> = {
      idle: ['turnPowerOn'],
      powerOnRequired: ['turnPowerOn'],
      openStopcockForZeroRequired: ['openStopcock'],
      zeroAdjustRequired: ['adjustPressureZero'],
      recordU0Required: ['adjustPressureZero', 'recordU0'],
      closeStopcockRequired: ['closeStopcock'],
      openPumpValveRequired: ['openPumpValve'],
      pumpRequired: ['pumpBulb'],
      closePumpValveRequired: ['closePumpValve', 'pumpBulb'],
      stabilizeBeforeReleaseRequired: [],
      recordU1Required: ['recordU1'],
      openStopcockReleaseRequired: ['openStopcock'],
      closeStopcockAfterReleaseRequired: ['closeStopcock'],
      recoverRequired: [],
      recordU2Required: ['recordU2'],
      nextTrialRequired: ['startNextTrial'],
      calculateRequired: ['calculate'],
      completed: ['calculate'],
    };
    if (
      action === 'closePumpValve' &&
      (step === 'pumpRequired' || step === 'closePumpValveRequired') &&
      !canProceedAfterPumping(file)
    ) {
      return {
        allowed: false,
        expectedControlId: 'pumpBulb',
        expectedMessage: '充气不足，请继续打气',
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
      };
    }
    if (step === 'recoverRequired') {
      return {
        allowed: false,
        expectedControlId: 'recordU2',
        expectedMessage: guidance.message,
        expectedLevel: 'warning',
      };
    }
    if (allowedActions[step]?.includes(action)) return { allowed: true };
    const rollbackByAction: Partial<Record<ManualHeatCapacityAction, ManualHeatCapacityRollbackAnimation>> = {
      adjustPressureZero: 'knobBounce',
      openStopcock: 'stopcockBounce',
      closeStopcock: 'stopcockBounce',
      openPumpValve: 'valveBounce',
      closePumpValve: 'valveBounce',
      pumpBulb: 'pumpBulbBounce',
      turnPowerOn: 'powerBounce',
      turnPowerOff: 'powerBounce',
    };
    if (isHeatCapacityManualRecordStep(step)) {
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

  const applyManualHeatCapacityGuardFailure = (guard: ManualHeatCapacityGuardResult) => {
    if (guard.rollbackAnimation === 'pumpBulbBounce') setHeatCapacityPumpPulseId((pulseId) => pulseId + 1);
    if (guard.rollbackAnimation) {
      setManualHeatCapacityRollback({
        animation: guard.rollbackAnimation,
        key: Date.now(),
      });
    }
    if (guard.suppressGuidance) return;
    showManualHeatCapacityGuidance(guard.expectedMessage ?? '', guard.expectedControlId, guard.expectedLevel ?? 'warning', 'manual-blocked');
  };

  const guardManualHeatCapacityAction = (
    action: ManualHeatCapacityAction,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (source === 'autoDemo') return true;
    if (!activeFile || activeFile.kind !== 'heatCapacity') return true;
    if (manualHeatCapacityActiveFileId !== activeFile.id) return true;
    const guard = getManualHeatCapacityGuard(activeFile, action);
    if (guard.allowed) {
      clearManualHeatCapacityGuidance();
      return true;
    }
    applyManualHeatCapacityGuardFailure(guard);
    return false;
  };

  const activeHeatCapacityManualFileId = activeFile.kind === 'heatCapacity' ? activeFile.id : null;
  const activeHeatCapacityManualStep: ManualHeatCapacityStep = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityManualStep(activeFile)
    : 'idle';
  const activeHeatCapacityGuideNextTrialKey = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityGuideNextTrialKey(activeFile)
    : null;

  useEffect(() => {
    if (!activeHeatCapacityManualFileId) return;
    if (manualHeatCapacityActiveFileId !== activeHeatCapacityManualFileId) return;
    if (!isHeatCapacityManualRecordStep(activeHeatCapacityManualStep)) return;
    clearManualHeatCapacityGuidance();
  }, [
    activeHeatCapacityManualFileId,
    activeHeatCapacityManualStep,
    manualHeatCapacityActiveFileId,
  ]);

  useEffect(() => {
    if (manualHeatCapacityIdleTimerRef.current !== null) {
      window.clearTimeout(manualHeatCapacityIdleTimerRef.current);
      manualHeatCapacityIdleTimerRef.current = null;
    }
    if (!activeHeatCapacityManualFileId) return undefined;
    if (manualHeatCapacityActiveFileId !== activeHeatCapacityManualFileId) return undefined;
    if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) return undefined;
    if (heatCapacityRecordToastSequenceActive) return undefined;
    if (
      activeHeatCapacityManualStep === 'idle' ||
      activeHeatCapacityManualStep === 'nextTrialRequired' ||
      activeHeatCapacityManualStep === 'completed' ||
      isHeatCapacityManualRecordStep(activeHeatCapacityManualStep)
    ) return undefined;
    const manualFileId = activeHeatCapacityManualFileId;
    const scheduleManualIdleHint = (delayMs: number) => {
      manualHeatCapacityIdleTimerRef.current = window.setTimeout(() => {
        manualHeatCapacityIdleTimerRef.current = null;
        const latestFile = filesRef.current.find((file) => file.id === manualFileId);
        if (!latestFile || latestFile.kind !== 'heatCapacity') return;
        if (manualHeatCapacityActiveFileId !== manualFileId) return;
        if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) return;
        if (heatCapacityRecordToastSequenceActive) return;
        const latestStep = getHeatCapacityManualStep(latestFile);
        if (latestStep === 'idle' || latestStep === 'completed') return;
        if (latestStep === 'nextTrialRequired' || isHeatCapacityManualRecordStep(latestStep)) return;
        const guidance = getManualStepGuidance(latestStep, latestFile);
        showManualHeatCapacityGuidance(guidance.message, guidance.controlId);
        scheduleManualIdleHint(MANUAL_HEAT_CAPACITY_IDLE_HINT_REPEAT_MS);
      }, delayMs);
    };
    scheduleManualIdleHint(MANUAL_HEAT_CAPACITY_IDLE_HINT_DELAY_MS);
    return () => {
      if (manualHeatCapacityIdleTimerRef.current !== null) {
        window.clearTimeout(manualHeatCapacityIdleTimerRef.current);
        manualHeatCapacityIdleTimerRef.current = null;
      }
    };
  }, [
    activeHeatCapacityManualFileId,
    activeHeatCapacityManualStep,
    autoDemoRunning,
    autoDemoPaused,
    autoDemoInteractionLocked,
    heatCapacityRecordToastSequenceActive,
    manualHeatCapacityActiveFileId,
    settingsLanguagePreference,
  ]);

  useEffect(() => {
    if (heatCapacityGuideNextTrialTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideNextTrialTimerRef.current);
      heatCapacityGuideNextTrialTimerRef.current = null;
    }
    if (!activeHeatCapacityManualFileId || !activeHeatCapacityGuideNextTrialKey) {
      setHeatCapacityGuideNextTrialReadyKey(null);
      return undefined;
    }
    if (manualHeatCapacityActiveFileId !== activeHeatCapacityManualFileId) {
      setHeatCapacityGuideNextTrialReadyKey(null);
      return undefined;
    }
    if (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked) {
      setHeatCapacityGuideNextTrialReadyKey(null);
      return undefined;
    }
    if (heatCapacityRecordToastSequenceActive) return undefined;
    if (activeHeatCapacityManualStep !== 'nextTrialRequired') {
      setHeatCapacityGuideNextTrialReadyKey(null);
      if (heatCapacityGuideNextTrialNoticeHoldKey) setHeatCapacityGuideNextTrialNoticeHoldKey(null);
      return undefined;
    }
    const nextTrialKey = activeHeatCapacityGuideNextTrialKey;
    if (heatCapacityGuideNextTrialReadyKey === nextTrialKey) return undefined;
    if (heatCapacityGuideNextTrialNoticeHoldKey === nextTrialKey) return undefined;
    setHeatCapacityGuideNextTrialReadyKey(null);
    showHeatCapacityToast(heatCapacityRealtimeCopy.skipRecoveryWait, 'warning', {
      interrupt: true,
      priority: HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,
    });
    const manualFileId = activeHeatCapacityManualFileId;
    heatCapacityGuideNextTrialTimerRef.current = window.setTimeout(() => {
      heatCapacityGuideNextTrialTimerRef.current = null;
      const latestFile = filesRef.current.find((file) => file.id === manualFileId);
      if (!latestFile || latestFile.kind !== 'heatCapacity') return;
      if (manualHeatCapacityActiveFileId !== manualFileId) return;
      if (getHeatCapacityManualStep(latestFile) !== 'nextTrialRequired') return;
      setHeatCapacityGuideNextTrialReadyKey(nextTrialKey);
    }, HEAT_CAPACITY_GUIDE_NEXT_TRIAL_DELAY_MS);
    return () => {
      if (heatCapacityGuideNextTrialTimerRef.current !== null) {
        window.clearTimeout(heatCapacityGuideNextTrialTimerRef.current);
        heatCapacityGuideNextTrialTimerRef.current = null;
      }
    };
  }, [
    activeHeatCapacityGuideNextTrialKey,
    activeHeatCapacityManualFileId,
    activeHeatCapacityManualStep,
    autoDemoRunning,
    autoDemoPaused,
    autoDemoInteractionLocked,
    heatCapacityGuideNextTrialReadyKey,
    heatCapacityGuideNextTrialNoticeHoldKey,
    heatCapacityRecordToastSequenceActive,
    heatCapacityRealtimeCopy,
    manualHeatCapacityActiveFileId,
  ]);

  const showHeatCapacityRecordButtonExit = (kind: HeatCapacityManualRecordKind) => {
    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
    }
    setHeatCapacityRecordControlsClosing(kind);
    heatCapacityRecordControlsClosingTimerRef.current = window.setTimeout(() => {
      heatCapacityRecordControlsClosingTimerRef.current = null;
      setHeatCapacityRecordControlsClosing(null);
    }, 220);
  };

  const recordHeatCapacityManualSample = (kind: HeatCapacityManualRecordKind) => {
    if (!activeFile || activeFile.kind !== 'heatCapacity') return;
    const action = kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2';
    if (!guardManualHeatCapacityAction(action)) return;
    const stepAtClick = activeHeatCapacityManualStep;
    const now = Date.now();
    let message = '';
    let ok = false;
    let shouldShowSkippedRecoveryWait = false;
    let nextTrialNoticeHoldKey: string | null = null;
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const latestStep = getHeatCapacityManualStep(file);
      const requiredStep = kind === 'u0'
        ? 'recordU0Required'
        : kind === 'u1'
          ? 'recordU1Required'
          : 'recordU2Required';
      if (manualHeatCapacityActiveFileId === file.id && latestStep !== requiredStep && stepAtClick !== requiredStep) {
        message = getManualStepGuidance(latestStep, file).message;
        return file;
      }
      if (kind === 'u0') {
        if (!isManualU0ZeroReady(file)) {
          message = heatCapacityRealtimeCopy.recordU0Warning;
          return file;
        }
        ok = true;
        message = heatCapacityRealtimeCopy.recordU0SuccessToast;
        return {
          ...captureHeatCapacityWorkbenchSample(file, 'zeroedSample', now, { applyProfile: false }),
          heatCapacityProcessingCalculated: false,
          heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
          updatedAt: now,
        };
      }
      const sampledFile = captureHeatCapacityWorkbenchSample(
        file,
        kind === 'u1' ? 'stableBeforeReleaseSample' : 'recoverySample',
        now,
        { applyProfile: false },
      );
      const input = createHeatCapacityTrialRecordInput(sampledFile, now);
      const result = kind === 'u1'
        ? recordHeatCapacityU1(sampledFile.heatCapacityTrials, input)
        : recordHeatCapacityU2(sampledFile.heatCapacityTrials, input);
      message = result.message;
      ok = result.ok;
      if (!result.ok) return file;
      message = getHeatCapacityRecordSuccessToast(kind);
      const completedTrialCount = getHeatCapacityCompletedTrialCount(result.trials);
      shouldShowSkippedRecoveryWait = kind === 'u2'
        && completedTrialCount < file.heatCapacityExpectedTrialCount;
      if (shouldShowSkippedRecoveryWait) {
        nextTrialNoticeHoldKey = `${file.id}:${completedTrialCount}:${getHeatCapacityNextActiveTrialIndex(result.trials)}`;
      }
      return {
        ...sampledFile,
        heatCapacityTrials: result.trials,
        heatCapacityActiveTrialIndex: result.nextActiveTrialIndex,
        heatCapacityProcessingCalculated: false,
        heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
        updatedAt: now,
      };
    });
    if (ok) {
      showHeatCapacityRecordButtonExit(kind);
      if (!shouldShowSkippedRecoveryWait) clearHeatCapacityGuideNextTrialReveal();
      const recordSuccessMessage = message || getHeatCapacityRecordSuccessToast(kind);
      const trialCompleteLogMessage = kind === 'u2'
        ? shouldShowSkippedRecoveryWait
          ? heatCapacityRealtimeCopy.trialCompleteToast
          : heatCapacityRealtimeCopy.finalTrialCompleteToast
        : '';
      showHeatCapacityRecordSuccessSequence({
        recordMessage: getHeatCapacityRecordSuccessToast(kind),
        trialCompleteMessage: kind === 'u2'
          ? shouldShowSkippedRecoveryWait
            ? heatCapacityRealtimeCopy.trialCompleteToast
            : heatCapacityRealtimeCopy.finalTrialCompleteToast
          : null,
        nextTrialNoticeHoldKey,
      });
      pushLog(recordSuccessMessage, 'success');
      if (kind === 'u2') pushLog(trialCompleteLogMessage, 'success');
      return;
    }
    const fallbackMessage = message || (kind === 'u0'
      ? heatCapacityRealtimeCopy.recordU0Warning
      : kind === 'u1'
        ? heatCapacityRealtimeCopy.recordU1Warning
        : heatCapacityRealtimeCopy.recordU2Warning);
    showManualHeatCapacityGuidance(fallbackMessage, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'warning', 'manual-blocked');
    pushLog(fallbackMessage, 'warning');
  };

  const recordFreeHeatCapacitySample = (kind: HeatCapacityManualRecordKind) => {
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const now = Date.now();
    let ok = false;
    let message = '';
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      const activeDisplay = selectActiveHeatCapacityWorkbenchDisplay(file);
      const display = {
        displayPressureMv: activeDisplay.pressureMv,
        displayTemperatureMv: activeDisplay.temperatureMv,
        pressureSlopeMvPerS: file.heatCapacityFreeSensorState.pressureSlopeMvPerS,
        temperatureSlopeMvPerS: file.heatCapacityFreeSensorState.temperatureSlopeMvPerS,
      };
      const lastTrial = file.heatCapacityFreeTrials[file.heatCapacityFreeTrials.length - 1] ?? null;
      const useLastTrial = lastTrial !== null && (!lastTrial.u0 || !lastTrial.u1 || !lastTrial.u2);
      const trialIndex = useLastTrial ? file.heatCapacityFreeTrials.length - 1 : file.heatCapacityFreeTrials.length;
      const trialBase = useLastTrial
        ? lastTrial
        : createHeatCapacityFreeTrial(`free-trial-${file.heatCapacityFreeTrials.length + 1}`, file.heatCapacityFreeCalibrationState.automaticU0);
      const trial = !trialBase.u0 && file.heatCapacityFreeCalibrationState.automaticU0
        ? {
            ...trialBase,
            automaticU0: file.heatCapacityFreeCalibrationState.automaticU0,
          }
        : trialBase;
      const evaluation = kind === 'u0'
        ? file.pressureZeroed
          ? evaluateFreeU0Record(
              trial,
              file.heatCapacityFreeCalibrationState,
              display,
              file.heatCapacityFreePhysicsState,
              HEAT_CAPACITY_FREE_RECORD_CONFIG,
            )
          : { ready: false, reason: 'zero-not-ready' as const }
        : kind === 'u1'
        ? evaluateFreeU1Record(
            trial,
            file.heatCapacityFreeCalibrationState,
            display,
            file.heatCapacityFreePhysicsState,
            HEAT_CAPACITY_FREE_RECORD_CONFIG,
          )
        : evaluateFreeU2Record(
            trial,
            file.heatCapacityFreeCalibrationState,
            display,
            file.heatCapacityFreePhysicsState,
            HEAT_CAPACITY_FREE_RECORD_CONFIG,
          );
      if (!evaluation.ready) {
        message = heatCapacityFreeRecordRejectMessages[evaluation.reason];
        return {
          ...file,
          pumpHint: message,
          heatCapacityFreeTrials: useLastTrial
            ? file.heatCapacityFreeTrials.map((candidate, index) => (
                index === trialIndex ? { ...trial, blockedReason: evaluation.reason } : candidate
              ))
            : file.heatCapacityFreeTrials,
          updatedAt: now,
        };
      }
      const latestZeroEventId = file.heatCapacityFreeCalibrationState.zeroEvents[
        file.heatCapacityFreeCalibrationState.zeroEvents.length - 1
      ]?.id ?? '';
      const recordReference = kind === 'u0' ? null : trial.u0;
      const input = {
        atS: file.heatCapacityFreePhysicsState.simulationTimeS,
        displayPressureMv: display.displayPressureMv,
        displayTemperatureMv: display.displayTemperatureMv,
        calibrationVersion: recordReference?.calibrationVersion ?? file.heatCapacityFreeCalibrationState.calibrationVersion,
        zeroEventId: recordReference?.zeroEventId ?? latestZeroEventId,
      };
      const recordResult = kind === 'u0'
        ? recordFreeU0(trial, input)
        : kind === 'u1'
          ? recordFreeU1(trial, input)
          : recordFreeU2(trial, input, {
              atmosphericPressureKPa: file.heatCapacityFreeEnvironmentConfig.ambientPressureKPa,
              pressureSensitivityMvPerKPa: file.heatCapacityFreeSensorConfig.pressureMvPerKPa,
              theoreticalGamma: file.theoreticalGamma,
            });
      if (!recordResult.accepted) {
        message = heatCapacityFreeRecordRejectMessages[recordResult.reason];
        return file;
      }
      ok = true;
      message = kind === 'u0'
        ? 'Free Mode 已记录 U₀ 显示值。'
        : kind === 'u1'
          ? 'Free Mode 已记录 U₁ 显示值。'
          : 'Free Mode 已记录 U₂ 显示值。';
      const heatCapacityFreeTrials = useLastTrial
        ? file.heatCapacityFreeTrials.map((candidate, index) => (
            index === trialIndex ? recordResult.trial : candidate
          ))
        : [...file.heatCapacityFreeTrials, recordResult.trial];
      return {
        ...file,
        heatCapacityFreeTrials,
        heatCapacityProcessingCalculated: false,
        updatedAt: now,
      };
    });
    if (ok) {
      clearManualHeatCapacityGuidance();
      showManualHeatCapacityGuidance(message, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'success');
      pushLog(message, 'success');
      return;
    }
    const fallbackMessage = message || 'Free Mode 当前不能记录该数据点。';
    showManualHeatCapacityGuidance(fallbackMessage, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'warning', 'manual-blocked');
    pushLog(fallbackMessage, 'warning');
  };

  const calculateHeatCapacityProcessingResults = () => {
    if (!guardManualHeatCapacityAction('calculate')) return;
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      if (file.heatCapacityMode === 'free') {
        const processingResult = calculateFreeHeatCapacityMeanResult(file.heatCapacityFreeTrials, {
          theoreticalGamma: file.theoreticalGamma,
          atmosphericPressureKPa: file.heatCapacityFreeEnvironmentConfig.ambientPressureKPa,
          pressureSensitivityMvPerKPa: file.heatCapacityFreeSensorConfig.pressureMvPerKPa,
        });
        pushLog(processingResult.message, processingResult.status === 'ready' ? 'success' : 'warning');
        return {
          ...file,
          heatCapacityProcessingCalculated: processingResult.calculated,
          updatedAt: Date.now(),
        };
      }
      const completedTrialCount = getHeatCapacityCompletedTrialCount(file.heatCapacityTrials);
      if (completedTrialCount < file.heatCapacityExpectedTrialCount) {
        pushLog(heatCapacityRealtimeCopy.finishExpectedTrialsFirst, 'warning');
        showManualHeatCapacityGuidance(heatCapacityRealtimeCopy.finishExpectedTrialsFirst, 'nextTrial', 'warning', 'manual-blocked');
        return file;
      }
      const processingResult = calculateHeatCapacityMeanResult(file.heatCapacityTrials, {
        atmosphericPressureKPa: file.ambientPressureKPa,
        pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
        theoreticalGamma: file.theoreticalGamma,
      });
      pushLog(processingResult.message, processingResult.status === 'ready' ? 'success' : 'warning');
      return {
        ...file,
        heatCapacityProcessingCalculated: processingResult.calculated,
        heatCapacityProcessingResult: processingResult,
        updatedAt: Date.now(),
      };
    });
  };

  const requestRemoveHeatCapacityTrialRecord = (
    trialIndex: number,
    kind: HeatCapacityTrialRecordRemovalKind,
  ) => {
    if (!activeFile || activeFile.kind !== 'heatCapacity') return;
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
        const removal = removeHeatCapacityFreeTrialRecord(file.heatCapacityFreeTrials, trialIndex, kind);
        return {
          ...file,
          heatCapacityFreeTrials: removal.trials,
          heatCapacityProcessingCalculated: false,
          heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
          updatedAt: Date.now(),
        };
      }
      if (kind === 'u0') return file;
      const removal = removeHeatCapacityTrialRecord(file.heatCapacityTrials, trialIndex, kind);
      const nextProcessSamples = { ...file.heatCapacityProcessSamples };
      delete nextProcessSamples.afterReleaseSample;
      delete nextProcessSamples.releaseLowSample;
      delete nextProcessSamples.recoverySample;
      if (kind === 'u1' || kind === 'trial') {
        delete nextProcessSamples.afterPumpSample;
        delete nextProcessSamples.pumpPeakSample;
        delete nextProcessSamples.beforeReleaseSample;
        delete nextProcessSamples.stableBeforeReleaseSample;
        delete nextProcessSamples.zeroedSample;
      }
      return {
        ...file,
        heatCapacityTrials: removal.trials,
        heatCapacityActiveTrialIndex: removal.nextActiveTrialIndex,
        heatCapacityProcessSamples: nextProcessSamples,
        heatCapacityProcessingCalculated: false,
        heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
        updatedAt: Date.now(),
      };
    });
    setPendingRemoveHeatCapacityTrialRecord(null);
    pushLog(`${activeFile.name}: 已删除第 ${displayTrialIndex} 组${kind === 'trial' ? '' : ` ${recordLabel}`}记录。`);
  };

  const updateHeatCapacityPower = (nextPowerOn: boolean, source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    if (!guardManualHeatCapacityAction(nextPowerOn ? 'turnPowerOn' : 'turnPowerOff', source)) return;
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const cleanFile = nextPowerOn && source === 'user' && (file.heatCapacityPhase === 'demoComplete' || file.runState === 'finished')
        ? resetHeatCapacityForManualExperiment(file, now)
        : file;
      if (nextPowerOn && !cleanFile.heatCapacityExperimentProfile) {
        const experimentSeed = createHeatCapacityExperimentSeed();
        return powerHeatCapacityWorkbenchFile({
          ...cleanFile,
          heatCapacityExperimentSeed: experimentSeed,
          heatCapacityExperimentProfile: createHeatCapacityExperimentProfile(experimentSeed),
        }, nextPowerOn, now);
      }
      return powerHeatCapacityWorkbenchFile(cleanFile, nextPowerOn, now);
    });
  };

  const activateHeatCapacityManualExperiment = (fileId: string, fileName: string) => {
    const now = Date.now();
    clearManualHeatCapacityGuidance();
    clearHeatCapacityGuideNextTrialReveal();
    setManualHeatCapacityActiveFileId(fileId);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    updateFileById(fileId, (file) => (
      file.kind === 'heatCapacity'
        ? resetHeatCapacityForManualExperiment(file, now)
        : file
    ));
    pushLog(`${fileName}: heat-capacity guide mode reset.`, 'success');
  };

  const startHeatCapacityManualExperiment = () => {
    if (activeFile.kind !== 'heatCapacity') return;
    const guideFileId = activeFile.id;
    const guideFileName = activeFile.name;
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityAutoDemoTimers({ cancelAnimation: true });
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearManualHeatCapacityGuidance();
    clearHeatCapacityGuideNextTrialReveal();
    setManualHeatCapacityActiveFileId(null);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    activateHeatCapacityManualExperiment(guideFileId, guideFileName);
    showHeatCapacityAutoDemoCompletionToast('正在启动引导模式', HEAT_CAPACITY_GUIDE_START_NOTICE_MS);
  };

  const startNextHeatCapacityManualTrial = () => {
    if (!activeFile || activeFile.kind !== 'heatCapacity') return;
    if (!guardManualHeatCapacityAction('startNextTrial')) return;
    const now = Date.now();
    clearHeatCapacityRecordSuccessToastTimers();
    clearManualHeatCapacityGuidance();
    clearHeatCapacityGuideNextTrialReveal();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const nextActiveTrialIndex = getHeatCapacityNextActiveTrialIndex(file.heatCapacityTrials);
      const resetFile = resetHeatCapacityForManualExperiment(file, now);
      return {
        ...resetFile,
        heatCapacityExpectedTrialCount: file.heatCapacityExpectedTrialCount,
        heatCapacityExpectedTrialCountMode: file.heatCapacityExpectedTrialCountMode,
        heatCapacityTrials: file.heatCapacityTrials,
        heatCapacityActiveTrialIndex: nextActiveTrialIndex,
        heatCapacityProcessingCalculated: false,
        heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
        heatCapacityProcessSamples: {},
        updatedAt: now,
      };
    });
    pushLog(`${activeFile.name}: heat-capacity guide trial advanced.`, 'success');
  };

  const exitHeatCapacityGuideMode = () => {
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearManualHeatCapacityGuidance();
    clearHeatCapacityGuideNextTrialReveal();
    setManualHeatCapacityActiveFileId(null);
    setManualHeatCapacityPulseActive(false);
    setManualHeatCapacityFocusControlId(null);
    setManualHeatCapacityRollback(null);
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? enterHeatCapacityFreeModeWorkbenchState(file, Date.now())
      : file);
    showHeatCapacityAutoDemoCompletionToast('引导模式已终止');
    pushLog(`${activeFile.name}: heat-capacity guide mode exited.`, 'warning');
  };

  const enterHeatCapacityFreeMode = () => {
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityAutoDemoTimers({ cancelAnimation: true });
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearManualHeatCapacityGuidance();
    clearHeatCapacityGuideNextTrialReveal();
    setManualHeatCapacityActiveFileId(null);
    setManualHeatCapacityRollback(null);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    setAutoDemoCompletionMessage(null);
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusModeRef.current = 'none';
    setHeatCapacityFocusMode('none');
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? enterHeatCapacityFreeModeWorkbenchState(file, Date.now())
      : file);
    pushLog(`${activeFile.name}: heat-capacity free mode active.`, 'info');
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
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityAutoDemoTimers({ cancelAnimation: true });
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearManualHeatCapacityGuidance();
    clearHeatCapacityGuideNextTrialReveal();
    setPendingRemoveHeatCapacityTrialRecord(null);
    setManualHeatCapacityActiveFileId(null);
    setManualHeatCapacityRollback(null);
    setAutoDemoCompletionMessage(null);
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusModeRef.current = 'none';
    setHeatCapacityFocusMode('none');
    captureUndoSnapshot('reset heat-capacity free run');
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? resetHeatCapacityFreeRunWorkbenchState(file, now)
      : file);
    pushLog(`${activeFile.name}: heat-capacity free run reset.`, 'warning');
  };

  const updateHeatCapacityStopcockOpen = (nextOpen: boolean, source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    const stopcockAngleDeg = getHeatCapacityStopcockTargetAngle(nextOpen);
    const stopcockAction = nextOpen ? 'openStopcock' : 'closeStopcock';
    if (!guardManualHeatCapacityAction(stopcockAction, source)) return;
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const wasOpen = getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open';
      const pressureReleaseBurstUntilMs = !wasOpen
        ? getHeatCapacityPressureReleaseBurstUntilMs(file, nextOpen, now)
        : file.pressureReleaseBurstUntilMs;
      const freeStopcockFlowPatch = file.heatCapacityMode === 'free'
        ? nextOpen
          ? {
              heatCapacityFreeStopcockFlowOpen: false,
              heatCapacityFreeStopcockPendingOpenAtMs: now + HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS,
            }
          : {
              heatCapacityFreeStopcockFlowOpen: false,
              heatCapacityFreeStopcockPendingOpenAtMs: null,
            }
        : {};
      const isManualReleaseClosure = source === 'user' &&
        !nextOpen &&
        manualHeatCapacityActiveFileId === file.id &&
        getHeatCapacityManualStep(file) === 'closeStopcockAfterReleaseRequired';
      const nextFile = stepHeatCapacityWorkbenchFile({
        ...file,
        stopcockAngleDeg,
        glassPistonState: nextOpen ? 'open' : 'closed',
        ...freeStopcockFlowPatch,
        pressureReleaseBurstUntilMs: nextOpen ? pressureReleaseBurstUntilMs : null,
        pressureDisplayNextJitterAtMs: pressureReleaseBurstUntilMs ? now : file.pressureDisplayNextJitterAtMs,
        updatedAt: now,
      }, now);
      return isManualReleaseClosure
        ? captureHeatCapacityWorkbenchSample(nextFile, 'releaseLowSample', now)
        : nextFile;
    });
  };

  const adjustHeatCapacityPressureZeroFineFromScene = (direction: number, source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    if (!guardManualHeatCapacityAction('adjustPressureZero', source)) return;
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      return adjustHeatCapacityPressureZeroFine(file, direction);
    });
  };

  const adjustHeatCapacityPressureZeroCoarseFromScene = (angleDeltaDeg: number, source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    if (!guardManualHeatCapacityAction('adjustPressureZero', source)) return;
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      return adjustHeatCapacityPressureZeroCoarse(file, angleDeltaDeg);
    });
  };

  const updateHeatCapacityPumpValve = (source: 'user' | 'autoDemo' = 'user') => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const nextAction = currentFile?.kind === 'heatCapacity' && currentFile.pumpValveOpen ? 'closePumpValve' : 'openPumpValve';
    if (!guardManualHeatCapacityAction(nextAction, source)) return;
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const pumpValveOpen = !file.pumpValveOpen;
      return {
        ...file,
        pumpValveOpen,
        pumpValveState: pumpValveOpen ? 'open' : 'closed',
        pumpHint: pumpValveOpen ? '打气阀门已打开' : '打气阀门已关闭',
        updatedAt: Date.now(),
      };
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

  const clearHeatCapacityAutoDemoTimers = (options: { cancelAnimation?: boolean } = {}) => {
    const { cancelAnimation = true } = options;
    heatCapacityAutoDemoTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityAutoDemoTimersRef.current = [];
    if (cancelAnimation && heatCapacityAutoDemoAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityAutoDemoAnimationFrameRef.current);
      heatCapacityAutoDemoAnimationFrameRef.current = null;
    }
  };

  const showHeatCapacityAutoDemoLockedToast = (message = '演示中无法操作') => {
    showHeatCapacityToast(message, 'warning');
  };

  const showHeatCapacityAutoDemoCompletionToast = (message = '演示完成', durationMs = 3000) => {
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
    setAutoDemoRunning(false);
    setAutoDemoPaused(false);
    setAutoDemoInteractionLocked(false);
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
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
    return getManualHeatCapacityThresholdPressureMv(projectedFile) >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV;
  };

  const pressHeatCapacityPumpBulb = (
    fileId = activeFileIdRef.current,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (isHeatCapacityUserInteractionLocked(source)) {
      showHeatCapacityAutoDemoLockedToast();
      return;
    }
    if (source !== 'autoDemo' && fileId === activeFileIdRef.current && !guardManualHeatCapacityAction('pumpBulb', source)) return;
    const now = Date.now();
    const fileBeforePump = filesRef.current.find((file) => file.id === fileId);
    const nextHeatCapacityFile = fileBeforePump?.kind === 'heatCapacity'
      ? registerHeatCapacityPumpStroke(fileBeforePump, now)
      : null;
    const pressureStatusBeforePump = fileBeforePump?.kind === 'heatCapacity'
      ? getHeatCapacityPressureSafetyStatusFromMv(getManualHeatCapacityThresholdPressureMv(fileBeforePump))
      : 'normal';
    if (
      source === 'autoDemo' &&
      nextHeatCapacityFile &&
      getManualHeatCapacityThresholdPressureMv(nextHeatCapacityFile) >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV
    ) {
      return;
    }
    if (source !== 'autoDemo' && fileBeforePump?.kind === 'heatCapacity') {
      const pressureBeforePumpMv = getManualHeatCapacityThresholdPressureMv(fileBeforePump);
      if (pressureBeforePumpMv >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV) {
        showHeatCapacityToast(HEAT_CAPACITY_PRESSURE_ALARM_MESSAGE, 'danger', {
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
        nextFrequencyState.timestamps.length > 0 &&
        nextFrequencyState.pumpFrequency > 0 &&
        nextFrequencyState.pumpFrequency < HEAT_CAPACITY_PUMP_RATE_SLOW_THRESHOLD_HZ
      ) {
        showHeatCapacityToast('打气太慢，请加快打气频率', 'warning');
      }
    }
    setHeatCapacityPumpPulseId((pulseId) => pulseId + 1);
    clearHeatCapacityPumpAnimationTimers();
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return nextHeatCapacityFile;
    });
    if (source !== 'autoDemo' && nextHeatCapacityFile) {
      const pressureAfterPumpMv = getManualHeatCapacityThresholdPressureMv(nextHeatCapacityFile);
      const pressureStatusAfterPump = getHeatCapacityPressureSafetyStatusFromMv(pressureAfterPumpMv);
      if (pressureStatusAfterPump === 'danger' && pressureStatusBeforePump !== 'danger') {
        showHeatCapacityPressureAlarm(nextHeatCapacityFile.id, nextHeatCapacityFile.name);
      } else if (pressureStatusAfterPump === 'warning') {
        showHeatCapacityToast(HEAT_CAPACITY_PRESSURE_WARNING_MESSAGE, 'warning', {
          interrupt: true,
          priority: HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,
          source: 'pressure-warning',
        });
      } else if (pressureStatusAfterPump === 'danger') {
        showHeatCapacityPressureThresholdToast(pressureAfterPumpMv);
      }
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
      const pressureReleaseBurstUntilMs = !wasOpen
        ? getHeatCapacityPressureReleaseBurstUntilMs(file, nextOpen, now)
        : file.pressureReleaseBurstUntilMs;
      const freeStopcockFlowPatch = file.heatCapacityMode === 'free'
        ? nextOpen
          ? {
              heatCapacityFreeStopcockFlowOpen: false,
              heatCapacityFreeStopcockPendingOpenAtMs: now + HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS,
            }
          : {
              heatCapacityFreeStopcockFlowOpen: false,
              heatCapacityFreeStopcockPendingOpenAtMs: null,
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

  const animateHeatCapacityPressureZero = (
    fileId: string,
    durationMs = 1200,
  ) => {
    if (heatCapacityAutoDemoAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityAutoDemoAnimationFrameRef.current);
      heatCapacityAutoDemoAnimationFrameRef.current = null;
    }
    const currentFile = filesRef.current.find((file) => file.id === fileId);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    const startKnobAngle = currentFile.pressureZeroKnobAngle;
    const targetOffset = -(
      currentFile.pressureSignalMvRaw + currentFile.pressureInitialBiasMv
    );
    const targetKnobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(targetOffset);
    const startTime = performance.now();
    const easeInOut = (value: number) => (
      value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2
    );

    const step = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      const eased = easeInOut(progress);
      const nextKnobAngle = startKnobAngle + (targetKnobAngle - startKnobAngle) * eased;
      const nextOffset = getHeatCapacityPressureZeroOffsetForKnobAngle(nextKnobAngle);
      updateFileById(fileId, (file) => {
        if (file.kind !== 'heatCapacity') return file;
        return setHeatCapacityPressureZeroOffset(file, nextOffset, 'fineWheel', nextKnobAngle, Date.now());
      });

      if (progress < 1) {
        heatCapacityAutoDemoAnimationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }
      heatCapacityAutoDemoAnimationFrameRef.current = null;
    };

    heatCapacityAutoDemoAnimationFrameRef.current = window.requestAnimationFrame(step);
  };

  const animateHeatCapacityDefaultReset = (
    fileId: string,
    durationMs = HEAT_CAPACITY_AUTO_DEMO_RESET_MS,
  ) => {
    if (heatCapacityAutoDemoAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityAutoDemoAnimationFrameRef.current);
      heatCapacityAutoDemoAnimationFrameRef.current = null;
    }
    const currentFile = filesRef.current.find((file) => file.id === fileId);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    const startStopcockAngle = currentFile.stopcockAngleDeg;
    const targetStopcockAngle = getHeatCapacityStopcockTargetAngle(false);
    const startZeroKnobAngle = currentFile.pressureZeroKnobAngle;
    const startTime = performance.now();
    const easeInOut = (value: number) => (
      value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2
    );

    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return {
        ...file,
        powerOn: false,
        runState: 'idle',
        pumpValveOpen: false,
        pumpValveState: 'closed',
        pumpBulbState: 'idle',
        pumpStrokeTimestamps: [],
        pumpFrequency: 0,
        pumpFrequencyStatus: 'idle',
        lastPumpTime: null,
        pumpHint: '系统正在自动恢复默认状态，稍后开始演示',
        updatedAt: Date.now(),
      };
    });

    const step = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      const eased = easeInOut(progress);
      const nextStopcockAngle = startStopcockAngle + (targetStopcockAngle - startStopcockAngle) * eased;
      const nextZeroKnobAngle = startZeroKnobAngle + (0 - startZeroKnobAngle) * eased;
      const nextZeroOffset = getHeatCapacityPressureZeroOffsetForKnobAngle(nextZeroKnobAngle);
      updateFileById(fileId, (file) => {
        if (file.kind !== 'heatCapacity') return file;
        return setHeatCapacityPressureZeroOffset({
          ...file,
          powerOn: false,
          runState: 'idle',
          glassPistonState: getHeatCapacityStopcockState(nextStopcockAngle),
          stopcockAngleDeg: progress >= 1 ? targetStopcockAngle : nextStopcockAngle,
          pumpValveOpen: false,
          pumpValveState: 'closed',
          pumpBulbState: 'idle',
        }, nextZeroOffset, progress >= 1 ? 'none' : 'fineWheel', nextZeroKnobAngle, Date.now());
      });

      if (progress < 1) {
        heatCapacityAutoDemoAnimationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }
      heatCapacityAutoDemoAnimationFrameRef.current = null;
    };

    heatCapacityAutoDemoAnimationFrameRef.current = window.requestAnimationFrame(step);
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
      animateHeatCapacityPressureZero(fileId, 1200);
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
      if (!isManualU0ZeroReady(latestFile)) {
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
        const sampledFile = captureHeatCapacityWorkbenchSample(file, sampleKey, now);
        if (sampleKey === 'stableBeforeReleaseSample') {
          const input = createHeatCapacityTrialRecordInput(sampledFile, now);
          const recordResult = recordHeatCapacityU1(sampledFile.heatCapacityTrials, input);
          return recordResult.ok
            ? {
                ...sampledFile,
                heatCapacityTrials: recordResult.trials,
                heatCapacityActiveTrialIndex: recordResult.nextActiveTrialIndex,
                heatCapacityProcessingCalculated: false,
                heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(sampledFile.theoreticalGamma),
              }
            : sampledFile;
        }
        if (sampleKey === 'recoverySample') {
          const input = createHeatCapacityTrialRecordInput(sampledFile, now);
          const recordResult = recordHeatCapacityU2(sampledFile.heatCapacityTrials, input);
          return recordResult.ok
            ? {
                ...sampledFile,
                heatCapacityTrials: recordResult.trials,
                heatCapacityActiveTrialIndex: recordResult.nextActiveTrialIndex,
                heatCapacityProcessingCalculated: false,
                heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(sampledFile.theoreticalGamma),
              }
            : sampledFile;
        }
        return sampledFile;
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
          pumpHint: '自动演示即将完成，过程采样已保留',
        };
      }

      if (action === 'markDemoComplete') {
        const completedFile = markHeatCapacityDemoComplete(file, now);
        const autoDemoTrial = createHeatCapacityTrialFromAutoDemoSamples(completedFile.heatCapacityProcessSamples, now);
        const autoDemoTrials = [autoDemoTrial];
        const processingResult = calculateHeatCapacityMeanResult(autoDemoTrials, {
          atmosphericPressureKPa: completedFile.ambientPressureKPa,
          pressureSensitivityMvPerKPa: completedFile.pressureSensitivityMvPerKPa,
          theoreticalGamma: completedFile.theoreticalGamma,
        });
        window.setTimeout(() => {
          pushLog(
            `${completedFile.name}: ${processingResult.status === 'ready' ? '自动演示数据已导入并完成计算。' : processingResult.message}`,
            processingResult.status === 'ready' ? 'success' : 'warning',
          );
        }, 0);
        const openHeatCapacityTabs = completedFile.openHeatCapacityTabs.includes('processing')
          ? completedFile.openHeatCapacityTabs
          : [...completedFile.openHeatCapacityTabs, 'processing' as const];
        return {
          ...completedFile,
          visiblePanels: Array.from(new Set([...completedFile.visiblePanels, 'heatCapacityProcessing' as const])),
          openHeatCapacityTabs,
          activeHeatCapacityTabId: 'processing',
          selectedHeatCapacityPanel: 'heatCapacityProcessing',
          heatCapacityMaterialsExpanded: true,
          heatCapacityExpectedTrialCount: 1,
          heatCapacityExpectedTrialCountMode: 'custom',
          heatCapacityTrials: autoDemoTrials,
          heatCapacityActiveTrialIndex: 0,
          heatCapacityProcessingCalculated: processingResult.calculated,
          heatCapacityProcessingResult: processingResult,
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
    setAutoDemoStepNote(step.note);
    const nextFocusControlId = focusControlId ?? step.targetControlId ?? null;
    setDemoFocusControlId(stage === 'highlight' ? nextFocusControlId : null);
    setDemoFocusPulseActive(stage === 'highlight' && Boolean(nextFocusControlId));
  };

  const finishHeatCapacityAutoDemoUi = (message = '演示完成') => {
    setAutoDemoInteractionLocked(false);
    setAutoDemoRunning(false);
    setAutoDemoPaused(false);
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    heatCapacityAutoDemoFileIdRef.current = null;
    heatCapacityAutoDemoPausedFileIdRef.current = null;
    heatCapacityAutoDemoPausedElapsedMsRef.current = 0;
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
          if (timelineItem.action.action === 'markDemoComplete') {
            setSelectedPanel('heatCapacityProcessing');
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
      clearHeatCapacityAutoDemoTimers({ cancelAnimation: false });
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
      pushLog(`${activeFile.name}: heat-capacity 自动演示已继续。`, 'success');
      return;
    }

    if (autoDemoRunning || activeFile.runState === 'running') {
      pushLog(`${activeFile.name}: 自动演示正在运行。`, 'warning');
      return;
    }

    clearHeatCapacityAutoDemoTimers();
    clearManualHeatCapacityGuidance();
    clearHeatCapacityGuideNextTrialReveal();
    setManualHeatCapacityActiveFileId(null);
    const demoFileId = activeFile.id;
    const steps = createHeatCapacityAutoDemoSteps();
    const timeline = getHeatCapacityAutoDemoTimeline(steps);
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusModeRef.current = 'none';
    setHeatCapacityFocusMode('none');
    heatCapacityAutoDemoPausedElapsedMsRef.current = 0;
    heatCapacityAutoDemoPausedFileIdRef.current = null;
    showHeatCapacityAutoDemoStepPanel();
    setAutoDemoRunning(true);
    setAutoDemoPaused(false);
    setAutoDemoInteractionLocked(true);
    setAutoDemoStepCount(steps.length);
    setAutoDemoStepIndex(0);
    setAutoDemoStepTitle('准备演示');
    setAutoDemoStepDescription('正在初始化自动演示');
    setAutoDemoStepTarget('自动演示准备');
    setAutoDemoStepNote('系统正在自动复位控件、视角和演示数据；完成后将从开启电源步骤开始。');
    clearHeatCapacityToastQueue();
    setAutoDemoCompletionMessage(null);
    setSelectedPanel('preview');
    showHeatCapacityAutoDemoCompletionToast('正在初始化自动演示', HEAT_CAPACITY_AUTO_DEMO_RESET_MS);
    animateHeatCapacityDefaultReset(demoFileId, HEAT_CAPACITY_AUTO_DEMO_RESET_MS);
    scheduleHeatCapacityAutoDemoTimeline(demoFileId, timeline, 0, HEAT_CAPACITY_AUTO_DEMO_RESET_MS);
    pushLog(`${activeFile.name}: heat-capacity 自动演示已启动。`, 'success');
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
    setParametersEditing(false);
    setParameterDraft({});
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
    pushLog(`Undo: ${snapshot.label}`, 'warning');
  };

  const redoLastEdit = () => {
    const snapshot = redoStack[redoStack.length - 1];
    if (!snapshot) return;

    const currentSnapshot = createEditSnapshot(snapshot.label);
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, currentSnapshot].slice(-EDIT_HISTORY_LIMIT));
    restoreSnapshot(snapshot);
    pushLog(`Redo: ${snapshot.label}`, 'success');
  };

  const clearEditHistory = () => {
    setUndoStack([]);
    setRedoStack([]);
    setOpenTopMenu(null);
    pushLog('Edit history cleared.', 'warning');
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
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = side === 'left' ? leftSidebarWidth : parameterSidebarWidth;

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      if (side === 'left') {
        setLeftSidebarWidth(clamp(startWidth + delta, LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX));
      } else {
        setParameterSidebarWidth(clamp(startWidth - delta, PARAM_SIDEBAR_MIN, PARAM_SIDEBAR_MAX));
      }
    };

    const handleUp = () => {
      document.body.classList.remove('studio-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    document.body.classList.add('studio-resizing');
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
    const startRatio = clamp(
      activeFile.heatCapacityTabContainerHeight || 0.5,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      HEAT_CAPACITY_MATERIALS_MAX_HEIGHT_RATIO,
    );
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = clamp(
        startRatio + deltaRatio,
        HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
        HEAT_CAPACITY_MATERIALS_MAX_HEIGHT_RATIO,
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

  const startLiveWorkspaceResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (isWorkbenchEmpty) return;
    const workspace = event.currentTarget.parentElement;
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

    const handleMove = (moveEvent: PointerEvent) => {
      const nextRatio = getNextRatio(moveEvent.clientX);
      updateActiveFile((file) => ({
        ...file,
        liveWorkspaceSplitRatio: nextRatio,
        updatedAt: Date.now(),
      }));
    };

    const handleUp = () => {
      setLiveWorkspaceResizing(false);
      document.body.classList.remove('studio-horizontal-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };

    setLiveWorkspaceResizing(true);
    document.body.classList.add('studio-horizontal-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const startConsoleResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (consoleCollapsed) return;
    event.preventDefault();
    event.stopPropagation();
    consoleResizeRef.current = {
      startY: event.clientY,
      startHeight: consoleHeightPx,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const resizeState = consoleResizeRef.current;
      if (!resizeState) return;
      const maxHeight = Math.max(180, Math.min(420, Math.round(window.innerHeight * 0.48)));
      const nextHeight = clamp(resizeState.startHeight + resizeState.startY - moveEvent.clientY, 96, maxHeight);
      setConsoleHeightPx(nextHeight);
    };

    const handleUp = () => {
      consoleResizeRef.current = null;
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const saveCurrentWorkbenchLayoutAsDefault = () => {
    if (isWorkbenchEmpty) {
      pushLog('Create or open a workbench file before saving layout defaults.', 'warning');
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
    pushLog(`Saved current ${activeFile.kind} workbench layout as the default.`, 'success');
  };

  const cancelRuntimeFrame = (fileId: string) => {
    const runtime = standardRuntimeRef.current[fileId] ?? idealRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId === null) return;

    window.clearTimeout(runtime.simulationTimerId);
    runtime.simulationTimerId = null;
  };

  const createStandardRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'standard') return null;

    return {
      engine: new PhysicsEngine(cloneParams(file.appliedParams)),
      frameCount: 0,
      simulationTimerId: null,
    };
  };

  const createIdealRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'ideal') return null;

    return {
      engine: new PhysicsEngine(cloneParams(file.activeParams)),
      frameCount: 0,
      simulationTimerId: null,
    };
  };

  const prepareReopenedWorkbenchFile = (file: WorkbenchFileState): WorkbenchFileState => {
    const baseFile = {
      ...file,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
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
        updatedAt: Date.now(),
      };
    });

    if (finished) {
      cancelRuntimeFrame(file.id);
      pushLog(`${file.name}: standard simulation finished and final chart data is ready.`, 'success');
      pushLog(`${file.name}: Results are ready. Open Results from the Panels list to review summary, data, and figures.`, 'success');
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
        pointsByRelation: nextPointsByRelation,
        verificationState,
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });

    cancelRuntimeFrame(file.id);
    pushLog(
      recordedPoint
        ? `${file.name}: recorded ${getRelationLabel(file.relation)} point at ${formatMetric(getRelationVariableNumericValue(file.relation, file.activeParams), 3)}.`
        : `${file.name}: ideal-gas run finished, but pressure summary was not ready for a point.`,
      recordedPoint ? 'success' : 'warning',
    );
  };

  const startParameterEdit = () => {
    if (parameterControlsLocked) {
      pushLog(`${activeFile.name}: pause the simulation before editing parameters.`, 'warning');
      return;
    }

    const draft = currentParameters.reduce<Record<string, string>>((nextDraft, param) => {
      if (param.editable) nextDraft[param.key] = param.value === '--' ? '' : param.value;
      return nextDraft;
    }, {});

    setParameterDraft(draft);
    setParameterErrors([]);
    setParametersEditing(true);
    pushLog(`${activeFile.name}: parameter edit mode opened.`);
  };

  const parseParameterDraft = (): SimulationParams | null => {
    const nextParams: SimulationParams = cloneParams(activeFile.params);

    for (const param of currentParameters) {
      if (!param.editable || param.key === 'relation') continue;
      const rawValue = parameterDraft[param.key] ?? param.value;
      const parsedValue = Number(rawValue);

      if (!Number.isFinite(parsedValue)) {
        setParameterErrors([`${param.label} must be a finite number.`]);
        pushLog(`${activeFile.name}: invalid parameter ${param.label}="${rawValue}".`, 'error');
        return null;
      }

      if (param.key === 'N') {
        nextParams.N = Math.round(parsedValue);
      } else if (param.key === 'L') {
        nextParams.L = parsedValue;
      } else if (param.key === 'r') {
        nextParams.r = parsedValue;
      } else if (param.key === 'm') {
        nextParams.m = parsedValue;
      } else if (param.key === 'k') {
        nextParams.k = parsedValue;
      } else if (param.key === 'dt') {
        nextParams.dt = parsedValue;
      } else if (param.key === 'nu') {
        nextParams.nu = parsedValue;
      } else if (param.key === 'equilibriumTime') {
        nextParams.equilibriumTime = parsedValue;
      } else if (param.key === 'statsDuration') {
        nextParams.statsDuration = parsedValue;
      } else if (param.key === 'targetTemperature') {
        nextParams.targetTemperature = parsedValue;
      }
    }

    const validation = validateWorkbenchParams(nextParams);
    if (!validation.valid) {
      setParameterErrors(validation.errors);
      validation.errors.forEach((error) => pushLog(`${activeFile.name}: ${error}`, 'error'));
      return null;
    }

    setParameterErrors([]);
    return nextParams;
  };

  const rejectLockedIdealControlledVariables = (nextParams: SimulationParams) => {
    const lockedKeys = getLockedIdealControlledVariableKeys(nextParams);
    if (lockedKeys.length === 0) return false;

    const message = `${activeFile.name}: controlled variables are locked while ${getRelationLabel(activeFile.relation)} data table has rows. Clear the table before changing ${lockedKeys.join(', ')}.`;
    setParameterErrors([message]);
    pushLog(message, 'warning');
    return true;
  };

  const saveParameterDraft = () => {
    if (parameterControlsLocked) {
      pushLog(`${activeFile.name}: pause the simulation before saving parameters.`, 'warning');
      return;
    }

    const nextParams = parseParameterDraft();
    if (!nextParams) return;
    if (rejectLockedIdealControlledVariables(nextParams)) return;

    applyActiveFileParams(nextParams);
  };

  const applyActiveFileParams = (
    paramsOverride?: SimulationParams,
    options: ApplyActiveFileParamsOptions = {},
  ): StandardEngineRuntime | null => {
    if (activeFile.runState === 'running') {
      if (!options.silent) pushLog(`${activeFile.name}: pause the simulation before applying saved parameters.`, 'warning');
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
      if (!options.silent) pushLog(`${activeFile.name}: ideal runtime is already applied for the saved parameters.`);
      return getIdealRuntime(activeFile);
    }

    if (activeFile.kind === 'standard' && !forceReset && !hasOverride && !parametersDirty) {
      if (!options.silent) pushLog(`${activeFile.name}: no saved parameter changes to apply.`);
      return getStandardRuntime(activeFile);
    }

    if (activeFile.kind === 'heatCapacity') {
      const validation = validateWorkbenchParams(nextParams);
      if (!validation.valid) {
        setParameterErrors(validation.errors);
        validation.errors.forEach((error) => pushLog(`${activeFile.name}: ${error}`, 'error'));
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
      setParametersEditing(false);
      setParameterDraft({});
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
      setParametersEditing(false);
      setParameterDraft({});
      setParameterErrors([]);
      if (!options.silent) pushLog(`${activeFile.name}: edited parameters match the applied runtime. No rebuild needed.`);
      return getStandardRuntime(activeFile);
    }

    if (activeFile.kind === 'ideal') {
      const validation = validateWorkbenchParams(nextParams);
      if (!validation.valid) {
        setParameterErrors(validation.errors);
        validation.errors.forEach((error) => pushLog(`${activeFile.name}: ${error}`, 'error'));
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
          pointsByRelation: nextPointsByRelation,
          verificationState: getIdealVerificationState(analysis),
          historyUnlocked: analysis.isVerified,
          updatedAt: Date.now(),
        };
      });
      setParametersEditing(false);
      setParameterDraft({});
      setParameterErrors([]);
      if (!options.silent) {
        pushLog(
          `${activeFile.name}: ideal runtime applied for ${getRelationLabel(activeFile.relation)}; changed keys: ${changedKeys.length > 0 ? changedKeys.join(', ') : 'none'}.`,
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
      updatedAt: Date.now(),
    }));
    setParametersEditing(false);
    setParameterDraft({});
    setParameterErrors([]);
    if (!options.silent) {
      pushLog(
        `${activeFile.name}: parameters ${hasOverride ? 'saved and applied' : 'applied'}; runtime rebuilt and ready to run.`,
        'success',
      );
    }
    return nextRuntime;
  };

  const prepareActiveFileForRun = (): boolean => {
    if (activeFile.runState === 'paused') return true;

    if (parametersEditing) {
      setParametersEditing(false);
      setParameterDraft({});
      setParameterErrors([]);
    }

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
      setParametersEditing(false);
      setParameterDraft({});
      setParameterErrors([]);
      setSamplingPresetMenuOpen(false);
      runHeatCapacityAutoDemo();
      return;
    }

    if (!prepareActiveFileForRun()) {
      return;
    }

    setParametersEditing(false);
    setParameterDraft({});
    setParameterErrors([]);
    setSamplingPresetMenuOpen(false);
    pauseRunningFilesExcept(activeFile.id);
    const runtime = activeFile.kind === 'standard'
      ? standardRuntimeRef.current[activeFile.id] ?? getStandardRuntime(activeFile)
      : idealRuntimeRef.current[activeFile.id] ?? getIdealRuntime(activeFile);
    if (!runtime) {
      pushLog(`${activeFile.name}: failed to create a ${activeFile.kind} simulation runtime.`, 'error');
      return;
    }

    updateActiveFile((file) => {
      const baseFile = {
        ...file,
        runState: 'running' as const,
        stats: runtime.engine.getStats(),
        chartData: runtime.engine.getHistogramData(false),
        particles: snapshotParticles(runtime.engine),
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
        ? `${activeFile.name}: standard simulation started with live 3D preview.`
        : `${activeFile.name}: ${getRelationLabel(activeFile.relation)} sample run started.`,
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
    clearHeatCapacityAutoDemoTimers({ cancelAnimation: false });
    setAutoDemoRunning(false);
    setAutoDemoPaused(true);
    setAutoDemoInteractionLocked(true);
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? { ...file, runState: 'paused', pumpHint: '自动演示已暂停', updatedAt: Date.now() }
      : file);
    showHeatCapacityAutoDemoLockedToast('演示已暂停');
    pushLog(`${activeFile.name}: heat-capacity 自动演示已暂停。`, 'warning');
  };

  const terminateHeatCapacityAutoDemo = () => {
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityAutoDemoUiState();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      return {
        ...markHeatCapacityDemoComplete(file, now),
        runState: 'idle',
        pumpHint: '自动演示已终止',
        updatedAt: now,
      };
    });
    setAutoDemoStepTitle('演示已终止');
    setAutoDemoStepDescription('自动演示已停止，当前曲线和读数保留。');
    setAutoDemoStepTarget('自动演示流程');
    setAutoDemoStepNote('用户交互已恢复，可重新开始或进入引导 / 自由操作。');
    hideHeatCapacityAutoDemoStepPanel();
    showHeatCapacityAutoDemoCompletionToast('演示已终止');
    pushLog(`${activeFile.name}: heat-capacity 自动演示已终止。`, 'warning');
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
    pushLog(`${activeFile.name}: ${activeFile.kind} simulation paused.`, 'warning');
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
          updatedAt: Date.now(),
        };
      });
      pushLog(`${activeFile.name}: standard simulation terminated and returned to its start state.`, 'warning');
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
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    pushLog(`${activeFile.name}: ideal-gas simulation terminated and returned to its start state.`, 'warning');
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
      updateActiveFile((file) => {
        if (file.kind !== 'heatCapacity') return file;
        return resetHeatCapacityForManualExperiment(file, Date.now());
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
          updatedAt: Date.now(),
        };
      });
      pushLog(`${activeFile.name}: standard runtime reset.`, 'warning');
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
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    pushLog(`${activeFile.name}: ideal runtime reset for ${getRelationLabel(activeFile.relation)}.`, 'warning');
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
    setParametersEditing(false);
    setParameterDraft({});
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenTopMenu(null);
    pushLog(workbenchCopy.logs.fileCreated(file.name), 'success');
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

  const getHeatCapacityTabDefinition = (tabId: WorkbenchHeatCapacityTabId) => {
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    return availablePanels.find((panel) => panel.key === panelKey) ?? availablePanels[0];
  };

  const getHeatCapacityTabState = (tabId: WorkbenchHeatCapacityTabId) => {
    if (activeFile.kind !== 'heatCapacity') return 'off';
    if (activeFile.activeHeatCapacityTabId === tabId && activeFile.openHeatCapacityTabs.includes(tabId)) return 'active';
    return activeFile.openHeatCapacityTabs.includes(tabId) ? 'open' : 'off';
  };

  const activateHeatCapacityTab = (tabId: WorkbenchHeatCapacityTabId) => {
    if (activeFile.kind !== 'heatCapacity' || !activeFile.openHeatCapacityTabs.includes(tabId)) return;
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    setSelectedPanel(panelKey);
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? { ...file, activeHeatCapacityTabId: tabId, selectedHeatCapacityPanel: panelKey, updatedAt: Date.now() }
        : file
    ));
  };

  const openHeatCapacityTab = (tabId: WorkbenchHeatCapacityTabId, recordUndo = true) => {
    if (activeFile.kind !== 'heatCapacity') return;
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
    captureUndoSnapshot('opened heat-capacity materials tabs');
    setSelectedPanel('heatCapacityGuide');
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const panelKeys = heatCapacityMaterialsTabOrder.map(heatCapacityTabIdToPanelKey);
      return {
        ...file,
        visiblePanels: Array.from(new Set([...file.visiblePanels, ...panelKeys])),
        openHeatCapacityTabs: [...heatCapacityMaterialsTabOrder],
        activeHeatCapacityTabId: 'guide',
        selectedHeatCapacityPanel: 'heatCapacityGuide',
        heatCapacityMaterialsExpanded: true,
        updatedAt: Date.now(),
      };
    });
  };

  const closeHeatCapacityTab = (tabId: WorkbenchHeatCapacityTabId, recordUndo = true) => {
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
    pushLog(`${activeFile.name}: opened panel ${panel}`);
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
    pushLog(`${activeFile.name}: closed panel ${panel}`);
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
                toggleWindowIdealResultTab(panel.key);
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
                toggleWindowStandardResultsTab(section.key);
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
      pushLog(`${activeFile.name}: pause the current ideal run before switching relation.`, 'warning');
      return;
    }
    if (activeFile.relation === nextRelation) {
      pushLog(`${activeFile.name}: ${getRelationLabel(nextRelation)} is already active.`);
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
    pushLog(`${activeFile.name}: switched to ${getRelationLabel(nextRelation)} relation.`, 'success');
  };

  const applyIdealSamplingPreset = (preset: IdealSamplingPreset) => {
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(`${activeFile.name}: pause the current ideal run before changing sampling preset.`, 'warning');
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
    const formatName = relationKey === 'N' ? 'positive integer' : 'decimal number';
    const decimals = getIdealScanDecimals(relation);

    if (!trimmedValue) {
      return { valid: false, message: `${String(relationKey)} requires a ${formatName}.` };
    }

    if (relationKey === 'N' && !integerPattern.test(trimmedValue)) {
      return { valid: false, message: 'N only supports positive integer input. N minimum step is 1.' };
    }

    if (relationKey !== 'N' && !decimalPattern.test(trimmedValue)) {
      return { valid: false, message: `${String(relationKey)} only supports ordinary decimal input.` };
    }

    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return { valid: false, message: `${String(relationKey)} must be greater than 0.` };
    }

    if (!isIdealScanValueOnStep(trimmedValue, relation)) {
      return {
        valid: false,
        message: `${getIdealScanInputLabel(relation)} minimum step is ${getIdealScanStepLabel(relation)}.`,
      };
    }

    if (parsedValue < scanMin || parsedValue > scanMax) {
      return {
        valid: false,
        message: `${String(relationKey)} must stay between ${formatMetric(scanMin, decimals)} and ${formatMetric(scanMax, decimals)}.`,
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

    if (!parsed.valid) {
      showScanInputError(parsed.message, { rawValue });
      return false;
    }

    clearScanInputError();
    return true;
  };

  const updateIdealScanVariable = (rawValue: number, options: UpdateIdealScanVariableOptions = {}) => {
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(`${activeFile.name}: pause the current ideal run before changing the scan variable.`, 'warning');
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
      setParameterErrors(validation.errors);
      validation.errors.forEach((error) => pushLog(`${activeFile.name}: ${error}`, 'error'));
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
    setParametersEditing(false);
    setParameterDraft({});
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

    if (!parsed.valid) {
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
      pushLog(`${activeFile.name}: click Confirm Remove to remove this ${getRelationLabel(point.relation)} point.`, 'warning');
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
    pushLog(`${activeFile.name}: ideal experiment point removed.`, 'warning');
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
      pushLog(`${activeFile.name}: ${getRelationLabel(activeFile.relation)} has no points to clear.`);
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
    const ownsManualGuide = manualHeatCapacityActiveFileId === fileId;
    if (!ownsAutoDemo && !ownsManualGuide && activeFileIdRef.current !== fileId) return;

    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityAutoDemoTimers({ cancelAnimation: true });
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearManualHeatCapacityGuidance();
    clearHeatCapacityGuideNextTrialReveal();
    setManualHeatCapacityActiveFileId(null);
    setManualHeatCapacityFocusControlId(null);
    setManualHeatCapacityPulseActive(false);
    setManualHeatCapacityRollback(null);
    setHeatCapacityFocusMode('none');
    heatCapacityFocusModeRef.current = 'none';
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
      setParameterDraft({});
      setParametersEditing(false);
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

    if (!isWorkbenchEmpty && activeFile.runState === 'running') {
      cancelRuntimeFrame(activeFile.id);
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
    setParametersEditing(false);
    setParameterDraft({});
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
    setParameterDraft({});
    setParametersEditing(false);
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
    if (file.id !== activeFile.id && activeFile.runState === 'running') {
      cancelRuntimeFrame(activeFile.id);
      updateFileById(activeFile.id, (currentFile) => ({
        ...currentFile,
        runState: 'paused',
        updatedAt: Date.now(),
      }));
      pushLog(workbenchCopy.logs.autoPausedSwitchFile(activeFile.name), 'warning');
    }

    setActiveFileId(file.id);
    activeFileIdRef.current = file.id;
    setSelectedPanel('preview');
    setParametersCollapsed(file.kind === 'heatCapacity');
    setParametersEditing(false);
    setParameterDraft({});
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
                  <span>{updateChecking ? workbenchCopy.about.checking : workbenchCopy.about.updateNotConfigured}</span>
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

            <section className="studio-settings-section">
              <div className="studio-settings-section-title">
                <strong>{workbenchCopy.settings.language}</strong>
                <span>{workbenchCopy.settings.languageHint}</span>
              </div>
              <div className={`studio-settings-language-select ${settingsLanguageMenuOpen ? 'studio-settings-language-select-open' : ''}`}>
                <button
                  type="button"
                  className="studio-settings-language-trigger"
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
                <div className="studio-settings-language-menu" role="listbox" aria-label={workbenchCopy.settings.language} aria-hidden={!settingsLanguageMenuOpen}>
                  {languageOptions.map((option) => (
                    <button
                      type="button"
                      key={option.key}
                      role="option"
                      aria-selected={settingsLanguagePreference === option.key}
                      tabIndex={settingsLanguageMenuOpen ? 0 : -1}
                      className={settingsLanguagePreference === option.key ? 'studio-settings-language-active' : ''}
                      onClick={() => updateSettingsLanguagePreference(option.key)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="studio-settings-section studio-settings-performance-row">
              <div className="studio-settings-section-title">
                <strong>{workbenchCopy.settings.performanceMode}</strong>
                <span>{workbenchCopy.settings.performanceModeHint}</span>
              </div>
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
            </section>

            <section className="studio-settings-section">
              <div className="studio-settings-shortcuts-card">
                <div className="studio-settings-shortcuts-copy">
                  <strong>{workbenchCopy.shortcuts.title}</strong>
                  <span>{workbenchCopy.shortcuts.hint}</span>
                </div>
                <div className="studio-settings-shortcuts-list" aria-label={workbenchCopy.shortcuts.title}>
                  <span><kbd>Ctrl+Z</kbd>{workbenchCopy.shortcuts.undo}</span>
                  <span><kbd>Ctrl+Y</kbd><kbd>Ctrl+Shift+Z</kbd>{workbenchCopy.shortcuts.redo}</span>
                  <span><kbd>Esc</kbd>{workbenchCopy.shortcuts.closeSettings}</span>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  };

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
      const openableClosedFiles = closedFiles.filter((file) => !files.some((openFile) => openFile.id === file.id));

      return (
        <div className="studio-command-menu studio-command-menu-new studio-command-menu-experiment-files" ref={topMenuRef} style={{ left: topMenuLeft }}>
          <div className="studio-command-submenu">
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
          <div className="studio-command-submenu">
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
                  <strong>{file.kind === 'standard' ? workbenchCopy.files.std : file.kind === 'ideal' ? workbenchCopy.files.ideal : workbenchCopy.files.heat}</strong>
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
                      toggleWindowPanel(panel.key);
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
          <button type="button" onClick={() => handleAction('Open user guide')}>
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

  const renderEmptyStudyActions = (className = 'studio-empty-actions') => (
    <div className={className}>
      <button type="button" onClick={() => createFile('ideal')}>
        <FlaskConical size={14} />
        {workbenchCopy.files.createIdeal}
      </button>
      <button type="button" onClick={() => createFile('heatCapacity')}>
        <Gauge size={14} />
        {workbenchCopy.files.createHeatCapacity}
      </button>
      <button type="button" onClick={() => createFile('standard')}>
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
      </div>
    </div>
  );

  const renderHeatCapacityStopcockMiniReadout = () => {
    if (activeFile.kind !== 'heatCapacity') return null;
    if (!(heatCapacityFocusMode === 'stopcock' && !autoDemoRunning && !autoDemoPaused && !autoDemoInteractionLocked)) {
      return null;
    }

    const temperatureReadout = activeFile.powerOn && typeof activeFile.temperatureSignalMv === 'number'
      ? `${formatMetric(activeFile.temperatureSignalMv, 1)} mV`
      : '--.- mV';
    const pressureReadout = activeFile.powerOn && typeof activeFile.pressureSignalMv === 'number'
      ? `${formatMetric(activeFile.pressureSignalMv, 1)} mV`
      : '--.- mV';
    const gaugeNeedleAngle = Number.isFinite(activeFile.pressureGaugeNeedleAngle)
      ? activeFile.pressureGaugeNeedleAngle
      : -120;
    const needleRadians = ((gaugeNeedleAngle - 90) * Math.PI) / 180;
    const needleX = 70 + Math.cos(needleRadians) * 40;
    const needleY = 70 + Math.sin(needleRadians) * 40;
    const tickAngles = [-120, -60, 0, 60, 120];
    const statusClass = activeFile.pressureSafetyStatus === 'danger'
      ? 'studio-heat-stopcock-mini-readout-danger'
      : activeFile.pressureSafetyStatus === 'warning'
        ? 'studio-heat-stopcock-mini-readout-warning'
        : 'studio-heat-stopcock-mini-readout-normal';
    const statusText = !activeFile.powerOn
      ? 'OFFLINE'
      : activeFile.pressureSafetyStatus === 'danger'
        ? 'LIMIT'
        : activeFile.pressureSafetyStatus === 'warning'
          ? 'WARN'
          : 'ONLINE';
    const gaugeStatusText = !activeFile.powerOn
      ? 'OFFLINE'
      : activeFile.pressureSafetyStatus === 'danger'
        ? 'LIMIT'
        : activeFile.pressureSafetyStatus === 'warning'
          ? 'WARN'
          : 'SAFE';

    return (
      <div
        className={`studio-heat-stopcock-mini-readout ${statusClass}`}
        data-heat-capacity-stopcock-mini-readout="true"
        aria-label={heatCapacityRealtimeCopy.stopcockMiniReadoutAria}
      >
        <div className="studio-heat-stopcock-mini-statusbar">
          <span>主机示数</span>
          <em>{statusText}</em>
        </div>
        <div className="studio-heat-stopcock-mini-readout-rows">
          <div className="studio-heat-stopcock-mini-readout-row">
            <span>{renderScientificText('Uₜ')}</span>
            <strong>{temperatureReadout.replace(' mV', '')}</strong>
            <em>mV</em>
          </div>
          <div className="studio-heat-stopcock-mini-readout-row">
            <span>{renderScientificText('Uₚ')}</span>
            <strong>{pressureReadout.replace(' mV', '')}</strong>
            <em>mV</em>
          </div>
        </div>
        <div className="studio-heat-stopcock-mini-gauge-wrap">
          <div className="studio-heat-stopcock-mini-gauge-label">
            <span>GAUGE kPa</span>
            <em>{gaugeStatusText}</em>
          </div>
          <svg className="studio-heat-stopcock-mini-gauge" viewBox="0 0 140 82" role="img" aria-label={heatCapacityRealtimeCopy.stopcockMiniGaugeAria}>
            <path className="studio-heat-stopcock-mini-gauge-safe" d="M 22 64 A 48 48 0 0 1 78 16" />
            <path className="studio-heat-stopcock-mini-gauge-warn" d="M 78 16 A 48 48 0 0 1 106 32" />
            <path className="studio-heat-stopcock-mini-gauge-danger" d="M 106 32 A 48 48 0 0 1 118 64" />
            {tickAngles.map((angle) => {
              const tickRadians = ((angle - 90) * Math.PI) / 180;
              const outerX = 70 + Math.cos(tickRadians) * 49;
              const outerY = 64 + Math.sin(tickRadians) * 49;
              const innerX = 70 + Math.cos(tickRadians) * 44;
              const innerY = 64 + Math.sin(tickRadians) * 44;
              return (
                <line
                  key={angle}
                  className="studio-heat-stopcock-mini-gauge-tick"
                  x1={innerX}
                  y1={innerY}
                  x2={outerX}
                  y2={outerY}
                />
              );
            })}
            <line
              className="studio-heat-stopcock-mini-gauge-needle"
              x1="70"
              y1="64"
              x2={needleX}
              y2={needleY - 6}
            />
            <circle className="studio-heat-stopcock-mini-gauge-hub" cx="70" cy="64" r="4.5" />
          </svg>
        </div>
      </div>
    );
  };

  const renderHeatCapacityModeControl = () => {
    if (activeFile.kind !== 'heatCapacity') return null;
    const heatCapacityActiveMode: HeatCapacityMode = activeFile.heatCapacityMode;
    const heatCapacityGuideNextTrialKey = getHeatCapacityGuideNextTrialKey(activeFile);
    const heatCapacityShowNextTrialAction = heatCapacityActiveMode === 'guide'
      && activeHeatCapacityManualStep === 'nextTrialRequired'
      && heatCapacityGuideNextTrialReadyKey === heatCapacityGuideNextTrialKey;
    const heatCapacityDemoActionsVisible = heatCapacityActiveMode === 'demo'
      && (autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked);
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
              if (heatCapacityActiveMode !== 'demo') runHeatCapacityAutoDemo();
            }}
          >
            {heatCapacityRealtimeCopy.modeDemo}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-demo" aria-hidden={!heatCapacityDemoActionsVisible}>
            {heatCapacityDemoActionsVisible ? (
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
              if (heatCapacityActiveMode !== 'guide') startHeatCapacityManualExperiment();
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
                  data-heat-capacity-mode-action="exit-guide"
                  title={heatCapacityRealtimeCopy.exitGuideMode}
                  aria-label={heatCapacityRealtimeCopy.exitGuideMode}
                  onClick={exitHeatCapacityGuideMode}
                >
                  <Square size={12} strokeWidth={2.8} />
                </button>
                {heatCapacityShowNextTrialAction ? (
                  <button
                    type="button"
                    className="studio-heat-mode-action studio-heat-mode-action-next-trial"
                    data-heat-capacity-mode-action="next-trial"
                    onClick={startNextHeatCapacityManualTrial}
                  >
                    {heatCapacityRealtimeCopy.nextTrialAction}
                  </button>
                ) : null}
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
              if (heatCapacityActiveMode !== 'free') enterHeatCapacityFreeMode();
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
            onMouseDownCapture={(event) => {
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
              const activeHeatCapacityDisplay = selectActiveHeatCapacityWorkbenchDisplay(activeFile);
              const heatCapacityTopLeftOverlay = renderHeatCapacityStopcockMiniReadout();
              const heatCapacityDemoStepPanel = autoDemoStepPanelMode !== 'hidden' && (autoDemoRunning || autoDemoPaused || autoDemoStepTitle) ? (
                <div
                  className={`studio-heat-demo-step-panel studio-heat-demo-step-panel-${autoDemoStepPanelMode}`}
                  data-heat-capacity-demo-step-panel="true"
                >
                  <div className="studio-heat-demo-step-kicker">
                    <span>{autoDemoRunning || autoDemoPaused ? `Step ${autoDemoStepIndex} / ${autoDemoStepCount}` : heatCapacityRealtimeCopy.demoCompleteLabel}</span>
                    <i>{autoDemoPaused ? heatCapacityRealtimeCopy.demoPausedLabel : autoDemoRunning ? heatCapacityRealtimeCopy.demoRunning : heatCapacityRealtimeCopy.demoDoneLabel}</i>
                  </div>
                  <strong>{renderScientificText(autoDemoStepTitle || heatCapacityRealtimeCopy.demoCompleteTitle)}</strong>
                  <p>{renderScientificText(autoDemoStepDescription || heatCapacityRealtimeCopy.demoCompleteDescription)}</p>
                  <div><span>{heatCapacityRealtimeCopy.demoTargetLabel}</span><em>{renderScientificText(autoDemoStepTarget || '--')}</em></div>
                  <div><span>{heatCapacityRealtimeCopy.demoObservationLabel}</span><em>{renderScientificText(autoDemoStepNote || heatCapacityRealtimeCopy.demoFallbackNote)}</em></div>
                </div>
              ) : null;
              const heatCapacityTopRightOverlay = heatCapacityDemoStepPanel ? (
                <div className="studio-heat-top-right-stack" data-heat-capacity-top-right-stack="true">
                  {heatCapacityDemoStepPanel}
                </div>
              ) : null;
              const heatCapacityBottomRightOverlay = (
                <div className="studio-heat-preview-control-stack" data-heat-capacity-preview-control-stack="true">
                  {activeFile.heatCapacityMode === 'free' ? (
                    <div
                      className="studio-heat-record-controls studio-heat-free-record-controls"
                      data-heat-capacity-free-record-controls="true"
                    >
                      <button type="button" onClick={() => recordFreeHeatCapacitySample('u0')}>
                        {renderScientificText('记录 U₀')}
                      </button>
                      <button type="button" onClick={() => recordFreeHeatCapacitySample('u1')}>
                        {renderScientificText('记录 U₁')}
                      </button>
                      <button type="button" onClick={() => recordFreeHeatCapacitySample('u2')}>
                        {renderScientificText('记录 U₂')}
                      </button>
                    </div>
                  ) : null}
                  {(() => {
                    const manualStep = getHeatCapacityManualStep(activeFile);
                    const activeRecordKind = manualHeatCapacityActiveFileId === activeFile.id && !autoDemoRunning && !autoDemoInteractionLocked
                      ? manualStep === 'recordU0Required'
                        ? 'u0'
                        : manualStep === 'recordU1Required'
                          ? 'u1'
                          : manualStep === 'recordU2Required'
                            ? 'u2'
                            : null
                      : null;
                    const visibleRecordKind = activeRecordKind ?? heatCapacityRecordControlsClosing;
                    if (!visibleRecordKind) return null;
                    const label = visibleRecordKind === 'u0'
                      ? heatCapacityRealtimeCopy.recordU0
                      : visibleRecordKind === 'u1'
                        ? heatCapacityRealtimeCopy.recordU1
                        : heatCapacityRealtimeCopy.recordU2;
                    return (
                      <div
                        className={`studio-heat-record-controls ${manualHeatCapacityPulseActive && manualHeatCapacityFocusControlId?.startsWith('record') ? 'studio-heat-record-controls-pulse' : ''} ${!activeRecordKind ? 'studio-heat-record-controls-exiting' : ''}`}
                        data-heat-capacity-record-controls="true"
                      >
                        <button type="button" disabled={!activeRecordKind} onClick={() => recordHeatCapacityManualSample(visibleRecordKind)}>
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
                      <strong>{heatCapacityRealtimeCopy.pressureWarningTitle}</strong>
                      <span>{heatCapacityRealtimeCopy.pressureWarningFallback}</span>
                      <em>{heatCapacityRealtimeCopy.pressureWarningObserve}</em>
                    </div>
                  ) : null}
                  {autoDemoCompletionMessage ? (
                    <div className="studio-heat-demo-complete-toast" data-heat-capacity-demo-complete-toast="true">
                      <span className="studio-heat-toast-kicker">SYSTEM</span>
                      <strong>{autoDemoCompletionMessage}</strong>
                    </div>
                  ) : null}
                </>
              );
              const heatCapacityBottomCenterOverlay = heatCapacityToastCurrent ? (
                <div
                  key={heatCapacityToastCurrent.id}
                  className={`studio-heat-manual-step-hint studio-heat-manual-step-hint-${heatCapacityToastCurrent.level}`}
                  data-heat-capacity-manual-step-hint="true"
                  data-heat-capacity-toast="true"
                  data-heat-capacity-toast-level={heatCapacityToastCurrent.level}
                >
                  <span className="studio-heat-toast-kicker">{heatCapacityToastCurrent.level}</span>
                  <strong>{renderScientificText(heatCapacityToastCurrent.text)}</strong>
                </div>
              ) : null;
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
                  pressureRawPlaceholder={activeFile.pressureRawPlaceholder}
                  pressureDisplayedPlaceholder={activeFile.pressureDisplayedPlaceholder}
                  pressureGaugeDisplayValue={activeFile.pressureGaugeDisplayValue}
                  gaugePressureMinKPa={activeFile.gaugePressureMinKPa}
                  gaugePressureMaxKPa={activeFile.gaugePressureMaxKPa}
                  pressureSafetyThresholdKPa={activeFile.pressureSafetyThresholdKPa}
                  pressureOverLimit={activeFile.pressureOverLimit}
                  pressureZeroAdjustMode={activeFile.pressureZeroAdjustMode}
                  pressureKPa={activeFile.pressureKPa}
                  pressureDeltaKPa={activeFile.pressureDeltaKPa}
                  pressureLimitKPa={activeFile.pressureLimitKPa}
                  pumpValveOpen={activeFile.pumpValveOpen}
                  pumpValveState={activeFile.pumpValveState}
                  pumpBulbState={activeFile.pumpBulbState}
                  pumpPulseId={heatCapacityPumpPulseId}
                  pumpFrequency={activeFile.pumpFrequency}
                  pumpFrequencyStatus={activeFile.pumpFrequencyStatus}
                  pumpHint={activeFile.pumpHint}
                  pressurePlaceholder={activeFile.pressurePlaceholder}
                  temperaturePlaceholder={activeFile.temperaturePlaceholder}
                  phase={activeFile.heatCapacityPhase}
                  temperatureSignalMv={activeFile.powerOn ? activeHeatCapacityDisplay.temperatureMv : null}
                  pressureSignalMv={activeFile.powerOn ? activeHeatCapacityDisplay.pressureMv : null}
                  pressureReleaseBurstActive={typeof activeFile.pressureReleaseBurstUntilMs === 'number' && Date.now() <= activeFile.pressureReleaseBurstUntilMs}
                  hardSphereViewEnabled={activeFile.hardSphereViewEnabled}
                  hardSphereParticleMultiplier={activeFile.hardSphereParticleMultiplier}
                  hardSphereSpeedMultiplier={activeFile.hardSphereSpeedMultiplier}
                  interactionLocked={autoDemoInteractionLocked}
                  demoFocusControlId={manualHeatCapacityFocusControlId ?? demoFocusControlId}
                  demoFocusPulseActive={demoFocusPulseActive || manualHeatCapacityPulseActive}
                  manualRollbackAnimation={manualHeatCapacityRollback?.animation ?? null}
                  manualRollbackKey={manualHeatCapacityRollback?.key ?? 0}
                  focusResetKey={heatCapacityFocusResetKey}
                  overlayTopLeft={heatCapacityTopLeftOverlay}
                  overlayTopRight={heatCapacityTopRightOverlay}
                  overlayBottomRight={heatCapacityBottomRightOverlay}
                  overlayCenter={heatCapacityCenterOverlay}
                  overlayBottomCenter={heatCapacityBottomCenterOverlay}
                  onFocusModeChange={(mode) => {
                    heatCapacityFocusModeRef.current = mode;
                    setHeatCapacityFocusMode(mode);
                  }}
                  onLockedInteraction={showHeatCapacityAutoDemoLockedToast}
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
            <div className="studio-live-chart-empty">Run the standard simulation to populate realtime chart data.</div>
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
      if (phase === 'demoComplete') return heatCapacityRealtimeCopy.phaseLabels.demoComplete;
      return heatCapacityRealtimeCopy.phaseLabels.fallback;
    };
    const phaseLabel = getHeatCapacityPhaseLabel(activeFile.heatCapacityPhase);
    const stopcockState = getHeatCapacityStopcockState(activeFile.stopcockAngleDeg);
    const stopcockStateLabel = stopcockState === 'open' ? heatCapacityRealtimeCopy.stopcock.open : heatCapacityRealtimeCopy.stopcock.closed;
    const currentTrialIndex = getHeatCapacityNextActiveTrialIndex(activeFile.heatCapacityTrials) + 1;
    const heatCapacityHeaderBadges = [
      {
        key: 'stage',
        label: `${heatCapacityRealtimeCopy.stagePrefix}${phaseLabel}`,
        className: 'studio-heat-status-badge-stage',
      },
      {
        key: 'trial',
        label: heatCapacityRealtimeCopy.trialBadge(currentTrialIndex),
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
      ? formatMetric(activeFile.temperatureSignalMv, 2)
      : '--.--';
    const pressureSignalValue = activeFile.powerOn && typeof activeFile.pressureSignalMv === 'number'
      ? formatMetric(activeFile.pressureSignalMv, 2)
      : '--.--';
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
      if (activeFile.heatCapacityPhase === 'demoComplete') return heatCapacityRealtimeCopy.hints.demoComplete;
      if (!activeFile.powerOn || activeFile.heatCapacityPhase === 'powerOff') return heatCapacityRealtimeCopy.hints.powerOff;
      if (activeFile.heatCapacityPhase === 'readyToZero') return heatCapacityRealtimeCopy.hints.readyToZero;
      if (activeFile.heatCapacityPhase === 'zeroed' || activeFile.heatCapacityPhase === 'readyToPump') return heatCapacityRealtimeCopy.hints.readyToPump;
      if (activeFile.heatCapacityPhase === 'pumping') return heatCapacityRealtimeCopy.hints.pumping;
      if (activeFile.heatCapacityPhase === 'sealedStabilizing') return heatCapacityRealtimeCopy.hints.sealedStabilizing;
      if (activeFile.heatCapacityPhase === 'releasing') return heatCapacityRealtimeCopy.hints.releasing;
      if (activeFile.heatCapacityPhase === 'recovering') return heatCapacityRealtimeCopy.hints.recovering;
      return activeFile.pumpHint || heatCapacityRealtimeCopy.hints.fallback;
    })();
    return (
      <div className="studio-realtime-panel studio-realtime-panel-heat">
        <div className="studio-heat-monitor-header" data-heat-capacity-realtime-header="true">
          <div>
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
  const currentResultsReady = activeFile.kind === 'ideal'
    ? idealPointCount > 0
    : resultSummary.ready;
  const isExportModeDataReady = (mode: WorkbenchExportMode) => (
    activeFile.kind === 'ideal'
      ? mode === 'pointsCsv'
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
        defaultDirName: `${activeFile.name} Export`,
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

  const renderFinalFigurePreview = (figureId: string) => {
    if (!resultSummary.ready || !activeFile.finalChartData) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.notReadyPreview}</div>;
    }

    if (figureId === 'temperature-error' || figureId === 'total-energy') {
      const history = activeFile.finalChartData.tempHistory;
      const values = history.map((point) => (figureId === 'temperature-error' ? Math.abs(point.error) : point.totalEnergy));
      const maxValue = Math.max(0.0001, ...values.map((value) => Math.abs(value)));
      return (
        <div className="studio-final-line">
          {values.slice(0, 54).map((value, index) => (
            <span key={`${figureId}-${index}`} style={{ height: `${Math.max(3, (Math.abs(value) / maxValue) * 100)}%` }} />
          ))}
        </div>
      );
    }

    const bins = figureId === 'speed-distribution'
      ? activeFile.finalChartData.speed
      : activeFile.finalChartData.energy;
    const compactBins = getCompactHistogramBins(bins, 30);
    const maxProbability = Math.max(0.0001, ...compactBins.map((bin) => bin.probability));

    return (
      <div className="studio-final-bars">
        {compactBins.map((bin, index) => (
          <span key={`${figureId}-${index}`} style={{ height: `${Math.max(3, (bin.probability / maxProbability) * 100)}%` }} />
        ))}
      </div>
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
            <strong>Figure data</strong>
            <span>prepared for desktop scientific export</span>
          </div>
          {figureSpecs.map((figure) => (
            <div className="studio-figure-row" key={figure.id}>
              <div>
                <strong>{figure.title}</strong>
                <small>{figure.recommendedFilename}</small>
              </div>
              <span>{figure.dataCount}</span>
              <em className={`studio-figure-status-${figure.status}`}>{figure.status}</em>
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
                {getRelationLabel(activeFile.relation)} / {workbenchCopy.results.recordedPoints(idealAnalysis.sortedPoints.length)} / {getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy)}
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
              {activeFile.kind === 'ideal'
                ? (currentResultsReady ? workbenchCopy.results.resultsReady(getRelationLabel(activeFile.relation)) : workbenchCopy.results.waitingForRecordedPoints(getRelationLabel(activeFile.relation)))
                : resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}
            </span>
          </div>
          <div className="studio-results-actions">
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
    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel.key)) {
      return (
        <HeatCapacityLeftPanel
          file={activeFile}
          language={settingsLanguagePreference}
          panelKey={panel.key}
          onExpectedTrialCountChange={setHeatCapacityExpectedTrialCount}
          onCalculateResults={calculateHeatCapacityProcessingResults}
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
          {renderPanelContent(activePanel)}
        </section>
      </div>
    );
  };

  const renderHeatCapacityMaterialsWindow = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.openHeatCapacityTabs.length === 0) return null;
    const openTabs = activeFile.openHeatCapacityTabs
      .map((tabId) => {
        const panel = getHeatCapacityTabDefinition(tabId);
        return panel ? { tabId, panel } : null;
      })
      .filter((item): item is { tabId: WorkbenchHeatCapacityTabId; panel: PanelDefinition } => item !== null);
    if (openTabs.length === 0) return null;
    const activeTabId = activeFile.activeHeatCapacityTabId && activeFile.openHeatCapacityTabs.includes(activeFile.activeHeatCapacityTabId)
      ? activeFile.activeHeatCapacityTabId
      : openTabs[0].tabId;
    const activePanel = openTabs.find((item) => item.tabId === activeTabId)?.panel ?? openTabs[0].panel;
    const materialsHeightRatio = clamp(
      activeFile.heatCapacityTabContainerHeight || 0.5,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      HEAT_CAPACITY_MATERIALS_MAX_HEIGHT_RATIO,
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
          {renderPanelContent(activePanel)}
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

  const renderSectionTitle = (label: string, collapsed: boolean, onToggle: () => void) => (
    <button
      type="button"
      className={`studio-tree-title-button ${collapsed ? 'studio-tree-title-collapsed' : ''}`}
      onClick={onToggle}
      aria-expanded={!collapsed}
    >
      <span className="studio-tree-folder-icon">
        <Folder size={14} className="studio-folder-closed" />
        <FolderOpen size={14} className="studio-folder-open" />
      </span>
      <span>{label}</span>
    </button>
  );

  const renderHeatCapacityPanelTree = () => {
    const previewPanel = availablePanels.find((panel) => panel.key === 'preview');
    const realtimePanel = availablePanels.find((panel) => panel.key === 'realtime');
    const materialPanels = heatCapacityMaterialsTabOrder
      .map((tabId) => ({ tabId, panel: availablePanels.find((panel) => panel.key === heatCapacityTabIdToPanelKey(tabId)) }))
      .filter((item): item is { tabId: WorkbenchHeatCapacityTabId; panel: PanelDefinition } => Boolean(item.panel));
    const materialsActive = activeFile.kind === 'heatCapacity' && (
      materialPanels.some(({ panel }) => selectedPanel === panel.key) ||
      materialPanels.some(({ tabId }) => activeFile.activeHeatCapacityTabId === tabId)
    );
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
              className={`studio-tree-row studio-tree-row-child ${selectedPanel === panel.key ? 'studio-tree-row-active' : ''}`}
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
          className={`studio-tree-row studio-tree-row-child studio-heat-materials-group ${materialsActive ? 'studio-tree-row-active' : ''}`}
          onClick={() => {
            if (panelsSectionCollapsed) return;
            setSelectedPanel('heatCapacityGuide');
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            openAllHeatCapacityMaterialsTabs();
          }}
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
            <span className="studio-tree-folder-icon">
              <Folder size={14} className="studio-folder-closed" />
              <FolderOpen size={14} className="studio-folder-open" />
            </span>
          </button>
          <span
            className="studio-results-folder-label"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedPanel('heatCapacityGuide');
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openAllHeatCapacityMaterialsTabs();
            }}
          >
            {heatCapacityRealtimeCopy.materialsTitle}
          </span>
          <span className="studio-tree-meta">{materialsActive ? workbenchCopy.files.active : workbenchCopy.files.off}</span>
        </div>
        {activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMaterialsExpanded ? (
          <div className="studio-results-nav studio-heat-materials-nav">
            {materialPanels.map(({ tabId, panel }) => {
              const state = getHeatCapacityTabState(tabId);
              return (
                <button
                  type="button"
                  key={tabId}
                  className={state === 'active' || selectedPanel === panel.key ? 'studio-results-nav-active' : ''}
                  tabIndex={panelsSectionCollapsed ? -1 : 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPanel(panel.key);
                    if (state !== 'off') activateHeatCapacityTab(tabId);
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

  const resolvedWorkbenchTheme = settingsThemePreference === 'system' ? 'dark' : settingsThemePreference;

  return (
    <div className={`studio-workbench studio-theme-${resolvedWorkbenchTheme}`} data-workbench-language={settingsLanguagePreference}>
      {scanInputToast ? (
        <div className="studio-scan-input-toast" role="status">
          {scanInputToast}
        </div>
      ) : null}
      <div className={`studio-shell ${consoleCollapsed ? 'studio-shell-console-collapsed' : ''}`} style={shellStyle}>
        <header className="studio-menu">
          <nav className="studio-top-commands" aria-label={workbenchCopy.menus.topCommandsAria} ref={topCommandsRef}>
            {renderTopCommand('new', workbenchCopy.menus.experimentFiles, <FilePlus2 size={14} />)}
            {renderTopCommand('edit', workbenchCopy.menus.edit, <Undo2 size={14} />)}
            {renderTopCommand('window', workbenchCopy.menus.window, <Wrench size={14} />)}
            {renderTopCommand('settings', workbenchCopy.menus.settings, <Settings size={14} />)}
            {renderTopCommand('help', workbenchCopy.menus.help, <BookOpen size={14} />)}
          </nav>
          {renderTopMenu()}
        </header>
        {renderAboutWindow()}
        {renderGeneralSettingsWindow()}

        <main className={`studio-body ${leftCollapsed ? 'studio-left-collapsed' : ''}`} style={workbenchStyle}>
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
                      <strong>{workbenchCopy.files.noOpenFiles}</strong>
                      <span>{workbenchCopy.files.emptyHint}</span>
                      {renderEmptyStudyActions('studio-empty-file-actions')}
                    </div>
                  ) : files.map((file) => {
                    const isRenaming = renamingFileId === file.id;
                    const menuOpen = openFileMenuId === file.id;
                    const pendingDelete = pendingDeleteFileId === file.id;

                    return (
                      <div
                        role="button"
                        tabIndex={filesSectionCollapsed ? -1 : 0}
                        key={file.id}
                        className={`studio-tree-row studio-file-row ${file.id === activeFile.id ? 'studio-tree-row-active' : ''} ${menuOpen ? 'studio-file-row-menu-open' : ''} ${isRenaming ? 'studio-file-row-renaming' : ''}`}
                        onClick={() => {
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
                        <span className="studio-tree-meta">{file.kind}</span>
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
                {renderSectionTitle(isWorkbenchEmpty ? `${workbenchCopy.files.noOpenFiles} / ${workbenchCopy.files.panels}` : activeFile.kind === 'heatCapacity' ? `${activeFile.name.toUpperCase()} / PANELS` : `${activeFile.name} / ${workbenchCopy.files.panels}`, panelsSectionCollapsed, () => setPanelsSectionCollapsed((current) => !current))}
                <div className={`studio-tree-section-content ${panelsSectionCollapsed ? 'studio-tree-section-content-collapsed' : ''}`} aria-hidden={panelsSectionCollapsed}>
                {isWorkbenchEmpty ? (
                  <div className="studio-empty-panel-tree">
                    <span>{workbenchCopy.files.emptyHint}</span>
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
                        className={`studio-tree-row studio-tree-row-child ${selectedPanel === panel.key ? 'studio-tree-row-active' : ''}`}
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
                            <span className="studio-tree-folder-icon">
                              <Folder size={14} className="studio-folder-closed" />
                              <FolderOpen size={14} className="studio-folder-open" />
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
                              className={selectedPanel === childPanel.key ? 'studio-results-nav-active' : ''}
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
                              className={getStandardResultsTabState(section.key) === 'active' && selectedPanel === 'results' ? 'studio-results-nav-active' : ''}
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
                  className={`studio-file-tab ${file.id === activeFile.id ? 'studio-file-tab-active' : ''}`}
                >
                  <button
                    type="button"
                    className="studio-file-tab-select"
                    onClick={() => selectFile(file)}
                  >
                    {file.kind === 'standard' ? <Activity size={13} /> : file.kind === 'ideal' ? <FlaskConical size={13} /> : <Gauge size={13} />}
                    <span>{file.name}</span>
                    <span className="studio-file-kind">{file.kind === 'standard' ? workbenchCopy.files.std : file.kind === 'ideal' ? workbenchCopy.files.ideal : workbenchCopy.files.heat}</span>
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

            <div className={`studio-workspace-shell ${isWorkbenchEmpty ? 'studio-workspace-shell-empty' : 'studio-workspace-shell-active'} ${!isWorkbenchEmpty && parametersCollapsed ? 'studio-params-collapsed' : ''}`}>
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
                    >
                      {primaryPanels[0] ? renderDockPanel(primaryPanels[0]) : null}
                      <button
                        type="button"
                        className="studio-live-workspace-resizer"
                        aria-label={workbenchCopy.panels.liveWorkspaceResizeAria}
                        onPointerDown={startLiveWorkspaceResize}
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
                className={`studio-current-params ${parameterControlsLocked ? 'studio-current-params-locked' : ''}`}
                aria-label={workbenchCopy.parameters.title}
                aria-disabled={parameterControlsLocked}
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
                    <small>{parameterControlsLocked ? workbenchCopy.parameters.lockedUntilStopped : parametersEditing ? workbenchCopy.parameters.editValues : workbenchCopy.parameters.currentFileValues}</small>
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
                  {activeFile.kind === 'heatCapacity' ? (
                    <>
                      <div className="studio-panel-note">{workbenchCopy.parameters.heatCapacityReadonlyNote}</div>
                      <section className="studio-heat-visual-params" data-heat-capacity-hard-sphere-params="true">
                        <div className="studio-heat-visual-params-header">
                          <div>
                            <strong>{workbenchCopy.parameters.microscopicVisualization}</strong>
                            <span>{workbenchCopy.parameters.hardSphereTeachingOnly}</span>
                          </div>
                          <button
                            type="button"
                            className={`studio-heat-visual-switch ${activeFile.hardSphereViewEnabled ? 'studio-heat-visual-switch-on' : ''}`}
                            data-heat-capacity-hard-sphere-sidebar-toggle="true"
                            aria-pressed={activeFile.hardSphereViewEnabled}
                            onClick={toggleHeatCapacityHardSphereView}
                          >
                            <span>{workbenchCopy.parameters.hardSphereView}</span>
                            <strong>{activeFile.hardSphereViewEnabled ? workbenchCopy.parameters.hardSphereOn : workbenchCopy.parameters.hardSphereOff}</strong>
                          </button>
                        </div>
                        <label className="studio-heat-visual-slider">
                          <span>{workbenchCopy.parameters.hardSphereParticleMultiplier}</span>
                          <input
                            type="range"
                            min="0.5"
                            max="1.25"
                            step="0.05"
                            value={activeFile.hardSphereParticleMultiplier}
                            onChange={(event) => setHeatCapacityHardSphereMultiplier('hardSphereParticleMultiplier', Number(event.target.value))}
                          />
                          <strong>{activeFile.hardSphereParticleMultiplier.toFixed(2)}x</strong>
                        </label>
                        <label className="studio-heat-visual-slider">
                          <span>{workbenchCopy.parameters.hardSphereSpeedMultiplier}</span>
                          <input
                            type="range"
                            min="0.5"
                            max="1.25"
                            step="0.05"
                            value={activeFile.hardSphereSpeedMultiplier}
                            onChange={(event) => setHeatCapacityHardSphereMultiplier('hardSphereSpeedMultiplier', Number(event.target.value))}
                          />
                          <strong>{activeFile.hardSphereSpeedMultiplier.toFixed(2)}x</strong>
                        </label>
                      </section>
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
                          {editableCurrentParameters.map((param) => {
                            const displayLabel = getWorkbenchParameterDisplayLabel(param, workbenchCopy);
                            const isParamLocked = parameterControlsLocked || isIdealControlledVariableLocked(param.key);
                            const paramLockHint = isIdealControlledVariableLocked(param.key) ? controlledVariableLockHint : undefined;

                            return (
                              <div
                                className={`studio-param-row ${parametersEditing ? 'studio-param-row-editing' : ''} ${isParamLocked ? 'studio-param-row-locked' : ''}`}
                                key={param.label}
                                title={paramLockHint}
                                aria-disabled={isParamLocked}
                              >
                                <span>{displayLabel}</span>
                                {parametersEditing && param.editable && !isParamLocked ? (
                                  <input
                                    aria-label={`${workbenchCopy.parameters.edit} ${displayLabel}`}
                                    value={parameterDraft[param.key] ?? param.value}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      setParameterDraft((current) => ({ ...current, [param.key]: nextValue }));
                                    }}
                                  />
                                ) : (
                                  <strong>{param.value}</strong>
                                )}
                              </div>
                            );
                          })}
                          <div className={`studio-param-actions ${parametersEditing ? 'studio-param-actions-editing' : 'studio-param-actions-reading'}`}>
                            {!parametersEditing ? (
                              <button
                                type="button"
                                className="studio-param-edit-button"
                                disabled={parameterControlsLocked}
                                onClick={startParameterEdit}
                              >
                                {workbenchCopy.parameters.edit}
                              </button>
                            ) : null}
                            {parametersEditing ? (
                              <button
                                type="button"
                                className="studio-param-save-button"
                                disabled={parameterControlsLocked}
                                onClick={saveParameterDraft}
                              >
                                {workbenchCopy.parameters.save}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : (
                    <>
                      {editableCurrentParameters.map((param) => {
                        const displayLabel = getWorkbenchParameterDisplayLabel(param, workbenchCopy);
                        const isParamLocked = parameterControlsLocked || isIdealControlledVariableLocked(param.key);
                        const paramLockHint = isIdealControlledVariableLocked(param.key) ? controlledVariableLockHint : undefined;

                        return (
                          <div
                            className={`studio-param-row ${parametersEditing ? 'studio-param-row-editing' : ''} ${isParamLocked ? 'studio-param-row-locked' : ''}`}
                            key={param.label}
                            title={paramLockHint}
                          >
                            <span>{displayLabel}</span>
                            {parametersEditing && param.editable && !isParamLocked ? (
                              <input
                                aria-label={`${workbenchCopy.parameters.edit} ${displayLabel}`}
                                value={parameterDraft[param.key] ?? param.value}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  setParameterDraft((current) => ({ ...current, [param.key]: nextValue }));
                                }}
                              />
                            ) : (
                              <strong>{param.value}</strong>
                            )}
                          </div>
                        );
                      })}
                      <div className={`studio-param-actions ${parametersEditing ? 'studio-param-actions-editing' : 'studio-param-actions-reading'}`}>
                        {!parametersEditing ? (
                          <button
                            type="button"
                            className="studio-param-edit-button"
                            disabled={parameterControlsLocked}
                            onClick={startParameterEdit}
                          >
                            {workbenchCopy.parameters.edit}
                          </button>
                        ) : null}
                        {parametersEditing ? (
                          <button
                            type="button"
                            className="studio-param-save-button"
                            disabled={parameterControlsLocked}
                            onClick={saveParameterDraft}
                          >
                            {workbenchCopy.parameters.save}
                          </button>
                        ) : null}
                      </div>
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
                    {parametersEditing
                      ? workbenchCopy.parameters.saveHint
                      : activeFile.kind === 'standard'
                        ? workbenchCopy.parameters.standardReadonlyNote
                        : activeFile.kind === 'heatCapacity'
                          ? workbenchCopy.parameters.heatCapacityReadonlyNote
                          : workbenchCopy.parameters.idealReadonlyNote}
                  </div>
                </div>
              </aside>
              ) : null}

              {!isWorkbenchEmpty && parametersCollapsed ? (
                <button type="button" className="studio-rail-button studio-right-rail" onClick={() => setParametersCollapsed(false)}>
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
