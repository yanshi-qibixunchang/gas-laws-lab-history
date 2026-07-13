import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  advanceHeatCapacityReleaseState,
  beginHeatCapacityReleaseClosing,
  beginHeatCapacityReleaseOpening,
  createClosedHeatCapacityReleaseState,
  getHeatCapacityReleaseDurationS,
  getHeatCapacityReleaseNextTransitionAtS,
  isHeatCapacityMainReleaseFlowOpen,
  isHeatCapacityReleaseFlowOpen,
} from '../../src/domain/heatCapacity/heatCapacityReleaseModel.ts';

const openingDurationS = HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs / 1000;
const closingDurationS = HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs / 1000;

assert.deepEqual(HEAT_CAPACITY_RELEASE_TIMING, {
  openingAnimationDurationMs: 420,
  closingAnimationDurationMs: 420,
  releaseApertureRampS: 0.1,
  releaseOptimalMinS: 0.5,
  releaseOptimalMaxS: 0.7,
  autoDemoReleaseDurationS: 0.6,
});

const closed = createClosedHeatCapacityReleaseState(5);
const opening = beginHeatCapacityReleaseOpening(closed, 'release', 5);
assert.equal(opening.phase, 'opening');
assert.equal(isHeatCapacityReleaseFlowOpen(opening), false);
assert.equal(isHeatCapacityMainReleaseFlowOpen(opening), false);
assert.equal(getHeatCapacityReleaseDurationS(opening, 5 + openingDurationS - 0.001), 0);
assert.equal(getHeatCapacityReleaseNextTransitionAtS(opening), 5 + openingDurationS);

const almostOpen = advanceHeatCapacityReleaseState(
  opening,
  5 + openingDurationS - 0.001,
);
assert.equal(almostOpen.state.phase, 'opening');
assert.deepEqual(almostOpen.transitions, []);

const opened = advanceHeatCapacityReleaseState(opening, 5 + openingDurationS);
assert.equal(opened.state.phase, 'releasing');
assert.equal(opened.state.openingCompletedAtS, 5 + openingDurationS);
assert.equal(isHeatCapacityMainReleaseFlowOpen(opened.state), true);
assert.equal(getHeatCapacityReleaseDurationS(opened.state, 5 + openingDurationS), 0);

const normalCloseAtS = 5 + openingDurationS + HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS;
const closing = beginHeatCapacityReleaseClosing(opened.state, normalCloseAtS);
assert.equal(closing.phase, 'closing');
assert.equal(isHeatCapacityReleaseFlowOpen(closing), false, 'the close command must stop flow immediately');
assert.equal(closing.formedRelease, true);
assert.equal(closing.quickToggle, false);
assert.equal(
  Math.abs(closing.releaseDurationS - HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS) < 1e-9,
  true,
);
assert.equal(
  Math.abs(
    getHeatCapacityReleaseDurationS(closing, normalCloseAtS + closingDurationS) -
      HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
  ) < 1e-9,
  true,
  'the closing animation must not extend release duration',
);
const closedAfterRelease = advanceHeatCapacityReleaseState(
  closing,
  normalCloseAtS + closingDurationS,
).state;
assert.equal(closedAfterRelease.phase, 'closedAfterRelease');
assert.equal(
  Math.abs(closedAfterRelease.releaseDurationS - HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS) < 1e-9,
  true,
);

const quickOpening = beginHeatCapacityReleaseOpening(
  createClosedHeatCapacityReleaseState(20),
  'release',
  20,
);
const quickClose = beginHeatCapacityReleaseClosing(
  quickOpening,
  20 + openingDurationS / 2,
);
assert.equal(quickClose.phase, 'closing');
assert.equal(quickClose.quickToggle, true);
assert.equal(quickClose.formedRelease, false);
assert.equal(quickClose.releaseDurationS, 0);
assert.equal(quickClose.openingCompletedAtS, null);
assert.equal(isHeatCapacityReleaseFlowOpen(quickClose), false);

const quickClosed = advanceHeatCapacityReleaseState(
  quickClose,
  20 + openingDurationS / 2 + closingDurationS,
).state;
assert.equal(quickClosed.phase, 'closed');
const retryOpening = beginHeatCapacityReleaseOpening(quickClosed, 'release', 22);
assert.equal(retryOpening.phase, 'opening');
assert.equal(retryOpening.attemptId, quickOpening.attemptId + 1);
const retryReleasing = advanceHeatCapacityReleaseState(
  retryOpening,
  22 + openingDurationS,
).state;
const retryClosing = beginHeatCapacityReleaseClosing(
  retryReleasing,
  22 + openingDurationS + HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS,
);
assert.equal(retryClosing.formedRelease, true);
assert.equal(retryClosing.quickToggle, false);
assert.equal(
  Math.abs(retryClosing.releaseDurationS - HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS) < 1e-9,
  true,
);

const zeroingOpening = beginHeatCapacityReleaseOpening(
  createClosedHeatCapacityReleaseState(),
  'zeroing',
  0,
);
const zeroingOpen = advanceHeatCapacityReleaseState(zeroingOpening, openingDurationS).state;
assert.equal(zeroingOpen.phase, 'open');
assert.equal(isHeatCapacityReleaseFlowOpen(zeroingOpen), true);
assert.equal(isHeatCapacityMainReleaseFlowOpen(zeroingOpen), false);
assert.equal(zeroingOpen.formedRelease, false);

console.log('heatCapacityReleaseModel tests passed');
