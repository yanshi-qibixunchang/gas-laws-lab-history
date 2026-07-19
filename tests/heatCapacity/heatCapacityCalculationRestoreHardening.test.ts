import assert from 'node:assert/strict';
import {
  calculateHeatCapacityGroupReference,
} from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import {
  createHeatCapacityCalculationWorkflowSession,
  submitHeatCapacityCalculationStep,
  updateHeatCapacityCalculationDraft,
  type CreateHeatCapacityCalculationWorkflowSessionOptions,
  type HeatCapacityCalculationWorkflowSession,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  formatHeatCapacityCalculationReference,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';
import {
  normalizeHeatCapacityCalculationWorkflowSessionForTrials,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';

const reference = calculateHeatCapacityGroupReference({
  u0Mv: 0.1,
  u1Mv: 120.1,
  u2Mv: 40.1,
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
});
assert.notEqual(reference, null);

const authority = {
  mode: 'guide',
  groups: [{ trialId: 'guide-authoritative', reference: reference! }],
  theoreticalGamma: 1.4,
  presentation: 'interactive',
  now: 100,
} as const satisfies CreateHeatCapacityCalculationWorkflowSessionOptions;

let persisted = createHeatCapacityCalculationWorkflowSession(authority);
const firstStep = persisted.groups[0].steps[0];
const firstField = persisted.groups[0].fields.find(
  (field) => field.id === firstStep.fieldIds[0],
)!;
const correctFirstFieldRaw = formatHeatCapacityCalculationReference(
  firstField.expectedValue,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[firstField.answerKind],
);
persisted = updateHeatCapacityCalculationDraft(
  persisted,
  firstField.id,
  correctFirstFieldRaw,
);
persisted = submitHeatCapacityCalculationStep(persisted, firstStep.id, 110);

const tampered = structuredClone(persisted) as HeatCapacityCalculationWorkflowSession;
tampered.theoreticalGamma = 9.9;
tampered.groups[0].reference = {
  ...tampered.groups[0].reference,
  formulaGamma: 9.9,
  p1KPa: 999,
};
tampered.groups[0].fields[0].expectedValue = 999;
tampered.groups[0].fields[0].answer.status = 'revealed';
tampered.groups[0].fields[0].answer.referenceTone = 'danger';
tampered.groups[0].fields[0].answer.awardedRatio = 0;
tampered.groups[0].fields[0].answer.attempts[0].outcome = 'incorrect';
tampered.groups[0].fields[0].answer.attempts[0].numericCorrect = false;
tampered.groups[0].fields[0].draftRaw = 'forged-visible-answer';
tampered.status = 'completed';
tampered.activeStepId = null;
tampered.readyToExitAtMs = 111;
tampered.completedAtMs = 112;

const restored = normalizeHeatCapacityCalculationWorkflowSessionForTrials(
  tampered,
  authority,
);
assert.notEqual(restored, null);
assert.equal(restored!.theoreticalGamma, authority.theoreticalGamma);
assert.deepEqual(restored!.groups[0].reference, reference);
assert.equal(
  restored!.groups[0].fields[0].expectedValue,
  reference!.u1PrimeMv,
  'expected values must be rebuilt from the authoritative raw-data reference',
);
assert.equal(
  restored!.groups[0].fields[0].answer.status,
  'correct',
  'cached answer status and attempt verdicts must be replaced by replaying raw input',
);
assert.equal(restored!.groups[0].fields[0].answer.referenceTone, 'success');
assert.equal(restored!.groups[0].fields[0].answer.awardedRatio, 1);
assert.equal(
  restored!.groups[0].fields[0].draftRaw,
  correctFirstFieldRaw,
  'resolved input display must come from the replayed attempt, not a cached draft',
);
assert.equal(
  restored!.status,
  'in-progress',
  'session status must be derived from the first unresolved authoritative step',
);
assert.equal(restored!.activeStepId, firstStep.id);
assert.equal(restored!.readyToExitAtMs, null);
assert.equal(restored!.completedAtMs, null);

const wrongIdentity = structuredClone(persisted) as HeatCapacityCalculationWorkflowSession;
wrongIdentity.groups[0].trialId = 'forged-trial';
wrongIdentity.groups[0].fields[0].expectedValue = 999;
const rebuilt = normalizeHeatCapacityCalculationWorkflowSessionForTrials(
  wrongIdentity,
  authority,
);
assert.notEqual(rebuilt, null);
assert.equal(rebuilt!.groups[0].trialId, 'guide-authoritative');
assert.deepEqual(rebuilt!.groups[0].reference, reference);
assert.equal(rebuilt!.groups[0].fields[0].answer.attempts.length, 0);
assert.equal(rebuilt!.status, 'in-progress');

console.log('heatCapacityCalculationRestoreHardening tests passed');
