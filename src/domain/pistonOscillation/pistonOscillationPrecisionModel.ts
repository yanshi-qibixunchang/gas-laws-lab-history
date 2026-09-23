import { formatDecimalPlacesHalfEven, formatSignificantFiguresHalfEven, roundSignificantFiguresHalfEven, roundDecimalPlacesHalfEven, roundProductSignificantFiguresHalfEven, roundSumProductsSignificantFiguresHalfEven, roundRatioSignificantFiguresHalfEven, roundMeanSignificantFiguresHalfEven } from '../calculation/decimalHalfEven.ts';

export const PISTON_PRECISION_VERSION = 'piston-continuous-precision-v1' as const;
export const PISTON_PERIOD_DIGITS = 6;
export const PISTON_SQUARED_DIGITS = 7;
export interface PistonPrecisionKnowns { movingMassKg: number; cylinderDiameterM: number; pressurePa: number; referenceGamma: number }
export interface PistonPrecisionProfile {
  massLimitKg: number; diameterLimitM: number;
  heightScaleLimit: number; timeScaleLimit: number; heightStepM: number;
  pressureStandardPa: number;
}
export interface PistonPrecisionObservation {
  runIndex: number; periodS: number; heightM: number; periodCount: number; sampleRateHz: number;
  periodDigits?: number; squaredDigits?: number;
  deltaMs?: number;
}
// Lower bounds distinguish readings, intermediate calculations and final reports.
// The planner raises individual bounds when the actual data require guard digits.
export const PISTON_PRECISION_MINIMUM = {
  area: 5, gamma: 5, slope: 5, intercept: 5, meanX: 6, meanY: 6,
  residualRow: 4, q: 5, sxx: 5, heightSensitivity: 4, periodSensitivity: 4, timeU: 4,
  residual: 3, slopeA: 3, gammaA: 3, mass: 3, diameter: 3,
  pressure: 3, heightScale: 3,
  timeScale: 3, heightReadout: 3, slopeReadout: 3, slopeSupplement: 3,
  slopeB: 3, gammaB: 3, combined: 3,
} as const;
export type PistonPrecisionKey = keyof typeof PISTON_PRECISION_MINIMUM;
export interface PistonPrecisionPlan {
  version: typeof PISTON_PRECISION_VERSION;
  digits: Record<PistonPrecisionKey, number>;
  periods: Record<number, { period: number; squared: number }>;
  verified: boolean;
  gammaErrorInUc: number;
  combinedRelativeError: number;
}

export const normalizePistonPrecisionKnowns = <T extends PistonPrecisionKnowns>(knowns: T): T => ({
  ...knowns,
  movingMassKg: roundDecimalPlacesHalfEven(knowns.movingMassKg, 4), // 0.1 g
  cylinderDiameterM: roundDecimalPlacesHalfEven(knowns.cylinderDiameterM * 1000, 1) / 1000,
  pressurePa: roundDecimalPlacesHalfEven(knowns.pressurePa / 10, 0) * 10, // 0.01 kPa
  referenceGamma: roundDecimalPlacesHalfEven(knowns.referenceGamma, 2),
});
export const pistonPrecisionFormat = (value: number, digits: number) => value === 0 ? '0' : formatSignificantFiguresHalfEven(value, digits);
const finiteRound = (value: number, digits: number) => Number.isFinite(value) && value !== 0 ? roundSignificantFiguresHalfEven(value, digits) : value;

/** Both the evaluator and every displayed operand use these same rounded nodes.
 * Omitting the plan is the independent-of-display, double-precision reference path.
 * It still uses only measured readings, never simulation truth. */
export const evaluatePistonPrecisionChain = (
  knowns: PistonPrecisionKnowns, observations: readonly PistonPrecisionObservation[],
  profile: PistonPrecisionProfile, plan?: PistonPrecisionPlan,
) => {
  const r = (key: PistonPrecisionKey, v: number) => plan ? finiteRound(v, plan.digits[key]) : v;
  const points = observations.map(o => {
    const periodS = plan ? o.deltaMs !== undefined && Number.isSafeInteger(o.deltaMs) && Number.isSafeInteger(o.periodCount * 2) && o.periodCount > 0
      ? roundRatioSignificantFiguresHalfEven(BigInt(o.deltaMs) * BigInt(2), BigInt(1000) * BigInt(o.periodCount * 2), plan.periods[o.runIndex].period)
      : finiteRound(o.periodS, plan.periods[o.runIndex].period) : o.periodS;
    const x = plan && Number.isFinite(periodS) ? roundProductSignificantFiguresHalfEven(periodS, periodS, plan.periods[o.runIndex].squared) : periodS ** 2;
    return { ...o, periodS, x, y: o.heightM };
  });
  const n = points.length;
  const exactMeanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const exactMeanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  const fitSxx = points.reduce((sum, p) => sum + (p.x - exactMeanX) ** 2, 0);
  const exactSlope = points.reduce((sum, p) => sum + (p.x - exactMeanX) * (p.y - exactMeanY), 0) / fitSxx;
  const slope = r('slope', exactSlope);
  const intercept = r('intercept', exactMeanY - exactSlope * exactMeanX);
  const meanX = plan && n > 0 && points.every(p => Number.isFinite(p.x))
    ? roundMeanSignificantFiguresHalfEven(points.map(p => p.x), plan.digits.meanX) : exactMeanX;
  const meanY = r('meanY', exactMeanY);
  const sxx = r('sxx', points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0));
  const rows = points.map(p => ({
    ...p,
    residual: plan && Number.isFinite(slope) && Number.isFinite(intercept)
      ? roundSumProductsSignificantFiguresHalfEven([[p.y, 1], [slope, -p.x], [intercept, -1]], plan.digits.residualRow)
      : p.y - (slope * p.x + intercept),
    timeU: r('timeU', 1 / (p.sampleRateHz * p.periodCount * Math.sqrt(6))),
    heightSensitivity: r('heightSensitivity', (p.x - meanX) / sxx),
    periodSensitivity: r('periodSensitivity', 2 * p.periodS * ((p.y - meanY) - 2 * slope * (p.x - meanX)) / sxx),
  }));
  let q = plan && rows.every(row => Number.isFinite(row.residual))
    ? roundSumProductsSignificantFiguresHalfEven(rows.map(p => [p.residual, p.residual]), plan.digits.q)
    : rows.reduce((sum, p) => sum + p.residual ** 2, 0);
  if (q < Number.EPSILON ** 2 * Math.max(1, points.reduce((s, p) => s + p.y ** 2, 0)) * 64) {
    q = 0;
    rows.forEach(row => { row.residual = 0; });
  }
  const area = r('area', Math.PI * knowns.cylinderDiameterM ** 2 / 4);
  const gamma = r('gamma', 4 * Math.PI ** 2 * knowns.movingMassKg * slope / (area * knowns.pressurePa));
  const relativeError = finiteRound(100 * Math.abs(gamma - knowns.referenceGamma) / knowns.referenceGamma, 3);
  const residual = r('residual', Math.sqrt(q / (n - 2)));
  const slopeA = r('slopeA', residual / Math.sqrt(sxx));
  const gammaA = r('gammaA', Math.abs(gamma / slope) * slopeA);
  const mass = r('mass', profile.massLimitKg / Math.sqrt(3));
  const diameter = r('diameter', profile.diameterLimitM / Math.sqrt(3));
  const pressure = profile.pressureStandardPa;
  const heightScale = r('heightScale', profile.heightScaleLimit / Math.sqrt(3));
  const timeScale = r('timeScale', profile.timeScaleLimit / Math.sqrt(3));
  const heightReadout = r('heightReadout', profile.heightStepM / Math.sqrt(12));
  const slopeReadout = r('slopeReadout', Math.sqrt(rows.reduce((sum, p) => sum + (p.heightSensitivity * heightReadout) ** 2 + (p.periodSensitivity * p.timeU) ** 2, 0)));
  // Existing course-specific overlap rule, unchanged.
  const slopeSupplement = r('slopeSupplement', Math.sqrt(Math.max(0, slopeReadout ** 2 - slopeA ** 2)));
  const slopeB = r('slopeB', Math.hypot(slope * heightScale, 2 * slope * timeScale, slopeSupplement));
  const gammaB = r('gammaB', Math.abs(gamma) * Math.hypot(slopeB / slope, mass / knowns.movingMassKg, 2 * diameter / knowns.cylinderDiameterM, pressure / knowns.pressurePa));
  const combined = r('combined', Math.hypot(gammaA, gammaB));
  const relative = finiteRound(100 * combined / Math.abs(gamma), 3);
  const reportCombined = finiteRound(combined, 2); // final report only; no coverage multiplier
  const resultPower = reportCombined > 0 && Number.isFinite(reportCombined) ? Math.floor(Math.log10(reportCombined)) - 1 : 0;
  const result = Number.isFinite(gamma) ? Number(`${formatDecimalPlacesHalfEven(gamma / 10 ** resultPower, 0)}e${resultPower}`) : NaN;
  const values = { meanX, sxx, residual, slopeA, gammaA, mass, diameter, pressure, heightScale, timeScale, heightReadout, slopeReadout, slopeSupplement, slopeB, gammaB, combined, relative, reportCombined, result };
  const total = points.reduce((sum, p) => sum + (p.y - exactMeanY) ** 2, 0);
  const rSquared = total > 0 ? 1 - rows.reduce((sum, p) => sum + p.residual ** 2, 0) / total : 1;
  return { n, area, gamma, relativeError, slope, intercept, meanX, meanY, sxx, q, rows, values, resultPower, rSquared };
};
export type PistonPrecisionChain = ReturnType<typeof evaluatePistonPrecisionChain>;

export const assessPistonPrecision = (actual: PistonPrecisionChain, reference: PistonPrecisionChain) => {
  const uc = reference.values.combined;
  const gammaErrorInUc = Math.abs(actual.gamma - reference.gamma) / uc;
  const combinedRelativeError = Math.abs(actual.values.combined - uc) / uc;
  const budgetsAgree = ['gammaA', 'gammaB', 'combined'].every(key => Math.abs(actual.values[key as 'gammaA'] - reference.values[key as 'gammaA']) <= uc * 0.001);
  const sourcesAgree = ['mass', 'diameter', 'pressure', 'heightScale', 'timeScale', 'heightReadout'].every(key => {
    const id = key as 'mass';
    return Math.abs(actual.values[id] - reference.values[id]) <= Math.abs(reference.values[id]) * 0.001;
  });
  const supplementAgrees = Math.abs(actual.values.slopeSupplement - reference.values.slopeSupplement) * Math.abs(reference.gamma / reference.slope) <= uc * 0.001;
  const reportsAgree = actual.values.reportCombined === reference.values.reportCombined
    && actual.values.result === reference.values.result && actual.resultPower === reference.resultPower
    && actual.values.relative === reference.values.relative && actual.relativeError === reference.relativeError;
  return { verified: gammaErrorInUc <= 0.001 && combinedRelativeError <= 0.001 && budgetsAgree && sourcesAgree && supplementAgrees && reportsAgree, gammaErrorInUc, combinedRelativeError };
};

/** Find a compact, data-specific plan. Remove a digit only after re-evaluating
 * the WHOLE chain, including subtraction and the actual final rounding cells.
 * The result is coordinate-minimal within the documented per-quantity floors;
 * it is deliberately not described as a global mathematical minimum. */
export const planPistonPrecision = (
  knowns: PistonPrecisionKnowns, observations: readonly PistonPrecisionObservation[], profile: PistonPrecisionProfile,
): { plan: PistonPrecisionPlan; chain: PistonPrecisionChain; reference: PistonPrecisionChain } => {
  const reference = evaluatePistonPrecisionChain(knowns, observations, profile);
  const keys = Object.keys(PISTON_PRECISION_MINIMUM) as PistonPrecisionKey[];
  const plan: PistonPrecisionPlan = {
    version: PISTON_PRECISION_VERSION,
    digits: { ...PISTON_PRECISION_MINIMUM },
    periods: Object.fromEntries(observations.map(o => [o.runIndex, { period: o.periodDigits ?? PISTON_PERIOD_DIGITS, squared: o.squaredDigits ?? PISTON_SQUARED_DIGITS }])),
    verified: false, gammaErrorInUc: Infinity, combinedRelativeError: Infinity,
  };
  const check = () => assessPistonPrecision(evaluatePistonPrecisionChain(knowns, observations, profile, plan), reference);
  if (Number.isFinite(reference.values.combined) && reference.values.combined > 0 && reference.slope > 0) {
    // Escalate calculation nodes first. Change a previously required period
    // precision only if no downstream precision can compensate for its loss.
    for (let periodExtra = 0; periodExtra <= 6; periodExtra++) {
      for (const o of observations) plan.periods[o.runIndex] = {
        period: Math.min(12, (o.periodDigits ?? PISTON_PERIOD_DIGITS) + periodExtra),
        squared: Math.min(12, (o.squaredDigits ?? PISTON_SQUARED_DIGITS) + periodExtra),
      };
      for (let extra = 0; extra <= 9; extra++) {
        keys.forEach(key => { plan.digits[key] = Math.min(12, PISTON_PRECISION_MINIMUM[key] + extra); });
        if (check().verified) break;
      }
      if (check().verified) break;
    }
    if (check().verified) {
      // Earlier operands are reduced last, so cancellation-sensitive nodes can
      // retain their protection while inexpensive downstream nodes are shortened.
      let changed = true;
      while (changed) {
        changed = false;
        for (const key of [...keys].reverse()) {
          if (plan.digits[key] <= PISTON_PRECISION_MINIMUM[key]) continue;
          plan.digits[key]--;
          if (check().verified) changed = true; else plan.digits[key]++;
        }
        for (const o of observations) {
          const period = plan.periods[o.runIndex];
          for (const [key, minimum] of [['period', o.periodDigits ?? PISTON_PERIOD_DIGITS], ['squared', o.squaredDigits ?? PISTON_SQUARED_DIGITS]] as const) {
            if (period[key] <= minimum) continue;
            period[key]--;
            if (check().verified) changed = true; else period[key]++;
          }
        }
      }
    }
  }
  Object.assign(plan, check());
  return { plan, chain: evaluatePistonPrecisionChain(knowns, observations, profile, plan), reference };
};
