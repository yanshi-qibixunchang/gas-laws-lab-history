import type { HistogramBin } from '../types';
import type { IdealGasExperimentPoint } from '../types';
import type { WorkbenchFileState, WorkbenchRunState } from './workbenchState.ts';
import { getIdealGasAnalysis, getRelationXValue } from '../utils/idealGasExperiment.ts';

export type WorkbenchExportLanguage = 'zh-CN' | 'zh-TW' | 'en';

export type WorkbenchFigureCode =
  | 'speed-distribution'
  | 'energy-distribution'
  | 'semilog-energy'
  | 'temperature-error'
  | 'total-energy'
  | 'ideal-verification'
  | 'ideal-raw-pv'
  | 'ideal-points'
  | 'ideal-history';

export type WorkbenchFigureStatus = 'ready' | 'not-ready' | 'not-applicable';

export interface WorkbenchResultSummary {
  ready: boolean;
  fileName: string;
  runState: WorkbenchRunState;
  finalTime: number;
  temperature: number;
  pressure: number;
  meanSpeed: number;
  rmsSpeed: number;
  speedSampleCount: number;
  energySampleCount: number;
  tempHistoryCount: number;
  speedBinCount: number;
  energyBinCount: number;
  energyLogCount: number;
  energyDriftPercent: number | null;
  temperatureErrorMeanAbs: number | null;
}

export interface WorkbenchFigureSpec {
  id: string;
  title: string;
  figureCode: WorkbenchFigureCode;
  status: WorkbenchFigureStatus;
  dataCount: number;
  recommendedFilename: string;
}

export type WorkbenchExportMode = 'report' | 'figuresZip' | 'verificationFigure' | 'pointsCsv';

export interface WorkbenchCsvExportPayload {
  kind: 'csv';
  filename: string;
  content: string;
}

export interface WorkbenchJsonExportPayload {
  kind: 'json';
  filename: string;
  data: Record<string, any>;
}

export type WorkbenchExportPayload = WorkbenchCsvExportPayload | WorkbenchJsonExportPayload;

const exportCopies = {
  'zh-CN': {
    figures: {
      speedDistribution: '速度分布',
      energyDistribution: '能量分布',
      semilogEnergy: '半对数能量分布',
      temperatureError: '温度误差历史',
      totalEnergy: '总能量历史',
      idealVerification: (relation: string) => `${relation} 验证图`,
      idealRawPv: 'P-V 原始物理图',
      idealPoints: (relation: string) => `${relation} 点表`,
      idealHistory: (relation: string) => `${relation} 历史记录`,
    },
    report: {
      language: '简体中文',
      fileName: '文件名',
      relation: '关系',
      params: '参数',
      summary: '摘要',
      verification: '验证',
      points: '点',
      figureSpecs: '图表',
      finalChartData: '最终图表数据',
    },
  },
  'zh-TW': {
    figures: {
      speedDistribution: '速度分布',
      energyDistribution: '能量分布',
      semilogEnergy: '半對數能量分布',
      temperatureError: '溫度誤差歷史',
      totalEnergy: '總能量歷史',
      idealVerification: (relation: string) => `${relation} 驗證圖`,
      idealRawPv: 'P-V 原始物理圖',
      idealPoints: (relation: string) => `${relation} 點表`,
      idealHistory: (relation: string) => `${relation} 歷史記錄`,
    },
    report: {
      language: '繁體中文',
      fileName: '檔名',
      relation: '關係',
      params: '參數',
      summary: '摘要',
      verification: '驗證',
      points: '點',
      figureSpecs: '圖表',
      finalChartData: '最終圖表資料',
    },
  },
  en: {
    figures: {
      speedDistribution: 'Speed distribution',
      energyDistribution: 'Energy distribution',
      semilogEnergy: 'Semilog energy distribution',
      temperatureError: 'Temperature error history',
      totalEnergy: 'Total energy history',
      idealVerification: (relation: string) => `${relation} verification chart`,
      idealRawPv: 'P-V raw physical chart',
      idealPoints: (relation: string) => `${relation} point table`,
      idealHistory: (relation: string) => `${relation} history note`,
    },
    report: {
      language: 'English',
      fileName: 'File name',
      relation: 'Relation',
      params: 'Parameters',
      summary: 'Summary',
      verification: 'Verification',
      points: 'Points',
      figureSpecs: 'Figures',
      finalChartData: 'Final chart data',
    },
  },
} satisfies Record<WorkbenchExportLanguage, {
  figures: Record<string, string | ((relation: string) => string)>;
  report: Record<string, string>;
}>;

const getExportCopy = (language: WorkbenchExportLanguage = 'en') => exportCopies[language] ?? exportCopies.en;

const countHistogramSamples = (bins: HistogramBin[]) => bins.reduce((sum, bin) => sum + bin.count, 0);

const formatNumberToken = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'na';
  return String(Number(value.toFixed(4))).replace('-', 'm').replace('.', 'p');
};

const sanitizeFilenamePart = (value: string) => (
  value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled'
);

const formatTimestamp = (value: number) => {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
};

const getMeanAbsoluteTemperatureError = (history: Array<{ error: number }>) => {
  if (history.length === 0) return null;
  const total = history.reduce((sum, point) => sum + Math.abs(point.error), 0);
  return total / history.length;
};

const getEnergyDriftPercent = (history: Array<{ totalEnergy: number }>) => {
  if (history.length < 2) return null;
  const firstEnergy = history[0].totalEnergy;
  const lastEnergy = history[history.length - 1].totalEnergy;
  if (!Number.isFinite(firstEnergy) || Math.abs(firstEnergy) < Number.EPSILON) return null;
  return ((lastEnergy - firstEnergy) / firstEnergy) * 100;
};

export const formatWorkbenchExportFilename = (file: WorkbenchFileState, figureCode: WorkbenchFigureCode) => {
  const timestamp = formatTimestamp(file.updatedAt || file.createdAt || Date.now());
  const fileName = sanitizeFilenamePart(file.name);
  if (file.kind === 'ideal') {
    const descriptor =
      figureCode === 'ideal-points'
        ? 'points'
        : figureCode === 'ideal-history'
          ? 'history'
          : 'verification';
    const extension = figureCode === 'ideal-points' ? 'csv' : 'pdf';
    return `HardSphereLab_${fileName}_${file.relation}_${descriptor}_${timestamp}.${extension}`;
  }

  const params = file.appliedParams;
  const keyParams = [
    `N${formatNumberToken(params.N)}`,
    `L${formatNumberToken(params.L)}`,
    `r${formatNumberToken(params.r)}`,
  ].join('_');

  return `HardSphereLab_${fileName}_${figureCode}_${keyParams}_${timestamp}.pdf`;
};

export const createWorkbenchResultSummary = (file: WorkbenchFileState): WorkbenchResultSummary => {
  const finalData = file.kind === 'standard' ? file.finalChartData : null;
  const finalHistory = finalData?.tempHistory ?? [];
  const idealPointCount = file.kind === 'ideal' ? file.pointsByRelation[file.relation].length : 0;

  return {
    ready: file.kind === 'standard' ? Boolean(finalData) : idealPointCount > 0,
    fileName: file.name,
    runState: file.runState,
    finalTime: file.stats.time,
    temperature: file.stats.temperature,
    pressure: file.stats.pressure,
    meanSpeed: file.stats.meanSpeed,
    rmsSpeed: file.stats.rmsSpeed,
    speedSampleCount: finalData ? countHistogramSamples(finalData.speed) : 0,
    energySampleCount: finalData ? countHistogramSamples(finalData.energy) : 0,
    tempHistoryCount: finalHistory.length,
    speedBinCount: finalData?.speed.length ?? 0,
    energyBinCount: finalData?.energy.length ?? 0,
    energyLogCount: finalData?.energyLog.length ?? 0,
    energyDriftPercent: getEnergyDriftPercent(finalHistory),
    temperatureErrorMeanAbs: getMeanAbsoluteTemperatureError(finalHistory),
  };
};

export const createWorkbenchFigureSpecs = (
  file: WorkbenchFileState,
  language: WorkbenchExportLanguage = 'en',
): WorkbenchFigureSpec[] => {
  const copy = getExportCopy(language).figures;
  if (file.kind === 'ideal') {
    const analysis = getIdealGasAnalysis(file.relation, file.pointsByRelation, file.activeParams);
    const pointCount = analysis.sortedPoints.length;
    const hasPoints = pointCount > 0;
    const baseSpecs: Array<{ code: WorkbenchFigureCode; title: string; dataCount: number; ready: boolean }> = [
      { code: 'ideal-verification', title: (copy.idealVerification as (relation: string) => string)(file.relation.toUpperCase()), dataCount: pointCount, ready: hasPoints },
      { code: 'ideal-points', title: (copy.idealPoints as (relation: string) => string)(file.relation.toUpperCase()), dataCount: pointCount, ready: hasPoints },
      { code: 'ideal-history', title: (copy.idealHistory as (relation: string) => string)(file.relation.toUpperCase()), dataCount: analysis.isVerified ? 1 : 0, ready: analysis.isVerified },
    ];

    if (file.relation === 'pv') {
      baseSpecs.splice(1, 0, {
        code: 'ideal-raw-pv',
        title: copy.idealRawPv as string,
        dataCount: pointCount,
        ready: hasPoints,
      });
    }

    return baseSpecs.map((spec) => ({
      id: spec.code,
      title: spec.title,
      figureCode: spec.code,
      status: spec.ready ? 'ready' : 'not-ready',
      dataCount: spec.dataCount,
      recommendedFilename: formatWorkbenchExportFilename(file, spec.code),
    }));
  }

  const finalData = file.kind === 'standard' ? file.finalChartData : null;
  const unavailableStatus: WorkbenchFigureStatus = file.kind === 'standard' ? 'not-ready' : 'not-applicable';
  const statusFor = (dataCount: number): WorkbenchFigureStatus => {
    if (!finalData) return unavailableStatus;
    return dataCount > 0 ? 'ready' : 'not-ready';
  };

  const speedSampleCount = finalData ? countHistogramSamples(finalData.speed) : 0;
  const energySampleCount = finalData ? countHistogramSamples(finalData.energy) : 0;
  const specs: Array<{ code: WorkbenchFigureCode; title: string; dataCount: number }> = [
    { code: 'speed-distribution', title: copy.speedDistribution as string, dataCount: speedSampleCount },
    { code: 'energy-distribution', title: copy.energyDistribution as string, dataCount: energySampleCount },
    { code: 'semilog-energy', title: copy.semilogEnergy as string, dataCount: finalData?.energyLog.length ?? 0 },
    { code: 'temperature-error', title: copy.temperatureError as string, dataCount: finalData?.tempHistory.length ?? 0 },
    { code: 'total-energy', title: copy.totalEnergy as string, dataCount: finalData?.tempHistory.length ?? 0 },
  ];

  return specs.map((spec) => ({
    id: spec.code,
    title: spec.title,
    figureCode: spec.code,
    status: statusFor(spec.dataCount),
    dataCount: spec.dataCount,
    recommendedFilename: formatWorkbenchExportFilename(file, spec.code),
  }));
};

const csvEscape = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const createCsv = (headers: string[], rows: Array<Array<string | number | null | undefined>>) => [
  headers.map(csvEscape).join(','),
  ...rows.map((row) => row.map(csvEscape).join(',')),
].join('\n');

const formatCsvNumber = (value: number | null | undefined, digits = 7) => (
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toPrecision(digits)) : ''
);

const createIdealPointsCsv = (file: WorkbenchFileState) => {
  if (file.kind !== 'ideal') return '';
  const analysis = getIdealGasAnalysis(file.relation, file.pointsByRelation, file.activeParams);
  return createCsv(
    [
      'relation',
      'scanValue',
      'meanTemperature',
      'measuredPressure',
      'idealPressure',
      'relativeGap',
      'timestamp',
      'boxLength',
      'volume',
      'inverseVolume',
      'particleCount',
    ],
    analysis.sortedPoints.map((point: IdealGasExperimentPoint) => [
      point.relation,
      formatCsvNumber(getRelationXValue(file.relation, point)),
      formatCsvNumber(point.meanTemperature),
      formatCsvNumber(point.meanPressure),
      formatCsvNumber(point.idealPressure),
      formatCsvNumber(point.relativeGap),
      new Date(point.timestamp).toISOString(),
      formatCsvNumber(point.boxLength),
      formatCsvNumber(point.volume),
      formatCsvNumber(point.inverseVolume),
      formatCsvNumber(point.particleCount),
    ]),
  );
};

const createStandardResultCsv = (file: WorkbenchFileState) => {
  if (file.kind !== 'standard' || !file.finalChartData) return '';
  return createCsv(
    ['time', 'temperature', 'targetTemperature', 'error', 'totalEnergy'],
    file.finalChartData.tempHistory.map((point) => [
      formatCsvNumber(point.time),
      formatCsvNumber(point.temperature),
      formatCsvNumber(point.targetTemperature),
      formatCsvNumber(point.error),
      formatCsvNumber(point.totalEnergy),
    ]),
  );
};

const createIdealReportData = (
  file: WorkbenchFileState,
  language: WorkbenchExportLanguage,
) => {
  if (file.kind !== 'ideal') return {};
  const analysis = getIdealGasAnalysis(file.relation, file.pointsByRelation, file.activeParams);
  const copy = getExportCopy(language).report;
  return {
    language,
    labels: copy,
    fileName: file.name,
    relation: file.relation,
    params: file.activeParams,
    summary: createWorkbenchResultSummary(file),
    verification: {
      verdictState: analysis.verdictState,
      isVerified: analysis.isVerified,
      slope: analysis.regression.slope,
      intercept: analysis.regression.intercept,
      rSquared: analysis.regression.rSquared,
      slopeError: analysis.regression.slopeError,
      theoreticalSlope: analysis.theoreticalSlope,
      failureReason: analysis.diagnosis.failureReason,
      recommendationReason: analysis.diagnosis.failureReason,
    },
    points: analysis.sortedPoints,
    figureSpecs: createWorkbenchFigureSpecs(file, language),
  };
};

const createStandardReportData = (
  file: WorkbenchFileState,
  language: WorkbenchExportLanguage,
) => ({
  language,
  labels: getExportCopy(language).report,
  fileName: file.name,
  params: file.appliedParams,
  summary: createWorkbenchResultSummary(file),
  finalChartData: file.kind === 'standard' ? file.finalChartData : null,
  figureSpecs: createWorkbenchFigureSpecs(file, language),
});

export const createWorkbenchExportPayload = (
  file: WorkbenchFileState,
  mode: WorkbenchExportMode,
  language: WorkbenchExportLanguage = 'en',
): WorkbenchExportPayload => {
  if (mode === 'pointsCsv') {
    return {
      kind: 'csv',
      filename: file.kind === 'ideal'
        ? formatWorkbenchExportFilename(file, 'ideal-points')
        : formatWorkbenchExportFilename(file, 'temperature-error').replace(/\.pdf$/, '.csv'),
      content: file.kind === 'ideal' ? createIdealPointsCsv(file) : createStandardResultCsv(file),
    };
  }

  const figureCode: WorkbenchFigureCode =
    file.kind === 'ideal'
      ? 'ideal-verification'
      : mode === 'verificationFigure' ? 'temperature-error' : 'speed-distribution';
  const baseFilename = mode === 'figuresZip'
    ? formatWorkbenchExportFilename(file, figureCode).replace(/\.pdf$/, '.figures.json')
    : formatWorkbenchExportFilename(file, figureCode).replace(/\.pdf$/, '.json');

  return {
    kind: 'json',
    filename: baseFilename,
    data: file.kind === 'ideal' ? createIdealReportData(file, language) : createStandardReportData(file, language),
  };
};
