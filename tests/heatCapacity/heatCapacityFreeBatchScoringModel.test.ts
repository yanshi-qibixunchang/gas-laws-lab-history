import assert from 'node:assert/strict';
import {
  calculateHeatCapacityGroupReference,
} from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import {
  createHeatCapacityCalculationWorkflowSession,
  type HeatCapacityCalculationWorkflowSession,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  calculateHeatCapacityFreeBatchScore,
  calculateHeatCapacityFreeCalculationScore,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchScoringModel.ts';
import type {
  HeatCapacityProcessScore,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts';

const createReference = (offset: number) => {
  const reference = calculateHeatCapacityGroupReference({
    u0Mv: 0,
    u1Mv: 120 + offset,
    u2Mv: 40 + offset / 3,
    atmosphericPressureKPa: 101.3,
    pressureSensitivityMvPerKPa: 20,
  });
  assert.notEqual(reference, null);
  return reference!;
};

const createSession = (groupCount: number) => createHeatCapacityCalculationWorkflowSession({
  mode: 'free',
  groups: Array.from({ length: groupCount }, (_, index) => ({
    trialId: `trial-${index + 1}`,
    reference: createReference(index),
  })),
  theoreticalGamma: 1.4,
  now: 100,
});

const resolveSession = (
  session: HeatCapacityCalculationWorkflowSession,
): HeatCapacityCalculationWorkflowSession => ({
  ...session,
  status: 'completed',
  groups: session.groups.map((group) => ({
    ...group,
    fields: group.fields.map((field) => ({
      ...field,
      answer: {
        ...field.answer,
        status: 'correct',
        awardedRatio: 1,
      },
    })),
  })),
  aggregate: session.aggregate
    ? {
        ...session.aggregate,
        fields: session.aggregate.fields.map((field) => ({
          ...field,
          answer: {
            ...field.answer,
            status: 'correct',
            awardedRatio: 1,
          },
        })),
      }
    : null,
  completedAtMs: 200,
});

const operationScore = (total: number): HeatCapacityProcessScore => ({
  total,
  maxScore: 75,
  items: [],
});

const threeGroups = resolveSession(createSession(3));
const perfectCalculation = calculateHeatCapacityFreeCalculationScore(threeGroups);
assert.equal(perfectCalculation.total, 25);
assert.deepEqual(
  perfectCalculation.details.map((detail) => detail.maxScore),
  [4, 4, 7, 3, 3, 2, 2],
);

const operationScores = new Map(
  threeGroups.groups.map((group) => [group.trialId, operationScore(75)]),
);
const perfectBatch = calculateHeatCapacityFreeBatchScore({
  session: threeGroups,
  operationScoresByTrialId: operationScores,
});
assert.equal(perfectBatch.operationAverage, 75);
assert.equal(perfectBatch.calculation.total, 25);
assert.equal(perfectBatch.total, 100);

const precisionCorrectionSession: HeatCapacityCalculationWorkflowSession = {
  ...threeGroups,
  groups: threeGroups.groups.map((group, groupIndex) => ({
    ...group,
    fields: group.fields.map((field, fieldIndex) => (
      groupIndex === 0 && fieldIndex === 0
        ? { ...field, answer: { ...field.answer, awardedRatio: 0.8 } }
        : field
    )),
  })),
};
const precisionCalculation = calculateHeatCapacityFreeCalculationScore(
  precisionCorrectionSession,
);
assert.equal(
  precisionCalculation.details.find((detail) => (
    detail.id === 'calculation-corrected-voltages'
  ))?.score,
  3.9,
);
assert.equal(precisionCalculation.total, 24.9);

const incompleteSession: HeatCapacityCalculationWorkflowSession = {
  ...threeGroups,
  aggregate: threeGroups.aggregate
    ? {
        ...threeGroups.aggregate,
        fields: threeGroups.aggregate.fields.map((field, index) => (
          index === 0
            ? {
                ...field,
                answer: {
                  ...field.answer,
                  status: 'unresolved',
                  awardedRatio: null,
                },
              }
            : field
        )),
      }
    : null,
};
const incompleteBatch = calculateHeatCapacityFreeBatchScore({
  session: incompleteSession,
  operationScoresByTrialId: operationScores,
});
assert.equal(incompleteBatch.calculation.total, null);
assert.equal(incompleteBatch.total, null);

const sevenGroups = resolveSession(createSession(7));
assert.equal(
  calculateHeatCapacityFreeCalculationScore(sevenGroups).total,
  25,
  'the number of experiment groups must not change the calculation maximum',
);

const mixedOperationScores = new Map([
  ['trial-1', operationScore(75)],
  ['trial-2', operationScore(70)],
  ['trial-3', operationScore(65)],
]);
const mixedBatch = calculateHeatCapacityFreeBatchScore({
  session: threeGroups,
  operationScoresByTrialId: mixedOperationScores,
});
assert.equal(mixedBatch.operationAverage, 70);
assert.equal(mixedBatch.total, 95);

console.log('heatCapacityFreeBatchScoringModel tests passed');
