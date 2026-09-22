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

export const LEGACY_HEAT_CAPACITY_CALCULATION_ANSWER_SPECS = {
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

export const HEAT_CAPACITY_STRICT_ANSWER_RULE = 'strict-half-even-v2' as const;
export type HeatCapacityCalculationAnswerRule =
  | 'legacy-tolerance-v1'
  | typeof HEAT_CAPACITY_STRICT_ANSWER_RULE;

export const HEAT_CAPACITY_CALCULATION_ANSWER_SPECS = Object.fromEntries(
  Object.entries(LEGACY_HEAT_CAPACITY_CALCULATION_ANSWER_SPECS).map(([kind, spec]) => [
    kind,
    { ...spec, tolerance: { type: 'absolute', value: 0 }, roundingMode: 'half-even' },
  ]),
) as Record<HeatCapacityCalculationAnswerKind, HeatCapacityCalculationAnswerSpec>;

// Unversioned saved sessions predate strict grading and retain their old rules.
export const getHeatCapacityCalculationAnswerSpec = (
  kind: HeatCapacityCalculationAnswerKind,
  rule?: HeatCapacityCalculationAnswerRule,
): HeatCapacityCalculationAnswerSpec => (
  rule === HEAT_CAPACITY_STRICT_ANSWER_RULE
    ? HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[kind]
    : LEGACY_HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[kind]
);

export const getHeatCapacityLastSignificantDigitTolerance =
  getLastSignificantDigitTolerance;
export const resolveHeatCapacityCalculationTolerance = resolveNumericAnswerTolerance;
export const hasRequiredHeatCapacityCalculationPrecision =
  hasRequiredNumericAnswerPrecision;
export const validateHeatCapacityCalculationAnswer = (
  rawInput: string,
  expectedValue: number,
  spec: HeatCapacityCalculationAnswerSpec,
): HeatCapacityCalculationValidationResult => validateNumericAnswer(
  rawInput,
  // Match the displayed reference exactly; measurement uncertainty is not an
  // answer tolerance. Keep the raw calculation result intact for other uses.
  spec.roundingMode === 'half-even' && spec.tolerance.type === 'absolute' && spec.tolerance.value === 0
    ? Number(formatNumericAnswerReference(expectedValue, spec))
    : expectedValue,
  spec,
);
export const formatHeatCapacityCalculationReference = formatNumericAnswerReference;
