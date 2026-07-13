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
  particleCountScale: 0.525,
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
  mainSchedule.exitAssignmentCount > 0,
  true,
  'the main release should expose one canonical directed exit assignment count',
);
assert.equal(
  mainSchedule.exitSpeed,
  HEAT_CAPACITY_HARD_SPHERE_RELEASE_VISUAL_PROFILE.exitSpeed,
  'all modes should use the centralized release exit speed',
);
assert.equal(
  mainSchedule.amountBeforeParticleCount - mainSchedule.exitAssignmentCount >= mainSchedule.baselineParticleCount,
  true,
  'the release must never consume particles below the current preset baseline',
);
assert.equal(mainSchedule.baselineParticleCount, 22, 'the conservative Ultra profile should start near 22 particles');

const highQualityMainSchedule = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-high-quality',
  amountBeforeRatio: 1.08,
  amountCurrentRatio: 1.08,
  amountTargetRatio: 1,
  particleMultiplier: 1.25,
  particleCountScale: 0.525,
  elapsedS: 0,
  durationS: standardDurationS,
});
assert.equal(
  highQualityMainSchedule.exitAssignmentCount <= highQualityMainSchedule.addedParticleCount,
  true,
  'high-particle presets should release only particles added by pumping',
);
assert.equal(
  highQualityMainSchedule.releaseMinimumParticleCount,
  highQualityMainSchedule.baselineParticleCount,
);

const firstFrame = getHeatCapacityHardSphereScheduleFrame(mainSchedule, 1 / 120);
assert.equal(
  firstFrame.exitAssignmentCount,
  mainSchedule.exitAssignmentCount,
  'the release should assign the complete deterministic exit cohort immediately without hiding it immediately',
);

const lateFrame = getHeatCapacityHardSphereScheduleFrame(mainSchedule, standardDurationS + 0.1);
assert.equal(lateFrame.exitAssignmentCount, mainSchedule.exitAssignmentCount);
assert.equal(lateFrame.progress, 1);

const feedbackDrivenFrame = getHeatCapacityHardSphereScheduleFrame(
  mainSchedule,
  standardDurationS,
  0.25,
);
assert.equal(feedbackDrivenFrame.progress, 0.25);
assert.equal(
  feedbackDrivenFrame.exitAssignmentCount,
  mainSchedule.exitAssignmentCount,
  'pressure progress should not postpone the visible exit cohort until after the sound window',
);

const customDuration = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-custom-duration',
  amountBeforeRatio: 1.08,
  amountCurrentRatio: 1.08,
  amountTargetRatio: 1,
  particleMultiplier: 1,
  particleCountScale: 0.525,
  elapsedS: 0.2,
  durationS: 0.5,
});
assert.equal(customDuration.durationS, 0.5);
assert.equal(customDuration.elapsedS, 0.2);

const oneStrokeSchedule = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-one-stroke',
  amountBeforeRatio: 1.00334,
  amountCurrentRatio: 1.00334,
  amountTargetRatio: 1,
  particleMultiplier: 1,
  particleCountScale: 0.525,
  elapsedS: 1 / 120,
  durationS: 0.3,
});
assert.equal(oneStrokeSchedule.baselineParticleCount, 22);
assert.equal(oneStrokeSchedule.amountBeforeParticleCount, 24);
assert.equal(oneStrokeSchedule.exitAssignmentCount, 2, 'even one pump stroke should own a visible two-particle release budget');

const standardEighteenStrokeSchedule = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-eighteen-strokes',
  amountBeforeRatio: 1 + 18 * 0.00334,
  amountCurrentRatio: 1 + 18 * 0.00334,
  amountTargetRatio: 1,
  particleMultiplier: 1,
  particleCountScale: 0.525,
  elapsedS: 1 / 120,
  durationS: 0.3,
});
assert.equal(standardEighteenStrokeSchedule.amountBeforeParticleCount, 47);
assert.equal(standardEighteenStrokeSchedule.exitAssignmentCount, 25);
assert.equal(
  standardEighteenStrokeSchedule.amountBeforeParticleCount - standardEighteenStrokeSchedule.exitAssignmentCount,
  standardEighteenStrokeSchedule.baselineParticleCount,
  'the scaled release schedule should return to the same 22-particle baseline used by the renderer',
);
