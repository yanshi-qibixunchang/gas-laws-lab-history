import {
  BarChart3,
  Download,
  FileArchive,
  Table2,
  Trash2,
} from 'lucide-react';
import type { IdealGasExperimentPoint } from '../../shared/types.ts';
import {
  getIdealFailureReasonText,
  getIdealHistoryContent,
  getIdealRecommendationText,
  getRelationLabel,
  type IdealGasAnalysis,
} from '../../domain/idealGas/idealGasExperiment.ts';
import { WorkbenchIdealVerificationPanel } from './WorkbenchIdealVerificationPanel.tsx';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import {
  formatMaybeMetric,
  formatMetric,
  getIdealExperimentLanguageCode,
  getLocalizedStatusValue,
} from './workbenchPresentationFormatting.ts';
import type {
  WorkbenchExportMode,
  WorkbenchFigureSpec,
} from './workbenchResults.ts';
import type { WorkbenchIdealState } from './workbenchFileState.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';

interface WorkbenchIdealPointsWindowProps {
  file: WorkbenchIdealState | null;
  analysis: IdealGasAnalysis | null;
  workbenchCopy: WorkbenchCopy;
  pendingClearRelationKey: string | null;
  pendingRemovePointId: string | null;
  onClearRelation: () => void;
  onCancelClearRelation: () => void;
  onRequestRemovePoint: (point: IdealGasExperimentPoint) => void;
  onCancelRemovePoint: () => void;
}

export const WorkbenchIdealPointsWindow = ({
  file,
  analysis,
  workbenchCopy,
  pendingClearRelationKey,
  pendingRemovePointId,
  onClearRelation,
  onCancelClearRelation,
  onRequestRemovePoint,
  onCancelRemovePoint,
}: WorkbenchIdealPointsWindowProps) => {
  if (!file || !analysis) {
    return (
      <div className="studio-empty">
        <div>
          <strong>{workbenchCopy.results.noIdealPointsTitle}</strong>
          <p>{workbenchCopy.results.noIdealPointsBody}</p>
        </div>
      </div>
    );
  }

  const clearKey = `${file.id}:${file.relation}`;
  const points = analysis.sortedPoints;
  const relationLabel = getRelationLabel(file.relation);
  const verdictLabel = getLocalizedStatusValue(analysis.verdictState, workbenchCopy);

  return (
    <div className="studio-ideal-child-window-body">
      <div className="studio-ideal-results-card">
        <div className="studio-ideal-results-card-header">
          <div>
            <strong>{workbenchCopy.results.experimentStatus}</strong>
            <span>
              {points.length > 0
                ? workbenchCopy.results.resultsReady(relationLabel)
                : workbenchCopy.results.waitingForRecordedPoints(relationLabel)}
              {' / '}
              {workbenchCopy.results.recordedPoints(points.length)}
              {' / '}
              {verdictLabel}
            </span>
          </div>
        </div>
        <div className="studio-ideal-results-status-grid">
          <div><span>{workbenchCopy.results.activeRelation}</span><strong>{relationLabel}</strong></div>
          <div><span>{workbenchCopy.results.pointsMetric}</span><strong>{points.length}</strong></div>
          <div><span>{workbenchCopy.results.status}</span><strong>{verdictLabel}</strong></div>
          <div><span>{workbenchCopy.results.finalState}</span><strong>{file.needsReset ? workbenchCopy.parameters.idealRuntimeOnStart : getLocalizedStatusValue(file.runState, workbenchCopy)}</strong></div>
        </div>
      </div>

      <div className="studio-data-table-panel">
        <section className="studio-data-table-section">
          <div className="studio-results-subheader">
            <div>
              <strong>{workbenchCopy.results.pointsTitle(relationLabel)}</strong>
              <span>{workbenchCopy.results.recordedPoints(points.length)}</span>
            </div>
            <div className={`studio-results-clear-actions ${pendingClearRelationKey === clearKey ? 'studio-results-clear-actions-pending' : ''}`}>
              <button
                type="button"
                className={`studio-results-clear-button ${pendingClearRelationKey === clearKey ? 'studio-results-clear-confirm' : ''}`}
                onClick={onClearRelation}
                disabled={points.length === 0}
              >
                <Trash2 size={13} />
                {pendingClearRelationKey === clearKey ? workbenchCopy.results.confirmClear : workbenchCopy.results.clearRelation}
              </button>
              {pendingClearRelationKey === clearKey ? (
                <button
                  type="button"
                  className="studio-results-clear-button studio-results-clear-cancel"
                  onClick={onCancelClearRelation}
                >
                  {workbenchCopy.results.cancel}
                </button>
              ) : null}
            </div>
          </div>
          {points.length === 0 ? (
            <div className="studio-panel-note">
              {workbenchCopy.results.runToRecord}
            </div>
          ) : (
            <table className="studio-table studio-ideal-points-table">
              <thead>
                <tr>
                  <th>#</th>
                  {file.relation === 'pt' ? <th>{workbenchCopy.parameters.targetTemperature}</th> : null}
                  {file.relation === 'pv' ? <><th>L</th><th>V</th><th>1/V</th></> : null}
                  {file.relation === 'pn' ? <th>N</th> : null}
                  <th>{workbenchCopy.results.meanTemperature}</th>
                  <th>{workbenchCopy.results.measuredPressure}</th>
                  <th>{workbenchCopy.results.idealPressure}</th>
                  <th>{workbenchCopy.results.relativeGap}</th>
                  <th>{workbenchCopy.results.tableTime}</th>
                  <th>{workbenchCopy.results.tableAction}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr key={point.id}>
                    <td>{index + 1}</td>
                    {file.relation === 'pt' ? <td>{formatMetric(point.targetTemperature, 2)}</td> : null}
                    {file.relation === 'pv' ? (
                      <>
                        <td>{formatMaybeMetric(point.boxLength, 2)}</td>
                        <td>{formatMaybeMetric(point.volume, 1)}</td>
                        <td>{formatMaybeMetric(point.inverseVolume, 6)}</td>
                      </>
                    ) : null}
                    {file.relation === 'pn' ? <td>{formatMaybeMetric(point.particleCount, 0)}</td> : null}
                    <td>{formatMetric(point.meanTemperature, 3)}</td>
                    <td>{formatMetric(point.meanPressure, 5)}</td>
                    <td>{formatMetric(point.idealPressure, 5)}</td>
                    <td>{formatMetric(point.relativeGap, 2)}%</td>
                    <td>{new Date(point.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</td>
                    <td>
                      <div className={`studio-table-action-row ${pendingRemovePointId === point.id ? 'studio-table-action-row-pending' : ''}`}>
                        <button
                          type="button"
                          className={`studio-table-action ${pendingRemovePointId === point.id ? 'studio-table-action-confirm' : ''}`}
                          onClick={() => onRequestRemovePoint(point)}
                        >
                          {pendingRemovePointId === point.id ? workbenchCopy.results.confirmRemove : workbenchCopy.results.remove}
                        </button>
                        {pendingRemovePointId === point.id ? (
                          <button
                            type="button"
                            className="studio-table-action studio-table-action-cancel"
                            aria-label={`${workbenchCopy.results.cancel} ${point.id}`}
                            onClick={onCancelRemovePoint}
                          >
                            {workbenchCopy.results.cancel}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

interface WorkbenchIdealVerificationWindowProps {
  file: WorkbenchIdealState | null;
  analysis: IdealGasAnalysis | null;
  figureSpecs: WorkbenchFigureSpec[];
  language: WorkbenchLanguagePreference;
  workbenchCopy: WorkbenchCopy;
  exportEnvironmentLabel: string;
  exportInProgress: boolean;
  isExportReady: (mode: WorkbenchExportMode) => boolean;
  onExport: (mode: WorkbenchExportMode) => void;
}

export const WorkbenchIdealVerificationWindow = ({
  file,
  analysis,
  figureSpecs,
  language,
  workbenchCopy,
  exportEnvironmentLabel,
  exportInProgress,
  isExportReady,
  onExport,
}: WorkbenchIdealVerificationWindowProps) => {
  if (!file || !analysis) {
    return (
      <div className="studio-empty">
        <div>
          <strong>{workbenchCopy.results.noIdealVerificationTitle}</strong>
          <p>{workbenchCopy.results.noIdealVerificationBody}</p>
        </div>
      </div>
    );
  }

  const verificationSpec = figureSpecs.find((figure) => figure.id === 'ideal-verification');
  const rawPvSpec = figureSpecs.find((figure) => figure.id === 'ideal-raw-pv');
  const pointsSpec = figureSpecs.find((figure) => figure.id === 'ideal-points');
  const historySpec = figureSpecs.find((figure) => figure.id === 'ideal-history');
  const idealLanguage = getIdealExperimentLanguageCode(language);
  const historyContent = getIdealHistoryContent(idealLanguage, file.relation);
  const failureReasonText = getIdealFailureReasonText(analysis.diagnosis.failureReason, idealLanguage);
  const recommendationText = getIdealRecommendationText(
    analysis.diagnosis.failureReason,
    analysis.verdictState,
    file.relation,
    idealLanguage,
  );
  const exportSpecs = figureSpecs.filter((figure) => (
    figure.id === 'ideal-verification' ||
    figure.id === 'ideal-raw-pv' ||
    figure.id === 'ideal-points' ||
    figure.id === 'ideal-history'
  ));

  return (
    <div className="studio-ideal-child-window-body">
      <WorkbenchIdealVerificationPanel
        analysis={analysis}
        file={file}
        language={language}
        workbenchCopy={workbenchCopy}
      />
      <div className={`studio-ideal-results-card ${analysis.isVerified ? 'studio-ideal-history-unlocked' : 'studio-ideal-history-locked'}`}>
        <div className="studio-ideal-results-card-header">
          <div>
            <strong>{analysis.isVerified ? historyContent.title : workbenchCopy.results.historyLockedFor(getRelationLabel(file.relation))}</strong>
            <span>{analysis.isVerified ? workbenchCopy.results.historyUnlocked : workbenchCopy.results.historyUnlockHint}</span>
          </div>
        </div>
        {analysis.isVerified ? (
          <div className="studio-ideal-history-grid">
            <div>
              <span>{workbenchCopy.results.historicalContext}</span>
              <strong>{historyContent.discovery}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.workbenchInterpretation}</span>
              <strong>{historyContent.simulation}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.keyFigures}</span>
              <strong>{workbenchCopy.results.keyFiguresValue(formatMaybeMetric(analysis.regression.rSquared, 5), analysis.regression.slopeError === null ? '--' : `${formatMetric(analysis.regression.slopeError, 2)}%`)}</strong>
            </div>
          </div>
        ) : (
          <div className="studio-ideal-history-grid">
            <div>
              <span>{workbenchCopy.results.whyLocked}</span>
              <strong>{failureReasonText}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.recommendedNextStep}</span>
              <strong>{recommendationText}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="studio-ideal-results-card">
        <div className="studio-ideal-results-card-header">
          <div>
            <strong>{workbenchCopy.results.export}</strong>
            <span>{workbenchCopy.results.exportFilesHint} {exportEnvironmentLabel}</span>
          </div>
        </div>
        <div className="studio-ideal-export-actions">
          <button type="button" disabled={!isExportReady('completeBundle') || exportInProgress} onClick={() => onExport('completeBundle')}>
            <FileArchive size={13} />
            {workbenchCopy.results.exportAll}
          </button>
          <button type="button" disabled={!isExportReady('report') || exportInProgress} onClick={() => onExport('report')}>
            <Download size={13} />
            {workbenchCopy.results.reportPdf}
          </button>
          <button type="button" disabled={!isExportReady('figuresZip') || exportInProgress} onClick={() => onExport('figuresZip')}>
            <BarChart3 size={13} />
            {workbenchCopy.results.exportFigures}
          </button>
          <button type="button" disabled={!isExportReady('pointsCsv') || exportInProgress} onClick={() => onExport('pointsCsv')}>
            <Table2 size={13} />
            {workbenchCopy.results.pointsCsv}
          </button>
        </div>
        <div className="studio-ideal-export-files">
          {verificationSpec ? <div><span>{workbenchCopy.results.verification}</span><strong>{verificationSpec.recommendedFilename}</strong></div> : null}
          {rawPvSpec ? <div><span>{workbenchCopy.results.rawPv}</span><strong>{rawPvSpec.recommendedFilename}</strong></div> : null}
          {pointsSpec ? <div><span>{workbenchCopy.results.pointsCsv}</span><strong>{pointsSpec.recommendedFilename}</strong></div> : null}
          {historySpec ? <div><span>{workbenchCopy.results.history}</span><strong>{historySpec.recommendedFilename}</strong></div> : null}
        </div>
        <div className="studio-figure-list studio-ideal-export-specs">
          {exportSpecs.map((figure) => (
            <div className="studio-figure-row" key={`ideal-export-${figure.id}`}>
              <div>
                <strong>{figure.title}</strong>
                <small>{figure.recommendedFilename}</small>
              </div>
              <span>{figure.dataCount}</span>
              <em className={`studio-figure-status-${figure.status}`}>{workbenchCopy.results.figureStatus[figure.status]}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
