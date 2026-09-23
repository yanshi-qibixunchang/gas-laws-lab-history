import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  completeHeatCapacityTeachingModeWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityFreeBatchProgress,
  powerHeatCapacityWorkbenchFile,
  prepareNextHeatCapacityFreeExperimentWorkbenchState,
  restartCurrentHeatCapacityFreeExperimentWorkbenchState,
  selectHeatCapacityFreeAppliedParameterDraft,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  completeHeatCapacityCalculationWorkflowWorkbenchState,
  continueHeatCapacityCalculationAnswerWorkbenchState,
  getHeatCapacityCalculationSession,
  revealHeatCapacityCalculationAnswerWorkbenchState,
  startHeatCapacityFreeBatchCalculationWorkbenchState,
  submitHeatCapacityCalculationStepWorkbenchState,
  updateHeatCapacityCalculationDraftWorkbenchState,
} from '../../src/features/workbench/workbenchHeatCapacityCalculationCoordinator.ts';
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
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  formatHeatCapacityCalculationReference,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';
import {
  selectCurrentHeatCapacityFreeExperimentGroup,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import { createCompleteProcessReviewFixtureParts } from './helpers/heatCapacityProcessReviewTestFactory.ts';
import { createHeatCapacityFreeStandardReference } from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import { createHeatCapacityCalculationWorkflowSession, submitHeatCapacityCalculationStep,
  revealHeatCapacityCalculationWorkflowAnswer, completeHeatCapacityCalculationWorkflow,
  type HeatCapacityCalculationWorkflowSession } from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';

const standardParts = createCompleteProcessReviewFixtureParts();
const standardReference = createHeatCapacityFreeStandardReference({
  traceTrial: standardParts.traceTrial, trial: standardParts.trial, theoreticalGamma: 1.4,
});

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

const revealRemainingCalculationAnswers = (
  sourceFile: WorkbenchHeatCapacityState,
  now: number,
): WorkbenchHeatCapacityState => {
  let file = sourceFile;
  while (getHeatCapacityCalculationSession(file)?.status === 'in-progress') {
    const session = getHeatCapacityCalculationSession(file)!;
    const stepId = session.activeStepId!;
    const step = [
      ...session.groups.flatMap((group) => group.steps),
      ...(session.aggregate?.steps ?? []),
    ].find((candidate) => candidate.id === stepId)!;
    file = submitHeatCapacityCalculationStepWorkbenchState(file, stepId, now);
    for (const fieldId of step.fieldIds) {
      const currentSession = getHeatCapacityCalculationSession(file)!;
      const field = [
        ...currentSession.groups.flatMap((group) => group.fields),
        ...(currentSession.aggregate?.fields ?? []),
      ].find((candidate) => candidate.id === fieldId);
      if (field?.feedback) {
        file = revealHeatCapacityCalculationAnswerWorkbenchState(
          file,
          fieldId,
          now + 1,
        );
      }
    }
  }
  return file;
};

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
    standardReferenceSnapshot: standardReference,
    preheatOutcome: 'completed' as const,
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
// Restart after U2 (before power-off) must discard only this attempt, retaining
// every earlier record/trace. Completing a replacement third trial must then
// unlock the same three-trial calculation and review data.
const savedTrace = { ...standardParts.traceTrial, id: 'saved-trace-1' };
const discardedTrace = { ...standardParts.traceTrial, id: 'discarded-trace-2' };
let restartedFlow = restartCurrentHeatCapacityFreeExperimentWorkbenchState({
  ...freeFile,
  powerOn: true,
  heatCapacityFreeRunWorkspace: {
    ...freeFile.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'completed',
    batch: allocatedBatch,
    trials: [{ ...freeTrials[0]!, traceTrialId: savedTrace.id },
      { ...freeTrials[1]!, traceTrialId: discardedTrace.id, completedAtMs: null }],
    traceStore: { ...standardParts.traceStore, activeTraceTrialId: discardedTrace.id,
      traceTrials: [savedTrace, discardedTrace] },
  },
}, 215);
assert.equal(getHeatCapacityFreeBatchProgress(restartedFlow).completedGroupCount, 1);
assert.deepEqual(restartedFlow.heatCapacityFreeRunWorkspace.traceStore.traceTrials.map(t => t.id), [savedTrace.id]);
for (const index of [1, 2]) {
  const trace = { ...standardParts.traceTrial, id: `replacement-trace-${index}` };
  const before = restartedFlow.heatCapacityFreeRunWorkspace;
  restartedFlow = powerHeatCapacityWorkbenchFile({
    ...restartedFlow, powerOn: true,
    heatCapacityFreeRunWorkspace: {
      ...before, currentExperimentStatus: 'completed',
      trials: [...before.trials, { ...freeTrials[index]!, traceTrialId: trace.id, completedAtMs: null }],
      traceStore: { ...before.traceStore, activeTraceTrialId: trace.id,
        traceTrials: [...before.traceStore.traceTrials, trace] },
    },
  }, false, 216 + index);
  assert.equal(getHeatCapacityFreeBatchProgress(restartedFlow).completedGroupCount, index + 1);
  assert.equal(restartedFlow.heatCapacityFreeRunWorkspace.traceStore.traceTrials.length, index + 1);
  if (index === 1) restartedFlow = prepareNextHeatCapacityFreeExperimentWorkbenchState(restartedFlow, 218);
}
assert.equal(getHeatCapacityFreeBatchProgress(restartedFlow).allGroupsRecorded, true);
assert.equal(getHeatCapacityCalculationSession(restartedFlow)?.status, 'in-progress');
assert.equal(getHeatCapacityCalculationSession(restartedFlow)?.groups.length, 3);

freeFile = storeHeatCapacityFreeRuntimeFieldsInDomain({
  ...freeFile,
  heatCapacityFreeRunWorkspace: {
    ...freeFile.heatCapacityFreeRunWorkspace,
    trials: freeTrials,
    batch: allocatedBatch,
  },
}, 'real');
freeFile = startHeatCapacityFreeBatchCalculationWorkbenchState(freeFile, 220);
const freeSession = getHeatCapacityCalculationSession(freeFile);
assert.equal(freeSession?.uncertaintyEligibility?.eligible, true);
assert.ok(freeSession?.aggregate?.fields.some(field => field.answerKind === 'typeAStandardUncertainty'));
assert.equal(freeSession?.mode, 'free');
assert.equal(freeSession?.groups.length, 3);
assert.equal(freeSession?.aggregate?.reference.count, 3);
assert.equal(freeSession?.status, 'in-progress');
assert.equal(
  selectCurrentHeatCapacityFreeExperimentGroup(
    freeFile.heatCapacityFreeExperimentGroups,
  )?.status,
  'awaiting-real-calculation',
);
freeFile = revealRemainingCalculationAnswers(freeFile, 230);
assert.equal(getHeatCapacityCalculationSession(freeFile)?.status, 'ready-to-exit');
freeFile = completeHeatCapacityCalculationWorkflowWorkbenchState(freeFile, 240);
const realGroupWithoutTraceEvidence = selectCurrentHeatCapacityFreeExperimentGroup(
  freeFile.heatCapacityFreeExperimentGroups,
);
assert.equal(realGroupWithoutTraceEvidence?.status, 'awaiting-real-calculation');
assert.equal(realGroupWithoutTraceEvidence?.calculation?.kind, 'real-interactive');
assert.equal(
  realGroupWithoutTraceEvidence?.finalScore,
  null,
  'Real calculation completion must not invent a score when trace evidence is missing',
);

let idealFile = setHeatCapacityFreeParameterSchemeWorkbenchState(
  createDefaultHeatCapacityFile(3),
  'ideal',
  300,
);
idealFile = applyHeatCapacityFreeParameterDraftWorkbenchState(idealFile, {
  ...selectHeatCapacityFreeAppliedParameterDraft(idealFile),
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
    standardReferenceSnapshot: standardReference,
    preheatOutcome: 'completed' as const,
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
    batch: idealBatch,
  },
}, 'ideal');
idealFile = startHeatCapacityFreeBatchCalculationWorkbenchState(idealFile, 320);
const idealCalculationSession = getHeatCapacityCalculationSession(idealFile);
assert.equal(idealCalculationSession?.uncertaintyEligibility?.reason, 'ideal');
assert.deepEqual(idealCalculationSession?.aggregate?.fields.map(field => field.answerKind), ['meanGamma', 'relativeErrorPercent']);
assert.equal(idealCalculationSession?.theoreticalGamma, 5 / 3);
assert.equal(idealCalculationSession?.presentation, 'interactive');
assert.equal(
  selectCurrentHeatCapacityFreeExperimentGroup(
    idealFile.heatCapacityFreeExperimentGroups,
  )?.status,
  'awaiting-ideal-calculation',
);
idealFile = revealRemainingCalculationAnswers(idealFile, 330);
assert.equal(getHeatCapacityCalculationSession(idealFile)?.status, 'ready-to-exit');
idealFile = completeHeatCapacityCalculationWorkflowWorkbenchState(idealFile, 340);
const completedIdealGroup = selectCurrentHeatCapacityFreeExperimentGroup(
  idealFile.heatCapacityFreeExperimentGroups,
);
assert.equal(completedIdealGroup?.status, 'completed');
assert.equal(completedIdealGroup?.calculation?.kind, 'ideal-interactive');
assert.equal(completedIdealGroup?.finalScore, null, 'Ideal manual calculations must remain unscored');

const { projectWorkbenchPersistenceV3File, reprojectWorkbenchPersistenceV3File } = await import('../../src/features/workbench/persistenceV3/projection.ts');
const { encodeWorkbenchPersistenceV3FileProjection, decodeWorkbenchPersistenceV3FileRecord } = await import('../../src/features/workbench/persistenceV3/codecRegistry.ts');
for (const file of [freeFile, idealFile]) {
  const projected = projectWorkbenchPersistenceV3File(file);
  assert.ok(projected.ok, JSON.stringify(projected.ok ? null : projected.diagnostics));
  if (!projected.ok) throw new Error('projection failed');
  const encoded = encodeWorkbenchPersistenceV3FileProjection(projected.value);
  assert.ok(encoded.ok);
  if (!encoded.ok) throw new Error('encode failed');
  const decoded = decodeWorkbenchPersistenceV3FileRecord(encoded.value);
  assert.ok(decoded.ok, JSON.stringify(decoded.ok ? null : decoded.diagnostics));
  if (!decoded.ok) throw new Error('decode failed');
  const reopened = reprojectWorkbenchPersistenceV3File(decoded.value);
  assert.ok(reopened.ok);
  if (!reopened.ok || reopened.value.kind !== 'heatCapacity') throw new Error('restore failed');
  assert.deepEqual(getHeatCapacityCalculationSession(reopened.value), getHeatCapacityCalculationSession(file));
  const oldARecord = structuredClone(encoded.value);
  const replaceWithOldA = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const item = value as Record<string, unknown>;
    if (item.answerRule === 'free-ab-given-standard-half-even-v5') {
      const current = item as unknown as HeatCapacityCalculationWorkflowSession;
      let old = createHeatCapacityCalculationWorkflowSession({ ...current, now: current.startedAtMs,
        answerRule: 'free-type-a-half-even-v3' });
      while (old.status === 'in-progress') {
        const step = [...old.groups.flatMap(g => g.steps), ...old.aggregate!.steps].find(s => s.id === old.activeStepId)!;
        old = submitHeatCapacityCalculationStep(old, step.id, current.readyToExitAtMs!);
        for (const id of step.fieldIds) old = revealHeatCapacityCalculationWorkflowAnswer(old, id, current.readyToExitAtMs!);
      }
      old = completeHeatCapacityCalculationWorkflow(old, current.completedAtMs!);
      Object.assign(item, old);
      return;
    }
    Object.values(item).forEach(replaceWithOldA);
  };
  replaceWithOldA(oldARecord);
  const aDecoded = decodeWorkbenchPersistenceV3FileRecord(oldARecord);
  assert.ok(aDecoded.ok, JSON.stringify(aDecoded.ok ? null : aDecoded.diagnostics));
  if (!aDecoded.ok) throw new Error('A-only migration failed');
  const aReopened = reprojectWorkbenchPersistenceV3File(aDecoded.value);
  assert.ok(aReopened.ok);
  if (!aReopened.ok || aReopened.value.kind !== 'heatCapacity') throw new Error('A-only restore failed');
  const migratedA = getHeatCapacityCalculationSession(aReopened.value)!;
  if (file === freeFile) {
    assert.equal(migratedA.activeStepId, 'aggregate:typeBStandardUncertainty');
    assert.equal(migratedA.uncertaintyUpgradeNotice, true);
    assert.ok(migratedA.groups.every(g => g.fields.every(f => f.answer.status === 'revealed')));
  } else assert.equal(migratedA.status, 'completed', 'ideal course should not gain uncertainty tasks');
  assert.ok(projectWorkbenchPersistenceV3File(aReopened.value).ok, 'A-only upgrades must remain saveable');
  const oldRuleRecord = structuredClone(encoded.value);
  const downgradeRule = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const item = value as Record<string, unknown>;
    if (item.answerRule === 'free-ab-given-standard-half-even-v5') item.answerRule = 'strict-half-even-v2';
    Object.values(item).forEach(downgradeRule);
  };
  downgradeRule(oldRuleRecord);
  const oldDecoded = decodeWorkbenchPersistenceV3FileRecord(oldRuleRecord);
  assert.ok(oldDecoded.ok, JSON.stringify(oldDecoded.ok ? null : oldDecoded.diagnostics));
  if (!oldDecoded.ok) throw new Error('old completed course migration failed');
  const oldReopened = reprojectWorkbenchPersistenceV3File(oldDecoded.value);
  assert.ok(oldReopened.ok);
  if (!oldReopened.ok || oldReopened.value.kind !== 'heatCapacity') throw new Error('old course restore failed');
  const resetSession = getHeatCapacityCalculationSession(oldReopened.value)!;
  assert.equal(resetSession.recalculationNotice, true);
  assert.equal(resetSession.status, 'in-progress');
  assert.ok([...resetSession.groups.flatMap(group => group.fields), ...resetSession.aggregate!.fields]
    .every(field => field.answer.status === 'unresolved'));
  const resaved = projectWorkbenchPersistenceV3File(oldReopened.value);
  assert.ok(resaved.ok, 'migrated completed records must remain saveable');
  // Older files have no eligibility metadata; a persisted flag is never authority.
  for (const forged of [false, true]) {
    const legacy = structuredClone(encoded.value);
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const item = value as Record<string, unknown>;
      if ('uncertaintyEligibility' in item) {
        if (forged) item.uncertaintyEligibility = { version: 'standard-real-teaching-v1', eligible: false, reason: 'ideal' };
        else delete item.uncertaintyEligibility;
      }
      Object.values(item).forEach(visit);
    };
    visit(legacy);
    const migrated = decodeWorkbenchPersistenceV3FileRecord(legacy);
    assert.ok(migrated.ok, JSON.stringify(migrated.ok ? null : migrated.diagnostics));
    if (!migrated.ok) throw new Error('legacy scope migration failed');
    assert.deepEqual(migrated.value.fields.authoritative, decoded.value.fields.authoritative);
  }
}

console.log('workbenchHeatCapacityCalculationIntegration tests passed');
