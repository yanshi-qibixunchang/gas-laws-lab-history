export interface HeatCapacityDisplaySource {
  source: 'teaching' | 'free';
  pressureMv: number;
  temperatureMv: number;
}

export const selectHeatCapacityDisplaySource = (
  mode: 'demo' | 'guide' | 'free',
  teachingDisplay: HeatCapacityDisplaySource,
  freeDisplay: HeatCapacityDisplaySource,
) => (mode === 'free' ? freeDisplay : teachingDisplay);
