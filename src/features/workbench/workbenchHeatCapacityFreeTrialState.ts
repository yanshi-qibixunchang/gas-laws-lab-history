import type {
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

export type HeatCapacityFreeActiveTrialSource =
  Pick<WorkbenchHeatCapacityState, 'heatCapacityFreeRunWorkspace'> &
  Partial<Pick<WorkbenchHeatCapacityState, 'powerOn'>>;

export const isHeatCapacityFreeTrialRecordComplete = (
  trial: Pick<HeatCapacityFreeTrial, 'u1' | 'u2' | 'correctedSignals'>,
) => (
  trial.u1 !== null &&
  trial.u2 !== null &&
  trial.correctedSignals !== null
);

export const isHeatCapacityFreeTrialComplete = (
  trial: HeatCapacityFreeTrial,
) => isHeatCapacityFreeTrialRecordComplete(trial);

export const hasHeatCapacityFreeTrialProgress = (
  trial: HeatCapacityFreeTrial,
) => (
  trial.automaticU0 !== null ||
  trial.u0 !== null ||
  trial.u1 !== null ||
  trial.u2 !== null ||
  trial.blockedReason !== null ||
  trial.correctedSignals !== null ||
  trial.traceTrialId !== null ||
  trial.branchCount > 0
);

export const getActiveHeatCapacityFreeTrialIndex = (
  file: HeatCapacityFreeActiveTrialSource,
) => {
  const incompleteIndex = file.heatCapacityFreeRunWorkspace.trials.findIndex((trial) => (
    trial.completedAtMs == null && !isHeatCapacityFreeTrialRecordComplete(trial)
  ));
  if (incompleteIndex >= 0) return incompleteIndex;
  if (
    file.powerOn === true &&
    file.heatCapacityFreeRunWorkspace.currentExperimentStatus === 'completed' &&
    file.heatCapacityFreeRunWorkspace.trials.length > 0 &&
    file.heatCapacityFreeRunWorkspace.trials.at(-1)?.completedAtMs == null
  ) {
    return file.heatCapacityFreeRunWorkspace.trials.length - 1;
  }
  return -1;
};

export const getHeatCapacityFreeRecordDisplayTrialIndex = (
  file: HeatCapacityFreeActiveTrialSource,
) => {
  const activeIndex = getActiveHeatCapacityFreeTrialIndex(file);
  if (activeIndex >= 0) return activeIndex;
  const lastIndex = file.heatCapacityFreeRunWorkspace.trials.length - 1;
  const lastTrial = file.heatCapacityFreeRunWorkspace.trials[lastIndex] ?? null;
  if (
    file.powerOn === false &&
    (
      file.heatCapacityFreeRunWorkspace.currentExperimentStatus === 'draft' ||
      file.heatCapacityFreeRunWorkspace.currentExperimentStatus === 'completed'
    ) &&
    lastTrial !== null &&
    isHeatCapacityFreeTrialRecordComplete(lastTrial)
  ) {
    return lastIndex;
  }
  return -1;
};

export const getActiveHeatCapacityFreeTrial = (
  file: HeatCapacityFreeActiveTrialSource,
) => {
  const activeIndex = getActiveHeatCapacityFreeTrialIndex(file);
  return activeIndex >= 0
    ? file.heatCapacityFreeRunWorkspace.trials[activeIndex] ?? null
    : null;
};
