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
  HeatCapacityFreeStandardProcess,
} from './heatCapacityFreeStandardProcessModel.ts';
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
  standardProcess?: HeatCapacityFreeStandardProcess;
}

export const SCORE_MAX = {
  pumping: 20,
  release: 30,
  recordChain: 40,
  retake: 10,
} as const;

const RELEASE_MIN_REASONABLE_DURATION_S = 0.25;
const RELEASE_MAX_REASONABLE_DURATION_S = 2.5;
const RELEASE_SEVERE_DURATION_S = 5;

const formatNumber = (value: number | null | undefined, digits = 2) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const clampScore = (score: number, maxScore: number) => (
  Math.max(0, Math.min(maxScore, score))
);

const statusFromScore = (
  score: number,
  maxScore: number,
  insufficient = false,
): HeatCapacityProcessScoreItem['status'] => {
  if (insufficient) return 'insufficient-data';
  if (score >= maxScore) return 'reasonable';
  if (score <= maxScore * 0.45) return 'needs-improvement';
  return 'review';
};

const createSubItem = (
  item: HeatCapacityProcessScoreSubItem,
): HeatCapacityProcessScoreSubItem => (
  item.status === 'reasonable' && item.score === item.maxScore
    ? { ...item, reason: '无误。', recommendation: '无误。' }
    : item
);

const createItem = (
  item: Omit<HeatCapacityProcessScoreItem, 'details'> & {
    details: HeatCapacityProcessScoreSubItem[];
  },
): HeatCapacityProcessScoreItem => ({
  ...item,
  details: item.details.map(createSubItem),
});

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

const createPumpingDetails = (input: {
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
}): HeatCapacityProcessScoreSubItem[] => ([
  createSubItem({
    id: 'pumping-pressure-target',
    label: '目标压强',
    score: input.pressureScore,
    maxScore: 8,
    status: statusFromScore(input.pressureScore, 8),
    evidence: input.pressureEvidence,
    reason: input.pressureReason,
    recommendation: input.pressureRecommendation,
  }),
  createSubItem({
    id: 'pumping-safety',
    label: '安全提示',
    score: input.safetyScore,
    maxScore: 6,
    status: statusFromScore(input.safetyScore, 6),
    evidence: input.safetyEvidence,
    reason: input.safetyReason,
    recommendation: input.safetyRecommendation,
  }),
  createSubItem({
    id: 'pumping-rhythm',
    label: '打气节奏',
    score: input.rhythmScore,
    maxScore: 4,
    status: statusFromScore(input.rhythmScore, 4),
    evidence: input.rhythmEvidence,
    reason: input.rhythmReason,
    recommendation: input.rhythmRecommendation,
  }),
  createSubItem({
    id: 'pumping-stability',
    label: '稳定等待',
    score: input.stableScore,
    maxScore: 2,
    status: statusFromScore(input.stableScore, 2),
    evidence: input.stableEvidence,
    reason: input.stableReason,
    recommendation: input.stableRecommendation,
  }),
]);

const scorePumping = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScoreItem => {
  const pumpEvents = input.branch.events.filter((event) => event.type === 'pump-stroke');
  const warningCount = input.branch.events.filter((event) => event.type === 'pressure-warning').length;
  const dangerCount = input.branch.events.filter((event) => event.type === 'pressure-danger').length;
  const u1 = input.summary.u1;
  const u1Sample = findRecordTraceSample(input.branch, input.trial.u1);

  if (!u1) {
    const details = createPumpingDetails({
      pressureScore: 0,
      safetyScore: 0,
      rhythmScore: 0,
      stableScore: 0,
      pressureEvidence: '缺少 U1 记录。',
      safetyEvidence: '无法判断压力提示。',
      rhythmEvidence: '无法判断打气节奏。',
      stableEvidence: '无法判断稳定等待。',
      pressureReason: '没有 U1 记录，无法确认目标压强。',
      safetyReason: '缺少完整打气过程。',
      rhythmReason: '缺少完整打气过程。',
      stableReason: '缺少 U1 记录。',
      pressureRecommendation: '完成打气并记录 U1。',
      safetyRecommendation: '确认压力处于安全提示范围内。',
      rhythmRecommendation: '按稳定节奏打气。',
      stableRecommendation: '关阀后等待稳定再记录。',
    });
    return createItem({
      id: 'pumping',
      label: '打气过程',
      maxScore: SCORE_MAX.pumping,
      score: 0,
      status: 'insufficient-data',
      evidence: '缺少 U1 记录。',
      relation: '无法定位打气后的高压稳定点。',
      recommendation: '完成打气、关阀并记录 U1。',
      details,
    });
  }

  const correctedU1Mv = u1.pressureDeltaKPa * input.traceTrial.configSnapshot.sensor.pressureMvPerKPa;
  const minimum = input.traceTrial.configSnapshot.record.minimumUsefulU1CorrectedMv;
  const pressureScore = correctedU1Mv >= minimum ? 8 : 2;
  const safetyScore = dangerCount > 0 ? 0 : warningCount > 0 ? 4 : 6;
  const rhythmScore = pumpEvents.length > 0 ? 4 : 0;
  const stableScore = sampleIsStableForRecording(u1Sample, input.traceTrial) ? 2 : 0;
  const score = pressureScore + safetyScore + rhythmScore + stableScore;
  const status = correctedU1Mv < minimum || dangerCount > 0
    ? 'needs-improvement'
    : statusFromScore(score, SCORE_MAX.pumping);

  return createItem({
    id: 'pumping',
    label: '打气过程',
    maxScore: SCORE_MAX.pumping,
    score,
    status,
    evidence: `打气 ${pumpEvents.length} 次，U1 压强差 ${formatNumber(u1.pressureDeltaKPa)} kPa。`,
    relation: correctedU1Mv < minimum
      ? 'U1 低于有效记录区间。'
      : dangerCount > 0
        ? '打气过程进入压力报警区。'
        : warningCount > 0
          ? '末段接近压力提示边界。'
          : '目标压强位于有效范围。',
    recommendation: status === 'reasonable'
      ? '保持当前打气范围。'
      : '下一组调整单次加压幅度，避免过低或进入报警区。',
    details: createPumpingDetails({
      pressureScore,
      safetyScore,
      rhythmScore,
      stableScore,
      pressureEvidence: `U1 修正量 ${formatNumber(correctedU1Mv, 1)} mV。`,
      safetyEvidence: dangerCount > 0
        ? `出现 ${dangerCount} 次报警。`
        : warningCount > 0
          ? `出现 ${warningCount} 次预警。`
          : '未触发压力预警或报警。',
      rhythmEvidence: `打气 ${pumpEvents.length} 次。`,
      stableEvidence: stableScore === 2 ? 'U1 记录点稳定。' : 'U1 记录点未能确认稳定。',
      pressureReason: correctedU1Mv >= minimum ? '目标压强可用于计算。' : '目标压强不足会放大后续误差。',
      safetyReason: safetyScore === 6 ? '压力提示没有异常。' : '压力提示用于提醒末段加压边界。',
      rhythmReason: rhythmScore === 4 ? '打气事件可复盘。' : '缺少打气事件。',
      stableReason: stableScore === 2 ? '记录时读数已稳定。' : '记录时机偏离稳定要求。',
      pressureRecommendation: correctedU1Mv >= minimum ? '保持当前目标压强范围。' : '继续打气到有效区间。',
      safetyRecommendation: safetyScore === 6 ? '继续避开预警和报警区。' : '接近预警时减小单次加压。',
      rhythmRecommendation: rhythmScore === 4 ? '保持当前节奏。' : '保留可复盘的打气动作。',
      stableRecommendation: stableScore === 2 ? '保持关阀后的稳定等待。' : '等待压力和温度斜率稳定后记录。',
    }),
  });
};

const createReleaseDetails = (input: {
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
}): HeatCapacityProcessScoreSubItem[] => ([
  createSubItem({
    id: 'release-valve',
    label: '开阀放气',
    score: input.valveScore,
    maxScore: 14,
    status: statusFromScore(input.valveScore, 14),
    evidence: `放气 ${input.durationText}。`,
    reason: input.valveReason,
    recommendation: input.valveRecommendation,
  }),
  createSubItem({
    id: 'release-response',
    label: '泄放响应',
    score: input.responseScore,
    maxScore: 8,
    status: statusFromScore(input.responseScore, 8),
    evidence: `U2/U1 = ${input.ratioText}。`,
    reason: input.responseReason,
    recommendation: input.responseRecommendation,
  }),
  createSubItem({
    id: 'release-recover',
    label: '关阀回温',
    score: input.recoverScore,
    maxScore: 4,
    status: statusFromScore(input.recoverScore, 4),
    evidence: '关阀后进入恢复记录段。',
    reason: input.recoverReason,
    recommendation: input.recoverRecommendation,
  }),
  createSubItem({
    id: 'release-retention',
    label: 'U2 保留量',
    score: input.retentionScore,
    maxScore: 4,
    status: statusFromScore(input.retentionScore, 4),
    evidence: `U2/U1 = ${input.ratioText}。`,
    reason: input.retentionReason,
    recommendation: input.retentionRecommendation,
  }),
]);

const scoreRelease = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScoreItem => {
  if (!input.summary.u1 || !input.summary.u2) {
    const details = createReleaseDetails({
      valveScore: 0,
      responseScore: 0,
      recoverScore: 0,
      retentionScore: 0,
      durationText: '-- s',
      ratioText: '--',
      valveReason: '缺少 U1 或 U2。',
      responseReason: '缺少完整记录。',
      recoverReason: '缺少 U2。',
      retentionReason: '无法计算 U2/U1。',
      valveRecommendation: '完成开关旋塞操作。',
      responseRecommendation: '保留快速泄放过程数据。',
      recoverRecommendation: '关阀后等待回温再记录 U2。',
      retentionRecommendation: '完成 U1 和 U2 记录。',
    });
    return createItem({
      id: 'release',
      label: '放气操作',
      maxScore: SCORE_MAX.release,
      score: 0,
      status: 'insufficient-data',
      evidence: '缺少 U1 或 U2。',
      relation: '无法判断泄放响应。',
      recommendation: '完成放气并等待回温后记录 U2。',
      details,
    });
  }

  const releaseStart = input.branch.events.find((event) => (
    event.type === 'stopcock-open' && event.atS > input.summary.u1!.atS
  ));
  const releaseFlowStartS = releaseStart
    ? findStopcockFlowStartTime([...input.branch.samples].sort((left, right) => left.atS - right.atS), releaseStart.atS)
    : null;
  const releaseEnd = releaseFlowStartS !== null
    ? input.branch.events.find((event) => event.type === 'stopcock-close' && event.atS >= releaseFlowStartS)
    : null;
  const durationS = releaseFlowStartS !== null && releaseEnd ? releaseEnd.atS - releaseFlowStartS : null;
  const ratio = input.summary.u1.pressureDeltaKPa > 0
    ? input.summary.u2.pressureDeltaKPa / input.summary.u1.pressureDeltaKPa
    : 0;
  const durationText = `${formatNumber(durationS, 1)} s`;
  const ratioText = formatNumber(ratio, 2);
  const overVented = input.summary.u2.pressureDeltaKPa <= 0 || ratio < 0.08;
  const durationMissing = durationS === null;
  const durationReview = durationS !== null && (
    durationS < RELEASE_MIN_REASONABLE_DURATION_S ||
    durationS > RELEASE_MAX_REASONABLE_DURATION_S
  );
  const durationSevere = durationMissing || (durationS !== null && durationS > RELEASE_SEVERE_DURATION_S);
  const severeRelease = overVented || durationSevere;
  const valveScore = severeRelease ? 0 : durationReview ? 5 : 14;
  const responseScore = severeRelease ? 2 : durationReview ? 6 : 8;
  const recoverScore = severeRelease ? 2 : 4;
  const retentionScore = severeRelease ? 2 : 4;
  const score = valveScore + responseScore + recoverScore + retentionScore;

  return createItem({
    id: 'release',
    label: '放气操作',
    maxScore: SCORE_MAX.release,
    score,
    status: severeRelease ? 'needs-improvement' : durationReview ? 'review' : 'reasonable',
    evidence: `U2/U1 = ${ratioText}，放气 ${durationText}。`,
    relation: overVented
      ? 'U2 保留量过低。'
      : durationSevere
        ? '放气时间严重偏离操作窗口。'
        : durationReview
        ? '放气时长偏离常规区间。'
        : '泄放响应和 U2 保留量可用于计算。',
    recommendation: overVented
      ? '下一组缩短旋塞开启时间。'
      : durationSevere
        ? '下一组改为快速开关旋塞，避免持续放气。'
        : durationReview
        ? '下一组保持更稳定的快速开关动作。'
        : '保持当前快速开关节奏。',
    details: createReleaseDetails({
      valveScore,
      responseScore,
      recoverScore,
      retentionScore,
      durationText,
      ratioText,
      valveReason: overVented
        ? '开阀放气造成过低保留量。'
        : durationSevere
          ? '旋塞开启时间过长，已经不是快速泄放操作。'
          : durationReview
            ? '开阀放气时长偏离合理窗口。'
            : '开阀放气时长可复盘。',
      responseReason: severeRelease ? '泄放响应已经明显偏离标准操作。' : '泄放响应清晰。',
      recoverReason: severeRelease ? '回温记录不能修复前面的严重放气偏差。' : '关阀回温链路完整。',
      retentionReason: overVented
        ? 'U2/U1 低于可用保留范围。'
        : durationSevere
          ? 'U2/U1 虽然仍可计算，但持续放气已经破坏标准操作窗口。'
          : 'U2/U1 保留量可用于计算。',
      valveRecommendation: severeRelease ? '更快关闭玻璃旋塞。' : '保持当前开关动作。',
      responseRecommendation: severeRelease ? '缩短泄放响应持续时间。' : '保持当前泄放动作。',
      recoverRecommendation: '关阀后继续等待回温。',
      retentionRecommendation: overVented
        ? '让 U2 保留在可计算范围内。'
        : durationSevere
          ? '先缩短放气时间，再观察 U2 保留量。'
          : '保持当前 U2 保留范围。',
    }),
  });
};

const scoreResultDeviation = (
  relativeErrorPercent: number | null,
  hasSignals: boolean,
) => {
  if (!hasSignals || relativeErrorPercent === null || !Number.isFinite(relativeErrorPercent)) return 0;
  if (relativeErrorPercent <= 5) return 12;
  if (relativeErrorPercent <= 10) return 8;
  if (relativeErrorPercent <= 15) return 5;
  if (relativeErrorPercent <= 20) return 2;
  return 0;
};

const scoreRecordChain = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScoreItem => {
  const complete = Boolean(input.trial.u0 && input.trial.u1 && input.trial.u2 && input.trial.correctedSignals);
  const u0Score = input.trial.u0 && Math.abs(input.trial.u0.displayPressureMv) <= input.traceTrial.configSnapshot.record.u0ZeroToleranceMv
    ? 10
    : input.trial.u0
      ? 6
      : 0;
  const u1Stable = sampleIsStableForRecording(findRecordTraceSample(input.branch, input.trial.u1), input.traceTrial);
  const u2Stable = sampleIsStableForRecording(findRecordTraceSample(input.branch, input.trial.u2), input.traceTrial);
  const blockedCount = input.branch.events.filter((event) => event.type === 'record-blocked').length;
  const timingScore = (input.trial.u0 ? 2 : 0) + (u1Stable ? 4 : 0) + (u2Stable ? 4 : 0) -
    Math.min(3, blockedCount * 2);
  const completenessScore = complete ? 8 : 0;
  const resultScore = scoreResultDeviation(input.summary.relativeErrorPercent, Boolean(input.trial.correctedSignals));
  const recordTimingScore = clampScore(timingScore, 10);
  const score = completenessScore + resultScore + u0Score + recordTimingScore;
  const status = statusFromScore(score, SCORE_MAX.recordChain, !complete);
  const details = [
    createSubItem({
      id: 'record-chain-completeness',
      label: '数据完整性',
      score: completenessScore,
      maxScore: 8,
      status: statusFromScore(completenessScore, 8, !complete),
      evidence: complete ? 'U0 / U1 / U2 与计算结果完整。' : '缺少完整 U0 / U1 / U2 或计算结果。',
      reason: complete ? '数据链路完整。' : '数据链路不完整。',
      recommendation: complete ? '保持完整记录链路。' : '完成三次记录后再查看评分。',
    }),
    createSubItem({
      id: 'record-chain-result',
      label: '结果合理性',
      score: resultScore,
      maxScore: 12,
      status: statusFromScore(resultScore, 12, !input.trial.correctedSignals),
      evidence: input.trial.correctedSignals
        ? `γ = ${formatNumber(input.trial.correctedSignals.gamma, 3)}，相对误差 ${formatNumber(input.summary.relativeErrorPercent, 2)}%。`
        : '当前无有效 γ。',
      reason: resultScore === 12
        ? '实验结果接近理论参考。'
        : input.trial.correctedSignals
          ? '实验结果偏离理论参考，说明过程误差已经影响最终结果。'
          : '当前记录无法计算有效 γ。',
      recommendation: resultScore === 12
        ? '保持当前计算链路。'
        : input.trial.correctedSignals
          ? '复核放气时长、U1/U2 记录窗口和调零状态。'
          : '检查 U1、U2 是否有效且顺序正确。',
    }),
    createSubItem({
      id: 'record-chain-zeroing',
      label: '调零与 U0',
      score: u0Score,
      maxScore: 10,
      status: statusFromScore(u0Score, 10, !input.trial.u0),
      evidence: input.trial.u0 ? `U0 = ${formatNumber(input.trial.u0.displayPressureMv, 2)} mV。` : '缺少 U0。',
      reason: u0Score === 10 ? 'U0 零点接近 0。' : 'U0 零点偏离当前容差。',
      recommendation: u0Score === 10 ? '保持调零后记录。' : '调零稳定后再记录 U0。',
    }),
    createSubItem({
      id: 'record-chain-timing',
      label: '记录时机',
      score: recordTimingScore,
      maxScore: 10,
      status: statusFromScore(recordTimingScore, 10),
      evidence: `U1 ${u1Stable ? '稳定' : '未确认稳定'}，U2 ${u2Stable ? '稳定' : '未确认稳定'}。`,
      reason: recordTimingScore === 10 ? '记录点均处于稳定窗口。' : '至少一个记录点偏离稳定窗口。',
      recommendation: recordTimingScore === 10 ? '保持当前记录时机。' : '等待压力和温度斜率稳定后再记录。',
    }),
  ];

  return createItem({
    id: 'recordChain',
    label: '记录链路',
    maxScore: SCORE_MAX.recordChain,
    score,
    status,
    evidence: complete ? 'U0 / U1 / U2 与计算结果完整。' : '记录链路不完整。',
    relation: recordTimingScore === 10 && u0Score === 10 && resultScore === 12 ? '记录窗口稳定，结果偏差可接受。' : '结果偏差、记录窗口或零点仍需复核。',
    recommendation: status === 'reasonable' ? '保持当前记录链路。' : '下一组减少无效记录并等待稳定后记录。',
    details,
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
    details: [
      createSubItem({
        id: 'retake-count',
        label: '重录情况',
        score,
        maxScore: SCORE_MAX.retake,
        status: retakeCount > 0 ? 'retaken' : 'reasonable',
        evidence: retakeCount > 0 ? `隐藏分支 ${retakeCount} 条。` : '无隐藏分支。',
        reason: retakeCount > 0 ? '存在退回或重录分支。' : '无误。',
        recommendation: retakeCount > 0 ? '减少无效记录尝试。' : '无误。',
      }),
    ],
  });
};

export const scoreHeatCapacityFreeProcess = (
  input: HeatCapacityProcessScoringInput,
): HeatCapacityProcessScore => {
  const items = [
    scorePumping(input),
    scoreRelease(input),
    scoreRecordChain(input),
    scoreRetake(input),
  ];
  const complete = Boolean(input.trial.u0 && input.trial.u1 && input.trial.u2 && input.trial.correctedSignals);
  return {
    total: complete ? items.reduce((sum, item) => sum + item.score, 0) : null,
    maxScore: 100,
    items,
  };
};
