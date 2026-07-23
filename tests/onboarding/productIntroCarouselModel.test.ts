import assert from 'node:assert/strict';
import {
  PRODUCT_INTRO_AUTOPLAY_MS,
  PRODUCT_INTRO_CARD_COUNT,
  PRODUCT_INTRO_WORKSPACE_DEMO_MS,
  moveProductIntroCard,
} from '../../src/features/onboarding/productIntroCarouselModel.ts';

assert.equal(PRODUCT_INTRO_AUTOPLAY_MS, 6_000);
assert.equal(PRODUCT_INTRO_WORKSPACE_DEMO_MS, 4_800);
assert.equal(PRODUCT_INTRO_CARD_COUNT, 3);
assert.equal(moveProductIntroCard(0, 1), 1);
assert.equal(moveProductIntroCard(2, 1), 0);
assert.equal(moveProductIntroCard(0, -1), 2);
assert.equal(moveProductIntroCard(7, 1, 0), 0);

console.log('productIntroCarouselModel tests passed');
