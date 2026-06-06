import {
  selectHeatCapacityDisplaySource,
  type HeatCapacityDisplaySource,
} from './heatCapacityDisplaySource.ts';

export type HeatCapacityMode = 'demo' | 'guide' | 'free';

export interface HeatCapacityTeachingTrialFixture {
  id: string;
  source: 'teaching';
}

export interface HeatCapacityFreeTrial {
  id: string;
  source: 'free';
}

export interface HeatCapacityModePolicyState {
  heatCapacityMode: HeatCapacityMode;
  teachingTrials: HeatCapacityTeachingTrialFixture[];
  freeTrials: HeatCapacityFreeTrial[];
  teachingDisplay: HeatCapacityDisplaySource;
  freeDisplay: HeatCapacityDisplaySource;
}

export interface HeatCapacityTrialSource {
  source: 'teaching' | 'free';
  trials: HeatCapacityTeachingTrialFixture[] | HeatCapacityFreeTrial[];
}

export const enterHeatCapacityFreeModePolicy = (
  state: HeatCapacityModePolicyState,
  atS: number,
): HeatCapacityModePolicyState => {
  void atS;
  return {
    ...state,
    heatCapacityMode: 'free',
    freeTrials: state.freeTrials.map((trial) => ({ ...trial })),
  };
};

export const resetHeatCapacityFreeTrialsPolicy = (
  state: HeatCapacityModePolicyState,
): HeatCapacityModePolicyState => ({
  ...state,
  freeTrials: [],
});

export const selectActiveHeatCapacityDisplay = (
  file: HeatCapacityModePolicyState,
) => selectHeatCapacityDisplaySource(
  file.heatCapacityMode,
  file.teachingDisplay,
  file.freeDisplay,
);

export const selectActiveHeatCapacityTrials = (
  file: HeatCapacityModePolicyState,
): HeatCapacityTrialSource => (
  file.heatCapacityMode === 'free'
    ? {
      source: 'free',
      trials: file.freeTrials,
    }
    : {
      source: 'teaching',
      trials: file.teachingTrials,
    }
);

export type {
  HeatCapacityDisplaySource,
};
