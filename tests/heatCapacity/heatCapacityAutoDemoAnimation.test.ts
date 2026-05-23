import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_AUTO_DEMO_ANIMATION_COMMIT_INTERVAL_MS,
  shouldCommitHeatCapacityAutoDemoAnimationFrame,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemoAnimation.ts';

assert.equal(HEAT_CAPACITY_AUTO_DEMO_ANIMATION_COMMIT_INTERVAL_MS, 33);

assert.equal(
  shouldCommitHeatCapacityAutoDemoAnimationFrame({
    timestampMs: 1_000,
    lastCommitTimestampMs: null,
    progress: 0,
  }),
  true,
  'the first animation frame should always commit state',
);

assert.equal(
  shouldCommitHeatCapacityAutoDemoAnimationFrame({
    timestampMs: 1_012,
    lastCommitTimestampMs: 1_000,
    progress: 0.5,
  }),
  false,
  'animation frames inside the commit interval should skip React state writes',
);

assert.equal(
  shouldCommitHeatCapacityAutoDemoAnimationFrame({
    timestampMs: 1_033,
    lastCommitTimestampMs: 1_000,
    progress: 0.5,
  }),
  true,
  'animation frames at the commit interval should write state',
);

assert.equal(
  shouldCommitHeatCapacityAutoDemoAnimationFrame({
    timestampMs: 1_010,
    lastCommitTimestampMs: 1_000,
    progress: 1,
  }),
  true,
  'the final animation frame should always commit the completed state',
);

console.log('heatCapacityAutoDemoAnimation tests passed');
