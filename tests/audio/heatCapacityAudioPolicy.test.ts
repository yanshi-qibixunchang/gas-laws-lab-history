import assert from 'node:assert/strict';
import { HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA } from '../../src/domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS,
  HEAT_CAPACITY_RECORD_WRITING_MIN_INTERVAL_MS,
  HEAT_CAPACITY_RELEASE_SOUND_FULL_SCALE_KPA,
  HEAT_CAPACITY_ZERO_KNOB_CALIBRATED_DEGREES_PER_TICK,
  HEAT_CAPACITY_ZERO_KNOB_MIN_DEGREES_PER_TICK,
  HEAT_CAPACITY_ZERO_KNOB_RATE_ANCHORS_HZ,
  HEAT_CAPACITY_ZERO_KNOB_SPEED_ANCHORS_DEG_PER_S,
  HeatCapacityKnobTickAccumulator,
  getHeatCapacityMechanicalVariation,
  getHeatCapacityZeroKnobAudioProfile,
  getHeatCapacityReleaseLowpassHz,
  getHeatCapacityReleaseSoundIntensity,
  shouldPlayHeatCapacityReleaseSound,
} from '../../src/audio/experiments/heatCapacity/heatCapacityAudioPolicy.ts';

assert.equal(HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS, 125);
assert.equal(HEAT_CAPACITY_RECORD_WRITING_MIN_INTERVAL_MS, 250);
assert.equal(HEAT_CAPACITY_ZERO_KNOB_MIN_DEGREES_PER_TICK, 4);
assert.equal(HEAT_CAPACITY_ZERO_KNOB_CALIBRATED_DEGREES_PER_TICK, 10);
assert.deepEqual(HEAT_CAPACITY_ZERO_KNOB_SPEED_ANCHORS_DEG_PER_S, [20, 40, 80, 160]);
assert.deepEqual(HEAT_CAPACITY_ZERO_KNOB_RATE_ANCHORS_HZ, [2, 4, 8, 16]);

const baseReleaseState = {
  releasePathOpen: true,
  paused: false,
  pressureDeltaKPa: 6,
  audioEnabled: true,
};
assert.equal(shouldPlayHeatCapacityReleaseSound(baseReleaseState), true);
assert.equal(shouldPlayHeatCapacityReleaseSound({ ...baseReleaseState, releasePathOpen: false }), false);
assert.equal(shouldPlayHeatCapacityReleaseSound({ ...baseReleaseState, paused: true }), false);
assert.equal(shouldPlayHeatCapacityReleaseSound({ ...baseReleaseState, audioEnabled: false }), false);
assert.equal(shouldPlayHeatCapacityReleaseSound({
  ...baseReleaseState,
  pressureDeltaKPa: HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
}), false, 'release audio should use the same near-ambient threshold as the physical release model');
assert.equal(shouldPlayHeatCapacityReleaseSound({
  ...baseReleaseState,
  pressureDeltaKPa: HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA + 0.001,
}), true);

assert.equal(getHeatCapacityReleaseSoundIntensity(0), 0);
assert.equal(getHeatCapacityReleaseSoundIntensity(6, 0), 0);
assert.equal(getHeatCapacityReleaseSoundIntensity(HEAT_CAPACITY_RELEASE_SOUND_FULL_SCALE_KPA), 1);
assert.ok(getHeatCapacityReleaseSoundIntensity(2) < getHeatCapacityReleaseSoundIntensity(6));
assert.ok(getHeatCapacityReleaseLowpassHz(0) < getHeatCapacityReleaseLowpassHz(6));

const accumulator = new HeatCapacityKnobTickAccumulator();
assert.equal(accumulator.consume(1.5, 4), 0);
assert.equal(accumulator.consume(-1.5, 4), 0);
assert.equal(accumulator.consume(1.1, 4), 1, 'slow coarse motion should preserve fractional progress to the next tick');
accumulator.reset();
assert.equal(accumulator.consume(15.9, 16), 0);
assert.equal(accumulator.consume(0.2, 16), 1);
assert.equal(accumulator.consume(64.1, 32), 2);

const verySlowKnobProfile = getHeatCapacityZeroKnobAudioProfile(0.1);
const anchorKnobProfiles = HEAT_CAPACITY_ZERO_KNOB_SPEED_ANCHORS_DEG_PER_S.map(
  (speed) => getHeatCapacityZeroKnobAudioProfile(speed),
);
const beyondFastKnobProfile = getHeatCapacityZeroKnobAudioProfile(640);
assert.ok(verySlowKnobProfile.degreesPerTick >= 4 && verySlowKnobProfile.degreesPerTick < 10,
  'very slow drag should progressively refine toward the four-degree feedback floor');
assert.deepEqual(anchorKnobProfiles.map((profile) => profile.degreesPerTick), [10, 10, 10, 10]);
assert.deepEqual(anchorKnobProfiles.map((profile) => profile.targetRateHz), [2, 4, 8, 16]);
assert.equal(anchorKnobProfiles[1].targetRateHz / anchorKnobProfiles[0].targetRateHz, 2);
assert.equal(anchorKnobProfiles[2].targetRateHz / anchorKnobProfiles[0].targetRateHz, 4);
assert.equal(anchorKnobProfiles[3].targetRateHz / anchorKnobProfiles[0].targetRateHz, 8);
assert.equal(beyondFastKnobProfile.targetRateHz, 32,
  'speed above 160 degrees per second should keep increasing with square-root compression');
assert.equal(beyondFastKnobProfile.degreesPerTick, 20);
assert.ok(anchorKnobProfiles[3].itemDurationMs < anchorKnobProfiles[0].itemDurationMs,
  'fast drag should shorten each detent tail to preserve audible gaps');

assert.deepEqual(getHeatCapacityMechanicalVariation(0, 0), {
  playbackRate: 0.97,
  gain: 10 ** (-0.8 / 20),
});
assert.deepEqual(getHeatCapacityMechanicalVariation(1, 1), {
  playbackRate: 1.03,
  gain: 10 ** (0.8 / 20),
});

console.log('heatCapacityAudioPolicy tests passed');
