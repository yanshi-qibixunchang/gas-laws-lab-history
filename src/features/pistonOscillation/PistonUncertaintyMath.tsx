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
const meanSquaredPeriod = () => element('mover', square(variable('T')), operator('¯'));
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
  return { a, g, sr, sxx, i, u };
};

const lessonSymbolHints: Readonly<Record<string, readonly [string, string, string]>> = {
  Sxx: [
    '衡量各组周期平方在横轴上隔得有多开。数据组数相同时，各组数值相隔越远，Sxx 越大',
    '衡量各組週期平方在橫軸上隔得有多開。資料組數相同時，各組數值相隔越遠，Sxx 越大',
    'Measures how spread out the squared periods are along the horizontal axis. For the same number of data groups, more widely spaced values give a larger Sxx.',
  ],
  Q: [
    '对每个测量点，取实测高度与拟合直线上对应高度的差，将这些差值平方后相加',
    '對每個測量點，取實測高度與擬合直線上對應高度的差，將這些差值平方後相加',
    'For each measured point, take the difference between its measured height and its fitted height. Square these differences and add them.',
  ],
  Δm: [
    '质量允许偏差的最大绝对值，对应 ±Δm 的误差范围',
    '質量允許偏差的最大絕對值，對應 ±Δm 的誤差範圍',
    'The maximum absolute deviation allowed for the mass, corresponding to an error range of ±Δm.',
  ],
  Δd: [
    '气缸内径允许偏差的最大绝对值，对应 ±Δd 的误差范围',
    '氣缸內徑允許偏差的最大絕對值，對應 ±Δd 的誤差範圍',
    'The maximum absolute deviation allowed for the cylinder’s inner diameter, corresponding to an error range of ±Δd.',
  ],
  'uB(a)': [
    '软件根据高度和时间的测量精度，评估这些因素对拟合斜率的影响',
    '軟體根據高度和時間的測量精度，評估這些因素對擬合斜率的影響',
    'The software uses the height and time measurement precision to estimate their effect on the fitted slope.',
  ],
  'uc(γ)': [
    '最终结果中「±」后面的数，是合成标准不确定度保留 2 位有效数字后的值',
    '最終結果中「±」後面的數，是合成標準不確定度保留 2 位有效數字後的值',
    'The number after ± in the final result is the combined standard uncertainty rounded to 2 significant figures.',
  ],
};

const symbolWithHint = (value: ReactNode, label: string) => createElement('mrow', {
  className: 'calculation-symbol-hint',
  tabIndex: 0,
  'data-prompt-tooltip': label,
  'data-prompt-tooltip-focus-visible': '',
}, value);

const formulaNodes = (language: string): Record<PistonUncertaintyExerciseField, ReactNode> => {
  const en = language === 'en';
  const hint = (value: ReactNode, simplified: string, traditional: string, english: string) => (
    symbolWithHint(value, en ? english : language === 'zh-TW' ? traditional : simplified)
  );
  const { a, g, sr, sxx, u } = pistonMathSymbols(en);
  const index = hint(variable('i'), '数据组的序号', '資料組的序號', 'Data group index');
  const count = hint(variable('n'), '参与拟合的数据组数', '參與擬合的資料組數', 'Number of data groups included in the fit');
  const squaredPeriod = hint(square(sub(variable('T'), variable('i'))), '第 i 组振动周期的平方', '第 i 組振動週期的平方', 'Squared oscillation period for group i');
  const meanPeriod = hint(meanSquaredPeriod(), '各组周期平方的平均值', '各組週期平方的平均值', 'Average of the squared periods');
  const deviationSum = hint(sxx, '各组周期平方与其平均值之差的平方和', '各組週期平方與其平均值之差的平方和', 'Sum of squared differences from the mean squared period');
  const residual = hint(sr, '残差标准差，描述各测量点与拟合直线在高度上的典型差距', '殘差標準差，描述各測量點與擬合直線在高度上的典型差距', 'Residual standard deviation, describing the typical height difference between the measured points and the fitted line');
  const residualSum = hint(variable('Q'), '残差平方和，即各测量点与拟合直线的高度差平方后相加', '殘差平方和，即各測量點與擬合直線的高度差平方後相加', 'Sum of squared height differences between the measured points and the fitted line');
  const slope = hint(a, '拟合直线的斜率，对应上图中的 s', '擬合直線的斜率，對應上圖中的 s', 'Slope of the fitted line, shown as s in the chart above');
  const gamma = hint(g, '由本组实验数据算出的比热容比', '由本組實驗資料算出的比熱容比', 'Heat-capacity ratio calculated from this group of data');
  const mass = hint(variable('m'), '随活塞一起振动的部件总质量', '隨活塞一起振動的部件總質量', 'Total mass of the parts that oscillate with the piston');
  const diameter = hint(variable('d'), '气缸内径', '氣缸內徑', 'Inner diameter of the cylinder');
  const pressure = hint(variable('P'), '活塞处于平衡位置时的缸内压强', '活塞處於平衡位置時的缸內壓強', 'Pressure inside the cylinder at the piston’s equilibrium position');
  const massLimit = hint(row(variable('Δ'), variable('m')), '质量的允许误差范围为 ±Δm', '質量的允許誤差範圍為 ±Δm', 'Allowed mass error range: ±Δm');
  const diameterLimit = hint(row(variable('Δ'), variable('d')), '直径的允许误差范围为 ±Δd', '直徑的允許誤差範圍為 ±Δd', 'Allowed diameter error range: ±Δd');
  const slopeA = hint(u('A', a), '根据测量点与拟合直线的偏差算出的斜率不确定度', '根據測量點與擬合直線的偏差算出的斜率不確定度', 'Slope uncertainty calculated from the scatter about the fitted line');
  const gammaA = hint(u('A', g), '由斜率的 A 类不确定度引起的比热容比不确定度', '由斜率的 A 類不確定度引起的比熱容比不確定度', 'Uncertainty in the heat-capacity ratio due to the Type A slope uncertainty');
  const slopeB = hint(u('B', a), '由系统根据本次数据评定的斜率 B 类不确定度', '由系統根據本次資料評定的斜率 B 類不確定度', 'Type B slope uncertainty evaluated by the software for this experiment');
  const massB = hint(u('B', variable('m')), '由质量的允许误差换算得到的标准不确定度', '由質量的允許誤差換算得到的標準不確定度', 'Standard uncertainty obtained from the allowed mass error');
  const diameterB = hint(u('B', variable('d')), '由直径的允许误差换算得到的标准不确定度', '由直徑的允許誤差換算得到的標準不確定度', 'Standard uncertainty obtained from the allowed diameter error');
  const pressureB = hint(u('instrument', variable('P')), '仪器给出的压强标准不确定度', '儀器給出的壓強標準不確定度', 'Standard pressure uncertainty specified for the instrument');
  const gammaB = hint(u('B', g), '由斜率、质量、直径和压强的 B 类不确定度算出的比热容比不确定度', '由斜率、質量、直徑和壓強的 B 類不確定度算出的比熱容比不確定度', 'Heat-capacity ratio uncertainty calculated from the Type B uncertainties in slope, mass, diameter, and pressure');
  const combined = hint(u('c', g), '比热容比的 A 类与 B 类标准不确定度合成后的结果', '比熱容比的 A 類與 B 類標準不確定度合成後的結果', 'Combined Type A and Type B standard uncertainty in the heat-capacity ratio');
  const relative = hint(u('r'), '合成标准不确定度占比热容比绝对值的百分比', '合成標準不確定度佔比熱容比絕對值的百分比', 'Combined standard uncertainty as a percentage of the magnitude of the heat-capacity ratio');
  const sum = (value: ReactNode) => row(element('munderover', operator('∑'), equals(index, pistonMathNumber(1)), count), value);
  const ratioSquared = (numerator: ReactNode, denominator: ReactNode) => square(group(fraction(numerator, denominator)));
  return {
    meanX: equals(meanPeriod, fraction(sum(squaredPeriod), count)),
    sxx: equals(deviationSum, sum(square(group(join('−', squaredPeriod, meanPeriod))))),
    residual: equals(residual, root(fraction(residualSum, join('−', count, pistonMathNumber(2))))),
    slopeA: equals(slopeA, fraction(residual, root(deviationSum))),
    gammaA: equals(gammaA, row(absolute(fraction(gamma, slope)), slopeA)),
    mass: equals(massB, fraction(massLimit, root(pistonMathNumber(3)))),
    diameter: equals(diameterB, fraction(diameterLimit, root(pistonMathNumber(3)))),
    gammaB: equals(gammaB, row(absolute(gamma), root(join('+',
      ratioSquared(slopeB, slope),
      ratioSquared(massB, mass),
      ratioSquared(row(pistonMathNumber(2), diameterB), diameter),
      ratioSquared(pressureB, pressure),
    )))),
    combined: equals(combined, root(join('+', square(gammaA), square(gammaB)))),
    relative: equals(relative, row(fraction(combined, absolute(gamma)), operator('×'), pistonMathNumber(100), operator('%'))),
    reportCombined: combined,
    result: row(gamma, operator('±'), combined),
  };
};

export const PistonUncertaintyFormula = ({ field, language, label }: { field: PistonUncertaintyExerciseField; language: string; label: string }) => <PistonMath block label={label}>{formulaNodes(language)[field]}</PistonMath>;

export const PistonUncertaintyGammaBasis = ({ gamma, slope }: { gamma: number; slope: number }) => <>
  <PistonMath block>{equals(variable('γ'), fraction(row(pistonMathNumber(4), square(variable('π')), variable('m'), variable('a')), row(variable('A'), variable('P'))), pistonMathNumber(gamma))}</PistonMath>
  <span><PistonRichText text={`a = ${slope} m/s²`} /></span>
</>;

const inlineCatalogue = (en: boolean): Record<string, ReactNode> => {
  const { a, sr, sxx, i, u } = pistonMathSymbols(en);
  const out: Record<string, ReactNode> = {
    'h = aT² + b': equals(variable('h'), join('+', row(a, square(variable('T'))), variable('b'))),
    'Q/(n−2)': fraction(variable('Q'), group(join('−', variable('n'), pistonMathNumber(2)))),
    'n−2': join('−', variable('n'), pistonMathNumber(2)),
    '√3': root(pistonMathNumber(3)),
    'Δ/√3': fraction(variable('Δ'), root(pistonMathNumber(3))),
    'sr': sr, 'Sxx': sxx, 'uc': u('c'), 'ur': u('r'),
    'T²̄': meanSquaredPeriod(), 'Tᵢ²': square(sub(variable('T'), i)), 'T²': square(variable('T')), 'R²': square(variable('R')),
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
  for (const name of ['a', 'b', 'n', 'Q', 'γ', 'm', 'd', 'P']) out[name] = variable(name);
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

export const PistonRichText = ({ text: content, language = 'zh-CN', withSymbolHints = false }: {
  text: string;
  language?: string;
  withSymbolHints?: boolean;
}) => {
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
    const hints = withSymbolHints && Object.hasOwn(lessonSymbolHints, token) ? lessonSymbolHints[token] : undefined;
    pieces.push(<PistonMath key={match.index}>
      {hints ? symbolWithHint(node, hints[language === 'zh-TW' ? 1 : language === 'en' ? 2 : 0]) : node}
    </PistonMath>);
    end = match.index! + token.length;
  }
  if (end < content.length) pieces.push(content.slice(end));
  return <>{pieces.map((piece, index) => <Fragment key={index}>{piece}</Fragment>)}</>;
};
