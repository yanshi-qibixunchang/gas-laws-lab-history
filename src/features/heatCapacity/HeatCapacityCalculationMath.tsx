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
const instrumentVoltage = r(sub('u', node('mtext', '仪器')), par(v('U')));
const uc = r(sub('u', node('mtext', 'c')), par(mean));
const square = (value: ReactNode) => node('msup', value, n(2));
const p = (i: number) => sub('P', n(i));
const u = (i: number, prime = false) => prime ? node('msup', sub('U', n(i)), op('′')) : sub('U', n(i));
const ln = (a: ReactNode) => r(v('ln'), par(a));
const math = (children: ReactNode, label?: string) => el('math', {
  xmlns: 'http://www.w3.org/1998/Math/MathML', display: 'inline',
  className: 'studio-heat-calculation-math', ...(label ? { 'aria-label': label } : {}),
}, children);

export const HeatCapacityCalculationMath = ({ kind, fieldId, count, usePublicQ, label }: {
  kind: HeatCapacityCalculationStepKind; fieldId: string; count: number; usePublicQ: boolean; label: string;
}) => {
  const i = fieldId.endsWith('u1Prime') || fieldId.endsWith('p1') ? 1 : 2;
  const ref = sub('γ', node('mtext', 'ref'));
  let formula: ReactNode;
  switch (kind) {
    case 'correctedVoltages': formula = r(u(i, true), op('='), u(i), op('−'), u(0)); break;
    case 'absolutePressures': formula = r(p(i), op('='), p(0), op('+'), frac(u(i, true), v('S'))); break;
    case 'groupGamma': formula = r(v('γ'), op('='), frac(ln(frac(p(1), p(0))), ln(frac(p(1), p(2))))); break;
    case 'meanGamma': formula = r(mean, op('='), frac(r(...Array.from({ length: count }, (_, j) => r(j ? op('+') : null, sub('γ', n(j + 1))))), n(count))); break;
    case 'sampleStandardDeviation': formula = r(v('s'), op('='), root(frac(usePublicQ ? v('Q') : r(op('∑'), node('msup', par(r(sub('γ', v('i')), op('−'), mean)), n(2))), r(n(count), op('−'), n(1))))); break;
    case 'typeAStandardUncertainty': formula = r(ua, op('='), frac(v('s'), root(n(count)))); break;
    case 'typeBStandardUncertainty': formula = r(ub, op('='), v('C'), op('×'), instrumentVoltage); break;
    case 'combinedStandardUncertainty': formula = r(uc, op('='), root(r(square(par(ua)), op('+'), square(par(ub))))); break;
    case 'finalReport': formula = fieldId.endsWith('reportMeanGamma') ? mean : uc; break;
    default: formula = r(sub('E', v('r')), op('='), frac(abs(r(kind === 'guideRelativeError' ? v('γ') : mean, op('−'), ref)), abs(ref)), op('×'), n(100), op('%'));
  }
  return math(r(formula, op('=')), label);
};

export const HeatCapacityQDefinition = ({ value }: { value: string }) => math(r(
  v('Q'), op('='), node('munderover', op('∑'), r(v('i'), op('='), n(1)), n(3)),
  node('msup', par(r(sub('γ', v('i')), op('−'), mean)), n(2)), op('='), n(value),
), 'Q = Σ(γᵢ − γ̄)²');

export const HeatCapacityFinalResult = ({ average, uncertainty }: { average: string; uncertainty: string }) => math(r(
  mean, op('='), n(average), op('±'), n(uncertainty),
));

export const HeatCapacityPropagationDefinition = () => math(r(
  v('C'), op('='), root(r(square(sub('c', n(0))), op('+'), square(sub('c', n(1))), op('+'), square(sub('c', n(2)))))
), 'C = √(c₀² + c₁² + c₂²)');
