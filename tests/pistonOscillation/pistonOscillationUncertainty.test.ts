import assert from 'node:assert/strict';
import { calculatePistonOscillationLinearFit, type PistonOscillationCalculationKnownsSnapshot, type PistonOscillationPeriodRunState } from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import { calculatePistonUncertainty, createPistonUncertaintyCourse, createPistonUncertaintyProfile, normalizePistonUncertaintyCourse, pistonUncertaintyComplete, pistonUncertaintyReference, transitionPistonUncertainty, validatePistonUncertaintyAnswer, PISTON_UNCERTAINTY_FIELDS, PISTON_UNCERTAINTY_PHASES, pistonSlopeBAvailable } from '../../src/domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';

import { evaluatePistonPrecisionChain, planPistonPrecision } from '../../src/domain/pistonOscillation/pistonOscillationPrecisionModel.ts';
import { buildPistonUncertaintyPresentation } from '../../src/domain/pistonOscillation/pistonOscillationUncertaintyPresentation.ts';

const knowns: PistonOscillationCalculationKnownsSnapshot = { schemaVersion: 2, modelVersion: 'display-rounded-piston-slope-calculation-v3', gasType: 'air', gasMaterialModelVersion: 'test', gasMaterialId: 'test', movingMassKg: 0.0485, cylinderDiameterM: 0.0325, pressurePa: 101000, referenceGamma: 1.4 };
const profile = createPistonUncertaintyProfile();
const points = [1, 2, 3, 4].map((x, i) => ({ runIndex: i, measurementIndex: i, rawMeasurementRecordId: `u-${i}`, periodSquaredS2: x * 0.001, heightM: x * 0.05 + 0.01 + [1, -1, -1, 1][i] * 0.0001, heightMm: 0 }));
const fit = calculatePistonOscillationLinearFit(points, 1)!;
const runs = points.map(() => ({ sampleRateHz: 1000, result: { periodCount: 20 } })) as PistonOscillationPeriodRunState[];
const observations = points.map((p, runIndex) => ({ runIndex, heightM: p.heightM, periodS: Math.sqrt(p.periodSquaredS2), periodCount: 20, sampleRateHz: 1000 }));
const a = evaluatePistonPrecisionChain(knowns, observations, profile);
const close = (actual: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

close(a.slope, 50);
close(a.q, 4e-8, 1e-18);
close(a.sxx, 5e-6, 1e-16);
close(a.values.residual, Math.sqrt(2e-8));
close(a.values.slopeA, Math.sqrt(0.004));
assert.equal(a.values.pressure, 100);
assert.ok(!('pressureCalibration' in a.values) && !('pressureReadout' in a.values));
close(a.values.heightReadout, 0.001 / Math.sqrt(12));
close(a.values.heightScale, 0.005 / Math.sqrt(3));
close(a.values.timeScale, 0.0001 / Math.sqrt(3));
close(a.rows[0].timeU, 0.001 / (20 * Math.sqrt(6)));

// Independent finite differences check both derivative families, including T -> T².
for (const [i, row] of a.rows.entries()) {
  const epsH = 1e-6;
  const perturbedH = points.map((p, j) => ({ ...p, heightM: p.heightM + (i === j ? epsH : 0) }));
  close((calculatePistonOscillationLinearFit(perturbedH, 1)!.slopeMPerS2 - fit.slopeMPerS2) / epsH, row.heightSensitivity, 1e-8);
  const epsT = 1e-8;
  const perturbT = (sign: number) => calculatePistonOscillationLinearFit(points.map((p, j) => ({ ...p, periodSquaredS2: i === j ? (Math.sqrt(p.periodSquaredS2) + sign * epsT) ** 2 : p.periodSquaredS2 })), 1)!.slopeMPerS2;
  close((perturbT(1) - perturbT(-1)) / (2 * epsT), row.periodSensitivity, 1e-7);
}
// Avoid double counting scatter and reading noise; shared calibrations do not average away.
close(a.values.slopeA ** 2 + a.values.slopeSupplement ** 2, Math.max(a.values.slopeA ** 2, a.values.slopeReadout ** 2));
close(a.values.slopeB ** 2 - a.values.slopeSupplement ** 2, (a.slope * profile.heightScaleLimit / Math.sqrt(3)) ** 2 + (2 * a.slope * profile.timeScaleLimit / Math.sqrt(3)) ** 2);
const gammaBIndependent = a.gamma * Math.sqrt((a.values.slopeB / 50) ** 2 + (profile.massLimitKg / Math.sqrt(3) / knowns.movingMassKg) ** 2 + (2 * profile.diameterLimitM / Math.sqrt(3) / knowns.cylinderDiameterM) ** 2 + (100 / knowns.pressurePa) ** 2);
close(a.values.gammaB, gammaBIndependent);
close(a.values.combined ** 2, a.values.gammaA ** 2 + a.values.gammaB ** 2);
const exact = evaluatePistonPrecisionChain(knowns, observations.map(o => ({ ...o, heightM: 50 * o.periodS ** 2 + 0.01 })), profile);
assert.equal(exact.values.slopeA, 0);
assert.ok(exact.values.slopeSupplement > 0 && exact.values.combined > 0);
const noisy = evaluatePistonPrecisionChain(knowns, observations.map((o, i) => ({ ...o, heightM: o.heightM + [1,-1,-1,1][i] * 0.003 })), profile);
assert.equal(noisy.values.slopeSupplement, 0);
assert.equal(calculatePistonUncertainty(knowns, fit, runs, profile), null, 'obsolete fits cannot use an independent uncertainty chain');

// Teaching and answer checks use the production rounded chain from public endpoints.
const teachingObservations = [.02,.03,.04,.05].map((periodS, runIndex) => ({ runIndex, periodS, deltaMs: periodS * 20000,
  heightM: 50 * periodS ** 2 + 0.01 + [1,-1,-1,1][runIndex] * 0.0001, periodCount: 20, sampleRateHz: 1000 }));
const planned = planPistonPrecision(knowns, teachingObservations, profile);
const teachingFit = { ...fit, precisionPlan: planned.plan, points: points.map((p, i) => ({ ...p,
  periodSquaredS2: planned.chain.rows[i].x, heightM: planned.chain.rows[i].y })) };
const teachingRuns = teachingObservations.map(o => ({ sampleRateHz: o.sampleRateHz,
  result: { periodCount: o.periodCount, t1S: 0, t2S: o.deltaMs / 1000 } })) as PistonOscillationPeriodRunState[];
const analysis = calculatePistonUncertainty(knowns, teachingFit, teachingRuns, profile);
assert.ok(analysis);
assert.equal(analysis.issue, null);
assert.deepEqual(analysis.values, planned.chain.values);
assert.equal(calculatePistonUncertainty(knowns, teachingFit, [], profile)!.issue, 'invalid-data');
assert.equal(calculatePistonUncertainty(knowns, teachingFit, teachingRuns.map(r => ({ ...r, sampleRateHz: 2 })), profile)!.issue, 'time-resolution');
const massReference = pistonUncertaintyReference('mass', analysis);
assert.equal(validatePistonUncertaintyAnswer('mass', massReference + '0', analysis), 'precision-wrong');
assert.equal(validatePistonUncertaintyAnswer('mass', massReference, analysis), null);
assert.equal(validatePistonUncertaintyAnswer('mass', '0.00036', analysis), 'numeric-wrong');
assert.equal(validatePistonUncertaintyAnswer('mass', '', analysis), 'empty');
assert.equal(validatePistonUncertaintyAnswer('mass', 'NaN', analysis), 'invalid');
let course = createPistonUncertaintyCourse();
assert.equal(Object.keys(course.answers).length, 10);
assert.deepEqual(PISTON_UNCERTAINTY_FIELDS.B, ['mass', 'diameter', 'gammaB']);
assert.equal(pistonSlopeBAvailable(course), false);
assert.equal(buildPistonUncertaintyPresentation(course, analysis, 'zh-CN').parameterRows[3][3], '—');
for (const language of ['zh-CN', 'en']) {
  const copy = buildPistonUncertaintyPresentation(course, analysis, language);
  assert.equal(copy.parameterRows[1][1], '100');
  assert.ok(copy.parameterRows.every(row => row.length === 4));
  assert.doesNotMatch(JSON.stringify(copy.lessons), /√12|Hᵢ|Kᵢ|校准残余|显示量化|重叠|overlap|quantization/);
}
const oldCourse = { ...course, version: 'piston-free-uncertainty-v1' };
assert.equal(normalizePistonUncertaintyCourse(oldCourse, analysis).resetNotice, true);
course.fingerprint = analysis.fingerprint;
assert.equal(transitionPistonUncertainty(course, analysis, { kind: 'check', field: 'residual' }, 1), course, 'reading required');
for (const phase of PISTON_UNCERTAINTY_PHASES) {
  course = transitionPistonUncertainty(course, analysis, { kind: 'read', phase }, 2);
  for (const field of PISTON_UNCERTAINTY_FIELDS[phase]) {
    course = transitionPistonUncertainty(course, analysis, { kind: 'edit', field, value: pistonUncertaintyReference(field, analysis) }, 3);
    course = transitionPistonUncertainty(course, analysis, { kind: 'check', field }, 4);
    assert.equal(course.answers[field].status, 'correct');
    if (field === 'slopeA') {
      assert.equal(pistonSlopeBAvailable(course), true);
      assert.equal(buildPistonUncertaintyPresentation(course, analysis, 'zh-CN').parameterRows[3][3], pistonUncertaintyReference('slopeB', analysis));
    }
  }
}
assert.ok(pistonUncertaintyComplete(course));
assert.deepEqual(normalizePistonUncertaintyCourse(JSON.parse(JSON.stringify(course)), analysis), course);
const changed = calculatePistonUncertainty({ ...knowns, pressurePa: knowns.pressurePa + 100 }, teachingFit, teachingRuns, profile);
const reset = normalizePistonUncertaintyCourse(course, changed);
assert.equal(reset.resetNotice, true);
assert.equal(reset.answers.mass.status, 'unresolved');
const tampered = structuredClone(course);
tampered.answers.mass.draft = '999';
const restored = normalizePistonUncertaintyCourse(tampered, analysis);
assert.equal(restored.answers.mass.status, 'unresolved');
assert.equal(restored.answers.combined.status, 'unresolved');
assert.ok(!pistonUncertaintyComplete(restored));
console.log('pistonOscillationUncertainty tests passed');
