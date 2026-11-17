import assert from 'node:assert/strict';
import { simulate, observe, fit, HEIGHTS } from '../../scripts/analysis/pistonDissipationAcceptance.ts';
import { resolvePistonOscillationFreeEffectiveConfig } from '../../src/domain/pistonOscillation/pistonOscillationFreeEffectiveConfig.ts';
import { createPistonOscillationFreeExperimentGroup, isPistonOscillationFreeExperimentProfileImplemented } from '../../src/domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import { createPistonOscillationGasMaterialSnapshot } from '../../src/domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';
import { normalizePistonOscillationRawMeasurementRecord } from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationRealParameterDraft, getPistonOscillationStoredRealParameterBaseline,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V10,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V11,
  PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V7,
  PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V8,
  inferPistonOscillationRealAirProfileVersion,
  inferPistonOscillationRealHeliumProfileVersion,
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
  assert.equal(result.gamma, gas === 'air' ? 1.358 : 1.668, '70/60/50 mm production chain matches the accepted seed-1 candidate');

  const releasedVersion = gas === 'air' ? PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V11 : PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V8;
  const releasedDraft = getPistonOscillationStoredRealParameterBaseline(gas, releasedVersion)!;
  const releasedGroup = createPistonOscillationFreeExperimentGroup({ scheme: 'real', parameterProfileVersion: releasedVersion,
    gasMaterialSnapshot: createPistonOscillationGasMaterialSnapshot(gas), acquisitionDefaultsVersion: 2 });
  assert.ok(isPistonOscillationFreeExperimentProfileImplemented(releasedGroup));
  const released = resolvePistonOscillationFreeEffectiveConfig(releasedGroup, releasedDraft);
  assert.equal(released.physicsConfig.internalDissipationMolarMassKgPerMol, gas === 'air' ? .02897 : .004002602, '6.5.3 keeps its internal dissipation after the preset upgrade');
  assert.equal(released.parameters.equivalentLinearLossNsPerM, gas === 'air' ? .08636830285991312 : .3315636895362068);
  assert.equal(released.parameters.thermalRelaxationTimeS, gas === 'air' ? .01527079271805452 : .009511893839427972);
  assert.equal((gas === 'air' ? inferPistonOscillationRealAirProfileVersion : inferPistonOscillationRealHeliumProfileVersion)(releasedDraft), releasedVersion);
  if (gas === 'air') assert.equal(released.parameters.recordingDurationS, .5);

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
