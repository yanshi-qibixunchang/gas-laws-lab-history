export const HEAT_CAPACITY_SIGNAL_DISPLAY_DECIMALS = 1;

export const truncateHeatCapacitySignalMv = (
  value: number,
  decimals = HEAT_CAPACITY_SIGNAL_DISPLAY_DECIMALS,
) => {
  if (!Number.isFinite(value)) {
    return value;
  }
  const factor = 10 ** Math.max(0, Math.floor(decimals));
  const scaled = value * factor;
  const truncated = scaled < 0 ? Math.ceil(scaled) : Math.floor(scaled);
  const normalized = Number((truncated / factor).toFixed(Math.max(0, Math.floor(decimals))));
  return Object.is(normalized, -0) ? 0 : normalized;
};

export const formatHeatCapacitySignalMv = (
  value: number,
  decimals = HEAT_CAPACITY_SIGNAL_DISPLAY_DECIMALS,
) => truncateHeatCapacitySignalMv(value, decimals).toFixed(Math.max(0, Math.floor(decimals)));
