import assert from 'node:assert/strict';
import {
  createHeatCapacityHardSphereMainReleaseSchedule,
  createHeatCapacityHardSpherePostExchangeSchedule,
  getHeatCapacityHardSphereScheduleFrame,
  stopHeatCapacityHardSphereSchedule,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereReleaseSchedule.ts';

const mainSchedule = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-a',
  amountBeforeRatio: 1.08,
  amountCurrentRatio: 1.08,
  amountTargetRatio: 1,
  particleMultiplier: 1,
  elapsedS: 0,
});

assert.equal(
  mainSchedule.phase,
  'main-release',
  'a visible amount drop should create a main release schedule',
);
assert.equal(
  mainSchedule.durationS >= 0.18 && mainSchedule.durationS <= 0.32,
  true,
  'main release should use a short visual burst window',
);
assert.equal(
  mainSchedule.targetExitCount >= Math.floor(mainSchedule.totalPlannedExitCount * 0.7) &&
    mainSchedule.targetExitCount <= Math.ceil(mainSchedule.totalPlannedExitCount * 0.82),
  true,
  'main release should own a fast majority while reserving a visible slow tail',
);
assert.equal(
  mainSchedule.postExchangeReservedCount >= Math.floor(mainSchedule.totalPlannedExitCount * 0.18),
  true,
  'post-release exchange should keep a visible share of the pumped-in particles',
);
assert.equal(
  mainSchedule.exitSpeed >= 4.2 && mainSchedule.exitSpeed <= 5.6,
  true,
  'main release should use a deliberately fast fixed exit speed',
);
assert.equal(
  mainSchedule.amountBeforeParticleCount - mainSchedule.targetExitCount > mainSchedule.baselineParticleCount,
  true,
  'the fast release should leave the bottle above its baseline particle count',
);

const highQualityMainSchedule = createHeatCapacityHardSphereMainReleaseSchedule({
  id: 'release-high-quality',
  amountBeforeRatio: 1.08,
  amountCurrentRatio: 1.08,
  amountTargetRatio: 1,
  particleMultiplier: 1.25,
  elapsedS: 0,
});
assert.equal(
  highQualityMainSchedule.totalPlannedExitCount <= highQualityMainSchedule.addedParticleCount,
  true,
  'high-particle presets should release only particles added by pumping',
);
assert.equal(
  highQualityMainSchedule.amountBeforeParticleCount - highQualityMainSchedule.targetExitCount >
    highQualityMainSchedule.baselineParticleCount,
  true,
  'high-particle presets should still keep more particles than the baseline after the fast release',
);
assert.equal(
  highQualityMainSchedule.releaseMinimumParticleCount,
  highQualityMainSchedule.baselineParticleCount,
  'the release schedule should expose the current preset baseline as a hard lower bound',
);

const firstFrame = getHeatCapacityHardSphereScheduleFrame(mainSchedule, 0.08);
assert.equal(
  firstFrame.expectedExitedCount >= Math.ceil(mainSchedule.targetExitCount * 0.6),
  true,
  'at least 60% of the main-release budget should be selected in the first 80 ms',
);
assert.equal(
  firstFrame.expectedExitedCount < mainSchedule.targetExitCount,
  true,
  'the first burst frame should still leave some particles for the rest of the burst',
);

const lateFrame = getHeatCapacityHardSphereScheduleFrame(mainSchedule, mainSchedule.durationS + 0.1);
assert.equal(
  lateFrame.expectedExitedCount,
  mainSchedule.targetExitCount,
  'the completed main release should emit the full fast-burst budget',
);

const stopped = stopHeatCapacityHardSphereSchedule(firstFrame, 'stopcock-closing');
assert.equal(stopped.phase, 'partial-stopped');
assert.equal(stopped.stopReason, 'stopcock-closing');
assert.equal(
  stopped.expectedExitedCount,
  firstFrame.expectedExitedCount,
  'closing the stopcock should preserve only particles already emitted by the visual schedule',
);

const exchangeSchedule = createHeatCapacityHardSpherePostExchangeSchedule({
  id: 'release-a-tail',
  reservedExitCount: mainSchedule.postExchangeReservedCount,
  releaseMinimumParticleCount: mainSchedule.releaseMinimumParticleCount,
  gasTemperatureK: 292.15,
  ambientTemperatureK: 298.15,
  elapsedS: 0,
});

assert.equal(exchangeSchedule.phase, 'post-release-exchange');
assert.equal(
  exchangeSchedule.durationS >= 3 && exchangeSchedule.durationS <= 8,
  true,
  'post-release exchange should use the accepted 3-8 s visual estimate',
);
assert.equal(
  exchangeSchedule.targetExitCount,
  mainSchedule.postExchangeReservedCount,
  'post-release exchange should only consume the reserved slow tail',
);
assert.equal(
  exchangeSchedule.releaseMinimumParticleCount,
  mainSchedule.releaseMinimumParticleCount,
  'post-release exchange should carry the same baseline lower bound as the main release',
);
assert.equal(
  exchangeSchedule.exitSpeed >= 1 && exchangeSchedule.exitSpeed <= 1.6,
  true,
  'post-release exchange should use a slower fixed exit speed',
);

const zeroTailSchedule = createHeatCapacityHardSpherePostExchangeSchedule({
  id: 'release-b-tail',
  reservedExitCount: 0,
  gasTemperatureK: 297.9,
  ambientTemperatureK: 298.15,
  elapsedS: 0,
});
assert.equal(
  zeroTailSchedule.phase,
  'complete',
  'small temperature differences without reserved particles should not create a visible exchange tail',
);
