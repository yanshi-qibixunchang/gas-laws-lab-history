import {
  FreeExperimentProgress,
} from '../../components/experiments/FreeExperimentProgress.tsx';
import {
  SHARED_EXPERIMENT_PROGRESS_COPY,
} from './workbenchExperimentProgressCopy.ts';

export interface WorkbenchHeatCapacityExperimentProgressProps {
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  activeHeatCapacityCurrentGroup: import('../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts').HeatCapacityFreeExperimentGroupRecord | null;
  activeHeatCapacityFreeBatchProgress: import('../../domain/heatCapacity/heatCapacityFreeBatchModel.ts').HeatCapacityFreeBatchProgress;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  heatCapacityCalculationWindowOpen: boolean;
  activeHeatCapacityGroupProgressStatus: "draft" | "collecting" | "completed" | "awaiting-calculation";
  requestAbandonHeatCapacityFreeGroupDraft: () => void;
  requestRestartHeatCapacityFreeExperiment: () => void;
  requestRestartHeatCapacityFreeGroup: () => void;
  openNextHeatCapacityFreeExperimentGroupSetup: () => void;
  openFirstHeatCapacityFreeExperimentGroupSetup: () => void;
}

export const WorkbenchHeatCapacityExperimentProgress = ({
  activeFile,
  activeHeatCapacityCurrentGroup,
  activeHeatCapacityFreeBatchProgress,
  settingsLanguagePreference,
  heatCapacityCalculationWindowOpen,
  activeHeatCapacityGroupProgressStatus,
  requestAbandonHeatCapacityFreeGroupDraft,
  requestRestartHeatCapacityFreeExperiment,
  requestRestartHeatCapacityFreeGroup,
  openNextHeatCapacityFreeExperimentGroupSetup,
  openFirstHeatCapacityFreeExperimentGroupSetup,
}: WorkbenchHeatCapacityExperimentProgressProps) => {
  return activeFile.heatCapacityMode === 'free' &&
                    activeHeatCapacityCurrentGroup !== null &&
                    activeHeatCapacityFreeBatchProgress?.currentGroupNumber !== null
                      ? (
                          <FreeExperimentProgress
                            dataOwner="heat-capacity"
                            label={SHARED_EXPERIMENT_PROGRESS_COPY[
                              settingsLanguagePreference
                            ].heatProgress(
                              activeHeatCapacityFreeBatchProgress.currentGroupNumber,
                              activeHeatCapacityCurrentGroup.targetExperimentCount,
                            )}
                            openMenuLabel={SHARED_EXPERIMENT_PROGRESS_COPY[
                              settingsLanguagePreference
                            ].heatMenu}
                            menuLabel={SHARED_EXPERIMENT_PROGRESS_COPY[
                              settingsLanguagePreference
                            ].heatMenu}
                            disabled={
                              heatCapacityCalculationWindowOpen
                              || activeHeatCapacityGroupProgressStatus === 'awaiting-calculation'
                            }
                            actions={activeHeatCapacityGroupProgressStatus === 'draft'
                              ? [{
                                  id: 'abandon-group-draft',
                                  label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                    settingsLanguagePreference
                                  ].heatAbandon,
                                  icon: 'trash',
                                  onSelect: requestAbandonHeatCapacityFreeGroupDraft,
                                  dataAttribute: {
                                    name: 'data-heat-capacity-group-action',
                                    value: 'abandon',
                                  },
                                }]
                              : activeHeatCapacityGroupProgressStatus === 'collecting'
                                ? [{
                                    id: 'restart-current-experiment',
                                    label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                      settingsLanguagePreference
                                    ].heatRestartRun(
                                      activeHeatCapacityFreeBatchProgress.currentGroupNumber,
                                    ),
                                    icon: 'restart',
                                    onSelect: requestRestartHeatCapacityFreeExperiment,
                                    dataAttribute: {
                                      name: 'data-heat-capacity-group-action',
                                      value: 'restart-experiment',
                                    },
                                  }, {
                                    id: 'restart-experiment-group',
                                    label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                      settingsLanguagePreference
                                    ].heatRestartGroup,
                                    icon: 'restart',
                                    separatorBefore: true,
                                    onSelect: requestRestartHeatCapacityFreeGroup,
                                    dataAttribute: {
                                      name: 'data-heat-capacity-group-action',
                                      value: 'restart-group',
                                    },
                                  }]
                                : []}
                            primaryAction={activeHeatCapacityGroupProgressStatus === 'completed'
                              ? {
                                  id: 'start-next-experiment-group',
                                  label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                    settingsLanguagePreference
                                  ].heatNext,
                                  icon: 'plus',
                                  tone: 'primary',
                                  onSelect: openNextHeatCapacityFreeExperimentGroupSetup,
                                  dataAttribute: {
                                    name: 'data-heat-capacity-next-experiment-group',
                                    value: 'true',
                                  },
                                }
                              : undefined}
                          />
                        )
                      : activeFile.heatCapacityMode === 'free' && activeHeatCapacityCurrentGroup === null
                        ? (
                            <FreeExperimentProgress
                              dataOwner="heat-capacity"
                              primaryAction={{
                                id: 'start-first-experiment-group',
                                label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                  settingsLanguagePreference
                                ].heatFirst,
                                icon: 'plus',
                                tone: 'primary',
                                onSelect: openFirstHeatCapacityFreeExperimentGroupSetup,
                                dataAttribute: {
                                  name: 'data-heat-capacity-empty-group-start',
                                  value: 'true',
                                },
                              }}
                            />
                          )
                        : null;
};
