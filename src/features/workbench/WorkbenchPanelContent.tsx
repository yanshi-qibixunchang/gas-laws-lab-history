import type React from 'react';
import {
  WorkbenchIdealVerificationWindow,
  WorkbenchIdealPointsWindow,
} from './WorkbenchIdealResultsWindows.tsx';
import {
  selectViewedHeatCapacityFreeExperimentGroup,
  selectCurrentHeatCapacityFreeExperimentGroup,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import HeatCapacityExperimentGroupContextBar from '../heatCapacity/HeatCapacityExperimentGroupContextBar.tsx';
import HeatCapacityProcessReviewPanel from '../heatCapacity/HeatCapacityProcessReviewPanel.tsx';
import HeatCapacityGroupResultsPanel from '../heatCapacity/HeatCapacityGroupResultsPanel.tsx';
import {
  isHeatCapacityPanelKey,
} from './workbenchHeatCapacityTabRegistry.ts';
import {
  HeatCapacityLeftPanel,
} from '../heatCapacity/HeatCapacityLeftPanel.tsx';

export interface WorkbenchPanelContentProps {
  panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition;
  renderPreviewPanel: () => React.ReactElement;
  renderRealtimePanel: () => React.ReactElement;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  idealAnalysis: import('../../domain/idealGas/idealGasExperiment.ts').IdealGasAnalysis;
  figureSpecs: import('./workbenchResults.ts').WorkbenchFigureSpec[];
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  exportCopy: { label: string; detail: string; };
  exportInProgress: boolean;
  isExportModeDataReady: (mode: import('./workbenchResults.ts').WorkbenchExportMode) => boolean;
  handleExportAction: (mode: import('./workbenchResults.ts').WorkbenchExportMode, heatCapacityGroupIds?: readonly string[]) => Promise<void>;
  renderResultsPanel: () => React.ReactElement;
  pendingClearRelationKey: string;
  pendingRemovePointId: string;
  requestClearIdealRelation: () => void;
  cancelClearIdealRelation: () => void;
  requestRemoveIdealPoint: (point: import('../../shared/types.ts').IdealGasExperimentPoint) => void;
  cancelRemoveIdealPoint: () => void;
  selectHeatCapacityViewedGroup: (groupId: string) => void;
  selectHeatCapacityViewedTrial: (groupId: string, trialId: string) => void;
  pendingRemoveHeatCapacityTrialRecord: { trialIndex: number; kind: import('../../domain/heatCapacity/heatCapacityFreeTrialModel.ts').HeatCapacityFreeTrialRecordRemovalKind; scheme: import('./workbenchHeatCapacityStateTypes.ts').HeatCapacityFreeParameterScheme; };
  requestRemoveHeatCapacityTrialRecord: (trialIndex: number, kind: import('../../domain/heatCapacity/heatCapacityFreeTrialModel.ts').HeatCapacityFreeTrialRecordRemovalKind, scheme: import('./workbenchHeatCapacityStateTypes.ts').HeatCapacityFreeParameterScheme) => void;
  setPendingRemoveHeatCapacityTrialRecord: React.Dispatch<React.SetStateAction<{ trialIndex: number; kind: import('../../domain/heatCapacity/heatCapacityFreeTrialModel.ts').HeatCapacityFreeTrialRecordRemovalKind; scheme: import('./workbenchHeatCapacityStateTypes.ts').HeatCapacityFreeParameterScheme; }>>;
  openHeatCapacityReportExport: () => void;
}

export const WorkbenchPanelContent = ({
  panel,
  renderPreviewPanel,
  renderRealtimePanel,
  activeFile,
  idealAnalysis,
  figureSpecs,
  settingsLanguagePreference,
  workbenchCopy,
  exportCopy,
  exportInProgress,
  isExportModeDataReady,
  handleExportAction,
  renderResultsPanel,
  pendingClearRelationKey,
  pendingRemovePointId,
  requestClearIdealRelation,
  cancelClearIdealRelation,
  requestRemoveIdealPoint,
  cancelRemoveIdealPoint,
  selectHeatCapacityViewedGroup,
  selectHeatCapacityViewedTrial,
  pendingRemoveHeatCapacityTrialRecord,
  requestRemoveHeatCapacityTrialRecord,
  setPendingRemoveHeatCapacityTrialRecord,
  openHeatCapacityReportExport,
}: WorkbenchPanelContentProps) => {
    if (panel.key === 'preview') return renderPreviewPanel();
    if (panel.key === 'realtime') return renderRealtimePanel();
    if (panel.key === 'verification') {
      return (
        <WorkbenchIdealVerificationWindow
          file={activeFile.kind === 'ideal' ? activeFile : null}
          analysis={activeFile.kind === 'ideal' ? idealAnalysis : null}
          figureSpecs={figureSpecs}
          language={settingsLanguagePreference}
          workbenchCopy={workbenchCopy}
          exportEnvironmentLabel={exportCopy.label}
          exportInProgress={exportInProgress}
          isExportReady={isExportModeDataReady}
          onExport={(mode) => {
            void handleExportAction(mode);
          }}
        />
      );
    }
    if (panel.key === 'results') return renderResultsPanel();
    if (panel.key === 'experimentPoints') {
      return (
        <WorkbenchIdealPointsWindow
          file={activeFile.kind === 'ideal' ? activeFile : null}
          analysis={activeFile.kind === 'ideal' ? idealAnalysis : null}
          workbenchCopy={workbenchCopy}
          pendingClearRelationKey={pendingClearRelationKey}
          pendingRemovePointId={pendingRemovePointId}
          onClearRelation={requestClearIdealRelation}
          onCancelClearRelation={cancelClearIdealRelation}
          onRequestRemovePoint={requestRemoveIdealPoint}
          onCancelRemovePoint={cancelRemoveIdealPoint}
        />
      );
    }
    if (activeFile.kind === 'heatCapacity' && panel.key === 'heatCapacityReview') {
      const groupCollection = activeFile.heatCapacityFreeExperimentGroups;
      const viewedGroup = selectViewedHeatCapacityFreeExperimentGroup(groupCollection) ??
        selectCurrentHeatCapacityFreeExperimentGroup(groupCollection);
      if (!viewedGroup) {
        return (
          <div className="studio-empty">
            <div>
              <strong>{settingsLanguagePreference === 'en' ? 'No experiment group yet' : settingsLanguagePreference === 'zh-TW' ? '尚無實驗組' : '尚无实验组'}</strong>
              <p>{settingsLanguagePreference === 'en' ? 'Create an experiment group to review its process and results.' : settingsLanguagePreference === 'zh-TW' ? '建立實驗組後，可在此查看過程與結果。' : '创建实验组后，可在这里查看过程与结果。'}</p>
            </div>
          </div>
        );
      }
      const storedTrialId = groupCollection.lastViewedTrialIdByGroupId[viewedGroup.id] ?? null;
      const requestedReviewTrialId = viewedGroup.runSeries.trials.some((trial) => trial.id === storedTrialId)
        ? storedTrialId
        : viewedGroup.runSeries.trials[0]?.id ?? null;
      const theoreticalGamma = viewedGroup.parameterSnapshot?.physics.gamma ?? activeFile.theoreticalGamma;
      const calculationSession = viewedGroup.calculation?.kind === 'real-interactive' ||
          viewedGroup.calculation?.kind === 'ideal-interactive'
        ? viewedGroup.calculation.session
        : null;
      const review = selectHeatCapacityFreeProcessReview({
        trials: viewedGroup.runSeries.trials,
        traceStore: viewedGroup.runSeries.traceStore,
        theoreticalGamma,
        selectedTrialId: requestedReviewTrialId,
        calculationSession,
        scoringVersion: viewedGroup.scoringVersion,
      });
      return (
        <div className="studio-heat-review-with-scheme">
          <HeatCapacityExperimentGroupContextBar
            collection={groupCollection}
            language={settingsLanguagePreference}
            onViewedGroupChange={selectHeatCapacityViewedGroup}
            onViewedTrialChange={selectHeatCapacityViewedTrial}
          />
          <HeatCapacityProcessReviewPanel
            mode={activeFile.heatCapacityMode}
            review={review}
            selectedTrialId={review.selectedTrialId}
            language={settingsLanguagePreference}
            isIdealExperimentReview={viewedGroup.scheme === 'ideal'}
            onSelectedTrialChange={(trialId) => selectHeatCapacityViewedTrial(viewedGroup.id, trialId)}
          />
          <HeatCapacityGroupResultsPanel
            group={viewedGroup}
            collection={groupCollection}
            language={settingsLanguagePreference}
          />
        </div>
      );
    }
    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel.key)) {
      return (
        <HeatCapacityLeftPanel
          file={activeFile}
          language={settingsLanguagePreference}
          panelKey={panel.key}
          pendingRemoveTrialRecord={pendingRemoveHeatCapacityTrialRecord}
          onRemoveTrialRecord={requestRemoveHeatCapacityTrialRecord}
          onCancelRemoveTrialRecord={() => setPendingRemoveHeatCapacityTrialRecord(null)}
          groupCollection={activeFile.heatCapacityFreeExperimentGroups}
          onViewedGroupChange={selectHeatCapacityViewedGroup}
          onViewedTrialChange={selectHeatCapacityViewedTrial}
          exportInProgress={exportInProgress}
          canExportReport={isExportModeDataReady('report')}
          canExportFigures={isExportModeDataReady('figuresZip')}
          canExportTables={isExportModeDataReady('tablesCsv')}
          onExportExperimentPackage={() => { void handleExportAction('completeBundle'); }}
          onExportReport={openHeatCapacityReportExport}
          onExportFigures={() => { void handleExportAction('figuresZip'); }}
          onExportTables={() => { void handleExportAction('tablesCsv'); }}
        />
      );
    }
    return (
      <div className="studio-empty">
        <div>
          <strong>{workbenchCopy.results.panelNotConnectedTitle}</strong>
          <p>{workbenchCopy.results.panelNotConnectedBody}</p>
        </div>
      </div>
    );
  };
