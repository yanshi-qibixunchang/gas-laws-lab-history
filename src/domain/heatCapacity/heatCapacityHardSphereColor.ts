export type HeatCapacityHardSphereSceneTheme = 'dark' | 'light';

interface TemperatureColorStop {
  at: number;
  color: string;
}

export const HEAT_CAPACITY_HARD_SPHERE_TEMPERATURE_PALETTES: Record<HeatCapacityHardSphereSceneTheme, TemperatureColorStop[]> = {
  dark: [
    { at: 0, color: '#60a5fa' },
    { at: 0.26, color: '#38bdf8' },
    { at: 0.5, color: '#a78bfa' },
    { at: 0.74, color: '#fde047' },
    { at: 1, color: '#fb923c' },
  ],
  light: [
    { at: 0, color: '#1d4ed8' },
    { at: 0.25, color: '#4f46e5' },
    { at: 0.5, color: '#7c3aed' },
    { at: 0.74, color: '#d97706' },
    { at: 1, color: '#dc2626' },
  ],
};

const clampUnit = (value: number) => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
);

const parseHexColor = (color: string) => {
  const normalized = color.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const toHexChannel = (value: number) => (
  Math.round(value).toString(16).padStart(2, '0')
);

const lerpChannel = (start: number, end: number, progress: number) => (
  start + (end - start) * progress
);

export const resolveHeatCapacityHardSphereTemperatureColor = (
  sceneTheme: HeatCapacityHardSphereSceneTheme,
  temperatureColorFactor: number,
) => {
  const palette = HEAT_CAPACITY_HARD_SPHERE_TEMPERATURE_PALETTES[sceneTheme];
  const factor = clampUnit(temperatureColorFactor);
  const upperIndex = palette.findIndex((stop) => factor <= stop.at);
  if (upperIndex <= 0) return palette[0].color;
  const upper = palette[upperIndex];
  const lower = palette[upperIndex - 1];
  const localProgress = upper.at <= lower.at ? 0 : (factor - lower.at) / (upper.at - lower.at);
  const lowerColor = parseHexColor(lower.color);
  const upperColor = parseHexColor(upper.color);
  return `#${toHexChannel(lerpChannel(lowerColor.r, upperColor.r, localProgress))}${toHexChannel(lerpChannel(lowerColor.g, upperColor.g, localProgress))}${toHexChannel(lerpChannel(lowerColor.b, upperColor.b, localProgress))}`;
};
