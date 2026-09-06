

export interface PistonOscillationGuideStrongCutout {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export interface PistonOscillationGuideStrongMaskLayout {
  top: number;
  width: number;
  height: number;
  cutout: PistonOscillationGuideStrongCutout;
  contextCutouts: PistonOscillationGuideStrongCutout[];
  card: {
    x: number;
    y: number;
    width: number;
    compact: boolean;
  };
}

export const clampPistonOscillationGuideCutout = (
  value: number,
  minimum: number,
  maximum: number,
) => Math.min(maximum, Math.max(minimum, value));

export const getPistonOscillationGuideRoundedRectPath = (
  cutout: PistonOscillationGuideStrongCutout,
) => {
  const radius = Math.max(0, Math.min(cutout.rx, cutout.width / 2, cutout.height / 2));
  const right = cutout.x + cutout.width;
  const bottom = cutout.y + cutout.height;
  return [
    `M ${cutout.x + radius} ${cutout.y}`,
    `H ${right - radius}`,
    `Q ${right} ${cutout.y} ${right} ${cutout.y + radius}`,
    `V ${bottom - radius}`,
    `Q ${right} ${bottom} ${right - radius} ${bottom}`,
    `H ${cutout.x + radius}`,
    `Q ${cutout.x} ${bottom} ${cutout.x} ${bottom - radius}`,
    `V ${cutout.y + radius}`,
    `Q ${cutout.x} ${cutout.y} ${cutout.x + radius} ${cutout.y}`,
    'Z',
  ].join(' ');
};

export const getPistonOscillationGuideStrongDimPath = (
  layout: PistonOscillationGuideStrongMaskLayout,
) => {
  const targetCoveredByContext = layout.contextCutouts.some((context) => (
    context.x <= layout.cutout.x
    && context.y <= layout.cutout.y
    && context.x + context.width >= layout.cutout.x + layout.cutout.width
    && context.y + context.height >= layout.cutout.y + layout.cutout.height
  ));
  return [
    `M 0 0 H ${layout.width} V ${layout.height} H 0 Z`,
    ...(targetCoveredByContext
      ? []
      : [getPistonOscillationGuideRoundedRectPath(layout.cutout)]),
    ...layout.contextCutouts.map(getPistonOscillationGuideRoundedRectPath),
  ].join(' ');
};
