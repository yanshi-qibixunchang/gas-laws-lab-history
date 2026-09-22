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
} from '../calculation/decimalHalfEven.ts';

export const roundHeatCapacityTeachingValue = (
  value: number,
  kind: HeatCapacityCalculationAnswerKind,
) => Number(formatHeatCapacityCalculationReference(value, HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[kind]));

// The teaching calculation consumes exactly the known values and intermediate
// answers shown in the worksheet. Raw measurements remain in their own records.
export const createDisplayedHeatCapacityGroupReference = (
  original: HeatCapacityCalculationGroupReference,
): HeatCapacityCalculationGroupReference => {
  const sensitivity = roundSignificantFiguresHalfEven(
    original.pressureSensitivityMvPerKPa ?? original.u1PrimeMv / (original.p1KPa - original.p0KPa), 4,
  );
  const reference = calculateHeatCapacityGroupReference({
    u0Mv: roundHeatCapacityTeachingValue(original.u0Mv, 'correctedVoltage'),
    u1Mv: roundHeatCapacityTeachingValue(original.u1Mv, 'correctedVoltage'),
    u2Mv: roundHeatCapacityTeachingValue(original.u2Mv, 'correctedVoltage'),
    atmosphericPressureKPa: roundHeatCapacityTeachingValue(original.p0KPa, 'absolutePressure'),
    pressureSensitivityMvPerKPa: sensitivity,
  });
  if (!reference) throw new Error('The displayed heat-capacity known values are invalid.');
  const p1KPa = roundHeatCapacityTeachingValue(reference.p1KPa, 'absolutePressure');
  const p2KPa = roundHeatCapacityTeachingValue(reference.p2KPa, 'absolutePressure');
  const gamma = calculateHeatCapacityFormulaGamma(reference.p0KPa, p1KPa, p2KPa);
  if (gamma === null) throw new Error('Displayed pressures cannot resolve a valid heat-capacity ratio.');
  return {
    ...reference, p1KPa, p2KPa,
    pressureSensitivityMvPerKPa: sensitivity,
    formulaGamma: roundHeatCapacityTeachingValue(gamma, 'gamma'),
  };
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
