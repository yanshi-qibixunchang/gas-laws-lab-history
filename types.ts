

export interface SimulationParams {
  L: number;       // Container side length
  N: number;       // Number of particles
  r: number;       // Particle radius
  m: number;       // Particle mass
  k: number;       // Boltzmann constant (normalized)
  dt: number;      // Time step
  nu: number;      // Andersen collision frequency
  equilibriumTime: number; // Time to wait before collecting stats
  statsDuration: number;   // Duration to collect stats
}

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
  progress: number; // 0 to 1 based on total duration
  phase: 'idle' | 'equilibrating' | 'collecting' | 'finished';
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
export type LanguageCode = 'zh-CN' | 'zh-TW' | 'en-GB' | 'en-US';

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