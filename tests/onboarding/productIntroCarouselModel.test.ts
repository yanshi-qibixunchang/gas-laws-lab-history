import assert from 'node:assert/strict';
import {
  PRODUCT_INTRO_AUTOPLAY_MS,
  PRODUCT_INTRO_CARD_COUNT,
  PRODUCT_INTRO_CONTENT_PLAYBACK_RATE,
  PRODUCT_INTRO_WORKSPACE_BASE_DEMO_MS,
  PRODUCT_INTRO_WORKSPACE_DEMO_MS,
  PRODUCT_INTRO_WORKSPACE_POINTER_TIMELINE_MS,
  PRODUCT_INTRO_WORKSPACE_POST_CLICK_DELAY_MS,
  moveProductIntroCard,
} from '../../src/features/onboarding/productIntroCarouselModel.ts';
import {
  getProductIntroOutcomePlaybackRate,
  PRODUCT_INTRO_OUTCOME_CALCULATION_PLAYBACK_RATE,
  PRODUCT_INTRO_OUTCOME_DURATION_MS,
  PRODUCT_INTRO_OUTCOME_REVIEW_PLAYBACK_RATE,
  PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS,
} from '../../src/features/onboarding/productIntroOutcomeTimeline.ts';

assert.equal(PRODUCT_INTRO_AUTOPLAY_MS, 6_000);
assert.equal(PRODUCT_INTRO_CONTENT_PLAYBACK_RATE, 0.7);
assert.equal(PRODUCT_INTRO_WORKSPACE_BASE_DEMO_MS, 4_800);
assert.equal(PRODUCT_INTRO_WORKSPACE_POINTER_TIMELINE_MS, 6_857);
assert.equal(PRODUCT_INTRO_WORKSPACE_POST_CLICK_DELAY_MS, 278);
assert.equal(PRODUCT_INTRO_WORKSPACE_DEMO_MS, 5_078);
assert.equal(PRODUCT_INTRO_OUTCOME_CALCULATION_PLAYBACK_RATE, 0.7);
assert.equal(PRODUCT_INTRO_OUTCOME_REVIEW_PLAYBACK_RATE, 0.91);
assert.equal(PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS, 3_900);
assert.equal(PRODUCT_INTRO_OUTCOME_DURATION_MS, 9_500);
assert.equal(getProductIntroOutcomePlaybackRate(3.899), 0.7);
assert.equal(getProductIntroOutcomePlaybackRate(3.9), 0.91);
assert.equal(PRODUCT_INTRO_CARD_COUNT, 3);
assert.equal(moveProductIntroCard(0, 1), 1);
assert.equal(moveProductIntroCard(2, 1), 0);
assert.equal(moveProductIntroCard(0, -1), 2);
assert.equal(moveProductIntroCard(7, 1, 0), 0);

console.log('productIntroCarouselModel tests passed');
