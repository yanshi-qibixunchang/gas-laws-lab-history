import assert from 'node:assert/strict';
import { simulate, observe, fit, HEIGHTS } from '../../scripts/analysis/pistonDissipationAcceptance.ts';
import { resolvePistonOscillationFreeEffectiveConfig } from '../../src/domain/pistonOscillation/pistonOscillationFreeEffectiveConfig.ts';
import { createPistonOscillationFreeExperimentGroup, isPistonOscillationFreeExperimentProfileImplemented } from '../../src/domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import { createPistonOscillationGasMaterialSnapshot } from '../../src/domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';
import { normalizePistonOscillationRawMeasurementRecord } from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationRealParameterDraft, getPistonOscillationStoredRealParameterBaseline,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V10,
  PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V7,
} from '../../src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts';

for (const gas of ['air', 'helium'] as const) {
  const draft = createPistonOscillationRealParameterDraft(gas);
  for (const key of ['equivalentLinearLossNsPerM', 'thermalRelaxationTimeS', 'heatFlowLagTimeS', 'sensorResponseTimeS', 'tailIntensity'] as const) {
    assert.ok(draft[key] > 0, `${gas}: ${key} must remain nonzero in the accepted preset`);
  }
  const sim = simulate(gas, 'real', 50);
  assert.equal(sim.effective.physicsConfig.internalDissipationMolarMassKgPerMol, gas === 'air' ? .02897 : .004002602);
  assert.equal(sim.effective.adiabaticProcess, false, 'real mode retains external heat transfer');
  assert.ok(sim.trajectory.samples.some(s => Math.abs(s.cumulativeHeatTransferJ) > 1e-5));
  const observed = observe(sim)!;
  assert.ok(observed);
  assert.deepEqual(normalizePistonOscillationRawMeasurementRecord(JSON.parse(JSON.stringify(observed.record))), observed.record);
  const result = fit(HEIGHTS.map(h => observe(simulate(gas, 'real', h), 1)));
  assert.ok(result);
  assert.ok(Math.abs(result.gamma - (gas === 'air' ? 1.384 : 1.674)) < .002, 'new preset uses the accepted production calculation chain');

  const oldVersion = gas === 'air' ? PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V10 : PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V7;
  const historicalDraft = getPistonOscillationStoredRealParameterBaseline(gas, oldVersion)!;
  const historicalGroup = createPistonOscillationFreeExperimentGroup({ scheme: 'real', parameterProfileVersion: oldVersion,
    gasMaterialSnapshot: createPistonOscillationGasMaterialSnapshot(gas), groupId: 'historical', createdAtMs: 0, acquisitionDefaultsVersion: 2 });
  assert.ok(isPistonOscillationFreeExperimentProfileImplemented(historicalGroup));
  const historical = resolvePistonOscillationFreeEffectiveConfig(historicalGroup, historicalDraft);
  assert.equal(historical.physicsConfig.internalDissipationMolarMassKgPerMol, undefined, 'historical experiments must not acquire new physics');
  assert.equal(historical.parameters.equivalentLinearLossNsPerM, gas === 'air' ? .06 : .18);
  assert.equal(historical.parameters.tailIntensity, gas === 'air' ? .35 : 0);
  if (gas === 'air') assert.equal(historical.parameters.recordingDurationS, .5);
}
console.log('Accepted real internal-dissipation preset, production calculations and historical snapshots passed.');
