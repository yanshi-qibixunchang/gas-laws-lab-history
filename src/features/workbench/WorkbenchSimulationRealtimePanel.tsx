import {
  getRelationLabel,
  getRelationVariableNumericValue,
  type IdealGasAnalysis,
} from '../../domain/idealGas/idealGasExperiment.ts';
import type {
  WorkbenchIdealState,
  WorkbenchStandardState,
} from './workbenchFileState.ts';
import {
  formatMaybeMetric,
  formatMetric,
  formatPercent,
  getCompactHistogramBins,
  getLocalizedStatusValue,
} from './workbenchPresentationFormatting.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';

interface WorkbenchSimulationRealtimePanelProps {
  file: WorkbenchStandardState | WorkbenchIdealState;
  idealAnalysis: IdealGasAnalysis | null;
  standardSampleCount: number;
  workbenchCopy: WorkbenchCopy;
}

export const WorkbenchSimulationRealtimePanel = ({
  file: activeFile,
  idealAnalysis,
  standardSampleCount,
  workbenchCopy,
}: WorkbenchSimulationRealtimePanelProps) => {
  const renderRealtimeHistogram = (
    title: string,
    bins: WorkbenchStandardState['chartData']['speed'],
    accent: 'blue' | 'violet',
  ) => {
    const compactBins = getCompactHistogramBins(bins);
    const maxProbability = Math.max(
      0.0001,
      ...compactBins.map((bin) => bin.probability),
      ...compactBins.map((bin) => bin.theoretical ?? 0),
    );

    return (
      <div className={`studio-live-chart studio-live-chart-${accent}`}>
        <div className="studio-live-chart-header">
          <span>{title}</span>
          <strong>
            {standardSampleCount > 0
              ? workbenchCopy.results.sampleWindows(standardSampleCount)
              : workbenchCopy.results.waiting}
          </strong>
        </div>
        <div className="studio-live-chart-bars">
          {compactBins.length > 0 ? (
            compactBins.map((bin, index) => {
              const simulationHeight = Math.max(2, (bin.probability / maxProbability) * 100);
              const theoryHeight = bin.theoretical
                ? Math.max(2, (bin.theoretical / maxProbability) * 100)
                : 0;
              const label = `${bin.binStart.toFixed(2)}-${bin.binEnd.toFixed(2)}: ${bin.probability.toFixed(4)}`;

              return (
                <span
                  className="studio-live-chart-bin"
                  key={`${title}-${index}`}
                  data-prompt-tooltip={label}
                >
                  <i style={{ height: `${simulationHeight}%` }} />
                  {theoryHeight > 0 ? <em style={{ bottom: `${theoryHeight}%` }} /> : null}
                </span>
              );
            })
          ) : (
            <div className="studio-live-chart-empty">
              {workbenchCopy.results.standardRealtimeEmpty}
            </div>
          )}
        </div>
        <div className="studio-live-chart-axis">
          <span>{compactBins[0]?.binStart.toFixed(2) ?? '0.00'}</span>
          <span>{workbenchCopy.results.probabilityDensity}</span>
          <span>{compactBins[compactBins.length - 1]?.binEnd.toFixed(2) ?? '0.00'}</span>
        </div>
      </div>
    );
  };

  const renderIdealPressureTrace = () => {
    if (activeFile.kind !== 'ideal') return null;

    const summary = activeFile.latestPressureSummary;
    const history = summary?.history.slice(-42) ?? [];
    const maxPressure = Math.max(
      0.0001,
      ...history.map((point) => point.measuredPressure),
      ...history.map((point) => point.idealPressure),
    );

    return (
      <div className="studio-live-chart studio-ideal-pressure-chart">
        <div className="studio-live-chart-header">
          <span>
            {workbenchCopy.results.idealPressureTrace(getRelationLabel(activeFile.relation))}
          </span>
          <strong>
            {summary
              ? workbenchCopy.results.samples(summary.sampleCount)
              : workbenchCopy.results.waiting}
          </strong>
        </div>
        <div className="studio-ideal-pressure-bars">
          {history.length > 0 ? (
            history.map((point, index) => {
              const measuredHeight = Math.max(2, (point.measuredPressure / maxPressure) * 100);
              const idealHeight = Math.max(2, (point.idealPressure / maxPressure) * 100);
              return (
                <span
                  key={`${point.time}-${index}`}
                  data-prompt-tooltip={`t=${point.time.toFixed(2)} ${workbenchCopy.results.measuredPressure}=${point.measuredPressure.toFixed(4)} ${workbenchCopy.results.idealPressure}=${point.idealPressure.toFixed(4)}`}
                >
                  <i style={{ height: `${measuredHeight}%` }} />
                  <em style={{ bottom: `${idealHeight}%` }} />
                </span>
              );
            })
          ) : (
            <div className="studio-live-chart-empty">
              {workbenchCopy.results.currentIdealPressureHint}
            </div>
          )}
        </div>
        <div className="studio-live-chart-axis">
          <span>{workbenchCopy.results.measuredBars}</span>
          <span>{workbenchCopy.results.idealLine}</span>
          <span>{getRelationLabel(activeFile.relation)}</span>
        </div>
      </div>
    );
  };

  const renderIdealRelationSnapshot = () => {
    if (activeFile.kind !== 'ideal') return null;

    const summary = activeFile.latestPressureSummary;
    const relationValue = getRelationVariableNumericValue(
      activeFile.relation,
      activeFile.activeParams,
    );

    return (
      <div className="studio-ideal-point-strip">
        <div>
          <span>{workbenchCopy.results.scan}</span>
          <strong>{formatMetric(relationValue, activeFile.relation === 'pn' ? 0 : 3)}</strong>
        </div>
        <div>
          <span>{workbenchCopy.results.measuredPressure}</span>
          <strong>{formatMaybeMetric(summary?.meanPressure, 4)}</strong>
        </div>
        <div>
          <span>{workbenchCopy.results.idealPressure}</span>
          <strong>{formatMaybeMetric(summary?.meanIdealPressure, 4)}</strong>
        </div>
        <div>
          <span>{workbenchCopy.results.gap}</span>
          <strong>
            {summary?.relativeGap === null || summary?.relativeGap === undefined
              ? '--'
              : `${formatMetric(summary.relativeGap, 2)}%`}
          </strong>
        </div>
        <div>
          <span>{workbenchCopy.results.status}</span>
          <strong>
            {getLocalizedStatusValue(
              idealAnalysis?.verdictState ?? 'insufficient',
              workbenchCopy,
            )}
          </strong>
        </div>
        <div>
          <span>{workbenchCopy.results.finalState}</span>
          <strong>
            {activeFile.needsReset
              ? workbenchCopy.parameters.idealRuntimeOnStart
              : getLocalizedStatusValue(activeFile.runState, workbenchCopy)}
          </strong>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`studio-realtime-panel ${
        activeFile.kind === 'ideal'
          ? 'studio-realtime-panel-ideal'
          : 'studio-realtime-panel-standard'
      }`}
    >
      <div
        className={`studio-realtime-summary ${
          activeFile.kind === 'ideal'
            ? 'studio-realtime-summary-ideal'
            : 'studio-realtime-summary-standard'
        }`}
      >
        {activeFile.kind === 'ideal' ? (
          <>
            <div data-prompt-tooltip={workbenchCopy.results.meanTemperature}>
              <span>{workbenchCopy.results.meanTemperature}</span>
              <strong>
                {formatMaybeMetric(
                  activeFile.latestPressureSummary?.meanTemperature
                    ?? activeFile.stats.temperature,
                )}
              </strong>
            </div>
            <div data-prompt-tooltip={workbenchCopy.results.measuredPressure}>
              <span>{workbenchCopy.results.measuredPressure}</span>
              <strong>
                {formatMaybeMetric(
                  activeFile.latestPressureSummary?.meanPressure
                    ?? activeFile.stats.pressure,
                  4,
                )}
              </strong>
            </div>
            <div data-prompt-tooltip={workbenchCopy.results.idealPressure}>
              <span>{workbenchCopy.results.idealPressure}</span>
              <strong>
                {formatMaybeMetric(activeFile.latestPressureSummary?.meanIdealPressure, 4)}
              </strong>
            </div>
            <div data-prompt-tooltip={workbenchCopy.results.relativeGap}>
              <span>{workbenchCopy.results.gap}</span>
              <strong>
                {activeFile.latestPressureSummary?.relativeGap === null
                || activeFile.latestPressureSummary?.relativeGap === undefined
                  ? '--'
                  : `${formatMetric(activeFile.latestPressureSummary.relativeGap, 2)}%`}
              </strong>
            </div>
            <div data-prompt-tooltip={workbenchCopy.results.activeRelation}>
              <span>{workbenchCopy.parameters.relation}</span>
              <strong>{getRelationLabel(activeFile.relation)}</strong>
            </div>
            <div data-prompt-tooltip={workbenchCopy.results.samplingProgress}>
              <span>{workbenchCopy.results.samplingProgress}</span>
              <strong>{formatPercent(activeFile.stats.progress)}</strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>{workbenchCopy.results.temperature}</span>
              <strong>{formatMetric(activeFile.stats.temperature)}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.pressure}</span>
              <strong>{formatMetric(activeFile.stats.pressure, 4)}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.meanSpeed}</span>
              <strong>{formatMetric(activeFile.stats.meanSpeed)}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.rmsSpeed}</span>
              <strong>{formatMetric(activeFile.stats.rmsSpeed)}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.phase}</span>
              <strong>{workbenchCopy.results.phaseStates[activeFile.stats.phase]}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.samplingProgress}</span>
              <strong>{formatPercent(activeFile.stats.progress)}</strong>
            </div>
          </>
        )}
      </div>
      <div
        className={`studio-live-charts ${
          activeFile.kind === 'ideal' ? 'studio-live-charts-ideal' : ''
        }`}
      >
        {activeFile.kind === 'standard' ? (
          <>
            {renderRealtimeHistogram(
              workbenchCopy.results.speedDistribution,
              activeFile.chartData.speed,
              'blue',
            )}
            {renderRealtimeHistogram(
              workbenchCopy.results.energyDistribution,
              activeFile.chartData.energy,
              'violet',
            )}
          </>
        ) : (
          <>
            {renderIdealPressureTrace()}
            {renderIdealRelationSnapshot()}
          </>
        )}
      </div>
    </div>
  );
};
