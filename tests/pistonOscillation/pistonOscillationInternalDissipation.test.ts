import assert from 'node:assert/strict';
import { simulate, observe, absoluteIdealGamma } from '../../scripts/analysis/pistonDissipationAcceptance.ts';
import { normalizePistonOscillationRawMeasurementRecord } from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import { createPistonOscillationThermodynamicStateFromTrajectorySample } from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import { normalizePistonOscillationThermodynamicState } from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import { getPistonInternalDampingNsPerM } from '../../src/domain/pistonOscillation/pistonOscillationInternalDissipation.ts';
import { getPistonOscillationStoredRealParameterBaseline, PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V9, PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V6 } from '../../src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts';
import { getPistonReboundSound } from '../../src/audio/experiments/pistonOscillation/pistonOscillationAudioPolicy.ts';

for (const gas of ['air','helium'] as const) {
  const sim=simulate(gas,'ideal',50);
  const trajectory=sim.trajectory;
  const initial=trajectory.initialThermodynamicState!;
  const { config,equilibrium }=trajectory;
  const energy=(i:number)=> {
    const sample=trajectory.samples[i]!;
    const height=equilibrium.equilibriumHeightM+sample.displacementM;
    const volume=equilibrium.cylinderAreaM2*height+initial.sealedDeadVolumeM3;
    return initial.gasAmountMol*initial.molarHeatCapacityAtConstantVolumeJPerMolK*sample.temperatureK
      + .5*config.movingMassKg*sample.velocityMPerS**2
      + config.movingMassKg*9.80665*height+config.ambientPressurePa*volume;
  };
  const e0=energy(0);
  for(let i=0;i<trajectory.samples.length;i+=100) {
    assert.ok(Math.abs(energy(i)-e0)/e0<1e-8,`sealed ${gas}: internal drag must conserve total energy`);
    assert.equal(trajectory.samples[i]!.cumulativeHeatTransferJ,0,'adiabatic means no external heat');
  }
  const end=trajectory.samples.at(-1)!;
  assert.ok(Math.abs(end.pressurePa-equilibrium.equilibriumPressurePa)<1);
  assert.ok(end.temperatureK>config.ambientTemperatureK,'dissipation leaves the gas warmer');
  assert.ok(end.displacementM>0,'the heated sealed gas has a new equilibrium height');
  const finalState=createPistonOscillationThermodynamicStateFromTrajectorySample(trajectory,end);
  assert.deepEqual(normalizePistonOscillationThermodynamicState(finalState,config),finalState);
  const observation=observe(sim)!;
  assert.ok(observation);
  assert.deepEqual(normalizePistonOscillationRawMeasurementRecord(JSON.parse(JSON.stringify(observation.record))),observation.record);
  const corrupted=structuredClone(observation.record);
  corrupted.physicsSnapshot.config.internalDissipationMolarMassKgPerMol=0;
  assert.equal(normalizePistonOscillationRawMeasurementRecord(corrupted),null,'cannot silently change saved gas dissipation');
  const gamma=absoluteIdealGamma(gas);
  assert.ok(Math.abs(gamma/(gas==='air'?1.4:5/3)-1)<.005/1.4);
}
const oldAir=getPistonOscillationStoredRealParameterBaseline('air',PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V9)!;
assert.equal(oldAir.thermalRelaxationTimeS,.012);
assert.equal(oldAir.sensorResponseTimeS,.0025);
assert.equal(oldAir.recordingDurationS,undefined);
assert.equal(getPistonOscillationStoredRealParameterBaseline('helium',PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V6)!.sensorResponseTimeS,.0026);
assert.ok(getPistonReboundSound(simulate('helium','ideal',50).trajectory,0).durationMs>2500,
  'a long ideal helium release must not be truncated by the old animation or audio limit');
assert.ok(getPistonInternalDampingNsPerM(101898.33,293.15,Math.PI*.0325**2/4,.02897)
  >getPistonInternalDampingNsPerM(101898.33,293.15,Math.PI*.0325**2/4,.004002602));
console.log('Internal dissipation: energy, zero external heat, new equilibrium, material ordering and persistence passed.');
