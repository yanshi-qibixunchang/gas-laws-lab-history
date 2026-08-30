import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import {
  CalculationKnownGrid,
  type CalculationKnownDatum,
} from '../../components/calculation/CalculationKnownGrid.tsx';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import {
  PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS,
  formatPistonOscillationCalculationAnswer,
  getInvalidPistonOscillationCalculationBatchFields,
  type PistonOscillationCalculationAnswerState,
  type PistonOscillationCalculationFieldId,
  type PistonOscillationDataProcessingSession,
  type PistonOscillationLinearFitResultSnapshot,
} from '../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  formatDecimalPlacesHalfEven,
  formatSignificantFiguresHalfEven,
} from '../../domain/calculation/decimalHalfEven.ts';
import type {
  PistonOscillationGuideEvent,
  PistonOscillationGuideSession,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import type {
  PistonOscillationFreeEvent,
  PistonOscillationFreeSession,
} from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  getPistonOscillationCalculationCopy,
  type PistonOscillationCalculationCopy,
} from './pistonOscillationCalculationCopy.ts';
import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
import './PistonOscillationCalculationWindow.css';

export interface PistonOscillationCalculationWindowProps {
  open: boolean;
  language: PistonOscillationLanguage;
  guideSession: PistonOscillationGuideSession | null;
  freeSession?: PistonOscillationFreeSession | null;
  onCalculationEvent: (event: PistonOscillationCalculationEvent) => void;
  onCompleteAndExit: () => void;
  onClose: () => void;
}

type PistonOscillationCalculationEvent =
  | PistonOscillationGuideEvent
  | PistonOscillationFreeEvent;

type PistonOscillationUntimedCalculationEvent =
  PistonOscillationCalculationEvent extends infer Event
    ? Event extends { nowMs: number }
      ? Omit<Event, 'nowMs'>
      : never
    : never;

interface FitChartPoint {
  runIndex: number;
  x: number;
  y: number;
  selected: boolean;
}

interface FitChartRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PistonOscillationFitCalloutCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

const CHART_WIDTH = 720;
const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 20, right: 24, bottom: 50, left: 66 } as const;
const CALCULATION_FIELD_ORDER: readonly PistonOscillationCalculationFieldId[] = [
  'area',
  'gamma',
  'relativeError',
];

const formatDataValue = (value: number, significantFigures = 5) => (
  Number.isFinite(value)
    ? formatSignificantFiguresHalfEven(value, significantFigures)
    : '—'
);

const formatFitCoefficient = (value: number) => {
  if (!Number.isFinite(value)) return '—';
  return formatSignificantFiguresHalfEven(value, 5);
};

const distanceFromPointToRect = (
  point: { x: number; y: number },
  rect: FitChartRect,
) => {
  const deltaX = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const deltaY = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(deltaX, deltaY);
};

export const choosePistonOscillationFitCalloutCorner = (options: {
  plot: FitChartRect;
  lineStart: { x: number; y: number };
  lineEnd: { x: number; y: number };
  points: readonly { x: number; y: number }[];
  calloutWidth: number;
  calloutHeight: number;
}): { corner: PistonOscillationFitCalloutCorner; rect: FitChartRect } => {
  const inset = 9;
  const candidates: Array<{
    corner: PistonOscillationFitCalloutCorner;
    rect: FitChartRect;
  }> = [
    {
      corner: 'top-left',
      rect: {
        x: options.plot.x + inset,
        y: options.plot.y + inset,
        width: options.calloutWidth,
        height: options.calloutHeight,
      },
    },
    {
      corner: 'top-right',
      rect: {
        x: options.plot.x + options.plot.width - options.calloutWidth - inset,
        y: options.plot.y + inset,
        width: options.calloutWidth,
        height: options.calloutHeight,
      },
    },
    {
      corner: 'bottom-left',
      rect: {
        x: options.plot.x + inset,
        y: options.plot.y + options.plot.height - options.calloutHeight - inset,
        width: options.calloutWidth,
        height: options.calloutHeight,
      },
    },
    {
      corner: 'bottom-right',
      rect: {
        x: options.plot.x + options.plot.width - options.calloutWidth - inset,
        y: options.plot.y + options.plot.height - options.calloutHeight - inset,
        width: options.calloutWidth,
        height: options.calloutHeight,
      },
    },
  ];
  const lineSamples = Array.from({ length: 33 }, (_, index) => {
    const progress = index / 32;
    return {
      x: options.lineStart.x + (options.lineEnd.x - options.lineStart.x) * progress,
      y: options.lineStart.y + (options.lineEnd.y - options.lineStart.y) * progress,
    };
  });
  const best = candidates.reduce<{
    corner: PistonOscillationFitCalloutCorner;
    rect: FitChartRect;
    score: number;
  }>((currentBest, candidate) => {
    const lineClearance = Math.min(
      ...lineSamples.map((point) => distanceFromPointToRect(point, candidate.rect)),
    );
    const pointClearance = options.points.length > 0
      ? Math.min(
          ...options.points.map((point) => distanceFromPointToRect(point, candidate.rect)),
        )
      : Number.POSITIVE_INFINITY;
    const score = Math.min(lineClearance, pointClearance * 1.1);
    return score > currentBest.score ? { ...candidate, score } : currentBest;
  }, { ...candidates[3]!, score: Number.NEGATIVE_INFINITY });
  return { corner: best.corner, rect: best.rect };
};

const buildKnownConstantRows = (
  processing: PistonOscillationDataProcessingSession,
): CalculationKnownDatum[][] => {
  const calculationSession = processing.calculationSession;
  if (!calculationSession) return [];
  const { knowns } = calculationSession;
  return [[
    { key: 'mass', label: 'm（kg）', value: knowns.movingMassKg.toFixed(4) },
    { key: 'diameter', label: 'd（mm）', value: (knowns.cylinderDiameterM * 1000).toFixed(1) },
    { key: 'pressure', label: 'P（Pa）', value: '1.01 × 10⁵' },
  ]];
};

const buildFitDataRows = (
  processing: PistonOscillationDataProcessingSession,
): CalculationKnownDatum[][] => processing.runs.map((run, runIndex) => {
  const period = run.result?.periodS ?? Number.NaN;
  const periodSquared = run.result?.periodSquaredS2 ?? Number.NaN;
  return [
    { key: `run-${runIndex}-period`, label: 'T（s）', value: formatDataValue(period, 4) },
    { key: `run-${runIndex}-period2`, label: 'T²（s²）', value: formatDataValue(periodSquared, 5) },
    { key: `run-${runIndex}-height`, label: 'h（mm）', value: formatDataValue(run.targetHeightMm, 4) },
    {
      key: `run-${runIndex}-coordinate`,
      label: '（T², h）',
      value: `(${formatDataValue(periodSquared, 5)}, ${formatDataValue(run.targetHeightMm, 4)})`,
    },
  ];
});

const getFeedbackText = (
  answer: PistonOscillationCalculationAnswerState,
  copy: PistonOscillationCalculationCopy,
) => {
  if (!answer.feedback) return '';
  return copy.feedback[answer.feedback.outcome];
};

const getFormula = (
  fieldId: PistonOscillationCalculationFieldId,
  referenceGamma: number,
) => {
  if (fieldId === 'area') return 'A = πd² / 4 =';
  if (fieldId === 'gamma') return 'γ = 4π²ms / (AP) =';
  const formattedReferenceGamma = referenceGamma.toFixed(2);
  return `Eᵣ = |γ − ${formattedReferenceGamma}| / ${formattedReferenceGamma} × 100% =`;
};

const getAnswerUnit = (fieldId: PistonOscillationCalculationFieldId) => {
  if (fieldId === 'area') return 'm²';
  if (fieldId === 'relativeError') return '%';
  return '';
};

const PistonOscillationCalculationField = ({
  fieldId,
  answer,
  active,
  batchMode,
  actionLabel,
  actionDisabled,
  referenceGamma,
  copy,
  onCalculationEvent,
  onAction,
  onDraftEdited,
}: {
  fieldId: PistonOscillationCalculationFieldId;
  answer: PistonOscillationCalculationAnswerState;
  active: boolean;
  batchMode: boolean;
  actionLabel: string | null;
  actionDisabled: boolean;
  referenceGamma: number;
  copy: PistonOscillationCalculationCopy;
  onCalculationEvent: (event: PistonOscillationCalculationEvent) => void;
  onAction: () => void;
  onDraftEdited: () => void;
}) => {
  const resolved = answer.status !== 'unresolved';
  const hasFeedback = answer.feedback !== null;
  const precision = PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS[fieldId].precision;
  const statusText = answer.status === 'correct'
    ? copy.correct
    : answer.status === 'revealed'
      ? copy.revealed
      : getFeedbackText(answer, copy);
  const inputId = `piston-calculation-${fieldId}`;
  const dispatch = (
    event: PistonOscillationUntimedCalculationEvent,
  ) => onCalculationEvent({ ...event, nowMs: Date.now() } as PistonOscillationCalculationEvent);

  return (
    <article
      className={`studio-piston-calculation-step ${
        active ? 'studio-piston-calculation-step-active' : ''
      } ${answer.status === 'correct' ? 'studio-piston-calculation-step-success' : ''} ${
        hasFeedback || answer.status === 'revealed'
          ? 'studio-piston-calculation-step-danger'
          : ''
      }`}
      data-piston-calculation-step={fieldId}
      data-answer-status={answer.status}
    >
      <header><strong>{copy.stepTitle[fieldId]}</strong></header>
      <div className="studio-piston-calculation-step-main">
        <div className="studio-piston-calculation-answer-field">
          <div className="studio-piston-calculation-formula-line">
            <label htmlFor={inputId}>
              <span className="studio-piston-calculation-formula">
                {getFormula(fieldId, referenceGamma)}
              </span>
              <input
                id={inputId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={answer.draftRaw}
                disabled={!active || resolved || hasFeedback}
                aria-invalid={hasFeedback}
                aria-describedby={`${inputId}-precision ${inputId}-feedback`}
                onChange={(event) => {
                  onDraftEdited();
                  dispatch({
                    type: 'editCalculationAnswer',
                    field: fieldId,
                    value: event.currentTarget.value,
                  });
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter'
                    && active
                    && !resolved
                    && !hasFeedback
                    && actionLabel !== null
                    && !actionDisabled
                  ) {
                    event.preventDefault();
                    onAction();
                  }
                }}
              />
              {getAnswerUnit(fieldId) ? (
                <span className="studio-piston-calculation-unit">{getAnswerUnit(fieldId)}</span>
              ) : null}
            </label>
            <span id={`${inputId}-precision`} className="studio-piston-calculation-precision">
              {copy.precisionSignificant(precision.digits)}
            </span>
          </div>
          <div
            id={`${inputId}-feedback`}
            className="studio-piston-calculation-feedback"
            aria-live="polite"
          >
            <span className="studio-piston-calculation-status">{statusText || '\u00A0'}</span>
            <span className={`studio-piston-calculation-reference ${
              resolved ? '' : 'studio-piston-calculation-reference-placeholder'
            }`}>
              {resolved && answer.expectedValue !== null
                ? `${copy.reference}${formatPistonOscillationCalculationAnswer(fieldId, answer.expectedValue)}`
                : `${copy.reference}\u00A0`}
            </span>
            {hasFeedback ? (
              <span className="studio-piston-calculation-error-actions">
                <button type="button" onClick={() => {
                  if (batchMode) {
                    dispatch({ type: 'continueCalculationBatch' });
                  } else {
                    dispatch({ type: 'continueCalculationAnswer', field: fieldId });
                  }
                }}>
                  {copy.continueAnswer}
                </button>
                <button
                  type="button"
                  className="studio-piston-calculation-reveal"
                  onClick={() => dispatch({
                    type: 'revealCalculationAnswer',
                    field: fieldId,
                  })}
                >
                  {copy.revealAnswer}
                </button>
              </span>
            ) : <span className="studio-piston-calculation-actions-placeholder" aria-hidden="true" />}
          </div>
        </div>
        {actionLabel !== null ? (
          <button
            type="button"
            className={`studio-piston-calculation-check ${
              active ? '' : 'studio-piston-calculation-check-hidden'
            }`}
            disabled={!active || hasFeedback || resolved || actionDisabled}
            tabIndex={active ? 0 : -1}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
};

const PistonOscillationFitChart = ({
  processing,
  fit,
  copy,
}: {
  processing: PistonOscillationDataProcessingSession;
  fit: PistonOscillationLinearFitResultSnapshot;
  copy: PistonOscillationCalculationCopy;
}) => {
  const selectedRunIndices = new Set(fit.selectedRunIndices);
  const rawPoints: FitChartPoint[] = processing.runs.flatMap((run, runIndex) => (
    run.result
      ? [{
          runIndex,
          x: run.result.periodSquaredS2,
          y: run.targetHeightMm / 1000,
          selected: selectedRunIndices.has(runIndex),
        }]
      : []
  ));
  const xValues = rawPoints.map((point) => point.x);
  const yValues = rawPoints.map((point) => point.y);
  const rawXMin = Math.min(...xValues);
  const rawXMax = Math.max(...xValues);
  const rawYMin = Math.min(...yValues);
  const rawYMax = Math.max(...yValues);
  const xPadding = Math.max((rawXMax - rawXMin) * 0.16, 0.0001);
  const yPadding = Math.max((rawYMax - rawYMin) * 0.2, 0.002);
  const xMin = rawXMin - xPadding;
  const xMax = rawXMax + xPadding;
  const yMin = rawYMin - yPadding;
  const yMax = rawYMax + yPadding;
  const plot: FitChartRect = {
    x: CHART_MARGIN.left,
    y: CHART_MARGIN.top,
    width: CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right,
    height: CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom,
  };
  const scaleX = (value: number) => plot.x + (value - xMin) / (xMax - xMin) * plot.width;
  const scaleY = (value: number) => plot.y + plot.height - (value - yMin) / (yMax - yMin) * plot.height;
  const points = rawPoints.map((point) => ({
    ...point,
    chartX: scaleX(point.x),
    chartY: scaleY(point.y),
  }));
  const lineStart = {
    x: scaleX(xMin),
    y: scaleY(fit.slopeMPerS2 * xMin + fit.interceptM),
  };
  const lineEnd = {
    x: scaleX(xMax),
    y: scaleY(fit.slopeMPerS2 * xMax + fit.interceptM),
  };
  const callout = choosePistonOscillationFitCalloutCorner({
    plot,
    lineStart,
    lineEnd,
    points: points.map((point) => ({ x: point.chartX, y: point.chartY })),
    calloutWidth: 252,
    calloutHeight: 64,
  });
  const interceptSign = fit.interceptM < 0 ? '−' : '+';
  const equation = `h = ${formatFitCoefficient(fit.slopeMPerS2)}T² ${interceptSign} ${formatFitCoefficient(Math.abs(fit.interceptM))}（m）`;
  const xTicks = Array.from({ length: 5 }, (_, index) => xMin + (xMax - xMin) * index / 4);
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + (yMax - yMin) * index / 4);

  return (
    <section className="studio-piston-fit-result" aria-labelledby="piston-fit-result-title">
      <header><strong id="piston-fit-result-title">{copy.fitResultTitle}</strong></header>
      <svg
        className="studio-piston-fit-chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={copy.fitGraphAria}
      >
        <defs>
          <clipPath id="piston-fit-plot-clip">
            <rect x={plot.x} y={plot.y} width={plot.width} height={plot.height} />
          </clipPath>
        </defs>
        <rect className="studio-piston-fit-plot-bg" x={plot.x} y={plot.y} width={plot.width} height={plot.height} />
        {xTicks.map((tick, index) => {
          const x = scaleX(tick);
          return (
            <g key={`x-${index}`}>
              <line className="studio-piston-fit-gridline" x1={x} y1={plot.y} x2={x} y2={plot.y + plot.height} />
              <text className="studio-piston-fit-tick" x={x} y={plot.y + plot.height + 20} textAnchor="middle">
                {formatDataValue(tick, 3)}
              </text>
            </g>
          );
        })}
        {yTicks.map((tick, index) => {
          const y = scaleY(tick);
          return (
            <g key={`y-${index}`}>
              <line className="studio-piston-fit-gridline" x1={plot.x} y1={y} x2={plot.x + plot.width} y2={y} />
              <text className="studio-piston-fit-tick" x={plot.x - 10} y={y + 4} textAnchor="end">
                {formatDataValue(tick, 3)}
              </text>
            </g>
          );
        })}
        <rect className="studio-piston-fit-axis-box" x={plot.x} y={plot.y} width={plot.width} height={plot.height} />
        <g clipPath="url(#piston-fit-plot-clip)">
          <line
            className="studio-piston-fit-line"
            x1={lineStart.x}
            y1={lineStart.y}
            x2={lineEnd.x}
            y2={lineEnd.y}
          />
          {points.map((point) => (
            <circle
              key={point.runIndex}
              className={point.selected ? 'studio-piston-fit-point-selected' : 'studio-piston-fit-point-omitted'}
              cx={point.chartX}
              cy={point.chartY}
              r={point.selected ? 5 : 4}
            />
          ))}
        </g>
        <g className="studio-piston-fit-callout" data-callout-corner={callout.corner}>
          <rect
            x={callout.rect.x}
            y={callout.rect.y}
            width={callout.rect.width}
            height={callout.rect.height}
          />
          <text x={callout.rect.x + 12} y={callout.rect.y + 25}>{equation}</text>
          <text x={callout.rect.x + 12} y={callout.rect.y + 47}>R² = {formatDecimalPlacesHalfEven(fit.rSquared, 5)}</text>
        </g>
        <text className="studio-piston-fit-axis-title" x={plot.x + plot.width / 2} y={CHART_HEIGHT - 8} textAnchor="middle">
          {copy.chartXAxis}
        </text>
        <text
          className="studio-piston-fit-axis-title"
          transform={`translate(17 ${plot.y + plot.height / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          {copy.chartYAxis}
        </text>
      </svg>
    </section>
  );
};

export const PistonOscillationCalculationWindow = ({
  open,
  language,
  guideSession,
  freeSession,
  onCalculationEvent,
  onCompleteAndExit,
  onClose,
}: PistonOscillationCalculationWindowProps) => {
  const generatedId = useId().replace(/:/g, '-');
  const copy = getPistonOscillationCalculationCopy(language);
  const processing = freeSession?.dataProcessing ?? guideSession?.dataProcessing ?? null;
  const calculationSession = processing?.calculationSession ?? null;
  const fit = processing?.linearFitResult ?? null;
  const dialogRef = useRef<HTMLElement | null>(null);
  const strongLayerRef = useRef<HTMLDivElement | null>(null);
  const fitReminderDismissButtonRef = useRef<HTMLButtonElement | null>(null);
  const fitReminderReturnFocusRef = useRef<HTMLElement | null>(null);
  const [fitReminderOpen, setFitReminderOpen] = useState(false);
  const [reminderHoles, setReminderHoles] = useState<FitChartRect[]>([]);
  const [interactionRevision, setInteractionRevision] = useState(0);
  const [pulseTarget, setPulseTarget] = useState<'rows' | 'confirm' | null>(null);
  const [batchFormatInvalid, setBatchFormatInvalid] = useState(false);
  const batchMode = processing?.processingPolicy.answerValidationMode === 'batch';
  const selectedRunIndices = calculationSession?.selectedRunIndices ?? [];
  const selectedRunSet = useMemo(
    () => new Set(selectedRunIndices),
    [selectedRunIndices],
  );

  const closeFitReminder = useCallback(() => {
    const returnFocus = fitReminderReturnFocusRef.current;
    setFitReminderOpen(false);
    fitReminderReturnFocusRef.current = null;
    window.requestAnimationFrame(() => returnFocus?.focus());
  }, []);

  useEffect(() => {
    if (!fitReminderOpen) return undefined;
    fitReminderReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => {
      fitReminderDismissButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitReminderOpen]);
  const missingRunIndices = processing
    ? processing.runs.map((_, runIndex) => runIndex).filter((runIndex) => (
        !selectedRunSet.has(runIndex)
      ))
    : [];
  const selectingPoints = calculationSession?.status === 'selecting-points';
  const guidedSelectionComplete = Boolean(
    processing && selectedRunIndices.length === processing.runs.length,
  );

  useEffect(() => {
    if (!open || !selectingPoints || !processing) {
      setPulseTarget(null);
      return undefined;
    }
    setPulseTarget(null);
    const timer = window.setTimeout(() => {
      setPulseTarget(guidedSelectionComplete ? 'confirm' : 'rows');
    }, guidedSelectionComplete ? 2300 : 3600);
    return () => window.clearTimeout(timer);
  }, [
    guidedSelectionComplete,
    interactionRevision,
    open,
    processing,
    selectingPoints,
    selectedRunIndices.length,
  ]);

  useEffect(() => {
    if (!fitReminderOpen || missingRunIndices.length > 0) return;
    closeFitReminder();
  }, [closeFitReminder, fitReminderOpen, missingRunIndices.length]);

  useEffect(() => {
    setBatchFormatInvalid(false);
  }, [calculationSession?.status, calculationSession?.visibleFieldIds.length, fit]);

  const measureReminderHoles = useCallback(() => {
    const layer = strongLayerRef.current;
    const dialog = dialogRef.current;
    if (!fitReminderOpen || !layer || !dialog) return;
    const layerRect = layer.getBoundingClientRect();
    const missingRects = missingRunIndices.flatMap((runIndex) => {
      const row = dialog.querySelector<HTMLElement>(
        `[data-piston-fit-run-index="${runIndex}"]`,
      );
      if (!row) return [];
      return [{ runIndex, rect: row.getBoundingClientRect() }];
    });
    const groups: Array<{ first: number; last: number; rects: DOMRect[] }> = [];
    for (const entry of missingRects) {
      const previous = groups.at(-1);
      if (previous && entry.runIndex === previous.last + 1) {
        previous.last = entry.runIndex;
        previous.rects.push(entry.rect);
      } else {
        groups.push({ first: entry.runIndex, last: entry.runIndex, rects: [entry.rect] });
      }
    }
    setReminderHoles(groups.map((group) => {
      const left = Math.min(...group.rects.map((rect) => rect.left));
      const top = Math.min(...group.rects.map((rect) => rect.top));
      const right = Math.max(...group.rects.map((rect) => rect.right));
      const bottom = Math.max(...group.rects.map((rect) => rect.bottom));
      const padding = 5;
      return {
        x: left - layerRect.left - padding,
        y: top - layerRect.top - padding,
        width: right - left + padding * 2,
        height: bottom - top + padding * 2,
      };
    }));
  }, [fitReminderOpen, missingRunIndices.join(':')]);

  useLayoutEffect(() => {
    if (!fitReminderOpen) return undefined;
    const frame = window.requestAnimationFrame(measureReminderHoles);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measureReminderHoles);
    if (dialogRef.current) resizeObserver?.observe(dialogRef.current);
    window.addEventListener('resize', measureReminderHoles);
    dialogRef.current?.addEventListener('scroll', measureReminderHoles, true);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureReminderHoles);
      dialogRef.current?.removeEventListener('scroll', measureReminderHoles, true);
    };
  }, [fitReminderOpen, measureReminderHoles]);

  const handleInteraction = () => {
    setInteractionRevision((revision) => revision + 1);
    setPulseTarget(null);
  };

  const dispatch = (
    event: PistonOscillationUntimedCalculationEvent,
  ) => onCalculationEvent({ ...event, nowMs: Date.now() } as PistonOscillationCalculationEvent);

  const toggleFitRun = (runIndex: number) => {
    if (!selectingPoints) return;
    handleInteraction();
    setFitReminderOpen(false);
    dispatch({ type: 'toggleFitRun', runIndex });
  };

  const handleFitRowKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    runIndex: number,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleFitRun(runIndex);
  };

  const submitFit = () => {
    handleInteraction();
    if (!guidedSelectionComplete) {
      setFitReminderOpen(true);
      return;
    }
    dispatch({ type: 'submitLinearFit' });
  };

  if (!open || !processing || !calculationSession) return null;

  const knownRows = buildKnownConstantRows(processing);
  const fitDataRows = buildFitDataRows(processing);
  const canDismiss = calculationSession.status === 'ready-to-exit'
    || calculationSession.status === 'completed';
  const readyToComplete = calculationSession.status === 'ready-to-exit';
  const handleDismiss = () => {
    if (!canDismiss) return;
    if (readyToComplete) onCompleteAndExit();
    else onClose();
  };
  const activeFieldIndex = calculationSession.activeFieldId
    ? CALCULATION_FIELD_ORDER.indexOf(calculationSession.activeFieldId)
    : CALCULATION_FIELD_ORDER.length - 1;
  const visibleFieldIds = fit
    ? batchMode
      ? calculationSession.visibleFieldIds
      : CALCULATION_FIELD_ORDER.slice(0, Math.max(1, activeFieldIndex + 1))
    : [];
  const submitCalculationBatch = () => {
    if (getInvalidPistonOscillationCalculationBatchFields(calculationSession).length > 0) {
      setBatchFormatInvalid(true);
      return;
    }
    setBatchFormatInvalid(false);
    dispatch({ type: 'submitCalculationBatch' });
  };
  const noteId = `${generatedId}-note`;
  const knownTitleId = `${generatedId}-known-title`;
  const fitTitleId = `${generatedId}-fit-title`;
  const maskId = `${generatedId}-fit-reminder-mask`;

  return (
    <PromptDialogShell
      title={copy.title}
      subtitle={calculationSession.status === 'completed'
        ? copy.reviewSubtitle
        : batchMode
          ? copy.freeSubtitle
          : copy.subtitle}
      variant="task"
      role="dialog"
      ariaDescribedBy={noteId}
      closeLabel={copy.close}
      dismiss={{ closeButton: canDismiss, escape: canDismiss, backdrop: canDismiss }}
      onRequestClose={handleDismiss}
      initialFocusSelector={
        '[data-piston-fit-run-index]:not([tabindex="-1"]), ' +
        '.studio-piston-calculation-step-active input:not(:disabled), ' +
        '.studio-piston-calculation-exit'
      }
      focusKey={`${calculationSession.status}:${calculationSession.activeFieldId ?? 'none'}:${selectedRunIndices.join('-')}`}
      dialogRef={dialogRef}
      overlayClassName="studio-settings-overlay studio-piston-calculation-overlay"
      dialogClassName="studio-settings-window studio-piston-calculation-window"
      headerClassName="studio-settings-header studio-piston-calculation-header"
      closeButtonClassName="studio-settings-close"
      overlayData={{
        'data-piston-oscillation-calculation-window': 'true',
        'data-calculation-status': calculationSession.status,
      }}
    >
      <div id={noteId} className="studio-piston-calculation-tolerance-note" role="note">
        {copy.tolerance}
      </div>
      <div className="studio-piston-calculation-body" data-scroll-on-overflow="true">
        <section className="studio-piston-calculation-known-panel" aria-labelledby={knownTitleId}>
          <header><strong id={knownTitleId}>{copy.knownTitle}</strong></header>
          <CalculationKnownGrid
            rows={knownRows}
            columns={4}
            shortRowAlignment="start"
            style={{ '--calculation-known-value-width': '8ch' } as CSSProperties}
          />
        </section>

        <section className="studio-piston-fit-selection" aria-labelledby={fitTitleId}>
          <header>
            <div>
              <strong id={fitTitleId}>{copy.fitTitle}</strong>
              <p>{fit ? copy.fitReviewInstruction : copy.fitInstruction}</p>
            </div>
            <span>{copy.fitSelectedCount(selectedRunIndices.length, processing.runs.length)}</span>
          </header>
          <CalculationKnownGrid
            rows={fitDataRows}
            columns={4}
            shortRowAlignment="start"
            style={{ '--calculation-known-value-width': '8ch' } as CSSProperties}
            classNames={{ grid: 'studio-piston-fit-data-grid' }}
            getRowProps={(_, runIndex) => {
              const selected = selectedRunSet.has(runIndex);
              const selectable = selectingPoints;
              return {
                role: 'button',
                tabIndex: selectable ? 0 : -1,
                'aria-pressed': selected,
                'aria-label': copy.fitRowAria(runIndex + 1, selected),
                'data-piston-fit-run-index': String(runIndex),
                'data-selected': selected ? 'true' : 'false',
                'data-selectable': selectable ? 'true' : 'false',
                className: `${
                  selected ? 'studio-piston-fit-data-row-selected' : ''
                } ${
                  pulseTarget === 'rows' && !selected
                    ? 'studio-piston-fit-data-row-pulse'
                    : ''
                }`,
                onClick: () => toggleFitRun(runIndex),
                onKeyDown: (event) => handleFitRowKeyDown(event, runIndex),
              };
            }}
          />
          {!fit ? (
            <button
              type="button"
              className={`studio-piston-fit-confirm ${
                guidedSelectionComplete ? '' : 'studio-piston-fit-confirm-disabled'
              } ${pulseTarget === 'confirm' ? 'studio-piston-fit-confirm-pulse' : ''}`}
              aria-disabled={!guidedSelectionComplete}
              onClick={submitFit}
            >
              {copy.confirmFit}
            </button>
          ) : null}
        </section>

        {fit ? (
          <>
            <PistonOscillationFitChart processing={processing} fit={fit} copy={copy} />
            <div className="studio-piston-calculation-steps">
              {visibleFieldIds.map((fieldId, visibleIndex) => {
                const answer = calculationSession.answers[fieldId];
                const finalVisibleField = visibleIndex === visibleFieldIds.length - 1;
                const finalCalculationField = fieldId === 'relativeError';
                const active = calculationSession.status === 'calculating'
                  && (batchMode
                    ? answer.status === 'unresolved'
                    : calculationSession.activeFieldId === fieldId);
                const actionLabel = batchMode
                  ? finalVisibleField
                    ? finalCalculationField ? copy.checkAll : copy.nextCalculation
                    : null
                  : copy.check;
                const batchFeedbackActive = batchMode && CALCULATION_FIELD_ORDER.some((candidate) => (
                  calculationSession.answers[candidate].feedback !== null
                ));
                const actionDisabled = batchMode
                  ? batchFeedbackActive || (
                      !finalCalculationField && answer.draftRaw.trim().length === 0
                    )
                  : false;
                const onAction = batchMode
                  ? finalCalculationField
                    ? submitCalculationBatch
                    : () => {
                        setBatchFormatInvalid(false);
                        dispatch({ type: 'revealNextCalculationField', field: fieldId });
                      }
                  : () => dispatch({ type: 'submitCalculationField', field: fieldId });
                return (
                  <PistonOscillationCalculationField
                    key={fieldId}
                    fieldId={fieldId}
                    answer={answer}
                    active={active}
                    batchMode={batchMode}
                    actionLabel={actionLabel}
                    actionDisabled={actionDisabled}
                    referenceGamma={calculationSession.knowns.referenceGamma}
                    copy={copy}
                    onCalculationEvent={onCalculationEvent}
                    onAction={onAction}
                    onDraftEdited={() => setBatchFormatInvalid(false)}
                  />
                );
              })}
              {batchMode && batchFormatInvalid ? (
                <div className="studio-piston-calculation-format-warning" role="alert">
                  {copy.numericFormatReminder}
                </div>
              ) : null}
              {batchMode
                && calculationSession.status === 'calculating'
                && calculationSession.visibleFieldIds.length === CALCULATION_FIELD_ORDER.length
                && calculationSession.batchAttempts.length > 0
                && calculationSession.answers.relativeError.status !== 'unresolved' ? (
                  <button
                    type="button"
                    className="studio-piston-calculation-batch-retry"
                    disabled={CALCULATION_FIELD_ORDER.some((fieldId) => (
                      calculationSession.answers[fieldId].feedback !== null
                    ))}
                    onClick={submitCalculationBatch}
                  >
                    {copy.checkAll}
                  </button>
                ) : null}
              {calculationSession.status === 'ready-to-exit'
                || calculationSession.status === 'completed' ? (
                  <div className="studio-piston-calculation-ready" role="status">
                    {batchMode ? copy.freeReady : copy.ready}
                  </div>
                ) : null}
            </div>
          </>
        ) : null}
      </div>

      {canDismiss ? (
        <footer className="studio-piston-calculation-footer">
          <button type="button" className="studio-piston-calculation-exit" onClick={handleDismiss}>
            {readyToComplete ? copy.completeAndExit : copy.closeButton}
          </button>
        </footer>
      ) : null}

      {fitReminderOpen ? (
        <div
          ref={strongLayerRef}
          className="studio-piston-fit-reminder-layer"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`${generatedId}-fit-reminder-title`}
          aria-describedby={`${generatedId}-fit-reminder-body`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              closeFitReminder();
              return;
            }
            if (event.key === 'Tab') {
              event.preventDefault();
              fitReminderDismissButtonRef.current?.focus();
            }
          }}
        >
          <svg aria-hidden="true">
            <defs>
              <mask id={maskId}>
                <rect width="100%" height="100%" fill="white" />
                {reminderHoles.map((hole, index) => (
                  <rect
                    key={`mask-hole-${index}`}
                    x={hole.x}
                    y={hole.y}
                    width={hole.width}
                    height={hole.height}
                    fill="black"
                  />
                ))}
              </mask>
            </defs>
            <rect className="studio-piston-fit-reminder-shade" width="100%" height="100%" mask={`url(#${maskId})`} />
            {reminderHoles.map((hole, index) => (
              <rect
                className="studio-piston-fit-reminder-outline"
                key={`outline-${index}`}
                x={hole.x}
                y={hole.y}
                width={hole.width}
                height={hole.height}
              />
            ))}
          </svg>
          <div className="studio-piston-fit-reminder-card">
            <strong id={`${generatedId}-fit-reminder-title`}>{copy.missingFitTitle}</strong>
            <p id={`${generatedId}-fit-reminder-body`}>{copy.missingFitBody}</p>
            <button
              ref={fitReminderDismissButtonRef}
              type="button"
              onClick={closeFitReminder}
            >
              {copy.dismissReminder}
            </button>
          </div>
        </div>
      ) : null}
    </PromptDialogShell>
  );
};

export default PistonOscillationCalculationWindow;
