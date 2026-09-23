import type { ExperimentRelation, SimulationStats } from '../../shared/types.ts';
import type { ExperimentParamKey } from '../../domain/idealGas/idealGasExperiment.ts';
import type { WorkbenchLanguagePreference, WorkbenchPerformanceMode, WorkbenchThemePreference } from './workbenchGeneralSettings.ts';
import type { IdealSamplingPresetKey } from './workbenchIdealControls.ts';
import type { WorkbenchExportEnvironmentStatus } from './workbenchFileState.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchExportMode } from './workbenchResults.ts';

type ConsoleTab = 'logs' | 'warnings' | 'summary';

export interface WorkbenchCopy {
  menus: {
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
    heatCapacityPistonOscillationStudy: string;
    undo: string;
    redo: string;
    empty: string;
    clearEditHistory: string;
    panelsFor: (name: string) => string;
    resetDefaultLayout: string;
    default: string;
    saveWorkbenchLayoutDefault: string;
    userGuide: string;
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
    audio: string;
    audioHint: string;
    audioMuteAria: string;
    audioUnmuteAria: string;
    audioVolumeAria: string;
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
    openBuildNotice: string;
    closeBuildNotice: string;
    buildNoticeTitle: string;
    buildNoticeSubtitle: string;
    buildNoticeNavToggle: string;
    buildNoticeNavTitle: string;
    buildNoticeBack: string;
    buildNoticeOpenLocalFile: string;
    buildNoticeOpenInBrowser: string;
    buildNoticeLargeFileBody: string;
    buildNoticePreviewUnavailable: string;
    buildNoticeOpenUnavailable: string;
    checking: string;
    available: string;
    unavailable: string;
    error: string;
    environmentResultTitle: string;
    environmentResultAvailable: string;
    environmentResultUnavailable: string;
    environmentResultError: string;
    updateResultTitle: string;
    updateAvailableTitle: string;
    updateCheckFailedTitle: string;
    updateAvailableBody: string;
    updateCheckFailedBody: string;
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
    retryCheck: string;
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
    createHeatCapacityPistonOscillation: string;
    rename: string;
    delete: string;
    confirmDelete: string;
    closeExperiment: string;
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
    usageHintAria: string;
    clickSelectHint: string;
    doubleClickOpenHint: string;
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
    standardReadonlyNote: string;
    idealReadonlyNote: string;
    heatCapacityReadonlyNote: string;
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
    exportTables: string;
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

export const workbenchCopies: Record<WorkbenchLanguagePreference, WorkbenchCopy> = {
  'zh-CN': {
    menus: {
      experimentFiles: '实验文件', newWindow: '新窗口', newExperiment: '新建实验', openExperiment: '打开实验', noCachedExperiments: '没有可打开的缓存实验', edit: '编辑', window: '窗口', settings: '设置', help: '帮助', general: '通用',
      standardStudy: '标准模拟研究', idealStudy: '理想气体模拟研究', heatCapacityStudy: '空气热容比（绝热膨胀法）', heatCapacityPistonOscillationStudy: '空气热容比（活塞振动法）', undo: '撤销', redo: '重做', empty: '空',
      clearEditHistory: '清空编辑历史', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '恢复默认布局', default: '默认',
      saveWorkbenchLayoutDefault: '保存当前窗口布局为默认',
      userGuide: '用户指南', about: '关于气律实验室', topCommandsAria: '顶部命令',
    },
    settings: {
      title: '通用设置', subtitle: '主题、语言、音效、快捷键和布局偏好', closeAria: '关闭通用设置', theme: '主题', themeHint: '使用系统、亮色或暗色模式',
      themeOptions: { system: { label: '跟随系统', hint: '遵循系统偏好' }, light: { label: '亮色', hint: '亮色工作区预览' }, dark: { label: '暗色', hint: '暗色工作区预览' } },
      language: '语言', languageHint: '选择界面语言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '简体中文界面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D 性能模式',
      performanceModeHint: '用四档模式控制 Heat Capacity 小球数量、速率和运行负载',
      performanceModeSummary: { lowLoad: '低负载', balanced: '均衡', highPerformance: '高性能', ultra: '极致画质' },
      audio: '音效',
      audioHint: '增强仪器操作反馈，仅调节软件内音量',
      audioMuteAria: '静音软件音效',
      audioUnmuteAria: '取消静音软件音效',
      audioVolumeAria: '软件音效音量',
    },
    about: {
      title: '关于气律实验室',
      subtitle: '气律实验室',
      closeAria: '关闭关于窗口',
      currentVersion: '当前版本',
      checkUpdates: '检查更新',
      localDataExportEnvironment: '本地数据导出环境',
      workspaceSessionCache: '工作区会话缓存',
      buildNotes: '构建说明',
      openBuildNotice: '打开权限说明与第三方开源许可',
      closeBuildNotice: '关闭权限说明与第三方开源许可',
      buildNoticeTitle: '权限说明与第三方开源许可',
      buildNoticeSubtitle: '本机权限、本地数据、网络访问和第三方许可',
      buildNoticeNavToggle: '打开或收起声明目录',
      buildNoticeNavTitle: '声明目录',
      buildNoticeBack: '返回权限说明',
      buildNoticeOpenLocalFile: '打开完整本地文件',
      buildNoticeOpenInBrowser: '在浏览器中打开',
      buildNoticeLargeFileBody: '该许可材料内容较长，已随软件安装包完整提供。请使用下方按钮在系统浏览器或默认查看器中打开完整本地文件。',
      buildNoticePreviewUnavailable: '当前环境无法直接预览该材料，请打开完整本地文件查看。',
      buildNoticeOpenUnavailable: '当前环境无法打开本地文件。',
      checking: '正在检查',
      available: '可用',
      unavailable: '不可用',
      error: '检查失败',
      environmentResultTitle: '本地环境检查完成',
      environmentResultAvailable: '本地数据导出环境可用。',
      environmentResultUnavailable: '本地数据导出环境不可用，当前环境不能直接导出 PDF / 图像。',
      environmentResultError: '本地数据导出环境检查失败。模拟、实时图表和结果预览仍可使用。',
      updateResultTitle: '更新检查完成',
      updateAvailableTitle: '发现可用更新',
      updateCheckFailedTitle: '更新检查失败',
      updateAvailableBody: '新版本已发布，可以立即下载并准备安装。',
      updateCheckFailedBody: '尚未取得最新版本信息。请重新检查，或打开受信任的最新发布页手动安装。',
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
      retryCheck: '重新检查',
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
      sessionCacheSummary: (total) => '当前会话包含 ' + total + ' 个实验文件',
      sessionCacheBreakdown: (ideal, heat, standard) => '理想/比热/标准：' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: '打开文件', files: '文件', panels: '面板', noOpenFiles: '没有打开的文件', noOpenFileState: '当前没有打开的实验文件', noOpenPanelState: '打开实验后显示可用面板。', emptyHint: '在主工作区新建或打开实验。',
      noOpenStudy: '没有打开的研究', emptyTitle: '开始新的实验工作区', emptyBody: '创建标准模拟、理想气体关系研究或空气比热容比实验，以恢复预览、图表、结果和参数面板。',
      createStandard: '创建标准模拟研究', createIdeal: '创建理想气体模拟研究', createHeatCapacity: '创建空气热容比（绝热膨胀法）', createHeatCapacityPistonOscillation: '创建空气热容比（活塞振动法）', rename: '重命名', delete: '删除', confirmDelete: '确认删除', closeExperiment: '关闭实验', cancel: '取消',
      locked: '锁定', shown: '显示', open: '打开', active: '活动', off: '关闭', std: '标准', ideal: '理想', heat: '热容', workspaceAria: '文件工作区', usageHintAria: '文件树操作提示', clickSelectHint: '单击选中', doubleClickOpenHint: '双击打开', openActions: (name) => '打开 ' + name + ' 的操作菜单',
    },
    panels: {
      previewTitle: '3D 预览', previewHint: '实时分子视口', realtimeTitle: '实时数据 / 图表', heatRealtimeTitle: '实时数据', standardRealtimeHint: '实时温度、压力和图表轨迹', idealRealtimeHint: '实时 T、P、关系和图表轨迹', heatRealtimeHint: 'Uₜ / Uₚ、压强和过程采样',
      standardResultsTitle: '结果', standardResultsHint: '实验状态、数据表和图像', idealResultsTitle: '结果', idealResultsHint: '验证图、历史解锁和导出详情',
      pointsTitle: '实验数据记录', pointsHint: '已记录的关系实验点', verificationTitle: '关系验证分析', verificationHint: '验证图、诊断和导出详情',
      summaryTitle: '摘要', dataTableTitle: '数据表', figuresTitle: '图像', liveWorkspaceResizeAria: '调整视图预览和实时数据区域大小',
    },
    parameters: {
      title: '当前参数', currentFileValues: '当前文件值', lockedUntilStopped: '停止或完成前锁定',
      standardSimulation: '标准模拟', idealSimulation: '理想气体模拟', heatCapacityExperiment: '空气比热容比实验', savedChangesOnStart: '启动时已保存参数', idealRuntimeOnStart: '理想运行时将在开始时连接', applied: '参数已应用',
      relation: '关系', scanVariable: '扫描变量', samplingPreset: '采样预设', targetTemperature: '目标温度', boxLength: '盒长 L', particleCount: '粒子数 N', customPreset: '自定义', setSamplingPrecision: '设置采样精度', relationHints: { pt: '固定 N 和 V 扫描温度', pv: '通过盒长 L 扫描体积', pn: '固定 T 和 V 扫描粒子数' }, setScanValue: (title) => '设置' + title, adjustScanValue: (title) => '调整' + title, recommendedValues: (title) => title + '推荐值',
      parameterLabels: { N: '粒子数量', r: '粒子半径', L: '容器边长', m: '粒子质量', k: '玻尔兹曼常数', dt: '时间步长', nu: '碰撞频率', targetTemperature: '目标温度', equilibriumTime: '平衡时间', statsDuration: '统计时长', relation: '关系' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '稳定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 统计',
      advancedSettings: '高级设置', advancedShow: '显示模型常数和采样值', advancedHide: '隐藏模型常数和采样值', edit: '编辑',
      standardReadonlyNote: '标准模拟参数在这里直接显示。', idealReadonlyNote: '关系、扫描变量和采样预设在上方控制。', heatCapacityReadonlyNote: '粒子动画仅用于可视化气体分子运动状态；最终比热容比按空气比热容比实验模型计算。', controlledLockHint: '当前关系已有数据，受控变量已锁定。',
    },
    results: {
      title: '结果', experimentStatus: '实验状态', scan: '扫描', temperature: '温度', pressure: '压强', measuredPressure: '实测 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 点', pointsShort: (count) => count + ' 点', recordedPoints: (count) => count + ' 个记录点',
      clearRelation: '清空关系', confirmClear: '确认清空', remove: '移除', confirmRemove: '确认移除', cancel: '取消', noPoints: '没有点', runToRecord: '运行实验以记录点。', tableAction: '操作', tableTime: '时间',
      finalState: '最终状态', meanSpeed: '平均速度', measuredBars: '实测柱', idealLine: '理想线', samples: (count) => count + ' 个样本', sampleWindows: (count) => count + ' 次采样', waiting: '等待中', finalSpeedSamples: '最终速度样本', finalEnergySamples: '最终能量样本', tempHistorySamples: '温度历史样本', finalDataReady: '最终数据就绪', energyDrift: '能量漂移', meanAbsTempError: '平均绝对温度误差', tempSamples: '温度样本', resultsReady: (relation) => relation + ' 实验结果已就绪', waitingForRecordedPoints: (relation) => relation + ' 等待记录点',
      metric: '指标', value: '值', status: '状态', ready: '就绪', notReady: '未就绪', yes: '是', no: '否', diagnostic: '诊断', export: '导出', exportAll: '总导出', exportFigures: '导出图像', exportTables: '导出数据表', reportPdf: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV', verification: '验证', rawPv: '原始 P-V', history: '历史',
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
      unavailable: { label: '桌面导出桥接不可用', detail: '当前环境不能直接导出 PDF/图像。请在气律实验室桌面程序中使用本地导出。' },
      error: { label: '导出环境异常', detail: '导出器检测失败。模拟、实时图表和结果预览仍可使用。' },
    },
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '默认布局：3D 预览、实时数据 / 图表、当前参数。', standardConnected: '标准模拟运行时、3D 预览和实时图表数据已连接。', exportBridgeRequired: '科学 PDF 导出需要桌面运行时桥接。', autoPausedSingleRuntime: (name) => name + '：由于一次只能运行一个工作台运行时，已自动暂停。', autoPausedCreateFile: (name) => name + '：创建新文件时已自动暂停。', autoPausedSwitchFile: (name) => name + '：切换文件时已自动暂停。', fileCreated: (name) => '已创建工作台文件：' + name, lockedPanel: (title) => title + ' 是默认工作区的一部分，不能隐藏。', layoutReset: (name) => name + '：布局已恢复为 3D 预览 + 实时数据 / 图表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 打开理想结果窗口。', standardResultsOpened: (name, tab) => name + '：已打开结果窗口并切换到 ' + tab + '。', idealResultsClosed: (name) => name + '：已关闭理想结果窗口。', fileSelected: (name) => '已选择文件标签：' + name, confirmClear: (name, relation) => name + '：点击确认清空以删除全部 ' + relation + ' 点。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 点。', exportLabels: { completeBundle: '总导出', report: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV', figuresZip: '结果图像', tablesCsv: '数据表 CSV' }, exportNotReady: (name) => name + '：结果数据尚未满足导出条件。', exportNeedsTwoPoints: (name) => name + '：拟合报告或验证图至少需要 2 个记录点。', exportPayloadPrepared: (name, label, filename, detail) => name + '：' + label + ' 载荷已准备为 ' + filename + '；' + detail, exportPreparing: (name, label) => name + '：正在准备导出 ' + label + '。', exportCancelled: (name, label) => name + '：已取消导出 ' + label + '。', exportFailed: (name, label, message) => name + '：' + label + ' 导出失败：' + message, exportCsvSaved: (name, target) => name + '：点 CSV 已保存到 ' + target + '。', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + '：' + label + ' 已导出到 ' + outDir + '（' + fileCount + ' 个文件）。' + figureHint, exportFigureHint: '图像已保存到所选导出文件夹。', unknownExporterError: '未知导出器错误', selectedLocation: '选定位置', selectedFolder: '选定文件夹', fileNameCannotBeEmpty: '文件名不能为空。', fileNameUnchanged: (name) => name + '：名称未改变。', fileRenamed: (name) => '工作台文件已重命名为 ' + name + '。', fileRemoved: (name) => name + '：已从当前工作台会话移除。', fileClosed: (name) => name + '：已关闭并保留在本地缓存。', fileOpenedFromCache: (name) => '已从本地缓存打开实验：' + name, confirmDeleteFile: (name) => name + '：点击确认删除以从工作台会话移除此打开文件。', layoutAlreadyDefault: (name) => name + '：布局已经使用默认面板。', ...experimentLogCopies['zh-CN'] },
  },
  'zh-TW': {
    menus: {
      experimentFiles: '實驗檔案', newWindow: '新視窗', newExperiment: '新增實驗', openExperiment: '開啟實驗', noCachedExperiments: '沒有可開啟的快取實驗', edit: '編輯', window: '視窗', settings: '設定', help: '說明', general: '一般',
      standardStudy: '標準模擬研究', idealStudy: '理想氣體模擬研究', heatCapacityStudy: '空氣熱容比（絕熱膨脹法）', heatCapacityPistonOscillationStudy: '空氣熱容比（活塞振動法）', undo: '復原', redo: '重做', empty: '空',
      clearEditHistory: '清除編輯記錄', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '還原預設版面', default: '預設',
      saveWorkbenchLayoutDefault: '將目前視窗版面存為預設',
      userGuide: '使用指南', about: '關於氣律實驗室', topCommandsAria: '頂部命令',
    },
    settings: {
      title: '一般設定', subtitle: '主題、語言、音效、快捷鍵與版面偏好', closeAria: '關閉一般設定', theme: '主題', themeHint: '使用系統、亮色或暗色模式',
      themeOptions: { system: { label: '跟隨系統', hint: '依照系統偏好' }, light: { label: '亮色', hint: '亮色工作區預覽' }, dark: { label: '暗色', hint: '暗色工作區預覽' } },
      language: '語言', languageHint: '選擇介面語言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '簡體中文介面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D 效能模式',
      performanceModeHint: '用四檔模式控制 Heat Capacity 小球數量、速率和運行負載',
      performanceModeSummary: { lowLoad: '低負載', balanced: '均衡', highPerformance: '高效能', ultra: '極致畫質' },
      audio: '音效',
      audioHint: '增強儀器操作回饋，僅調整軟體內音量',
      audioMuteAria: '將軟體音效靜音',
      audioUnmuteAria: '取消軟體音效靜音',
      audioVolumeAria: '軟體音效音量',
    },
    about: {
      title: '關於氣律實驗室',
      subtitle: '氣律實驗室',
      closeAria: '關閉關於視窗',
      currentVersion: '目前版本',
      checkUpdates: '檢查更新',
      localDataExportEnvironment: '本地資料匯出環境',
      workspaceSessionCache: '工作區工作階段快取',
      buildNotes: '建置說明',
      openBuildNotice: '打開權限說明與第三方開源授權',
      closeBuildNotice: '關閉權限說明與第三方開源授權',
      buildNoticeTitle: '權限說明與第三方開源授權',
      buildNoticeSubtitle: '本機權限、本機資料、網路存取和第三方授權',
      buildNoticeNavToggle: '打開或收起聲明目錄',
      buildNoticeNavTitle: '聲明目錄',
      buildNoticeBack: '返回權限說明',
      buildNoticeOpenLocalFile: '開啟完整本機文件',
      buildNoticeOpenInBrowser: '在瀏覽器中開啟',
      buildNoticeLargeFileBody: '該授權材料內容較長，已隨軟體安裝包完整提供。請使用下方按鈕在系統瀏覽器或預設檢視器中開啟完整本機文件。',
      buildNoticePreviewUnavailable: '目前環境無法直接預覽該材料，請開啟完整本機文件查看。',
      buildNoticeOpenUnavailable: '目前環境無法開啟本機文件。',
      checking: '正在檢查',
      available: '可用',
      unavailable: '不可用',
      error: '檢查失敗',
      environmentResultTitle: '本地環境檢查完成',
      environmentResultAvailable: '本地資料匯出環境可用。',
      environmentResultUnavailable: '本地資料匯出環境不可用，目前環境不能直接匯出 PDF / 圖像。',
      environmentResultError: '本地資料匯出環境檢查失敗。模擬、即時圖表和結果預覽仍可使用。',
      updateResultTitle: '更新檢查完成',
      updateAvailableTitle: '發現可用更新',
      updateCheckFailedTitle: '更新檢查失敗',
      updateAvailableBody: '新版本已發布，可以立即下載並準備安裝。',
      updateCheckFailedBody: '尚未取得最新版本資訊。請重新檢查，或開啟受信任的最新發布頁手動安裝。',
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
      retryCheck: '重新檢查',
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
      sessionCacheSummary: (total) => '目前工作階段包含 ' + total + ' 個實驗檔案',
      sessionCacheBreakdown: (ideal, heat, standard) => '理想/熱容比/標準：' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: '開啟檔案', files: '檔案', panels: '面板', noOpenFiles: '沒有開啟的檔案', noOpenFileState: '目前沒有開啟的實驗檔案', noOpenPanelState: '開啟實驗後顯示可用面板。', emptyHint: '在主工作區建立或開啟實驗。',
      noOpenStudy: '沒有開啟的研究', emptyTitle: '開始新的實驗工作區', emptyBody: '建立標準模擬、理想氣體關係研究或空氣比熱容比實驗，以恢復預覽、圖表、結果和參數面板。',
      createStandard: '建立標準模擬研究', createIdeal: '建立理想氣體模擬研究', createHeatCapacity: '建立空氣熱容比（絕熱膨脹法）', createHeatCapacityPistonOscillation: '建立空氣熱容比（活塞振動法）', rename: '重新命名', delete: '刪除', confirmDelete: '確認刪除', closeExperiment: '關閉實驗', cancel: '取消',
      locked: '鎖定', shown: '顯示', open: '開啟', active: '作用中', off: '關閉', std: '標準', ideal: '理想', heat: '熱容', workspaceAria: '檔案工作區', usageHintAria: '檔案樹操作提示', clickSelectHint: '單擊選取', doubleClickOpenHint: '雙擊開啟', openActions: (name) => '開啟 ' + name + ' 的操作選單',
    },
    panels: {
      previewTitle: '3D 預覽', previewHint: '即時分子視口', realtimeTitle: '即時資料 / 圖表', heatRealtimeTitle: '即時資料', standardRealtimeHint: '即時溫度、壓力和圖表軌跡', idealRealtimeHint: '即時 T、P、關係和圖表軌跡', heatRealtimeHint: 'Uₜ / Uₚ、壓強和過程採樣',
      standardResultsTitle: '結果', standardResultsHint: '實驗狀態、資料表和圖像', idealResultsTitle: '結果', idealResultsHint: '驗證圖、歷史解鎖和匯出詳情',
      pointsTitle: '實驗資料記錄', pointsHint: '已記錄的關係實驗點', verificationTitle: '關係驗證分析', verificationHint: '驗證圖、診斷和匯出詳情',
      summaryTitle: '摘要', dataTableTitle: '資料表', figuresTitle: '圖像', liveWorkspaceResizeAria: '調整視圖預覽和即時資料區域大小',
    },
    parameters: {
      title: '目前參數', currentFileValues: '目前檔案值', lockedUntilStopped: '停止或完成前鎖定',
      standardSimulation: '標準模擬', idealSimulation: '理想氣體模擬', heatCapacityExperiment: '空氣比熱容比實驗', savedChangesOnStart: '啟動時已儲存參數', idealRuntimeOnStart: '理想執行階段將在開始時連接', applied: '參數已套用',
      relation: '關係', scanVariable: '掃描變量', samplingPreset: '採樣預設', targetTemperature: '目標溫度', boxLength: '盒長 L', particleCount: '粒子數 N', customPreset: '自訂', setSamplingPrecision: '設定採樣精度', relationHints: { pt: '固定 N 和 V 掃描溫度', pv: '透過盒長 L 掃描體積', pn: '固定 T 和 V 掃描粒子數' }, setScanValue: (title) => '設定' + title, adjustScanValue: (title) => '調整' + title, recommendedValues: (title) => title + '建議值',
      parameterLabels: { N: '粒子數量', r: '粒子半徑', L: '容器邊長', m: '粒子質量', k: '波茲曼常數', dt: '時間步長', nu: '碰撞頻率', targetTemperature: '目標溫度', equilibriumTime: '平衡時間', statsDuration: '統計時長', relation: '關係' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '穩定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 統計',
      advancedSettings: '進階設定', advancedShow: '顯示模型常數和採樣值', advancedHide: '隱藏模型常數和採樣值', edit: '編輯',
      standardReadonlyNote: '標準模擬參數在這裡直接顯示。', idealReadonlyNote: '關係、掃描變量和採樣預設在上方控制。', heatCapacityReadonlyNote: '粒子動畫僅用於視覺化氣體分子運動狀態；最終比熱容比按空氣比熱容比實驗模型計算。', controlledLockHint: '目前關係已有資料，受控變量已鎖定。',
    },
    results: {
      title: '結果', experimentStatus: '實驗狀態', scan: '掃描', temperature: '溫度', pressure: '壓強', measuredPressure: '實測 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 點', pointsShort: (count) => count + ' 點', recordedPoints: (count) => count + ' 個記錄點',
      clearRelation: '清空關係', confirmClear: '確認清空', remove: '移除', confirmRemove: '確認移除', cancel: '取消', noPoints: '沒有點', runToRecord: '執行實驗以記錄點。', tableAction: '操作', tableTime: '時間',
      finalState: '最終狀態', meanSpeed: '平均速度', measuredBars: '實測柱', idealLine: '理想線', samples: (count) => count + ' 個樣本', sampleWindows: (count) => count + ' 次採樣', waiting: '等待中', finalSpeedSamples: '最終速度樣本', finalEnergySamples: '最終能量樣本', tempHistorySamples: '溫度歷史樣本', finalDataReady: '最終資料就緒', energyDrift: '能量漂移', meanAbsTempError: '平均絕對溫度誤差', tempSamples: '溫度樣本', resultsReady: (relation) => relation + ' 實驗結果已就緒', waitingForRecordedPoints: (relation) => relation + ' 等待記錄點',
      metric: '指標', value: '值', status: '狀態', ready: '就緒', notReady: '未就緒', yes: '是', no: '否', diagnostic: '診斷', export: '匯出', exportAll: '總匯出', exportFigures: '匯出圖像', exportTables: '匯出資料表', reportPdf: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV', verification: '驗證', rawPv: '原始 P-V', history: '歷史',
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
      unavailable: { label: '桌面匯出橋接不可用', detail: '目前環境不能直接匯出 PDF/圖像。請在氣律實驗室桌面程式中使用本地匯出。' },
      error: { label: '匯出環境異常', detail: '匯出器偵測失敗。模擬、即時圖表和結果預覽仍可使用。' },
    },
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '預設版面：3D 預覽、即時資料 / 圖表、目前參數。', standardConnected: '標準模擬執行階段、3D 預覽和即時圖表資料已連接。', exportBridgeRequired: '科學 PDF 匯出需要桌面執行階段橋接。', autoPausedSingleRuntime: (name) => name + '：由於一次只能執行一個工作台執行階段，已自動暫停。', autoPausedCreateFile: (name) => name + '：建立新檔案時已自動暫停。', autoPausedSwitchFile: (name) => name + '：切換檔案時已自動暫停。', fileCreated: (name) => '已建立工作台檔案：' + name, lockedPanel: (title) => title + ' 是預設工作區的一部分，不能隱藏。', layoutReset: (name) => name + '：版面已還原為 3D 預覽 + 即時資料 / 圖表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 開啟理想結果視窗。', standardResultsOpened: (name, tab) => name + '：已開啟結果視窗並切換到 ' + tab + '。', idealResultsClosed: (name) => name + '：已關閉理想結果視窗。', fileSelected: (name) => '已選擇檔案分頁：' + name, confirmClear: (name, relation) => name + '：點擊確認清空以刪除全部 ' + relation + ' 點。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 點。', exportLabels: { completeBundle: '總匯出', report: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV', figuresZip: '結果圖像', tablesCsv: '資料表 CSV' }, exportNotReady: (name) => name + '：結果資料尚未滿足匯出條件。', exportNeedsTwoPoints: (name) => name + '：擬合報告或驗證圖至少需要 2 個記錄點。', exportPayloadPrepared: (name, label, filename, detail) => name + '：' + label + ' 載荷已準備為 ' + filename + '；' + detail, exportPreparing: (name, label) => name + '：正在準備匯出 ' + label + '。', exportCancelled: (name, label) => name + '：已取消匯出 ' + label + '。', exportFailed: (name, label, message) => name + '：' + label + ' 匯出失敗：' + message, exportCsvSaved: (name, target) => name + '：點 CSV 已儲存到 ' + target + '。', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + '：' + label + ' 已匯出到 ' + outDir + '（' + fileCount + ' 個檔案）。' + figureHint, exportFigureHint: '圖像已儲存到所選匯出資料夾。', unknownExporterError: '未知匯出器錯誤', selectedLocation: '選定位置', selectedFolder: '選定資料夾', fileNameCannotBeEmpty: '檔案名稱不能為空。', fileNameUnchanged: (name) => name + '：名稱未改變。', fileRenamed: (name) => '工作台檔案已重新命名為 ' + name + '。', fileRemoved: (name) => name + '：已從目前工作台工作階段移除。', fileClosed: (name) => name + '：已關閉並保留在本機快取。', fileOpenedFromCache: (name) => '已從本機快取開啟實驗：' + name, confirmDeleteFile: (name) => name + '：點擊確認刪除以從工作台工作階段移除此開啟檔案。', layoutAlreadyDefault: (name) => name + '：版面已經使用預設面板。', ...experimentLogCopies['zh-TW'] },
  },
  en: {
    menus: {
      experimentFiles: 'Experiment Files', newWindow: 'New Window', newExperiment: 'New Experiment', openExperiment: 'Open Experiment', noCachedExperiments: 'No cached experiments to open', edit: 'Edit', window: 'Window', settings: 'Settings', help: 'Help', general: 'General',
      standardStudy: 'Standard Simulation Study', idealStudy: 'Ideal Gas Simulation Study', heatCapacityStudy: 'Heat Capacity Ratio (Adiabatic)', heatCapacityPistonOscillationStudy: 'Heat Capacity Ratio (Piston)', undo: 'Undo', redo: 'Redo', empty: 'empty',
      clearEditHistory: 'Clear Edit History', panelsFor: (name) => 'Panels for ' + name, resetDefaultLayout: 'Reset Default Layout', default: 'default',
      saveWorkbenchLayoutDefault: 'Save Current Window Layout as Default',
      userGuide: 'User Guide', about: 'About Gas Laws Lab', topCommandsAria: 'Top commands',
    },
    settings: {
      title: 'General Settings', subtitle: 'Theme, language, sound, shortcuts, and layout preferences', closeAria: 'Close General Settings', theme: 'Theme', themeHint: 'Use system, light, or dark mode',
      themeOptions: { system: { label: 'System', hint: 'Follow OS preference' }, light: { label: 'Light', hint: 'Bright workspace preview' }, dark: { label: 'Dark', hint: 'Dark workspace preview' } },
      language: 'Language', languageHint: 'Choose the interface language',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: 'Simplified Chinese interface' }, 'zh-TW': { label: '繁體中文', hint: 'Traditional Chinese interface' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D performance mode',
      performanceModeHint: 'Use four modes to control Heat Capacity particle count, speed, and runtime load',
      performanceModeSummary: { lowLoad: 'Low load', balanced: 'Balanced', highPerformance: 'High performance', ultra: 'Ultra' },
      audio: 'Sound effects',
      audioHint: 'Enhances instrument feedback and only changes in-app volume',
      audioMuteAria: 'Mute in-app sound effects',
      audioUnmuteAria: 'Unmute in-app sound effects',
      audioVolumeAria: 'In-app sound-effect volume',
    },
    about: {
      title: 'About Gas Laws Lab',
      subtitle: 'Gas Laws Lab',
      closeAria: 'Close About window',
      currentVersion: 'Current Version',
      checkUpdates: 'Check for Updates',
      localDataExportEnvironment: 'Local Data Export Environment',
      workspaceSessionCache: 'Workspace Session Cache',
      buildNotes: 'Build Notes',
      openBuildNotice: 'Open permissions and third-party open-source licenses',
      closeBuildNotice: 'Close permissions and third-party open-source licenses',
      buildNoticeTitle: 'Permissions and Third-Party Open-Source Licenses',
      buildNoticeSubtitle: 'Local permissions, local data, network access, and third-party licenses',
      buildNoticeNavToggle: 'Open or collapse notice table of contents',
      buildNoticeNavTitle: 'Notice Contents',
      buildNoticeBack: 'Back to permissions notice',
      buildNoticeOpenLocalFile: 'Open full local file',
      buildNoticeOpenInBrowser: 'Open in browser',
      buildNoticeLargeFileBody: 'This license material is large and is provided in full with the installed software. Use the button below to open the complete local file in the system browser or default viewer.',
      buildNoticePreviewUnavailable: 'This material cannot be previewed directly in the current environment. Open the complete local file to view it.',
      buildNoticeOpenUnavailable: 'The current environment cannot open local files.',
      checking: 'Checking',
      available: 'Available',
      unavailable: 'Unavailable',
      error: 'Check failed',
      environmentResultTitle: 'Local Environment Check Complete',
      environmentResultAvailable: 'Local data export environment is available.',
      environmentResultUnavailable: 'Local data export environment is unavailable. This environment cannot directly export PDF / image files.',
      environmentResultError: 'Local data export environment check failed. Simulation, live charts, and result previews remain available.',
      updateResultTitle: 'Update Check Complete',
      updateAvailableTitle: 'Update Available',
      updateCheckFailedTitle: 'Update Check Failed',
      updateAvailableBody: 'A newer version is available and can be downloaded now.',
      updateCheckFailedBody: 'Latest-version information is not available yet. Check again, or open the trusted latest-release page for a manual install.',
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
      retryCheck: 'Check Again',
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
      sessionCacheSummary: (total) => 'Current session contains ' + total + ' experiment files',
      sessionCacheBreakdown: (ideal, heat, standard) => 'Ideal / Heat / Standard: ' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: 'Open Files', files: 'Files', panels: 'Panels', noOpenFiles: 'No open files', noOpenFileState: 'No experiment file is currently open', noOpenPanelState: 'Available panels appear after an experiment is opened.', emptyHint: 'Create or open an experiment from the main workspace.',
      noOpenStudy: 'No open study', emptyTitle: 'Start a new Gas Laws Lab file', emptyBody: 'Create an ideal gas study, heat capacity ratio experiment, or standard simulation to restore previews, charts, results, and parameter panels.',
      createStandard: 'Create Standard Simulation Study', createIdeal: 'Create Ideal Gas Simulation Study', createHeatCapacity: 'Create Heat Capacity Ratio (Adiabatic)', createHeatCapacityPistonOscillation: 'Create Heat Capacity Ratio (Piston)', rename: 'Rename', delete: 'Delete', confirmDelete: 'Confirm Delete', closeExperiment: 'Close Experiment', cancel: 'Cancel',
      locked: 'locked', shown: 'shown', open: 'open', active: 'active', off: 'off', std: 'Standard', ideal: 'Ideal', heat: 'Heat', workspaceAria: 'File workspace', usageHintAria: 'File tree usage hint', clickSelectHint: 'Click to select', doubleClickOpenHint: 'Double-click to open', openActions: (name) => 'Open actions for ' + name,
    },
    panels: {
      previewTitle: '3D Preview', previewHint: 'Realtime molecular viewport', realtimeTitle: 'Realtime Data / Charts', heatRealtimeTitle: 'Realtime Data', standardRealtimeHint: 'Live temperature, pressure, and chart traces', idealRealtimeHint: 'Live T, P, relation, and chart traces', heatRealtimeHint: 'Uₜ / Uₚ, pressure, and process samples',
      standardResultsTitle: 'Results', standardResultsHint: 'Experiment status, data table, and figures', idealResultsTitle: 'Results', idealResultsHint: 'Verification chart, history unlock, and export details',
      pointsTitle: 'Experiment Data', pointsHint: 'Recorded relation experiment points', verificationTitle: 'Relation Verification', verificationHint: 'Verification chart, diagnostics, and export details',
      summaryTitle: 'Summary', dataTableTitle: 'Data Table', figuresTitle: 'Figures', liveWorkspaceResizeAria: 'Resize view preview and realtime data',
    },
    parameters: {
      title: 'Current Parameters', currentFileValues: 'current file values', lockedUntilStopped: 'locked until stopped or finished',
      standardSimulation: 'Standard Simulation', idealSimulation: 'Ideal Gas Simulation', heatCapacityExperiment: 'Heat Capacity Ratio Experiment', savedChangesOnStart: 'parameters saved on start', idealRuntimeOnStart: 'ideal runtime will connect on start', applied: 'parameters applied',
      relation: 'Relation', scanVariable: 'Scan Variable', samplingPreset: 'Sampling Preset', targetTemperature: 'Target Temperature', boxLength: 'Box Length L', particleCount: 'Particle Count N', customPreset: 'Custom', setSamplingPrecision: 'Set sampling precision', relationHints: { pt: 'Scan temperature at fixed N and V', pv: 'Scan volume through box length L', pn: 'Scan particle count at fixed T and V' }, setScanValue: (title) => 'Set ' + title, adjustScanValue: (title) => 'Adjust ' + title, recommendedValues: (title) => title + ' recommended values',
      parameterLabels: { N: 'Particle count', r: 'Particle radius', L: 'Box length', m: 'Particle mass', k: 'Boltzmann constant', dt: 'Time step', nu: 'Collision frequency', targetTemperature: 'Target temperature', equilibriumTime: 'Equilibration time', statsDuration: 'Sampling duration', relation: 'Relation' },
      samplingPresets: { fast: 'Fast', balanced: 'Balanced', stable: 'Stable' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's eq / ' + statsDuration + 's stats',
      advancedSettings: 'Advanced settings', advancedShow: 'Show model constants and sampling values', advancedHide: 'Hide model constants and sampling values', edit: 'Edit',
      standardReadonlyNote: 'Standard simulation parameters are shown directly here.', idealReadonlyNote: 'Relation, scan variable, and sampling preset are controlled above.', heatCapacityReadonlyNote: 'The particle animation only visualizes molecular motion; the heat capacity ratio is calculated by the air heat-capacity-ratio experiment model.', controlledLockHint: 'This relation already has data, so controlled variables are locked.',
    },
    results: {
      title: 'Results', experimentStatus: 'Experiment status', scan: 'Scan', temperature: 'Temperature', pressure: 'Pressure', measuredPressure: 'Measured P', idealPressure: 'Ideal P', gap: 'Gap', pointsTitle: (relation) => relation + ' points', pointsShort: (count) => count + ' pts', recordedPoints: (count) => count + ' recorded points',
      clearRelation: 'Clear Relation', confirmClear: 'Confirm Clear', remove: 'Remove', confirmRemove: 'Confirm Remove', cancel: 'Cancel', noPoints: 'no points', runToRecord: 'Run the experiment to record points.', tableAction: 'Action', tableTime: 'Time',
      finalState: 'Final state', meanSpeed: 'Mean speed', measuredBars: 'measured bars', idealLine: 'ideal line', samples: (count) => count + ' samples', sampleWindows: (count) => count + ' sampling windows', waiting: 'waiting', finalSpeedSamples: 'final speed samples', finalEnergySamples: 'final energy samples', tempHistorySamples: 'temp history samples', finalDataReady: 'final data ready', energyDrift: 'energy drift', meanAbsTempError: 'mean abs temp error', tempSamples: 'Temp samples', resultsReady: (relation) => relation + ' experiment result ready', waitingForRecordedPoints: (relation) => relation + ' waiting for recorded points',
      metric: 'Metric', value: 'Value', status: 'Status', ready: 'ready', notReady: 'not-ready', yes: 'yes', no: 'no', diagnostic: 'Diagnostic', export: 'Export', exportAll: 'Export All', exportFigures: 'Export Figures', exportTables: 'Export tables', reportPdf: 'Report PDF', verificationFigure: 'Verification Figure', pointsCsv: 'Points CSV', verification: 'Verification', rawPv: 'Raw P-V', history: 'History',
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
      unavailable: { label: 'Desktop export bridge unavailable', detail: 'This environment cannot export PDF or figures directly. Use local export in the Gas Laws Lab desktop app.' },
      error: { label: 'Export environment error', detail: 'Exporter detection failed. Simulation, realtime charts, and result previews remain available.' },
    },
    logs: { initialized: 'Workbench studio prototype initialized.', defaultLayout: 'Default layout: 3D Preview, Realtime Data / Charts, Current Parameters.', standardConnected: 'Standard Simulation runtime, 3D preview, and realtime chart data are connected.', exportBridgeRequired: 'Scientific PDF export requires the desktop runtime bridge.', autoPausedSingleRuntime: (name) => name + ': auto-paused because only one workbench runtime can run at a time.', autoPausedCreateFile: (name) => name + ': auto-paused when creating a new file.', autoPausedSwitchFile: (name) => name + ': auto-paused when switching files.', fileCreated: (name) => 'Workbench file created: ' + name, lockedPanel: (title) => title + ' is locked as part of the default workspace and cannot be hidden.', layoutReset: (name) => name + ': layout reset to 3D Preview + Realtime Data / Charts', idealResultsOpened: (name, tab) => name + ': opened ideal Results window on ' + tab + '.', standardResultsOpened: (name, tab) => name + ': opened Results window on ' + tab + '.', idealResultsClosed: (name) => name + ': closed ideal Results window.', fileSelected: (name) => 'File tab selected: ' + name, confirmClear: (name, relation) => name + ': click Confirm Clear to clear all ' + relation + ' points.', clearedRelation: (name, relation) => name + ': cleared ' + relation + ' points.', exportLabels: { completeBundle: 'complete export', report: 'report PDF', verificationFigure: 'verification figure', pointsCsv: 'points CSV', figuresZip: 'result figures', tablesCsv: 'tables CSV' }, exportNotReady: (name) => name + ': result data does not meet export requirements yet.', exportNeedsTwoPoints: (name) => name + ': at least 2 recorded points are required for a fitted report or verification figure.', exportPayloadPrepared: (name, label, filename, detail) => name + ': ' + label + ' payload prepared as ' + filename + '; ' + detail, exportPreparing: (name, label) => name + ': preparing ' + label + ' export.', exportCancelled: (name, label) => name + ': ' + label + ' export cancelled.', exportFailed: (name, label, message) => name + ': ' + label + ' export failed: ' + message, exportCsvSaved: (name, target) => name + ': points CSV saved to ' + target + '.', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + ': ' + label + ' exported to ' + outDir + ' (' + fileCount + ' files).' + figureHint, exportFigureHint: 'Figures are saved in the selected export folder.', unknownExporterError: 'unknown exporter error', selectedLocation: 'selected location', selectedFolder: 'selected folder', fileNameCannotBeEmpty: 'File name cannot be empty.', fileNameUnchanged: (name) => name + ': name unchanged.', fileRenamed: (name) => 'Workbench file renamed to ' + name + '.', fileRemoved: (name) => name + ': removed from the current workbench session.', fileClosed: (name) => name + ': closed and kept in local cache.', fileOpenedFromCache: (name) => 'Experiment opened from local cache: ' + name, confirmDeleteFile: (name) => name + ': click Confirm Delete to remove this open file from the workbench session.', layoutAlreadyDefault: (name) => name + ': layout is already using the default panels.', ...experimentLogCopies.en },
  },
};
