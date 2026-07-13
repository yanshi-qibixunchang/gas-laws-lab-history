import type {
  HeatCapacityFreeRecord,
  HeatCapacityFreeTrial,
} from './heatCapacityFreeTrialModel.ts';
import {
  isHeatCapacityFreeTrialComplete,
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
  HeatCapacityOperationUpperBound,
  HeatCapacityProcessDiagnosisId,
  HeatCapacityProcessDiagnosisStatus,
  HeatCapacityProcessRecordId,
  HeatCapacityProcessReviewTrialOption,
  HeatCapacityProcessScore,
  HeatCapacityProcessScoreItem,
  HeatCapacityProcessScoreSubItem,
  HeatCapacityProcessStageSegment,
} from './heatCapacityFreeProcessReviewTypes.ts';
import {
  createHeatCapacityFreeStandardReference,
  type HeatCapacityFreeStandardReferenceSnapshot,
} from './heatCapacityFreeStandardReferenceModel.ts';
import {
  scoreHeatCapacityFreeProcess,
} from './heatCapacityFreeProcessScoringModel.ts';
import {
  getHeatCapacityFreeGasTypeGamma,
} from './heatCapacityGasTheory.ts';
import {
  calculateHeatCapacityRelativeErrorPercent,
} from './heatCapacityFreeProcessMetrics.ts';

export type {
  HeatCapacityProcessDiagnosisId,
  HeatCapacityProcessDiagnosisStatus,
  HeatCapacityProcessRecordId,
  HeatCapacityProcessReferencePoint,
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
  quickToggle?: boolean;
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
  actualTrace: HeatCapacityProcessTracePoint[];
  records: HeatCapacityProcessRecordEvent[];
  controls: HeatCapacityProcessControlEvent[];
  systemEvents: HeatCapacityProcessSystemEvent[];
  standardReference: HeatCapacityFreeStandardReferenceSnapshot | null;
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
  actualTrace: [],
  records: [],
  controls: [],
  systemEvents: [],
  standardReference: null,
});

const emptyScore = (): HeatCapacityProcessScore => ({
  total: null,
  maxScore: 100,
  items: [],
});

const roundNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const PROCESS_REVIEW_POST_U2_BUFFER_S = 6;
const PROCESS_REVIEW_POWER_OFF_GRACE_S = 30;
const DEFAULT_PROCESS_REVIEW_THEORETICAL_GAMMA = getHeatCapacityFreeGasTypeGamma('air');
const IDEAL_REVIEW_THEORETICAL_GAMMA = DEFAULT_PROCESS_REVIEW_THEORETICAL_GAMMA;

const formatNumber = (value: number, digits = 1) => (
  Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const createEmptyDiagnosis = (): HeatCapacityProcessDiagnosisRow[] => ([
  {
    id: 'pumping',
    title: '打气过程',
    status: 'insufficient-data',
    evidence: '当前没有可复盘的自由模式实验组。',
    recommendation: '完成 U1、U2 记录后再查看过程诊断。',
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
      ? isHeatCapacityFreeTrialComplete(trial)
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
    if (isHeatCapacityFreeTrialComplete(trial)) {
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
  baselinePressureMv: number,
  baselineTemperatureMv: number,
  pressureSensitivityMvPerKPa: number,
  temperatureMvPerK: number,
): HeatCapacityProcessReviewRecordValue | null => {
  if (!record) return null;
  return {
    atS: roundNumber(record.atS, 2),
    displayPressureMv: roundNumber(record.displayPressureMv, 2),
    displayTemperatureMv: roundNumber(record.displayTemperatureMv, 2),
    pressureDeltaKPa: roundNumber((record.displayPressureMv - baselinePressureMv) / pressureSensitivityMvPerKPa, 2),
    temperatureDeltaK: roundNumber((record.displayTemperatureMv - baselineTemperatureMv) / temperatureMvPerK, 2),
  };
};

const eventTime = (
  events: HeatCapacityFreeEvent[],
  type: HeatCapacityFreeEventType,
  predicate: (event: HeatCapacityFreeEvent) => boolean = () => true,
) => events.find((event) => event.type === type && predicate(event))?.atS ?? null;

const findEventAfter = (
  events: HeatCapacityFreeEvent[],
  type: HeatCapacityFreeEventType,
  afterS: number,
  predicate: (event: HeatCapacityFreeEvent) => boolean = () => true,
) => events.find((event) => event.type === type && event.atS >= afterS && predicate(event)) ?? null;

const findPressurePeakSampleTime = (
  samples: HeatCapacityFreeTraceSample[],
  startS: number,
  endS: number,
) => {
  const candidates = samples.filter((sample) => (
    sample.atS >= startS - 0.000001 &&
    sample.atS <= endS + 0.000001
  ));
  if (candidates.length === 0) return null;
  const peak = candidates.reduce((best, sample) => (
    sample.sensor.displayPressureMv > best.sensor.displayPressureMv ? sample : best
  ), candidates[0]);
  return peak.atS;
};

const getProcessReviewEndS = (
  events: HeatCapacityFreeEvent[],
  samples: HeatCapacityFreeTraceSample[],
  trial: HeatCapacityFreeTrial,
  firstTime: number,
) => {
  const lastSampleTime = samples[samples.length - 1]?.atS ?? firstTime;
  const completionBaseS = trial.u2?.atS ?? trial.u1?.atS ?? trial.u0?.atS ?? lastSampleTime;
  const powerOffEvent = findEventAfter(events, 'power-off', completionBaseS);
  if (
    powerOffEvent &&
    powerOffEvent.atS <= completionBaseS + PROCESS_REVIEW_POWER_OFF_GRACE_S
  ) {
    return Math.max(firstTime, powerOffEvent.atS);
  }
  return Math.max(firstTime, completionBaseS + PROCESS_REVIEW_POST_U2_BUFFER_S);
};

const createStages = (
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
) => {
  const events = [...branch.events].sort((left, right) => left.atS - right.atS);
  const samples = [...branch.samples].sort((left, right) => left.atS - right.atS);
  const firstTime = samples[0]?.atS ?? 0;
  const lastTime = getProcessReviewEndS(events, samples, trial, firstTime);
  const eventsInWindow = events.filter((event) => event.atS <= lastTime);
  const pumpEvents = eventsInWindow.filter((event) => event.type === 'pump-stroke');
  const firstPumpEvent = pumpEvents[0] ?? null;
  const lastPumpEvent = pumpEvents[pumpEvents.length - 1] ?? null;
  const pumpValveOpenTime = eventTime(eventsInWindow, 'pump-valve-open');
  const pumpStart = firstPumpEvent?.atS ?? pumpValveOpenTime ?? trial.u0?.atS ?? firstTime;
  const pumpValveCloseTime = eventTime(
    eventsInWindow,
    'pump-valve-close',
    (event) => event.atS >= pumpStart,
  );
  const nextStopcockOpenTime = eventTime(
    eventsInWindow,
    'stopcock-open',
    (event) => event.atS >= (lastPumpEvent?.atS ?? pumpStart),
  );
  const pumpPeakSearchEnd = pumpValveCloseTime ?? nextStopcockOpenTime ?? lastTime;
  const pumpEnd = lastPumpEvent
    ? findPressurePeakSampleTime(samples, lastPumpEvent.atS, pumpPeakSearchEnd) ?? lastPumpEvent.atS
    : pumpValveCloseTime ?? pumpStart;
  const releaseStartEvent = findEventAfter(eventsInWindow, 'release-start', pumpEnd);
  const releaseAttemptId = releaseStartEvent?.payload?.attemptId;
  const releaseCloseEvent = releaseStartEvent
    ? findEventAfter(eventsInWindow, 'stopcock-close', releaseStartEvent.atS, (event) => (
        releaseAttemptId === undefined || event.payload?.attemptId === releaseAttemptId
      ) && event.payload?.formedRelease !== false)
    : null;
  const releaseStart = releaseStartEvent?.atS ?? null;
  const releaseEnd = releaseStart === null
    ? null
    : releaseCloseEvent?.atS ?? lastTime;
  const segments: HeatCapacityProcessStageSegment[] = [];
  const addSegment = (segment: HeatCapacityProcessStageSegment) => {
    if (segment.endS > segment.startS) {
      segments.push({
        ...segment,
        startS: roundNumber(segment.startS, 3),
        endS: roundNumber(segment.endS, 3),
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
  addSegment({
    id: 'stabilize',
    label: '回温稳定',
    startS: pumpEnd,
    endS: releaseStart ?? lastTime,
  });
  if (releaseStart !== null && releaseEnd !== null) {
    addSegment({
      id: 'release',
      label: '开阀放气',
      startS: releaseStart,
      endS: releaseEnd,
      durationText: releaseEnd > releaseStart
        ? `${formatNumber(releaseEnd - releaseStart, 3)} s`
        : undefined,
    });
  }
  if (releaseCloseEvent && releaseEnd !== null) {
    addSegment({ id: 'recover', label: '关阀回温', startS: releaseEnd, endS: lastTime });
  }
  return segments;
};

const getStageWindow = (stages: HeatCapacityProcessStageSegment[]) => ({
  startS: Math.min(...stages.map((stage) => stage.startS)),
  endS: Math.max(...stages.map((stage) => stage.endS)),
});

const isWithinStageWindow = (
  timeS: number,
  stages: HeatCapacityProcessStageSegment[],
) => {
  if (stages.length === 0) return true;
  const { startS, endS } = getStageWindow(stages);
  return timeS >= startS - 0.000001 && timeS <= endS + 0.000001;
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
  const controls: HeatCapacityProcessControlEvent[] = branch.events
    .filter((event) => isWithinStageWindow(event.atS, stages))
    .flatMap<HeatCapacityProcessControlEvent>((event) => {
      if (event.type === 'pump-stroke') {
        return [{
          id: event.id,
          kind: 'pumpBulb',
          label: '打气球',
          timeS: roundNumber(event.atS, 3),
        }];
      }
      const mapped = controlEventTypeMap[event.type];
      return mapped
        ? [{
          id: event.id,
          kind: mapped.kind,
          label: event.type === 'stopcock-close' && event.payload?.quickToggle === true
            ? `${mapped.label}（快速开关，未形成实际放气）`
            : mapped.label,
          timeS: roundNumber(event.atS, 3),
          quickToggle: event.type === 'stopcock-close' && event.payload?.quickToggle === true,
        }]
        : [];
    });
  return controls.sort((left, right) => left.timeS - right.timeS);
};

const systemEventMap: Partial<Record<HeatCapacityFreeEventType, {
  kind: HeatCapacityProcessSystemKind;
  label: string;
}>> = {
  'pressure-warning': { kind: 'warning', label: '建议停止打气' },
  'pressure-danger': { kind: 'danger', label: '报警' },
  'record-blocked': { kind: 'blocked', label: '拦截' },
  'record-invalidated': { kind: 'retake', label: '重录' },
  'branch-created': { kind: 'retake', label: '新分支' },
};

const createSystemEvents = (
  branch: HeatCapacityFreeTraceBranch,
  stages: HeatCapacityProcessStageSegment[],
) => branch.events
  .filter((event) => isWithinStageWindow(event.atS, stages))
  .flatMap((event) => {
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
  baselinePressureMv: number,
  baselineTemperatureMv: number,
  pressureSensitivityMvPerKPa: number,
  temperatureMvPerK: number,
): HeatCapacityProcessRecordEvent | null => {
  const value = convertRecordValue(
    record,
    baselinePressureMv,
    baselineTemperatureMv,
    pressureSensitivityMvPerKPa,
    temperatureMvPerK,
  );
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
  standardReference: HeatCapacityFreeStandardReferenceSnapshot,
): HeatCapacityProcessChartData => {
  const pressureSensitivity = getPressureSensitivity(traceTrial, trial);
  const temperatureSensitivity = getTemperatureSensitivity(traceTrial);
  const u0Pressure = trial.u0?.displayPressureMv ?? 0;
  const u0Temperature = trial.u0?.displayTemperatureMv ?? traceTrial.configSnapshot.sensor.temperatureMvAtAmbient;
  const stages = createStages(branch, trial);
  const actualTrace = branch.samples.filter((sample) => isWithinStageWindow(sample.atS, stages)).map((sample) => ({
    sampleId: sample.id,
    timeS: roundNumber(sample.atS, 2),
    pressureDeltaKPa: roundNumber((sample.sensor.displayPressureMv - u0Pressure) / pressureSensitivity, 3),
    temperatureDeltaK: roundNumber((sample.sensor.displayTemperatureMv - u0Temperature) / temperatureSensitivity, 3),
  }));
  const records = [
    createRecordEvent(
      'u0',
      trial.u0,
      trial.u0?.displayPressureMv ?? 0,
      trial.u0?.displayTemperatureMv ?? u0Temperature,
      pressureSensitivity,
      temperatureSensitivity,
    ),
    createRecordEvent('u1', trial.u1, u0Pressure, u0Temperature, pressureSensitivity, temperatureSensitivity),
    createRecordEvent('u2', trial.u2, u0Pressure, u0Temperature, pressureSensitivity, temperatureSensitivity),
  ].filter((record): record is HeatCapacityProcessRecordEvent => record !== null);

  return {
    stages,
    actualTrace,
    records,
    controls: createControls(branch, stages),
    systemEvents: createSystemEvents(branch, stages),
    standardReference,
  };
};

const createReviewUpperBound = (
  trial: HeatCapacityFreeTrial,
  standardReference: HeatCapacityFreeStandardReferenceSnapshot,
  theoreticalGamma: number,
): HeatCapacityOperationUpperBound => {
  if (trial.parameterScheme !== 'ideal') {
    return standardReference.operationUpperBound;
  }
  const actualGamma = trial.correctedSignals?.gamma ?? null;
  return {
    gamma: theoreticalGamma,
    relativeErrorPercent: calculateHeatCapacityRelativeErrorPercent(theoreticalGamma, theoreticalGamma),
    gapFromActualPercent: actualGamma === null || theoreticalGamma === 0
      ? null
      : roundNumber(Math.abs(theoreticalGamma - actualGamma) / Math.abs(theoreticalGamma) * 100, 2),
    windows: standardReference.operationUpperBound.windows,
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
    u1: convertRecordValue(
      trial.u1,
      trial.u0?.displayPressureMv ?? 0,
      trial.u0?.displayTemperatureMv ?? traceTrial.configSnapshot.sensor.temperatureMvAtAmbient,
      pressureSensitivity,
      temperatureSensitivity,
    ),
    u2: convertRecordValue(
      trial.u2,
      trial.u0?.displayPressureMv ?? 0,
      trial.u0?.displayTemperatureMv ?? traceTrial.configSnapshot.sensor.temperatureMvAtAmbient,
      pressureSensitivity,
      temperatureSensitivity,
    ),
    gamma: gamma === null ? null : roundNumber(gamma, 3),
    relativeErrorPercent: calculateHeatCapacityRelativeErrorPercent(gamma, theoreticalGamma),
    upperBoundGamma: upperBound.gamma === null ? null : roundNumber(upperBound.gamma, 3),
    upperBoundRelativeErrorPercent: upperBound.relativeErrorPercent,
    upperBoundGapPercent: upperBound.gapFromActualPercent,
  };
};

const diagnosisTitleByScoreId: Partial<Record<HeatCapacityProcessScoreItem['id'], string>> = {
  pumping: '打气过程',
  release: '放气操作',
  recordChain: '记录链路',
  retake: '重录情况',
};

const scoreItemToDiagnosisRow = (
  item: HeatCapacityProcessScoreItem,
): HeatCapacityProcessDiagnosisRow => ({
  id: item.id === 'recordChain' ? 'recording' : item.id,
  title: diagnosisTitleByScoreId[item.id] ?? item.label,
  status: item.status,
  evidence: item.evidence,
  relation: item.relation,
  recommendation: item.recommendation,
  score: item.score,
  maxScore: item.maxScore,
  details: item.details,
});

const createDiagnostics = (
  score: HeatCapacityProcessScore,
): HeatCapacityProcessDiagnosisRow[] => {
  const itemById = new Map(score.items.map((item) => [item.id, item]));
  return [
    itemById.get('pumping'),
    itemById.get('release'),
    itemById.get('recordChain'),
    itemById.get('retake'),
  ]
    .filter((item): item is HeatCapacityProcessScoreItem => item !== undefined)
    .map((item) => scoreItemToDiagnosisRow(item));
};

export const selectHeatCapacityFreeProcessReview = ({
  trials,
  traceStore,
  theoreticalGamma = DEFAULT_PROCESS_REVIEW_THEORETICAL_GAMMA,
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

  const reviewTheoreticalGamma = selected.trial.parameterScheme === 'ideal'
    ? IDEAL_REVIEW_THEORETICAL_GAMMA
    : theoreticalGamma;
  const standardReference = selected.trial.standardReferenceSnapshot ?? createHeatCapacityFreeStandardReference({
    traceTrial,
    trial: selected.trial,
    theoreticalGamma: reviewTheoreticalGamma,
  });
  const upperBound = createReviewUpperBound(selected.trial, standardReference, reviewTheoreticalGamma);
  const summary = createSummary(
    selected.trial,
    selected.index,
    traceTrial,
    branch,
    reviewTheoreticalGamma,
    upperBound,
  );
  const score = scoreHeatCapacityFreeProcess({
    traceTrial,
    branch,
    trial: selected.trial,
    summary,
  });
  return {
    status: isHeatCapacityFreeTrialComplete(selected.trial) ? 'ready' : 'incomplete',
    selectedTrialId: selected.trial.id,
    trialOptions,
    summary,
    chart: createChartData(traceTrial, branch, selected.trial, standardReference),
    diagnostics: createDiagnostics(score),
    score,
  };
};
