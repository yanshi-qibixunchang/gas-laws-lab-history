export type ExactDecimalInput = string | number;

interface ExactDecimal {
  sign: -1 | 1;
  coefficient: bigint;
  exponent: number;
}

interface RoundedExactDecimal extends ExactDecimal {
  coefficient: bigint;
}

const STRICT_DECIMAL_PATTERN =
  /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/;

const MAX_FORMAT_DIGITS = 1000;
const MAX_ABSOLUTE_EXPONENT = 10000;
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);
const BIGINT_TEN = BigInt(10);

const assertWholeNumberInRange = (
  value: number,
  label: string,
  minimum: number,
) => {
  if (
    !Number.isInteger(value)
    || value < minimum
    || value > MAX_FORMAT_DIGITS
  ) {
    throw new RangeError(
      `${label} must be an integer between ${minimum} and ${MAX_FORMAT_DIGITS}.`,
    );
  }
};

const parseExactDecimal = (input: ExactDecimalInput): ExactDecimal => {
  if (typeof input !== 'string' && typeof input !== 'number') {
    throw new TypeError('Decimal input must be a string or finite number.');
  }
  if (typeof input === 'number' && !Number.isFinite(input)) {
    throw new RangeError('Decimal input number must be finite.');
  }

  const source = typeof input === 'number' ? String(input) : input.trim();
  const match = STRICT_DECIMAL_PATTERN.exec(source);
  if (!match) {
    throw new SyntaxError('Decimal input must contain only a finite decimal number.');
  }

  const [, signToken, wholeDigits = '', fractionAfterWhole = '', fractionOnly = '', exponentToken = '0'] = match;
  const fractionDigits = wholeDigits.length > 0 ? fractionAfterWhole : fractionOnly;
  const parsedExponent = Number(exponentToken);
  if (
    !Number.isSafeInteger(parsedExponent)
    || Math.abs(parsedExponent) > MAX_ABSOLUTE_EXPONENT
  ) {
    throw new RangeError(
      `Decimal exponent must be an integer between -${MAX_ABSOLUTE_EXPONENT} and ${MAX_ABSOLUTE_EXPONENT}.`,
    );
  }

  const coefficientDigits = `${wholeDigits || '0'}${fractionDigits}`
    .replace(/^0+(?=\d)/, '');
  const coefficient = BigInt(coefficientDigits);
  return {
    sign: signToken === '-' && coefficient !== BIGINT_ZERO ? -1 : 1,
    coefficient,
    exponent: parsedExponent - fractionDigits.length,
  };
};

const powerOfTen = (power: number) => {
  if (!Number.isInteger(power) || power < 0) {
    throw new RangeError('Decimal power must be a non-negative integer.');
  }
  if (power > MAX_ABSOLUTE_EXPONENT + MAX_FORMAT_DIGITS) {
    throw new RangeError('Decimal input is too large to format safely.');
  }

  // The production target is ES2015. A bigint exponent expression is lowered
  // to Math.pow there, but Math.pow cannot accept bigint operands.
  let result = BIGINT_ONE;
  let factor = BIGINT_TEN;
  let remainingPower = power;
  while (remainingPower > 0) {
    if (remainingPower % 2 === 1) result *= factor;
    remainingPower = Math.floor(remainingPower / 2);
    if (remainingPower > 0) factor *= factor;
  }
  return result;
};

const roundMagnitudeHalfEven = (
  coefficient: bigint,
  sourceExponent: number,
  targetExponent: number,
) => {
  const exponentDifference = sourceExponent - targetExponent;
  if (exponentDifference >= 0) {
    return coefficient * powerOfTen(exponentDifference);
  }

  const divisor = powerOfTen(-exponentDifference);
  const quotient = coefficient / divisor;
  const remainder = coefficient % divisor;
  const twiceRemainder = remainder * BIGINT_TWO;
  if (
    twiceRemainder > divisor
    || (twiceRemainder === divisor && quotient % BIGINT_TWO !== BIGINT_ZERO)
  ) {
    return quotient + BIGINT_ONE;
  }
  return quotient;
};

const roundToExponent = (
  decimal: ExactDecimal,
  targetExponent: number,
): RoundedExactDecimal => ({
  sign: decimal.sign,
  coefficient: roundMagnitudeHalfEven(
    decimal.coefficient,
    decimal.exponent,
    targetExponent,
  ),
  exponent: targetExponent,
});

const formatFixedMagnitude = (
  coefficient: bigint,
  decimalPlaces: number,
) => {
  const digits = coefficient.toString();
  if (decimalPlaces === 0) return digits;
  const paddedDigits = digits.padStart(decimalPlaces + 1, '0');
  const decimalIndex = paddedDigits.length - decimalPlaces;
  return `${paddedDigits.slice(0, decimalIndex)}.${paddedDigits.slice(decimalIndex)}`;
};

const withSign = (sign: -1 | 1, coefficient: bigint, magnitude: string) => (
  sign < 0 && coefficient !== BIGINT_ZERO ? `-${magnitude}` : magnitude
);

const toFiniteNumber = (formatted: string) => {
  const result = Number(formatted);
  if (!Number.isFinite(result)) {
    throw new RangeError('Rounded decimal cannot be represented as a finite number.');
  }
  return Object.is(result, -0) ? 0 : result;
};

/**
 * Formats a decimal using round-half-to-even at a fixed number of decimal
 * places. Pass a string when the source decimal's exact written value matters.
 */
export const formatDecimalPlacesHalfEven = (
  input: ExactDecimalInput,
  decimalPlaces: number,
): string => {
  assertWholeNumberInRange(decimalPlaces, 'decimalPlaces', 0);
  const rounded = roundToExponent(parseExactDecimal(input), -decimalPlaces);
  return withSign(
    rounded.sign,
    rounded.coefficient,
    formatFixedMagnitude(rounded.coefficient, decimalPlaces),
  );
};

/**
 * Numeric companion to formatDecimalPlacesHalfEven. It intentionally cannot
 * retain written trailing zeroes; use the formatter for display and auditing.
 */
export const roundDecimalPlacesHalfEven = (
  input: ExactDecimalInput,
  decimalPlaces: number,
): number => toFiniteNumber(formatDecimalPlacesHalfEven(input, decimalPlaces));

const formatScientificSignificant = (
  sign: -1 | 1,
  coefficient: bigint,
  significantFigures: number,
  leadingDigitPower: number,
) => {
  const digits = coefficient.toString().padStart(significantFigures, '0');
  const mantissa = significantFigures === 1
    ? digits
    : `${digits[0]}.${digits.slice(1)}`;
  const exponentSign = leadingDigitPower >= 0 ? '+' : '';
  return withSign(
    sign,
    coefficient,
    `${mantissa}e${exponentSign}${leadingDigitPower}`,
  );
};

/**
 * Formats a decimal to a fixed number of significant figures using
 * round-half-to-even. Like Number#toPrecision, ordinary-sized values use
 * decimal notation while very large and very small values use scientific
 * notation. Written zeroes are retained to express the requested precision.
 */
export const formatSignificantFiguresHalfEven = (
  input: ExactDecimalInput,
  significantFigures: number,
): string => {
  assertWholeNumberInRange(significantFigures, 'significantFigures', 1);
  const decimal = parseExactDecimal(input);
  if (decimal.coefficient === BIGINT_ZERO) {
    return significantFigures === 1
      ? '0'
      : `0.${'0'.repeat(significantFigures - 1)}`;
  }

  const sourceDigitCount = decimal.coefficient.toString().length;
  const sourceLeadingDigitPower = sourceDigitCount - 1 + decimal.exponent;
  let targetExponent = sourceLeadingDigitPower - significantFigures + 1;
  let coefficient = roundMagnitudeHalfEven(
    decimal.coefficient,
    decimal.exponent,
    targetExponent,
  );

  // A carry such as 9.99 -> 10 must move the rounding exponent too, otherwise
  // fixed formatting would incorrectly communicate one extra significant zero.
  while (coefficient.toString().length > significantFigures) {
    coefficient /= BIGINT_TEN;
    targetExponent += 1;
  }

  const leadingDigitPower = coefficient.toString().length - 1 + targetExponent;
  if (
    leadingDigitPower >= significantFigures
    || leadingDigitPower < -6
  ) {
    return formatScientificSignificant(
      decimal.sign,
      coefficient,
      significantFigures,
      leadingDigitPower,
    );
  }

  const decimalPlaces = Math.max(0, -targetExponent);
  return withSign(
    decimal.sign,
    coefficient,
    formatFixedMagnitude(coefficient, decimalPlaces),
  );
};

/**
 * Numeric companion to formatSignificantFiguresHalfEven. Use the formatter
 * when the number of written significant figures must remain observable.
 */
export const roundSignificantFiguresHalfEven = (
  input: ExactDecimalInput,
  significantFigures: number,
): number => toFiniteNumber(
  formatSignificantFiguresHalfEven(input, significantFigures),
);

/** Multiply the written decimals exactly before applying half-even rounding. */
export const roundProductSignificantFiguresHalfEven = (
  left: ExactDecimalInput,
  right: ExactDecimalInput,
  significantFigures: number,
): number => {
  const leftDecimal = parseExactDecimal(left);
  const rightDecimal = parseExactDecimal(right);
  const coefficient = leftDecimal.coefficient * rightDecimal.coefficient;
  const exponent = leftDecimal.exponent + rightDecimal.exponent;
  const sign = leftDecimal.sign === rightDecimal.sign ? '' : '-';
  return roundSignificantFiguresHalfEven(
    `${sign}${coefficient}e${exponent}`,
    significantFigures,
  );
};

const normalizeExactRatio = (numerator: bigint, denominator: bigint) => {
  if (denominator === BIGINT_ZERO) {
    throw new RangeError('Ratio denominator must not be zero.');
  }
  const negative = (numerator < BIGINT_ZERO) !== (denominator < BIGINT_ZERO);
  return {
    sign: negative ? -1 as const : 1 as const,
    numerator: numerator < BIGINT_ZERO ? -numerator : numerator,
    denominator: denominator < BIGINT_ZERO ? -denominator : denominator,
  };
};

const getRatioLeadingDigitPower = (numerator: bigint, denominator: bigint) => {
  let leadingDigitPower = numerator.toString().length - denominator.toString().length;
  const atLeastCandidatePower = leadingDigitPower >= 0
    ? numerator >= denominator * powerOfTen(leadingDigitPower)
    : numerator * powerOfTen(-leadingDigitPower) >= denominator;
  if (!atLeastCandidatePower) leadingDigitPower -= 1;
  return leadingDigitPower;
};

/**
 * Formats an exact integer ratio to a requested number of significant figures.
 * This is the preferred path for measured periods because a sample-index
 * difference divided by a period count is rational and must not acquire a
 * binary floating-point tie before round-half-to-even is applied.
 */
export const formatRatioSignificantFiguresHalfEven = (
  numerator: bigint,
  denominator: bigint,
  significantFigures: number,
): string => {
  assertWholeNumberInRange(significantFigures, 'significantFigures', 1);
  const ratio = normalizeExactRatio(numerator, denominator);
  if (ratio.numerator === BIGINT_ZERO) {
    return significantFigures === 1
      ? '0'
      : `0.${'0'.repeat(significantFigures - 1)}`;
  }

  let leadingDigitPower = getRatioLeadingDigitPower(
    ratio.numerator,
    ratio.denominator,
  );
  let targetExponent = leadingDigitPower - significantFigures + 1;
  const scaledNumerator = targetExponent < 0
    ? ratio.numerator * powerOfTen(-targetExponent)
    : ratio.numerator;
  const scaledDenominator = targetExponent > 0
    ? ratio.denominator * powerOfTen(targetExponent)
    : ratio.denominator;
  let coefficient = scaledNumerator / scaledDenominator;
  const remainder = scaledNumerator % scaledDenominator;
  if (
    remainder * BIGINT_TWO > scaledDenominator
    || (
      remainder * BIGINT_TWO === scaledDenominator
      && coefficient % BIGINT_TWO !== BIGINT_ZERO
    )
  ) {
    coefficient += BIGINT_ONE;
  }

  if (coefficient.toString().length > significantFigures) {
    coefficient /= BIGINT_TEN;
    targetExponent += 1;
    leadingDigitPower += 1;
  }

  if (
    leadingDigitPower >= significantFigures
    || leadingDigitPower < -6
  ) {
    return formatScientificSignificant(
      ratio.sign,
      coefficient,
      significantFigures,
      leadingDigitPower,
    );
  }
  return withSign(
    ratio.sign,
    coefficient,
    formatFixedMagnitude(coefficient, Math.max(0, -targetExponent)),
  );
};

export const roundRatioSignificantFiguresHalfEven = (
  numerator: bigint,
  denominator: bigint,
  significantFigures: number,
): number => toFiniteNumber(
  formatRatioSignificantFiguresHalfEven(
    numerator,
    denominator,
    significantFigures,
  ),
);
