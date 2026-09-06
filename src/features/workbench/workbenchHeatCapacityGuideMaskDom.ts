import { type HeatCapacityGuideStrongDomCutout, type HeatCapacityGuideStrongTargetSpec } from './workbenchHeatCapacityGuidePresentation.ts';
import { type HeatCapacityGuideStrongCutout } from './workbenchHeatCapacityGuideMaskGeometry.ts';

export const getHeatCapacityGuideDomCutout = (
  maskRoot: HTMLElement | null,
  domHole: HeatCapacityGuideStrongDomCutout,
  bounds: { width: number; height: number },
): HeatCapacityGuideStrongCutout | null => {
  if (!maskRoot || bounds.width <= 0 || bounds.height <= 0) return null;
  const sceneRoot = maskRoot.closest('[data-heat-capacity-instrument-scene="true"]') as HTMLElement | null;
  const element = sceneRoot?.querySelector(domHole.selector) as HTMLElement | null;
  if (!element) return null;
  const rootRect = maskRoot.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const padding = domHole.padding ?? 8;
  const x = Math.max(0, elementRect.left - rootRect.left - padding);
  const y = Math.max(0, elementRect.top - rootRect.top - padding);
  const right = Math.min(bounds.width, elementRect.right - rootRect.left + padding);
  const bottom = Math.min(bounds.height, elementRect.bottom - rootRect.top + padding);
  const width = Math.max(1, right - x);
  const height = Math.max(1, bottom - y);
  return {
    id: domHole.id,
    shape: 'rect',
    x,
    y,
    width,
    height,
    rx: domHole.rx ?? 8,
  };
};

export const getHeatCapacityGuideStrongCutouts = (
  targetSpec: HeatCapacityGuideStrongTargetSpec,
  projectedHoles: Record<string, HeatCapacityGuideStrongCutout>,
  maskRoot: HTMLElement | null,
  bounds: { width: number; height: number },
): HeatCapacityGuideStrongCutout[] => {
  const cutouts: HeatCapacityGuideStrongCutout[] = [];
  targetSpec.sceneHoleIds.forEach((holeId) => {
    const projectedHole = projectedHoles[holeId];
    if (projectedHole) cutouts.push(projectedHole);
  });
  targetSpec.domHoles?.forEach((domHole) => {
    const cutout = getHeatCapacityGuideDomCutout(maskRoot, domHole, bounds);
    if (cutout) cutouts.push(cutout);
  });
  if (cutouts.length > 0) return cutouts;
  return [
    {
      id: 'centerViewport',
      shape: 'rect',
      x: bounds.width * 0.33,
      y: bounds.height * 0.32,
      width: bounds.width * 0.34,
      height: bounds.height * 0.26,
      rx: 14,
    },
  ];
};
