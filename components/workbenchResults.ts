import type { HistogramBin } from '../types';
import type { WorkbenchFileState, WorkbenchRunState } from './workbenchState';
import { getIdealGasAnalysis } from '../utils/idealGasExperiment';

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

export const createWorkbenchFigureSpecs = (file: WorkbenchFileState): WorkbenchFigureSpec[] => {
  if (file.kind === 'ideal') {
    const analysis = getIdealGasAnalysis(file.relation, file.pointsByRelation, file.activeParams);
    const pointCount = analysis.sortedPoints.length;
    const hasPoints = pointCount > 0;
    const baseSpecs: Array<{ code: WorkbenchFigureCode; title: string; dataCount: number; ready: boolean }> = [
      { code: 'ideal-verification', title: `${file.relation.toUpperCase()} verification chart`, dataCount: pointCount, ready: hasPoints },
      { code: 'ideal-points', title: `${file.relation.toUpperCase()} point table`, dataCount: pointCount, ready: hasPoints },
      { code: 'ideal-history', title: `${file.relation.toUpperCase()} history note`, dataCount: analysis.isVerified ? 1 : 0, ready: analysis.isVerified },
    ];

    if (file.relation === 'pv') {
      baseSpecs.splice(1, 0, {
        code: 'ideal-raw-pv',
        title: 'P-V raw physical chart',
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
    { code: 'speed-distribution', title: 'Speed distribution', dataCount: speedSampleCount },
    { code: 'energy-distribution', title: 'Energy distribution', dataCount: energySampleCount },
    { code: 'semilog-energy', title: 'Semilog energy distribution', dataCount: finalData?.energyLog.length ?? 0 },
    { code: 'temperature-error', title: 'Temperature error history', dataCount: finalData?.tempHistory.length ?? 0 },
    { code: 'total-energy', title: 'Total energy history', dataCount: finalData?.tempHistory.length ?? 0 },
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
