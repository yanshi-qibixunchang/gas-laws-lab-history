import {
  calculateHeatCapacityFormulaGamma,
  calculateHeatCapacityGroupReference,
  calculateHeatCapacityRelativeErrorPercent,
  type HeatCapacityCalculationBatchStatistics,
  type HeatCapacityCalculationGroupReference,
} from './heatCapacityCalculationModel.ts';
import {
  formatHeatCapacityCalculationReference,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
  type HeatCapacityCalculationAnswerKind,
} from './heatCapacityCalculationValidation.ts';
import {
  roundMeanSignificantFiguresHalfEven,
  roundRootSumSquaresHalfEven,
  roundSignificantFiguresHalfEven,
  roundDecimalPlacesHalfEven,
  roundSumProductsSignificantFiguresHalfEven,
} from '../calculation/decimalHalfEven.ts';
import { truncateHeatCapacitySignalMv } from './heatCapacitySignalDisplayModel.ts';

export const roundHeatCapacityTeachingValue = (
  value: number,
  kind: HeatCapacityCalculationAnswerKind,
) => Number(formatHeatCapacityCalculationReference(value, HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[kind]));

// The teaching calculation consumes exactly the known values and intermediate
// answers shown in the worksheet. Raw measurements remain in their own records.
export const createDisplayedHeatCapacityGroupReference = (
  original: HeatCapacityCalculationGroupReference,
  publicReadings = false,
): HeatCapacityCalculationGroupReference => {
  const sensitivity = roundSignificantFiguresHalfEven(
    original.pressureSensitivityMvPerKPa ?? original.u1PrimeMv / (original.p1KPa - original.p0KPa), 4,
  );
  const reference = calculateHeatCapacityGroupReference({
    u0Mv: publicReadings ? truncateHeatCapacitySignalMv(original.u0Mv) : roundHeatCapacityTeachingValue(original.u0Mv, 'correctedVoltage'),
    u1Mv: publicReadings ? truncateHeatCapacitySignalMv(original.u1Mv) : roundHeatCapacityTeachingValue(original.u1Mv, 'correctedVoltage'),
    u2Mv: publicReadings ? truncateHeatCapacitySignalMv(original.u2Mv) : roundHeatCapacityTeachingValue(original.u2Mv, 'correctedVoltage'),
    atmosphericPressureKPa: publicReadings ? original.p0KPa : roundHeatCapacityTeachingValue(original.p0KPa, 'absolutePressure'),
    pressureSensitivityMvPerKPa: sensitivity,
  });
  if (!reference) throw new Error('The displayed heat-capacity known values are invalid.');
  const u1PrimeMv = roundHeatCapacityTeachingValue(reference.u1PrimeMv, 'correctedVoltage');
  const u2PrimeMv = roundHeatCapacityTeachingValue(reference.u2PrimeMv, 'correctedVoltage');
  const p1KPa = roundHeatCapacityTeachingValue(publicReadings ? reference.p0KPa + u1PrimeMv / sensitivity : reference.p1KPa, 'absolutePressure');
  const p2KPa = roundHeatCapacityTeachingValue(publicReadings ? reference.p0KPa + u2PrimeMv / sensitivity : reference.p2KPa, 'absolutePressure');
  const gamma = calculateHeatCapacityFormulaGamma(reference.p0KPa, p1KPa, p2KPa);
  if (gamma === null) throw new Error('Displayed pressures cannot resolve a valid heat-capacity ratio.');
  return {
    ...reference, p1KPa, p2KPa,
    u1PrimeMv,
    u2PrimeMv,
    pressureSensitivityMvPerKPa: sensitivity,
    formulaGamma: roundHeatCapacityTeachingValue(gamma, 'gamma'),
  };
};

/** Single public, sequential calculation chain. No simulation truth is consumed. */
export const calculateHeatCapacityTypeAStatistics = (
  gammas: readonly number[], theoreticalGamma: number,
): HeatCapacityCalculationBatchStatistics => {
  if (gammas.length < 2 || gammas.some(value => !Number.isFinite(value))) {
    throw new Error('At least two finite results are required for batch statistics.');
  }
  const meanGamma = roundMeanSignificantFiguresHalfEven(gammas, 4);
  // Exact decimal expansion avoids cancellation and binary ties in Q.
  const terms = gammas.flatMap(g => [[g, g], [-g, meanGamma], [-g, meanGamma], [meanGamma, meanGamma]] as const);
  const sumSquaredDeviations = roundSumProductsSignificantFiguresHalfEven(terms, 4);
  const sampleStandardDeviation = roundSignificantFiguresHalfEven(Math.sqrt(sumSquaredDeviations / (gammas.length - 1)), 3);
  const typeAStandardUncertainty = roundRootSumSquaresHalfEven([sampleStandardDeviation], 0, gammas.length, 3);
  const reportTypeA = roundSignificantFiguresHalfEven(typeAStandardUncertainty, 2);
  const reportDecimalPlaces = reportTypeA === 0 ? undefined : Math.max(0, 1 - Math.floor(Math.log10(reportTypeA)));
  const reportMeanGamma = reportDecimalPlaces === undefined ? meanGamma : roundDecimalPlacesHalfEven(meanGamma, reportDecimalPlaces);
  const relativeError = calculateHeatCapacityRelativeErrorPercent(meanGamma, theoreticalGamma);
  if (relativeError === null) throw new Error('The theoretical heat-capacity ratio is invalid.');
  return { count: gammas.length, meanGamma, sumSquaredDeviations, sampleStandardDeviation,
    typeAStandardUncertainty, reportTypeA, reportMeanGamma,
    ...(reportDecimalPlaces === undefined ? {} : { reportDecimalPlaces }),
    relativeErrorPercent: roundHeatCapacityTeachingValue(relativeError, 'relativeErrorPercent') };
};

export const calculateDisplayedHeatCapacityBatchStatistics = (
  gammas: readonly number[],
  theoreticalGamma: number,
): HeatCapacityCalculationBatchStatistics => {
  const count = gammas.length;
  if (count < 2) throw new Error('At least two trials are required for batch statistics.');
  const meanGamma = roundMeanSignificantFiguresHalfEven(gammas, 4);
  const sampleStandardDeviation = roundRootSumSquaresHalfEven(gammas, meanGamma, count - 1, 2);
  const typeAStandardUncertainty = roundRootSumSquaresHalfEven([sampleStandardDeviation], 0, count, 2);
  const relativeError = calculateHeatCapacityRelativeErrorPercent(meanGamma, theoreticalGamma);
  if (relativeError === null) throw new Error('The theoretical heat-capacity ratio is invalid.');
  return { count, meanGamma, sampleStandardDeviation, typeAStandardUncertainty,
    relativeErrorPercent: roundHeatCapacityTeachingValue(relativeError, 'relativeErrorPercent') };
};
