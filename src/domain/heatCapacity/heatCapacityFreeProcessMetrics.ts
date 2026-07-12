export const calculateHeatCapacityRelativeErrorPercent = (
  gamma: number | null,
  theoreticalGamma: number,
) => (
  gamma !== null && Number.isFinite(gamma) && theoreticalGamma > 0
    ? Number((Math.abs(gamma - theoreticalGamma) / theoreticalGamma * 100).toFixed(2))
    : null
);
