import assert from 'node:assert/strict';
import { evaluatePistonUncertaintyEligibility } from '../../src/domain/pistonOscillation/pistonOscillationUncertaintyEligibility.ts';
import { createPistonOscillationRealParameterDraft } from '../../src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts';
import { createPistonOscillationFreeExperimentGroup, lockPistonOscillationFreeExperimentGroup } from '../../src/domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import { createPistonOscillationGasMaterialSnapshot } from '../../src/domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';
import { evaluateHeatCapacityUncertaintyEligibility } from '../../src/domain/heatCapacity/heatCapacityUncertaintyEligibility.ts';
import { createDefaultHeatCapacityFile, applyHeatCapacityFreeParameterDraftWorkbenchState, selectHeatCapacityFreeAppliedParameterDraft, configureHeatCapacityFreeBatchWorkbenchState, freezeHeatCapacityFreeParametersForCurrentGroup } from '../../src/features/workbench/workbenchState.ts';
import { createHeatCapacityFreeRuntimeConfigSnapshotFromFile } from '../../src/features/workbench/workbenchHeatCapacityFreeConfigSnapshot.ts';
import { heatCapacityFreeAdvancedNumberParameters, heatCapacityFreeAdvancedParameterGroups } from '../../src/features/heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import { calculateHeatCapacityGroupReference } from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import { createHeatCapacityCalculationWorkflowSession, rehydrateHeatCapacityCalculationWorkflowSession } from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import { evaluatePistonPrecisionChain } from '../../src/domain/pistonOscillation/pistonOscillationPrecisionModel.ts';
import { createPistonUncertaintyProfile } from '../../src/domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';

for (const gasType of ['air', 'helium'] as const) {
  for (const temperatureK of [283.15, 293.15, 308.15]) for (const pressure of [80, 101.325, 110]) {
    for (const sampleRateHz of [1, 100, 250, 500, 1000]) {
      const parameters = { ...createPistonOscillationRealParameterDraft(gasType), ambientTemperatureK: temperatureK,
        ambientPressureKpa: pressure, sampleRateHz, triggerThresholdKpa: Math.round(105 * pressure / 101.325 * 10) / 10 };
      const group = lockPistonOscillationFreeExperimentGroup(createPistonOscillationFreeExperimentGroup({
        gasMaterialSnapshot: createPistonOscillationGasMaterialSnapshot(gasType),
      }), parameters, 'formal-acquisition-started', 1);
      assert.equal(evaluatePistonUncertaintyEligibility(group).eligible, true);
      assert.equal(evaluatePistonUncertaintyEligibility({ ...group, scheme: 'ideal' }).reason, 'ideal');
      for (const [key, value] of Object.entries(parameters)) {
        if (['ambientTemperatureK', 'ambientPressureKpa', 'sampleRateHz', 'triggerThresholdKpa'].includes(key)) continue;
        const changed = structuredClone(group);
        (changed.parameterSnapshot!.parameters as unknown as Record<string, unknown>)[key] = typeof value === 'boolean' ? !value : Number(value) + 0.001;
        assert.equal(evaluatePistonUncertaintyEligibility(changed).reason, 'instrument-model', key);
      }
    }
    const base = createDefaultHeatCapacityFile(1);
    const file = applyHeatCapacityFreeParameterDraftWorkbenchState(base, {
      ...selectHeatCapacityFreeAppliedParameterDraft(base), gasType, ambientTemperatureK: temperatureK, ambientPressureKPa: pressure,
    });
    const snapshot = createHeatCapacityFreeRuntimeConfigSnapshotFromFile(file);
    assert.equal(evaluateHeatCapacityUncertaintyEligibility('real', gasType, snapshot).eligible, true,
      JSON.stringify({ gasType, temperatureK, pressure, snapshot }));
    const changed = structuredClone(snapshot);
    changed.sensor.noiseMv = 0;
    assert.equal(evaluateHeatCapacityUncertaintyEligibility('real', gasType, changed).reason, 'instrument-model');
    changed.sensor.noiseMv = snapshot.sensor.noiseMv;
    changed.physics.environmentDisturbance!.enabled = false;
    assert.equal(evaluateHeatCapacityUncertaintyEligibility('real', gasType, changed).reason, 'instrument-model');
    const oldCriteria = structuredClone(snapshot);
    oldCriteria.record.pressureDangerMv = 999;
    assert.equal(evaluateHeatCapacityUncertaintyEligibility('real', gasType, oldCriteria).reason, 'record-criteria');
    for (const badTemperature of [283.14, 308.16, 773.15]) {
      assert.equal(evaluateHeatCapacityUncertaintyEligibility('real', gasType, {
        ...snapshot, environment: { ...snapshot.environment, ambientTemperatureK: badTemperature },
      }).reason, 'environment');
    }
    for (const badPressure of [79.99, 110.01]) {
      assert.equal(evaluateHeatCapacityUncertaintyEligibility('real', gasType, {
        ...snapshot, environment: { ...snapshot.environment, ambientPressureKPa: badPressure },
      }).reason, 'environment');
    }
  }
}

const base = createDefaultHeatCapacityFile(2);
const changed = applyHeatCapacityFreeParameterDraftWorkbenchState(base, {
  ...selectHeatCapacityFreeAppliedParameterDraft(base), pressureDangerMv: 999, pressureWarningMv: 888,
  minimumUsefulU1CorrectedMv: 0, u0ZeroToleranceMv: 999,
});
assert.deepEqual(changed.heatCapacityFreeInstrumentConfig.record, base.heatCapacityFreeInstrumentConfig.record);
assert.equal(changed.heatCapacityFreeInstrumentConfig.pressureWarningMv, 120);
assert.ok(heatCapacityFreeAdvancedNumberParameters.every(p => !['u0ZeroToleranceMv', 'pressureDangerMv', 'pressureWarningMv', 'minimumUsefulU1CorrectedMv'].includes(p.id)));
assert.ok(heatCapacityFreeAdvancedParameterGroups.every(p => (p.id as string) !== 'recordCriteria'));

// Older unstarted settings must not leak into the first new frozen group.
const oldDraft = structuredClone(base);
oldDraft.heatCapacityFreeInstrumentConfig.record.pressureDangerMv = 999;
oldDraft.heatCapacityFreeRealDomain.recordConfig.pressureDangerMv = 999;
const frozen = freezeHeatCapacityFreeParametersForCurrentGroup(configureHeatCapacityFreeBatchWorkbenchState(oldDraft, 3, 10), 11);
assert.equal(frozen.heatCapacityFreeRunWorkspace.batch.frozenConfigSnapshot!.record.pressureDangerMv, 140);
const runningDraft = { ...configureHeatCapacityFreeBatchWorkbenchState(oldDraft, 3, 10), runState: 'running' as const };
assert.equal(freezeHeatCapacityFreeParametersForCurrentGroup(runningDraft, 11).heatCapacityFreeRunWorkspace.batch.frozenConfigSnapshot!.record.pressureDangerMv, 140);

const reference = calculateHeatCapacityGroupReference({ u0Mv: 0.1, u1Mv: 110.2, u2Mv: 31.5, atmosphericPressureKPa: 101.3, pressureSensitivityMvPerKPa: 20 })!;
const options = { mode: 'free' as const, groups: [0, 1, 2].map(i => ({ trialId: `trial-${i}`, reference })), theoreticalGamma: 1.4, now: 100 };
const original = createHeatCapacityCalculationWorkflowSession(options);
assert.equal(original.aggregate!.fields.length, 8);
const idealEligibility = evaluateHeatCapacityUncertaintyEligibility('ideal', 'air', null);
const ideal = rehydrateHeatCapacityCalculationWorkflowSession(original, { ...options, uncertaintyEligibility: idealEligibility });
assert.deepEqual(ideal.aggregate!.fields.map(f => f.answerKind), ['meanGamma', 'relativeErrorPercent']);
assert.deepEqual(ideal.aggregate!.steps.map(s => s.kind), ['meanGamma', 'batchRelativeError']);
assert.deepEqual(rehydrateHeatCapacityCalculationWorkflowSession(JSON.parse(JSON.stringify(ideal)), { ...options, uncertaintyEligibility: idealEligibility }), ideal);
assert.equal(evaluateHeatCapacityUncertaintyEligibility('real', 'air', null).reason, 'missing-snapshot');

// The small acquisition function remains data-dependent; no extra noise model is invented.
const knowns = { movingMassKg: 0.0485, cylinderDiameterM: 0.0325, pressurePa: 101320, referenceGamma: 1.4 };
const observations = [.03, .035, .04].map((periodS, runIndex) => ({ runIndex, periodS, heightM: 50 * periodS ** 2, periodCount: 4, sampleRateHz: 1000 }));
const a = evaluatePistonPrecisionChain(knowns, observations, createPistonUncertaintyProfile());
const b = evaluatePistonPrecisionChain(knowns, observations.map(o => ({ ...o, sampleRateHz: 500 })), createPistonUncertaintyProfile());
assert.equal(b.rows[0].timeU, 2 * a.rows[0].timeU);
assert.ok(b.values.combined >= a.values.combined);
const c = evaluatePistonPrecisionChain({ ...knowns, pressurePa: 80000 }, observations, createPistonUncertaintyProfile());
assert.ok(Math.abs(c.gamma / a.gamma - 101320 / 80000) < 1e-12);
console.log('uncertainty teaching eligibility: environment, both gases, acquisition, model toggles and fixed criteria passed');
