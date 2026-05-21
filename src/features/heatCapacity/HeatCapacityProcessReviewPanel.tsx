import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type {
  HeatCapacityFreeProcessReview,
  HeatCapacityProcessChartData,
  HeatCapacityProcessControlEvent,
  HeatCapacityProcessControlKind,
  HeatCapacityProcessDiagnosisStatus,
  HeatCapacityProcessRecordEvent,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
  HeatCapacityProcessSystemKind,
  HeatCapacityProcessTracePoint,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import './HeatCapacityProcessReviewPanel.css';

interface HeatCapacityProcessReviewPanelProps {
  mode: 'demo' | 'guide' | 'free';
  review: HeatCapacityFreeProcessReview;
  selectedTrialId: string | null;
  onSelectedTrialChange: (trialId: string) => void;
}

type ChartKind = 'pressure' | 'temperature';
type ChartLinePoint = Pick<HeatCapacityProcessTracePoint, 'timeS' | 'pressureDeltaKPa' | 'temperatureDeltaK'>;
interface ChartAxis {
  min: number;
  max: number;
  ticks: number[];
}

const SVG_WIDTH = 1240;
const TRACK_LEFT = 42;
const TRACK_RIGHT = SVG_WIDTH - 34;
const TIMELINE_HEIGHT = 176;
const TIMELINE_BAR_Y = 82;
const TIMELINE_BAR_HEIGHT = 24;
const RECORD_Y = TIMELINE_BAR_Y - 8;
const CONTROL_Y = TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT + 8;
const CHART_HEIGHT = 246;
const PLOT_LABEL_X = 24;
const PLOT_LEFT = 42;
const PLOT_RIGHT = SVG_WIDTH - 34;
const PLOT_TOP = 34;
const PLOT_BOTTOM = 190;
const RELEASE_EXPANSION_WIDTH = 184;
const MAJOR_TICK_LENGTH = 5;
const MIN_STAGE_WIDTH_BY_ID: Record<HeatCapacityProcessStageId, number> = {
  zero: 118,
  pump: 210,
  stabilize: 260,
  release: 82,
  recover: 190,
};

const stagePalette: Record<HeatCapacityProcessStageId, string> = {
  zero: '#7b8da0',
  pump: '#348990',
  stabilize: '#637f55',
  release: '#a87332',
  recover: '#8a68a0',
};

const controlPalette: Record<HeatCapacityProcessControlKind, string> = {
  power: '#6f8091',
  pumpValve: '#0f8278',
  pumpBulb: '#087b91',
  stopcock: '#a2682a',
};

const controlLabels: Record<HeatCapacityProcessControlKind, string> = {
  power: '电源',
  pumpValve: '打气阀',
  pumpBulb: '打气球',
  stopcock: '玻璃旋塞',
};

const diagnosisStatusLabels: Record<HeatCapacityProcessDiagnosisStatus, string> = {
  reasonable: '合理',
  review: '可审核',
  'needs-improvement': '需加强',
  retaken: '有重录',
  'insufficient-data': '数据不足',
};

const systemBadgeClass: Record<HeatCapacityProcessSystemKind, string> = {
  warning: 'hpr-system-warning',
  danger: 'hpr-system-danger',
  blocked: 'hpr-system-blocked',
  retake: 'hpr-system-retake',
};

const formatMetric = (
  value: number | null | undefined,
  digits = 2,
  suffix = '',
) => (
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(digits)}${suffix}`
    : '--'
);

const formatScore = (score: number | null | undefined, max = 100) => (
  typeof score === 'number' && Number.isFinite(score)
    ? `${score} / ${max}`
    : '--'
);

const normalizeDiagnosisText = (value: string | null | undefined) => {
  const text = (value ?? '--')
    .replace(/[\u3002\uff1b;]+/gu, '\uff0c')
    .replace(/\uff0c\s*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || '无误';
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getTotalSeconds = (chart: HeatCapacityProcessChartData) => Math.max(
  1,
  ...chart.stages.map((stage) => stage.endS),
  ...chart.trace.map((point) => point.timeS),
  ...chart.operableBestTrace.map((point) => point.timeS),
  ...chart.referenceTrace.map((point) => point.timeS),
  ...chart.records.map((record) => record.timeS),
  ...chart.controls.map((event) => event.timeS),
  ...chart.systemEvents.map((event) => event.timeS),
);

const createTimeScale = (
  stages: HeatCapacityProcessStageSegment[],
  totalSeconds: number,
  expandedStageId: HeatCapacityProcessStageId | null,
) => {
  const expandedStage = expandedStageId
    ? stages.find((stage) => stage.id === expandedStageId) ?? null
    : null;
  const totalWidth = TRACK_RIGHT - TRACK_LEFT;
  const durations = stages.map((stage) => Math.max(0.001, stage.endS - stage.startS));
  const minimumWidths = stages.map((stage) => MIN_STAGE_WIDTH_BY_ID[stage.id]);
  const minimumTotal = minimumWidths.reduce((sum, width) => sum + width, 0);
  const proportionalPool = Math.max(0, totalWidth - minimumTotal);
  const durationTotal = durations.reduce((sum, duration) => sum + duration, 0);
  const stageWidths = stages.map((stage, index) => (
    minimumWidths[index] + proportionalPool * (durations[index] / durationTotal)
  ));
  if (expandedStage) {
    const expandedIndex = stages.findIndex((stage) => stage.id === expandedStage.id);
    if (expandedIndex >= 0) {
      const expandedGain = Math.min(RELEASE_EXPANSION_WIDTH, totalWidth * 0.18);
      const donorIndexes = stages
        .map((stage, index) => ({ stage, index }))
        .filter(({ index }) => index !== expandedIndex && stageWidths[index] > minimumWidths[index]);
      const donorCapacity = donorIndexes.reduce((sum, { index }) => (
        sum + Math.max(0, stageWidths[index] - minimumWidths[index])
      ), 0);
      const actualGain = Math.min(expandedGain, donorCapacity);
      if (actualGain > 0) {
        stageWidths[expandedIndex] += actualGain;
        for (const { index } of donorIndexes) {
          const available = Math.max(0, stageWidths[index] - minimumWidths[index]);
          stageWidths[index] -= actualGain * (available / donorCapacity);
        }
      }
    }
  }
  const stageStartXs: number[] = [];
  let cursorX = TRACK_LEFT;
  for (const width of stageWidths) {
    stageStartXs.push(cursorX);
    cursorX += width;
  }

  const stageForTime = (time: number) => {
    const clampedTime = clamp(time, 0, totalSeconds);
    const stageIndex = stages.findIndex((stage) => clampedTime >= stage.startS && clampedTime <= stage.endS);
    if (stageIndex >= 0) return { stage: stages[stageIndex], index: stageIndex, clampedTime };
    const fallbackIndex = stages.findIndex((stage) => clampedTime < stage.startS);
    const index = fallbackIndex >= 0 ? fallbackIndex : Math.max(0, stages.length - 1);
    return { stage: stages[index], index, clampedTime };
  };

  return (time: number) => {
    const { stage, index, clampedTime } = stageForTime(time);
    const duration = Math.max(0.001, stage.endS - stage.startS);
    return stageStartXs[index] + ((clampedTime - stage.startS) / duration) * stageWidths[index];
  };
};

const createNiceStep = (rawStep: number) => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / power;
  const niceNormalized = normalized <= 1
    ? 1
    : normalized <= 2
      ? 2
      : normalized <= 5
        ? 5
        : 10;
  return niceNormalized * power;
};

const createNiceAxis = (
  trace: ChartLinePoint[],
  kind: ChartKind,
): ChartAxis => {
  const values = trace.map((point) => (kind === 'pressure' ? point.pressureDeltaKPa : point.temperatureDeltaK));
  if (values.length === 0) {
    const fallback = kind === 'pressure' ? { min: 0, max: 8 } : { min: -2, max: 6 };
    return {
      ...fallback,
      ticks: Array.from(
        { length: kind === 'pressure' ? 5 : 5 },
        (_, index) => fallback.min + ((fallback.max - fallback.min) / 4) * index,
      ),
    };
  }
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, kind === 'pressure' ? 4 : 2);
  const padding = kind === 'pressure' ? 0.8 : 0.6;
  const paddedMin = kind === 'pressure' ? 0 : minValue - padding;
  const paddedMax = maxValue + padding;
  const targetTickCount = kind === 'pressure' ? 5 : 6;
  const step = createNiceStep((paddedMax - paddedMin) / Math.max(1, targetTickCount - 1));
  const min = kind === 'pressure' ? 0 : Math.floor(paddedMin / step) * step;
  const max = Math.max(min + step, Math.ceil(paddedMax / step) * step);
  const ticks: number[] = [];
  for (let tick = min; tick <= max + step * 0.5; tick += step) {
    ticks.push(Number(tick.toFixed(6)));
  }
  return { min, max, ticks };
};

const valueToY = (value: number, domain: { min: number; max: number }) => {
  const ratio = (clamp(value, domain.min, domain.max) - domain.min) / (domain.max - domain.min || 1);
  return PLOT_BOTTOM - ratio * (PLOT_BOTTOM - PLOT_TOP);
};

const buildLinePath = (
  points: ChartLinePoint[],
  kind: ChartKind,
  timeToX: (time: number) => number,
  domain: { min: number; max: number },
) => points.map((point, index) => {
  const x = timeToX(point.timeS);
  const y = valueToY(kind === 'pressure' ? point.pressureDeltaKPa : point.temperatureDeltaK, domain);
  return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
}).join(' ');

const formatSeconds = (time: number) => `${time.toFixed(time % 1 === 0 ? 0 : 1)} s`;

const getRecordCallout = (
  record: HeatCapacityProcessRecordEvent,
  timeToX: (time: number) => number,
) => {
  const x = timeToX(record.timeS);
  const preferLeft = record.id !== 'u0';
  const elbowX = x + (preferLeft ? -24 : 24);
  const lineY = record.id === 'u0' ? 44 : record.id === 'u1' ? 46 : 48;
  const labelX = x + (preferLeft ? -76 : 48);
  const horizontalEnd = labelX + (preferLeft ? -2 : 42);
  return {
    x,
    path: `M ${x.toFixed(2)} ${RECORD_Y.toFixed(2)} L ${elbowX.toFixed(2)} ${lineY.toFixed(2)} L ${horizontalEnd.toFixed(2)} ${lineY.toFixed(2)}`,
    labelX,
    labelY: lineY - 9,
    detailX: preferLeft ? labelX - 124 : labelX - 10,
    detailY: lineY + 4,
  };
};

const getControlCallout = (
  event: HeatCapacityProcessControlEvent,
  timeToX: (time: number) => number,
) => {
  const x = timeToX(event.timeS);
  const preferLeft = event.timeS > 58;
  const elbowX = x + (preferLeft ? -16 : 16);
  const lineY = 146;
  const endX = x + (preferLeft ? -82 : 82);
  const labelX = x + (preferLeft ? -80 : 26);
  return {
    x,
    path: `M ${x.toFixed(2)} ${CONTROL_Y.toFixed(2)} L ${elbowX.toFixed(2)} ${lineY.toFixed(2)} L ${endX.toFixed(2)} ${lineY.toFixed(2)}`,
    labelX,
    labelY: lineY - 8,
  };
};

const SharedTimeline: React.FC<{
  chart: HeatCapacityProcessChartData;
  totalSeconds: number;
  expandedStageId: HeatCapacityProcessStageId | null;
  hoveredControlId: string | null;
  hoveredRecordId: string | null;
  onStageHover: (stageId: HeatCapacityProcessStageId | null) => void;
  onControlHover: (eventId: string | null) => void;
  onRecordHover: (eventId: string | null) => void;
}> = ({
  chart,
  totalSeconds,
  expandedStageId,
  hoveredControlId,
  hoveredRecordId,
  onStageHover,
  onControlHover,
  onRecordHover,
}) => {
  const timeToX = useMemo(
    () => createTimeScale(chart.stages, totalSeconds, expandedStageId),
    [chart.stages, totalSeconds, expandedStageId],
  );
  return (
    <section
      className="hpr-timeline-block"
      aria-label="实验阶段时间轴"
    >
      <div className="hpr-freeze-heading hpr-timeline-freeze-heading">
        <div className="hpr-freeze-heading-title">
          <span>阶段时间轴</span>
          <small>记录事件 / 控件事件 / 系统标签</small>
        </div>
        <div className="hpr-freeze-legend" aria-label="控件事件图例">
          {(Object.keys(controlLabels) as HeatCapacityProcessControlKind[]).map((kind) => (
            <span key={kind}>
              <i style={{ background: controlPalette[kind] }} />
              {controlLabels[kind]}
            </span>
          ))}
        </div>
      </div>
      <svg
        className={`hpr-timeline-svg ${expandedStageId ? 'hpr-timeline-svg-expanded' : ''}`}
        viewBox={`0 0 ${SVG_WIDTH} ${TIMELINE_HEIGHT}`}
        preserveAspectRatio="xMinYMin meet"
        width="100%"
        height={TIMELINE_HEIGHT}
        role="img"
        aria-label="实验阶段色条和关键事件"
      >
        {chart.stages.map((stage) => {
          const x = timeToX(stage.startS);
          const width = timeToX(stage.endS) - x;
          const expanded = expandedStageId === stage.id;
          const isRelease = stage.id === 'release';
          const showCompactLabel = !isRelease || expanded;
          return (
            <g
              key={stage.id}
              className={`hpr-stage hpr-stage-${stage.id} ${expanded ? 'hpr-stage-expanded' : ''}`}
            >
              <rect
                className="hpr-stage-bar"
                x={x}
                y={TIMELINE_BAR_Y}
                width={width}
                height={TIMELINE_BAR_HEIGHT}
                fill={stagePalette[stage.id]}
                onMouseEnter={() => isRelease && onStageHover(stage.id)}
                onMouseLeave={() => isRelease && onStageHover(null)}
              />
              <line className="hpr-stage-seam" x1={x} y1={TIMELINE_BAR_Y} x2={x} y2={TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT} />
              <text className={`hpr-stage-label ${showCompactLabel ? 'hpr-stage-label-visible' : ''}`} x={x + width / 2} y={TIMELINE_BAR_Y + 18} textAnchor="middle">
                {stage.label}
              </text>
              {stage.countText ? (
                <text className="hpr-stage-count" x={x + width - 22} y={TIMELINE_BAR_Y + 18} textAnchor="end">
                  {stage.countText}
                </text>
              ) : null}
              {stage.durationText ? (
                <text className={`hpr-stage-duration ${expanded ? 'hpr-stage-duration-visible' : ''}`} x={x + width - 22} y={TIMELINE_BAR_Y + 18} textAnchor="end">
                  {stage.durationText}
                </text>
              ) : null}
            </g>
          );
        })}

        {chart.systemEvents.map((event) => {
          const x = timeToX(event.timeS);
          return (
            <foreignObject
              key={event.id}
              x={x - 24}
              y={TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT + 34}
              width={76}
              height={26}
              className={`hpr-system-event ${hoveredControlId ? 'hpr-system-event-dimmed' : ''}`}
            >
              <div className={`hpr-system-badge ${systemBadgeClass[event.kind]}`}>{event.label}</div>
            </foreignObject>
          );
        })}

        {chart.records.map((record) => {
          const callout = getRecordCallout(record, timeToX);
          const hovered = hoveredRecordId === record.id;
          return (
            <g className="hpr-record-event" key={record.id}>
              <path className="hpr-record-line" d={callout.path} />
              <circle className="hpr-record-hit" cx={callout.x} cy={RECORD_Y} r={10} />
              <circle className="hpr-record-ring" cx={callout.x} cy={RECORD_Y} r={5.4} />
              <g
                className="hpr-record-label-hit"
                onMouseEnter={() => onRecordHover(record.id)}
                onMouseLeave={() => onRecordHover(null)}
              >
                <text className="hpr-record-label" x={callout.labelX} y={callout.labelY}>
                  {record.label}
                </text>
                <rect x={callout.labelX - 8} y={callout.labelY - 17} width={48} height={24} fill="transparent" />
              </g>
              <g className={`hpr-record-detail ${hovered ? 'hpr-record-detail-visible' : ''}`}>
                <rect x={callout.detailX} y={callout.detailY} width={184} height={100} rx={5} />
                <text x={callout.detailX + 12} y={callout.detailY + 22}>记录时间：{formatSeconds(record.timeS)}</text>
                <text x={callout.detailX + 12} y={callout.detailY + 44}>电信号：{record.signalMv.toFixed(2)} mV</text>
                <text x={callout.detailX + 12} y={callout.detailY + 66}>换算压强差：{record.pressureDeltaKPa.toFixed(2)} kPa</text>
                <text x={callout.detailX + 12} y={callout.detailY + 88}>换算温度差：{record.temperatureDeltaK.toFixed(2)} K</text>
              </g>
            </g>
          );
        })}

        {chart.controls.map((event) => {
          const callout = getControlCallout(event, timeToX);
          const hovered = hoveredControlId === event.id;
          const color = controlPalette[event.kind];
          return (
            <g
              className="hpr-control-event"
              key={event.id}
              onMouseEnter={() => onControlHover(event.id)}
              onMouseLeave={() => onControlHover(null)}
            >
              <circle className="hpr-control-hit" cx={callout.x} cy={CONTROL_Y} r={8} />
              <circle className="hpr-control-dot" cx={callout.x} cy={CONTROL_Y} r={3.4} fill={color} />
              <g className={`hpr-control-callout ${hovered ? 'hpr-control-callout-visible' : ''}`}>
                <path d={callout.path} stroke={color} />
                <text x={callout.labelX} y={callout.labelY} fill={color}>{event.label}</text>
              </g>
            </g>
          );
        })}
      </svg>
    </section>
  );
};

const ProcessChart: React.FC<{
  kind: ChartKind;
  chart: HeatCapacityProcessChartData;
  totalSeconds: number;
  expandedStageId: HeatCapacityProcessStageId | null;
  showStandardReference: boolean;
  onStandardReferenceToggle: () => void;
  showXAxis?: boolean;
}> = ({
  kind,
  chart,
  totalSeconds,
  expandedStageId,
  showStandardReference,
  onStandardReferenceToggle,
  showXAxis = true,
}) => {
  const timeToX = useMemo(
    () => createTimeScale(chart.stages, totalSeconds, expandedStageId),
    [chart.stages, totalSeconds, expandedStageId],
  );
  const axis = useMemo(
    () => createNiceAxis([
      ...chart.trace,
      ...chart.operableBestTrace,
      ...(showStandardReference ? chart.referenceTrace : []),
    ], kind),
    [chart.operableBestTrace, chart.referenceTrace, chart.trace, kind, showStandardReference],
  );
  const linePath = useMemo(() => buildLinePath(chart.trace, kind, timeToX, axis), [chart.trace, kind, timeToX, axis]);
  const operableBestPath = useMemo(
    () => buildLinePath(chart.operableBestTrace, kind, timeToX, axis),
    [chart.operableBestTrace, kind, timeToX, axis],
  );
  const referencePath = useMemo(
    () => buildLinePath(chart.referenceTrace, kind, timeToX, axis),
    [chart.referenceTrace, kind, timeToX, axis],
  );
  const yTicks = axis.ticks;
  const xTicks = [0, Math.round(totalSeconds * 0.25), Math.round(totalSeconds * 0.5), Math.round(totalSeconds * 0.75), Math.round(totalSeconds)];
  const releaseStage = chart.stages.find((stage) => stage.id === 'release');
  const releaseExpanded = expandedStageId === 'release' && Boolean(releaseStage);
  const releaseX = releaseStage ? timeToX(releaseStage.startS) : 0;
  const releaseW = releaseStage ? Math.max(0, timeToX(releaseStage.endS) - releaseX) : 0;
  const stroke = kind === 'pressure' ? 'var(--hpr-pressure-line)' : 'var(--hpr-temperature-line)';
  const title = kind === 'pressure' ? '压强差过程' : '温度变化过程';
  const subtitle = kind === 'pressure' ? '由 Uₚ 换算' : '由 Uₜ 换算';
  const yLabel = kind === 'pressure' ? 'ΔP (kPa)' : 'ΔT (K)';

  return (
    <section className="hpr-chart-block" aria-label={title}>
      <div className="hpr-freeze-heading hpr-chart-freeze-heading">
        <div className="hpr-freeze-heading-title">
          <span>{title}</span>
          <small>{subtitle}</small>
        </div>
        <div className="hpr-chart-line-legend" aria-label={`${title}曲线图例`}>
          <span className="hpr-line-legend hpr-line-legend-trace">实测</span>
          <span className="hpr-line-legend hpr-line-legend-operable">可达最佳</span>
          <button
            type="button"
            className="hpr-line-legend hpr-line-legend-reference hpr-line-legend-toggle"
            aria-pressed={showStandardReference}
            onClick={onStandardReferenceToggle}
          >
            标准基线
          </button>
        </div>
      </div>
      <svg
        className="hpr-chart-svg"
        viewBox={`0 0 ${SVG_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMinYMin meet"
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label={`${title}，纵轴为 ${yLabel}${showXAxis ? '，横轴为时间' : ''}`}
      >
        {releaseStage ? (
          <rect
            className={`hpr-release-focus-area ${releaseExpanded ? 'hpr-release-focus-area-visible' : ''}`}
            x={releaseX}
            y={PLOT_TOP}
            width={releaseW}
            height={PLOT_BOTTOM - PLOT_TOP}
          />
        ) : null}
        <rect className="hpr-plot-frame" x={PLOT_LEFT} y={PLOT_TOP} width={PLOT_RIGHT - PLOT_LEFT} height={PLOT_BOTTOM - PLOT_TOP} />
        {chart.bestWindows.map((window) => {
          if (window.endS <= window.startS) return null;
          const x = timeToX(window.startS);
          const width = Math.max(3, timeToX(window.endS) - x);
          return (
            <g className={`hpr-best-window hpr-best-window-${window.recordId}`} key={`${kind}-${window.recordId}`}>
              <rect x={x} y={PLOT_TOP} width={width} height={PLOT_BOTTOM - PLOT_TOP} />
              <title>{`${window.recordId.toUpperCase()} 最佳窗口：${window.reason}`}</title>
            </g>
          );
        })}

        {xTicks.map((tick) => {
          const x = timeToX(tick);
          const isEdgeTick = tick === 0 || tick === Math.round(totalSeconds);
          return (
            <g className={`hpr-axis-tick ${showXAxis ? '' : 'hpr-axis-tick-muted'}`} key={`x-${kind}-${tick}`}>
              {!isEdgeTick ? (
                <>
                  <line x1={x} y1={PLOT_BOTTOM} x2={x} y2={PLOT_BOTTOM - MAJOR_TICK_LENGTH} />
                  <line x1={x} y1={PLOT_TOP} x2={x} y2={PLOT_TOP + MAJOR_TICK_LENGTH} />
                </>
              ) : null}
              {showXAxis ? <text x={x} y={PLOT_BOTTOM + 28} textAnchor="middle">{tick}</text> : null}
            </g>
          );
        })}
        {yTicks.map((tick, index) => {
          const y = valueToY(tick, axis);
          const isEdgeTick = index === 0 || index === yTicks.length - 1;
          return (
            <g className="hpr-axis-tick" key={`y-${kind}-${tick}`}>
              {!isEdgeTick ? (
                <>
                  <line x1={PLOT_LEFT} y1={y} x2={PLOT_LEFT + MAJOR_TICK_LENGTH} y2={y} />
                  <line x1={PLOT_RIGHT} y1={y} x2={PLOT_RIGHT - MAJOR_TICK_LENGTH} y2={y} />
                </>
              ) : null}
              <text x={PLOT_LABEL_X} y={y + 5}>{Number.isInteger(tick) ? tick : tick.toFixed(1)}</text>
            </g>
          );
        })}

        <text className="hpr-axis-label hpr-axis-label-y" x={PLOT_LEFT} y={PLOT_TOP - 4}>
          {yLabel}
        </text>
        {showXAxis ? (
          <text className="hpr-axis-label hpr-axis-label-x" x={PLOT_RIGHT} y={PLOT_BOTTOM + 48} textAnchor="end">
            时间 (s)
          </text>
        ) : null}
        {showStandardReference && referencePath ? <path className="hpr-reference-line" d={referencePath} /> : null}
        {operableBestPath ? <path className="hpr-operable-best-line" d={operableBestPath} /> : null}
        <path className="hpr-trace-line" d={linePath} stroke={stroke} />
      </svg>
    </section>
  );
};

const HeatCapacityProcessReviewPanel: React.FC<HeatCapacityProcessReviewPanelProps> = ({
  mode,
  review,
  selectedTrialId,
  onSelectedTrialChange,
}) => {
  const [expandedStageId, setExpandedStageId] = useState<HeatCapacityProcessStageId | null>(null);
  const [hoveredControlId, setHoveredControlId] = useState<string | null>(null);
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);
  const [trialMenuOpen, setTrialMenuOpen] = useState(false);
  const [showStandardReference, setShowStandardReference] = useState(false);
  const [expandedDiagnosisRows, setExpandedDiagnosisRows] = useState<Set<string>>(() => new Set());
  const trialSelectRef = useRef<HTMLDivElement | null>(null);
  const totalSeconds = useMemo(() => getTotalSeconds(review.chart), [review.chart]);
  const toggleDiagnosisRow = (rowId: string) => {
    setExpandedDiagnosisRows((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };
  const handleReviewWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ? event.deltaX
      : event.shiftKey
        ? event.deltaY
        : 0;
    if (horizontalDelta === 0) return;
    event.currentTarget.scrollLeft += horizontalDelta;
  };

  useEffect(() => {
    if (!trialMenuOpen) {
      return undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && trialSelectRef.current?.contains(target)) {
        return;
      }
      setTrialMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTrialMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [trialMenuOpen]);

  if (mode !== 'free') {
    return (
      <div className="hpr-empty">
        <strong>过程回顾仅用于自由模式</strong>
        <span>演示模式和引导模式保持教学预设行为，不读取自由模式真实 trace。</span>
      </div>
    );
  }

  if (!review.summary || review.status === 'empty' || review.status === 'missing-trace') {
    return (
      <div className="hpr-empty">
        <strong>{review.status === 'missing-trace' ? '本组缺少过程 trace' : '暂无可回顾的自由模式实验组'}</strong>
        <span>完成 U0、U1、U2 记录后，这里会显示过程曲线、结果摘要和操作诊断。</span>
      </div>
    );
  }

  const { summary } = review;
  const retakeText = summary.retakeCount > 0
    ? `${summary.retakeCount} 次`
    : '0 次';

  return (
    <div className="hpr-panel">
      <section className="hpr-summary" aria-label="过程回顾摘要">
        <div className="hpr-summary-title">
          <span>当前回顾</span>
          <strong>第 {summary.trialIndex} 组实验</strong>
          <small>Free Mode · 主线 {summary.branchId ?? '--'}</small>
        </div>
        <div className="hpr-summary-grid">
          <div>
            <span>γ</span>
            <strong>{formatMetric(summary.gamma, 3)}</strong>
            <small>相对误差 {formatMetric(summary.relativeErrorPercent, 2, '%')}</small>
          </div>
          <div>
            <span>操作上限 γ</span>
            <strong>{formatMetric(summary.upperBoundGamma, 3)}</strong>
            <small>与上限差距 {formatMetric(summary.upperBoundGapPercent, 2, '%')}</small>
          </div>
          <div>
            <span>操作评分</span>
            <strong>{formatScore(review.score.total, review.score.maxScore)}</strong>
            <small>基于本次 trace 派生</small>
          </div>
          <div>
            <span>退回 / 重录</span>
            <strong>{retakeText}</strong>
            <small>隐藏分支 {summary.retakeCount} 条</small>
          </div>
        </div>
      </section>

      <section className="hpr-process" aria-label="过程诊断图">
        <div className="hpr-section-heading">
          <div>
            <strong>过程诊断图</strong>
          </div>
          <div className="hpr-trial-select" data-hpr-trial-select="true" ref={trialSelectRef}>
            <button
              type="button"
              className="hpr-trial-select-trigger"
              aria-haspopup="menu"
              aria-expanded={trialMenuOpen}
              onClick={() => setTrialMenuOpen((open) => !open)}
            >
              第 {summary.trialIndex} 组实验
              <span aria-hidden="true">▾</span>
            </button>
            {trialMenuOpen ? (
              <div className="hpr-trial-select-menu" role="menu">
                {review.trialOptions.map((option) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={option.trialId === selectedTrialId}
                    key={option.trialId}
                    onClick={() => {
                      onSelectedTrialChange(option.trialId);
                      setTrialMenuOpen(false);
                    }}
                  >
                    <strong>第 {option.trialIndex} 组实验</strong>
                    <span>{option.gamma === null ? '未完成' : `γ ${option.gamma.toFixed(3)}`} · 重录 {option.retakeCount} 次</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="hpr-chart-shell">
          <div
            className="hpr-scroll-window"
            data-hpr-scroll-window="true"
            onWheel={handleReviewWheel}
          >
            <div className="hpr-scroll-content">
              <SharedTimeline
                chart={review.chart}
                totalSeconds={totalSeconds}
                expandedStageId={expandedStageId}
                hoveredControlId={hoveredControlId}
                hoveredRecordId={hoveredRecordId}
                onStageHover={setExpandedStageId}
                onControlHover={setHoveredControlId}
                onRecordHover={setHoveredRecordId}
              />
              <ProcessChart
                kind="pressure"
                chart={review.chart}
                totalSeconds={totalSeconds}
                expandedStageId={expandedStageId}
                showStandardReference={showStandardReference}
                onStandardReferenceToggle={() => setShowStandardReference((visible) => !visible)}
              />
              <ProcessChart
                kind="temperature"
                chart={review.chart}
                totalSeconds={totalSeconds}
                expandedStageId={expandedStageId}
                showStandardReference={showStandardReference}
                onStandardReferenceToggle={() => setShowStandardReference((visible) => !visible)}
                showXAxis
              />
            </div>
          </div>
        </div>
      </section>

      <section className="hpr-diagnosis" aria-label="实验诊断">
        <div className="hpr-section-heading">
          <div>
            <strong>实验诊断</strong>
          </div>
          <span>第 {summary.trialIndex} 组</span>
        </div>
        <div className="hpr-diagnosis-list">
          {review.diagnostics.map((row) => {
            const details = row.details ?? [];
            const expanded = expandedDiagnosisRows.has(row.id);
            return (
              <React.Fragment key={row.id}>
                <div className={`hpr-diagnosis-row ${expanded ? 'hpr-diagnosis-row-expanded' : ''}`}>
                  <div className="hpr-diagnosis-title">
                    <button
                      type="button"
                      className={`hpr-diagnosis-expand ${expanded ? 'hpr-diagnosis-expand-open' : ''}`}
                      aria-label={`${expanded ? '收起' : '展开'}${row.title}评分明细`}
                      aria-expanded={expanded}
                      disabled={details.length === 0}
                      onClick={() => toggleDiagnosisRow(row.id)}
                    >
                      <ChevronRight aria-hidden="true" size={14} strokeWidth={2.2} />
                    </button>
                    <strong>{row.title}</strong>
                  </div>
                  <span className="hpr-diagnosis-summary-cell">{normalizeDiagnosisText(row.evidence)}</span>
                  <span className="hpr-diagnosis-summary-cell">{normalizeDiagnosisText(row.relation ?? '--')}</span>
                  <span className="hpr-diagnosis-summary-cell">{normalizeDiagnosisText(row.recommendation)}</span>
                  <em className={`hpr-diagnosis-status hpr-diagnosis-status-${row.status}`}>
                    {typeof row.score === 'number' && typeof row.maxScore === 'number'
                      ? formatScore(row.score, row.maxScore)
                      : diagnosisStatusLabels[row.status]}
                  </em>
                </div>
                {expanded && details.length > 0 ? (
                  <div className="hpr-diagnosis-details" data-hpr-diagnosis-details={row.id}>
                    {details.map((detail) => (
                      <div className="hpr-diagnosis-detail-row" key={detail.id}>
                        <strong>{detail.label}</strong>
                        <span>{normalizeDiagnosisText(detail.evidence)}</span>
                        <span>{normalizeDiagnosisText(detail.reason)}</span>
                        <span>{normalizeDiagnosisText(detail.recommendation)}</span>
                        <em className={`hpr-diagnosis-status hpr-diagnosis-status-${detail.status}`}>
                          {formatScore(detail.score, detail.maxScore)}
                        </em>
                      </div>
                    ))}
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

export default HeatCapacityProcessReviewPanel;
