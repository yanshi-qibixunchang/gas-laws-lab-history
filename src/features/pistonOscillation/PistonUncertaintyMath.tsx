import { createElement, Fragment, type ReactNode } from 'react';
import type { PistonUncertaintyExerciseField } from '../../domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';

// Native MathML keeps fractions, radicals and scripts semantic and selectable.
// It is presentation only: the calculation model and submitted values are unchanged.
const element = (tag: string, ...children: ReactNode[]) => createElement(tag, null, ...children);
const row = (...children: ReactNode[]) => element('mrow', ...children);
const variable = (name: string) => element('mi', name);
const operator = (name: string) => element('mo', name);
const text = (value: string) => element('mtext', value);
const sub = (base: ReactNode, index: ReactNode) => element('msub', base, index);
const power = (base: ReactNode, exponent: ReactNode) => element('msup', base, exponent);
const fraction = (top: ReactNode, bottom: ReactNode) => element('mfrac', top, bottom);
const root = (value: ReactNode) => element('msqrt', value);
const group = (value: ReactNode, left = '(', right = ')') => row(operator(left), value, operator(right));
const square = (value: ReactNode) => power(value, element('mn', '2'));
const absolute = (value: ReactNode) => group(value, '|', '|');
const join = (op: string, ...items: ReactNode[]) => row(...items.flatMap((item, index) => index ? [operator(op), item] : [item]));
const equals = (...items: ReactNode[]) => join('=', ...items);
const mean = (name: string) => element('mover', variable(name), operator('¯'));
const space = () => createElement('mspace', { width: '0.3em' });

export const pistonMathNumber = (value: number | string): ReactNode => {
  const raw = typeof value === 'number' ? String(Number(value.toPrecision(12))) : value;
  const parsed = Number(raw);
  if (!raw.trim() || !Number.isFinite(parsed)) return text(raw);
  let mantissa = raw;
  let exponent: number | null = null;
  const scientific = /^([+-]?[\d.]+)[eE]([+-]?\d+)$/.exec(raw);
  if (scientific) {
    mantissa = scientific[1]!;
    exponent = Number(scientific[2]);
  } else if (parsed !== 0 && (Math.abs(parsed) < 0.001 || Math.abs(parsed) >= 1e6)) {
    const negative = raw.startsWith('-');
    const unsigned = raw.replace(/^[+-]/, '');
    const [integer, decimal = ''] = unsigned.split('.');
    const digits = `${integer}${decimal}`;
    const first = digits.search(/[1-9]/);
    exponent = integer!.length - first - 1;
    const significant = digits.slice(first);
    mantissa = `${negative ? '−' : ''}${significant[0]}${significant.length > 1 ? `.${significant.slice(1)}` : ''}`;
  }
  const number = element('mn', mantissa.replace('-', '−'));
  return exponent === null ? number : row(number, operator('×'), power(element('mn', '10'), element('mn', String(exponent).replace('-', '−'))));
};

export const PistonMath = ({ children, block = false, label }: { children: ReactNode; block?: boolean; label?: string }) => createElement('math', {
  xmlns: 'http://www.w3.org/1998/Math/MathML',
  className: 'piston-uncertainty-math',
  display: block ? 'block' : 'inline',
  ...(label ? { 'aria-label': label } : {}),
}, children);

export const PistonMathNumber = ({ value }: { value: number | string }) => <PistonMath>{pistonMathNumber(value)}</PistonMath>;
const pistonMathSymbols = (en: boolean) => {
  const i = variable('i');
  const x = variable('x');
  const a = variable('a');
  const g = variable('γ');
  const sr = sub(variable('s'), variable('r'));
  const sxx = sub(variable('S'), row(x, x));
  const u = (index: string, quantity?: ReactNode) => {
    const suffix = index === 'instrument' ? (en ? 'instrument' : '仪器') : index;
    const name = index ? sub(variable('u'), text(suffix)) : variable('u');
    return quantity ? row(name, group(quantity)) : name;
  };
  const expanded = sub(variable('U'), g);
  return { a, g, sr, sxx, i, u, expanded };
};

const formulaNodes = (en: boolean, coverage: number): Record<PistonUncertaintyExerciseField, ReactNode> => {
  const { a, g, sr, sxx, u, expanded } = pistonMathSymbols(en);
  const delta = (name: string) => row(variable('Δ'), variable(name));
  const calibrationRatio = (name: string, factor = 1) => square(group(fraction(row(...(factor === 1 ? [] : [pistonMathNumber(factor)]), u('B', variable(name))), variable(name))));
  return {
    residual: equals(sr, root(fraction(variable('Q'), join('−', variable('n'), pistonMathNumber(2))))),
    slopeA: equals(u('A', a), fraction(sr, root(sxx))),
    gammaA: equals(u('A', g), row(absolute(fraction(g, a)), u('A', a))),
    mass: equals(u('B', variable('m')), fraction(delta('m'), root(pistonMathNumber(3)))),
    diameter: equals(u('B', variable('d')), fraction(delta('d'), root(pistonMathNumber(3)))),
    gammaB: equals(u('B', g), row(absolute(g), root(join('+', calibrationRatio('a'), calibrationRatio('m'), calibrationRatio('d', 2), square(group(fraction(u('instrument', variable('P')), variable('P')))))))),
    combined: equals(u('c', g), root(join('+', square(u('A', g)), square(u('B', g))))),
    relative: equals(u('r'), row(fraction(u('c', g), absolute(g)), operator('×'), pistonMathNumber(100), operator('%'))),
    expanded: equals(expanded, row(variable('k'), u('c', g))),
    result: row(g, operator('±'), expanded, space(), group(equals(variable('k'), pistonMathNumber(coverage)))),
  };
};

export const PistonUncertaintyFormula = ({ field, language, coverage, label }: { field: PistonUncertaintyExerciseField; language: string; coverage: number; label: string }) => <PistonMath block label={label}>{formulaNodes(language === 'en', coverage)[field]}</PistonMath>;

export const PistonUncertaintyGammaBasis = ({ gamma, slope }: { gamma: number; slope: number }) => <>
  <PistonMath block>{equals(variable('γ'), fraction(row(pistonMathNumber(4), square(variable('π')), variable('m'), variable('a')), row(variable('A'), variable('P'))), pistonMathNumber(gamma))}</PistonMath>
  <span><PistonRichText text={`a = ${slope} m/s²`} /></span>
</>;

const inlineCatalogue = (en: boolean): Record<string, ReactNode> => {
  const { a, g, sr, sxx, i, u, expanded } = pistonMathSymbols(en);
  const out: Record<string, ReactNode> = {
    'h = aT² + b': equals(variable('h'), join('+', row(a, square(variable('T'))), variable('b'))),
    'Q/(n−2)': fraction(variable('Q'), group(join('−', variable('n'), pistonMathNumber(2)))),
    'n−2': join('−', variable('n'), pistonMathNumber(2)),
    '√3': root(pistonMathNumber(3)),
    'Δ/√3': fraction(variable('Δ'), root(pistonMathNumber(3))),
    'Uγ = k·uc(γ)': equals(expanded, row(variable('k'), u('c', g))),
    'sr': sr, 'Sxx': sxx, 'Uγ': expanded, 'uc': u('c'), 'ur': u('r'),
    'T²': square(variable('T')), 'R²': square(variable('R')),
    'eᵢ': sub(variable('e'), i), 'x̄': mean('x'), 'h̄': mean('h'),
    'm/s²': row(text('m'), operator('·'), power(text('s'), element('mn', '−2'))),
    'm²': square(text('m')), 's²': square(text('s')), 's⁴': power(text('s'), element('mn', '4')),
    '(m)': group(text('m')), '(s)': group(text('s')),
    'Δm': row(variable('Δ'), variable('m')), 'Δd': row(variable('Δ'), variable('d')),
  };
  for (const index of ['A', 'B', 'c', 'r', '仪器', 'instrument']) {
    const canonical = index === '仪器' ? 'instrument' : index;
    out[`u${index}`] = u(canonical);
    for (const quantity of ['γ', 'a', 'm', 'd', 'P']) out[`u${index}(${quantity})`] = u(canonical, variable(quantity));
  }
  for (const name of ['a', 'b', 'n', 'Q', 'γ', 'm', 'd', 'P', 'k']) out[name] = variable(name);
  return out;
};

const catalogues = [inlineCatalogue(false), inlineCatalogue(true)];
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const numberPattern = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
const units = '(?:m/s[²³]|s⁻²|s[²⁴]|m²|kg|mm|kPa|Pa|Hz|m|s)';
const patterns = catalogues.map(catalogue => new RegExp(`(?<![A-Za-z0-9])(?:${Object.keys(catalogue).sort((a, b) => b.length - a.length).map(escapePattern).join('|')}|${numberPattern}(?: ${units})?)(?![A-Za-z0-9])`, 'gu'));

const unit = (value: string): ReactNode => {
  const match = /^(m|s)(?:\/s([²³])|([²⁴])|⁻²)$/.exec(value);
  if (!match) return text(value);
  if (match[2]) return row(text('m'), operator('·'), power(text('s'), element('mn', match[2] === '²' ? '−2' : '−3')));
  return power(text(match[1]!), element('mn', value.endsWith('⁻²') ? '−2' : match[3] === '²' ? '2' : '4'));
};

export const PistonMathUnit = ({ value }: { value: string }) => value ? <PistonMath>{unit(value)}</PistonMath> : null;

export const PistonRichText = ({ text: content, language = 'zh-CN' }: { text: string; language?: string }) => {
  const index = language === 'en' ? 1 : 0;
  const catalogue = catalogues[index]!;
  const pieces: ReactNode[] = [];
  let end = 0;
  for (const match of content.matchAll(patterns[index]!)) {
    if (match.index! > end) pieces.push(content.slice(end, match.index));
    const token = match[0];
    const valueAndUnit = new RegExp(`^(${numberPattern})(?: (${units}))?$`, 'u').exec(token);
    const node = catalogue[token] ?? (valueAndUnit
      ? row(pistonMathNumber(valueAndUnit[1]!), ...(valueAndUnit[2] ? [space(), unit(valueAndUnit[2])] : [])) : text(token));
    pieces.push(<PistonMath key={match.index}>{node}</PistonMath>);
    end = match.index! + token.length;
  }
  if (end < content.length) pieces.push(content.slice(end));
  return <>{pieces.map((piece, index) => <Fragment key={index}>{piece}</Fragment>)}</>;
};
