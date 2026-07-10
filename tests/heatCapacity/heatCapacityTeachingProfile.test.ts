import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
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

const profile = createHeatCapacityAutoDemoProfile();
assert.equal(profile.seed, 'auto-demo-fixed');
assert.equal(profile.theoreticalGamma, 1.4);
assert.equal(profile.u1MeasuredMv, 120);
assert.equal(profile.u2MeasuredMv, 33.46);
assert.equal(profile.displayNoiseLevel, 0);

const clamped = clampHeatCapacityTeachingProfile({
  ...profile,
  gammaTarget: 2,
  u0MeasuredMv: 3,
  u1MeasuredMv: 200,
  u2MeasuredMv: 180,
  ambientTemperatureMv: Number.NaN,
});
assert.equal(clamped.gammaTarget, 1.44);
assert.equal(clamped.u0MeasuredMv, 0.03);
assert.equal(clamped.u1MeasuredMv, 130);
assert.equal(clamped.u2MeasuredMv < clamped.u1MeasuredMv, true);
assert.equal(Number.isFinite(clamped.ambientTemperatureMv), true);

console.log('heatCapacityTeachingProfile tests passed');
