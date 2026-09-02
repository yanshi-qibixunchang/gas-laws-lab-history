import type { WorkbenchResultSummary } from './workbenchResults.ts';
import {
  formatMetric,
  getLocalizedStatusValue,
} from './workbenchPresentationFormatting.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';

interface WorkbenchStandardResultsContentProps {
  resultSummary: WorkbenchResultSummary;
  workbenchCopy: WorkbenchCopy;
}

export const WorkbenchStandardResultsSummary = ({
  resultSummary,
  workbenchCopy,
}: WorkbenchStandardResultsContentProps) => (
  <div className="studio-results-section">
    <div className={`studio-result-status ${resultSummary.ready ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
      <strong>{resultSummary.ready ? workbenchCopy.results.resultReadyStatus : workbenchCopy.results.resultNotReadyStatus}</strong>
      <span>
        {resultSummary.ready
          ? workbenchCopy.results.resultReadyDetail
          : workbenchCopy.results.resultNotReadyDetail}
      </span>
    </div>

    <div className="studio-analysis-grid">
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalTime}</span><strong>{formatMetric(resultSummary.finalTime, 2)} s</strong></div>
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalTemperature}</span><strong>{formatMetric(resultSummary.temperature)}</strong></div>
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalPressure}</span><strong>{formatMetric(resultSummary.pressure, 4)}</strong></div>
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.meanSpeed}</span><strong>{formatMetric(resultSummary.meanSpeed)}</strong></div>
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.rmsSpeed}</span><strong>{formatMetric(resultSummary.rmsSpeed)}</strong></div>
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.energyDrift}</span><strong>{resultSummary.energyDriftPercent === null ? '--' : `${formatMetric(resultSummary.energyDriftPercent, 4)}%`}</strong></div>
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.speedBins}</span><strong>{resultSummary.speedBinCount}</strong></div>
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.energyBins}</span><strong>{resultSummary.energyBinCount}</strong></div>
      <div className="studio-analysis-cell"><span>{workbenchCopy.results.tempSamples}</span><strong>{resultSummary.tempHistoryCount}</strong></div>
    </div>
  </div>
);

export const WorkbenchStandardResultsDataTable = ({
  resultSummary,
  workbenchCopy,
}: WorkbenchStandardResultsContentProps) => (
  <div className="studio-data-table-panel">
    <section className="studio-data-table-section">
      <h4>{workbenchCopy.results.finalState}</h4>
      <table className="studio-table">
        <tbody>
          <tr><th>{workbenchCopy.results.metric}</th><th>{workbenchCopy.results.value}</th><th>{workbenchCopy.results.status}</th></tr>
          <tr><td>{workbenchCopy.results.finalSpeedSamples}</td><td>{resultSummary.speedSampleCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
          <tr><td>{workbenchCopy.results.finalEnergySamples}</td><td>{resultSummary.energySampleCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
          <tr><td>{workbenchCopy.results.tempHistorySamples}</td><td>{resultSummary.tempHistoryCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
          <tr><td>{workbenchCopy.results.finalDataReady}</td><td>{resultSummary.ready ? workbenchCopy.results.yes : workbenchCopy.results.no}</td><td>{getLocalizedStatusValue(resultSummary.runState, workbenchCopy)}</td></tr>
          <tr><td>{workbenchCopy.results.energyDrift}</td><td>{resultSummary.energyDriftPercent === null ? '--' : `${formatMetric(resultSummary.energyDriftPercent, 4)}%`}</td><td>{workbenchCopy.results.diagnostic}</td></tr>
          <tr><td>{workbenchCopy.results.meanAbsTempError}</td><td>{resultSummary.temperatureErrorMeanAbs === null ? '--' : formatMetric(resultSummary.temperatureErrorMeanAbs, 5)}</td><td>{workbenchCopy.results.diagnostic}</td></tr>
        </tbody>
      </table>
    </section>
  </div>
);
