import {
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  calculateHeatCapacityGroupReference,
} from '../../domain/heatCapacity/heatCapacityCalculationModel.ts';
import {
  createHeatCapacityCalculationWorkflowSession,
} from '../../domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  createEmptyHeatCapacityFreeBatchState,
  HEAT_CAPACITY_FREE_SCORING_VERSION,
} from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import type {
  HeatCapacityFreeExperimentGroupCollection,
  HeatCapacityFreeExperimentGroupRecord,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import type {
  HeatCapacityFreeRecord,
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
  type HeatCapacityFreeStandardReferenceSnapshot,
  type HeatCapacityStandardReferenceSummary,
} from '../../domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import type {
  HeatCapacityFreeProcessReview,
  HeatCapacityProcessDiagnosisRow,
  HeatCapacityProcessTracePoint,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import type {
  HeatCapacityBestRecordWindow,
  HeatCapacityFreeBatchScore,
  HeatCapacityProcessReferencePoint,
  HeatCapacityProcessStageSegment,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts';

const ACTUAL_STAGES: HeatCapacityProcessStageSegment[] = [
  { id: 'zero', label: '调零', startS: 0, endS: 5 },
  { id: 'pump', label: '打气', startS: 5, endS: 12, countText: '×18', durationText: '7.0 s' },
  { id: 'stabilize', label: '回温稳定', startS: 12, endS: 30, durationText: '18 s' },
  { id: 'release', label: '开阀放气', startS: 30, endS: 30.6, durationText: '0.600 s' },
  { id: 'recover', label: '关阀回温', startS: 30.6, endS: 60, durationText: '29.4 s' },
];

const STANDARD_STAGES: HeatCapacityProcessStageSegment[] = [
  { id: 'zero', label: '调零', startS: 0, endS: 1.2 },
  { id: 'pump', label: '标准打气', startS: 1.2, endS: 9.28, countText: '×18', durationText: '8.08 s' },
  { id: 'stabilize', label: '回温稳定', startS: 9.28, endS: 30, durationText: '300 s' },
  { id: 'release', label: '标准放气', startS: 30, endS: 30.6, durationText: '0.600 s' },
  { id: 'recover', label: '关阀回温', startS: 30.6, endS: 60, durationText: '300 s' },
];

const createTrace = (
  prefix: string,
  standard = false,
): HeatCapacityProcessTracePoint[] => {
  const points = [
    [0, 0, 0],
    [5, 0.02, 0.01],
    [7, 1.8, 0.42],
    [9, 3.7, 0.83],
    [12, 5.64, 1.34],
    [16, 5.62, 0.92],
    [22, 5.61, 0.42],
    [30, 5.60, 0.06],
    [30.6, 1.57, -1.18],
    [36, 1.56, -0.72],
    [44, 1.55, -0.31],
    [52, 1.54, -0.11],
    [60, 1.53, -0.02],
  ];
  return points.map(([timeS, pressureDeltaKPa, temperatureDeltaK], index) => ({
    sampleId: `${prefix}-${index + 1}`,
    timeS,
    pressureDeltaKPa: standard ? pressureDeltaKPa * 1.006 : pressureDeltaKPa,
    temperatureDeltaK: standard ? temperatureDeltaK * 0.94 : temperatureDeltaK,
  }));
};

const createReferenceTrace = (): HeatCapacityProcessReferencePoint[] => (
  createTrace('standard', true).map((point) => ({
    ...point,
    stageId: point.timeS <= 1.2
      ? 'zero'
      : point.timeS <= 9.28
        ? 'pump'
        : point.timeS < 30
          ? 'stabilize'
          : point.timeS <= 30.6
            ? 'release'
            : 'recover',
  }))
);

const RECORD_WINDOWS: HeatCapacityBestRecordWindow[] = [
  {
    recordId: 'u0', startS: 0.2, endS: 2.2, recommendedSampleId: 'standard-u0',
    recommendedTimeS: 1.2, displayPressureMv: 0, displayTemperatureMv: 1498.7,
    pressureDeltaKPa: 0, temperatureDeltaK: 0, qualityScore: 100,
    source: 'standard-operation', reason: '标准调零稳定窗口。',
  },
  {
    recordId: 'u1', startS: 28.8, endS: 30.8, recommendedSampleId: 'standard-u1',
    recommendedTimeS: 30, displayPressureMv: 112.8, displayTemperatureMv: 1498.7,
    pressureDeltaKPa: 5.64, temperatureDeltaK: 0, qualityScore: 100,
    source: 'standard-operation', reason: '标准打气后的稳定记录窗口。',
  },
  {
    recordId: 'u2', startS: 58.8, endS: 60.8, recommendedSampleId: 'standard-u2',
    recommendedTimeS: 60, displayPressureMv: 30.6, displayTemperatureMv: 1498.6,
    pressureDeltaKPa: 1.53, temperatureDeltaK: -0.02, qualityScore: 100,
    source: 'standard-operation', reason: '标准放气后的恢复记录窗口。',
  },
];

const STANDARD_SUMMARY: HeatCapacityStandardReferenceSummary = {
  feasible: true,
  seed: 1887858506,
  gamma: 1.400,
  relativeErrorPercent: 0.02,
  targetPressureMv: 112.8,
  targetPressureDeltaKPa: 5.64,
  releaseDurationS: 0.6,
  u1TimeS: 30,
  u2TimeS: 60,
  assumptions: {
    operationMode: 'standard-operation',
    disturbancesPreserved: true,
    stageAligned: true,
  },
  explanation: {
    operation: '按当前参数执行标准打气、稳定、快速放气和恢复流程。',
    windows: 'U0、U1、U2 使用标准流程中的稳定记录窗口。',
  },
};

const STANDARD_REFERENCE: HeatCapacityFreeStandardReferenceSnapshot = {
  ...STANDARD_SUMMARY,
  generatorVersion: HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
  operationPreset: { ...HEAT_CAPACITY_STANDARD_OPERATION },
  configSnapshot: createDefaultFreeConfigSnapshot(),
  trace: createReferenceTrace(),
  stages: STANDARD_STAGES,
  recordWindows: RECORD_WINDOWS,
  summary: STANDARD_SUMMARY,
  operationUpperBound: {
    gamma: 1.400,
    relativeErrorPercent: 0.02,
    gapFromActualPercent: 0,
    windows: RECORD_WINDOWS,
  },
};

const DIAGNOSTICS: HeatCapacityProcessDiagnosisRow[] = [
  {
    id: 'pumping',
    title: '打气过程',
    status: 'reasonable',
    evidence: '打气 18 次，U1 压强差 5.60 kPa。',
    relation: '目标压强位于有效范围。',
    recommendation: '保持当前打气范围。',
    score: 15,
    maxScore: 15,
    details: [
      { id: 'pumping-pressure-target', label: '目标压强', score: 6, maxScore: 6, status: 'reasonable', evidence: 'U1 修正量 112.0 mV。', reason: '无误。', recommendation: '无误。' },
      { id: 'pumping-safety', label: '安全提示', score: 5, maxScore: 5, status: 'reasonable', evidence: '未触发压力预警或报警。', reason: '无误。', recommendation: '无误。' },
      { id: 'pumping-rhythm', label: '打气节奏', score: 3, maxScore: 3, status: 'reasonable', evidence: '打气间隔稳定。', reason: '无误。', recommendation: '无误。' },
      { id: 'pumping-stability', label: '稳定等待', score: 1, maxScore: 1, status: 'reasonable', evidence: 'U1 记录点稳定。', reason: '无误。', recommendation: '无误。' },
    ],
  },
  {
    id: 'release',
    title: '放气操作',
    status: 'reasonable',
    evidence: 'U2/U1 = 0.28，放气 0.6 s。',
    relation: '泄放响应和 U2 保留量可用于计算。',
    recommendation: '保持当前快速开关节奏。',
    score: 25,
    maxScore: 25,
    details: [
      { id: 'release-valve', label: '开阀放气', score: 12, maxScore: 12, status: 'reasonable', evidence: '放气 0.6 s。', reason: '无误。', recommendation: '无误。' },
      { id: 'release-response', label: '泄放响应', score: 7, maxScore: 7, status: 'reasonable', evidence: 'U2/U1 = 0.28。', reason: '无误。', recommendation: '无误。' },
      { id: 'release-recover', label: '关阀回温', score: 3, maxScore: 3, status: 'reasonable', evidence: '关阀后进入恢复记录段。', reason: '无误。', recommendation: '无误。' },
      { id: 'release-retention', label: 'U2 保留量', score: 3, maxScore: 3, status: 'reasonable', evidence: 'U2/U1 = 0.28。', reason: '无误。', recommendation: '无误。' },
    ],
  },
  {
    id: 'recording',
    title: '记录链路',
    status: 'reasonable',
    evidence: 'U0 / U1 / U2 与计算结果完整。',
    relation: '记录窗口稳定，结果偏差可接受。',
    recommendation: '保持当前记录链路。',
    score: 30,
    maxScore: 30,
    details: [
      { id: 'record-chain-completeness', label: '数据完整性', score: 4, maxScore: 4, status: 'reasonable', evidence: 'U1 / U2 与计算结果完整。', reason: '无误。', recommendation: '无误。' },
      { id: 'record-chain-result', label: '结果合理性', score: 8, maxScore: 8, status: 'reasonable', evidence: 'γ = 1.400，绝对误差 0.000。', reason: '无误。', recommendation: '无误。' },
      { id: 'record-chain-zeroing', label: '调零与 U0', score: 8, maxScore: 8, status: 'reasonable', evidence: 'U0 = 0.00 mV。', reason: '无误。', recommendation: '无误。' },
      { id: 'record-chain-timing', label: '记录时机', score: 7, maxScore: 7, status: 'reasonable', evidence: 'U1 稳定，U2 稳定。', reason: '无误。', recommendation: '无误。' },
      { id: 'record-chain-preheat', label: '传感器预热', score: 3, maxScore: 3, status: 'reasonable', evidence: '本组已完成传感器预热。', reason: '无误。', recommendation: '无误。' },
    ],
  },
  {
    id: 'retake',
    title: '重录情况',
    status: 'reasonable',
    evidence: '本组没有重录分支。',
    relation: '无误。',
    recommendation: '保持当前记录连续性。',
    score: 5,
    maxScore: 5,
    details: [
      { id: 'retake-count', label: '重录情况', score: 5, maxScore: 5, status: 'reasonable', evidence: '无隐藏分支。', reason: '无误。', recommendation: '无误。' },
    ],
  },
  {
    id: 'calculation',
    title: '计算部分',
    status: 'reasonable',
    evidence: '本组计算已完成。',
    relation: '各次实验计算取平均权重，本组统计量按固定分值计入。',
    recommendation: '保持当前计算过程。',
    score: 25,
    maxScore: 25,
    details: [
      { id: 'calculation-corrected-voltages', label: '各次实验修正电压', score: 4, maxScore: 4, status: 'reasonable', evidence: '3/3 次实验已完成。', reason: '无误。', recommendation: '无误。' },
      { id: 'calculation-absolute-pressures', label: '各次实验绝对压强', score: 4, maxScore: 4, status: 'reasonable', evidence: '3/3 次实验已完成。', reason: '无误。', recommendation: '无误。' },
      { id: 'calculation-group-gamma', label: '各次实验比热容比', score: 7, maxScore: 7, status: 'reasonable', evidence: '3/3 次实验已完成。', reason: '无误。', recommendation: '无误。' },
      { id: 'calculation-mean-gamma', label: '平均比热容比', score: 3, maxScore: 3, status: 'reasonable', evidence: '本组统计量已完成。', reason: '无误。', recommendation: '无误。' },
      { id: 'calculation-sample-standard-deviation', label: '样本标准偏差', score: 3, maxScore: 3, status: 'reasonable', evidence: '本组统计量已完成。', reason: '无误。', recommendation: '无误。' },
      { id: 'calculation-type-a-uncertainty', label: 'A 类标准不确定度', score: 2, maxScore: 2, status: 'reasonable', evidence: '本组统计量已完成。', reason: '无误。', recommendation: '无误。' },
      { id: 'calculation-relative-error', label: '相对误差', score: 2, maxScore: 2, status: 'reasonable', evidence: '本组统计量已完成。', reason: '无误。', recommendation: '无误。' },
    ],
  },
];

const OUTCOME_GROUP_ID = 'product-intro-real-group-1';
const OUTCOME_GROUP_CONFIG = createDefaultFreeConfigSnapshot();
const OUTCOME_GROUP_GAMMAS = [1.393, 1.398, 1.403] as const;

const OUTCOME_BATCH_SCORE: HeatCapacityFreeBatchScore = {
  total: 100,
  maxScore: 100,
  operationAverage: 75,
  operationMaxScore: 75,
  calculation: {
    total: 25,
    maxScore: 25,
    status: 'reasonable',
    details: DIAGNOSTICS.find((row) => row.id === 'calculation')?.details ?? [],
  },
};

const createOutcomeRecord = (
  trialIndex: number,
  recordId: 'u0' | 'u1' | 'u2',
  atS: number,
  displayPressureMv: number,
): HeatCapacityFreeRecord => ({
  atS,
  displayPressureMv,
  displayTemperatureMv: 1_499 - trialIndex * 0.03,
  calibrationVersion: 1,
  zeroEventId: `product-intro-zero-${trialIndex}`,
  source: 'user',
  phaseAtRecord: null,
  traceTrialId: `product-intro-trace-${trialIndex}`,
  traceBranchId: 'main',
  traceSampleId: null,
  eventId: `product-intro-${recordId}-${trialIndex}`,
});

const createOutcomeGroupTrial = (
  trialIndex: number,
  gamma: number,
): HeatCapacityFreeTrial => {
  const u0 = 0.1;
  const u1 = 120.1 + (trialIndex - 2) * 0.8;
  const u2 = 40.1 + (trialIndex - 2) * 0.3;
  return {
    id: `product-intro-trial-${trialIndex}`,
    source: 'free',
    parameterScheme: 'real',
    batchMembership: {
      version: 1,
      batchId: OUTCOME_GROUP_ID,
      sequence: trialIndex,
    },
    traceTrialId: `product-intro-trace-${trialIndex}`,
    branchCount: 1,
    automaticU0: null,
    preheatOutcome: null,
    u0: createOutcomeRecord(trialIndex, 'u0', 0, u0),
    u1: createOutcomeRecord(trialIndex, 'u1', 30, u1),
    u2: createOutcomeRecord(trialIndex, 'u2', 60, u2),
    blockedReason: null,
    correctedSignals: {
      calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
      atmosphericPressureKPa: 101.3,
      pressureSensitivityMvPerKPa: 20,
      U0DisplayMv: u0,
      U1DisplayMv: u1,
      U2DisplayMv: u2,
      U1CorrectedMv: u1 - u0,
      U2CorrectedMv: u2 - u0,
      u0Source: 'recorded',
      formulaGamma: gamma,
      preheatBiasGamma: 0,
      gamma,
    },
    configSnapshot: OUTCOME_GROUP_CONFIG,
    standardReferenceSnapshot: STANDARD_REFERENCE,
    completedAtMs: 1_000 + trialIndex * 100,
  };
};

const OUTCOME_GROUP_TRIALS = OUTCOME_GROUP_GAMMAS.map((gamma, index) => (
  createOutcomeGroupTrial(index + 1, gamma)
));

const OUTCOME_GROUP_CALCULATION_SESSION = createHeatCapacityCalculationWorkflowSession({
  mode: 'free',
  presentation: 'system-readonly',
  groups: OUTCOME_GROUP_TRIALS.map((trial) => {
    const reference = calculateHeatCapacityGroupReference({
      u0Mv: trial.u0?.displayPressureMv ?? 0,
      u1Mv: trial.u1?.displayPressureMv ?? 0,
      u2Mv: trial.u2?.displayPressureMv ?? 0,
      atmosphericPressureKPa: OUTCOME_GROUP_CONFIG.environment.ambientPressureKPa,
      pressureSensitivityMvPerKPa: OUTCOME_GROUP_CONFIG.sensor.pressureMvPerKPa,
    });
    if (reference === null) {
      throw new Error('Product introduction group calculation reference is invalid.');
    }
    return { trialId: trial.id, reference };
  }),
  theoreticalGamma: OUTCOME_GROUP_CONFIG.physics.gamma,
  now: 1_400,
});

const OUTCOME_GROUP: HeatCapacityFreeExperimentGroupRecord = {
  version: 1,
  id: OUTCOME_GROUP_ID,
  scheme: 'real',
  schemeGroupNumber: 1,
  globalOrder: 1,
  status: 'completed',
  targetExperimentCount: 3,
  gasType: 'air',
  parameterSnapshot: OUTCOME_GROUP_CONFIG,
  runSeries: {
    batch: {
      ...createEmptyHeatCapacityFreeBatchState(),
      id: OUTCOME_GROUP_ID,
      targetGroupCount: 3,
      frozenConfigSnapshot: OUTCOME_GROUP_CONFIG,
      configuredAtMs: 100,
      startedAtMs: 200,
      experimentCompletedAtMs: 1_400,
      nextTrialSequence: 4,
      scoringVersion: HEAT_CAPACITY_FREE_SCORING_VERSION,
      calculationSession: OUTCOME_GROUP_CALCULATION_SESSION,
    },
    trials: OUTCOME_GROUP_TRIALS,
    traceStore: createDefaultFreeTraceStore(),
  },
  calculation: {
    kind: 'real-interactive',
    session: OUTCOME_GROUP_CALCULATION_SESSION,
  },
  finalScore: OUTCOME_BATCH_SCORE,
  scoringVersion: HEAT_CAPACITY_FREE_SCORING_VERSION,
  createdAtMs: 100,
  startedAtMs: 200,
  acquisitionCompletedAtMs: 1_400,
  completedAtMs: 1_500,
  legacyCompatibility: null,
};

const OUTCOME_GROUP_COLLECTION: HeatCapacityFreeExperimentGroupCollection = {
  version: 1,
  groups: [OUTCOME_GROUP],
  currentGroupId: OUTCOME_GROUP_ID,
  viewedGroupId: OUTCOME_GROUP_ID,
  pendingNextScheme: 'real',
  lastViewedTrialIdByGroupId: {
    [OUTCOME_GROUP_ID]: OUTCOME_GROUP_TRIALS[0].id,
  },
  nextSchemeGroupNumber: {
    real: 2,
    ideal: 1,
  },
  nextGlobalOrder: 2,
  capacityEstimate: {
    bytes: 0,
    measuredAtMs: null,
  },
};

export const createProductIntroOutcomeGroupFixture = () => ({
  group: OUTCOME_GROUP,
  collection: OUTCOME_GROUP_COLLECTION,
});

export const createProductIntroOutcomeReview = (): HeatCapacityFreeProcessReview => ({
  status: 'ready',
  selectedTrialId: 'product-intro-trial-1',
  trialOptions: [
    {
      trialId: 'product-intro-trial-1',
      traceTrialId: 'product-intro-trace-1',
      trialIndex: 1,
      status: 'complete',
      gamma: OUTCOME_GROUP_GAMMAS[0],
      retakeCount: 0,
    },
    {
      trialId: 'product-intro-trial-2',
      traceTrialId: 'product-intro-trace-2',
      trialIndex: 2,
      status: 'complete',
      gamma: OUTCOME_GROUP_GAMMAS[1],
      retakeCount: 0,
    },
    {
      trialId: 'product-intro-trial-3',
      traceTrialId: 'product-intro-trace-3',
      trialIndex: 3,
      status: 'complete',
      gamma: OUTCOME_GROUP_GAMMAS[2],
      retakeCount: 0,
    },
  ],
  summary: {
    trialIndex: 1,
    trialId: 'product-intro-trial-1',
    traceTrialId: 'product-intro-trace-1',
    branchId: 'main',
    branchCount: 1,
    retakeCount: 0,
    u1: {
      atS: 30,
      displayPressureMv: 112,
      displayTemperatureMv: 1499,
      pressureDeltaKPa: 5.6,
      temperatureDeltaK: 0,
    },
    u2: {
      atS: 60,
      displayPressureMv: 31.4,
      displayTemperatureMv: 1498.9,
      pressureDeltaKPa: 1.57,
      temperatureDeltaK: -0.02,
    },
    gamma: 1.4,
    relativeErrorPercent: 0.02,
    upperBoundGamma: 1.4,
    upperBoundRelativeErrorPercent: 0.02,
    upperBoundGapPercent: 0,
  },
  chart: {
    stages: ACTUAL_STAGES,
    actualTrace: createTrace('actual'),
    records: [
      { id: 'u0', label: 'U0', timeS: 0, signalMv: 0, pressureDeltaKPa: 0, temperatureDeltaK: 0, eventId: 'record-u0', traceSampleId: 'actual-1' },
      { id: 'u1', label: 'U1', timeS: 30, signalMv: 112, pressureDeltaKPa: 5.6, temperatureDeltaK: 0, eventId: 'record-u1', traceSampleId: 'actual-8' },
      { id: 'u2', label: 'U2', timeS: 60, signalMv: 31.4, pressureDeltaKPa: 1.57, temperatureDeltaK: -0.02, eventId: 'record-u2', traceSampleId: 'actual-13' },
    ],
    controls: [
      { id: 'power-on', kind: 'power', label: '开启电源', timeS: 0 },
      { id: 'pump-valve-open', kind: 'pumpValve', label: '打开打气阀', timeS: 5 },
      { id: 'pump', kind: 'pumpBulb', label: '打气球', timeS: 7, count: 18 },
      { id: 'pump-valve-close', kind: 'pumpValve', label: '关闭打气阀', timeS: 12 },
      { id: 'release-open', kind: 'stopcock', label: '打开玻璃旋塞', timeS: 30 },
      { id: 'release-close', kind: 'stopcock', label: '关闭玻璃旋塞', timeS: 30.6 },
    ],
    systemEvents: [],
    standardReference: STANDARD_REFERENCE,
  },
  diagnostics: DIAGNOSTICS,
  score: {
    total: 75,
    maxScore: 75,
    items: [],
  },
  batchScore: OUTCOME_BATCH_SCORE,
});
