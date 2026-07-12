import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  calculateHeatCapacityGammaFromDisplayedSignals,
  clampHeatCapacityTeachingProfile,
  createHeatCapacityAutoDemoProfile,
} from '../../src/domain/heatCapacity/heatCapacityTeachingProfile.ts';

const profileSource = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityTeachingProfile.ts'),
  'utf8',
);

assert.match(profileSource, /export interface HeatCapacityTeachingProfile/, 'teaching preset type boundary should remain explicit');
assert.match(profileSource, /Demo\/Guide-only teaching profile/, 'scripted profile fields should remain scoped to Demo and Guide');
assert.doesNotMatch(profileSource, /createSeededRandom|randomNormal|createHeatCapacityExperimentProfile/, 'teaching profiles should not retain the removed random generator path');

const profile = createHeatCapacityAutoDemoProfile(() => 0.5);
const repeatedProfile = createHeatCapacityAutoDemoProfile(() => 0.5);
const lowerProfile = createHeatCapacityAutoDemoProfile(() => 0);
const upperProfile = createHeatCapacityAutoDemoProfile(() => 0.999999);
assert.deepEqual(profile, repeatedProfile, 'an auto-demo run should keep one stable generated result profile');
assert.notEqual(lowerProfile.u2MeasuredMv, upperProfile.u2MeasuredMv);
assert.equal(profile.theoreticalGamma, 1.4);
assert.equal(profile.u1MeasuredMv, 120);
assert.equal(
  profile.gammaTarget,
  Number(calculateHeatCapacityGammaFromDisplayedSignals(
    profile.u0MeasuredMv,
    profile.u1MeasuredMv,
    profile.u2MeasuredMv,
  ).toFixed(6)),
  'displayed U0/U1/U2 should reproduce the stored gamma exactly',
);
for (const generatedProfile of [lowerProfile, profile, upperProfile]) {
  const displayedGamma = Number(generatedProfile.gammaTarget.toFixed(3));
  assert.equal(displayedGamma >= 1.37 && displayedGamma <= 1.43, true);
  assert.match(generatedProfile.gammaTarget.toFixed(3), /^1\.\d{3}$/);
}
assert.equal(profile.displayNoiseLevel, 0);

const clamped = clampHeatCapacityTeachingProfile({
  ...profile,
  gammaTarget: 2,
  u0MeasuredMv: 3,
  u1MeasuredMv: 200,
  u2MeasuredMv: 180,
  ambientTemperatureMv: Number.NaN,
});
assert.equal(clamped.gammaTarget >= 1.37 && clamped.gammaTarget <= 1.43, true);
assert.equal(Math.abs(clamped.u0MeasuredMv) <= 0.03, true);
assert.equal(clamped.u1MeasuredMv, 130);
assert.equal(clamped.u2MeasuredMv < clamped.u1MeasuredMv, true);
assert.equal(
  clamped.gammaTarget,
  Number(calculateHeatCapacityGammaFromDisplayedSignals(
    clamped.u0MeasuredMv,
    clamped.u1MeasuredMv,
    clamped.u2MeasuredMv,
  ).toFixed(6)),
);
assert.equal(Number.isFinite(clamped.ambientTemperatureMv), true);

console.log('heatCapacityTeachingProfile tests passed');
