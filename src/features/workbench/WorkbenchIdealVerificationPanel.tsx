import {
  getIdealFailureReasonText,
  getIdealRecommendationText,
  getRelationLabel,
  type IdealGasAnalysis,
} from '../../domain/idealGas/idealGasExperiment.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import {
  createIdealVerificationChartModel,
  type IdealVerificationChartVariant,
} from './workbenchIdealVerificationChart.ts';
import {
  formatMaybeMetric,
  formatMetric,
  getIdealExperimentLanguageCode,
  getLocalizedStatusValue,
} from './workbenchPresentationFormatting.ts';
import type { WorkbenchIdealState } from './workbenchFileState.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';

interface WorkbenchIdealVerificationPanelProps {
  analysis: IdealGasAnalysis | null;
  file: WorkbenchIdealState | null;
  language: WorkbenchLanguagePreference;
  workbenchCopy: WorkbenchCopy;
}

interface IdealValidationChartProps {
  analysis: IdealGasAnalysis;
  variant?: IdealVerificationChartVariant;
  workbenchCopy: WorkbenchCopy;
}

const IdealValidationChart = ({
  analysis,
  variant = 'linear',
  workbenchCopy,
}: IdealValidationChartProps) => {
  const chart = createIdealVerificationChartModel(analysis, variant);
  if (!chart) {
    return (
      <div className="studio-final-figure-empty">
        {workbenchCopy.results.noPoints}
      </div>
    );
  }

  return (
    <div className="studio-ideal-chart-card">
      <svg
        viewBox="0 0 392 176"
        role="img"
        aria-label={workbenchCopy.results.verificationChartAria(
          getRelationLabel(analysis.relation),
        )}
      >
        <line x1="34" y1="146" x2="358" y2="146" />
        <line x1="34" y1="34" x2="34" y2="146" />
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={`grid-${ratio}`}
            className="studio-ideal-chart-grid"
            x1="34"
            y1={146 - ratio * 112}
            x2="358"
            y2={146 - ratio * 112}
          />
        ))}
        {chart.theoryPoints ? (
          <polyline className="studio-ideal-chart-theory" points={chart.theoryPoints} />
        ) : null}
        {chart.fitPoints ? (
          <polyline className="studio-ideal-chart-fit" points={chart.fitPoints} />
        ) : null}
        <polyline className="studio-ideal-chart-measured" points={chart.measuredPoints} />
        {chart.points.map((point) => (
          <circle
            key={`${variant}-${point.id}`}
            cx={point.cx}
            cy={point.cy}
            r="3.4"
          />
        ))}
        <text x="196" y="169">{chart.xLabel}</text>
        <text x="8" y="25">P</text>
      </svg>
      <div className="studio-ideal-chart-legend">
        <span>
          <i className="studio-ideal-legend-measured-dot" />
          {workbenchCopy.results.measuredLegend}
        </span>
        <span>
          <i className="studio-ideal-legend-fit" />
          {workbenchCopy.results.fitLegend}
        </span>
        <span>
          <i className="studio-ideal-legend-theory" />
          {workbenchCopy.results.theoryLegend}
        </span>
      </div>
    </div>
  );
};

export const WorkbenchIdealVerificationPanel = ({
  analysis,
  file,
  language,
  workbenchCopy,
}: WorkbenchIdealVerificationPanelProps) => {
  if (!file || !analysis) {
    return (
      <div className="studio-empty">
        <div>
          <strong>{workbenchCopy.results.noVerificationChartTitle}</strong>
          <p>{workbenchCopy.results.noVerificationChartBody}</p>
        </div>
      </div>
    );
  }

  const failureReasonText = getIdealFailureReasonText(
    analysis.diagnosis.failureReason,
    getIdealExperimentLanguageCode(language),
  );
  const recommendationText = getIdealRecommendationText(
    analysis.diagnosis.failureReason,
    analysis.verdictState,
    file.relation,
    getIdealExperimentLanguageCode(language),
  );
  const isPvVerification = file.relation === 'pv';

  return (
    <div className={`studio-verification-panel studio-verification-panel-${file.relation}`}>
      <div
        className={`studio-verification-main-layout ${
          isPvVerification
            ? 'studio-verification-layout-pv'
            : 'studio-verification-layout-single'
        }`}
      >
        <div className="studio-verification-chart-column">
          <section className="studio-verification-chart-section studio-verification-chart-primary">
            <div className="studio-results-subheader">
              <div>
                <strong>
                  {isPvVerification
                    ? workbenchCopy.results.pvLinearizedValidation
                    : workbenchCopy.results.relationValidation(
                        getRelationLabel(file.relation),
                      )}
                </strong>
                <span>{workbenchCopy.results.measuredScatterHint}</span>
              </div>
            </div>
            <IdealValidationChart
              analysis={analysis}
              workbenchCopy={workbenchCopy}
            />
          </section>

          {isPvVerification ? (
            <section className="studio-verification-chart-section studio-verification-chart-secondary">
              <div className="studio-results-subheader">
                <div>
                  <strong>{workbenchCopy.results.originalPvPhysicalView}</strong>
                  <span>{workbenchCopy.results.originalPvPhysicalHint}</span>
                </div>
              </div>
              <IdealValidationChart
                analysis={analysis}
                variant="pvRaw"
                workbenchCopy={workbenchCopy}
              />
            </section>
          ) : null}
        </div>

        <div className="studio-verification-side">
          <div
            className={`studio-result-status ${
              analysis.isVerified
                ? 'studio-result-status-ready'
                : 'studio-result-status-waiting'
            }`}
          >
            <strong>
              {workbenchCopy.results.verdictLabel(
                getRelationLabel(file.relation),
                getLocalizedStatusValue(analysis.verdictState, workbenchCopy),
              )}
            </strong>
            <span>{recommendationText}</span>
          </div>

          <div className="studio-analysis-grid">
            <div className="studio-analysis-cell">
              <span>{workbenchCopy.results.pointsMetric}</span>
              <strong>{analysis.sortedPoints.length}</strong>
            </div>
            <div className="studio-analysis-cell">
              <span>{workbenchCopy.results.rSquared}</span>
              <strong>{formatMaybeMetric(analysis.regression.rSquared, 5)}</strong>
            </div>
            <div className="studio-analysis-cell">
              <span>{workbenchCopy.results.slope}</span>
              <strong>{formatMaybeMetric(analysis.regression.slope, 6)}</strong>
            </div>
            <div className="studio-analysis-cell">
              <span>{workbenchCopy.results.theorySlope}</span>
              <strong>{formatMaybeMetric(analysis.theoreticalSlope, 6)}</strong>
            </div>
            <div className="studio-analysis-cell">
              <span>{workbenchCopy.results.slopeError}</span>
              <strong>
                {analysis.regression.slopeError === null
                  ? '--'
                  : `${formatMetric(analysis.regression.slopeError, 2)}%`}
              </strong>
            </div>
            <div className="studio-analysis-cell">
              <span>{workbenchCopy.results.failureReason}</span>
              <strong>
                {analysis.diagnosis.failureReason
                  ? failureReasonText
                  : workbenchCopy.results.noneValue}
              </strong>
            </div>
          </div>

          <div className="studio-ideal-diagnosis-card">
            <div>
              <span>{workbenchCopy.results.whyItHappened}</span>
              <strong>{failureReasonText}</strong>
            </div>
            <div>
              <span>{workbenchCopy.results.recommendedNextStep}</span>
              <strong>{recommendationText}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
