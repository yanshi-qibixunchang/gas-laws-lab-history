

export interface SimulationParams {
  L: number;       // Container side length
  N: number;       // Number of particles
  r: number;       // Particle radius
  m: number;       // Particle mass
  k: number;       // Boltzmann constant (normalized)
  dt: number;      // Time step
  nu: number;      // Andersen collision frequency
  targetTemperature?: number; // Optional explicit thermostat target (experiment mode)
  equilibriumTime: number; // Time to wait before collecting stats
  statsDuration: number;   // Duration to collect stats
}

export type AppMode = 'standard' | 'experiment';
export type ExperimentRelation = 'pt' | 'pv' | 'pn';

export interface SavedConfig {
  id: string;
  name: string;
  params: SimulationParams;
  date: number;
  isSystem: boolean;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  energy: number;
}

export interface SimulationStats {
  time: number;
  temperature: number;
  pressure: number;
  meanSpeed: number;
  rmsSpeed: number;
  isEquilibrated: boolean;
  progress: number; // 0 to 1 based on the current phase duration
  phase: 'idle' | 'equilibrating' | 'collecting' | 'finished';
}

export interface PressureWindowPoint {
  time: number;
  duration: number;
  measuredPressure: number;
  idealPressure: number;
  isCollectionWindow: boolean;
}

export interface PressureMeasurementSummary {
  latestPressure: number;
  meanPressure: number | null;
  meanIdealPressure: number | null;
  meanTemperature: number | null;
  relativeGap: number | null;
  sampleCount: number;
  history: PressureWindowPoint[];
}

export interface IdealGasExperimentPoint {
  id: string;
  relation: ExperimentRelation;
  targetTemperature: number;
  meanTemperature: number;
  meanPressure: number;
  idealPressure: number;
  relativeGap: number;
  timestamp: number;
  boxLength?: number | null;
  volume?: number | null;
  inverseVolume?: number | null;
  particleCount?: number | null;
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  probability: number; // Normalized
  theoretical?: number; // Theoretical value
}

export interface ChartData {
  speed: HistogramBin[];
  energy: HistogramBin[];
  energyLog: { energy: number; logProb: number; theoreticalLog: number }[];
  tempHistory: { time: number; error: number; totalEnergy: number }[]; // Added totalEnergy
}

// Translation Types
export type LanguageCode = 'zh-CN' | 'zh-TW' | 'en-GB';

export interface InputCapabilities {
  supportsHover: boolean;
  finePointer: boolean;
  touchLike: boolean;
  isCompactLandscape: boolean;
  isCompactWidth: boolean;
}

export interface Translation {
  brand: {
    name: string;
    subtitle: string;
  };
  title: string;
  subtitle: string;
  header: {
    systemOp: string;
    language: string; // New: Language label
  };
  controls: {
    title: string;
    particles: string;
    radius: string;
    boxSize: string;
    equilTime: string;
    statsDuration: string;
    start: string;
    pause: string;
    resume: string; // New: Resume button text
    reset: string;
    resetNote: string;
    restoreDefaults: string;
    default: string; // New: Short default button text
  };
  storage: {
    title: string;
    save: string;
    newPreset: string;
    createTitle: string;
    confirmCreate: string;
    cancel: string;
    rename: string;
    renameTitle: string;
    confirmRename: string;
    renameSuccess: string;
    moreActions: string;
    load: string;
    delete: string;
    duplicateName: string; // New: Duplicate name warning
    duplicateParams: string; // New: Duplicate params warning
    setDefault: string;
    defaultSet: string;
    placeholder: string;
    empty: string;
    saveSuccess: string;
    loadSuccess: string;
    confirmDelete: string;
    systemPresetName: string;
    selectFirst: string;
  };
  messages: {
    resetRequired: string;
    resetBeforeStart: string;
    resetSuccess: string;
    alreadyLatest: string;
    resetFailed: string;
    pauseRequired: string;
    checkInputs: string; 
  };
  views: {
    mdView: string;
    realtimeCharts: string;
    finalStats: string;
    completed: string;
    stackMode: string;
  };
  charts: {
    avgSpeed: string;
    instSpeed: string;
    avgEnergy: string;
    instEnergy: string;
    semilog: string;
    tempError: string;
    totalEnergy: string;
    distributions: string; 
    diagnostics: string;
    summaryMetrics: string;
    speedDeviation: string;
    energyDeviation: string;
    meanTempError: string;
    energyDrift: string;
    speedX: string;
    energyX: string;
    probY: string;
    timeX: string;
    errorY: string;
    energyY: string;
    theory: string;
    simulation: string;
  };
  stats: {
    temperature: string;
    pressure: string;
    meanSpeed: string;
    rmsSpeed: string;
    status: string;
    phaseProgress: string;
    overallProgress: string;
    phaseTime: string;
    overallTime: string;
    remaining: string;
    idle: string;
    equilibrating: string;
    collecting: string;
    finished: string;
    done: string;
  };
  canvas: {
    locked: string;
    unlocked: string;
    scrollEnabled: string;
    clickToRelease: string;
    clickToInteract: string;
    resetView: string;
    instructionsFocused_desktop: string; // Split
    instructionsFocused_mobile: string;  // Split
    instructionsIdle: string;
    scrollWarning: string;
    scrollWarning_mobile: string; // Short version
    foldingLocked: string;
    runningLocked: string;
    interactionLocked: string;
    autoExit: string;
    switchedToPan: string;
    switchedToRotate: string;
  };
  tooltips: {
    openSidebar: string;
    closeSidebar: string;
    panMode: string;
    rotateMode: string;
    resetCamera: string;
    togglePan: string;
    modeHint: string;
    tryToggle: string;
    themeToggle: string;
    langToggle: string;
  };
  hints: {
    viewModeTitle: string;
    viewModeBody: string;
    sidebarTitle: string;
    sidebarBody: string;
  };
  experiment: {
    modeLabel: string;
    standardMode: string;
    experimentMode: string;
    title: string;
    subtitle: string;
    relationTitle: string;
    relationPt: string;
    relationPv: string;
    relationPn: string;
    relationReady: string;
    relationComingSoon: string;
    relationLocked: string;
    setupTitle: string;
    constantsTitle: string;
    temperatureTitle: string;
    runTitle: string;
    resultsTitle: string;
    historyTitle: string;
    targetTemperature: string;
    presetTemperatures: string;
    customTemperature: string;
    temperatureHint: string;
    runPoint: string;
    resetPoint: string;
    clearPoints: string;
    currentTemperature: string;
    measuredPressure: string;
    idealReference: string;
    progress: string;
    chartTitle: string;
    xTemperature: string;
    yPressure: string;
    measuredSeries: string;
    fitSeries: string;
    theorySeries: string;
    tableTitle: string;
    noPoints: string;
    targetTempColumn: string;
    meanTempColumn: string;
    meanPressureColumn: string;
    idealPressureColumn: string;
    relativeGapColumn: string;
    timeColumn: string;
    removePoint: string;
    verdictTitle: string;
    insufficient: string;
    verified: string;
    preliminary: string;
    notYet: string;
    slope: string;
    intercept: string;
    rSquared: string;
    theoreticalSlope: string;
    slopeError: string;
    conditionSummary: string;
    currentAssessmentTitle: string;
    failureReasonTitle: string;
    conclusionSummary: string;
    recommendationTitle: string;
    recommendationNeedMore: string;
    recommendationNeedRange: string;
    recommendationGood: string;
    recommendationPreliminary: string;
    recommendationWeakFit: string;
    recommendationSlopeMismatch: string;
    recommendationStablePreset: string;
    failureReasonInsufficientPoints: string;
    failureReasonInsufficientRange: string;
    failureReasonWeakFit: string;
    failureReasonSlopeMismatch: string;
    failureReasonPreliminary: string;
    failureReasonVerified: string;
    failureModalTitle: string;
    failureModalBody: string;
    failureMetricsTitle: string;
    failureActionsTitle: string;
    continueSampling: string;
    switchStablePreset: string;
    acknowledgeFailure: string;
    presetRoundComplete: string;
    pointsCountLabel: string;
    coveredRangeLabel: string;
    pointsCleared: string;
    pointRecorded: string;
    conditionsChanged: string;
    resetRequired: string;
    historyBodyOne: string;
    historyBodyTwo: string;
    historyBodyThree: string;
  };
  installPrompt: {
    desktopTitle: string;
    desktopBody: string;
    desktopConfirm: string;
    androidTitle: string;
    androidBody: string;
    androidConfirm: string;
    androidDownload: string;
    iosTitle: string;
    iosBody: string;
    iosStepOne: string;
    iosStepTwo: string;
    iosStepThree: string;
    gotIt: string;
    later: string;
  };
  common: {
    expandDetails: string;
    expandView: string;    // New
    expandCharts: string;  // New
    expandResults: string; // New
    prev: string;
    next: string;
    expandAll: string;
    collapse: string;
    openCard: string;  
    closeCard: string;
    modeDark: string;  // New: Dark mode text
    modeLight: string; // New: Light mode text
  };
  footer: {
    about: string;
    team: string;
    supervisor: string;
    references: string;
    visitorCount: string;
    school: string;
    version: string;
    links: string;        
    github: string;       
    report: string;       
    androidApk: string;
    exportPdf: string;
    exportFailed: string;
    contact: string;
    copied: string;       
    emailCopiedMsg: string; // Added
    acknowledgement: string; 
    designedBy: string;   
    role_leader: string;
    role_algo: string;
    role_research: string;
  }
}
