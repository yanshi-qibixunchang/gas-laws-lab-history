import assert from 'node:assert/strict';
import { calculateHeatCapacityGroupReference } from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import { calculateHeatCapacityInstrumentBudget, getHeatCapacityVoltageSensitivities } from '../../src/domain/heatCapacity/heatCapacityInstrumentUncertaintyModel.ts';
import { createDisplayedHeatCapacityGroupReference } from '../../src/domain/heatCapacity/heatCapacityCalculationPrecisionModel.ts';
import {
  createHeatCapacityCalculationWorkflowSession, rehydrateHeatCapacityCalculationWorkflowSession,
  updateHeatCapacityCalculationDraft, submitHeatCapacityCalculationStep,
  completeHeatCapacityCalculationWorkflow, continueHeatCapacityCalculationAnswer,
  type HeatCapacityCalculationWorkflowSession,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import { HEAT_CAPACITY_AB_ANSWER_RULE, HEAT_CAPACITY_TYPE_A_ANSWER_RULE, HEAT_CAPACITY_LEGACY_AB_ANSWER_RULE,
  formatHeatCapacityCalculationReference, getHeatCapacityCalculationFieldSpec,
  validateHeatCapacityCalculationAnswer } from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';
import { normalizeHeatCapacityCalculationWorkflowSessionForPersistence } from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import { projectHeatCapacityTeachingResult } from '../../src/domain/heatCapacity/heatCapacityTeachingResultProjection.ts';
import { calculateFreeHeatCapacityMeanResult } from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';

const options = { mode: 'free' as const, theoreticalGamma: 1.4, now: 100,
  groups: [[0.3,82.6,22.6],[0.3,84.1,23.7],[0.3,84.3,23.6]].map(([u0Mv,u1Mv,u2Mv], i) => ({ trialId: `trial-${i}`,
    reference: calculateHeatCapacityGroupReference({u0Mv:u0Mv!,u1Mv:u1Mv!,u2Mv:u2Mv!,atmosphericPressureKPa:101.3,pressureSensitivityMvPerKPa:20})! })) };
const fields = (s: HeatCapacityCalculationWorkflowSession) => [...s.groups.flatMap(g => g.fields), ...s.aggregate!.fields];
const solveStep = (session: HeatCapacityCalculationWorkflowSession) => {
  const step = [...session.groups.flatMap(g => g.steps), ...session.aggregate!.steps].find(s => s.id === session.activeStepId)!;
  let next = session;
  for (const id of step.fieldIds) {
    const field = fields(next).find(f => f.id === id)!;
    next = updateHeatCapacityCalculationDraft(next, id, formatHeatCapacityCalculationReference(field.expectedValue, getHeatCapacityCalculationFieldSpec(field, next.answerRule)));
  }
  next = submitHeatCapacityCalculationStep(next, step.id, 200);
  assert.ok(step.fieldIds.every(id => fields(next).find(f => f.id === id)!.answer.status === 'correct'));
  return next;
};
let session = createHeatCapacityCalculationWorkflowSession(options);
assert.equal(session.answerRule, HEAT_CAPACITY_AB_ANSWER_RULE);
assert.deepEqual(session.aggregate!.steps.map(s => s.kind), ['meanGamma','sampleStandardDeviation','typeAStandardUncertainty','typeBStandardUncertainty','combinedStandardUncertainty','batchRelativeError','finalReport']);
assert.equal(session.aggregate!.reference.voltageInstrumentStandardUncertaintyMv, 0.1);
assert.equal('voltageErrorLimitMv' in session.aggregate!.reference, false);
assert.equal('voltageTypeB' in session.aggregate!.reference, false);
assert.equal(session.aggregate!.reference.propagationCoefficient, 0.02956);
assert.equal(session.aggregate!.reference.typeBStandardUncertainty, 0.00296);
assert.equal(session.aggregate!.reference.combinedStandardUncertainty, 0.00573);
assert.equal(session.aggregate!.reference.reportCombined, 0.0057);
assert.equal(session.aggregate!.reference.reportTypeA, undefined);
assert.equal(session.aggregate!.reference.meanGamma, 1.389);
assert.equal(session.aggregate!.fields.some(f => String(f.answerKind) === 'voltageTypeB'), false, 'given standard uncertainty is not a student conversion exercise');
const bField = session.aggregate!.fields.find(f => f.answerKind === 'typeBStandardUncertainty')!;
const spec = getHeatCapacityCalculationFieldSpec(bField, session.answerRule);
assert.equal(validateHeatCapacityCalculationAnswer('0.00296', bField.expectedValue, spec).correct, true);
for (const wrong of ['0.00171','0.002956','0.003','0.002960']) assert.equal(validateHeatCapacityCalculationAnswer(wrong, bField.expectedValue, spec).correct, false);
const pendingProjection = projectHeatCapacityTeachingResult(calculateFreeHeatCapacityMeanResult([]), session);
assert.ok('combinedStandardUncertainty' in pendingProjection);
assert.equal(pendingProjection.combinedStandardUncertainty, null);

while (session.status === 'in-progress') {
  session = solveStep(session);
  // Exercise the actual decoder and authority replay after every dependency gate.
  const decoded = normalizeHeatCapacityCalculationWorkflowSessionForPersistence(JSON.parse(JSON.stringify(session)));
  assert.ok(decoded);
  const restored = rehydrateHeatCapacityCalculationWorkflowSession(decoded, options);
  assert.deepEqual(restored, session);
}
session = completeHeatCapacityCalculationWorkflow(session, 300);
const projection = projectHeatCapacityTeachingResult(calculateFreeHeatCapacityMeanResult([]), session);
assert.ok('combinedStandardUncertainty' in projection);
assert.equal(projection.voltageInstrumentStandardUncertaintyMv, 0.1);
assert.equal(projection.propagationCoefficient, 0.02956);
assert.equal(projection.combinedStandardUncertainty, 0.00573);
assert.equal(projection.reportCombined, 0.0057);
assert.equal(projection.uncertaintyScope, 'repeat-measurement-and-voltage-instrument');
const restarted = continueHeatCapacityCalculationAnswer(session, 'aggregate:typeBStandardUncertainty');
assert.equal(restarted.aggregate!.fields.find(f => f.answerKind === 'typeAStandardUncertainty')!.answer.status, 'correct');
assert.ok(restarted.aggregate!.fields.filter(f => ['typeBStandardUncertainty','combinedStandardUncertainty','reportCombined','reportMeanGamma'].includes(f.answerKind)).every(f => f.answer.status === 'unresolved'));

let old = createHeatCapacityCalculationWorkflowSession({ ...options, answerRule: HEAT_CAPACITY_TYPE_A_ANSWER_RULE });
while (old.status === 'in-progress') old = solveStep(old);
old = completeHeatCapacityCalculationWorkflow(old, 300);
const migrated = rehydrateHeatCapacityCalculationWorkflowSession(old, options);
assert.equal(migrated.uncertaintyUpgradeNotice, true);
assert.equal(migrated.activeStepId, 'aggregate:typeBStandardUncertainty');
assert.ok(migrated.groups.every(g => g.fields.every(f => f.answer.status === 'correct')));
assert.equal(migrated.aggregate!.fields.find(f => f.answerKind === 'typeAStandardUncertainty')!.answer.status, 'correct');
assert.equal(migrated.aggregate!.fields.find(f => f.answerKind === 'reportMeanGamma')!.answer.status, 'unresolved');
assert.equal(migrated.status, 'in-progress');
assert.equal(migrated.completedAtMs, null);
assert.deepEqual(rehydrateHeatCapacityCalculationWorkflowSession(migrated, options), migrated);

// A completed v4 course must not retain B answers even if a small contribution
// happened to round to the same combined result. Decode the legacy structure.
const oldInstrument = structuredClone(session);
oldInstrument.answerRule = HEAT_CAPACITY_LEGACY_AB_ANSWER_RULE;
delete oldInstrument.aggregate!.reference.voltageInstrumentStandardUncertaintyMv;
Object.assign(oldInstrument.aggregate!.reference, { voltageErrorLimitMv: 0.1, voltageTypeB: 0.0577,
  typeBStandardUncertainty: 0.00171, combinedStandardUncertainty: 0.00520, reportCombined: 0.0052 });
const legacyVoltage = { ...structuredClone(bField), id: 'aggregate:voltageTypeB', label: 'uB(U)',
  answerKind: 'voltageTypeB' as const, expectedValue: 0.0577 };
// Obsolete fields exist only in serialized fixtures, not in current course types.
(oldInstrument.aggregate!.fields as unknown[]).splice(3, 0, legacyVoltage);
(oldInstrument.aggregate!.steps as unknown[]).splice(3, 0, { id: legacyVoltage.id, kind: 'voltageTypeB', fieldIds: [legacyVoltage.id] });
const decodedV4 = normalizeHeatCapacityCalculationWorkflowSessionForPersistence(JSON.parse(JSON.stringify(oldInstrument)));
assert.ok(decodedV4);
const migratedV4 = rehydrateHeatCapacityCalculationWorkflowSession(decodedV4, options);
assert.equal(migratedV4.answerRule, HEAT_CAPACITY_AB_ANSWER_RULE);
assert.equal(migratedV4.uncertaintyUpgradeNotice, true);
assert.equal(migratedV4.activeStepId, 'aggregate:typeBStandardUncertainty');
assert.equal(migratedV4.aggregate!.fields.find(f => f.answerKind === 'typeAStandardUncertainty')!.answer.status, 'correct');
assert.ok(migratedV4.aggregate!.fields.filter(f => ['typeBStandardUncertainty','combinedStandardUncertainty','reportCombined','reportMeanGamma'].includes(f.answerKind)).every(f => f.answer.status === 'unresolved'));
assert.deepEqual(rehydrateHeatCapacityCalculationWorkflowSession(migratedV4, options), migratedV4);

for (const reason of ['ideal','environment','instrument-model','record-criteria'] as const) {
  const ineligible = createHeatCapacityCalculationWorkflowSession({ ...options,
    uncertaintyEligibility:{version:'standard-real-teaching-v1',eligible:false,reason} });
  assert.deepEqual(ineligible.aggregate!.steps.map(s => s.kind), ['meanGamma','batchRelativeError']);
  assert.equal(ineligible.aggregate!.reference.propagationCoefficient, undefined);
}

// Independent finite differences of the log equation: perturb each public raw
// voltage, including the common U0 operand in both corrected pressures.
for (const input of [ [0.3,82.6,22.6], [0,110,30.4], [-0.2,140.4,40.1], [0,0.3,0.1] ]) {
  const ref = createDisplayedHeatCapacityGroupReference(calculateHeatCapacityGroupReference({u0Mv:input[0]!,u1Mv:input[1]!,u2Mv:input[2]!,atmosphericPressureKPa:101.3,pressureSensitivityMvPerKPa:20})!, true);
  const coeffs = getHeatCapacityVoltageSensitivities(ref);
  const evaluate = (offsets: number[]) => {
    const p1=ref.p1KPa+(offsets[1]!-offsets[0]!)/20, p2=ref.p2KPa+(offsets[2]!-offsets[0]!)/20;
    return Math.log(p1/ref.p0KPa)/Math.log(p1/p2);
  };
  for (let j=0;j<3;j++) {
    const delta=0.0001, plus=[0,0,0], minus=[0,0,0]; plus[j]=delta; minus[j]=-delta;
    const numeric=(evaluate(plus)-evaluate(minus))/(2*delta);
    assert.ok(Math.abs(numeric-coeffs[j]!) < Math.max(1e-7,Math.abs(coeffs[j]!)*1e-6));
  }
  const budget=calculateHeatCapacityInstrumentBudget([ref,ref,ref],ref.formulaGamma,0);
  assert.equal(budget.propagationCoefficient, Number(Math.hypot(...coeffs).toPrecision(4)), 'shared instrument effects do not shrink with three identical repeats');
  assert.ok(budget.typeBStandardUncertainty > 0);
  assert.equal(budget.combinedStandardUncertainty, budget.typeBStandardUncertainty, 'zero A remains accepted while instrument B is retained');
}
assert.throws(() => calculateHeatCapacityInstrumentBudget([],1.4,0));
const publicGroups = options.groups.map(g => createDisplayedHeatCapacityGroupReference(g.reference, true));
const tieUp = calculateHeatCapacityInstrumentBudget(publicGroups, 1.389, 0.0111);
assert.equal(tieUp.combinedStandardUncertainty, 0.0115);
assert.equal(tieUp.reportCombined, 0.012);
const tieDown = calculateHeatCapacityInstrumentBudget(publicGroups, 1.389, 0.00727);
assert.equal(tieDown.combinedStandardUncertainty, 0.00785);
assert.equal(tieDown.reportCombined, 0.0078);
assert.throws(() => getHeatCapacityVoltageSensitivities({ ...options.groups[0]!.reference, p2KPa:0 }));
console.log('heatCapacityTypeBCourse tests passed');
