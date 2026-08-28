import assert from 'node:assert/strict';
import {
  formatDecimalPlacesHalfEven,
  formatRatioSignificantFiguresHalfEven,
  formatSignificantFiguresHalfEven,
  roundDecimalPlacesHalfEven,
  roundRatioSignificantFiguresHalfEven,
  roundSignificantFiguresHalfEven,
} from '../../src/domain/calculation/decimalHalfEven.ts';
import {
  formatNumericAnswerReference,
  type NumericAnswerSpec,
} from '../../src/domain/calculation/numericAnswerValidation.ts';

// Exact decimal ties must use the retained digit's parity, not a binary-float
// approximation around 0.5.
assert.equal(formatDecimalPlacesHalfEven('2.675', 2), '2.68');
assert.equal(formatDecimalPlacesHalfEven('2.685', 2), '2.68');
assert.equal(formatDecimalPlacesHalfEven('2.6851', 2), '2.69');
assert.equal(formatDecimalPlacesHalfEven('2.6849', 2), '2.68');
assert.equal(formatDecimalPlacesHalfEven('-2.675', 2), '-2.68');
assert.equal(formatDecimalPlacesHalfEven('-2.665', 2), '-2.66');
assert.equal(formatDecimalPlacesHalfEven('0.5', 0), '0');
assert.equal(formatDecimalPlacesHalfEven('1.5', 0), '2');
assert.equal(formatDecimalPlacesHalfEven('-0.5', 0), '0');

// Instrument-style display precision remains visible even when source exports
// omit trailing zeroes.
assert.equal(formatDecimalPlacesHalfEven('93.6', 2), '93.60');
assert.equal(formatDecimalPlacesHalfEven('101', 2), '101.00');
assert.equal(formatDecimalPlacesHalfEven('+001.2350', 3), '1.235');
assert.equal(formatDecimalPlacesHalfEven('1.245e2', 0), '124');
assert.equal(formatDecimalPlacesHalfEven('1.255e2', 0), '126');
assert.equal(roundDecimalPlacesHalfEven('2.685', 2), 2.68);

assert.equal(formatSignificantFiguresHalfEven('1.4', 4), '1.400');
assert.equal(formatSignificantFiguresHalfEven('0.030505', 4), '0.03050');
assert.equal(formatSignificantFiguresHalfEven('0.030515', 4), '0.03052');
assert.equal(formatSignificantFiguresHalfEven('-0.030505', 4), '-0.03050');
assert.equal(formatSignificantFiguresHalfEven('999', 2), '1.0e+3');
assert.equal(formatSignificantFiguresHalfEven('6.02e23', 3), '6.02e+23');
assert.equal(formatSignificantFiguresHalfEven('1.25e-7', 2), '1.2e-7');
assert.equal(formatSignificantFiguresHalfEven('1.35e-7', 2), '1.4e-7');
assert.equal(formatSignificantFiguresHalfEven('0', 4), '0.000');
assert.equal(roundSignificantFiguresHalfEven('0.030505', 4), 0.0305);
assert.equal(formatDecimalPlacesHalfEven('1e-12', 12), '0.000000000001');
assert.equal(formatRatioSignificantFiguresHalfEven(183n, 6000n, 4), '0.03050');
assert.equal(formatRatioSignificantFiguresHalfEven(1n, 3n, 4), '0.3333');
assert.equal(formatRatioSignificantFiguresHalfEven(12345n, 10000n, 4), '1.234');
assert.equal(formatRatioSignificantFiguresHalfEven(12355n, 10000n, 4), '1.236');
assert.equal(formatRatioSignificantFiguresHalfEven(-1n, 8n, 3), '-0.125');
assert.equal(roundRatioSignificantFiguresHalfEven(183n, 6000n, 4), 0.0305);
assert.throws(
  () => formatRatioSignificantFiguresHalfEven(1n, 0n, 4),
  /denominator/,
);

// Number inputs use their finite decimal serialization. String inputs remain
// the authoritative route when an exact written tie must be audited.
assert.equal(formatDecimalPlacesHalfEven(2.685, 2), '2.68');
assert.equal(formatDecimalPlacesHalfEven(0.1 + 0.2, 2), '0.30');

assert.throws(() => formatDecimalPlacesHalfEven('', 2), SyntaxError);
assert.throws(() => formatDecimalPlacesHalfEven('12 kPa', 2), SyntaxError);
assert.throws(() => formatDecimalPlacesHalfEven('NaN', 2), SyntaxError);
assert.throws(() => formatDecimalPlacesHalfEven(Number.POSITIVE_INFINITY, 2), RangeError);
assert.throws(() => formatDecimalPlacesHalfEven('1e10001', 2), RangeError);
assert.throws(() => formatDecimalPlacesHalfEven('1', -1), RangeError);
assert.throws(() => formatSignificantFiguresHalfEven('1', 0), RangeError);

const halfEvenDecimalSpec: NumericAnswerSpec = {
  precision: {
    type: 'decimal-places',
    digits: 2,
  },
  tolerance: {
    type: 'absolute',
    value: 0,
  },
  roundingMode: 'half-even',
};
assert.equal(
  formatNumericAnswerReference(2.685, halfEvenDecimalSpec),
  '2.68',
);

const halfEvenSignificantSpec: NumericAnswerSpec = {
  precision: {
    type: 'significant-figures',
    digits: 4,
  },
  tolerance: {
    type: 'absolute',
    value: 0,
  },
  roundingMode: 'half-even',
};
assert.equal(
  formatNumericAnswerReference(0.030505, halfEvenSignificantSpec),
  '0.03050',
);

console.log('decimalHalfEven tests passed');
