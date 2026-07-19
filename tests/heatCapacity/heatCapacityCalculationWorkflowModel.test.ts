import assert from 'node:assert/strict';
import {
  calculateHeatCapacityGroupReference,
} from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import {
  calculateHeatCapacityCalculationWorkflowScoreRatio,
  completeHeatCapacityCalculationWorkflow,
  continueHeatCapacityCalculationAnswer,
  createHeatCapacityCalculationWorkflowSession,
  getHeatCapacityCalculationWorkflowField,
  getHeatCapacityCalculationWorkflowVisibleSteps,
  revealHeatCapacityCalculationWorkflowAnswer,
  selectHeatCapacityCalculationGroup,
  submitHeatCapacityCalculationStep,
  updateHeatCapacityCalculationDraft,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  formatHeatCapacityCalculationReference,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';

const createReference = (offset: number) => {
  const reference = calculateHeatCapacityGroupReference({
    u0Mv: 0.1,
    u1Mv: 120.1 + offset,
    u2Mv: 40.1 + offset / 3,
    atmosphericPressureKPa: 101.3,
    pressureSensitivityMvPerKPa: 20,
  });
  assert.notEqual(reference, null);
  return reference!;
};

const guide = createHeatCapacityCalculationWorkflowSession({
  mode: 'guide',
  groups: [{ trialId: 'guide-1', reference: createReference(0) }],
  theoreticalGamma: 1.4,
  now: 100,
});
assert.equal(guide.status, 'in-progress');
assert.equal(guide.groups[0].steps.length, 4);
assert.equal(getHeatCapacityCalculationWorkflowVisibleSteps(guide).length, 1);

const correctedStep = guide.groups[0].steps[0];
const [u1FieldId, u2FieldId] = correctedStep.fieldIds;
const u1Field = getHeatCapacityCalculationWorkflowField(guide, u1FieldId)!;
const u2Field = getHeatCapacityCalculationWorkflowField(guide, u2FieldId)!;
let guideProgress = updateHeatCapacityCalculationDraft(
  guide,
  u1FieldId,
  formatHeatCapacityCalculationReference(
    u1Field.expectedValue,
    HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.correctedVoltage,
  ),
);
guideProgress = updateHeatCapacityCalculationDraft(guideProgress, u2FieldId, '999.0');
guideProgress = submitHeatCapacityCalculationStep(guideProgress, correctedStep.id, 110);
assert.equal(getHeatCapacityCalculationWorkflowField(guideProgress, u1FieldId)?.answer.status, 'correct');
assert.equal(getHeatCapacityCalculationWorkflowField(guideProgress, u2FieldId)?.feedback?.outcome, 'incorrect');
assert.equal(guideProgress.activeStepId, correctedStep.id);

guideProgress = continueHeatCapacityCalculationAnswer(guideProgress, u2FieldId);
guideProgress = updateHeatCapacityCalculationDraft(
  guideProgress,
  u2FieldId,
  formatHeatCapacityCalculationReference(
    u2Field.expectedValue,
    HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.correctedVoltage,
  ),
);
guideProgress = submitHeatCapacityCalculationStep(guideProgress, correctedStep.id, 120);
assert.equal(getHeatCapacityCalculationWorkflowField(guideProgress, u2FieldId)?.answer.status, 'correct');
assert.equal(getHeatCapacityCalculationWorkflowField(guideProgress, u2FieldId)?.answer.awardedRatio, 0.3);
assert.equal(guideProgress.activeStepId, guide.groups[0].steps[1].id);
assert.equal(getHeatCapacityCalculationWorkflowVisibleSteps(guideProgress).length, 2);

const free = createHeatCapacityCalculationWorkflowSession({
  mode: 'free',
  groups: [
    { trialId: 'free-1', reference: createReference(0) },
    { trialId: 'free-2', reference: createReference(6) },
    { trialId: 'free-3', reference: createReference(-4) },
  ],
  theoreticalGamma: 1.4,
  now: 200,
});
assert.notEqual(free.aggregate, null);
assert.equal(free.aggregate?.steps.length, 4);
assert.equal(selectHeatCapacityCalculationGroup(free, 1), free);

let revealProgress = submitHeatCapacityCalculationStep(
  free,
  free.groups[0].steps[0].id,
  210,
);
for (const fieldId of free.groups[0].steps[0].fieldIds) {
  assert.equal(getHeatCapacityCalculationWorkflowField(revealProgress, fieldId)?.feedback?.outcome, 'empty');
  revealProgress = revealHeatCapacityCalculationWorkflowAnswer(revealProgress, fieldId, 220);
}
assert.equal(revealProgress.activeStepId, free.groups[0].steps[1].id);
assert.equal(getHeatCapacityCalculationWorkflowField(revealProgress, free.groups[0].steps[0].fieldIds[0])?.answer.awardedRatio, 0);

const readOnly = createHeatCapacityCalculationWorkflowSession({
  mode: 'demo',
  presentation: 'system-readonly',
  groups: [{ trialId: 'demo-1', reference: createReference(0) }],
  theoreticalGamma: 1.4,
  now: 300,
});
assert.equal(readOnly.status, 'completed');
assert.equal(readOnly.activeStepId, null);
assert.equal(calculateHeatCapacityCalculationWorkflowScoreRatio(readOnly), null);
assert.equal(completeHeatCapacityCalculationWorkflow(readOnly), readOnly);

const zeroSpreadReference = createReference(0);
let completeFree = createHeatCapacityCalculationWorkflowSession({
  mode: 'free',
  groups: [
    {
      trialId: 'rounded-free-1',
      reference: { ...zeroSpreadReference, formulaGamma: 1.40004 },
    },
    {
      trialId: 'rounded-free-2',
      reference: { ...zeroSpreadReference, formulaGamma: 1.40003 },
    },
    {
      trialId: 'rounded-free-3',
      reference: { ...zeroSpreadReference, formulaGamma: 1.40002 },
    },
  ],
  theoreticalGamma: 1.4,
  now: 400,
});
assert.equal(
  completeFree.aggregate?.reference.meanGamma,
  1.4,
  'aggregate statistics must use the four-significant-figure gamma values shown to users',
);
assert.equal(completeFree.aggregate?.reference.sampleStandardDeviation, 0);
assert.equal(completeFree.aggregate?.reference.typeAStandardUncertainty, 0);
assert.equal(completeFree.aggregate?.reference.relativeErrorPercent, 0);

while (completeFree.status === 'in-progress') {
  const activeSteps = completeFree.aggregateSelected
    ? completeFree.aggregate?.steps ?? []
    : completeFree.groups[completeFree.activeGroupIndex].steps;
  const activeStep = activeSteps.find((step) => (
    step.id === completeFree.activeStepId
  ));
  assert.notEqual(activeStep, undefined);
  for (const fieldId of activeStep!.fieldIds) {
    const field = getHeatCapacityCalculationWorkflowField(completeFree, fieldId);
    assert.notEqual(field, null);
    completeFree = updateHeatCapacityCalculationDraft(
      completeFree,
      fieldId,
      formatHeatCapacityCalculationReference(
        field!.expectedValue,
        HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[field!.answerKind],
      ),
    );
  }
  completeFree = submitHeatCapacityCalculationStep(
    completeFree,
    activeStep!.id,
    410,
  );
}

assert.equal(completeFree.status, 'ready-to-exit');
assert.equal(calculateHeatCapacityCalculationWorkflowScoreRatio(completeFree), 1);
for (const zeroFieldId of [
  'aggregate:sampleStandardDeviation',
  'aggregate:typeAStandardUncertainty',
  'aggregate:relativeError',
]) {
  assert.equal(
    getHeatCapacityCalculationWorkflowField(completeFree, zeroFieldId)?.answer.status,
    'correct',
    `${zeroFieldId} should accept its formatted zero reference`,
  );
}
completeFree = completeHeatCapacityCalculationWorkflow(completeFree, 420);
assert.equal(completeFree.status, 'completed');

console.log('heatCapacityCalculationWorkflowModel tests passed');
