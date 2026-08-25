import {
  formatNumericAnswerReference,
  getLastSignificantDigitTolerance,
  hasRequiredNumericAnswerPrecision,
  parseNumericAnswerInput,
  resolveNumericAnswerTolerance,
  validateNumericAnswer,
  type NumericAnswerInputParseResult,
  type NumericAnswerPrecisionRequirement,
  type NumericAnswerSpec,
  type NumericAnswerTolerance,
  type NumericAnswerValidationResult,
  type ParsedNumericAnswerInput,
} from '../calculation/numericAnswerValidation.ts';

export type HeatCapacityCalculationAnswerKind =
  | 'correctedVoltage'
  | 'absolutePressure'
  | 'gamma'
  | 'meanGamma'
  | 'sampleStandardDeviation'
  | 'typeAStandardUncertainty'
  | 'relativeErrorPercent';

export type HeatCapacityCalculationPrecisionRequirement =
  NumericAnswerPrecisionRequirement;
export type HeatCapacityCalculationTolerance = NumericAnswerTolerance;
export type HeatCapacityCalculationAnswerSpec = NumericAnswerSpec;
export type ParsedHeatCapacityCalculationInput = ParsedNumericAnswerInput;
export type HeatCapacityCalculationInputParseResult = NumericAnswerInputParseResult;
export type HeatCapacityCalculationValidationResult = NumericAnswerValidationResult;

export const parseHeatCapacityCalculationInput = parseNumericAnswerInput;

export const HEAT_CAPACITY_CALCULATION_ANSWER_SPECS = {
  correctedVoltage: {
    precision: {
      type: 'decimal-places',
      digits: 1,
    },
    tolerance: {
      type: 'absolute',
      value: 0.1,
    },
  },
  absolutePressure: {
    precision: {
      type: 'decimal-places',
      digits: 3,
    },
    tolerance: {
      type: 'absolute',
      value: 0.01,
    },
  },
  gamma: {
    precision: {
      type: 'significant-figures',
      digits: 4,
    },
    tolerance: {
      type: 'absolute',
      value: 0.01,
    },
  },
  meanGamma: {
    precision: {
      type: 'significant-figures',
      digits: 4,
    },
    tolerance: {
      type: 'absolute',
      value: 0.01,
    },
  },
  sampleStandardDeviation: {
    precision: {
      type: 'significant-figures',
      digits: 2,
    },
    tolerance: {
      type: 'last-significant-digit',
    },
  },
  typeAStandardUncertainty: {
    precision: {
      type: 'significant-figures',
      digits: 2,
    },
    tolerance: {
      type: 'last-significant-digit',
    },
  },
  relativeErrorPercent: {
    precision: {
      type: 'significant-figures',
      digits: 3,
    },
    tolerance: {
      type: 'absolute',
      value: 0.1,
    },
  },
} as const satisfies Record<
  HeatCapacityCalculationAnswerKind,
  HeatCapacityCalculationAnswerSpec
>;

export const getHeatCapacityLastSignificantDigitTolerance =
  getLastSignificantDigitTolerance;
export const resolveHeatCapacityCalculationTolerance = resolveNumericAnswerTolerance;
export const hasRequiredHeatCapacityCalculationPrecision =
  hasRequiredNumericAnswerPrecision;
export const validateHeatCapacityCalculationAnswer = validateNumericAnswer;
export const formatHeatCapacityCalculationReference = formatNumericAnswerReference;
