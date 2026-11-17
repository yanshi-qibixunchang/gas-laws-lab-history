import assert from 'node:assert/strict';
import { simulate, observe } from '../../scripts/analysis/pistonDissipationAcceptance.ts';
import { delayedRelease } from '../../scripts/analysis/pistonLateReleaseAcceptance.ts';
import { PISTON_OSCILLATION_UNBOUNDED_RELEASE_MODEL_VERSION as V2,
  getPistonOscillationReleaseAsymmetrySeverity as severity } from '../../src/domain/pistonOscillation/pistonOscillationReleaseAsymmetryModel.ts';
import { createPistonOscillationFreeParameterSnapshot, normalizePistonOscillationFreeParameterSnapshot,
  normalizePistonOscillationFreeParameterDraft, getPistonOscillationFreeReleaseAsymmetryConfig } from '../../src/domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';
import { createPistonOscillationRealParameterDraft, getPistonOscillationStoredRealParameterBaseline,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V9 } from '../../src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts';
import { createPistonOscillationIdealParameterProfile, PISTON_PREVIOUS_DISSIPATIVE_IDEAL_PROFILE_VERSION } from '../../src/domain/pistonOscillation/pistonOscillationIdealParameterProfile.ts';

const config={modelVersion:V2};
for(const gap of [0,.04,.06,.1,.15]) assert.equal(severity(gap,config),severity(gap));
assert.equal(severity(.5),1,'legacy records retain their capped model');
assert.ok(severity(.3,config)>severity(.15,config));
assert.ok(severity(.5,config)>severity(.3,config));
assert.equal(severity(-.5,config),severity(.5,config));
const current=createPistonOscillationRealParameterDraft('air');
const {releaseAsymmetryModelVersion:_,...old}=current;
assert.equal(getPistonOscillationFreeReleaseAsymmetryConfig(normalizePistonOscillationFreeParameterDraft(old,current)).modelVersion,
  'piston-oscillation-release-asymmetry-v1','missing historical version must not inherit the new behavior');
const snapshot=createPistonOscillationFreeParameterSnapshot(current,1);
assert.deepEqual(normalizePistonOscillationFreeParameterSnapshot(JSON.parse(JSON.stringify(snapshot))),snapshot);
assert.equal(getPistonOscillationStoredRealParameterBaseline('air',PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V9)!.releaseAsymmetryModelVersion,undefined);
assert.equal(createPistonOscillationIdealParameterProfile(1.4,PISTON_PREVIOUS_DISSIPATIVE_IDEAL_PROFILE_VERSION).parameters.releaseAsymmetryModelVersion,undefined);

for(const gas of ['air','helium'] as const) {
  for(const scheme of ['real','ideal'] as const) assert.equal(simulate(gas,scheme,70).effective.releaseAsymmetryConfig.modelVersion,V2);
  const base=simulate(gas,'real',70);
  const normal=observe(base,1)!;
  assert.deepEqual(observe(delayedRelease(base,0),1)!.run.result,normal.run.result);
  // The retuned helium loss permits a third detectable cycle at 300 ms.
  // Use the same severe 500 ms mismatch for both gases to test a short trace.
  const gapMs=500;
  const bad=delayedRelease(base,gapMs);
  const samples=bad.trajectory.samples;
  const eq=bad.trajectory.equilibrium.equilibriumPressurePa;
  const peaks=samples.filter((s,i)=>i>0&&i<samples.length-1&&s.pressurePa>samples[i-1]!.pressurePa
    &&s.pressurePa>=samples[i+1]!.pressurePa&&s.pressurePa-eq>=500);
  assert.ok(peaks.length<=2,'severe mismatch leaves only a few visible peaks');
  assert.equal(observe(bad,1),null,'too-short record must not fabricate the missing three cycles');
  const extreme=delayedRelease(base,10_000);
  assert(extreme.trajectory.samples.every(s=>Number.isFinite(s.pressurePa)&&Number.isFinite(s.temperatureK)&&s.temperatureK>0));
}
console.log('Unbounded release: unchanged normal response, legacy persistence, short traces and finite 10 s gaps passed.');
