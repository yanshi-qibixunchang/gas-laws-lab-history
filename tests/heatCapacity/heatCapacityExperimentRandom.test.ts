import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  calculateAirHeatCapacityTargets,
  createHeatCapacityExperimentProfile,
} from '../../src/domain/heatCapacity/heatCapacityExperimentRandom.ts';

const seed = 3757384;
const profileSource = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityExperimentRandom.ts'),
  'utf8',
);

assert.match(profileSource, /export interface HeatCapacityTeachingProfile/, 'teaching preset type boundary should be named HeatCapacityTeachingProfile');
assert.match(profileSource, /Demo\/Guide-only teaching profile/, 'profile source should document that scripted preset fields belong only to Demo and Guide');
assert.match(profileSource, /createHeatCapacityExperimentProfile[\s\S]*\): HeatCapacityTeachingProfile =>/, 'profile generation should return the teaching-specific type boundary');

const first = createHeatCapacityExperimentProfile(seed);
const second = createHeatCapacityExperimentProfile(seed);
const third = createHeatCapacityExperimentProfile(seed + 1);

assert.deepEqual(first, second, 'same seed must reproduce the same experiment profile');
assert.notDeepEqual(first, third, 'new seed should create a different experiment profile');
assert.equal(first.theoreticalGamma, 1.4);
assert.equal(first.seed, seed);
assert.equal(first.u1MeasuredMv > 105 && first.u1MeasuredMv < 131, true);
assert.equal(first.u2MeasuredMv > 25 && first.u2MeasuredMv < first.u1MeasuredMv, true);
assert.equal(first.u0MeasuredMv >= -0.03 && first.u0MeasuredMv <= 0.03, true);
assert.equal(first.gammaTarget >= 1.36 && first.gammaTarget <= 1.44, true);
assert.equal(first.initialTemperatureMv >= 1498.8 && first.initialTemperatureMv <= 1499.3, true, 'initial U_T should match the FD-NCD-C room-temperature reference range');
assert.equal(first.ambientTemperatureMv, first.initialTemperatureMv, 'profile should explicitly carry the room-temperature baseline');
assert.equal(Math.abs(first.stableTemperatureMv - first.ambientTemperatureMv) <= 0.18, true, 'stable-before-release U_T should return to room temperature before U1');
assert.equal(first.releaseTemperatureLowMv < first.ambientTemperatureMv, true, 'release-low U_T should drop below the room-temperature baseline');
assert.equal(Math.abs(first.recoveryTemperatureMv - first.ambientTemperatureMv) <= 0.18, true, 'recovery U_T should return to room temperature before U2');
assert.equal(first.u2MeasuredMv / first.u1MeasuredMv > 0.24 && first.u2MeasuredMv / first.u1MeasuredMv < 0.32, true, 'air gamma data should keep U2 near 0.286 * U1 instead of hard-sphere 0.4 * U1');

const targets = calculateAirHeatCapacityTargets(first);
assert.equal(targets.gamma >= 1.36 && targets.gamma <= 1.44, true);
assert.equal(Math.abs(targets.gamma - (first.u1MeasuredMv / (first.u1MeasuredMv - first.u2MeasuredMv))) < 1e-9, true);

console.log('heatCapacityExperimentRandom tests passed');
