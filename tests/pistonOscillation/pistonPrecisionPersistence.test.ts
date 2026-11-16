import assert from 'node:assert/strict';
import { planPistonPrecision, normalizePistonPrecisionKnowns, PISTON_PRECISION_VERSION } from '../../src/domain/pistonOscillation/pistonOscillationPrecisionModel.ts';
import { createPistonUncertaintyProfile } from '../../src/domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';
import { cleanPistonPrecisionDiagnosticSnapshot } from '../../src/domain/pistonOscillation/pistonUncertaintySnapshotMigration.ts';
import { canonicalizeWorkbenchPersistenceV3Json } from '../../src/features/workbench/persistenceV3/fingerprint.ts';

const knowns = normalizePistonPrecisionKnowns({ movingMassKg: 0.048546, cylinderDiameterM: 0.0325, pressurePa: 101325, referenceGamma: 1.4 });
const profile = createPistonUncertaintyProfile();
const observations = [0.0304444, 0.0305263, 0.0305882].map((periodS, runIndex) => ({
  runIndex, periodS, heightM: 0.048876, periodCount: 3, sampleRateHz: 1000,
}));
// Same-height practice measurements previously put NaN into the saved plan.
const { plan, chain } = planPistonPrecision(knowns, observations, profile);
assert.equal(chain.slope, 0);
assert.equal(plan.verified, false);
assert.equal(plan.gammaErrorInUc, null);
assert.equal(plan.combinedRelativeError, null);
assert.doesNotThrow(() => canonicalizeWorkbenchPersistenceV3Json(plan));
for (const rows of [[], observations.map(row => ({ ...row, periodS: 0.03 }))]) {
  const invalid = planPistonPrecision(knowns, rows, profile).plan;
  assert.equal(invalid.verified, false);
  assert.doesNotThrow(() => canonicalizeWorkbenchPersistenceV3Json(invalid));
}

const processing = {
  precisionVersion: PISTON_PRECISION_VERSION,
  runs: observations,
  calculationSession: { answers: { area: { draftRaw: '0.00082958' } } },
  linearFitResult: { slopeMPerS2: 0, interceptM: 0.048876,
    precisionPlan: { ...plan, gammaErrorInUc: NaN, combinedRelativeError: Infinity } },
};
assert.throws(() => canonicalizeWorkbenchPersistenceV3Json(processing), /finite/);
const repaired = cleanPistonPrecisionDiagnosticSnapshot(processing) as typeof processing;
assert.deepEqual(repaired, { ...processing, linearFitResult: { ...processing.linearFitResult, precisionPlan: plan } });
assert.equal(repaired.runs, processing.runs, 'raw observations must not change');
assert.equal(repaired.calculationSession, processing.calculationSession, 'answers must not change');
assert.ok(Number.isNaN(processing.linearFitResult.precisionPlan.gammaErrorInUc), 'do not mutate the source');
assert.doesNotThrow(() => canonicalizeWorkbenchPersistenceV3Json(repaired));
assert.equal(cleanPistonPrecisionDiagnosticSnapshot(repaired), repaired, 'repair is idempotent');

for (const unknown of [
  { ...processing, precisionVersion: 'future-version' },
  { ...processing, linearFitResult: { ...processing.linearFitResult,
    precisionPlan: { ...processing.linearFitResult.precisionPlan, verified: true } } },
]) {
  assert.equal(cleanPistonPrecisionDiagnosticSnapshot(unknown), unknown);
  assert.throws(() => canonicalizeWorkbenchPersistenceV3Json(unknown), /finite/);
}
const unrelatedInvalid = { ...processing, runs: [{ periodS: NaN }] };
assert.throws(() => canonicalizeWorkbenchPersistenceV3Json(cleanPistonPrecisionDiagnosticSnapshot(unrelatedInvalid)), /finite/,
  'unrelated invalid measurements must not be silently replaced');
console.log('Degenerate-fit precision plans and narrow snapshot repair passed.');
