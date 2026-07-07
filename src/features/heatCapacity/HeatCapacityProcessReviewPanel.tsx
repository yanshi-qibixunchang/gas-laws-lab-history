import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type {
  HeatCapacityFreeProcessReview,
  HeatCapacityProcessChartData,
  HeatCapacityProcessControlEvent,
  HeatCapacityProcessControlKind,
  HeatCapacityProcessDiagnosisStatus,
  HeatCapacityProcessRecordEvent,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
  HeatCapacityProcessSystemKind,
  HeatCapacityProcessTracePoint,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import {
  calculateHeatCapacityProcessReviewCompressedDurationS,
  createHeatCapacityAlignedReferencePointToX,
  createHeatCapacityProcessReviewStageLayout,
  type HeatCapacityProcessReviewStageScalePoint,
} from './heatCapacityProcessReviewStageScale.ts';
import {
  formatHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import './HeatCapacityProcessReviewPanel.css';

interface HeatCapacityProcessReviewPanelProps {
  mode: 'demo' | 'guide' | 'free';
  review: HeatCapacityFreeProcessReview;
  selectedTrialId: string | null;
  onSelectedTrialChange: (trialId: string) => void;
  language?: HeatCapacityProcessReviewLanguage;
  isIdealExperimentReview?: boolean;
}

type ChartKind = 'pressure' | 'temperature';
type HeatCapacityProcessReviewLanguage = 'zh-CN' | 'zh-TW' | 'en';
type ChartLinePoint = Pick<HeatCapacityProcessTracePoint, 'timeS' | 'pressureDeltaKPa' | 'temperatureDeltaK'> &
  HeatCapacityProcessReviewStageScalePoint;
interface HeatCapacityProcessReviewCopy {
  timelineAria: string;
  timelineTitle: string;
  timelineSubtitle: string;
  controlLegendAria: string;
  stageLabels: Record<HeatCapacityProcessStageId, string>;
  controlLabels: Record<HeatCapacityProcessControlKind, string>;
  systemLabels: Record<HeatCapacityProcessSystemKind, string>;
  diagnosisStatusLabels: Record<HeatCapacityProcessDiagnosisStatus, string>;
  measured: string;
  standardReference: string;
  recordWindow: string;
  recordWindowTitle: string;
  recordTimeLabel: string;
  signalLabel: string;
  pressureDeltaLabel: string;
  temperatureDeltaLabel: string;
  recordTitle: string;
  pressureTitle: string;
  pressureSubtitle: string;
  temperatureTitle: string;
  temperatureSubtitle: string;
  pressureYLabel: string;
  temperatureYLabel: string;
  xAxisLabel: string;
  standardReferenceAssumptions: string;
  standardReferenceUnavailable: string;
  notFreeTitle: string;
  notFreeBody: string;
  missingTraceTitle: string;
  emptyTitle: string;
  emptyBody: string;
  summaryAria: string;
  currentReview: string;
  trialPrefix: string;
  trialSuffix: string;
  freeModeLabel: string;
  mainBranchLabel: string;
  relativeError: string;
  upperBoundGamma: string;
  upperBoundTheoryError: string;
  upperBoundGap: string;
  upperBoundHelp: string;
  operationScore: string;
  scoreDerived: string;
  idealScoreNotice?: string;
  retakeTitle: string;
  timeUnit: string;
  hiddenBranchPrefix: string;
  hiddenBranchSuffix: string;
  processAria: string;
  processTitle: string;
  incomplete: string;
  retakeShort: string;
  diagnosisAria: string;
  diagnosisTitle: string;
  groupPrefix: string;
  groupSuffix: string;
  collapse: string;
  expand: string;
  scoreDetailSuffix: string;
  noIssue: string;
}
interface ChartAxis {
  min: number;
  max: number;
  ticks: number[];
}

const SVG_WIDTH = 1240;
const TRACK_LEFT = 42;
const TRACK_RIGHT = SVG_WIDTH - 34;
const TIMELINE_HEIGHT = 176;
const TIMELINE_BAR_Y = 82;
const TIMELINE_BAR_HEIGHT = 24;
const RECORD_Y = TIMELINE_BAR_Y - 8;
const CONTROL_Y = TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT + 8;
const CHART_HEIGHT = 246;
const PLOT_LABEL_X = 24;
const PLOT_LEFT = 42;
const PLOT_RIGHT = SVG_WIDTH - 34;
const PLOT_TOP = 34;
const PLOT_BOTTOM = 190;
const MAJOR_TICK_LENGTH = 5;
const LONG_TICK_LENGTH = MAJOR_TICK_LENGTH * 1.3;
const RECORD_WINDOW_WIDTH = 18;

const stagePalette: Record<HeatCapacityProcessStageId, string> = {
  zero: '#7b8da0',
  fill: '#c78639',
  pump: '#348990',
  stabilize: '#637f55',
  release: '#a87332',
  recover: '#8a68a0',
};

const controlPalette: Record<HeatCapacityProcessControlKind, string> = {
  power: '#6f8091',
  pumpValve: '#14804f',
  pumpBulb: '#0b6fae',
  stopcock: '#a2682a',
};

const standardWindowStageByRecordId: Record<string, HeatCapacityProcessStageId> = {
  u0: 'zero',
  u1: 'stabilize',
  u2: 'recover',
};

const controlLabels: Record<HeatCapacityProcessControlKind, string> = {
  power: '电源',
  pumpValve: '打气阀',
  pumpBulb: '打气球',
  stopcock: '玻璃旋塞',
};

const stageLabelsZhCn: Record<HeatCapacityProcessStageId, string> = {
  zero: '调零',
  fill: '快速充气',
  pump: '打气',
  stabilize: '回温稳定',
  release: '开阀放气',
  recover: '关阀回温',
};

const diagnosisStatusLabels: Record<HeatCapacityProcessDiagnosisStatus, string> = {
  reasonable: '合理',
  review: '可审核',
  'needs-improvement': '需加强',
  retaken: '有重录',
  'insufficient-data': '数据不足',
};

const systemBadgeClass: Record<HeatCapacityProcessSystemKind, string> = {
  warning: 'hpr-system-warning',
  danger: 'hpr-system-danger',
  blocked: 'hpr-system-blocked',
  retake: 'hpr-system-retake',
};

const heatCapacityProcessReviewCopy: Record<HeatCapacityProcessReviewLanguage, HeatCapacityProcessReviewCopy> = {
  'zh-CN': {
    timelineAria: '实验阶段时间轴',
    timelineTitle: '阶段时间轴',
    timelineSubtitle: '记录事件 / 控件事件 / 系统标签',
    controlLegendAria: '控件事件图例',
    stageLabels: stageLabelsZhCn,
    controlLabels,
    systemLabels: {
      warning: '警告',
      danger: '危险',
      blocked: '拦截',
      retake: '重录',
    },
    diagnosisStatusLabels,
    measured: '实测',
    standardReference: '标准过程',
    recordWindow: '记录窗口',
    recordWindowTitle: 'U0/U1/U2 最佳记录窗口',
    recordTimeLabel: '记录时间',
    signalLabel: '电信号',
    pressureDeltaLabel: '换算压强差',
    temperatureDeltaLabel: '换算温度差',
    recordTitle: '实际记录时刻',
    pressureTitle: '压强差过程',
    pressureSubtitle: '由 Uₚ 换算',
    temperatureTitle: '温度变化过程',
    temperatureSubtitle: '由 Uₜ 换算',
    pressureYLabel: 'ΔP (kPa)',
    temperatureYLabel: 'ΔT (K)',
    xAxisLabel: '过程时间 (s，等待压缩)',
    standardReferenceAssumptions: '同一参数和干扰条件下生成；标准操作窗口用于估计本组可达到的操作上限。',
    standardReferenceUnavailable: '当前参数下未生成可用标准过程。',
    notFreeTitle: '过程回顾仅用于自由模式',
    notFreeBody: '演示模式和引导模式保持教学预设行为，不读取自由模式真实 trace。',
    missingTraceTitle: '本组缺少过程 trace',
    emptyTitle: '暂无可回顾的自由模式实验组',
    emptyBody: '完成 U0、U1、U2 记录后，这里会显示过程曲线、结果摘要和操作诊断。',
    summaryAria: '过程回顾摘要',
    currentReview: '当前回顾',
    trialPrefix: '第 ',
    trialSuffix: ' 组实验',
    freeModeLabel: 'Free Mode',
    mainBranchLabel: '主线',
    relativeError: '相对误差',
    upperBoundGamma: '操作上限 γ',
    upperBoundTheoryError: '上限对理论误差',
    upperBoundGap: '与上限差距',
    upperBoundHelp: '操作上限表示同一参数和干扰条件下，标准操作可达到的参考结果，用于判断本组误差中有多少来自操作时机。若实际结果高于标准操作参考，则以实际结果作为本组操作上限。',
    operationScore: '操作评分',
    scoreDerived: '基于本次 trace 派生',
    retakeTitle: '退回 / 重录',
    timeUnit: '次',
    hiddenBranchPrefix: '隐藏分支 ',
    hiddenBranchSuffix: ' 条',
    processAria: '过程诊断图',
    processTitle: '过程诊断图',
    incomplete: '未完成',
    retakeShort: '重录',
    diagnosisAria: '实验诊断',
    diagnosisTitle: '实验诊断',
    groupPrefix: '第 ',
    groupSuffix: ' 组',
    collapse: '收起',
    expand: '展开',
    scoreDetailSuffix: '评分明细',
    noIssue: '无误',
  },
  'zh-TW': {
    timelineAria: '實驗階段時間軸',
    timelineTitle: '階段時間軸',
    timelineSubtitle: '記錄事件 / 控件事件 / 系統標籤',
    controlLegendAria: '控件事件圖例',
    stageLabels: {
      zero: '調零',
      fill: '快速充氣',
      pump: '打氣',
      stabilize: '回溫穩定',
      release: '開閥放氣',
      recover: '關閥回溫',
    },
    controlLabels: {
      power: '電源',
      pumpValve: '打氣閥',
      pumpBulb: '打氣球',
      stopcock: '玻璃旋塞',
    },
    systemLabels: {
      warning: '警告',
      danger: '危險',
      blocked: '攔截',
      retake: '重錄',
    },
    diagnosisStatusLabels: {
      reasonable: '合理',
      review: '可審核',
      'needs-improvement': '需加強',
      retaken: '有重錄',
      'insufficient-data': '數據不足',
    },
    measured: '實測',
    standardReference: '標準過程',
    recordWindow: '記錄窗口',
    recordWindowTitle: 'U0/U1/U2 最佳記錄窗口',
    recordTimeLabel: '記錄時間',
    signalLabel: '電信號',
    pressureDeltaLabel: '換算壓強差',
    temperatureDeltaLabel: '換算溫度差',
    recordTitle: '實際記錄時刻',
    pressureTitle: '壓強差過程',
    pressureSubtitle: '由 Uₚ 換算',
    temperatureTitle: '溫度變化過程',
    temperatureSubtitle: '由 Uₜ 換算',
    pressureYLabel: 'ΔP (kPa)',
    temperatureYLabel: 'ΔT (K)',
    xAxisLabel: '過程時間 (s，等待壓縮)',
    standardReferenceAssumptions: '同一參數和干擾條件下生成；標準操作窗口用於估計本組可達到的操作上限。',
    standardReferenceUnavailable: '目前參數下未生成可用標準過程。',
    notFreeTitle: '過程回顧僅用於自由模式',
    notFreeBody: '演示模式和引導模式保持教學預設行為，不讀取自由模式真實 trace。',
    missingTraceTitle: '本組缺少過程 trace',
    emptyTitle: '暫無可回顧的自由模式實驗組',
    emptyBody: '完成 U0、U1、U2 記錄後，這裡會顯示過程曲線、結果摘要和操作診斷。',
    summaryAria: '過程回顧摘要',
    currentReview: '目前回顧',
    trialPrefix: '第 ',
    trialSuffix: ' 組實驗',
    freeModeLabel: 'Free Mode',
    mainBranchLabel: '主線',
    relativeError: '相對誤差',
    upperBoundGamma: '操作上限 γ',
    upperBoundTheoryError: '上限對理論誤差',
    upperBoundGap: '與上限差距',
    upperBoundHelp: '操作上限表示同一參數和干擾條件下，標準操作可達到的參考結果，用於判斷本組誤差中有多少來自操作時機。若實際結果高於標準操作參考，則以實際結果作為本組操作上限。',
    operationScore: '操作評分',
    scoreDerived: '基於本次 trace 派生',
    retakeTitle: '退回 / 重錄',
    timeUnit: '次',
    hiddenBranchPrefix: '隱藏分支 ',
    hiddenBranchSuffix: ' 條',
    processAria: '過程診斷圖',
    processTitle: '過程診斷圖',
    incomplete: '未完成',
    retakeShort: '重錄',
    diagnosisAria: '實驗診斷',
    diagnosisTitle: '實驗診斷',
    groupPrefix: '第 ',
    groupSuffix: ' 組',
    collapse: '收起',
    expand: '展開',
    scoreDetailSuffix: '評分明細',
    noIssue: '無誤',
  },
  en: {
    timelineAria: 'Experiment stage timeline',
    timelineTitle: 'Stage timeline',
    timelineSubtitle: 'Record events / control events / system tags',
    controlLegendAria: 'Control event legend',
    stageLabels: {
      zero: 'Zero',
      fill: 'Fast fill',
      pump: 'Pumping',
      stabilize: 'Thermal settle',
      release: 'Valve release',
      recover: 'Valve closed recovery',
    },
    controlLabels: {
      power: 'Power',
      pumpValve: 'Pump valve',
      pumpBulb: 'Pump bulb',
      stopcock: 'Stopcock',
    },
    systemLabels: {
      warning: 'Warning',
      danger: 'Danger',
      blocked: 'Blocked',
      retake: 'Retake',
    },
    diagnosisStatusLabels: {
      reasonable: 'OK',
      review: 'Review',
      'needs-improvement': 'Improve',
      retaken: 'Retaken',
      'insufficient-data': 'Insufficient',
    },
    measured: 'Measured',
    standardReference: 'Standard process',
    recordWindow: 'Record window',
    recordWindowTitle: 'Best U0/U1/U2 record window',
    recordTimeLabel: 'Record time',
    signalLabel: 'Signal',
    pressureDeltaLabel: 'Converted ΔP',
    temperatureDeltaLabel: 'Converted ΔT',
    recordTitle: 'Actual record time',
    pressureTitle: 'Pressure difference',
    pressureSubtitle: 'Converted from Uₚ',
    temperatureTitle: 'Temperature change',
    temperatureSubtitle: 'Converted from Uₜ',
    pressureYLabel: 'ΔP (kPa)',
    temperatureYLabel: 'ΔT (K)',
    xAxisLabel: 'Process time (s, waits compressed)',
    standardReferenceAssumptions: 'Generated with the same parameters and disturbance settings; standard operation windows estimate this trial operation limit.',
    standardReferenceUnavailable: 'No standard process is available with the current parameters.',
    notFreeTitle: 'Process review is Free Mode only',
    notFreeBody: 'Demo and guided modes keep their teaching presets and do not read the real Free Mode trace.',
    missingTraceTitle: 'This trial is missing its process trace',
    emptyTitle: 'No reviewable Free Mode trial yet',
    emptyBody: 'After recording U0, U1, and U2, this area shows process curves, result summary, and operation diagnostics.',
    summaryAria: 'Process review summary',
    currentReview: 'Current review',
    trialPrefix: 'Trial ',
    trialSuffix: '',
    freeModeLabel: 'Free Mode',
    mainBranchLabel: 'main branch',
    relativeError: 'Relative error',
    upperBoundGamma: 'Operation limit γ',
    upperBoundTheoryError: 'Limit error vs theory',
    upperBoundGap: 'Gap to limit',
    upperBoundHelp: 'The operation limit is the reference result that standard operation can reach under the same parameters and disturbances. It shows how much of this trial error comes from operation timing. If the actual result is higher than the standard reference, the actual result becomes this trial operation limit.',
    operationScore: 'Operation score',
    scoreDerived: 'Derived from this trace',
    retakeTitle: 'Backtrack / retake',
    timeUnit: 'times',
    hiddenBranchPrefix: 'Hidden branches ',
    hiddenBranchSuffix: '',
    processAria: 'Process diagnostics chart',
    processTitle: 'Process diagnostics',
    incomplete: 'Incomplete',
    retakeShort: 'retakes',
    diagnosisAria: 'Experiment diagnostics',
    diagnosisTitle: 'Experiment diagnostics',
    groupPrefix: 'Trial ',
    groupSuffix: '',
    collapse: 'Collapse ',
    expand: 'Expand ',
    scoreDetailSuffix: ' score details',
    noIssue: 'No issue',
  },
};

const idealScoreNoticeByLanguage: Record<HeatCapacityProcessReviewLanguage, string> = {
  'zh-CN': '理想实验条件不参与评分。',
  'zh-TW': '理想實驗條件不參與評分。',
  en: 'Ideal experiment conditions are not scored.',
};

const getHeatCapacityProcessReviewCopy = (
  language: HeatCapacityProcessReviewLanguage,
) => heatCapacityProcessReviewCopy[language] ?? heatCapacityProcessReviewCopy['zh-CN'];

const formatStandardProcessSummary = (
  language: HeatCapacityProcessReviewLanguage,
  targetPressure: string,
  releaseDuration: string,
  gamma: string,
  error: string,
) => {
  if (language === 'en') {
    return `Same-condition standard operation to ${targetPressure}; valve open ${releaseDuration}; reference γ = ${gamma}, error ${error}.`;
  }
  if (language === 'zh-TW') {
    return `同一參數和干擾條件下標準操作至 ${targetPressure}；開閥 ${releaseDuration}；參考 γ = ${gamma}，誤差 ${error}。`;
  }
  return `同一参数和干扰条件下标准操作至 ${targetPressure}；开阀 ${releaseDuration}；参考 γ = ${gamma}，误差 ${error}。`;
};

const formatTrialLabel = (
  copy: HeatCapacityProcessReviewCopy,
  trialIndex: number,
) => `${copy.trialPrefix}${trialIndex}${copy.trialSuffix}`;

const formatGroupLabel = (
  copy: HeatCapacityProcessReviewCopy,
  trialIndex: number,
) => `${copy.groupPrefix}${trialIndex}${copy.groupSuffix}`;

const formatRetakeCount = (
  copy: HeatCapacityProcessReviewCopy,
  count: number,
) => `${count} ${copy.timeUnit}`;

const formatHiddenBranchCount = (
  copy: HeatCapacityProcessReviewCopy,
  count: number,
) => `${copy.hiddenBranchPrefix}${count}${copy.hiddenBranchSuffix}`;

const formatMetric = (
  value: number | null | undefined,
  digits = 2,
  suffix = '',
) => (
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(digits)}${suffix}`
    : '--'
);

const formatScore = (score: number | null | undefined, max = 100) => (
  typeof score === 'number' && Number.isFinite(score)
    ? `${score} / ${max}`
    : '--'
);

const normalizeDiagnosisText = (value: string | null | undefined, fallback = '无误') => {
  const text = (value ?? '--')
    .replace(/[\u3002\uff1b;]+/gu, '\uff0c')
    .replace(/\uff0c\s*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createNiceStep = (rawStep: number) => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / power;
  const niceNormalized = normalized <= 1
    ? 1
    : normalized <= 2
      ? 2
      : normalized <= 5
        ? 5
        : 10;
  return niceNormalized * power;
};

const createNiceAxis = (
  trace: ChartLinePoint[],
  kind: ChartKind,
): ChartAxis => {
  const values = trace.map((point) => (kind === 'pressure' ? point.pressureDeltaKPa : point.temperatureDeltaK));
  if (values.length === 0) {
    const fallback = kind === 'pressure' ? { min: 0, max: 8 } : { min: -2, max: 6 };
    return {
      ...fallback,
      ticks: Array.from(
        { length: kind === 'pressure' ? 5 : 5 },
        (_, index) => fallback.min + ((fallback.max - fallback.min) / 4) * index,
      ),
    };
  }
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, kind === 'pressure' ? 4 : 2);
  const padding = kind === 'pressure' ? 0.8 : 0.6;
  const paddedMin = kind === 'pressure' ? 0 : minValue - padding;
  const paddedMax = maxValue + padding;
  const targetTickCount = kind === 'pressure' ? 5 : 6;
  const step = createNiceStep((paddedMax - paddedMin) / Math.max(1, targetTickCount - 1));
  const min = kind === 'pressure' ? 0 : Math.floor(paddedMin / step) * step;
  const max = Math.max(min + step, Math.ceil(paddedMax / step) * step);
  const ticks: number[] = [];
  for (let tick = min; tick <= max + step * 0.5; tick += step) {
    ticks.push(Number(tick.toFixed(6)));
  }
  return { min, max, ticks };
};

const valueToY = (value: number, domain: { min: number; max: number }) => {
  const ratio = (clamp(value, domain.min, domain.max) - domain.min) / (domain.max - domain.min || 1);
  return PLOT_BOTTOM - ratio * (PLOT_BOTTOM - PLOT_TOP);
};

const getChartPointValue = (point: ChartLinePoint, kind: ChartKind) => (
  kind === 'pressure' ? point.pressureDeltaKPa : point.temperatureDeltaK
);

const isPumpStageTime = (
  timeS: number,
  stages: HeatCapacityProcessStageSegment[],
) => stages.some((stage) => (
  stage.id === 'pump' &&
  timeS >= stage.startS &&
  timeS <= stage.endS
));

const buildPumpAwareLinePath = (
  points: ChartLinePoint[],
  kind: ChartKind,
  pointToX: (point: ChartLinePoint) => number,
  domain: { min: number; max: number },
  stages: HeatCapacityProcessStageSegment[],
) => {
  if (points.length === 0) return '';
  const commands: string[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const x = pointToX(point);
    const y = valueToY(getChartPointValue(point, kind), domain);
    if (index === 0) {
      commands.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
      continue;
    }
    const previous = points[index - 1];
    const previousX = pointToX(previous);
    const previousY = valueToY(getChartPointValue(previous, kind), domain);
    const segmentIsPump = isPumpStageTime(previous.timeS, stages) && isPumpStageTime(point.timeS, stages);
    if (segmentIsPump && Math.abs(x - previousX) > 0.01) {
      commands.push(`L ${x.toFixed(2)} ${previousY.toFixed(2)}`);
    }
    commands.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return commands.join(' ');
};

const buildContinuousLinePath = (
  points: ChartLinePoint[],
  kind: ChartKind,
  pointToX: (point: ChartLinePoint) => number,
  domain: { min: number; max: number },
) => {
  if (points.length === 0) return '';
  return points.map((point, index) => {
    const x = pointToX(point);
    const y = valueToY(getChartPointValue(point, kind), domain);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
};

const formatSeconds = (time: number) => `${time.toFixed(time % 1 === 0 ? 0 : 1)} s`;

const getRecordCallout = (
  record: HeatCapacityProcessRecordEvent,
  timeToX: (time: number) => number,
) => {
  const x = timeToX(record.timeS);
  const preferLeft = record.id !== 'u0';
  const elbowX = x + (preferLeft ? -24 : 24);
  const lineY = record.id === 'u0' ? 44 : record.id === 'u1' ? 46 : 48;
  const labelX = x + (preferLeft ? -76 : 48);
  const horizontalEnd = labelX + (preferLeft ? -2 : 42);
  return {
    x,
    path: `M ${x.toFixed(2)} ${RECORD_Y.toFixed(2)} L ${elbowX.toFixed(2)} ${lineY.toFixed(2)} L ${horizontalEnd.toFixed(2)} ${lineY.toFixed(2)}`,
    labelX,
    labelY: lineY - 9,
    detailX: preferLeft ? labelX - 124 : labelX - 10,
    detailY: lineY + 4,
  };
};

const renderRecordDetail = (
  record: HeatCapacityProcessRecordEvent,
  callout: ReturnType<typeof getRecordCallout>,
  copy: HeatCapacityProcessReviewCopy,
) => (
  <g className="hpr-record-detail hpr-record-detail-visible">
    <rect x={callout.detailX} y={callout.detailY} width={184} height={100} rx={5} />
    <text x={callout.detailX + 12} y={callout.detailY + 22}>{copy.recordTimeLabel}: {formatSeconds(record.timeS)}</text>
    <text x={callout.detailX + 12} y={callout.detailY + 44}>{copy.signalLabel}: {formatHeatCapacitySignalMv(record.signalMv)} mV</text>
    <text x={callout.detailX + 12} y={callout.detailY + 66}>{copy.pressureDeltaLabel}: {record.pressureDeltaKPa.toFixed(2)} kPa</text>
    <text x={callout.detailX + 12} y={callout.detailY + 88}>{copy.temperatureDeltaLabel}: {record.temperatureDeltaK.toFixed(2)} K</text>
  </g>
);

const getControlCallout = (
  event: HeatCapacityProcessControlEvent,
  timeToX: (time: number) => number,
) => {
  const x = timeToX(event.timeS);
  const preferLeft = event.timeS > 58;
  const elbowX = x + (preferLeft ? -16 : 16);
  const lineY = 146;
  const endX = x + (preferLeft ? -82 : 82);
  const labelX = x + (preferLeft ? -80 : 26);
  return {
    x,
    path: `M ${x.toFixed(2)} ${CONTROL_Y.toFixed(2)} L ${elbowX.toFixed(2)} ${lineY.toFixed(2)} L ${endX.toFixed(2)} ${lineY.toFixed(2)}`,
    labelX,
    labelY: lineY - 8,
  };
};

const SharedTimeline: React.FC<{
  chart: HeatCapacityProcessChartData;
  copy: HeatCapacityProcessReviewCopy;
  sharedCompressedDurationS: number;
  hoveredStageId: HeatCapacityProcessStageId | null;
  hoveredControlId: string | null;
  hoveredRecordId: string | null;
  onStageHover: (stageId: HeatCapacityProcessStageId | null) => void;
  onControlHover: (eventId: string | null) => void;
  onRecordHover: (eventId: string | null) => void;
}> = ({
  chart,
  copy,
  sharedCompressedDurationS,
  hoveredStageId,
  hoveredControlId,
  hoveredRecordId,
  onStageHover,
  onControlHover,
  onRecordHover,
}) => {
  const stageLayout = useMemo(
    () => createHeatCapacityProcessReviewStageLayout({
      stages: chart.stages,
      plotLeft: TRACK_LEFT,
      plotRight: TRACK_RIGHT,
      compressedTotalS: sharedCompressedDurationS,
    }),
    [chart.stages, sharedCompressedDurationS],
  );
  const timeToX = stageLayout.timeToX;
  const hoveredRecordDetail = hoveredRecordId
    ? chart.records.find((record) => record.id === hoveredRecordId) ?? null
    : null;
  return (
    <section
      className="hpr-timeline-block"
      aria-label={copy.timelineAria}
    >
      <div className="hpr-freeze-heading hpr-timeline-freeze-heading">
        <div className="hpr-freeze-heading-title">
          <span>{copy.timelineTitle}</span>
          <small>{copy.timelineSubtitle}</small>
        </div>
        <div className="hpr-freeze-legend" aria-label={copy.controlLegendAria}>
          {(Object.keys(controlLabels) as HeatCapacityProcessControlKind[]).map((kind) => (
            <span key={kind}>
              <i style={{ background: controlPalette[kind] }} />
              {copy.controlLabels[kind]}
            </span>
          ))}
        </div>
      </div>
      <svg
        className={`hpr-timeline-svg ${hoveredStageId ? 'hpr-timeline-svg-hovered' : ''}`}
        viewBox={`0 0 ${SVG_WIDTH} ${TIMELINE_HEIGHT}`}
        preserveAspectRatio="xMinYMin meet"
        width="100%"
        height={TIMELINE_HEIGHT}
        role="img"
        aria-label={copy.timelineAria}
      >
        {chart.stages.map((stage) => {
          const range = stageLayout.rangeToXRange(stage.startS, stage.endS);
          const x = range.x;
          const width = range.width;
          const hovered = hoveredStageId === stage.id;
          const label = [copy.stageLabels[stage.id], stage.countText, stage.durationText].filter(Boolean).join(' ');
          return (
            <g
              key={stage.id}
              className={`hpr-stage hpr-stage-${stage.id} ${hovered ? 'hpr-stage-hovered' : ''}`}
            >
              <rect
                className="hpr-stage-bar"
                x={x}
                y={TIMELINE_BAR_Y}
                width={width}
                height={TIMELINE_BAR_HEIGHT}
                fill={stagePalette[stage.id]}
                onMouseEnter={() => onStageHover(stage.id)}
                onMouseLeave={() => onStageHover(null)}
              />
              <line className="hpr-stage-seam" x1={x} y1={TIMELINE_BAR_Y} x2={x} y2={TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT} />
              <text className="hpr-stage-label hpr-stage-label-visible" x={x + width / 2} y={TIMELINE_BAR_Y + 18} textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })}

        {chart.systemEvents.map((event) => {
          const x = timeToX(event.timeS);
          return (
            <foreignObject
              key={event.id}
              x={x - 24}
              y={TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT + 34}
              width={76}
              height={26}
              className={`hpr-system-event ${hoveredControlId ? 'hpr-system-event-dimmed' : ''}`}
            >
              <div className={`hpr-system-badge ${systemBadgeClass[event.kind]}`}>
                {copy.systemLabels[event.kind]}
              </div>
            </foreignObject>
          );
        })}

        {chart.records.map((record) => {
          const callout = getRecordCallout(record, timeToX);
          return (
            <g className="hpr-record-event" key={record.id}>
              <path className="hpr-record-line" d={callout.path} />
              <circle className="hpr-record-hit" cx={callout.x} cy={RECORD_Y} r={10} />
              <circle className="hpr-record-ring" cx={callout.x} cy={RECORD_Y} r={5.4} />
              <g
                className="hpr-record-label-hit"
                onMouseEnter={() => onRecordHover(record.id)}
                onMouseLeave={() => onRecordHover(null)}
              >
                <text className="hpr-record-label" x={callout.labelX} y={callout.labelY}>
                  {record.label}
                </text>
                <rect x={callout.labelX - 8} y={callout.labelY - 17} width={48} height={24} fill="transparent" />
              </g>
            </g>
          );
        })}

        {chart.controls.map((event) => {
          const callout = getControlCallout(event, timeToX);
          const hovered = hoveredControlId === event.id;
          const color = controlPalette[event.kind];
          return (
            <g
              className="hpr-control-event"
              key={event.id}
              onMouseEnter={() => onControlHover(event.id)}
              onMouseLeave={() => onControlHover(null)}
            >
              <circle className="hpr-control-hit" cx={callout.x} cy={CONTROL_Y} r={8} />
              <circle className="hpr-control-dot" cx={callout.x} cy={CONTROL_Y} r={3.4} fill={color} />
              <g className={`hpr-control-callout ${hovered ? 'hpr-control-callout-visible' : ''}`}>
                <path d={callout.path} stroke={color} />
                <text x={callout.labelX} y={callout.labelY} fill={color}>{copy.controlLabels[event.kind]}</text>
              </g>
            </g>
          );
        })}
        {hoveredRecordDetail ? (
          <g className="hpr-record-detail-layer">
            {renderRecordDetail(hoveredRecordDetail, getRecordCallout(hoveredRecordDetail, timeToX), copy)}
          </g>
        ) : null}
      </svg>
    </section>
  );
};

const ProcessChart: React.FC<{
  kind: ChartKind;
  chart: HeatCapacityProcessChartData;
  copy: HeatCapacityProcessReviewCopy;
  hoveredStageId: HeatCapacityProcessStageId | null;
  showXAxis?: boolean;
}> = ({
  kind,
  chart,
  copy,
  hoveredStageId,
  showXAxis = true,
}) => {
  const standardReference = chart.standardReference;
  const standardStages = standardReference?.stages.length ? standardReference.stages : chart.stages;
  const standardCurveTrace = standardReference?.trace ?? [];
  const standardCurveWindows = standardReference?.recordWindows ?? [];
  const sharedCompressedDurationS = useMemo(
    () => Math.max(
      calculateHeatCapacityProcessReviewCompressedDurationS(chart.stages),
      calculateHeatCapacityProcessReviewCompressedDurationS(standardStages),
    ),
    [chart.stages, standardStages],
  );
  const stageLayout = useMemo(
    () => createHeatCapacityProcessReviewStageLayout({
      stages: chart.stages,
      plotLeft: PLOT_LEFT,
      plotRight: PLOT_RIGHT,
      compressedTotalS: sharedCompressedDurationS,
    }),
    [chart.stages, sharedCompressedDurationS],
  );
  const standardStageLayout = useMemo(
    () => createHeatCapacityProcessReviewStageLayout({
      stages: standardStages,
      plotLeft: PLOT_LEFT,
      plotRight: PLOT_RIGHT,
      compressedTotalS: sharedCompressedDurationS,
    }),
    [standardStages, sharedCompressedDurationS],
  );
  const alignedStandardPointToX = useMemo(
    () => createHeatCapacityAlignedReferencePointToX({
      actualStages: chart.stages,
      referenceStages: standardStages,
      actualTimeToX: stageLayout.timeToX,
      referencePointToX: standardStageLayout.pointToX,
      actualStageId: 'pump',
      referenceStageId: 'pump',
    }),
    [chart.stages, standardStages, stageLayout, standardStageLayout],
  );
  const timeToX = stageLayout.timeToX;
  const axis = useMemo(
    () => createNiceAxis([
      ...chart.actualTrace,
      ...standardCurveTrace,
    ], kind),
    [chart.actualTrace, standardCurveTrace, kind],
  );
  const linePath = useMemo(
    () => buildPumpAwareLinePath(
      chart.actualTrace,
      kind,
      (point) => stageLayout.timeToX(point.timeS),
      axis,
      chart.stages,
    ),
    [chart.stages, chart.actualTrace, kind, stageLayout, axis],
  );
  const standardPath = useMemo(
    () => buildContinuousLinePath(
      standardCurveTrace,
      kind,
      (point) => alignedStandardPointToX(point),
      axis,
    ),
    [standardCurveTrace, kind, alignedStandardPointToX, axis],
  );
  const yTicks = axis.ticks;
  const xTicks = stageLayout.axisTicks;
  const hoveredStage = hoveredStageId
    ? chart.stages.find((stage) => stage.id === hoveredStageId) ?? null
    : null;
  const hoveredStageRange = hoveredStage
    ? stageLayout.rangeToXRange(hoveredStage.startS, hoveredStage.endS)
    : { x: 0, width: 0 };
  const stroke = kind === 'pressure' ? 'var(--hpr-pressure-line)' : 'var(--hpr-temperature-line)';
  const title = kind === 'pressure' ? copy.pressureTitle : copy.temperatureTitle;
  const subtitle = kind === 'pressure' ? copy.pressureSubtitle : copy.temperatureSubtitle;
  const yLabel = kind === 'pressure' ? copy.pressureYLabel : copy.temperatureYLabel;

  return (
    <section className="hpr-chart-block" aria-label={title}>
      <div className="hpr-freeze-heading hpr-chart-freeze-heading">
        <div className="hpr-freeze-heading-title">
          <span>{title}</span>
          <small>{subtitle}</small>
        </div>
        <div className="hpr-chart-line-legend" aria-label={`${title} legend`}>
          <span className="hpr-line-legend hpr-line-legend-trace">{copy.measured}</span>
          <span className="hpr-line-legend hpr-line-legend-standard-process">{copy.standardReference}</span>
          <span
            className="hpr-tooltip-anchor hpr-line-legend hpr-line-legend-window"
            data-hpr-tooltip={copy.recordWindowTitle}
            aria-label={`${copy.recordWindow}: ${copy.recordWindowTitle}`}
          >
            {copy.recordWindow}
          </span>
        </div>
      </div>
      <svg
        className="hpr-chart-svg"
        viewBox={`0 0 ${SVG_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMinYMin meet"
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label={showXAxis ? `${title}, ${yLabel}, ${copy.xAxisLabel}` : `${title}, ${yLabel}`}
      >
        {hoveredStage ? (
          <rect
            className={`hpr-stage-focus-area hpr-stage-focus-area-${hoveredStage.id}`}
            x={hoveredStageRange.x}
            y={PLOT_TOP}
            width={hoveredStageRange.width}
            height={PLOT_BOTTOM - PLOT_TOP}
            fill={stagePalette[hoveredStage.id]}
          />
        ) : null}
        <rect className="hpr-plot-frame" x={PLOT_LEFT} y={PLOT_TOP} width={PLOT_RIGHT - PLOT_LEFT} height={PLOT_BOTTOM - PLOT_TOP} />
        {chart.records.map((record) => {
          const centerX = timeToX(record.timeS);
          const x = clamp(centerX - RECORD_WINDOW_WIDTH / 2, PLOT_LEFT, PLOT_RIGHT - RECORD_WINDOW_WIDTH);
          return (
            <g className={`hpr-record-window hpr-record-window-${record.id}`} key={`${kind}-${record.id}`}>
              <rect x={x} y={PLOT_TOP} width={RECORD_WINDOW_WIDTH} height={PLOT_BOTTOM - PLOT_TOP} />
              <title>{`${record.label} ${copy.recordTitle}: ${formatSeconds(record.timeS)}`}</title>
            </g>
          );
        })}
        {standardCurveWindows.map((window) => {
          const stageId = standardWindowStageByRecordId[window.recordId] ?? undefined;
          const startX = alignedStandardPointToX({ stageId, timeS: window.startS });
          const endX = alignedStandardPointToX({ stageId, timeS: window.endS });
          const x = clamp(Math.min(startX, endX), PLOT_LEFT, PLOT_RIGHT);
          const width = Math.max(2, Math.min(PLOT_RIGHT, Math.max(startX, endX)) - x);
          return (
            <g className={`hpr-standard-window hpr-standard-window-${window.recordId}`} key={`${kind}-standard-${window.recordId}`}>
              <rect x={x} y={PLOT_TOP} width={width} height={PLOT_BOTTOM - PLOT_TOP} />
              <title>{`${window.recordId.toUpperCase()} ${copy.standardReference}: ${formatSeconds(window.startS)} - ${formatSeconds(window.endS)}`}</title>
            </g>
          );
        })}

        {xTicks.map((tick) => {
          const isEdgeTick = Math.abs(tick.x - PLOT_LEFT) < 0.000001 || Math.abs(tick.x - PLOT_RIGHT) < 0.000001;
          const tickLength = tick.kind === 'major' ? LONG_TICK_LENGTH : MAJOR_TICK_LENGTH;
          const tickClass = tick.kind === 'minor' ? 'hpr-axis-tick-minor' : 'hpr-axis-tick-major';
          return (
            <g className={`hpr-axis-tick ${tickClass} ${showXAxis ? '' : 'hpr-axis-tick-muted'}`} key={`x-${kind}-${tick.kind}-${tick.stageId}-${tick.timeS}`}>
              {!isEdgeTick ? (
                <>
                  <line x1={tick.x} y1={PLOT_BOTTOM} x2={tick.x} y2={PLOT_BOTTOM - tickLength} />
                  <line x1={tick.x} y1={PLOT_TOP} x2={tick.x} y2={PLOT_TOP + tickLength} />
                </>
              ) : null}
              {showXAxis && tick.kind === 'major' ? <text x={tick.x} y={PLOT_BOTTOM + 28} textAnchor="middle">{tick.label}</text> : null}
            </g>
          );
        })}
        {yTicks.map((tick, index) => {
          const y = valueToY(tick, axis);
          const isEdgeTick = index === 0 || index === yTicks.length - 1;
          return (
            <g className="hpr-axis-tick" key={`y-${kind}-${tick}`}>
              {!isEdgeTick ? (
                <>
                  <line x1={PLOT_LEFT} y1={y} x2={PLOT_LEFT + MAJOR_TICK_LENGTH} y2={y} />
                  <line x1={PLOT_RIGHT} y1={y} x2={PLOT_RIGHT - MAJOR_TICK_LENGTH} y2={y} />
                </>
              ) : null}
              <text x={PLOT_LABEL_X} y={y + 5}>{Number.isInteger(tick) ? tick : tick.toFixed(1)}</text>
            </g>
          );
        })}

        <text className="hpr-axis-label hpr-axis-label-y" x={PLOT_LEFT} y={PLOT_TOP - 4}>
          {yLabel}
        </text>
        {showXAxis ? (
          <text className="hpr-axis-label hpr-axis-label-x" x={PLOT_RIGHT} y={PLOT_BOTTOM + 48} textAnchor="end">
            {copy.xAxisLabel}
          </text>
        ) : null}
        {standardPath ? <path className="hpr-standard-process-line" d={standardPath} /> : null}
        <path className="hpr-trace-line" d={linePath} stroke={stroke} />
      </svg>
    </section>
  );
};

const HeatCapacityProcessReviewPanel: React.FC<HeatCapacityProcessReviewPanelProps> = ({
  mode,
  review,
  selectedTrialId,
  onSelectedTrialChange,
  language = 'zh-CN',
  isIdealExperimentReview = false,
}) => {
  const [hoveredStageId, setHoveredStageId] = useState<HeatCapacityProcessStageId | null>(null);
  const [hoveredControlId, setHoveredControlId] = useState<string | null>(null);
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);
  const [trialMenuOpen, setTrialMenuOpen] = useState(false);
  const [expandedDiagnosisRows, setExpandedDiagnosisRows] = useState<Set<string>>(() => new Set());
  const trialSelectRef = useRef<HTMLDivElement | null>(null);
  const copy = getHeatCapacityProcessReviewCopy(language);
  const idealScoreNotice = copy.idealScoreNotice ?? idealScoreNoticeByLanguage[language];
  const standardReference = review.chart.standardReference;
  const sharedCompressedDurationS = useMemo(() => {
    const standardStages = standardReference?.stages.length
      ? standardReference.stages
      : review.chart.stages;
    return Math.max(
      calculateHeatCapacityProcessReviewCompressedDurationS(review.chart.stages),
      calculateHeatCapacityProcessReviewCompressedDurationS(standardStages),
    );
  }, [standardReference, review.chart.stages]);
  const standardReferenceSummary = standardReference?.summary ?? null;
  const toggleDiagnosisRow = (rowId: string) => {
    setExpandedDiagnosisRows((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };
  const handleReviewWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ? event.deltaX
      : event.shiftKey
        ? event.deltaY
        : 0;
    if (horizontalDelta === 0) return;
    event.currentTarget.scrollLeft += horizontalDelta;
  };

  useEffect(() => {
    if (!trialMenuOpen) {
      return undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && trialSelectRef.current?.contains(target)) {
        return;
      }
      setTrialMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTrialMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [trialMenuOpen]);

  if (mode !== 'free') {
    return (
      <div className="hpr-empty">
        <strong>{copy.notFreeTitle}</strong>
        <span>{copy.notFreeBody}</span>
      </div>
    );
  }

  if (!review.summary || review.status === 'empty' || review.status === 'missing-trace') {
    return (
      <div className="hpr-empty">
        <strong>{review.status === 'missing-trace' ? copy.missingTraceTitle : copy.emptyTitle}</strong>
        <span>{copy.emptyBody}</span>
      </div>
    );
  }

  const { summary } = review;
  const retakeText = formatRetakeCount(copy, summary.retakeCount);

  return (
    <div className="hpr-panel">
      <section className="hpr-summary" aria-label={copy.summaryAria}>
        <div className="hpr-summary-title">
          <span>{copy.currentReview}</span>
          <strong>{formatTrialLabel(copy, summary.trialIndex)}</strong>
          <small>{copy.freeModeLabel} · {copy.mainBranchLabel} {summary.branchId ?? '--'}</small>
        </div>
        <div className="hpr-summary-grid">
          <div>
            <span>γ</span>
            <strong>{formatMetric(summary.gamma, 3)}</strong>
            <small>{copy.relativeError} {formatMetric(summary.relativeErrorPercent, 2, '%')}</small>
          </div>
          <div>
            <span className="hpr-summary-label-with-help">
              {copy.upperBoundGamma}
              <button
                type="button"
                className="hpr-tooltip-anchor hpr-summary-help"
                aria-label={copy.upperBoundHelp}
                data-hpr-tooltip={copy.upperBoundHelp}
              >
                ?
              </button>
            </span>
            <strong>{formatMetric(summary.upperBoundGamma, 3)}</strong>
            <small>{copy.upperBoundTheoryError} {formatMetric(summary.upperBoundRelativeErrorPercent, 2, '%')}</small>
          </div>
          <div>
            <span>{copy.operationScore}</span>
            <strong>{isIdealExperimentReview ? '--' : formatScore(review.score.total, review.score.maxScore)}</strong>
            <small>{isIdealExperimentReview ? idealScoreNotice : `${copy.upperBoundGap} ${formatMetric(summary.upperBoundGapPercent, 2, '%')}`}</small>
          </div>
          <div>
            <span>{copy.retakeTitle}</span>
            <strong>{retakeText}</strong>
            <small>{formatHiddenBranchCount(copy, summary.retakeCount)}</small>
          </div>
        </div>
      </section>

      <section className="hpr-process" aria-label={copy.processAria}>
        <div className="hpr-section-heading">
          <div>
            <strong>{copy.processTitle}</strong>
          </div>
          <div
            className={`hpr-trial-select studio-heat-free-display-scheme-control ${trialMenuOpen ? 'studio-heat-free-display-scheme-open' : ''}`}
            data-hpr-trial-select="true"
            ref={trialSelectRef}
          >
            <button
              type="button"
              className="hpr-trial-select-trigger studio-heat-free-display-scheme-trigger"
              aria-haspopup="listbox"
              aria-expanded={trialMenuOpen}
              onClick={() => setTrialMenuOpen((open) => !open)}
            >
              <span>
                <strong>{formatTrialLabel(copy, summary.trialIndex)}</strong>
              </span>
              <ChevronDown
                size={14}
                className={`studio-heat-free-display-scheme-chevron ${trialMenuOpen ? 'studio-heat-free-display-scheme-chevron-open' : ''}`}
              />
            </button>
            {trialMenuOpen ? (
              <div className="hpr-trial-select-menu studio-heat-free-display-scheme-menu" role="listbox" aria-label={copy.processTitle}>
                {review.trialOptions.map((option) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.trialId === selectedTrialId}
                    key={option.trialId}
                    className={option.trialId === selectedTrialId ? 'studio-heat-free-display-scheme-active' : ''}
                    onClick={() => {
                      onSelectedTrialChange(option.trialId);
                      setTrialMenuOpen(false);
                    }}
                  >
                    <strong>{formatTrialLabel(copy, option.trialIndex)}</strong>
                    <span>
                      {option.gamma === null ? copy.incomplete : `γ ${option.gamma.toFixed(3)}`} · {copy.retakeShort} {option.retakeCount}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className={`hpr-standard-process-summary ${standardReferenceSummary?.feasible ? '' : 'hpr-standard-process-summary-warning'}`}>
          <strong>{copy.standardReference}</strong>
          {standardReferenceSummary?.feasible ? (
            <>
              <span>
                {formatStandardProcessSummary(
                  language,
                  formatMetric(standardReferenceSummary.targetPressureMv, 1, ' mV'),
                  formatMetric(standardReferenceSummary.releaseDurationS, 2, ' s'),
                  formatMetric(standardReferenceSummary.gamma, 3),
                  formatMetric(standardReferenceSummary.relativeErrorPercent, 2, '%'),
                )}
              </span>
              <small>{copy.standardReferenceAssumptions}</small>
            </>
          ) : (
            <span>{copy.standardReferenceUnavailable}</span>
          )}
        </div>
        <div className="hpr-chart-shell">
          <div
            className="hpr-scroll-window"
            data-hpr-scroll-window="true"
            onWheel={handleReviewWheel}
          >
            <div className="hpr-scroll-content">
              <SharedTimeline
                chart={review.chart}
                copy={copy}
                sharedCompressedDurationS={sharedCompressedDurationS}
                hoveredStageId={hoveredStageId}
                hoveredControlId={hoveredControlId}
                hoveredRecordId={hoveredRecordId}
                onStageHover={setHoveredStageId}
                onControlHover={setHoveredControlId}
                onRecordHover={setHoveredRecordId}
              />
              <ProcessChart
                kind="pressure"
                chart={review.chart}
                copy={copy}
                hoveredStageId={hoveredStageId}
              />
              <ProcessChart
                kind="temperature"
                chart={review.chart}
                copy={copy}
                hoveredStageId={hoveredStageId}
                showXAxis
              />
            </div>
          </div>
        </div>
      </section>

      <section className="hpr-diagnosis" aria-label={copy.diagnosisAria}>
        <div className="hpr-section-heading">
          <div>
            <strong>{copy.diagnosisTitle}</strong>
          </div>
          <span>{formatGroupLabel(copy, summary.trialIndex)}</span>
        </div>
        <div className="hpr-diagnosis-list">
          {review.diagnostics.map((row) => {
            const details = row.details ?? [];
            const expanded = expandedDiagnosisRows.has(row.id);
            return (
              <React.Fragment key={row.id}>
                <div className={`hpr-diagnosis-row ${expanded ? 'hpr-diagnosis-row-expanded' : ''}`}>
                  <div className="hpr-diagnosis-title">
                    <button
                      type="button"
                      className={`hpr-diagnosis-expand ${expanded ? 'hpr-diagnosis-expand-open' : ''}`}
                      aria-label={`${expanded ? copy.collapse : copy.expand}${row.title}${copy.scoreDetailSuffix}`}
                      aria-expanded={expanded}
                      disabled={details.length === 0}
                      onClick={() => toggleDiagnosisRow(row.id)}
                    >
                      <ChevronRight aria-hidden="true" size={14} strokeWidth={2.2} />
                    </button>
                    <strong>{row.title}</strong>
                  </div>
                  <span className="hpr-diagnosis-summary-cell">{normalizeDiagnosisText(row.evidence, copy.noIssue)}</span>
                  <span className="hpr-diagnosis-summary-cell">{normalizeDiagnosisText(row.relation ?? '--', copy.noIssue)}</span>
                  <span className="hpr-diagnosis-summary-cell">{normalizeDiagnosisText(row.recommendation, copy.noIssue)}</span>
                  <em className={`hpr-diagnosis-status hpr-diagnosis-status-${row.status}`}>
                    {isIdealExperimentReview
                      ? '--'
                      : typeof row.score === 'number' && typeof row.maxScore === 'number'
                      ? formatScore(row.score, row.maxScore)
                      : copy.diagnosisStatusLabels[row.status]}
                  </em>
                </div>
                {expanded && details.length > 0 ? (
                  <div className="hpr-diagnosis-details" data-hpr-diagnosis-details={row.id}>
                    {details.map((detail) => (
                      <div className="hpr-diagnosis-detail-row" key={detail.id}>
                        <strong>{detail.label}</strong>
                        <span>{normalizeDiagnosisText(detail.evidence, copy.noIssue)}</span>
                        <span>{normalizeDiagnosisText(detail.reason, copy.noIssue)}</span>
                        <span>{normalizeDiagnosisText(detail.recommendation, copy.noIssue)}</span>
                        <em className={`hpr-diagnosis-status hpr-diagnosis-status-${detail.status}`}>
                          {isIdealExperimentReview ? '--' : formatScore(detail.score, detail.maxScore)}
                        </em>
                      </div>
                    ))}
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default HeatCapacityProcessReviewPanel;
