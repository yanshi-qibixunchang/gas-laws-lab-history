import assert from 'node:assert/strict';
import { calculateHeatCapacityGroupReference } from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import {
  createHeatCapacityCalculationWorkflowSession, getHeatCapacityCalculationNextPage,
  getHeatCapacityCalculationWorkflowVisibleSteps, rehydrateHeatCapacityCalculationWorkflowSession,
  revealHeatCapacityCalculationWorkflowAnswer, selectHeatCapacityCalculationAggregate,
  selectHeatCapacityCalculationGroup, submitHeatCapacityCalculationStep,
  updateHeatCapacityCalculationDraft, continueHeatCapacityCalculationAnswer,
  type HeatCapacityCalculationWorkflowSession,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import { formatHeatCapacityCalculationReference, getHeatCapacityCalculationFieldSpec } from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';

const options = {
  mode: 'free' as const, theoreticalGamma: 1.4, now: 100,
  groups: [0, 2, 4].map((offset, index) => ({ trialId: `trial-${index}`, reference: calculateHeatCapacityGroupReference({
    u0Mv: 0.1, u1Mv: 82.1 + offset, u2Mv: 22.1 + offset / 2,
    atmosphericPressureKPa: 101.3, pressureSensitivityMvPerKPa: 20,
  })! })),
};
const solveActive = (session: HeatCapacityCalculationWorkflowSession) => {
  const step = session.groups.flatMap(group => group.steps).find(step => step.id === session.activeStepId)!;
  let next = session;
  for (const id of step.fieldIds) {
    const field = session.groups.flatMap(group => group.fields).find(field => field.id === id)!;
    next = updateHeatCapacityCalculationDraft(next, id, formatHeatCapacityCalculationReference(field.expectedValue, getHeatCapacityCalculationFieldSpec(field, session.answerRule)));
  }
  return submitHeatCapacityCalculationStep(next, step.id, 200);
};

for (const revealGamma of [true, false]) {
  let session = createHeatCapacityCalculationWorkflowSession(options);
  assert.equal(getHeatCapacityCalculationNextPage(session), null);
  assert.equal(selectHeatCapacityCalculationGroup(session, 1), session);
  for (let index = 0; index < 3; index++) {
    session = solveActive(solveActive(session));
    const gammaStep = session.groups[index]!.steps.at(-1)!;
    const gammaId = gammaStep.fieldIds[0]!;
    if (revealGamma) {
      session = updateHeatCapacityCalculationDraft(session, gammaId, '9.999');
      session = submitHeatCapacityCalculationStep(session, gammaStep.id, 210);
      assert.equal(getHeatCapacityCalculationNextPage(session), null, 'wrong answer must not unlock navigation');
      session = revealHeatCapacityCalculationWorkflowAnswer(session, gammaId, 220);
    } else session = solveActive(session);
    assert.equal(session.selectedGroupIndex, index, 'checking or revealing gamma must keep its experiment visible');
    assert.equal(session.aggregateSelected, false);
    assert.equal(getHeatCapacityCalculationWorkflowVisibleSteps(session).at(-1)!.id, gammaStep.id);
    assert.equal(session.groups[index]!.fields.find(field => field.id === gammaId)!.answer.status, revealGamma ? 'revealed' : 'correct');
    session = rehydrateHeatCapacityCalculationWorkflowSession(JSON.parse(JSON.stringify(session)), options);
    assert.equal(session.selectedGroupIndex, index, 'save/restore must retain the page showing the resolved answer');
    assert.equal(session.aggregateSelected, false);
    assert.equal(getHeatCapacityCalculationNextPage(session), index < 2 ? index + 1 : 'aggregate');
    session = index < 2 ? selectHeatCapacityCalculationGroup(session, index + 1) : selectHeatCapacityCalculationAggregate(session);
    assert.equal(session.aggregateSelected, index === 2);
    assert.equal(getHeatCapacityCalculationNextPage(session), null);
    session = rehydrateHeatCapacityCalculationWorkflowSession(JSON.parse(JSON.stringify(session)), options);
    assert.equal(session.aggregateSelected, index === 2, 'the explicitly selected next page also survives restore');
  }
  const reviewing = selectHeatCapacityCalculationGroup(session, 0);
  assert.equal(getHeatCapacityCalculationNextPage(reviewing), 1);
  const reset = continueHeatCapacityCalculationAnswer(reviewing, 'group:trial-0:gamma');
  assert.equal(getHeatCapacityCalculationNextPage(reset), null);
  assert.equal(selectHeatCapacityCalculationAggregate(reset), reset, 'recalculation relocks dependent pages');
  const forgedSelection = { ...reset, selectedGroupIndex: 2 };
  assert.equal(rehydrateHeatCapacityCalculationWorkflowSession(forgedSelection, options).selectedGroupIndex, 0);
}
console.log('heatCapacityCalculationNavigation tests passed');
