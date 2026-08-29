import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_BOTTOM_IMPACT_FULL_SCALE_DROP_MM,
  PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM,
  PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN,
  PistonOscillationScrewGrainAccumulator,
  getPistonOscillationBottomImpactGain,
  getPistonOscillationMechanicalVariation,
  getPistonOscillationVibrationVariation,
} from '../../src/audio/experiments/pistonOscillation/pistonOscillationAudioPolicy.ts';

const accumulator = new PistonOscillationScrewGrainAccumulator();
assert.equal(accumulator.consume(PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN - 1), 0);
assert.equal(accumulator.consume(1), 1);
assert.equal(accumulator.consume(-PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN * 2.5), 2);
assert.equal(accumulator.consume(PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN * 0.5), 1);
accumulator.reset();
assert.equal(accumulator.consume(Number.NaN), 0);
assert.equal(accumulator.consume(PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN), 1);

const slowMechanical = getPistonOscillationMechanicalVariation(-1, -1);
const fastMechanical = getPistonOscillationMechanicalVariation(2, 2);
assert.equal(slowMechanical.playbackRate, 0.97);
assert.equal(fastMechanical.playbackRate, 1.03);
assert.ok(slowMechanical.gain < 1);
assert.ok(fastMechanical.gain > 1);

const slowVibration = getPistonOscillationVibrationVariation(0, 0);
const fastVibration = getPistonOscillationVibrationVariation(1, 1);
assert.equal(slowVibration.playbackRate, 0.985);
assert.equal(fastVibration.playbackRate, 1.015);

assert.equal(getPistonOscillationBottomImpactGain(Number.NaN), 0);
assert.equal(getPistonOscillationBottomImpactGain(0), 0);
assert.equal(
  getPistonOscillationBottomImpactGain(PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM),
  0,
  'a drop of exactly 5 mm should remain silent',
);
assert.ok(
  getPistonOscillationBottomImpactGain(PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM + 0.01) > 0,
  'the impact gate should be strictly greater than 5 mm',
);
const heightAnchors = [6, 10, 20, 40, 60, 80];
const gains = heightAnchors.map(getPistonOscillationBottomImpactGain);
for (let index = 1; index < gains.length; index += 1) {
  assert.ok(gains[index] > gains[index - 1], 'impact gain should increase monotonically');
}
assert.equal(
  getPistonOscillationBottomImpactGain(
    PISTON_OSCILLATION_BOTTOM_IMPACT_FULL_SCALE_DROP_MM,
  ),
  1,
);
assert.equal(getPistonOscillationBottomImpactGain(500), 1);

console.log('pistonOscillationAudioPolicy tests passed');
