export type HeatCapacityCalculationAnswerKind =
  | 'correctedVoltage'
  | 'absolutePressure'
  | 'gamma'
  | 'meanGamma'
  | 'sampleStandardDeviation'
  | 'typeAStandardUncertainty'
  | 'relativeErrorPercent';

export type HeatCapacityCalculationPrecisionRequirement =
  | {
    type: 'decimal-places';
    digits: number;
  }
  | {
    type: 'significant-figures';
    digits: number;
  };

export type HeatCapacityCalculationTolerance =
  | {
    type: 'absolute';
    value: number;
  }
  | {
    type: 'last-significant-digit';
  };

export interface HeatCapacityCalculationAnswerSpec {
  precision: HeatCapacityCalculationPrecisionRequirement;
  tolerance: HeatCapacityCalculationTolerance;
}

export interface ParsedHeatCapacityCalculationInput {
  rawInput: string;
  normalizedInput: string;
  value: number;
  notation: 'decimal' | 'scientific';
  exponent: number;
  significantFigures: number;
  lastWrittenDigitPower: number;
}

export type HeatCapacityCalculationInputParseResult =
  | {
    status: 'empty';
    rawInput: string;
  }
  | {
    status: 'invalid';
    rawInput: string;
    reason: 'invalid-format' | 'non-finite';
  }
  | {
    status: 'valid';
    parsed: ParsedHeatCapacityCalculationInput;
  };

export interface HeatCapacityCalculationValidationResult {
  parseResult: HeatCapacityCalculationInputParseResult;
  expectedValue: number;
  tolerance: number;
  absoluteError: number | null;
  numericCorrect: boolean;
  precisionCorrect: boolean;
  correct: boolean;
}

const STRICT_NUMERIC_INPUT_PATTERN =
  /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;

const validateWholeNumber = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer.`);
  }
};

const countSignificantFigures = (mantissa: string) => {
  const unsignedMantissa = mantissa.replace(/^[+-]/, '');
  const decimalIndex = unsignedMantissa.indexOf('.');
  const digits = unsignedMantissa.replace('.', '');
  const firstNonZeroIndex = digits.search(/[1-9]/);
  if (firstNonZeroIndex >= 0) {
    return digits.length - firstNonZeroIndex;
  }

  if (decimalIndex >= 0) {
    const fractionDigits = unsignedMantissa.length - decimalIndex - 1;
    const hasWrittenWholeZero = decimalIndex > 0;
    return Math.max(1, fractionDigits + (hasWrittenWholeZero ? 1 : 0));
  }
  return 1;
};

export const parseHeatCapacityCalculationInput = (
  rawInput: string,
): HeatCapacityCalculationInputParseResult => {
  const normalizedInput = rawInput.trim();
  if (normalizedInput.length === 0) {
    return {
      status: 'empty',
      rawInput,
    };
  }
  if (!STRICT_NUMERIC_INPUT_PATTERN.test(normalizedInput)) {
    return {
      status: 'invalid',
      rawInput,
      reason: 'invalid-format',
    };
  }

  const value = Number(normalizedInput);
  if (!Number.isFinite(value)) {
    return {
      status: 'invalid',
      rawInput,
      reason: 'non-finite',
    };
  }

  const exponentMarkerIndex = normalizedInput.search(/[eE]/);
  const mantissa = exponentMarkerIndex >= 0
    ? normalizedInput.slice(0, exponentMarkerIndex)
    : normalizedInput;
  const exponent = exponentMarkerIndex >= 0
    ? Number(normalizedInput.slice(exponentMarkerIndex + 1))
    : 0;
  const decimalIndex = mantissa.indexOf('.');
  const fractionDigits = decimalIndex >= 0
    ? mantissa.length - decimalIndex - 1
    : 0;

  return {
    status: 'valid',
    parsed: {
      rawInput,
      normalizedInput,
      value,
      notation: exponentMarkerIndex >= 0 ? 'scientific' : 'decimal',
      exponent,
      significantFigures: countSignificantFigures(mantissa),
      lastWrittenDigitPower: exponent - fractionDigits,
    },
  };
};

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

export const getHeatCapacityLastSignificantDigitTolerance = (
  expectedValue: number,
  significantFigures: number,
): number => {
  validateWholeNumber(significantFigures, 'significantFigures');
  if (significantFigures === 0) {
    throw new RangeError('significantFigures must be greater than zero.');
  }
  if (!Number.isFinite(expectedValue)) {
    throw new RangeError('expectedValue must be finite.');
  }
  if (expectedValue === 0) return 0;

  const leadingDigitPower = Math.floor(Math.log10(Math.abs(expectedValue)));
  return 10 ** (leadingDigitPower - significantFigures + 1);
};

export const resolveHeatCapacityCalculationTolerance = (
  expectedValue: number,
  spec: HeatCapacityCalculationAnswerSpec,
): number => {
  if (spec.tolerance.type === 'absolute') {
    if (
      !Number.isFinite(spec.tolerance.value) ||
      spec.tolerance.value < 0
    ) {
      throw new RangeError('Absolute tolerance must be finite and non-negative.');
    }
    return spec.tolerance.value;
  }
  if (spec.precision.type !== 'significant-figures') {
    throw new TypeError(
      'Last-significant-digit tolerance requires a significant-figures precision rule.',
    );
  }
  return getHeatCapacityLastSignificantDigitTolerance(
    expectedValue,
    spec.precision.digits,
  );
};

export const hasRequiredHeatCapacityCalculationPrecision = (
  parsed: ParsedHeatCapacityCalculationInput,
  requirement: HeatCapacityCalculationPrecisionRequirement,
) => {
  validateWholeNumber(requirement.digits, 'precision digits');
  if (requirement.type === 'decimal-places') {
    return parsed.lastWrittenDigitPower === -requirement.digits;
  }
  if (requirement.digits === 0) {
    throw new RangeError('Significant figures must be greater than zero.');
  }
  return parsed.significantFigures === requirement.digits;
};

export const validateHeatCapacityCalculationAnswer = (
  rawInput: string,
  expectedValue: number,
  spec: HeatCapacityCalculationAnswerSpec,
): HeatCapacityCalculationValidationResult => {
  if (!Number.isFinite(expectedValue)) {
    throw new RangeError('expectedValue must be finite.');
  }

  const parseResult = parseHeatCapacityCalculationInput(rawInput);
  const tolerance = resolveHeatCapacityCalculationTolerance(expectedValue, spec);
  if (parseResult.status !== 'valid') {
    return {
      parseResult,
      expectedValue,
      tolerance,
      absoluteError: null,
      numericCorrect: false,
      precisionCorrect: false,
      correct: false,
    };
  }

  const absoluteError = Math.abs(parseResult.parsed.value - expectedValue);
  const comparisonEpsilon =
    Number.EPSILON * Math.max(1, Math.abs(expectedValue), tolerance) * 16;
  const numericCorrect = absoluteError <= tolerance + comparisonEpsilon;
  const precisionCorrect = hasRequiredHeatCapacityCalculationPrecision(
    parseResult.parsed,
    spec.precision,
  );

  return {
    parseResult,
    expectedValue,
    tolerance,
    absoluteError,
    numericCorrect,
    precisionCorrect,
    correct: numericCorrect && precisionCorrect,
  };
};

export const formatHeatCapacityCalculationReference = (
  expectedValue: number,
  spec: HeatCapacityCalculationAnswerSpec,
): string => {
  if (!Number.isFinite(expectedValue)) {
    throw new RangeError('expectedValue must be finite.');
  }
  validateWholeNumber(spec.precision.digits, 'precision digits');
  if (spec.precision.type === 'decimal-places') {
    return expectedValue.toFixed(spec.precision.digits);
  }
  if (spec.precision.digits === 0) {
    throw new RangeError('Significant figures must be greater than zero.');
  }
  return expectedValue.toPrecision(spec.precision.digits);
};
