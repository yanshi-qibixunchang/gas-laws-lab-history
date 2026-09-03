import assert from 'node:assert/strict';
import {
  completeHeatCapacityCalculationWorkflowWorkbenchState,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  completeHeatCapacityTeachingModeWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  continueHeatCapacityCalculationAnswerWorkbenchState,
  createDefaultHeatCapacityFile,
  ensureHeatCapacityCalculationSessionWorkbenchState,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityCalculationSession,
  revealHeatCapacityCalculationAnswerWorkbenchState,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  submitHeatCapacityCalculationStepWorkbenchState,
  updateHeatCapacityCalculationDraftWorkbenchState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createHeatCapacityGuideTrial,
  recordGuideU0,
  recordGuideU1,
  recordGuideU2,
} from '../../src/domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import {
  calculateFreeHeatCapacityTrialSignals,
  createHeatCapacityFreeBatchTrial,
  type HeatCapacityFreeRecord,
  type HeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  allocateHeatCapacityFreeTrialIdentity,
  completeHeatCapacityFreeBatchExperiment,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  formatHeatCapacityCalculationReference,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';
import {
  beginHeatCapacityFreeIdealGroupCalculation,
  selectCurrentHeatCapacityFreeExperimentGroup,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';

const guideRecord = (
  displayPressureMv: number,
  atS: number,
) => ({
  atS,
  displayPressureMv,
  displayTemperatureMv: 0,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
});

let guideTrial = createHeatCapacityGuideTrial('guide-calculation');
guideTrial = recordGuideU0(guideTrial, guideRecord(0, 1));
guideTrial = recordGuideU1(guideTrial, guideRecord(120, 2));
guideTrial = recordGuideU2(guideTrial, guideRecord(50, 3), 100, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
});

let guideFile = completeHeatCapacityTeachingModeWorkbenchState({
  ...createDefaultHeatCapacityFile(1),
  heatCapacityMode: 'guide',
  heatCapacityGuideTrial: guideTrial,
}, 100);
let guideSession = getHeatCapacityCalculationSession(guideFile);
assert.equal(guideSession?.mode, 'guide');
assert.equal(guideSession?.status, 'in-progress');
assert.equal(guideSession?.activeStepId?.endsWith(':correctedVoltages'), true);

const firstStep = guideSession!.groups[0].steps[0];
const firstField = guideSession!.groups[0].fields.find((field) => (
  field.id === firstStep.fieldIds[0]
))!;
const secondField = guideSession!.groups[0].fields.find((field) => (
  field.id === firstStep.fieldIds[1]
))!;
const secondAnswer = formatHeatCapacityCalculationReference(
  secondField.expectedValue,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[secondField.answerKind],
);
guideFile = updateHeatCapacityCalculationDraftWorkbenchState(
  guideFile,
  firstField.id,
  '999.9',
  101,
);
guideFile = updateHeatCapacityCalculationDraftWorkbenchState(
  guideFile,
  secondField.id,
  secondAnswer,
  102,
);
guideFile = submitHeatCapacityCalculationStepWorkbenchState(
  guideFile,
  firstStep.id,
  103,
);
guideSession = getHeatCapacityCalculationSession(guideFile);
assert.notEqual(
  guideSession!.groups[0].fields.find((field) => field.id === firstField.id)!.feedback,
  null,
);
assert.equal(
  guideSession!.groups[0].fields.find((field) => field.id === secondField.id)!.answer.status,
  'correct',
  'two-input steps grade each blank independently',
);

guideFile = continueHeatCapacityCalculationAnswerWorkbenchState(
  guideFile,
  firstField.id,
  104,
);
const firstAnswer = formatHeatCapacityCalculationReference(
  firstField.expectedValue,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[firstField.answerKind],
);
guideFile = updateHeatCapacityCalculationDraftWorkbenchState(
  guideFile,
  firstField.id,
  firstAnswer,
  105,
);
guideFile = submitHeatCapacityCalculationStepWorkbenchState(
  guideFile,
  firstStep.id,
  106,
);
guideSession = getHeatCapacityCalculationSession(guideFile);
assert.equal(
  guideSession!.groups[0].fields.find((field) => field.id === firstField.id)!.answer.awardedRatio,
  0.6,
  'a numeric correction earns 60% after a later correct answer',
);

while (getHeatCapacityCalculationSession(guideFile)?.status === 'in-progress') {
  const session = getHeatCapacityCalculationSession(guideFile)!;
  const stepId = session.activeStepId!;
  const step = session.groups[0].steps.find((candidate) => candidate.id === stepId)!;
  for (const fieldId of step.fieldIds) {
    guideFile = updateHeatCapacityCalculationDraftWorkbenchState(
      guideFile,
      fieldId,
      '',
      110,
    );
  }
  guideFile = submitHeatCapacityCalculationStepWorkbenchState(guideFile, stepId, 111);
  for (const fieldId of step.fieldIds) {
    const field = getHeatCapacityCalculationSession(guideFile)!
      .groups[0].fields.find((candidate) => candidate.id === fieldId);
    if (field?.feedback) {
      guideFile = revealHeatCapacityCalculationAnswerWorkbenchState(
        guideFile,
        fieldId,
        112,
      );
    }
  }
}
assert.equal(getHeatCapacityCalculationSession(guideFile)?.status, 'ready-to-exit');
guideFile = completeHeatCapacityCalculationWorkflowWorkbenchState(guideFile, 120);
assert.equal(getHeatCapacityCalculationSession(guideFile)?.status, 'completed');

const makeFreeRecord = (
  displayPressureMv: number,
  atS: number,
): HeatCapacityFreeRecord => ({
  ...guideRecord(displayPressureMv, atS),
  source: 'user',
  phaseAtRecord: null,
  traceTrialId: null,
  traceBranchId: null,
  traceSampleId: null,
  eventId: null,
});

let freeFile = configureHeatCapacityFreeBatchWorkbenchState(
  createDefaultHeatCapacityFile(2),
  3,
  200,
);
freeFile = freezeHeatCapacityFreeParametersForCurrentGroup(freeFile, 201);
const snapshot = freeFile.heatCapacityFreeRunWorkspace.batch.frozenConfigSnapshot!;
let allocatedBatch = freeFile.heatCapacityFreeRunWorkspace.batch;
const freeTrials = [0, 1, 2].map((index): HeatCapacityFreeTrial => {
  const allocation = allocateHeatCapacityFreeTrialIdentity(allocatedBatch);
  assert.ok(allocation);
  allocatedBatch = allocation.batch;
  const base = {
    ...createHeatCapacityFreeBatchTrial(allocation.identity),
    u0: makeFreeRecord(0, 1),
    u1: makeFreeRecord(120 + index * 2, 2),
    u2: makeFreeRecord(50 + index, 3),
    configSnapshot: snapshot,
    completedAtMs: 210 + index,
  };
  return {
    ...base,
    correctedSignals: calculateFreeHeatCapacityTrialSignals(base, {
      atmosphericPressureKPa: snapshot.environment.ambientPressureKPa,
      pressureSensitivityMvPerKPa: snapshot.sensor.pressureMvPerKPa,
      theoreticalGamma: snapshot.physics.gamma,
    }),
  };
});
freeFile = storeHeatCapacityFreeRuntimeFieldsInDomain({
  ...freeFile,
  heatCapacityFreeRunWorkspace: {
    ...freeFile.heatCapacityFreeRunWorkspace,
    trials: freeTrials,
    batch: completeHeatCapacityFreeBatchExperiment(allocatedBatch, 220),
  },
}, 'real');
freeFile = ensureHeatCapacityCalculationSessionWorkbenchState(freeFile, 221);
const freeSession = getHeatCapacityCalculationSession(freeFile);
assert.equal(freeSession?.mode, 'free');
assert.equal(freeSession?.groups.length, 3);
assert.equal(freeSession?.aggregate?.reference.count, 3);
assert.equal(freeSession?.status, 'in-progress');

let idealFile = setHeatCapacityFreeParameterSchemeWorkbenchState(
  createDefaultHeatCapacityFile(3),
  'ideal',
  300,
);
idealFile = applyHeatCapacityFreeParameterDraftWorkbenchState(idealFile, {
  ...idealFile.heatCapacityFreeParameterDraft,
  gasType: 'helium',
}, 301);
idealFile = configureHeatCapacityFreeBatchWorkbenchState(idealFile, 3, 302);
idealFile = freezeHeatCapacityFreeParametersForCurrentGroup(idealFile, 303);
const idealSnapshot = idealFile.heatCapacityFreeRunWorkspace.batch.frozenConfigSnapshot!;
let idealBatch = idealFile.heatCapacityFreeRunWorkspace.batch;
const idealTrials = [0, 1, 2].map((index): HeatCapacityFreeTrial => {
  const allocation = allocateHeatCapacityFreeTrialIdentity(idealBatch);
  assert.ok(allocation);
  idealBatch = allocation.batch;
  const base = {
    ...createHeatCapacityFreeBatchTrial(allocation.identity, null, 'ideal'),
    u0: makeFreeRecord(0, 1),
    u1: makeFreeRecord(120 + index * 2, 2),
    u2: makeFreeRecord(50 + index, 3),
    configSnapshot: idealSnapshot,
    completedAtMs: 310 + index,
  };
  return {
    ...base,
    correctedSignals: calculateFreeHeatCapacityTrialSignals(base, {
      atmosphericPressureKPa: idealSnapshot.environment.ambientPressureKPa,
      pressureSensitivityMvPerKPa: idealSnapshot.sensor.pressureMvPerKPa,
      theoreticalGamma: idealSnapshot.physics.gamma,
    }),
  };
});
idealFile = storeHeatCapacityFreeRuntimeFieldsInDomain({
  ...idealFile,
  heatCapacityFreeRunWorkspace: {
    ...idealFile.heatCapacityFreeRunWorkspace,
    trials: idealTrials,
    batch: completeHeatCapacityFreeBatchExperiment(idealBatch, 320),
  },
}, 'ideal');
idealFile = ensureHeatCapacityCalculationSessionWorkbenchState(idealFile, 321);
const idealCalculationSession = getHeatCapacityCalculationSession(idealFile);
assert.equal(idealCalculationSession?.theoreticalGamma, 5 / 3);
assert.equal(idealCalculationSession?.presentation, 'interactive');
idealFile = {
  ...idealFile,
  heatCapacityFreeExperimentGroups: beginHeatCapacityFreeIdealGroupCalculation(
    idealFile.heatCapacityFreeExperimentGroups,
    idealCalculationSession!,
    322,
  ),
};
assert.equal(
  selectCurrentHeatCapacityFreeExperimentGroup(
    idealFile.heatCapacityFreeExperimentGroups,
  )?.status,
  'awaiting-ideal-calculation',
);
while (getHeatCapacityCalculationSession(idealFile)?.status === 'in-progress') {
  const session = getHeatCapacityCalculationSession(idealFile)!;
  const stepId = session.activeStepId!;
  const step = [
    ...session.groups.flatMap((group) => group.steps),
    ...(session.aggregate?.steps ?? []),
  ].find((candidate) => candidate.id === stepId)!;
  idealFile = submitHeatCapacityCalculationStepWorkbenchState(idealFile, stepId, 330);
  for (const fieldId of step.fieldIds) {
    const currentSession = getHeatCapacityCalculationSession(idealFile)!;
    const field = [
      ...currentSession.groups.flatMap((group) => group.fields),
      ...(currentSession.aggregate?.fields ?? []),
    ].find((candidate) => candidate.id === fieldId);
    if (field?.feedback) {
      idealFile = revealHeatCapacityCalculationAnswerWorkbenchState(
        idealFile,
        fieldId,
        331,
      );
    }
  }
}
assert.equal(getHeatCapacityCalculationSession(idealFile)?.status, 'ready-to-exit');
idealFile = completeHeatCapacityCalculationWorkflowWorkbenchState(idealFile, 340);
const completedIdealGroup = selectCurrentHeatCapacityFreeExperimentGroup(
  idealFile.heatCapacityFreeExperimentGroups,
);
assert.equal(completedIdealGroup?.status, 'completed');
assert.equal(completedIdealGroup?.calculation?.kind, 'ideal-interactive');
assert.equal(completedIdealGroup?.finalScore, null, 'Ideal manual calculations must remain unscored');

console.log('workbenchHeatCapacityCalculationIntegration tests passed');
