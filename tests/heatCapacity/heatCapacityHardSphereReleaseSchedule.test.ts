import assert from 'node:assert/strict';
import {
  createHeatCapacityHardSphereMainReleaseSchedule,
  getHeatCapacityHardSphereScheduleFrame,
  HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereReleaseSchedule.ts';

const standardDurationS = 0.375;
const mainSchedule = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-a',
  amountBeforeRatio: 1.08,
  amountCurrentRatio: 1.08,
  amountTargetRatio: 1,
  particleMultiplier: 1,
  elapsedS: 0,
  durationS: standardDurationS,
});

assert.equal(mainSchedule.phase, 'main-release');
assert.equal(
  mainSchedule.durationS,
  standardDurationS,
  'the visual release window should use the actual release timeline duration',
);
assert.equal(
  mainSchedule.targetExitCount,
  mainSchedule.totalPlannedExitCount,
  'the main release should own the whole directed exit budget without a slow exchange tail',
);
assert.equal(
  mainSchedule.exitSpeed,
  HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.exitSpeed,
  'all modes should use the centralized release exit speed',
);
assert.equal(
  mainSchedule.amountBeforeParticleCount - mainSchedule.targetExitCount >= mainSchedule.baselineParticleCount,
  true,
  'the release must never consume particles below the current preset baseline',
);

const highQualityMainSchedule = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-high-quality',
  amountBeforeRatio: 1.08,
  amountCurrentRatio: 1.08,
  amountTargetRatio: 1,
  particleMultiplier: 1.25,
  elapsedS: 0,
  durationS: standardDurationS,
});
assert.equal(
  highQualityMainSchedule.totalPlannedExitCount <= highQualityMainSchedule.addedParticleCount,
  true,
  'high-particle presets should release only particles added by pumping',
);
assert.equal(
  highQualityMainSchedule.releaseMinimumParticleCount,
  highQualityMainSchedule.baselineParticleCount,
);

const firstFrame = getHeatCapacityHardSphereScheduleFrame(mainSchedule, 0.08);
assert.equal(
  firstFrame.expectedExitedCount >= Math.ceil(mainSchedule.targetExitCount * 0.6),
  true,
  'the initial pressure burst should remain immediately visible',
);
assert.equal(firstFrame.expectedExitedCount < mainSchedule.targetExitCount, true);

const lateFrame = getHeatCapacityHardSphereScheduleFrame(mainSchedule, standardDurationS + 0.1);
assert.equal(lateFrame.expectedExitedCount, mainSchedule.targetExitCount);
assert.equal(lateFrame.stopReason, 'duration-complete');

const feedbackDrivenFrame = getHeatCapacityHardSphereScheduleFrame(
  mainSchedule,
  standardDurationS,
  0.25,
);
assert.equal(feedbackDrivenFrame.progress, 0.25);
assert.equal(
  feedbackDrivenFrame.expectedExitedCount,
  Math.ceil(mainSchedule.targetExitCount * 0.25),
  'shared pressure feedback should override wall-clock release progress for particle exits',
);

const customDuration = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-custom-duration',
  amountBeforeRatio: 1.08,
  amountCurrentRatio: 1.08,
  amountTargetRatio: 1,
  particleMultiplier: 1,
  elapsedS: 0.2,
  durationS: 0.5,
});
assert.equal(customDuration.durationS, 0.5);
assert.equal(customDuration.elapsedS, 0.2);
