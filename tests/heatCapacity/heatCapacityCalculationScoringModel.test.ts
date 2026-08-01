import assert from 'node:assert/strict';
import {
  calculateHeatCapacityCalculationAnswerScore,
  createHeatCapacityCalculationAnswerState,
  revealHeatCapacityCalculationAnswer,
  submitHeatCapacityCalculationAnswer,
} from '../../src/domain/heatCapacity/heatCapacityCalculationScoringModel.ts';
import {
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';

const gammaAnswer = {
  expectedValue: 1.4,
  spec: HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.gamma,
};

const firstCorrect = submitHeatCapacityCalculationAnswer(
  createHeatCapacityCalculationAnswerState(),
  {
    ...gammaAnswer,
    rawInput: '1.400',
  },
);
assert.equal(firstCorrect.outcome, 'correct');
assert.equal(firstCorrect.state.status, 'correct');
assert.equal(firstCorrect.state.referenceTone, 'success');
assert.equal(firstCorrect.state.awardedRatio, 1);
assert.equal(calculateHeatCapacityCalculationAnswerScore(firstCorrect.state, 5), 5);
assert.deepEqual(firstCorrect.state.attempts, [
  {
    sequence: 1,
    rawInput: '1.400',
    outcome: 'correct',
    numericCorrect: true,
    precisionCorrect: true,
    parsedValue: 1.4,
  },
]);

const firstWrong = submitHeatCapacityCalculationAnswer(
  createHeatCapacityCalculationAnswerState(),
  {
    ...gammaAnswer,
    rawInput: '1.200',
  },
);
assert.equal(firstWrong.outcome, 'incorrect');
assert.equal(firstWrong.state.status, 'unresolved');
assert.equal(firstWrong.state.hasIncorrectValidAttempt, true);
assert.equal(firstWrong.state.awardedRatio, null);

const wrongThenCorrect = submitHeatCapacityCalculationAnswer(
  firstWrong.state,
  {
    ...gammaAnswer,
    rawInput: '1.400',
  },
);
assert.equal(wrongThenCorrect.state.status, 'correct');
assert.equal(wrongThenCorrect.state.referenceTone, 'success');
assert.equal(wrongThenCorrect.state.awardedRatio, 0.6);
assert.equal(
  calculateHeatCapacityCalculationAnswerScore(wrongThenCorrect.state, 5),
  3,
);
assert.equal(wrongThenCorrect.state.attempts.length, 2);

const wrongPrecision = submitHeatCapacityCalculationAnswer(
  createHeatCapacityCalculationAnswerState(),
  {
    ...gammaAnswer,
    rawInput: '1.4',
  },
);
assert.equal(wrongPrecision.outcome, 'incorrect');
assert.equal(wrongPrecision.validation.numericCorrect, true);
assert.equal(wrongPrecision.validation.precisionCorrect, false);
assert.equal(wrongPrecision.state.hasIncorrectValidAttempt, true);

const precisionCorrected = submitHeatCapacityCalculationAnswer(
  wrongPrecision.state,
  {
    ...gammaAnswer,
    rawInput: '1.400',
  },
);
assert.equal(precisionCorrected.state.awardedRatio, 0.8);

const blankAttempt = submitHeatCapacityCalculationAnswer(
  createHeatCapacityCalculationAnswerState(),
  {
    ...gammaAnswer,
    rawInput: '  ',
  },
);
assert.equal(blankAttempt.outcome, 'empty');
assert.equal(blankAttempt.state.hasIncorrectValidAttempt, false);
const blankThenCorrect = submitHeatCapacityCalculationAnswer(
  blankAttempt.state,
  {
    ...gammaAnswer,
    rawInput: '1.400',
  },
);
assert.equal(blankThenCorrect.state.awardedRatio, 1);

const blankRevealed = revealHeatCapacityCalculationAnswer(blankAttempt.state);
assert.equal(blankRevealed.status, 'revealed');
assert.equal(blankRevealed.lastSubmittedRaw, '  ');
assert.equal(blankRevealed.referenceTone, 'danger');
assert.equal(blankRevealed.awardedRatio, 0);
assert.equal(calculateHeatCapacityCalculationAnswerScore(blankRevealed, 5), 0);

const wrongRevealed = revealHeatCapacityCalculationAnswer(firstWrong.state);
assert.equal(wrongRevealed.status, 'revealed');
assert.equal(wrongRevealed.lastSubmittedRaw, '1.200');
assert.equal(wrongRevealed.referenceTone, 'danger');
assert.equal(wrongRevealed.awardedRatio, 0.2);

const invalidAttempt = submitHeatCapacityCalculationAnswer(
  createHeatCapacityCalculationAnswerState(),
  {
    ...gammaAnswer,
    rawInput: '1.400 kg',
  },
);
assert.equal(invalidAttempt.outcome, 'invalid');
assert.equal(invalidAttempt.state.hasIncorrectValidAttempt, false);
assert.equal(
  revealHeatCapacityCalculationAnswer(invalidAttempt.state).awardedRatio,
  0,
  'non-numeric text is not a valid attempted value and earns no base credit',
);

const customBase = submitHeatCapacityCalculationAnswer(
  submitHeatCapacityCalculationAnswer(
    createHeatCapacityCalculationAnswerState({ baseCreditRatio: 0.25 }),
    {
      ...gammaAnswer,
      rawInput: '1.200',
    },
  ).state,
  {
    ...gammaAnswer,
    rawInput: '1.400',
  },
);
assert.equal(customBase.state.awardedRatio, 0.25);
assert.equal(calculateHeatCapacityCalculationAnswerScore(customBase.state, 8), 2);

assert.equal(
  calculateHeatCapacityCalculationAnswerScore(
    createHeatCapacityCalculationAnswerState(),
    5,
  ),
  null,
);
assert.throws(
  () => submitHeatCapacityCalculationAnswer(firstCorrect.state, {
    ...gammaAnswer,
    rawInput: '1.400',
  }),
  /cannot be changed/,
);
assert.throws(
  () => revealHeatCapacityCalculationAnswer(firstCorrect.state),
  /cannot be changed/,
);
assert.throws(
  () => createHeatCapacityCalculationAnswerState({ baseCreditRatio: 1.1 }),
  /between 0 and 1/,
);
assert.throws(
  () => createHeatCapacityCalculationAnswerState({
    baseCreditRatio: 0.6,
    precisionCorrectionCreditRatio: -0.1,
  }),
  /between 0 and 1/,
);

console.log('heatCapacityCalculationScoringModel tests passed');
