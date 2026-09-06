import type React from 'react';
import {
  PistonOscillationInstrumentScene,
} from '../pistonOscillation/index.ts';
import {
  SHARED_EXPERIMENT_PROGRESS_COPY,
} from './workbenchExperimentProgressCopy.ts';
import {
  FreeExperimentProgress,
} from '../../components/experiments/FreeExperimentProgress.tsx';
import {
  PromptViewportFeedback,
} from '../../components/prompts/PromptViewportFeedback.tsx';
import {
  PROMPT_FEEDBACK_COPY,
} from '../../components/prompts/promptFeedbackCopy.ts';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchPistonOscillationPreviewProps {
  activeFile: import('./workbenchPistonOscillationState.ts').WorkbenchHeatCapacityPistonOscillationState;
  activePistonOscillationParameterSignature: string;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  activePistonOscillationPowerOn: boolean;
  handlePistonOscillationPowerToggle: (powerOn: boolean) => void;
  activePistonOscillationFreeSelected: boolean;
  activePistonOscillationPhysicsConfig: { readonly gamma: number; readonly ambientPressurePa: number; readonly ambientTemperatureK: number; readonly movingMassKg: number; readonly equivalentDeadVolumeHeightM: number; readonly linearDampingNsPerM: number; readonly sensorSampleRateHz: number; readonly trajectoryDurationS: number; };
  activePistonOscillationThermalConfig: import('../../domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts').PistonOscillationThermalModelConfig;
  activePistonOscillationEffectiveConfig: { readonly scheme: import('../../domain/pistonOscillation/pistonOscillationExperimentContextModel.ts').PistonOscillationExperimentScheme; readonly gasMaterialSnapshot: { readonly schemaVersion: 1; readonly gasType: import('../../domain/pistonOscillation/pistonOscillationGasMaterialModel.ts').PistonOscillationGasType; readonly modelVersion: string; readonly materialId: string; readonly adiabaticIndex: number; readonly provenance: "captured" | "legacy-inferred"; }; readonly parameterProfileVersion: string; readonly parameters: import('../../domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts').PistonOscillationFreeParameterDraft; readonly physicsConfig: { readonly gamma: number; readonly ambientPressurePa: number; readonly ambientTemperatureK: number; readonly movingMassKg: number; readonly equivalentDeadVolumeHeightM: number; readonly linearDampingNsPerM: number; readonly sensorSampleRateHz: number; readonly trajectoryDurationS: number; }; readonly thermalConfig: import('../../domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts').PistonOscillationThermalModelConfig; readonly releaseAsymmetryConfig: import('../../domain/pistonOscillation/pistonOscillationReleaseAsymmetryModel.ts').PistonOscillationReleaseAsymmetryConfig; readonly sensorConfig: import('../../domain/pistonOscillation/pistonOscillationSensorObservationModel.ts').PistonOscillationDynamicSensorConfig; readonly tailConfig: Partial<import('../../domain/pistonOscillation/pistonOscillationTailIrregularityObservationModel.ts').PistonOscillationTailIrregularityObservationConfig>; readonly adiabaticProcess: boolean; readonly exactSensorObservation: boolean; readonly tailIrregularityEnabled: boolean; readonly heightSnapEnabled: boolean; readonly scoringEligible: boolean; };
  activePistonOscillationReleaseAsymmetryConfig: import('../../domain/pistonOscillation/pistonOscillationReleaseAsymmetryModel.ts').PistonOscillationReleaseAsymmetryConfig;
  resolvedWorkbenchTheme: import('./workbenchGeneralSettings.ts').WorkbenchResolvedTheme;
  togglePistonOscillationOperationVisualization: () => void;
  activePistonOscillationGuideSelected: boolean;
  pistonOscillationMeasurementCyclesByFileId: Record<string, number>;
  activePistonOscillationDemoPlaybackPhase: import('../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts').PistonOscillationDemoPlaybackPhase;
  pistonOscillationDemoPlaybackChannel: import('../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts').PistonOscillationDemoPlaybackChannel;
  activePistonOscillationGuideTimeFrozen: boolean;
  pistonOscillationGuideLessonDialog: import('./workbenchPistonGuidePresentation.ts').PistonOscillationGuideLessonDialogState;
  pistonOscillationFreeSetupOpen: boolean;
  pistonGuideVisualCue: "hoseReconnect" | "power" | "platform" | "screw" | "hoseDisconnect" | "heightStageAction";
  pistonGuideScrewInteractionMode: import('../pistonOscillation/pistonOscillationGuideScrewInteraction.ts').PistonOscillationGuideScrewInteractionMode;
  pistonGuideRequestedFocusMode: import('../pistonOscillation/pistonOscillationGuidePresentation.ts').PistonOscillationGuideFocusMode;
  activePistonOscillationGuideSnapTargetHeightMm: number;
  activePistonOscillationGuideInstrumentRestoreState: import('../pistonOscillation/pistonOscillationGuidePresentation.ts').PistonOscillationGuideInstrumentRestoreState;
  activePistonOscillationGuideSession: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideSession;
  pistonOscillationGuideFeedback: import('./workbenchPistonGuidePresentation.ts').PistonOscillationGuideFeedbackState;
  pistonOscillationGuideStepPanel: React.ReactElement;
  requestPistonOscillationFreeSetup: () => void;
  deletePistonOscillationFreeMeasurement: (measurementIndex: number) => void;
  requestPistonOscillationFreeReset: () => void;
  pistonOscillationGuideCompletionToast: import('./workbenchPistonGuidePresentation.ts').PistonOscillationGuideCompletionToastState;
  handlePistonOscillationGuideActionAttempt: (action: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideAction, context: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideActionContext) => import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideGuardResult;
  handlePistonOscillationGuideScrewDirectionFeedback: (feedback: import('../pistonOscillation/PistonOscillationInteractionWorkspace.tsx').PistonOscillationGuideScrewDirectionFeedback) => void;
  handlePistonOscillationGuideHeightConfirmed: (snapshot: import('../pistonOscillation/PistonOscillationInteractionWorkspace.tsx').PistonOscillationGuideInstrumentSnapshot) => void;
  handlePistonOscillationGuideSupportLoss: (event: import('../pistonOscillation/PistonOscillationInteractionWorkspace.tsx').PistonOscillationGuideSupportLossEvent) => void;
  handlePistonOscillationGuideHeightResetComplete: () => void;
  handlePistonOscillationGuideInstrumentSnapshot: (snapshot: import('../pistonOscillation/PistonOscillationInteractionWorkspace.tsx').PistonOscillationGuideInstrumentSnapshot) => void;
  handlePistonOscillationFreeInstrumentSnapshot: (snapshot: import('../pistonOscillation/PistonOscillationInteractionWorkspace.tsx').PistonOscillationGuideInstrumentSnapshot) => void;
  handlePistonOscillationReleaseEvent: (event: import('../pistonOscillation/PistonOscillationAcquisitionPanel.tsx').PistonOscillationReleaseEvent) => void;
  handlePistonOscillationPressStartEvent: (event: import('../pistonOscillation/PistonOscillationAcquisitionPanel.tsx').PistonOscillationPressStartEvent) => void;
  handlePistonOscillationFreeOperationObserved: (event: { operation: import('../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts').PistonOscillationFreeObservedOperation; payload?: Record<string, import('../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts').PistonOscillationFreeAuditPrimitive>; }) => void;
  pistonOscillationLivePressureChannel: import('../pistonOscillation/pistonOscillationLivePressureChannel.ts').PistonOscillationLivePressureChannel;
}

export const WorkbenchPistonOscillationPreview = ({
  activeFile,
  activePistonOscillationParameterSignature,
  settingsLanguagePreference,
  activePistonOscillationPowerOn,
  handlePistonOscillationPowerToggle,
  activePistonOscillationFreeSelected,
  activePistonOscillationPhysicsConfig,
  activePistonOscillationThermalConfig,
  activePistonOscillationEffectiveConfig,
  activePistonOscillationReleaseAsymmetryConfig,
  resolvedWorkbenchTheme,
  togglePistonOscillationOperationVisualization,
  activePistonOscillationGuideSelected,
  pistonOscillationMeasurementCyclesByFileId,
  activePistonOscillationDemoPlaybackPhase,
  pistonOscillationDemoPlaybackChannel,
  activePistonOscillationGuideTimeFrozen,
  pistonOscillationGuideLessonDialog,
  pistonOscillationFreeSetupOpen,
  pistonGuideVisualCue,
  pistonGuideScrewInteractionMode,
  pistonGuideRequestedFocusMode,
  activePistonOscillationGuideSnapTargetHeightMm,
  activePistonOscillationGuideInstrumentRestoreState,
  activePistonOscillationGuideSession,
  pistonOscillationGuideFeedback,
  pistonOscillationGuideStepPanel,
  requestPistonOscillationFreeSetup,
  deletePistonOscillationFreeMeasurement,
  requestPistonOscillationFreeReset,
  pistonOscillationGuideCompletionToast,
  handlePistonOscillationGuideActionAttempt,
  handlePistonOscillationGuideScrewDirectionFeedback,
  handlePistonOscillationGuideHeightConfirmed,
  handlePistonOscillationGuideSupportLoss,
  handlePistonOscillationGuideHeightResetComplete,
  handlePistonOscillationGuideInstrumentSnapshot,
  handlePistonOscillationFreeInstrumentSnapshot,
  handlePistonOscillationReleaseEvent,
  handlePistonOscillationPressStartEvent,
  handlePistonOscillationFreeOperationObserved,
  pistonOscillationLivePressureChannel,
}: WorkbenchPistonOscillationPreviewProps) => {
  return <div className="studio-piston-oscillation-preview-mount">
            <PistonOscillationInstrumentScene
              key={`${activeFile.id}:${activePistonOscillationParameterSignature}`}
              language={settingsLanguagePreference}
              powerOn={activePistonOscillationPowerOn}
              onPowerToggle={handlePistonOscillationPowerToggle}
              sensorSampleRateHz={activePistonOscillationFreeSelected
                ? activeFile.pistonOscillationFreeSession.sampleRateHz ?? undefined
                : undefined}
              physicsConfig={activePistonOscillationPhysicsConfig}
              thermalConfig={activePistonOscillationThermalConfig}
              adiabaticProcess={
                activePistonOscillationEffectiveConfig?.adiabaticProcess
              }
              releaseAsymmetryConfig={
                activePistonOscillationReleaseAsymmetryConfig
              }
              sceneTheme={resolvedWorkbenchTheme}
              cameraPreset={activeFile.previewCameraPreset}
              operationVisualizationEnabled={
                activeFile.pistonOscillationOperationVisualizationEnabled
              }
              onOperationVisualizationToggle={
                togglePistonOscillationOperationVisualization
              }
              guideSessionRevision={
                activePistonOscillationGuideSelected
                  ? activeFile.pistonOscillationGuideSession.startedAtMs ?? 0
                  : activePistonOscillationFreeSelected
                    ? activeFile.pistonOscillationFreeSession.startedAtMs ?? 0
                    : 0
              }
              measurementCycleRevision={
                pistonOscillationMeasurementCyclesByFileId[activeFile.id] ?? 0
              }
              demoPlaybackChannel={
                activePistonOscillationDemoPlaybackPhase === 'idle'
                  ? undefined
                  : pistonOscillationDemoPlaybackChannel
              }
              demoPlaybackFileId={activeFile.id}
              demoPlaybackPhase={activePistonOscillationDemoPlaybackPhase}
              guideTimeFrozen={
                activePistonOscillationGuideTimeFrozen
                || pistonOscillationGuideLessonDialog !== null
                || pistonOscillationFreeSetupOpen
              }
              guideVisualCue={pistonGuideVisualCue}
              guideScrewInteractionMode={pistonGuideScrewInteractionMode}
              guideRequestedFocusMode={pistonGuideRequestedFocusMode}
              guideSnapTargetHeightMm={activePistonOscillationGuideSnapTargetHeightMm}
              guideInitialInstrumentState={
                activePistonOscillationGuideSelected
                  ? activePistonOscillationGuideInstrumentRestoreState
                  : activePistonOscillationFreeSelected
                    ? {
                        ...activeFile.pistonOscillationFreeSession.instrumentState,
                        powerOn: activeFile.pistonOscillationFreeSession.powerOn,
                      }
                    : null
              }
              guideHeightReset={activePistonOscillationGuideSession?.heightReset
                ? {
                    revision: activePistonOscillationGuideSession.updatedAtMs ?? 0,
                    phase: activePistonOscillationGuideSession.heightReset.phase,
                    startedHeightMm:
                      activePistonOscillationGuideSession.heightReset.startedHeightMm,
                  }
                : null}
              viewportWarningFeedbackId={
                pistonOscillationGuideFeedback?.kind === 'warning'
                || pistonOscillationGuideFeedback?.kind === 'danger'
                  ? pistonOscillationGuideFeedback.id
                  : null
              }
              overlayTopRight={pistonOscillationGuideStepPanel}
              overlayBelowDefaultView={activePistonOscillationFreeSelected ? (() => {
                const session = activeFile.pistonOscillationFreeSession;
                const plan = session.experimentPlan;
                const copy = SHARED_EXPERIMENT_PROGRESS_COPY[settingsLanguagePreference];
                if (!plan) {
                  return (
                    <FreeExperimentProgress
                      dataOwner="piston-oscillation"
                      primaryAction={{
                        id: 'setup-new-experiment-plan',
                        label: copy.pistonSetup,
                        icon: 'plus',
                        tone: 'primary',
                        onSelect: requestPistonOscillationFreeSetup,
                        dataAttribute: {
                          name: 'data-piston-free-setup-plan',
                          value: 'true',
                        },
                      }}
                    />
                  );
                }
                const total = plan.targets.length;
                const currentTarget = plan.targets[session.measurementIndex] ?? null;
                const ordinal = Math.min(total, session.measurementIndex + 1);
                return (
                  <FreeExperimentProgress
                    dataOwner="piston-oscillation"
                    label={currentTarget
                      ? copy.pistonProgress(ordinal, total, currentTarget.heightMm)
                      : copy.pistonCompleted(total)}
                    openMenuLabel={copy.pistonOpenMenu}
                    menuLabel={copy.pistonMenu}
                    menuTitle={copy.pistonPlan}
                    details={plan.targets.map((target, measurementIndex) => {
                      const replacing = session.reacquisition?.measurementIndex
                        === measurementIndex;
                      const saved = !replacing && session.savedMeasurements.some((measurement) => (
                        measurement.measurementIndex === measurementIndex
                      ));
                      const current = session.measurementIndex === measurementIndex;
                      return {
                        id: target.targetId,
                        label: `${target.heightMm} mm`,
                        statusLabel: saved
                          ? copy.pistonSaved
                          : current
                            ? copy.pistonCurrent
                            : copy.pistonPending,
                        status: saved ? 'saved' as const : current ? 'current' as const : 'pending' as const,
                        deleteLabel: copy.pistonDelete(target.heightMm),
                        confirmDeleteLabel: copy.pistonConfirmDelete,
                        cancelDeleteLabel: copy.cancel,
                        onDelete: saved
                          ? () => deletePistonOscillationFreeMeasurement(measurementIndex)
                          : undefined,
                        deleteDataAttribute: saved
                          ? {
                              name: 'data-piston-free-confirm-delete-index',
                              value: measurementIndex,
                            }
                          : undefined,
                      };
                    })}
                    actions={[{
                      id: 'reset-free-mode',
                      label: copy.pistonReset,
                      icon: 'restart',
                      separatorBefore: true,
                      onSelect: requestPistonOscillationFreeReset,
                    }]}
                  />
                );
              })() : null}
              overlayCenter={pistonOscillationGuideCompletionToast?.fileId === activeFile.id ? (
                <div
                  key={pistonOscillationGuideCompletionToast.id}
                  className="studio-heat-demo-complete-toast"
                  data-piston-oscillation-guide-complete-toast="true"
                  data-prompt-feedback-kind="success"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="studio-heat-toast-kicker">
                    {pistonOscillationGuideCompletionToast.kicker}
                  </span>
                  <strong>{pistonOscillationGuideCompletionToast.message}</strong>
                </div>
              ) : pistonOscillationGuideFeedback ? (
                <PromptViewportFeedback
                  key={pistonOscillationGuideFeedback.id}
                  id={pistonOscillationGuideFeedback.id}
                  kind={pistonOscillationGuideFeedback.kind}
                  label={PROMPT_FEEDBACK_COPY[settingsLanguagePreference].kindLabels[
                    pistonOscillationGuideFeedback.kind
                  ]}
                  durationMs={pistonOscillationGuideFeedback.durationMs}
                  dataAttributes={{
                    'data-piston-guide-feedback': 'true',
                    'data-prompt-feedback-source': pistonOscillationGuideFeedback.source,
                    'data-prompt-feedback-placement': 'viewport-center',
                    'data-prompt-feedback-owner': 'piston-oscillation',
                  }}
                >
                  {renderScientificText(pistonOscillationGuideFeedback.text)}
                </PromptViewportFeedback>
              ) : null}
              overlayCenterAboveGuideMask={
                pistonOscillationGuideCompletionToast?.fileId === activeFile.id
                || pistonOscillationGuideFeedback !== null
              }
              onGuideActionAttempt={
                activePistonOscillationGuideSelected
                && activePistonOscillationDemoPlaybackPhase === 'idle'
                  ? handlePistonOscillationGuideActionAttempt
                  : undefined
              }
              onGuideScrewDirectionFeedback={
                activePistonOscillationGuideSelected
                && activePistonOscillationDemoPlaybackPhase === 'idle'
                  ? handlePistonOscillationGuideScrewDirectionFeedback
                  : undefined
              }
              onGuideHeightConfirmed={
                activePistonOscillationGuideSelected
                && activePistonOscillationDemoPlaybackPhase === 'idle'
                  ? handlePistonOscillationGuideHeightConfirmed
                  : undefined
              }
              onGuideSupportLoss={
                activePistonOscillationGuideSession?.status === 'active'
                && activePistonOscillationDemoPlaybackPhase === 'idle'
                  ? handlePistonOscillationGuideSupportLoss
                  : undefined
              }
              onGuideHeightResetComplete={
                activePistonOscillationGuideSession?.heightReset?.phase === 'resetting'
                  ? handlePistonOscillationGuideHeightResetComplete
                  : undefined
              }
              onGuideInstrumentSnapshotChange={
                activePistonOscillationGuideSelected
                && activePistonOscillationDemoPlaybackPhase === 'idle'
                  ? handlePistonOscillationGuideInstrumentSnapshot
                  : activePistonOscillationFreeSelected
                    && activePistonOscillationDemoPlaybackPhase === 'idle'
                    ? handlePistonOscillationFreeInstrumentSnapshot
                    : undefined
              }
              onReleaseEvent={handlePistonOscillationReleaseEvent}
              onPressStartEvent={handlePistonOscillationPressStartEvent}
              onFreeOperationObserved={
                activePistonOscillationFreeSelected
                && activePistonOscillationDemoPlaybackPhase === 'idle'
                  ? handlePistonOscillationFreeOperationObserved
                  : undefined
              }
              onLivePhysicalStateChange={
                pistonOscillationLivePressureChannel.publishPhysicalState
              }
            />
          </div>;
};
