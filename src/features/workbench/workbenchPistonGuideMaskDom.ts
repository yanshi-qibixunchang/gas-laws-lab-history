import { type PistonOscillationGuideStrongTargetId, getPistonOscillationGuideStrongContextKind } from '../pistonOscillation/pistonOscillationGuidePresentation.ts';
import { type PistonOscillationGuideStrongMaskLayout, type PistonOscillationGuideStrongCutout, clampPistonOscillationGuideCutout } from './workbenchPistonGuideMaskGeometry.ts';

export const PISTON_OSCILLATION_GUIDE_STRONG_TARGET_SELECTORS: Partial<
Record<PistonOscillationGuideStrongTargetId, string>
> = {
  settings: '.piston-acquisition-settings',
  heightStageAction: '[data-piston-guide-target="height-stage-action"]',
  operationMirror: '[data-piston-focus-operation-mirror="true"]',
  primary: '[data-piston-guide-target="primary"]',
  redo: '[data-piston-guide-target="redo"]',
  save: '[data-piston-guide-target="save"]',
  periodTool: '[data-piston-guide-target="period-tool"]',
  periodChart: '[data-piston-guide-target="period-chart"]',
  periodEndpoints: '[data-piston-guide-target="period-endpoints"]',
  periodAnswer: '[data-piston-guide-target="period-answer"]',
  periodNext: '[data-piston-guide-target="period-next"]',
};

export const getPistonOscillationGuideStrongMaskLayout = (
  root: HTMLElement,
  targetId: PistonOscillationGuideStrongTargetId,
): PistonOscillationGuideStrongMaskLayout | null => {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.width <= 0 || rootRect.height <= 0) return null;
  const localWidth = Math.max(1, root.clientWidth || root.offsetWidth);
  const localHeight = Math.max(1, root.clientHeight || root.offsetHeight);
  const scaleX = rootRect.width / localWidth;
  const scaleY = rootRect.height / localHeight;
  if (!Number.isFinite(scaleX) || scaleX <= 0 || !Number.isFinite(scaleY) || scaleY <= 0) {
    return null;
  }
  const toLocalX = (viewportX: number) => (viewportX - rootRect.left) / scaleX;
  const toLocalY = (viewportY: number) => (viewportY - rootRect.top) / scaleY;
  const dockHeaders = Array.from(root.querySelectorAll<HTMLElement>('.studio-dock-header'));
  const dockHeaderBottom = Math.max(0, Math.round(Math.max(
    0,
    ...dockHeaders.map((header) => toLocalY(header.getBoundingClientRect().bottom)),
  )));
  const top = root.classList.contains('studio-live-workspace-piston-processing')
    ? 0
    : dockHeaderBottom;
  const width = Math.max(1, Math.round(localWidth));
  const height = Math.max(1, Math.round(localHeight - top));
  const toCutout = (
    rect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>,
    padding: number,
    rx: number,
  ): PistonOscillationGuideStrongCutout | null => {
    const x = clampPistonOscillationGuideCutout(toLocalX(rect.left) - padding, 0, width - 1);
    const y = clampPistonOscillationGuideCutout(toLocalY(rect.top) - top - padding, 0, height - 1);
    const right = clampPistonOscillationGuideCutout(
      toLocalX(rect.right) + padding,
      x + 1,
      width,
    );
    const bottom = clampPistonOscillationGuideCutout(
      toLocalY(rect.bottom) - top + padding,
      y + 1,
      height,
    );
    if (right <= x || bottom <= y) return null;
    return { x, y, width: right - x, height: bottom - y, rx };
  };
  const stage = root.querySelector<HTMLElement>('[data-piston-oscillation-interaction-workspace="true"]');
  const projectedCutout = (
    xAttribute: string | undefined,
    yAttribute: string | undefined,
    targetWidth: number,
    targetHeight: number,
    rx: number,
  ): PistonOscillationGuideStrongCutout | null => {
    if (!stage) return null;
    const projectedX = Number(xAttribute);
    const projectedY = Number(yAttribute);
    if (!Number.isFinite(projectedX) || !Number.isFinite(projectedY)) return null;
    const stageRect = stage.getBoundingClientRect();
    const stageLeft = toLocalX(stageRect.left);
    const stageTop = toLocalY(stageRect.top) - top;
    const stageWidth = stageRect.width / scaleX;
    const stageHeight = stageRect.height / scaleY;
    const centerX = stageLeft + ((projectedX + 1) / 2) * stageWidth;
    const centerY = stageTop + ((1 - projectedY) / 2) * stageHeight;
    const x = clampPistonOscillationGuideCutout(centerX - targetWidth / 2, 0, width - 1);
    const y = clampPistonOscillationGuideCutout(centerY - targetHeight / 2, 0, height - 1);
    return {
      x,
      y,
      width: Math.min(targetWidth, width - x),
      height: Math.min(targetHeight, height - y),
      rx,
    };
  };
  const projectedBoundsCutout = (
    leftAttribute: string | undefined,
    topAttribute: string | undefined,
    rightAttribute: string | undefined,
    bottomAttribute: string | undefined,
    padding: number,
    rx: number,
  ): PistonOscillationGuideStrongCutout | null => {
    if (!stage) return null;
    const projectedLeft = Number(leftAttribute);
    const projectedTop = Number(topAttribute);
    const projectedRight = Number(rightAttribute);
    const projectedBottom = Number(bottomAttribute);
    if (
      !Number.isFinite(projectedLeft)
      || !Number.isFinite(projectedTop)
      || !Number.isFinite(projectedRight)
      || !Number.isFinite(projectedBottom)
      || projectedRight <= projectedLeft
      || projectedTop <= projectedBottom
    ) return null;
    const stageRect = stage.getBoundingClientRect();
    const stageLeft = toLocalX(stageRect.left);
    const stageTop = toLocalY(stageRect.top) - top;
    const stageWidth = stageRect.width / scaleX;
    const stageHeight = stageRect.height / scaleY;
    const rawLeft = stageLeft + ((projectedLeft + 1) / 2) * stageWidth - padding;
    const rawTop = stageTop + ((1 - projectedTop) / 2) * stageHeight - padding;
    const rawRight = stageLeft + ((projectedRight + 1) / 2) * stageWidth + padding;
    const rawBottom = stageTop + ((1 - projectedBottom) / 2) * stageHeight + padding;
    const x = clampPistonOscillationGuideCutout(rawLeft, 0, width - 1);
    const y = clampPistonOscillationGuideCutout(rawTop, 0, height - 1);
    const right = clampPistonOscillationGuideCutout(rawRight, x + 1, width);
    const bottom = clampPistonOscillationGuideCutout(rawBottom, y + 1, height);
    return { x, y, width: right - x, height: bottom - y, rx };
  };
  const selector = PISTON_OSCILLATION_GUIDE_STRONG_TARGET_SELECTORS[targetId];
  const target = selector ? root.querySelector<HTMLElement>(selector) : null;
  let cutout: PistonOscillationGuideStrongCutout | null = null;
  if (target) {
    const rect = target.getBoundingClientRect();
    const isPeriodChart = targetId === 'periodChart';
    const padding = isPeriodChart ? 0 : targetId === 'operationMirror' ? 6 : 10;
    cutout = toCutout(
      rect,
      padding,
      isPeriodChart || targetId === 'operationMirror' ? 2 : 8,
    );
  }
  if (!cutout && stage && targetId === 'platform') {
    cutout = projectedCutout(
      stage.dataset.pistonFocusPlatformX,
      stage.dataset.pistonFocusPlatformY,
      154,
      92,
      18,
    );
  }
  if (!cutout && stage && targetId === 'powerButton') {
    cutout = projectedBoundsCutout(
      stage.dataset.pistonPowerButtonLeft,
      stage.dataset.pistonPowerButtonTop,
      stage.dataset.pistonPowerButtonRight,
      stage.dataset.pistonPowerButtonBottom,
      6,
      8,
    );
  }
  if (!cutout && stage && (
    targetId === 'hoseDisconnect' || targetId === 'hoseReconnect'
  )) {
    const attributePrefix = targetId === 'hoseDisconnect'
      ? 'pistonFocusHoseConnectedHandle'
      : 'pistonFocusHoseDetachedHandle';
    cutout = projectedBoundsCutout(
      stage.dataset[`${attributePrefix}Left`],
      stage.dataset[`${attributePrefix}Top`],
      stage.dataset[`${attributePrefix}Right`],
      stage.dataset[`${attributePrefix}Bottom`],
      8,
      18,
    );
  }
  if (!cutout) return null;

  const contextCutouts: PistonOscillationGuideStrongCutout[] = [];
  const contextKind = getPistonOscillationGuideStrongContextKind(targetId);
  if (contextKind === 'scaleMirror') {
    const mirror = root.querySelector<HTMLElement>('[data-piston-focus-operation-mirror="true"]');
    const mirrorCutout = mirror ? toCutout(mirror.getBoundingClientRect(), 4, 2) : null;
    if (mirrorCutout) contextCutouts.push(mirrorCutout);
  } else if (contextKind === 'mainScrew' && stage) {
    const mainScrewCutout = projectedCutout(
      stage.dataset.pistonFocusMainScrewX,
      stage.dataset.pistonFocusMainScrewY,
      92,
      72,
      30,
    );
    if (mainScrewCutout) contextCutouts.push(mainScrewCutout);
  }
  const obstacleSelectors = [
    '[data-piston-operation-visualization-toggle-shell="true"]',
    '[data-piston-oscillation-guide-step-panel="true"]',
    '[data-piston-focus-panel]',
    '[data-piston-focus-interaction-hints="true"]',
    '[data-piston-focus-operation-mirror="true"]',
    '.piston-acquisition-panel-heading',
    '.piston-acquisition-settings',
    '.piston-acquisition-live-readout',
    '.piston-acquisition-chart-wrap',
    '.piston-acquisition-actions',
    '.piston-acquisition-note',
    '.piston-processing-run-list',
    '.piston-processing-selection-heading',
    '.piston-processing-calculation',
    '.piston-processing-footer',
    '.studio-live-workspace-resizer',
  ];
  const protectedObstacles = obstacleSelectors.flatMap((obstacleSelector) => (
    Array.from(root.querySelectorAll<HTMLElement>(obstacleSelector))
      .map((element) => toCutout(element.getBoundingClientRect(), 8, 0))
      .filter((rect): rect is PistonOscillationGuideStrongCutout => rect !== null)
  ));
  const obstacles = [...protectedObstacles];
  obstacles.push(cutout, ...contextCutouts);
  const renderedStrongCard = root.querySelector<HTMLElement>(
    '.studio-piston-guide-strong-mask .studio-heat-guide-strong-card',
  );
  const renderedStrongCardCompact = renderedStrongCard?.classList.contains(
    'studio-piston-guide-strong-card-compact',
  ) ?? false;
  const renderedStrongCardHeight = renderedStrongCard?.offsetHeight ?? null;
  const resizer = root.querySelector<HTMLElement>('.studio-live-workspace-resizer');
  const dividerX = resizer
    ? toLocalX(resizer.getBoundingClientRect().left)
    : width / 2;
  const preferRightPane = targetId === 'powerButton'
    || targetId === 'platform'
    || targetId === 'heightStageAction'
    || targetId === 'operationMirror'
    || targetId === 'hoseDisconnect'
    || targetId === 'hoseReconnect';
  const chooseCard = (
    compact: boolean,
    placementObstacles: PistonOscillationGuideStrongCutout[] = obstacles,
  ) => {
    const cardWidth = Math.min(compact ? 232 : 340, Math.max(210, width - 24));
    const estimatedCardHeight = compact ? 168 : 112;
    const cardHeight = renderedStrongCardHeight !== null
      && renderedStrongCardCompact === compact
      ? Math.max(estimatedCardHeight, renderedStrongCardHeight)
      : estimatedCardHeight;
    const contentLeft = 12;
    const contentTop = 12;
    const contentRight = Math.max(contentLeft, width - 12);
    const contentBottom = Math.max(contentTop, height - 12);
    const expandedObstacles = placementObstacles.map((obstacle) => ({
      left: Math.max(contentLeft, obstacle.x - 6),
      right: Math.min(contentRight, obstacle.x + obstacle.width + 6),
      top: Math.max(contentTop, obstacle.y - 6),
      bottom: Math.min(contentBottom, obstacle.y + obstacle.height + 6),
    })).filter((obstacle) => obstacle.right > obstacle.left && obstacle.bottom > obstacle.top);
    const xEdges = Array.from(new Set([
      contentLeft,
      contentRight,
      ...expandedObstacles.flatMap((obstacle) => [obstacle.left, obstacle.right]),
    ])).sort((first, second) => first - second);
    const candidates: {
      left: number;
      top: number;
      width: number;
      height: number;
      area: number;
      preferred: boolean;
    }[] = [];
    for (let leftIndex = 0; leftIndex < xEdges.length - 1; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < xEdges.length; rightIndex += 1) {
        const left = xEdges[leftIndex];
        const right = xEdges[rightIndex];
        const availableWidth = right - left;
        if (availableWidth < cardWidth) continue;
        const blockingIntervals = expandedObstacles
          .filter((obstacle) => obstacle.left < right && obstacle.right > left)
          .map((obstacle) => ({ top: obstacle.top, bottom: obstacle.bottom }))
          .sort((first, second) => first.top - second.top);
        const freeIntervals: { top: number; bottom: number }[] = [];
        let freeTop = contentTop;
        for (const interval of blockingIntervals) {
          if (interval.top > freeTop) freeIntervals.push({ top: freeTop, bottom: interval.top });
          freeTop = Math.max(freeTop, interval.bottom);
        }
        if (freeTop < contentBottom) freeIntervals.push({ top: freeTop, bottom: contentBottom });
        for (const interval of freeIntervals) {
          const availableHeight = interval.bottom - interval.top;
          if (availableHeight < cardHeight) continue;
          const centerX = left + availableWidth / 2;
          candidates.push({
            left,
            top: interval.top,
            width: availableWidth,
            height: availableHeight,
            area: availableWidth * availableHeight,
            preferred: preferRightPane ? centerX > dividerX : centerX < dividerX,
          });
        }
      }
    }
    const preferredCandidates = candidates.filter((candidate) => candidate.preferred);
    const availableCandidates = preferredCandidates.length > 0 ? preferredCandidates : candidates;
    const largest = availableCandidates.reduce<(typeof candidates)[number] | null>(
      (best, candidate) => !best || candidate.area > best.area ? candidate : best,
      null,
    );
    if (!largest) return null;
    return {
      x: Math.round(largest.left + (largest.width - cardWidth) / 2),
      y: Math.round(largest.top + (largest.height - cardHeight) / 2),
      width: cardWidth,
      compact,
    };
  };
  const selectedCard = chooseCard(false)
    ?? chooseCard(true)
    ?? chooseCard(true, protectedObstacles)
    ?? {
      x: preferRightPane
        ? Math.max(12, width - Math.min(232, width - 24) - 12)
        : 12,
      y: 12,
      width: Math.min(232, width - 24),
      compact: true,
    };
  return {
    top,
    width,
    height,
    cutout,
    contextCutouts,
    card: {
      x: selectedCard.x,
      y: selectedCard.y,
      width: selectedCard.width,
      compact: selectedCard.compact,
    },
  };
};
