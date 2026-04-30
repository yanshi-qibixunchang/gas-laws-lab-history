import type {
  ExperimentRelation,
  IdealGasExperimentPoint,
  PressureMeasurementSummary,
  SimulationParams,
} from '../types';
import {
  BOX_LENGTH_PRESET_SEQUENCE,
  diagnoseExperimentFailure,
  getExperimentVerdictState,
  hasCompletedPresetRound,
  PARTICLE_COUNT_PRESET_SEQUENCE,
  TEMPERATURE_PRESET_SEQUENCE,
  type ExperimentVerdictState,
  type FailureDiagnosis,
} from './experimentFailureDiagnostics.ts';

export {
  BOX_LENGTH_PRESET_SEQUENCE,
  hasCompletedPresetRound,
  PARTICLE_COUNT_PRESET_SEQUENCE,
  TEMPERATURE_PRESET_SEQUENCE,
};

export type PointsByRelation = Record<ExperimentRelation, IdealGasExperimentPoint[]>;
export type ExperimentParamKey = keyof SimulationParams | 'targetTemperature';
export type ExperimentParams = SimulationParams & { targetTemperature: number };

export interface RegressionSummary {
  slope: number | null;
  intercept: number | null;
  rSquared: number | null;
  slopeError: number | null;
}

export interface IdealGasAnalysis {
  relation: ExperimentRelation;
  points: IdealGasExperimentPoint[];
  sortedPoints: IdealGasExperimentPoint[];
  theoreticalSlope: number | null;
  regression: RegressionSummary;
  verdictState: ExperimentVerdictState;
  diagnosis: FailureDiagnosis;
  isVerified: boolean;
}

const DEFAULT_TARGET_TEMPERATURE = 1;
const TOLERANCE = 1e-9;

const getTargetTemperature = (params: SimulationParams): number => {
  const target = params.targetTemperature;
  return typeof target === 'number' && Number.isFinite(target) && target > 0
    ? target
    : DEFAULT_TARGET_TEMPERATURE;
};

export const createExperimentParams = (params: SimulationParams): ExperimentParams => ({
  ...params,
  targetTemperature: getTargetTemperature(params),
});

export const createEmptyPointsByRelation = (): PointsByRelation => ({
  pt: [],
  pv: [],
  pn: [],
});

export const clonePointsByRelation = (pointsByRelation: PointsByRelation): PointsByRelation => ({
  pt: pointsByRelation.pt.map((point) => ({ ...point })),
  pv: pointsByRelation.pv.map((point) => ({ ...point })),
  pn: pointsByRelation.pn.map((point) => ({ ...point })),
});

export const getRelationVariableKey = (relation: ExperimentRelation): ExperimentParamKey => {
  if (relation === 'pt') return 'targetTemperature';
  if (relation === 'pv') return 'L';
  return 'N';
};

export const isVariableKeyForRelation = (relation: ExperimentRelation, key: ExperimentParamKey) => (
  getRelationVariableKey(relation) === key
);

export const getRelationXValue = (relation: ExperimentRelation, point: IdealGasExperimentPoint): number => {
  if (relation === 'pt') return point.meanTemperature;
  if (relation === 'pv') return point.inverseVolume ?? 0;
  return point.particleCount ?? 0;
};

export const getRelationControlValue = (
  relation: ExperimentRelation,
  point: IdealGasExperimentPoint,
): number | null => {
  if (relation === 'pt') return point.targetTemperature;
  if (relation === 'pv') return point.boxLength ?? null;
  return point.particleCount ?? null;
};

export const getTheoreticalSlope = (relation: ExperimentRelation, params: SimulationParams): number | null => {
  const targetTemperature = getTargetTemperature(params);
  if (relation === 'pt') return params.N * params.k / Math.pow(params.L, 3);
  if (relation === 'pv') return params.N * params.k * targetTemperature;
  if (relation === 'pn') return (params.k * targetTemperature) / Math.pow(params.L, 3);
  return null;
};

export const calculateLinearRegression = (
  points: IdealGasExperimentPoint[],
  getX: (point: IdealGasExperimentPoint) => number,
  getY: (point: IdealGasExperimentPoint) => number,
  theoreticalSlope: number | null,
): RegressionSummary => {
  const validPoints = points
    .map((point) => ({ x: getX(point), y: getY(point) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (validPoints.length < 2) {
    return { slope: null, intercept: null, rSquared: null, slopeError: null };
  }

  const count = validPoints.length;
  const meanX = validPoints.reduce((sum, point) => sum + point.x, 0) / count;
  const meanY = validPoints.reduce((sum, point) => sum + point.y, 0) / count;
  const numerator = validPoints.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = validPoints.reduce((sum, point) => sum + Math.pow(point.x - meanX, 2), 0);

  if (Math.abs(denominator) <= TOLERANCE) {
    return { slope: null, intercept: null, rSquared: null, slopeError: null };
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const totalSquares = validPoints.reduce((sum, point) => sum + Math.pow(point.y - meanY, 2), 0);
  const residualSquares = validPoints.reduce(
    (sum, point) => sum + Math.pow(point.y - (slope * point.x + intercept), 2),
    0,
  );
  const rSquared = Math.abs(totalSquares) <= TOLERANCE ? 1 : 1 - residualSquares / totalSquares;
  const slopeError =
    theoreticalSlope !== null && Math.abs(theoreticalSlope) > TOLERANCE
      ? Math.abs((slope - theoreticalSlope) / theoreticalSlope) * 100
      : null;

  return {
    slope: Object.is(slope, -0) ? 0 : slope,
    intercept: Object.is(intercept, -0) ? 0 : intercept,
    rSquared,
    slopeError: slopeError !== null && Object.is(slopeError, -0) ? 0 : slopeError,
  };
};

export const createIdealGasExperimentPoint = (
  relation: ExperimentRelation,
  params: SimulationParams,
  summary: PressureMeasurementSummary,
  timestamp = Date.now(),
): IdealGasExperimentPoint | null => {
  if (
    summary.meanPressure === null ||
    summary.meanIdealPressure === null ||
    summary.meanTemperature === null ||
    summary.relativeGap === null
  ) {
    return null;
  }

  const targetTemperature = getTargetTemperature(params);
  const volume = Math.pow(params.L, 3);

  return {
    id: `${relation}-${timestamp}-${Math.round(getRelationVariableNumericValue(relation, params) * 10000)}`,
    relation,
    targetTemperature,
    meanTemperature: summary.meanTemperature,
    meanPressure: summary.meanPressure,
    idealPressure: summary.meanIdealPressure,
    relativeGap: summary.relativeGap,
    timestamp,
    boxLength: relation === 'pv' ? params.L : null,
    volume: relation === 'pv' ? volume : null,
    inverseVolume: relation === 'pv' && volume > 0 ? 1 / volume : null,
    particleCount: relation === 'pn' ? params.N : null,
  };
};

export const getRelationVariableNumericValue = (
  relation: ExperimentRelation,
  params: SimulationParams,
): number => {
  if (relation === 'pt') return getTargetTemperature(params);
  if (relation === 'pv') return params.L;
  return params.N;
};

export const getPresetSequence = (relation: ExperimentRelation): readonly number[] => {
  if (relation === 'pt') return TEMPERATURE_PRESET_SEQUENCE;
  if (relation === 'pv') return BOX_LENGTH_PRESET_SEQUENCE;
  return PARTICLE_COUNT_PRESET_SEQUENCE;
};

export const getNextPresetValue = (relation: ExperimentRelation, currentValue: number): number => {
  const preset = getPresetSequence(relation).find((value) => value > currentValue + 1e-6);
  return preset ?? currentValue;
};

export const getIdealGasAnalysis = (
  relation: ExperimentRelation,
  pointsByRelation: PointsByRelation,
  params: SimulationParams,
): IdealGasAnalysis => {
  const points = pointsByRelation[relation] ?? [];
  const sortedPoints = [...points].sort(
    (a, b) => getRelationXValue(relation, a) - getRelationXValue(relation, b),
  );
  const theoreticalSlope = getTheoreticalSlope(relation, params);
  const regression = calculateLinearRegression(
    sortedPoints,
    (point) => getRelationXValue(relation, point),
    (point) => point.meanPressure,
    theoreticalSlope,
  );
  const verdictState = getExperimentVerdictState(sortedPoints, regression);
  const diagnosis = diagnoseExperimentFailure(sortedPoints, relation, regression);

  return {
    relation,
    points,
    sortedPoints,
    theoreticalSlope,
    regression,
    verdictState,
    diagnosis,
    isVerified: verdictState === 'verified',
  };
};

export const getRelationLabel = (relation: ExperimentRelation) => {
  if (relation === 'pt') return 'P-T';
  if (relation === 'pv') return 'P-V';
  return 'P-N';
};
