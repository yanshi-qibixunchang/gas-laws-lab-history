import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
  formatHeatCapacityCalculationReference,
  getHeatCapacityLastSignificantDigitTolerance,
  parseHeatCapacityCalculationInput,
  validateHeatCapacityCalculationAnswer,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';

const parsedDecimal = parseHeatCapacityCalculationInput('  +001.400  ');
assert.equal(parsedDecimal.status, 'valid');
if (parsedDecimal.status === 'valid') {
  assert.equal(parsedDecimal.parsed.value, 1.4);
  assert.equal(parsedDecimal.parsed.notation, 'decimal');
  assert.equal(parsedDecimal.parsed.significantFigures, 4);
  assert.equal(parsedDecimal.parsed.lastWrittenDigitPower, -3);
  assert.equal(parsedDecimal.parsed.normalizedInput, '+001.400');
}

const parsedScientific = parseHeatCapacityCalculationInput('1.01300e2');
assert.equal(parsedScientific.status, 'valid');
if (parsedScientific.status === 'valid') {
  assert.equal(parsedScientific.parsed.value, 101.3);
  assert.equal(parsedScientific.parsed.notation, 'scientific');
  assert.equal(parsedScientific.parsed.exponent, 2);
  assert.equal(parsedScientific.parsed.significantFigures, 6);
  assert.equal(parsedScientific.parsed.lastWrittenDigitPower, -3);
}

const parsedSmall = parseHeatCapacityCalculationInput('0.0050');
assert.equal(parsedSmall.status, 'valid');
if (parsedSmall.status === 'valid') {
  assert.equal(parsedSmall.parsed.significantFigures, 2);
  assert.equal(parsedSmall.parsed.lastWrittenDigitPower, -4);
}

assert.equal(parseHeatCapacityCalculationInput(' ').status, 'empty');
assert.equal(parseHeatCapacityCalculationInput('106.905 kPa').status, 'invalid');
assert.equal(parseHeatCapacityCalculationInput('1.400%').status, 'invalid');
assert.equal(parseHeatCapacityCalculationInput('1,400').status, 'invalid');
assert.equal(parseHeatCapacityCalculationInput('NaN').status, 'invalid');
assert.equal(parseHeatCapacityCalculationInput('Infinity').status, 'invalid');
assert.equal(parseHeatCapacityCalculationInput('1e999').status, 'invalid');

const correctedVoltage = validateHeatCapacityCalculationAnswer(
  '112.0',
  112.05,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.correctedVoltage,
);
assert.equal(correctedVoltage.numericCorrect, true);
assert.equal(correctedVoltage.precisionCorrect, true);
assert.equal(correctedVoltage.correct, true);

const correctedVoltageScientific = validateHeatCapacityCalculationAnswer(
  '1.120e2',
  112.05,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.correctedVoltage,
);
assert.equal(correctedVoltageScientific.numericCorrect, true);
assert.equal(correctedVoltageScientific.precisionCorrect, true);
assert.equal(correctedVoltageScientific.correct, true);

const correctedVoltageWrongPlaces = validateHeatCapacityCalculationAnswer(
  '112',
  112.05,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.correctedVoltage,
);
assert.equal(correctedVoltageWrongPlaces.numericCorrect, true);
assert.equal(correctedVoltageWrongPlaces.precisionCorrect, false);
assert.equal(correctedVoltageWrongPlaces.correct, false);

const pressure = validateHeatCapacityCalculationAnswer(
  '106.905',
  106.905,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.absolutePressure,
);
assert.equal(pressure.correct, true);

const pressureScientific = validateHeatCapacityCalculationAnswer(
  '1.06905e2',
  106.905,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.absolutePressure,
);
assert.equal(pressureScientific.correct, true);

const pressureWrongPlaces = validateHeatCapacityCalculationAnswer(
  '106.91',
  106.905,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.absolutePressure,
);
assert.equal(pressureWrongPlaces.numericCorrect, true);
assert.equal(pressureWrongPlaces.precisionCorrect, false);

const gammaWrongPrecision = validateHeatCapacityCalculationAnswer(
  '1.4',
  1.4,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.gamma,
);
assert.equal(gammaWrongPrecision.numericCorrect, true);
assert.equal(gammaWrongPrecision.precisionCorrect, false);
assert.equal(gammaWrongPrecision.correct, false);

const gammaCorrect = validateHeatCapacityCalculationAnswer(
  '1.400',
  1.4,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.gamma,
);
assert.equal(gammaCorrect.correct, true);

const gammaAtToleranceBoundary = validateHeatCapacityCalculationAnswer(
  '1.390',
  1.4,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.gamma,
);
assert.equal(gammaAtToleranceBoundary.numericCorrect, true);
assert.equal(gammaAtToleranceBoundary.precisionCorrect, true);
assert.equal(gammaAtToleranceBoundary.correct, true);

const gammaOutsideTolerance = validateHeatCapacityCalculationAnswer(
  '1.389',
  1.4,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.gamma,
);
assert.equal(gammaOutsideTolerance.numericCorrect, false);

assert.equal(
  getHeatCapacityLastSignificantDigitTolerance(0.003511, 2),
  0.0001,
);
assert.equal(
  getHeatCapacityLastSignificantDigitTolerance(35.11, 2),
  1,
);
assert.equal(getHeatCapacityLastSignificantDigitTolerance(0, 2), 0);

const uncertaintyCorrect = validateHeatCapacityCalculationAnswer(
  '0.0035',
  0.003511,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.sampleStandardDeviation,
);
assert.equal(uncertaintyCorrect.tolerance, 0.0001);
assert.equal(uncertaintyCorrect.numericCorrect, true);
assert.equal(uncertaintyCorrect.precisionCorrect, true);
assert.equal(uncertaintyCorrect.correct, true);

const uncertaintyScientific = validateHeatCapacityCalculationAnswer(
  '3.5e-3',
  0.003511,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.typeAStandardUncertainty,
);
assert.equal(uncertaintyScientific.correct, true);

const uncertaintyOutsideTolerance = validateHeatCapacityCalculationAnswer(
  '0.0034',
  0.003511,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.sampleStandardDeviation,
);
assert.equal(uncertaintyOutsideTolerance.numericCorrect, false);

const relativeError = validateHeatCapacityCalculationAnswer(
  '2.60',
  2.5,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.relativeErrorPercent,
);
assert.equal(relativeError.correct, true);
const relativeErrorOutsideTolerance = validateHeatCapacityCalculationAnswer(
  '2.61',
  2.5,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.relativeErrorPercent,
);
assert.equal(relativeErrorOutsideTolerance.numericCorrect, false);

const unitRejected = validateHeatCapacityCalculationAnswer(
  '1.400 kg',
  1.4,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.gamma,
);
assert.equal(unitRejected.parseResult.status, 'invalid');
assert.equal(unitRejected.correct, false);

assert.equal(
  formatHeatCapacityCalculationReference(
    112,
    HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.correctedVoltage,
  ),
  '112.0',
);
assert.equal(
  formatHeatCapacityCalculationReference(
    106.905,
    HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.absolutePressure,
  ),
  '106.905',
);
assert.equal(
  formatHeatCapacityCalculationReference(
    1.4,
    HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.gamma,
  ),
  '1.400',
);
assert.equal(
  formatHeatCapacityCalculationReference(
    0.003511,
    HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.sampleStandardDeviation,
  ),
  '0.0035',
);

const zeroStandardDeviationReference = formatHeatCapacityCalculationReference(
  0,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.sampleStandardDeviation,
);
assert.equal(zeroStandardDeviationReference, '0.0');
const zeroStandardDeviation = validateHeatCapacityCalculationAnswer(
  zeroStandardDeviationReference,
  0,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.sampleStandardDeviation,
);
assert.equal(zeroStandardDeviation.precisionCorrect, true);
assert.equal(zeroStandardDeviation.correct, true);

const zeroRelativeErrorReference = formatHeatCapacityCalculationReference(
  0,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.relativeErrorPercent,
);
assert.equal(zeroRelativeErrorReference, '0.00');
const zeroRelativeError = validateHeatCapacityCalculationAnswer(
  zeroRelativeErrorReference,
  0,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.relativeErrorPercent,
);
assert.equal(zeroRelativeError.precisionCorrect, true);
assert.equal(zeroRelativeError.correct, true);

console.log('heatCapacityCalculationValidation tests passed');
