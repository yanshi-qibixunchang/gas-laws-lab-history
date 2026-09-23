import type { HeatCapacityCalculationGroupReference } from './heatCapacityCalculationModel.ts';
import {
  roundDecimalPlacesHalfEven, roundRootSumSquaresHalfEven,
  roundSignificantFiguresHalfEven, roundSumProductsSignificantFiguresHalfEven,
} from '../calculation/decimalHalfEven.ts';

/** Given standard uncertainty for the virtual instrument; not a resolution or error limit. */
export const HEAT_CAPACITY_VOLTAGE_STANDARD_UNCERTAINTY_MV = 0.1;

/** Sensitivities of the existing logarithmic measurement equation, per mV.
 * U0 is the same operand in both corrected voltages and is propagated once.
 * Inputs are the pressures and sensitivity published by the calculation course.
 */
export const getHeatCapacityVoltageSensitivities = (r: HeatCapacityCalculationGroupReference) => {
  const s = r.pressureSensitivityMvPerKPa;
  if (!s || !Number.isFinite(s) || s <= 0 ||
      ![r.p0KPa, r.p1KPa, r.p2KPa].every(Number.isFinite) ||
      !(r.p1KPa > r.p2KPa && r.p2KPa > r.p0KPa && r.p0KPa > 0)) {
    throw new Error('Public pressures and sensitivity are required for voltage propagation.');
  }
  const l = Math.log(r.p1KPa / r.p2KPa);
  const c1 = Math.log(r.p0KPa / r.p2KPa) / (s * r.p1KPa * l * l);
  const c2 = Math.log(r.p1KPa / r.p0KPa) / (s * r.p2KPa * l * l);
  return [-c1 - c2, c1, c2] as const;
};

/** Same-position instrument effects are shared across trials; the three
 * positions are uncorrelated. Average sensitivities before taking their norm.
 * The instrument uncertainty is never divided by sqrt(trial count).
 */
export const calculateHeatCapacityInstrumentBudget = (
  groups: readonly HeatCapacityCalculationGroupReference[],
  meanGamma: number, typeAStandardUncertainty: number,
) => {
  if (groups.length !== 3 || !Number.isFinite(meanGamma) || meanGamma <= 0 ||
      !Number.isFinite(typeAStandardUncertainty) || typeAStandardUncertainty < 0) {
    throw new Error('The instrument course requires three valid trials and checked statistics.');
  }
  const sensitivities = groups.map(getHeatCapacityVoltageSensitivities);
  const meanSensitivity = [0, 1, 2].map(j => sensitivities.reduce((sum, row) => sum + row[j]!, 0) / groups.length);
  const propagationCoefficient = roundSignificantFiguresHalfEven(Math.hypot(...meanSensitivity), 4);
  if (!Number.isFinite(propagationCoefficient) || propagationCoefficient <= 0) {
    throw new Error('The public data cannot resolve a finite propagation coefficient.');
  }
  const voltageInstrumentStandardUncertaintyMv = HEAT_CAPACITY_VOLTAGE_STANDARD_UNCERTAINTY_MV;
  // Each operation consumes exactly the public, rounded answer of its predecessor.
  const typeBStandardUncertainty = roundSumProductsSignificantFiguresHalfEven([[propagationCoefficient, voltageInstrumentStandardUncertaintyMv]], 3);
  const combinedStandardUncertainty = roundRootSumSquaresHalfEven([typeAStandardUncertainty, typeBStandardUncertainty], 0, 1, 3);
  const reportCombined = roundSignificantFiguresHalfEven(combinedStandardUncertainty, 2);
  const reportDecimalPlaces = Math.max(0, 1 - Math.floor(Math.log10(reportCombined)));
  return { voltageInstrumentStandardUncertaintyMv,
    propagationCoefficient, typeBStandardUncertainty, combinedStandardUncertainty,
    reportCombined, reportDecimalPlaces, reportMeanGamma: roundDecimalPlacesHalfEven(meanGamma, reportDecimalPlaces) };
};
