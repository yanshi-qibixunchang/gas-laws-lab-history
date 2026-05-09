export const HARD_SPHERE_GAMMA = 5 / 3;

export type HeatCapacityPhase =
  | 'equalizing'
  | 'pumping'
  | 'stabilizingP1'
  | 'recordP1'
  | 'releasing'
  | 'recovering'
  | 'recordP2'
  | 'completed';

export type HeatCapacityMode = 'guided' | 'manual-entry';

export interface HeatCapacityRecordedPoint {
  p0: number | null;
  p1: number | null;
  p2: number | null;
}

export interface HeatCapacityTrial {
  p0: number;
  p1: number;
  p2: number;
  timestamp: number;
}

export interface HeatCapacityResult {
  gamma: number;
  theoreticalGamma: number;
  relativeErrorPercent: number;
}

export interface HeatCapacitySummary {
  validCount: number;
  meanGamma: number | null;
  theoreticalGamma: number;
  relativeErrorPercent: number | null;
}

export interface HeatCapacityParticleVisualState {
  densityMultiplier: number;
  speedMultiplier: number;
  color: string;
  emissiveIntensity: number;
  outflowActive: boolean;
  outflowIntensity: number;
  stability: number;
}

export type HeatCapacityInstrumentPartId =
  | 'Vessel'
  | 'Valve_C1'
  | 'Valve_C2'
  | 'Pump_Handle'
  | 'Pressure_Gauge_Needle'
  | 'Temperature_Display'
  | 'Square_Glass_Bottle'
  | 'Glass_Wall_Panels'
  | 'Glass_Edge_Frame'
  | 'Glass_Bottom_Base'
  | 'Glass_Outer_Shell'
  | 'Sealing_Stopper'
  | 'Top_Glass_Tube'
  | 'Valve_Manifold'
  | 'Pressure_Sensor'
  | 'Temperature_Sensor'
  | 'Sensor_Cable_Pressure'
  | 'Sensor_Cable_Temperature'
  | 'Instrument_Box'
  | 'Instrument_Box_Display'
  | 'Instrument_Box_Front_Panel'
  | 'Instrument_Box_Temp_LCD'
  | 'Instrument_Box_Pressure_LCD'
  | 'Instrument_Box_Temp_Display'
  | 'Instrument_Box_Pressure_Display'
  | 'Instrument_Box_Analog_Gauge'
  | 'Instrument_Box_Power_Light'
  | 'Instrument_Box_Pump_Control'
  | 'Instrument_Box_Power_Switch'
  | 'Instrument_Box_Pump_Check_Switch'
  | 'Pump_Column'
  | 'Pump_Slider'
  | 'Hit_C1'
  | 'Hit_C2'
  | 'Hit_Pump'
  | 'Hit_Pressure_Gauge'
  | 'Hit_Temperature_Display'
  | 'Hit_Instrument_Box';

export interface HeatCapacityInstrumentDisplayState {
  pressure: number;
  temperature: number;
  phase: HeatCapacityPhase;
  recorded: HeatCapacityRecordedPoint;
  result: HeatCapacityResult | null;
  instrumentPowered: boolean;
}

export interface HeatCapacityInstrumentState {
  instrumentPowered: boolean;
  c1Open: boolean;
  c2Open: boolean;
  pumpProgress: number;
  pressure: number;
  temperature: number;
  phase: HeatCapacityPhase;
  highlightedPart: HeatCapacityInstrumentPartId | null;
  secondaryHighlightedParts: HeatCapacityInstrumentPartId[];
}

export interface HeatCapacityInteractionDescriptor {
  phase: HeatCapacityPhase;
  primaryPart: HeatCapacityInstrumentPartId | null;
  secondaryParts: HeatCapacityInstrumentPartId[];
  validParts: HeatCapacityInstrumentPartId[];
  instruction: string;
  purpose: string;
}

export interface HeatCapacityPartActionResolution {
  accepted: boolean;
  action: HeatCapacityAction | null;
  message: string;
}

export type HeatCapacityDemoStepKey =
  | 'powerOn'
  | 'recordP0'
  | 'pump'
  | 'stabilizeP1'
  | 'recordP1'
  | 'release'
  | 'recover'
  | 'recordP2'
  | 'review';

export interface HeatCapacityDemoStep {
  key: HeatCapacityDemoStepKey;
  message: string;
  highlightedPart: HeatCapacityInstrumentPartId | null;
  actions: HeatCapacityAction[];
}

export interface HeatCapacityDemoStepResolution {
  step: HeatCapacityDemoStep;
  actions: HeatCapacityAction[];
  completed: boolean;
}

export interface HeatCapacityState {
  phase: HeatCapacityPhase;
  mode: HeatCapacityMode;
  ambientPressure: number;
  ambientTemperature: number;
  pressure: number;
  temperature: number;
  particleCount: number;
  vesselLength: number;
  recorded: HeatCapacityRecordedPoint;
  trials: HeatCapacityTrial[];
  result: HeatCapacityResult | null;
  instrument: HeatCapacityInstrumentState;
  pendingP2: number | null;
  lastError: string | null;
}

export const getHeatCapacityInstrumentDisplayState = (
  state: HeatCapacityState,
): HeatCapacityInstrumentDisplayState => ({
  pressure: state.pressure,
  temperature: state.temperature,
  phase: state.phase,
  recorded: { ...state.recorded },
  result: state.result ? { ...state.result } : null,
  instrumentPowered: state.instrument.instrumentPowered,
});

export type HeatCapacityAction =
  | { type: 'toggleInstrumentPower' }
  | { type: 'setInstrumentPower'; powered: boolean }
  | { type: 'recordP0' }
  | { type: 'pump'; strokes: number }
  | { type: 'stabilizeP1' }
  | { type: 'recordP1' }
  | { type: 'release'; durationMs: number; closeDelayMs?: number }
  | { type: 'recover' }
  | { type: 'recordP2' }
  | { type: 'reset' };

export interface HeatCapacityExperimentOptions {
  ambientPressure?: number;
  ambientTemperature?: number;
  particleCount?: number;
  vesselLength?: number;
  mode?: HeatCapacityMode;
}

const DEFAULT_AMBIENT_PRESSURE = 101.325;
const DEFAULT_AMBIENT_TEMPERATURE = 1;
const DEFAULT_PARTICLE_COUNT = 128;
const DEFAULT_VESSEL_LENGTH = 12;
const IDEAL_RELEASE_DURATION_MS = 420;
const PUMP_PRESSURE_STEP = 5.2;
const PUMP_TEMPERATURE_STEP = 0.018;

export const createHeatCapacityDemoPlan = (): HeatCapacityDemoStep[] => [
  {
    key: 'powerOn',
    message: 'Turn on the instrument box before reading sensor data or operating the experiment controls.',
    highlightedPart: 'Instrument_Box_Power_Switch',
    actions: [{ type: 'setInstrumentPower', powered: true }],
  },
  {
    key: 'recordP0',
    message: '记录环境平衡压强 p0，作为后续压强变化的基准。',
    highlightedPart: 'Hit_Pressure_Gauge',
    actions: [{ type: 'recordP0' }],
  },
  {
    key: 'pump',
    message: '用气泵向方形压力腔内压入硬球单原子气体，形成高压状态。',
    highlightedPart: 'Hit_Pump',
    actions: [{ type: 'pump', strokes: 6 }],
  },
  {
    key: 'stabilizeP1',
    message: '关闭进气通道并等待气体回到环境温度，使 p1 可记录。',
    highlightedPart: 'Hit_Temperature_Display',
    actions: [{ type: 'stabilizeP1' }, { type: 'stabilizeP1' }],
  },
  {
    key: 'recordP1',
    message: '记录等温稳定后的高压压强 p1。',
    highlightedPart: 'Hit_Pressure_Gauge',
    actions: [{ type: 'recordP1' }],
  },
  {
    key: 'release',
    message: '快速打开 C2 放气并立即关闭，近似形成绝热膨胀过程。',
    highlightedPart: 'Hit_C2',
    actions: [{ type: 'release', durationMs: IDEAL_RELEASE_DURATION_MS, closeDelayMs: 0 }],
  },
  {
    key: 'recover',
    message: '等待压力腔内气体与外界热交换，恢复到环境温度。',
    highlightedPart: 'Hit_Temperature_Display',
    actions: [{ type: 'recover' }],
  },
  {
    key: 'recordP2',
    message: '记录热恢复后的压强 p2，用 p0、p1、p2 计算 gamma。',
    highlightedPart: 'Hit_Pressure_Gauge',
    actions: [{ type: 'recordP2' }],
  },
  {
    key: 'review',
    message: '演示完成：结果区保留 p0、p1、p2、gamma、理论值和相对误差。',
    highlightedPart: null,
    actions: [],
  },
];

export const advanceHeatCapacityDemoStep = (
  state: HeatCapacityState,
  stepIndex: number,
): HeatCapacityDemoStepResolution => {
  const plan = createHeatCapacityDemoPlan();
  const lastIndex = plan.length - 1;

  if (state.phase === 'completed' || stepIndex >= lastIndex) {
    return {
      step: plan[lastIndex],
      actions: [],
      completed: true,
    };
  }

  const index = clamp(stepIndex, 0, lastIndex);
  return {
    step: plan[index],
    actions: plan[index].actions,
    completed: index === lastIndex,
  };
};

const sanitizePositiveNumber = (value: number | undefined, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

const sanitizePositiveInteger = (value: number | undefined, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.round(value));
};

const roundMetric = (value: number, decimals = 6) => (
  Number(value.toFixed(decimals))
);

const createInstrumentState = (
  phase: HeatCapacityPhase,
  pressure: number,
  temperature: number,
  overrides: Partial<HeatCapacityInstrumentState> = {},
): HeatCapacityInstrumentState => ({
  instrumentPowered: false,
  c1Open: false,
  c2Open: phase === 'equalizing',
  pumpProgress: 0,
  pressure,
  temperature,
  phase,
  highlightedPart: null,
  secondaryHighlightedParts: [],
  ...overrides,
});

const syncInstrument = (
  state: HeatCapacityState,
  overrides: Partial<HeatCapacityInstrumentState> = {},
): HeatCapacityInstrumentState => {
  const descriptor = getHeatCapacityInteractionDescriptor(state);
  return createInstrumentState(state.phase, state.pressure, state.temperature, {
    ...state.instrument,
    pressure: state.pressure,
    temperature: state.temperature,
    phase: state.phase,
    ...overrides,
    highlightedPart: descriptor.primaryPart,
    secondaryHighlightedParts: descriptor.secondaryParts,
  });
};

const withError = (state: HeatCapacityState, lastError: string): HeatCapacityState => ({
  ...state,
  lastError,
  instrument: syncInstrument(state),
});

const withState = (
  state: HeatCapacityState,
  patch: Partial<Omit<HeatCapacityState, 'instrument'>> & {
    instrument?: Partial<HeatCapacityInstrumentState>;
  },
): HeatCapacityState => {
  const { instrument: instrumentPatch, ...statePatch } = patch;
  const next = {
    ...state,
    ...statePatch,
    lastError: patch.lastError ?? null,
  } as HeatCapacityState;
  return {
    ...next,
    instrument: syncInstrument(next, instrumentPatch),
  };
};

export const calculateGamma = (p0: number, p1: number, p2: number): number | null => {
  if (
    !Number.isFinite(p0) ||
    !Number.isFinite(p1) ||
    !Number.isFinite(p2) ||
    p0 <= 0 ||
    p1 <= p0 ||
    p2 <= p0 ||
    p2 >= p1
  ) {
    return null;
  }

  const denominator = Math.log(p1 / p2);
  if (Math.abs(denominator) < Number.EPSILON) return null;
  return Math.log(p1 / p0) / denominator;
};

export const calculateRelativeErrorPercent = (
  measured: number,
  theoretical = HARD_SPHERE_GAMMA,
): number | null => {
  if (!Number.isFinite(measured) || !Number.isFinite(theoretical) || theoretical === 0) return null;
  return Math.abs((measured - theoretical) / theoretical) * 100;
};

export const calculateGammaSummary = (
  trials: HeatCapacityTrial[],
  theoreticalGamma = HARD_SPHERE_GAMMA,
): HeatCapacitySummary => {
  const gammas = trials
    .map((trial) => calculateGamma(trial.p0, trial.p1, trial.p2))
    .filter((gamma): gamma is number => gamma !== null);

  if (gammas.length === 0) {
    return {
      validCount: 0,
      meanGamma: null,
      theoreticalGamma,
      relativeErrorPercent: null,
    };
  }

  const meanGamma = gammas.reduce((sum, gamma) => sum + gamma, 0) / gammas.length;
  return {
    validCount: gammas.length,
    meanGamma,
    theoreticalGamma,
    relativeErrorPercent: calculateRelativeErrorPercent(meanGamma, theoreticalGamma),
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getHeatCapacityParticleVisualState = (
  state: HeatCapacityState,
): HeatCapacityParticleVisualState => {
  const pressureRatio = clamp(state.pressure / state.ambientPressure, 0.75, 2.5);
  const temperatureRatio = clamp(state.temperature / state.ambientTemperature, 0.65, 1.45);
  const pressureDensity = clamp(0.72 + pressureRatio * 0.42, 0.75, 1.85);

  if (state.phase === 'pumping') {
    return {
      densityMultiplier: clamp(pressureDensity + 0.18, 1.08, 1.95),
      speedMultiplier: clamp(1.18 + (temperatureRatio - 1) * 4.5, 1.18, 1.85),
      color: '#fb923c',
      emissiveIntensity: 0.34,
      outflowActive: false,
      outflowIntensity: 0,
      stability: 0.35,
    };
  }

  if (state.phase === 'stabilizingP1' || state.phase === 'recordP1') {
    return {
      densityMultiplier: clamp(pressureDensity + 0.18, 1.08, 1.95),
      speedMultiplier: 1.04,
      color: '#38bdf8',
      emissiveIntensity: 0.22,
      outflowActive: false,
      outflowIntensity: 0,
      stability: state.phase === 'recordP1' ? 0.86 : 0.62,
    };
  }

  if (state.phase === 'releasing' || state.phase === 'recovering') {
    return {
      densityMultiplier: state.phase === 'releasing'
        ? clamp(pressureDensity * 0.74, 0.82, 1.25)
        : clamp(pressureDensity, 0.92, 1.45),
      speedMultiplier: state.phase === 'releasing' ? 0.78 : 1,
      color: state.phase === 'releasing' ? '#7dd3fc' : '#22d3ee',
      emissiveIntensity: state.phase === 'releasing' ? 0.3 : 0.2,
      outflowActive: state.phase === 'releasing',
      outflowIntensity: state.phase === 'releasing' ? 0.95 : 0,
      stability: state.phase === 'releasing' ? 0.28 : 0.72,
    };
  }

  if (state.phase === 'recordP2' || state.phase === 'completed') {
    return {
      densityMultiplier: clamp(pressureDensity, 0.92, 1.45),
      speedMultiplier: 1,
      color: '#38bdf8',
      emissiveIntensity: 0.18,
      outflowActive: false,
      outflowIntensity: 0,
      stability: 0.92,
    };
  }

  return {
    densityMultiplier: 1,
    speedMultiplier: 1,
    color: '#38bdf8',
    emissiveIntensity: 0.18,
    outflowActive: false,
    outflowIntensity: 0,
    stability: 0.9,
  };
};

const createInteractionDescriptor = (
  state: HeatCapacityState,
  descriptor: Omit<HeatCapacityInteractionDescriptor, 'phase'>,
): HeatCapacityInteractionDescriptor => ({
  phase: state.phase,
  ...descriptor,
});

export const getHeatCapacityInteractionDescriptor = (
  state: HeatCapacityState,
): HeatCapacityInteractionDescriptor => {
  if (!state.instrument.instrumentPowered) {
    return createInteractionDescriptor(state, {
      primaryPart: 'Instrument_Box_Power_Switch',
      secondaryParts: ['Instrument_Box_Power_Light', 'Instrument_Box'],
      validParts: ['Instrument_Box_Power_Switch'],
      instruction: 'Please turn on the instrument box before reading sensors or operating the experiment.',
      purpose: 'The power switch enables the displays, analog gauge, and guided experiment controls without changing the gas state.',
    });
  }

  if (state.phase === 'equalizing') {
    return createInteractionDescriptor(state, {
      primaryPart: 'Hit_Pressure_Gauge',
      secondaryParts: ['Valve_C2'],
      validParts: ['Hit_Pressure_Gauge'],
      instruction: '点击压力表记录 p0，此时 C2 与环境连通。',
      purpose: 'p0 是加压前的环境参考压强。',
    });
  }

  if (state.phase === 'pumping') {
    const hasPressurizedGas = state.pressure > state.ambientPressure;
    return createInteractionDescriptor(state, {
      primaryPart: hasPressurizedGas ? 'Hit_Temperature_Display' : 'Hit_Pump',
      secondaryParts: hasPressurizedGas ? ['Hit_Pump', 'Valve_C1'] : ['Valve_C1'],
      validParts: hasPressurizedGas ? ['Hit_Pump', 'Hit_Temperature_Display'] : ['Hit_Pump'],
      instruction: hasPressurizedGas
        ? '点击温度显示确认进入 p1 稳定过程，也可以继续点击泵增加压强。'
        : '点击泵给方形压力腔加压，然后再进行 p1 稳定。',
      purpose: 'p1 必须来自实际加压后的高压状态。',
    });
  }

  if (state.phase === 'stabilizingP1') {
    return createInteractionDescriptor(state, {
      primaryPart: 'Hit_Temperature_Display',
      secondaryParts: ['Temperature_Display'],
      validParts: ['Hit_Temperature_Display'],
      instruction: '点击温度显示，确认高压气体已经回到环境温度。',
      purpose: 'p1 应在高压状态热稳定后记录。',
    });
  }

  if (state.phase === 'recordP1') {
    return createInteractionDescriptor(state, {
      primaryPart: 'Hit_Pressure_Gauge',
      secondaryParts: ['Pressure_Gauge_Needle'],
      validParts: ['Hit_Pressure_Gauge'],
      instruction: '点击压力表记录稳定后的高压读数 p1。',
      purpose: 'p1 是后续计算 gamma 的高压状态读数。',
    });
  }

  if (state.phase === 'releasing') {
    return createInteractionDescriptor(state, {
      primaryPart: 'Hit_C2',
      secondaryParts: ['Valve_C2'],
      validParts: ['Hit_C2'],
      instruction: '点击 C2 快速放气，近似实现绝热膨胀。',
      purpose: '快速放气用于在明显热交换前降低气体压强。',
    });
  }

  if (state.phase === 'recovering') {
    return createInteractionDescriptor(state, {
      primaryPart: 'Hit_Temperature_Display',
      secondaryParts: ['Temperature_Display'],
      validParts: ['Hit_Temperature_Display'],
      instruction: '点击温度显示，确认气体已经恢复到环境温度。',
      purpose: 'p2 应在定容热恢复后记录。',
    });
  }

  if (state.phase === 'recordP2') {
    return createInteractionDescriptor(state, {
      primaryPart: 'Hit_Pressure_Gauge',
      secondaryParts: ['Pressure_Gauge_Needle'],
      validParts: ['Hit_Pressure_Gauge'],
      instruction: '点击压力表记录 p2，并计算 gamma。',
      purpose: 'p2 与 p0、p1 一起代入 gamma = ln(p1/p0) / ln(p1/p2)。',
    });
  }

  return createInteractionDescriptor(state, {
    primaryPart: null,
    secondaryParts: [],
    validParts: [],
    instruction: '本次实验已完成。使用 Reset 开始下一次测量。',
    purpose: '当前 trial 已经得到 p0、p1、p2 和 gamma。',
  });
};

const invalidPartResolution = (
  state: HeatCapacityState,
  partId: HeatCapacityInstrumentPartId,
): HeatCapacityPartActionResolution => {
  if (
    partId === 'Pressure_Sensor' ||
    partId === 'Temperature_Sensor' ||
    partId === 'Sensor_Cable_Pressure' ||
    partId === 'Sensor_Cable_Temperature' ||
    partId === 'Instrument_Box' ||
    partId === 'Instrument_Box_Display' ||
    partId === 'Square_Glass_Bottle' ||
    partId === 'Glass_Wall_Panels' ||
    partId === 'Glass_Edge_Frame' ||
    partId === 'Glass_Bottom_Base' ||
    partId === 'Glass_Outer_Shell' ||
    partId === 'Sealing_Stopper' ||
    partId === 'Top_Glass_Tube' ||
    partId === 'Valve_Manifold' ||
    partId === 'Instrument_Box_Front_Panel' ||
    partId === 'Instrument_Box_Temp_LCD' ||
    partId === 'Instrument_Box_Pressure_LCD' ||
    partId === 'Instrument_Box_Temp_Display' ||
    partId === 'Instrument_Box_Pressure_Display' ||
    partId === 'Instrument_Box_Analog_Gauge' ||
    partId === 'Instrument_Box_Power_Light' ||
    partId === 'Instrument_Box_Pump_Check_Switch' ||
    partId === 'Pump_Column' ||
    partId === 'Pump_Slider' ||
    partId === 'Hit_Instrument_Box'
  ) {
    return {
      accepted: false,
      action: null,
      message: '传感器数据由压力腔内传感器采集并显示到外部仪表箱；它们只显示数据，不推进实验步骤。',
    };
  }

  if (
    state.phase === 'pumping' &&
    partId === 'Hit_Temperature_Display' &&
    state.pressure <= state.ambientPressure
  ) {
    return {
      accepted: false,
      action: null,
      message: '请先点击泵给压力腔加压，再确认 p1 稳定。',
    };
  }

  const descriptor = getHeatCapacityInteractionDescriptor(state);
  return {
    accepted: false,
    action: null,
    message: descriptor.primaryPart
      ? `当前步骤：${descriptor.instruction}`
      : descriptor.instruction,
  };
};

export const resolveHeatCapacityPartAction = (
  state: HeatCapacityState,
  partId: HeatCapacityInstrumentPartId,
): HeatCapacityPartActionResolution => {
  if (partId === 'Instrument_Box_Power_Switch') {
    return {
      accepted: true,
      action: { type: 'toggleInstrumentPower' },
      message: state.instrument.instrumentPowered
        ? 'Instrument power turned off. Sensor readings and experiment controls are disabled.'
        : 'Instrument power turned on. Sensor readings and experiment controls are available.',
    };
  }

  const descriptor = getHeatCapacityInteractionDescriptor(state);
  if (!descriptor.validParts.includes(partId)) return invalidPartResolution(state, partId);

  if (state.phase === 'equalizing' && partId === 'Hit_Pressure_Gauge') {
    return {
      accepted: true,
      action: { type: 'recordP0' },
      message: '已通过压力表记录 p0。',
    };
  }

  if (state.phase === 'pumping') {
    if (partId === 'Hit_Pump') {
      return {
        accepted: true,
        action: { type: 'pump', strokes: 1 },
        message: '已完成一次泵气。',
      };
    }
    if (partId === 'Hit_Temperature_Display') {
      return {
        accepted: true,
        action: { type: 'stabilizeP1' },
        message: '进入 p1 热稳定过程。',
      };
    }
  }

  if (state.phase === 'stabilizingP1' && partId === 'Hit_Temperature_Display') {
    return {
      accepted: true,
      action: { type: 'stabilizeP1' },
      message: '已确认 p1 稳定。',
    };
  }

  if (state.phase === 'recordP1' && partId === 'Hit_Pressure_Gauge') {
    return {
      accepted: true,
      action: { type: 'recordP1' },
      message: '已通过压力表记录 p1。',
    };
  }

  if (state.phase === 'releasing' && partId === 'Hit_C2') {
    return {
      accepted: true,
      action: { type: 'release', durationMs: IDEAL_RELEASE_DURATION_MS, closeDelayMs: 0 },
      message: '已执行 C2 快速放气。',
    };
  }

  if (state.phase === 'recovering' && partId === 'Hit_Temperature_Display') {
    return {
      accepted: true,
      action: { type: 'recover' },
      message: '已确认热恢复。',
    };
  }

  if (state.phase === 'recordP2' && partId === 'Hit_Pressure_Gauge') {
    return {
      accepted: true,
      action: { type: 'recordP2' },
      message: '已通过压力表记录 p2。',
    };
  }

  return invalidPartResolution(state, partId);
};

export const createHeatCapacityExperiment = (
  options: HeatCapacityExperimentOptions = {},
): HeatCapacityState => {
  const ambientPressure = sanitizePositiveNumber(options.ambientPressure, DEFAULT_AMBIENT_PRESSURE);
  const ambientTemperature = sanitizePositiveNumber(options.ambientTemperature, DEFAULT_AMBIENT_TEMPERATURE);
  const phase: HeatCapacityPhase = 'equalizing';

  const state: HeatCapacityState = {
    phase,
    mode: options.mode ?? 'guided',
    ambientPressure,
    ambientTemperature,
    pressure: ambientPressure,
    temperature: ambientTemperature,
    particleCount: sanitizePositiveInteger(options.particleCount, DEFAULT_PARTICLE_COUNT),
    vesselLength: sanitizePositiveNumber(options.vesselLength, DEFAULT_VESSEL_LENGTH),
    recorded: {
      p0: null,
      p1: null,
      p2: null,
    },
    trials: [],
    result: null,
    pendingP2: null,
    lastError: null,
    instrument: createInstrumentState(phase, ambientPressure, ambientTemperature),
  };
  return {
    ...state,
    instrument: syncInstrument(state),
  };
};

const getReleasePenalty = (durationMs: number, closeDelayMs: number) => {
  const releaseDeviation = Math.abs(durationMs - IDEAL_RELEASE_DURATION_MS) / IDEAL_RELEASE_DURATION_MS;
  const slowReleasePenalty = Math.min(0.16, releaseDeviation * 0.045);
  const closeDelayPenalty = Math.min(0.12, Math.max(0, closeDelayMs) * 0.00018);
  return slowReleasePenalty + closeDelayPenalty;
};

const getIdealRecoveredPressure = (p0: number, p1: number) => (
  p1 / Math.pow(p1 / p0, 1 / HARD_SPHERE_GAMMA)
);

const clampRecoveredPressure = (p0: number, p1: number, candidate: number) => {
  const epsilon = Math.max(0.001, Math.abs(p1 - p0) * 1e-6);
  if (p1 <= p0 + epsilon * 2) return (p0 + p1) / 2;
  return Math.min(p1 - epsilon, Math.max(p0 + epsilon, candidate));
};

const createResult = (p0: number, p1: number, p2: number): HeatCapacityResult | null => {
  const gamma = calculateGamma(p0, p1, p2);
  if (gamma === null) return null;
  return {
    gamma,
    theoreticalGamma: HARD_SPHERE_GAMMA,
    relativeErrorPercent: calculateRelativeErrorPercent(gamma) ?? 0,
  };
};

export const applyHeatCapacityAction = (
  state: HeatCapacityState,
  action: HeatCapacityAction,
): HeatCapacityState => {
  if (action.type === 'toggleInstrumentPower') {
    return withState(state, {
      instrument: {
        instrumentPowered: !state.instrument.instrumentPowered,
      },
      lastError: state.instrument.instrumentPowered
        ? 'Instrument power is off. Turn on the instrument box before continuing.'
        : null,
    });
  }

  if (action.type === 'setInstrumentPower') {
    return withState(state, {
      instrument: {
        instrumentPowered: action.powered,
      },
      lastError: action.powered
        ? null
        : 'Instrument power is off. Turn on the instrument box before continuing.',
    });
  }

  if (action.type === 'reset') {
    return {
      ...createHeatCapacityExperiment({
        ambientPressure: state.ambientPressure,
        ambientTemperature: state.ambientTemperature,
        particleCount: state.particleCount,
        vesselLength: state.vesselLength,
        mode: state.mode,
      }),
      trials: [...state.trials],
    };
  }

  if (!state.instrument.instrumentPowered) {
    return withError(state, 'Instrument power is off. Turn on the instrument box before reading sensors or operating controls.');
  }

  if (action.type === 'recordP0') {
    if (state.phase !== 'equalizing') {
      return withError(state, '只有在压力腔与环境平衡时才能记录 p0。');
    }
    return withState(state, {
      phase: 'pumping',
      pressure: state.ambientPressure,
      temperature: state.ambientTemperature,
      recorded: { ...state.recorded, p0: roundMetric(state.ambientPressure) },
      instrument: {
        c1Open: true,
        c2Open: false,
        highlightedPart: 'Hit_Pump',
      },
    });
  }

  if (action.type === 'pump') {
    if (state.phase !== 'pumping') {
      return withError(state, '记录 p0 并关闭 C2 后才能使用泵。');
    }
    const strokes = Math.max(0, Math.min(12, Math.round(action.strokes)));
    const pressure = state.pressure + strokes * PUMP_PRESSURE_STEP;
    const temperature = state.temperature + strokes * PUMP_TEMPERATURE_STEP;
    return withState(state, {
      pressure: roundMetric(pressure),
      temperature: roundMetric(temperature),
      instrument: {
        c1Open: true,
        c2Open: false,
        pumpProgress: Math.min(1, strokes / 8),
        highlightedPart: 'Pump_Handle',
      },
    });
  }

  if (action.type === 'stabilizeP1') {
    if (state.phase === 'stabilizingP1') {
      return withState(state, {
        phase: 'recordP1',
        temperature: state.ambientTemperature,
        instrument: {
          c1Open: false,
          c2Open: false,
          pumpProgress: 0,
          highlightedPart: 'Pressure_Gauge_Needle',
        },
      });
    }
    if (state.phase !== 'pumping' || state.pressure <= state.ambientPressure) {
      return withError(state, '必须先给气体加压，才能等待 p1 稳定。');
    }
    return withState(state, {
      phase: 'stabilizingP1',
      temperature: state.ambientTemperature,
      instrument: {
        c1Open: false,
        c2Open: false,
        pumpProgress: 0,
        highlightedPart: 'Pressure_Gauge_Needle',
      },
    });
  }

  if (action.type === 'recordP1') {
    if (state.phase !== 'recordP1') {
      if (state.phase === 'stabilizingP1') {
        return withError(state, '必须等待高压气体稳定后才能记录 p1。');
      }
      return withError(state, '气体尚未完成加压和稳定，不能记录 p1。');
    }
    return withState(state, {
      phase: 'releasing',
      recorded: { ...state.recorded, p1: roundMetric(state.pressure) },
      instrument: {
        c1Open: false,
        c2Open: false,
        highlightedPart: 'Valve_C2',
      },
    });
  }

  if (action.type === 'release') {
    if (state.phase !== 'releasing' || state.recorded.p0 === null || state.recorded.p1 === null) {
      return withError(state, '只有记录 p1 后才能通过 C2 放气。');
    }
    const closeDelayMs = action.closeDelayMs ?? 0;
    const idealP2 = getIdealRecoveredPressure(state.recorded.p0, state.recorded.p1);
    const penalty = getReleasePenalty(action.durationMs, closeDelayMs);
    const pendingP2 = clampRecoveredPressure(
      state.recorded.p0,
      state.recorded.p1,
      idealP2 * (1 - penalty),
    );
    const adiabaticTemperature = Math.max(
      state.ambientTemperature * 0.72,
      state.ambientTemperature * (state.recorded.p0 / state.recorded.p1) ** ((HARD_SPHERE_GAMMA - 1) / HARD_SPHERE_GAMMA),
    );

    return withState(state, {
      phase: 'recovering',
      pressure: roundMetric(state.recorded.p0),
      temperature: roundMetric(adiabaticTemperature),
      pendingP2: roundMetric(pendingP2),
      instrument: {
        c1Open: false,
        c2Open: false,
        highlightedPart: 'Temperature_Display',
      },
    });
  }

  if (action.type === 'recover') {
    if (state.phase !== 'recovering' || state.pendingP2 === null) {
      return withError(state, '必须完成放气后才能进行热恢复。');
    }
    return withState(state, {
      phase: 'recordP2',
      pressure: state.pendingP2,
      temperature: state.ambientTemperature,
      instrument: {
        c1Open: false,
        c2Open: false,
        highlightedPart: 'Pressure_Gauge_Needle',
      },
    });
  }

  if (action.type === 'recordP2') {
    if (
      state.phase !== 'recordP2' ||
      state.recorded.p0 === null ||
      state.recorded.p1 === null
    ) {
      return withError(state, '热恢复完成前不能记录 p2。');
    }
    const p2 = roundMetric(state.pressure);
    const result = createResult(state.recorded.p0, state.recorded.p1, p2);
    if (!result) return withError(state, '当前 p0、p1、p2 无法计算有效的 gamma。');

    return withState(state, {
      phase: 'completed',
      recorded: { ...state.recorded, p2 },
      result,
      trials: [
        ...state.trials,
        {
          p0: state.recorded.p0,
          p1: state.recorded.p1,
          p2,
          timestamp: Date.now(),
        },
      ],
      instrument: {
        c1Open: false,
        c2Open: false,
        highlightedPart: null,
      },
    });
  }

  return state;
};
