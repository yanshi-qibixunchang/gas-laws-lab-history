import { createElement as el, type ReactNode } from 'react';
import type { HeatCapacityCalculationStepKind } from '../../domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';

const node = (tag: string, ...children: ReactNode[]) => el(tag, null, ...children);
const r = (...children: ReactNode[]) => node('mrow', ...children);
const v = (name: string) => node('mi', name);
const n = (value: number | string) => node('mn', String(value));
const op = (value: string) => node('mo', value);
const sub = (name: string, index: ReactNode) => node('msub', v(name), index);
const frac = (a: ReactNode, b: ReactNode) => node('mfrac', a, b);
const root = (a: ReactNode) => node('msqrt', a);
const par = (a: ReactNode) => r(op('('), a, op(')'));
const abs = (a: ReactNode) => r(op('|'), a, op('|'));
const mean = node('mover', v('γ'), op('¯'));
const ua = r(sub('u', node('mtext', 'A')), par(mean));
const ub = r(sub('u', node('mtext', 'B')), par(mean));
const uc = r(sub('u', node('mtext', 'c')), par(mean));
const square = (value: ReactNode) => node('msup', value, n(2));
const p = (i: number) => sub('P', n(i));
const u = (i: number, prime = false) => prime ? node('msup', sub('U', n(i)), op('′')) : sub('U', n(i));
const ln = (a: ReactNode) => r(v('ln'), par(a));
const sum = (value: ReactNode, count: number) => r(
  node('munderover', op('∑'), r(v('i'), op('='), n(1)), n(count)),
  value,
);
const math = (children: ReactNode, label?: string) => el('math', {
  xmlns: 'http://www.w3.org/1998/Math/MathML', display: 'inline',
  className: 'studio-heat-calculation-math', ...(label ? { 'aria-label': label } : {}),
}, children);

const symbolHints = {
  S: ['压力传感器的灵敏度。压强每变化 1 kPa，输出电压变化的毫伏数。', '壓力感測器的靈敏度。壓強每變化 1 kPa，輸出電壓變化的毫伏數。', 'Pressure sensor sensitivity, in millivolts of output change per kilopascal of pressure change.'],
  Q: ['将每次测得的比热容比减去平均值，再把各次差值平方后相加。', '將每次測得的比熱容比減去平均值，再把各次差值平方後相加。', 'Subtract the mean from each measured heat-capacity ratio, square the differences, and add them.'],
  C: ['综合三种电压读数对平均比热容比的影响，用于把电压不确定度换算成比热容比的不确定度。', '綜合三種電壓讀數對平均比熱容比的影響，用於把電壓不確定度換算成比熱容比的不確定度。', 'Combines how the three voltage readings affect the mean heat-capacity ratio, so voltage uncertainty can be converted to uncertainty in that ratio.'],
  instrumentVoltage: ['本实验给定的电压仪器标准不确定度为 0.1 mV，直接用于计算。', '本實驗給定的電壓儀器標準不確定度為 0.1 mV，直接用於計算。', 'The specified voltage instrument standard uncertainty is 0.1 mV and is used directly.'],
} as const;

const symbolWithHint = (symbol: keyof typeof symbolHints, language: string) => {
  const hint = symbolHints[symbol][language === 'en' ? 2 : language === 'zh-TW' ? 1 : 0];
  const value = symbol === 'instrumentVoltage'
    ? r(sub('u', node('mtext', language === 'en' ? 'instrument' : language === 'zh-TW' ? '儀器' : '仪器')), par(v('U')))
    : v(symbol);
  return el('mrow', {
    className: 'calculation-symbol-hint',
    tabIndex: 0,
    'data-prompt-tooltip': hint,
    'data-prompt-tooltip-focus-visible': '',
  }, value);
};

export const HeatCapacityCalculationSymbol = ({ symbol, language }: {
  symbol: keyof typeof symbolHints; language: string;
}) => math(symbolWithHint(symbol, language));

export const HeatCapacityCalculationMath = ({ kind, fieldId, count, referenceIndex, label, language }: {
  kind: HeatCapacityCalculationStepKind; fieldId: string; count: number; referenceIndex: 'ref' | '0'; label: string; language: string;
}) => {
  const i = fieldId.endsWith('u1Prime') || fieldId.endsWith('p1') ? 1 : 2;
  const ref = sub('γ', referenceIndex === '0' ? n(0) : node('mtext', 'ref'));
  const squaredDeviations = referenceIndex === 'ref'
    ? symbolWithHint('Q', language)
    : sum(square(par(r(sub('γ', v('i')), op('−'), mean))), count);
  let formula: ReactNode;
  switch (kind) {
    case 'correctedVoltages': formula = r(u(i, true), op('='), u(i), op('−'), u(0)); break;
    case 'absolutePressures': formula = r(p(i), op('='), p(0), op('+'), frac(u(i, true), symbolWithHint('S', language))); break;
    case 'groupGamma': formula = r(v('γ'), op('='), frac(ln(frac(p(1), p(0))), ln(frac(p(1), p(2))))); break;
    case 'meanGamma': formula = r(mean, op('='), frac(sum(sub('γ', v('i')), count), n(count))); break;
    case 'sampleStandardDeviation': formula = r(v('s'), op('='), root(frac(squaredDeviations, r(n(count), op('−'), n(1))))); break;
    case 'typeAStandardUncertainty': formula = r(ua, op('='), frac(r(v('s'), par(v('γ'))), root(n(count)))); break;
    case 'typeBStandardUncertainty': formula = r(ub, op('='), symbolWithHint('C', language), op('×'), symbolWithHint('instrumentVoltage', language)); break;
    case 'combinedStandardUncertainty': formula = r(uc, op('='), root(r(square(par(ua)), op('+'), square(par(ub))))); break;
    case 'finalReport': formula = fieldId.endsWith('reportMeanGamma') ? mean : uc; break;
    default: formula = r(sub('E', v('r')), op('='), frac(abs(r(kind === 'guideRelativeError' ? v('γ') : mean, op('−'), ref)), abs(ref)), op('×'), n(100), op('%'));
  }
  return math(r(formula, op('=')), label);
};

export const HeatCapacityQDefinition = ({ value, count, language }: { value: string; count: number; language: string }) => math(r(
  symbolWithHint('Q', language), op('='), sum(square(par(r(sub('γ', v('i')), op('−'), mean))), count), op('='), n(value),
), 'Q = Σ(γᵢ − γ̄)²');

export const HeatCapacityFinalResult = ({ average, uncertainty }: { average: string; uncertainty: string }) => math(r(
  mean, op('='), n(average), op('±'), n(uncertainty),
));

export const HeatCapacityPropagationDefinition = ({ language }: { language: string }) => math(r(
  symbolWithHint('C', language), op('='), root(r(square(sub('c', n(0))), op('+'), square(sub('c', n(1))), op('+'), square(sub('c', n(2)))))
), 'C = √(c₀² + c₁² + c₂²)');
