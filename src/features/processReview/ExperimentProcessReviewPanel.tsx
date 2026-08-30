import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import '../heatCapacity/HeatCapacityProcessReviewPanel.css';
import './ExperimentProcessReviewPanel.css';

export type ExperimentProcessReviewTone = 'good' | 'attention' | 'risk' | 'neutral';

export type ExperimentProcessReviewTimelineCategory =
  | 'power'
  | 'height'
  | 'pneumatic'
  | 'press'
  | 'acquisition'
  | 'system';

export interface ExperimentProcessReviewMetric {
  label: string;
  value: string;
  detail: string;
  tone?: ExperimentProcessReviewTone;
}

export interface ExperimentProcessReviewOption {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: ExperimentProcessReviewTone;
}

export interface ExperimentProcessReviewStage {
  id: string;
  title: string;
  detail: string;
  category: ExperimentProcessReviewTimelineCategory;
  weight?: number;
}

export interface ExperimentProcessReviewEventDetail {
  label: string;
  value: string;
}

export interface ExperimentProcessReviewEvent {
  id: string;
  label: string;
  detail: string;
  position: number;
  category: ExperimentProcessReviewTimelineCategory;
  kind?: 'action' | 'record' | 'system';
  lane?: 'upper' | 'lower';
  row?: 0 | 1;
  tone?: ExperimentProcessReviewTone;
  details?: readonly ExperimentProcessReviewEventDetail[];
}

export interface ExperimentProcessReviewChartPoint {
  x: number;
  y: number;
}

export interface ExperimentProcessReviewChartSeries {
  id: string;
  label: string;
  color: string;
  points: readonly ExperimentProcessReviewChartPoint[];
  dashed?: boolean;
  showPoints?: boolean;
}

export interface ExperimentProcessReviewChartBand {
  id: string;
  start: number;
  end: number;
  label: string;
  tone?: ExperimentProcessReviewTone;
}

export interface ExperimentProcessReviewChartMarker {
  id: string;
  x: number;
  label: string;
  tone?: ExperimentProcessReviewTone;
}

export interface ExperimentProcessReviewChart {
  id: string;
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  xDigits?: number;
  yDigits?: number;
  series: readonly ExperimentProcessReviewChartSeries[];
  bands?: readonly ExperimentProcessReviewChartBand[];
  markers?: readonly ExperimentProcessReviewChartMarker[];
  note?: string;
}

export interface ExperimentProcessReviewScoreDetail {
  id: string;
  label: string;
  evidence: string;
  consequence: string;
  suggestion: string;
  score: number;
  maxScore: number;
  tone: ExperimentProcessReviewTone;
}

export interface ExperimentProcessReviewScoreRow {
  id: string;
  title: string;
  evidence: string;
  consequence: string;
  suggestion: string;
  score: number;
  maxScore: number;
  tone: ExperimentProcessReviewTone;
  details?: readonly ExperimentProcessReviewScoreDetail[];
}

export interface ExperimentProcessReviewViewModel {
  experimentLabel: string;
  currentTitle: string;
  currentSubtitle: string;
  summaryNote: string;
  metrics: readonly ExperimentProcessReviewMetric[];
  options: readonly ExperimentProcessReviewOption[];
  selectedOptionId: string;
  processTitle: string;
  processSubtitle: string;
  processNote: string;
  stages: readonly ExperimentProcessReviewStage[];
  events: readonly ExperimentProcessReviewEvent[];
  charts: readonly ExperimentProcessReviewChart[];
  scoreTitle: string;
  scoreSubtitle: string;
  scoreRule: string;
  scoreRows: readonly ExperimentProcessReviewScoreRow[];
}

export type ExperimentProcessReviewLanguage = 'zh-CN' | 'zh-TW' | 'en';

interface ExperimentProcessReviewPanelProps {
  model: ExperimentProcessReviewViewModel;
  onSelectedOptionChange: (optionId: string) => void;
  language?: ExperimentProcessReviewLanguage;
}

const SVG_WIDTH = 1180;
const SVG_HEIGHT = 250;
const PLOT_LEFT = 70;
const PLOT_RIGHT = 1150;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 198;

// Keep the process timeline geometry aligned with the existing heat-capacity
// review timeline so both experiments use the same visual language.
const TIMELINE_SVG_WIDTH = 1240;
const TIMELINE_HEIGHT = 176;
const TIMELINE_LEFT = 42;
const TIMELINE_RIGHT = TIMELINE_SVG_WIDTH - 34;
const TIMELINE_BAR_Y = 82;
const TIMELINE_BAR_HEIGHT = 24;
const TIMELINE_RECORD_Y = TIMELINE_BAR_Y - 8;
const TIMELINE_CONTROL_Y = TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT + 8;

const timelineCategoryPalette: Record<ExperimentProcessReviewTimelineCategory, string> = {
  power: '#6f8091',
  height: '#b07a37',
  pneumatic: '#27868d',
  press: '#77649a',
  acquisition: '#2d6f9f',
  system: '#b45148',
};

const getProcessReviewUiCopy = (language: ExperimentProcessReviewLanguage) => {
  if (language === 'en') return {
    summaryAria: 'Experiment results and scoring summary',
    timelineAria: 'Instrument-operation timeline for the current run',
    timelineTitle: 'Instrument-operation timeline',
    timelineHint: 'Stages are compressed · Hover or focus an operation for evidence',
    timelineLegendAria: 'Operation category legend',
    timelineSequenceAria: 'Instrument operations in their observed order',
    categoryLabels: {
      power: 'Power and settings', height: 'Height and locking', pneumatic: 'Hose and air path',
      press: 'Press and release', acquisition: 'Acquisition and save', system: 'Observed outcomes',
    } satisfies Record<ExperimentProcessReviewTimelineCategory, string>,
    node: 'Node', result: 'Result', retained: 'Formal data retained',
    flowDescription: 'Process note', selectorAria: 'Select a run to review',
    chartLegendSuffix: ' legend',
    chartAria: (title: string, xLabel: string, yLabel: string) => (
      `${title}; horizontal axis ${xLabel}; vertical axis ${yLabel}`
    ),
    expand: 'Expand', collapse: 'Collapse', details: ' details',
    gapPrefix: 'gap ', peakPrefix: 'peak ',
  };
  if (language === 'zh-TW') return {
    summaryAria: '實驗結果與評分摘要',
    timelineAria: '目前這次實驗的儀器操作時間條',
    timelineTitle: '儀器操作時間條',
    timelineHint: '階段已壓縮顯示 · 懸浮或聚焦操作點查看實際證據',
    timelineLegendAria: '操作類別圖例',
    timelineSequenceAria: '按照實際先後順序排列的儀器操作',
    categoryLabels: {
      power: '電源與基礎設定', height: '高度與鎖緊', pneumatic: '氣路與軟管',
      press: '按壓與釋放', acquisition: '採集與儲存', system: '系統結果',
    } satisfies Record<ExperimentProcessReviewTimelineCategory, string>,
    node: '節點', result: '結果', retained: '正式資料已保留',
    flowDescription: '流程說明', selectorAria: '選擇需要回顧的實驗記錄',
    chartLegendSuffix: '圖例',
    chartAria: (title: string, xLabel: string, yLabel: string) => (
      `${title}，橫軸${xLabel}，縱軸${yLabel}`
    ),
    expand: '展開', collapse: '收起', details: '明細',
    gapPrefix: '相差 ', peakPrefix: '峰值 ',
  };
  return {
    summaryAria: '实验结果与评分摘要',
    timelineAria: '当前这次实验的仪器操作时间条',
    timelineTitle: '仪器操作时间条',
    timelineHint: '阶段已压缩显示 · 悬浮或聚焦操作点查看实际证据',
    timelineLegendAria: '操作类别图例',
    timelineSequenceAria: '按照实际先后顺序排列的仪器操作',
    categoryLabels: {
      power: '电源与基础设置', height: '高度与锁紧', pneumatic: '气路与软管',
      press: '按压与释放', acquisition: '采集与保存', system: '系统结果',
    } satisfies Record<ExperimentProcessReviewTimelineCategory, string>,
    node: '节点', result: '结果', retained: '正式数据已保留',
    flowDescription: '流程说明', selectorAria: '选择需要回顾的实验记录',
    chartLegendSuffix: '图例',
    chartAria: (title: string, xLabel: string, yLabel: string) => (
      `${title}，横轴${xLabel}，纵轴${yLabel}`
    ),
    expand: '展开', collapse: '收起', details: '明细',
    gapPrefix: '相差 ', peakPrefix: '峰值 ',
  };
};

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(maximum, Math.max(minimum, value))
);

const createNiceStep = (rawStep: number) => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / power;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * power;
};

const createAxis = (
  values: readonly number[],
  tickCount = 5,
  keepNonNegative = false,
) => {
  const finite = values.filter(Number.isFinite);
  const rawMinimum = finite.length > 0 ? Math.min(...finite) : 0;
  const rawMaximum = finite.length > 0 ? Math.max(...finite) : 1;
  const rawRange = Math.max(Math.abs(rawMaximum - rawMinimum), Math.abs(rawMaximum) * 0.04, 0.001);
  const padding = rawRange * 0.1;
  const step = createNiceStep((rawRange + padding * 2) / Math.max(1, tickCount - 1));
  const minimum = keepNonNegative && rawMinimum >= 0
    ? 0
    : Math.floor((rawMinimum - padding) / step) * step;
  const maximum = Math.max(minimum + step, Math.ceil((rawMaximum + padding) / step) * step);
  const ticks: number[] = [];
  for (let value = minimum; value <= maximum + step * 0.4; value += step) {
    ticks.push(Number(value.toFixed(9)));
  }
  return { minimum, maximum, ticks };
};

const formatAxisNumber = (value: number, digits: number) => (
  Math.abs(value) >= 1_000
    ? value.toExponential(1)
    : value.toFixed(digits)
);

const getDiagnosisStatusClass = (tone: ExperimentProcessReviewTone) => {
  if (tone === 'good') return 'hpr-diagnosis-status-reasonable';
  if (tone === 'attention') return 'hpr-diagnosis-status-needs-improvement';
  if (tone === 'risk') return 'hpr-diagnosis-status-retaken';
  return 'hpr-diagnosis-status-review';
};

const getTimelineRecordCallout = (
  event: ExperimentProcessReviewEvent,
  positionToX: (position: number) => number,
) => {
  const x = positionToX(event.position);
  const preferLeft = event.position > 0.5;
  const elbowX = x + (preferLeft ? -24 : 24);
  const lineY = 48;
  const labelX = x + (preferLeft ? -76 : 48);
  const horizontalEnd = labelX + (preferLeft ? -2 : 42);
  return {
    x,
    path: `M ${x.toFixed(2)} ${TIMELINE_RECORD_Y.toFixed(2)} L ${elbowX.toFixed(2)} ${lineY.toFixed(2)} L ${horizontalEnd.toFixed(2)} ${lineY.toFixed(2)}`,
    labelX,
    labelY: lineY - 9,
    detailX: preferLeft ? labelX - 124 : labelX - 10,
    detailY: lineY + 4,
  };
};

const renderTimelineRecordDetail = (
  event: ExperimentProcessReviewEvent,
  callout: ReturnType<typeof getTimelineRecordCallout>,
  copy: ReturnType<typeof getProcessReviewUiCopy>,
) => {
  const rows = [
    { label: copy.node, value: event.label },
    ...(event.details ?? []).slice(0, 2),
    { label: copy.result, value: copy.retained },
  ].slice(0, 4);
  return (
    <g className="hpr-record-detail hpr-record-detail-visible">
      <rect x={callout.detailX} y={callout.detailY} width={184} height={100} rx={5} />
      {rows.map((row, index) => (
        <text
          key={`${event.id}-${row.label}`}
          x={callout.detailX + 12}
          y={callout.detailY + 22 + index * 22}
        >
          {row.label}: {row.value}
        </text>
      ))}
    </g>
  );
};

const formatTimelineControlDetail = (
  detail: ExperimentProcessReviewEventDetail,
  copy: ReturnType<typeof getProcessReviewUiCopy>,
) => {
  if (/时间差|時間差|time gap/i.test(detail.label)) return `${copy.gapPrefix}${detail.value}`;
  if (/监测峰值|監測峰值|peak/i.test(detail.label)) return `${copy.peakPrefix}${detail.value}`;
  if (detail.label === '记录结果') return detail.value.split(/[，,]/)[0] ?? detail.value;
  if (detail.label === '实际读数' || detail.label === '锁定高度') return detail.value;
  if (detail.label === '下坠高度') return detail.value;
  if (detail.label === '重置原因') return detail.value.split(/[，,]/)[0] ?? detail.value;
  return detail.value;
};

const getTimelineControlLabel = (
  event: ExperimentProcessReviewEvent,
  copy: ReturnType<typeof getProcessReviewUiCopy>,
) => {
  const evidence = (event.details ?? [])
    .slice(0, 2)
    .map((detail) => formatTimelineControlDetail(detail, copy))
    .filter(Boolean);
  return [event.label, ...evidence].join(' · ');
};

const getTimelineControlCallout = (
  event: ExperimentProcessReviewEvent,
  positionToX: (position: number) => number,
) => {
  const x = positionToX(event.position);
  const preferLeft = event.position > 0.7;
  const elbowX = x + (preferLeft ? -16 : 16);
  const lineY = 146;
  const endX = x + (preferLeft ? -82 : 82);
  const labelX = x + (preferLeft ? -80 : 26);
  return {
    x,
    path: `M ${x.toFixed(2)} ${TIMELINE_CONTROL_Y.toFixed(2)} L ${elbowX.toFixed(2)} ${lineY.toFixed(2)} L ${endX.toFixed(2)} ${lineY.toFixed(2)}`,
    labelX,
    labelY: lineY - 8,
  };
};

const ProcessReviewTimeline: React.FC<{
  stages: readonly ExperimentProcessReviewStage[];
  events: readonly ExperimentProcessReviewEvent[];
  language: ExperimentProcessReviewLanguage;
}> = ({ stages, events, language }) => {
  const copy = getProcessReviewUiCopy(language);
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const totalWeight = stages.reduce((sum, stage) => sum + Math.max(0.1, stage.weight ?? 1), 0);
  const stageLayouts = stages.reduce<Array<{
    stage: ExperimentProcessReviewStage;
    start: number;
    end: number;
  }>>((layouts, stage) => {
    const start = layouts.at(-1)?.end ?? 0;
    const end = start + Math.max(0.1, stage.weight ?? 1) / totalWeight;
    layouts.push({ stage, start, end });
    return layouts;
  }, []);
  const categories = Object.keys(
    copy.categoryLabels,
  ) as ExperimentProcessReviewTimelineCategory[];
  const recordEvents = events.filter((event) => event.kind === 'record');
  const controlEvents = events.filter((event) => event.kind !== 'record');
  const hoveredRecord = hoveredEventId
    ? recordEvents.find((event) => event.id === hoveredEventId) ?? null
    : null;
  const positionToX = (position: number) => TIMELINE_LEFT
    + clamp(position, 0, 1) * (TIMELINE_RIGHT - TIMELINE_LEFT);

  return (
    <section className="hpr-timeline-block epr-timeline" aria-label={copy.timelineAria}>
      <div className="hpr-freeze-heading hpr-timeline-freeze-heading epr-timeline-freeze-heading">
        <div className="hpr-freeze-heading-title">
          <span>{copy.timelineTitle}</span>
          <small>{copy.timelineHint}</small>
        </div>
        <div className="hpr-freeze-legend" aria-label={copy.timelineLegendAria}>
          {categories.map((category) => (
            <span key={category}>
              <i style={{ background: timelineCategoryPalette[category] }} />
              {copy.categoryLabels[category]}
            </span>
          ))}
        </div>
      </div>
      <svg
        className={`hpr-timeline-svg epr-timeline-svg ${hoveredStageId ? 'hpr-timeline-svg-hovered' : ''}`}
        viewBox={`0 0 ${TIMELINE_SVG_WIDTH} ${TIMELINE_HEIGHT}`}
        preserveAspectRatio="xMinYMin meet"
        width="100%"
        height={TIMELINE_HEIGHT}
        role="img"
        aria-label={copy.timelineSequenceAria}
      >
          {stageLayouts.map(({ stage, start, end }, index) => {
            const x = positionToX(start);
            const width = positionToX(end) - x;
            return (
              <g
                key={stage.id}
                className={`hpr-stage hpr-stage-${stage.id} ${hoveredStageId === stage.id ? 'hpr-stage-hovered' : ''}`}
              >
                <title>{`${stage.title}：${stage.detail}`}</title>
                <rect
                  className="hpr-stage-bar"
                  x={x}
                  y={TIMELINE_BAR_Y}
                  width={Math.max(1, width)}
                  height={TIMELINE_BAR_HEIGHT}
                  fill={timelineCategoryPalette[stage.category]}
                  onMouseEnter={() => setHoveredStageId(stage.id)}
                  onMouseLeave={() => setHoveredStageId(null)}
                />
                {index > 0 ? (
                  <line
                    className="hpr-stage-seam"
                    x1={x}
                    x2={x}
                    y1={TIMELINE_BAR_Y}
                    y2={TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT}
                  />
                ) : null}
                <text
                  className="hpr-stage-label hpr-stage-label-visible"
                  x={x + width / 2}
                  y={TIMELINE_BAR_Y + 18}
                  textAnchor="middle"
                >
                  {stage.title}
                </text>
              </g>
            );
          })}

          {recordEvents.map((event) => {
            const callout = getTimelineRecordCallout(event, positionToX);
            return (
              <g className="hpr-record-event" key={event.id}>
                <path className="hpr-record-line" d={callout.path} />
                <circle className="hpr-record-hit" cx={callout.x} cy={TIMELINE_RECORD_Y} r={10} />
                <circle className="hpr-record-ring" cx={callout.x} cy={TIMELINE_RECORD_Y} r={5.4} />
                <g
                  className="hpr-record-label-hit"
                  onMouseEnter={() => setHoveredEventId(event.id)}
                  onMouseLeave={() => setHoveredEventId(null)}
                  onFocus={() => setHoveredEventId(event.id)}
                  onBlur={() => setHoveredEventId(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${event.label}：${event.detail}`}
                >
                  <text className="hpr-record-label" x={callout.labelX} y={callout.labelY}>
                    {event.label}
                  </text>
                  <rect x={callout.labelX - 8} y={callout.labelY - 17} width={72} height={24} fill="transparent" />
                </g>
              </g>
            );
          })}

          {controlEvents.map((event) => {
            const callout = getTimelineControlCallout(event, positionToX);
            const hovered = hoveredEventId === event.id;
            const color = timelineCategoryPalette[event.category];
            const eventLabel = getTimelineControlLabel(event, copy);
            return (
              <g
                className="hpr-control-event"
                key={event.id}
                onMouseEnter={() => setHoveredEventId(event.id)}
                onMouseLeave={() => setHoveredEventId(null)}
                onFocus={() => setHoveredEventId(event.id)}
                onBlur={() => setHoveredEventId(null)}
                tabIndex={0}
                role="button"
                aria-label={`${event.label}：${event.detail}`}
              >
                <title>{eventLabel}</title>
                <circle className="hpr-control-hit" cx={callout.x} cy={TIMELINE_CONTROL_Y} r={8} />
                <circle className="hpr-control-dot" cx={callout.x} cy={TIMELINE_CONTROL_Y} r={3.4} fill={color} />
                <g className={`hpr-control-callout ${hovered ? 'hpr-control-callout-visible' : ''}`}>
                  <path d={callout.path} stroke={color} />
                  <text x={callout.labelX} y={callout.labelY} fill={color}>{eventLabel}</text>
                </g>
              </g>
            );
          })}
          {hoveredRecord ? (
            <g className="hpr-record-detail-layer">
              {renderTimelineRecordDetail(
                hoveredRecord,
                getTimelineRecordCallout(hoveredRecord, positionToX),
                copy,
              )}
            </g>
          ) : null}
      </svg>
    </section>
  );
};

const ProcessReviewChart: React.FC<{
  chart: ExperimentProcessReviewChart;
  language: ExperimentProcessReviewLanguage;
}> = ({ chart, language }) => {
  const copy = getProcessReviewUiCopy(language);
  const allPoints = chart.series.flatMap((series) => series.points);
  const xAxis = useMemo(
    () => createAxis(allPoints.map((point) => point.x), 6, true),
    [allPoints],
  );
  const yAxis = useMemo(
    () => createAxis(allPoints.map((point) => point.y), 5),
    [allPoints],
  );
  const xDigits = chart.xDigits ?? 3;
  const yDigits = chart.yDigits ?? 2;
  const xToSvg = (value: number) => PLOT_LEFT
    + (clamp(value, xAxis.minimum, xAxis.maximum) - xAxis.minimum)
      / (xAxis.maximum - xAxis.minimum || 1)
      * (PLOT_RIGHT - PLOT_LEFT);
  const yToSvg = (value: number) => PLOT_BOTTOM
    - (clamp(value, yAxis.minimum, yAxis.maximum) - yAxis.minimum)
      / (yAxis.maximum - yAxis.minimum || 1)
      * (PLOT_BOTTOM - PLOT_TOP);

  return (
    <section className="epr-chart" aria-label={chart.title}>
      <div className="epr-chart-heading">
        <div>
          <strong>{chart.title}</strong>
          <span>{chart.subtitle}</span>
        </div>
        <div className="epr-chart-legend" aria-label={`${chart.title}${copy.chartLegendSuffix}`}>
          {chart.series.map((series) => (
            <span key={series.id}>
              <i
                className={series.dashed ? 'epr-chart-legend-dashed' : ''}
                style={{ '--epr-series-color': series.color } as React.CSSProperties}
              />
              {series.label}
            </span>
          ))}
          {(chart.bands ?? []).map((band) => (
            <span key={band.id}>
              <i className={`epr-chart-legend-band epr-tone-${band.tone ?? 'neutral'}`} />
              {band.label}
            </span>
          ))}
        </div>
      </div>
      <svg
        className="epr-chart-svg"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMinYMin meet"
        role="img"
        aria-label={copy.chartAria(chart.title, chart.xLabel, chart.yLabel)}
      >
        <rect
          className="epr-chart-plot"
          x={PLOT_LEFT}
          y={PLOT_TOP}
          width={PLOT_RIGHT - PLOT_LEFT}
          height={PLOT_BOTTOM - PLOT_TOP}
        />
        {(chart.bands ?? []).map((band) => {
          const start = xToSvg(Math.min(band.start, band.end));
          const end = xToSvg(Math.max(band.start, band.end));
          return (
            <g key={band.id} className={`epr-chart-band epr-tone-${band.tone ?? 'neutral'}`}>
              <rect x={start} y={PLOT_TOP} width={Math.max(1, end - start)} height={PLOT_BOTTOM - PLOT_TOP} />
              <text x={(start + end) / 2} y={PLOT_TOP + 15} textAnchor="middle">{band.label}</text>
            </g>
          );
        })}
        {yAxis.ticks.map((tick) => {
          const y = yToSvg(tick);
          return (
            <g key={`y-${tick}`} className="epr-chart-grid">
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y} y2={y} />
              <text x={PLOT_LEFT - 10} y={y + 4} textAnchor="end">{formatAxisNumber(tick, yDigits)}</text>
            </g>
          );
        })}
        {xAxis.ticks.map((tick) => {
          const x = xToSvg(tick);
          return (
            <g key={`x-${tick}`} className="epr-chart-grid">
              <line x1={x} x2={x} y1={PLOT_TOP} y2={PLOT_BOTTOM} />
              <text x={x} y={PLOT_BOTTOM + 22} textAnchor="middle">{formatAxisNumber(tick, xDigits)}</text>
            </g>
          );
        })}
        {(chart.markers ?? []).map((marker, index) => {
          const x = xToSvg(marker.x);
          return (
            <g key={marker.id} className={`epr-chart-marker epr-tone-${marker.tone ?? 'neutral'}`}>
              <line x1={x} x2={x} y1={PLOT_TOP} y2={PLOT_BOTTOM} />
              <text x={x + 5} y={PLOT_TOP + 31 + (index % 2) * 15}>{marker.label}</text>
            </g>
          );
        })}
        {chart.series.map((series) => {
          const path = series.points.map((point, index) => (
            `${index === 0 ? 'M' : 'L'} ${xToSvg(point.x).toFixed(2)} ${yToSvg(point.y).toFixed(2)}`
          )).join(' ');
          return (
            <g key={series.id} className="epr-chart-series">
              <path
                d={path}
                fill="none"
                stroke={series.color}
                strokeDasharray={series.dashed ? '8 6' : undefined}
              />
              {series.showPoints ? series.points.map((point, index) => (
                <circle
                  key={`${series.id}-${index}`}
                  cx={xToSvg(point.x)}
                  cy={yToSvg(point.y)}
                  r={3.3}
                  fill={series.color}
                />
              )) : null}
            </g>
          );
        })}
        <text className="epr-chart-axis-label" x={(PLOT_LEFT + PLOT_RIGHT) / 2} y={SVG_HEIGHT - 7} textAnchor="middle">
          {chart.xLabel}
        </text>
        <text
          className="epr-chart-axis-label"
          x={15}
          y={(PLOT_TOP + PLOT_BOTTOM) / 2}
          textAnchor="middle"
          transform={`rotate(-90 15 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`}
        >
          {chart.yLabel}
        </text>
      </svg>
      {chart.note ? <p className="epr-chart-note">{chart.note}</p> : null}
    </section>
  );
};

export const ExperimentProcessReviewPanel: React.FC<ExperimentProcessReviewPanelProps> = ({
  model,
  onSelectedOptionChange,
  language = 'zh-CN',
}) => {
  const uiCopy = getProcessReviewUiCopy(language);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [expandedScoreRows, setExpandedScoreRows] = useState<Set<string>>(() => new Set());
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectedOption = model.options.find((option) => option.id === model.selectedOptionId)
    ?? model.options[0];

  useEffect(() => {
    if (!selectorOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && selectorRef.current?.contains(target)) return;
      setSelectorOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectorOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectorOpen]);

  const toggleScoreRow = (rowId: string) => {
    setExpandedScoreRows((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  return (
    <div className="hpr-panel epr-panel" data-process-review-experiment={model.experimentLabel}>
      <section className="hpr-summary epr-summary" aria-label={uiCopy.summaryAria}>
        <div className="hpr-summary-title">
          <span>{model.experimentLabel}</span>
          <strong>{model.currentTitle}</strong>
          <small>{model.currentSubtitle}</small>
        </div>
        <div className="hpr-summary-grid epr-summary-metrics">
          {model.metrics.map((metric) => (
            <div key={metric.label} className={`epr-summary-metric epr-tone-${metric.tone ?? 'neutral'}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="epr-summary-note">
        <CheckCircle2 size={14} aria-hidden="true" />
        <span>{model.summaryNote}</span>
      </div>

      <section className="hpr-process epr-process" aria-label={model.processTitle}>
        <div className="hpr-section-heading epr-section-heading">
          <div>
            <strong>{model.processTitle}</strong>
            <span>{model.processSubtitle}</span>
          </div>
          <div className={`hpr-trial-select epr-selector ${selectorOpen ? 'hpr-trial-select-open' : ''}`} ref={selectorRef}>
            <button
              type="button"
              className="hpr-trial-select-trigger epr-selector-trigger"
              aria-haspopup="listbox"
              aria-expanded={selectorOpen}
              onClick={() => setSelectorOpen((open) => !open)}
            >
              <span>
                <strong>{selectedOption?.title ?? '--'}</strong>
                <small>{selectedOption?.subtitle ?? '--'}</small>
              </span>
              <ChevronDown
                size={14}
                className={`hpr-trial-select-chevron ${selectorOpen ? 'hpr-trial-select-chevron-open' : ''}`}
                aria-hidden="true"
              />
            </button>
            {selectorOpen ? (
              <div className="hpr-trial-select-menu epr-selector-menu" role="listbox" aria-label={uiCopy.selectorAria}>
                {model.options.map((option) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.id === model.selectedOptionId}
                    key={option.id}
                    className={option.id === model.selectedOptionId ? 'hpr-trial-select-option-active' : ''}
                    onClick={() => {
                      onSelectedOptionChange(option.id);
                      setSelectorOpen(false);
                    }}
                  >
                    <strong>{option.title}</strong>
                    <span>{option.subtitle} · {option.statusLabel}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="hpr-standard-process-summary epr-process-note">
          <strong>{uiCopy.flowDescription}</strong>
          <span>{model.processNote}</span>
        </div>
        <div className="epr-process-canvas">
          <ProcessReviewTimeline stages={model.stages} events={model.events} language={language} />
          <div className="epr-chart-stack">
            {model.charts.map((chart) => (
              <ProcessReviewChart key={chart.id} chart={chart} language={language} />
            ))}
          </div>
        </div>
      </section>

      <section className="hpr-diagnosis epr-score" aria-label={model.scoreTitle}>
        <div className="hpr-section-heading">
          <div>
            <strong>{model.scoreTitle}</strong>
          </div>
          <span>{model.scoreSubtitle}</span>
        </div>
        <div className="hpr-scoring-rule-note">{model.scoreRule}</div>
        <div className="hpr-diagnosis-list">
          {model.scoreRows.map((row) => {
            const details = row.details ?? [];
            const expanded = expandedScoreRows.has(row.id);
            return (
              <React.Fragment key={row.id}>
                <div className={`hpr-diagnosis-row ${expanded ? 'hpr-diagnosis-row-expanded' : ''}`}>
                  <div className="hpr-diagnosis-title">
                    <button
                      type="button"
                      className={`hpr-diagnosis-expand ${expanded ? 'hpr-diagnosis-expand-open' : ''}`}
                      data-epr-score-expand={row.id}
                      aria-label={`${expanded ? uiCopy.collapse : uiCopy.expand}${row.title}${uiCopy.details}`}
                      aria-expanded={expanded}
                      disabled={details.length === 0}
                      onClick={() => toggleScoreRow(row.id)}
                    >
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                    <strong>{row.title}</strong>
                  </div>
                  <span className="hpr-diagnosis-summary-cell">{row.evidence}</span>
                  <span className="hpr-diagnosis-summary-cell">{row.consequence}</span>
                  <span className="hpr-diagnosis-summary-cell">{row.suggestion}</span>
                  <em className={`hpr-diagnosis-status ${getDiagnosisStatusClass(row.tone)}`}>{row.score}/{row.maxScore}</em>
                </div>
                {details.length > 0 ? (
                  <div
                    className={`hpr-diagnosis-details-shell ${expanded ? 'hpr-diagnosis-details-shell-open' : ''}`}
                    data-epr-score-details={row.id}
                    aria-hidden={!expanded}
                  >
                    <div className="hpr-diagnosis-details">
                      {details.map((detail) => (
                        <div className="hpr-diagnosis-detail-row" key={detail.id}>
                          <strong>{detail.label}</strong>
                          <span>{detail.evidence}</span>
                          <span>{detail.consequence}</span>
                          <span>{detail.suggestion}</span>
                          <em className={`hpr-diagnosis-status ${getDiagnosisStatusClass(detail.tone)}`}>{detail.score}/{detail.maxScore}</em>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ExperimentProcessReviewPanel;
