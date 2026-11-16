export type CalculatorErrorCode = 'empty' | 'syntax' | 'divisionByZero' | 'domain' | 'overflow' | 'tooLong';

export class CalculatorError extends Error {
  readonly code: CalculatorErrorCode;
  constructor(code: CalculatorErrorCode) {
    super(code);
    this.code = code;
  }
}

type Token = { kind: 'number'; value: number } | { kind: 'symbol'; value: string };

const fail = (code: CalculatorErrorCode): never => { throw new CalculatorError(code); };
const finite = (value: number) => {
  if (Number.isNaN(value)) return fail('domain');
  if (!Number.isFinite(value)) return fail('overflow');
  return Object.is(value, -0) ? 0 : value;
};

// Parse arithmetic only. Never execute text entered into the calculator as code.
export const evaluateCalculatorExpression = (expression: string, answer = 0): number => {
  if (!expression.trim()) return fail('empty');
  if (expression.length > 1000) return fail('tooLong');
  const text = expression.replaceAll('×', '*').replaceAll('÷', '/')
    .replaceAll('−', '-').replaceAll('π', 'pi').replaceAll('²', '^2')
    .replaceAll('√', 'sqrt').toLowerCase();
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < text.length) {
    const rest = text.slice(offset);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) { offset += whitespace[0].length; continue; }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/.exec(rest);
    if (number) {
      tokens.push({ kind: 'number', value: finite(Number(number[0])) });
      offset += number[0].length;
      continue;
    }
    const symbol = /^(?:[a-z]+|[()+\-*/^%])/.exec(rest);
    if (!symbol) return fail('syntax');
    tokens.push({ kind: 'symbol', value: symbol[0] });
    offset += symbol[0].length;
  }
  if (tokens.length > 256) return fail('tooLong');
  let position = 0;
  const peek = () => tokens[position];
  const take = (symbol: string) => {
    if (peek()?.value !== symbol) return false;
    position += 1;
    return true;
  };
  const primary = (): number => {
    const token = tokens[position++];
    if (!token) return fail('syntax');
    if (token.kind === 'number') return token.value;
    if (token.value === '(') {
      const result = sum();
      if (!take(')')) return fail('syntax');
      return result;
    }
    if (token.value === 'pi') return Math.PI;
    if (token.value === 'ans') return finite(answer);
    if (!['sqrt', 'ln', 'log', 'abs', 'exp'].includes(token.value) || !take('(')) return fail('syntax');
    const value = sum();
    if (!take(')')) return fail('syntax');
    if (token.value === 'sqrt') return value < 0 ? fail('domain') : Math.sqrt(value);
    if (token.value === 'ln') return value <= 0 ? fail('domain') : Math.log(value);
    if (token.value === 'log') return value <= 0 ? fail('domain') : Math.log10(value);
    if (token.value === 'abs') return Math.abs(value);
    return finite(Math.exp(value));
  };
  const postfix = (): number => {
    let value = primary();
    while (take('%')) value /= 100;
    return value;
  };
  const power = (): number => {
    const base = postfix();
    if (!take('^')) return base;
    const exponent = unary();
    if (base === 0 && exponent < 0) return fail('divisionByZero');
    return finite(base ** exponent);
  };
  const unary = (): number => take('+') ? unary() : take('-') ? -unary() : power();
  const product = (): number => {
    let value = unary();
    while (true) {
      if (take('*')) value = finite(value * unary());
      else if (take('/')) {
        const divisor = unary();
        if (divisor === 0) return fail('divisionByZero');
        value = finite(value / divisor);
      } else if (peek()?.kind === 'symbol' && ['(', 'pi', 'ans', 'sqrt', 'ln', 'log', 'abs', 'exp'].includes(String(peek()!.value))) {
        value = finite(value * unary());
      } else return value;
    }
  };
  const sum = (): number => {
    let value = product();
    while (true) {
      if (take('+')) value = finite(value + product());
      else if (take('-')) value = finite(value - product());
      else return value;
    }
  };
  const result = sum();
  if (position !== tokens.length) return fail('syntax');
  return finite(result);
};
