export interface HeatCapacityDisplaySource {
  source: 'teaching' | 'free' | 'guide';
  pressureMv: number;
  temperatureMv: number;
}

export const selectHeatCapacityDisplaySource = (
  mode: 'demo' | 'guide' | 'free',
  teachingDisplay: HeatCapacityDisplaySource,
  freeDisplay: HeatCapacityDisplaySource,
  guideDisplay: HeatCapacityDisplaySource = freeDisplay,
) => {
  if (mode === 'demo') return teachingDisplay;
  if (mode === 'guide') return guideDisplay;
  return freeDisplay;
};
