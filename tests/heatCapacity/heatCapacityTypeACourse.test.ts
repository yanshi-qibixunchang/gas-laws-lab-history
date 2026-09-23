import assert from 'node:assert/strict';
import { calculateHeatCapacityGroupReference } from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import { calculateHeatCapacityTypeAStatistics } from '../../src/domain/heatCapacity/heatCapacityCalculationPrecisionModel.ts';
import { createHeatCapacityCalculationWorkflowSession, submitHeatCapacityCalculationStep, updateHeatCapacityCalculationDraft,
  completeHeatCapacityCalculationWorkflow, continueHeatCapacityCalculationAnswer,
  selectHeatCapacityCalculationGroup, selectHeatCapacityCalculationAggregate,
  type HeatCapacityCalculationWorkflowSession } from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import { formatHeatCapacityCalculationReference, getHeatCapacityCalculationFieldSpec,
  HEAT_CAPACITY_TYPE_A_ANSWER_RULE, HEAT_CAPACITY_AB_ANSWER_RULE } from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';
import { normalizeHeatCapacityCalculationWorkflowSessionForTrials, calculateHeatCapacityFreeCalculationReference } from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import { createHeatCapacityFreeTrial, getHeatCapacityFreePublicZero } from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { createDefaultFreeConfigSnapshot } from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import { roundSignificantFiguresHalfEven } from '../../src/domain/calculation/decimalHalfEven.ts';

// Keep the established A-only arithmetic as a legacy regression fixture.
const createOptions = (readings: number[][], p0 = 101.3) => ({ mode: 'free' as const, answerRule: HEAT_CAPACITY_TYPE_A_ANSWER_RULE, theoreticalGamma: 1.4, now: 100,
  groups: readings.map(([u0Mv, u1Mv, u2Mv], i) => ({ trialId: `trial-${i}`, reference: calculateHeatCapacityGroupReference({
    u0Mv: u0Mv!, u1Mv: u1Mv!, u2Mv: u2Mv!, atmosphericPressureKPa: p0, pressureSensitivityMvPerKPa: 20,
  })! })),
});
const allFields = (s: HeatCapacityCalculationWorkflowSession) => [...s.groups.flatMap(g => g.fields), ...s.aggregate!.fields];
const solve = (initial: HeatCapacityCalculationWorkflowSession, checkRestore = false) => {
  let s = initial;
  for (let count = 0; s.status === 'in-progress' && count < 30; count++) {
    const step = [...s.groups.flatMap(g => g.steps), ...s.aggregate!.steps].find(step => step.id === s.activeStepId)!;
    assert.ok(step);
    for (const id of step.fieldIds) {
      const field = allFields(s).find(f => f.id === id)!;
      s = updateHeatCapacityCalculationDraft(s, id, formatHeatCapacityCalculationReference(field.expectedValue, getHeatCapacityCalculationFieldSpec(field, s.answerRule)));
    }
    s = submitHeatCapacityCalculationStep(s, step.id, 200 + count);
    assert.ok(step.fieldIds.every(id => allFields(s).find(f => f.id === id)!.answer.status === 'correct'));
    const options = { mode: 'free' as const, theoreticalGamma: s.theoreticalGamma, groups: s.groups, now: 100 };
    const restored = checkRestore ? normalizeHeatCapacityCalculationWorkflowSessionForTrials(JSON.parse(JSON.stringify(s)), options)! : s;
    assert.equal(restored.activeStepId, s.activeStepId, 'each dependency gate survives save/restore');
    assert.equal(restored.activeGroupIndex, s.activeGroupIndex, 'save/restore must preserve access to all completed experiment tabs');
    assert.deepEqual(allFields(restored).map(f => f.answer), allFields(s).map(f => f.answer));
    s = restored;
  }
  assert.equal(s.status, 'ready-to-exit');
  return completeHeatCapacityCalculationWorkflow(s, 300);
};

const typical = createOptions([[0.3, 82.6, 22.6], [0.3, 84.1, 23.7], [0.3, 84.3, 23.6]]);
const course = createHeatCapacityCalculationWorkflowSession(typical);
assert.equal(course.answerRule, HEAT_CAPACITY_TYPE_A_ANSWER_RULE);
assert.deepEqual(course.groups.map(g => g.reference.formulaGamma), [1.379, 1.395, 1.392]);
assert.deepEqual(course.aggregate!.reference, {
  count: 3, meanGamma: 1.389, sumSquaredDeviations: 0.000145,
  sampleStandardDeviation: 0.00851, typeAStandardUncertainty: 0.00491,
  relativeErrorPercent: 0.786, reportTypeA: 0.0049, reportMeanGamma: 1.389, reportDecimalPlaces: 4,
});
const solved = solve(course);
assert.equal(solved.status, 'completed');
const summaryPending = { ...solved, status: 'in-progress' as const, activeStepId: 'aggregate:meanGamma' };
const reviewingFirst = selectHeatCapacityCalculationGroup(summaryPending, 0);
assert.equal(selectHeatCapacityCalculationAggregate(reviewingFirst).aggregateSelected, true,
  'reviewing an earlier experiment must not lock the summary tab');
const reset = continueHeatCapacityCalculationAnswer(solved, 'group:trial-1:gamma');
assert.equal(reset.status, 'in-progress');
assert.equal(reset.activeStepId, 'group:trial-1:groupGamma');
assert.ok(reset.groups[0]!.fields.every(f => f.answer.status === 'correct'));
assert.ok(reset.aggregate!.fields.every(f => f.answer.status === 'unresolved'));
assert.equal(reset.completedAtMs, null);
solve(reset);

for (const readings of [
  [[0, 110.3, 41.4], [0, 118.7, 44.5], [0, 92.2, 34.7]], // distinct public readings, identical rounded gamma
  [[0, 110, 30.4], [0, 110, 30.4], [0, 110, 30.4]],
]) {
  const zero = solve(createHeatCapacityCalculationWorkflowSession(createOptions(readings)));
  assert.equal(zero.aggregate!.reference.sumSquaredDeviations, 0);
  assert.equal(zero.aggregate!.reference.typeAStandardUncertainty, 0);
  for (const kind of ['sampleStandardDeviation', 'typeAStandardUncertainty', 'reportTypeA']) {
    assert.equal(zero.aggregate!.fields.find(f => f.answerKind === kind)!.answer.lastSubmittedRaw, '0');
  }
  assert.equal(zero.aggregate!.reference.reportMeanGamma, zero.aggregate!.reference.meanGamma);
}

const legacy = createHeatCapacityCalculationWorkflowSession({ ...typical, answerRule: 'strict-half-even-v2' });
const migrated = normalizeHeatCapacityCalculationWorkflowSessionForTrials(JSON.parse(JSON.stringify(legacy)), typical)!;
assert.equal(migrated.recalculationNotice, true);
assert.equal(migrated.answerRule, HEAT_CAPACITY_AB_ANSWER_RULE);
assert.ok(allFields(migrated).every(f => f.answer.status === 'unresolved'));
const completedLegacy = solve(legacy, false);
const migratedCompleted = normalizeHeatCapacityCalculationWorkflowSessionForTrials(JSON.parse(JSON.stringify(completedLegacy)), typical)!;
assert.equal(migratedCompleted.status, 'in-progress');
assert.equal(migratedCompleted.recalculationNotice, true);
assert.ok(allFields(migratedCompleted).every(f => f.answer.status === 'unresolved'));
const ideal = createHeatCapacityCalculationWorkflowSession({ ...typical, uncertaintyEligibility: { version: 'standard-real-teaching-v1', eligible: false, reason: 'ideal' } });
assert.deepEqual(ideal.aggregate!.steps.map(s => s.kind), ['meanGamma', 'batchRelativeError']);

const snapshot = createDefaultFreeConfigSnapshot();
const trial = createHeatCapacityFreeTrial('zero-test');
const record = { atS: 1, displayPressureMv: 82.6, displayTemperatureMv: 0, calibrationVersion: 1, zeroEventId: 'zero-1', source: 'user' as const, phaseAtRecord: null, traceTrialId: null, traceBranchId: null, traceSampleId: null, eventId: null };
trial.u1 = record; trial.u2 = { ...record, displayPressureMv: 22.6 };
assert.equal(calculateHeatCapacityFreeCalculationReference(trial, snapshot), null);
trial.automaticU0 = { ...record, displayPressureMv: -0.08 };
assert.equal(getHeatCapacityFreePublicZero(trial)!.displayPressureMv, 0);
assert.equal(calculateHeatCapacityFreeCalculationReference(trial, snapshot)!.u0Mv, 0);
trial.u0 = { ...record, displayPressureMv: 0.3 };
assert.equal(calculateHeatCapacityFreeCalculationReference(trial, snapshot)!.u0Mv, 0.3);
const explicitP0 = createHeatCapacityCalculationWorkflowSession(createOptions([[0, 110, 30], [0, 112, 31], [0, 114, 32]], 101.325));
assert.equal(explicitP0.groups[0]!.reference.p0KPa, 101.325);

// Independent Decimal(60) references from these same public 0.1 mV readings.
// Final two-significant-figure ties exercise both directions of half-even.
for (const boundary of [
  { readings: [[0,85.2,22.8],[0,140.4,40.1],[-0.2,103.1,28.4]],
    gammas: [1.373,1.413,1.393], q:0.0008, s:0.0200, ua:0.0115, report:0.012, mean:1.393 },
  { readings: [[0.5,61.9,17.4],[-0.1,130.2,37],[0.1,93.9,26.7]],
    gammas:[1.385,1.411,1.405], q:0.000371, s:0.0136, ua:0.00785, report:0.0078, mean:1.4000 },
]) {
  const session = solve(createHeatCapacityCalculationWorkflowSession(createOptions(boundary.readings)));
  assert.deepEqual(session.groups.map(group => group.reference.formulaGamma), boundary.gammas);
  const stats = session.aggregate!.reference;
  assert.equal(stats.sumSquaredDeviations, boundary.q);
  assert.equal(stats.sampleStandardDeviation, boundary.s);
  assert.equal(stats.typeAStandardUncertainty, boundary.ua);
  assert.equal(stats.reportTypeA, boundary.report);
  assert.equal(stats.reportMeanGamma, boundary.mean);
}

// Sweep around rounding boundaries. Public Q must be the operand used by s;
// an adjacent last digit versus a longer-precision chain is not a rejection.
let nonzero = 0, zero = 0, qChangesLastDigit = 0;
for (let a = 1360; a <= 1410; a++) for (let b = -8; b <= 8; b++) for (let c = -4; c <= 4; c++) {
  const gammas = [a / 1000, (a + b) / 1000, (a + c) / 1000];
  const result = calculateHeatCapacityTypeAStatistics(gammas, 1.4);
  const fromQ = roundSignificantFiguresHalfEven(Math.sqrt(result.sumSquaredDeviations! / 2), 3);
  assert.equal(result.sampleStandardDeviation, fromQ);
  assert.equal(result.typeAStandardUncertainty, roundSignificantFiguresHalfEven(fromQ / Math.sqrt(3), 3));
  const highQ = gammas.reduce((q, g) => q + (g - result.meanGamma) ** 2, 0);
  if (roundSignificantFiguresHalfEven(Math.sqrt(highQ / 2), 3) !== fromQ) qChangesLastDigit++;
  if (result.typeAStandardUncertainty === 0) zero++; else nonzero++;
  assert.ok(result.sumSquaredDeviations! >= 0);
}
console.log('Type A course checks passed', { nonzero, zero, qChangesLastDigit });
