import {
  compactFreeTraceStore,
  type HeatCapacityFreeTraceStore,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';

export const removeHeatCapacityFreeTraceTrialFromStore = (
  store: HeatCapacityFreeTraceStore,
  traceTrialId: string | null,
): HeatCapacityFreeTraceStore => {
  if (!traceTrialId) return store;
  const traceTrials = store.traceTrials.filter(
    (traceTrial) => traceTrial.id !== traceTrialId,
  );
  return {
    ...store,
    activeTraceTrialId: traceTrials.some(
      (traceTrial) => traceTrial.id === store.activeTraceTrialId,
    )
      ? store.activeTraceTrialId
      : null,
    traceTrials,
  };
};

export const markHeatCapacityFreeTraceTrialCompleted = (
  store: HeatCapacityFreeTraceStore,
  traceTrialId: string | null,
  linkedTrialId: string,
): HeatCapacityFreeTraceStore => {
  if (!traceTrialId) return store;
  return compactFreeTraceStore({
    ...store,
    traceTrials: store.traceTrials.map((traceTrial) => (
      traceTrial.id === traceTrialId
        ? { ...traceTrial, linkedTrialId, status: 'completed' }
        : traceTrial
    )),
  });
};
