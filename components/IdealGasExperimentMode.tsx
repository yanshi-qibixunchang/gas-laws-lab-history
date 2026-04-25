import React, { useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Eraser, FlaskConical, Info, Pause, Play, RotateCcw, SlidersHorizontal, Thermometer, TrendingUp, X } from 'lucide-react';
import { PhysicsEngine } from '../services/PhysicsEngine';
import {
  AppMode,
  ExperimentRelation,
  IdealGasExperimentPoint,
  LanguageCode,
  PressureMeasurementSummary,
  SimulationParams,
  SimulationStats,
  Translation,
} from '../types';
import {
  BOX_LENGTH_PRESET_SEQUENCE,
  diagnoseExperimentFailure,
  getExperimentVerdictState,
  PARTICLE_COUNT_PRESET_SEQUENCE,
  TEMPERATURE_PRESET_SEQUENCE,
  type ExperimentFailureReason,
} from '../utils/experimentFailureDiagnostics';
import { formatScientificWithSuperscript } from '../utils/numberFormat';
import SimulationCanvas from './SimulationCanvas';
import ModeSwitch from './ModeSwitch';

const TEMPERATURE_PRESETS = [...TEMPERATURE_PRESET_SEQUENCE];
const TEMPERATURE_MIN = 0.5;
const TEMPERATURE_MAX = 2.5;
const TEMPERATURE_STEP = 0.1;
const DEFAULT_EXPERIMENT_TEMPERATURE = TEMPERATURE_PRESETS[0];
const PV_DEFAULT_TEMPERATURE = 1.0;
const PN_DEFAULT_TEMPERATURE = 1.0;
const BOX_LENGTH_PRESETS = [...BOX_LENGTH_PRESET_SEQUENCE];
const DEFAULT_BOX_LENGTH = BOX_LENGTH_PRESETS[0];
const PARTICLE_COUNT_PRESETS = [...PARTICLE_COUNT_PRESET_SEQUENCE];
const DEFAULT_PARTICLE_COUNT = PARTICLE_COUNT_PRESETS[0];
const BOX_LENGTH_MIN = 12;
const BOX_LENGTH_MAX = 21;
const BOX_LENGTH_STEP = 0.5;
const INVERSE_VOLUME_AXIS_SCALE = 10000;
const HISTORY_AUTO_SHOWN_STORAGE_KEY = 'hsl-experiment-history-auto-shown';
const EXPERIMENT_DEFAULTS = {
  equilibriumTime: 4,
  statsDuration: 12,
} as const;
const SAMPLING_PRESETS = {
  fast: { equilibriumTime: 2, statsDuration: 6 },
  balanced: { equilibriumTime: 4, statsDuration: 12 },
  stable: { equilibriumTime: 6, statsDuration: 20 },
} as const;

type NoticeType = 'info' | 'success' | 'warning';
type ExperimentParamKey = keyof SimulationParams | 'targetTemperature';
type ExperimentParams = SimulationParams & { targetTemperature: number };
type PointsByRelation = Record<ExperimentRelation, IdealGasExperimentPoint[]>;
type AutoShownHistory = Record<ExperimentRelation, boolean>;

interface IdealGasExperimentModeProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  defaultParams: SimulationParams;
  t: Translation;
  lang: LanguageCode;
  modeSwitchSpacingClass?: string;
  headerSpacingClass?: string;
  isDarkMode?: boolean;
  supportsHover?: boolean;
  touchLike?: boolean;
  isCompactLandscape?: boolean;
  onNotify?: (text: string, duration?: number, type?: NoticeType) => void;
  footer?: React.ReactNode;
}

interface RegressionSummary {
  slope: number | null;
  intercept: number | null;
  rSquared: number | null;
  slopeError: number | null;
}

interface VerdictSummary {
  label: string;
  isVerified: boolean;
  state: 'verified' | 'preliminary' | 'notYet' | 'insufficient';
}

interface FailurePromptState {
  relation: ExperimentRelation;
  reason: ExperimentFailureReason;
  key: string;
}

type FailurePromptShownMap = Record<ExperimentRelation, string | null>;

interface HistoryContent {
  eyebrow: string;
  title: string;
  discoveredBy: string;
  discovery: string;
  significance: string;
  status: string;
  simulation: string;
}

interface LocalCopy {
  subtitle: string;
  relationLabels: Record<ExperimentRelation, string>;
  relationHint: Record<ExperimentRelation, string>;
  relationLockedPn: string;
  temperaturePanelTitle: Record<'pt' | 'pv' | 'pn', string>;
  temperatureHint: Record<'pt' | 'pv' | 'pn', string>;
  chartTitle: Record<'pt' | 'pv' | 'pvLinear' | 'pn', string>;
  noPoints: Record<'pt' | 'pv' | 'pn', string>;
  pointsUnit: string;
  theoryCurveLabel: string;
  historyButton: string;
  historyUnlocked: string;
  historyLocked: string;
  historySectionLabel: {
    discoveredBy: string;
    discovery: string;
    significance: string;
    status: string;
    simulation: string;
  };
  modalClose: string;
  verdictBasisPv: string;
  verdictBasisPt: string;
  verdictBasisPn: string;
  xLabelTemperature: string;
  xLabelVolume: string;
  xLabelInverseVolume: string;
  xLabelParticles: string;
  yLabelPressure: string;
  tableHeader: {
    boxLength: string;
    volume: string;
    inverseVolume: string;
    particles: string;
  };
  relationVariableNote: Record<'pt' | 'pv' | 'pn', string>;
  variableBadge: string;
  summaryVariableLabel: string;
}

interface ResetCurrentPointOptions {
  advancePresetTemperature?: boolean;
  advancePresetBoxLength?: boolean;
  advancePresetParticleCount?: boolean;
}

interface AdvancedPanelCopy {
  button: string;
  title: string;
  subtitle: string;
  close: string;
  presetTitle: string;
  presetLabel: {
    fast: string;
    balanced: string;
    stable: string;
  };
  presetHint: {
    fast: string;
    balanced: string;
    stable: string;
  };
  sectionTitle: {
    scale: string;
    sampling: string;
    model: string;
  };
  mainHint: {
    pt: string;
    pv: string;
  };
}

const createIdleStats = (): SimulationStats => ({
  time: 0,
  temperature: 0,
  pressure: 0,
  meanSpeed: 0,
  rmsSpeed: 0,
  isEquilibrated: false,
  progress: 0,
  phase: 'idle',
});

const createExperimentParams = (defaultParams: SimulationParams): ExperimentParams => ({
  ...defaultParams,
  equilibriumTime: EXPERIMENT_DEFAULTS.equilibriumTime,
  statsDuration: EXPERIMENT_DEFAULTS.statsDuration,
  targetTemperature: DEFAULT_EXPERIMENT_TEMPERATURE,
});

const createEmptyPointsMap = (): PointsByRelation => ({
  pt: [],
  pv: [],
  pn: [],
});

const createEmptyAutoShownMap = (): AutoShownHistory => ({
  pt: false,
  pv: false,
  pn: false,
});

const createEmptyFailurePromptMap = (): FailurePromptShownMap => ({
  pt: null,
  pv: null,
  pn: null,
});

const ADVANCED_PANEL_COPY: Record<LanguageCode, AdvancedPanelCopy> = {
  'zh-CN': {
    button: '高级参数',
    title: '高级参数',
    subtitle: '这里只放实验常量与采样设置。第一组 P-T 验证默认只需要调整温度。',
    close: '关闭高级参数',
    presetTitle: '采样预设',
    presetLabel: {
      fast: '快演示',
      balanced: '平衡型',
      stable: '稳结果',
    },
    presetHint: {
      fast: '单点更快，波动更大',
      balanced: '默认推荐，兼顾速度与效果',
      stable: '采样更稳，但单点更慢',
    },
    sectionTitle: {
      scale: '系统规模',
      sampling: '采样设置',
      model: '数值 / 模型设置',
    },
    mainHint: {
      pt: '当前主界面只保留温度这个实验变量。其余实验常量已收进右侧高级参数。',
      pv: '当前主界面只保留关系主变量与运行流程。其余实验常量已收进右侧高级参数。',
    },
  },
  'zh-TW': {
    button: '高級參數',
    title: '高級參數',
    subtitle: '這裡只放實驗常量與採樣設置。第一組 P-T 驗證預設只需要調整溫度。',
    close: '關閉高級參數',
    presetTitle: '採樣預設',
    presetLabel: {
      fast: '快演示',
      balanced: '平衡型',
      stable: '穩結果',
    },
    presetHint: {
      fast: '單點更快，波動更大',
      balanced: '預設推薦，兼顧速度與效果',
      stable: '採樣更穩，但單點更慢',
    },
    sectionTitle: {
      scale: '系統規模',
      sampling: '採樣設置',
      model: '數值 / 模型設置',
    },
    mainHint: {
      pt: '目前主介面只保留溫度這個實驗變量，其餘實驗常量已收進右側高級參數。',
      pv: '目前主介面只保留關係主變量與運行流程，其餘實驗常量已收進右側高級參數。',
    },
  },
  'en-GB': {
    button: 'Advanced Parameters',
    title: 'Advanced Parameters',
    subtitle: 'This drawer holds the experiment constants and sampling setup. The first P-T relation only needs temperature in the main flow.',
    close: 'Close advanced parameters',
    presetTitle: 'Sampling presets',
    presetLabel: {
      fast: 'Fast Demo',
      balanced: 'Balanced',
      stable: 'Stable Result',
    },
    presetHint: {
      fast: 'Shorter point runs, larger fluctuations',
      balanced: 'Recommended default for speed and clarity',
      stable: 'More stable sampling, slower point runs',
    },
    sectionTitle: {
      scale: 'System Scale',
      sampling: 'Sampling Setup',
      model: 'Numerics / Model',
    },
    mainHint: {
      pt: 'The main flow now exposes only temperature as the experiment variable. Other constants live in the advanced drawer.',
      pv: 'The main flow now keeps only the relation variable and run flow visible. Other constants live in the advanced drawer.',
    },
  },
};

const LOCAL_COPY: Record<LanguageCode, LocalCopy> = {
  'zh-CN': {
    subtitle: '独立实验模式：验证理想气体三条经典关系，并在验证成功后自动讲解其历史与意义',
    relationLabels: {
      pt: 'P-T（定容）',
      pv: 'P-V / P-1/V（波义耳）',
      pn: 'P-N（定温定容）',
    },
    relationHint: {
      pt: '改变目标温度并记录多个平衡点，验证定容条件下的压力定律。',
      pv: '同时展示原始 P-V 图与线性化 P-1/V 图；验证判定以 P-1/V 拟合结果为准。',
      pn: '固定温度与体积，改变粒子数 N，验证压强是否随 N 线性增长。',
    },
    relationLockedPn: '定温定容 P-N 方向将在后续版本接入',
    temperaturePanelTitle: {
      pt: '温度设置',
      pv: '定温条件',
      pn: '粒子数设置',
    },
    temperatureHint: {
      pt: '建议先取 0.6、0.8、1.0、1.5、2.0 形成足够温区。',
      pv: '先固定目标温度，再通过修改容器边长 L 获取不同体积点。',
      pn: '建议先取 80、120、160、200、260、320，形成足够的粒子数区间。',
    },
    chartTitle: {
      pt: 'P-T 验证图',
      pv: 'P-V 关系图',
      pvLinear: 'P-1/V 线性化验证图',
      pn: 'P-N 验证图',
    },
    noPoints: {
      pt: '还没有实验点，先运行一个温度点。',
      pv: '还没有实验点，先修改一个体积并运行。',
      pn: '还没有实验点，先修改一个粒子数并运行。',
    },
    pointsUnit: '点',
    theoryCurveLabel: '理论曲线',
    historyButton: '查看历史与意义',
    historyUnlocked: '历史讲解已解锁',
    historyLocked: '验证成功后可查看历史讲解',
    historySectionLabel: {
      discoveredBy: '发现者',
      discovery: '发现过程',
      significance: '历史意义',
      status: '历史地位',
      simulation: '与本实验的对应',
    },
    modalClose: '关闭',
    verdictBasisPv: '当前“验证成功”判定基于 P-1/V 线性拟合。',
    verdictBasisPt: '当前“验证成功”判定基于 P-T 线性拟合。',
    verdictBasisPn: '当前“验证成功”判定基于 P-N 线性拟合。',
    xLabelTemperature: '平衡温度 T',
    xLabelVolume: '体积 V',
    xLabelInverseVolume: '倒数体积 1/V',
    xLabelParticles: '粒子数 N',
    yLabelPressure: '平衡压强 P',
    tableHeader: {
      boxLength: '边长 L',
      volume: '体积 V',
      inverseVolume: '1/V',
      particles: '粒子数 N',
    },
    relationVariableNote: {
      pt: '当前关系把温度作为实验变量；改变 N、L、k 等常量会清空对应历史数据。',
      pv: '当前关系把体积作为实验变量；请保持目标温度不变，并通过修改容器边长 L 记录新点。',
      pn: '当前关系把粒子数 N 作为实验变量；请保持目标温度与容器体积不变，并记录新的压强点。',
    },
    variableBadge: '变量',
    summaryVariableLabel: '变量',
  },
  'zh-TW': {
    subtitle: '獨立實驗模式：驗證理想氣體三條經典關係，並在驗證成功後自動講解其歷史與意義',
    relationLabels: {
      pt: 'P-T（定容）',
      pv: 'P-V / P-1/V（波義耳）',
      pn: 'P-N（定溫定容）',
    },
    relationHint: {
      pt: '改變目標溫度並記錄多個平衡點，驗證定容條件下的壓力定律。',
      pv: '同時展示原始 P-V 圖與線性化 P-1/V 圖；驗證判定以 P-1/V 擬合結果為準。',
      pn: '固定溫度與體積，改變粒子數 N，驗證壓強是否隨 N 線性增加。',
    },
    relationLockedPn: '定溫定容 P-N 方向將在後續版本接入',
    temperaturePanelTitle: {
      pt: '溫度設置',
      pv: '定溫條件',
      pn: '粒子數設置',
    },
    temperatureHint: {
      pt: '建議先取 0.6、0.8、1.0、1.5、2.0 形成足夠溫區。',
      pv: '先固定目標溫度，再透過修改容器邊長 L 取得不同體積點。',
      pn: '建議先取 80、120、160、200、260、320，形成足夠的粒子數區間。',
    },
    chartTitle: {
      pt: 'P-T 驗證圖',
      pv: 'P-V 關係圖',
      pvLinear: 'P-1/V 線性化驗證圖',
      pn: 'P-N 驗證圖',
    },
    noPoints: {
      pt: '還沒有實驗點，先運行一個溫度點。',
      pv: '還沒有實驗點，先修改一個體積並運行。',
      pn: '還沒有實驗點，先修改一個粒子數並運行。',
    },
    pointsUnit: '點',
    theoryCurveLabel: '理論曲線',
    historyButton: '查看歷史與意義',
    historyUnlocked: '歷史講解已解鎖',
    historyLocked: '驗證成功後可查看歷史講解',
    historySectionLabel: {
      discoveredBy: '發現者',
      discovery: '發現過程',
      significance: '歷史意義',
      status: '歷史地位',
      simulation: '與本實驗的對應',
    },
    modalClose: '關閉',
    verdictBasisPv: '目前「驗證成功」判定基於 P-1/V 線性擬合。',
    verdictBasisPt: '目前「驗證成功」判定基於 P-T 線性擬合。',
    verdictBasisPn: '目前「驗證成功」判定基於 P-N 線性擬合。',
    xLabelTemperature: '平衡溫度 T',
    xLabelVolume: '體積 V',
    xLabelInverseVolume: '倒數體積 1/V',
    xLabelParticles: '粒子數 N',
    yLabelPressure: '平衡壓強 P',
    tableHeader: {
      boxLength: '邊長 L',
      volume: '體積 V',
      inverseVolume: '1/V',
      particles: '粒子數 N',
    },
    relationVariableNote: {
      pt: '目前關係把溫度作為實驗變數；改變 N、L、k 等常量會清空對應歷史資料。',
      pv: '目前關係把體積作為實驗變數；請保持目標溫度不變，並透過修改容器邊長 L 記錄新點。',
      pn: '目前關係把粒子數 N 作為實驗變數；請保持目標溫度與容器體積不變，並記錄新的壓強點。',
    },
    variableBadge: '變量',
    summaryVariableLabel: '變量',
  },
  'en-GB': {
    subtitle: 'Independent lab mode for validating three classic ideal-gas relations, with automatic historical context after a successful verification.',
    relationLabels: {
      pt: 'P-T (constant V)',
      pv: 'P-V / P-1/V (Boyle)',
      pn: 'P-N (constant T, V)',
    },
    relationHint: {
      pt: 'Change the target temperature and record multiple equilibrium points to verify the pressure law at constant volume.',
      pv: 'Show both the original P-V curve and the linearised P-1/V plot; verdicts are based on the P-1/V fit.',
      pn: 'Keep temperature and volume fixed, vary the particle count N, and check whether pressure grows linearly with N.',
    },
    relationLockedPn: 'The constant-T, constant-V P-N direction will be added later',
    temperaturePanelTitle: {
      pt: 'Temperature Control',
      pv: 'Fixed Temperature',
      pn: 'Particle Count Control',
    },
    temperatureHint: {
      pt: 'Start with 0.6, 0.8, 1.0, 1.5, and 2.0 to cover a clear temperature span.',
      pv: 'Keep the target temperature fixed, then vary the box length L to record different volumes.',
      pn: 'Start with 80, 120, 160, 200, 260, and 320 to cover a clear particle-count span.',
    },
    chartTitle: {
      pt: 'P-T Validation Plot',
      pv: 'P-V Relation Plot',
      pvLinear: 'P-1/V Linearised Validation Plot',
      pn: 'P-N Validation Plot',
    },
    noPoints: {
      pt: 'No experiment points yet. Run one temperature point first.',
      pv: 'No experiment points yet. Change the volume and run one point first.',
      pn: 'No experiment points yet. Change the particle count and run one point first.',
    },
    pointsUnit: 'pts',
    theoryCurveLabel: 'Theory curve',
    historyButton: 'View History & Context',
    historyUnlocked: 'History unlocked',
    historyLocked: 'History context unlocks after a successful verification',
    historySectionLabel: {
      discoveredBy: 'Key figures',
      discovery: 'How it was established',
      significance: 'Historical meaning',
      status: 'Historical status',
      simulation: 'How it maps to this lab',
    },
    modalClose: 'Close',
    verdictBasisPv: 'The current “Verified” status is based on the P-1/V linear fit.',
    verdictBasisPt: 'The current “Verified” status is based on the P-T linear fit.',
    verdictBasisPn: 'The current “Verified” status is based on the P-N linear fit.',
    xLabelTemperature: 'Equilibrium Temperature T',
    xLabelVolume: 'Volume V',
    xLabelInverseVolume: 'Inverse Volume 1/V',
    xLabelParticles: 'Particle Count N',
    yLabelPressure: 'Equilibrium Pressure P',
    tableHeader: {
      boxLength: 'Box Length L',
      volume: 'Volume V',
      inverseVolume: '1/V',
      particles: 'Particle Count N',
    },
    relationVariableNote: {
      pt: 'Temperature is the scan variable in this relation. Changing N, L, k, or other fixed conditions clears the affected datasets.',
      pv: 'Volume is the scan variable in this relation. Keep the target temperature fixed and record new points by changing the box length L.',
      pn: 'Particle count N is the scan variable in this relation. Keep target temperature and container volume fixed while recording new pressure points.',
    },
    variableBadge: 'Variable',
    summaryVariableLabel: 'Variable',
  },
};

const HISTORY_CONTENT: Record<LanguageCode, Record<ExperimentRelation, HistoryContent>> = {
  'zh-CN': {
    pt: {
      eyebrow: '定容压力定律',
      title: '盖-吕萨克 / 阿蒙顿定律',
      discoveredBy: '这条关系通常追溯到 Guillaume Amontons 在约 1700 年对气体压强与温度关系的经验建立，以及 Joseph-Louis Gay-Lussac 在 19 世纪初对气体规律的更系统整理。',
      discovery: '这类研究来自对受限气体受热后的压强变化观察。教材里常把定容下的 P 与 T 正比写成 Amontons’s law，也常写作 Gay-Lussac’s law。',
      significance: '它把“温度升高意味着分子热运动更剧烈”这一直觉，转成了可测量的宏观压强规律，是热学从经验走向定量的重要一步。',
      status: '这条关系后来成为理想气体方程的重要特例，也是绝对温标与气体热学教学中的核心桥梁。',
      simulation: '在本实验中，你不是直接代入经验公式，而是先用撞墙动量通量测压，再检验平衡压强是否随平衡温度线性增长。',
    },
    pv: {
      eyebrow: '等温压缩定律',
      title: '波义耳定律',
      discoveredBy: 'Robert Boyle 在 1662 年给出了定温条件下压强与体积反比的经验关系；Edme Mariotte 在 1676 年也独立得到了同类结论。',
      discovery: '这条定律来自对气体压缩与膨胀实验的系统观察。经典表述是 P 与 V 成反比，因此原始图像是 P-V 双曲关系。',
      significance: '波义耳定律是最早被系统写成数学比例关系的气体定律之一，使气体从“会膨胀收缩的流体”变成了可定量预测的对象。',
      status: '它构成了后续一般气体方程和理想气体方程的核心组成部分，也是近代实验物理与化学定量传统的代表性成果。',
      simulation: '本页同时给出原始 P-V 图和线性化 P-1/V 图。前者负责展示物理直观，后者负责线性拟合、R² 与自动判定。',
    },
    pn: {
      eyebrow: '粒子数线性关系',
      title: '理想气体中的 P-N 关系',
      discoveredBy: '这不是通常单独命名的一条经典气体定律，但它直接来自理想气体状态方程，并可从阿伏伽德罗关于粒子数与宏观量关系的视角来理解。',
      discovery: '当温度与体积都固定时，增加粒子数就意味着单位时间内会有更多粒子撞墙，因此平均压强应随 N 近似线性增大。',
      significance: '这条关系特别适合把“微观粒子数增加”与“宏观压强上升”直接联系起来，帮助学习者理解状态方程里的 N 不是抽象符号，而是有清晰统计物理意义的量。',
      status: '它虽然不像波义耳或盖-吕萨克定律那样常被单独冠名，但却是理想气体状态方程中最直接、最有教学价值的线性关系之一。',
      simulation: '在本实验中，你固定温度和体积，只改变粒子数 N，再用墙碰动量通量测得压强，最后检查平衡压强是否随 N 线性增长。',
    },
  },
  'zh-TW': {
    pt: {
      eyebrow: '定容壓力定律',
      title: '蓋-呂薩克 / 阿蒙頓定律',
      discoveredBy: '這條關係通常追溯到 Guillaume Amontons 在約 1700 年對氣體壓強與溫度關係的經驗建立，以及 Joseph-Louis Gay-Lussac 在 19 世紀初對氣體規律的更系統整理。',
      discovery: '這類研究來自對受限氣體受熱後壓強變化的觀察。教材中常把定容下的 P 與 T 正比寫成 Amontons’s law，也常寫作 Gay-Lussac’s law。',
      significance: '它把「溫度升高意味著分子熱運動更劇烈」這一直覺，轉成可測量的巨觀壓強規律，是熱學從經驗走向定量的重要一步。',
      status: '這條關係後來成為理想氣體方程的重要特例，也是絕對溫標與氣體熱學教學中的核心橋樑。',
      simulation: '在本實驗中，你不是直接代入經驗公式，而是先用撞牆動量通量測壓，再檢驗平衡壓強是否隨平衡溫度線性增加。',
    },
    pv: {
      eyebrow: '等溫壓縮定律',
      title: '波義耳定律',
      discoveredBy: 'Robert Boyle 在 1662 年給出了定溫條件下壓強與體積反比的經驗關係；Edme Mariotte 在 1676 年也獨立得到同類結論。',
      discovery: '這條定律來自對氣體壓縮與膨脹實驗的系統觀察。經典表述是 P 與 V 成反比，因此原始圖像是 P-V 雙曲關係。',
      significance: '波義耳定律是最早被系統寫成數學比例關係的氣體定律之一，使氣體從「會膨脹收縮的流體」變成可定量預測的對象。',
      status: '它構成了後續一般氣體方程和理想氣體方程的核心部分，也是近代實驗物理與化學定量傳統的代表性成果。',
      simulation: '本頁同時給出原始 P-V 圖和線性化 P-1/V 圖。前者負責展示物理直觀，後者負責線性擬合、R² 與自動判定。',
    },
    pn: {
      eyebrow: '粒子數線性關係',
      title: '理想氣體中的 P-N 關係',
      discoveredBy: '這不是通常單獨命名的一條經典氣體定律，但它直接來自理想氣體狀態方程，也可從阿伏伽德羅關於粒子數與巨觀量關係的視角理解。',
      discovery: '當溫度與體積都固定時，增加粒子數就意味著單位時間內會有更多粒子撞牆，因此平均壓強應隨 N 近似線性增加。',
      significance: '這條關係特別適合把「微觀粒子數增加」與「巨觀壓強上升」直接聯繫起來，幫助學習者理解狀態方程中的 N 並不是抽象符號。',
      status: '它雖不像波義耳或蓋-呂薩克定律那樣常被單獨冠名，但卻是理想氣體狀態方程中最直接、最有教學價值的線性關係之一。',
      simulation: '在本實驗中，你固定溫度和體積，只改變粒子數 N，再用撞牆動量通量測得壓強，最後檢查平衡壓強是否隨 N 線性增加。',
    },
  },
  'en-GB': {
    pt: {
      eyebrow: 'Constant-Volume Pressure Law',
      title: 'Gay-Lussac / Amontons Pressure Law',
      discoveredBy: 'This relation is commonly traced to Guillaume Amontons, who empirically established the pressure-temperature link around 1700, and to Joseph-Louis Gay-Lussac, who refined gas-law work in the early nineteenth century.',
      discovery: 'The law came out of observing how a confined gas changes its pressure when heated. In many textbooks, the constant-volume proportionality P ∝ T is presented as Amontons’s law, and it is also often associated with Gay-Lussac.',
      significance: 'It turned the intuition that hotter gases have more vigorous microscopic motion into a measurable macroscopic law for pressure.',
      status: 'It later became a standard special case of the ideal-gas equation and an important bridge toward the absolute temperature scale.',
      simulation: 'In this lab, pressure is not injected as a display formula. It is measured from wall-normal momentum transfer and then checked against the equilibrium temperature.',
    },
    pv: {
      eyebrow: 'Isothermal Compression Law',
      title: 'Boyle’s Law',
      discoveredBy: 'Robert Boyle formulated the inverse pressure-volume relation for gases in 1662. Edme Mariotte later obtained the same relation independently in 1676.',
      discovery: 'The law emerged from systematic compression and expansion experiments on gases. Its classical statement is that pressure varies inversely with volume at fixed temperature.',
      significance: 'Boyle’s law was one of the earliest gas laws expressed in a quantitative mathematical form, helping turn gases into a predictable physical system rather than a purely qualitative fluid.',
      status: 'It became one of the core ingredients of the later general gas equation and the ideal-gas law, and it remains a landmark in quantitative experimental science.',
      simulation: 'This page shows both the original P-V curve and the linearised P-1/V plot. The first conveys the physical picture; the second drives the fit, R², and automatic verification.',
    },
    pn: {
      eyebrow: 'Particle-Count Linear Relation',
      title: 'The P-N Relation in an Ideal Gas',
      discoveredBy: 'This is not usually taught as a separately named gas law, but it follows directly from the ideal-gas equation and is naturally connected to the Avogadro view of particle count in macroscopic gas behaviour.',
      discovery: 'At fixed temperature and fixed volume, adding more particles means more wall collisions per unit time, so the average pressure should grow approximately linearly with N.',
      significance: 'This relation is especially useful pedagogically because it links a microscopic quantity, particle count, to a directly measurable macroscopic one, pressure.',
      status: 'Although it is not typically given a standalone historical law name like Boyle’s law, it is one of the clearest linear consequences of the ideal-gas equation.',
      simulation: 'In this lab, temperature and volume stay fixed while only N changes. Pressure is still measured from wall-normal momentum transfer, and then checked against the fitted P-N trend.',
    },
  },
};

const clampNumber = (value: number, min = 0, max = Number.POSITIVE_INFINITY) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const getNextPresetTemperature = (currentTemperature: number) => {
  const nextPreset = TEMPERATURE_PRESETS.find((preset) => preset > currentTemperature + 1e-6);
  return nextPreset ?? currentTemperature;
};

const getNextPresetBoxLength = (currentBoxLength: number) => {
  const nextPreset = BOX_LENGTH_PRESETS.find((preset) => preset > currentBoxLength + 1e-6);
  return nextPreset ?? currentBoxLength;
};

const getNextPresetParticleCount = (currentParticleCount: number) => {
  const nextPreset = PARTICLE_COUNT_PRESETS.find((preset) => preset > currentParticleCount + 1e-6);
  return nextPreset ?? currentParticleCount;
};

const isSameSamplingPreset = (
  params: Pick<SimulationParams, 'equilibriumTime' | 'statsDuration'>,
  preset: Pick<SimulationParams, 'equilibriumTime' | 'statsDuration'>,
) =>
  Math.abs(params.equilibriumTime - preset.equilibriumTime) <= 1e-6 &&
  Math.abs(params.statsDuration - preset.statsDuration) <= 1e-6;

const hasRecordedCurrentVariable = (
  relation: ExperimentRelation,
  points: IdealGasExperimentPoint[],
  params: ExperimentParams,
) => {
  if (relation === 'pt') {
    return points.some((point) => Math.abs(point.targetTemperature - params.targetTemperature) <= 1e-6);
  }

  if (relation === 'pv') {
    return points.some((point) => Math.abs((point.boxLength ?? Number.NaN) - params.L) <= 1e-6);
  }

  if (relation === 'pn') {
    return points.some((point) => Math.abs((point.particleCount ?? Number.NaN) - params.N) <= 1e-6);
  }

  return false;
};

const formatScalar = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  const absolute = Math.abs(value);
  if (absolute >= 1000 || (absolute > 0 && absolute < 0.01)) return formatScientificWithSuperscript(value, 2);
  if (absolute >= 100) return value.toFixed(1);
  if (absolute >= 10) return value.toFixed(2);
  if (absolute >= 1) return value.toFixed(3);
  return value.toFixed(4);
};

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return `${value.toFixed(2)}%`;
};

const formatAxisValue = (value: number) => {
  if (!Number.isFinite(value)) return '--';
  const absolute = Math.abs(value);
  if (absolute >= 1000 || (absolute > 0 && absolute < 0.01)) return formatScientificWithSuperscript(value, 2);
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

const getPhaseLabel = (stats: SimulationStats, t: Translation) => {
  switch (stats.phase) {
    case 'equilibrating':
      return t.stats.equilibrating;
    case 'collecting':
      return t.stats.collecting;
    case 'finished':
      return t.stats.finished;
    default:
      return t.stats.idle;
  }
};

const loadAutoShownHistory = (): AutoShownHistory => {
  if (typeof window === 'undefined') return createEmptyAutoShownMap();

  try {
    const raw = window.localStorage.getItem(HISTORY_AUTO_SHOWN_STORAGE_KEY);
    if (!raw) return createEmptyAutoShownMap();
    const parsed = JSON.parse(raw) as Partial<AutoShownHistory>;
    return {
      pt: !!parsed.pt,
      pv: !!parsed.pv,
      pn: !!parsed.pn || !!(parsed as Record<string, boolean | undefined>).vt,
    };
  } catch {
    return createEmptyAutoShownMap();
  }
};

const persistAutoShownHistory = (value: AutoShownHistory) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(HISTORY_AUTO_SHOWN_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures; they should not break the experiment flow.
  }
};

const calculateRegression = (
  points: IdealGasExperimentPoint[],
  getX: (point: IdealGasExperimentPoint) => number,
  getY: (point: IdealGasExperimentPoint) => number,
  theoreticalSlope: number | null,
): RegressionSummary => {
  if (points.length < 2) {
    return { slope: null, intercept: null, rSquared: null, slopeError: null };
  }

  const meanX = points.reduce((sum, point) => sum + getX(point), 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + getY(point), 0) / points.length;

  let numerator = 0;
  let denominator = 0;
  for (const point of points) {
    const dx = getX(point) - meanX;
    numerator += dx * (getY(point) - meanY);
    denominator += dx * dx;
  }

  if (Math.abs(denominator) < 1e-9) {
    return { slope: null, intercept: null, rSquared: null, slopeError: null };
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const predicted = points.map((point) => slope * getX(point) + intercept);
  const totalSumSquares = points.reduce((sum, point) => {
    const diff = getY(point) - meanY;
    return sum + diff * diff;
  }, 0);
  const residualSumSquares = points.reduce((sum, point, index) => {
    const diff = getY(point) - predicted[index];
    return sum + diff * diff;
  }, 0);
  const rSquared = totalSumSquares > 1e-9 ? 1 - residualSumSquares / totalSumSquares : null;
  const slopeError =
    theoreticalSlope !== null && Math.abs(theoreticalSlope) > 1e-9
      ? Math.abs((slope - theoreticalSlope) / theoreticalSlope) * 100
      : null;

  return { slope, intercept, rSquared, slopeError };
};

const getNumericDomain = (values: number[]) => {
  if (values.length === 0) return [0, 1];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, Math.abs(max || 1) * 0.1, 0.1);

  return [min - spread * 0.08, max + spread * 0.08];
};

const getRelationVariableKey = (relation: ExperimentRelation): ExperimentParamKey | null => {
  switch (relation) {
    case 'pt':
      return 'targetTemperature';
    case 'pv':
      return 'L';
    case 'pn':
      return 'N';
    default:
      return null;
  }
};

const isVariableKeyForRelation = (relation: ExperimentRelation, key: ExperimentParamKey) =>
  getRelationVariableKey(relation) === key;

const getRelationXValue = (relation: ExperimentRelation, point: IdealGasExperimentPoint) => {
  switch (relation) {
    case 'pt':
      return point.meanTemperature;
    case 'pv':
      return point.inverseVolume ?? 0;
    case 'pn':
      return point.particleCount ?? 0;
    default:
      return point.meanTemperature;
  }
};

const getTheoreticalSlope = (relation: ExperimentRelation, params: ExperimentParams) => {
  switch (relation) {
    case 'pt':
      return params.N * params.k / Math.pow(params.L, 3);
    case 'pv':
      return params.N * params.k * params.targetTemperature;
    case 'pn':
      return (params.k * params.targetTemperature) / Math.pow(params.L, 3);
    default:
      return null;
  }
};

const getVerdict = (
  points: IdealGasExperimentPoint[],
  regression: RegressionSummary,
  t: Translation,
): VerdictSummary => {
  const state = getExperimentVerdictState(points, regression);
  switch (state) {
    case 'verified':
      return { label: t.experiment.verified, isVerified: true, state };
    case 'preliminary':
      return { label: t.experiment.preliminary, isVerified: false, state };
    case 'notYet':
      return { label: t.experiment.notYet, isVerified: false, state };
    default:
      return { label: t.experiment.insufficient, isVerified: false, state };
  }
};

const getFailureReasonText = (reason: ExperimentFailureReason | null, t: Translation) => {
  switch (reason) {
    case 'insufficient_points':
      return t.experiment.failureReasonInsufficientPoints;
    case 'insufficient_range':
      return t.experiment.failureReasonInsufficientRange;
    case 'weak_fit':
      return t.experiment.failureReasonWeakFit;
    case 'slope_mismatch':
      return t.experiment.failureReasonSlopeMismatch;
    case 'preliminary_gap':
      return t.experiment.failureReasonPreliminary;
    default:
      return t.experiment.failureReasonVerified;
  }
};

const getRecommendationText = (
  reason: ExperimentFailureReason | null,
  verdictState: VerdictSummary['state'],
  relation: ExperimentRelation,
  lang: LanguageCode,
  t: Translation,
) => {
  const goodText =
    relation === 'pv'
      ? lang === 'en-GB'
        ? 'The current data already gives a clear Boyle-law trend: pressure decreases as volume increases.'
        : lang === 'zh-TW'
          ? '目前結果已能較清楚支持波以耳關係：體積增大時壓強降低。'
          : '当前结果已能较清楚支持波义耳关系：体积增大时压强降低。'
      : relation === 'pn'
        ? lang === 'en-GB'
          ? 'The current data already shows a clear P-N trend: pressure rises approximately linearly with particle count.'
          : lang === 'zh-TW'
            ? '目前結果已能較清楚支持 P-N 關係：壓強會隨粒子數近似線性增加。'
            : '当前结果已能较清楚支持 P-N 关系：压强会随粒子数近似线性增加。'
      : t.experiment.recommendationGood;
  const needMoreText =
    relation === 'pv'
      ? lang === 'en-GB'
        ? 'Keep at least five points and cover both the smaller-L and larger-L sides.'
        : lang === 'zh-TW'
          ? '至少保留 5 個點，並覆蓋較小 L 與較大 L 兩側。'
          : '至少保留 5 个点，并覆盖较小 L 与较大 L 两侧。'
      : relation === 'pn'
        ? lang === 'en-GB'
          ? 'Keep at least five points and cover both the lower-N and higher-N sides.'
          : lang === 'zh-TW'
            ? '至少保留 5 個點，並覆蓋較小 N 與較大 N 兩側。'
            : '至少保留 5 个点，并覆盖较小 N 与较大 N 两侧。'
      : t.experiment.recommendationNeedMore;
  const needRangeText =
    relation === 'pv'
      ? lang === 'en-GB'
        ? 'The current box-length span is still too narrow. Add a smaller-L or larger-L point.'
        : lang === 'zh-TW'
          ? '目前容器邊長跨度仍偏窄，建議加入更小 L 或更大 L 的點。'
          : '当前容器边长跨度仍偏窄，建议加入更小 L 或更大 L 的点。'
      : relation === 'pn'
        ? lang === 'en-GB'
          ? 'The current particle-count span is still too narrow. Add a smaller-N or larger-N point.'
          : lang === 'zh-TW'
            ? '目前粒子數跨度仍偏窄，建議加入更小 N 或更大 N 的點。'
            : '当前粒子数跨度仍偏窄，建议加入更小 N 或更大 N 的点。'
      : t.experiment.recommendationNeedRange;

  if (verdictState === 'verified') return goodText;
  if (verdictState === 'preliminary' || reason === 'preliminary_gap') return t.experiment.recommendationPreliminary;

  switch (reason) {
    case 'insufficient_points':
      return needMoreText;
    case 'insufficient_range':
      return needRangeText;
    case 'weak_fit':
      return t.experiment.recommendationWeakFit;
    case 'slope_mismatch':
      return t.experiment.recommendationSlopeMismatch;
    default:
      return needMoreText;
  }
};

const getCoverageLabel = (relation: ExperimentRelation, points: IdealGasExperimentPoint[]) => {
  const formatValue = (value: number) => {
    const absolute = Math.abs(value);
    if (absolute >= 1000 || (absolute > 0 && absolute < 0.01)) {
      return formatScientificWithSuperscript(value, 2);
    }
    if (absolute >= 100) return value.toFixed(1);
    if (absolute >= 10) return value.toFixed(2);
    return value.toFixed(3);
  };

  const values = points
    .map((point) => {
      if (relation === 'pt') return point.targetTemperature;
      if (relation === 'pv') return point.boxLength ?? null;
      if (relation === 'pn') return point.particleCount ?? null;
      return point.meanTemperature;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (values.length === 0) return '--';
  if (values.length === 1) return formatValue(values[0]);

  const min = Math.min(...values);
  const max = Math.max(...values);
  return `${formatValue(min)} ~ ${formatValue(max)}`;
};

const IdealGasExperimentMode: React.FC<IdealGasExperimentModeProps> = ({
  mode,
  onModeChange,
  defaultParams,
  t,
  lang,
  modeSwitchSpacingClass = 'pt-24 pb-0 md:pt-20',
  headerSpacingClass = 'pt-24 pb-2 md:pt-20 md:pb-6',
  isDarkMode = false,
  supportsHover = true,
  touchLike = false,
  isCompactLandscape = false,
  onNotify,
  footer,
}) => {
  const [relation, setRelation] = useState<ExperimentRelation>('pt');
  const [params, setParams] = useState<ExperimentParams>(() => createExperimentParams(defaultParams));
  const [activeParams, setActiveParams] = useState<ExperimentParams>(() => createExperimentParams(defaultParams));
  const [stats, setStats] = useState<SimulationStats>(createIdleStats);
  const [isRunning, setIsRunning] = useState(false);
  const [needsReset, setNeedsReset] = useState(false);
  const [pointsByRelation, setPointsByRelation] = useState<PointsByRelation>(() => createEmptyPointsMap());
  const [latestSummary, setLatestSummary] = useState<PressureMeasurementSummary | null>(null);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [historyModalRelation, setHistoryModalRelation] = useState<ExperimentRelation | null>(null);
  const [historyAutoShown, setHistoryAutoShown] = useState<AutoShownHistory>(() => loadAutoShownHistory());
  const [isAdvancedPanelOpen, setIsAdvancedPanelOpen] = useState(false);
  const [failurePromptState, setFailurePromptState] = useState<FailurePromptState | null>(null);
  const [failurePromptShownByRelation, setFailurePromptShownByRelation] = useState<FailurePromptShownMap>(() =>
    createEmptyFailurePromptMap(),
  );

  const engineRef = useRef<PhysicsEngine | null>(null);
  const reqRef = useRef<number>(0);
  const completionRecordedRef = useRef(false);

  const localeCopy = LOCAL_COPY[lang];
  const advancedCopy = ADVANCED_PANEL_COPY[lang];
  const relationPoints = pointsByRelation[relation];
  const sortedPoints = [...relationPoints].sort((a, b) => getRelationXValue(relation, a) - getRelationXValue(relation, b));
  const theoreticalSlope = getTheoreticalSlope(relation, params);
  const regression = calculateRegression(
    sortedPoints,
    (point) => getRelationXValue(relation, point),
    (point) => point.meanPressure,
    theoreticalSlope,
  );
  const verdict = getVerdict(sortedPoints, regression, t);
  const diagnosis = diagnoseExperimentFailure(sortedPoints, relation, regression);
  const recommendationText = getRecommendationText(diagnosis.failureReason, verdict.state, relation, lang, t);
  const failureReasonText = getFailureReasonText(diagnosis.failureReason, t);
  const coverageLabel = getCoverageLabel(relation, sortedPoints);
  const historyAvailable = verdict.isVerified;
  const failurePromptKey =
    diagnosis.hasCompletedPresetRound && verdict.state === 'notYet' && diagnosis.failureReason
      ? `${relation}:${diagnosis.failureReason}:${verdict.state}`
      : null;
  const activeSamplingPreset =
    (Object.entries(SAMPLING_PRESETS) as Array<[keyof typeof SAMPLING_PRESETS, typeof SAMPLING_PRESETS[keyof typeof SAMPLING_PRESETS]]>)
      .find(([, preset]) => isSameSamplingPreset(params, preset))?.[0] ?? null;

  const notify = (text: string, duration = 1800, type: NoticeType = 'info') => {
    onNotify?.(text, duration, type);
  };

  const resetCurrentPoint = (showToast = true, options: ResetCurrentPointOptions = {}) => {
    const invalidValues = Object.values(params).some((value) => Number.isNaN(value));
    if (invalidValues) {
      notify(t.messages.checkInputs, 2200, 'warning');
      return;
    }

    if (reqRef.current) {
      cancelAnimationFrame(reqRef.current);
    }

    const shouldAdvancePresetTemperature =
      options.advancePresetTemperature === true && relation === 'pt' && !isRunning;
    const nextParams = { ...params };

    if (shouldAdvancePresetTemperature) {
      const nextPresetTemperature = getNextPresetTemperature(params.targetTemperature);
      if (Math.abs(nextPresetTemperature - params.targetTemperature) > 1e-6) {
        nextParams.targetTemperature = nextPresetTemperature;
        setParams((current) => ({ ...current, targetTemperature: nextPresetTemperature }));
      }
    }

    const shouldAdvancePresetBoxLength =
      options.advancePresetBoxLength === true && relation === 'pv' && !isRunning;

    if (shouldAdvancePresetBoxLength) {
      const nextPresetBoxLength = getNextPresetBoxLength(params.L);
      if (Math.abs(nextPresetBoxLength - params.L) > 1e-6) {
        nextParams.L = nextPresetBoxLength;
        setParams((current) => ({ ...current, L: nextPresetBoxLength }));
      }
    }

    const shouldAdvancePresetParticleCount =
      options.advancePresetParticleCount === true && relation === 'pn' && !isRunning;

    if (shouldAdvancePresetParticleCount) {
      const nextPresetParticleCount = getNextPresetParticleCount(params.N);
      if (Math.abs(nextPresetParticleCount - params.N) > 1e-6) {
        nextParams.N = nextPresetParticleCount;
        setParams((current) => ({ ...current, N: nextPresetParticleCount }));
      }
    }

    engineRef.current = new PhysicsEngine(nextParams);
    completionRecordedRef.current = false;
    setActiveParams(nextParams);
    setStats(engineRef.current.getStats());
    setLatestSummary(engineRef.current.getPressureMeasurementSummary());
    setIsRunning(false);
    setNeedsReset(false);

    if (showToast) {
      notify(t.messages.resetSuccess, 1800, 'success');
    }
  };

  useEffect(() => {
    resetCurrentPoint(false);
    return () => {
      if (reqRef.current) {
        cancelAnimationFrame(reqRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    persistAutoShownHistory(historyAutoShown);
  }, [historyAutoShown]);

  useEffect(() => {
    if (!historyModalRelation) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHistoryModalRelation(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [historyModalRelation]);

  useEffect(() => {
    if (!failurePromptState) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFailurePromptState(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [failurePromptState]);

  useEffect(() => {
    if (!isAdvancedPanelOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAdvancedPanelOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdvancedPanelOpen]);

  useEffect(() => {
    if (!isRunning) {
      if (reqRef.current) {
        cancelAnimationFrame(reqRef.current);
      }
      return;
    }

    const tick = () => {
      const engine = engineRef.current;
      if (!engine) return;

      const subSteps = 5;
      for (let index = 0; index < subSteps; index += 1) {
        engine.step();
        if (
          engine.time >= activeParams.equilibriumTime &&
          engine.time < activeParams.equilibriumTime + activeParams.statsDuration
        ) {
          engine.collectSamples();
        }
      }

      const currentStats = engine.getStats();
      setStats(currentStats);
      setLatestSummary(engine.getPressureMeasurementSummary());

      if (currentStats.phase === 'finished') {
        engine.flushPressureMeasurement();
        const pressureSummary = engine.getPressureMeasurementSummary();
        const sampleCount = pressureSummary.sampleCount;
        const meanTemperature = pressureSummary.meanTemperature;
        const meanPressure = pressureSummary.meanPressure;
        const meanIdealPressure = pressureSummary.meanIdealPressure;
        const volume = Math.pow(activeParams.L, 3);

        setLatestSummary(pressureSummary);
        setIsRunning(false);
        setNeedsReset(true);

        if (
          !completionRecordedRef.current &&
          sampleCount > 0 &&
          meanTemperature !== null &&
          meanPressure !== null &&
          meanIdealPressure !== null
        ) {
          completionRecordedRef.current = true;
          const nextPoint: IdealGasExperimentPoint = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            relation,
            targetTemperature: activeParams.targetTemperature,
            meanTemperature,
            meanPressure,
            idealPressure: meanIdealPressure,
            relativeGap: pressureSummary.relativeGap ?? 0,
            timestamp: Date.now(),
            boxLength: activeParams.L,
            volume,
            inverseVolume: volume > 0 ? 1 / volume : null,
            particleCount: activeParams.N,
          };

          setPointsByRelation((current) => ({
            ...current,
            [relation]: [...current[relation], nextPoint],
          }));
          notify(t.experiment.pointRecorded, 1900, 'success');
        }

        return;
      }

      reqRef.current = requestAnimationFrame(tick);
    };

    reqRef.current = requestAnimationFrame(tick);
    return () => {
      if (reqRef.current) {
        cancelAnimationFrame(reqRef.current);
      }
    };
  }, [activeParams, isRunning, notify, relation, t.experiment.pointRecorded]);

  useEffect(() => {
    if (!historyAvailable || historyAutoShown[relation]) return;

    setHistoryAutoShown((current) => {
      const next = { ...current, [relation]: true };
      return next;
    });
  }, [historyAutoShown, historyAvailable, relation]);

  useEffect(() => {
    if (verdict.state !== 'notYet' || !diagnosis.failureReason || !diagnosis.hasCompletedPresetRound) return;
    if (historyModalRelation || failurePromptState) return;
    if (failurePromptKey === null || failurePromptShownByRelation[relation] === failurePromptKey) return;

    setFailurePromptState({
      relation,
      reason: diagnosis.failureReason,
      key: failurePromptKey,
    });
    setFailurePromptShownByRelation((current) => ({
      ...current,
      [relation]: failurePromptKey,
    }));
  }, [
    diagnosis.failureReason,
    diagnosis.hasCompletedPresetRound,
    failurePromptKey,
    failurePromptShownByRelation,
    failurePromptState,
    historyModalRelation,
    relation,
    verdict.state,
  ]);

  const invalidatePointsForKey = (changedKey: ExperimentParamKey) => {
    let didClear = false;
    const clearedRelations: ExperimentRelation[] = [];

    setPointsByRelation((current) => {
      const next = createEmptyPointsMap();
      (Object.keys(current) as ExperimentRelation[]).forEach((currentRelation) => {
        if (current[currentRelation].length === 0 || isVariableKeyForRelation(currentRelation, changedKey)) {
          next[currentRelation] = current[currentRelation];
          return;
        }
        didClear = true;
        clearedRelations.push(currentRelation);
        next[currentRelation] = [];
      });
      return didClear ? next : current;
    });

    if (didClear) {
      setFailurePromptShownByRelation((current) => {
        const next = { ...current };
        clearedRelations.forEach((currentRelation) => {
          next[currentRelation] = null;
        });
        return next;
      });
      notify(t.experiment.conditionsChanged, 2200, 'warning');
    }
  };

  const clearExperimentPoints = () => {
    setPointsByRelation((current) => ({
      ...current,
      [relation]: [],
    }));
    if (relation === 'pv') {
      setParams((current) => ({ ...current, L: DEFAULT_BOX_LENGTH }));
      setNeedsReset(true);
    }
    if (relation === 'pn') {
      setParams((current) => ({ ...current, N: DEFAULT_PARTICLE_COUNT }));
      setNeedsReset(true);
    }
    if (historyModalRelation === relation) {
      setHistoryModalRelation(null);
    }
    if (failurePromptState?.relation === relation) {
      setFailurePromptState(null);
    }
    setFailurePromptShownByRelation((current) => ({
      ...current,
      [relation]: null,
    }));
    notify(t.experiment.pointsCleared, 1700, 'success');
  };

  const applySamplingPreset = (preset: Pick<SimulationParams, 'equilibriumTime' | 'statsDuration'>) => {
    setParams((current) => ({
      ...current,
      equilibriumTime: preset.equilibriumTime,
      statsDuration: preset.statsDuration,
    }));
    setNeedsReset(true);
    invalidatePointsForKey('equilibriumTime');
  };

  const updateConstant = (key: keyof SimulationParams, rawValue: string) => {
    const parsed = rawValue === '' ? Number.NaN : parseFloat(rawValue);
    let nextValue = parsed;

    if (!Number.isNaN(nextValue)) {
      if (key === 'N') nextValue = Math.max(1, Math.round(nextValue));
      else if (key === 'L' || key === 'r' || key === 'm' || key === 'k' || key === 'dt') nextValue = Math.max(0.01, nextValue);
      else nextValue = Math.max(0, nextValue);
    }

    setParams((current) => ({ ...current, [key]: nextValue }));
    setNeedsReset(true);
    invalidatePointsForKey(key);
  };

  const updateTargetTemperature = (rawValue: string) => {
    const parsed = rawValue === '' ? Number.NaN : parseFloat(rawValue);
    const nextValue = Number.isNaN(parsed)
      ? Number.NaN
      : clampNumber(parsed, TEMPERATURE_MIN, TEMPERATURE_MAX);

    setParams((current) => ({ ...current, targetTemperature: nextValue }));
    setNeedsReset(true);
    invalidatePointsForKey('targetTemperature');
  };

  const updateAdvancedValue = (key: ExperimentParamKey, rawValue: string) => {
    if (key === 'targetTemperature') {
      updateTargetTemperature(rawValue);
      return;
    }

    updateConstant(key, rawValue);
  };

  const updateBoxLength = (rawValue: string) => {
    const parsed = rawValue === '' ? Number.NaN : parseFloat(rawValue);
    const nextValue = Number.isNaN(parsed)
      ? Number.NaN
      : clampNumber(parsed, BOX_LENGTH_MIN, BOX_LENGTH_MAX);

    setParams((current) => ({ ...current, L: nextValue }));
    setNeedsReset(true);
    invalidatePointsForKey('L');
  };

  const handleStartPause = () => {
    if (needsReset) {
      const isFirstPointLaunch = relationPoints.length === 0 && stats.time === 0 && stats.phase !== 'finished';
      if (isFirstPointLaunch) {
        resetCurrentPoint(false);
        setIsRunning(true);
        return;
      }

      notify(t.experiment.resetRequired, 2200, 'warning');
      return;
    }

    if (!isRunning) {
      setIsRunning(true);
      return;
    }

    setIsRunning(false);
  };

  const handleRelationClick = (nextRelation: ExperimentRelation) => {
    if (nextRelation === relation) return;
    if (isRunning) return;

    const nextParams =
      nextRelation === 'pv' && pointsByRelation.pv.length === 0
        ? { ...params, L: DEFAULT_BOX_LENGTH, targetTemperature: PV_DEFAULT_TEMPERATURE }
        : nextRelation === 'pn' && pointsByRelation.pn.length === 0
          ? { ...params, N: DEFAULT_PARTICLE_COUNT, targetTemperature: PN_DEFAULT_TEMPERATURE }
        : params;
    const nextEngine = new PhysicsEngine(nextParams);

    setRelation(nextRelation);
    setParams(nextParams);
    setActiveParams(nextParams);
    engineRef.current = nextEngine;
    completionRecordedRef.current = false;
    setStats(createIdleStats());
    setLatestSummary(nextEngine.getPressureMeasurementSummary());
    setNeedsReset(false);
    setIsCanvasFocused(false);
    setFailurePromptState(null);
  };

  const removePoint = (id: string) => {
    setPointsByRelation((current) => ({
      ...current,
      [relation]: current[relation].filter((point) => point.id !== id),
    }));
    setFailurePromptShownByRelation((current) => ({
      ...current,
      [relation]: null,
    }));
  };

  const openHistoryModal = (targetRelation: ExperimentRelation) => {
    setHistoryModalRelation(targetRelation);
  };

  const isEnglishUI = lang.startsWith('en');
  const isDesktopLike = supportsHover && !touchLike;
  const isAdvancedOverlay = !isDesktopLike;
  const sidebarWidthClass = isAdvancedOverlay ? 'w-[85vw] max-w-[360px]' : 'w-[300px]';
  const shellClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const cardClass = isDarkMode
    ? 'border-slate-800 bg-slate-950'
    : 'border-slate-200 bg-white';
  const mutedTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const secondaryTextClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const floatingAdvancedButtonClass = isDarkMode
    ? 'border-slate-700/60 bg-slate-800/90 text-slate-100'
    : 'border-slate-200/70 bg-white/90 text-slate-700';
  const interactiveHoverClass = supportsHover
    ? isDarkMode
      ? 'hover:border-sciblue-600 hover:text-sciblue-200'
      : 'hover:border-sciblue-300 hover:text-sciblue-700'
    : '';
  const sectionHoverTextClass = isDesktopLike ? 'group-hover:text-sciblue-600 dark:group-hover:text-sciblue-400' : '';
  const sectionHoverIconClass = isDesktopLike ? 'group-hover:text-sciblue-500 group-hover:scale-110' : '';
  const floatingButtonHoverClass = isDesktopLike ? 'hover:shadow-[0_8px_30px_rgb(14,165,233,0.15)] hover:scale-105' : '';
  const floatingTextHoverClass = isDesktopLike ? 'group-hover:text-sciblue-600 dark:group-hover:text-sciblue-400' : '';
  const floatingAccentHoverClass = isDesktopLike ? 'group-hover:text-sciblue-400 dark:group-hover:text-sciblue-300' : '';
  const floatingIconHoverClass = isDesktopLike ? 'group-hover:rotate-12' : '';
  const subtleButtonClass = `${supportsHover ? interactiveHoverClass : ''} active:scale-95`;
  const prominentActionHoverClass = isDesktopLike ? 'hover:border-sciblue-600 hover:bg-sciblue-600 hover:shadow-[0_8px_30px_rgba(14,165,233,0.18)]' : '';
  const resetActionHoverClass = isDesktopLike ? 'hover:shadow-sm hover:scale-[1.02]' : '';
  const drawerInputClass = `rounded-panel border px-3 py-2 font-mono text-sm outline-none transition-all duration-300 ${
    isDarkMode
      ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-sciblue-500 focus:bg-slate-700'
      : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-sciblue-500 focus:bg-white'
  } ${isDesktopLike ? 'hover:border-slate-300 dark:hover:border-slate-600 focus:ring-1 focus:ring-sciblue-500/20' : ''}`;

  const pvOriginalData = [...relationPoints]
    .filter((point) => point.volume !== null && point.volume !== undefined)
    .sort((a, b) => (a.volume ?? 0) - (b.volume ?? 0))
    .map((point) => ({
      volume: point.volume ?? 0,
      measuredPressure: point.meanPressure,
      theoryPressure: point.volume ? (params.N * params.k * params.targetTemperature) / point.volume : null,
    }));

  const pvLinearData = sortedPoints.map((point) => ({
    inverseVolume: point.inverseVolume ?? 0,
    inverseVolumeScaled: (point.inverseVolume ?? 0) * INVERSE_VOLUME_AXIS_SCALE,
    measuredPressure: point.meanPressure,
    fitPressure:
      regression.slope !== null && regression.intercept !== null
        ? regression.slope * (point.inverseVolume ?? 0) + regression.intercept
        : null,
    theoryPressure:
      theoreticalSlope !== null
        ? theoreticalSlope * (point.inverseVolume ?? 0)
        : null,
  }));

  const ptChartData = sortedPoints.map((point) => ({
    temperature: point.meanTemperature,
    measuredPressure: point.meanPressure,
    fitPressure:
      regression.slope !== null && regression.intercept !== null
        ? regression.slope * point.meanTemperature + regression.intercept
        : null,
    theoryPressure:
      theoreticalSlope !== null
        ? theoreticalSlope * point.meanTemperature
        : null,
  }));

  const pnChartData = sortedPoints.map((point) => ({
    particleCount: point.particleCount ?? point.targetTemperature,
    measuredPressure: point.meanPressure,
    fitPressure:
      regression.slope !== null && regression.intercept !== null && point.particleCount !== null && point.particleCount !== undefined
        ? regression.slope * point.particleCount + regression.intercept
        : null,
    theoryPressure:
      theoreticalSlope !== null && point.particleCount !== null && point.particleCount !== undefined
        ? theoreticalSlope * point.particleCount
        : null,
  }));

  const chartData = relation === 'pt' ? ptChartData : relation === 'pn' ? pnChartData : pvLinearData;
  const xValues = relation === 'pt'
    ? ptChartData.map((item) => item.temperature)
    : relation === 'pn'
      ? pnChartData.map((item) => item.particleCount)
      : pvLinearData.map((item) => item.inverseVolumeScaled);
  const pvVolumeValues = pvOriginalData.map((item) => item.volume);
  const chartXDomain = getNumericDomain(xValues);
  const pvVolumeDomain = getNumericDomain(pvVolumeValues);

  const startButtonLabel = isRunning
    ? t.controls.pause
    : stats.time > 0 && !needsReset && stats.phase !== 'finished'
      ? t.controls.resume
      : t.experiment.runPoint;

  const phaseLabel = getPhaseLabel(stats, t);
  const pressureSummary = latestSummary ?? engineRef.current?.getPressureMeasurementSummary() ?? null;
  const currentMeasuredPressure = pressureSummary?.latestPressure ?? 0;
  const currentIdealReference = params.N * params.k * stats.temperature / Math.pow(params.L, 3);
  const currentVolume = Math.pow(params.L, 3);
  const currentInverseVolume = currentVolume > 0 ? 1 / currentVolume : 0;
  const showResetHint = needsReset && !isRunning;
  const timestampFormatter = new Intl.DateTimeFormat(lang, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const currentHistoryContent = historyModalRelation ? HISTORY_CONTENT[lang][historyModalRelation] : null;
  const failureReasonForModal = failurePromptState ? getFailureReasonText(failurePromptState.reason, t) : '';
  const inverseVolumeAxisLabel =
    lang === 'en-GB'
      ? 'Inverse Volume 1/V (x10^4)'
      : lang === 'zh-TW'
        ? '倒數體積 1/V（×10^4）'
        : '倒数体积 1/V（×10^4）';
  const variablePanelTitle =
    relation === 'pv'
      ? lang === 'en-GB'
        ? 'Volume / Box Length'
        : lang === 'zh-TW'
          ? '體積設置 / 容器邊長 L'
          : '体积设置 / 容器边长 L'
      : relation === 'pn'
        ? localeCopy.temperaturePanelTitle.pn
        : localeCopy.temperaturePanelTitle.pt;
  const variablePanelHint =
    relation === 'pv'
      ? lang === 'en-GB'
        ? 'Keep temperature fixed with the thermostat, then change L to create different volumes V = L^3.'
        : lang === 'zh-TW'
          ? '溫度由熱浴固定，改變容器邊長 L 以得到不同體積 V = L^3。'
          : '温度由热浴固定，改变容器边长 L 以得到不同体积 V = L^3。'
      : relation === 'pn'
        ? localeCopy.temperatureHint.pn
        : localeCopy.temperatureHint.pt;
  const advancedRelationNote =
    relation === 'pv'
      ? lang === 'en-GB'
        ? 'Box length L is the main variable here; target temperature is kept as an advanced constant.'
        : lang === 'zh-TW'
          ? '本關係中容器邊長 L 是主變量；目標溫度作為高級常量固定。'
          : '本关系中容器边长 L 是主变量；目标温度作为高级常量固定。'
      : relation === 'pn'
        ? lang === 'en-GB'
          ? 'Particle count N is the main variable here; target temperature and box length stay as advanced constants.'
          : lang === 'zh-TW'
            ? '本關係中粒子數 N 是主變量；目標溫度與容器邊長作為高級常量固定。'
            : '本关系中粒子数 N 是主变量；目标温度与容器边长作为高级常量固定。'
      : lang === 'en-GB'
        ? 'Temperature is the main variable here; box length L is kept as an advanced constant.'
        : lang === 'zh-TW'
          ? '本關係中溫度是主變量；容器邊長 L 作為高級常量固定。'
          : '本关系中温度是主变量；容器边长 L 作为高级常量固定。';

  const summaryConditionText =
    relation === 'pt'
      ? `N = ${params.N}, L = ${params.L}, V = ${formatScalar(Math.pow(params.L, 3))}, k = ${formatScalar(params.k)}, ${localeCopy.summaryVariableLabel} = T`
      : relation === 'pn'
        ? `L = ${params.L}, V = ${formatScalar(Math.pow(params.L, 3))}, T* = ${formatScalar(params.targetTemperature)}, k = ${formatScalar(params.k)}, ${localeCopy.summaryVariableLabel} = N`
        : `N = ${params.N}, T* = ${formatScalar(params.targetTemperature)}, k = ${formatScalar(params.k)}, ${localeCopy.summaryVariableLabel} = V`;
  const advancedGroups = relation === 'pv'
    ? [
        {
          title: lang === 'en-GB' ? 'Fixed Conditions' : lang === 'zh-TW' ? '固定條件' : '固定条件',
          fields: [
            ['N', t.controls.particles, 1, 1],
            ['targetTemperature', t.experiment.targetTemperature, TEMPERATURE_STEP, TEMPERATURE_MIN],
          ],
        },
        {
          title: advancedCopy.sectionTitle.sampling,
          fields: [
            ['equilibriumTime', t.controls.equilTime, 0.5, 0],
            ['statsDuration', t.controls.statsDuration, 0.5, 0.5],
          ],
        },
        {
          title: advancedCopy.sectionTitle.model,
          fields: [
            ['r', t.controls.radius, 0.05, 0.05],
            ['m', 'm', 0.1, 0.1],
            ['k', 'k', 0.1, 0.1],
            ['dt', 'dt', 0.005, 0.005],
            ['nu', 'nu', 0.1, 0],
          ],
        },
      ] as Array<{ title: string; fields: Array<[ExperimentParamKey, string, number, number]> }>
    : relation === 'pn'
      ? [
          {
            title: lang === 'en-GB' ? 'Fixed Conditions' : lang === 'zh-TW' ? '固定條件' : '固定条件',
            fields: [
              ['L', t.controls.boxSize, 1, 1],
              ['targetTemperature', t.experiment.targetTemperature, TEMPERATURE_STEP, TEMPERATURE_MIN],
            ],
          },
          {
            title: advancedCopy.sectionTitle.sampling,
            fields: [
              ['equilibriumTime', t.controls.equilTime, 0.5, 0],
              ['statsDuration', t.controls.statsDuration, 0.5, 0.5],
            ],
          },
          {
            title: advancedCopy.sectionTitle.model,
            fields: [
              ['r', t.controls.radius, 0.05, 0.05],
              ['m', 'm', 0.1, 0.1],
              ['k', 'k', 0.1, 0.1],
              ['dt', 'dt', 0.005, 0.005],
              ['nu', 'nu', 0.1, 0],
            ],
          },
        ] as Array<{ title: string; fields: Array<[ExperimentParamKey, string, number, number]> }>
    : [
        {
          title: advancedCopy.sectionTitle.scale,
          fields: [
            ['N', t.controls.particles, 1, 1],
            ['L', t.controls.boxSize, 1, 1],
          ],
        },
        {
          title: advancedCopy.sectionTitle.sampling,
          fields: [
            ['equilibriumTime', t.controls.equilTime, 0.5, 0],
            ['statsDuration', t.controls.statsDuration, 0.5, 0.5],
          ],
        },
        {
          title: advancedCopy.sectionTitle.model,
          fields: [
            ['r', t.controls.radius, 0.05, 0.05],
            ['m', 'm', 0.1, 0.1],
            ['k', 'k', 0.1, 0.1],
            ['dt', 'dt', 0.005, 0.005],
            ['nu', 'nu', 0.1, 0],
          ],
        },
      ] as Array<{ title: string; fields: Array<[ExperimentParamKey, string, number, number]> }>;

  const isPvRelation = relation === 'pv';
  const columnsGridClass = isPvRelation
    ? 'mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-stretch'
    : 'mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]';
  const leftColumnClass = isPvRelation
    ? 'grid gap-4 xl:h-full xl:grid-rows-[auto_auto_minmax(0,1fr)]'
    : 'grid gap-4';
  const rightColumnClass = isPvRelation ? 'grid gap-4 xl:h-full' : 'grid gap-4';
  const verdictSectionClass = isPvRelation
    ? `rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass} xl:flex xl:h-full xl:flex-col`
    : `rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass}`;
  const tableSectionClass = isPvRelation
    ? `rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass} flex h-[32rem] flex-col`
    : `rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass}`;
  const tableViewportClass = isPvRelation ? 'mt-4 min-h-0 flex-1 overflow-auto pr-1' : 'mt-4 overflow-x-auto';
  const tableHeaderCellClass = `px-3 py-2 ${
    isPvRelation
      ? `sticky top-0 z-[1] ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-white text-slate-500'}`
      : ''
  }`;

  const verdictPanel = (
    <section className={verdictSectionClass}>
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-emerald-500" />
        <h2 className="text-base font-semibold md:text-lg">{t.experiment.verdictTitle}</h2>
      </div>
      <div className={`mt-4 grid ${isPvRelation ? 'gap-2.5' : 'gap-3'} sm:grid-cols-2`}>
        {[
          { label: t.experiment.verdictTitle, value: verdict.label },
          { label: t.experiment.slope, value: formatScalar(regression.slope) },
          { label: t.experiment.intercept, value: formatScalar(regression.intercept) },
          { label: t.experiment.rSquared, value: formatScalar(regression.rSquared) },
          { label: t.experiment.theoreticalSlope, value: formatScalar(theoreticalSlope) },
          { label: t.experiment.slopeError, value: formatPercent(regression.slopeError) },
        ].map((item) => (
          <div key={item.label} className={`rounded-panel border ${isPvRelation ? 'px-4 py-2.5' : 'px-4 py-3'} ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
            <div className={`text-[11px] font-semibold ${mutedTextClass}`}>{item.label}</div>
            <div className={`${isPvRelation ? 'mt-1.5 text-lg xl:text-xl' : 'mt-2 text-xl'} font-data font-semibold`}>{item.value}</div>
          </div>
        ))}
      </div>
      <div className={`mt-4 rounded-panel border px-4 ${isPvRelation ? 'py-3 text-sm leading-6 xl:flex-1 xl:py-4' : 'py-3 text-sm leading-7'} ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'} ${isPvRelation ? 'xl:flex xl:flex-col' : ''}`}>
        <div className="font-semibold text-slate-900 dark:text-slate-100">{t.experiment.conditionSummary}</div>
        <div className="mt-1 font-data">{summaryConditionText}</div>
        <div className="mt-4 font-semibold text-slate-900 dark:text-slate-100">{t.experiment.currentAssessmentTitle}</div>
        <div className="mt-1">{verdict.label}</div>
        <div className="mt-4 font-semibold text-slate-900 dark:text-slate-100">{t.experiment.failureReasonTitle}</div>
        <div className="mt-1">{failureReasonText}</div>
        <div className="mt-4 font-semibold text-slate-900 dark:text-slate-100">{t.experiment.conclusionSummary}</div>
        <div className="mt-1">{`${verdict.label}. ${recommendationText}`}</div>
        <div className={`${isPvRelation ? 'mt-auto pt-4' : 'mt-4'} font-semibold text-slate-900 dark:text-slate-100`}>{t.experiment.recommendationTitle}</div>
        <div className="mt-1">{recommendationText}</div>
      </div>
    </section>
  );

  const tablePanel = (
    <section className={tableSectionClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-violet-500" />
          <h2 className="text-base font-semibold md:text-lg">{t.experiment.tableTitle}</h2>
        </div>
        <button
          type="button"
          onClick={clearExperimentPoints}
          className={`inline-flex min-h-[40px] items-center justify-center gap-2 self-start rounded-panel border px-3.5 py-2 text-sm font-semibold transition-all duration-300 sm:self-auto ${
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-300'
              : 'border-slate-200 bg-white text-slate-600'
          } ${subtleButtonClass}`}
        >
          <Eraser size={15} />
          {t.experiment.clearPoints}
        </button>
      </div>

      <div className={tableViewportClass}>
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className={`text-left text-[11px] font-semibold uppercase tracking-[0.12em] ${mutedTextClass}`}>
              <th className={tableHeaderCellClass}>#</th>
              {relation === 'pt' ? (
                <>
                  <th className={tableHeaderCellClass}>{t.experiment.targetTempColumn}</th>
                  <th className={tableHeaderCellClass}>{t.experiment.meanTempColumn}</th>
                  <th className={tableHeaderCellClass}>{t.experiment.meanPressureColumn}</th>
                  <th className={tableHeaderCellClass}>{t.experiment.idealPressureColumn}</th>
                </>
              ) : relation === 'pn' ? (
                <>
                  <th className={tableHeaderCellClass}>{localeCopy.tableHeader.particles}</th>
                  <th className={tableHeaderCellClass}>{t.experiment.meanTempColumn}</th>
                  <th className={tableHeaderCellClass}>{t.experiment.meanPressureColumn}</th>
                  <th className={tableHeaderCellClass}>{t.experiment.idealPressureColumn}</th>
                </>
              ) : (
                <>
                  <th className={tableHeaderCellClass}>{localeCopy.tableHeader.boxLength}</th>
                  <th className={tableHeaderCellClass}>{localeCopy.tableHeader.volume}</th>
                  <th className={tableHeaderCellClass}>{localeCopy.tableHeader.inverseVolume}</th>
                  <th className={tableHeaderCellClass}>{t.experiment.meanTempColumn}</th>
                  <th className={tableHeaderCellClass}>{t.experiment.meanPressureColumn}</th>
                </>
              )}
              <th className={tableHeaderCellClass}>{t.experiment.relativeGapColumn}</th>
              <th className={tableHeaderCellClass}>{t.experiment.timeColumn}</th>
              <th className={tableHeaderCellClass}></th>
            </tr>
          </thead>
          <tbody>
            {sortedPoints.length === 0 ? (
              <tr>
                <td
                  colSpan={relation === 'pv' ? 9 : 8}
                  className={`rounded-panel border px-4 py-5 text-center text-sm ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                >
                  {relation === 'pt' ? localeCopy.noPoints.pt : relation === 'pn' ? localeCopy.noPoints.pn : localeCopy.noPoints.pv}
                </td>
              </tr>
            ) : (
              sortedPoints.map((point, index) => (
                <tr key={point.id} className={`${isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
                  <td className="rounded-l-panel px-3 py-3 font-data text-sm">{index + 1}</td>
                  {relation === 'pt' ? (
                    <>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.targetTemperature)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.meanTemperature)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.meanPressure)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.idealPressure)}</td>
                    </>
                  ) : relation === 'pn' ? (
                    <>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.particleCount)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.meanTemperature)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.meanPressure)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.idealPressure)}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.boxLength)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.volume)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.inverseVolume)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.meanTemperature)}</td>
                      <td className="px-3 py-3 font-data text-sm">{formatScalar(point.meanPressure)}</td>
                    </>
                  )}
                  <td className="px-3 py-3 font-data text-sm">{formatPercent(point.relativeGap)}</td>
                  <td className="px-3 py-3 text-sm">{timestampFormatter.format(new Date(point.timestamp))}</td>
                  <td className="rounded-r-panel px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removePoint(point.id)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-300 ${
                        isDarkMode
                          ? 'border-slate-700 bg-slate-900 text-slate-300'
                          : 'border-slate-200 bg-white text-slate-600'
                      } ${subtleButtonClass}`}
                    >
                      {t.experiment.removePoint}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderHistoryButton = (targetRelation: ExperimentRelation) => {
    if (!historyAvailable || targetRelation !== relation) return null;

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
          isDarkMode ? 'border-amber-800 bg-amber-950 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          {localeCopy.historyUnlocked}
        </span>
        <button
          type="button"
          onClick={() => openHistoryModal(targetRelation)}
          className={`inline-flex min-h-[36px] items-center justify-center gap-2 rounded-panel border px-3 py-2 text-sm font-semibold transition-all duration-300 ${
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-200'
              : 'border-slate-200 bg-white text-slate-700'
          } ${subtleButtonClass}`}
        >
          <Info size={15} />
          {localeCopy.historyButton}
        </button>
      </div>
    );
  };

  return (
    <>
      {isAdvancedOverlay && (
        <div
          className={`fixed inset-x-0 left-0 z-40 bg-slate-900/40 backdrop-blur-md transition-opacity duration-500 ${
            isAdvancedPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsAdvancedPanelOpen(false)}
        />
      )}

      <div className="flex h-full w-full">
        {!isAdvancedOverlay && (
          <div
            aria-hidden="true"
            className={`shrink-0 transition-[width] duration-500 cubic-bezier(0.25,1,0.5,1) ${
              isAdvancedPanelOpen ? 'w-[300px]' : 'w-0'
            }`}
          />
        )}

        <main className={`main-scroll flex-1 h-full overflow-y-auto overflow-x-hidden ${shellClass}`}>
        <div className="mx-auto flex min-h-full w-full max-w-[92rem] flex-col px-4 pb-10 sm:px-6 lg:px-8">
          <div className={`mx-auto w-full max-w-5xl shrink-0 px-4 text-center sm:px-6 ${modeSwitchSpacingClass}`}>
            <div className="mb-4 flex justify-center">
              <ModeSwitch
                mode={mode}
                onChange={onModeChange}
                t={t}
                isDarkMode={isDarkMode}
                supportsHover={supportsHover}
              />
            </div>
          </div>
          <header className={`mx-auto w-full max-w-5xl shrink-0 px-4 text-center animate-fade-in sm:px-6 ${headerSpacingClass}`}>
            <div className="mb-3 flex min-h-[2rem] justify-center landscape:mb-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sciblue-200/70 bg-sciblue-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sciblue-700 dark:border-sciblue-900/60 dark:bg-sciblue-950 dark:text-sciblue-200">
                <FlaskConical size={12} />
                {t.experiment.experimentMode}
              </div>
            </div>
            <h1 className={`font-serif font-black tracking-tight text-metallic ${isCompactLandscape ? 'mb-2 text-2xl' : 'mb-4 text-2xl sm:text-4xl landscape:mb-1 landscape:text-3xl md:text-6xl'} sm:whitespace-nowrap`}>
              {t.experiment.title}
            </h1>
            <p className={`mx-auto max-w-3xl text-sm font-medium leading-relaxed ${secondaryTextClass} md:text-base`}>
              {localeCopy.subtitle}
            </p>
          </header>

          <div className={columnsGridClass}>
            <div className={leftColumnClass}>
              <section className={`rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                      {t.experiment.relationTitle}
                    </div>
                    <h2 className="mt-1 text-base font-semibold md:text-lg">{t.experiment.setupTitle}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isDarkMode ? 'border-emerald-900/60 bg-emerald-950 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                      {t.experiment.relationReady}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {([
                    { key: 'pt', label: localeCopy.relationLabels.pt, available: true },
                    { key: 'pv', label: localeCopy.relationLabels.pv, available: true },
                    { key: 'pn', label: localeCopy.relationLabels.pn, available: true },
                  ] as const).map((item) => {
                    const isActive = relation === item.key;
                    const itemClass = item.available
                      ? isActive
                        ? isDarkMode
                          ? 'border-sciblue-500/80 bg-sciblue-950 text-sciblue-100'
                          : 'border-sciblue-300 bg-sciblue-50 text-sciblue-700'
                        : `${isDarkMode ? 'border-slate-700/80 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'} ${interactiveHoverClass}`
                      : isDarkMode
                        ? 'border-slate-800 bg-slate-900 text-slate-500'
                        : 'border-slate-200 bg-slate-50 text-slate-400';

                    return (
                      <button
                        key={item.key}
                        type="button"
                        disabled={isRunning}
                        onClick={() => handleRelationClick(item.key)}
                        className={`rounded-panel border px-4 py-3 text-left transition-all duration-300 ${itemClass} ${isRunning ? 'opacity-70' : 'active:scale-[0.985]'} ${item.available && !isActive && isDesktopLike ? 'hover:shadow-[0_10px_24px_-20px_rgba(14,165,233,0.24)]' : ''}`}
                      >
                        <div className="text-sm font-semibold">{item.label}</div>
                        <div className="mt-1 text-[11px] leading-5">
                          {item.available ? t.experiment.relationReady : t.experiment.relationComingSoon}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className={`mt-4 text-sm leading-6 ${secondaryTextClass}`}>
                  {localeCopy.relationHint[relation]}
                </p>
              </section>

              <section className={`rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass}`}>
                <div className="flex items-center gap-2">
                  {relation === 'pv' ? (
                    <SlidersHorizontal size={16} className="text-sciblue-500" />
                  ) : relation === 'pn' ? (
                    <FlaskConical size={16} className="text-amber-500" />
                  ) : (
                    <Thermometer size={16} className="text-rose-500" />
                  )}
                  <h2 className="text-base font-semibold md:text-lg">
                    {variablePanelTitle}
                  </h2>
                </div>

                {relation === 'pv' ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {BOX_LENGTH_PRESETS.map((value) => {
                        const selected = Math.abs(params.L - value) < 1e-6;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={isRunning}
                            onClick={() => updateBoxLength(String(value))}
                          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-300 ${
                              selected
                                ? isDarkMode
                                  ? 'border-sciblue-400/70 bg-sciblue-950 text-sciblue-100'
                                  : 'border-sciblue-300 bg-sciblue-50 text-sciblue-700'
                                : isDarkMode
                                  ? 'border-slate-700 bg-slate-900 text-slate-200'
                                  : 'border-slate-200 bg-white text-slate-700'
                            } ${!selected ? interactiveHoverClass : ''} ${!selected ? 'active:scale-95' : ''}`}
                          >
                            {Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_128px]">
                      <input
                        type="range"
                        min={BOX_LENGTH_MIN}
                        max={BOX_LENGTH_MAX}
                        step={BOX_LENGTH_STEP}
                        disabled={isRunning}
                        value={Number.isNaN(params.L) ? DEFAULT_BOX_LENGTH : params.L}
                        onChange={(event) => updateBoxLength(event.target.value)}
                        className="w-full accent-sciblue-500"
                      />
                      <input
                        type="number"
                        step={BOX_LENGTH_STEP}
                        min={BOX_LENGTH_MIN}
                        max={BOX_LENGTH_MAX}
                        disabled={isRunning}
                        value={Number.isNaN(params.L) ? '' : params.L}
                        onChange={(event) => updateBoxLength(event.target.value)}
                        className={`rounded-panel border px-3 py-2 font-mono text-sm outline-none transition-all duration-300 ${
                          isDarkMode
                            ? 'border-slate-700 bg-slate-900 text-slate-100 focus:border-sciblue-500'
                            : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-sciblue-500'
                        } ${isDesktopLike ? 'hover:border-slate-300 dark:hover:border-slate-600 focus:ring-1 focus:ring-sciblue-500/20' : ''}`}
                      />
                    </div>
                    <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${secondaryTextClass}`}>
                      <div className={`rounded-panel border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="text-[11px] font-semibold">{localeCopy.tableHeader.volume}</div>
                        <div className="mt-1 font-data text-lg font-semibold">{formatScalar(currentVolume)}</div>
                      </div>
                      <div className={`rounded-panel border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="text-[11px] font-semibold">{localeCopy.tableHeader.inverseVolume}</div>
                        <div className="mt-1 font-data text-lg font-semibold">{formatScalar(currentInverseVolume)}</div>
                      </div>
                    </div>
                  </>
                ) : relation === 'pn' ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {PARTICLE_COUNT_PRESETS.map((value) => {
                        const selected = Math.abs(params.N - value) < 1e-6;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={isRunning}
                            onClick={() => updateConstant('N', String(value))}
                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-300 ${
                              selected
                                ? isDarkMode
                                  ? 'border-amber-400/70 bg-amber-950 text-amber-200'
                                  : 'border-amber-300 bg-amber-50 text-amber-700'
                                : isDarkMode
                                  ? 'border-slate-700 bg-slate-900 text-slate-200'
                                  : 'border-slate-200 bg-white text-slate-700'
                            } ${!selected ? interactiveHoverClass : ''} ${!selected ? 'active:scale-95' : ''}`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_128px]">
                      <input
                        type="range"
                        min={PARTICLE_COUNT_PRESETS[0]}
                        max={PARTICLE_COUNT_PRESETS[PARTICLE_COUNT_PRESETS.length - 1]}
                        step={1}
                        disabled={isRunning}
                        value={Number.isNaN(params.N) ? DEFAULT_PARTICLE_COUNT : params.N}
                        onChange={(event) => updateConstant('N', event.target.value)}
                        className="w-full accent-amber-500"
                      />
                      <input
                        type="number"
                        step={1}
                        min={PARTICLE_COUNT_PRESETS[0]}
                        max={PARTICLE_COUNT_PRESETS[PARTICLE_COUNT_PRESETS.length - 1]}
                        disabled={isRunning}
                        value={Number.isNaN(params.N) ? '' : params.N}
                        onChange={(event) => updateConstant('N', event.target.value)}
                        className={`rounded-panel border px-3 py-2 font-mono text-sm outline-none transition-all duration-300 ${
                          isDarkMode
                            ? 'border-slate-700 bg-slate-900 text-slate-100 focus:border-amber-500'
                            : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-amber-500'
                        } ${isDesktopLike ? 'hover:border-slate-300 dark:hover:border-slate-600 focus:ring-1 focus:ring-amber-500/20' : ''}`}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {TEMPERATURE_PRESETS.map((value) => {
                        const selected = Math.abs(params.targetTemperature - value) < 1e-6;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={isRunning}
                            onClick={() => updateTargetTemperature(String(value))}
                          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-300 ${
                              selected
                                ? isDarkMode
                                  ? 'border-rose-400/70 bg-rose-950 text-rose-200'
                                  : 'border-rose-300 bg-rose-50 text-rose-700'
                                : isDarkMode
                                  ? 'border-slate-700 bg-slate-900 text-slate-200'
                                  : 'border-slate-200 bg-white text-slate-700'
                            } ${!selected ? interactiveHoverClass : ''} ${!selected ? 'active:scale-95' : ''}`}
                          >
                            {value.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_128px]">
                      <input
                        type="range"
                        min={TEMPERATURE_MIN}
                        max={TEMPERATURE_MAX}
                        step={TEMPERATURE_STEP}
                        disabled={isRunning}
                        value={Number.isNaN(params.targetTemperature) ? DEFAULT_EXPERIMENT_TEMPERATURE : params.targetTemperature}
                        onChange={(event) => updateTargetTemperature(event.target.value)}
                        className="w-full accent-rose-500"
                      />
                      <input
                        type="number"
                        step={TEMPERATURE_STEP}
                        min={TEMPERATURE_MIN}
                        max={TEMPERATURE_MAX}
                        disabled={isRunning}
                        value={Number.isNaN(params.targetTemperature) ? '' : params.targetTemperature}
                        onChange={(event) => updateTargetTemperature(event.target.value)}
                        className={`rounded-panel border px-3 py-2 font-mono text-sm outline-none transition-all duration-300 ${
                          isDarkMode
                            ? 'border-slate-700 bg-slate-900 text-slate-100 focus:border-rose-500'
                            : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-rose-500'
                        } ${isDesktopLike ? 'hover:border-slate-300 dark:hover:border-slate-600 focus:ring-1 focus:ring-rose-500/20' : ''}`}
                      />
                    </div>
                  </>
                )}

                <p className={`mt-3 text-sm leading-6 ${secondaryTextClass}`}>
                  {variablePanelHint}
                </p>
                <div className={`mt-4 rounded-panel border px-4 py-3 text-sm leading-6 ${
                  isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                  {advancedRelationNote}
                </div>

                {relation === 'pv' && (
                  <>
                    <div className={`my-5 h-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                          {t.experiment.runTitle}
                        </div>
                        <h2 className="mt-1 text-base font-semibold md:text-lg">{t.views.mdView}</h2>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {phaseLabel}
                      </div>
                    </div>

                    <div className="mt-4">
                      <SimulationCanvas
                        particles={engineRef.current?.particles || []}
                        L={activeParams.L}
                        r={activeParams.r}
                        isRunning={isRunning}
                        t={t}
                        isFocused={isCanvasFocused}
                        onFocusChange={setIsCanvasFocused}
                        showNotification={(text, duration) => notify(text, duration)}
                        supportsHover={supportsHover}
                        touchLike={touchLike}
                        isCompactLandscape={isCompactLandscape}
                        canvasHeight={320}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: t.experiment.targetTemperature, value: formatScalar(params.targetTemperature), accent: 'text-rose-500' },
                        { label: t.experiment.currentTemperature, value: formatScalar(stats.temperature), accent: 'text-emerald-500' },
                        { label: t.experiment.measuredPressure, value: formatScalar(currentMeasuredPressure), accent: 'text-violet-500' },
                        { label: t.experiment.idealReference, value: formatScalar(currentIdealReference), accent: 'text-amber-500' },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-panel border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                          <div className={`text-[11px] font-semibold ${mutedTextClass}`}>{item.label}</div>
                          <div className={`mt-2 font-data text-xl font-semibold ${item.accent}`}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-4">
                      <div className="min-w-0 flex flex-col gap-1.5">
                        <div className={`text-sm ${secondaryTextClass}`}>
                          {t.experiment.progress}: <span className="font-data font-semibold">{(stats.progress * 100).toFixed(0)}%</span>
                        </div>
                        {showResetHint && (
                          <div className={`max-w-[34rem] text-sm font-semibold ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                            {t.experiment.resetRequired}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 xl:flex-nowrap xl:justify-end">
                        <button
                          type="button"
                          onClick={handleStartPause}
                          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-panel border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                            isRunning
                              ? isDarkMode
                                ? 'border-amber-400/60 bg-amber-950 text-amber-200'
                                : 'border-amber-300 bg-amber-50 text-amber-700'
                              : showResetHint
                                ? isDarkMode
                                  ? 'border-slate-700 bg-slate-900 text-slate-400'
                                  : 'border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-sciblue-500 bg-sciblue-500 text-white'
                          } ${!isRunning && !showResetHint ? prominentActionHoverClass : ''} ${!showResetHint ? 'active:scale-95' : ''}`}
                        >
                          {isRunning ? <Pause size={15} /> : <Play size={15} />}
                          {startButtonLabel}
                        </button>
                        <button
                          type="button"
                          disabled={isRunning}
                          onClick={() =>
                            resetCurrentPoint(
                              true,
                              hasRecordedCurrentVariable(relation, relationPoints, params)
                                ? {
                                    advancePresetTemperature: relation === 'pt',
                                    advancePresetBoxLength: relation === 'pv',
                                    advancePresetParticleCount: relation === 'pn',
                                  }
                                : {},
                            )
                          }
                          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-panel border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                            showResetHint
                              ? isDarkMode
                                ? 'border-amber-400/60 bg-amber-950 text-amber-200'
                                : 'border-amber-300 bg-amber-50 text-amber-700 shadow-sm'
                              : isDarkMode
                                ? 'border-slate-700 bg-slate-900 text-slate-200'
                                : 'border-slate-200 bg-white text-slate-700'
                          } ${supportsHover && !showResetHint ? interactiveHoverClass : ''} ${!isRunning ? resetActionHoverClass : ''} ${isRunning ? 'opacity-60' : 'active:scale-95'}`}
                        >
                          <RotateCcw size={15} className={showResetHint ? 'animate-spin-slow' : ''} />
                          {t.experiment.resetPoint}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {relation !== 'pv' && (
              <section className={`rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                      {t.experiment.runTitle}
                    </div>
                    <h2 className="mt-1 text-base font-semibold md:text-lg">{t.views.mdView}</h2>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    {phaseLabel}
                  </div>
                </div>

                <div className="mt-4">
                  <SimulationCanvas
                    particles={engineRef.current?.particles || []}
                    L={activeParams.L}
                    r={activeParams.r}
                    isRunning={isRunning}
                    t={t}
                    isFocused={isCanvasFocused}
                    onFocusChange={setIsCanvasFocused}
                    showNotification={(text, duration) => notify(text, duration)}
                    supportsHover={supportsHover}
                    touchLike={touchLike}
                    isCompactLandscape={isCompactLandscape}
                    canvasHeight={320}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: relation === 'pn' ? localeCopy.tableHeader.particles : t.experiment.targetTemperature,
                      value: relation === 'pn' ? formatScalar(params.N) : formatScalar(params.targetTemperature),
                      accent: relation === 'pn' ? 'text-amber-500' : 'text-rose-500',
                    },
                    { label: t.experiment.currentTemperature, value: formatScalar(stats.temperature), accent: 'text-emerald-500' },
                    { label: t.experiment.measuredPressure, value: formatScalar(currentMeasuredPressure), accent: 'text-violet-500' },
                    { label: t.experiment.idealReference, value: formatScalar(currentIdealReference), accent: 'text-amber-500' },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-panel border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`text-[11px] font-semibold ${mutedTextClass}`}>{item.label}</div>
                      <div className={`mt-2 font-data text-xl font-semibold ${item.accent}`}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-4">
                  <div className="min-w-0 flex flex-col gap-1.5">
                    <div className={`text-sm ${secondaryTextClass}`}>
                      {t.experiment.progress}: <span className="font-data font-semibold">{(stats.progress * 100).toFixed(0)}%</span>
                    </div>
                    {showResetHint && (
                      <div className={`max-w-[34rem] text-sm font-semibold ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                        {t.experiment.resetRequired}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 xl:flex-nowrap xl:justify-end">
                      <button
                        type="button"
                        onClick={handleStartPause}
                        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-panel border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                          isRunning
                            ? isDarkMode
                              ? 'border-amber-400/60 bg-amber-950 text-amber-200'
                            : 'border-amber-300 bg-amber-50 text-amber-700'
                          : showResetHint
                            ? isDarkMode
                              ? 'border-slate-700 bg-slate-900 text-slate-400'
                              : 'border-slate-200 bg-slate-100 text-slate-400'
                            : 'border-sciblue-500 bg-sciblue-500 text-white'
                        } ${!isRunning && !showResetHint ? prominentActionHoverClass : ''} ${!showResetHint ? 'active:scale-95' : ''}`}
                    >
                      {isRunning ? <Pause size={15} /> : <Play size={15} />}
                      {startButtonLabel}
                    </button>
                      <button
                        type="button"
                        disabled={isRunning}
                      onClick={() =>
                        resetCurrentPoint(
                          true,
                          hasRecordedCurrentVariable(relation, relationPoints, params)
                            ? {
                                advancePresetTemperature: relation === 'pt',
                                advancePresetBoxLength: relation === 'pv',
                                advancePresetParticleCount: relation === 'pn',
                              }
                            : {},
                        )
                      }
                        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-panel border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                          showResetHint
                            ? isDarkMode
                              ? 'border-amber-400/60 bg-amber-950 text-amber-200'
                            : 'border-amber-300 bg-amber-50 text-amber-700 shadow-sm'
                          : isDarkMode
                            ? 'border-slate-700 bg-slate-900 text-slate-200'
                            : 'border-slate-200 bg-white text-slate-700'
                        } ${supportsHover && !showResetHint ? interactiveHoverClass : ''} ${!isRunning ? resetActionHoverClass : ''} ${isRunning ? 'opacity-60' : 'active:scale-95'}`}
                    >
                      <RotateCcw size={15} className={showResetHint ? 'animate-spin-slow' : ''} />
                      {t.experiment.resetPoint}
                    </button>
                  </div>
                </div>
              </section>
              )}

              {isPvRelation && verdictPanel}
            </div>

            <div className={rightColumnClass}>
              {relation !== 'pv' && (
                <section className={`rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                        {t.experiment.resultsTitle}
                      </div>
                      <h2 className="mt-1 text-base font-semibold md:text-lg">{relation === 'pn' ? localeCopy.chartTitle.pn : localeCopy.chartTitle.pt}</h2>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {!historyAvailable && (
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                          {localeCopy.historyLocked}
                        </span>
                      )}
                      {renderHistoryButton(relation)}
                      <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {sortedPoints.length} {localeCopy.pointsUnit}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { label: t.experiment.measuredSeries, color: 'bg-sciblue-500' },
                      { label: t.experiment.fitSeries, color: 'bg-emerald-500' },
                      { label: t.experiment.theorySeries, color: 'bg-amber-500' },
                    ].map((item) => (
                      <span key={item.label} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {relation === 'pn' ? localeCopy.verdictBasisPn : localeCopy.verdictBasisPt}
                  </div>

                  <div className="mt-4 h-[320px]">
                    {chartData.length === 0 ? (
                      <div className={`flex h-full items-center justify-center rounded-panel border border-dashed ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                        {relation === 'pn' ? localeCopy.noPoints.pn : localeCopy.noPoints.pt}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={relation === 'pn' ? pnChartData : ptChartData} margin={{ top: 8, right: 16, left: 0, bottom: 14 }}>
                          <CartesianGrid vertical={false} stroke={isDarkMode ? '#243244' : '#dbe4f0'} strokeDasharray="4 5" />
                          <XAxis
                            type="number"
                            dataKey={relation === 'pn' ? 'particleCount' : 'temperature'}
                            domain={chartXDomain}
                            tick={{ fill: isDarkMode ? '#93a4b8' : '#64748b', fontSize: 10, fontFamily: 'var(--app-font-data)' }}
                            tickLine={false}
                            axisLine={{ stroke: isDarkMode ? '#334155' : '#cbd5e1' }}
                            tickFormatter={formatAxisValue}
                            label={{ value: relation === 'pn' ? localeCopy.xLabelParticles : localeCopy.xLabelTemperature, position: 'bottom', offset: 2, fill: isDarkMode ? '#e2e8f0' : '#0f172a', fontSize: 11, fontWeight: 600 }}
                          />
                          <YAxis
                            tick={{ fill: isDarkMode ? '#93a4b8' : '#64748b', fontSize: 10, fontFamily: 'var(--app-font-data)' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatAxisValue}
                            width={56}
                            label={{ value: localeCopy.yLabelPressure, angle: -90, position: 'insideLeft', offset: 8, fill: isDarkMode ? '#e2e8f0' : '#0f172a', fontSize: 11, fontWeight: 600 }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 18,
                              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                              background: isDarkMode ? 'rgba(2,6,23,0.94)' : 'rgba(255,255,255,0.96)',
                              color: isDarkMode ? '#f8fafc' : '#0f172a',
                            }}
                            formatter={(value: number, name: string) => [formatScalar(value), name]}
                            labelFormatter={(value) => `${relation === 'pn' ? localeCopy.xLabelParticles : localeCopy.xLabelTemperature}: ${formatScalar(Number(value))}`}
                          />
                          <Line type="monotone" dataKey="fitPressure" name={t.experiment.fitSeries} stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="theoryPressure" name={t.experiment.theorySeries} stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 4" isAnimationActive={false} />
                          <Scatter data={relation === 'pn' ? pnChartData : ptChartData} dataKey="measuredPressure" name={t.experiment.measuredSeries} fill="#4f7fe8" line={false} isAnimationActive={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>
              )}

              {relation === 'pv' && (
                <>
                  <section className={`rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                          {t.experiment.resultsTitle}
                        </div>
                        <h2 className="mt-1 text-base font-semibold md:text-lg">{localeCopy.chartTitle.pvLinear}</h2>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!historyAvailable && (
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                            {localeCopy.historyLocked}
                          </span>
                        )}
                        {renderHistoryButton('pv')}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        { label: t.experiment.measuredSeries, color: 'bg-sciblue-500' },
                        { label: t.experiment.fitSeries, color: 'bg-emerald-500' },
                        { label: t.experiment.theorySeries, color: 'bg-amber-500' },
                      ].map((item) => (
                      <span key={item.label} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                          {item.label}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {localeCopy.verdictBasisPv}
                    </div>

                    <div className="mt-4 h-[360px]">
                      {pvLinearData.length === 0 ? (
                        <div className={`flex h-full items-center justify-center rounded-panel border border-dashed ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                          {localeCopy.noPoints.pv}
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={pvLinearData} margin={{ top: 8, right: 16, left: 0, bottom: 14 }}>
                            <CartesianGrid vertical={false} stroke={isDarkMode ? '#243244' : '#dbe4f0'} strokeDasharray="4 5" />
                            <XAxis
                              type="number"
                              dataKey="inverseVolumeScaled"
                              domain={chartXDomain}
                              tick={{ fill: isDarkMode ? '#93a4b8' : '#64748b', fontSize: 10, fontFamily: 'var(--app-font-data)' }}
                              tickLine={false}
                              axisLine={{ stroke: isDarkMode ? '#334155' : '#cbd5e1' }}
                              tickFormatter={formatAxisValue}
                              label={{ value: inverseVolumeAxisLabel, position: 'bottom', offset: 2, fill: isDarkMode ? '#e2e8f0' : '#0f172a', fontSize: 11, fontWeight: 600 }}
                            />
                            <YAxis
                              tick={{ fill: isDarkMode ? '#93a4b8' : '#64748b', fontSize: 10, fontFamily: 'var(--app-font-data)' }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={formatAxisValue}
                              width={56}
                              label={{ value: localeCopy.yLabelPressure, angle: -90, position: 'insideLeft', offset: 8, fill: isDarkMode ? '#e2e8f0' : '#0f172a', fontSize: 11, fontWeight: 600 }}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 18,
                                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                background: isDarkMode ? 'rgba(2,6,23,0.94)' : 'rgba(255,255,255,0.96)',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                              }}
                              formatter={(value: number, name: string) => [formatScalar(value), name]}
                              labelFormatter={(value) => `${inverseVolumeAxisLabel}: ${formatAxisValue(Number(value))}`}
                            />
                            <Line type="monotone" dataKey="fitPressure" name={t.experiment.fitSeries} stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="theoryPressure" name={t.experiment.theorySeries} stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 4" isAnimationActive={false} />
                            <Scatter data={pvLinearData} dataKey="measuredPressure" name={t.experiment.measuredSeries} fill="#4f7fe8" line={false} isAnimationActive={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </section>

                  <section className={`rounded-panel border p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:p-5 ${cardClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                          {t.experiment.resultsTitle}
                        </div>
                        <h2 className="mt-1 text-base font-semibold md:text-lg">{localeCopy.chartTitle.pv}</h2>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {sortedPoints.length} {localeCopy.pointsUnit}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        { label: t.experiment.measuredSeries, color: 'bg-sciblue-500' },
                        { label: localeCopy.theoryCurveLabel, color: 'bg-amber-500' },
                      ].map((item) => (
                        <span key={item.label} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                          {item.label}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {lang === 'en-GB' ? 'This chart keeps the original inverse relation as the physical picture.' : lang === 'zh-TW' ? '這張圖保留原始反比關係，作為物理直觀展示。' : '这张图保留原始反比关系，作为物理直观展示。'}
                    </div>

                    <div className="mt-4 h-[260px]">
                      {pvOriginalData.length === 0 ? (
                        <div className={`flex h-full items-center justify-center rounded-panel border border-dashed ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                          {localeCopy.noPoints.pv}
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={pvOriginalData} margin={{ top: 8, right: 16, left: 0, bottom: 14 }}>
                            <CartesianGrid vertical={false} stroke={isDarkMode ? '#243244' : '#dbe4f0'} strokeDasharray="4 5" />
                            <XAxis
                              type="number"
                              dataKey="volume"
                              domain={pvVolumeDomain}
                              tick={{ fill: isDarkMode ? '#93a4b8' : '#64748b', fontSize: 10, fontFamily: 'var(--app-font-data)' }}
                              tickLine={false}
                              axisLine={{ stroke: isDarkMode ? '#334155' : '#cbd5e1' }}
                              tickFormatter={formatAxisValue}
                              label={{ value: localeCopy.xLabelVolume, position: 'bottom', offset: 2, fill: isDarkMode ? '#e2e8f0' : '#0f172a', fontSize: 11, fontWeight: 600 }}
                            />
                            <YAxis
                              tick={{ fill: isDarkMode ? '#93a4b8' : '#64748b', fontSize: 10, fontFamily: 'var(--app-font-data)' }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={formatAxisValue}
                              width={56}
                              label={{ value: localeCopy.yLabelPressure, angle: -90, position: 'insideLeft', offset: 8, fill: isDarkMode ? '#e2e8f0' : '#0f172a', fontSize: 11, fontWeight: 600 }}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 18,
                                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                background: isDarkMode ? 'rgba(2,6,23,0.94)' : 'rgba(255,255,255,0.96)',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                              }}
                              formatter={(value: number, name: string) => [formatScalar(value), name]}
                              labelFormatter={(value) => `${localeCopy.xLabelVolume}: ${formatScalar(Number(value))}`}
                            />
                            <Line type="monotone" dataKey="theoryPressure" name={localeCopy.theoryCurveLabel} stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 4" isAnimationActive={false} />
                            <Scatter data={pvOriginalData} dataKey="measuredPressure" name={t.experiment.measuredSeries} fill="#4f7fe8" line={false} isAnimationActive={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </section>
                </>
              )}

              {!isPvRelation && verdictPanel}
              {tablePanel}
            </div>
          </div>
        </div>
        {footer}
      </main>
      </div>

      <div
        className={`
          fixed top-14 left-4 z-50 transition-all duration-500 cubic-bezier(0.34,1.56,0.64,1) md:top-6
          ${isAdvancedPanelOpen ? 'translate-x-[-150%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
        `}
      >
        <button
          type="button"
          onClick={() => setIsAdvancedPanelOpen(true)}
          title={advancedCopy.button}
          className={`
            group relative flex items-center gap-3 rounded-full border py-1 pl-1 pr-3 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md transition-all active:scale-95 md:px-5 md:py-1.5
            ${floatingAdvancedButtonClass}
            ${floatingButtonHoverClass} ${supportsHover ? 'hover:border-sciblue-300 hover:text-sciblue-600 dark:hover:border-sciblue-500 dark:hover:text-sciblue-300' : ''}
          `}
        >
          <div className={`flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-sciblue-500 to-indigo-600 text-white shadow-inner transition-transform duration-500 md:h-9 md:w-9 ${floatingIconHoverClass}`}>
            <SlidersHorizontal size={isCompactLandscape ? 12 : 18} />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className={`text-[10px] font-bold tracking-[0.18em] text-slate-500 dark:text-slate-400 ${floatingAccentHoverClass}`}>
              {t.experiment.constantsTitle}
            </span>
            <span className={`text-xs font-semibold md:text-sm ${floatingTextHoverClass}`}>
              {advancedCopy.button}
            </span>
          </div>
        </button>
      </div>

      {isAdvancedPanelOpen && (
        <div className={`fixed inset-0 ${isAdvancedOverlay ? 'z-[140]' : 'pointer-events-none z-[45]'}`}>
          {isAdvancedOverlay && (
            <button
              type="button"
              aria-label={advancedCopy.close}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              onClick={() => setIsAdvancedPanelOpen(false)}
            />
          )}
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="experiment-advanced-title"
            className={`fixed inset-y-0 left-0 z-[45] flex flex-col overflow-hidden border-r shadow-2xl transition-[transform,opacity,background-color] duration-500 cubic-bezier(0.25,1,0.5,1) pointer-events-auto ${sidebarWidthClass} ${
              isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
            } ${isAdvancedPanelOpen ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'}`}
          >
            <div className={`shrink-0 border-b px-3 pb-3 pt-8 md:px-4 md:pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                  {t.experiment.constantsTitle}
                </div>
                <h2 id="experiment-advanced-title" className="mt-1 text-lg font-semibold">
                  {advancedCopy.title}
                </h2>
                <p className={`mt-2 text-sm leading-6 ${secondaryTextClass}`}>
                  {advancedCopy.subtitle}
                </p>
                <p className={`mt-2 rounded-panel border px-3 py-2 text-xs leading-5 ${
                  isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                  {advancedRelationNote}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvancedPanelOpen(false)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-500'
                } ${subtleButtonClass}`}
                title={advancedCopy.close}
              >
                <X size={16} />
              </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto sidebar-scroll py-4">
              <section className={`border-b px-3 pb-4 md:px-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-sciblue-500" />
                  <h3 className="text-sm font-semibold">{advancedCopy.presetTitle}</h3>
                </div>
                <div className="mt-3 grid gap-2">
                  {([
                    ['fast', SAMPLING_PRESETS.fast],
                    ['balanced', SAMPLING_PRESETS.balanced],
                    ['stable', SAMPLING_PRESETS.stable],
                  ] as const).map(([key, preset]) => {
                    const isActive = activeSamplingPreset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isRunning}
                        onClick={() => applySamplingPreset(preset)}
                        className={`rounded-panel border px-3 py-3 text-left transition-all duration-300 ${
                          isActive
                            ? isDarkMode
                            ? 'border-sciblue-500/70 bg-sciblue-950 text-sciblue-100'
                              : 'border-sciblue-300 bg-sciblue-50 text-sciblue-700'
                            : isDarkMode
                            ? 'border-slate-700 bg-slate-950 text-slate-200'
                              : 'border-slate-200 bg-white text-slate-700'
                        } ${!isActive ? subtleButtonClass : ''} ${!isActive && isDesktopLike ? 'hover:shadow-[0_12px_28px_-22px_rgba(14,165,233,0.22)]' : ''} ${isRunning ? 'opacity-60' : 'active:scale-[0.985]'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold">{advancedCopy.presetLabel[key]}</div>
                          {isActive && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isDarkMode ? 'bg-sciblue-950 text-sciblue-200' : 'bg-sciblue-100 text-sciblue-700'
                            }`}>
                              {lang === 'en-GB' ? 'Current' : lang === 'zh-TW' ? '目前方案' : '当前方案'}
                            </span>
                          )}
                        </div>
                        <div className={`mt-1 text-xs leading-5 ${secondaryTextClass}`}>
                          {advancedCopy.presetHint[key]} · {t.controls.equilTime}: {preset.equilibriumTime}s · {t.controls.statsDuration}: {preset.statsDuration}s
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="space-y-4 pt-4">
                {advancedGroups.map((group) => (
              <section key={group.title} className="group px-3 md:px-4">
                    <h3 className={`mb-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 transition-colors ${sectionHoverTextClass}`}>{group.title}</h3>
                    <div className="grid gap-3">
                      {group.fields.map(([key, label, step, min]) => {
                        const isVariableKey = isVariableKeyForRelation(relation, key);
                        return (
                          <label key={String(key)} className="flex flex-col gap-1.5">
                            <span className={`flex items-center gap-2 text-[11px] font-semibold tracking-[0.04em] ${mutedTextClass}`}>
                              {label}
                              {isVariableKey && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDarkMode ? 'bg-sciblue-950 text-sciblue-200' : 'bg-sciblue-50 text-sciblue-700'}`}>
                                  {localeCopy.variableBadge}
                                </span>
                              )}
                            </span>
                            <input
                              type="number"
                              step={step}
                              min={min}
                              disabled={isRunning}
                              value={Number.isNaN(params[key] as number) ? '' : (params[key] as number)}
                              onChange={(event) => updateAdvancedValue(key, event.target.value)}
                              className={`${drawerInputClass} ${isRunning ? 'cursor-not-allowed opacity-60' : ''}`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className={`shrink-0 border-t p-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)] ${
              isDarkMode ? 'border-slate-800 bg-slate-900/95' : 'border-slate-100 bg-white/95'
            }`}>
              <button
                type="button"
                onClick={() => setIsAdvancedPanelOpen(false)}
                className={`flex w-full items-center justify-center gap-2 rounded-panel px-4 py-2 text-xs font-bold transition-all duration-300 ${
                  isDarkMode
                    ? 'text-slate-500 hover:text-sciblue-400'
                    : 'text-slate-400 hover:text-sciblue-600'
                }`}
              >
                <X size={12} />
                {advancedCopy.close}
              </button>
            </div>
          </aside>
        </div>
      )}

      {failurePromptState && (
        <div className="fixed inset-0 z-[144] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setFailurePromptState(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="experiment-failure-title"
            className={`relative z-10 w-full max-w-2xl rounded-panel border p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] ${isDarkMode ? 'border-slate-700/80 bg-slate-900/95 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-500 dark:text-amber-300">
                  {t.experiment.presetRoundComplete}
                </div>
                <h2 id="experiment-failure-title" className="mt-1 text-2xl font-bold tracking-tight">
                  {t.experiment.failureModalTitle}
                </h2>
                <p className={`mt-2 text-sm leading-6 ${secondaryTextClass}`}>{t.experiment.failureModalBody}</p>
              </div>
              <button
                type="button"
                onClick={() => setFailurePromptState(null)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-500'
                } ${interactiveHoverClass}`}
                title={localeCopy.modalClose}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
              <section className={`rounded-panel border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500 dark:text-amber-300">
                  {t.experiment.failureReasonTitle}
                </div>
                <p className={`mt-2 text-sm leading-7 ${secondaryTextClass}`}>{failureReasonForModal}</p>
              </section>

              <section className={`rounded-panel border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sciblue-500 dark:text-sciblue-300">
                  {t.experiment.failureMetricsTitle}
                </div>
                <div className={`mt-2 grid gap-2 text-sm ${secondaryTextClass}`}>
                  <div className="flex items-center justify-between gap-4">
                    <span>{t.experiment.pointsCountLabel}</span>
                    <span className="font-data font-semibold text-slate-900 dark:text-slate-100">{sortedPoints.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>{t.experiment.coveredRangeLabel}</span>
                    <span className="font-data font-semibold text-slate-900 dark:text-slate-100">{coverageLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>{t.experiment.rSquared}</span>
                    <span className="font-data font-semibold text-slate-900 dark:text-slate-100">{formatScalar(regression.rSquared)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>{t.experiment.slopeError}</span>
                    <span className="font-data font-semibold text-slate-900 dark:text-slate-100">{formatPercent(regression.slopeError)}</span>
                  </div>
                </div>
              </section>
            </div>

            <section className={`mt-3 rounded-panel border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500 dark:text-emerald-300">
                {t.experiment.failureActionsTitle}
              </div>
              <p className={`mt-2 text-sm leading-7 ${secondaryTextClass}`}>{recommendationText}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFailurePromptState(null)}
                  className={`inline-flex min-h-[40px] items-center justify-center rounded-panel border px-4 py-2 text-sm font-semibold transition-all duration-300 ${prominentActionHoverClass} ${
                    isDarkMode ? 'border-sciblue-700 bg-sciblue-900 text-sciblue-100' : 'border-sciblue-200 bg-sciblue-50 text-sciblue-700'
                  }`}
                >
                  {t.experiment.continueSampling}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applySamplingPreset(SAMPLING_PRESETS.stable);
                    setFailurePromptState(null);
                  }}
                  className={`inline-flex min-h-[40px] items-center justify-center rounded-panel border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    isDarkMode ? 'border-amber-800 bg-amber-950 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'
                  } ${resetActionHoverClass}`}
                >
                  {t.experiment.switchStablePreset}
                </button>
                <button
                  type="button"
                  onClick={() => setFailurePromptState(null)}
                  className={`inline-flex min-h-[40px] items-center justify-center rounded-panel border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
                  } ${subtleButtonClass}`}
                >
                  {t.experiment.acknowledgeFailure}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {historyModalRelation && currentHistoryContent && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setHistoryModalRelation(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="experiment-history-title"
            className={`relative z-10 w-full max-w-3xl rounded-panel border p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] ${isDarkMode ? 'border-slate-700/80 bg-slate-900/95 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-500 dark:text-amber-300">
                  {currentHistoryContent.eyebrow}
                </div>
                <h2 id="experiment-history-title" className="mt-1 text-2xl font-bold tracking-tight">
                  {currentHistoryContent.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalRelation(null)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-500'
                } ${interactiveHoverClass}`}
                title={localeCopy.modalClose}
              >
                <X size={16} />
              </button>
            </div>

            <div className={`max-h-[70vh] overflow-y-auto pr-1 text-sm leading-7 ${secondaryTextClass}`}>
              {[
                { label: localeCopy.historySectionLabel.discoveredBy, body: currentHistoryContent.discoveredBy },
                { label: localeCopy.historySectionLabel.discovery, body: currentHistoryContent.discovery },
                { label: localeCopy.historySectionLabel.significance, body: currentHistoryContent.significance },
                { label: localeCopy.historySectionLabel.status, body: currentHistoryContent.status },
                { label: localeCopy.historySectionLabel.simulation, body: currentHistoryContent.simulation },
              ].map((section) => (
                  <section key={section.label} className={`rounded-panel border px-4 py-3 ${isDarkMode ? 'mb-3 border-slate-800 bg-slate-900' : 'mb-3 border-slate-200 bg-slate-50'}`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sciblue-500 dark:text-sciblue-300">
                    {section.label}
                  </div>
                  <p className="mt-2">{section.body}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IdealGasExperimentMode;
