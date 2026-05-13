import React, { memo, useEffect, useRef } from 'react';
import type { HeatCapacityRuntimePhase, HeatCapacityTracePoint } from './heatCapacityExperimentModel.ts';
import type { HeatCapacityRuntimeController } from './heatCapacityRuntimeStore.ts';

export type HeatCapacityRealtimeLanguage = 'zh-CN' | 'zh-TW' | 'en';
type HeatCapacityTraceValueKey = 'temperatureSignalMv' | 'pressureSignalMv';
type HeatCapacityRecorderMode = 'empty' | 'filling' | 'compressing' | 'scrolling';

interface HeatCapacityTraceChartProps {
  controller: HeatCapacityRuntimeController | null;
  language: HeatCapacityRealtimeLanguage;
  valueLabel: HeatCapacityTraceValueKey;
  className: string;
}

interface ChartPoint {
  x: number;
  y: number;
}

interface PhaseRange {
  phase: HeatCapacityRuntimePhase;
  yMax: number;
  yMin: number;
}

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 128;
const CHART_LEFT = 12;
const CHART_RIGHT = 348;
const CHART_TOP = 12;
const CHART_BOTTOM = 112;
const FILLING_POINT_LIMIT = 36;
const COMPRESSING_POINT_LIMIT = 56;
const SCROLL_STEP_PX = 6;

const formatMetric = (value: number, digits = 3) => (
  Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const renderScientificText = (text: string): React.ReactNode => {
  const parts = text.split(/(U_T|U_p|U_P)/g);
  return parts.map((part, index) => {
    if (part === 'U_T') return <React.Fragment key={`${part}-${index}`}>U<sub>T</sub></React.Fragment>;
    if (part === 'U_p' || part === 'U_P') return <React.Fragment key={`${part}-${index}`}>U<sub>p</sub></React.Fragment>;
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const getHeatCapacityTraceTitle = (
  language: HeatCapacityRealtimeLanguage,
  valueLabel: HeatCapacityTraceValueKey,
) => {
  if (language === 'zh-CN') {
    return valueLabel === 'pressureSignalMv' ? '压强差信号 U_p' : '温度信号 U_T';
  }
  if (language === 'zh-TW') {
    return valueLabel === 'pressureSignalMv' ? '壓強差信號 U_p' : '溫度訊號 U_T';
  }
  return valueLabel === 'pressureSignalMv' ? 'Pressure Signal U_p' : 'Temperature Signal U_T';
};

const updateText = (element: HTMLElement | null, value: string) => {
  if (element && element.textContent !== value) element.textContent = value;
};

const ensureCanvasResolution = (canvas: HTMLCanvasElement) => {
  if (canvas.width !== CANVAS_WIDTH) canvas.width = CANVAS_WIDTH;
  if (canvas.height !== CANVAS_HEIGHT) canvas.height = CANVAS_HEIGHT;
};

const getRecorderMode = (historyLength: number): HeatCapacityRecorderMode => {
  if (historyLength < 2) return 'empty';
  if (historyLength <= FILLING_POINT_LIMIT) return 'filling';
  if (historyLength <= COMPRESSING_POINT_LIMIT) return 'compressing';
  return 'scrolling';
};

const getVisibleHistory = (
  history: HeatCapacityTracePoint[],
  mode: HeatCapacityRecorderMode,
) => (
  mode === 'scrolling'
    ? history.slice(-COMPRESSING_POINT_LIMIT)
    : history.slice(0, COMPRESSING_POINT_LIMIT)
);

const calculatePhaseRange = (
  history: HeatCapacityTracePoint[],
  phase: HeatCapacityRuntimePhase,
  valueLabel: HeatCapacityTraceValueKey,
): PhaseRange => {
  const phasePoints = history.filter((point) => point.phase === phase);
  const sourcePoints = phasePoints.length >= 2 ? phasePoints : history.slice(-COMPRESSING_POINT_LIMIT);
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  sourcePoints.forEach((point) => {
    const value = point[valueLabel];
    if (value < minValue) minValue = value;
    if (value > maxValue) maxValue = value;
  });

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    minValue = 0;
    maxValue = 1;
  }

  const padding = Math.max(0.18, (maxValue - minValue) * 0.22);
  return {
    phase,
    yMax: maxValue + padding,
    yMin: minValue - padding,
  };
};

const mapValueToY = (value: number, range: PhaseRange) => {
  const chartHeight = CHART_BOTTOM - CHART_TOP;
  const valueRange = Math.max(0.25, range.yMax - range.yMin);
  const normalized = Math.max(0, Math.min(1, (value - range.yMin) / valueRange));
  return CHART_BOTTOM - normalized * chartHeight;
};

const mapPointToX = (
  index: number,
  count: number,
  mode: HeatCapacityRecorderMode,
) => {
  const chartWidth = CHART_RIGHT - CHART_LEFT;
  if (mode === 'filling') {
    return CHART_LEFT + index * (chartWidth / Math.max(1, FILLING_POINT_LIMIT - 1));
  }
  return CHART_LEFT + (count <= 1 ? 0 : (index / (count - 1)) * chartWidth);
};

const drawLineSegment = (
  context: CanvasRenderingContext2D,
  from: ChartPoint,
  to: ChartPoint,
) => {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
};

const clearTraceCanvas = (context: CanvasRenderingContext2D) => {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

const redrawWindowAsPolyline = (
  context: CanvasRenderingContext2D,
  history: HeatCapacityTracePoint[],
  mode: HeatCapacityRecorderMode,
  range: PhaseRange,
  valueLabel: HeatCapacityTraceValueKey,
) => {
  clearTraceCanvas(context);
  const visibleHistory = getVisibleHistory(history, mode);
  if (visibleHistory.length < 2) return null;

  let previousPoint: ChartPoint | null = null;
  visibleHistory.forEach((point, index) => {
    const mappedPoint = {
      x: mapPointToX(index, visibleHistory.length, mode),
      y: mapValueToY(point[valueLabel], range),
    };
    if (previousPoint) drawLineSegment(context, previousPoint, mappedPoint);
    previousPoint = mappedPoint;
  });

  return previousPoint;
};

const configureTraceContext = (
  context: CanvasRenderingContext2D,
  valueLabel: HeatCapacityTraceValueKey,
) => {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 2;
  context.strokeStyle = valueLabel === 'pressureSignalMv' ? '#86efac' : '#7dd3fc';
};

export const HeatCapacityTraceChart = memo(({
  controller,
  language,
  valueLabel,
  className,
}: HeatCapacityTraceChartProps) => {
  const axisEndRef = useRef<HTMLSpanElement | null>(null);
  const axisStartRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartModeRef = useRef<HeatCapacityRecorderMode>('empty');
  const emptyRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastCanvasSizeRef = useRef({ height: CANVAS_HEIGHT, width: CANVAS_WIDTH });
  const lastRenderedIndexRef = useRef(-1);
  const lastRenderedPointRef = useRef<ChartPoint | null>(null);
  const latestSnapshotRef = useRef(controller?.getChartSnapshot() ?? { heatCapacityTrace: [], powerOn: false });
  const liveStatusRef = useRef<HTMLSpanElement | null>(null);
  const phaseRangeRef = useRef<PhaseRange | null>(null);
  const valueRef = useRef<HTMLElement | null>(null);
  const yMaxRef = useRef<HTMLSpanElement | null>(null);
  const yMinRef = useRef<HTMLSpanElement | null>(null);
  const title = getHeatCapacityTraceTitle(language, valueLabel);
  const signalSymbol = valueLabel === 'pressureSignalMv' ? 'U_p' : 'U_T';

  useEffect(() => {
    latestSnapshotRef.current = controller?.getChartSnapshot() ?? { heatCapacityTrace: [], powerOn: false };
  }, [controller]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const empty = emptyRef.current;
    if (!canvas) return undefined;

    const resetRecorder = (context: CanvasRenderingContext2D) => {
      chartModeRef.current = 'empty';
      lastRenderedIndexRef.current = -1;
      lastRenderedPointRef.current = null;
      phaseRangeRef.current = null;
      clearTraceCanvas(context);
    };

    const draw = () => {
      frameRef.current = null;
      const snapshot = latestSnapshotRef.current;
      const history = snapshot.powerOn ? snapshot.heatCapacityTrace : [];
      const mode = getRecorderMode(history.length);
      const latestPoint = history.at(-1);
      const latest = latestPoint?.[valueLabel];

      updateText(liveStatusRef.current, typeof latest === 'number' ? 'LIVE' : 'IDLE');
      updateText(valueRef.current, typeof latest === 'number' ? `${signalSymbol} ${formatMetric(latest, 1)} mV` : 'waiting');
      updateText(axisStartRef.current, `${history[0]?.timeS.toFixed(1) ?? '0.0'}s`);
      updateText(axisEndRef.current, `${latestPoint?.timeS.toFixed(1) ?? '0.0'}s`);

      ensureCanvasResolution(canvas);
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) return;
      configureTraceContext(context, valueLabel);

      if (empty) {
        empty.hidden = mode !== 'empty';
        empty.textContent = snapshot.powerOn && history.length === 1
          ? '正在采集实时数据...'
          : '打开电源后开始采集。';
      }
      canvas.hidden = mode === 'empty';

      if (mode === 'empty' || !latestPoint) {
        resetRecorder(context);
        updateText(yMaxRef.current, '--');
        updateText(yMinRef.current, '--');
        return;
      }

      const latestIndex = history.length - 1;
      const canvasSizeChanged = (
        lastCanvasSizeRef.current.width !== canvas.width ||
        lastCanvasSizeRef.current.height !== canvas.height
      );
      const phaseChanged = phaseRangeRef.current?.phase !== latestPoint.phase;
      const modeChanged = chartModeRef.current !== mode;
      const traceReset = latestIndex <= lastRenderedIndexRef.current && !modeChanged;

      if (phaseChanged || !phaseRangeRef.current) {
        phaseRangeRef.current = calculatePhaseRange(history, latestPoint.phase, valueLabel);
      }

      const range = phaseRangeRef.current;
      updateText(yMaxRef.current, formatMetric(range.yMax, 1));
      updateText(yMinRef.current, formatMetric(range.yMin, 1));

      if (
        phaseChanged ||
        canvasSizeChanged ||
        traceReset ||
        mode === 'compressing' ||
        (modeChanged && mode !== 'scrolling')
      ) {
        const lastPoint = redrawWindowAsPolyline(context, history, mode, range, valueLabel);
        lastRenderedPointRef.current = lastPoint;
        lastRenderedIndexRef.current = latestIndex;
        chartModeRef.current = mode;
        lastCanvasSizeRef.current = { height: canvas.height, width: canvas.width };
        return;
      }

      if (mode === 'filling') {
        const previous = history.at(-2);
        if (!previous || latestIndex === lastRenderedIndexRef.current) return;
        const from = lastRenderedPointRef.current ?? {
          x: mapPointToX(Math.max(0, latestIndex - 1), history.length, mode),
          y: mapValueToY(previous[valueLabel], range),
        };
        const to = {
          x: mapPointToX(latestIndex, history.length, mode),
          y: mapValueToY(latest, range),
        };
        drawLineSegment(context, from, to);
        lastRenderedPointRef.current = to;
        lastRenderedIndexRef.current = latestIndex;
        chartModeRef.current = mode;
        return;
      }

      if (mode === 'scrolling') {
        if (latestIndex === lastRenderedIndexRef.current) return;
        const previousPoint = lastRenderedPointRef.current;
        context.drawImage(canvas, SCROLL_STEP_PX, 0, CANVAS_WIDTH - SCROLL_STEP_PX, CANVAS_HEIGHT, 0, 0, CANVAS_WIDTH - SCROLL_STEP_PX, CANVAS_HEIGHT);
        context.clearRect(CANVAS_WIDTH - SCROLL_STEP_PX - 2, 0, SCROLL_STEP_PX + 4, CANVAS_HEIGHT);
        const from = previousPoint
          ? { x: Math.max(CHART_LEFT, previousPoint.x - SCROLL_STEP_PX), y: previousPoint.y }
          : { x: CHART_RIGHT - SCROLL_STEP_PX, y: mapValueToY(history.at(-2)?.[valueLabel] ?? latest, range) };
        const to = { x: CHART_RIGHT, y: mapValueToY(latest, range) };
        drawLineSegment(context, from, to);
        lastRenderedPointRef.current = to;
        lastRenderedIndexRef.current = latestIndex;
        chartModeRef.current = mode;
      }
    };

    const scheduleDraw = () => {
      latestSnapshotRef.current = controller?.getChartSnapshot() ?? { heatCapacityTrace: [], powerOn: false };
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(draw);
    };

    scheduleDraw();
    const unsubscribe = controller?.subscribeChart(scheduleDraw);

    return () => {
      unsubscribe?.();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [controller, signalSymbol, valueLabel]);

  return (
    <div className={`studio-heat-trace-chart ${className}`}>
      <div className="studio-live-chart-header studio-heat-chart-header">
        <span>{renderScientificText(title)}</span>
        <div className="studio-heat-chart-value">
          <span ref={liveStatusRef} className="studio-heat-live-pill">IDLE</span>
          <strong ref={valueRef}>waiting</strong>
        </div>
      </div>
      <div className="studio-heat-trace-canvas-frame" role="img" aria-label={`${title} realtime trace`}>
        <canvas ref={canvasRef} className="studio-heat-trace-canvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
        <div ref={emptyRef} className="studio-live-chart-empty">打开电源后开始采集。</div>
        <span ref={yMaxRef} className="studio-heat-trace-y-label studio-heat-trace-y-label-max">--</span>
        <span ref={yMinRef} className="studio-heat-trace-y-label studio-heat-trace-y-label-min">--</span>
      </div>
      <div className="studio-live-chart-axis">
        <span ref={axisStartRef}>0.0s</span>
        <span>{renderScientificText(valueLabel === 'temperatureSignalMv' ? 'U_T' : 'U_p')}</span>
        <span ref={axisEndRef}>0.0s</span>
      </div>
    </div>
  );
});

HeatCapacityTraceChart.displayName = 'HeatCapacityTraceChart';
