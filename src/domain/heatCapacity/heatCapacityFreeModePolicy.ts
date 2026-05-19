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

export interface HeatCapacityTeachingSnapshot {
  teachingRuntime: {
    phase: string;
    activeStepIndex: number;
  };
  teachingTrials: HeatCapacityTeachingTrialFixture[];
  teachingProcessingResult: {
    gamma: number;
  } | null;
  activeTeachingStep: string | null;
  panelState: {
    activePanelId: string;
  };
  messageState: {
    text: string;
    tone: 'info' | 'warning' | 'success';
  } | null;
  teachingModeIdentity: 'demo' | 'guide' | null;
}

export interface HeatCapacityModePolicyState {
  heatCapacityMode: HeatCapacityMode;
  pausedTeachingSnapshot: HeatCapacityTeachingSnapshot | null;
  teachingTrials: HeatCapacityTeachingTrialFixture[];
  freeTrials: HeatCapacityFreeTrial[];
  teachingDisplay: HeatCapacityDisplaySource;
  freeDisplay: HeatCapacityDisplaySource;
}

export interface HeatCapacityTrialSource {
  source: 'teaching' | 'free';
  trials: HeatCapacityTeachingTrialFixture[] | HeatCapacityFreeTrial[];
}

const cloneTeachingSnapshot = (
  snapshot: HeatCapacityTeachingSnapshot,
): HeatCapacityTeachingSnapshot => ({
  teachingRuntime: {
    ...snapshot.teachingRuntime,
  },
  teachingTrials: snapshot.teachingTrials.map((trial) => ({ ...trial })),
  teachingProcessingResult: snapshot.teachingProcessingResult
    ? { ...snapshot.teachingProcessingResult }
    : null,
  activeTeachingStep: snapshot.activeTeachingStep,
  panelState: {
    ...snapshot.panelState,
  },
  messageState: snapshot.messageState ? { ...snapshot.messageState } : null,
  teachingModeIdentity: snapshot.teachingModeIdentity,
});

export const enterHeatCapacityFreeModePolicy = (
  state: HeatCapacityModePolicyState,
  atS: number,
): HeatCapacityModePolicyState => {
  void atS;
  return {
    ...state,
    heatCapacityMode: 'free',
    pausedTeachingSnapshot: state.pausedTeachingSnapshot
      ? cloneTeachingSnapshot(state.pausedTeachingSnapshot)
      : null,
    freeTrials: state.freeTrials.map((trial) => ({ ...trial })),
  };
};

export const exitHeatCapacityFreeModePolicy = (
  state: HeatCapacityModePolicyState,
  atS: number,
): HeatCapacityModePolicyState => {
  void atS;
  const snapshot = state.pausedTeachingSnapshot;
  if (!snapshot) {
    return {
      ...state,
      heatCapacityMode: state.heatCapacityMode === 'free' ? 'guide' : state.heatCapacityMode,
    };
  }

  const restoredSnapshot = cloneTeachingSnapshot(snapshot);
  return {
    ...state,
    heatCapacityMode: restoredSnapshot.teachingModeIdentity ?? 'guide',
    pausedTeachingSnapshot: null,
    teachingTrials: restoredSnapshot.teachingTrials,
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
