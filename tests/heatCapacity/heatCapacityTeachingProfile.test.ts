import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  calculateHeatCapacityGammaFromDisplayedSignals,
  clampHeatCapacityTeachingProfile,
  createHeatCapacityAutoDemoProfile,
  normalizeHeatCapacityTeachingProfile,
} from '../../src/domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
} from '../../src/domain/heatCapacity/heatCapacitySensorMapping.ts';

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
assert.deepEqual(
  normalizeHeatCapacityTeachingProfile(profile),
  profile,
  'a current profile must remain stable when normalized again',
);
const generatedSeeds = new Set<number | string>();
for (let index = 0; index < 1200; index += 1) {
  const generatedProfile = createHeatCapacityAutoDemoProfile(() => index / 1200);
  generatedSeeds.add(generatedProfile.seed);
  assert.deepEqual(
    normalizeHeatCapacityTeachingProfile(generatedProfile),
    generatedProfile,
    `generated teaching profile ${String(generatedProfile.seed)} must normalize idempotently`,
  );
}
assert.equal(
  generatedSeeds.size > 1,
  true,
  'the idempotence sweep must cover more than one generated teaching profile',
);
const formerlyDriftingProfile = createHeatCapacityAutoDemoProfile(() => 0.0278);
assert.deepEqual(
  normalizeHeatCapacityTeachingProfile(formerlyDriftingProfile),
  formerlyDriftingProfile,
  'a displayed U2 triplet must not drift by another 0.1 mV during repeated normalization',
);
assert.equal(normalizeHeatCapacityTeachingProfile({ u1MeasuredMv: 120 }), null);

const clamped = clampHeatCapacityTeachingProfile({
  ...profile,
  gammaTarget: 2,
  u0MeasuredMv: 3,
  u1MeasuredMv: 200,
  u2MeasuredMv: 180,
  ambientTemperatureMv: 1600,
  initialTemperatureMv: 1601,
  stableTemperatureMv: 1602,
  releaseTemperatureLowMv: 1590,
  recoveryTemperatureMv: 1603,
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
assert.equal(clamped.ambientTemperatureMv, HEAT_CAPACITY_TEMPERATURE_BASELINE_MV);
assert.equal(clamped.initialTemperatureMv, HEAT_CAPACITY_TEMPERATURE_BASELINE_MV);
assert.equal(
  clamped.stableTemperatureMv <= HEAT_CAPACITY_TEMPERATURE_BASELINE_MV + 0.18,
  true,
);
assert.equal(
  clamped.releaseTemperatureLowMv >= HEAT_CAPACITY_TEMPERATURE_BASELINE_MV - 1.15,
  true,
);
assert.equal(
  clamped.recoveryTemperatureMv <= HEAT_CAPACITY_TEMPERATURE_BASELINE_MV + 0.18,
  true,
);

console.log('heatCapacityTeachingProfile tests passed');
