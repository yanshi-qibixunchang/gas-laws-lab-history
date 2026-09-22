import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadWorkbenchView } from '../workbench/helpers/loadWorkbenchView.ts';

const { PistonMathNumber, PistonRichText, PistonUncertaintyFormula } = loadWorkbenchView<typeof import('../../src/features/pistonOscillation/PistonUncertaintyMath.tsx')>(
  new URL('../../src/features/pistonOscillation/PistonUncertaintyMath.tsx', import.meta.url),
);
const number = (value: number | string) => renderToStaticMarkup(createElement(PistonMathNumber, { value }));
// Scientific presentation must preserve a submitted answer's written precision.
assert.match(number('0.000350'), /<mn>3\.50<\/mn>.*<msup><mn>10<\/mn><mn>−4<\/mn>/);
assert.match(number('-3.5878598538e-7'), /<mn>−3\.5878598538<\/mn>.*<mn>−7<\/mn>/);
assert.match(number('0.00'), /<mn>0\.00<\/mn>/);
assert.match(number('1.40'), /<mn>1\.40<\/mn>/);
assert.match(number('1000000'), /<mn>1\.000000<\/mn>.*<mn>6<\/mn>/);
const prose = 'Calibration remains independent; the answer is retained.';
assert.equal(renderToStaticMarkup(createElement(PistonRichText, { text: prose, language: 'en' })), prose);
const mixed = renderToStaticMarkup(createElement(PistonRichText, { text: 'Q = 3.5878598538e-7 m²; Sxx = 5.899896e-8 s⁴' }));
assert.doesNotMatch(mixed, /e-7|e-8|Sxx/);
assert.match(mixed, /<msub><mi>S<\/mi><mrow><mi>x<\/mi><mi>x<\/mi>/);
assert.match(mixed, /<msup><mtext>m<\/mtext><mn>2<\/mn>/);
const rootExplanation = renderToStaticMarkup(createElement(PistonRichText, { text: 'u=Δ/√3' }));
assert.match(rootExplanation, /<mfrac>.*<msqrt><mn>3<\/mn><\/msqrt><\/mfrac>/);
const readout = renderToStaticMarkup(createElement(PistonRichText, { text: 'u仪器(P)', language: 'en' }));
assert.match(readout, /<mtext>instrument<\/mtext>/);
console.log('Uncertainty math preserves numerical precision, formats scientific notation and leaves prose intact.');

const propagation = renderToStaticMarkup(createElement(PistonUncertaintyFormula, { field: 'gammaB', language: 'zh-CN', coverage: 2, label: 'B 类传播' }));
assert.match(propagation, /<mtext>仪器<\/mtext>/);
assert.match(propagation, /<msqrt>/);
assert.match(propagation, /<mfrac>/);
