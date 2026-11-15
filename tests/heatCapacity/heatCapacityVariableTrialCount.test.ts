import assert from 'node:assert/strict';
import {
  createEmptyHeatCapacityFreeExperimentGroupCollection,
  createHeatCapacityFreeExperimentGroupDraft,
  selectCurrentHeatCapacityFreeExperimentGroup,
  startHeatCapacityFreeExperimentGroup,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  allocateHeatCapacityFreeTrialIdentity,
  deriveHeatCapacityFreeBatchProgress,
  shouldStartHeatCapacityFreeBatchCalculation,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import { createDefaultFreeConfigSnapshot } from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import { createHeatCapacityFreeBatchTrial, type HeatCapacityFreeTrial } from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { calculateHeatCapacityGroupReference } from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import { calculateHeatCapacityInstrumentBudget } from '../../src/domain/heatCapacity/heatCapacityInstrumentUncertaintyModel.ts';
import {
  createHeatCapacityCalculationWorkflowSession,
  submitHeatCapacityCalculationStep,
  updateHeatCapacityCalculationDraft,
  type HeatCapacityCalculationWorkflowSession,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  HEAT_CAPACITY_AB_ANSWER_RULE,
  HEAT_CAPACITY_VARIABLE_COUNT_AB_ANSWER_RULE,
  formatHeatCapacityCalculationReference,
  getHeatCapacityCalculationFieldSpec,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';
import {
  normalizeHeatCapacityCalculationWorkflowSessionForTrials,
  normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import { roundSignificantFiguresHalfEven } from '../../src/domain/calculation/decimalHalfEven.ts';

const fields = (session: HeatCapacityCalculationWorkflowSession) => [
  ...session.groups.flatMap(group => group.fields), ...session.aggregate!.fields,
];
const solveStep = (initial: HeatCapacityCalculationWorkflowSession) => {
  let session = initial;
  const step = [...session.groups.flatMap(group => group.steps), ...session.aggregate!.steps]
    .find(candidate => candidate.id === session.activeStepId)!;
  assert.ok(step);
  for (const id of step.fieldIds) {
    const field = fields(session).find(candidate => candidate.id === id)!;
    session = updateHeatCapacityCalculationDraft(session, id, formatHeatCapacityCalculationReference(
      field.expectedValue, getHeatCapacityCalculationFieldSpec(field, session.answerRule),
    ));
  }
  session = submitHeatCapacityCalculationStep(session, step.id, 300);
  assert.ok(step.fieldIds.every(id => fields(session).find(field => field.id === id)!.answer.status === 'correct'));
  return session;
};

for (const scheme of ['real', 'ideal'] as const) for (const gasType of ['air', 'helium'] as const) {
  for (const count of [3, 4, 5, 8, 12]) {
    const theoreticalGamma = gasType === 'air' ? 1.4 : 5 / 3;
    const baseSnapshot = createDefaultFreeConfigSnapshot();
    const snapshot = { ...baseSnapshot, physics: { ...baseSnapshot.physics, gamma: theoreticalGamma } };
    let collection = createHeatCapacityFreeExperimentGroupDraft(createEmptyHeatCapacityFreeExperimentGroupCollection(), {
      id: `${scheme}-${gasType}-${count}`, scheme, gasType, targetExperimentCount: count, now: 100,
    });
    // Both the collection count and its nested batch must survive the save decoder.
    assert.deepEqual(normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence(JSON.parse(JSON.stringify(collection))), collection);
    collection = startHeatCapacityFreeExperimentGroup(collection, snapshot, 200);
    assert.deepEqual(normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence(JSON.parse(JSON.stringify(collection))), collection);
    let batch = selectCurrentHeatCapacityFreeExperimentGroup(collection)!.runSeries.batch;
    const trials: HeatCapacityFreeTrial[] = [];
    for (let index = 0; index < count; index++) {
      const allocation = allocateHeatCapacityFreeTrialIdentity(batch);
      assert.ok(allocation);
      batch = allocation.batch;
      trials.push({
        ...createHeatCapacityFreeBatchTrial(allocation.identity), parameterScheme: scheme,
        u1: { displayPressureMv: 110 } as HeatCapacityFreeTrial['u1'],
        u2: { displayPressureMv: 31 } as HeatCapacityFreeTrial['u2'],
        correctedSignals: { gamma: theoreticalGamma } as HeatCapacityFreeTrial['correctedSignals'],
        completedAtMs: 210 + index,
      });
      const progress = deriveHeatCapacityFreeBatchProgress(batch, trials);
      assert.equal(progress.completedGroupCount, index + 1);
      assert.equal(progress.targetGroupCount, count);
      assert.equal(progress.allGroupsRecorded, index + 1 === count);
      assert.equal(shouldStartHeatCapacityFreeBatchCalculation(batch, trials, false), index + 1 === count);
    }
    const options = {
      mode: 'free' as const, theoreticalGamma, now: 200,
      uncertaintyEligibility: { version: 'standard-real-teaching-v1' as const, eligible: scheme === 'real', reason: scheme === 'ideal' ? 'ideal' as const : 'eligible' as const },
      groups: trials.map((trial, index) => ({ trialId: trial.id, reference: calculateHeatCapacityGroupReference({
        u0Mv: 0.3, u1Mv: 110 + index, u2Mv: (gasType === 'air' ? 31 : 44) + index * 0.4,
        atmosphericPressureKPa: 101.3, pressureSensitivityMvPerKPa: 20,
      })! })),
    };
    let session = createHeatCapacityCalculationWorkflowSession(options);
    assert.equal(session.answerRule, count === 3 ? HEAT_CAPACITY_AB_ANSWER_RULE : HEAT_CAPACITY_VARIABLE_COUNT_AB_ANSWER_RULE);
    const statistics = session.aggregate!.reference;
    assert.equal(statistics.count, count);
    if (scheme === 'real') {
      assert.ok(session.aggregate!.steps.some(step => step.kind === 'combinedStandardUncertainty'));
      assert.equal(statistics.sampleStandardDeviation, roundSignificantFiguresHalfEven(Math.sqrt(statistics.sumSquaredDeviations! / (count - 1)), 3));
      assert.equal(statistics.typeAStandardUncertainty, roundSignificantFiguresHalfEven(statistics.sampleStandardDeviation / Math.sqrt(count), 3));
      const identical = Array.from({ length: count }, () => session.groups[0]!.reference);
      assert.equal(calculateHeatCapacityInstrumentBudget(identical, statistics.meanGamma, 0).typeBStandardUncertainty,
        calculateHeatCapacityInstrumentBudget(identical.slice(0, 3), statistics.meanGamma, 0).typeBStandardUncertainty);
    } else {
      assert.deepEqual(session.aggregate!.steps.map(step => step.kind), ['meanGamma', 'batchRelativeError']);
    }
    for (let step = 0; session.status === 'in-progress' && step < count * 3 + 10; step++) {
      session = solveStep(session);
      const restored = normalizeHeatCapacityCalculationWorkflowSessionForTrials(JSON.parse(JSON.stringify(session)), options);
      assert.deepEqual(restored, session, `${scheme}/${gasType}/${count}: calculation progress must survive reopening`);
      session = restored!;
    }
    assert.equal(session.status, 'ready-to-exit');

    if (count === 4) {
      const legacy = solveStep(createHeatCapacityCalculationWorkflowSession({ ...options, answerRule: HEAT_CAPACITY_AB_ANSWER_RULE }));
      assert.deepEqual(legacy.aggregate!.steps.map(step => step.kind), ['meanGamma', 'batchRelativeError']);
      assert.deepEqual(normalizeHeatCapacityCalculationWorkflowSessionForTrials(JSON.parse(JSON.stringify(legacy)), options), legacy,
        'saved multi-trial groups retain their original course and completed answers');
    }
  }
}
console.log('Variable trial count: four experiment states, 3/4/5/8/12 trials, calculation and save/restore passed');
