import type {
  HeatCapacityFreeRecord,
  HeatCapacityFreeTrial,
} from './heatCapacityFreeTrialModel.ts';
import type {
  HeatCapacityFreeEvent,
  HeatCapacityFreeEventType,
  HeatCapacityFreeTraceBranch,
  HeatCapacityFreeTraceSample,
  HeatCapacityFreeTraceStore,
  HeatCapacityFreeTraceTrial,
} from './heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityBestRecordWindow,
  HeatCapacityOperationUpperBound,
  HeatCapacityProcessDiagnosisId,
  HeatCapacityProcessDiagnosisStatus,
  HeatCapacityProcessRecordId,
  HeatCapacityProcessReferencePoint,
  HeatCapacityProcessReviewTrialOption,
  HeatCapacityProcessScore,
  HeatCapacityProcessScoreItem,
  HeatCapacityProcessScoreSubItem,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
} from './heatCapacityFreeProcessReviewTypes.ts';
import {
  alignStandardReferenceToStages,
  createHeatCapacityStandardReference,
} from './heatCapacityFreeStandardReferenceModel.ts';
import {
  selectHeatCapacityBestRecordWindows,
} from './heatCapacityFreeBestWindowModel.ts';
import {
  createHeatCapacityOperableBestReference,
} from './heatCapacityFreeOperableBestModel.ts';
import {
  scoreHeatCapacityFreeProcess,
} from './heatCapacityFreeProcessScoringModel.ts';

export type {
  HeatCapacityProcessDiagnosisId,
  HeatCapacityProcessDiagnosisStatus,
  HeatCapacityProcessRecordId,
  HeatCapacityProcessReferencePoint,
  HeatCapacityBestRecordWindow,
  HeatCapacityOperationUpperBound,
  HeatCapacityProcessReviewTrialOption,
  HeatCapacityProcessScore,
  HeatCapacityProcessScoreItem,
  HeatCapacityProcessScoreSubItem,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
} from './heatCapacityFreeProcessReviewTypes.ts';

export type HeatCapacityProcessReviewStatus = 'ready' | 'empty' | 'missing-trace' | 'incomplete';
export type HeatCapacityProcessControlKind = 'power' | 'pumpValve' | 'pumpBulb' | 'stopcock';
export type HeatCapacityProcessSystemKind = 'warning' | 'danger' | 'blocked' | 'retake';

export interface HeatCapacityProcessReviewRecordValue {
  atS: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  pressureDeltaKPa: number;
  temperatureDeltaK: number;
}

export interface HeatCapacityProcessReviewSummary {
  trialIndex: number;
  trialId: string;
  traceTrialId: string | null;
  branchId: string | null;
  branchCount: number;
  retakeCount: number;
  u1: HeatCapacityProcessReviewRecordValue | null;
  u2: HeatCapacityProcessReviewRecordValue | null;
  gamma: number | null;
  relativeErrorPercent: number | null;
  upperBoundGamma: number | null;
  upperBoundRelativeErrorPercent: number | null;
  upperBoundGapPercent: number | null;
}

export interface HeatCapacityProcessTracePoint {
  sampleId: string;
  timeS: number;
  pressureDeltaKPa: number;
  temperatureDeltaK: number;
}

export interface HeatCapacityProcessRecordEvent {
  id: HeatCapacityProcessRecordId;
  label: string;
  timeS: number;
  signalMv: number;
  pressureDeltaKPa: number;
  temperatureDeltaK: number;
  eventId: string | null;
  traceSampleId: string | null;
}

export interface HeatCapacityProcessControlEvent {
  id: string;
  kind: HeatCapacityProcessControlKind;
  label: string;
  timeS: number;
  count?: number;
}

export interface HeatCapacityProcessSystemEvent {
  id: string;
  kind: HeatCapacityProcessSystemKind;
  label: string;
  timeS: number;
}

export interface HeatCapacityProcessChartData {
  stages: HeatCapacityProcessStageSegment[];
  trace: HeatCapacityProcessTracePoint[];
  records: HeatCapacityProcessRecordEvent[];
  controls: HeatCapacityProcessControlEvent[];
  systemEvents: HeatCapacityProcessSystemEvent[];
  referenceTrace: HeatCapacityProcessReferencePoint[];
  operableBestTrace: HeatCapacityProcessReferencePoint[];
  bestWindows: HeatCapacityBestRecordWindow[];
}

export interface HeatCapacityProcessDiagnosisRow {
  id: HeatCapacityProcessDiagnosisId;
  title: string;
  status: HeatCapacityProcessDiagnosisStatus;
  evidence: string;
  relation?: string;
  recommendation: string;
  score?: number | null;
  maxScore?: number | null;
  details?: HeatCapacityProcessScoreSubItem[];
}

export interface HeatCapacityFreeProcessReview {
  status: HeatCapacityProcessReviewStatus;
  selectedTrialId: string | null;
  trialOptions: HeatCapacityProcessReviewTrialOption[];
  summary: HeatCapacityProcessReviewSummary | null;
  chart: HeatCapacityProcessChartData;
  diagnostics: HeatCapacityProcessDiagnosisRow[];
  score: HeatCapacityProcessScore;
}

export interface SelectHeatCapacityFreeProcessReviewOptions {
  trials: HeatCapacityFreeTrial[];
  traceStore: HeatCapacityFreeTraceStore;
  theoreticalGamma?: number;
  trialIndex?: number;
  selectedTrialId?: string | null;
}

const emptyChart = (): HeatCapacityProcessChartData => ({
  stages: [],
  trace: [],
  records: [],
  controls: [],
  systemEvents: [],
  referenceTrace: [],
  operableBestTrace: [],
  bestWindows: [],
});

const emptyScore = (): HeatCapacityProcessScore => ({
  total: null,
  maxScore: 100,
  items: [],
});

const roundNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const formatNumber = (value: number, digits = 1) => (
  Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const createEmptyDiagnosis = (): HeatCapacityProcessDiagnosisRow[] => ([
  {
    id: 'pumping',
    title: '打气过程',
    status: 'insufficient-data',
    evidence: '当前没有可复盘的自由模式实验组。',
    recommendation: '完成 U0、U1、U2 记录后再查看过程诊断。',
  },
]);

const findTraceTrial = (
  traceStore: HeatCapacityFreeTraceStore,
  trial: HeatCapacityFreeTrial,
) => traceStore.traceTrials.find((candidate) => (
  candidate.id === trial.traceTrialId ||
  candidate.linkedTrialId === trial.id
)) ?? null;

const createTrialOptions = (
  trials: HeatCapacityFreeTrial[],
  traceStore: HeatCapacityFreeTraceStore,
): HeatCapacityProcessReviewTrialOption[] => trials.map((trial, index) => {
  const traceTrial = findTraceTrial(traceStore, trial);
  const branchCount = traceTrial?.branches.length ?? trial.branchCount;
  return {
    trialId: trial.id,
    traceTrialId: traceTrial?.id ?? trial.traceTrialId,
    trialIndex: index + 1,
    status: traceTrial
      ? trial.u0 && trial.u1 && trial.u2
        ? 'complete'
        : 'incomplete'
      : 'missing-trace',
    gamma: trial.correctedSignals?.gamma === undefined
      ? null
      : roundNumber(trial.correctedSignals.gamma, 3),
    retakeCount: Math.max(0, branchCount - 1),
  };
});

const selectTrial = (
  trials: HeatCapacityFreeTrial[],
  selectedTrialId?: string | null,
  trialIndex?: number,
) => {
  if (selectedTrialId) {
    const selectedIndex = trials.findIndex((trial) => trial.id === selectedTrialId);
    if (selectedIndex >= 0) {
      return { trial: trials[selectedIndex], index: selectedIndex };
    }
  }
  if (typeof trialIndex === 'number' && trialIndex >= 0 && trialIndex < trials.length) {
    return { trial: trials[trialIndex], index: trialIndex };
  }
  for (let index = trials.length - 1; index >= 0; index -= 1) {
    const trial = trials[index];
    if (trial.u0 && trial.u1 && trial.u2) {
      return { trial, index };
    }
  }
  const fallback = trials[trials.length - 1] ?? null;
  return fallback ? { trial: fallback, index: trials.length - 1 } : null;
};

const selectMainBranch = (
  traceTrial: HeatCapacityFreeTraceTrial,
) => (
  traceTrial.branches.find((branch) => branch.id === traceTrial.activeBranchId) ??
  traceTrial.branches.find((branch) => branch.status === 'main' && !branch.hiddenInDefaultChart) ??
  traceTrial.branches.find((branch) => !branch.hiddenInDefaultChart) ??
  traceTrial.branches[0] ??
  null
);

const findSampleForRecord = (
  traceTrial: HeatCapacityFreeTraceTrial,
  mainBranch: HeatCapacityFreeTraceBranch,
  record: HeatCapacityFreeRecord | null,
) => {
  if (!record?.traceSampleId) return null;
  const branch = traceTrial.branches.find((candidate) => candidate.id === record.traceBranchId) ?? mainBranch;
  return branch.samples.find((sample) => sample.id === record.traceSampleId) ?? null;
};

const getPressureSensitivity = (
  traceTrial: HeatCapacityFreeTraceTrial,
  trial: HeatCapacityFreeTrial,
) => (
  trial.correctedSignals?.pressureSensitivityMvPerKPa ??
  traceTrial.configSnapshot.sensor.pressureMvPerKPa
);

const getTemperatureSensitivity = (
  traceTrial: HeatCapacityFreeTraceTrial,
) => traceTrial.configSnapshot.sensor.temperatureMvPerK || 1;

const convertRecordValue = (
  record: HeatCapacityFreeRecord | null,
  u0: HeatCapacityFreeRecord | null,
  pressureSensitivityMvPerKPa: number,
  temperatureMvPerK: number,
): HeatCapacityProcessReviewRecordValue | null => {
  if (!record || !u0) return null;
  return {
    atS: roundNumber(record.atS, 2),
    displayPressureMv: roundNumber(record.displayPressureMv, 2),
    displayTemperatureMv: roundNumber(record.displayTemperatureMv, 2),
    pressureDeltaKPa: roundNumber((record.displayPressureMv - u0.displayPressureMv) / pressureSensitivityMvPerKPa, 2),
    temperatureDeltaK: roundNumber((record.displayTemperatureMv - u0.displayTemperatureMv) / temperatureMvPerK, 2),
  };
};

const calculateRelativeError = (
  gamma: number | null,
  theoreticalGamma: number,
) => (
  gamma !== null && Number.isFinite(gamma) && theoreticalGamma > 0
    ? roundNumber(Math.abs(gamma - theoreticalGamma) / theoreticalGamma * 100, 2)
    : null
);

const eventTime = (
  events: HeatCapacityFreeEvent[],
  type: HeatCapacityFreeEventType,
  predicate: (event: HeatCapacityFreeEvent) => boolean = () => true,
) => events.find((event) => event.type === type && predicate(event))?.atS ?? null;

const findEventAfter = (
  events: HeatCapacityFreeEvent[],
  type: HeatCapacityFreeEventType,
  afterS: number,
) => events.find((event) => event.type === type && event.atS >= afterS) ?? null;

const createStages = (
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
) => {
  const events = [...branch.events].sort((left, right) => left.atS - right.atS);
  const samples = [...branch.samples].sort((left, right) => left.atS - right.atS);
  const firstTime = samples[0]?.atS ?? 0;
  const lastTime = samples[samples.length - 1]?.atS ?? trial.u2?.atS ?? trial.u1?.atS ?? firstTime;
  const pumpEvents = events.filter((event) => event.type === 'pump-stroke');
  const pumpStart = eventTime(events, 'pump-valve-open') ?? pumpEvents[0]?.atS ?? trial.u0?.atS ?? firstTime;
  const pumpEnd = eventTime(events, 'pump-valve-close') ?? pumpEvents[pumpEvents.length - 1]?.atS ?? pumpStart;
  const releaseStartEvent = findEventAfter(events, 'stopcock-open', trial.u1?.atS ?? pumpEnd);
  const releaseStart = releaseStartEvent?.atS ?? trial.u1?.atS ?? pumpEnd;
  const releaseEnd = findEventAfter(events, 'stopcock-close', releaseStart)?.atS ?? releaseStart;
  const segments: HeatCapacityProcessStageSegment[] = [];
  const addSegment = (segment: HeatCapacityProcessStageSegment) => {
    if (segment.endS > segment.startS) {
      segments.push({
        ...segment,
        startS: roundNumber(segment.startS, 2),
        endS: roundNumber(segment.endS, 2),
      });
    }
  };

  addSegment({ id: 'zero', label: '调零', startS: firstTime, endS: pumpStart });
  addSegment({
    id: 'pump',
    label: '打气',
    startS: pumpStart,
    endS: pumpEnd,
    countText: pumpEvents.length > 0 ? `x${pumpEvents.length}` : undefined,
  });
  addSegment({ id: 'stabilize', label: '回温稳定', startS: pumpEnd, endS: releaseStart });
  addSegment({
    id: 'release',
    label: '开阀放气',
    startS: releaseStart,
    endS: releaseEnd,
    durationText: releaseEnd > releaseStart ? `${formatNumber(releaseEnd - releaseStart, 1)} s` : undefined,
  });
  addSegment({ id: 'recover', label: '关阀回温', startS: releaseEnd, endS: lastTime });
  return segments;
};

const controlEventTypeMap: Partial<Record<HeatCapacityFreeEventType, {
  kind: HeatCapacityProcessControlKind;
  label: string;
}>> = {
  'power-on': { kind: 'power', label: '开启电源' },
  'power-off': { kind: 'power', label: '关闭电源' },
  'pump-valve-open': { kind: 'pumpValve', label: '打开打气阀' },
  'pump-valve-close': { kind: 'pumpValve', label: '关闭打气阀' },
  'stopcock-open': { kind: 'stopcock', label: '打开玻璃旋塞' },
  'stopcock-close': { kind: 'stopcock', label: '关闭玻璃旋塞' },
};

const createControls = (
  branch: HeatCapacityFreeTraceBranch,
  stages: HeatCapacityProcessStageSegment[],
) => {
  const controls: HeatCapacityProcessControlEvent[] = branch.events.flatMap((event) => {
    if (event.type === 'pump-stroke') {
      return [{
        id: event.id,
        kind: 'pumpBulb',
        label: '打气球',
        timeS: roundNumber(event.atS, 2),
      }];
    }
    const mapped = controlEventTypeMap[event.type];
    return mapped
      ? [{
        id: event.id,
        kind: mapped.kind,
        label: mapped.label,
        timeS: roundNumber(event.atS, 2),
      }]
      : [];
  });
  const pumpEvents = branch.events.filter((event) => event.type === 'pump-stroke');
  const pumpStage = stages.find((stage) => stage.id === 'pump');
  if (pumpEvents.length > 0) {
    controls.push({
      id: 'pump-bulb-merged',
      kind: 'pumpBulb',
      label: `打气球 x${pumpEvents.length}`,
      timeS: roundNumber(
        pumpStage
          ? (pumpStage.startS + pumpStage.endS) / 2
          : (pumpEvents[0].atS + pumpEvents[pumpEvents.length - 1].atS) / 2,
        2,
      ),
      count: pumpEvents.length,
    });
  }
  return controls.sort((left, right) => left.timeS - right.timeS);
};

const systemEventMap: Partial<Record<HeatCapacityFreeEventType, {
  kind: HeatCapacityProcessSystemKind;
  label: string;
}>> = {
  'pressure-warning': { kind: 'warning', label: '预警' },
  'pressure-danger': { kind: 'danger', label: '报警' },
  'record-blocked': { kind: 'blocked', label: '拦截' },
  'record-invalidated': { kind: 'retake', label: '重录' },
  'branch-created': { kind: 'retake', label: '新分支' },
};

const createSystemEvents = (
  branch: HeatCapacityFreeTraceBranch,
) => branch.events.flatMap((event) => {
  const mapped = systemEventMap[event.type];
  return mapped
    ? [{
      id: event.id,
      kind: mapped.kind,
      label: mapped.label,
      timeS: roundNumber(event.atS, 2),
    }]
    : [];
});

const createRecordEvent = (
  id: HeatCapacityProcessRecordId,
  record: HeatCapacityFreeRecord | null,
  u0: HeatCapacityFreeRecord | null,
  pressureSensitivityMvPerKPa: number,
  temperatureMvPerK: number,
): HeatCapacityProcessRecordEvent | null => {
  const value = convertRecordValue(record, u0, pressureSensitivityMvPerKPa, temperatureMvPerK);
  if (!record || !value) return null;
  return {
    id,
    label: id.toUpperCase(),
    timeS: value.atS,
    signalMv: value.displayPressureMv,
    pressureDeltaKPa: value.pressureDeltaKPa,
    temperatureDeltaK: value.temperatureDeltaK,
    eventId: record.eventId,
    traceSampleId: record.traceSampleId,
  };
};

const createChartData = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  upperBound: HeatCapacityOperationUpperBound,
  theoreticalGamma: number,
): HeatCapacityProcessChartData => {
  const pressureSensitivity = getPressureSensitivity(traceTrial, trial);
  const temperatureSensitivity = getTemperatureSensitivity(traceTrial);
  const u0Pressure = trial.u0?.displayPressureMv ?? 0;
  const u0Temperature = trial.u0?.displayTemperatureMv ?? traceTrial.configSnapshot.sensor.temperatureMvAtAmbient;
  const trace = branch.samples.map((sample) => ({
    sampleId: sample.id,
    timeS: roundNumber(sample.atS, 2),
    pressureDeltaKPa: roundNumber((sample.sensor.displayPressureMv - u0Pressure) / pressureSensitivity, 3),
    temperatureDeltaK: roundNumber((sample.sensor.displayTemperatureMv - u0Temperature) / temperatureSensitivity, 3),
  }));
  const stages = createStages(branch, trial);
  const standardReference = createHeatCapacityStandardReference(traceTrial.configSnapshot);
  const referenceTrace = alignStandardReferenceToStages(standardReference, stages);
  const operableBestReference = createHeatCapacityOperableBestReference(
    traceTrial.configSnapshot,
    theoreticalGamma,
  );
  const operableBestTrace = alignStandardReferenceToStages(operableBestReference, stages);
  const records = [
    createRecordEvent('u0', trial.u0, trial.u0, pressureSensitivity, temperatureSensitivity),
    createRecordEvent('u1', trial.u1, trial.u0, pressureSensitivity, temperatureSensitivity),
    createRecordEvent('u2', trial.u2, trial.u0, pressureSensitivity, temperatureSensitivity),
  ].filter((record): record is HeatCapacityProcessRecordEvent => record !== null);

  return {
    stages,
    trace,
    records,
    controls: createControls(branch, stages),
    systemEvents: createSystemEvents(branch),
    referenceTrace,
    operableBestTrace,
    bestWindows: upperBound.windows,
  };
};

const createSummary = (
  trial: HeatCapacityFreeTrial,
  trialIndex: number,
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  theoreticalGamma: number,
  upperBound: HeatCapacityOperationUpperBound,
): HeatCapacityProcessReviewSummary => {
  const pressureSensitivity = getPressureSensitivity(traceTrial, trial);
  const temperatureSensitivity = getTemperatureSensitivity(traceTrial);
  const gamma = trial.correctedSignals?.gamma ?? null;
  const branchCount = Math.max(
    trial.branchCount,
    traceTrial.branches.length,
  );
  return {
    trialIndex: trialIndex + 1,
    trialId: trial.id,
    traceTrialId: traceTrial.id,
    branchId: branch.id,
    branchCount,
    retakeCount: Math.max(0, branchCount - 1),
    u1: convertRecordValue(trial.u1, trial.u0, pressureSensitivity, temperatureSensitivity),
    u2: convertRecordValue(trial.u2, trial.u0, pressureSensitivity, temperatureSensitivity),
    gamma: gamma === null ? null : roundNumber(gamma, 3),
    relativeErrorPercent: calculateRelativeError(gamma, theoreticalGamma),
    upperBoundGamma: upperBound.gamma === null ? null : roundNumber(upperBound.gamma, 3),
    upperBoundRelativeErrorPercent: upperBound.relativeErrorPercent,
    upperBoundGapPercent: upperBound.gapFromActualPercent,
  };
};

const sampleIsStableForRecord = (
  sample: HeatCapacityFreeTraceSample | null,
  traceTrial: HeatCapacityFreeTraceTrial,
) => (
  sample !== null &&
  sample.stability.pressureStable &&
  sample.stability.temperatureStable &&
  Math.abs(sample.sensor.pressureSlopeMvPerS) <= traceTrial.configSnapshot.record.pressureStableSlopeMvPerS &&
  Math.abs(sample.sensor.temperatureSlopeMvPerS) <= traceTrial.configSnapshot.record.temperatureStableSlopeMvPerS
);

const createPumpingDiagnosis = (
  branch: HeatCapacityFreeTraceBranch,
  summary: HeatCapacityProcessReviewSummary,
  traceTrial: HeatCapacityFreeTraceTrial,
): HeatCapacityProcessDiagnosisRow => {
  const pumpCount = branch.events.filter((event) => event.type === 'pump-stroke').length;
  const warningCount = branch.events.filter((event) => event.type === 'pressure-warning').length;
  const dangerCount = branch.events.filter((event) => event.type === 'pressure-danger').length;
  const minimumUsefulPressureKPa = traceTrial.configSnapshot.record.minimumUsefulU1CorrectedMv /
    traceTrial.configSnapshot.sensor.pressureMvPerKPa;
  if (!summary.u1 || pumpCount === 0) {
    return {
      id: 'pumping',
      title: '打气过程',
      status: 'insufficient-data',
      evidence: '没有找到有效打气事件或 U1 记录。',
      recommendation: '完成打气和 U1 记录后再判断打气质量。',
    };
  }
  if (summary.u1.pressureDeltaKPa < minimumUsefulPressureKPa || dangerCount > 0) {
    return {
      id: 'pumping',
      title: '打气过程',
      status: 'needs-improvement',
      evidence: `打气 ${pumpCount} 次，U1 压强差 ${formatNumber(summary.u1.pressureDeltaKPa, 2)} kPa。`,
      recommendation: dangerCount > 0
        ? '打气进入报警区，下一组应降低单次加压或提前停止。'
        : 'U1 压强差低于有效范围，下一组应继续打气到安全提示允许的有效区间。',
    };
  }
  if (warningCount > 0) {
    return {
      id: 'pumping',
      title: '打气过程',
      status: 'review',
      evidence: `打气 ${pumpCount} 次，U1 压强差 ${formatNumber(summary.u1.pressureDeltaKPa, 2)} kPa，出现 ${warningCount} 次预警。`,
      recommendation: '本组可审核，但打气末段应留意预警提示和记录有效区间的关系。',
    };
  }
  return {
    id: 'pumping',
    title: '打气过程',
    status: 'reasonable',
    evidence: `打气 ${pumpCount} 次，U1 压强差 ${formatNumber(summary.u1.pressureDeltaKPa, 2)} kPa。`,
    recommendation: '打气幅度处于可用范围，未发现压力安全事件。',
  };
};

const createReleaseDiagnosis = (
  branch: HeatCapacityFreeTraceBranch,
  summary: HeatCapacityProcessReviewSummary,
): HeatCapacityProcessDiagnosisRow => {
  const releaseStart = branch.events.find((event) => (
    event.type === 'stopcock-open' &&
    event.atS >= (summary.u1?.atS ?? 0)
  ));
  const releaseEnd = releaseStart
    ? branch.events.find((event) => event.type === 'stopcock-close' && event.atS >= releaseStart.atS)
    : null;
  if (!summary.u1 || !summary.u2 || !releaseStart || !releaseEnd) {
    return {
      id: 'release',
      title: '放气操作',
      status: 'insufficient-data',
      evidence: '缺少 U1、U2 或玻璃旋塞开闭事件。',
      recommendation: '需要完整记录放气开始、关闭和 U2 回温记录。',
    };
  }
  const durationS = releaseEnd.atS - releaseStart.atS;
  const ratio = summary.u1.pressureDeltaKPa > 0
    ? summary.u2.pressureDeltaKPa / summary.u1.pressureDeltaKPa
    : NaN;
  if (summary.u2.pressureDeltaKPa <= 0 || ratio < 0.08) {
    return {
      id: 'release',
      title: '放气操作',
      status: 'needs-improvement',
      evidence: `放气 ${formatNumber(durationS, 1)} s，U2/U1 = ${formatNumber(ratio, 2)}。`,
      recommendation: 'U2 过低，可能放气过度，下一组应更快关闭玻璃旋塞。',
    };
  }
  if (durationS < 0.25 || durationS > 2.5) {
    return {
      id: 'release',
      title: '放气操作',
      status: 'review',
      evidence: `放气 ${formatNumber(durationS, 1)} s，U2/U1 = ${formatNumber(ratio, 2)}。`,
      recommendation: '放气时长偏离常规范围，建议结合曲线拐点复核。',
    };
  }
  return {
    id: 'release',
    title: '放气操作',
    status: 'reasonable',
    evidence: `放气 ${formatNumber(durationS, 1)} s，U2/U1 = ${formatNumber(ratio, 2)}。`,
    recommendation: '放气动作和 U2 保留量可用于本组计算。',
  };
};

const createRecordingDiagnosis = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
): HeatCapacityProcessDiagnosisRow => {
  const u1Sample = findSampleForRecord(traceTrial, branch, trial.u1);
  const u2Sample = findSampleForRecord(traceTrial, branch, trial.u2);
  const blockedCount = branch.events.filter((event) => event.type === 'record-blocked').length;
  if (!u1Sample || !u2Sample) {
    return {
      id: 'recording',
      title: '记录时机',
      status: 'insufficient-data',
      evidence: 'U1 或 U2 缺少 trace 样本引用。',
      recommendation: '需要通过自由模式按钮完成记录，才能定位记录时机。',
    };
  }
  const stable = sampleIsStableForRecord(u1Sample, traceTrial) && sampleIsStableForRecord(u2Sample, traceTrial);
  if (!stable) {
    return {
      id: 'recording',
      title: '记录时机',
      status: 'needs-improvement',
      evidence: 'U1 或 U2 记录点仍存在明显压强/温度变化。',
      recommendation: '下一组应等待读数斜率进入稳定阈值后再记录。',
    };
  }
  if (blockedCount > 0) {
    return {
      id: 'recording',
      title: '记录时机',
      status: 'review',
      evidence: `记录前出现 ${blockedCount} 次系统拦截，最终 U1/U2 记录点已稳定。`,
      recommendation: '本组可审核，但应减少无效记录尝试。',
    };
  }
  return {
    id: 'recording',
    title: '记录时机',
    status: 'reasonable',
    evidence: 'U1 和 U2 记录点均满足压强/温度稳定阈值。',
    recommendation: '记录链路清晰，时机符合当前判据。',
  };
};

const createRetakeDiagnosis = (
  summary: HeatCapacityProcessReviewSummary,
): HeatCapacityProcessDiagnosisRow => (
  summary.retakeCount > 0
    ? {
      id: 'retake',
      title: '重录情况',
      status: 'retaken',
      evidence: `本组存在 ${summary.retakeCount} 条隐藏分支，主图仅显示当前主线。`,
      recommendation: '后续查看分支时可对比被退回操作，但默认计算只使用主线记录。',
    }
    : {
      id: 'retake',
      title: '重录情况',
      status: 'reasonable',
      evidence: '本组没有重录分支。',
      recommendation: '过程和结果来自同一条主线。',
    }
);

const diagnosisTitleByScoreId: Partial<Record<HeatCapacityProcessScoreItem['id'], string>> = {
  pumping: '打气过程',
  release: '放气操作',
  retake: '重录情况',
};

const scoreItemToDiagnosisRow = (
  item: HeatCapacityProcessScoreItem,
): HeatCapacityProcessDiagnosisRow => ({
  id: item.id as HeatCapacityProcessDiagnosisId,
  title: diagnosisTitleByScoreId[item.id] ?? item.label,
  status: item.status,
  evidence: item.evidence,
  relation: item.relation,
  recommendation: item.recommendation,
  score: item.score,
  maxScore: item.maxScore,
  details: item.details,
});

const trimDiagnosisPart = (part: string) => part.trim().replace(/[。；;.\s]+$/u, '');

const joinDiagnosisParts = (
  parts: Array<string | undefined>,
) => parts
  .map((part) => (part ? trimDiagnosisPart(part) : ''))
  .filter(Boolean)
  .join('；');

const joinActionableDiagnosisParts = (
  parts: Array<string | undefined>,
) => {
  const joined = parts
    .map((part) => (part ? trimDiagnosisPart(part) : ''))
    .filter((part) => part && part !== '无误')
    .join('；');
  return joined || '无误。';
};

const combineScoreItems = (
  id: HeatCapacityProcessDiagnosisId,
  title: string,
  items: HeatCapacityProcessScoreItem[],
): HeatCapacityProcessDiagnosisRow => {
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const maxScore = items.reduce((sum, item) => sum + item.maxScore, 0);
  const status = items.some((item) => item.status === 'needs-improvement')
    ? 'needs-improvement'
    : items.some((item) => item.status === 'review' || item.status === 'insufficient-data')
      ? 'review'
      : 'reasonable';
  const itemByScoreId = new Map(items.map((item) => [item.id, item]));
  if (id === 'recording') {
    const completeness = itemByScoreId.get('completeness');
    const zeroing = itemByScoreId.get('zeroing');
    const recording = itemByScoreId.get('recording');
    return {
      id,
      title,
      status,
      score,
      maxScore,
      details: items.flatMap((item) => item.details),
      evidence: joinDiagnosisParts([
        completeness?.evidence,
        zeroing?.evidence,
        recording?.evidence,
      ]),
      relation: joinActionableDiagnosisParts([
        zeroing?.relation,
        recording?.relation,
      ]),
      recommendation: joinActionableDiagnosisParts([
        completeness?.recommendation,
        zeroing?.recommendation,
        recording?.recommendation,
      ]),
    };
  }
  return {
    id,
    title,
    status,
    score,
    maxScore,
    details: items.flatMap((item) => item.details),
    evidence: joinDiagnosisParts(items.map((item) => item.evidence)),
    relation: joinDiagnosisParts(items.map((item) => item.relation)),
    recommendation: joinDiagnosisParts(items.map((item) => item.recommendation)),
  };
};

const createDiagnostics = (
  score: HeatCapacityProcessScore,
): HeatCapacityProcessDiagnosisRow[] => {
  const itemById = new Map(score.items.map((item) => [item.id, item]));
  const recordingItems = [
    itemById.get('completeness'),
    itemById.get('zeroing'),
    itemById.get('recording'),
  ].filter((item): item is HeatCapacityProcessScoreItem => item !== undefined);
  return [
    itemById.get('pumping'),
    itemById.get('release'),
    recordingItems.length > 0
      ? combineScoreItems('recording', '记录链路', recordingItems)
      : undefined,
    itemById.get('retake'),
  ]
    .filter((item): item is HeatCapacityProcessScoreItem | HeatCapacityProcessDiagnosisRow => item !== undefined)
    .map((item) => ('maxScore' in item && 'label' in item ? scoreItemToDiagnosisRow(item) : item));
};

export const selectHeatCapacityFreeProcessReview = ({
  trials,
  traceStore,
  theoreticalGamma = 1.4,
  trialIndex,
  selectedTrialId,
}: SelectHeatCapacityFreeProcessReviewOptions): HeatCapacityFreeProcessReview => {
  const trialOptions = createTrialOptions(trials, traceStore);
  const selected = selectTrial(trials, selectedTrialId, trialIndex);
  if (!selected) {
    return {
      status: 'empty',
      selectedTrialId: null,
      trialOptions,
      summary: null,
      chart: emptyChart(),
      diagnostics: createEmptyDiagnosis(),
      score: emptyScore(),
    };
  }

  const traceTrial = findTraceTrial(traceStore, selected.trial);
  if (!traceTrial) {
    return {
      status: 'missing-trace',
      selectedTrialId: selected.trial.id,
      trialOptions,
      summary: null,
      chart: emptyChart(),
      diagnostics: createEmptyDiagnosis(),
      score: emptyScore(),
    };
  }
  const branch = selectMainBranch(traceTrial);
  if (!branch) {
    return {
      status: 'missing-trace',
      selectedTrialId: selected.trial.id,
      trialOptions,
      summary: null,
      chart: emptyChart(),
      diagnostics: createEmptyDiagnosis(),
      score: emptyScore(),
    };
  }

  const upperBound = selectHeatCapacityBestRecordWindows(
    traceTrial,
    branch,
    selected.trial,
    theoreticalGamma,
  );
  const summary = createSummary(
    selected.trial,
    selected.index,
    traceTrial,
    branch,
    theoreticalGamma,
    upperBound,
  );
  const score = scoreHeatCapacityFreeProcess({
    traceTrial,
    branch,
    trial: selected.trial,
    summary,
    upperBound,
  });
  return {
    status: selected.trial.u0 && selected.trial.u1 && selected.trial.u2 ? 'ready' : 'incomplete',
    selectedTrialId: selected.trial.id,
    trialOptions,
    summary,
    chart: createChartData(traceTrial, branch, selected.trial, upperBound, theoreticalGamma),
    diagnostics: createDiagnostics(score),
    score,
  };
};
