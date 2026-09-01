import {
  getRelationXValue,
  type IdealGasAnalysis,
} from '../../domain/idealGas/idealGasExperiment.ts';

export type IdealVerificationChartVariant = 'linear' | 'pvRaw';

export interface IdealVerificationChartPoint {
  id: string;
  x: number;
  measured: number;
  ideal: number;
  cx: number;
  cy: number;
}

export interface IdealVerificationChartModel {
  fitPoints: string;
  idealPoints: string;
  measuredPoints: string;
  points: IdealVerificationChartPoint[];
  theoryPoints: string;
  xLabel: 'T' | 'V' | '1/V' | 'N';
}

const CHART_LEFT = 34;
const CHART_RIGHT = 358;
const CHART_BOTTOM = 146;
const CHART_HEIGHT = 112;

export const createIdealVerificationChartModel = (
  analysis: IdealGasAnalysis,
  variant: IdealVerificationChartVariant = 'linear',
): IdealVerificationChartModel | null => {
  const sourcePoints = analysis.sortedPoints
    .map((point) => ({
      point,
      x: variant === 'pvRaw'
        ? point.volume ?? 0
        : getRelationXValue(analysis.relation, point),
      measured: point.meanPressure,
      ideal: point.idealPressure,
    }))
    .filter((point) => (
      Number.isFinite(point.x)
      && Number.isFinite(point.measured)
      && point.x > 0
    ));

  if (sourcePoints.length === 0) return null;

  const xValues = sourcePoints.map((point) => point.x);
  const yValues = sourcePoints.flatMap((point) => [point.measured, point.ideal]);
  const hasLinearFit = (
    variant === 'linear'
    && analysis.regression.slope !== null
    && analysis.regression.intercept !== null
  );
  if (hasLinearFit) {
    xValues.forEach((x) => {
      yValues.push(
        (analysis.regression.slope ?? 0) * x
        + (analysis.regression.intercept ?? 0),
      );
    });
  }

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(0, ...yValues);
  const maxY = Math.max(0.0001, ...yValues);
  const xSpan = Math.max(0.0001, maxX - minX);
  const ySpan = Math.max(0.0001, maxY - minY);
  const xTo = (value: number) => (
    CHART_LEFT
    + ((value - minX) / xSpan) * (CHART_RIGHT - CHART_LEFT)
  );
  const yTo = (value: number) => (
    CHART_BOTTOM - ((value - minY) / ySpan) * CHART_HEIGHT
  );

  const points = sourcePoints.map((point) => ({
    id: point.point.id,
    x: point.x,
    measured: point.measured,
    ideal: point.ideal,
    cx: xTo(point.x),
    cy: yTo(point.measured),
  }));
  const measuredPoints = sourcePoints
    .map((point) => `${xTo(point.x)},${yTo(point.measured)}`)
    .join(' ');
  const idealPoints = sourcePoints
    .map((point) => `${xTo(point.x)},${yTo(point.ideal)}`)
    .join(' ');
  const fitPoints = hasLinearFit
    ? [minX, maxX]
        .map((x) => `${xTo(x)},${yTo(
          (analysis.regression.slope ?? 0) * x
          + (analysis.regression.intercept ?? 0),
        )}`)
        .join(' ')
    : '';
  const theoryPoints = (
    variant === 'linear' && analysis.theoreticalSlope !== null
  )
    ? [minX, maxX]
        .map((x) => `${xTo(x)},${yTo(analysis.theoreticalSlope! * x)}`)
        .join(' ')
    : idealPoints;
  const xLabel = variant === 'pvRaw'
    ? 'V'
    : analysis.relation === 'pv'
      ? '1/V'
      : analysis.relation === 'pn'
        ? 'N'
        : 'T';

  return {
    fitPoints,
    idealPoints,
    measuredPoints,
    points,
    theoryPoints,
    xLabel,
  };
};
