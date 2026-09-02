import type { ReactNode } from 'react';
import { FileArchive } from 'lucide-react';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import {
  getCompactHistogramBins,
} from './workbenchPresentationFormatting.ts';
import type {
  WorkbenchFigureSpec,
  WorkbenchResultSummary,
} from './workbenchResults.ts';
import type { WorkbenchFileState } from './workbenchState.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';

const FINAL_CHART_VIEWBOX_WIDTH = 100;
const FINAL_CHART_VIEWBOX_HEIGHT = 64;
const FINAL_CHART_LEFT = 10;
const FINAL_CHART_RIGHT = 94;
const FINAL_CHART_TOP = 8;
const FINAL_CHART_BOTTOM = 54;
const FINAL_CHART_PLOT_WIDTH = FINAL_CHART_RIGHT - FINAL_CHART_LEFT;
const FINAL_CHART_PLOT_HEIGHT = FINAL_CHART_BOTTOM - FINAL_CHART_TOP;

type FinalChartLegendPosition = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';

interface FinalChartLegendItem {
  kind: 'bar' | 'line' | 'point' | 'boundary';
  label: string;
  className?: string;
}

interface WorkbenchStandardFiguresPanelProps {
  file: WorkbenchFileState;
  figureSpecs: WorkbenchFigureSpec[];
  resultSummary: WorkbenchResultSummary;
  language: WorkbenchLanguagePreference;
  workbenchCopy: WorkbenchCopy;
  exportInProgress: boolean;
  figuresExportReady: boolean;
  onExportFigures: () => void;
}

export const WorkbenchStandardFiguresPanel = ({
  file,
  figureSpecs,
  resultSummary,
  language,
  workbenchCopy,
  exportInProgress,
  figuresExportReady,
  onExportFigures,
}: WorkbenchStandardFiguresPanelProps) => {
  const finalChartData = file.kind === 'standard' ? file.finalChartData : null;

  const getFinalChartAxisCopy = (figureId: string): { xLabel: string; yLabel: string } => {
    const finalChartCopy = language === 'en'
      ? {
          speed: 'Speed v',
          energy: 'Energy E',
          time: 'Time t',
          logDensity: 'Log density',
          temperatureError: 'Temperature error',
          totalEnergy: 'Total energy',
        }
      : language === 'zh-TW'
        ? {
            speed: '速度 v',
            energy: '能量 E',
            time: '時間 t',
            logDensity: '對數密度',
            temperatureError: '溫度誤差',
            totalEnergy: '總能量',
          }
        : {
            speed: '速度 v',
            energy: '能量 E',
            time: '时间 t',
            logDensity: '对数密度',
            temperatureError: '温度误差',
            totalEnergy: '总能量',
          };

    switch (figureId) {
      case 'speed-distribution':
        return { xLabel: finalChartCopy.speed, yLabel: workbenchCopy.results.probabilityDensity };
      case 'energy-distribution':
        return { xLabel: finalChartCopy.energy, yLabel: workbenchCopy.results.probabilityDensity };
      case 'semilog-energy':
        return { xLabel: finalChartCopy.energy, yLabel: finalChartCopy.logDensity };
      case 'temperature-error':
        return { xLabel: finalChartCopy.time, yLabel: finalChartCopy.temperatureError };
      case 'total-energy':
        return { xLabel: finalChartCopy.time, yLabel: finalChartCopy.totalEnergy };
      default:
        return { xLabel: '', yLabel: '' };
    }
  };

  const getFinalChartSparseLegendPosition = (
    points: Array<{ x: number; y: number }>,
  ): FinalChartLegendPosition => {
    const candidates: Array<{
      position: FinalChartLegendPosition;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
    }> = [
      { position: 'upper-right', xMin: 0.58, xMax: 1, yMin: 0, yMax: 0.42 },
      { position: 'upper-left', xMin: 0, xMax: 0.42, yMin: 0, yMax: 0.42 },
      { position: 'lower-right', xMin: 0.58, xMax: 1, yMin: 0.58, yMax: 1 },
      { position: 'lower-left', xMin: 0, xMax: 0.42, yMin: 0.58, yMax: 1 },
    ];

    return candidates.reduce((best, candidate) => {
      const hits = points.filter((point) => {
        const normalizedX = (point.x - FINAL_CHART_LEFT) / FINAL_CHART_PLOT_WIDTH;
        const normalizedY = (point.y - FINAL_CHART_TOP) / FINAL_CHART_PLOT_HEIGHT;
        return (
          normalizedX >= candidate.xMin &&
          normalizedX <= candidate.xMax &&
          normalizedY >= candidate.yMin &&
          normalizedY <= candidate.yMax
        );
      }).length;
      return hits < best.hits ? { position: candidate.position, hits } : best;
    }, { position: 'upper-right' as FinalChartLegendPosition, hits: Number.POSITIVE_INFINITY }).position;
  };

  const getFinalChartLegendWidth = (items: FinalChartLegendItem[]) => {
    const estimateLabelWidth = (label: string) => Array.from(label).reduce((sum, char) => {
      if (/[\u3400-\u9fff]/.test(char)) return sum + 2.55;
      if (char === ' ') return sum + 0.78;
      if (/[A-Z0-9]/.test(char)) return sum + 1.55;
      if (/[il.,:;]/.test(char)) return sum + 0.72;
      return sum + 1.28;
    }, 0);
    const longestLabelWidth = Math.max(0, ...items.map((item) => estimateLabelWidth(item.label)));
    return Math.min(34, Math.max(13.5, longestLabelWidth + 8.9));
  };

  const renderFinalChartLegend = (
    items: FinalChartLegendItem[],
    position: FinalChartLegendPosition = 'upper-right',
    width?: number,
  ) => {
    const panelWidth = width ?? getFinalChartLegendWidth(items);
    const panelLeft = -2.1;
    const panelTop = -2.5;
    const itemGap = 4.35;
    const height = Math.max(6.3, items.length * itemGap + 1.15);
    const positions: Record<FinalChartLegendPosition, { x: number; y: number }> = {
      'upper-left': { x: FINAL_CHART_LEFT + 4.2, y: FINAL_CHART_TOP + 4.7 },
      'upper-right': { x: FINAL_CHART_RIGHT + 0.9 - panelWidth, y: FINAL_CHART_TOP + 4.7 },
      'lower-left': { x: FINAL_CHART_LEFT + 4.2, y: FINAL_CHART_BOTTOM - height - 2.4 },
      'lower-right': { x: FINAL_CHART_RIGHT + 0.9 - panelWidth, y: FINAL_CHART_BOTTOM - height - 2.4 },
    };
    const origin = positions[position];

    return (
      <g className="studio-final-chart-legend" transform={`translate(${origin.x} ${origin.y})`}>
        <rect className="studio-final-chart-legend-panel" x={panelLeft} y={panelTop} width={panelWidth} height={height} />
        {items.map((item, index) => {
          const itemY = index * itemGap;
          const textX = 3.45;
          return (
            <g key={`${item.kind}-${item.label}`} className="studio-final-chart-legend-item">
              {item.kind === 'bar' && (
                <rect className="studio-final-chart-bar studio-final-chart-legend-bar" x="-1.35" y={itemY - 1.25} width="2.65" height="2.35" />
              )}
              {item.kind === 'point' && (
                <circle className={item.className} cx="-0.2" cy={itemY} r="1.1" />
              )}
              {item.kind === 'line' && (
                <line className={item.className} x1="-1.55" y1={itemY} x2="1.45" y2={itemY} />
              )}
              {item.kind === 'boundary' && (
                <line className="studio-final-chart-legend-line" x1="-1.55" y1={itemY} x2="1.45" y2={itemY} />
              )}
              <text className="studio-final-chart-legend-text" x={textX} y={itemY + 0.82}>{item.label}</text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderFinalChartFrame = (
    figureId: string,
    variant: 'bars' | 'line' | 'semilog',
    children: ReactNode,
  ) => {
    const horizontalGrid = [0, 0.25, 0.5, 0.75, 1];
    const verticalGrid = [0, 0.25, 0.5, 0.75, 1];
    const { xLabel, yLabel } = getFinalChartAxisCopy(figureId);

    return (
      <svg
        className={`studio-final-chart studio-final-chart-${variant} studio-final-chart-${figureId}`}
        viewBox={`0 0 ${FINAL_CHART_VIEWBOX_WIDTH} ${FINAL_CHART_VIEWBOX_HEIGHT}`}
        aria-hidden="true"
        focusable="false"
      >
        <rect className="studio-final-chart-panel" x="5.5" y="5" width="91" height="52" />
        <g className="studio-final-chart-grid">
          {horizontalGrid.map((ratio) => {
            const y = FINAL_CHART_TOP + FINAL_CHART_PLOT_HEIGHT * ratio;
            return <line key={`h-${ratio}`} x1={FINAL_CHART_LEFT} y1={y} x2={FINAL_CHART_RIGHT} y2={y} />;
          })}
          {verticalGrid.map((ratio) => {
            const x = FINAL_CHART_LEFT + FINAL_CHART_PLOT_WIDTH * ratio;
            return <line key={`v-${ratio}`} x1={x} y1={FINAL_CHART_TOP} x2={x} y2={FINAL_CHART_BOTTOM} />;
          })}
        </g>
        <line className="studio-final-chart-axis" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_BOTTOM} x2={FINAL_CHART_RIGHT} y2={FINAL_CHART_BOTTOM} />
        <line className="studio-final-chart-axis" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_TOP} x2={FINAL_CHART_LEFT} y2={FINAL_CHART_BOTTOM} />
        <g className="studio-final-chart-ticks">
          {verticalGrid.map((ratio) => {
            const x = FINAL_CHART_LEFT + FINAL_CHART_PLOT_WIDTH * ratio;
            return <line key={`xt-${ratio}`} className="studio-final-chart-tick" x1={x} y1={FINAL_CHART_BOTTOM} x2={x} y2={FINAL_CHART_BOTTOM - 2.4} />;
          })}
          {horizontalGrid.map((ratio) => {
            const y = FINAL_CHART_TOP + FINAL_CHART_PLOT_HEIGHT * ratio;
            return <line key={`yt-${ratio}`} className="studio-final-chart-tick" x1={FINAL_CHART_LEFT} y1={y} x2={FINAL_CHART_LEFT + 2.4} y2={y} />;
          })}
        </g>
        {xLabel && (
          <text className="studio-final-chart-axis-label studio-final-chart-x-label" x={(FINAL_CHART_LEFT + FINAL_CHART_RIGHT) / 2} y="61.2">{xLabel}</text>
        )}
        {yLabel && (
          <text className="studio-final-chart-axis-label studio-final-chart-y-label" transform={`translate(3.2 ${(FINAL_CHART_TOP + FINAL_CHART_BOTTOM) / 2}) rotate(-90)`}>{yLabel}</text>
        )}
        {children}
      </svg>
    );
  };

  const renderFinalFigurePreview = (figureId: string) => {
    if (!resultSummary.ready || !finalChartData) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.notReadyPreview}</div>;
    }

    if (figureId === 'temperature-error' || figureId === 'total-energy') {
      const values = finalChartData.tempHistory.map((point) => (
        figureId === 'temperature-error' ? Math.abs(point.error) : point.totalEnergy
      ));
      const stride = Math.max(1, Math.ceil(values.length / 72));
      const sampledValues = values.filter((_, index) => index % stride === 0).slice(0, 72);
      if (!sampledValues.length) {
        return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
      }

      const rawMinY = figureId === 'temperature-error' ? 0 : Math.min(...sampledValues);
      const rawMaxY = Math.max(...sampledValues);
      const yPadding = rawMaxY === rawMinY ? Math.max(0.0001, Math.abs(rawMaxY) * 0.04) : 0;
      const minY = rawMinY - yPadding;
      const maxY = rawMaxY + yPadding;
      const ySpan = Math.max(0.0001, maxY - minY);
      const toX = (index: number) => FINAL_CHART_LEFT + (sampledValues.length === 1 ? 0.5 : index / (sampledValues.length - 1)) * FINAL_CHART_PLOT_WIDTH;
      const toY = (value: number) => FINAL_CHART_BOTTOM - ((value - minY) / ySpan) * FINAL_CHART_PLOT_HEIGHT;
      const historyPolyline = sampledValues.map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`).join(' ');
      const historyPoints = sampledValues.map((value, index) => ({ x: toX(index), y: toY(value) }));
      const historyLegendPosition = getFinalChartSparseLegendPosition(historyPoints);
      const historyLegendCopy = language === 'en'
        ? { temperatureErrorTrace: 'Temperature error', totalEnergyTrace: 'Total energy', zeroReference: 'Zero reference' }
        : language === 'zh-TW'
          ? { temperatureErrorTrace: '溫度誤差', totalEnergyTrace: '總能量', zeroReference: '零參考線' }
          : { temperatureErrorTrace: '温度误差', totalEnergyTrace: '总能量', zeroReference: '零参考线' };

      return renderFinalChartFrame(
        figureId,
        'line',
        <>
          {figureId === 'temperature-error' && (
            <line className="studio-final-chart-reference" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_BOTTOM} x2={FINAL_CHART_RIGHT} y2={FINAL_CHART_BOTTOM} />
          )}
          <polyline className="studio-final-chart-history" points={historyPolyline} />
          {renderFinalChartLegend([
            {
              kind: 'line',
              className: 'studio-final-chart-history',
              label: figureId === 'temperature-error' ? historyLegendCopy.temperatureErrorTrace : historyLegendCopy.totalEnergyTrace,
            },
            ...(figureId === 'temperature-error'
              ? [{
                  kind: 'line' as const,
                  className: 'studio-final-chart-reference',
                  label: historyLegendCopy.zeroReference,
                }]
              : []),
          ], historyLegendPosition)}
        </>,
      );
    }

    if (figureId === 'semilog-energy') {
      const measuredPoints = finalChartData.energy
        .map((bin) => ({
          energy: (bin.binStart + bin.binEnd) / 2,
          logProb: Math.log(bin.probability),
          probability: bin.probability,
        }))
        .filter((point) => Number.isFinite(point.energy) && Number.isFinite(point.logProb) && point.probability > 0);
      if (!measuredPoints.length) {
        return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
      }

      const selectionStartIndex = measuredPoints.length > 4
        ? Math.max(1, Math.floor(measuredPoints.length * 0.18))
        : 0;
      const selectionEndIndex = measuredPoints.length > 4
        ? Math.min(measuredPoints.length - 2, Math.ceil(measuredPoints.length * 0.82) - 1)
        : measuredPoints.length - 1;
      const selectedPoints = measuredPoints.filter((_, index) => index >= selectionStartIndex && index <= selectionEndIndex);
      const excludedPoints = measuredPoints.filter((_, index) => index < selectionStartIndex || index > selectionEndIndex);
      const selectionStartEnergy = selectedPoints[0]?.energy ?? measuredPoints[0].energy;
      const selectionEndEnergy = selectedPoints[selectedPoints.length - 1]?.energy ?? measuredPoints[measuredPoints.length - 1].energy;
      const semilogLegendCopy = language === 'en'
        ? { selected: 'Selected bins', excluded: 'Excluded bins', window: 'Fit window', theory: workbenchCopy.results.theoryLegend }
        : language === 'zh-TW'
          ? { selected: '選中點', excluded: '未選點', window: '選中區間', theory: workbenchCopy.results.theoryLegend }
          : { selected: '选中点', excluded: '未选点', window: '选中区间', theory: workbenchCopy.results.theoryLegend };
      const formatEnergyTick = (value: number) => value.toFixed(value >= 10 ? 1 : 2);
      const theoryPoints = finalChartData.energy
        .map((bin) => ({
          energy: (bin.binStart + bin.binEnd) / 2,
          logDensity: bin.theoretical && bin.theoretical > 0 ? Math.log(bin.theoretical) : Number.NaN,
        }))
        .filter((point) => (
          Number.isFinite(point.energy) &&
          Number.isFinite(point.logDensity) &&
          point.energy >= measuredPoints[0].energy &&
          point.energy <= measuredPoints[measuredPoints.length - 1].energy
        ));
      const xValues = [
        ...measuredPoints.map((point) => point.energy),
        ...theoryPoints.map((point) => point.energy),
      ];
      const yValues = [
        ...measuredPoints.map((point) => point.logProb),
        ...theoryPoints.map((point) => point.logDensity),
      ];
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const rawMinY = Math.min(...yValues);
      const rawMaxY = Math.max(...yValues);
      const xSpan = Math.max(0.0001, maxX - minX);
      const rawYSpan = Math.max(0.0001, rawMaxY - rawMinY);
      const minY = rawMinY - rawYSpan * 0.08;
      const maxY = rawMaxY + rawYSpan * 0.16;
      const ySpan = Math.max(0.0001, maxY - minY);
      const toX = (value: number) => FINAL_CHART_LEFT + ((value - minX) / xSpan) * FINAL_CHART_PLOT_WIDTH;
      const toY = (value: number) => FINAL_CHART_BOTTOM - ((value - minY) / ySpan) * FINAL_CHART_PLOT_HEIGHT;
      const theoryPolyline = theoryPoints.map((point) => `${toX(point.energy).toFixed(2)},${toY(point.logDensity).toFixed(2)}`).join(' ');
      const selectionStartX = toX(selectionStartEnergy);
      const selectionEndX = toX(selectionEndEnergy);

      return renderFinalChartFrame(
        figureId,
        'semilog',
        <>
          {theoryPolyline && <polyline className="studio-final-chart-theory studio-final-semilog-theory" points={theoryPolyline} />}
          <line className="studio-final-chart-selection-boundary" x1={selectionStartX} y1={FINAL_CHART_TOP} x2={selectionStartX} y2={FINAL_CHART_BOTTOM} />
          <line className="studio-final-chart-selection-boundary" x1={selectionEndX} y1={FINAL_CHART_TOP} x2={selectionEndX} y2={FINAL_CHART_BOTTOM} />
          <text className="studio-final-chart-boundary-label" x={selectionStartX} y="6.4">{formatEnergyTick(selectionStartEnergy)}</text>
          <text className="studio-final-chart-boundary-label" x={selectionEndX} y="6.4">{formatEnergyTick(selectionEndEnergy)}</text>
          {excludedPoints.map((point, index) => (
            <circle
              className="studio-final-chart-point studio-final-chart-excluded-point studio-final-semilog-point"
              key={`semilog-energy-excluded-${index}`}
              cx={toX(point.energy)}
              cy={toY(point.logProb)}
              r="1.05"
            />
          ))}
          {selectedPoints.map((point, index) => (
            <circle
              className="studio-final-chart-point studio-final-chart-selected-point studio-final-semilog-point"
              key={`semilog-energy-selected-${index}`}
              cx={toX(point.energy)}
              cy={toY(point.logProb)}
              r="1.15"
            />
          ))}
          {renderFinalChartLegend([
            { kind: 'point', className: 'studio-final-chart-selected-point', label: semilogLegendCopy.selected },
            { kind: 'point', className: 'studio-final-chart-excluded-point', label: semilogLegendCopy.excluded },
            { kind: 'boundary', label: semilogLegendCopy.window },
            { kind: 'line', className: 'studio-final-chart-theory', label: semilogLegendCopy.theory },
          ], 'upper-right')}
        </>,
      );
    }

    const bins = figureId === 'speed-distribution'
      ? finalChartData.speed
      : finalChartData.energy;
    const compactBins = getCompactHistogramBins(bins, 30)
      .filter((bin) => Number.isFinite(bin.binStart) && Number.isFinite(bin.binEnd) && Number.isFinite(bin.probability));
    if (!compactBins.length) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
    }

    const minX = Math.min(...compactBins.map((bin) => bin.binStart));
    const maxX = Math.max(...compactBins.map((bin) => bin.binEnd));
    const xSpan = Math.max(0.0001, maxX - minX);
    const maxProbability = Math.max(
      0.0001,
      ...compactBins.map((bin) => bin.probability),
      ...compactBins.map((bin) => bin.theoretical ?? 0),
    );
    const toX = (value: number) => FINAL_CHART_LEFT + ((value - minX) / xSpan) * FINAL_CHART_PLOT_WIDTH;
    const toY = (value: number) => FINAL_CHART_BOTTOM - (Math.max(0, value) / maxProbability) * FINAL_CHART_PLOT_HEIGHT;
    const theoryPolyline = compactBins
      .filter((bin) => Number.isFinite(bin.theoretical))
      .map((bin) => `${toX((bin.binStart + bin.binEnd) / 2).toFixed(2)},${toY(bin.theoretical ?? 0).toFixed(2)}`)
      .join(' ');

    return renderFinalChartFrame(
      figureId,
      'bars',
      <>
        {compactBins.map((bin, index) => {
          const barX = toX(bin.binStart);
          const barRight = toX(bin.binEnd);
          const barWidth = Math.max(0.8, (barRight - barX) * 0.72);
          const barHeight = bin.probability <= 0 ? 0 : Math.max(0.8, FINAL_CHART_BOTTOM - toY(bin.probability));
          return (
            <rect
              className="studio-final-chart-bar"
              key={`${figureId}-${index}`}
              x={barX + ((barRight - barX) - barWidth) / 2}
              y={FINAL_CHART_BOTTOM - barHeight}
              width={barWidth}
              height={barHeight}
            />
          );
        })}
        {theoryPolyline && <polyline className="studio-final-chart-theory" points={theoryPolyline} />}
        {renderFinalChartLegend([
          { kind: 'bar', label: workbenchCopy.results.measuredBars },
          ...(theoryPolyline
            ? [{
                kind: 'line' as const,
                className: 'studio-final-chart-theory',
                label: workbenchCopy.results.theoryLegend,
              }]
            : []),
        ], 'upper-right')}
      </>,
    );
  };

  return (
    <div className="studio-results-section">
      <div className="studio-results-subheader">
        <div>
          <strong>{workbenchCopy.panels.figuresTitle}</strong>
          <span>{workbenchCopy.results.figuresHint}</span>
        </div>
        <button
          type="button"
          disabled={!figuresExportReady || exportInProgress}
          onClick={onExportFigures}
        >
          <FileArchive size={13} />
          {workbenchCopy.results.exportFigures}
        </button>
      </div>

      <div className="studio-figure-list">
        <div className="studio-figure-list-header">
          <strong>{workbenchCopy.panels.figuresTitle}</strong>
          <span>{workbenchCopy.results.exportFilesHint}</span>
        </div>
        {figureSpecs.map((figure) => (
          <div className="studio-figure-row" key={figure.id}>
            <div>
              <strong>{figure.title}</strong>
              <small>{figure.recommendedFilename}</small>
            </div>
            <span>{figure.dataCount}</span>
            <em className={`studio-figure-status-${figure.status}`}>{workbenchCopy.results.figureStatus[figure.status]}</em>
          </div>
        ))}
      </div>

      <div className="studio-final-figures-grid">
        {figureSpecs.map((figure) => (
          <section className="studio-final-figure-card" key={`preview-${figure.id}`}>
            <div>
              <strong>{figure.title}</strong>
              <span>{workbenchCopy.results.figureStatus[figure.status]}</span>
            </div>
            {renderFinalFigurePreview(figure.id)}
          </section>
        ))}
      </div>
    </div>
  );
};
