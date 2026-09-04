import {
  formatDecimalPlacesHalfEven,
  formatSignificantFiguresHalfEven,
} from './decimalHalfEven.ts';

export type NumericAnswerPrecisionRequirement =
  | {
    type: 'decimal-places';
    digits: number;
  }
  | {
    type: 'significant-figures';
    digits: number;
  };

export type NumericAnswerTolerance =
  | {
    type: 'absolute';
    value: number;
  }
  | {
    type: 'last-significant-digit';
  };

export type NumericAnswerRoundingMode = 'native' | 'half-even';

export interface NumericAnswerSpec {
  precision: NumericAnswerPrecisionRequirement;
  tolerance: NumericAnswerTolerance;
  /** Defaults to the legacy native formatter so existing workflows are stable. */
  roundingMode?: NumericAnswerRoundingMode;
}

export interface ParsedNumericAnswerInput {
  rawInput: string;
  normalizedInput: string;
  value: number;
  notation: 'decimal' | 'scientific';
  exponent: number;
  significantFigures: number;
  lastWrittenDigitPower: number;
}

export type NumericAnswerInputParseResult =
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
    parsed: ParsedNumericAnswerInput;
  };

export interface NumericAnswerValidationResult {
  parseResult: NumericAnswerInputParseResult;
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

export const parseNumericAnswerInput = (
  rawInput: string,
): NumericAnswerInputParseResult => {
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

export const getLastSignificantDigitTolerance = (
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

export const resolveNumericAnswerTolerance = (
  expectedValue: number,
  spec: NumericAnswerSpec,
): number => {
  if (spec.tolerance.type === 'absolute') {
    if (
      !Number.isFinite(spec.tolerance.value)
      || spec.tolerance.value < 0
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
  return getLastSignificantDigitTolerance(
    expectedValue,
    spec.precision.digits,
  );
};

export const hasRequiredNumericAnswerPrecision = (
  parsed: ParsedNumericAnswerInput,
  requirement: NumericAnswerPrecisionRequirement,
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

export const validateNumericAnswer = (
  rawInput: string,
  expectedValue: number,
  spec: NumericAnswerSpec,
): NumericAnswerValidationResult => {
  if (!Number.isFinite(expectedValue)) {
    throw new RangeError('expectedValue must be finite.');
  }

  const parseResult = parseNumericAnswerInput(rawInput);
  const tolerance = resolveNumericAnswerTolerance(expectedValue, spec);
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
  const numericCorrect = tolerance === 0
    ? parseResult.parsed.value === expectedValue
    : absoluteError <= tolerance + (
      Number.EPSILON * Math.max(1, Math.abs(expectedValue), tolerance) * 16
    );
  const precisionCorrect = hasRequiredNumericAnswerPrecision(
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

export const formatNumericAnswerReference = (
  expectedValue: number,
  spec: NumericAnswerSpec,
): string => {
  if (!Number.isFinite(expectedValue)) {
    throw new RangeError('expectedValue must be finite.');
  }
  validateWholeNumber(spec.precision.digits, 'precision digits');
  if (spec.roundingMode === 'half-even') {
    if (spec.precision.type === 'decimal-places') {
      return formatDecimalPlacesHalfEven(
        expectedValue,
        spec.precision.digits,
      );
    }
    return formatSignificantFiguresHalfEven(
      expectedValue,
      spec.precision.digits,
    );
  }
  if (spec.precision.type === 'decimal-places') {
    return expectedValue.toFixed(spec.precision.digits);
  }
  if (spec.precision.digits === 0) {
    throw new RangeError('Significant figures must be greater than zero.');
  }
  return expectedValue.toPrecision(spec.precision.digits);
};
