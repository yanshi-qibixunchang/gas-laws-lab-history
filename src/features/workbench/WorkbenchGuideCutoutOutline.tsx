import { type HeatCapacityGuideStrongCutout } from './workbenchHeatCapacityGuideMaskGeometry.ts';

export const renderHeatCapacityGuideStrongCutoutOutline = (
  cutout: HeatCapacityGuideStrongCutout,
) => {
  const commonProps = {
    fill: 'rgba(56, 189, 248, 0.1)',
    stroke: 'rgba(125, 211, 252, 0.95)',
    strokeWidth: 0.55,
    className: 'studio-heat-guide-strong-cutout-outline',
    vectorEffect: 'non-scaling-stroke' as const,
  };
  if (cutout.shape === 'rect') {
    return (
      <rect
        key={`outline-${cutout.id}`}
        {...commonProps}
        x={cutout.x}
        y={cutout.y}
        width={cutout.width}
        height={cutout.height}
        rx={cutout.rx ?? 2}
      />
    );
  }
  return (
    <ellipse
      key={`outline-${cutout.id}`}
      {...commonProps}
      cx={cutout.cx}
      cy={cutout.cy}
      rx={cutout.rx}
      ry={cutout.ry}
    />
  );
};
