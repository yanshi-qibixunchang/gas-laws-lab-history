import type { ExperimentRelation, IdealGasExperimentPoint } from '../types';

export const TEMPERATURE_PRESET_SEQUENCE = [0.6, 0.8, 1.0, 1.2, 1.5, 2.0] as const;
export const BOX_LENGTH_PRESET_SEQUENCE = [12, 13.5, 15, 17, 19, 21] as const;
export const PARTICLE_COUNT_PRESET_SEQUENCE = [80, 120, 160, 200, 260, 320] as const;

const MIN_POINTS_PRELIMINARY = 4;
const MIN_POINTS_VERIFIED = 5;
const VERIFIED_R_SQUARED = 0.98;
const PRELIMINARY_R_SQUARED = 0.95;
const VERIFIED_SLOPE_ERROR = 12;
const PRELIMINARY_SLOPE_ERROR = 20;
const MIN_RANGE_COVERAGE_RATIO = 0.55;
const TOLERANCE = 1e-6;

export interface RegressionSummaryInput {
  slope: number | null;
  intercept: number | null;
  rSquared: number | null;
  slopeError: number | null;
}

export type ExperimentVerdictState = 'verified' | 'preliminary' | 'notYet' | 'insufficient';
export type ExperimentFailureReason =
  | 'insufficient_points'
  | 'insufficient_range'
  | 'weak_fit'
  | 'slope_mismatch'
  | 'preliminary_gap';

export interface FailureDiagnosis {
  verdictState: ExperimentVerdictState;
  failureReason: ExperimentFailureReason | null;
  hasCompletedPresetRound: boolean;
  pointCount: number;
  rangeSpan: number;
  rangeCoverageRatio: number | null;
  rSquared: number | null;
  slopeError: number | null;
}

const getControlValue = (relation: ExperimentRelation, point: IdealGasExperimentPoint): number | null => {
  if (relation === 'pt') return point.targetTemperature;
  if (relation === 'pv') return point.boxLength ?? null;
  if (relation === 'pn') return point.particleCount ?? null;
  return point.meanTemperature;
};

const getPresetSequence = (relation: ExperimentRelation): readonly number[] => {
  if (relation === 'pt') return TEMPERATURE_PRESET_SEQUENCE;
  if (relation === 'pv') return BOX_LENGTH_PRESET_SEQUENCE;
  if (relation === 'pn') return PARTICLE_COUNT_PRESET_SEQUENCE;
  return [];
};

const getRangeStats = (relation: ExperimentRelation, points: IdealGasExperimentPoint[]) => {
  const values = points
    .map((point) => getControlValue(relation, point))
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (values.length < 2) {
    return { span: 0, coverageRatio: 0 };
  }

  const span = Math.max(...values) - Math.min(...values);
  const presets = getPresetSequence(relation);

  if (presets.length < 2) {
    return { span, coverageRatio: null };
  }

  const presetSpan = Math.max(...presets) - Math.min(...presets);
  const coverageRatio = presetSpan > TOLERANCE ? span / presetSpan : null;
  return { span, coverageRatio };
};

export const hasCompletedPresetRound = (relation: ExperimentRelation, points: IdealGasExperimentPoint[]) => {
  const presets = getPresetSequence(relation);
  if (presets.length === 0) return false;

  return presets.every((preset) =>
    points.some((point) => {
      const value = getControlValue(relation, point);
      return value !== null && Math.abs(value - preset) <= TOLERANCE;
    }),
  );
};

export const getExperimentVerdictState = (
  points: IdealGasExperimentPoint[],
  regression: RegressionSummaryInput,
): ExperimentVerdictState => {
  if (
    points.length >= MIN_POINTS_VERIFIED &&
    regression.rSquared !== null &&
    regression.slopeError !== null &&
    regression.rSquared >= VERIFIED_R_SQUARED &&
    regression.slopeError <= VERIFIED_SLOPE_ERROR
  ) {
    return 'verified';
  }

  if (
    points.length >= MIN_POINTS_PRELIMINARY &&
    regression.rSquared !== null &&
    regression.slopeError !== null &&
    regression.rSquared >= PRELIMINARY_R_SQUARED &&
    regression.slopeError <= PRELIMINARY_SLOPE_ERROR
  ) {
    return 'preliminary';
  }

  if (points.length >= MIN_POINTS_PRELIMINARY) {
    return 'notYet';
  }

  return 'insufficient';
};

export const diagnoseExperimentFailure = (
  points: IdealGasExperimentPoint[],
  relation: ExperimentRelation,
  regression: RegressionSummaryInput,
): FailureDiagnosis => {
  const verdictState = getExperimentVerdictState(points, regression);
  const { span, coverageRatio } = getRangeStats(relation, points);
  const hasCompletedRound = hasCompletedPresetRound(relation, points);

  let failureReason: ExperimentFailureReason | null = null;

  if (verdictState === 'verified') {
    failureReason = null;
  } else if (verdictState === 'preliminary') {
    failureReason = 'preliminary_gap';
  } else if (points.length < MIN_POINTS_VERIFIED) {
    failureReason = 'insufficient_points';
  } else if (coverageRatio !== null && coverageRatio < MIN_RANGE_COVERAGE_RATIO) {
    failureReason = 'insufficient_range';
  } else if (regression.rSquared === null || regression.rSquared < PRELIMINARY_R_SQUARED) {
    failureReason = 'weak_fit';
  } else if (regression.slopeError === null || regression.slopeError > PRELIMINARY_SLOPE_ERROR) {
    failureReason = 'slope_mismatch';
  } else {
    failureReason = 'weak_fit';
  }

  return {
    verdictState,
    failureReason,
    hasCompletedPresetRound: hasCompletedRound,
    pointCount: points.length,
    rangeSpan: span,
    rangeCoverageRatio: coverageRatio,
    rSquared: regression.rSquared,
    slopeError: regression.slopeError,
  };
};
