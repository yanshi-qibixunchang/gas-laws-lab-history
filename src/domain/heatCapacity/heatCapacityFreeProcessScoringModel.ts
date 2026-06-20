import type {
  HeatCapacityFreeRecord,
  HeatCapacityFreeTrial,
} from './heatCapacityFreeTrialModel.ts';
import type {
  HeatCapacityFreeTraceBranch,
  HeatCapacityFreeTraceSample,
  HeatCapacityFreeTraceTrial,
} from './heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityProcessReviewSummary,
} from './heatCapacityFreeProcessReviewModel.ts';
import type {
  HeatCapacityOperationUpperBound,
  HeatCapacityProcessScore,
  HeatCapacityProcessScoreItem,
  HeatCapacityProcessScoreSubItem,
} from './heatCapacityFreeProcessReviewTypes.ts';

export interface HeatCapacityProcessScoringInput {
  traceTrial: HeatCapacityFreeTraceTrial;
  branch: HeatCapacityFreeTraceBranch;
  trial: HeatCapacityFreeTrial;
  summary: HeatCapacityProcessReviewSummary;
  upperBound: HeatCapacityOperationUpperBound;
}

export const SCORE_MAX = {
  completeness: 15,
  zeroing: 15,
  pumping: 20,
  release: 20,
  recording: 20,
  retake: 10,
} as const;

const formatNumber = (value: number | null | undefined, digits = 2) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const findStopcockFlowStartTime = (
  samples: HeatCapacityFreeTraceSample[],
  visualOpenS: number,
) => {
  const confirmedFlowSample = samples.find((sample) => (
    sample.atS >= visualOpenS &&
    sample.controls.stopcockFlowOpen
  ));
  if (confirmedFlowSample) return confirmedFlowSample.atS;

  const releasingSample = samples.find((sample) => (
    sample.atS >= visualOpenS &&
    sample.controls.stopcockOpen &&
    sample.physical.releaseStarted
  ));
  return releasingSample?.atS ?? visualOpenS;
};

const detailStatus = (
  score: number,
  maxScore: number,
  fallback: HeatCapacityProcessScoreItem['status'] = 'review',
): HeatCapacityProcessScoreItem['status'] => {
  if (maxScore <= 0) return fallback;
  if (score >= maxScore) return 'reasonable';
  if (score <= Math.max(0, maxScore * 0.45)) return 'needs-improvement';
  return fallback;
};

const createSubItem = (
  item: HeatCapacityProcessScoreSubItem,
): HeatCapacityProcessScoreSubItem => (
  item.status === 'reasonable' && item.score === item.maxScore
    ? {
      ...item,
      reason: '无误。',
      recommendation: '无误。',
    }
    : item
);

const createDefaultDetails = (
  item: Omit<HeatCapacityProcessScoreItem, 'details'>,
): HeatCapacityProcessScoreSubItem[] => ([
  createSubItem({
    id: `${item.id}-summary`,
    label: item.label,
    score: item.score,
    maxScore: item.maxScore,
    status: item.status,
    evidence: item.evidence,
    reason: item.relation,
    recommendation: item.recommendation,
  }),
]);

const createItem = (
  item: Omit<HeatCapacityProcessScoreItem, 'details'> & {
    details?: HeatCapacityProcessScoreSubItem[];
  },
): HeatCapacityProcessScoreItem => {
  const conciseItem = item.status === 'reasonable' && item.score === item.maxScore
    ? {
      ...item,
      relation: '无误。',
      recommendation: '无误。',
    }
    : item;
  return {
    ...conciseItem,
    details: conciseItem.details ?? createDefaultDetails(conciseItem),
  };
};

const createPumpingDetails = (
  input: {
    pressureScore: number;
    safetyScore: number;
    rhythmScore: number;
    stableScore: number;
    pressureEvidence: string;
    safetyEvidence: string;
    rhythmEvidence: string;
    stableEvidence: string;
    pressureReason: string;
    safetyReason: string;
    rhythmReason: string;
    stableReason: string;
    pressureRecommendation: string;
    safetyRecommendation: string;
    rhythmRecommendation: string;
    stableRecommendation: string;
  },
): HeatCapacityProcessScoreSubItem[] => ([
  createSubItem({
    id: 'pumping-pressure-target',
    label: '目标压强',
    score: input.pressureScore,
    maxScore: 8,
    status: detailStatus(input.pressureScore, 8),
    evidence: input.pressureEvidence,
    reason: input.pressureReason,
    recommendation: input.pressureRecommendation,
  }),
  createSubItem({
    id: 'pumping-safety',
    label: '安全提示',
    score: input.safetyScore,
    maxScore: 6,
    status: detailStatus(input.safetyScore, 6),
    evidence: input.safetyEvidence,
    reason: input.safetyReason,
    recommendation: input.safetyRecommendation,
  }),
  createSubItem({
    id: 'pumping-rhythm',
    label: '打气节奏',
    score: input.rhythmScore,
    maxScore: 4,
    status: detailStatus(input.rhythmScore, 4),
    evidence: input.rhythmEvidence,
    reason: input.rhythmReason,
    recommendation: input.rhythmRecommendation,
  }),
  createSubItem({
    id: 'pumping-stability',
    label: '稳定等待',
    score: input.stableScore,
    maxScore: 2,
    status: detailStatus(input.stableScore, 2),
    evidence: input.stableEvidence,
    reason: input.stableReason,
    recommendation: input.stableRecommendation,
  }),
]);

const createReleaseDetails = (
  input: {
    valveScore: number;
    responseScore: number;
    recoverScore: number;
    retentionScore: number;
    durationText: string;
    ratioText: string;
    valveReason: string;
    responseReason: string;
    recoverReason: string;
    retentionReason: string;
    valveRecommendation: string;
    responseRecommendation: string;
    recoverRecommendation: string;
    retentionRecommendation: string;
  },
): HeatCapacityProcessScoreSubItem[] => ([
  createSubItem({
    id: 'release-valve',
    label: '开阀放气',
    score: input.valveScore,
    maxScore: 6,
    status: detailStatus(input.valveScore, 6),
    evidence: `放气 ${input.durationText}。`,
    reason: input.valveReason,
    recommendation: input.valveRecommendation,
  }),
  createSubItem({
    id: 'release-response',
    label: '泄放响应',
    score: input.responseScore,
    maxScore: 6,
    status: detailStatus(input.responseScore, 6),
    evidence: `U2/U1 = ${input.ratioText}。`,
    reason: input.responseReason,
    recommendation: input.responseRecommendation,
  }),
  createSubItem({
    id: 'release-recover',
    label: '关阀回温',
    score: input.recoverScore,
    maxScore: 4,
    status: detailStatus(input.recoverScore, 4),
    evidence: '关闭玻璃旋塞后进入恢复记录段。',
    reason: input.recoverReason,
    recommendation: input.recoverRecommendation,
  }),
  createSubItem({
    id: 'release-retention',
    label: 'U2 保留量',
    score: input.retentionScore,
    maxScore: 4,
    status: detailStatus(input.retentionScore, 4),
    evidence: `U2/U1 = ${input.ratioText}。`,
    reason: input.retentionReason,
    recommendation: input.retentionRecommendation,
  }),
]);

const findRecordTraceSample = (
  branch: HeatCapacityFreeTraceBranch,
  record: HeatCapacityFreeRecord | null,
) => (
  record?.traceSampleId
    ? branch.samples.find((sample) => sample.id === record.traceSampleId) ?? null
    : null
);

const sampleIsStableForRecording = (
  sample: HeatCapacityFreeTraceSample | null,
  traceTrial: HeatCapacityFreeTraceTrial,
) => {
  if (!sample) return false;
  const thresholds = traceTrial.configSnapshot.record;
  return sample.stability.pressureStable &&
    sample.stability.temperatureStable &&
    Math.abs(sample.sensor.pressureSlopeMvPerS) <= thresholds.pressureStableSlopeMvPerS &&
    Math.abs(sample.sensor.temperatureSlopeMvPerS) <= thresholds.temperatureStableSlopeMvPerS;
};

const scoreCompleteness = (
  trial: HeatCapacityFreeTrial,
): HeatCapacityProcessScoreItem => {
  const complete = Boolean(trial.u0 && trial.u1 && trial.u2 && trial.correctedSignals);
  return createItem({
    id: 'completeness',
    label: '数据完整性',
    maxScore: SCORE_MAX.completeness,
    score: complete ? SCORE_MAX.completeness : 0,
    status: complete ? 'reasonable' : 'insufficient-data',
    evidence: complete ? 'U0 / U1 / U2 与计算结果完整。' : '缺少完整 U0 / U1 / U2 或计算结果。',
    relation: complete ? '无误。' : '记录不完整。',
    recommendation: complete ? '保持完整记录链路。' : '完成三次手动记录后再查看评分。',
  });
};

const scoreZeroing = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScoreItem => {
  const zeroWindow = input.upperBound.windows.find((window) => window.recordId === 'u0') ?? null;
  if (!input.trial.u0) {
    return createItem({
      id: 'zeroing',
      label: '调零与 U0',
      maxScore: SCORE_MAX.zeroing,
      score: 0,
      status: 'insufficient-data',
      evidence: '缺少 U0 记录。',
      relation: '无法判断零点是否一致。',
      recommendation: '先调零并手动记录 U0。',
    });
  }
  const insideWindow = zeroWindow !== null &&
    input.trial.u0.atS >= zeroWindow.startS &&
    input.trial.u0.atS <= zeroWindow.endS;
  const nearZeroMv = Math.abs(input.trial.u0.displayPressureMv) <= 1;
  const strongZeroMv = Math.abs(input.trial.u0.displayPressureMv) <= 0.5;
  const score = (insideWindow || strongZeroMv) && nearZeroMv
    ? SCORE_MAX.zeroing
    : nearZeroMv
      ? 11
      : 8;
  return createItem({
    id: 'zeroing',
    label: '调零与 U0',
    maxScore: SCORE_MAX.zeroing,
    score,
    status: score === SCORE_MAX.zeroing ? 'reasonable' : 'review',
    evidence: strongZeroMv
      ? 'U0 零点接近 0。'
      : `U0 零点偏离 ${formatNumber(input.trial.u0.displayPressureMv, 2)} mV。`,
    relation: insideWindow
      ? 'U0 位于最佳零点窗口内。'
      : strongZeroMv
        ? 'U0 虽未落在最佳窗口内，但零点示数足够接近 0。'
        : 'U0 未落在当前推荐零点窗口内。',
    recommendation: score === SCORE_MAX.zeroing ? '零点链路可用于本组计算。' : '下一组可在读数更接近 0 且稳定后记录 U0。',
  });
};

const scorePumping = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScoreItem => {
  const pumpCount = input.branch.events.filter((event) => event.type === 'pump-stroke').length;
  const warningCount = input.branch.events.filter((event) => event.type === 'pressure-warning').length;
  const dangerCount = input.branch.events.filter((event) => event.type === 'pressure-danger').length;
  if (!input.summary.u1) {
    return createItem({
      id: 'pumping',
      label: '打气过程',
      maxScore: SCORE_MAX.pumping,
      score: 0,
      status: 'insufficient-data',
      evidence: '缺少 U1 记录。',
      relation: '无法定位打气后的高压稳定点。',
      recommendation: '完成打气、关闭阀门并记录 U1。',
      details: createPumpingDetails({
        pressureScore: 0,
        safetyScore: 0,
        rhythmScore: 0,
        stableScore: 0,
        pressureEvidence: '缺少 U1 压强差。',
        safetyEvidence: '无法判断压力提示。',
        rhythmEvidence: '无法判断打气节奏。',
        stableEvidence: '无法判断稳定等待。',
        pressureReason: '没有 U1 记录，不能确认是否达到目标压强。',
        safetyReason: '没有完整打气过程，不能判断安全提示。',
        rhythmReason: '没有完整打气过程，不能判断操作节奏。',
        stableReason: '没有 U1 记录，不能判断是否等待稳定。',
        pressureRecommendation: '完成打气并记录 U1。',
        safetyRecommendation: '记录前确认压力提示处于可用范围。',
        rhythmRecommendation: '按稳定节奏打气，不要在提示异常后继续加压。',
        stableRecommendation: '关闭打气阀后等待读数稳定再记录 U1。',
      }),
    });
  }
  const pressureMv = input.summary.u1.pressureDeltaKPa *
    input.traceTrial.configSnapshot.sensor.pressureMvPerKPa;
  const minimum = input.traceTrial.configSnapshot.record.minimumUsefulU1CorrectedMv;
  if (pressureMv < minimum) {
    return createItem({
      id: 'pumping',
      label: '打气过程',
      maxScore: SCORE_MAX.pumping,
      score: 8,
      status: 'needs-improvement',
      evidence: `打气 ${pumpCount} 次，U1 压强差 ${formatNumber(input.summary.u1.pressureDeltaKPa)} kPa。`,
      relation: 'U1 低于有效记录区间，后续 gamma 对放气误差更敏感。',
      recommendation: '下一组应继续打气到安全提示允许的有效区间。',
      details: createPumpingDetails({
        pressureScore: 2,
        safetyScore: 6,
        rhythmScore: 0,
        stableScore: 0,
        pressureEvidence: `U1 压强差 ${formatNumber(input.summary.u1.pressureDeltaKPa)} kPa。`,
        safetyEvidence: '未发现压力报警。',
        rhythmEvidence: `打气 ${pumpCount} 次后仍未到有效区间。`,
        stableEvidence: 'U1 压强不足，稳定等待不计满分。',
        pressureReason: 'U1 低于有效记录区间。',
        safetyReason: '压力安全提示没有成为主要问题。',
        rhythmReason: '打气总量不足会放大后续放气误差。',
        stableReason: '目标压强不足时，稳定等待不能补偿数据基础。',
        pressureRecommendation: '继续打气到安全提示允许的有效区间。',
        safetyRecommendation: '保持在报警线以下。',
        rhythmRecommendation: '增加打气次数或单次幅度，但不要进入报警区。',
        stableRecommendation: '到达有效区间后再关闭阀门并等待稳定。',
      }),
    });
  }
  if (dangerCount > 0) {
    return createItem({
      id: 'pumping',
      label: '打气过程',
      maxScore: SCORE_MAX.pumping,
      score: 7,
      status: 'needs-improvement',
      evidence: `打气 ${pumpCount} 次，出现 ${dangerCount} 次报警。`,
      relation: '报警区的高压操作不应作为最佳过程。',
      recommendation: '下一组提前停止加压，避免进入报警区。',
      details: createPumpingDetails({
        pressureScore: 4,
        safetyScore: 0,
        rhythmScore: 1,
        stableScore: 2,
        pressureEvidence: '打气过程进入报警区。',
        safetyEvidence: `出现 ${dangerCount} 次报警。`,
        rhythmEvidence: `打气 ${pumpCount} 次后超过安全边界。`,
        stableEvidence: '后续稳定等待不能抵消报警操作。',
        pressureReason: '压强过高会让操作风险和数据不确定性上升。',
        safetyReason: '报警事件导致扣分。',
        rhythmReason: '末段加压没有及时停止。',
        stableReason: '报警后即使稳定，过程仍不应作为最佳操作。',
        pressureRecommendation: '下一组降低单次加压或提前停止。',
        safetyRecommendation: '不要把报警区作为目标压强。',
        rhythmRecommendation: '接近预警时降低打气节奏。',
        stableRecommendation: '保持关闭阀门后的稳定等待。',
      }),
    });
  }
  if (warningCount > 0) {
    return createItem({
      id: 'pumping',
      label: '打气过程',
      maxScore: SCORE_MAX.pumping,
      score: SCORE_MAX.pumping,
      status: 'reasonable',
      evidence: `打气 ${pumpCount} 次，出现 ${warningCount} 次预警。`,
      relation: 'U1 可用于计算，但打气末段接近提示边界。',
      recommendation: '保留本组，下一组降低单次加压或提前停止。',
      details: createPumpingDetails({
        pressureScore: 8,
        safetyScore: 6,
        rhythmScore: 4,
        stableScore: 2,
        pressureEvidence: `U1 压强差 ${formatNumber(input.summary.u1.pressureDeltaKPa)} kPa。`,
        safetyEvidence: `出现 ${warningCount} 次预警。`,
        rhythmEvidence: `打气 ${pumpCount} 次。`,
        stableEvidence: 'U1 记录可用于计算。',
        pressureReason: '目标压强可用。',
        safetyReason: '预警说明末段已接近提示边界。',
        rhythmReason: '打气次数和节奏可复盘。',
        stableReason: '记录点满足当前计算要求。',
        pressureRecommendation: '保持目标压强在有效区间。',
        safetyRecommendation: '下一组提前停止，避免进入预警区。',
        rhythmRecommendation: '接近有效区间后减小单次加压。',
        stableRecommendation: '继续在关闭阀门后等待稳定。',
      }),
    });
  }
  return createItem({
    id: 'pumping',
    label: '打气过程',
    maxScore: SCORE_MAX.pumping,
    score: SCORE_MAX.pumping,
    status: 'reasonable',
    evidence: `打气 ${pumpCount} 次，U1 压强差 ${formatNumber(input.summary.u1.pressureDeltaKPa)} kPa。`,
    relation: 'U1 位于有效范围，未触发压力安全事件。',
    recommendation: '打气幅度适合本组计算。',
    details: createPumpingDetails({
      pressureScore: 8,
      safetyScore: 6,
      rhythmScore: 4,
      stableScore: 2,
      pressureEvidence: `U1 压强差 ${formatNumber(input.summary.u1.pressureDeltaKPa)} kPa。`,
      safetyEvidence: '未触发压力预警或报警。',
      rhythmEvidence: `打气 ${pumpCount} 次。`,
      stableEvidence: 'U1 记录可用于计算。',
      pressureReason: '目标压强落在有效范围。',
      safetyReason: '安全提示没有异常。',
      rhythmReason: '打气过程清晰可复盘。',
      stableReason: '记录点满足当前计算要求。',
      pressureRecommendation: '保持当前目标压强范围。',
      safetyRecommendation: '继续避开预警和报警区。',
      rhythmRecommendation: '保持当前打气节奏。',
      stableRecommendation: '保持关闭阀门后的稳定等待。',
    }),
  });
};

const scoreRelease = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScoreItem => {
  if (!input.summary.u1 || !input.summary.u2) {
    return createItem({
      id: 'release',
      label: '放气操作',
      maxScore: SCORE_MAX.release,
      score: 0,
      status: 'insufficient-data',
      evidence: '缺少 U1 或 U2。',
      relation: '无法判断快速放气造成的压强保留量。',
      recommendation: '完成放气并等待回温后记录 U2。',
      details: createReleaseDetails({
        valveScore: 0,
        responseScore: 0,
        recoverScore: 0,
        retentionScore: 0,
        durationText: '-- s',
        ratioText: '--',
        valveReason: '缺少 U1 或 U2，不能定位开阀放气段。',
        responseReason: '缺少完整记录，不能判断泄放响应。',
        recoverReason: '缺少 U2，不能判断关阀回温。',
        retentionReason: '缺少 U1 或 U2，不能计算 U2/U1。',
        valveRecommendation: '完成玻璃旋塞开闭操作。',
        responseRecommendation: '保留放气过程中的快速响应数据。',
        recoverRecommendation: '关闭旋塞后等待回温再记录 U2。',
        retentionRecommendation: '完成 U1 和 U2 记录。',
      }),
    });
  }
  const releaseStart = input.branch.events.find((event) => (
    event.type === 'stopcock-open' && event.atS > input.summary.u1!.atS
  ));
  const releaseFlowStartS = releaseStart
    ? findStopcockFlowStartTime(
        [...input.branch.samples].sort((left, right) => left.atS - right.atS),
        releaseStart.atS,
      )
    : null;
  const releaseEnd = releaseFlowStartS !== null
    ? input.branch.events.find((event) => event.type === 'stopcock-close' && event.atS >= releaseFlowStartS)
    : null;
  const durationS = releaseFlowStartS !== null && releaseEnd ? releaseEnd.atS - releaseFlowStartS : null;
  const ratio = input.summary.u1.pressureDeltaKPa > 0
    ? input.summary.u2.pressureDeltaKPa / input.summary.u1.pressureDeltaKPa
    : 0;
  const durationText = formatNumber(durationS, 1);
  const ratioText = formatNumber(ratio, 2);
  if (input.summary.u2.pressureDeltaKPa <= 0 || ratio < 0.08) {
    return createItem({
      id: 'release',
      label: '放气操作',
      maxScore: SCORE_MAX.release,
      score: 8,
      status: 'needs-improvement',
      evidence: `U2/U1 = ${ratioText}，放气 ${durationText} s。`,
      relation: 'U2 保留量过低，说明放气过度或记录链路需要复核。',
      recommendation: '下一组缩短玻璃旋塞开启时间。',
      details: createReleaseDetails({
        valveScore: 2,
        responseScore: 2,
        recoverScore: 2,
        retentionScore: 2,
        durationText: `${durationText} s`,
        ratioText,
        valveReason: '开阀放气造成过低保留量。',
        responseReason: '泄放响应过强，U2 保留不足。',
        recoverReason: '回温记录不能修复过度放气。',
        retentionReason: 'U2/U1 低于可用保留范围。',
        valveRecommendation: '下一组更快关闭玻璃旋塞。',
        responseRecommendation: '缩短泄放响应持续时间。',
        recoverRecommendation: '关阀后仍需等待回温稳定。',
        retentionRecommendation: '让 U2 保留在可计算范围内。',
      }),
    });
  }
  if (durationS !== null && (durationS < 0.25 || durationS > 2.5)) {
    return createItem({
      id: 'release',
      label: '放气操作',
      maxScore: SCORE_MAX.release,
      score: 15,
      status: 'review',
      evidence: `U2/U1 = ${ratioText}，放气 ${durationText} s。`,
      relation: '放气保留量可用，但旋塞开启时长偏离常规区间。',
      recommendation: '下一组保持更稳定的快速开闭动作。',
      details: createReleaseDetails({
        valveScore: 2,
        responseScore: 5,
        recoverScore: 4,
        retentionScore: 4,
        durationText: `${durationText} s`,
        ratioText,
        valveReason: '开阀时长偏离常规区间。',
        responseReason: '泄放响应仍可用于复盘。',
        recoverReason: '关阀回温链路完整。',
        retentionReason: 'U2/U1 保留量可用于计算。',
        valveRecommendation: '下一组保持更短、更稳定的开闭动作。',
        responseRecommendation: '结合曲线拐点复核泄放响应。',
        recoverRecommendation: '继续关闭后等待回温。',
        retentionRecommendation: '保持 U2 保留量在当前范围。',
      }),
    });
  }
  return createItem({
    id: 'release',
    label: '放气操作',
    maxScore: SCORE_MAX.release,
    score: SCORE_MAX.release,
    status: 'reasonable',
    evidence: `U2/U1 = ${ratioText}，放气 ${durationText} s。`,
    relation: '放气动作和 U2 保留量可用于本组计算。',
    recommendation: '保持当前快速开闭节奏。',
    details: createReleaseDetails({
      valveScore: 6,
      responseScore: 6,
      recoverScore: 4,
      retentionScore: 4,
      durationText: `${durationText} s`,
      ratioText,
      valveReason: '开阀放气时长处于可用范围。',
      responseReason: '泄放响应清晰。',
      recoverReason: '关阀后进入恢复记录段。',
      retentionReason: 'U2/U1 保留量可用于计算。',
      valveRecommendation: '保持当前快速开闭节奏。',
      responseRecommendation: '保持当前泄放动作。',
      recoverRecommendation: '继续关闭后等待回温。',
      retentionRecommendation: '保持当前 U2 保留量范围。',
    }),
  });
};

const scoreRecording = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScoreItem => {
  const recordPairs = [
    { id: 'u0' as const, record: input.trial.u0 },
    { id: 'u1' as const, record: input.trial.u1 },
    { id: 'u2' as const, record: input.trial.u2 },
  ];
  const unstableCount = recordPairs.reduce((count, pair) => {
    if (!pair.record) return count + 1;
    if (pair.id === 'u0') {
      return count + (Math.abs(pair.record.displayPressureMv) <= 0.5 ? 0 : 1);
    }
    const sample = findRecordTraceSample(input.branch, pair.record);
    return count + (sampleIsStableForRecording(sample, input.traceTrial) ? 0 : 1);
  }, 0);
  const blockedCount = input.branch.events.filter((event) => event.type === 'record-blocked').length;
  const score = Math.max(0, SCORE_MAX.recording - unstableCount * 5 - Math.min(2, blockedCount) * 2);
  return createItem({
    id: 'recording',
    label: '记录时机',
    maxScore: SCORE_MAX.recording,
    score,
    status: unstableCount >= 2
      ? 'needs-improvement'
      : unstableCount > 0 || blockedCount > 0
        ? 'review'
        : 'reasonable',
    evidence: unstableCount === 0
      ? 'U0 / U1 / U2 记录点均稳定。'
      : `${unstableCount} 个记录点未稳定，记录拦截 ${blockedCount} 次。`,
    relation: unstableCount === 0 && blockedCount === 0 ? '无误。' : '记录点未稳定。',
    recommendation: unstableCount === 0 ? '记录链路清晰。' : '下一组等待稳定后再记录，减少无效记录尝试。',
  });
};

const scoreRetake = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScoreItem => {
  const retakeCount = input.summary.retakeCount;
  const score = retakeCount === 0
    ? 10
    : retakeCount === 1
      ? 8
      : retakeCount === 2
        ? 6
        : 4;
  return createItem({
    id: 'retake',
    label: '重录情况',
    maxScore: SCORE_MAX.retake,
    score,
    status: retakeCount > 0 ? 'retaken' : 'reasonable',
    evidence: retakeCount > 0 ? `本组存在 ${retakeCount} 条隐藏分支。` : '本组没有重录分支。',
    relation: retakeCount > 0 ? '重录会降低记录连续性。' : '无误。',
    recommendation: retakeCount > 0 ? '后续可对比分支定位退回原因。' : '保持当前记录连续性。',
  });
};

export const scoreHeatCapacityFreeProcess = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScore => {
  const items = [
    scoreCompleteness(input.trial),
    scoreZeroing(input),
    scorePumping(input),
    scoreRelease(input),
    scoreRecording(input),
    scoreRetake(input),
  ];
  const complete = Boolean(input.trial.u0 && input.trial.u1 && input.trial.u2 && input.trial.correctedSignals);
  return {
    total: complete
      ? items.reduce((sum, item) => sum + item.score, 0)
      : null,
    maxScore: 100,
    items,
  };
};
