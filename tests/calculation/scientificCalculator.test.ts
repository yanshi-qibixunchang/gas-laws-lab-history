import assert from 'node:assert/strict';
import { CalculatorError, evaluateCalculatorExpression as calc } from '../../src/components/calculation/scientificCalculator.ts';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-13 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
assert.equal(calc('2+3*4'), 14);
assert.equal(calc('(2+3)*4'), 20);
assert.equal(calc('2^3^2'), 512);
assert.equal(calc('-2²'), -4);
assert.equal(calc('(-2)^2'), 4);
assert.equal(calc('2^-3'), 0.125);
assert.equal(calc('√(9)+abs(-4)'), 7);
assert.equal(calc('1.2e-3 × 1E3'), 1.2);
assert.equal(calc('25%'), 0.25);
assert.equal(calc('Ans*2', 1 / 3), (1 / 3) * 2);
assert.equal(calc('2(3+4)'), 14);
near(calc('2π'), 2 * Math.PI);
near(calc('ln(110/101.325)/ln(110/103.7)'), Math.log(110 / 101.325) / Math.log(110 / 103.7));
near(calc('π*(0.0196)^2/4'), Math.PI * 0.0196 ** 2 / 4);
near(calc('sqrt((0.03)^2+(0.02)^2)'), Math.hypot(0.03, 0.02));
near(calc('sqrt(((1.41-1.4)^2+(1.39-1.4)^2+(1.4-1.4)^2)/(3-1))/sqrt(3)'), 0.01 / Math.sqrt(3));
near(calc('abs(1.449-1.4)/1.4*100'), 3.5);
near(calc('exp(ln(2))'), 2);
assert.equal(calc('log(1000)'), 3);
for (const [expression, code] of [
  ['', 'empty'], ['1/0', 'divisionByZero'], ['0^-1', 'divisionByZero'],
  ['sqrt(-1)', 'domain'], ['ln(0)', 'domain'], ['(-1)^0.5', 'domain'],
  ['1e309', 'overflow'], ['10^999', 'overflow'], ['1e308*10', 'overflow'],
  ['1+', 'syntax'], ['(1+2', 'syntax'], ['1 2', 'syntax'], ['2e-', 'syntax'],
  ['Math.random()', 'syntax'], ['alert(1)', 'syntax'], ['1;2', 'syntax'],
  ['('.repeat(1001), 'tooLong'], ['+'.repeat(260) + '1', 'tooLong'],
] as const) {
  assert.throws(() => calc(expression), (error) => error instanceof CalculatorError && error.code === code, expression);
}
console.log('Scientific calculator arithmetic and experiment formulas passed.');
