import React, { useMemo, useState } from 'react';
import './HeatCapacityProcessReviewDemo.css';

type ChartKind = 'pressure' | 'temperature';
type StageId = 'zero' | 'pump' | 'stabilize' | 'release' | 'recover';
type ControlKind = 'power' | 'pumpValve' | 'pumpBulb' | 'stopcock';
type RecordKind = 'u0' | 'u1' | 'u2';
type SystemKind = 'warning' | 'blocked' | 'retake';

interface StageSegment {
  id: StageId;
  label: string;
  start: number;
  end: number;
  color: string;
  countText?: string;
  durationText?: string;
}

interface TracePoint {
  t: number;
  pressureKpa: number;
  temperatureDeltaK: number;
}

interface RecordEvent {
  id: RecordKind;
  label: string;
  time: number;
  signalMv: number;
  pressureKpa: number;
  temperatureDeltaK: number;
}

interface ControlEvent {
  id: string;
  kind: ControlKind;
  label: string;
  time: number;
}

interface SystemEvent {
  id: string;
  kind: SystemKind;
  label: string;
  time: number;
}

interface SharedProcessTimelineProps {
  stages: StageSegment[];
  records: RecordEvent[];
  controls: ControlEvent[];
  systemEvents: SystemEvent[];
  expandedStageId: StageId | null;
  hoveredControlId: string | null;
  hoveredRecordId: RecordKind | null;
  onStageHover: (stageId: StageId | null) => void;
  onControlHover: (eventId: string | null) => void;
  onRecordHover: (eventId: RecordKind | null) => void;
}

interface ProcessChartProps {
  kind: ChartKind;
  trace: TracePoint[];
  expandedStageId: StageId | null;
  showXAxis?: boolean;
}

const SVG_WIDTH = 1240;
const TOTAL_SECONDS = 94;
const TRACK_LEFT = 42;
const TRACK_RIGHT = SVG_WIDTH - 34;
const RELEASE_EXPANSION_WIDTH = 184;

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
const MAJOR_TICK_LENGTH = 5;
const MINOR_TICK_LENGTH = 4;

const controlPalette: Record<ControlKind, string> = {
  power: '#6f8091',
  pumpValve: '#0f8278',
  pumpBulb: '#087b91',
  stopcock: '#a2682a',
};

const controlLabels: Record<ControlKind, string> = {
  power: '电源',
  pumpValve: '打气阀',
  pumpBulb: '打气球',
  stopcock: '玻璃旋塞',
};

const stages: StageSegment[] = [
  { id: 'zero', label: '调零', start: 0, end: 12, color: '#7b8da0' },
  { id: 'pump', label: '打气', start: 12, end: 34, color: '#348990', countText: '×10' },
  { id: 'stabilize', label: '回温稳定', start: 34, end: 61.2, color: '#637f55' },
  { id: 'release', label: '快速放气', start: 61.2, end: 62.3, color: '#a87332', durationText: '1.1 s' },
  { id: 'recover', label: '恢复记录', start: 62.3, end: 94, color: '#8a68a0' },
];

const records: RecordEvent[] = [
  { id: 'u0', label: 'U0', time: 10.1, signalMv: 0.02, pressureKpa: 0.00, temperatureDeltaK: 0.01 },
  { id: 'u1', label: 'U1', time: 60.4, signalMv: 116.80, pressureKpa: 6.94, temperatureDeltaK: 0.03 },
  { id: 'u2', label: 'U2', time: 88.5, signalMv: 29.70, pressureKpa: 1.76, temperatureDeltaK: 0.00 },
];

const controls: ControlEvent[] = [
  { id: 'power-on', kind: 'power', label: '开启电源', time: 5.0 },
  { id: 'zero-stopcock-open', kind: 'stopcock', label: '打开玻璃旋塞', time: 6.2 },
  { id: 'pump-valve-open', kind: 'pumpValve', label: '打开打气阀', time: 12.0 },
  { id: 'pump-bulb-merged', kind: 'pumpBulb', label: '打气球 ×10', time: 23.0 },
  { id: 'pump-valve-close', kind: 'pumpValve', label: '关闭打气阀', time: 34.0 },
  { id: 'release-stopcock-open', kind: 'stopcock', label: '打开玻璃旋塞', time: 61.5 },
  { id: 'release-stopcock-close', kind: 'stopcock', label: '关闭玻璃旋塞', time: 62.2 },
];

const systemEvents: SystemEvent[] = [
  { id: 'pressure-warning', kind: 'warning', label: '预警', time: 31.2 },
  { id: 'retry-branch', kind: 'retake', label: '重录', time: 9.5 },
];

const createDemoTrace = (): TracePoint[] => {
  const points: TracePoint[] = [];
  const push = (t: number, pressureKpa: number, temperatureDeltaK: number) => {
    points.push({
      t: Number(t.toFixed(2)),
      pressureKpa: Number(pressureKpa.toFixed(3)),
      temperatureDeltaK: Number(temperatureDeltaK.toFixed(3)),
    });
  };

  push(0, 0, 0);
  push(10.8, 0, 0.02);
  push(12, 0, 0.02);

  let pressure = 0;
  let temperature = 0.02;
  for (let i = 0; i < 10; i += 1) {
    const strokeStart = 12 + i * 1.85;
    const strokeEnd = strokeStart + 0.42;
    const holdEnd = strokeStart + 1.55;
    push(strokeStart, pressure, temperature);
    pressure += 0.74 - i * 0.01;
    temperature += 0.50 - i * 0.02;
    push(strokeEnd, pressure, temperature);
    push(holdEnd, pressure - 0.04, temperature - 0.03);
  }

  push(34, 6.94, 0.38);
  push(41, 6.94, 0.12);
  push(50, 6.94, 0.04);
  push(60.4, 6.94, 0.03);
  push(61.2, 6.94, 0.03);
  push(61.55, 4.10, -0.72);
  push(61.9, 2.55, -0.96);
  push(62.3, 1.76, -0.82);
  push(64, 1.60, -0.38);
  push(68, 1.67, -0.12);
  push(74, 1.74, -0.03);
  push(88.5, 1.76, 0);
  push(94, 1.76, 0);

  return points.sort((a, b) => a.t - b.t);
};

const trace = createDemoTrace();

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getStageById = (stageId: StageId) => stages.find((stage) => stage.id === stageId);

const timeToX = (time: number, expandedStageId: StageId | null) => {
  const expandedStage = expandedStageId ? getStageById(expandedStageId) : null;
  const clampedTime = clamp(time, 0, TOTAL_SECONDS);
  const totalWidth = TRACK_RIGHT - TRACK_LEFT;
  if (!expandedStage) return TRACK_LEFT + (clampedTime / TOTAL_SECONDS) * totalWidth;

  const stageDuration = Math.max(0.001, expandedStage.end - expandedStage.start);
  const baseStageWidth = (stageDuration / TOTAL_SECONDS) * totalWidth;
  const expandedStageWidth = Math.min(totalWidth * 0.32, baseStageWidth + RELEASE_EXPANSION_WIDTH);
  const remainingWidth = totalWidth - expandedStageWidth;
  const leftDuration = expandedStage.start;
  const rightDuration = TOTAL_SECONDS - expandedStage.end;
  const sideDuration = Math.max(0.001, leftDuration + rightDuration);
  const leftWidth = remainingWidth * (leftDuration / sideDuration);
  const rightWidth = remainingWidth - leftWidth;
  const expandedStartX = TRACK_LEFT + leftWidth;
  const expandedEndX = expandedStartX + expandedStageWidth;

  if (clampedTime < expandedStage.start) {
    return TRACK_LEFT + (clampedTime / Math.max(0.001, leftDuration)) * leftWidth;
  }
  if (clampedTime > expandedStage.end) {
    return expandedEndX + ((clampedTime - expandedStage.end) / Math.max(0.001, rightDuration)) * rightWidth;
  }
  return expandedStartX + ((clampedTime - expandedStage.start) / stageDuration) * expandedStageWidth;
};

const valueToY = (value: number, kind: ChartKind) => {
  const domain = kind === 'pressure'
    ? { min: 0, max: 8 }
    : { min: -1.2, max: 5.2 };
  const ratio = (clamp(value, domain.min, domain.max) - domain.min) / (domain.max - domain.min);
  return PLOT_BOTTOM - ratio * (PLOT_BOTTOM - PLOT_TOP);
};

const formatSeconds = (time: number) => `${time.toFixed(time % 1 === 0 ? 0 : 1)} s`;

const buildLinePath = (
  points: TracePoint[],
  kind: ChartKind,
  expandedStageId: StageId | null,
) => points.map((point, index) => {
  const x = timeToX(point.t, expandedStageId);
  const y = valueToY(kind === 'pressure' ? point.pressureKpa : point.temperatureDeltaK, kind);
  return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
}).join(' ');

const getRecordCallout = (record: RecordEvent, expandedStageId: StageId | null) => {
  const x = timeToX(record.time, expandedStageId);
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

const getControlCallout = (event: ControlEvent, expandedStageId: StageId | null) => {
  const x = timeToX(event.time, expandedStageId);
  const preferLeft = event.time > 58;
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

const getSystemBadgeClass = (kind: SystemKind) => {
  if (kind === 'warning') return 'hpd-system-warning';
  if (kind === 'blocked') return 'hpd-system-blocked';
  return 'hpd-system-retake';
};

const SharedProcessTimeline: React.FC<SharedProcessTimelineProps> = ({
  stages,
  records,
  controls,
  systemEvents,
  expandedStageId,
  hoveredControlId,
  hoveredRecordId,
  onStageHover,
  onControlHover,
  onRecordHover,
}) => (
  <section className="hpd-timeline-block" aria-label="实验阶段时间轴">
    <div className="hpd-freeze-heading hpd-timeline-freeze-heading">
      <div className="hpd-freeze-heading-title">
        <span>阶段时间轴</span>
        <small>记录事件 / 控件事件 / 系统标签</small>
      </div>
      <div className="hpd-freeze-legend" aria-label="控件事件图例">
        {(Object.keys(controlLabels) as ControlKind[]).map((kind) => (
          <span key={kind}>
            <i style={{ background: controlPalette[kind] }} />
            {controlLabels[kind]}
          </span>
        ))}
      </div>
    </div>
    <svg
      className={`hpd-timeline-svg ${expandedStageId ? 'hpd-timeline-svg-expanded' : ''}`}
      viewBox={`0 0 ${SVG_WIDTH} ${TIMELINE_HEIGHT}`}
      preserveAspectRatio="xMinYMin meet"
      width="100%"
      height={TIMELINE_HEIGHT}
      role="img"
      aria-label="共享实验阶段色条，包含记录事件、控件事件和系统事件"
    >
      {stages.map((stage) => {
        const x = timeToX(stage.start, expandedStageId);
        const width = timeToX(stage.end, expandedStageId) - x;
        const isRelease = stage.id === 'release';
        const expanded = expandedStageId === stage.id;
        const showCompactLabel = !isRelease || expanded;
        return (
          <g
            key={stage.id}
            className={`hpd-stage hpd-stage-${stage.id} ${expanded ? 'hpd-stage-expanded' : ''}`}
            onMouseEnter={() => isRelease && onStageHover(stage.id)}
            onMouseLeave={() => isRelease && onStageHover(null)}
            >
            <rect className="hpd-stage-bar" x={x} y={TIMELINE_BAR_Y} width={width} height={TIMELINE_BAR_HEIGHT} fill={stage.color} />
            <line
              className="hpd-stage-seam"
              x1={x}
              y1={TIMELINE_BAR_Y}
              x2={x}
              y2={TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT}
            />
            {isRelease ? (
              <rect
                className="hpd-stage-hit-area"
                x={x - 14}
                y={TIMELINE_BAR_Y - 10}
                width={width + 28}
                height={TIMELINE_BAR_HEIGHT + 32}
              />
            ) : null}
            <text
              className={`hpd-stage-label ${showCompactLabel ? 'hpd-stage-label-visible' : ''}`}
              x={x + width / 2}
              y={TIMELINE_BAR_Y + 18}
              textAnchor="middle"
            >
              {stage.label}
            </text>
            {stage.countText ? (
              <text className="hpd-stage-count" x={x + width - 22} y={TIMELINE_BAR_Y + 18} textAnchor="end">
                {stage.countText}
              </text>
            ) : null}
            {stage.durationText ? (
              <text
                className={`hpd-stage-duration ${expanded ? 'hpd-stage-duration-visible' : ''}`}
                x={x + width - 22}
                y={TIMELINE_BAR_Y + 18}
                textAnchor="end"
              >
                {stage.durationText}
              </text>
            ) : null}
          </g>
        );
      })}

      {systemEvents.map((event) => {
        const x = timeToX(event.time, expandedStageId);
        return (
          <foreignObject
            key={event.id}
            x={x - 24}
            y={TIMELINE_BAR_Y + TIMELINE_BAR_HEIGHT + 34}
            width={76}
            height={26}
            className={`hpd-system-event ${hoveredControlId ? 'hpd-system-event-dimmed' : ''}`}
          >
            <div className={`hpd-system-badge ${getSystemBadgeClass(event.kind)}`}>{event.label}</div>
          </foreignObject>
        );
      })}

      {records.map((record) => {
        const callout = getRecordCallout(record, expandedStageId);
        const hovered = hoveredRecordId === record.id;
        return (
          <g className="hpd-record-event" key={record.id}>
            <path className="hpd-record-line" d={callout.path} />
            <circle className="hpd-record-hit" cx={callout.x} cy={RECORD_Y} r={10} />
            <circle className="hpd-record-ring" cx={callout.x} cy={RECORD_Y} r={5.4} />
            <g
              className="hpd-record-label-hit"
              onMouseEnter={() => onRecordHover(record.id)}
              onMouseLeave={() => onRecordHover(null)}
            >
              <text className="hpd-record-label" x={callout.labelX} y={callout.labelY}>
                {record.label}
              </text>
              <rect x={callout.labelX - 8} y={callout.labelY - 17} width={48} height={24} fill="transparent" />
            </g>
            <g className={`hpd-record-detail ${hovered ? 'hpd-record-detail-visible' : ''}`}>
              <rect x={callout.detailX} y={callout.detailY} width={176} height={84} rx={5} />
              <text x={callout.detailX + 12} y={callout.detailY + 22}>记录时间：{formatSeconds(record.time)}</text>
              <text x={callout.detailX + 12} y={callout.detailY + 44}>电信号：{record.signalMv.toFixed(2)} mV</text>
              <text x={callout.detailX + 12} y={callout.detailY + 66}>换算压强差：{record.pressureKpa.toFixed(2)} kPa</text>
            </g>
          </g>
        );
      })}

      {controls.map((event) => {
        const callout = getControlCallout(event, expandedStageId);
        const hovered = hoveredControlId === event.id;
        const color = controlPalette[event.kind];
        return (
          <g
            className="hpd-control-event"
            key={event.id}
            onMouseEnter={() => onControlHover(event.id)}
            onMouseLeave={() => onControlHover(null)}
          >
            <circle className="hpd-control-hit" cx={callout.x} cy={CONTROL_Y} r={8} />
            <circle className="hpd-control-dot" cx={callout.x} cy={CONTROL_Y} r={3.4} fill={color} />
            <g className={`hpd-control-callout ${hovered ? 'hpd-control-callout-visible' : ''}`}>
              <path d={callout.path} stroke={color} />
              <text x={callout.labelX} y={callout.labelY} fill={color}>{event.label}</text>
            </g>
          </g>
        );
      })}
    </svg>
  </section>
);

const ProcessChart: React.FC<ProcessChartProps> = ({
  kind,
  trace,
  expandedStageId,
  showXAxis = false,
}) => {
  const linePath = useMemo(() => buildLinePath(trace, kind, expandedStageId), [trace, kind, expandedStageId]);
  const releaseStage = getStageById('release');
  const expandedRelease = expandedStageId === 'release' && releaseStage;
  const releaseX = expandedRelease ? timeToX(releaseStage.start, expandedStageId) : 0;
  const releaseW = expandedRelease ? Math.max(0, timeToX(releaseStage.end, expandedStageId) - releaseX) : 0;
  const yTicks = kind === 'pressure' ? [0, 2, 4, 6, 8] : [-1, 0, 1, 2, 3, 4, 5];
  const xTicks = [0, 20, 40, 60, 80, 94];
  const releaseMinorTicks = [61.4, 61.8, 62.1];
  const stroke = kind === 'pressure' ? '#226399' : '#178b99';
  const title = kind === 'pressure' ? '压强差过程' : '温度变化过程';
  const subtitle = kind === 'pressure' ? '由 Uₚ 换算' : '由 Uₜ 换算';
  const yLabel = kind === 'pressure' ? 'ΔP / kPa' : 'ΔT / K';

  return (
    <section className="hpd-chart-block" aria-label={title}>
      <div className="hpd-freeze-heading hpd-chart-freeze-heading">
        <div className="hpd-freeze-heading-title">
          <span>{title}</span>
          <small>{subtitle}</small>
        </div>
      </div>
      <svg
        className="hpd-chart-svg"
        viewBox={`0 0 ${SVG_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMinYMin meet"
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label={`${title}，纵轴为${yLabel}${showXAxis ? '，横轴为时间秒' : ''}`}
      >
        {expandedRelease ? (
          <rect
            className="hpd-release-focus-area"
            x={releaseX}
            y={PLOT_TOP}
            width={releaseW}
            height={PLOT_BOTTOM - PLOT_TOP}
          />
        ) : null}

        <rect
          className="hpd-plot-frame"
          x={PLOT_LEFT}
          y={PLOT_TOP}
          width={PLOT_RIGHT - PLOT_LEFT}
          height={PLOT_BOTTOM - PLOT_TOP}
        />

        {xTicks.map((tick) => {
          const x = timeToX(tick, expandedStageId);
          const isEdgeTick = tick === 0 || tick === TOTAL_SECONDS;
          return (
            <g className={`hpd-axis-tick ${showXAxis ? '' : 'hpd-axis-tick-muted'}`} key={`x-${tick}`}>
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
        {expandedRelease ? releaseMinorTicks.map((tick) => {
          const x = timeToX(tick, expandedStageId);
          return (
            <g className="hpd-axis-minor-tick hpd-axis-minor-tick-visible" key={`release-minor-${kind}-${tick}`}>
              <line x1={x} y1={PLOT_BOTTOM} x2={x} y2={PLOT_BOTTOM - MINOR_TICK_LENGTH} />
              {showXAxis ? <text x={x} y={PLOT_BOTTOM + 22} textAnchor="middle">{tick.toFixed(1)}</text> : null}
            </g>
          );
        }) : null}
        {yTicks.map((tick, index) => {
          const y = valueToY(tick, kind);
          const isEdgeTick = index === 0 || index === yTicks.length - 1;
          return (
            <g className="hpd-axis-tick" key={`y-${kind}-${tick}`}>
              {!isEdgeTick ? (
                <>
                  <line x1={PLOT_LEFT} y1={y} x2={PLOT_LEFT + MAJOR_TICK_LENGTH} y2={y} />
                  <line x1={PLOT_RIGHT} y1={y} x2={PLOT_RIGHT - MAJOR_TICK_LENGTH} y2={y} />
                </>
              ) : null}
              <text x={PLOT_LABEL_X} y={y + 5}>{tick}</text>
            </g>
          );
        })}

        <text className="hpd-axis-label hpd-axis-label-y" x={PLOT_LEFT} y={PLOT_TOP - 4}>
          {yLabel}
        </text>
        {showXAxis ? (
          <text className="hpd-axis-label hpd-axis-label-x" x={PLOT_RIGHT - 92} y={PLOT_BOTTOM + 48}>
            时间 / s
          </text>
        ) : null}
        <path className="hpd-trace-line" d={linePath} stroke={stroke} />
      </svg>
    </section>
  );
};

const HeatCapacityProcessReviewDemo: React.FC = () => {
  const [expandedStageId, setExpandedStageId] = useState<StageId | null>(null);
  const [hoveredControlId, setHoveredControlId] = useState<string | null>(null);
  const [hoveredRecordId, setHoveredRecordId] = useState<RecordKind | null>(null);

  return (
    <div className="hpd-demo-root">
      <aside className="hpd-demo-sidebar" aria-label="实验资料与结果">
        <div className="hpd-demo-sidebar-title">实验资料与结果</div>
        <button type="button">实验指引</button>
        <button type="button">数据记录</button>
        <button type="button">数据处理</button>
        <button type="button" className="hpd-demo-sidebar-active">过程回顾</button>
      </aside>
      <main className="hpd-demo-main">
        <header className="hpd-demo-header">
          <div>
            <span>空气比热容比实验</span>
            <h1>过程回顾</h1>
          </div>
          <p>主线 trace · 仪器显示值换算 · 事件样本固定保留</p>
        </header>

        <section className="hpd-panel">
          <div className="hpd-panel-heading">
            <div>
              <h2>过程诊断图</h2>
              <p>共享阶段时间轴，分别观察压强差和温度变化，关键事件不会重复占用图表高度。</p>
            </div>
            <div className="hpd-run-meta">
              <span>第 1 组实验</span>
              <strong>退回/重录 2 次</strong>
            </div>
          </div>

          <div className="hpd-chart-shell">
            <div className="hpd-scroll-window">
              <div className="hpd-scroll-content">
                <SharedProcessTimeline
                  stages={stages}
                  records={records}
                  controls={controls}
                  systemEvents={systemEvents}
                  expandedStageId={expandedStageId}
                  hoveredControlId={hoveredControlId}
                  hoveredRecordId={hoveredRecordId}
                  onStageHover={setExpandedStageId}
                  onControlHover={setHoveredControlId}
                  onRecordHover={setHoveredRecordId}
                />
                <ProcessChart
                  kind="pressure"
                  trace={trace}
                  expandedStageId={expandedStageId}
                />
                <ProcessChart
                  kind="temperature"
                  trace={trace}
                  expandedStageId={expandedStageId}
                  showXAxis
                />
              </div>
            </div>
          </div>
        </section>

        <section className="hpd-diagnosis">
          <div>
            <h2>操作诊断</h2>
            <p>
              本组主线保留 138 个过程样本，其中 14 个为事件引用样本。快速放气段 1.1 s，
              记录 U1 前温度已回到环境附近，U2 在恢复平台记录。
            </p>
          </div>
          <div className="hpd-diagnosis-list">
            <span>可能误差来源：放气关闭略晚，U2 平台偏低。</span>
            <span>预警状态：打气末段触发一次压强预警，未进入报警。</span>
            <span>分支信息：存在 2 条重录分支，图表默认仅显示当前主线。</span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HeatCapacityProcessReviewDemo;
