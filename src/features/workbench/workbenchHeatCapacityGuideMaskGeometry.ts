

export type HeatCapacityGuideStrongCutout =
  | {
      id: string;
      shape: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    }
  | {
      id: string;
      shape: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
    };

export const createHeatCapacityGuideStrongRectPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 0,
) => {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const radius = Math.max(0, Math.min(rx, safeWidth / 2, safeHeight / 2));
  if (safeWidth <= 0 || safeHeight <= 0) return '';
  if (radius <= 0) {
    return `M${x} ${y}H${x + safeWidth}V${y + safeHeight}H${x}Z`;
  }
  return [
    `M${x + radius} ${y}`,
    `H${x + safeWidth - radius}`,
    `Q${x + safeWidth} ${y} ${x + safeWidth} ${y + radius}`,
    `V${y + safeHeight - radius}`,
    `Q${x + safeWidth} ${y + safeHeight} ${x + safeWidth - radius} ${y + safeHeight}`,
    `H${x + radius}`,
    `Q${x} ${y + safeHeight} ${x} ${y + safeHeight - radius}`,
    `V${y + radius}`,
    `Q${x} ${y} ${x + radius} ${y}`,
    'Z',
  ].join('');
};

export const createHeatCapacityGuideStrongCutoutPath = (
  cutout: HeatCapacityGuideStrongCutout,
) => {
  if (cutout.shape === 'rect') {
    return createHeatCapacityGuideStrongRectPath(
      cutout.x,
      cutout.y,
      cutout.width,
      cutout.height,
      cutout.rx ?? 2,
    );
  }
  const rx = Math.max(0, cutout.rx);
  const ry = Math.max(0, cutout.ry);
  if (rx <= 0 || ry <= 0) return '';
  return [
    `M${cutout.cx + rx} ${cutout.cy}`,
    `A${rx} ${ry} 0 1 0 ${cutout.cx - rx} ${cutout.cy}`,
    `A${rx} ${ry} 0 1 0 ${cutout.cx + rx} ${cutout.cy}`,
    'Z',
  ].join('');
};

export const createHeatCapacityGuideStrongDimPath = (
  bounds: { width: number; height: number },
  cutouts: HeatCapacityGuideStrongCutout[],
) => [
  createHeatCapacityGuideStrongRectPath(0, 0, bounds.width, bounds.height),
  ...cutouts.map(createHeatCapacityGuideStrongCutoutPath),
].filter(Boolean).join('');
