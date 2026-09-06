import type React from 'react';
import {
  RecoverableRenderErrorBoundary,
} from '../../components/errors/RecoverableRenderErrorBoundary.tsx';
import {
  WorkbenchContentRenderErrorFallback,
} from './WorkbenchRenderErrorFallback.tsx';
import {
  Download,
} from 'lucide-react';
import {
  PistonOscillationProcessReviewPanel,
} from '../processReview/PistonOscillationProcessReviewPanel.tsx';
import {
  PistonOscillationDataProcessingPanel,
  PistonOscillationAcquisitionPanel,
} from '../pistonOscillation/index.ts';

export interface WorkbenchPistonOscillationRealtimeProps {
  pistonOscillationContentRenderRecoveryHostRef: React.MutableRefObject<HTMLDivElement>;
  activePistonOscillationProcessReview: boolean;
  activePistonOscillationDataProcessing: boolean;
  activeFile: import('./workbenchPistonOscillationState.ts').WorkbenchHeatCapacityPistonOscillationState;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  returnToPistonOscillationInstrumentAfterDisplayError: () => void;
  isExportModeDataReady: (mode: import('./workbenchResults.ts').WorkbenchExportMode) => boolean;
  exportInProgress: boolean;
  handleExportAction: (mode: import('./workbenchResults.ts').WorkbenchExportMode, heatCapacityGroupIds?: readonly string[]) => Promise<void>;
  activePistonOscillationFreeSelected: boolean;
  pistonGuidePulseActive: boolean;
  pistonGuideExpectedStrongTargetId: import('../pistonOscillation/pistonOscillationGuidePresentation.ts').PistonOscillationGuideStrongTargetId;
  handlePistonOscillationProcessingEvent: (event: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideEvent | import('../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts').PistonOscillationFreeEvent) => void;
  handlePistonOscillationGuideProcessingInteractionStart: () => void;
  changePistonOscillationPeriodSelectionMode: (active: boolean) => void;
  handlePistonOscillationGuideInvalidPeriodSelection: () => void;
  handlePistonOscillationFreeUnusableMeasurement: (runIndex: number) => void;
  pistonOscillationCompletedDataProcessingReview: boolean;
  openPistonOscillationCalculationReview: () => void;
  closePistonOscillationDataProcessingReview: () => void;
  pistonOscillationAcquisitionPanelRef: React.MutableRefObject<import('../pistonOscillation/PistonOscillationAcquisitionPanel.tsx').PistonOscillationAcquisitionPanelHandle>;
  activePistonOscillationGuideSession: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideSession;
  activePistonOscillationFreeSession: import('../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts').PistonOscillationFreeSession;
  activePistonOscillationPowerOn: boolean;
  pistonOscillationReleaseEventsByFileId: Record<string, import('../pistonOscillation/PistonOscillationAcquisitionPanel.tsx').PistonOscillationReleaseEvent>;
  pistonOscillationPressStartEventsByFileId: Record<string, import('../pistonOscillation/PistonOscillationAcquisitionPanel.tsx').PistonOscillationPressStartEvent>;
  pistonOscillationLivePressureChannel: import('../pistonOscillation/pistonOscillationLivePressureChannel.ts').PistonOscillationLivePressureChannel;
  activePistonOscillationDemoPlaybackPhase: import('../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts').PistonOscillationDemoPlaybackPhase;
  pistonOscillationDemoPlaybackChannel: import('../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts').PistonOscillationDemoPlaybackChannel;
  activePistonOscillationGuideSelected: boolean;
  pistonOscillationGuidePistonStable: boolean;
  activePistonOscillationGuideTimeFrozen: boolean;
  pistonOscillationGuideLessonDialog: import('./workbenchPistonGuidePresentation.ts').PistonOscillationGuideLessonDialogState;
  pistonGuideAcquisitionCue: import('../pistonOscillation/PistonOscillationAcquisitionPanel.tsx').PistonOscillationGuideAcquisitionCue;
  handlePistonOscillationGuideAcquisitionEvent: (event: import('../pistonOscillation/pistonOscillationGuideAcquisitionBridge.ts').PistonOscillationGuideAcquisitionEvent) => boolean;
  handlePistonOscillationGuideActionAttempt: (action: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideAction, context: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideActionContext) => import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideGuardResult;
  editPistonOscillationGuideParameter: (field: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideParameterField, value: string) => void;
  commitPistonOscillationGuideParameter: (field: import('../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts').PistonOscillationGuideParameterField) => void;
  commitPistonOscillationFreeAcquisitionSetting: (field: "sampleRateHz" | "triggerThresholdKpa", value: number) => void;
  changePistonOscillationFreeCandidate: (candidate: import('../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts').PistonOscillationRawMeasurementRecord) => void;
  startPistonOscillationFreeAcquisition: () => void;
  savePistonOscillationFreeMeasurement: (measurement: import('../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts').PistonOscillationRawMeasurementRecord) => void;
  retainPistonOscillationRun: () => void;
}

export const WorkbenchPistonOscillationRealtime = ({
  pistonOscillationContentRenderRecoveryHostRef,
  activePistonOscillationProcessReview,
  activePistonOscillationDataProcessing,
  activeFile,
  settingsLanguagePreference,
  returnToPistonOscillationInstrumentAfterDisplayError,
  isExportModeDataReady,
  exportInProgress,
  handleExportAction,
  activePistonOscillationFreeSelected,
  pistonGuidePulseActive,
  pistonGuideExpectedStrongTargetId,
  handlePistonOscillationProcessingEvent,
  handlePistonOscillationGuideProcessingInteractionStart,
  changePistonOscillationPeriodSelectionMode,
  handlePistonOscillationGuideInvalidPeriodSelection,
  handlePistonOscillationFreeUnusableMeasurement,
  pistonOscillationCompletedDataProcessingReview,
  openPistonOscillationCalculationReview,
  closePistonOscillationDataProcessingReview,
  pistonOscillationAcquisitionPanelRef,
  activePistonOscillationGuideSession,
  activePistonOscillationFreeSession,
  activePistonOscillationPowerOn,
  pistonOscillationReleaseEventsByFileId,
  pistonOscillationPressStartEventsByFileId,
  pistonOscillationLivePressureChannel,
  activePistonOscillationDemoPlaybackPhase,
  pistonOscillationDemoPlaybackChannel,
  activePistonOscillationGuideSelected,
  pistonOscillationGuidePistonStable,
  activePistonOscillationGuideTimeFrozen,
  pistonOscillationGuideLessonDialog,
  pistonGuideAcquisitionCue,
  handlePistonOscillationGuideAcquisitionEvent,
  handlePistonOscillationGuideActionAttempt,
  editPistonOscillationGuideParameter,
  commitPistonOscillationGuideParameter,
  commitPistonOscillationFreeAcquisitionSetting,
  changePistonOscillationFreeCandidate,
  startPistonOscillationFreeAcquisition,
  savePistonOscillationFreeMeasurement,
  retainPistonOscillationRun,
}: WorkbenchPistonOscillationRealtimeProps) => {
  return <div
        ref={pistonOscillationContentRenderRecoveryHostRef}
        className="studio-realtime-panel studio-realtime-panel-piston-oscillation"
        data-piston-oscillation-realtime={
          activePistonOscillationProcessReview
            ? 'process-review'
            : activePistonOscillationDataProcessing
              ? 'data-processing'
              : 'acquisition'
        }
      >
        {activePistonOscillationProcessReview ? (
          <RecoverableRenderErrorBoundary
            resetKeys={[activeFile.id]}
            fallback={({ error, retry }) => (
              <WorkbenchContentRenderErrorFallback
                area="data-processing"
                language={settingsLanguagePreference}
                error={error}
                onRetry={retry}
                onReturnToInstrument={returnToPistonOscillationInstrumentAfterDisplayError}
              />
            )}
          >
            <div className="studio-piston-process-review-scroll">
              <section
                className="studio-heat-export-card studio-piston-report-export-card"
                data-piston-oscillation-export-actions="true"
              >
                <div>
                  <strong>
                    {settingsLanguagePreference === 'en'
                      ? 'Export report'
                      : settingsLanguagePreference === 'zh-TW'
                        ? '匯出報告'
                        : '导出报告'}
                  </strong>
                  <span>
                    {activeFile.pistonOscillationFreeSession.experimentGroup.scheme === 'ideal'
                      ? settingsLanguagePreference === 'en'
                        ? 'Export the saved curves, calculation results, and unscored process evidence as PDF.'
                        : settingsLanguagePreference === 'zh-TW'
                          ? '將已儲存曲線、計算結果與不評分的過程證據匯出為 PDF。'
                          : '将已保存曲线、计算结果和不评分的过程证据导出为 PDF。'
                      : settingsLanguagePreference === 'en'
                        ? 'Export the saved curves, calculation results, process evidence, and score summary as PDF.'
                        : settingsLanguagePreference === 'zh-TW'
                          ? '將已儲存曲線、計算結果、過程證據與評分摘要匯出為 PDF。'
                          : '将已保存曲线、计算结果、过程证据与评分摘要导出为 PDF。'}
                  </span>
                </div>
                <div className="studio-heat-export-buttons">
                  <button
                    type="button"
                    disabled={!isExportModeDataReady('report') || exportInProgress}
                    onClick={() => { void handleExportAction('report'); }}
                  >
                    <Download size={13} />
                    {exportInProgress
                      ? settingsLanguagePreference === 'en'
                        ? 'Exporting...'
                        : settingsLanguagePreference === 'zh-TW'
                          ? '匯出中...'
                          : '导出中...'
                      : settingsLanguagePreference === 'en'
                        ? 'Export PDF report'
                        : settingsLanguagePreference === 'zh-TW'
                          ? '匯出 PDF 報告'
                          : '导出 PDF 报告'}
                  </button>
                </div>
              </section>
              <PistonOscillationProcessReviewPanel
                session={activeFile.pistonOscillationFreeSession}
                language={settingsLanguagePreference}
              />
            </div>
          </RecoverableRenderErrorBoundary>
        ) : activePistonOscillationDataProcessing ? (
          <RecoverableRenderErrorBoundary
            resetKeys={[activeFile.id]}
            fallback={({ error, retry }) => (
              <WorkbenchContentRenderErrorFallback
                area="data-processing"
                language={settingsLanguagePreference}
                error={error}
                onRetry={retry}
                onReturnToInstrument={returnToPistonOscillationInstrumentAfterDisplayError}
              />
            )}
          >
            <PistonOscillationDataProcessingPanel
              language={settingsLanguagePreference}
              guideSession={activeFile.pistonOscillationGuideSession}
              freeSession={activePistonOscillationFreeSelected
                ? activeFile.pistonOscillationFreeSession
                : undefined}
              pulseActive={pistonGuidePulseActive}
              pulseTarget={pistonGuideExpectedStrongTargetId}
              onProcessingEvent={handlePistonOscillationProcessingEvent}
              onInteractionStart={handlePistonOscillationGuideProcessingInteractionStart}
              onSelectionModeChange={changePistonOscillationPeriodSelectionMode}
              onInvalidSelection={handlePistonOscillationGuideInvalidPeriodSelection}
              onUnusableMeasurement={handlePistonOscillationFreeUnusableMeasurement}
              reviewMode={pistonOscillationCompletedDataProcessingReview}
              onOpenCalculationReview={openPistonOscillationCalculationReview}
              onCloseReview={closePistonOscillationDataProcessingReview}
            />
          </RecoverableRenderErrorBoundary>
        ) : (
          <PistonOscillationAcquisitionPanel
          ref={pistonOscillationAcquisitionPanelRef}
          key={`${activeFile.id}:${
            activePistonOscillationGuideSession?.startedAtMs ?? 'standalone'
          }:${activePistonOscillationGuideSession?.measurementIndex ?? 'free'}:${
            activePistonOscillationFreeSession?.reacquisition?.requestedAtMs ?? 'normal'
          }`}
          language={settingsLanguagePreference}
          powerOn={activePistonOscillationPowerOn}
          releaseEvent={pistonOscillationReleaseEventsByFileId[activeFile.id] ?? null}
          pressStartEvent={pistonOscillationPressStartEventsByFileId[activeFile.id] ?? null}
          livePressureChannel={pistonOscillationLivePressureChannel}
          demoPlaybackChannel={
            activePistonOscillationDemoPlaybackPhase === 'idle'
              ? undefined
              : pistonOscillationDemoPlaybackChannel
          }
          demoPlaybackFileId={activeFile.id}
          guideSession={
            activePistonOscillationGuideSelected
            && activePistonOscillationDemoPlaybackPhase === 'idle'
              ? activeFile.pistonOscillationGuideSession
              : undefined
          }
          freeSession={
            activePistonOscillationFreeSelected
            && activePistonOscillationDemoPlaybackPhase === 'idle'
              ? activeFile.pistonOscillationFreeSession
              : undefined
          }
          guidePauseReady={pistonOscillationGuidePistonStable}
          guidePaused={
            activePistonOscillationGuideTimeFrozen
            || pistonOscillationGuideLessonDialog !== null
          }
          guideCue={pistonGuideAcquisitionCue}
          onGuideAcquisitionEvent={
            activePistonOscillationDemoPlaybackPhase === 'idle'
              ? handlePistonOscillationGuideAcquisitionEvent
              : undefined
          }
          onGuideActionAttempt={
            activePistonOscillationGuideSelected
            && activePistonOscillationDemoPlaybackPhase === 'idle'
              ? handlePistonOscillationGuideActionAttempt
              : undefined
          }
          onGuideParameterEdit={editPistonOscillationGuideParameter}
          onGuideParameterCommit={commitPistonOscillationGuideParameter}
          onFreeAcquisitionSettingCommit={commitPistonOscillationFreeAcquisitionSetting}
          onFreeCandidateChange={changePistonOscillationFreeCandidate}
          onFreeAcquisitionStarted={startPistonOscillationFreeAcquisition}
          onFreeMeasurementSave={savePistonOscillationFreeMeasurement}
          onRunRetained={retainPistonOscillationRun}
          />
        )}
      </div>;
};
