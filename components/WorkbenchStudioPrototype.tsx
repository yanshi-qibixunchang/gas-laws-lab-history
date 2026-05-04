import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  BookOpen,
  ChevronDown,
  Download,
  FilePlus2,
  FileArchive,
  FileText,
  FlaskConical,
  Folder,
  FolderOpen,
  Gauge,
  Languages,
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
import type { ExperimentRelation, HistogramBin, IdealGasExperimentPoint, Particle, SimulationParams } from '../types';
import { PhysicsEngine } from '../services/PhysicsEngine';
import { translations } from '../services/translations';
import SimulationCanvas from './SimulationCanvas';
import {
  areWorkbenchParamsEqual,
  cloneParams,
  createDefaultIdealFile,
  createDefaultIdealWindowLayout,
  createDefaultStandardFile,
  createDefaultStandardResultsLayout,
  getWorkbenchParameterRows,
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
  type WorkbenchPanelKey,
  type WorkbenchParameterRow,
  type WorkbenchStandardResultsLayout,
  type WorkbenchStandardResultsTab,
} from './workbenchState';
import {
  createWorkbenchExportPayload,
  createWorkbenchFigureSpecs,
  createWorkbenchResultSummary,
  type WorkbenchExportMode,
} from './workbenchResults';
import {
  encodeWorkbenchSession,
  loadWorkbenchSession,
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
} from '../utils/idealGasExperiment';
import './WorkbenchStudioPrototype.css';

type LogKind = 'info' | 'warning' | 'success' | 'error';
type ConsoleTab = 'logs' | 'warnings' | 'summary';
type TopMenu = 'new' | 'edit' | 'window' | 'settings' | 'help' | null;
type ResultsSectionKey = WorkbenchStandardResultsTab;
type WorkbenchThemePreference = 'system' | 'light' | 'dark';
type WorkbenchLanguagePreference = 'zh-CN' | 'zh-TW' | 'en';
type IdealSamplingPresetKey = 'fast' | 'balanced' | 'stable';

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
  animationFrameId: number | null;
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
}

interface WorkbenchCopy {
  menus: {
    newStudy: string;
    edit: string;
    window: string;
    settings: string;
    help: string;
    general: string;
    standardStudy: string;
    idealStudy: string;
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
    rename: string;
    delete: string;
    confirmDelete: string;
    cancel: string;
    locked: string;
    shown: string;
    open: string;
    active: string;
    off: string;
    std: string;
    ideal: string;
  };
  panels: {
    previewTitle: string;
    previewHint: string;
    realtimeTitle: string;
    standardRealtimeHint: string;
    idealRealtimeHint: string;
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
  };
  parameters: {
    title: string;
    currentFileValues: string;
    lockedUntilStopped: string;
    editValues: string;
    hide: string;
    standardSimulation: string;
    idealSimulation: string;
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
    controlledLockHint: string;
  };
  results: {
    title: string;
    experimentStatus: string;
    scan: string;
    measuredPressure: string;
    idealPressure: string;
    gap: string;
    pointsTitle: (relation: string) => string;
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
    reportPdf: string;
    verificationFigure: string;
    pointsCsv: string;
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
    idealResultsClosed: (name: string) => string;
    fileSelected: (name: string) => string;
    confirmClear: (name: string, relation: string) => string;
    clearedRelation: (name: string, relation: string) => string;
  };
}

const LOCKED_PANEL_KEYS: WorkbenchPanelKey[] = ['preview', 'realtime'];
const LEFT_SIDEBAR_MIN = 220;
const LEFT_SIDEBAR_MAX = 420;
const PARAM_SIDEBAR_MIN = 240;
const PARAM_SIDEBAR_MAX = 420;
const EDIT_HISTORY_LIMIT = 50;
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
const IDEAL_RESULT_WINDOW_DEFAULTS_STORAGE_KEY = 'hsl_workbench_ideal_result_window_defaults';
const WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY = 'hsl_workbench_layout_defaults_v1';
const WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY = 'hsl_workbench_general_settings';

const defaultWorkbenchGeneralSettings: WorkbenchGeneralSettings = {
  theme: 'system',
  language: 'zh-CN',
};

const workbenchCopies: Record<WorkbenchLanguagePreference, WorkbenchCopy> = {
  'zh-CN': {
    menus: {
      newStudy: '新建研究', edit: '编辑', window: '窗口', settings: '设置', help: '帮助', general: '通用',
      standardStudy: '标准模拟研究', idealStudy: '理想气体模拟研究', undo: '撤销', redo: '重做', empty: '空',
      clearEditHistory: '清空编辑历史', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '恢复默认布局', default: '默认',
      performanceMode: '性能模式', exportEnvironment: '导出环境', saveWorkbenchLayoutDefault: '保存当前窗口布局为默认',
      userGuide: '用户指南', theoryPdf: '理论文档 PDF', about: '关于 Hard Sphere Workbench',
    },
    settings: {
      title: '通用设置', subtitle: '主题、语言、快捷键和布局偏好', closeAria: '关闭通用设置', theme: '主题', themeHint: '使用系统、亮色或暗色模式',
      themeOptions: { system: { label: '跟随系统', hint: '遵循系统偏好' }, light: { label: '亮色', hint: '亮色工作区预览' }, dark: { label: '暗色', hint: '暗色工作区预览' } },
      language: '语言', languageHint: '选择界面语言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '简体中文界面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
    },
    files: {
      openFiles: '打开文件', files: '文件', panels: '面板', noOpenFiles: '没有打开的文件', emptyHint: '创建一个研究以填充工作区。',
      noOpenStudy: '没有打开的研究', emptyTitle: '开始新的硬球工作台文件', emptyBody: '创建标准模拟或理想气体关系研究，以恢复预览、图表、结果和参数面板。',
      createStandard: '创建标准模拟研究', createIdeal: '创建理想气体模拟研究', rename: '重命名', delete: '删除', confirmDelete: '确认删除', cancel: '取消',
      locked: '锁定', shown: '显示', open: '打开', active: '活动', off: '关闭', std: '标准', ideal: '理想',
    },
    panels: {
      previewTitle: '3D 预览', previewHint: '实时分子视口', realtimeTitle: '实时数据 / 图表', standardRealtimeHint: '实时温度、压力和图表轨迹', idealRealtimeHint: '实时 T、P、关系和图表轨迹',
      standardResultsTitle: '结果', standardResultsHint: '实验状态、数据表和图像', idealResultsTitle: '结果', idealResultsHint: '验证图、历史解锁和导出详情',
      pointsTitle: '点', pointsHint: '已记录的关系点', verificationTitle: '验证', verificationHint: '验证图、诊断和导出详情',
      summaryTitle: '摘要', dataTableTitle: '数据表', figuresTitle: '图像',
    },
    parameters: {
      title: '当前参数', currentFileValues: '当前文件值', lockedUntilStopped: '停止或完成前锁定', editValues: '编辑参数值', hide: '隐藏',
      standardSimulation: '标准模拟', idealSimulation: '理想气体模拟', savedChangesOnStart: '启动时已保存参数', idealRuntimeOnStart: '理想运行时将在开始时连接', applied: '参数已应用',
      relation: '关系', scanVariable: '扫描变量', samplingPreset: '采样预设', targetTemperature: '目标温度', boxLength: '盒长 L', particleCount: '粒子数 N', customPreset: '自定义', setSamplingPrecision: '设置采样精度',
      parameterLabels: { N: 'N（粒子）', r: 'r', L: 'L', dt: 'dt', nu: 'nu', targetTemperature: '目标温度', equilibriumTime: '平衡时间（s）', statsDuration: '统计时长（s）', relation: '关系' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '稳定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 统计',
      advancedSettings: '高级设置', advancedShow: '显示模型常数和采样值', advancedHide: '隐藏模型常数和采样值', edit: '编辑', save: '保存', saveHint: '保存高级参数到当前工作台文件',
      standardReadonlyNote: '标准模拟参数在这里直接显示。', idealReadonlyNote: '关系、扫描变量和采样预设在上方控制。', controlledLockHint: '当前关系已有数据，受控变量已锁定。',
    },
    results: {
      title: '结果', experimentStatus: '实验状态', scan: '扫描', measuredPressure: '实测 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 点', recordedPoints: (count) => count + ' 个记录点',
      clearRelation: '清空关系', confirmClear: '确认清空', remove: '移除', confirmRemove: '确认移除', cancel: '取消', noPoints: '没有点', runToRecord: '运行实验以记录点。', tableAction: '操作', tableTime: '时间',
      finalState: '最终状态', meanSpeed: '平均速度', measuredBars: '实测柱', idealLine: '理想线', samples: (count) => count + ' 个样本', waiting: '等待中', finalSpeedSamples: '最终速度样本', finalEnergySamples: '最终能量样本', tempHistorySamples: '温度历史样本', finalDataReady: '最终数据就绪', energyDrift: '能量漂移', meanAbsTempError: '平均绝对温度误差', tempSamples: '温度样本', resultsReady: (relation) => relation + ' 实验结果已就绪', waitingForRecordedPoints: (relation) => relation + ' 等待记录点',
      metric: '指标', value: '值', status: '状态', ready: '就绪', notReady: '未就绪', yes: '是', no: '否', diagnostic: '诊断', export: '导出', reportPdf: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV',
    },
    actions: { start: '开始', pause: '暂停', stop: '停止', close: '关闭', resetView: '重置视图', hide: '隐藏', cancel: '取消' },
    shortcuts: { title: '快捷键', hint: '常用工作台快捷键', undo: '撤销', redo: '重做', closeSettings: '关闭设置' },
    console: { title: '控制台 / 输出', tabs: { logs: '日志', warnings: '警告', summary: '摘要' }, total: '总计', info: '信息', success: '成功', warnings: '警告', errors: '错误', latest: '最新', runtime: '运行时', noLogs: '暂无日志。', noWarnings: '暂无警告或错误。' },
    status: { activeFile: (name) => '当前文件：' + name, selectedBlock: (name) => '选中板块：' + name, none: '无', noRuntime: '未连接运行时', standardRuntime: '标准运行时已连接', idealRuntime: (relation, verdict) => '理想运行时已连接 / ' + relation + ' / ' + verdict, runStates: { idle: '空闲', running: '运行中', paused: '已暂停', finished: '已完成', 'needs-reset': '需要重置' }, verdictStates: { insufficient: '数据不足', collecting: '采集中', verified: '已验证', failed: '未通过', preliminary: '初步成立', notYet: '尚未成立', 'not-started': '尚未开始' } },
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '默认布局：3D 预览、实时数据 / 图表、当前参数。', standardConnected: '标准模拟运行时、3D 预览和实时图表数据已连接。', exportBridgeRequired: '科学 PDF 导出需要桌面运行时桥接。', autoPausedSingleRuntime: (name) => name + '：由于一次只能运行一个工作台运行时，已自动暂停。', autoPausedCreateFile: (name) => name + '：创建新文件时已自动暂停。', autoPausedSwitchFile: (name) => name + '：切换文件时已自动暂停。', fileCreated: (name) => '已创建工作台文件：' + name, mockAction: (label) => '模拟操作：' + label, lockedPanel: (title) => title + ' 是默认工作区的一部分，不能隐藏。', layoutReset: (name) => name + '：布局已恢复为 3D 预览 + 实时数据 / 图表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 打开理想结果窗口。', idealResultsClosed: (name) => name + '：已关闭理想结果窗口。', fileSelected: (name) => '已选择文件标签：' + name, confirmClear: (name, relation) => name + '：点击确认清空以删除全部 ' + relation + ' 点。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 点。' },
  },
  'zh-TW': {
    menus: {
      newStudy: '新增研究', edit: '編輯', window: '視窗', settings: '設定', help: '說明', general: '一般',
      standardStudy: '標準模擬研究', idealStudy: '理想氣體模擬研究', undo: '復原', redo: '重做', empty: '空',
      clearEditHistory: '清除編輯記錄', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '還原預設版面', default: '預設',
      performanceMode: '效能模式', exportEnvironment: '匯出環境', saveWorkbenchLayoutDefault: '將目前視窗版面存為預設',
      userGuide: '使用指南', theoryPdf: '理論文件 PDF', about: '關於 Hard Sphere Workbench',
    },
    settings: {
      title: '一般設定', subtitle: '主題、語言、快捷鍵與版面偏好', closeAria: '關閉一般設定', theme: '主題', themeHint: '使用系統、亮色或暗色模式',
      themeOptions: { system: { label: '跟隨系統', hint: '依照系統偏好' }, light: { label: '亮色', hint: '亮色工作區預覽' }, dark: { label: '暗色', hint: '暗色工作區預覽' } },
      language: '語言', languageHint: '選擇介面語言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '簡體中文介面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
    },
    files: {
      openFiles: '開啟檔案', files: '檔案', panels: '面板', noOpenFiles: '沒有開啟的檔案', emptyHint: '建立一個研究以填入工作區。',
      noOpenStudy: '沒有開啟的研究', emptyTitle: '開始新的硬球工作台檔案', emptyBody: '建立標準模擬或理想氣體關係研究，以恢復預覽、圖表、結果和參數面板。',
      createStandard: '建立標準模擬研究', createIdeal: '建立理想氣體模擬研究', rename: '重新命名', delete: '刪除', confirmDelete: '確認刪除', cancel: '取消',
      locked: '鎖定', shown: '顯示', open: '開啟', active: '作用中', off: '關閉', std: '標準', ideal: '理想',
    },
    panels: {
      previewTitle: '3D 預覽', previewHint: '即時分子視口', realtimeTitle: '即時資料 / 圖表', standardRealtimeHint: '即時溫度、壓力和圖表軌跡', idealRealtimeHint: '即時 T、P、關係和圖表軌跡',
      standardResultsTitle: '結果', standardResultsHint: '實驗狀態、資料表和圖像', idealResultsTitle: '結果', idealResultsHint: '驗證圖、歷史解鎖和匯出詳情',
      pointsTitle: '點', pointsHint: '已記錄的關係點', verificationTitle: '驗證', verificationHint: '驗證圖、診斷和匯出詳情',
      summaryTitle: '摘要', dataTableTitle: '資料表', figuresTitle: '圖像',
    },
    parameters: {
      title: '目前參數', currentFileValues: '目前檔案值', lockedUntilStopped: '停止或完成前鎖定', editValues: '編輯參數值', hide: '隱藏',
      standardSimulation: '標準模擬', idealSimulation: '理想氣體模擬', savedChangesOnStart: '啟動時已儲存參數', idealRuntimeOnStart: '理想執行階段將在開始時連接', applied: '參數已套用',
      relation: '關係', scanVariable: '掃描變量', samplingPreset: '採樣預設', targetTemperature: '目標溫度', boxLength: '盒長 L', particleCount: '粒子數 N', customPreset: '自訂', setSamplingPrecision: '設定採樣精度',
      parameterLabels: { N: 'N（粒子）', r: 'r', L: 'L', dt: 'dt', nu: 'nu', targetTemperature: '目標溫度', equilibriumTime: '平衡時間（s）', statsDuration: '統計時長（s）', relation: '關係' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '穩定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 統計',
      advancedSettings: '進階設定', advancedShow: '顯示模型常數和採樣值', advancedHide: '隱藏模型常數和採樣值', edit: '編輯', save: '儲存', saveHint: '將進階參數儲存到目前工作台檔案',
      standardReadonlyNote: '標準模擬參數在這裡直接顯示。', idealReadonlyNote: '關係、掃描變量和採樣預設在上方控制。', controlledLockHint: '目前關係已有資料，受控變量已鎖定。',
    },
    results: {
      title: '結果', experimentStatus: '實驗狀態', scan: '掃描', measuredPressure: '實測 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 點', recordedPoints: (count) => count + ' 個記錄點',
      clearRelation: '清空關係', confirmClear: '確認清空', remove: '移除', confirmRemove: '確認移除', cancel: '取消', noPoints: '沒有點', runToRecord: '執行實驗以記錄點。', tableAction: '操作', tableTime: '時間',
      finalState: '最終狀態', meanSpeed: '平均速度', measuredBars: '實測柱', idealLine: '理想線', samples: (count) => count + ' 個樣本', waiting: '等待中', finalSpeedSamples: '最終速度樣本', finalEnergySamples: '最終能量樣本', tempHistorySamples: '溫度歷史樣本', finalDataReady: '最終資料就緒', energyDrift: '能量漂移', meanAbsTempError: '平均絕對溫度誤差', tempSamples: '溫度樣本', resultsReady: (relation) => relation + ' 實驗結果已就緒', waitingForRecordedPoints: (relation) => relation + ' 等待記錄點',
      metric: '指標', value: '值', status: '狀態', ready: '就緒', notReady: '未就緒', yes: '是', no: '否', diagnostic: '診斷', export: '匯出', reportPdf: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV',
    },
    actions: { start: '開始', pause: '暫停', stop: '停止', close: '關閉', resetView: '重置視圖', hide: '隱藏', cancel: '取消' },
    shortcuts: { title: '快捷鍵', hint: '常用工作台快捷鍵', undo: '復原', redo: '重做', closeSettings: '關閉設定' },
    console: { title: '控制台 / 輸出', tabs: { logs: '日誌', warnings: '警告', summary: '摘要' }, total: '總計', info: '資訊', success: '成功', warnings: '警告', errors: '錯誤', latest: '最新', runtime: '執行階段', noLogs: '暫無日誌。', noWarnings: '暫無警告或錯誤。' },
    status: { activeFile: (name) => '目前檔案：' + name, selectedBlock: (name) => '選取區塊：' + name, none: '無', noRuntime: '未連接執行階段', standardRuntime: '標準執行階段已連接', idealRuntime: (relation, verdict) => '理想執行階段已連接 / ' + relation + ' / ' + verdict, runStates: { idle: '閒置', running: '執行中', paused: '已暫停', finished: '已完成', 'needs-reset': '需要重置' }, verdictStates: { insufficient: '資料不足', collecting: '採集中', verified: '已驗證', failed: '未通過', preliminary: '初步成立', notYet: '尚未成立', 'not-started': '尚未開始' } },
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '預設版面：3D 預覽、即時資料 / 圖表、目前參數。', standardConnected: '標準模擬執行階段、3D 預覽和即時圖表資料已連接。', exportBridgeRequired: '科學 PDF 匯出需要桌面執行階段橋接。', autoPausedSingleRuntime: (name) => name + '：由於一次只能執行一個工作台執行階段，已自動暫停。', autoPausedCreateFile: (name) => name + '：建立新檔案時已自動暫停。', autoPausedSwitchFile: (name) => name + '：切換檔案時已自動暫停。', fileCreated: (name) => '已建立工作台檔案：' + name, mockAction: (label) => '模擬操作：' + label, lockedPanel: (title) => title + ' 是預設工作區的一部分，不能隱藏。', layoutReset: (name) => name + '：版面已還原為 3D 預覽 + 即時資料 / 圖表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 開啟理想結果視窗。', idealResultsClosed: (name) => name + '：已關閉理想結果視窗。', fileSelected: (name) => '已選擇檔案分頁：' + name, confirmClear: (name, relation) => name + '：點擊確認清空以刪除全部 ' + relation + ' 點。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 點。' },
  },
  en: {
    menus: {
      newStudy: 'New Study', edit: 'Edit', window: 'Window', settings: 'Settings', help: 'Help', general: 'General',
      standardStudy: 'Standard Simulation Study', idealStudy: 'Ideal Gas Simulation Study', undo: 'Undo', redo: 'Redo', empty: 'empty',
      clearEditHistory: 'Clear Edit History', panelsFor: (name) => 'Panels for ' + name, resetDefaultLayout: 'Reset Default Layout', default: 'default',
      performanceMode: 'Performance Mode', exportEnvironment: 'Export Environment', saveWorkbenchLayoutDefault: 'Save Current Window Layout as Default',
      userGuide: 'User Guide', theoryPdf: 'Theory Document PDF', about: 'About Hard Sphere Workbench',
    },
    settings: {
      title: 'General Settings', subtitle: 'Theme, language, shortcuts, and layout preferences', closeAria: 'Close General Settings', theme: 'Theme', themeHint: 'Use system, light, or dark mode',
      themeOptions: { system: { label: 'System', hint: 'Follow OS preference' }, light: { label: 'Light', hint: 'Bright workspace preview' }, dark: { label: 'Dark', hint: 'Dark workspace preview' } },
      language: 'Language', languageHint: 'Choose the interface language',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: 'Simplified Chinese interface' }, 'zh-TW': { label: '繁體中文', hint: 'Traditional Chinese interface' }, en: { label: 'English', hint: 'English interface' } },
    },
    files: {
      openFiles: 'Open Files', files: 'Files', panels: 'Panels', noOpenFiles: 'No open files', emptyHint: 'Create a study to populate the workbench.',
      noOpenStudy: 'No open study', emptyTitle: 'Start a new hard sphere workbench file', emptyBody: 'Create a standard simulation or ideal gas relation study to restore previews, charts, results, and parameter panels.',
      createStandard: 'Create Standard Simulation Study', createIdeal: 'Create Ideal Gas Simulation Study', rename: 'Rename', delete: 'Delete', confirmDelete: 'Confirm Delete', cancel: 'Cancel',
      locked: 'locked', shown: 'shown', open: 'open', active: 'active', off: 'off', std: 'STD', ideal: 'IDEAL',
    },
    panels: {
      previewTitle: '3D Preview', previewHint: 'Realtime molecular viewport', realtimeTitle: 'Realtime Data / Charts', standardRealtimeHint: 'Live temperature, pressure, and chart traces', idealRealtimeHint: 'Live T, P, relation, and chart traces',
      standardResultsTitle: 'Results', standardResultsHint: 'Experiment status, data table, and figures', idealResultsTitle: 'Results', idealResultsHint: 'Verification chart, history unlock, and export details',
      pointsTitle: 'Points', pointsHint: 'Recorded relation points', verificationTitle: 'Verification', verificationHint: 'Verification chart, diagnostics, and export details',
      summaryTitle: 'Summary', dataTableTitle: 'Data Table', figuresTitle: 'Figures',
    },
    parameters: {
      title: 'Current Parameters', currentFileValues: 'current file values', lockedUntilStopped: 'locked until stopped or finished', editValues: 'edit parameter values', hide: 'Hide',
      standardSimulation: 'Standard Simulation', idealSimulation: 'Ideal Gas Simulation', savedChangesOnStart: 'parameters saved on start', idealRuntimeOnStart: 'ideal runtime will connect on start', applied: 'parameters applied',
      relation: 'Relation', scanVariable: 'Scan Variable', samplingPreset: 'Sampling Preset', targetTemperature: 'Target Temperature', boxLength: 'Box Length L', particleCount: 'Particle Count N', customPreset: 'Custom', setSamplingPrecision: 'Set sampling precision',
      parameterLabels: { N: 'N (particles)', r: 'r', L: 'L', dt: 'dt', nu: 'nu', targetTemperature: 'Target temperature', equilibriumTime: 'equilibriumTime (s)', statsDuration: 'statsDuration (s)', relation: 'Relation' },
      samplingPresets: { fast: 'Fast', balanced: 'Balanced', stable: 'Stable' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's eq / ' + statsDuration + 's stats',
      advancedSettings: 'Advanced settings', advancedShow: 'Show model constants and sampling values', advancedHide: 'Hide model constants and sampling values', edit: 'Edit', save: 'Save', saveHint: 'Save advanced parameters to this workbench file',
      standardReadonlyNote: 'Standard simulation parameters are shown directly here.', idealReadonlyNote: 'Relation, scan variable, and sampling preset are controlled above.', controlledLockHint: 'This relation already has data, so controlled variables are locked.',
    },
    results: {
      title: 'Results', experimentStatus: 'Experiment status', scan: 'Scan', measuredPressure: 'Measured P', idealPressure: 'Ideal P', gap: 'Gap', pointsTitle: (relation) => relation + ' points', recordedPoints: (count) => count + ' recorded points',
      clearRelation: 'Clear Relation', confirmClear: 'Confirm Clear', remove: 'Remove', confirmRemove: 'Confirm Remove', cancel: 'Cancel', noPoints: 'no points', runToRecord: 'Run the experiment to record points.', tableAction: 'Action', tableTime: 'Time',
      finalState: 'Final state', meanSpeed: 'Mean speed', measuredBars: 'measured bars', idealLine: 'ideal line', samples: (count) => count + ' samples', waiting: 'waiting', finalSpeedSamples: 'final speed samples', finalEnergySamples: 'final energy samples', tempHistorySamples: 'temp history samples', finalDataReady: 'final data ready', energyDrift: 'energy drift', meanAbsTempError: 'mean abs temp error', tempSamples: 'Temp samples', resultsReady: (relation) => relation + ' experiment result ready', waitingForRecordedPoints: (relation) => relation + ' waiting for recorded points',
      metric: 'Metric', value: 'Value', status: 'Status', ready: 'ready', notReady: 'not-ready', yes: 'yes', no: 'no', diagnostic: 'Diagnostic', export: 'Export', reportPdf: 'Report PDF', verificationFigure: 'Verification Figure', pointsCsv: 'Points CSV',
    },
    actions: { start: 'Start', pause: 'Pause', stop: 'Stop', close: 'Close', resetView: 'Reset view', hide: 'Hide', cancel: 'Cancel' },
    shortcuts: { title: 'Shortcuts', hint: 'Common workbench shortcuts', undo: 'Undo', redo: 'Redo', closeSettings: 'Close settings' },
    console: { title: 'Console / Output', tabs: { logs: 'Logs', warnings: 'Warnings', summary: 'Summary' }, total: 'Total', info: 'Info', success: 'Success', warnings: 'Warnings', errors: 'Errors', latest: 'Latest', runtime: 'Runtime', noLogs: 'No log entries yet.', noWarnings: 'No warnings or errors yet.' },
    status: { activeFile: (name) => 'Active file: ' + name, selectedBlock: (name) => 'Selected block: ' + name, none: 'none', noRuntime: 'No runtime connected', standardRuntime: 'Standard runtime connected', idealRuntime: (relation, verdict) => 'Ideal runtime connected / ' + relation + ' / ' + verdict, runStates: { idle: 'idle', running: 'running', paused: 'paused', finished: 'finished', 'needs-reset': 'needs reset' }, verdictStates: { insufficient: 'insufficient', collecting: 'collecting', verified: 'verified', failed: 'failed', preliminary: 'preliminary', notYet: 'not yet', 'not-started': 'not started' } },
    logs: { initialized: 'Workbench studio prototype initialized.', defaultLayout: 'Default layout: 3D Preview, Realtime Data / Charts, Current Parameters.', standardConnected: 'Standard Simulation runtime, 3D preview, and realtime chart data are connected.', exportBridgeRequired: 'Scientific PDF export requires the desktop runtime bridge.', autoPausedSingleRuntime: (name) => name + ': auto-paused because only one workbench runtime can run at a time.', autoPausedCreateFile: (name) => name + ': auto-paused when creating a new file.', autoPausedSwitchFile: (name) => name + ': auto-paused when switching files.', fileCreated: (name) => 'Workbench file created: ' + name, mockAction: (label) => 'Mock action: ' + label, lockedPanel: (title) => title + ' is locked as part of the default workspace and cannot be hidden.', layoutReset: (name) => name + ': layout reset to 3D Preview + Realtime Data / Charts', idealResultsOpened: (name, tab) => name + ': opened ideal Results window on ' + tab + '.', idealResultsClosed: (name) => name + ': closed ideal Results window.', fileSelected: (name) => 'File tab selected: ' + name, confirmClear: (name, relation) => name + ': click Confirm Clear to clear all ' + relation + ' points.', clearedRelation: (name, relation) => name + ': cleared ' + relation + ' points.' },
  },
};

interface WorkbenchLayoutDefaultState {
  resultsHeightRatio: number;
  liveWorkspaceSplitRatio: number;
}

interface WorkbenchLayoutDefaults {
  standard: WorkbenchLayoutDefaultState;
  ideal: WorkbenchLayoutDefaultState;
}

const exportEnvironmentCopy: Record<WorkbenchExportEnvironmentStatus, { label: string; detail: string }> = {
  checking: {
    label: 'Checking export environment',
    detail: 'Desktop runtime is checking local Python/Matplotlib and bundled exporter availability.',
  },
  'available-system': {
    label: 'System Python exporter available',
    detail: 'Scientific report and figure export will use this computer\'s Python/Matplotlib environment.',
  },
  'available-bundled': {
    label: 'Bundled exporter available',
    detail: 'Scientific report and figure export will use the exporter packaged with the desktop app.',
  },
  unavailable: {
    label: 'PDF export unavailable in web preview',
    detail: 'Simulation, realtime charts, and result previews still work. Desktop packaging will add system-then-bundled exporter detection.',
  },
  error: {
    label: 'Export environment error',
    detail: 'Exporter detection failed. Simulation and realtime charts remain available.',
  },
};

const hasDesktopExportBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabExporter)
);

const isWorkbenchThemePreference = (value: unknown): value is WorkbenchThemePreference => (
  value === 'system' || value === 'light' || value === 'dark'
);

const isWorkbenchLanguagePreference = (value: unknown): value is WorkbenchLanguagePreference => (
  value === 'zh-CN' || value === 'zh-TW' || value === 'en'
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

const createResultsSections = (copy: WorkbenchCopy): Array<{ key: ResultsSectionKey; title: string; icon: React.ReactNode }> => [
  { key: 'summary', title: copy.panels.summaryTitle, icon: <Gauge size={12} /> },
  { key: 'dataTable', title: copy.panels.dataTableTitle, icon: <Table2 size={12} /> },
  { key: 'figures', title: copy.panels.figuresTitle, icon: <BarChart3 size={12} /> },
];

const idealRelationOptions: Array<{ key: ExperimentRelation; label: string; hint: string }> = [
  { key: 'pt', label: 'P-T', hint: 'Scan temperature at fixed N and V' },
  { key: 'pv', label: 'P-V', hint: 'Scan volume through box length L' },
  { key: 'pn', label: 'P-N', hint: 'Scan particle count at fixed T and V' },
];

const idealRelationKeys: ExperimentRelation[] = ['pt', 'pv', 'pn'];
const standardResultsTabKeys: WorkbenchStandardResultsTab[] = ['summary', 'dataTable', 'figures'];
const idealResultWindowKeys: WorkbenchIdealResultWindowKey[] = ['experimentPoints', 'verification'];

const isIdealResultWindowKey = (key: WorkbenchPanelKey): key is WorkbenchIdealResultWindowKey => (
  key === 'experimentPoints' || key === 'verification'
);

const isStandardResultsTab = (key: string): key is WorkbenchStandardResultsTab => (
  standardResultsTabKeys.includes(key as WorkbenchStandardResultsTab)
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
      : {
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
        }),
    visiblePanels: [...file.visiblePanels],
  }))
);

const WorkbenchStudioPrototype: React.FC = () => {
  const [initialSession] = useState(() => loadWorkbenchSession());
  const [workbenchLayoutDefaults, setWorkbenchLayoutDefaults] = useState<WorkbenchLayoutDefaults>(() => loadWorkbenchLayoutDefaults());
  const [files, setFiles] = useState<WorkbenchFileState[]>(() => {
    const defaults = loadWorkbenchLayoutDefaults();
    return initialSession.files.map((file) => (
      file.kind === 'ideal'
        ? {
            ...file,
            liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
            idealWindowLayout: normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults.ideal),
          }
        : {
            ...file,
            liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
            standardResultsLayout: normalizeStandardResultsLayout(file.standardResultsLayout, defaults.standard),
      }
    ));
  });
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
  const [openTopMenu, setOpenTopMenu] = useState<TopMenu>(null);
  const [settingsGeneralOpen, setSettingsGeneralOpen] = useState(false);
  const [settingsThemePreference, setSettingsThemePreference] = useState<WorkbenchThemePreference>(() => initialGeneralSettings.theme);
  const [settingsLanguagePreference, setSettingsLanguagePreference] = useState<WorkbenchLanguagePreference>(() => initialGeneralSettings.language);
  const [settingsLanguageMenuOpen, setSettingsLanguageMenuOpen] = useState(false);
  const workbenchCopy = workbenchCopies[settingsLanguagePreference];
  const workbenchTranslation = translations[settingsLanguagePreference === 'en' ? 'en-GB' : settingsLanguagePreference];
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [parametersCollapsed, setParametersCollapsed] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(286);
  const [parameterSidebarWidth, setParameterSidebarWidth] = useState(300);
  const [filesSectionCollapsed, setFilesSectionCollapsed] = useState(false);
  const [panelsSectionCollapsed, setPanelsSectionCollapsed] = useState(false);
  const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null);
  const [pendingRemovePointId, setPendingRemovePointId] = useState<string | null>(null);
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
  const idealResultWindowRegionRef = useRef<HTMLDivElement | null>(null);

  const emptyWorkbenchFile = useMemo(() => createDefaultStandardFile(0), []);
  const isWorkbenchEmpty = files.length === 0;
  const activeFile = files.find((file) => file.id === activeFileId) ?? emptyWorkbenchFile;
  const standardPanels = useMemo(() => createStandardPanels(workbenchCopy), [workbenchCopy]);
  const idealPanels = useMemo(() => createIdealPanels(workbenchCopy), [workbenchCopy]);
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
  const availablePanels = activeFile.kind === 'standard' ? standardPanels : idealPanels;
  const activePanelTitle = availablePanels.find((panel) => panel.key === selectedPanel)?.title ?? '3D Preview';
  const primaryPanels = availablePanels.filter((panel) => panel.key === 'preview' || panel.key === 'realtime');
  const optionalPanels = availablePanels.filter(
    (panel) => (
      panel.key !== 'preview' &&
      panel.key !== 'realtime' &&
      !(activeFile.kind === 'ideal' && isIdealResultWindowKey(panel.key)) &&
      activeFile.visiblePanels.includes(panel.key)
    ),
  );
  const resultsPanel = optionalPanels.find((panel) => panel.key === 'results');
  const auxiliaryPanels = optionalPanels.filter((panel) => panel.key !== 'results');
  const idealResultPanels = activeFile.kind === 'ideal'
    ? idealResultWindowPanels.filter((panel) => activeFile.visiblePanels.includes(panel.key))
    : [];

  const currentParameters = useMemo(() => getWorkbenchParameterRows(activeFile), [activeFile]);
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
          : workbenchCopy.status.idealRuntime(
              getRelationLabel(activeFile.relation),
              getLocalizedStatusValue(idealAnalysis?.verdictState ?? 'insufficient', workbenchCopy),
            ),
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
    setSettingsLanguageMenuOpen(false);
    setSettingsGeneralOpen(true);
  };

  const updateSettingsThemePreference = (theme: WorkbenchThemePreference) => {
    setSettingsThemePreference(theme);
    persistWorkbenchGeneralSettings({ theme, language: settingsLanguagePreference });
  };

  const updateSettingsLanguagePreference = (language: WorkbenchLanguagePreference) => {
    setSettingsLanguagePreference(language);
    setSettingsLanguageMenuOpen(false);
    persistWorkbenchGeneralSettings({ theme: settingsThemePreference, language });
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
      if (runtime.animationFrameId !== null) {
        cancelAnimationFrame(runtime.animationFrameId);
      }
    });
    Object.values(idealRuntimeRef.current).forEach((runtime) => {
      if (runtime.animationFrameId !== null) {
        cancelAnimationFrame(runtime.animationFrameId);
      }
    });
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
      setExportEnvironmentDetail(exportEnvironmentCopy.unavailable.detail);
      return;
    }

    let cancelled = false;
    setExportEnvironmentStatus('checking');
    setExportEnvironmentDetail(exportEnvironmentCopy.checking.detail);

    bridge.checkExportEnvironment()
      .then((result) => {
        if (cancelled) return;
        const nextStatus = result.status === 'available-bundled' ? 'available-bundled' : result.status;
        setExportEnvironmentStatus(nextStatus);
        setExportEnvironmentDetail(result.message ?? exportEnvironmentCopy[nextStatus].detail);
        setLogs((current) => [
          ...current,
          {
            id: current.length + 1,
            time: formatTime(),
            kind: nextStatus === 'available-system' || nextStatus === 'available-bundled' ? 'success' : 'warning',
            message: result.message ?? exportEnvironmentCopy[nextStatus].detail,
          },
        ]);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Desktop export environment check failed.';
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
  }, []);

  useEffect(() => {
    if (consoleTab === 'summary') return;
    const body = consoleBodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [consoleTab, displayedLogs.length, logs.length]);

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

  const startStandardResultsResize = (event: React.MouseEvent) => {
    if (activeFile.kind !== 'standard') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = centerWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized standard Results window');
    const startY = event.clientY;
    const startRatio = normalizeStandardResultsLayout(activeFile.standardResultsLayout).heightRatio;
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
            heightRatio: clamp(nextRatio, IDEAL_RESULT_MIN_HEIGHT_RATIO, IDEAL_RESULT_MAX_HEIGHT_RATIO),
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

  const saveCurrentWorkbenchLayoutAsDefault = () => {
    if (isWorkbenchEmpty) {
      pushLog('Create or open a workbench file before saving layout defaults.', 'warning');
      return;
    }

    const nextFileDefaults = sanitizeWorkbenchLayoutDefaultState({
      resultsHeightRatio: activeFile.kind === 'ideal'
        ? normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal).heightRatio
        : normalizeStandardResultsLayout(activeFile.standardResultsLayout, workbenchLayoutDefaults.standard).heightRatio,
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
    if (!runtime || runtime.animationFrameId === null) return;

    cancelAnimationFrame(runtime.animationFrameId);
    runtime.animationFrameId = null;
  };

  const createStandardRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'standard') return null;

    return {
      engine: new PhysicsEngine(cloneParams(file.appliedParams)),
      frameCount: 0,
      animationFrameId: null,
    };
  };

  const createIdealRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'ideal') return null;

    return {
      engine: new PhysicsEngine(cloneParams(file.activeParams)),
      frameCount: 0,
      animationFrameId: null,
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
    if (!runtime || runtime.animationFrameId !== null) return;

    runtime.animationFrameId = requestAnimationFrame(() => {
      runtime.animationFrameId = null;
      runStandardFrame(fileId);
    });
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
    if (!runtime || runtime.animationFrameId !== null) return;

    runtime.animationFrameId = requestAnimationFrame(() => {
      runtime.animationFrameId = null;
      runIdealFrame(fileId);
    });
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

    if (!areWorkbenchParamsEqual(nextParams, activeFile.params)) {
      captureUndoSnapshot('saved parameters');
    }
    updateActiveFile((file) => ({
      ...file,
      params: nextParams,
      ...(file.kind === 'ideal' ? { needsReset: true as const } : {}),
      updatedAt: Date.now(),
    }));
    setParametersEditing(false);
    setParameterDraft({});
    setParameterErrors([]);
    pushLog(`${activeFile.name}: parameters saved to this workbench file.`, 'success');
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
        animationFrameId: null,
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
      animationFrameId: null,
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

  const pauseActiveFile = () => {
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
    const index = files.filter((file) => file.kind === kind).length + 1;
    let file: WorkbenchFileState = kind === 'standard'
      ? createDefaultStandardFile(index, workbenchLayoutDefaults.standard)
      : createDefaultIdealFile(index, workbenchLayoutDefaults.ideal);

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
    pushLog(`${activeFile.name}: opened Results window on ${tab}.`);
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
      pushLog('File name cannot be empty.', 'error');
      return;
    }

    const targetFile = files.find((file) => file.id === fileId);
    if (targetFile && targetFile.name === nextName) {
      cancelRenameFile();
      pushLog(`${nextName}: name unchanged.`);
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
    pushLog(`Workbench file renamed to ${nextName}.`, 'success');
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
      pushLog('File name cannot be empty.', 'error');
      renamingFileIdRef.current = null;
      renameSelectionModeRef.current = 'normal';
      setRenamingFileId(null);
      setRenameDraft('');
      return;
    }

    const targetFile = filesRef.current.find((file) => file.id === fileId);
    if (targetFile && targetFile.name === nextName) {
      cancelRenameFile();
      pushLog(`${nextName}: name unchanged.`);
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
    pushLog(`Workbench file renamed to ${nextName}.`, 'success');
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

  const deleteWorkbenchFile = (fileId: string) => {
    const index = files.findIndex((file) => file.id === fileId);
    const file = files[index];
    if (!file) return;

    captureUndoSnapshot('deleted file');
    cancelRuntimeFrame(fileId);
    delete standardRuntimeRef.current[fileId];
    delete idealRuntimeRef.current[fileId];

    const remainingFiles = files.filter((candidate) => candidate.id !== fileId);
    const nextActiveFile = fileId === activeFileId
      ? remainingFiles[Math.min(index, remainingFiles.length - 1)]
      : activeFile;

    setWorkbenchFiles(() => remainingFiles);
    setActiveFileId(nextActiveFile?.id ?? '');
    activeFileIdRef.current = nextActiveFile?.id ?? '';
    setSelectedPanel('preview');
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
    pushLog(`${file.name}: removed from the current workbench session.`, 'warning');
  };

  const requestDeleteWorkbenchFile = (file: WorkbenchFileState) => {
    if (pendingDeleteFileId === file.id) {
      deleteWorkbenchFile(file.id);
      return;
    }

    setPendingDeleteFileId(file.id);
    pushLog(`${file.name}: click Confirm Delete to remove this open file from the workbench session.`, 'warning');
  };

  const cancelDeleteWorkbenchFile = () => {
    setPendingDeleteFileId(null);
    setOpenFileMenuId(null);
  };

  const resetLayout = () => {
    if (
      activeFile.visiblePanels.length === 2 &&
      activeFile.visiblePanels.includes('preview') &&
      activeFile.visiblePanels.includes('realtime')
    ) {
      setOpenTopMenu(null);
      pushLog(`${activeFile.name}: layout is already using the default panels.`);
      return;
    }

    captureUndoSnapshot('reset layout');
    setWorkbenchFiles((current) =>
      current.map((file) =>
        file.id === activeFile.id
          ? {
              ...file,
              visiblePanels: ['preview', 'realtime'],
              ...(file.kind === 'ideal'
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
                title={option.hint}
              >
                <strong>{option.label}</strong>
                <span>{activeFile.pointsByRelation[option.key].length} pts</span>
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
                  aria-label={`Set ${scanTitle}`}
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
              <span className="studio-ideal-scan-key">{String(relationVariableKey)}</span>
            </div>
            <input
              className={scanSliderClass}
              type="range"
              min={scanMin}
              max={scanMax}
              step={scanStep}
              value={relationVariableValue}
              disabled={parameterControlsLocked}
              aria-label={`Adjust ${scanTitle}`}
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
            <div className="studio-ideal-scan-ticks" aria-label={`${scanTitle} recommended values`}>
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
      onClick={() => setOpenTopMenu((current) => (current === menu ? null : menu))}
    >
      {icon}
      <span>{label}</span>
      <ChevronDown size={12} />
    </button>
  );

  const renderTopMenu = () => {
    if (openTopMenu === 'new') {
      return (
        <div className="studio-command-menu studio-command-menu-new" ref={topMenuRef}>
          <button type="button" onClick={() => createFile('standard')}>
            <Activity size={14} />
            <span>{workbenchCopy.menus.standardStudy}</span>
          </button>
          <button type="button" onClick={() => createFile('ideal')}>
            <FlaskConical size={14} />
            <span>{workbenchCopy.menus.idealStudy}</span>
          </button>
        </div>
      );
    }

    if (openTopMenu === 'edit') {
      return (
        <div className="studio-command-menu studio-command-menu-edit" ref={topMenuRef}>
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
        <div className="studio-command-menu studio-command-menu-window" ref={topMenuRef}>
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
      const exportCopy = exportEnvironmentCopy[exportEnvironmentStatus];

      return (
        <div className="studio-command-menu studio-command-menu-settings" ref={topMenuRef}>
          <button type="button" onClick={openGeneralSettings}>
            <Settings size={14} />
            <span>{workbenchCopy.menus.general}</span>
            <strong>{`${settingsThemePreference} / ${settingsLanguagePreference}`}</strong>
          </button>
          <button type="button" onClick={() => handleAction('Performance mode')}>
            <Wrench size={14} />
            <span>{workbenchCopy.menus.performanceMode}</span>
          </button>
          <button type="button" onClick={() => pushLog(exportEnvironmentDetail ?? exportCopy.detail, exportAvailable ? 'info' : 'warning')}>
            <Download size={14} />
            <span>{workbenchCopy.menus.exportEnvironment}</span>
            <strong>{exportEnvironmentStatus}</strong>
          </button>
          <button type="button" onClick={saveCurrentWorkbenchLayoutAsDefault}>
            <Archive size={14} />
            <span>{workbenchCopy.menus.saveWorkbenchLayoutDefault}</span>
            <strong>{`${Math.round((activeFile.kind === 'ideal' ? workbenchLayoutDefaults.ideal.resultsHeightRatio : workbenchLayoutDefaults.standard.resultsHeightRatio) * 100)}% / ${Math.round((activeFile.kind === 'ideal' ? workbenchLayoutDefaults.ideal.liveWorkspaceSplitRatio : workbenchLayoutDefaults.standard.liveWorkspaceSplitRatio) * 100)}%`}</strong>
          </button>
        </div>
      );
    }

    if (openTopMenu === 'help') {
      return (
        <div className="studio-command-menu studio-command-menu-help" ref={topMenuRef}>
          <button type="button" onClick={() => handleAction('Open user guide')}>
            <BookOpen size={14} />
            <span>{workbenchCopy.menus.userGuide}</span>
          </button>
          <button type="button" onClick={() => handleAction('Open theory PDF')}>
            <FileText size={14} />
            <span>{workbenchCopy.menus.theoryPdf}</span>
          </button>
          <button type="button" onClick={() => handleAction('About workbench')}>
            <Archive size={14} />
            <span>{workbenchCopy.menus.about}</span>
          </button>
        </div>
      );
    }

    return null;
  };

  const renderEmptyStudyActions = (className = 'studio-empty-actions') => (
    <div className={className}>
      <button type="button" onClick={() => createFile('standard')}>
        <Activity size={14} />
        {workbenchCopy.files.createStandard}
      </button>
      <button type="button" onClick={() => createFile('ideal')}>
        <FlaskConical size={14} />
        {workbenchCopy.files.createIdeal}
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

  const renderPreviewPanel = () => (
    <div className="studio-preview">
      <div className="studio-preview-stage">
        <div className="studio-canvas-host">
          <SimulationCanvas
            particles={activeFile.particles}
            L={activeFile.kind === 'ideal' ? activeFile.activeParams.L : activeFile.appliedParams.L}
            r={activeFile.kind === 'ideal' ? activeFile.activeParams.r : activeFile.appliedParams.r}
            isRunning={activeFile.runState === 'running'}
            t={workbenchTranslation}
            isFocused={isCanvasFocused}
            onFocusChange={setIsCanvasFocused}
            showNotification={(text) => pushLog(`3D View: ${text}`)}
            supportsHover
            touchLike={false}
            isCompactLandscape={false}
            variant="workbench"
          />
        </div>
      </div>
      <div className="studio-preview-metrics">
        <div className="studio-metric"><span>Temperature</span><strong>{activeFile.stats.temperature.toFixed(3)}</strong></div>
        <div className="studio-metric"><span>Pressure</span><strong>{activeFile.stats.pressure.toFixed(4)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.meanSpeed}</span><strong>{activeFile.stats.meanSpeed.toFixed(3)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.finalState}</span><strong>{getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
      </div>
    </div>
  );

  const renderRealtimeHistogram = (title: string, bins: HistogramBin[], accent: 'blue' | 'violet') => {
    const compactBins = getCompactHistogramBins(bins);
    const maxProbability = Math.max(0.0001, ...compactBins.map((bin) => bin.probability), ...compactBins.map((bin) => bin.theoretical ?? 0));
    const sampleCount = getHistogramSampleCount(bins);

    return (
      <div className={`studio-live-chart studio-live-chart-${accent}`}>
        <div className="studio-live-chart-header">
          <span>{title}</span>
            <strong>{sampleCount > 0 ? workbenchCopy.results.samples(sampleCount) : workbenchCopy.results.waiting}</strong>
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
          <span>probability density</span>
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
          <span>{getRelationLabel(activeFile.relation)} pressure trace</span>
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
                  title={`t=${point.time.toFixed(2)} P=${point.measuredPressure.toFixed(4)} ideal=${point.idealPressure.toFixed(4)}`}
                >
                  <i style={{ height: `${measuredHeight}%` }} />
                  <em style={{ bottom: `${idealHeight}%` }} />
                </span>
              );
            })
          ) : (
            <div className="studio-live-chart-empty">Run the current ideal point to collect pressure windows.</div>
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
        <div><span>{workbenchCopy.results.gap}</span><strong>{summary?.relativeGap === null || summary?.relativeGap === undefined ? '--' : `${formatMetric(summary.relativeGap * 100, 2)}%`}</strong></div>
        <div><span>{workbenchCopy.results.status}</span><strong>{getLocalizedStatusValue(analysis?.verdictState ?? 'insufficient', workbenchCopy)}</strong></div>
        <div><span>{workbenchCopy.results.finalState}</span><strong>{activeFile.needsReset ? workbenchCopy.parameters.idealRuntimeOnStart : getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
      </div>
    );
  };

  const renderRealtimePanel = () => (
    <div className={`studio-realtime-panel ${activeFile.kind === 'ideal' ? 'studio-realtime-panel-ideal' : 'studio-realtime-panel-standard'}`}>
      <div className={`studio-realtime-summary ${activeFile.kind === 'ideal' ? 'studio-realtime-summary-ideal' : 'studio-realtime-summary-standard'}`}>
        {activeFile.kind === 'ideal' ? (
          <>
            <div title="Mean temperature"><span>T</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanTemperature ?? activeFile.stats.temperature)}</strong></div>
            <div title="Measured pressure"><span>Measured P</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanPressure ?? activeFile.stats.pressure, 4)}</strong></div>
            <div title="Ideal pressure"><span>Ideal P</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanIdealPressure, 4)}</strong></div>
            <div title="Relative gap"><span>Gap</span><strong>{activeFile.latestPressureSummary?.relativeGap === null || activeFile.latestPressureSummary?.relativeGap === undefined ? '--' : `${formatMetric(activeFile.latestPressureSummary.relativeGap * 100, 2)}%`}</strong></div>
            <div title="Active relation"><span>Relation</span><strong>{getRelationLabel(activeFile.relation)}</strong></div>
            <div title="Sampling progress"><span>Progress</span><strong>{formatPercent(activeFile.stats.progress)}</strong></div>
          </>
        ) : (
          <>
            <div><span>T</span><strong>{formatMetric(activeFile.stats.temperature)}</strong></div>
            <div><span>P</span><strong>{formatMetric(activeFile.stats.pressure, 4)}</strong></div>
            <div><span>v mean</span><strong>{formatMetric(activeFile.stats.meanSpeed)}</strong></div>
            <div><span>v rms</span><strong>{formatMetric(activeFile.stats.rmsSpeed)}</strong></div>
            <div><span>Phase</span><strong>{activeFile.stats.phase}</strong></div>
            <div><span>Progress</span><strong>{formatPercent(activeFile.stats.progress)}</strong></div>
          </>
        )}
      </div>
      <div className={`studio-live-charts ${activeFile.kind === 'ideal' ? 'studio-live-charts-ideal' : ''}`}>
        {activeFile.kind === 'standard' ? (
          <>
            {renderRealtimeHistogram('Speed distribution', activeFile.chartData.speed, 'blue')}
            {renderRealtimeHistogram('Energy distribution', activeFile.chartData.energy, 'violet')}
          </>
        ) : (
          <>
            {renderIdealPressureTrace()}
            {renderIdealRelationSnapshot()}
          </>
        )}
      </div>
    </div>
  );

  const renderExperimentPointsPanel = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>No experiment point table</strong>
            <p>Experiment points are available for ideal-gas files.</p>
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
                  {activeFile.relation === 'pt' ? <th>target T</th> : null}
                  {activeFile.relation === 'pv' ? <><th>L</th><th>V</th><th>1/V</th></> : null}
                  {activeFile.relation === 'pn' ? <th>N</th> : null}
                  <th>mean T</th>
                  <th>measured P</th>
                  <th>ideal P</th>
                  <th>gap</th>
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
                    <td>{formatMetric(point.relativeGap * 100, 2)}%</td>
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
        <svg viewBox="0 0 392 176" role="img" aria-label={`${getRelationLabel(analysis.relation)} verification chart`}>
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
          <span><i className="studio-ideal-legend-measured-dot" />measured</span>
          <span><i className="studio-ideal-legend-fit" />fit</span>
          <span><i className="studio-ideal-legend-theory" />theory</span>
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

  const exportAvailable = exportEnvironmentStatus === 'available-system' || exportEnvironmentStatus === 'available-bundled';
  const exportCopy = exportEnvironmentCopy[exportEnvironmentStatus];
  const currentResultsReady = activeFile.kind === 'ideal'
    ? Boolean(idealAnalysis && idealAnalysis.sortedPoints.length > 0)
    : resultSummary.ready;

  const handleExportAction = async (mode: WorkbenchExportMode) => {
    if (!currentResultsReady) {
      pushLog(`${activeFile.name}: result data is not ready for scientific export.`, 'warning');
      return;
    }

    if (
      activeFile.kind === 'ideal'
      && mode !== 'pointsCsv'
      && (!idealAnalysis || idealAnalysis.sortedPoints.length < 2)
    ) {
      pushLog(`${activeFile.name}: at least 2 points are required for a fitted report or figure export.`, 'warning');
      return;
    }

    const exportLabel =
      mode === 'report'
        ? 'report PDF'
        : mode === 'verificationFigure'
          ? 'verification figure'
          : mode === 'pointsCsv'
            ? 'points CSV'
            : 'result figures';
    const payload = createWorkbenchExportPayload(activeFile, mode, settingsLanguagePreference);
    const bridge = window.hardSphereLabExporter;

    if (!exportAvailable) {
      const detail = exportEnvironmentDetail ?? exportCopy.detail;
      pushLog(`${activeFile.name}: ${exportLabel} payload prepared as ${payload.filename}; ${detail}`, 'warning');
      return;
    }

    if (!bridge) {
      pushLog(`${activeFile.name}: ${exportLabel} payload prepared as ${payload.filename}; ${exportEnvironmentCopy.unavailable.detail}`, 'warning');
      return;
    }

    setExportInProgress(true);
    pushLog(`${activeFile.name}: preparing ${exportLabel} export...`, 'info');

    try {
      const result = await bridge.exportWorkbenchPayload(payload, {
        mode,
        fileName: activeFile.name,
        defaultDirName: `${activeFile.name} Export`,
      });

      if (result.status === 'cancelled') {
        pushLog(`${activeFile.name}: ${exportLabel} export cancelled.`, 'warning');
        return;
      }

      if (result.status !== 'ok') {
        pushLog(`${activeFile.name}: ${exportLabel} export failed: ${result.message ?? 'unknown exporter error'}`, 'error');
        return;
      }

      const fileCount = result.files?.length ?? 0;
      if (mode === 'pointsCsv') {
        pushLog(`${activeFile.name}: points CSV saved to ${result.files?.[0] ?? result.outDir ?? 'selected location'}.`, 'success');
        return;
      }

      const figureHint = mode === 'verificationFigure' || mode === 'figuresZip'
        ? ' Figure files are inside the figures subfolders.'
        : '';
      pushLog(`${activeFile.name}: ${exportLabel} exported to ${result.outDir ?? 'selected folder'} (${fileCount} files).${figureHint}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown exporter error';
      pushLog(`${activeFile.name}: ${exportLabel} export failed: ${message}`, 'error');
    } finally {
      setExportInProgress(false);
    }
  };

  const renderResultsSummary = () => {
    return (
      <div className="studio-results-section">
        <div className={`studio-result-status ${resultSummary.ready ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
          <strong>{resultSummary.ready ? 'Results ready' : 'Results not ready'}</strong>
          <span>
            {resultSummary.ready
              ? 'Final data has been captured for summary, tables, figures, and future report export.'
              : 'Run the standard simulation until the collecting phase finishes to prepare final result data.'}
          </span>
        </div>

        <div className="studio-analysis-grid">
          <div className="studio-analysis-cell"><span>Final time</span><strong>{formatMetric(resultSummary.finalTime, 2)} s</strong></div>
          <div className="studio-analysis-cell"><span>Final temperature</span><strong>{formatMetric(resultSummary.temperature)}</strong></div>
          <div className="studio-analysis-cell"><span>Final pressure</span><strong>{formatMetric(resultSummary.pressure, 4)}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.meanSpeed}</span><strong>{formatMetric(resultSummary.meanSpeed)}</strong></div>
          <div className="studio-analysis-cell"><span>RMS speed</span><strong>{formatMetric(resultSummary.rmsSpeed)}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.energyDrift}</span><strong>{resultSummary.energyDriftPercent === null ? '--' : `${formatMetric(resultSummary.energyDriftPercent, 4)}%`}</strong></div>
          <div className="studio-analysis-cell"><span>Speed bins</span><strong>{resultSummary.speedBinCount}</strong></div>
          <div className="studio-analysis-cell"><span>Energy bins</span><strong>{resultSummary.energyBinCount}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.tempSamples}</span><strong>{resultSummary.tempHistoryCount}</strong></div>
        </div>
      </div>
    );
  };

  const renderFinalFigurePreview = (figureId: string) => {
    if (!resultSummary.ready || !activeFile.finalChartData) {
      return <div className="studio-final-figure-empty">not ready</div>;
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
            <strong>Figures</strong>
            <span>Figure readiness, recommended filenames, and preview.</span>
          </div>
          <button
            type="button"
            disabled={!currentResultsReady || exportInProgress}
            onClick={() => handleExportAction('figuresZip')}
          >
            <FileArchive size={13} />
            Export Figures
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
                <span>{figure.status}</span>
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
            <strong>No ideal-gas points</strong>
            <p>Select an ideal-gas file to review experiment points.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="studio-ideal-child-window-body">
        <div className="studio-ideal-results-card">
          <div className="studio-ideal-results-card-header">
            <div>
              <strong>Experiment status</strong>
              <span>
                {getRelationLabel(activeFile.relation)} / {workbenchCopy.results.recordedPoints(idealAnalysis.sortedPoints.length)} / {getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy)}
              </span>
            </div>
          </div>
          <div className="studio-ideal-results-status-grid">
            <div><span>Active</span><strong>{getRelationLabel(activeFile.relation)}</strong></div>
            <div><span>Points</span><strong>{idealAnalysis.sortedPoints.length}</strong></div>
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
            <strong>No ideal-gas verification</strong>
            <p>Select an ideal-gas file to review verification results.</p>
          </div>
        </div>
      );
    }

    const verificationSpec = figureSpecs.find((figure) => figure.id === 'ideal-verification');
    const rawPvSpec = figureSpecs.find((figure) => figure.id === 'ideal-raw-pv');
    const pointsSpec = figureSpecs.find((figure) => figure.id === 'ideal-points');
    const historySpec = figureSpecs.find((figure) => figure.id === 'ideal-history');
    const historyContent = getIdealHistoryContent('en-GB', activeFile.relation);
    const failureReasonText = getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, 'en-GB');
    const recommendationText = getIdealRecommendationText(
      idealAnalysis.diagnosis.failureReason,
      idealAnalysis.verdictState,
      activeFile.relation,
      'en-GB',
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
              <strong>{idealAnalysis.isVerified ? historyContent.title : `History locked for ${getRelationLabel(activeFile.relation)}`}</strong>
              <span>{idealAnalysis.isVerified ? 'Unlocked by verified experiment data.' : 'Unlocks after a successful verification.'}</span>
            </div>
          </div>
          {idealAnalysis.isVerified ? (
            <div className="studio-ideal-history-grid">
              <div>
                <span>Historical context</span>
                <strong>{historyContent.discovery}</strong>
              </div>
              <div>
                <span>Workbench interpretation</span>
                <strong>{historyContent.simulation}</strong>
              </div>
              <div>
                <span>Key figures</span>
                <strong>R2 {formatMaybeMetric(idealAnalysis.regression.rSquared, 5)} / slope error {idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`}</strong>
              </div>
            </div>
          ) : (
            <div className="studio-ideal-history-grid">
              <div>
                <span>Why it is locked</span>
                <strong>{failureReasonText}</strong>
              </div>
              <div>
                <span>Recommended next step</span>
                <strong>{recommendationText}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="studio-ideal-results-card">
          <div className="studio-ideal-results-card-header">
            <div>
              <strong>Export</strong>
              <span>{exportCopy.label}</span>
            </div>
          </div>
          <div className="studio-ideal-export-actions">
            <button type="button" disabled={!currentResultsReady || exportInProgress} onClick={() => handleExportAction('report')}>
              <Download size={13} />
              Report PDF
            </button>
            <button type="button" disabled={!currentResultsReady || exportInProgress} onClick={() => handleExportAction('verificationFigure')}>
              <BarChart3 size={13} />
              Verification Figure
            </button>
            <button type="button" disabled={!currentResultsReady || exportInProgress} onClick={() => handleExportAction('pointsCsv')}>
              <Table2 size={13} />
              Points CSV
            </button>
          </div>
          <div className="studio-ideal-export-files">
            {verificationSpec ? <div><span>Verification</span><strong>{verificationSpec.recommendedFilename}</strong></div> : null}
            {rawPvSpec ? <div><span>Raw P-V</span><strong>{rawPvSpec.recommendedFilename}</strong></div> : null}
            {pointsSpec ? <div><span>Points CSV</span><strong>{pointsSpec.recommendedFilename}</strong></div> : null}
            {historySpec ? <div><span>History</span><strong>{historySpec.recommendedFilename}</strong></div> : null}
          </div>
          <div className="studio-figure-list studio-ideal-export-specs">
            {exportSpecs.map((figure) => (
              <div className="studio-figure-row" key={`ideal-export-${figure.id}`}>
                <div>
                  <strong>{figure.title}</strong>
                  <small>{figure.recommendedFilename}</small>
                </div>
                <span>{figure.dataCount}</span>
                <em className={`studio-figure-status-${figure.status}`}>{figure.status}</em>
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
              disabled={!currentResultsReady || exportInProgress}
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
            <strong>No verification chart</strong>
            <p>Verification charts are available for ideal-gas files.</p>
          </div>
        </div>
      );
    }

    const failureReasonText = getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, 'en-GB');
    const recommendationText = getIdealRecommendationText(
      idealAnalysis.diagnosis.failureReason,
      idealAnalysis.verdictState,
      activeFile.relation,
      'en-GB',
    );
    const isPvVerification = activeFile.relation === 'pv';

    return (
      <div className={`studio-verification-panel studio-verification-panel-${activeFile.relation}`}>
        <div className={`studio-verification-main-layout ${isPvVerification ? 'studio-verification-layout-pv' : 'studio-verification-layout-single'}`}>
          <div className="studio-verification-chart-column">
            <section className="studio-verification-chart-section studio-verification-chart-primary">
              <div className="studio-results-subheader">
                <div>
                  <strong>{isPvVerification ? 'P - 1/V linearized validation' : `${getRelationLabel(activeFile.relation)} validation`}</strong>
                  <span>Measured scatter with fit and theoretical reference.</span>
                </div>
              </div>
              {renderIdealValidationChart(idealAnalysis)}
            </section>

            {isPvVerification ? (
              <section className="studio-verification-chart-section studio-verification-chart-secondary">
                <div className="studio-results-subheader">
                  <div>
                    <strong>Original P - V physical view</strong>
                    <span>Shows the inverse relation directly while verdict uses the linearized view.</span>
                  </div>
                </div>
                {renderIdealValidationChart(idealAnalysis, 'pvRaw')}
              </section>
            ) : null}
          </div>

          <div className="studio-verification-side">
            <div className={`studio-result-status ${idealAnalysis.isVerified ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
              <strong>{getRelationLabel(activeFile.relation)} verdict: {idealAnalysis.verdictState}</strong>
              <span>{getIdealRecommendationText(idealAnalysis.diagnosis.failureReason, idealAnalysis.verdictState, activeFile.relation, 'en-GB')}</span>
            </div>

            <div className="studio-analysis-grid">
              <div className="studio-analysis-cell"><span>Points</span><strong>{idealAnalysis.sortedPoints.length}</strong></div>
              <div className="studio-analysis-cell"><span>R2</span><strong>{formatMaybeMetric(idealAnalysis.regression.rSquared, 5)}</strong></div>
              <div className="studio-analysis-cell"><span>Slope</span><strong>{formatMaybeMetric(idealAnalysis.regression.slope, 6)}</strong></div>
              <div className="studio-analysis-cell"><span>Theory slope</span><strong>{formatMaybeMetric(idealAnalysis.theoreticalSlope, 6)}</strong></div>
              <div className="studio-analysis-cell"><span>Slope error</span><strong>{idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`}</strong></div>
              <div className="studio-analysis-cell"><span>Failure reason</span><strong>{idealAnalysis.diagnosis.failureReason ?? 'none'}</strong></div>
            </div>

            <div className="studio-ideal-diagnosis-card">
              <div>
                <span>Why it happened</span>
                <strong>{failureReasonText}</strong>
              </div>
              <div>
                <span>Recommended next step</span>
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
            <p><strong>{getIdealHistoryContent('en-GB', activeFile.relation).title}</strong></p>
            <p>{getIdealHistoryContent('en-GB', activeFile.relation).discovery}</p>
            <p>{getIdealHistoryContent('en-GB', activeFile.relation).simulation}</p>
            <p>Current verification: R2 {formatMaybeMetric(idealAnalysis.regression.rSquared, 5)}, slope error {idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`}.</p>
          </>
        ) : (
          <>
            <p><strong>History locked for {getRelationLabel(activeFile.relation)}.</strong></p>
            <p>{getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, 'en-GB')}</p>
            <p>Current verdict: {idealAnalysis.verdictState}. Recommendation: {getIdealRecommendationText(idealAnalysis.diagnosis.failureReason, idealAnalysis.verdictState, activeFile.relation, 'en-GB')}</p>
          </>
        )}
      </div>
    ) : (
      <div className="studio-empty">
        <div>
          <strong>No ideal-gas history</strong>
          <p>History unlocks after ideal-gas verification.</p>
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
    if (panel.key === 'history') return renderHistoryPanel();
    return (
      <div className="studio-empty">
        <div>
          <strong>Panel not connected</strong>
          <p>This panel will be wired in a later Workbench integration batch.</p>
        </div>
      </div>
    );
  };

  const renderDockHeader = (panel: PanelDefinition) => (
    <div className="studio-dock-header">
      <div>
        <span>{panel.title}</span>
        <small>{panel.hint}</small>
      </div>
      {panel.key === 'preview' ? (
        <div className="studio-panel-actions">
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
          {(activeFile.runState === 'running' || activeFile.runState === 'paused') ? (
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
        aria-label="Ideal result window"
      >
        <section
          className={`studio-ideal-result-window-layer ${selectedPanel === activePanel.key ? 'studio-ideal-result-window-selected' : ''}`}
          style={{ height: `${clampIdealResultHeightRatio(layout.heightRatio) * 100}%` }}
          aria-label="Ideal Results window"
        >
          <div
            className="studio-ideal-result-window-resizer"
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={startIdealResultWindowResize}
          />
          <div className="studio-results-toolbar studio-ideal-result-window-toolbar">
            <div className="studio-results-title">
              <strong>Results</strong>
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
          <div className="studio-results-tabs studio-ideal-results-tabs" role="tablist" aria-label="Ideal Results sections">
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

  const resolvedWorkbenchTheme = settingsThemePreference === 'system' ? 'dark' : settingsThemePreference;

  return (
    <div className={`studio-workbench studio-theme-${resolvedWorkbenchTheme}`} data-workbench-language={settingsLanguagePreference}>
      {scanInputToast ? (
        <div className="studio-scan-input-toast" role="status">
          {scanInputToast}
        </div>
      ) : null}
      <div className="studio-shell">
        <header className="studio-menu">
          <div className="studio-brand">
            <span className="studio-brand-mark">
              <img src="/appfig.png" alt="" />
            </span>
            <span>Hard Sphere Workbench</span>
          </div>
          <nav className="studio-top-commands" aria-label="Top commands" ref={topCommandsRef}>
            {renderTopCommand('new', workbenchCopy.menus.newStudy, <FilePlus2 size={14} />)}
            {renderTopCommand('edit', workbenchCopy.menus.edit, <Undo2 size={14} />)}
            {renderTopCommand('window', workbenchCopy.menus.window, <Wrench size={14} />)}
            {renderTopCommand('settings', workbenchCopy.menus.settings, <Settings size={14} />)}
            {renderTopCommand('help', workbenchCopy.menus.help, <BookOpen size={14} />)}
          </nav>
          {renderTopMenu()}
        </header>
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
                        onKeyDown={(event) => handleSectionKeyDown(event, () => selectFile(file))}
                      >
                        {file.kind === 'standard' ? <Activity size={13} /> : <FlaskConical size={13} />}
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
                          aria-label={`Open actions for ${file.name}`}
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
                {renderSectionTitle(isWorkbenchEmpty ? `${workbenchCopy.files.noOpenFiles} / ${workbenchCopy.files.panels}` : `${activeFile.name} / ${workbenchCopy.files.panels}`, panelsSectionCollapsed, () => setPanelsSectionCollapsed((current) => !current))}
                <div className={`studio-tree-section-content ${panelsSectionCollapsed ? 'studio-tree-section-content-collapsed' : ''}`} aria-hidden={panelsSectionCollapsed}>
                {isWorkbenchEmpty ? (
                  <div className="studio-empty-panel-tree">
                    <span>{workbenchCopy.files.emptyHint}</span>
                  </div>
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
                        title={locked ? panel.hint : panel.key === 'results' ? `${panel.hint}. Click to select, double-click to open.` : `${panel.hint}. Double-click to open.`}
                      >
                        {panel.key === 'results' ? (
                          <button
                            type="button"
                            className={`studio-results-folder-button ${resultsChildrenCollapsed ? 'studio-tree-title-collapsed' : ''}`}
                            aria-label={resultsChildrenCollapsed ? 'Expand Results sections' : 'Collapse Results sections'}
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
                        <div className="studio-results-nav studio-ideal-results-nav">
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
                              title="Open this ideal Results tab."
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
                        <div className="studio-results-nav">
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
                              title="Double-click to open Results and jump to this section."
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

          <section className="studio-layout" aria-label="File workspace">
            <div className="studio-file-tabs">
              {isWorkbenchEmpty ? (
                <div className="studio-file-tabs-empty">{workbenchCopy.files.noOpenFiles}</div>
              ) : files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className={`studio-file-tab ${file.id === activeFile.id ? 'studio-file-tab-active' : ''}`}
                  onClick={() => selectFile(file)}
                >
                  {file.kind === 'standard' ? <Activity size={13} /> : <FlaskConical size={13} />}
                  <span>{file.name}</span>
                  <span className="studio-file-kind">{file.kind === 'standard' ? workbenchCopy.files.std : workbenchCopy.files.ideal}</span>
                </button>
              ))}
            </div>

            <div className={`studio-workspace-shell ${isWorkbenchEmpty ? 'studio-workspace-shell-empty' : 'studio-workspace-shell-active'} ${!isWorkbenchEmpty && parametersCollapsed ? 'studio-params-collapsed' : ''}`}>
              <div
                className={`studio-center-workspace ${!isWorkbenchEmpty ? 'studio-center-workspace-active' : ''} ${!isWorkbenchEmpty && (resultsPanel || idealResultPanels.length > 0) ? 'studio-results-open' : ''} ${isWorkbenchEmpty ? 'studio-center-workspace-empty' : ''}`}
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
                        aria-label="Resize 3D Preview and Realtime Data"
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
                    <strong>{activeFile.kind === 'standard' ? workbenchCopy.parameters.standardSimulation : workbenchCopy.parameters.idealSimulation}</strong>
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

        <section className="studio-console" aria-label={workbenchCopy.console.title}>
          <div className="studio-console-header">
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

