export const PRODUCT_INTRO_CARD_COUNT = 3;
export const PRODUCT_INTRO_AUTOPLAY_MS = 6_000;
export const PRODUCT_INTRO_WORKSPACE_DEMO_MS = 4_800;
export const PRODUCT_INTRO_MODES_DEMO_MS = 5_200;

export const moveProductIntroCard = (
  currentIndex: number,
  direction: -1 | 1,
  cardCount = PRODUCT_INTRO_CARD_COUNT,
) => {
  if (!Number.isInteger(cardCount) || cardCount <= 0) return 0;
  return (currentIndex + direction + cardCount) % cardCount;
};
