import {
  getPistonOscillationReleaseAsymmetrySeverity,
} from '../../domain/pistonOscillation/pistonOscillationReleaseAsymmetryModel.ts';
import type {
  PistonOscillationDataProcessingSession,
  PistonOscillationPeriodRunState,
  PistonOscillationRawMeasurementRecord,
} from '../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import type {
  PistonOscillationFreeAuditEvent,
  PistonOscillationFreeSession,
} from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import type { PistonOscillationLanguage } from '../pistonOscillation/pistonOscillationCopy.ts';
import type {
  ExperimentProcessReviewChartPoint,
  ExperimentProcessReviewEvent,
  ExperimentProcessReviewEventDetail,
  ExperimentProcessReviewOption,
  ExperimentProcessReviewScoreRow,
  ExperimentProcessReviewStage,
  ExperimentProcessReviewTimelineCategory,
  ExperimentProcessReviewTone,
  ExperimentProcessReviewViewModel,
} from './ExperimentProcessReviewPanel.tsx';

const MAX_RENDERED_PRESSURE_POINTS = 720;
const HEIGHT_CONFIRMATION_TOLERANCE_MM = 0.25;

const tr = (
  language: PistonOscillationLanguage,
  simplified: string,
  traditional: string,
  english: string,
) => language === 'en' ? english : language === 'zh-TW' ? traditional : simplified;

const finiteNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const formatNumber = (value: number | null, digits: number, fallback = '--') => (
  value === null ? fallback : value.toFixed(digits)
);

const getRecordPeakPressureKpa = (record: PistonOscillationRawMeasurementRecord) => (
  record.samples.reduce((maximum, sample) => (
    Math.max(maximum, sample.absolutePressureKpa)
  ), Number.NEGATIVE_INFINITY)
);

const downsampleChartPoints = (
  samples: readonly { timeS: number; absolutePressureKpa: number }[],
): ExperimentProcessReviewChartPoint[] => {
  if (samples.length <= MAX_RENDERED_PRESSURE_POINTS) {
    return samples.map((sample) => ({ x: sample.timeS, y: sample.absolutePressureKpa }));
  }
  const stride = Math.ceil(samples.length / MAX_RENDERED_PRESSURE_POINTS);
  const points = samples
    .filter((_, index) => index % stride === 0)
    .map((sample) => ({ x: sample.timeS, y: sample.absolutePressureKpa }));
  const last = samples.at(-1);
  if (last && points.at(-1)?.x !== last.timeS) {
    points.push({ x: last.timeS, y: last.absolutePressureKpa });
  }
  return points;
};

const getMedian = (values: readonly number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
};

const getRunCyclePeriodsMs = (
  session: PistonOscillationFreeSession,
  run: PistonOscillationPeriodRunState,
) => {
  const eligibility = session.primaryCycleEligibilityByRecordId[run.rawMeasurementRecordId];
  const extrema = run.selection?.extrema.length
    ? run.selection.extrema
    : eligibility?.primaryExtrema ?? [];
  const periods: Array<{ completedAtS: number; periodMs: number }> = [];
  for (let index = 0; index + 2 < extrema.length; index += 1) {
    const first = extrema[index]!;
    const nextSamePhase = extrema[index + 2]!;
    if (first.type !== nextSamePhase.type) continue;
    const periodMs = (nextSamePhase.timeS - first.timeS) * 1_000;
    if (Number.isFinite(periodMs) && periodMs > 0) {
      periods.push({ completedAtS: nextSamePhase.timeS, periodMs });
    }
  }
  if (periods.length === 0 && run.result?.periodS) {
    periods.push({ completedAtS: run.result.t2S, periodMs: run.result.periodS * 1_000 });
  }
  return periods
    .sort((first, second) => first.completedAtS - second.completedAtS)
    .map((period, index) => ({ x: index + 1, y: period.periodMs }));
};

const getCycleMaximumRelativeDeviation = (
  points: readonly ExperimentProcessReviewChartPoint[],
) => {
  const median = getMedian(points.map((point) => point.y));
  if (median === null || median <= 0) return 0;
  return points.reduce((maximum, point) => (
    Math.max(maximum, Math.abs(point.y - median) / median)
  ), 0);
};

const getAuditRunIndex = (
  event: PistonOscillationFreeAuditEvent,
  audit: readonly PistonOscillationFreeAuditEvent[],
  runCount: number,
) => {
  if (event.measurementIndex !== null) {
    return Math.min(runCount - 1, Math.max(0, event.measurementIndex));
  }
  const savedBefore = audit.filter((candidate) => (
    candidate.type === 'measurement-saved'
    && (
      candidate.occurredAtMs < event.occurredAtMs
      || (
        candidate.occurredAtMs === event.occurredAtMs
        && candidate.sequence < event.sequence
      )
    )
  )).length;
  return Math.min(runCount - 1, Math.max(0, savedBefore));
};

interface TimelineDraft {
  id: string;
  occurredAtMs: number;
  sortBias: number;
  label: string;
  detail: string;
  category: ExperimentProcessReviewTimelineCategory;
  kind?: ExperimentProcessReviewEvent['kind'];
  tone?: ExperimentProcessReviewTone;
  details: ExperimentProcessReviewEventDetail[];
  role?: 'press' | 'release';
}

const createReleaseDrafts = (options: {
  id: string;
  occurredAtMs: number;
  signedReleaseGapS: number | null;
  releaseOrder: string | null;
  peakPressureKpa: number | null;
  triggerThresholdKpa: number | null;
  recordResult: string;
  language: PistonOscillationLanguage;
}): TimelineDraft[] => {
  const { language } = options;
  const gapMs = options.signedReleaseGapS === null
    ? null
    : Math.round(Math.abs(options.signedReleaseGapS) * 1_000);
  const releaseOrder = options.releaseOrder === 'space-first'
    ? tr(language, '左手先松', '左手先鬆', 'left hand first')
    : options.releaseOrder === 'mouse-first'
      ? tr(language, '右手先松', '右手先鬆', 'right hand first')
      : options.releaseOrder === 'simultaneous'
        ? tr(language, '近乎同时', '近乎同時', 'nearly simultaneous')
        : tr(language, '先后未知', '先後未知', 'order unavailable');
  const pressureValue = options.peakPressureKpa === null
    ? '--'
    : `${options.peakPressureKpa.toFixed(1)} kPa`;
  return [
    {
      id: `${options.id}:press`,
      occurredAtMs: options.occurredAtMs,
      sortBias: -1,
      label: tr(language, '按压', '按壓', 'Press'),
      detail: tr(language, '双手完成一次实际按压', '雙手完成一次實際按壓', 'A two-hand press was completed'),
      category: 'press',
      details: [
        { label: tr(language, '监测峰值', '監測峰值', 'Peak'), value: pressureValue },
        { label: tr(language, '记录结果', '記錄結果', 'Recording'), value: options.recordResult },
      ],
      role: 'press',
    },
    {
      id: `${options.id}:release`,
      occurredAtMs: options.occurredAtMs,
      sortBias: 0,
      label: tr(language, '双手释放', '雙手釋放', 'Two-hand release'),
      detail: tr(language, '本次按压后的双手离开', '本次按壓後的雙手離開', 'The two hands left after this press'),
      category: 'press',
      tone: options.signedReleaseGapS !== null
        && getPistonOscillationReleaseAsymmetrySeverity(options.signedReleaseGapS) > 0
        ? 'attention'
        : 'good',
      details: [
        { label: tr(language, '松手先后', '鬆手先後', 'Release order'), value: releaseOrder },
        { label: tr(language, '时间差', '時間差', 'Time gap'), value: gapMs === null ? '--' : `${gapMs} ms` },
      ],
      role: 'release',
    },
  ];
};

const createOperationDrafts = (
  event: PistonOscillationFreeAuditEvent,
  language: PistonOscillationLanguage,
  triggerThresholdKpa: number | null,
): TimelineDraft[] => {
  const operation = event.operation;
  if (!operation) return [];
  const heightMm = finiteNumber(
    event.payload.confirmedHeightMm
      ?? event.payload.equilibriumHeightMm
      ?? event.payload.heightMm,
  );
  const common = {
    id: event.eventId,
    occurredAtMs: event.occurredAtMs,
    sortBias: 0,
  };
  if (operation === 'releasePiston') {
    const peakPressureKpa = finiteNumber(event.payload.peakPressureKpa);
    const triggered = peakPressureKpa !== null
      && triggerThresholdKpa !== null
      && peakPressureKpa >= triggerThresholdKpa;
    return createReleaseDrafts({
      ...common,
      signedReleaseGapS: finiteNumber(event.payload.signedReleaseGapS),
      releaseOrder: typeof event.payload.releaseOrder === 'string'
        ? event.payload.releaseOrder
        : null,
      peakPressureKpa,
      triggerThresholdKpa,
      recordResult: triggered
        ? tr(language, '达到触发区，等待采集判定', '達到觸發區，等待採集判定', 'Reached the trigger region')
        : tr(language, '未达到触发线，不生成正式曲线', '未達到觸發線，不產生正式曲線', 'Below the trigger; no formal curve'),
      language,
    });
  }
  const operationMap: Partial<Record<typeof operation, Omit<TimelineDraft, keyof typeof common>>> = {
    confirmHeight: {
      label: tr(language, '确认高度', '確認高度', 'Confirm height'),
      detail: tr(language, '确认当前刻度并进入锁紧步骤', '確認目前刻度並進入鎖緊步驟', 'Confirmed the current scale reading'),
      category: 'height',
      details: [{ label: tr(language, '实际读数', '實際讀值', 'Reading'), value: heightMm === null ? '--' : `${heightMm.toFixed(1)} mm` }],
    },
    tightenScrew: {
      label: tr(language, '旋紧螺钉', '旋緊螺釘', 'Tighten screw'),
      detail: tr(language, '锁紧平台高度', '鎖緊平台高度', 'Locked the platform height'),
      category: 'height',
      details: [{ label: tr(language, '锁定高度', '鎖定高度', 'Locked height'), value: heightMm === null ? '--' : `${heightMm.toFixed(1)} mm` }],
    },
    loosenScrew: {
      label: tr(language, '旋松螺钉', '旋鬆螺釘', 'Loosen screw'),
      detail: tr(language, '解除锁紧并恢复加载平衡', '解除鎖緊並恢復載入平衡', 'Released the lock for loaded equilibrium'),
      category: 'height',
      details: [{ label: tr(language, '平台状态', '平台狀態', 'Platform'), value: tr(language, '锁紧已解除', '鎖緊已解除', 'Lock released') }],
    },
    disconnectHose: {
      label: tr(language, '断开软管', '斷開軟管', 'Disconnect hose'),
      detail: tr(language, '解除压力传感器气路连接', '解除壓力感測器氣路連接', 'Disconnected the pressure-sensor hose'),
      category: 'pneumatic',
      details: [{
        label: tr(language, '手部支撑', '手部支撐', 'Hand support'),
        value: event.payload.leftHandSupporting === true || event.payload.rightHandSupporting === true
          ? tr(language, '有支撑', '有支撐', 'supported')
          : tr(language, '未支撑', '未支撐', 'unsupported'),
      }],
    },
    reconnectHose: {
      label: tr(language, '接通软管', '接通軟管', 'Reconnect hose'),
      detail: tr(language, '恢复密封气路连接', '恢復密封氣路連接', 'Restored the sealed air path'),
      category: 'pneumatic',
      details: [{ label: tr(language, '连接结果', '連接結果', 'Connection'), value: tr(language, '卡口已锁止', '卡口已鎖止', 'connector latched') }],
    },
    startAcquisition: {
      label: tr(language, '启动采集', '啟動採集', 'Start acquisition'),
      detail: tr(language, '进入下降触发等待状态', '進入下降觸發等待狀態', 'Armed the falling-edge trigger'),
      category: 'acquisition',
      details: [{ label: tr(language, '状态', '狀態', 'State'), value: tr(language, '等待触发', '等待觸發', 'armed') }],
    },
    redoAcquisition: {
      label: tr(language, '重置', '重設', 'Reset'),
      detail: tr(language, '放弃当前候选曲线并重新采集', '放棄目前候選曲線並重新採集', 'Discarded the candidate and reacquired'),
      category: 'system',
      kind: 'system',
      details: [{ label: tr(language, '重置原因', '重設原因', 'Reason'), value: String(event.payload.reason ?? tr(language, '主动重测', '主動重測', 'manual reacquisition')) }],
    },
    bottomImpact: {
      label: tr(language, '活塞触底', '活塞觸底', 'Piston bottom impact'),
      detail: tr(language, '平台自由下坠并碰撞底部平面', '平台自由下墜並碰撞底部平面', 'The unsupported platform struck the bottom'),
      category: 'system',
      kind: 'system',
      tone: 'risk',
      details: [{
        label: tr(language, '下坠高度', '下墜高度', 'Drop distance'),
        value: finiteNumber(event.payload.dropDistanceMm) === null
          ? '--'
          : `${finiteNumber(event.payload.dropDistanceMm)!.toFixed(1)} mm`,
      }],
    },
  };
  const mapped = operationMap[operation];
  return mapped ? [{ ...common, ...mapped }] : [];
};

const createTimelineEvents = (options: {
  session: PistonOscillationFreeSession;
  processing: PistonOscillationDataProcessingSession;
  run: PistonOscillationPeriodRunState;
  record: PistonOscillationRawMeasurementRecord;
  runIndex: number;
  language: PistonOscillationLanguage;
}): ExperimentProcessReviewEvent[] => {
  const { session, processing, run, record, runIndex, language } = options;
  const runCount = processing.runs.length;
  const relevantAudit = session.audit.filter((event) => (
    getAuditRunIndex(event, session.audit, runCount) === runIndex
  ));
  const drafts: TimelineDraft[] = [];
  for (const event of relevantAudit) {
    if (event.type === 'power-changed') {
      const powerOn = event.payload.powerOn === true;
      drafts.push({
        id: event.eventId,
        occurredAtMs: event.occurredAtMs,
        sortBias: 0,
        label: powerOn
          ? tr(language, '开启电源', '開啟電源', 'Power on')
          : tr(language, '关闭电源', '關閉電源', 'Power off'),
        detail: powerOn
          ? tr(language, '仪器进入实时监测状态', '儀器進入即時監測狀態', 'The instrument entered monitoring')
          : tr(language, '本轮实验结束后关闭仪器', '本輪實驗結束後關閉儀器', 'The instrument was powered off'),
        category: 'power',
        details: [{ label: tr(language, '状态', '狀態', 'State'), value: powerOn ? 'ON' : 'OFF' }],
      });
    } else if (event.type === 'acquisition-setting-changed') {
      const field = event.payload.field;
      const value = finiteNumber(event.payload.value);
      drafts.push({
        id: event.eventId,
        occurredAtMs: event.occurredAtMs,
        sortBias: 0,
        label: field === 'sampleRateHz'
          ? tr(language, '设置采样率', '設定取樣率', 'Set sample rate')
          : tr(language, '设置触发线', '設定觸發線', 'Set trigger'),
        detail: tr(language, '保存当前采集参数', '儲存目前採集參數', 'Saved the acquisition setting'),
        category: 'acquisition',
        details: [{
          label: field === 'sampleRateHz'
            ? tr(language, '采样率', '取樣率', 'Sample rate')
            : tr(language, '触发线', '觸發線', 'Trigger'),
          value: value === null ? '--' : field === 'sampleRateHz' ? `${value} Hz` : `${value.toFixed(1)} kPa`,
        }],
      });
    } else if (event.type === 'operation-observed') {
      drafts.push(...createOperationDrafts(
        event,
        language,
        record.acquisitionSettings.triggerThresholdKpa,
      ));
    } else if (event.type === 'acquisition-excluded') {
      drafts.push({
        id: event.eventId,
        occurredAtMs: event.occurredAtMs,
        sortBias: 1,
        label: tr(language, '重置', '重設', 'Reset'),
        detail: tr(language, '当前触发曲线未进入正式结果', '目前觸發曲線未進入正式結果', 'The candidate curve was excluded'),
        category: 'system',
        kind: 'system',
        details: [{ label: tr(language, '重置原因', '重設原因', 'Reason'), value: String(event.payload.reason ?? 'redo') }],
      });
    } else if (event.type === 'measurement-saved') {
      drafts.push({
        id: event.eventId,
        occurredAtMs: event.occurredAtMs,
        sortBias: 2,
        label: tr(language, '保存曲线', '儲存曲線', 'Save curve'),
        detail: tr(language, '当前曲线作为本次正式数据保存', '目前曲線作為本次正式資料儲存', 'Saved as the formal curve for this run'),
        category: 'acquisition',
        kind: 'record',
        tone: 'good',
        details: [
          { label: tr(language, '正式样本', '正式樣本', 'Samples'), value: `${record.samples.length}` },
          { label: tr(language, '记录状态', '記錄狀態', 'State'), value: tr(language, '已保存', '已儲存', 'saved') },
        ],
      });
    }
  }

  const releaseAuditCount = relevantAudit.filter((event) => (
    event.type === 'operation-observed' && event.operation === 'releasePiston'
  )).length;
  const storedAttempts = [
    ...session.excludedAttempts
      .filter((attempt) => attempt.measurementIndex === run.measurementIndex)
      .map((attempt) => ({
        id: attempt.attemptId,
        occurredAtMs: attempt.measurement.capturedAtMs,
        record: attempt.measurement,
        result: tr(language, '已触发，随后重置', '已觸發，隨後重設', 'Triggered, then reset'),
      })),
    {
      id: record.recordId,
      occurredAtMs: record.capturedAtMs,
      record,
      result: tr(language, '正式触发并保存', '正式觸發並儲存', 'Formal trigger and save'),
    },
  ].sort((first, second) => first.occurredAtMs - second.occurredAtMs);
  for (const attempt of storedAttempts.slice(releaseAuditCount)) {
    drafts.push(...createReleaseDrafts({
      id: `stored:${attempt.id}`,
      occurredAtMs: attempt.occurredAtMs,
      signedReleaseGapS: attempt.record.pressOperationEvidence.signedReleaseGapS,
      releaseOrder: attempt.record.pressOperationEvidence.releaseOrder,
      peakPressureKpa: getRecordPeakPressureKpa(attempt.record),
      triggerThresholdKpa: attempt.record.acquisitionSettings.triggerThresholdKpa,
      recordResult: attempt.result,
      language,
    }));
  }
  if (!drafts.some((draft) => draft.kind === 'record')) {
    drafts.push({
      id: `stored-save:${record.recordId}`,
      occurredAtMs: record.capturedAtMs + 1,
      sortBias: 2,
      label: tr(language, '保存曲线', '儲存曲線', 'Save curve'),
      detail: tr(language, '正式曲线已保存在本次实验中', '正式曲線已儲存在本次實驗中', 'The formal curve was saved'),
      category: 'acquisition',
      kind: 'record',
      tone: 'good',
      details: [{ label: tr(language, '正式样本', '正式樣本', 'Samples'), value: `${record.samples.length}` }],
    });
  }

  drafts.sort((first, second) => (
    first.occurredAtMs - second.occurredAtMs || first.sortBias - second.sortBias
  ));
  let pressCount = 0;
  let releaseCount = 0;
  const count = drafts.length;
  return drafts.map((draft, index) => {
    if (draft.role === 'press') pressCount += 1;
    if (draft.role === 'release') releaseCount += 1;
    const numberedLabel = draft.role === 'press'
      ? `${draft.label} ${pressCount}`
      : draft.role === 'release'
        ? `${draft.label} ${releaseCount}`
        : draft.label;
    return {
      id: draft.id,
      label: numberedLabel,
      detail: draft.detail,
      position: count <= 1 ? 0.5 : 0.03 + index / (count - 1) * 0.94,
      category: draft.category,
      kind: draft.kind,
      lane: index % 2 === 0 ? 'upper' : 'lower',
      row: index % 4 >= 2 ? 1 : 0,
      tone: draft.tone,
      details: draft.details,
    };
  });
};

const createStages = (
  runIndex: number,
  targetHeightMm: number,
  confirmedHeightMm: number,
  releaseGapMs: number | null,
  language: PistonOscillationLanguage,
): ExperimentProcessReviewStage[] => runIndex === 0 ? [
  { id: 'height', title: tr(language, `托住并调至 ${targetHeightMm} mm`, `托住並調至 ${targetHeightMm} mm`, `Support and set ${targetHeightMm} mm`), detail: tr(language, '从排空气路的初始状态建立第一高度', '從排空氣路的初始狀態建立第一高度', 'Establish the first height from the vented state'), category: 'height', weight: 1.2 },
  { id: 'lock', title: tr(language, '旋紧锁紧螺钉', '旋緊鎖緊螺釘', 'Tighten locking screw'), detail: `${confirmedHeightMm.toFixed(1)} mm`, category: 'height', weight: 0.72 },
  { id: 'connect', title: tr(language, '接通软管', '接通軟管', 'Connect hose'), detail: tr(language, '卡口对齐并锁止', '卡口對齊並鎖止', 'Align and latch the connector'), category: 'pneumatic', weight: 0.82 },
  { id: 'settle', title: tr(language, '旋松并等待平衡', '旋鬆並等待平衡', 'Loosen and settle'), detail: tr(language, '恢复加载平衡', '恢復載入平衡', 'Reach loaded equilibrium'), category: 'height', weight: 0.92 },
  { id: 'press', title: tr(language, '双手按压与释放', '雙手按壓與釋放', 'Press and release'), detail: releaseGapMs === null ? '--' : `${releaseGapMs} ms`, category: 'press', weight: 1.2 },
  { id: 'record', title: tr(language, '采集与保存', '採集與儲存', 'Acquire and save'), detail: tr(language, '保留正式压力曲线', '保留正式壓力曲線', 'Retain the formal pressure curve'), category: 'acquisition', weight: 1 },
] : [
  { id: 'stop', title: tr(language, '等待平台静止', '等待平台靜止', 'Wait for rest'), detail: tr(language, '上一条记录结束后再切换高度', '上一條記錄結束後再切換高度', 'Change height after the previous run'), category: 'acquisition', weight: 0.72 },
  { id: 'disconnect', title: tr(language, '托住并断开软管', '托住並斷開軟管', 'Support and disconnect'), detail: tr(language, '断管时保持平台受支撑', '斷管時保持平台受支撐', 'Keep the platform supported'), category: 'pneumatic', weight: 0.96 },
  { id: 'height', title: tr(language, `调至 ${targetHeightMm} mm 并旋紧`, `調至 ${targetHeightMm} mm 並旋緊`, `Set ${targetHeightMm} mm and lock`), detail: `${confirmedHeightMm.toFixed(1)} mm`, category: 'height', weight: 1.12 },
  { id: 'connect', title: tr(language, '重新接通软管', '重新接通軟管', 'Reconnect hose'), detail: tr(language, '恢复密封气路', '恢復密封氣路', 'Restore the sealed air path'), category: 'pneumatic', weight: 0.82 },
  { id: 'settle', title: tr(language, '旋松并等待平衡', '旋鬆並等待平衡', 'Loosen and settle'), detail: tr(language, '进入本高度加载平衡', '進入本高度載入平衡', 'Reach loaded equilibrium'), category: 'height', weight: 0.84 },
  { id: 'press', title: tr(language, '双手按压与释放', '雙手按壓與釋放', 'Press and release'), detail: releaseGapMs === null ? '--' : `${releaseGapMs} ms`, category: 'press', weight: 1.2 },
  { id: 'record', title: tr(language, '采集与保存', '採集與儲存', 'Acquire and save'), detail: tr(language, '保留正式压力曲线', '保留正式壓力曲線', 'Retain the formal pressure curve'), category: 'acquisition', weight: 1 },
];

interface RunScoreContext {
  setupScore: number;
  excitationScore: number;
  selectionScore: number;
  evidenceScore: number;
  operationScore: number;
  releaseGapMs: number | null;
  releaseSeverity: number;
  heightDeviationMm: number;
  cycleDeviation: number;
  wrongPeriodBatches: number;
  periodAnswerRevealed: boolean;
  touchdown: boolean;
  selectedForFit: boolean;
  heightDeduction: number;
  releaseDeduction: number;
  cycleDeduction: number;
  wrongPeriodDeduction: number;
  periodAnswerDeduction: number;
  selectionIssueDeduction: number;
  fitDeduction: number;
}

interface CalculationScoreContext {
  score: number;
  wrongBatches: number;
  wrongBatchDeduction: number;
  revealedAnswers: number;
  revealedAnswerDeduction: number;
  calculationChainScore: number;
}

const createRunScoreContext = (
  session: PistonOscillationFreeSession,
  processing: PistonOscillationDataProcessingSession,
  run: PistonOscillationPeriodRunState,
  record: PistonOscillationRawMeasurementRecord,
) => {
  const heightDeviationMm = Math.abs(record.confirmedHeightMm - run.targetHeightMm);
  const touchdown = session.audit.some((event) => (
    event.type === 'operation-observed'
    && event.operation === 'bottomImpact'
    && event.measurementIndex === run.measurementIndex
  ));
  const heightDeduction = heightDeviationMm <= HEIGHT_CONFIRMATION_TOLERANCE_MM
    ? 0
    : Math.min(4, Math.ceil(
      (heightDeviationMm - HEIGHT_CONFIRMATION_TOLERANCE_MM)
      / HEIGHT_CONFIRMATION_TOLERANCE_MM,
    ));
  const setupScore = Math.max(0, 15 - heightDeduction - (touchdown ? 8 : 0));
  const signedReleaseGapS = record.pressOperationEvidence.signedReleaseGapS;
  const releaseSeverity = getPistonOscillationReleaseAsymmetrySeverity(signedReleaseGapS);
  const releaseGapMs = signedReleaseGapS === null
    ? null
    : Math.round(Math.abs(signedReleaseGapS) * 1_000);
  const releaseDeduction = Math.round(releaseSeverity * 5);
  const excitationScore = Math.max(0, 25 - releaseDeduction);
  const cyclePeriods = getRunCyclePeriodsMs(session, run);
  const cycleDeviation = getCycleMaximumRelativeDeviation(cyclePeriods);
  const wrongPeriodBatches = run.batchAttempts.filter((attempt) => !attempt.allCorrect).length;
  const periodAnswerRevealed = Object.values(run.answers).some((answer) => (
    answer.resolution === 'revealed-after-attempt'
    || answer.resolution === 'revealed-without-valid-attempt'
  ));
  const cycleDeduction = cycleDeviation <= 0.02
    ? 0
    : Math.min(6, Math.ceil((cycleDeviation - 0.02) * 100));
  const wrongPeriodDeduction = Math.min(6, wrongPeriodBatches * 2);
  const periodAnswerDeduction = periodAnswerRevealed ? 3 : 0;
  const selectionIssueDeduction = run.selection?.issue ? 4 : 0;
  const selectedForFit = processing.linearFitResult?.selectedRunIndices.includes(
    run.measurementIndex,
  ) ?? false;
  const fitDeduction = selectedForFit ? 0 : 3;
  const selectionScore = Math.max(
    0,
    30
      - cycleDeduction
      - wrongPeriodDeduction
      - periodAnswerDeduction
      - selectionIssueDeduction
      - fitDeduction,
  );
  const evidenceScore = record.samples.length > 0 ? 5 : 0;
  return {
    setupScore,
    excitationScore,
    selectionScore,
    evidenceScore,
    operationScore: setupScore + excitationScore + selectionScore + evidenceScore,
    releaseGapMs,
    releaseSeverity,
    heightDeviationMm,
    cycleDeviation,
    wrongPeriodBatches,
    periodAnswerRevealed,
    touchdown,
    selectedForFit,
    heightDeduction,
    releaseDeduction,
    cycleDeduction,
    wrongPeriodDeduction,
    periodAnswerDeduction,
    selectionIssueDeduction,
    fitDeduction,
  } satisfies RunScoreContext;
};

const getCalculationScoreContext = (
  processing: PistonOscillationDataProcessingSession,
): CalculationScoreContext => {
  const calculation = processing.calculationSession;
  if (!calculation) return {
    score: 0,
    wrongBatches: 0,
    wrongBatchDeduction: 8,
    revealedAnswers: 0,
    revealedAnswerDeduction: 9,
    calculationChainScore: 0,
  };
  const wrongBatches = calculation.batchAttempts.filter((attempt) => !attempt.allCorrect).length;
  const revealedAnswers = Object.values(calculation.answers).filter((answer) => (
    answer.resolution === 'revealed-after-attempt'
    || answer.resolution === 'revealed-without-valid-attempt'
  )).length;
  const wrongBatchDeduction = Math.min(8, wrongBatches * 2);
  const revealedAnswerDeduction = Math.min(9, revealedAnswers * 3);
  const calculationChainScore = 8;
  return {
    score: calculationChainScore
      + (8 - wrongBatchDeduction)
      + (9 - revealedAnswerDeduction),
    wrongBatches,
    wrongBatchDeduction,
    revealedAnswers,
    revealedAnswerDeduction,
    calculationChainScore,
  };
};

const toneForScore = (score: number, maximum: number): ExperimentProcessReviewTone => (
  score / maximum >= 0.92 ? 'good' : score / maximum >= 0.65 ? 'attention' : 'risk'
);

const createScoreRows = (options: {
  runIndex: number;
  context: RunScoreContext;
  calculation: CalculationScoreContext;
  language: PistonOscillationLanguage;
}): ExperimentProcessReviewScoreRow[] => {
  const { context, language } = options;
  const runNumber = options.runIndex + 1;
  const gapText = context.releaseGapMs === null ? '--' : `${context.releaseGapMs} ms`;
  const heightEvidence = context.touchdown
    ? tr(language, '本次记录到一次未支撑触底；正式高度随后重新建立。', '本次記錄到一次未支撐觸底；正式高度隨後重新建立。', 'An unsupported bottom impact was recorded before the formal height was rebuilt.')
    : tr(language, `目标 ${runNumber} 的实际高度偏差为 ${context.heightDeviationMm.toFixed(1)} mm。`, `目標 ${runNumber} 的實際高度偏差為 ${context.heightDeviationMm.toFixed(1)} mm。`, `The confirmed-height deviation was ${context.heightDeviationMm.toFixed(1)} mm.`);
  return [
    {
      id: 'piston-setup-height',
      title: tr(language, '实验准备与高度', '實驗準備與高度', 'Setup and height'),
      evidence: heightEvidence,
      consequence: context.touchdown
        ? tr(language, '触底属于可观测的不规范装置操作。', '觸底屬於可觀測的不規範裝置操作。', 'The impact is an observable improper instrument operation.')
        : tr(language, '高度证据直接进入 h–T² 拟合。', '高度證據直接進入 h–T² 擬合。', 'The height evidence feeds the h–T² fit.'),
      suggestion: context.touchdown
        ? tr(language, '断开软管前先托住平台。', '斷開軟管前先托住平台。', 'Support the platform before disconnecting the hose.')
        : tr(language, '保持先锁紧、后接管的顺序。', '保持先鎖緊、後接管的順序。', 'Keep the lock-before-connect sequence.'),
      score: context.setupScore,
      maxScore: 15,
      tone: toneForScore(context.setupScore, 15),
      details: [
        {
          id: 'piston-height-confirmation',
          label: tr(language, '高度确认', '高度確認', 'Height confirmation'),
          evidence: tr(language, `实际高度偏差 ${context.heightDeviationMm.toFixed(1)} mm。`, `實際高度偏差 ${context.heightDeviationMm.toFixed(1)} mm。`, `Height deviation ${context.heightDeviationMm.toFixed(1)} mm.`),
          consequence: tr(language, '高度直接进入 h–T² 拟合。', '高度直接進入 h–T² 擬合。', 'Height feeds the h–T² fit.'),
          suggestion: tr(language, '锁紧前核对目标高度。', '鎖緊前核對目標高度。', 'Check the target height before locking.'),
          score: 7 - context.heightDeduction,
          maxScore: 7,
          tone: toneForScore(7 - context.heightDeduction, 7),
        },
        {
          id: 'piston-platform-support',
          label: tr(language, '断管支撑', '斷管支撐', 'Platform support'),
          evidence: context.touchdown
            ? tr(language, '记录到未支撑触底。', '記錄到未支撐觸底。', 'An unsupported impact was recorded.')
            : tr(language, '未记录到未支撑触底。', '未記錄到未支撐觸底。', 'No unsupported impact was recorded.'),
          consequence: context.touchdown
            ? tr(language, '装置发生可观测碰撞。', '裝置發生可觀測碰撞。', 'The instrument experienced an observable impact.')
            : tr(language, '平台切换过程保持受支撑。', '平台切換過程保持受支撐。', 'The platform remained supported.'),
          suggestion: tr(language, '断开软管前先托住平台。', '斷開軟管前先托住平台。', 'Support the platform before disconnecting.'),
          score: context.touchdown ? 0 : 8,
          maxScore: 8,
          tone: toneForScore(context.touchdown ? 0 : 8, 8),
        },
      ],
    },
    {
      id: 'piston-excitation',
      title: tr(language, '激发与采集', '激發與採集', 'Excitation and acquisition'),
      evidence: tr(language, `正式曲线双手松开时间差 ${gapText}。`, `正式曲線雙手鬆開時間差 ${gapText}。`, `The formal curve used a two-hand release gap of ${gapText}.`),
      consequence: context.releaseSeverity > 0
        ? tr(language, '释放不对称模型使首周期出现附加损耗。', '釋放不對稱模型使首週期出現附加損耗。', 'Release asymmetry adds first-cycle loss.')
        : tr(language, '没有触发释放不对称附加损耗。', '沒有觸發釋放不對稱附加損耗。', 'No extra release-asymmetry loss was activated.'),
      suggestion: context.releaseSeverity > 0
        ? tr(language, '尽量同步松开 Space 与鼠标左键。', '盡量同步鬆開 Space 與滑鼠左鍵。', 'Release Space and the left mouse button together.')
        : tr(language, '保持当前释放节奏。', '保持目前釋放節奏。', 'Keep the current release timing.'),
      score: context.excitationScore,
      maxScore: 25,
      tone: toneForScore(context.excitationScore, 25),
      details: [
        {
          id: 'piston-release-synchrony',
          label: tr(language, '双手同步释放', '雙手同步釋放', 'Release synchrony'),
          evidence: tr(language, `松手时间差 ${gapText}。`, `鬆手時間差 ${gapText}。`, `Release gap ${gapText}.`),
          consequence: context.releaseSeverity > 0
            ? tr(language, '首周期产生附加损耗。', '首週期產生附加損耗。', 'The first cycle has additional loss.')
            : tr(language, '未产生释放不对称附加损耗。', '未產生釋放不對稱附加損耗。', 'No asymmetry loss was added.'),
          suggestion: tr(language, '尽量同步松开双手。', '盡量同步鬆開雙手。', 'Release both hands together.'),
          score: 5 - context.releaseDeduction,
          maxScore: 5,
          tone: toneForScore(5 - context.releaseDeduction, 5),
        },
        {
          id: 'piston-formal-acquisition',
          label: tr(language, '正式采集', '正式採集', 'Formal acquisition'),
          evidence: tr(language, '正式压力曲线已完成采集并保存。', '正式壓力曲線已完成採集並儲存。', 'The formal pressure curve was acquired and saved.'),
          consequence: tr(language, '正式样本可用于周期处理。', '正式樣本可用於週期處理。', 'Formal samples are available for period processing.'),
          suggestion: tr(language, '保持当前采集流程。', '保持目前採集流程。', 'Keep the current acquisition flow.'),
          score: 20,
          maxScore: 20,
          tone: 'good',
        },
      ],
    },
    {
      id: 'piston-selection-fit',
      title: tr(language, '周期选择与拟合', '週期選擇與擬合', 'Period selection and fit'),
      evidence: tr(language, `选区周期最大相对偏离 ${(context.cycleDeviation * 100).toFixed(1)}%；错误批次 ${context.wrongPeriodBatches} 次。`, `選區週期最大相對偏離 ${(context.cycleDeviation * 100).toFixed(1)}%；錯誤批次 ${context.wrongPeriodBatches} 次。`, `Maximum selected-period deviation ${(context.cycleDeviation * 100).toFixed(1)}%; ${context.wrongPeriodBatches} incorrect batch(es).`),
      consequence: context.selectedForFit
        ? tr(language, '本次数据已进入最终线性拟合。', '本次資料已進入最終線性擬合。', 'This run was included in the final fit.')
        : tr(language, '本次数据未进入最终线性拟合。', '本次資料未進入最終線性擬合。', 'This run was not included in the final fit.'),
      suggestion: context.cycleDeviation > 0.02
        ? tr(language, '优先选择形态清晰且周期宽度稳定的区间。', '優先選擇形態清晰且週期寬度穩定的區間。', 'Prefer a clear interval with stable period widths.')
        : tr(language, '保持当前稳定区选取。', '保持目前穩定區選取。', 'Keep the current stable interval.'),
      score: context.selectionScore,
      maxScore: 30,
      tone: toneForScore(context.selectionScore, 30),
      details: [
        {
          id: 'piston-cycle-stability',
          label: tr(language, '周期稳定性', '週期穩定性', 'Period stability'),
          evidence: tr(language, `最大相对偏离 ${(context.cycleDeviation * 100).toFixed(1)}%。`, `最大相對偏離 ${(context.cycleDeviation * 100).toFixed(1)}%。`, `Maximum deviation ${(context.cycleDeviation * 100).toFixed(1)}%.`),
          consequence: tr(language, '周期宽度会影响本次 T²。', '週期寬度會影響本次 T²。', 'Period width affects this T² value.'),
          suggestion: tr(language, '优先选择周期宽度稳定的区间。', '優先選擇週期寬度穩定的區間。', 'Prefer an interval with stable periods.'),
          score: 6 - context.cycleDeduction,
          maxScore: 6,
          tone: toneForScore(6 - context.cycleDeduction, 6),
        },
        {
          id: 'piston-period-attempts',
          label: tr(language, '周期计算尝试', '週期計算嘗試', 'Period attempts'),
          evidence: tr(language, `错误批次 ${context.wrongPeriodBatches} 次。`, `錯誤批次 ${context.wrongPeriodBatches} 次。`, `${context.wrongPeriodBatches} incorrect batch(es).`),
          consequence: tr(language, '错误尝试作为周期处理证据保存。', '錯誤嘗試作為週期處理證據儲存。', 'Incorrect attempts remain as processing evidence.'),
          suggestion: tr(language, '提交前统一核对三个周期量。', '提交前統一核對三個週期量。', 'Check all three period values before submitting.'),
          score: 6 - context.wrongPeriodDeduction,
          maxScore: 6,
          tone: toneForScore(6 - context.wrongPeriodDeduction, 6),
        },
        {
          id: 'piston-period-independence',
          label: tr(language, '独立完成计算', '獨立完成計算', 'Independent work'),
          evidence: context.periodAnswerRevealed
            ? tr(language, '周期答案中存在查看答案记录。', '週期答案中存在查看答案記錄。', 'A period answer was revealed.')
            : tr(language, '周期答案均由用户完成。', '週期答案均由使用者完成。', 'Period answers were completed by the user.'),
          consequence: tr(language, '查看答案会影响该项得分。', '查看答案會影響該項得分。', 'Revealed answers affect this score.'),
          suggestion: tr(language, '优先自行修改后再校验。', '優先自行修改後再校驗。', 'Revise independently before checking.'),
          score: 3 - context.periodAnswerDeduction,
          maxScore: 3,
          tone: toneForScore(3 - context.periodAnswerDeduction, 3),
        },
        {
          id: 'piston-selection-validity',
          label: tr(language, '选区有效性', '選區有效性', 'Selection validity'),
          evidence: context.selectionIssueDeduction > 0
            ? tr(language, '选区记录到有效性问题。', '選區記錄到有效性問題。', 'A selection validity issue was recorded.')
            : tr(language, '选区满足当前处理要求。', '選區滿足目前處理要求。', 'The selection meets processing requirements.'),
          consequence: tr(language, '选区决定用于计算的周期范围。', '選區決定用於計算的週期範圍。', 'The selection determines the calculated interval.'),
          suggestion: tr(language, '避开形态不稳定的尾段。', '避開形態不穩定的尾段。', 'Avoid unstable tail cycles.'),
          score: 4 - context.selectionIssueDeduction,
          maxScore: 4,
          tone: toneForScore(4 - context.selectionIssueDeduction, 4),
        },
        {
          id: 'piston-fit-inclusion',
          label: tr(language, '拟合采用', '擬合採用', 'Fit inclusion'),
          evidence: context.selectedForFit
            ? tr(language, '本次数据已用于最终拟合。', '本次資料已用於最終擬合。', 'This run was included in the final fit.')
            : tr(language, '本次数据未用于最终拟合。', '本次資料未用於最終擬合。', 'This run was excluded from the final fit.'),
          consequence: tr(language, '决定该点是否参与 γ 的求解。', '決定該點是否參與 γ 的求解。', 'This determines whether the point contributes to γ.'),
          suggestion: tr(language, '仅采用证据可靠的数据点。', '僅採用證據可靠的資料點。', 'Use only reliable data points.'),
          score: 3 - context.fitDeduction,
          maxScore: 3,
          tone: toneForScore(3 - context.fitDeduction, 3),
        },
        {
          id: 'piston-selection-evidence',
          label: tr(language, '周期证据保存', '週期證據儲存', 'Period evidence'),
          evidence: tr(language, '框选范围、极值与周期结果均已保存。', '框選範圍、極值與週期結果均已儲存。', 'Selection, extrema, and period results were saved.'),
          consequence: tr(language, '评分可以回到原始周期证据。', '評分可以回到原始週期證據。', 'The score remains traceable to period evidence.'),
          suggestion: tr(language, '无需额外操作。', '無需額外操作。', 'No extra action needed.'),
          score: 8,
          maxScore: 8,
          tone: 'good',
        },
      ],
    },
    {
      id: 'piston-evidence',
      title: tr(language, '证据完整性', '證據完整性', 'Evidence integrity'),
      evidence: tr(language, `第 ${runNumber} 次的正式曲线、释放证据、框选与答案均已保存。`, `第 ${runNumber} 次的正式曲線、釋放證據、框選與答案均已儲存。`, `Run ${runNumber} retains the curve, release evidence, selection, and answers.`),
      consequence: tr(language, '评分可以回到原始证据。', '評分可以回到原始證據。', 'The score is traceable to saved evidence.'),
      suggestion: tr(language, '无需额外操作。', '無需額外操作。', 'No extra action needed.'),
      score: context.evidenceScore,
      maxScore: 5,
      tone: toneForScore(context.evidenceScore, 5),
      details: [
        {
          id: 'piston-raw-evidence',
          label: tr(language, '原始曲线', '原始曲線', 'Raw curve'),
          evidence: tr(language, '正式样本与采集参数已保存。', '正式樣本與採集參數已儲存。', 'Formal samples and acquisition settings were saved.'),
          consequence: tr(language, '曲线可以回到原始采样证据。', '曲線可以回到原始採樣證據。', 'The curve remains traceable to raw samples.'),
          suggestion: tr(language, '无需额外操作。', '無需額外操作。', 'No extra action needed.'),
          score: context.evidenceScore > 0 ? 2 : 0,
          maxScore: 2,
          tone: toneForScore(context.evidenceScore > 0 ? 2 : 0, 2),
        },
        {
          id: 'piston-processing-evidence',
          label: tr(language, '处理记录', '處理記錄', 'Processing record'),
          evidence: tr(language, '释放、框选与答案记录已关联。', '釋放、框選與答案記錄已關聯。', 'Release, selection, and answer records are linked.'),
          consequence: tr(language, '评分依据保持完整。', '評分依據保持完整。', 'Scoring evidence remains complete.'),
          suggestion: tr(language, '无需额外操作。', '無需額外操作。', 'No extra action needed.'),
          score: context.evidenceScore > 0 ? 3 : 0,
          maxScore: 3,
          tone: toneForScore(context.evidenceScore > 0 ? 3 : 0, 3),
        },
      ],
    },
    {
      id: 'piston-calculation',
      title: tr(language, '本组计算', '本組計算', 'Group calculation'),
      evidence: tr(language, '最终面积、γ 与相对误差按整组答案记录评分。', '最終面積、γ 與相對誤差按整組答案記錄評分。', 'Area, γ, and relative error are scored from the group answer history.'),
      consequence: tr(language, '计算证据不写入单次实验的仪器时间条。', '計算證據不寫入單次實驗的儀器時間條。', 'Calculation evidence is not placed on an instrument timeline.'),
      suggestion: tr(language, '提交前检查单位、数值和有效数字。', '提交前檢查單位、數值和有效數字。', 'Check units, values, and significant figures before submitting.'),
      score: options.calculation.score,
      maxScore: 25,
      tone: toneForScore(options.calculation.score, 25),
      details: [
        {
          id: 'piston-calculation-batches',
          label: tr(language, '批次校验', '批次校驗', 'Batch validation'),
          evidence: tr(language, `错误批次 ${options.calculation.wrongBatches} 次。`, `錯誤批次 ${options.calculation.wrongBatches} 次。`, `${options.calculation.wrongBatches} incorrect batch(es).`),
          consequence: tr(language, '错误批次记录进入整组计算评分。', '錯誤批次記錄進入整組計算評分。', 'Incorrect batches affect group calculation scoring.'),
          suggestion: tr(language, '提交前统一核对三个结果。', '提交前統一核對三個結果。', 'Check all three results before submitting.'),
          score: 8 - options.calculation.wrongBatchDeduction,
          maxScore: 8,
          tone: toneForScore(8 - options.calculation.wrongBatchDeduction, 8),
        },
        {
          id: 'piston-calculation-independence',
          label: tr(language, '独立作答', '獨立作答', 'Independent answers'),
          evidence: tr(language, `查看答案 ${options.calculation.revealedAnswers} 项。`, `查看答案 ${options.calculation.revealedAnswers} 項。`, `${options.calculation.revealedAnswers} revealed answer(s).`),
          consequence: tr(language, '查看答案记录影响整组计算得分。', '查看答案記錄影響整組計算得分。', 'Revealed answers affect the group score.'),
          suggestion: tr(language, '优先自行修改后再统一校验。', '優先自行修改後再統一校驗。', 'Revise independently before final validation.'),
          score: 9 - options.calculation.revealedAnswerDeduction,
          maxScore: 9,
          tone: toneForScore(9 - options.calculation.revealedAnswerDeduction, 9),
        },
        {
          id: 'piston-calculation-chain',
          label: tr(language, '计算链完整性', '計算鏈完整性', 'Calculation chain'),
          evidence: options.calculation.calculationChainScore > 0
            ? tr(language, '面积、γ 与相对误差均已保存。', '面積、γ 與相對誤差均已儲存。', 'Area, γ, and relative error were saved.')
            : tr(language, '整组计算记录不完整。', '整組計算記錄不完整。', 'The calculation record is incomplete.'),
          consequence: tr(language, '最终结果可以回溯到整组答案。', '最終結果可以回溯到整組答案。', 'The final result remains traceable to group answers.'),
          suggestion: tr(language, '提交前检查单位与有效数字。', '提交前檢查單位與有效數字。', 'Check units and significant figures.'),
          score: options.calculation.calculationChainScore,
          maxScore: 8,
          tone: toneForScore(options.calculation.calculationChainScore, 8),
        },
      ],
    },
  ];
};

export const selectPistonOscillationProcessReviewModels = (
  session: PistonOscillationFreeSession,
  language: PistonOscillationLanguage = 'zh-CN',
): ExperimentProcessReviewViewModel[] => {
  const processing = session.dataProcessing;
  if (session.status !== 'active' || processing?.status !== 'completed') return [];
  const scheme = processing.scoringPolicy?.scheme
    ?? session.experimentGroup?.scheme
    ?? 'real';
  const scoringEligible = processing.scoringPolicy?.scoringEligible ?? scheme === 'real';
  const runContexts = processing.runs.map((run) => {
    const record = session.savedMeasurements.find((candidate) => (
      candidate.recordId === run.rawMeasurementRecordId
    ));
    return record ? {
      run,
      record,
      score: createRunScoreContext(session, processing, run, record),
    } : null;
  });
  if (runContexts.some((context) => context === null)) return [];
  const resolvedContexts = runContexts.filter((context): context is NonNullable<typeof context> => (
    context !== null
  ));
  const calculationScoreContext = getCalculationScoreContext(processing);
  const calculationScore = scoringEligible ? calculationScoreContext.score : null;
  const averageOperationScore = scoringEligible
    ? Math.round(
        resolvedContexts.reduce((sum, context) => sum + context.score.operationScore, 0)
        / Math.max(1, resolvedContexts.length),
      )
    : null;
  const totalScore = averageOperationScore === null || calculationScore === null
    ? null
    : averageOperationScore + calculationScore;
  const calculation = processing.calculationSession;
  const gamma = calculation?.answers.gamma.expectedValue ?? null;
  const relativeError = calculation?.answers.relativeError.expectedValue ?? null;
  const rSquared = processing.linearFitResult?.rSquared ?? null;
  const gasType = calculation?.knowns?.gasType
    ?? session.experimentGroup?.gasMaterialSnapshot.gasType
    ?? 'air';
  const schemeLabel = scheme === 'ideal'
    ? tr(language, '理想实验过程', '理想實驗過程', 'Ideal process')
    : tr(language, '真实实验条件', '真實實驗條件', 'Real conditions');
  const gasLabel = gasType === 'helium'
    ? tr(language, '氦气', '氦氣', 'Helium')
    : tr(language, '空气', '空氣', 'Air');
  const unscoredNotice = tr(
    language,
    '理想实验条件保留完整过程证据，但不生成数值评分。',
    '理想實驗條件保留完整過程證據，但不產生數值評分。',
    'Ideal experiment conditions retain complete process evidence but do not generate numeric scores.',
  );
  const options: ExperimentProcessReviewOption[] = resolvedContexts.map((context, runIndex) => {
    const hasAttention = context.score.releaseSeverity > 0
      || context.score.cycleDeviation > 0.02
      || context.score.wrongPeriodBatches > 0;
    const statusTone: ExperimentProcessReviewTone = context.score.touchdown
      ? 'risk'
      : hasAttention ? 'attention' : 'good';
    return {
      id: context.record.recordId,
      title: tr(language, `第 ${runIndex + 1} 次 · ${context.run.targetHeightMm} mm`, `第 ${runIndex + 1} 次 · ${context.run.targetHeightMm} mm`, `Run ${runIndex + 1} · ${context.run.targetHeightMm} mm`),
      subtitle: runIndex === 0
        ? tr(language, '初始装置建立流程 · 正式曲线', '初始裝置建立流程 · 正式曲線', 'Initial setup · formal curve')
        : tr(language, '高度切换流程 · 正式曲线', '高度切換流程 · 正式曲線', 'Height change · formal curve'),
      statusLabel: statusTone === 'risk'
        ? tr(language, '需复核', '需複核', 'Review')
        : statusTone === 'attention'
          ? tr(language, '可改进', '可改進', 'Improve')
          : tr(language, '稳定', '穩定', 'Stable'),
      statusTone,
    };
  });

  return resolvedContexts.map((context, runIndex) => {
    const { run, record, score } = context;
    const cyclePeriods = getRunCyclePeriodsMs(session, run);
    const cycleMedian = getMedian(cyclePeriods.map((point) => point.y));
    const selection = run.selection;
    const scoredRows = createScoreRows({
      runIndex,
      context: score,
      calculation: calculationScoreContext,
      language,
    });
    const scoreRows = scoringEligible
      ? scoredRows
      : scoredRows.map((row) => ({
          ...row,
          score: null,
          maxScore: null,
          details: row.details?.map((detail) => ({
            ...detail,
            score: null,
            maxScore: null,
          })),
        }));
    return {
      scoringEligible,
      experimentLabel: tr(
        language,
        `活塞振动法 · 自由模式 · ${schemeLabel} · ${gasLabel}`,
        `活塞振動法 · 自由模式 · ${schemeLabel} · ${gasLabel}`,
        `Piston oscillation · Free mode · ${schemeLabel} · ${gasLabel}`,
      ),
      currentTitle: options[runIndex]!.title,
      currentSubtitle: `${options[runIndex]!.subtitle} · ${record.acquisitionSettings.sampleRateHz} Hz / ${record.acquisitionSettings.triggerThresholdKpa} kPa`,
      summaryNote: scoringEligible
        ? tr(language, '本轮正式曲线、周期处理、线性拟合和最终答案均已完成；回顾页面只读，不会改写原始数据。', '本輪正式曲線、週期處理、線性擬合和最終答案均已完成；回顧頁面唯讀，不會改寫原始資料。', 'Formal curves, period processing, fit, and final answers are complete. This review is read-only.')
        : tr(language, '本轮仍完成正式曲线、周期处理、线性拟合和最终答案；回顾页面只读，理想实验不生成评分。', '本輪仍完成正式曲線、週期處理、線性擬合和最終答案；回顧頁面唯讀，理想實驗不產生評分。', 'Formal curves, period processing, fit, and final answers are complete. This read-only Ideal review does not generate a score.'),
      metrics: [
        { label: 'γ', value: formatNumber(gamma, 3), detail: relativeError === null ? '--' : tr(language, `相对理论误差 ${relativeError.toFixed(2)}%`, `相對理論誤差 ${relativeError.toFixed(2)}%`, `Relative error ${relativeError.toFixed(2)}%`), tone: relativeError !== null && relativeError <= 3 ? 'good' : 'attention' },
        { label: tr(language, '线性拟合 R²', '線性擬合 R²', 'Linear-fit R²'), value: formatNumber(rSquared, 4), detail: tr(language, `${processing.linearFitResult?.selectedRunIndices.length ?? 0} 个拟合点`, `${processing.linearFitResult?.selectedRunIndices.length ?? 0} 個擬合點`, `${processing.linearFitResult?.selectedRunIndices.length ?? 0} fit points`), tone: rSquared !== null && rSquared >= 0.98 ? 'good' : 'attention' },
        scoringEligible
          ? { label: tr(language, '本次实验操作', '本次實驗操作', 'Current run'), value: `${score.operationScore} / 75`, detail: tr(language, '按本次实验的实际证据归因', '按本次實驗的實際證據歸因', 'Attributed from this run evidence'), tone: toneForScore(score.operationScore, 75) }
          : { label: tr(language, '本次实验操作', '本次實驗操作', 'Current run'), value: '--', detail: unscoredNotice, tone: 'neutral' },
        scoringEligible && totalScore !== null && averageOperationScore !== null && calculationScore !== null
          ? { label: tr(language, '本轮总分', '本輪總分', 'Total score'), value: `${totalScore} / 100`, detail: tr(language, `操作均分 ${averageOperationScore} + 计算 ${calculationScore}`, `操作均分 ${averageOperationScore} + 計算 ${calculationScore}`, `Operations ${averageOperationScore} + calculation ${calculationScore}`), tone: toneForScore(totalScore, 100) }
          : { label: tr(language, '本轮总分', '本輪總分', 'Total score'), value: '--', detail: unscoredNotice, tone: 'neutral' },
      ],
      options,
      selectedOptionId: record.recordId,
      processTitle: tr(language, '实验过程回顾', '實驗過程回顧', 'Experiment process review'),
      processSubtitle: runIndex === 0
        ? tr(language, '第 1 次使用初始装置建立流程', '第 1 次使用初始裝置建立流程', 'Run 1 uses the initial setup flow')
        : tr(language, `第 ${runIndex + 1} 次使用高度切换流程`, `第 ${runIndex + 1} 次使用高度切換流程`, `Run ${runIndex + 1} uses the height-change flow`),
      processNote: runIndex === 0
        ? tr(language, '第 1 次从初始排空状态建立第一高度；时间条只呈现已保存的真实仪器动作与结果。', '第 1 次從初始排空狀態建立第一高度；時間條只呈現已儲存的真實儀器動作與結果。', 'Run 1 establishes the first height from the initial vented state; only saved observations appear on the timeline.')
        : tr(language, '第 2 次及以后先处理上一条记录，再托住平台断管并切换高度；不会套用第 1 次的模板。', '第 2 次及以後先處理上一條記錄，再托住平台斷管並切換高度；不會套用第 1 次的範本。', 'Later runs use the height-change workflow rather than the Run 1 template.'),
      stages: createStages(
        runIndex,
        run.targetHeightMm,
        record.confirmedHeightMm,
        score.releaseGapMs,
        language,
      ),
      events: createTimelineEvents({ session, processing, run, record, runIndex, language }),
      charts: [
        {
          id: 'piston-pressure',
          title: tr(language, '绝对压强振动曲线', '絕對壓強振動曲線', 'Absolute-pressure oscillation'),
          subtitle: tr(language, '本次正式曲线 · 保存的传感器观测数据', '本次正式曲線 · 儲存的感測器觀測資料', 'Current formal run · saved sensor observations'),
          xLabel: tr(language, '触发后时间 / s', '觸發後時間 / s', 'Time after trigger / s'),
          yLabel: tr(language, '绝对压强 / kPa', '絕對壓強 / kPa', 'Absolute pressure / kPa'),
          xDigits: 3,
          yDigits: 1,
          series: [{
            id: 'observed-pressure',
            label: tr(language, '正式观测曲线', '正式觀測曲線', 'Formal observed curve'),
            color: '#2b77ad',
            points: downsampleChartPoints(record.samples),
          }],
          bands: selection ? [{
            id: 'period-selection',
            start: selection.rangeStartTimeS,
            end: selection.rangeEndTimeS,
            label: tr(language, '学生周期选区', '學生週期選區', 'Selected period range'),
            tone: score.cycleDeviation > 0.02 ? 'attention' : 'good',
          }] : [],
          markers: [{
            id: 'release',
            x: record.acquisitionSettings.releaseOffsetS ?? 0,
            label: tr(language, '双手释放', '雙手釋放', 'Release'),
            tone: score.releaseSeverity > 0 ? 'attention' : 'good',
          }],
          note: tr(language, `图形只对 SVG 绘制点降采样；保存的 ${record.samples.length} 个正式样本和 1000 Hz 时间网格没有改变。`, `圖形只對 SVG 繪製點降採樣；儲存的 ${record.samples.length} 個正式樣本和 1000 Hz 時間網格沒有改變。`, `Only SVG drawing points are downsampled; all ${record.samples.length} saved samples remain unchanged.`),
        },
        {
          id: 'piston-cycle-stability',
          title: tr(language, '周期稳定性', '週期穩定性', 'Period stability'),
          subtitle: tr(language, '选区内同相位主极值间隔', '選區內同相位主極值間隔', 'Same-phase primary-extremum intervals'),
          xLabel: tr(language, '周期序号', '週期序號', 'Period index'),
          yLabel: tr(language, '周期宽度 / ms', '週期寬度 / ms', 'Period width / ms'),
          xDigits: 0,
          yDigits: 1,
          series: [
            { id: 'cycle-periods', label: tr(language, '本次实验', '本次實驗', 'Current run'), color: score.cycleDeviation > 0.02 ? '#9a711f' : '#3f8058', points: cyclePeriods, showPoints: true },
            ...(cycleMedian === null ? [] : [{
              id: 'cycle-median',
              label: tr(language, '选区中位水平', '選區中位水準', 'Selection median'),
              color: '#6b7480',
              points: [{ x: 1, y: cycleMedian }, { x: Math.max(2, cyclePeriods.length), y: cycleMedian }],
              dashed: true,
            }]),
          ],
          note: score.cycleDeviation > 0.02
            ? tr(language, '选区内存在较明显的周期宽度偏离，已作为本次实验的周期选择证据。', '選區內存在較明顯的週期寬度偏離，已作為本次實驗的週期選擇證據。', 'The selected interval contains a visible period-width deviation used in this run score.')
            : tr(language, '当前选区的周期宽度围绕中位水平分布。', '目前選區的週期寬度圍繞中位水準分布。', 'Selected period widths remain near the median.'),
        },
      ],
      scoreTitle: scoringEligible
        ? tr(language, '评分细则', '評分細則', 'Scoring details')
        : tr(language, '过程证据诊断', '過程證據診斷', 'Process evidence'),
      scoreSubtitle: scoringEligible && calculationScore !== null
        ? tr(language, `第 ${runIndex + 1} 次操作 ${score.operationScore} / 75 · 本组计算 ${calculationScore} / 25`, `第 ${runIndex + 1} 次操作 ${score.operationScore} / 75 · 本組計算 ${calculationScore} / 25`, `Run ${runIndex + 1} operations ${score.operationScore}/75 · calculation ${calculationScore}/25`)
        : tr(language, `第 ${runIndex + 1} 次 · 不评分`, `第 ${runIndex + 1} 次 · 不評分`, `Run ${runIndex + 1} · not scored`),
      scoreRule: scoringEligible
        ? tr(language, '本组总分 = 各次实验操作分平均值（75 分）+ 本组计算（25 分）。实际仪器动作、曲线后果、框选和答题分别只在其主要项目中计分，避免同一事实重复扣分。', '本組總分 = 各次實驗操作分平均值（75 分）+ 本組計算（25 分）。實際儀器動作、曲線後果、框選和答題分別只在其主要項目中計分，避免同一事實重複扣分。', 'Total = mean run-operation score (75) + group calculation (25). Each fact is scored once in its primary category.')
        : unscoredNotice,
      scoreRows,
    } satisfies ExperimentProcessReviewViewModel;
  });
};
