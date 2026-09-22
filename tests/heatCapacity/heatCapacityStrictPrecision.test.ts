import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
  formatHeatCapacityCalculationReference,
  validateHeatCapacityCalculationAnswer,
  getHeatCapacityCalculationAnswerSpec,
  HEAT_CAPACITY_STRICT_ANSWER_RULE,
  type HeatCapacityCalculationAnswerKind,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';
import {
  createHeatCapacityCalculationWorkflowSession,
  submitHeatCapacityCalculationStep,
  updateHeatCapacityCalculationDraft,
  completeHeatCapacityCalculationWorkflow,
  type HeatCapacityCalculationWorkflowSession,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  normalizeHeatCapacityCalculationWorkflowSessionForPersistence,
  normalizeHeatCapacityCalculationWorkflowSessionForTrials,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import { calculateHeatCapacityGroupReference } from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import { calculateDisplayedHeatCapacityBatchStatistics } from '../../src/domain/heatCapacity/heatCapacityCalculationPrecisionModel.ts';

const cases: Array<[HeatCapacityCalculationAnswerKind, number, string, string]> = [
  ['correctedVoltage', 112.05, '112.0', '112.1'],
  ['absolutePressure', 106.9045, '106.904', '106.905'],
  ['gamma', 1.3791517039540764, '1.379', '1.380'],
  ['meanGamma', 1.2345, '1.234', '1.235'],
  ['sampleStandardDeviation', 0.00355, '0.0036', '0.0035'],
  ['typeAStandardUncertainty', 0.00345, '0.0034', '0.0035'],
  ['relativeErrorPercent', 2.505, '2.50', '2.51'],
];
for (const [kind, expected, correct, adjacent] of cases) {
  const spec = HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[kind];
  assert.equal(formatHeatCapacityCalculationReference(expected, spec), correct, `${kind}: half-even rounding`);
  assert.equal(validateHeatCapacityCalculationAnswer(correct, expected, spec).correct, true, `${kind}: displayed answer must pass`);
  const rejected = validateHeatCapacityCalculationAnswer(adjacent, expected, spec);
  assert.equal(rejected.precisionCorrect, true);
  assert.equal(rejected.numericCorrect, false, `${kind}: adjacent last digit must fail`);
  assert.equal(rejected.correct, false);
}
const gammaSpec = HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.gamma;
assert.equal(validateHeatCapacityCalculationAnswer('1.390', 1.4, gammaSpec).correct, false);
assert.equal(validateHeatCapacityCalculationAnswer('1.379e0', 1.3791517039540764, gammaSpec).correct, true);
const redundantZero = validateHeatCapacityCalculationAnswer('1.3790', 1.3791517039540764, gammaSpec);
assert.equal(redundantZero.numericCorrect, true);
assert.equal(redundantZero.precisionCorrect, false);
for (const [kind, spec] of Object.entries(HEAT_CAPACITY_CALCULATION_ANSWER_SPECS)) {
  for (const value of [0, 1.2355, 9.9995, 0.00000008296]) {
    const formatted = formatHeatCapacityCalculationReference(value, spec);
    assert.equal(validateHeatCapacityCalculationAnswer(formatted, value, spec).correct, true,
      `${kind}: own reference must pass even at a carry, zero, or very small value`);
  }
}

const authority = {
  mode: 'guide' as const,
  groups: [{ trialId: 'precision-regression', reference: calculateHeatCapacityGroupReference({
    u0Mv: 0.3, u1Mv: 82.6, u2Mv: 22.6, atmosphericPressureKPa: 101.3,
    pressureSensitivityMvPerKPa: 20,
  })! }],
  theoreticalGamma: 1.4,
  now: 100,
};
const answerStep = (session: HeatCapacityCalculationWorkflowSession, gammaAnswer?: string) => {
  let next = session;
  const step = next.groups[0].steps.find((item) => item.id === next.activeStepId)!;
  for (const id of step.fieldIds) {
    const field = next.groups[0].fields.find((item) => item.id === id)!;
    const raw = field.answerKind === 'gamma' && gammaAnswer ? gammaAnswer
      : formatHeatCapacityCalculationReference(field.expectedValue,
        getHeatCapacityCalculationAnswerSpec(field.answerKind, next.answerRule));
    next = updateHeatCapacityCalculationDraft(next, id, raw);
  }
  return submitHeatCapacityCalculationStep(next, step.id, 200);
};
let strict = createHeatCapacityCalculationWorkflowSession(authority);
assert.equal(strict.answerRule, HEAT_CAPACITY_STRICT_ANSWER_RULE);
strict = answerStep(answerStep(strict));
strict = answerStep(strict, '1.380');
const strictGamma = strict.groups[0].fields.find((field) => field.answerKind === 'gamma')!;
assert.equal(strictGamma.answer.status, 'unresolved');
assert.equal(strictGamma.feedback?.numericCorrect, false);
assert.equal(strictGamma.feedback?.precisionCorrect, true);
const strictRestored = normalizeHeatCapacityCalculationWorkflowSessionForTrials(
  JSON.parse(JSON.stringify(strict)), authority,
)!;
assert.equal(strictRestored.answerRule, HEAT_CAPACITY_STRICT_ANSWER_RULE);
assert.deepEqual(strictRestored.groups[0].fields[4].answer, strictGamma.answer);

let legacy = createHeatCapacityCalculationWorkflowSession({ ...authority, answerRule: 'legacy-tolerance-v1' });
delete legacy.answerRule; // A genuinely old saved session has no rule marker.
legacy = answerStep(answerStep(legacy));
legacy = answerStep(legacy, '1.380');
legacy = answerStep(legacy);
legacy = completeHeatCapacityCalculationWorkflow(legacy, 300);
assert.equal(legacy.status, 'completed');
const legacyRestored = normalizeHeatCapacityCalculationWorkflowSessionForTrials(
  JSON.parse(JSON.stringify(legacy)), authority,
)!;
assert.equal(legacyRestored.answerRule, 'legacy-tolerance-v1');
assert.equal(legacyRestored.status, 'completed');
assert.deepEqual(legacyRestored.groups[0].fields[4].answer, legacy.groups[0].fields[4].answer,
  'historical accepted input, attempts, and credit must not be regraded under the new rule');
assert.equal(normalizeHeatCapacityCalculationWorkflowSessionForPersistence({
  ...strict, answerRule: 'unknown-future-rule',
}), null, 'unknown grading rules must not silently become permissive legacy grading');

const guide = createHeatCapacityCalculationWorkflowSession(authority);
assert.equal(guide.groups[0].reference.formulaGamma, 1.379);
assert.equal(formatHeatCapacityCalculationReference(guide.groups[0].relativeErrorPercent,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.relativeErrorPercent), '1.50',
  'relative error must use the gamma displayed to the student');
const free = createHeatCapacityCalculationWorkflowSession({
  ...authority, mode: 'free',
  groups: [[82.6, 22.6], [84.1, 23.7], [84.3, 23.6]].map(([u1Mv, u2Mv], index) => ({
    trialId: `real-${index}`, reference: calculateHeatCapacityGroupReference({
      u0Mv: 0.3, u1Mv, u2Mv, atmosphericPressureKPa: 101.3, pressureSensitivityMvPerKPa: 20,
    })!,
  })),
});
assert.deepEqual(free.aggregate!.reference, {
  count: 3, meanGamma: 1.389, sampleStandardDeviation: 0.0085,
  typeAStandardUncertainty: 0.0049, relativeErrorPercent: 0.786,
}, 'all later teaching steps must be reproducible using the displayed earlier answers');
const midpointBatch = createHeatCapacityCalculationWorkflowSession({
  ...authority, mode: 'free',
  groups: [[80.3, 21.6], [80.0, 22.0], [80.0, 21.9], [80.1, 22.8]].map(([u1Mv, u2Mv], index) => ({
    trialId: `midpoint-${index}`, reference: calculateHeatCapacityGroupReference({
      u0Mv: 0.3, u1Mv, u2Mv, atmosphericPressureKPa: 101.3, pressureSensitivityMvPerKPa: 20,
    })!,
  })),
});
assert.deepEqual(midpointBatch.groups.map((group) => group.reference.formulaGamma), [1.370, 1.381, 1.379, 1.400]);
assert.equal(midpointBatch.aggregate!.reference.meanGamma, 1.382,
  'the exact decimal mean 1.3825 must round to even, regardless of binary summation error');
assert.equal(calculateDisplayedHeatCapacityBatchStatistics([1.400, 1.505, 1.610], 1.4)
  .sampleStandardDeviation, 0.10, 'the exact standard deviation 0.105 must round to even');
console.log('heatCapacityStrictPrecision tests passed');
